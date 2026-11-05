'use strict';
/* ============================================================
   Test de reglas de Storage (slice 3.3, H-04)
   ------------------------------------------------------------
   Corre contra el emulador de Storage con firebase/storage.rules.
   Nadie sube nada desde el cliente (los logos van a Cloudinary); solo se
   leen los trofeos. Sin dependencias: API REST del emulador y tokens sin
   firma (el emulador los acepta).

   CÓMO CORRERLO
     cd functions
     npm run test:rules:storage
   ============================================================ */

const HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199';
const PROJECT = process.env.GCLOUD_PROJECT || 'demo-tsc-web';
const BUCKET = `${PROJECT}.appspot.com`;
const BASE = `http://${HOST}/v0/b/${BUCKET}/o`;

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
function mockToken(uid){
  const now = Math.floor(Date.now() / 1000);
  return [b64({ alg: 'none', typ: 'JWT' }), b64({
    iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT,
    iat: now, exp: now + 3600, auth_time: now, sub: uid, user_id: uid,
    firebase: { sign_in_provider: 'password' },
  }), ''].join('.');
}
const USER = mockToken('user1');

const upload = (name, auth) => fetch(`${BASE}?name=${encodeURIComponent(name)}`, {
  method: 'POST',
  headers: { 'Content-Type': 'image/png', ...(auth ? { Authorization: 'Firebase ' + auth } : {}) },
  body: Buffer.from('x'),
}).then(r => r.status);
const read = name => fetch(`${BASE}/${encodeURIComponent(name)}?alt=media`).then(r => r.status);

const CASES = [
  ['logos: usuario registrado no sube', () => upload('logos/a.png', USER), 403],
  ['logos: anónimo no sube',            () => upload('logos/b.png', null), 403],
  ['trophies: usuario no sube',         () => upload('trophies/c.glb', USER), 403],
  ['ruta sin regla: usuario no sube',   () => upload('otra/d.png', USER), 403],
  // 404 = la regla permite leer y el archivo no existe en el emulador.
  ['trophies: anónimo lee',             () => read('trophies/copa_1.glb'), 404],
  ['logos: anónimo lee',                () => read('logos/viejo.png'), 404],
  ['ruta sin regla: anónimo no lee',    () => read('otra/d.png'), 403],
];

(async () => {
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
