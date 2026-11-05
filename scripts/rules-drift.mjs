// Solo lectura (slice 3.4, H-07). Compara las reglas publicadas en
// Firebase (Firestore y Storage) con las del repo. Usa la sesión del CLI
// (`firebase login`): el access token que firebase-tools guarda en su
// configstore. Corre antes cualquier comando del CLI (p. ej.
// `firebase projects:list`) para que el token esté fresco.
//
// Uso: node scripts/rules-drift.mjs [--save=dir]
//   Sale con código 1 si alguna difiere. --save escribe las versiones
//   publicadas en <dir> para revisarlas con diff.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT = 'tsc-web-yuna';
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const saveArg = process.argv.find(a => a.startsWith('--save='));
const cfg = JSON.parse(readFileSync(join(homedir(), '.config', 'configstore', 'firebase-tools.json'), 'utf8'));
const token = cfg.tokens?.access_token;
if (!token || (cfg.tokens.expires_at && cfg.tokens.expires_at < Date.now())) {
  console.error('[rules-drift] Sin token vigente: corre `firebase projects:list` y reintenta.');
  process.exit(2);
}
const api = async path => {
  const res = await fetch(`https://firebaserules.googleapis.com/v1/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
};
const norm = s => s.replace(/\r\n/g, '\n').trim();

const { releases = [] } = await api(`projects/${PROJECT}/releases`);
const TARGETS = [
  { label: 'Firestore', match: r => r.name.endsWith('/releases/cloud.firestore'), file: 'firebase/firestore.rules' },
  { label: 'Storage', match: r => r.name.includes('/releases/firebase.storage/'), file: 'firebase/storage.rules' },
];
let drift = 0;
for (const t of TARGETS) {
  const rel = releases.find(t.match);
  if (!rel) { console.log(`${t.label}: sin release publicado`); drift++; continue; }
  const rs = await api(rel.rulesetName);
  const live = rs.source.files.map(f => f.content).join('\n');
  const repo = readFileSync(join(ROOT, t.file), 'utf8');
  const same = norm(live) === norm(repo);
  if (!same) drift++;
  console.log(`${t.label}: ${same ? 'IGUAL al repo' : 'DIFIERE del repo'} · publicado ${rel.updateTime} (${rel.rulesetName.split('/').pop()})`);
  if (saveArg) {
    const dir = saveArg.split('=')[1];
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, t.file.split('/').pop() + '.live'), live);
  }
}
process.exit(drift ? 1 : 0);
