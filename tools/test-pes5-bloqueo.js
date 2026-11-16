// Pruebas unitarias del bloqueo por equipo (BLOQ-1): TTL de 3 minutos y toma de control.
// Carga js/pes5-bloqueo.js en un contexto aislado con un firebase de mentira; no toca Firestore.
// Uso: node tools/test-pes5-bloqueo.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'tsc-src', 'js', 'pes5-bloqueo.js'), 'utf8');
let escritos = [];
const docStub = { set: (data) => { escritos.push(data); return Promise.resolve(); } };
const firebaseStub = { firestore: () => ({ collection: () => ({ doc: () => docStub }), runTransaction: () => Promise.resolve() }) };
const ctx = { firebase: firebaseStub, Date, Number, console };
vm.createContext(ctx);
vm.runInContext(src + '\nthis.PES5_BLOQUEO = PES5_BLOQUEO;', ctx, { filename: 'pes5-bloqueo.js' });
const B = ctx.PES5_BLOQUEO;

let fallas = 0;
function assert(cond, msg) {
  if (cond) console.log('OK   — ' + msg);
  else { fallas++; console.log('FALLO — ' + msg); }
}
const hace = (ms) => new Date(Date.now() - ms).toISOString();

// TTL: 3 minutos sin latido = bloqueo muerto
assert(B.TTL_MS === 180000, 'TTL de 3 minutos');
assert(B.INACTIVIDAD_MS === 600000, 'inactividad del presidente: 10 minutos (constante en pes5-bloqueo.js)');
assert(B.LATIDO_MS === 30000, 'latido cada 30 s (dentro del TTL)');
assert(B.vivo({ latido: hace(60 * 1000) }) === true, 'latido de hace 1 minuto: el bloqueo sigue vivo');
assert(B.vivo({ latido: hace(170 * 1000) }) === true, 'latido de hace 2 min 50 s: sigue vivo');
assert(B.vivo({ latido: hace(181 * 1000) }) === false, 'latido de hace más de 3 minutos: el bloqueo está muerto (el admin puede editar)');
assert(B.vivo({ latido: 'no es una fecha' }) === false, 'latido inválido: no vivo');
assert(B.vivo(null) === false, 'sin documento: no vivo');
assert(B.vivo({}) === false, 'documento sin latido: no vivo');

// Toma de control: escribe el bloqueo del nuevo dueño aunque el anterior siga vivo
escritos = [];
B.tomarControl(61, 'admin', 'admin1', 'Luis').then((r) => {
  assert(r.ok === true, 'tomarControl devuelve ok');
  const e = escritos[0] || {};
  assert(e.por === 'admin' && e.uid === 'admin1' && e.nombre === 'Luis', 'tomarControl escribe el nuevo dueño (admin)');
  assert(typeof e.latido === 'string' && typeof e.desde === 'string', 'tomarControl escribe latido y desde');
  assert(Object.keys(e).sort().join(',') === 'desde,latido,nombre,por,uid', 'tomarControl escribe solo los 5 campos del bloqueo');
  console.log('');
  console.log(`\n${fallas === 0 ? 'TODO OK' : fallas + ' FALLO(S)'}`);
  process.exit(fallas === 0 ? 0 : 1);
});
