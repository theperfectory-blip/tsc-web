# DORSAL: el dorsal viaja con el jugador al cambiar la formación

## Causa
`ordenarTitulares`, `ordenarBancaSwaps`, `darDeBajaJugador` y `darDeAltaJugador` (en `tsc-src/js/pes5-editor.js`)
movían solo los IDs del roster (bloque 5, 2 bytes por casilla). El dorsal se guarda por casilla en otro arreglo del
mismo bloque, que nadie movía. Al cambiar un jugador de casilla, el número se quedaba en la casilla.

## Offset y codificación (encontrado)
- Offset base `659414`, stride `32` por club, 1 byte por casilla (casilla s = byte s).
- Valor guardado = dorsal − 1 (el #1 guarda 0, el #99 guarda 98). Casilla vacía = 0.
- Documentado en `tsc-src/js/pes5/pes5-map.json > equipos.dorsales`.

Cómo se encontró: se descifró una copia del option file en vivo (la original no se tocó) con `tools/pes5/pes5-crypt.js`
y se buscó, con stride fijo, un bloque de 32 bytes por club donde las casillas ocupadas tuvieran valores en 0..99 sin
repetir. Solo el stride 32 en offset 659414 cumple para los 138 clubes. Los stride 628 que también aparecen son los
registros de formación (permutaciones de 0..31), no dorsales.

Verificación:
- Caso de Santiago en el save real: Vivaldo en la casilla 0 (titular) vale 11 (#12) y Toldo en la casilla 11 (banca)
  vale 0 (#1). Es el estado que describe el reporte del bug.
- Muestra de clubes: Arsenal (Lehmann #1, Pires #7, Bergkamp #10), Guaraní AF, Atl. Junior, Argentinos. Cada GK
  titular tiene el valor 0 (#1) cuando su club no tiene otro arquero titular.
- 138/138 clubes con sus 32 valores en 0..98.

Limitación: la lectura se verificó contra la estructura del save y el caso de Santiago. No se confirmó en el juego (ver
«Pruebas en el juego»).

## Qué cambió
`tsc-src/js/pes5-editor.js`
- Helpers `_leerDorsales` / `_escribirDorsales` (bytes crudos) y `leerDorsalesEquipo` (exportado, dorsal real 1..99,
  0 = casilla vacía).
- `ordenarTitulares` y `ordenarBancaSwaps`: cada intercambio de casillas intercambia también el dorsal.
- `darDeBajaJugador`: el último del roster ocupa la casilla que queda libre con su dorsal; la casilla que queda vacía
  pone el dorsal en 0. Devuelve el dorsal (1..99) del jugador que se va.
- `darDeAltaJugador(bytes, equipo, id, dorsalPrevio)`: el jugador ocupa la primera casilla libre. Regla de dorsal:
  conserva `dorsalPrevio` si está libre en el equipo destino; si no, toma el primer número libre desde el #1. Devuelve
  el dorsal asignado.
- `transferirJugador`: baja en el origen, alta en el destino con el dorsal que trae. Devuelve el dorsal en el destino.
- `leerPlantillaCompleta`: cada jugador trae `dorsal` (número real) y `slot` (casilla).

`tsc-src/js/pes5-plantilla.js`: `plantillaParaEditor` pone el `dorsal` real en vez de cadena vacía.

`tools/test-pes5-dorsal.js` (nuevo): 25 aserciones en verde.
- Caso de Santiago: titular con #12 y suplente con #1, cada uno conserva su número tras el swap. Ningún byte fuera del
  roster y de los dorsales del club cambia.
- Swap de banca (#12 ↔ #13): cada uno conserva su número.
- Baja del medio de un plantel de 32: el #6 se va, el #32 pasa a la casilla 5 con su #32, la casilla 31 queda sin dorsal.
- Transferencia sin choque: conserva el #9. Con choque (#9 y #1 ocupados en el destino): toma el #2.
- Fichaje sin dorsal previo: toma el primer libre. Con #1 ocupado y dorsal previo #1: toma el #4.
- `leerPlantillaCompleta` devuelve el dorsal y la casilla.
- Un pedido inválido no cambia ni el roster ni los dorsales (atomicidad).

## Tests y comprobaciones
- `node --check` de `pes5-editor.js`, `pes5-plantilla.js` y `test-pes5-dorsal.js`: OK.
- Tests de pes5 y yunacoins en verde: `test-pes5-bloqueo`, `-clubes` (8/8), `-formacion`, `-live-map`, `-orden`,
  `-plantilla`, `-plantilla-publicadas` (10/10), `test-formacion-permutada`, `test-slice-p-plantilla`,
  `test-yunacoins-core` (38/38), `test-yunacoins-rules`, `test-topes-extra` (4/4), y el nuevo `test-pes5-dorsal`.
- `node scripts/audit-wiring.mjs`: rotos 0. El reporte `docs/reportes/MS-2.3-cableado.md` se regeneró y se restauró a
  la versión del repo.
- `node scripts/build-web.mjs` + `node scripts/smoke-parity.mjs`: PARIDAD: OK.
- `node scripts/csp.mjs --check`: OK.

No se tocaron `android/app/capacitor.build.gradle` ni `android/capacitor.settings.gradle` (ya estaban modificados antes de
empezar; siguen igual). No hubo commit, push, checkout ni deploy.

## Pruebas en el juego
No se abrió PES5 en esta sesión. La verificación fue sobre una copia descifrada del save en vivo
(`Documents\KONAMI\Pro Evolution Soccer 5\save\folder1\KONAMI-WIN32PES5OPT`, SHA-256
`34b4f3bb…190b8`, sin modificar). La copia de trabajo quedó en la carpeta scratchpad de la sesión.
Pendiente de confirmar en el juego: hacer un pedido de titular con dorsal distinto, aplicarlo sobre una copia del save
y comprobar que el número sigue al jugador. Mientras tanto la prueba automatizada cubre la lógica.

## Equipos que pueden tener dorsales cruzados
Los pedidos de formación aplicados antes de este arreglo quedaron con el dorsal en la casilla del titular que salió.
Solo se afectan los pedidos que cambiaron titulares o banca (los que solo cambian profundidad o lateral no mueven
casillas).

Cómo listarlos (solo lectura, sin escribir en producción): en Firestore, colección `pedidos_pes5`, consulta
`where('estado', '==', 'aplicado')`. Para acotar a los que tocaron casillas, revisar los que tienen `formacion` con
cambios de titulares o `bancaSwaps` no vacío, y filtrar por `aplicadoEn` posterior al despliegue de este arreglo (o
anterior, para los que hay que revisar). El `equipo` del pedido indica el club (`pes5ClubIdx`).

Limitación: el log de «aplicado» de la Tool vive solo en la sesión, y los saves ya escritos al juego no quedan en
Firestore. La lista de pedidos dice qué clubes cambiaron de titulares; para saber qué número quedó en cada casilla hace
falta leer el save del juego de ese club y comparar con el dorsal esperado.
