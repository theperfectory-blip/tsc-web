'use strict';
/* PED2: dos (o mas) pedidos pendientes del MISMO jugador en un mismo lote.
   Bug real (produccion, San Martin de Mendoza): al aplicar el primero la copia del save
   deja de coincidir con la plantilla publicada, y el segundo se rechazaba como «plantilla
   desactualizada» aunque el «cambio» lo habia hecho el otro pedido del mismo presidente.
   Regla: se valida contra «lo publicado + lo que el lote ya aplico» (publicadoConAplicados),
   en orden de creadoEn, y cada pedido paga solo su delta (lo ya subido no se cobra dos veces).
   Fixtures INVENTADOS.
   Correr: node tools/test-ped2.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../tsc-src/js/pes5-plantilla.js');
const Y = require('../tsc-src/js/yunacoins-rules.js');

// Jugador en forma de editor (jugadorParaEditor), con todos los stats en 60.
function jugador(over) {
  const j = {
    id: 'r162', slot: 0, name: 'Niang', dorsal: '', bucket: 'DC',
    height: 183, age: 25, foot: 'Der.', favfoot: 'D', primaryPos: 'CF', tag: 'Delantero centro',
    stats: {}, sec: { inj: 'C' }, abilities: {}, positions: { CF: true }, side: 'D', subscriber: false,
  };
  for (const k of Object.keys(P.STAT_MAP)) j.stats[k] = 60;
  for (const k of Object.keys(P.SEC_MAP)) j.sec[k] = 4;
  for (const k of Object.keys(P.ABILITY_MAP)) j.abilities[k] = false;
  return Object.assign(j, over || {});
}
const clon = (x) => JSON.parse(JSON.stringify(x));

// Lo publicado que vio el presidente: Ataque 76.
function publicado() {
  const p = clon(jugador());
  p.stats.atk = 76;
  return p;
}

// Los dos pedidos pendientes del mismo jugador, con un campo en comun (Ataque).
const PEDIDO_1 = { atributos: { Ataque: 77 } };                       // 76 -> 77
const PEDIDO_2 = { atributos: { Ataque: 78, Defensa: 62 } };          // 77 -> 78 (comun) + Defensa 60 -> 62

// ---------- 1) publicadoConAplicados ----------

test('publicadoConAplicados: aplica los cambios del lote en orden y no muta lo publicado', () => {
  const pub = publicado();
  const copia = clon(pub);
  const base = P.publicadoConAplicados(pub, [PEDIDO_1, PEDIDO_2]);
  assert.equal(base.stats.atk, 78, 'el segundo pedido manda sobre el primero en el campo comun');
  assert.equal(base.stats.def, 62);
  assert.deepEqual(pub, copia, 'lo publicado queda intacto');
});

test('publicadoConAplicados: sin cambios previos devuelve una copia igual (no la misma referencia)', () => {
  const pub = publicado();
  const base = P.publicadoConAplicados(pub, []);
  assert.deepEqual(base, pub);
  assert.notEqual(base, pub);
  assert.equal(P.publicadoConAplicados(null, [PEDIDO_1]), null);
});

test('publicadoConAplicados: tambien cubre escala 8, habilidades y altura/edad/pie', () => {
  const pub = publicado();
  const base = P.publicadoConAplicados(pub, [
    { escala8: { 'Regularidad en el juego': 6 }, habilidades: { Regate: true }, altura: 185, edad: 26, pieDominante: 'izq' },
  ]);
  assert.equal(base.sec.cons, 6);
  assert.equal(base.abilities.dribbling, true);
  assert.equal(base.height, 185);
  assert.equal(base.age, 26);
  assert.equal(base.favfoot, 'I');
});

// ---------- 2) validacion: dos pedidos del mismo jugador con un campo en comun ----------

test('el bug: contra lo publicado solo, el 2.º pedido del lote se rechazaba por «plantilla desactualizada»', () => {
  const pub = publicado();
  const save = P.publicadoConAplicados(pub, [PEDIDO_1]);   // la copia ya tiene el 1.º pedido
  const contraPublicado = P.cambiosContraSave(pub, save, PEDIDO_2);
  assert.deepEqual(contraPublicado, { campo: 'Ataque', era: 76, ahora: 77 }, 'asi se veia el «cambio» (era el pedido 1, no Luis)');
  assert.ok(contraPublicado, 'y se rechazaba');
});

test('con la base del lote, el 2.º pedido del mismo jugador se acepta', () => {
  const pub = publicado();
  const save = P.publicadoConAplicados(pub, [PEDIDO_1]);
  const base = P.publicadoConAplicados(pub, [PEDIDO_1]);
  assert.equal(P.cambiosContraSave(base, save, PEDIDO_2), null, 'el campo comun lo movio el lote: no es edicion de Luis');
});

test('un tercer valor en ese campo si es edicion de Luis: se rechaza', () => {
  const pub = publicado();
  const base = P.publicadoConAplicados(pub, [PEDIDO_1]);     // el lote dejo Ataque en 77
  const save = clon(base);
  save.stats.atk = 79;                                      // Luis lo subio a 79 por su cuenta
  const c = P.cambiosContraSave(base, save, PEDIDO_2);
  assert.deepEqual(c, { campo: 'Ataque', era: 77, ahora: 79 });
});

test('una edicion de Luis en un campo que el pedido NO toca no rechaza', () => {
  const pub = publicado();
  const base = P.publicadoConAplicados(pub, [PEDIDO_1]);
  const save = clon(base);
  save.stats.equ = 70;                                      // Equilibrio cambiado por Luis, el pedido no lo toca
  assert.equal(P.cambiosContraSave(base, save, PEDIDO_2), null);
});

test('la edicion de Luis tambien se detecta en escala 8 y habilidades (no solo atributos)', () => {
  const pub = publicado();
  const base = P.publicadoConAplicados(pub, [{ escala8: { 'Regularidad en el juego': 6 } }]);
  const save = clon(base);
  save.sec.cons = 7;                                        // Luis lo dejo en 7
  const c = P.cambiosContraSave(base, save, { escala8: { 'Regularidad en el juego': 6 } });
  assert.deepEqual(c, { campo: 'Regularidad en el juego', era: 6, ahora: 7 });
});

// ---------- 3) costo: cada pedido paga lo suyo ----------

// Costo de un pedido en el formato que usa la Tool (jugador del save -> costoCambios).
const costo = (jugadorEditor, cambios) => Y.costoCambios(P.jugadorReglasDeEditor(jugadorEditor), cambios).total;

test('costo: el pedido 2 contra lo publicado cobra los dos campos', () => {
  assert.equal(costo(publicado(), PEDIDO_1), 50, 'Ataque 76->77 en la banda de 50 por punto: 50');
  assert.equal(costo(publicado(), PEDIDO_2), 200, 'Ataque 76->78 = 100, Defensa 60->62 = 100');
});

test('costo: contra el lote, el campo comun paga solo el tramo nuevo (no se cobra dos veces)', () => {
  const pub = publicado();
  const conP1 = P.publicadoConAplicados(pub, [PEDIDO_1]);   // Ataque ya en 77
  assert.equal(costo(conP1, PEDIDO_2), 150, 'Ataque 77->78 = 50 (no 100) + Defensa 60->62 = 100');
});

test('costo: el 2.º pedido que repite el mismo valor de un campo ya subido no lo cobra', () => {
  const pub = publicado();
  const conP1 = P.publicadoConAplicados(pub, [PEDIDO_1]);
  const repetido = { atributos: { Ataque: 77 } };
  assert.equal(costo(conP1, repetido), 0, 'el campo ya estaba en 77 por el pedido 1');
  assert.equal(costo(pub, repetido), 50, 'pero contra lo publicado el pedido si sube algo (su precio declarado)');
});

test('costo: un pedido que no toca el campo que movio el lote cuesta igual que contra lo publicado', () => {
  const pub = publicado();
  const conP1 = P.publicadoConAplicados(pub, [PEDIDO_1]);
  const soloDefensa = { atributos: { Defensa: 62 } };
  assert.equal(costo(conP1, soloDefensa), costo(pub, soloDefensa));
});

test('precio declarado: se acepta el de lo publicado y el del save actual, y se cobra el delta', () => {
  const pub = publicado();
  const conP1 = P.publicadoConAplicados(pub, [PEDIDO_1]);
  const totalDelta = costo(conP1, PEDIDO_2);      // lo que cobra la Tool (contra el save de ahora)
  const totalPublicado = costo(pub, PEDIDO_2);    // lo que el presidente vio al armar el pedido
  assert.equal(totalDelta, 150);
  assert.equal(totalPublicado, 200);

  // La verificacion p.totalCost === total acepta cualquiera de los dos precios del pedido...
  const acepta = (declarado) => declarado === totalDelta || declarado === totalPublicado;
  assert.equal(acepta(200), true, 'pedido armado sobre lo publicado (sesion nueva)');
  assert.equal(acepta(150), true, 'pedido armado despues del 1.º en la misma sesion del presidente');
  assert.equal(acepta(500), false, 'otra tarifa: se rechaza');

  // ...pero siempre se cobra el delta: el campo comun no se paga dos veces.
  assert.equal(totalDelta, 150);
});

test('un pedido repetido entero queda en 0 por diseno: el precio contra lo publicado evita el rechazo por «cambio sin costo»', () => {
  const pub = publicado();
  const conP1 = P.publicadoConAplicados(pub, [PEDIDO_1]);
  const repetido = { atributos: { Ataque: 77 } };
  const jSave = P.jugadorReglasDeEditor(conP1);
  // Contra el save actual el pedido no cuesta nada (ya esta aplicado)...
  assert.equal(costo(conP1, repetido), 0);
  assert.match(Y.motivoRechazoMejora(jSave, repetido, 0), /cambio sin costo/);
  // ...pero su precio contra lo publicado dice que si sube algo: por eso la Tool le pasa ese
  // precio a la defensa de la regla y el pedido pasa.
  assert.equal(Y.motivoRechazoMejora(jSave, repetido, costo(pub, repetido)), null);
});

// ---------- 4) orden por fecha (creadoEn ascendente) ----------

test('pedidosEnOrdenDeCreacion: del mas viejo al mas nuevo, sin fecha al final', () => {
  const lista = [
    { _id: 'b', creadoEn: '2026-11-10T10:00:00.000Z' },
    { _id: 'sin-fecha' },
    { _id: 'a', creadoEn: '2026-11-09T10:00:00.000Z' },
    { _id: 'c', creadoEn: { toMillis: () => Date.parse('2026-11-11T10:00:00.000Z') } },
  ];
  const idsAntes = lista.map(p => p._id);
  assert.deepEqual(P.pedidosEnOrdenDeCreacion(lista).map(p => p._id), ['a', 'b', 'c', 'sin-fecha']);
  assert.deepEqual(lista.map(p => p._id), idsAntes, 'no reordena la lista original');
  assert.equal(lista[0]._id, 'b');
  assert.equal(typeof lista[3].creadoEn.toMillis, 'function', 'la lista original conserva sus objetos tal cual');
  assert.deepEqual(P.pedidosEnOrdenDeCreacion([]), []);
});

test('pedidosEnOrdenDeCreacion: con la misma fecha (o sin fecha) conserva el orden en que llegaron', () => {
  const ms = Date.parse('2026-11-10T10:00:00.000Z');
  const lista = [
    { _id: '1', creadoEn: ms },
    { _id: '2', creadoEn: ms },
    { _id: '3' },
    { _id: '4' },
  ];
  assert.deepEqual(P.pedidosEnOrdenDeCreacion(lista).map(p => p._id), ['1', '2', '3', '4']);
});

test('orden + base del lote: aplicar el mas viejo primero hace que el 2.º se acepte', () => {
  // Los pedidos llegan desordenados (el 2.º antes que el 1.º): despues de ordenar, la base
  // del 2.º incluye al 1.º y el save de la copia coincide con ella.
  const pub = publicado();
  const pedidos = [
    { _id: 'p2', creadoEn: '2026-11-10T12:00:00.000Z', cambios: PEDIDO_2 },
    { _id: 'p1', creadoEn: '2026-11-10T11:00:00.000Z', cambios: PEDIDO_1 },
  ];
  const orden = P.pedidosEnOrdenDeCreacion(pedidos);
  assert.deepEqual(orden.map(p => p._id), ['p1', 'p2']);

  const aplicados = [];
  for (const p of orden) {
    const base = P.publicadoConAplicados(pub, aplicados);
    assert.equal(P.cambiosContraSave(base, P.publicadoConAplicados(pub, aplicados), p.cambios), null, p._id + ' se acepta');
    aplicados.push(p.cambios);
  }
  const final = P.publicadoConAplicados(pub, aplicados);
  assert.equal(final.stats.atk, 78);
  assert.equal(final.stats.def, 62);
});

// ---------- 5) jugadorReglasDeEditor (lo que lee el costo) ----------

test('jugadorReglasDeEditor: mapea atributos, escala 8, habilidades, lesiones, altura, edad y pie', () => {
  const ed = jugador({
    stats: Object.assign(clon(jugador().stats), { atk: 76 }),
    sec: { ment: 70, cons: 4, gk: 20, teq: 80, cond: 5, wff: 6, wfa: 7, inj: 'B' },
    abilities: { dribbling: true },
    height: 185, age: 26, favfoot: 'I',
  });
  const r = P.jugadorReglasDeEditor(ed);
  assert.equal(r.id, 162);
  assert.equal(r.nombre, 'Niang');
  assert.equal(r.atributos.Ataque, 76);
  assert.equal(r.atributos.Mentalidad, 70, 'sec que no es escala 8 va a atributos');
  assert.equal(r.atributos['Cualidades de portero'], 20);
  assert.equal(r.atributos['Trabajo en equipo'], 80);
  assert.equal(r.escala8['Regularidad en el juego'], 4);
  assert.equal(r.escala8['Estabilidad'], 5);
  assert.equal(r.escala8['Frec. pie malo'], 6);
  assert.equal(r.escala8['Prec. pie malo'], 7);
  assert.equal(r.habilidades.Regate, true);
  assert.equal(r.habilidades['Hab. goleadora'], false);
  assert.equal(r.lesiones, 'B');
  assert.equal(r.altura, 185);
  assert.equal(r.edad, 26);
  assert.equal(r.pieDominante, 'izq');
});

test('jugadorReglasDeEditor: el costo que da es el mismo que el de un jugador del save equivalente', () => {
  const pub = publicado();
  const delSave = { atributos: { Ataque: 76, Defensa: 60 }, escala8: { 'Regularidad en el juego': 4 }, habilidades: {}, lesiones: 'C', altura: 183, edad: 25, pieDominante: 'der' };
  const cambios = { atributos: { Ataque: 78, Defensa: 62 }, escala8: { 'Regularidad en el juego': 6 } };
  assert.deepEqual(Y.costoCambios(P.jugadorReglasDeEditor(pub), cambios), Y.costoCambios(delSave, cambios));
});

test('jugadorReglasDeEditor: sin jugador no rompe', () => {
  const r = P.jugadorReglasDeEditor(null);
  assert.deepEqual(r.atributos, {});
  assert.equal(r.altura, undefined);
  assert.equal(r.pieDominante, 'der');
});
