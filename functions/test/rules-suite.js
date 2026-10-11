'use strict';
/* ============================================================
   Suite de reglas Firestore — todas las colecciones (slice 3.2, H-06)
   ------------------------------------------------------------
   Corre contra el emulador de Firestore con firebase/firestore.rules.
   Roles: anónimo, usuario registrado sin equipo, presidente con equipo,
   presidente con lockEdits y admin. Los casos finos de teams.name/logo
   siguen en rules-teams.js.

   Sin dependencias: API REST del emulador, tokens sin firma (el
   emulador los acepta) y "Bearer owner" para sembrar saltando reglas.

   CÓMO CORRERLO
     cd functions
     npm run test:rules        (corre rules-teams.js y esta suite)
   ============================================================ */

const HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const PROJECT = process.env.GCLOUD_PROJECT || 'demo-tsc-web';
const ROOT = `http://${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;
const CLOUD = 'https://res.cloudinary.com/dnjijd8mx/image/upload/v1712345678/tsc-logos/avatar.png';

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
function mockToken(uid, email){
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT,
    iat: now, exp: now + 3600, auth_time: now,
    sub: uid, user_id: uid,
    firebase: { sign_in_provider: 'password', identities: {} },
  };
  if (email) { claims.email = email; claims.email_verified = false; }
  return [b64({ alg: 'none', kid: 'fakekid', typ: 'JWT' }), b64(claims), ''].join('.');
}

// Quién pide: null = anónimo.
const AS = {
  anon:   null,
  user:   mockToken('user1', 'user1@test.dev'),
  pres:   mockToken('pres5', 'pres5@test.dev'),
  locked: mockToken('locked', 'locked@test.dev'),
  admin:  mockToken('admin1', 'admin1@test.dev'),
  owner:  'owner',
};

function toValue(v){
  if (v === null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Number.isInteger(v)) return { integerValue: String(v) };
  if (typeof v === 'number') return { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'object') return { mapValue: { fields: toFields(v) } };
  return { stringValue: String(v) };
}
function toFields(obj){
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toValue(v)]));
}
function headers(auth){
  const h = { 'Content-Type': 'application/json' };
  if (auth) h.Authorization = 'Bearer ' + auth;
  return h;
}

// Cada operación devuelve el status HTTP (200 = permitido, 403 = denegado).
const op = {
  async get(path, auth){
    return (await fetch(`${ROOT}/${path}`, { headers: headers(auth) })).status;
  },
  // Alta: falla si el documento ya existe (como un .set() sobre doc nuevo).
  async create(path, data, auth){
    const [col, id] = splitPath(path);
    const res = await fetch(`${ROOT}/${col}?documentId=${encodeURIComponent(id)}`, {
      method: 'POST', headers: headers(auth), body: JSON.stringify({ fields: toFields(data) }),
    });
    return res.status;
  },
  // Modificación de los campos dados sobre un documento existente.
  async update(path, data, auth){
    const mask = Object.keys(data).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
    const res = await fetch(`${ROOT}/${path}?${mask}&currentDocument.exists=true`, {
      method: 'PATCH', headers: headers(auth), body: JSON.stringify({ fields: toFields(data) }),
    });
    return res.status;
  },
  async del(path, auth){
    return (await fetch(`${ROOT}/${path}`, { method: 'DELETE', headers: headers(auth) })).status;
  },
  // Consulta sobre una colección entera (list).
  async list(col, auth, where){
    const q = { from: [{ collectionId: col }] };
    if (where) q.where = { fieldFilter: { field: { fieldPath: where[0] }, op: 'EQUAL', value: toValue(where[1]) } };
    const res = await fetch(`${ROOT}:runQuery`, { method: 'POST', headers: headers(auth), body: JSON.stringify({ structuredQuery: q }) });
    return res.status;
  },
};
function splitPath(p){ const i = p.lastIndexOf('/'); return [p.slice(0, i), p.slice(i + 1)]; }

async function seed(){
  await fetch(`http://${HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  const put = async (path, data) => {
    const s = await fetch(`${ROOT}/${path}`, { method: 'PATCH', headers: headers('owner'), body: JSON.stringify({ fields: toFields(data) }) });
    if (!s.ok) throw new Error(`seed ${path}: ${s.status} ${await s.text()}`);
  };
  const base = { email: null, username: null, photoURL: null, timezone: 'America/Santiago', createdAt: '2026-06-01T00:00:00.000Z' };
  await put('users/user1',  { ...base, uid: 'user1',  displayName: 'Usuario Uno', role: 'president', teamId: null, lockEdits: true });
  await put('users/pres5',  { ...base, uid: 'pres5',  displayName: 'Presi Cinco', role: 'president', teamId: 5, lockEdits: false });
  await put('users/locked', { ...base, uid: 'locked', displayName: 'Presi Siete', role: 'president', teamId: 7, lockEdits: true });
  await put('users/admin1', { ...base, uid: 'admin1', displayName: 'Admin', role: 'admin', teamId: null, lockEdits: false });
  // Perfil histórico con un valor que hoy no pasaría la validación: no
  // debe bloquear la edición de otros campos.
  await put('users/legacy', { ...base, uid: 'legacy', displayName: 'Viejo <b>', role: 'president', teamId: null, lockEdits: true });
  await put('teams/5', { name: 'Club Cinco', logo: null });
  await put('teams/6', { name: 'Club Seis', logo: null });
  await put('teams/7', { name: 'Club Siete', logo: null });
  for (const col of TOURNAMENT) await put(`${col}/1`, { name: 'seed', season: 1 });
  await put('notificationRuns/r1', { at: '2026-06-01' });
  await put('notificationEvents/e1', { at: '2026-06-01' });
}

const TOURNAMENT = [
  'seasons', 'competitions', 'phases', 'matches', 'coins', 'history', 'settings',
  'matchHistory', 'sorteo', 'sorteoEvents', 'palmares', 'palmares-comps', 'calDayLabels', '_counters',
];
const NON_ADMIN = ['anon', 'user', 'pres', 'locked'];

const CASES = [];
const add = (desc, run, want) => CASES.push([desc, run, want]);

// --- Colecciones del torneo: lectura pública, escritura solo admin ---
for (const col of TOURNAMENT) {
  add(`${col}: anónimo lee`, () => op.get(`${col}/1`, AS.anon), 200);
  add(`${col}: anónimo lista`, () => op.list(col, AS.anon), 200);
  for (const who of NON_ADMIN) {
    add(`${col}: ${who} no crea`,      () => op.create(`${col}/n-${who}`, { x: 1 }, AS[who]), 403);
    add(`${col}: ${who} no modifica`,  () => op.update(`${col}/1`, { name: 'hack' }, AS[who]), 403);
    add(`${col}: ${who} no borra`,     () => op.del(`${col}/1`, AS[who]), 403);
  }
  add(`${col}: admin crea`,     () => op.create(`${col}/n-admin`, { x: 1 }, AS.admin), 200);
  add(`${col}: admin modifica`, () => op.update(`${col}/1`, { name: 'ok' }, AS.admin), 200);
  add(`${col}: admin borra`,    () => op.del(`${col}/n-admin`, AS.admin), 200);
}

// --- Equipos (los valores de name/logo están en rules-teams.js) ---
add('teams: anónimo lee', () => op.get('teams/5', AS.anon), 200);
for (const who of NON_ADMIN) {
  add(`teams: ${who} no crea`, () => op.create(`teams/n-${who}`, { name: 'X' }, AS[who]), 403);
  add(`teams: ${who} no borra`, () => op.del('teams/6', AS[who]), 403);
}
add('teams: anónimo no modifica',              () => op.update('teams/5', { name: 'Hack' }, AS.anon), 403);
add('teams: usuario sin equipo no modifica',   () => op.update('teams/5', { name: 'Hack' }, AS.user), 403);
add('teams: presidente edita el suyo',         () => op.update('teams/5', { name: 'Club Cinco FC' }, AS.pres), 200);
add('teams: presidente no toca equipo ajeno',  () => op.update('teams/6', { name: 'Hack' }, AS.pres), 403);
add('teams: presidente no toca otros campos',  () => op.update('teams/5', { yunacoin: 999999 }, AS.pres), 403);
add('teams: presidente con lockEdits no edita', () => op.update('teams/7', { name: 'Hack' }, AS.locked), 403);
add('teams: admin crea',  () => op.create('teams/n-admin', { name: 'Nuevo' }, AS.admin), 200);
add('teams: admin borra', () => op.del('teams/n-admin', AS.admin), 200);

// --- users: lectura ---
add('users: anónimo no lee perfiles',     () => op.get('users/pres5', AS.anon), 403);
add('users: usuario lee el suyo',         () => op.get('users/user1', AS.user), 200);
add('users: usuario no lee otro',         () => op.get('users/pres5', AS.user), 403);
add('users: presidente no lee otro',      () => op.get('users/admin1', AS.pres), 403);
add('users: admin lee cualquiera',        () => op.get('users/pres5', AS.admin), 200);
add('users: no admin no lista',           () => op.list('users', AS.pres), 403);
add('users: no admin no busca por username', () => op.list('users', AS.pres, ['username', 'x']), 403);
add('users: admin lista',                 () => op.list('users', AS.admin), 200);

// --- users: alta (auto-registro) ---
// Cada caso usa su propio uid: si una regla se afloja, el alta que pasa
// no tapa a las siguientes con un 409 (documento ya existe).
const NEW_UID = 'newbie', NEW = mockToken(NEW_UID, 'newbie@test.dev');
const profile = (uid, over = {}) => ({
  uid, email: `${uid}@test.dev`, displayName: 'Nuevo Presi', username: null, photoURL: null,
  timezone: 'America/Santiago', role: 'president', teamId: null, lockEdits: true,
  createdAt: '2026-10-10T12:00:00.000Z', ...over,
});
let nb = 0;
function signup(desc, over, want){
  const uid = `nb${++nb}`;
  add(`users.create: ${desc}`, () => op.create(`users/${uid}`, typeof over === 'function' ? over(profile(uid)) : profile(uid, over), mockToken(uid, `${uid}@test.dev`)), want);
}
add('users.create: anónimo no crea',       () => op.create('users/anon1', profile('anon1'), AS.anon), 403);
add('users.create: perfil para otro uid',  () => op.create('users/otro', profile('otro'), NEW), 403);
signup('se auto-asciende a admin',    { role: 'admin' }, 403);
signup('se asigna un equipo',         { teamId: 5 }, 403);
signup('nace desbloqueado',           { lockEdits: false }, 403);
signup('sin lockEdits',               ({ lockEdits, ...r }) => r, 403);
signup('sin role',                    ({ role, ...r }) => r, 403);
signup('campo fuera de la allowlist', { fcmTokens: ['t'] }, 403);
signup('uid del campo ≠ token',       { uid: 'admin1' }, 403);
signup('uid con payload',             { uid: "x');alert(1);//" }, 403);
signup('email ≠ token',               { email: 'otro@test.dev' }, 403);
signup('displayName con HTML',        { displayName: '<img src=x onerror=alert(1)>' }, 403);
signup('displayName de 65',           { displayName: 'x'.repeat(65) }, 403);
signup('displayName vacío',           { displayName: '' }, 403);
signup('username con mayúsculas',     { username: 'Hola' }, 403);
signup('photoURL ajena',              { photoURL: 'https://evil.example/a.png' }, 403);
signup('timezone con comillas',       { timezone: 'x" onload="y' }, 403);
signup('createdAt no string',         { createdAt: 5 }, 403);
signup('perfil real de _loadProfile', {}, 200);
signup('timezone null (navegador sin Intl)', { timezone: null }, 200);
add('users.create: perfil propio (para la baja)', () => op.create(`users/${NEW_UID}`, profile(NEW_UID), NEW), 200);

// --- users: edición del propio perfil ---
add('users.update: displayName válido',         () => op.update('users/user1', { displayName: 'Nuevo Nombre' }, AS.user), 200);
add('users.update: displayName con < >',        () => op.update('users/user1', { displayName: 'a<script>' }, AS.user), 403);
add('users.update: displayName de 65',          () => op.update('users/user1', { displayName: 'x'.repeat(65) }, AS.user), 403);
add('users.update: displayName no string',      () => op.update('users/user1', { displayName: 7 }, AS.user), 403);
add('users.update: username válido',            () => op.update('users/user1', { username: 'usuario_1' }, AS.user), 200);
add('users.update: username null',              () => op.update('users/user1', { username: null }, AS.user), 200);
add('users.update: username con comilla',       () => op.update('users/user1', { username: "a'b" }, AS.user), 403);
add('users.update: username de 31',             () => op.update('users/user1', { username: 'a'.repeat(31) }, AS.user), 403);
add('users.update: photoURL de Cloudinary',     () => op.update('users/user1', { photoURL: CLOUD }, AS.user), 200);
add('users.update: photoURL null',              () => op.update('users/user1', { photoURL: null }, AS.user), 200);
add('users.update: photoURL javascript:',       () => op.update('users/user1', { photoURL: 'javascript:alert(1)' }, AS.user), 403);
add('users.update: photoURL con comilla',       () => op.update('users/user1', { photoURL: CLOUD + '" onerror="x' }, AS.user), 403);
add('users.update: photoURL de otra cuenta',    () => op.update('users/user1', { photoURL: 'https://res.cloudinary.com/otra/image/upload/a.png' }, AS.user), 403);
add('users.update: timezone IANA',              () => op.update('users/user1', { timezone: 'America/Argentina/Buenos_Aires' }, AS.user), 200);
add('users.update: timezone inválida',          () => op.update('users/user1', { timezone: '<x>' }, AS.user), 403);
add('users.update: push de push.js',            () => op.update('users/user1', { fcmTokens: ['tok-a', 'tok-b'], pushEnabled: true, pushPlatform: 'android', pushUpdatedAt: '2026-10-10T12:00:00.000Z' }, AS.user), 200);
add('users.update: pushEnabled no bool',        () => op.update('users/user1', { pushEnabled: 'si' }, AS.user), 403);
add('users.update: pushPlatform inventada',     () => op.update('users/user1', { pushPlatform: 'tostadora' }, AS.user), 403);
add('users.update: fcmTokens de 21',            () => op.update('users/user1', { fcmTokens: Array.from({ length: 21 }, (_, i) => 't' + i) }, AS.user), 403);
add('users.update: fcmTokens no lista',         () => op.update('users/user1', { fcmTokens: 'tok' }, AS.user), 403);
add('users.update: se auto-asciende a admin',   () => op.update('users/user1', { role: 'admin' }, AS.user), 403);
add('users.update: se asigna un equipo',        () => op.update('users/user1', { teamId: 5 }, AS.user), 403);
add('users.update: se desbloquea',              () => op.update('users/locked', { lockEdits: false }, AS.locked), 403);
add('users.update: cambia su email',            () => op.update('users/user1', { email: 'x@y.z' }, AS.user), 403);
add('users.update: cambia su uid',              () => op.update('users/user1', { uid: 'admin1' }, AS.user), 403);
add('users.update: campo nuevo',                () => op.update('users/user1', { isAdmin: true }, AS.user), 403);
add('users.update: perfil ajeno',               () => op.update('users/pres5', { displayName: 'Hack' }, AS.user), 403);
add('users.update: anónimo',                    () => op.update('users/user1', { displayName: 'Hack' }, AS.anon), 403);
add('users.update: valor histórico no bloquea', () => op.update('users/legacy', { timezone: 'UTC' }, mockToken('legacy')), 200);
add('users.update: admin asigna rol y equipo',  () => op.update('users/user1', { role: 'president', teamId: 6, lockEdits: false }, AS.admin), 200);

// --- users: baja ---
add('users.delete: anónimo',        () => op.del('users/user1', AS.anon), 403);
add('users.delete: perfil ajeno',   () => op.del('users/pres5', AS.user), 403);
add('users.delete: el propio',      () => op.del(`users/${NEW_UID}`, NEW), 200);
add('users.delete: admin borra',    () => op.del('users/legacy', AS.admin), 200);

// --- Notificaciones push: solo las escribe el Admin SDK ---
for (const col of ['notificationRuns', 'notificationEvents']) {
  for (const who of NON_ADMIN) add(`${col}: ${who} no lee`, () => op.get(`${col}/${col === 'notificationRuns' ? 'r1' : 'e1'}`, AS[who]), 403);
  add(`${col}: admin lee`, () => op.get(`${col}/${col === 'notificationRuns' ? 'r1' : 'e1'}`, AS.admin), 200);
  for (const who of [...NON_ADMIN, 'admin']) {
    add(`${col}: ${who} no crea`,     () => op.create(`${col}/n-${who}`, { x: 1 }, AS[who]), 403);
    add(`${col}: ${who} no modifica`, () => op.update(`${col}/${col === 'notificationRuns' ? 'r1' : 'e1'}`, { x: 2 }, AS[who]), 403);
  }
}

// --- Colección no declarada: cerrada por defecto ---
add('colección sin regla: admin no escribe', () => op.create('otra/x', { x: 1 }, AS.admin), 403);
add('colección sin regla: anónimo no lee',   () => op.get('otra/x', AS.anon), 403);

(async () => {
  await seed();
  let fails = 0;
  for (const [desc, run, want] of CASES) {
    const got = await run();
    const ok = got === want;
    if (!ok) fails++;
    if (!ok || process.env.VERBOSE) console.log(`${ok ? 'PASS' : 'FAIL'}  ${desc}  (esperado ${want}, obtenido ${got})`);
  }
  console.log(`\nrules-suite: ${CASES.length - fails}/${CASES.length} casos OK`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
