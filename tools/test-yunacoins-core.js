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
