# Migración prototipo → main · Estado real y Macro Slices

> Reemplaza a `NEXT_SESSION_MACRO_SLICES.md` (quedó desactualizado: daba como
> "pendiente" mucho que ya estaba migrado). Este documento refleja el estado
> **verificado en código** el 2026-06-24 por 7 agentes de análisis + checks en vivo.

---

## 0. Brújula (no cambia)

```
prototype.html (referencia visual, 90%, mock)  →  main real (datos, lógica, conexiones)
```

- El prototipo define: flow, layout, motion, estética, responsive.
- El main define: datos, lógica, permisos, persistencia, brackets, H2H, fixtures, admin, Firebase, Cloudinary, IndexedDB.
- **Si el diseño del prototipo choca con la lógica del main, gana la lógica** y se adapta el diseño.
- No es una app nueva: es transformar el frontend público de main usando el prototipo como referencia, sin romper lo real.

## 1. Setup de trabajo

- Repo local: `C:\Users\Administrator\Downloads\tsc.web`
- App local: `cd tsc-src && npx serve .` → `http://localhost:3000`
- Producción: auto-deploy de `main` → Firebase Hosting (`https://teamsubscup.web.app/`)
- **Rama de trabajo: `redesign/migration`** (nacida de `main`). `main` NO se toca durante los slices; se mergea (squash) sólo tras verificar.
- `prototype.html` es local y gitignored: referencia, no se commitea ni se porta literal.
- Configs reales (gitignored, sólo en disco): `js/firebase-config.js`, `js/cloudinary.js`. Un worktree no las copia.

## 2. Rol de Codex (protocolo)

Codex es el supervisor del plan de migracion y tiene la ultima palabra tecnica antes de ejecutar o cerrar cualquier bloque. Claude (Opus/UltraCode) ejecuta, pero no implementa ningun slice sin aprobacion previa de Codex.

Antes de cada bloque, Claude debe entregar: plan + archivos + riesgos + gates. Codex revisa el plan, puede pedir ajustes, aprueba o rechaza la ejecucion, y al final valida diffs/evidencias antes de dar OK de cierre. No implementar sin pedido explicito del usuario.

## 3. Reglas críticas del repo

- **GRAPH FIRST**: antes de buscar funciones/archivos, leer `tsc-src/graphify-out/GRAPH_REPORT.md`.
- Tras tocar código: `graphify update .` dentro de `tsc-src/` (AST, sin costo).
- Nunca tocar/stagear `js/firebase-config.js` ni `js/cloudinary.js` (sólo los `.example.js`). Sin credenciales inline.
- `innerHTML` con datos externos: escapar siempre (`_esc`/`_tkEsc`/`_pfEsc`/`_bkEsc`/`escapeHtml` según módulo).
- Iconos nuevos: SVG inline estilo Lucide. **Nunca emojis** en UI.
- **No** llamar `initRedesignPublic()` ni depender de `body.redesign` (path mock prohibido, vive en `redesign-public.js`).
- **No** portar `.metro` al calendario (el main usa `cal-pub-*` / `cal-tl-*`).
- Admin logueado debe poder entrar a vista pública. No bloquear público por rol.
- No `git reset` / `checkout` destructivo. Staging quirúrgico (sólo archivos del slice).
- Renderers compartidos admin/público (`renderGroupTable`, `renderBracket`/`renderBracketHTML`, `renderPlayoff`, `renderMatchesList`): **no mutarlos**; crear renderers públicos nuevos que reusen sólo la *preparación de datos*.

---

## 4. ESTADO REAL VERIFICADO (2026-06-24)

Leyenda: **[HECHO]** migrado y funcional · **[PARCIAL]** base migrada, falta pulido · **[FALTA]** trabajo pendiente real.

| Sección | Estado | Entry real | Qué falta |
|---|---|---|---|
| Topbar (branding/temporada/config/auth) | **[HECHO]** | `index.html:23-51`, `ui-utils.js openSettings`, `auth.js renderAuthUI` | Nada |
| Nav de secciones (`.sec-nav-btn`+indicador) | **[HECHO]** | `redesign-shell.js syncRedesignTopnav/ShellMode`, `nav.js goPublicPage` | Nada |
| Ticker (partidos der→izq) | **[HECHO]** (fix esta sesión) | `public.js renderPublicTicker` + `MOTION.ticker` | Nada |
| Equipos | **[HECHO]** | `teams.js renderPubTeams/renderPubTeamsGrid` (stats reales, spotlight, MOTION) | Opcional: load-more + shuffle |
| Sorteo | **[HECHO]** | `sorteo.js renderPubSorteo` (8 frames, readOnly, live Firestore+BroadcastChannel) | Opcional: rig 2.5D (tilt/glow) |
| Calendario | **[PARCIAL]** | `calendar.js renderPubCalendar` (hero live, countdown, `cal-tl`, días especiales) | Hero colapsable + typewriter + CTAs reales |
| Historial | **[PARCIAL]** | `history.js renderPubHistory` (hitos countUp, toggle, H2H, tabla histórica FIFA) | Hitos clicables (2 extra), vista lista `.histm`, tarjeta H2H con autocomplete, tabla responsive |
| Competiciones / Panel | **[PARCIAL]** | `public.js renderPubPanel` (carrusel + grupos `_pubRenderGroupsBroadcast` escapado + live + radar) | Bracket público `gbr-*` y llaves `.tie-card` (renderers públicos nuevos) |
| Palmarés | **[REDISEÑO]** | `palmares.js renderPubPalmares` (carrusel 3D `tr-room` + `renderTrophy3D` model-viewer/Firebase GLB) | El prototipo 90% lo rediseñó entero: vitrina `.mv-*` + sala fullscreen `#sala`. Es Macro Slice B. |

### Bugs corregidos esta sesión (ya en `redesign/migration`, sin commitear)
- Ticker estático → arrancado `MOTION.ticker` + `_stopTickerMarquee` (anti-acumulación de clones/rAF). `public.js`.
- Avatar topbar: selector `.auth-avatar` → `.tp-avatar`. `profile.js:487`.
- XSS: escape de nombres de equipo en `renderMatchesList` (`matches.js`) y `renderBracketHTML`/`teamRow`/`ini` (`bracket.js`, helper `_bkEsc`).
- (Nota: el supuesto bug `<\span>` del reporte original **no existía**; verificado.)

---

## 5. SLICES PENDIENTES (reorganizados por realidad)

### Macro Slice A — Pulido público restante
Objetivo: cerrar el delta de las secciones [PARCIAL] sobre módulos reales, sin tocar admin ni Palmarés.
> El orden de abajo ya incorpora las condiciones obligatorias del dictamen (§7).

0. **Pre-bloque bloqueante — aislar el mock muerto (§7.1).** Verificar que nada vivo llama `initRedesignPublic()` ni funciones de `redesign-public.js`; retirar/aislar `<script src="js/redesign-public.js">` (`index.html:398`). No es opcional ni tardío: va primero.
1. **Competiciones — vista eliminatoria pública** (el delta más grande de A)
   - **Bracket (§7.2):** crear `_pubRenderBracketBroadcast(phaseId, containerId)` en `public.js` reusando la data prep real de `bracket.js` (`buildBracketRounds/buildBracketSlots/getWinner/getClassifiedFromPhase`). Markup `gbr-*` (móvil con conectores SVG + desktop árbol con trofeo). **Portar el CSS `gbr-*` a `redesign.css` junto con el JS** — hoy no existe ahí.
   - **Playoff/single (§7.3):** `renderPlayoff()` mezcla prep + HTML y NO tiene helper de datos reutilizable. **Antes** de `_pubRenderPlayoffBroadcast(...)`, extraer/crear una preparación read-only equivalente preservando legs, penales, gol de visita, live, slot refs y labels. Markup `.tie-card`.
   - Cablear ramas `bracket`/`playoff`/`single` de `renderPubPanel`. Escapar con `_tkEsc`. Estado vacío real (sin `_injectFakeBrackets`).
2. **Perfil — re-skin del modal a `.pp-drawer`**
   - `profile.js` `_injectProfileModal`/`renderProfileBody`: envolver con clases `.pp-*` (header gradiente color de club, donut stats reales, secciones cuenta/club/admin, pie). **No** tocar handlers, IDs, ni lógica de auth/roles. Gate admin por `AUTH.role==='admin'`.
3. **Calendario — hero colapsable**
   - `_calHeroHtml` (rama no-live): peek (countdown protagonista) → expand (detalle + CTAs reales). Typewriter como helper gateado por `MOTION.reduced()`. Preservar hero EN VIVO + limpieza de countdown (`_calCountdownStop`). **No** `.metro`. CTAs a lógica real o fuera (no mock).
4. **Historial — enriquecer público**
   - `_pubHistoryHitos`: +"Partido con más goles", convertir goleada/más-goles en `.hito-click` → `histH2HShow`. Lista `.histm` como **renderer público nuevo** (no mutar la tabla admin) — §7.6. Tarjeta H2H con autocomplete **reutilizando `_histTeams`/`_histResolveTeam`/`_buildH2HPanel`** (cuidar foco del input, no romper filtros). Opcional: tabla histórica responsive `.ht-rend`. Bifurcar por `mode`; **conservar** `_computeHistoricalStandings` (regla finished-season/FIFA).

### Macro Slice B — Palmarés: vitrina + sala fullscreen
Sólo tras A estable o congelado. Es un rediseño grande, no un ajuste.
- **Decisión de producto requerida (motor 3D):**
  - (a) *recomendado*: conservar `<model-viewer>` + Firebase GLB del main y adoptar sólo el escenario del prototipo (foto+focos+humo) alrededor.
  - (b) adoptar el motor Three.js+Draco (unpkg) del prototipo (más riesgo: CDN externa, anclaje geométrico, otra fuente de GLB).
- Vitrina inline `.mv-*` (nav con blur, hero line-art→full con tilt, data panel) con datos reales (`PALMARES_COMPS` + records + campeón vigente). Decidir destino de `tr-room`/`initTrophyRoom` si la vista inline cambia.
- Sala `#sala` (CSS `.sala-*` ya existe huérfano en `redesign.css`): markup + `openSala/closeSala/salaLayout`, humo, collage de campeones con datos reales (no placeholders). Audio mapeado a `sounds.js`/`playPalmDing` (no portar IIFE `AUDIO` crudo).
- **Admin media de campeones**: subir/editar/eliminar imágenes por copa/temporada/equipo (Cloudinary existente, sin tocar configs), persistir en IndexedDB, alimentar el carrusel real.
- No degradar `renderTrophy3D`/GLB. Verificar desktop/mobile/fullscreen.

### Tareas transversales (fuera de A/B)
- **Seguridad — barrido de escaping** en renderers compartidos: ramas raw restantes de `renderMatchesList`, `renderBracketHTML`, y `renderGroupTable` (`displayName`/`displayIni`/`z.name`). Tarea dedicada con QA admin+público.
- **Cleanup** → promovido a Slice A paso 0 (§7.1): retirar/aislar `<script src="js/redesign-public.js">` (`index.html:398`), código muerto (mock/`initRedesignPublic`). Ya **no** es opcional.
- Opcionales de UX: rig 2.5D del sorteo; load-more de equipos.

---

## 6. Decisiones de producto pendientes (sólo el usuario)

- Palmarés: motor 3D (a) vs (b); ¿reemplazar `tr-room` por `.mv-*`? ¿portar `#sala`?
- Calendario: layout `.cal-duo` (hero+cronograma lado a lado) vs columna actual; ¿hero colapsable sí/no?
- Historial: ¿lista `.histm` reemplaza la tabla en público? ¿tabla responsive?
- Equipos: ¿load-more además del buscador, o sólo buscador?
- Sorteo: ¿rig 2.5D?
- Prototipo: falta su 10% (hero/landing + fondo sin decidir). ¿Se termina antes de A/B o en paralelo?

---

## 7. Dictamen de supervision Codex (2026-06-24)

**Veredicto:** plan aprobado con condiciones. No queda aprobado para ejecutar "tal cual" sin aplicar las correcciones siguientes.

### Confirmaciones

- La brujula general es correcta: `prototype.html` es referencia visual y el main manda en datos, permisos, persistencia y logica.
- Macro Slice A es el orden correcto antes de Palmares: cerrar primero competiciones/brackets publicos, perfil, calendario e historial.
- La regla de no mutar renderers compartidos admin/publico es obligatoria y esta bien planteada.
- Macro Slice B debe quedar separado: Palmares es rediseno mayor y requiere decision de producto antes de ejecucion.

### Condiciones obligatorias antes de ejecutar Slice A

1. **Cleanup del mock sube de prioridad.** Retirar o aislar `js/redesign-public.js` no puede quedar como opcional tardio. Hoy sigue cargado en `index.html` y expone `initRedesignPublic()`, con codigo mock de `.metro`, `histm`, `mv-*`, audio y sala. Debe resolverse antes o dentro del primer bloque de Slice A, verificando que nada vivo lo llama.
2. **Competiciones/bracket:** aprobado crear `_pubRenderBracketBroadcast(...)` usando data prep real de `bracket.js` (`buildBracketRounds`, `buildBracketSlots`, `getWinner`, `getClassifiedFromPhase`). El CSS `gbr-*` existe en el prototipo pero no en `redesign.css`, asi que el slice debe portar/adaptar CSS y JS juntos. Sin `_injectFakeBrackets`.
3. **Playoff/single:** el plan esta incompleto si asume helpers listos. `renderPlayoff()` mezcla preparacion de datos y HTML. Antes de `_pubRenderPlayoffBroadcast(...)`, Claude debe extraer o crear una preparacion read-only equivalente, preservando legs, penales, away goal, live, slot refs y labels.
4. **Perfil:** aprobado re-skin, pero sobre el modal real (`profile-modal` / `profile-body`), no portando el sistema `profile-menu` del prototipo. Preservar IDs y handlers existentes. Todo icono nuevo o modificado debe ser SVG stroke/currentColor estilo Lucide; no mantener nuevas X/textos o glyphs como iconos.
5. **Calendario:** aprobado hero colapsable solo si se integra al sistema real `cal-hero-*`, `cal-pub-*`, `cal-tl-*`. No copiar `.metro` ni depender de `.hm-*` sin adaptacion explicita. Preservar rama EN VIVO y limpieza `_calCountdownStop`.
6. **Historial:** aprobado enriquecer publico, pero manteniendo admin intacto. La lista `.histm` debe ser un renderer publico nuevo, no una mutacion de la tabla admin. H2H con autocomplete debe reutilizar `_histTeams`, `_histResolveTeam()` y `_buildH2HPanel()` sin romper filtros existentes.
7. **Seguridad:** cualquier `innerHTML` tocado debe escapar datos externos con el helper local. Ademas del slice funcional, queda pendiente un barrido dedicado de `renderGroupTable`, `renderMatchesList` y `renderBracketHTML`.
8. **QA minimo por bloque:** `node --check` de archivos tocados, consola limpia en navegacion publica, admin logueado puede volver a publico, desktop+mobile, sin mocks, sin `body.redesign`, sin `initRedesignPublic()`, sin emojis nuevos, sin configs reales en staging.

### Decision pendiente para Macro Slice B

Codex recomienda opcion (a): conservar `<model-viewer>` + GLB/Firebase del main y adoptar solo el escenario visual del prototipo alrededor. No aprobar Three.js/Draco/CDN del prototipo sin decision explicita del usuario y prueba de rendimiento.

---

## 8. Gates, QA y subagentes

- **Gates de uso**: CP0 arrancar sólo si `/usage five_hour <= 10%`; freeze de features a 65%; cierre estable a 75% (sólo estabilizar/reportar).
- **Subagentes**: máximo 3, sólo lectura/QA. Un solo escritor.
- **QA por slice**: `node --check` en módulos tocados; navegación pública real sin errores de consola; admin logueado vuelve a público; sin mocks; sin `body.redesign`/`initRedesignPublic`; sin emojis nuevos; escape en todo `innerHTML` tocado; capturas/eval desktop+mobile; reportar riesgos residuales. Para renderers compartidos: QA en admin **y** público.
