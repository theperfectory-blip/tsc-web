# MS-6.2 · Dependencias y MS-6.3 · Android · 2026-10-11

Hallazgos que cierra: H-35 (CI con Node 20). Más el aviso crítico de
`@capacitor/android` en el `npm audit` de la raíz (nuevo, H-37). Todo lo
verificable sin un teléfono físico está hecho; lo que falta es la prueba en
dispositivo real y publicar el release (M-10).

## 6.2 · Dependencias

### `npm audit` de la raíz

| | Antes | Después |
|---|---|---|
| Todo (con devDependencies) | 18 (3 críticas, 12 altas, 3 moderadas) | **3 moderadas** |
| Producción (`--omit=dev`) | 0 | 0 |

- **Capacitor 8.4.1 → 8.5.3** (`@capacitor/android`, `core`, `cli`; mínimo
  `^8.5.1` en `package.json`). GHSA-rvm3-566m-v7fv (crítica, CVSS 9.3):
  la navegación del WebView dejaba cargar, en el origen de la app, el
  contenido de una URL arbitraria a través de la ruta interna del proxy
  HTTP. **`@capacitor/android` no es solo una herramienta de build: su
  código nativo se compila dentro del APK.** El aviso cubre `>=8.0.0 <8.4.3`
  y también **8.5.0** (parchea en 8.5.1), por eso el mínimo es 8.5.1 y no
  8.4.3. Compila y se probó en emulador (abajo).
- `npm audit fix` (sin `--force`): `tar`, `@xmldom/xmldom`, `handlebars`,
  `brace-expansion`, `minimatch`, `protobufjs`, `replace`.
- **`@capacitor/assets` fuera de `devDependencies`.** Ningún script ni el CI
  lo usan; solo sirve para regenerar ícono y splash a mano. Arrastraba
  avisos sin parche (`sharp`, un `@capacitor/cli` 5.x anidado con `tar` 6,
  que era la crítica, y `@trapezedev/project`). Se usa con `npx` cuando
  haga falta (nota nueva en `docs/android-build.md`).
- **`firebase` (npm) fijado en `12.14.0` exacto**, la misma versión que
  cargan los 4 `<script>` de `gstatic` en `index.html`. No se usa en ningún
  script ni se publica (la web carga el SDK compat desde el CDN): quedó
  como marca de versión. `npm audit` le marcaba `@grpc/grpc-js` (Node, no
  llega a la web) y proponía **bajar a firebase 9.14.0**, un `--force` que
  rompería la coherencia. Se agregó `overrides: { "@grpc/grpc-js":
  "^1.14.6" }` para dejar la auditoría limpia sin tocar la versión.
- **Quedan 3 moderadas**: `uuid` 7.0.3 → `xcode` → `@capacitor/cli`.
  `xcode` edita proyectos iOS (la CLI lo carga desde `util/xcode.js`; acá
  no hay proyecto iOS); el defecto está en `uuid` v3/v5/v6 con `buf`, y
  `xcode` solo llama a `uuid.v4()`. Sin parche upstream. Aceptado.
- `npm ci --dry-run`: el lock es consistente. `functions/`: sigue en 0.

### Coherencia de versiones

| Pieza | Referencia | Resultado |
|---|---|---|
| SDK Firebase (4 scripts `gstatic` en `index.html`) | `package.json` `firebase` | Los 4 en 12.14.0 = `12.14.0` exacto |
| `assets/vendor/three/three.min.js`, `GLTFLoader.js`, `DRACOLoader.js` | `three@0.147.0` (`build/` y `examples/js/loaders/`) | SHA-256 **idénticos**; `REVISION = "147"` |
| `draco/draco_decoder.wasm`, `draco_wasm_wrapper.js` | `three/examples/js/libs/draco/gltf/` | Idénticos |
| `draco/draco_decoder.js` | mismo directorio `gltf/` | Idéntico salvo 4 bytes de fin de línea (normalización de git) |

Hay versiones nuevas (`firebase` 13.0.0, `three` 0.186). No se suben: son
saltos de versión mayor del SDK y de three que piden su propio slice con
pruebas de UI.

### H-35

`firebase-hosting.yml`: `node-version` 20 → 22 (igual que `rules-tests.yml`).
`node scripts/build-web.mjs` corrido con Node 22.23.3 y con 25.7.0 produce
el **mismo `dist/`** (hash del árbol `c4de1bbb351ba6d4`).

## 6.3 · Android

Entorno: JDK 21, Gradle 8.14.3, AGP 8.13, SDK 36 (`D:\AndroidData\Sdk`).
En Windows hizo falta `TMP=C:\Temp` y `TEMP=C:\Temp`: sin eso Gradle falla
con `Unable to establish loopback connection` (queda documentado).

### Build, empaquetado y firma

- `node scripts/build-www.mjs`: `www/` sin ningún nombre de la exclusión
  compartida (`*.md`, dotfiles, `docs`, `graphify-out`, `trophies-*`, `_cmp`,
  `node_modules`). La `<meta>` de CSP está inyectada después de
  `<meta charset>`; `node scripts/csp.mjs --check` OK.
- `npx cap sync android`: el contenido de `android/` no cambia (git solo
  veía diferencias de fin de línea; se descartaron).
- `gradlew :app:assembleDebug :app:assembleRelease` con Capacitor 8.5.3:
  **BUILD SUCCESSFUL**. `aapt2 dump badging`: `web.teamsubscup.app`,
  `versionCode 18`, `versionName 1.6.2`, `targetSdk 36`. Permisos:
  `INTERNET`, `POST_NOTIFICATIONS`, `REQUEST_INSTALL_PACKAGES` y los que
  suma el merge de plugins (`ACCESS_NETWORK_STATE`, `WAKE_LOCK`,
  `c2dm.RECEIVE`, `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`). Ninguno nuevo.
- **El bundle web dentro del APK coincide con `tsc-src/`**: 104 archivos
  (css, js, assets, data) comparados por SHA-256, 0 diferencias, ninguno
  excluido adentro; el `index.html` del APK es el de `www/`.
- **Firma.** Sin `keystore.properties` sale `app-release-unsigned.apk`
  (falla segura, como dice `SECURITY.md`). Con un keystore descartable
  generado para la prueba, `assembleRelease` produce un APK que
  `apksigner verify` acepta (esquema v2). **No se usó la clave real**: el
  gate del SHA-256 del certificado (`docs/android-build.md`) lo corre el
  dueño sobre su APK. El keystore y su `keystore.properties` temporales
  se borraron.

### Emulador

AVD descartable (`tsc_test`, misma imagen API 36.1 con Play Store, creado y
borrado en esta sesión; **el emulador del dueño no se tocó**). APK debug
(misma web y misma `<meta>` que el release; la release no escribe consola).
Producción en solo lectura (`__TSC_READONLY__ = true`); sin iniciar sesión.

- La app arranca desde `https://localhost`: `[firebase] inicializado`,
  `[db] backend: Firestore (nube)`, historial cargado (2.389).
- Recorrido de las 6 páginas públicas (`panel`, `equipos`, `calendario`,
  `historial`, `sorteo`, `palmares`): sin errores de consola.
- Sala de Trofeos: `_palmLoadThreeLocal()` carga three 147 + GLTFLoader +
  DRACOLoader, y `copa_1.glb` (comprimido con Draco, ~500 mil triángulos)
  se decodifica con el wasm en un worker `blob:` (12 s en un emulador sin
  GPU). La política de la `<meta>` alcanza para todo eso.
- **Única violación de CSP**: `Refused to load the script
  'https://apis.google.com/js/api.js?…'` (firebase-auth-compat). Ver H-38.
  `onAuthStateChanged` dispara igual: Auth arranca.
- **Actualizador contra el `update.json` real** (último release v1.6.2):
  `CapacitorHttp` devuelve 200 y `UPDATER.check()` da `ok: true`,
  `remoteCode 18` = `currentCode 18` → `hasUpdate: false`. Forzando
  `getInfo().build = "17"`: `hasUpdate: true`, `apkUrl` en
  `https://github.com/…/TEAM-SUBS-CUP.apk`. Corre sobre Capacitor 8.5.3,
  que cambió el manejo del proxy HTTP interno, y no se rompió. El manifiesto
  publicado (versionCode 18 / 1.6.2) coincide con `build.gradle`. La UI
  escapa `versionName` y `notes` (`_updEsc`) y el plugin nativo solo acepta
  `https://github.com`. `canInstall` da `false` (permiso sin conceder,
  esperado). **No se ejercitó la descarga ni la instalación** (el código
  nativo no cambió).
- **Push, hasta donde llega un emulador:** con `POST_NOTIFICATIONS`
  concedido, `PushNotifications.register()` devuelve un token FCM (142
  caracteres). Prueba que `google-services.json`, la API key restringida de
  M-4 (el SHA-1 de debug está autorizado) y el plugin sobre Capacitor 8.5.3
  registran bien. No se probó la **entrega** de un mensaje ni el guardado
  del token con sesión (`users/{uid}.fcmTokens`): requieren un dispositivo
  real y la cuenta del dueño.

### Proceso de subida de versión

Documentado en `docs/android-build.md` («Subir de versión»): regla de
`versionCode` (entero, +1 por release, único dato que compara el
actualizador), `versionName` solo informativo, mensaje del commit de bump,
build, verificación sobre el binario (`aapt2`, `apksigner`) y comprobación
del `update.json`.

## Pendientes / hallazgos nuevos

- **H-36** (baja): `esbuild` está en `devDependencies` y ningún script ni
  el CI lo usa (los builds concatenan con Node puro). Candidato a borrar en 7.x.
- **H-37** (alta, en curso): el **APK v1.6.2 publicado y en el teléfono de la
  gente lleva Capacitor Android 8.4.1**, dentro del rango del aviso
  GHSA-rvm3-566m-v7fv. Se explota si la víctima activa un enlace dentro del
  WebView que navegue a la ruta interna del proxy; la app no arma enlaces a
  partir de campos de usuario sin escape (sinks cerrados en 0.1/3.1), así que
  la superficie es chica, pero no está verificada del todo. El arreglo está
  en el repo y **llega a la gente solo con un release nuevo** (M-10). La web
  no se ve afectada.
- **H-38** (media-baja): en móviles la CSP bloquea `apis.google.com`.
  Firebase Auth inicia el iframe de sesión de forma proactiva en navegadores
  móviles, Safari e iOS (`_shouldInitProactively` en el SDK) y para eso carga
  `https://apis.google.com/js/api.js`, que `script-src` no permite. El SDK lo
  ignora a propósito («If this fails, don't halt auth loading»): el inicio de
  Auth no se detiene. La app solo usa correo y contraseña, que no dependen de
  ese iframe. Impacto: **1 violación por carga** en la APK (enforce) y, por
  el código del SDK, en navegadores móviles. La «0 violaciones» de 3.5 se
  midió en escritorio. No se reprodujo en la web móvil (el navegador integrado
  no cambió el user agent). **Recomendación: no agregar `apis.google.com` a
  `script-src`** (ese dominio sirve endpoints JSONP, un vector conocido para
  saltarse una CSP). Considerar este ruido al decidir el paso a enforce de
  3.5 (2026-10-18 o después). Falta confirmar con una sesión real que el
  inicio de sesión funciona en la APK con la `<meta>` (M-10).
- Sin cambios y a tener presente: `android/.gitignore` y `google-services.json`
  están bien; no hay secretos nuevos en el staging.

## Acción del dueño requerida

**M-10:** publicar un release nuevo de la APK con Capacitor parcheado y
probarlo en un teléfono real. Por el procedimiento de «Subir de versión»:
bump a `versionCode 19` / `versionName 1.6.3` (commit propio), build firmado
en tu máquina (con tu `keystore.properties`), `apksigner verify` contra el
SHA-256 del gate, y release en GitHub con `update.json`. Con el APK nuevo
instalado, comprobar:

1. Inicio de sesión con correo y contraseña (H-38).
2. Activar notificaciones, y que el token quede guardado en tu perfil.
3. Recibir un aviso real: sirve el mismo «notificar stream de hoy» pendiente
   de M-9.
4. Desde un teléfono con la **v1.6.2** instalada: Configuración →
   Actualizaciones ofrece la 1.6.3, la descarga e instala encima (misma firma).

Si quieres, la próxima sesión hace el bump y deja listo el commit; el build
firmado y la publicación son tuyos.
