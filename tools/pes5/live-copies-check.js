// Comprobador de las copias en memoria de la alineacion de PES5.
//
// Lee una carpeta de capturas de memoria del proceso (index.json +
// <label>.bin, 0x30000 bytes desde `base`) igual que live-map-analyze.js y
// verifica y decodifica, para los dos equipos (FKC y GAF):
//
//   - el registro de formacion (rec, 628 bytes, mismo formato que el save),
//   - la copia c2 (rec+0x38B): orden, codigos de posicion, marcaje, rival
//     marcado, flechas de ataque y actitud defensiva,
//   - la copia c3 (rec+0x1004): orden, bloque A/B seleccionado (byte +38),
//     codigos de posicion, profundidad, lateral, marcaje, rival y actitud,
//   - la copia del save (rec-0xA5C) y el bloque lateral+posicion (rec-0x7DC),
//   - la tabla de codigos de posicion de la pantalla (rec+945..955),
//   - las tablas float (rec+3622 y su duplicado rec+3806): 10 pares (x, y) con
//     x = profundidad * 157/48, y = lateral * 95/104; el espejo del rival
//     (rec+3894) y la fila de banca (rec+3702).
//
// Con --mem <carpeta> audita ademas los volcados completos del proceso
// (<n>.bin + <n>.json, lista [base, offsetEnArchivo, tamano, tipo]) y busca
// las 7 copias de los laterales de GAF que anoto el coordinador.
//
// Solo lee archivos: no escribe capturas, saves ni memoria del juego.
//
// Uso:
//   node tools/pes5/live-copies-check.js <carpeta> [--mem <carpeta>]
//                                        [--save <archivo>] [--json] [-v]
//
//   <carpeta>  carpeta con index.json ([{label, desc, base, pid, t}]) y
//              <label>.bin. Se analizan en el orden del indice.
//   --mem      carpeta con volcados completos (<n>.bin + <n>.json).
//   --save     save de PES5 para comparar la copia rec-0xA5C (por defecto
//              $PES5_SAVE o la ruta habitual de Windows). Solo lectura.
//   --json     salida JSON por consola (sin el informe de texto).
//   -v         no filtra el detalle por captura.
'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------- constantes

// Direcciones virtuales de los dos registros de formacion en vivo (estables
// entre reinicios; comprobadas en los volcados g0/g1/g2/h0 y en serie/).
const EQUIPOS = [
  { clave: 'FKC', club: 42, rec: 0x3956f5e, local: true },
  { clave: 'GAF', club: 5, rec: 0x395bbb2, local: false },
];

// Offsets dentro del registro (relativos a rec). Mismos que en el save.
const REL = {
  orden: 4,        // 4..35   orden[32]: casilla -> indice de plantel
  ids: 36,         // 36..99  ids[32] u16 (en el save van a cero)
  prof: 112,       // 112..122 profundidad[11]
  lat: 123,        // 123..132 lateral[10]  (casillas 1..10)
  pos: 133,        // 133..143 posicion[11]
  flechas: 147,    // 147..234 flechas de ataque[11][8]
  actitud: 243,    // 243..253 actitud defensiva[11]
  marcaje: 254,    // 254..264 tipo de marcaje[11]
  rival: 265,      // 265..275 casilla del rival marcado[11] (255 = ninguno)
  bloques: [112, 283, 454], // principal, Alineacion A, Alineacion B (171 b)
};

// Copias. c2 = rec+0x38B, c3 = rec+0x1004 (mismos offsets en los dos equipos).
const C2 = {
  ini: 0x38b,
  orden: 4,
  pos: 38,        // 38..48  codigos de posicion[11]
  marcaje: 49,    // 49..59  = rec+254..264
  rival: 60,      // 60..70  = rec+265..275
  flechas: 74,    // 74..161 = rec+147..234
  actitud: 170,   // 170..180 = rec+243..253
};
const C3 = {
  ini: 0x1004,
  orden: 4,
  bloque: 38,     // 0 = principal, 1 = Alineacion A, 2 = Alineacion B
  pos: 39,        // 39..49
  prof: 50,       // 50..60  (el byte de la casilla 0 siempre es 2)
  marca34: 61,    // 0x34 fijo
  lat: 62,        // 62..71
  marcaje: 104,   // 104..114 = rec+254..264
  rival: 115,     // 115..125 = rec+265..275
  flechas: 140,   // 140..227 = rec+147..234
  actitud: 237,   // 237..247 = rec+243..253
};

// Otras copias dentro del bloque de cada equipo.
const OTRAS = {
  pre: -0xa5c,       // copia del save (orden en rec-0xA5C; lat en +119)
  latpos: -0x7dc,    // rec-0x7DC..: lateral[10] + posicion[11]
  posPantalla: 945,  // 945..955 = c2+38 (la nota previa decia 946)
  lanzador: 644,     // 644 y 645: fila y casilla de Lanzador/Capit
  bufEdicion: 2502,  // 2502 profundidad / 2504 lateral del jugador en edicion
  tabla1: 3622,      // 10 pares (x, y) del equipo
  tablaBanca: 3702,  // 12 pares de la banca (y = 103)
  tabla2: 3806,      // duplicado exacto de tabla1
  tablaRival: 3894,  // 10 pares del rival (espejados)
};

// Tabla lineal: x = profundidad * KX, y = lateral * KY. El equipo visitante se
// dibuja espejado: x' = 157 - x, y' = 95 - y (equivale a prof' = 48 - prof y
// lat' = 104 - lat). Constantes ajustadas sobre 10 pares y varias formaciones.
const KX = 157 / 48;
const KY = 95 / 104;
const TOL = 0.01;

// Save de PES5 (solo lectura). El registro del club empieza en
// 716932 + club*628 dentro del save descifrado (FORM_REGISTRO_BASE).
const SAVE_DEF = process.env.PES5_SAVE ||
  'C:/Users/Administrator/Documents/KONAMI/Pro Evolution Soccer 5/save/folder1/KONAMI-WIN32PES5OPT';
const FORM_REGISTRO_BASE = 716932;

// Las 7 direcciones de laterales de GAF que anoto el coordinador (buscadas
// sobre el volcado h0 con el lateral anterior al cambio: 63,40,85,...).
const DIRS_LATERALES_GAF = [
  0xff167e, 0xff16d3, 0x395b1cd, 0x395b3d6, 0x3b8e665, 0x3b90f9f, 0xd84d867,
];

// ---------------------------------------------------------------- utilidades

const hex = (n) => '0x' + (n >>> 0).toString(16);
const num = (v) => (Math.round(v * 1000) / 1000).toString();

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
    return { label: it.label, desc: it.desc || '', base, buf: fs.readFileSync(archivo) };
  });
}

function bytesEn(cap, va, n) {
  const i = va - cap.base;
  if (i < 0 || i + n > cap.buf.length) return null;
  return cap.buf.subarray(i, i + n);
}
function lista(cap, va, n) {
  const b = bytesEn(cap, va, n);
  return b ? Array.from(b) : null;
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
function iguales(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Tabla float de 10 pares (x, y) a partir de profundidad/lateral.
function tablaEsperada(prof, lat, espejo) {
  const out = [];
  for (let slot = 1; slot <= 10; slot++) {
    let p = prof[slot];
    let l = lat[slot - 1];
    if (espejo) { p = 48 - p; l = 104 - l; }
    out.push([p * KX, l * KY]);
  }
  return out;
}
function leerTabla(cap, va, pares) {
  const out = [];
  for (let i = 0; i < pares; i++) {
    const b = bytesEn(cap, va + i * 8, 8);
    if (!b) return null;
    out.push([b.readFloatLE(0), b.readFloatLE(4)]);
  }
  return out;
}
function difTabla(a, b) {
  if (!a || !b || !b.length) return Infinity;
  let m = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    m = Math.max(m, Math.abs(a[i][0] - b[i][0]), Math.abs(a[i][1] - b[i][1]));
  }
  return m;
}

// ------------------------------------------------------ lectura de un equipo

function leerEquipo(cap, eq) {
  const rec = eq.rec;
  const orden = lista(cap, rec + REL.orden, 32);
  if (!orden) return null;
  return {
    clave: eq.clave,
    orden,
    prof: lista(cap, rec + REL.prof, 11),
    lat: lista(cap, rec + REL.lat, 10),
    pos: lista(cap, rec + REL.pos, 11),
    flechas: lista(cap, rec + REL.flechas, 88),
    actitud: lista(cap, rec + REL.actitud, 11),
    marcaje: lista(cap, rec + REL.marcaje, 11),
    rival: lista(cap, rec + REL.rival, 11),
    bloques: REL.bloques.map((off) => ({
      prof: lista(cap, rec + off, 11),
      lat: lista(cap, rec + off + 11, 10),
      pos: lista(cap, rec + off + 21, 11),
      flechas: lista(cap, rec + off + 35, 88),
      actitud: lista(cap, rec + off + 131, 11),
      marcaje: lista(cap, rec + off + 142, 11),
      rival: lista(cap, rec + off + 153, 11),
    })),
    c2: {
      orden: lista(cap, rec + C2.ini + C2.orden, 32),
      pos: lista(cap, rec + C2.ini + C2.pos, 11),
      marcaje: lista(cap, rec + C2.ini + C2.marcaje, 11),
      rival: lista(cap, rec + C2.ini + C2.rival, 11),
      flechas: lista(cap, rec + C2.ini + C2.flechas, 88),
      actitud: lista(cap, rec + C2.ini + C2.actitud, 11),
    },
    c3: {
      orden: lista(cap, rec + C3.ini + C3.orden, 32),
      bloque: (lista(cap, rec + C3.ini + C3.bloque, 1) || [null])[0],
      pos: lista(cap, rec + C3.ini + C3.pos, 11),
      prof: lista(cap, rec + C3.ini + C3.prof, 11),
      marca34: (lista(cap, rec + C3.ini + C3.marca34, 1) || [null])[0],
      lat: lista(cap, rec + C3.ini + C3.lat, 10),
      marcaje: lista(cap, rec + C3.ini + C3.marcaje, 11),
      rival: lista(cap, rec + C3.ini + C3.rival, 11),
      flechas: lista(cap, rec + C3.ini + C3.flechas, 88),
      actitud: lista(cap, rec + C3.ini + C3.actitud, 11),
    },
    pre: {
      orden: lista(cap, rec + OTRAS.pre, 32),
      prof: lista(cap, rec + OTRAS.pre + 108, 11),
      lat: lista(cap, rec + OTRAS.pre + 119, 10),
      pos: lista(cap, rec + OTRAS.pre + 129, 11),
    },
    latpos: lista(cap, rec + OTRAS.latpos, 21),
    posPantalla: lista(cap, rec + OTRAS.posPantalla, 11),
    lanzador: lista(cap, rec + OTRAS.lanzador, 2),
    bufEdicion: lista(cap, rec + OTRAS.bufEdicion, 2),
    tablas: {
      propia: leerTabla(cap, rec + OTRAS.tabla1, 10),
      copia: leerTabla(cap, rec + OTRAS.tabla2, 10),
      banca: leerTabla(cap, rec + OTRAS.tablaBanca, 12),
      rival: leerTabla(cap, rec + OTRAS.tablaRival, 10),
    },
  };
}

// ------------------------------------------------------------- comprobacion

function comprobarCaptura(cap, ref) {
  const datos = EQUIPOS.map((eq) => leerEquipo(cap, eq));
  const res = { label: cap.label, desc: cap.desc, equipos: {}, fallos: [], avisos: [] };
  const registroDe = (clave) => {
    const i = EQUIPOS.findIndex((e) => e.clave === clave);
    return datos[i];
  };

  for (let i = 0; i < EQUIPOS.length; i++) {
    const eq = EQUIPOS[i];
    const e = datos[i];
    const r = { clave: eq.clave, rec: hex(eq.rec) };
    res.equipos[eq.clave] = r;
    if (!e) { res.fallos.push(eq.clave + ': la captura no cubre el registro'); continue; }

    // orden: registro, c2 y c3 deben coincidir y ser una permutacion
    r.ordenPermutacion = esPermutacion32(e.orden);
    r.c2Orden = iguales(e.orden, e.c2.orden);
    r.c3Orden = iguales(e.orden, e.c3.orden);
    if (!r.ordenPermutacion) res.fallos.push(eq.clave + ': el orden del registro no es una permutacion de 0..31');
    if (!r.c2Orden || !r.c3Orden) {
      res.avisos.push(eq.clave + ': el orden de c2/c3 no coincide con el registro (posible captura a media escritura)');
    }

    // c2 copia los campos por jugador del registro
    r.c2Pos = iguales(e.pos, e.c2.pos);
    r.c2Marcaje = iguales(e.marcaje, e.c2.marcaje);
    r.c2Rival = iguales(e.rival, e.c2.rival);
    r.c2Flechas = iguales(e.flechas, e.c2.flechas);
    r.c2Actitud = iguales(e.actitud, e.c2.actitud);
    for (const [k, nombre] of [['c2Marcaje', 'marcaje'], ['c2Rival', 'rival marcado'], ['c2Flechas', 'flechas'], ['c2Actitud', 'actitud defensiva']]) {
      if (r[k] === false) res.avisos.push(eq.clave + ': c2 no copia ' + nombre + ' del registro');
    }

    // c3: bloque seleccionado + copia del bloque (profundidad con la casilla 0
    // forzada a 2)
    r.c3Bloque = e.c3.bloque;
    if (![0, 1, 2].includes(e.c3.bloque)) {
      res.fallos.push(eq.clave + ': c3+38 (bloque) fuera de 0..2 (' + e.c3.bloque + ')');
    } else {
      const b = e.bloques[e.c3.bloque];
      r.c3Prof = b.prof ? iguales(e.c3.prof, [2].concat(b.prof.slice(1))) : false;
      r.c3Lat = iguales(e.c3.lat, b.lat);
      r.c3Pos = iguales(e.c3.pos, b.pos);
      // el resto de campos por jugador tambien sigue al bloque elegido
      r.c3Marcaje = iguales(e.c3.marcaje, b.marcaje);
      r.c3Rival = iguales(e.c3.rival, b.rival);
      r.c3Flechas = iguales(e.c3.flechas, b.flechas);
      r.c3Actitud = iguales(e.c3.actitud, b.actitud);
      if (!r.c3Prof || !r.c3Lat || !r.c3Pos) {
        res.avisos.push(eq.clave + ': c3 no coincide con el bloque ' + e.c3.bloque + ' del registro');
      }
      for (const [k, nombre] of [['c3Marcaje', 'marcaje'], ['c3Rival', 'rival marcado'], ['c3Flechas', 'flechas'], ['c3Actitud', 'actitud defensiva']]) {
        if (r[k] === false) res.avisos.push(eq.clave + ': c3 no copia ' + nombre + ' del bloque ' + e.c3.bloque);
      }
    }
    r.c3Marca34 = e.c3.marca34 === 0x34;
    if (!r.c3Marca34) res.avisos.push(eq.clave + ': c3+61 no es 0x34 (' + e.c3.marca34 + ')');

    // tabla de codigos de posicion de la pantalla (rec+945) y c2
    r.posPantalla = iguales(e.posPantalla, e.c2.pos);
    if (!r.posPantalla) res.avisos.push(eq.clave + ': la copia rec+945 no coincide con c2+38');

    // bloque lateral[10]+posicion[11] de rec-0x7DC: copia congelada del save
    if (!ref.latpos[eq.clave]) ref.latpos[eq.clave] = e.latpos;
    r.latpos = iguales(e.latpos, ref.latpos[eq.clave]);
    if (!r.latpos) res.avisos.push(eq.clave + ': el bloque rec-0x7DC cambió respecto de la primera captura (debería ser la copia del save)');
    r.lanzador = e.lanzador;
    r.bufEdicion = e.bufEdicion;

    // tablas float
    const tRegistro = tablaEsperada(e.prof, e.lat, !eq.local);
    const tPreview = tablaEsperada(e.c3.prof, e.c3.lat, !eq.local);
    r.tablaRegistro = difTabla(e.tablas.propia, tRegistro);
    r.tablaPreview = difTabla(e.tablas.propia, tPreview);
    r.tablaCopia = difTabla(e.tablas.propia, e.tablas.copia);
    if (r.tablaCopia !== 0) res.fallos.push(eq.clave + ': rec+3622 y rec+3806 difieren (' + num(r.tablaCopia) + ')');
    if (r.tablaRegistro > TOL && r.tablaPreview > TOL) {
      res.fallos.push(eq.clave + ': la tabla float no sale del registro (' + num(r.tablaRegistro) +
        ') ni de la previsualizacion de c3 (' + num(r.tablaPreview) + ')');
    } else if (r.tablaRegistro > TOL) {
      res.avisos.push(eq.clave + ': tabla float en previsualizacion (sigue a c3, no al registro)');
    }

    // tabla del rival: espejo de la del otro equipo (segun SU registro)
    const otro = EQUIPOS[(i + 1) % EQUIPOS.length];
    const dOtro = registroDe(otro.clave);
    if (dOtro) {
      r.tablaRival = difTabla(e.tablas.rival, tablaEsperada(dOtro.prof, dOtro.lat, !otro.local));
      if (r.tablaRival > TOL) {
        res.avisos.push(eq.clave + ': la tabla del rival no sigue al registro del rival (' + num(r.tablaRival) +
          '); puede estar desfasada (como en el volcado de partido h0)');
      }
    }

    // banca: 12 pares con la misma y y paso de 8
    const banca = e.tablas.banca;
    if (banca) {
      const ys = new Set(banca.map((p) => p[1].toFixed(3)));
      const paso = banca[1][0] - banca[0][0];
      r.banca = ys.size === 1 && Math.abs(Math.abs(paso) - 8) < 0.01;
      if (!r.banca) res.avisos.push(eq.clave + ': la fila de banca (rec+3702) no tiene el formato esperado');
    }
  }

  // Una captura tomada a media escritura (p. ej. los "auto:" del generador de
  // fechas) no es un estado coherente: sus incoherencias pasan a avisos.
  res.coherente = EQUIPOS.every((eq) => {
    const x = res.equipos[eq.clave];
    return x && x.c3Bloque != null && x.ordenPermutacion && x.c2Orden && x.c3Orden;
  });
  if (!res.coherente) {
    for (const f of res.fallos) res.avisos.push('captura incoherente (posible escritura a medias): ' + f);
    res.fallos = [];
    res.avisos.push('captura incoherente: no se exige consistencia entre copias');
  }
  return res;
}

// ------------------------------------------------- volcados completos (--mem)

function cargarVolcado(base, nombre) {
  const archivo = path.join(base, nombre + '.json');
  if (!fs.existsSync(archivo)) return null;
  const regiones = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  const buf = fs.readFileSync(path.join(base, nombre + '.bin'));
  return { nombre, regiones, buf };
}
function leerVolcado(d, va, n) {
  const out = Buffer.alloc(n);
  let i = 0;
  while (i < n) {
    const v = va + i;
    const r = d.regiones.find(([base, , size]) => v >= base && v < base + size);
    if (!r) return null;
    const [base, off, size] = r;
    const disp = Math.min(n - i, base + size - v);
    d.buf.copy(out, i, off + v - base, off + v - base + disp);
    i += disp;
  }
  return out;
}
function buscarEnVolcado(d, aguja) {
  const out = [];
  let pos = 0;
  for (;;) {
    const i = d.buf.indexOf(aguja, pos);
    if (i < 0) break;
    for (const [base, off, size] of d.regiones) {
      if (i >= off && i < off + size) { out.push(base + (i - off)); break; }
    }
    pos = i + 1;
  }
  return out;
}

// Clasifica una direccion segun la estructura que la contiene. Si se pasa el
// volcado (`d`) se comprueba ademas la firma de cada estructura.
function clasificar(va, d) {
  for (const eq of EQUIPOS) {
    const rec = eq.rec;
    if (va === rec - 0xa5c + 119) return eq.clave + ' rec-0xA5C: lateral de la copia del save (+119)';
    if (va === rec - 0x7dc) return eq.clave + ' rec-0x7DC: inicio del bloque lateral[10]+posicion[11]';
    if (va === rec + REL.lat) return eq.clave + ' registro: lateral[10] (rec+123)';
    if (va === rec + C3.ini + C3.lat) return eq.clave + ' c3: lateral[10] (c3+62)';
    if (va === rec + C2.ini + C2.pos) return eq.clave + ' c2: codigos de posicion (c2+38 = rec+945)';
    if (va === rec + C3.ini + C3.pos) return eq.clave + ' c3: codigos de posicion (c3+39)';
    if (va === rec + 0x1004) return eq.clave + ' c3 (rec+0x1004)';
    if (va === rec) return eq.clave + ' registro (rec)';
    if (Math.abs(va - rec) < 0x1100) {
      const d2 = va - rec;
      return eq.clave + ' bloque del equipo (rec' + (d2 >= 0 ? '+' : '-') + hex(Math.abs(d2)) + ')';
    }
  }
  if (va >= 0xff1654 && va < 0xff1654 + 0x55) {
    return 'bloque compacto de 85 B con inicio en 0xFF1654 (orden[32]+prof[10]+lat[10]+pos[11]+banderas)';
  }
  if (va >= 0xff16a9 && va < 0xff16a9 + 0x55) {
    return 'bloque compacto de 85 B con inicio en 0xFF16A9 (segunda copia del de 0xFF1654)';
  }
  if (va >= 0x3b8e5ea && va < 0x3b8e5ea + 628) {
    return 'bloque de 628 B con cabecera en 0x3B8E5EA (formato del registro: orden en +4, lateral en +123)';
  }
  if (va >= 0x3b90f80 && va < 0x3b90fc0) {
    return 'bloque en 0x3B90F8E: profundidad[11] en 0x3B90F94, lateral en 0x3B90F9F, posicion en 0x3B90FA9';
  }
  // Firma generica: el orden de 32 bytes esta 119 bytes antes del lateral, en
  // los bloques de formacion de 628 B (con cabecera de 4 B o sin ella).
  if (d) {
    const orden = leerVolcado(d, va - 119, 32);
    if (orden && esPermutacion32(Array.from(orden))) {
      const cab = leerVolcado(d, va - 123, 4);
      const txt = cab && cab.every((x) => x === 0 || (x >= 32 && x < 127)) ? cab.toString('latin1').replace(/\0/g, '') : '';
      return 'bloque de 628 B: orden en ' + hex(va - 119) + ', lateral en +119' +
        (txt ? ' (cabecera "' + txt + '" en ' + hex(va - 123) + ')' : ' (sin cabecera: empieza por el orden)');
    }
    const orden85 = leerVolcado(d, va - 42, 32);
    if (orden85 && esPermutacion32(Array.from(orden85))) {
      return 'bloque compacto de 85 B: orden en ' + hex(va - 42) + ', lateral en +42';
    }
  }
  if (va >= 0xd83f000 && va < 0xd870000) {
    return 'tabla de registros de equipo (bloques de 628 B): cabecera en ' + hex(va - REL.lat) + ', lateral en +123';
  }
  return 'estructura no identificada';
}

function auditarVolcados(carpeta) {
  const archivos = fs.readdirSync(carpeta).filter((f) => f.endsWith('.json'));
  if (!archivos.length) return { aviso: 'no hay volcados (.json) en ' + carpeta };
  const gaf = EQUIPOS.find((e) => e.clave === 'GAF');
  const informe = [];
  for (const f of archivos) {
    const nombre = f.replace(/\.json$/, '');
    let d;
    try { d = cargarVolcado(carpeta, nombre); } catch (e) { informe.push({ volcado: nombre, error: e.message }); continue; }
    if (!d) continue;
    const lat = leerVolcado(d, gaf.rec + REL.lat, 10);
    if (!lat) { informe.push({ volcado: nombre, error: 'GAF fuera del volcado' }); continue; }
    const latGuardado = leerVolcado(d, gaf.rec + OTRAS.pre + 119, 10);
    const copias = buscarEnVolcado(d, lat).map((va) => ({ dir: hex(va), estructura: clasificar(va, d) }));
    const dirs = DIRS_LATERALES_GAF.map((va) => {
      const b = leerVolcado(d, va, 10);
      return {
        dir: hex(va),
        coincide: b ? iguales(Array.from(b), Array.from(lat)) : false,
        guardado: b && latGuardado ? iguales(Array.from(b), Array.from(latGuardado)) : false,
        estructura: clasificar(va, d),
      };
    });
    informe.push({ volcado: nombre, lat: Array.from(lat), copias, dirs });
  }
  return { informe };
}

// ------------------------------------------------------------------- salida

function imprimirTexto(resultados, save, mem, opts) {
  const out = [];
  out.push('Copias en memoria de la alineacion de PES5');
  out.push('Capturas: ' + resultados.length + ' (' + resultados[0].label + ' .. ' + resultados[resultados.length - 1].label + ')');
  for (const eq of EQUIPOS) {
    const r = eq.rec;
    out.push('  ' + eq.clave + ': rec=' + hex(r) + '  c2=' + hex(r + C2.ini) + '  c3=' + hex(r + C3.ini) +
      '  posPantalla=' + hex(r + OTRAS.posPantalla) + '  tabla=' + hex(r + OTRAS.tabla1));
  }
  out.push('Modelo: x = profundidad*157/48, y = lateral*95/104; visitante espejado (x\'=157-x, y\'=95-y).');
  out.push('');

  const marca = (v) => (v ? 'si' : 'NO');
  const tabla = (r) => {
    if (r.tablaRegistro == null) return '?';
    if (r.tablaRegistro <= TOL) return 'registro';
    if (r.tablaPreview != null && r.tablaPreview <= TOL) return 'preview';
    return 'FALLO';
  };
  const cab = ['captura', 'FKC c2/c3', 'FKC blq', 'FKC tabla', 'GAF c2/c3', 'GAF blq', 'GAF tabla', 'avisos'];
  const filas = resultados.map((r) => {
    const f = r.equipos.FKC || {};
    const g = r.equipos.GAF || {};
    return [
      r.label,
      marca(f.c2Orden) + '/' + marca(f.c3Orden),
      String(f.c3Bloque),
      tabla(f),
      marca(g.c2Orden) + '/' + marca(g.c3Orden),
      String(g.c3Bloque),
      tabla(g),
      String(r.avisos.length + r.fallos.length),
    ];
  });
  const anchos = cab.map((h, i) => Math.max(h.length, ...filas.map((f) => f[i].length)));
  out.push(cab.map((h, i) => h.padEnd(anchos[i])).join('  '));
  out.push(anchos.map((a) => '-'.repeat(a)).join('  '));
  for (const f of filas) out.push(f.map((v, i) => v.padEnd(anchos[i])).join('  '));
  out.push('');

  const vistos = new Map();
  for (const r of resultados) {
    for (const a of r.fallos.map((x) => 'FALLO: ' + x).concat(r.avisos)) {
      if (!vistos.has(a)) vistos.set(a, { n: 0, ejemplo: r.label });
      vistos.get(a).n++;
    }
  }
  if (vistos.size) {
    out.push('Avisos y fallos (' + vistos.size + ' distintos):');
    for (const [a, v] of vistos) out.push('  [' + v.n + 'x, p.ej. ' + v.ejemplo + '] ' + a);
    out.push('');
  }

  for (const cap of [resultados[0], resultados[resultados.length - 1]]) {
    out.push('== ' + cap.label + (cap.desc ? '  ' + cap.desc : ''));
    for (const eq of EQUIPOS) {
      const r = cap.equipos[eq.clave];
      if (!r || r.c3Bloque == null) { out.push('  ' + eq.clave + ': sin datos'); continue; }
      out.push('  ' + eq.clave + ': bloque c3=' + r.c3Bloque +
        '  c2 pos=' + marca(r.c2Pos) +
        '  c3 prof/lat/pos=' + marca(r.c3Prof) + '/' + marca(r.c3Lat) + '/' + marca(r.c3Pos) +
        '  tabla registro/preview=' + num(r.tablaRegistro) + '/' + num(r.tablaPreview) +
        '  rival=' + num(r.tablaRival) + '  banca=' + marca(r.banca));
    }
    out.push('');
  }

  if (opts && opts.verbose) {
    out.push('== Detalle por captura');
    for (const r of resultados) {
      out.push('-- ' + r.label + (r.desc ? '  ' + r.desc : ''));
      for (const eq of EQUIPOS) {
        const x = r.equipos[eq.clave];
        if (!x || x.c3Bloque == null) { out.push('   ' + eq.clave + ': sin datos'); continue; }
        out.push('   ' + eq.clave + ': orden c2/c3=' + marca(x.c2Orden) + '/' + marca(x.c3Orden) +
          '  permutacion=' + marca(x.ordenPermutacion) +
          '  c2 pos/marcaje/rival/flechas/actitud=' +
          [x.c2Pos, x.c2Marcaje, x.c2Rival, x.c2Flechas, x.c2Actitud].map(marca).join('/') +
          '  c3 bloque/prof/lat/pos=' + x.c3Bloque + '/' + [x.c3Prof, x.c3Lat, x.c3Pos].map(marca).join('/') +
          '  posPantalla=' + marca(x.posPantalla) +
          '  lat+pos=' + marca(x.latpos) +
          '  lanzador(644/645)=' + (x.lanzador || []).join('/') +
          '  edicion(2502/2504)=' + (x.bufEdicion || []).join('/') +
          '  tabla registro/preview/copia/rival=' +
          [x.tablaRegistro, x.tablaPreview, x.tablaCopia, x.tablaRival].map(num).join('/'));
      }
    }
    out.push('');
  }

  if (save && save.length) {
    out.push('Copia del save (rec-0xA5C) frente al registro del save: ' +
      save.map((p) => p.equipo + ' ' + p.iguales).join('  '));
    out.push('');
  }

  if (mem && mem.informe) {
    out.push('== Copias de los laterales de GAF en los volcados completos');
    for (const v of mem.informe) {
      if (v.error) { out.push('  ' + v.volcado + ': ' + v.error); continue; }
      out.push('  ' + v.volcado + ': ' + v.copias.length + ' copia(s) del lateral actual (' + v.lat.join(',') + ')');
      for (const c of v.copias) out.push('    ' + c.dir + '  ' + c.estructura);
      for (const dd of v.dirs) {
        const estado = dd.coincide ? 'lateral actual' : dd.guardado ? 'lateral guardado (anterior)' : 'no coincide';
        out.push('    ' + dd.dir + '  ' + estado + '  ' + dd.estructura);
      }
    }
    out.push('');
  }

  const fallos = resultados.reduce((s, r) => s + r.fallos.length, 0);
  out.push(fallos ? 'RESULTADO: ' + fallos + ' fallo(s)' : 'RESULTADO: OK (sin fallos duros)');
  return out.join('\n');
}

// ---------------------------------------------------------------------- CLI

function parseArgs(argv) {
  const out = { carpeta: null, mem: null, save: SAVE_DEF, json: false, verbose: false };
  const resto = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mem') { out.mem = argv[++i]; if (!out.mem) return { error: '--mem necesita una carpeta' }; }
    else if (a === '--save') { out.save = argv[++i]; if (!out.save) return { error: '--save necesita un archivo' }; }
    else if (a === '--json') out.json = true;
    else if (a === '-v' || a === '--verbose') out.verbose = true;
    else if (a === '-h' || a === '--help') return { ayuda: true };
    else if (a.startsWith('--')) return { error: 'opcion desconocida: ' + a };
    else resto.push(a);
  }
  out.carpeta = resto[0];
  if (!out.carpeta) return { error: 'falta la carpeta de capturas' };
  if (resto.length > 1) return { error: 'sobra un argumento: ' + resto[1] };
  return out;
}

const USO = 'uso: node tools/pes5/live-copies-check.js <carpeta> [--mem <carpeta>] [--save <archivo>] [--json] [-v]';

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.ayuda) { console.log(USO); return; }
  if (args.error) { console.error('ERROR: ' + args.error); console.error(USO); process.exitCode = 1; return; }

  const carpeta = path.resolve(args.carpeta);
  if (!fs.existsSync(carpeta) || !fs.statSync(carpeta).isDirectory()) {
    console.error('ERROR: no existe la carpeta ' + carpeta);
    process.exitCode = 1;
    return;
  }

  let capturas;
  try {
    capturas = cargarCapturas(carpeta, leerIndex(carpeta));
  } catch (e) {
    console.error('ERROR: ' + (e && e.message ? e.message : e));
    process.exitCode = 1;
    return;
  }

  // Save (solo lectura) para comparar la copia rec-0xA5C de la primera captura.
  let save = [];
  try {
    if (fs.existsSync(args.save)) {
      const { descifrar } = require('./pes5-crypt.js');
      const plano = Buffer.from(descifrar(fs.readFileSync(args.save)));
      const primera = EQUIPOS.map((eq) => leerEquipo(capturas[0], eq));
      for (let i = 0; i < EQUIPOS.length; i++) {
        const eq = EQUIPOS[i];
        const e = primera[i];
        if (!e) continue;
        const off = FORM_REGISTRO_BASE + eq.club * 628;
        const esperado = plano.subarray(off + 4, off + 628);
        let n = 0;
        // comparacion byte a byte del bloque rec-0xA5C..+ (624 bytes = save[4..627])
        const bloque = bytesEn(capturas[0], eq.rec + OTRAS.pre, esperado.length);
        if (bloque) for (let k = 0; k < esperado.length; k++) if (bloque[k] === esperado[k]) n++;
        save.push({ equipo: eq.clave, iguales: n + '/' + esperado.length });
      }
    }
  } catch (e) {
    console.error('AVISO: no se pudo comparar con el save: ' + (e && e.message ? e.message : e));
    save = [];
  }

  let mem = null;
  if (args.mem) {
    const dir = path.resolve(args.mem);
    if (!fs.existsSync(dir)) console.error('AVISO: no existe ' + dir);
    else mem = auditarVolcados(dir);
  }

  const ref = { latpos: {} };
  const resultados = capturas.map((cap) => comprobarCaptura(cap, ref));

  if (args.json) {
    console.log(JSON.stringify({ capturas: resultados, save, mem }, null, 2));
  } else {
    console.log(imprimirTexto(resultados, save, mem, args));
  }

  const fallos = resultados.reduce((s, r) => s + r.fallos.length, 0);
  if (fallos) process.exitCode = 1;
}

main();
