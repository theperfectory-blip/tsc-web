'use strict';

const { FieldValue } = require('firebase-admin/firestore');

/* Zona horaria "de torneo": el admin ingresa scheduledTime como una hora de
   pared sin zona explícita en el dato (ver Match Data Schema). Se asume que
   la ingresa en la zona del stream (Chile). Esto NO está verificado con el
   usuario/supervisor — es una decisión de implementación necesaria para que
   "formatear en la zona del destinatario" tenga un punto de partida. Si el
   torneo alguna vez ingresa horarios en otra zona, cambiar solo esta
   constante. */
const TOURNAMENT_TZ = 'America/Santiago';

/* Convierte una hora de pared 'YYYY-MM-DD' + 'HH:MM' interpretada en
   `timeZone` a un instante absoluto. Sin dependencias externas (no hay
   date-fns-tz/luxon en package.json): arma un UTC "ingenuo" con los mismos
   números, formatea ESE instante en `timeZone` con Intl, y la diferencia
   contra el original da el offset real de esa zona en ese instante
   (contempla DST). Técnica estándar para conversión de zona horaria sin
   librerías. */
function zonedWallTimeToUtc(dateStr, timeStr, timeZone) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const asUTC = Date.UTC(y, mo - 1, d, hh, mm, 0);

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(asUTC)).map(p => [p.type, p.value]));
  const asIfLocal = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  );
  const offsetMs = asIfLocal - asUTC; // cuánto adelanta `timeZone` a UTC en ese instante
  return new Date(asUTC - offsetMs);
}

/* Formatea la hora de un partido en la zona horaria GUARDADA del
   destinatario (users/{uid}.timezone) — nunca UTC ni la del servidor, por
   diseño (ver docs/android-push-notifications.md). Si falta scheduledTime
   devuelve null (el caller arma un texto sin hora). Si el timezone del
   destinatario es inválido (legacy / IANA mal escrito), cae a TOURNAMENT_TZ
   en vez de romper el envío completo. */
function formatKickoffForRecipient(dateStr, timeStr, recipientTz) {
  if (!dateStr || !timeStr) return null;
  let utc;
  try {
    utc = zonedWallTimeToUtc(dateStr, timeStr, TOURNAMENT_TZ);
  } catch (_e) {
    return timeStr;
  }
  const tryFormat = (tz) => new Intl.DateTimeFormat('es-CL', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(utc);
  try {
    return tryFormat(recipientTz || TOURNAMENT_TZ);
  } catch (_e) {
    return tryFormat(TOURNAMENT_TZ);
  }
}

function tokenHint(token) {
  if (!token) return 'none';
  const s = String(token);
  return `${s.slice(0, 8)}...${s.slice(-6)}`;
}

/* Presidentes con push activado de los equipos en `teamIds`. Lee toda la
   colección `users` y filtra en memoria (misma razón que getOrderedMatchesForDate:
   sin índice compuesto role+teamId(in)+pushEnabled desplegado, y la colección
   es chica). */
async function resolvePresidentRecipients(db, teamIds) {
  const wanted = new Set(teamIds.filter(id => id != null));
  if (!wanted.size) return [];
  const snap = await db.collection('users').get();
  const recipients = [];
  for (const doc of snap.docs) {
    const u = doc.data();
    if (u.role !== 'president') continue;
    if (u.teamId == null || !wanted.has(u.teamId)) continue;
    if (u.pushEnabled !== true) continue;
    const tokens = Array.isArray(u.fcmTokens) ? u.fcmTokens.filter(Boolean) : [];
    if (!tokens.length) continue;
    recipients.push({ uid: doc.id, teamId: u.teamId, tokens, timezone: u.timezone || null });
  }
  return recipients;
}

/* Nombres de equipo por id, para armar el texto ("X vs Y"). */
async function loadTeamNames(db, teamIds) {
  const ids = [...new Set(teamIds.filter(id => id != null))];
  if (!ids.length) return {};
  const refs = ids.map(id => db.collection('teams').doc(String(id)));
  const snaps = await db.getAll(...refs);
  const byId = {};
  snaps.forEach((snap, i) => {
    byId[ids[i]] = (snap.exists && snap.data().name) || `Equipo ${ids[i]}`;
  });
  return byId;
}

/* Núcleo de envío compartido por los dos flujos de notificación (Partes 3 y 4).
   - Dedup: una lectura por candidato contra `notificationRuns` ANTES de
     enviar; las claves cubiertas se registran DESPUÉS, en el mismo batch que
     la auditoría. El botón admin se deshabilita mientras corre (Parte 3) y
     el trigger de vivo solo reacciona al flanco false→true (Parte 4b), así
     que el doble-disparo real (click doble, o dos writes de `live` seguidos)
     ya queda cortado antes de llegar acá. Este read-then-write no es
     atómico ante dos INVOCACIONES de función genuinamente simultáneas
     (p.ej. dos regiones del admin clickeando a la vez) — no se resolvió con
     transacciones por key para no sobre-ingenierizar un caso que la UI ya
     previene; documentado en el reporte de cierre.
   - Envío: multicast de Admin SDK por destinatario (puede tener >1 token:
     celu + tablet).
   - Limpieza: token con messaging/registration-token-not-registered se saca
     del array fcmTokens del usuario (arrayRemove) — mismo array que escribe
     tsc-src/js/push.js, nunca se toca ese archivo.
   - Auditoría: un doc en notificationEvents por token individual enviado. */
async function notifyRecipients(db, messaging, { type, recipients, dedupKeyFor, buildMessage }) {
  if (!recipients.length) {
    return { totalCandidates: 0, notifiedUsers: 0, skippedDedup: 0, invalidTokensRemoved: 0, tokensAttempted: 0 };
  }

  const dedupRefs = recipients.map(r => db.collection('notificationRuns').doc(dedupKeyFor(r)));
  const dedupSnaps = await db.getAll(...dedupRefs);

  const toSend = [];
  let skippedDedup = 0;
  recipients.forEach((r, i) => {
    if (dedupSnaps[i].exists) skippedDedup++;
    else toSend.push(r);
  });

  let notifiedUsers = 0;
  let invalidTokensRemoved = 0;
  let tokensAttempted = 0;
  const batch = db.batch();

  for (const r of toSend) {
    const msg = buildMessage(r);
    if (!msg) continue;
    tokensAttempted += r.tokens.length;

    let resp;
    try {
      resp = await messaging.sendEachForMulticast({
        tokens: r.tokens,
        notification: { title: msg.title, body: msg.body },
        data: msg.data || {},
      });
    } catch (err) {
      console.error(`[push] sendEachForMulticast falló para uid=${r.uid}:`, err);
      continue; // no se registra dedup: no se pudo intentar, que se reintente en la próxima corrida
    }

    let anySuccess = false;
    resp.responses.forEach((res, i) => {
      const token = r.tokens[i];
      batch.set(db.collection('notificationEvents').doc(), {
        type,
        uid: r.uid,
        teamId: r.teamId,
        tokenHint: tokenHint(token),
        success: res.success,
        errorCode: res.success ? null : (res.error && res.error.code) || null,
        sentAt: FieldValue.serverTimestamp(),
      });
      if (res.success) {
        anySuccess = true;
      } else if (res.error && res.error.code === 'messaging/registration-token-not-registered') {
        batch.update(db.collection('users').doc(r.uid), { fcmTokens: FieldValue.arrayRemove(token) });
        invalidTokensRemoved++;
      }
    });
    if (anySuccess) notifiedUsers++;

    batch.set(db.collection('notificationRuns').doc(dedupKeyFor(r)), {
      type,
      uid: r.uid,
      teamId: r.teamId,
      coveredAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  return { totalCandidates: recipients.length, notifiedUsers, skippedDedup, invalidTokensRemoved, tokensAttempted };
}

module.exports = {
  TOURNAMENT_TZ,
  zonedWallTimeToUtc,
  formatKickoffForRecipient,
  tokenHint,
  resolvePresidentRecipients,
  loadTeamNames,
  notifyRecipients,
};
