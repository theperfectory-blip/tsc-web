# MS-2.5 · Espejo en memoria de Firestore · 2026-10-10

Hallazgos: H-18 (verificado, 2 bugs corregidos) y H-29 (corregido).
Todo en el sandbox (`tsc-emu` `:3001` + emuladores). Producción no se tocó.

## Herramienta nueva

`scripts/emu-probe.js` + `scripts/emu-probe.mjs` (solo sandbox): arma
`sandbox/site/probe.html` con una sonda que envuelve el SDK compat y cuenta
listeners abiertos y documentos leídos con la regla de facturación (primer
snapshot = colección entera, después solo los cambios; `get()` = docs
devueltos, mínimo 1). Lectura: `window.__PROBE__.report()`.

## Verificación por punto

| Punto | Resultado |
|---|---|
| (a) Escrituras propias | OK antes y después: `dbPut`, `dbAdd`, `dbAddMany`, `dbDeleteMany` y `dbDelete` se ven en el `dbGetAll` siguiente |
| (b) Escritura desde otra pestaña | OK: un cambio hecho por REST en el emulador llega al espejo y a `dbSubscribe` en menos de 1 s |
| (c) Transacciones | Como está documentado: sin `dbMirrorInvalidate`, el `dbGetAll` inmediato devuelve el dato viejo; con él, el nuevo. El único `runTransaction` fuera de `db.js` (`sorteo.js:686`) ya invalida. Los de `_counters` no afectan porque `_counters` no se espeja |
| (d) Fallback | **Bug 1** (abajo). `permission-denied`: no aplica hoy, todas las colecciones de `STORES` son de lectura pública. Snapshot desde caché: cae a lectura directa |
| (e) Cierre por inactividad | OK: el barrido cierra los espejos sin uso y apaga su timer. Ahora no cierra los que tienen una vista suscrita |
| (f) Login / logout | OK: la cantidad de listeners no cambia y los espejos siguen frescos (no hay colecciones con lectura restringida) |
| (g) Lecturas por visita | **Bug 2** (abajo). Medidas y proyección más abajo |
| (h) H-29 | Corregido (abajo) |

## Bugs corregidos (`tsc-src/js/db.js`)

### 1. Un timeout mataba el espejo y lo reabría en cada lectura

Si el primer snapshot del servidor tardaba más de 10 s, el espejo quedaba
`dead`. Cada `dbGetAll` siguiente lo descartaba, abría **otro listener**
(otra lectura completa de la colección) y volvía a esperar 10 s. Encima, la
lectura directa de respaldo usaba `get()` normal, que sin conexión devuelve
la caché aunque esté vacía, y eso se tomaba como dato real.

Medido sin conexión (`disableNetwork`), colección `coins` (3 registros):

| | Antes | Después |
|---|---|---|
| 3 lecturas seguidas | 10 s cada una, las 3 devuelven `[]` | 10 s la primera, 0 ms las otras; las 3 lanzan `unavailable` |
| Listeners abiertos | 4 | 1 |
| Colección espejada y ya sincronizada (`teams`) | — | Devuelve su última copia completa (62) con aviso en consola |
| Al volver la conexión | — | El mismo listener se sincroniza y se usa (0 ms, 3 registros) |

Cambios:
- El timeout solo destraba la primera lectura: el espejo sigue vivo y se usa
  apenas llega el servidor. `dead` queda solo para errores del listener.
- `_fsGetAllDirect` pide `get({source:'server'})`. Si falla y el espejo
  llegó a sincronizarse (`synced`), devuelve su última copia; si no, lanza.

**Cambio de comportamiento:** sin conexión, `dbGetAll` de una colección
nunca sincronizada ahora **lanza** en vez de devolver `[]`. Es a propósito:
un `[]` falso puede terminar en escrituras malas. Por ejemplo,
`appendOrUpdateHistory` calcula el próximo id de `matchHistory` con el
máximo de lo leído, y con `[]` pisaría un registro existente.

### 2. `dbSubscribe` abría un segundo listener por colección

`live.js` y `sorteo.js` usan `dbSubscribe`, que abría su propio
`onSnapshot` sobre colecciones que el espejo ya escuchaba. Cada una se leía
entera dos veces por visita (`teams`, `palmares`, `palmares-comps`,
`settings`, `sorteo`).

Ahora `dbSubscribe` se cuelga del listener del espejo (`m.subs`) y entrega
el estado actual como primer snapshot, igual que un `onSnapshot` nuevo.
Mantiene el filtro y el dedupe por JSON. Con `TSC_FS_MIRROR = false` usa
un listener propio, como antes.

## H-29 corregido (`tsc-src/js/history.js`)

`appendOrUpdateHistory` ya no escribe si el registro no cambia. Los
registros de `matchHistory` guardan goles, penales y referencias, no
nombres (se resuelven al mostrar). Por eso las 422 reescrituras que hacía
`refreshHistoryForSeason` al guardar un equipo eran **todas idénticas**:
422 de 422 sin cambios, medido.

| Como admin | Antes | Después |
|---|---|---|
| `refreshHistoryForSeason(1)` | ~1,2 s por partido en el emulador: ~8 min | 0,41 s, 0 escrituras |
| `notifyTeamChanged` (guardar un equipo) | ídem | 0,38 s, 0 escrituras |
| Un resultado que sí cambió | Se escribe | Se escribe (verificado y revertido) |

## Lecturas por visita pública (anónimo, sandbox con datos reales)

| | Antes | Después |
|---|---|---|
| Primera carga | 714 docs · 14 listeners | 552 docs · 9 listeners |
| Recorrer las 6 secciones públicas | 1216 docs · 17 listeners | 1102 docs · 12 listeners |

Desglose actual del recorrido completo: `matches` 422, `matchHistory` 422,
`sorteoEvents` 79, `teams` 62, `calDayLabels` 49, `palmares` 38, `phases`
10, `settings` 8, `competitions` 5, `palmares-comps` 5, `seasons` 1,
`sorteo` 1. `matches` sola es el 76 % de la primera carga.

**Proyección.** El sandbox tiene una sola temporada en Firestore (T3: 422
partidos); el historial anterior sale del JSON estático. Si cada temporada
nueva suma cifras parecidas a T3 (≈ 422 `matches`, 422 `matchHistory`,
≈ 80 `sorteoEvents`, ≈ 50 `calDayLabels`, 10 `phases`, 5 `competitions`):

| Temporadas en Firestore | Primera carga | Recorrido completo |
|---|---|---|
| 1 (hoy) | ≈ 550 | ≈ 1100 |
| 3 | ≈ 1520 | ≈ 3080 |
| 5 | ≈ 2500 | ≈ 5050 |

Como referencia, la cuota gratis de Firestore son 50 000 lecturas al día:
hoy alcanza para ~90 primeras cargas o ~45 recorridos completos al día.

## Colecciones a consultar por temporada (prioridad, para M5)

1. **`matches`** (`season`): la más grande y se lee en toda primera carga.
   Panel, calendario, brackets y en vivo solo usan la temporada actual.
   Hoy filtran en el cliente (`getForSeason`). Bloqueo: el historial de
   temporadas pasadas resuelve los registros `live` de `matchHistory` con
   `dbGet('matches', matchRef)`. Va junto con el punto 2.
2. **`matchHistory`** (`seasonRef`): solo la usa Historial y necesita todas
   las temporadas. Propuesta: al finalizar una temporada, congelar sus
   registros con los nombres resueltos (como los `imported` del JSON). Así
   las temporadas cerradas no dependen de `matches`, y `matchHistory` se
   puede consultar por `seasonRef` o paginar.
3. **`sorteoEvents`** (`season`): `sorteo.js` ya filtra por temporada en el
   cliente. Pasa directo a `where('season','==',…)`.
4. **`calDayLabels`** (`season`, `date`): por temporada o por rango de
   fechas.
5. **`phases` / `competitions`**: chicas (10 y 5 por temporada). `phases`
   no tiene `season` (va por `compId`). Prioridad baja.

Seguir espejadas completas: `teams`, `palmares`, `palmares-comps`,
`settings`, `seasons` y `sorteo`. Son globales y chicas.

Para hacerlo, el espejo tiene que pasar a tener una clave por consulta
(colección + temporada) en vez de por colección. Hoy los filtros de
`dbGetAll` son funciones del cliente. Es un cambio de API para M5.

## Verificación

- Sandbox, todos los puntos de la tabla antes y después del cambio. La base
  del emulador se recargó con `emu-seed --clean` al terminar.
- Consola limpia en una carga nueva (`/`, anónimo).
- `node scripts/smoke-parity.mjs`: paridad OK.
- `node scripts/audit-wiring.mjs`: sin handlers rotos nuevos.
- Grafo actualizado (22 comunidades, todas con nombre).

## Acción del dueño requerida

Ninguna. Las reglas no cambiaron.
