# TSC Web — Copa Suscriptores

Plataforma web modular para gestionar y seguir torneos de fútbol (PES 4 y PES 5) de la comunidad de **Luis Yuna** ([@LuisYuNa3210](https://www.youtube.com/@LuisYuNa3210)), dueño de la Copa Suscriptores (TSC). Desarrollada por Jimbo ([@TheRationalUser](https://www.youtube.com/@TheRationalUser)).

**YunaCoins** es la moneda del canal de Luis Yuna (vía Streamlabs): el chat acumula puntos viendo el stream y los gasta en mejorar a los jugadores de su equipo (subir stats). Todavía no está integrada a esta web — es una pieza sin terminar, planeada para la 2.0 (ver "Backlog" más abajo).

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
tsc-src/      App (única fuente): index.html, css/, js/, data/, assets/
functions/    Cloud Functions (push FCM) y tests de reglas contra el emulador
firebase/     Reglas de Firestore y Storage, índices
android/      App nativa Capacitor (la misma web empaquetada)
scripts/      Builds (build-web, build-www), sandbox de emuladores, auditores, CSP
docs/         Protocolo de verificación, plan de debugging y reportes por slice
dist/ · www/  Generados por los builds (no se editan)
```

El mapa módulo por módulo de `tsc-src/js/` está en [AGENTS.md](./AGENTS.md#mapa-de-código--tsc-src).

## 🚀 Empezar

### Correr localmente

```bash
npx serve tsc-src
# Abre http://localhost:3000
```

Ojo: `localhost` usa la base **real** de producción. Para probar escrituras, usa el sandbox
de emuladores (copia de la base, admin y presidente de prueba); los pasos están en
[AGENTS.md](./AGENTS.md#correr-localmente).

### Setup Firebase (para deploy)

Requiere cuenta Firebase en [console.firebase.google.com](https://console.firebase.google.com):

1. Crea proyecto Firebase (plan Spark es gratuito)
2. Habilita **Firestore**, **Authentication** (email + Google), **Hosting**, **Cloud Messaging**
3. En un fork, reemplaza la config pública por la de tu proyecto (las de este repo están
   commiteadas a propósito: **no son secretas**, ver `SECURITY.md`):
   ```bash
   cp tsc-src/js/firebase-config.example.js tsc-src/js/firebase-config.js
   cp tsc-src/js/cloudinary.example.js tsc-src/js/cloudinary.js
   ```
   Completa `firebase-config.js` con los datos de **Project settings → Tus apps → SDK setup**
   de tu proyecto Firebase.
4. Despliega reglas Firestore/Storage: `firebase deploy --only firestore:rules,storage`
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
- **App Android (Capacitor)**: APK firmada, distribución por GitHub Releases — ver `docs/android-build.md`
- **Notificaciones push (FCM)**: backend en Cloud Functions, probado de punta a punta en
  producción (envío manual + trigger automático al marcar un partido en vivo)

✅ **Plan de debugging cerrado (2026-10)** — `docs/MACRO_SLICE_DEBUGGING.md`
- Escape único de datos de usuario, CSP en enforce sin `'unsafe-inline'`
- Reglas con tests por rol en el CI, sandbox de emuladores para probar escrituras
- Escrituras atómicas en partidos, cruces, import y calendario
- Temporadas finalizadas archivadas en archivos fijos (menos lecturas por visita)

⏭️ **Backlog / no bloqueante**
- Correo SMTP personalizado para los correos automáticos de Firebase (verificación, reset)
- YunaCoins en tiempo real + flujo de solicitudes presidente→admin (integración Streamlabs)

## 🔧 Arquitectura

- **Capa de datos única**: `db.js` sobre Firestore (sin SDK, la app muestra «Sin conexión»)
- **Modular**: cada feature (competiciones, partidos, brackets) en módulo independiente
- **Sin bundler en desarrollo**: vanilla JS y SDK compat por CDN; `build-web` concatena en
  bundles con hash para el hosting
- **Grafo de código** con graphify (`tsc-src/graphify-out/GRAPH_REPORT.md`)

Ver [AGENTS.md](./AGENTS.md) para la arquitectura completa (capa de datos, arranque, roles,
builds, sandbox).

## 📝 Desarrollo

### Agregar una feature

1. Crea módulo en `tsc-src/js/mifeature.js`
2. Carga en `tsc-src/index.html` en orden de dependencias (los dos builds leen ese orden)
3. Usa `db.js` para CRUD (`dbGetAll`, `dbWriteBatch`, …)
4. Render en una `<div id="mi-feature">` en index.html. Datos de usuario con `escHtml` /
   `escAttr` / `safeImgUrl`; handlers como `data-onclick="fn(…)"` (nunca `onclick=`)
5. Actualiza grafo: `cd tsc-src && graphify update . && python ../scripts/graphify-label.py`

### Tests

- **Reglas y Functions** contra el emulador, desde `functions/`: `npm run test:rules`,
  `npm run test:rules:storage`, `npm run test:emulator`. El CI corre los de reglas.
- **Frontend**: sin test runner. Se verifica en el sandbox de emuladores (`dist` y
  `tsc-src`) siguiendo `docs/PROTOCOLO_VERIFICACION.md`, más los chequeos sin navegador:
  `node scripts/smoke-parity.mjs` (paridad `tsc-src`/`dist`), `node scripts/audit-wiring.mjs`
  (handlers y funciones) y `node scripts/csp.mjs --check`.

### Linting

Sin linter fijo. El código sigue convenciones:
- camelCase para variables/funciones
- UPPER_CASE para constantes
- `_prefijo` para privadas (convención, no enforced)
- Módulos sin export (todo en `window`)

## 📄 Licencia

Privado por ahora. Contacta con el propietario para términos de distribución.

## 👤 Autor

**Desarrollo:** Jimbo ([@TheRationalUser](https://www.youtube.com/@TheRationalUser) en YouTube).
**Producto/dueño de la TSC:** Luis Yuna ([@LuisYuNa3210](https://www.youtube.com/@LuisYuNa3210) en YouTube), creador de YunaCoins y la Copa Suscriptores.

---

## 🔗 Enlaces

- **App en vivo**: https://teamsubscup.web.app
- **GitHub**: https://github.com/theperfectory-blip/tsc-web
- **Docs**: Ver `docs/` para detalles de Firebase migration y setup
