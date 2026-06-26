# Pre-slice — C-polish · Fidelidad de shell (full-width + títulos de sección + topbar móvil)
> **v2 (2026-06-26) tras dictamen de Codex.** Corrige 3 puntos: (1) el divider genérico va **solo en 4 secciones** (Palmarés/Calendario/Equipos/Sorteo); Competiciones e Historial integran su número en `.comp-sticky` → encabezado especial = **Slice A**, no C-polish (elimina el doble-sticky). (2) el chrome dinámico estaba **incompleto**: hay más hardcodes que `CHROME_OFFSET` (scroll-margin-top, min-height, ticker top, marginTop inline, rootMargin inmutable). (3) gatear la 2ª fila móvil con una **clase de modo público** en el topbar. Además: `.proto-divider` y `.load-more` **ya existen** en `redesign.css` → reutilizar, no portar.
> Orden maestro: **C → C-polish → Equipos → A → B → D.** C-polish va inmediatamente tras C (mismo shell) y antes de A (A asume shell estable y construye los encabezados especiales de Competiciones/Historial).

## Brújula (2026-06-25)
La lógica gana **solo** en datos/permisos/persistencia; en **layout/estética/motion gana el prototipo** salvo conflicto duro documentado. Los 3 ítems son estética/estructura de shell → fidelidad alta exigida.

## Objetivo
Cerrar la fidelidad estructural del scroll continuo público: (1) contenido a **ancho completo**; (2) **títulos de sección** numerados/sticky en las 4 secciones de divider genérico, consistentes con el topnav; (3) **fila propia para la nav de secciones en móvil**. Sin tocar contenido de secciones ni admin.

---

## Ítem 1 — Full-width (el contenido no ocupa todo el ancho)
**Estado real:** `#main{ margin-top:60px; padding:20px 18px; max-width:1400px; margin:auto }` ([layout.css:223-228](css/layout.css:223)) capa y centra TODO. El prototipo no capa. **Contradice la design-pref** ("desktop full-width sin espacio lateral").
- `#main.with-sidebar{margin-left:200px}` ([layout.css:229](css/layout.css:229)) = admin → **no tocar**.
- C ya añadió el gate `#main.public-scroll` (con `overflow-x:clip`, [redesign.css:17](css/redesign.css:17)).

**Acción:** en `redesign.css`:
```css
#main.public-scroll{ max-width:none; }   /* full-width solo en público; admin conserva 1400 */
```
Conservar el `padding:20px 18px` (gutter). Verificar admin (1400 + `.with-sidebar`) intacto.

**Riesgo:** en pantallas ultra-anchas, grids internos que asumían ~1400 podrían estirarse. **Mitigación:** el shell va full-width; si una sección molesta, se capa por dentro (A), no en `#main`. QA ≥2000px.

---

## Ítem 2 — Títulos de sección · **SOLO 4 dividers genéricos** (corrección Codex)
**Estado real:** cada `.page` pública trae `<div class="section-lbl">` ([index.html:160-183](index.html:160)) **salvo `page-palmares`**; `.section-lbl` ([components.css:4-9](css/components.css:4)) es label pequeño no-sticky, sin numerar, con nombres **inconsistentes con el topnav**.

**El prototipo NO usa el mismo encabezado en las 6:**
- **Divider genérico `.proto-divider`** (numerado + nombre + línea) → **Palmarés (01)**, **Calendario (03)**, **Equipos (04)**, **Sorteo (05)** ([prototype.html:1133](prototype.html:1133)/[1157](prototype.html:1157)/[1200](prototype.html:1200)/[1212](prototype.html:1212)).
- **Encabezado especial `.comp-sticky > .comp-title`** con el número integrado (`<span class="pd-n">02/06</span>`) + carruseles → **Competiciones (02)** ([prototype.html:1141-1147](prototype.html:1141)) e **Historial (06)** ([prototype.html:1260-1264](prototype.html:1260)).

**`.proto-divider` YA existe** en `redesign.css:132-135` (versión **no-sticky**) → **reutilizar y solo añadirle el sticky** (`position:sticky; top:var(--chrome-h)`), no redefinir.

**Acción C-polish (solo las 4 de divider genérico):**
- Añadir a `.proto-divider` (redesign.css) `position:sticky; top:var(--chrome-h); z-index:30; background:var(--bg); padding:6px 0 18px;` (mismo patrón que `.comp-sticky`).
- Reemplazar el `.section-lbl` de **Palmarés / Calendario / Equipos / Sorteo** por `.proto-divider` con número + nombre **EXACTO del botón**: `01 Palmarés` · `03 Calendario` · `04 Equipos` · `05 Sorteo`. Añadir a `page-palmares` (hoy no tiene).
- **NO tocar** `page-panel` (Competiciones) ni `page-historial`: su `.section-lbl` actual se conserva hasta que **Slice A** construya el `.comp-sticky > .comp-title` con `pd-n` 02/06 integrado (A ya crea esos carruseles cc-comp/cc-fase/cc-hist). **C-polish no crea esos dos encabezados** → así **no hay doble-sticky**.
- **NO tocar** `.section-lbl` de las páginas **admin**.

**Numeración:** fija 01/03/04/05 aquí (02/06 los pone A). Sorteo arranca `hidden` ([index.html:175](index.html:175)) → su "05" no se ve si está oculto; **no renumerar** dinámicamente.

---

## Ítem 3 — Topbar móvil · Opción A (fila propia) · **chrome dinámico COMPLETO** (corrección Codex)
**Estado real:** topbar de **una fila de 48px** ([layout.css:15-19](css/layout.css:15)); la nav (`.topbar-nav{flex:1}`, [redesign.css:31](css/redesign.css:31)) queda aplastada en móvil entre marca y cluster derecho. El `.tn-track` ya scrollea horizontal pero su ventana es inusable.

**Sustituir `CHROME_OFFSET` NO basta.** Inventario completo de hardcodes atados a 48/82 que deben derivar del chrome real:
| Hardcode | Ubicación | Hoy |
|---|---|---|
| `CHROME_OFFSET = 82` | [redesign-shell.js:5](js/redesign-shell.js:5) | scrollspy + smooth-scroll |
| `rootMargin:'-90px 0px -55% 0px'` **(INMUTABLE)** | [redesign-shell.js:111](js/redesign-shell.js:111) | focusObserver |
| `scroll-margin-top:82px` | [redesign.css:21](css/redesign.css:21) | ancla de sección |
| `min-height:calc(100vh - 82px)` | [redesign.css:25](css/redesign.css:25) | sección no montada |
| `.comp-sticky{top:82px}` | [redesign.css:407](css/redesign.css:407) | encabezado Competiciones/Historial |
| `#ticker{top:48px}` + `#main.with-ticker{padding-top:42px}` | [redesign.css:76](css/redesign.css:76)/[86](css/redesign.css:86) | ticker + clearance manual |
| `main.style.marginTop='60px'` (inline) | [nav.js:63](js/nav.js:63) | clearance de #main |
| `#main{margin-top:60px}` | [layout.css:224](css/layout.css:224) | clearance base |

**Bug latente que esto arregla:** el ticker es **condicional** (`#ticker{display:none}` hasta que JS lo muestra). Con el `82`/`48` fijos, **sin ticker el offset y el clearance sobran 34px**. Medir el chrome lo corrige.

**Acción (Opción A + chrome dinámico):**
1. **`--chrome-h` (+ `--topbar-h`)** como custom properties en `variables.css`. Un helper mide topbar+ticker reales y escribe `--chrome-h` en `:root`/`#main`, con **`ResizeObserver` sobre `#topbar` y `#ticker`** + recálculo en `resize` y **cuando el ticker aparece/desaparece** (toggle de `.with-ticker`).
2. **Reemplazar TODOS los hardcodes de la tabla** por `var(--chrome-h)` (o derivados): `scroll-margin-top`, `min-height`, `.comp-sticky` top, `.proto-divider` top, `#ticker` top, `#main` clearance (`.with-ticker` y el `marginTop` inline de [nav.js:63](js/nav.js:63) → derivar de `--chrome-h`, no `'60px'`).
3. **focusObserver (rootMargin inmutable):** parametrizar el rootMargin en función de `--chrome-h` y **reconstruir el observer** cuando `--chrome-h` cambie. Anclaje: reusar `refreshPublicScrollSections` ([redesign-shell.js:114-119](js/redesign-shell.js:114)) que ya hace `disconnect()`+re-`observe()` de los 3 observers → recrear el focusObserver ahí con el nuevo rootMargin.
4. **`@media(max-width:~600px)`:** `#topbar` a **dos filas** (`flex-wrap`) → fila 1 = marca + cluster derecho; fila 2 = `.topbar-nav` full-width (con su `.tn-track` scroll + fade). El topbar crece; `--chrome-h` y el ticker se recalculan solos (paso 1).
5. **Gate de modo público (corrección Codex):** en `syncRedesignShellMode(mode)` ([redesign-shell.js:182-184](js/redesign-shell.js:182), ya togglea `is-hidden`) añadir `topbar.classList.toggle('public-mode', mode==='public')`. La 2ª fila móvil se gatea con `#topbar.public-mode` → **admin queda en una sola fila**.

**Esto MODIFICA Macro Slice C** ([redesign-shell.js](js/redesign-shell.js): offset, observer, shell-mode) → declarado. Justificación: (a) imposible dar fila propia sin offset responsive; (b) arregla el bug del ticker condicional. **Requiere OK de Codex.**

---

## Fuera de alcance (NO entra)
- Encabezados especiales de **Competiciones (02)** e **Historial (06)** → **Slice A** (con sus carruseles).
- Contenido/internals de cualquier sección (`renderPub*`).
- Admin (page-based; `.section-lbl` admin intacto; cap 1400 intacto; una sola fila de topbar).
- Lógica del observer/`focusPublicSection`/`ensurePublicSectionMounted` (de C) — **solo** se cambia el offset (→ medido), el rootMargin (→ derivado + reconstrucción) y se añade `--chrome-h` + `public-mode`.
- `live.js`, `palmares.js`, renderers compartidos.

## Archivos a tocar / NO tocar
**Tocar:** `redesign.css` (`#main.public-scroll{max-width:none}` + sticky a `.proto-divider` + todos los `82`→`var(--chrome-h)`), `index.html` (`.section-lbl`→`.proto-divider` en **Palmarés/Calendario/Equipos/Sorteo** + divider en Palmarés + 2ª fila topbar si requiere markup), `variables.css` (`--chrome-h`/`--topbar-h`), `layout.css` (`@media` topbar 2 filas; `#main` margin-top→`--chrome-h`), `redesign-shell.js` (offset medido + helper de medición + ResizeObserver + reconstrucción focusObserver + `public-mode` en `syncRedesignShellMode`), `nav.js` (marginTop inline → `--chrome-h`). **Modifica C, con justificación.**
**NO tocar:** lógica del observer/focus de C (salvo offset/rootMargin), `page-panel`/`page-historial` (encabezado = A), `live.js`, `palmares.js`, renderers, `.section-lbl` admin, `#main.with-sidebar`, `cloudinary.js`/`firebase-config.js`.

## Riesgos + mitigaciones
| Riesgo | Mitigación |
|---|---|
| Doble-sticky en Competiciones/Historial | **Eliminado:** C-polish no les pone divider; su encabezado (con número) lo hace A en `.comp-sticky` |
| Hardcode de 82/48/60 olvidado → sticky/clearance roto | Tabla-inventario completa; `--chrome-h` única fuente; QA scroll 6 secciones desktop+móvil, con y sin ticker |
| rootMargin inmutable no se actualiza en móvil | Reconstruir focusObserver vía `refreshPublicScrollSections` al cambiar `--chrome-h` |
| Full-width estira grids en pantallas anchas | Capar por sección (A) si molesta; QA ≥2000px |
| 2ª fila del topbar aparece en admin | Gate `#topbar.public-mode` desde `syncRedesignShellMode` |
| Tocar C sin OK | Declarado como modificación de C con justificación → Codex aprueba antes |

## Pasos de ejecución
CP0 (≤10%) → `--chrome-h`/`--topbar-h` en variables.css + helper de medición (ResizeObserver topbar/ticker, recálculo en resize y toggle de ticker) → reemplazar **todos** los hardcodes de la tabla por `var(--chrome-h)`/derivados (incl. `marginTop` inline de nav.js) → focusObserver: rootMargin derivado + reconstrucción al cambiar `--chrome-h` → `public-mode` en `syncRedesignShellMode` → `#main.public-scroll{max-width:none}` (verificar admin) → `.proto-divider` sticky + reemplazar `.section-lbl` en las **4** públicas + Palmarés → `@media` topbar 2 filas en móvil → QA → `graphify update .`.

## Gates de uso
CP0 `five_hour ≤ 10%` · freeze 65% · cierre 75%. Máx 3 subagentes solo-lectura/QA · 1 escritor.

## QA esperada
- Público full-width (gutter conservado); **admin: cap 1400 + sidebar + una sola fila de topbar**.
- 4 secciones (Palmarés/Calendario/Equipos/Sorteo) con divider numerado sticky = nombre del botón; Competiciones/Historial **sin tocar** (su encabezado llega en A).
- **Móvil:** nav de secciones en **fila propia full-width**; cluster derecho no la aplasta; admin sigue en una fila.
- Scroll/scrollspy/smooth-scroll correctos desktop **y** móvil; offset y clearance correctos **con y sin ticker** (bug latente corregido); focusObserver reconstruido al cambiar breakpoint.
- `node --check` (redesign-shell.js, nav.js) · consola limpia · admin→público ok · sin emojis · SVG Lucide.

## Criterios de OK de Codex (P4)
- `#main.public-scroll{max-width:none}` solo público; admin diff-cero funcional.
- Divider sticky en **solo 4** secciones; Competiciones/Historial intactas (encabezado especial reservado a A); **sin doble-sticky**.
- `.proto-divider`/`.load-more` **reutilizados** (no redefinidos).
- **Todos** los hardcodes de la tabla → `var(--chrome-h)`; offset medido; focusObserver reconstruido; bug del ticker condicional corregido.
- 2ª fila móvil gateada por `#topbar.public-mode` (admin una fila).
- Modificación de C **declarada y justificada**; sin tocar la lógica del observer/focus; diff quirúrgico.
