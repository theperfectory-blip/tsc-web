# MS-7.2 · Código muerto · 2026-10-20

Estado: **CERRADO** (2026-10-20, Sonnet) en lo que no depende del dueño. D6 aplicada en una segunda pasada (Opus, ver al final). Cierra H-23, H-26, H-50, H-51, H-58, H-60. Sin hallazgos de seguridad.

Método: `node scripts/audit-wiring.mjs` (12 funciones sin referencias) más los hallazgos anotados en M4/M5. Cada candidata se confirmó con `git grep -w` sobre `tsc-src/`, `scripts/`, `functions/` y `android/` (cero referencias, ni por nombre en strings ni en HTML). Se repitió el auditor tras borrar para detectar cadenas que quedaban huérfanas.

## Borrado

- `js/bracket.js`: `getTeamLogo`; `updateBracketTeamsDynamic` / `updateBracketDOM` y su llamada en `renderBracket` (H-58: buscaban `tlogo-…`, que no existe, y leían todos los equipos en cada render).
- `js/history.js`: `removeHistoryByMatchRef` (H-60).
- `js/livematch.js`: `_lmIsKnockout`.
- `js/matches.js`: `openMatchInputModal`, `updateMatchInputTeams`, `updateMatchPreview`, `closeMatchInputModal`, `saveMatchResult` (H-51), `window._matchRondaActual` (se asignaba en `matches.js` y `fixture-gen.js`; solo lo leía `saveMatchResult`) y la búsqueda del botón `btn-registrar-partido`, que no existe.
- `js/nav.js`: `_initPubSidebarHover`; el `case 'competiciones'` de `renderPublicPage` (H-26: `goPublicPage` y `focusPublicSection` ya la redirigen a `panel`).
- `js/phases.js`: `renderPubComps` (H-26), `gpOpts` y la consulta de fases de grupos que lo alimentaba, y el listener de `pf-tpg`, input que no existe (H-50).
- `index.html`: `#page-competiciones` y `#pub-comps-content` (H-26).
- `js/palmares.js`: `palmaresCompIndex`. `js/public.js`: `pubShowMatchesGroup`. `js/standings.js`: `getCustomCriterionName`.
- `js/playoff.js`: `openPlayoffTeamAssign` y, al quedar sin llamadores, la cadena que solo ella usaba: `buildPlayoffPools`, `getBracketWinners`, `clearPlayoffAssign`, `closePlayoffAssignModal`, `savePlayoffAssign`. Se conserva `_plSaveAssign` / `_plSlotMatches` / `_plLostText`, que usa la Supercopa. Los comentarios de `sorteo.js` que citaban esas funciones ahora citan `_plSaveAssign`.
- `js/ui-utils.js`: búsqueda de `theme-dark-btn` / `theme-light-btn` (botones viejos que ya no existen).

Neto: unas 620 líneas menos. El auditor pasa de 12 funciones sin referencias a 3 y de 9 a 1 «ID inexistente» (el restante es un ID armado por plantilla, `bulk-${m}-btn`, falso positivo).

## Se deja a propósito

- `isPresident` (par de `isAdmin`), `liveAvailable` y `setPalmaresMedia` (hook público del Salón de Trofeos junto a `setSalaCollage`/`getPalmaresMedia`): API de una línea, sin costo; el auditor las sigue marcando.
- **D6 (rama IndexedDB de `db.js`, H-23): no aplicada en la primera pasada; aplicada en la segunda (ver al final).** En el plan D6 solo tiene una *recomendación* (sacarla y mostrar error de conexión); no hay decisión registrada del dueño, a diferencia de D8. Por la regla de no borrar sin decisión, `db.js`, `seedInitialData` y el resto de la rama local quedan como están. Evidencia en `docs/reportes/MS-2.4.md`. Cuando el dueño decida: quitar la rama `USE_FIRESTORE === false`, los seeds de equipos falsos y mostrar un aviso de conexión.

## Verificación

- `node --check` de todos los `js/`; `smoke-parity` → PARIDAD: OK; `audit-wiring` → 0 rotos (reporte restaurado); `csp.mjs --check` OK; `build-web` y `build-www` sin error.
- Sandbox, panel del navegador oculto (no se pueden usar `pubSelectComp` ni rAF; se renderiza llamando directo a `renderPubPanel`):
  - `tsc-src` y `dist`: 6 páginas públicas y 14 admin (en `dist`, 10) con contenido; las 10 fases del sandbox (4 de grupos, 4 de bracket y single, 2 de playoff) renderizan en el panel público; el modal de edición de fase abre para las 10; bracket admin y público, playoff y single admin renderizan; el modal de asignación de la Supercopa abre y cierra; cambio de tema.
  - Cero errores no capturados; en consola solo el 400 del arranque sin sesión que ya existía.
- No verificado a mano: abrir el modal de fecha y el generador de fechas (con la T1 del sandbox no abrieron: salida temprana por temporada finalizada, sin errores). El único cambio en esos caminos es borrar una asignación a `window._matchRondaActual`, que ya nadie leía.
- Sin cambios de reglas ni de functions.

## Pendientes / hallazgos nuevos

- H-26, H-50, H-51, H-58, H-60 **cerrados**. H-23 / D6 cerrados en la segunda pasada.
- CSS de lo borrado (`#page-competiciones`, `.pub-fase-*` si aplica) queda para 7.3.

Acción del dueño requerida: ninguna (D6 decidida: sacar la rama).

## Segunda pasada · D6 y prueba manual (2026-10-20, Opus)

El dueño decidió D6: **sacar la rama IndexedDB**.

- `js/db.js`: fuera todas las ramas `indexedDB` (`initDB`, `dbGetAllLive`, `dbGet`, `dbAdd`, `dbAddMany`, `dbDeleteMany`, `dbNewIds`, `dbWriteBatch`, `dbPut`, `dbDelete`, `dbSubscribe`, `dbEnsureCounterAtLeast`, `dbPurgeArchivedSeason`). Sin Firebase, `initDB` lanza con code `offline` (`dbErrorMsg` lo traduce a «Sin conexión con el servidor»).
- `js/ui-utils.js`: si no hay Firebase, el arranque se detiene antes de los seeds y deja el splash con «Sin conexión con el servidor. Revisa tu conexión e intenta de nuevo.» y un botón «Reintentar» (recarga). `seedInitialData` siempre confirma con el servidor. Se borra la base local vieja `TSC_v4`, que tenía los datos sembrados, de los navegadores que la crearon.
- `index.html`: los avisos del splash a los 10 y 25 s no pisan el de sin conexión.
- `js/state.js`: fuera `DB_NAME` y `DB_VER`. `js/firebase-config.js`: comentarios al día.
- Los chequeos `USE_FIRESTORE` de `live.js`, `public.js`, `sorteo.js` y `users-admin.js` quedan: son defensivos y ya no se alcanzan sin Firebase.

Verificado en el sandbox:
- **Sin SDK** (copia de `dist` con `gstatic` apuntando a un dominio inválido, como en MS-2.4): splash con el aviso y «Reintentar», sin datos inventados, sin base `TSC_v4` creada; el aviso sigue a los 27 s. Único error en consola: `[arranque] sin Firebase…`.
- **Con SDK** (`dist` y `tsc-src`): arranque normal, 62 equipos, páginas públicas y admin sin errores.
- **Prueba a mano** (temporada de prueba T4 con un grupo de 6 y otro de 6, solo ida), por la interfaz de Partidos:
  - «Generar fechas» abre el modal con 5 fechas y 15 partidos; «Barajar de nuevo» cambia el cruce; «Generar 5 fechas» crea 15 partidos, 15 cruces distintos y ningún equipo repetido en una fecha. Lo mismo en el grupo B (30 en total).
  - Regenerar el grupo A avisa que reemplaza 5 fechas sin resultado y deja 15 partidos nuevos (0 de los anteriores).
  - «Fecha» de la jornada 1 con «Aplicar a todos»: `scheduledDate` y `playedAt` en los 3 partidos y `rondaMeta`.
  - «Editar» de la fecha 1 y guardar sin cambios: partidos idénticos.
  - Con un partido jugado: «Generar fechas» queda deshabilitado («El grupo ya tiene 1 partido(s) jugado(s)…») y llamarlo directo no abre nada. «Editar resultado» 2-1 → 3-1 guarda el partido y su historial.
- `smoke-parity` OK, `audit-wiring` 0 rotos, `csp.mjs --check` OK, `build-web` y `build-www` sin error.

