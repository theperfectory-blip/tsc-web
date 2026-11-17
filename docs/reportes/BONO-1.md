# BONO-1 · Bono de suscriptores proporcional

## Modelo
- **Bono del equipo** = regla `budgetSubscribers` (por jugador suscriptor) × cantidad de jugadores suscriptores del equipo.
- Suscriptor = el que tiene `$` delante del nombre, igual que `subscriber` (en el presidente, de la plantilla publicada; en la Tool, del save).
- Ejemplo: regla 10.000 → 1 suscriptor = 10.000; 4 suscriptores = 40.000.
- Es responsivo: no se guarda nada nuevo. Cada cálculo usa el conteo actual.

## Función pura
`YUNACOINS_RULES.bonoEquipo(rules, nSuscriptores)` en `tsc-src/js/yunacoins-rules.js`. La usan:
- `techoPresupuesto(wallet, rules, nSuscriptores)`: el bono del pool.
- `topesRestantes(gastado, rules, nSuscriptores)`: lo que queda del bono = bono del equipo − lo gastado en la temporada (nunca negativo).
- `resumenPresupuesto({ …, nSuscriptores })`: el aviso grande.

Sin conteo (`undefined`) vale 0: quien llama tiene que pasarlo. Así un llamado que se olvide del conteo se nota en vez de dar un bono fijo viejo.

## Dónde se cuenta
- **Mejoras (presidente y modo admin embebido):** `_nSuscriptoresPlantel()` = `PLAYERS.filter(p => p.subscriber).length`. Se usa en `recalcularPresupuestoReal` y en `resumenAviso`.
  - Corrección incluida: `recalcularPresupuestoReal` corría antes de cargar la plantilla (el conteo aún era 0). Ahora se vuelve a calcular justo después de `cargarPlantillaReal`.
- **Tool (cobro y aviso):** `_nSuscriptoresDelEquipo(teamId)` cuenta en el save los nombres con `$` del roster del club (`pes5-editor`). `_restantesTemporada()` lo usa, así que cobro, reparto, bono restante y aviso salen del mismo número.

## Usos revisados (los que leían `budgetSubscribers` directo)
- `yunacoins-rules.js`: `techoPresupuesto`, `topesRestantes`, `resumenPresupuesto` (ahora por conteo). La definición de la regla, su normalización y la lista de campos no cambian.
- `mejoras-page.js`: `topesRestantes` (saldo del bono), `techoPresupuesto` (placeholder en 0 hasta recalcular), `resumenAviso` (pasa el conteo).
- `pes5-tool.js`: `_restantesTemporada` (cobro y reparto), el caso de «edición gratis» (regla con bono 0, sin cambios), el campo del formulario de Reglas.
- `distribuirCosto` no cambia: recibe lo que queda del bono.

## Reglas (Firestore)
- No hay cambio en `firebase/firestore.rules`. Las reglas no validan `fromSub` contra `budgetSubscribers`: la lista de pedidos solo deja `fromSub` como campo, y en «emparejar» exige `fromSub == 0`.
- El cobro valida contra `topesRestantes` en JS (ya responsivo). No hay chequeo en `functions/`.

## Etiqueta de Reglas
«Bono suscriptores» → **«Bono por jugador suscriptor»**, con el hint «se multiplica por los suscriptores del equipo» (`pes5-tool.js`, estilo en `pes5-tool.css`).

## Compatibilidad de los topes ya gastados
El gasto de la temporada sigue en el libro `coins`; no se reescribe. Cambiar el conteo solo cambia cuánto queda:
- 6.000 gastados, 1 suscriptor (10.000) → quedan 4.000; con 4 suscriptores → quedan 34.000; con 0 → 0.
- 25.000 gastados y bono nuevo de 10.000 → 0 (nunca negativo).

## Pruebas
- `tools/test-yunacoins-rules.js`: sección BONO-1 con 0, 1 y 4 suscriptores (bono, techo, resumen, topes gastados, cobro). TODO OK.
- Los tests existentes que usaban el bono fijo (`test-aviso-presupuesto.js`, `test-topes-extra.js`, `test-yunacoins-core.js`, `test-yunacoins-rules.js`) ahora pasan `1` suscriptor: mismos valores esperados (25.000 × 1).
- `node --test` de los tres suites de presupuesto: 47/47.
- `npm test`: 92 pasan; 1 falla, `test-jugador-completo.js` («Berbatov encontrado en el save»), previo y ajeno a este slice (depende del save real).
- Sandbox (emulador): plantilla de prueba con 5 suscriptores y regla 25.000 → Mejoras muestra «Bono suscriptores» 125.000. Fixture borrado después.
- No probado en navegador: el cobro y el bono restante de la Tool (necesita la carpeta del save).

## Pendiente de decisión (Jimbo)
- **El valor de la regla cambia de significado.** Antes 25.000 era el bono total del equipo; ahora es por suscriptor. Un equipo con 5 suscriptores pasa de 25.000 a 125.000 si no se ajusta la regla. Revisar el valor en Reglas antes de la próxima temporada.
- Si un suscriptor se renombra a mitad de temporada, el bono restante cambia (es el comportamiento pedido).
