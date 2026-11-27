#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pruebas del núcleo del agente en vivo de PES5 (sin juego).

Todo se prueba con ``MemoriaFalsa``: se arma un registro válido en memoria
(orden identidad, ids, campos, cola) y se mueven los cuatro indicadores de
estado para recorrer los momentos. No se abre el proceso ni se toca ningún
save.

Ejecutar:

    python -I tools/pes5/test_pes5_vivo.py -v
    python -m unittest tools/pes5/test_pes5_vivo.py -v

(Con ``python -I -m unittest <ruta>`` CPython quita el directorio actual de
`sys.path` en modo aislado y no encuentra el módulo; no es un fallo de estas
pruebas.)
"""

import json
import os
import shutil
import struct
import sys
import tempfile
import unittest

_DIR = os.path.dirname(os.path.abspath(__file__))
if _DIR not in sys.path:
    sys.path.insert(0, _DIR)

import pes5_vivo as vivo  # noqa: E402

# Los registros viven en 0x3940000..0x3970000; se siembra desde rec-128 para
# cubrir la cola de cambios y hasta rec+4136 para cubrir la tercera copia del orden.
BASE_REL = -128
LARGO_FALSA = 4600

COPIA_1 = vivo.COPIAS_ORDEN[0]
COPIA_2 = vivo.COPIAS_ORDEN[1]
COPIA_3 = vivo.COPIAS_ORDEN[2]


# ------------------------------------------------------------------ utilidades

def escribir_json(ruta, datos):
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False)
    return ruta


def leer_json(ruta):
    with open(ruta, "r", encoding="utf-8") as f:
        return json.load(f)


def orden_de(mem, rel=COPIA_1, lado="local"):
    rec = vivo.REC[lado]
    return list(mem.leer(rec + rel, 32))


# ------------------------------------------------------------------ base

class Base(unittest.TestCase):
    """Arma la memoria de prueba."""

    def memoria(self, *, alineacion=1, partido=0, pausa=0, balon=0,
                orden=None, cola=(), restantes=255, campos=None, lado="local"):
        mem = vivo.MemoriaFalsa()
        for direccion, valor in ((vivo.IND_ALINEACION, alineacion),
                                 (vivo.IND_PARTIDO, partido),
                                 (vivo.IND_PAUSA, pausa),
                                 (vivo.IND_BALON, balon)):
            mem.sembrar(direccion, bytes([valor]))
        self.sembrar_equipo(mem, lado, orden=orden, cola=cola,
                            restantes=restantes, campos=campos)
        return mem

    def sembrar_equipo(self, mem, lado="local", *, orden=None, cola=(),
                       restantes=255, campos=None, ids=None):
        rec = vivo.REC[lado]
        base = rec + BASE_REL
        datos = bytearray(LARGO_FALSA)

        def indice(rel):
            return rel - BASE_REL

        def poner(rel, valores):
            datos[indice(rel):indice(rel) + len(valores)] = bytes(valores)

        orden = list(range(32)) if orden is None else list(orden)
        ids = [1000 + i for i in range(32)] if ids is None else list(ids)
        for rel in (COPIA_1, COPIA_2, COPIA_3):
            poner(rel, orden)
        for k, ident in enumerate(ids):
            struct.pack_into("<H", datos, indice(vivo.REL_IDS) + 2 * k, ident)

        valores = {
            "profundidad": list(range(1, 12)),
            "lateral": list(range(6, 16)),
            "posicion": [0] + [10] * 10,
            "flechasAtaque": None,
            "actitudDefensiva": [1] * 11,
            "marcaje": [1] * 11,
            "rivalMarcado": [255] * 11,
            "sistemaDefensivo": 0,
            "libero": 0,
            "nivelAtaqueDefensa": 2,
            "lineaDefensiva": 1,
            "zonaPresion": 0,
            "fueraDeJuego": 2,
            "contraataque": 1,
        }
        if campos:
            valores.update(campos)
        for nombre, valor in valores.items():
            if valor is None:
                continue
            if nombre == "flechasAtaquePantalla":
                for c, grupo in enumerate(valor):
                    poner(vivo.REL_FLECHAS_PANTALLA + 8 * c, grupo)
                continue
            campo = vivo.campo_de(nombre, "principal")
            self.assertIsNotNone(campo, "campo de prueba desconocido: %s" % nombre)
            if campo.get("porCasilla"):
                stride = campo.get("stride", 1)
                if stride == 1:
                    poner(campo["offset"], valor)
                else:
                    plano = []
                    for grupo in valor:
                        plano.extend(grupo)
                    poner(campo["offset"], plano)
            else:
                poner(campo["offset"], [valor])

        # FV7: si el test no fija la copia de pantalla, el juego la mantiene
        # igual que el bloque principal; se siembra el espejo para que el
        # puente lea las mismas flechas.
        if "flechasAtaquePantalla" not in valores and valores.get("flechasAtaque"):
            for c, grupo in enumerate(valores["flechasAtaque"]):
                poner(vivo.REL_FLECHAS_PANTALLA + 8 * c, grupo)
                poner(vivo.REL_FLECHAS_SELECCION + 8 * c, grupo)

        for k, (entra, sale) in enumerate(cola):
            poner(vivo.COLA_ENTRA + 2 * k, [entra])
            poner(vivo.COLA_SALE + 2 * k, [sale])
            poner(vivo.COLA_ESPEJO_ENTRA + 2 * k, [entra])
            poner(vivo.COLA_ESPEJO_SALE + 2 * k, [sale])
        poner(vivo.COLA_CONTADOR, [len(cola)])
        poner(vivo.COLA_ESPEJO_CONTADOR, [len(cola)])
        poner(vivo.COLA_RESTANTES, [restantes])

        mem.sembrar(base, bytes(datos))

    # -- atajos

    def aplicar(self, mem, ops, lado="local", **kwargs):
        return vivo.aplicar(mem, lado, ops, **kwargs)

    def byte(self, mem, rel, lado="local"):
        rec = vivo.REC[lado]
        return mem.leer(rec + rel, 1)[0]

    def carpeta(self):
        directorio = tempfile.mkdtemp(prefix="pes5-vivo-")
        self.addCleanup(shutil.rmtree, directorio, ignore_errors=True)
        return directorio


# ------------------------------------------------------------------ estado

class TestEstado(Base):
    def test_previa(self):
        datos = vivo.estado(self.memoria(alineacion=1, partido=0))
        self.assertEqual(datos["momento"], "previa")
        self.assertTrue(datos["puedeEscribir"])
        self.assertEqual(datos["alineacionAbierta"], 1)
        self.assertEqual(datos["partidoEmpezado"], 0)
        self.assertEqual(datos["pausa"], 0)
        self.assertEqual(datos["balonEnJuego"], 0)

    def test_pausa(self):
        datos = vivo.estado(self.memoria(alineacion=1, partido=1, pausa=1))
        self.assertEqual(datos["momento"], "pausa")
        self.assertTrue(datos["puedeEscribir"])

    def test_entretiempo(self):
        datos = vivo.estado(self.memoria(alineacion=1, partido=1, pausa=0))
        self.assertEqual(datos["momento"], "entretiempo")
        self.assertTrue(datos["puedeEscribir"])

    def test_jugando(self):
        datos = vivo.estado(self.memoria(alineacion=0, partido=1, pausa=0, balon=1))
        self.assertEqual(datos["momento"], "jugando")
        self.assertFalse(datos["puedeEscribir"])

    def test_menu(self):
        datos = vivo.estado(self.memoria(alineacion=0, partido=0))
        self.assertEqual(datos["momento"], "menu")
        self.assertFalse(datos["puedeEscribir"])

    def test_menu_pausa_sin_alineacion(self):
        datos = vivo.estado(self.memoria(alineacion=0, partido=1, pausa=1))
        self.assertEqual(datos["momento"], "menu")
        self.assertFalse(datos["puedeEscribir"])

    def test_entretiempo_cerrado_es_menu(self):
        datos = vivo.estado(self.memoria(alineacion=0, partido=1, pausa=0, balon=0))
        self.assertEqual(datos["momento"], "menu")


# ------------------------------------------------------------------ lectura

class TestLectura(Base):
    def test_orden_ids_y_grupos(self):
        mem = self.memoria()
        equipo = vivo.leer_equipo(mem, "local")
        self.assertEqual(equipo["rec"], hex(vivo.REC["local"]))
        self.assertEqual(equipo["orden"], list(range(32)))
        self.assertEqual(equipo["ids"], [1000 + i for i in range(32)])
        self.assertEqual(equipo["titulares"][3], {"casilla": 3, "indice": 3, "id": 1003})
        self.assertEqual(len(equipo["titulares"]), 11)
        self.assertEqual(len(equipo["banca"]), 12)
        self.assertEqual(len(equipo["reservas"]), 9)
        self.assertEqual(equipo["banca"][0]["casilla"], 11)
        self.assertEqual(equipo["reservas"][0]["casilla"], 23)

    def test_campos_del_bloque_principal(self):
        flechas = [[0] * 8 for _ in range(11)]
        flechas[2] = [1, 0, 1, 0, 0, 0, 0, 0]
        mem = self.memoria(campos={"flechasAtaque": flechas})
        campos = vivo.leer_equipo(mem, "local")["campos"]
        self.assertEqual(campos["profundidad"][5], 6)
        self.assertEqual(campos["lateral"][1], 6)
        self.assertEqual(campos["lateral"][10], 15)
        self.assertEqual(campos["posicion"][0], 0)
        self.assertEqual(campos["posicion"][7], 10)
        self.assertEqual(campos["flechasAtaque"][2], [1, 0, 1, 0, 0, 0, 0, 0])
        self.assertEqual(campos["flechasAtaquePantalla"][2], [1, 0, 1, 0, 0, 0, 0, 0])
        self.assertEqual(campos["actitudDefensiva"][0], 1)
        self.assertEqual(campos["marcaje"][0], 1)
        self.assertEqual(campos["rivalMarcado"][0], 255)
        self.assertEqual(campos["sistemaDefensivo"], 0)
        self.assertEqual(campos["libero"], 0)
        self.assertEqual(campos["nivelAtaqueDefensa"], 2)
        self.assertEqual(campos["lineaDefensiva"], 1)
        self.assertEqual(campos["zonaPresion"], 0)
        self.assertEqual(campos["fueraDeJuego"], 2)
        self.assertEqual(campos["contraataque"], 1)

    def test_flechas_de_pantalla_se_leen_de_c2(self):
        # FV7: el minimapa usa c2 (rec+981), que puede diferir del bloque
        # principal (rec+147).
        principal = [[0] * 8 for _ in range(11)]
        principal[3] = [0, 1, 0, 0, 0, 1, 0, 0]        # ↖ + ↘
        pantalla = [[0] * 8 for _ in range(11)]
        pantalla[3] = [0, 0, 1, 0, 0, 0, 1, 0]         # ↑ + ↓
        mem = self.memoria(campos={"flechasAtaque": principal,
                                   "flechasAtaquePantalla": pantalla})
        campos = vivo.leer_equipo(mem, "local")["campos"]
        self.assertEqual(campos["flechasAtaque"][3], [0, 1, 0, 0, 0, 1, 0, 0])
        self.assertEqual(campos["flechasAtaquePantalla"][3], [0, 0, 1, 0, 0, 0, 1, 0])

    def test_cola_y_cambios_restantes(self):
        mem = self.memoria(partido=1, pausa=1, restantes=3,
                           cola=[(13, 11), (14, 12)])
        equipo = vivo.leer_equipo(mem, "local")
        self.assertEqual(equipo["cola"], [{"entra": 13, "sale": 11},
                                          {"entra": 14, "sale": 12}])
        self.assertEqual(equipo["colaDeclarada"], 2)
        self.assertEqual(equipo["cambiosRestantes"], 3)

    def test_cambios_restantes_sin_inicializar(self):
        mem = self.memoria(restantes=255)
        equipo = vivo.leer_equipo(mem, "local")
        self.assertIsNone(equipo["cambiosRestantes"])
        self.assertEqual(equipo["cambiosRestantesByte"], 255)

    def test_orden_no_identidad(self):
        mem = self.memoria(orden=list(reversed(range(32))))
        equipo = vivo.leer_equipo(mem, "local")
        self.assertEqual(equipo["titulares"][0]["indice"], 31)
        self.assertEqual(equipo["titulares"][0]["id"], 1031)

    def test_cabecera_es_indice_con_id_y_casilla(self):
        # El índice 11 (id 1011) está en la casilla 9: capitán y penal lo
        # guardan como índice, no como casilla.
        orden = list(range(32))
        orden[9], orden[11] = 11, 9
        mem = self.memoria(orden=orden)
        rec = vivo.REC["local"]
        mem.sembrar(rec + 111, bytes([11]))
        mem.sembrar(rec + 110, bytes([11]))
        cabecera = vivo.leer_equipo(mem, "local")["cabecera"]
        self.assertEqual(cabecera["capitan"], {"indice": 11, "id": 1011, "casilla": 9})
        self.assertEqual(cabecera["penal"], {"indice": 11, "id": 1011, "casilla": 9})
        self.assertEqual(cabecera["cornerIzquierdo"], {"indice": 0, "id": 1000, "casilla": 0})


# ------------------------------------------------------------------ intercambiar

class TestIntercambiar(Base):
    def test_previa_escribe_las_tres_copias(self):
        mem = self.memoria(alineacion=1, partido=0)
        resultado = self.aplicar(mem, [{"op": "intercambiar", "casillaA": 2, "casillaB": 9}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        esperado = list(range(32))
        esperado[2], esperado[9] = esperado[9], esperado[2]
        for rel in (COPIA_1, COPIA_2, COPIA_3):
            self.assertEqual(orden_de(mem, rel), esperado)
        self.assertEqual(len(resultado["escrito"]), 3)
        self.assertTrue(all(item["coincide"] for item in resultado["escrito"]))
        self.assertTrue(all("antes" in item and "despues" in item for item in resultado["escrito"]))

    def test_titular_con_banca_con_partido_empezado(self):
        mem = self.memoria(alineacion=1, partido=1, pausa=1)
        resultado = self.aplicar(mem, [{"op": "intercambiar", "casillaA": 3, "casillaB": 13}])
        self.assertFalse(resultado["ok"])
        self.assertIn("con el partido empezado los cambios van por la cola",
                      " ".join(resultado["errores"]))
        self.assertEqual(mem.escrituras, [])

    def test_titular_con_titular_permitido(self):
        mem = self.memoria(alineacion=1, partido=1, pausa=1)
        resultado = self.aplicar(mem, [{"op": "intercambiar", "casillaA": 3, "casillaB": 9}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        orden = orden_de(mem)
        self.assertEqual((orden[3], orden[9]), (9, 3))

    def test_banca_con_banca_permitido(self):
        mem = self.memoria(alineacion=1, partido=1, pausa=1)
        resultado = self.aplicar(mem, [{"op": "intercambiar", "casillaA": 13, "casillaB": 20}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        orden = orden_de(mem)
        self.assertEqual((orden[13], orden[20]), (20, 13))

    def test_copias_distintas(self):
        mem = self.memoria()
        rec = vivo.REC["local"]
        mem.sembrar(rec + COPIA_3, bytes([31]))
        resultado = self.aplicar(mem, [{"op": "intercambiar", "casillaA": 1, "casillaB": 2}])
        self.assertFalse(resultado["ok"])
        self.assertIn("copias del orden", " ".join(resultado["errores"]))
        self.assertEqual(mem.escrituras, [])

    def test_casilla_repetida(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [{"op": "intercambiar", "casillaA": 4, "casillaB": 4}])
        self.assertFalse(resultado["ok"])
        self.assertIn("la misma", " ".join(resultado["errores"]))

    def test_casilla_fuera_de_rango(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [{"op": "intercambiar", "casillaA": 4, "casillaB": 32}])
        self.assertFalse(resultado["ok"])
        self.assertIn("fuera de rango", " ".join(resultado["errores"]))


# ------------------------------------------------------------------ cambio

class TestCambioPrevia(Base):
    def test_cambio_antes_del_partido_es_intercambio(self):
        mem = self.memoria(alineacion=1, partido=0)
        resultado = self.aplicar(mem, [{"op": "cambio", "entra": 13, "sale": 3}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        esperado = list(range(32))
        esperado[3], esperado[13] = 13, 3
        for rel in (COPIA_1, COPIA_2, COPIA_3):
            self.assertEqual(orden_de(mem, rel), esperado)
        # Antes del partido no se toca la cola.
        self.assertEqual(self.byte(mem, vivo.COLA_CONTADOR), 0)

    def test_cambio_antes_del_partido_con_reserva(self):
        mem = self.memoria(alineacion=1, partido=0)
        resultado = self.aplicar(mem, [{"op": "cambio", "entra": 25, "sale": 3}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        orden = orden_de(mem)
        self.assertEqual((orden[3], orden[25]), (25, 3))


class TestCambioEnPartido(Base):
    def test_primera_pareja(self):
        mem = self.memoria(alineacion=1, partido=1, pausa=1, restantes=3)
        resultado = self.aplicar(mem, [{"op": "cambio", "entra": 13, "sale": 5}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        rec = vivo.REC["local"]
        self.assertEqual(mem.leer(rec + vivo.COLA_ENTRA, 1), bytes([13]))
        self.assertEqual(mem.leer(rec + vivo.COLA_SALE, 1), bytes([5]))
        self.assertEqual(self.byte(mem, vivo.COLA_CONTADOR), 1)
        self.assertEqual(self.byte(mem, vivo.COLA_ESPEJO_ENTRA), 13)
        self.assertEqual(self.byte(mem, vivo.COLA_ESPEJO_SALE), 5)
        self.assertEqual(self.byte(mem, vivo.COLA_ESPEJO_CONTADOR), 1)
        # La cola no toca el orden.
        self.assertEqual(orden_de(mem), list(range(32)))
        self.assertEqual(resultado["salieron"], [5])

    def test_segunda_pareja(self):
        mem = self.memoria(alineacion=1, partido=1, pausa=1, restantes=3)
        resultado = self.aplicar(mem, [{"op": "cambio", "entra": 13, "sale": 5},
                                       {"op": "cambio", "entra": 14, "sale": 6}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        rec = vivo.REC["local"]
        self.assertEqual(mem.leer(rec + vivo.COLA_ENTRA, 1), bytes([13]))
        self.assertEqual(mem.leer(rec + vivo.COLA_SALE, 1), bytes([5]))
        self.assertEqual(mem.leer(rec + vivo.COLA_ENTRA + 2, 1), bytes([14]))
        self.assertEqual(mem.leer(rec + vivo.COLA_SALE + 2, 1), bytes([6]))
        self.assertEqual(self.byte(mem, vivo.COLA_CONTADOR), 2)
        self.assertEqual(self.byte(mem, vivo.COLA_ESPEJO_ENTRA + 2), 14)
        self.assertEqual(self.byte(mem, vivo.COLA_ESPEJO_SALE + 2), 6)
        self.assertEqual(self.byte(mem, vivo.COLA_ESPEJO_CONTADOR), 2)
        self.assertEqual(resultado["salieron"], [5, 6])

    def test_reserva_no_entra(self):
        mem = self.memoria(alineacion=1, partido=1, pausa=1, restantes=3)
        resultado = self.aplicar(mem, [{"op": "cambio", "entra": 25, "sale": 5}])
        self.assertFalse(resultado["ok"])
        self.assertIn("banca", " ".join(resultado["errores"]))
        self.assertEqual(mem.escrituras, [])

    def test_el_que_sale_tiene_que_ser_titular(self):
        mem = self.memoria(alineacion=1, partido=1, pausa=1, restantes=3)
        resultado = self.aplicar(mem, [{"op": "cambio", "entra": 13, "sale": 14}])
        self.assertFalse(resultado["ok"])
        self.assertIn("titulares", " ".join(resultado["errores"]))

    def test_ya_en_cola(self):
        mem = self.memoria(alineacion=1, partido=1, pausa=1, restantes=3)
        primero = self.aplicar(mem, [{"op": "cambio", "entra": 13, "sale": 5}])
        self.assertTrue(primero["ok"], primero["errores"])
        segundo = self.aplicar(mem, [{"op": "cambio", "entra": 13, "sale": 6}])
        self.assertFalse(segundo["ok"])
        self.assertIn("ya está en la cola", " ".join(segundo["errores"]))

    def test_salio_antes(self):
        mem = self.memoria(alineacion=1, partido=1, pausa=1, restantes=3)
        resultado = self.aplicar(mem, [{"op": "cambio", "entra": 14, "sale": 6}],
                                 salieron=[6])
        self.assertFalse(resultado["ok"])
        self.assertIn("ya salió antes", " ".join(resultado["errores"]))
        self.assertEqual(mem.escrituras, [])

    def test_salieron_invalido(self):
        mem = self.memoria(alineacion=1, partido=1, pausa=1, restantes=3)
        resultado = self.aplicar(mem, [{"op": "cambio", "entra": 13, "sale": 5}],
                                 salieron=["x"])
        self.assertFalse(resultado["ok"])
        self.assertIn("salieron", " ".join(resultado["errores"]))
        self.assertEqual(mem.escrituras, [])

    def test_sin_cambios_restantes(self):
        mem = self.memoria(alineacion=1, partido=1, pausa=1, restantes=0)
        resultado = self.aplicar(mem, [{"op": "cambio", "entra": 13, "sale": 5}])
        self.assertFalse(resultado["ok"])
        self.assertIn("no quedan cambios", " ".join(resultado["errores"]))

    def test_restantes_sin_inicializar(self):
        mem = self.memoria(alineacion=1, partido=1, pausa=1, restantes=255)
        resultado = self.aplicar(mem, [{"op": "cambio", "entra": 13, "sale": 5}])
        self.assertFalse(resultado["ok"])
        mensaje = " ".join(resultado["errores"])
        self.assertIn("rec-42", mensaje)
        self.assertIn("255", mensaje)
        self.assertIn("Cambios", mensaje)

    def test_cola_llena(self):
        parejas = [(11 + k, 3 + k) for k in range(vivo.COLA_MAX)]
        mem = self.memoria(alineacion=1, partido=1, pausa=1, restantes=7, cola=parejas)
        resultado = self.aplicar(mem, [{"op": "cambio", "entra": 20, "sale": 0}])
        self.assertFalse(resultado["ok"])
        self.assertIn("cola ya tiene", " ".join(resultado["errores"]))

    def test_indice_fuera_del_orden(self):
        mem = self.memoria(alineacion=1, partido=1, pausa=1, restantes=3,
                           orden=list(range(1, 32)) + [0])
        resultado = self.aplicar(mem, [{"op": "cambio", "entra": 13, "sale": 5}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(resultado["salieron"], [5])


# ------------------------------------------------------------------ campo

class TestCampo(Base):
    def test_campo_escalar(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "nivelAtaqueDefensa", "valor": 3}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 278), 3)

    def test_campo_por_casilla(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "lateral",
                                        "casilla": 4, "valor": 42}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 123 + 3), 42)

    def test_campo_flechas(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "flechasAtaque",
                                        "casilla": 2, "indice": 3, "valor": 1}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 147 + 2 * 8 + 3), 1)
        # FV7: se escriben también la copia de pantalla (c2) y la seleccionada (c3).
        self.assertEqual(self.byte(mem, vivo.REL_FLECHAS_PANTALLA + 2 * 8 + 3), 1)
        self.assertEqual(self.byte(mem, vivo.REL_FLECHAS_SELECCION + 2 * 8 + 3), 1)

    def test_campo_bloque_a(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "nivelAtaqueDefensa",
                                        "bloque": "A", "valor": 1}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 449), 1)
        self.assertEqual(self.byte(mem, 278), 2)

    def test_campo_cabecera(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "capitan",
                                        "bloque": "cabecera", "valor": 6}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 111), 6)
        self.assertEqual(len(resultado["escrito"]), 1)

    def test_campo_cabecera_rechaza_campos_de_otros_bloques(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "nivelAtaqueDefensa",
                                        "bloque": "cabecera", "valor": 1}])
        self.assertFalse(resultado["ok"])
        self.assertIn("cabecera", " ".join(resultado["errores"]))
        self.assertEqual(mem.escrituras, [])

    def test_campo_cabecera_sin_bloque_resuelve_a_cabecera(self):
        # «capitan» solo existe en la cabecera: sin bloque se resuelve ahí y se
        # valida como índice de plantel de un titular (VIVO3/VIVO4).
        orden = list(range(32))
        orden[9], orden[11] = 11, 9
        mem = self.memoria(orden=orden)
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "capitan", "valor": 11}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 111), 11)
        self.assertEqual(resultado["escrito"][0]["dir"], hex(vivo.REC["local"] + 111))

    def test_campo_del_bloque_principal_sin_bloque_no_va_a_la_cabecera(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "nivelAtaqueDefensa", "valor": 1}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 278), 1)
        self.assertEqual(self.byte(mem, 105), 0)  # modoEstrategia intacto

    def test_campo_estrategia_boton(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [
            {"op": "campo", "nombre": "estrategiaBoton", "bloque": "cabecera",
             "indice": 2, "valor": 9}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 102), 9)
        self.assertEqual(resultado["escrito"][0]["dir"], hex(vivo.REC["local"] + 102))

    def test_campo_estrategia_boton_valor_13_es_error(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [
            {"op": "campo", "nombre": "estrategiaBoton", "bloque": "cabecera",
             "indice": 0, "valor": 13}])
        self.assertFalse(resultado["ok"])
        self.assertIn("no válido", " ".join(resultado["errores"]))
        self.assertEqual(mem.escrituras, [])
        self.assertEqual(self.byte(mem, 100), 0)

    def test_campo_estrategia_boton_indice_fuera_de_rango(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [
            {"op": "campo", "nombre": "estrategiaBoton", "bloque": "cabecera",
             "indice": 4, "valor": 9}])
        self.assertFalse(resultado["ok"])
        self.assertIn("indice", " ".join(resultado["errores"]))
        self.assertEqual(mem.escrituras, [])

    def test_campo_modo_estrategia(self):
        mem = self.memoria()
        for valor in (0, 1):
            with self.subTest(valor=valor):
                resultado = self.aplicar(mem, [
                    {"op": "campo", "nombre": "modoEstrategia", "bloque": "cabecera",
                     "valor": valor}])
                self.assertTrue(resultado["ok"], resultado["errores"])
                self.assertEqual(self.byte(mem, 105), valor)
        resultado = self.aplicar(mem, [
            {"op": "campo", "nombre": "modoEstrategia", "bloque": "cabecera", "valor": 2}])
        self.assertFalse(resultado["ok"])
        self.assertIn("no válido", " ".join(resultado["errores"]))
        self.assertEqual(self.byte(mem, 105), 1)

    def test_campo_cabecera_desconocido104_es_error(self):
        mem = self.memoria()
        casos = (
            {"op": "campo", "nombre": "desconocido104", "bloque": "cabecera", "valor": 1},
            {"op": "campo", "nombre": "desconocido104", "valor": 1},
        )
        for caso in casos:
            with self.subTest(caso=caso):
                resultado = self.aplicar(mem, [caso])
                self.assertFalse(resultado["ok"])
                self.assertIn("desconocido104", " ".join(resultado["errores"]))
        self.assertEqual(mem.escrituras, [])

    def test_campo_invalido(self):
        mem = self.memoria()
        casos = [
            {"op": "campo", "nombre": "nivelAtaqueDefensa", "valor": 9},
            {"op": "campo", "nombre": "profundidad", "casilla": 5, "valor": 0},
            {"op": "campo", "nombre": "profundidad", "casilla": 11, "valor": 5},
            {"op": "campo", "nombre": "orden", "valor": 0},
            {"op": "campo", "nombre": "idsPlantel", "valor": 0},
            {"op": "campo", "nombre": "noExiste", "valor": 0},
            {"op": "campo", "nombre": "lateral", "casilla": 0, "valor": 7},
            {"op": "campo", "nombre": "lateral", "casilla": 1, "valor": 5},
            {"op": "campo", "nombre": "nivelAtaqueDefensa", "valor": 1, "casilla": 2},
            {"op": "campo", "nombre": "flechasAtaque", "casilla": 2, "valor": 1},
            {"op": "campo", "nombre": "flechasAtaque", "casilla": 11, "indice": 0, "valor": 1},
            {"op": "campo", "nombre": "flechasAtaque", "casilla": 2, "indice": 8, "valor": 1},
            {"op": "campo", "nombre": "nivelAtaqueDefensa", "bloque": "C", "valor": 1},
            {"op": "campo", "nombre": "capitan", "bloque": "cabecera", "valor": 32},
            {"op": "campo", "nombre": "nivelAtaqueDefensa"},
            {"op": "campo", "nombre": ""},
        ]
        for caso in casos:
            with self.subTest(caso=caso):
                resultado = self.aplicar(mem, [caso])
                self.assertFalse(resultado["ok"], caso)
        self.assertEqual(mem.escrituras, [])

    def test_operacion_desconocida(self):
        mem = self.memoria()
        for ops in ([{"op": "borrar", "casilla": 1}], ["hola"], [{"casilla": 1}], []):
            with self.subTest(ops=ops):
                resultado = self.aplicar(mem, ops)
                self.assertFalse(resultado["ok"])
        self.assertEqual(mem.escrituras, [])

    def test_validar_no_escribe(self):
        mem = self.memoria()
        revision = vivo.validar(mem, "local", [
            {"op": "campo", "nombre": "nivelAtaqueDefensa", "valor": 1},
            {"op": "intercambiar", "casillaA": 1, "casillaB": 2},
        ])
        self.assertTrue(revision["ok"], revision["errores"])
        self.assertEqual(mem.escrituras, [])
        self.assertEqual(len(revision["escrituras"]), 4)


# ------------------------------------------------------------------ coherencia

# PT en la 0, CT en las 1..7 y CCD (código 10) en las 8..10.
CT = [0] + [1] * 7 + [10] * 3


class TestCoherencia(Base):
    def poner_campo(self, mem, nombre, bloque, valor, casilla=None, lado="local"):
        campo = vivo.campo_de(nombre, bloque)
        self.assertIsNotNone(campo, "%s/%s" % (nombre, bloque))
        direccion = vivo.REC[lado] + campo["offset"] + (casilla or 0)
        mem.sembrar(direccion, bytes([valor]))

    def poner_cabecera(self, mem, nombre, valor, lado="local"):
        self.poner_campo(mem, nombre, "cabecera", valor, lado=lado)

    # -- sistema Líbero y líbero

    def test_sistema_libero_con_libero_cero(self):
        # El fallo del juego: escribir solo el sistema deja al arquero (casilla 0)
        # como líbero.
        mem = self.memoria()
        self.assertEqual(self.byte(mem, 277), 0)
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "sistemaDefensivo", "valor": 1}])
        self.assertFalse(resultado["ok"])
        mensaje = " ".join(resultado["errores"])
        self.assertIn("con sistema Líbero el líbero tiene que ser un CT titular (casillas 1–10)",
                      mensaje)
        self.assertIn("casilla 0", mensaje)
        self.assertEqual(mem.escrituras, [])
        self.assertEqual(self.byte(mem, 276), 0)

    def test_sistema_libero_con_libero_valido_en_el_mismo_lote(self):
        mem = self.memoria(campos={"posicion": CT})
        resultado = self.aplicar(mem, [
            {"op": "campo", "nombre": "sistemaDefensivo", "valor": 1},
            {"op": "campo", "nombre": "libero", "valor": 3},
        ])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 276), 1)
        self.assertEqual(self.byte(mem, 277), 3)

    def test_libero_en_casilla_no_ct(self):
        mem = self.memoria(campos={"posicion": CT})
        resultado = self.aplicar(mem, [
            {"op": "campo", "nombre": "sistemaDefensivo", "valor": 1},
            {"op": "campo", "nombre": "libero", "valor": 8},
        ])
        self.assertFalse(resultado["ok"])
        mensaje = " ".join(resultado["errores"])
        self.assertIn("con sistema Líbero", mensaje)
        self.assertIn("casilla 8 con código de posición 10", mensaje)
        self.assertEqual(mem.escrituras, [])
        self.assertEqual(self.byte(mem, 276), 0)

    def test_libero_en_la_banca(self):
        mem = self.memoria(campos={"posicion": CT})
        resultado = self.aplicar(mem, [
            {"op": "campo", "nombre": "sistemaDefensivo", "valor": 1},
            {"op": "campo", "nombre": "libero", "valor": 11},
        ])
        self.assertFalse(resultado["ok"])
        self.assertIn("casilla 11", " ".join(resultado["errores"]))
        self.assertEqual(mem.escrituras, [])

    def test_libero_con_codigo_lib_valido(self):
        posiciones = list(CT)
        posiciones[5] = 4  # la casilla 5 ya tiene LIB en el bloque principal
        mem = self.memoria(campos={"posicion": posiciones})
        resultado = self.aplicar(mem, [
            {"op": "campo", "nombre": "sistemaDefensivo", "valor": 1},
            {"op": "campo", "nombre": "libero", "valor": 5},
        ])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 277), 5)

    def test_libero_escrito_con_otro_sistema_casilla_no_ct(self):
        mem = self.memoria(campos={"posicion": CT})
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "libero", "valor": 8}])
        self.assertFalse(resultado["ok"])
        mensaje = " ".join(resultado["errores"])
        self.assertIn("el líbero tiene que ser un CT titular (casillas 1–10)", mensaje)
        self.assertNotIn("con sistema Líbero", mensaje)
        self.assertEqual(mem.escrituras, [])

    def test_libero_escrito_con_otro_sistema_valido(self):
        mem = self.memoria(campos={"posicion": CT})
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "libero", "valor": 1}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 276), 0)
        self.assertEqual(self.byte(mem, 277), 1)

    def test_libero_invalido_preexistente_no_bloquea_marcaje(self):
        # Sistema Líbero con el líbero preexistente en una casilla no CT: un
        # lote que solo cambia el marcaje no se bloquea (VIVO3).
        posiciones = list(CT)
        posiciones[8] = 9  # DI: no es CT ni LIB
        mem = self.memoria(campos={"posicion": posiciones, "sistemaDefensivo": 1, "libero": 8})
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "marcaje",
                                        "casilla": 4, "valor": 2}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 254 + 4), 2)
        self.assertEqual(self.byte(mem, 277), 8)
        self.assertEqual(self.byte(mem, 276), 1)

    def test_sistema_libero_tocado_con_libero_invalido_preexistente(self):
        # El mismo estado, pero el lote toca sistemaDefensivo: el líbero final
        # (preexistente) se revalida y el lote se rechaza.
        posiciones = list(CT)
        posiciones[8] = 9
        mem = self.memoria(campos={"posicion": posiciones, "sistemaDefensivo": 0, "libero": 8})
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "sistemaDefensivo", "valor": 1}])
        self.assertFalse(resultado["ok"])
        mensaje = " ".join(resultado["errores"])
        self.assertIn("con sistema Líbero", mensaje)
        self.assertIn("casilla 8", mensaje)
        self.assertEqual(mem.escrituras, [])
        self.assertEqual(self.byte(mem, 276), 0)

    def test_libero_invalido_preexistente_con_cambio_en_partido(self):
        # Un cambio en partido no toca el orden: el líbero preexistente no se
        # vuelve a validar.
        posiciones = list(CT)
        posiciones[8] = 9
        mem = self.memoria(partido=1, pausa=1, restantes=3,
                           campos={"posicion": posiciones, "sistemaDefensivo": 1, "libero": 8})
        resultado = self.aplicar(mem, [{"op": "cambio", "entra": 13, "sale": 5}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, vivo.COLA_ENTRA), 13)

    def test_sistema_libero_en_la_alineacion_a(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "sistemaDefensivo",
                                        "bloque": "A", "valor": 1}])
        self.assertFalse(resultado["ok"])
        mensaje = " ".join(resultado["errores"])
        self.assertIn("Alineación A", mensaje)
        self.assertIn("con sistema Líbero", mensaje)
        self.assertEqual(mem.escrituras, [])
        self.assertEqual(self.byte(mem, 447), 0)

    def test_sistema_libero_valido_en_la_alineacion_a(self):
        mem = self.memoria()
        for casilla in range(1, 11):
            self.poner_campo(mem, "posicion", "A", 1, casilla=casilla)
        self.poner_campo(mem, "posicion", "A", 0, casilla=0)
        resultado = self.aplicar(mem, [
            {"op": "campo", "nombre": "sistemaDefensivo", "bloque": "A", "valor": 1},
            {"op": "campo", "nombre": "libero", "bloque": "A", "valor": 2},
        ])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 447), 1)
        self.assertEqual(self.byte(mem, 448), 2)
        self.assertEqual(self.byte(mem, 276), 0)

    # -- capitán y lanzadores (índice de plantel, no casilla)

    def test_capitan_indice_titular_en_casilla_distinta(self):
        # El índice 11 está en la casilla 9 (titular): es válido aunque 11 > 10.
        orden = list(range(32))
        orden[9], orden[11] = 11, 9
        mem = self.memoria(orden=orden)
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "capitan",
                                        "bloque": "cabecera", "valor": 11}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 111), 11)

    def test_capitan_indice_de_banca_es_error(self):
        mem = self.memoria()  # orden identidad: el índice 13 está en la casilla 13
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "capitan",
                                        "bloque": "cabecera", "valor": 13}])
        self.assertFalse(resultado["ok"])
        mensaje = " ".join(resultado["errores"])
        self.assertIn("capitán", mensaje)
        self.assertIn("titular", mensaje)
        self.assertIn("casilla 13", mensaje)
        self.assertEqual(mem.escrituras, [])
        self.assertEqual(self.byte(mem, 111), 0)

    def test_capitan_preexistente_en_banca_no_bloquea_el_lote(self):
        # El caso real: el juego dejó el capitán (11, Bade) en una casilla de
        # titular tras el cambio; un lote que no lo toca no se rechaza.
        mem = self.memoria(partido=1, pausa=1)
        self.poner_cabecera(mem, "capitan", 11)  # identidad: 11 está en la banca
        self.poner_cabecera(mem, "penal", 11)
        resultado = self.aplicar(mem, [
            {"op": "intercambiar", "casillaA": 3, "casillaB": 9},
        ])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 111), 11)
        self.assertEqual(self.byte(mem, 110), 11)

    def test_capitan_preexistente_en_banca_no_bloquea_un_campo(self):
        mem = self.memoria()
        self.poner_cabecera(mem, "capitan", 12)
        self.poner_cabecera(mem, "penal", 13)
        resultado = self.aplicar(mem, [{"op": "campo",
                                        "nombre": "nivelAtaqueDefensa", "valor": 1}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 278), 1)
        self.assertEqual(self.byte(mem, 111), 12)

    def test_lanzador_indice_de_banca_es_error(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "penal",
                                        "bloque": "cabecera", "valor": 11}])
        self.assertFalse(resultado["ok"])
        mensaje = " ".join(resultado["errores"])
        self.assertIn("penales", mensaje)
        self.assertIn("titular", mensaje)
        self.assertEqual(mem.escrituras, [])

    def test_lanzador_indice_fuera_del_orden(self):
        # Datos corruptos: un orden de 32 bytes al que le falta el índice 5.
        orden = list(range(32))
        orden[5] = 31
        mem = self.memoria(orden=orden)
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "cornerDerecho",
                                        "bloque": "cabecera", "valor": 5}])
        self.assertFalse(resultado["ok"])
        self.assertIn("no está en el orden", " ".join(resultado["errores"]))
        self.assertEqual(mem.escrituras, [])

    def test_capitan_y_lanzadores_en_rango(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [
            {"op": "campo", "nombre": "capitan", "bloque": "cabecera", "valor": 0},
            {"op": "campo", "nombre": "cornerIzquierdo", "bloque": "cabecera", "valor": 10},
            {"op": "campo", "nombre": "penal", "bloque": "cabecera", "valor": 5},
        ])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 111), 0)
        self.assertEqual(self.byte(mem, 106), 10)
        self.assertEqual(self.byte(mem, 110), 5)

    # -- rival marcado

    def test_rival_marcado_255_es_ninguno(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "rivalMarcado",
                                        "casilla": 4, "valor": 255}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 265 + 4), 255)

    def test_rival_marcado_once_es_error(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "rivalMarcado",
                                        "casilla": 4, "valor": 11}])
        self.assertFalse(resultado["ok"])
        mensaje = " ".join(resultado["errores"])
        self.assertIn("rival marcado de la casilla 4", mensaje)
        self.assertIn("255", mensaje)
        self.assertEqual(mem.escrituras, [])
        self.assertEqual(self.byte(mem, 265 + 4), 255)

    def test_rival_marcado_sembrado_fuera_de_rango(self):
        mem = self.memoria()
        self.poner_campo(mem, "rivalMarcado", "principal", 200, casilla=7)
        revision = vivo.validar(mem, "local", [
            {"op": "intercambiar", "casillaA": 1, "casillaB": 2}])
        self.assertFalse(revision["ok"])
        self.assertIn("casilla 7", " ".join(revision["errores"]))
        self.assertEqual(revision["escrituras"], [])

    # -- intercambiar

    def test_intercambio_no_se_bloquea_con_libero_valido(self):
        mem = self.memoria(partido=1, pausa=1,
                           campos={"posicion": CT, "sistemaDefensivo": 1, "libero": 3})
        resultado = self.aplicar(mem, [{"op": "intercambiar", "casillaA": 3, "casillaB": 9}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        orden = orden_de(mem)
        self.assertEqual((orden[3], orden[9]), (9, 3))
        self.assertEqual(self.byte(mem, 277), 3)

    def test_intercambio_con_libero_fuera_de_ct(self):
        posiciones = list(CT)
        posiciones[8] = 9  # DI: no es CT ni LIB
        mem = self.memoria(campos={"posicion": posiciones, "sistemaDefensivo": 1, "libero": 8})
        resultado = self.aplicar(mem, [{"op": "intercambiar", "casillaA": 8, "casillaB": 9}])
        self.assertFalse(resultado["ok"])
        self.assertIn("con sistema Líbero", " ".join(resultado["errores"]))
        self.assertEqual(mem.escrituras, [])
        self.assertEqual(orden_de(mem), list(range(32)))

    def test_intercambio_y_libero_no_ct_en_el_mismo_lote(self):
        # El intercambio por sí solo no mueve la casilla del líbero (el juego
        # sigue la casilla): el lote se rechaza porque el líbero final queda en
        # una casilla que no es CT, y no se escribe nada, ni el intercambio.
        mem = self.memoria(campos={"posicion": CT})
        resultado = self.aplicar(mem, [
            {"op": "intercambiar", "casillaA": 3, "casillaB": 9},
            {"op": "campo", "nombre": "sistemaDefensivo", "valor": 1},
            {"op": "campo", "nombre": "libero", "valor": 9},
        ])
        self.assertFalse(resultado["ok"])
        self.assertIn("con sistema Líbero", " ".join(resultado["errores"]))
        self.assertEqual(mem.escrituras, [])
        self.assertEqual(orden_de(mem), list(range(32)))


# ------------------------------------------------------------------ todo o nada

class TestTodoONada(Base):
    def test_una_invalida_no_escribe_ninguna(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [
            {"op": "campo", "nombre": "nivelAtaqueDefensa", "valor": 1},
            {"op": "campo", "nombre": "nivelAtaqueDefensa", "valor": 99},
        ])
        self.assertFalse(resultado["ok"])
        self.assertEqual(mem.escrituras, [])
        self.assertEqual(self.byte(mem, 278), 2)

    def test_intercambio_y_campo_con_error(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [
            {"op": "intercambiar", "casillaA": 1, "casillaB": 2},
            {"op": "campo", "nombre": "nivelAtaqueDefensa", "valor": 99},
        ])
        self.assertFalse(resultado["ok"])
        self.assertEqual(mem.escrituras, [])
        self.assertEqual(orden_de(mem), list(range(32)))


# ------------------------------------------------------------------ cerrada

class TestAlineacionCerrada(Base):
    def test_no_escribe_sin_alineacion(self):
        mem = self.memoria(alineacion=0, partido=1, pausa=1, balon=0)
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "nivelAtaqueDefensa", "valor": 1}])
        self.assertFalse(resultado["ok"])
        self.assertTrue(resultado["cerrada"])
        self.assertIn("abre la pantalla de alineación", " ".join(resultado["errores"]))
        self.assertEqual(mem.escrituras, [])
        self.assertEqual(self.byte(mem, 278), 2)

    def test_forzar_escribe(self):
        mem = self.memoria(alineacion=0, partido=1, pausa=1)
        resultado = self.aplicar(mem, [{"op": "campo", "nombre": "nivelAtaqueDefensa", "valor": 1}],
                                 forzar=True)
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 278), 1)


# ------------------------------------------------------------------ vigilancia

class TestVigilar(Base):
    def test_una_vuelta(self):
        mem = self.memoria(alineacion=1, partido=0)
        carpeta = self.carpeta()
        pendientes = os.path.join(carpeta, "pendientes")
        os.makedirs(pendientes)
        escribir_json(os.path.join(pendientes, "a1.json"), {
            "id": "a1", "lado": "local",
            "ops": [{"op": "cambio", "entra": 13, "sale": 3}],
        })
        escribir_json(os.path.join(pendientes, "b2.json"), {
            "id": "b2", "lado": "local",
            "ops": [{"op": "campo", "nombre": "nivelAtaqueDefensa", "valor": 9}],
        })

        resumen = vivo.vigilar(mem, carpeta, vueltas=1, intervalo=0)

        self.assertEqual(len(resumen), 1)
        self.assertTrue(resumen[0]["alineacionAbierta"])
        self.assertEqual(len(resumen[0]["procesados"]), 2)
        self.assertEqual(os.listdir(pendientes), [])
        hechos = os.path.join(carpeta, "hechos")
        rechazados = os.path.join(carpeta, "rechazados")
        self.assertTrue(os.path.exists(os.path.join(hechos, "a1.pendiente.json")))
        resultado = leer_json(os.path.join(hechos, "a1.resultado.json"))
        self.assertTrue(resultado["ok"])
        self.assertEqual(len(resultado["escrito"]), 3)
        self.assertTrue(os.path.exists(os.path.join(rechazados, "b2.pendiente.json")))
        rechazo = leer_json(os.path.join(rechazados, "b2.resultado.json"))
        self.assertFalse(rechazo["ok"])
        self.assertTrue(rechazo["errores"])
        self.assertTrue(os.path.exists(os.path.join(carpeta, "estado.json")))
        with open(os.path.join(carpeta, "agente.log"), "r", encoding="utf-8") as f:
            log = f.read()
        self.assertIn("a1: aplicado", log)
        self.assertIn("b2: rechazado", log)

    def test_json_invalido(self):
        mem = self.memoria(alineacion=1, partido=0)
        carpeta = self.carpeta()
        pendientes = os.path.join(carpeta, "pendientes")
        os.makedirs(pendientes)
        with open(os.path.join(pendientes, "roto.json"), "w", encoding="utf-8") as f:
            f.write("{no es json")
        vivo.vigilar(mem, carpeta, vueltas=1, intervalo=0)
        self.assertTrue(os.path.exists(os.path.join(carpeta, "rechazados", "roto.resultado.json")))

    def test_cerrada_no_toca_pendientes(self):
        mem = self.memoria(alineacion=0, partido=1, balon=1)
        carpeta = self.carpeta()
        pendientes = os.path.join(carpeta, "pendientes")
        os.makedirs(pendientes)
        escribir_json(os.path.join(pendientes, "a1.json"), {
            "id": "a1", "lado": "local",
            "ops": [{"op": "cambio", "entra": 13, "sale": 3}],
        })
        resumen = vivo.vigilar(mem, carpeta, vueltas=1, intervalo=0)
        self.assertFalse(resumen[0]["alineacionAbierta"])
        self.assertEqual(os.listdir(pendientes), ["a1.json"])
        self.assertEqual(mem.escrituras, [])

    def test_guarda_y_reinicia_salidos(self):
        mem = self.memoria(alineacion=1, partido=1, pausa=1, restantes=3)
        carpeta = self.carpeta()
        pendientes = os.path.join(carpeta, "pendientes")
        os.makedirs(pendientes)
        escribir_json(os.path.join(pendientes, "c1.json"), {
            "id": "c1", "lado": "local",
            "ops": [{"op": "cambio", "entra": 13, "sale": 5}],
        })
        vivo.vigilar(mem, carpeta, vueltas=1, intervalo=0)
        ruta_estado = os.path.join(carpeta, "estado.json")
        datos = leer_json(ruta_estado)
        self.assertTrue(datos["partidoEmpezado"])
        self.assertEqual(datos["salieron"]["local"], [5])

        # El partido termina: al volver partidoEmpezado a 0 se reinicia la lista.
        mem.sembrar(vivo.IND_ALINEACION, b"\x00")
        mem.sembrar(vivo.IND_PARTIDO, b"\x00")
        mem.sembrar(vivo.IND_PAUSA, b"\x00")
        vivo.vigilar(mem, carpeta, vueltas=1, intervalo=0)
        datos = leer_json(ruta_estado)
        self.assertFalse(datos["partidoEmpezado"])
        self.assertEqual(datos["salieron"]["local"], [])


# ------------------------------------------------ condición y resistencia

class TestCondicionYResistencia(Base):
    def sembrar_tabla(self, mem, valores):
        """Siembra entradas de la tabla de resistencia (id, actual)."""
        mem.sembrar(vivo.TABLA_RESISTENCIA,
                    bytes(vivo.PASO_RESISTENCIA * vivo.ENTRADAS_RESISTENCIA))
        for k, (ident, actual) in enumerate(valores):
            base = vivo.TABLA_RESISTENCIA + k * vivo.PASO_RESISTENCIA
            mem.sembrar(base + vivo.OFF_RESISTENCIA_ID, struct.pack("<H", ident))
            mem.sembrar(base + vivo.OFF_RESISTENCIA_ACTUAL, bytes([actual]))

    def test_estado_jugador_por_indice_de_plantel(self):
        mem = self.memoria()
        rec = vivo.REC["local"]
        principal = bytes([0, 1, 2, 3, 4] * 6 + [0, 1])
        copia = bytes([4] * 32)
        mem.sembrar(rec + vivo.REL_ESTADO_JUGADOR, principal)
        mem.sembrar(rec + vivo.REL_ESTADO_COPIA, copia)
        equipo = vivo.leer_equipo(mem, "local")
        self.assertEqual(equipo["estadoJugador"], list(principal))
        self.assertEqual(vivo.leer_estado_jugador(mem, "local"), list(principal))

    def test_estado_jugador_es_por_lado(self):
        mem = self.memoria()
        mem.sembrar(vivo.REC["local"] + vivo.REL_ESTADO_JUGADOR, bytes([2] * 32))
        mem.sembrar(vivo.REC["visitante"] + vivo.REL_ESTADO_JUGADOR, bytes([3] * 32))
        self.assertEqual(vivo.leer_estado_jugador(mem, "local"), [2] * 32)
        self.assertEqual(vivo.leer_estado_jugador(mem, "visitante"), [3] * 32)

    def test_resistencia_por_id_y_maximo_guardado(self):
        mem = self.memoria()
        ids = [1000 + i for i in range(32)]
        self.sembrar_tabla(mem, [(1000, 80), (1001, 0), (1005, 55)])
        maximos = {}
        resistencia = vivo.leer_resistencia(mem, ids, maximos, True)
        self.assertEqual(resistencia[0], {"actual": 80, "maxSaque": 80})
        self.assertIsNone(resistencia[1])          # actual 0: antes del saque
        self.assertIsNone(resistencia[2])          # no está en la tabla
        self.assertEqual(resistencia[5], {"actual": 55, "maxSaque": 55})
        self.assertEqual(maximos, {1000: 80, 1005: 55})

        # Un valor menor no baja el máximo; uno mayor lo sube.
        self.sembrar_tabla(mem, [(1000, 70), (1005, 60)])
        resistencia = vivo.leer_resistencia(mem, ids, maximos, True)
        self.assertEqual(resistencia[0], {"actual": 70, "maxSaque": 80})
        self.assertEqual(resistencia[5], {"actual": 60, "maxSaque": 60})
        self.assertEqual(maximos, {1000: 80, 1005: 60})

    def test_resistencia_sin_partido_no_actualiza_maximos(self):
        mem = self.memoria()
        ids = [1000 + i for i in range(32)]
        self.sembrar_tabla(mem, [(1000, 90)])
        maximos = {}
        resistencia = vivo.leer_resistencia(mem, ids, maximos, False)
        self.assertEqual(resistencia[0], {"actual": 90, "maxSaque": None})
        self.assertEqual(maximos, {})

    def test_resistencia_sin_estado_guardado(self):
        mem = self.memoria()
        ids = [1000 + i for i in range(32)]
        self.sembrar_tabla(mem, [(1000, 90)])
        resistencia = vivo.leer_resistencia(mem, ids)
        self.assertEqual(resistencia[0], {"actual": 90, "maxSaque": None})

    def test_leer_equipo_incluye_condicion_y_resistencia(self):
        mem = self.memoria(alineacion=1, partido=1, pausa=1)
        mem.sembrar(vivo.REC["local"] + vivo.REL_ESTADO_JUGADOR, bytes([2] * 32))
        self.sembrar_tabla(mem, [(1000, 90)])
        maximos = {}
        equipo = vivo.leer_equipo(mem, "local", maximos)
        self.assertEqual(equipo["estadoJugador"], [2] * 32)
        self.assertEqual(len(equipo["resistencia"]), 32)
        self.assertEqual(equipo["resistencia"][0], {"actual": 90, "maxSaque": 90})
        self.assertIsNone(equipo["resistencia"][1])
        self.assertEqual(maximos, {1000: 90})


# ------------------------------------------------------------------ mover

class TestMover(Base):
    def test_mover_escribe_profundidad_lateral_y_codigo(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [
            {"op": "mover", "casilla": 5, "prof": 12, "lat": 50, "pos": "DC"}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 112 + 5), 12)
        self.assertEqual(self.byte(mem, 123 + (5 - 1)), 50)
        self.assertEqual(self.byte(mem, 133 + 5), 36)   # primer código de DC
        self.assertTrue(all(item["coincide"] for item in resultado["escrito"]))

    def test_mover_conserva_el_codigo_si_ya_es_de_la_misma_sigla(self):
        mem = self.memoria()
        rec = vivo.REC["local"]
        mem.sembrar(rec + 133 + 4, bytes([38]))         # DC alternativo
        resultado = self.aplicar(mem, [
            {"op": "mover", "casilla": 4, "prof": 20, "lat": 70, "pos": "dc"}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        self.assertEqual(self.byte(mem, 133 + 4), 38)

    def test_mover_arquero_rechazado(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [
            {"op": "mover", "casilla": 0, "prof": 12, "lat": 50, "pos": "CT"}])
        self.assertFalse(resultado["ok"])
        self.assertIn("casilla", " ".join(resultado["errores"]))
        self.assertEqual(mem.escrituras, [])

    def test_mover_sigla_invalida(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [
            {"op": "mover", "casilla": 4, "prof": 12, "lat": 50, "pos": "XX"}])
        self.assertFalse(resultado["ok"])
        self.assertIn("sigla de posición desconocida", " ".join(resultado["errores"]))
        self.assertEqual(mem.escrituras, [])

    def test_mover_rangos(self):
        for op in ({"op": "mover", "casilla": 4, "prof": 1, "lat": 50, "pos": "CT"},
                   {"op": "mover", "casilla": 4, "prof": 12, "lat": 5, "pos": "CT"}):
            mem = self.memoria()
            resultado = self.aplicar(mem, [op])
            self.assertFalse(resultado["ok"], op)
            self.assertEqual(mem.escrituras, [])

    def test_mover_es_todo_o_nada(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [
            {"op": "mover", "casilla": 4, "prof": 12, "lat": 50, "pos": "CT"},
            {"op": "mover", "casilla": 0, "prof": 12, "lat": 50, "pos": "PT"},
        ])
        self.assertFalse(resultado["ok"])
        self.assertEqual(mem.escrituras, [])


# ------------------------------------------------------------------ variante

class TestVariante(Base):
    def variante(self, esquema, nombre):
        for entrada in vivo.variantes()["esquemas"]:
            if entrada["nombre"] == esquema:
                for variante in entrada["variantes"]:
                    if variante["nombre"] == nombre:
                        return variante
        self.fail("no está la variante %s %s" % (esquema, nombre))

    def test_variante_escribe_formacion_flechas_y_actitud(self):
        mem = self.memoria(campos={"flechasAtaque": [[1] * 8 for _ in range(11)]})
        rec = vivo.REC["local"]
        variante = self.variante("4-5-1", "A-1")
        resultado = self.aplicar(mem, [
            {"op": "variante", "esquema": "4-5-1", "variante": "A-1"}])
        self.assertTrue(resultado["ok"], resultado["errores"])
        regla = vivo.variantes()["reglaActitud"]
        for casilla, puesto in enumerate(variante["puestos"]):
            self.assertEqual(self.byte(mem, 112 + casilla), puesto["prof"])
            self.assertEqual(self.byte(mem, 133 + casilla), puesto["codigo"])
            if casilla >= 1:
                self.assertEqual(self.byte(mem, 123 + (casilla - 1)), puesto["lat"])
            self.assertEqual(self.byte(mem, 243 + casilla), regla[puesto["sigla"]])
        # Flechas: se borran las de los 10 de campo y se deja el arquero.
        self.assertEqual(mem.leer(rec + 147, 8), b"\x01" * 8)
        for casilla in range(1, 11):
            self.assertEqual(mem.leer(rec + 147 + casilla * 8, 8), b"\x00" * 8)
            self.assertEqual(mem.leer(rec + vivo.REL_FLECHAS_PANTALLA + casilla * 8, 8),
                             b"\x00" * 8)
            self.assertEqual(mem.leer(rec + vivo.REL_FLECHAS_SELECCION + casilla * 8, 8),
                             b"\x00" * 8)

    def test_variante_desconocida(self):
        mem = self.memoria()
        for op in ({"op": "variante", "esquema": "9-9-9", "variante": "A-1"},
                   {"op": "variante", "esquema": "4-5-1", "variante": "Z-9"}):
            resultado = self.aplicar(mem, [op])
            self.assertFalse(resultado["ok"], op)
            self.assertTrue(resultado["errores"])
        self.assertEqual(mem.escrituras, [])

    def test_variante_es_todo_o_nada(self):
        mem = self.memoria()
        resultado = self.aplicar(mem, [
            {"op": "mover", "casilla": 3, "prof": 12, "lat": 50, "pos": "CT"},
            {"op": "variante", "esquema": "4-5-1", "variante": "Z-9"},
        ])
        self.assertFalse(resultado["ok"])
        self.assertEqual(mem.escrituras, [])


if __name__ == "__main__":
    unittest.main()
