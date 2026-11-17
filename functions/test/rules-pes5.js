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
  // ORD-3: campo opcional `banca` (orden de los slots 11 en adelante, registros enteros, <= 32)
  await expect('ORD-3 · formacion con banca valida (lista de 12) se crea', 200,
    await op.create(`pedidos_pes5/${nuevoId('banca-ok')}`, formacion('pres5', 5, { banca: Array.from({ length: 12 }, (_, i) => 101 + i) }), AS.pres5));
  await expect('ORD-3 · formacion con banca de 32 elementos se crea (limite)', 200,
    await op.create(`pedidos_pes5/${nuevoId('banca-32')}`, formacion('pres5', 5, { banca: Array.from({ length: 32 }, (_, i) => 101 + i) }), AS.pres5));
  await expect('ORD-3 · formacion con banca vacia se crea', 200,
    await op.create(`pedidos_pes5/${nuevoId('banca-vacia')}`, formacion('pres5', 5, { banca: [] }), AS.pres5));
  await expect('ORD-3 · NO crea formacion con banca de 33 elementos', 403,
    await op.create(`pedidos_pes5/${nuevoId('banca-33')}`, formacion('pres5', 5, { banca: Array.from({ length: 33 }, (_, i) => 101 + i) }), AS.pres5));
  await expect('ORD-3 · NO crea formacion con banca que no es lista (texto)', 403,
    await op.create(`pedidos_pes5/${nuevoId('banca-texto')}`, formacion('pres5', 5, { banca: 'r101,r102' }), AS.pres5));
  await expect('ORD-3 · NO crea formacion con banca que no es lista (objeto)', 403,
    await op.create(`pedidos_pes5/${nuevoId('banca-mapa')}`, formacion('pres5', 5, { banca: { a: 1 } }), AS.pres5));
  await expect('ORD-3 · formacion sin banca sigue creandose (compatibilidad)', 200,
    await op.create(`pedidos_pes5/${nuevoId('sin-banca')}`, formacion('pres5', 5), AS.pres5));
  await expect('ORD-3 · la banca no abre campos nuevos: formacion con banca y campo extra, 403', 403,
    await op.create(`pedidos_pes5/${nuevoId('banca-extra')}`, formacion('pres5', 5, { banca: [101], hack: 'x' }), AS.pres5));
  await expect('ORD-3 · mejora con campo banca NO se crea (la banca es solo de formacion)', 403,
    await op.create(`pedidos_pes5/${nuevoId('mejora-banca')}`, mejora('pres5', 5, { banca: [101] }), AS.pres5));
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

  // ---- EMP-80-1 · pedidos «emparejar» (costo 0), perfiles definidos en pes5_config/reglas.emparejar ----
  // Pedido que escribe solicitarEmparejar() en mejoras-page.js.
  const emparejar = (uid, teamId, extra = {}) => ({
    uid, teamId: String(teamId), teamName: 'Club', pes5Club: 'Club', tipo: 'emparejar', pes5ClubIdx: teamId,
    playerId: 'r1', playerName: 'Juan', registro: 1, dorsal: null, subscriber: false, perfil: 'base', nivel: 80,
    cambios: { atributos: { Ataque: 80, Salto: 80 } },
    lines: [{ label: 'Ataque', from: 79, to: 80 }, { label: 'Salto', from: 40, to: 80 }],
    totalCost: 0, fromGeneral: 0, fromSub: 0, estado: 'pendiente', creadoEn: '2026-06-01T00:00:00.000Z', ...extra,
  });
  // Sin doc pes5_config/reglas, nadie puede emparejar (el tope de cada perfil es 0).
  await expect('emparejar: sin reglas en el servidor, presidente NO pide emparejar (cierra por defecto)', 403,
    await op.create(`pedidos_pes5/${nuevoId('emp-sin-reglas')}`, emparejar('pres5', 5), AS.pres5));
  // El admin guarda los perfiles de Luis: Base 79-80 y Suscriptor 84-85.
  await expect('emparejar: admin guarda el bloque emparejar (Base 79-80, Suscriptor 84-85)', 200,
    await op.create('pes5_config/reglas', { maxPositions: 5, emparejar: {
      base: { min: 79, max: 80, subir: true, lesion: 'C', escala8: 4 }, suscriptor: { min: 84, max: 85, subir: true, lesion: 'B', escala8: 4 } } }, AS.admin));
  await expect('emparejar: presidente pide Base a 80 (costo 0) de su equipo', 200,
    await op.create(`pedidos_pes5/${nuevoId('emp-ok')}`, emparejar('pres5', 5), AS.pres5));
  await expect('emparejar: presidente pide Suscriptor a 85 (costo 0)', 200,
    await op.create(`pedidos_pes5/${nuevoId('emp-susc')}`, emparejar('pres5', 5, { perfil: 'suscriptor', nivel: 85, cambios: { atributos: { Ataque: 85 } }, lines: [{ label: 'Ataque', from: 84, to: 85 }] }), AS.pres5));
  await expect('emparejar: NO pide Base por encima de su máximo (81 > 80)', 403,
    await op.create(`pedidos_pes5/${nuevoId('emp-81')}`, emparejar('pres5', 5, { nivel: 81 }), AS.pres5));
  await expect('emparejar: NO pide Base por debajo de su máximo (79 < 80): el nivel es exactamente el máximo', 403,
    await op.create(`pedidos_pes5/${nuevoId('emp-79')}`, emparejar('pres5', 5, { nivel: 79 }), AS.pres5));
  await expect('emparejar: NO pide Suscriptor a 86 (> 85)', 403,
    await op.create(`pedidos_pes5/${nuevoId('emp-86')}`, emparejar('pres5', 5, { perfil: 'suscriptor', nivel: 86 }), AS.pres5));
  await expect('emparejar: NO pide con un perfil que no existe', 403,
    await op.create(`pedidos_pes5/${nuevoId('emp-perfil')}`, emparejar('pres5', 5, { perfil: 'leyenda' }), AS.pres5));
  await expect('emparejar: NO pide a nivel 80 con el perfil Suscriptor (80 no es su máximo)', 403,
    await op.create(`pedidos_pes5/${nuevoId('emp-susc-80')}`, emparejar('pres5', 5, { perfil: 'suscriptor', nivel: 80 }), AS.pres5));
  await expect('emparejar: NO pide con costo distinto de 0', 403,
    await op.create(`pedidos_pes5/${nuevoId('emp-costo')}`, emparejar('pres5', 5, { totalCost: 10 }), AS.pres5));
  await expect('emparejar: NO descuenta saldo (fromGeneral distinto de 0)', 403,
    await op.create(`pedidos_pes5/${nuevoId('emp-gen')}`, emparejar('pres5', 5, { fromGeneral: 5 }), AS.pres5));
  await expect('emparejar: NO pide para el equipo ajeno', 403,
    await op.create(`pedidos_pes5/${nuevoId('emp-ajeno')}`, emparejar('pres5', 6), AS.pres5));
  await expect('emparejar: NO toca escala 1-8 (cambios con mas de atributos)', 403,
    await op.create(`pedidos_pes5/${nuevoId('emp-escala')}`, emparejar('pres5', 5, { cambios: { atributos: { Ataque: 80 }, escala8: { 'Estabilidad': 5 } } }), AS.pres5));
  await expect('emparejar: NO agrega campos extra al pedido', 403,
    await op.create(`pedidos_pes5/${nuevoId('emp-extra')}`, emparejar('pres5', 5, { hack: 'x' }), AS.pres5));
  await expect('emparejar: NO se crea con nivel que no es entero', 403,
    await op.create(`pedidos_pes5/${nuevoId('emp-sin-nivel')}`, emparejar('pres5', 5, { nivel: 'ochenta' }), AS.pres5));
  // Luis quita el perfil Suscriptor: ya no se puede pedir a 85.
  await expect('emparejar: Luis vacía el perfil Suscriptor (bloque con maximo null)', 200,
    await op.update('pes5_config/reglas', { emparejar: {
      base: { min: 79, max: 80, subir: true, lesion: 'C', escala8: 4 }, suscriptor: { min: null, max: null, subir: false, lesion: null, escala8: null } } }, AS.admin));
  await expect('emparejar: con Suscriptor vacío, NO se pide a 85', 403,
    await op.create(`pedidos_pes5/${nuevoId('emp-susc-vacio')}`, emparejar('pres5', 5, { perfil: 'suscriptor', nivel: 85 }), AS.pres5));
  await expect('emparejar: presidente NO guarda reglas', 403,
    await op.update('pes5_config/reglas', { emparejar: null }, AS.pres5));
  await op.del('pes5_config/reglas', AS.admin);

  // ---- EMP-80-1 · pes5_mejoras: registro sin costo que escribe el admin ----
  const registroEmp = (teamId, extra = {}) => ({
    tipo: 'emparejar', sinCosto: true, nivel: 80, teamId: String(teamId), teamName: 'Club',
    playerId: 1, playerName: 'Juan', lineas: [{ campo: 'Ataque', de: 79, a: 80 }],
    totalCost: 0, season: 1, por: 'admin1@test.dev', uid: 'admin1', creadoEn: '2026-06-01T00:00:00.000Z', ...extra,
  });
  await expect('registro emparejar: admin escribe el registro de su equipo', 200,
    await op.create('pes5_mejoras/reg-5-1', registroEmp(5), AS.admin));
  await expect('registro emparejar: presidente NO escribe el registro', 403,
    await op.create(`pes5_mejoras/${nuevoId('reg-pres')}`, registroEmp(5), AS.pres5));
  await expect('registro emparejar: NO se escribe con costo distinto de 0', 403,
    await op.create(`pes5_mejoras/${nuevoId('reg-costo')}`, registroEmp(5, { totalCost: 1 }), AS.admin));
  await expect('registro emparejar: NO se escribe sin sinCosto true', 403,
    await op.create(`pes5_mejoras/${nuevoId('reg-sincosto')}`, registroEmp(5, { sinCosto: false }), AS.admin));
  await expect('registro emparejar: NO se escribe con un campo extra', 403,
    await op.create(`pes5_mejoras/${nuevoId('reg-extra')}`, registroEmp(5, { hack: 'x' }), AS.admin));
  await expect('registro emparejar: presidente lee el registro de su equipo', 200,
    await op.get('pes5_mejoras/reg-5-1', AS.pres5));
  await expect('registro emparejar: presidente NO lee el registro de otro equipo', 403,
    await op.get('pes5_mejoras/reg-5-1', AS.pres6));
  await expect('registro emparejar: no se edita ni se borra desde la app (admin)', 403,
    await op.update('pes5_mejoras/reg-5-1', { nivel: 90 }, AS.admin));
  await expect('registro emparejar: anonimo no lee', 403, await op.get('pes5_mejoras/reg-5-1', AS.anon));

  // ---- pes5_plantillas: solo el admin escribe; cada presidente lee la de su equipo ----
  await expect('plantillas: presidente lee la plantilla de su equipo', 200, await op.get('pes5_plantillas/5', AS.pres5));
  await expect('plantillas: presidente NO lee la plantilla ajena', 403, await op.get('pes5_plantillas/6', AS.pres5));
  await expect('plantillas: presidente NO escribe plantillas', 403,
    await op.update('pes5_plantillas/5', { jugadores: [] }, AS.pres5));

  // ---- EMP-80-2 · pes5_perfiles: perfiles fijados por temporada y equipo ----
  const perfilesDoc = (teamId, perfiles, extra = {}) => Object.assign({ season: 2, teamId: String(teamId), perfiles }, extra);
  await expect('perfiles: admin fija los perfiles del equipo 5 (temporada 2)', 200,
    await op.create('pes5_perfiles/2_5', perfilesDoc(5, { '101': 'base', '102': 'suscriptor', '103': 'ninguno' }), AS.admin));
  await expect('perfiles: presidente lee los perfiles de su equipo', 200, await op.get('pes5_perfiles/2_5', AS.pres5));
  await expect('perfiles: presidente NO lee los perfiles de otro equipo', 403, await op.get('pes5_perfiles/2_6', AS.pres5));
  await expect('perfiles: presidente NO escribe perfiles', 403,
    await op.update('pes5_perfiles/2_5', perfilesDoc(5, { '101': 'suscriptor' }), AS.pres5));
  await expect('perfiles: admin NO guarda un perfil fuera de base/suscriptor/ninguno', 403,
    await op.update('pes5_perfiles/2_5', perfilesDoc(5, { '101': 'leyenda' }), AS.admin));
  await expect('perfiles: admin NO agrega campos extra al documento', 403,
    await op.update('pes5_perfiles/2_5', perfilesDoc(5, { '101': 'base' }, { hack: 'x' }), AS.admin));
  await expect('perfiles: admin NO guarda la temporada como texto', 403,
    await op.update('pes5_perfiles/2_5', { season: '2', teamId: '5', perfiles: { '101': 'base' } }, AS.admin));
  await expect('perfiles: anonimo no lee', 403, await op.get('pes5_perfiles/2_5', AS.anon));
  await expect('perfiles: nadie borra (admin)', 403, await op.del('pes5_perfiles/2_5', AS.admin));

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
  // BLOQ-1: el admin toma el control de un bloqueo vivo de presidente (sobrescribe); el presidente no pisa el del admin
  await expect('bloqueo: presidente crea su bloqueo', 200, await op.create('pes5_bloqueos/5', bloqueo('pres5', 'Presi Cinco'), AS.pres5));
  await expect('bloqueo: admin toma el control del bloqueo del presidente (sobrescribe)', 200,
    await op.update('pes5_bloqueos/5', { por: 'admin', uid: 'admin1', nombre: 'Luis', desde: '2026-06-03T00:00:00.000Z', latido: '2026-06-03T00:00:00.000Z' }, AS.admin));
  await expect('bloqueo: admin libera el bloqueo que tomó', 200, await op.del('pes5_bloqueos/5', AS.admin));

  // ---- PAUSA-1 · pes5_config/pausa: pausa de mejoras mientras Luis edita el save ----
  // Sin documento de pausa: no esta pausado (el create de pedidos sigue igual).
  await expect('pausa: sin documento, el presidente crea su pedido de mejora', 200,
    await op.create(`pedidos_pes5/${nuevoId('sin-pausa')}`, mejora('pres5', 5), AS.pres5));
  await expect('pausa: presidente NO escribe la pausa (crear)', 403,
    await op.create('pes5_config/pausa', { pausado: true, por: 'pres5', desde: '2026-06-03T00:00:00.000Z' }, AS.pres5));
  // Un admin que preside un equipo, para el caso «el admin no queda bloqueado por la pausa».
  await fetch(`${ROOT}/users/admin5`, { method: 'PATCH', headers: headers('owner'), body: JSON.stringify({ fields: toFields({
    uid: 'admin5', displayName: 'Admin Cinco', role: 'admin', teamId: 5, email: null, username: null, photoURL: null,
    timezone: 'America/Santiago', createdAt: '2026-06-01T00:00:00.000Z', lockEdits: false }) }) });
  AS.admin5 = mockToken('admin5', 'admin5@test.dev');
  await expect('pausa: admin escribe la pausa (crear, pausado true)', 200,
    await op.create('pes5_config/pausa', { pausado: true, por: 'admin1', desde: '2026-06-03T00:00:00.000Z' }, AS.admin));
  await expect('pausa: con pausa, el presidente NO crea pedido de mejora', 403,
    await op.create(`pedidos_pes5/${nuevoId('pausado-mejora')}`, mejora('pres5', 5), AS.pres5));
  await expect('pausa: con pausa, el presidente NO crea pedido de formacion', 403,
    await op.create(`pedidos_pes5/${nuevoId('pausado-form')}`, formacion('pres5', 5), AS.pres5));
  await expect('pausa: con pausa, el admin que preside su equipo SI crea pedido', 200,
    await op.create(`pedidos_pes5/${nuevoId('admin-pausa')}`, mejora('admin5', 5), AS.admin5));
  await expect('pausa: un usuario autenticado lee la pausa', 200, await op.get('pes5_config/pausa', AS.pres5));
  await expect('pausa: anonimo no lee la pausa', 403, await op.get('pes5_config/pausa', AS.anon));
  await expect('pausa: presidente NO la modifica (update)', 403,
    await op.update('pes5_config/pausa', { pausado: false }, AS.pres5));
  await expect('pausa: presidente NO la borra', 403, await op.del('pes5_config/pausa', AS.pres5));
  await expect('pausa: admin reanuda (pausado false)', 200,
    await op.update('pes5_config/pausa', { pausado: false }, AS.admin));
  await expect('pausa: reanudada, el presidente vuelve a crear pedido de mejora', 200,
    await op.create(`pedidos_pes5/${nuevoId('reanudada')}`, mejora('pres5', 5), AS.pres5));

  console.log(`\nrules-pes5: ${total - fallos}/${total} casos OK`);
  if (fallos) { console.log(`${fallos} FALLO(S)`); process.exit(1); }
}

main().catch(e => { console.error('ERROR:', e.stack || e); process.exit(1); });
