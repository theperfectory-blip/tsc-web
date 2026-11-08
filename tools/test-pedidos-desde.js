'use strict';
/* Tests en node: pedidos armados sobre una plantilla desactualizada (slice 2.0-6.H).
   Un pedido de mejora guarda cambios ABSOLUTOS contra la plantilla publicada que vio el
   presidente. La Tool solo aplica si el save sigue igual a esa vista y no baja atributos
   ni cobra 0 por un cambio de stats. Fixtures INVENTADOS.
   Correr: node --test tools/test-pedidos-desde.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../tsc-src/js/pes5-plantilla.js');
const Y = require('../tsc-src/js/yunacoins-rules.js');

// Jugador en forma de editor (jugadorParaEditor), con todos los campos en 60.
function jugador(over) {
  const j = {
    id: 'r162', slot: 0, name: 'Jugador de prueba', dorsal: '', bucket: 'DC',
    height: 180, age: 25, foot: 'Der.', favfoot: 'D', primaryPos: 'CF', tag: 'Delantero centro',
    stats: {}, sec: { inj: 'C' }, abilities: {}, positions: { CF: true }, side: 'D', subscriber: false,
  };
  for (const k of Object.keys(P.STAT_MAP)) j.stats[k] = 60;
  for (const k of Object.keys(P.SEC_MAP)) j.sec[k] = 60;
  for (const k of Object.keys(P.ABILITY_MAP)) j.abilities[k] = false;
  return Object.assign(j, over || {});
}
// Copia profunda para no contaminar fixtures entre casos.
const clon = (x) => JSON.parse(JSON.stringify(x));

// Save en forma de editor, con Ataque (atk) = 32 y el resto como en la publicacion.
function jugadorSave() {
  const s = clon(jugador());
  s.stats.atk = 32;
  return s;
}
// Lo publicado que vio el presidente: Ataque 30.
function jugadorPublicado() {
  const p = clon(jugador());
  p.stats.atk = 30;
  return p;
}
// Jugador del save en forma de leerJugadorCompleto (lo que usa costoCambios).
function jugadorCosto(ataque) {
  const j = { atributos: { Ataque: ataque, Defensa: 60 }, escala8: { 'Regularidad en el juego': 60 }, habilidades: {}, lesiones: 'C' };
  return j;
}

test('msDeFecha: Timestamp de Firestore, Date, ISO y numero', () => {
  assert.equal(P.msDeFecha({ toMillis: () => 1234 }), 1234);
  assert.equal(P.msDeFecha({ toDate: () => new Date(5000) }), 5000);
  assert.equal(P.msDeFecha('2026-11-08T10:00:00.000Z'), Date.parse('2026-11-08T10:00:00.000Z'));
  assert.equal(P.msDeFecha(777), 777);
  assert.equal(P.msDeFecha(null), null);
  assert.equal(P.msDeFecha('no es fecha'), null);
});

test('vistaDelPedido: el pedido se armó sobre la publicación vigente solo si la publicación no es posterior', () => {
  assert.equal(P.vistaDelPedido(1000, 2000), null, 'publicado antes del pedido: vista conocida');
  assert.equal(P.vistaDelPedido(2000, 2000), null, 'mismo instante: vista conocida');
  assert.match(P.vistaDelPedido(3000, 2000), /publicó después de este pedido/, 'republicado despues: rechazo');
  assert.match(P.vistaDelPedido(null, 2000), /no hay plantilla publicada/);
  assert.match(P.vistaDelPedido(1000, null), /no tiene fecha/);
});

test('cambiosContraSave: el caso del pedido B (Ataque 30→31) rechaza si el save ya está en 32', () => {
  const c = P.cambiosContraSave(jugadorPublicado(), jugadorSave(), { atributos: { Ataque: 31 } });
  assert.deepEqual(c, { campo: 'Ataque', era: 30, ahora: 32 });
});

test('cambiosContraSave: si el save sigue igual en el campo que toca, no rechaza', () => {
  const save = jugadorPublicado();
  save.stats.atk = 30;
  assert.equal(P.cambiosContraSave(jugadorPublicado(), save, { atributos: { Ataque: 31 } }), null);
});

test('cambiosContraSave: un cambio en un campo que el pedido NO toca no rechaza', () => {
  const save = jugadorPublicado();
  save.stats.def = 70; // el save cambió Defensa; el pedido solo toca Ataque
  assert.equal(P.cambiosContraSave(jugadorPublicado(), save, { atributos: { Ataque: 31 } }), null);
});

test('cambiosContraSave: vale también para escala 8 y habilidades', () => {
  const pub = jugadorPublicado();
  pub.sec.cons = 50;
  const save = jugadorPublicado();
  save.sec.cons = 55;
  const c = P.cambiosContraSave(pub, save, { escala8: { 'Regularidad en el juego': 52 } });
  assert.equal(c.campo, 'Regularidad en el juego');
  assert.equal(c.era, 50);
  assert.equal(c.ahora, 55);

  const pubH = jugadorPublicado();
  pubH.abilities.dribbling = false;
  const saveH = jugadorPublicado();
  saveH.abilities.dribbling = true;
  const h = P.cambiosContraSave(pubH, saveH, { habilidades: { Regate: true } });
  assert.equal(h.campo, 'Regate');
  assert.equal(h.era, false);
  assert.equal(h.ahora, true);
});

test('formacionContraPublicada: iguales -> null; un slot con otra profundidad -> rechazo con slot y campo', () => {
  const slots = [];
  for (let k = 0; k <= 10; k++) slots.push({ slot: k, jugador: 100 + k, prof: 10 + k, lat: k === 0 ? null : 20 + k, posNombre: 'CC' });
  assert.equal(P.formacionContraPublicada(slots, clon(slots)), null);

  const ahora = clon(slots);
  ahora[3].prof = 19;
  assert.deepEqual(P.formacionContraPublicada(slots, ahora), { slot: 3, campo: 'prof', era: 13, ahora: 19 });
});

test('formacionContraPublicada: un save sin formación (slots vacíos) no coincide con la publicada', () => {
  const slots = [];
  for (let k = 0; k <= 10; k++) slots.push({ slot: k, jugador: k, prof: 10, lat: 20, posNombre: 'CC' });
  const c = P.formacionContraPublicada(slots, []);
  assert.equal(c.slot, 0);
  assert.equal(c.campo, 'jugador');
});

test('motivoRechazoMejora: costo 0 con un cambio de atributos -> rechazo', () => {
  // Pedido que sube a 33 pero el costo sale 0 (caso que no debe pasar): el motivo tiene que aparecer.
  assert.match(Y.motivoRechazoMejora(jugadorCosto(32), { atributos: { Ataque: 33 } }, 0), /cambio sin costo/);
});

test('motivoRechazoMejora: un atributo que bajaría -> rechazo, aunque el total sea positivo', () => {
  assert.match(Y.motivoRechazoMejora(jugadorCosto(32), { atributos: { Ataque: 31 } }, 0), /Ataque bajaría de 32 a 31/);
  assert.match(Y.motivoRechazoMejora(jugadorCosto(32), { atributos: { Ataque: 31, Defensa: 80 } }, 500), /Ataque bajaría de 32 a 31/);
});

test('motivoRechazoMejora: una habilidad que se quita -> rechazo', () => {
  const j = jugadorCosto(32);
  j.habilidades = { Regate: true };
  assert.match(Y.motivoRechazoMejora(j, { habilidades: { Regate: false } }, 0), /se quitaría/);
});

test('motivoRechazoMejora: subir pagando -> aprobado; cambio sin atributos y costo 0 (altura) -> aprobado', () => {
  assert.equal(Y.motivoRechazoMejora(jugadorCosto(32), { atributos: { Ataque: 33 } }, 50), null);
  assert.equal(Y.motivoRechazoMejora(jugadorCosto(32), { altura: 181 }, 0), null);
});

test('escenario completo: el pedido B se rechaza y no se cobra; el costo de bajar sale 0 (el bug)', () => {
  const j = jugadorCosto(32);
  const cambios = { atributos: { Ataque: 31 } };
  // Lo que hacía la Tool antes: costo 0 y escribía 31. Lo que hace ahora: motivo de rechazo.
  const { total } = Y.costoCambios(j, cambios);
  assert.equal(total, 0, 'costoCambios de una baja sale 0 (sin reembolso ni cobro)');
  assert.ok(Y.motivoRechazoMejora(j, cambios, total));
  // La vista: el pedido se armó antes de una publicación posterior, o sobre la vigente con save distinto.
  assert.match(P.vistaDelPedido(5000, 4000), /publicó después/);
  assert.equal(P.vistaDelPedido(3000, 4000), null);
  assert.ok(P.cambiosContraSave(jugadorPublicado(), jugadorSave(), cambios));
});

test('aplicadosDespuesDePublicar: hay aplicados posteriores a la publicación -> bloqueo', () => {
  const pub = Date.parse('2026-11-08T10:00:00.000Z');
  assert.equal(P.aplicadosDespuesDePublicar([{ aplicadoEn: '2026-11-08T11:00:00.000Z' }], pub), true);
  assert.equal(P.aplicadosDespuesDePublicar([{ aplicadoEn: '2026-11-08T09:00:00.000Z' }], pub), false);
  assert.equal(P.aplicadosDespuesDePublicar([], pub), false);
  assert.equal(P.aplicadosDespuesDePublicar([{ aplicadoEn: '2026-11-08T09:00:00.000Z' }], null), true, 'sin publicacion y con aplicados: bloquea');
});
