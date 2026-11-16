# PES5-TOPE-1 · Tope de atributos por temporada del juego

Rama: `feat/tope-atributo-temporada` (desde `origin/main` 1f24ae6, PR #18).
No mergeada a `main`.

## Regla

- Tope **absoluto** para los atributos 0-99 (los 27 de `atributos_0_99` del mapa,
  incluidos Mentalidad, Cualidades de portero y Trabajo en equipo). Sin importar
  si la base es 80 u 85.
- Un atributo que **sube** no puede pasar del tope de la temporada del juego.
- Un jugador que ya está por encima del tope (leyenda) **conserva** su valor, no
  puede subirlo, y nunca se baja ni se invalida nada.
- Escalas 1-8 (Regularidad, Estabilidad, pies), habilidades y Resistencia a
  lesiones **no** entran en el tope.
- Tope por temporada del juego: lista `topesAtributo` en `pes5_config/reglas`
  (default `[90]`). Índice 0 = 1.ª temporada del juego, índice 1 = 2.ª, etc. Si
  falta un valor se hereda el último. Lista vacía = sin tope. Los topes no bajan
  entre temporadas.
- Temporada del juego: se normaliza el nombre del juego (trim, mayúsculas, sin
  espacios): «PES5» y «PES 5» cuentan igual. La temporada de referencia es la
  **activa** si existe (es la que se juega ahora); si no hay ninguna activa, la
  `STATE.season` de la app. La posición de esa temporada entre las del mismo juego
  (orden por número) es su «temporada N del juego».

## Cambios

- `tsc-src/js/yunacoins-rules.js`
  - `DEFAULT_RULES.topesAtributo = [90]`, validación (`validarReglas`) y
    `normalizarReglas` lo incluyen.
  - `motivoRechazoMejora(jugadorActual, cambios, total, tope)`: nuevo parámetro
    opcional `tope`. Rechaza un atributo que sube (`a > de`) y supera el tope
    (`a > tope`). Mensajes distintos para leyenda («ya está en X y el tope… no
    puede subir») y para subir hasta el tope («subiría a X y el tope… es Y»).
  - Funciones puras nuevas: `normalizarJuego`, `temporadaDelJuego`,
    `temporadaActualDelJuego`, `topeAtributo`.
- `tsc-src/js/pes5-tool.js`
  - Carga `YC_SEASONS` en el arranque. `_topeAtributoVigente()`.
  - Pedidos: `aplicarPedidosSeleccionados` pasa el tope a `motivoRechazoMejora`.
    Un pedido que supera el tope queda rechazado con su motivo.
  - Pestaña Reglas: campo `rg-topesAtributo` (lista separada por comas), y un
    bloque que muestra el juego actual, qué temporadas cuenta la web como
    1.ª, 2.ª... del juego y el tope vigente. `guardarReglas` valida y guarda.
  - Editor de jugador (modo admin): `_opcionesEditor` pasa `topeAtributo`.
- `tsc-src/js/mejoras-page.js`
  - `TOPE_TEMPORADA`, `cargarTopeTemporada()` (presidentes), `motivoTopeSubida()`.
  - `numericRowHTML`: el `+` queda deshabilitado en la fila que supera el tope y
    la fila muestra el motivo. `adjustMain` y `adjustSec` (sc 99) lo bloquean
    también al hacer clic.
- `tools/test-yunacoins-rules.js`: casos nuevos (ver abajo).

## Tests (`node tools/test-yunacoins-rules.js`)

| Caso | Resultado |
|---|---|
| Base 80 → 90, tope 90 | aprobado |
| 89 → 91, tope 90 | rechazado (`… no puede …`) |
| Leyenda 95 sin cambios | aprobado |
| Leyenda 95 → 96 | rechazado (`… no puede subir`) |
| Sin tope (null) no bloquea | aprobado |
| Bajar un atributo | rechazado (sin cambios) |
| Temporada sin valor hereda el último | `topeAtributo(3,[90]) === 90`, `(3,[85,90]) === 90` |
| Lista vacía = sin tope | `topeAtributo(1,[]) === null` |
| «PES5» y «PES 5» | mismo juego (`normalizarJuego`, `temporadaDelJuego`) |
| Temporada activa como referencia | `temporadaActualDelJuego` usa la activa |
| `validarReglas`: topes que bajan, 100, lista vacía | rechazado / rechazado / válido |

Todos los archivos `tools/test-*.js` pasan.

## Prueba UI en el sandbox (tsc-emu y tsc-emu-dist)

Sandbox del worktree con emulador de Firestore y Auth. Se usó la cuenta admin de
prueba del emulador, un usuario de prueba y el save de prueba del repo, cargado
con un handle de carpeta simulado solo dentro del navegador de prueba.

| Prueba | tsc-emu (fuente) | tsc-emu-dist |
|---|---|---|
| Reglas: lista `90, 85` | error «los topes no pueden bajar» | igual (no probado en dist, ver nota) |
| Reglas: `90, abc` | error «entero entre 0 y 99» | — |
| Reglas: `90, 92` guardado | `pes5_config/reglas.topesAtributo = [90, 92]` | — |
| Reglas: bloque de temporada | «Juego actual: PES5», «1.ª del juego: temporada 2 (T1)», «Tope vigente ahora: 90» | — |
| Editor (admin), Respuesta en 90 | `+` deshabilitado y aviso «Tope de temporada 90: este atributo ya está en 90 y no puede subir.» | igual |
| Consola | sin errores | sin errores |

Nota de prueba: en dist se repitió la prueba del editor (igual resultado). La
prueba de reglas se hizo en la fuente. La prueba de pedidos (aplicar un pedido
que supera el tope) no se hizo de punta a punta en el navegador: está cubierta
por `motivoRechazoMejora` en los tests.

Limitación de la prueba: el sandbox cargó 25 jugadores de un solo club, y solo
uno con un atributo en el tope (Respuesta 90). No hubo leyendas reales (>90) en
la UI, sí en los tests.

## Checks de cierre

- `node scripts/smoke-parity.mjs`: PARIDAD OK.
- `node scripts/audit-wiring.mjs`: rotos 0, fuera de gramática 0, duplicados 0,
  IDs 1, muertas 3 (ya estaban antes del cambio).
- `node scripts/csp.mjs --check`: firebase.json OK.
- `node --check` a los 3 archivos JS: OK.
- `graphify update .` dentro de `tsc-src/` y `graphify-label.py`: hechos.
- Sin `innerHTML` con datos de usuario nuevos (los textos son fijos o numéricos),
  sin emojis, sin handlers `data-on*` nuevos, sin reglas de Firestore tocadas,
  sin secretos.

## Hallazgo: temporadas en producción (solo lectura)

GET a `seasons` (REST público, sin escritura):

| docId | number | name | game | status | createdAt (UTC) |
|---|---|---|---|---|---|
| 2 | 1 | T3 | PES 4 | finished | 2026-07-18 |
| 3 | 2 | T1 | PES 5 | active | 2026-11-11 21:48 |

La temporada activa es la 2 «T1» (PES 5), creada el 11-11 a las 21:48 UTC. La
T3 se finalizó el mismo día a las 21:20 UTC. Eso confirma que Luis ya creó la
temporada nueva. Pero `STATE.season` en el sandbox queda en 1, así que la app
sigue apuntando a la temporada finalizada en algunos flujos. Por eso este
slice usa la temporada **activa** como referencia para el tope.

## Pendientes y decisiones a confirmar

- La referencia del tope es la temporada activa (no `STATE.season`). Si Jimbo
  prefiere `STATE.season`, es un cambio de una línea en
  `temporadaActualDelJuego`.
- Si `seasons` no se puede leer, la Tool y el editor quedan **sin tope** (falla
  abierta). Se registra un `console.warn`. Si se quiere falla cerrada, es un
  cambio aparte.
- El tope aplica también en el editor de admin y en la edición gratis (la regla
  es de reglamento, no de cobro).
- Slice A (archivo de T3) sigue bloqueado: depende de la orden del coordinador.
