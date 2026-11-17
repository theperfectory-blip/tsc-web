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

console.log(fallas ? `\n${fallas} FALLO(S)` : '\nTODO OK');
process.exit(fallas ? 1 : 0);
