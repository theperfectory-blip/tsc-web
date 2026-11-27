# LECT · Menos lecturas de Firestore sin esconder nada (v2.5)

Fecha: 2026-11-27. Rama `dev` (worktree `emparejar-80`). Alcance: código,
emuladores y sandbox. No se hizo commit, push ni deploy, y no se escribió nada
en producción (las dos lecturas contra producción fueron las del snapshot que
ya estaba en `sandbox/`, del 2026-11-26).

Continúa `docs/reportes/LECTURAS-T5.md` (recomendaciones 1 y 3 del §9; la 6
queda apuntada, sin hacer). Todo lo de la temporada actual sigue visible igual
que antes; una visita lee uno o dos documentos en vez de cientos, y un
resultado corregido se ve en segundos sin recargar ni correr ningún partido.

## Resumen

- **Recorrido público profundo (calendario, historial): 1 070 → 197 lecturas
  (−82 %).** La portada: **633 → 197 (−69 %)**. Admin → Historial: **1 072 →
  200**. Admin → Datos: **1 497 → 1 115** (lo que queda es `coins` y
  `matchHistory` contados por `renderDBInfo`, recomendación 6 de LECTURAS-T5,
  fuera de este encargo).
- **`matches` entera (437) → `resumenes` 1 documento por temporada**;
  **`matchHistory` entera (437) → 0** en calendario, historial y panel.
  `teamNamesMigratedToIds` deja de leer `matches` en cada arranque.
- El resumen lo mantiene una **Cloud Function** por partido, más una
  programada diaria y una callable «Rehacer resumen» (botón en Admin → Datos).
- **Luis corrige un resultado → la vista pública (otra pestaña, sin recargar)
  lo recibe en ~2,4 s** y repinta una sola vez. Medido en el sandbox.
- **El Historial sale idéntico**: mismo multiconjunto de 3 263 filas y el mismo
  orden de pantalla, con los mismos ids y `createdAt`.
- Proyección con el método de LECTURAS-T5 §7 (38 equipos, 50 000 lecturas
  gratis/día): **USD 2,50/mes → ~USD 0,33/mes (≈ CLP 310, −87 %)**.

## 1. Qué cambió

### 1.1 Bandera de la migración de nombres a IDs (`tsc-src/js/ui-utils.js`)

`migrateTeamNamesToIds` ahora sigue el patrón de las otras migraciones:
bandera `teamNamesMigratedToIds` en `settings`, escrita **solo si la migración
termina bien**. Con la bandera puesta no se leen `matches` ni `phases`.

Además, corre **solo con sesión de admin**: es la única que puede escribir en
`matches`/`phases` y en `settings` (la regla de `settings` es `isAdmin()`). Un
anónimo o un presidente no leen nada. Si algo falla, `_bootStep` lo registra y
el arranque sigue; se reintenta en la próxima visita. La bandera la deja el
primer arranque de un admin después del deploy.

### 1.2 Resumen de partidos por temporada (`LECT §2`)

**Colección nueva `resumenes`**, un documento por temporada no archivada:

```
resumenes/matches_<número> = {
  season, count, updatedAt,
  items:     { "<id de partido>": { ...partido... } },   // mapa, nunca lista
  historial: { "<id de partido>": { id, createdAt } },   // id de su fila de matchHistory
}
```

- `items` guarda el documento del partido **completo** (los mismos campos que
  hoy leen calendario, panel, bracket, playoff, standings, ticker, perfil,
  export y la migración), así que el cliente devuelve exactamente los mismos
  objetos.
- `historial` guarda el id y `createdAt` del registro de `matchHistory` de cada
  partido. Es lo que permite que el Historial conserve **ids y orden** sin leer
  `matchHistory` (ver 1.3). Una temporada de 437 partidos ocupa **159 KB**;
  extrapolado a 505, **183 KB** (límite de Firestore: 1 MiB por documento).
- `resumenes/matches_0` es el cajón de partidos sin temporada (el cliente los
  suma siempre, como hacía con `!m.season`).

**Cloud Function (`functions/lib/matchSummary.js`, exportada en
`functions/index.js`):**

- `onMatchWritten` — `onDocumentWritten('matches/{id}')` en
  `FIRESTORE_REGION` (la del Firestore, como `onMatchWentLive`). Actualiza o
  borra **solo la entrada** de ese partido (campos anidados
  `items.<id>`/`historial.<id>`), en transacción, y la quita de la temporada
  vieja si el partido cambió de temporada. Si el partido tiene resultado y no
  está en vivo, refresca también `historial` desde `matchHistory`
  (1 lectura por partido). Si la temporada no está en `season`, la resuelve por
  fase → competición.
- `rebuildMatchSummaryDaily` — programada diaria (04:00 de Chile) que rehace el
  resumen de todas las temporadas no archivadas. Red de seguridad por si se
  pierde un trigger.
- `rebuildMatchSummary` — callable **solo admin** (valida el rol contra
  `users/{uid}`, nunca un flag del cliente). Arma el resumen de cero desde
  `matches` (y los ids desde `matchHistory`), borra los resúmenes de temporadas
  archivadas o sin partidos y devuelve `{seasons, matches}`.

**Cliente (`tsc-src/js/db.js`):**

- `dbGetAll('matches', filtro)`, el espejo y `dbSubscribe('matches')` leen los
  resúmenes: **un documento por temporada no archivada** en vez de la colección.
  El mapa se aplana en una lista con el mismo orden que Firestore (id como
  texto) y se le suman las temporadas archivadas como siempre.
- `initDB` preabre el espejo de `resumenes` (1 lectura por temporada) y ya no
  el de `matches`.
- **Si el resumen no existe o falla** (camino anterior al primer «Rehacer
  resumen», sin conexión, permiso denegado) se cae a la lectura actual de la
  colección: nunca a datos vacíos. `dbSubscribe` comparte el espejo de la
  colección (una sola lectura, como antes) y cambia al del resumen en cuanto
  aparece.
- `dbGet('matches', id)` y todas las escrituras siguen yendo al documento.
- **Overlay de escrituras propias** (`_SUMMARY_MATCH_WRITES`): anota cada
  `dbPut/dbAdd/dbAddMany/dbPut/dbDelete/dbDeleteMany/dbWriteBatch` de `matches`
  de este cliente y lo aplica sobre el resumen mientras la Function no llegó
  (1-2 s). Sin esto, la propagación de bracket (`_syncOwnBracketRounds`), la
  tabla de posiciones o el re-render inmediato después de guardar verían el
  valor viejo. Cada entrada se descarta sola cuando el resumen ya trae el mismo
  contenido, o a los 15 min.
- `dbArchivedRows(store)`: filas del archivo de temporadas archivadas, sin
  tocar Firestore (las usa el Historial).
- `dbMatchHistoryMeta()`: el mapa `historial` de los resúmenes, o `null` si el
  resumen no está disponible.
- `dbPurgeArchivedSeason` borra también el resumen de la temporada liberada
  (antes de anotarla en `archive/seasons`, porque después las reglas ya no
  admiten escrituras de esa temporada).

**Panel admin (`tsc-src/js/data.js`):**

- Tarjeta «Resumen de partidos» en Admin → Datos, con el botón **«Rehacer
  resumen de partidos»** (ícono Lucide, `data-onclick`, sin emojis),
  confirmación y toast. Llama a la callable sin temporada (todas las no
  archivadas).
- Después de un import de backup se rehace el resumen (best-effort: si falla,
  el import no se rompe y los triggers lo alcanzan).

**Reglas (`firebase/firestore.rules`):** solo se agregó el bloque nuevo.

```
match /resumenes/{id} { allow read: if true; allow write: if isAdmin() && seasonOpen('season'); }
```

Lectura pública como `matches`; escritura del cliente solo admin y nunca de una
temporada archivada (la Function usa el SDK de admin y no pasa por reglas).

**Tests (`functions/test/rules-suite.js`):** `resumenes` entra en la lista de
colecciones del torneo (anónimo lee/lista, presidente y demás no escriben,
admin crea/modifica/borra) y en los casos de temporada archivada (la 9 no se
puede crear, modificar ni borrar).

### 1.3 Historial desde los partidos (`LECT §3`, `tsc-src/js/history.js`)

`_getResolvedRecords()` y `_computeHistoricalStandings()` ya no leen
`matchHistory` entera: llaman a `_histLiveRecords()`, que arma las filas así:

- **Temporadas archivadas**: las filas congeladas del archivo
  (`data/temporadas/<n>.json`), 0 lecturas. Son las mismas que antes.
- **Temporadas no archivadas**: una fila por partido con resultado y fuera de
  vivo. `golesA/golesB/penA/penB` salen del partido; `id`, `createdAt` y
  `seasonRef` de los metadatos `historial` del resumen. Si a un partido le
  falta el metadato (Function atrasada) se usa un id sintético estable
  (`1000000 + id`) hasta que el resumen lo traiga.
- **Si el resumen no está disponible** (recién desplegado, sin conexión) se cae
  a la lectura de siempre de `matchHistory` para no mostrar otro historial.
- `resolveHistoryRecord` ya no intenta congelar campos de una fila armada desde
  el partido (su id podría ser sintético y crearía un registro duplicado en
  `matchHistory`). Las filas que sí vienen de `matchHistory` se congelan como
  antes.

Igual que hoy, un partido **en vivo** no aparece en el historial (su registro
se crea al finalizarlo).

## 2. Lecturas antes y después

Método: `scripts/emu-probe.mjs` + `localhost:3001/probe.html`
(`window.__PROBE__.report()`), igual que LECTURAS-T5 §1. Cada número es una
**visita fría** (arranque completo incluido). Las páginas admin se midieron con
sesión de admin (la que restaura el arranque) y las públicas como anónimo. Antes
de **cada** visita se borró `teamNamesMigratedToIds` para que la migración de
nombres a IDs corra en todos los arranques, como corría antes del cambio (con la
bandera puesta, que es el estado normal después del primer admin, se ahorran las
2 lecturas de `users` de la migración).

Escenario del sandbox (emuladores, copia de producción del 2026-11-26): 69
equipos, T3 archivada en `data/temporadas/1.json` (437 partidos y 437
historiales, 6 competiciones, 12 fases, 53 etiquetas, 61 eventos de sorteo) y
**la T3 copiada como temporada 2 activa** en Firestore con los ids corridos
(437 partidos, 437 historiales). Es el caso realista de temporada en curso.

| Visita (fría) | Antes | Después | Diferencia |
|---|---:|---:|---:|
| Portada / Palmarés (anónimo) | 633 | 197 | −436 (−69 %) |
| Calendario (anónimo) | 1 070 | 197 | −873 (−82 %) |
| Historial (anónimo) | 1 070 | 197 | −873 (−82 %) |
| Admin → Dashboard | 635 | 200 | −435 (−69 %) |
| Admin → Historial | 1 072 | 200 | −872 (−81 %) |
| Admin → Calendario | 635 | 200 | −435 (−69 %) |
| Admin → Datos | 1 497 | 1 115 | −382 (−26 %) |

Composición de la portada después (197): `teams` 69, `calDayLabels` 53,
`palmares` 39, `phases` 12, `settings` 9, `competitions` 6, `palmares-comps` 5,
`seasons` 2, **`resumenes` 1**, `sorteo` 1. Antes esa misma visita pagaba además
**`matches` 437**. El calendario y el historial agregaban **`matchHistory` 437**;
ahora agregan 0. Las páginas admin suman `users` 2 y `usernames` 1 (el perfil y
el backfill del arranque; no cambian).

Admin → Datos sigue en 1 115 porque `renderDBInfo()` lee `coins` (478) y
`matchHistory` (437) solo para mostrar contadores: es la recomendación 6 de
LECTURAS-T5 y quedó fuera de este encargo.

Nota de método: en las visitas admin, el arranque monta o no la sección pública
de calendario según la carrera del scroll, y eso agrega o quita 53 lecturas
(`calDayLabels`). Las dos columnas comparan corridas con el mismo montaje; en
una corrida sin esas 53, Admin → Datos da 1 550 → 1 062 y el resto no cambia.

**Proyección mensual** con los supuestos de LECTURAS-T5 §7 (18 días normales y
12 de directo; 50 000 lecturas gratis por día; USD 0,03 por 100 000; 38 equipos
con 505 partidos) aplicando los factores medidos (portada 0,31×, recorrido
profundo 0,18×, editor ~0,62×, sesión admin ~0,76×):

| Escenario | Lecturas/mes | USD/mes | CLP/mes |
|---|---:|---:|---:|
| LECTURAS-T5 (38 equipos, sin LECT) | 9 824 400 | 2,50 | 2 372 |
| Con LECT (estimado) | ~2 586 000 | ~0,33 | ~310 |

La mayor parte de lo que queda es el editor de mejoras (`coins` entera) y
`renderDBInfo`, no el torneo.

## 3. Pruebas en el sandbox

Con la Function y el trigger activos en el emulador (`emu-start.mjs
--functions`), sobre la temporada 2 de 437 partidos:

1. **Contenido del resumen exacto**: 437/437 entradas idénticas a su documento
   de `matches` (comparación canónica campo por campo) y 437/437 metadatos con
   el mismo `id` y `createdAt` que su fila de `matchHistory`.
2. **Luis (admin) corrige un resultado** (el mismo lote que usa
   `saveEditResult`: partido + historial): la lectura inmediata ya trae el
   marcador nuevo (overlay); la Function deja `items.<id>` con el marcador nuevo
   en el resumen; **una pestaña pública con la página de Calendario abierta, sin
   recargar, recibió el cambio por el listener del resumen en 2,4 s y repintó
   una sola vez**.
3. **Agregar un partido** (`dbAdd('matches', …)`): aparece en la lectura
   inmediata y, en ~1 s, en el resumen.
4. **Borrar ese partido**: desaparece de la lectura inmediata y del resumen.
5. **«Rehacer resumen»** (la callable, con sesión admin): devuelve
   `{seasons:[{season:2,matches:437,historial:437}], matches:437}` y deja el
   documento **con el mismo contenido** (comparación canónica sin `updatedAt`).
6. **Historial idéntico**: `_getResolvedRecords()` antes (código anterior) y
   después (código nuevo) sobre el mismo snapshot → **3 263 filas en los dos
   casos, mismo multiconjunto (mismos ids, `createdAt`, `matchRef`, `seasonRef`
   y todos los campos resueltos) y mismo orden de pantalla** (`_sortDesc`, id
   descendente). El diff queda vacío. Como la tabla histórica es una agregación
   pura de esas mismas filas, también queda idéntica.
7. **Camino sin resumen**: borrando `resumenes/matches_2` las lecturas vuelven
   exactamente a las de antes (portada 633; calendario e historial 1 070, con
   `matches` 437 leída una sola vez y `matchHistory` 437) y el Historial
   resuelto sale idéntico (3 263 filas, mismo multiconjunto y mismo orden de
   pantalla). Al reaparecer el documento, la visita siguiente usa el resumen.
8. **Partido que cambia de temporada** (escritura directa al emulador): se
   quita del resumen de la temporada vieja y aparece en el de la nueva; al
   borrarlo desaparece también de la nueva.

## 4. Comprobaciones

| Comprobación | Resultado |
|---|---|
| `node --check` de `db.js`, `history.js`, `data.js`, `ui-utils.js`, `functions/index.js`, `functions/lib/matchSummary.js`, `functions/test/rules-suite.js` | OK |
| `npm run test:emulator` (desde `functions/`, con `JAVA_TOOL_OPTIONS` y `FUNCTIONS_DISCOVERY_TIMEOUT=60`) | OK (código de salida 0) |
| `npm run test:rules` (rules-teams + rules-suite + rules-pes5) | **447/447** casos OK (33/33 y 114/114 en las otras dos) |
| `node scripts/audit-wiring.mjs` | **rotos 0** (no definidas 0 · sin window 0 · fuera de gramática 0 · muertas 9 · duplicados 9 · IDs 3) y `docs/reportes/MS-2.3-cableado.md` regenerado |
| `node scripts/build-web.mjs` | dist generado · 12 scripts · 0 errores de carga |
| `node scripts/smoke-parity.mjs` | **PARIDAD: OK** |
| `node scripts/csp.mjs --check` | firebase.json OK (2 headers con CSP) |

Nota del entorno: el emulador de Functions no arranca en esta máquina con el
timeout de descubrimiento por defecto (10 s); con
`$env:FUNCTIONS_DISCOVERY_TIMEOUT=60` carga bien. No hace falta para los tests
de reglas ni para el emulador de Firestore.

## 5. Qué hay que desplegar y en qué orden

No hay índices nuevos (el trigger consulta `matchHistory` por `matchRef`, un
campo único: índice automático). Nada de la APK cambia de versión.

1. **Cloud Functions** — `firebase deploy --only functions` (en Windows, antes:
   `$env:FUNCTIONS_DISCOVERY_TIMEOUT=60`). Publica `onMatchWritten`,
   `rebuildMatchSummary` y `rebuildMatchSummaryDaily`. La programada usa Cloud
   Scheduler en `southamerica-east1`; si la API no está habilitada, el deploy lo
   pide. La callable queda en `southamerica-east1`, que ya está en el
   `connect-src` de la CSP.
2. **Reglas** — `firebase deploy --only firestore:rules`. Sin esto el cliente
   no puede leer `resumenes`; no rompe nada (cae a la lectura de la colección),
   pero no hay ahorro.
3. **Hosting** — merge a `main` (el CI construye y despliega) o
   `firebase deploy --only hosting`. Recién acá el cliente usa el resumen.
4. **Crear el primer resumen en producción**: entrar como admin a
   **Admin → Datos → «Rehacer resumen de partidos»** (confirmar). Tarda unos
   segundos y no cambia ningún partido ni resultado. Alternativa: esperar la
   programada de las 04:00. Después de eso, cada visita pública lee 1 documento
   de `resumenes` en vez de la colección `matches`.
5. Verificar: abrir la portada, el calendario y el historial y comprobar que se
   ven igual; corregir un resultado y ver que la vista pública cambia en
   segundos sin recargar.

Orden recomendado: 1 → 2 → 3 → 4. Si se invierte 3 y 4, el sitio sigue
funcionando con las lecturas de antes hasta que exista el resumen.

Para archivar una temporada no hay nada nuevo: «Liberar Firestore» sigue igual
y además borra el resumen de esa temporada.

## 6. Límites y siguientes pasos

- **`historyRecordFor` sigue leyendo `matchHistory` entera** al guardar o
  editar un resultado (para saber si el registro ya existe y qué id usar). Es
  una lectura por sesión de edición (el espejo la memoiza 3 min), no por
  visita. Se puede cambiar por una consulta `where('matchRef','==',id)` (1
  lectura) o por los metadatos del resumen; no se tocó para no ampliar el
  alcance de este encargo.
- **`renderDBInfo()`** (Admin → Datos) sigue leyendo `coins` (478) y
  `matchHistory` (437) solo para pintar contadores: LECTURAS-T5 §9.6.
- **El sorteo** (`js/sorteo.js`) todavía lee `matchHistory` al resolver el
  historial de sus partidos. No es una visita del torneo y quedó fuera.
- **Carrera del rebuild diario**: si un partido cambia justo entre la lectura y
  la escritura del rebuild, esa entrada puede quedar un instante atrás hasta el
  siguiente cambio o el rebuild del día siguiente. La ventana es la de un
  `get()` de la colección a las 04:00, con el torneo cerrado.
- **Metadatos de historial sintéticos**: si el resumen existe pero a un partido
  le falta su entrada en `historial` (por ejemplo, un resultado escrito con la
  Function caída), el Historial lo muestra con id `1000000 + id de partido`
  hasta que el resumen se actualice o se pulse «Rehacer resumen». Se prefiere
  eso a leer `matchHistory` entera por una visita.
- **Temporadas cerradas sin archivar**: se resuelven desde el partido (nombres
  actuales) en vez de los campos congelados de `matchHistory`. Con la disciplina
  de archivar al cerrar (LECTURAS-T5 §9.2) esas temporadas se sirven del
  archivo, que sí trae las filas congeladas.
- **Tamaño**: 159 KB por temporada de 437 partidos (183 KB con 505). El límite
  de un documento es 1 MiB; si una temporada llegara a ~2 500 partidos habría
  que partirla en más de un documento por temporada.
- Los triggers de Firestore no comparten la transacción del cliente: el resumen
  va 1-2 s atrás y eso lo cubre el overlay local. Con la Function sin desplegar
  no hay resumen y todo sigue funcionando con las lecturas de antes.
