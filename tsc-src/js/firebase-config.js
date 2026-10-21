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

/* Flag de activación: queda en false si el SDK de Firebase no cargó (o la
   config tiene "TODO"). Sin Firestore la app no arranca: muestra «Sin
   conexión» (db.js, initDB; D6). */
let USE_FIRESTORE = false;
if (typeof firebase !== 'undefined' && FIREBASE_CONFIG.projectId !== 'TODO') {
  firebase.initializeApp(FIREBASE_CONFIG);
  /* Sandbox (MS-2.1): en localhost, con ?emu=1 o en el puerto 3001 (config
     tsc-emu de launch.json, que no puede pasar query). Firestore y Auth van
     al emulador local. Tiene que correr antes de cualquier uso de
     firestore()/auth(). Si el emulador está apagado, las peticiones fallan
     en local: nunca caen a producción. */
  const _emu = ['localhost', '127.0.0.1'].includes(location.hostname)
    && (new URLSearchParams(location.search).get('emu') === '1' || location.port === '3001');
  if (_emu) {
    // useEmulator solo lanza si la instancia ya se usó; acá no puede pasar.
    // Si lanzara, USE_FIRESTORE queda en false y la app muestra «Sin conexión».
    firebase.firestore().useEmulator('localhost', 8080);
    firebase.auth().useEmulator('http://localhost:9099', { disableWarnings: true });
    window.__TSC_EMULATOR__ = true;
    console.warn('[firebase] MODO EMULADOR · Firestore :8080 · Auth :9099 (sin producción)');
  }
  USE_FIRESTORE = true;
  console.log('[firebase] inicializado · proyecto:', FIREBASE_CONFIG.projectId);
}
