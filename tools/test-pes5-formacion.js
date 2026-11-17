// FORM-1: cambiar titulares y suplentes en el roster del save (bloque 5).
// Los titulares son los slots 0-10 del roster; el arquero queda en el slot 0. ordenarTitulares
// reordena intercambiando slots, con buffer sintetico (no hace falta el save real).
const fs = require('fs'), path = require('path'), vm = require('vm');

const JS_DIR = path.join(__dirname, '..', 'tsc-src', 'js');

function cargarPES5_EDITOR() {
  const src = fs.readFileSync(path.join(JS_DIR, 'pes5-editor.js'), 'utf8');
  const sandbox = { console, TextDecoder, fetch: async () => ({ json: async () => ({}) }) };
  vm.createContext(sandbox);
  vm.runInContext(src + '\nthis.__PES5_EDITOR__ = PES5_EDITOR;', sandbox, { filename: 'pes5-editor.js' });
  return sandbox.__PES5_EDITOR__;
}

// Mismo layout que pes5-map.json > equipos.roster: offset = 667458 + club*64 + slot*2, uint16LE.
const ROSTER_BASE = 667458, ROSTER_STRIDE = 64, SLOTS = 32, TOTAL_TEAMS = 138;
const CLUB = 7;
function bufferConPlantel(ids) {
  const bytes = new Uint8Array(ROSTER_BASE + TOTAL_TEAMS * ROSTER_STRIDE + 16);
  const off = ROSTER_BASE + CLUB * ROSTER_STRIDE;
  ids.forEach((id, s) => { bytes[off + s * 2] = id & 0xFF; bytes[off + s * 2 + 1] = (id >> 8) & 0xFF; });
  return bytes;
}

let fallas = 0;
function assert(cond, msg) {
  if (cond) console.log('OK   — ' + msg);
  else { console.log('FALLO — ' + msg); fallas++; }
}
const igual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
function lanza(fn) { try { fn(); return null; } catch (e) { return e; } }

const ED = cargarPES5_EDITOR();
// 11 titulares (1..11, el 1 es el arquero) y 3 suplentes (12..14)
const PLANTEL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const TITULARES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

// 1) sin cambios: no escribe nada
{
  const bytes = bufferConPlantel(PLANTEL);
  const antes = Array.from(bytes);
  const n = ED.ordenarTitulares(bytes, CLUB, TITULARES);
  assert(n === 0 && igual(Array.from(bytes), antes), 'con los mismos titulares no cambia nada (0 intercambios)');
}

// 2) suplente a titular: el 12 entra por el 11; el 11 pasa a banca en el lugar del 12
{
  const bytes = bufferConPlantel(PLANTEL);
  const nuevo = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
  const n = ED.ordenarTitulares(bytes, CLUB, nuevo);
  const esperado = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 11, 13, 14];
  assert(n === 1, 'un suplente por un titular: 1 intercambio');
  assert(igual(ED.leerPlantillaEquipo(bytes, CLUB), esperado), 'el suplente queda en el 11 y el titular sale a la banca en el lugar del suplente');
}

// 3) dos titulares se intercambian de lugar (el resto no cambia)
{
  const bytes = bufferConPlantel(PLANTEL);
  const nuevo = TITULARES.slice();
  [nuevo[4], nuevo[6]] = [nuevo[6], nuevo[4]];   // 5 y 7 cambian de lugar
  const n = ED.ordenarTitulares(bytes, CLUB, nuevo);
  const esperado = [1, 2, 3, 4, 7, 6, 5, 8, 9, 10, 11, 12, 13, 14];
  assert(n === 1, 'intercambio de dos titulares: 1 intercambio');
  assert(igual(ED.leerPlantillaEquipo(bytes, CLUB), esperado), 'los dos titulares cambian de slot y el resto del 11 queda igual');
}

// 4) dos suplentes entran a la vez
{
  const bytes = bufferConPlantel(PLANTEL);
  const nuevo = [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 13];
  const n = ED.ordenarTitulares(bytes, CLUB, nuevo);
  const esperado = [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 13, 10, 11, 14];
  assert(n === 2, 'dos suplentes entran: 2 intercambios');
  assert(igual(ED.leerPlantillaEquipo(bytes, CLUB), esperado), 'con dos suplentes, los salientes van a la banca sin perder a nadie');
}

// 5) el plantel no pierde ni duplica jugadores
{
  const bytes = bufferConPlantel(PLANTEL);
  ED.ordenarTitulares(bytes, CLUB, [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 13]);
  const tras = ED.leerPlantillaEquipo(bytes, CLUB);
  assert(tras.length === PLANTEL.length && PLANTEL.every(id => tras.includes(id)), 'tras reordenar siguen los mismos jugadores, una sola vez');
}

// 6) el arquero (slot 0) cambia por otro arquero: el orden lo reordena (la Tool valida que quien entra sea portero)
{
  const bytes = bufferConPlantel(PLANTEL);
  const n = ED.ordenarTitulares(bytes, CLUB, [12, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const r = ED.leerPlantillaEquipo(bytes, CLUB);
  assert(r[0] === 12 && r.length === PLANTEL.length, 'el arquero puede cambiar por un suplente: el 12 queda en el slot 0');
  assert(n === 1, 'el cambio de arquero cuenta como un intercambio');
}

// 7) entradas invalidas: se rechazan sin tocar el buffer
{
  const bytes = bufferConPlantel(PLANTEL);
  const antes = Array.from(bytes);
  const casos = [
    ['menos de 11', [1, 2, 3]],
    ['repetidos', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10]],
    ['fuera del plantel', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 99]],
  ];
  for (const [nombre, lista] of casos) {
    const e = lanza(() => ED.ordenarTitulares(bytes, CLUB, lista));
    assert(e && typeof e.message === 'string', `${nombre} se rechaza`);
  }
  assert(igual(Array.from(bytes), antes), 'ninguna entrada invalida toca el buffer');
}

// 8) atomico: si escribirFormacion falla despues de reordenar, el roster queda INTACTO.
// El buffer no tiene registro de formacion, asi que escribirFormacionEquipo lanza tras ordenarTitulares
// (que si reordenaria: el suplente 12 entra por el 11). La tanda comparte un solo buffer, asi que
// un reorden a medias no puede salir al save.
{
  const bytes = bufferConPlantel(PLANTEL);
  const antes = Array.from(bytes);
  const entra = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12];          // cambia de verdad el roster
  const slotsForm = entra.map((jugador, slot) => ({ slot, jugador, prof: 10, lat: 20, pos: 0, posNombre: 'CT' }));
  const e = lanza(() => ED.aplicarFormacionPedido(bytes, CLUB, entra, slotsForm));
  assert(e && /registro de formacion/.test(e.message), 'sin registro de formacion, aplicarFormacionPedido lanza');
  assert(igual(Array.from(bytes), antes), 'tras el fallo el buffer queda byte a byte igual (el reorden no sale)');
  assert(igual(ED.leerPlantillaEquipo(bytes, CLUB), PLANTEL), 'tras el fallo el roster sigue en su orden original');
}

// 9) FORM-4: que cambio en quien juega entre dos 11 (texto de los pedidos)
{
  const P = require('../tsc-src/js/pes5-plantilla.js');
  const nom = id => ({ 1: 'Boot', 12: 'Starke', 5: 'Juan', 9: '$Yunifantino' })[id] || ('J' + id);
  const base = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  assert(iguales(P.cambiosDeAlineacion(base, [12, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], nom), ['Entra Starke por Boot']),
    'FORM-4 · arquero suplente por el titular: "Entra Starke por Boot"');
  assert(iguales(P.cambiosDeAlineacion(base, [1, 2, 3, 4, 9, 6, 7, 8, 5, 10, 11], nom), ['Juan ↔ $Yunifantino']),
    'FORM-4 · intercambio entre titulares: "Juan ↔ $Yunifantino"');
  assert(iguales(P.cambiosDeAlineacion(base, [12, 2, 3, 4, 9, 6, 7, 8, 5, 10, 11], nom), ['Entra Starke por Boot', 'Juan ↔ $Yunifantino']),
    'FORM-4 · arquero y un intercambio a la vez: dos textos');
  assert(P.cambiosDeAlineacion(base, base, nom).length === 0, 'FORM-4 · mismo 11: sin cambios de alineacion');
}

// 10) FIX-CANCEL: el pedido de formacion pendiente que manda (cancelado o aplicado no cuenta)
{
  const P = require('../tsc-src/js/pes5-plantilla.js');
  const slots = [{ slot: 0, jugador: 101 }];
  const pedidos = [
    { _id: 'a', tipo: 'formacion', estado: 'pendiente', formacion: { slots }, creadoEn: '2026-11-16T10:00:00Z' },
    { _id: 'b', tipo: 'formacion', estado: 'cancelado', formacion: { slots }, creadoEn: '2026-11-16T12:00:00Z' },
    { _id: 'c', tipo: 'formacion', estado: 'aplicado', formacion: { slots }, creadoEn: '2026-11-16T13:00:00Z' },
    { _id: 'd', tipo: 'mejora', estado: 'pendiente', creadoEn: '2026-11-16T14:00:00Z' },
  ];
  const r = P.formacionPendienteMasReciente(pedidos);
  assert(r && r._id === 'a', 'FIX-CANCEL · solo manda el pendiente: el cancelado, el aplicado y la mejora no cuentan');
  assert(P.formacionPendienteMasReciente([pedidos[1], pedidos[2], pedidos[3]]) === null,
    'FIX-CANCEL · sin pendientes de formacion: null (vuelve la publicada)');
  const dos = [pedidos[0], { _id: 'e', tipo: 'formacion', estado: 'pendiente', formacion: { slots }, creadoEn: '2026-11-16T11:00:00Z' }];
  assert(P.formacionPendienteMasReciente(dos)._id === 'e', 'FIX-CANCEL · con dos pendientes manda el mas reciente');
  const local = [pedidos[0], { _id: 'local-1', tipo: 'formacion', estado: 'pendiente', formacion: { slots } }];
  assert(P.formacionPendienteMasReciente(local)._id === 'local-1', 'FIX-CANCEL · el pedido local (sin fecha) es el mas nuevo');
  assert(P.formacionPendienteMasReciente([{ _id: 'f', tipo: 'formacion', estado: 'pendiente' }]) === null,
    'FIX-CANCEL · un pedido sin slots no cuenta');
}

// 11) ORD-2: lee el roster antes y despues. Solo cambian los slots del intercambio, y la banca que muestra
// Mejoras (rosterTrasTitulares) coincide con el roster real que deja ordenarTitulares.
{
  const P = require('../tsc-src/js/pes5-plantilla.js');
  const casos = [
    ['un suplente (12) por el titular del slot 10 (11)', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12], [11]],
    ['dos suplentes (13, 14) por los slots 8 y 9', [1, 2, 3, 4, 5, 6, 7, 8, 13, 14, 11], [9, 10]],
    ['intercambio de titulares 5 y 7 (slots 4 y 6)', [1, 2, 3, 4, 7, 6, 5, 8, 9, 10, 11], [5, 7]],
    ['arquero suplente (12) por el 1', [12, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], [1, 12]],
  ];
  for (const [titulo, nuevo, _sueltos] of casos) {
    const bytes = bufferConPlantel(PLANTEL);
    const antes = ED.leerPlantillaEquipo(bytes, CLUB).slice();
    ED.ordenarTitulares(bytes, CLUB, nuevo);
    const tras = ED.leerPlantillaEquipo(bytes, CLUB);
    const cambian = tras.map((id, s) => (id !== antes[s] ? s : -1)).filter(s => s >= 0);
    const esperado = P.rosterTrasTitulares(antes, nuevo);
    assert(igual(tras, esperado), `ORD-2 · ${titulo}: la banca de Mejoras coincide con el roster del save`);
    assert(tras.length === antes.length && antes.every(id => tras.includes(id)), `ORD-2 · ${titulo}: el plantel conserva a todos, una vez`);
    assert(cambian.every(s => s <= 10 || nuevo.includes(antes[s])) && cambian.length <= 2 * (nuevo.filter((id, s) => id !== antes[s]).length),
      `ORD-2 · ${titulo}: cambian ${cambian.length} slots (${cambian.join(',')}), ninguno fuera del intercambio`);
  }
  // caso exacto de Jimbo: el 11 (titular del slot 10) sale y el suplente 12 entra; el 11 cae en el slot 11, el lugar del 12
  {
    const bytes = bufferConPlantel(PLANTEL);
    ED.ordenarTitulares(bytes, CLUB, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12]);
    const tras = ED.leerPlantillaEquipo(bytes, CLUB);
    assert(igual(tras, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 11, 13, 14]),
      'ORD-2 · el titular que sale (11) cae exacto en el slot del suplente (12); la banca 13, 14 no se mueve');
  }
  // dos suplentes: cada saliente toma el slot del entrante, sin reordenar la banca restante
  {
    const bytes = bufferConPlantel(PLANTEL);
    ED.ordenarTitulares(bytes, CLUB, [1, 2, 3, 4, 5, 6, 7, 8, 13, 14, 11]);
    const tras = ED.leerPlantillaEquipo(bytes, CLUB);
    assert(igual(tras.slice(11), [12, 9, 10]), 'ORD-2 · dos suplentes: el 9 y el 10 caen en los slots 12 y 13 de los que salen el 13 y el 14; el 12 no se mueve');
  }
}

console.log(fallas ?`\n${fallas} FALLO(S)` : '\nTODO OK');
process.exit(fallas ? 1 : 0);
