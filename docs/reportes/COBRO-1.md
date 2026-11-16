# COBRO-1 · Temporada de cobro

Rama: `fix/temporada-de-cobro` (desde `origin/feat/tope-atributo-temporada` 2f2bb4b).
No mergeada a `main`. No se despliega nada, no se escribe en producción.

Nota de base: esta rama no incluye el archivo de la T3 (`tsc-src/data/temporadas/`), que
vive en `chore/archivo-t3` (f0b6c73). Para las pruebas se copió `1.json` e `index.json`
solo al sandbox (no commiteado aquí). Cuando se mergee A, el sandbox no necesita nada extra.

## Problema

Los movimientos de coins, el cobro de la Tool y el presupuesto de temporada usaban
`STATE.season` (la temporada seleccionada en la UI, guardada en localStorage). Con la
T3 seleccionada y archivada, el cobro iba a una temporada cerrada. Y la Tool escribía
el save antes de cobrar: si el cobro fallaba, la mejora quedaba escrita sin cobrar
(riesgo descrito en M-13).

## Cambios

### Helpers puros (`tsc-src/js/yunacoins-rules.js`)

- `temporadaDeCobro(seasons, stateSeason, archivadas)`: la activa no archivada si
  existe; si no, `stateSeason`.
- `validarTemporadaCobro(seasons, seasonNumber, archivadas)` → `{ok, motivo}`: ok solo
  si la temporada existe, está activa y no archivada. El motivo dice «no hay temporada
  activa;» cuando no hay ninguna activa.

### Uso (`coins.js`, `pes5-tool.js`, `mejoras-page.js`, `pes5-yunacoins.js`)

- `coins.js`: `_coinsTemporadaInfo()` y `_coinsTemporadaCobro()` (aviso si no se puede).
  Individual y masivo escriben `season: cob.n` (antes `STATE.season`). Reemplaza a
  `_coinsSeasonLocked`.
- `pes5-tool.js`: `_temporadaCobro()`. Lo usan `cobrarMejorasEquipo` (coins),
  `_refrescarGastoTemporadaEquipo` (GASTO_TEMPORADA_CACHE) y la clave de los topes
  extra (`pes5_config/topesExtra-<temporada>`).
- `mejoras-page.js`: `COBRO_TEMPORADA` (cargada al iniciar) para el presupuesto del
  presidente (`recalcularPresupuestoReal`) y el tope extra.
- `pes5-yunacoins.js` (Plan B de Loyalty): `temporadaCobro()` para leer y escribir
  los saldos de Loyalty. Si la temporada no admite movimientos, no escribe nada.

### Guardia previa en la Tool (cambio de orden)

- `_validarCobroAntesDeEscribir(log)`: refresca `YC_SEASONS` y valida la temporada de
  cobro. Si no es válida, avisa con toast y en el log, y **no escribe el save**.
- Se llama en `escribirAlSave` (si hay cobro > 0, antes de tocar el save) y en
  `aplicarPedidosSeleccionados` (si algún pedido aplicado tiene costo).
- Sin cobro (edición gratis o costo 0) no se pide temporada activa.

### UI: en qué temporada se cobra

- Modal de coins individual y masivo: «Se registra en T1 (temporada activa).» o, si no
  se puede, «No se puede mover YuNaCoins: <motivo>.» en rojo.
- Confirmación de escritura en la Tool: línea «Cobro en: T1 (temporada 2)».

## Tests (`node tools/test-yunacoins-rules.js`)

Todos pasan. Casos nuevos:

| Caso | Resultado |
|---|---|
| Hay activa (2) y la UI tiene 1 → cobra en 2 | OK |
| Sin lista de archivadas, la activa cuenta | OK |
| No hay activa → stateSeason | OK |
| Sin temporadas → stateSeason | OK |
| La activa está archivada → no cuenta (cae a stateSeason) | OK |
| Activa archivada y stateSeason también → stateSeason (la guardia lo rechaza) | OK |
| validar: activa no archivada → ok | OK |
| validar: T3 archivada → rechazada, motivo «archivada» | OK |
| validar: finalizada no archivada → rechazada, motivo «no está activa» | OK |
| validar: inexistente y activa archivada → rechazadas | OK |
| validar: sin activa, el motivo dice «no hay temporada activa» | OK |
| validar: con activa, el motivo no lo dice | OK |

Todos los `tools/test-*.js` pasan.

## Pruebas en el sandbox (fuente y dist)

Escenario: T3 (temporada 1) archivada y finalizada; T1 (temporada 2) activa; UI con
`STATE.season = 1`. Todo en el emulador (no producción). Cuenta de admin de prueba.

| Prueba | Fuente (`tsc-emu`) | Dist (`tsc-emu-dist`) |
|---|---|---|
| Cobro de temporada según el sandbox | 2 (T1) | 2 (T1) |
| Coins individual (+5000 y +100) va a la 2 | sí (`season: 2`) | sí (`season: 2`) |
| Modal de coins muestra «Se registra en T1 (temporada activa)» | sí | sí |
| Tool: save verificado y backup, cobro de 50 YC | sí, saldo 5000 → 4950 | sí, saldo 4950 → 4900 |
| Movimiento de la Tool en la 2 | `season: 2`, antes 5000 / después 4950 | `season: 2` |
| Gasto de temporada (helper sobre la 2 / la 1) | 50 / 0 | — |
| Sin temporada activa (season 2 → `finished`): Tool aborta | save idéntico, 0 escrituras nuevas, aviso «no hay temporada activa; la temporada T3 está archivada…» | igual, aviso «crea la temporada activa en Temporadas» |
| Sin temporada activa: coins no se mueve | sí, toast «No se mueven YuNaCoins: no hay temporada activa…» | — |

Consola sin errores en ambas variantes. Al final la temporada 2 se restauró a `active`.

Cómo se hizo el cobro de punta a punta: se vinculó el club de prueba (pes5ClubIdx 132
al equipo MALVINAS JUNIORS CA, id 1), se cargó el save de prueba del repo con un handle de
carpeta simulado en el navegador de prueba, se subió un jugador (+1 Ataque), se usó
«Guardar en la Tool» y «Aplicar cambios», y «Escribir al save». Loyalty estaba sin
sincronizar, así que el modal «Cobro con saldo viejo» pidió confirmación (casilla
«Cobrar igual») como lo haría el admin.

## A/B

- **Antes** (comportamiento previo, medido en M-13): con T3 seleccionada, la UI de coins
  bloqueaba el movimiento con «T3 finalizada», y la Tool escribía el save y luego
  fallaba al cobrar con `archived`.
- **Después** (este slice): coins y la Tool cobran en la 2; con la 2 finalizada, no se
  escribe nada.

No se volvió a correr la versión anterior en el navegador. El «antes» de arriba viene de
la prueba de M-13 y de la capa de datos, no de una captura nueva.

## Limitaciones y riesgos

- **Presupuesto en pantalla**: la Tool muestra «Queda del tope de la temporada 4.950 /
  50.000». El saldo es menor que el tope restante, así que la pantalla no aísla el gasto
  de la 2. El gasto se verificó con la misma función y los mismos registros de coins.
- **Cambio de `topesExtra`**: el tope extra por equipo ahora se lee de
  `topesExtra-<temporada de cobro>`. La temporada 2 no tiene topes extra cargados, así
  que arranca en 0 hasta que el admin lo cargue de nuevo. Es lo correcto (el premio es
  por temporada), pero hay que avisarlo.
- **Cobro parcial**: `cobrarMejorasEquipo` escribe un movimiento por jugador y después el
  saldo del equipo. Si falla a mitad, puede quedar un cobro parcial. Eso no cambió aquí.
  La guardia solo evita escribir el save cuando la temporada no admite cobros.
- **Loyalty**: el modal de saldo viejo sigue igual. Es una compuerta de negocio
  independiente de la temporada.
- **Sandbox**: se usó un handle de carpeta simulado y el save de prueba del repo. No se
  tocó ningún save real.

## Checks de cierre

- `node tools/test-yunacoins-rules.js`: TODO OK. Todos los `tools/test-*.js`: OK.
- `node --check` a los 5 JS modificados: OK.
- `node scripts/smoke-parity.mjs`: PARIDAD OK.
- `node scripts/audit-wiring.mjs`: rotos 0, fuera de gramática 0, duplicados 0, IDs 1,
  muertas 3 (ya estaban antes del cambio).
- `node scripts/csp.mjs --check`: OK.
- `graphify update .` dentro de `tsc-src/` y `graphify-label.py`: hechos.
- Sin `innerHTML` nuevo con datos de usuario (los textos nuevos son fijos o numéricos),
  sin emojis, sin handlers `data-on*` nuevos, sin reglas de Firestore tocadas, sin secretos.
