# TSC Web — Copa Suscriptores

Plataforma web modular para gestión y seguimiento de torneos de fútbol. Diseñada para **YunaCoins**, una economía virtual creada por el youtuber Luis Yuna para [PES 5](https://www.konami.com/games/pes/). 

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
- **Palmarés**: reordenar campeones, copa fullscreen, animaciones
- **Soporte móvil**: responsive design, notificaciones push (FCM) en móviles
- **Audio**: sonido en vivo (radar ping), efectos UI, configuración volumen
- **Logos**: subida a Cloudinary, optimización de almacenamiento
- **Temas**: dark/light mode persistido en localStorage

## 🛠️ Stack

- **Frontend**: HTML5 / CSS3 (custom properties, Grid, Flexbox) / JavaScript vanilla (async/await, ES2020+)
- **Backend**: Firebase (Firestore + Auth + FCM + Hosting)
- **CDN**: Firebase SDK v12.14.0 (compat), Cloudinary (logos)
- **Dev**: `npx serve` para local, GitHub Actions CI/CD, graphify (code analysis)

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

docs/                         # Documentación
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
3. Copia credenciales a `tsc-src/js/firebase-config.js`:
   ```javascript
   const FIREBASE_CONFIG = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     // ... más campos
   };
   ```
4. Despliega reglas Firestore desde `firebase/firestore.rules` (consola web)
5. Configura **Cloudinary** (gratis) para logos:
   - Crea cuenta en cloudinary.com
   - Crea unsigned upload preset
   - Actualiza `js/cloudinary.js` con tus credenciales

### Deploy a Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase deploy --project=TU_PROJECT_ID
```

O automático con GitHub Actions (ver `.github/workflows/firebase-hosting.yml`).

## 📊 Estado actual

✅ **Completado (Fases 0–6B)**
- Backend Firestore con IDs enteros autoincrementales
- Auth multi-rol (público/president/admin)
- Reglas de seguridad por rol
- Partidos en vivo con actualizaciones tiempo real
- UI responsive móvil (375px+)
- Audio: radar ping, sonidos UI, configuración volumen
- Logos vía Cloudinary
- Palmarés completo con reordenamiento manual

⏳ **En desarrollo (Fases 6C–7)**
- Push FCM (notificaciones móviles)
- Correo SMTP personalizado
- APK Android (Capacitor)

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

No hay suite automatizada (es una SPA sin test runner). Prueba manualmente:
- Localmente con `serve` y DevTools
- En preview: `cd tsc-src && serve .`
- En prod: https://teamsubscup.web.app

### Linting

Sin linter fijo. El código sigue convenciones:
- camelCase para variables/funciones
- UPPER_CASE para constantes
- `_prefijo` para privadas (convención, no enforced)
- Módulos sin export (todo en `window`)

## 📄 Licencia

Privado por ahora. Contacta con el propietario para términos de distribución.

## 👤 Autor

Luis Yuna (youtuber) — creador de YunaCoins y la Copa Suscriptores.

---

## 🔗 Enlaces

- **App en vivo**: https://teamsubscup.web.app
- **GitHub**: https://github.com/theperfectory-blip/tsc-web
- **Docs**: Ver `docs/` para detalles de Firebase migration y setup
