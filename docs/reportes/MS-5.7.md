# MS-5.7 · Bracket, playoff y supercopa · 2026-10-19

Estado: **CERRADO** (2026-10-19). Cierra H-27 y H-30, y la parte de H-53 que quedaba en `bracket.js` y `playoff.js`. Hallazgos nuevos: H-57 a H-59.

Cómo se verificó (todo en el sandbox, nunca producción):

- Emuladores de Firestore y Auth (`tsc-emu-backend`), base recargada con `node scripts/emu-seed.mjs sandbox/backup.json --clean`, una T4 de prueba con una competición y fases de prueba: cuadro de 4 a partido único, cuadro de 2 a ida y vuelta con gol de visita, playoff de 1 llave a ida y vuelta, supercopa de 1 cruce y un cuadro para la sincronización.
- Variante `dist` (`tsc-emu-dist`) para el recorrido completo; variante `tsc-src` (`tsc-emu`) para render, guardado de resultado e historial.
- Estado leído del servidor con consultas `where(...)` y `get({source:'server'})`. Panel del navegador visible (con el panel oculto las escrituras quedan colgadas).
- Consola: 0 errores salvo los provocados (fallo inyectado y rechazos con sesión de presidente).
- `node scripts/smoke-parity.mjs` → `PARIDAD: OK`. `node scripts/audit-wiring.mjs` → 0 handlers rotos (reporte restaurado después). No se tocaron reglas.

## Cambios

`js/db.js`
- `dbNewIds(store, n)`: reserva ids sin escribir, para armar un lote con `set` cuando el historial de un partido nuevo tiene que apuntar a su id.

`js/bracket.js`
- **H-27 (cerrado):** `loadBracketLogos` buscaba el nombre del equipo dentro del id del elemento (`blogo-<fase>_r<n>_m<n>-a`), que no lo contiene: el bracket admin nunca mostraba escudos. Ahora cada círculo lleva `data-team-id` y se pinta por id.
- **Guardar resultado** (`saveBracketMatch`):
  - Partido e historial (y las dos vueltas) van en **un** `dbWriteBatch` (H-53).
  - Goles y penales enteros de 0 a 99; antes un campo vacío valía 0 y se aceptaban negativos.
  - Ida y vuelta: cada partido completo o vacío, la vuelta solo después de la ida. Vaciar una vuelta guardada la borra con su historial.
  - Un empate en partido único exige penales, porque dejaba el cruce sin ganador y la ronda siguiente sin equipo. Los penales solo se guardan si el resultado queda empatado.
  - Rechaza partidos en vivo, temporada finalizada y doble clic. Los errores salen con `dbErrorMsg`.
  - **Si cambia el ganador y la ronda siguiente ya se jugó con el anterior, se bloquea.** `buildBracketSlots` respeta los equipos guardados de un partido con resultado, así que la semifinal quedaba con el equipo viejo.
- **Borrar resultado:** un lote con el historial; mismo bloqueo si la ronda siguiente ya se jugó; partido en vivo y temporada finalizada rechazados.
- **Sincronización de cruces** (`_syncBracketSlotsForSourcePhase`, `_syncOwnBracketRounds`): cuando cambiaban los dos lados de un mismo partido, cada lado hacía su `dbPut` desde la copia leída al principio y el segundo pisaba al primero (el lado A volvía al equipo viejo). Ahora se junta un parche por documento y se escribe en lote.
- **Referencias de cruce** (`saveSlotRef`, `removeSlotRef`): no se cambian si el cruce ya tiene resultado o está en vivo, ni en temporada finalizada.
- `refBadgeHTML` escapa el segmento de posición. `✕` → SVG.

`js/playoff.js`
- **H-30 (cerrado):** el modal de un partido de la llave recibía los **nombres** de los equipos y `savePlayoffLeg` los guardaba como `teamA`/`teamB`; `getWinner` compara contra ids. Ahora recibe los ids del cruce, y `_plTeamId` normaliza a id lo que llegue (id, id en texto o, para datos viejos, el nombre actual o uno anterior).
- La vuelta solo se puede cargar con la ida terminada (la regla estaba calculada pero no se aplicaba).
- **Guardar o borrar un partido:** en lote con su historial (H-53). Validación 0-99; rechazo de vivo, temporada finalizada y doble clic. No se borra la ida si la vuelta ya se jugó.
- **Asignar equipos** (playoff y supercopa, función común `_plSaveAssign`): si cambian y la llave tenía resultados, se avisa cuáles se borran («Se borran 2 resultados ya cargados (2-0, 0-1)…»). Fase y bajas van en un lote. Antes se borraban sin avisar, y la supercopa dejaba el historial huérfano.
- **Limpiar cruce:** usaba `confirm()` nativo; ahora `showConfirm` con lo que se pierde, en un lote.

## Verificado (`dist`)

- **H-27:** los equipos 1 y 4, los únicos con escudo, muestran su escudo en el bracket admin; los otros, iniciales.
- **Partido único:**
  - 1-1 sin penales → «Empate: define un ganador por penales».
  - -2 → «Los goles deben ser números enteros entre 0 y 99».
  - Doble clic → 1 partido.
  - 1-1 con penales 4-3 → guardado.
  - Final 3-1 → guardada.
  - 3 partidos, 3 registros de historial.
- **Ganador propagado:** con la final jugada, cambiar la semifinal de 2-0 a 0-2 queda bloqueado; corregirla a 3-0 (mismo ganador) se guarda; borrarla queda bloqueado. Borrada la final, la semifinal se borra junto con su historial.
- **Referencias:** quitar la del cruce jugado se bloquea; la del cruce sin resultado se quita.
- **Ida y vuelta:**
  - Vuelta sin ida → «Carga la ida antes que la vuelta».
  - Ida 2-1 → guardada.
  - Vuelta 0-1 → global 2-2, gana el equipo 8 por gol de visita. 2 partidos, 2 registros de historial.
  - Vaciar la vuelta → queda solo la ida, con 1 registro de historial.
- **Playoff (H-30):**
  - El clic del modal lleva los ids `5,6`; el modal muestra los nombres.
  - Una vuelta guardada pasando **nombres** (como los datos viejos) queda con `teamA`/`teamB` numéricos.
  - Ganador de la llave: 5. Doble clic → 1 partido.
- **Reasignar la llave con resultados:**
  - Aviso «Se borran 2 resultados ya cargados (2-0, 0-1)…».
  - Cancelar → nada cambia.
  - Confirmar → 0 partidos, 0 historial, equipos nuevos.
- **Supercopa:** reasignar → «Se borra 1 resultado ya cargado (1-0)…»; partido **e historial** borrados (antes el historial quedaba).
- **Sincronización:** final guardada sin resultado con los dos lados viejos (99 v 98). Tras sincronizar queda en 11 v 14, con 2 cambios en un documento. Antes el segundo lado pisaba al primero.
- **Fallo a mitad:** con una escritura prohibida agregada al lote de `saveBracketMatch`, el partido sigue sin goles y sin historial, y aparece el aviso «No se pudo guardar el resultado: Sin permiso…».
- **C9 con sesión de presidente:** guardar resultado, borrar resultado, guardar partido de playoff y quitar referencia fallan con «Sin permiso…»; el servidor sigue con 427 partidos.
- **`tsc-src`:** render del bracket, final 2-1 guardada con su historial, página de partidos sin errores.

## Pendientes / hallazgos nuevos

- **H-27** (**cerrado**), **H-30** (**cerrado**), **H-53** (bracket y playoff cerrados; queda `livematch.js` → 5.8, usando `dbWriteBatch` + `historyRecordFor` + `_bkResultOps`).
- **H-57** (media, decisión): entre fases no hay bloqueo. Si cambia la tabla de un grupo o el ganador de una llave **después** de que el cruce que lo recibe ya se jugó, la sincronización (bien) no toca ese partido, pero queda con un equipo que ya no clasifica, sin aviso. Dentro de un mismo bracket ya se bloquea (5.7). Opciones: avisar al guardar el resultado de origen, o bloquear como dentro del bracket.
- **H-58** (baja, va a 7.2): `updateBracketTeamsDynamic` / `updateBracketDOM` son código muerto (buscan elementos `tlogo-`, que no existen); además leen todos los equipos en cada render.
- **H-59** (baja, va a 5.8): `livematch.js` guarda el partido y su historial por separado al terminar un partido en vivo.
- Cambio de comportamiento a tener en cuenta: un empate en partido único de eliminación directa ahora **exige** penales.

Acción del dueño requerida: ninguna (no hay cambios de reglas). Sale con el merge a `main`.
