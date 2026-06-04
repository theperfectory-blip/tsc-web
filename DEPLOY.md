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

Para que cada push a GitHub desplegue automáticamente:

### 1. Generar clave de servicio

```bash
# En la terminal
firebase login:ci
```

Te dará un token. Cópialo.

### 2. Agregar secret en GitHub

1. Ve a tu repo GitHub → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**:
   - Nombre: `FIREBASE_SERVICE_ACCOUNT_TSC_WEB`
   - Valor: el token que copiaste
3. **Add secret**

### 3. Workflow de GitHub Actions

El archivo `.github/workflows/firebase-hosting.yml` ya está configurado. Edita:

```yaml
# Línea ~20: cambia "firebase-migration" a "main" si despliegas desde main
if: github.ref == 'refs/heads/main'
```

Luego cada push a `main` desplegará automáticamente.

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
