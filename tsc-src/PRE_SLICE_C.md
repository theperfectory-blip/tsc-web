# Pre-slice — Macro Slice C · Scroll continuo público
> P0 para revisión de Codex · **v2** (incorpora las 5 enmiendas obligatorias del 2026-06-25, verificadas en código).
> Orden de ejecución: recomendado **A → C → B** (pendiente confirmación del usuario). Este plan vale para C cuando le toque.

## Objetivo
Convertir la superficie **pública** de navegación-por-páginas a **una sola página de scroll continuo** (flow del prototipo): topnav = scrollspy + smooth-scroll. Sin tocar el contenido de las secciones ni el admin.

## Alcance (entra)
- DOM público **apilado** en un contenedor de scroll (en vez de togglear `.page.active`).
- Topnav: clic = smooth-scroll a la ancla; **scrollspy** (IntersectionObserver) mueve el indicador.
- **Montaje perezoso**: render-once de cada sección al acercarse al viewport.
- **Live: UNA sección activa = la enfocada por scrollspy** (reusa `liveSubscribe`/`liveStop` tal cual; NO toca `live.js`).
- `onSeasonChange`: re-render de **todas las secciones públicas montadas** (hoy solo re-renderiza `STATE.publicPage`).
- Evento de contrato **`tsc:public-section-visible`** con payload `{ page, visible, ratio }`.
- Preservar **`.page.active` = sección en foco** (para que consumidores existentes sigan andando, p.ej. el rAF de palmarés).
- Cleanup de `redesign-public.js` (mock muerto).

## Fuera de alcance (NO entra)
- `live.js` multi-suscripción (registry `liveStop(key)`/`liveStopAll`) → enhancement futuro si algún día se quiere live en varias secciones a la vez.
- Internals de cualquier `renderPub*` (eso es A/B).
- `palmares.js` (la pausa queda cubierta por `.page.active`; ver fallback).
- Admin (sigue page-based).
- Rediseño de Palmarés (Macro B).

## Resolución de los 5 findings de Codex (verificados en código)
1. **Live (live.js:37-40 = una sola suscripción).** DECISIÓN: **rebajar alcance a "una sección live activa"** (la enfocada por scrollspy). Al cambiar el foco por scroll → `liveSubscribe(nuevaKey)` que internamente hace `liveStop()` de la anterior (= comportamiento actual, disparado por scroll en vez de clic). **`live.js` NO entra.** Multi-live = futuro (requeriría `liveStop(key)`/`liveStopAll`).
2. **Palmarés pausa (palmares.js:1275 = gate por `.page.active`).** DECISIÓN: **C preserva `.page.active` = sección en foco** → el gate del rAF de `tr-room` sigue andando **sin tocar `palmares.js`**. C además emite `tsc:public-section-visible` como contrato para B. **Fallback documentado:** si preservar `.active` resulta sucio, C toca SOLO el gate (palmares.js:1275) como única excepción. QA obligatoria: el rAF de `tr-room` pausa al scrollear fuera de Palmarés.
3. **Contrato de montaje (onSeasonChange:355 re-renderiza solo la página actual).** DOCUMENTADO:
   - Container IDs **estables** (`page-palmares`, `page-panel`, …) → A/B renderizan dentro sin cambios.
   - Montaje **render-once** perezoso al entrar al viewport.
   - **Re-render por temporada:** C modifica `onSeasonChange` para re-renderizar **todas las secciones montadas**, no solo `STATE.publicPage`.
   - **Re-render por live:** solo la sección en foco (ver #1).
   - **`.page.active`** pasa de "única página visible" a "sección en foco"; en público-scroll las `.page` públicas se muestran apiladas (override de display en CSS) y `.active` queda como marcador de foco. **Auditar otros consumidores de `.page.active`** además de palmarés.
4. **Cleanup `redesign-public.js` (cargado en index.html:398, expone `initRedesignPublic`).** Es el **primer paso** de C: verificar que nada vivo lo llama y quitar el `<script>`. Scrollspy se escribe **fresco** (no se resucita el del mock).
5. **Evento:** `tsc:public-section-visible` con `{ page, visible, ratio }` (namespaced, sin acento).

## Qué valida C ahora vs qué queda para B (separación pedida por Codex)
- **C valida ahora:** scroll fluido por todas las secciones · scrollspy mueve el indicador · clic en topnav scrollea a la sección · **admin intacto (page-based)** · live de la sección en foco · **`tr-room` pausa offscreen vía `.page.active`** · `onSeasonChange` refresca todas las montadas · sin fugas de suscripción (`liveStop` al cambiar foco) · sin `redesign-public.js`.
- **Queda para B:** rediseño de Palmarés (vitrina `.mv-*` + sala Three.js). La sala fullscreen es overlay → se auto-pausa al cerrar, no depende del scroll. B consumirá `tsc:public-section-visible` si lo necesita.

## Archivos a tocar
- `nav.js`: `goPublicPage`/`renderPublicPage` (flujo público scroll) + `onSeasonChange` (re-render de todas las montadas).
- `redesign-shell.js`: scrollspy (IntersectionObserver) + smooth-scroll por anclas + setear `.page.active`=foco + emitir `tsc:public-section-visible`.
- `index.html`: estructura `#main` pública apilada + quitar `<script src="js/redesign-public.js">`.
- `redesign.css`: layout de scroll + override de display de las `.page` públicas (apiladas).

## Archivos a NO tocar
`live.js` · `palmares.js` (salvo fallback documentado) · `public.js`/`teams.js`/`calendar.js`/`history.js`/`bracket.js`/`playoff.js`/`standings.js`/`matches.js` (renderers) · todo el admin.

## Riesgos + mitigaciones
- Fugas de suscripción al cambiar de foco → reusar `liveStop` (ya lo hace `liveSubscribe`); QA contando unsubs.
- Performance (tr-room 3D / sorteo) → montaje perezoso + pausa offscreen vía `.page.active`.
- Otros consumidores de `.page.active` → auditar antes de cambiar la semántica.
- Cambio de temporada con scroll → re-render de todas las montadas + preservar posición de scroll razonable.
- Mobile / reduced-motion → smooth-scroll degrada a `auto`.
- Cambio de modo público↔admin → teardown limpio de observers; admin vuelve a page-based.

## Pasos de ejecución
CP0 (usage ≤10%) → quitar `redesign-public.js` → reestructura DOM público apilado + override CSS de display → scrollspy + nav por anclas + setear `.active`=foco + emitir evento → `onSeasonChange` re-render de todas las montadas → live de la sección en foco → QA.

## Gates de uso
CP0 `five_hour ≤ 10%` · freeze de features a 65% · cierre estable a 75%. Máx 3 subagentes solo-lectura/QA · 1 escritor.

## QA esperada
Scroll fluido · scrollspy sigue el scroll · clic en topnav scrollea · **admin page-based intacto** · live actualiza la sección en foco · **`tr-room` rAF pausa al scrollear fuera (verificar, no solo por código)** · `onSeasonChange` refresca todas las montadas · sin fugas (`liveStop`) · mobile + reduced-motion · `node --check` · consola limpia · sin mocks / `initRedesignPublic` / `body.redesign`.

## Criterios de OK de Codex (P4)
`live.js` **no modificado** (alcance = 1 sección live) · `palmares.js` **no modificado** salvo fallback documentado · contrato `.page.active`=foco documentado y QA'd (pausa real verificada) · evento con nombre/payload correctos · `onSeasonChange` re-render de todas las montadas · diff quirúrgico · **cero cambios en `renderPub*` internals ni admin**.
