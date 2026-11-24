#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pruebas del puente HTTP local de PES5 (sin juego).

El servidor se levanta en un hilo con ``MemoriaFalsa``: no abre el proceso ni
toca ningún save. Se prueba el contrato de ``tareas/API_PUENTE.md``.

Ejecutar:

    python -I tools/pes5/test_live_bridge.py -v
    python -m unittest tools/pes5/test_live_bridge.py -v
"""

import importlib.util
import json
import os
import struct
import sys
import threading
import unittest
from urllib import error, request

_DIR = os.path.dirname(os.path.abspath(__file__))
if _DIR not in sys.path:
    sys.path.insert(0, _DIR)

import pes5_vivo as vivo  # noqa: E402
import test_pes5_vivo as base  # noqa: E402


def _cargar_puente():
    ruta = os.path.join(_DIR, "live-bridge.py")
    spec = importlib.util.spec_from_file_location("live_bridge", ruta)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


puente_mod = _cargar_puente()

ORIGEN = "http://localhost:3001"
ORIGEN_MALO = "http://malo.example"


class TestPuente(base.Base):
    def arrancar(self, mem, origenes=None):
        self.mem = mem
        self.puente = puente_mod.Puente(origenes=origenes or [ORIGEN], memoria=mem)
        self.servidor = puente_mod.ServidorPuente(("127.0.0.1", 0), self.puente)
        self.hilo = threading.Thread(target=self.servidor.serve_forever,
                                     kwargs={"poll_interval": 0.05}, daemon=True)
        self.hilo.start()
        self.url = "http://127.0.0.1:%d" % self.servidor.server_address[1]

    def setUp(self):
        self.arrancar(self.memoria(alineacion=1, partido=0))

    def tearDown(self):
        self.servidor.shutdown()
        self.servidor.server_close()
        self.hilo.join(2)

    # -- utilidades HTTP

    def pedir(self, ruta, *, metodo="GET", cuerpo=None, crudo=None, origen=ORIGEN):
        cabeceras = {}
        if origen is not None:
            cabeceras["Origin"] = origen
        datos = None
        if crudo is not None:
            datos = crudo
            cabeceras["Content-Type"] = "application/json"
        elif cuerpo is not None:
            datos = json.dumps(cuerpo).encode("utf-8")
            cabeceras["Content-Type"] = "application/json"
        peticion = request.Request(self.url + ruta, data=datos, headers=cabeceras,
                                   method=metodo)
        try:
            with request.urlopen(peticion, timeout=5) as respuesta:
                leido = respuesta.read()
                return respuesta.status, dict(respuesta.headers), self._json(leido)
        except error.HTTPError as e:
            try:
                leido = e.read()
            finally:
                e.close()
            return e.code, dict(e.headers), self._json(leido)

    @staticmethod
    def _json(datos):
        if not datos:
            return None
        return json.loads(datos.decode("utf-8"))

    def sembrar_resistencia(self, mem, valores):
        mem.sembrar(vivo.TABLA_RESISTENCIA,
                    bytes(vivo.PASO_RESISTENCIA * vivo.ENTRADAS_RESISTENCIA))
        for k, (ident, actual) in enumerate(valores):
            base_dir = vivo.TABLA_RESISTENCIA + k * vivo.PASO_RESISTENCIA
            mem.sembrar(base_dir + vivo.OFF_RESISTENCIA_ID, struct.pack("<H", ident))
            mem.sembrar(base_dir + vivo.OFF_RESISTENCIA_ACTUAL, bytes([actual]))

    # -- GET /estado

    def test_estado(self):
        estado, _cabeceras, datos = self.pedir("/estado")
        self.assertEqual(estado, 200)
        self.assertTrue(datos["ok"])
        self.assertTrue(datos["juego"])
        self.assertEqual(datos["estado"]["momento"], "previa")
        self.assertTrue(datos["estado"]["puedeEscribir"])

    def test_estado_sin_juego(self):
        self.servidor.shutdown()
        self.servidor.server_close()
        self.hilo.join(2)
        self.arrancar(self.memoria(), origenes=[ORIGEN])
        self.puente._memoria = None
        self.puente.proceso = "NO_EXISTE_PES5.exe"
        estado, _cabeceras, datos = self.pedir("/estado")
        self.assertEqual(estado, 200)
        self.assertEqual(datos, {"ok": True, "juego": False})

    # -- GET /leer

    def test_leer_local_contrato_completo(self):
        mem = self.mem
        mem.sembrar(vivo.REC["local"] + vivo.REL_ESTADO_JUGADOR, bytes([2] * 32))
        self.sembrar_resistencia(mem, [(1000, 80), (1005, 0)])
        estado, _cabeceras, datos = self.pedir("/leer?lado=local")
        self.assertEqual(estado, 200)
        self.assertTrue(datos["ok"])
        self.assertTrue(datos["juego"])
        self.assertIn("estado", datos)
        self.assertEqual(len(datos["equipos"]), 1)
        equipo = datos["equipos"][0]
        self.assertEqual(equipo["lado"], "local")
        self.assertEqual(len(equipo["ids"]), 32)
        self.assertEqual(len(equipo["orden"]), 32)
        self.assertEqual(len(equipo["slots"]), 11)
        slot = equipo["slots"][0]
        for clave in ("casilla", "indice", "id", "prof", "lat", "pos", "codigo",
                      "flechas", "act", "mark", "rival"):
            self.assertIn(clave, slot)
        self.assertEqual(slot["casilla"], 0)
        self.assertEqual(slot["pos"], "PT")
        self.assertEqual(slot["lat"], None)
        self.assertEqual(slot["flechas"], [])
        self.assertEqual(len(equipo["estadoJugador"]), 32)
        self.assertEqual(equipo["estadoJugador"], [2] * 32)
        self.assertEqual(len(equipo["resistencia"]), 32)
        self.assertEqual(equipo["resistencia"][0], {"actual": 80, "maxSaque": None})
        self.assertIsNone(equipo["resistencia"][5])
        cabecera = equipo["cabecera"]
        self.assertEqual(len(cabecera["botones"]), 4)
        self.assertIn("modo", cabecera)
        self.assertEqual(set(cabecera["lanzadores"]), {"ckl", "ckr", "tll", "tlc", "pk"})
        self.assertIn("capitan", cabecera)
        self.assertEqual(set(equipo["ajustes"]),
                         {"nivel", "sistema", "libero", "linea", "presion",
                          "offside", "contra"})
        self.assertEqual(equipo["cola"], [])
        self.assertIsNone(equipo["cambiosRestantes"])

    def test_leer_ambos_y_lado_invalido(self):
        _estado, _cabeceras, datos = self.pedir("/leer")
        self.assertEqual(len(datos["equipos"]), 2)
        self.assertEqual([equipo["lado"] for equipo in datos["equipos"]],
                         ["local", "visitante"])
        estado, _cabeceras, datos = self.pedir("/leer?lado=jugador")
        self.assertEqual(estado, 400)
        self.assertFalse(datos["ok"])

    def test_leer_resistencia_con_partido_actualiza_maximos(self):
        self.servidor.shutdown()
        self.servidor.server_close()
        self.hilo.join(2)
        mem = self.memoria(alineacion=1, partido=1, pausa=1)
        self.sembrar_resistencia(mem, [(1000, 90)])
        self.arrancar(mem)
        _estado, _cabeceras, datos = self.pedir("/leer?lado=local")
        self.assertEqual(datos["equipos"][0]["resistencia"][0],
                         {"actual": 90, "maxSaque": 90})
        self.assertEqual(self.puente._maximos, {1000: 90})

    # -- POST /aplicar

    def test_aplicar_ok(self):
        cuerpo = {"lado": "local",
                  "ops": [{"op": "mover", "casilla": 3, "prof": 15,
                           "lat": 40, "pos": "MP"}]}
        estado, _cabeceras, datos = self.pedir("/aplicar", metodo="POST", cuerpo=cuerpo)
        self.assertEqual(estado, 200)
        self.assertTrue(datos["ok"], datos.get("errores"))
        self.assertFalse(datos["cerrada"])
        self.assertTrue(datos["escrito"])
        rec = vivo.REC["local"]
        self.assertEqual(self.mem.leer(rec + 112 + 3, 1)[0], 15)
        self.assertEqual(self.mem.leer(rec + 123 + 2, 1)[0], 40)
        self.assertEqual(self.mem.leer(rec + 133 + 3, 1)[0], 24)

    def test_aplicar_con_error_de_validacion(self):
        cuerpo = {"lado": "local",
                  "ops": [{"op": "mover", "casilla": 0, "prof": 15,
                           "lat": 40, "pos": "PT"}]}
        estado, _cabeceras, datos = self.pedir("/aplicar", metodo="POST", cuerpo=cuerpo)
        self.assertEqual(estado, 200)
        self.assertFalse(datos["ok"])
        self.assertTrue(datos["errores"])
        self.assertEqual(self.mem.escrituras, [])

    def test_aplicar_con_alineacion_cerrada(self):
        self.servidor.shutdown()
        self.servidor.server_close()
        self.hilo.join(2)
        self.arrancar(self.memoria(alineacion=0))
        cuerpo = {"lado": "local",
                  "ops": [{"op": "mover", "casilla": 3, "prof": 15,
                           "lat": 40, "pos": "MP"}]}
        estado, _cabeceras, datos = self.pedir("/aplicar", metodo="POST", cuerpo=cuerpo)
        self.assertEqual(estado, 200)
        self.assertFalse(datos["ok"])
        self.assertTrue(datos["cerrada"])

    def test_aplicar_json_invalido_o_lado_invalido(self):
        estado, _cabeceras, datos = self.pedir("/aplicar", metodo="POST", crudo=b"{no}")
        self.assertEqual(estado, 400)
        self.assertFalse(datos["ok"])
        cuerpo = {"lado": "tercero", "ops": []}
        estado, _cabeceras, datos = self.pedir("/aplicar", metodo="POST", cuerpo=cuerpo)
        self.assertEqual(estado, 400)
        self.assertFalse(datos["ok"])

    # -- CORS

    def test_origen_no_permitido_da_403(self):
        for ruta, metodo in (("/estado", "GET"), ("/leer", "GET"), ("/aplicar", "POST")):
            estado, cabeceras, datos = self.pedir(ruta, metodo=metodo, origen=ORIGEN_MALO,
                                                  cuerpo={} if metodo == "POST" else None)
            self.assertEqual(estado, 403, ruta)
            self.assertFalse(datos["ok"])
            self.assertNotIn("Access-Control-Allow-Origin", cabeceras)

    def test_preflight_options(self):
        estado, cabeceras, _datos = self.pedir("/aplicar", metodo="OPTIONS")
        self.assertEqual(estado, 204)
        self.assertEqual(cabeceras.get("Access-Control-Allow-Origin"), ORIGEN)
        self.assertIn("POST", cabeceras.get("Access-Control-Allow-Methods", ""))
        estado, _cabeceras, datos = self.pedir("/aplicar", metodo="OPTIONS",
                                               origen=ORIGEN_MALO)
        self.assertEqual(estado, 403)
        self.assertFalse(datos["ok"])

    def test_sin_origen_no_se_bloquea(self):
        estado, cabeceras, datos = self.pedir("/estado", origen=None)
        self.assertEqual(estado, 200)
        self.assertTrue(datos["ok"])
        self.assertNotIn("Access-Control-Allow-Origin", cabeceras)

    def test_ruta_desconocida(self):
        estado, _cabeceras, datos = self.pedir("/otra")
        self.assertEqual(estado, 404)
        self.assertFalse(datos["ok"])


if __name__ == "__main__":
    unittest.main()
