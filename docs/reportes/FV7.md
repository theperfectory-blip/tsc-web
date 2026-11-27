# FV7 · Flechas de ataque reales, flechas dentro de la cancha y tarjetas en una línea — 2026-11-26

Estado: **LISTO** en `feat/formacion-vivo`. Sin commits ni deploy. El puente
`http://127.0.0.1:8765` sigue corriendo con el código anterior: **hay que
reiniciarlo** para que sirva las flechas de `c2` (no lo reinicié yo). Para las
pruebas levanté una segunda instancia en `:8766` con el código nuevo y la apagué
al terminar.

## 1. Flechas de ataque: causa y mapeo final

La causa **no** era el giro ni el orden de los 8 bits: era la **copia**. El
minimapa de la pantalla de alineación dibuja la **copia de pantalla `c2`**
(`rec+981`, `c2+74`), mientras el puente leía el **bloque principal**
(`rec+147`). En el estado original de la tarea:

| Casilla | Principal (`rec+147`, lo que leía el puente) | `c2` (`rec+981`, lo que dibuja el minimapa) |
|---|---|---|
| 3 DD | ↖ + ↘ | ↑ + ↓ |
| 4 DI | ↓ | ↑ |
| 5 CC | ↗ + ↙ | ↑ + ↓ |
| 6 CC | (nada) | ↑ |
| 7 CDR | ← | ↑ |
| 8 CIZ | ↖ | ↑ + ↗ |
| 9 DC | ↑ + ↗ | ↑ |
| 10 DC | ↗ | ↑ + ↗ |

`c2` coincide exactamente con la columna «debería ser (cruz)» de la tarea y con
la captura del minimapa (`fv7_cfg2.png`, `juego_previa.png`). La prueba está en
el volcado de la sesión anterior (`tareas/FV7.log`): con el minimapa mostrando
la tabla de FV7, `c2` daba `3:2,6 · 4:2 · 5:2,6 · 6:2 · 7:2 · 8:2,3 · 9:2 ·
10:2,3` y el principal daba `3:1,5 · 4:6 · 5:3,7 · 7:0 · 8:1 · 9:2,3 · 10:3`.

Además encontré y corregí un **offset**: la copia `c3` de las flechas está en
`rec+4240` (`c3+140`, con `c3 = rec+0x1004 = rec+4100`), no en `rec+4244`. Con
4244 se leía la misma tira desplazada 4 bytes (`fv7_findpat.py` la localiza en
`0x3957fee = local+4240`).

### Mapeo final

- Las 8 direcciones siguen en el orden documentado
  `← ↖ ↑ ↗ → ↘ ↓ ↙` (`FLECHAS`); no cambió ningún bit.
- **Lectura:** `leer_equipo()` expone `campos.flechasAtaquePantalla` leído de
  `c2` (11 grupos de 8). El puente usa esa copia para `slots[i].flechas`;
  `flechasAtaque` queda como el principal para diagnóstico.
- **Escritura:** `campo` con `flechasAtaque` del bloque principal escribe el
  byte en el principal, en `c2` y en `c3` cuando `rec+4138 == 0` (bloque
  principal mostrado). `variante` borra las flechas de los 10 jugadores de
  campo en las tres copias. La web (`formacion-vivo.js`) conserva la conversión
  cruz → cancha de FV6 (`vectorCancha`), que ya era correcta.

### Comprobación visual

- `docs/reportes/FV7/comparacion_ataque.png`: arriba el minimapa del juego,
  abajo la capa **Ataque** de la web (local, 4-4-2). Coinciden los 8 jugadores
  con flechas (el PT y los dos CT sin flechas).
- `web_ataque_horizontal.jpg` (escritorio, 1060 px) y
  `web_ataque_vertical.jpg` / `web_ataque_370.jpg` (370 px): las 12 flechas
  esperadas (`→←`, `→`, `→←`, `→`, `→`, `→↘`, `→`, `→↘`).
- El visitante también se leyó de su `c2` (mismo patrón en el partido actual).

## 2. Flechas que se salen de la cancha

- `flechaHTML()` pasa el ángulo y el largo por variables CSS
  (`--fv-ang`, `--fv-len`, `--fv-in`); el CSS dibuja la flecha fuera como antes.
- `ajustarFlechas(host)` mide **después de montar** el HTML, con el tamaño real
  del campo y sus márgenes (1,7 % / 3,8 %, intercambiados en vertical). Si la
  flecha se saldría del rectángulo útil, le pone `.dentro` al `span` y el CSS la
  dibuja **centrada en el círculo del jugador**, más chica y con la misma
  dirección y color (`scale(var(--fv-in))`; 0,38 para la flecha larga de
  actitud defensiva, 0,6 para la de ataque).
- Se vuelve a medir en cada `pintar()` (incluido el `resize`) y en cada
  `pointermove` del arrastre: `moverOverlay(casilla, x, y)` mueve también las
  capas de ese jugador y recalcula `dentro`.
- Verificado en el DOM: a 370 px el arquero (flecha defensiva hacia atrás) y el
  delantero pegado a la línea de ataque quedan con `.dentro = true`; en
  escritorio no se activa. El screenshot `web_ataque_370.jpg` lo muestra.

## 3. Tarjetas de la lista (Titulares / Banca / Reservas)

- La fila pasa a **una sola línea**: `flecha de condición · nombre · posición`.
  Se quitó el `ep-form-num` (la barra de color de la línea) y la resistencia ya
  no ocupa una celda: va como **línea fina absoluta al pie** de la tarjeta, así
  la fila sigue siendo de una línea.
- Selector con especificidad suficiente para ganarle a
  `mejoras-cambio.css` (`.ep-form-bench .ep-form-subbtn` imponía
  `44px/1fr/44px/auto`): `.fv-root .fv-bench .ep-form-subbtn.fv-fila` con
  `24px minmax(0,1fr) 36px auto`, `min-height: 34px`, `gap: 6px` y padding
  compacto. En móvil (≤600 px): `22px ... 32px auto`, `min-height: 34px`.
- Nombre con `white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  min-width:0`; condición y posición centradas verticalmente. Sin colores
  nuevos: usa las variables de tema claro/oscuro.
- Verificado a 370 px: tarjeta de 344 px, 34 px de alto, `scrollWidth ==
  clientWidth` (sin desbordes), nombre con `ellipsis`; a 1060 px, 34 px y la
  misma línea.

## Archivos tocados

- `tools/pes5/pes5_vivo.py`: constantes `REL_FLECHAS_PANTALLA` (981),
  `REL_FLECHAS_SELECCION` (4240) y `REL_BLOQUE_SELECCION` (4138); lectura de
  `flechasAtaquePantalla`; espejo de escritura en `campo` y borrado en
  `variante`.
- `tools/pes5/live-bridge.py`: `_slots` usa `flechasAtaquePantalla` (con
  respaldo al principal).
- `tools/pes5/test_pes5_vivo.py`, `tools/pes5/test_live_bridge.py`: helpers
  siembran `c2`/`c3`; tests nuevos de la copia de pantalla y del espejo de
  escritura.
- `tsc-src/js/formacion-vivo.js`: `flechaHTML` con variables CSS,
  `ajustarFlechas`, `moverOverlay`, `data-slot` en las capas, fila de una línea,
  `staminaHTML` al pie.
- `tsc-src/css/formacion-vivo.css`: `.dentro`, rejilla de la fila, resistencia
  al pie, adaptación a 600 px.
- `docs/pes5/CONTROL_VIVO.md`, `docs/pes5/MAPA_ALINEACION_VIVO.md` y
  `docs/pes5/mapa-vivo/COPIAS.md`: sección de la copia de pantalla, offset 4240
  y espejo de escritura.

## Comprobaciones

- `node --check tsc-src/js/formacion-vivo.js`: **OK**.
- `python -m unittest test_pes5_vivo test_live_bridge`: **117 tests OK**
  (`pytest` no está instalado en el equipo).
- `node scripts/audit-wiring.mjs`: **rotos 0**; `docs/reportes/MS-2.3-cableado.md`
  restaurado a `HEAD` después del audit.
- `node scripts/build-web.mjs` + `node scripts/smoke-parity.mjs`:
  **PARIDAD: OK**.
- `node scripts/csp.mjs --check`: **firebase.json OK**.

## Notas y pendientes

- **Reiniciar el puente `:8765`** para que cargue `pes5_vivo.py` y
  `live-bridge.py` nuevos. El `:8766` de prueba ya está apagado.
- El partido cambió durante la sesión anterior: ahora es **JRY (local) vs CAC
  (visitante)** en la previa. El juego quedó en el menú **«Local»** (previa).
  El patrón de flechas del partido es el mismo de la tabla de FV7; el `c2`/`c3`
  se dejaron con ese patrón, pero el juego puede resincronizarlos desde el
  principal al abrir/cerrar menús (es su copia de pantalla). La web lee `c2` en
  cada `/leer`, así que refleja lo que el minimapa está usando en ese momento.
- El minimapa es un búfer de pantalla: si el coordinador lo ve vacío tras
  navegar menús, se repinta al abrir la alineación de nuevo. No se tocó
  «Almacenar» ni ningún save.
- El experimento con la cruz del jugador no llegó a alternar una flecha (la
  cruz cierra con ✕ y el listado cambia de jugador con R1); no se dejó ningún
  byte cambiado por ese camino. Todo lo que se escribió para probar se restauró
  con `try/finally` en el mismo script.

## CONTINUAR 2: comprobaciones en el juego (26-11, 23:25)

El coordinador relanzó la tarea para confirmar en el juego qué bloque usa el
minimapa y terminar el cambio de `c3`. Resultado de la sesión:

- **El minimapa dibuja `c2` y `c3` (4240), no el principal.** Con la pantalla
  mostrando el patrón de la tabla, un escaneo de las 596 regiones comprometidas
  del proceso encontró ese patrón de 88 bytes exactamente en `visitante+981`
  (`c2`) y `visitante+4240` (`c3`); en ningún otro sitio (ni como 11×8, ni como
  bitmask de 11 bytes). El principal y la copia del save siguen con el otro
  patrón.
- **La cruz de Config. individual escribe las copias de pantalla.** Al pulsar
  una flecha en la cruz con el ratón, el juego reescribió `c2` y `c3` del equipo
  activo con el patrón mostrado y dejó el principal intacto: es una escritura de
  previsualización, coherente con que `c2`/`c3` sean las copias que dibuja.
- **El juego resincroniza `c2`/`c3` desde el principal al abrir y cerrar menús.**
  Por eso el puente lee `c2` en cada `/leer` (lo que la pantalla tiene en ese
  momento) y `campo` escribe principal + `c2` + `c3` (esta última solo con
  `rec+4138 == 0`, el bloque principal mostrado). Si el minimapa se ve vacío
  tras navegar, se repinta al volver a abrir la alineación.
- **`c3` está en `rec+4240`.** Leer `rec+4244` da la misma tira desplazada 4
  bytes; por eso el `c3` anterior parecía otro patrón. Corregido en
  `pes5_vivo.py`, los tests y la documentación.
- **Estado del juego dejado igual que al empezar:** JRY 4-1-2-3 restaurado
  (era CAC 4-4-2 tras una prueba de menú), `c2`/`c3` de los dos equipos iguales
  a su principal en la previa, y la pantalla en el menú «Local». No se tocó
  «Almacenar» ni ningún save. Todos los experimentos de memoria se hicieron con
  `try/finally` en el mismo script. Capturas del estado final (`fv7_u1.png`,
  `fv7_u2.png`, `fv7_u2_local_10x.png`, `fv7_final_game.png`) y la comprobación
  de que los 11 slots de los dos equipos volvieron a `leer_fv7_now.json`.

Comprobaciones repetidas tras estos cambios: `node --check` OK, 98 tests de
`test_pes5_vivo` + 19 de `test_live_bridge` (117) OK, `audit-wiring` rotos 0
(`MS-2.3-cableado.md` restaurado a `HEAD`), `build-web` + `smoke-parity`
PARIDAD: OK, `csp.mjs --check` OK.

## Salida

`LISTO FV7: el minimapa dibuja la copia de pantalla c2 (rec+981) y el puente leía el principal (rec+147); se lee c2, se espeja la escritura en c2/c3 (c3 en 4240) y se mantiene el orden ← ↖ ↑ ↗ → ↘ ↓ ↙. Archivos: pes5_vivo.py, live-bridge.py, test_pes5_vivo.py, test_live_bridge.py, formacion-vivo.js, formacion-vivo.css, CONTROL_VIVO.md, MAPA_ALINEACION_VIVO.md. Hay que reiniciar el puente :8765. Comprobaciones: node --check OK, 117 tests OK, audit rotos 0, PARIDAD OK, CSP OK.`
