// ORD-1: el orden del plantel que muestra la Tool sale del save (bloque 5 de PES5).
// Este test fija el contrato del lector con un buffer sintetico: si el juego cambia el orden
// (titulares y suplentes = slots), el lector tiene que devolver el orden NUEVO, no uno guardado.
// No necesita el save real ni carpetas del navegador.
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
function bufferConPlantel(club, ids) {
  const bytes = new Uint8Array(ROSTER_BASE + TOTAL_TEAMS * ROSTER_STRIDE + 16);
  const off = ROSTER_BASE + club * ROSTER_STRIDE;
  ids.forEach((id, s) => { bytes[off + s * 2] = id & 0xFF; bytes[off + s * 2 + 1] = (id >> 8) & 0xFF; });
  return bytes;
}
function escribirPlantel(bytes, club, ids) {
  const off = ROSTER_BASE + club * ROSTER_STRIDE;
  for (let s = 0; s < SLOTS; s++) {
    const v = ids[s] || 0;
    bytes[off + s * 2] = v & 0xFF; bytes[off + s * 2 + 1] = (v >> 8) & 0xFF;
  }
}

let fallas = 0;
function assert(cond, msg) {
  if (cond) console.log('OK   — ' + msg);
  else { console.log('FALLO — ' + msg); fallas++; }
}
const igual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

const ED = cargarPES5_EDITOR();
const CLUB = 7;
const ORIGINAL = [1473, 1474, 1475, 1476, 143, 1477, 1007, 629, 619, 1485, 195, 1478, 1479, 646];

// 1) el lector devuelve el orden de los slots, en orden
{
  const bytes = bufferConPlantel(CLUB, ORIGINAL);
  assert(igual(ED.leerPlantillaEquipo(bytes, CLUB), ORIGINAL), 'el lector devuelve el orden inicial del roster');
}

// 2) tras un cambio de orden hecho en el juego (titular 2 pasa al lugar del 11), el lector ve el orden NUEVO
{
  const bytes = bufferConPlantel(CLUB, ORIGINAL);
  const nuevo = ORIGINAL.slice();
  [nuevo[1], nuevo[10]] = [nuevo[10], nuevo[1]];
  escribirPlantel(bytes, CLUB, nuevo);
  assert(igual(ED.leerPlantillaEquipo(bytes, CLUB), nuevo), 'tras reordenar en el save, el lector devuelve el orden nuevo');
  assert(!igual(ED.leerPlantillaEquipo(bytes, CLUB), ORIGINAL), 'el orden nuevo no es el viejo');
}

// 3) el orden es de ese club: cambiar otro club no altera este
{
  const bytes = bufferConPlantel(CLUB, ORIGINAL);
  escribirPlantel(bytes, CLUB + 1, [5, 4, 3, 2, 1]);
  assert(igual(ED.leerPlantillaEquipo(bytes, CLUB), ORIGINAL), 'cambiar el roster de otro club no altera el orden de este');
}

// 4) la lectura no muta el buffer
{
  const bytes = bufferConPlantel(CLUB, ORIGINAL);
  const copia = Uint8Array.from(bytes);
  ED.leerPlantillaEquipo(bytes, CLUB);
  assert(igual(Array.from(bytes), Array.from(copia)), 'leerPlantillaEquipo no modifica el buffer');
}

console.log(fallas ? `\n${fallas} FALLO(S)` : '\nTODO OK');
process.exit(fallas ? 1 : 0);
