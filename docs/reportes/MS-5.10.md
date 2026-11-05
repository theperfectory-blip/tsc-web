# MS-5.10 · Sorteo (admin) · 2026-10-20

Estado: **CERRADO** (2026-10-20). Hallazgos nuevos: H-60 y H-61. Sin cambios de reglas ni de `functions/`.

Cómo se verificó (todo en el sandbox, nunca producción):

- Emuladores de Firestore y Auth, base recargada con `node scripts/emu-seed.mjs sandbox/backup.json --clean`. Primero con la T3 (finalizada) seleccionada; después con una T4 de prueba creada con «Crear» desde `temporadas-admin`, con una competición de prueba y tres fases: grupos (2 grupos de 4), bracket a partido único de 4 y playoff de 2 cruces.
- `dist` (`tsc-emu-dist`) para el recorrido completo, manejando la UI real (botones del sorteo, selector de equipos del bombo y picker «Vincular»); `tsc-src` (`tsc-emu`) para bombo, selector de equipos y doble clic en «Sortear».
- Estado leído del servidor con `where(...)` + `get({source:'server'})`. Panel del navegador visible.
- `node scripts/smoke-parity.mjs` → `PARIDAD: OK`. `node scripts/audit-wiring.mjs` → 0 handlers rotos (reporte restaurado; las «muertas» pasan de 11 a 12 por `removeHistoryByMatchRef`, ver H-60).

## Cambios (`js/sorteo.js`)

- **Un solo lote por acción.** Antes cada acción eran varias escrituras sueltas (H-53): vincular una bola liberaba el vínculo previo, escribía la fase, borraba los partidos del cruce uno a uno y al final guardaba el sorteo; «Reiniciar» guardaba el bombo y después borraba los eventos con un `Promise.all`; «Deshacer cambios» eran puts sueltos. Ahora cada acción arma un plan en memoria (fases tocadas, cruces que se desarman, registro del sorteo) y lo escribe con `dbWriteBatch`: fases + partidos e historial borrados + registro del sorteo, o nada.
- **Estado fresco.** Cada cambio parte de una copia del registro leída en ese momento, no del estado local, que podía estar viejo si otro dispositivo sorteó. Las bolas se buscan por bombo y equipo, no por posición.
- **Una operación a la vez** (`_sRun`): doble clic en «Sortear» (entre el clic y la transacción `busy` aún no estaba activo y se podían sortear dos equipos), en vincular, reiniciar, etc. Los errores salen como aviso con `dbErrorMsg`.
- **Temporada finalizada** rechazada desde el código en sortear, bombos, selector de equipos, reiniciar, vincular, desvincular y deshacer (H-49). Cambiar de bombo en una temporada finalizada no persiste nada.
- **Confirmaciones que dicen qué se pierde** (antes `confirm()` nativo o ninguna):
  - Reiniciar: cuántos sorteados vuelven a la urna, que se borra el registro de eventos y cuántos vínculos a fases se pierden (las posiciones ya asignadas en las fases se conservan).
  - Eliminar bombo: equipos, sorteados con sus eventos y vínculos. Ahora también borra los eventos del bombo, que quedaban huérfanos.
  - Quitar del bombo equipos ya sorteados: cuáles, y que salen del registro con sus vínculos.
  - Cambiar un cruce de playoff con resultados: «Se borra 1 resultado ya cargado (2-0) de este cruce y su historial».
- **Cruces y grupos con resultados:**
  - Un cruce de playoff con partido en vivo no se cambia.
  - Una llave de bracket con resultado o en vivo no se cambia (mismo criterio de 5.7, `_bkRefPhaseEditable`).
  - Un equipo con partidos en un grupo no se mueve de grupo (misma guarda de «Equipos por grupo», 5.5).
  - Desvincular una bola de un cruce de playoff también desarma el cruce (con la misma confirmación).
- Nombres de bombo vacíos rechazados y limitados a 30 caracteres. El picker de equipos revisa contra la copia fresca que un equipo no esté ya en otro bombo.
- El botón «Deshacer cambios» pasa de un símbolo de texto a un SVG.

## Verificado (`dist`)

- **T3 finalizada:** «Agregar bombo» → «T3 está finalizada: el sorteo no admite cambios»; 6 bombos antes y después.
- **Selector de equipos:** 4 equipos al bombo A, guardados.
- **Doble clic en «Sortear»:** 1 equipo sorteado, 1 evento. Cuatro sorteos seguidos: 4 sorteados, 4 eventos.
- **Vincular a grupo, fallo a mitad** (escritura prohibida agregada al lote): «No se pudo vincular: Sin permiso…»; el grupo queda vacío y la bola sin vínculo. Sin fallo y con doble clic: equipo en la posición 1 del grupo A, vínculo guardado.
- **Grupo con partidos:** mover al equipo al grupo B con un partido suyo en el A → «No se puede: ALBERDI 23 (Grupo A) ya tiene partidos en ese grupo»; nada cambia. Sin el partido, se mueve y el vínculo se actualiza.
- **Playoff:** asignar la bola 1 al cruce 1 lado A (también libera su vínculo de grupo en el mismo lote). Con un resultado 2-0 y su historial en el cruce, asignar otra bola: aviso «Se borra 1 resultado ya cargado (2-0)…» sin escribir nada hasta confirmar; confirmando con fallo inyectado → «Sin permiso», plantilla, partido e historial intactos y vínculos sin cambios; confirmando sin fallo → equipo nuevo, 0 partidos, 0 historial, vínculo del equipo desplazado a `null`.
- **Playoff con partido en vivo** → «El cruce tiene un partido en vivo…»; sin cambios.
- **Bracket:** asignar a la llave 1 lado A guarda la referencia; con un resultado en esa llave, asignar otra bola → «Este cruce ya tiene resultado o está en vivo…»; la referencia no cambia.
- **Deshacer cambios:** con fallo inyectado → «No se pudo deshacer: Sin permiso…», fase intacta; sin fallo, la referencia añadida y el vínculo se revierten en un lote.
- **Reiniciar:** el aviso dice «Los 4 equipos sorteados vuelven a la urna… se pierden 2 vínculos…»; con fallo inyectado, 4 sorteados y 4 eventos intactos; sin fallo, 0 y 0.
- **Quitar un equipo ya sorteado del bombo:** aviso con su nombre; recién al confirmar sale del bombo y del registro (2 equipos, 1 sorteado).
- **Eliminar bombo:** aviso «Se pierde el bombo con 2 equipos, 1 sorteado con su registro de eventos»; con fallo inyectado, bombos y eventos intactos; sin fallo, queda el otro bombo y 0 eventos.
- **Nombre vacío:** «El nombre del bombo no puede estar vacío».
- **C9 (presidente):** crear bombo y guardar equipos → «No se pudo crear el bombo / guardar los equipos: Sin permiso…»; el registro queda igual (misma marca `updatedAt`).
- **`tsc-src`:** bombo nuevo, selector de 3 equipos y doble clic en «Sortear» → 1 sorteado, 1 evento.
- **Consola:** 0 errores no capturados (solo los rechazos provocados).

## Pendientes / hallazgos nuevos

- **H-60** (baja, va a 7.2): `removeHistoryByMatchRef` (`history.js`) ya no la llama nadie desde 5.8 y 5.10 (todo borrado de historial va por `_mxDeleteOps`). Candidata a código muerto.
- **H-61** (baja): los vínculos del sorteo de tipo grupo y bracket no se invalidan cuando la fase se edita fuera del sorteo («Equipos por grupo», referencias de cruce): el distintivo «→ Grupo A · pos 1» queda viejo. Para playoff sí existe `SORTEO.invalidatePlayoffLink` (llamado desde `playoff.js`). Decidir en 7.x si se unifica.
- Límite conocido, sin hallazgo: «Deshacer cambios» restaura el registro del sorteo tal como estaba al abrir el modal, aunque entretanto otro dispositivo haya sorteado (semántica previa del botón).

Acción del dueño requerida: ninguna (sin cambios de reglas ni de functions). Sale con el merge a `main`.
