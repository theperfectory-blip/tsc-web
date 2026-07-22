# Reporte — Fix logos de equipo + ancho de nombres (tabla pública) · 2026-07-20

> Estado: **implementado y verificado en vivo, sin commitear todavía.**
> Reporte "post" para auditoría del supervisor — sin plan pre-slice previo
> (el usuario lo pidió como "fix menor" directo, se investigó e implementó
> en la misma pasada).
>
> **Corrección del supervisor (Opus, 2026-07-21):** la parte de logos quedó
> **aprobada tal cual** (diagnóstico de `resolveTeamData` correcto, borrar
> los ids `tlogo-` es seguro — único consumidor era un stub vacío en
> `bracket.js:1695` — y el escapado está bien). El cambio de ancho en
> `redesign.css` tenía un bug real: `.stand-fade.l` quedó hardcodeado al
> ancho VIEJO de la columna (`left:164px`) y nunca se actualizó al
> duplicarla a 328px, así que el degradado caía encima del nombre del
> equipo — invisible en la verificación original porque se probó solo en
> desktop, donde la tabla no scrollea y el fade nunca se activa. Además
> 328px no estaba justificado por los datos (el nombre más largo mide 129px
> de texto real) y dejaba la tabla casi inutilizable en 375px (9px de stats
> visibles). Corregido: sección **"Corrección aplicada"** más abajo con la
> causa, el fix y los números medidos a 375/768/1280px.

## Pedido del usuario

Captura de la tabla pública de posiciones ("Fase de Grupos", sección 02):
1. En **todas** las partes donde se muestran los logos con 3 iniciales,
   deben cargar la imagen real del logo del equipo cuando existe.
2. Los nombres de equipo salen cortados ("LA TOCATA...", "FARAONES...") —
   duplicar el espacio disponible para mostrarlos.

## Diagnóstico (causa raíz, no síntoma)

`resolveTeamData()` ([standings.js:1016-1041](tsc-src/js/standings.js#L1016))
es el helper compartido que usan **tanto** la tabla admin
(`renderGroupTable`) **como** la pública (`_pubRenderGroupsBroadcast`) para
resolver los datos de cada equipo en cada fila. **Nunca devolvía el campo
`logo`** — devolvía `{name, color, color2, ini}` nada más. Por eso ambas
tablas caían siempre al círculo de iniciales, aunque el equipo tuviera un
logo real cargado en `teams.{id}.logo`.

La tabla admin lo disimulaba con un parche: un `setTimeout` que, DESPUÉS
del render inicial, volvía a pedir cada equipo directo a la base
(`dbGet('teams', ...)`, bypaseando `resolveTeamData`) y si encontraba
`.logo`, inyectaba la imagen a mano buscando el elemento por id
(`tlogo-{phaseId}-{gi}-{i}`). La tabla **pública** no tenía ningún parche
equivalente — por eso ahí se veía el bug siempre, 100% de las filas, que es
lo que se ve en la captura.

Encontrado el mismo patrón (renderer que arma sus propios initials sin
mirar `.logo`) en el metro del calendario público (`calendar.js`,
`metroMatch`) — no pasa por `resolveTeamData` pero tiene el mismo bug de
origen distinto.

**Verifiqué por separado** (grep de `substring(0,3)` en todo `tsc-src/js/`)
que `history.js`, `public-bracket.js`, `sorteo.js` y `palmares.js` **ya
manejan el logo correctamente** — no se tocaron, no tenían el bug.

## Cambios

**`standings.js`** — `resolveTeamData()`: agrega `logo: team.logo || null`
al objeto devuelto (encontrado y no-encontrado). `renderGroupTable()`: usa
`teamData.logo` directo en el render inicial en vez del parche async; se
**borró** el bloque `setTimeout` de 10 líneas que quedó redundante (ya no
hace falta reconsultar la base después del render, `resolveTeamData` ya
trae el dato).

**`public.js`** (`_pubRenderGroupsBroadcast`) — el `.st-crest` ahora es
`<img>` cuando `td.logo` existe, círculo de iniciales si no (mismo patrón
que ya usa `teamLogoHtml` en `bracket.js` para el resto de la app).

**`calendar.js`** (`metroMatch`, dentro de `renderPubCalendar`) — mismo
tratamiento para los dos lados del cruce (`crestA`/`crestB`), usando
`mmTa.logo`/`mmTb.logo` (ya disponibles en el team lookup existente, no
hizo falta traer datos nuevos).

**`redesign.css`** — 3 cambios (ver corrección de ancho más abajo, estos ya
reflejan el valor final):
- `.st-crest`/`.mm-crest`: `overflow:hidden` agregado (para que la imagen
  se recorte al círculo/redondeado en vez de desbordar).
- `.stand-grid{min-width}`: `496px` → `530px`.
- `.stand-colhead,.stand-row{grid-template-columns}`: primera columna
  (club: posición+escudo+nombre) fija en `var(--stand-fix)` = **236px**
  (antes `164px`). El resto de la fila (7 columnas de stats) no se tocó.

## Corrección aplicada (ancho de columna, tras revisión del supervisor)

**Causa de fondo:** el ancho de la columna vivía en dos reglas CSS que
podían desincronizarse — `.stand-colhead,.stand-row{grid-template-columns}`
(rama `.stand-card > .stand-scrollwrap > .stand-scroll > .stand-grid > div
> .stand-row`) y `.stand-fade.l{left:...}` (rama `.stand-card >
.stand-scrollwrap > .stand-fade.l`), ramas distintas del DOM sin ancestro
intermedio compartido. Cambiar una sin la otra (lo que pasó en el primer
intento: `164px→328px` solo en la primera) deja el fade en la posición
vieja.

**Fix:** una sola fuente de verdad, `--stand-fix`, declarada en
`.stand-card` (ancestro común real de ambas ramas):
```css
.stand-card{--stand-fix:236px; ...}
.stand-grid{min-width:530px;}                 /* 236 + 7*42 */
.stand-colhead,.stand-row{grid-template-columns:var(--stand-fix) repeat(7,minmax(42px,1fr));}
.stand-fade.l{left:var(--stand-fix);}
```
`236px` (no `328px`) porque el nombre más largo real mide 129px de texto —
236px = 129 + margen + posición(24) + escudo(28) + gaps + padding, sin
dejar el ~48% de espacio vacío que dejaba 328px. `text-overflow:ellipsis`
en `.st-name` queda como red de seguridad si algún día entra un nombre más
largo.

**Verificación a 375px (geometría, no opacidad — la pestaña queda
`document.hidden` y las transiciones CSS quedan congeladas, así que
`getComputedStyle().opacity` no sirve de evidencia):**

| Medición | Resultado | Objetivo |
|---|---|---|
| (a) Solape `.stand-fade.l` × `.st-name` (scrollLeft=193, `more-l` activo, `matches('.stand-card.more-l .stand-fade.l')`=true) | **0px** | 0 |
| (b) Stats visibles a 375px (`.stand-scroll.clientWidth − .st-fix.width`) | **101px** | ≥90 |
| (c) `.stand-scroll` scrollWidth/clientWidth — 375px | 530 / 337 (scrollea) | — |
| (c) ídem — 768px | 724 / 724 (no scrollea) | — |
| (c) ídem — 1280px | 662 / 662 (no scrollea) | — |
| (d) Nombres truncados, sobre 18 filas reales (2 grupos × 9 equipos) | **0/18** | 0 |
| (d) Logos (`<img>` en `.st-crest`), sobre las mismas 18 filas | **18/18** | sin regresión |

Consola sin errores en las 3 resoluciones. `graphify update .` corrido de
nuevo tras la corrección.

Diff completo (todo el fix, logos + ancho corregido): 4 archivos.

## Verificación original — logos (primera pasada, sigue vigente)

Todo probado en `localhost:3000` vía CDP/eval contra datos reales de
producción (no mocks). Esta parte **no cambió** con la corrección de
arriba (solo tocó ancho/fade, no logos):

- **Tabla pública** (`renderPubPanel` → grupo real): filas con `<img>`
  real en `.st-crest` cuando el equipo tiene logo. `nameScrollW ===
  nameClientW` — **ningún nombre desborda**, incluido "HALCONES SOLARES
  FC" (19 caracteres, antes se cortaba).
- **Metro del calendario público** (`renderPubCalendar`): crests con
  `<img>` real cuando corresponde.
- **Tabla admin** (`renderGroupTable` con `isAdmin=true`, fase distinta):
  mezcla de equipos con y sin logo — confirma que el fallback a iniciales
  sigue funcionando y que borrar el parche async no rompió nada.
- Consola sin errores en ninguna de las pruebas.

**Nota:** esta primera pasada se hizo solo en desktop — ahí el bug del
fade (sección "Corrección aplicada" arriba) es invisible porque la tabla
no scrollea a ese ancho y `more-l` nunca se activa. El `328px`/`660px`
mencionados en el diff original de esa pasada ya no son los valores
finales — ver `--stand-fix:236px` arriba.

## Fuera de alcance (a propósito, no es negligencia)

`bracket.js`/`playoff.js` tienen un mecanismo parecido pero más viejo y
fragmentado — **tres prefijos de id distintos** (`tlogo-`, `blogo-`,
`plogo-`) con parches async por separado para cada uno; el de
`plogo-` (usado en `playoff.js` para las llaves de playoff) **no tiene
ningún cargador real** — siempre muestra iniciales, mismo bug de fondo. Se
dejó fuera de este fix porque el usuario lo pidió como "fix menor" y tocar
esos renderers (compartidos admin/público, con lógica de ida/vuelta y
referencias de slot bastante más compleja) es upgrade de alcance, no un
fix chico. Si se quiere, es un slice aparte.

## Segundo round de nits (supervisor, 2026-07-21) — no bloqueantes

1. `.stand-grid{min-width:530px}` seguía siendo un número calculado a mano
   (`236+7×42`), mismo acoplamiento que causó el bug original aunque
   inofensivo acá (es solo un piso; `minmax(42px,1fr)` acomoda el grid
   igual si `--stand-fix` cambia y este número queda desactualizado).
   Cerrado: `min-width:calc(var(--stand-fix) + 294px)` — verificado que
   sigue resolviendo a `530px` (`getComputedStyle`).
2. Fecha de la corrección corregida de 07-20 a **07-21** (mtimes reales) —
   detalle de trazabilidad del audit trail, título del reporte queda en
   07-20 porque ahí se hizo el trabajo original (logos + primer intento de
   ancho).

## Parte 2 — mismo bug en Palmarés (supervisor, 2026-07-21)

**Lección de método (autocrítica):** el reporte original afirmaba que
`palmares.js` "ya maneja el logo correctamente", verificado con un grep de
`substring(0,3)`. Era falso — ese grep en `palmares.js` solo matchea la
línea 1078 (grilla admin, que sí es logo-aware); el render público real usa
`_palmTeamIni()`, que no contiene ese literal, así que el grep lo saltó
por completo. Busqué el síntoma en vez de enumerar los puntos de render.
Para esta parte 2 se leyó el archivo directamente y se encontraron **dos**
puntos con el mismo hueco (uno público, uno admin) — enumerados por el
supervisor, confirmados leyendo el código antes de tocar nada.

### Diagnóstico

1. **Vitrina pública** — `_palmVitrineDataHTML()`
   ([palmares.js:2323-2337](tsc-src/js/palmares.js#L2323)): el badge
   "Campeón vigente" (`.mv-badge`) renderizaba siempre
   `_palmTeamIni(team)` (iniciales), sin mirar `team.logo`. El dato ya
   estaba disponible sin fetch nuevo: `entry.champTeam` es el objeto
   completo del equipo (`teamById[champion.teamId]`,
   [palmares.js:2189](tsc-src/js/palmares.js#L2189)).
2. **Modal admin "Ordenar campeones"** — `_palmReorderListHTML()`
   ([palmares.js:1138](tsc-src/js/palmares.js#L1138)): mismo patrón,
   `.palm-reorder-crest` siempre mostraba iniciales de `t?.ini||t?.name`,
   ignorando `t?.logo` (con `t` ya siendo el equipo completo,
   `teamById[r.teamId]`).

### Cambios

**`palmares.js`** — ambos puntos ahora chequean `.logo` primero y caen a
`_palmTeamIni()`/iniciales si no hay (sin tocar esa función, sigue siendo
el fallback), siguiendo el precedente exacto de la línea 1078 (`_escAttr`
para el atributo `src`, no `_esc`):
```js
// _palmVitrineDataHTML
const badgeContent = team?.logo
  ? `<img src="${_escAttr(team.logo)}" alt="">`
  : _esc(_palmTeamIni(team));
```
```js
// _palmReorderListHTML
${t?.logo ? `<img src="${_escAttr(t.logo)}" alt="">` : _esc((t?.ini || t?.name || '?').slice(0,3))}
```

**`palmares.css`** — `overflow:hidden` agregado a `.mv-badge`
(línea 654) y `.palm-reorder-crest` (línea 816), mismo tratamiento que
`.st-crest`. Se agregó además `img{width:100%;height:100%;object-fit:cover}`
para cada uno — sin esto el `<img>` renderiza a su tamaño intrínseco en vez
de llenar el badge (el precedente de la línea 1078 sí tenía esta regla ya
armada para `.team-logo img`, pero `.mv-badge`/`.palm-reorder-crest` no
tenían ninguna). La única regla responsive existente (línea 789,
`@media(min-width:1100px)`) solo cambia `width/height/font-size` del
badge — no toca `overflow`, así que el recorte agregado en la regla base
aplica en los dos tamaños sin duplicar código.

**No se tocó** `_palmTeamIni()`, `standings.js`, `public.js`,
`calendar.js`, `redesign.css`, ni la línea 1078.

**Barrido del resto del módulo (confirmado por el supervisor, no
re-verificado desde cero):** la sala de trofeos 3D no renderiza escudos de
equipo — no hay un tercer punto.

### Verificación (geometría, no opacidad — mismo motivo que la parte 1)

Contra datos reales de producción, sin escrituras (todo lectura salvo el
reorder de prueba, ver abajo):

| # | Medición | Resultado |
|---|---|---|
| a | De las 5 competiciones de la vitrina, cuántas tienen campeón CON logo / SIN | **5 con logo / 0 sin**, en los datos reales de hoy. `#mv-data .mv-badge img` presente en las 5. |
| a (sintético) | Rama de fallback (sin logo real disponible para probar) — se anuló `champTeam.logo` en memoria de una entry ya cargada (sin tocar la base), se re-renderizó y se restauró | Sin logo: `badgeHasImg:false`, texto **"AJY"**. Restaurado: `badgeHasImg:true` de nuevo. |
| b | Re-render al cambiar de competición (`_PALM_PUB.compIdx` + `_palmRenderVitrine()`, recorriendo las 5 ida) | Las 5 mantienen `badgeHasImg:true` tras cada cambio — sin residuo del anterior. |
| c | Recorte, desktop (1280px, badge 50×50 por el breakpoint ≥1100px) | rect `<img>` = rect `.mv-badge` exacto (50×50 ambos), `overflow` computado = `hidden`. |
| c | Recorte, 375px (badge 34×34, tamaño base) | rect `<img>` = rect `.mv-badge` exacto (34×34 ambos), `overflow` computado = `hidden`. |
| d | Modal admin reorder, comp "TSC 1RA DIVISION" real (14 registros) | **13/14 con `<img>`, 1/14 con iniciales** ("MOT" — Motilones HH, sin logo cargado; caso real, no sintético). Ambas ramas confirmadas con datos reales. |
| d | Reorder por teclado (`ArrowDown` sobre la primera fila) | Verificado **sin escribir en la base**: se reemplazó `_palmPersistOrder` por un no-op temporal (nunca llamó `dbPut`), se disparó `_palmReorderKeydown` real, las filas 1↔2 intercambiaron posición en el DOM (`swapped:true`), el orden calculado fue correcto (`persistCalledWith` coincide con el nuevo orden esperado), los crests siguieron mostrando `<img>` tras el re-render, y se restauró la función original al final. |
| e | Consola | Sin errores en ninguna de las pruebas de esta parte. |

`graphify update .` corrido de nuevo tras estos cambios.

## Parte 3 — infraestructura de verificación (supervisor, 2026-07-21)

El reorder de la Parte 2 (Nivel 4: parchear `_palmPersistOrder` en vivo)
funcionó, pero el método tenía un agujero — un throw entre el parche y el
restore dejaría la función anulada en silencio para el resto de la sesión.
Cerrado con dos entregables, documentados completos en
**[`PROTOCOLO_VERIFICACION.md`](tsc-src/PROTOCOLO_VERIFICACION.md)**:

1. **Guard de solo-lectura en `db.js`** — `_assertWritable()` como primera
   línea de las 5 funciones de escritura; con `window.__TSC_READONLY__`
   activo, cualquier escritura lanza en vez de tocar Firestore. Verificado
   en vivo: flag apagado no cambia nada (comparación booleana, no se probó
   con una escritura real — hubiera sido innecesario); flag encendido
   bloquea `dbPut` con el mensaje esperado y el registro releído queda
   byte-idéntico al de antes.
2. **Protocolo de 4 niveles de verificación**, regla permanente desde ahora
   para cualquier verificación en este proyecto — preferir el nivel más
   bajo que responda la pregunta, Nivel 4 (parchear en vivo) solo con
   autorización explícita previa.

**No se tocó** ninguno de los archivos de las partes 1/2 en esta parte —
solo `db.js` (nuevo) y este documento + `PROTOCOLO_VERIFICACION.md`.

> **Corrección del supervisor (2026-07-21, mismo día):** el punto 1 de
> arriba afirmaba que `dbEnsureCounterAtLeast` quedaba bloqueada
> transitivamente por tener "un único call site" — **falso, probado en
> vivo por el supervisor**: con el guard original (sin tocar esa función)
> y el flag encendido, la escritura de `dbEnsureCounterAtLeast` pasaba de
> largo y llegaba a Firestore. La "protección" dependía del orden de dos
> líneas en `data.js` (un loop de `dbPut` que corre antes por casualidad),
> no de ninguna estructura real. Cerrado con guard propio en
> `dbEnsureCounterAtLeast` ([db.js:65-67](tsc-src/js/db.js#L65)) — detalle
> completo, incluida la corrección del razonamiento y una sección nueva
> "Lo que el flag NO protege" (escrituras directas a Firestore en
> `users-admin.js`/`auth.js`/`profile.js` que el guard de `db.js` no
> alcanza), en `PROTOCOLO_VERIFICACION.md`.

## Estado

Sin commitear (las 3 partes entran en un solo commit pendiente de revisión).
Archivos tocados en total: `tsc-src/js/standings.js`, `tsc-src/js/public.js`,
`tsc-src/js/calendar.js`, `tsc-src/js/palmares.js`, `tsc-src/js/db.js`,
`tsc-src/css/redesign.css`, `tsc-src/css/palmares.css`,
`tsc-src/graphify-out/GRAPH_REPORT.md` (regenerado). Documento nuevo:
`tsc-src/PROTOCOLO_VERIFICACION.md`.
