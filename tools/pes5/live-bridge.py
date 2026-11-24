#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Puente HTTP local entre la web y PES5 (solo memoria del proceso).

Expone tres endpoints en ``http://127.0.0.1:<puerto>`` (8765 por defecto):

- ``GET /estado``: en qué momento está el juego.
- ``GET /leer?lado=local|visitante|ambos``: alineación decodificada, condición
  y resistencia de cada jugador.
- ``POST /aplicar``: valida y aplica operaciones (todo o nada).

El contrato completo está en ``tareas/API_PUENTE.md``. El puente solo escucha
en 127.0.0.1, exige que el origen esté en ``--origenes`` y nunca escribe
saves: solo memoria del proceso (y solo con la pantalla de alineación abierta).

Con ``--desde-bin ARCHIVO --base 0x3940000`` usa ``MemoriaFalsa`` (no hace
falta el juego); los indicadores de estado que caigan fuera de la captura
valen 0, así que para escribir sobre una captura no sirve este modo.

Uso:
  python tools/pes5/live-bridge.py
  python tools/pes5/live-bridge.py --puerto 9000 --origenes http://localhost:3000
  python tools/pes5/live-bridge.py --desde-bin captura.bin --base 0x3940000
"""

import argparse
import contextlib
import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

# Con ``python -I`` el directorio del script no entra en sys.path; se agrega a mano.
_DIR = os.path.dirname(os.path.abspath(__file__))
if _DIR not in sys.path:
    sys.path.insert(0, _DIR)

import pes5_vivo as vivo  # noqa: E402

PUERTO_POR_DEFECTO = 8765
ORIGENES_POR_DEFECTO = ("http://localhost:3000,http://localhost:3001,"
                        "http://127.0.0.1:3000")
BASE_BIN_POR_DEFECTO = "0x3940000"
LADOS = ("local", "visitante", "ambos")

# Orden de los 8 bytes de flechas de ataque del registro (mapa: ← ↖ ↑ ↗ → ↘ ↓ ↙).
NOMBRES_FLECHAS = ("izq", "arriba-izq", "arriba", "arriba-dcha",
                   "dcha", "abajo-dcha", "abajo", "abajo-izq")


# ------------------------------------------------------------------ contrato

def _slots(equipo):
    """Las 11 casillas de titular en la forma del contrato."""
    campos = equipo["campos"]
    codigos = vivo.mapa().get("codificaciones", {}).get("posicion", {})
    orden = equipo["orden"]
    ids = equipo["ids"]
    slots = []
    for casilla in range(11):
        indice = orden[casilla]
        codigo = campos["posicion"][casilla]
        flechas = campos["flechasAtaque"][casilla]
        slots.append({
            "casilla": casilla,
            "indice": indice,
            "id": ids[indice] if 0 <= indice < len(ids) else None,
            "prof": campos["profundidad"][casilla],
            "lat": campos["lateral"].get(casilla),
            "pos": codigos.get(str(codigo), "?"),
            "codigo": codigo,
            "flechas": [nombre for nombre, valor in zip(NOMBRES_FLECHAS, flechas) if valor],
            "act": campos["actitudDefensiva"][casilla],
            "mark": campos["marcaje"][casilla],
            "rival": campos["rivalMarcado"][casilla],
        })
    return slots


def equipo_contrato(equipo):
    """Traduce lo que devuelve ``pes5_vivo.leer_equipo`` a ``EQUIPO``."""
    campos = equipo["campos"]
    cabecera = equipo["cabecera"]

    def lanzadores(nombre):
        return cabecera[nombre]["indice"]

    return {
        "lado": equipo["lado"],
        "ids": equipo["ids"],
        "orden": equipo["orden"],
        "cambiosRestantes": equipo["cambiosRestantes"],
        "cola": equipo["cola"],
        "slots": _slots(equipo),
        "cabecera": {
            "botones": list(cabecera.get("estrategiaBoton", [])),
            "modo": cabecera.get("modoEstrategia"),
            "lanzadores": {
                "ckl": lanzadores("cornerIzquierdo"),
                "ckr": lanzadores("cornerDerecho"),
                "tll": lanzadores("tiroLibreLargo"),
                "tlc": lanzadores("tiroLibreCorto"),
                "pk": lanzadores("penal"),
            },
            "capitan": lanzadores("capitan"),
        },
        "ajustes": {
            "nivel": campos["nivelAtaqueDefensa"],
            "sistema": campos["sistemaDefensivo"],
            "libero": campos["libero"],
            "linea": campos["lineaDefensiva"],
            "presion": campos["zonaPresion"],
            "offside": campos["fueraDeJuego"],
            "contra": campos["contraataque"],
        },
        "estadoJugador": equipo["estadoJugador"],
        "resistencia": equipo["resistencia"],
    }


# ------------------------------------------------------------------ puente

class Puente(object):
    """Estado del puente: memoria, orígenes permitidos y máximos de resistencia.

    ``memoria`` permite inyectar una ``MemoriaFalsa`` (pruebas). Sin ella se
    abre el proceso ``PES5.exe`` en cada pedido, así que el puente puede
    arrancar antes que el juego.
    """

    def __init__(self, origenes=(), desde_bin=None, base=BASE_BIN_POR_DEFECTO,
                 proceso=vivo.PROCESO_POR_DEFECTO, memoria=None):
        self.origenes = set(origenes)
        self.proceso = proceso
        self._memoria = memoria
        if self._memoria is None and desde_bin:
            self._memoria = vivo.MemoriaFalsa.desde_bin(desde_bin, int(base, 0))
        self._cerrojo = threading.Lock()
        self._maximos = {}
        self._en_partido = False

    @contextlib.contextmanager
    def _abrir(self):
        if self._memoria is not None:
            yield self._memoria
            return
        mem = vivo.ProcesoPES5(self.proceso)
        try:
            yield mem
        finally:
            mem.cerrar()

    def _sincronizar_resistencia(self, partidoEmpezado):
        """Vacía los máximos cuando el partido deja de estar empezado."""
        empezado = bool(partidoEmpezado)
        if self._en_partido and not empezado:
            self._maximos.clear()
        self._en_partido = empezado

    # -- endpoints

    def estado(self):
        with self._cerrojo:
            try:
                with self._abrir() as mem:
                    return {"ok": True, "juego": True, "estado": vivo.estado(mem)}
            except (LookupError, RuntimeError):
                return {"ok": True, "juego": False}

    def leer(self, lado="ambos"):
        with self._cerrojo:
            try:
                with self._abrir() as mem:
                    st = vivo.estado(mem)
                    self._sincronizar_resistencia(st["partidoEmpezado"])
                    lados = ("local", "visitante") if lado == "ambos" else (lado,)
                    equipos = [equipo_contrato(vivo.leer_equipo(mem, nombre, self._maximos))
                               for nombre in lados]
                    return {"ok": True, "juego": True, "estado": st, "equipos": equipos}
            except (LookupError, RuntimeError):
                return {"ok": True, "juego": False}

    def aplicar(self, lado, ops, salieron=None):
        with self._cerrojo:
            try:
                with self._abrir() as mem:
                    return vivo.aplicar(mem, lado, ops, salieron=salieron)
            except (LookupError, RuntimeError):
                return {"ok": False, "juego": False, "cerrada": True, "escrito": [],
                        "errores": ["PES5 no está abierto: abre el juego con una partida "
                                    "cargada para aplicar cambios"]}


# ------------------------------------------------------------------ HTTP

class Manejador(BaseHTTPRequestHandler):
    server_version = "pes5-live-bridge/1.0"
    sys_version = ""

    # -- utilidades

    def log_message(self, formato, *args):
        sys.stderr.write("%s %s\n" % (self.address_string(), formato % args))
        sys.stderr.flush()

    def _origen(self):
        return self.headers.get("Origin")

    def _origen_permitido(self):
        origen = self._origen()
        return origen is None or origen in self.server.puente.origenes

    def _cabeceras_cors(self):
        origen = self._origen()
        if origen is None:
            return
        self.send_header("Access-Control-Allow-Origin", origen)
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "600")

    def _responder(self, codigo, datos):
        cuerpo = json.dumps(datos, ensure_ascii=False).encode("utf-8")
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        if codigo != 403:
            self._cabeceras_cors()
        self.end_headers()
        self.wfile.write(cuerpo)

    def _error_origen(self):
        origen = self._origen()
        self._responder(403, {"ok": False,
                              "error": "origen no permitido: %s" % (origen or "(ninguno)")})

    def _cuerpo_json(self):
        try:
            largo = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return None, "«Content-Length» inválido"
        if largo <= 0:
            return None, "falta el cuerpo JSON"
        crudo = self.rfile.read(largo)
        try:
            return json.loads(crudo.decode("utf-8-sig")), None
        except (UnicodeDecodeError, ValueError) as e:
            return None, "el cuerpo no es JSON válido: %s" % e

    # -- rutas

    def do_OPTIONS(self):
        if not self._origen_permitido():
            self._error_origen()
            return
        self.send_response(204)
        self.send_header("Content-Length", "0")
        self._cabeceras_cors()
        self.end_headers()

    def do_GET(self):
        if not self._origen_permitido():
            self._error_origen()
            return
        ruta = urlparse(self.path)
        if ruta.path == "/estado":
            self._responder(200, self.server.puente.estado())
            return
        if ruta.path == "/leer":
            valores = parse_qs(ruta.query).get("lado") or ["ambos"]
            lado = valores[0].strip().lower()
            if lado not in LADOS:
                self._responder(400, {"ok": False,
                                      "error": "«lado» inválido: %r (local, visitante o ambos)" %
                                               (lado,)})
                return
            try:
                self._responder(200, self.server.puente.leer(lado))
            except (vivo.ErrorMemoria, OSError, RuntimeError, ValueError) as e:
                self._responder(500, {"ok": False, "error": str(e)})
            return
        self._responder(404, {"ok": False, "error": "ruta desconocida: %s" % ruta.path})

    def do_POST(self):
        if not self._origen_permitido():
            self._error_origen()
            return
        ruta = urlparse(self.path)
        if ruta.path != "/aplicar":
            self._responder(404, {"ok": False, "error": "ruta desconocida: %s" % ruta.path})
            return
        datos, error = self._cuerpo_json()
        if error is not None:
            self._responder(400, {"ok": False, "error": error})
            return
        if not isinstance(datos, dict):
            self._responder(400, {"ok": False, "error": "el cuerpo tiene que ser un objeto JSON"})
            return
        lado = str(datos.get("lado", "")).strip().lower()
        if lado not in ("local", "visitante"):
            self._responder(400, {"ok": False,
                                  "error": "«lado» inválido: %r (usa local o visitante)" % (lado,)})
            return
        ops = datos.get("ops")
        if not isinstance(ops, list):
            self._responder(400, {"ok": False, "error": "falta «ops» (lista de operaciones)"})
            return
        salieron = datos.get("salieron")
        if salieron is not None and not isinstance(salieron, list):
            self._responder(400, {"ok": False,
                                  "error": "«salieron» tiene que ser una lista de índices"})
            return
        try:
            self._responder(200, self.server.puente.aplicar(lado, ops, salieron))
        except (vivo.ErrorMemoria, OSError, RuntimeError, ValueError) as e:
            self._responder(500, {"ok": False, "error": str(e)})


class ServidorPuente(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, direccion, puente):
        self.puente = puente
        super(ServidorPuente, self).__init__(direccion, Manejador)


# ------------------------------------------------------------------ CLI

def construir_parser():
    parser = argparse.ArgumentParser(
        prog="live-bridge.py",
        description="Puente HTTP local entre la web y PES5 (127.0.0.1, solo memoria).",
        epilog="Nunca escribe saves: solo memoria del proceso y con la alineación abierta.")
    parser.add_argument("--puerto", type=int, default=PUERTO_POR_DEFECTO,
                        help="puerto local (por defecto %d)" % PUERTO_POR_DEFECTO)
    parser.add_argument("--origenes", default=ORIGENES_POR_DEFECTO,
                        help="orígenes CORS separados por coma (por defecto %s)" % ORIGENES_POR_DEFECTO)
    parser.add_argument("--desde-bin", metavar="ARCHIVO", default=None,
                        help="lee una captura congelada con MemoriaFalsa en vez del proceso")
    parser.add_argument("--base", default=BASE_BIN_POR_DEFECTO,
                        help="dirección base del .bin (por defecto %s)" % BASE_BIN_POR_DEFECTO)
    parser.add_argument("--proceso", default=vivo.PROCESO_POR_DEFECTO,
                        help="nombre del ejecutable (por defecto %s)" % vivo.PROCESO_POR_DEFECTO)
    return parser


def main(argv=None):
    for flujo in (sys.stdout, sys.stderr):
        try:
            flujo.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    args = construir_parser().parse_args(argv)
    if not 0 <= args.puerto <= 65535:
        sys.stderr.write("ERROR: el puerto tiene que estar entre 0 y 65535\n")
        return 2
    origenes = [origen.strip() for origen in args.origenes.split(",") if origen.strip()]
    if not origenes:
        sys.stderr.write("ERROR: --origenes no puede quedar vacío\n")
        return 2

    try:
        puente = Puente(origenes=origenes, desde_bin=args.desde_bin,
                        base=args.base, proceso=args.proceso)
    except (OSError, ValueError) as e:
        sys.stderr.write("ERROR: no puedo abrir la captura: %s\n" % e)
        return 1

    try:
        servidor = ServidorPuente(("127.0.0.1", args.puerto), puente)
    except OSError as e:
        sys.stderr.write("ERROR: no puedo escuchar en 127.0.0.1:%d: %s\n" % (args.puerto, e))
        return 1

    puerto = servidor.server_address[1]
    sys.stderr.write("Puente local de PES5 escuchando en http://127.0.0.1:%d\n" % puerto)
    sys.stderr.write("Orígenes permitidos: %s\n" % ", ".join(origenes))
    if args.desde_bin:
        sys.stderr.write("Memoria: captura %s (base %s)\n" %
                         (os.path.abspath(args.desde_bin), args.base))
    else:
        sys.stderr.write("Memoria: proceso %s\n" % args.proceso)
    sys.stderr.write("Ctrl+C para parar\n")
    sys.stderr.flush()
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        sys.stderr.write("Puente detenido\n")
    finally:
        servidor.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
