# Macro Slice — Auto-actualizador de la APK · 2026-07-20

> Estado **verificado en código** por Sonnet 5 el 2026-07-20. Pendiente de
> auditoría/aprobación del supervisor antes de implementar. Cada slice se
> ejecuta y cierra por separado — mismo protocolo que los macros anteriores.
>
> **Nada de este documento está implementado todavía.**

## Objetivo

Un botón dentro de la app ("Buscar actualizaciones", en Configuración) que
detecta si hay una versión nueva del APK, la descarga, y dispara el
instalador nativo de Android — para no depender de repartir el `.apk` por
Drive/WhatsApp cada vez que se cierra un fix o una feature nueva.

**Límite real de Android, no evitable:** una app fuera de Play Store nunca
puede instalarse sola en silencio — el sistema siempre muestra su propia
pantalla de confirmación ("¿Instalar esta actualización?"). Este slice
automatiza todo lo anterior a ese toque (chequeo de versión, descarga,
apertura del instalador), no el toque en sí.

## 0. Por qué esta arquitectura y no otra

Se evaluaron dos caminos:
1. **Actualizador de APK completo** (elegido) — mismo mecanismo que ya usan
   para repartir releases (APK firmado con el mismo keystore), solo se
   automatiza la descarga + apertura del instalador.
2. **Hot-update solo del bundle web** (tipo Capgo/`capacitor-updater`) —
   actualiza `tsc-src/www` sin pasar por el instalador, más rápido y
   silencioso, pero **no cubre cambios nativos** (permisos, plugins, ícono,
   manifest — cosas que ya pasaron en este proyecto: `SystemBarsPlugin`,
   wiring de push FCM). Terminarían con dos sistemas de actualización en
   paralelo para cubrir todos los casos.

Se descartó (2) como primer paso — se puede sumar más adelante *sobre* este
mismo esquema si algún día molesta esperar la descarga completa por cambios
chicos de solo-JS.

## 1. Recursos que ya existen en el proyecto (reusados, no recreados)

- **`FileProvider` ya configurado** ([AndroidManifest.xml](android/app/src/main/AndroidManifest.xml)),
  con `file_paths.xml` cubriendo `external-path`/`cache-path` genéricos
  (`path="."`) — ya alcanza para exponer un APK descargado al instalador
  vía `content://`, sin tocar `file_paths.xml`.
- **GitHub Releases ya es el canal de distribución en producción** — el repo
  ([theperfectory-blip/tsc-web](https://github.com/theperfectory-blip/tsc-web))
  es público desde el 2026-07-16 y cada release publica dos assets: una copia
  versionada (`TEAM-SUBS-CUP-vX.Y.Z-release.apk`, para el registro) y una de
  **nombre fijo** (`TEAM-SUBS-CUP.apk`) que hace estable la URL
  `releases/latest/download/TEAM-SUBS-CUP.apk` — la misma que ya consume
  `TSC_APK_URL` en [apk-promo.js](tsc-src/js/apk-promo.js). Al 2026-07-24 ese
  asset lleva 43 descargas reales: es el canal vivo, no una propuesta.
  Gratis y sin límite de tráfico (Firebase Storage cobraba ~$0.12/GB, y por eso
  se migró).
- **Flujo de firma ya establecido** ([docs/android-build.md](docs/android-build.md)):
  keystore fuera del repo, mismo certificado en cada release — requisito
  no-negociable para que Android acepte instalar la actualización *encima*
  de la app existente (sin desinstalar, sin perder sesión/datos locales).
- **Patrón de plugin nativo ya establecido**: `SystemBarsPlugin.java`
  ([android/app/src/main/java/web/teamsubscup/app/SystemBarsPlugin.java](android/app/src/main/java/web/teamsubscup/app/SystemBarsPlugin.java))
  — `@CapacitorPlugin` + `@PluginMethod`, sin wrapper JS propio (Capacitor
  lo expone directo en `window.Capacitor.Plugins.X`), registrado en
  `MainActivity.onCreate()` antes de `super.onCreate()`. El plugin nuevo
  sigue exactamente este molde.

## 2. Orden y dependencias

| # | Slice | Tamaño | Riesgo | Bloqueante |
|---|---|---|---|---|
| **A** | Permiso + plugin nativo `AppUpdater` (descarga + instala) | medio | medio (nativo, toca manifest) | — |
| **B** | Manifest de versión como asset de release (`update.json`) | chico | bajo | — |
| **C** | UI "Buscar actualizaciones" en Configuración | chico-medio | bajo | depende de A y B |
| **D** | Ajustar checklist/flujo de release (`docs/android-build.md`) | chico | bajo | depende de B |

A y B son independientes entre sí; C necesita a los dos; D solo necesita B
(documenta el paso manual de subir el update.json).

---

## Slice A — Permiso + plugin nativo `AppUpdater`

**Objetivo:** que la app pueda, dado un `versionCode` que se le pasa desde
JS, descargar un APK y disparar el instalador nativo de Android.

**Estado actual:**
- `AndroidManifest.xml` solo declara `INTERNET` y `POST_NOTIFICATIONS`
  ([AndroidManifest.xml:32-35](android/app/src/main/AndroidManifest.xml#L32)) — falta
  `REQUEST_INSTALL_PACKAGES` (Android 8+, obligatorio para poder abrir el
  instalador de paquetes desde la propia app).
- `@capacitor/app` (plugin oficial de Capacitor) **no está instalado** —
  hace falta para leer `versionCode`/`versionName` reales en runtime desde
  JS (`App.getInfo()`), en vez de hardcodearlos.
- No existe ningún código de descarga/instalación de APKs en el proyecto.

**Enfoque:**
1. `AndroidManifest.xml`: agregar
   `<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />`.
2. `npm install @capacitor/app` (oficial, mismo peso/confianza que
   `@capacitor/push-notifications`, ya en el proyecto).
3. Plugin nuevo `AppUpdaterPlugin.java` (mismo paquete que `SystemBarsPlugin`),
   `@CapacitorPlugin(name = "AppUpdater")`, con:
   - `@PluginMethod canInstall(call)` → resuelve `{granted: boolean}` leyendo
     `getPackageManager().canRequestPackageInstalls()` (API 26+; en API <26
     el permiso es a nivel de sistema/no aplica, resolver `granted:true`).
   - `@PluginMethod openInstallPermissionSettings(call)` → dispara
     `Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:"+getContext().getPackageName()))`
     (el permiso NO se puede pedir con un diálogo normal — es "acceso
     especial", el usuario tiene que tocar el toggle en Configuración de
     Android; la app solo puede abrirle esa pantalla).
   - `@PluginMethod downloadAndInstall(call)` — recibe `{url}` (la URL
     pública del APK nuevo en GitHub Releases). El parámetro viene de JS, así
     que se valida contra una allowlist (`https` + host `github.com`) antes de
     encolar nada: sin eso, un XSS en el WebView sería un vector para instalar
     un APK arbitrario. La allowlist mira solo la URL de entrada — GitHub
     redirige a `release-assets.githubusercontent.com` para servir los bytes y
     `DownloadManager` sigue esos redirects solo; ese host NO va en la
     allowlist (URLs firmadas que expiran, es detalle interno de GitHub):
     - Encola la descarga con `DownloadManager` (API nativa de Android, sin
       dependencias nuevas — maneja reintentos/progreso solo) apuntando a
       `getExternalFilesDir(null)` (mismo directorio que ya cubre
       `file_paths.xml`'s `external-path path=".""`).
     - `BroadcastReceiver` sobre `DownloadManager.ACTION_DOWNLOAD_COMPLETE`:
       al terminar, arma el `content://` con
       `FileProvider.getUriForFile(context, applicationId+".fileprovider", file)`
       y dispara `Intent(Intent.ACTION_VIEW)` con
       `setDataAndType(uri, "application/vnd.android.package-archive")` +
       `FLAG_GRANT_READ_URI_PERMISSION` + `FLAG_ACTIVITY_NEW_TASK`.
     - `notifyListeners("downloadProgress", {...})` opcional (progreso en
       vivo) — nice-to-have, no bloqueante para v1; si se corta el tiempo,
       queda para un slice de pulido aparte.
4. `MainActivity.java`: `registerPlugin(AppUpdaterPlugin.class)` junto al
   registro existente de `SystemBarsPlugin`.

**Archivos:** `android/app/src/main/AndroidManifest.xml`,
`android/app/src/main/java/web/teamsubscup/app/AppUpdaterPlugin.java` (nuevo),
`android/app/src/main/java/web/teamsubscup/app/MainActivity.java`,
`package.json`/`package-lock.json` (`@capacitor/app`). No toca
`file_paths.xml` (ya sirve tal cual) ni `SystemBarsPlugin.java`.

**Riesgos:** medio — es código nativo nuevo, con un permiso que Android
trata distinto a los permisos runtime normales (no hay diálogo estándar,
hay que mandar al usuario a Configuración). Mitigación: seguir el molde
exacto de `SystemBarsPlugin` (ya probado en producción), probar el flujo
completo en emulador y en el teléfono físico antes de cerrar.

**Verificación (gate):** `npm run build:www && npx cap sync android`,
`./gradlew :app:assembleDebug`, instalar en emulador; con el permiso
denegado, `canInstall` devuelve `false` y `openInstallPermissionSettings`
abre la pantalla correcta de Android; tras habilitarlo a mano, `canInstall`
devuelve `true`; `downloadAndInstall` con la URL de un APK de prueba
descarga el archivo y abre la pantalla nativa de instalación de Android.

**Cierre:** commit `feat(android): plugin nativo AppUpdater — permiso, descarga e instalación de APK`.

---

## Slice B — Manifest de versión como asset de release

> **Corregido el 2026-07-24.** La versión original de este slice proponía
> Firebase Storage (`/updates/update.json` + regla en `storage.rules`). Estaba
> mal: el proyecto ya había migrado la distribución de la APK a GitHub
> Releases el 2026-07-16, cuatro días antes de que se escribiera este doc,
> justamente para dejar de pagar tráfico de Storage. **No se toca
> `storage.rules`.**

**Objetivo:** un lugar público de solo-lectura donde la app pueda chequear
"¿cuál es la última versión disponible?" y de dónde descargarla.

**Estado actual:** los releases ya publican `TEAM-SUBS-CUP.apk` con nombre
fijo, así que `releases/latest/download/TEAM-SUBS-CUP.apk` ya es una URL
estable que apunta sola al último. Falta el dato que esa URL no da: el
`versionCode`, que es lo único que Android compara para decidir si un APK es
"más nuevo".

**Enfoque:** publicar `update.json` como un asset más del release, también con
nombre fijo → `https://github.com/theperfectory-blip/tsc-web/releases/latest/download/update.json`

```json
{
  "versionCode": 8,
  "versionName": "1.5.0",
  "apkUrl": "https://github.com/theperfectory-blip/tsc-web/releases/latest/download/TEAM-SUBS-CUP.apk",
  "notes": "Calendario, perfil de club y cara-a-cara"
}
```

**Por qué un asset y no la API de GitHub** (`/repos/.../releases/latest`):
- la API devuelve `tag_name` pero **no** `versionCode`, que es justo lo que
  hace falta comparar;
- la API tiene límite de 60 requests/hora **por IP** sin autenticar — varios
  usuarios detrás del mismo CGNAT se pisarían entre sí;
- el asset es **atómico con el APK**: los dos se publican en el mismo release,
  así que nunca existe una ventana donde el manifiesto anuncie una versión
  cuyo APK todavía no subió.

**Archivos:** ninguno del repo — es un artefacto que se publica junto al
release. El paso queda documentado en el Slice D.

**Riesgos:** bajo — no toca código ni reglas de backend.

**Verificación (gate):** `curl -L` a la URL fija de `update.json` devuelve 200
y el JSON correcto sin autenticación; el `versionCode` que trae coincide con
el que reporta `aapt2 dump badging` sobre el APK del mismo release.

**Cierre:** no lleva commit de código — se cierra publicando el asset.

---

## Slice C — UI "Buscar actualizaciones" en Configuración

**Objetivo:** que el usuario vea, dentro de la app, si hay una versión
nueva y pueda descargarla/instalarla con un botón.

**Estado actual:** `openSettings()`/`saveSettings()` en
[ui-utils.js](tsc-src/js/ui-utils.js) arman el panel de Configuración hoy
(tema, temporada). No hay ninguna sección de versión/actualización.

**Enfoque:**
1. Nueva sección "Actualizaciones" en el panel de Configuración (mismo
   patrón visual que el resto — SVG Lucide, sin emojis, `_esc()` si hay
   texto externo aunque acá `notes` lo escribe el propio dev).
2. Al abrir esa sección (o con un botón "Buscar actualizaciones"):
   - `App.getInfo()` (`@capacitor/app`) → `versionCode` instalado real.
   - `fetch('https://github.com/theperfectory-blip/tsc-web/releases/latest/download/update.json')`
     → `update.json` (sigue redirects; no requiere auth, el repo es público).
   - Comparar `versionCode`. Estados: "Ya tenés la última versión" /
     "Hay una versión nueva (vX.Y.Z) — Descargar" / error de red.
3. Botón "Descargar e instalar":
   - `AppUpdater.canInstall()` → si `false`, mostrar aviso + botón
     "Habilitar" que llama `AppUpdater.openInstallPermissionSettings()`.
   - Si `true`, `AppUpdater.downloadAndInstall({url: apkUrl})` — mostrar
     spinner/estado "Descargando..." mientras corre.
4. Esta pantalla **no existe en el navegador** (fuera de la APK Capacitor,
   `window.Capacitor?.Plugins?.AppUpdater` no está disponible) — la sección
   entera se oculta si `!window.Capacitor?.isNativePlatform?.()`, mismo
   criterio que ya usan para otras features solo-nativas (push).

**Archivos:** `ui-utils.js` (sección nueva en Configuración), `index.html`
(markup del panel si hace falta), `package.json` (ya cubierto en A).

**Riesgos:** bajo — es UI + llamadas al plugin de A, sin lógica de negocio
compleja. Mitigación: probar los 3 estados (al día / hay actualización /
permiso no concedido) con un `update.json` de prueba manipulando
`versionCode` a mano.

**Verificación (gate):** en el navegador (`npx serve tsc-src`), la sección
no aparece; en el APK debug/release con `update.json` apuntando a un
`versionCode` mayor al instalado, aparece "Hay una versión nueva" y el
botón dispara el flujo completo de A; con `versionCode` igual o menor,
"Ya tenés la última versión".

**Cierre:** commit `feat(configuración): sección Buscar actualizaciones`.

---

## Slice D — Ajustar checklist y flujo de release

**Objetivo:** que el proceso ya documentado de armar un release
([docs/android-build.md](docs/android-build.md)) incluya el paso nuevo
(publicar `update.json` junto al APK), y que el checklist de permisos refleje
la excepción intencional agregada en A.

**Estado actual:** el checklist de
[docs/android-build.md](docs/android-build.md) dice explícitamente "Solo
permiso `INTERNET` en el manifest, salvo que se agregue una razón real" —
hay que actualizar esa línea para no generar una falsa alarma en el próximo
release. (El ítem de `versionCode` ya se corrigió en el Slice 0: ahora exige
commitear el bump y verificarlo sobre el APK generado.)

**Enfoque:**
1. Actualizar la línea de permisos: "Permisos: `INTERNET`,
   `POST_NOTIFICATIONS`, `REQUEST_INSTALL_PACKAGES` (auto-actualizador) —
   ningún otro sin razón real".
2. Agregar al checklist de release: "Publicar `update.json` como asset del
   release, con nombre fijo y en el mismo release que `TEAM-SUBS-CUP.apk`
   (`versionCode`/`versionName`/`apkUrl`/`notes`), antes de avisar a los
   presidentes que hay versión nueva".
3. **Elevar la verificación de firma a gate obligatorio.** Todas las releases
   van con la misma clave (cert SHA-256 `7727c9a7…`) o Android rechaza la
   actualización. Hasta ahora un APK mal firmado se detectaba porque la
   persona instalaba a mano y avisaba; con el auto-actualizador la falla pasa
   a ocurrir **en silencio, dentro del instalador y para todos a la vez**.
   Agregar al checklist: verificar con `apksigner verify --print-certs` que el
   fingerprint coincide **antes** de publicar el release.

**Archivos:** `docs/android-build.md`. No toca código.

**Riesgos:** bajo — es documentación.

**Verificación (gate):** releer el checklist actualizado, confirmar que no
contradice nada de A/B/C.

**Cierre:** commit `docs(android): checklist de release actualizado con el paso de auto-actualizador`.

---

## Notas de cierre del macro

- Cada slice: pre (este documento) → aprobación del supervisor → Sonnet
  implementa → post (diff/pruebas/evidencia real en emulador o teléfono
  físico) → auditoría → OK → commit sin push.
- A es el único slice nativo — requiere build real (`./gradlew`) y prueba
  en emulador/teléfono, no solo lectura de código. Gradle **sí corre** desde
  este entorno con el fix de tmpdir corto (`TMP=C:\Temp`, ver memoria del
  proyecto) — no hace falta delegar el build.
- B no necesita ningún deploy de backend: se cierra publicando el asset en el
  release, no tocando `storage.rules`.
- El primer `update.json` real se publica junto al release v1.5.0, después de
  cerrar los 4 slices, como prueba end-to-end.
- **Slice 0 (agregado el 2026-07-24, ya cerrado — commit `b855992`).** No
  estaba en el plan original y era bloqueante: `build.gradle` tenía
  `versionCode 3` mientras que v1.3.0/v1.3.1/v1.4.0 se publicaron con codes
  5/6/7 — los bumps se hacían como edición local y nunca llegaban al repo.
  Como todo el actualizador compara `versionCode`, un release buildeado desde
  HEAD habría sido rechazado por Android al instalarse encima del instalado.
  Sincronizado a `8` / `1.5.0` y con la regla agregada al checklist.
- **La APK v1.4.0 publicada está 14 commits atrasada** (su bundle web
  corresponde a `c559a3e`, del 2026-07-16 — ni siquiera tiene el popup
  "Descargar App"). La v1.5.0 se corta al cerrar los 4 slices, así que el
  primer APK que la gente reciba por el canal manual ya trae el
  auto-actualizador adentro y es el último que hay que repartir a mano.
