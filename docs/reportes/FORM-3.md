# FORM-3 · Se quita el resumen viejo de la formación

Jimbo aprobó quitar el resumen de la formación en teléfonos altos: duplicaba la ficha completa de FORM-2.

## Qué se quitó
- **Marcado del modal:** `#ep-pitch-ficha` (las 4 casillas Edad, Altura, Pie y Banda) y `#ep-res` (pestañas Mejores, Peores, Habilid. y Posic., y su lista).
- **JS que solo existía para eso:** `_renderFichaFormacion`, `setFormResumen` (y su `window.`), `_formValoresJugador`, `_formChipsQueEntran` (el render de chips y el «+N»), `FORM_RESUMEN_ALTO`, `FORM_ESCALA_CHICA`, y el estado `FORM.resumen`.
- **CSS:** `.ep-pitch-ficha`, `.ep-res`, `.ep-res-tabs`, `.ep-res-list`, `.ep-res-item`, `.ep-chips`, `.ep-chip`, `.ep-chip.nat`, `.ep-chip-mas`.

Antes de borrar, grep sobre `tsc-src/` confirmó que nada más usaba esos nombres. Quedan fuera del cambio, y no se tocaron: `.ep-casillas` y `.ep-casilla` del editor de Mejoras (la ficha de la otra pantalla, que sigue en `mejoras-page.js` y en `mejoras-editor.css`), y `SIDE_LABEL`, `FOOT_LABEL`, `TIER_COLOR` y `tierClass99`, que el editor también usa.

## Alto de la cancha
`_formAjustarAlto` ahora solo calcula el alto de la cancha:
- Lo que resta es el alto de todo lo que está en el modal, excepto la cancha y la ficha (`#ep-form-stats`). La ficha va debajo, dentro del scroll del modal, y no le quita alto a la cancha.
- Se mantienen `FORM_CAMPO_MIN` (230 px) y `FORM_CAMPO_MAX` (520 px). El piso antes era 160 px fijo; ahora es `FORM_CAMPO_MIN`, así que la cancha no baja de 230 px aunque el modal sea bajo, y el modal se desplaza.

## Verificación en el sandbox
| Pantalla | Ficha | Cancha (alto) | Scroll del modal | Desplazamiento horizontal |
|---|---|---|---|---|
| 375×812 | abierta | 383 px | 1038 / 670 | no (375) |
| 375×812 | cerrada | 383 px | — | no |
| 412×915 | abierta | 486 px | 1163 / 773 | no (412) |
| 412×915 | cerrada | 486 px | 773 / 773 | no |
| Escritorio (1024) | abierta | 274 px (horizontal) | 879 / 505 | no (1024) |
| Escritorio (1024) | cerrada | 274 px (horizontal) | 532 / 505 | no |

- La cancha mide lo mismo con la ficha abierta y cerrada: la ficha ya no le resta alto. La cancha no queda en 160 px.
- La ficha completa (atributos, secundarios, posiciones y habilidades) es la misma de FORM-2, en las tres pantallas.
- «Cerrada» se probó ocultando la ficha desde el navegador: en la interfaz la ficha se muestra siempre que haya un jugador seleccionado (al abrir, el primero de la lista), así que no hay un botón para cerrarla. Si Jimbo quiere un control para cerrarla, es un cambio aparte.

Capturas en [capturas-FORM-3](capturas-FORM-3/):
- `movil-375-ficha-abierta.jpg`, `movil-375-ficha-cerrada.jpg`
- `telefono-412-ficha-abierta.jpg`, `telefono-412-ficha-cerrada.jpg`
- `escritorio-ficha-abierta.jpg`, `escritorio-ficha-cerrada.jpg`

## Pruebas
- `npm test`: 92 pasan y 1 falla. Es el mismo test previo (`test-jugador-completo.js`), que depende del save real y no tiene relación con este cambio.

## Archivos
- `tsc-src/js/mejoras-page.js`: marcado del modal, funciones del resumen y `_formAjustarAlto`.
- `tsc-src/css/mejoras-editor.css`: estilos del resumen quitados.
