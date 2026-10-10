// Solo desarrollo (no se publica). Carga un backup de exportFullDB en el
// emulador de Firestore y crea el admin y el presidente de prueba en el
// emulador de Auth. Habla solo con localhost: nunca con producción.
//
// Uso (con los emuladores arriba: `node scripts/emu-start.mjs`):
//   node scripts/emu-seed.mjs [backup.json] [--clean] [--president-team=<id>]
// Sin backup, solo crea los usuarios. --clean borra antes los datos del
// emulador. El presidente queda a cargo de --president-team, del teamId de
// las credenciales o, si no hay ninguno, del primer equipo del backup.
// Credenciales: scripts/emu-credentials.json (local, ignorado) o, si no
// existe, scripts/emu-credentials.example.json.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PROJECT = 'tsc-web-yuna';
// 127.0.0.1 y no localhost: Node resuelve localhost a ::1 y el emulador escucha en IPv4.
const FS = 'http://127.0.0.1:8080';
const AUTH = 'http://127.0.0.1:9099';
const DOCS = `${FS}/v1/projects/${PROJECT}/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const JSON_HDR = { 'Content-Type': 'application/json' };

const dir = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const clean = args.includes('--clean');
const teamArg = args.find(a => a.startsWith('--president-team='));
const backupPath = args.find(a => !a.startsWith('--'));

function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  return { mapValue: { fields: toFields(v) } };
}
const toFields = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [k, toValue(v)]));

async function check(res, what) {
  if (!res.ok) throw new Error(`${what}: ${res.status} ${await res.text()}`);
  return res;
}
async function commit(writes) {
  for (let i = 0; i < writes.length; i += 400) {
    const body = JSON.stringify({ writes: writes.slice(i, i + 400) });
    await check(await fetch(`${DOCS}:commit`, { method: 'POST', headers: OWNER, body }), 'commit');
  }
}
const docName = (col, id) => `projects/${PROJECT}/databases/(default)/documents/${col}/${id}`;
const setDoc = (col, id, data) => ({ update: { name: docName(col, id), fields: toFields(data) } });

// Cualquier respuesta HTTP cuenta como "arriba"; solo un error de red no.
async function reachable(url) {
  try { await fetch(url); return true; } catch { return false; }
}
if (!(await reachable(FS)) || !(await reachable(AUTH))) {
  console.error('Emuladores no disponibles en 127.0.0.1:8080 / :9099. Corre antes: node scripts/emu-start.mjs');
  process.exit(1);
}

if (clean) {
  await check(await fetch(`${FS}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' }), 'limpiar Firestore');
  await check(await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' }), 'limpiar Auth');
  console.log('Emuladores limpiados.');
}

let firstTeamId = null;
if (backupPath) {
  const data = JSON.parse(readFileSync(backupPath, 'utf8'));
  const stores = data.stores ?? data;
  const writes = [];
  for (const [store, rows] of Object.entries(stores)) {
    if (!Array.isArray(rows)) continue;
    let max = 0, loaded = 0;
    for (const row of rows) {
      if (!Number.isSafeInteger(row?.id) || row.id < 1) continue;
      max = Math.max(max, row.id);
      writes.push(setDoc(store, row.id, row));
      loaded++;
    }
    if (store === 'teams' && loaded) firstTeamId = Math.min(...rows.filter(r => Number.isSafeInteger(r?.id) && r.id >= 1).map(r => r.id));
    writes.push(setDoc('_counters', store, { value: max }));
    const skipped = rows.length - loaded;
    console.log(`  ${store}: ${loaded}${skipped ? ` (${skipped} sin id entero, omitidos)` : ''}`);
  }
  await commit(writes);
  console.log(`Backup cargado (${writes.length} escrituras).`);
}

const credPath = ['emu-credentials.json', 'emu-credentials.example.json'].map(f => path.join(dir, f)).find(existsSync);
const creds = JSON.parse(readFileSync(credPath, 'utf8'));

async function ensureUser(c) {
  const signUp = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emu`, {
    method: 'POST', headers: JSON_HDR,
    body: JSON.stringify({ email: c.email, password: c.password, displayName: c.displayName, returnSecureToken: false }),
  });
  const j = await signUp.json();
  if (j.localId) return j.localId;
  if (j.error?.message !== 'EMAIL_EXISTS') throw new Error(`alta ${c.email}: ${JSON.stringify(j)}`);
  const signIn = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emu`, {
    method: 'POST', headers: JSON_HDR,
    body: JSON.stringify({ email: c.email, password: c.password, returnSecureToken: true }),
  });
  const k = await signIn.json();
  if (!k.localId) throw new Error(`login ${c.email}: ${JSON.stringify(k)}`);
  return k.localId;
}

for (const role of ['admin', 'president']) {
  const c = creds[role];
  const uid = await ensureUser(c);
  let teamId = null;
  if (role === 'president') {
    teamId = teamArg ? Number(teamArg.split('=')[1]) : (c.teamId ?? firstTeamId);
  }
  // Mismos campos que crea _loadProfile (tsc-src/js/auth.js). lockEdits en
  // false a propósito: un registro real nace bloqueado, pero acá se quiere
  // poder probar la edición del presidente sin pasar antes por el admin.
  await commit([setDoc('users', uid, {
    uid, email: c.email, displayName: c.displayName, username: role,
    photoURL: null, timezone: null,
    role, teamId, lockEdits: c.lockEdits ?? false,
    createdAt: new Date().toISOString(),
  })]);
  console.log(`Usuario ${role}: ${c.email} (uid ${uid}${role === 'president' ? `, equipo ${teamId ?? 'ninguno'}` : ''})`);
}
console.log(`Credenciales en ${path.relative(process.cwd(), credPath)}`);
