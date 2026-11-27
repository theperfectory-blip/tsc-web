// Analizador de capturas de memoria en vivo de PES5 (pantalla previa al partido).
//
// Compara capturas consecutivas de una carpeta con index.json + <label>.bin
// (0x30000 bytes de memoria del proceso desde `base`) y lista los bytes que
// cambiaron: agrupados por zona (registro de formacion de cada equipo o
// direccion absoluta), con la etiqueta del campo cuando se conoce (orden, ids,
// profundidad/lateral/posicion por slot, copias del orden) y con la lectura
// u16/float cuando es plausible. Si cambia el orden o la formacion de un equipo
// la decodifica con PES5_EDITOR.leerFormacionEquipo sobre una COPIA EN MEMORIA
// del save: nunca escribe el save ni la memoria del juego (solo lee).
//
// Los grupos que se repiten (mismo tramo) en TODAS las transiciones
// consecutivas (animaciones, temporizadores) se calculan sobre la serie
// completa y se marcan aparte como ruido.
//
// Uso:
//   node tools/pes5/live-map-analyze.js <carpeta> [--desde <label>] [--md <salida.md>]
//
//   <carpeta>  carpeta con index.json ([{label, desc, base, pid, t}]) y
//              <label>.bin. Las capturas se comparan en el orden del indice.
//   --desde    empieza en esa captura (incluida); la primera transicion usa su
//              predecesora igual. Por defecto, desde la primera.
//   --md       ademas del resumen por consola, escribe un informe markdown con
//              una seccion por captura.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { TextDecoder } = require('util');

const { descifrar } = require('./pes5-crypt.js');

const REPO = path.join(__dirname, '..', '..');
const JS_DIR = path.join(REPO, 'tsc-src', 'js');
const PES5_JSON_DIR = path.join(JS_DIR, 'pes5');

// Save real del juego. SOLO LECTURA: se descifra en memoria para decodificar
// las formaciones; este script no escribe ningun archivo del juego.
const SAVE_REAL = process.env.PES5_SAVE ||
  'C:/Users/Administrator/Documents/KONAMI/Pro Evolution Soccer 5/save/folder1/KONAMI-WIN32PES5OPT';

// Estructuras en vivo (direcciones virtuales, estables entre reinicios).
// A = byte 4 del registro de formacion del save: rec = A - 4.
const EQUIPOS = [
  { clave: 'FKC', club: 42, nombre: 'FK TUPADRE', A: 0x3956f62 },
  { clave: 'GAF', club: 5, nombre: 'GUARANI AF', A: 0x395bbb6 },
];
for (const eq of EQUIPOS) {
  eq.rec = eq.A - 4;
  eq.desde = eq.rec - 0x600;
  eq.hasta = eq.rec + 0x1600;
}

// Offsets dentro del registro (relativos a rec).
const REL_ORDEN = 4;   // 4..35: orden de alineacion (permutacion 0..31)
const REL_IDS = 36;    // 36..99: 32 ids u16 del plantel
const REL_FORM = 100;  // arranca el bloque de formacion del save
const REL_PROF = 112;  // FORM_OFF_REGISTRO + FORM_REL_DEPTH  (11 bytes)
const REL_LAT = 123;   // FORM_OFF_REGISTRO + FORM_REL_LATERAL (10 bytes; slots 1..10)
const REL_POS = 133;   // FORM_OFF_REGISTRO + FORM_REL_POS     (11 bytes)

// Copias del orden: A+0x38b y A+0x1004 (relativas a rec = A - 4).
const REL_COPIAS = [0x38f, 0x1008];
// Tramos que el coordinador ya vio cambiar y todavia no identifico (relativos a rec).
const REL_DESCONOCIDAS = [[0xce4, 0xd04], [0x1004, 0x1204]];

// Limites de salida.
const MAX_GRUPOS_EQUIPO = 120;
const MAX_GRUPOS_FUERA = 40;
const MAX_GRUPOS_EQUIPO_MD = 500;
const MAX_GRUPOS_FUERA_MD = 200;
const MAX_RUIDO_MD = 60;

// ---------- utilidades ----------
const hex = (n) => '0x' + n.toString(16);

function fmtRel(rel) {
  return rel >= 0 ? 'rec+' + rel : 'rec-0x' + (-rel).toString(16);
}
function fmtRangoRel(eq, relIni, relFin) {
  const fin = relFin === relIni ? '' : '..' + (relFin >= 0 ? '+' + relFin : '-0x' + (-relFin).toString(16));
  return eq.clave + ' ' + fmtRel(relIni) + fin;
}
function fmtListaBytes(vals) {
  if (vals.length === 1) return String(vals[0]);
  if (vals.length > 24) return '[' + vals.slice(0, 12).join(', ') + ', ... (+' + (vals.length - 12) + ')]';
  return '[' + vals.join(', ') + ']';
}
function fmtFloat(v) {
  if (!Number.isFinite(v)) return String(v);
  if (v === 0) return '0';
  const abs = Math.abs(v);
  const s = abs >= 1000 ? v.toFixed(1) : abs >= 1 ? v.toFixed(3) : v.toFixed(6);
  return s.replace(/0+$/, '').replace(/\.$/, '');
}

function leerIndex(carpeta) {
  const archivo = path.join(carpeta, 'index.json');
  if (!fs.existsSync(archivo)) throw new Error('no encuentro ' + archivo);
  const index = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  if (!Array.isArray(index) || !index.length) throw new Error('index.json no es una lista con capturas');
  return index;
}

function cargarCapturas(carpeta, index) {
  return index.map((it) => {
    if (!it || typeof it.label !== 'string') throw new Error('index.json: entrada sin "label"');
    const archivo = path.join(carpeta, it.label + '.bin');
    if (!fs.existsSync(archivo)) throw new Error('no encuentro ' + archivo);
    const base = typeof it.base === 'string' ? parseInt(it.base, 16) : Number(it.base);
    if (!Number.isFinite(base)) throw new Error('index.json: base invalida en ' + it.label);
    const buf = fs.readFileSync(archivo);
    return { label: it.label, desc: it.desc || '', base, pid: it.pid, t: it.t, buf, archivo };
  });
}

// ---------- etiquetas del registro ----------
// Devuelve { tipo, texto, base, etq, idx } (base/etq/idx solo en campos por slot).
function etiquetaRel(rel) {
  if (rel >= 0 && rel < REL_ORDEN) return { tipo: 'codigo', texto: 'codigo del club' };
  if (rel >= REL_ORDEN && rel < REL_IDS) {
    return { tipo: 'orden', base: 'orden', etq: 'casilla', idx: rel - REL_ORDEN, texto: 'orden[casilla ' + (rel - REL_ORDEN) + ']' };
  }
  if (rel >= REL_IDS && rel < REL_IDS + 64) {
    const k = rel - REL_IDS >> 1;
    return { tipo: 'ids', base: 'ids', etq: 'indice', idx: k, texto: 'ids[indice ' + k + ']' };
  }
  if (rel >= REL_FORM && rel < REL_PROF) return { tipo: 'sin-etiquetar', texto: 'formacion+' + (rel - REL_FORM) + ' (sin etiquetar)' };
  if (rel >= REL_PROF && rel < REL_PROF + 11) {
    return { tipo: 'prof', base: 'profundidad', etq: 'slot', idx: rel - REL_PROF, texto: 'profundidad[slot ' + (rel - REL_PROF) + ']' };
  }
  if (rel >= REL_LAT && rel < REL_LAT + 10) {
    return { tipo: 'lat', base: 'lateral', etq: 'slot', idx: rel - REL_LAT + 1, texto: 'lateral[slot ' + (rel - REL_LAT + 1) + ']' };
  }
  if (rel >= REL_POS && rel < REL_POS + 11) {
    return { tipo: 'pos', base: 'posicion', etq: 'slot', idx: rel - REL_POS, texto: 'posicion[slot ' + (rel - REL_POS) + ']' };
  }
  for (let c = 0; c < REL_COPIAS.length; c++) {
    const ini = REL_COPIAS[c];
    if (rel >= ini && rel < ini + 32) {
      const idx = rel - ini;
      return { tipo: 'copia', base: 'copia ' + (c + 2) + ' del orden', etq: 'casilla', idx, texto: 'copia ' + (c + 2) + ' del orden[casilla ' + idx + ']' };
    }
  }
  for (const [ini, fin] of REL_DESCONOCIDAS) {
    if (rel >= ini && rel < fin) return { tipo: 'desconocido', texto: 'A+' + hex(rel + 4) + ' (zona sin identificar)' };
  }
  if (rel < 0) return { tipo: 'sin-etiquetar', texto: fmtRel(rel) + ' (antes del registro)' };
  return { tipo: 'sin-etiquetar', texto: null };
}

// Comprime una tira de offsets en etiquetas legibles:
// "profundidad[slot 0..2]", "orden[casilla 9, 17]", "zona sin identificar"...
function describirCampos(relIni, relFin) {
  const partes = [];
  for (let rel = relIni; rel <= relFin; rel++) {
    const e = etiquetaRel(rel);
    const ult = partes[partes.length - 1];
    if (ult && ult.tipo === e.tipo) {
      if (e.idx != null && ult.idx != null) {
        if (e.idx === ult.idxFin) continue; // los dos bytes del mismo u16
        if (e.idx === ult.idxFin + 1) { ult.idxFin = e.idx; continue; }
        // mismo campo por slot pero salto: se listan las casillas sueltas
        ult.huecos = true;
        ult.idxs.push(e.idx);
        ult.idxFin = e.idx;
        continue;
      }
      if (e.idx == null && ult.idx == null) { ult.relFin = rel; continue; }
    }
    partes.push({ tipo: e.tipo, base: e.base, etq: e.etq, idx: e.idx, idxFin: e.idx, idxs: e.idx != null ? [e.idx] : null, rel, relFin: rel, texto: e.texto });
  }
  return partes.map((p) => {
    if (p.idx == null) return p.texto;
    if (p.huecos) return p.base + '[' + p.etq + ' ' + p.idxs.join(', ') + ']';
    return p.base + '[' + p.etq + ' ' + p.idx + (p.idxFin > p.idx ? '..' + p.idxFin : '') + ']';
  }).filter((t) => !!t);
}

// ---------- lectura de bytes de una captura ----------
function byteEn(cap, va) {
  const i = va - cap.base;
  return i >= 0 && i < cap.buf.length ? cap.buf[i] : null;
}
function u16En(cap, va) {
  const i = va - cap.base;
  if (i < 0 || i + 1 >= cap.buf.length) return null;
  return cap.buf[i] | (cap.buf[i + 1] << 8);
}
const _f32 = Buffer.alloc(4);
function f32En(cap, va) {
  const i = va - cap.base;
  if (i < 0 || i + 3 >= cap.buf.length) return null;
  cap.buf.copy(_f32, 0, i, i + 4);
  return _f32.readFloatLE(0);
}
function u16Plausible(v) { return v != null && v >= 0 && v <= 9999; }
function floatPlausible(v) { return v != null && Number.isFinite(v) && Math.abs(v) >= 1e-4 && Math.abs(v) <= 1e5; }

// ---------- comparacion ----------
function zonaDe(va) {
  for (const eq of EQUIPOS) if (va >= eq.desde && va <= eq.hasta) return eq;
  return null;
}

function cambiosEntre(prev, cur) {
  const cambios = [];
  const ini = Math.max(prev.base, cur.base);
  const fin = Math.min(prev.base + prev.buf.length, cur.base + cur.buf.length);
  for (let va = ini; va < fin; va++) {
    const a = prev.buf[va - prev.base];
    const b = cur.buf[va - cur.base];
    if (a !== b) cambios.push({ va, antes: a, despues: b });
  }
  return cambios;
}

// Agrupa bytes cambiados contiguos dentro de la misma zona.
function agrupar(cambios) {
  const grupos = [];
  let actual = null;
  for (const c of cambios) {
    const eq = zonaDe(c.va);
    if (actual && c.va === actual.vaFin + 1 && actual.eq === eq) {
      actual.vaFin = c.va;
      actual.bytes.push(c);
      if (eq) actual.relFin = c.va - eq.rec;
      continue;
    }
    actual = {
      eq,
      vaIni: c.va,
      vaFin: c.va,
      relIni: eq ? c.va - eq.rec : null,
      relFin: eq ? c.va - eq.rec : null,
      bytes: [c],
    };
    grupos.push(actual);
  }
  return grupos;
}

// Lecturas alternativas (u16 / float) cuando son plausibles.
function lecturasExtra(g, prev, cur) {
  const tipos = new Set(g.eq ? g.bytes.map((b) => etiquetaRel(b.va - g.eq.rec).tipo) : ['desconocido']);
  const soloIds = tipos.size === 1 && tipos.has('ids');
  const campoByte = g.eq && [...tipos].every((t) => ['codigo', 'orden', 'prof', 'lat', 'pos', 'copia'].includes(t));
  const out = [];
  if (soloIds || !campoByte) {
    const p16 = g.vaIni - (g.vaIni % 2);
    if (g.vaFin <= p16 + 1) {
      const a = u16En(prev, p16), b = u16En(cur, p16);
      if (a != null && b != null && a !== b && (soloIds || u16Plausible(a) || u16Plausible(b))) {
        out.push('u16@' + hex(p16) + ' ' + a + ' -> ' + b);
      }
    }
  }
  if (!soloIds && !campoByte) {
    const p32 = g.vaIni - (g.vaIni % 4);
    if (g.vaFin <= p32 + 3) {
      const a = f32En(prev, p32), b = f32En(cur, p32);
      if (floatPlausible(a) || floatPlausible(b)) out.push('float@' + hex(p32) + ' ' + fmtFloat(a) + ' -> ' + fmtFloat(b));
    }
  }
  return out;
}

function datosRun(g, prev, cur) {
  const campos = g.eq ? describirCampos(g.relIni, g.relFin) : [];
  const offset = g.eq
    ? fmtRangoRel(g.eq, g.relIni, g.relFin)
    : hex(g.vaIni) + (g.vaFin > g.vaIni ? '..' + hex(g.vaFin) : '');
  return {
    offset,
    campos,
    antes: g.bytes.map((b) => b.antes),
    despues: g.bytes.map((b) => b.despues),
    extras: lecturasExtra(g, prev, cur),
  };
}

// ---------- formacion (PES5_EDITOR sobre una copia en memoria del save) ----------
function cargarEditor() {
  const src = fs.readFileSync(path.join(JS_DIR, 'pes5-editor.js'), 'utf8');
  const sandbox = {
    console,
    TextDecoder,
    fetch: async (url) => {
      const nombre = url.split('/').pop();
      const archivo = path.join(PES5_JSON_DIR, nombre);
      return { json: async () => JSON.parse(fs.readFileSync(archivo, 'utf8')) };
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(src + '\nthis.__PES5_EDITOR__ = PES5_EDITOR;', sandbox, { filename: 'pes5-editor.js' });
  return sandbox.__PES5_EDITOR__;
}

async function prepararEditor(ctx) {
  if (ctx.editor || ctx.avisoEditor) return ctx.editor;
  try {
    ctx.editor = cargarEditor();
    await ctx.editor.cargarMapa('./');
    await ctx.editor.cargarNombresEquipos('./');
  } catch (e) {
    ctx.editor = null;
    ctx.avisoEditor = 'no se pudo cargar PES5_EDITOR: ' + (e && e.message ? e.message : e);
  }
  return ctx.editor;
}

function prepararSave(ctx) {
  if (ctx.plano || ctx.avisoSave) return ctx.plano;
  try {
    if (!fs.existsSync(SAVE_REAL)) throw new Error('no existe ' + SAVE_REAL);
    ctx.plano = Buffer.from(descifrar(fs.readFileSync(SAVE_REAL)));
  } catch (e) {
    ctx.plano = null;
    ctx.avisoSave = 'no se pudo leer el save: ' + (e && e.message ? e.message : e);
  }
  return ctx.plano;
}

function leerOrden(cap, eq) {
  const out = [];
  for (let k = 0; k < 32; k++) {
    const v = byteEn(cap, eq.rec + REL_ORDEN + k);
    if (v == null) return null;
    out.push(v);
  }
  return out;
}
function leerIds(cap, eq) {
  const out = [];
  for (let k = 0; k < 32; k++) {
    const v = u16En(cap, eq.rec + REL_IDS + k * 2);
    if (v == null) return null;
    out.push(v);
  }
  return out;
}
function esPermutacion32(v) {
  if (!v || v.length !== 32) return false;
  const visto = new Uint8Array(32);
  for (const x of v) {
    if (x >= 32 || visto[x]) return false;
    visto[x] = 1;
  }
  return true;
}

// Decodifica la formacion EN VIVO: los bytes del registro (orden + formacion)
// y los ids del plantel se copian a una copia en memoria del save y se leen con
// PES5_EDITOR.leerFormacionEquipo. El plantel de la copia se reordena segun el
// orden en vivo (casilla -> indice en el plantel) para que "posicion: jugador"
// corresponda de verdad.
async function decodificarFormacion(ctx, eq, cap) {
  const E = await prepararEditor(ctx);
  const plano = prepararSave(ctx);
  if (!E || !plano) return { error: ctx.avisoEditor || ctx.avisoSave };

  const orden = leerOrden(cap, eq);
  const ids = leerIds(cap, eq);
  if (!orden || !ids) return { error: 'la captura no cubre el registro de ' + eq.clave };

  const perm = esPermutacion32(orden);
  const copia = Buffer.from(plano);
  const rosterBase = 667458 + eq.club * 64; // ROSTER_BASE de pes5-editor.js
  for (let s = 0; s < 32; s++) {
    const idx = perm ? orden[s] : s;
    copia.writeUInt16LE((ids[idx] || 0) & 0xFFFF, rosterBase + s * 2);
  }
  const recSave = 716932 + eq.club * 628; // FORM_REGISTRO_BASE de pes5-editor.js
  for (let k = REL_PROF; k < REL_PROF + 32; k++) {
    const v = byteEn(cap, eq.rec + k);
    if (v != null) copia[recSave + k] = v;
  }

  const f = E.leerFormacionEquipo(copia, eq.club);
  let slots, esquema, aviso = null;
  if (f) {
    if (f.offset !== recSave) aviso = 'leerFormacionEquipo devolvio otro registro (0x' + f.offset.toString(16) + ' en vez de 0x' + recSave.toString(16) + ')';
    slots = f.slots.map((s) => ({
      slot: s.slot,
      jugador: s.jugador,
      nombre: s.jugador ? (E.nombreDeRegistro(copia, s.jugador) || '#' + s.jugador) : 'vacio',
      prof: s.prof,
      lat: s.lat,
      pos: s.pos,
      posNombre: s.posNombre || E.nomPosicion(s.pos),
    }));
    esquema = f.nombre;
  } else {
    // Respaldo: mismos datos leidos directo de la captura.
    slots = [];
    for (let s = 0; s < 11; s++) {
      const id = ids[perm ? orden[s] : s] || null;
      slots.push({
        slot: s,
        jugador: id,
        nombre: id ? (E.nombreDeRegistro(copia, id) || '#' + id) : 'vacio',
        prof: byteEn(cap, eq.rec + REL_PROF + s),
        lat: s === 0 ? null : byteEn(cap, eq.rec + REL_LAT + s - 1),
        pos: byteEn(cap, eq.rec + REL_POS + s),
        posNombre: E.nomPosicion(byteEn(cap, eq.rec + REL_POS + s)),
      });
    }
    esquema = E.nombreFormacion(slots.map((s) => ({ slot: s.slot, prof: s.prof })));
    aviso = 'leerFormacionEquipo no encontro el registro del club en el save; esquema calculado con los bytes en vivo';
  }
  return { esquema, perm, slots, aviso };
}

// ---------- serie ----------
function construirSerie(caps, desdeLabel) {
  let desde = 0;
  if (desdeLabel) {
    desde = caps.findIndex((c) => c.label === desdeLabel);
    if (desde < 0) throw new Error('no existe la captura "' + desdeLabel + '" (hay: ' + caps.map((c) => c.label).join(', ') + ')');
  }
  const transiciones = [];
  for (let i = Math.max(desde, 1); i < caps.length; i++) {
    const cambios = cambiosEntre(caps[i - 1], caps[i]);
    transiciones.push({ antes: caps[i - 1], despues: caps[i], cambios, grupos: agrupar(cambios) });
  }
  return { desde, transiciones };
}

// Un grupo se identifica por su zona y su tramo exacto. Se considera ruido
// (animaciones, temporizadores) si el MISMO tramo cambia en todas las
// transiciones consecutivas de la serie.
function claveGrupo(g) {
  const zona = g.eq ? g.eq.clave : 'abs';
  const ini = g.eq ? g.relIni : g.vaIni;
  return zona + ':' + ini + ':' + (g.vaFin - g.vaIni);
}

function detectarRuido(transiciones) {
  if (transiciones.length < 2) return { claves: new Set(), ejemplos: new Map() };
  let inter = new Set(transiciones[0].grupos.map(claveGrupo));
  for (let i = 1; i < transiciones.length; i++) {
    const set = new Set(transiciones[i].grupos.map(claveGrupo));
    inter = new Set([...inter].filter((k) => set.has(k)));
  }
  const ejemplos = new Map();
  for (const g of transiciones[0].grupos) {
    const k = claveGrupo(g);
    if (inter.has(k) && !ejemplos.has(k)) ejemplos.set(k, g);
  }
  return { claves: inter, ejemplos };
}

function textoRuido(ruido) {
  const out = [];
  for (const g of ruido.ejemplos.values()) {
    if (g.eq) {
      const c = describirCampos(g.relIni, g.relFin).join(', ');
      out.push(fmtRangoRel(g.eq, g.relIni, g.relFin) + (c ? ' (' + c + ')' : '') + ' [' + g.bytes.length + ' b]');
    } else {
      out.push(hex(g.vaIni) + (g.vaFin > g.vaIni ? '..' + hex(g.vaFin) : '') + ' [' + g.bytes.length + ' b]');
    }
  }
  return out;
}

// ---------- informe ----------
async function analizar(carpeta, caps, transiciones, posibles, ruido, ctx) {
  const lineas = [];      // consola
  const md = [];          // markdown
  const avisos = [];

  const base = caps[0].base;
  const basesDistintas = caps.some((c) => c.base !== base);
  if (basesDistintas) avisos.push('AVISO: las capturas no comparten el mismo "base"; se comparan por direccion virtual en el tramo comun.');
  const tamDistinto = caps.some((c) => c.buf.length !== caps[0].buf.length);
  if (tamDistinto) avisos.push('AVISO: las capturas no miden lo mismo; se comparan hasta el tramo comun.');

  lineas.push('Carpeta: ' + carpeta);
  lineas.push('Capturas: ' + caps.length + ' (' + caps.map((c) => c.label).join(' > ') + ')');
  lineas.push('Base: ' + hex(base) + '   ' + hex(caps[0].buf.length) + ' b por captura' + (basesDistintas ? ' (bases distintas)' : ''));
  for (const eq of EQUIPOS) {
    lineas.push(eq.clave + ': club ' + eq.club + ' (' + eq.nombre + ')  rec = ' + hex(eq.rec) +
      '   zona ' + hex(eq.desde) + '..' + hex(eq.hasta));
  }
  if (transiciones.length) {
    const bytesRuido = [...ruido.ejemplos.values()].reduce((s, g) => s + g.bytes.length, 0);
    lineas.push('Ruido: ' + ruido.claves.size + ' grupo(s) (' + bytesRuido + ' b) que cambian en TODAS las ' +
      transiciones.length + ' transiciones (se omiten)');
  } else {
    lineas.push('Ruido: no hay transiciones (hace falta mas de una captura)');
  }
  for (const a of avisos) lineas.push(a);

  md.push('# Capturas de memoria PES5 - pantalla previa al partido', '');
  md.push('- Carpeta: `' + carpeta.replace(/\\/g, '/') + '`');
  md.push('- Capturas: ' + caps.length + ' (' + caps.map((c) => '`' + c.label + '`').join(' > ') + ')');
  md.push('- Base: `' + hex(base) + '`, ' + hex(caps[0].buf.length) + ' b por captura');
  for (const eq of EQUIPOS) {
    md.push('- ' + eq.clave + ': club ' + eq.club + ' (' + eq.nombre + '), rec = `' + hex(eq.rec) + '`, zona `' + hex(eq.desde) + '..' + hex(eq.hasta) + '`');
  }
  if (ruido.claves.size) {
    const txt = textoRuido(ruido);
    md.push('- Ruido (mismo tramo cambiado en todas las transiciones): ' + ruido.claves.size + ' grupo(s)');
    for (const r of txt.slice(0, MAX_RUIDO_MD)) md.push('  - `' + r + '`');
    if (txt.length > MAX_RUIDO_MD) md.push('  - ... y ' + (txt.length - MAX_RUIDO_MD) + ' mas (ver consola por transicion)');
  } else if (transiciones.length) {
    md.push('- Ruido: ninguno');
  }
  for (const a of avisos) md.push('- ' + a);
  md.push('');

  // Estado inicial (primera captura analizada).
  const primera = caps[0];
  const estadoInicial = [];
  for (const eq of EQUIPOS) {
    const d = await decodificarFormacion(ctx, eq, primera);
    estadoInicial.push({ eq, d });
  }
  lineas.push('');
  if (estadoInicial.some((x) => x.d && x.d.esquema)) {
    lineas.push('Estado inicial (' + primera.label + '): ' + estadoInicial.map((x) =>
      x.eq.clave + ' ' + (x.d && x.d.esquema ? x.d.esquema : '?')).join('  |  '));
  }
  md.push('## ' + primera.label, '');
  md.push('`' + (primera.t || '') + '` · pid ' + (primera.pid || '?'), '');
  if (primera.desc) md.push('desc: ' + primera.desc, '');
  for (const { eq, d } of estadoInicial) {
    if (!d || !d.esquema) { md.push('**' + eq.clave + '**: sin decodificar' + (d && d.error ? ' (' + d.error + ')' : '')); continue; }
    md.push('**' + eq.clave + '** linea inicial: **' + d.esquema + '**');
    md.push('');
    md.push(listaSlotsMd(d.slots));
    md.push('');
  }

  let totalTransiciones = 0;
  for (const tr of transiciones) {
    totalTransiciones++;
    const prev = tr.antes, cur = tr.despues;
    const grupos = tr.grupos;
    const relevantes = [];
    const ruidoGrupos = [];
    for (const g of grupos) {
      if (ruido.claves.has(claveGrupo(g))) ruidoGrupos.push(g);
      else relevantes.push(g);
    }
    const deEquipo = (clave) => relevantes.filter((g) => g.eq && g.eq.clave === clave);
    const fuera = relevantes.filter((g) => !g.eq);
    const bytesEq = (clave) => deEquipo(clave).reduce((s, g) => s + g.bytes.length, 0);
    const bytesFuera = fuera.reduce((s, g) => s + g.bytes.length, 0);

    const cabecera = cur.label + ' (t ' + (cur.t || '?') + ', pid ' + (cur.pid || '?') + ')';
    lineas.push('');
    lineas.push('='.repeat(78));
    lineas.push(cabecera);
    if (cur.desc) lineas.push('desc: ' + cur.desc);
    lineas.push('vs ' + prev.label + ': ' + tr.cambios.length + ' byte(s) cambiado(s) - ' +
      bytesEq('FKC') + ' en FKC, ' + bytesEq('GAF') + ' en GAF, ' + bytesFuera + ' fuera de los equipos');

    md.push('## ' + cur.label, '');
    md.push('`' + (cur.t || '?') + '` · pid ' + (cur.pid || '?'));
    md.push('');
    if (cur.desc) md.push('desc: ' + cur.desc, '');
    md.push('**vs ' + prev.label + '**', '');
    md.push(tr.cambios.length + ' byte(s) cambiado(s): ' + bytesEq('FKC') + ' en FKC, ' + bytesEq('GAF') + ' en GAF, ' +
      bytesFuera + ' fuera de los equipos.', '');

    for (const eq of EQUIPOS) {
      const listaEq = deEquipo(eq.clave);
      const cambioOrden = listaEq.some((g) => g.bytes.some((b) => {
        const rel = b.va - eq.rec;
        return ['orden', 'prof', 'lat', 'pos'].includes(etiquetaRel(rel).tipo);
      }));
      if (listaEq.length) {
        const bytes = listaEq.reduce((s, g) => s + g.bytes.length, 0);
        lineas.push('  ' + eq.clave + ': ' + bytes + ' byte(s) en ' + listaEq.length + ' grupo(s)');
        md.push('### ' + eq.clave + ' (' + bytes + ' b en ' + listaEq.length + ' grupo(s))', '');
        listaEq.slice(0, Math.max(MAX_GRUPOS_EQUIPO, MAX_GRUPOS_EQUIPO_MD)).forEach((g, i) => {
          const d = datosRun(g, prev, cur);
          if (i < MAX_GRUPOS_EQUIPO) lineas.push(lineaGrupo(d));
          if (i < MAX_GRUPOS_EQUIPO_MD) md.push(lineaGrupoMd(d));
        });
        if (listaEq.length > MAX_GRUPOS_EQUIPO) {
          lineas.push('    ... y ' + (listaEq.length - MAX_GRUPOS_EQUIPO) + ' grupo(s) mas (ver informe --md)');
        }
        if (listaEq.length > MAX_GRUPOS_EQUIPO_MD) {
          md.push('- ... y ' + (listaEq.length - MAX_GRUPOS_EQUIPO_MD) + ' grupo(s) mas');
        }
        md.push('');
      }
      if (cambioOrden) {
        const d = await decodificarFormacion(ctx, eq, cur);
        if (d && d.esquema) {
          const permTxt = d.perm ? 'permutacion valida' : 'ORDEN INVALIDO (no es una permutacion de 0..31)';
          lineas.push('  Formacion ' + eq.clave + ' tras el cambio: ' + d.esquema + ' (' + permTxt + ')');
          lineas.push('    ' + d.slots.map((s) => (s.posNombre || 'cod' + s.pos) + ': ' + s.nombre).join(' | '));
          md.push('**Formacion ' + eq.clave + ' tras el cambio: ' + d.esquema + '** (' + permTxt + ')', '');
          md.push(listaSlotsMd(d.slots));
          md.push('');
          if (d.aviso) {
            lineas.push('    aviso: ' + d.aviso);
            md.push('_Aviso: ' + d.aviso + '_', '');
          }
        } else {
          const msg = 'no se pudo decodificar la formacion de ' + eq.clave + (d && d.error ? ': ' + d.error : '');
          lineas.push('  ' + msg);
          md.push('_' + msg + '_', '');
        }
      }
    }

    if (fuera.length) {
      lineas.push('  fuera de los equipos: ' + bytesFuera + ' byte(s) en ' + fuera.length + ' grupo(s)');
      md.push('### Fuera de los equipos (' + bytesFuera + ' b en ' + fuera.length + ' grupo(s))', '');
      fuera.slice(0, Math.max(MAX_GRUPOS_FUERA, MAX_GRUPOS_FUERA_MD)).forEach((g, i) => {
        const d = datosRun(g, prev, cur);
        if (i < MAX_GRUPOS_FUERA) lineas.push(lineaGrupo(d));
        if (i < MAX_GRUPOS_FUERA_MD) md.push(lineaGrupoMd(d));
      });
      if (fuera.length > MAX_GRUPOS_FUERA) {
        lineas.push('    ... y ' + (fuera.length - MAX_GRUPOS_FUERA) + ' grupo(s) mas (ver informe --md)');
      }
      if (fuera.length > MAX_GRUPOS_FUERA_MD) {
        md.push('- ... y ' + (fuera.length - MAX_GRUPOS_FUERA_MD) + ' grupo(s) mas');
      }
      md.push('');
    }
    if (!relevantes.length) {
      lineas.push('  (sin cambios relevantes)');
      md.push('_Sin cambios relevantes._', '');
    }
    if (ruidoGrupos.length) {
      lineas.push('  ruido: ' + ruidoGrupos.length + ' grupo(s) omitido(s)');
      md.push('_Ruido: ' + ruidoGrupos.length + ' grupo(s) omitido(s)._', '');
    }
  }

  if (!transiciones.length) {
    lineas.push('');
    lineas.push('No hay comparaciones: hace falta al menos una captura y su predecesora.');
    md.push('_No hay comparaciones: hace falta al menos dos capturas._', '');
  } else {
    lineas.push('');
    lineas.push('Transiciones analizadas: ' + totalTransiciones + ' de ' + posibles + ' posibles.');
  }
  return { lineas, md };
}
function lineaGrupo(d) {
  const campos = d.campos.length ? ' (' + d.campos.join(', ') + ')' : '';
  const extra = d.extras.length ? '   ' + d.extras.join(' · ') : '';
  return '    ' + d.offset + campos + ': ' + fmtListaBytes(d.antes) + ' -> ' + fmtListaBytes(d.despues) + extra;
}
function lineaGrupoMd(d) {
  const campos = d.campos.length ? ' (' + d.campos.join(', ') + ')' : '';
  const extra = d.extras.length ? ' · ' + d.extras.join(' · ') : '';
  return '- `' + d.offset + '`' + campos + ': ' + fmtListaBytes(d.antes) + ' -> ' + fmtListaBytes(d.despues) + extra;
}
function listaSlotsMd(slots) {
  return (slots || []).map((s) => (s.posNombre || 'cod' + s.pos) + ': ' + s.nombre).join(' · ');
}

// ---------- CLI ----------
function parseArgs(argv) {
  const out = { carpeta: null, desde: null, md: null };
  const resto = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--desde') { out.desde = argv[++i]; if (!out.desde) return { error: '--desde necesita un label' }; }
    else if (a === '--md') { out.md = argv[++i]; if (!out.md) return { error: '--md necesita un archivo de salida' }; }
    else if (a === '-h' || a === '--help') return { ayuda: true };
    else if (a.startsWith('--')) return { error: 'opcion desconocida: ' + a };
    else resto.push(a);
  }
  out.carpeta = resto[0];
  if (!out.carpeta) return { error: 'falta la carpeta de capturas' };
  if (resto.length > 1) return { error: 'sobra un argumento: ' + resto[1] };
  return out;
}

const USO = 'uso: node tools/pes5/live-map-analyze.js <carpeta> [--desde <label>] [--md <salida.md>]';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.ayuda) { console.log(USO); return; }
  if (args.error) { console.error('ERROR: ' + args.error); console.error(USO); process.exitCode = 1; return; }

  const carpeta = path.resolve(args.carpeta);
  if (!fs.existsSync(carpeta) || !fs.statSync(carpeta).isDirectory()) {
    console.error('ERROR: no existe la carpeta ' + carpeta);
    process.exitCode = 1;
    return;
  }

  let caps, serie, ruido;
  try {
    const index = leerIndex(carpeta);
    caps = cargarCapturas(carpeta, index);
    serie = construirSerie(caps, args.desde);
    ruido = detectarRuido(serie.transiciones);
  } catch (e) {
    console.error('ERROR: ' + (e && e.message ? e.message : e));
    process.exitCode = 1;
    return;
  }

  const ctx = { editor: null, plano: null, avisoEditor: null, avisoSave: null };
  // Con --desde se analiza desde esa captura en adelante; las comparaciones
  // arrancan en la primera captura analizada que tiene predecesora.
  const analizadas = caps.slice(serie.desde);
  const posibles = caps.length - Math.max(serie.desde, 1);
  const { lineas, md } = await analizar(carpeta, analizadas, serie.transiciones, posibles, ruido, ctx);
  console.log(lineas.join('\n'));

  if (args.md) {
    const salida = path.resolve(args.md);
    fs.mkdirSync(path.dirname(salida), { recursive: true });
    fs.writeFileSync(salida, md.join('\n') + '\n', 'utf8');
    console.log('');
    console.log('Informe markdown: ' + salida);
  }
}

main().catch((e) => {
  console.error('ERROR: ' + (e && e.stack ? e.stack : e));
  process.exitCode = 1;
});
