# Pre-slice — Equipos · Vitrina aleatoria + "cargar más" — ✅ COMPLETADO (2026-06-27)
> **v3 (2026-06-27) cierre aprobado por usuario.** **Sin buscador** (32 equipos → buscador innecesario; decisión de producto). `_clubBatch` completa la fila actual tras resize antes de añadir filas base. `_refreshPubTeams` restaura el botón de loading si un live llega durante el timer de 500ms. Slice cerrado y en `redesign/migration`. **Próximo slice = A.**
> **v2 (2026-06-26) tras dictamen de Codex.** Estado endurecido y responsive: `.load-more` **ya existe** ([redesign.css:697](css/redesign.css:697)) → reutilizar; estado propio `_pubTeamsView` con `renderToken` que invalida el `setTimeout` obsoleto; re-suscripción live ([nav.js:244](js/nav.js:244)) preserva posición de tanda y cancela cargas pendientes; a11y completa en el botón.
> **Decisión del usuario 2026-06-26: SÍ** (deja de ser "opcional" del macro §4/§6). Orden maestro: **C → C-polish → Equipos → A → B → D** (Equipos antes de A).

## Brújula (2026-06-25)
La lógica gana solo en datos/permisos/persistencia; en layout/estética/motion gana el prototipo. UX/estética de Equipos → fidelidad alta.

## Objetivo (cumplido)
Sustituir el grid "todos los equipos de una vez" por la **vitrina del prototipo**: al cargar, **6 activos aleatorios** (ajustados a filas completas) + botón **"Cargar más equipos"** con ícono giratorio que revela tandas. **Sin buscador.** Stats reales intactos.

## Estado inicial (antes del slice)
- `renderPubTeams()` montaba grid `#pub-teams-grid.clubs-grid` y renderizaba **TODAS** las tarjetas de golpe.
- Ya usaba `.club-card`, stats reales (`_computeTeamStats` con **forma últimos-5**), títulos, **spotlight** delegado.
- **`.load-more`/`.load-more-wrap`/`.loading`/`lmSpin` YA existían** en `redesign.css:697-710` → reutilizadas, NO portadas.
- **No existía** shuffle, tandas ni botón.

## Prototipo (referencia) — [prototype.html:1581-1680](prototype.html:1581)
`_clubCols()` (columnas reales de la grid) · `_clubBatch()` (múltiplo de columnas ≈6 → filas enteras) · `_shuffle()` (Fisher-Yates) · `_appendClubs()` (insert + `MOTION.stagger` + `MOTION.countUp` solo en las nuevas) · `loadMoreClubs(first)` (`first` sin delay; resto `loading` 500ms; oculta botón al agotar).

## Estado de la vista — `_pubTeamsView` (implementado)
```js
let _pubTeamsView = { all:[], pool:[], shown:0, renderToken:0, timer:null };
```
- **`all`** = cache local de equipos activos (se llena una vez en `renderPubTeams`).
- **`pool`** = barajado Fisher-Yates de `all`.
- **`renderToken`** se incrementa en cada (re)render/live-refresh; el callback del `setTimeout(500)` **comprueba su token** antes de insertar → descarta tandas obsoletas.
- **`timer`** se **cancela** (`clearTimeout`) en cada nueva acción (live, re-render) → sin tandas zombi.
- Sin campo `query` (no hay buscador).

## Lo que entró (implementado)
- **Helpers de tanda** `_clubCols`/`_clubBatch`/`_shuffle`/`_appendPubTeams` sobre el ID real `#pub-teams-grid`.
- **`_clubBatch` resize-aware:** `rem = shown % cols`; si el resize dejó una fila a medias, la **completa** (`cols - rem`) antes de añadir las filas base (`Math.max(cols, Math.round(6/cols)*cols)`). La última tanda solo queda incompleta al agotar el pool.
- **Botón "Cargar más equipos"** (`.load-more-wrap` + `.load-more` existentes) con SVG **Lucide** stroke/currentColor y **a11y completa:** `type="button"`, `disabled` mientras carga, `aria-busy`, `aria-controls="pub-teams-grid"`, `:focus-visible`, `min-height:44px` (target táctil) y **fallback `prefers-reduced-motion`** (sin spin/stagger; insertar sin animación).
- **Reuso** de `MOTION.stagger`/`MOTION.countUp` (gateados por reduced-motion) y del **spotlight** delegado existente (vale para tarjetas nuevas).

## Live refresh (implementado)
- **Un solo modo:** vitrina aleatoria (tanda inicial ~6 + "cargar más").
- **`_refreshPubTeams()`** preserva posición de tanda, cancela el timer pendiente, **restaura el botón si estaba en estado loading** (hardening de carrera: si un live llega durante los 500ms, el timer se mata y el botón vuelve a habilitado —`disabled/aria-busy/.loading`— antes de bumpar el token), luego reconcilia el pool.
- **Reconciliación del pool por `team.id`:** conserva orden, quita inactivos, añade nuevos al final sin duplicar; **no re-shuffle**. `shown` se ajusta si se eliminaron equipos por debajo del límite visible.
- **Empty-state:** sin equipos activos → "Sin equipos activos".

## Fuera de alcance (no entró)
Stats/forma/títulos (reales, intactos) · spotlight (existe) · admin de equipos · CRUD admin · **buscador** (descartado) · otras secciones. `.load-more` **no se portó** (ya existía) — solo se ampliaron sus reglas.

## Archivos tocados / NO tocados
**Tocados:** `teams.js` (`renderPubTeams` + `_pubTeamsView` + helpers de tanda + `_refreshPubTeams`; `renderPubTeamsGrid` y `filterPubTeams` **eliminados** como código muerto), `redesign.css` (AMPLIAR `.load-more`: `:focus-visible`, `[disabled]`/`[aria-busy]`, `min-height:44px`, `@media(prefers-reduced-motion:reduce){ .load-more.loading svg{ animation:none } }`), `nav.js` (refresh live de `equipos` → `_refreshPubTeams`).
**NO tocados:** `_computeTeamStats`, spotlight, stats/títulos, admin de equipos, renderers compartidos, las reglas base de `.load-more`, `cloudinary.js`/`firebase-config.js`.

## Riesgos + mitigaciones (resueltos)
| Riesgo | Mitigación |
|---|---|
| `setTimeout(500)` inserta tarjetas obsoletas tras live | `renderToken` + `clearTimeout(timer)` en cada acción |
| Live deja el botón bloqueado si llega durante loading | `_refreshPubTeams` restaura `disabled/aria-busy/.loading` antes de bumpar token |
| `_clubBatch` desalinea al cambiar columnas | Completa la fila actual (`shown % cols`); incompleta solo al agotar pool |
| Botón inaccesible / anima con reduced-motion | `type/disabled/aria-busy/aria-controls/focus-visible/min-height:44px` + fallback reduced-motion |
| Duplicar `.load-more` | Ya existía (redesign.css:697) → reutilizada |
| Escape de nombres | tarjeta usa `_esc`; mantenido |

## QA ejecutada
- Entrar a Equipos: 6 aleatorias en filas completas + botón visible; recargar → otro orden.
- "Cargar más": tandas con stagger+countUp (o sin animación en reduced-motion); botón se deshabilita mientras carga (`aria-busy`) y desaparece al agotar.
- Resize 1440→1100 + "cargar más": la tanda completa la fila vigente (verificado `_clubBatch` = 10 con shown=6/cols=4).
- Cambio en vivo de `teams` durante loading: timer cancelado, botón restaurado, sin tandas obsoletas.
- Spotlight en tarjetas nuevas; stats/forma/títulos intactos.
- `node --check` ✅ · consola limpia ✅ · desktop+móvil (2 col) · sin emojis · SVG Lucide · `_esc`.

## Criterios de cierre (cumplidos)
- Estado `_pubTeamsView` con `renderToken`/`timer`; sin tandas obsoletas tras live.
- Sin buscador: `filterPubTeams` y campo `query` eliminados (sin consumidores).
- `_refreshPubTeams` reconcilia el pool por `team.id` (conserva orden, quita inactivos, añade nuevos sin duplicar; no re-shuffle) y restaura el botón en carrera con loading.
- `_clubBatch` resize-aware; última tanda incompleta solo al agotar.
- Botón con a11y completa + `min-height:44px` + fallback reduced-motion; `redesign.css` solo AMPLIÓ `.load-more`.
- Empty-state "Sin equipos activos"; stats/spotlight diff-cero; diff quirúrgico; `_esc` en datos externos.
