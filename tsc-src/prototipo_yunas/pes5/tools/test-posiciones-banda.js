// Prueba del Slice P: posiciones, posicion registrada (O) y Banda/pie de PES5_EDITOR
// (tsc-src/js/pes5-editor.js). Carga el codigo REAL con `vm` (mismo patron que test-jugador-completo.js).
//
// Uso:
//   node test-posiciones-banda.js [<ruta al save real, SOLO LECTURA>]
// El save real NUNCA se escribe: toda escritura va sobre copias en memoria.
const fs = require('fs'), path = require('path'), vm = require('vm');
const { TextDecoder } = require('util');
const { descifrar } = require('./pes5-crypt.js');

const JS_DIR = path.join(__dirname, '..', '..', '..', 'js');
const PES5_JSON_DIR = path.join(JS_DIR, 'pes5');
const SAVE_REAL = process.argv[2] || process.env.PES5_SAVE ||
  'C:/Users/Administrator/Documents/KONAMI/Pro Evolution Soccer 5/save/folder1/KONAMI-WIN32PES5OPT';

function cargarEditor() {
  const src = fs.readFileSync(path.join(JS_DIR, 'pes5-editor.js'), 'utf8');
  const sandbox = { console, TextDecoder, fetch: async (url) => ({ json: async () => JSON.parse(fs.readFileSync(path.join(PES5_JSON_DIR, url.split('/').pop()), 'utf8')) }) };
  vm.createContext(sandbox);
  vm.runInContext(src + '\nthis.__E__ = PES5_EDITOR;', sandbox, { filename: 'pes5-editor.js' });
  return sandbox.__E__;
}

let fallas = 0, aserciones = 0;
function assert(cond, msg) {
  aserciones++;
  if (cond) console.log('OK   — ' + msg);
  else { console.log('FALLO — ' + msg); fallas++; }
}
function lanza(fn) { try { fn(); return null; } catch (e) { return e.message; } }

const BASE = 36872, STRIDE = 124;
const bit = (b, r, x) => (b[BASE + r * STRIDE + (x >> 3)] >> (x & 7)) & 1;
const campo = (b, r, ini, n) => { let v = 0; for (let i = 0; i < n; i++) v |= bit(b, r, ini + i) << i; return v; };
const CODIGOS = { 'Portero': 0, 'Libero': 2, 'Central': 3, 'Carrilero': 4, 'Centrocampista defensivo (MCD)': 5, 'Lateral': 6,
  'Centrocampista central (MC)': 7, 'Volante': 8, 'Mediapunta': 9, 'Extremo': 10, 'Segundo delantero (SD)': 11, 'Delantero centro (DC)': 12 };
const TODAS = Object.keys(CODIGOS);

async function main() {
  const E = cargarEditor();
  await E.cargarMapa('./');
  if (!fs.existsSync(SAVE_REAL)) { console.error('No encuentro el save real en: ' + SAVE_REAL); process.exit(1); }
  console.log('Save real (SOLO LECTURA): ' + SAVE_REAL);
  const plano = descifrar(new Uint8Array(fs.readFileSync(SAVE_REAL)));
  const copiar = () => Uint8Array.from(plano); // copia REAL (Buffer.slice comparte memoria)

  // ---------- 1) invariantes sobre TODO el save ----------
  let revisados = 0, oFuera = 0, sinMarcadas = 0, codigoRaro = 0, bandaTres = 0, registradaNull = 0;
  for (let r = 1; r < 4894; r++) {
    revisados++;
    const marc = E.posicionesMarcadas(plano, r);
    const reg = E.posicionRegistrada(plano, r);
    if (marc.length === 0) sinMarcadas++;
    if (reg === null) registradaNull++;
    else if (!marc.includes(reg)) oFuera++;
    const cod = campo(plano, r, 428, 4);
    if (cod === 1 || cod >= 13) codigoRaro++;
    if (campo(plano, r, 542, 2) === 3) bandaTres++;
  }
  console.log(`(revisados ${revisados} jugadores)`);
  assert(revisados === 4893, 'se revisaron los 4893 jugadores');
  assert(sinMarcadas === 0, `ningun jugador sin posiciones marcadas (${sinMarcadas})`);
  assert(registradaNull === 0, `la O siempre tiene nombre (${registradaNull} sin nombre)`);
  assert(oFuera === 0, `la O siempre esta entre las marcadas (${oFuera} fuera)`);
  assert(codigoRaro === 0, `el codigo de la O nunca es 1 ni >=13 (${codigoRaro})`);
  assert(bandaTres === 0, `la banda nunca vale 3 (${bandaTres})`);

  // ---------- 2) Stranzl (registro 2), verificado en el juego el 20/09 ----------
  const idS = E.buscarJugadorPorNombre(plano, 'Stranzl');
  assert(idS === 2, `Stranzl es el registro 2 (${idS})`);
  const ms = E.posicionesMarcadas(plano, 2);
  assert(ms.length === 4 && ['Central', 'Carrilero', 'Lateral', 'Volante'].every(x => ms.includes(x)), 'Stranzl: marcadas = Central, Carrilero, Lateral, Volante');
  assert(E.posicionRegistrada(plano, 2) === 'Carrilero', 'Stranzl: O en Carrilero');

  // ---------- 3) las 6 combinaciones pie x banda, en copias ----------
  // crudo esperado: mismo lado que el pie = 0, lado contrario = 1, ambas = 2
  const casos = [
    ['der', 'der', 0], ['der', 'izq', 1], ['der', 'ambas', 2],
    ['izq', 'izq', 0], ['izq', 'der', 1], ['izq', 'ambas', 2],
  ];
  for (const [pie, lado, crudo] of casos) {
    const c = copiar();
    E.escribirJugadorCompleto(c, 2, { pieDominante: pie, banda: lado });
    assert(campo(c, 2, 416, 1) === (pie === 'izq' ? 1 : 0), `PI/PD ${pie}+${lado}: pie = ${pie}`);
    assert(campo(c, 2, 542, 2) === crudo, `${pie}+${lado}: banda cruda = ${crudo} (leida ${campo(c, 2, 542, 2)})`);
    assert(E.leerBanda(c, 2) === lado, `${pie}+${lado}: leerBanda = ${lado}`);
    assert(E.leerJugadorCompleto(c, 2).banda === lado, `${pie}+${lado}: leerJugadorCompleto().banda = ${lado}`);
  }
  // cambiar SOLO el pie conserva el lado absoluto
  for (const pie0 of ['der', 'izq']) for (const lado of ['der', 'izq', 'ambas']) {
    const c = copiar();
    E.escribirJugadorCompleto(c, 2, { pieDominante: pie0, banda: lado });
    const otro = pie0 === 'der' ? 'izq' : 'der';
    E.escribirJugadorCompleto(c, 2, { pieDominante: otro });
    assert(E.leerBanda(c, 2) === lado, `cambiar solo el pie ${pie0}->${otro} conserva la banda ${lado} (queda ${E.leerBanda(c, 2)})`);
  }
  // sin cambios no escribe nada
  { const c = copiar(); const antes = E.leerBanda(c, 2);
    const esc = E.escribirJugadorCompleto(c, 2, { banda: antes });
    assert(esc.length === 0 && Buffer.compare(Buffer.from(c), Buffer.from(plano)) === 0, 'banda igual a la actual: no escribe ni cambia bytes'); }
  assert(/banda/.test(lanza(() => E.escribirJugadorCompleto(copiar(), 2, { banda: 'ambos' })) || ''), 'banda invalida lanza error');

  // ---------- 4) posiciones y O, en copias ----------
  // Se usa Vastic (12 marcadas) y Stranzl (4 marcadas). La O actual de Vastic la movio el usuario: no se asierta.
  const idV = E.buscarJugadorPorNombre(plano, 'Vastic');
  assert(E.posicionesMarcadas(plano, idV).length === 12, 'Vastic tiene las 12 posiciones marcadas');

  // mover la O por las 12 posiciones de Vastic: codigo exacto y solo cambian los bits 428-431
  for (const nombre of TODAS) {
    const c = copiar();
    E.escribirJugadorCompleto(c, idV, { posicionRegistrada: nombre });
    assert(E.posicionRegistrada(c, idV) === nombre, `Vastic: O -> ${nombre}`);
    assert(campo(c, idV, 428, 4) === CODIGOS[nombre], `Vastic: O -> ${nombre}, codigo ${CODIGOS[nombre]}`);
    let difMalos = 0;
    for (let x = 0; x < STRIDE * 8; x++) if (bit(c, idV, x) !== bit(plano, idV, x) && !(x >= 428 && x <= 431) && !(x >= 0x32 * 8 && x < 0x33 * 8)) difMalos++;
    assert(difMalos === 0, `Vastic: O -> ${nombre}, no cambia ningun otro bit (salvo el contador)`);
  }

  const idFuera = 2; // Stranzl, marcadas: Central, Carrilero, Lateral, Volante
  // O a una posicion NO marcada: error (regla del juego, confirmada el 20/09)
  assert(!!lanza(() => E.escribirJugadorCompleto(copiar(), idFuera, { posicionRegistrada: 'Portero' })), 'mover la O a una posicion sin estrella lanza error');
  // conjunto vacio, nombre invalido, O fuera del conjunto final
  assert(!!lanza(() => E.escribirJugadorCompleto(copiar(), idFuera, { posiciones: [] })), 'posiciones vacio lanza error');
  assert(!!lanza(() => E.escribirJugadorCompleto(copiar(), idFuera, { posiciones: ['Central', 'Inventada'] })), 'posicion inexistente lanza error');
  assert(!!lanza(() => E.escribirJugadorCompleto(copiar(), idFuera, { posiciones: ['Central', 'Lateral'], posicionRegistrada: 'Volante' })), 'O fuera del conjunto final lanza error');
  // quitar la registrada sin dar nueva O: error
  assert(!!lanza(() => E.escribirJugadorCompleto(copiar(), idFuera, { posiciones: ['Central', 'Lateral', 'Volante'] })), 'quitar la posicion registrada sin nueva O lanza error');
  // quitarla dando nueva O: ok
  { const c = copiar();
    const esc = E.escribirJugadorCompleto(c, idFuera, { posiciones: ['Central', 'Lateral', 'Volante'], posicionRegistrada: 'Lateral' });
    assert(E.posicionesMarcadas(c, idFuera).sort().join() === ['Central', 'Lateral', 'Volante'].sort().join(), 'quitar Carrilero dando nueva O: marcadas correctas');
    assert(E.posicionRegistrada(c, idFuera) === 'Lateral' && campo(c, idFuera, 428, 4) === 6, 'quitar Carrilero dando nueva O: O = Lateral (codigo 6)');
    assert(esc.filter(x => x === 'posiciones').length === 1, `"posiciones" se registra una sola vez (${esc.join(',')})`); }
  // agregar una posicion sin tocar la O
  { const c = copiar();
    E.escribirJugadorCompleto(c, idFuera, { posiciones: ['Central', 'Carrilero', 'Lateral', 'Volante', 'Portero'] });
    assert(E.posicionesMarcadas(c, idFuera).includes('Portero') && E.posicionRegistrada(c, idFuera) === 'Carrilero', 'agregar Portero: queda marcada y la O sigue en Carrilero');
    // ahora la O se puede mover a la recien marcada
    E.escribirJugadorCompleto(c, idFuera, { posicionRegistrada: 'Portero' });
    assert(E.posicionRegistrada(c, idFuera) === 'Portero' && campo(c, idFuera, 428, 4) === 0, 'la O puede ir a una posicion recien marcada (Portero, codigo 0)'); }
  // dejar las 12
  { const c = copiar();
    E.escribirJugadorCompleto(c, idFuera, { posiciones: TODAS });
    assert(E.posicionesMarcadas(c, idFuera).length === 12, 'dejar las 12 posiciones marcadas funciona'); }
  // el bit 427 y todo lo ajeno al registro quedan intactos tras una escritura grande
  { const c = copiar();
    E.escribirJugadorCompleto(c, idFuera, { posiciones: TODAS, posicionRegistrada: 'Portero', pieDominante: 'izq', banda: 'ambas' });
    assert(bit(c, idFuera, 427) === bit(plano, idFuera, 427), 'el bit 427 no cambia');
    let fuera = 0;
    const ini = BASE + idFuera * STRIDE, fin = ini + STRIDE;
    for (let i = 0; i < c.length; i++) if ((i < ini || i >= fin) && c[i] !== plano[i]) fuera++;
    assert(fuera === 0, `ningun byte fuera del registro cambia (${fuera})`);
    // dentro del registro: solo bit 416 (pie), 428-431, 446..541 zona posiciones, 542-543 y el contador
    const permitido = x => x === 416 || (x >= 428 && x <= 431) || x === 542 || x === 543 || (x >= 0x32 * 8 && x < 0x33 * 8) ||
      Object.values(E.leerJugadorCompleto ? {} : {}).length === 0 && false;
    const bitsPos = new Set(TODAS.map(n => 0)); // placeholder para mantener la lista abajo
    const mapa = JSON.parse(fs.readFileSync(path.join(PES5_JSON_DIR, 'pes5-map.json'), 'utf8'));
    const bitsPosiciones = new Set(Object.entries(mapa.posiciones).filter(([k]) => !k.startsWith('_')).map(([, v]) => v.bit));
    let raros = 0;
    for (let x = 0; x < STRIDE * 8; x++) if (bit(c, idFuera, x) !== bit(plano, idFuera, x) && !permitido(x) && !bitsPosiciones.has(x)) raros++;
    assert(raros === 0, `dentro del registro solo cambian pie, O, banda, posiciones y contador (${raros} bits ajenos)`);
  }

  console.log(`\n${aserciones} aserciones. ${fallas === 0 ? 'TODO OK' : fallas + ' FALLO(S)'}`);
  process.exit(fallas === 0 ? 0 : 1);
}
main().catch(e => { console.error('ERROR:', e.stack || e); process.exit(1); });
