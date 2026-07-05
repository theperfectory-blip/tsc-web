# Pre-slice — Macro Slice D · Backup/Restauración + Sorteo público en tiempo real (v3.4f — verificación de reduced-motion en curso)

> **v3.4f (2026-07-04) — corrección tras revisión de Codex.** La verificación inicial de `prefers-reduced-motion` (v3.4e) fue **incompleta**: solo cubrió los entry points genéricos de `motion.js` (`reveal`, `ticker`, `countUp`), no las coreografías propias de `sorteo.js` (7 frames + drumroll + sparks + confetti, ~5s) ni los fuegos artificiales canvas de `bracket.js` (~7s), ni varios `scrollIntoView({behavior:'smooth'})` forzados en `calendar.js`/`history.js`, ni el rebote elástico del volumen en `ui-utils.js`. Codex encontró los 4 puntos y esta ronda los corrige — ver sección 11 reescrita. **El commit documental "sin pendientes" de v3.4e NO está autorizado**; el merge sigue detenido hasta que Codex valide esta corrección y se re-verifique la coreografía normal (animaciones activadas).

> **v3.4d (2026-07-04) — cierre absoluto.** Se validó manualmente en la consola de Firebase el único punto que quedaba fuera de alcance en ese momento: las reglas Firestore de `palmares`. Ver sección 10 para el detalle (reglas desplegadas vs. locales, 4 simulaciones en la Zona de pruebas, incluyendo el caso positivo con UID real de admin).

> **v3.4c (2026-07-03) — cierre funcional.** Codex aprobó funcionalmente el último punto de código pendiente (scroll-spy saltándose la sección 05 al cruzar Equipos↔Historial) tras verificación en navegador real. Ver sección 9 para causa raíz, cambio de código, secuencias verificadas y QA.

> **v3.4 (2026-07-03) — segunda ronda de corrección de scroll: el fix de v3.3 estabilizaba la altura pero NO el contenido visible.** Codex midió directamente (con la sección ya montada) que `#pub-panel-content` pasaba de 3976 a 76 caracteres al reenfocar — el `min-height` de v3.3 conservaba el espacio, pero el `innerHTML` real seguía reemplazándose por encabezado + contenedor de fase vacío durante los `await`. Codex también midió en Historial un retroceso real de scrollY de 81px (3600→3519) al terminar `renderPubHistory()` durante un scroll activo. Fix de esta ronda:
> - **Sección 02 y 03 (`renderPubPanel`/`renderPubCalendar`) pasan de "altura estable" a "actualización atómica real":** el contenido nuevo se arma completo (encabezado + carruseles + el renderer de fase/hero que corresponda) en un staging invisible superpuesto exactamente sobre el mismo cuadro (`position:absolute;inset:0;visibility:hidden` — nunca `display:none` ni fuera de pantalla, para que las mediciones de layout y los chequeos de visibilidad de los fuegos del campeón sigan siendo reales) y se reemplaza todo de una sola vez, de forma síncrona, al terminar. El contenido anterior nunca se toca ni se vacía mientras se espera — solo en el primer montaje (sin contenido previo) se permite el hueco vacío momentáneo.
> - **Sección 06 (Historial):** su propio render ya era atómico (sin placeholder intermedio); el gap real era que `nav.js` fuerza un re-render al reenfocar sin preservar la posición visual. Se agregó una restauración de scroll específica para este caso (`_pubRestoreScrollAnchor`, sin pasar por `focusPublicSection` para no crear un ciclo de foco/render), pero **solo se aplica si el usuario no siguió scrolleando durante el render** — ver el hallazgo siguiente.
> - **Autocrítica encontrada durante la propia verificación de esta ronda:** una primera versión de esa restauración de scroll (aplicada también a panel/calendario) restauraba scrollY incondicionalmente después de cada refresco, sin chequear si el usuario había seguido scrolleando mientras tanto. Verificado con una traza real: producía saltos de **hasta 1400px en contra del gesto**, mucho peor que el bug original de 81px. Corregido antes de considerar cerrado nada: la restauración ahora se descarta si `scrollY` cambió durante el render (el usuario siguió su gesto activo) y solo actúa si el usuario está quieto.
> - **Fade+rise:** se agregó `MOTION.settleWithin`, porque un refresco (no el primer montaje) reconstruye los nodos `[data-reveal]` desde cero y `tsc:public-section-mounted` solo se dispara una vez — sin esto, esos nodos nuevos nunca quedaban marcados como ya revelados. Ahora cada refresco de calendario/historial asienta explícitamente los nodos nuevos en su estado final, sin animarlos ni repetir la entrada.
>
> Los puntos 1–5 y 7–8 siguen vigentes de v3.3, sin cambios. El punto 6 se reemplaza por el estado real de esta ronda (ver más abajo). Archivos, riesgos, QA y criterios de aceptación al final reflejan las mediciones reales de v3.4, no solo las de v3.3.

## 1 — Requisito de galería corregido (afecta a `palmares.js`)
**Nuevo requisito de producto:** la galería persiste **hasta 12** fotos por campeón; la sala rota mostrando **máximo 7 simultáneas** entre esas 12. Antes había un solo límite (`_PALM_COLLAGE_MAX = 7`) que capaba *tanto* lo persistido *como* lo simultáneo — con eso, nunca se podían guardar más de 7 fotos y el rotador jamás veía la 8ª–12ª.

**Split de constantes** ([palmares.js:1847](palmares.js:1847)):
- `_PALM_GALLERY_MAX = 12` — techo de lo que se puede **guardar** en `record.gallery` (admin: upload, contador "N de 12", mensajes de máximo).
- `_PALM_COLLAGE_MAX = 7` — techo de lo que se **muestra a la vez** en la sala (sin cambios).

**El rotador NO se reescribe.** `items[_PALM_PUB.collageSeq++ % items.length]` ([palmares.js:2348](palmares.js:2348)) y el guard de simultaneidad `querySelectorAll('.sala-shot').length >= _PALM_COLLAGE_MAX` ([palmares.js:2347](palmares.js:2347)) ya están bien diseñados para un pool más grande que 7 — el problema es que `items` nunca llegaba a tener más de 7 porque `_palmGallerySafeItems` truncaba en el punto de **lectura** (`getPalmaresMedia`, [palmares.js:1923](palmares.js:1923)), no solo en el de guardado. Fix: parametrizar `_palmGallerySafeItems(value, max=_PALM_GALLERY_MAX)` y usar `_PALM_GALLERY_MAX` en los sitios de admin/guardado/lectura; dejar `_PALM_COLLAGE_MAX` intacto en los sitios de renderizado simultáneo (2347, 2386).

**QA de galería:** probar con **0, 1, 3, 7 y 12** imágenes (antes solo llegaba a 0/1/3/7 porque 12 era físicamente imposible de guardar).

## 2 — `_PALM_PUB.media`/`setSalaCollage` NO es código muerto a eliminar
Corrección: no se declara "código muerto" ni se ignora. Es una **API de compatibilidad para overrides runtime** (permite forzar temporalmente el collage de la sala sin tocar `record.gallery`) — que hoy no tiene llamadores internos, pero se **conserva intacta** y debe admitir también el pool de 12 (su propio `.slice(0, _PALM_COLLAGE_MAX)` en [palmares.js:1921](palmares.js:1921) pasa a `.slice(0, _PALM_GALLERY_MAX)` para ser consistente con el nuevo techo persistido). No se agregan llamadores nuevos — solo se generaliza el límite.

## 3 — `db.js` SÍ es archivo tocado del slice
`dbEnsureCounterAtLeast` (ya en el working tree sin commitear) es parte constitutiva de D — mantiene el contador de Firestore por encima de IDs restaurados explícitamente, requisito directo de "preservar IDs globalmente mediante upsert". Se **lista como archivo modificado** y se **prueba en QA** (import con Firestore activo, confirmar que el siguiente alta no colisiona con un ID restaurado), aunque no requiera más ediciones de código.

## 4 — Prevalidación: alcance honesto de la garantía
La prevalidación **no convierte el import en una transacción atómica**. Lo único que garantiza:
> Un backup estructuralmente inválido (JSON corrupto, colección con forma inválida, registro sin id numérico válido, ID duplicado dentro de una misma store) **no produce ninguna mutación** — falla antes de la primera `dbDelete`/`dbPut`/`dbAdd`.

Lo que **no** cubre: un fallo de red, de cuota o de permisos de Firestore **durante** las escrituras puede seguir dejando una restauración parcial (algunas stores ya escritas, otras no) — eso requeriría una transacción real multi-store, que Firestore/IndexedDB no ofrecen aquí de forma simple y que **no** se implementa en este slice. El criterio de aceptación y el copy de riesgo deben decirlo así, sin insinuar "todo o nada" como garantía absoluta.

**Implementación:** separar validación (`_dataValidateBackup`/`_dataValidateStoreItems`, sin tocar la DB, corre sobre **todas** las stores del backup antes de cualquier mutación) de la escritura (`_dataImportStore`, ahora recibe registros ya validados). `importDB` llama primero a la validación completa; solo si pasa entera procede al borrado (overwrite) y después a las escrituras.

**Correcciones todavía obligatorias detectadas en revisión:**
- Un registro sin `id` también es estructuralmente inválido. Los backups TSC v4/v5 exportan IDs; no se permite caer a `dbAdd` generando uno nuevo porque rompería relaciones.
- El copy de "Sobrescribir" debe coincidir con el comportamiento real: se reemplazan las colecciones **incluidas en el backup**. Un backup v4 no debe prometer que borra stores que no contiene.

## 5 — Ampliación de D: Sorteo público fiel al prototipo y en tiempo real

### Decisión de alcance
- **No se crea Slice E.** Sorteo se incorpora a D.
- `/prototype` manda en layout, estética y movimiento del Sorteo público.
- La lógica real manda en datos, permisos, persistencia, Firestore, bombos, links y asignaciones.
- El renderer administrativo actual se conserva operativo; no se rediseña ni se simplifica.
- No se introducen mocks ni se copian equipos/resultados ficticios del prototipo.

### Problema real verificado
El público y el admin comparten hoy el mismo `TEMPLATE` de `sorteo.js`. `readOnly` oculta acciones, pero deja en público el layout operativo anterior de dos columnas: escenario reducido + paneles permanentes de Bombos/Urna/Resultado. El prototipo usa un escenario ancho, chibi grande y centrado, encabezado compacto, contador, resumen de pendientes/sorteados y rig 2.5D.

Además, `renderLinkedPhasesMirror()` solo distingue:
```
bracket → renderBracket(...)
todo lo demás → renderGroupTable(...)
```
No se debe tratar `playoff` o `single` como grupos. El Sorteo actual solo tiene lógica real de vinculación para:
- `kind:'group'` → `{ phaseId, groupIdx, posIdx }`
- `kind:'bracket'` → `{ phaseId, slotIdx, side }`

D amplía explícitamente esa lógica para playoff:
- `kind:'playoff'` → `{ phaseId, matchIdx, side }`
- `side` solo admite `A` o `B`.
- `matchIdx` identifica el cruce en `phase.playoffSlots`.
- El Sorteo no agrega vinculación para `single` en este alcance.

### Vinculación nueva a playoff
El picker existente `Vincular` debe incluir fases `playoff` junto a `groups` y `bracket`, conservando el mismo flujo administrativo:
- Mostrar cada cruce con lado A/B.
- Resolver ocupantes desde `phase.playoffSlots` y `phase.slotRefs`, igual que los renderers reales de `playoff.js`/`public-bracket.js`.
- Permitir asignar la bola a un lado vacío o reemplazar el ocupante actual con confirmación visual clara.
- Un equipo solo puede ocupar un lado de un cruce dentro de la misma fase. Al moverlo, liberar su destino anterior.
- Si el destino estaba ocupado por otra bola vinculada, invalidar el link anterior de esa bola.
- Persistir el equipo de forma compatible con `playoffSlots`/`slotRefs`; no crear un modelo paralelo.
- La asignación canónica creada por Sorteo se escribe en `playoffSlots[matchIdx].teamA/teamB`, igual que `savePlayoffAssign`.
- Antes de escribir, retirar únicamente el `slotRef` del mismo `matchIdx + side`, porque los renderers aplican `slotRefs` después de `playoffSlots` y una ref vieja volvería a pisar el equipo sorteado.
- Preservar intacta la ref del lado opuesto. Si la ref reemplazada era dinámica, informarlo igual que hoy hace bracket.
- Al mover el mismo equipo dentro del playoff, retirarlo de cualquier otro lado directo y de cualquier `slotRef` tipo `team` de esa fase.
- Si cambia cualquiera de los equipos de un cruce que ya tenía resultados, limpiar los `matches` de ese `phaseId + matchIdx` y su historial asociado para no conservar marcadores de una pareja anterior.
- `Limpiar vínculo` debe retirar únicamente la asignación creada por esa bola, sin borrar refs dinámicas ajenas.
- `Deshacer cambios` no debe restaurar snapshots globales de todas las fases/sorteos/matches: podría pisar cambios concurrentes de otro admin. Registrar un journal o snapshots **solo de los registros tocados por la sesión** (fase, registro sorteo y matches del `phaseId + matchIdx` afectado) y restaurar únicamente esos registros.
- `renderLinkBadgeText` debe mostrar `→ Playoff · Cruce N · lado A/B`.

La administración normal de playoff (`openPlayoffTeamAssign`/`savePlayoffAssign`/`clearPlayoffAssign`) debe mantener consistencia bidireccional: si reemplaza o limpia un lado creado por Sorteo, invalida el `entry.link` correspondiente para no dejar badges o destinos stale.

### Renderer público
Crear una rama pública dedicada dentro del módulo existente, sin duplicar estado ni crear otro sistema de Sorteo:
- Escenario full-width alineado con `/prototype`.
- Chibi grande y centrado usando los 8 frames reales y la animación real.
- Estado `EN VIVO`, bombo activo, contador y sonido.
- Rig 2.5D usando las clases existentes `.chibi-rig`, `.chibi-glow` y `.chibi-tilt`.
- El puntero se normaliza contra el escenario completo.
- Al salir del escenario vuelve suavemente a neutral.
- `prefers-reduced-motion`: sin seguimiento, respiración ni sacudidas; el resultado aparece con transición corta.
- Resumen compacto `Ver equipos · N pendientes · M sorteados`.
- Bombos/Urna/Resultado no ocupan permanentemente la columna derecha pública. Se muestran en un panel read-only expandible o sección secundaria compacta.
- Administración conserva el template operativo actual, incluidos edición de bombos, urna, resultado y vinculación.
- Todo icono textual tocado (`↺`, `✕`, `＋`, etc.) debe convertirse a SVG inline estilo Lucide; no agregar emojis.

### Tablero de destinos en público — **RETRACTADO en v3.3**
> Esta subsección completa queda sin efecto. Decisión final: **no existe ningún tablero público de grupos/bracket/playoff bajo el Sorteo, ni en el panel general admin.** `renderLinkedPhasesMirror()`, `#sorteo-phases-mirror` y el CSS `.mirror-*` se **eliminaron** de `sorteo.js`/`sorteo.css` (admin y público). El grid de destino (`#slp-grid`, con sus ramas `groups`/`bracket`/`playoff`) sigue existiendo **solo dentro del modal "Vincular"** — eso no cambió.
>
> La sección 02 (`page='panel'`, `renderPubPanel`) es la **única** vista pública del destino exacto (grupo/posición, llave, cruce/lado): ya renderiza `phase.groups`/`slotRefs`/`playoffSlots` vía `_pubRenderGroupsBroadcast`/`_pubRenderBracketBroadcast`/`_pubRenderPlayoffBroadcast`, y ya está suscripta a `phases` — no fue necesario agregar nada ahí para que reciba los cambios del Sorteo.
>
> El Sorteo público, en cambio, solo indica **a qué Competición · Fase** va cada bola sorteada (o "Destino pendiente"), sin grupo/posición/llave/lado — ver punto 7.

### Contrato de tiempo real sin recarga
Firestore es la fuente autoritativa cross-device. `BroadcastChannel` solo acelera pestañas del mismo navegador.

**Nuevo sorteo:**
1. Admin ejecuta el sorteo y persiste.
2. El público recibe `onSnapshot`.
3. Detecta únicamente entradas nuevas.
4. Reproduce una sola vez la secuencia de frames, sonido permitido y reveal.
5. Actualiza contador, urna y lista de sorteados sin reload.

**Vinculación posterior:**
1. Admin pulsa `Vincular`.
2. `assignLink`, `assignBracketLink` o el nuevo `assignPlayoffLink` actualiza `phase.groups`, `phase.slotRefs` o `phase.playoffSlots` de forma coherente.
3. Se persiste el link en `sorteo`.
4. El público actualiza franja, mirror y posición/cruce afectado.
5. No repite la animación del sorteo porque el número de bolas sorteadas no cambió.

**Robustez:**
- Mantener una cola de animaciones para varios sorteos rápidos: sin pérdidas, solapamientos ni duplicados.
- La cola contiene eventos normalizados de bola (`bomboId`, `teamId`, `ord`, `at`), no snapshots completos que puedan pisarse. Dedupe por identidad estable; fallback legacy por `bomboId + ord + teamId`.
- La primera suscripción hidrata el estado sin reproducir el histórico.
- Si la sección está offscreen o la pestaña estaba en segundo plano, actualizar silenciosamente; al volver se muestra el estado vigente sin replay masivo.
- Tras reconexión, procesar entradas nuevas en orden o sincronizar silenciosamente según visibilidad, sin duplicarlas.
- Audio solo después de gesto permitido; el estado de datos nunca depende del audio.
- Reset/nuevo bombo cancela animaciones obsoletas y limpia la cola.

### Sección 02 en tiempo real — implementado y verificado en v3.3
Cuando el admin vincula una bola (o cambia cualquier `phases`), la sección 02 ya recibe el cambio sin recarga: `page='panel'` usa `liveSubscribe(['matches','phases','teams'], renderPubPanel)` desde antes de este slice — no se creó ninguna suscripción nueva.

**Bug real encontrado y corregido (no era teórico):** `liveSubscribe` ignora a propósito el primer snapshot de cada store nueva (evita doble-render del mount inicial). Al reenfocar una sección **ya montada**, eso dejaba datos viejos en pantalla hasta que ocurriera un cambio ajeno. Fix en `nav.js`: `_subscribeFocusedPublicSection(page, wasAlreadyMounted)` fuerza un render inmediato (`await fn()`) cuando `wasAlreadyMounted` es true, ANTES de instalar la (única) suscripción — sin crear una segunda. `focusPublicSection` ahora espera ese refresh y vuelve a validar `_publicFocusToken`/`STATE.mode`/`_publicFocusedPage` antes de continuar.

Ese fix expuso un segundo bug, más grave, que causaba el colapso de scroll — ver sección 6.

**Baseline confirmado:** la sección 02 corresponde a `page='panel'` y ya usa `liveSubscribe(['matches','phases','teams'], renderPubPanel)`. El gap real que sí exigió tocar `nav.js`/`public.js`/`calendar.js` fue el del scroll (sección 6).

## 6 — Bug bloqueante de scroll continuo (corregido, segunda ronda)

**Causa exacta medida por Codex, más precisa que el diagnóstico de v3.3:**
1. El fix de v3.3 (`min-height` fijado antes del `await`) conservaba la **geometría** del contenedor, pero no el **contenido visible**: `renderPubPanel()`/`renderPubCalendar()` seguían reemplazando `el.innerHTML` por encabezado + contenedor de fase vacío (o `"Cargando..."`) de forma síncrona, y solo después llegaban los `await` que reconstruían el contenido real. Codex lo confirmó midiendo directamente `#pub-panel-content`: pasó de 3976 a 76 caracteres y de 19039 a 1146 bytes de HTML al reenfocar una sección ya montada — el espacio se mantenía (gracias al `min-height`), pero durante ese intervalo solo quedaba la cabecera en pantalla.
2. En Historial, el propio render (`_renderHistoryFull`) ya era atómico (un solo `innerHTML=` al final, sin placeholder intermedio) — no tenía este problema. El bug medido ahí fue otro: al reenfocar, `nav.js` fuerza `renderPubHistory()` sin preservar la posición visual; con el documento scrolleado, la diferencia de altura entre el contenido viejo y el nuevo (aunque sea de unos pocos px) dispara el scroll-anchoring nativo del navegador, que compensó de forma imprecisa: una rueda hacia abajo llevó `scrollY` de 3420 a 3600, y al terminar el render el navegador lo devolvió a 3519 — retroceso real de 81px contra la dirección del gesto.

**Fix implementado (sección 02/03) — actualización atómica real, no solo altura estable:**
- `renderPubPanel()` (`public.js`) y `renderPubCalendar()` (`calendar.js`): si ya hay contenido previo (no es el primer montaje), el contenido nuevo se arma completo en un `<div>` de staging hijo de `el`, con `position:absolute;inset:0;visibility:hidden;pointer-events:none` — nunca `display:none` ni `left:-9999px`, precisamente porque eso rompería `getBoundingClientRect()` para el chequeo de visibilidad de los fuegos del campeón (bracket/playoff) y las mediciones de ancho de los carruseles. Los ids que colisionarían con el contenido real (`pub-cc-comp`, `pub-cc-fase`, el contenedor de fase) llevan un sufijo `__staging` mientras están en el staging, y se normalizan de vuelta al hacer commit.
- El contenido anterior **nunca se toca** durante todo el `await` (fases, grupos/bracket/playoff, o el hero+metro del calendario) — sigue completamente visible e interactivo. Solo al terminar, `_pubCommitStage`/`_calCommitStage` reemplazan los hijos de `el` por los del staging en un solo paso síncrono (JS de una sola hebra: el navegador no puede pintar un frame intermedio con `el` vacío).
- Si el `fetch` falla **antes** de terminar de armar el staging, este se descarta sin tocar `el` — un error de red nunca vacía lo que ya se veía (antes esto solo estaba garantizado implícitamente; ahora hay un flag `stageReady` explícito).
- Efecto colateral encontrado y corregido en el propio calendario: `_calInitHeroCountdown` buscaba `document.getElementById('hm-countdown')` de forma global. Con el staging, puede haber momentáneamente DOS `#hm-countdown` en el documento (el viejo, visible; el nuevo, oculto) — un lookup global habría enganchado la cuenta atrás nueva al hero VIEJO. Se corrigió pasándole `scope` (`stage`) y usando `scope.querySelector('#hm-countdown')`.
- `_calWireHero`/su limpieza interna (`_calHeroCleanup`) siguen cableándose sobre el hero en staging (oculto) y solo se conectan de verdad al DOM real en el commit — como todo ese tramo es síncrono (sin `await` entre `_calWireHero(stage)` y el commit en el `finally`), no hay ninguna ventana en la que el usuario pueda hacer click sobre un hero visible pero con los listeners ya desconectados.

**Corrección adicional (v3.4b, tras QA con video del usuario):** la restauración de scroll de abajo NO era suficiente — el usuario grabó el bug persistiendo y el análisis frame a frame mostró la causa visible real: cada cruce del scroll-spy hacia Historial disparaba el refresco forzado (`renderPubHistory()` completo), que reconstruye los hitos desde `<b>0</b>` y reinicia el conteo animado (countUp), borra los inputs H2H y reemplaza `#pub-histm` — con el consiguiente movimiento del contenido bajo el viewport. Fix definitivo: **dirty-check por firma de datos** en `_renderHistoryFull` (público) — los datos se leen frescos en CADA reenfoque, pero si la firma (`JSON.stringify` de los registros resueltos) es idéntica a la del último render y la vista Partidos ya está montada (`#pub-histm` presente), no se toca el DOM. Es la opción que la especificación sancionaba («Si reemplazas el force refresh siempre por dirty flags/versiones, demuestra que un cambio ocurrido fuera de foco aparece inmediatamente al volver»). **Verificado en navegador real (pestaña conectada, scroll de rueda real):** (a) 1082 muestras a 50ms durante ~54s de cruces Sorteo↔Historial — el contador mantuvo un único valor (2415), cero reinicios, y `#pub-histm` siguió siendo el mismo nodo DOM; (b) dirty-path: con un registro extra inyectado en memoria (sin escribir en la DB), el reenfoque re-renderizó de inmediato (2415→2416, DOM reconstruido) y al restaurar los datos reales volvió a 2415. Bonus del skip: los filtros y el H2H tipeado por el usuario ya no se borran al cruzar de sección.

**Nota (v3.4b, descartado como causa):** también se agregó un dedupe de snapshots idénticos en `dbSubscribe` (`db.js`) a raíz de un `net::ERR_BLOCKED_BY_CLIENT` observado en el canal Listen de Firestore en el entorno del usuario — reintentos de conexión podían entregar snapshots desde caché sin cambios reales. Es una mejora válida (evita renders gratuitos por reintentos de red) pero NO era la causa del bug reportado; se deja porque es correcta y barata.

**Fix implementado (sección 06) — restauración de scroll acotada, sin pelear con el usuario:**
- Nuevo `_pubRestoreScrollAnchor(anchor)` en `public.js`: igual que `_pubRestoreVisualAnchor` pero **sin** llamar a `focusPublicSection` (evita el ciclo de foco/render que Codex advirtió). `_pubRestoreVisualAnchor` ahora delega en él para no duplicar el cálculo del delta.
- `nav.js`: `_subscribeFocusedPublicSection` envuelve el refresco de `panel`/`calendario`/`historial` (no `palmares`/`equipos`/`sorteo`) con `_pubWrapWithScrollAnchor`: captura la posición visual del contenedor ancla (`#pub-panel-content`/`#pub-calendar-content`/`#page-historial`) y el `scrollY` actual **antes** de renderizar; después del render, **solo si `scrollY` no cambió durante el `await`**, corrige la posición del ancla si difiere.
- **Hallazgo propio durante la verificación de esta ronda, no reportado por Codex:** la primera versión de este fix no tenía el chequeo de "`scrollY` no cambió" — restauraba siempre. Con una traza real de scroll rápido (rueda simulada, todas las secciones montadas), eso produjo saltos de **hasta 1400px en contra del gesto** (peor que el bug original): el ancla se capturaba en el momento en que una sección entraba en foco, pero el usuario seguía scrolleando durante el render (que toma decenas a cientos de ms), y al terminar, la "restauración" lo devolvía a la posición de captura, muy por detrás de donde el usuario ya estaba. Corregido antes de dar nada por cerrado: ahora se compara `scrollY` en el momento de capturar el ancla contra `scrollY` justo antes de aplicar la corrección — si difieren, se asume gesto activo del usuario y **no se toca el scroll**.

**Fade+rise en refrescos (relacionado, ver sección 7):** con la actualización atómica, cada refresco de panel/calendario/historial reconstruye nodos `[data-reveal]` nuevos que `tsc:public-section-mounted` (disparado una sola vez, en el primer montaje) nunca vuelve a vincular. Nuevo `MOTION.settleWithin(root)` los asienta explícitamente en su estado final (sin animar, sin volver a poner `opacity:0`) en cada commit posterior al primero — ver sección 7.

**Mediciones reales de esta ronda (navegador foreground real vía preview, no un entorno backgrounded):**
- `document.visibilityState` fue `"visible"` en esta sesión de verificación (a diferencia de la ronda anterior) — sí fue posible completar trazas de scroll con temporizadores reales.
- Contenido (longitud de `innerHTML`) muestreado cada 5ms durante todo el `await renderPubPanel()`: antes 19053 caracteres, mínimo durante 19039, después 19039 (nunca cayó cerca de los 76 que medía el bug) — 130ms de duración total.
- Lo mismo para `renderPubCalendar()`: 6474 antes, 6474 mínimo durante, 6474 después (52ms). Y `renderPubHistory()`: 19195/19195/19189 (256ms, sin variación — ya era atómico).
- Altura (`offsetHeight`) de `#pub-panel-content` muestreada cada 5ms durante todo el render: **constante en 1028px** antes, durante (mín=máx=1028) y después.
- Traza de scroll sintético (`window.scrollBy`, no un evento de rueda real del SO — no hay herramienta disponible para eso en este entorno) de ±140px, escritorio 1440×900 y móvil 375×812, con las 6 secciones ya montadas: en ambas direcciones y en ambos viewports, el delta de `scrollY` fue exactamente ±140 en cada paso (sin excepción, salvo el clamp natural al llegar al borde del documento), `document.documentElement.scrollHeight` se mantuvo constante todo el recorrido (7176px escritorio, 8387px móvil) y la secuencia de sección activa recorrió Palmarés→Panel→Calendario→Equipos→Sorteo→Historial (y su inversa) sin saltos.
- Verificado además, con `renderPubCalendar()`/`renderPubHistory()` invocados directamente sobre una sección ya montada: los nodos `[data-reveal]` nuevos (hero, `#pub-histm`) quedan con `revealBound`/`revealed` marcados y `opacity:1`/`transform:none` de inmediato, sin pasar por el observer ni repetir la animación de entrada.

**Limitación de método honesta:** el scroll se simuló con `window.scrollBy` en step fijo de 140px, no con un evento `wheel` real del sistema operativo (no hay herramienta de ese tipo disponible en este entorno de preview). En un recorrido con ese paso de 140px, la sección Calendario (angosta, ~200-400px según el contenido) a veces no llegó a reportarse como "activa" en la dirección de subida — se confirmó por separado, con pasos de 40px sobre el mismo tramo, que el `IntersectionObserver` del scroll-spy (`_buildFocusObserver`, sin tocar) sí la detecta correctamente; es una limitación de la resolución del muestreo sintético, no una regresión de código. Un anomalía aislada (la sección activa quedó "pegada" en Calendario sin nunca mostrar Equipos/Sorteo) se observó **una sola vez**, inmediatamente después de un reload + montaje masivo de las 6 secciones en el mismo tick; se repitió la misma secuencia exacta 3 veces más y no volvió a reproducirse — no se identificó una causa de código específica y se deja documentado como no resuelto/no explicado, sin descartar que sea un artefacto del entorno de prueba (posible carrera con trabajo diferido del propio montaje, p. ej. `requestAnimationFrame` de recentrado de carruseles o `setTimeout` de fuegos artificiales).

## 7 — Fade + rise (paridad con `/prototype`)

**Hallazgo:** el sistema ya existía completo en `motion.js` (`MOTION.reveal`/`revealAll`, con exactamente `rootMargin:'0px 0px -8% 0px'`, `threshold:0.08`, transición `0.6s var(--ease-out)` en opacity+transform, one-shot) y coincide byte a byte con los parámetros que usa `/prototype` (`document.querySelectorAll('[data-reveal]').forEach(el=>MOTION.reveal(el))` + `MOTION.revealAll('.metro-day',{step:70,dist:'10px'})`, prototype.html:3531-3534). Lo que faltaba era **cablearlo** en el sitio real: ningún módulo lo invocaba; los únicos `data-reveal` existentes (en `history.js`) estaban huérfanos, sin ningún llamador.

**Implementado (v3.3, sin cambios):**
- `motion.js`: `reveal()` se hizo idempotente (`data-reveal-bound`/`data-revealed` — un nodo ya vinculado o ya revelado no se vuelve a preparar con `opacity:0`). `MOTION.revealWithin(root, sel='[data-reveal]')` vincula solo los nodos no registrados dentro de una raíz. Listener interno de `'tsc:public-section-mounted'` (evento que `ensurePublicSectionMounted` dispara **una sola vez**, justo después del montaje inicial — nunca en refresh en vivo) que cablea por página: `calendario` → `revealWithin` + `revealAll('.metro-day',{step:70,dist:'10px'})`; `sorteo`/`historial` → `revealWithin`. `palmares`/`panel` quedan explícitamente fuera.
- `calendar.js`: `data-reveal` en el hero (`.hero.hero-match.hm-collapsible` y la variante offseason `.hm-collapsible`).
- `sorteo.js`: `data-reveal` en `.sorteo-stage` del `TEMPLATE_PUBLIC` únicamente.
- `equipos`: sin cambios — sigue usando `MOTION.stagger`.
- `prefers-reduced-motion`: es la misma `reveal()`/`_settle()` preexistente, sin tocar.

**Nuevo en v3.4 — el problema real que faltaba corregir:** con la actualización atómica de la sección 6, cada refresco de panel/calendario/historial (reenfoque forzado o dato en vivo) reconstruye sus nodos `[data-reveal]` desde cero (hero del calendario, `.hito-stage`/`.h2h-frame`/`#pub-histm` del historial). Como `tsc:public-section-mounted` solo se dispara en el **primer** montaje, esos nodos nuevos nunca pasaban por `revealWithin` — quedaban sin `data-reveal-bound`/`data-revealed`. No había ningún CSS que los ocultara por defecto (se verificó: no existe ninguna regla `[data-reveal]{opacity:0}` en `css/`), así que no se "perdían" visualmente, pero tampoco quedaban asentados de forma explícita ni protegidos contra una futura regla CSS que sí los ocultara.

- `motion.js`: nueva `MOTION.settleWithin(root, sel='[data-reveal]')` — encuentra los nodos `[data-reveal]` todavía no vinculados dentro de una raíz y los deja **directamente** en su estado final (`opacity:1`, `transform:none`, `revealBound`/`revealed` marcados), sin observarlos ni animarlos. Es la contraparte de `revealWithin` para el caso "no es el primer montaje": nunca replica la entrada fade+rise para contenido que el usuario ya está viendo.
- `calendar.js`: `renderPubCalendar()` calcula `hasPrevContent` (mismo flag que gobierna el staging atómico de la sección 6); si es `true`, tras el commit llama `MOTION.settleWithin(el)`.
- `history.js`: `renderPubHistory()` detecta si `#page-historial` ya tiene la clase `is-mounted` (que `ensurePublicSectionMounted` agrega recién **después** del primer montaje, así que durante el primer render real esa clase todavía no está — señal confiable de "es un refresco, no el primer montaje"); si ya estaba montada, llama `MOTION.settleWithin(el)` tras `_renderHistoryFull`.
- `renderPubPanel()`: no necesitó el mismo tratamiento — la sección 02 no usa `[data-reveal]` en ningún nodo propio (confirmado por grep), sigue sin fade genérico de wrapper, sin cambios respecto a v3.3.

**Verificado en esta ronda:** se invocó `renderPubCalendar()`/`renderPubHistory()` directamente sobre una sección ya montada (con contenido previo real) y se confirmó que el nodo `[data-reveal]` resultante es un nodo DOM distinto al anterior (`sameNode:false` — realmente se reconstruyó) pero queda con `revealBound:"1"`, `revealed:"1"`, `opacity` computado `"1"` y `transform` computado `"none"` de inmediato, sin pasar por el `IntersectionObserver`. El disparo real de la animación de entrada en el **primer** montaje (mount limpio) no se volvió a re-verificar en esta ronda porque no cambió respecto a v3.3 (ya verificado entonces).
- `prefers-reduced-motion`: `reveal()`/`_settle()` y `MOTION.ticker()` ya la respetaban sin tocar código; pero la primera pasada (v3.4e) fue incompleta — Codex encontró 4 coreografías fuera de `motion.js` que la ignoraban por completo, corregidas en v3.4f (sección 11): sorteo, fuegos del bracket, scrolls forzados y rebote del volumen. **Pendiente de validación de Codex y re-verificación con animaciones activadas antes de cerrar.**

## 8 — Pills del Sorteo: legibilidad y semántica (corregido)

- **Nombre de fase real primero:** `_renderPubUrna()` (`sorteo.js`) ahora arma la segunda línea con `phase.name || PHASE_KIND_LABEL[phase.type] || ''` (antes era al revés). Verificado con dato real: fase 7 (`name:"eliminatoria"`) muestra "copa yuna · eliminatoria", no la etiqueta genérica "Eliminatoria".
- **Contraste corregido (bug de especificidad CSS encontrado y corregido):** `.uchip-2l.out` heredaba `opacity:0.35` de la regla `.urna .uchip.out` (`redesign.css`, 3 clases) porque mi regla original (`.uchip-2l.out`, 2 clases) tenía menos especificidad Y `sorteo.css` carga antes que `redesign.css` en `index.html` — perdía por ambos motivos. Fix: `.urna .uchip.uchip-2l.out{opacity:1}` (4 clases, gana sin depender del orden de carga). Verificado con `getComputedStyle`: pill container `opacity:1`; nombre en `--txt3` (`rgb(85,90,102)`) tachado; destino en `--txt2` (`rgb(139,143,154)`), legible, sin tachar. `--txt2`/`--txt3` están definidos para dark y light theme en `variables.css`, así que el contraste correcto aplica en ambos automáticamente.
- Texto vía `textContent` (ya lo estaba); fases/competiciones cargadas una vez por render en un `Map` (ya lo estaba) — sin consultas por pill.

## 9 — Scroll-spy se saltaba la sección 05 Sorteo (corregido, cierre v3.4c)

**Causa raíz:** `_buildFocusObserver()` (`redesign-shell.js`) elegía el candidato a foco únicamente entre las `entries` que el `IntersectionObserver` entregaba en ESE callback — pero `IntersectionObserver` solo reporta los targets cuyo estado de intersección **cambió** en esa entrega, no todas las secciones actualmente visibles. Si Sorteo ya estaba intersectando y seguía intersectando sin volver a cruzar el threshold (`threshold:0`) en un callback posterior, no aparecía en el lote de `entries` de ese callback y nunca era evaluado como candidato — el foco podía saltar de Equipos directamente a Historial, saltándose Sorteo por completo. Codex lo reprodujo 3/3 veces: con la sección 05 ocupando el viewport, `STATE.publicPage` permaneció en `"equipos"` durante `scrollY 2556→3556` y recién ahí saltó a `"historial"`.

**Fix (`redesign-shell.js:46-70`):** `entries` se usa ahora solo como señal de "algo cambió, hay que reevaluar" — nunca como fuente de datos. En cada despertar del observer, el candidato se recalcula desde cero con `getBoundingClientRect()` en vivo de **todas** las secciones activas (`_activeSections()`), aplicando manualmente el mismo criterio de intersección que definía el `rootMargin` original (`rect.bottom > chromeH+8 && rect.top < innerHeight*0.45`), y ordenando por distancia a la línea de foco (`Math.abs(rect.top - chromeH)`) — igual que antes, pero sobre datos frescos, no sobre el entry viejo de una sección que dejó de recibir actualizaciones. El `rootMargin` del observer no cambió (`-${chromeH+8}px 0px -55% 0px`), así que el rango de detección es idéntico al de antes; lo único que cambió es de dónde sale el candidato.

**Verificado en el navegador real del usuario (pestaña conectada vía MCP, rueda del mouse real, no `scrollBy` sintético):**
- Bajando, las 6 secciones montadas: `palmares(y=0) → panel(1018) → equipos(2011) → sorteo(2411) → historial(3411)`. Sorteo presente, sin saltos.
- Subiendo (dirección inversa, la que Codex reprodujo): `historial(4011) → sorteo(2811) → equipos(2211) → calendario(1611)`. Mismo resultado, Sorteo presente en ambas direcciones.
- 191 y 506 muestras respectivamente (samplers a 30-40ms), transiciones sin repetidos consecutivos ni saltos de sección.

**Contador de Historial y H2H — sin reinicios, verificado en la misma sesión (cierre del punto de v3.4b):**
- 4 reenfoques repetidos a Historial (el camino exacto que antes reiniciaba el conteo): 131 muestras del contador de hitos, un único valor (`2415`), cero reinicios, nodo `#pub-histm` preservado (mismo DOM, no reconstruido).
- Conteo animado (`_pubScheduleCount`/`_pubHCountObs` en `history.js`, agregado en esta misma ronda para no perder la animación tras el dirty-check de v3.4b): verificado en vivo entrando al viewport por primera vez — 27 valores intermedios con easing (0→1→66→234→584→982→1555→2069→2321→2408→2415) — y verificado que NO se repite en reenfoques posteriores.
- Dirty-path (un dato cambia fuera de foco) sigue disparando el re-render correcto: objetivo del contador pasó a `2416` con un registro inyectado en memoria (sin escritura a la DB) y volvió a `2415` al restaurar.

**QA y comandos ejecutados en esta sub-iteración:**
- `node --check js/redesign-shell.js` — OK.
- `node --check js/history.js` — OK.
- `git diff --check` — limpio.
- `graphify update .` (dentro de `tsc-src/`) — corrido, `GRAPH_REPORT.md` actualizado y agregado al staging.
- Consola del navegador (vía `read_console_messages`, sin F12) — sin errores en ninguna de las pruebas de esta sección.
- Cero escrituras a Firestore/IndexedDB de producción en toda la verificación (solo lecturas y una inyección de datos en memoria, revertida antes de terminar).

**Archivo tocado en esta sub-iteración:** `redesign-shell.js` (único cambio: `_buildFocusObserver`). `history.js` fue tocado en la sub-iteración anterior (v3.4b) para el conteo animado, no en esta.

## 10 — Validación manual de reglas Firestore de `palmares` (cierre definitivo, v3.4d)

**Alcance:** único punto que seguía fuera del alcance del implementador (secciones 4, 8 tabla de riesgos y "Gates de ejecución"). Verificado directamente en la consola de Firebase (`console.firebase.google.com/project/tsc-web-yuna/firestore/databases/-default-/security/rules`) con la sesión real del usuario vía navegador conectado (MCP), no simulado ni asumido por lectura de código.

**Verificado:**
- **Reglas desplegadas == `firebase/firestore.rules` local:** el texto completo mostrado en la pestaña "Reglas" de la consola (versión activa, marcada con estrella, `jun 10, 2026 · 11:00 a.m.`) es idéntico carácter a carácter al archivo local, incluyendo la línea `match /palmares/{id} { allow read: if true; allow write: if isAdmin(); }` — no hay drift entre lo desplegado y lo versionado en git.
- **Simulación 1 (Zona de pruebas de reglas, tipo `get`, ruta `palmares/1`, sin autenticar):** resultado `success: Se autorizó la operación de lectura simulada` — confirma lectura pública real, no solo el texto de la regla.
- **Simulación 2 (tipo `update`, misma ruta, sin autenticar):** resultado `warning: Se rechazó la operación de escritura simulada` — confirma que un cliente anónimo no puede escribir en `palmares`.
- **Simulación 3 (tipo `update`, misma ruta, autenticado con un UID de Firebase inexistente en `users/{uid}`):** también rechazada — la traza detallada muestra que `meExists()` se evalúa (a diferencia de la simulación 2, donde ni se llega a evaluar por `signedIn()` ya false) y da `false` al no existir el documento de perfil, por lo que `isAdmin()` es `false` y la escritura se deniega. Confirma que estar autenticado sin un perfil admin en `users/{uid}` sigue sin ser suficiente para escribir.
- **Simulación 4 — caso positivo (tipo `update`, misma ruta, autenticado con el UID real de un usuario con `role: "admin"` en `users/{uid}`, obtenido de la propia colección `users` en la consola):** resultado `success: Se autorizó la operación de escritura simulada` — traza completa evalúa `get()` sobre el documento real, `meExists()` true, `me().role == 'admin'` true, `isAdmin()` true. Confirma que la regla no solo deniega correctamente a quien no debe escribir, sino que sí permite escribir a un admin real — cierra el caso positivo que las simulaciones 1-3 no cubrían.
- Ninguna de las cuatro simulaciones escribe contra la base real (la "Zona de pruebas" es un evaluador de reglas aislado, no ejecuta la operación); no se publicó ningún cambio de reglas (se evitó deliberadamente el botón "Publicar" en todo momento, incluso cuando la consola mostró un estado local de "cambios sin publicar" al navegar el historial de versiones — ese estado nunca se envió al servidor).

**Conclusión:** el modelo de seguridad de `palmares` (lectura pública, escritura solo admin) está correctamente desplegado y se comporta como se espera. Slice D no tiene ningún punto pendiente restante.

## 11 — `prefers-reduced-motion`: verificación inicial incompleta, corregida tras revisión de Codex (v3.4e → v3.4f)

**Alcance:** el otro punto que quedaba documentado como "no se pudo emular en este entorno" en las secciones 7/9 y en criterios de aceptación. El usuario activó la preferencia real del sistema operativo (Windows → Accesibilidad → Efectos visuales → **Efectos de animación: Desactivado**) y se verificó en el navegador real conectado (no en el entorno de preview aislado, que no expone emulación de media features).

### v3.4e — primera pasada (incompleta)

**Verificado (`http://localhost:3000`, navegador real con la preferencia del SO activa):**
- `window.matchMedia('(prefers-reduced-motion: reduce)').matches` → `true` y `MOTION.reduced()` → `true`: la preferencia del SO se propaga correctamente hasta la media query del navegador y hasta el gate interno de `motion.js`.
- `reveal()` (usado por `revealWithin`/`revealAll` en calendario/sorteo/historial): los nodos `[data-reveal]` ya montados (`hero-match`, `sorteo-stage`) muestran `data-revealed="1"`, `opacity:1`, `transform:none` — confirma que tomaron la rama `if (reduced()) { _settle(el); return; }` y nunca pasaron por el estado oculto (`opacity:0`) ni por el `IntersectionObserver` de animación.
- `MOTION.ticker('#ticker', ...)` (marquesina del ticker, cableada en `public.js:661`): `#ticker` tiene un solo hijo (`#ticker-track`, sin clon `aria-hidden`) y `transform:none` — confirma que tomó la rama `if (reduced()) return () => {};` sin clonar el track ni animar `translateX`.

**Nota metodológica (sigue vigente):** una llamada directa a `scrollToPublicSection('calendario')` vía consola tardó más de 45s y su promesa fue abortada por el timeout del harness de automatización antes de llegar al `window.scrollTo` final (dejando `STATE.publicPage` actualizado pero `scrollY` en 0) — esto es un artefacto de invocar la función interna por consola con un timeout más corto que el montaje real (probablemente una espera de red de Firestore), no un bug de reduced-motion.

**Corrección propia (autocrítica, antes de la revisión de Codex):** esta primera pasada solo cubrió los entry points genéricos de `motion.js`. **No revisó las coreografías con temporizadores propios fuera de `motion.js`** (sorteo, fuegos artificiales canvas, `scrollIntoView` puntuales, rebote de UI). Esa fue la brecha real que Codex encontró.

### v3.4f — hallazgos de Codex y corrección

**Codex reprodujo 4 puntos donde la preferencia del SO se ignoraba por completo** (reveal/ticker no los cubren porque son coreografías con su propio `setTimeout`/`requestAnimationFrame`, no pasan por `MOTION.reveal`/`MOTION.ticker`):
1. `sorteo.js` (`playDrawAnimation`, líneas ~553-585): ejecutaba los 7 frames + drumroll + esperas + sparks + confetti (~5s) sin importar la preferencia.
2. `bracket.js` (`launchChampionFireworks`, líneas ~121-123): canvas + partículas + `requestAnimationFrame` + audio de cohetes/explosión durante 7s, sin gate.
3. `calendar.js` (líneas 740-741 y 1038) e `history.js` (línea 1499): `scrollIntoView({behavior:'smooth'})` forzado, ignorando la preferencia.
4. `ui-utils.js` (`springBack`, líneas 209-236): rebote elástico del control de volumen con overshoot, 430ms de `requestAnimationFrame`, sin gate.

**Fix aplicado (5 archivos JS):**
- **`bracket.js`:** `launchChampionFireworks` retorna antes de crear el canvas/audio si `MOTION.reduced()` es `true`.
- **`calendar.js` (2 sitios) e `history.js` (1 sitio):** los tres `scrollIntoView` usan `behavior: reduced ? 'auto' : 'smooth'` (reutilizando el `_reduced()` ya existente en el closure del hero; inline en los otros dos sitios, mismo patrón que el resto del archivo).
- **`ui-utils.js`:** `springBack()` llama a `clearOvfImmediate()` y retorna de inmediato si `reduced`, sin entrar al loop de `requestAnimationFrame` de 430ms con overshoot.
- **`sorteo.js`:** `playDrawAnimation` gana una rama `reducedMotion()` que muestra el frame final + `showRevealCard()` (aria-live) sin frames/drumroll/sparks/shake/confetti.

**Primer intento de fix del sorteo — también incompleto (encontrado por Codex, no autodetectado):** la rama reducida inicial llamaba a `setTimeout(finishSequence, 0)`, reutilizando la finalización del flujo normal — pero `finishSequence()` oculta la reveal card de inmediato (`hideRevealCard()` es la primera línea) y encadena esperas de 280ms + 1000ms que no tienen ningún propósito sin animación que sincronizar. Resultado real: la tarjeta casi no llegaba a mostrarse, `busy` seguía bloqueado 1.28s sin motivo, y los controles/urna/cola realtime se actualizaban tarde.

**Fix definitivo:** nueva función `finishSequenceReduced()`, independiente de `finishSequence()`, con su propia pausa estática (`REDUCED_REVEAL_PAUSE_MS = 700`, sin animación — solo tiempo de lectura para el aria-live) y una única finalización atómica al final de esa pausa: oculta la tarjeta, resetea el frame a idle, libera `busy`, re-renderiza, libera controles y drena la cola realtime **todo junto**, sin los delays de 280ms/1000ms del flujo normal.

**Verificado (sin ejecutar un sorteo real — un `drawNext()` real escribiría en el Firestore de producción, prohibido sin autorización):**
- **Fireworks:** se llamó a `window.launchChampionFireworks(...)` directamente (no muta datos) con `MOTION.reduced()===true` → cero `<canvas id="fw-canvas">` creado, cero `AudioContext` instanciado (interceptado con un stub temporal).
- **H2H scroll (`history.js`):** se invocó `histH2HShow('MALVINAS JR', 'LA BOLSA FC')` con dos equipos reales de la DB de desarrollo → `scrollIntoView` capturado con un monkey-patch temporal de `Element.prototype.scrollIntoView` (revertido, nunca persistido): `{"behavior":"auto","block":"center"}`.
- **Volumen (`ui-utils.js`):** se simuló un arrastre real más allá del borde con `PointerEvent` sintéticos (`pointerdown`/`pointermove`/`pointerup`) sobre `#vol-track-outer` (revelado vía `openSettings()`) → al soltar, `track.style.transform` se limpia a `''` en el mismo tick y **cero llamadas a `requestAnimationFrame`** durante la prueba (interceptado con un stub temporal) — antes corría 430ms de spring con overshoot.
- **Sorteo:** se expuso temporalmente `window.__sorteoDebug = { playDrawAnimation, finishSequenceReduced, teamName, isBusy }` (removido del código antes de este commit — no queda en el diff) y se invocó `playDrawAnimation` con un bombo/equipo ficticios (`__test_bombo__`/`__fake_team_1__`, nunca parte de `state.bombos` real, cero `dbPut`/`saveState`/`broadcast`). Con un `MutationObserver` sobre `.reveal-card` y `.chibi-rig` más `isBusy()`: la tarjeta pasó a visible (`reveal-card in`) a los ~1-2ms de la llamada, y la ocultación + `chibi` a idle + `busy→false` ocurrieron **en el mismo instante** (una sola mutación agrupada), repetido en 2 corridas independientes. El tiempo absoluto observado hasta esa finalización (~1.3-1.5s) es mayor que los 700ms configurados por un artefacto de *throttling* de temporizadores en la pestaña automatizada (el mismo patrón de retraso ya documentado para `scrollToPublicSection`/`setInterval` en esta sesión) — lo relevante y confirmado es que la finalización es **atómica** (un solo salto, no dos escalonados) y que la tarjeta es visible desde el primer instante, no que el número absoluto de ms coincida exactamente en este entorno.
- **`calendar.js` (CTA "Calendario completo" y "Cargar más"):** no se pudieron ejercitar en vivo — el dataset de desarrollo actual no cumple las condiciones que renderizan esos dos elementos (`.hm-cta-cal` solo aparece si el partido destacado no tiene competición asociada; "Cargar más" solo si hay fechas pendientes más allá del horizonte). Verificado por lectura de código: mismo patrón `_reduced()`/`MOTION.reduced()` ya confirmado funcional en los otros casos, `node --check` limpio.
- Sin errores de consola en ninguna prueba (verificado con `read_console_messages`). Cero escrituras a Firestore de producción en toda la ronda.

**Pendiente antes de cerrar v3.4f:** con la preferencia del SO todavía **desactivada** (movimiento reducido), falta que Codex valide esta corrección. Después de esa validación, el usuario reactivará las animaciones de Windows y se reverificará la coreografía normal (no reducida) de sorteo/fuegos/scrolls/volumen para descartar regresiones antes de cerrar el punto y autorizar el commit documental de cierre.

## Resto del plan de datos (sin cambios respecto a v3.1, aprobado)
- Export/import dinámico por `STORES` (ya en el working tree).
- IDs preservados globalmente vía `dbPut`/upsert — aprobado explícitamente por Codex para todas las stores, no solo Palmarés.
- Advertencia explícita en modo "Fusionar": los registros con el mismo ID se **actualizan/sobrescriben**, no se duplican ni se saltan.
- Matriz de pruebas: backup viejo `TSC_v4` (formato plano) + nuevo `TSC_v5` (con `manifest`/`stores`) + ciclo exportar→sobrescribir→importar conservando `palmares.gallery`.
- Validar reglas Firestore de la colección **existente** `palmares` (lectura pública/escritura admin) en consola — no se crea colección nueva.
- Sin store nueva, sin `DB_VER` 7, sin cambios en `state.js`. No se reimplementa el administrador de galería ni el collage público — solo se generaliza su límite persistido.

## Archivos a tocar / NO tocar (final, v3.4)
**Tocados en v3.3 (sin cambios adicionales en v3.4):** `data.js` (prevalidación + copy overwrite/merge), `palmares.js` (split 12/7), `db.js` (`dbEnsureCounterAtLeast`), `playoff.js` (invalidación bidireccional de links + `removeHistoryByMatchRef`), `sorteo.js` (playoff linking, journal acotado, template público sin mirror, urna pendientes/sorteados, cola FIFO, `_bindChibiRig`), `sorteo.css` (layout público, pills 2 líneas, sin `.mirror-*`).

**Tocados de nuevo en v3.4:**
- `public.js`: `renderPubPanel` reescrito para actualización atómica real (staging + commit síncrono, `_pubCommitStage`); nuevo `_pubRestoreScrollAnchor` (sin `focusPublicSection`); `_pubRestoreVisualAnchor` delega en él.
- `calendar.js`: `renderPubCalendar` reescrito con el mismo patrón de staging (`_calCommitStage`); `_calInitHeroCountdown` ahora recibe `scope` en vez de buscar por id global; `MOTION.settleWithin` cableado tras el commit de un refresco.
- `nav.js`: `_subscribeFocusedPublicSection` envuelve panel/calendario/historial con `_pubWrapWithScrollAnchor` (captura+restaura posición, solo si `scrollY` no cambió durante el render).
- `history.js`: `renderPubHistory`/`_renderHistoryFull` con dirty-check por firma de datos (v3.4b) + `_pubScheduleCount`/`_pubHCountObs` para el conteo animado one-shot por viewport (v3.4b, ver sección 6).
- `motion.js`: nueva `MOTION.settleWithin`.
- `db.js`: `dbSubscribe` con dedupe de snapshots idénticos (v3.4b) — mejora válida, no fue la causa del bug de Historial, se conserva.
- `redesign-shell.js`: `_buildFocusObserver` recalcula el candidato con rects en vivo de todas las secciones activas en cada callback, en vez de depender solo de `entries` (v3.4c, sección 9) — corrige el salto de Sorteo detectado por Codex.

**Tocados en v3.4f (corrección de `prefers-reduced-motion`, sección 11):**
- `sorteo.js`: `playDrawAnimation` gana rama `reducedMotion()` (resultado estático + aria-live, sin frames/drumroll/sparks/shake/confetti); nueva `finishSequenceReduced()` con finalización propia y atómica (`REDUCED_REVEAL_PAUSE_MS`), independiente de `finishSequence()`.
- `bracket.js`: `launchChampionFireworks` sale antes de crear canvas/audio si `MOTION.reduced()`.
- `calendar.js`: los dos `scrollIntoView` (CTA "Calendario completo" y "Cargar más") usan `behavior:'auto'` cuando `reduced`.
- `history.js`: el `scrollIntoView` del H2H usa `behavior:'auto'` cuando `reduced`.
- `ui-utils.js`: `springBack()` llama a `clearOvfImmediate()` y retorna si `reduced`, sin el loop de `requestAnimationFrame` con overshoot.
- `teams.js`: corregido un salto de línea en blanco al final de archivo (`git diff --check origin/main...HEAD` lo señalaba) — sin cambios funcionales.

**NO tocados:** `state.js`, `cloudinary.js`, `firebase-config.js`, `public-bracket.js`, `standings.js`, `palmares.js` (01/04 — sin regresión medida, no se tocaron). No se creó ningún store ni segundo módulo paralelo.

## Riesgos + mitigaciones (final, v3.3)
- Restauración parcial ante backup **estructuralmente inválido** → prevalidación completa antes de tocar la DB (mitigado, probado).
- Restauración parcial ante **fallo de red/cuota/permisos a mitad de escritura** → riesgo residual real, no mitigado (documentado, fuera de alcance).
- "Fusionar" sobrescribe por ID sin avisar → advertencia explícita en el modal (hecho).
- Confundir el techo de guardado (12) con el de exhibición simultánea (7) → constantes separadas + probado con 12 fotos reales.
- Reglas Firestore de `palmares` para `gallery` → **validado manualmente en consola (v3.4d, sección 10):** reglas desplegadas idénticas al `firebase/firestore.rules` local; simulado lectura anónima (permitida), escritura anónima (denegada) y escritura autenticada sin perfil admin (denegada).
- Cambiar participantes de un playoff conserva resultados viejos → `assignPlayoffLink` limpia matches+historial; `clearPlayoffAssign`/`savePlayoffAssign` corregidos para hacer lo mismo (antes solo borraban matches).
- Admin de playoff y Sorteo divergen → invalidación bidireccional probada en vivo (total y parcial por lado).
- Undo global pisaba cambios concurrentes → journal acotado a fase/sorteo/matches tocados por la sesión (probado: no toca una fase real ajena).
- **Contenido (no solo altura) se vaciaba durante el refresco de sección 02/03** (bug real medido por Codex, más grave que lo que v3.3 había corregido) → actualización atómica real vía staging + commit síncrono (corregido, medido: `innerHTML.length` y `offsetHeight` muestreados cada 5ms durante todo el render, sin caída — ver sección 6).
- **Restauración de scroll ingenua puede pelear contra un gesto de scroll activo** (bug propio, encontrado y corregido ANTES de reportar cualquier cosa como cerrada, no medido por Codex): una primera versión de la restauración de posición para Historial/Panel/Calendario restauraba siempre, produciendo saltos de hasta 1400px en contra del gesto — peor que el bug original de 81px. Corregido: solo restaura si `scrollY` no cambió durante el render (usuario quieto). Verificado con traza real de scroll rápido tras el fix: cero saltos en contra del gesto, en ambas direcciones, escritorio y móvil.
- `await requestAnimationFrame` sin timeout podía colgar el montaje entero de una sección en pestañas sin foco → `_rafOrTimeout` con respaldo de 400ms (de v3.3, sin cambios, sigue vigente).
- `focusPublicSection` sin serializar apilaba renders concurrentes con scroll rápido → cola que colapsa a la última página pedida (de v3.3, sin cambios; validado de nuevo en esta ronda con traza real: la sección activa siguió correctamente el recorrido completo en 3 de 4 corridas idénticas — ver anomalía no reproducida en sección 6).
- **Scroll-spy se saltaba la sección 05 Sorteo al cruzar Equipos↔Historial** (bug real reproducido 3/3 veces por Codex, no autodetectado) → `_buildFocusObserver` (`redesign-shell.js`) recalcula el candidato con rects en vivo de todas las secciones activas en cada callback en vez de depender solo de `entries` del `IntersectionObserver` (corregido y cerrado — ver sección 9).
- El conteo animado de los hitos de Historial se reiniciaba en cada reenfoque (efecto colateral del `renderPubHistory()` forzado) → corregido con dirty-check por firma de datos; eso a su vez apagó la animación por completo (se disparaba solo en el montaje, que ocurre fuera de viewport) → corregido con disparo one-shot por `IntersectionObserver` propio del contador (`_pubScheduleCount`). Ambos puntos cerrados y verificados — ver sección 9.
- Fade+rise no cableado en refrescos (solo en el primer montaje) → `MOTION.settleWithin` asienta los nodos `[data-reveal]` reconstruidos sin re-animarlos (corregido, verificado con `renderPubCalendar`/`renderPubHistory` invocados directamente sobre una sección ya montada).
- `prefers-reduced-motion` → **corregido en v3.4f (sección 11), pendiente de validación de Codex y de re-verificación con animaciones activadas**: Codex encontró 4 coreografías (sorteo, fuegos del bracket, scrolls forzados, rebote de volumen) que ignoraban la preferencia; corregidas en `bracket.js`, `calendar.js`, `history.js`, `sorteo.js`, `ui-utils.js`. El primer intento de fix del sorteo también fue incompleto (reutilizaba los delays de `finishSequence`) — corregido con `finishSequenceReduced()` dedicada.
- Ninguna prueba de esta ronda (v3.3/v3.4) usó un evento de rueda (`wheel`) real del sistema operativo — se usó `window.scrollBy` sintético en pasos fijos, que sí probó exhaustivamente ausencia de saltos/colapsos pero no reproduce exactamente la cadencia/variabilidad de un mouse o trackpad real. **Superado en v3.4c (sección 9):** verificado después con rueda real del navegador conectado del usuario, en ambas direcciones, sin saltos de sección — esta limitación ya no aplica.
- QA de esta ronda no mutó Firestore/Cloudinary de producción — todas las verificaciones fueron lecturas (`renderPub*` invocados directamente, `ensurePublicSectionMounted`, scroll sintético) contra el backend Firestore real del proyecto (`tsc-web-yuna`, confirmado activo — `USE_FIRESTORE=true` en este entorno), sin ningún `dbPut`/`dbAdd`/`dbDelete`.

## Pasos de ejecución (histórico, cumplido)
1-12. *(ver historial de commits/diff — pasos de v3.2 ya ejecutados: datos, Palmarés, playoff linking, template público, cola FIFO)*.
13. Retractar el mirror público (sección/CSS eliminados) — **hecho** (v3.3).
14. Corregir el bug de scroll continuo — primera pasada (altura + rAF + serialización de foco) — **hecho** (v3.3), **insuficiente** (Codex midió que el contenido seguía vaciándose pese a la altura estable).
15. Cablear fade+rise (`motion.js` + `data-reveal` en calendario/sorteo) — **hecho** (v3.3).
16. Corregir legibilidad/semántica de las pills (nombre de fase real + contraste) — **hecho** (v3.3).
17. Corregir el bug de scroll continuo — segunda pasada: actualización atómica real (staging + commit síncrono) en panel/calendario, restauración de scroll acotada (sin pelear con gesto activo) en historial — **hecho** (v3.4), medido con muestreo de contenido/altura cada 5ms y traza de scroll real en escritorio y móvil.
18. Corregir fade+rise en refrescos (`MOTION.settleWithin`) — **hecho** (v3.4).
19. `node --check` + `git diff --check` + `graphify update .` — **hecho** (v3.4).
20. Validar reglas Firestore de `palmares` en consola — **hecho** (v3.4d, sección 10): reglas desplegadas verificadas idénticas al archivo local y comportamiento confirmado con 3 simulaciones reales en la Zona de pruebas (lectura anónima permitida, escritura anónima denegada, escritura autenticada sin perfil admin denegada).
21. Dirty-check por firma de datos en `_renderHistoryFull` para que el reenfoque a Historial no reinicie el conteo animado ni borre el H2H — **hecho** (v3.4b), verificado con 1082 muestras sin reinicios.
22. Recuperar el conteo animado sin reabrir el bug (disparo one-shot por `IntersectionObserver` propio, `_pubScheduleCount`) — **hecho** (v3.4b/c), verificado en vivo (27 pasos de easing, sin repetición en reenfoques).
23. Corregir el scroll-spy saltándose Sorteo (`_buildFocusObserver` recalculando con rects en vivo de todas las secciones) — **hecho** (v3.4c), verificado con rueda real en ambas direcciones.
24. QA con evento de rueda real del sistema operativo — **hecho en esta sub-iteración** (v3.4c, vía navegador conectado del usuario), cerrando la limitación de método documentada en la ronda anterior.
25. Verificación en vivo de `prefers-reduced-motion` con la preferencia del SO activada — **v3.4e incompleta, corregida en v3.4f** (sección 11): 4 coreografías fuera de `motion.js` (sorteo, fuegos, scrolls forzados, rebote de volumen) ignoraban la preferencia; corregidas en 5 archivos JS y reverificadas sin mutar datos reales. **Pendiente:** validación de Codex + re-verificación con animaciones activadas.

## Gates de ejecución
- Un solo escritor sobre el módulo.
- No ejecutar sorteos, vínculos, imports ni subidas automatizadas contra producción sin autorización explícita — respetado.
- No hay gates artificiales de porcentaje/token; el cierre depende de criterios funcionales y QA.
- **Slice D aprobado funcionalmente por Codex (2026-07-03).** Reglas Firestore de `palmares` validadas en consola el 2026-07-04 (sección 10). **`prefers-reduced-motion` en curso (sección 11, v3.4f):** Codex encontró 4 gaps el 2026-07-04 (sorteo, fuegos, scrolls, volumen), corregidos y reverificados con animaciones desactivadas — **pendiente validación de Codex de esta corrección y re-verificación de la coreografía normal con animaciones reactivadas.** El commit documental "sin pendientes" y el merge a `main` quedan detenidos hasta entonces.

## Criterios de aceptación (final, v3.3)
- Galería: persiste hasta 12, sala rota mostrando máx 7 simultáneas entre las 12. QA en 0/1/3/7/12 — **cumplido**.
- `_PALM_PUB.media`/`setSalaCollage` se conserva como API de compatibilidad, admite pool de 12 — **cumplido**.
- `db.js`/`dbEnsureCounterAtLeast` probado con Firestore — **cumplido**.
- Backup estructuralmente inválido no produce ninguna mutación — **cumplido**, probado.
- Modo "Fusionar" avisa que sobrescribe por ID — **cumplido**.
- `palmares.gallery` sobrevive export→overwrite→import — **cumplido**.
- Vinculación playoff (asignar/mover/limpiar/deshacer) sincroniza `sorteo`/`playoffSlots`/`slotRefs`/`matches`/historial, y el undo no toca fases ajenas — **cumplido**, probado en vivo con datos descartables.
- **No existe mirror público de grupos/bracket/playoff** bajo el Sorteo ni en el panel admin general; el grid de destino vive solo en el modal Vincular — **cumplido**.
- Sección 02 sigue siendo la única vista pública del destino exacto, y se actualiza sin recarga incluyendo al reenfocar una sección ya montada — **cumplido**.
- Sorteo público muestra Competición · Fase (o "Destino pendiente") con contraste legible en ambas líneas, sin exponer el slot exacto — **cumplido**, verificado con dato real.
- Sección 02/03: el contenido visible no se vacía durante un refresco (no solo la altura) — **cumplido y medido**: `innerHTML.length` y `offsetHeight` muestreados cada 5ms durante todo `renderPubPanel()`/`renderPubCalendar()`, sin caída en ningún punto.
- Sección 06: no hay retroceso de scroll en contra del gesto activo tras un refresco — **cumplido**: la restauración de posición se descarta si el usuario siguió scrolleando durante el render (evita el propio bug, peor, que esta ronda encontró y corrigió antes de reportarlo).
- Traza de scroll con rueda real del sistema operativo (navegador del usuario, MCP conectado), monótona en ambas direcciones, secuencia Palmarés→...→Historial y su inversa sin saltarse ninguna sección (incluida Sorteo, el punto que Codex reprodujo 3/3 veces) — **cumplido y medido en esta sub-iteración final**, superando la limitación de `scrollBy` sintético documentada en rondas anteriores.
- Scroll-spy no se salta ninguna sección al cruzar rápido entre ellas — **cumplido**: `_buildFocusObserver` recalcula con rects en vivo de todas las secciones activas, no solo las que cambiaron de intersección en el callback — ver sección 9.
- Conteo animado de los hitos de Historial se dispara una sola vez al entrar en viewport y no se reinicia en reenfoques posteriores — **cumplido**, verificado con 131 muestras en 4 reenfoques (un solo valor) y con la animación completa capturada en vivo al primer ingreso.
- Fade+rise cableado en calendario (hero + `.metro-day`), sorteo (`.sorteo-stage`) e historial — **cumplido**, y además, nuevo en esta ronda: los refrescos posteriores al primer montaje asientan sus nodos `[data-reveal]` reconstruidos sin re-animarlos (`MOTION.settleWithin`, verificado con `renderPubCalendar`/`renderPubHistory` invocados sobre una sección ya montada).
- `prefers-reduced-motion` — **en curso (v3.4f, sección 11):** 4 gaps encontrados por Codex corregidos (sorteo, fuegos, scrolls, volumen); pendiente validación de Codex y re-verificación de la coreografía normal con animaciones activadas antes de marcar como cumplido.
- `firebase-config.js`/`cloudinary.js` no se tocan ni se stagean — **cumplido**.
- `.serve-3000.*` no se stagean — **cumplido** (quedan sin trackear; no se pudieron borrar, proceso `node.exe` ajeno los tiene abiertos).
- `node --check` limpio en los 12 archivos JS tocados (calendar.js, data.js, db.js, history.js, motion.js, nav.js, palmares.js, playoff.js, public.js, public-bracket.js, redesign-shell.js, sorteo.js), `git diff --check` limpio, `graphify update .` corrido — **cumplido**.
- Reglas Firestore de `palmares` confirmadas en consola — **cumplido** (v3.4d, sección 10): reglas desplegadas == archivo local, 3 simulaciones reales confirman lectura pública / escritura solo-admin.
- Sorteo público iguala la composición del prototipo sin perder datos ni animación real.
- Admin conserva todas sus capacidades actuales.
- Nuevo sorteo se anima una vez en público y actualiza contador/lista sin reload.
- Vincular a grupo, bracket o playoff actualiza mirror y sección 02 sin repetir la animación.
- Varios sorteos rápidos no se pierden, solapan ni duplican.
- Carga inicial, background y reconexión no reproducen históricos masivos.
- Sin links → `Destino pendiente`; sin datos inventados.
- Playoff se vincula por cruce/lado, se renderiza con su renderer real y limpia resultados obsoletos al cambiar participantes.
- `single` no se presenta como grupo ni se vincula desde Sorteo.
- Mover, reemplazar, limpiar o deshacer un vínculo playoff mantiene sincronizados `sorteo`, `playoffSlots`, `slotRefs`, `matches` e historial.
- QA visual 1440×900, 768×900 y 390×844; teclado, foco, sonido permitido y reduced-motion.
- Dos sesiones/dispositivos: admin y público sincronizados por Firestore.
- Sin errores/warnings propios de consola · `node --check` · `git diff --check` · `graphify update .`.
