# MS-5.11 · Palmarés, historial y tabla histórica (admin) · 2026-10-20

Estado: **CERRADO** (2026-10-20). Hallazgos nuevos: H-62 y H-63. Sin cambios de reglas ni de `functions/`.

Cómo se verificó (todo en el sandbox, nunca producción):

- Emuladores de Firestore y Auth, base recargada con `node scripts/emu-seed.mjs sandbox/backup.json --clean` (38 títulos de palmarés en 5 copas, historial completo). El palmarés no depende de la temporada seleccionada, así que no hizo falta una temporada de prueba.
- `dist` (`tsc-emu-dist`) para el recorrido completo; `tsc-src` (`tsc-emu`) para alta con validación, doble clic y orden con fallo inyectado. Panel del navegador no visible desde la sesión («la sesión no está abierta en ninguna ventana»), pero las promesas de Firestore resolvieron con normalidad.
- Estado leído del servidor con `where(...)` + `get({source:'server'})`.
- `node scripts/smoke-parity.mjs` → `PARIDAD: OK`. `node scripts/audit-wiring.mjs` → 0 handlers rotos (reporte restaurado).

## Cambios

`js/palmares.js` (admin)
- **Una sola escritura a la vez y errores claros** (`_palmRun`) en alta, edición, quitar título, y alta, edición, restauración y borrado de copas. Antes un doble clic en «Guardar título» creaba dos títulos y un fallo de red o de reglas era una promesa sin capturar.
- **Validación:**
  - El año debe tener 4 cifras entre 1900 y 2100 (antes `parseInt` aceptaba «20x4» como 20 y un campo vacío daba `NaN`).
  - Temporada limitada a 20 caracteres y juego a 30.
  - El equipo y la competición deben existir.
  - Un equipo no puede tener dos títulos de la misma copa en la misma temporada (sin distinguir mayúsculas).
  - Copas: nombre de 3 a 40 caracteres y único, abreviatura de 2 a 6, color válido y trofeo existente (el editar copa dejaba duplicar el nombre de otra).
- **Reordenar campeones:** el orden se escribe en **un lote** (antes un `dbPut` por registro: un corte dejaba dos campeones con la misma posición). Los cambios se encolan (dos flechas seguidas leían el mismo orden y se pisaban) y, si falla el guardado, se avisa y la lista se vuelve a pintar con lo guardado (el soltar-arrastrar era una promesa sin capturar).
- **Confirmaciones que dicen qué se pierde** (antes `confirm()` nativo con texto genérico):
  - Quitar título: equipo, copa, temporada, juego y año; si tiene galería, cuántas imágenes (los archivos subidos quedan en el almacenamiento) y que el campeón vigente puede cambiar.
  - Restaurar copa: qué se pierde.
  - Eliminar copa.
- **Una copa con títulos no se elimina** (`deleteCopa` y el botón): el aviso antiguo decía «los títulos se mantendrán», pero quedaban apuntando a una competición inexistente y desaparecían del palmarés. Ahora se pide quitar primero los títulos.
- **Limpieza única del `order` viejo** (`_palmResetBadOrderOnce`, corre sola al abrir el palmarés un admin): puts sueltos y la marca de «ya corrió» aparte; ahora todo en un lote.
- Símbolos de texto (`↕`, `↺`, flechas en el aviso) reemplazados por SVG o texto.

`js/history.js` (admin)
- «Exportar Excel»: una sola descarga a la vez (doble clic) y botón con SVG en vez de `⤓`.
- Encabezados ordenables de la tabla histórica: las flechas `▲▼` pasan a SVG.
- El resto del historial y la tabla histórica en admin son de lectura; sus escrituras (registro de partido y congelado de nombres) ya van por `historyRecordFor` (5.7 y 5.8).

## Verificado (`dist`)

- **Doble clic en «Guardar título»:** 1 título (T9).
- **Años inválidos** `1850`, `2101`, `12` → «El año debe ser un número de 4 cifras entre 1900 y 2100», sin alta. (El campo del modal es `type=number` y el navegador vacía «20x4»; la validación de `_palmYear` cubre el resto.) Con 2026 → guardado con `year: 2026`.
- **Duplicado:** misma temporada con otra capitalización (`t9`) → «Ese equipo ya tiene un título de esa copa en la temporada t9».
- **Quitar título:** el aviso dice «Se quita el título de MALVINAS JR en TSC 2da División (T11 · 2026). El campeón vigente puede cambiar.»; hasta confirmar sigue en el servidor, al confirmar desaparece.
- **Reordenar con fallo a mitad** (escritura prohibida agregada al lote): «No se pudo guardar el orden: Sin permiso…» y los 14 órdenes del servidor idénticos. Sin fallo, dos flechas abajo seguidas sobre el primero: queda tercero (34, 1, 42, 15), ninguna se pierde.
- **Copas:** nombre repetido (en minúsculas) → «Ya existe una copa llamada «TSC 1ra División»»; dos clics en «Crear copa» → 1 copa; con un título registrado, eliminar → «tiene 1 título registrado: quítalos antes de eliminarla»; sin títulos → confirma («Se quita la copa del listado. No tiene títulos registrados.») y la copa desaparece; «Restaurar original» avisa de lo que se pierde.
- **Historial y tabla histórica admin:** el historial muestra 100 filas con el botón de exportar con SVG; la tabla histórica carga y sus encabezados ordenables muestran SVG; el palmarés admin carga sin símbolos de texto.
- **C9 (presidente):** alta de título, crear copa y reordenar → «Sin permiso: solo un administrador…»; mismos conteos de títulos (10) y copas (5), mismo orden.
- **`tsc-src`:** año 1850 rechazado; doble clic → 1 título; reordenar con fallo inyectado → «No se pudo guardar el orden…» y orden intacto.
- **Consola:** 0 errores no capturados.

## Pendientes / hallazgos nuevos

- **H-62** (baja, decisión): borrar un título con galería deja las imágenes subidas en Cloudinary sin título al que mostrarse (no se pueden borrar desde el cliente sin credenciales de servidor). Hoy se avisa en la confirmación; limpiar de verdad requeriría una función de servidor.
- **H-63** (baja): `history.js` carga SheetJS desde `cdn.jsdelivr.net` sin SRI al exportar; la CSP lo permite por host. Si se quiere endurecer, fijar un hash de integridad o servir la librería desde el hosting (va a 6.x o 7.x).
- `refreshHistoryForSeason` sigue escribiendo registro por registro; es idempotente (solo escribe lo que cambia, H-29), así que un corte se arregla repitiéndolo. No se toca.
- Para M7: las vistas previas de trofeo con símbolos (`preview:'◆'`, líneas 49-59 de `palmares.js`) no se muestran en la UI actual; confirmar si son código muerto.

Acción del dueño requerida: ninguna (sin cambios de reglas ni de functions). Sale con el merge a `main`.
