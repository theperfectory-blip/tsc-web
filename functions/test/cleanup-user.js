'use strict';
/* Test de la limpieza de perfiles huérfanos (slice 3.7) contra el emulador
   de Firestore. Usa la lógica pura (cleanupDeletedUser) y verifica además que
   el trigger exportado exista como función de Auth.
     cd functions && npm run test:cleanup */
const assert = require('assert');
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'demo-tsc-web';
const indexExports = require('../index');   // inicializa la app de Admin
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();
const { cleanupDeletedUser, onAuthUserDeleted } = require('../lib/onAuthUserDeleted');

(async () => {
  assert.strictEqual(typeof onAuthUserDeleted, 'function', 'el trigger se exporta como función');
  assert.ok(indexExports.onAuthUserDeleted, 'index.js exporta onAuthUserDeleted');

  await db.doc('users/u1').set({ role: 'president', teamId: 5, username: 'mio', fcmTokens: ['t1'] });
  await db.doc('usernames/mio').set({ uid: 'u1' });
  await db.doc('users/u2').set({ role: 'president', teamId: null, username: 'compartido' });
  await db.doc('usernames/compartido').set({ uid: 'otro' });   // la reserva es de otra cuenta
  await db.doc('users/u3').set({ role: 'president', teamId: null, username: null });

  let r = await cleanupDeletedUser(db, 'u1');
  assert.deepStrictEqual(r, { profile: true, username: 'mio' });
  assert.strictEqual((await db.doc('users/u1').get()).exists, false, 'borra el perfil (equipo y tokens)');
  assert.strictEqual((await db.doc('usernames/mio').get()).exists, false, 'libera la reserva');

  r = await cleanupDeletedUser(db, 'u2');
  assert.deepStrictEqual(r, { profile: true, username: null });
  assert.strictEqual((await db.doc('usernames/compartido').get()).exists, true, 'no libera una reserva ajena');

  r = await cleanupDeletedUser(db, 'u3');
  assert.deepStrictEqual(r, { profile: true, username: null }, 'sin @usuario');

  r = await cleanupDeletedUser(db, 'no-existe');
  assert.deepStrictEqual(r, { profile: false, username: null }, 'idempotente');

  console.log('cleanup-user: 9/9 verificaciones OK');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
