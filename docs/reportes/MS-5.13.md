# MS-5.13 · Datos: exportar e importar · 2026-10-20

Estado: **CERRADO** (2026-10-20, Opus). Cierra H-19 y el pendiente de MS-5.2 (export de fases por temporada). Hallazgo nuevo: H-64.

Cómo se verificó (todo en el sandbox, nunca producción):

- Emuladores de Firestore y Auth, base cargada con `node scripts/emu-seed.mjs sandbox/backup.json --clean` (1.105 registros en 14 colecciones).
- Variante `dist` (`tsc-emu-dist`) para el recorrido completo; variante `tsc-src` (`tsc-emu`) para export, «Fusionar» y la copia previa.
- Panel del navegador visible. `downloadJSON` interceptado en las pruebas para leer lo que se descarga (export, copia previa).
- Estado leído del servidor (`get({source:'server'})`) antes y después de cada import.
- `smoke-parity` → `PARIDAD: OK`. `audit-wiring` → 0 handlers rotos; la función muerta nueva que marca es `removeHistoryByMatchRef`, ya anotada como H-60.
- No se tocaron reglas.

## Cambios (`js/data.js`)

- **Import (H-19).** Antes, «Sobrescribir» borraba todo, registro por registro, y después escribía uno por uno: un corte a mitad dejaba la base medio vacía. Ahora `_dataApplyImport` sigue estos pasos:
  1. Lee el estado actual de las colecciones afectadas y **descarga una copia** (`TSC_antes_de_importar_<fecha>.json`, mismo formato que un backup: se puede volver a importar).
  2. Escribe **primero** todos los registros del archivo y **después** borra los que sobran (en «Sobrescribir»). La base nunca queda vacía a mitad.
  3. Si todo entra en un lote de 500 escrituras, va en un solo `dbWriteBatch`, que es atómico. Si no, va por lotes; si uno falla, **revierte** lo ya aplicado al estado del paso 1 (`_dataRollback`). Si la reversión también falla, el aviso remite a la copia descargada.
  4. Ajusta los contadores de id e invalida el espejo de las colecciones tocadas.
- **Validación completa antes de tocar nada.** Se suman los campos mínimos de cada colección (`_DATA_REQUIRED`: p. ej. `matches.phaseId`, `phases.compId`, `competitions.season`, `teams.name`) a lo que ya había: formato, id entero, sin duplicados. Las referencias rotas dentro del archivo (fases sin su competición, partidos sin su fase, historial sin su partido) se muestran en la confirmación, sin bloquear.
- **Export de temporada:**
  - Las fases se toman por las competiciones de la temporada; antes `getForSeason('phases')` traía las de todas.
  - Suma `matchHistory`, `sorteo`, `sorteoEvents`, `calDayLabels` y la temporada misma.
  - Se marca `partial: true`, y el import **no deja usarlo para «Sobrescribir»**: un export de una temporada sobrescribiendo habría borrado partidos, fases y competiciones de todas las demás. También se reconoce el formato viejo (`TSC_v4` con `season`).
- Confirmación con el conteo por colección y qué pasa con lo que no está en el archivo. Guarda de doble clic. Errores con `dbErrorMsg`.

## Verificado (`dist`)

- **Exportar todo:** 14 colecciones, 1.105 registros.
- **Validación**, sin abrir la confirmación ni escribir nada:
  - Partido sin `phaseId` → «matches #1005: falta «phaseId» o no es válido».
  - Id duplicado → «ID duplicado en teams: 1».
  - JSON cortado → «Unexpected end of JSON input».
  - Export de temporada en «Sobrescribir» → bloqueado con explicación.
- **Sobrescribir grande** (archivo con 30 partidos menos, un equipo renombrado y una etiqueta nueva):
  - 1.106 escrituras en 3 lotes.
  - Resultado igual al archivo: 392 partidos, los 30 borrados, equipo renombrado, etiqueta presente.
  - La copia previa descargada tiene 422 partidos y el nombre original.
  - La confirmación avisó «30 registros del historial sin su partido».
- **Fallo en el 2.º de 3 lotes** (escritura prohibida inyectada):
  - El 1.º se revirtió.
  - Equipos (ids y nombres), partidos y etiquetas quedaron **idénticos** a antes.
  - Aviso: «No se pudo importar: Sin permiso… No se cambió nada (se revirtió lo aplicado).»
- **Fusionar chico** (3 escrituras, un solo lote):
  - Con el fallo inyectado: nada cambió.
  - Sin fallo: 2 equipos actualizados y la etiqueta nueva; no se borró nada (62 equipos).
- **Export de temporada con dos temporadas:** T4 → 1 competición, 1 fase, temporada 2; T3 → 5 competiciones, 10 fases.
- **C9 con sesión de presidente:** el primer lote se rechaza y nada cambia («No se cambió nada»).
- **Restauración real:** «Sobrescribir» con el backup completo original → 1.110 escrituras en 3 lotes; las 14 colecciones quedaron con los conteos exactos del backup (también se borraron la T4 y lo creado en las pruebas).
- **`tsc-src`:** exportar todo (14 colecciones), «Fusionar» de 1 registro y copia previa descargada.

## Pendientes / hallazgos nuevos

- **H-19** (**cerrado**).
- **H-64** (baja): la atomicidad total de un import de más de 500 escrituras no es posible desde el cliente (límite de Firestore por lote). La reversión cubre el caso de error, pero si otro admin edita esas colecciones durante el import (segundos), la reversión vuelve sus cambios al estado leído al empezar. Mitigación posible: avisar que no se use el panel mientras se importa; o, para una base mucho más grande, un import del lado del servidor. No urge con el tamaño actual (~1.100 registros, 3 lotes).

Acción del dueño requerida: ninguna (no hay cambios de reglas ni de functions). Sale con el merge a `main`.
