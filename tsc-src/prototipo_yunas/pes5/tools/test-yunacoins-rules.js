// Prueba de Slice D.R: YUNACOINS_RULES (tsc-src/js/yunacoins-rules.js).
//
// yunacoins-rules.js es un modulo puro (sin DOM, sin fetch) con
// module.exports para Node, asi que se puede `require` directo — no hace
// falta el sandbox `vm` que usa test-jugador-completo.js para pes5-editor.js.
//
// REESCRITO para el punto 5 del macro-slice D.R (mapeo de presupuestos,
// resuelto 15/09): el orden de consumo bono/general se INVIRTIO respecto de
// la primera version de este test (esa version calculaba "general primero,
// bono al agotarse" — la regla nueva es "suscriptor: bono primero"). Los 5
// casos de abajo son los pedidos por el supervisor (atributo dentro de
// banda, atributo cruzando banda, habilidad, altura dentro de cupo, caso
// que no alcanza el saldo) mas cobertura extra de las funciones nuevas
// (distribuirCosto, gastoTemporada, topesRestantes, evaluarPago,
// techoPresupuesto con wallet real). Todos calculados A MANO con:
//   BAND_MAX    = [79, 85, 90, 95, 99]
//   bandCosts   = [50, 100, 250, 500, 1000]   (<80, 80-85, 86-90, 91-95, 96-99)
//   scale8Cost  = 250, abilityCost = 500, injuryCost = 250
//   budgetGeneral = 50000, budgetSubscribers = 25000
//   HEIGHT_CAPS = { hi:2, mid:7, lo:8 }
// (ver el propio DEFAULT_RULES en yunacoins-rules.js para confirmar que no
// se cambio ningun numero al portarlos — presidentWallet YA NO es un valor
// de regla, punto 5a: el wallet real siempre se pasa como parametro).
//
// Uso: node test-yunacoins-rules.js

const path = require('path');
const YUNACOINS_RULES = require(path.join(__dirname, '..', '..', '..', 'js', 'yunacoins-rules.js'));

let fallas = 0;
function assert(cond, msg) {
  if (cond) { console.log('OK   — ' + msg); }
  else { console.log('FALLO — ' + msg); fallas++; }
}

const R = YUNACOINS_RULES.DEFAULT_RULES;

console.log('DEFAULT_RULES: ' + JSON.stringify(R));
console.log('');

/* ============================================================
   REGRESION — bandCost99 (bordes de banda, sin cambios en este slice)
   ============================================================ */
console.log('--- Regresion: bandCost99, bordes de banda ---');
assert(YUNACOINS_RULES.bandCost99(79) === 50, 'bandCost99(79) === 50');
assert(YUNACOINS_RULES.bandCost99(80) === 100, 'bandCost99(80) === 100');
assert(YUNACOINS_RULES.bandCost99(85) === 100, 'bandCost99(85) === 100');
assert(YUNACOINS_RULES.bandCost99(86) === 250, 'bandCost99(86) === 250');
assert(YUNACOINS_RULES.bandCost99(96) === 1000, 'bandCost99(96) === 1000');
console.log('');

/* ============================================================
   CASO 1 (pedido del supervisor) — costo de subir un atributo DENTRO DE
   BANDA. Ataque 82 -> 85: los 3 puntos (83,84,85) caen todos en la banda
   80-85 (100 c/u) = 300.
   ============================================================ */
console.log('--- Caso 1: atributo dentro de banda (Ataque 82->85) ---');
const j1 = { atributos: { Ataque: 82 }, escala8: {}, habilidades: {}, lesiones: 'C', altura: 180, edad: 24, pieDominante: 'der' };
const r1 = YUNACOINS_RULES.costoCambios(j1, { atributos: { Ataque: 85 } }, R);
assert(r1.total === 300, `costoCambios total === 300 (obtenido: ${r1.total})`);
const l1 = r1.lineas.find(l => l.campo === 'Ataque');
assert(!!l1 && l1.costo === 300, `linea Ataque costo 300 (obtenido: ${l1 && l1.costo})`);
console.log('');

/* ============================================================
   CASO 2 (pedido del supervisor) — costo de subir un atributo CRUZANDO
   BANDA. Ataque 78 -> 83: 79 (banda <80, 50) + 80,81,82,83 (banda 80-85,
   100 c/u = 400) = 450.
   ============================================================ */
console.log('--- Caso 2: atributo cruzando banda (Ataque 78->83) ---');
const j2 = { atributos: { Ataque: 78 }, escala8: {}, habilidades: {}, lesiones: 'C', altura: 180, edad: 24, pieDominante: 'der' };
const r2 = YUNACOINS_RULES.costoCambios(j2, { atributos: { Ataque: 83 } }, R);
assert(r2.total === 450, `costoCambios total === 450 (obtenido: ${r2.total})`);
console.log('');

/* ============================================================
   CASO 3 (pedido del supervisor) — costo de UNA HABILIDAD. Ganar "Regate"
   (false->true) cuesta abilityCost=500; perder "Pase" (true->false) es
   gratis (0) — misma guarda de direccion que atributos/escala8.
   ============================================================ */
console.log('--- Caso 3: habilidad (ganar cuesta, perder gratis) ---');
const j3 = { atributos: {}, escala8: {}, habilidades: { Regate: false, Pase: true }, lesiones: 'C', altura: 180, edad: 24, pieDominante: 'der' };
const r3 = YUNACOINS_RULES.costoCambios(j3, { habilidades: { Regate: true, Pase: false } }, R);
assert(r3.total === 500, `costoCambios total === 500 (obtenido: ${r3.total})`);
const l3reg = r3.lineas.find(l => l.campo === 'Regate');
const l3pase = r3.lineas.find(l => l.campo === 'Pase');
assert(!!l3reg && l3reg.costo === 500, `linea Regate (ganada) costo 500 (obtenido: ${l3reg && l3reg.costo})`);
assert(!!l3pase && l3pase.costo === 0, `linea Pase (perdida) costo 0 (obtenido: ${l3pase && l3pase.costo})`);
console.log('');

/* ============================================================
   CASO 4 (pedido del supervisor) — ALTURA DENTRO DE CUPO. heightBracket +
   heightBracketCount (Categoria 2, cupos por franja): un plantel de 9
   jugadores donde la franja 'mid' (190-197cm) ya tiene 6 ocupantes
   (cap=7), y el jugador que se edita (id 99, altura actual 180 = sin
   franja) sube a 193cm (franja 'mid'). Como 6 < 7 (cupo, excluyendose a si
   mismo), TODAVIA hay cupo para que suba.
   ============================================================ */
console.log('--- Caso 4: altura dentro de cupo (subir a franja mid con 6/7 ocupado) ---');
const plantel4 = [
  { id: 1, height: 193 }, { id: 2, height: 195 }, { id: 3, height: 190 },
  { id: 4, height: 197 }, { id: 5, height: 192 }, { id: 6, height: 191 },
  { id: 7, height: 180 }, { id: 8, height: 200 }, { id: 99, height: 180 },
];
assert(YUNACOINS_RULES.heightBracket(193) === 'mid', `heightBracket(193) === 'mid' (obtenido: ${YUNACOINS_RULES.heightBracket(193)})`);
const cuentaMid = YUNACOINS_RULES.heightBracketCount(plantel4, 'mid', 99);
assert(cuentaMid === 6, `heightBracketCount(plantel4,'mid',99) === 6 (obtenido: ${cuentaMid})`);
assert(cuentaMid < YUNACOINS_RULES.HEIGHT_CAPS.mid, `hay cupo: ${cuentaMid} < HEIGHT_CAPS.mid (${YUNACOINS_RULES.HEIGHT_CAPS.mid})`);
// la altura en si no tiene costo (igual que antes de este slice)
const r4 = YUNACOINS_RULES.costoCambios({ altura: 180 }, { altura: 193 }, R);
assert(r4.total === 0, `costoCambios total === 0, altura sin costo (obtenido: ${r4.total})`);
console.log('');

/* ============================================================
   CASO 5 (pedido del supervisor) — CASO QUE NO ALCANZA EL SALDO, con la
   regla nueva de evaluarPago: "saldo real >= total Y los topes de
   temporada no se exceden". Dos sub-casos:
     5a) saldo real insuficiente (aunque el tope de temporada alcance).
     5b) saldo real de sobra, pero el TOPE GENERAL de temporada ya casi se
         gasto (jugador no suscriptor, todo sale del general).
   ============================================================ */
console.log('--- Caso 5: no alcanza el saldo (evaluarPago) ---');
const r5a = YUNACOINS_RULES.evaluarPago(/*saldoReal*/500, /*totalCosto*/1000, /*fromGeneral*/1000, /*restanteGeneral*/48500);
assert(r5a.ok === false && r5a.excedeSaldo === true && r5a.excedeTopeGeneral === false,
  `5a) saldo 500 < total 1000 -> ok:false, excedeSaldo:true (obtenido: ${JSON.stringify(r5a)})`);

const r5b = YUNACOINS_RULES.evaluarPago(/*saldoReal*/100000, /*totalCosto*/1000, /*fromGeneral*/1000, /*restanteGeneral*/200);
assert(r5b.ok === false && r5b.excedeSaldo === false && r5b.excedeTopeGeneral === true,
  `5b) saldo 100000 alcanza pero tope general restante 200 < fromGeneral 1000 -> ok:false, excedeTopeGeneral:true (obtenido: ${JSON.stringify(r5b)})`);

const r5ok = YUNACOINS_RULES.evaluarPago(50000, 1000, 1000, 48500);
assert(r5ok.ok === true, `caso control: saldo y tope alcanzan -> ok:true (obtenido: ${JSON.stringify(r5ok)})`);
console.log('');

/* ============================================================
   distribuirCosto — ORDEN INVERTIDO (punto 5b): suscriptor gasta el bono
   PRIMERO; no suscriptor nunca lo toca.
   ============================================================ */
console.log('--- distribuirCosto: orden invertido ---');
const d1 = YUNACOINS_RULES.distribuirCosto(800, 500, true); // suscriptor, bono alcanza parcial
assert(d1.fromSub === 500 && d1.fromGeneral === 300, `suscriptor 800 con bono 500 -> fromSub:500, fromGeneral:300 (obtenido: ${JSON.stringify(d1)})`);
const d2 = YUNACOINS_RULES.distribuirCosto(300, 500, true); // suscriptor, bono alcanza entero
assert(d2.fromSub === 300 && d2.fromGeneral === 0, `suscriptor 300 con bono 500 -> fromSub:300, fromGeneral:0 (obtenido: ${JSON.stringify(d2)})`);
const d3 = YUNACOINS_RULES.distribuirCosto(800, 500, false); // NO suscriptor, nunca toca el bono
assert(d3.fromSub === 0 && d3.fromGeneral === 800, `no suscriptor 800 con bono 500 disponible -> fromSub:0, fromGeneral:800 (obtenido: ${JSON.stringify(d3)})`);
console.log('');

/* ============================================================
   gastoTemporada / topesRestantes — se derivan del libro `coins` (punto
   5c), NUNCA de un campo nuevo en `teams`.
   ============================================================ */
console.log('--- gastoTemporada / topesRestantes ---');
const transacciones = [
  { pes5: { fromGeneral: 1000, fromSub: 200 } },
  { pes5: { fromGeneral: 500, fromSub: 0 } },
  { reason: 'otro motivo (no deberia contar)' }, // sin metadata pes5
];
const gastado = YUNACOINS_RULES.gastoTemporada(transacciones);
assert(gastado.general === 1500 && gastado.sub === 200, `gastoTemporada -> general:1500, sub:200 (obtenido: ${JSON.stringify(gastado)})`);
const topes = YUNACOINS_RULES.topesRestantes(gastado, R);
assert(topes.general === 48500 && topes.subscribers === 24800, `topesRestantes -> general:48500, subscribers:24800 (obtenido: ${JSON.stringify(topes)})`);
console.log('');

/* ============================================================
   techoPresupuesto — punto 5a: el wallet SIEMPRE se pasa explicito (nunca
   se lee de un numero de regla).
   ============================================================ */
console.log('--- techoPresupuesto(walletReal, rules) ---');
const pool1 = YUNACOINS_RULES.techoPresupuesto(400000, R);
assert(pool1.general === 50000 && pool1.subscribers === 25000, `wallet 400000 (>> tope) -> general:50000 (capado), subscribers:25000 (obtenido: ${JSON.stringify(pool1)})`);
const pool2 = YUNACOINS_RULES.techoPresupuesto(30000, R);
assert(pool2.general === 30000 && pool2.subscribers === 25000, `wallet 30000 (< tope) -> general:30000 (limitado por el wallet), subscribers:25000 (obtenido: ${JSON.stringify(pool2)})`);
assert(YUNACOINS_RULES.bonoSuscriptor(pool1, false) === 50000, 'bonoSuscriptor(pool1,false) === 50000 (solo general)');
assert(YUNACOINS_RULES.bonoSuscriptor(pool1, true) === 75000, 'bonoSuscriptor(pool1,true) === 75000 (general+bono)');
console.log('');

/* ============================================================
   CASO 5, version original de test-1500 (combinado, del test viejo) —
   se conserva como regresion de costoCambios (esto NO depende del orden
   bono/general, solo del costo total).
   ============================================================ */
console.log('--- Regresion: costoCambios combinado + puedePagar ---');
const j6 = {
  atributos: { Ataque: 75 }, escala8: {}, habilidades: { Regate: false, Pase: true },
  lesiones: 'C', altura: 180, edad: 24, pieDominante: 'der',
};
const cambios6 = { atributos: { Ataque: 82 }, habilidades: { Regate: true, Pase: false }, lesiones: 'A', altura: 182 };
const r6 = YUNACOINS_RULES.costoCambios(j6, cambios6, R);
// Ataque 75->82 = costRange99(75,82) = 500; Regate ganada = 500; Pase perdida = 0;
// lesiones C->A (indices 0->2) = 2*250 = 500; altura sin costo = 0. total = 1500.
assert(r6.total === 1500, `costoCambios total === 1500 (obtenido: ${r6.total})`);
assert(YUNACOINS_RULES.puedePagar(1500, r6.total) === true, 'puedePagar(1500,1500) === true');
assert(YUNACOINS_RULES.puedePagar(1499, r6.total) === false, 'puedePagar(1499,1500) === false');
console.log('');

console.log(`\n${fallas === 0 ? 'TODO OK' : fallas + ' FALLO(S)'}`);
process.exit(fallas === 0 ? 0 : 1);
