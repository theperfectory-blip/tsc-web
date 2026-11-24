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
#   python -I pes5-variantes-scan.py --varact --pid <pid> --capturas <carpeta> --ejecutar [--esquema k] [--desde v] [--limite n]
#       Aplica cada variante del catalogo ya guardado y lee, ademas de prof/lat/pos,
#       la actitud defensiva (rec+243..253) y las flechas de ataque (rec+147..234).
#       Guarda <carpeta>/varact.json (progreso, se puede reanudar) y una captura por
#       variante. Compara cada lectura con el catalogo: si no coincide, PARA.
#   python -I pes5-variantes-scan.py --varact-merge <varact.json> [--salida <json>]
#       Escribe la actitud de cada puesto, las flechas de cada variante y la
#       reglaActitud en pes5-variantes.json (no toca el juego).
#
# Formato del registro (ver MAPA_ALINEACION_VIVO.md):
#   rec+112..122 profundidad (11 casillas), rec+123..132 lateral (casillas 1..10,
#   el arquero no tiene), rec+133..143 codigo de posicion (11 casillas),
#   rec+147..234 flechas de ataque (11 grupos de 8 bits) y
#   rec+243..253 actitud defensiva por casilla (0 Alto, 1 Normal, 2 Bajo).
import ctypes, ctypes.wintypes as w, json, os, sys, time

REC = 0x3956F5E
STATE_ALIN = 0x39564DA
FLECHAS = 147     # rec+147..234: 11 grupos de 8 bits
ACTITUD = 243     # rec+243..253: 11 bytes

AQUI = os.path.dirname(os.path.abspath(__file__))
CATALOGO = os.path.join(AQUI, 'pes5-variantes.json')

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

ACTITUDES = {0: 'Alto', 1: 'Normal', 2: 'Bajo'}


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


# ------------------------------------------------------------ lectura / JSON ---
def leer_bloque(rd):
    """prof/lat/pos: 32 bytes desde rec+112."""
    b = rd(REC + 112, 32)
    return {'prof': list(b[0:11]), 'lat': list(b[11:21]), 'pos': list(b[21:32])}


def leer_actitud_flechas(rd):
    """Flechas rec+147..234 (11 x 8 bits) y actitud rec+243..253 (11 bytes)."""
    f = rd(REC + FLECHAS, 88)
    return {'flechas': [list(f[c * 8:(c + 1) * 8]) for c in range(11)],
            'actitudes': list(rd(REC + ACTITUD, 11))}


def guardar_json(path, doc):
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


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
    guardar_json(salida, doc)
    print('escrito', salida, 'esquemas', len(esquemas),
          'variantes', sum(len(e['variantes']) for e in esquemas))


# ------------------------------------------------------------- entorno vivo ---
class KI(ctypes.Structure):
    _fields_ = [('wVk', w.WORD), ('wScan', w.WORD), ('dwFlags', w.DWORD),
                ('time', w.DWORD), ('extra', ctypes.c_size_t)]


class INP(ctypes.Structure):
    class _U(ctypes.Union):
        _fields_ = [('ki', KI), ('pad', ctypes.c_byte * 32)]
    _anonymous_ = ('u',)
    _fields_ = [('type', w.DWORD), ('u', _U)]


class BIH(ctypes.Structure):
    _fields_ = [('biSize', w.DWORD), ('biWidth', w.LONG), ('biHeight', w.LONG),
                ('biPlanes', w.WORD), ('biBitCount', w.WORD), ('biCompression', w.DWORD),
                ('biSizeImage', w.DWORD), ('a', w.LONG), ('b', w.LONG), ('c', w.DWORD), ('d', w.DWORD)]


class Entorno:
    """Ventana del juego + ReadProcessMemory + SendInput (x/down) + capturas."""

    SC = {'down': (0x50, 1), 'x': (0x2D, 0)}

    def __init__(self, pid):
        self.k32 = ctypes.WinDLL('kernel32', use_last_error=True)
        self.u32 = ctypes.WinDLL('user32', use_last_error=True)
        self.g32 = ctypes.WinDLL('gdi32')
        self.h = self.k32.OpenProcess(0x410, False, pid)  # QUERY_INFORMATION | VM_READ
        if not self.h:
            raise SystemExit('OpenProcess fallo (pid %d)' % pid)
        self.k32.ReadProcessMemory.argtypes = [w.HANDLE, ctypes.c_void_p, ctypes.c_void_p,
                                               ctypes.c_size_t, ctypes.POINTER(ctypes.c_size_t)]
        self.hwnd = self.u32.FindWindowW(None, 'Pro Evolution Soccer 5')
        if not self.hwnd:
            raise SystemExit('no encuentro la ventana del juego')

    def rd(self, addr, n):
        b = ctypes.create_string_buffer(n)
        n2 = ctypes.c_size_t()
        if not self.k32.ReadProcessMemory(self.h, ctypes.c_void_p(addr), b, n, ctypes.byref(n2)) or n2.value != n:
            raise RuntimeError('lectura fallida en %x' % addr)
        return b.raw

    def estado(self):
        return self.rd(STATE_ALIN, 1)[0]

    def _send(self, sc, ext, up):
        f = 0x0008 | (1 if ext else 0) | (2 if up else 0)
        i = INP(type=1)
        i.ki = KI(0, sc, f, 0, 0)
        self.u32.SendInput(1, ctypes.byref(i), ctypes.sizeof(i))

    def tecla(self, name):
        self.u32.SetForegroundWindow(self.hwnd)
        sc, ext = Entorno.SC[name]
        self._send(sc, ext, False)
        time.sleep(0.15)
        self._send(sc, ext, True)
        time.sleep(0.25)

    def captura(self, path):
        from PIL import Image
        r = w.RECT()
        self.u32.GetClientRect(self.hwnd, ctypes.byref(r))
        W, H = r.right, r.bottom
        hdc = self.u32.GetDC(self.hwnd)
        mdc = self.g32.CreateCompatibleDC(hdc)
        bmp = self.g32.CreateCompatibleBitmap(hdc, W, H)
        self.g32.SelectObject(mdc, bmp)
        self.u32.PrintWindow(self.hwnd, mdc, 3)
        bi = BIH(ctypes.sizeof(BIH), W, -H, 1, 32, 0, 0, 0, 0, 0, 0)
        buf = ctypes.create_string_buffer(W * H * 4)
        self.g32.GetDIBits(mdc, bmp, 0, H, buf, ctypes.byref(bi), 0)
        Image.frombuffer('RGBA', (W, H), buf, 'raw', 'BGRA', 0, 1).convert('RGB').save(path)
        self.g32.DeleteObject(bmp)
        self.g32.DeleteDC(mdc)
        self.u32.ReleaseDC(self.hwnd, hdc)


# ---------------------------------------------------------------- recorrido ---
def recorrer(pid, outdir, k_ini, v_ini):
    os.makedirs(outdir, exist_ok=True)
    env = Entorno(pid)

    def leer_registro():
        return leer_bloque(env.rd)

    def estado_ok():
        return env.estado() in (1, 2)   # 1 = submenu/listas de esquema, 2 = lista de variantes

    prog_path = os.path.join(outdir, 'progreso.json')
    prog = json.load(open(prog_path, encoding='utf-8')) if os.path.exists(prog_path) else {}

    def guardar():
        guardar_json(prog_path, prog)

    # Estado de partida: submenu Alineacion con el cursor en «Cambio». Se abre la
    # lista de esquemas (cursor en Cancelar), se baja k veces y se entra a la lista
    # de variantes (cursor en A-1).
    k = k_ini
    nombre = ESQUEMAS[k - 1]
    env.tecla('x'); time.sleep(1.0)
    for _ in range(k):
        env.tecla('down')
    env.tecla('x'); time.sleep(1.0)

    prev = None
    v = 1
    entry = prog.setdefault(str(k), {'nombre': nombre, 'variantes': [], 'completo': False})

    while True:
        if not estado_ok():
            print('PARA: 39564da fuera de 1/2 antes de %s v=%d' % (nombre, v)); guardar(); return 2
        for _ in range(v - 1):
            env.tecla('down')
        if v in (1, 6, 11, 16, 21):
            env.captura(os.path.join(outdir, 'list_%s_%d.png' % (nombre, v)))
        env.tecla('x')
        for _ in range(10):
            if env.estado() == 1:
                break
            time.sleep(0.4)
        else:
            env.tecla('x'); time.sleep(1.5)   # el X se perdio durante la animacion del scroll
        datos = leer_registro()
        if any(c >= 41 for c in datos['pos']):
            print('PARA: codigos >= 41 en %s v=%d: %s' % (nombre, v, datos['pos'])); guardar(); return 3
        if env.estado() != 1:
            print('PARA: 39564da != 1 tras %s v=%d' % (nombre, v)); guardar(); return 2
        if prev is not None and datos == prev:
            # X sobre «Cancelar»: el juego vuelve a la LISTA DE ESQUEMAS con el
            # cursor en el esquema elegido. Esta es la via para pasar al siguiente.
            print('    %s: %d variantes (v=%d = Cancelar)' % (nombre, v - 1, v), flush=True)
            entry['completo'] = True
            guardar()
            if k == 8:
                break
            env.tecla('down'); time.sleep(0.6)    # esquema siguiente
            env.tecla('x'); time.sleep(1.0)       # lista de variantes del siguiente
            if not estado_ok():
                print('PARA: 39564da fuera de 1/2 al abrir %s' % ESQUEMAS[k]); guardar(); return 2
            k += 1
            nombre = ESQUEMAS[k - 1]
            v = 1
            prev = None
            entry = prog.setdefault(str(k), {'nombre': nombre, 'variantes': [], 'completo': False})
            print('>>> esquema %d (%s)' % (k, nombre), flush=True)
            continue
        env.captura(os.path.join(outdir, '%s_%d.png' % (nombre, v)))
        entry['variantes'].append({'v': v, 'datos': datos})
        guardar()
        print('    %s v=%d %s' % (nombre, v, datos), flush=True)
        prev = datos
        v += 1
        if v > 21:
            print('PARA: mas de 21 variantes en %s' % nombre); guardar(); return 4
        # Reabrir la lista de variantes de este esquema desde Alineacion.
        env.tecla('x'); time.sleep(1.0)
        for _ in range(k):
            env.tecla('down')
        env.tecla('x'); time.sleep(1.0)

    # Restaurar el submenu Alineacion: desde la lista de esquemas (cursor en 5-3-2)
    # bajar a «Por defecto» y «Cancelar» (nunca se elige «Por defecto») y salir.
    env.tecla('down'); env.tecla('down'); env.tecla('x'); time.sleep(1.0)
    print('FIN')
    guardar()
    return 0


# ------------------------------------------------- actitud y flechas (VARACT) ---
def plan_varact(catalogo=CATALOGO):
    """Lista ordenada de las variantes del catalogo con la lectura esperada."""
    doc = json.load(open(catalogo, encoding='utf-8'))
    plan = []
    for ki, esq in enumerate(doc['esquemas'], 1):
        for vi, var in enumerate(esq['variantes'], 1):
            p = var['puestos']
            plan.append({
                'k': ki, 'esquema': esq['nombre'], 'v': vi, 'variante': var['nombre'],
                'esperado': {'prof': [x['prof'] for x in p],
                             'lat': [x['lat'] for x in p[1:]],
                             'pos': [x['codigo'] for x in p]},
            })
    return plan


def leer_estable(env, esperado, intentos=8):
    """Espera a que la lectura coincida con el catalogo y se repita igual."""
    prev = None
    datos = extra = None
    for i in range(intentos):
        datos = leer_bloque(env.rd)
        extra = leer_actitud_flechas(env.rd)
        if datos == esperado and prev == extra:
            return datos, extra
        prev = extra
        time.sleep(0.25)
    return datos, extra


def recorrer_varact(pid, outdir, k_ini=1, v_ini=1, limite=None, capturar=True):
    os.makedirs(outdir, exist_ok=True)
    env = Entorno(pid)
    plan = plan_varact()
    prog_path = os.path.join(outdir, 'varact.json')
    prog = json.load(open(prog_path, encoding='utf-8')) if os.path.exists(prog_path) else {}
    prog.setdefault('variantes', [])
    hechas = {(it['k'], it['v']) for it in prog['variantes']}

    def guardar():
        guardar_json(prog_path, prog)

    if env.estado() != 1:
        print('PARA: 39564da=%d; se esperaba 1 (submenu Alineacion con el cursor en Cambio)'
              % env.estado())
        return 2

    aplicadas = 0
    for it in plan:
        if (it['k'], it['v']) < (k_ini, v_ini) or (it['k'], it['v']) in hechas:
            continue
        if limite is not None and aplicadas >= limite:
            break
        if env.estado() != 1:
            print('PARA: 39564da=%d antes de %s %s' % (env.estado(), it['esquema'], it['variante']))
            return 2
        env.tecla('x'); time.sleep(1.0)                 # lista de esquemas (cursor en Cancelar)
        for _ in range(it['k']):
            env.tecla('down')
        env.tecla('x'); time.sleep(1.0)                 # lista de variantes (cursor en A-1)
        for _ in range(it['v'] - 1):
            env.tecla('down')
        env.tecla('x')                                  # aplica la variante
        for _ in range(10):
            if env.estado() == 1:
                break
            time.sleep(0.4)
        datos, extra = leer_estable(env, it['esperado'])
        if datos != it['esperado']:
            print('PARA: la lectura no coincide con el catalogo en %s %s: %s != %s'
                  % (it['esquema'], it['variante'], datos, it['esperado']))
            guardar(); return 5
        if any(c >= 41 for c in datos['pos']):
            print('PARA: codigos >= 41 en %s %s: %s' % (it['esquema'], it['variante'], datos['pos']))
            guardar(); return 3
        if env.estado() != 1:
            print('PARA: 39564da=%d tras %s %s' % (env.estado(), it['esquema'], it['variante']))
            guardar(); return 2
        if capturar:
            env.captura(os.path.join(outdir, 'varact_%s_%s.png' % (it['esquema'], it['variante'])))
        prog['variantes'].append({
            'k': it['k'], 'esquema': it['esquema'], 'v': it['v'], 'variante': it['variante'],
            'datos': datos, 'actitudes': extra['actitudes'], 'flechas': extra['flechas'],
        })
        guardar()
        aplicadas += 1
        print('    %s %s v=%d act %s flechas %s'
              % (it['esquema'], it['variante'], it['v'], extra['actitudes'],
                 'vacias' if not any(any(g) for g in extra['flechas']) else 'NO VACIAS'),
              flush=True)

    print('fin: %d variantes aplicadas; total en el progreso %d/100'
          % (aplicadas, len(prog['variantes'])))
    return 0


# ------------------------------------------------------------ regla actitud ---
def calcular_regla(doc):
    """Deriva reglaActitud (sigla -> actitud) y sus excepciones del catalogo leido.

    La actitud observada se agrupa por (sigla, codigo): si un mismo codigo diera
    actitudes distintas segun la variante, se anota como excepcion por variante.
    """
    obs = {}      # (sigla, codigo) -> {actitud: [(esquema, variante, casilla)]}
    for esq in doc['esquemas']:
        for var in esq['variantes']:
            for c, p in enumerate(var['puestos']):
                clave = (p['sigla'], p['codigo'])
                obs.setdefault(clave, {}).setdefault(p['actitud'], []).append(
                    (esq['nombre'], var['nombre'], c))

    regla = {}
    excepciones = []
    por_sigla = {}
    for (sigla, codigo), valores in obs.items():
        por_sigla.setdefault(sigla, {})[codigo] = valores
    actitud_por_codigo = {}
    for (sigla, codigo), valores in sorted(obs.items(), key=lambda kv: kv[0][1]):
        if len(valores) == 1:
            actitud_por_codigo[codigo] = next(iter(valores))

    for sigla in sorted(por_sigla):
        codigos = por_sigla[sigla]
        # Actitud dominante de la sigla = la del codigo mas frecuente.
        cuenta = {}
        for codigo, valores in codigos.items():
            for act, sitios in valores.items():
                cuenta[act] = cuenta.get(act, 0) + len(sitios)
        dominante = sorted(cuenta.items(), key=lambda kv: (-kv[1], kv[0]))[0][0]
        regla[sigla] = dominante
        for codigo in sorted(codigos):
            valores = codigos[codigo]
            if len(valores) > 1:
                for act, sitios in sorted(valores.items()):
                    excepciones.append({
                        'sigla': sigla, 'codigo': codigo, 'actitud': act,
                        'motivo': 'el mismo codigo da actitudes distintas segun la variante',
                        'casos': ['%s %s casilla %d' % s for s in sitios],
                    })
            elif next(iter(valores)) != dominante:
                act = next(iter(valores))
                excepciones.append({
                    'sigla': sigla, 'codigo': codigo, 'actitud': act,
                    'motivo': 'este codigo de la sigla usa otra actitud',
                    'casos': ['%s %s casilla %d' % s for s in valores[act]],
                })
    return {'siglas': regla, 'excepciones': excepciones,
            'porCodigo': {str(k): v for k, v in sorted(actitud_por_codigo.items())}}


def fusionar_varact(ruta_varact, salida):
    doc = json.load(open(CATALOGO, encoding='utf-8'))
    prog = json.load(open(ruta_varact, encoding='utf-8'))
    idx = {(it['k'], it['v']): it for it in prog['variantes']}
    faltan = []
    no_vacias = 0
    for ki, esq in enumerate(doc['esquemas'], 1):
        for vi, var in enumerate(esq['variantes'], 1):
            it = idx.get((ki, vi))
            if not it:
                faltan.append('%s %s' % (esq['nombre'], var['nombre']))
                continue
            if len(it['actitudes']) != 11 or len(it['flechas']) != 11:
                raise SystemExit('lectura incompleta en %s %s' % (esq['nombre'], var['nombre']))
            for c, p in enumerate(var['puestos']):
                p['actitud'] = it['actitudes'][c]
            if all(b == 0 for grupo in it['flechas'] for b in grupo):
                var['flechas'] = 'vacias'
            else:
                no_vacias += 1
                var['flechas'] = 'por_puesto'
                for c, p in enumerate(var['puestos']):
                    p['flechas'] = it['flechas'][c]
    if faltan:
        raise SystemExit('faltan %d variantes: %s' % (len(faltan), ', '.join(faltan)))

    regla = calcular_regla(doc)
    doc['reglaActitud'] = dict(regla['siglas'])
    doc['reglaActitud']['excepciones'] = regla['excepciones']
    doc['varact'] = {
        'fuente': 'Segundo recorrido del menu Alineacion -> Cambio (mismo partido en pausa): cada '
                  'variante aplicada con x/down y lectura de prof/lat/pos (rec+112..143), flechas '
                  '(rec+147..234) y actitud defensiva (rec+243..253). No se escribio memoria.',
        'fecha': '2026-11-24',
        'registro': {'flechas': 'rec+147..234 (11 grupos de 8 bits)',
                     'actitud': 'rec+243..253 (0 Alto, 1 Normal, 2 Bajo)'},
        'variantesLeidas': len(idx),
        'variantesConFlechas': no_vacias,
        'actitudPorCodigo': regla['porCodigo'],
        'sinDato': sorted(s for s in set(SIGLAS.values())
                          if s not in doc['reglaActitud']),
    }
    guardar_json(salida, doc)
    print('escrito', salida)
    print('  reglaActitud:', ', '.join(
        '%s=%s' % (s, ACTITUDES[a]) for s, a in sorted(doc['reglaActitud'].items())
        if s != 'excepciones'))
    print('  excepciones:', len(doc['reglaActitud']['excepciones']),
          '| sin dato:', doc['varact']['sinDato'],
          '| variantes con flechas:', doc['varact']['variantesConFlechas'])


def main(argv):
    args = argv[1:]
    if '--desde-progreso' in args:
        i = args.index('--desde-progreso')
        prog = json.load(open(args[i + 1], encoding='utf-8'))
        salida = args[args.index('--salida') + 1] if '--salida' in args else CATALOGO
        construir(prog, salida)
        return 0
    if '--varact-merge' in args:
        i = args.index('--varact-merge')
        salida = args[args.index('--salida') + 1] if '--salida' in args else CATALOGO
        fusionar_varact(args[i + 1], salida)
        return 0
    if '--pid' not in args:
        print(__doc__ if __doc__ else 'uso: --pid <pid> --capturas <carpeta> --ejecutar')
        return 1
    pid = int(args[args.index('--pid') + 1])
    outdir = args[args.index('--capturas') + 1] if '--capturas' in args else 'varmap'
    k = int(args[args.index('--esquema') + 1]) if '--esquema' in args else 1
    v = int(args[args.index('--desde') + 1]) if '--desde' in args else 1
    varact = '--varact' in args
    if varact:
        limite = int(args[args.index('--limite') + 1]) if '--limite' in args else None
        if '--ejecutar' not in args:
            print('plan varact: %d variantes desde %s v=%d; sin --ejecutar no se envia ninguna tecla'
                  % (len(plan_varact()), ESQUEMAS[k - 1], v))
            return 0
        return recorrer_varact(pid, outdir, k, v, limite, '--sin-capturas' not in args)
    if '--ejecutar' not in args:
        print('plan: esquemas %d..8 desde %d; sin --ejecutar no se envia ninguna tecla' % (k, v))
        return 0
    return recorrer(pid, outdir, k, v)


if __name__ == '__main__':
    sys.exit(main(sys.argv))
