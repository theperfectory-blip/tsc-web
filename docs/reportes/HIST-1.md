# HIST-1 · Lecturas del historial por cambio de filtro

Rama: `fix/lecturas-historial` (desde `origin/main` 1f24ae6, PR #18).
Archivo tocado: `tsc-src/js/history.js`.

## Problema

Cada cambio de filtro del historial (`histSetFilter`, `histSetSearch`,
`histClearFilters`, `histShowMore`, y el de posiciones) llama a
`_getResolvedRecords()`. Esa función resolvía cada registro live con
`resolveHistoryRecord`, que hacía `dbGet` directo de su partido, su fase y su
competición. `dbGet` solo usa el espejo en memoria si la colección ya está
espejada y fresca; si no, cada llamada va al servidor. Como ni `matches` ni
`phases` ni `competitions` tenían listener abierto por el historial, cada
cambio de filtro pagaba una lectura por partido, por fase y por competición.

## Cambio

- `_histLoadCtx()`: carga en lote `matches`, `phases`, `competitions`,
  `teams` y `seasons` con `dbGetAll`. El espejo se abre una vez y después la
  resolución es en memoria (mapas por id).
- `resolveHistoryRecord(h, ctx)`: si recibe `ctx`, resuelve desde los mapas;
  sin `ctx` mantiene el camino anterior (sin cambios de comportamiento).
- `_getResolvedRecords` y `_computeHistoricalStandings` construyen un único
  `ctx` por llamada y lo pasan a todos los registros live.
- Sin listeners nuevos: `dbGetAll` reutiliza el espejo existente.

No se agregó una caché de registros resueltos entre llamadas. Con el
contexto en memoria el costo de lectura ya es cero, y una caché habría
necesitado su propia invalidación (escrituras de partidos, fases, equipos y
temporadas) sin ganar lecturas. Si Jimbo la quiere igual, es un cambio aparte.

## Verificación

### A/B de salida (sandbox)

Se guardó `JSON.stringify({ recs: _getResolvedRecords(), stand:
_computeHistoricalStandings() })` con el código original y se comparó con el
código nuevo, en `tsc-emu` (fuente) y en `tsc-emu-dist` (build dist).

| Variante | Caracteres | Igual al original |
|---|---|---|
| Original (línea base) | 627.169 | — |
| Nuevo · tsc-src (3001 vía `serve`) | 627.169 | sí |
| Nuevo · dist (3001 vía `emu-dist`) | 627.169 | sí |

Tras cinco cambios de filtro seguidos, la salida nueva sigue igual a la base.
Sin errores en consola (dist).

### Lecturas por cambio de filtro

Medido con `window.__PROBE__` (`scripts/emu-probe.mjs`, `probe.html`). Espejos
de `matches`, `phases` y `competitions` cerrados antes de medir, que es el
estado en que el historial se usaba en producción.

| Cambio de filtro | Antes | Después |
|---|---|---|
| fTemp = T1 | 1.311 | 0 |
| fTemp = T2 | 1.311 | 0 |
| fTemp = vacío | 1.311 | 0 |
| fJuego = PES 4 | — | 0 |
| fJuego = vacío | — | 0 |

Antes, cada uno de los 1.311 `gets` era un `matches/*`, `phases/*` o
`competitions/*` distinto (un registro por partido, fase y competición). Con
el espejo ya abierto, la versión original daba 0, así que el problema solo
aparecía con el espejo cerrado (por inactividad de 3 min o por caché sin
servidor).

Nota de medición: el probe cuenta `docChanges` de los snapshots que no vienen
de caché y los `get()` directos. En la primera apertura del espejo el SDK
resolvió desde su caché local y el probe no contó lecturas. Es una
aproximación: la primera apertura cuesta como mucho el tamaño de esas
colecciones (unos 455 documentos en el sandbox) y solo se paga una vez por
espejo.

### Checks de cierre

- `node scripts/smoke-parity.mjs`: PARIDAD OK (0 diferencias).
- `node scripts/audit-wiring.mjs`: rotos 0, fuera de gramática 0, duplicados 0,
  IDs 1, muertas 3. Las 3 muertas ya estaban antes del cambio; no se agregó
  ningún handler `data-on*`.
- `node scripts/csp.mjs --check`: firebase.json OK.
- Sin `innerHTML` nuevo, sin emojis, sin `<script>` inline, sin reglas de
  Firestore tocadas, sin secretos.

## Pendientes y limitaciones

- No se probó la vista admin con escritura (`appendOrUpdateHistory` y el
  congelado de campos con `dbPut`). Esa ruta no cambió.
- `_histLoadCtx` pide las cinco colecciones completas en cada llamada. Con el
  espejo abierto es gratis; si el espejo se cierra, la primera llamada lo
  reabre (un costo por espejo, no por filtro).
- Entorno: sandbox creado con `scripts/emu-snapshot.mjs` (GET a producción,
  sin escrituras) y cargado con `emu-seed.mjs --clean`.

## Qué no hace este slice

- No archiva ninguna temporada (eso es Slice A, bloqueado).
- No toca `db.js`, reglas de Firestore ni `yunacoins-rules.js`.
- No se mergea a `main` ni se despliega.
