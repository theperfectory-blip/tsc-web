# MS-0.1 · XSS por `teams.logo` · 2026-10-10

Hallazgos que cierra: H-01 (código y reglas; falta desplegar las reglas, M-1).

## Cambios

- `tsc-src/js/sanitize.js` (nuevo): helper único con `escHtml`, `escAttr`, `safeImgUrl` (solo `https:`, `assets/` y `data:image/`; si no, `''` y se muestran las iniciales) y `safeCssColor` (hex, `rgb()/hsl()` y `var(--x)`; si no, el fallback).
- `tsc-src/index.html`: carga `sanitize.js` justo después de `state.js`. `build-web` y `build-www` lo toman solos.
- `bracket.js` `teamLogoHtml`: escapa `logo`, `ini`, `color` y fuerza `size` a número.
- `bracket.js` `loadBracketLogos`: `safeImgUrl` para el logo y `CSS.escape` en el selector armado con el nombre.
- `teams.js` (tabla y modal): `safeImgUrl` para el logo, `safeCssColor` para el color y `escHtml` para `ini` y para `name`. `name` también lo escribe el presidente y estaba sin escapar en la misma fila.
- `playoff.js`, `sorteo.js`, `history.js`: `safeImgUrl` para el logo; `safeCssColor` para el color en `sorteo.js`.
- `standings.js:806` (modal de asignación a grupos, admin): **8.º sink, no estaba en H-01**. Corregido igual que los demás.
- `firebase/firestore.rules` (rama presidente de `teams`), dos validaciones nuevas:
  - `name`: string de 1 a 40 caracteres, sin `<` ni `>`.
  - `logo`: `null`, o string de menos de 500 caracteres que cumpla `^https://res[.]cloudinary[.]com/dnjijd8mx/[A-Za-z0-9_./,:%=+~-]+$`.
  - Cada campo se valida solo si cambia: un valor histórico de uno no bloquea editar el otro.
  - El veto de `<>` en `name` no estaba en el plan. Se agregó como defensa en profundidad hasta el barrido de 3.1.
- `functions/test/rules-teams.js` (nuevo) + script `npm run test:rules`: test de reglas contra el emulador. Usa la API REST y tokens simulados, así que no agrega dependencias.
- `.claude/launch.json`: se agrega la config `hosting-dist` (emulador de hosting en `:5050`) para verificar `dist`. Es parte de D4.

## Verificación

- **Reglas (emulador de Firestore):** `npm run test:rules` dio **21/21 PASS**.
  - El presidente **puede**: guardar una URL de Cloudinary propia, quitar el logo (`null`), cambiar el nombre, y nombre y logo juntos.
  - El presidente **no puede**: `x" onerror=…`, Cloudinary con comilla inyectada, dominio ajeno, otra cuenta de Cloudinary, `http:`, `javascript:`, `data:`, logo de 500+ caracteres, logo no string, nombre vacío, nombre de 41 caracteres, nombre con HTML, nombre no string, campo fuera de la allowlist, equipo ajeno, usuario con `lockEdits`.
  - El admin sigue sin restricción.
- **Navegador, `tsc-src` (`:3000`, sesión admin, `__TSC_READONLY__ = true`):**
  - `teamLogoHtml()` con objetos de prueba en memoria (logo `x" onerror=…`, `ini` `<b>x</b>`, color con `"`, nombre `<img onerror>`, logo `javascript:`): la salida va escapada. Insertada en un nodo suelto: **0 atributos `on*`** y **0 `<img>`**.
  - Una URL de Cloudinary y `assets/…` siguen generando `<img>`.
  - Tabla de Equipos (admin): 62 filas y 36 logos cargados, que coincide con los 36 logos de la base.
  - Las páginas admin equipos, historial-tabla, sorteo, fases y partidos, y el bracket de la fase 16, renderizan **sin errores en consola**.
  - Los 62 colores de equipo reales pasan `safeCssColor`, así que ningún equipo pierde su color.
- **Navegador, `dist` (`:5050`, emulador de hosting, 9 bundles, sin sesión):**
  - Los helpers están en el bundle y `teamLogoHtml` y `_histStdRowHTML` con payloads dan 0 atributos `on*` y 0 `<img>`.
  - Las páginas públicas panel, equipos, historial, sorteo y palmarés cargan sin errores en consola.
  - Las páginas admin de `dist` no se probaron: el origen `:5050` no tiene sesión. El código es el mismo concatenado, y las páginas admin se verificaron en `tsc-src`.
- **Builds:** `node scripts/build-web.mjs` (37 JS en 9 bundles) y `node scripts/build-www.mjs` incluyen `sanitize.js`.
- **Forense (solo lectura, en el navegador con la sesión admin y `__TSC_READONLY__`):**
  - Se buscaron `<`, `>`, `"`, `javascript:` y `on…=` en `teams.name/logo/ini/color` (62 docs) y en `users.displayName/photoURL/username` (22 docs). **Cero coincidencias.**
  - Logos: 36 de Cloudinary que cumplen la regla nueva y 26 `null`. No hay ninguno con otro formato.
  - Nombres: todos de 1 a 40 caracteres.
  - También se revisaron los campos `logo/name/ini` de `matchHistory` (422 docs) y `palmares` (38): cero coincidencias. `history` está vacío.
  - **Sin incidente.**
- Los flags `__TSC_READONLY__` quedaron en `false` al terminar, confirmado en ambas pestañas.

## Pendientes / hallazgos nuevos

- **H-27 (nuevo):** `loadBracketLogos` (`bracket.js:1341`) nunca pinta nada. Busca `[id*="<nombre>"]`, pero los ids son `blogo-<fase>_r<n>_m<n>-a|b` y no contienen el nombre. En el bracket admin solo se ven iniciales. El error ya existía antes de este slice. Va a 5.7.
- **H-28 (nuevo):** H-01 listaba 7 sinks; había un 8.º en `standings.js:806`, ya corregido. Quedan sinks de `name` sin escape fuera de los archivos tocados. Por ahora los mitiga la regla nueva (sin `<>` desde el presidente), y el barrido completo queda para 3.1.
- Los demás usos de `logo` (`calendar`, `public-bracket`, `public`, `palmares`, `profile`, `history`) ya escapaban con su helper local. Unificarlos en `sanitize.js` es parte de 7.1 (H-22).

## Acción del dueño requerida

- **M-1:** `firebase deploy --only firestore:rules` desde esta rama.
  - Las reglas nuevas son compatibles con el cliente actual en producción: el flujo del presidente ya sube a Cloudinary, y los 36 logos existentes cumplen el patrón. Se pueden desplegar antes del merge.
- El fix de los sinks llega a producción con el merge a `main` (M-2, al cerrar el macro 0).
