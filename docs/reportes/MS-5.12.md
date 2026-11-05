# MS-5.12 · Calendario y etiquetas de día (admin) · 2026-10-20

Estado: **CERRADO** (2026-10-20). Sin hallazgos de seguridad nuevos. Sin cambios de reglas ni de `functions/`.

Cómo se verificó (todo en el sandbox, nunca producción):

- Emuladores de Firestore y Auth, base recargada con `node scripts/emu-seed.mjs sandbox/backup.json --clean`. Temporada de prueba T4 creada desde `temporadas-admin` (el botón «Crear» llama a `saveSeasonModal(null)`), con una competición, una fase de grupos con 3 partidos y un bracket a partido único.
- `dist` (`tsc-emu-dist`) para el recorrido completo; `tsc-src` (`tsc-emu`) para programar un cruce, doble edición y fallo a mitad. El panel del navegador no se pudo mostrar desde la sesión, pero las promesas de Firestore resolvieron con normalidad.
- Estado leído del servidor con `where(...)` + `get({source:'server'})`.
- «Notificar stream de hoy»: el emulador de Functions no está levantado, así que la callable se probó sustituyendo `_notifyStreamTodayCallable` por una simulada que registra los argumentos; el envío real queda cubierto por `npm run test:emulator` (5.8).
- `node scripts/smoke-parity.mjs` → `PARIDAD: OK`. `node scripts/audit-wiring.mjs` → 0 handlers rotos (reporte restaurado).

## Cambios (`js/calendar.js`)

- **Las fases de otras temporadas ya no aparecen.** `getForSeason('phases')` trae las fases de todas las temporadas (no tienen `season`), y el calendario admin las listaba todas: con la T4 seleccionada aparecían como «sin programar» 63 cruces de las fases de la T3 (en un caso de prueba: de 6 filas reales a 69). Ahora solo van las fases de las competiciones de la temporada seleccionada. Con la T3 seleccionada se ve «No hay partidos pendientes de programar».
- **Guardado de fecha y hora (grupo y cruce):**
  - Los guardados de una misma fila se encadenan (`_calEnqueue`): dos ediciones cercanas del mismo cruce podían crear dos documentos.
  - Un guardado que falla avisa con `dbErrorMsg` (era una promesa sin capturar dentro de un `setTimeout`, y la fila parpadeaba como guardada).
  - Se validan fecha (día real, año 2000-2100) y hora (`HH:MM`); una hora sin fecha no se guarda («Elige la fecha antes de la hora») y quitar la fecha limpia también la hora.
  - Escrituras en `dbWriteBatch`.
  - Temporada finalizada y partido en vivo rechazados desde el código. Un partido en vivo recibe goles seguidos y este guardado reescribe el documento entero desde una lectura anterior: podía pisar un gol.
  - No se crea un documento vacío si se borra una fecha de un cruce que no tiene documento.
- **Quitar programación** (`calClearSchedule`): ahora pide confirmación que dice qué se pierde (la fecha y la hora, y si el cruce no tiene resultado, que se borra su documento programado), escribe todo en un lote y se niega con partido en vivo o temporada finalizada.
- **Etiquetas de día:**
  - Un solo lote por guardado.
  - Un día sin etiqueta ni tipo borra su documento (antes quedaba uno vacío por cada día tocado).
  - El tipo se limita a «libre» y «sorteo», y el texto a 64 caracteres también desde el código.
  - Temporada finalizada rechazada.
  - Errores con `dbErrorMsg` (el aviso decía siempre «Verifica permisos de Firestore»).
  - Si la lectura falla, el cronograma muestra el error en vez de verse vacío y dejar crear etiquetas duplicadas.
- **«Notificar stream de hoy»:** mandaba la fecha del **dispositivo**; las fechas programadas están en hora de Lima, así que un admin en otra zona avisaba a los equipos del día equivocado cerca de la medianoche. Ahora usa la fecha de Lima (`_calLimaTodayStr`). La confirmación dice la fecha, que un minuto después sale el aviso «a continuación» y que los ya avisados no lo reciben otra vez. Se rechaza con una temporada finalizada y el error `permission-denied` sale con un mensaje claro.

## Verificado (`dist`)

- **Validaciones:** hora sin fecha → «Elige la fecha antes de la hora»; `2026-02-31` → «La fecha no es válida»; `25:00` → «La hora no es válida». Guardado correcto: `2026-10-25 15:00` en el servidor; fecha con hora vacía: `scheduledTime` queda `null`.
- **Dos ediciones cercanas del mismo cruce** (18:00 y, un segundo después, 19:00): 1 documento, con 19:00 y la temporada 2.
- **Partido en vivo** (2-1): programar el cruce o el partido de grupo → «El partido está en vivo: no se puede cambiar su fecha…»; la hora y los goles del servidor no cambian.
- **Fallo a mitad** (escritura prohibida agregada al lote): programar → «No se pudo guardar la fecha: Sin permiso…», sin cambios; quitar programación → ídem, el documento sigue; etiqueta de día → ídem, el texto no cambia.
- **Quitar programación:** el cruce dice «Se quita la fecha (2026-10-27 19:00) de MALVINAS JR vs LA TOCATA AS. El cruce vuelve a «sin programar» y se borra su documento programado…»; hasta confirmar el documento sigue; confirmado, 0 documentos. Partido de grupo: solo se quita la fecha, el partido queda.
- **Etiquetas de día:** tres ediciones seguidas del mismo día → 1 documento (`Fecha 1 <b>x</b>`, sorteo; el texto se muestra escapado); vaciar texto y tipo → 0 documentos.
- **Temporada finalizada (T3):** etiqueta, programar un partido y notificar → «T3 está finalizada: no admite cambios»; sin escrituras (la fecha del partido de la T3 sigue 2026-07-26).
- **Notificar stream de hoy:** el argumento enviado es `{date: "2026-10-19", season: 2}` (fecha de Lima) cuando la del dispositivo ya era 2026-10-20: el caso del bug. Respuesta simulada → «1 presidente(s) notificados»; error simulado `permission-denied` → «Solo un administrador puede notificar el stream».
- **Fases de otras temporadas:** con la T4 seleccionada, 6 filas (3 de grupo y 3 del bracket de prueba); con la T3 seleccionada, 0 filas.
- **C9 (presidente):** programar un partido y guardar una etiqueta → «No se pudo guardar la fecha / la etiqueta: Sin permiso…»; sin escrituras.
- **`tsc-src`:** programar un cruce con fecha y hora (dos eventos seguidos) → 1 documento; con el fallo inyectado, la hora no cambia.
- **Consola:** 0 errores no capturados.

## Pendientes / hallazgos nuevos

- Sin hallazgos nuevos. Nota para M7: `getForSeason('phases')` sigue trayendo las fases de todas las temporadas; cada consumidor tiene que filtrar por sus competiciones (el calendario admin ya lo hace; el export lo resuelve 5.13).

Acción del dueño requerida: ninguna (sin cambios de reglas ni de functions). Sale con el merge a `main`.
