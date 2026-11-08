'use strict';
/* ============================================================
   Reglas de la 2.0 (slice 5.B): pedidos_pes5, pes5_bloqueos, pes5_config, pes5_plantillas.
   ------------------------------------------------------------
   Mismo mecanismo que rules-suite.js (API REST del emulador, tokens sin firma, "Bearer owner"
   para sembrar). Roles: anonimo, presidente propio (equipo 5), presidente ajeno (equipo 6),
   admin. Los payloads imitan lo que escriben mejoras-page.js (pedido de mejora y de
   formacion) y pes5-bloqueo.js; si la allowlist deja afuera un campo real, estos tests
   tienen que fallar.

   CÓMO CORRERLO
     cd functions
     npm run test:rules        (corre rules-teams.js, rules-suite.js y esta suite)
   ============================================================ */

const HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const PROJECT = process.env.GCLOUD_PROJECT || 'demo-tsc-web';
const ROOT = `http://${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
function mockToken(uid, email){
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT,
    iat: now, exp: now + 3600, auth_time: now,
    sub: uid, user_id: uid,
    firebase: { sign_in_provider: 'password', identities: {} },
    email, email_verified: false,
  };
  return [b64({ alg: 'none', kid: 'fakekid', typ: 'JWT' }), b64(claims), ''].join('.');
}
const AS = {
  anon:  null,
  pres5: mockToken('pres5', 'pres5@test.dev'),   // presidente del equipo 5
  pres6: mockToken('pres6', 'pres6@test.dev'),   // presidente del equipo 6 (ajeno para pres5)
  admin: mockToken('admin1', 'admin1@test.dev'),
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
function toFields(obj){ return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toValue(v)])); }
function headers(auth){
  const h = { 'Content-Type': 'application/json' };
  if (auth) h.Authorization = 'Bearer ' + auth;
  return h;
}
function splitPath(p){ const i = p.lastIndexOf('/'); return [p.slice(0, i), p.slice(i + 1)]; }

// Cada operacion devuelve el status HTTP (200 = permitido, 403 = denegado).
const op = {
  async get(path, auth){ return (await fetch(`${ROOT}/${path}`, { headers: headers(auth) })).status; },
  async create(path, data, auth){
    const [col, id] = splitPath(path);
    const res = await fetch(`${ROOT}/${col}?documentId=${encodeURIComponent(id)}`, {
      method: 'POST', headers: headers(auth), body: JSON.stringify({ fields: toFields(data) }),
    });
    return res.status;
  },
  async update(path, data, auth){
    const mask = Object.keys(data).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
    const res = await fetch(`${ROOT}/${path}?${mask}&currentDocument.exists=true`, {
      method: 'PATCH', headers: headers(auth), body: JSON.stringify({ fields: toFields(data) }),
    });
    return res.status;
  },
  async del(path, auth){ return (await fetch(`${ROOT}/${path}`, { method: 'DELETE', headers: headers(auth) })).status; },
  async list(col, auth){
    const q = { from: [{ collectionId: col }] };
    const res = await fetch(`${ROOT}:runQuery`, { method: 'POST', headers: headers(auth), body: JSON.stringify({ structuredQuery: q }) });
    return res.status;
  },
};

async function seed(){
  await fetch(`http://${HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  const put = async (path, data) => {
    const s = await fetch(`${ROOT}/${path}`, { method: 'PATCH', headers: headers('owner'), body: JSON.stringify({ fields: toFields(data) }) });
    if (!s.ok) throw new Error(`seed ${path}: ${s.status} ${await s.text()}`);
  };
  const base = { email: null, username: null, photoURL: null, timezone: 'America/Santiago', createdAt: '2026-06-01T00:00:00.000Z', lockEdits: false };
  await put('users/pres5',  { ...base, uid: 'pres5',  displayName: 'Presi Cinco', role: 'president', teamId: 5 });
  await put('users/pres6',  { ...base, uid: 'pres6',  displayName: 'Presi Seis',  role: 'president', teamId: 6 });
  await put('users/admin1', { ...base, uid: 'admin1', displayName: 'Admin', role: 'admin', teamId: null });
  await put('teams/5', { name: 'Club Cinco', logo: null });
  await put('teams/6', { name: 'Club Seis', logo: null });
  await put('pedidos_pes5/pm5',  mejora('pres5', 5, { estado: 'pendiente' }));
  await put('pedidos_pes5/pm5b', mejora('pres5', 5, { estado: 'pendiente' }));
  await put('pedidos_pes5/pa5',  mejora('pres5', 5, { estado: 'aplicado' }));
  await put('pedidos_pes5/pm6',  mejora('pres6', 6, { estado: 'pendiente' }));
  await put('pes5_plantillas/5', { teamId: 5, teamName: 'Club Cinco', pes5ClubIdx: 5, jugadores: [], formacion: null });
  await put('pes5_plantillas/6', { teamId: 6, teamName: 'Club Seis', pes5ClubIdx: 6, jugadores: [], formacion: null });
  await put('pes5_bloqueos/5', { por: 'presidente', uid: 'pres5', nombre: 'Presi Cinco', desde: '2026-06-01T00:00:00.000Z', latido: '2026-06-01T00:00:00.000Z' });
  await put('pes5_bloqueos/6', { por: 'presidente', uid: 'pres6', nombre: 'Presi Seis', desde: '2026-06-01T00:00:00.000Z', latido: '2026-06-01T00:00:00.000Z' });
  await put('pes5_config/topes', { valor: 1 });
}

// Pedido de MEJORA: los campos que escribe mejoras-page.js (add de pedidos_pes5).
function mejora(uid, teamId, extra = {}){
  return {
    uid, teamId: String(teamId), teamName: 'Club', pes5Club: 'Club',
    playerId: 'r1', playerName: 'Juan', registro: 1, pes5ClubIdx: teamId,
    cambios: { atributos: { ataque: 70 } }, dorsal: '10', subscriber: false,
    lines: [{ label: 'Ataque', from: '60', to: '70', cost: 100 }],
    totalCost: 100, fromGeneral: 100, fromSub: 0,
    estado: 'pendiente', creadoEn: '2026-06-01T00:00:00.000Z', ...extra,
  };
}
// Pedido de FORMACION: los campos que escribe confirmFormation() en mejoras-page.js.
function formacion(uid, teamId, extra = {}){
  return {
    uid, teamId: String(teamId), teamName: 'Club', pes5Club: 'Club', tipo: 'formacion', pes5ClubIdx: teamId,
    formacion: { nombre: '4-4-2', slots: [{ slot: 0, jugador: 1, prof: 1, lat: null, posNombre: 'PT' }] },
    lines: [{ label: 'Formación', from: '4-3-3', to: '4-4-2' }],
    totalCost: 0, estado: 'pendiente', creadoEn: '2026-06-01T00:00:00.000Z', ...extra,
  };
}

let fallos = 0, total = 0;
async function expect(nombre, esperado, obtenido){
  total++;
  const ok = obtenido === esperado;
  if (!ok) fallos++;
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${nombre} (esperado ${esperado}, obtenido ${obtenido})`);
}

let n = 0;
const nuevoId = (p) => `${p}-${++n}`;

// El emulador carga las reglas al arrancar: si quedo corriendo con reglas viejas, los casos de
// denegacion darian 200. Se suben las reglas del repo antes de correr (la API del emulador las
// reemplaza sin reiniciarlo).
async function cargarReglasDelRepo(){
  const content = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'firebase', 'firestore.rules'), 'utf8');
  const res = await fetch(`http://${HOST}/emulator/v1/projects/${PROJECT}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content }] } }),
  });
  if (res.status !== 200) throw new Error('no se pudieron cargar las reglas en el emulador: ' + res.status);
}

async function main(){
  await cargarReglasDelRepo();
  await seed();

  // ---- pedidos_pes5: create (allowlist + limites) ----
  await expect('pedidos: presidente crea un pedido de mejora de su equipo', 200,
    await op.create(`pedidos_pes5/${nuevoId('ok-mejora')}`, mejora('pres5', 5), AS.pres5));
  await expect('pedidos: presidente crea un pedido de formacion de su equipo', 200,
    await op.create(`pedidos_pes5/${nuevoId('ok-form')}`, formacion('pres5', 5), AS.pres5));
  await expect('pedidos: presidente NO crea un pedido para el equipo ajeno', 403,
    await op.create(`pedidos_pes5/${nuevoId('ajeno')}`, mejora('pres5', 6), AS.pres5));
  await expect('pedidos: presidente NO crea con estado distinto de pendiente', 403,
    await op.create(`pedidos_pes5/${nuevoId('estado')}`, mejora('pres5', 5, { estado: 'aplicado' }), AS.pres5));
  await expect('pedidos: presidente NO crea un pedido de mejora con un campo extra', 403,
    await op.create(`pedidos_pes5/${nuevoId('extra')}`, mejora('pres5', 5, { hack: 'x' }), AS.pres5));
  await expect('pedidos: presidente NO crea un pedido de formacion con un campo extra', 403,
    await op.create(`pedidos_pes5/${nuevoId('extra-f')}`, formacion('pres5', 5, { hack: 'x' }), AS.pres5));
  await expect('pedidos: crea un pedido de mejora de 60 lineas (mejoras con muchas posiciones y habilidades)', 200,
    await op.create(`pedidos_pes5/${nuevoId('lines-60')}`, mejora('pres5', 5, { lines: Array.from({ length: 60 }, (_, i) => ({ label: 'l' + i })) }), AS.pres5));
  await expect('pedidos: NO crea un pedido de mejora con mas de 150 lineas', 403,
    await op.create(`pedidos_pes5/${nuevoId('lines-151')}`, mejora('pres5', 5, { lines: Array.from({ length: 151 }, (_, i) => ({ label: 'l' + i })) }), AS.pres5));
  await expect('pedidos: NO crea un pedido de formacion con mas de 11 slots', 403,
    await op.create(`pedidos_pes5/${nuevoId('slots')}`, formacion('pres5', 5, { formacion: { nombre: '4-4-2', slots: Array.from({ length: 12 }, (_, i) => ({ slot: i })) } }), AS.pres5));
  await expect('pedidos: NO crea un pedido con playerName de mas de 100 caracteres', 403,
    await op.create(`pedidos_pes5/${nuevoId('largo')}`, mejora('pres5', 5, { playerName: 'x'.repeat(101) }), AS.pres5));
  await expect('pedidos: NO crea un pedido con tipo distinto de formacion', 403,
    await op.create(`pedidos_pes5/${nuevoId('tipo')}`, formacion('pres5', 5, { tipo: 'otro' }), AS.pres5));
  await expect('pedidos: anonimo no crea pedidos', 403,
    await op.create(`pedidos_pes5/${nuevoId('anon')}`, mejora('pres5', 5), AS.anon));

  // ---- pedidos_pes5: lectura y cancelacion ----
  await expect('pedidos: presidente lee su pedido', 200, await op.get('pedidos_pes5/pm5', AS.pres5));
  await expect('pedidos: presidente NO lee un pedido ajeno', 403, await op.get('pedidos_pes5/pm6', AS.pres5));
  await expect('pedidos: presidente NO lista la coleccion sin filtro', 403, await op.list('pedidos_pes5', AS.pres5));
  await expect('pedidos: admin lee pedidos ajenos', 200, await op.get('pedidos_pes5/pm6', AS.admin));
  await expect('pedidos: presidente NO cambia un campo de su pendiente (totalCost)', 403,
    await op.update('pedidos_pes5/pm5b', { totalCost: 1 }, AS.pres5));
  await expect('pedidos: presidente cancela su pedido pendiente', 200,
    await op.update('pedidos_pes5/pm5', { estado: 'cancelado', canceladoEn: '2026-06-02T00:00:00.000Z' }, AS.pres5));
  await expect('pedidos: presidente NO cancela su pedido ya aplicado', 403,
    await op.update('pedidos_pes5/pa5', { estado: 'cancelado', canceladoEn: '2026-06-02T00:00:00.000Z' }, AS.pres5));
  await expect('pedidos: presidente NO cancela el pedido ajeno', 403,
    await op.update('pedidos_pes5/pm6', { estado: 'cancelado', canceladoEn: '2026-06-02T00:00:00.000Z' }, AS.pres5));

  // ---- pes5_plantillas: solo el admin escribe; cada presidente lee la de su equipo ----
  await expect('plantillas: presidente lee la plantilla de su equipo', 200, await op.get('pes5_plantillas/5', AS.pres5));
  await expect('plantillas: presidente NO lee la plantilla ajena', 403, await op.get('pes5_plantillas/6', AS.pres5));
  await expect('plantillas: presidente NO escribe plantillas', 403,
    await op.update('pes5_plantillas/5', { jugadores: [] }, AS.pres5));

  // ---- pes5_config: solo el admin escribe ----
  await expect('config: presidente lee pes5_config', 200, await op.get('pes5_config/topes', AS.pres5));
  await expect('config: presidente NO escribe pes5_config', 403,
    await op.update('pes5_config/topes', { valor: 2 }, AS.pres5));
  await expect('config: admin escribe pes5_config', 200,
    await op.update('pes5_config/topes', { valor: 2 }, AS.admin));

  // ---- pes5_bloqueos: el bloqueo propio si, el ajeno no; allowlist de campos ----
  const bloqueo = (uid, nombre) => ({ por: 'presidente', uid, nombre, desde: '2026-06-01T00:00:00.000Z', latido: '2026-06-02T00:00:00.000Z' });
  await expect('bloqueo: presidente renueva su bloqueo con los campos permitidos', 200,
    await op.update('pes5_bloqueos/5', bloqueo('pres5', 'Presi Cinco'), AS.pres5));
  await expect('bloqueo: presidente NO agrega un campo extra a su bloqueo', 403,
    await op.update('pes5_bloqueos/5', { ...bloqueo('pres5', 'Presi Cinco'), hack: 'x' }, AS.pres5));
  await expect('bloqueo: presidente NO toma el bloqueo del equipo ajeno', 403,
    await op.update('pes5_bloqueos/6', bloqueo('pres5', 'Presi Cinco'), AS.pres5));
  await expect('bloqueo: anonimo no lee bloqueos', 403, await op.get('pes5_bloqueos/5', AS.anon));
  await expect('bloqueo: presidente libera su bloqueo', 200, await op.del('pes5_bloqueos/5', AS.pres5));

  console.log(`\nrules-pes5: ${total - fallos}/${total} casos OK`);
  if (fallos) { console.log(`${fallos} FALLO(S)`); process.exit(1); }
}

main().catch(e => { console.error('ERROR:', e.stack || e); process.exit(1); });
