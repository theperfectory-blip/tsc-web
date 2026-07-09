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
