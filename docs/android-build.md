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
- [ ] `versionCode`/`versionName` actualizados (`android/app/build.gradle`)
- [ ] Portrait fijo (`AndroidManifest.xml` → `android:screenOrientation="portrait"`)
- [ ] Ícono launcher = mascota YuNa, splash = escudo TSC sobre `#0C0F14`
- [ ] Sin frame blanco en cold start (splash nativo → WebView oscuro → overlay web → app)
- [ ] Solo permiso `INTERNET` en el manifest, salvo que se agregue una razón real
- [ ] `npm run build:www && npx cap copy android` corridos antes de buildear

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
