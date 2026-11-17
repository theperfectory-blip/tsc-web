'use strict';
/* ============================================================
   Test de reglas de Storage (slice 3.3, H-04; SAVE-1)
   ------------------------------------------------------------
   Corre contra el emulador de Storage con firebase/storage.rules.
   - Trofeos y logos (H-04): nadie sube nada desde el cliente; solo se leen los trofeos.
   - SAVE-1: pes5_save/actual. Escribe solo el admin (tope 4 MiB); lee presidente y admin.
     Las reglas consultan users/{uid}.role en Firestore, así que este test también siembra
     esos usuarios en el emulador de Firestore (8080) con «Bearer owner».
   Sin dependencias: API REST de los emuladores y tokens sin firma (el emulador los acepta).

   CÓMO CORRERLO
     cd functions
     npm run test:rules:storage   (levanta Storage y Firestore juntos)
   ============================================================ */

const HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199';
const FS_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const PROJECT = process.env.GCLOUD_PROJECT || 'demo-tsc-web';
const BUCKET = `${PROJECT}.appspot.com`;
const BASE = `http://${HOST}/v0/b/${BUCKET}/o`;
const FS_ROOT = `http://${FS_HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;
const SAVE = 'pes5_save/actual';
const MAX_SAVE = 4 * 1024 * 1024;

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
function mockToken(uid){
  const now = Math.floor(Date.now() / 1000);
  return [b64({ alg: 'none', typ: 'JWT' }), b64({
    iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT,
    iat: now, exp: now + 3600, auth_time: now, sub: uid, user_id: uid,
    firebase: { sign_in_provider: 'password' },
  }), ''].join('.');
}
const USER = mockToken('user1');        // sesión sin documento de usuario (sin rol)
const PRES = mockToken('pres1');        // rol president
const ADMIN = mockToken('admin1');      // rol admin
const SIN_ROL = mockToken('publico1');  // documento con un rol que no es president ni admin

const auth = t => (t ? { Authorization: 'Firebase ' + t } : {});
const upload = (name, t, body = Buffer.from('x')) => fetch(`${BASE}?name=${encodeURIComponent(name)}`, {
  method: 'POST',
  headers: { 'Content-Type': 'image/png', ...auth(t) },
  body,
}).then(r => r.status);
const read = (name, t) => fetch(`${BASE}/${encodeURIComponent(name)}?alt=media`, { headers: auth(t) }).then(r => r.status);
const del = (name, t) => fetch(`${BASE}/${encodeURIComponent(name)}`, { method: 'DELETE', headers: auth(t) }).then(r => r.status);

// Siembra users/{uid} en el emulador de Firestore (escritura de administrador: «Bearer owner»).
async function seedUser(uid, role){
  const r = await fetch(`${FS_ROOT}/users/${uid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: { uid: { stringValue: uid }, role: { stringValue: role } } }),
  });
  if (!r.ok) throw new Error(`seed ${uid}: HTTP ${r.status} ${await r.text()}`);
}

const CASES = [
  ['logos: usuario registrado no sube', () => upload('logos/a.png', USER), 403],
  ['logos: anónimo no sube',            () => upload('logos/b.png', null), 403],
  ['trophies: usuario no sube',         () => upload('trophies/c.glb', USER), 403],
  ['ruta sin regla: usuario no sube',   () => upload('otra/d.png', USER), 403],
  // 404 = la regla permite leer y el archivo no existe en el emulador.
  ['trophies: anónimo lee',             () => read('trophies/copa_1.glb', null), 404],
  ['logos: anónimo lee',                () => read('logos/viejo.png', null), 404],
  ['ruta sin regla: anónimo no lee',    () => read('otra/d.png', null), 403],

  // ---- SAVE-1 · pes5_save/actual ----
  ['save: anónimo no sube',                  () => upload(SAVE, null), 403],
  ['save: sin documento de rol no sube',     () => upload(SAVE, USER), 403],
  ['save: presidente NO sube',               () => upload(SAVE, PRES), 403],
  ['save: rol que no es admin no sube',      () => upload(SAVE, SIN_ROL), 403],
  ['save: admin sube el save',               () => upload(SAVE, ADMIN, Buffer.alloc(1250304, 7)), 200],
  ['save: admin sube exactamente 4 MiB',     () => upload(SAVE, ADMIN, Buffer.alloc(MAX_SAVE, 8)), 200],
  ['save: admin sube 4 MiB + 1 byte (demasiado grande)', () => upload(SAVE, ADMIN, Buffer.alloc(MAX_SAVE + 1, 9)), 403],
  ['save: presidente sube 4 MiB + 1 (sigue sin poder)',  () => upload(SAVE, PRES, Buffer.alloc(MAX_SAVE + 1, 9)), 403],
  ['save: el tope no deja un archivo sobredimensionado (el 4 MiB exacto sigue vigente)', () => read(SAVE, PRES), 200],
  ['save: anónimo NO lee',                   () => read(SAVE, null), 403],
  ['save: sin documento de rol NO lee',      () => read(SAVE, USER), 403],
  ['save: rol que no es president/admin NO lee', () => read(SAVE, SIN_ROL), 403],
  ['save: presidente lee',                   () => read(SAVE, PRES), 200],
  ['save: admin lee',                        () => read(SAVE, ADMIN), 200],
  ['save: presidente NO borra',              () => del(SAVE, PRES), 403],
  ['save: admin NO borra (solo se reemplaza)', () => del(SAVE, ADMIN), 403],
  ['save: tras los rechazos, el presidente sigue leyendo el save vigente', () => read(SAVE, PRES), 200],
];

(async () => {
  await seedUser('pres1', 'president');
  await seedUser('admin1', 'admin');
  await seedUser('publico1', 'publico');
  let fails = 0;
  for (const [desc, run, want] of CASES) {
    const got = await run();
    const ok = got === want;
    if (!ok) fails++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${desc}  (esperado ${want}, obtenido ${got})`);
  }
  console.log(`\nrules-storage: ${CASES.length - fails}/${CASES.length} casos OK`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
