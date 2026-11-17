# ORD-1 · La Tool no mostraba el orden modificado del plantel

## Síntoma
Si el orden del plantel cambia en el juego (o en el save), la Tool mostraba el orden viejo.

## Qué se revisó
- El orden del plantel es el del save: bloque 5 (`pes5-map.json > equipos.roster`), offset `667458 + club*64 + slot*2`. El lector `leerPlantillaEquipo` (`tsc-src/js/pes5-editor.js`) no cambió desde su creación (commit `7509ed9`); la plantilla y la tabla de la Tool salen de `PLANO`, no de Firestore ni de caché.
- Comparé los backups del save real con el save actual (solo lectura): en varios clubes el orden cambió entre el 8 y el 16 de noviembre, así que el juego sí reordena el bloque 5.
- Causa en la Tool (`tsc-src/js/pes5-tool.js`): `PLANTILLA_ACTUAL` solo se volvía a leer del save cuando la pestaña activa era «Plantilla» (`recargarSaveClick` y el observador de cambios del juego). Si el cambio llegaba estando en otra pestaña, al volver a Plantilla `renderPlantillaTab` restauraba la copia vieja.

## Cambio
- Nueva `releerPlantillaAbierta()`: relee el club abierto desde `PLANO` en cualquier pestaña (en Plantilla, pasa por `onTeamSelect` como antes).
- Se usa en `recargarSaveClick` y en el observador de cambios del juego.
- `renderPlantillaTab` relee del save al restaurar un club abierto en vez de reutilizar la copia.

## Prueba
- `tools/test-pes5-orden.js` (nuevo, sin save real): el lector devuelve el orden de los slots, devuelve el orden nuevo tras un cambio de orden, no se altera por otro club y no muta el buffer. 5/5.
- `npm test`: 91 de 92 pasan. El fallo es `test-jugador-completo.js` («Berbatov encontrado en el save»): depende del contenido del save real y no carga `pes5-tool.js`; no lo toca este cambio.

## Pendiente de prueba real (Jimbo)
La Tool necesita `showDirectoryPicker`, así que no se puede automatizar aquí. Prueba sugerida: abrir la Tool con el save, cambiar a Pedidos, reordenar el plantel de un club en el juego, guardar, volver a Plantilla y confirmar que el orden coincide con el juego sin pulsar «Recargar».
