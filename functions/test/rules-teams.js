'use strict';
/* ============================================================
   Test de reglas Firestore — teams (slice 0.1, H-01)
   ------------------------------------------------------------
   Corre contra el emulador de Firestore, que carga
   firebase/firestore.rules (firebase.json). Sin dependencias: usa la
   API REST del emulador con tokens sin firma (el emulador los acepta)
   y "Bearer owner" para sembrar datos saltando las reglas.

   CÓMO CORRERLO
     cd functions
     npm run test:rules
   (mismas notas de TMP/TEMP y JDK que verify-emulator.js)
   ============================================================ */

const assert = require('assert');

const HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const PROJECT = process.env.GCLOUD_PROJECT || 'demo-tsc-web';
const BASE = `http://${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;
const CLOUD = 'https://res.cloudinary.com/dnjijd8mx/image/upload/v1712345678/tsc-logos/escudo_ok.png';

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
function mockToken(uid){
  const now = Math.floor(Date.now() / 1000);
  return [
    b64({ alg: 'none', kid: 'fakekid', typ: 'JWT' }),
    b64({
      iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT,
      iat: now, exp: now + 3600, auth_time: now,
      sub: uid, user_id: uid,
      firebase: { sign_in_provider: 'custom', identities: {} },
    }),
    '',
  ].join('.');
}

function toFields(obj){
  const f = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null) f[k] = { nullValue: null };
    else if (typeof v === 'boolean') f[k] = { booleanValue: v };
    else if (Number.isInteger(v)) f[k] = { integerValue: String(v) };
    else f[k] = { stringValue: String(v) };
  }
  return f;
}

async function patch(path, data, auth){
  const mask = Object.keys(data).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
  const res = await fetch(`${BASE}/${path}?${mask}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + auth },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  return res.status;
}

async function seed(){
  await fetch(`http://${HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  const put = (p, d) => patch(p, d, 'owner');
  assert.strictEqual(await put('users/pres5',  { role: 'president', teamId: 5, lockEdits: false }), 200);
  assert.strictEqual(await put('users/pres6',  { role: 'president', teamId: 6, lockEdits: false }), 200);
  assert.strictEqual(await put('users/locked', { role: 'president', teamId: 7, lockEdits: true }), 200);
  assert.strictEqual(await put('users/admin1', { role: 'admin', teamId: null }), 200);
  // Equipo con un logo histórico que no cumple el patrón: editar solo el
  // nombre no debe quedar bloqueado por él.
  assert.strictEqual(await put('teams/5', { name: 'Club Cinco', ini: 'CC5', color: '#123456', logo: 'assets/legacy.png' }), 200);
  assert.strictEqual(await put('teams/7', { name: 'Club Siete', logo: null }), 200);
}

const CASES = [
  // [descripción, path, data, uid, esperado]
  ['presidente: URL válida de Cloudinary',          'teams/5', { logo: CLOUD }, 'pres5', 200],
  ['presidente: quitar logo (null)',                'teams/5', { logo: null }, 'pres5', 200],
  ['presidente: cambiar nombre válido',             'teams/5', { name: 'Club Cinco FC' }, 'pres5', 200],
  ['presidente: nombre + logo válidos juntos',      'teams/5', { name: 'Cinco', logo: CLOUD }, 'pres5', 200],
  ['presidente: payload x" onerror=…',              'teams/5', { logo: 'x" onerror="alert(1)' }, 'pres5', 403],
  ['presidente: Cloudinary + comilla inyectada',    'teams/5', { logo: CLOUD + '" onerror="alert(1)' }, 'pres5', 403],
  ['presidente: dominio ajeno',                     'teams/5', { logo: 'https://evil.example.com/a.png' }, 'pres5', 403],
  ['presidente: Cloudinary de otra cuenta',         'teams/5', { logo: 'https://res.cloudinary.com/otracuenta/image/upload/a.png' }, 'pres5', 403],
  ['presidente: http (sin TLS)',                    'teams/5', { logo: 'http://res.cloudinary.com/dnjijd8mx/image/upload/a.png' }, 'pres5', 403],
  ['presidente: javascript:',                       'teams/5', { logo: 'javascript:alert(1)' }, 'pres5', 403],
  ['presidente: data: URL',                         'teams/5', { logo: 'data:image/svg+xml,<svg onload=alert(1)>' }, 'pres5', 403],
  ['presidente: logo de 500+ caracteres',           'teams/5', { logo: CLOUD.replace('escudo_ok', 'a'.repeat(500)) }, 'pres5', 403],
  ['presidente: logo no string',                    'teams/5', { logo: 42 }, 'pres5', 403],
  ['presidente: nombre vacío',                      'teams/5', { name: '' }, 'pres5', 403],
  ['presidente: nombre de 41 caracteres',           'teams/5', { name: 'x'.repeat(41) }, 'pres5', 403],
  ['presidente: nombre con HTML',                   'teams/5', { name: '<img src=x onerror=alert(1)>' }, 'pres5', 403],
  ['presidente: nombre no string',                  'teams/5', { name: 123 }, 'pres5', 403],
  ['presidente: campo fuera de allowlist (color)',  'teams/5', { color: '#ff0000' }, 'pres5', 403],
  ['presidente: equipo ajeno',                      'teams/5', { logo: CLOUD }, 'pres6', 403],
  ['presidente bloqueado (lockEdits)',              'teams/7', { logo: CLOUD }, 'locked', 403],
  ['admin: logo libre (sin cambios de política)',   'teams/5', { logo: 'assets/otro.png' }, 'admin1', 200],
];

(async () => {
  await seed();
  let fails = 0;
  for (const [desc, path, data, uid, want] of CASES) {
    const got = await patch(path, data, mockToken(uid));
    const ok = got === want;
    if (!ok) fails++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${desc}  (esperado ${want}, obtenido ${got})`);
  }
  console.log(`\n${CASES.length - fails}/${CASES.length} casos OK`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
