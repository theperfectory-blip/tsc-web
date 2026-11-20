// FORMFIX: busqueda del registro de formacion (bloque 5) de PES5.
// El juego reordena los 32 bytes que siguen al codigo del club (son una
// permutacion de 0..31, no siempre 0,1,2,...). La busqueda tiene que aceptar
// cualquier permutacion, pero rechazar repeticiones o valores >= 32.
//
// Uso:
//   node tools/test-formacion-permutada.js [path-al-save-real, solo lectura]
// Si el save real no existe, los casos que lo usan se saltan con un aviso.
const fs = require('fs'), path = require('path'), vm = require('vm');
const { TextDecoder } = require('util');
const { descifrar } = require('./pes5/pes5-crypt.js');

const JS_DIR = path.join(__dirname, '..', 'tsc-src', 'js');
const PES5_JSON_DIR = path.join(JS_DIR, 'pes5');

function cargarPES5_EDITOR() {
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

const SAVE_REAL = process.argv[2] || process.env.PES5_SAVE ||
  'C:/Users/Administrator/Documents/KONAMI/Pro Evolution Soccer 5/save/folder1/KONAMI-WIN32PES5OPT';

// Mismo layout que pes5-editor.js.
const TEAM_BASE = 803608, TEAM_STRIDE = 140;
const FORM_REGISTRO_BASE = 716932, FORM_REGISTRO_STRIDE = 628;
const FORM_OFF_REGISTRO = 100, FORM_REL_DEPTH = 12, FORM_REL_LATERAL = 23, FORM_REL_POS = 33;
const CLUB = 7;
const TAM = TEAM_BASE + 138 * TEAM_STRIDE + 64;

let fallas = 0;
function assert(cond, msg) {
  if (cond) console.log('OK   — ' + msg);
  else { console.log('FALLO — ' + msg); fallas++; }
}

function crearBuffer() {
  const bytes = new Uint8Array(TAM);
  // codigo corto del club en el bloque 6 (+0x49), como lo lee codigoCortoEquipo
  const off = TEAM_BASE + CLUB * TEAM_STRIDE + 0x49;
  bytes[off] = 84; bytes[off + 1] = 83; bytes[off + 2] = 84; bytes[off + 3] = 0; // TST
  return bytes;
}
function ponerRegistro(bytes, off, codigo, secuencia) {
  for (let i = 0; i < codigo.length; i++) bytes[off + i] = codigo.charCodeAt(i);
  for (let i = codigo.length; i < 4; i++) bytes[off + i] = 0;
  for (let i = 0; i < 32; i++) bytes[off + 4 + i] = secuencia[i];
  // formacion 4-4-2 de referencia (profundidad; lateral no hace falta para la busqueda)
  const profs = [1, 8, 8, 8, 8, 20, 20, 20, 20, 40, 40];
  for (let s = 0; s < 11; s++) {
    bytes[off + FORM_OFF_REGISTRO + FORM_REL_DEPTH + s] = profs[s];
    if (s > 0) bytes[off + FORM_OFF_REGISTRO + FORM_REL_LATERAL + (s - 1)] = 40;
    bytes[off + FORM_OFF_REGISTRO + FORM_REL_POS + s] = s === 0 ? 0 : 7;
  }
}
const IDENTIDAD = Array.from({ length: 32 }, (_, i) => i);
// permutacion real del save actual de RETRO RACING (offset 789780)
const PERMUTADA = [0, 1, 2, 23, 4, 5, 6, 8, 9, 10, 22, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 3, 7, 24, 25, 26, 27, 28, 29, 30, 31];
const PROPIO = FORM_REGISTRO_BASE + CLUB * FORM_REGISTRO_STRIDE;

const ED = cargarPES5_EDITOR();

// 1) secuencia identidad: se encuentra en la posicion propia del club
{
  const bytes = crearBuffer();
  ponerRegistro(bytes, PROPIO, 'TST', IDENTIDAD);
  const f = ED.leerFormacionEquipo(bytes, CLUB);
  assert(!!f && f.offset === PROPIO, `identidad: encuentra el registro propio (offset ${f && f.offset}, esperado ${PROPIO})`);
  assert(!!f && f.nombre === '4-4-2', `identidad: lee la formacion 4-4-2 (obtenido: ${f && f.nombre})`);
}

// 2) secuencia permutada (la del save de RETRO RACING): tambien se encuentra
{
  const bytes = crearBuffer();
  ponerRegistro(bytes, PROPIO, 'TST', PERMUTADA);
  const f = ED.leerFormacionEquipo(bytes, CLUB);
  assert(!!f && f.offset === PROPIO, `permutada: encuentra el registro propio (offset ${f && f.offset}, esperado ${PROPIO})`);
  assert(!!f && f.nombre === '4-4-2', `permutada: lee la formacion 4-4-2 (obtenido: ${f && f.nombre})`);
}

// 3) byte repetido: no se encuentra
{
  const bytes = crearBuffer();
  const mala = IDENTIDAD.slice();
  mala[7] = mala[6];
  ponerRegistro(bytes, PROPIO, 'TST', mala);
  const f = ED.leerFormacionEquipo(bytes, CLUB);
  assert(!f, 'byte repetido: no se encuentra (null)');
}

// 4) byte >= 32: no se encuentra
{
  const bytes = crearBuffer();
  const mala = IDENTIDAD.slice();
  mala[31] = 32;
  ponerRegistro(bytes, PROPIO, 'TST', mala);
  const f = ED.leerFormacionEquipo(bytes, CLUB);
  assert(!f, 'byte 32: no se encuentra (null)');
}

// 5) registro fuera de la posicion propia (respaldo por codigo): se encuentra igual
{
  const bytes = crearBuffer();
  const fuera = 660000; // dentro de FORM_BUSCAR_DESDE..HASTA, lejos del club
  ponerRegistro(bytes, fuera, 'TST', PERMUTADA);
  const f = ED.leerFormacionEquipo(bytes, CLUB);
  assert(!!f && f.offset === fuera, `respaldo por codigo: encuentra el registro en ${fuera} (obtenido: ${f && f.offset})`);
  // y si la secuencia no es una permutacion, tampoco lo acepta el respaldo
  const bytes2 = crearBuffer();
  const mala = PERMUTADA.slice();
  mala[0] = 31;
  ponerRegistro(bytes2, fuera, 'TST', mala);
  assert(!ED.leerFormacionEquipo(bytes2, CLUB), 'respaldo por codigo: rechaza una secuencia con repetidos');
}

// 6) escribir no toca la permutacion (solo la formacion, +100 en adelante)
{
  const bytes = crearBuffer();
  ponerRegistro(bytes, PROPIO, 'TST', PERMUTADA);
  const permAntes = Array.from(bytes.slice(PROPIO + 4, PROPIO + 36));
  const rec = ED.escribirFormacionEquipo(bytes, CLUB, [
    { slot: 1, prof: 10, lat: 50, posNombre: 'CT' },
    { slot: 5, prof: 25, lat: 30, posNombre: 'CC' },
  ]);
  const permDespues = Array.from(bytes.slice(PROPIO + 4, PROPIO + 36));
  assert(rec === PROPIO, `escribir: devuelve el offset propio (${rec})`);
  assert(permDespues.every((v, i) => v === permAntes[i]), 'escribir: la permutacion de 32 bytes queda intacta');
  assert(bytes[PROPIO + FORM_OFF_REGISTRO + FORM_REL_DEPTH + 1] === 10
    && bytes[PROPIO + FORM_OFF_REGISTRO + FORM_REL_DEPTH + 5] === 25,
    'escribir: la profundidad de los slots pedidos si cambia');
}

// 7) save real (solo lectura): RETRO RACING (116) -> 3-4-3
if (!fs.existsSync(SAVE_REAL)) {
  console.log('AVISO — no existe el save real (' + SAVE_REAL + '): se saltan los casos con el save');
} else {
  console.log('Save real (SOLO LECTURA): ' + SAVE_REAL);
  const plano = descifrar(fs.readFileSync(SAVE_REAL));
  const retro = ED.leerFormacionEquipo(plano, 116);
  assert(!!retro, 'save real: RETRO RACING (116) tiene registro de formacion');
  assert(!!retro && retro.offset === 789780, `save real: RETRO RACING en el offset 789780 (obtenido: ${retro && retro.offset})`);
  assert(!!retro && retro.nombre === '3-4-3', `save real: RETRO RACING -> 3-4-3 (obtenido: ${retro && retro.nombre})`);
  const emelec = ED.leerFormacionEquipo(plano, 117);
  assert(!!emelec, 'save real: CS EMELEC (117) se encuentra');
  const sarnosas = ED.leerFormacionEquipo(plano, 22);
  assert(!!sarnosas, 'save real: SARNOSAS FC (22) se encuentra');
  const hechiceros = ED.leerFormacionEquipo(plano, 29);
  assert(!!hechiceros, 'save real: HECHICEROS FC (29) se encuentra');
  // ningun club sin registro y ningun offset compartido entre dos clubes
  const sinFormacion = [], porOffset = new Map(), compartidos = [];
  for (let c = 0; c < 138; c++) {
    const f = ED.leerFormacionEquipo(plano, c);
    if (!f) { sinFormacion.push(c); continue; }
    if (porOffset.has(f.offset)) compartidos.push(`${porOffset.get(f.offset)}+${c}@${f.offset}`);
    else porOffset.set(f.offset, c);
  }
  assert(sinFormacion.length === 0, `save real: los 138 clubes tienen registro (sin formacion: ${sinFormacion.join(',') || 'ninguno'})`);
  assert(compartidos.length === 0, `save real: ningun offset lo comparten dos clubes (compartidos: ${compartidos.join(',') || 'ninguno'})`);
}

console.log(`\n${fallas === 0 ? 'TODO OK' : fallas + ' FALLO(S)'}`);
process.exit(fallas === 0 ? 0 : 1);
