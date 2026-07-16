# Contribuyendo a TSC Web

¡Gracias por el interés en contribuir! Este documento explica cómo colaborar.

## Antes de empezar

1. **Fork** el repo en GitHub
2. **Clone** tu fork: `git clone https://github.com/TU_USER/tsc-web.git`
3. **Crea rama** para tu feature: `git checkout -b feature/tu-feature`
4. **Instala dependencias**: `cd tsc-src && npm install -g serve`
5. **Corre localmente**: `serve .` y abre http://localhost:3000

## Flujo de trabajo

### 1. Entiende la arquitectura

Lee [CLAUDE.md](./CLAUDE.md) para entender:
- Estructura modular (state.js → db.js → otros)
- Convenciones de naming
- Flujo de datos global (STATE)
- Dependencias entre módulos

### 2. Haz cambios

- **Un feature por rama**
- **Commits pequeños y descriptivos** en español o inglés
- **Prueba en múltiples viewports** (desktop, 375px móvil)
- **No breaks build**: compila localmente sin errores

### 3. Actualiza documentación

Si cambias:
- **Estructura de archivo**: actualiza CLAUDE.md code map
- **Dependencias**: actualiza el diagrama de dependencias
- **Features**: documenta en el módulo correspondiente

Luego ejecuta:
```bash
cd tsc-src
graphify update .
```

Esto actualiza `tsc-src/graphify-out/GRAPH_REPORT.md` (AST-only, sin costo).

### 4. Haz commit

```bash
git add .
git commit -m "feat(coins): agregar historial de transacciones"
```

Sigue [Conventional Commits](https://www.conventionalcommits.org/):
- `feat`: nueva feature
- `fix`: bug fix
- `refactor`: cambio de código sin cambiar comportamiento
- `docs`: documentación
- `test`: pruebas (cuando existan)
- `chore`: tareas de mantenimiento

### 5. Push y Pull Request

```bash
git push origin feature/tu-feature
```

Abre un **Pull Request** contra `main` con:
- Título claro (`feat(module): descripción`)
- Descripción de qué cambia y por qué
- Checklist de verificación (móvil, dark mode, etc.)

## Estándares de código

### Naming

```javascript
// Variables/funciones: camelCase
let seasonId = 5;
function openCompModal() { ... }

// Constantes: UPPER_CASE
const MAX_TEAMS = 64;
const STORES = { teams: 'teams', matches: 'matches' };

// Privadas: _prefix (convención, no enforced)
function _sanitizeTeamName(name) { ... }
let _cacheStandings = {};
```

### Estructura de módulo

```javascript
// 1. Dependencias (comentadas si existen globales)
// Usa: state.js, db.js, ui-utils.js

// 2. Estado privado
let _modalOpen = false;

// 3. Funciones públicas (primero)
function openCompModal() {
  _modalOpen = true;
  // ...
}

// 4. Funciones privadas (después)
function _renderCompList() {
  // ...
}

// 5. Inicialización (último, si la hay)
```

### HTML/CSS

- **IDs**: kebab-case (`id="pub-panel"`)
- **Classes**: kebab-case (`.live-dot`, `.modal-backdrop`)
- **CSS properties**: custom properties en `variables.css` para colores/tipografía

### Async/await

```javascript
// Prefiere async/await
async function saveTeam(team) {
  try {
    const result = await db.put('teams', team);
    return result;
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}
```

## Testing

**No hay test suite automatizada.** Prueba manualmente:

- **Desktop**: http://localhost:3000
- **Móvil**: DevTools → device emulation (375px), o dispositivo físico
- **Dark mode**: ⚙ Configuración → tema
- **Firestore**: si accedes datos, crea cuenta de prueba en Firebase console
- **Admin vs público**: crear usuarios con diferentes roles

## Branches

- `main` — producción, se despliega automáticamente en cada push
- `feature/*` — nuevas features
- `fix/*` — bug fixes
- `docs/*` — cambios de documentación

## CI/CD

GitHub Actions automáticamente:
1. **Despliega a Firebase Hosting** en cada push a `main`
2. URL: https://teamsubscup.web.app
3. Si hay deploy error, revisa `.github/workflows/firebase-hosting.yml`

El workflow **solo despliega Hosting**. Las reglas de Firestore/Storage (`firebase/*.rules`) y
las Cloud Functions (`functions/`) se despliegan a mano — ver `DEPLOY.md`. Si cambiaste una
regla o una function y no la desplegaste, el código en `main` puede fallar en producción con
`permission-denied` aunque el deploy de Hosting haya sido exitoso.

## Preguntas frecuentes

### ¿Cómo agrego una nueva feature?

1. Crea `tsc-src/js/mifeature.js`
2. Define funciones públicas (`renderMiFeature`, `openMiFeatureModal`, etc.)
3. Agrega `<script src="js/mifeature.js"></script>` en `tsc-src/index.html` (después de dependencias)
4. Render en una `<div id="mi-feature">` en index.html
5. Actualiza CLAUDE.md + `graphify update .`

### ¿Cómo uso Firestore desde mi feature?

```javascript
// Leer
const teams = await db.getAll('teams');
const team = await db.get('teams', teamId);

// Escribir
await db.put('teams', { id: 5, name: 'Mi Equipo' });
await db.delete('teams', teamId);

// En tiempo real (Firestore only)
if (dbSubscribe) {
  db.subscribe('matches', { phaseId: 1 }, (matches) => {
    console.log('Matches actualizado:', matches);
  });
}
```

### ¿Cómo creo un modal?

```javascript
function openMiModal() {
  const html = `
    <div class="modal-content">
      <h2>Mi Modal</h2>
      <input id="tf-nombre" type="text" placeholder="Nombre">
      <button onclick="saveMiModal()">Guardar</button>
    </div>
  `;
  openModal('mi-modal', html);
}

function closeMiModal() {
  closeModal('mi-modal');
}
```

### ¿Cómo verifico cambios en móvil?

Opción 1: DevTools emulation (F12 → 375px)
Opción 2: Servidor local + acceder desde móvil en la red local
```bash
# Averigua tu IP local
ipconfig

# Accede desde móvil: http://TU_IP:3000
```

### ¿Cómo público a producción?

Solo en `main` branch. Merge con PR y GitHub Actions despliega automáticamente a https://teamsubscup.web.app.

### ¿Cómo contribuyo a la app Android?

Es un wrapper Capacitor de esta misma web (`android/`) — no hay UI nativa separada, así que la
mayoría de los cambios visuales/funcionales se hacen en `tsc-src/` como siempre. Para el ciclo
de build/release específico (debug vs release, firma, cómo regenerar el APK), ver
`docs/android-build.md`.

---

¡Gracias por contribuir! Si tienes preguntas, abre un issue en GitHub.
