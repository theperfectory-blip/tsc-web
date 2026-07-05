# Pre-slice — Macro Slice C · Scroll continuo público
> **P0 APROBADO por Codex (v3) + auditoría de código (v4, 2026-06-25).** v4 corrige 4 imprecisiones detectadas al contrastar contra el código real: (1) **scroll de documento, no contenedor**; (2) citar `layout.css:234-235` como regla base a sobreescribir; (3) `page-competiciones` es huérfana → excluirla del apilado; (4) el 2º consumidor de `.page.active` es `phases.js:784` (admin, a salvo por gateo). Más: parámetros del scrollspy del prototipo, `refreshSorteoTabVisibility`, y `redesign-public.js` como fuente a minar antes de retirar.
> Orden maestro: **C → A → B → D**. C primero (define el shell).

## Objetivo
Convertir la superficie **pública** de navegación-por-páginas a **una sola página de scroll continuo** (flow del prototipo): topnav = scrollspy + smooth-scroll. Sin tocar el contenido de las secciones ni el admin.

## Brújula (2026-06-25)
La lógica gana **solo** en datos/permisos/persistencia; en **layout/estética/motion gana el prototipo** salvo conflicto duro documentado. C es shell → su fidelidad es estructural (scroll de documento, sticky, offset del topnav como el prototipo).

## Alcance (entra)
- DOM público **apilado**, **gateado por una clase explícita `#main.public-scroll`** (NO `body.redesign`).
  - **CRÍTICO — scroll de DOCUMENTO, no de contenedor.** El prototipo scrollea `window`/body (`prototype.html` usa `window.scrollTo`, `#main` SIN `overflow-y`). `#main.public-scroll` es **solo un hook para el override de display**, NO un contenedor con `overflow-y:auto`. Poner overflow propio rompería los `sticky top:82px` y el offset del topnav fijo.
  - El override base a sobreescribir vive en **`layout.css:234-235`** (`.page{display:none}` / `.page.active{display:block}`). C añade en `redesign.css` (cargado después): `#main.public-scroll .page{display:block}` (especificidad 0,1,1 > 0,1,0 → gana sobre `.page`). `setMode` agrega la clase en público / la quita en admin (admin sin la clase → sigue page-based).
- **Secciones a apilar (las 6 con ancla en el topnav):** `page-palmares` (156), `page-panel` (160), `page-calendario` (180), `page-equipos` (170), `page-sorteo` (185), `page-historial` (175). Orden visual del prototipo: Palmarés → Competiciones(panel) → Calendario → Equipos → Sorteo → Historial.
  - **`page-competiciones` (165) es HUÉRFANA:** existe y es renderizable (`renderPubComps`) pero **no tiene botón en el topnav** (el botón "Competiciones" mapea a `data-page="panel"` → `page-panel`). **Decisión: queda FUERA del apilado de scroll.** Verificar si algo vivo llama `goPublicPage('competiciones')`; si no, candidata a retiro en el cleanup; si sí, se resuelve aparte (no se apila).
  - **`page-sorteo` arranca oculta** (`#rdp-nav-sorteo` y la sección con `display:none`, index.html:37) y se muestra condicionalmente vía `refreshSorteoTabVisibility` → el observer debe **(de)observar dinámicamente** esta sección, no asumirla siempre presente.
- Topnav: clic = smooth-scroll a la ancla **con offset CHROME=82px** (topbar+ticker fijos, como el prototipo); **scrollspy** (IntersectionObserver) mueve el indicador.
- **Scrollspy con los parámetros del prototipo** (para igualar el comportamiento): `rootMargin: '-90px 0px -55% 0px'`, `threshold: 0`, y un **`lock` (~700ms) tras clic** para evitar el rebote del indicador. **Fuente única del indicador:** reusar `syncRedesignTopnav` (redesign-shell.js:24, ya mueve y auto-centra el indicador) llamándolo desde el observer; NO duplicar la lógica de movimiento del indicador (evita doble fuente de verdad).
- **Separar montaje de foco:** `ensurePublicSectionMounted(page)` = render-once/lazy al acercarse al viewport (reusa `renderPublicPage` por dentro); `focusPublicSection(page)` = setea `.page.active`=foco + cambia la suscripción live + llama `syncRedesignTopnav`. **El scrollspy NO llama `renderPublicPage(page)` crudo.**
- **Live: UNA sección activa = la enfocada** (`focusPublicSection` reusa `liveSubscribe`/`liveStop`; NO toca `live.js`).
- `onSeasonChange`: re-render de **todas las secciones públicas montadas** (hoy `nav.js:355` solo re-renderiza `STATE.publicPage`).
- Evento de contrato **`tsc:public-section-visible`** con payload `{ page, visible, ratio }`.
- Preservar **`.page.active` = sección en foco** (para consumidores existentes, p.ej. el rAF de palmarés y `phases.js:784`).
- **`redesign-public.js`: retirar el `<script>` (index.html:398), NO borrar el archivo aún.** Es mock muerto en runtime (nada vivo lo llama), pero **contiene renderers ya portados** (histm, hitos, countdown, carruseles) que **Slice A va a minar**. C quita el `<script>` (deja de cargarse/ejecutarse) y **deja el archivo en disco como referencia para A**; el borrado físico se hace al final de A (o en cleanup posterior).

## Divergencia intencional declarada
El prototipo monta **todo a la vez** (las 6 secciones vivas desde el load → sus animaciones de entrada disparan una sola vez). C monta **perezoso al viewport** (mejor performance: sala 3D de palmarés, chibi de sorteo). **No es infidelidad visual** siempre que el lazy-mount **dispare las animaciones de entrada al montar**. Declarado explícitamente.

## Fuera de alcance (NO entra)
- `live.js` multi-suscripción (registry `liveStop(key)`/`liveStopAll`) → enhancement futuro.
- Internals de cualquier `renderPub*` (eso es A/B).
- `palmares.js` (la pausa queda cubierta por `.page.active`; ver fallback).
- Admin (sigue page-based).
- Rediseño de Palmarés (Macro B).
- Carruseles/filtros de secciones (#2 cc-hist, #3 filtros inline, #4 .cal-duo) → son contenido de sección = **Slice A** (el carrusel de Competiciones #1 ya está migrado en `public.js _pubMakeCarousel`).

## Auditoría de consumidores de `.page.active` (HECHA)
Consumidores reales en JS (grep `classList.*active` / `.page.active`):
- `palmares.js:1275` (público) — gate del rAF de `tr-room`. **A salvo:** C preserva `.page.active`=foco.
- `phases.js:784` (ADMIN: `adm-matches-content`...closest('.page.active')) — **A salvo** porque C deja admin page-based y el override CSS se gatea estrictamente por `#main.public-scroll` (no global, no `body.redesign`).
- `nav.js refreshSorteoTabVisibility` (nav.js:235-240) **muta `.page.active` directamente** (quita active a todas, lo pone en `page-panel` cuando oculta Sorteo). C debe contemplar que esta función pelea con el scrollspy → coordinar (que use `focusPublicSection` o que el observer la respete).
No hay más consumidores.

## Archivos a tocar
- `nav.js`: `ensurePublicSectionMounted(page)` + `focusPublicSection(page)`; `goPublicPage` → smooth-scroll a ancla (offset 82) + focus; `setMode` agrega/quita `#main.public-scroll`; `onSeasonChange` re-render de todas las montadas; revisar `refreshSorteoTabVisibility`. **`renderPublicPage` solo para montar, nunca como handler del scrollspy.**
- `redesign-shell.js`: scrollspy (IntersectionObserver, rootMargin `-90px 0px -55% 0px`, threshold 0, lock 700ms) + smooth-scroll por anclas + setear `.page.active`=foco + emitir `tsc:public-section-visible` + reusar `syncRedesignTopnav` para el indicador. (De)observar `page-sorteo` dinámicamente.
- `index.html`: quitar `<script src="js/redesign-public.js">` (línea 398). Confirmar las 6 secciones a apilar; `page-competiciones` fuera.
- `redesign.css`: `#main.public-scroll .page{display:block}` (override de `layout.css:234-235`) — **sin `overflow-y` en `#main`**.

## Archivos a NO tocar
`live.js` · `palmares.js` (salvo fallback documentado) · `public.js`/`teams.js`/`calendar.js`/`history.js`/`bracket.js`/`playoff.js`/`standings.js`/`matches.js` (renderers) · todo el admin · **el archivo `redesign-public.js` (solo se quita su `<script>`; el borrado físico es de A)**.

## Riesgos + mitigaciones
- **Scroll de contenedor por error** → romper sticky/offset. Mitigación: `#main.public-scroll` solo hook de display; scroll en documento.
- Fugas de suscripción al cambiar foco → reusar `liveStop` (ya lo hace `liveSubscribe`); QA contando unsubs.
- Doble fuente del indicador → reusar `syncRedesignTopnav`, no reimplementar.
- `page-sorteo` aparece/desaparece → (de)observar dinámicamente.
- `refreshSorteoTabVisibility` muta `.page.active` → coordinar con scrollspy.
- Performance (tr-room 3D / sorteo) → montaje perezoso + pausa offscreen vía `.page.active` + disparar animaciones de entrada al montar.
- Cambio de temporada con scroll → re-render de todas las montadas + preservar posición de scroll razonable.
- Mobile / reduced-motion → smooth-scroll degrada a `auto`.
- Cambio de modo público↔admin → teardown limpio de observers; admin vuelve a page-based.

## Pasos de ejecución
CP0 (usage ≤10%) → quitar `<script>` de `redesign-public.js` (dejar archivo) → reestructura DOM público apilado (6 secciones) + CSS `#main.public-scroll .page{display:block}` (sin overflow en `#main`) → `ensurePublicSectionMounted` (lazy + dispara entradas) + `focusPublicSection` (.active+live+`syncRedesignTopnav`) + scrollspy (params del prototipo) + emitir evento → `onSeasonChange` re-render de todas las montadas → coordinar `refreshSorteoTabVisibility` → QA.

## Gates de uso
CP0 `five_hour ≤ 10%` · freeze de features a 65% · cierre estable a 75%. Máx 3 subagentes solo-lectura/QA · 1 escritor.

## QA esperada
Scroll de documento fluido por las 6 secciones · scrollspy sigue el scroll (sin rebote tras clic) · clic en topnav scrollea con offset 82 · **sticky de títulos intacto** · **admin page-based intacto** (`phases.js:784` ok) · live actualiza la sección en foco · **`tr-room` rAF pausa al scrollear fuera (verificar en vivo)** · `onSeasonChange` refresca todas las montadas · `page-sorteo` (de)observada al togglear · sin fugas (`liveStop`) · mobile + reduced-motion · `node --check` · consola limpia · sin `initRedesignPublic`/`body.redesign`.

## Criterios de OK de Codex (P4)
`live.js` no modificado · `palmares.js` no modificado salvo fallback · **scroll de documento, `#main` sin overflow** · `.page.active`=foco documentado y QA'd · evento correcto · `onSeasonChange` re-render de todas las montadas · scrollspy reusa `syncRedesignTopnav` (no duplica indicador) y usa params del prototipo · override CSS gateado por `#main.public-scroll` (admin intacto) · `page-competiciones` resuelta (fuera del apilado) · `<script>` de `redesign-public.js` retirado pero archivo preservado para A · diff quirúrgico · cero cambios en `renderPub*` internals ni admin.
