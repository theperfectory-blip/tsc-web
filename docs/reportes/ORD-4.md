# ORD-4 · Intercambios de banca como pares (`bancaSwaps`), sin «Ordenar banca» en la Tool

Sobre ORD-3, aprobado por Jimbo. Dos cambios:

1. **La Tool ya no ordena la banca.** Se quitan el botón «Ordenar banca», la interacción por toque de la vista de plantilla y sus exports. Quien decide el orden de la banca es el presidente, por pedido. La vista de plantilla sigue mostrando el orden real de los slots (`leerPlantillaCompleta`, sin ordenar por posición). No había CSS propio de ORD-3 (los únicos cambios de estilo eran clases en el HTML generado, que se quitan con el bloque).
2. **La banca viaja como intercambios, no como orden completo.** El pedido de formación lleva `bancaSwaps`: una lista plana de pares de registros `[a1, b1, a2, b2, …]` en el orden en que el presidente los hizo. Sustituye al campo `banca` de ORD-3, que no estaba desplegado.

## Reglas (`firebase/firestore.rules`)

- En el create de `pedidos_pes5`, solo para `tipo == 'formacion'`: `bancaSwaps` reemplaza a `banca` en el `hasOnly`. Es opcional; si viene, tiene que ser lista, `size() <= 32` y `size() % 2 == 0`.
- Sin `bancaSwaps` el pedido se acepta igual.
- Límite: las reglas no recorren los elementos, así que no exigen que sean enteros. La Tool sí lo exige (ver abajo).

Tests (`functions/test/rules-pes5.js`): válido (4 registros) → 200; límite de 32 → 200; vacío → 200; impar (3) → 403; más de 32 (34) → 403; no lista (texto) → 403; ausente → 200; con un campo extra → 403; el campo viejo `banca` → 403; mejora con `bancaSwaps` → 403.

Suite completa en el emulador de 8190 (`rules-teams`, `rules-suite`, `rules-pes5`): exit 0; 33 PASS en `rules-teams`, 92 OK entre `rules-suite` y `rules-pes5`, 0 FAIL y 0 FALLA.

## Editor (`tsc-src/js/pes5-editor.js`)

- `ordenarBancaSwaps(bytes, club, pares)`:
  - formato: lista, número par, como máximo 32, enteros positivos, sin par repetido. Si no, lanza con código `banca-formato`.
  - pertenencia: cada registro tiene que estar en la banca del save (slots 11 en adelante, después de aplicar los titulares). Si uno falta, lanza con código `banca` y `e.registro` = ese registro. Se valida todo antes de tocar nada.
  - aplicación: cada par es un swap exacto de sus dos slots, en orden. Los demás cambios de la banca (fichajes, bajas, otros pedidos) no impiden aplicar.
- `aplicarFormacionPedido(bytes, club, registros, slots, bancaSwaps)`: trabaja sobre una copia: titulares, luego `bancaSwaps`, luego la formación. Si algo lanza, el save no cambia.
- Se quitan `ordenarBanca` e `intercambiarBanca` (eran de ORD-3).

## Tool (`tsc-src/js/pes5-tool.js`)

- `aplicarPedidosSeleccionados` pasa `p.bancaSwaps` a `aplicarFormacionPedido`.
- Si lanza `banca`: se rechaza el pedido entero, sin tocar el save, con el motivo «X ya no está en la banca; el presidente debe pedir la alineación de nuevo» (X es el nombre del jugador, de `nombreDeRegistro`).
- Si lanza `banca-formato`: se rechaza con «no se pudo escribir la formación: formato invalido».
- Los titulares siguen igual: 11 exactos y validación del arquero.
- Se revierte el resto de ORD-3 en la Tool (botón, estado, `BANCA_SNAPSHOT`, cambios en descartar, en el contador y en el cambio de equipo). Su archivo queda igual a ORD-2 salvo el punto de aplicación.

## Mejoras (`tsc-src/js/mejoras-page.js`)

- El borrador guarda los intercambios en `FORM.bancaPares`, pares de ids en orden. La banca visible (`FORM.bancaOrden`) se recalcula con cada par.
- Un toque en un suplente o reserva y otro en un segundo lo intercambia y agrega el par.
- **Deshacer:** si el par coincide con el último intercambio hecho, se quita y la banca vuelve a como estaba (un swap repetido es su propia inversa). Un par anterior no se quita, porque cambiaría el resultado de los pares que se hicieron después.
- **Entrar al 11:** un jugador que tiene un par en el pedido no puede entrar al 11 hasta deshacer ese intercambio. Aviso: «Tiene un intercambio de banca en este pedido: deshazlo antes de ponerlo en el 11.» Así la Tool no recibe un par cuyo jugador ya no esté en la banca.
- El pedido manda `bancaSwaps` solo si hay pares. La línea de cada par es «Banca: X ↔ Y», y aparece en el aviso y en Pedidos.
- **Pedido pendiente:** la banca que muestra Mejoras (sin borrador) parte del orden del save con los titulares del pedido, y aplica los `bancaSwaps` del pedido pendiente en su orden. Así lo que se ve coincide con lo que la Tool va a escribir.

## Tests (`tools/test-pes5-formacion.js`, sección 12)

- Swaps con la banca intacta: dos pares se aplican en orden y el 11 no cambia.
- Swaps con un jugador ajeno al par: entra un titular, el que sale cae en la banca y el par se aplica igual.
- Rechazo cuando falta uno del par: `aplicarFormacionPedido` lanza `banca` con el registro, y el buffer queda igual byte a byte. Un registro fuera del plantel también se rechaza, con buffer igual.
- Formato inválido (impar, más de 32, no lista, par repetido, cero): `banca-formato`, buffer igual.
- Lista vacía no cambia nada; un hueco en la banca se conserva.

Resultado: `node tools/test-pes5-formacion.js` → TODO OK (51 OK). `node tools/test-pes5-orden.js` → TODO OK.

## Sandbox

- Reglas nuevas subidas al emulador de 8080. `emu-dist` reiniciado.
- Presidente de MALVINAS JUNIORS CA, en `http://localhost:3001/mejoras?emu=1`:
  - Par 1: Mendoza ↔ Núñez. Par 2: Arce ↔ Ortiz. Deshacer el par 2 (vuelve a Arce, Núñez, Mendoza, Ortiz). Confirmar.
  - Aviso: «Banca: Mendoza ↔ Nunez». Documento en el emulador: `bancaSwaps: [113, 114]`, sin `banca`, y `lines` = [«Banca: Mendoza ↔ Nunez»].
  - Tras recargar con el pedido pendiente, la banca muestra Arce, Núñez, Mendoza, Ortiz: el par pendiente se replica.
  - Con un par Paz ↔ Quiroga hecho, intentar poner a Quiroga en el 11 no entra y muestra el aviso.
- Pedido de prueba de ORD-3 (con el campo `banca`) borrado del sandbox.

## Pendiente / a revisar

- Tool sin probar con un save real: no se puede abrir la carpeta del save en el navegador. Los tests de la Tool usan buffer sintético.
- El orden de los cambios de titular en Mejoras es el orden en que los hace el presidente. La Tool los aplica en orden de slot. Para un solo suplente que entra, el resultado es el mismo. Con varios suplentes que entran, los saliente caen en los mismos slots en ambos casos porque cada suplente ocupa su propio lugar en la banca. No se encontró un caso que difiera; no se probó con todas las combinaciones.
- Jimbo debe comprobar en el juego: un intercambio de banca desde Mejoras, aplicado por la Tool, escrito al save y visto en el juego.
- Las reglas las despliega el coordinador con OK de Jimbo. No se desplegó nada.
