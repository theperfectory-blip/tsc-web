'use strict';
/* Tests de BONO-5 — bono de suscriptor POR JUGADOR (cada «$» tiene su propio
   bono de 10.000 por temporada y solo se puede gastar en ese jugador).
   Funciones puras de `tsc-src/js/yunacoins-rules.js`:
   `bonoRestanteJugador`, `gastoBonoJugador` y `distribuirCosto`.
   Fixtures inventados: nada de datos reales.
   Correr: node --test tools/test-bono5.js  (o `node tools/test-bono5.js`) */
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../tsc-src/js/yunacoins-rules.js');

// Reglas de la temporada tal como las tiene Luis hoy (pes5_config/reglas).
const REGLAS = { budgetGeneral: 120000, budgetSubscribers: 10000 };
const POR_JUGADOR = REGLAS.budgetSubscribers;

// Movimiento del libro `coins` de una mejora de UN jugador.
function cobro(playerId, fromSub, fromGeneral) {
  return {
    reason: 'mejora PES5 (admin)',
    mode: 'sub',
    pes5: { playerId: playerId, fromSub: fromSub, fromGeneral: fromGeneral },
  };
}
// Reembolso (devuelve parte del bono y del general).
function reembolso(playerId, fromSub, fromGeneral) {
  return {
    reason: 'mejora PES5 reembolso',
    mode: 'add',
    pes5: { playerId: playerId, fromSub: fromSub, fromGeneral: fromGeneral, reembolso: true },
  };
}

test('BONO-5 · caso obligatorio: A gastó 6.000 de su bono → queda 4.000', () => {
  const tx = [cobro(101, 6000, 0)];
  assert.equal(R.bonoRestanteJugador(tx, [], 101, POR_JUGADOR, true), 4000);
});

test('BONO-5 · caso obligatorio: mejora de 7.000 en A → 4.000 del bono y 3.000 del general', () => {
  const tx = [cobro(101, 6000, 0)];
  const restante = R.bonoRestanteJugador(tx, [], 101, POR_JUGADOR, true);
  assert.deepEqual(R.distribuirCosto(7000, restante, true), { fromSub: 4000, fromGeneral: 3000 });
});

test('BONO-5 · caso obligatorio: B tiene sus 10.000 aunque A ya haya gastado 6.000', () => {
  const tx = [cobro(101, 6000, 0)];
  assert.equal(R.bonoRestanteJugador(tx, [], 101, POR_JUGADOR, true), 4000);
  assert.equal(R.bonoRestanteJugador(tx, [], 102, POR_JUGADOR, true), 10000);
  assert.deepEqual(R.distribuirCosto(12000, R.bonoRestanteJugador(tx, [], 102, POR_JUGADOR, true), true),
    { fromSub: 10000, fromGeneral: 2000 });
});

test('BONO-5 · caso obligatorio: jugador sin «$» → bono 0, todo sale del general', () => {
  assert.equal(R.bonoRestanteJugador([], [], 103, POR_JUGADOR, false), 0);
  // Aunque tenga movimientos a su nombre, sin «$» no tiene bono.
  assert.equal(R.bonoRestanteJugador([cobro(103, 5000, 0)], [], 103, POR_JUGADOR, false), 0);
  assert.deepEqual(R.distribuirCosto(7000, 0, false), { fromSub: 0, fromGeneral: 7000 });
});

test('BONO-5 · caso obligatorio: reembolso de −2.000 en el bono de A le devuelve 2.000', () => {
  const tx = [cobro(101, 6000, 0), reembolso(101, -2000, 0)];
  assert.equal(R.gastoBonoJugador(tx, [], 101), 4000);
  assert.equal(R.bonoRestanteJugador(tx, [], 101, POR_JUGADOR, true), 6000);
});

test('BONO-5 · caso obligatorio: los pedidos pendientes cuentan como bono usado', () => {
  const tx = [cobro(101, 3000, 0)];
  const pendientes = [{ playerId: 101, fromSub: 2000, fromGeneral: 500, totalCost: 2500, estado: 'pendiente' }];
  assert.equal(R.gastoBonoJugador(tx, pendientes, 101), 5000);
  assert.equal(R.bonoRestanteJugador(tx, pendientes, 101, POR_JUGADOR, true), 5000);
  // El pendiente de A no toca el bono de B.
  assert.equal(R.bonoRestanteJugador(tx, pendientes, 102, POR_JUGADOR, true), 10000);
});

test('BONO-5 · un pedido ya aplicado no se cuenta dos veces (su cobro ya está en coins)', () => {
  const tx = [cobro(101, 2000, 0)];
  const pedidos = [
    { playerId: 101, fromSub: 2000, estado: 'aplicado' },
    { playerId: 101, fromSub: 1000, estado: 'pendiente' },
  ];
  // Solo el pendiente suma sobre los 2.000 ya cobrados.
  assert.equal(R.gastoBonoJugador(tx, pedidos, 101), 3000);
  assert.equal(R.bonoRestanteJugador(tx, pedidos, 101, POR_JUGADOR, true), 7000);
});

test('BONO-5 · un pedido sin campo estado (dato viejo) cuenta como pendiente', () => {
  assert.equal(R.gastoBonoJugador([], [{ playerId: 101, fromSub: 1500 }], 101), 1500);
});

test('BONO-5 · movimientos de otro jugador o que no son mejoras PES5 no gastan el bono', () => {
  const tx = [
    cobro(102, 9000, 0),
    { reason: 'Stream de la semana', mode: 'add', amount: 50000, pes5: { playerId: 101, fromSub: 8000 } },
    { reason: 'mejora PES5 (admin)', mode: 'sub', amount: 500, after: 0 }, // sin playerId
  ];
  assert.equal(R.gastoBonoJugador(tx, [], 101), 0);
  assert.equal(R.bonoRestanteJugador(tx, [], 101, POR_JUGADOR, true), 10000);
});

test('BONO-5 · playerId numérico y de texto se comparan igual', () => {
  const tx = [cobro('101', 4000, 0)];
  assert.equal(R.bonoRestanteJugador(tx, [], 101, POR_JUGADOR, true), 6000);
  const pendientes = [{ playerId: 101, fromSub: 1000 }];
  assert.equal(R.bonoRestanteJugador([], pendientes, '101', POR_JUGADOR, true), 9000);
});

test('BONO-5 · el bono restante nunca es negativo aunque se haya gastado de más', () => {
  const tx = [cobro(101, 12000, 0)];
  assert.equal(R.bonoRestanteJugador(tx, [], 101, POR_JUGADOR, true), 0);
});

test('BONO-5 · sin `porJugador` usa la regla budgetSubscribers; regla 0 da bono 0', () => {
  assert.equal(R.bonoRestanteJugador([], [], 101, null, true), R.DEFAULT_RULES.budgetSubscribers);
  assert.equal(R.bonoRestanteJugador([], [], 101, 0, true), 0);
  assert.equal(R.bonoRestanteJugador([], [], 101, POR_JUGADOR, true), 10000);
});
