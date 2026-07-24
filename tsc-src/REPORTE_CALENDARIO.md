# Reporte — Calendario: zona horaria + centrado en vivo/hoy

> Parte A (zona horaria de los partidos) + Parte B (centrado del metro en
> vivo/hoy, #5), ambas en `calendar.js`. Verificación Nivel 1–2, cero
> escrituras, según `PROTOCOLO_VERIFICACION.md`. **Nada de lo de abajo está
> commiteado.**

## Decisiones ya tomadas (no reabiertas)

Referencia = hora de Lima (America/Lima, UTC−5, sin DST); input/guardado
sin cambios, solo visualización. Jornada entera junta: no se parte al
cruzar medianoche del viewer, se ubica por el instante de su PRIMER
partido.

## Parte A — Zona horaria

### Helpers nuevos

- **`_pfViewerTimezone()`** (`profile.js`) — extraída de `formatInUserTZ`
  (perfil > `localStorage.tsc_timezone` > `Intl` del navegador), sin
  cambiar su comportamiento. `formatInUserTZ` ahora la llama en vez de
  reimplementar la cadena de fallback. Único punto de resolución — lo que
  pedía el enunciado ("misma resolución de tz que formatInUserTZ").
- **`_CAL_LIMA_OFFSET = '-05:00'`** (`calendar.js`), con comentario.
- **`_calMatchInstant(m)`** — instante real del partido
  (`${scheduledDate}T${scheduledTime}:00-05:00`), o `null` si no hay fecha.
- **`_calMatchTimeLocal(m)`** — hora del partido vía `formatInUserTZ` sobre
  ese instante; degrada a la hora de Lima cruda solo si no hay instante o
  `formatInUserTZ` no está disponible (no debería pasar).
- **`_calLocalDateStr(inst)`** — `YYYY-MM-DD` local del viewer para un
  instante, vía `Intl.DateTimeFormat('en-CA', {timeZone: _pfViewerTimezone()...})`.
- **`_calJornadaViewerDate(dateStr, ms)`** — fecha local del viewer de una
  jornada completa, del instante del PRIMER partido (`ms[0]`, ya viene
  ordenado por hora); sin partidos (día solo-label) cae a la fecha de Lima
  tal cual — no hay instante que convertir.

### Aplicado en

1. **Hora mostrada**: `metroMatch` (línea del `mm-time`), `_calHeroHtml`
   (hora del hero), `_calInitHeroCountdown` (rama degradada sin
   `MOTION.countdown`). Los tres antes hacían `scheduledTime.substring(0,5)`.
2. **Fecha del encabezado de jornada**: `metroDay` — `_calFormatDay` ahora
   recibe `jornadaViewerDate[dateStr]` (precalculado una vez para todas
   las fechas), no `dateStr` crudo. `_calHeroHtml`'s `when` también.
3. **Clasificación pasado/hoy/futuro**: `pastDates`/`futureDates` (antes
   `allDatesFull.filter(d => d < today)`) y `metroDay`'s propio
   `isPast`/`isToday` — ambos comparan `jornadaViewerDate[d]` contra
   `today`, no la fecha de Lima cruda.
4. **Countdown**: `_calInitHeroCountdown`'s `target` = `_calMatchInstant(m)`
   (real, con offset), no `new Date(...)` sin zona.

`byDateAll` sigue keyed por fecha de Lima — no se reagrupó ninguna
jornada. `data-cal-date` también sigue siendo la clave de Lima (es lo que
usa el ancla de la Parte B para encontrar el elemento a scrollear).

### Discrepancia de spec encontrada (leyendo el código, no asumida)

El pedido citaba "calendar.js 560-562" como una segunda instancia de la
clasificación pasado/hoy/futuro a corregir. En esas líneas hoy vive
`renderAdmCalendarLabels` — el grid MENSUAL del cronograma admin (labels
Libre/Sorteo por día), que compara días de un CALENDARIO GENÉRICO contra
`_calTodayStr()`, sin ningún `scheduledDate`/`scheduledTime` de partido de
por medio — no es el mismo patrón (no hay instante de partido que
convertir). No se tocó. La segunda instancia real del patrón descrito
(Lima-vs-viewer) estaba en `metroDay` (`isPast`/`isToday` propios,
separados de `pastDates`/`futureDates`), que sí se corrigió.

### Fuera de alcance, anotado (no tocado)

`upcoming` (candidato a hero, filtro `m.scheduledDate>=today`) sigue
comparando string de Lima contra `today` del viewer — mismo patrón, pero
tocarlo cambia CUÁL partido se elige como hero en casos límite (no es un
problema de visualización, es de selección) — no estaba en el alcance
explícito y no se tocó.

## Parte B — Centrado en vivo/hoy

### Ancla

`anchorDateStr` = partido en vivo (si tiene `scheduledDate` propio, o sea
si aparece en `byDateAll`) → si no, el día de HOY con algo que mostrar
(partidos o label) → si no, `null` (comportamiento de siempre).

### Ventana de pasado + garantía dura

Con ancla: se retrocede desde su índice en `allDatesFull` acumulando
~mitad de `HORIZON_ROWS` (5 filas) de días pasados, mismo patrón que el
recorte del horizonte ya existente. `visibleDates = allDatesFull.slice(pastStart)`
— incluye el ancla y todo lo futuro sin importar si el ancla cae
técnicamente del lado "pasado" de la clasificación (un vivo tardío).
Después del recorte a `HORIZON_ROWS`, una **garantía dura** fuerza el
`cutoff` a incluir el ancla si el recorte por filas la hubiera dejado
afuera — así nunca queda detrás de "Cargar más", ni siquiera si su propia
jornada excede el presupuesto de filas por sí sola.

### Bug real encontrado y corregido (no estaba en el pedido, pero bloqueaba lo pedido)

El CTA "Calendario completo" del hero (`.hm-cta-cal`) resuelve su destino
recién al hacer click — a diferencia de los otros CTAs (H2H, competición),
que resuelven su elemento UNA vez al cablear. El problema: ese click
buscaba con `scope.querySelector(...)`, y `scope` puede ser el
**staging wrapper** de la actualización atómica (`_calCommitStage`) — que
para el momento del click YA fue vaciado (sus hijos se movieron al
contenedor estable `#pub-calendar-content`). Resultado: en cualquier
RE-render (cualquier actualización después del primer montaje — que es
exactamente lo que dispara un partido en vivo), el botón buscaba en un
nodo vacío y `scrollIntoView` nunca se llamaba. **Esto ya pasaba con el
`.metro` original, antes de este slice** — mi cambio solo lo heredó al
agregar la búsqueda del ancla al mismo lugar, y sin arreglarlo el
requisito pedido ("el scroll debe centrar el ancla") no podía funcionar
más allá del primer montaje.

Fix: `_calWireHero` recibe un tercer parámetro `container` (el nodo
`#pub-calendar-content`, que nunca se reemplaza, solo se le reemplazan los
hijos) y lo usa para la búsqueda en vez de `scope`. Los dos call sites
(`_calWireHero(stage, ...)`) pasan `el`. Se corrigieron ambas búsquedas
(ancla Y el fallback `.metro`), porque son el mismo patrón en el mismo
handler — dejar una corregida y la otra no hubiera sido inconsistente sin
motivo.

## Corrección (ronda 2) — el centrado real solo vivía en el click del CTA

El ancla (vivo/hoy) y la ventana de días de la Parte B eran correctas, pero
el CENTRADO EFECTIVO del scroll solo ocurría dentro del click handler de
`.hm-cta-cal` (`_calWireHero`). En el render inicial no había ningún scroll:
el `.metro` (scroll interno propio, `max-height:520px; overflow-y:auto`)
cargaba con `scrollTop=0` y mostraba el PRIMER día de la ventana — un día
PASADO (la ventana incluye pasados arriba del ancla, a propósito) — en vez
del vivo/hoy. Resultado reportado: el calendario abría mostrando "ayer" en
vez del partido en vivo o del día de hoy.

### Fix

- **`_calAnchorDateStr`** (`calendar.js`) — variable de módulo nueva, fijada
  al final del cálculo de `anchorDateStr` dentro de `renderPubCalendar()`
  (y a `null` en la rama sin `visibleDates`, donde no hay `.metro` que
  montar). Es la forma en que el render "publica" su ancla para que algo
  fuera de la función pueda centrar DESPUÉS, cuando el layout ya es real.
- **`_calCenterAnchorScroll()`** (`calendar.js`, nueva) — centra
  `_calAnchorDateStr` dentro del scroll INTERNO del `.metro`, con
  `scrollTop` calculado a mano (no `scrollIntoView`, que en el sitio
  público burbujea al scroll CONTINUO de la página y arrastraría toda la
  página a la sección):
  ```js
  const delta = aEl.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
  scroller.scrollTop = Math.max(0, scroller.scrollTop + delta - (scroller.clientHeight - aEl.clientHeight)/2);
  ```
  No-op si no hay ancla o no hay `.metro` montado (off-season, rama sin
  `visibleDates`).
- **Punto de enganche — `_focusPublicSectionInner`** (`nav.js`, dentro de
  `if(changed || opts.forceLive)`, justo después de
  `await _subscribeFocusedPublicSection(...)`): mismo bloque donde hoy ya
  arranca `liveRadarStart()` al enfocar el Calendario. En ese punto el
  render (mount o forceRefresh) ya terminó y asentó un `requestAnimationFrame`
  (`_calRafOrTimeout`), así que el layout es real — no hay riesgo de medir
  contra un contenedor con `display:none`/altura 0 de un pre-montaje oculto.
  Se llama UNA sola vez por transición real de foco (`changed`) o refresco
  forzado (`forceLive`, cambio de temporada) — nunca en cada re-render con
  la sección YA enfocada (la suscripción en vivo puede refrescar el
  calendario por cambios ajenos al ancla mientras el usuario navega el
  metro a mano; recentrar en cada uno de esos refrescos pelearía contra ese
  scroll manual). El click del CTA `.hm-cta-cal` no se tocó — sigue usando
  `scrollIntoView({block:'center'})`, correcto ahí porque es una acción
  explícita del usuario.

### Verificación de la corrección — Nivel 1-2/3, fuente-vs-disco antes de medir

Hash SHA-256 de `_calCenterAnchorScroll`, `renderPubCalendar` y
`_focusPublicSectionInner` (navegador vs. disco) — las 3 coincidieron
exactas antes de correr cualquier prueba.

| # | Criterio | Nivel | Resultado |
|---|---|---|---|
| a | Dataset sintético: 4 días pasados + vivo en un día del medio + 3 futuros (Nivel 3, `getForSeason` envuelta, restaurada). Al mostrar, ¿centra? | 2/3 | Ancla = día del vivo (`2026-07-23`). `scroller.scrollTop=105`, `clientHeight=520`, `scrollHeight=656`. Horizonte: `[21,22,23,24,25]` — 2 días pasados arriba del ancla, 2 después. Punto medio del ancla relativo al scroller: `169 + 181/2 = 259.5` ≈ `clientHeight/2 = 260` — centrado |
| b | El scroll de la PÁGINA no se mueve por el centrado | 1 | `document.scrollingElement.scrollTop` y `window.scrollY`: `0` antes y después, sin cambio |
| c | Sin vivo, con partidos hoy (Nivel 3) | 2/3 | Ancla = `"2026-07-24"` = `_calTodayStr()`. `scrollTop=83`. Horizonte `[22,23,24,25,26]` — pasados arriba, futuros abajo |
| d | Sin ancla (ni vivo ni hoy) — requirió además envolver `dbGetAll('calDayLabels')` a `[]` porque hoy (24 jul) tiene una etiqueta real ("Copa del Emperador... Dia 2") que por sí sola calificaba como ancla | 2/3 | `anchorDateStr=null`. `scrollTop` sigue en `0` antes Y después de llamar `_calCenterAnchorScroll()` — comportamiento de siempre, sin tocar el scroll |
| e | CTA `.hm-cta-cal` sigue centrando al click (no se tocó su código) | 2 | Con vivo sin comp (`phaseId:null`, forzado para que renderice `.hm-cta-cal`): click → `scrollIntoView` llamado con `{behavior:'smooth', block:'center'}` sobre el elemento del ancla — idéntico a antes de esta corrección |
| f.1 | Off-season (Nivel 3, matches=[] y calDayLabels=[]) | 2/3 | Hero "Sin partidos"; `_calAnchorDateStr===null`; llamar `_calCenterAnchorScroll()` no lanza error (no hay `.metro`) |
| f.2 | "Cargar más" con datos reales | 2 | 2 días → click → 3 días, sin errores |
| f.3 | Consola durante toda la sesión | 2 | Sin errores, revisada en 3 puntos |
| — | Datos reales (sin mocks), tras recargar | 2 | Ancla = hoy (`2026-07-24`); `scrollTop=318`, `clientHeight=520` — no arranca en 0/"ayer" |
| — | Estado final | 2 | `getForSeason`/`dbGetAll` restauradas (verificado: ningún monkeypatch queda instalado); `window.__TSC_READONLY__===true` |

### Limitación conocida, dejada a propósito (decisión del usuario)

`_calTodayStr()` usa el reloj/zona REAL DEL DISPOSITIVO y no responde al
override `localStorage.tsc_timezone` (a diferencia de `_pfViewerTimezone`,
que sí lo respeta) — ver el caso Nairobi documentado en la ronda anterior de
este mismo slice. Esto puede producir una divergencia interna
dispositivo-vs-override en la clasificación pasado/hoy/futuro bajo un
override activo. El usuario decidió NO arreglarlo — queda anotado acá,
fuera de alcance, no tocado en esta corrección.

## Verificación (Parte A + Parte B originales)

`window.__TSC_READONLY__ = true` desde el inicio. **Cero llamadas a
`dbAdd`/`dbPut`/`dbDelete`.** Fuente-vs-disco por hash SHA-256 en dos
rondas (antes y después del fix del CTA) — 9 y 2 funciones respectivamente,
todas coincidieron exactas antes de medir.

| # | Criterio | Nivel | Resultado |
|---|---|---|---|
| c | Instante absoluto NO depende de la zona del viewer | 1 | `_calMatchInstant` da el mismo `getTime()` bajo `America/Lima` y `Africa/Nairobi` |
| d | Control Lima: hora tecleada == mostrada | 1/2 | Partido real #1000 (19:00 Lima) → `_calMatchTimeLocal` = `"19:00"`; en el metro, con `tsc_timezone='America/Lima'`, el mismo valor aparece en `.mm-time` |
| a | Cambio de zona: la hora mostrada cambia y es la correcta | 1 | Nairobi (UTC+3): `_calMatchTimeLocal` = `"03:00"` para el mismo partido (calculado a mano: 2026-07-24T19:00-05:00 = 2026-07-25T00:00Z, +3h = 03:00) — distinto de Lima (`"19:00"`) |
| b | Cruce de día: jornada entera bajo un encabezado, fecha = local del viewer | 1 | `_calJornadaViewerDate('2026-07-24', [19:00, 22:30])` = `"2026-07-25"` (el primer partido cruza medianoche en Nairobi); encabezado `_calFormatDay(...)` = "Sábado, 25 de julio". El SEGUNDO partido de esa misma jornada (22:30 Lima) convierte a `"06:30"` Nairobi — hora propia distinta, misma jornada/encabezado |
| — | Regresión de clasificación con datos reales (sin override) | 2 | `today="2026-07-23"`, jornada de ese mismo día correctamente detectada como ancla "hoy" (`jornadaViewerDate["2026-07-23"]==="2026-07-23"` sin override) |
| e.1 | Vivo entra en el horizonte inicial (real: 14 filas por sí solo, excede el presupuesto) | 2/3 | Con un partido real marcado vivo (Nivel 3, `getForSeason` envuelta, restaurada) en un día de 14 filas: día anterior (pasado) + el día vivo, **ambos en el horizonte inicial** gracias a la garantía dura — sin ella hubiera quedado afuera |
| e.2 | Vivo centrado: días pasados arriba (caso con menos filas por día) | 2/3 | Vivo en un día de 8 filas: 1 día pasado antes, el vivo después — confirma la ventana de pasado, no ausencia total como antes |
| e.3 | Sin vivo: centra en hoy | 2 | `anchorDateStr` con datos reales (sin override) = fecha de hoy; horizonte = [ayer, hoy] |
| e.4 | Scroll centra el ancla (bug del CTA descubierto y corregido) | 1/3 | Escenario controlado replicando el staging real (cablear sobre `scope` vacío tras "commit"): antes del fix, `scrollIntoView` nunca se llamaba; después, se llama sobre el elemento del ancla con `block:'center'`. Caso sin ancla: cae a `.metro` con `block:'start'` (comportamiento de siempre, confirmado sin cambios) |
| f.1 | Off-season sigue intacto | 2 | Con 0 partidos y 0 labels (Nivel 3, `getForSeason`/`dbGetAll` envueltas, restauradas): hero muestra "Sin partidos" / "La temporada no tiene partidos programados..." — igual que siempre |
| f.2 | "Cargar más" sigue funcionando | 2 | Con datos reales: 2 días en el horizonte inicial → click en "Cargar más" → 3 días, sin errores |
| f.3 | Consola durante toda la sesión | 2 | Sin errores, revisada en múltiples puntos |
| — | Estado final | 2 | `getForSeason`/`dbGetAll` restauradas y verificadas idénticas a las originales; `window.__TSC_READONLY__===true` |

## Fuera de alcance (a propósito)

`upcoming` (selección de hero, ver nota arriba), `renderAdmCalendarLabels`
(grid admin, discrepancia de spec anotada arriba), robustecer el ancla
contra 3+ fases de grupos simultáneas (no aplica acá — es de la ficha de
club, otro archivo).

## Después

`graphify update .` corrido — mount inicial (2773 nodos, 7114 edges, 46
comunidades); tras la corrección de esta ronda (2774 nodos, 7117 edges, 47
comunidades). **Nada de lo anterior está commiteado.**
