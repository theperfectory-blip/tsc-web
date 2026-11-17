# FIX-CANCEL · Cancelar no siempre revierte la vista

## Síntoma
Jimbo envió un cambio (una mejora o una formación) y pulsó Cancelar. El historial mostraba el pedido como cancelado, pero a veces el cambio seguía en el 11, en la ficha y en la lista.

## Reproducción (sandbox)
- **Mejora de jugador:** BENITEZ, ataque 67 → 69. Enviar a Luis: la tarjeta muestra 69 y el aviso dice «Benitez · Ataque +2». Cancelar desde Pedidos: el historial dice «CANCELADO», el aviso desaparece, el badge queda en 0, pero **la tarjeta sigue en 69**. Bug confirmado.
- **Formación:** intercambio GOMEZ ↔ BENITEZ. Enviar: la lista muestra a BENITEZ en el 11. Cancelar desde Pedidos: la lista vuelve a GOMEZ y el aviso desaparece. Este caso no fallaba con la publicada presente.

## Causas
1. **Mejora:** al enviar, `commitChanges` cambiaba el objeto del jugador en memoria (`p.stats`, `p.favfoot`, `p.height`…) para mostrar el pedido como pendiente. Cancelar solo recalculaba el saldo y los pendientes (`recalcularPresupuestoReal`), así que nadie volvía a leer la plantilla. El borrador también quedaba con los valores enviados.
2. **Formación:** `formacionVigente` tenía un respaldo en `localStorage` (la última formación confirmada). Si el equipo no tiene formación publicada (documento sin `formacion`), ese respaldo mostraba la formación cancelada. La selección del pendiente no tenía prueba aislada.

## Cambios
- **`cancelarPedido` vuelve a la publicada:** tras cancelar, se relee la plantilla publicada (`cargarPlantillaReal`), se rehace el borrador (`loadDraft`) y se redibuja (`renderAll`). Lo hace `_volverAPlantillaPublicada`, solo en el presidente (`!ADMIN_EMBED`).
- **Se quita el respaldo de `localStorage`** de la formación (lectura en `formacionVigente` y escritura al confirmar). Una formación cancelada ya no puede reaparecer.
- **Selección del pendiente como función pura:** `PES5_PLANTILLA.formacionPendienteMasReciente(pedidos)` (`tsc-src/js/pes5-plantilla.js`). Solo cuentan los pedidos de formación `pendiente` con slots; el más reciente por `creadoEn` (el local, sin fecha, es el más nuevo). `_formacionPendiente` la usa.

## Orden de fuentes (FORM-4)
Borrador (con el modal abierto) > pedido pendiente más reciente > publicada > respaldo local (ya quitado). Tras cancelar, la lista, la cancha, la ficha y el saldo se redibujan sin recargar, y los datos salen de Firestore y de la plantilla publicada.

## Verificación (sandbox, sin recargar la página)
| Caso | Antes | Después |
|---|---|---|
| Mejora de BENITEZ, ataque 67 → 69, cancelada desde Pedidos | tarjeta 69 (bug) | tarjeta 67; saldo 100.000 |
| Formación GOMEZ ↔ BENITEZ, cancelada desde Pedidos | lista vuelve a GOMEZ | lista vuelve a GOMEZ; sin aviso |

- Desde el aviso: el aviso de pendientes no tiene botón de cancelar (su texto dice «Puedes cancelarlo desde Pedidos»). No agregué uno. Si Jimbo lo quiere, es un cambio aparte.
- Test: `tools/test-pes5-formacion.js`, sección 10. Cubre que el cancelado, el aplicado y la mejora no mandan; que sin pendientes vuelve la publicada; que con dos gana el más reciente; y que el local sin fecha es el más nuevo.

## Límites
- `_volverAPlantillaPublicada` no tiene test unitario: depende de la página. La regla de qué pedido manda sí lo tiene.
- Al cancelar se pierde el borrador en curso de otro jugador (se rehace desde la publicada). Es lo mismo que al recargar.
- Otros pedidos pendientes de mejora dejan de mostrarse como «enviados» en la tarjeta al cancelar uno, igual que al recargar la página. Su pedido sigue pendiente en Pedidos.
- En el sandbox se dejó `teams/1.yunacoin` en 100.000 para poder enviar mejoras.

## Capturas
En [capturas-FIX-CANCEL](capturas-FIX-CANCEL/):
- `antes-historial-mejora-cancelada-ataque-69.jpg`: el bug. El pedido figura cancelado, pero la tarjeta quedó en 69.
- `despues-historial-cancelado-formacion-vuelve.jpg`: tras cancelar, la lista vuelve a GOMEZ y el saldo a 100.000.
