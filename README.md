# TSC Web — Copa Suscriptores

Plataforma web modular para gestión y seguimiento de torneos de fútbol. Diseñada para **YunaCoins**, una economía virtual creada por el youtuber Jimbo ([@TheRationalUser](https://www.youtube.com/@TheRationalUser)) para PES 4 y PES 5.

Con esta app, presidentes de equipos pueden:
- Ver sus equipos, jugadores y palmarés en tiempo real
- Editar datos de su club (nombre, logo, equipo)
- Cambiar contraseña y acceder a historial de partidos
- Recibir notificaciones de partidos en vivo

Y los administradores pueden:
- Gestionar competiciones, fases, grupos y brackets
- Registrar resultados de partidos en vivo
- Asignar roles y permisos a usuarios
- Exportar e importar datos de la BD

## 🚀 Características

- **Multi-rol**: público (anónimo) · presidente (su equipo) · admin (total)
- **Tiempo real**: onSnapshot en Firestore para panel público y partidos live
- **Gestión completa**: competiciones, fases, grupos, brackets, playoffs, supercopa, historial
- **Generador de fechas**: calendario round-robin automático por grupo, respetando reglas de rotación del torneo
- **Palmarés**: sala de trofeos 3D (Three.js + GLB), reordenar campeones, copa fullscreen, animaciones
- **App Android nativa** (Capacitor): APK firmada, distribución directa fuera de Play Store — ver `docs/android-build.md`
- **Notificaciones push (FCM)**: aviso manual "tu equipo juega hoy" + aviso automático de "próximo partido" al marcar un partido en vivo — backend en Cloud Functions (`functions/`)
- **Soporte móvil**: responsive design de punta a punta
- **Audio**: sonido en vivo (radar ping), efectos UI, configuración volumen
- **Logos**: subida a Cloudinary, optimización de almacenamiento
- **Temas**: dark/light mode persistido en localStorage

## 🛠️ Stack

- **Frontend**: HTML5 / CSS3 (custom properties, Grid, Flexbox) / JavaScript vanilla (async/await, ES2020+), sin bundler
- **Backend**: Firebase (Firestore + Auth + FCM + Hosting) + Cloud Functions (Node, `functions/`) para el envío de push
- **App nativa**: Capacitor (Android), `android/` — misma web empaquetada, sin UI nativa separada
- **CDN**: Firebase SDK v12.14.0 (compat), Cloudinary (logos)
- **Dev**: `npx serve` para local, GitHub Actions CI/CD (deploy de Hosting), graphify (code analysis)

## 📁 Estructura

```
tsc-src/                      # ⭐ App principal (modular)
  ├── index.html              # Shell: topbar, sidebar, páginas, modales
  ├── css/
  │   ├── variables.css       # Colores, tipografía, temas dark/light
  │   ├── layout.css          # Topbar, sidebar, main grid
  │   ├── components.css      # Botones, modales, tablas, animaciones
  │   ├── sorteo.css          # Módulo de sorteo
  │   └── palmares.css        # Sala de trofeos
  ├── js/
  │   ├── state.js            # Estado global (season, mode)
  │   ├── db.js               # Firestore CRUD (dual-mode compatible)
  │   ├── auth.js             # Autenticación Firebase (login, perfil)
  │   ├── ui-utils.js         # Modal, toast, theme, settings
  │   ├── nav.js              # Navegación public/admin
  │   ├── live.js             # Gestor de suscripciones en tiempo real
  │   ├── livematch.js        # Modal de partidos en vivo
  │   ├── competitions.js     # CRUD competiciones
  │   ├── phases.js           # Gestión de fases
  │   ├── standings.js        # Clasificaciones + drag-drop criterios
  │   ├── matches.js          # Registro de partidos
  │   ├── bracket.js          # Render de brackets eliminatorios
  │   ├── playoff.js          # Formato playoff/supercopa
  │   ├── teams.js            # CRUD equipos + colores
  │   ├── coins.js            # Gestión de YuNaCoins
  │   ├── seasons.js          # Gestión de temporadas
  │   ├── profile.js          # Perfil usuario (presidente)
  │   ├── users-admin.js      # Panel admin de usuarios
  │   ├── history.js          # Historial H2H
  │   ├── palmares.js         # Sala de trofeos (champions)
  │   ├── sorteo.js           # Módulo de sorteo animado
  │   ├── sounds.js           # SFX (Web Audio API)
  │   ├── color-picker.js     # Selector color
  │   ├── public.js           # Vistas públicas
  │   ├── data.js             # Export/import
  │   └── cloudinary.js       # Upload de logos
  ├── data/
  │   ├── historial-seed.json
  │   └── palmares-seed.json
  └── assets/
      ├── chibi/              # Sprites sorteo (8 frames)
      └── sounds/             # drumroll.mp3

functions/                    # Cloud Functions (backend de notificaciones push)
  └── lib/                    # notifyStreamToday, notifyStartupContinuation, onMatchWentLive

android/                      # App nativa Capacitor (misma web, empaquetada)
  └── app/src/main/           # Manifest, recursos nativos (ícono, splash, notificación)

firebase/                     # Reglas de seguridad (Firestore + Storage)
  ├── firestore.rules
  └── storage.rules

scripts/                      # Utilidades de build (build-www.mjs, conversión de imágenes)

releases/android/             # APKs firmadas + RELEASE_NOTES.md por versión

docs/                         # Documentación
  ├── android-build.md        # Ciclo debug/release de la app Android
  ├── android-push-notifications.md
  ├── FIREBASE_MIGRATION_PLAN.md
  └── firebase-setup-steps.md
```

## 🚀 Empezar

### Correr localmente

```bash
cd tsc-src
npm install -g serve
serve .
# Abre http://localhost:3000
```

### Setup Firebase (para deploy)

Requiere cuenta Firebase en [console.firebase.google.com](https://console.firebase.google.com):

1. Crea proyecto Firebase (plan Spark es gratuito)
2. Habilita **Firestore**, **Authentication** (email + Google), **Hosting**, **Cloud Messaging**
3. Copia las plantillas y completa tus valores reales (ambas están gitignored — nunca se
   pisan las de otro dev/fork, y **no son secretas**: ver `SECURITY.md`):
   ```bash
   cp tsc-src/js/firebase-config.example.js tsc-src/js/firebase-config.js
   cp tsc-src/js/cloudinary.example.js tsc-src/js/cloudinary.js
   ```
   Completa `firebase-config.js` con los datos de **Project settings → Tus apps → SDK setup**
   de tu proyecto Firebase.
4. Despliega reglas Firestore/Storage: `firebase deploy --only firestore:rules,storage:rules`
   (ver `DEPLOY.md`)
5. Configura **Cloudinary** (gratis) para logos:
   - Crea cuenta en cloudinary.com
   - Crea un *unsigned upload preset*
   - Completa `cloudName`/`uploadPreset` en `js/cloudinary.js`

### Deploy a Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase deploy --project=TU_PROJECT_ID
```

O automático con GitHub Actions (ver `.github/workflows/firebase-hosting.yml`).

## 📊 Estado actual

✅ **Completado**
- Backend Firestore con IDs enteros autoincrementales
- Auth multi-rol (público/president/admin), reglas de seguridad por rol
- Partidos en vivo con actualizaciones tiempo real
- Generador de calendario round-robin por grupo (botón "Generar fechas")
- Calendario público con partido en vivo del momento y siguiente partido
- UI responsive móvil (375px+), audio (radar ping, sonidos UI)
- Logos vía Cloudinary, palmarés con sala de trofeos 3D
- Rediseño visual "motion site" desplegado en producción
- **App Android (Capacitor)**: APK firmada, distribución directa — ver `releases/android/`
- **Notificaciones push (FCM)**: backend en Cloud Functions, probado de punta a punta en
  producción (envío manual + trigger automático al marcar un partido en vivo)

⏳ **En desarrollo**
- Popup promocional de descarga de la APK (web pública)
- Merge del backend de push a `main` (vive en `feature/capacitor-android`)

⏭️ **Backlog / no bloqueante**
- Correo SMTP personalizado para los correos automáticos de Firebase (verificación, reset)
- YunaCoins en tiempo real + flujo de solicitudes presidente→admin (integración Streamlabs)

## 🔧 Arquitectura

- **Dual-mode DB**: `db.js` soporta Firestore (cloud) e IndexedDB (local) con mismas firmas
- **Modular**: cada feature (competiciones, partidos, brackets) en módulo independiente
- **No-build**: vanilla JS, sin bundler, solo compat SDK por CDN
- **GraphQL-inspired**: código indexable con graphify para análisis de dependencias

Ver [CLAUDE.md](./CLAUDE.md) para documentación completa de módulos.

## 📝 Desarrollo

### Agregar una feature

1. Crea módulo en `tsc-src/js/mifeature.js`
2. Carga en `tsc-src/index.html` en orden de dependencias
3. Usa `db.js` para CRUD (compatible con Firestore/IndexedDB)
4. Render en una `<div id="mi-feature">` en index.html
5. Actualiza grafo: `cd tsc-src && graphify update .`

### Tests

El frontend es una SPA sin test runner — pruébalo manualmente con `serve` + DevTools, o en
prod (https://teamsubscup.web.app). El backend de notificaciones (`functions/`) sí tiene un
harness reproducible contra el emulador: `cd functions && npm run test:emulator`.

### Linting

Sin linter fijo. El código sigue convenciones:
- camelCase para variables/funciones
- UPPER_CASE para constantes
- `_prefijo` para privadas (convención, no enforced)
- Módulos sin export (todo en `window`)

## 📄 Licencia

Privado por ahora. Contacta con el propietario para términos de distribución.

## 👤 Autor

Jimbo ([@TheRationalUser](https://www.youtube.com/@TheRationalUser) en YouTube) — creador de YunaCoins y la Copa Suscriptores.

---

## 🔗 Enlaces

- **App en vivo**: https://teamsubscup.web.app
- **GitHub**: https://github.com/theperfectory-blip/tsc-web
- **Docs**: Ver `docs/` para detalles de Firebase migration y setup
