#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Núcleo del agente en vivo de PES5: estado, lectura y escritura segura.

Este módulo es la parte local del agente (sin Firestore): sabe en qué momento
está el juego, lee el registro de alineación de los dos equipos y aplica
operaciones sobre él cuando el juego está en una pantalla donde la escritura se
respeta.

Fuentes de memoria
------------------
- ``ProcesoPES5``: lee (y escribe, solo cuando hace falta) la memoria del
  proceso ``PES5.exe``. Abre el proceso en modo lectura al construirse; el
  permiso de escritura (``PROCESS_VM_WRITE | PROCESS_VM_OPERATION``) se pide en
  la primera llamada a ``escribir``.
- ``MemoriaFalsa``: memoria en un diccionario, para pruebas y para leer una
  captura ``.bin`` con ``--desde-bin``. Las direcciones que no se sembraron
  valen 0.

Reglas que respeta el módulo
----------------------------
- Solo se escribe con la pantalla de alineación abierta (``0x39564DA == 1``).
  Con el menú de pausa del partido, sin esa pantalla, el juego reconstruye el
  registro y descarta lo escrito.
- Antes del partido un ``cambio`` es un intercambio directo en el orden;
  con el partido empezado va a la cola de sustituciones (``rec-20``, ``rec-19``,
  ``rec-6`` y sus espejos).
- Toda la lista de operaciones se valida antes de escribir la primera (todo o
  nada) y después de escribir se relee y se compara.
- Además de las reglas por operación, un lote tiene que dejar un estado
  **coherente**: con sistema Líbero el líbero tiene que ser un CT titular
  (casillas 1–10) y el rival marcado 0–10 o 255. El capitán y los lanzadores
  (`rec+106..111`) guardan el **índice de plantel** del titular: solo se
  validan cuando el lote los escribe, y ese índice tiene que estar en una
  casilla 0–10 del orden final. Si el estado final del lote no cumple, no se
  escribe ningún byte.
- La cabecera del registro (`estrategiaBoton`, `modoEstrategia`, capitán y
  lanzadores) también se escribe con ``campo``: ``bloque: "cabecera"`` o, si la
  operación no trae ``bloque`` y el nombre solo existe en la cabecera, ese
  bloque. ``desconocido104`` no se escribe.
- ``mover`` escribe profundidad, lateral y código de posición de una casilla
  1–10 (el arquero no se mueve) y conserva el código actual si ya es de la
  misma sigla.
- ``variante`` aplica una variante del catálogo ``pes5-variantes.json``: las 11
  casillas (profundidad, lateral y código), borra las flechas de ataque de los
  10 jugadores de campo y pone la actitud defensiva según ``reglaActitud``.
- La lectura incluye ``estadoJugador`` (flecha de condición por índice de
  plantel, en ``rec-1678``) y ``resistencia`` (tabla global en ``0x3BD3E00``,
  asociada por id). El máximo de resistencia no está en memoria: lo guarda el
  llamador con ``maximos`` y lo reinicia cuando el partido termina.

Nunca toca el option file ni los saves: solo la memoria del proceso.
"""

import ctypes
import ctypes.wintypes
import datetime
import json
import os
import struct
import sys
import time

PROCESO_POR_DEFECTO = "PES5.exe"

# ------------------------------------------------------------------ constantes

# Los dos registros de formación de la partida en memoria (por lado, no por club).
REC = {"local": 0x3956F5E, "visitante": 0x395BBB2}

# Dentro del registro (relativo a rec).
REL_ORDEN = 4          # 32 bytes: casilla -> índice de plantel
REL_IDS = 36           # 32 u16 LE: ids del plantel
LARGO_REGISTRO = 628
# Las tres copias del orden: A = rec+4, A+0x38B y A+0x1004.
COPIAS_ORDEN = (REL_ORDEN, REL_ORDEN + 0x38B, REL_ORDEN + 0x1004)

# Indicadores de estado (direcciones absolutas, 1 byte cada uno).
IND_ALINEACION = 0x39564DA   # 1 = pantalla de alineación abierta
IND_PARTIDO = 0xD8CCEA       # 1 = desde el saque inicial
IND_PAUSA = 0xD8CD16         # 1 = menú de pausa / alineación dentro de la pausa
IND_BALON = 0x100541C        # 1 = balón en juego

# Estado (flecha de condición) por índice de plantel: 32 bytes relativos a rec.
# 0 roja, 1 naranja, 2 verde, 3 azul, 4 gris. La copia de rec+1302 la mantiene
# el juego; para leer se usa la principal (rec-1678).
REL_ESTADO_JUGADOR = -1678
REL_ESTADO_COPIA = 1302
LARGO_ESTADO = 32
NOMBRES_ESTADO = {0: "roja", 1: "naranja", 2: "verde", 3: "azul", 4: "gris"}

# Resistencia en partido: una tabla global con una entrada por jugador.
# Cada entrada mide 836 bytes (0x344); en +0 va el id u16 del jugador y en +146
# la resistencia actual (0 antes del saque). El máximo no está en memoria: lo
# guarda el llamador (el puente) la primera vez que ve un valor > 0.
TABLA_RESISTENCIA = 0x3BD3E00
PASO_RESISTENCIA = 836
ENTRADAS_RESISTENCIA = 46
OFF_RESISTENCIA_ID = 0
OFF_RESISTENCIA_ACTUAL = 146

# Cola de sustituciones (relativa a rec).
COLA_ENTRA = -20
COLA_SALE = -19
COLA_CONTADOR = -6
COLA_ESPEJO_ENTRA = 1826
COLA_ESPEJO_SALE = 1827
COLA_ESPEJO_CONTADOR = 1840
COLA_RESTANTES = -42         # «Supl. Res.»: 255 antes de inicializarse
COLA_MAX = 7                 # k = 0..6

RESTANTES_SIN_INICIALIZAR = 255

# Gráficos de la pantalla de alineación.
TITULARES = range(0, 11)     # casillas 0..10
BANCA = range(11, 23)        # casillas 11..22
RESERVAS = range(23, 32)     # casillas 23..31

CAMPOS_PROHIBIDOS = ("orden", "idsPlantel")
BLOQUES_ESCRIBIBLES = ("principal", "A", "B")

# Coherencia del estado final del lote (ver ``_comprobar_coherencia``).
SISTEMA_LIBERO = 1
CASILLAS_LIBERO = range(1, 11)          # 1..10: la 0 es el portero
CODIGOS_CT_O_LIBERO = (1, 2, 3, 4, 5, 6, 7)
CASILLAS_CABECERA = range(0, 11)        # 0..10: casillas de titular
INDICES_PLANTEL = range(0, 32)          # 0..31: índice de plantel
RIVAL_NINGUNO = 255
# Capitán y lanzadores: índice de plantel (0–31), no casilla (VIVO3).
CAMPOS_CABECERA_INDICE = (
    ("capitan", "el capitán"),
    ("cornerIzquierdo", "el lanzador del córner izquierdo"),
    ("cornerDerecho", "el lanzador del córner derecho"),
    ("tiroLibreLargo", "el lanzador del tiro libre largo"),
    ("tiroLibreCorto", "el lanzador del tiro libre corto"),
    ("penal", "el lanzador de penales"),
)
# Resto de la cabecera que se escribe con `campo` desde VIVO4 (`estrategiaBoton`
# y `modoEstrategia`), salvo `desconocido104`: no se sabe qué es.
CAMPOS_CABECERA_PROHIBIDOS = ("desconocido104",)
# Bloques que acepta la operación `campo` (los de coherencia, más la cabecera).
BLOQUES_CAMPO = BLOQUES_ESCRIBIBLES + ("cabecera",)
NOMBRE_BLOQUE = {"principal": "bloque principal", "A": "Alineación A", "B": "Alineación B",
                 "cabecera": "la cabecera"}

# ------------------------------------------------------------------ errores


class ErrorOperacion(Exception):
    """Una operación no se puede validar o aplicar."""


class ErrorMemoria(Exception):
    """La memoria no se puede leer en la dirección pedida."""


# ------------------------------------------------------------------ procesos

PROCESS_VM_READ = 0x0010
PROCESS_VM_WRITE = 0x0020
PROCESS_VM_OPERATION = 0x0008
PROCESS_QUERY_INFORMATION = 0x0400

TH32CS_SNAPPROCESS = 0x00000002


class _ProcesoEntrada(ctypes.Structure):
    _fields_ = [
        ("dwSize", ctypes.wintypes.DWORD),
        ("cntUsage", ctypes.wintypes.DWORD),
        ("th32ProcessID", ctypes.wintypes.DWORD),
        ("th32DefaultHeapID", ctypes.c_void_p),
        ("th32ModuleID", ctypes.wintypes.DWORD),
        ("cntThreads", ctypes.wintypes.DWORD),
        ("th32ParentProcessID", ctypes.wintypes.DWORD),
        ("pcPriClassBase", ctypes.c_long),
        ("dwFlags", ctypes.wintypes.DWORD),
        ("szExeFile", ctypes.c_char * 260),
    ]


class ProcesoPES5(object):
    """Lectura y escritura sobre la memoria de ``PES5.exe``.

    Al construirse solo pide permiso de lectura. El permiso de escritura se pide
    cuando se llama a ``escribir`` por primera vez, así que ``estado`` y
    ``leer_equipo`` no necesitan ningún permiso de escritura.
    """

    def __init__(self, nombre=PROCESO_POR_DEFECTO):
        self.nombre = nombre
        if os.name != "nt":
            raise RuntimeError("solo funciona en Windows: PES5.exe no está disponible en %s" % os.name)
        self.api = ctypes.WinDLL("kernel32", use_last_error=True)
        self.pid = self._buscar_pid(nombre)
        if self.pid is None:
            raise LookupError("no encuentro el proceso %s en ejecución: abre PES5 con una partida cargada" % nombre)
        self.handle = self.api.OpenProcess(PROCESS_VM_READ | PROCESS_QUERY_INFORMATION, False, self.pid)
        if not self.handle:
            raise OSError("OpenProcess de lectura falló para %s (pid %s, código %s)" % (
                nombre, self.pid, ctypes.get_last_error()))
        self._h_escritura = None

    # -- búsqueda del proceso

    def _buscar_pid(self, nombre_exe):
        INVALID = ctypes.c_void_p(-1).value
        snap = self.api.CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
        if not snap or snap == INVALID:
            return None
        entrada = _ProcesoEntrada()
        entrada.dwSize = ctypes.sizeof(_ProcesoEntrada)
        try:
            ok = self.api.Process32First(snap, ctypes.byref(entrada))
            while ok:
                exe = entrada.szExeFile.decode("mbcs", "replace")
                if exe.lower() == nombre_exe.lower():
                    return int(entrada.th32ProcessID)
                ok = self.api.Process32Next(snap, ctypes.byref(entrada))
        finally:
            self.api.CloseHandle(snap)
        return None

    # -- interfaz de memoria

    def leer(self, direccion, tamano):
        buf = ctypes.create_string_buffer(tamano)
        leidos = ctypes.c_size_t(0)
        ok = self.api.ReadProcessMemory(self.handle, ctypes.c_void_p(direccion), buf,
                                        ctypes.c_size_t(tamano), ctypes.byref(leidos))
        if not ok or leidos.value != tamano:
            raise ErrorMemoria("ReadProcessMemory falló en 0x%X (leídos %d de %d)" % (
                direccion, leidos.value, tamano))
        return buf.raw

    def escribir(self, direccion, datos):
        datos = bytes(datos)
        handle = self._handle_escritura()
        buf = ctypes.create_string_buffer(datos, len(datos))
        escritos = ctypes.c_size_t(0)
        ok = self.api.WriteProcessMemory(handle, ctypes.c_void_p(direccion), buf,
                                         ctypes.c_size_t(len(datos)), ctypes.byref(escritos))
        if not ok or escritos.value != len(datos):
            raise ErrorMemoria("WriteProcessMemory falló en 0x%X (escritos %d de %d)" % (
                direccion, escritos.value, len(datos)))

    def _handle_escritura(self):
        if self._h_escritura is None:
            handle = self.api.OpenProcess(
                PROCESS_VM_READ | PROCESS_VM_WRITE | PROCESS_VM_OPERATION, False, self.pid)
            if not handle:
                raise OSError("OpenProcess de escritura falló para %s (pid %s, código %s). "
                              "Prueba a ejecutar el agente como administrador" % (
                                  self.nombre, self.pid, ctypes.get_last_error()))
            self._h_escritura = handle
        return self._h_escritura

    def cerrar(self):
        for nombre in ("handle", "_h_escritura"):
            handle = getattr(self, nombre, None)
            if handle:
                try:
                    self.api.CloseHandle(handle)
                finally:
                    setattr(self, nombre, None)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.cerrar()
        return False


class MemoriaFalsa(object):
    """Memoria en un diccionario para pruebas y para leer capturas ``.bin``.

    Guarda solo los bytes sembrados o escritos. Si se pide una dirección que no
    se sembró devuelve ``defecto`` (0), que es lo que hace falta para leer una
    captura parcial (los indicadores de estado están fuera del volcado).
    """

    def __init__(self, defecto=0):
        self.defecto = defecto
        self._datos = {}
        self.escrituras = []

    @classmethod
    def desde_bin(cls, ruta, base):
        with open(ruta, "rb") as f:
            datos = f.read()
        mem = cls()
        mem.sembrar(base, datos)
        mem.origen = {"modo": "bin", "archivo": os.path.abspath(ruta), "base": hex(base)}
        return mem

    def sembrar(self, direccion, datos):
        datos = bytes(datos)
        for i, valor in enumerate(datos):
            self._datos[direccion + i] = valor

    def leer(self, direccion, tamano):
        if tamano < 0:
            raise ValueError("tamaño negativo")
        return bytes(self._datos.get(direccion + i, self.defecto) for i in range(tamano))

    def escribir(self, direccion, datos):
        datos = bytes(datos)
        for i, valor in enumerate(datos):
            self._datos[direccion + i] = valor
        self.escrituras.append((direccion, datos))


# ------------------------------------------------------------------ utilidades


def u16(buf, offset):
    return struct.unpack_from("<H", buf, offset)[0]


def _byte(mem, direccion):
    return mem.leer(direccion, 1)[0]


def rec_de(lado):
    clave = str(lado).strip().lower()
    if clave not in REC:
        raise ErrorOperacion("lado desconocido: %r (usa local o visitante)" % (lado,))
    return REC[clave]


_MAPA = None


def mapa():
    """Carga (una vez) ``pes5-live-map.json``, la fuente de los offsets."""
    global _MAPA
    if _MAPA is None:
        ruta = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pes5-live-map.json")
        with open(ruta, "r", encoding="utf-8") as f:
            _MAPA = json.load(f)
    return _MAPA


def campos_del_bloque(bloque):
    return [c for c in mapa()["campos"] if c.get("bloque") == bloque]


def campo_de(nombre, bloque="principal"):
    for campo in mapa()["campos"]:
        if campo["nombre"] == nombre and campo.get("bloque") == bloque:
            return campo
    return None


# ------------------------------------------------------------------ estado


def estado(mem):
    """Devuelve en qué momento está el juego.

    ``momento``:
      - ``previa``: pantalla de alineación abierta y partido sin empezar.
      - ``pausa``: alineación abierta con el partido empezado y en pausa.
      - ``entretiempo``: alineación abierta con el partido empezado y sin pausa.
      - ``jugando``: partido empezado, balón en juego y sin pantalla de alineación.
      - ``menu``: cualquier otro caso (menú principal, menú de pausa sin la
        pantalla de alineación, entretiempo con la pantalla cerrada...).
    """
    alineacion = _byte(mem, IND_ALINEACION)
    partido = _byte(mem, IND_PARTIDO)
    pausa = _byte(mem, IND_PAUSA)
    balon = _byte(mem, IND_BALON)

    abierta = alineacion != 0
    empezado = partido != 0
    en_pausa = pausa != 0

    if abierta and not empezado:
        momento = "previa"
    elif abierta and empezado:
        momento = "pausa" if en_pausa else "entretiempo"
    elif empezado and not en_pausa and balon:
        momento = "jugando"
    else:
        momento = "menu"

    return {
        "alineacionAbierta": alineacion,
        "partidoEmpezado": partido,
        "pausa": pausa,
        "balonEnJuego": balon,
        "momento": momento,
        "puedeEscribir": abierta,
    }


# ------------------------------------------------------------------ lectura


def copias_orden(mem, rec):
    """Las tres copias del orden de 32 bytes (A, A+0x38B y A+0x1004)."""
    return [mem.leer(rec + rel, 32) for rel in COPIAS_ORDEN]


def leer_estado_jugador(mem, lado):
    """Flecha de condición de los 32 índices de plantel de un lado.

    Los valores son los del juego: 0 roja, 1 naranja, 2 verde, 3 azul y
    4 gris. La tabla principal está en ``rec-1678``; el juego mantiene una
    copia en ``rec+1302`` que no se usa para leer.
    """
    rec = rec_de(lado)
    return list(mem.leer(rec + REL_ESTADO_JUGADOR, LARGO_ESTADO))


def _tabla_resistencia(mem):
    """``{id: resistencia actual}`` de la tabla global del partido.

    Recorre hasta ``ENTRADAS_RESISTENCIA`` entradas y salta las que no tienen
    id. Si una entrada no se puede leer (la tabla puede no estar asignada
    antes del partido) se ignora: el jugador simplemente no aparece.
    """
    valores = {}
    for k in range(ENTRADAS_RESISTENCIA):
        base = TABLA_RESISTENCIA + k * PASO_RESISTENCIA
        try:
            ident = u16(mem.leer(base + OFF_RESISTENCIA_ID, 2), 0)
            if ident == 0:
                continue
            actual = mem.leer(base + OFF_RESISTENCIA_ACTUAL, 1)[0]
        except ErrorMemoria:
            continue
        valores[ident] = actual
    return valores


def leer_resistencia(mem, ids, maximos=None, partidoEmpezado=True):
    """Resistencia de los 32 índices de plantel, asociada por id de jugador.

    ``ids`` es la lista de 32 ids del plantel (``leer_equipo()["ids"]``).
    Devuelve una lista de 32 elementos: ``None`` antes del saque o si el
    jugador no está en la tabla, y ``{actual, maxSaque}`` en el resto.

    ``maximos`` es el estado guardado por el llamador (``{id: máximo}``). Si se
    pasa, se actualiza la primera vez que aparece un ``actual`` mayor durante
    el partido; el llamador tiene que vaciarlo cuando ``partidoEmpezado``
    vuelve a 0. Sin ``maximos`` el máximo sale ``None``.
    """
    tabla = _tabla_resistencia(mem)
    salida = []
    for ident in ids:
        actual = tabla.get(ident)
        if actual is None or actual == 0:
            salida.append(None)
            continue
        if maximos is not None and partidoEmpezado:
            if actual > maximos.get(ident, 0):
                maximos[ident] = actual
        salida.append({"actual": actual,
                       "maxSaque": maximos.get(ident) if maximos is not None else None})
    return salida


def leer_equipo(mem, lado, maximos=None):
    """Lee el registro de un lado y lo devuelve decodificado.

    Incluye el orden, los ids, los tres grupos de casillas (titulares, banca y
    reservas), la cabecera (capitán y lanzadores con índice, id y casilla),
    todos los campos del bloque principal del mapa, la cola de cambios, los
    cambios restantes, la flecha de condición por índice de plantel
    (``estadoJugador``) y la resistencia (``resistencia``, ver
    ``leer_resistencia``). Con ``maximos`` se actualiza ese diccionario.
    """
    rec = rec_de(lado)
    buf = mem.leer(rec, LARGO_REGISTRO)

    orden = list(buf[REL_ORDEN:REL_ORDEN + 32])
    ids = [u16(buf, REL_IDS + 2 * k) for k in range(32)]

    def jugador(casilla):
        indice = orden[casilla]
        return {"casilla": casilla, "indice": indice,
                "id": ids[indice] if 0 <= indice < len(ids) else None}

    def jugador_por_indice(indice):
        """Capitán y lanzadores: índice de plantel, con su id y su casilla actual."""
        return {"indice": indice,
                "id": ids[indice] if 0 <= indice < len(ids) else None,
                "casilla": orden.index(indice) if indice in orden else None}

    def grupo(casillas):
        return [jugador(c) for c in casillas]

    # Campos del bloque principal, con los offsets y los tamaños del JSON.
    campos = {}
    for campo in campos_del_bloque("principal"):
        nombre = campo["nombre"]
        offset = campo["offset"]
        if campo.get("porCasilla"):
            inicial = campo.get("casillaInicial", 0)
            stride = campo.get("stride", 1)
            valores = {}
            if stride > 1:
                for j in range(campo["len"] // stride):
                    inicio = offset + j * stride
                    valores[inicial + j] = list(buf[inicio:inicio + stride])
            else:
                for j in range(campo["len"]):
                    valores[inicial + j] = buf[offset + j]
            campos[nombre] = valores
        elif campo["len"] == 1:
            campos[nombre] = buf[offset]
        else:
            campos[nombre] = list(buf[offset:offset + campo["len"]])

    declarados = mem.leer(rec + COLA_CONTADOR, 1)[0]
    parejas = min(declarados, COLA_MAX)
    cola = []
    for k in range(parejas):
        cola.append({
            "entra": mem.leer(rec + COLA_ENTRA + 2 * k, 1)[0],
            "sale": mem.leer(rec + COLA_SALE + 2 * k, 1)[0],
        })

    restantes_byte = mem.leer(rec + COLA_RESTANTES, 1)[0]
    cambios_restantes = None if restantes_byte == RESTANTES_SIN_INICIALIZAR else restantes_byte

    # Capitán y lanzadores: índice de plantel (0–31) y jugador al que apunta.
    cabecera = {}
    for nombre, _etiqueta in CAMPOS_CABECERA_INDICE:
        campo = campo_de(nombre, "cabecera")
        if campo is None:  # pragma: no cover - el mapa siempre los trae
            continue
        cabecera[nombre] = jugador_por_indice(buf[campo["offset"]])

    # Resto de la cabecera que usa el puente: botones de estrategia y modo.
    campo_botones = campo_de("estrategiaBoton", "cabecera")
    if campo_botones is not None:
        cabecera["estrategiaBoton"] = list(
            buf[campo_botones["offset"]:campo_botones["offset"] + campo_botones["len"]])
    campo_modo = campo_de("modoEstrategia", "cabecera")
    if campo_modo is not None:
        cabecera["modoEstrategia"] = buf[campo_modo["offset"]]

    return {
        "lado": str(lado).strip().lower(),
        "rec": hex(rec),
        "orden": orden,
        "ids": ids,
        "titulares": grupo(TITULARES),
        "banca": grupo(BANCA),
        "reservas": grupo(RESERVAS),
        "cabecera": cabecera,
        "campos": campos,
        "cola": cola,
        "colaDeclarada": declarados,
        "cambiosRestantes": cambios_restantes,
        "cambiosRestantesByte": restantes_byte,
        "estadoJugador": list(mem.leer(rec + REL_ESTADO_JUGADOR, LARGO_ESTADO)),
        "resistencia": leer_resistencia(mem, ids, maximos,
                                        bool(estado(mem)["partidoEmpezado"])),
    }


# ------------------------------------------------------------------ validación

class _Vista(object):
    """Copia en escritura sobre la memoria real, para validar todo sin escribir.

    Las lecturas ven primero lo que las operaciones anteriores de la misma
    lista dejaron "escrito"; así una segunda sustitución se valida contra la
    cola que dejó la primera. Las escrituras solo se acumulan.
    """

    def __init__(self, mem):
        self.mem = mem
        self.overlay = {}
        self.escrituras = []

    def leer(self, direccion, tamano):
        base = self.mem.leer(direccion, tamano)
        if not self.overlay:
            return base
        cambios = [(d, v) for d, v in self.overlay.items() if direccion <= d < direccion + tamano]
        if not cambios:
            return base
        datos = bytearray(base)
        for d, v in cambios:
            datos[d - direccion] = v
        return bytes(datos)

    def escribir(self, direccion, datos):
        datos = bytes(datos)
        for i, valor in enumerate(datos):
            self.overlay[direccion + i] = valor
        self.escrituras.append((direccion, datos))


def _entero(op, clave, minimo, maximo):
    if not isinstance(op, dict) or clave not in op:
        raise ErrorOperacion("falta el campo «%s»" % clave)
    valor = op[clave]
    if isinstance(valor, bool) or not isinstance(valor, int):
        raise ErrorOperacion("«%s» tiene que ser un entero" % clave)
    if not minimo <= valor <= maximo:
        raise ErrorOperacion("«%s» fuera de rango (%d..%d): %d" % (clave, minimo, maximo, valor))
    return valor


def _comprobar_copias(vista, rec):
    copias = copias_orden(vista, rec)
    if not (copias[0] == copias[1] == copias[2]):
        raise ErrorOperacion(
            "las tres copias del orden no coinciden (0x%X, 0x%X, 0x%X): "
            "abre la pantalla de alineación para que el juego las reconstruya" % (
                rec + COPIAS_ORDEN[0], rec + COPIAS_ORDEN[1], rec + COPIAS_ORDEN[2]))
    return copias[0]


def _escribir_orden(vista, rec, orden):
    if len(orden) != 32:
        raise ErrorOperacion("el orden tiene que medir 32 bytes")
    for rel in COPIAS_ORDEN:
        vista.escribir(rec + rel, bytes(orden))


def _intercambiar(vista, rec, st, casilla_a, casilla_b):
    if casilla_a == casilla_b:
        raise ErrorOperacion("las dos casillas son la misma (%d)" % casilla_a)
    if st["partidoEmpezado"]:
        titulares = 0 <= casilla_a <= 10 and 0 <= casilla_b <= 10
        suplentes = 11 <= casilla_a <= 31 and 11 <= casilla_b <= 31
        if not (titulares or suplentes):
            raise ErrorOperacion("con el partido empezado los cambios van por la cola")
    orden = bytearray(_comprobar_copias(vista, rec))
    orden[casilla_a], orden[casilla_b] = orden[casilla_b], orden[casilla_a]
    _escribir_orden(vista, rec, orden)


def _casilla_de(orden, indice):
    try:
        return orden.index(indice)
    except ValueError:
        raise ErrorOperacion("el índice de plantel %d no está en el orden" % indice)


def _cola_actual(vista, rec):
    declarados = vista.leer(rec + COLA_CONTADOR, 1)[0]
    parejas = []
    for k in range(min(declarados, COLA_MAX)):
        parejas.append({
            "entra": vista.leer(rec + COLA_ENTRA + 2 * k, 1)[0],
            "sale": vista.leer(rec + COLA_SALE + 2 * k, 1)[0],
        })
    return declarados, parejas


def _cambio(vista, rec, st, entra, sale, salieron, nuevos_salidos):
    if entra == sale:
        raise ErrorOperacion("el que entra y el que sale son el mismo jugador (%d)" % entra)
    orden = vista.leer(rec + COPIAS_ORDEN[0], 32)
    casilla_sale = _casilla_de(orden, sale)
    casilla_entra = _casilla_de(orden, entra)

    if not st["partidoEmpezado"]:
        # Antes del partido el cambio es un intercambio directo de casillas.
        _intercambiar(vista, rec, st, casilla_sale, casilla_entra)
        return

    if not casilla_sale <= 10:
        raise ErrorOperacion("el que sale tiene que estar entre los titulares (casillas 0–10); "
                             "el índice %d está en la casilla %d" % (sale, casilla_sale))
    if not 11 <= casilla_entra <= 22:
        raise ErrorOperacion("el que entra tiene que estar en la banca (casillas 11–22); "
                             "el índice %d está en la casilla %d y las reservas (23–31) no entran" % (
                                 entra, casilla_entra))

    declarados, parejas = _cola_actual(vista, rec)
    ya_en_cola = [p for p in parejas if entra in (p["entra"], p["sale"]) or sale in (p["entra"], p["sale"])]
    if ya_en_cola:
        raise ErrorOperacion("el cambio ya está en la cola: %r" % ya_en_cola[0])
    if entra in salieron:
        raise ErrorOperacion("el índice %d ya salió antes en este partido" % entra)
    if sale in salieron:
        raise ErrorOperacion("el índice %d ya salió antes en este partido" % sale)

    restantes = vista.leer(rec + COLA_RESTANTES, 1)[0]
    if restantes == RESTANTES_SIN_INICIALIZAR:
        raise ErrorOperacion(
            "los cambios restantes están sin inicializar (rec-42 = 255): abre la pantalla de "
            "Cambios/alineación en el juego para que el juego los inicialice antes de sustituir")
    if declarados >= COLA_MAX:
        raise ErrorOperacion("la cola ya tiene %d parejas (el máximo es %d)" % (declarados, COLA_MAX))
    if declarados + 1 > restantes:
        raise ErrorOperacion("no quedan cambios: quedan %d y la cola ya tiene %d" % (
            restantes, declarados))

    k = declarados
    contador = declarados + 1
    vista.escribir(rec + COLA_ENTRA + 2 * k, bytes([entra]))
    vista.escribir(rec + COLA_SALE + 2 * k, bytes([sale]))
    vista.escribir(rec + COLA_CONTADOR, bytes([contador]))
    vista.escribir(rec + COLA_ESPEJO_ENTRA + 2 * k, bytes([entra]))
    vista.escribir(rec + COLA_ESPEJO_SALE + 2 * k, bytes([sale]))
    vista.escribir(rec + COLA_ESPEJO_CONTADOR, bytes([contador]))
    nuevos_salidos.add(sale)


def _validar_valor(campo, valor):
    if isinstance(valor, bool) or not isinstance(valor, int):
        raise ErrorOperacion("«valor» tiene que ser un entero")
    valores = campo.get("valores")
    if valores:
        permitidos = sorted(int(k) for k in valores)
        if valor not in permitidos:
            raise ErrorOperacion("valor %d no válido para «%s» (permitidos: %s)" % (
                valor, campo["nombre"], permitidos))
        return
    rango = campo.get("rango")
    if rango:
        if not rango[0] <= valor <= rango[1]:
            raise ErrorOperacion("valor %d fuera de rango (%d..%d) para «%s»" % (
                valor, rango[0], rango[1], campo["nombre"]))
        return
    if not 0 <= valor <= 255:
        raise ErrorOperacion("valor %d fuera de rango (0..255) para «%s»" % (valor, campo["nombre"]))


def _bloque_de(nombre, op):
    """Bloque de un `campo`: el explícito o el que corresponde por defecto.

    Sin ``bloque`` el defecto es ``principal``; si el nombre no existe en
    principal/A/B pero sí en la cabecera, se resuelve a ``cabecera`` (VIVO4).
    """
    bloque = op.get("bloque")
    if bloque is not None:
        return bloque
    for candidato in BLOQUES_ESCRIBIBLES:
        if campo_de(nombre, candidato) is not None:
            return "principal"
    if campo_de(nombre, "cabecera") is not None:
        return "cabecera"
    return "principal"


def _campo(vista, rec, op, campos_escritos=None):
    nombre = op.get("nombre")
    if not isinstance(nombre, str) or not nombre:
        raise ErrorOperacion("falta el campo «nombre»")
    if nombre in CAMPOS_PROHIBIDOS:
        raise ErrorOperacion("«%s» no se escribe con la operación campo; usa intercambiar o cambio" % nombre)
    bloque = _bloque_de(nombre, op)
    if bloque == "cabecera":
        campo = campo_de(nombre, "cabecera")
        if campo is None:
            raise ErrorOperacion("campo desconocido en el bloque cabecera: %r" % (nombre,))
        if nombre in CAMPOS_CABECERA_PROHIBIDOS:
            raise ErrorOperacion(
                "«%s» no se escribe con la operación campo: su significado no está identificado" % nombre)
    elif bloque not in BLOQUES_CAMPO:
        raise ErrorOperacion("bloque desconocido: %r (usa principal, A, B o cabecera)" % (bloque,))
    else:
        campo = campo_de(nombre, bloque)
        if campo is None:
            raise ErrorOperacion("campo desconocido en el bloque %s: %r" % (bloque, nombre))
    if "valor" not in op:
        raise ErrorOperacion("falta el campo «valor»")

    if campo.get("porCasilla"):
        casilla = _entero(op, "casilla", 0, 31)
        inicial = campo.get("casillaInicial", 0)
        stride = campo.get("stride", 1)
        grupos = campo["len"] // stride if stride > 1 else campo["len"]
        if not inicial <= casilla < inicial + grupos:
            raise ErrorOperacion("casilla %d fuera de rango (%d..%d) para «%s»" % (
                casilla, inicial, inicial + grupos - 1, nombre))
        if stride > 1:
            indice = _entero(op, "indice", 0, stride - 1)
            direccion = rec + campo["offset"] + (casilla - inicial) * stride + indice
        else:
            if op.get("indice") is not None:
                raise ErrorOperacion("el campo «%s» no usa «indice»" % nombre)
            direccion = rec + campo["offset"] + (casilla - inicial)
    else:
        if op.get("casilla") is not None:
            raise ErrorOperacion("el campo «%s» no es por casilla" % nombre)
        if campo["len"] > 1:
            indice = _entero(op, "indice", 0, campo["len"] - 1)
            direccion = rec + campo["offset"] + indice
        else:
            if op.get("indice") is not None:
                raise ErrorOperacion("el campo «%s» no usa «indice»" % nombre)
            direccion = rec + campo["offset"]

    _validar_valor(campo, op["valor"])
    vista.escribir(direccion, bytes([op["valor"]]))
    if campos_escritos is not None:
        campos_escritos.add((bloque, nombre))


_VARIANTES = None


def variantes():
    """Carga (una vez) ``pes5-variantes.json``, el catálogo de esquemas."""
    global _VARIANTES
    if _VARIANTES is None:
        ruta = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pes5-variantes.json")
        with open(ruta, "r", encoding="utf-8") as f:
            _VARIANTES = json.load(f)
    return _VARIANTES


def _codigos_posicion():
    return mapa().get("codificaciones", {}).get("posicion", {})


def _sigla_de_codigo(codigo):
    return _codigos_posicion().get(str(int(codigo)))


def _codigo_para_sigla(sigla, actual):
    """Código de la tabla para ``sigla``, conservando el de la casilla si sirve."""
    if _sigla_de_codigo(actual) == sigla:
        return actual
    codigos = _codigos_posicion()
    for clave in sorted(codigos, key=int):
        if codigos[clave] == sigla:
            return int(clave)
    raise ErrorOperacion("sigla de posición desconocida: %r (usa PT, CT, LIB, DI, DD, "
                         "CCD, DLI, DLD, CC, CIZ, CDR, MP, EI, ED, SD o DC)" % (sigla,))


def _campo_principal(nombre):
    campo = campo_de(nombre, "principal")
    if campo is None:  # pragma: no cover - el mapa siempre los trae
        raise ErrorOperacion("el mapa no trae el campo «%s» del bloque principal" % nombre)
    return campo


def _mover(vista, rec, op):
    """Escribe profundidad, lateral y código de posición de una casilla 1..10."""
    casilla = _entero(op, "casilla", 1, 10)
    prof = _entero(op, "prof", 2, 47)
    lat = _entero(op, "lat", 6, 99)
    sigla_escrita = op.get("pos")
    if not isinstance(sigla_escrita, str) or not sigla_escrita.strip():
        raise ErrorOperacion("falta el campo «pos» (sigla de posición)")
    sigla = sigla_escrita.strip().upper()

    campo_prof = _campo_principal("profundidad")
    campo_lat = _campo_principal("lateral")
    campo_pos = _campo_principal("posicion")
    actual = vista.leer(rec + campo_pos["offset"] + casilla, 1)[0]
    codigo = _codigo_para_sigla(sigla, actual)

    inicial = campo_lat.get("casillaInicial", 0)
    vista.escribir(rec + campo_prof["offset"] + casilla, bytes([prof]))
    vista.escribir(rec + campo_lat["offset"] + (casilla - inicial), bytes([lat]))
    vista.escribir(rec + campo_pos["offset"] + casilla, bytes([codigo]))


def _buscar_variante(esquema, nombre):
    if not isinstance(esquema, str) or not esquema.strip():
        raise ErrorOperacion("falta el campo «esquema»")
    if not isinstance(nombre, str) or not nombre.strip():
        raise ErrorOperacion("falta el campo «variante»")
    buscado_esquema = esquema.strip().upper()
    buscado_variante = nombre.strip().upper()
    for entrada in variantes().get("esquemas", []):
        if str(entrada.get("nombre", "")).strip().upper() != buscado_esquema:
            continue
        for variante in entrada.get("variantes", []):
            if str(variante.get("nombre", "")).strip().upper() == buscado_variante:
                return entrada, variante
        raise ErrorOperacion("la variante %r no existe en el esquema %r" % (
            nombre, entrada.get("nombre")))
    raise ErrorOperacion("esquema desconocido: %r (consulta tools/pes5/pes5-variantes.json)" % (esquema,))


def _variante(vista, rec, op):
    """Aplica una variante completa: prof/lat/código, flechas y actitud."""
    _entrada, variante = _buscar_variante(op.get("esquema"), op.get("variante"))
    puestos = variante.get("puestos")
    if not isinstance(puestos, list) or len(puestos) != 11:
        raise ErrorOperacion("la variante %r no trae los 11 puestos" % (variante.get("nombre"),))

    regla = variantes().get("reglaActitud")
    if not isinstance(regla, dict):
        raise ErrorOperacion("pes5-variantes.json no trae «reglaActitud»")

    campo_prof = _campo_principal("profundidad")
    campo_lat = _campo_principal("lateral")
    campo_pos = _campo_principal("posicion")
    campo_flechas = _campo_principal("flechasAtaque")
    campo_act = _campo_principal("actitudDefensiva")
    inicial_lat = campo_lat.get("casillaInicial", 0)

    for casilla, puesto in enumerate(puestos):
        if not isinstance(puesto, dict):
            raise ErrorOperacion("el puesto %d de la variante no es un objeto" % casilla)
        prof = _entero(puesto, "prof", 0, 255)
        codigo = _entero(puesto, "codigo", 0, 255)
        sigla = puesto.get("sigla")
        if not isinstance(sigla, str) or not sigla:
            raise ErrorOperacion("el puesto %d de la variante no trae sigla" % casilla)
        vista.escribir(rec + campo_prof["offset"] + casilla, bytes([prof]))
        if casilla >= 1:
            lat = _entero(puesto, "lat", 6, 99)
            vista.escribir(rec + campo_lat["offset"] + (casilla - inicial_lat), bytes([lat]))
        vista.escribir(rec + campo_pos["offset"] + casilla, bytes([codigo]))
        actitud = regla.get(sigla)
        if actitud is None:
            raise ErrorOperacion("no hay actitud para la sigla %r en «reglaActitud»" % sigla)
        vista.escribir(rec + campo_act["offset"] + casilla, bytes([int(actitud)]))

    # El juego deja vacías las flechas de ataque de los 10 jugadores de campo.
    stride = campo_flechas.get("stride", 8)
    for casilla in range(1, 11):
        inicio = campo_flechas["offset"] + casilla * stride
        vista.escribir(rec + inicio, bytes([0] * stride))


def _validar_op(vista, rec, st, op, salieron, nuevos_salidos, campos_escritos=None):
    """Valida y aplica una operación en la vista. Devuelve si toca el orden."""
    if not isinstance(op, dict):
        raise ErrorOperacion("la operación tiene que ser un objeto JSON")
    tipo = op.get("op")
    if tipo == "intercambiar":
        casilla_a = _entero(op, "casillaA", 0, 31)
        casilla_b = _entero(op, "casillaB", 0, 31)
        _intercambiar(vista, rec, st, casilla_a, casilla_b)
        return True
    if tipo == "cambio":
        entra = _entero(op, "entra", 0, 31)
        sale = _entero(op, "sale", 0, 31)
        _cambio(vista, rec, st, entra, sale, salieron, nuevos_salidos)
        # Antes del partido el cambio es un intercambio de casillas; en partido
        # solo va a la cola y no toca el orden.
        return not st["partidoEmpezado"]
    if tipo == "campo":
        _campo(vista, rec, op, campos_escritos)
        return False
    if tipo == "mover":
        _mover(vista, rec, op)
        return False
    if tipo == "variante":
        _variante(vista, rec, op)
        return False
    raise ErrorOperacion("operación desconocida: %r (usa intercambiar, cambio, campo, "
                         "mover o variante)" % (tipo,))


def _salidos(salieron):
    salidos = set()
    for valor in salieron or []:
        try:
            salidos.add(int(valor))
        except (TypeError, ValueError):
            raise ErrorOperacion("«salieron» tiene que ser una lista de índices de plantel")
    return salidos


# ------------------------------------------------------------ coherencia


def _posicion_final(vista, rec, bloque, casilla):
    """Código de posición (``rec+133+c`` y sus equivalentes de A/B)."""
    campo = campo_de("posicion", bloque)
    if campo is None:
        return None
    return vista.leer(rec + campo["offset"] + casilla, 1)[0]


def _error_libero(bloque, sistema, libero, codigo):
    if libero not in CASILLAS_LIBERO:
        detalle = "casilla %d" % libero
    else:
        detalle = "casilla %d con código de posición %d" % (libero, codigo)
    if sistema == SISTEMA_LIBERO:
        regla = "con sistema Líbero el líbero tiene que ser un CT titular (casillas 1–10)"
    else:
        regla = "el líbero tiene que ser un CT titular (casillas 1–10)"
    return "%s: %s (%s)" % (NOMBRE_BLOQUE.get(bloque, bloque), regla, detalle)


def _comprobar_sistema_libero(vista, rec, bloques_sistema, bloques_libero, toca_orden):
    """Sistema Líbero y líbero, en los tres bloques (principal, A y B).

    Solo se comprueba el bloque que el lote toca: ``sistemaDefensivo`` o
    ``libero`` de ese bloque, o el orden (``intercambiar`` / ``cambio`` en la
    previa, que mueven las casillas de los tres bloques). Un líbero inválido
    que el lote no toca no lo bloquea (VIVO3).
    """
    errores = []
    for bloque in BLOQUES_ESCRIBIBLES:
        campo_sistema = campo_de("sistemaDefensivo", bloque)
        campo_libero = campo_de("libero", bloque)
        if campo_sistema is None or campo_libero is None:
            continue
        sistema = vista.leer(rec + campo_sistema["offset"], 1)[0]
        if bloque in bloques_libero:
            mirar = True
        else:
            mirar = sistema == SISTEMA_LIBERO and (bloque in bloques_sistema or toca_orden)
        if not mirar:
            continue
        libero = vista.leer(rec + campo_libero["offset"], 1)[0]
        codigo = _posicion_final(vista, rec, bloque, libero) if libero in CASILLAS_LIBERO else None
        if codigo in CODIGOS_CT_O_LIBERO:
            continue
        errores.append(_error_libero(bloque, sistema, libero, codigo))
    return errores


def _comprobar_casillas_cabecera(vista, rec, escritos):
    """Capitán y lanzadores escritos por el lote: índice de plantel de un titular.

    El valor de ``rec+106..111`` es el índice de plantel (0–31). Se valida solo
    el que el lote escribe (VIVO3): los valores preexistentes no bloquean un
    lote que no los toca. El índice tiene que estar en una casilla 0–10 del
    orden final (el juego pasa el índice del que entra cuando sale por cambio).
    """
    errores = []
    orden = vista.leer(rec + COPIAS_ORDEN[0], 32)
    for nombre, etiqueta in CAMPOS_CABECERA_INDICE:
        if ("cabecera", nombre) not in escritos:
            continue
        campo = campo_de(nombre, "cabecera")
        if campo is None:  # pragma: no cover - el mapa siempre los trae
            continue
        valor = vista.leer(rec + campo["offset"], 1)[0]
        if valor not in INDICES_PLANTEL:
            errores.append("%s tiene que ser un índice de plantel (0–31): %d" % (
                etiqueta, valor))
            continue
        try:
            casilla = orden.index(valor)
        except ValueError:
            errores.append("%s: el índice de plantel %d no está en el orden" % (
                etiqueta, valor))
            continue
        if casilla not in CASILLAS_CABECERA:
            errores.append(
                "%s tiene que ser el índice de plantel de un titular (casillas 0–10): "
                "%d está en la casilla %d" % (etiqueta, valor, casilla))
    return errores


def _comprobar_rival_marcado(vista, rec):
    """``rivalMarcado``: casilla del rival 0–10 o 255 (ninguno)."""
    errores = []
    for bloque in BLOQUES_ESCRIBIBLES:
        campo = campo_de("rivalMarcado", bloque)
        if campo is None:
            continue
        inicial = campo.get("casillaInicial", 0)
        for casilla in TITULARES:
            valor = vista.leer(rec + campo["offset"] + (casilla - inicial), 1)[0]
            if valor == RIVAL_NINGUNO or valor in CASILLAS_CABECERA:
                continue
            errores.append("%s: el rival marcado de la casilla %d tiene que ser 0–10 "
                           "o 255 (ninguno): %d" % (
                               NOMBRE_BLOQUE.get(bloque, bloque), casilla, valor))
    return errores


def _comprobar_coherencia(vista, rec, campos_escritos=None, toca_orden=False):
    """Reglas que se comprueban sobre el estado final del lote.

    Se miran todas las operaciones ya aplicadas en la vista en copia, así que
    las reglas ven el resultado del lote y no cada operación por separado.
    Solo se validan los valores que el lote escribe o mueve (VIVO3): un
    ``intercambiar`` no se bloquea por un capitán o un lanzador preexistente,
    y un líbero inválido preexistente tampoco bloquea un lote que no toca el
    sistema, el líbero ni el orden.
    """
    escritos = campos_escritos or set()
    bloques_sistema = {bloque for bloque, nombre in escritos if nombre == "sistemaDefensivo"}
    bloques_libero = {bloque for bloque, nombre in escritos if nombre == "libero"}
    errores = []
    errores.extend(_comprobar_sistema_libero(
        vista, rec, bloques_sistema, bloques_libero, toca_orden))
    errores.extend(_comprobar_casillas_cabecera(vista, rec, escritos))
    errores.extend(_comprobar_rival_marcado(vista, rec))
    return errores


def validar(mem, lado, ops, salieron=None):
    """Valida una lista de operaciones sin escribir nada.

    Devuelve ``{ok, errores, escrituras, salieron}``. ``escrituras`` describe
    los bytes que aplicaría (dirección, largo y datos en hexadecimal) y
    ``salieron`` la lista de índices que quedan como "salidos" del partido.
    """
    rec = rec_de(lado)
    try:
        salidos = _salidos(salieron)
    except ErrorOperacion as e:
        return {"ok": False, "errores": [str(e)], "escrituras": [],
                "escrituras_bytes": [], "salieron": []}
    if not isinstance(ops, (list, tuple)) or not ops:
        return {"ok": False, "errores": ["no hay operaciones que validar"],
                "escrituras": [], "escrituras_bytes": [], "salieron": sorted(salidos)}

    st = estado(mem)
    vista = _Vista(mem)
    nuevos_salidos = set()
    campos_escritos = set()
    toca_orden = False
    errores = []
    for numero, op in enumerate(ops, 1):
        try:
            if _validar_op(vista, rec, st, op, salidos, nuevos_salidos, campos_escritos):
                toca_orden = True
        except ErrorOperacion as e:
            errores.append("operación %d: %s" % (numero, e))

    salidos |= nuevos_salidos
    if not errores:
        errores.extend(_comprobar_coherencia(vista, rec, campos_escritos, toca_orden))
    if errores:
        return {"ok": False, "errores": errores, "escrituras": [],
                "escrituras_bytes": [], "salieron": sorted(salidos)}

    escrituras = [{"dir": hex(d), "largo": len(b), "datos": b.hex()}
                  for d, b in vista.escrituras]
    return {"ok": True, "errores": [], "escrituras": escrituras,
            "escrituras_bytes": vista.escrituras, "salieron": sorted(salidos),
            "momento": st["momento"]}


# ------------------------------------------------------------------ escritura


def aplicar(mem, lado, ops, *, forzar=False, salieron=None):
    """Valida y aplica la lista de operaciones (todo o nada).

    Si la pantalla de alineación no está abierta no escribe nada y devuelve
    ``cerrada: True`` (salvo ``forzar=True``, que existe solo para pruebas).
    Después de escribir relee cada tramo y lo compara con lo esperado.
    """
    try:
        salidos = _salidos(salieron)
    except ErrorOperacion as e:
        return {"ok": False, "cerrada": False, "errores": [str(e)],
                "estado": estado(mem), "escrito": [], "salieron": []}

    st = estado(mem)
    if not st["puedeEscribir"] and not forzar:
        return {
            "ok": False,
            "cerrada": True,
            "errores": ["la pantalla de alineación no está abierta: abre la pantalla de "
                        "alineación (previa, pausa o entretiempo) para poder escribir"],
            "estado": st,
            "escrito": [],
            "salieron": sorted(salidos),
        }

    revision = validar(mem, lado, ops, salieron)
    if not revision["ok"]:
        return {"ok": False, "cerrada": False, "errores": revision["errores"],
                "estado": st, "escrito": [], "salieron": revision["salieron"]}

    pasos = revision["escrituras_bytes"]
    antes = {}
    esperado = {}
    for direccion, datos in pasos:
        if direccion not in antes:
            antes[direccion] = mem.leer(direccion, len(datos))
        esperado[direccion] = datos

    escritas = []
    for direccion, datos in pasos:
        mem.escribir(direccion, datos)
        escritas.append({"dir": hex(direccion), "largo": len(datos), "datos": datos.hex()})

    escrito = []
    errores = []
    for direccion, datos in esperado.items():
        real = mem.leer(direccion, len(datos))
        coincide = real == datos
        escrito.append({
            "dir": hex(direccion),
            "antes": antes[direccion].hex(),
            "despues": real.hex(),
            "coincide": coincide,
        })
        if not coincide:
            errores.append("la relectura no coincide en 0x%X (esperado %s, leído %s)" % (
                direccion, datos.hex(), real.hex()))

    return {
        "ok": not errores,
        "cerrada": False,
        "errores": errores,
        "estado": st,
        "escrituras": escritas,
        "escrito": escrito,
        "salieron": revision["salieron"],
    }


# ------------------------------------------------------------------ vigilancia

def _sello():
    return datetime.datetime.now().isoformat(timespec="seconds")


class AgenteVigilancia(object):
    """Procesa ``pendientes/*.json`` cuando la alineación está abierta.

    Estructura de la carpeta:

    - ``pendientes/<nombre>.json``: ``{"lado": "local"|"visitante", "ops": [...], "id": "..."}``
    - ``hechos/<id>.pendiente.json`` y ``hechos/<id>.resultado.json``
    - ``rechazados/<id>.pendiente.json`` y ``rechazados/<id>.resultado.json``
    - ``estado.json``: partido en curso y jugadores que salieron por lado
    - ``agente.log``: una línea por suceso
    """

    def __init__(self, mem, carpeta):
        self.mem = mem
        self.carpeta = os.path.abspath(carpeta)
        self.pendientes = os.path.join(self.carpeta, "pendientes")
        self.hechos = os.path.join(self.carpeta, "hechos")
        self.rechazados = os.path.join(self.carpeta, "rechazados")
        self.ruta_estado = os.path.join(self.carpeta, "estado.json")
        self.ruta_log = os.path.join(self.carpeta, "agente.log")
        for directorio in (self.pendientes, self.hechos, self.rechazados):
            os.makedirs(directorio, exist_ok=True)
        self.estado = self._cargar_estado()

    # -- estado y registro

    def _cargar_estado(self):
        base = {"partidoEmpezado": False,
                "salieron": {"local": [], "visitante": []}}
        try:
            with open(self.ruta_estado, "r", encoding="utf-8-sig") as f:
                datos = json.load(f)
        except (OSError, ValueError):
            return base
        if not isinstance(datos, dict):
            return base
        salieron = datos.get("salieron")
        if not isinstance(salieron, dict):
            salieron = {}
        base["partidoEmpezado"] = bool(datos.get("partidoEmpezado"))
        base["salieron"] = {
            "local": [int(x) for x in salieron.get("local", []) if isinstance(x, int)],
            "visitante": [int(x) for x in salieron.get("visitante", []) if isinstance(x, int)],
        }
        return base

    def _guardar_estado(self):
        self.estado["actualizado"] = _sello()
        with open(self.ruta_estado, "w", encoding="utf-8") as f:
            json.dump(self.estado, f, indent=2, ensure_ascii=False)
            f.write("\n")

    def registrar(self, texto):
        with open(self.ruta_log, "a", encoding="utf-8") as f:
            f.write("%s %s\n" % (_sello(), texto))

    # -- una vuelta

    def paso(self):
        st = estado(self.mem)
        cambios = not os.path.exists(self.ruta_estado)

        if self.estado["partidoEmpezado"] and not st["partidoEmpezado"]:
            self.estado["salieron"] = {"local": [], "visitante": []}
            cambios = True
            self.registrar("el partido terminó: se reinicia la lista de jugadores que salieron")
        if bool(self.estado["partidoEmpezado"]) != bool(st["partidoEmpezado"]):
            self.estado["partidoEmpezado"] = bool(st["partidoEmpezado"])
            cambios = True
        if cambios:
            self._guardar_estado()

        if not st["puedeEscribir"]:
            return {"momento": st["momento"], "alineacionAbierta": False,
                    "procesados": []}

        try:
            nombres = sorted(n for n in os.listdir(self.pendientes)
                             if n.lower().endswith(".json"))
        except OSError as e:
            self.registrar("no puedo leer %s: %s" % (self.pendientes, e))
            return {"momento": st["momento"], "alineacionAbierta": True,
                    "procesados": [], "error": str(e)}

        procesados = []
        for nombre in nombres:
            procesados.append(self._procesar(nombre, st))
        return {"momento": st["momento"], "alineacionAbierta": True,
                "procesados": procesados}

    # -- un pendiente

    def _destino(self, carpeta, nombre):
        destino = os.path.join(carpeta, nombre)
        if not os.path.exists(destino):
            return destino
        raiz, extension = os.path.splitext(nombre)
        return os.path.join(carpeta, "%s-%s%s" % (
            raiz, datetime.datetime.now().strftime("%Y%m%d-%H%M%S"), extension))

    def _archivar(self, nombre, ident, resultado, carpeta):
        origen = os.path.join(self.pendientes, nombre)
        destino = self._destino(carpeta, ident + ".pendiente.json")
        try:
            os.replace(origen, destino)
        except OSError as e:
            self.registrar("no puedo mover %s: %s" % (nombre, e))
        ruta_resultado = self._destino(carpeta, ident + ".resultado.json")
        with open(ruta_resultado, "w", encoding="utf-8") as f:
            json.dump(resultado, f, indent=2, ensure_ascii=False)
            f.write("\n")
        return destino, ruta_resultado

    def _rechazar(self, nombre, ident, st, errores):
        resultado = {
            "id": ident,
            "archivo": nombre,
            "ok": False,
            "momento": st["momento"],
            "cuando": _sello(),
            "errores": errores,
            "escrito": [],
        }
        self._archivar(nombre, ident, resultado, self.rechazados)
        self.registrar("%s: rechazado (%s)" % (ident, "; ".join(errores)))
        return {"id": ident, "resultado": "rechazado", "ok": False, "errores": errores}

    def _procesar(self, nombre, st):
        ruta = os.path.join(self.pendientes, nombre)
        base = os.path.splitext(nombre)[0]
        try:
            with open(ruta, "r", encoding="utf-8-sig") as f:
                pedido = json.load(f)
        except (OSError, ValueError) as e:
            return self._rechazar(nombre, base, st, ["el archivo no es un JSON válido: %s" % e])

        if not isinstance(pedido, dict):
            return self._rechazar(nombre, base, st, ["el archivo tiene que ser un objeto JSON"])

        ident = str(pedido.get("id") or base)
        lado = str(pedido.get("lado", "")).strip().lower()
        ops = pedido.get("ops")
        if not isinstance(ops, list) or not ops:
            return self._rechazar(nombre, ident, st, ["falta «ops» (lista de operaciones)"])
        if lado not in REC:
            return self._rechazar(nombre, ident, st, ["«lado» inválido: %r (local o visitante)" % (lado,)])

        salieron = self.estado["salieron"].get(lado, [])
        resultado = aplicar(self.mem, lado, ops, salieron=salieron)
        resultado.update({"id": ident, "archivo": nombre, "lado": lado,
                          "momento": st["momento"], "cuando": _sello()})

        if not resultado.get("ok"):
            if resultado.get("cerrada"):
                return self._rechazar(nombre, ident, st, resultado["errores"])
            return self._rechazar(nombre, ident, st, resultado["errores"])

        if st["partidoEmpezado"]:
            self.estado["salieron"][lado] = resultado["salieron"]
            self._guardar_estado()
        self._archivar(nombre, ident, resultado, self.hechos)
        self.registrar("%s: aplicado (%d escrituras)" % (ident, len(resultado["escrito"])))
        return {"id": ident, "resultado": "aplicado", "ok": True,
                "escrito": len(resultado["escrito"])}


def vigilar(mem, carpeta, vueltas=None, intervalo=0.5, dormir=time.sleep):
    """Procesa ``carpeta/pendientes`` en bucle.

    ``vueltas`` limita el número de pasadas (las pruebas usan 1); con ``None``
    el bucle no termina hasta interrumpirlo. Devuelve el resumen de cada vuelta.
    """
    agente = AgenteVigilancia(mem, carpeta)
    resumenes = []
    vuelta = 0
    while vueltas is None or vuelta < vueltas:
        try:
            resumenes.append(agente.paso())
        except Exception as e:  # el bucle no se cae por un error puntual
            agente.registrar("ERROR en la vuelta %d: %s" % (vuelta + 1, e))
            resumenes.append({"error": str(e)})
        vuelta += 1
        if vueltas is not None and vuelta >= vueltas:
            break
        dormir(intervalo)
    return resumenes


# ------------------------------------------------------------------ utilidades CLI

def origen_de(mem):
    if isinstance(mem, ProcesoPES5):
        return {"modo": "proceso", "proceso": mem.nombre, "pid": mem.pid}
    origen = getattr(mem, "origen", None)
    if origen:
        return origen
    return {"modo": "memoria"}


def main(argv=None):  # pragma: no cover - el CLI real es live-agent.py
    sys.stderr.write("Este módulo no tiene CLI: usa tools/pes5/live-agent.py.\n")
    return 1


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
