# Macro — Cierre de la Web 2.0 · 2026-11-07

Rama `feat/yunacoins-pes5`. Objetivo: dejar la 2.0 lista para el PR a `main`
(checklist de `WORKFLOW_2.0.md` §5). Supervisor: sesión Opus en
`tsc.web-yunacoins`. Implementa: Sonnet, un slice por sesión, con reporte en
`docs/reportes/2.0-<n>.md`.

## Slices

| # | Slice | Estado |
|---|---|---|
| 1 | Tool PES5 y editor dentro del panel admin (sin iframe) | **cerrado** (`docs/reportes/2.0-1.md`) |
| 2 | Formación táctil en `mejoras.html` (hoy solo se mueve con flechas de teclado) | **cerrado** (`docs/reportes/2.0-2.md`) |
| 3 | Tool en dos modos: móvil/APK (pedidos, rechazo, reglas, YunaCoins) y PC (save) | **cerrado** (`docs/reportes/2.0-3.md`) |
| **3b** | Splash colgado al recargar en una sección admin | **spec abajo** |
| **3c** | Rediseño visual de `mejoras.html` (presidente), teléfono primero | **spec abajo** |
| 3d | Formación vertical en el teléfono (cancha de pie, sin cruz en táctil; debajo, ficha básica y resumen Mejores/Peores/Habilidades/Posiciones solo si el alto alcanza; propuesta, pantalla 4) | pendiente, después de 3c |
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

---

## Slice 3 — Tool en dos modos: móvil/APK y PC

### Por qué

La sección "Tool PES5" (slice 1) está pensada para el escritorio. En el
celular o en la APK pasan tres cosas:

- **No hay File System Access.** `PES5_SAVE.tieneSoporte()` es falso, así
  que no se puede leer ni escribir el save.
- **Aparece el aviso largo de Brave** (`renderStatusBar`, `js/pes5-tool.js`
  ~331), que no corresponde en un teléfono.
- **Hay pestañas que no sirven sin save:**
  - Plantilla y Publicar quedan en «Cargá el save».
  - Pedidos ofrece «Aplicar y descargar save», que sin save cargado no
    puede funcionar.
  - Las tablas anchas desbordan a 375 px.

Lo que sí sirve en el teléfono, y Luis lo necesita en el directo, es:

- ver los pedidos pendientes;
- rechazar un pedido con un motivo;
- ver y editar las reglas de YunaCoins;
- en el slice 4, los ajustes de YunaCoins.

### Modo

`ptModo()` → `'pc'` | `'movil'`. Se calcula una vez en `montar()`:

- **`'pc'`** si `PES5_SAVE.tieneSoporte()`.
- **`'movil'`** en cualquier otro caso: teléfono, APK, Firefox, Safari y
  Brave con el flag apagado.

La decisión va por capacidad, no por ancho ni por userAgent. El ancho de la
pantalla solo cambia el layout (CSS), no el modo.

El aviso de la barra de estado depende de cómo se ve la página:

- **Táctil o APK** (`matchMedia('(pointer: coarse)')` o
  `Capacitor.isNativePlatform()`, mismo chequeo que `js/boot-splash.js:53`):
  «Modo móvil: pedidos y reglas. Para leer o escribir el save, abrí esta
  sección en Chrome o Edge en la PC.»
- **Escritorio sin la API:** el aviso actual de Brave/Firefox, más una línea
  que diga que mientras tanto funciona el modo móvil.

### Alcance

**3.A — Pestañas por modo**

- **Modo `'movil'`:** pestañas **Pedidos** (primera y por defecto) y
  **Reglas**. Equipos, Plantilla y Publicar no se muestran.
  - Slice 4 agrega YunaCoins a los dos modos: dejar el arreglo de pestañas
    preparado para sumarla.
  - `cargarSaveDesdeCarpeta` y `recuperarCarpeta` no se llaman: hoy ya los
    protege `tieneSoporte`, solo verificarlo.
- **Modo `'pc'`:** igual que hoy, sin cambios de comportamiento.
- `TABS` pasa a filtrarse por `ptModo()`. `switchTab` a una pestaña que no
  existe en el modo cae en la primera disponible.

**3.B — Pedidos en el teléfono**

- **En modo `'movil'`:**
  - Ni checkbox de selección, ni «PES5 está cerrado», ni botón de aplicar.
  - En su lugar, una nota: «Los pedidos se aplican desde la PC con el save
    abierto».
  - El rechazo funciona igual: misma escritura en `pedidos_pes5` y mismos
    campos.
- **Debajo de 640 px**, en cualquier modo, la tabla pasa a **tarjetas**.
  Cada tarjeta muestra:
  - equipo;
  - jugador o «Formación»;
  - líneas de cambio;
  - costo o «gratis»;
  - fecha;
  - botón Rechazar de 44 px de alto.
  
  Se puede hacer con CSS sobre la misma tabla (`display:block` +
  `data-label`) o con un render aparte. Lo elige el implementador; que no
  duplique la lógica de los datos.
- **`prompt()` del motivo de rechazo** (`rechazarPedido`, ~1178): pasa a
  un modal propio de la sección con:
  - `textarea`;
  - Cancelar;
  - Rechazar (deshabilitado si el motivo está vacío).

  Si se cancela, no escribe nada (hoy se escribe «sin motivo» si el motivo
  queda vacío: ahora el motivo es obligatorio). Se usa también en PC. El
  texto va como dato al guardarse; si se muestra en pantalla, pasa por
  `escHtml`.
- Los `confirm()` de aplicar y escribir (solo PC) quedan como están: fuera
  de alcance.

**3.C — Layout angosto**

- Sin scroll horizontal de página a 375 px. Las tablas que quedan en modo
  `'pc'` siguen con `.pt-tbl-wrap` y scroll propio.
- Pestañas con toque ≥ 44 px de alto y scroll horizontal propio (ya existe
  `overflow-x:auto`).
- Reglas: inputs a ancho completo bajo 640 px; el botón de guardar visible
  sin scroll lateral.
- `.pt-shell` con padding de 16 px a los lados en el teléfono (gutter de
  AGENTS/artifact). Sin `position:sticky` en el panel lateral bajo 900 px
  (ya colapsa a una columna).

**3.D — APK**

- Confirmar que la APK (Capacitor) carga la sección:
  - `build-www.mjs` incluye `js/` y `css/` (con `pes5-admin.js` y
    los dinámicos);
  - la CSP de la APK (`<meta>` de `build-www`) permite cargar los
    scripts dinámicos con `'self'`.
- Basta con `node scripts/build-www.mjs` y revisar que `www/js/pes5-tool.js`,
  `www/js/pes5-admin.js` y `www/css/pes5-tool.css` existen. No compilar la
  APK ni correr `cap sync` (no stagear `android/*`).

### Fuera de alcance

- YunaCoins (slice 4).
- Leer o escribir el save en el teléfono (no hay API).
- Cambios en reglas de Firestore o CSP.
- La formación del presidente (slice 2, cerrado).

### Riesgos

- **Un admin en PC con Brave** cae en modo móvil sin entender por qué. El
  aviso de escritorio tiene que explicarlo (ver «Modo»).
- **Choque con el bloqueo por equipo** (`pes5-bloqueo.js`): en modo móvil
  no se abre ningún jugador, así que no debería tomarse ningún bloqueo.
  Verificar que no quede un bloqueo tomado al entrar y salir en modo móvil.
- **Motivo obligatorio:** cambia el comportamiento actual (antes se aceptaba
  vacío). Es deliberado.

### Verificación (gate)

Escrituras **solo en el sandbox** (`tsc-emu`, 3001).

1. `node --check` de los JS tocados; `audit-wiring` 0 rotos; `csp.mjs
   --check`; `smoke-parity`.
2. Sandbox, admin, viewport **móvil** (preset mobile) con
   `showDirectoryPicker` ausente (en el navegador de la app ya falta; si
   no, `delete window.showDirectoryPicker` antes de entrar a la sección):
   - solo pestañas Pedidos y Reglas;
   - aviso móvil corto;
   - pedidos en tarjetas sin botón de aplicar;
   - rechazar con el modal → el pedido pasa a `rechazado` con el motivo en
     el emulador;
   - motivo vacío → no deja confirmar;
   - Reglas: editar un valor y guardar → se refleja en el emulador;
   - sin scroll horizontal de página (`document.documentElement.scrollWidth
     <= innerWidth`);
   - `pes5_bloqueos` sin documentos nuevos.
3. Viewport escritorio con la API: todo igual que en 2.0-1. Hay que poder
   abrir las 5 pestañas, y el rechazo usa el modal nuevo.
4. Variante `dist` (`tsc-emu-dist`): recorrido móvil corto (pedidos +
   rechazo).
5. `node scripts/build-www.mjs` y existencia de los 3 archivos en `www/`.
   No commitear `www/`, si está en git.
6. `graphify update .` + `graphify-label.py`.

### Entrega

Commits en la rama y reporte `docs/reportes/2.0-3.md` con capturas en el
teléfono y en el escritorio. Push después de la auditoría. Pendiente de
prueba manual de Jimbo/Luis: abrir la sección en la APK o en el navegador
del teléfono y rechazar un pedido de prueba.

---

## Slice 3b — Splash colgado al recargar dentro del panel admin

### Por qué

Lo vio Sonnet en 2.0-1 y 2.0-3: un admin recarga la página estando en
cualquier sección admin y el splash no se va nunca. Queda en «Esto está
tardando más de lo normal…» (`js/boot-splash.js:80`) y después en «Problema
al cargar…». La salida es borrar `tsc_admin_page` y `tsc_mode` de
`localStorage`. `boot-splash.js` es igual en `main`, así que **muy
probablemente pasa también en producción**. Un admin que recarga queda
trabado.

### Hipótesis (a confirmar, no a asumir)

El splash espera cinco pasos (`READY_KEYS`, `boot-splash.js:10`). Uno de
ellos es `publicMounted`, que solo se marca con el evento
`tsc:public-section-mounted` (`nav.js` ~406, en
`ensurePublicSectionMounted`). Al recargar en modo admin pasa esto:

1. El arranque llama a `setMode('public')` (`ui-utils.js` ~860) y empieza a
   montar la sección pública.
2. Llega `tsc:auth` con rol admin y corre `setMode('admin')` (~883).
3. Ese cambio hace `_publicFocusToken++` y `goAdminPage`
   (`nav.js` ~176).
4. Si el montaje público se corta, o no termina antes de ese paso,
   `publicMounted` nunca se marca y el splash no se va.

### Alcance

1. **Reproducir y confirmar la causa.**
   - Sandbox (3001), admin, sección cualquiera (p. ej. Equipos y Tool
     PES5), recargar.
   - Con el splash colgado, leer `window.TSC_BOOT_READY`: qué clave falta.
   - Revisar por qué no llega `tsc:public-section-mounted` (token,
     `ensurePublicSectionMounted` cortado, `renderPublicPage` que espera
     algo que en modo admin no llega).
   - Reproducir también en `main` sobre su sandbox, o razonarlo con el
     código de `main`, para saber si es de producción.
   - Si la causa resulta otra, corregir la hipótesis en el reporte.
2. **Arreglo mínimo.** El splash tiene que irse cuando la **primera vista**
   quedó lista, pública o admin. Opción sugerida:
   - `goAdminPage`/`renderAdminPage` marca el paso con
     `markBootStep('publicMounted')` (o renombrarlo a `viewMounted`, en
     `boot-splash.js` y en sus usos) después de renderizar la primera página
     admin.
   - Sin tocar la lógica de restaurar el modo.
   - No sumar un timeout que oculte el splash a ciegas: tapa errores
     reales.
   - Si la causa es otra, el arreglo apunta a esa causa.
3. **Que no haya regresión.** En modo público el splash se va como antes. La
   APK mantiene los dos `requestAnimationFrame`. El `aria-hidden` / modo
   offline (`ui-utils.js` ~793–813) se mantiene igual.

### Hotfix a main

Si se confirma que pasa en producción, **no** se arregla en `main` desde acá.
Se anota en el reporte para que Jimbo decida un hotfix según
`WORKFLOW_2.0.md` (hotfixes). El arreglo de esta rama tiene que poder
llevarse a `main` como un commit chico y separado: no mezclarlo con otros
cambios.

### Verificación (gate)

1. `node --check`, `audit-wiring` 0 rotos, `csp --check` y `smoke-parity`.
2. Sandbox `tsc-src` y `dist` (`tsc-emu-dist`). Recargar en estas
   situaciones; en todas el splash tiene que irse en menos de 3 s, en
   escritorio y en móvil:
   - modo admin, en Equipos, Tool PES5, Partidos y una sección más;
   - modo público, en dos secciones;
   - sin sesión;
   - sesión de presidente.
3. `TSC_BOOT_READY` completo después de cada recarga; ningún `_failed`
   nuevo.
4. `graphify update .` + `graphify-label.py`.

### Entrega

Commit **único** del arreglo (más el reporte aparte) y reporte en
`docs/reportes/2.0-3b.md`: causa confirmada con evidencia, si afecta
producción, y el diff exacto para un posible hotfix.

---

## Slice 3c — Rediseño de Mejoras (presidente)

### Por qué

`mejoras.html` funciona, pero en el teléfono la UI es pobre y la estética no
acompaña a la web. Problemas concretos:

- la ruta de la cabecera se corta en dos líneas;
- la plantilla es una tira horizontal de chips con un bloque rojo
  «TITULARES»;
- la cabecera «EDITAR JUGADOR» tiene un fondo metálico ajeno a la web;
- 17 atributos van en una sola lista;
- el bloque fijo «Acumulado» tapa la lista y la descripción vive en una caja
  aparte.

Jimbo aprobó la propuesta de Claude Design:
**https://claude.ai/artifact/9jnGWwL24mY6BGjNnN4fWE**. Las pantallas 1, 2, 3
y 5 son el objetivo de este slice; la 4 (formación vertical) es el slice 3d.
Es privada: el implementador la abre con la herramienta Artifact
(`action: "read"`) para ver los valores exactos (colores, tamaños, textos).

### Regla de oro

**Solo presentación.** Se tocan el markup (`MEJ_MARKUP` y los render de
`js/mejoras-page.js`) y el CSS (`css/mejoras-editor.css`). Además:

- no cambian cálculos de costo, topes, reglas, pedidos, bloqueo ni
  formación;
- se conservan los `id` que lee la lógica (`ep-balance-*`, `ep-rows`,
  `ep-cost`, `ep-apply`, `ep-search`, `ep-roster-list`, `ep-hist-badge`, …);
  si uno cambia de lugar, sigue existiendo;
- handlers con `data-on*`; escape con `escHtml`; íconos SVG Lucide sin
  emojis;
- tokens de `css/variables.css` (`--gold`, `--card`, `--brd`…), no hex
  sueltos, salvo los colores de nivel PES5.

El editor también se monta en la Tool del admin (`ADMIN_EMBED`, clase
`.ep-root.admin-embed`): la vista admin tiene que seguir funcionando y
verse coherente.

### Alcance (pantalla por pantalla de la propuesta)

**1 · Plantilla**

- **Cabecera de una línea:** volver a la web, escudo o iniciales del
  equipo, nombre en Bebas con «Mejoras de jugadores» de subtítulo, y botón
  de cuenta (sesión, tema, salir). Reemplaza `.ep-crumb`.
- **Tarjeta de saldo:**
  - saldo grande en dorado;
  - barra de progreso del tope de temporada (usado / tope; mismos datos que
    `ep-balance-general` / `ep-hero-general-cap`);
  - bono de suscriptores en una franja verde aparte.
- **Dos accesos grandes:**
  - **Formación**: muestra la alineación actual y «gratis»;
  - **Pedidos**: es el Historial actual (`openAuditModal`), con su contador
    `ep-hist-badge`. Solo cambia la etiqueta; el modal es el mismo.
- **Aviso de pedido pendiente** (si hay uno): «<jugador> · <cambios> espera
  que Luis lo aplique».
  - Usa los datos que ya carga el historial, sin lecturas nuevas a
    Firestore.
  - Si exige una lectura nueva, se omite y se anota en el reporte.
- **Plantilla vertical** en lugar de los chips:
  - buscador;
  - selector segmentado Titulares / Suplentes / Reserva, con conteo;
  - filas de 60 px: badge de posición con el color de su línea
    (arquero / defensa / medio / ataque), nombre, rol y una marca «Pedido»
    si el jugador tiene uno pendiente.

**2 · Editar jugador**

- **Teléfono (< 860 px):** plantilla y editor son dos vistas.
  - Tocar un jugador abre el editor; «volver» regresa a la plantilla
    conservando la pestaña y el scroll.
  - El encabezado del editor muestra «Titular 3 de 11» y flechas de
    jugador anterior/siguiente.
- **Escritorio:** dos columnas (pantalla 5).
- **Ficha:**
  - badge de posición grande y nombre en Bebas;
  - 4 casillas: Edad, Altura, Pie, Banda;
  - la altura (gratis) se edita desde su casilla con el control que ya
    existe: se reubica, no se reescribe.
- **Paginador como el del juego** (pedido explícito de Jimbo): flecha,
  «PRINCIPALES 1/4», flecha y 4 marcas de página.
  - Es el `ep-pager` actual restilizado, con botones de 44 px.
  - **No** usar pestañas.
- **Página Principales:** los 17 atributos se agrupan con subtítulos (Rol,
  Físico, Balón y pase, Disparo; el mapeo está en la propuesta). Las otras
  páginas van sin grupos.
- **Fila de atributo:**
  - nombre;
  - valor en Bebas con el color de nivel PES5: 95+ rojo, 90+ naranja, 80+
    amarillo, 75+ verde, el resto claro (si ya hay una escala, usar esa);
  - barra fina con el valor;
  - botones − / + de 44 px.
- **Fila cambiada:**
  - resaltada en dorado, con el valor anterior tachado;
  - debajo, la descripción (hoy en `ep-hint`) y el costo de ese cambio.
  - `ep-hint` desaparece como caja aparte, pero su texto sigue disponible
    para el atributo seleccionado.
- **Barra inferior fija** (reemplaza `.ep-cart`):
  - «N cambios · queda X YC», total en dorado, descartar (ícono) y
    «Revisar» (abre `openApplyConfirm`);
  - `padding-bottom` en el contenido para que no tape la última fila, más
    `env(safe-area-inset-bottom)`;
  - `ep-warn` se ve encima de la barra cuando hay aviso.

**3 · Revisar y enviar**

- `openApplyConfirm`: panel que sube desde abajo en el teléfono y modal
  centrado en escritorio.
- Contenido: cada cambio (jugador, atributo de → a, costo), saldo antes →
  después, tope de temporada y bono usado. Son los mismos datos que hoy.
- Botones: «Seguir editando» y «Enviar a Luis».
- Texto: «Se cobra cuando Luis lo aplica en el juego. Mientras esté
  pendiente lo podés cancelar.»

**5 · Escritorio (≥ 860 px)**

- Columna izquierda de 340–380 px: saldo, accesos, segmentado y lista.
- Columna derecha: ficha con paginador, grupos de atributos en 2 columnas y
  barra de cambios al pie del editor.

**Modales existentes** (historial/pedidos, formación actual): solo adoptan
los tokens y radios nuevos. La formación vertical va en el slice 3d.

### Fuera de alcance

- La formación vertical (3d).
- Lógica de costos, reglas o pedidos.
- La Tool del admin, más allá de no romper `admin-embed`.
- Tema claro: si hoy existe (`mejToggleTheme`), conservarlo con los tokens
  claros de `variables.css`, sin rediseñarlo.

### Riesgos

- **Clases que la lógica busca con `querySelector`:** antes de cambiar una
  clase, `grep` de sus usos.
- **`admin-embed`:** el editor dentro del modal de la tool tiene otro
  ancho. Verificarlo en el panel admin.
- **Scroll aislado** de `f163bd2` (sin traspaso al fondo en móvil/APK): la
  vista de dos pantallas no debe romperlo.

### Verificación (gate)

Escrituras **solo en el sandbox** (3001).

1. `node --check`, `audit-wiring` 0 rotos, `csp --check`, `smoke-parity`.
2. Presidente en el sandbox, a 375 px y a 1280 px:
   - recorrido completo: plantilla → jugador → subir 2 puntos → revisar →
     enviar;
   - el pedido llega al emulador igual que antes: comparar sus campos con
     un pedido creado antes del slice;
   - cancelar el pendiente;
   - paginador de 1/4 a 4/4;
   - altura, buscador y segmentado;
   - sin scroll horizontal;
   - la barra inferior no tapa la última fila.
3. Admin en la Tool PES5: abrir un jugador en el editor embebido, editar y
   aplicar → vuelve como cambio pendiente.
4. Variante `dist`: recorrido corto.
5. Reporte con capturas de teléfono y escritorio al lado de la propuesta.
6. graphify.

### Entrega

Commits en la rama y `docs/reportes/2.0-3c.md`. Push después de la
auditoría. La prueba en el teléfono real la hace el supervisor por USB, como
en 2.0-2.
