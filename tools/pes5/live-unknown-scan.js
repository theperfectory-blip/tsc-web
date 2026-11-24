// Escáner de bytes pendientes del registro en vivo de PES5.
//
// Recorre TODA una serie de capturas de memoria (carpeta con index.json y
// <label>.bin, 0x30000 bytes desde `base`) y, para cada byte o rango pedido,
// muestra: valor en cada captura, cuándo cambia (con la `desc` de la captura,
// que es la acción que hizo el coordinador justo antes) y, en las zonas
// marcadas como interfaz, si cambian sin que cambie ningún ajuste conocido.
//
// SOLO LECTURA: abre los .bin y no escribe nada fuera del informe que se le
// pida con --md.
//
// Uso:
//   node tools/pes5/live-unknown-scan.js <carpeta> [opciones]
//
//   --md <archivo>      además del resumen por consola, escribe markdown.
//   --campo <spec>      byte o rango a seguir (repetible). Formatos:
//                         rec+104        byte relativo a rec
//                         rec-20         byte anterior a rec
//                         rec+641..642   rango relativo inclusive
//                       Por defecto usa la lista de la tarea PESMAP4.
//   --zona <spec>       zona amplia a auditar (repetible), mismo formato.
//                       Por defecto: rec+2900..rec+3200 y rec+5490..rec+5540.
//   --equipo <clave>    FKC, GAF o AMBOS (por defecto AMBOS).
//   --solo-cambios      no imprime el estado de cada captura, solo los cambios.
//
// Las capturas se comparan en el orden de index.json (el que grabó el
// coordinador). No se interpreta nada aquí: el informe con las
// interpretaciones está en docs/pes5/mapa-vivo/SIN_IDENTIFICAR.md.
const fs = require('fs');
const path = require('path');

// Mismas direcciones que live-map-analyze.js (estables entre reinicios).
// rec = inicio del registro de formacion de 628 bytes en memoria.
const EQUIPOS = [
  { clave: 'FKC', club: 42, nombre: 'FK TUPADRE', rec: 0x3956f5e },
  { clave: 'GAF', club: 5, nombre: 'GUARANI AF', rec: 0x395bbb2 },
];

// Lista de la tarea PESMAP4.
const CAMPOS_POR_DEFECTO = [
  'rec+104', 'rec+283', 'rec+639', 'rec+641..642', 'rec+645', 'rec+658',
  'rec+661', 'rec+675', 'rec+678', 'rec+679', 'rec+724..766', 'rec-40..rec-1',
];
const ZONAS_POR_DEFECTO = ['rec+2900..rec+3200', 'rec+5490..rec+5540'];

// Campos del registro que ya estan identificados (NOTAS.md / PESMAP1-3):
// orden, ids, cabecera y los tres bloques de 171 bytes. Si en una transicion
// no cambia ninguno, lo que cambie en las zonas de interfaz es solo pantalla.
const TRAMOS_CONOCIDOS = [
  [4, 36],      // orden de alineacion
  [36, 100],    // ids del plantel
  [100, 112],   // cabecera (botones, modo, lanzadores, capitan)
  [112, 283],   // bloque principal
  [283, 454],   // alineacion A
  [454, 625],   // alineacion B
];

function uso() {
  return [
    'uso: node tools/pes5/live-unknown-scan.js <carpeta> [--md <salida.md>]',
    '       [--campo <spec>]... [--zona <spec>]... [--equipo FKC|GAF|AMBOS] [--solo-cambios]',
    '',
    'spec: rec+104 | rec-20 | rec+641..642 | rec-40..rec-1',
  ].join('\n');
}

function parseSpec(spec) {
  const m = /^rec([+-]\d+)(?:\.\.(?:rec)?([+-]?\d+))?$/.exec(String(spec).trim());
  if (!m) throw new Error('spec invalida: ' + spec + ' (usa rec+104, rec-20 o rec+641..642)');
  const ini = Number(m[1]);
  const fin = m[2] != null ? Number(m[2]) : ini;
  if (!Number.isFinite(ini) || !Number.isFinite(fin)) throw new Error('numero invalido en ' + spec);
  if (fin < ini) throw new Error('rango invertido en ' + spec);
  return { ini, fin, texto: spec };
}

function parseArgs(argv) {
  const out = {
    carpeta: null,
    md: null,
    campos: [],
    zonas: [],
    equipo: 'AMBOS',
    soloCambios: false,
    ayuda: false,
  };
  let posicional = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') out.ayuda = true;
    else if (a === '--md') { out.md = argv[++i]; if (!out.md) throw new Error('--md necesita un archivo'); }
    else if (a === '--campo') { const v = argv[++i]; if (!v) throw new Error('--campo necesita un spec'); out.campos.push(v); }
    else if (a === '--zona') { const v = argv[++i]; if (!v) throw new Error('--zona necesita un spec'); out.zonas.push(v); }
    else if (a === '--equipo') {
      const v = String(argv[++i] || '').toUpperCase();
      if (!['FKC', 'GAF', 'AMBOS'].includes(v)) throw new Error('--equipo debe ser FKC, GAF o AMBOS');
      out.equipo = v;
    } else if (a === '--solo-cambios') out.soloCambios = true;
    else if (a.startsWith('--')) throw new Error('opcion desconocida: ' + a);
    else if (!posicional) posicional = a;
    else throw new Error('sobra un argumento: ' + a);
  }
  out.carpeta = posicional || process.env.PESMAP_SERIE || null;
  if (!out.campos.length) out.campos = CAMPOS_POR_DEFECTO.slice();
  if (!out.zonas.length) out.zonas = ZONAS_POR_DEFECTO.slice();
  return out;
}

function fmtRec(rel) {
  return 'rec' + (rel >= 0 ? '+' : '-') + Math.abs(rel);
}
function fmtRango(relIni, relFin) {
  return relIni === relFin ? fmtRec(relIni) : fmtRec(relIni) + '..' + fmtRec(relFin);
}
function hex(n) {
  return '0x' + (n >>> 0).toString(16);
}
function comprimirTramo(vals) {
  // [0,0,0,1,1,2] -> [{v:0,n:3},{v:1,n:2},{v:2,n:1}]
  const out = [];
  for (const v of vals) {
    const ult = out[out.length - 1];
    if (ult && ult.v === v) ult.n++;
    else out.push({ v, n: 1 });
  }
  return out;
}
function fmtValores(vals) {
  if (vals.length === 1) return String(vals[0]);
  return '[' + vals.join(', ') + ']';
}

function leerIndex(carpeta) {
  const archivo = path.join(carpeta, 'index.json');
  if (!fs.existsSync(archivo)) throw new Error('no encuentro ' + archivo);
  const index = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  if (!Array.isArray(index) || !index.length) throw new Error('index.json no es una lista con capturas');
  return index;
}

function cargarCapturas(carpeta, index) {
  return index.map((it, orden) => {
    if (!it || typeof it.label !== 'string') throw new Error('index.json: entrada sin "label"');
    const archivo = path.join(carpeta, it.label + '.bin');
    if (!fs.existsSync(archivo)) throw new Error('no encuentro ' + archivo);
    const buf = fs.readFileSync(archivo);
    const base = typeof it.base === 'string' ? parseInt(it.base, 16) : Number(it.base);
    if (!Number.isFinite(base)) throw new Error('index.json: base invalida en ' + it.label);
    return { label: it.label, desc: it.desc || '', t: it.t || '', pid: it.pid, base, buf, orden };
  });
}

function byteEn(cap, va) {
  const i = va - cap.base;
  return i >= 0 && i < cap.buf.length ? cap.buf[i] : null;
}

function equipoPorClave(clave) {
  return EQUIPOS.find((e) => e.clave === clave);
}

function equiposPedidos(sel) {
  return sel === 'AMBOS' ? EQUIPOS : [equipoPorClave(sel)];
}

// ---------- análisis de campos puntuales ----------
function analizarCampo(caps, eq, spec) {
  const vals = caps.map((c) => {
    const out = [];
    for (let r = spec.ini; r <= spec.fin; r++) out.push(byteEn(c, eq.rec + r));
    return out;
  });
  const desconocido = vals.some((v) => v.some((x) => x == null));
  const cambios = [];
  for (let i = 1; i < caps.length; i++) {
    const antes = vals[i - 1];
    const despues = vals[i];
    if (antes.some((v, k) => v !== despues[k])) cambios.push({ i, antes, despues });
  }
  const runs = [];
  for (let i = 0; i < caps.length; i++) {
    const ult = runs[runs.length - 1];
    if (ult && ult.vals.length === vals[i].length && ult.vals.every((v, k) => v === vals[i][k])) {
      ult.hasta = caps[i].label;
    } else {
      runs.push({ vals: vals[i], desde: caps[i].label, hasta: caps[i].label });
    }
  }
  return { spec, vals, cambios, runs, desconocido };
}

function esCambioConocido(prev, cur, eq) {
  for (const [ini, fin] of TRAMOS_CONOCIDOS) {
    for (let r = ini; r < fin; r++) {
      if (byteEn(prev, eq.rec + r) !== byteEn(cur, eq.rec + r)) return true;
    }
  }
  // cola de cambios en pausa (entra/sale/contador)
  for (let r = -24; r < 0; r++) {
    if (byteEn(prev, eq.rec + r) !== byteEn(cur, eq.rec + r)) return true;
  }
  return false;
}

// ---------- auditoría de zonas (interfaz) ----------
function analizarZona(caps, eq, spec) {
  const transiciones = [];
  let totalBytes = 0;
  let totalTransiciones = 0;
  for (let i = 1; i < caps.length; i++) {
    const prev = caps[i - 1];
    const cur = caps[i];
    const cambiados = [];
    for (let r = spec.ini; r <= spec.fin; r++) {
      const a = byteEn(prev, eq.rec + r);
      const b = byteEn(cur, eq.rec + r);
      if (a == null || b == null) continue;
      if (a !== b) cambiados.push({ rel: r, antes: a, despues: b });
    }
    if (!cambiados.length) continue;
    totalTransiciones++;
    totalBytes += cambiados.length;
    transiciones.push({
      label: cur.label,
      desc: cur.desc,
      pidCambia: prev.pid !== cur.pid,
      cambiados,
      ajusteConocido: esCambioConocido(prev, cur, eq),
    });
  }
  return { spec, transiciones, totalBytes, totalTransiciones };
}

function tramosRel(changed) {
  const out = [];
  for (const c of changed) {
    const ult = out[out.length - 1];
    if (ult && c.rel === ult.fin + 1) {
      ult.fin = c.rel;
      ult.bytes.push(c);
    } else out.push({ ini: c.rel, fin: c.rel, bytes: [c] });
  }
  return out;
}

function textoCambiosZona(t) {
  return tramosRel(t.cambiados).map((tr) => {
    const detalle = tr.bytes.length === 1
      ? fmtRec(tr.ini) + ' ' + tr.bytes[0].antes + '->' + tr.bytes[0].despues
      : fmtRango(tr.ini, tr.fin) + ' [' + tr.bytes.length + ' b]';
    return detalle;
  }).join(', ');
}

// ---------- informe ----------
function informe(caps, args) {
  const equipos = equiposPedidos(args.equipo);
  const lineas = [];
  const md = [];
  const etiquetas = caps.map((c) => c.label);

  lineas.push('Capturas: ' + caps.length + ' (' + etiquetas[0] + ' .. ' + etiquetas[etiquetas.length - 1] + ')');
  lineas.push('Base: ' + hex(caps[0].base) + '   ' + hex(caps[0].buf.length) + ' b por captura');
  for (const eq of equipos) lineas.push(eq.clave + ': club ' + eq.club + ' (' + eq.nombre + ')   rec = ' + hex(eq.rec));
  lineas.push('');

  md.push('# Escaneo de bytes sin identificar (serie completa)', '');
  md.push('- Capturas: ' + caps.length + ' (`' + etiquetas[0] + '` .. `' + etiquetas[etiquetas.length - 1] + '`)');
  md.push('- Base: `' + hex(caps[0].base) + '`, ' + hex(caps[0].buf.length) + ' b por captura');
  for (const eq of equipos) md.push('- ' + eq.clave + ': club ' + eq.club + ' (' + eq.nombre + '), rec = `' + hex(eq.rec) + '`');
  md.push('');
  md.push('> Generado por `tools/pes5/live-unknown-scan.js`. Solo lectura de los `.bin`.');
  md.push('');

  // 1) campos puntuales
  for (const eq of equipos) {
    lineas.push('# ' + eq.clave + ' — campos puntuales');
    md.push('## ' + eq.clave + ' — campos puntuales', '');
    for (const specTexto of args.campos) {
      const spec = parseSpec(specTexto);
      const a = analizarCampo(caps, eq, spec);
      const titulo = eq.clave + ' ' + fmtRango(spec.ini, spec.fin);
      lineas.push('');
      lineas.push(titulo + ': ' + a.cambios.length + ' cambio(s), ' + a.runs.length + ' valor(es) distinto(s)');
      md.push('### `' + titulo + '`', '');
      md.push('- Cambios: **' + a.cambios.length + '**, valores distintos: **' + a.runs.length + '**');
      if (a.desconocido) {
        lineas.push('  AVISO: hay capturas que no cubren el offset');
        md.push('- AVISO: hay capturas que no cubren el offset');
      }
      md.push('');
      md.push('| valores | capturas | acción |');
      md.push('|---|---|---|');
      for (const r of a.runs) {
        const rango = r.desde === r.hasta ? '`' + r.desde + '`' : '`' + r.desde + '`..`' + r.hasta + '`';
        const cap = caps.find((c) => c.label === r.desde);
        const desc = (cap && cap.desc ? cap.desc : '').replace(/\|/g, '\\|');
        md.push('| ' + fmtValores(r.vals) + ' | ' + rango + ' | ' + desc + ' |');
        if (!args.soloCambios) lineas.push('  ' + fmtValores(r.vals) + '  ' + rango + '  ' + desc);
      }
      md.push('');
      if (a.cambios.length) {
        lineas.push('  cambios:');
        md.push('**Cambios**', '');
        md.push('| captura | antes | después | acción |');
        md.push('|---|---|---|---|');
        for (const c of a.cambios) {
          const cap = caps[c.i];
          const desc = (cap.desc || '').replace(/\|/g, '\\|');
          lineas.push('    ' + cap.label + ': ' + fmtValores(c.antes) + ' -> ' + fmtValores(c.despues) + '  (' + desc + ')');
          md.push('| `' + cap.label + '` | ' + fmtValores(c.antes) + ' | ' + fmtValores(c.despues) + ' | ' + desc + ' |');
        }
        md.push('');
      }
    }
  }

  // 2) zonas (posible interfaz)
  for (const eq of equipos) {
    lineas.push('');
    lineas.push('# ' + eq.clave + ' — zonas amplias');
    md.push('## ' + eq.clave + ' — zonas amplias', '');
    for (const specTexto of args.zonas) {
      const spec = parseSpec(specTexto);
      const z = analizarZona(caps, eq, spec);
      const titulo = eq.clave + ' ' + fmtRango(spec.ini, spec.fin);
      lineas.push('');
      lineas.push(titulo + ': ' + z.totalTransiciones + ' transición(es) con cambios, ' + z.totalBytes + ' byte(s) afectados en total');
      md.push('### `' + titulo + '`', '');
      md.push('- Transiciones con cambios: **' + z.totalTransiciones + '**; bytes afectados (suma): **' + z.totalBytes + '**');
      const soloUi = z.transiciones.filter((t) => !t.ajusteConocido).length;
      lineas.push('  sin cambio de ajustes conocidos: ' + soloUi + ' de ' + z.totalTransiciones);
      md.push('- Transiciones en las que NO cambia ningún ajuste conocido: **' + soloUi + '** de ' + z.totalTransiciones);
      md.push('');
      if (!z.transiciones.length) {
        lineas.push('  (la zona no cambia en toda la serie)');
        md.push('_La zona no cambia en toda la serie._', '');
      } else {
        md.push('| captura | bytes | ajuste conocido | acción |');
        md.push('|---|---|---|---|');
        for (const t of z.transiciones) {
          const desc = (t.desc || '').replace(/\|/g, '\\|');
          const txt = textoCambiosZona(t) + (t.pidCambia ? ' (pid nuevo)' : '');
          lineas.push('  ' + t.label + ': ' + txt + '  [ajuste: ' + (t.ajusteConocido ? 'si' : 'NO') + ']  ' + desc);
          md.push('| `' + t.label + '` | ' + txt + ' | ' + (t.ajusteConocido ? 'sí' : 'no') + ' | ' + desc + ' |');
        }
        md.push('');
      }
    }
  }

  // 3) FKC vs GAF
  if (equipos.length === 2) {
    lineas.push('');
    lineas.push('# FKC vs GAF (mismos offsets)');
    md.push('## FKC vs GAF (mismos offsets)', '');
    md.push('| offset | FKC | GAF | iguales |');
    md.push('|---|---|---|---|');
    for (const specTexto of args.campos) {
      const spec = parseSpec(specTexto);
      const f = analizarCampo(caps, equipos[0], spec);
      const g = analizarCampo(caps, equipos[1], spec);
      const series = (x) => x.vals.map((v) => fmtValores(v)).join('/');
      const iguales = series(f) === series(g);
      lineas.push('  ' + fmtRango(spec.ini, spec.fin) + ': ' + (iguales ? 'IDENTICO en toda la serie' : 'DISTINTO') +
        ' (FKC ' + f.cambios.length + ' cambios, GAF ' + g.cambios.length + ' cambios)');
      md.push('| `' + fmtRango(spec.ini, spec.fin) + '` | ' + f.cambios.length + ' cambios | ' + g.cambios.length + ' cambios | ' +
        (iguales ? 'sí' : 'no') + ' |');
    }
    md.push('');
  }

  return { lineas, md };
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error('ERROR: ' + e.message);
    console.error(uso());
    process.exitCode = 1;
    return;
  }
  if (args.ayuda) { console.log(uso()); return; }
  if (!args.carpeta) {
    console.error('ERROR: falta la carpeta de capturas');
    console.error(uso());
    process.exitCode = 1;
    return;
  }
  const carpeta = path.resolve(args.carpeta);
  if (!fs.existsSync(carpeta) || !fs.statSync(carpeta).isDirectory()) {
    console.error('ERROR: no existe la carpeta ' + carpeta);
    process.exitCode = 1;
    return;
  }
  let caps;
  try {
    caps = cargarCapturas(carpeta, leerIndex(carpeta));
  } catch (e) {
    console.error('ERROR: ' + e.message);
    process.exitCode = 1;
    return;
  }
  if (caps.length < 2) {
    console.error('ERROR: hacen falta al menos dos capturas');
    process.exitCode = 1;
    return;
  }
  for (const eq of equiposPedidos(args.equipo)) {
    if (!caps.every((c) => c.base === caps[0].base && c.buf.length === caps[0].buf.length)) {
      console.error('ERROR: las capturas no comparten base o tamaño; no se puede escanear ' + eq.clave);
      process.exitCode = 1;
      return;
    }
  }
  const { lineas, md } = informe(caps, args);
  console.log(lineas.join('\n'));
  if (args.md) {
    const salida = path.resolve(args.md);
    fs.mkdirSync(path.dirname(salida), { recursive: true });
    fs.writeFileSync(salida, md.join('\n') + '\n', 'utf8');
    console.log('\nInforme markdown: ' + salida);
  }
}

main();
