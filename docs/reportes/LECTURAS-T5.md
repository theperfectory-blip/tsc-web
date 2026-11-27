# LECTURAS-T5 · Lecturas de Firestore por página y proyección a 38 equipos

Fecha: 2026-11-26. Alcance: medición en el sandbox (emuladores) y solo lecturas
GET contra producción para la copia. No se modificó código de la aplicación ni
se escribió nada en producción. Herramienta: `scripts/emu-probe.mjs` +
`localhost:3001/probe.html` (`window.__PROBE__`, MS-2.5).

## Resumen

- **Hoy la factura de lecturas es baja porque la T3 está archivada**: las
  colecciones de torneo de Firestore están vacías (`competitions`, `phases`,
  `matches`, `matchHistory`, `sorteoEvents`, `calDayLabels` = 0). Una visita
  pública cuesta **124 lecturas** y no depende de la página. La T3 se sirve
  desde `data/temporadas/1.json`, que no genera lecturas de Firestore.
- **Una temporada en curso cuesta ~5 veces más**: con los mismos 34 equipos de
  la T3 dentro de Firestore, la portada cuesta 545 y un recorrido completo
  1 096. Con 38 equipos y el formato de la T3 ampliado a 20 + 18 equipos, la
  portada cuesta **617** y el recorrido completo **1 236** (+15 % sobre 34).
- **El 82 % de la carga inicial es una sola consulta**: `migrateTeamNamesToIds`
  lee la colección `matches` entera (505 documentos) en cada arranque, aunque
  la migración ya esté hecha. Es el mayor ahorro disponible y el de menor
  esfuerzo (una bandera en `settings`, como las otras migraciones).
- **El Historial también es una lectura entera**: `matchHistory` (505) se lee
  al montar Calendario/Historial/Sorteo o al abrir el perfil del presidente.
- **El editor de mejoras del presidente lee `coins` entera** (474), y
  Admin → Datos vuelve a leer `coins` + `matchHistory` (979) solo para mostrar
  contadores.
- Proyección mensual con los supuestos de abajo (18 días normales y 12 de
  directo): **9,8 M lecturas/mes → USD 2,50 ≈ CLP 2 370**. Sin archivar la T3
  serían USD 4,45 (CLP 4 230). Aplicando las tres primeras recomendaciones baja
  a **USD 0,17 ≈ CLP 165** (≈ −93 %).
- Temporadas: la T3 (número 1) está finalizada **y archivada**; la T1 (número
  2) está activa y todavía no tiene competiciones. No hay temporadas
  finalizadas sin archivar.

Precio usado: Firestore Standard, **50 000 lecturas/día gratis** y **USD 0,03
por 100 000 lecturas** en ubicaciones regionales; el proyecto usa
`southamerica-west1` (Santiago). Fuente:
<https://cloud.google.com/firestore/pricing> (consultada el 2026-11-26).

## 1. Método

1. `node scripts/emu-snapshot.mjs`: copia de producción por REST (solo GET) a
   `sandbox/`. Producción en ese momento: 2 temporadas, 69 equipos, 474
   `coins`, 39 `palmares`, 5 `palmares-comps` y **0 documentos de torneo**.
2. Emuladores de Firestore (`:8080`) y Auth (`:9099`) con
   `node scripts/emu-start.mjs`; carga con `node scripts/emu-seed.mjs ... --clean`.
3. `node scripts/emu-probe.mjs` y Chrome headless por CDP contra
   `localhost:3001/probe.html` y `mejoras-probe.html`. Cada visita/acción se
   midió con `__PROBE__.reset()` antes y `report()` después.
4. Roles: anónimo, presidente (`president@emu.test`) y admin
   (`admin@emu.test`), creados por `emu-seed` en el emulador.
5. Tres escenarios medidos:
   - **Hoy**: copia de producción (T3 archivada, T1 vacía).
   - **T3 en Firestore (34 equipos)**: la T3 movida a Firestore como temporada
     actual, sin tocar sus formatos, para tener una referencia de temporada
     llena con el plantel histórico.
   - **38 equipos**: 38 equipos activos, 1ra con 2 grupos de 10 (180 partidos)
     y 2da con 2 grupos de 9 (144), más copa, playoff, supercopa y liga de
     campeones con los formatos de la T3. Total: 505 partidos y 505 registros
     de historial.
6. "Frío" = cargar la aplicación directamente en esa página (incluye el
   arranque y los montajes que dispara el scroll). "Clic desde portada" =
   lecturas incrementales al pulsar esa sección desde la portada, con el
   espejo en memoria ya caliente.

Advertencias de método:

- La sonda cuenta llamadas del SDK y aplica la regla de facturación aproximada
  (primer snapshot de un listener = colección entera; `get()` = documentos
  devueltos, mínimo 1). **No cuenta** las lecturas extra de las reglas de
  seguridad (`isAdmin()`, `me()`, `seasonOpen()`, `notArchived()`, que hacen
  `get()` de `users`, `archive/seasons` o `pes5_config` en cada request), ni
  escrituras, ni `count()`.
- `emu-snapshot` no copia `users` ni las colecciones `pes5_*` (lectura
  restringida). Para poder medir el panel del presidente se sembraron datos de
  prueba en el sandbox: 1 o 38 `pes5_plantillas`, 1 o 38 `pes5_perfiles`, 12 o
  114 `pedidos_pes5`, `pes5_config` y hasta 40 `users`. Los números de esas
  colecciones son del fixture, no de producción; los del torneo (matches,
  matchHistory, calDayLabels, sorteoEvents) sí corresponden a los escenarios.
- `mejoras.html` no lo copia `emu-snapshot`; se copió a `sandbox/site` para
  medirlo. No se tocó `tsc-src/`.
- El sandbox tiene la T3 archivada en `data/temporadas/1.json` (437 partidos,
  437 historiales, 61 eventos de sorteo y 53 etiquetas). Esos datos se leen del
  archivo estático y **no** cuentan como lecturas de Firestore.

## 2. Inventario de colecciones

Documentos en la copia y en el escenario de 38 equipos:

| Colección | Hoy | 38 equipos | ¿Entera por visita? | Dónde |
|---|---:|---:|---|---|
| `seasons` | 2 | 2 | Sí | arranque y todas las páginas |
| `teams` | 69 | 38 | Sí | arranque y todas las páginas |
| `competitions` | 0 | 6 | Sí | arranque, panel y admin |
| `phases` | 0 | 12 | Sí | arranque, panel y admin |
| `matches` | 0 | 505 | Sí | arranque (migración), panel, calendario e historial |
| `matchHistory` | 0 | 505 | Sí | calendario, historial, perfil y admin |
| `coins` | 474 | 474 | Sí | editor del presidente, admin coins y admin datos |
| `calDayLabels` | 0 | 53 | Sí | panel, calendario y admin calendario |
| `sorteoEvents` | 0 | 61 | Sí | sorteo y montaje del recorrido público |
| `sorteo` | 0 | 1 | Sí | arranque y sorteo |
| `palmares` | 39 | 39 | Sí | arranque y palmarés |
| `palmares-comps` | 5 | 5 | Sí | arranque y palmarés |
| `settings` | 9 | 9 | Sí | arranque (banderas de migración) |
| `users` | 2 | 40 | Sí | login y admin (usuarios, equipos, coins, Tool PES5) |
| `usernames` | 2 | 2 | 1 GET por usuario | admin → usuarios (backfill) |
| `pes5_plantillas` | 1 | 38 | 1 doc por equipo | editor de mejoras (3 lecturas del mismo doc) |
| `pes5_perfiles` | 1 | 38 | 1 doc por equipo | editor de mejoras |
| `pedidos_pes5` | 12 | 114 | Solo los del uid | editor y modal de Pedidos |
| `pes5_config` | 3 | 3 | Docs puntuales | editor, Tool y pausa |
| `pes5_bloqueos` | 1 | 1 | Doc por equipo | editor |
| `archive/seasons` | 0 | 0 | 1 doc | admin → temporadas |

En producción `archive/seasons` sí existe (ver punto 9); `emu-snapshot` no lo
copia.

## 3. Lecturas medidas

Valores en formato **hoy / 38 equipos**. "Frío" incluye el arranque completo;
"clic" es lo que agrega entrar a esa sección desde la portada.

### Público

| Página | Anónimo frío | Anónimo clic | Presidente frío | Admin frío |
|---|---:|---:|---:|---:|
| Portada / Palmarés | 124 / 617 | — | 126 / 619 | 127 / 619 |
| Competiciones (panel, fase inicial) | 124 / 670 | 0 / 53 | 126 / 672 | 127 / 672 |
| Cada fase/tabla/bracket/playoff | = panel | 0 / 0 | = panel | = panel |
| Calendario | 124 / 1 236 | 0 / 619 | 126 / 1 236 | 127 / 1 236 |
| Historial (partidos) | 124 / 1 236 | 0 / 619 (505 si no pasó por Calendario) | 126 / 1 236 | 127 / 1 124 |
| Historial (tabla histórica) | = Historial | 0 / 0 | = Historial | = Historial |
| Sorteo | 124 / 617 | 0 / 619 | 126 / 617 | 126 / 617 |
| Equipos | 124 / 1 236 | 0 / 619 | 126 / 1 236 | 127 / 1 236 |

En el escenario de 38 equipos, cualquier sección posterior a Competiciones
termina costando el recorrido completo (1 236) porque el sitio público es un
solo scroll y el foco monta las secciones anteriores. La diferencia entre
"Calendario", "Equipos", "Sorteo" e "Historial" es de orden, no de datos: el
primero que se monta paga `matchHistory`, `sorteoEvents` y `calDayLabels`.

Cada fase del panel se probó una por una (6 competiciones, 12 fases: grupos,
brackets, playoff y supercopa). Después del primer montaje del panel, pasar de
una fase a otra agrega **0 lecturas**: `matches`, `phases` y `teams` ya están
en el espejo.

### Presidente

| Página / acción | Hoy | 38 equipos |
|---|---:|---:|
| Portada como presidente | 126 | 619 |
| Abrir el perfil (panel del presidente) | +0 (sin historial activo) | +505 (`matchHistory`) |
| Editor de mejoras (`mejoras.html`) | 638 | 1 107 |
| Formación (modal) | +0 | +0 |
| Pedidos / YunaCoins (modal) | +12 (fixture de 12 pedidos) | +1 incremental (3 pedidos del fixture) |

El editor de mejoras es la visita más cara del rol: 1 107 lecturas, de las
cuales **474 son `coins` entera** y 505 vienen del arranque (`matches`). La
plantilla del equipo se lee **3 veces** en la misma visita y los documentos de
`pes5_config` se leen de a uno.

### Admin

| Página | Hoy frío | 38 frío | Clic hoy / 38 |
|---|---:|---:|---:|
| Dashboard | 127 | 619 | — |
| Equipos | 128 | 659 | +2 / +40 (`users`) |
| Usuarios | 130 | 699 | +4 / +80 (`users` + `usernames`) |
| Competiciones | 126 | 619 | 0 / 0 |
| Fases | 126 | 619 | 0 / 0 |
| Partidos | 126 | 619 | 0 / 0 |
| Calendario | 126 | 672 | 0 / +53 |
| Sorteo | 126 | 619 | 0 / 0 |
| YuNaCoins | 129 | 659 | +2 / +40 (`users`) |
| Historial | 127 | 1 124 | 0 / +505 |
| Tabla histórica | 127 | 1 124 | 0 / 0 |
| Palmarés | 127 | 619 | 0 / 0 |
| Temporadas | 128 | 620 | +1 / +1 (`archive/seasons`) |
| Datos | 601 | 1 598 | +474 / +474 (`coins`; +505 si no se leyó historial) |
| Tool PES5 | 135 | 665 | +8 / +46 (`users` + `pes5_config`) |

Una sesión completa de admin (dashboard → equipos → usuarios → calendario →
historial → coins → Tool PES5) suma **1 737** en el escenario de 38 equipos:
619 del arranque + 40 `users` + 40 `usernames` + 53 `calDayLabels` + 505
`matchHistory` + 474 `coins` + 6 `pes5_config`.

## 4. Desglose de las visitas principales (38 equipos)

| Visita | Total | Composición |
|---|---:|---|
| Carga inicial (cualquier página) | 617 | `matches` 505, `teams` 38, `palmares` 39, `phases` 12, `settings` 9, `competitions` 6, `palmares-comps` 5, `seasons` 2, `sorteo` 1 |
| Recorrido público completo | 1 236 | carga inicial + `matchHistory` 505 + `sorteoEvents` 61 + `calDayLabels` 53 |
| Editor de mejoras (presidente) | 1 107 | 619 de arranque con sesión + `coins` 474 + `pes5_plantillas/1` 3 + `pedidos_pes5` 5 + `pes5_config` 4 + `pes5_perfiles` 1 + `pes5_bloqueos` 1 |
| Admin → Datos | 1 598 | 619 de arranque + `coins` 474 + `matchHistory` 505 |
| Admin → Historial | 1 124 | 619 de arranque + `matchHistory` 505 |
| Admin → Usuarios | 699 | 619 de arranque + `users` 40 + 40 GET de `usernames` (documentos que no existen; cada uno cobra 1) |
| Panel de competiciones | 670 | 619 de arranque + `calDayLabels` 53 |

## 5. Las cinco páginas/consultas que más leen

Páginas (frío, 38 equipos):

| # | Página | Lecturas |
|---|---|---:|
| 1 | Admin → Datos | 1 598 |
| 2 | Calendario / Equipos / Sorteo / Historial (recorrido completo) | 1 236 |
| 3 | Admin → Historial | 1 124 |
| 4 | Editor de mejoras (presidente) | 1 107 |
| 5 | Admin → Usuarios | 699 (Panel de competiciones: 670) |

Consultas (una sola llamada):

| # | Consulta | Lecturas | Peso |
|---|---|---:|---|
| 1 | `matches` entera en el arranque (`migrateTeamNamesToIds`) | 505 | 82 % de la carga inicial |
| 2 | `matchHistory` entera al montar historial/calendario/perfil | 505 | 41 % del recorrido completo |
| 3 | `coins` entera en el editor y en Admin → Datos | 474 | 43 % del editor |
| 4 | `coins` + `matchHistory` en Admin → Datos | 979 | extra de esa página |
| 5 | `users` + `usernames` en Admin → Usuarios / Tool PES5 | 80 | 11 % de esa página |

## 6. Qué colecciones crecen con la temporada

| Colección | Crecimiento | Efecto |
|---|---|---|
| `matches` | +505 por temporada de 38 equipos (+437 con 34) | Se lee entera en cada arranque y en panel/calendario/historial/admin |
| `matchHistory` | +505 por temporada | Se lee entera en cada recorrido profundo y en el perfil |
| `coins` | +1 por movimiento; hoy 474 para 38 equipos | Se lee entera en el editor y en admin datos/coins |
| `calDayLabels` | +1 por fecha con texto; 53 por temporada | Se lee entera en panel y calendario |
| `sorteoEvents` | +1 por bola sorteada; 61 por temporada | Se lee entera al montar el sorteo |
| `phases` / `competitions` | +12 / +6 por temporada | Chicas, pero entran en la carga inicial |
| `teams` | Global; 69 documentos hoy, 38 activos en el escenario | Se lee entera en cada visita |
| `palmares` | +1 por título | 39 hoy; lento |
| `users` / `usernames` | +1 por cuenta/equipo | Admin; `usernames` cobra 1 por usuario aunque no exista |
| `pes5_plantillas` / `pes5_perfiles` | 1 por equipo / 1 por equipo y temporada | Editor y Tool |
| `pedidos_pes5` | 1 por pedido | Consulta por uid; crece durante la temporada |

Sin archivar, cada temporada vieja sigue en Firestore y **todos** esos crecimientos
se pagan en cada visita. La T3 archivada demuestra el efecto contrario: sus 437
partidos y 437 historiales hoy cuestan 0 lecturas de Firestore.

## 7. Proyección de costo

Supuestos explícitos:

- 18 días de temporada normal y 12 días de directo al mes (3 directos/semana).
- Día normal: 200 visitas públicas (70 % solo portada, 30 % recorrido
  completo), 16 presidentes que abren el editor y 2 sesiones de admin.
- Día de directo: 600 visitas públicas (60 % portada, 40 % recorrido completo),
  20 presidentes y 3 sesiones de admin.
- Sesión de admin completa: 1 737 lecturas (38 equipos).
- Precio: USD 0,03 por 100 000 lecturas; 50 000 gratis por día. Cambio
  referencial USD 1 ≈ CLP 950.

| Escenario | Lecturas/día normal | Lecturas/día directo | Lecturas/mes | USD/mes | CLP/mes |
|---|---:|---:|---:|---:|---:|
| Hoy (T3 archivada) | 36 218 | 88 975 | 1 719 624 | 0,14 | 133 |
| T3 en Firestore (34 equipos) | 161 786 | 484 689 | 8 728 416 | 2,17 | 2 060 |
| **38 equipos (proyección)** | **181 726** | **546 111** | **9 824 400** | **2,50** | **2 372** |
| 38 equipos sin archivar la T3 | 297 094 | 915 813 | 16 337 448 | 4,45 | 4 229 |
| 38 equipos con las 3 primeras recomendaciones | 32 006 | 98 149 | 1 753 896 | 0,17 | 165 |

La estimación de "hoy" (CLP 133 solo en lecturas) es coherente con la factura
actual de CLP 235: el resto son otras operaciones o servicios. La proyección a
38 equipos multiplica por ~18 la lectura actual, y **sin archivar la T3 casi se
duplica** respecto de la proyección con archivo.

Sensibilidad (38 equipos, mismos roles):

| Visitas públicas/día normal | Visitas/día de directo | USD/mes | CLP/mes |
|---:|---:|---:|---:|
| 100 | 300 | 1,13 | 1 074 |
| 200 | 600 | 2,50 | 2 372 |
| 400 | 1 200 | 5,23 | 4 971 |

Cada 10 000 lecturas extra al mes cuestan USD 0,003 (CLP ~3). El costo es
lineal por encima de las 50 000 diarias.

## 8. Temporadas finalizadas y archivadas (solo lectura)

Producción (`GET` REST):

- `seasons`: **T3** (`number: 1`, `status: finished`, finalizada el
  2026-11-11) y **T1** (`number: 2`, `status: active`).
- `archive/seasons`: `numbers: [1]`, `compIds: [6,7,8,9,10,11]`,
  `updatedAt: 2026-11-17`. Es decir, la T3 está marcada como archivada y sus
  competiciones también.
- Firestore: `competitions`, `phases`, `matches`, `matchHistory`,
  `sorteoEvents` y `calDayLabels` están vacías; la T3 ya se liberó de
  Firestore.
- `data/temporadas/index.json`: temporada 1 = T3, archivo `1.json`, con 6
  competiciones, 12 fases, 437 partidos, 437 historiales, 4 coins, 1 sorteo,
  61 eventos y 53 etiquetas. `data/temporadas/1.json` existe y se carga desde
  el hosting; `--verify` ya validó sus huellas (MS-5.14–5.16).

Conclusión: **no hay temporadas finalizadas sin archivar**. La única
finalizada (T3) está archivada y liberada. La T1 está activa y todavía sin
competiciones. `archive/seasons.compIds` sigue listando 6–11; no molesta
mientras las competiciones nuevas usen ids mayores (el contador no se reinicia
al liberar).

## 9. Recomendaciones, ordenadas por ahorro/esfuerzo

Los ahorros mensuales usan los supuestos del punto 7 (11 400 sesiones/mes:
3 924 en días normales y 7 476 en días de directo). No se suman entre sí
porque comparten lecturas.

### 1. Encerrar `migrateTeamNamesToIds` detrás de una bandera (esfuerzo bajo)

Es la migración que lee `matches` entera (505) en **cada** arranque, en todos
los roles y en todas las páginas. Las otras migraciones (`syncTeamPreviousNames`,
`migrateTeamsV3MergeDiablos`, `migratePalmaresV4…`) ya usan una bandera en
`settings`. La de nombres a IDs no. Con una bandera `teamNamesMigratedToIds`
(el mismo patrón), después de la primera ejecución se dejan de leer `matches`
(505) y `phases` (12).

- Ahorro: 505–517 lecturas por sesión; ~5,8 M/mes.
- **USD 1,73/mes (CLP ~1 640), ≈ 69 % de la proyección.**
- Riesgo: bajo (la migración ya corrió; la bandera debe escribirse solo si
  termina bien). Es el cambio con mejor relación ahorro/esfuerzo.

### 2. Archivar cada temporada al finalizarla (esfuerzo bajo; ya implementado)

Mantener la disciplina de `season-archive.mjs` + "Liberar Firestore". Cada
temporada que quede en Firestore agrega ~1 003 lecturas a un recorrido
completo (437 `matches` + 437 `matchHistory` + 61 `sorteoEvents` + 53
`calDayLabels` + fases y competiciones) y ~512 a una visita que solo mira la
portada.

- Ahorro: ~7,54 M lecturas/mes **por cada temporada que se evita dejar en
  Firestore**.
- **USD 2,26/mes (CLP ~2 150) por temporada no archivada.** Es el mayor
  ahorro estructural, y ya está construido.
- La contrapartida es que cada visita descarga `data/temporadas/<n>.json`
  (297 KB la T3) desde Hosting, no desde Firestore. Con 600 visitas/día son
  ~5,3 GB/mes de egress; el plan gratuito de Hosting incluye 10 GB/mes y
  después cuesta USD 0,15/GB. Sigue siendo mucho más barato que las lecturas,
  pero conviene tenerlo en cuenta si se acumulan 4–5 temporadas.

### 3. Historial desde `matches` o desde un resumen estático (esfuerzo medio)

`_getResolvedRecords()` lee `matchHistory` entera (505) y resuelve nombres
contra `teams`. Pero los datos ya están en `matches` (goles, penales, fase) y
en `phases`/`teams`, que la visita ya tiene en el espejo. Para la temporada en
curso se puede armar el historial desde `matches`; para las cerradas, desde el
JSON del archivo (que ya existe). `matchHistory` quedaría solo para registros
importados o congelados.

- Ahorro: 505 por visita que monte historial, calendario, perfil o admin
  historial (~4 260/mes).
- **USD 0,65/mes (CLP ~610), ≈ 26 %.**
- Esfuerzo medio: hay que cuidar los registros `imported` y los `live` que hoy
  resuelven nombres por `matchRef`.

### 4. Consultar `coins` por equipo y temporada (esfuerzo medio)

Hoy `dbGetAll('coins', filtro)` lee la colección entera (474) y filtra en el
cliente, tanto en el editor del presidente como en Admin → Datos/Coins. Una
consulta `where('teamId','==',…)` + `where('season','==',…)` con índice, o un
resumen de saldo por equipo y temporada, devuelve ~12 documentos en vez de 474.
El espejo actual no lo aprovecha porque su clave es solo la colección.

- Ahorro: ~462 por sesión de editor o admin datos (~600/mes en los supuestos).
- **USD 0,08/mes (CLP ~80)** hoy; crece lineal con los movimientos de la
  temporada y con la cantidad de presidentes que entren. Con 38 presidentes
  entrando a diario serían ~0,3 M lecturas/mes.
- Esfuerzo medio: requiere índice y cambiar la clave del espejo a
  colección + consulta (el cambio de API que ya anotó MS-2.5).

### 5. Etiquetas del calendario estáticas o por temporada (esfuerzo bajo)

`calDayLabels` (53) se lee entera en panel, calendario y admin calendario.
Son textos de fecha que no cambian una vez publicados. Se pueden servir en un
JSON por temporada o incluirlas en el snapshot estático.

- Ahorro: 53 por visita que abra panel o recorrido completo (~4 050/mes).
- **USD 0,06/mes (CLP ~60).**

### 6. Admin → Datos sin leer la base para mostrar contadores (esfuerzo bajo)

`renderDBInfo()` lee `coins` (474) y `matchHistory` (505) solo para pintar
números. Se pueden leer de `_counters/{store}` (1 documento por colección) o
mostrar los contadores al pulsar "Ver información", no al abrir la página.

- Ahorro: 979 por visita a Admin → Datos (~72/mes).
- **USD 0,02/mes (CLP ~20).** Poco volumen, pero el cambio es pequeño.

### 7. No leer `usernames` inexistentes en Admin → Usuarios (esfuerzo bajo)

`_uaBackfillUsernames` hace un `get()` por usuario a `usernames/{nombre}`. En
el escenario, 40 usuarios producen 40 lecturas de documentos que no existen
(cada una cobra 1). El nombre ya está en `users.username`; basta con reservar
solo las cuentas legacy o hacer un `getAll` en lote.

- Ahorro: 40 por visita a Admin → Usuarios o Tool PES5 (~90/mes).
- **USD 0,001/mes.** El ahorro es simbólico; el motivo para hacerlo es evitar
  que crezca con 40 usuarios.

### 8. JSON público estático de la temporada en curso (esfuerzo alto, opcional)

Llevar al hosting un snapshot de solo lectura de la temporada actual
(competiciones, tablas, calendario, bracket e historial) y refrescarlo desde
una Cloud Function o desde el panel al guardar resultados. Eliminaría casi
todas las lecturas públicas actuales, pero cambia la arquitectura de "tiempo
real" y la frescura de los datos. No se recomienda como primer paso: con las
recomendaciones 1–3 el costo ya baja a ~USD 0,17/mes.

### Efecto combinado

Con las recomendaciones 1, 3 y 4 (las tres primeras por ahorro), la carga
inicial baja de 617 a ~112, el recorrido completo de 1 236 a ~226, el editor
de 1 107 a ~140 y la sesión de admin a ~263. La proyección mensual baja de
**USD 2,50 a ~USD 0,17 (CLP ~165)**, un 93 % menos; los días normales quedarían
por debajo del nivel gratuito.

## 10. Limitaciones y comprobaciones

- Los números de `pes5_*`, `pedidos_pes5` y `users` son de fixture (no se
  pueden copiar de producción sin sesión). Los del torneo son reales del
  escenario.
- La sonda no ve las lecturas de reglas ni las escrituras; el costo real puede
  ser algo mayor en admin/presidente.
- El escenario de 38 equipos usa 38 documentos en `teams`. Si al empezar la
  temporada se conservan los 69 equipos históricos, la carga inicial sube ~31
  lecturas (≈ 5 % de 617); conviene archivar/limpiar equipos inactivos o
  filtrarlos.
- El escenario usa 505 partidos: 180 de 1ra (2×10), 144 de 2da (2×9) y 181 de
  copa/playoff/supercopa/liga de campeones. Es una proyección, no el calendario
  oficial de la próxima temporada; los 4 equipos nuevos entran solo a las
  ligas y la copa conserva el cuadro de 34 de la T3. Si la copa suma más
  participantes, suben `matches` y `matchHistory` en proporción.
- Emuladores, Chrome headless, el servidor temporal y los scripts de medición
  se apagaron/borraron al terminar. `sandbox/` quedó con el último escenario
  cargado y está ignorado por git.
- No se modificó código de la app, no se hizo commit/push/deploy y no se
  escribió en producción.
