'use strict';

const { onTaskDispatched } = require('firebase-functions/v2/tasks');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { getOrderedMatchesForDate } = require('./matchOrder');
const { notifyContinuationTargets } = require('./continuation');

/* Disparador (a) de "juega a continuación": arranque del stream, ~60s
   después del broadcast "juega hoy" (encolada por notifyStreamToday).
   Notifica a los presidentes del 1º Y del 2º partido del día — el 1º
   porque le toca ya (no hay un partido previo que se ponga "en vivo" que
   lo dispare), el 2º porque va justo después. onTaskDispatched en vez de
   setTimeout: un setTimeout dentro de una Cloud Function bloquearía la
   instancia (timeout + costo) en lugar de liberar el proceso y que Cloud
   Tasks reprograme la ejecución. */
exports.notifyStartupContinuation = onTaskDispatched(
  {
    retryConfig: { maxAttempts: 3, minBackoffSeconds: 30 },
    rateLimits: { maxConcurrentDispatches: 1 },
  },
  async (request) => {
    const data = request.data || {};
    const season = Number(data.season);
    const date = data.date;
    if (!Number.isFinite(season) || typeof date !== 'string') {
      console.error('[notifyStartupContinuation] payload inválido:', data);
      return;
    }

    const db = getFirestore();
    const matches = await getOrderedMatchesForDate(db, season, date);
    const targets = matches.slice(0, 2); // 1º y 2º partido del día
    if (!targets.length) return;

    const messaging = getMessaging();
    return notifyContinuationTargets(db, messaging, targets);
  }
);
