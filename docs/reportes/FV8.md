# FV8 · DLI / DLD (carrileros): solo por formación, nunca por arrastre — 2026-11-27

Estado: **LISTO** en `feat/formacion-vivo`. Sin commits ni deploy. El puente
`http://127.0.0.1:8765` sigue corriendo: **hay que reiniciarlo** para que cargue
`pes5_vivo.py` con la lectura de `bandas` y el control de familia (no lo
reinicié yo, como pide la tarea).

Al retomar, PES5 ya **no estaba abierto** (`GET /estado` → `juego: false`), así
que no se hicieron pruebas nuevas de escritura en el juego: se trabajó con las
capturas y lecturas de la sesión anterior, que quedaron en
[`docs/reportes/FV8/`](FV8/). El final del reporte dice qué quedó sin probar.

## 1. Qué hace el juego con DLI / DLD (comprobado)

DLI y DLD (códigos **15** y **16** de `pes5-live-map.json`) son **mediocampo por
banda**: carrileros. El juego los dibuja con el color del medio (verde), y para
los topes y mínimos cuentan como medios, no como defensa.

Lo comprobado en la pantalla de alineación (previa, equipo local), con lecturas
del bloque principal (`rec+112..143`):

| Momento | Profundidad | Códigos de posición | Qué se ve |
|---|---|---|---|
| Alineación de partida (la que había) | `1 8 8 8 8 18 25 26 40 40 47` | `0 7 1 9 8 12 28 24 35 31 38` | sin DLI/DLD |
| Tras aplicar **3-4-3 A-1** | `1 9 9 9 18 24 24 32 43 43 43` | `0 7 3 1 12 **16 15** 26 30 29 38` | DLD y DLI en la línea del medio (prof 24) |
| **Editar posición** del DLI (cruza la mitad) | `1 9 9 9 18 24 **30** 32 43 43 43` | `0 7 3 1 12 16 **15** 26 30 29 38` | **sigue DLI**: mover no cambia el código |
| «Selec. posición» del DLI → CC | igual | `… 16 **19** 26 …` | el DLI pasa a CC (19) |
| «Selec. posición» de nuevo → DLI | igual | `… 16 **15** 26 …` | vuelve a DLI (15) |
| Restaurado | igual | `0 7 3 1 12 16 15 26 30 29 38` | DLD y DLI otra vez |

Lecturas completas en [`FV8/lecturas.json`](FV8/lecturas.json); capturas
`FV8/juego_343_dli_dld.png` (la formación en el juego, DLD/DLI en verde) y
`FV8/juego_dli_en_lista.png` (la lista de titulares con un jugador en DLI).

### Cómo se guarda en memoria cuál de las dos permite la formación

**No hay un byte de «variante base» ni una bandera de familia.** La familia se
lee de los **códigos de posición** de los 11 titulares (`rec+133..143` del
bloque principal), que es lo que escribe la variante del menú «Cambio» y lo que
cambia «Selec. posición». La prueba de que la formación decide:

- en el catálogo [`tools/pes5/pes5-variantes.json`](../../tools/pes5/pes5-variantes.json),
  las 100 variantes ponen **CIZ/CDR en profundidad 29–31** (de la mitad hacia
  adelante) y **DLI/DLD en profundidad 24** (sobre la línea del medio);
- tras aplicar 3-4-3 A-1 en el juego los códigos quedaron en 15/16 y
  `leer_equipo()` los resume en `bandas: {izq: "dl", der: "dl"}`; una variante
  que trae CIZ/CDR (por ejemplo 4-4-2 A-1, que el catálogo pone en 22/23) da
  `{izq: "ci", der: "ci"}`.

Así la web y el puente lo **leen del juego** en vez de adivinarlo.

### El selector del juego

En las capturas `FV8/selector_dli_ci.png` y `FV8/selector_dld_cdr.png`, para un
jugador de la banda izquierda salen en **gris** DLD y CDR (la banda contraria) y
en **negrita** DLI y CIZ; para uno de la derecha, al revés. Es decir, el gris
del juego marca la **banda**, y en la banda propia la lista muestra en negrita
**las dos familias**. En `FV8/juego_dli_en_lista.png` se ve a Messirve con DLI
en la lista de titulares.

Jimbo pidió una sola familia por banda, la de la formación base. Eso es lo que
se implementó: es **más estricto** que el selector del juego y deja la
alineación siempre dentro de la formación de partida. Queda anotado en
`CONTROL_VIVO.md` por si el coordinador quiere revisarlo.

## 2. Web

`tsc-src/js/mejoras-page.js` (lo comparten el editor y la Formación en vivo):

- **Color de mediocampo:** `PITCH_POS_LINEA` pasa DLI/DLD a `mid` (antes eran
  defensa), y `PITCH_POS_ZONAS`/`PITCH_POS_SOLO_FORMACION` los declaran en la
  franja del medio pero **fuera** de la asignación por geometría (no se ponen
  por arrastrar: los pone la formación o el selector).
- **Familia leída de la formación:** `modoBandas(draft)` devuelve `{izq, der}`
  con `"ci"` o `"dl"`; una banda sin medio de banda declarado (o con las dos)
  vale `"ci"` (CIZ/CDR), igual que `modo_bandas` del puente. `bandasBaseDe` /
  `fijarBandasBase` guardan la familia de **partida** en la lista de casillas
  (`bandasBase`): el selector no la cambia al pasar un medio a otra posición;
  solo se recalcula al aplicar una variante o al leer de nuevo el juego.
- **Selector:** en el medio se ofrecen las dos siglas de banda del lado
  (CIZ/DLI a la izquierda, CDR/DLD a la derecha); la que no corresponde a la
  formación sale **deshabilitada** con `(no en esta formación)` y la otra con
  `(ocupada)` si no hay cupo. Las demás posiciones del bloque se mantienen.
  `puedeAsignarEn` y `setFormationPos` vuelven a comprobar la familia.
- **Arrastre:** `posicionAlMover` conserva la sigla de banda dentro del
  mediocampo (un DLI no se convierte en CIZ al cruzar la mitad), como el juego;
  al entrar al mediocampo desde otra franja pone la familia de la formación.
  Al cruzar a otra franja (defensa o ataque) manda la geometría, que es la
  regla que ya tenía la web para el resto de posiciones. `ajustarPosicionAlMover`
  usa esa función y, si no vale, la primera opción disponible.
- **Validación:** DLI/DLD cuentan como medios en mínimos y topes
  (`PITCH_LINEA_MAX`/`MIN`), y `validarFormacion` rechaza que convivan CIZ y
  DLI (o CDR y DLD) en la misma banda.
- **Editor clásico:** la lista de la formación colorea la sigla con
  `ep-line-mid` (ya usaba `PITCH_POS_LINEA`) y el selector es el mismo.

`tsc-src/js/formacion-vivo.js` (panel En vivo):

- `SIGLA_LINEA` pasa DLI/DLD a `mid` (lista, capa «Posición» y etiqueta del
  jugador seleccionado).
- El selector usa `opcionesPosicion` (ya devuelve las opciones con `motivo`) y
  muestra `(no en esta formación)`.
- `moverACasilla` usa `posicionAlMover` y, si la posición no se puede asignar,
  la primera opción disponible del selector (antes caía a `posicionEn`).
- `fvSelPos` explica el rechazo por familia: «Esta formación usa DLI/DLD en esa
  banda: CIZ no se puede elegir».

`tsc-src/css/formacion-vivo.css`: clases `l-def` / `l-mid` / `l-att` para la
sigla de la capa «Posición» y la etiqueta del jugador (usan `--linea-*`, con su
valor de tema claro y oscuro). DLI/DLD salen en verde de mediocampo, no en azul
de defensa.

`tsc-src/js/pes5-editor.js`: `POS_CODIGO` / `POS_POR_CODIGO` incluyen **15 DLI** y
**16 DLD**. Sin esto, una formación publicada que los trajera se leía sin
posición (el código 15 no estaba en la tabla).

## 3. Puente y `pes5_vivo.py`

- `familias_banda(mem, rec, bloque)` lee los sets de familias por banda de los
  códigos de posición; `modo_bandas` resume `{izq, der}` (`"dl"` o `"ci"`; una
  banda sin familia declarada, o con las dos, vale `"ci"`).
- `leer_equipo()` devuelve **`bandas`** y `live-bridge.py` lo pasa en cada
  `EQUIPO` de `GET /leer`.
- `mover` y `campo` con `posicion` de banda (15/16/22/23) **rechazan** la
  familia que la formación no usa («la formación usa CIZ/CDR en la banda izq:
  DLI solo lo pone la variante»); si la banda no declara medio, solo pasan
  CIZ/CDR. Antes se podía escribir 15/16 a mano en cualquier sitio.
- `variante` no cambia: es la única operación que escribe la familia, como el
  menú «Cambio» del juego.

## 4. Documentación y tests

- `docs/pes5/CONTROL_VIVO.md`: sección «Medio por banda: CIZ/CDR y DLI/DLD
  (FV8)», `bandas` en el contrato de `EQUIPO`, notas en `mover`, `campo` y
  `variante`, decisión 19 y pendientes.
- `docs/pes5/MAPA_ALINEACION_VIVO.md`: sección «Familia de medio por banda
  (FV8)», DLI/DLD como medio en la tabla de códigos y «Editar posición» / «Selec.
  posición» corregidos (la primera nunca escribe el código).
- `tareas/API_PUENTE.md`: `bandas` en `EQUIPO` y la restricción de familia en
  `mover` / `variante`.
- `tools/pes5/test_pes5_vivo.py`: tests de bandas, conservación al mover,
  rechazo de la otra familia por `mover` y `campo`, banda sin medio (vale
  CIZ/CDR: DLI rechazado y CIZ permitido), banda con las dos familias y
  recálculo con `variante`.
- `tools/pes5/test_live_bridge.py`: `/leer` informa `bandas` (dl, ci, banda
  sin medio y banda con las dos → `ci`).

## 5. Comprobaciones

- `node --check tsc-src/js/formacion-vivo.js`, `mejoras-page.js` y
  `pes5-editor.js`: **OK**.
- `python -m pytest tools/pes5`: **129 passed, 24 subtests** (109 de
  `test_pes5_vivo` + 20 de `test_live_bridge`). `pytest` no estaba instalado; se
  instaló con `pip` para correr el comando de la tarea.
- `node scripts/audit-wiring.mjs`: **rotos 0**; `docs/reportes/MS-2.3-cableado.md`
  restaurado a `HEAD` después del audit.
- `node scripts/build-web.mjs` + `node scripts/smoke-parity.mjs`: **PARIDAD:
  OK**.
- Harness de la web (`docs/reportes/FV8/fv8-flujo.html`, Chrome headless):
  **TODO OK** — 39 comprobaciones: bandas leídas del equipo, del rival, banda
  con las dos familias y banda sin medio (las dos valen `ci`, DLI
  deshabilitada), selector con DLI habilitada y CIZ deshabilitada (en la
  Formación en vivo y en el selector compartido del editor), arrastre que
  conserva DLI al cruzar la mitad, MP→DLI/DLD según la banda, validación de
  convivencia, color de medio en lista y cancha, DLI pasado a CC con el
  selector (DLI sigue habilitada y CIZ sigue en gris), rechazo de CIZ con aviso
  y sin pedido, y recálculo al aplicar 4-4-2 (CIZ habilitada, DLI
  deshabilitada). Captura:
  [`FV8/web_formacion_dli.png`](FV8/web_formacion_dli.png) y
  [`FV8/web_escritorio.png`](FV8/web_escritorio.png).

## 6. Notas y pendientes

- **Reiniciar el puente `:8765`.** El proceso que corre ahora no tiene
  `familias_banda` ni `bandas`.
- **Sin probar en el juego** (estaba cerrado al retomar): escribir `mover` /
  `campo` con DLI/DLD **por el puente** y ver que el juego dibuja el carrilero
  al reanudar. La lectura y la conservación al mover sí están comprobadas en el
  juego.
- **Selector del juego vs regla de Jimbo:** el juego deja elegir las dos
  familias de la misma banda; la web aplica una sola (la de la formación base).
  Queda anotado en `CONTROL_VIVO.md` por si hay que aflojarlo.
- El juego se cerró en la sesión anterior; no se tocó «Almacenar» ni ningún
  save. Las capturas muestran el estado en el que quedó la previa.
- **`tsc-src/js/pes5-tool.js` no se tocó** (no está en los archivos de la
  tarea): tiene su propia copia de la validación de la formación
  (`LINEA`, lista de bandas) **sin DLI/DLD**. Con el catálogo actual no rechaza
  ninguna variante (el mediocampo declarado nunca baja de 2), pero conviene
  agregarlos y la regla de convivencia por banda para que el Tool valide igual
  que el editor. Se deja anotado para el coordinador.

## 7. CONTINUAR 3 (27-11): banda sin familia y familia de partida

Corrección pedida por el coordinador: cuando una banda no tenía medio de banda
declarado, `modoBandas` / `modo_bandas` devolvía `null` y se podían elegir las
dos familias. La regla de Jimbo dice que DLI/DLD solo existen si la formación
de partida los traía.

1. **Sin familia declarada vale `ci`.** `modoBandas` (web) y `modo_bandas`
   (puente) devuelven `"ci"` si la banda no declara ningún medio de banda, o si
   declara las dos. DLI/DLD quedan deshabilitadas salvo que la formación de
   partida los traiga.
2. **La familia de partida se recuerda.** La web guarda `bandasBase` por banda
   en la lista de casillas al leer del juego (`modeloDe`, con `eq.bandas` o las
   posiciones) y al aplicar una variante (`aplicarVariante`, que también la
   restaura al deshacer). Un DLI pasado a CC con el selector sigue pudiendo
   volver a DLI y CIZ sigue en gris; solo se recalcula con otra variante o con
   una lectura nueva del juego. El editor clásico la fija al abrir o restablecer
   la formación.
3. **Puente:** `_comprobar_familia_banda` usa `modo_bandas`, así que `mover` y
   `campo` rechazan el código 15/16 en una banda sin familia declarada
   («solo lo pone la variante») y aceptan CIZ/CDR. `variante` sigue pudiendo
   escribir cualquiera.
4. **Tests:** `test_pes5_vivo.py` cubre banda sin medio (DLI rechazado por
   `mover` y por `campo`, CIZ permitido) y banda con las dos familias; el
   harness cubre banda sin medio y DLI→CC. `test_live_bridge.py` cubre las
   cuatro lecturas de `bandas`.
5. El harness salió de `tsc-src/`: ahora es
   `docs/reportes/FV8/fv8-flujo.html` (en `tsc-src` no va nada que no se cargue
   en ejecución).

## Archivos tocados

- `tools/pes5/pes5_vivo.py`, `tools/pes5/live-bridge.py`
- `tools/pes5/test_pes5_vivo.py`, `tools/pes5/test_live_bridge.py`
- `tsc-src/js/mejoras-page.js`, `tsc-src/js/formacion-vivo.js`,
  `tsc-src/js/pes5-editor.js`, `tsc-src/css/formacion-vivo.css`
- `docs/pes5/CONTROL_VIVO.md`, `docs/pes5/MAPA_ALINEACION_VIVO.md`,
  `tareas/API_PUENTE.md`
- `docs/reportes/FV8.md` y `docs/reportes/FV8/` (capturas, lecturas y
  `fv8-flujo.html`)

## Salida

`LISTO FV8: el juego no cambia la sigla al mover (un DLI sigue en 15 aun cruzando la mitad) y la familia de medio por banda no tiene byte propio: se lee de los códigos de posición de los 11, que es lo que escribe la variante (CIZ/CDR prof 29-31, DLI/DLD prof 24). Sin familia declarada en una banda vale CIZ/CDR: DLI/DLD solo si la formación de partida los traía. En la web, DLI/DLD son mediocampo (verde), el selector deshabilita la familia que la formación no usa y recuerda la de partida (un DLI pasado a CC sigue pudiendo volver a DLI), el arrastre conserva la sigla, la validación cuenta medios y rechaza la convivencia por banda; el puente informa `bandas` siempre como dl/ci y rechaza escribir DLI/DLD con mover/campo cuando la banda no los declara. Comprobaciones: node --check OK, 129 tests OK, audit rotos 0, PARIDAD OK, harness de la web TODO OK. Hay que reiniciar el puente :8765.`
