// Prueba de Slice D1: pes5-plantilla.js
// Modulo compartido que lee jugadores del save y los convierte al formato
// que espera el editor del presidente (mejoras.html).
const fs = require('fs'), path = require('path'), vm = require('vm');
const { TextDecoder } = require('util');
const { descifrar } = require('./pes5-crypt.js');

const JS_DIR = path.join(__dirname, '..', '..', '..', 'js');
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

const SAVE_REAL = process.env.PES5_SAVE ||
  'C:/Users/Administrator/Documents/KONAMI/Pro Evolution Soccer 5/save/folder1/KONAMI-WIN32PES5OPT';

const P = require('../../../js/pes5-plantilla.js');

let fallas = 0;
function assert(cond, msg) {
  if (cond) { console.log('OK   — ' + msg); }
  else { console.log('FALLO — ' + msg); fallas++; }
}

async function main() {
  const PES5_EDITOR = cargarPES5_EDITOR();
  await PES5_EDITOR.cargarMapa('./');
  await PES5_EDITOR.cargarNombresEquipos('./');

  if (!fs.existsSync(SAVE_REAL)) {
    console.error('No encuentro el save real en: ' + SAVE_REAL);
    process.exit(1);
  }
  console.log('Save real (SOLO LECTURA): ' + SAVE_REAL);
  const bytes = descifrar(fs.readFileSync(SAVE_REAL));

  // ---------- 1) buscar Bolton y leer plantilla ----------
  const iBolton = PES5_EDITOR.buscarEquipoPorNombre(bytes, 'Bolton Wanderers');
  assert(iBolton >= 0, `Bolton Wanderers encontrado (indice ${iBolton})`);

  if (iBolton >= 0) {
    const pl = P.plantillaParaEditor(PES5_EDITOR, bytes, iBolton);
    assert(pl.length === 17, `plantilla de Bolton tiene 17 jugadores (obtenido: ${pl.length})`);

    // ---------- 2) validar estructura de cada jugador ----------
    let estructuraOk = true;
    pl.forEach((j, i) => {
      if (!j.id || !j.id.startsWith('r') || j.stats === undefined || j.height === undefined || j.subscriber === undefined) {
        console.log(`  jugador ${i}: estructura invalida`);
        estructuraOk = false;
      }
    });
    assert(estructuraOk, 'cada jugador tiene id (r...), stats, height, subscriber');

    // ---------- 3) validar ranges ----------
    let statsOk = true, heightOk = true;
    pl.forEach((j, i) => {
      if (j.stats.atk < 0 || j.stats.atk > 99) { console.log(`  jugador ${i}: stats.atk=${j.stats.atk} fuera de 0-99`); statsOk = false; }
      if (j.height < 148 || j.height > 205) { console.log(`  jugador ${i}: height=${j.height} fuera de 148-205`); heightOk = false; }
    });
    assert(statsOk, 'todos los stats.atk estan en 0-99');
    assert(heightOk, 'todas las alturas estan en 148-205');
  }

  // ---------- 4) registroDeId ----------
  assert(P.registroDeId('r999') === 999, `registroDeId('r999') === 999`);
  assert(P.registroDeId('x1') === null, `registroDeId('x1') === null`);

  // ---------- 5) cambiosDesdeEditor — un jugador de Bolton ----------
  if (iBolton >= 0) {
    const pl = P.plantillaParaEditor(PES5_EDITOR, bytes, iBolton);
    if (pl.length > 0) {
      const o = pl[0];
      const d = JSON.parse(JSON.stringify(o));
      d.stats.atk = Math.min(99, o.stats.atk + 1);
      d.sec.cons = o.sec.cons === 8 ? 7 : o.sec.cons + 1;
      d.abilities.dribbling = !o.abilities.dribbling;
      d.height = o.height === 205 ? 204 : o.height + 1;

      const c = P.cambiosDesdeEditor(o, d);
      assert(c.atributos && c.atributos['Ataque'] === d.stats.atk, `cambios.atributos['Ataque'] === ${d.stats.atk}`);
      assert(c.escala8 && c.escala8['Regularidad en el juego'] === d.sec.cons, `cambios.escala8['Regularidad en el juego'] === ${d.sec.cons}`);
      assert(c.habilidades && c.habilidades['Regate'] === d.abilities.dribbling, `cambios.habilidades['Regate'] === ${d.abilities.dribbling}`);
      assert(c.altura === d.height, `cambios.altura === ${d.height}`);
      assert(Object.keys(c.atributos).length === 1, `solo 1 atributo en cambios (obtenido: ${Object.keys(c.atributos).length})`);
    }
  }

  // ---------- 6) cambiosDesdeEditor — objeto igual a si mismo no produce cambios ----------
  if (iBolton >= 0) {
    const pl = P.plantillaParaEditor(PES5_EDITOR, bytes, iBolton);
    if (pl.length > 0) {
      const o = pl[0];
      const c = P.cambiosDesdeEditor(o, JSON.parse(JSON.stringify(o)));
      assert(JSON.stringify(c) === '{}', `cambiosDesdeEditor(o, copia(o)) === {}`);
    }
  }

  // ---------- 7) round-trip con escribirJugadorCompleto ----------
  if (iBolton >= 0) {
    const pl = P.plantillaParaEditor(PES5_EDITOR, bytes, iBolton);
    if (pl.length > 0) {
      const o = pl[0];
      const d = JSON.parse(JSON.stringify(o));
      d.stats.atk = Math.min(99, o.stats.atk + 1);

      const copia = Uint8Array.from(bytes);
      const c = P.cambiosDesdeEditor(o, d);
      const idReg = P.registroDeId(o.id);

      PES5_EDITOR.escribirJugadorCompleto(copia, idReg, c);
      const leidoDespues = PES5_EDITOR.leerJugadorCompleto(copia, idReg);
      assert(leidoDespues.atributos['Ataque'] === d.stats.atk, `round-trip: atributos['Ataque'] actualizado a ${d.stats.atk}`);
    }
  }

  console.log(`\n${fallas === 0 ? 'TODO OK' : fallas + ' FALLO(S)'}`);
  process.exit(fallas === 0 ? 0 : 1);
}

main().catch(e => { console.error('ERROR:', e.stack || e); process.exit(1); });
