# Build de la app Android (Capacitor)

La app Android es un wrapper Capacitor de la misma web pública responsive
(`tsc-src/`) — no hay UI nativa separada. `www/` es un build intermedio
generado, nunca se edita a mano ni se commitea.

## Requisitos

- Node.js + npm (para el proyecto raíz).
- Android Studio (incluye un JDK embebido, `jbr/`) con el Android SDK
  instalado — API compileSdk/targetSdk 36 (ver `android/variables.gradle`),
  build-tools y al menos un emulador o dispositivo físico.

## Setup inicial

```bash
npm install
```

## Ciclo de desarrollo (debug)

Cada vez que cambie algo en `tsc-src/` (JS/CSS/HTML/assets):

```bash
npm run build:www        # regenera www/ desde tsc-src/ (whitelist, ver scripts/build-www.mjs)
npx cap copy android      # copia www/ + capacitor.config.json a android/app/src/main/assets
```

(`npm run sync:android` encadena ambos pasos.)

Después, abrir la carpeta `android/` como proyecto en Android Studio (File →
Open), dejar que sincronice Gradle, y correr ▶ sobre un emulador o
dispositivo. Sirve para iterar rápido cambios de `tsc-src/`, ícono, splash,
manifest, etc.

Si se agregó/cambió algo en `tsc-src/`, correr también:

```bash
cd tsc-src && graphify update .
```

## Regla de trabajo: debug vs release

Hay dos artefactos distintos y se usan para cosas distintas.

### APK debug

Ruta:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Uso correcto:

- Desarrollo rapido con Codex/Claude.
- Emulador y pruebas tecnicas de WebView/CDP.
- Inspeccionar consola, DOM, estado interno, errores JS y recursos cargados.
- Iterar cambios sin preparar una build candidata.

No usar como build de prueba real para el usuario final. Puede estar firmado
con debug, tener comportamiento de depuracion y no representa exactamente el
paquete que se debe validar en telefono fisico.

### APK release

Ruta generada por Gradle:

```text
android/app/build/outputs/apk/release/app-release.apk
```

Uso correcto:

- Test real en telefono fisico.
- Validar rendimiento real, splash, audio, portrait, sala de trofeos 3D,
  notificaciones y navegacion.
- Build candidata para compartir fuera del flujo de desarrollo.

Regla practica:

1. Codex/Claude desarrollan y diagnostican primero con debug.
2. Cuando el cambio queda cerrado, correr `npm run build:www`,
   `npx cap copy android` y `./gradlew :app:assembleRelease`.
3. El usuario prueba en su telefono usando el APK release.
4. Si el usuario reporta un bug desde telefono, se corrige en codigo, se
   valida en debug si ayuda al diagnostico, y se vuelve a generar release.

## Generar un APK debug desde línea de comandos

```bash
npm run build:www && npx cap copy android
cd android && ./gradlew :app:assembleDebug
```

El APK queda en `android/app/build/outputs/apk/debug/`.

## Generar un release (APK/AAB firmado)

El release **no tiene firma por defecto** — `android/app/build.gradle` busca
un `android/app/keystore.properties` (nunca versionado) y si no existe, el
build igual corre pero el artefacto queda **sin firmar**.

### 1. Crear un keystore local (una sola vez, por dev/CI — no compartir)

```bash
keytool -genkey -v -keystore mi-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias tsc-release
```

Guardar `mi-release.jks` fuera del repo (o en `android/app/`, que ya está
gitignorado — ver más abajo). **Nunca commitear este archivo.**

### 2. Crear `android/app/keystore.properties`

```properties
storeFile=mi-release.jks
storePassword=TU_PASSWORD
keyAlias=tsc-release
keyPassword=TU_PASSWORD
```

Este archivo está en `.gitignore` (`android/.gitignore` → `keystore.properties`).

### 3. Generar

```bash
npm run build:www && npx cap copy android
cd android
./gradlew :app:assembleRelease   # APK firmado en app/build/outputs/apk/release/
./gradlew :app:bundleRelease     # AAB firmado en app/build/outputs/bundle/release/ (para Play Store)
```

O desde Android Studio: **Build → Generate Signed Bundle / APK**, apuntando
al mismo keystore.

## Qué archivos NUNCA se commitean

Ya cubiertos por `.gitignore` (raíz y `android/.gitignore`) — no tocar estas
reglas sin motivo:

- `*.jks`, `*.keystore`, `keystore.properties` (firma de release)
- `android/local.properties` (ruta local del SDK, por máquina)
- `android/app/build/`, `android/.gradle/` (artefactos de build)
- `*.apk`, `*.aab`
- `android/app/src/main/assets/public/`, `.../capacitor.config.json` generado
  (se regeneran con `cap copy`)
- `tsc-src/js/firebase-config.js`, `tsc-src/js/cloudinary.js` (config real
  del proyecto — ver `DEPLOY.md`; estos SÍ están commiteados intencionalmente
  porque son públicos por diseño, no tocar sin verificar `DEPLOY.md` primero)

## Checklist antes de un release de prueba

- [ ] `applicationId`/`namespace` = `web.teamsubscup.app` (`android/app/build.gradle`)
- [ ] `appName` = `TEAM SUBS CUP` (`capacitor.config.json`, `strings.xml`)
- [ ] `versionCode`/`versionName` actualizados **y commiteados** (`android/app/build.gradle`)
      — el bump va en un commit del repo, nunca como edición local que se
      revierte. v1.3.0/v1.3.1/v1.4.0 salieron con codes 5/6/7 que nunca
      llegaron a git: `build.gradle` quedó en 3 y buildear desde HEAD producía
      un APK que Android rechaza instalar encima del que ya tiene la gente.
- [ ] `versionCode` del build coincide con el publicado — verificar sobre el
      APK ya generado, no sobre el fuente:
      `aapt2 dump badging app-release.apk | head -1`
- [ ] Portrait fijo (`AndroidManifest.xml` → `android:screenOrientation="portrait"`)
- [ ] Ícono launcher = mascota YuNa, splash = escudo TSC sobre `#0C0F14`
- [ ] Sin frame blanco en cold start (splash nativo → WebView oscuro → overlay web → app)
- [ ] Permisos en el manifest: `INTERNET`, `POST_NOTIFICATIONS` (push FCM) y
      `REQUEST_INSTALL_PACKAGES` (auto-actualizador) — ningún otro sin una
      razón real. Los que agrega el merge de plugins (`ACCESS_NETWORK_STATE`,
      `WAKE_LOCK`, `c2dm.RECEIVE`) vienen de `@capacitor/push-notifications`
      y no se declaran a mano.
- [ ] `npm run build:www && npx cap copy android` corridos antes de buildear
- [ ] **El bundle web dentro del APK coincide con `tsc-src/`** — no alcanza con
      haber corrido `cap copy`: Gradle puede empaquetar assets viejos si
      `mergeAssets` queda `UP-TO-DATE`. Comparar hashes de lo que quedó
      adentro contra el fuente (`assets/public/js/*.js` del zip vs
      `tsc-src/js/*.js`). La v1.4.0 salió con el bundle de un commit de 8 días
      antes y nadie lo notó hasta que se auditó.

## Publicar un release (GitHub Releases)

El canal de distribución es **GitHub Releases** en el mismo repo, público. No
se usa Firebase Storage (cobraba tráfico) ni Drive (bloquea el archivo cuando
se descarga mucho).

Cada release lleva **tres assets**:

| Asset | Para qué |
|---|---|
| `TEAM-SUBS-CUP-vX.Y.Z-release.apk` | copia versionada, para el registro |
| `TEAM-SUBS-CUP.apk` | **nombre fijo** — hace estable la URL `releases/latest/download/TEAM-SUBS-CUP.apk`, que es la que consume `TSC_APK_URL` en `tsc-src/js/apk-promo.js` y el footer del sitio |
| `update.json` | **nombre fijo** — lo lee el auto-actualizador dentro de la app |

El nombre fijo es lo que hace que, apenas se publique el release, la web
empiece a servir la versión nueva sin tocar una línea de código.

### 1. Verificar la firma — gate obligatorio, antes de publicar

```bash
apksigner verify --print-certs TEAM-SUBS-CUP-vX.Y.Z-release.apk
```

El SHA-256 del certificado tiene que ser exactamente:

```text
7727c9a7677861396e9fddeceeabfc323386f276c96251b03ca99072ef802a72
```

Y el DN, completo:

```text
CN=TEAM SUBS CUP, OU=TSC, O=TSC, L=Unknown, ST=Unknown, C=AR
```

(Ambos valores comprobados contra el APK de la v1.4.0 ya publicada.)

**Por qué es un gate y no una buena práctica.** Si la clave cambia, Android
rechaza la actualización y la única salida es desinstalar — perdiendo sesión y
datos locales, justo lo que las notas de release le dicen a la gente que NO
haga. Antes esto se detectaba solo: alguien instalaba a mano, fallaba y
avisaba. Con el auto-actualizador la falla pasa a ocurrir **en silencio,
dentro del instalador del sistema y para todos a la vez** — nadie sabe por qué
"no anda actualizar".

### 2. Publicar `update.json` junto al APK

Mismo release, nombre fijo:

```json
{
  "versionCode": 8,
  "versionName": "1.5.0",
  "apkUrl": "https://github.com/theperfectory-blip/tsc-web/releases/latest/download/TEAM-SUBS-CUP.apk",
  "notes": "Qué cambió, en una línea, en tuteo"
}
```

`versionCode` es lo **único** que compara la app para decidir si hay versión
nueva (`versionName` es solo para mostrar: comparar "1.10.0" contra "1.9.0"
como texto da el resultado equivocado). Tiene que coincidir con el
`versionCode` real del APK del mismo release — verificarlo sobre el binario,
no sobre `build.gradle`:

```bash
aapt2 dump badging TEAM-SUBS-CUP.apk | head -1
```

Va en el mismo release a propósito: así nunca existe una ventana donde el
manifiesto anuncie una versión cuyo APK todavía no está subido.

### 3. Comprobar que quedó servible

```bash
curl -sL -o /dev/null -w "%{http_code}\n" https://github.com/theperfectory-blip/tsc-web/releases/latest/download/update.json
```

Tiene que dar `200` (`-L` es obligatorio: la URL de nombre fijo pasa por dos
redirects antes de llegar a los bytes).

Ojo: dentro de la app ese archivo **no** se pide con `fetch()` sino con
`CapacitorHttp` (ver `tsc-src/js/updater.js`) — los release assets de GitHub no
mandan `Access-Control-Allow-Origin` y el WebView sirve la app desde
`https://localhost`, así que un `fetch()` normal muere por CORS sin llegar
siquiera a ver la respuesta. No cambiar eso por `fetch()` "porque es más
simple".

### 4. Avisar

Recién ahí avisar que hay versión nueva. Desde la v1.5.0 la gente se entera
sola desde Configuración → Actualizaciones; los que estén en una versión
anterior al auto-actualizador hay que avisarles por fuera (directos, grupo),
por única vez.

## Validar cambios visuales (ícono/splash/topbar) en el emulador

Para cualquier cambio que se vea (ícono, splash, layout de topbar, etc.), reinstalar
**siempre limpio** en vez de reinstalar encima:

```bash
npm run build:www
npx cap sync android
cd android
./gradlew :app:assembleRelease
cd ..

adb uninstall web.teamsubscup.app
adb install releases/android/v1.0.0/TEAM-SUBS-CUP-v1.0.0-release.apk
adb shell monkey -p web.teamsubscup.app -c android.intent.category.LAUNCHER 1
```

**Por qué no `adb install -r`:** el launcher del emulador puede quedarse con
recursos viejos cacheados (sobre todo íconos) aunque el APK instalado sí tenga
el cambio — un ícono agrandado llegó a parecer "revertido" en pantalla cuando
en realidad el APK ya lo traía bien. `uninstall` + `install` (sin `-r`) fuerza
una relectura completa de recursos.

Si hace falta confirmar qué hay REALMENTE empaquetado en un APK release (los
nombres de recursos vienen ofuscados, `ic_launcher_foreground.png` no existe
como tal dentro del zip): `aapt2 dump resources app-release.apk | grep -A6
mipmap/ic_launcher_foreground` da la ruta comprimida real (algo como
`res/as.png`) para extraerla con `unzip -p`.

Después de instalar, checklist mínimo:
- [ ] Ícono grande visible en el launcher (sin recorte, comparable a íconos de Google)
- [ ] Sin sesión: topbar muestra texto "Teams Subs Cup" (mobile) / logo+texto (desktop)
- [ ] Temporada vive dentro de Configuración, no en la topbar
- [ ] Topbar no se parte en dos filas ni se superpone en ningún estado de sesión
- [ ] Audio se corta al minimizar (Sorteo/Palmarés/Live) y no se reanuda solo al volver
