# Macro Slice — Calendario admin (post-mejoras) · 2026-07-20

> Estado **verificado en código** (y, en el caso de A, contra los datos reales
> de producción vía CDP de solo-lectura) por Sonnet 5 el 2026-07-20. Pendiente
> de auditoría/aprobación del supervisor antes de implementar. Cada slice se
> ejecuta y cierra por separado — mismo protocolo que `MACRO_SLICE_MEJORAS.md`.
>
> **Nada de este documento está implementado todavía.**
>
> **Auditoría del supervisor (Opus, 2026-07-20):** los 3 diagnósticos de código
> se verificaron línea por línea contra el árbol actual y son exactos. **A, B y C
> aprobados a nivel spec**, con los deltas incorporados abajo (marcados
> «[supervisor 2026-07-20]»). El repair de datos del Slice A (docs 16/17 del 20
> jul) **NO lo ejecuta el supervisor** — lo hace el usuario, o Sonnet con
> confirmación explícita; el texto a conservar sigue **pendiente de decisión**.

---

## 0. Reglas críticas del repo (no cambian)

Mismas que `MACRO_SLICE_FIXES.md` §0 / `MACRO_SLICE_MEJORAS.md` §0: GRAPH FIRST,
nunca tocar/stagear `firebase-config.js`/`cloudinary.js`, `innerHTML` externo
siempre escapado, iconos nuevos SVG (nunca emojis), renderers compartidos
admin/público no se mutan. Verificación con evidencia real (CDP/eval/DOM).

**Regla para este macro:** el Slice A tiene una parte de repair de datos que
escribe contra **Firestore de producción** — se ejecuta a mano, con
confirmación explícita del usuario antes de escribir, igual que el repair
de `matchHistory` del macro anterior.

## 1. Orden y dependencias

| # | Slice | Tamaño | Riesgo | Estado |
|---|---|---|---|---|
| **A** | Fix de duplicados en `calDayLabels` (condición de carrera) | chico | medio (repair toca prod) | ✅ aprobado (spec) · repair NO lo ejecuta el supervisor · texto 20 jul pendiente |
| **B** | Layout lado a lado: Calendario de partidos + Cronograma (desktop) | chico | bajo | ✅ aprobado (spec) con condición del breakpoint |
| **C** | Unificar fecha de jornada (`rondaMeta`) con fecha por partido (`scheduledDate`) | medio | medio | ✅ aprobado (spec) con precisiones de cascada/precedencia |

A y B son independientes entre sí y de C. C es independiente de A/B pero
toca el mismo archivo que además está involucrado en el layout (matches.js
vs calendar.js/index.html — no hay conflicto real de archivos).

---

## Slice A — Fix de duplicados en `calDayLabels`

**Objetivo:** que editar la etiqueta de un día en el Cronograma admin
persista de forma confiable — hoy un día puede terminar con dos documentos
distintos y el que se muestra tras recargar no es necesariamente el último
que escribiste.

**Estado actual (confirmado en código y en vivo contra producción):**
- `_calSaveDayLabel` ([calendar.js:490-512](tsc-src/js/calendar.js#L490)) hace
  `dbGetAll` (¿existe ya un doc para `season+date`?) y si no encuentra nada,
  `dbAdd` uno nuevo. El debounce de 400ms (`clearTimeout` sobre un
  `setTimeout` pendiente) **no** protege contra dos guardados que ya están
  en vuelo: si escribís, esperás el debounce, y volvés a escribir antes de
  que el primer `dbGetAll`+`dbAdd`/`dbPut` termine su viaje a Firestore, el
  segundo guardado también ve "no existe" y también hace `dbAdd`.
- Verificado en vivo: el **20 de julio 2026** tiene HOY dos documentos —
  id `16` (texto `"ghfghfhgfgh"`) e id `17` (texto `"Fecha "`). El 19 de
  julio, que solo se editó una vez, tiene un único documento y persiste bien
  — confirma el patrón (la duplicación solo aparece cuando se edita rápido
  más de una vez).
- Al recargar, `renderAdmCalendarLabels` arma el mapa fecha→texto con
  `Object.fromEntries` sobre lo que devuelve `dbGetAll('calDayLabels', ...)`
  ([calendar.js:528-529](tsc-src/js/calendar.js#L528)) — el orden de
  Firestore no está garantizado, así que puede quedarse con el doc viejo.
  Eso es el síntoma reportado ("cambio el texto... vuelve al anterior").

**Enfoque:**
1. **Serializar por fecha**: en vez de solo debounce, encadenar los
   guardados de una misma fecha con una promesa (`_calLblInFlight[dateStr]`)
   — el guardado N+1 espera a que el guardado N haya terminado (leído y
   escrito) antes de arrancar su propio `dbGetAll`. Elimina la carrera de raíz.
2. **Auto-reparación**: si el `dbGetAll` encuentra **más de un** doc para
   `season+date` (el estado ya roto de hoy, u otro que aparezca), actualizar
   el primero con el texto/tipo actual y borrar los sobrantes con
   `dbDelete`. Así cualquier fecha duplicada se corrige sola la próxima vez
   que se edite, sin necesitar un script aparte.

   > **[supervisor 2026-07-20]** El "keeper" (`existing[0]`) es orden-dependiente
   > (Firestore no garantiza orden), pero **da igual**: se sobreescribe con el
   > texto/tipo actual del DOM. Lo único crítico es **borrar TODOS los demás por
   > su id**. La cola en memoria (`_calLblInFlight`) serializa dentro de UNA
   > pestaña; dos pestañas/dispositivos a la vez podrían duplicar igual, pero
   > para un solo admin + este auto-repair alcanza. Alternativa más robusta pero
   > más invasiva (NO obligatoria): id determinístico `${season}_${date}` →
   > idempotente de raíz, pero cambia el esquema de ids (hoy autoincrement, docs
   > 16/17 numéricos) y requiere migración. Se aprueba la opción de Sonnet tal cual.
3. **Repair puntual de datos (20 jul 2026, producción):** los docs 16/17 no
   se van a auto-reparar solos hasta que alguien vuelva a tocar esa fecha
   con el fix ya desplegado. Hay que decidir con el usuario: ¿nos quedamos
   con el texto del id 17 (`"Fecha "`, el más reciente) y borramos el 16, o
   se deja vacío para que lo vuelva a escribir? **Sin decidir todavía** —
   pendiente de respuesta antes de tocar esos dos docs.

   > **[supervisor 2026-07-20]** Este repair **NO lo ejecuta el supervisor** —
   > lo hace el usuario, o Sonnet con confirmación explícita en el momento (el
   > supervisor solo aprueba el spec, no escribe en Firestore). El "antes" de los
   > docs 16/17 se releé y se muestra recién al momento de ejecutar el repair,
   > no ahora. Decisión del texto: **aún abierta**.

**Archivos:** `calendar.js` (`_calSaveDayLabel`). El repair de datos no es
código del repo — son 1-2 escrituras puntuales a Firestore, ejecutadas a
mano con confirmación en el momento (mismo patrón que el repair de A en
`MACRO_SLICE_MEJORAS.md`).

**Riesgos:** medio — cambia el patrón async del guardado (de "debounce
suelto" a "debounce + cola por fecha"); hay que probarlo con escrituras
rápidas consecutivas para confirmar que ya no duplica, y que el feedback
visual (`cal-lbl-inp--saved`) sigue disparando en el momento correcto.

**Verificación (gate):** escribir dos veces seguidas (rápido, <400ms entre
sí) en la misma fecha y confirmar en Firestore que queda **un solo**
documento con el texto final; recargar la página y confirmar que el texto
mostrado es el que se guardó último; editar una fecha que YA está duplicada
(simulando el estado de hoy) y confirmar que el guardado la consolida a un
solo doc.

**Cierre:** commit `fix(calendario): serializa guardado de etiquetas por fecha y auto-repara duplicados` + nota con qué se hizo con los docs 16/17.

---

## Slice B — Layout lado a lado (Calendario de partidos + Cronograma)

**Objetivo:** en desktop, mostrar "Calendario de partidos" y "Cronograma"
uno al lado del otro en vez de apilados, para aprovechar el ancho y que se
vean como una sola pantalla de planificación.

**Estado actual:** ambos bloques están apilados verticalmente, sin wrapper,
dentro de `#page-calendario-admin` ([index.html:375-384](tsc-src/index.html#L375)):
`.section-lbl` + toolbar (botón "Notificar stream de hoy") → `#adm-calendar-content`
(lista de partidos programados/sin programar, `renderAdmCalendar` en
calendar.js) → `#adm-calendar-labels` (Cronograma, `renderAdmCalendarLabels`).

**Enfoque:** envolver `#adm-calendar-content` y `#adm-calendar-labels` en un
contenedor `.cal-adm-split` con grid de 1 columna por defecto y 2 columnas
desde un breakpoint de escritorio (mismo patrón responsive que `.comps-duo`
en la vista pública, [redesign.css:619-622](tsc-src/css/redesign.css#L619)):
columna izquierda más ancha (Calendario de partidos, filas con más
contenido — equipos, badge de fase, inputs de fecha/hora) y derecha más
angosta (Cronograma, ya es una lista vertical compacta). El toolbar
("Notificar stream de hoy") queda arriba de ambas, fuera del grid, sin
cambios.

> **[supervisor 2026-07-20] Condición del breakpoint:** NO copiar el 1000px de
> `.comps-duo` tal cual. Esa vista pública es **full-width**; la página admin
> tiene **sidebar** (~220px menos), así que a 1000px de viewport las columnas
> quedan ~400/330px. Y la media query que apila los controles de `.cal-adm-row`
> es por **viewport (640px), no por contenedor** → en una columna angosta dentro
> de un viewport ancho las filas siguen en modo row/wrap y se aprietan. Elegir el
> breakpoint desde el **ancho real disponible del contenido admin** (probablemente
> ~1200px viewport) y **verificar en el borde del breakpoint** que `.cal-adm-row`
> no desborde ni se vea feo.

**Archivos:** `index.html` (agregar el wrapper `<div class="cal-adm-split">`
alrededor de los dos `<div>` existentes), `calendar.css` (clase nueva +
media query). No toca el markup interno de `renderAdmCalendar` ni de
`renderAdmCalendarLabels` — ambos siguen pintando dentro de sus mismos ids.

**Riesgos:** bajo. `.cal-adm-row` ya tiene `flex-wrap:wrap` y un mobile
override a `flex-direction:column` ([calendar.css:56-70](tsc-src/css/calendar.css#L56),
[calendar.css:469](tsc-src/css/calendar.css#L469)), así que en una columna
más angosta sus controles internos ya saben apilarse sin overflow.

**Verificación (gate):** en desktop ancho, Calendario a la izquierda y
Cronograma a la derecha, visibles sin scroll horizontal; en mobile/tablet,
apilados como hoy; el botón "Notificar stream de hoy" y el resto de la
página sin regresión.

**Cierre:** commit `feat(calendario): layout de 2 columnas en desktop (Calendario de partidos + Cronograma)`.

---

## Slice C — Unificar fecha de jornada con fecha por partido

**Objetivo:** que asignar la fecha de un partido, sea desde "Partidos →
Fecha N → Fecha" (nivel jornada) o desde "Calendario" (nivel partido
individual), se refleje del otro lado también.

**Estado actual (confirmado en código):** hay 3 campos de fecha que no se
sincronizan:
1. `phase.rondaMeta[grupo_ronda_date]` — fecha sugerida de la jornada,
   escrita por `saveJornadaDate` ([matches.js:543-565](tsc-src/js/matches.js#L543))
   vía el botón "FECHA" del modal `openAssignDateToJornada`
   ([matches.js:508-541](tsc-src/js/matches.js#L508)). Es lo que se ve como
   "20 jul 2026 (programada)" en el encabezado de la jornada.
2. `m.scheduledDate`/`m.scheduledTime` — fecha/hora por partido individual,
   escrita SOLO desde la página admin "Calendario" (`_calSave`,
   [calendar.js:36-45](tsc-src/js/calendar.js#L36)).
3. `m.playedAt` — timestamp real de cuándo se jugó (se fija al cargar
   resultado, o se puede forzar con "Aplicar a todos" en el mismo modal de
   Fecha).

  La página "Calendario" arma su lista filtrando **solo** por
  `m.scheduledDate` ([calendar.js:271](tsc-src/js/calendar.js#L271)) — nunca
  mira `rondaMeta`, así que un partido con fecha de jornada pero sin
  `scheduledDate` propio no aparece ahí. Al revés, el encabezado "Fecha N"
  en Partidos (`formatJornadaDateRange`, [matches.js:392-399,466-501](tsc-src/js/matches.js#L392))
  solo mira `m.playedAt` (jugados) o `rondaMeta` — nunca `m.scheduledDate`
  de partidos pendientes, así que programar desde Calendario tampoco se ve ahí.

  (La página Calendario admin y el calendario **público** ya están
  sincronizados entre sí — ambos leen `m.scheduledDate`/`scheduledTime`. El
  gap es puntualmente entre "Fecha" de Partidos y todo lo demás.)

**Enfoque (sin sincronización bidireccional en tiempo real — cada lado lee
la fuente que le falta):**
1. **`saveJornadaDate` cascada a los partidos:** además de escribir
   `rondaMeta`, setear `m.scheduledDate` en los partidos de esa ronda —
   con "Solo programar" **solo en los que todavía no tengan `scheduledDate`
   propio** (no pisar lo ya programado a mano en Calendario); con "Aplicar
   a todos" sobrescribir todos (mismo criterio agresivo que ya usa hoy para
   `playedAt`).

   > **[supervisor 2026-07-20]** Precisar: "Solo programar" (`applyAll=false`)
   > setea `scheduledDate` solo a los que no lo tengan y **no toca `playedAt`**;
   > "Aplicar a todos" (`applyAll=true`) setea `scheduledDate` en todos
   > **ADEMÁS** de seguir escribiendo el `playedAt` que ya hace hoy (escribe los
   > dos campos, no lo reemplaza). En ambos casos **preservar `scheduledTime`
   > existente** — `rondaMeta` no tiene hora, así que la cascada solo toca la fecha.
2. **El encabezado de jornada también lee `scheduledDate`:** extender
   `formatJornadaDateRange`/`renderRondasAdmin` para que, cuando no hay
   partidos jugados ni `rondaMeta`, calcule el rango a partir de los
   `m.scheduledDate` de los partidos pendientes de esa ronda (misma función
   de formateo, una fuente adicional). Así programar desde Calendario
   también se refleja en Partidos sin escribir de vuelta en `rondaMeta`.

   > **[supervisor 2026-07-20]** Precedencia exacta del display: (1) jugados →
   > rango de `playedAt`; (2) si no, `rondaMeta` defaultDate → "(programada)"
   > single; (3) si no, **rango de `scheduledDate` de pendientes → "(programada)"**
   > (nuevo); (4) si no, null. OJO: los `scheduledDate` de pendientes pueden ser
   > **varias fechas distintas** → formatear como **rango + "(programada)"**, no
   > fecha única. Hoy `formatJornadaDateRange` solo maneja un `defaultDate` single
   > para el caso "programada" — extenderlo reusando la lógica de rango que ya
   > tiene la rama de jugados y agregarle el sufijo "(programada)".

**Archivos:** `matches.js` (`saveJornadaDate`, `formatJornadaDateRange`,
`renderRondasAdmin`). No toca `calendar.js` ni el calendario público (ya
están sincronizados entre sí, como se explicó arriba).

**Riesgos:** medio — la cascada de "Solo programar" tiene que respetar
fechas ya puestas a mano por partido (chequear `m.scheduledDate` antes de
sobrescribir); "Aplicar a todos" ya tiene precedente idéntico con
`playedAt`, mismo criterio.

**Verificación (gate):** casos cruzados — (a) asignar fecha desde
Partidos → Fecha N → "Solo programar": los 4 partidos de esa jornada
aparecen en Calendario con esa fecha; (b) asignar fecha a un partido
individual desde Calendario: el encabezado "Fecha N" en Partidos la
muestra; (c) un partido con fecha propia distinta en Calendario NO se pisa
al hacer "Solo programar" sobre su jornada; (d) "Aplicar a todos" sí
sobrescribe todos, incluyendo los que ya tenían fecha propia.

**Cierre:** commit `feat(partidos): unifica fecha de jornada y fecha por partido (Fecha ↔ Calendario)`.

---

## Notas de cierre del macro

- Cada slice: pre (este documento) → aprobación del supervisor → Sonnet
  implementa → post (diff/pruebas/evidencia real) → auditoría → OK → commit
  sin push.
- A es el único con repair de datos en producción — **el supervisor NO lo
  ejecuta** (lo hace el usuario, o Sonnet con confirmación explícita); decisión
  del texto del 20 de julio aún pendiente antes de tocar los docs 16/17.
- B y C son solo cambios de código en `tsc-src/` — se verifican con
  `npx serve tsc-src` + CDP, sin build Android.
- Tras cerrar cada slice: `cd tsc-src && graphify update .`.
