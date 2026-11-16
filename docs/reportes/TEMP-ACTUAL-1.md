# TEMP-ACTUAL-1 · La temporada actual es la activa

Rama: `fix/temporada-actual-activa` (desde `origin/main` 1f24ae6).
No mergeada a `main`. Sin deploy.

## Problema

La app tomaba como «temporada actual» la que estaba seleccionada (`STATE.season`, guardada
en `localStorage.tsc_season`), no la activa. Con `tsc_season = 1` (T3, finalizada), la app
arrancaba en T3. En Temporadas, T3 llevaba el badge «Actual» y T1 (la activa) decía «Activa».
Dos palabras para dos cosas que Jimbo ve como la misma.

## Diagnóstico (verificado)

- `ui-utils.js` (arranque): si `tsc_season` apuntaba a una temporada existente, esa ganaba
  sobre la activa. Sin nada guardado, el default `STATE.season = 1` también se quedaba.
  Confirmado: con `tsc_season = 1` y T1 activa, el arranque daba T3.
- `seasons.js`: el badge «Actual» era `s.number === STATE.season`. Confirmado.

## Cambios

1. **Arranque** (`ui-utils.js`): si hay una temporada activa no archivada, `STATE.season` es
   esa, siempre; ignora `tsc_season`. Solo sin activa se usa lo guardado, como antes (el
   resto de la lógica de fallback no cambia). Como el `<select>` se arma con `STATE.season`
   en `loadSeasons`, marca la activa.
2. **Temporadas** (`seasons.js`): se quitó el badge «Actual». La temporada que se está
   viendo y no es la activa lleva el badge «Viendo». La activa conserva «Activa».
3. **Aviso** (`nav.js` → `renderAvisoTemporadaVista`, `index.html`, `css/redesign.css`):
   en el panel admin, si se ve una temporada que no es la activa, aparece arriba un aviso
   discreto: «Estás viendo T3 (finalizada). La temporada activa es T1.» con botón
   «Ir a T1» (`switchToSeason`, `data-onclick`). Ícono Lucide (info). Solo en modo admin.
   Se actualiza al cambiar de temporada, al arrancar y al cambiar de modo.
4. **Textos visibles** que decían «temporada actual» y se referían a `STATE.season`:
   - `profile.js`: «Temporada actual» → «Temporada en vista» (los puntos de grupo salen de
     la temporada que se ve).
   - `pes5-tool.js`: «Tope extra por equipo · temporada actual» → «· temporada activa»
     (el tope extra usa la temporada de cobro, que es la activa).
   - Comentarios internos no se tocaron, ni `isCurrentSeason` de `history.js`.

## Comportamiento resultante

| Caso | Antes | Después |
|---|---|---|
| Arranque con `tsc_season = 1`, T1 activa | T3 | T1 |
| Badge en Temporadas | T3 «Archivada» + «Actual»; T1 «Activa» | T3 «Archivada»; T1 «Activa» |
| Elegir T3 a mano (admin) | — | aviso + T3 «Viendo» |
| Sin temporada activa, `tsc_season = 1` | T3 | T3 (respeta lo guardado), sin aviso |

Nota de comportamiento: el arranque público también usa la activa, así que un visitante
que no eligió nada ve T1 (antes veía la temporada guardada o la 1). El aviso es solo admin.

## Pruebas (sandbox, emulador; cuenta admin de prueba)

Escenario: T3 archivada y finalizada (archivo de `chore/archivo-t3`, solo en el sandbox),
T1 activa. Se comparó el «antes» (código de `main`) con el «después» (este slice), en
fuente (`tsc-emu`) y en dist (`tsc-emu-dist`). Mismo estado de sandbox en ambos.

| Prueba | Fuente antes → después | Dist antes → después |
|---|---|---|
| Arranque con `tsc_season = 1` (público) | 1 → **2** | 1 → **2** |
| Admin, select y `tsc_season` | 1 → **2** | 1 → **2** (verificado tras el arranque) |
| Badges: T1 | «Activa» → «Activa» | «Activa» → «Activa» |
| Badges: T3 | «Archivada», «Actual» → «Archivada» | «Archivada», «Actual» → «Archivada» |
| Elegir T3 a mano | sin aviso → **aviso** «Estás viendo T3 (finalizada). La temporada activa es T1.» + T3 «Viendo» | — → **aviso** + «Viendo» |
| Botón «Ir a T1» | — | vuelve a T1; aviso vacío |
| Sin temporada activa (T1 → `finished`), `tsc_season = 1` | arranca en T3 | arranca en T3, sin aviso |

Consola sin errores. Al final, la T1 quedó restaurada a `active` en el emulador.

Nota sobre el A/B: en el primer intento el «después» se hizo sin el archivo de la T3 en el
sandbox y los badges no eran comparables (T3 salía «Finalizada», no «Archivada»). Se volvió
a correr con el archivo en ambos lados. Las cifras de arriba son de esa segunda corrida.

## Checks de cierre

- `node --check` a `ui-utils.js`, `nav.js`, `seasons.js`, `profile.js`, `pes5-tool.js`: OK.
- `node scripts/smoke-parity.mjs`: PARIDAD OK.
- `node scripts/audit-wiring.mjs`: rotos 0, fuera de gramática 0, duplicados 0, IDs 1,
  muertas 3 (ya estaban antes del cambio). El handler nuevo `switchToSeason` ya existía.
- `node scripts/csp.mjs --check`: OK.
- `graphify update .` dentro de `tsc-src/` y `graphify-label.py`: hechos.
- Sin `innerHTML` con datos de usuario nuevos (el nombre de la temporada pasa por `escHtml`),
  sin emojis (ícono SVG Lucide), sin `<script>` inline, sin reglas de Firestore tocadas.

## Pendientes y decisiones a confirmar

- El arranque público también cambia a la activa. Si se quiere que el público siga viendo
  lo último que eligió, hay que separar la temporada pública de la de admin (cambio aparte).
- El aviso no aparece en la vista pública (solo admin), como se pidió.
- El archivo de la T3 no está en esta rama (está en `chore/archivo-t3`).
