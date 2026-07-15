'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { getFunctions } = require('firebase-admin/functions');
const { TASKS_REGION } = require('./config');
const { getOrderedMatchesForDate } = require('./matchOrder');
const { resolvePresidentRecipients, notifyRecipients, loadTeamNames, formatKickoffForRecipient } = require('./notify');

const CONTINUATION_DELAY_SECONDS = 60;
const CONTINUATION_QUEUE = `locations/${TASKS_REGION}/functions/notifyStartupContinuation`;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* "Tu equipo juega HOY" — disparo MANUAL del admin al iniciar el stream
   (Parte 3). Broadcast a TODOS los presidentes con partido programado ese
   día (no solo el primer partido). Además encola la Cloud Task de
   "continuación" (Parte 4a) para +60s. */
exports.notifyStreamToday = onCall(async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Iniciá sesión como admin.');

  const db = getFirestore();

  // Auth: SIEMPRE contra Firestore, nunca un flag que mande el cliente.
  const callerSnap = await db.collection('users').doc(uid).get();
  const caller = callerSnap.exists ? callerSnap.data() : null;
  if (!caller || caller.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo un admin puede notificar el stream de hoy.');
  }

  const date = request.data && request.data.date;
  const season = request.data && Number(request.data.season);
  if (typeof date !== 'string' || !DATE_RE.test(date)) {
    throw new HttpsError('invalid-argument', 'Fecha inválida (se espera YYYY-MM-DD).');
  }
  if (!Number.isFinite(season)) {
    throw new HttpsError('invalid-argument', 'Temporada inválida.');
  }

  const todaysMatches = await getOrderedMatchesForDate(db, season, date);
  if (!todaysMatches.length) {
    return {
      matchesToday: 0, continuationQueued: false,
      totalCandidates: 0, notifiedUsers: 0, skippedDedup: 0, invalidTokensRemoved: 0, tokensAttempted: 0,
    };
  }

  // Primer partido del día por equipo (ordenado por kickoff compartido).
  const matchByTeam = {};
  const allTeamIds = [];
  for (const m of todaysMatches) {
    for (const teamId of [m.teamA, m.teamB]) {
      if (teamId == null) continue;
      allTeamIds.push(teamId);
      if (!(teamId in matchByTeam)) matchByTeam[teamId] = m;
    }
  }

  const recipients = await resolvePresidentRecipients(db, allTeamIds);
  const teamNames = await loadTeamNames(db, allTeamIds);
  const messaging = getMessaging();

  const result = await notifyRecipients(db, messaging, {
    type: 'today',
    recipients,
    dedupKeyFor: r => `today_${season}_${date}_${r.teamId}`,
    buildMessage: r => {
      const m = matchByTeam[r.teamId];
      if (!m) return null;
      const myName = teamNames[r.teamId] || 'Tu equipo';
      const oppId = m.teamA === r.teamId ? m.teamB : m.teamA;
      const oppName = (oppId != null && teamNames[oppId]) || 'rival por definir';
      const time = formatKickoffForRecipient(date, m.scheduledTime, r.timezone);
      const body = time
        ? `${myName} vs ${oppName} · hoy a las ${time} (tu hora)`
        : `${myName} vs ${oppName} · hoy`;
      return {
        title: '¡Tu equipo juega hoy!',
        body,
        data: { type: 'today', matchId: String(m.id), teamId: String(r.teamId) },
      };
    },
  });

  let continuationQueued = false;
  try {
    const queue = getFunctions().taskQueue(CONTINUATION_QUEUE);
    await queue.enqueue({ season, date }, { scheduleDelaySeconds: CONTINUATION_DELAY_SECONDS });
    continuationQueued = true;
  } catch (err) {
    // No se aborta el broadcast "juega hoy" por esto: ya se mandó. Queda
    // logueado para diagnosticar por qué el 1º/2º partido no recibió el
    // aviso de "a continuación" del arranque.
    console.error('[notifyStreamToday] no se pudo encolar la Cloud Task de continuación:', err);
  }

  return { matchesToday: todaysMatches.length, continuationQueued, ...result };
});
