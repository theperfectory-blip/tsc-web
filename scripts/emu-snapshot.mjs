// Solo desarrollo (no se publica). Arma la copia del sandbox (MS-2.1) en
// sandbox/ (ignorado por git):
//   sandbox/site/         copia de tsc-src con solo 2 de las 11 copas 3D
//   sandbox/backup.json   copia real de la base, mismo formato que exportFullDB
// La base se LEE de producción con la API REST pública (solo GET, sin sesión:
// todas las colecciones de STORES son de lectura pública en las reglas).
// No escribe nada en producción. `users` no se copia: el sandbox usa los
// usuarios de prueba de emu-seed.mjs.
// Imágenes: las de la web (logos, etc.) quedan con su URL tal cual. De las
// galerías de la vitrina del palmarés se conserva 1 de cada 5 (20 %).
//
// Uso: node scripts/emu-snapshot.mjs
// Después: node scripts/emu-start.mjs  y  node scripts/emu-seed.mjs sandbox/backup.json --clean
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isExcluded } from './build-exclude.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, 'tsc-src');
const OUT = join(ROOT, 'sandbox');
const SITE = join(OUT, 'site');
const INCLUDE = ['index.html', 'manifest.webmanifest', 'css', 'js', 'assets', 'data'];

// Mismo proyecto y API key pública que tsc-src/js/firebase-config.js.
const PROJECT = 'tsc-web-yuna';
const API_KEY = 'AIzaSyDmKBTE3EJ6tlgqC7fesoY7DUHnpNRQj9k';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
// Igual que STORES en tsc-src/js/state.js.
const STORES = ['seasons','teams','competitions','phases','matches','coins','history','settings','matchHistory','sorteo','sorteoEvents','palmares','palmares-comps','calDayLabels'];
// Igual que TROPHY_GLB_MAP en tsc-src/js/palmares.js.
const TROPHY_GLB_MAP = {
  classica: 'copa_1.glb', imperial: 'copa_2.glb', konami: 'copa_3.glb', orejona: 'copa_4.glb',
  sobria: 'copa_5.glb', moderno: 'copa_6.glb', celtica: 'copa_7.glb', barroca: 'copa_8.glb',
  geometrica: 'copa_9.glb', minimalista: 'copa_10.glb', nebula: 'copa_11.glb',
};
const KEEP_CUPS = 2;
const GALLERY_KEEP_EVERY = 5;

let timestamps = 0;
function fromValue(v) {
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) { timestamps++; return v.timestampValue; }
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
  throw new Error(`tipo de valor no soportado: ${Object.keys(v)}`);
}
const fromFields = f => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, fromValue(v)]));

async function readCollection(col) {
  const rows = [];
  let pageToken = '';
  do {
    const url = `${BASE}/${encodeURIComponent(col)}?pageSize=300&key=${API_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${col}: ${res.status} ${await res.text()}`);
    const j = await res.json();
    for (const d of j.documents || []) {
      const row = fromFields(d.fields || {});
      const docId = d.name.split('/').pop();
      if (row.id === undefined && /^\d+$/.test(docId)) row.id = Number(docId);
      rows.push(row);
    }
    pageToken = j.nextPageToken ? encodeURIComponent(j.nextPageToken) : '';
  } while (pageToken);
  return rows;
}

// ---- 1. Base de datos (solo lectura) ----
const stores = {};
for (const col of STORES) {
  stores[col] = await readCollection(col);
  console.log(`  ${col}: ${stores[col].length}`);
}

// ---- 2. Galerías de la vitrina: 1 de cada 5 fotos ----
let galBefore = 0, galAfter = 0;
for (const rec of stores.palmares) {
  if (!Array.isArray(rec.gallery)) continue;
  const kept = rec.gallery.filter(() => (galBefore++ % GALLERY_KEEP_EVERY) === 0);
  galAfter += kept.length;
  rec.gallery = kept;
}
console.log(`Galerías de la vitrina: ${galAfter} de ${galBefore} fotos`);

// ---- 3. Copas: las de las 2 competiciones con más títulos en el palmarés ----
// Las demás no se copian: la Sala cae a la copa en SVG cuando el .glb no carga.
const usage = Object.fromEntries(Object.keys(TROPHY_GLB_MAP).map(k => [k, 0]));
const trophyByComp = Object.fromEntries(stores['palmares-comps'].map(c => [c.key, c.trophy]));
for (const rec of stores.palmares) {
  const style = trophyByComp[rec.competition];
  if (style in usage) usage[style]++;
}
const keptStyles = Object.entries(usage).sort((a, b) => b[1] - a[1]).slice(0, KEEP_CUPS).map(([k]) => k);
const keptFiles = new Set(keptStyles.map(k => TROPHY_GLB_MAP[k]));
console.log(`Copas conservadas: ${keptStyles.map(k => `${k} (${TROPHY_GLB_MAP[k]}, ${usage[k]} títulos)`).join(', ')}`);

// ---- 4. Copia del sitio ----
rmSync(OUT, { recursive: true, force: true });
mkdirSync(SITE, { recursive: true });
for (const name of INCLUDE) {
  const from = join(SRC, name);
  if (!existsSync(from)) continue;
  cpSync(from, join(SITE, name), {
    recursive: true,
    filter: src => !isExcluded(src) && !(/[\\/]assets[\\/]trophies[\\/]copa_\d+\.glb$/.test(src) && !keptFiles.has(src.split(/[\\/]/).pop())),
  });
}
writeFileSync(join(OUT, 'backup.json'), JSON.stringify({
  version: 'TSC_v5', schemaVersion: 1, exportedAt: new Date().toISOString(),
  source: `snapshot de lectura de ${PROJECT} (scripts/emu-snapshot.mjs)`,
  manifest: { stores: STORES.slice() }, stores,
}, null, 2));

const size = p => statSync(p).isDirectory() ? readdirSync(p).reduce((s, n) => s + size(join(p, n)), 0) : statSync(p).size;
const mb = b => (b / 1048576).toFixed(1) + ' MB';
if (timestamps) console.log(`Aviso: ${timestamps} Timestamps de Firestore pasados a texto ISO.`);
console.log(`sandbox/site: ${mb(size(SITE))} · sandbox/backup.json: ${mb(size(join(OUT, 'backup.json')))}`);
