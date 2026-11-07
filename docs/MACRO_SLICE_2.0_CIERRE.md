# Macro — Cierre de la Web 2.0 · 2026-11-07

Rama `feat/yunacoins-pes5`. Objetivo: dejar la 2.0 lista para el PR a `main`
(checklist de `WORKFLOW_2.0.md` §5). Supervisor: sesión Opus en
`tsc.web-yunacoins`. Implementa: Sonnet, un slice por sesión, con reporte en
`docs/reportes/2.0-<n>.md`.

## Slices

| # | Slice | Estado |
|---|---|---|
| **1** | Tool PES5 y editor dentro del panel admin (sin iframe) | **spec abajo** |
| 2 | Formación táctil en `mejoras.html` (hoy solo se mueve con flechas de teclado, `mejoras-page.js:1455`) | pendiente |
| 3 | Tool en dos modos: móvil/APK (pedidos, rechazo, reglas, YunaCoins) y PC (save) | pendiente |
| 4 | Núcleo YunaCoins (sobregiro, ledger, marca `synced`) + Plan B copiar/pegar | pendiente |
| 5 | Limpieza de `prototipo_yunas/`, versión 2.0.0, reglas desplegadas | pendiente |
| 6 | PR | pendiente |

Fuera de la 2.0 (propuesto para 2.1): Slice G (nivelación, espera a Luis) y
Plan A de Streamlabs por API (`tsc-src/prototipo_yunas/MACRO_SLICE_STREAMLABS.md`).

---

## Slice 1 — Tool PES5 y editor dentro del panel admin

### Por qué

1. **La tool no llega a producción.** Vive en `tsc-src/prototipo_yunas/`
   (`pes5-tool.html` + `pes5-tool.js`) y `scripts/build-exclude.mjs` excluye
   esa carpeta de `dist/` y `www/` desde `da3de88`. Mergeada hoy, Luis se
   queda sin tool.
2. **El editor embebido se rompe en producción.** La tool abre el editor como
   `<iframe src="../mejoras.html#admin">` (`pes5-tool.js` ~722) y habla por
   `postMessage`. La CSP de producción tiene
   `frame-src https://tsc-web-yuna.firebaseapp.com` (`scripts/csp.mjs:40`):
   el iframe del mismo origen queda bloqueado.
3. Decisión ya tomada (memoria `v2-editor-sin-iframe`): componente montable
   en el panel admin, carga bajo demanda, **sin iframe** (un iframe recarga
   Firebase, auth y db y abre otra conexión a Firestore).

### Alcance

**1.A — Tool al panel admin**

- Nueva entrada de sidebar admin **"Tool PES5"** (ícono SVG Lucide, sin
  emojis), página `page-pes5-admin` en `index.html`, `case 'pes5-admin'` en
  `renderAdminPage` (`js/nav.js` ~495). Solo rol admin.
- Mover `prototipo_yunas/pes5-tool.js` → `tsc-src/js/pes5-tool.js` y el
  `<style>` de `pes5-tool.html` → `tsc-src/css/pes5-tool.css`. El markup del
  `<body>` pasa a un template que la página renderiza dentro de
  `#page-pes5-admin`.
- **Carga bajo demanda:** la primera vez que se entra a la sección se
  inyectan, en este orden y una sola vez (guard), `css/pes5-tool.css`,
  `js/pes5-crypt.js`, `js/pes5-editor.js`, `js/pes5-save.js`,
  `js/yunacoins-rules.js`, `js/pes5-plantilla.js`, `js/pes5-bloqueo.js`,
  `js/pes5-tool.js` (+ el editor, ver 1.B). **No** agregarlos como
  `<script>` en `index.html`: entrarían al bundle que baja todo visitante.
  Firebase, `auth.js`, `db.js` y `events.js` ya están en `index.html`: no
  recargarlos. Volver a entrar a la sección re-renderiza, no recarga.
  Confirmar que `build-web.mjs` copia `js/` y `css/` sueltos a `dist/` (los
  dinámicos se piden por ruta, no por bundle) y que `build-www.mjs` los
  incluye.
- **Choques de globales** con `index.html` (verificado): `showToast`,
  `openModal`, `closeModal`, `renderAuthUI`. Usar los del panel cuando la
  firma sea compatible (`showToast(msg,type)` de `ui-utils.js` acepta un
  solo argumento) y borrar las copias de la tool; `renderAuthUI` de la tool
  se elimina (el panel ya maneja auth). Nombres genéricos que no chocan hoy
  pero son frágiles en scope global (`TAB`, `TABS`, `ICN`, `PLANO`,
  `COLS_ATTR`…): encapsular la tool en una IIFE y exponer a `window` solo
  las funciones que usan los `data-on*`, con prefijo `pt` si el nombre es
  genérico. `js/events.js` resuelve `window[root]`: verificar que cada
  handler expuesto resuelva y correr `node scripts/audit-wiring.mjs`
  (0 rotos).
- `window.addEventListener('pagehide', …)` que libera el bloqueo por equipo:
  conservarlo y además liberar al salir de la sección (cambio de página admin
  o `setMode('public')`).
- **Audio:** el panel carga `sounds.js`. Mientras la sección está activa no
  debe sonar nada de la página principal.
- Aviso de navegador en la sección cuando `PES5_SAVE.tieneSoporte()` es
  falso (ya existe en `renderStatusBar`; que se vea dentro del panel).

**1.B — Editor como componente (sin iframe ni postMessage)**

- `js/mejoras-page.js` (1890 líneas) sigue siendo la página del presidente
  en `mejoras.html` y además se monta en la tool. Exponer una API única,
  p. ej. `MEJORAS_EDITOR.montar(contenedor, opciones)` /
  `MEJORAS_EDITOR.desmontar()`.
- El contrato ya existe en los mensajes: lo que hoy viaja en `pt-init`
  (`enviarInitEditor`, pes5-tool.js ~739: equipo, reglas, presupuesto,
  jugadores, jugadorId, pendiente) pasa a ser `opciones`; lo que vuelve en
  `pt-aplicar` (`recibirAplicarDelEditor`) pasa a ser un callback
  `onAplicar({jugadorId, draft})`, más `onCerrar()`. Quitar
  `ADMIN_EMBED`/`location.hash === '#admin'`, el listener `message` de los
  dos lados y el `<iframe>`.
- Choques de globales del editor con `index.html` (verificado):
  `showToast`, `openModal`, `closeModal`, `renderAuthUI`, `toggleTheme`.
  Mismo criterio: IIFE, exponer solo handlers con nombres no genéricos.
- `mejoras-page.js` define su propio `_esc` (línea 2). AGENTS.md: el único
  escape es `js/sanitize.js` (`escHtml`/`escAttr`/`safeImgUrl`). Cargar
  `sanitize.js` en `mejoras.html` si falta y reemplazar `_esc`. Lo mismo en
  `pes5-tool.js` si tiene copia.
- `mejoras.html` (presidente) debe seguir funcionando igual: mismo módulo,
  modo presidente. No cargar en `mejoras.html` nada de la tool.
- El CSS del editor que hoy está en `mejoras.html` y que necesita la vista
  admin: extraer lo compartido a `css/mejoras-editor.css` (cargado por
  `mejoras.html` y bajo demanda por la sección), sin duplicar.

### Fuera de alcance

Rediseño móvil de la tool (slice 3), formación táctil (slice 2), YunaCoins
(slice 4), borrar `prototipo_yunas/` (slice 5; en este slice **no** borrar
`pes5-tool.html` todavía: dejar un comentario arriba que diga que se mudó al
panel). No tocar reglas de Firestore ni `scripts/csp.mjs`.

### Riesgos

- **Global que se pisa en silencio** (una `function` de la tool redefine una
  del panel al cargarse): la IIFE lo evita; verificar con el listado de
  nombres antes y después.
- **Scope estricto:** `build-web.mjs` agrupa por modo estricto. Los
  dinámicos no van al bundle, pero el orden de carga importa: cargar con
  `script.async = false` o encadenar `onload`.
- **Bloqueo por equipo huérfano** si el admin sale de la sección con la tool
  abierta: liberar en la salida de sección (ver 1.A).

### Verificación (gate)

Seguir `docs/PROTOCOLO_VERIFICACION.md`. Escrituras **solo en el sandbox**
(`tsc-emu`, puerto 3001), nunca en `localhost:3000` contra producción.

1. `node --check` de todos los JS tocados; `node scripts/audit-wiring.mjs`
   con 0 rotos; `node scripts/csp.mjs --check`; `node scripts/smoke-parity.mjs`.
2. Tests de `tsc-src/prototipo_yunas/pes5/tools/` iguales que antes
   (`test-pes5-plantilla` y `test-posiciones-banda` ya fallaban por el save
   local; no deben aparecer fallos nuevos).
3. Sandbox, variante `tsc-src` **y** variante `dist` (`tsc-emu-dist`):
   entrar como admin a "Tool PES5"; consola sin errores de CSP; la red pide
   los JS de la tool solo al abrir la sección; elegir carpeta del save,
   abrir un jugador, editar, "Aplicar" vuelve a la tool como cambio
   pendiente; aplicar un pedido de formación de prueba.
4. Como visitante anónimo y como presidente: los JS de la tool **no** se
   descargan.
5. `mejoras.html` como presidente: abre, edita, pide formación, igual que
   antes.
6. `graphify update .` en `tsc-src/` y `python ../scripts/graphify-label.py`.

### Entrega

Commits en la rama (sin push hasta el OK del supervisor) y reporte en
`docs/reportes/2.0-1.md`: archivos movidos, globales expuestas, resultado de
cada punto del gate con capturas del sandbox.
