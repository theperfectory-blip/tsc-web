# MS-5.8 · Partido en vivo y notificaciones · 2026-10-19

Estado: **CERRADO** (2026-10-19). Cierra H-59 (resto de H-53). Sin hallazgos de seguridad nuevos.

Cómo se verificó (todo en el sandbox, nunca producción):

- Emuladores de Firestore y Auth (`tsc-emu-backend`), base recargada con `node scripts/emu-seed.mjs sandbox/backup.json --clean`, temporada de prueba T4 creada con «Crear» desde `temporadas-admin`, y una competición con fase de grupos, bracket a partido único y playoff ida y vuelta.
- `dist` (`tsc-emu-dist`) para el recorrido completo; `tsc-src` (`tsc-emu`) para marcador, doble clic, fallo a mitad y finalizar con historial.
- Estado leído del servidor con `where(...)` + `get({source:'server'})`. Panel del navegador visible.
- Functions: `npm run test:emulator` → `TODOS LOS ESCENARIOS DEL GATE PASARON (1-10)`. Hubo que parar `tsc-emu-backend` (usa :8080) para correrlo y volver a levantarlo.
- `node scripts/smoke-parity.mjs` → `PARIDAD: OK`. `node scripts/audit-wiring.mjs` → 0 handlers rotos (reporte restaurado). No se tocaron reglas.

## Cambios

`js/livematch.js`
- **H-59 (cerrado):** «Finalizar» escribía el partido y su historial por separado. Ahora van en un solo `dbWriteBatch` (`_bkResultOps`, como en 5.7).
- **Cola de escrituras** (`_lmEnqueue`): cada gol, penal, reinicio, finalizar y descartar espera al anterior. Todo error sale como aviso con `dbErrorMsg` (antes eran promesas sin capturar).
- **Un partido que ya no está en vivo no se toca** (`_lmLiveDoc`): antes un gol después de finalizar o descartar lo volvía a poner en vivo; un doble clic en «Finalizar» pasaba dos veces.
- **Temporada finalizada** rechazada desde el código en iniciar, gol, penal, reiniciar, finalizar y descartar (`_mxSeasonLocked`).
- **Iniciar en vivo** (las cuatro variantes en `_lmStart`): si la lectura de «otro partido en vivo» falla ya no deja pasar un segundo (antes devolvía `null`); avisa «Ya hay otro partido en vivo» en vez de no hacer nada; no inicia un cruce sin los dos equipos; un cruce ya jugado cuyo ganador pasó a una ronda jugada no se puede volver a poner en vivo (mismo criterio de 5.7).
- **Marcador y penales** de 0 a 99; al finalizar se validan enteros.
- **Penales** solo se guardan si el partido o la serie los necesitan (antes se podían guardar penales sobre un 2-1).
- **Descartar:** partido e historial en un lote; el texto de la confirmación dice qué se pierde (marcador y registro de historial). Un cruce con fecha asignada en el Calendario ya no se borra (perdía fecha, hora y equipos): se conserva y solo se quita el marcador. En grupos, el historial de un partido que se había finalizado antes ahora también se borra (quedaba huérfano con el marcador viejo).
- **Reiniciar marcador** pide confirmación si hay goles.
- Los símbolos de texto del modal (reloj, check, deshacer) pasan a SVG (regla de la UI).

`functions/lib/matchOrder.js` (y `functions/test/verify-emulator.js`, escenario 10)
- `getOrderedMatchesForDate` filtraba solo por fecha y temporada: «Tu equipo juega hoy» y «a continuación» salían también por partidos **ya jugados**, y el «siguiente» de `onMatchWentLive` podía ser un partido terminado. Ahora cuentan los partidos por jugar o en vivo.

## Verificado (`dist`)

- **Marcador:** 5 clics de gol A y 2 de B sin esperar → servidor 5-2, pantalla 5-2 (nada perdido).
- **Otro en vivo:** con el partido 1 en vivo, iniciar el 2 → «Ya hay otro partido en vivo…»; el 2 sigue sin vivo.
- **H-59, fallo a mitad:** con una escritura prohibida agregada al lote de finalizar → «No se pudo finalizar el partido: Sin permiso…»; el partido sigue en vivo 5-2 y 0 registros de historial.
- **Doble clic en Finalizar:** 1 partido finalizado, 1 registro de historial (5-2); el segundo clic y un gol posterior reciben «Este partido ya no está en vivo» y no cambian nada.
- **Descartar:**
  - Partido de grupo ya finalizado y vuelto a vivo: marcador a `null`, 0 historial, confirmación «Se pierde el marcador (5-2) y su registro de historial».
  - Cruce programado: se conserva con fecha y hora, sin marcador.
  - Cruce creado al iniciar el en vivo (sin fecha): el documento se borra.
  - Con una escritura prohibida agregada: queda en vivo con su marcador; sin ella, se descarta.
- **Eliminatoria:** empate 1-1 sin penales → aviso y sigue en vivo; con penales 3-2 → guardado, historial con penales; penales tocados y marcador 2-1 → se guardan `null`.
- **Ronda siguiente jugada:** poner en vivo el cruce → «La ronda siguiente ya tiene resultado…».
- **Temporada finalizada:** iniciar en la T3 → «T3 está finalizada: no admite cambios», sin escrituras.
- **Playoff ida y vuelta:** ida 2-0 guardada; vuelta 0-2 (global 2-2 sin gol de visita) → exige penales; con penales 0-1 → guardada. 2 partidos, 2 historiales.
- **Tope:** un gol sobre 99 se queda en 99.
- **C9 (presidente):** iniciar en vivo en grupo → «Sin permiso: solo un administrador…»; sin escrituras (3/1 documentos antes y después). El segundo intento mostró un instante «Ya hay otro partido en vivo» porque el espejo local ve la escritura rechazada hasta que se revierte; el servidor no tenía ninguno en vivo (ver pendientes).
- **`tsc-src`:** 4 goles A y 1 B simultáneos → 4-1; finalizar con fallo inyectado → sigue en vivo, 0 historial; finalizar con doble clic → 1 finalizado, 1 historial.
- **UI:** el modal muestra los íconos SVG (reloj, check) y el distintivo de tiempo extra.
- **Consola:** solo errores provocados (rechazos de reglas con presidente y con la escritura prohibida) y los `seedHistoryIfEmpty`/400/403 del arranque sin sesión del sandbox, que ya existían.

## Functions

- `npm run test:emulator`: 10 escenarios, todos pasan. El escenario 10 es nuevo: con dos partidos jugados (uno entre medio), `notifyStreamToday` cuenta solo los 2 pendientes y avisa a 3 presidentes; al poner en vivo el 302, el aviso «a continuación» va al 304 saltando el 303 ya jugado.
- Revisado sin cambios: `notifyStreamToday` valida el rol contra Firestore y no confía en nada del cliente; `notifyStartupContinuation` es `invoker: private`; `onMatchWentLive` solo reacciona al flanco `false → true` (los goles no disparan nada); la clave de dedup compartida evita el doble aviso.

## Pendientes / hallazgos nuevos

- **H-59** (**cerrado**); **H-53** queda cerrado del todo (sin resto en `livematch.js`).
- Sin hallazgos nuevos numerados. Nota para M7: el espejo local muestra un instante una escritura rechazada como si existiera (afecta solo el texto del aviso «otro partido en vivo» tras un rechazo).
- `onMatchWentLive` usa `onDocumentUpdated`: un partido creado ya en vivo (cruce sin documento previo) no dispara el aviso. No importa hoy porque ese cruce no tiene `scheduledDate`, y sin fecha el aviso no aplica; queda anotado por si algún día se programan cruces sin documento.

Acción del dueño requerida: **M-12** (`firebase deploy --only functions`) para que el filtro de partidos jugados llegue a producción. No hay cambios de reglas.
