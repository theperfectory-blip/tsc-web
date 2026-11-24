# Catalogo de esquemas y variantes de PES5 (Alineacion -> Cambio).
#
# Obtenido recorriendo el menu del juego con las teclas x/down/wait y leyendo el
# registro del equipo local. NUNCA escribe en el juego: solo ReadProcessMemory y
# SendInput (x/down). El estado de partida tiene que ser el documentado en
# docs/pes5/MAPA_ALINEACION_VIVO.md: pantalla de alineacion abierta con el cursor
# en Alineacion -> Cambio (0x39564da = 1; en la lista de variantes vale 2).
#
# Modos:
#   python -I pes5-variantes-scan.py --desde-progreso <progreso.json> [--salida <json>]
#       Regenera pes5-variantes.json a partir de un progreso guardado (no toca el juego).
#   python -I pes5-variantes-scan.py --pid <pid> --capturas <carpeta> --ejecutar [--esquema k] [--desde v]
#       Recorre el menu (SOLO x/down/wait) y guarda progreso + capturas. Requiere
#       --ejecutar: sin esa bandera solo valida y muestra el plan.
#
# Formato del registro (ver MAPA_ALINEACION_VIVO.md):
#   rec+112..122 profundidad (11 casillas), rec+123..132 lateral (casillas 1..10,
#   el arquero no tiene), rec+133..143 codigo de posicion (11 casillas).
import ctypes, ctypes.wintypes as w, json, os, sys, time

REC = 0x3956F5E
STATE_ALIN = 0x39564DA

ESQUEMAS = ['4-5-1', '4-4-2', '4-3-3', '3-6-1', '3-5-2', '3-4-3', '5-4-1', '5-3-2']

# Cantidad de variantes de cada grupo A/B/C por esquema, leida de las capturas
# list_<esquema>_<v>.png del recorrido (v=1,6,11,16 y el paso por Cancelar).
GRUPOS = {
    '4-5-1': [6, 5],
    '4-4-2': [5, 4, 6],
    '4-3-3': [4, 2, 5],
    '3-6-1': [5, 6],
    '3-5-2': [6, 5],
    '3-4-3': [5, 4, 6],
    '5-4-1': [5, 4, 6],
    '5-3-2': [4, 2, 5],
}

SIGLAS = {0: 'PT', 1: 'CT', 2: 'CT', 3: 'CT', 4: 'LIB', 5: 'LIB', 6: 'CT', 7: 'CT',
          8: 'DI', 9: 'DD', 10: 'CCD', 11: 'CCD', 12: 'CCD', 13: 'CCD', 14: 'CCD',
          15: 'DLI', 16: 'DLD', 17: 'CC', 18: 'CC', 19: 'CC', 20: 'CC', 21: 'CC',
          22: 'CIZ', 23: 'CDR', 24: 'MP', 25: 'MP', 26: 'MP', 27: 'MP', 28: 'MP',
          29: 'EI', 30: 'ED', 31: 'SD', 32: 'SD', 33: 'SD', 34: 'SD', 35: 'SD',
          36: 'DC', 37: 'DC', 38: 'DC', 39: 'DC', 40: 'DC'}


def nombre_variante(esquema, v):
    """v = 1..N en el orden del menu: A-1..A-nA, B-1..B-nB, C-1..C-nC."""
    resto = v
    for gi, n in enumerate(GRUPOS[esquema]):
        if resto <= n:
            return '%s-%d' % ('ABC'[gi], resto)
        resto -= n
    raise ValueError('%s no tiene %d variantes' % (esquema, v))


def _sigla(codigo):
    return SIGLAS.get(codigo)


def leer(datos):
    prof = [int(x) for x in datos['prof']]
    lat = [int(x) for x in datos['lat']]
    pos = [int(x) for x in datos['pos']]
    puestos = []
    for c in range(11):
        puestos.append({
            'prof': prof[c],
            'lat': None if c == 0 else lat[c - 1],
            'codigo': pos[c],
            'sigla': _sigla(pos[c]),
        })
    return puestos


def construir(progreso, salida):
    esquemas = []
    for k in range(1, 9):
        nombre = ESQUEMAS[k - 1]
        entry = progreso.get(str(k))
        if not entry or not entry.get('variantes'):
            raise SystemExit('falta el esquema %s en el progreso' % nombre)
        variantes = []
        for item in entry['variantes']:
            v = item['v']
            variantes.append({'nombre': nombre_variante(nombre, v),
                              'puestos': leer(item['datos'])})
        esquemas.append({'nombre': nombre, 'grupos': GRUPOS[nombre], 'variantes': variantes})
    doc = {
        'fuente': 'Recorrido del menu Alineacion -> Cambio de PES5 (exhibicion FKC vs GAF, '
                  'pantalla de alineacion en pausa). No se encontro la tabla estatica de variantes '
                  'en PES5.exe ni en el volcado de memoria, asi que se aplico cada variante con '
                  'x/down y se leyo el registro del equipo local (rec = 0x3956f5e); no se escribio memoria.',
        'fecha': '2026-11-24',
        'registro': {'rec': '0x3956f5e', 'prof': 'rec+112..122', 'lat': 'rec+123..132 (casillas 1..10)',
                     'pos': 'rec+133..143', 'nota': 'el arquero (casilla 0) no tiene lateral'},
        'esquemas': esquemas,
    }
    json.dump(doc, open(salida, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('escrito', salida, 'esquemas', len(esquemas),
          'variantes', sum(len(e['variantes']) for e in esquemas))


# ---------------------------------------------------------------- recorrido ---
def recorrer(pid, outdir, k_ini, v_ini):
    os.makedirs(outdir, exist_ok=True)
    k32 = ctypes.WinDLL('kernel32', use_last_error=True)
    u32 = ctypes.WinDLL('user32', use_last_error=True)
    h = k32.OpenProcess(0x410, False, pid)  # QUERY_INFORMATION | VM_READ
    if not h:
        raise SystemExit('OpenProcess fallo')
    k32.ReadProcessMemory.argtypes = [w.HANDLE, ctypes.c_void_p, ctypes.c_void_p,
                                      ctypes.c_size_t, ctypes.POINTER(ctypes.c_size_t)]

    def rd(addr, n):
        b = ctypes.create_string_buffer(n)
        n2 = ctypes.c_size_t()
        if not k32.ReadProcessMemory(h, ctypes.c_void_p(addr), b, n, ctypes.byref(n2)) or n2.value != n:
            raise RuntimeError('lectura fallida en %x' % addr)
        return b.raw

    def leer_registro():
        b = rd(REC + 112, 32)
        return {'prof': list(b[0:11]), 'lat': list(b[11:21]), 'pos': list(b[21:32])}

    SC = {'down': (0x50, 1), 'x': (0x2D, 0)}

    class KI(ctypes.Structure):
        _fields_ = [('wVk', w.WORD), ('wScan', w.WORD), ('dwFlags', w.DWORD),
                    ('time', w.DWORD), ('extra', ctypes.c_size_t)]

    class INP(ctypes.Structure):
        class _U(ctypes.Union):
            _fields_ = [('ki', KI), ('pad', ctypes.c_byte * 32)]
        _anonymous_ = ('u',)
        _fields_ = [('type', w.DWORD), ('u', _U)]

    def send(sc, ext, up):
        f = 0x0008 | (1 if ext else 0) | (2 if up else 0)
        i = INP(type=1)
        i.ki = KI(0, sc, f, 0, 0)
        u32.SendInput(1, ctypes.byref(i), ctypes.sizeof(i))

    hwnd = u32.FindWindowW(None, 'Pro Evolution Soccer 5')

    def tecla(name):
        u32.SetForegroundWindow(hwnd)
        sc, ext = SC[name]
        send(sc, ext, False)
        time.sleep(0.15)
        send(sc, ext, True)
        time.sleep(0.25)

    class BIH(ctypes.Structure):
        _fields_ = [('biSize', w.DWORD), ('biWidth', w.LONG), ('biHeight', w.LONG),
                    ('biPlanes', w.WORD), ('biBitCount', w.WORD), ('biCompression', w.DWORD),
                    ('biSizeImage', w.DWORD), ('a', w.LONG), ('b', w.LONG), ('c', w.DWORD), ('d', w.DWORD)]
    g32 = ctypes.WinDLL('gdi32')

    def captura(path):
        from PIL import Image
        r = w.RECT()
        u32.GetClientRect(hwnd, ctypes.byref(r))
        W, H = r.right, r.bottom
        hdc = u32.GetDC(hwnd)
        mdc = g32.CreateCompatibleDC(hdc)
        bmp = g32.CreateCompatibleBitmap(hdc, W, H)
        g32.SelectObject(mdc, bmp)
        u32.PrintWindow(hwnd, mdc, 3)
        bi = BIH(ctypes.sizeof(BIH), W, -H, 1, 32, 0, 0, 0, 0, 0, 0)
        buf = ctypes.create_string_buffer(W * H * 4)
        g32.GetDIBits(mdc, bmp, 0, H, buf, ctypes.byref(bi), 0)
        Image.frombuffer('RGBA', (W, H), buf, 'raw', 'BGRA', 0, 1).convert('RGB').save(path)
        g32.DeleteObject(bmp)
        g32.DeleteDC(mdc)
        u32.ReleaseDC(hwnd, hdc)

    prog_path = os.path.join(outdir, 'progreso.json')
    prog = json.load(open(prog_path, encoding='utf-8')) if os.path.exists(prog_path) else {}

    def guardar():
        json.dump(prog, open(prog_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    def estado_ok():
        return rd(STATE_ALIN, 1)[0] in (1, 2)   # 1 = submenu/listas de esquema, 2 = lista de variantes

    # Estado de partida: submenu Alineacion con el cursor en «Cambio». Se abre la
    # lista de esquemas (cursor en Cancelar), se baja k veces y se entra a la lista
    # de variantes (cursor en A-1).
    k = k_ini
    nombre = ESQUEMAS[k - 1]
    tecla('x'); time.sleep(1.0)
    for _ in range(k):
        tecla('down')
    tecla('x'); time.sleep(1.0)

    prev = None
    v = 1
    entry = prog.setdefault(str(k), {'nombre': nombre, 'variantes': [], 'completo': False})

    while True:
        if not estado_ok():
            print('PARA: 39564da fuera de 1/2 antes de %s v=%d' % (nombre, v)); guardar(); return 2
        for _ in range(v - 1):
            tecla('down')
        if v in (1, 6, 11, 16, 21):
            captura(os.path.join(outdir, 'list_%s_%d.png' % (nombre, v)))
        tecla('x')
        for _ in range(10):
            if rd(STATE_ALIN, 1)[0] == 1:
                break
            time.sleep(0.4)
        else:
            tecla('x'); time.sleep(1.5)   # el X se perdio durante la animacion del scroll
        datos = leer_registro()
        if any(c >= 41 for c in datos['pos']):
            print('PARA: codigos >= 41 en %s v=%d: %s' % (nombre, v, datos['pos'])); guardar(); return 3
        if rd(STATE_ALIN, 1)[0] != 1:
            print('PARA: 39564da != 1 tras %s v=%d' % (nombre, v)); guardar(); return 2
        if prev is not None and datos == prev:
            # X sobre «Cancelar»: el juego vuelve a la LISTA DE ESQUEMAS con el
            # cursor en el esquema elegido. Esta es la via para pasar al siguiente.
            print('    %s: %d variantes (v=%d = Cancelar)' % (nombre, v - 1, v), flush=True)
            entry['completo'] = True
            guardar()
            if k == 8:
                break
            tecla('down'); time.sleep(0.6)    # esquema siguiente
            tecla('x'); time.sleep(1.0)       # lista de variantes del siguiente
            if not estado_ok():
                print('PARA: 39564da fuera de 1/2 al abrir %s' % ESQUEMAS[k]); guardar(); return 2
            k += 1
            nombre = ESQUEMAS[k - 1]
            v = 1
            prev = None
            entry = prog.setdefault(str(k), {'nombre': nombre, 'variantes': [], 'completo': False})
            print('>>> esquema %d (%s)' % (k, nombre), flush=True)
            continue
        captura(os.path.join(outdir, '%s_%d.png' % (nombre, v)))
        entry['variantes'].append({'v': v, 'datos': datos})
        guardar()
        print('    %s v=%d %s' % (nombre, v, datos), flush=True)
        prev = datos
        v += 1
        if v > 21:
            print('PARA: mas de 21 variantes en %s' % nombre); guardar(); return 4
        # Reabrir la lista de variantes de este esquema desde Alineacion.
        tecla('x'); time.sleep(1.0)
        for _ in range(k):
            tecla('down')
        tecla('x'); time.sleep(1.0)

    # Restaurar el submenu Alineacion: desde la lista de esquemas (cursor en 5-3-2)
    # bajar a «Por defecto» y «Cancelar» (nunca se elige «Por defecto») y salir.
    tecla('down'); tecla('down'); tecla('x'); time.sleep(1.0)
    print('FIN')
    guardar()
    return 0


def main(argv):
    args = argv[1:]
    if '--desde-progreso' in args:
        i = args.index('--desde-progreso')
        prog = json.load(open(args[i + 1], encoding='utf-8'))
        salida = args[args.index('--salida') + 1] if '--salida' in args else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pes5-variantes.json')
        construir(prog, salida)
        return 0
    if '--pid' not in args:
        print(__doc__ if __doc__ else 'uso: --pid <pid> --capturas <carpeta> --ejecutar')
        return 1
    pid = int(args[args.index('--pid') + 1])
    outdir = args[args.index('--capturas') + 1] if '--capturas' in args else 'varmap'
    k = int(args[args.index('--esquema') + 1]) if '--esquema' in args else 1
    v = int(args[args.index('--desde') + 1]) if '--desde' in args else 1
    if '--ejecutar' not in args:
        print('plan: esquemas %d..8 desde %d; sin --ejecutar no se envia ninguna tecla' % (k, v))
        return 0
    return recorrer(pid, outdir, k, v)


if __name__ == '__main__':
    sys.exit(main(sys.argv))
