# Pre-slice — Equipos · Vitrina aleatoria + "cargar más"
> **v2 (2026-06-26) tras dictamen de Codex.** Endurece estado y responsive: `.load-more` **ya existe** ([redesign.css:697](css/redesign.css:697)) → reutilizar; estado propio `_pubTeamsView` con `renderToken` que invalida el `setTimeout` obsoleto; `filterPubTeams` filtra **cache local** (no IndexedDB por tecla); la **re-suscripción live** ([nav.js:244](js/nav.js:244)) debe preservar la búsqueda y cancelar cargas pendientes; `_clubBatch` considera tarjetas ya visibles al cambiar columnas; a11y completa en el botón; empty-state de búsqueda diferenciado.
> **Decisión del usuario 2026-06-26: SÍ** (deja de ser "opcional" del macro §4/§6). Orden maestro: **C → C-polish → Equipos → A → B → D** (Equipos antes de A).

## Brújula (2026-06-25)
La lógica gana solo en datos/permisos/persistencia; en layout/estética/motion gana el prototipo. UX/estética de Equipos → fidelidad alta.

## Objetivo
Sustituir el grid "todos los equipos de una vez" por la **vitrina del prototipo**: al cargar, **6 activos aleatorios** (ajustados a filas completas) + botón **"Cargar más equipos"** con ícono giratorio que revela tandas. Conservar buscador y stats reales.

## Estado real verificado
- `renderPubTeams()` ([teams.js:470](js/teams.js:470)) monta buscador `#pub-team-search` + grid `#pub-teams-grid.clubs-grid`, luego `renderPubTeamsGrid(teams,true)`.
- `renderPubTeamsGrid()` ([teams.js:547](js/teams.js:547)) renderiza **TODAS** de golpe. Ya usa `.club-card`, stats reales (`_computeTeamStats` con **forma últimos-5**, [teams.js:503](js/teams.js:503)), títulos, **spotlight** delegado ([teams.js:533](js/teams.js:533)).
- `filterPubTeams()` ([teams.js:493](js/teams.js:493)) **consulta IndexedDB en cada tecla** (`dbGetAll('teams',…)`) y re-renderiza todo.
- **Re-suscripción live:** `sub('equipos',['teams'],()=>renderPubTeams())` ([nav.js:244-245](js/nav.js:244)) → cada cambio en `teams` **re-ejecuta `renderPubTeams()` entero** (pierde la búsqueda y la posición de tanda).
- **`.load-more`/`.load-more-wrap`/`.loading`/`lmSpin` YA existen** en `redesign.css:697-710` → **reutilizar, NO portar**.
- **NO existe** shuffle, tandas ni botón.

## Prototipo (referencia) — [prototype.html:1581-1680](prototype.html:1581)
`_clubCols()` (columnas reales de la grid) · `_clubBatch()` (múltiplo de columnas ≈6 → filas enteras) · `_shuffle()` (Fisher-Yates) · `_appendClubs()` (insert + `MOTION.stagger` + `MOTION.countUp` solo en las nuevas) · `loadMoreClubs(first)` (`first` sin delay; resto `loading` 500ms; oculta botón al agotar).

## Estado endurecido (corrección Codex) — `_pubTeamsView`
Introducir un único objeto de estado de la vista pública:
```js
let _pubTeamsView = { all:[], pool:[], shown:0, query:'', renderToken:0, timer:null };
```
- **`all`** = cache local de equipos activos (se llena una vez en `renderPubTeams`); **`filterPubTeams` filtra `all`, NO `dbGetAll`** por tecla.
- **`renderToken`** se incrementa en cada (re)render/filtro/live-refresh; el callback del `setTimeout(500)` **comprueba su token** antes de insertar → descarta tandas obsoletas tras búsqueda o refresh en vivo.
- **`timer`** se **cancela** (`clearTimeout`) en cada nueva acción (búsqueda, live, re-render) → sin tandas zombi.

## Alcance (entra)
- **Helpers de tanda** (`_clubCols`/`_clubBatch`/`_shuffle`/append) adaptados a IDs reales (`#pub-teams-grid`).
- **`_clubBatch` robusto (corrección Codex):** considerar **cuántas tarjetas ya están visibles** si cambió el nº de columnas (resize) → la última tanda puede quedar incompleta **solo cuando se agota el pool**, no por desalineación de columnas.
- **Botón "Cargar más equipos"** (`.load-more-wrap`+`.load-more` existentes) con SVG **Lucide** stroke/currentColor y **a11y completa (corrección Codex):** `type="button"`, `disabled` mientras carga, `aria-busy`, `aria-controls="pub-teams-grid"`, `:focus-visible`, y **fallback `prefers-reduced-motion`** (sin spin/stagger; insertar sin animación).
- **Reusar** `MOTION.stagger`/`MOTION.countUp` (gateados por reduced-motion) y el **spotlight existente** (ya delegado → vale para tarjetas nuevas).

## Buscador + live (dos modos, corrección Codex)
- **Sin query:** vitrina aleatoria (tanda inicial ~6 + "cargar más").
- **Con query (`#pub-team-search` no vacío):** filtrar `_pubTeamsView.all` (cache), mostrar **todos los matches** sin paginar, **ocultar** el botón. Al limpiar → re-shuffle y volver a la vitrina.
- **Empty-state diferenciado (corrección Codex):** con query y 0 matches → **"No hay equipos que coincidan"**; sin equipos activos → "Sin equipos activos".
- **Re-suscripción live (corrección Codex):** envolver el refresh de `equipos` para que **preserve `query` y la posición de tanda** y **cancele el `timer` pendiente + bump `renderToken`** antes de re-renderizar. Opciones: un `_refreshPubTeams()` que recarga `all` desde DB pero re-aplica `query`/`shown`, en vez de `renderPubTeams()` crudo. (Si toca el wiring de `nav.js:244`, mínimo y declarado.)

## Fuera de alcance (NO entra)
Stats/forma/títulos (reales, intactos) · spotlight (existe) · admin de equipos · CRUD admin · otras secciones · `.load-more` CSS (ya existe).

## Archivos a tocar / NO tocar
**Tocar:** `teams.js` (`renderPubTeams`/`renderPubTeamsGrid`/`filterPubTeams` + `_pubTeamsView` + helpers de tanda + `_refreshPubTeams`), posiblemente `nav.js` (envolver el refresh live de `equipos` — mínimo). **NO portar CSS** (`.load-more` ya existe; verificar antes de añadir nada).
**NO tocar:** `_computeTeamStats`, spotlight, stats/títulos, admin de equipos, renderers compartidos, `cloudinary.js`/`firebase-config.js`.

## Riesgos + mitigaciones
| Riesgo | Mitigación |
|---|---|
| `setTimeout(500)` inserta tarjetas obsoletas tras búsqueda/live | `renderToken` + `clearTimeout(timer)` en cada acción |
| `filterPubTeams` pega a IndexedDB por tecla | Filtrar cache `_pubTeamsView.all` |
| Live pierde búsqueda/posición | `_refreshPubTeams` preserva `query`/`shown` + cancela timer |
| `_clubBatch` desalinea al cambiar columnas | Considerar visibles actuales; incompleta solo al agotar pool |
| Botón inaccesible / anima con reduced-motion | `type/disabled/aria-busy/aria-controls/focus-visible` + fallback reduced-motion |
| Duplicar `.load-more` | Ya existe (redesign.css:697) → reutilizar |
| Escape de nombres | `renderPubTeamsGrid` ya usa `_esc`; mantener |

## Pasos de ejecución
CP0 (≤10%) → `_pubTeamsView` + cache `all` en `renderPubTeams` → helpers de tanda (`_clubCols`/`_clubBatch` robusto/`_shuffle`/append con token) → `renderPubTeamsGrid` por tandas + botón "cargar más" (Lucide + a11y + reduced-motion) → `filterPubTeams` sobre cache + dos modos + empty-state → `_refreshPubTeams` para el live (preserva query, cancela timer) → QA → `graphify update .`.

## Gates de uso
CP0 `five_hour ≤ 10%` · freeze 65% · cierre 75%. Máx 3 subagentes solo-lectura/QA · 1 escritor.

## QA esperada
- Entrar a Equipos: ~6 aleatorias en filas completas + botón; recargar → otro orden.
- "Cargar más": tandas con stagger+countUp (o sin animación en reduced-motion); botón se deshabilita mientras carga (`aria-busy`) y desaparece al agotar.
- Buscar filtra cache (sin parpadeo/IDB por tecla); 0 matches → "No hay equipos que coincidan"; limpiar → vuelve la vitrina.
- **Cambio en vivo de `teams`** no borra la búsqueda ni añade tandas obsoletas.
- Spotlight en tarjetas nuevas; stats/forma/títulos intactos.
- `node --check` · consola limpia · desktop+móvil (2 col) · sin emojis · SVG Lucide · `_esc`.

## Criterios de OK de Codex (P4)
- Estado `_pubTeamsView` con `renderToken`/`timer`; sin tandas obsoletas tras búsqueda/live.
- `filterPubTeams` sobre cache local; live preserva query/posición.
- `_clubBatch` robusto a cambios de columnas; última tanda incompleta solo al agotar.
- Botón con a11y completa + fallback reduced-motion; `.load-more` reutilizado (no duplicado).
- Empty-states diferenciados; stats/spotlight diff-cero; diff quirúrgico; `_esc` en datos externos.
