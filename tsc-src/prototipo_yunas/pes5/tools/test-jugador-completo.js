// Prueba de Slice B: leerJugadorCompleto / escribirJugadorCompleto /
// leerPlantillaCompleta / equiposDelJugador de PES5_EDITOR (tsc-src/js/pes5-editor.js).
//
// pes5-editor.js es un modulo de navegador (usa `fetch` para cargar los
// JSON, sin module.exports) — para poder probar el codigo REAL (no una
// reimplementacion paralela en Node) se carga y ejecuta con `vm` en un
// sandbox chico que sustituye `fetch` por lectura de disco.
//
// Uso:
//   node test-jugador-completo.js <path-al-save-real, solo lectura>
//   (por defecto usa el save real del juego, en modo SOLO LECTURA — este
//   test nunca escribe sobre ese archivo; el round-trip de escritura usa
//   un buffer en memoria aparte)
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
      // url = baseUrl + 'pes5-map.json' (o -teams.json) — solo usamos el nombre de archivo
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

let fallas = 0;
function assert(cond, msg) {
  if (cond) { console.log('OK   — ' + msg); }
  else { console.log('FALLO — ' + msg); fallas++; }
}

async function main() {
  const PES5_EDITOR = cargarPES5_EDITOR();
  await PES5_EDITOR.cargarMapa('./'); // el sandbox ignora baseUrl, solo usa el basename
  await PES5_EDITOR.cargarNombresEquipos('./');

  if (!fs.existsSync(SAVE_REAL)) {
    console.error('No encuentro el save real en: ' + SAVE_REAL);
    process.exit(1);
  }
  console.log('Save real (SOLO LECTURA): ' + SAVE_REAL);
  const plano = descifrar(fs.readFileSync(SAVE_REAL));

  // ---------- 1) valores conocidos sobre el save real ----------
  const idRonaldinho = PES5_EDITOR.buscarJugadorPorNombre(plano, 'Ronaldinho');
  assert(idRonaldinho === 999, `Ronaldinho esta en el registro 999 (obtenido: ${idRonaldinho})`);
  const jugRonaldinho = PES5_EDITOR.leerJugadorCompleto(plano, 999);
  assert(jugRonaldinho.nombre === 'Ronaldinho', `leerJugadorCompleto(999).nombre === "Ronaldinho" (obtenido: "${jugRonaldinho.nombre}")`);

  const alturasEsperadas = { Puskas: 172, Romario: 169, Berbatov: 188 };
  for (const [nombre, esperada] of Object.entries(alturasEsperadas)) {
    const id = PES5_EDITOR.buscarJugadorPorNombre(plano, nombre);
    assert(id >= 0, `${nombre} encontrado en el save (id ${id})`);
    if (id >= 0) {
      const j = PES5_EDITOR.leerJugadorCompleto(plano, id);
      assert(j.altura === esperada, `${nombre} (id ${id}): altura leida ${j.altura} === esperada ${esperada}`);
    }
  }

  // ---------- 2) distribucion de alturas de los 4894 jugadores con nombre ----------
  let conNombre = 0, minAltura = Infinity, maxAltura = -Infinity, fueraDeRango = 0;
  for (let id = 0; id < 5000; id++) {
    const nombre = PES5_EDITOR.nombreDeRegistro(plano, id);
    if (!nombre) continue;
    conNombre++;
    const j = PES5_EDITOR.leerJugadorCompleto(plano, id);
    if (j.altura < minAltura) minAltura = j.altura;
    if (j.altura > maxAltura) maxAltura = j.altura;
    if (j.altura < 148 || j.altura > 211) fueraDeRango++;
  }
  console.log(`jugadores con nombre: ${conNombre} (esperado ~4894)`);
  console.log(`altura min=${minAltura} max=${maxAltura} fuera_de_rango(148-211)=${fueraDeRango}`);
  assert(conNombre === 4894, `4894 jugadores con nombre (obtenido: ${conNombre})`);
  assert(minAltura >= 148, `altura minima >= 148 (obtenido: ${minAltura})`);
  assert(maxAltura <= 211, `altura maxima <= 211 (obtenido: ${maxAltura})`);
  assert(fueraDeRango === 0, `0 jugadores con altura fuera de 148-211 (obtenido: ${fueraDeRango})`);

  // ---------- 3) round-trip: escribirJugadorCompleto con los mismos valores
  // que devolvio leer deja los bytes identicos salvo +0x32 (contador) ----------
  // Se hace SOLO en memoria, sobre una copia del buffer ya descifrado — no
  // se escribe a ningun archivo del disco en este paso.
  const idPrueba = PES5_EDITOR.buscarJugadorPorNombre(plano, 'Simunic');
  assert(idPrueba >= 0, `jugador de prueba "Simunic" encontrado (id ${idPrueba})`);
  if (idPrueba >= 0) {
    const antes = plano.slice(0, plano.length); // copia completa para comparar
    const copia = Uint8Array.from(plano); // copia de trabajo, no tocamos `plano`
    const leidoAntes = PES5_EDITOR.leerJugadorCompleto(copia, idPrueba);
    const cambios = {
      atributos: leidoAntes.atributos,
      escala8: leidoAntes.escala8,
      habilidades: leidoAntes.habilidades,
      edad: leidoAntes.edad,
      altura: leidoAntes.altura,
      pieDominante: leidoAntes.pieDominante,
      lesiones: leidoAntes.lesiones,
    };
    const escritos = PES5_EDITOR.escribirJugadorCompleto(copia, idPrueba, cambios);
    console.log(`escribirJugadorCompleto (round-trip, mismos valores) escribio ${escritos.length} campos: ${escritos.join(', ')}`);

    // ---------- C1.4: con los mismos valores, no debe escribir NINGUN campo
    // (escritos === []) ni tocar el contador de ediciones (+0x32) ----------
    assert(Array.isArray(escritos) && escritos.length === 0, `escribirJugadorCompleto con los mismos valores devuelve [] (obtenido: ${JSON.stringify(escritos)})`);

    const BASE = 36872, STRIDE = 124;
    const off = BASE + idPrueba * STRIDE;
    let difs = [];
    for (let i = 0; i < STRIDE; i++) {
      const a = antes[off + i], b = copia[off + i];
      if (a !== b) difs.push(off + i);
    }
    console.log(`bytes distintos en el registro tras round-trip: ${difs.length} (offsets relativos: ${difs.map(o => '0x' + (o - off).toString(16)).join(', ')})`);
    assert(difs.length === 0, 'C1.4: ningun byte del registro cambia (ni siquiera el contador +0x32) cuando no hay cambios reales');

    const contadorAntes = PES5_EDITOR.leerJugadorCompleto(plano, idPrueba).contadorEdiciones;
    const contadorDespues = PES5_EDITOR.leerJugadorCompleto(copia, idPrueba).contadorEdiciones;
    assert(contadorAntes === contadorDespues, `C1.4: contadorEdiciones NO cambia cuando no se escribio nada real (${contadorAntes} -> ${contadorDespues})`);

    // releer con leerJugadorCompleto y comparar todos los campos (menos contador)
    const leidoDespues = PES5_EDITOR.leerJugadorCompleto(copia, idPrueba);
    const igualAtributos = JSON.stringify(leidoAntes.atributos) === JSON.stringify(leidoDespues.atributos);
    const igualEscala8 = JSON.stringify(leidoAntes.escala8) === JSON.stringify(leidoDespues.escala8);
    const igualHabilidades = JSON.stringify(leidoAntes.habilidades) === JSON.stringify(leidoDespues.habilidades);
    assert(igualAtributos, 'atributos identicos tras el round-trip');
    assert(igualEscala8, 'escala8 identica tras el round-trip');
    assert(igualHabilidades, 'habilidades identicas tras el round-trip');
    assert(leidoAntes.edad === leidoDespues.edad, 'edad identica tras el round-trip');
    assert(leidoAntes.altura === leidoDespues.altura, 'altura identica tras el round-trip');
    assert(leidoAntes.pieDominante === leidoDespues.pieDominante, 'pieDominante identico tras el round-trip');
    assert(leidoAntes.lesiones === leidoDespues.lesiones, 'lesiones identicas tras el round-trip');
  }

  // ---------- 4) leerPlantillaCompleta / equiposDelJugador ----------
  const iBolton = PES5_EDITOR.buscarEquipoPorNombre(plano, 'Bolton Wanderers');
  assert(iBolton >= 0, `Bolton Wanderers encontrado (indice ${iBolton})`);
  if (iBolton >= 0) {
    const plantilla = PES5_EDITOR.leerPlantillaCompleta(plano, iBolton);
    const idsEsperados = PES5_EDITOR.leerPlantillaEquipo(plano, iBolton);
    assert(plantilla.length === idsEsperados.length, `leerPlantillaCompleta(Bolton) tiene ${plantilla.length} jugadores (esperado ${idsEsperados.length})`);
    assert(plantilla.every((j, i) => j.id === idsEsperados[i]), 'leerPlantillaCompleta respeta el orden del roster');
    console.log('plantilla de Bolton: ' + plantilla.map(j => `${j.nombre} (${j.altura}cm, ${j.edad}a)`).join(', '));
  }

  if (idRonaldinho >= 0) {
    const equipos = PES5_EDITOR.equiposDelJugador(plano, idRonaldinho);
    console.log(`equiposDelJugador(Ronaldinho) -> indices ${JSON.stringify(equipos)} = ${equipos.map(i => PES5_EDITOR.nombreEquipo(plano, i)).join(', ')}`);
    assert(equipos.length >= 1, 'equiposDelJugador(Ronaldinho) devuelve al menos 1 equipo');
  }

  console.log(`\n${fallas === 0 ? 'TODO OK' : fallas + ' FALLO(S)'}`);
  process.exit(fallas === 0 ? 0 : 1);
}

main().catch(e => { console.error('ERROR:', e.stack || e); process.exit(1); });
