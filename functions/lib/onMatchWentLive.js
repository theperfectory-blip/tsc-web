'use strict';

const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { getOrderedMatchesForDate } = require('./matchOrder');
const { notifyContinuationTargets } = require('./continuation');

/* Disparador (b) de "juega a continuación": durante el stream, cuando un
   partido pasa a EN VIVO. Notifica a los 2 presidentes del SIGUIENTE
   partido programado ese día (el que va después del que se acaba de poner
   en vivo) — nunca al que ya está en vivo. Reacciona SOLO al flanco
   false → true: cualquier otro update de un partido ya en vivo (gol,
   penales, etc. — ver tsc-src/js/livematch.js) no debe volver a disparar
   esto, o cada gol spamearía "juega a continuación" al siguiente equipo. */
exports.onMatchWentLive = onDocumentUpdated('matches/{matchId}', async (event) => {
  if (!event.data) return;
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!before || !after) return;

  const wasLive = !!before.live;
  const isLive = !!after.live;
  if (wasLive || !isLive) return; // solo el flanco false -> true

  if (!after.scheduledDate || after.season == null) return; // sin fecha no hay "orden del día" que seguir

  const db = getFirestore();
  const matches = await getOrderedMatchesForDate(db, after.season, after.scheduledDate);
  const idx = matches.findIndex(m => String(m.id) === event.params.matchId);
  if (idx === -1 || idx + 1 >= matches.length) return; // no encontrado en la lista del día, o era el último

  const next = matches[idx + 1];
  const messaging = getMessaging();
  await notifyContinuationTargets(db, messaging, [next]);
});
