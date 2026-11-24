#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CLI del agente en vivo de PES5 (estado, lectura, validación y aplicación).

Usa ``pes5_vivo`` (el núcleo) y escribe JSON por stdout. Los códigos de salida
son:

- 0: bien.
- 1: no hay juego (o error inesperado).
- 2: errores de validación (no se escribió nada).
- 3: la pantalla de alineación está cerrada (no se escribió nada).

Con ``--desde-bin ARCHIVO --base 0x...`` se usa ``MemoriaFalsa``: no hace falta
el juego y no se escribe ningún proceso. Los indicadores de estado que no estén
dentro del volcado valen 0, así que ``aplicar`` necesita ``--forzar`` para
escribir sobre una captura (solo para pruebas).

Uso:
  python tools/pes5/live-agent.py estado
  python tools/pes5/live-agent.py leer [--lado local|visitante|ambos]
  python tools/pes5/live-agent.py validar --lado local --ops cambios.json
  python tools/pes5/live-agent.py aplicar --lado local --ops cambios.json [--esperar 20]
  python tools/pes5/live-agent.py vigilar --carpeta agentes/local

El agente nunca toca el option file ni los saves: solo la memoria del proceso.
"""

import argparse
import json
import os
import sys
import time

# Con ``python -I`` el directorio del script no entra en sys.path; se agrega a mano.
_DIR = os.path.dirname(os.path.abspath(__file__))
if _DIR not in sys.path:
    sys.path.insert(0, _DIR)

import pes5_vivo as vivo  # noqa: E402

BASE_BIN_POR_DEFECTO = "0x3940000"

SALIDA_OK = 0
SALIDA_ERROR = 1
SALIDA_VALIDACION = 2
SALIDA_CERRADA = 3


# ------------------------------------------------------------------ utilidades

def imprimir(datos):
    json.dump(datos, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")


def abrir_memoria(args):
    """Devuelve (memoria, origen) o lanza LookupError/OSError/RuntimeError."""
    if getattr(args, "desde_bin", None):
        mem = vivo.MemoriaFalsa.desde_bin(args.desde_bin, int(args.base, 0))
        return mem, vivo.origen_de(mem)
    mem = vivo.ProcesoPES5(getattr(args, "proceso", vivo.PROCESO_POR_DEFECTO))
    return mem, vivo.origen_de(mem)


def cargar_ops(ruta):
    """Acepta una lista de operaciones o ``{lado, ops, salieron}``."""
    with open(ruta, "r", encoding="utf-8-sig") as f:
        datos = json.load(f)
    if isinstance(datos, dict):
        ops = datos.get("ops")
        if ops is None:
            ops = datos.get("operaciones")
        return ops, datos.get("salieron"), datos.get("lado")
    return datos, None, None


def error_sin_juego(mensaje):
    sys.stderr.write("ERROR: %s\n" % mensaje)
    return SALIDA_ERROR


# ------------------------------------------------------------------ acciones

def accion_estado(args, mem, origen):
    datos = vivo.estado(mem)
    imprimir({"herramienta": "live-agent", "accion": "estado",
              "origen": origen, "estado": datos})
    return SALIDA_OK


def accion_leer(args, mem, origen):
    lados = ["local", "visitante"] if args.lado == "ambos" else [args.lado]
    equipos = [vivo.leer_equipo(mem, lado) for lado in lados]
    imprimir({"herramienta": "live-agent", "accion": "leer",
              "origen": origen, "estado": vivo.estado(mem), "equipos": equipos})
    return SALIDA_OK


def accion_validar(args, mem, origen):
    ops, salieron, lado_archivo = cargar_ops(args.ops)
    lado = args.lado or lado_archivo
    if lado is None:
        sys.stderr.write("ERROR: falta --lado\n")
        return SALIDA_ERROR
    if ops is None:
        sys.stderr.write("ERROR: el archivo no tiene una lista de operaciones\n")
        return SALIDA_VALIDACION
    revision = vivo.validar(mem, lado, ops, salieron)
    imprimir({"herramienta": "live-agent", "accion": "validar",
              "origen": origen, "lado": lado,
              "ok": revision["ok"],
              "errores": revision["errores"],
              "escrituras": revision["escrituras"],
              "salieron": revision["salieron"]})
    return SALIDA_OK if revision["ok"] else SALIDA_VALIDACION


def _esperar_alineacion(mem, segundos, intervalo=0.5):
    limite = time.monotonic() + max(0.0, segundos)
    avisado = False
    while True:
        datos = vivo.estado(mem)
        if datos["puedeEscribir"]:
            return datos
        if time.monotonic() >= limite:
            return datos
        if not avisado:
            sys.stderr.write("Esperando la pantalla de alineación (máximo %g s)...\n" % segundos)
            avisado = True
        time.sleep(intervalo)


def accion_aplicar(args, mem, origen):
    ops, salieron, lado_archivo = cargar_ops(args.ops)
    lado = args.lado or lado_archivo
    if lado is None:
        sys.stderr.write("ERROR: falta --lado\n")
        return SALIDA_ERROR
    if ops is None:
        sys.stderr.write("ERROR: el archivo no tiene una lista de operaciones\n")
        return SALIDA_VALIDACION

    if args.esperar:
        _esperar_alineacion(mem, args.esperar)

    resultado = vivo.aplicar(mem, lado, ops, forzar=args.forzar, salieron=salieron)
    resultado.update({"herramienta": "live-agent", "accion": "aplicar",
                      "origen": origen, "lado": lado})
    imprimir(resultado)
    if resultado["ok"]:
        return SALIDA_OK
    if resultado.get("cerrada"):
        return SALIDA_CERRADA
    return SALIDA_VALIDACION


def accion_vigilar(args, mem, origen):
    sys.stderr.write("Vigilando %s (Ctrl+C para parar)\n" % os.path.abspath(args.carpeta))
    try:
        vivo.vigilar(mem, args.carpeta, vueltas=None, intervalo=args.intervalo)
    except KeyboardInterrupt:
        sys.stderr.write("Vigilancia detenida\n")
    finally:
        cerrar = getattr(mem, "cerrar", None)
        if cerrar:
            cerrar()
    return SALIDA_OK


# ------------------------------------------------------------------ argparse

def _opciones_memoria(parser, suprimir=False):
    defecto = argparse.SUPPRESS if suprimir else None

    def agregar(*args, **kwargs):
        if suprimir:
            kwargs.setdefault("default", argparse.SUPPRESS)
        parser.add_argument(*args, **kwargs)

    agregar("--desde-bin", metavar="ARCHIVO", default=defecto,
            help="lee una captura congelada con MemoriaFalsa en vez del proceso")
    agregar("--base", default=defecto if suprimir else BASE_BIN_POR_DEFECTO,
            help="dirección base del .bin (por defecto %s)" % BASE_BIN_POR_DEFECTO)
    agregar("--proceso", default=defecto if suprimir else vivo.PROCESO_POR_DEFECTO,
            help="nombre del ejecutable (por defecto %s)" % vivo.PROCESO_POR_DEFECTO)


def construir_parser():
    parser = argparse.ArgumentParser(
        prog="live-agent.py",
        description="Agente en vivo de PES5: estado, lectura y escritura controlada.",
        epilog="Sin juego ni captura: usa --desde-bin para probar con MemoriaFalsa.")
    _opciones_memoria(parser)
    sub = parser.add_subparsers(dest="accion", required=True)

    p = sub.add_parser("estado", help="imprime el estado del juego en JSON")
    _opciones_memoria(p, suprimir=True)
    p.set_defaults(func=accion_estado)

    p = sub.add_parser("leer", help="lee el registro de un lado")
    _opciones_memoria(p, suprimir=True)
    p.add_argument("--lado", choices=["local", "visitante", "ambos"], default="ambos")
    p.set_defaults(func=accion_leer)

    p = sub.add_parser("validar", help="valida un archivo de operaciones sin escribir")
    _opciones_memoria(p, suprimir=True)
    p.add_argument("--lado", choices=["local", "visitante"], default=None)
    p.add_argument("--ops", required=True, metavar="ARCHIVO", help="JSON con la lista de operaciones")
    p.set_defaults(func=accion_validar)

    p = sub.add_parser("aplicar", help="valida y aplica un archivo de operaciones")
    _opciones_memoria(p, suprimir=True)
    p.add_argument("--lado", choices=["local", "visitante"], default=None)
    p.add_argument("--ops", required=True, metavar="ARCHIVO", help="JSON con la lista de operaciones")
    p.add_argument("--esperar", type=float, default=0.0, metavar="SEG",
                   help="espera hasta SEG segundos a que se abra la pantalla de alineación")
    p.add_argument("--forzar", action="store_true",
                   help="escribe aunque la alineación no esté abierta (solo pruebas)")
    p.set_defaults(func=accion_aplicar)

    p = sub.add_parser("vigilar", help="procesa pendientes/*.json en bucle")
    _opciones_memoria(p, suprimir=True)
    p.add_argument("--carpeta", required=True, metavar="DIR")
    p.add_argument("--intervalo", type=float, default=0.5, metavar="SEG",
                   help="segundos entre vueltas (por defecto 0,5)")
    p.set_defaults(func=accion_vigilar)

    return parser


def main(argv=None):
    # JSON por stdout siempre en UTF-8, aunque la salida vaya a un pipe de Windows.
    for flujo in (sys.stdout, sys.stderr):
        try:
            flujo.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    args = construir_parser().parse_args(argv)
    try:
        mem, origen = abrir_memoria(args)
    except LookupError as e:
        return error_sin_juego(str(e))
    except (OSError, RuntimeError, ValueError) as e:
        return error_sin_juego(str(e))

    try:
        return args.func(args, mem, origen)
    except vivo.ErrorOperacion as e:
        sys.stderr.write("ERROR: %s\n" % e)
        return SALIDA_ERROR
    except (OSError, ValueError) as e:
        sys.stderr.write("ERROR: %s\n" % e)
        return SALIDA_ERROR
    finally:
        if args.accion != "vigilar":
            cerrar = getattr(mem, "cerrar", None)
            if cerrar:
                cerrar()


if __name__ == "__main__":
    sys.exit(main())
