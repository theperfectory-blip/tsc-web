'use strict';

/* ============================================================
   RESUMEN DE PARTIDOS POR TEMPORADA (LECT)
   ------------------------------------------------------------
   `resumenes/matches_<temporada>` = {
     season, count, updatedAt,
     items:     { "<id de partido>": {...partido...} },   // mapa, nunca lista
     historial: { "<id de partido>": {id, createdAt} },   // id del registro de matchHistory
   }

   El cliente (tsc-src/js/db.js) lee ese documento —uno por temporada no
   archivada— en vez de la colección `matches` entera: editar, agregar o
   borrar un partido solo toca su entrada, así que el resumen nunca se
   reordena ni se reescribe completo.

   Lo mantienen estas tres piezas:
   - onMatchWritten: trigger de `matches/{id}` (crea/modifica/borra la
     entrada, y la quita de la temporada vieja si el partido cambió de
     temporada). Corre en FIRESTORE_REGION, como onMatchWentLive.
   - rebuildMatchSummaryDaily: programada diaria; rehace el resumen de todas
     las temporadas no archivadas (red de seguridad ante triggers perdidos).
   - rebuildMatchSummary: callable solo admin (botón «Rehacer resumen de
     partidos» del panel) que lo arma de cero desde `matches`.

   Los triggers de Firestore no comparten la transacción del cliente: el
   resumen puede ir uno o dos segundos atrás. El cliente lo cubre con un
   overlay local de sus propias escrituras (db.js) y el listener del resumen
   repinta la vista en cuanto llega el cambio.
   ============================================================ */

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { FIRESTORE_REGION, TASKS_REGION } = require('./config');

const SUMMARY_COLLECTION = 'resumenes';
const SUMMARY_DOC_PREFIX = 'matches_';

const summaryRef = (db, season) => db.collection(SUMMARY_COLLECTION).doc(SUMMARY_DOC_PREFIX + Number(season));

/* Temporada de un partido: la suya; si no la tiene, la de su fase →
   competición (mismo criterio que historyRecordFor en el cliente). 0 =
   partido sin temporada, que el cliente suma siempre (como `!m.season`). */
async function resolveSeason(db, data) {
  if (!data) return null;
  const own = Number(data.season);
  if (Number.isFinite(own) && own > 0) return own;
  const phaseId = data.phaseId;
  if (phaseId == null) return 0;
  try {
    const p = await db.collection('phases').doc(String(phaseId)).get();
    const compId = p.exists ? p.data().compId : null;
    if (compId == null) return 0;
    const c = await db.collection('competitions').doc(String(compId)).get();
    const season = c.exists ? Number(c.data().season) : NaN;
    return Number.isFinite(season) && season > 0 ? season : 0;
  } catch (_) {
    return 0;
  }
}

/* Id del registro de historial de un partido (para que el Historial del
   cliente conserve ids y orden sin leer `matchHistory`). null si el partido
   todavía no tiene registro (en vivo, o sin resultado). */
async function historyMetaFor(db, matchId) {
  try {
    const snap = await db.collection('matchHistory').where('matchRef', '==', Number(matchId)).limit(1).get();
    if (snap.empty) return null;
    const h = snap.docs[0].data() || {};
    return { id: h.id != null ? h.id : Number(snap.docs[0].id), createdAt: h.createdAt ?? null };
  } catch (_) {
    return null;
  }
}

/* Aplica una escritura de `matches` al resumen de su temporada (y la quita de
   la temporada vieja si cambió). En transacción: o entra todo o nada. */
async function applyMatchWrite(db, { matchId, beforeSeason, afterSeason, after, hist }) {
  const seasons = [...new Set([beforeSeason, afterSeason].filter(s => s != null))];
  if (!seasons.length) return;
  const key = String(matchId);

  await db.runTransaction(async tx => {
    const refs = seasons.map(s => summaryRef(db, s));
    const snaps = await Promise.all(refs.map(r => tx.get(r)));
    const now = new Date().toISOString();

    for (let i = 0; i < seasons.length; i++) {
      const season = seasons[i];
      const ref = refs[i];
      const snap = snaps[i];
      const isNew = afterSeason === season && after != null;

      if (!snap.exists) {
        // Un borrado nunca crea el documento; un alta sí.
        if (!isNew) continue;
        tx.set(ref, {
          season,
          count: 1,
          updatedAt: now,
          items: { [key]: after },
          historial: hist ? { [key]: hist } : {},
        });
        continue;
      }

      const cur = snap.data() || {};
      const items = cur.items || {};
      const wasThere = Object.prototype.hasOwnProperty.call(items, key);
      if (!isNew && !wasThere) continue;   // no estaba: nada que quitar

      const count = (Number(cur.count) || 0) + (isNew ? (wasThere ? 0 : 1) : -1);
      const upd = { updatedAt: now, count: Math.max(0, count) };
      if (isNew) {
        upd['items.' + key] = after;
        upd['historial.' + key] = hist || FieldValue.delete();
      } else {
        upd['items.' + key] = FieldValue.delete();
        upd['historial.' + key] = FieldValue.delete();
      }
      tx.update(ref, upd);
    }
  });
}

/* Trigger de `matches/{id}`: alta, modificación o borrado. Reacciona a
   CUALQUIER escritura (no solo al flanco en vivo, como onMatchWentLive). */
exports.onMatchWritten = onDocumentWritten(
  { document: 'matches/{matchId}', region: FIRESTORE_REGION },
  async (event) => {
    if (!event.data) return;
    const beforeSnap = event.data.before;
    const afterSnap = event.data.after;
    const before = beforeSnap && beforeSnap.exists ? beforeSnap.data() : null;
    const after = afterSnap && afterSnap.exists ? afterSnap.data() : null;
    if (!before && !after) return;

    const db = getFirestore();
    const matchId = event.params.matchId;
    const beforeSeason = before ? await resolveSeason(db, before) : null;
    const afterSeason = after ? await resolveSeason(db, after) : null;
    // El registro de historial solo tiene sentido con resultado y fuera de vivo.
    const needsHist = !!after && !after.live && after.goalsA != null && after.goalsB != null;
    const hist = needsHist ? await historyMetaFor(db, matchId) : null;

    await applyMatchWrite(db, { matchId, beforeSeason, afterSeason, after, hist });
  }
);

/* Rehace el resumen de las temporadas no archivadas desde `matches` (y los
   ids de historial desde `matchHistory`). Si se pasa `onlySeason`, solo esa.
   Es idempotente: deja exactamente lo que hay en las colecciones. */
async function rebuildAll(db, onlySeason = null) {
  const archiveSnap = await db.collection('archive').doc('seasons').get();
  const archived = new Set((((archiveSnap.exists && archiveSnap.data().numbers) || [])).map(Number));

  const matchesSnap = await db.collection('matches').get();
  const bySeason = new Map();
  for (const doc of matchesSnap.docs) {
    const m = doc.data() || {};
    if (m.id == null) m.id = Number(doc.id);
    const season = await resolveSeason(db, m);
    if (onlySeason != null && season !== Number(onlySeason)) continue;
    if (archived.has(season)) continue;
    if (!bySeason.has(season)) bySeason.set(season, []);
    bySeason.get(season).push(m);
  }

  // Ids de historial: se leen una vez y se reparten por partido.
  const histByMatch = new Map();
  if (bySeason.size) {
    const histSnap = await db.collection('matchHistory').get();
    for (const doc of histSnap.docs) {
      const h = doc.data() || {};
      if (h.source !== 'live' || h.matchRef == null) continue;
      histByMatch.set(String(h.matchRef), { id: h.id != null ? h.id : Number(doc.id), createdAt: h.createdAt ?? null });
    }
  }

  const out = [];
  for (const [season, rows] of bySeason) {
    const items = {};
    const historial = {};
    for (const m of rows) {
      const key = String(m.id);
      items[key] = m;
      const h = histByMatch.get(key);
      if (h) historial[key] = h;
    }
    await summaryRef(db, season).set({
      season,
      count: rows.length,
      updatedAt: new Date().toISOString(),
      items,
      historial,
    });
    out.push({ season, matches: rows.length, historial: Object.keys(historial).length });
  }

  // Resúmenes que ya no corresponden a ninguna temporada con partidos (o de
  // una temporada archivada): se borran para no dejar documentos de más.
  const summarySnap = await db.collection(SUMMARY_COLLECTION).get();
  for (const doc of summarySnap.docs) {
    const s = doc.data() || {};
    const season = Number(s.season);
    if (onlySeason != null && season !== Number(onlySeason)) continue;
    if (bySeason.has(season)) continue;
    await doc.ref.delete();
  }

  return out;
}

exports.rebuildMatchSummary = onCall(async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Inicia sesión como admin.');

  const db = getFirestore();
  // Auth SIEMPRE contra Firestore, nunca un flag del cliente.
  const meSnap = await db.collection('users').doc(uid).get();
  const me = meSnap.exists ? meSnap.data() : null;
  if (!me || me.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo un admin puede rehacer el resumen de partidos.');
  }

  const raw = request.data && request.data.season;
  const season = raw == null || raw === '' ? null : Number(raw);
  if (season != null && !Number.isFinite(season)) {
    throw new HttpsError('invalid-argument', 'Temporada inválida.');
  }

  const seasons = await rebuildAll(db, season);
  return {
    seasons,
    matches: seasons.reduce((sum, s) => sum + s.matches, 0),
  };
});

/* Red de seguridad: una vez al día (madrugada de Chile) se rehace el resumen
   de todas las temporadas no archivadas. Si un trigger se perdió (o Firestore
   quedó escrito por fuera de la app), esto lo deja exacto. */
exports.rebuildMatchSummaryDaily = onSchedule(
  { schedule: 'every day 04:00', timeZone: 'America/Santiago', region: TASKS_REGION },
  async () => {
    const db = getFirestore();
    const seasons = await rebuildAll(db, null);
    console.log('[resumen] rehecho:', JSON.stringify(seasons));
  }
);
