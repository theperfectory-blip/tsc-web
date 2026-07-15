'use strict';
/* ============================================================
   Harness de verificación — backend FCM (Fase 8)
   ------------------------------------------------------------
   Invoca los 3 handlers exportados (notifyStreamToday,
   notifyStartupContinuation, onMatchWentLive) vía su `.run()` real
   de firebase-functions v2 contra un Firestore EMULADO de verdad,
   con `messaging.sendEachForMulticast` mockeado (no hay emulador
   de FCM). No es un mock de la lógica: `.run()` es la misma API
   que ejecuta Cloud Functions en producción, solo se evita la capa
   HTTP/verificación de ID token (eso es infraestructura de Firebase,
   no código de este repo).

   CÓMO CORRERLO
   -------------
   Opción A (recomendada, arranca y para el emulador solo):
     cd functions
     npm run test:emulator

   Opción B (emulador ya corriendo aparte, p.ej. para debuggear):
     # terminal 1:
     cd .. && firebase emulators:start --only firestore --project demo-tsc-web
     # terminal 2:
     cd functions && node test/verify-emulator.js

   GOTCHA EN WINDOWS — "Unable to establish loopback connection"
   ---------------------------------------------------------------
   El emulador de Firestore es un proceso Java (Netty). Si el TMP/TEMP
   del sistema es una ruta larga (típico en perfiles tipo
   C:\Users\XXXXX\AppData\Local\Temp\...), Netty falla al abrir el
   socket de loopback (AF_UNIX excede 108 caracteres) y el emulador
   muere apenas arranca. Mismo bug que con `gradlew` (ver memoria
   tsc-web-gradle-tmpdir-fix). Fix, ANTES de correr cualquiera de las
   dos opciones de arriba:
     export TMP="C:\Temp"
     export TEMP="C:\Temp"
     mkdir -p /c/Temp   # si no existe

   Además hace falta un JDK en PATH (el emulador de Firestore es Java).
   Si no hay uno instalado, en esta máquina hay uno en
   ~/jdk-temurin-21/jdk-21.0.11+10/bin — agregarlo a PATH:
     export PATH="$HOME/jdk-temurin-21/jdk-21.0.11+10/bin:$PATH"
   ============================================================ */

const assert = require('assert');

// Si se corre con `node test/verify-emulator.js` directo (Opción B) y no
// vía `firebase emulators:exec` (que ya inyecta esta env var), usar el
// puerto default del emulador declarado en firebase.json.
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'demo-tsc-web';

const admin = require('firebase-admin');
admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT });

const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const db = getFirestore();
const messaging = getMessaging();

// ---- Mock de envío FCM: no hay emulador de Messaging. Tokens que
// contengan "bad" fallan con el código real que dispara la limpieza de
// arrayRemove. Cualquier otro token "envía" bien. ----
let sendCalls = 0;
messaging.sendEachForMulticast = async (message) => {
  sendCalls++;
  const responses = message.tokens.map(t => {
    if (String(t).includes('bad')) {
      return { success: false, error: { code: 'messaging/registration-token-not-registered' } };
    }
    return { success: true, messageId: 'mock-' + t };
  });
  return { responses, successCount: responses.filter(r => r.success).length, failureCount: responses.filter(r => !r.success).length };
};

const { notifyStreamToday } = require('../lib/notifyStreamToday');
const { notifyStartupContinuation } = require('../lib/notifyStartupContinuation');
const { onMatchWentLive } = require('../lib/onMatchWentLive');
const { notifyRecipients, formatKickoffForRecipient, TOURNAMENT_TZ } = require('../lib/notify');

const DATE = '2026-07-15';
const SEASON = 1;

async function wipeCollection(name) {
  const snap = await db.collection(name).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

async function seed() {
  // Corridas anteriores del script dejan notificationRuns/Events — hay que
  // partir de cero para que el dedup de este run no quede contaminado.
  await wipeCollection('notificationRuns');
  await wipeCollection('notificationEvents');
  await wipeCollection('matches');
  await wipeCollection('users');
  await wipeCollection('teams');
  await wipeCollection('seasons');

  const batch = db.batch();
  const set = (col, id, data) => batch.set(db.collection(col).doc(String(id)), data);

  set('seasons', 1, { number: 1, name: null, status: 'active' });

  for (const [id, name] of [[1, 'Malvinas'], [2, 'Lechugueros'], [3, 'Halcones'], [4, 'Cobras'], [5, 'Sin Partido Hoy'], [6, 'Deshabilitado'], [7, 'Sin Tokens']]) {
    set('teams', id, { id, name });
  }

  set('users', 'admin-uid', { role: 'admin', teamId: null });
  set('users', 'pres1', { role: 'president', teamId: 1, pushEnabled: true, fcmTokens: ['tok1a', 'tok1b'], timezone: 'America/Santiago' });
  set('users', 'pres2', { role: 'president', teamId: 2, pushEnabled: true, fcmTokens: ['tok2'], timezone: 'America/Argentina/Buenos_Aires' });
  set('users', 'pres3', { role: 'president', teamId: 3, pushEnabled: true, fcmTokens: ['tok3'], timezone: 'America/Santiago' });
  set('users', 'pres4', { role: 'president', teamId: 4, pushEnabled: true, fcmTokens: ['badtoken4'], timezone: 'America/Santiago' });
  set('users', 'pres5', { role: 'president', teamId: 5, pushEnabled: true, fcmTokens: ['tok5'], timezone: 'America/Santiago' }); // no juega HOY
  set('users', 'pres6', { role: 'president', teamId: 6, pushEnabled: false, fcmTokens: ['tok6'], timezone: 'America/Santiago' }); // pushEnabled false
  set('users', 'pres7', { role: 'president', teamId: 7, pushEnabled: true, fcmTokens: [], timezone: 'America/Santiago' }); // sin tokens

  set('matches', 101, { id: 101, season: SEASON, teamA: 1, teamB: 2, scheduledDate: DATE, scheduledTime: '15:00', live: false, goalsA: null, goalsB: null });
  set('matches', 102, { id: 102, season: SEASON, teamA: 3, teamB: 4, scheduledDate: DATE, scheduledTime: '17:00', live: false, goalsA: null, goalsB: null });
  set('matches', 103, { id: 103, season: SEASON, teamA: 6, teamB: 7, scheduledDate: DATE, scheduledTime: '19:00', live: false, goalsA: null, goalsB: null });
  set('matches', 104, { id: 104, season: SEASON, teamA: 5, teamB: 1, scheduledDate: '2026-07-16', scheduledTime: '12:00', live: false, goalsA: null, goalsB: null }); // otro día

  await batch.commit();
  console.log('[seed] OK');
}

async function run() {
  await seed();

  // ---- Escenario 1: destinatarios exactos de "juega hoy" ----
  const r1 = await notifyStreamToday.run({ data: { date: DATE, season: SEASON }, auth: { uid: 'admin-uid' } });
  console.log('[1] notifyStreamToday (admin, 1a corrida):', r1);
  assert.strictEqual(r1.matchesToday, 3, 'matchesToday debe ser 3');
  assert.strictEqual(r1.totalCandidates, 4, 'candidatos: pres1,2,3,4 (pres5 no juega hoy, pres6 pushEnabled=false, pres7 sin tokens)');
  assert.strictEqual(r1.notifiedUsers, 3, 'notificados: pres1,2,3 (pres4 tiene token inválido)');
  assert.strictEqual(r1.invalidTokensRemoved, 1, 'badtoken4 debe limpiarse');
  console.log('  ✓ destinatarios exactos, ni uno más ni uno menos');

  const pres4After = (await db.collection('users').doc('pres4').get()).data();
  assert.deepStrictEqual(pres4After.fcmTokens, [], 'arrayRemove debe haber vaciado fcmTokens de pres4');
  console.log('  ✓ token inválido limpiado de users/pres4.fcmTokens');

  // ---- Escenario 2: dedup — segunda corrida, 0 envíos nuevos ----
  const r2 = await notifyStreamToday.run({ data: { date: DATE, season: SEASON }, auth: { uid: 'admin-uid' } });
  console.log('[2] notifyStreamToday (admin, 2a corrida):', r2);
  assert.strictEqual(r2.notifiedUsers, 0, 'segunda corrida no debe notificar a nadie de nuevo');
  // pres4 ya no es "candidato": se quedó sin tokens (limpiado en la 1a corrida).
  assert.strictEqual(r2.totalCandidates, 3, 'pres4 ya no es candidato: se quedó sin tokens');
  assert.strictEqual(r2.skippedDedup, 3, 'pres1,2,3 deben quedar bloqueados por dedup');
  console.log('  ✓ dedup: segunda corrida = 0 envíos nuevos');

  // ---- Escenario 3: guard de admin ----
  let threw = null;
  try {
    await notifyStreamToday.run({ data: { date: DATE, season: SEASON }, auth: { uid: 'pres1' } });
  } catch (e) { threw = e; }
  assert.ok(threw, 'debe tirar para un caller no-admin');
  assert.strictEqual(threw.code, 'permission-denied', `código esperado permission-denied, fue ${threw && threw.code}`);
  console.log('[3] ✓ caller no-admin (pres1) → permission-denied');

  let threwUnauth = null;
  try {
    await notifyStreamToday.run({ data: { date: DATE, season: SEASON } }); // sin auth
  } catch (e) { threwUnauth = e; }
  assert.ok(threwUnauth, 'debe tirar sin auth');
  assert.strictEqual(threwUnauth.code, 'unauthenticated');
  console.log('    ✓ caller sin auth → unauthenticated');

  // ---- Escenario 4: trigger de vivo — notifica al SIGUIENTE, no al que está en vivo ----
  const callsBefore4 = sendCalls;
  const match101 = (await db.collection('matches').doc('101').get()).data();
  await onMatchWentLive.run({
    data: {
      before: { data: () => ({ ...match101, live: false }) },
      after: { data: () => ({ ...match101, live: true }) },
    },
    params: { matchId: '101' },
  });
  const runsAfterLiveTrigger = (await db.collection('notificationRuns').where('type', '==', 'continuation').get()).docs.map(d => d.id);
  console.log('[4] notificationRuns tras poner 101 en vivo:', runsAfterLiveTrigger);
  assert.ok(runsAfterLiveTrigger.includes('continuation_102_3'), 'debe notificar a pres3 (equipo del SIGUIENTE partido, 102)');
  assert.ok(!runsAfterLiveTrigger.some(k => k.startsWith('continuation_101_')), 'NO debe notificar a nadie del partido 101 (el que está en vivo, no el siguiente)');
  assert.ok(sendCalls > callsBefore4, 'debe haber intentado enviar al menos un mensaje');
  console.log('  ✓ trigger de vivo notifica al SIGUIENTE partido (102), no al que se puso en vivo (101)');

  // Update de un partido YA en vivo (ej. un gol) no debe volver a disparar nada
  const callsBeforeGoal = sendCalls;
  await onMatchWentLive.run({
    data: {
      before: { data: () => ({ ...match101, live: true, goalsA: 0 }) },
      after: { data: () => ({ ...match101, live: true, goalsA: 1 }) },
    },
    params: { matchId: '101' },
  });
  assert.strictEqual(sendCalls, callsBeforeGoal, 'un update de un partido YA en vivo no debe disparar envíos');
  console.log('  ✓ actualizar un partido YA en vivo (gol) no dispara nada nuevo');

  // ---- Escenario 5: dedup cruzado — el 2º partido avisado por 2 vías, 1 solo aviso ----
  const r5 = await notifyStartupContinuation.run({ data: { season: SEASON, date: DATE } });
  console.log('[5] notifyStartupContinuation (arranque, después del trigger de vivo):', r5);
  // pres1 y pres2 (partido 101, el 1º del día) reciben su PRIMER aviso de "a continuación" acá.
  assert.strictEqual(r5.notifiedUsers, 2, 'pres1 y pres2 (partido 101) deben notificarse por primera vez');
  // pres3 (partido 102, el 2º) ya fue avisado por el trigger de vivo del escenario 4 → debe saltarse por dedup.
  assert.strictEqual(r5.skippedDedup, 1, 'pres3 debe saltarse: ya lo notificó el trigger de vivo del partido 101 con la misma clave continuation_102_3');
  console.log('  ✓ dedup cruzado: pres3 recibe UN SOLO aviso pese a estar cubierto por 2 disparadores (arranque + trigger de vivo)');

  // ---- Escenario 6 (regresión Fix 2): un envío fallido NO debe registrar
  // dedup — tiene que poder reintentarse en la próxima corrida. Prueba
  // directa sobre notifyRecipients (el núcleo compartido), con un mock que
  // falla la PRIMERA vez con un error transitorio de FCM (no "token
  // inválido" — un error de ese tipo NO debería bloquear reintentos, a
  // diferencia de un token muerto que si se limpia). ----
  await db.collection('users').doc('presTransient').set({
    role: 'president', teamId: 999, pushEnabled: true, fcmTokens: ['transientTok'], timezone: 'America/Santiago',
  });
  const dedupKeyTransient = 'today_9999_2099-01-01_999';
  const recipientsTransient = [{ uid: 'presTransient', teamId: 999, tokens: ['transientTok'], timezone: 'America/Santiago' }];
  const buildMessageTransient = () => ({ title: 'x', body: 'y', data: {} });

  const originalSend = messaging.sendEachForMulticast;
  let transientShouldFail = true;
  messaging.sendEachForMulticast = async (message) => {
    if (message.tokens.includes('transientTok') && transientShouldFail) {
      sendCalls++;
      return { responses: [{ success: false, error: { code: 'messaging/internal-error' } }], successCount: 0, failureCount: 1 };
    }
    return originalSend(message);
  };

  const r6a = await notifyRecipients(db, messaging, {
    type: 'today', recipients: recipientsTransient, dedupKeyFor: () => dedupKeyTransient, buildMessage: buildMessageTransient,
  });
  console.log('[6] notifyRecipients (envío transitorio fallido):', r6a);
  assert.strictEqual(r6a.notifiedUsers, 0, 'el envío transitorio fallido no debe contar como notificado');
  const dedupDoc6a = await db.collection('notificationRuns').doc(dedupKeyTransient).get();
  assert.strictEqual(dedupDoc6a.exists, false, 'REGRESIÓN FIX 2: NO debe quedar dedup si todos los tokens fallaron transitoriamente');
  console.log('  ✓ envío fallido no registra dedup');

  transientShouldFail = false; // simula que FCM ya no está caído
  const r6b = await notifyRecipients(db, messaging, {
    type: 'today', recipients: recipientsTransient, dedupKeyFor: () => dedupKeyTransient, buildMessage: buildMessageTransient,
  });
  console.log('    notifyRecipients (reintento, ahora funciona):', r6b);
  assert.strictEqual(r6b.skippedDedup, 0, 'debe reintentar: la corrida anterior no dejó dedup');
  assert.strictEqual(r6b.notifiedUsers, 1, 'ahora sí debe notificar');
  const dedupDoc6b = await db.collection('notificationRuns').doc(dedupKeyTransient).get();
  assert.strictEqual(dedupDoc6b.exists, true, 'ahora sí debe quedar dedup, porque el envío tuvo éxito');
  console.log('  ✓ se reintenta en la corrida siguiente, y AHORA sí registra dedup porque tuvo éxito');

  messaging.sendEachForMulticast = originalSend;

  // ---- Escenario 7: formatKickoffForRecipient — la hora que el usuario
  // realmente lee. Sin cobertura hasta ahora, y es justo la pieza que
  // estaba mal (TOURNAMENT_TZ asumía Santiago; el admin que carga
  // scheduledTime es peruano → America/Lima). Lima y Buenos Aires NO
  // comparten offset (UTC-5 vs UTC-3, ninguna de las dos con horario de
  // verano hoy) — si alguien revierte TOURNAMENT_TZ a Santiago (UTC-3/-4),
  // este escenario tiene que fallar. ----
  assert.strictEqual(TOURNAMENT_TZ, 'America/Lima', 'TOURNAMENT_TZ debe ser la zona del admin que carga scheduledTime (Perú), no la del stream');

  const kickoffLima = formatKickoffForRecipient('2026-07-15', '15:00', 'America/Lima');
  assert.strictEqual(kickoffLima, '15:00', 'destinatario en la MISMA zona que el torneo ve la hora tal cual se cargó');

  const kickoffBA = formatKickoffForRecipient('2026-07-15', '15:00', 'America/Argentina/Buenos_Aires');
  assert.strictEqual(kickoffBA, '17:00', 'Buenos Aires (UTC-3) está 2h adelante de Lima (UTC-5): 15:00 cargado → 17:00 para ese destinatario');

  const kickoffInvalidTz = formatKickoffForRecipient('2026-07-15', '15:00', 'Not/AZone');
  assert.strictEqual(kickoffInvalidTz, '15:00', 'timezone inválido/legacy no debe romper el envío: cae a TOURNAMENT_TZ');

  const kickoffNoTz = formatKickoffForRecipient('2026-07-15', '15:00', null);
  assert.strictEqual(kickoffNoTz, '15:00', 'sin timezone guardado (users/{uid}.timezone ausente) también cae a TOURNAMENT_TZ');

  console.log('[7] formatKickoffForRecipient: Lima=' + kickoffLima + ' BuenosAires=' + kickoffBA + ' tzInválido=' + kickoffInvalidTz + ' sinTz=' + kickoffNoTz);
  console.log('  ✓ TOURNAMENT_TZ=America/Lima, offset correcto para un destinatario en otra zona, y fallback sin romper el envío ante timezone inválido/ausente');

  console.log('\n=== TODOS LOS ESCENARIOS DEL GATE PASARON (1-7) ===');
}

run().then(() => process.exit(0)).catch(e => { console.error('FALLÓ:', e); process.exit(1); });
