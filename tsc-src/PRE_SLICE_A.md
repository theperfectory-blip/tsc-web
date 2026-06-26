# Pre-slice — Macro Slice A · Paridad pública restante
> Orden maestro: **C → A → B → D**. A arranca con **C estable y en QA pasado**.
> A = contenido/UX de secciones [PARCIAL]. **A NO toca el shell de scroll ni el Palmarés.**

## Objetivo
Cerrar el delta visual y de UX de las secciones públicas que quedaron en estado [PARCIAL]
tras la migración inicial: Competiciones (bracket/playoff), Perfil, Calendario y Historial.
Todo sobre módulos reales, sin mock, sin `initRedesignPublic`, sin tocar admin.

---

## Alcance (entra)

### Paso 0 — Gate de C: verificar cleanup de `redesign-public.js`
El paso 0 de Slice C retira `<script src="js/redesign-public.js">` de `index.html:398` y elimina
cualquier llamada a `initRedesignPublic` en módulos vivos.
**A exige C terminado.** Verificar como primera acción que este paso ya está hecho.
Si `redesign-public.js` sigue cargado o `initRedesignPublic` sigue siendo llamado →
**BLOQUEO: devolver a C antes de avanzar en A.** A no asume el cleanup de C.

### Paso 1 — Competiciones: renderers públicos bracket + playoff
El panel actual (`public.js:187-188`) llama directamente a los renderers compartidos:
```js
// HOY — NO debe mutar estos:
await renderBracket(selPhase.id, phaseContentId, false);  // bracket.js
await renderPlayoff(selPhase.id, phaseContentId, false);  // playoff.js
```
Objetivo: crear renderers públicos propios con markup `gbr-*` / `.tie-card` del prototipo,
reusando **solo la preparación de datos** de los módulos compartidos.

**1a — `_pubRenderBracketBroadcast(phaseId, containerId)`** (en `public.js`)
- Reusar data prep de `bracket.js` (accesibles como globales vía `function` declaration):
  `buildBracketRounds(totalTeams)` · `buildBracketSlots(phase, rounds, matchMap)` ·
  `getWinner(m)` · `getClassifiedFromPhase(sourcePhaseId)`
- Producir markup propio `gbr-*` (móvil con conectores SVG + desktop árbol con trofeo).
- **No llamar `renderBracketHTML`** (produce markup admin).
- **No llamar `renderBracket`** (muta el DOM con lógica admin incluida).
- Escapar todos los datos externos con `_tkEsc`.
- Portar el CSS `gbr-*` del prototipo a `redesign.css` (hoy NO existe ahí).
- Estado vacío real: sin fase → mensaje neutro. Sin `_injectFakeBrackets`.
- QA: verificar que `renderBracket` en admin sigue intacto (sin cambios).

**1b — `_pubRenderPlayoffBroadcast(phaseId, containerId)`**
- `renderPlayoff()` (~600 líneas en `playoff.js`) mezcla data prep + HTML.
  **Replicar** la preparación read-only equivalente: `slotRefs` → `resolveSlotRef` +
  `refLabel`, resolución de `teamA`/`teamB` desde `matchMap`, `legs`, penales,
  gol de visita, estado live, labels de clasificación.
  **No** extraer código de `playoff.js` (dejaría render compartido incompleto); replicar
  la preparación usando las mismas llamadas a `dbGet`/`dbGetAll`.
- Producir markup `.tie-card` del prototipo.
- Escapar con `_tkEsc`.
- Portar CSS `.tie-card` del prototipo a `redesign.css`.
- Tipo `single` (1 cruce, supercopa): variante simplificada en el mismo renderer.
- **Tamaño:** si `_pubRenderBracketBroadcast` + `_pubRenderPlayoffBroadcast` juntos
  inflan `public.js` de forma notable, mover ambos a un **nuevo módulo `public-bracket.js`**
  cargado en `index.html` **después** de `playoff.js` y **antes** de `public.js`. Mantiene el borde
  limpio: `public.js` solo cableará las llamadas; los renderers viven en su módulo.
- QA: verificar que `renderPlayoff` en admin sigue intacto.

**1c — Cablear en `renderPubPanel`**
Reemplazar las llamadas directas (`renderBracket` / `renderPlayoff`) por los nuevos
renderers públicos. Estado vacío limpio (sin mocks).

### Paso 2 — Perfil: re-skin + reestructura a drawer
**Qué cambia** (verificado en vivo 2026-06-25):
- Forma: modal centrado actual → **drawer anclado arriba-derecha** (desktop) /
  modal/drawer full-height (mobile).
- Header: genérico actual → **gradiente color del club + nombre del club en grande + badge de rol**.
- Organización: plana actual → **secciones tipo fila drill-in** (`.pp-sec`):
  "Editar nombre y escudo del club" · "Mi cuenta" · "Panel de administración" (si admin).
- Forma reciente: ausente → **pips V/E/D** (datos de `_profileTeam` stats).
- Entrada a Admin: solo en topbar → **también dentro del drawer** (gate `AUTH.role==='admin'`).

**Qué NO cambia (preservar):**
- IDs del formulario: `profile-name` · `profile-username` · `profile-avatar-file` ·
  `profile-logo-file` · `profile-team-name` · `profile-body`.
- Overlay y modal: `#profile-modal` (`.modal-overlay`) / `_injectProfileModal()`.
- Handlers: `saveProfile()` · `closeModal('profile-modal')` · `authSignOut()` ·
  `openProfileModal()` · `renderProfileBody()`.
- Helper: `_pfEsc` intacto; escapar cualquier dato nuevo.
- Sección pwd/email (ya existe en `renderProfileBody`).
- Footer "Cerrar sesión / Guardar cambios".

**Approach:**
- Rework el HTML generado en `renderProfileBody()` (`profile.js`) para producir la
  estructura drawer con las nuevas secciones, manteniendo los mismos IDs de inputs.
- Nuevo CSS en `redesign.css`: `.pp-drawer`, `.pp-sec`, `.pp-hdr`, `.pp-hdr--club`,
  `.pp-pip` (forma reciente). Desktop: posición top-right; mobile: full-height.
- Todo icono nuevo: **SVG stroke/currentColor estilo Lucide** (`stroke-width:1.8`,
  `stroke-linecap:round`, `stroke-linejoin:round`). **Sin emojis, sin glyphs texto como iconos.**
- No portar el sistema `profile-menu` del prototipo como componente independiente;
  re-skin vive en `profile.js` + `redesign.css`.

### Paso 3 — Calendario: hero colapsable
`_calHeroHtml` (`calendar.js:552`) y `renderPubCalendar` (`calendar.js:600`) ya existen.
El hero se muestra cuando hay partido próximo/en vivo. Falta: peek/expand + estado off-season.

**3a — Colapsable (peek/expand):**
- Peek (por defecto): countdown protagonista + escudos. Expand: detalle partido + CTAs reales.
- Toggle con botón SVG (chevron). Estado por CSS (`cal-hero--expanded`), no JS de layout.
- Typewriter en el eyebrow (`cal-hero-lbl`) gateado por `!MOTION.reduced()`.
- CTAs (`[Ver partido]`, `[Ver calendario]`): anclas a sección o handler real. **Sin mock.**
- Preservar `_calCountdownStop` + rama en vivo (ya limpia en cada re-render:
  `calendar.js:635`). No tocar esa lógica.
- No `.metro`. No `.hm-*`. Integrarse al sistema `cal-hero-*` / `cal-pub-*` / `cal-tl-*`.

**3b — Estado off-season (0 partidos próximos):**
- Hoy: la sección queda muy vacía (solo lista de días "Sin partidos" + timeline).
- Portar un **fallback de off-season**: banner compacto "Temporada finalizada · Próximamente"
  + acceso a Historial (no mock, enlace real a la sección/historial). Sin countdown, sin hero.
- Gate: `!heroMatch && !liveMatch` → render fallback en lugar del hero.

### Paso 4 — Historial: enriquecer público
`renderPubHistory` + `_pubHistoryHitos` + `_buildH2HPanel` viven en `history.js`.
La bifurcación `_histState.mode` ya existe (`'public'` vs `'admin'`).

**4a — Hitos ampliados (`_pubHistoryHitos`):**
- Añadir hito **"Partido con más goles"** (máximo de `goalsA+goalsB` en records).
- Convertir **"Mayor goleada"** y **"Partido con más goles"** en `.hito-click` →
  llaman `histH2HShow` con los equipos del partido (si `_histState.mode==='public'`).
- Hito **"Temporadas"**: el prototipo lo reemplazó por "Partido con más goles".
  **Eliminar la tarjeta "Temporadas"** del layout de hitos públicos (4 hitos → 4 hitos,
  pero la posición de "Temporadas" pasa a "Partido con más goles"). Admin intacto.

**4b — Lista `.histm` (renderer público nuevo):**
- **No mutar** la tabla admin (`_computeHistoricalStandings` + `.tbl` + dropdowns).
- Crear función `_pubHistmList(records, teams)` dentro de `history.js` que produzca
  el markup `.histm` del prototipo (lista de partidos, equipo + resultado + comp/fase/jornada).
- Usar dentro de `renderPubHistory` (gate `_histState.mode==='public'`).
- Escapar con el helper local (mismo módulo: `_histNorm`/`_esc` o equivalente).

**4c — H2H con autocomplete:**
- Los buscadores "Equipo A" / "Equipo B" actuales usan inputs + evento `input`.
- Añadir **sugerencias dropdown** basadas en `_histTeams` (ya poblado por
  `_getResolvedRecords` → `_histTeams = allTeams` en `history.js:346`).
- Reusar `_histResolveTeam(query, _histTeams)` y `_buildH2HPanel(teamA, teamB, records)`.
- **No romper** los filtros de modo admin ni el estado `_histState.qA` / `_histState.qB`.
- La tarjeta H2H con autocomplete vive dentro de `renderPubHistory`, no en otro módulo.
- Opcional: tabla histórica responsive `.ht-rend` (bajo gate `_histState.mode==='public'`).

---

## Fronteras de slice (crítico)

### Consume de Slice C
- IDs de container **estables** producidos por C: `page-panel`, `page-equipos`,
  `page-calendario`, `page-historial` (A renderiza DENTRO de estos; C los monta/gestiona).
- **A NO toca**: scrollspy, IntersectionObserver, `ensurePublicSectionMounted`,
  `focusPublicSection`, evento `tsc:public-section-visible`, ni el CSS de `#main.public-scroll`.
- Si C no se ejecutó aún → A no puede correr (los IDs de container son de C).

### No toca Slice B
- `page-palmares` y su contenido: intocables. A no entra al Palmarés.
- `palmares.js`, `tr-room`, `initTrophyRoom`: intocables.

### No toca Slice D
- Ningún store de media (`palmares-media`). No `DB_VER`. No Cloudinary. No Firestore media.

---

## Archivos a tocar / a NO tocar

**Tocar:**
- `public.js` — cablear renderers públicos en `renderPubPanel`.
- `public-bracket.js` *(nuevo, condicional)* — `_pubRenderBracketBroadcast` + `_pubRenderPlayoffBroadcast`
  si su tamaño justifica módulo propio. Cargado entre `playoff.js` y `public.js` en `index.html`.
  Si el tamaño es manejable, pueden vivir directamente en `public.js`.
- `redesign.css` — CSS de `gbr-*`, `.tie-card`, `.pp-drawer`/`.pp-sec`/`.pp-hdr`/`.pp-pip`,
  `cal-hero--expanded`, `.histm`, `.hito-click`, estado off-season.
- `profile.js` — `renderProfileBody` (re-skin + reestructura drawer; preservar IDs/handlers).
- `calendar.js` — `_calHeroHtml` (peek/expand), `renderPubCalendar` (fallback off-season).
- `history.js` — `_pubHistoryHitos` (hitos ampliados), `_pubHistmList` (lista nueva),
  H2H autocomplete.
- `index.html` — `<script>` de `public-bracket.js` si aplica. **No** retirar `redesign-public.js`
  (eso es gate de C; si sigue ahí → BLOQUEO, no tocar aquí).

**NO tocar:**
- `bracket.js`, `playoff.js` — renderers compartidos intocables (solo reusar data prep).
- `nav.js`, `redesign-shell.js` — scrollspy y nav de C (intocables).
- `live.js` — sin tocar (alcance de C).
- `palmares.js`, `tr-room`, `initTrophyRoom` — de B.
- `cloudinary.js`, `firebase-config.js` — nunca.
- `standings.js`, `matches.js` — renderers compartidos admin/público: sin tocar.
- Todo el admin.

---

## Riesgos + mitigaciones

| Riesgo | Mitigación |
|---|---|
| Mutar `renderBracket`/`renderPlayoff` shared renderers | Crear renderers públicos **nuevos** en `public.js`; QA admin post-A |
| `renderPlayoff` larga: replicar data prep incorrectamente | Leer `playoff.js` completo antes de replicar; QA fixture real con slotRefs + legs + penales |
| Perfil: nuevo CSS rompe el modal en mobile o overflow | Probar desktop + mobile; el `.pp-drawer` desktop no puede solaparse con el topbar |
| `_histTeams` no es global (`let` en `history.js`) | Toda lógica de autocomplete vive **dentro** de `history.js`; no acceder desde otro módulo |
| Hero colapsable: `_calCountdownStop` leak si toggle destruye/recrea el countdown | Llamar `_calCountdownStop()` antes de cada rebuild de los conteos; no crear múltiples instancias |
| Estado off-season: condición `!heroMatch` también se cumple al cargar (antes de resolver) | Gate explícito: solo render fallback tras resolver `upcoming` con resultado vacío; no antes |
| CSS `gbr-*`/`.tie-card` del prototipo usa clases que chocan con admin | Scoping bajo `#pub-phase-content` o `#main.public-scroll`; revisar colisiones |
| Escape insuficiente en renderers públicos nuevos | Usar `_tkEsc` en **todo** dato de usuario/DB antes de `innerHTML` |

---

## Pasos de ejecución

1. CP0 (usage ≤10%).
2. Verificar/retirar `redesign-public.js` de `index.html` (si C no lo hizo).
3. Leer `bracket.js` (data prep) y `playoff.js` (~600 líneas, data prep completa).
4. Crear `_pubRenderBracketBroadcast` en `public.js` + CSS `gbr-*` en `redesign.css`.
5. Crear `_pubRenderPlayoffBroadcast` en `public.js` + CSS `.tie-card` en `redesign.css`.
6. Cablear en `renderPubPanel`; QA grupos + bracket + playoff + single en public y admin.
7. Re-skin + reestructura `renderProfileBody` en `profile.js` + CSS drawer en `redesign.css`.
8. QA perfil: desktop (drawer top-right) + mobile (full-height) + admin gate + guardar/cerrar.
9. Hero colapsable + off-season en `calendar.js` + CSS `cal-hero--expanded` en `redesign.css`.
10. QA calendario: con partido próximo (countdown), en vivo (score), off-season (fallback).
11. Hitos ampliados + lista `.histm` + H2H autocomplete en `history.js`.
12. QA historial: hitos clicables, lista pública, autocomplete H2H, admin intacto.
13. `node --check` en todos los JS tocados. Consola limpia. `graphify update .` en `tsc-src/`.
14. QA final: admin logueado → vuelve a público; sin mocks; sin `body.redesign`; sin emojis.

---

## Gates de uso
CP0 `five_hour ≤ 10%` · freeze de features a 65% · cierre estable a 75%.
Máx 3 subagentes solo-lectura/QA · 1 escritor.

---

## Criterios de aceptación (Codex §7 + requisitos de A)

- [ ] `redesign-public.js` NO cargado en `index.html`; `initRedesignPublic` no llamado en ningún módulo.
- [ ] Panel público muestra bracket/playoff/single con markup `gbr-*`/`.tie-card`; datos reales.
- [ ] `renderBracket` y `renderPlayoff` en admin **sin ningún cambio** (diff cero en sus funciones).
- [ ] Sin `_injectFakeBrackets`; estado vacío limpio.
- [ ] Perfil: drawer top-right desktop / full-height mobile; header club-branded; secciones drill-in;
      pips de forma reciente; entrada admin si `AUTH.role==='admin'`. IDs/handlers sin cambios.
- [ ] Todo icono nuevo/modificado: SVG stroke/currentColor Lucide. Sin emojis.
- [ ] Calendario: peek/expand del hero; fallback off-season sin hero ni countdown; typewriter gateado;
      CTAs reales; sin `.metro`; `_calCountdownStop` limpia correctamente.
- [ ] Historial: hitos "Partido con más goles" + goleada como `.hito-click`; lista `.histm` pública;
      H2H con autocomplete; tabla admin `_computeHistoricalStandings` sin tocar.
- [ ] `_tkEsc` en todo `innerHTML` con datos externos en los renderers nuevos.
- [ ] `firebase-config.js` y `cloudinary.js` **NO en staging**.
- [ ] Sin credenciales hardcodeadas. Sin `TODO: fix security` sueltos.
- [ ] `node --check` sin errores en JS tocados.
- [ ] Consola limpia en navegación pública. Admin logueado vuelve a público sin error.
- [ ] QA responsive (desktop + mobile) en todas las secciones tocadas.
- [ ] `graphify update .` corrido tras los cambios.
