'use strict';

const { resolvePresidentRecipients, notifyRecipients, loadTeamNames, formatKickoffForRecipient } = require('./notify');

/* "Tu equipo juega a continuación" para un conjunto de partidos objetivo
   (1 o 2 partidos). Compartida por:
   - Parte 4a (arranque del stream, onTaskDispatched +60s): targetMatches =
     [1º partido, 2º partido].
   - Parte 4b (trigger de "puesto en vivo"): targetMatches = [siguiente
     partido].
   La clave de dedup `continuation_{targetMatchId}_{teamId}` es la misma en
   ambos casos — así el 2º partido del día, avisado por (a) y también por
   (b) cuando el 1º se pone en vivo, recibe un solo aviso. */
async function notifyContinuationTargets(db, messaging, targetMatches) {
  const matches = targetMatches.filter(Boolean);
  if (!matches.length) {
    return { totalCandidates: 0, notifiedUsers: 0, skippedDedup: 0, invalidTokensRemoved: 0, tokensAttempted: 0 };
  }

  const allTeamIds = [];
  const matchByTeam = {};
  for (const m of matches) {
    for (const teamId of [m.teamA, m.teamB]) {
      if (teamId == null) continue;
      allTeamIds.push(teamId);
      matchByTeam[teamId] = m; // un equipo no debería tener 2 partidos el mismo día
    }
  }

  const recipients = await resolvePresidentRecipients(db, allTeamIds);
  const teamNames = await loadTeamNames(db, allTeamIds);

  return notifyRecipients(db, messaging, {
    type: 'continuation',
    recipients,
    dedupKeyFor: r => `continuation_${matchByTeam[r.teamId].id}_${r.teamId}`,
    buildMessage: r => {
      const m = matchByTeam[r.teamId];
      if (!m) return null;
      const myName = teamNames[r.teamId] || 'Tu equipo';
      const oppId = m.teamA === r.teamId ? m.teamB : m.teamA;
      const oppName = (oppId != null && teamNames[oppId]) || 'rival por definir';
      const time = formatKickoffForRecipient(m.scheduledDate, m.scheduledTime, r.timezone);
      const body = time
        ? `${myName} vs ${oppName} · a las ${time} (tu hora), preparate`
        : `${myName} vs ${oppName} · preparate`;
      return {
        title: 'Tu equipo juega a continuación',
        body,
        data: { type: 'continuation', matchId: String(m.id), teamId: String(r.teamId) },
      };
    },
  });
}

module.exports = { notifyContinuationTargets };
