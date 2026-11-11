// Aviso grande de presupuesto del editor (slice 2.1-A): resumenPresupuesto es pura.
const test = require('node:test');
const assert = require('node:assert');
const R = require('../tsc-src/js/yunacoins-rules.js');

const BASE = { budgetGeneral: 50000, budgetSubscribers: 25000 };

test('sin extra: el tope total es solo el general', () => {
  const r = R.resumenPresupuesto({ saldo: 80000, reglas: BASE, extra: 0, gastado: { general: 0, sub: 0 }, pendientes: {} });
  assert.strictEqual(r.topeGeneral, 50000);
  assert.strictEqual(r.extra, 0);
  assert.strictEqual(r.topeTotal, 50000);
  assert.strictEqual(r.restanteGeneral, 50000);
  assert.strictEqual(r.restanteSub, 25000);
});

test('con extra: el tope general suma el extra y lo muestra aparte', () => {
  const r = R.resumenPresupuesto({ saldo: 80000, reglas: BASE, extra: 10000, gastado: {}, pendientes: {} });
  assert.strictEqual(r.topeGeneral, 50000);
  assert.strictEqual(r.extra, 10000);
  assert.strictEqual(r.topeTotal, 60000);
  assert.strictEqual(r.restanteGeneral, 60000);
  // el bono no cambia con el extra
  assert.strictEqual(r.restanteSub, 25000);
});

test('lo gastado descuenta de cada tope (general incluye el extra)', () => {
  const r = R.resumenPresupuesto({ saldo: 80000, reglas: BASE, extra: 10000, gastado: { general: 45000, sub: 20000 }, pendientes: {} });
  assert.strictEqual(r.gastadoGeneral, 45000);
  assert.strictEqual(r.gastadoSub, 20000);
  assert.strictEqual(r.restanteGeneral, 15000);
  assert.strictEqual(r.restanteSub, 5000);
});

test('lo reservado en pendientes baja el saldo y los topes', () => {
  const r = R.resumenPresupuesto({
    saldo: 30000, reglas: BASE, extra: 0, gastado: { general: 10000, sub: 0 },
    pendientes: { total: 8000, general: 6000, sub: 2000 },
  });
  assert.strictEqual(r.saldoDisponible, 22000);
  assert.strictEqual(r.restanteGeneral, 50000 - 10000 - 6000);
  assert.strictEqual(r.restanteSub, 25000 - 2000);
});

test('el limite real es el menor entre el saldo y el tope restante', () => {
  // saldo menor que el tope restante: manda el saldo
  const a = R.resumenPresupuesto({ saldo: 5000, reglas: BASE, extra: 0, gastado: {}, pendientes: {} });
  assert.strictEqual(a.disponibleAhora, 5000);
  assert.strictEqual(a.limitaPor, 'saldo');
  // tope restante menor que el saldo: manda el tope
  const b = R.resumenPresupuesto({ saldo: 90000, reglas: BASE, extra: 0, gastado: { general: 40000 }, pendientes: {} });
  assert.strictEqual(b.disponibleAhora, 10000);
  assert.strictEqual(b.limitaPor, 'tope');
});

test('suscriptor: puede llegar hasta general + bono, sin pasar el saldo', () => {
  const r = R.resumenPresupuesto({ saldo: 100000, reglas: BASE, extra: 0, gastado: { general: 40000, sub: 20000 }, pendientes: {} });
  assert.strictEqual(r.disponibleAhora, 10000);          // solo general
  assert.strictEqual(r.disponibleSuscriptor, 15000);     // general 10000 + bono 5000
  const pobre = R.resumenPresupuesto({ saldo: 12000, reglas: BASE, extra: 0, gastado: { general: 40000, sub: 20000 }, pendientes: {} });
  assert.strictEqual(pobre.disponibleSuscriptor, 12000); // el saldo corta
});

test('gastos por encima del tope no dan restante negativo', () => {
  const r = R.resumenPresupuesto({ saldo: 1e6, reglas: BASE, extra: 0, gastado: { general: 70000, sub: 30000 }, pendientes: {} });
  assert.strictEqual(r.restanteGeneral, 0);
  assert.strictEqual(r.restanteSub, 0);
  assert.strictEqual(r.disponibleAhora, 0);
});

test('valores basura o negativos se tratan como cero', () => {
  const r = R.resumenPresupuesto({ saldo: -5, reglas: BASE, extra: -100, gastado: { general: 'x' }, pendientes: { total: 'y' } });
  assert.strictEqual(r.saldoDisponible, 0);
  assert.strictEqual(r.extra, 0);
  assert.strictEqual(r.gastadoGeneral, 0);
  assert.strictEqual(r.topeTotal, 50000);
  const vacio = R.resumenPresupuesto();
  assert.strictEqual(vacio.topeGeneral, R.DEFAULT_RULES.budgetGeneral);
  assert.strictEqual(vacio.disponibleAhora, 0);
});

test('no muta las reglas que recibe', () => {
  const reglas = { budgetGeneral: 50000, budgetSubscribers: 25000 };
  R.resumenPresupuesto({ saldo: 1, reglas: reglas, extra: 500, gastado: {}, pendientes: {} });
  assert.deepStrictEqual(reglas, { budgetGeneral: 50000, budgetSubscribers: 25000 });
});

test('coherente con el flujo existente: restante con extra igual a topesRestantes sobre reglasConExtra', () => {
  const base = R.normalizarReglas(null);
  const gastado = { general: 30000, sub: 5000 };
  const viejo = R.topesRestantes(gastado, R.reglasConExtra(base, 10000));
  const nuevo = R.resumenPresupuesto({ saldo: 1e9, reglas: base, extra: 10000, gastado: gastado, pendientes: {} });
  assert.strictEqual(nuevo.restanteGeneral, viejo.general);
  assert.strictEqual(nuevo.restanteSub, viejo.subscribers);
});
