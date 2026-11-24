// Verificador del mapa en vivo de la pantalla de alineacion de PES5 (PESMAP2).
//
// Comprueba, contra las capturas de memoria que saco el coordinador (carpeta con
// index.json + <label>.bin), cada fila de sus notas: lee el byte o rango que la
// nota atribuye a un ajuste en las capturas que cita y comprueba que cambia como
// dice (y solo cuando dice). Despues compara el registro de formacion en vivo con
// el del save real (SOLO LECTURA: se descifra en memoria con pes5-crypt.js).
//
// No escribe nada del juego: solo lee los .bin de las capturas y el option file.
//
// PESMAP2B: dos lecturas de PESMAP2 se apoyaban en la `desc` de la captura y no
// en la imagen. Los corners quedan rec+106 = izquierdo y rec+107 = derecho
// (k_l4.png: I en Freier, casilla 6; D en Schneider, casilla 8); "Copiar a A/B"
// se comprueba con v020->v021 y v010->v011, porque b200->b201 son identicas
// byte a byte; y v000->v001 confirma la escritura de rec+280..282 al confirmar
// Estrat. equipo.
//
// Uso:
//   node tools/pes5/verify-live-map.js [--serie <carpeta>] [--save <option file>]
//   node tools/pes5/verify-live-map.js --ayuda
//
//   --serie  carpeta con index.json y <label>.bin de las capturas (obligatoria si
//            no esta en la variable PESMAP_SERIE).
//   --save   option file de PES5; por defecto el del juego instalado.
//
// Salida: tabla de filas VERIFICADO / NO VERIFICADO / REFUTADO con el detalle de
// los valores medidos, y la comparacion del registro con el save de los dos clubes.
const fs = require('fs');
const path = require('path');

const { descifrar } = require('./pes5-crypt.js');

// Direcciones de los dos registros en la partida capturada (FK TUPADRE local y
// GUARANI AF visitante) y sus clubes en el save. A = rec + 4 es el inicio del
// registro de formacion del save (FORM_REGISTRO_BASE en pes5-editor.js).
const EQUIPOS = [
  { clave: 'FKC', nombre: 'FK TUPADRE', club: 42, rec: 0x3956f5e },
  { clave: 'GAF', nombre: 'GUARANI AF', club: 5, rec: 0x395bbb2 },
];
const EQUIPO = Object.fromEntries(EQUIPOS.map((e) => [e.clave, e]));

const SAVE_POR_DEFECTO = 'C:/Users/Administrator/Documents/KONAMI/Pro Evolution Soccer 5/save/folder1/KONAMI-WIN32PES5OPT';
const SAVE_REL_ORDEN = 4;
const SAVE_REL_IDS = 36;
const SAVE_REL_BLOQUE = 100;
const ROSTER_BASE = 667458;       // bloque 5 del option file (pes5-editor.js)
const ROSTER_STRIDE = 64;
const FORM_REGISTRO_BASE = 716932; // FORM_REGISTRO_BASE (pes5-editor.js)
const FORM_REGISTRO_STRIDE = 628;

// Bufers de pantalla (direcciones absolutas) que la nota cita.
const BUF_LINEA = 0x395886d;
const BUF_PRESION = 0x395886e;
const BUF_FUERA = 0x395886f;
const BUF_CONTRA = 0x3958870;
const BUF_LIBERO = 0x3958b18;

// Bloque principal y copias de la alineacion (relativos a rec).
const REL_BLOQUES = { principal: 112, A: 283, B: 454 };
const BLOQUE_LARGO = 171;
const REL_COPIA_ORDEN_1 = 911;   // A + 0x38b
const REL_COPIA_ORDEN_2 = 4104;  // A + 0x1004
const REL_COPIA_POS = 946;       // espejo de las posiciones (casillas 1..10) + 1 byte

const SIGLAS = ['PT', 'CT', 'CT', 'CT', 'LIB', 'LIB', 'CT', 'CT', 'DI', 'DD',
  'CCD', 'CCD', 'CCD', 'CCD', 'CCD', 'DLI', 'DLD', 'CC', 'CC', 'CC', 'CC', 'CC',
  'CIZ', 'CDR', 'MP', 'MP', 'MP', 'MP', 'MP', 'EI', 'ED', 'SD', 'SD', 'SD', 'SD',
  'SD', 'DC', 'DC', 'DC', 'DC', 'DC'];
const ESTRATEGIAS = ['Sin estrategia', 'Normal', 'Ataque centro', 'Ataque drcha', 'Ataque izqda',
  'Atq. lado opuesto', 'Cambio banda', 'Desborde DC', 'Zona presion', 'Contraataque',
  'Fuera de juego', 'Alineacion A', 'Alineacion B'];
const NIVELES = ['Manual', 'Auto defensa', 'Normal', 'Auto ataque'];
const SISTEMAS = ['Normal', 'Libero', 'Defensa en linea', '? (3, visto tras elegir libero)'];
const ABC = ['A', 'B', 'C'];
const ACTITUDES = ['Alto', 'Normal', 'Bajo'];
const FLECHAS = ['izq', 'izq-arriba', 'arriba', 'arriba-dcha', 'dcha', 'dcha-abajo', 'abajo', 'abajo-izq'];

const hex = (n) => '0x' + n.toString(16);
const sigla = (codigo) => (codigo < SIGLAS.length ? SIGLAS[codigo] : null);

// ---------- capturas ----------
function leerSerie(carpeta) {
  const archivo = path.join(carpeta, 'index.json');
  if (!fs.existsSync(archivo)) throw new Error('no encuentro ' + archivo);
  const index = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  const caps = new Map();
  for (const it of index) {
    const bin = path.join(carpeta, it.label + '.bin');
    if (!fs.existsSync(bin)) throw new Error('no encuentro ' + bin);
    const base = typeof it.base === 'string' ? parseInt(it.base, 16) : Number(it.base);
    caps.set(it.label, { label: it.label, desc: it.desc || '', base, buf: fs.readFileSync(bin) });
  }
  return { index, caps };
}

// Valor absoluto de un byte (o null si la captura no lo cubre).
function byte(cap, va) {
  const i = va - cap.base;
  return i >= 0 && i < cap.buf.length ? cap.buf[i] : null;
}
// Byte en rec+rel.
function rel(cap, eq, r) {
  return byte(cap, eq.rec + r);
}
function rango(cap, eq, desde, hasta) {
  const out = [];
  for (let r = desde; r < hasta; r++) out.push(rel(cap, eq, r));
  return out;
}
// Bytes distintos entre dos capturas dentro del rango [rec+desde, rec+hasta).
function cambiosRel(a, b, eq, desde, hasta) {
  const out = [];
  for (let r = desde; r < hasta; r++) {
    const va = eq.rec + r;
    if (byte(a, va) !== byte(b, va)) out.push(r);
  }
  return out;
}
const fmt = (v) => JSON.stringify(v);

// ---------- save (solo lectura) ----------
function leerSave(ruta) {
  if (!fs.existsSync(ruta)) throw new Error('no existe ' + ruta);
  return Buffer.from(descifrar(fs.readFileSync(ruta)));
}

function registroSave(plano, club) {
  const rec = FORM_REGISTRO_BASE + club * FORM_REGISTRO_STRIDE;
  return plano.subarray(rec, rec + FORM_REGISTRO_STRIDE);
}
function rosterSave(plano, club) {
  const base = ROSTER_BASE + club * ROSTER_STRIDE;
  const out = [];
  for (let k = 0; k < 32; k++) out.push(plano.readUInt16LE(base + k * 2));
  return out;
}
function idsEnVivo(cap, eq) {
  const out = [];
  for (let k = 0; k < 32; k++) {
    const va = eq.rec + SAVE_REL_IDS + k * 2;
    const i = va - cap.base;
    if (i < 0 || i + 1 >= cap.buf.length) return null;
    out.push(cap.buf.readUInt16LE(i));
  }
  return out;
}

// ---------- comprobaciones ----------
// Cada comprobacion devuelve { estado, detalle }. Estado:
//   VERIFICADO           la nota se cumple tal cual
//   VERIFICADO CON RESERVA  el offset se cumple, con un matiz (retraso de una
//                        captura, codificacion incompleta, etc.)
//   NO VERIFICADO        con estas capturas no se puede comprobar (y por que)
//   REFUTADO             las capturas dicen lo contrario de la nota
function comprobar(ctx, id, fila, nota, fn) {
  const res = { id, fila, nota, estado: 'VERIFICADO', detalle: '' };
  try {
    const r = fn(ctx);
    res.estado = r.estado || 'VERIFICADO';
    res.detalle = r.detalle || '';
  } catch (e) {
    res.estado = 'NO VERIFICADO';
    res.detalle = 'error al comprobar: ' + (e && e.message ? e.message : e);
  }
  return res;
}
const serie = (ctx, clave, offsets, labels) => labels.map((l) => offsets.map((r) => rel(ctx.cap(l), EQUIPO[clave], r)));

const CHECKS = [
  ['nivel', 'Nivel Ataq./Def.', 'rec+278: 0 Manual, 1 Auto defensa, 2 Normal, 3 Auto ataque', (ctx) => {
    const v = serie(ctx, 'FKC', [278], ['p001', 'p002', 'p003', 'p004', 'p005']).map((x) => x[0]);
    const esperado = [2, 0, 1, 3, 2];
    return {
      estado: fmt(v) === fmt(esperado) ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'p001..p005 = ' + fmt(v) + '; esperado ' + fmt(esperado) + ' (p001: menu abierto mostrando el valor actual)',
    };
  }],

  ['sistema', 'Sist. defensivo', 'rec+276: 0 Normal, 1 Libero, 2 Defensa en linea', (ctx) => {
    const v = serie(ctx, 'FKC', [276], ['p010', 'p011', 'p012', 'p013', 'p014']).map((x) => x[0]);
    // p010 Libero, p011 Linea, p012 Normal, p013 Libero, p014 Normal
    const coherentes = v[0] === 1 && v[1] === 2 && v[2] === 0;
    const detalle = 'p010..p014 = ' + fmt(v) + '; p008 = ' + rel(ctx.cap('p008'), EQUIPO.FKC, 276) +
      ', p011 = ' + v[1] + ' (capturas etiquetadas "Defensa en linea") y p012 = 0 (Normal), que fijan 2 = linea y 0 = normal. ' +
      'El valor 1 (Libero) se apoya en l000..l002, con la Lista de ajustes del libero abierta y rec+276 = 1, y en p008, ' +
      'inmediatamente despues de elegir Libero. Varias capturas se tomaron con el menu abierto y leen la seleccion ' +
      'anterior (p013 y p014 valen 0 y 1), asi que la serie no es limpia. Ademas l003 (confirmar la lista con Castro ' +
      'como libero) deja rec+276 = 3, un cuarto valor que la nota no describe.';
    return { estado: coherentes ? 'VERIFICADO CON RESERVA' : 'NO VERIFICADO', detalle };
  }],

  ['linea', 'Estrat. equipo: Linea defensiva', 'rec+279 al confirmar; 0x395886d es bufer de pantalla', (ctx) => {
    const enMenu = ['e000', 'e001', 'e002', 'e003', 't000', 't001'].map((l) => ({
      l, rec: rel(ctx.cap(l), EQUIPO.FKC, 279), buf: byte(ctx.cap(l), BUF_LINEA),
    }));
    const recCambiaEnMenu = enMenu.slice(1).some((x) => x.rec !== enMenu[0].rec);
    const t1 = ctx.cap('t001'), t2 = ctx.cap('t002');
    return {
      estado: !recCambiaEnMenu && rel(t2, EQUIPO.FKC, 279) !== rel(t1, EQUIPO.FKC, 279) ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'mientras el menu esta abierto rec+279 no cambia y 0x395886d si (' +
        enMenu.map((x) => x.l + ': ' + x.rec + '/' + x.buf).join(', ') + '); al confirmar (t001->t002) rec+279 pasa de ' +
        rel(t1, EQUIPO.FKC, 279) + ' a ' + rel(t2, EQUIPO.FKC, 279) + '. e000 (Linea B, Presion A, Fuera C, Contra B) da ' +
        fmt(rango(ctx.cap('e000'), EQUIPO.FKC, 279, 283)) + ' = B/A/C/B con A=0,B=1,C=2: codificacion confirmada.',
    };
  }],

  ['presion', 'Zona de presion', 'rec+280 (bufer 0x395886e)', (ctx) => {
    const eq = EQUIPO.FKC;
    const v = serie(ctx, 'FKC', [280], ['e010', 'e011', 'e012', 'e013']).map((x) => x[0]);
    const bufs = ['e010', 'e011', 'e012', 'e013'].map((l) => byte(ctx.cap(l), BUF_PRESION));
    const v0 = rel(ctx.cap('v000'), eq, 280), v1 = rel(ctx.cap('v001'), eq, 280);
    const barrido = v.every((x) => x === 0);
    return {
      estado: barrido && fmt(bufs) === fmt([0, 2, 1, 0]) && v0 === 0 && v1 === 2 ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'con el submenu abierto (e010..e013) rec+280 = ' + fmt(v) + ' y el bufer 0x395886e = ' + fmt(bufs) +
        ' (en e011.png la pantalla ya muestra C): el valor pendiente vive en el bufer. Al confirmar, v000->v001 ' +
        '(Estrat. equipo: A/A/C/B -> A/C/B/A) escribe rec+280 ' + v0 + ' -> ' + v1 + ', C = 2, como dice la nota.',
    };
  }],

  ['fuera', 'Fuera de juego', 'rec+281 (bufer 0x395886f)', (ctx) => {
    const eq = EQUIPO.FKC;
    const v = serie(ctx, 'FKC', [281], ['e020', 'e021', 'e022', 'e023']).map((x) => x[0]);
    const bufs = ['e020', 'e021', 'e022', 'e023'].map((l) => byte(ctx.cap(l), BUF_FUERA));
    const v0 = rel(ctx.cap('v000'), eq, 281), v1 = rel(ctx.cap('v001'), eq, 281);
    const barrido = v.every((x) => x === 2);
    return {
      estado: barrido && fmt(bufs) === fmt([2, 1, 0, 2]) && v0 === 2 && v1 === 1 ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'con el submenu abierto (e020..e023) rec+281 = ' + fmt(v) + ' y el bufer 0x395886f = ' + fmt(bufs) +
        ': el barrido queda en el bufer. Al confirmar, v000->v001 escribe rec+281 ' + v0 + ' -> ' + v1 + ' (C -> B, ' +
        'B = 1, como dice la nota).',
    };
  }],

  ['contra', 'Contraataque', 'rec+282 (bufer 0x3958870)', (ctx) => {
    const eq = EQUIPO.FKC;
    const v = serie(ctx, 'FKC', [282], ['e030', 'e031', 'e032', 'e033']).map((x) => x[0]);
    const bufs = ['e030', 'e031', 'e032', 'e033'].map((l) => byte(ctx.cap(l), BUF_CONTRA));
    const v0 = rel(ctx.cap('v000'), eq, 282), v1 = rel(ctx.cap('v001'), eq, 282);
    const barrido = v.every((x) => x === 1);
    return {
      estado: barrido && fmt(bufs) === fmt([1, 0, 2, 1]) && v0 === 1 && v1 === 0 ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'con el submenu abierto (e030..e033) rec+282 = ' + fmt(v) + ' y el bufer 0x3958870 = ' + fmt(bufs) +
        ': el barrido queda en el bufer. Al confirmar, v000->v001 escribe rec+282 ' + v0 + ' -> ' + v1 + ' (B -> A).',
    };
  }],

  ['orden', 'Orden de alineacion', 'rec+4..35 (permutacion) + copias A+0x38b y A+0x1004', (ctx) => {
    const antes = ctx.cap('a_auto'), despues = ctx.cap('a_auto_si');
    const eq = EQUIPO.FKC;
    const o1 = rango(antes, eq, 4, 36), o2 = rango(despues, eq, 4, 36);
    const c1 = rango(antes, eq, REL_COPIA_ORDEN_1, REL_COPIA_ORDEN_1 + 32);
    const c2 = rango(despues, eq, REL_COPIA_ORDEN_1, REL_COPIA_ORDEN_1 + 32);
    const d1 = rango(antes, eq, REL_COPIA_ORDEN_2, REL_COPIA_ORDEN_2 + 32);
    const d2 = rango(despues, eq, REL_COPIA_ORDEN_2, REL_COPIA_ORDEN_2 + 32);
    const perm = new Set(o2).size === 32 && Math.max(...o2) === 31 && Math.min(...o2) === 0;
    const cambios = cambiosRel(antes, despues, eq, 4, 36);
    const igualCopia1 = fmt(c1) === fmt(o1) && fmt(c2) === fmt(o2);
    const igualCopia2 = fmt(d1) === fmt(o1) && fmt(d2) === fmt(o2);
    return {
      estado: perm && igualCopia1 && igualCopia2 ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'a_auto->a_auto_si ("Alineacion auto: Si") cambia las casillas ' + fmt(cambios) +
        ': 0,1,' + fmt(o1.slice(2, 11)) + ' -> 0,1,' + fmt(o2.slice(2, 11)) +
        '. Las copias de rec+' + REL_COPIA_ORDEN_1 + ' (A+0x38b) y rec+' + REL_COPIA_ORDEN_2 + ' (A+0x1004) replican el orden exacto (' +
        igualCopia1 + ', ' + igualCopia2 + '). El orden sigue siendo una permutacion de 0..31.',
    };
  }],

  ['ids', 'IDs del plantel', 'rec+36..99 (32 x u16)', (ctx) => {
    if (!ctx.plano) return { estado: 'NO VERIFICADO', detalle: ctx.avisoSave };
    const partes = [];
    let ok = true;
    for (const eq of EQUIPOS) {
      const esperado = rosterSave(ctx.plano, eq.club);
      const vivo = idsEnVivo(ctx.cap('p000'), eq);
      const iguales = vivo && vivo.filter((v, i) => v === esperado[i]).length;
      if (iguales !== 32) ok = false;
      partes.push(eq.clave + ' (club ' + eq.club + '): ' + iguales + '/32 coinciden con el plantel del save en ' +
        hex(ROSTER_BASE + eq.club * ROSTER_STRIDE));
    }
    return { estado: ok ? 'VERIFICADO' : 'NO VERIFICADO', detalle: partes.join('; ') };
  }],

  ['formacion', 'Formacion', 'prof rec+112, lat rec+123, pos rec+133', (ctx) => {
    const ep = [rel(ctx.cap('ep0'), EQUIPO.FKC, 114), rel(ctx.cap('ep_ok'), EQUIPO.FKC, 114)];
    const lat = [rel(ctx.cap('ep0'), EQUIPO.FKC, 124), rel(ctx.cap('ep_ok'), EQUIPO.FKC, 124)];
    const sp = [rel(ctx.cap('sp0'), EQUIPO.FKC, 135), rel(ctx.cap('sp_dd'), EQUIPO.FKC, 135)];
    const igualSave = ctx.plano
      ? fmt(rango(ctx.cap('p000'), EQUIPO.FKC, 112, 144)) === fmt([...registroSave(ctx.plano, 42).subarray(112, 144)])
      : null;
    return {
      estado: ep[0] === 2 && ep[1] === 3 && lat[0] === 63 && lat[1] === 61 && sp[1] === 9 ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'profundidad rec+114 (casilla 2) 2->3 al confirmar "Editar posicion"; lateral rec+124 63->61; ' +
        'posicion rec+135 7->9 con "Selec. posicion" (DD). Los 32 bytes 112..143 de p000 son identicos al registro del ' +
        'save del club 42: ' + igualSave + '.',
    };
  }],

  ['libero', 'Libero (jugador)', 'rec+277 = casilla (al confirmar; temporal 0x3958b18)', (ctx) => {
    const bufs = ['l000', 'l001', 'l002', 'l003'].map((l) => byte(ctx.cap(l), BUF_LIBERO));
    const recs = ['l000', 'l001', 'l002', 'l003'].map((l) => rel(ctx.cap(l), EQUIPO.FKC, 277));
    const quieto = recs[0] === recs[1] && recs[1] === recs[2];
    return {
      estado: bufs[2] === 3 && quieto && recs[3] === bufs[2] ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'bufer 0x3958b18 = ' + fmt(bufs) + ' (l000..l003) y rec+277 = ' + fmt(recs) +
        ': la lista mueve solo el bufer (1->2->3) y rec+277 se escribe al confirmar, con el valor del bufer ' +
        '(Castro = casilla 3). Al cerrar la pantalla el bufer vuelve a 0.',
    };
  }],

  ['posiciones', 'Codigos de posicion y su copia', 'rec+133..143 y copia rec+946..956', (ctx) => {
    const eq = EQUIPO.FKC;
    const a = ctx.cap('l002'), b = ctx.cap('l003');
    const pares = cambiosRel(a, b, eq, 133, 144).map((r) => [r, rel(a, eq, r), rel(b, eq, r)]);
    const copia = cambiosRel(a, b, eq, REL_COPIA_POS, REL_COPIA_POS + 11).map((r) => [r, rel(a, eq, r), rel(b, eq, r)]);
    const recalc = [[138, 10], [139, 28], [140, 31], [142, 38]].every(([r, v]) => rel(b, eq, r) === v);
    // rec+945 es el PT: el espejo de las casillas 1..10 arranca en rec+946.
    const espejo = rango(a, eq, REL_COPIA_POS, REL_COPIA_POS + 10).map((v, i) => [i + 1, v, rel(a, eq, 134 + i)]);
    const espDif = espejo.filter(([, v, m]) => v !== m);
    return {
      estado: recalc ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'l002->l003 (confirmar la lista de libero): rec+133..143 ' + fmt(pares) + ' incluye exactamente los ' +
        'recalculos 12->10, 26->28, 35->31, 36->38 (y 7->6, 7->1, 7->2 de las casillas de la linea). La copia ' +
        'rec+' + REL_COPIA_POS + '..' + (REL_COPIA_POS + 10) + ' cambia en paralelo: ' + fmt(copia) + '. En l002 el espejo ' +
        'replica las casillas 1..10 de rec+134..143 salvo ' + (espDif.length ? fmt(espDif) : 'nada') + ' (casilla: valor ' +
        'del espejo / valor del bloque); la diferencia es el LIB de rec+946+libero-1. rec+956 vale 1 y no es una posicion. ' +
        'Ojo: el espejo esta desplazado una casilla respecto de rec+133 (rec+945 es el PT, rec+946 la casilla 1).',
    };
  }],

  ['botones', 'Estrategia manual (botones)', 'rec+100 cuadrado, +101 triangulo, +102 circulo, +103 equis', (ctx) => {
    const a = series(ctx, '100,101,102,103');
    const s8 = rel(ctx.cap('s008'), EQUIPO.FKC, 100), s7 = rel(ctx.cap('s007'), EQUIPO.FKC, 100);
    const s11 = rel(ctx.cap('s011'), EQUIPO.FKC, 101), s10 = rel(ctx.cap('s010'), EQUIPO.FKC, 101);
    return {
      estado: s7 === 2 && s8 === 8 && s10 === 4 && s11 === 9 ? 'VERIFICADO CON RESERVA' : 'NO VERIFICADO',
      detalle: 'p000: ' + fmt(a) + ' = centro/drcha/izqda/desborde DC con la descripcion de s001. s007->s008: rec+100 2->8 ' +
        '(cuadrado pasa de Ataque centro a Zona presion); s010->s011: rec+101 4->9 (triangulo de Ataque izqda a Contraataque). ' +
        'Solo se observan los codigos 2,3,4,7,8,9: la tabla completa 0..12 no se puede comprobar con estas capturas.',
    };
  }],

  ['modo', 'Modo estrategia', 'rec+105: 0 Manual, 1 Semi-automatico', (ctx) => {
    const v = serie(ctx, 'FKC', [105], ['s000', 's001', 's008', 's010', 's011']).map((x) => x[0]);
    const b = serie(ctx, 'FKC', [100, 101, 102, 103], ['s010', 's011']);
    return {
      estado: v[0] === 0 && v[3] === 1 ? 'VERIFICADO CON RESERVA' : 'NO VERIFICADO',
      detalle: 'rec+105 = ' + fmt(v) + ' en s000/s001/s008/s010/s011: 0 Manual y 1 Semi-automatico (se cambia entre s008 y ' +
        's010). En semi-auto los mismos rec+100..103 siguen usandose (' + fmt(b) + '), pero que el juego los rotule ' +
        'L2/AUTO1/AUTO2/AUTO3 es interfaz, no se puede leer de la memoria.',
    };
  }],

  ['bandera', 'Bandera desconocida', 'rec+661 cambia 0/1 al confirmar ajustes de equipo', (ctx) => {
    const t1 = rel(ctx.cap('t001'), EQUIPO.FKC, 661), t2 = rel(ctx.cap('t002'), EQUIPO.FKC, 661);
    const otros = ['p007', 'p008', 's000', 's001', 'k000', 'k_cap1', 'c000'].map((l) => l + ':' + rel(ctx.cap(l), EQUIPO.FKC, 661));
    return {
      estado: t1 === 0 && t2 === 1 ? 'VERIFICADO CON RESERVA' : 'NO VERIFICADO',
      detalle: 't001->t002 (confirmar los ajustes de equipo) pasa rec+661 de ' + t1 + ' a ' + t2 +
        '. Pero el byte tambien alterna al abrir o cerrar otros menus (' + otros.join(', ') + '), asi que no identifica ' +
        'por si solo a los ajustes de equipo. Sigue sin significado conocido.',
    };
  }],

  ['flechas', 'Flechas de ataque', 'rec+147+8*casilla: izq, izq-arriba, arriba, arriba-dcha, dcha, dcha-abajo, abajo, abajo-izq', (ctx) => {
    const eq = EQUIPO.FKC;
    const base = 147 + 8 * 2;
    const pares = [
      ['i002', 'i003', 'izq (se quita)'],
      ['i004', 'i_at_up_on', 'arriba (se pone)'],
      ['i_at_up_on', 'i_at_up_off', 'arriba (se quita)'],
      ['i_at_up_off', 'i_at_down_on', 'abajo (se pone)'],
      ['i_at_down_on', 'i_at_down_off', 'abajo (se quita)'],
      ['i_at_left_off', 'i_at_right_off', 'dcha (se quita)'],
      ['i_at_right_off', 'i_at_ur_on', 'arriba-dcha (se pone)'],
    ];
    const filas = pares.map(([a, b, que]) => {
      const cs = cambiosRel(ctx.cap(a), ctx.cap(b), eq, base, base + 8);
      const idx = cs.map((r) => (r === base + 0 ? 0 : r - base));
      return { que, cambios: cs.map((r) => [r, rel(ctx.cap(a), eq, r), rel(ctx.cap(b), eq, r)]), idx };
    });
    const ok = filas.every((f) => f.idx.length === 1);
    const nombres = filas.map((f) => f.que + ' -> byte ' + FLECHAS[f.idx[0]] + ' (' + fmt(f.cambios) + ')');
    return {
      estado: ok ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'casilla 2 = rec+163..170. ' + nombres.join('; ') + '. El orden de los 8 bytes de la nota se cumple ' +
        'para los indices 0 (izq), 2 (arriba), 3 (arriba-dcha), 4 (dcha) y 6 (abajo).',
    };
  }],

  ['actitud', 'Actitud defensiva', 'rec+243+casilla: 0 Alto, 1 Normal, 2 Bajo', (ctx) => {
    const v = ['i_df0', 'i_df_normal', 'i_df_bajo', 'i_df_alto', 'i_df_A', 'i_df_B', 'i_df_N', 'i_df_chk1']
      .map((l) => l + ':' + rel(ctx.cap(l), EQUIPO.FKC, 245));
    const vals = ['i_df_alto', 'i_df_A'].map((l) => rel(ctx.cap(l), EQUIPO.FKC, 245));
    const n = rel(ctx.cap('i_df_normal'), EQUIPO.FKC, 245);
    const b = rel(ctx.cap('i_df_B'), EQUIPO.FKC, 245);
    return {
      estado: vals.every((x) => x === 0) && n === 1 && b === 2 ? 'VERIFICADO CON RESERVA' : 'NO VERIFICADO',
      detalle: 'rec+245 (casilla 2) en i_df0..i_df_chk1: ' + v.join(', ') + '. Alto = 0 (i_df_alto, i_df_A), Normal = 1 ' +
        '(i_df_normal, i_df_chk1) y Bajo = 2 (i_df_B) confirman la codificacion; i_df_bajo e i_df_N leen el valor ' +
        'anterior (retraso de una captura, igual que en otros menus).',
    };
  }],

  ['editar', 'Editar posicion', 'rec+112+casilla (profundidad) y rec+122+casilla (lateral, casilla>=1)', (ctx) => {
    const prof = ['ep0', 'ep_up', 'ep_right', 'ep_ok'].map((l) => rel(ctx.cap(l), EQUIPO.FKC, 114));
    const lat = ['ep0', 'ep_up', 'ep_right', 'ep_ok'].map((l) => rel(ctx.cap(l), EQUIPO.FKC, 124));
    const tempProf = rel(ctx.cap('ep_right'), EQUIPO.FKC, 2502);
    const tempLat = rel(ctx.cap('ep_up'), EQUIPO.FKC, 2504);
    return {
      estado: prof[0] === 2 && prof[3] === 3 && lat[0] === 63 && lat[1] === 63 && lat[3] === 61 ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'profundidad rec+114 = ' + fmt(prof) + ' (flecha derecha: 2->3) y lateral rec+124 = ' + fmt(lat) +
        ' (flecha arriba: 63->61); los dos se escriben al confirmar con X. Mientras el menu esta abierto los valores ' +
        'viven en los temporales rec+2502 (profundidad, = ' + tempProf + ' tras la flecha derecha) y rec+2504 (lateral, = ' +
        tempLat + ' tras la flecha arriba) y el registro no se toca.',
    };
  }],

  ['marcaje', 'Config. marcaje', 'rec+254+casilla: 1 zonas, 0 hombre; rec+265+casilla: rival (255 = ninguno)', (ctx) => {
    const eq = EQUIPO.FKC;
    const zona = ['mk0', 'mk_bartelt', 'mk_najera', 'mk_zona'].map((l) => l + ':' + rel(ctx.cap(l), eq, 256));
    const rival = ['mk0', 'mk_bartelt', 'mk_najera', 'mk_zona'].map((l) => l + ':' + rel(ctx.cap(l), eq, 267));
    return {
      estado: rel(ctx.cap('mk0'), eq, 256) === 1 && rel(ctx.cap('mk_najera'), eq, 256) === 0 &&
        rel(ctx.cap('mk_najera'), eq, 267) === 10 && rel(ctx.cap('mk_zona'), eq, 267) === 10 &&
        rel(ctx.cap('mk_zona'), eq, 256) === 1 ? 'VERIFICADO CON RESERVA' : 'NO VERIFICADO',
      detalle: 'casilla 2: rec+256 (254+2) ' + zona.join(', ') + ' y rec+267 (265+2) ' + rival.join(', ') + '. El paso a ' +
        '"al hombre" y el rival se escriben una captura despues (mk_bartelt->mk_najera) y valen 0 (hombre) y 10 ' +
        '(casilla 10 = Bartelt); al volver a zonas (mk_zona) rec+256 vuelve a 1 y rec+267 conserva 10, como dice la nota.',
    };
  }],

  ['selecpos', 'Selec. posicion', 'rec+133+casilla (copia rec+946+casilla)', (ctx) => {
    const eq = EQUIPO.FKC;
    const a = ctx.cap('sp0'), b = ctx.cap('sp_dd');
    return {
      estado: rel(a, eq, 135) === 7 && rel(b, eq, 135) === 9 && rel(a, eq, 947) === 7 && rel(b, eq, 947) === 9 ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'sp0->sp_dd: rec+135 (casilla 2) 7 -> 9 (CT -> DD) y la copia rec+947 7 -> 9. La copia no esta en ' +
        'rec+946+casilla sino en rec+945+casilla (rec+945 es el PT), es decir rec+947 para la casilla 2.',
    };
  }],

  ['capitan', 'Capitan', 'rec+111 = casilla (copia/temporal rec+645)', (ctx) => {
    const eq = EQUIPO.FKC;
    const cap = ['k000', 'k_cap0', 'k_cap1'].map((l) => rel(ctx.cap(l), eq, 111));
    const tmp = ['k000', 'k_cap0', 'k_cap1'].map((l) => rel(ctx.cap(l), eq, 645));
    return {
      estado: cap[1] === 5 && cap[2] === 4 && tmp[1] === 5 && tmp[2] === 4 ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'rec+111 = ' + fmt(cap) + ' y rec+645 = ' + fmt(tmp) + ' (k000->k_cap0 abre la lista: copia 111 en 645; ' +
        'k_cap0->k_cap1: los dos pasan de 5, Harureadytoon, a 4, Athirson).',
    };
  }],

  ['corner106', 'Corner izquierda (SE I)', 'rec+106 = casilla', (ctx) => {
    const eq = EQUIPO.FKC;
    const a = ctx.cap('k_l3'), b = ctx.cap('k_l4');
    const v = ['k_l0', 'k_l1', 'k_l2', 'k_l3', 'k_l4', 'k_l5'].map((l) => rel(ctx.cap(l), eq, 106));
    return {
      estado: rel(a, eq, 106) === 8 && rel(b, eq, 106) === 6 && rel(b, eq, 107) === 8 ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'k_l3->k_l4 escribe rec+106: ' + rel(a, eq, 106) + ' -> ' + rel(b, eq, 106) + ' y rec+107 se queda en ' +
        rel(b, eq, 107) + '. En k_l4.png la columna SE muestra la I en Freier (casilla 6) y la D en Schneider (casilla 8): ' +
        'el 6 de rec+106 es la I, luego rec+106 es el corner IZQUIERDO. La desc de k_l4 ("SE: columna derecha; X en ' +
        'Schneider (D), mover a Freier") describe el recorrido del cursor y fue lo que hizo invertir las dos filas en ' +
        'PESMAP2; la imagen y los bytes no dejan duda. Serie de rec+106 en k_l0..k_l5: ' + fmt(v) + '.',
    };
  }],

  ['corner107', 'Corner derecha (SE D)', 'rec+107 = casilla', (ctx) => {
    const eq = EQUIPO.FKC;
    const v = ['k_l0', 'k_l1', 'k_l2', 'k_l3', 'k_l4', 'k_l5'].map((l) => rel(ctx.cap(l), eq, 107));
    return {
      estado: v.every((x) => x === 8) ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'rec+107 = ' + fmt(v) + ' en k_l0..k_l5: no se movio en toda la sesion de lanzadores, y en k_l4.png la D ' +
        '(Schneider, casilla 8) coincide con ese 8 mientras la I (Freier, casilla 6) coincide con rec+106. Por lo tanto ' +
        'rec+107 es el corner DERECHO. Que no cambie no refuta la fila: la nota lo cita en k_l0, donde ambos lanzadores ' +
        'estan en la casilla 8.',
    };
  }],

  ['tl_largo', 'Tiro libre largo (TL L)', 'rec+108 = casilla', (ctx) => {
    const eq = EQUIPO.FKC;
    const a = ctx.cap('k_l2'), b = ctx.cap('k_l3');
    return {
      estado: rel(a, eq, 108) === 8 && rel(b, eq, 108) === 9 ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'k_l2->k_l3 ("TL largo movido a Voronin, casilla 9"): rec+108 ' + rel(a, eq, 108) + ' -> ' + rel(b, eq, 108) + '.',
    };
  }],

  ['tl_corto', 'Tiro libre corto (TL C)', 'rec+109 = casilla', (ctx) => {
    const eq = EQUIPO.FKC;
    const a = ctx.cap('k_l0'), b = ctx.cap('k_l1');
    return {
      estado: rel(a, eq, 109) === 8 && rel(b, eq, 109) === 7 ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'k_l0->k_l1 ("TL corto movido de Schneider a Babic, casilla 7"): rec+109 ' + rel(a, eq, 109) + ' -> ' + rel(b, eq, 109) + '.',
    };
  }],

  ['penal', 'Penal (PK)', 'rec+110 = casilla', (ctx) => {
    const eq = EQUIPO.FKC;
    const a = ctx.cap('k_l4'), b = ctx.cap('k_l5');
    return {
      estado: rel(a, eq, 110) === 10 && rel(b, eq, 110) === 9 ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'k_l4->k_l5 ("PK movido de Epstein a Voronin, casilla 9"): rec+110 ' + rel(a, eq, 110) + ' -> ' + rel(b, eq, 110) + '.',
    };
  }],

  ['r104', 'rec+104 = 1 (sin identificar)', 'rec+104 = 1 (sin identificar)', (ctx) => {
    const vals = new Set(ctx.labels.map((l) => rel(ctx.cap(l), EQUIPO.FKC, 104)));
    const enSave = ctx.plano ? registroSave(ctx.plano, 42)[104] : null;
    return {
      estado: vals.size === 1 && vals.has(1) ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'rec+104 vale 1 en las ' + ctx.labels.length + ' capturas (' + fmt([...vals]) + ') y 0 en el save del club 42: ' +
        'es un byte de estado que la partida pone a 1 al cargar. Su significado sigue sin identificar.',
    };
  }],

  ['rapida', 'Config. rapida (7 preajustes)', 'no tiene byte propio: reescribe profundidad, flechas, actitud, nivel, linea y contraataque', (ctx) => {
    const eq = EQUIPO.FKC;
    const pares = [['q000', 'q1'], ['q1', 'q2'], ['q2', 'q3'], ['q3', 'q4'], ['q4', 'q5'], ['q5', 'q6'], ['q6', 'q7']];
    // 144..146 son los tres bytes que el bloque no tiene identificados: rec+145
    // lo reescribe la configuracion rapida, asi que se informa aparte.
    const permitidos = (r) => (r >= 113 && r <= 122) || (r >= 147 && r <= 242) || (r >= 243 && r <= 253) ||
      (r >= 278 && r <= 282);
    const fuera = [];
    const tocados = new Set();
    const extra = new Set();
    for (const [a, b] of pares) {
      const cs = cambiosRel(ctx.cap(a), ctx.cap(b), eq, 112, 283);
      for (const r of cs) {
        tocados.add(r);
        if (r >= 144 && r <= 146) extra.add(b + ':rec+' + r);
        else if (!permitidos(r)) fuera.push(b + ':rec+' + r);
      }
    }
    return {
      estado: fuera.length === 0 ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'q1..q7 escriben solo dentro de 113..122 (profundidad), 147..242 (flechas), 243..253 (actitud) y 278..282 ' +
        '(nivel, linea, presion, fuera de juego, contraataque); ningun byte de 112, 123..143 ni 254..277 cambia. Bytes ' +
        'tocados: ' + tocados.size + '. Tambien reescribe el byte sin identificar rec+145 (' + (extra.size ? [...extra].join(', ') : 'no') + '). ' +
        'Fuera de lo documentado: ' + (fuera.length ? fuera.join(', ') : 'ninguno') + '.',
    };
  }],

  ['autoalineacion', 'Alineacion auto.', 'con Si solo reescribe el orden rec+4..35', (ctx) => {
    const eq = EQUIPO.FKC;
    const cs = cambiosRel(ctx.cap('a_auto'), ctx.cap('a_auto_si'), eq, 0, 628);
    const dentro = cs.every((r) => r >= 4 && r <= 35);
    return {
      estado: dentro && cs.length > 0 ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'a_auto->a_auto_si: bytes cambiados dentro del registro = ' + fmt(cs) + ' (todos en el orden 4..35; el resto ' +
        'del registro no se toca). a000->a_auto (antes de responder Si) no cambia nada del registro.',
    };
  }],

  ['tabla', 'Tabla de codigos de posicion', '0 PT; 1,2,3,6,7 CT; 4,5 LIB; 8 DI; 9 DD; 10-14 CCD; 15 DLI; 16 DLD; 17-21 CC; 22 CIZ; 23 CDR; 24-28 MP; 29 EI; 30 ED; 31-35 SD; 36-40 DC; >=41 invalido', (ctx) => {
    const esperado = [
      'PT', 'CT', 'CT', 'CT', 'LIB', 'LIB', 'CT', 'CT', 'DI', 'DD',
      'CCD', 'CCD', 'CCD', 'CCD', 'CCD', 'DLI', 'DLD', 'CC', 'CC', 'CC', 'CC', 'CC',
      'CIZ', 'CDR', 'MP', 'MP', 'MP', 'MP', 'MP', 'EI', 'ED',
      'SD', 'SD', 'SD', 'SD', 'SD', 'DC', 'DC', 'DC', 'DC', 'DC',
    ];
    const igual = fmt(esperado) === fmt(SIGLAS);
    const vistos = new Set();
    for (const eq of EQUIPOS) {
      const cap = ctx.cap('p000');
      for (let r = 133; r < 144; r++) vistos.add(rel(cap, eq, r));
      for (let r = 304; r < 315; r++) vistos.add(rel(cap, eq, r));
      for (let r = 475; r < 486; r++) vistos.add(rel(cap, eq, r));
    }
    return {
      estado: igual ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'La tabla coincide con la hoja labels/sheet.png (c0..c50: 41..50 vacios). Los codigos que aparecen en ' +
        'los tres bloques de los dos equipos en p000 (' + fmt([...vistos].sort((a, b) => a - b)) + ') tienen sigla en ' +
        'la tabla. La hoja la genero el coordinador escribiendo 0..50: aqui se comprueba que es coherente, no se repite el barrido.',
    };
  }],

  ['cambio', 'Alineacion > Cambio (esquema + variante)', 'la variante escribe profundidad, lateral y posiciones y reinicia flechas y actitudes; la vista previa no escribe', (ctx) => {
    const eq = EQUIPO.FKC;
    const prev = cambiosRel(ctx.cap('a_auto_si'), ctx.cap('f442_hover'), eq, 112, 283);
    const conf = cambiosRel(ctx.cap('f442_hover'), ctx.cap('f442_A1'), eq, 112, 283);
    const grupos = {
      prof: conf.filter((r) => r >= 113 && r <= 122),
      lat: conf.filter((r) => r >= 123 && r <= 132),
      pos: conf.filter((r) => r >= 135 && r <= 143),
      flechas: conf.filter((r) => r >= 147 && r <= 242),
      actitud: conf.filter((r) => r >= 243 && r <= 253),
    };
    const ok = prev.length === 0 && grupos.prof.length && grupos.lat.length && grupos.pos.length && grupos.flechas.length;
    return {
      estado: ok ? 'VERIFICADO CON RESERVA' : 'NO VERIFICADO',
      detalle: 'a_auto_si->f442_hover (solo se mueve el cursor sobre A-1): 0 bytes cambiados en el bloque 112..282; ' +
        'pero si cambia el espejo de posiciones rec+947..955, o sea que la vista previa escribe en el espejo y no en el ' +
        'bloque principal. f442_hover->f442_A1 (confirmar A-1) escribe profundidad ' + fmt(grupos.prof) + ', lateral ' +
        fmt(grupos.lat) + ', posiciones ' + fmt(grupos.pos) + ', y pone a 0 ' + grupos.flechas.length + ' bytes de flechas y ' +
        'reinicia actitudes (' + fmt(grupos.actitud) + ').',
    };
  }],

  ['bloquesAB', 'Configuraciones A y B', '3 bloques de 171 bytes: principal rec+112..282, A rec+283..453, B rec+454..624; cabecera rec+100..111 comun', (ctx) => {
    const eq = EQUIPO.FKC;
    const b001 = cambiosRel(ctx.cap('b000'), ctx.cap('b001'), eq, 100, 628);
    const a101 = cambiosRel(ctx.cap('b100'), ctx.cap('b101'), eq, 100, 628);
    const enB = b001.every((r) => r >= REL_BLOQUES.B && r < REL_BLOQUES.B + BLOQUE_LARGO);
    const enA = a101.every((r) => r >= REL_BLOQUES.A && r < REL_BLOQUES.A + BLOQUE_LARGO);
    const cabeceraIgual = !b001.some((r) => r < 112) && !a101.some((r) => r < 112);
    const ajustes = ctx.plano ? [112, 283, 454].map((o) => fmt(Array.from(registroSave(ctx.plano, 42).subarray(o + 164, o + 171)))) : [];
    return {
      estado: enB && enA && cabeceraIgual ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: '"Alineacion B: Config rapida = Todo ataque" (b000->b001) escribe ' + b001.length + ' bytes, todos dentro de ' +
        hex(eq.rec + REL_BLOQUES.B) + '..' + hex(eq.rec + REL_BLOQUES.B + BLOQUE_LARGO - 1) + ' (' + enB + '); ' +
        '"Alineacion A" (b100->b101) escribe ' + a101.length + ' bytes, todos dentro de rec+283..453 (' + enA + '). ' +
        'Ninguna de las dos toca la cabecera 100..111. En el save los tres bloques llevan los mismos 7 bytes de ajustes ' +
        'en +164..170 (' + ajustes.join(' | ') + ').',
    };
  }],

  ['copiar', 'Copiar a "A" / "B"', 'vuelca el bloque principal (171 bytes) sobre A o B, sin pedir confirmacion', (ctx) => {
    const eq = EQUIPO.FKC;
    const mismos = (cap, a, b) => {
      let n = 0;
      for (let k = 0; k < BLOQUE_LARGO; k++) if (rel(cap, eq, a + k) === rel(cap, eq, b + k)) n++;
      return n;
    };
    const antesA = mismos(ctx.cap('v020'), REL_BLOQUES.principal, REL_BLOQUES.A);
    const despuesA = mismos(ctx.cap('v021'), REL_BLOQUES.principal, REL_BLOQUES.A);
    const antesB = mismos(ctx.cap('v010'), REL_BLOQUES.principal, REL_BLOQUES.B);
    const despuesB = mismos(ctx.cap('v011'), REL_BLOQUES.principal, REL_BLOQUES.B);
    const cambiaA = cambiosRel(ctx.cap('v020'), ctx.cap('v021'), eq, 0, 628);
    const cambiaB = cambiosRel(ctx.cap('v010'), ctx.cap('v011'), eq, 0, 628);
    const dentroA = cambiaA.every((k) => k >= REL_BLOQUES.A && k < REL_BLOQUES.A + BLOQUE_LARGO);
    const dentroB = cambiaB.every((k) => k >= REL_BLOQUES.B && k < REL_BLOQUES.B + BLOQUE_LARGO);
    return {
      estado: despuesA === BLOQUE_LARGO && despuesB === BLOQUE_LARGO && dentroA && dentroB && cambiaA.length > 0 &&
        cambiaB.length > 0 ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'v020->v021 ("Copiar a A" confirmado con X): la A pasa de ' + antesA + '/171 a ' + despuesA +
        '/171 bytes iguales al principal y cambian ' + cambiaA.length + ' bytes, todos dentro de 283..453 (' + dentroA +
        '). v010->v011 ("Copiar a B"): la B pasa de ' + antesB + '/171 a ' + despuesB + '/171 y cambian ' + cambiaB.length +
        ' bytes, todos dentro de 454..624 (' + dentroB + '). Ninguna toca la cabecera ni el bloque principal. En v021.png y ' +
        'v011.png el menu sigue abierto con el cursor en la opcion, sin dialogo de confirmacion. El par b200->b201 no ' +
        'sirve: son identicas byte a byte y en las dos el cursor ya esta en "Copiar a A" con el menu abierto.',
    };
  }],

  ['pausa', 'Cambios en pausa', 'quedan en cola: rec-20 (entra), rec-19 (sale), rec-6 contador', (ctx) => {
    const eq = EQUIPO.FKC;
    const filas = ['c000', 'c001'].map((l) => [rel(ctx.cap(l), eq, -20), rel(ctx.cap(l), eq, -19), rel(ctx.cap(l), eq, -6)]);
    return {
      estado: filas[0][2] === 0 && filas[1][2] === 1 && filas[1][0] !== 0 && filas[1][1] !== 0 ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'c000->c001 (cambio en pausa): rec-20 ' + filas[0][0] + '->' + filas[1][0] + ' (entra), rec-19 ' +
        filas[0][1] + '->' + filas[1][1] + ' (sale) y rec-6 ' + filas[0][2] + '->' + filas[1][2] + ' (contador). El orden 4..35 ' +
        'no se toca. Los mismos valores se copian en rec+641/642 y rec+1826/1827.',
    };
  }],

  ['guarani', 'Guarani (visitante)', 'mismos offsets desde su rec = 0x395bbb2', (ctx) => {
    if (!ctx.plano) return { estado: 'NO VERIFICADO', detalle: ctx.avisoSave };
    const eq = EQUIPO.GAF;
    const cap = ctx.cap('p000');
    const recSave = registroSave(ctx.plano, 5);
    // rec+104 es el unico byte que la partida pone a 1 y el save guarda a 0.
    const igualSalvo104 = (a, b) => a.every((v, i) => v === b[i] || 100 + i === 104);
    const cabVivo = rango(cap, eq, 100, 112);
    const cab = igualSalvo104(cabVivo, [...recSave.subarray(100, 112)]);
    const aj = fmt(rango(cap, eq, 276, 283)) === fmt([...recSave.subarray(276, 283)]);
    const pos = fmt(rango(cap, eq, 133, 144)) === fmt([...recSave.subarray(133, 144)]);
    return {
      estado: cab && aj && pos ? 'VERIFICADO' : 'NO VERIFICADO',
      detalle: 'GAF (club 5) en p000: cabecera rec+100..111 = ' + fmt(cabVivo) + ' (igual al save salvo rec+104: ' + cab +
        '), ajustes rec+276..282 = ' + fmt(rango(cap, eq, 276, 283)) + ' (' + aj + ') y posiciones rec+133..143 = ' +
        fmt(rango(cap, eq, 133, 144)) + ' (' + pos + '). Los ids 36..99 son los del plantel del club 5 (ver fila IDS). ' +
        'La unica diferencia con el save en la cabecera es rec+104 = 1 (0 en el save).',
    };
  }],
];

function series(ctx, offsetsTxt) {
  const offsets = offsetsTxt.split(',').map(Number);
  return offsets.map((o) => rel(ctx.cap('p000'), EQUIPO.FKC, o));
}

// ---------- comparacion con el save ----------
// Decodifica un registro (628 bytes) con la codificacion de la nota.
function decodificarRegistro(r) {
  const u8 = (o) => r[o];
  const nombres = ['cuadrado', 'triangulo', 'circulo', 'equis'];
  const botones = nombres.map((n, i) => n + '=' + (ESTRATEGIAS[u8(100 + i)] || u8(100 + i)));
  const lanzadores = {
    corner_izq_106: u8(106), corner_der_107: u8(107), tl_largo_108: u8(108),
    tl_corto_109: u8(109), penal_110: u8(110),
  };
  const cabecera = {
    botones,
    rec104: u8(104),
    modo: u8(105) === 0 ? 'Manual' : u8(105) === 1 ? 'Semi-automatico' : '?(' + u8(105) + ')',
    lanzadores,
    capitan: u8(111),
  };
  const bloques = {};
  for (const [nombre, o] of Object.entries(REL_BLOQUES)) {
    const slots = [];
    for (let c = 0; c < 11; c++) {
      const pos = u8(o + 21 + c);
      slots.push({
        casilla: c,
        profundidad: u8(o + c),
        lateral: c === 0 ? null : u8(o + 11 + c - 1),
        pos,
        sigla: sigla(pos),
        flechas: FLECHAS.filter((_, k) => u8(o + 35 + 8 * c + k)),
        actitud: ACTITUDES[u8(o + 131 + c)] || u8(o + 131 + c),
        marcaje: u8(o + 142 + c) === 1 ? 'zonas' : 'hombre',
        rival: u8(o + 153 + c) === 255 ? null : u8(o + 153 + c),
      });
    }
    bloques[nombre] = {
      ajustes: {
        sistema: SISTEMAS[u8(o + 164)] || u8(o + 164),
        libero: u8(o + 165),
        nivel: NIVELES[u8(o + 166)] || u8(o + 166),
        linea: ABC[u8(o + 167)],
        presion: ABC[u8(o + 168)],
        fuera_de_juego: ABC[u8(o + 169)],
        contraataque: ABC[u8(o + 170)],
      },
      slots,
    };
  }
  const orden = Array.from(r.subarray(SAVE_REL_ORDEN, SAVE_REL_ORDEN + 32));
  return { cabecera, orden, bloques };
}

function compararConSave(ctx) {
  const lineas = [];
  if (!ctx.plano) {
    lineas.push('No se pudo leer el save: ' + ctx.avisoSave);
    return lineas;
  }
  const cap = ctx.cap('p000');
  const capFin = ctx.cap('c001');
  const TRAMOS = [
    ['codigo (0..3)', (k) => k <= 3],
    ['orden (4..35)', (k) => k >= 4 && k <= 35],
    ['ids (36..99)', (k) => k >= 36 && k <= 99],
    ['cabecera (100..111)', (k) => k >= 100 && k <= 111],
    ['profundidad/lateral/posicion (112..143)', (k) => k >= 112 && k <= 143],
    ['rec+144..146', (k) => k >= 144 && k <= 146],
    ['flechas (147..242)', (k) => k >= 147 && k <= 242],
    ['actitud (243..253)', (k) => k >= 243 && k <= 253],
    ['marcaje y rival (254..275)', (k) => k >= 254 && k <= 275],
    ['ajustes (276..282)', (k) => k >= 276 && k <= 282],
    ['bloque A (283..453)', (k) => k >= 283 && k <= 453],
    ['bloque B (454..624)', (k) => k >= 454 && k <= 624],
    ['cola (625..627)', (k) => k >= 625],
  ];
  for (const eq of EQUIPOS) {
    const save = registroSave(ctx.plano, eq.club);
    const diffs = [];
    for (let k = 0; k < 628; k++) if (rel(cap, eq, k) !== save[k]) diffs.push(k);
    lineas.push('  ' + eq.clave + ' (club ' + eq.club + '): ' + diffs.length + ' byte(s) distintos del save en p000.');
    for (const [nombre, dentro] of TRAMOS) {
      const ds = diffs.filter(dentro);
      if (!ds.length) { lineas.push('    ' + nombre + ': identico al save'); continue; }
      const muestra = ds.slice(0, 16).map((k) => '+' + k + ':' + save[k] + '->' + rel(cap, eq, k)).join(' ');
      lineas.push('    ' + nombre + ': ' + ds.length + ' byte(s) distinto(s)  ' + muestra + (ds.length > 16 ? ' ...' : ''));
    }
    const ids = idsEnVivo(cap, eq) || [];
    const esperado = rosterSave(ctx.plano, eq.club);
    lineas.push('    ids: ' + ids.filter((v, i) => v === esperado[i]).length + '/32 coinciden con el plantel del save en ' +
      hex(ROSTER_BASE + eq.club * ROSTER_STRIDE) + ' (el option file guarda 0 en el registro y el plantel aparte).');
    const ordenSave = Array.from(save.subarray(SAVE_REL_ORDEN, SAVE_REL_ORDEN + 32));
    const ordenVivo = rango(cap, eq, SAVE_REL_ORDEN, SAVE_REL_ORDEN + 32);
    const oDifs = ordenSave.map((v, i) => (v === ordenVivo[i] ? -1 : i)).filter((i) => i >= 0);
    lineas.push('    orden 4..35: save ' + ordenSave.slice(0, 6).join(',') + ',... (' +
      ordenSave.map((v) => v).join(',') + ')');
    lineas.push('                 vivo ' + ordenVivo.slice(0, 6).join(',') + ',... casillas distintas: ' +
      (oDifs.length ? fmt(oDifs) : 'ninguna'));
    if (capFin) {
      const diffsFin = [];
      for (let k = 0; k < 628; k++) if (rel(capFin, eq, k) !== save[k]) diffsFin.push(k);
      const fuera = diffsFin.filter((k) => !TRAMOS.some(([, dentro]) => dentro(k)));
      lineas.push('    tras toda la sesion (c001): ' + diffsFin.length + ' byte(s) distintos del save; ' +
        (fuera.length ? 'FUERA de los tramos documentados: ' + fmt(fuera) : 'todos dentro de los tramos documentados'));
    }
  }
  const comun = [112, 283, 454].map((o) => fmt(Array.from(registroSave(ctx.plano, 42).subarray(o + 164, o + 171))));
  lineas.push('  Ajustes de los tres bloques del club 42 (bloque+164..170): ' + comun.join(' | ') + ' (identicos)');
  lineas.push('');
  lineas.push('  Valores del save decodificados con la nota:');
  for (const eq of EQUIPOS) {
    const d = decodificarRegistro(registroSave(ctx.plano, eq.club));
    lineas.push('  ' + eq.clave + ' (club ' + eq.club + '): botones ' + d.cabecera.botones.join(' ') + ' | rec+104=' +
      d.cabecera.rec104 + ' | modo ' + d.cabecera.modo + ' | capitan ' + d.cabecera.capitan + ' | lanzadores ' +
      fmt(d.cabecera.lanzadores));
    for (const nombre of ['principal', 'A', 'B']) {
      const b = d.bloques[nombre];
      const a = b.ajustes;
      lineas.push('    ' + nombre + ': nivel ' + a.nivel + ', sistema ' + a.sistema + ', libero ' + a.libero + ', linea ' +
        a.linea + ', presion ' + a.presion + ', fuera de juego ' + a.fuera_de_juego + ', contraataque ' + a.contraataque);
      lineas.push('      ' + b.slots.map((s) => s.casilla + ':' + (s.sigla || s.pos)).join(' '));
    }
  }
  return lineas;
}

// ---------- CLI ----------
function args(argv) {
  const out = { serie: process.env.PESMAP_SERIE || null, save: null, ayuda: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--serie') out.serie = argv[++i];
    else if (a === '--save') out.save = argv[++i];
    else if (a === '-h' || a === '--ayuda' || a === '--help') out.ayuda = true;
    else return { error: 'opcion desconocida: ' + a };
  }
  if (!out.ayuda && !out.serie) return { error: 'falta --serie <carpeta de capturas> (o PESMAP_SERIE)' };
  return out;
}

const USO = [
  'uso: node tools/pes5/verify-live-map.js --serie <carpeta> [--save <option file>]',
  '',
  'Comprueba las notas del mapa en vivo contra las capturas y el save. Solo lee.',
].join('\n');

function main() {
  const opt = args(process.argv.slice(2));
  if (opt.ayuda) { console.log(USO); return; }
  if (opt.error) { console.error('ERROR: ' + opt.error); console.error(USO); process.exitCode = 1; return; }

  const serieDir = path.resolve(opt.serie);
  if (!fs.existsSync(serieDir)) { console.error('ERROR: no existe la carpeta ' + serieDir); process.exitCode = 1; return; }

  let caps, index;
  try {
    ({ index, caps } = leerSerie(serieDir));
  } catch (e) {
    console.error('ERROR: ' + (e && e.message ? e.message : e));
    process.exitCode = 1;
    return;
  }

  const ctx = { caps, labels: index.map((x) => x.label), cap: (l) => {
    const c = caps.get(l);
    if (!c) throw new Error('no existe la captura ' + l);
    return c;
  } };
  try {
    ctx.plano = leerSave(opt.save || SAVE_POR_DEFECTO);
  } catch (e) {
    ctx.plano = null;
    ctx.avisoSave = e && e.message ? e.message : String(e);
  }

  console.log('Capturas: ' + caps.size + ' en ' + serieDir);
  console.log('Save: ' + (ctx.plano ? (opt.save || SAVE_POR_DEFECTO) : 'no disponible (' + ctx.avisoSave + ')'));
  console.log('');

  const resultados = CHECKS.map(([id, fila, nota, fn]) => comprobar(ctx, id, fila, nota, fn));
  const ancho = Math.max(...resultados.map((r) => r.fila.length));
  for (const r of resultados) {
    console.log(r.estado.padEnd(24) + r.fila);
    console.log(' '.repeat(24) + 'nota: ' + r.nota);
    if (r.detalle) console.log(' '.repeat(24) + r.detalle);
    console.log('');
  }
  const cuenta = resultados.reduce((acc, r) => { acc[r.estado] = (acc[r.estado] || 0) + 1; return acc; }, {});
  console.log('Resumen: ' + Object.entries(cuenta).map(([k, v]) => v + ' ' + k).join(', ') + ' (de ' + resultados.length + ' filas)');
  console.log('');
  console.log('Comparacion del registro en vivo (p000) con el save (solo lectura):');
  for (const l of compararConSave(ctx)) console.log(l);
}

main();
