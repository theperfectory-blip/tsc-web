// DORSAL: el dorsal viaja con el jugador cuando cambia de casilla (titulares, banca, baja, alta,
// transferencia). Arreglo verificado contra el save real: los dorsales son 32 bytes por club en
// offset 659414 + club*32 + casilla, valor = dorsal - 1 (ver pes5-map.json > equipos.dorsales).
// Buffer sintetico: no necesita el save real.
const fs = require('fs'), path = require('path'), vm = require('vm');

const JS_DIR = path.join(__dirname, '..', 'tsc-src', 'js');
function cargarPES5_EDITOR() {
  const src = fs.readFileSync(path.join(JS_DIR, 'pes5-editor.js'), 'utf8');
  const sandbox = { console, TextDecoder, fetch: async (url) => ({ json: async () => JSON.parse(fs.readFileSync(path.join(JS_DIR, "pes5", url.split("/").pop()), "utf8")) }) };
  vm.createContext(sandbox);
  vm.runInContext(src + '\nthis.__PES5_EDITOR__ = PES5_EDITOR;', sandbox, { filename: 'pes5-editor.js' });
  return sandbox.__PES5_EDITOR__;
}

const ROSTER_BASE = 667458, ROSTER_STRIDE = 64, SLOTS = 32, TOTAL_TEAMS = 138;
const DORSAL_BASE = 659414, DORSAL_STRIDE = 32;
const TAM = ROSTER_BASE + TOTAL_TEAMS * ROSTER_STRIDE + 16;

function bufferVacio() { return new Uint8Array(TAM); }
// ids: array de 32 (0 = vacia). dorsales: array de 32 con el dorsal REAL (1..99) o 0.
function ponerEquipo(bytes, club, ids, dorsales) {
  const off = ROSTER_BASE + club * ROSTER_STRIDE;
  const offD = DORSAL_BASE + club * DORSAL_STRIDE;
  for (let s = 0; s < SLOTS; s++) {
    const v = ids[s] || 0;
    bytes[off + s * 2] = v & 0xFF; bytes[off + s * 2 + 1] = (v >> 8) & 0xFF;
    bytes[offD + s] = dorsales[s] ? (dorsales[s] - 1) & 0xFF : 0;
  }
}
function ids(bytes, club) { return ED.leerPlantillaEquipo(bytes, club); }
function dorsalDe(bytes, club, id) {
  const slots = [];
  for (let s = 0; s < SLOTS; s++) slots.push(bytes[ROSTER_BASE + club * ROSTER_STRIDE + s * 2] | (bytes[ROSTER_BASE + club * ROSTER_STRIDE + s * 2 + 1] << 8));
  const k = slots.indexOf(id);
  return k < 0 ? null : ED.leerDorsalesEquipo(bytes, club)[k];
}
// Dorsales de un equipo como mapa id -> dorsal (solo casillas ocupadas).
function mapaDorsales(bytes, club) {
  const out = {};
  const slots = [];
  for (let s = 0; s < SLOTS; s++) slots.push(bytes[ROSTER_BASE + club * ROSTER_STRIDE + s * 2] | (bytes[ROSTER_BASE + club * ROSTER_STRIDE + s * 2 + 1] << 8));
  const d = ED.leerDorsalesEquipo(bytes, club);
  slots.forEach((id, s) => { if (id) out[id] = d[s]; });
  return out;
}
function igualMapa(a, b) {
  const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k] === b[k]);
}

let fallas = 0;
function assert(cond, msg) {
  if (cond) console.log('OK   — ' + msg);
  else { console.log('FALLO — ' + msg); fallas++; }
}
function lanza(fn) { try { fn(); return null; } catch (e) { return e; } }

const ED = cargarPES5_EDITOR();
(async () => {
await ED.cargarMapa();
const CLUB = 5;
const T = 2910, V = 1557; // ids de ejemplo: el caso de Santiago (Toldo, Vivaldo)

// 1) Caso de Santiago: Toldo (#12) titular en casilla 0; Vivaldo (#1) suplente en casilla 11.
//    Pedido: Vivaldo titular. Cada uno conserva su numero.
{
  const bytes = bufferVacio();
  const ids0 = Array.from({ length: SLOTS }, (_, s) => 0);
  // plantel de 13: 11 titulares (casillas 0..10) + banca 11..12. Toldo en 0 (#12), Vivaldo en 11 (#1)
  const plantel = [T, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, V, 211];
  const numeros = [12, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 13];
  ponerEquipo(bytes, CLUB, plantel.concat(ids0.slice(plantel.length)), numeros.concat(ids0.slice(plantel.length)));
  const antesResto = Array.from(bytes);
  const titulares = [V, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210];
  const n = ED.ordenarTitulares(bytes, CLUB, titulares);
  assert(n === 1, 'Santiago · ordenarTitulares hace 1 intercambio (Vivaldo entra por Toldo)');
  assert(ids(bytes, CLUB)[0] === V, 'Santiago · Vivaldo queda en la casilla 0 (titular)');
  assert(dorsalDe(bytes, CLUB, V) === 1, 'Santiago · Vivaldo conserva el #1 al ser titular');
  assert(dorsalDe(bytes, CLUB, T) === 12, 'Santiago · Toldo conserva el #12 al ir a la banca (no queda con el #1)');
  const m = mapaDorsales(bytes, CLUB);
  assert(m[V] === 1 && m[T] === 12, 'Santiago · mapa id→dorsal: Vivaldo 1, Toldo 12');
  // ningun byte fuera del roster y de los dorsales del club cambia
  let fuera = 0;
  for (let k = 0; k < bytes.length; k++) {
    const enRoster = k >= ROSTER_BASE + CLUB * ROSTER_STRIDE && k < ROSTER_BASE + (CLUB + 1) * ROSTER_STRIDE;
    const enDorsal = k >= DORSAL_BASE + CLUB * DORSAL_STRIDE && k < DORSAL_BASE + (CLUB + 1) * DORSAL_STRIDE;
    if (!enRoster && !enDorsal && bytes[k] !== antesResto[k]) fuera++;
  }
  assert(fuera === 0, 'Santiago · ningun byte fuera del roster y de los dorsales del club cambia');
}

// 2) Swap de banca: el suplente #13 (casilla 11) y el #14 (casilla 12) se intercambian; cada uno
//    lleva su numero.
{
  const bytes = bufferVacio();
  const plantel = Array.from({ length: 13 }, (_, s) => 300 + s);
  const numeros = Array.from({ length: 13 }, (_, s) => s + 1);
  ponerEquipo(bytes, CLUB, plantel, numeros);
  const n = ED.ordenarBancaSwaps(bytes, CLUB, [plantel[11], plantel[12]]);
  assert(n === 1, 'banca · un par de swap');
  assert(dorsalDe(bytes, CLUB, plantel[11]) === 12 && dorsalDe(bytes, CLUB, plantel[12]) === 13,
    'banca · el #12 sigue siendo #12 aunque cambie de casilla con el #13');
  assert(ids(bytes, CLUB)[11] === plantel[12] && ids(bytes, CLUB)[12] === plantel[11], 'banca · las casillas se intercambiaron');
}

// 3) Baja del medio del plantel (32 jugadores): el ultimo ocupa la casilla que queda libre y lleva
//    su dorsal; el que se va devuelve su numero.
{
  const bytes = bufferVacio();
  const plantel = Array.from({ length: SLOTS }, (_, s) => 400 + s);
  const numeros = Array.from({ length: SLOTS }, (_, s) => s + 1);
  ponerEquipo(bytes, CLUB, plantel, numeros);
  const liberado = ED.darDeBajaJugador(bytes, CLUB, plantel[5]); // #6 se va
  assert(liberado === 6, 'baja · devuelve el dorsal del que se va (#6)');
  assert(ids(bytes, CLUB)[5] === plantel[31], 'baja · el ultimo (casilla 31) ocupa la casilla 5');
  assert(dorsalDe(bytes, CLUB, plantel[31]) === 32, 'baja · el ultimo conserva su #32 al moverse');
  assert(ED.leerDorsalesEquipo(bytes, CLUB)[31] === 0, 'baja · la casilla 31 queda vacia sin dorsal');
  assert(ids(bytes, CLUB).length === 31, 'baja · quedan 31 jugadores');
}

// 4) Alta conservando el dorsal si esta libre, y transferencia con choque de dorsal.
{
  const bytes = bufferVacio();
  // origen: el jugador 500 es #9
  ponerEquipo(bytes, 1, [500, 501, 502, 503], [9, 1, 2, 3]);
  // destino: tiene #1..#8 y #10 ocupados; sin el #9 libre
  ponerEquipo(bytes, 2, [600, 601, 602, 603, 604, 605, 606, 607, 608, 609], [1, 2, 3, 4, 5, 6, 7, 8, 10, 11]);
  const nuevo = ED.transferirJugador(bytes, 1, 2, 500);
  assert(nuevo === 9, 'transferencia · el #9 esta libre en el destino: el jugador conserva el #9');
  assert(dorsalDe(bytes, 2, 500) === 9, 'transferencia · en el destino el jugador tiene el #9');
  assert(ids(bytes, 1).indexOf(500) < 0, 'transferencia · el jugador ya no esta en el origen');
}
{
  const bytes = bufferVacio();
  ponerEquipo(bytes, 1, [700, 701], [9, 1]);
  // destino: el #9 lo tiene 800 y el #1 lo tiene 801: el primer libre es el #2
  ponerEquipo(bytes, 2, [800, 801], [9, 1]);
  const nuevo = ED.transferirJugador(bytes, 1, 2, 700);
  assert(nuevo === 2, 'transferencia con choque · el #9 esta ocupado y el #1 tambien: toma el primer libre (#2)');
  assert(dorsalDe(bytes, 2, 700) === 2, 'transferencia con choque · el jugador que llega tiene el #2');
  assert(dorsalDe(bytes, 2, 800) === 9 && dorsalDe(bytes, 2, 801) === 1, 'transferencia con choque · el resto del destino no cambia');
}
{
  // alta sin dorsal previo (fichaje): toma el primer libre
  const bytes = bufferVacio();
  ponerEquipo(bytes, 3, [900, 901], [1, 2]);
  const n = ED.darDeAltaJugador(bytes, 3, 902);
  assert(n === 3, 'alta · fichaje sin dorsal previo toma el primer libre (#3)');
  ED.darDeAltaJugador(bytes, 3, 903, 1);
  assert(dorsalDe(bytes, 3, 903) === 4,
    'alta · con el #1 ocupado y sin dorsal previo libre, toma el #4');
}

// 5) leerPlantillaCompleta trae el dorsal real y la casilla.
{
  const bytes = bufferVacio();
  ponerEquipo(bytes, CLUB, [T, 201, 0, V], [12, 2, 0, 1]);
  const p = ED.leerPlantillaCompleta(bytes, CLUB);
  const porId = Object.fromEntries(p.map(j => [j.id, j]));
  assert(porId[T] && porId[T].dorsal === 12 && porId[T].slot === 0, 'leerPlantillaCompleta · Toldo #12 en casilla 0');
  assert(porId[V] && porId[V].dorsal === 1 && porId[V].slot === 3, 'leerPlantillaCompleta · Vivaldo #1 en casilla 3');
}

// 6) Un swap que lanza no toca nada (atomicidad con dorsales).
{
  const bytes = bufferVacio();
  const plantel = Array.from({ length: 13 }, (_, s) => 300 + s);
  ponerEquipo(bytes, CLUB, plantel, Array.from({ length: 13 }, (_, s) => s + 1));
  const antes = Array.from(bytes);
  const e = lanza(() => ED.aplicarFormacionPedido(bytes, CLUB, [999, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [], [plantel[11], plantel[12]]));
  assert(e !== null && Array.from(bytes).every((v, k) => v === antes[k]), 'atomicidad · un pedido invalido no cambia ni roster ni dorsales');
}

console.log(fallas ? `\n${fallas} FALLO(S)` : '\nTODO OK');
process.exit(fallas ? 1 : 0);
})();
