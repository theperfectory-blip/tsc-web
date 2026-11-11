// Tope extra por equipo (premio del admin): se suma al tope general de ese equipo.
const test = require('node:test');
const assert = require('node:assert');
const R = require('../tsc-src/js/yunacoins-rules.js');

test('normalizarTopesExtra descarta basura y extras <= 0', () => {
  const t = R.normalizarTopesExtra({ equipos: { 5: { extra: 10000, motivo: 'Campeón T2' }, 7: { extra: 0 }, 8: { extra: -5 }, 9: { extra: 'x' }, 10: { extra: '2500.9' } } });
  assert.deepStrictEqual(t, { 5: { extra: 10000, motivo: 'Campeón T2' }, 10: { extra: 2500, motivo: '' } });
  assert.deepStrictEqual(R.normalizarTopesExtra(null), {});
  assert.deepStrictEqual(R.normalizarTopesExtra({ equipos: 'no' }), {});
});

test('extraDeEquipo acepta id numérico o string', () => {
  const t = R.normalizarTopesExtra({ equipos: { 5: { extra: 10000 } } });
  assert.strictEqual(R.extraDeEquipo(t, 5), 10000);
  assert.strictEqual(R.extraDeEquipo(t, '5'), 10000);
  assert.strictEqual(R.extraDeEquipo(t, 6), 0);
  assert.strictEqual(R.extraDeEquipo(null, 5), 0);
});

test('reglasConExtra sube solo el tope general y no muta las reglas', () => {
  const base = R.normalizarReglas(null);
  const r = R.reglasConExtra(base, 10000);
  assert.strictEqual(r.budgetGeneral, base.budgetGeneral + 10000);
  assert.strictEqual(r.budgetSubscribers, base.budgetSubscribers);
  assert.strictEqual(base.budgetGeneral, R.DEFAULT_RULES.budgetGeneral);
  assert.strictEqual(R.reglasConExtra(base, 0).budgetGeneral, base.budgetGeneral);
  assert.strictEqual(R.reglasConExtra(base, -1).budgetGeneral, base.budgetGeneral);
});

test('con extra, un equipo que agotó el tope general puede seguir gastando hasta el extra', () => {
  const base = R.normalizarReglas(null);
  const gastado = { general: base.budgetGeneral, sub: 0 };
  assert.strictEqual(R.topesRestantes(gastado, base).general, 0);
  const rest = R.topesRestantes(gastado, R.reglasConExtra(base, 10000));
  assert.strictEqual(rest.general, 10000);
  assert.strictEqual(R.evaluarPago(20000, 10000, 10000, rest.general).ok, true);
  assert.strictEqual(R.evaluarPago(20000, 10001, 10001, rest.general).excedeTopeGeneral, true);
  // el extra no es saldo: sin YunaCoins no paga
  assert.strictEqual(R.evaluarPago(500, 1000, 1000, rest.general).excedeSaldo, true);
});
