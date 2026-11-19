'use strict';
/* Tests en node del nucleo YunaCoins (slice 2.0-4). Fixtures INVENTADOS: nada de usuarios
   ni montos reales. Correr: node --test tools/test-yunacoins-core.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../tsc-src/js/yunacoins-rules.js');

const T0 = new Date('2026-06-10T20:00:00Z');
const hace = (h) => new Date(T0.getTime() - h * 3600000).toISOString();

// ---------- parsearListaLoyalty (4.C) ----------

test('parser: miles con punto, coma y espacio (tab y espacio)', () => {
  const p = R.parsearListaLoyalty('a1\t1.234.567\nb2\t1,234,567\nc3\t1 234 567\nd4 1.234.567\ne5 1,234,567');
  assert.deepEqual(p.filas.map(f => f.puntos), [1234567, 1234567, 1234567, 1234567, 1234567]);
});

test('parser: @ opcional y normalizacion a minusculas', () => {
  const p = R.parsearListaLoyalty('@AnaG\t500\nanag 500\n@ANAG\t500');
  // mismo usuario tres veces con los mismos puntos: una fila, dos duplicados
  assert.equal(p.filas.length, 1);
  assert.equal(p.filas[0].usuario, 'anag');
  assert.equal(p.duplicados, 2);
  assert.deepEqual(p.ambiguos, []);
});

test('parser: lineas de ruido (encabezados, rangos, botones) se ignoran y se cuentan', () => {
  const texto = 'Usuario\tPuntos\n1-50 de 80\nSiguiente\nAnterior\nMostrar 50\nluis 800';
  const p = R.parsearListaLoyalty(texto);
  assert.deepEqual(p.filas.map(f => f.usuario), ['luis']);
  assert.equal(p.ignoradas, 5);
  assert.equal(p.lineas, 6);
});

test('parser: texto vacio o solo espacios', () => {
  for (const t of ['', '   \n\t\n', null, undefined]) {
    const p = R.parsearListaLoyalty(t);
    assert.deepEqual(p.filas, []);
    assert.equal(p.ignoradas, 0);
  }
});

test('parser: duplicados con los mismos puntos cuentan una vez; con puntos distintos son ambiguos', () => {
  const p = R.parsearListaLoyalty('bruno 300\nbruno 300\ncarla 10\ncarla 99');
  // bruno: mismos puntos → sigue como fila. carla: puntos distintos → ambigua, fuera.
  assert.deepEqual(p.filas.map(f => [f.usuario, f.puntos]), [['bruno', 300]]);
  assert.deepEqual(p.ambiguos, ['carla']);
  assert.equal(p.duplicados, 2);                              // una de bruno + una de carla
});

test('parser: duplicados con mismos puntos quedan como una fila', () => {
  const p = R.parsearListaLoyalty('bruno 300\nbruno 300');
  assert.deepEqual(p.filas.map(f => [f.usuario, f.puntos]), [['bruno', 300]]);
  assert.equal(p.duplicados, 1);
});

test('parser: nombres con espacios y con separadores de miles', () => {
  const p = R.parsearListaLoyalty('Ana García\t12.000\nLuis Yuna Jr 800\nLucia Pérez 1 234');
  assert.deepEqual(p.filas.map(f => [f.usuario, f.puntos]), [
    ['ana garcía', 12000], ['luis yuna jr', 800], ['lucia pérez', 1234],
  ]);
});

test('parser: puntos con decimales o sin numero se ignoran', () => {
  const p = R.parsearListaLoyalty('dani 12,5\nfede\n800');
  assert.deepEqual(p.filas, []);
  assert.equal(p.ignoradas, 3);
});

// ---------- netoPendiente y marcas (4.A) ----------

test('marca: estado inicial segun el mapeo del equipo', () => {
  assert.deepEqual(R.marcaStreamlabsInicial({ streamlabsUser: 'alfa' }),
    { estado: 'pendiente', lote: null, en: null });
  assert.equal(R.marcaStreamlabsInicial({ streamlabsUser: '   ' }).estado, 'sin_mapeo');
  assert.equal(R.marcaStreamlabsInicial({}).estado, 'sin_mapeo');
});

test('netoPendiente: movimientos viejos sin la marca cuentan como sincronizados', () => {
  const viejos = [
    { mode: 'sub', amount: 999, season: 1, teamId: 1 },
    { mode: 'add', amount: 500, season: 1, teamId: 1 },
  ];
  assert.equal(R.estadoStreamlabs(viejos[0]), 'sincronizado');
  assert.equal(R.netoPendiente(viejos, 1), 0);
});

test('netoPendiente: signo de la convencion (gasto de mas = positivo, alta manual = negativo)', () => {
  const movs = [
    { mode: 'sub', amount: 300, season: 2, teamId: 1, streamlabs: { estado: 'pendiente' } },
    { mode: 'add', amount: 100, season: 2, teamId: 1, streamlabs: { estado: 'pendiente' } },
  ];
  assert.equal(R.netoPendiente(movs, 2), 200);                       // gasto 300, alta 100
  assert.equal(R.netoPendiente([movs[1]], 2), -100);                  // solo una alta manual
  assert.equal(R.netoPendiente([movs[0]], 2), 300);                   // solo un gasto
});

test('netoPendiente: ignora sincronizados, sin_mapeo y otra temporada', () => {
  const movs = [
    { mode: 'sub', amount: 50, season: 2, teamId: 1, streamlabs: { estado: 'sincronizado' } },
    { mode: 'sub', amount: 70, season: 2, teamId: 1, streamlabs: { estado: 'sin_mapeo' } },
    { mode: 'sub', amount: 90, season: 1, teamId: 1, streamlabs: { estado: 'pendiente' } },
    { mode: 'sub', amount: 40, season: 2, teamId: 1, streamlabs: { estado: 'pendiente' } },
  ];
  assert.equal(R.netoPendiente(movs, 2), 40);
});

test('equiposConPendientes: solo los equipos con algun movimiento pendiente de la temporada', () => {
  const movs = [
    { mode: 'sub', amount: 1, season: 2, teamId: 'A', streamlabs: { estado: 'pendiente' } },
    { mode: 'sub', amount: 1, season: 2, teamId: 'B', streamlabs: { estado: 'sincronizado' } },
    { mode: 'sub', amount: 1, season: 1, teamId: 'C', streamlabs: { estado: 'pendiente' } },
  ];
  assert.deepEqual([...R.equiposConPendientes(movs, 2)], ['A']);
});

// ---------- vista previa, ajustes y foto (4.C) ----------

const EQUIPOS = [
  { teamId: 1, teamName: 'Alfa FC', streamlabsUser: '@Alfa', saldoWeb: 500, neto: 200 },
  { teamId: 2, teamName: 'Beta CF', streamlabsUser: 'beta', saldoWeb: 100, neto: 0 },
  { teamId: 3, teamName: 'Gamma', streamlabsUser: 'gamma', saldoWeb: 40, neto: 0 },
];
const LISTA = 'alfa\t1.000\nBETA 100\nzeta 77';

test('vista previa: saldo nuevo = pegado − neto, diferencia contra la web', () => {
  const v = R.vistaPrevia(EQUIPOS, R.parsearListaLoyalty(LISTA));
  const alfa = v.filas.find(f => f.teamId === 1);
  assert.equal(alfa.pegado, 1000);
  assert.equal(alfa.saldoNuevo, 800);          // 1000 − 200
  assert.equal(alfa.diferencia, 300);          // 800 − 500
  const beta = v.filas.find(f => f.teamId === 2);
  assert.equal(beta.saldoNuevo, 100);
  assert.equal(beta.diferencia, 0);
});

test('vista previa: avisos de usuarios no encontrados y de usuarios sin equipo', () => {
  const v = R.vistaPrevia(EQUIPOS, R.parsearListaLoyalty(LISTA));
  assert.deepEqual(v.noEncontrados, ['gamma']);
  assert.equal(v.usuariosSinEquipo, 1);        // zeta no es de ningun equipo
  assert.equal(v.filas.find(f => f.teamId === 3).encontrado, false);
});

test('ajustes: solo equipos encontrados con neto distinto de 0, con el valor a poner', () => {
  const v = R.vistaPrevia(EQUIPOS, R.parsearListaLoyalty(LISTA));
  assert.deepEqual(R.ajustesStreamlabs(v.filas),
    [{ teamId: 1, teamName: 'Alfa FC', usuario: 'alfa', objetivo: 800 }]);
});

// ---------- guardia del doble descuento (4.C.7) ----------

const FOTO = R.construirFoto(R.vistaPrevia(EQUIPOS, R.parsearListaLoyalty(LISTA)).filas, 'lote-1', hace(0));

test('aplicar sin pegado nuevo: usa el objetivo de la foto', () => {
  assert.deepEqual(R.resolverAplicar(FOTO, null), { 1: { accion: 'aplicar', saldo: 800 }, 2: { accion: 'aplicar', saldo: 100 } });
});

test('doble descuento: Luis ya ajusto en Streamlabs (pegado nuevo = objetivo) → no resta otra vez', () => {
  const nuevo = new Map([['alfa', 800], ['beta', 100]]);
  const r = R.resolverAplicar(FOTO, nuevo);
  assert.deepEqual(r[1], { accion: 'ya_ajustado', saldo: 800 });   // no 600
});

test('pegado nuevo igual al de la foto: todavia no se edito → se aplica el objetivo', () => {
  const nuevo = new Map([['alfa', 1000], ['beta', 100]]);
  assert.deepEqual(R.resolverAplicar(FOTO, nuevo)[1], { accion: 'aplicar', saldo: 800 });
});

test('pegado nuevo distinto de ambos valores: conflicto, el equipo queda fuera', () => {
  const nuevo = new Map([['alfa', 912], ['beta', 100]]);
  assert.deepEqual(R.resolverAplicar(FOTO, nuevo)[1], { accion: 'conflicto', pegadoNuevo: 912 });
});

test('pegado nuevo sin el usuario del equipo: sin_usuario', () => {
  const nuevo = new Map([['beta', 100]]);
  assert.deepEqual(R.resolverAplicar(FOTO, nuevo)[1], { accion: 'sin_usuario' });
});

// ---------- cobro sin sobregiro (4.B) ----------

test('cobro: descuenta cuando alcanza; llega a cero sin lanzar', () => {
  assert.equal(R.cobroSinSobregiro(500, 200), 300);
  assert.equal(R.cobroSinSobregiro(200, 200), 0);
});

test('cobro: sin saldo suficiente lanza y no devuelve un saldo', () => {
  assert.throws(() => R.cobroSinSobregiro(100, 200), /sobregiro/);
  assert.throws(() => R.cobroSinSobregiro(100, -5), /negativo/);
});

// ---------- frescura de la lista (4.D) ----------

test('frescura: 11 h fresca, 13 h vencida, nunca sincronizada vencida', () => {
  assert.equal(R.listaVencida(hace(11), T0), false);
  assert.equal(R.listaVencida(hace(13), T0), true);
  assert.equal(R.listaVencida(null, T0), true);
  assert.equal(R.listaVencida('no es una fecha', T0), true);
  assert.equal(R.LOYALTY_FRESCURA_HORAS, 12);
});

test('frescura: horas desde la sincronizacion', () => {
  assert.equal(Math.round(R.horasDesde(hace(3), T0)), 3);
  assert.equal(R.horasDesde(null, T0), null);
});

// ---------- techo de jugador (4.F) ----------

test('4.F Jimbo: saldo 1000 y costo 3000 se rechaza por saldo y el techo es 1000', () => {
  const pool = R.techoPresupuesto(1000, R.DEFAULT_RULES, 1);
  assert.equal(R.bonoSuscriptor(pool, true), 1000);              // min(1000, 50000 + 25000)
  const reparto = R.distribuirCosto(3000, pool.subscribers, true);
  const ev = R.evaluarPago(1000, 3000, reparto.fromGeneral, pool.general);
  assert.equal(ev.ok, false);
  assert.equal(ev.excedeSaldo, true);
  assert.equal(ev.excedeTopeGeneral, false);                    // el rechazo es por saldo, no por tope
});

// ---------- BONO-3: el bono es solo para suscriptores («$») ----------

test('BONO-3 techo: suscriptor = min(saldo, general + bono); sin «$» = min(saldo, general)', () => {
  const pool = { saldo: 100000, general: 10000, subscribers: 5000 };
  assert.equal(R.bonoSuscriptor(pool, true), 15000);
  assert.equal(R.bonoSuscriptor(pool, false), 10000);
  assert.equal(R.bonoSuscriptor({ saldo: 12000, general: 10000, subscribers: 5000 }, true), 12000);
  assert.equal(R.bonoSuscriptor({ saldo: 8000, general: 10000, subscribers: 5000 }, true), 8000);
  assert.equal(R.bonoSuscriptor({ saldo: 8000, general: 10000, subscribers: 5000 }, false), 8000);
  assert.equal(R.bonoSuscriptor({ saldo: 0, general: 10000, subscribers: 5000 }, false), 0);
});

test('BONO-3 techo: sin saldo en el pool no hay tope por saldo (compatibilidad)', () => {
  assert.equal(R.bonoSuscriptor({ general: 10000, subscribers: 5000 }, true), 15000);
  assert.equal(R.bonoSuscriptor({ general: 10000, subscribers: 5000 }, false), 10000);
});

test('BONO-3 techo: techoPresupuesto deja el saldo real; con saldo alto manda el tope de temporada', () => {
  const pool = R.techoPresupuesto(400000, R.DEFAULT_RULES, 1);
  assert.equal(pool.saldo, 400000);
  assert.equal(R.bonoSuscriptor(pool, true), 75000);             // 50.000 general + 25.000 bono
  assert.equal(R.bonoSuscriptor(pool, false), 50000);            // sin «$», solo el general
  assert.equal(R.bonoSuscriptor(R.techoPresupuesto(400000, R.DEFAULT_RULES, 0), false), 50000);
});

// ---------- BONO-3: casos obligatorios ----------

const REGLAS_BONO = { budgetGeneral: 120000, budgetSubscribers: 10000 }; // 10.000 por suscriptor

test('BONO-3 reparto: suscriptor con bono 40.000 y costo 50.000 → 40.000 del bono y 10.000 del general', () => {
  assert.deepEqual(R.distribuirCosto(50000, 40000, true), { fromSub: 40000, fromGeneral: 10000 });
});

test('BONO-3 reparto: jugador sin «$» con costo 50.000 → todo del general, nunca del bono', () => {
  assert.deepEqual(R.distribuirCosto(50000, 40000, false), { fromSub: 0, fromGeneral: 50000 });
});

test('BONO-3 techo del equipo: 3 «$», tope general 120.000 y saldo 500.000', () => {
  const pool = R.techoPresupuesto(500000, REGLAS_BONO, 3);
  assert.equal(pool.general, 120000);
  assert.equal(pool.subscribers, 30000);                        // 3 × 10.000
  assert.equal(R.bonoSuscriptor(pool, true), 150000);           // 120.000 + 30.000
  assert.equal(R.bonoSuscriptor(pool, false), 120000);          // sin «$», solo el general
});

test('BONO-3 techo del equipo: el saldo corta a los dos por igual', () => {
  const pool = R.techoPresupuesto(120000, REGLAS_BONO, 3);
  assert.equal(R.bonoSuscriptor(pool, true), 120000);           // min(120.000, 120.000 + 30.000)
  assert.equal(R.bonoSuscriptor(pool, false), 120000);
});

test('BONO-3 techo del equipo: sin suscriptores los dos ven solo el tope general', () => {
  const pool = R.techoPresupuesto(500000, REGLAS_BONO, 0);
  assert.equal(pool.subscribers, 0);
  assert.equal(R.bonoSuscriptor(pool, true), 120000);
  assert.equal(R.bonoSuscriptor(pool, false), 120000);
});

// ---------- transporte de Loyalty (4.G) ----------

test('4.G transporte: sin campo, valor desconocido o manual = manual (Plan B)', () => {
  assert.equal(R.transporteDe(undefined), 'manual');
  assert.equal(R.transporteDe({}), 'manual');
  assert.equal(R.transporteDe({ transporte: 'otra-cosa' }), 'manual');
  assert.equal(R.transporteDe({ transporte: 'manual' }), 'manual');
});

test('4.G transporte: api solo con el valor exacto api; los valores validos son manual y api', () => {
  assert.equal(R.transporteDe({ transporte: 'api' }), 'api');
  assert.deepEqual(R.TRANSPORTES, ['manual', 'api']);
});

// ---------- decision de la guardia de 4.D (solo cobro > 0) ----------

test('4.D guardia: costo 0 nunca se bloquea (formacion gratis), aunque la lista este vencida o nunca sincronizada', () => {
  assert.equal(R.debeBloquearPorFrescura(hace(13), T0, 0), false);
  assert.equal(R.debeBloquearPorFrescura(null, T0, 0), false);
  assert.equal(R.debeBloquearPorFrescura(hace(13), T0, undefined), false);
  assert.equal(R.debeBloquearPorFrescura(hace(13), T0, -5), false);
});

test('4.D guardia: con costo > 0 bloquea solo si la lista esta vencida o nunca se sincronizo', () => {
  assert.equal(R.debeBloquearPorFrescura(hace(3), T0, 500), false);
  assert.equal(R.debeBloquearPorFrescura(hace(13), T0, 500), true);
  assert.equal(R.debeBloquearPorFrescura(null, T0, 500), true);
  assert.equal(R.debeBloquearPorFrescura(hace(13), T0, 1), true);
});
