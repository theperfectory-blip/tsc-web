# Pre-slice — Macro Slice A · Paridad pública restante
> **v2 (2026-06-25) tras auditoría de código.** Corrige la premisa de CSS (casi todo el CSS del prototipo YA existe en `redesign.css`; solo falta `.gbr-*`), el namespace del calendario (colapsable ya existe bajo `.hm-*`), funciones inexistentes (`histH2HShow`), clases mal nombradas (`.pp-pip`→`.form-pip`), y un hueco de datos (forma reciente). Suma a su alcance #2/#3/#4 de navegación (cc-hist, filtros inline, .cal-duo) — el carrusel #1 (Competiciones/Fases) **ya está migrado** en `public.js _pubMakeCarousel`.
> Orden maestro: **C → C-polish → Equipos → A → B → D**. A arranca con **C + C-polish + Equipos estables y en QA pasado** (gate ampliado tras dictamen Codex 2026-06-26: el shell pulido y la vitrina de equipos preceden a A).

## Brújula (2026-06-25)
La lógica gana **solo** en datos/permisos/persistencia; en **layout/estética/motion gana el prototipo** salvo conflicto duro documentado. Donde A invente algo que el prototipo no muestra (off-season, drawer top-right, typewriter), se marca como **decisión de producto nueva**, no como "fidelidad".

## Objetivo
Cerrar el delta visual y de UX de las secciones públicas [PARCIAL]: Competiciones (bracket/playoff), Perfil (drawer), Calendario (hero colapsable + `.cal-duo`), Historial (.histm/H2H/carruseles/filtros). Sobre módulos reales, sin mock, sin `initRedesignPublic`, sin tocar admin.

## Premisa de CSS CORREGIDA (crítico)
Auditoría de `redesign.css` (~910 líneas): **gran parte del CSS del prototipo YA está portado.** Antes de añadir cualquier bloque CSS, **verificar existencia** (evitar duplicar/sobreescribir):
- `.tie-*` (ties-grid, tie-card, tie-hdr, tie-row, tie-agg, winner/loser, pending): **YA existe** `redesign.css:489-509`.
- `.histm`/`.hr-*` (row, sheen, num, duel, team.win, score): **YA existe** `redesign.css:825-844`.
- `.pp-*` (drawer, hdr, sec, stage, crest, club, role, body, stats, donut, bars, line, foot): **YA existe** `redesign.css:882-910`.
- `.hm-collapsible`/`.hm-peek`/`.hm-expand`/`.hm-border` (hero colapsable): **YA existe** `redesign.css:535+`.
- `.hito` (base): **YA existe** `redesign.css:771-774`.
- **FALTA de verdad:** `.gbr-*` (bracket) — 0 en redesign.css, 162 en prototype.html. **`.hito-click`** (variante clicable) — no existe. **`.cal-hero-*`** se estiliza en **`calendar.css`** (no redesign.css), NO es colapsable.

**Conclusión:** el trabajo de A es **JS (renderers) + wiring + reconciliar namespaces**, no "portar CSS". Único CSS a portar de cero: `.gbr-*` + `.hito-click`.

## Minar `redesign-public.js` ANTES de que se borre
C retira el `<script>` de `redesign-public.js` pero **deja el archivo en disco**. Ese archivo **ya contiene renderers portados** (histm, hitos, countdown, carruseles, tabla histórica). **A debe evaluar minar de ahí** (en vez de re-derivar del prototipo) para histm/hitos/etc. El borrado físico del archivo es el **último paso de A**, una vez minado lo útil.

---

## ⚠️ ACTUALIZACIÓN 2026-06-27 — Headers adelantados por pedido explícito
Los encabezados `.comp-sticky > .comp-title` con `pd-n` de **Competiciones (02)** e **Historial (06)** fueron construidos durante C-polish/Equipos por pedido explícito del usuario:
- **02:** `renderPubPanel` en `public.js` ya emite `.comp-sticky > .comp-title > pd-n "02"` + carruseles (ya migrado). El `index.html` no tiene `section-lbl` para `page-panel`.
- **06:** `index.html` ya tiene `.proto-divider` con `pd-n "06" Historial`. Slice A lo REEMPLAZARÁ con `.comp-sticky` + `cc-hist` (Paso 4d), retirando el `proto-divider` estático.
**A NO debe crear ni duplicar estos encabezados — ya existen.**

## Alcance (entra)

### Paso 0 — Gate de C (bloqueante)
Verificar que C retiró `<script src="js/redesign-public.js">` (index.html:398) y que `initRedesignPublic` no se llama en módulos vivos. **Si sigue cargado → BLOQUEO: devolver a C.** A no asume el cleanup de C.

### Paso 1 — Competiciones: renderers públicos bracket + playoff
`public.js:187-192` llama directo a los renderers compartidos (`renderBracket`/`renderPlayoff`, isAdmin=false). NO mutarlos; crear renderers públicos nuevos que reusen solo data prep.

**1a — `_pubRenderBracketBroadcast(phaseId, containerId)`** (en **`public-bracket.js` — módulo nuevo OBLIGATORIO**, no condicional)
- **Complejidad real (NO subestimar):** el bracket del prototipo (`renderBracketLab`, prototype.html:2964-3200+) es de los componentes más grandes: **dos layouts** (árbol desktop `.gbr-card` + **pager móvil animado** `.gbr-mobile-rail`/`-pane`/`-pair` con `renderStatic`+`animateTo` forward/backward), **conectores SVG calculados** (`_connectorSVG`), helpers (`buildBracketRoundCards`, `_scoreMiniHTML`, `_pairHTML`, `updateNav`), two-leg/penales/gol-de-visita, animaciones de entrada escalonadas (`gbrCardIn`), estado TBD/empty. ~300-400 líneas JS solo bracket.
- Reusar data prep de `bracket.js` (globales): `buildBracketRounds` (445), `buildBracketSlots` (607), `getWinner` (8), `getClassifiedFromPhase` (726).
- **No** llamar `renderBracketHTML` (markup admin) ni `renderBracket` (muta DOM + fuegos admin).
- Escapar con `_tkEsc`. Portar el CSS `.gbr-*` (única familia que falta) a `redesign.css`. Sin `_injectFakeBrackets`.

**1b — `_pubRenderPlayoffBroadcast(phaseId, containerId)`** (en `public-bracket.js`)
- `renderPlayoff` es **~330 líneas** (playoff.js:1-330), no 600. Replicar la prep read-only (playoff.js:167-311): `slotRefs`→`resolveSlotRef`+`refLabel`, relleno teamA/teamB desde `matchMap` por `matchIdx`, `legData` con slotId `${phaseId}_m${i}_leg${leg}`, totales, `anyLegLive`, `allPlayed`, **penales del leg decisivo**, **gol de visita** (convención exacta: A visita en vuelta=`legData[1].goalsA`, B visita en ida=`legData[0].goalsB`, `decidedBy` 'global'|'away'|'pen'). Rama `single`/supercopa (playoff.js:57-165) con su variante.
- **No** extraer de `playoff.js` (dejaría el render compartido incompleto); replicar con `dbGet`/`dbGetAll`.
- Markup `.tie-card` (CSS **ya existe**, no portar). **Declarado:** el markup será **"prototipo + live/penales/away"** (más rico que el `_llavesHTML` del prototipo, que es solo Ida/Vta/Global) → no es "tal cual" puro, es prototipo extendido con el modelo real.
- **QA fixture obligatorio:** ida+vuelta + empate global + resuelto por gol de visita + por penales (la convención away-goal se repite en 3 sitios → fácil de replicar mal).

**1c — Cablear en `renderPubPanel`**: reemplazar las llamadas directas por los nuevos renderers públicos. Estado vacío limpio.

**Tamaño:** bracket+playoff ≈ **600-800+ líneas** → `public-bracket.js` cargado en index.html **después de `playoff.js` y antes de `public.js`**.

### Paso 2 — Perfil: re-skin + reestructura a drawer
**Decisión de producto (NO fidelidad literal — el prototipo NO lo demuestra así):** el prototipo es un `.pp-stage` demo con panel lateral y **filas planas con chevron `›`** (no drill-in real, no anclaje top-right respecto al topbar). La UX decidida por el usuario (drawer arriba-derecha desktop / modal full-height mobile) **va más allá del prototipo** → marcada como decisión nueva.

**Qué cambia:** header con gradiente del color del club + nombre grande + badge rol · secciones tipo fila · forma reciente (pips) · entrada admin dentro (gate `AUTH.role==='admin'`).

**Correcciones de la auditoría:**
- CSS `.pp-*` **ya existe** (882-910) → **no portar**, reusar.
- Forma reciente = **`.form-pip`** (`.form-pip.w/.d/.l` dentro de `.form-strip`), **NO `.pp-pip`** (no existe). `.pp-hdr--club` **no existe** (era invención) → usar `.pp-hdr` con `background:linear-gradient(135deg,var(--team-color),var(--team-color-2))`; **cablear `--team-color-2`** (hoy `profile.js` no lo expone en ese contexto).
- **HUECO DE DATOS — forma reciente:** `profile.js _loadTeamStats` solo da agregados W/D/L totales; **no hay secuencia "últimos 5"**. A debe **derivar V/E/D recientes desde `matches`** del club, o **omitir los pips**. No es solo markup.
- `renderProfileBody` (profile.js:47) es un **rework grande**: hay cropper, secciones password/email que **reubicar dentro del drawer**.

**Qué NO cambia (preservar):** IDs `profile-name`/`profile-username`/`profile-avatar-file`/`profile-logo-file`/`profile-team-name`/`profile-body`; `#profile-modal`/`_injectProfileModal`; handlers `saveProfile`/`closeModal`/`authSignOut`/`openProfileModal`/`renderProfileBody`; `_pfEsc`; sección pwd/email; footer. Iconos nuevos = SVG Lucide.

### Paso 3 — Calendario: hero colapsable + `.cal-duo` (#4)
**Reconciliación de namespace (corrige la contradicción del plan v1):** el colapsable **YA existe en `redesign.css` bajo `.hm-*`**; el renderer vivo `_calHeroHtml` (calendar.js:552) emite `.cal-hero-*` (estilado en `calendar.css`, NO colapsable). **Decisión: migrar `_calHeroHtml` a emitir la estructura `.hm-collapsible`/`.hm-peek`/`.hm-expand`/`.hm-border` del prototipo** (reusa el CSS existente y es lo "tal cual"). El CSS `.cal-hero-*` de `calendar.css` queda a retirar/migrar. (Codex permitía `.hm-*` "con adaptación explícita" — esto lo es.)
- **`.cal-duo` (#4):** portar el layout hero + cronograma lado a lado. El cronograma se mantiene en **`cal-tl`** real (NO `.metro` — ver Δ Fidelidad). Esto significa: `.cal-duo` con hero `.hm-*` a la izquierda y `cal-tl` a la derecha (mezcla prototipo+real declarada).
- Peek (countdown protagonista) → expand (chips de estado + face con escudos + `.hm-when` + `.hm-cta` con CTAs **reales**). Incluir el `.hm-border` animado y el chip de estado del expand.
- **Typewriter:** el prototipo **NO tiene typewriter en el hero** (usa `MOTION.countdown('#hm-countdown')`). Si se añade, es **extra nuevo** gateado por `!MOTION.reduced()`, marcado como tal.
- Preservar rama EN VIVO (`heroIsLive`) + limpieza `_calCountdownStop` (calendar.js:550, limpiada en 635). No tocar esa lógica.
- **Off-season (0 próximos):** el prototipo **no muestra** fallback (siempre asume próximo). El banner "Temporada finalizada/Próximamente" es **feature nueva necesaria** (decisión de producto, no fidelidad). Gate `!heroMatch && !liveMatch` tras resolver `upcoming`.

### Paso 4 — Historial: enriquecer público + carruseles (#2/#3)
`renderPubHistory`/`_pubHistoryHitos`/`_buildH2HPanel` en `history.js`; `_histState.mode` ya bifurca.

**4a — Hitos:** hoy 4 (Partidos, Goles, Mayor goleada, **Temporadas**). El prototipo reemplaza "Temporadas" por **"Partido con más goles"** (`#hito-mostgoals`) → **eliminar Temporadas, añadir Partido con más goles** (4 hitos). Convertir "Mayor goleada" y "Partido con más goles" en **`.hito-click`** (CSS a crear) = `<button>` con `id` + `<small>` scope hint (como el prototipo `#hito-blowout-scope`/`#hito-mostgoals-scope`) → reestructurar la tarjeta, no solo añadir un hito.
- **`histH2HShow` NO EXISTE** (0 referencias; el prototipo usa `h2hShow`). **Crearla** (público): setea `_histState.qA/qB` y renderiza el panel vía `_buildH2HPanel`.

**4b — Lista `.histm` (#renderer público nuevo):** CSS **ya existe** (825-844). Crear `_pubHistmList(records, teams)` (o minar de `redesign-public.js`). No mutar la tabla admin (`_computeHistoricalStandings`). Gate `_histState.mode==='public'`.

**4c — H2H autocomplete:** dropdown de sugerencias sobre `_histTeams` (let local, poblado en history.js:346). Reusar `_histResolveTeam` (31) y `_buildH2HPanel` (1092). Detallar manejo de **foco/selección/blur**. No romper filtros admin ni `_histState.qA/qB`.

**4d — Carruseles del Historial (#2 + #3):** **reutilizar `_pubMakeCarousel`** (ya existe en public.js, genérico `cc,items,activeIdx,onChange`):
- **#2 `cc-hist`:** toggle "Partidos ⇄ Tabla histórica".
- **#3 filtros en cascada inline** (`cc-games`/`cc-seasons` dentro del hito Partidos) que recalculan hitos/lista/H2H. (Hoy el real usa dropdowns → se reemplazan por carruseles, decisión visual=prototipo.)

**4e — Tabla histórica responsive `.ht-*` (CONFIRMADA dentro de A — Codex 2026-06-25):** 6 layouts responsivos (`_htLayout`) + toggle expand. **Entra en A** (ya no es opcional). Renderer público nuevo; conservar `_computeHistoricalStandings` (regla finished-season/FIFA) intacto.

---

## Fronteras de slice
- **Consume de C:** IDs estables `page-panel`/`page-equipos`/`page-calendario`/`page-historial` (renderiza dentro; C los monta). **NO toca** scrollspy/observer/`ensurePublicSectionMounted`/`focusPublicSection`/evento/`#main.public-scroll`. Si C no corrió → A bloqueada.
- **Borra `redesign-public.js`** como último paso (tras minarlo).
- **No toca B/D:** `page-palmares`, `palmares.js`, `tr-room`, stores de media, `DB_VER`, Cloudinary, Firestore media.

## Archivos a tocar / NO tocar
**Tocar:** `public.js` (cablear renderers + carruseles historial), **`public-bracket.js`** (nuevo: bracket+playoff públicos), `redesign.css` (`.gbr-*` + `.hito-click` — verificar el resto antes de añadir), `profile.js` (`renderProfileBody` rework), `calendar.js` (`_calHeroHtml`→`.hm-*` + `.cal-duo` + off-season), `history.js` (hitos/`_pubHistmList`/`histH2HShow`/autocomplete/carruseles), `calendar.css` (retirar `.cal-hero-*` si se migra a `.hm-*`), `index.html` (`<script>` de `public-bracket.js`; borrar `redesign-public.js` al final).
**NO tocar:** `bracket.js`/`playoff.js` (solo reusar data prep), `nav.js`/`redesign-shell.js` (shell de C), `live.js`, `palmares.js`, `cloudinary.js`/`firebase-config.js`, `standings.js`/`matches.js`, todo el admin.

## Riesgos + mitigaciones
| Riesgo | Mitigación |
|---|---|
| Duplicar CSS que ya existe (`.tie-*`/`.pp-*`/`.histm`) | Verificar en `redesign.css` antes de añadir; solo crear `.gbr-*`/`.hito-click` |
| Mutar renderers compartidos | Renderers públicos nuevos en `public-bracket.js`; QA admin post-A |
| `renderPlayoff` away-goal mal replicado | QA fixture explícito (ida/vuelta/global/away/penales) |
| Forma reciente sin datos | Derivar últimos-5 de `matches` o omitir pips (no inventar) |
| Namespace calendario (`.hm-*` vs `.cal-hero-*`) | Migrar `_calHeroHtml` a `.hm-*`; retirar `.cal-hero-*` de calendar.css |
| `histH2HShow` inexistente | Crearla; no asumir |
| `public.js` infla | bracket/playoff en `public-bracket.js` |
| Perder renderers de `redesign-public.js` al borrarlo | Minar ANTES; borrado físico = último paso de A |
| Escape insuficiente | `_tkEsc` en todo dato externo |

## Pasos de ejecución
1. CP0 (≤10%). 2. Verificar gate de C. 3. Minar `redesign-public.js` (histm/hitos/countdown). 4. Leer `bracket.js`+`playoff.js`. 5. `public-bracket.js`: bracket público + CSS `.gbr-*`. 6. playoff/single público (CSS tie ya existe). 7. Cablear `renderPubPanel`; QA public+admin. 8. Perfil rework (`.form-pip`, `--team-color-2`, forma reciente real). 9. QA perfil desktop/mobile/admin. 10. Calendario: `_calHeroHtml`→`.hm-*` + `.cal-duo` + off-season. 11. QA calendario (próximo/vivo/off-season). 12. Historial: hitos + `histH2HShow` + `_pubHistmList` + autocomplete + carruseles #2/#3 + `.ht-*`. 13. QA historial. 14. Borrar `redesign-public.js`. 15. `node --check` + consola limpia + `graphify update .`. 16. QA final (admin→público, sin mocks, sin emojis).

## Gates de uso
CP0 `five_hour ≤ 10%` · freeze 65% · cierre 75%. Máx 3 subagentes solo-lectura/QA · 1 escritor.

## Criterios de aceptación
- [ ] `redesign-public.js` minado y borrado; `initRedesignPublic` no llamado.
- [ ] Bracket/playoff/single públicos (`.gbr-*`/`.tie-card`) con datos reales; `renderBracket`/`renderPlayoff` admin **diff cero**; sin `_injectFakeBrackets`.
- [ ] `public-bracket.js` cargado entre `playoff.js` y `public.js`.
- [ ] Perfil: drawer desktop / full-height mobile; header gradiente club (`--team-color-2`); `.form-pip` con forma reciente **real** (o pips omitidos); entrada admin gateada; IDs/handlers sin cambios.
- [ ] Calendario: hero `.hm-*` colapsable (peek/expand/border/chip), `.cal-duo` (hero+`cal-tl`), off-season; `_calCountdownStop` limpia; sin `.metro`.
- [ ] Historial: 4 hitos (Temporadas→Partido con más goles), `.hito-click` + `histH2HShow` creada, `.histm` pública, H2H autocomplete, carruseles #2/#3 (`_pubMakeCarousel`), **tabla histórica responsive `.ht-*`**, tabla admin (`_computeHistoricalStandings`) sin tocar.
- [ ] CSS: solo se añadió `.gbr-*`/`.hito-click`; el resto reusado (sin duplicar).
- [ ] `_tkEsc` en todo `innerHTML` externo. Sin emojis. SVG Lucide.
- [ ] `firebase-config.js`/`cloudinary.js` NO en staging. Sin credenciales. Sin `TODO: fix security`.
- [ ] `node --check` ok. Consola limpia. Admin→público ok. Responsive desktop+mobile. `graphify update .`.
