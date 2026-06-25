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
- **Si el diseño del prototipo choca con la lógica del main, gana la lógica** y se adapta el diseño.
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
| Equipos | **[HECHO]** | `teams.js renderPubTeams/renderPubTeamsGrid` (stats reales, spotlight, MOTION) | Opcional: load-more + shuffle |
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
- **Equipos:** real = buscador + grid completo de todos los equipos; prototipo = "cargar más" + shuffle (revelado por tandas). Decisión UX (opcional).
- **Historial:** 4º hito real = "Temporadas" (el prototipo usa "Partido con más goles", clicable); "Mayor goleada" real es texto no clicable; real usa **tabla `.tbl` + dropdowns** de filtro y los inputs Equipo A/B para H2H, vs prototipo **lista `.histm` + rieles inline + tarjeta H2H con autocomplete**.
- **Sorteo:** el real es **igual o más completo** que el prototipo (chibi + bombos + urna con chips + resultado con asignación a llaves). Solo el rig 2.5D (tilt/glow) es delta opcional.
- **Palmarés:** real = "Sala de Trofeos" carrusel `tr-room`; prototipo = "Modo Vitrina" `.mv-*` + sala `#sala` con collage. Rediseño = Macro B.

---

## 5. SLICES PENDIENTES (reorganizados por realidad)

### Macro Slice A — Pulido público restante
Objetivo: cerrar el delta de las secciones [PARCIAL] sobre módulos reales, sin tocar admin ni Palmarés.
> El orden de abajo ya incorpora las condiciones obligatorias del dictamen (§7).
> ⛔ **BLOQUEANTE (Codex 2026-06-25):** no ejecutar Slice A hasta decidir el scroll continuo. Si va scroll → **Macro Slice C primero**.

0. **Pre-bloque bloqueante — aislar el mock muerto (§7.1).** Verificar que nada vivo llama `initRedesignPublic()` ni funciones de `redesign-public.js`; retirar/aislar `<script src="js/redesign-public.js">` (`index.html:398`). No es opcional ni tardío: va primero.
1. **Competiciones — vista eliminatoria pública** (el delta más grande de A)
   - **Bracket (§7.2):** crear `_pubRenderBracketBroadcast(phaseId, containerId)` en `public.js` reusando la data prep real de `bracket.js` (`buildBracketRounds/buildBracketSlots/getWinner/getClassifiedFromPhase`). Markup `gbr-*` (móvil con conectores SVG + desktop árbol con trofeo). **Portar el CSS `gbr-*` a `redesign.css` junto con el JS** — hoy no existe ahí.
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

### Macro Slice B — Palmarés: vitrina + sala fullscreen
Sólo tras A estable o congelado. Es un rediseño grande, no un ajuste.
- **Motor 3D — DECIDIDO 2026-06-25: (b) Three.js + Draco del prototipo** (el usuario eligió este, no la rec de Codex). Condiciones a cumplir en el slice: **prueba de rendimiento obligatoria** (condición de Codex), **self-hostear las libs** (Three.js/Draco) en vez de unpkg/CDN externa (offline + sin dependencia externa), resolver el anclaje geométrico de la copa, y definir la fuente de GLB.
- **Vitrina inline `.mv-*` — DECIDIDO: reemplaza a `tr-room`.** (nav con blur, hero line-art→full con tilt, data panel) con datos reales (`PALMARES_COMPS` + records + campeón vigente). Retirar/desmontar `tr-room`/`initTrophyRoom` de la vista inline (limpiar su rAF al desmontar).
- Sala `#sala` (CSS `.sala-*` ya existe huérfano en `redesign.css`): markup + `openSala/closeSala/salaLayout`, humo, y el **carrusel de fotos POR DETRÁS de la copa** (el "collage" de momentos; en el prototipo `.sala-collage`/`_startCollage`/`_spawnShot` son **placeholders mock** — cartas «MOMENTO DEL CAMPEÓN · N» que derivan a distinta profundidad/velocidad/opacidad detrás de la copa; **preservar ese movimiento**, alimentándolo con fotos reales). Audio mapeado a `sounds.js`/`playPalmDing` (no portar IIFE `AUDIO` crudo).
- **Admin de media de campeones (REQUISITO confirmado 2026-06-25 · persistencia DECIDIDA: Firestore):** el carrusel de fotos detrás de la copa en la sala fullscreen debe alimentarse de fotos **subidas por admin para cada campeón**. El admin necesita poder **subir / editar / eliminar varias fotos por campeón** (clave = copa + temporada + equipo campeón). Hosting con **Cloudinary existente** (sin tocar configs), referencia (URLs) persistida en el modelo de palmarés (registro `palmares` en IndexedDB; reusar `uploadImageToCloud`/cropper como en avatares/escudos). **Persistencia DECIDIDA: Firestore** (referencia/URLs por campeón, visible cross-device) + Cloudinary para hosting. Definir en el slice: modelo Firestore (doc por copa+temporada+equipo), reglas (admin write / public read) y relación con el registro `palmares`. Sin fotos para un campeón → la sala degrada elegante (sin collage), nunca placeholders en producción.
- Con el motor Three.js+Draco, el trofeo de la sala deja de usar `<model-viewer>`/`renderTrophy3D`; **reusar los GLB de copas existentes** con el nuevo motor. No tocar el uso de copas en admin. Verificar desktop/mobile/fullscreen.

### Macro Slice C — Scroll continuo público (FLOW) · detectado 2026-06-25 (auditoría visual)
**Clave para el flow del proyecto. DECIDIDO 2026-06-25: SÍ (se hace). Orden EN REVISIÓN: recomendado A→C→B. Plan pre-slice v2 → `PRE_SLICE_C.md` (P0 con enmiendas Codex).**
Hallazgo (screenshots `prototype.html` vs `index.html`): el prototipo es **una sola página de scroll continuo** (~5590px, las 6 secciones apiladas; topnav = scrollspy + smooth-scroll a anclas). El app real es **navegación por páginas** (~1058px, una `.page` `.active` por vez, el resto `display:none`; topnav = `goPublicPage` que intercambia páginas). El scrolly **NO está implementado**.
- **Alcance:** reestructurar la superficie pública para montar todas las secciones en un contenedor de scroll, con el topnav como scrollspy + smooth-scroll (el indicador `#rdp-nav-ind` ya existe). El **admin sigue page-based, no se toca.**
- **Riesgos:** rendimiento (render simultáneo de todas las secciones, incl. sala 3D de Palmarés y chibi de Sorteo → exige montaje perezoso / pausa offscreen, como ya hace `initTrophyRoom`); las suscripciones en vivo hoy son por página activa → revisar; interacción con Slice A (si se pule sobre páginas y luego se apila, hay retrabajo).
- **Secuenciación — EN REVISIÓN:** recomendado **A → C → B** (con bordes limpios A no se rehace al pasar a scroll → "C antes de A" deja de estar justificado). Pendiente confirmación del usuario.
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
- **Cleanup** → promovido a Slice A paso 0 (§7.1): retirar/aislar `<script src="js/redesign-public.js">` (`index.html:398`), código muerto (mock/`initRedesignPublic`). Ya **no** es opcional.
- Opcionales de UX: rig 2.5D del sorteo; load-more de equipos.

---

## 6. Decisiones de producto pendientes (sólo el usuario)

- **Scroll continuo (FLOW, Macro Slice C) — DECIDIDO: SÍ (usuario 2026-06-25).** El público pasa a una sola página de scroll (como el prototipo). **Orden EN REVISIÓN:** recomendado **A → C → B** (el argumento "C antes de A por retrabajo" se cae con bordes limpios). Plan pre-slice v2 en `PRE_SLICE_C.md` (P0 con enmiendas Codex).
- Palmarés — **DECIDIDO 2026-06-25:** motor 3D = **Three.js + Draco del prototipo** (b); vista inline = **Modo Vitrina `.mv-*`** (reemplaza `tr-room`); **sí** se porta la sala `#sala`.
- **Media de campeones — DECIDIDO:** persistencia en **Firestore** (visible cross-device) + Cloudinary para hosting.
- **Perfil UX — DECIDIDO:** **drawer arriba-derecha (desktop) + modal/drawer full-height (mobile)**.
- Calendario: layout `.cal-duo` (hero+cronograma lado a lado) vs columna actual; ¿hero colapsable sí/no?
- Historial: ¿lista `.histm` reemplaza la tabla en público? ¿tabla responsive?
- Equipos: ¿load-more además del buscador, o sólo buscador?
- Sorteo: ¿rig 2.5D?
- Prototipo: falta su 10% (hero/landing + fondo sin decidir). ¿Se termina antes de A/B o en paralelo?

---

## 7. Dictamen de supervision Codex (2026-06-24 · actualizado 2026-06-25)

### Actualización 2026-06-25 (tras auditoría visual) — manda sobre lo de abajo donde haya conflicto
- **Macro Slice C (scroll continuo) sube de prioridad → DECISIÓN BLOQUEANTE.** `scroll continuo sí/no` se decide **antes** de Slice A. **Si sí → ejecutar Macro Slice C antes de A** (pulir Panel/Calendario/Historial en page-based y luego pasar a scrollspy = retrabajo).
- **Resolución de la contradicción de orden:** "A antes de B" sigue válido, pero **C (si va) precede a A**.
- **Palmarés — DECIDIDO (usuario, contra rec de Codex):** motor 3D = **Three.js+Draco** (requiere prueba de rendimiento + self-host de libs), vista inline = **Modo Vitrina `.mv-*`**, media de campeones = **Firestore**.
- **Perfil: UX DECIDIDA = drawer (desktop) / modal full-height (mobile)**.
- **Branding del topbar: APROBADO** como tarea puntual ejecutable ya, independiente de los macro slices.
- **Veredicto:** aprobado como **mapa maestro**; **NO aprobado para ejecutar Macro Slice A** hasta resolver el scroll continuo.
- **Próximo paso (actualizado 2026-06-25):** 1) branding del topbar — ✅ hecho · 2) scroll continuo — ✅ DECIDIDO: SÍ · 3) **orden A/C en revisión** (rec A→C→B) · 4) plan pre-slice de C en `PRE_SLICE_C.md` (P0 v2 con enmiendas, esperando re-OK de Codex).

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

Codex recomienda opcion (a): conservar `<model-viewer>` + GLB/Firebase del main y adoptar solo el escenario visual del prototipo alrededor. No aprobar Three.js/Draco/CDN del prototipo sin decision explicita del usuario y prueba de rendimiento.

---

## 8. Gates, QA y subagentes

- **Gates de uso**: CP0 arrancar sólo si `/usage five_hour <= 10%`; freeze de features a 65%; cierre estable a 75% (sólo estabilizar/reportar).
- **Subagentes**: máximo 3, sólo lectura/QA. Un solo escritor.
- **QA por slice**: `node --check` en módulos tocados; navegación pública real sin errores de consola; admin logueado vuelve a público; sin mocks; sin `body.redesign`/`initRedesignPublic`; sin emojis nuevos; escape en todo `innerHTML` tocado; capturas/eval desktop+mobile; reportar riesgos residuales. Para renderers compartidos: QA en admin **y** público.
