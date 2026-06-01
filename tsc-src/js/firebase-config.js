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
  apiKey:            "AIzaSyDmKBTE3EJ6tlgqC7fesoY7DUHnpNRQj9k",
  authDomain:        "tsc-web-yuna.firebaseapp.com",
  projectId:         "tsc-web-yuna",
  storageBucket:     "tsc-web-yuna.firebasestorage.app",
  messagingSenderId: "1063027550773",
  appId:             "1:1063027550773:web:4c850c60f06b70d6775f7c",
  measurementId:     "G-PSG9HJP98E",
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
