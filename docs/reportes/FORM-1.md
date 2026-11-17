# FORM-1 · Cambiar jugadores en la formación

## Dónde vive la formación
- **Cancha:** Mejoras del presidente (`tsc-src/js/mejoras-page.js`, «Formación · estrategia»). La Tool no dibuja cancha: solo aplica el pedido de formación que manda el presidente.
- **Save:** la formación es posicional. Los titulares son los slots 0-10 del roster (bloque 5). Quien esté en el slot _s_ es el titular de ese lugar; el slot guarda profundidad, lateral y posición (`pes5-editor.js`, `escribirFormacionEquipo`).
- **Camino del cambio:** presidente → pedido `tipo: 'formacion'` en `pedidos_pes5` → la Tool lo aplica al save (`aplicarPedidosSeleccionados`) → se publica el equipo entero.

## Decisión: pedido, sin tocar reglas
El presidente manda el cambio como pedido. La regla de `formacion` ya acepta `slots` con `jugador` libre (solo limita `slots.size() <= 11` y `nombre`), así que **no hay cambio en `firestore.rules` ni en tests de reglas**.

## Interacción (mouse y dedo)
- Tocar un titular de campo lo selecciona. Tocar **otro** titular de campo lo intercambia con él (cada punto conserva su lugar y su posición; cambian los jugadores).
- **Banca:** debajo de la cancha, botones de 44 px de alto con los suplentes y la reserva. Con un titular seleccionado, tocar un suplente lo pone en ese lugar; el titular pasa a la banca.
- El arquero (slot 0) no entra en intercambios ni se cambia: el aviso lo dice.
- Para elegir otro titular sin intercambiar, usar las flechas ‹ › del panel de jugador.
- El arrastre con el dedo sigue funcionando (no reemplaza nada).

## Cambios
- `tsc-src/js/pes5-editor.js`: `ordenarTitulares(bytes, club, registros)`. Pone los 11 titulares en el orden pedido intercambiando slots. Rechaza: menos o más de 11, repetidos, jugadores fuera del plantel, cambio de arquero. Si rechaza, no toca el buffer.
- `tsc-src/js/pes5-tool.js` (aplicar pedidos de formación): ya no exige que el roster coincida slot a slot. Verifica que los 11 estén en el plantel, sean distintos y el arquero no cambie; después llama a `ordenarTitulares` y escribe la formación. El log indica cuántos cambios de titulares hubo.
- `tsc-src/js/mejoras-page.js`: intercambio por toque (`_formPuedeIntercambiar`, `intercambiarTitulares`), banca (`formacionElegirSuplente`, exportado a `window` para `data-onclick`), y ayuda del modal actualizada.
- `tsc-src/css/mejoras-editor.css`: estilos de la banca (`.ep-form-bench`, `.ep-form-subbtn`).

## Pruebas
- `tools/test-pes5-formacion.js` (nuevo, buffer sintético): 0 cambios si ya está igual; suplente por titular; dos titulares intercambiados; dos suplentes a la vez; no se pierde ni duplica nadie; el arquero no cambia; entradas inválidas se rechazan sin tocar el buffer. Todo OK.
- Sandbox (emulador, `:3001` reiniciado desde este worktree): con una plantilla publicada **de prueba** escrita solo en el emulador, en el modal:
  - se muestra el 11 y la banca (Lopez, Mendoza, Nunez);
  - tocar un mediocampista y luego un suplente → el suplente ocupa su lugar y el titular pasa a la banca;
  - tocar un defensa con un titular seleccionado → intercambian posiciones;
  - Confirmar → queda el pedido `formacion` con los 11 `jugador` distintos por slot; la regla lo acepta.
  - Después borré el pedido de prueba y la plantilla de prueba del emulador: el sandbox queda como estaba.
- Hallazgo en la prueba: el primer intento no hacía nada porque `formacionElegirSuplente` no estaba exportada a `window` (el archivo está envuelto en una IIFE). Corregido. `scripts/audit-wiring.mjs` daba «rotos 0» antes de la corrección, así que no lo detecta.

## Pendiente de prueba real (Jimbo)
- **La Tool aplicando el pedido** (`aplicarPedidosSeleccionados`) necesita la carpeta del save, así que no se probó en navegador. Prueba: con un presidente que haya enviado un cambio de suplente, aplicar en la Tool; abrir el save en el juego y confirmar el titular nuevo y la banca; luego publicar y mirar la cancha del presidente.
- Revisar con un equipo real la validación de líneas (mín. 2 defensas, 2 medios, 1 delantero) tras un intercambio.

## Corrección tras auditoría: aplicación atómica
La tanda de pedidos comparte un solo buffer (`copia`). Antes, `ordenarTitulares` escribía directo en `copia` y después `escribirFormacionEquipo` podía fallar: el roster reordenado quedaba en la copia y se escribía al save junto con el resto. Ahora `PES5_EDITOR.aplicarFormacionPedido` trabaja sobre una copia temporal y pasa el resultado al buffer solo si los dos pasos salen bien. Caso de prueba (`tools/test-pes5-formacion.js`, sección 8): con un buffer sin registro de formación, el fallo deja el buffer y el orden del roster intactos. El flujo anterior sí dejaba el roster reordenado (verificado).
