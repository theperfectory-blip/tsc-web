# MS-7.5 · Delegación de eventos, CSP sin 'unsafe-inline' · 2026-10-20

Estado: **CERRADO** (2026-10-20, Opus). Cierra H-05 del todo: `script-src` ya no lleva `'unsafe-inline'`. Sin hallazgos nuevos.

## Qué había

- 394 handlers inline en 20 archivos: 303 `onclick`, 30 `onchange`, 17 `oninput`, 11 `onmouseover`, 11 `onmouseout` y 22 de teclado, puntero y drag.
- Un `<script>` inline en `index.html`: el del splash de arranque.
- Por eso la CSP de 3.5 tenía que permitir `'unsafe-inline'` en `script-src`, que deja correr cualquier `<script>` o `on*=` inyectado.

## Cambios

- **`js/events.js` (nuevo)**, cargado justo después de `sanitize.js`. Pone un listener por tipo de evento en `document`.
  - **Recorrido:** sigue el camino del evento desde el target hacia arriba (`composedPath`) y ejecuta cada `data-on<tipo>` que encuentra, igual que el burbujeo de los `on*` inline. Respeta `stopPropagation`.
  - **Contexto del handler:** `this` es el elemento y `event` es el evento, con `currentTarget` apuntando a ese elemento. Lo necesitan los drag de criterios, competiciones y galería.
  - **Sin `eval`:** el texto del handler se lee con una gramática fija. Admite llamadas separadas por `;`, con argumentos que son literales (`'texto'`, `"texto"`, números, `true`/`false`/`null`) o referencias de solo lectura (`this.value`, `this.dataset.x`, `event`, `window._x`). También admite `return false`.
  - **Solo funciones de la app:** se llaman únicamente funciones globales de la app y `event.stopPropagation`/`preventDefault`. Una función nativa como `fetch`, `setTimeout`, `eval` o `location.assign` se rechaza. Así un `data-on*` inyectado no sirve para saltar la CSP.
  - **Errores:** un handler que no cumple la gramática no corre y deja `[eventos] …` en consola.
- **Los 394 `on<evento>=` pasan a `data-on<evento>=`**, con un reemplazo mecánico en los templates de `js/*.js` y en `index.html`.
- **Unos 50 handlers que no eran llamadas** se reescribieron:
  - Hover: `this.style.x='…'` → `_tscStyle(this,'x','…')`.
  - `document.getElementById(id).innerHTML=''`, `.remove()` y `.click()` → `_tscClear`, `_tscRemove` y `_tscClick`.
  - Mostrar u ocultar la sección de penales → `_tscShow`. `this.value=''` → `_tscSetValue`. `this.parentElement.remove()` → `_tscRemoveParent`.
  - Funciones nombradas nuevas: `_compPickColor` (rueda de colores de competición, antes una flecha inline), `_pfUsernameClean`, `_setCustomCriterionName`, `_teamIniPreview`, `toggleThemeKey` y `settingsUseDeviceTz`.
- **`js/boot-splash.js` (nuevo):** el script del splash sale de `index.html`. Se carga con `<script data-boot src=…>` en el mismo lugar. El atributo lo deja fuera de los bundles de `build-web`, así que sigue corriendo antes del resto del HTML.
- **`js/nav.js`:** marca el ítem activo leyendo `data-onclick`.
- **CSP** (`scripts/csp.mjs` y los dos headers de `firebase.json`): `script-src 'self' 'wasm-unsafe-eval' https://www.gstatic.com https://cdn.jsdelivr.net`. `style-src` mantiene `'unsafe-inline'`, porque hay estilos inline en todo el HTML.
- **Herramientas:**
  - `audit-wiring` lee `data-on*` y el script `data-boot`, y agrega una sección «1b» que pasa cada handler por la gramática de `events.js` (0 fuera de gramática).
  - `smoke-parity` carga el splash.
  - `emu-xss csp` pone su colector en un archivo, porque sin `'unsafe-inline'` un `<script>` inline ya no corre.

## Verificación

- **Gramática:** los 394 handlers se leen sin error, tanto en la prueba directa como en `audit-wiring`. Lo que no es una llamada se rechaza: `a=1`, `alert(x)+1`, `fn(x())`.
- **Funciones:** las 237 funciones que llaman los handlers existen en `window` y ninguna es nativa. `addZone` y `removeZone` aparecen al abrir el modal de fases, como antes.
- **Sandbox `dist` con la CSP nueva en enforce** (`emu-xss csp`): **0 violaciones** en todo el recorrido.
  - **Público:** navegación, ajustes («Auto» de zona horaria), tema con Enter, ficha de club e historial.
  - **Login real por el modal:** mostrar contraseña y entrar.
  - **Admin:** las 14 páginas desde el menú lateral, más estos flujos:
    - **Temporada:** crear una T4 desde el modal y pasar a ella.
    - **Competición:** con la rueda de colores.
    - **Fase de grupos:** agregar y quitar zonas, con el hover del botón.
    - **Asignación de equipos:** `addToGroup` y reset del select.
    - **Criterios:** reordenar por drag (`currentTarget`) y guardar con su confirmación.
    - **Generador de fechas:** 6 partidos.
    - **Equipo:** iniciales, clic al input de logo, agregar y quitar nombres anteriores.
    - **YuNaCoins y perfil:** historial de YuNaCoins (cerrar) y limpieza del @usuario en el perfil.
  - **Inyección:** un `data-onclick` con `setTimeout(…)` o `location.assign(…)` no corre y queda en consola.
- **Sandbox `tsc-src` con CSP enforce:** 0 violaciones; navegación pública y ajustes.
  - Con la ventana minimizada, la página activa del scroll público no se actualiza al navegar. Pasa igual llamando a `goPublicPage` directo, sin pasar por el despachador: es el scroll suave sin pintar, no un efecto de este cambio.
- `smoke-parity` → PARIDAD OK. `audit-wiring` → 0 rotos y 0 fuera de gramática. `csp.mjs --check` OK. `build-web` (38 JS → 9 bundles, splash fuera) y `build-www` (meta CSP sin `'unsafe-inline'`) sin error.

## Para código nuevo

- Handlers como `data-onclick="fn(…)"`, nunca `onclick=`. Solo llamadas a funciones globales de la app, con argumentos literales o `this`/`event`. Lo que haga falta más allá de eso va en una función nombrada.
- Nada de `<script>` inline: la CSP lo bloquea.

## Pendientes

- **M-11** (ya existente): después del merge a `main`, comprobar con `curl` el header `Content-Security-Policy` (ahora sin `'unsafe-inline'`) y hacer un inicio de sesión desde el celular.
- Una APK nueva lleva la meta CSP nueva. La instalada sigue con la anterior hasta que se actualice, sin efecto en el funcionamiento.

Acción del dueño requerida: ninguna nueva (M-11 al hacer el merge).
