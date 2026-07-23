# Reporte — Ficha de club (Slice B)

> Ejecuta `MACRO_SLICE_TARJETA_CLUB.md` §3 (Slice B). El Slice C (grilla
> pública accionable) **no se tocó** — queda listo para engancharse porque
> `openClubDossier(teamId)` ya está parametrizada desde el día uno.
> Verificación Nivel 1–2 exclusivamente, según §5 riesgo #1 y
> `PROTOCOLO_VERIFICACION.md`. **Nada de lo de abajo está commiteado.**

## Qué se implementó

**`openClubDossier(teamId, triggerEl)`** (`profile.js`) — parametrizada por
equipo desde el día uno: no lee `window._profileTeam` ni `AUTH.teamId` en
ningún punto del render. La única variable module-level que guarda el
equipo (`_clubDossierTeam`) existe solo para wirear el botón de salida de
la ficha ya abierta — no decide qué se renderiza, eso lo hace siempre el
argumento.

Contenido, en el orden del macro:

1. **Cabecera** — escudo, nombre, colores (`_palmIsHex` con fallback
   `#1a1a2e`, mismo patrón que el crest del perfil pero de solo lectura:
   sin `<label>`/`<input>` de cambio de escudo, la ficha no edita).
2. **Récord histórico** — `_loadTeamStats(teamId, team)` + `_statsHTML(stats)`
   **reusado verbatim** (mismo HTML que la tarjeta, no una segunda
   plantilla) + una línea nueva de "% de victorias" (`W/P`, solo en la
   ficha — el macro lo pide acá, no en la tarjeta compacta).
3. **Palmarés** — `_pfTeamTitles` + `_pfVitrinaChips` reusadas sin
   reimplementar la agregación, mismos chips (trofeo+label+×n) que la
   vitrina de la tarjeta. Botón "Fotos de campeón"/"Agregar fotos" vía
   `openChampionPhotosModal(teamId)` — ya parametrizada y ya blindada por
   `isAdmin` desde el Slice A, no se duplicó nada.
4. **Rivalidades** — top 5 por partidos jugados, balance G-E-P desde la
   óptica del club. Sale de la MISMA pasada que el récord (ver más abajo).
5. **Temporada actual** — **no implementado esta ronda**, ver sección
   "Investigación: temporada actual" más abajo.
6. **Salida "Ver todos sus partidos"** — único punto de la ficha que toca
   `_histState` y navega.

### El bug que arregla

El botón "Ver el historial de mi club" del perfil ahora llama a
`openClubDossier(team.id,this)` (antes: `profileViewMyMatches()`, que
seteaba `_histState.qA` y navegaba de una, dejando el filtro pegado). El
label del botón pasó a "Ver ficha de mi club" — dejar el texto viejo
hubiera sido engañoso: ya no lleva directo al historial, lleva a la ficha.
`profileViewMyMatches` quedó sin ningún caller tras el cambio (confirmado
por grep en todo `tsc-src/`, único uso era este botón) — se borró en vez
de dejarlo muerto.

La única función que hoy setea `_histState.qA` y navega es
`_clubDossierViewAllMatches()`, parametrizada por `_clubDossierTeam` (el
equipo de la ficha que está abierta), nunca por "mi club". Abrir y cerrar
la ficha por cualquier otra vía (X, Escape, click en el backdrop) no toca
`_histState` en ningún punto del código — no hay nada que limpiar porque
nunca se ensucia si no se usa la salida.

## Rivalidades: una sola pasada (riesgo #5)

Se extendió `_loadTeamStats` (no se creó un helper aparte): el mismo loop
que ya recorría `_getResolvedRecords()` para sumar W/D/L/GF/GA ahora
también talla un `Map` de rivales — `isA ? r.equipoB : r.equipoA`, clave
`_norm(rival)` (el mismo normalizador que la función ya usa para
reconocerse a sí misma). Al final: `[...tally.values()].sort(P desc).slice(0,5)`.

El cambio de retorno es **aditivo**: `{W,D,L,GF,GA,P,rivals}`. El único
caller existente (`renderProfileBody`) desestructura los primeros 6 campos
vía `_statsHTML` y nunca mira `.rivals` — no hubo que tocarlo, la firma no
se rompió. Se eligió esta opción (extender la función, no un helper
separado) porque `renderProfileBody` y la ficha ya llaman al mismo símbolo
con los mismos dos argumentos; un helper aparte hubiera significado dos
puntos de entrada al mismo dato para el mismo consumidor futuro (la
ficha), sin ninguna ventaja de aislamiento real.

**Nota de normalización:** el rival se agrupa por el mismo `_norm` que
usa el club para reconocer SUS propios nombres, pero no se resuelve contra
`previousNames` de terceros (eso existe en `window._histTeamLookup`,
poblado como side-effect de `_getResolvedRecords()`, pero el pedido fue
explícito: "mismo `_norm` que ya usa la función", no resolución de rename
del rival). Si un rival cambió de nombre a mitad de camino, hoy aparece
como dos rivales distintos en vez de uno fusionado — está documentado acá
para no perderlo de vista, no se resolvió porque no fue lo pedido.

## Investigación: "Temporada actual" (posición + próximo partido) — NO implementado

Sección 5 del macro, marcada como el bloque de mayor riesgo. Investigué
`calcGroupStandings` (`standings.js:45`) y `_pubRenderGroupsBroadcast`
(`public.js:418`, la única superficie pública que hoy resuelve un grupo)
antes de escribir nada. Conclusión: **no hay ambigüedad de costo, hay
ambigüedad de significado** — el costo de leer los datos es bajo (la
temporada de este proyecto tiene pocas decenas de equipos/partidos), pero
la pregunta "¿cuál es LA posición actual de este equipo?" no tiene una
única respuesta con el modelo de datos de hoy:

1. **Un equipo puede estar en varias fases tipo `groups` a la vez.**
   `phase.groups` es un `{grupoIdx: teamIds[]}` por fase; nada impide (de
   hecho el propio código de standings lo asume) que el mismo equipo
   aparezca en el grupo de "TSC 1RA DIVISION" Y en el de "LIGA DE
   CAMPEONES" en la misma temporada. Para saber en cuáles, hay que barrer
   TODAS las competiciones activas → TODAS sus fases activas → revisar si
   el `teamId` aparece en algún `phase.groups[gi]`. No hay un índice
   "fase activa de este equipo" en ningún lado — hoy se resuelve al revés
   (el usuario elige comp/fase en un carrusel, `_pubState.compId/phaseId`,
   y ESE panel muestra los equipos de esa fase).
2. **Si aparece en más de una, ¿cuál se muestra?** No hay criterio en el
   macro ni en el código existente. Elegir "la primera por orden de
   competición" es arbitrario y puede mostrar la fase equivocada para el
   caso real que le importa al usuario.
3. **Un equipo puede no estar en ninguna fase de grupos activa** (fase de
   playoff/bracket, entre temporadas, recién creado). Hay que decidir el
   estado vacío sin poder asumir "siempre hay una".
4. **"Próximo partido" tiene el mismo problema de raíz** más uno propio:
   el propio historial de este proyecto (`MACRO_SLICE_CALENDARIO.md`,
   commiteado) documenta que "fecha" es ambiguo entre `rondaMeta`,
   `scheduledDate` y `ronda` — ordenar "próximo" por la fecha equivocada
   ya causó un bug real en este mismo código base. No hay que repetir eso
   acá sin una regla explícita de qué campo manda.

**Propuesta concreta** (para decidir antes de implementarlo, no para que
se apruebe implícitamente por default): mostrar TODAS las fases tipo
`groups` activas donde aparece el equipo (probablemente 0 o 1 en la
práctica de esta liga, aunque el modelo permita más), cada una con su
posición; "próximo partido" = el primer partido sin resultado del equipo
en cualquier fase activa, ordenado por el mismo criterio ya unificado en
`matches.js` tras el slice de Calendario (no reabrir esa decisión). Si el
equipo no aparece en ninguna fase de grupos activa, la sección no se
renderiza (mismo criterio de "sin placeholder" que A.4). Queda pendiente
de aprobación — no se tocó el código de este bloque.

## Integración con lo ya hecho

- **Escape:** la ficha se registra en la misma pila compartida
  (`_pfEscStack`) que el drawer, el modal de fotos y el visor — mismo
  patrón `MutationObserver` sobre `.open`, sin inventar un segundo
  manejo de teclado.
- **Fotos de campeón:** reusa `openChampionPhotosModal(teamId)` tal cual
  — no se duplicó el uploader ni la lógica de `isAdmin`.
- **`_pfPhotosButtonState`** — se extrajo de `renderProfileBody` (2 líneas
  que ya existían, `showPhotosBtn`/`photosBtnLabel`) a un helper reusado
  por la tarjeta y la ficha. Refactor de comportamiento idéntico: mismo
  input, mismo output, verificado que la tarjeta no cambió (ver tabla).

## Verificación

`window.__TSC_READONLY__ = true` seteado antes de la primera prueba.
**Cero llamadas a `dbAdd`/`dbPut`/`dbDelete`.** Antes de medir: comparación
byte a byte entre el archivo en disco y el código cargado (no "la función
existe") — `_clubDossierViewAllMatches.toString()` contra el texto exacto
leído de `profile.js` con Node, 422 caracteres, coincidencia exacta.

| # | Criterio | Nivel | Resultado |
|---|---|---|---|
| a.1 | Rivalidades sintéticas: 3 rivales de distinto balance + normalización de casing | 1 | Orden y G-E-P exactos por rival, verificados a mano contra el resultado real |
| a.2 | Truncado a top 5 (6 rivales distintos con partidos) | 1 | 5 devueltos, el de menor P (empatado, insertado último) queda afuera |
| a.3 | Partido sin jugar contra un rival nuevo | 1 | No crea entrada — se descarta antes de llegar al tally (mismo guard que W/D/L) |
| a.4 | Club con 0 partidos en el histórico | 1 | `P:0`, `rivals:[]`, sin excepción |
| b | Pasada única: `_getResolvedRecords` envuelta y contada durante una llamada a `_loadTeamStats` | 1 | `callCount === 1`; función original restaurada y verificada (`fnRestored:true`) |
| c | Parametrización: sesión admin con `AUTH.teamId=61` (FK TUPADRE), `openClubDossier(37)` | 1/2 | Título y chips de **ATL. JUNIOR YOSHUA** (equipo 37) — no de FK TUPADRE. `_clubDossierTeam.id === 37` con `AUTH.teamId` real en `61` |
| d.1 | Abrir ficha (37) y cerrar con el botón X (sin salida) | 2 | `_histState` byte-idéntico a antes de abrir (`JSON.stringify` igual) |
| d.2 | Abrir de nuevo, usar "Ver todos sus partidos" | 2 | `_histState.qA === 'ATL. JUNIOR YOSHUA'`, `qB===''`, `page===1`; ficha cerrada |
| e | Escape con drawer→ficha anidados (2 capas) | 2 | Escape #1 cierra solo la ficha (`dossierOpen:false, profileOpen:true`); Escape #2 recién cierra el drawer |
| f | Récord ficha vs. tarjeta, mismo equipo (37) | 1/2 | HTML del bloque de stats **byte a byte idéntico** entre tarjeta y ficha (2402 caracteres, `exactMatch:true`) — misma fuente, no dos cálculos |
| — | Club sin títulos (equipo 1, MALVINAS JR) en la ficha | 2 | 0 chips, mensaje "Este club todavía no tiene títulos.", botón de salida presente, sin excepción |
| g | Consola durante toda la sesión | 2 | Sin errores, revisado en 4 puntos distintos de la sesión |
| — | Estado final | 2 | `AUTH` = `{role:'public',teamId:null,hasUser:false}`; `_pfEscStack.length===0` (confirmado con espera — el primer chequeo sin esperar el microtask del `MutationObserver` dio `1`, mismo tipo de falso negativo que en Slice A Parte 3, corregido con `await` antes de leer) |

## Fuera de alcance (a propósito, Parte 1)

Slice C (grilla pública → `openClubDossier(t.id)`), resolución de renames
de rivales, reglas de Firestore para presidentes, filtro `https://` de
galerías.

## Parte 2 — 2026-07-23: sección "Temporada actual"

Agrega la 4ª sección que había quedado pendiente. El resto de la ficha
(récord, palmarés, rivalidades, salida, parametrización, pila de Escape)
**no se tocó** — solo se sumó código nuevo antes del botón de salida.

### Qué se implementó

**`_pfCurrentSeasonSpots(team)`** — nueva función en `profile.js`:

- **Posiciones de grupo:** todas las fases `type==='groups'` de
  `getForSeason('phases')` donde `team.id` aparece en algún
  `phase.groups[gi]`, **sin filtrar por `published`** (decisión explícita
  del usuario: hoy las 4 fases de grupos de la temporada no están
  publicadas — filtrar las hubiera dejado la sección vacía para todos).
  Se muestran **todas**, sin elegir una — confirmado con datos reales que
  esto no es un caso raro: el equipo **#61 (FK TUPADRE)** está en **2**
  fases de grupos a la vez ("2da División" Grupo A, 5º/8; "Copa del
  Emperador" Grupo E, 4º/4).
- **Próximo partido:** de las mismas fases consideradas arriba, el
  partido con `scheduledDate` futura más cercana — verificado que NO usa
  `m.ronda` para ordenar (ver fila d de la tabla).

### Corrección de spec (verificada leyendo el código, no asumida)

El pedido decía matchear la posición del club por **nombre** contra el
array de `getStandingsForPhase`, asumiendo entradas `{name, pts, ...}`.
Leyendo `calcGroupStandings` (`standings.js:45-50`) las entradas son
`{id, pts, pj, v, e, p, gf, gc, results}` — **sin `.name`**. Y
`phase.groups[gi]` tampoco son nombres: son `teamIds` (confirmado en
`_pubRenderGroupsBroadcast`, `public.js`, que llama a esos mismos arrays
`teamIds`). Matchear por nombre habría comparado contra `undefined` en
todas las filas — la sección hubiera quedado vacía para cualquier club, en
cualquier temporada, siempre. Se implementó matcheando por `.id`
(`groupStandings.findIndex(s => s.id === team.id)`), que además es más
simple y no necesita `_norm` — acá hay una referencia numérica real, a
diferencia de Rivalidades donde la fuente es texto libre del histórico.

### Altura 375×812 — hallazgo real, reportado tal cual salió

Medido con el mismo truco de antes/después (ocultar la sección nueva y
comparar el `bottom` real del último hijo visible, no `scrollHeight` — ver
la nota de la Parte 1 sobre por qué). El modal de la ficha usa
`.modal{max-height:90vh;overflow-y:auto}`, el mismo mecanismo ya presente
en TODOS los modales de este proyecto (incluido `champ-photos-modal`,
aprobado en el Slice A) — no es scroll de página ni del drawer, es el
propio modal center-screen desbordando internamente.

Primer intento (con PJ/pts por fila + "Próximo partido" en dos líneas):
para el club **#61** — el mismo caso real de este pedido — el modal pasó
de **no necesitar** scroll interno a **necesitarlo**: 647px de contenido
antes, 830px después (+183px), contra 669px disponibles. Para el peor caso
real (**#37**, 4 títulos + 5 rivales) el modal YA necesitaba scroll interno
desde antes de este cambio (688px vs 669px) — ahí no hay regresión, solo
más scroll.

El pedido condicionaba explícitamente la fila de PJ/pts a "si entra sin
romper el no-scroll" — no entraba, así que se sacó, y se compactó el
próximo partido a una sola fila (antes: label + fila separada). Resultado
después de compactar: **+138px** en vez de +183px (45px recuperados). Para
**#61**, el contenido total quedó en **785px contra 669px disponibles
(-117px)** — **sigue necesitando scroll interno**, no se pudo cerrar la
diferencia completa con compactación razonable dentro de las clases
nuevas (no toqué `.dossier-section`/`.dossier-section-card`/`.dossier-body`,
son compartidas con las secciones ya aprobadas).

**No decidí unilateralmente forzarlo a cero.** El margen antes de este
cambio era de solo 22px (647 vs 669) para el club #61 — no hay recorte de
texto razonable dentro de una sección con 2 filas de posición + 1 línea de
próximo partido que cierre esa cuenta sin sacrificar legibilidad. Las dos
salidas reales son: (a) aceptar el scroll interno del modal tal cual —
mismo mecanismo que ya tiene aprobado `champ-photos-modal`, no rompe nada,
solo se ve una barra de scroll dentro del modal en vez de todo en una
pantalla; o (b) colapsar "Temporada actual" por defecto (mismo patrón que
ya usa el proyecto en `profileToggleDisclosure` para "Club"/"Mi cuenta" en
el drawer). No implementé (b) sin que se pida — es una decisión de UX, no
una de las que me tocaba resolver sola esta ronda.

### Límite conocido para el Slice C (anotado, no resuelto)

La decisión de NO filtrar por `published` es correcta para la ficha en
modo admin/perfil propio, pero cuando el Slice C abra esta misma ficha
desde la grilla **pública**, un visitante anónimo vería posiciones de
fases que el admin todavía no publicó — y en el resto de la app la
publicación es el gate de visibilidad (`isActiveStatus`/filtros de
`published` en `public.js`). Queda para resolver en el Slice C, probablemente:
público ve solo posiciones de fases publicadas, admin/dueño ve todas. No
se tocó nada de esto ahora.

## Verificación — Parte 2

Nivel 1–2, `window.__TSC_READONLY__ = true` antes de la primera prueba.
Fuente-vs-disco: `_pfCurrentSeasonSpots.toString()` comparado byte a byte
contra el texto exacto leído de `profile.js` con Node — 2156 caracteres,
coincidencia exacta, ANTES de correr cualquier prueba.

| # | Criterio | Nivel | Resultado |
|---|---|---|---|
| a | Club real #61 (2 fases de grupos simultáneas) | 2 | 2 filas: "2da División · Grupo A · 5º/8" y "Copa del Emperador · Grupo E · 4º/4" |
| b | Posición vs. `getStandingsForPhase` directo | 1/2 | Fase 11 grupo 0: `posFromRaw=5, pj=2, pts=2` — Fase 14 grupo 4: `posFromRaw=4, pj=0, pts=0` — **coincide exacto** con lo que devolvió `_pfCurrentSeasonSpots` |
| c.1 | Club en 0 grupos (real, LA BOLSA FC #10) | 2 | Sección "Temporada actual" ausente del DOM |
| c.2 | Club en grupos sin próximo partido (sintético: `dbGetAll` de `'matches'` parcheada a `[]`, restaurada después) | 2/3 | 2 filas de posición visibles, `.dossier-next-match-row` ausente; `dbGetAll` restaurada y verificada |
| d | Próximo partido con 5 partidos sintéticos: uno pasado, uno de ronda alta pero fecha lejana, uno de ronda baja pero fecha lejana, el real más próximo, uno de otro equipo | 1 | Eligió exactamente el de fecha `2026-07-25` (la más cercana futura) — ignoró el pasado y no se dejó engañar por `ronda` en ninguna dirección |
| e | Altura 375×812, clubes #61 y #37 | 2 | Ver sección de arriba — **hallazgo real, no resuelto por mí**: #61 pasa de no-scroll a scroll interno del modal (-117px tras compactar); #37 ya scrolleaba antes, ahora más |
| f.1 | Parametrización sigue intacta (sesión admin club #61, abre ficha del #37) | 1/2 | Muestra "ATL. JUNIOR YOSHUA", no FK TUPADRE |
| f.2 | Pila de Escape (drawer→ficha) sigue con 1 capa por Escape | 2 | Escape #1 cierra solo la ficha, drawer sobrevive; Escape #2 cierra el drawer |
| f.3 | `_histState` sigue sin ensuciarse al cerrar sin salida | 2 | `JSON.stringify` idéntico antes/después |
| g | Consola durante toda la sesión | 2 | Sin errores |
| — | Estado final | 2 | `AUTH` público/sin sesión; `_pfEscStack.length===0` (con espera); `window.__TSC_READONLY__===true` |

## Fuera de alcance (a propósito, Parte 2)

Slice C, filtro por `published` para visitantes públicos (ver límite
conocido arriba), resolución del hallazgo de altura (decisión de UX
pendiente), resolución de renames de rivales, reglas de Firestore.

## Parte 3 — 2026-07-23: 4 correcciones finales antes de cerrar B

Cuatro fixes puntuales. Los tres primeros tocan `_renderClubDossierBody`;
FIX 2 además toca `renderProfileBody` (Slice A, ya commiteado — mismo bug
de trofeo estaba ahí). Nada más de B se tocó.

### FIX 1 — Récord histórico fuera de la ficha

Se eliminó el bloque `_statsHTML(stats)` + `% de victorias` de
`_renderClubDossierBody` (redundante con la tarjeta, instrucción del
usuario). La llamada a `_loadTeamStats` se mantuvo intacta — Rivalidades
sigue saliendo de `stats.rivals`, misma pasada única de siempre. La
tarjeta de perfil no se tocó: conserva su bloque de stats.

### FIX 2 — `loadPalmaresComps()` antes de resolver trofeos (bug real, confirmado)

Causa raíz: `renderProfileBody` y `_renderClubDossierBody` eran los dos
únicos renderers de trofeos de todo el proyecto que no llamaban
`loadPalmaresComps()` antes de usar `PALMARES_COMPS` — todos los demás sí
(`bracket.js:421`, `phases.js:159`, `public-bracket.js:368`, 6 lugares en
`palmares.js`). `PALMARES_COMPS` es un `let` de nivel de script en
`palmares.js`: mutable, global, y sin nada que lo mantenga fresco entre
renders si nadie más lo refrescó antes.

Se agregó `if (typeof loadPalmaresComps === 'function') await loadPalmaresComps();`
— mismo guard textual que `bracket.js:421` — antes de `_pfVitrinaChips`/
`renderTrophy` en ambas funciones. No se tocó `renderTrophy` ni
`TROPHY_RENDERERS`.

**Metodología — el primer intento de verificación fue un falso positivo
silencioso.** Para probar el fix intenté "ensuciar" `PALMARES_COMPS` con
`window.PALMARES_COMPS = PALMARES_COMPS.map(c=>({...c,trophy:'geometrica'}))`.
El chequeo posterior mostró el valor real sin cambios — parecía que el fix
funcionaba, pero en realidad mi propio "ensuciado" nunca tocó nada:
`PALMARES_COMPS` está declarado con `let` a nivel de script en
`palmares.js`, no es una propiedad de `window` (`let`/`const` de nivel de
script NO se cuelgan de `window`, a diferencia de `var`). Estaba
reasignando una propiedad de `window` completamente distinta de la
ligadura real que lee `palmaresCompByKey`. Corregido reasignando el
identificador desnudo (`PALMARES_COMPS = PALMARES_COMPS.map(...)`, sin
`window.`) — recién ahí el "ensuciado" tomó efecto de verdad (confirmado:
`staleForced` pasó a devolver `'geometrica'`), y el chip siguió mostrando
el trofeo real (`'celtica'`) después de abrir la ficha — la prueba de que
`loadPalmaresComps()` corrige el stale de verdad, no que "ya estaba bien"
por casualidad. Ver tabla, fila b, para los números.

### FIX 3 — Fecha del próximo partido corrida un día

`formatInUserTZ` parsea una fecha-sola (`'2026-07-24'`) como medianoche
UTC; con zona horaria al oeste de UTC, el mismo instante cae en el día
anterior — por eso se mostraba "23 jul" para un partido el 24. Nueva
función `_pfFormatScheduledDate(dateStr)`: separa año/mes/día del string y
arma un `Date` local (`new Date(y, mo-1, d)`), sin ninguna conversión de
zona horaria de por medio — hay un día de calendario que preservar, no un
instante. Se usa solo acá; no se tocó ningún otro uso de `formatInUserTZ`
(esos manejan timestamps reales, no fechas-solas).

### FIX 4 — Altura sin scroll, sin colapsables

Con el récord fuera (FIX 1), el hueco se cerró solo: club #61 quedó con
+55px de margen, club #37 (el caso más cargado, 4 títulos + 5 rivales + 2
posiciones + próximo partido) con **+15px** — ambos sin scroll interno del
modal, sin tocar ningún spacing ni recortar rivales. No hizo falta ningún
ajuste adicional.

**Nota de margen, no una falla — probado sintéticamente:** parcheé
`_pfCurrentSeasonSpots` para devolver 3 posiciones de grupo en vez de 2 (un
club en 3 fases de grupos simultáneas — el modelo de datos lo permite, hoy
ningún equipo real llega a eso) y el margen de #37 se va a **-10px**
(vuelve a necesitar scroll). El pedido pedía scroll 0 para el club #37 tal
como existe hoy (2 posiciones) — eso se cumple con margen real medido, no
por poco. Dejo anotado que el margen es angosto (+15px) y no sobrevive a
un tercer grupo simultáneo, por si en el futuro un club llega a jugar 3
competiciones de grupos a la vez.

## Verificación — Parte 3

Nivel 1–2, `window.__TSC_READONLY__ = true` desde el inicio. Fuente-vs-disco
por **hash SHA-256** (más fuerte que comparación de string): `_renderClubDossierBody`,
`_pfFormatScheduledDate` y `renderProfileBody` — los 3 hashes calculados en
Node sobre el archivo en disco coincidieron exactos con los 3 calculados
en el navegador sobre el código cargado, antes de correr cualquier prueba.

| # | Criterio | Nivel | Resultado |
|---|---|---|---|
| a | Ficha sin "Récord histórico"; tarjeta sí lo conserva | 2 | Labels de la ficha: `['Palmarés','Rivalidades','Temporada actual']` (sin "Récord histórico"); tarjeta: bloque de stats presente (`cardHasStatsBlock:true`) |
| b | Trofeo correcto — club #61 (Copa del Emperador → `celtica` en el store) | 1/2 | Con `PALMARES_COMPS` ensuciado de verdad (ver metodología arriba) a `'geometrica'` en TODAS las comps, tras `loadPalmaresComps()` el chip de la ficha y de la tarjeta muestran `svg class="palm-trophy celtica"` — coincide con el store real |
| b.2 | Trofeo correcto — club #37, 4 comps distintas, ficha y tarjeta | 1/2 | `TSC 1RA DIVISION→nebula`, `COPA DEL EMPERADOR→celtica`, `SUPER COPA→barroca` — los 3 coinciden exacto con `PALMARES_COMPS` real en ambos renderers; `LIGA DE CAMPEONES→geometrica` verificado por separado que es el valor REAL del store (no un residuo del ensuciado, que también usaba `'geometrica'` — coincidencia posible, se comprobó aparte) |
| c | Próximo partido club #61 = "24 jul" | 2 | `rawScheduledDate:'2026-07-24'`, `displayedDateText:'24 jul'` — coincide |
| c.2 | Control sintético `_pfFormatScheduledDate('2026-01-01')` | 1 | `'01 ene'` (no `'31 dic'`); control extra fin de mes `'2026-07-31'` → `'31 jul'` (no se corre para adelante tampoco) |
| d | Scroll del `.modal` a 375×812, club #61 y #37 | 2 | #61: contenido 613px / 669px disponibles (margen +55px, `needsScroll:false`). #37: contenido 654px / 669px disponibles (margen +15px, `needsScroll:false`) |
| e.1 | Parametrización (sesión admin club #61 abre ficha del #37) | 1/2 | `.dossier-club-name` = "ATL. JUNIOR YOSHUA" |
| e.2 | Pila de Escape (drawer→ficha) | 2 | Escape #1 cierra solo la ficha, drawer sobrevive; Escape #2 cierra el drawer |
| e.3 | `_histState` intacto al cerrar sin salida | 2 | `JSON.stringify` idéntico antes/después |
| f | Consola durante toda la sesión | 2 | Sin errores |
| — | Estado final | 2 | `AUTH` público/sin sesión; `_pfEscStack.length===0`; `PALMARES_COMPS` restaurado al valor real (`'celtica'` para Copa del Emperador, verificado); `window.__TSC_READONLY__===true` |

## Fuera de alcance (a propósito, Parte 3)

Slice C, filtro por `published`, robustecer FIX4 contra un 3er grupo
simultáneo (anotado como nota de margen, no pedido), resolución de
renames de rivales, reglas de Firestore.

## Después

`graphify update .` corrido tres veces (Parte 1: 2766/7084/49 · Parte 2:
2767/7092/47 · Parte 3: 2768/7094/48).
**Nada de lo anterior está commiteado** — B (con estos fixes, más el fix
de trofeo de la tarjeta) se commitea junto cuando se apruebe.
