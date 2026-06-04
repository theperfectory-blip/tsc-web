/**
 * Firebase Configuration Template
 *
 * INSTRUCCIONES:
 * 1. Copia este archivo a firebase-config.js
 * 2. Llena los valores con tus credenciales de Firebase
 * 3. NO subas firebase-config.js a GitHub (está en .gitignore)
 *
 * ¿Dónde encontrar los valores?
 * → Firebase Console → tu proyecto → Settings (engranaje) → tab "Apps" → Web
 */

const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456",
  measurementId: "G-ABC123DEF456"
};

// Inicialización
const app = firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore(app);
const auth = firebase.auth(app);

// Habilita persistencia local (opcional pero recomendado)
firebase.firestore().enablePersistence()
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Persistencia desactivada (múltiples tabs)');
    } else if (err.code === 'unimplemented') {
      console.warn('Navegador no soporta persistencia');
    }
  });

// Exporta para otros módulos
window.USE_FIRESTORE = true;
