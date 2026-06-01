'use strict';
/* ============================================================
   CONFIG DE FIREBASE
   ------------------------------------------------------------
   ⚠️ Esta config es PÚBLICA por diseño — es SEGURO commitearla.
   La seguridad NO depende de ocultar esto, sino de las reglas
   de Firestore (firebase/firestore.rules). No es una contraseña.

   👉 Reemplaza los "TODO" con los valores reales que te da la
   consola de Firebase (Project settings → Tus apps → SDK setup).
   ============================================================ */
const FIREBASE_CONFIG = {
  apiKey:            "TODO",
  authDomain:        "TODO.firebaseapp.com",
  projectId:         "TODO",
  storageBucket:     "TODO.firebasestorage.app",
  messagingSenderId: "TODO",
  appId:             "TODO",
};

/* Flag de activación: la app sigue usando IndexedDB mientras la
   config tenga "TODO". Cuando pegues los valores reales, se activa
   Firestore automáticamente (lo cablea db.js en la Fase 1). */
let USE_FIRESTORE = false;
if (typeof firebase !== 'undefined' && FIREBASE_CONFIG.projectId !== 'TODO') {
  firebase.initializeApp(FIREBASE_CONFIG);
  USE_FIRESTORE = true;
  console.log('[firebase] inicializado · proyecto:', FIREBASE_CONFIG.projectId);
}
