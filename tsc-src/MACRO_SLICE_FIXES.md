# Macro Slice — Fixes App (post v1.1.0) · 2026-07-11

> Estado **verificado en código** por el supervisor (Claude Opus 4.8) el
> 2026-07-11. Cuatro fixes pedidos por el usuario. Cada slice se ejecuta y
> cierra por separado (Sonnet implementa, el supervisor audita con evidencia
> real antes del OK). No se avanza al siguiente sin cierre del anterior.

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

| # | Slice | Tamaño | Riesgo | Depende de |
|---|---|---|---|---|
| **A** | Nav bar legible en tema claro (3 botones / Android 15) | chico | bajo | — (prompt ya entregado) |
| **B** | Numeración/tamaño de secciones 02 y 06 | chico | bajo | — |
| **C** | Tabla histórica "Rendimiento": sticky + scroll horizontal | medio | medio | — |
| **D** | Tiempo real: verificar standby + endurecer + excepción tabla histórica | medio | medio-alto | conviene ir última |

A/B/C son independientes entre sí (se pueden hacer en cualquier orden o en paralelo). D va al final porque toca el flujo de datos y su verificación es la más larga.

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

## Notas de cierre del macro

- Cada slice: pre (plan/archivos/riesgos/gates ya acá) → Sonnet implementa → post (diff/pruebas/evidencia real) → auditoría del supervisor → OK → commit sin push.
- Al terminar los 4: regenerar APK release limpio (bump de versión), verificar hash de las 11 copas dentro del zip + firma, y recién ahí push/merge a `main`.
