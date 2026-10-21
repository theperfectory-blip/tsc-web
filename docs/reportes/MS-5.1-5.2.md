# MS-5.1 y 5.2 · Acceso admin y Temporadas · 2026-10-12

Estado: **CERRADO** (2026-10-12). Hallazgos nuevos que cierra: H-44, H-45, H-46. Abre H-47 (baja).

Cómo se verificó (todo en el sandbox, nunca producción):

- Emuladores de Firestore y Auth (`tsc-emu-backend`), base cargada con `node scripts/emu-seed.mjs sandbox/backup.json --clean` (62 equipos, 422 partidos, 10 fases, 1 temporada: T3 finalizada). Cuentas de prueba de `scripts/emu-credentials.example.json`.
- Variante `dist` (`tsc-emu-dist`, bundles) y variante `tsc-src` (`tsc-emu` sobre `sandbox/site` sincronizado), en `:3001`.
- Consola: trampa de `error`, `unhandledrejection` y `console.error` en cada carga. **0 errores** en las dos variantes.
- Conteos finales leídos del servidor (`get({source:'server'})`), no del espejo.
- `node scripts/smoke-parity.mjs` → `PARIDAD: OK`. `node scripts/audit-wiring.mjs` → 0 handlers rotos (se restauró su reporte, que el script sobrescribe sin la revisión manual).

## 5.1 · Acceso admin, shell y dashboard

Cambios:
- `js/nav.js` `goAdminPage`: si no se está en modo admin, pasa por `setMode('admin')` (que exige el rol y arma el layout). El botón «Panel admin» del perfil llamaba a `goAdminPage('dashboard')` directo y abría el dashboard **dentro del layout público** (sin sidebar, con la topnav) **(H-46)**. Una página desconocida cae a `dashboard`.
- `js/nav.js` lista `_ADMIN_PAGES` + `isAdminPage`, y `js/ui-utils.js` valida con ella la página admin restaurada de `localStorage`: una guardada que ya no existe dejaba el panel en blanco (ninguna `.page` activa).
- `js/nav.js` `renderAdminPage`: captura el fallo del render (nadie lo esperaba: promesa sin capturar y sección vacía sin aviso) y muestra un toast.
- `js/auth.js` `renderAuthUI`: una sesión sin rol admin no puede quedar en modo admin (antes solo se cubría el cierre de sesión).
- `js/nav.js` dashboard: la tarjeta decía «Temporada activa» aunque la seleccionada estuviera finalizada; ahora «Temporada (finalizada)». Nombre de temporada escapado (dashboard y `<select>` de la topbar).
- `js/db.js` `dbErrorMsg(err)`: texto corto para toasts. Un rechazo de reglas en un lote repetía «evaluation error…» una vez por documento (cientos de líneas en el toast); ahora: «Sin permiso: solo un administrador puede hacer esto.» Lo pueden usar los siguientes slices de M5.

Verificado (`dist`, repetido lo esencial en `tsc-src`):
- Anónimo: `goAdminPage('dashboard')` abre el login y sigue en público.
- Admin: perfil → «Panel admin» → `mode=admin`, sidebar abierto, solo `#page-dashboard` activa.
- Recarga con `tsc_admin_page='pagina-que-no-existe'` y `tsc_mode='admin'`: sube a admin en el dashboard.
- Cierre de sesión en admin → público. Presidente con `STATE.mode='admin'` forzado + `renderAuthUI()` → público, botón Admin oculto. Presidente que intenta entrar → login, sigue en público.
- Las 14 páginas admin renderizan con contenido y sin errores; ida y vuelta público ↔ admin.

## 5.2 · Temporadas

Cambios en `js/seasons.js` (y uno en `js/db.js`):
- **H-44 (alta, cerrado):** `getForSeason('teams')` filtraba los equipos por `season`, y toda alta de equipo guarda `season: 1` fijo (`teams.js:443`, `ui-utils.js:642`). Desde la T2 en adelante el dashboard, el calendario, el bracket, la asignación a grupos (`standings.js`), la tabla pública de grupos (`public.js`) y el export de datos veían **0 equipos**. `teams` es un plantel global: `getForSeason('teams')` devuelve todos, y los dos filtros copiados a mano en `public.js` y `standings.js` pasan a usarlo. Verificado: con la T4 creada, el dashboard muestra 62 equipos.
- **H-45 (alta, integridad, cerrado):** el borrado en cascada borraba fases por `season`, campo que las fases **no tienen** (se cuelgan de `compId`): toda temporada eliminada dejaba sus fases huérfanas, y el aviso de confirmación decía 0 fases. Además intentaba borrar `palmares` por número de temporada, cuando su `season` es una etiqueta de texto del palmarés histórico («T3», «SEMANA 2»): nunca coincidía, pero era una mina. Ahora: fases por `compId` de las competiciones de la temporada; `palmares` y `teams` fuera de la cascada, dicho en el aviso («No se tocan los equipos, sus saldos de YuNaCoins ni el palmarés»); `sorteoEvents` contado; borrado en lote con `dbDeleteMany` (antes uno por uno en paralelo); la temporada se borra al final, para poder reintentar si algo falla a mitad.
- Crear: doble clic en «Crear» creaba dos temporadas con el mismo número (las dos leían el mismo máximo); guarda de reentrada. Después de crear pasa a la temporada nueva por el mismo camino que «Ir».
- «Ir» a otra temporada no persistía la selección (un reload volvía a la anterior) ni recalculaba la pestaña de sorteo; ahora reutiliza `onSeasonChange` y deja el `<select>` de la topbar coherente. Las variables que limpiaba (`window._currentCompId`…) eran no-ops (`_currentCompId` es un `let` de `phases.js`); fases y partidos ya validan su selección contra la temporada actual.
- Finalizar / reactivar / borrar / guardar: `try/catch` con toast claro (C9); temporada inexistente controlada.
- Textos de confirmación: reactivar decía «se eliminarán sus registros del histórico» y no borra nada (la tabla histórica solo suma temporadas finalizadas). Finalizar ahora dice qué pasa (solo lectura y cuenta en la tabla histórica).
- Lista y modal: nombre y juego escapados (`escHtml`/`escAttr`; un nombre con comillas rompía el `value` del input), `maxlength=40`, y el botón Editar de una temporada finalizada tenía dos atributos `style` (el segundo se ignoraba).

Verificado como admin, en `dist` y en `tsc-src`:
- Crear con doble clic simultáneo → **una** temporada (2:active); `STATE.season=2`, `tsc_season=2`, `<select>`=2; dashboard: 62 equipos, «Temporada activa».
- Nombre `T4 "prueba"` y juego `PES 5 <b>`: lista muestra el texto literal, el modal de edición conserva las comillas.
- Finalizar → `finished`; reactivar → `active`; «Ir» a T3 y de vuelta: `tsc_season` y `<select>` siguen a la selección.
- Cascada: en la T2 se crearon 1 competición, 2 fases, 2 partidos, 1 movimiento de coins, sorteo + 1 evento, 1 etiqueta de calendario y 1 registro de historial. El aviso los listó todos (2 fases). Tras confirmar, en el servidor: 0 de cada uno, fases 12 → 10, palmarés 38 → 38, equipos 62 → 62, saldo del equipo 1 sin cambios; la app volvió a la T3 con `<select>` y `localStorage` coherentes.
- C9 con sesión de presidente: reactivar y eliminar fallan con «Sin permiso: solo un administrador puede hacer esto.», sin escrituras (422 partidos en el servidor).

## Pendientes / hallazgos nuevos

- **H-44** (alta, **cerrado en 5.2**): equipos filtrados por temporada; desde la T2, 0 equipos en dashboard, calendario, bracket, grupos y export.
- **H-45** (alta, **cerrado en 5.2**): borrar una temporada dejaba sus fases huérfanas.
- **H-46** (baja, **cerrado en 5.1**): el acceso «Panel admin» del perfil abría el dashboard sin pasar por `setMode` (layout público).
- **H-47** (baja, abierto): crear una temporada no finaliza la anterior; pueden quedar dos «Activa» y el arranque toma la primera que encuentra cuando no hay una guardada. Decidir con el dueño si crear debe ofrecer finalizar la activa (encaja en 5.14–5.16, que rehacen el ciclo de vida de la temporada).
- Observaciones sin cambio:
  - Un lote rechazado por las reglas se ve borrado un instante en el espejo (compensación de latencia local) y vuelve solo. Solo lo vería un no admin que llame la función desde la consola.
  - Borrar una temporada no revierte saldos de YuNaCoins (viven en el equipo): es lo esperado y ahora lo dice el aviso.
  - El rol se lee al iniciar sesión: si el dueño le quita el rol admin a alguien con la app abierta, sigue viendo el panel hasta recargar (las reglas igual rechazan sus escrituras).
  - `data.js` exporta las fases con `getForSeason('phases')`, que devuelve las de todas las temporadas (no tienen `season`): va a 5.13.

Acción del dueño requerida: ninguna. Los cambios van en `tsc-src` y salen con el merge a `main`; no tocan reglas ni funciones.
