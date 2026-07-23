# Reporte — Tarjeta del club: Slice A (vitrina) + Modal de fotos

> Ejecuta `MACRO_SLICE_TARJETA_CLUB.md` §2 (Slice A) + §4 (modal de fotos).
> Los Slices B y C (ficha de club) **no se tocaron**. Verificación Nivel 1–2
> exclusivamente, según §5 riesgo #1 del macro y `PROTOCOLO_VERIFICACION.md`.
> **Nada de lo de abajo está commiteado.**

## Parte 1 — 2026-07-22

### Qué se implementó

**A.1 — Contador de títulos.** Badge `×N` superpuesto en la esquina
inferior-derecha del crest (`profile.js:190-192`, `.pp-titles-badge` en
`redesign.css`). Ausente si `titlesTotal === 0`. Se posiciona como overlay
del propio crest (no como tercer elemento en la fila `.pp-id`) para no
competir por ancho horizontal con el nombre del club — relevante en 375px
con nombres largos.

**A.2/A.3 — Bloque VITRINA.** Un chip por competición ganada
(`.pp-vitrina-chip`, trofeo `renderTrophy(key,22)` + label + `×N`),
ordenados por `PALM_IMPORTANCE` (no por columnas de `PALMARES_COMPS`).
Color del chip vía `color-mix(in srgb, var(--chip-color) X%, ...)`
(mismo patrón ya usado en `redesign.css` para `.stand-row:hover` y otros).
Botón "Fotos de campeón" solo si `hasChampionPhotos` (`profile.js:234-250`).

**A.4 — Estados vacíos.** Sin títulos → `.pp-vitrina` no se renderiza en
absoluto (verificado, ver Nivel 2 más abajo). Con títulos pero sin fotos en
ninguno → el bloque se ve, el botón no (sin placeholder).

**Modal "Fotos de campeón"** (`openChampionPhotosModal(teamId, triggerEl)`,
`profile.js:875`): miniaturas agrupadas por `palmares.{id}` vía
`_palmGallerySafeItems(rec.gallery)`, ordenadas por `PALM_IMPORTANCE`. Botón
"Editar imágenes" → `openPalmaresGallery(recordId)` (el gestor admin
existente, sin duplicar) solo si `AUTH.role==='admin'`.

**Visor ampliado** (`openPhotoViewer`/`closePhotoViewer`, `profile.js:891+`):
nuevo, no existía nada parecido en la app. Sigue el mismo ciclo de vida que
el drawer de perfil (`_injectProfileModal`/`_profileTrapKeydown`):
`MutationObserver` sobre la clase `.open` hace setup/teardown (listener de
teclado, `body.photo-viewer-open` para bloquear scroll, devolución de foco)
sin importar la vía de cierre. Diferencia deliberada con el precedente:
como el visor puede quedar anidado sobre el modal de fotos, Escape se
maneja con `stopPropagation()` en el propio handler en vez de delegarse al
listener global de `ui-utils.js` — ese handler cierra **todos** los
`.modal-overlay.open` de un tirón, y acá solo debía cerrarse el visor.
Flechas ←/→ navegan dentro del grupo; prev/next se ocultan si el título
tiene una sola foto.

### Decisión de implementación no pedida explícitamente por el macro

El macro cita `aggregatePalmaresByTeam()` como el recurso a reusar para el
`_total`. En la práctica, A.4 necesita saber si **algún** título del club
tiene fotos — dato que esa función no expone (solo cuenta, no trae
`gallery` ni `id`). Traer los registros crudos del club (`_pfTeamTitles`,
`profile.js:117`) alcanza para todo: total, chips agrupados y detección de
fotos, en una sola lectura de `palmares` en vez de dos. La única función de
`aggregatePalmaresByTeam()` que sí se usa indirectamente es su forma de
tallying, reimplementada en `_pfVitrinaChips` sobre los registros ya
traídos.

## Verificación

Todo con `window.location` en `localhost:3000` (Firestore de producción,
sin sandbox). **Cero llamadas a `dbAdd`/`dbPut`/`dbDelete`/etc en toda la
sesión** — solo `dbGet`/`dbGetAll` (lecturas) y mutaciones en memoria de
`AUTH`/`_pfTeamTitles` restauradas en `finally` y verificadas después.

| # | Qué | Nivel | Resultado |
|---|---|---|---|
| 1 | `_pfVitrinaChips([])` (club sin títulos) | 1 | `[]` |
| 2 | 6 títulos sintéticos: 2 comps normales + 1 copa custom no registrada + 1 copa "borrada" | 1 | 3 chips (4 títulos), los 2 huérfanos se descartan sin excepción — `discardedOrphan: true` |
| 3 | Orden de los 3 chips restantes | 1 | `['LIGA DE CAMPEONES','COPA DEL EMPERADOR DE LA TSC','TSC 2DA DIVISION']` — coincide con `PALM_IMPORTANCE` (índices 0, 2, 4), no con el orden de columnas |
| 4 | `_pfCompImportanceIdx('NO_EXISTE')` | 1 | `5` = `PALM_IMPORTANCE.length` (va al final, no rompe el sort) |
| 5 | Equipo real **#37** (7 títulos en 4 competiciones, 2 con galería) | 1/2 | `_pfTeamTitles` trae 7; `_pfVitrinaChips` da 4 chips cuya suma de `×n` = 7 = `_total` (criterio de aceptación del macro, dato real) |
| 6 | Equipo real **#41** (5 títulos, **cero** fotos en los 5) | 1 | `hasChampionPhotos === false` con datos reales de producción (no hizo falta sintetizar este caso: ya existe) |
| 7 | Equipo real **#1** (sin ningún título) | 1/2 | `_pfTeamTitles` → `[]`; con `AUTH` sintético renderizando la tarjeta real: `document.querySelectorAll('.pp-vitrina').length === 0` y `.pp-titles-badge` también 0 |
| 8 | Modal de fotos para equipo #37, `AUTH.role` real = `'public'` | 1 | 2 grupos (los 2 títulos con galería, los 5 sin foto quedan fuera), 9 miniaturas (5+4), **0** botones "Editar imágenes" |
| 9 | Mismo modal, `AUTH.role` mutado a `'admin'` en memoria (sin tocar sesión real) | 3 | 2 botones "Editar imágenes" (uno por grupo), 9 miniaturas sin cambio; `AUTH.role` restaurado a `'public'` después y **reverificado** (`roleRestored: true`, re-render posterior confirma 0 botones de nuevo) |
| 10 | Visor: abrir, Escape | 2 | El visor cierra (`viewerOpen: false`) y el modal de fotos **sigue abierto** debajo (`champModalOpen: true`) — confirma que `stopPropagation` evita que el handler global cierre ambos |
| 11 | Visor: `body.photo-viewer-open`, foco al abrir | 2 | Tras el abrir: `document.activeElement` es el botón de cerrar (`.pv-close`), `body` tiene la clase de bloqueo de scroll |
| 12 | Visor: cerrar (Escape), foco después | 2 | `document.activeElement` es exactamente la miniatura que abrió el visor; `body.photo-viewer-open` removida; `_champViewerPos === null` |
| 13 | Visor: Shift+Tab desde el botón cerrar (primero) | 2 | Cicla al último enfocable (`.pv-next`) — trampa de foco funciona |
| 14 | Visor: flecha derecha en grupo de 5 fotos | 2 | Índice avanza de 1→2 (`photoViewerStep`) |
| 15 | Altura de tarjeta 375×812, equipo real #37, **antes** (vitrina oculta con `display:none`) vs **después** | 2 | antes: 316px de contenido · después: 482px · delta 166px · disponible en `.pp-body`: 662px → **ninguno de los dos necesita scroll** (criterio del macro) |
| 16 | Altura de tarjeta 375×812, peor caso sintético (título en las 5 competiciones, las 5 con foto) | 2/3 | 5 chips, badge `×5`, contenido 522px vs 662px disponibles → **tampoco necesita scroll** en el caso límite; función `_pfTeamTitles` parcheada en memoria y restaurada (`fnRestored: true`) |
| 17 | Consola del navegador durante toda la sesión | 2 | Sin errores (`read_console_messages` con `onlyErrors:true` → vacío, verificado dos veces) |
| 18 | Estado de `AUTH` al final de la sesión | 2 | `{role:'public', teamId:null, hasUser:false}` — idéntico al inicial, todas las mutaciones Nivel 3 quedaron restauradas |

### Nota sobre una medición fallida en el camino

El primer intento de medir "antes/después" con `body.scrollHeight` dio
`deltaPx: 0` en ambos casos — resultado engañoso, no un hallazgo real:
`scrollHeight` de un contenedor con `overflow-y:auto` nunca baja de
`clientHeight` cuando el contenido no desborda (definición de la propiedad,
no bug de la app), así que con contenido más corto que el contenedor
disponible la métrica queda ciega a cualquier diferencia. Se corrigió
midiendo el `bottom` real del último hijo visible de `.pp-body` en vez del
`scrollHeight` del contenedor — ahí apareció el delta real de 166px (fila
#15). Encontrar esto comparte el motivo del Nivel 4 explícitamente prohibido
sin autorización: una técnica de medición mal elegida puede dar un "todo
bien" falso sin que nada truene.

## Fuera de alcance (según el macro, no tocado)

Slice B (ficha de club / `openClubDossier`), Slice C (grilla pública
accionable), reglas de Firestore para que un presidente suba sus propias
fotos, y el filtro `https://` de `_palmGallerySafeItems`. Nada de esto se
tocó en esta sesión.

## Parte 2 — 2026-07-22 (correcciones del supervisor)

Tres hallazgos sobre lo de la Parte 1, ninguno bloqueante para lo ya
aprobado. Los tres corregidos.

### 1) Escape cerraba de más (el real)

El visor quedó protegido contra el handler global en la Parte 1
(`stopPropagation`), pero el modal de fotos no — y el modal de fotos
también puede quedar anidado sobre el drawer de perfil
(`.profile-backdrop.open`, incluido en el mismo selector del handler
global de `ui-utils.js:10`). Un Escape con el drawer + el modal de fotos
abiertos cerraba los dos de un tirón.

**Por qué el fix no fue "copiar el mismo `stopPropagation` al modal de
fotos" tal cual:** con 3 capas (drawer → fotos → visor), agregarle a CADA
capa su propio listener de captura con `stopPropagation()` no alcanza —
los listeners de captura sobre el mismo nodo (`document`) se ejecutan en
orden de **registro**, no de anidamiento visual, y `stopPropagation()` (a
diferencia de `stopImmediatePropagation()`) no impide que listeners
posteriores en el mismo nodo se disparen. Con drawer y fotos ya
registrados y el visor abriéndose después, un solo Escape habría disparado
los tres handlers en cadena (cada uno registrado independientemente),
cerrando drawer, fotos y visor en un solo keydown — peor que el bug
original.

**Fix real:** una única pila compartida (`_pfEscStack`,
[profile.js:18-38](js/profile.js#L18)) con un solo listener de captura,
registrado una vez a nivel de módulo. Cada una de las 3 capas hace
`push`/`pop` de su propia función de cierre en el mismo ciclo de vida
`MutationObserver` que ya usaban (abrir → push, cerrar → pop, sin importar
la vía de cierre). El listener compartido cierra siempre y solo el tope de
la pila y llama `stopPropagation()` una sola vez por Escape. Con la pila
vacía no hace nada — el handler global de `ui-utils.js` sigue intacto y
sin cambios para el resto de la app (verificado, fila 4 de la tabla).

### 2) Color de competición sin validar

`--chip-color` tomaba `comp.color` (store `palmares-comps`, editable) con
solo `_pfEsc` — que evita romper el atributo HTML pero no evita que un
valor como `red;} .pp-vitrina{display:none` inyecte declaraciones CSS
dentro del `style=""`. Corregido con `_palmIsHex(c.comp.color)?c.comp.color:'#DAA520'`
([palmares.js:2021](js/palmares.js#L2021), mismo validador y mismo
fallback que ya usa el resto de `palmares.js` para `comp.color`), manteniendo
`_pfEsc` alrededor igual que hace `profile.js` con `tc`/`tc2` — doble capa,
no una sustituye a la otra. Revisé el resto del slice (`grep .color` en
`profile.js`): el único otro uso es `s.color` dentro de `_donutSVG`, que
recibe siempre literales hardcodeados (`'#2ecc71'` etc.) desde `_statsHTML`,
nunca un valor de la base — no es el mismo patrón, no se tocó.

### 3) Testabilidad de `_champPhotosBodyHTML`

`isAdmin` pasó de leerse de `AUTH.role` adentro de la función a ser el
segundo parámetro, con default `AUTH.role==='admin'`
([profile.js:891](js/profile.js#L891)). El comportamiento en producción no
cambia (el call site real sigue sin pasar el segundo argumento, usa el
default), pero ambas ramas ahora se prueban con Nivel 1 puro
(`_champPhotosBodyHTML(groups, true/false)`), sin volver a mutar `AUTH`.

## Verificación — Parte 2

Nivel 1–2 exclusivamente, cero escrituras.

| # | Qué | Nivel | Resultado |
|---|---|---|---|
| 1 | Apilar las 3 capas (drawer con equipo real #37 → modal de fotos → visor sobre la 1ª miniatura) | 1/2 | `{profileOpen:true, champOpen:true, viewerOpen:true, stackLen:3}` |
| 2 | Escape #1 | 2 | Cierra **solo** el visor: `{profileOpen:true, champOpen:true, viewerOpen:false, stackLen:2}` |
| 3 | Escape #2 | 2 | Cierra **solo** el modal de fotos: `{profileOpen:true, champOpen:false, viewerOpen:false, stackLen:1}` |
| 4 | Escape #3 | 2 | Recién ahí cierra el drawer: `{profileOpen:false, champOpen:false, viewerOpen:false, stackLen:0}` — el perfil sobrevivió a los dos primeros Escape |
| 5 | Regresión: `showConfirm()` (modal ajeno a la pila) con `_pfEscStack` vacío, Escape | 2 | Se cierra igual que siempre — el handler global de `ui-utils.js` sigue intacto para el resto de la app |
| 6 | `_champPhotosBodyHTML(groups, true)` / `(groups, false)` | 1 | Rama admin: botón "Editar imágenes" presente. Rama pública: ausente. `AUTH.role` nunca se tocó (`authUntouched: true`) |
| 7 | `--chip-color` con `comp.color` malicioso (`'red;} .pp-vitrina{display:none'`) | 1 | Resultado exacto: `--chip-color:#DAA520;` — neutralizado |
| 8 | `--chip-color` con hex válido real (`#1a2b3c`) | 1 | Pasa sin cambios: `--chip-color:#1a2b3c;` — el fix no rompe el caso normal |
| 9 | Regresión de la Parte 1 (suma de `×n` = `_total`, equipo #37; club sin títulos → 0 chips) | 1 | Sin cambios: `t37_sumEqualsTotal: true`, `t1_chips: []` |
| 10 | Consola y estado final | 2 | Sin errores; `AUTH` = `{role:'public', teamId:null, hasUser:false}`; `_pfEscStack.length === 0` — todo restaurado |

## Parte 3 — 2026-07-22 (A.4: admin sin fotos no tenía forma de cargarlas)

Error de especificación en el macro (A.4), no de implementación: al
esconder el botón/estado vacío pensando en "quien mira", un admin cuyo
club tiene un título recién agregado y **cero** fotos (caso real: equipo
**#61, FK TUPADRE**, 1 título — Copa del Emperador T3 — con `gallery: []`)
no tenía ningún camino desde su perfil para subir la primera foto: el
botón exterior no se renderizaba (`hasChampionPhotos` falso) y, aunque se
forzara, el modal filtraba fuera cualquier título sin fotos.

### Qué cambió

- **Botón exterior** (`profile.js`): `showPhotosBtn = hasChampionPhotos || AUTH.role==='admin'`.
  Label dinámico: `'Fotos de campeón'` si ya hay fotos, `'Agregar fotos'`
  si no — el texto avisa que va a cargar, no que hay algo para ver.
- **`openChampionPhotosModal`**: el filtro `items.length > 0` ahora es
  condicional a `!isAdmin` — un admin ve **todos** los títulos del club
  (`.filter(g => g.comp && (isAdmin || g.items.length > 0))`); un no-admin
  sigue viendo solo los que tienen fotos, sin cambios.
- **`_champPhotosBodyHTML`**: un grupo con `items.length === 0` ya no
  intenta pintar una grilla vacía — tiene su propio bloque
  (`.champ-photos-empty-group`): mensaje "Este título todavía no tiene
  fotos" + botón `.champ-photos-add-btn` ("Agregar fotos") que abre
  `openPalmaresGallery(rec.id)`, el mismo gestor de siempre. El botón
  "Editar imágenes" del header de grupo solo aparece si el grupo **tiene**
  fotos — un grupo vacío no tiene nada que "editar" todavía.

### Refresco de la tarjeta tras guardar (integración)

`savePalmaresGallery` (`palmares.js:1665`) ahora dispara
`document.dispatchEvent(new CustomEvent('palmares:gallery-saved', {detail:{recordId, teamId}}))`
justo después de sus dos renders existentes (`renderAdmPalmares`,
`renderPubPalmares`), solo en el camino de éxito. `profile.js` escucha ese
evento (nuevo listener a nivel de módulo, junto a `openChampionPhotosModal`)
y llama a `renderProfileBody()` si el drawer sigue abierto y el `teamId`
del evento coincide con `window._profileTeam.id`.

**Por qué evento y no una llamada directa:** `palmares.js` no necesita
importar, conocer el nombre, ni saber si existe ninguna función de
`profile.js` — solo anuncia un hecho ya ocurrido ("se guardó la galería de
este registro"). Si mañana `renderProfileBody` cambia de nombre o el
drawer se reescribe, `palmares.js` no se toca; el único archivo que hay
que actualizar es el que tiene el listener. Una llamada directa
(`if (typeof _pfRefreshProfileCard==='function') ...`) habría sido el
mismo patrón "protección por coincidencia de nombre" que el propio
supervisor identificó como frágil en `dbEnsureCounterAtLeast`
(`PROTOCOLO_VERIFICACION.md`) — funciona hoy, se rompe en silencio si
alguien renombra la función del otro lado sin tocar este archivo. El
evento no tiene ese problema: el contrato es el nombre del evento y su
`detail`, no un símbolo interno del otro módulo.

### Verificación — Parte 3

Nivel 1–2 exclusivamente. `window.__TSC_READONLY__ = true` seteado antes
de la primera prueba (permanece `true` al cierre — no se desactivó).
**Cero llamadas a `dbAdd`/`dbPut`/`dbDelete`.** Antes de medir, se confirmó
fuente nuevo: `_champPhotosBodyHTML.toString().includes('champ-photos-empty-group')`
→ `true` (si hubiera dado `false` la sesión se recargaba antes de seguir).

| # | Qué | Nivel | Resultado |
|---|---|---|---|
| 1 | 4 combinaciones {admin,no-admin}×{con fotos (#37),sin fotos (#61 real)} sobre la lógica real de `openChampionPhotosModal`+`_champPhotosBodyHTML` | 1 | admin×con-fotos: botón visible, label "Fotos de campeón", 7 grupos (todos los títulos), edit+add btn conviven. admin×sin-fotos: botón visible, label "Agregar fotos", 1 grupo vacío, solo add-btn. no-admin×con-fotos: botón visible, "Fotos de campeón", 2 grupos (solo con fotos), sin botones admin. **no-admin×sin-fotos: botón NO visible** (`showPhotosBtn:false`), 0 grupos, empty state genérico si se forzara |
| 2 | Camino exacto, club real #61 (FK TUPADRE), rol admin sintético, 2 toques | 2 | Toque 1: `.pp-vitrina-photos-btn` texto **"Agregar fotos"**. Toque 2: `.champ-photos-add-btn` dentro del grupo "Copa del Emperador · T3", texto **"Agregar fotos"**, `onclick="closeModal('champ-photos-modal');openPalmaresGallery(36)"` — 36 es el id real del título de FK TUPADRE, mismo gestor admin existente |
| 3 | No-admin (presidente), club #61 (sin fotos) | 2 | `.pp-vitrina-photos-btn` ausente (`photosBtnExists:false`); `.pp-vitrina` **sigue existiendo** (1 chip, el título es real) — coincide con criterio (c) |
| 4 | Altura de tarjeta 375×812, club #61, botón "Agregar fotos" visible (caso vacío) | 2 | contenido 495px vs 662px disponibles en `.pp-body` → sin scroll |
| 5 | Listener del evento — 3 casos, dispatch manual de `palmares:gallery-saved` (sin tocar `savePalmaresGallery`, que además está bloqueada por el guard con el flag en `true`) | 2 | drawer abierto + `teamId` coincide → **se re-renderiza** (marca plantada en el DOM desaparece, ~310ms — tarda porque `renderProfileBody` hace lecturas reales a Firestore). drawer abierto + `teamId` distinto → no se re-renderiza (marca persiste). drawer cerrado → no se re-renderiza (marca persiste) |
| 6 | Consola y estado final | 2 | Sin errores; `AUTH` = `{role:'public', teamId:null, hasUser:false}`; `_pfEscStack.length === 0`; `window.__TSC_READONLY__ === true` |

### Nota sobre otro falso negativo por medir demasiado pronto

Fila 5 salió mal en el primer intento: medí con un solo `setTimeout(r,0)`
después de despachar el evento, y los 3 casos dieron "no se re-renderizó"
— incluido el caso 1, que SÍ debía hacerlo. `dispatchEvent` no espera a que
un listener `async` termine; mi propio listener hace `await renderProfileBody()`,
que hace lecturas reales a Firestore (no instantáneas). Un solo tick no
alcanza. Se corrigió con un `spy` primero (confirmó que el evento sí llega
al listener) y después con espera por *polling* hasta que la marca
desaparece o vence un timeout — ahí apareció el re-render real a los
~310ms. Mismo tipo de error que el `scrollHeight` de la Parte 1 (medir con
la técnica equivocada da un "no pasó nada" falso) y exactamente lo que el
supervisor pidió cuidar este round ("dos falsos positivos ya salieron de
medir páginas viejas") — acá el problema no fue código viejo sino un
tiempo de espera insuficiente para código async real.

## Parte 4 — 2026-07-22 (el "Agregar fotos" de un grupo vacío no estaba guardado)

Defecto de una línea en `_champPhotosBodyHTML` (`profile.js`): el botón
`.champ-photos-add-btn` de la rama `empty` llamaba a
`openPalmaresGallery(g.rec.id)` (escritura) sin condicionarlo a `isAdmin`
— a diferencia del `.champ-photos-edit-btn` de la rama con-fotos, que sí
lo tenía. Verificado a Nivel 1: `_champPhotosBodyHTML([grupoVacío], false)`
devolvía un `champ-photos-add-btn` igual.

**Por qué no se disparaba hoy:** `openChampionPhotosModal` filtra los
grupos vacíos fuera para no-admin (`.filter(g => g.comp && (isAdmin ||
g.items.length > 0))`), así que un no-admin nunca llega a ver un grupo
`empty` en el Slice A — la función estaba protegida por su **llamador**,
no por sí misma. Mismo patrón que `dbEnsureCounterAtLeast` antes de su
guard propio (`PROTOCOLO_VERIFICACION.md`): funciona hoy por cómo la usa
el único caller que existe, y se rompe en silencio en cuanto aparece un
segundo caller que no filtre igual — que es exactamente lo que el macro
(`MACRO_SLICE_TARJETA_CLUB.md` §1) prevé para el Slice B, una ficha de
club **pública**, donde un visitante anónimo sí podría llegar a ver un
grupo vacío sin pasar por el filtro de `openChampionPhotosModal`.

**Fix:** el botón de la rama `empty` ahora se envuelve en `isAdmin ? ... : ''`,
igual que el de la rama con-fotos — la función queda segura por sí misma,
sin depender de que el llamador filtre bien.

### Verificación — Parte 4

Nivel 1 exclusivamente, cero escrituras. Fuente nuevo confirmado antes de
medir: `_champPhotosBodyHTML.toString()` contiene el comentario nuevo del
fix y el patrón `isAdmin ? '<button...champ-photos-add-btn' — ambos
`true` antes de correr cualquier prueba.

| # | Qué | Nivel | Resultado |
|---|---|---|---|
| 1 | `_champPhotosBodyHTML([grupoVacío], false)` — el caso exacto que reportó el supervisor | 1 | `includes('champ-photos-add-btn') === false`, `includes('openPalmaresGallery') === false`; el mensaje "Este título todavía no tiene fotos" **sigue presente** (el estado vacío no desaparece, solo el botón de escritura) |
| 2 | `_champPhotosBodyHTML([grupoVacío], true)` | 1 | `hasAddBtn: true`, `openPalmaresGallery(999)` presente — el camino admin sigue intacto |
| 3 | Re-verificación de las 4 combinaciones de la Parte 3 (datos reales #37 y #61) | 1 | Sin cambios respecto a la Parte 3 en ninguna combinación — `admin×sin-fotos` (#61) sigue con `hasAddBtn:true`; `no-admin×sin-fotos` (#61) sigue con `showPhotosBtn:false` y ahora además `hasOpenPalmaresGallery:false` explícito (antes daba `false` solo porque no había grupos que llegaran a la rama `empty` para un no-admin — ahora es `false` por el guard, no por el filtro previo) |
| 4 | Consola durante la sesión | — | Sin errores |

## Después

`graphify update .` corrido cuatro veces (Parte 1: 2757/7054/50 · Parte 2:
2761/7061/49 · Parte 3: 2761/7062/48 · Parte 4: 2761/7062/48).
**Nada de lo anterior está commiteado** — queda pendiente de revisión.
