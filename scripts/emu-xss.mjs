// Solo sandbox (MS-3.1). Prueba dinámica de sinks: todo campo que escribe
// un rol no admin llega a la base con un marcador que se delata si se
// inserta sin escapar (ver scripts/emu-xss.js).
//
//   node scripts/emu-xss.mjs data   → sandbox/backup-xss.json
//       Nombre de cada equipo = nombre real + marcador. El reemplazo es por
//       valor exacto en todas las colecciones (matchHistory, palmarés,
//       sorteo…), así que las búsquedas por nombre siguen funcionando.
//       Logos = URL de Cloudinary con una comilla inyectada.
//   node scripts/emu-seed.mjs sandbox/backup-xss.json --clean
//   node scripts/emu-xss.mjs users  → marcador en displayName, username y
//       photoURL de los usuarios del emulador, más un usuario extra.
//   node scripts/emu-xss.mjs page   → copia a sandbox/site el código actual
//       de tsc-src (como emu-dist.mjs) y arma sandbox/site/xss.html con el
//       detector (y sandbox/dist/xss.html si existe la variante dist).
//
// Luego abrir localhost:3001/xss.html, recorrer páginas y modales, y leer
// window.__XSS__.report(). Solo habla con 127.0.0.1.
import { readFileSync, writeFileSync, copyFileSync, existsSync, cpSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isExcluded } from './build-exclude.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SANDBOX = join(ROOT, 'sandbox');
const MARK = `<zq-t></zq-t>"zq-a=1 '-zqx()-' zq-b=1 ZQ`;
const LOGO_MARK = '" zq-l="1';
const cmd = process.argv[2];

if (cmd === 'data') {
  const src = join(SANDBOX, 'backup.json');
  if (!existsSync(src)) { console.error('[emu-xss] Falta sandbox/backup.json (emu-snapshot.mjs)'); process.exit(1); }
  const backup = JSON.parse(readFileSync(src, 'utf8'));
  const map = new Map();
  for (const t of backup.stores.teams) {
    if (typeof t.name === 'string' && t.name) map.set(t.name, t.name + MARK);
    if (typeof t.historyNames === 'string' && t.historyNames && !map.has(t.historyNames)) map.set(t.historyNames, t.historyNames + MARK);
    for (const p of t.previousNames || []) if (typeof p === 'string' && p && !map.has(p)) map.set(p, p + MARK);
  }
  let hits = 0;
  const walk = v => {
    if (typeof v === 'string') { if (map.has(v)) { hits++; return map.get(v); } return v; }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  const out = { ...backup, stores: walk(backup.stores) };
  for (const t of out.stores.teams) if (t.logo) t.logo += LOGO_MARK;
  writeFileSync(join(SANDBOX, 'backup-xss.json'), JSON.stringify(out));
  console.log(`[emu-xss] sandbox/backup-xss.json: ${map.size} nombres marcados, ${hits} reemplazos`);
} else if (cmd === 'users') {
  const PROJECT = 'tsc-web-yuna';
  const DOCS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
  const H = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
  const res = await fetch(`${DOCS}/users?pageSize=100`, { headers: H });
  const docs = (await res.json()).documents || [];
  const str = s => ({ stringValue: s });
  const fields = who => ({
    displayName: str(who + MARK),
    username: str(who.toLowerCase() + MARK),
    photoURL: str('https://res.cloudinary.com/dnjijd8mx/image/upload/zq.png' + LOGO_MARK),
  });
  const mask = 'updateMask.fieldPaths=displayName&updateMask.fieldPaths=username&updateMask.fieldPaths=photoURL';
  for (const d of docs) {
    const r = await fetch(`http://127.0.0.1:8080/v1/${d.name}?${mask}`,
      { method: 'PATCH', headers: H, body: JSON.stringify({ fields: fields(d.fields?.role?.stringValue || 'user') }) });
    if (!r.ok) throw new Error(`users: ${r.status} ${await r.text()}`);
  }
  const extra = await fetch(`${DOCS}/users/zq-extra-user`, {
    method: 'PATCH', headers: H,
    body: JSON.stringify({ fields: { ...fields('Extra'), uid: str('zq-extra-user' + MARK), email: str('extra@emu.test'), role: str('president'), teamId: { nullValue: null }, lockEdits: { booleanValue: true }, createdAt: str(new Date().toISOString()) } }),
  });
  if (!extra.ok) throw new Error(`extra: ${extra.status} ${await extra.text()}`);
  console.log(`[emu-xss] marcador en ${docs.length} usuarios + 1 extra`);
} else if (cmd === 'page') {
  const SITE = join(SANDBOX, 'site');
  if (!existsSync(SITE)) { console.error('[emu-xss] Falta sandbox/site (emu-snapshot.mjs)'); process.exit(1); }
  for (const name of ['index.html', 'manifest.webmanifest', 'css', 'js', 'data']) {
    const from = join(ROOT, 'tsc-src', name);
    if (!existsSync(from)) continue;
    rmSync(join(SITE, name), { recursive: true, force: true });
    cpSync(from, join(SITE, name), { recursive: true, filter: src => !isExcluded(src) });
  }
  for (const dir of ['site', 'dist']) {
    const base = join(SANDBOX, dir);
    if (!existsSync(join(base, 'index.html'))) continue;
    copyFileSync(join(ROOT, 'scripts', 'emu-xss.js'), join(base, '_xss.js'));
    const html = readFileSync(join(base, 'index.html'), 'utf8');
    writeFileSync(join(base, 'xss.html'), html.replace(/<head>/i, '<head>\n<script src="_xss.js"></script>'));
    console.log(`[emu-xss] sandbox/${dir}/xss.html listo`);
  }
} else {
  console.error('Uso: node scripts/emu-xss.mjs data|users|page');
  process.exit(1);
}
