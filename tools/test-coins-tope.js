'use strict';
/* Tests de COINS1 — tope de la temporada al cargar YuNaCoins y reembolso de mejora.
   Funciones puras de `tsc-src/js/yunacoins-rules.js` (resumenCarga, gastoTemporada).
   Fixtures inventados: nada de datos reales más allá del caso Guaraní que dejó el encargo.
   Correr: node --test tools/test-coins-tope.js  (o `node tools/test-coins-tope.js`) */
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../tsc-src/js/yunacoins-rules.js');

// Reglas de la temporada tal como las tiene Luis hoy (pes5_config/reglas).
const REGLAS = { budgetGeneral: 120000, budgetSubscribers: 10000 };

test('resumenCarga · caso Guaraní: 4 suscriptores, sin extra, saldo 9.800', () => {
  const r = R.resumenCarga({
    reglas: REGLAS,
    extra: 0,
    nSuscriptores: 4,
    gastado: { general: 110200, sub: 0 },
    saldo: 9800,
  });
  assert.equal(r.topeGeneral, 120000);
  assert.equal(r.extra, 0);
  assert.equal(r.bono, 40000);
  assert.equal(r.topeTotal, 160000);
  assert.equal(r.gastadoTotal, 110200);
  // 120.000 − 110.200 = 9.800 del general + 40.000 intactos del bono
  assert.equal(r.restante, 49800);
  assert.equal(r.saldo, 9800);
  // le falta saldo para llegar al tope: 49.800 − 9.800
  assert.equal(r.sirveCargar, 40000);
});

test('resumenCarga · con tope extra del equipo (campeón)', () => {
  const r = R.resumenCarga({
    reglas: REGLAS,
    extra: 20000,
    nSuscriptores: 2,
    gastado: { general: 120000, sub: 5000 },
    saldo: 5000,
  });
  assert.equal(r.bono, 20000);
  assert.equal(r.topeTotal, 120000 + 20000 + 20000);
  // general: 120.000 + 20.000 − 120.000 = 20.000 · bono: 20.000 − 5.000 = 15.000
  assert.equal(r.restante, 35000);
  assert.equal(r.sirveCargar, 30000);
});

test('resumenCarga · sin suscriptores el bono vale 0', () => {
  const r = R.resumenCarga({
    reglas: REGLAS,
    extra: 0,
    nSuscriptores: 0,
    gastado: { general: 0, sub: 0 },
    saldo: 0,
  });
  assert.equal(r.bono, 0);
  assert.equal(r.topeTotal, 120000);
  assert.equal(r.restante, 120000);
  assert.equal(r.sirveCargar, 120000);
});

test('resumenCarga · sin extra y sin gasto, el bono manda en el restante', () => {
  const r = R.resumenCarga({ reglas: REGLAS, extra: 0, nSuscriptores: 3, gastado: { general: 120000, sub: 0 }, saldo: 0 });
  assert.equal(r.bono, 30000);
  assert.equal(r.restante, 30000);
  assert.equal(r.sirveCargar, 30000);
});

test('resumenCarga · si el saldo ya cubre el tope, no le sirve cargar (0, nunca negativo)', () => {
  const r = R.resumenCarga({
    reglas: REGLAS,
    extra: 0,
    nSuscriptores: 1,
    gastado: { general: 0, sub: 0 },
    saldo: 500000,
  });
  assert.equal(r.restante, 130000);
  assert.equal(r.sirveCargar, 0);
});

test('resumenCarga · un tope agotado no se compensa con el otro (restante por tope)', () => {
  const r = R.resumenCarga({
    reglas: REGLAS,
    extra: 0,
    nSuscriptores: 4,
    gastado: { general: 200000, sub: 0 },   // general pasado de rosca
    saldo: 0,
  });
  assert.equal(r.gastadoTotal, 200000);
  assert.equal(r.restante, 40000);        // solo el bono: el general no resta en negativo
  assert.equal(r.sirveCargar, 40000);
});

test('resumenCarga · gasto del bono por encima del bono de hoy se clampea a 0', () => {
  // Tenía 4 suscriptores (bono 40.000), gastó 35.000 y ahora tiene 1 (bono 10.000).
  const r = R.resumenCarga({ reglas: REGLAS, extra: 0, nSuscriptores: 1, gastado: { general: 0, sub: 35000 }, saldo: 0 });
  assert.equal(r.bono, 10000);
  assert.equal(r.restante, 120000);
  assert.equal(r.sirveCargar, 120000);
});

test('resumenCarga · sin reglas explícitas usa las de código (no lanza)', () => {
  const r = R.resumenCarga({ nSuscriptores: 0, gastado: { general: 0, sub: 0 }, saldo: 0 });
  assert.equal(r.topeGeneral, R.DEFAULT_RULES.budgetGeneral);
  assert.equal(r.topeTotal, R.DEFAULT_RULES.budgetGeneral);
});

test('gastoTemporada · un reembolso de −7.980 en general baja el gasto en 7.980', () => {
  const movimientos = [
    { reason: 'mejora PES5 (admin)', pes5: { fromGeneral: 110200, fromSub: 0 } },
    { reason: 'mejora PES5 reembolso', mode: 'add', amount: 7980, pes5: { fromGeneral: -7980, fromSub: 0, reembolso: true } },
  ];
  const g = R.gastoTemporada(movimientos);
  assert.equal(g.general, 102220);
  assert.equal(g.sub, 0);
});

test('gastoTemporada · reembolso mixto (general + bono) y restante que vuelve a subir', () => {
  const movimientos = [
    { pes5: { fromGeneral: 30000, fromSub: 10000 } },
    { pes5: { fromGeneral: -2000, fromSub: -3000, reembolso: true } },
  ];
  const g = R.gastoTemporada(movimientos);
  assert.deepEqual(g, { general: 28000, sub: 7000 });

  const antes = R.resumenCarga({ reglas: REGLAS, extra: 0, nSuscriptores: 4, gastado: { general: 30000, sub: 10000 }, saldo: 0 });
  const despues = R.resumenCarga({ reglas: REGLAS, extra: 0, nSuscriptores: 4, gastado: g, saldo: 0 });
  assert.equal(despues.restante - antes.restante, 5000);   // el reembolso devuelve tope
  assert.equal(despues.gastadoTotal, 35000);
});

test('gastoTemporada · movimientos sin pes5 no suman y lista vacía da 0', () => {
  assert.deepEqual(R.gastoTemporada([{ mode: 'add', amount: 5000, reason: 'Stream' }]), { general: 0, sub: 0 });
  assert.deepEqual(R.gastoTemporada([]), { general: 0, sub: 0 });
  assert.deepEqual(R.gastoTemporada(null), { general: 0, sub: 0 });
});
