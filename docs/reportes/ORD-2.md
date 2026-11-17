# ORD-2 · Orden del plantel al intercambiar titular y suplente

Pedido de Jimbo: un cambio es un intercambio exacto de dos slots; ningún otro jugador cambia de lugar, y el orden de suplentes y reservas lo decide quien edita y se conserva.

## Qué pasaba

- **La Tool no reordena en el cambio de titular.** `ordenarTitulares` (`tsc-src/js/pes5-editor.js`) hace un intercambio exacto por cada titular que cambia: el que entra toma el slot del que sale. Se verificó con un sondeo sobre buffer sintético (`scratchpad/ord2-probe.mjs`): un suplente por un titular, dos suplentes por dos titulares, un intercambio entre titulares y un arquero suplente. En todos los casos cambian solo los slots del intercambio.
- **Mejoras sí reordenaba.** La banca de Mejoras (`plantelOrdenado` y `_seccionesPlantel` en `tsc-src/js/mejoras-page.js`) se ordenaba por el slot del plantel publicado. Un titular sacado del 11 tiene un slot de 0 a 10, así que caía siempre al principio de la banca, aunque la Tool lo dejaba en el slot del suplente que entró. Con dos suplentes, Mejoras mostraba la banca como [9, 10, 12] y la Tool escribe [12, 9, 10]. Es el punto 1 de Jimbo. Mejoras mostraba un orden que el save no tenía.
- **Punto 2 (mover dentro de la banca).** Mejoras no tiene una acción para mover suplentes o reservas: solo muestra la banca ordenada por slot. La Tool tampoco tiene una acción de banca. Lo que parecía un reordenamiento distinto era la vista de Mejoras, no un cambio en el save.

## Cambio

- `tsc-src/js/pes5-plantilla.js`: nueva función `rosterTrasTitulares(baseIds, titularesIds)`. Aplica el mismo cálculo que `ordenarTitulares` sobre el roster por slot, para saber cómo queda el plantel después de un 11 nuevo.
- `tsc-src/js/mejoras-page.js`: `_rosterVisible()` usa esa función. La banca, y la división suplente/reserva, salen del mismo orden que escribirá la Tool.
- `tools/test-pes5-formacion.js`, sección 11: lee el roster antes y después de `ordenarTitulares`, compara con `rosterTrasTitulares`, comprueba que solo cambian los slots del intercambio y que el plantel conserva a todos sus jugadores una sola vez. Incluye el caso exacto de Jimbo (el 11 cae en el slot del 12) y el de dos suplentes.

## Verificación

- `node tools/test-pes5-formacion.js`: TODO OK (incluye los casos de ORD-2).
- `node tools/test-pes5-orden.js`: TODO OK (ORD-1, sin cambios).
- `node --check` sobre `mejoras-page.js` y `pes5-plantilla.js`: sin errores.
- Sandbox (`emu-dist` reiniciado en `http://localhost:3001/mejoras?emu=1`, presidente con MALVINAS JUNIORS CA): en la lista de Formación, Juárez (titular, slot 9) sale y entra Mendoza (suplente, slot 12). Resultado: Mendoza ocupa el lugar de Juárez en el 11, Juárez queda en la banca en la posición de Mendoza y el resto de la banca no se mueve. Antes del cambio, Juárez habría caído al principio de la banca.

## No hecho, y por qué

- **Puntos 2 y 3 (intercambio dentro de la banca, «Banca: X ↔ Y»).** No se implementó. Un pedido de formación hoy solo lleva los 11 titulares: `pedidos_pes5` acepta `formacion.slots` con como máximo 11 entradas y `formacion.keys().hasOnly(['nombre','slots'])` en `firebase/firestore.rules`. Para que la Tool aplique un cambio de banca hace falta una decisión del coordinador: (a) una rama aditiva en las reglas (un pedido `tipo` banca, o un campo nuevo), que cambia las reglas y requiere OK; o (b) codificarlo en `lines`, que las reglas no validan, pero entonces la Tool tendría que leer texto libre para aplicar un cambio. No lo hice sin esa decisión.
- **Punto 4 (PES5 reordena la banca al cargar): comprobado por Jimbo en el juego.** PES5 no reordena la banca. Si cambia al jugador 11 por el 17, solo esos dos cambian de lugar, y el swap exacto de la Tool coincide con el juego. `tsc-src/js/pes5/pes5-map.json` (`equipos.roster`, `gotcha_escritura`) describe un reordenamiento del juego al dar de baja un jugador (intercambio con uno del mismo grupo posicional), no al cargar; el editor solo lee el orden crudo de los slots.
- **Prueba en el juego.** La carpeta del save no se puede cargar en el navegador (`showDirectoryPicker`), así que la prueba de la Tool fue con un buffer sintético. Jimbo debe comprobar en el juego: aplicar un cambio de suplente por titular, publicar y ver que el titular que salió queda en el lugar del suplente que entró, y que el resto de la banca no cambió.
