# Migración prototipo → main · Estado real y Macro Slices

> Reemplaza a `NEXT_SESSION_MACRO_SLICES.md` (quedó desactualizado: daba como
> "pendiente" mucho que ya estaba migrado). Este documento refleja el estado
> **verificado en código** el 2026-06-24 por 7 agentes de análisis + checks en vivo.

---

## 0. Brújula (no cambia)

```
prototype.html (referencia visual, 90%, mock)  →  main real (datos, lógica, conexiones)
```

- El prototipo define: flow, layout, motion, estética, responsive.
- El main define: datos, lógica, permisos, persistencia, brackets, H2H, fixtures, admin, Firebase, Cloudinary, IndexedDB.
- **Regla de fidelidad (DECIDIDO 2026-06-25):** la lógica gana **solo** en datos/permisos/persistencia; en **layout/estética/motion gana el prototipo** salvo conflicto duro documentado. (Reemplaza al viejo "siempre gana la lógica", que contradecía el objetivo "TAL CUAL".) Cualquier punto donde el resultado NO sea idéntico al prototipo se declara en §4bis (Δ Fidelidad).
- No es una app nueva: es transformar el frontend público de main usando el prototipo como referencia, sin romper lo real.

## 1. Setup de trabajo

- Repo local: `C:\Users\Administrator\Downloads\tsc.web`
- App local: `cd tsc-src && npx serve .` → `http://localhost:3000`
- Producción: auto-deploy de `main` → Firebase Hosting (`https://teamsubscup.web.app/`)
- **Rama de trabajo: `redesign/migration`** (nacida de `main`). `main` NO se toca durante los slices; se mergea (squash) sólo tras verificar.
- `prototype.html` es local y gitignored: referencia, no se commitea ni se porta literal.
- Configs reales (gitignored, sólo en disco): `js/firebase-config.js`, `js/cloudinary.js`. Un worktree no las copia.

## 2. Rol de Codex (protocolo)

Codex es el supervisor del plan de migracion y tiene la ultima palabra tecnica antes de ejecutar o cerrar cualquier bloque. Claude (Opus/UltraCode) ejecuta, pero no implementa ningun slice sin aprobacion previa de Codex.

Antes de cada bloque, Claude debe entregar: plan + archivos + riesgos + gates. Codex revisa el plan, puede pedir ajustes, aprueba o rechaza la ejecucion, y al final valida diffs/evidencias antes de dar OK de cierre. No implementar sin pedido explicito del usuario.

## 3. Reglas críticas del repo

- **GRAPH FIRST**: antes de buscar funciones/archivos, leer `tsc-src/graphify-out/GRAPH_REPORT.md`.
- Tras tocar código: `graphify update .` dentro de `tsc-src/` (AST, sin costo).
- Nunca tocar/stagear `js/firebase-config.js` ni `js/cloudinary.js` (sólo los `.example.js`). Sin credenciales inline.
- `innerHTML` con datos externos: escapar siempre (`_esc`/`_tkEsc`/`_pfEsc`/`_bkEsc`/`escapeHtml` según módulo).
- Iconos nuevos: SVG inline estilo Lucide. **Nunca emojis** en UI.
- **No** llamar `initRedesignPublic()` ni depender de `body.redesign` (path mock prohibido, vive en `redesign-public.js`).
- **No** portar `.metro` al calendario (el main usa `cal-pub-*` / `cal-tl-*`).
- Admin logueado debe poder entrar a vista pública. No bloquear público por rol.
- No `git reset` / `checkout` destructivo. Staging quirúrgico (sólo archivos del slice).
- Renderers compartidos admin/público (`renderGroupTable`, `renderBracket`/`renderBracketHTML`, `renderPlayoff`, `renderMatchesList`): **no mutarlos**; crear renderers públicos nuevos que reusen sólo la *preparación de datos*.

---

## 4. ESTADO REAL VERIFICADO (2026-06-24)

Leyenda: **[HECHO]** migrado y funcional · **[PARCIAL]** base migrada, falta pulido · **[FALTA]** trabajo pendiente real.

| Sección | Estado | Entry real | Qué falta |
|---|---|---|---|
| Topbar (branding/temporada/config/auth) | **[HECHO]** | `index.html:23-51`, `ui-utils.js openSettings`, `auth.js renderAuthUI` | Deltas visuales menores: chip "Temporada N" (prototipo) vs selector dropdown (real); estado logueado con avatar |
| Nav de secciones (`.sec-nav-btn`+indicador) | **[REVISAR]** | `redesign-shell.js syncRedesignTopnav/ShellMode`, `nav.js goPublicPage` | Funciona como **page-nav** → en Macro Slice C (scroll continuo, DECIDIDO SÍ) pasa a **scrollspy + smooth-scroll** |
| Ticker (partidos der→izq) | **[HECHO]** (fix esta sesión) | `public.js renderPublicTicker` + `MOTION.ticker` | Nada |
| Equipos | **[PARCIAL]** | `teams.js renderPubTeams/renderPubTeamsGrid` (stats reales, spotlight, MOTION) | Vitrina aleatoria + "cargar más" → **`PRE_SLICE_EQUIPOS.md`** (DECIDIDO 2026-06-26: SÍ, ya no opcional) |
| Sorteo | **[HECHO]** | `sorteo.js renderPubSorteo` (8 frames, readOnly, live Firestore+BroadcastChannel) | Opcional: rig 2.5D (tilt/glow) |
| Calendario | **[PARCIAL]** | `calendar.js renderPubCalendar` (hero live, countdown, `cal-tl`, días especiales) | Hero colapsable + typewriter + CTAs reales |
| Historial | **[PARCIAL]** | `history.js renderPubHistory` (hitos countUp, toggle, H2H, tabla histórica FIFA) | Hitos clicables (2 extra), vista lista `.histm`, tarjeta H2H con autocomplete, tabla responsive |
| Competiciones / Panel | **[PARCIAL]** | `public.js renderPubPanel` (carrusel + grupos `_pubRenderGroupsBroadcast` escapado + live + radar) | Bracket público `gbr-*` y llaves `.tie-card` (renderers públicos nuevos) |
| Palmarés | **[REDISEÑO]** | `palmares.js renderPubPalmares` (carrusel 3D `tr-room` + `renderTrophy3D` model-viewer/Firebase GLB) | El prototipo 90% lo rediseñó entero: vitrina `.mv-*` + sala fullscreen `#sala`. Es Macro Slice B. |

### Bugs corregidos esta sesión (ya en `redesign/migration`, sin commitear)
- Ticker estático → arrancado `MOTION.ticker` + `_stopTickerMarquee` (anti-acumulación de clones/rAF). `public.js`.
- Avatar topbar: selector `.auth-avatar` → `.tp-avatar`. `profile.js:487`.
- XSS: escape de nombres de equipo en `renderMatchesList` (`matches.js`) y `renderBracketHTML`/`teamRow`/`ini` (`bracket.js`, helper `_bkEsc`).
- (Nota: el supuesto bug `<\span>` del reporte original **no existía**; verificado.)

### Detalles finos (auditoría visual en app real logueado, 2026-06-25)
- **Competiciones (grupos):** la tabla real trunca nombres en MAYÚSCULA ("ATL. LECHU…") vs el prototipo que los muestra completos ("Atl. Lechuguero"). Revisar ancho de columna / ellipsis.
- **Calendario — edge case off-season:** con **0 partidos próximos** (temporada ya jugada) el real **no muestra hero** y la sección queda muy vacía (solo lista de días "Sin partidos" + timeline). El prototipo asume siempre un "próximo partido" con countdown. → al portar el hero colapsable, **definir el estado sin próximos** (qué mostrar fuera de temporada).
- **Equipos:** ✅ RESUELTO — vitrina shuffle + "cargar más" por tandas (sin buscador). Ver `PRE_SLICE_EQUIPOS.md` (v3).
- **Historial:** 4º hito real = "Temporadas" (el prototipo usa "Partido con más goles", clicable); "Mayor goleada" real es texto no clicable; real usa **tabla `.tbl` + dropdowns** de filtro y los inputs Equipo A/B para H2H, vs prototipo **lista `.histm` + rieles inline + tarjeta H2H con autocomplete**.
- **Sorteo:** el real es **igual o más completo** que el prototipo (chibi + bombos + urna con chips + resultado con asignación a llaves). Solo el rig 2.5D (tilt/glow) es delta opcional.
- **Palmarés:** real = "Sala de Trofeos" carrusel `tr-room`; prototipo = "Modo Vitrina" `.mv-*` + sala `#sala` con collage. Rediseño = Macro B.

---

## 4bis. Δ Fidelidad declarada (dónde el resultado NO será idéntico al prototipo)

Auditoría de código 2026-06-25 (4 agentes vs código real + `prototype.html`). Por la brújula nueva, donde la lógica/datos reales impiden el "tal cual" se documenta aquí:

1. **Calendario — cronograma:** se conserva `cal-tl` real; **NO se porta `.metro`** del prototipo (decisión técnica del repo). El hero sí va `.hm-*` tal cual; el `.cal-duo` mezcla hero-prototipo + `cal-tl`-real.
2. **Calendario — off-season:** el prototipo siempre asume "próximo partido"; con 0 próximos el real no tiene hero. El banner "Temporada finalizada/Próximamente" es **feature nueva** (no existe en el prototipo).
3. **Calendario — typewriter:** el prototipo NO tiene typewriter en el hero (usa countdown). Si se añade, es **extra nuevo** gateado por reduced-motion.
4. **Perfil:** el prototipo es un `.pp-stage` demo con filas planas+chevron (no drawer top-right real, no drill-in). La UX decidida (drawer desktop / modal full-height mobile) **va más allá del prototipo** = decisión de producto.
5. **Perfil — forma reciente:** no hay dato "últimos 5" en `profile.js` (solo agregados); se derivará de `matches` o se omiten los pips.
6. **Competiciones — playoff:** el `.tie-card` será **"prototipo + live/penales/gol-de-visita"** del modelo real (más rico que el `_llavesHTML` del prototipo).
7. **Nombres largos:** datos reales en MAYÚSCULA largos (`ATL. LECHU…`) vs el mock corto del prototipo → posible truncado donde el prototipo muestra completo.
8. **Palmarés (B→D):** la sala se verá con **collage VACÍO** (sin los mocks "MOMENTO DEL CAMPEÓN N" del prototipo) hasta que D aporte fotos reales — gap visual intermedio aceptado.
9. **Hero/Landing global:** **NO EXISTE en el prototipo** (su 10% pendiente). No hay slice para portarlo; "frontend completo tal cual" requiere primero terminar ese 10% del prototipo (decisión pendiente §6).

**Lo que SÍ queda tal cual:** scroll continuo (C, scroll de documento), carruseles de navegación (Competiciones ya migrado; Historial #2/#3 en A), vitrina/sala de Palmarés con todos sus efectos (B), bracket `.gbr-*`, lista `.histm`, H2H autocomplete, hitos del prototipo.

---

## 5. SLICES DE MIGRACIÓN (estado vigente)

**Orden de ejecución VIGENTE (2026-07-02): C ✅ → C-polish ✅ → Equipos ✅ → A ✅ → B ✅ → D.** (Las secciones de abajo están etiquetadas por nombre, no por orden.) **A y B están cerrados en `df28209`; próximo slice = D.** Documentos cerrados: `docs/migration/SLICE_A.md` · `docs/migration/SLICE_B.md`. Plan pendiente: `PRE_SLICE_D.md` (v2). Ver §4bis (Δ Fidelidad) y §7 (auditoría).

> ### ⚠️ SUPERSEDED (actualizado 2026-06-27) — lee esto antes que el cuerpo histórico de abajo
> El cuerpo de §5/§6/§7 conserva texto fechado anterior. Donde contradiga, **mandan estas correcciones vigentes**:
> 1. **Orden:** ~~`C → A → B → D`~~ → **`C ✅ → C-polish ✅ → Equipos ✅ → A ✅ → B ✅ → D`**.
> 2. **Estado:** C, C-polish, Equipos, A y B **hechos y verificados**. **Próximo slice = D.**
> 3. **Gate de A:** cumplido; A y su hardening final están cerrados.
> 4. **Bracket público:** implementado en `public-bracket.js` (ver `docs/migration/SLICE_A.md`).
> 5. **Tabla histórica `.ht-*`:** **incluida en A** (Codex 2026-06-25), no opcional.
> 6. **Equipos:** **sin buscador** (decisión 2026-06-27: 32 equipos); vitrina shuffle + "cargar más" implementada.
> 7. **Encabezados 02/06:** adelantados en C-polish. **02** (Competiciones) FINAL en `renderPubPanel`. **06** (Historial) es placeholder `.proto-divider` → **A lo reemplaza** por `.comp-sticky` + `cc-hist` (no añade un segundo título).
> 8. Archivo de slices cerrados: `docs/migration/SLICE_A.md` · `docs/migration/SLICE_B.md`. Slice pendiente: `PRE_SLICE_D.md` (v2).

### Macro Slice C-polish — Fidelidad de shell → detalle en `PRE_SLICE_C_POLISH.md` (v3) ✅ HECHO (2026-06-27)
Remate del scroll continuo (C) tras probarlo: (1) contenido **full-width** (`#main.public-scroll{max-width:none}`); (2) **títulos de sección** `.proto-divider` numerados/sticky en **solo 4** secciones (Palmarés/Calendario/Equipos/Sorteo); (3) **topbar móvil** a fila propia (Opción A) con **chrome dinámico** (`--chrome-h` medido). **⚠️ Por pedido explícito:** los encabezados de **Competiciones (02)** e **Historial (06)** fueron adelantados en este slice (no en A): 02 usa `.comp-sticky` con `cc-comp`/`cc-fase` en `renderPubPanel`; 06 usa `.proto-divider` estático (Slice A lo upgradea a `.comp-sticky` + `cc-hist`).

### Macro Slice Equipos — Vitrina aleatoria + "cargar más" → detalle en `PRE_SLICE_EQUIPOS.md` (v3) ✅ HECHO (2026-06-27)
Port del comportamiento del prototipo (6 activos aleatorios + "cargar más" por tandas de filas completas) a `teams.js`. **Sin buscador** (decisión 2026-06-27: 32 equipos). Estado endurecido `_pubTeamsView` (`renderToken`/`timer` anti-tandas-obsoletas), `_clubBatch` completa la fila actual tras resize, `_refreshPubTeams` restaura botón si live llega durante timer, a11y completa + reduced-motion. `.load-more` **ya existe** en `redesign.css:697` → reutilizado.

### Macro Slice A — Pulido público restante → `docs/migration/SLICE_A.md` ✅ HECHO (2026-07-02)
Objetivo: cerrar el delta de las secciones [PARCIAL] sobre módulos reales, sin tocar admin ni Palmarés.
> El orden de abajo es la versión v1; el registro ejecutable y corregido está archivado en `docs/migration/SLICE_A.md`.
> **Correcciones clave de la auditoría:** (a) casi todo el CSS del prototipo **ya existe** en `redesign.css` (`.tie-*`/`.pp-*`/`.histm`/`.hm-*`) → A es **JS+wiring**, no "portar CSS"; solo falta `.gbr-*` y `.hito-click`. (b) **`public-bracket.js` es módulo nuevo OBLIGATORIO** (bracket+playoff ≈600-800 líneas; el `gbr` móvil es un pager animado). (c) **`histH2HShow` no existe** → crearla. (d) **forma reciente del perfil** no tiene dato "últimos 5" → derivar de `matches` u omitir; clase real `.form-pip` (no `.pp-pip`). (e) Calendario: el colapsable ya existe bajo **`.hm-*`** → migrar `_calHeroHtml` a `.hm-*` (reusa CSS). (f) **Carruseles de navegación:** el de Competiciones/Fases (#1) **ya está migrado** (`public.js _pubMakeCarousel`); A suma **#2 `cc-hist`, #3 filtros inline, #4 `.cal-duo`** reutilizando `_pubMakeCarousel`. (g) **minar `redesign-public.js`** (renderers ya portados) antes de borrarlo (último paso de A).
> ⛔ Gate: A arranca solo con **C + C-polish + Equipos** terminados y en QA (scroll continuo + shell pulido + vitrina de equipos).

0. **Pre-bloque bloqueante — aislar el mock muerto (§7.1).** Verificar que nada vivo llama `initRedesignPublic()` ni funciones de `redesign-public.js`; retirar/aislar `<script src="js/redesign-public.js">` (`index.html:398`). No es opcional ni tardío: va primero.
1. **Competiciones — vista eliminatoria pública** (el delta más grande de A)
   - **Bracket (§7.2):** crear `_pubRenderBracketBroadcast(phaseId, containerId)` en **`public-bracket.js`** (módulo nuevo OBLIGATORIO, NO `public.js` — ver `docs/migration/SLICE_A.md`) reusando la data prep real de `bracket.js` (`buildBracketRounds/buildBracketSlots/getWinner/getClassifiedFromPhase`). Markup `gbr-*` (móvil con conectores SVG + desktop árbol con trofeo). **Portar el CSS `gbr-*` a `redesign.css` junto con el JS** — hoy no existe ahí.
   - **Playoff/single (§7.3):** `renderPlayoff()` mezcla prep + HTML y NO tiene helper de datos reutilizable. **Antes** de `_pubRenderPlayoffBroadcast(...)`, extraer/crear una preparación read-only equivalente preservando legs, penales, gol de visita, live, slot refs y labels. Markup `.tie-card`.
   - Cablear ramas `bracket`/`playoff`/`single` de `renderPubPanel`. Escapar con `_tkEsc`. Estado vacío real (sin `_injectFakeBrackets`).
2. **Perfil — el real es DISTINTO al prototipo (no solo skin; es estructura)** · comparado en vivo logueado 2026-06-25
   Diferencias reales observadas (modal real `#profile-modal` vs drawer prototipo `.pp-drawer`):
   - **Ubicación/forma:** real = **modal centrado** (`modal-overlay`+`.modal`, título "MI PERFIL", ×). Prototipo = **drawer anclado arriba-derecha** desplegado desde el avatar.
   - **Header:** real = genérico (avatar + inputs Nombre/Usuario inline, email + rol como texto). Prototipo = **header con gradiente del color del club + nombre del club en grande + badge de rol**.
   - **Organización:** real = **todo plano y expandido a la vez** (nombre, @usuario, email, cambiar contraseña/email, stats del club, nombre del club, historial). Prototipo = **secciones tipo fila/drill-in** (`.pp-sec`: "Panel de administración", "Editar nombre y escudo del club", "Mi cuenta").
   - **Forma reciente:** real **NO la muestra** (solo donut + barras GF/GC). Prototipo **sí** (pips V/E/D).
   - **Entrada a Admin:** real = botón "ADMIN" del topbar (fuera del perfil). Prototipo = fila "Panel de administración" **dentro** del drawer.
   - **Stats del club:** real bajo sección "MI CLUB"; prototipo prominente bajo el header.
   - Verificado: ambos comparten donut (Pts, G/E/P) + barras GF/GC + "Ver historial de mi club" + pie Cerrar sesión/Guardar.
   Acción (re-skin + reestructura): llevar `_injectProfileModal`/`renderProfileBody` (`profile.js`) a la estética y estructura del `.pp-drawer` (header club-branded, secciones drill-in, forma reciente, entrada admin dentro). **No** tocar handlers, IDs (`profile-name`/`profile-username`/`profile-avatar-file`/`profile-logo-file`/`profile-team-name`/secciones pwd/email), ni lógica de auth/roles. Gate admin por `AUTH.role==='admin'`. **UX DECIDIDA 2026-06-25:** **drawer arriba-derecha en desktop, modal/drawer full-height en mobile** (adoptar el flow del prototipo).
3. **Calendario — hero colapsable**
   - `_calHeroHtml` (rama no-live): peek (countdown protagonista) → expand (detalle + CTAs reales). Typewriter como helper gateado por `MOTION.reduced()`. Preservar hero EN VIVO + limpieza de countdown (`_calCountdownStop`). **No** `.metro`. CTAs a lógica real o fuera (no mock).
4. **Historial — enriquecer público**
   - `_pubHistoryHitos`: +"Partido con más goles", convertir goleada/más-goles en `.hito-click` → `histH2HShow`. Lista `.histm` como **renderer público nuevo** (no mutar la tabla admin) — §7.6. Tarjeta H2H con autocomplete **reutilizando `_histTeams`/`_histResolveTeam`/`_buildH2HPanel`** (cuidar foco del input, no romper filtros). Opcional: tabla histórica responsive `.ht-rend`. Bifurcar por `mode`; **conservar** `_computeHistoricalStandings` (regla finished-season/FIFA).

### Macro Slice B — Palmarés Visual → `docs/migration/SLICE_B.md` ✅ HECHO (2026-07-02)
Reemplazar el Palmarés público (`tr-room`+`<model-viewer>`) por la experiencia del prototipo con datos reales, **sin** backend/admin de fotos. Vitrina `.mv-*` + sala fullscreen `#sala` con **Three.js 0.147.0 + Draco self-hosted** (build global, vendoreo trivial). **El esfuerzo real (auditoría):** portar los **4 PNG de la sala** (`sin_fondo`/`foco_izquierdo`/`foco_derecho`/`placa_dorada`) + la matemática `salaLayout` (anclaje 2.5D de la copa sobre el podio) + el sistema `Smoke` (canvas) + 24 partículas bicolor + 2 haces bicolor + viñeta + nav 4-dir + audio — NO solo vendorear libs. Integra con C (`page-palmares`+evento); **expone `setSalaCollage({recordId,items,colors})`/`getPalmaresMedia(recordId)`** (collage VACÍO sin mocks → gap visual hasta D). Fallback mobile obligatorio. Desmontar `tr-room`/`initTrophyRoom` (rAF perpetuo).

### Macro Slice D — Palmarés Media Backend → detalle en `PRE_SLICE_D.md`
Fotos reales por campeón para el collage de la sala (ya estabilizada en B). Store nuevo **`palmares-media`** + `DB_VER` 6→7 (migración aditiva). **Clave canónica = `recordId`** (el `id` autoincrement del registro `palmares`; `season` es opcional → la tripleta `comp|season|teamId` colisiona, queda solo como índice legible). Máx 12 fotos/campeón (sala muestra 7, lazy), sin base64. **`data.js` se DEBE editar** (export + `storeMap` son listas hardcodeadas, NO iteran `STORES` — sin esto las fotos no sobreviven backup/restore). Admin en `page-palmares-admin` reusando `uploadImageToCloud`+`openCropModal` (no tocar `cloudinary.js` ni gestión de copas). **Reglas Firestore admin-write/public-read = requisito BLOQUEANTE** (validar en consola). Consume el contrato de B `getPalmaresMedia(recordId)` sin reabrir su render.

### Macro Slice C — Scroll continuo público (FLOW) · detectado 2026-06-25 (auditoría visual)
**✅ HECHO — ejecutado por Codex, scroll continuo verificado 2026-06-26.** [Histórico: DECIDIDO 2026-06-25 SÍ.] **Orden vigente: C → C-polish → Equipos → A → B → D** (ver §5 + bloque SUPERSEDED). Plan → `PRE_SLICE_C.md`.
Hallazgo (screenshots `prototype.html` vs `index.html`): el prototipo es **una sola página de scroll continuo** (~5590px, las 6 secciones apiladas; topnav = scrollspy + smooth-scroll a anclas). El app real es **navegación por páginas** (~1058px, una `.page` `.active` por vez, el resto `display:none`; topnav = `goPublicPage` que intercambia páginas). El scrolly **NO está implementado**.
- **Alcance:** reestructurar la superficie pública para apilar todas las secciones y usar **scroll de documento** (NO un contenedor con `overflow-y`; `#main.public-scroll` es solo hook de display, para preservar `sticky top:82px`), con el topnav como scrollspy + smooth-scroll (el indicador `#rdp-nav-ind` ya existe). El **admin sigue page-based, no se toca.** Detalle en `PRE_SLICE_C.md` (v4).
- **Riesgos:** rendimiento (render simultáneo de todas las secciones, incl. sala 3D de Palmarés y chibi de Sorteo → exige montaje perezoso / pausa offscreen, como ya hace `initTrophyRoom`); las suscripciones en vivo hoy son por página activa → revisar; interacción con Slice A (si se pule sobre páginas y luego se apila, hay retrabajo).
- **Secuenciación — DECIDIDO:** **C → A → B → D** (C primero, define el shell). B depende de C+A estables; D depende de B con QA de performance pasada.
- **Enmiendas Codex (P0, 2026-06-25):** live rebajado a **1 sección activa** (`live.js` fuera de alcance); pausa de Palmarés vía preservar **`.page.active`** (sin tocar `palmares.js`); `onSeasonChange` re-render de **todas las montadas**; evento **`tsc:public-section-visible`**; cleanup de `redesign-public.js` dentro de C. Detalle en `PRE_SLICE_C.md`.
- Reusar el comportamiento de scrollspy del prototipo **sin** resucitar `redesign-public.js` ni `body.redesign`.

### Branding del topbar (tarea puntual · spec del usuario 2026-06-25) — APROBADO por Codex, ejecutable independiente
Cambiar el logo del topbar por el isotipo nuevo, sin mover nada más.
- **Asset:** isotipo dorado TSC (estadio+copa+"TSC"), PNG transparente 1254×1254. Origen: `C:\Users\Administrator\.codex\generated_images\019efcea-329a-7ad1-a290-51bbc80335f9\ig_073ed2611fa8950f016a3cb52b4f9c8191b1276e5457d41e1b.png` → **copiar al proyecto** como `tsc-src/assets/logo-tsc.png`.
- **Markup:** en el bloque `.topbar-brand` (`index.html:23-51`) reemplazar el logo actual (`.topbar-logo`, badge "TSC") por el isotipo `<img>` + el título "Teams Subs Cup" **sin subtítulo**.
- **Tipografía/color:** título en **Bebas Neue**; "Teams Subs" en **blanco**, "Cup" en **dorado** (`var(--gold)`). (El `.topbar-name` ya trae "Teams Subs <span>Cup</span>" → reusar/ajustar.)
- **Layout:** mantener la **posición izquierda** actual y **respetar el alto del topbar** (escalar el isotipo a la altura disponible, no romper la barra). CSS en `layout.css` (`#topbar`/`.topbar-logo`/`.topbar-name`).
- **No tocar:** la navegación, el selector de temporada ni el área de auth (no moverlos).
- QA: desktop + mobile (el topbar condensado), isotipo nítido y alineado, nada desplazado.

### Tareas transversales (fuera de A/B)
- **Seguridad — barrido de escaping** en renderers compartidos: ramas raw restantes de `renderMatchesList`, `renderBracketHTML`, y `renderGroupTable` (`displayName`/`displayIni`/`z.name`). Tarea dedicada con QA admin+público.
- **Cleanup de `redesign-public.js` (repartido entre C y A):** **C** retira el `<script src="js/redesign-public.js">` (`index.html:398`) — deja de cargarse/ejecutarse — pero **conserva el archivo en disco**. **A** mina de ese archivo los renderers ya portados (histm/hitos/countdown) y **borra el archivo físicamente como último paso**. No es opcional.
- Opcionales de UX: rig 2.5D del sorteo. *(Load-more de equipos → ✅ implementado, ya no opcional.)*

---

## 6. Decisiones de producto pendientes (sólo el usuario)

- **Scroll continuo (FLOW, Macro Slice C) — DECIDIDO: SÍ (usuario 2026-06-25).** El público pasa a una sola página de scroll (como el prototipo). **Orden DECIDIDO: C → A → B → D.** Plan pre-slice en `PRE_SLICE_C.md` (P0 aprobado).
- Palmarés — **DECIDIDO 2026-06-25:** motor 3D = **Three.js + Draco del prototipo** (b); vista inline = **Modo Vitrina `.mv-*`** (reemplaza `tr-room`); **sí** se porta la sala `#sala`.
- **Media de campeones — DECIDIDO:** persistencia en **Firestore** (visible cross-device) + Cloudinary para hosting.
- **Perfil UX — DECIDIDO:** **drawer arriba-derecha (desktop) + modal/drawer full-height (mobile)**.
- Calendario: layout `.cal-duo` (hero+cronograma) — **DECIDIDO: sí, dentro de Slice A** (hero `.hm-*` + `cal-tl` real).
- Historial: ¿lista `.histm` reemplaza la tabla en público? — **DECIDIDO: sí** (renderer público nuevo). Tabla responsive `.ht-*`: pasa de "opcional" a **incluida en A** (salvo descarte explícito).
- Equipos: ✅ RESUELTO 2026-06-27 — **sólo load-more + shuffle, sin buscador** (32 equipos).
- Sorteo: ¿rig 2.5D?
- **Hero/Landing + fondo global — DECIDIDO 2026-06-25:** NO EXISTE en el prototipo (su 10% pendiente) → queda como tarea **posterior a C→A→B→D** (no se mete antes; primero hay que cerrarlo en `prototype.html`). "Frontend completo tal cual" requiere terminar ese 10% y luego un slice que lo porte.

---

## 7. Dictamen de supervision Codex (2026-06-24 · actualizado 2026-06-25)

### Auditoría de código 2026-06-25 (4 agentes vs código real + prototipo) — manda sobre todo lo anterior
Tras P0 de Codex, se auditaron los 4 pre-slices contra el código real y `prototype.html`. Hallazgos que obligaron a reescribir (v2/v4):
- **C:** "contenedor de scroll" era erróneo → **scroll de documento** (`#main` sin `overflow-y`, solo hook de display); citar `layout.css:234-235`; `page-competiciones` es huérfana (fuera del apilado); 2º consumidor de `.page.active` = `phases.js:784` (admin, a salvo); reusar `syncRedesignTopnav` para el indicador; params del scrollspy del prototipo; `redesign-public.js` se retira el `<script>` pero el archivo se preserva para minarlo en A.
- **A:** casi todo el CSS ya existe (no re-portar) → solo `.gbr-*`/`.hito-click`; `public-bracket.js` obligatorio; `histH2HShow` no existe (crear); forma reciente sin dato; `.form-pip` (no `.pp-pip`); calendario reusa `.hm-*`; carrusel #1 ya migrado, #2/#3/#4 entran en A.
- **B:** falta portar 4 PNG de la sala + `salaLayout` + `Smoke` + partículas/haces bicolor (no solo libs); contrato lleva `recordId`+colores; collage vacío intermedio.
- **D:** **`data.js` NO itera `STORES`** → editarlo es obligatorio (era premisa falsa); **ownerKey frágil** (`season` opcional) → clave canónica `recordId`.
- **Tesis:** la brújula "gana la lógica" contradecía "TAL CUAL" → reconciliada (§0); se añadió §4bis (Δ Fidelidad) con lo que NO será idéntico (metro, off-season, typewriter, perfil drawer, hero/landing inexistente).
- **Veredicto post-auditoría:** los 4 pre-slices v2/v4 quedan listos para re-revisión de Codex antes de ejecutar C. La arquitectura por capas se mantiene; los carruseles de Historial/Calendario se absorben en A (no requieren slice nuevo) porque el de Competiciones ya estaba migrado.

### Actualización 2026-06-25 (tras auditoría visual) — manda sobre lo de abajo donde haya conflicto
- **Macro Slice C (scroll continuo) sube de prioridad → DECISIÓN BLOQUEANTE.** `scroll continuo sí/no` se decide **antes** de Slice A. **Si sí → ejecutar Macro Slice C antes de A** (pulir Panel/Calendario/Historial en page-based y luego pasar a scrollspy = retrabajo).
- **Resolución de la contradicción de orden:** "A antes de B" sigue válido, pero **C (si va) precede a A**.
- **Palmarés — DECIDIDO (usuario, contra rec de Codex):** motor 3D = **Three.js+Draco** (requiere prueba de rendimiento + self-host de libs), vista inline = **Modo Vitrina `.mv-*`**, media de campeones = **Firestore**.
- **Perfil: UX DECIDIDA = drawer (desktop) / modal full-height (mobile)**.
- **Branding del topbar: APROBADO** como tarea puntual ejecutable ya, independiente de los macro slices.
- **Veredicto:** aprobado como **mapa maestro**; **NO aprobado para ejecutar Macro Slice A** hasta resolver el scroll continuo.
- **Próximo paso (actualizado 2026-06-27):** branding ✅ · **C ✅ · C-polish ✅ · Equipos ✅** (todos en `redesign/migration`) · **orden vigente: C → C-polish → Equipos → A → B → D** · encabezados 02/06 adelantados en C-polish (02 final; 06 placeholder que A reemplaza) · **próximo slice = A**, ejecutar cuando el usuario dé el OK + CP0 ≤10%.

**Veredicto (2026-06-24):** plan aprobado con condiciones. No queda aprobado para ejecutar "tal cual" sin aplicar las correcciones siguientes.

### Confirmaciones

- La brujula general es correcta: `prototype.html` es referencia visual y el main manda en datos, permisos, persistencia y logica.
- Macro Slice A es el orden correcto antes de Palmares: cerrar primero competiciones/brackets publicos, perfil, calendario e historial.
- La regla de no mutar renderers compartidos admin/publico es obligatoria y esta bien planteada.
- Macro Slice B debe quedar separado: Palmares es rediseno mayor y requiere decision de producto antes de ejecucion.

### Condiciones obligatorias antes de ejecutar Slice A

1. **Cleanup del mock sube de prioridad.** Retirar o aislar `js/redesign-public.js` no puede quedar como opcional tardio. Hoy sigue cargado en `index.html` y expone `initRedesignPublic()`, con codigo mock de `.metro`, `histm`, `mv-*`, audio y sala. Debe resolverse antes o dentro del primer bloque de Slice A, verificando que nada vivo lo llama.
2. **Competiciones/bracket:** aprobado crear `_pubRenderBracketBroadcast(...)` usando data prep real de `bracket.js` (`buildBracketRounds`, `buildBracketSlots`, `getWinner`, `getClassifiedFromPhase`). El CSS `gbr-*` existe en el prototipo pero no en `redesign.css`, asi que el slice debe portar/adaptar CSS y JS juntos. Sin `_injectFakeBrackets`.
3. **Playoff/single:** el plan esta incompleto si asume helpers listos. `renderPlayoff()` mezcla preparacion de datos y HTML. Antes de `_pubRenderPlayoffBroadcast(...)`, Claude debe extraer o crear una preparacion read-only equivalente, preservando legs, penales, away goal, live, slot refs y labels.
4. **Perfil:** aprobado re-skin, pero sobre el modal real (`profile-modal` / `profile-body`), no portando el sistema `profile-menu` del prototipo. Preservar IDs y handlers existentes. Todo icono nuevo o modificado debe ser SVG stroke/currentColor estilo Lucide; no mantener nuevas X/textos o glyphs como iconos.
5. **Calendario:** aprobado hero colapsable solo si se integra al sistema real `cal-hero-*`, `cal-pub-*`, `cal-tl-*`. No copiar `.metro` ni depender de `.hm-*` sin adaptacion explicita. Preservar rama EN VIVO y limpieza `_calCountdownStop`.
6. **Historial:** aprobado enriquecer publico, pero manteniendo admin intacto. La lista `.histm` debe ser un renderer publico nuevo, no una mutacion de la tabla admin. H2H con autocomplete debe reutilizar `_histTeams`, `_histResolveTeam()` y `_buildH2HPanel()` sin romper filtros existentes.
7. **Seguridad:** cualquier `innerHTML` tocado debe escapar datos externos con el helper local. Ademas del slice funcional, queda pendiente un barrido dedicado de `renderGroupTable`, `renderMatchesList` y `renderBracketHTML`.
8. **QA minimo por bloque:** `node --check` de archivos tocados, consola limpia en navegacion publica, admin logueado puede volver a publico, desktop+mobile, sin mocks, sin `body.redesign`, sin `initRedesignPublic()`, sin emojis nuevos, sin configs reales en staging.

### Decision pendiente para Macro Slice B

~~Codex recomendaba opcion (a): conservar `<model-viewer>` + GLB/Firebase y adoptar solo el escenario visual alrededor.~~ **SUPERSEDED (usuario 2026-06-25):** B va por **Three.js 0.147.0 + GLTFLoader + Draco self-hosted** (el usuario decidió contra esta rec). La auditoría confirmó que el self-host es trivial (build global) y que el anclaje geométrico (`salaLayout` sobre PNG) sería igual de delicado con model-viewer → la decisión está justificada. Requisito: fallback mobile + prueba de rendimiento. Registro en `docs/migration/SLICE_B.md`.

---

## 8. Gates, QA y subagentes

- **Gates de uso**: CP0 arrancar sólo si `/usage five_hour <= 10%`; freeze de features a 65%; cierre estable a 75% (sólo estabilizar/reportar).
- **Subagentes**: máximo 3, sólo lectura/QA. Un solo escritor.
- **QA por slice**: `node --check` en módulos tocados; navegación pública real sin errores de consola; admin logueado vuelve a público; sin mocks; sin `body.redesign`/`initRedesignPublic`; sin emojis nuevos; escape en todo `innerHTML` tocado; capturas/eval desktop+mobile; reportar riesgos residuales. Para renderers compartidos: QA en admin **y** público.
