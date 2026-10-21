# MS-5.6 · Generador de fixture · 2026-10-19

Hallazgos que cierra: H-55 (nuevo). Abre H-56.

## Cambios

`tsc-src/js/fixture-gen.js`
- **Escritura atómica (H-55):** `fxGenerate` borraba las fechas previas, creaba las nuevas (`dbAddMany`) y guardaba `rondaMeta` en tres escrituras; un corte dejaba el grupo vacío o sin sus libres. Ahora es UN `dbWriteBatch`: bajas (`_mxDeleteOps`, con su historial), altas del calendario con `luisTeam` y la fase con `rondaMeta`. Si algo falla, el grupo queda como estaba. Un grupo grande se divide ya por grupo (cada grupo es un lote); si un grupo supera 500 escrituras, se rechaza antes de escribir con un aviso (H-56).
- **Temporada finalizada:** `_mxSeasonLocked` al abrir el modal y al guardar (antes solo estaba el botón deshabilitado).
- **Revalidación al guardar:** la fase ya no existe, el grupo cambió de equipos o la fase cambió de vueltas con el modal abierto: no escribe y avisa (antes con la fase borrada se creaba una fase fantasma `{...null, rondaMeta}`).
- **Resultados:** medio marcador (un solo lado cargado) cuenta como jugado y bloquea; en vivo sigue bloqueando.
- **Aviso de reemplazo:** dice cuántas fechas y partidos se reemplazan y, si los hay, cuántos pierden el día y la hora asignados (antes decía «no se pierde nada»).
- **Reentrada y errores:** `_mxRun` (una escritura de partidos a la vez), bandera `saving` contra doble clic, `try/catch` con `dbErrorMsg`, el botón se libera al fallar, la tabla se repinta con lo realmente guardado.
- **Escape:** `_fxEsc` local reemplazado por `escHtml` (nombres de equipo los escribe el presidente). Botón de cerrar `×` pasa a SVG Lucide.

`docs/MACRO_SLICE_DEBUGGING.md`: estado de 5.6, H-55 y H-56.

## Verificación (sandbox, estado leído por REST como `owner`)

Temporada de prueba con una competición y fases de grupos (A de 8 y B de 5 equipos a doble vuelta; otra a una vuelta de 4 y 3). Emuladores recargados con `emu-seed --clean`.

- `dist`: doble llamada a `fxGenerate` → 56 partidos (no 112), 16 con `luisTeam`. Grupo B impar → 20 partidos, 10 libres en `rondaMeta`, 10 de Luis.
- `tsc-src`: lo mismo (56 / 16; B 20 / 10 / 10).
- **Atomicidad (las dos variantes):** `dbWriteBatch` envuelto para añadir `notificationRuns` (prohibido) → `permission-denied`, los mismos 56 ids, el día asignado y `rondaMeta` intactos, aviso «Sin permiso…», modal abierto con el botón liberado. Sin el fallo: regenera con ids nuevos, 0 días asignados y `rondaMeta` limpio. El aviso previo decía «Se pierden el día y la hora asignados a 1 de ellos».
- Bloqueos: medio marcador → botón deshabilitado («1 partido jugado»); partido marcado en vivo con el modal abierto → no escribe y avisa; grupo cambiado con el modal abierto → no escribe; fase borrada con el modal abierto → «La fase ya no existe», 0 fases y 0 partidos fantasma; T3 finalizada → «T3 está finalizada: no admite cambios», sin modal.
- Límite: grupo de 18 equipos a doble vuelta → primera generación 306 partidos; regenerar necesita 613 escrituras → rechazado antes de escribir, 306 partidos intactos.
- C9 con sesión de presidente (las dos variantes en la parte relevante): «Sin permiso: solo un administrador puede hacer esto.», servidor sin cambios, botón liberado.
- Móvil 375 px: modal de 343 px, sin desborde horizontal (`dist`).
- Consola: solo los `console.error` provocados (fallo inyectado y rechazo de reglas del presidente). Ningún error ni promesa sin capturar inesperado.
- `smoke-parity` → `PARIDAD: OK`. `audit-wiring` → 0 handlers rotos (se restauró su reporte manual). Reglas: sin cambios, no se corrieron sus tests.
- Observación de pruebas: tras un script colgado con el panel oculto, las escrituras del navegador dejaron de llegar al emulador aunque la lectura funcionaba (REST sí escribía); se resolvió reiniciando `tsc-emu-backend` y recargando la base. No es un defecto de la app.

## Pendientes / hallazgos nuevos

- **H-56** (baja): grupos de 17+ equipos a doble vuelta no se pueden regenerar de forma atómica (>500 escrituras).
- No tocado: la limitación documentada en la cabecera (editar a mano una fecha generada puede dejar `luisTeam` inconsistente; `matches.js` ya conserva `luisTeam` al editar, pero no revalida el recorrido completo).

Acción del dueño requerida: ninguna.
