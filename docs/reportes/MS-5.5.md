# MS-5.5 · Partidos, resultados, desempates y grupos · 2026-10-19

Estado: **CERRADO** (2026-10-19). Hallazgos nuevos: H-51 a H-54. H-49 sigue abierto (el código de partidos ya se niega a escribir en una temporada finalizada, pero las reglas no).

Cómo se verificó (todo en el sandbox, nunca producción):

- Emuladores de Firestore y Auth (`tsc-emu-backend`), base cargada con `node scripts/emu-seed.mjs sandbox/backup.json --clean`. Temporada de prueba T4 creada desde la UI (`openSeasonModal`), con una competición y una fase de grupos a una vuelta: Grupo A de 4 equipos y Grupo B de 3 (impar, con equipo libre). T3 (finalizada) como control.
- Variante `dist` (`tsc-emu-dist`) para el recorrido completo y una pasada final; variante `tsc-src` (`tsc-emu`, `sandbox/site` sincronizado) para el recorrido de escrituras y la tabla de T3.
- Consola con trampa de `error`, `unhandledrejection` y `console.error`: 0 errores inesperados en las dos variantes. Los únicos `console.error` son los rechazos de reglas esperados de C9 (capturados y mostrados como aviso).
- Estado leído por REST como `owner` (no del espejo del cliente) para confirmar partidos, historial, `rondaMeta` y criterios.
- `node scripts/smoke-parity.mjs` → `PARIDAD: OK`. `node scripts/audit-wiring.mjs` → 0 handlers rotos (se restauró su reporte manual).
- Reglas: sin cambios, no se corrieron sus tests.
- Observación de pruebas: con el panel del navegador oculto, el SDK de Firestore no resuelve la promesa de una escritura (el dato sí llega al servidor); parecía un cuelgue del código. Con la pestaña al frente, `dbPut` resuelve en 340 ms. Mantener el panel visible al probar escrituras.

## Cambios

`js/matches.js`
- **Cambiar el cruce de una fecha dejaba el marcador pegado a otros equipos** (integridad): al editar una fecha, un partido con resultado cuyo par cambiaba conservaba `goalsA/goalsB`; quitar un partido lo borraba sin avisar. Ahora se calcula qué resultados se pierden, se pide confirmación («Esto borra resultados», con los marcadores) y al confirmar se limpian resultado, fecha y registro de historial. Un partido en vivo bloquea el cambio.
- **Resultados validados**: vacío, negativo, decimal o mayor a 99 se rechazan (antes vacío se guardaba como 0 y `-3` como `-3`). Partido en vivo: no se edita desde el modal. Partido borrado con el modal abierto: aviso.
- **Temporada finalizada** (H-49, parte del código): `_mxSeasonLocked` en crear/editar fecha, fecha de jornada, resultado, borrar partido y borrar fecha; ya no depende solo de botones deshabilitados.
- **Doble clic y errores** (`_mxRun`): una escritura de partidos a la vez; `try/catch` con `dbErrorMsg` (C9); si algo falla a medias se repinta lo realmente guardado.
- **Crear fecha**: relee y se niega si otra sesión ya la creó o cambió; `dbAddMany` para los nuevos partidos; fase borrada con el modal abierto ya no crea una fase fantasma (`{...null, rondaMeta}`) en `saveRonda` ni `saveJornadaDate`.
- **Borrados en lote**: `deleteRonda` y `deleteMatch` usan `dbDeleteMany` (historial primero, luego partidos) y avisan cuántos resultados salen; no se borra un partido ni una fecha con un partido en vivo. Borrar el único partido de una fecha limpia su equipo libre y su fecha sugerida (el libre seguía contando como «ya fue libre»).
- Navegador de fechas: si la fecha recordada se borró, vuelve a la última (mostraba una «Fecha N» vacía). Fase por defecto = la primera del selector (competiciones y fases ordenadas). Botones `✕` → SVG Lucide (`_ICON_X`); `escAttr` en los `<input type=date>`.

`js/standings.js`
- **Mover un equipo de grupo hacía desaparecer sus resultados de la tabla**: la guarda de «Guardar grupos» solo miraba equipos que salían de toda la fase y solo partidos con resultado. Ahora bloquea quitar o mover un equipo que tenga partidos (jugados o pendientes) en su grupo actual y dice cuáles. Además: fase borrada, temporada finalizada, doble clic, `try/catch`; nombres de equipos inactivos ya asignados (antes «Team 12»); colores con `safeCssColor`.
- **`isMathConfirmed` con ida y vuelta**: usaba `n-1` partidos como máximo, así que en una fase a doble vuelta confirmaba la posición a mitad del torneo. Ahora recibe los partidos totales (`(n-1)*legs`) y la leyenda dice «Posición matemáticamente definida» (también marca a los eliminados).
- **Criterios**: guardar sin criterios activos dejaba `criteria: []` y al reabrir quedaban los de fábrica y los mismos «en desuso» a la vez; ahora exige al menos uno. Guarda de doble clic, temporada finalizada, fase borrada, `try/catch`. Nombre del criterio personalizado con `escAttr`/`escHtml` y `maxlength=40` (antes `&` y `<` se rompían).
- Desempate: ids normalizados a número (con ids en texto «Enfrentamiento directo» nunca coincidía); los «últimos 3» salen en orden de juego (fecha, luego id), no en el orden en que la base devolvía los documentos.
- Escapes: nombre y color de zonas en la leyenda y las posiciones. `✓` y `ℹ` → SVG Lucide.

`docs/MACRO_SLICE_DEBUGGING.md`: estado de 5.5 y hallazgos H-51 a H-54.

## Verificación (T4 de prueba)

- Doble clic en «Guardar fecha» (`saveRonda` x2) → 2 partidos, no 4.
- Resultado `-3`, vacío y `1.5` → «Los goles deben ser números enteros entre 0 y 99», partido sin cambios. Doble guardado de `2-1` → 1 resultado y 1 registro de historial; la tabla suma 3 puntos al ganador.
- Editar la fecha cambiando el cruce de un partido con resultado: confirmación con el marcador; cancelar → nada cambia; confirmar → partido con el nuevo par, `goalsA/B` nulos y 0 registros de historial. Con un partido de esa fecha en vivo → «termínalo antes de cambiar el cruce», sin cambios.
- Grupo B (3 equipos): libre y cruce guardados en `rondaMeta`; repetir el mismo libre → bloqueado; «Aplicar a todos» fecha → `scheduledDate` y `playedAt` en el partido y `rondaMeta`; borrar el único partido → `rondaMeta` vacío y su historial borrado.
- Partido en vivo (forzado): borrar partido, borrar fecha y guardar resultado → rechazados con aviso.
- «Guardar grupos» moviendo a MALVINAS JR de A a B → «tienen partidos en su grupo actual: MALVINAS JR (Grupo A, 2 partidos)»; grupos sin cambio. Quitar un equipo sin partidos → guarda y repinta la tabla.
- Criterios: sin activos → «Deja al menos un criterio activo»; reordenar y guardar con nombre `Alfa <b>x</b> "q"` → texto literal en el input y en el modal, 0 `<b>` inyectados. Zona llamada `Clasifica <i>x</i>` → literal en la leyenda.
- Unitarias en el navegador: `isMathConfirmed` con 6 puntos de 2 jugados → `true` con 3 partidos totales, `false` con 6; `calcGroupStandings` con ids en texto y criterio `direct` → orden correcto.
- T3 (finalizada): borrar partido, borrar fecha, guardar resultado, abrir el modal de fecha y guardar grupos → «T3 está finalizada: no admite cambios»; el partido queda idéntico. La tabla de T3 (a doble vuelta, 14 partidos jugados) se pinta con sus 2 grupos y 16 equipos.
- C9 con sesión de presidente: guardar resultado, borrar partido, borrar fecha, fecha de jornada, criterios, grupos y crear fecha → «Sin permiso: solo un administrador puede hacer esto.» en las siete; el servidor (REST) conserva los 4 partidos, el resultado y los criterios.
- Borrar una fecha con 1 resultado: aviso «2 partidos … (1 con resultado, que también salen del historial)» → 0 partidos y 0 registros de historial en el servidor.
- Móvil 375 px: sin desborde horizontal (`scrollWidth` 375), botones de borrar con SVG.
- `dist`: pasada final tras el último cambio (crear fecha, resultado, borrar fecha, T3 finalizada) → todo OK, 0 errores.

## Pendientes / hallazgos nuevos

- **H-51** (baja, va a 7.2): código muerto en `matches.js` (`openMatchInputModal` y compañía, `_matchRondaActual`).
- **H-52** (baja, decisión de reglamento): «Enfrentamiento directo» solo compara el par, no una mini-tabla entre todos los empatados.
- **H-53** (media, va a 5.13): escrituras de varios documentos sin atomicidad; falta `dbPutMany`. Mitigado, no resuelto.
- **H-54** (baja, dato): `phases/11.customCriterionName` = «5. Orden alfabético».
- No tocado (fuera de alcance): el generador de fechas (5.6), los bracket que referencian posiciones de grupo (5.7) y el partido en vivo (5.8). `refBadgeHTML` (`bracket.js`) no escapa el segmento de posición del rótulo; los rótulos salen de números, riesgo bajo, para 5.7.

Acción del dueño requerida: ninguna (no hay cambios de reglas). El resto sale con el merge a `main`.
