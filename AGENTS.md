# TSC Web · Copa Suscriptores

Web y APK de gestión del torneo de fútbol TSC (Copa Suscriptores): vista
pública (palmarés, competiciones, bracket, calendario, sorteo, historial) y
panel admin. Vanilla JS sin framework ni bundler en desarrollo.

Instrucciones canónicas para cualquier agente (Codex, Claude, etc.).
`CLAUDE.md` importa este archivo y agrega solo lo específico de Claude.

---

## Arquitectura

- **Backend:** Firebase, proyecto `tsc-web-yuna`.
  - Firestore (datos), Auth (cuentas y roles), Cloud Functions en
    `functions/` (push FCM), Storage (trofeos).
  - Imágenes subidas por usuarios (logos): Cloudinary (`js/cloudinary.js`).
  - Reglas en `firebase/firestore.rules` y `firebase/storage.rules`. Se
    despliegan **a mano** (`firebase deploy --only firestore:rules`); el CI
    no las despliega.
- **Capa de datos (`js/db.js`):** API única `dbGetAll / dbGet / dbAdd /
  dbAddMany / dbPut / dbDelete / dbDeleteMany / dbSubscribe / getForSeason`.
  - `USE_FIRESTORE` (lo define `firebase-config.js`) elige el backend. Si el
    SDK de Firebase no carga, queda en `false` y la app cae a **IndexedDB**
    local (`TSC_v4`). Esa rama está bajo revisión (D6 / H-23 del plan de
    debugging).
  - **Espejo en memoria:** la primera lectura de una colección abre un
    `onSnapshot` y las siguientes salen de memoria. Cae a lectura directa si
    el listener falla, no hay confirmación del servidor en 10 s o el
    snapshot viene de caché. Se cierra tras 3 min sin uso.
    `dbMirrorInvalidate(...stores)` después de transacciones.
    `window.TSC_FS_MIRROR = false` lo apaga en caliente.
  - IDs enteros autoincrementales vía contadores en `_counters/{store}`.
- **Arranque** (`ui-utils.js`, evento `load`): `initDB` → seeds y
  migraciones (`seedInitialData`, `seedHistoryIfEmpty`,
  `seedPalmaresIfEmpty`, `migrate*`) → restaurar temporada/página/modo
  desde `localStorage` → `loadSeasons` → `setMode('public')`.
- **Roles** (`users/{uid}.role`): anónimo (solo lectura), `president`
  (edita `name`/`logo` de su propio equipo, salvo `lockEdits`), `admin`
  (todo). El auto-registro crea `president` sin equipo.

## Pipeline de build

`tsc-src/` es la **única fuente**. Nunca editar `dist/` ni `www/`.

| Destino | Script | Qué hace |
|---|---|---|
| `dist/` → Firebase Hosting | `node scripts/build-web.mjs` | Concatena los `<script>` y CSS de `index.html` en bundles con hash (`bundles/`), en el mismo orden. Corre como predeploy y en el CI (`.github/workflows/firebase-hosting.yml`, deploy al hacer merge a `main`) |
| `www/` → APK (Capacitor) | `node scripts/build-www.mjs` (`npm run sync:android` incluye `cap sync`) | Copia por whitelist: `index.html`, `manifest.webmanifest`, `css/`, `js/`, `assets/`, `data/` |

- Exclusión compartida en `scripts/build-exclude.mjs`: `*.md`, dotfiles,
  `docs/`, `trophies-svg/`, `graphify-out/`, `trophies-upload/`, `_cmp/`.
  **Nada que no se cargue en runtime vive dentro de `tsc-src/`** (los docs
  y reportes van en `docs/`).
- Diferencia a tener en cuenta: en `dist`, un error al cargar un archivo
  corta el resto de **su bundle**. Verificar las dos variantes.
- Un script nuevo se agrega como `<script>` en `tsc-src/index.html`; los
  dos builds leen ese orden.
- Android: `docs/android-build.md`. Las releases se publican en GitHub
  Releases, de donde lee el actualizador (`js/updater.js`).

## Correr localmente

Configs en `.claude/launch.json`:

- `tsc-src`: `npx serve tsc-src` → `http://localhost:3000`.
- `hosting-dist`: emulador de hosting sobre `dist/` en `:5050` (correr
  antes `node scripts/build-web.mjs`).

**localhost = producción**, salvo en el sandbox. `tsc-src` y `hosting-dist`
pegan contra el Firestore real: toda verificación ahí sigue
[`docs/PROTOCOLO_VERIFICACION.md`](docs/PROTOCOLO_VERIFICACION.md) (activar
`window.__TSC_READONLY__ = true` después del `load`, sin flujos de
escritura).

**Sandbox (emuladores, MS-2.1).** Los flujos de escritura se prueban acá:

1. `node scripts/emu-snapshot.mjs`: copia real en `sandbox/` (ignorado por
   git). Lee la base de producción (solo GET) y copia el sitio con 2 de las
   11 copas y el 20 % de las fotos de la vitrina.
2. `tsc-emu-backend` (`node scripts/emu-start.mjs`): emuladores de
   Firestore `:8080` y Auth `:9099`, con Java en el PATH.
3. `node scripts/emu-seed.mjs sandbox/backup.json --clean`: carga la base y
   crea admin y presidente de prueba (`scripts/emu-credentials.example.json`).
4. `tsc-emu`: sirve `sandbox/site` en `:3001`.

`firebase-config.js` entra en modo emulador solo en `localhost` con
`?emu=1` o en el puerto 3001. En ese modo Cloudinary se simula y la callable
de Functions va a `:5001`.

Tests (emulador de Firestore, desde `functions/`): `npm run test:emulator`
(Functions) y `npm run test:rules` (reglas de `teams`).

## Mapa de código — `tsc-src/`

```
index.html          Shell: topbar, sidebars, páginas, modales globales y el orden de <script>
css/                variables · layout · components · redesign · palmares · calendar · sorteo
data/               historial-seed.json, palmares-seed.json
assets/             imágenes, sonidos, trofeos .glb, vendor/ (three.js, draco)
js/
  Núcleo
    state.js        STATE {season, mode}, STORES, db
    sanitize.js     escHtml, escAttr, safeImgUrl (helper único de escape)
    firebase-config.js, cloudinary.js   Config pública (+ sus .example.js)
    db.js           Capa de datos (ver Arquitectura)
    ui-utils.js     Modales, toasts, confirm, tema, ajustes, seeds y arranque
    nav.js          setMode, goPublicPage / goAdminPage, render por página, temporadas
    redesign-shell.js  Topnav pública y scroll por secciones
    motion.js, cursor-fx.js, sounds.js   Animación, estela de cursor, SFX
  Cuentas
    auth.js         Login, registro, recuperación, rol del usuario
    profile.js      Perfil y panel del presidente (nombre y logo de su equipo)
    users-admin.js  Admin: asignar rol, equipo, lockEdits
    push.js         Push FCM (opt-in, tokens)
    updater.js, apk-promo.js   Actualizador y promo de la APK
  Torneo (admin + público)
    seasons.js      Crear, cambiar, finalizar, reactivar, borrar temporadas
    competitions.js CRUD de competiciones (COMP_TYPES, PHASE_TYPES)
    phases.js       Fases por competición, publicar; renderPubComps
    standings.js    Tablas de grupo, criterios de desempate, asignación a grupos
    matches.js      Partidos por grupo / jornada / ronda y resultados
    fixture-gen.js  Generador automático de fechas (fases de grupos)
    bracket.js      Cuadros eliminatorios, referencias de slots, logos
    playoff.js      Playoff ida y vuelta, supercopa
    public-bracket.js  Render público de bracket y playoff
    public.js       Panel público, carrusel competición/fase
    teams.js        CRUD de equipos y vista pública
    color-picker.js Rueda de colores de equipo
    coins.js        YuNaCoins: individual, masivo, historial
    data.js         Export / import de la base
  Secciones
    palmares.js     Sala de Trofeos 3D (three.js) + matriz admin
    history.js      Historial, H2H, tabla histórica
    calendar.js     Calendario, cuenta regresiva, etiquetas de día
    sorteo.js       Sorteo en vivo (bombos, chibi, sonido)
    live.js, livematch.js   Tiempo real y centro de partido en vivo
```

Fuera de `tsc-src/`: `functions/` (Cloud Functions: `notifyStreamToday`,
`onMatchWentLive`, `notifyStartupContinuation`), `firebase/` (reglas e
índices), `android/` (proyecto Capacitor), `scripts/` (builds y
utilidades), `docs/` (protocolo, planes, reportes).

## Trabajo en curso

El plan vigente es [`docs/MACRO_SLICE_DEBUGGING.md`](docs/MACRO_SLICE_DEBUGGING.md).
Cada sesión ejecuta un slice: leer solo esa sección y los hallazgos que
cita. Reportes en `docs/reportes/MS-<n>.<m>.md`.

## UI

- **Sin emojis en la UI.** Íconos SVG inline estilo Lucide: `stroke`, no
  `fill`, `currentColor`, `stroke-width` 1.7–2.2, `stroke-linecap="round"`,
  `stroke-linejoin="round"`. Aplica a botones, badges, toasts, modales y
  hints.

## Seguridad (ver [`SECURITY.md`](SECURITY.md))

### Qué se commitea y qué no
- `tsc-src/js/firebase-config.js` y `tsc-src/js/cloudinary.js` **sí están
  en git, a propósito**: son config pública del cliente (la seguridad la
  dan las reglas). No agregarles secretos de servidor.
- **Nunca** commitear: service accounts (`*serviceAccount*.json`,
  `*-firebase-adminsdk-*.json`), `android/app/keystore.properties`,
  `*.jks`/`*.keystore`, `.env*`, contraseñas o tokens.
- Nunca escribir credenciales de servidor inline en código.

### Código
- **Escape obligatorio:** todo `innerHTML` con datos que puede escribir un
  rol no admin (`teams.name`, `teams.logo`, `users.displayName`,
  `users.username`, `users.photoURL`) pasa por `escHtml` / `escAttr` /
  `safeImgUrl` de `sanitize.js`. Hay copias locales viejas (`_esc`,
  `_uaEsc`…) pendientes de unificar; en código nuevo usar el helper.
- Reglas Firestore: no tocar `isAdmin()` / roles sin tests en el emulador.
  Allowlist de campos (`hasOnly`), nunca blocklist.
- No dejar `TODO: fix security` sin issue: documentarlo en `SECURITY.md`
  o en el plan de debugging.

### Checklist antes de cada commit
- [ ] Sin service accounts, keystores ni `.env` en el staging area
- [ ] Ninguna credencial de servidor hardcodeada en los archivos modificados
- [ ] `innerHTML` con datos de usuario usa el helper de `sanitize.js`
- [ ] Sin `TODO: fix security` sueltos
- [ ] Nada nuevo dentro de `tsc-src/` que no se cargue en runtime
