# MS-2.3 · Auditor estático de cableado

Generado por `node scripts/audit-wiring.mjs` · 2026-10-10. Heurístico (regex, sin parser): cada hallazgo se confirma a mano antes de actuar. Lo usan M4, M5 y M7.

Alcance: index.html + 37 JS · 951 nombres globales definidos.

## 1. Handlers que llaman funciones no definidas (0)

_Ninguno._

## 2. Funciones sin ninguna referencia (11) — candidatas a código muerto para 7.2

Ojo: pueden usarse por nombre dinámico (`window[...]`), desde la consola o desde Android; verificar antes de borrar.

- `isPresident` · js/auth.js:20
- `getTeamLogo` · js/bracket.js:46
- `liveAvailable` · js/live.js:55
- `_lmIsKnockout` · js/livematch.js:28
- `openMatchInputModal` · js/matches.js:1191
- `_initPubSidebarHover` · js/nav.js:39
- `palmaresCompIndex` · js/palmares.js:41
- `setPalmaresMedia` · js/palmares.js:2190
- `openPlayoffTeamAssign` · js/playoff.js:464
- `pubShowMatchesGroup` · js/public.js:600
- `getCustomCriterionName` · js/standings.js:25

## 3. Nombres globales duplicados entre archivos (1)

- `_esc` · js/competitions.js:1, js/phases.js:22, js/matches.js:1, js/coins.js:5, js/teams.js:5, js/history.js:68, js/palmares.js:1956, js/calendar.js:1

## 4. getElementById con ID que no existe en ningún template (9) — heurística

- `theme-dark-btn` · js/ui-utils.js:65
- `theme-light-btn` · js/ui-utils.js:66
- `pf-tpg` · js/phases.js:671
- `btn-registrar-partido` · js/matches.js:135
- `mi-ta` · js/matches.js:1313, js/matches.js:1324
- `mi-tb` · js/matches.js:1314, js/matches.js:1325
- `pub-matches-group-btns-${phaseId}` · js/public.js:603
- `pub-matches-list-${phaseId}` · js/public.js:618
- `bulk-${m}-btn` · js/coins.js:220

## Revisión manual (2026-10-10)

- Sección 1: 0 handlers rotos (433 handlers `on*=` revisados).
- Sección 4: `bulk-${m}-btn` es falso positivo (`m` = `add`/`sub`, existen
  `bulk-add-btn` y `bulk-sub-btn`). Los demás IDs no existen de verdad; los
  `pub-matches-*` y `pubShowMatchesGroup` (sección 2) son el mismo código
  muerto.
- Sección 3: `_esc` está copiada en 8 archivos; unificar con `escHtml`
  (pendiente de AGENTS.md / Seguridad).
