# Macro — Cierre de la Web 2.0 · 2026-11-07

Rama `feat/yunacoins-pes5`. Objetivo: dejar la 2.0 lista para el PR a `main`
(checklist de `WORKFLOW_2.0.md` §5). Supervisor: sesión Opus en
`tsc.web-yunacoins`. Implementa: Sonnet, un slice por sesión, con reporte en
`docs/reportes/2.0-<n>.md`.

## Slices

| # | Slice | Estado |
|---|---|---|
| 1 | Tool PES5 y editor dentro del panel admin (sin iframe) | **cerrado** (`docs/reportes/2.0-1.md`) |
| **2** | Formación táctil en `mejoras.html` (hoy solo se mueve con flechas de teclado) | **spec abajo** |
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

---

## Slice 2 — Formación táctil

### Por qué

El modal de formación (`openFormationModal`, `js/mejoras-page.js` ~1230)
solo mueve al jugador seleccionado con las flechas del teclado
(`document.addEventListener('keydown', …)` ~1545). En el celular y en la
APK, que es donde los presidentes abren `mejoras.html`, no hay teclado: hoy
se puede elegir el jugador tocando el punto, pero **no se puede mover**. Además, a
375 px de ancho la cancha mide ~343 × 156 px y cada punto ~12 px
(`.ep-pitch-dot{width:3.4%}`): tocar el punto correcto ya cuesta.

### Alcance

**2.A — Movimiento a una celda destino (lógica compartida)**

- Extraer de `moveFormationDot(dx,dy)` una función
  `moveFormationDotTo(x, y, {silencioso})` que mueve el slot seleccionado a
  la celda (x, y) **como un solo cambio**: clamp (x 2..47, y 1..47),
  `ajustarPosicionAlMover`, `lineaBajoMinimo` y, si falla, restaura x/y/pos
  como hoy. Devuelve `true`/`false`. `moveFormationDot(dx,dy)` pasa a ser
  `moveFormationDotTo(slot.x+dx, slot.y+dy)`. Mismas reglas y mismos textos
  de toast que hoy: no cambiar reglas de línea ni de banda.
- Inversa de la grilla: `pitchCeldaDesdePunto(clientX, clientY)` →
  `{x, y}` usando el rect de `#ep-pitch-field` y las inversas de
  `pitchColPct`/`pitchRowPct` (con `PITCH_PAD_X/Y`; columna mínima 2,
  ver `pitchFrac`). Redondear a la celda más cercana.

**2.B — Arrastre con el dedo (solo táctil)**

- **Decisión de Jimbo:** en PC no se arrastra con el mouse, para mayor
  fidelidad. El arrastre solo corre si `event.pointerType` es `'touch'` o
  `'pen'`. Con `'mouse'` el `pointerdown` solo **selecciona** el punto más
  cercano y el movimiento es con la cruz (2.C) o las flechas del teclado.
  Se decide por `pointerType` y no por `matchMedia`, así una notebook con
  pantalla táctil arrastra con el dedo y no con el mouse.

- Pointer Events sobre `#ep-pitch-field` (un solo listener en el campo,
  no en cada punto: `renderFormationModal` reemplaza el `innerHTML` de
  `#ep-pitch-dots` en cada render y un listener por punto se perdería). Los
  listeners se registran con `addEventListener` en `openFormationModal`
  (no hay `data-on*` para pointer en `events.js`; no hace falta agregar).
- `pointerdown`: elegir el punto **más cercano** al toque dentro de un
  radio de ~22 px (hit area real ≥ 44 px aunque el punto se vea de 12 px;
  si hay dos cerca, gana el más cercano). Si no hay ninguno en el radio,
  no hace nada (no mover al vacío). Selecciona ese jugador
  (`FORM.sel`) y `setPointerCapture` en el campo.
- `pointermove` con captura: convertir a celda; si la celda cambió, llamar
  `moveFormationDotTo(x, y, {silencioso:true})`. Si el destino es inválido
  el punto queda en la última celda válida. Mostrar **un solo toast por
  arrastre**: el motivo del primer rechazo, al soltar.
- `pointerup`/`pointercancel`: liberar la captura y cerrar el arrastre.
  Un toque sin movimiento solo selecciona (reemplaza el `data-onclick` de
  cada punto: quitarlo para no seleccionar dos veces).
- El arquero (`isKeeperSlot`) se puede seleccionar pero no arrastrar:
  toast actual «El arquero no se mueve de su posicion.» una vez.
- CSS: `touch-action:none` en `.ep-pitch-field` (que el arrastre no haga
  scroll de la página ni zoom), `user-select:none`. El commit `f163bd2`
  ya aisló el scroll del modal en móvil: no romperlo (la cancha sí debe
  poder quedar fuera de la vista y el resto del modal hacer scroll si se
  toca **fuera** de la cancha).
- Durante el arrastre: clase `dragging` en el punto (un poco más grande,
  ~1.4×) y la etiqueta de posición visible (ya existe `ep-pitch-tag` en el
  seleccionado).
- Rendimiento: `renderFormationModal` reescribe todo el modal. En
  `pointermove` llamar el render solo cuando cambia la celda (ya filtrado
  arriba), y agrupar con `requestAnimationFrame`.

**2.C — Ajuste fino sin teclado**

- Cruz de 4 botones (SVG Lucide `chevron-*`, sin emojis) en
  `.ep-pitch-selctl` o en una fila propia debajo de la cancha, que llaman
  `moveFormationDot(±1,0)` / `(0,±1)` con `data-onclick`. Mantener
  presionado repite (opcional; si se hace, con `pointerdown` +
  `setInterval` ~120 ms y corte en `pointerup/leave/cancel`). Tamaño de
  toque ≥ 40 px.
- El texto de ayuda (`.ep-pitch-hint`) cambia según el dispositivo:
  con `matchMedia('(pointer: coarse)')` → «Arrastrá un punto para
  moverlo · flechas para el ajuste fino»; si no → «Clic en un punto para
  elegirlo · flechas (en pantalla o del teclado) para moverlo».
- La cruz se muestra siempre (en PC es el control principal).
- Las flechas del teclado y Tab siguen funcionando igual.

### Fuera de alcance

Reglas de formación, `confirmFormation` y el pedido `pedidos_pes5` (no
tocar el formato del pedido). Cancha vertical en el celular (si en la
prueba en el teléfono el arrastre resulta impreciso, se propone como
slice aparte). La tool del admin (slice 3). Reglas de Firestore y CSP.

### Riesgos

- **Doble selección:** el `click` que sigue a un `pointerup` sin movimiento
  vuelve a disparar el `data-onclick` del punto si queda. Quitarlo (ver
  2.B).
- **Captura perdida por re-render:** la captura va en el campo (que no
  se re-renderiza), no en el punto.
- **Escape:** cualquier texto nuevo con nombres de jugador pasa por
  `escHtml` (sanitize.js).
- `closeIfBackdrop` del overlay: un arrastre que termina fuera de la
  cancha no debe cerrar el modal (el `click` del overlay no debe dispararse
  al soltar fuera). Verificarlo.

### Verificación (gate)

Escrituras **solo en el sandbox** (`tsc-emu`, 3001).

1. `node --check js/mejoras-page.js`; `node scripts/audit-wiring.mjs` 0
   rotos; `node scripts/csp.mjs --check`; `node scripts/smoke-parity.mjs`.
2. Sandbox, `mejoras.html` como presidente (misma siembra que 2.0-1, B-2),
   viewport móvil (`resize_window` preset mobile, que emula toque) **y**
   escritorio:
   - arrastrar un defensor dentro de su franja: se mueve celda a celda y la
     etiqueta de posición acompaña;
   - arrastrarlo a una línea llena: se queda en la última celda válida y sale
     un solo toast;
   - arrastrar dejando una línea bajo el mínimo: rechazo con el toast de mínimo;
   - tocar sin mover: solo selecciona;
   - tocar el arquero y arrastrar: no se mueve;
   - escritorio con mouse: arrastrar un punto **no** lo mueve (solo lo
     selecciona); la cruz y las flechas del teclado lo mueven de a 1 celda;
   - cruz de ajuste fino: mueve 1 celda; la página no hace scroll durante el
     arrastre; soltar fuera de la cancha no cierra el modal;
   - «Confirmar» → pedido `formacion` en el emulador con las mismas
     `prof/lat` que muestra la cancha (comparar con el texto
     «Columna x/47 · Fila y/47»).
3. Variante `dist` (`tsc-emu-dist`): el mismo recorrido corto (arrastrar +
   Confirmar).
4. Teclado en escritorio: flechas y Tab igual que antes.
5. `graphify update .` en `tsc-src/` y `python ../scripts/graphify-label.py`.

### Entrega

Commits en la rama y reporte en `docs/reportes/2.0-2.md` con el resultado
de cada punto del gate y capturas móvil/escritorio. Push a
`feat/yunacoins-pes5` después de la auditoría del supervisor. Pendiente de
prueba manual de Jimbo: la APK o el navegador del celular con el save real
no hacen falta; alcanza con abrir `mejoras.html` en el teléfono y arrastrar.
