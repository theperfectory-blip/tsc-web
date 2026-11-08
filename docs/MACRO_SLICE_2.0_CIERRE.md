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
| 3b | Splash colgado al recargar en una sección admin | **cerrado** (`docs/reportes/2.0-3b.md`, hotfix en main) |
| 3c | Rediseño visual de `mejoras.html` (presidente), teléfono primero | **cerrado** (`docs/reportes/2.0-3c.md`) |
| 3d | Formación vertical en el teléfono (cancha de pie, sin cruz en táctil; debajo, ficha básica y resumen Mejores/Peores/Habilidades/Posiciones solo si el alto alcanza; propuesta, pantalla 4) | **cerrado** (`docs/reportes/2.0-3d.md`, probado en teléfono real) |
| 4 | Núcleo YunaCoins (sobregiro, ledger, marca de sincronizado) + Plan B copiar/pegar | **cerrado** (`docs/reportes/2.0-4.md`) |
| **5** | Limpieza de `prototipo_yunas/`, reglas cerradas y desplegadas, versión 2.0.0 y APK | **spec abajo** |
| 6 | PR | pendiente |

Fuera de la 2.0 (propuesto para 2.1): Slice G (nivelación, espera a Luis) y
Plan A de Streamlabs por API (`docs/2.0/investigacion/MACRO_SLICE_STREAMLABS.md`).

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

---

## Slice 3d — Formación vertical en el teléfono

### Por qué

En el teléfono la cancha horizontal mide unos 343 × 156 px: cada fila de la
grilla de 47 queda de unos 3 px y el arrastre es impreciso. Con la cancha de
pie se usa el alto de la pantalla. Jimbo pidió además:

- **Sacar la cruz en táctil:** la gente toca y arrastra el jugador por
  instinto.
- **Usar ese espacio para el jugador seleccionado:**
  - una ficha básica;
  - si el alto alcanza, un resumen.

Propuesta aprobada: **https://claude.ai/artifact/9jnGWwL24mY6BGjNnN4fWE**,
pantalla 4 (`project/Formacion.dc.html`).

### Alcance

**3d.A — Orientación**

- **Cancha vertical** cuando el ancho del viewport es menor a 860 px
  (teléfono o APK en vertical), con:
  - el arco propio abajo;
  - el ataque arriba;
  - la banda izquierda a la izquierda.

  En escritorio sigue horizontal, como hoy.
- **Una sola variable de orientación.** `pitchColPct` / `pitchRowPct` /
  `pitchZoneEdges` / `pitchCeldaDesdePunto` la leen y devuelven `left`/`top`
  según el modo.
  - **Vertical:**
    - profundidad x (2..47) → vertical (2 abajo);
    - lateral y (1..47) → horizontal.
  - **Misma grilla de 47×47 y mismos márgenes**, rotados.
  - **No cambia** lo que se guarda (`prof`/`lat` del pedido) **ni las
    reglas.**
- **Franjas y líneas de la cancha** (área, círculo, arcos) con variante
  vertical en CSS (`.ep-pitch-field.vertical`).
- **Si la orientación cambia con el modal abierto** (rotar el teléfono o
  cambiar el ancho), se vuelve a dibujar sin perder el borrador.
- **Teclado** (en escritorio queda horizontal; vale si alguien lo usa en
  vertical con teclado): las flechas siguen la pantalla, ↑ = adelante en
  vertical.

**3d.B — Controles**

- **Cruz de ajuste fino:** visible solo con puntero fino (`(pointer: fine)`,
  PC). Oculta en táctil.
- **El arrastre táctil (2.0-2) no cambia:**
  - captura en el campo;
  - punto más cercano en un radio de 22 px;
  - un solo toast por arrastre;
  - en vertical solo cambia el eje de la inversa.

**3d.C — Ficha y resumen del jugador seleccionado** (debajo de nombre y
posición)

- **Ficha básica:** 4 casillas, Edad, Altura, Pie, Banda (mismo estilo que
  la ficha del editor del 3c).
- **Resumen con 4 pestañas chicas:**
  - **Mejores:** las 4 estadísticas más altas de escala 1–99. Fuera las de
    escala chica (Regularidad, Estabilidad, Frec./Prec. pie malo) y Res.
    lesión.
  - **Peores:** las 4 más bajas, con el mismo filtro.
  - **Habilidades:** las habilidades especiales activas, como chips en
    hasta 2 líneas; si no entran, «+N».
  - **Posiciones:** las posiciones que puede jugar, con la natural
    marcada.
  
  Todo sale de los datos del jugador que ya están cargados (`PLAYERS`),
  **sin lecturas nuevas**.
- **Valores en Bebas** con el color de nivel PES5 del 3c.
- **Responsivo al alto real** (pedido de Jimbo):
  - La cancha toma el alto disponible, con `dvh` o medición, dentro de un
    mínimo y un máximo. La relación de aspecto tiene que dejar las celdas
    más grandes que en horizontal.
  - Con un `ResizeObserver` en el cuerpo del modal: el **resumen** se
    muestra solo si queda alto suficiente (referencia: unos 150 px libres);
    si no, solo la **ficha**; si tampoco entra, nada.
  - Sin scroll dentro del modal en un teléfono de 729 px de alto útil
    (el de Jimbo): ahí se espera ficha sin resumen.
  - El pie (Restablecer y Enviar · gratis) siempre visible.
- **Al cambiar de jugador seleccionado** (toque o arrastre), la ficha y el
  resumen se actualizan.

**3d.D — Dos arreglos chicos** (commits propios)

1. **Marca de suscriptor en la ficha del editor:** el 3c la sacó al quitar
   la línea repetida. Volver a ponerla, como badge junto al nombre, igual
   que en la lista (`ep-subs-badge` / `ep-real-badge`).
2. **Sandbox sin caer a otro puerto:** `npx serve` cambia de puerto si el
   3001 está ocupado, y en otro puerto la página **no** entra en modo
   emulador y lee producción. Hay que agregar `--no-port-switching`:
   - en la config `tsc-emu` de `.claude/launch.json`;
   - en `scripts/emu-dist.mjs`.

   Mejor que falle a que lea producción.

### Fuera de alcance

- Reglas de formación, formato del pedido y la Tool.
- La formación en escritorio: sigue horizontal, con cruz y teclado.

### Riesgos

- **Inversa mal rotada** → el pedido guarda una celda distinta a la que se
  ve. El gate compara el texto «Columna x · Fila y» con el pedido creado,
  como en 2.0-2.
- **Rotación con un arrastre en curso:** cancelar el arrastre y redibujar.

### Verificación (gate)

Sandbox (3001), presidente:

1. Estático: `node --check`, `audit-wiring` 0 rotos, `csp --check`,
   `smoke-parity`.
2. Viewport 375×812 y 384×729 (emulación táctil):
   - cancha vertical;
   - sin cruz;
   - arrastre en los dos ejes;
   - línea llena y mínimos con un toast;
   - ficha visible, y resumen solo en 812;
   - sin scroll horizontal;
   - pie visible.
3. Escritorio 1280: horizontal, con cruz y teclado, como antes.
4. Rotar (cambiar el viewport a 812×375 con el modal abierto): redibuja y el
   borrador se conserva.
5. «Enviar · gratis» → pedido `formacion` con `prof/lat` iguales a la
   cancha (11 slots).
6. Variante `dist`, recorrido corto.
7. graphify.

### Entrega

Commits en la rama y `docs/reportes/2.0-3d.md`. Push después de la
auditoría. La prueba en el teléfono real la hace el supervisor por USB.

---

## Slice 4 — Núcleo YunaCoins + Plan B (copiar y pegar con Loyalty)

### Por qué

Las decisiones están cerradas en `docs/2.0/investigacion/MACRO_SLICE_STREAMLABS.md`
§1 (léelo entero antes de empezar, en especial §1, §2 y §6):

- una sola moneda;
- el descuento se aplica al aprobar;
- Streamlabs nunca suma;
- el mapeo está en el equipo;
- la marca de sincronizado es la fuente de verdad.

El Plan A (API) depende de la prueba A.0, que sigue abierta, y queda para la
2.1. Este slice construye **el núcleo que sirve a los dos planes**, con el
**transporte del Plan B**: Luis copia la lista de Loyalty y la pega en la
tool, y la tool le dice qué pocos usuarios tiene que editar a mano en
Streamlabs.

Estado actual que importa:

- `teams.streamlabsUser` **ya existe**: lo carga el admin en
  `js/teams.js:245/415` y no está en la allowlist del presidente
  (`firestore.rules` ~106). El slice B del macro de Streamlabs ya está hecho.
- `cobrarMejorasEquipo` (`js/pes5-tool.js` ~185) **todavía clampea en
  silencio** con `Math.max(0, current - info.total)`.
- `coins.js` (movimientos manuales y masivos del admin) escribe en `coins`
  sin ninguna marca.

### Alcance

**4.A — Marca de sincronizado en el ledger**

- Campo nuevo en cada documento de `coins` que **mueve** saldo:

  ```js
  streamlabs: { estado: 'pendiente' | 'sincronizado' | 'sin_mapeo', lote: <id|null>, en: <ISO|null> }
  ```

- **Lo escriben:**
  - `cobrarMejorasEquipo`: los cobros de la tool;
  - `saveCoinsTransaction`: movimientos manuales;
  - `saveBulkCoins`: masivos.
- **Valor inicial:** `pendiente` si el equipo tiene `streamlabsUser`;
  `sin_mapeo` si no.
- **Los movimientos viejos sin el campo cuentan como ya sincronizados.**
  Nunca se suman como pendientes; si no, el primer pegado restaría toda la
  historia.
- **Neto pendiente de un equipo** = Σ(`sub`) − Σ(`add`) de sus movimientos
  `pendiente`, solo de la temporada abierta: lo gastado en la web que
  Streamlabs todavía no sabe, en positivo. Así, saldo nuevo = pegado − neto.
  (Corregido en la auditoría: la primera versión de la spec tenía el signo
  invertido.)
- Función pura `netoPendiente(movimientos)` en `js/yunacoins-rules.js`, con
  test en node.

**4.B — Sin sobregiro silencioso**

- `cobrarMejorasEquipo`: si `current - info.total < 0`, **lanza** sin
  escribir nada de ese equipo. Hoy clampea a 0.
  - La validación previa (`evaluarPago`) ya debería impedirlo; esto es la
    red de seguridad.
  - El error se ve en el log de la tool y el pedido queda `pendiente`.
- `saveBulkCoins` en modo restar mantiene su recorte a 0, que es explícito y
  se muestra en la confirmación. No cambiarlo.

**4.C — Pestaña «YunaCoins» en la tool** (los dos modos: PC y móvil/APK)

1. **Estado:**
   - fecha y autor de la última sincronización (`settings/yunacoinsSync`);
   - antigüedad («hace 3 h»);
   - cantidad de equipos con pendientes.
2. **Pegar la lista de Loyalty:**
   - un `<textarea>` donde Luis pega lo que copia de Streamlabs → Loyalty →
     Users;
   - parser tolerante: tabs o espacios, `@` opcional, miles con `.`/`,`/
     espacio y líneas de ruido (encabezados, rangos, botones), que se
     ignoran y se cuentan;
   - función pura `parsearListaLoyalty(texto)` → `[{usuario, puntos}]` en
     `yunacoins-rules.js`, con tests en node. Fixtures **inventados en el
     test**, nunca datos reales de usuarios commiteados.
3. **Vista previa** (no escribe nada), con una fila por equipo con mapeo:
   - equipo y `@usuario`;
   - Loyalty pegado;
   - neto pendiente;
   - **saldo nuevo = pegado − neto pendiente**;
   - saldo web actual;
   - diferencia.
   
   Más tres avisos ruidosos:
   - equipos activos **sin mapeo**;
   - usuarios del mapeo **que no aparecen** en lo pegado;
   - usuarios de la lista que no son de ningún equipo (solo cuenta, no
     detalla).
   
   El match es por `streamlabsUser` sin distinguir mayúsculas y sin `@`.
4. **Ajustes para Streamlabs:**
   - lista corta, solo equipos con neto pendiente ≠ 0: «Poné a @X en
     N».
   - es lo que Luis edita a mano con el lápiz del panel;
   - botón copiar por fila.
5. **Aplicar** (paso 2 de 4.C.7, después de que Luis confirma con una
   casilla «Ya cargué los ajustes en Streamlabs»):
   - `teams.yunacoin = saldo nuevo` para cada equipo encontrado;
   - todos sus movimientos `pendiente` pasan a `sincronizado` con el mismo
     `lote` y `en`;
   - si el saldo cambió, se escribe un movimiento `coins` de auditoría:
     `mode: 'sync'`, `before`/`after`, `reason: 'Loyalty'`, marcado
     `sincronizado`;
   - `settings/yunacoinsSync` se actualiza: `{en, por, lote, equipos,
     noEncontrados}`;
   - todo en lotes con `dbWriteBatch`, respetando `DB_BATCH_MAX`, partido
     por equipo para que un corte deje equipos enteros hechos o sin hacer.
6. **Reanudable e idempotente:**
   - si se corta a la mitad, volver a pegar y aplicar termina lo que falta;
   - un equipo ya aplicado tiene neto pendiente 0 y su saldo = pegado.
7. **Guardia contra el doble descuento** (determinista, sin heurística).
   El riesgo: si la lista se copió **después** de editar en Streamlabs,
   restar los pendientes otra vez es un doble cobro. El flujo tiene dos
   pasos con una foto guardada:
   - **«Preparar ajustes»** guarda en `settings/yunacoinsSync.preparado`
     la foto `{lote, en, equipos: {teamId: {usuario, pegado, neto,
     objetivo}}}`, con `objetivo = pegado − neto`. Todavía no toca
     saldos ni marcas.
   - Luis edita en Streamlabs los usuarios de la lista de ajustes.
   - **«Aplicar»** usa **la foto guardada**, no un pegado nuevo.
     Escribe los saldos, marca los movimientos y borra `preparado`.
   - Si con un `preparado` abierto se pega una lista nueva, para cada
     equipo de la foto con `pegado_nuevo == objetivo` se toma como **ya
     ajustado**: no se resta el neto otra vez y se usa `pegado_nuevo` como
     saldo. Si no coincide y tampoco es igual al `pegado` de la foto, se
     marca como conflicto y se excluye hasta que Luis lo revise.
   - En la UI: «Copiá la lista **antes** de editar en Streamlabs».

**4.D — Validación con lista fresca al aprobar**

Es la mitigación del sobregiro del Plan B (§6 del macro de Streamlabs).
- En «Aplicar seleccionados» y en «Escribir al save» con cobro, si
  la última sincronización tiene **más de 12 h**:
  - **bloquear**, con el aviso «El saldo es de hace N h. Pegá la lista de
    Loyalty antes de cobrar»;
  - botón que lleva a la pestaña YunaCoins.
- Escape explícito: casilla «Cobrar igual con saldo viejo (puede haber
  sobregiro)», que queda registrada en el log.
- Las 12 h van como constante en `yunacoins-rules.js`.

**4.F — Bono de suscriptores (decisión de Jimbo, 2026-11-08)**

El bono es un **tope extra, no plata extra**. Un suscriptor gasta primero contra el bono y después contra el tope general, pero **todo se paga con los YunaCoins del equipo**: el cobro y `evaluarPago` ya hacen eso y no cambian. Por lo mismo, la parte del bono también se descuenta de Loyalty. Hay que corregir el techo que se muestra: `min(saldo, topeGeneralRestante + bonoRestante)` para un suscriptor y `min(saldo, topeGeneralRestante)` para el resto. Test: saldo 1.000, suscriptor, costo 3.000 → el pedido se rechaza por saldo y el techo es 1.000.

**4.G — El Plan B se puede apagar (pedido de Jimbo, 2026-11-08)**

El copiar y pegar es **solo el Plan B**. Si el Plan A (API de Streamlabs) llega a leer y escribir sin problemas, el flujo manual tiene que quedar **oculto**: no alcanza con dejarlo en gris. Así nadie lo usa en paralelo y descuenta dos veces.

- El transporte se elige con el campo `transporte` en `settings/yunacoinsSync`: `'manual'` (Plan B, es el valor por defecto) o `'api'` (Plan A).
- Lo cambia solo el admin, en la pestaña Reglas o YunaCoins de la tool, con una confirmación.
- En la 2.0, la opción `'api'` aparece **deshabilitada**, con la nota «Disponible cuando se conecte la API de Streamlabs (2.1)». No se puede activar porque no hay implementación detrás.
- Con `'api'` activo, en la pestaña YunaCoins se ocultan el textarea, «Preparar» y «Aplicar», y en su lugar aparece «Sincronización automática con Streamlabs». La validación de 4.D pasa a leer el saldo en vivo, cosa que hará la 2.1.
- La lógica de 4.A–4.F no depende del transporte: el Plan A solo reemplaza de dónde sale `pegado` y cómo se aplican los ajustes. Hay que dejar ese punto de enchufe aislado en una función, por ejemplo `obtenerSaldosLoyalty()` / `aplicarAjustesLoyalty()`, con la implementación manual detrás.

**4.E — Fin de temporada**

`coins` se archiva por temporada (D8). Antes de **finalizar** una temporada
(`seasons.js`), si algún equipo tiene movimientos `pendiente`, avisar y pedir
confirmación: «Sincronizá con Loyalty antes de cerrar la temporada».

### Reglas de Firestore

No deberían hacer falta cambios:

- `coins`: escritura admin, sin allowlist de campos;
- `teams.yunacoin`: admin;
- `settings`: admin.

Si alguna escritura falla por reglas, **parar y avisar**. Según
`WORKFLOW_2.0.md` §6, en esta rama solo se agregan reglas.

### Fuera de alcance

- Plan A (API, OAuth, Cloud Function): 2.1.
- Automatizar clics en el panel de Streamlabs (prohibido, §6).
- Que el presidente vea pendientes: su saldo sigue siendo `teams.yunacoin`.

### Riesgos

- **Doble descuento** por el orden copiar/editar: ver 4.C.7.
- **Mapeo mal cargado:** ruidoso, nunca silencioso.
- **Datos personales:** la lista pegada tiene usuarios de YouTube.
  - No se guarda entera en Firestore; solo los usuarios de equipos y sus
    puntos dentro del movimiento `sync`.
  - No se loguea en consola.

### Verificación (gate)

Todo en el **sandbox** (3001). Nada contra producción.

1. **Tests en node:** `parsearListaLoyalty` (al menos 8 casos: formatos de
   miles, `@`, ruido, vacío, duplicados) y `netoPendiente` (legacy sin campo,
   add/sub, otra temporada).
2. **Gate estático:** `node --check`, `audit-wiring`, `csp --check`,
   `smoke-parity`.
3. **Sandbox, admin, 2-3 equipos con `streamlabsUser` de prueba:**
   - cobro por pedido → movimiento `pendiente`;
   - pegar una lista sintética → vista previa correcta;
   - ajustes listados;
   - aplicar → saldos, marcas `sincronizado`, movimiento `sync` y
     `settings`;
   - re-aplicar la misma lista → sin cambios;
   - **doble descuento:** preparar, simular la edición en Streamlabs (lista
     nueva con el objetivo) y pegar esa lista → el equipo sale «ya
     ajustado», sin restar dos veces; con otro valor, sale conflicto;
   - equipo sin mapeo y usuario no encontrado → avisos.
4. **Sobregiro:** forzar `current < total` → lanza, no escribe y el pedido
   sigue pendiente.
5. **Lista vieja (más de 12 h, simulada):** aplicar pedidos queda bloqueado;
   con la casilla, pasa y queda en el log.
6. **Móvil (375 px, sin API de carpetas):** la pestaña YunaCoins funciona
   entera.
7. **Variante `dist`:** recorrido corto.
8. graphify.

### Entrega

Commits en la rama y `docs/reportes/2.0-4.md`, con capturas de la vista
previa y de los ajustes. Push después de la auditoría.

**Antes del uso real:** prueba guiada con Luis y la cuenta
`@TheRationalUser` de Jimbo, nunca un presidente (decisión del macro de
Streamlabs). La coordina el supervisor.

---

## Slice 5 — Limpieza, reglas, versión 2.0.0 y APK

### Por qué

Son los puntos que faltan del checklist «2.0 lista» de `WORKFLOW_2.0.md` §5,
salvo el PR (que es el slice 6).

### Alcance

**5.A — Sacar `prototipo_yunas/` de `tsc-src/`**

AGENTS.md dice: «Nada que no se cargue en runtime vive dentro de
`tsc-src/`». Usar `git mv` para conservar el historial.

| Qué | Destino |
|---|---|
| `*.md` (macros, slices, `STREAMLABS_YUNACOINS.md`, `LOOP_CIERRE_2.0.md`) y `pes5/README.md` | `docs/2.0/investigacion/` |
| `pes4-map.json`, `pes5/key-256.bin`, `pes5/tools/OptionFile.java`, `1-4.webp` (si algún md las referencia; si no, borrar) | `docs/2.0/investigacion/` |
| Scripts de node: `tools/*.js` (memcard, extract, write-attrs, diff-cards, list-saves) y `pes5/tools/*.js` (crypt, snapshot, write-*, xor-diff) | `tools/pes5/` |
| Tests `pes5/tools/test-*.js` | `tools/` (junto a `test-yunacoins-core.js`), con los `require` corregidos a `tsc-src/js/...` |
| **Borrar** (HTML duplicado del editor y de la tool, ya portados): `pes5-tool.html`, `prototype-editor-jugador.html`, `prototype-editor-jugador.OLD-26jul.html`, `pes5/admin-pes5.html`, `pes5/admin-tool-luis.html`, `pes5/admin-vincular-equipos.html`, `pes5/test-browser-crypto.html` | — |

Además:
- Quitar `'prototipo_yunas'` de `scripts/build-exclude.mjs`. **Hecho en 5.A.**
- Actualizar los enlaces a esos archivos: este documento, `WORKFLOW_2.0.md`,
  `CLAUDE.md`/`AGENTS.md` y los reportes 2.0-*. Buscarlos con `grep -rn
  prototipo_yunas`. Lo de `graphify-out` se regenera solo.
- Script `npm test` (o `npm run test:pes5`) en el `package.json` de la raíz
  que corra todos los tests de `tools/` con `node --test`. Los que dependen
  de un save local (`test-pes5-plantilla`, `test-posiciones-banda`) se saltan
  con un aviso si no lo encuentran; no fallan.
- `key-256.bin` es la clave XOR pública del formato de PES5, la misma que ya
  sirve `js/pes5/pes5-keys.json`. No es una credencial; se conserva como
  investigación. Anotarlo en el reporte.

**5.B — Reglas de Firestore de la 2.0: allowlist y tests**

Las 4 colecciones nuevas (`pedidos_pes5`, `pes5_bloqueos`, `pes5_config`,
`pes5_plantillas`) son nuevas en esta rama, así que se pueden ajustar. Las
existentes **no se tocan**.

- `pedidos_pes5` create: agregar `request.resource.data.keys().hasOnly([...])`
  con los campos que escriben `mejoras-page.js` (pedido de mejoras y pedido
  de formación: sacarlos del código) y límites de tamaño razonables (`lines`
  lista ≤ 40, `formacion.slots` ≤ 11, strings ≤ 100). Regla del proyecto:
  allowlist, nunca blocklist.
- `pes5_bloqueos` create/update del presidente: `hasOnly` con los campos que
  escribe `pes5-bloqueo.js`.
- **Tests** en `functions/test/rules-suite.js` (o un `rules-pes5.js` nuevo
  sumado a `npm run test:rules`) con los roles anónimo, presidente propio,
  presidente ajeno y admin, para cada colección:
  - el presidente crea un pedido de su equipo, pero no de otro, ni con
    estado distinto de `pendiente`, ni con un campo extra;
  - cancela el suyo pendiente, pero no el aplicado;
  - no lee pedidos ajenos;
  - lee solo su plantilla;
  - no escribe `pes5_config`;
  - el bloqueo propio sí, el ajeno no.
- `npm run test:rules` en verde, incluida la suite que ya existía.
- **Despliegue:** lo hace el supervisor con el OK de Jimbo (`firebase
  deploy --only firestore:rules`). El implementador deja todo listo y lo
  verifica con `node scripts/rules-drift.mjs` después del deploy.

**5.C — Versión 2.0.0**

- `android/app/build.gradle`: `versionCode 21`, `versionName "2.0.0"`.
  Mirar antes el último `versionCode` de `main` (hoy 20, la APK 1.7.0).
- Si la web muestra la versión en algún lado (ajustes, updater o
  `manifest`), sumarla también.

**5.D — APK de prueba**

- Seguir `docs/android-build.md`: `npm run sync:android` y build
  **release** firmada con el keystore local. El `%TEMP%` corto está en la
  nota de 8d0fbcf.
- No commitear `android/` salvo `build.gradle`. No subir el APK a GitHub
  Releases: eso es el slice 6.
- La instala el supervisor en el teléfono de Jimbo por USB (`adb install
  -r`, misma firma que la 1.7.0) y la prueba:
  - arranque y splash;
  - Mejoras (plantilla, editor, formación vertical);
  - Tool PES5 en modo móvil (pedidos, rechazo, YunaCoins).

**5.E — Plantilla desactualizada por equipo**

Hoy el aviso de «plantillas desactualizadas» compara el `saveHash` del save completo, así que cualquier cambio en otro equipo las marca todas. Cambio:

- Cada plantilla guarda `teamHash` en `pes5_plantillas`: SHA-256 del JSON canónico de lo que se publica de ese equipo (plantilla y formación, con las claves ordenadas).
- Una plantilla está desactualizada si `teamHash` o `pes5ClubIdx` no coinciden con lo que hay ahora en el save.
- Las publicaciones viejas que no tienen `teamHash` cuentan como desactualizadas una sola vez.
- `saveHash` se conserva, solo como dato informativo.
- Test en node: un cambio en otro equipo no marca como desactualizado a este.

### Fuera de alcance

- El PR, el release y el merge final: slice 6.
- Plan A de Streamlabs: 2.1.

### Verificación (gate)

1. `npm run build` / `build-web` y `build-www` sin `prototipo_yunas`;
   `smoke-parity`, `audit-wiring` y `csp --check` en verde.
2. Ningún archivo de `tsc-src/` referencia algo que se movió (grep), y la
   sección Tool PES5 sigue cargando en el sandbox.
3. `npm test` (tests de `tools/`) en verde.
4. `npm run test:rules` en verde, con las suites nuevas.
5. Presidente en el sandbox: crear un pedido de mejoras y uno de formación
   sigue funcionando con la allowlist nueva. **Es lo más fácil de romper:**
   si la allowlist deja afuera un campo, el pedido falla.
6. graphify.

### Entrega

Commits separados (5.A, 5.B, 5.C, 5.D) y `docs/reportes/2.0-5.md`. Push
después de la auditoría. Después: deploy de reglas (supervisor + OK de Jimbo)
e instalación de la APK en el teléfono (supervisor).
