# ORD-3 · Intercambio de suplentes y reservas (banca)

Pedido del coordinador: el pedido de alineación lleva la banca en un campo propio; tocar un suplente o reserva y luego otro hace un intercambio exacto; la Tool valida y escribe el orden de la banca en la misma operación atómica.

## Reglas (`firebase/firestore.rules`)

- En el create de `pedidos_pes5`, solo para `tipo == 'formacion'`: se agrega `banca` al `hasOnly` y una condición opcional: si el pedido trae `banca`, tiene que ser una lista de tamaño 32 o menos. Sin `banca` el pedido se acepta igual (compatibilidad).
- No cambia ninguna otra condición. Un pedido de mejora con `banca` se rechaza.
- **Límite:** las reglas de Firestore no recorren los elementos de una lista, así que no pueden exigir que cada elemento sea entero. La comprobación de tipo y de pertenencia la hace la Tool (ver abajo): un valor que no esté en la banca del save se rechaza.

Tests (`functions/test/rules-pes5.js`, emulador en 8190, no sandbox):
- banca valida de 12 → 200; banca de 32 → 200; banca vacía → 200;
- banca de 33 → 403; banca como texto → 403; banca como mapa → 403;
- formacion sin banca → 200 (compatibilidad);
- formacion con banca y un campo extra → 403; mejora con banca → 403.
- Suite completa (`rules-teams`, `rules-suite`, `rules-pes5`): exit 0, sin fallos.

## Mejoras (`tsc-src/js/mejoras-page.js`)

- El borrador guarda la banca en `FORM.bancaOrden` (ids de los slots 11 en adelante). Lista, banca y cancha leen el mismo borrador.
- Tocar un suplente o reserva y luego otro (los dos fuera del 11) los intercambia de lugar: `_formSwapBanca`. Cada intercambio queda como una línea «Banca: X ↔ Y».
- Entrar un suplente al 11 mueve al que sale al lugar del que entra en la banca (`_formCambiarEnBanca`), igual que la Tool. Así la lista muestra lo que se va a escribir.
- El pedido manda `banca` (registros, orden completo de la banca) solo si la banca cambió respecto de la de partida. Si solo cambió la banca, no sale la línea «Formación».
- El aviso de pendientes y Pedidos muestran «Banca: X ↔ Y» (es la línea del pedido).

## Editor (`tsc-src/js/pes5-editor.js`)

- `ordenarBanca(bytes, club, banca)`: la banca tiene que ser exactamente el plantel fuera del 11 (mismos registros, sin repetidos ni ajenos, mismo tamaño). Si no, lanza con código `banca`. Escribe en los slots ocupados, así que los huecos del save se conservan.
- `aplicarFormacionPedido(..., banca)`: primero reordena los titulares, después la banca, después la formación. Todo sobre la copia; si algo falla, el save no cambia.
- `intercambiarBanca(bytes, club, regA, regB)`: swap exacto de dos jugadores de la banca (rechaza titulares).

## Tool (`tsc-src/js/pes5-tool.js`)

- `aplicarPedidosSeleccionados`: pasa `p.banca` a `aplicarFormacionPedido`. Si la banca no coincide con el save, rechaza con «el plantel cambió; el presidente debe pedir la alineación de nuevo».
- Vista de plantilla: botón «Ordenar banca». En ese modo, tocar un suplente o reserva y luego otro los intercambia en el roster (`ptBancaTocar`). El cambio queda sin escribir, como cualquier otro: cuenta en «Escribir al save» y en «Descartar cambios» (restaura una copia del save tomada antes del primer intercambio).
- Orden real de la vista: `renderPlantillaBody` muestra `PLANTILLA_ACTUAL` tal como lo devuelve `leerPlantillaCompleta` (orden de slots del save). No ordena por posición. Verificado por lectura del código; no pude abrir un save real en el navegador.

## Verificación

- `node tools/test-pes5-formacion.js`: TODO OK. La sección 12 nueva tiene 12 casos: banca válida; cinco banca inválidas (repetidos, ajeno, otro tamaño, no lista, con un titular) que se rechazan sin tocar el buffer; titular que entra y banca nueva a la vez; atomicidad de `aplicarFormacionPedido` con banca inválida; `intercambiarBanca` (exacto, rechaza titular, mismo jugador); hueco en la banca que se conserva.
- `node tools/test-pes5-orden.js`: TODO OK (ORD-1).
- `node --check` sobre `pes5-editor.js`, `pes5-tool.js` y `mejoras-page.js`: sin errores.
- Sandbox (reglas nuevas subidas al emulador de 8080; `emu-dist` reiniciado), presidente de MALVINAS JUNIORS CA:
  - Tocar Mendoza y luego Núñez: la lista pasa de [Arce, Mendoza, Núñez, …] a [Arce, Núñez, Mendoza, …]; el 11 no cambia.
  - Aviso de pendientes: «Banca: Mendoza ↔ Nunez espera que Luis la aplique».
  - El documento creado en el emulador lleva `banca` con 12 registros enteros y `lines` = [«Banca: Mendoza ↔ Nunez»].

## No hecho / a revisar

- **La Tool no se probó en el navegador con un save real** (la carpeta del save no se puede cargar en el navegador). La lógica de la Tool se probó con buffer sintético en `test-pes5-formacion.js`. El botón «Ordenar banca» de la vista de plantilla no se tocó en pantalla.
- Jimbo debe comprobar en el juego: hacer un intercambio de banca desde Mejoras, aplicarlo en la Tool, escribir el save y ver el orden en el juego.
- El campo `banca` de las reglas no valida el tipo de cada elemento (límite de Firestore, ver arriba).
- Las reglas las despliega el coordinador con OK de Jimbo. No se desplegó nada.
