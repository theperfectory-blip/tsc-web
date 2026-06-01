# Fase 0 — Setup del proyecto Firebase (checklist)

Pasos que haces **tú** en la consola (con tu cuenta Google). Cuando termines,
me pasas el bloque de config y yo cableo todo (Fase 1).

## 1. Crear el proyecto
1. Ir a **https://console.firebase.google.com**
2. **Add project** → nombre: `tsc-web` (o el que quieras)
3. **Google Analytics**: puedes **desactivarlo** (no lo necesitamos ahora)
4. Crear → esperar a que termine

## 2. Registrar una app web
1. En el dashboard del proyecto, clic en el ícono **`</>`** (Web)
2. Apodo: `tsc-web` · **NO** marcar "Firebase Hosting" todavía
3. **Register app**
4. Te muestra un bloque `const firebaseConfig = { ... }` →
   **cópialo entero y pégamelo en el chat** (es público, seguro)

## 3. Activar Firestore
1. Menú izquierdo → **Build → Firestore Database**
2. **Create database**
3. Modo: **Start in production mode** (las reglas las subo yo después)
4. Ubicación: la más cercana (ej. `southamerica-east1` / `us-central`)
5. Enable

## 4. Activar Authentication
1. Menú izquierdo → **Build → Authentication** → **Get started**
2. Pestaña **Sign-in method** → habilitar **Email/Password** → Save
   *(Google sign-in queda como decisión abierta #3)*

## 5. (Opcional, para deploy desde tu PC más adelante)
```powershell
npm install -g firebase-tools
firebase login
firebase use --add        # elegir el proyecto tsc-web
# luego yo puedo: firebase deploy --only firestore:rules
```

---

## ✅ Cuando termines, mándame:
- El bloque `firebaseConfig { ... }` del paso 2

Con eso relleno `tsc-src/js/firebase-config.js`, cableo el SDK en `index.html`,
reescribo `db.js` sobre Firestore y migramos los datos (Fases 1–2).
