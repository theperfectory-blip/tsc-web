# MS-5.14 a 5.16 · Temporadas archivadas (D8) · 2026-10-20

Estado: **CERRADO** en código y verificado en el sandbox (2026-10-20, Opus). Cierra H-47 y H-49. La T3 real **todavía no se archiva**: en producción figura «Activa» (`status: active`, sin `finishedAt`). El dueño eligió construir y probar todo con la T3 finalizada del sandbox y archivar la real cuando la finalice (M-13). Hallazgos nuevos: ninguno.

Cómo se verificó (todo en el sandbox, nunca producción):

- Emuladores de Firestore y Auth, base cargada con `node scripts/emu-seed.mjs sandbox/backup.json --clean` (en el sandbox la T3, número 1, está finalizada).
- Variantes `dist` (`tsc-emu-dist`) y `tsc-src` (`tsc-emu`); panel del navegador visible.
- Reglas: `npm run test:rules` → `rules-teams` 33/33 y `rules-suite` **426/426** (47 casos nuevos).
- `smoke-parity` → `PARIDAD: OK`. `audit-wiring` → 0 handlers rotos (la función muerta que marca es `removeHistoryByMatchRef`, ya anotada como H-60). `node scripts/csp.mjs --check` OK. `build-www` copia `data/temporadas`.
- Producción: solo lectura (GET público), para confirmar el estado de la T3.

## 5.14 · Generador

`scripts/season-archive.mjs` (solo desarrollo, no se publica):

- `--season N` arma `tsc-src/data/temporadas/<N>.json` con todo lo de la temporada:
  - competiciones;
  - fases (por `compId`);
  - partidos (por `season` o por fase);
  - historial (por `seasonRef` o por partido);
  - YuNaCoins, sorteo, eventos del sorteo y etiquetas de día;
  - `teamsAtClose`: los equipos que aparecen, como estaban al archivar.

  También actualiza el índice `index.json`.
- Origen `--from prod` (por defecto: API REST pública, solo GET, como `emu-snapshot`), `--from emu` o `--from file:<backup>`.
- **Solo archiva una temporada finalizada.**
- Guarda conteos y una huella (sha256 de JSON canónico) por colección. `--verify` vuelve a leer el origen y compara: código 1 si algo no coincide.
- Se agrega `tsc-src/data/temporadas/index.json` vacío, para que la web no registre un 404 en cada visita mientras no haya temporadas archivadas.

Verificado:
- **Contra producción:** rechaza la T3 («no está finalizada (status: active)»).
- **Con el backup del sandbox:** archivo de 227 KB (5 competiciones, 10 fases, 422 partidos, 422 registros de historial, 3 movimientos, 1 sorteo, 79 eventos, 49 etiquetas, 37 equipos) y `--verify` OK.
- **Archivo alterado** (un gol cambiado): «DISTINTO matches», código 1.
- **Corrección:** en Windows, `process.exit` con `fetch` abiertos hacía caer a Node 25 (`Assertion failed … async.c`). Ahora usa `process.exitCode`.

## 5.15 · Lectura desde el archivo

`js/db.js`:

- **Al arrancar** (`initDB`), `_archLoad` lee el índice y cada archivo. Valida formato, número de temporada y conteos, y congela las filas.
- **Lectura:** `dbGetAll`, `dbGet` y `dbSubscribe` suman las filas archivadas a las de Firestore. Si un id está en los dos lados, gana el archivo. El resultado sale en el mismo orden que Firestore (id como texto), porque hay pantallas que muestran en el orden recibido. Así todas las secciones públicas y admin, y el historial y la tabla histórica (que suman los JSON de PES 1-3, los archivos y la temporada actual), ven la temporada sin cambiar su código.
- `dbGetAllLive`: solo Firestore. La usan export e import: lo archivado vive en el repo y el import lo ignora, avisándolo.
- **Solo lectura:** `dbAdd`, `dbAddMany`, `dbPut`, `dbDelete`, `dbDeleteMany` y `dbWriteBatch` rechazan (code `archived`) cualquier escritura sobre un registro archivado, o sobre uno nuevo que cuelgue de una temporada archivada (por `season`, `seasonRef`, `compId` o `phaseId`). Mensaje: «Temporada archivada: es de solo lectura…».
- **APK:** el índice se pide primero al hosting (`https://teamsubscup.web.app/data/temporadas/`, agregado a `connect-src` en `scripts/csp.mjs` y `firebase.json`) y, si no está, al paquete; cada archivo, primero al paquete y después al hosting.
- **Aviso al arrancar** si los archivos no cargan: no se calla que faltarían datos.
- `history.js` no regenera el historial de una temporada archivada; la sincronización de cruces (`bracket.js`) no escribe partidos archivados.

Verificado:
- **Con el archivo cargado y la T3 todavía en Firestore** (`dist`): las 8 colecciones tienen la misma huella que sin archivo.
- **Prueba A/B en la misma sesión** (archivo prendido y apagado): **12 de 12 páginas idénticas**. Son panel, calendario, historial (partidos y tabla), las estadísticas de los 62 clubes en Equipos, partidos, fases, historial admin, tabla histórica admin, YuNaCoins, sorteo, calendario admin y competiciones.
- **Diferencia que la prueba encontró y que quedó corregida:** el orden de los partidos dentro de una fecha (Firestore entrega por id como texto).
- **APK simulada:** pidió el índice al hosting (404 hoy), cayó al paquete y cargó los 422 partidos.

## 5.16 · Cierre

- **Panel de temporadas:**
  - Una temporada archivada lleva la insignia «Archivada» y no tiene Editar, Finalizar, Reactivar ni Eliminar. Las funciones también lo rechazan si se llaman directo.
  - Botón «**Liberar Firestore**»: compara documento por documento lo que Firestore todavía guarda de esa temporada con el archivo. Si algo es distinto, o hay documentos que no están en el archivo, no borra nada y pide regenerarlo. Si todo coincide, descarga un respaldo (`TSC_<T>_firestore_antes_de_liberar_…json`), borra en lotes y anota la temporada en `archive/seasons`. Si se corta a mitad, la temporada se sigue viendo completa desde el archivo y se puede reintentar.
- **Reglas (`firebase/firestore.rules`):**
  - Colección `archive`. Solo el admin escribe `archive/seasons` (`numbers`, `compIds`), que solo puede crecer; nadie la borra.
  - Las escrituras en `seasons` (`number`), `competitions`, `matches`, `coins`, `sorteo`, `sorteoEvents` y `calDayLabels` (`season`), `matchHistory` (`seasonRef`) y `phases` (`compId`) se rechazan si apuntan a una temporada archivada, en el documento nuevo o en el que había.
  - Un lote de 450 bajas con `archive/seasons` presente pasa (sin problemas de límite de accesos).
- **H-47 (decidido por el dueño: ofrecer finalizar):** crear una temporada con otra activa pregunta «Finalizar y crear», «Crear sin finalizar» o «Cancelar». Finalizar y crear van en un lote.

Verificado:
- **Liberar Firestore** desde el panel: confirmación con «991 documentos… idénticos al archivo»; respaldo descargado (991); 0 documentos de la T3 en Firestore; `archive/seasons` = `{numbers:[1], compIds:[6..10]}`.
- **Lecturas por visita pública** (`emu-probe`, anónimo, 5 páginas): **1.102 → 114**.
- **Después de liberar:** datos y páginas iguales a la línea base, salvo Equipos, que cambia de una carga a otra por cuántas tarjetas se alcanzan a cargar. Las estadísticas de cada club son idénticas, comprobado en la prueba A/B.
- **Bloqueos:**
  - Editar un resultado de la T3 → «T3 está finalizada…».
  - `dbAdd('coins', {season:1})` → `archived`.
  - Reactivar o borrar la T3 → «Temporada archivada: es de solo lectura».
  - Escrituras directas a Firestore saltando la app (partido de la T3, fase de una competición archivada, vaciar `archive/seasons`) → `permission-denied`.
- **H-47:** T4 sin activa, sin pregunta; T5 con T4 activa → «¿Finalizar T4?». Cancelar no crea nada; «Finalizar y crear» deja la T4 finalizada y la T5 activa; «Crear sin finalizar» deja dos activas.

## Pendientes / hallazgos

- **H-47** (**cerrado**) y **H-49** (**cerrado**: la regla rechaza escrituras de temporadas archivadas; una temporada finalizada **no archivada** sigue protegida solo por la app, a propósito, porque se puede reactivar).
- **M-13 (dueño):** cuando la T3 termine, finalizarla en la app; generar `node scripts/season-archive.mjs --season 1` (desde producción), `--verify`, commit y deploy (merge a `main`). Después, en el panel, «Liberar Firestore» en la T3 (era M-8). Lo puede hacer Claude salvo los pasos de la app.
- **M-14 (dueño):** `firebase deploy --only firestore:rules`. Sin `archive/seasons` las reglas nuevas no cambian nada, así que se puede desplegar cuando quieras.
