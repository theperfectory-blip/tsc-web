# FV9 · Flechas de la cancha con el tamaño y el estilo del juego — 2026-11-27

Estado: **LISTO** en `formacion-vivo`. Sin commits, sin deploy y sin tocar el
puente (`:8765` sigue con el código de FV8).

PES5 estaba **cerrado** al empezar (`GET /estado` → `juego: false`), así que el
juego se usó como referencia con las capturas de FV7
([`FV7/comparacion_ataque.png`](FV7/comparacion_ataque.png) y
[`FV7/juego_final_minimapa_4x.png`](FV7/juego_final_minimapa_4x.png)) y la web
se cargó con un **estado de prueba** en
[`FV9/fv9-flechas.html`](FV9/fv9-flechas.html) (el recurso que autoriza la nota
de la tarea), con un jugador pegado a la banda y el arquero con su flecha
defensiva hacia atrás.

## 1. Proporciones elegidas (relativas al punto del jugador)

La referencia es el minimapa: el punto mide **3,4 % del ancho del campo**
(`.ep-pitch-dot`) y de ahí sale todo. `ajustarFlechas` mide el campo en cada
`pintar()` (incluido el `resize`/girar la pantalla) y durante el arrastre, y
deja el diámetro real del punto en `--fv-diam`; el CSS multiplica por ese valor.
No hay ni un tamaño fijo en píxeles para la flecha.

| Pieza | Medida | En el juego (medido en `comparacion_ataque.png`) |
|---|---|---|
| Flecha de ataque (largo desde el borde del punto) | **1,45 diámetros** | ~1,4–1,7 |
| Punta: alto × largo | **1,15 × 0,55 diámetros** | ~1,5 × 0,6 |
| Asta | **0,41 diámetros de grosor** | ~0,45 |
| Borde oscuro | 0,18 diámetros (mitad fuera) | trazo oscuro de ~0,1 |
| Inicio | **pegada al borde del punto** (no al centro) | igual |
| Defensa Alto / Normal / Bajo | **1,9 / 1,45 / 1,05 diámetros** | tres largos |
| Línea de marcaje | **0,34 diámetros** (antes 3 px fijos) | fina y proporcional |

La flecha es un `path` relleno del color de la actitud (blanco, celeste o azul)
con `stroke` oscuro en el mismo trazo; el `viewBox` mide 100 de alto = 1,15
diámetros, así el asta y la punta no se deforman al cambiar el largo (ataque,
Alto, Normal y Bajo comparten punta y asta). Se ve nítida en tema claro y
oscuro: el borde oscuro separa el blanco del césped.

Tamaños medidos en la web (ver [`FV9/medidas.json`](FV9/medidas.json)):

| Ventana | Cancha | Punto | Flecha de ataque | Defensa Alto |
|---|---|---|---|---|
| 1440 px, horizontal | 618 × 281 | 20,8 px | 30,2 px | 39,5 px |
| 1024 px, horizontal | 837 × 380 | 28,3 px | 41,0 px | 53,7 px |
| 1440 / 1024 px, vertical | 240 × 360 | 8,0 px | 11,5 px | 15,1 px |
| 375 px, vertical | 227 × 341 | 7,5 px | 10,9 px | 14,3 px |
| 375 px, horizontal (forzado) | 279 × 127 | 9,3 px | 13,4 px | 17,6 px |

## 2. Se revirtió «flecha dentro del círculo» (FV7)

- Se quitó la clase `.fv-ov.dentro` y su regla CSS (la flecha achicada y
  centrada en el punto), la variable `--fv-in`, `--fv-len` y la medición del
  «rectángulo útil» de `ajustarFlechas` que activaba la clase.
- Se quitó `overflow:hidden` de `.fv-capa` y se puso `overflow:visible`. El
  contenedor de la cancha (`.ep-pitch-field`, en `mejoras-editor.css`) ya era
  `visible`: no se tocó.
- En línea (`fv-inline`, la pestaña del Tool) el `.fv-modal` tenía
  `overflow:hidden` y recortaba: ahora es `visible`. Con eso **todo lo que se
  dibuja sobre los jugadores** (flechas de ataque y actitud, línea de marcaje,
  siglas ZN/HA, indicadores de condición) se sigue dibujando por fuera de la
  cancha si se sale. Las siglas de la banda de arriba, por ejemplo, quedan
  encima del borde (ver `web_marcaje_1440.png`).
- Sin scroll horizontal en móvil: `.fv-cancha` deja margen interno
  (`padding:5% 6% 2%`; en vertical `6px 6% 0`). Es un % del ancho, porque lo que
  ocupa la flecha también es un % del ancho. Medido a 375, 860, 1024, 1101,
  1280 y 1440: `scrollWidth == innerWidth` en todos.
- Arreglo extra en el mismo archivo: con `≤859.98 px` el panel en línea tomaba
  `height:100vh` y el pie (`Enviar al juego`) **tapaba la cancha**; ahora en
  línea el alto lo pone el contenido. El modo overlay (modal) sigue igual.

## 3. Capturas ([`docs/reportes/FV9/`](FV9/))

- Juego vs web, Ataque: `comparacion_ataque_1440.png`, `comparacion_ataque_1024.png`,
  `comparacion_ataque_375.png` y `comparacion_ataque_v_1440.png`, más
  `comparacion_ataque_375_horizontal.png`.
- Juego vs web, Defensa: `comparacion_defensa_1440.png`, `comparacion_defensa_1024.png`,
  `comparacion_defensa_375.png` y `comparacion_defensa_v_1440.png`, más
  `comparacion_defensa_375_horizontal.png`.
- Web sola (recorte de la tarjeta): `web_ataque_{1440,1024,375}.png`,
  `web_defensa_{1440,1024,375}.png`, las verticales `web_*_v_{1440,1024}.png`,
  las horizontales a 375 `web_{ataque,defensa}_375_horizontal.png`, el tema
  claro `web_{ataque,defensa}_1440_claro.png` y el marcaje
  `web_marcaje_{1440,375}.png`.
- En todas se ve un jugador pegado a la banda con la flecha saliendo de la
  cancha y el arquero con la flecha defensiva hacia atrás.
- La app dibuja la cancha vertical con `≤859.98 px` (`esVertical`), así que a
  375 px la vista normal es vertical: la horizontal a 375 se forzó con `?h=1`
  para cubrir las dos orientaciones en los tres anchos. Igual al revés: la
  vertical a 1440/1024 se forzó con `?v=1`.

Para reproducir las capturas: servir la raíz del repo (por ejemplo
`python -m http.server 4010`), abrir
`http://127.0.0.1:4010/docs/reportes/FV9/fv9-flechas.html?capa=ataque` (o
`capa=defensa` / `capa=marcaje`, `tema=light`, `v=1` / `h=1` para forzar la
orientación). El propio harness mide y deja el resultado en
`window.__FV9__`; el bloque `#log` al pie de la página lista cada comprobación.

## 4. Comprobaciones

- `node --check tsc-src/js/formacion-vivo.js`: **OK**.
- `node scripts/audit-wiring.mjs`: `rotos 0 (no definidas 0 · sin window 0 ·
  fuera de gramática 0 …)`; `docs/reportes/MS-2.3-cableado.md` **restaurado** a
  `HEAD` después del audit.
- `node scripts/build-web.mjs` + `node scripts/smoke-parity.mjs`: **PARIDAD:
  OK** (41 scripts, 1047 globales, 0 errores de carga).
- `node scripts/csp.mjs --check`: **OK** (2 headers, sin cambios de CSP; no se
  agregaron handlers ni `<script>` inline).
- Harness `FV9/fv9-flechas.html` (Chrome headless), **16 capturas/mediciones**
  (1440/1024/375 × ataque/defensa × horizontal/vertical, más el 375 horizontal,
  el tema claro y las dos de marcaje): **0 fallas**. Comprueba que el largo de
  cada flecha es `--fv-d × diámetro del punto`, que no queda ninguna `.dentro`,
  que `.fv-capa`, el campo y el modal no recortan, que hay flechas fuera de la
  cancha y que no aparece scroll horizontal. La línea de marcaje mide
  0,34 diámetros (7,08 px con punto de 20,8 px; 2,71 px con punto de 8 px).

## Archivos tocados

- `tsc-src/js/formacion-vivo.js` (solo `flechaHTML`, `ajustarFlechas`,
  `moverOverlay`, `capaHTML` y la tabla `ACT_LARGO`, que ahora va en diámetros).
- `tsc-src/css/formacion-vivo.css`.
- `docs/reportes/FV9.md` y `docs/reportes/FV9/` (harness, capturas y
  `medidas.json`).

No se tocó `tools/pes5/pes5_vivo.py`, ni el puente, ni ningún otro archivo de
`tsc-src/`.

## Salida

`LISTO FV9: la flecha mide 1,45 diámetros del punto desde el borde (defensa 1,9 / 1,45 / 1,05), con punta de 1,15 × 0,55, asta de 0,41 y borde oscuro en el mismo trazo; el tamaño sale del diámetro real del punto medido en cada pintar, así escala en 1440, 1024 y 375, horizontal y vertical. Se quitó de FV7 la clase .dentro con --fv-in y la medición que la activaba: la flecha, la línea de marcaje (0,34 diámetros), las siglas y las condiciones se dibujan por fuera de la cancha, sin recortes (.fv-capa y el modal en línea pasan a overflow visible) y sin scroll horizontal (margen interno de .fv-cancha en %). Comprobaciones: node --check OK, audit rotos 0 (MS-2.3 restaurado), PARIDAD OK, csp --check OK, harness 16 capturas 0 fallas.`
