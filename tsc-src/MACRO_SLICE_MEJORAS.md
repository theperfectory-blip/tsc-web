# Macro Slice — Mejoras (post v1.3.0) · 2026-07-20

> Estado **verificado en código** (y, en el caso de A, contra los datos reales
> de producción vía CDP de solo-lectura) por Sonnet 5 el 2026-07-20. Pendiente
> de auditoría/aprobación del supervisor antes de implementar. Cada slice se
> ejecuta y cierra por separado — no se avanza al siguiente sin cierre del
> anterior (mismo protocolo que `MACRO_SLICE_FIXES.md`).
>
> **Nada de este documento está implementado todavía.** Es el pre-slice
> (plan/archivos/riesgos) de las 7 mejoras discutidas con el usuario.
>
> **Auditoría del supervisor (Opus, 2026-07-20):** los 7 diagnósticos de
> código se verificaron línea por línea contra el árbol actual y son exactos.
> Decisiones cerradas con el usuario: **C = drag & drop**, **F = alcance
> extendido** (salta jornadas sin fecha/hora), **G = descartado**. Los deltas
> de la auditoría están incorporados en cada slice abajo (marcados
> «[supervisor 2026-07-20]»). **Alcance final del macro: A–F.**

---

## 0. Reglas críticas del repo (no cambian)

Mismas que `MACRO_SLICE_FIXES.md` §0: GRAPH FIRST, nunca tocar/stagear
`firebase-config.js`/`cloudinary.js`, `innerHTML` externo siempre escapado,
iconos nuevos SVG (nunca emojis), renderers compartidos admin/público
(`renderGroupTable`, `renderBracket*`, `renderMatchesList`) no se mutan —
solo se reusa la preparación de datos. Verificación con evidencia real
(CDP/eval/DOM), no "compiló".

**Regla nueva para este macro:** el Slice A escribe contra **Firestore de
producción** (no hay sandbox — `localhost:3000` apunta a `tsc-web-yuna`
real). El repair de datos de A se ejecuta a mano, paso a paso, con
confirmación explícita del usuario antes de cada escritura — no es un botón
en la UI.

## 1. Orden y dependencias

| # | Slice | Tamaño | Riesgo | Estado |
|---|---|---|---|---|
| **A** | Fix colisión de IDs en `matchHistory` (bug activo en producción) | chico | medio (toca prod) | ✅ código + repair de datos ejecutado y verificado (2026-07-20) |
| **B** | Modo espejo del recorrido de Luis (ida↔vuelta) | chico | bajo | ✅ implementado y verificado (10/10 corridas aleatorias n=8, espejo + cobertura 14/14) |
| **C** | Orden editable de competiciones (**drag & drop**) | medio | medio | ✅ implementado y verificado (UI + drag simulado); guardado real no ejercido en prod a propósito |
| **D** | Criterios de desempate visibles en público (sección 02) | chico | bajo | ✅ implementado y verificado en vivo (fase 11) |
| **E** | Colores de zona dinámicos en tabla pública (bug visual) | chico | bajo | ✅ implementado y verificado en vivo (fase 11: azul #3B82F6 / amarillo #FFCC00 correctos) |
| **F** | Fecha por defecto = primera jornada incompleta **con fecha asignada** | chico-medio | medio | ✅ implementado y verificado en vivo (fase 13: ahora abre en Fecha 1, antes Fecha 18) |
| ~~**G**~~ | ~~Etiquetas del día en el hero público~~ — **DESCARTADO 2026-07-20** | — | — | — |

**2026-07-20 — A–F cerrados.** B–F verificados contra datos reales de producción (lectura + pruebas puntuales, sin persistir writes de prueba). A: código cerrado + repair de datos ejecutado con confirmación explícita del usuario y sesión admin — 14 filas vivas (el número creció de 11 a 14 entre el diagnóstico y la ejecución, cargadas en el ínterin) renumeradas de `[36..49]` a `[2390..2403]`, docs viejos borrados recién después de verificar los nuevos, `_counters/matchHistory` → 2403. Verificación final: 0 colisiones con el JSON estático, próximo id simulado = 2404 (correcto). `graphify update .` corrido tras los cambios de código.

**Macro cerrado. Las 7 mejoras discutidas (A–F, G descartado) están implementadas y verificadas.**

Todas son independientes entre sí — se pueden aprobar y cerrar en cualquier
orden. Van ordenadas por urgencia (A es un bug activo en producción) y luego
por si tienen decisión pendiente o no (B/D/E primero porque no necesitan que
el usuario elija nada).

---

## Slice A — Fix colisión de IDs en `matchHistory`

**Objetivo:** que un partido de la temporada en curso nunca reciba el mismo
ID que un partido ya existente en el histórico estático.

**Estado actual (confirmado en código Y en vivo contra producción, lectura
únicamente):**
- `matchHistory` mezcla dos fuentes: el JSON estático `data/historial-seed.json`
  (2389 filas, `source:'imported'`, IDs fijos 1–2389) y una colección Firestore
  `matchHistory` (`source:'live'`) que se llena de a un registro cada vez que
  se carga el resultado de un partido de la temporada activa.
- El bug está en [history.js:152-160](tsc-src/js/history.js#L152): calcula
  `nextId = max(estáticos, vivos) + 1` a mano, pero lo pasa a
  `dbAdd('matchHistory', {id:nextId, ...})`. En modo Firestore, `dbAdd`
  ([db.js:98-103](tsc-src/js/db.js#L98)) **ignora cualquier `id` que le
  pasen** — siempre genera el suyo con `_fsNextId(store)` y `{...data, id}`
  lo pisa. El `nextId` calculado nunca se usa.
- Verificado en vivo (2026-07-20, vía consola en `localhost:3000`, que
  apunta a Firestore de producción):
  - `_counters/matchHistory` = **46** (el contador Firestore arrancó de cero,
    sin saber nada del rango del JSON estático).
  - JSON estático llega hasta id **2389**.
  - **Las 11 filas vivas que existen hoy chocan las 11** con una fila
    estática distinta (mismo id, otro partido). Ej.: id 46 = "Trota Mundos FC
    1-1 Malvinas Jr" (estático, Sem 6) vs el partido recién cargado de la
    temporada actual (`matchRef:651`, 1-0) — ambos con id 46.
  - Cada partido nuevo que se cargue de ahora en más va a seguir chocando,
    hasta que el contador supere naturalmente el 2389 (~2350 partidos más).

**Enfoque (2 partes):**
1. **Código** — en [history.js:160](tsc-src/js/history.js#L160) cambiar
   `dbAdd` por `dbPut`. `dbPut` en Firestore ([db.js:177-182](tsc-src/js/db.js#L177))
   sí respeta el `id` explícito (`let id = data.id; if(id==null) id = await
   _fsNextId(store);`). Cambio de una línea, sin tocar la lógica de cálculo
   de `nextId` (que ya está bien).

   > **[supervisor 2026-07-20]** El fix de código **por sí solo corta toda
   > colisión futura**: con `dbPut`, cada fila nueva calcula
   > `nextId = max(2389, maxIdb)+1 ≥ 2390`, que ya no choca con el JSON
   > estático — sin tocar producción. Por eso las dos partes se ejecutan y
   > cierran **por separado**: (1) el fix de código es seguro y no-prod; (2)
   > el repair solo limpia las 11 filas ya rotas. Se puede shippear (1) sin (2).
2. **Repair en producción (manual, paso a paso, con OK explícito antes de
   cada escritura):**
   - Leer las 11 filas vivas actuales de `matchHistory` y reasignarles un id
     nuevo ≥ 2390 (empezando por el primero libre), preservando todos sus
     demás campos (`matchRef`, `seasonRef`, `golesA/B`, `createdAt`, `source`).
   - Escribir esas 11 filas con su nuevo id (`set` en el doc nuevo), borrar
     el doc viejo con el id colisionado.
   - Subir `_counters/matchHistory` a 2389 (o al máximo real tras la
     renumeración) para que el próximo `_fsNextId` arranque en 2390 y no
     vuelva a chocar nunca con el JSON estático. **[supervisor 2026-07-20:
     este paso es defensivo, no load-bearing — el camino `dbPut` con id
     explícito NO lee `_counters`. Dejarlo como belt-and-suspenders o
     quitarlo; no es lo que arregla el bug.]**

**Archivos:** `history.js` (1 línea). El repair de datos no es un archivo
del repo — son escrituras puntuales a Firestore, documentadas acá y
ejecutadas a mano con confirmación en el momento.

**Riesgos:** medio — es la única parte de este macro que escribe en datos
reales de producción. Mitigación: leer y mostrar el "antes" de las 11 filas
antes de tocar nada; escribir el doc nuevo primero y confirmar que quedó
bien ANTES de borrar el viejo (nunca delete-then-write); un solo lote,
reversible mientras no se borre el viejo.

**Verificación (gate):** releer las 11 filas después del repair — sus ids ya
no aparecen en el JSON estático; cargar un resultado de prueba y confirmar
que el nuevo `matchHistory` doc sale con id > 2389; `_counters/matchHistory`
actualizado.

**Cierre:** commit `fix(historial): dbPut en vez de dbAdd para evitar colisión de ids con el histórico estático` + nota en este documento con los ids reasignados.

---

## Slice B — Modo espejo del recorrido de Luis

**Objetivo:** en temporada completa (ida y vuelta), el equipo que Luis
maneja en la fecha N de la ida debe ser el equipo al que **enfrenta** en su
fecha espejo (N + mitad) de la vuelta — mismo cruce, control invertido.
Ejemplo del usuario: lo que maneja en fecha 1 lo enfrenta en fecha 8 (con 8
equipos, mitad=7).

**Estado actual (verificado en código, y matemáticamente):**
- `fxBuildRoundRobin(teamIds, legs)` ([fixture-gen.js:85-123](tsc-src/js/fixture-gen.js#L85))
  ya garantiza que, con `legs=2`, la ronda `N+mitad` es **exactamente el
  mismo par de equipos** que la ronda `N` (solo invierte local/visita) —
  esto no cambia.
- El problema está en `_fxBuildLuisRouteForLegs` ([fixture-gen.js:251-260](tsc-src/js/fixture-gen.js#L251)):
  hoy busca **dos recorridos σ independientes** (uno para la ida, otro para
  la vuelta, con backtracking separado). El comentario del propio código lo
  documenta como decisión previa del usuario ("un recorrido INDEPENDIENTE
  por vuelta... así Luis maneja y enfrenta a todos DOS veces, no una sola
  vez total") — que es justo lo que ahora se quiere cambiar.
- Lo verifiqué contra el calendario real de las Fechas 1-14 que mandaste: el
  doble de la ida cayó en fecha 1 y el de la vuelta en fecha 9 — no en la 8
  (su espejo) — confirma que hoy son independientes.

**La demostración de por qué el fix es simple:** llamemos σ a la ida (Luis
maneja `x`, enfrenta `σ(x)`). Pedir "lo que manejó en la ida lo enfrenta en
la vuelta" es exactamente pedir que la vuelta use **σ⁻¹** (la permutación
inversa): si σ(x)=y, entonces σ⁻¹(y)=x — Luis maneja `y` en la vuelta y
enfrenta `x`. La inversa de una permutación sin puntos fijos y sin 2-ciclos
**sigue siendo** una permutación sin puntos fijos y sin 2-ciclos (son las
mismas 3 condiciones que ya exige `fxBuildLuisRoute` para σ) — así que σ⁻¹
es automáticamente válida, no hace falta una segunda búsqueda por
backtracking. Y como la ronda `N+mitad` es el mismo par que la ronda `N`,
los `n` cruces de σ⁻¹ cubren automáticamente las `mitad` rondas de la vuelta
(la misma cobertura que ya logró σ en la ida, solo remapeada).

**Enfoque:** reemplazar la búsqueda independiente de la vuelta por la
inversión de `ida.route`:
```js
function _fxBuildLuisRouteForLegs(rounds, teamIds, legs, nodeBudget=FX_ROUTE_NODE_BUDGET){
  if(parseInt(legs,10) !== 2) return fxBuildLuisRoute(rounds, teamIds, nodeBudget);
  const half = rounds.length/2;
  const ida = fxBuildLuisRoute(rounds.slice(0, half), teamIds, nodeBudget);
  if(!ida.route) return { route:null, exhausted: ida.exhausted };

  // Espejo: mismo cruce {teamA,teamB} en la ronda N+half, pero maneja el
  // que NO manejaba en la ida (así lo enfrenta). σ⁻¹ conserva bijectividad +
  // anti-punto-fijo + anti-2-ciclo automáticamente — no hace falta buscar
  // un segundo recorrido por backtracking.
  const vuelta = ida.route.map(r => ({
    ronda: r.ronda + half,
    teamA: r.teamA, teamB: r.teamB,
    maneja: (r.maneja === r.teamA) ? r.teamB : r.teamA,
  }));
  return { route: ida.route.concat(vuelta), exhausted:false };
}
```

> **[supervisor 2026-07-20]** Contrato de retorno confirmado en auditoría:
> `fxBuildLuisRoute` devuelve `{ronda, teamA, teamB, maneja}`
> ([fixture-gen.js:238](tsc-src/js/fixture-gen.js#L238)) y `maneja` **siempre
> es un miembro del par** (`x` de `matchByPair`), así que el flip
> `(r.maneja===r.teamA)?r.teamB:r.teamA` es válido. El `.map` está bien
> tipado — sin cambios al código propuesto.

Efecto colateral bueno: como la vuelta ya no busca (se deriva), si la ida
encuentra recorrido la vuelta **siempre** lo tiene — desaparece el caso raro
de "ida encontró pero a la vuelta no le alcanzó el presupuesto", y
`_fxGenerateCalendarAndRoute` tarda menos (una búsqueda en vez de dos).
También hay que actualizar el comentario de cabecera del archivo
([fixture-gen.js:20-56](tsc-src/js/fixture-gen.js#L20), y puntualmente el
bloque de [fixture-gen.js:244-250](tsc-src/js/fixture-gen.js#L244)) que hoy
documenta la decisión vieja ("recorrido independiente por vuelta") — hay que
reemplazarlo por la regla espejo.

**No retroactivo:** esto solo aplica a fases/grupos que se generen de ahora
en adelante. El grupo de las Fechas 1-14 que revisamos ya tiene resultados
cargados, así que `fxGroupLockReason` ([fixture-gen.js:293-303](tsc-src/js/fixture-gen.js#L293))
lo bloquea para regenerar — no se puede (ni se debe) aplicar la regla nueva
a ese calendario ya en curso.

**Archivos:** `fixture-gen.js` (`_fxBuildLuisRouteForLegs` + comentario de
cabecera). **No toca** `fxBuildRoundRobin`, `fxBuildLuisRoute` (la búsqueda
de la ida sigue igual), ni `fxGenerate`/`renderFixtureGenModal` (siguen
consumiendo `route` con el mismo contrato `{ronda,teamA,teamB,maneja}`).

**Riesgos:** bajo — es una simplificación (menos código, menos búsqueda) con
una demostración matemática directa, no heurística. Mitigación: generar un
grupo de prueba de 8 equipos con ida y vuelta y verificar a mano 2-3 pares
espejo en el preview del modal antes de guardar.

**Verificación (gate):** abrir "Generar fechas" en un grupo de 8 equipos
(ida y vuelta), y en el preview confirmar que el equipo marcado en la fecha
N de la ida aparece como rival (no como manejado) en la fecha N+mitad de la
vuelta, para varios N; confirmar que sigue funcionando "Barajar de nuevo";
confirmar n=4/n=6 siguen mostrando el aviso "imposible por matemática"
(no cambia, es propiedad de la ida).

**Cierre:** commit `feat(fixtures): recorrido de Luis en modo espejo (ida↔vuelta) — la vuelta deriva de σ⁻¹ en vez de buscarse independiente`.

---

## Slice C — Orden editable de competiciones (drag & drop)

**Objetivo:** poder elegir el orden en que aparecen las competiciones
(admin y público), no solo el orden de creación.

**Estado actual:** `getForSeason('competitions')` ([db.js:236](tsc-src/js/db.js#L236))
no ordena — IndexedDB/Firestore devuelven por orden de inserción. Tanto
`renderCompsGrid` (admin, [competitions.js:42](tsc-src/js/competitions.js#L42))
como `renderPubComps` (público, [phases.js:805](tsc-src/js/phases.js#L805))
pintan tal cual llega. Las **fases ya resuelven esto** (campo `order`,
`phases.sort((a,b)=>a.order-b.order)` en [phases.js:81](tsc-src/js/phases.js#L81)),
y la **lista de criterios de desempate ya tiene un patrón drag & drop
reutilizable** en `standings.js` (`openCriteriaModal` + `saveCriteriaAndRefresh`).

**Enfoque (decisión del usuario 2026-07-20 = drag & drop):**
- Persistir un campo `order` por competición; ordenar por `order` con
  **fallback a `id`** en `renderCompsGrid` (admin) y `renderPubComps` (público),
  así las competiciones viejas sin `order` no se reordenan solas al desplegar.
- Para reordenar: **reusar el patrón DnD de la lista de criterios de
  desempate** (`standings.js`), no inventar uno nuevo. Al soltar, recalcular
  `order` de las afectadas y persistir.

**Sub-detalle CERRADO (decisión del usuario 2026-07-20 = lista 1D):** el
reorden se hace en una **lista vertical 1D "reordenar competiciones"** (clon
exacto del DnD de criterios de desempate) que setea `order` — **NO** se
arrastran las tarjetas en el grid. Motivo: el grid de comps es 2D
(`grid-template-columns:repeat(auto-fill,minmax(260px,1fr))`,
[competitions.js:35](tsc-src/js/competitions.js#L35)) y arrastrar sobre un grid
que wrappea es propenso a bugs de índice. La lista 1D reusa un DnD ya probado y
evita ese riesgo. Falta definir el disparador de esa lista (botón "Reordenar"
en `renderAdmComps` que abre un modal/panel con las comps en columna).

**Archivos:** `competitions.js` (`renderCompsGrid`, `saveComp` o un guardado de
reorden dedicado; `openCompModal` solo si el campo se agrega ahí), `phases.js`
(`renderPubComps`), y reuso del helper DnD de `standings.js`.

**Riesgos:** medio (subió respecto al estimado numérico original). El DnD +
recálculo de `order` + persistencia + orden en dos renders es más superficie.
Mitigación: reusar el DnD ya probado de criterios; fallback a `id`;
recomendación de lista 1D para evitar el drag sobre grid 2D.

**Verificación (gate):** reordenar 2-3 competiciones por drag, confirmar que el
grid admin y el listado público reflejan el nuevo orden tras recargar;
competiciones viejas sin `order` mantienen su posición relativa actual (por id);
el DnD de criterios de desempate sigue funcionando (no se rompió al reusar el
patrón).

**Cierre:** commit `feat(competiciones): orden editable por drag & drop (admin + público)`.

---

## Slice D — Criterios de desempate visibles en público

**Objetivo:** que un visitante pueda ver los criterios de desempate
aplicados en una tabla de posiciones pública (sección 02), igual que ya
puede el admin.

**Estado actual:** `openCriteriaModal(phaseId, containerId, isAdmin)`
([standings.js:401](tsc-src/js/standings.js#L401)) **ya tiene modo
solo-lectura** cuando `isAdmin=false` (sin drag&drop, sin botón guardar,
solo la lista numerada — [standings.js:438-439](tsc-src/js/standings.js#L438)).
La tabla admin ya lo usa vía el botón "ℹ Criterios"
([standings.js:319-325](tsc-src/js/standings.js#L319)). La tabla pública
rediseñada, `_pubRenderGroupsBroadcast` ([public.js:405](tsc-src/js/public.js#L405)),
es un render paralelo y su header (`.stand-hdr`, [public.js:496](tsc-src/js/public.js#L496))
no tiene ese botón.

**Enfoque:** agregar un ícono "i" SVG (estilo **Lucide stroke, sin emoji** —
regla del repo) junto al título del grupo en `.stand-hdr`
([public.js:496](tsc-src/js/public.js#L496)), con
`onclick="openCriteriaModal(${phaseId}, '${containerId}', false)"` —
reutiliza el modal existente tal cual. **[supervisor 2026-07-20]** El
`containerId` es **inerte en modo lectura** (`isAdmin=false` no guarda, así que
nunca refresca ese contenedor): sirve cualquier id del contenedor público, no
hace falta buscar uno específico.

**Archivos:** `public.js` (`_pubRenderGroupsBroadcast`). No toca
`standings.js` ni `renderGroupTable`.

**Riesgos:** bajo — solo agrega un botón que llama a código ya probado en
admin.

**Verificación (gate):** en la sección 02 pública, click en el ícono junto a
"GRUPO A" → se abre el modal con la lista de criterios activos en orden, sin
controles de edición; cerrar funciona.

**Cierre:** commit `feat(público): botón de criterios de desempate en la tabla de posiciones pública`.

---

## Slice E — Colores de zona dinámicos en tabla pública (bug)

**Objetivo:** que el color de cada zona de clasificación en la tabla pública
sea el que configuró el admin, no un verde/rojo fijo.

**Estado actual (bug confirmado):** en `_pubRenderGroupsBroadcast`
([public.js:437](tsc-src/js/public.js#L437)):
```js
const zoneCls = z => { if(!z) return ''; const idx=zones.indexOf(z);
  return (zones.length>1 && idx===zones.length-1) ? 'zone-down' : 'zone-up'; };
```
Solo distingue "es la última zona" (rojo) vs "todo lo demás" (verde). Con 3
zonas (azul "Clasifica", amarillo "Play Off Permanencia", rojo "Descenso"),
la del medio cae en "no es la última" → se pinta verde. El CSS
([redesign.css:650-654](tsc-src/css/redesign.css#L650)) solo tiene esas 2
clases fijas. La tabla admin (`renderGroupTable`,
[standings.js:261-263](tsc-src/js/standings.js#L261)) sí usa `zone.color`
real sin importar cuántas zonas haya.

**Enfoque [supervisor 2026-07-20, refinado]:** en vez de introducir una
variable CSS nueva, **reusar el helper `colorOf()` que ya existe**
([public.js:438](tsc-src/js/public.js#L438) — ya valida hex y cae a
`var(--gold)`) y **espejar el `posStyle` del admin**
([standings.js:261-263](tsc-src/js/standings.js#L261)):
`background:${colorOf(z.color)}22; color:${colorOf(z.color)};` inline en la
celda de posición. Se retira la lógica binaria `.zone-up`/`.zone-down`.

**Archivos:** `public.js` (`_pubRenderGroupsBroadcast`). El cambio queda
**JS-only**; las reglas `.zone-up`/`.zone-down` de
[redesign.css:650-654](tsc-src/css/redesign.css#L650) quedan muertas —
quitarlas es opcional (no bloquea). Menos superficie que el plan original (ya
no es obligatorio tocar `redesign.css`).

**Riesgos:** bajo-medio — hay que revisar que el contraste siga siendo
legible con colores arbitrarios elegidos por el admin (no solo verde/rojo
calibrados). Mitigación: el mismo `+'22'` de opacidad de fondo que usa
`renderGroupTable`, ya probado con colores arbitrarios en el admin.

**Verificación (gate):** con una fase de 3+ zonas (azul/amarillo/rojo), la
tabla pública muestra cada posición con el color real de su zona — la zona
del medio ya no sale verde. Comparar visualmente contra la leyenda inferior
(que ya está bien) y contra la tabla admin.

**Cierre:** commit `fix(público): colores de zona dinámicos en la tabla de posiciones (antes fijo verde/rojo)`.

---

## Slice F — Fecha por defecto = primera jornada incompleta

**Objetivo:** que el paginador público de partidos (sección 02) abra por
defecto en la jornada actual, no en la última creada.

**Estado actual (bug confirmado):** en `_pubScoresPagerHtml`
([public.js:348-350](tsc-src/js/public.js#L348)):
```js
let idx = _pubScoreDateIdx[groupKey];
if(idx==null) idx = keys.length-1;
```
Default = `keys.length-1` = literalmente la última jornada creada. Por eso
se veía "Fecha 18" con equipos que jugaron 1 solo partido. Las flechas ya
navegan en orden ascendente (`keys.sort`), eso no se toca.

**Enfoque (decisión del usuario 2026-07-20 = alcance extendido):** el default
salta también las jornadas que todavía no tienen fecha/hora asignada.
Precedencia exacta del índice por defecto:
1. **candidatas** = jornadas con fecha/hora en `phase.rondaMeta`;
2. **default = primera candidata incompleta** (incompleta = no todos sus
   partidos con `goalsA/goalsB` y `!live`, reusando el filtro de
   [public.js:357](tsc-src/js/public.js#L357));
3. si todas las candidatas están completas → **última candidata**;
4. si **ninguna** jornada tiene fecha aún → mantener el comportamiento actual
   (última creada, `keys.length-1`).

**A confirmar antes de codificar [supervisor 2026-07-20]:** el nombre exacto
del campo de fecha/hora dentro de `rondaMeta` — verificarlo en `saveJornadaDate`
/ `openAssignDateToJornada` (`matches.js`) antes de escribir el punto 1.

**Archivos:** `public.js` (`_pubScoresPagerHtml`).

**Riesgos:** medio — tocar el default de un paginador que también persiste
estado por navegación manual (`_pubScoreDateIdx`) y se re-renderiza en vivo;
hay que preservar la selección manual del usuario si ya navegó (no resetear
el índice en cada re-render por evento en vivo).

**Verificación (gate):** con un grupo donde la fecha 1 esté completa y la 2
incompleta, el paginador abre en fecha 2 por defecto; con todas completas,
abre en la última; navegar manualmente y confirmar que un re-render en vivo
no resetea la selección.

**Cierre:** commit `fix(público): paginador de fechas abre en la jornada actual, no en la última creada`.

---

## Slice G — Etiquetas del día en el hero público (~~opcional~~ DESCARTADO)

> **DESCARTADO por decisión del usuario (2026-07-20).** El timeline/metro
> público ya refleja las etiquetas y este slice no nació de un bug ni de un
> pedido explícito. Fuera del alcance del macro (A–F). Se deja documentado
> abajo por si se retoma en el futuro.

**Objetivo:** que el hero (bloque grande con cuenta atrás) del calendario
público refleje las etiquetas "Libre"/"Sorteo"/texto libre que carga el
admin, no solo partidos.

**Estado actual:** `calDayLabels` ya se refleja en el timeline/metro
público (tag junto a la fecha, [calendar.js:1020-1021](tsc-src/js/calendar.js#L1020)),
pero `_calOffseasonHero()` ([calendar.js:675](tsc-src/js/calendar.js#L675))
es 100% estático — si no hay partido en vivo/próximo, siempre dice genérico
"Sin partidos", aunque el admin haya marcado, por ejemplo, mañana como
"Sorteo".

**Enfoque:** cuando no hay `heroMatch` pero sí un `dayLabel` próximo (tipo
sorteo/libre o texto), mostrar ese contexto en el hero en vez del mensaje
genérico.

**Pendiente de confirmar con el usuario:** ¿se hace este slice o alcanza
con que el timeline ya lo refleje? Es el único de los 7 que no nació de un
bug/pedido explícito sino de algo que noté al investigar — queda afuera del
orden de prioridad hasta que se confirme.

**Archivos:** `calendar.js` (`_calOffseasonHero`, y el punto donde se decide
`heroMatch ? _calHeroHtml(...) : _calOffseasonHero()`).

**Riesgos:** bajo.

**Verificación (gate):** sin partidos programados pero con un `calDayLabel`
tipo "Sorteo" en los próximos días, el hero público muestra ese contexto en
vez del genérico "Sin partidos".

**Cierre:** commit `feat(público): hero del calendario refleja etiquetas de día (sorteo/libre) cuando no hay partido próximo`.

---

## Notas de cierre del macro

- Cada slice: pre (este documento) → aprobación del supervisor → Sonnet
  implementa → post (diff/pruebas/evidencia real) → auditoría → OK → commit
  sin push.
- A es el único que toca datos de producción — requiere confirmación
  explícita del usuario en el momento del repair, no solo aprobación del
  plan.
- B, C, D, E, F son solo cambios de código en `tsc-src/` — se verifican
  con `npx serve tsc-src` + CDP, sin build Android. (**G descartado.**)
- Tras cerrar cada slice: `cd tsc-src && graphify update .`.
