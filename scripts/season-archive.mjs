// Solo desarrollo (no se publica). Temporadas archivadas (D8, MS-5.14).
//
// Lee una temporada FINALIZADA y escribe su archivo fijo de solo lectura:
//   tsc-src/data/temporadas/<número>.json   todo lo de la temporada
//   tsc-src/data/temporadas/index.json      lista de temporadas archivadas
// La app (MS-5.15) sirve esas temporadas desde el archivo en vez de Firestore.
//
// Origen de los datos (solo lectura en todos los casos):
//   --from prod             producción, API REST pública, solo GET y sin sesión
//                           (como emu-snapshot.mjs). Por defecto.
//   --from emu              emulador del sandbox (127.0.0.1:8080, "Bearer owner")
//   --from file:<ruta>      un backup JSON (formato de exportFullDB)
//
// Uso:
//   node scripts/season-archive.mjs --season 1 [--from …] [--out <dir>]
//   node scripts/season-archive.mjs --season 1 --verify [--from …] [--out <dir>]
//       Vuelve a leer el origen y compara conteos y huellas con el archivo:
//       sale con código 1 si algo no coincide. Correrlo antes de borrar la
//       temporada de Firestore (MS-5.16).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PROJECT = 'tsc-web-yuna';
// API key pública del cliente (tsc-src/js/firebase-config.js).
const API_KEY = 'AIzaSyDmKBTE3EJ6tlgqC7fesoY7DUHnpNRQj9k';

// Colecciones de una temporada. Orden fijo: es el del archivo.
export const ARCHIVE_STORES = ['competitions', 'phases', 'matches', 'matchHistory', 'coins', 'sorteo', 'sorteoEvents', 'calDayLabels'];

const args = process.argv.slice(2);
const arg = (name, dflt = null) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };

function fromValue(v) {
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
  throw new Error(`tipo de valor no soportado: ${Object.keys(v)}`);
}
const fromFields = f => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, fromValue(v)]));

function restReader(base, headers, suffix) {
  return async col => {
    const rows = [];
    let pageToken = '';
    do {
      const url = `${base}/${encodeURIComponent(col)}?pageSize=300${suffix}${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`${col}: ${res.status} ${await res.text()}`);
      const json = await res.json();
      (json.documents || []).forEach(d => rows.push(fromFields(d.fields || {})));
      pageToken = json.nextPageToken || '';
    } while (pageToken);
    return rows;
  };
}

export function makeReader(from) {
  if (from === 'prod') {
    return restReader(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`, {}, `&key=${API_KEY}`);
  }
  if (from === 'emu') {
    return restReader(`http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`, { Authorization: 'Bearer owner' }, '');
  }
  if (from.startsWith('file:')) {
    const data = JSON.parse(readFileSync(resolve(from.slice(5)), 'utf8'));
    const stores = data.stores || data;
    return async col => (stores[col] || []).map(r => ({ ...r }));
  }
  throw new Error(`--from desconocido: ${from}`);
}

/* JSON canónico (claves ordenadas) para que la huella no dependa del orden. */
function canon(v) {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
}
export function fingerprint(rows) {
  const sorted = [...rows].sort((a, b) => a.id - b.id);
  return createHash('sha256').update(canon(sorted)).digest('hex').slice(0, 16);
}

/* Todo lo de la temporada `number`, a partir de las colecciones leídas. */
export async function collectSeason(read, number) {
  const seasons = await read('seasons');
  const season = seasons.find(s => s.number === number);
  if (!season) throw new Error(`No existe la temporada ${number}`);
  if (season.status !== 'finished') throw new Error(`La temporada ${number} (${season.name || ''}) no está finalizada (status: ${season.status}). Solo se archiva una temporada finalizada.`);

  const all = {};
  for (const s of ARCHIVE_STORES) all[s] = await read(s);
  const teams = await read('teams');

  const competitions = all.competitions.filter(c => c.season === number);
  const compIds = new Set(competitions.map(c => c.id));
  const phases = all.phases.filter(p => compIds.has(p.compId));
  const phaseIds = new Set(phases.map(p => p.id));
  const matches = all.matches.filter(m => m.season === number || phaseIds.has(m.phaseId));
  const matchIds = new Set(matches.map(m => m.id));
  const stores = {
    competitions,
    phases,
    matches,
    matchHistory: all.matchHistory.filter(h => h.seasonRef === number || (h.source === 'live' && matchIds.has(h.matchRef))),
    coins: all.coins.filter(c => c.season === number),
    sorteo: all.sorteo.filter(r => r.season === number),
    sorteoEvents: all.sorteoEvents.filter(r => r.season === number),
    calDayLabels: all.calDayLabels.filter(r => r.season === number),
  };

  // Los equipos siguen vivos en Firestore (plantel global); el archivo guarda
  // cómo eran al archivar los que aparecen en la temporada, por si después se
  // renombran o se dan de baja.
  const used = new Set();
  matches.forEach(m => { used.add(m.teamA); used.add(m.teamB); });
  stores.coins.forEach(c => used.add(c.teamId));
  stores.sorteoEvents.forEach(e => used.add(e.teamId));
  phases.forEach(p => Object.values(p.groups || {}).forEach(g => (g || []).forEach(t => used.add(t))));
  const teamsAtClose = teams.filter(t => used.has(t.id))
    .map(t => ({ id: t.id, name: t.name, ini: t.ini ?? null, color: t.color ?? null, color2: t.color2 ?? null, logo: t.logo ?? null, previousNames: t.previousNames ?? [] }))
    .sort((a, b) => a.id - b.id);

  for (const s of ARCHIVE_STORES) stores[s].sort((a, b) => a.id - b.id);
  const counts = Object.fromEntries(ARCHIVE_STORES.map(s => [s, stores[s].length]));
  const fingerprints = Object.fromEntries(ARCHIVE_STORES.map(s => [s, fingerprint(stores[s])]));
  return { season, stores, teamsAtClose, counts, fingerprints };
}

async function main() {
  const number = Number(arg('--season'));
  if (!Number.isSafeInteger(number) || number < 1) {
    console.error('Uso: node scripts/season-archive.mjs --season <número> [--from prod|emu|file:<ruta>] [--out <dir>] [--verify]');
    process.exit(2);
  }
  const from = arg('--from', 'prod');
  const outDir = resolve(arg('--out', join(ROOT, 'tsc-src', 'data', 'temporadas')));
  const file = join(outDir, `${number}.json`);
  const got = await collectSeason(makeReader(from), number);

  if (args.includes('--verify')) {
    if (!existsSync(file)) { console.error(`[archive] no existe ${file}`); process.exitCode = 1; return; }
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    let bad = 0;
    for (const s of ARCHIVE_STORES) {
      const fp = fingerprint(saved.stores[s] || []);
      const ok = saved.counts[s] === got.counts[s] && fp === got.fingerprints[s] && saved.fingerprints[s] === fp;
      if (!ok) bad++;
      console.log(`${ok ? 'OK   ' : 'DISTINTO'} ${s.padEnd(13)} archivo ${String(saved.counts[s]).padStart(4)} · ${from} ${String(got.counts[s]).padStart(4)}`);
    }
    console.log(bad ? `\n[archive] ${bad} colección(es) no coinciden` : '\n[archive] el archivo coincide con el origen');
    process.exitCode = bad ? 1 : 0;
    return;
  }

  mkdirSync(outDir, { recursive: true });
  const archive = {
    format: 'tsc-season-archive',
    version: 1,
    season: got.season,
    generatedAt: new Date().toISOString(),
    source: from.startsWith('file:') ? 'file' : from,
    counts: got.counts,
    fingerprints: got.fingerprints,
    teamsAtClose: got.teamsAtClose,
    stores: got.stores,
  };
  writeFileSync(file, JSON.stringify(archive));

  const idxFile = join(outDir, 'index.json');
  const index = existsSync(idxFile) ? JSON.parse(readFileSync(idxFile, 'utf8')) : { format: 'tsc-season-archive-index', version: 1, seasons: [] };
  index.seasons = index.seasons.filter(s => s.number !== number);
  index.seasons.push({ number, id: got.season.id, name: got.season.name || `T${number}`, game: got.season.game || null,
    file: `${number}.json`, generatedAt: archive.generatedAt, counts: got.counts, fingerprints: got.fingerprints });
  index.seasons.sort((a, b) => a.number - b.number);
  writeFileSync(idxFile, JSON.stringify(index, null, 2) + '\n');

  const kb = Math.round(JSON.stringify(archive).length / 1024);
  console.log(`[archive] ${got.season.name || 'T' + number} → ${file} (${kb} KB)`);
  for (const s of ARCHIVE_STORES) console.log(`  ${s.padEnd(13)} ${String(got.counts[s]).padStart(4)}  ${got.fingerprints[s]}`);
  console.log(`  equipos al cerrar: ${got.teamsAtClose.length}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  // exitCode y no process.exit: en Windows, salir con fetch abiertos hace caer a Node.
  main().catch(err => { console.error('[archive]', err.message); process.exitCode = 1; });
}
