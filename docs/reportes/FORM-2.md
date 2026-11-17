# FORM-2 · Formación en Mejoras: cambiar jugadores, lista completa y ficha

Probado en el sandbox (:3001) con un plantel de 23 jugadores (11 titulares, 12 suplentes y reserva). Capturas en [capturas-FORM-2](capturas-FORM-2/).

## 1. Por qué no se podían mover todos los jugadores
No es un filtro por posición ni un `disabled`: la lista horizontal (la banca de FORM-1) era un contenedor de ancho fijo con `overflow-x: auto`, sin controles y sin desplazamiento con la rueda del mouse.
- Con 12 suplentes la lista mide 1672 px dentro de 602 px (escritorio). Solo se veían 4: Lopez, Mendoza, Nunez y Ortiz.
- Con mouse no había forma de llegar al resto. Los primeros suplentes en el orden del plantel son porteros y centrales, que es lo que Jimbo describe.
- En 375 px pasaba lo mismo, con 2 o 3 visibles.

## 2. Cruceta eliminada
La cruceta era `.ep-pitch-nudge` (4 flechas de ajuste fino, bajo la cancha). Se quitó el marcado, sus estilos y las reglas por ancho de pantalla. No queda ningún reemplazo en esa zona. Las flechas del teclado siguen funcionando (`moveFormationScreen` sigue atado a `keydown`).

## 3. Lista completa del plantel
- En el lugar de la cruceta: todos los jugadores del plantel (no solo los de banca), cada uno con su nombre, su etiqueta («En el 11», «Suplente» o «Reserva») y su posición (`CODIGO_POS`).
- Desplazamiento horizontal con botones de 44 px a cada lado, con mouse y con dedo. La rueda del mouse también desplaza en horizontal.
- Medido a 375 px: las flechas desplazan 142 px y la rueda 282 px. La página no tiene desplazamiento horizontal (`scrollWidth` 375).

## 4. Cómo conviven selección e intercambio
Elegí la regla más simple: **el primer toque selecciona y muestra la ficha; el segundo toque, en otro jugador, hace el cambio.**
- Titular con titular: intercambian lugares.
- Suplente con titular: el suplente entra en el lugar del titular y este pasa a la banca. Puede empezar tocando el suplente o el titular, en cualquier orden.
- Tocar el mismo jugador otra vez no hace nada. El botón «Cancelar» de la ficha quita la selección.
- Un toque en un jugador con otro ya seleccionado siempre cambia; para solo ver la ficha de alguien, primero «Cancelar».
- Descarté el botón «Cambiar» en la ficha: obligaba a tres toques por cambio (elegir, elegir, cambiar) y no hacía falta para evitar cambios por error, porque el cambio siempre necesita dos toques seguidos sobre jugadores distintos.
- El arrastre con el dedo sobre la cancha sigue igual, solo cuando el toque no cambió nada.

## 5. Ficha completa
Se abre al tocar cualquier jugador. Reutiliza las tablas del editor de Mejoras (`MAIN_STATS`, `SEC_NEW`, `POSITIONS`, `ALL_ABILITIES`); no hay tablas nuevas. Los nombres salen con `escHtml`.
- **Atributos:** las 23 de `MAIN_STATS`, valor 0-99.
- **Secundarios y lesiones:** Mentalidad, Trabajo en equipo y Cualidades de portero (0-99); Regularidad, Estabilidad, Frec. pie malo y Prec. pie malo (escala 1-8); Resistencia a lesiones (C · B · A).
- **Posiciones:** las 12 de `POSITIONS`, marcadas las que tiene.
- **Habilidades especiales:** las 23 de `ALL_ABILITIES`, con «Sí» o «No».
- Scroll vertical propio: `max-height: min(44vh, 380px)`. En el modal, la ficha queda debajo de la lista y el modal también se puede desplazar.

## 6. El arquero
- **Antes (FORM-1):** el arquero (slot 0) no cambiaba nunca desde la formación.
- **Ahora:** puede cambiar por otro arquero del plantel, por ejemplo un suplente que sea portero. Un arquero no puede entrar en un lugar de campo, ni un jugador de campo en el arco.
- **Dónde se valida:** en la UI (`_formLegalEntrada`) y en la Tool. La Tool ya no rechaza el cambio de arquero; exige que quien entre en el slot 0 tenga posición de portero (`primaryPos === 'GK'`, leído con `jugadorParaEditor`). `ordenarTitulares` reordena el slot 0 como cualquier otro titular.
- **Por confirmar en el juego:** que el arquero del juego sea el primer slot del roster. Lo dice `pes5-map.json` («el primer slot no vacío es el arquero»), pero no se probó en el juego.

## 7. Verificación
- **Escritorio (1024 px):** cruceta fuera; 23 jugadores en la lista; la lista se desplaza con flechas y rueda; ficha completa con 4 secciones (31 filas de atributos y secundarios, 35 ítems de posiciones y habilidades).
- **Teléfono (375 px):** sin desplazamiento horizontal de página; botones de 44 px; ficha con scroll propio.
- **Intercambio (escritorio):**
  - Suplente con titular: Ortiz entra en el lugar de Herrera, que pasa a la banca.
  - Titular con titular: Ibarra y Gomez intercambian lugares; siguen los 11 titulares.
  - Arquero con arquero: Lopez entra en el arco y Arce pasa a la banca.
  - Rechazo: Mendoza (campo) armado y luego el arco → no cambia nada; el suplente sigue seleccionado.
  - «Cancelar» quita la selección.
- Pruebas automáticas: `tools/test-pes5-formacion.js` (caso de arquero actualizado: un cambio de arquero ahora reordena). TODO OK.

## 8. Lo que no se probó
- Toque real con dedo: los toques fueron clics de mouse. El arrastre táctil quedó igual, pero no se probó con dedo.
- La Tool aplicando un cambio de arquero en el save: necesita la carpeta del save.
- Textos con voseo que ya estaban en `mejoras-page.js` fuera de este slice (líneas 1303, 1497 y 2690, en avisos y en la selección de posición natural). No los cambié.

## Archivos
- `tsc-src/js/mejoras-page.js`: interacción, lista completa, ficha y rueda.
- `tsc-src/css/mejoras-editor.css`: se quita la cruceta; estilos de la lista con controles y de la ficha.
- `tsc-src/js/pes5-editor.js` y `tsc-src/js/pes5-tool.js`: el arquero puede cambiar, validado como portero.
- `tools/test-pes5-formacion.js`: caso de arquero actualizado.
