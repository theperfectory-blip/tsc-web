# Pre-slice — C-polish · Fidelidad de shell (full-width + títulos de sección + topbar móvil) — ✅ COMPLETADO (2026-06-27)
> **v4 (2026-06-27) cierre aprobado por usuario.** Slice cerrado y en `redesign/migration`. **Próximo slice = A.** Además del alcance original, por pedido explícito se adelantó el encabezado de **Competiciones (02)** e **Historial (06)** (ver "Encabezados 02/06" abajo).
> **v3 (2026-06-26) tras 2º dictamen de Codex.** Corrige el **admin diff-cero**: el chrome dinámico NO toca el `margin-top:60px` global (`layout.css`/`nav.js` quedan **intactos**); se aplica **solo** gateado por `#main.public-scroll` (con `!important` que vence el inline de nav.js) y la 2ª fila móvil vive en `redesign.css` gateada por `#topbar.public-mode`. Así **C-polish no toca `layout.css` ni `nav.js`**.
> v2 ya había corregido: divider genérico solo en 4 secciones (sin doble-sticky); inventario completo de hardcodes; `.proto-divider`/`.load-more` reutilizados.
> Orden maestro: **C → C-polish → Equipos → A → B → D.**

## Brújula (2026-06-25)
La lógica gana **solo** en datos/permisos/persistencia; en **layout/estética/motion gana el prototipo** salvo conflicto duro documentado. Los 3 ítems son estética/estructura de shell → fidelidad alta exigida.

## Objetivo
Cerrar la fidelidad estructural del scroll continuo público: (1) **full-width**; (2) **títulos de sección** numerados/sticky en las 4 secciones de divider genérico; (3) **fila propia para la nav en móvil**. **Sin tocar el clearance global ni nada del admin.**

---

## Ítem 1 — Full-width (el contenido no ocupa todo el ancho)
**Estado real:** `#main{ margin-top:60px; padding:20px 18px; max-width:1400px; margin:auto }` ([layout.css:223-228](css/layout.css:223)) capa y centra TODO. El prototipo no capa. **Contradice la design-pref** ("desktop full-width sin espacio lateral").
- `#main.with-sidebar{margin-left:200px}` ([layout.css:229](css/layout.css:229)) = admin → **no tocar**.
- C ya añadió el gate `#main.public-scroll` (`overflow-x:clip`, [redesign.css:17](css/redesign.css:17)).

**Acción (en `redesign.css`, gateado por `#main.public-scroll`):** ver Ítem 3 (el `max-width:none` se aplica junto con el clearance dinámico, en la misma regla pública).

**Riesgo:** en pantallas ultra-anchas, grids internos que asumían ~1400 podrían estirarse. **Mitigación:** el shell va full-width; si una sección molesta, se capa por dentro (A), no en `#main`. QA ≥2000px.

---

## Ítem 2 — Títulos de sección · **SOLO 4 dividers genéricos**
**Estado real:** cada `.page` pública trae `<div class="section-lbl">` ([index.html:160-183](index.html:160)) **salvo `page-palmares`**; `.section-lbl` ([components.css:4-9](css/components.css:4)) es label pequeño no-sticky, sin numerar, con nombres **inconsistentes con el topnav**.

**El prototipo NO usa el mismo encabezado en las 6:**
- **Divider genérico `.proto-divider`** (numerado + nombre + línea) → **Palmarés (01)**, **Calendario (03)**, **Equipos (04)**, **Sorteo (05)** ([prototype.html:1133](prototype.html:1133)/[1157](prototype.html:1157)/[1200](prototype.html:1200)/[1212](prototype.html:1212)).
- **Encabezado especial `.comp-sticky > .comp-title`** con el número integrado (`<span class="pd-n">02/06</span>`) + carruseles → **Competiciones (02)** ([prototype.html:1141-1147](prototype.html:1141)) e **Historial (06)** ([prototype.html:1260-1264](prototype.html:1260)).

**`.proto-divider` YA existe** en `redesign.css:132-135` (versión **no-sticky**) → **reutilizar y solo añadirle el sticky** (`position:sticky; top:var(--chrome-h)`).

**Acción C-polish (4 dividers genéricos):**
- Añadido a `.proto-divider` (redesign.css) `position:sticky; top:var(--chrome-h); z-index:30; background:var(--bg); padding:6px 0 18px;`.
- Reemplazado el `.section-lbl` de **Palmarés / Calendario / Equipos / Sorteo** por `.proto-divider` con número + nombre **EXACTO del botón**: `01 Palmarés` · `03 Calendario` · `04 Equipos` · `05 Sorteo`. Añadido a `page-palmares`.
- **NO tocar** `.section-lbl` de las páginas **admin**.

**Numeración:** fija 01/03/04/05 (Sorteo arranca `hidden` → su "05" no se ve si está oculto; **no renumerar** dinámicamente).

### Encabezados 02/06 — adelantados por pedido explícito (2026-06-27)
Fuera del alcance v3 (que los dejaba para A), el usuario pidió construirlos ya:
- **Competiciones (02) — ✅ HECHO Y FINAL.** `renderPubPanel` ([public.js](js/public.js)) emite `.comp-sticky > .comp-title` con `<span class="pd-n">02</span>` + carruseles `cc-comp`/`cc-fase` (ya migrados). `page-panel` ya no tiene `section-lbl`. El empty/off-season también renderiza el header. **A NO lo toca.**
- **Historial (06) — placeholder de shell, A lo reemplaza.** `page-historial` tiene un `.proto-divider` con `pd-n "06" Historial` **solo como placeholder**. **Slice A debe REEMPLAZARLO** (no añadir un segundo título) por `.comp-sticky` con un carrusel **`cc-hist`** que reutilice el comportamiento horizontal exacto de la sección 02. Opciones del carrusel: **Historial** ↔ **Tabla histórica**. Sin controles duplicados ni navegación actual paralela. Ver `PRE_SLICE_A.md` Paso 4d.

---

## Ítem 3 — Topbar móvil · Opción A (fila propia) · chrome dinámico **gateado solo por público** (corrección Codex)
**Estado real:** topbar de **una fila de 48px** ([layout.css:15-19](css/layout.css:15)); la nav (`.topbar-nav{flex:1}`, [redesign.css:31](css/redesign.css:31)) queda aplastada en móvil entre marca y cluster derecho.

### Principio (corrección Codex): admin diff-cero
El `margin-top:60px` global de [layout.css:224](css/layout.css:224) y el `main.style.marginTop='60px'` inline de [nav.js:63](js/nav.js:63) **NO se tocan** (los usa el admin). El chrome dinámico se aplica **solo** gateado por `#main.public-scroll`, con `!important` que **vence el inline de nav.js**:
```css
#main.public-scroll{
  margin-top: var(--chrome-h) !important;   /* vence el marginTop='60px' inline de nav.js, solo en público */
  max-width: none;                          /* Ítem 1 */
}
#main.public-scroll.with-ticker{
  padding-top: 20px;   /* el clearance del ticker ya está dentro de --chrome-h → solo gutter base */
}
```
En admin (sin `.public-scroll`) `#main` conserva `margin-top:60px` y el cap 1400 → **diff-cero**.

### Hardcodes a parametrizar — **todos en `redesign.css`/`redesign-shell.js` (público), NINGUNO en `layout.css`/`nav.js`**
| Hardcode | Ubicación | Acción |
|---|---|---|
| `CHROME_OFFSET = 82` | [redesign-shell.js:5](js/redesign-shell.js:5) | → medición dinámica del chrome real |
| `rootMargin:'-90px 0px -55% 0px'` **(INMUTABLE)** | [redesign-shell.js:111](js/redesign-shell.js:111) | → derivar de `--chrome-h` + **reconstruir** observer al cambiar |
| `scroll-margin-top:82px` | [redesign.css:21](css/redesign.css:21) | → `var(--chrome-h)` |
| `min-height:calc(100vh - 82px)` | [redesign.css:25](css/redesign.css:25) | → `calc(100vh - var(--chrome-h))` |
| `.comp-sticky{top:82px}` | [redesign.css:407](css/redesign.css:407) | → `var(--chrome-h)` (público) |
| `.proto-divider` sticky (nuevo) | redesign.css | `top:var(--chrome-h)` |
| `#ticker{top:48px}` | [redesign.css:76](css/redesign.css:76) | → `var(--topbar-h)` (va pegado bajo el topbar) |
| `#main.with-ticker{padding-top:42px}` | [redesign.css:86](css/redesign.css:86) | reemplazado en público por `#main.public-scroll.with-ticker{padding-top:20px}` |
| `#main{margin-top:60px}` (admin) | [layout.css:224](css/layout.css:224) | **NO TOCAR** — neutralizado en público vía gate `!important` |
| `main.style.marginTop='60px'` (admin) | [nav.js:63](js/nav.js:63) | **NO TOCAR** — neutralizado en público vía gate `!important` |

**Bug latente que esto arregla:** el ticker es **condicional** (`#ticker{display:none}` hasta que JS lo muestra). Con `82`/`48` fijos, **sin ticker el offset y el clearance sobran 34px**. Medir el chrome lo corrige.

### Acción (Opción A + chrome dinámico, todo público)
1. **`--topbar-h` y `--chrome-h`** como custom properties en `variables.css` con **fallback** (`:root{ --topbar-h:48px; --chrome-h:82px }`) para que los sticky tengan valor válido siempre. Un helper en `redesign-shell.js` mide `#topbar` (→`--topbar-h`) y el borde inferior del chrome (`#topbar` + `#ticker` si visible →`--chrome-h`) y los escribe en `document.documentElement.style`, con **`ResizeObserver` sobre `#topbar` y `#ticker`** + recálculo en `resize` y al toggle de `.with-ticker`.
2. **Reemplazar los hardcodes públicos** de la tabla por `var(--chrome-h)`/`var(--topbar-h)`. El clearance de `#main` se hace **solo** con la regla pública de arriba (no se toca `layout.css`/`nav.js`).
3. **focusObserver:** rootMargin derivado de `--chrome-h`; **reconstruir** el observer cuando `--chrome-h` cambie, reusando `refreshPublicScrollSections` ([redesign-shell.js:114-119](js/redesign-shell.js:114), ya hace `disconnect()`+re-`observe()`).
4. **2ª fila móvil en `redesign.css` (NO `layout.css`):** `@media(max-width:~600px){ #topbar.public-mode{ flex-wrap:wrap } #topbar.public-mode .topbar-nav{ order:3; flex-basis:100%; } }` (con su `.tn-track` scroll+fade). El topbar crece → `--topbar-h`/`--chrome-h` se recalculan solos (paso 1).
5. **Gate de modo público:** en `syncRedesignShellMode(mode)` ([redesign-shell.js:182-184](js/redesign-shell.js:182), ya togglea `is-hidden`) añadir `topbar.classList.toggle('public-mode', mode==='public')`. La 2ª fila se gatea por `#topbar.public-mode` → **admin queda en una sola fila**.

**Esto MODIFICA Macro Slice C** ([redesign-shell.js](js/redesign-shell.js): offset, observer, shell-mode) y `redesign.css`/`variables.css` (públicos) → declarado. **NO toca `layout.css` ni `nav.js`.** Justificación: (a) imposible dar fila propia sin offset responsive; (b) arregla el bug del ticker condicional. **Requiere OK de Codex.**

---

## Fuera de alcance (NO entra)
- Encabezado **02 (Competiciones)** se construyó aquí (adelanto); **06 (Historial)** quedó como placeholder `.proto-divider` → **Slice A lo reemplaza** por `.comp-sticky` + `cc-hist`.
- Contenido/internals de cualquier sección (`renderPub*`).
- **`layout.css` y `nav.js`** (clearance global del admin) — **intactos**.
- Admin (page-based; `.section-lbl` admin intacto; cap 1400; una sola fila).
- Lógica del observer/`focusPublicSection`/`ensurePublicSectionMounted` (de C) — **solo** offset (→medido), rootMargin (→derivado + reconstrucción), `--chrome-h`, `public-mode`.
- `live.js`, `palmares.js`, renderers compartidos.

## Archivos a tocar / NO tocar
**Tocar (todos públicos):** `redesign.css` (`#main.public-scroll{margin-top:var(--chrome-h)!important;max-width:none}` + `.with-ticker` público + `.proto-divider` sticky + `82`/`48`→vars + `@media` 2 filas gateado por `#topbar.public-mode`), `variables.css` (`--chrome-h`/`--topbar-h` con fallback), `redesign-shell.js` (medición + ResizeObserver + reconstrucción focusObserver + offset medido + `public-mode`), `index.html` (`.section-lbl`→`.proto-divider` en Palmarés/Calendario/Equipos/Sorteo + divider en Palmarés).
**NO tocar:** **`layout.css`** (margin-top global), **`nav.js`** (marginTop inline), lógica del observer/focus (salvo offset/rootMargin), `live.js`, `palmares.js`, renderers, `.section-lbl` admin, `#main.with-sidebar`, `cloudinary.js`/`firebase-config.js`. *(Nota: `page-panel`/`page-historial` sí se tocaron en el adelanto de encabezados 02/06 — ver sección "Encabezados 02/06".)*

## Riesgos + mitigaciones
| Riesgo | Mitigación |
|---|---|
| Tocar el clearance global rompe admin | **No se toca:** clearance público solo por `#main.public-scroll` con `!important`; admin conserva `60px` |
| Inline `marginTop='60px'` de nav.js pisa el chrome dinámico | El gate público usa `!important` (mayor que inline) → gana en público; admin lo conserva |
| Doble-sticky en Competiciones/Historial | 02 usa solo `.comp-sticky`; 06 usa solo el placeholder `.proto-divider` (A lo reemplaza, no añade un segundo título) |
| Hardcode olvidado → sticky/clearance roto | Tabla-inventario; `--chrome-h`/`--topbar-h` con fallback; QA scroll con y sin ticker |
| rootMargin inmutable no se actualiza en móvil | Reconstruir focusObserver vía `refreshPublicScrollSections` al cambiar `--chrome-h` |
| 2ª fila aparece en admin | Gate `#topbar.public-mode` desde `syncRedesignShellMode` |
| Full-width estira grids en pantallas anchas | Capar por sección (A) si molesta; QA ≥2000px |

## Pasos de ejecución
CP0 (≤10%) → `--chrome-h`/`--topbar-h` (fallback) en variables.css + helper de medición (ResizeObserver topbar/ticker) → regla pública `#main.public-scroll{margin-top:var(--chrome-h)!important;max-width:none}` + `.public-scroll.with-ticker{padding-top:20px}` (admin intacto) → reemplazar hardcodes públicos (`scroll-margin-top`/`min-height`/`.comp-sticky`/`#ticker`) por vars → focusObserver rootMargin derivado + reconstrucción → `public-mode` en `syncRedesignShellMode` + `@media` 2 filas gateado en redesign.css → `.proto-divider` sticky + reemplazar `.section-lbl` en las 4 públicas + Palmarés → QA → `graphify update .`.

## Gates de uso
CP0 `five_hour ≤ 10%` · freeze 65% · cierre 75%. Máx 3 subagentes solo-lectura/QA · 1 escritor.

## QA esperada
- Público full-width (gutter conservado); **admin: `margin-top:60px` + cap 1400 + sidebar + una sola fila — diff-cero verificado**.
- 4 secciones (Palmarés/Calendario/Equipos/Sorteo) con divider numerado sticky = nombre del botón; **02 Competiciones** con `.comp-sticky` propio; **06 Historial** con placeholder `.proto-divider` (A lo reemplaza).
- **Móvil:** nav en **fila propia full-width** (solo público); admin en una fila.
- Scroll/scrollspy/smooth-scroll correctos desktop **y** móvil; offset/clearance correctos **con y sin ticker**; focusObserver reconstruido al cambiar breakpoint.
- `node --check` (redesign-shell.js) · consola limpia · admin→público ok · sin emojis · SVG Lucide.

## Criterios de OK de Codex (P4)
- **`layout.css` y `nav.js` diff-cero**; clearance público solo por `#main.public-scroll` (con `!important`); admin `margin-top:60px` intacto.
- Divider sticky en 4 secciones; **02** con `.comp-sticky` (adelantado); **06** con placeholder `.proto-divider` (A lo reemplaza); **sin doble-sticky**.
- `.proto-divider`/`.load-more` **reutilizados**.
- Hardcodes públicos → `var(--chrome-h)`/`var(--topbar-h)` con fallback; offset medido; focusObserver reconstruido; bug del ticker corregido.
- 2ª fila móvil en `redesign.css` gateada por `#topbar.public-mode` (admin una fila).
- Modificación de C **declarada y justificada**; diff quirúrgico.
