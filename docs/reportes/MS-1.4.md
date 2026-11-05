# MS-1.4 · Instrucciones del proyecto al día · 2026-10-10

Hallazgos que cierra: H-09, H-10. Decisiones aplicadas: D1, D5 (aprobadas por el dueño en la sesión).

## Cambios

- `AGENTS.md`: reescrito como fuente canónica sobre el estado real. Backend Firebase (Firestore, Auth, Functions, Cloudinary), capa de datos con espejo en memoria y fallback IndexedDB, arranque real, roles, pipeline `tsc-src` → `dist` / `www` con la exclusión compartida, configs de `launch.json`, enlace a `docs/PROTOCOLO_VERIFICACION.md`, mapa de los 38 módulos de `js/` agrupados por dominio, regla de íconos y reglas de seguridad alineadas con `SECURITY.md` (config de cliente commiteada a propósito, helper `sanitize.js`).
- `CLAUDE.md`: pasa a `@AGENTS.md` + lo específico de Claude (graphify con GRAPH FIRST suspendida hasta 1.5, recordatorio de íconos).
- `.gitignore`: quitadas las líneas `tsc-src/js/firebase-config.js` y `tsc-src/js/cloudinary.js`, reemplazadas por un comentario que explica por qué se versionan.
- `docs/backups/gitignore-antes-de-MS-1.4.txt`: copia del `.gitignore` anterior, pedida por el dueño como respaldo. Va como `.txt` para que git no la interprete como un `.gitignore` activo.

## Verificación

- Cada dato de `AGENTS.md` se contrastó con el código: orden de `<script>` en `index.html`, `ls tsc-src/js`, `db.js` (espejo, timeouts, `TSC_FS_MIRROR`), `firebase-config.js` (`USE_FIRESTORE`), `ui-utils.js` (handler `load`), `scripts/build-*.mjs`, `build-exclude.mjs`, `functions/index.js` (3 exports), `functions/package.json` (`test:emulator`, `test:rules`), `.claude/launch.json`.
- `git ls-files -ci --exclude-standard`: vacío (antes listaba los 2 archivos). `git status` no muestra archivos nuevos: el cambio de `.gitignore` no altera qué se versiona.
- `node scripts/build-web.mjs` y `build-www.mjs`: corren igual que antes (37 JS → 9 bundles) y siguen incluyendo `firebase-config.js`. Los builds no leen `.gitignore`.
- Sin cambios de código ni de UI: no hace falta prueba en navegador ni `graphify update`.

## Notas

- El modo auto de Claude Code bloquea estas ediciones (las clasifica como debilitar la seguridad o envenenar instrucciones). Por eso el primer intento no pudo cerrar el slice. Se cerró con aprobación explícita del dueño.

## Acción del dueño requerida

Ninguna.
