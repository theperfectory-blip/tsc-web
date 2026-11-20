'use strict';
/* Tests de HIST2 — agruparHistorialCoins (tsc-src/js/yunacoins-rules.js).
   Función pura: clasifica los 5 tipos del historial de YuNaCoins, ordena los
   movimientos del más reciente al más viejo, agrupa por temporada y suma.
   Fixtures inventados: no se leen datos reales.
   Correr: node --test tools/test-historial-coins.js (o `node tools/test-historial-coins.js`) */
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../tsc-src/js/yunacoins-rules.js');

function mov(id, season, date, mode, amount, reason, extra) {
  return Object.assign({
    id: id, teamId: 1, season: season, date: date,
    mode: mode, amount: amount, reason: reason, note: '', after: 0,
  }, extra || {});
}

// Temporada 3 = temporada de cobro. Mezcla los 5 tipos, una temporada vieja y
// movimientos sin season. Las fechas están a propósito desordenadas.
const MOVS = [
  mov('m1', 3, '2026-11-10T10:00:00.000Z', 'sub', 5000, 'mejora PES5 (admin)', {
    pes5: { playerName: 'Jugador Uno', fromGeneral: 3000, fromSub: 2000 },
  }),
  mov('m2', 3, '2026-11-12T10:00:00.000Z', 'sub', 7000, 'mejora PES5 retroactiva', {
    pes5: { playerName: 'Jugador Dos', fromGeneral: 7000, fromSub: 0 },
  }),
  mov('m3', 3, '2026-11-11T10:00:00.000Z', 'add', 5000, 'mejora PES5 reembolso'),
  mov('m4', 3, '2026-11-13T10:00:00.000Z', 'add', 1000, 'reembolso'),
  mov('m5', 3, '2026-11-09T10:00:00.000Z', 'add', 20000, 'stream'),
  mov('m6', 3, '2026-11-14T10:00:00.000Z', 'sub', 2000, 'multa'),
  mov('m7', 2, '2026-10-01T10:00:00.000Z', 'sub', 4000, 'mejora PES5 (admin)'),
  mov('m8', 2, '2026-10-02T10:00:00.000Z', 'add', 3000, 'victoria'),
  mov('m9', null, '2026-09-01T10:00:00.000Z', 'add', 500, 'otro'),
  mov('m10', null, '2026-09-02T10:00:00.000Z', 'sub', 1500, 'compra'),
];

const g = R.agruparHistorialCoins(MOVS, 3);

function temp(season) {
  return g.temporadas.find(t => t.season === season);
}
function tipo(temporada, key) {
  return temporada.tipos.find(t => t.key === key);
}

test('agrupa por temporada: la más reciente arriba y «Sin temporada» al final', () => {
  assert.deepEqual(g.temporadas.map(t => t.season), [3, 2, null]);
  assert.equal(temp(null).nombre, 'Sin temporada');
  assert.equal(temp(3).nombre, 'Temporada 3');
  assert.equal(temp(2).nombre, 'Temporada 2');
});

test('solo la temporada de cobro nace abierta (acepta el número como texto)', () => {
  const gt = R.agruparHistorialCoins(MOVS, '3');
  assert.equal(gt.temporadas.find(t => t.season === 3).abierta, true);
  assert.equal(gt.temporadas.find(t => t.season === 2).abierta, false);
  assert.equal(gt.temporadas.find(t => t.season === null).abierta, false);
  // Sin temporada de cobro válida no se abre ninguna.
  assert.equal(R.agruparHistorialCoins(MOVS, null).temporadas.every(t => !t.abierta), true);
});

test('clasifica los 5 tipos y no mezcla retroactivas ni reembolsos en «Mejoras PES5»', () => {
  const t3 = temp(3);
  assert.deepEqual(t3.tipos.map(t => t.key), ['mejoras', 'retroactivas', 'reembolsos', 'ingresos', 'descuentos']);
  assert.equal(tipo(t3, 'mejoras').n, 1);
  assert.deepEqual(tipo(t3, 'mejoras').movimientos.map(m => m.id), ['m1']);
  assert.equal(tipo(t3, 'retroactivas').n, 1);
  assert.deepEqual(tipo(t3, 'retroactivas').movimientos.map(m => m.id), ['m2']);
  assert.equal(tipo(t3, 'reembolsos').n, 2);
  assert.deepEqual(tipo(t3, 'reembolsos').movimientos.map(m => m.id), ['m4', 'm3']);
  assert.equal(tipo(t3, 'ingresos').n, 1);
  assert.deepEqual(tipo(t3, 'ingresos').movimientos.map(m => m.id), ['m5']);
  assert.equal(tipo(t3, 'descuentos').n, 1);
  assert.deepEqual(tipo(t3, 'descuentos').movimientos.map(m => m.id), ['m6']);
  // Ninguna retroactiva/reembolso entró al grupo de mejoras.
  const idsMejoras = tipo(t3, 'mejoras').movimientos.map(m => m.id);
  assert.equal(idsMejoras.includes('m2'), false);
  assert.equal(idsMejoras.includes('m3'), false);
  assert.equal(idsMejoras.includes('m4'), false);
});

test('un tipo sin movimientos no aparece', () => {
  const t2 = temp(2);
  assert.deepEqual(t2.tipos.map(t => t.key), ['mejoras', 'ingresos']);
});

test('sumas por tipo y por temporada', () => {
  const t3 = temp(3);
  assert.equal(tipo(t3, 'mejoras').suma, -5000);
  assert.equal(tipo(t3, 'retroactivas').suma, -7000);
  assert.equal(tipo(t3, 'reembolsos').suma, 6000);
  assert.equal(tipo(t3, 'ingresos').suma, 20000);
  assert.equal(tipo(t3, 'descuentos').suma, -2000);

  assert.equal(t3.n, 6);
  assert.equal(t3.ingresos, 26000);   // 20.000 + 5.000 + 1.000
  assert.equal(t3.gastos, 14000);     // 5.000 + 7.000 + 2.000
  assert.equal(t3.suma, 12000);

  const t2 = temp(2);
  assert.equal(t2.n, 2);
  assert.equal(t2.ingresos, 3000);
  assert.equal(t2.gastos, 4000);
  assert.equal(t2.suma, -1000);

  const ts = temp(null);
  assert.equal(ts.n, 2);
  assert.equal(ts.ingresos, 500);
  assert.equal(ts.gastos, 1500);
  assert.equal(ts.suma, -1000);
});

test('totales y tarjetas de la temporada de cobro', () => {
  assert.deepEqual(g.totales, { n: 10, ingresos: 29500, gastos: 19500, suma: 10000 });
  assert.deepEqual(g.temporadaCobro, {
    n: 3, nombre: 'Temporada 3', movimientos: 6,
    ingresos: 26000, gastos: 14000, suma: 12000,
  });
});

test('más reciente primero dentro de cada tipo', () => {
  const t3 = temp(3);
  const fechas = tipo(t3, 'reembolsos').movimientos.map(m => m.date);
  assert.deepEqual(fechas, ['2026-11-13T10:00:00.000Z', '2026-11-11T10:00:00.000Z']);
});

test('movimientos con season inválida caen en «Sin temporada»', () => {
  const gx = R.agruparHistorialCoins([
    mov('x1', 'abc', '2026-01-01T00:00:00.000Z', 'add', 100, 'stream'),
    mov('x2', '', '2026-01-02T00:00:00.000Z', 'add', 100, 'stream'),
  ], 1);
  assert.equal(gx.temporadas.length, 1);
  assert.equal(gx.temporadas[0].season, null);
  assert.equal(gx.temporadas[0].n, 2);
});

test('no muta la lista original ni su orden', () => {
  const copia = MOVS.slice();
  const idsAntes = MOVS.map(m => m.id).join(',');
  R.agruparHistorialCoins(MOVS, 3);
  assert.equal(MOVS.map(m => m.id).join(','), idsAntes);
  assert.equal(MOVS.length, copia.length);
});

test('lista vacía no rompe y devuelve totales en cero', () => {
  const gv = R.agruparHistorialCoins(null, 3);
  assert.deepEqual(gv.totales, { n: 0, ingresos: 0, gastos: 0, suma: 0 });
  assert.deepEqual(gv.temporadas, []);
  assert.equal(gv.temporadaCobro.ingresos, 0);
  assert.equal(gv.temporadaCobro.gastos, 0);
});
