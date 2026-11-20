'use strict';
/* Tests de las mejoras retroactivas de la Tool PES5: la función pura
   `repartoRetroactivo` de `tsc-src/js/yunacoins-rules.js`.

   Una fila es una propuesta editable: jugador, costo calculado por el diff
   entre el save anterior y el actual, monto a cobrar y casilla. El reparto
   tiene la misma forma que `repartoPendienteEquipo()` de la Tool.

   Correr: node --test tools/test-retro.js  (o `node tools/test-retro.js`). */
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../tsc-src/js/yunacoins-rules.js');

const linea = (campo, de, a, costo) => ({ campo, de, a, costo });

test('monto editado manda sobre el costo calculado', () => {
  const filas = [{
    playerId: 10, playerName: 'Jugador A', subscriber: false, marcada: true,
    costoCalculado: 500, monto: 800, lineas: [linea('Ataque', 80, 85, 500)],
  }];
  const r = R.repartoRetroactivo(filas, {});
  assert.equal(r.totalCosto, 800);
  assert.equal(r.fromGeneral, 800);
  assert.equal(r.fromSub, 0);
  // Al cambiar el monto, el detalle deja una sola línea de ajuste manual.
  assert.deepEqual(r.porJugador['10'].lineas, [linea('ajuste manual', '', '', 800)]);
});

test('varias líneas del mismo suscriptor comparten su bono', () => {
  const filas = [
    { playerId: 7, playerName: '$Uno', subscriber: true, marcada: true,
      costoCalculado: 6000, monto: 6000, lineas: [linea('Ataque', 80, 86, 6000)] },
    { playerId: 7, playerName: '$Uno', subscriber: true, marcada: true,
      costoCalculado: 6000, monto: 6000, lineas: [linea('Defensa', 80, 86, 6000)] },
  ];
  const r = R.repartoRetroactivo(filas, { 7: 10000 });
  // El bono del jugador (10.000) se agota en la primera línea y la segunda va al general.
  assert.equal(r.porJugador['7'].fromSub, 10000);
  assert.equal(r.porJugador['7'].fromGeneral, 2000);
  assert.equal(r.porJugador['7'].total, 12000);
  assert.equal(r.fromSub, 10000);
  assert.equal(r.fromGeneral, 2000);
  // Una sola entrada por jugador, con las dos líneas del diff.
  assert.equal(Object.keys(r.porJugador).length, 1);
  assert.equal(r.porJugador['7'].lineas.length, 2);
});

test('sin «$» (no suscriptor) el bono nunca se toca', () => {
  const filas = [{
    playerId: 3, playerName: 'Jugador B', subscriber: false, marcada: true,
    costoCalculado: 9000, monto: 9000, lineas: [linea('Técnica', 85, 90, 9000)],
  }];
  const r = R.repartoRetroactivo(filas, { 3: 25000 });
  assert.equal(r.fromSub, 0);
  assert.equal(r.fromGeneral, 9000);
});

test('filas desmarcadas o con monto 0 no entran', () => {
  const filas = [
    { playerId: 1, playerName: 'Desmarcada', subscriber: false, marcada: false,
      costoCalculado: 500, monto: 500, lineas: [linea('Ataque', 80, 85, 500)] },
    { playerId: 2, playerName: 'En cero', subscriber: false, marcada: true,
      costoCalculado: 250, monto: 0, lineas: [linea('Defensa', 80, 85, 250)] },
    { playerId: 4, playerName: 'Válida', subscriber: false, marcada: true,
      costoCalculado: 100, monto: 100, lineas: [linea('Velocidad', 80, 82, 100)] },
  ];
  const r = R.repartoRetroactivo(filas, {});
  assert.equal(r.totalCosto, 100);
  assert.deepEqual(Object.keys(r.porJugador), ['4']);
});

test('el total es la suma de las filas que entran', () => {
  const filas = [
    { playerId: 1, playerName: 'A', subscriber: false, marcada: true, costoCalculado: 100, monto: 100 },
    { playerId: 2, playerName: 'B', subscriber: false, marcada: true, costoCalculado: 250, monto: 300 },
    { playerId: 3, playerName: 'C', subscriber: true, marcada: true, costoCalculado: 500, monto: 500 },
    { playerId: 4, playerName: 'D', subscriber: false, marcada: false, costoCalculado: 1000, monto: 1000 },
  ];
  const r = R.repartoRetroactivo(filas, { 3: 25000 });
  assert.equal(r.totalCosto, 100 + 300 + 500);
  assert.equal(r.fromGeneral + r.fromSub, r.totalCosto);
});

test('sin monto usa el costo calculado y deja las líneas del diff', () => {
  const filas = [{
    playerId: 9, playerName: 'Jugador C', subscriber: false, marcada: true,
    costoCalculado: 500, monto: null, lineas: [linea('Ataque', 80, 85, 500)],
  }];
  const r = R.repartoRetroactivo(filas, {});
  assert.equal(r.totalCosto, 500);
  assert.deepEqual(r.porJugador['9'].lineas, [linea('Ataque', 80, 85, 500)]);
});

test('una línea manual entra con campo manual y respeta el monto', () => {
  const filas = [{
    playerId: 5, playerName: 'Jugador D', subscriber: false, marcada: true,
    manual: true, costoCalculado: 0, monto: 750, lineas: [],
  }];
  const r = R.repartoRetroactivo(filas, {});
  assert.equal(r.totalCosto, 750);
  assert.deepEqual(r.porJugador['5'].lineas, [linea('manual', '', '', 750)]);
});

test('sin filas o sin datos devuelve un reparto vacío', () => {
  const r = R.repartoRetroactivo([], {});
  assert.deepEqual(r, { totalCosto: 0, fromGeneral: 0, fromSub: 0, porJugador: {} });
});
