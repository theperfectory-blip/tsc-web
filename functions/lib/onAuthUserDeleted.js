'use strict';
/* ============================================================
   Limpieza de perfiles huérfanos (slice 3.7, D7)
   ------------------------------------------------------------
   Cuando se borra una cuenta en Firebase Auth (consola o Admin SDK), el
   documento users/{uid} quedaba: seguía vinculado a un equipo
   (users.teamId, de donde sale el "presidente" que ve el admin), con su
   @usuario reservado y con tokens FCM de un dispositivo que ya no es suyo.
   Esta función los borra. Es el único camino que deja huérfanos: la app no
   tiene botón de "borrar cuenta".

   Trigger de Auth de 1.ª gen (Auth no tiene trigger de 2.ª gen).
   ============================================================ */

const { getFirestore } = require('firebase-admin/firestore');
const functions = require('firebase-functions/v1');

/* Lógica pura, probada contra el emulador (test/cleanup-user.js). Devuelve
   qué borró. Idempotente: si el perfil ya no está, no hace nada. */
async function cleanupDeletedUser(db, uid) {
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  const out = { profile: false, username: null };
  if (!snap.exists) return out;
  const data = snap.data() || {};
  const batch = db.batch();
  // La reserva solo se libera si sigue siendo de esta cuenta.
  if (typeof data.username === 'string' && data.username) {
    const claim = db.collection('usernames').doc(data.username);
    const claimSnap = await claim.get();
    if (claimSnap.exists && claimSnap.data().uid === uid) {
      batch.delete(claim);
      out.username = data.username;
    }
  }
  batch.delete(ref);
  await batch.commit();
  out.profile = true;
  return out;
}

const onAuthUserDeleted = functions.auth.user().onDelete(async (user) => {
  const res = await cleanupDeletedUser(getFirestore(), user.uid);
  console.log(`[onAuthUserDeleted] ${user.uid}: perfil ${res.profile ? 'borrado' : 'ya no existía'}${res.username ? `, @${res.username} liberado` : ''}`);
});

module.exports = { onAuthUserDeleted, cleanupDeletedUser };
