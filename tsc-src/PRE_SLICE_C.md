# Pre-slice — Macro Slice C · Scroll continuo público
> **P0 APROBADO por Codex (v3).** v2 resolvió las 5 enmiendas grandes; v3 aplica los 3 ajustes finales: (1) montaje≠foco (`ensurePublicSectionMounted` vs `focusPublicSection`, scrollspy no llama `renderPublicPage` crudo), (2) gateo CSS explícito `#main.public-scroll` (no `body.redesign`), (3) orden de ejecución no fijado aquí. Listo como plan de ejecución de C; único pendiente para arrancar = confirmar el orden.
> Orden de ejecución: **C se ejecuta cuando el usuario confirme el orden** (no se fija aquí). Regla (Codex): si A *consume* el contrato de C → C va antes de A; si A solo pule contenido dentro de IDs estables → A puede ir antes.

## Objetivo
Convertir la superficie **pública** de navegación-por-páginas a **una sola página de scroll continuo** (flow del prototipo): topnav = scrollspy + smooth-scroll. Sin tocar el contenido de las secciones ni el admin.

## Alcance (entra)
- DOM público **apilado** en un contenedor de scroll, **gateado por una clase explícita `#main.public-scroll`** (NO `body.redesign`): el override de `.page{display:block}` vive solo bajo esa clase; admin sin la clase → sigue page-based. `setMode` agrega la clase en público / la quita en admin.
- Topnav: clic = smooth-scroll a la ancla; **scrollspy** (IntersectionObserver) mueve el indicador.
- **Separar montaje de foco (Codex):** `ensurePublicSectionMounted(page)` = render-once/lazy al acercarse al viewport; `focusPublicSection(page)` = setea `.page.active`=foco + cambia la suscripción live + mueve el indicador del topnav. **El scrollspy NO llama `renderPublicPage(page)` crudo** (evita re-render excesivo al scrollear).
- **Live: UNA sección activa = la enfocada** (`focusPublicSection` reusa `liveSubscribe`/`liveStop` tal cual; NO toca `live.js`).
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
- `nav.js`: nuevas `ensurePublicSectionMounted(page)` (montaje render-once, reusa `renderPublicPage` por dentro) y `focusPublicSection(page)` (.active+live+topnav); `goPublicPage` pasa a smooth-scroll a la ancla + focus; `setMode` agrega/quita `#main.public-scroll`; `onSeasonChange` re-render de todas las montadas. **`renderPublicPage` se usa solo para montar, nunca como handler del scrollspy.**
- `redesign-shell.js`: scrollspy (IntersectionObserver) + smooth-scroll por anclas + setear `.page.active`=foco + emitir `tsc:public-section-visible`.
- `index.html`: estructura `#main` pública apilada + quitar `<script src="js/redesign-public.js">`.
- `redesign.css`: layout de scroll + **`#main.public-scroll .page{display:block}`** (apiladas) — gateo explícito, no `body.redesign`.

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
CP0 (usage ≤10%) → quitar `redesign-public.js` → reestructura DOM público apilado + CSS gateado por `#main.public-scroll` → `ensurePublicSectionMounted` (lazy) + `focusPublicSection` (.active+live+topnav) + scrollspy/nav por anclas + emitir evento → `onSeasonChange` re-render de todas las montadas → QA.

## Gates de uso
CP0 `five_hour ≤ 10%` · freeze de features a 65% · cierre estable a 75%. Máx 3 subagentes solo-lectura/QA · 1 escritor.

## QA esperada
Scroll fluido · scrollspy sigue el scroll · clic en topnav scrollea · **admin page-based intacto** · live actualiza la sección en foco · **`tr-room` rAF pausa al scrollear fuera (verificar, no solo por código)** · `onSeasonChange` refresca todas las montadas · sin fugas (`liveStop`) · mobile + reduced-motion · `node --check` · consola limpia · sin mocks / `initRedesignPublic` / `body.redesign`.

## Criterios de OK de Codex (P4)
`live.js` **no modificado** (alcance = 1 sección live) · `palmares.js` **no modificado** salvo fallback documentado · contrato `.page.active`=foco documentado y QA'd (pausa real verificada) · evento con nombre/payload correctos · `onSeasonChange` re-render de todas las montadas · scrollspy usa `focusPublicSection` (**no** `renderPublicPage` crudo) · override CSS gateado por `#main.public-scroll` (admin page-based intacto) · orden de ejecución **no fijado** en este P0 · diff quirúrgico · **cero cambios en `renderPub*` internals ni admin**.
