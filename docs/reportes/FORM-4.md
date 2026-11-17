# FORM-4 · Alineación, lista de titulares y ficha

Caso de Jimbo en FK Tupadre: cambió a Boot (arquero titular) por Starke (arquero suplente). La cancha mostraba a Starke, pero la lista seguía mostrando a Boot.

## 1. Pedidos: alineación y formación por separado
- **Cambio de alineación** (quién juega): una línea por cada cambio. «Entra Starke por Boot» si entra un suplente, y «Juan ↔ $Yunifantino» si dos titulares intercambian lugar. Se calcula con `PES5_PLANTILLA.cambiosDeAlineacion` (`tsc-src/js/pes5-plantilla.js`), comparando el 11 con el que se abrió el modal.
- **Formación** (cómo se mueven los puntos): solo si cambia la posición o el punto de algún lugar de la cancha, por ejemplo el esquema 4-3-3. Un intercambio de jugadores no la activa.
- Si el pedido trae las dos cosas, salen las dos líneas. Ejemplo sandbox: «Cambio de alineación: Herrera ↔ Ibarra · Formación: 4-3-3 (puntos movidos)».
- Los nombres salen de la plantilla publicada y pasan por `escHtml` en la vista del presidente y en la Tool.
- **Dónde se ve:** el aviso de pendientes del presidente (`renderPending`), la lista de Pedidos de la Tool (`pes5-tool.js`, columna «Alineación» o «Formación» y las líneas), y el registro de «aplicado» de la Tool.
- Las líneas viajan en el campo `lines` del pedido, que las reglas ya permiten, así que no hay cambios en `firestore.rules`.
- **Limitación:** los pedidos enviados antes de este cambio conservan el texto viejo (por ejemplo, «4-3-3 → 4-3-3 (puntos movidos)»).

## 2. Lista de titulares: una sola fuente
**Causa:** la lista del plantel, sus secciones (Titulares, Suplentes, Reserva), su orden y la banca de la cancha leían `slot` del plantel publicado. La cancha, en cambio, leía el borrador o el pedido. Por eso, con el borrador o un pedido pendiente, la cancha ya tenía al arquero nuevo y la lista seguía con el viejo. El aviso de pendientes, además, mostraba el primer pedido de Firestore, no el más reciente.

**Cambio:** `alineacionVigente()` es la única lectura. En este orden:
1. el borrador del modal, si está abierto (`FORM.draft`);
2. el pedido de formación pendiente más reciente (por `creadoEn`; el local cuenta como el más nuevo);
3. la formación publicada;
4. la local (respaldo).

A partir de ella salen:
- las secciones y el orden de la lista (`_seccionesPlantel`, `plantelOrdenado`): el 11 en el orden de la cancha, y luego la banca, donde los primeros 12 son suplentes;
- la etiqueta de cada titular: el lugar de la cancha (PT, CT, CCD…), no su posición natural;
- la banca y la ficha del modal;
- el aviso de pendientes, que ahora muestra el pedido más reciente.

Cerrar el modal vuelve a dibujar la lista. Al confirmar, el pedido local ya lleva sus slots, así que la lista cambia sin recargar.

**Verificado en el sandbox** (escritorio, luego 375 px), las tres fuentes:
- **Borrador:** LOPEZ (portero suplente) toca el arco. La lista del 11 y la ficha muestran a LOPEZ primero. Un intercambio BENITEZ ↔ GOMEZ cambia de orden en la lista.
- **Pendiente:** tras confirmar, la lista muestra LOPEZ como PT y el aviso dice «Cambio de alineación: Entra Lopez por Arce». Al recargar, Firestore lo devuelve igual. Con dos pendientes, el aviso muestra el más reciente.
- **Publicada:** simulé lo que hace la Tool al aplicar y publicar (reordena el roster y la formación, y quita los pedidos). Al recargar, la lista, la banca y el aviso (sin pendientes) coinciden.

## 3. Colores por valor en la ficha
La escala del editor ya existe (`tierClass99` y `TIER_COLOR`) y la ficha la usa ahora: menos de 80 normal, 80-89 amarillo, 90-95 naranjo y 96 o más rojo. **No es la escala que pidió Jimbo** (80-84 amarillo, 85-89 naranjo, 90 o más rojo). No la cambié, porque es compartida con el editor. Pregunta enviada al coordinador: ¿cambiamos la escala compartida o la dejamos?

## 4. Ficha sin explicaciones
Se quitaron las etiquetas aclaratorias de los encabezados: «0-99», «escala 1-8» y «C · B · A» en Secundarios y lesiones. Quedan el título de cada bloque y los valores. El texto de ayuda de la parte inferior del modal (que dice qué tocar) se mantiene porque no es un encabezado.

## Pruebas
- `tools/test-pes5-formacion.js`, sección 9: arquero suplente («Entra Starke por Boot»), intercambio entre titulares («Juan ↔ $Yunifantino»), ambos a la vez, y mismo 11 sin cambios. TODO OK.
- `npm test`: 92 pasan y 1 falla, el mismo test previo (`test-jugador-completo`, depende del save real).

## No verificado
- La lista de Pedidos de la Tool en el navegador: requiere iniciar sesión como admin y la carpeta del save. Su código se revisó, pero no se probó en pantalla.

## Estado del sandbox
- La plantilla publicada tiene el nuevo orden (Lopez de arquero, Gomez y Benitez intercambiados).
- Queda un pedido de formación pendiente para que Jimbo lo vea: «Cambio de alineación: Herrera ↔ Ibarra · Formación: 4-3-3 (puntos movidos)».

## Capturas
En [capturas-FORM-4](capturas-FORM-4/):
- `movil-375-lista-y-aviso.jpg`: lista con Lopez de PT y el aviso con las dos líneas.
- `movil-375-ficha-colores.jpg`: ficha de Lopez a 375 px.
- `escritorio-lista-y-aviso.jpg`: lista y aviso en escritorio.
- `escritorio-ficha-colores.jpg`: ficha en escritorio.

## Archivos
- `tsc-src/js/pes5-plantilla.js`: `cambiosDeAlineacion`.
- `tsc-src/js/mejoras-page.js`: `alineacionVigente`, lista, banca, ficha, pedidos y aviso.
- `tsc-src/js/pes5-tool.js`: pedidos de formación (lista y registro de aplicado).
- `tools/test-pes5-formacion.js`: sección 9.
