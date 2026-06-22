# DESIGN.md — TSC Web · "Matchday Broadcast"

Sistema visual del rediseño. Registro: **brand** (la presentación es el producto).
Identidad: dark cinematográfico + dorado, lenguaje de retransmisión deportiva.
Referencia de aspiración: motionsites.ai (motion como material, no adorno).

## Color

Dark profundo con dorado como metal protagonista. El **color de cada club** es el
segundo material: se inyecta por tarjeta/fila con `--team-color` / `--team-ink`.

- Ramp dorado: `--gold-hi #E8D48B` · `--gold #C9A84C` · `--gold-lo #8F7530` · `--gold-glow`
- Superficies (fondo→elevado): `--bg-deep` · `--bg` · `--card` · `--card2` · `--card3`
- Texto: `--txt` · `--txt2` · `--txt3`
- Semánticos: `--green` (victoria) · `--red` (derrota/vivo) · `--blue` (próximo) · `--yellow`
- Tema claro existente: mantenido como alias, pendiente de pulido fino (Fase 7).

## Tipografía (3 familias, ya cargadas)

- **Bebas Neue** — display, títulos hero, marcadores, números.
- **Barlow Condensed** — datos, tablas, labels, chips, navegación.
- **Barlow** — cuerpo de texto.

Escala fluida con `clamp()`: `--fs-display` (hero ≤4.5rem) · `--fs-h1/h2/h3` · `--fs-score`.

## Motion (`js/motion.js` → `window.MOTION`)

Sistema sin dependencias. Toda utilidad respeta `prefers-reduced-motion` (degrada a
estado final instantáneo). Red de seguridad CSS global en `variables.css`.

- `reveal(el, opts)` / `revealAll(sel, opts)` — fade+rise al entrar en viewport.
- `stagger(els, opts)` — cascada sobre nodos ya visibles.
- `countUp(el, to, opts)` — número que cuenta hasta un valor.
- `countdown(el, fecha, opts)` — cuenta atrás viva (devuelve `stop()`).
- `ticker(el)` — marquesina horizontal en loop (ticker de resultados).
- `onScroll(cb)` — scroll throttled por rAF.

Easings: `--ease-out` (expo, entradas) · `--ease-out-soft` (hover) · `--ease-in-out`.
Reveals al hacer scroll = **cinematográficos** (cascada + fade por sección).

## Componentes (`css/components.css`, sección "Matchday Broadcast")

- Botones: `.btn-gold` (CTA, degradado + glow), `.btn-ghost` (borde dorado), `.btn-quiet`.
- Chips: `.chip-live` (dot pulsante), `.chip-final`, `.chip-vs`, `.chip-today`, `.chip-soon`.
- Marcador: `.score-row` / `.score-edge` (color de equipo) / `.score-n` (Bebas).
- Identidad de club: `.team-crest`, `.team-band`, `.form-strip` / `.form-pip` (V/E/D).
- `.hero` + `.hero-eyebrow` / `.hero-title` / `.hero-sub` — plantilla de cabecera.
- Chrome: `.pub-nav-indicator` (deslizante, auto-posicionado), `#topbar.condensed`.

## Layout

- Páginas que **informan** scrollean (Competiciones, Calendario, Equipos, Historial):
  scroll continuo, suave, con reveals por sección.
- Páginas que **impresionan** son escenario fijo (Palmarés, Sorteo): sin scroll vertical.
- Z-index semántico en tokens (`--z-base` … `--z-fullscreen`).

## Reglas heredadas (CLAUDE.md)

- Iconos SVG estilo Lucide, nunca emojis.
- `innerHTML` con datos de usuario siempre escapado (`_esc` / `_uaEsc`).
- Sin cambios de datos en el rediseño: solo presentación (cero cambios en db/reglas/esquema).

## Roadmap

Fase 0 (contexto) + Fase 1 (fundación: tokens · motion · componentes · chrome) ✅
Fases 2-5: Equipos+perfil · Competiciones+playoffs · Calendario · Historial.
Fase 6: Palmarés fotorrealista (transición 2D→3D al doble click, audio con reverb
decreciente, collage de momentos del campeón). Fase 7: responsive + auditoría.
