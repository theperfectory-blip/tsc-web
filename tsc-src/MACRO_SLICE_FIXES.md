# Macro Slice — Fixes App (post v1.1.0) · 2026-07-11

> Estado **verificado en código** por el supervisor (Claude Opus 4.8) el
> 2026-07-11. Fixes pedidos por el usuario. Cada slice se ejecuta y
> cierra por separado (Sonnet implementa, el supervisor audita con evidencia
> real antes del OK). No se avanza al siguiente sin cierre del anterior.
>
> **Estado actual:** A/B/C/D **cerrados y verificados** (release v1.2.0 probado
> en teléfono físico). Slices **C2 y E** pendientes (segunda ronda de feedback
> del usuario sobre la tabla de estadísticas y el linkeo de las tarjetas).

---

## 0. Reglas críticas del repo (no cambian)

- **GRAPH FIRST**: antes de buscar, leer `tsc-src/graphify-out/GRAPH_REPORT.md`. Tras tocar código: `cd tsc-src && graphify update .`.
- Nunca tocar/stagear `js/firebase-config.js` ni `js/cloudinary.js` (gitignored por diseño). Sin credenciales inline.
- `innerHTML` con datos externos: escapar (`_esc`/`_uaEsc`/equivalente del módulo).
- Iconos nuevos: SVG inline estilo Lucide. **Nunca emojis** en UI.
- Renderers compartidos admin/público (`renderGroupTable`, `renderBracket*`, `renderMatchesList`): no mutarlos; reusar solo la preparación de datos.
- Rama de trabajo: `feature/capacitor-android`. No push sin OK. Build Android: fix de tmpdir (`TMP=C:\Temp`, JDK Temurin 21) — ver `tsc-web-gradle-tmpdir-fix`.
- Verificación: eval/DOM/CDP y evidencia real, no "compiló". Dos devices en adb (teléfono `10AE740S110015R` + `emulator-5554`): siempre `-s`.

## 1. Orden y dependencias

| # | Slice | Tamaño | Riesgo | Estado |
|---|---|---|---|---|
| **A** | Nav bar legible en tema claro (3 botones / Android 15) | chico | bajo | ✅ `45d6566` |
| **B** | Numeración/tamaño de secciones 02 y 06 | chico | bajo | ✅ `c327230` |
| **C** | Tabla histórica "Rendimiento": sticky + scroll horizontal | medio | medio | ✅ `a89670b` |
| **D** | Tiempo real: verificar standby + endurecer + excepción tabla histórica | medio | medio-alto | ✅ `5216ca3` |
| **C2** | Tabla estadísticas: encabezados de columna + sticky consistente + ✕ | medio | medio | ⬜ pendiente |
| **E** | Vincular tarjetas de equipos (04) con la tabla histórica (06) | medio | medio-alto | ⬜ pendiente |

A/B/C/D cerrados (release v1.2.0). C2 y E son la segunda ronda: C2 refina la
tabla de la sección 06 (Slice C dejó el sticky+scroll pero el header quedó mal),
E linkea los datos de la 04 con la 06. C2 primero (visual, aislado), E después
(datos). Independientes entre sí.

---

## Slice A — Nav bar oscura en tema claro (Android 15 · 3 botones)

**Objetivo:** que la barra de navegación del sistema sea legible en tema claro (fondo claro, botones oscuros), igual que ya funciona en oscuro y que ya funciona la status bar.

**Estado actual (diagnóstico en dispositivo real):**
- vivo V2351, Android 15 (API 35), navegación de **3 botones**. App v1.1.0 (tiene el fix de barras `9652985`+`bf69257`).
- En tema claro: status bar OK, **nav bar = franja oscura**, botones casi invisibles. En oscuro todo bien. No se reproduce en emulador (estaba en gestos).
- Causa confirmada por `dumpsys window`: nuestra ventana tiene `navigationBarColor=0` (transparente). En Android 15 + edge-to-edge + 3 botones el sistema dibuja un **scrim de contraste oscuro** detrás de la nav bar transparente. El `navigationBarColor` de `styles.xml` no se aplica en runtime en API 35.

**Enfoque:** en `SystemBarsPlugin.setBarsTheme()` (`android/app/src/main/java/web/teamsubscup/app/SystemBarsPlugin.java`), dentro del `runOnUiThread`, agregar (guardado por API):
```java
window.setNavigationBarColor(bg);
window.setStatusBarColor(bg);
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) { // 29
    window.setNavigationBarContrastEnforced(false);
    window.setStatusBarContrastEnforced(false);
}
```
`bg` = color de tema que el plugin ya calcula (`#F4F4F0`/`#0C0F14`). Import `android.os.Build`.

**Archivos:** SOLO `SystemBarsPlugin.java`. **NO tocar** anti-flash del splash (`styles.xml`/`MainActivity`), `firebase-config.js`/`cloudinary.js`.

**Riesgos:** bajo. `setNavigationBarColor` deprecado en API 35 pero funcional en el path `decorFitsSystemWindows=true` de vivo (verificado); combinado con contraste off cubre ambos casos.

**Verificación (gate):** build limpio → instalar en el **teléfono físico** (`-s 10AE740S110015R`, es donde se reproduce; emulador en gestos no sirve) → tema claro: nav bar clara, 3 botones oscuros visibles; tema oscuro: nav bar oscura, iconos claros. Screenshot de cada tema. Inner loop opcional: emulador en 3 botones (`settings put secure navigation_mode 0`).

**Cierre:** commit `fix(android): nav bar legible en tema claro con 3 botones (desactiva scrim de contraste, color por tema)`.

---

## Slice B — Numeración/tamaño de las secciones 02 y 06

**Objetivo:** que las 6 secciones muestren su número + título con el mismo tamaño/estilo. Hoy 02 (Competiciones) y 06 (Partidos/Historial) se ven con número más chico / distinto a las demás.

**Estado actual (localizado):**
- 01/03/04/05 usan divisor estático uniforme `.proto-divider` con número grande + título (`index.html:277,286,291,296`: `<span class="pd-n">0X</span><span class="pd-t">…</span>`).
- **02** (Competiciones/Panel): número dentro de header sticky de carrusel — `public.js:172` y `public.js:212` (`.comp-sticky > .comp-title > .pd-n`), sin el `.pd-t` al mismo tamaño.
- **06** (Historial): igual, `history.js:368` (`.comp-sticky.hist-header > .comp-title > .pd-n`).
- El CSS de `.comp-title`/`.pd-n` vive en `redesign.css` (`.comp-sticky` línea 585); el de `.proto-divider`/`.pd-n`/`.pd-t` también en `redesign.css`.

**Enfoque:** unificar el tratamiento visual — que `.pd-n` (+ título) dentro de `.comp-title` (02 y 06) herede el mismo tamaño/estilo que `.proto-divider .pd-n/.pd-t`. Mayormente CSS; ajuste mínimo de markup si hace falta exponer el título. Cuidar que 02 y 06 son sticky con carrusel comp/fase: igualar tamaño **sin romper** el sticky ni los carruseles.

**Archivos:** `redesign.css` (reglas `.comp-title`/`.pd-n` en 02/06 vs `.proto-divider`), y si hace falta markup: `public.js` (compHead) y `history.js` (hist-header). **NO tocar** el navegador comp/fase (`.cc-*`) ni el sticky.

**Riesgos:** bajo-medio (CSS compartido; no romper carrusel/sticky). Mitigación: cambiar solo tamaño/tipografía del número+título, no el layout del sticky.

**Verificación (gate):** en móvil (emulador/CDP) recorrer las 6 secciones: número + título del mismo tamaño en todas; sticky y carruseles intactos; desktop sin regresión.

**Cierre:** commit `fix(ui): unifica numeración/tamaño de las secciones 02 y 06 con las demás`.

---

## Slice C — Tabla histórica "Rendimiento": 2 filas → sticky + scroll horizontal

**Objetivo:** al expandir "Rendimiento" en la tabla histórica (sección 06), mostrar **una fila por equipo** con **nombre de equipo sticky (congelado) + scroll horizontal en las stats**, igual que la tabla de posiciones de la sección 2. Hoy se ve en dos filas (demasiados datos en pantalla).

**Estado actual (localizado):**
- Al expandir "Rendimiento" (`history.js:1377`, `layout.key==='detail'`), el detalle se pinta con `.ht-detail` = grid `repeat(4,minmax(0,1fr))` (`redesign.css:1318`) que **envuelve las stats en una segunda fila** bajo cada equipo.
- Markup/CSS de la tabla histórica: `.ht-card`/`.ht-row`/`.ht-detail` en `redesign.css:1299-1327`; render en `history.js` (`renderPubHistoryStandings`, ~1345+).
- Patrón objetivo (tabla de posiciones sección 2): `renderGroupTable` (`standings.js:152`) — Sonnet debe leer su markup/CSS real para replicar el patrón sticky-primera-columna + `overflow-x:auto`.

**Enfoque:** reemplazar el layout de 2 filas por un contenedor con `overflow-x:auto` y la primera celda (escudo+nombre) en `position:sticky; left:0`, con las stats como columnas que se deslizan horizontalmente. Mantener funcionando la barra de rendimiento y el toggle +/− (`ht-head-btn`).

**Archivos:** `history.js` (`renderPubHistoryStandings` / render del detalle), `redesign.css` (`.ht-*`). **NO tocar** el cálculo de stats (`s.rendimiento`, DG, Pts en `history.js:1311-1320`) ni `renderGroupTable` (reusar patrón, no mutarlo).

**Riesgos:** medio (reescritura del render + CSS). Mitigación: no tocar el cálculo; preservar barra de rendimiento y toggle; probar con muchos equipos (scroll real).

**Verificación (gate):** en móvil (emulador/CDP), sección 06 → expandir Rendimiento: una fila por equipo, nombre fijo al hacer scroll horizontal de las stats, sin doble fila; paridad de comportamiento con la tabla de la sección 2; toggle +/− y barra OK.

**Cierre:** commit `fix(historial): tabla de rendimiento con nombre sticky + scroll horizontal (como posiciones)`.

---

## Slice D — Tiempo real: verificar standby + endurecer + excepción tabla histórica

> **Corrección importante del supervisor:** el tiempo real **YA está implementado** (Fase 6A). Este slice NO construye tiempo real desde cero — verifica el caso "standby un día", lo endurece si hace falta, y confirma la excepción de la tabla histórica.

**Estado actual (verificado en código):**
- `liveSubscribe(key, stores, onChange)` (`live.js:37`) usa `dbSubscribe` → `onSnapshot` (Firestore, `db.js:144`): fuente autoritativa del servidor, datos siempre frescos, con debounce (200ms) e ignora el 1er snapshot por colección (la vista ya se pintó con fetch normal).
- `_subscribeFocusedPublicSection(page, forceRefresh)` (`nav.js:333`, llamado en `nav.js:439`) ya cablea las secciones al foco:
  - palmares → `['palmares','palmares-comps','settings','teams']`
  - panel/competiciones → `['matches','phases','teams','competitions']`
  - equipos → `['teams']`
  - calendario → `['matches','phases','teams','calDayLabels','competitions']`
  - historial → `['matches','teams','phases']`
  - sorteo → suscripción propia en `sorteo.js`.
- **Una sola suscripción activa a la vez** (`liveStop()` cancela la anterior al cambiar de sección). Es correcto: solo la sección enfocada se actualiza en vivo (no se ven 6 a la vez). → las 6 secciones SÍ son tiempo real, cada una cuando está enfocada.

**Respuesta a "¿standby un día?":** la sección enfocada está suscrita por `onSnapshot`; al volver del background, el SDK de Firestore reconecta y entrega snapshot fresco → re-render. Si el WebView fue matado por el SO → cold start → datos frescos igual. **Punto débil a verificar/endurecer:** no hay handler de `visibilitychange`/resume que fuerce un re-fetch; se depende 100% de la reconexión de `onSnapshot`, que en WebView móvil tras un día puede quedar en un caso borde sin entregar snapshot.

**Enfoque:**
1. **Verificar** en el teléfono el caso real: dejar la app en una sección (p.ej. Calendario) en background ~horas/día, cambiar un dato desde admin en otro device, volver a foreground → ¿se actualiza? (medir con CDP/logcat si `onChange` dispara).
2. **Endurecer** si el paso 1 falla o es poco fiable: agregar un handler `visibilitychange` que, al volver a visible, invoque `_subscribeFocusedPublicSection(currentPage, /*forceRefresh*/ true)` (ya existe el parámetro `forceRefresh` que hace un render inmediato) o re-fetchee la sección enfocada. Belt-and-suspenders para el standby largo.
3. **Confirmar la excepción tabla histórica:** el usuario pide que la tabla histórica se actualice **solo al finalizar una temporada**, no en vivo. Hoy `historial` se suscribe a `['matches','teams','phases']` → un cambio de partido re-renderiza todo el historial (incluida la tabla). Verificar que la tabla histórica solo refleja temporadas finalizadas (dato no cambia con partidos de la temporada en curso); si el re-render en vivo es solo trabajo desperdiciado, aceptable; si llegara a mostrar datos de la temporada activa en la tabla histórica, corregir para que esa sub-vista se recompute solo al finalizar temporada.

**Archivos probables:** `nav.js` (handler visibilitychange + `_subscribeFocusedPublicSection`), y `history.js` solo si la tabla histórica necesita aislar su recomputo. **NO tocar** `dbSubscribe`/`liveSubscribe` (mecanismo estable) salvo bug real; no romper el "una suscripción a la vez".

**Riesgos:** medio-alto. Cuidar: no duplicar suscripciones (fugas), no re-render churn (el dedup por JSON de `dbSubscribe` + el ignora-primer-snapshot ayudan), preservar scroll (ya hay `_pubWrapWithScrollAnchor`), no reiniciar animaciones de conteo innecesariamente.

**Verificación (gate):** con dos clientes (admin + público, o emulador + teléfono): cambiar un resultado y ver que la sección enfocada se actualiza sin re-navegar; dejar en background un rato y confirmar refresh al volver a foreground; la **tabla histórica NO cambia** con partidos de la temporada en curso; sin fugas de listeners al cambiar de sección (verificable contando `_liveUnsubs`).

**Cierre:** commit `feat(realtime): refresh de la sección enfocada al volver de background (+ excepción tabla histórica)` (o el alcance real que resulte de la verificación).

---

## Slice C2 — Tabla de estadísticas (06): encabezados de columna + sticky consistente + ✕

**Objetivo:** en la vista expandida "Estadísticas" de la tabla histórica, mostrar los nombres de stat **una sola vez como encabezado de columna** (no repetidos en cada fila), con el nombre de equipo sticky **también en el header**, y el ✕ de colapsar bien posicionado.

**Estado actual (localizado — feedback del usuario con 2 screenshots):** Slice C dejó el sticky+scroll de los valores funcionando, pero el header y las filas tienen **estructura distinta** y no alinean:
- `_htHeader` en detail ([history.js:1383](tsc-src/js/history.js:1383)) solo renderiza `<div class="ht-fix"># Equipo</div>` + un botón único "Estadísticas ✕". **No pone etiquetas de columna** (PJ PG PE…).
- Cada fila (`_htStatCell`, [history.js:1366](tsc-src/js/history.js:1366)) mete `<div class="ht-detail-item"><span>PJ</span><b>179</b></div>` por stat → **la etiqueta se repite en cada equipo**.
- Consecuencias (imágenes del usuario): (a) los nombres de stat acompañan a cada equipo en vez de ser encabezado; (b) el header (corto: sticky+1 botón) no comparte columnas con las filas (8 stats) → al scrollear queda desalineado/vacío y el "# Equipo" del header parece "no sticky"; (c) el ✕ mal posicionado.
- Nota: Slice C cambió `.ht-detail` a `display:flex;flex-wrap:nowrap;gap:16px` con `.ht-detail-item{min-width:50px}` ([redesign.css:1318](tsc-src/css/redesign.css) aprox), así que el `detailCols` grid ya no se usa en detail — los 8 stats van en scroll horizontal.

**Enfoque:** que el **header en detail espeje la estructura de la fila**:
- Header detail = `.ht-fix` sticky (# Equipo) + un `.ht-detail` con las **8 etiquetas de columna** (PJ PG PE PP GF GC DIF PTS) en el mismo layout flex que las filas (mismos anchos, `min-width:50px`), + el ✕ de colapsar ubicado en la zona sticky del header (junto a "# Equipo") o como control claro, no como "columna extra".
- Filas: `.ht-detail-item` muestra **solo el valor** (`<b>`), sin la etiqueta por celda. Ajustar `_htStatCell` (o separar en `_htStatHeadCell` para el header con label y `_htStatCell` para la fila con solo valor).
- Verificar que el `.ht-fix` del header y el de las filas queden **alineados a la misma columna sticky** y con el mismo ancho (150px), para que "# Equipo" quede fijo tanto en header como en filas al scrollear.

**Archivos:** `history.js` (`_htHeader`, `_htRow`, `_htStatCell`), `redesign.css` (`.ht-detail`/`.ht-detail-item` en header vs fila; alineación de anchos). **NO tocar** los layouts no-detail (compact/trim/mid/wide/full) ni el cálculo de stats.

**Riesgos:** medio — header y filas deben quedar con exactamente las mismas columnas/anchos o el sticky y la alineación se rompen. Mitigación: compartir el mismo generador de columnas entre header y fila.

**Verificación (gate):** móvil, sección 06 → "Tabla histórica" → expandir Estadísticas: etiquetas (PJ PG PE PP GF GC DIF PTS) **una sola vez como header**, valores en las filas sin etiqueta; al scrollear horizontal el "# Equipo" queda **fijo tanto en el header como en las filas** (leer `getBoundingClientRect().left` del `.ht-fix` del header y de una fila antes/después de `scrollLeft`, delta ≈ 0 en ambos); ✕ bien posicionado y colapsa a compact. Sin regresión en los layouts anchos de desktop.

**Cierre:** commit `fix(historial): encabezados de columna + sticky del header en la tabla de estadísticas`.

---

## Slice E — Vincular tarjetas de equipos (04) con la tabla histórica (06)

**Objetivo:** que los agregados de las tarjetas de equipos (PARTIDOS, VICTORIAS %, TÍTULOS) coincidan con la tabla histórica (solo temporadas finalizadas), y que la FORMA siga siendo el pulso reciente (últimos partidos reales, incluida la temporada en curso). Decidido con el usuario 2026-07-11.

**Estado actual (confirmado en código):** las dos secciones cuentan de fuentes casi iguales con **filtro distinto**:
- Tabla histórica (`_computeHistoricalStandings`, [history.js:1261](tsc-src/js/history.js:1261)): `livesEligible = ...filter(finishedSet.has(seasonRef))` → **solo temporadas finalizadas** (`finishedSet` = seasons con `status==='finished'`).
- Tarjetas (`_computeTeamStats` → `_getResolvedRecords`, [history.js:416](tsc-src/js/history.js:416)): `all = [...staticRows, ...idbLive]` → **todas las lives, incl. temporada en curso**.
- Por eso p.ej. Fenomenos = 156 (tarjeta) vs 154 (histórica): la diferencia son los partidos de la temporada en curso.
- Dato clave del flujo: `appendOrUpdateHistory()` ([history.js:129](tsc-src/js/history.js:129)) escribe cada resultado a `matchHistory` (`source:'live'`, `seasonRef`) **apenas se carga** (no al cerrar temporada) → la temporada en curso ya está en `matchHistory` en tiempo real. Por eso la FORMA ya es "en vivo" = las competiciones de la sección 02, sin cablear nada nuevo.

**Enfoque:** en `_computeTeamStats` (teams.js, [teams.js:704](tsc-src/js/teams.js:704)) separar el loop:
- **Agregados** (pj/v/e/p → PARTIDOS/VICTORIAS): contar **solo** registros de temporada finalizada (`source==='static'` siempre cuenta; los `live` solo si `finishedSet.has(seasonRef)`) — mismo criterio que `_computeHistoricalStandings`.
- **FORMA** (`recent`): construir de **todos** los registros (incl. temporada en curso), como ahora.
- Para el filtro necesita `seasonRef` por registro + `finishedSet`: **extender `_getResolvedRecords` de forma aditiva** para que adjunte `seasonRef` a cada registro live (hoy no lo hace), y en `_computeTeamStats` cargar `seasons` para el `finishedSet`. **NO** filtrar dentro de `_getResolvedRecords` (es compartido con la vista "Partidos" y los hitos, que deben seguir mostrando TODO).

**Archivos:** `teams.js` (`_computeTeamStats`), `history.js` (`_getResolvedRecords` — solo agregar `seasonRef` al objeto devuelto, aditivo). **NO tocar** la vista Partidos (06), los hitos, ni `_computeHistoricalStandings`.

**Riesgos:** medio-alto (semántica de datos + helper compartido). Mitigación: el filtro vive solo en `_computeTeamStats`; `_getResolvedRecords` solo gana un campo, sus otros consumidores lo ignoran. Verificar que Partidos y hitos siguen contando todo.

**Detalle UX (por ahora sin etiqueta):** un equipo puede mostrar "154 PARTIDOS" con FORMA de partidos 155/156 (temporada en curso, no contados aún). Es lo normal en perfiles deportivos. Si en la verificación se ve confuso, evaluar un indicador sutil de "temporada en curso" en la forma — pero por defecto **dejarlo limpio, sin etiqueta**.

**Verificación (gate):** con datos del seed, comparar PARTIDOS de varios equipos en la sección 04 contra su PJ en la tabla histórica (06) — deben **coincidir** (p.ej. Fenomenos igual en ambas). Confirmar que la vista "Partidos" (06) y los hitos siguen contando la temporada en curso (no cambian). Confirmar que la FORMA sigue reflejando los últimos resultados reales.

**Cierre:** commit `fix(equipos): agregados de las tarjetas alineados con la tabla histórica (forma sigue en vivo)`.

---

## Notas de cierre del macro

- Cada slice: pre (plan/archivos/riesgos/gates ya acá) → Sonnet implementa → post (diff/pruebas/evidencia real) → auditoría del supervisor → OK → commit sin push.
- A/B/C/D ya cerraron en el release v1.2.0 (`b836f5c`). Al cerrar C2 + E: regenerar APK release limpio (bump a v1.3.0), verificar hash de las 11 copas dentro del zip + firma, y recién ahí push/merge a `main`.
- C2 y E son web (solo `tsc-src/`): se verifican con `npx serve tsc-src` + CDP a ancho móvil; no requieren build Android hasta el release final.
