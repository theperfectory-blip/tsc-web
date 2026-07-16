# Deploy a Firebase Hosting

Este documento explica cómo hacer deploy de TSC Web a tu propia instancia de Firebase Hosting.

## Requisitos

- Cuenta de [Google](https://accounts.google.com)
- [Firebase CLI](https://firebase.google.com/docs/cli) instalado: `npm install -g firebase-tools`
- Proyecto creado en [Firebase Console](https://console.firebase.google.com)

## Paso 1: Crear proyecto Firebase

1. Ve a https://console.firebase.google.com
2. Haz clic en **"Crear proyecto"**
3. Nombre: `tsc-web` (o el que prefieras)
4. Plan **Spark** (gratuito) es suficiente
5. Desactiva Google Analytics (opcional)
6. Espera a que se cree el proyecto

## Paso 2: Habilitar servicios

En la consola de tu proyecto:

### Firestore

1. **Build** → **Firestore Database**
2. **Crear base de datos** → región `nam5` (US)
3. Inicia en modo **producción** (reglas de seguridad)

### Authentication

1. **Build** → **Authentication**
2. **Comenzar** → Habilita:
   - **Email/Password** (auto-registro desactivado)
   - **Google Sign-In** (opcional)
3. Configura dominio autorizado: tu URL de Hosting (ej: `tsc-web-abc123.web.app`)

### Hosting

1. **Build** → **Hosting**
2. **Comenzar** → Se abre Firebase CLI wizard

### Cloud Messaging

1. **Engage** → **Cloud Messaging**
2. Web push: copia Server Key y Web API Key (para notificaciones)

## Paso 3: Configurar proyecto local

```bash
# 1. Clona el repo
git clone https://github.com/theperfectory-blip/tsc-web.git
cd tsc-web

# 2. Inicia Firebase CLI
firebase login
firebase init

# Preguntas:
# - ¿Qué servicios? → Hosting, Firestore (no Storage en Spark)
# - ¿Proyecto? → Selecciona el que creaste
# - ¿Directorio público? → tsc-src
# - ¿SPA? → Sí
```

## Paso 4: Configurar credenciales Firebase

En `tsc-src/js/firebase-config.js`, llena `FIREBASE_CONFIG`:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "TU_API_KEY",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456",
  measurementId: "G-ABC123DEF456"
};
```

**¿Dónde encontrar?** Console → **Project settings** (engranaje) → tab **Apps** → selecciona app web → copia valores.

## Paso 5: Configurar Cloudinary (logos)

TSC Web sube logos a [Cloudinary](https://cloudinary.com) (gratis, sin tarjeta):

1. Crea cuenta en https://cloudinary.com (plan free)
2. Ve a **Dashboard** → copia tu **Cloud Name**
3. Ve a **Settings** → **Upload** → **Upload presets**
4. **Crear preset sin firmar**:
   - Nombre: `tsc_logos`
   - Tipo: **Sin firmar**
   - Carpeta: `tsc-logos`
   - Salvar

En `tsc-src/js/cloudinary.js`, actualiza:

```javascript
const CLOUDINARY_CONFIG = {
  cloudName: "tu-cloud-name",
  uploadPreset: "tsc_logos"
};
```

## Paso 6: Reglas de Firestore

1. Console Firebase → **Firestore Database** → **Rules**
2. Reemplaza con contenido de `firebase/firestore.rules` (en este repo)
3. **Publicar**

Las reglas definen:
- Públicos pueden leer equipos, palmarés, historial
- Presidentes pueden editar su equipo
- Admins tienen acceso total

## Paso 7: Deploy

```bash
# Verifica que index.html está en tsc-src
firebase deploy --project=tu-proyecto-id
```

Resultado:
- URL: `https://tu-proyecto.web.app`
- Los cambios se publican en vivo

## Deploy automático (GitHub Actions)

Para que cada push a `main` despliegue automáticamente (así funciona ya este repo en
producción):

### 1. Generar el service account de deploy

El workflow actual (`FirebaseExtended/action-hosting-deploy@v0`) necesita la **clave JSON de
un service account de Google Cloud**, no un token de `firebase login:ci` (mecanismo viejo,
deprecado). La forma más simple es dejar que el propio CLI lo arme:

```bash
firebase init hosting:github
```

Esto crea el service account con los permisos correctos, lo agrega como secret en tu repo de
GitHub automáticamente, y puede generar el workflow por vos (si ya tenés uno como
`.github/workflows/firebase-hosting.yml`, decile que no lo sobreescriba).

### 2. Secret en GitHub (si lo hacés a mano)

1. Google Cloud Console → **IAM & Admin** → **Service Accounts** → creá uno con rol de deploy
   de Hosting (o usá el que crea el paso 1) → **Keys** → **Add key** → JSON → descargalo
2. Repo de GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository
   secret**
   - Nombre: el que use tu `firebase-hosting.yml` en `firebaseServiceAccount:` (en este repo:
     `FIREBASE_SERVICE_ACCOUNT_TSC_WEB_YUNA`)
   - Valor: el contenido completo del JSON descargado

### 3. Workflow de GitHub Actions

`.github/workflows/firebase-hosting.yml` ya dispara solo con push a `main`:
```yaml
on:
  push:
    branches:
      - main
```
No hace falta editar nada más — solo actualizar `projectId` si es otro proyecto Firebase.
**Ojo:** este workflow **solo despliega Hosting**. Las reglas de Firestore/Storage
(`firebase/*.rules`) y las Cloud Functions (`functions/`) se despliegan a mano — ver "Reglas
de Firestore" arriba y `functions/README.md` si existe.

## Verificación

Después de deploy:

1. Abre https://tu-proyecto.web.app en el navegador
2. Debe cargar la app correctamente
3. **Prueba panel público**: es accesible sin login
4. **Crear cuenta**: ⚙ → "Crear cuenta"
5. **Modo admin**: en Firebase Console, edita doc `users/{uid}` y cambia `role` a `admin`

## Troubleshooting

### "Cannot read properties of undefined (reading 'app')"

Falta `firebase-config.js` o credenciales incorrectas. Verifica que `FIREBASE_CONFIG` esté completo en `tsc-src/js/firebase-config.js`.

### "Permission denied" en Firestore

Las reglas no se publicaron. Ve a Console → Firestore → Rules y actualiza con `firebase/firestore.rules`.

### Logos no se suben

Faltan credenciales de Cloudinary. Verifica `tsc-src/js/cloudinary.js` con tu Cloud Name y Upload Preset.

### "Timeout" en deploy

Puede ser lento la primera vez. Espera o intenta:
```bash
firebase deploy --project=tu-proyecto-id --debug
```

## Siguientes pasos

- [ ] Crear usuarios (panel admin)
- [ ] Importar equipos (admin → Data → Import)
- [ ] Crear competición de prueba
- [ ] Editar datos como presidente (crear cuenta en otro navegador)

## Soporte

Si tienes problemas, abre un issue en GitHub o consulta la [documentación oficial de Firebase](https://firebase.google.com/docs).
