#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Lector en vivo del registro de alineacion de PES5 (SOLO LECTURA).

Lee de la memoria del proceso PES5.exe (o de una captura .bin congelada) el
registro de formacion de los dos equipos de la partida y lo imprime en JSON con
la codificacion documentada en docs/pes5/MAPA_ALINEACION_VIVO.md:

  - orden (casilla -> indice de plantel e id)
  - formacion de cada bloque (profundidad, lateral, codigo de posicion y sigla)
  - estrategia (los cuatro botones y el modo manual/semi-automatico)
  - lanzadores (corner izquierdo 106, corner derecho 107, TL largo 108,
    TL corto 109, penal 110) y capitan
  - ajustes de equipo (nivel, sistema, libero, linea, presion, fuera de juego,
    contraataque)
  - por casilla: flechas de ataque, actitud defensiva y configuracion de marcaje
  - los tres bloques de 171 bytes: principal, Alineacion A y Alineacion B

SEGURIDAD: este script solo LEE. Abre el proceso con PROCESS_VM_READ |
PROCESS_QUERY_INFORMATION y llama a ReadProcessMemory; no usa WriteProcessMemory
ni toca el option file ni ningun archivo del juego.

Uso:
  python tools/pes5/live-lineup-read.py                 # proceso PES5.exe
  python tools/pes5/live-lineup-read.py --buscar        # localiza los rec leyendo el save
  python tools/pes5/live-lineup-read.py --desde-bin <captura.bin>
  python tools/pes5/live-lineup-read.py --ayuda

Salida: JSON por stdout. Si el juego no esta abierto (y no se paso --desde-bin)
sale con codigo 1 y un mensaje claro por stderr.
"""

import argparse
import ctypes
import ctypes.wintypes as wt
import json
import os
import struct
import sys

# ---------------------------------------------------------------- constantes

# Direcciones por defecto de los dos registros (partida capturada en PESMAP1/2).
EQUIPOS_POR_DEFECTO = [
    {"clave": "FKC", "nombre": "FK TUPADRE", "club": 42, "rec": 0x3956F5E},
    {"clave": "GAF", "nombre": "GUARANI AF", "club": 5, "rec": 0x395BBB2},
]

# Base de las capturas .bin de la pantalla de alineacion (--desde-bin).
BASE_BIN = 0x3940000

# Option file y bloques del save (pes5-crypt.js / pes5-editor.js).
SAVE_POR_DEFECTO = ("C:/Users/Administrator/Documents/KONAMI/Pro Evolution Soccer 5/"
                    "save/folder1/KONAMI-WIN32PES5OPT")
OPTIONFILE_JAVA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..",
                               "docs", "2.0", "investigacion", "OptionFile.java")
ROSTER_BASE = 667458      # bloque 5 del option file
ROSTER_STRIDE = 64
FORM_REGISTRO_BASE = 716932
FORM_REGISTRO_STRIDE = 628

# Registro en memoria.
REL_ORDEN = 4             # 4..35: permutacion casilla -> indice de plantel
REL_IDS = 36              # 36..99: 32 ids u16 del plantel
REL_BLOQUES = {"principal": 112, "A": 283, "B": 454}
BLOQUE_LARGO = 171
LARGO_REGISTRO = 628

# Dentro de cada bloque de 171 bytes.
BLOQ_PROF = 0             # 11 bytes, casillas 0..10
BLOQ_LAT = 11             # 10 bytes, casillas 1..10
BLOQ_POS = 21             # 11 bytes, codigo de posicion
BLOQ_FLECHAS = 35         # 12 grupos de 8 bytes (casilla 0..11)
BLOQ_ACTITUD = 131        # 11 bytes
BLOQ_MARCAJE = 142        # 11 bytes: 1 zonas, 0 al hombre
BLOQ_RIVAL = 153          # 11 bytes: casilla del rival, 255 = ninguno
BLOQ_AJUSTES = 164        # 7 bytes: sistema, libero, nivel, linea, presion, fuera, contra

SIGLAS = ["PT", "CT", "CT", "CT", "LIB", "LIB", "CT", "CT", "DI", "DD",
          "CCD", "CCD", "CCD", "CCD", "CCD", "DLI", "DLD", "CC", "CC", "CC", "CC", "CC",
          "CIZ", "CDR", "MP", "MP", "MP", "MP", "MP", "EI", "ED",
          "SD", "SD", "SD", "SD", "SD", "DC", "DC", "DC", "DC", "DC"]
ESTRATEGIAS = ["Sin estrategia", "Normal", "Ataque centro", "Ataque drcha", "Ataque izqda",
               "Atq. lado opuesto", "Cambio banda", "Desborde DC", "Zona presion",
               "Contraataque", "Fuera de juego", "Alineacion A", "Alineacion B"]
BOTONES = ["cuadrado", "triangulo", "circulo", "equis"]
NIVELES = ["Manual", "Auto defensa", "Normal", "Auto ataque"]
SISTEMAS = {0: "Normal", 1: "Libero", 2: "Defensa en linea"}
ABC = ["A", "B", "C"]
ACTITUDES = ["Alto", "Normal", "Bajo"]
FLECHAS = ["izq", "izq-arriba", "arriba", "arriba-dcha", "dcha", "dcha-abajo", "abajo", "abajo-izq"]

PROCESS_VM_READ = 0x0010
PROCESS_QUERY_INFORMATION = 0x0400


def u16(buf, off):
    return struct.unpack_from("<H", buf, off)[0]


def codigo_posicion(codigo):
    return SIGLAS[codigo] if 0 <= codigo < len(SIGLAS) else None


def nombre(catalogo, valor, defecto=None):
    if isinstance(catalogo, dict):
        return catalogo.get(valor, defecto if defecto is not None else "?({})".format(valor))
    return catalogo[valor] if 0 <= valor < len(catalogo) else (defecto if defecto is not None else "?({})".format(valor))


# ---------------------------------------------------------------- option file

def _leer_arreglo(fuente, nombre):
    i = fuente.index(nombre + " = {")
    a = fuente.index("{", i)
    b = fuente.index("}", a)
    valores = []
    for trozo in fuente[a + 1:b].split(","):
        t = trozo.strip()
        if not t:
            continue
        if t == "Byte.MAX_VALUE":
            valores.append(127)
        elif t == "Byte.MIN_VALUE":
            valores.append(-128)
        else:
            valores.append(int(t, 10))
    return valores


def descifrar_option_file(datos, ruta_java=OPTIONFILE_JAVA):
    """Mismo algoritmo que tools/pes5/pes5-crypt.js (solo lectura)."""
    with open(ruta_java, "r", encoding="latin-1") as f:
        fuente = f.read()
    bloque = _leer_arreglo(fuente, "block")
    tam_bloque = _leer_arreglo(fuente, "blockSize")
    clave = [(v + 1815543808) & 0xFFFFFFFF for v in _leer_arreglo(fuente, "key")]
    clave_pc = [v & 0xFF for v in _leer_arreglo(fuente, "keyPC")]
    add = 1815549477
    xor_c = 0x6C371625

    d = bytearray(datos)
    for i in range(len(d)):
        d[i] ^= clave_pc[i % 256]
    for i in range(1, 10):
        j = 0
        inicio = bloque[i]
        fin = bloque[i] + tam_bloque[i]
        for k in range(inicio, fin, 4):
            m = int.from_bytes(d[k:k + 4], "little")
            n = (((m - clave[j] + add) & 0xFFFFFFFF) ^ xor_c) & 0xFFFFFFFF
            d[k:k + 4] = n.to_bytes(4, "little")
            j += 1
            if j == 367:
                j = 0
    return bytes(d)


def plantel_del_save(ruta, club):
    with open(ruta, "rb") as f:
        plano = descifrar_option_file(f.read())
    base = ROSTER_BASE + club * ROSTER_STRIDE
    return [u16(plano, base + k * 2) for k in range(32)]


# ---------------------------------------------------------------- windows

def _win32():
    if os.name != "nt":
        return None
    return ctypes.WinDLL("kernel32", use_last_error=True)


class Proceso(ctypes.Structure):
    _fields_ = [("dwSize", wt.DWORD), ("cntUsage", wt.DWORD), ("th32ProcessID", wt.DWORD),
                ("th32DefaultHeapID", ctypes.c_void_p), ("th32ModuleID", wt.DWORD),
                ("cntThreads", wt.DWORD), ("th32ParentProcessID", wt.DWORD),
                ("pcPriClassBase", ctypes.c_long), ("dwFlags", wt.DWORD),
                ("szExeFile", ctypes.c_char * 260)]


class MemoriaBasica(ctypes.Structure):
    _fields_ = [("BaseAddress", ctypes.c_void_p), ("AllocationBase", ctypes.c_void_p),
                ("AllocationProtect", wt.DWORD), ("RegionSize", ctypes.c_size_t),
                ("State", wt.DWORD), ("Protect", wt.DWORD), ("Type", wt.DWORD)]


class LectorProceso(object):
    """Envoltorio de solo lectura sobre un proceso de 32 bits."""

    def __init__(self, nombre_exe):
        self.api = _win32()
        if self.api is None:
            raise RuntimeError("este lector solo funciona en Windows")
        self.pid = self._buscar_pid(nombre_exe)
        if self.pid is None:
            raise LookupError(nombre_exe)
        self.handle = self.api.OpenProcess(PROCESS_VM_READ | PROCESS_QUERY_INFORMATION, False, self.pid)
        if not self.handle:
            raise OSError("OpenProcess fallo (codigo {})".format(ctypes.get_last_error()))

    def _buscar_pid(self, nombre_exe):
        INVALID = ctypes.c_void_p(-1).value
        snap = self.api.CreateToolhelp32Snapshot(0x00000002, 0)
        if not snap or snap == INVALID:
            return None
        entrada = Proceso()
        entrada.dwSize = ctypes.sizeof(Proceso)
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

    def leer(self, direccion, tamano):
        buf = ctypes.create_string_buffer(tamano)
        leidos = ctypes.c_size_t(0)
        ok = self.api.ReadProcessMemory(self.handle, ctypes.c_void_p(direccion), buf,
                                        ctypes.c_size_t(tamano), ctypes.byref(leidos))
        if not ok or leidos.value != tamano:
            raise OSError("ReadProcessMemory fallo en 0x{:x} (leidos {})".format(direccion, leidos.value))
        return buf.raw

    def cerrar(self):
        if self.handle:
            self.api.CloseHandle(self.handle)
            self.handle = None

    def buscar(self, patron, max_direccion=0x7FFF0000, trozo=1 << 20):
        """Devuelve las direcciones donde aparece `patron` (solo regiones legibles)."""
        hallazgos = []
        direccion = 0
        mbi = MemoriaBasica()
        while direccion < max_direccion:
            if not self.api.VirtualQueryEx(self.handle, ctypes.c_void_p(direccion),
                                           ctypes.byref(mbi), ctypes.sizeof(MemoriaBasica)):
                break
            base = int(mbi.BaseAddress or 0)
            tam = int(mbi.RegionSize or 0)
            if tam <= 0:
                break
            # MEM_COMMIT (0x1000) y sin PAGE_GUARD (0x100) ni PAGE_NOACCESS (0x01).
            legible = (mbi.State == 0x1000) and not (mbi.Protect & 0x101)
            if legible:
                desplazamiento = 0
                sobrante = b""
                while desplazamiento < tam:
                    n = min(trozo, tam - desplazamiento)
                    try:
                        datos = self.leer(base + desplazamiento, n)
                    except OSError:
                        break
                    bloque = sobrante + datos
                    pos = bloque.find(patron)
                    while pos >= 0:
                        hallazgos.append(base + desplazamiento - len(sobrante) + pos)
                        pos = bloque.find(patron, pos + 1)
                    sobrante = bloque[-(len(patron) - 1):] if len(patron) > 1 else b""
                    desplazamiento += n
            direccion = base + tam
        return hallazgos


# ---------------------------------------------------------------- decodificacion

def leer_bloque(buf, offset, orden, ids):
    """Decodifica un bloque de 171 bytes (principal, A o B)."""
    slots = []
    for c in range(11):
        pos = buf[offset + BLOQ_POS + c]
        indice = orden[c] if c < len(orden) else None
        flechas = []
        for k, dirn in enumerate(FLECHAS):
            if buf[offset + BLOQ_FLECHAS + 8 * c + k]:
                flechas.append(dirn)
        actitud = buf[offset + BLOQ_ACTITUD + c]
        marcaje = buf[offset + BLOQ_MARCAJE + c]
        rival = buf[offset + BLOQ_RIVAL + c]
        slots.append({
            "casilla": c,
            "indice_plantel": indice,
            "id": ids[indice] if indice is not None and 0 <= indice < len(ids) else None,
            "profundidad": buf[offset + BLOQ_PROF + c],
            "lateral": None if c == 0 else buf[offset + BLOQ_LAT + c - 1],
            "posicion": {"codigo": pos, "sigla": codigo_posicion(pos)},
            "flechas_ataque": flechas,
            "actitud_defensiva": {"codigo": actitud, "nombre": nombre(ACTITUDES, actitud)},
            "marcaje": {"codigo": marcaje, "nombre": "zonas" if marcaje == 1 else "al hombre"},
            "rival_marcado": None if rival == 255 else rival,
        })
    sistema = buf[offset + BLOQ_AJUSTES + 0]
    ajustes = {
        "sistema_defensivo": {"codigo": sistema, "nombre": SISTEMAS.get(sistema, "?(%d)" % sistema)},
        "libero_casilla": buf[offset + BLOQ_AJUSTES + 1],
        "nivel_ataque_defensa": {"codigo": buf[offset + BLOQ_AJUSTES + 2],
                                 "nombre": nombre(NIVELES, buf[offset + BLOQ_AJUSTES + 2])},
        "linea_defensiva": {"codigo": buf[offset + BLOQ_AJUSTES + 3],
                            "nombre": nombre(ABC, buf[offset + BLOQ_AJUSTES + 3])},
        "zona_presion": {"codigo": buf[offset + BLOQ_AJUSTES + 4],
                         "nombre": nombre(ABC, buf[offset + BLOQ_AJUSTES + 4])},
        "fuera_de_juego": {"codigo": buf[offset + BLOQ_AJUSTES + 5],
                           "nombre": nombre(ABC, buf[offset + BLOQ_AJUSTES + 5])},
        "contraataque": {"codigo": buf[offset + BLOQ_AJUSTES + 6],
                         "nombre": nombre(ABC, buf[offset + BLOQ_AJUSTES + 6])},
    }
    return {"slots": slots, "ajustes": ajustes}


def decodificar_registro(buf):
    """Decodifica los 628 bytes de un registro de formacion."""
    if len(buf) < LARGO_REGISTRO:
        raise ValueError("el registro mide {} bytes, se esperaban {}".format(len(buf), LARGO_REGISTRO))
    orden = list(buf[REL_ORDEN:REL_ORDEN + 32])
    ids = [u16(buf, REL_IDS + 2 * k) for k in range(32)]

    def jugador(casilla):
        if casilla is None or casilla < 0 or casilla >= len(orden):
            return None, None
        indice = orden[casilla]
        return indice, (ids[indice] if 0 <= indice < len(ids) else None)

    botones = []
    for i, boton in enumerate(BOTONES):
        valor = buf[100 + i]
        botones.append({"boton": boton, "codigo": valor, "estrategia": nombre(ESTRATEGIAS, valor)})
    modo = buf[105]
    lanzadores = {}
    for clave_python, desplazamiento in (("corner_izquierda_106", 106), ("corner_derecha_107", 107),
                                         ("tiro_libre_largo_108", 108), ("tiro_libre_corto_109", 109),
                                         ("penal_110", 110)):
        casilla = buf[desplazamiento]
        indice, ident = jugador(casilla)
        lanzadores[clave_python] = {"casilla": casilla, "indice_plantel": indice, "id": ident}
    capitan_casilla = buf[111]
    capitan_indice, capitan_id = jugador(capitan_casilla)

    return {
        "orden": [{"casilla": c, "indice_plantel": orden[c],
                   "id": ids[orden[c]] if 0 <= orden[c] < len(ids) else None} for c in range(32)],
        "cabecera": {
            "botones": botones,
            "modo": {"codigo": modo, "nombre": "Manual" if modo == 0 else
                     ("Semi-automatico" if modo == 1 else "?(%d)" % modo)},
            "lanzadores": lanzadores,
            "capitan": {"casilla": capitan_casilla, "indice_plantel": capitan_indice, "id": capitan_id},
            "rec_extra_104": buf[104],
        },
        "formaciones": {clave: leer_bloque(buf, offset, orden, ids) for clave, offset in REL_BLOQUES.items()},
    }


# ---------------------------------------------------------------- fuentes

def registros_desde_bin(ruta, base, equipos):
    with open(ruta, "rb") as f:
        datos = f.read()
    salida = []
    for eq in equipos:
        inicio = eq["rec"] - base
        if inicio < 0 or inicio + LARGO_REGISTRO > len(datos):
            raise ValueError("la captura {} no cubre el registro de {} (0x{:x} fuera de 0x{:x}..0x{:x})".format(
                ruta, eq["clave"], eq["rec"], base, base + len(datos)))
        salida.append((eq, datos[inicio:inicio + LARGO_REGISTRO]))
    return salida


def registros_del_proceso(lector, equipos, buscar, ruta_save, largo=0x30000):
    salida = []
    for eq in equipos:
        if buscar:
            plantel = plantel_del_save(ruta_save, eq["club"])
            patron = struct.pack("<3H", plantel[0], plantel[1], plantel[2])
            candidatos = lector.buscar(patron)
            encontrado = None
            for direccion in candidatos:
                rec = direccion - REL_IDS
                try:
                    datos = lector.leer(rec, LARGO_REGISTRO)
                except OSError:
                    continue
                orden = list(datos[REL_ORDEN:REL_ORDEN + 32])
                if sorted(orden) != list(range(32)):
                    continue
                ids = [u16(datos, REL_IDS + 2 * k) for k in range(32)]
                # El registro lleva el plantel completo del club en +36..99.
                if ids != plantel:
                    continue
                encontrado = (rec, datos, len(candidatos))
                break
            if encontrado is None:
                raise LookupError("no encontre el registro de {} (club {}) buscando 3 ids de su plantel ({} candidatos)".format(
                    eq["clave"], eq["club"], len(candidatos)))
            rec, datos, total = encontrado
            salida.append((dict(eq, rec=rec, candidatos=total), datos))
        else:
            datos = lector.leer(eq["rec"], LARGO_REGISTRO)
            salida.append((eq, datos))
    return salida


# ---------------------------------------------------------------- CLI

def main(argv=None):
    p = argparse.ArgumentParser(
        prog="live-lineup-read.py", add_help=False,
        description="Lector SOLO LECTURA del registro de alineacion de PES5 (JSON por stdout).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="El juego tiene que estar abierto con una partida cargada en la pantalla de "
               "alineacion (previa al partido o pausa). Sin juego se puede probar la "
               "decodificacion con --desde-bin.")
    p.add_argument("-h", "--help", "--ayuda", action="help", help="muestra esta ayuda y sale")
    p.add_argument("--buscar", action="store_true",
                   help="localiza los registros buscando los 3 primeros ids u16 del plantel del save y retrocediendo 36 bytes")
    p.add_argument("--save", default=SAVE_POR_DEFECTO, help="option file de PES5 (para --buscar)")
    p.add_argument("--desde-bin", metavar="ARCHIVO",
                   help="lee una captura de memoria congelada (0x30000 bytes desde --base) en vez del proceso")
    p.add_argument("--base", default=hex(BASE_BIN), help="direccion base del .bin (por defecto 0x3940000)")
    p.add_argument("--equipo", default="FKC,GAF", help="claves de los equipos a leer (por defecto FKC,GAF)")
    p.add_argument("--clubes", default=None, help="sobreescribe los clubes, p. ej. FKC=42,GAF=5")
    p.add_argument("--proceso", default="PES5.exe", help="nombre del ejecutable (por defecto PES5.exe)")
    args = p.parse_args(argv)

    resultado = {"herramienta": "live-lineup-read", "solo_lectura": True}
    try:
        equipos = [dict(e) for e in EQUIPOS_POR_DEFECTO]
        if args.clubes:
            for trozo in args.clubes.split(","):
                clave, valor = trozo.split("=")
                for eq in equipos:
                    if eq["clave"] == clave.strip().upper():
                        eq["club"] = int(valor, 0)
        claves = [c.strip().upper() for c in args.equipo.split(",") if c.strip()]
        equipos = [e for e in equipos if e["clave"] in claves] or equipos

        if args.desde_bin:
            base = int(args.base, 0)
            registros = registros_desde_bin(args.desde_bin, base, equipos)
            resultado["origen"] = {"modo": "bin", "archivo": os.path.abspath(args.desde_bin),
                                   "base": hex(base)}
        else:
            try:
                lector = LectorProceso(args.proceso)
            except LookupError:
                sys.stderr.write(
                    "No encuentro el proceso {} en ejecucion.\n"
                    "Abre PES5 con una partida cargada en la pantalla de alineacion y vuelve a intentarlo, "
                    "o prueba la decodificacion con --desde-bin <captura.bin>.\n".format(args.proceso))
                return 1
            try:
                registros = registros_del_proceso(lector, equipos, args.buscar, args.save)
                resultado["origen"] = {"modo": "proceso", "proceso": args.proceso, "pid": lector.pid,
                                       "buscar": bool(args.buscar)}
            finally:
                lector.cerrar()
    except (OSError, ValueError, LookupError, RuntimeError, struct.error) as e:
        sys.stderr.write("ERROR: {}\n".format(e))
        return 1

    resultado["equipos"] = []
    for eq, datos in registros:
        item = {"clave": eq["clave"], "nombre": eq.get("nombre"), "club": eq["club"],
                "rec": hex(eq["rec"])}
        if "candidatos" in eq:
            item["candidatos_encontrados"] = eq["candidatos"]
        item.update(decodificar_registro(datos))
        resultado["equipos"].append(item)

    json.dump(resultado, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
