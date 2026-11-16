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
const YUNACOINS_RULES = require(path.join(__dirname, '..', 'tsc-src', 'js', 'yunacoins-rules.js'));

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

/* ============================================================
   SLICE R — validarReglas y normalizarReglas (nuevas funciones)
   ============================================================ */
console.log('--- Slice R: validarReglas / normalizarReglas ---');
assert(YUNACOINS_RULES.validarReglas(R).length === 0, 'validarReglas(DEFAULT_RULES) devuelve []');
assert(YUNACOINS_RULES.validarReglas(Object.assign({}, R, {bandCosts:[50,100,90,500,1000]})).length > 0, 'validarReglas con banda decreciente devuelve error(es)');
assert(YUNACOINS_RULES.validarReglas(Object.assign({}, R, {abilityCost:-1})).length > 0, 'validarReglas con abilityCost negativo devuelve error(es)');
const norm1 = YUNACOINS_RULES.normalizarReglas(null);
assert(JSON.stringify(norm1) === JSON.stringify(R), 'normalizarReglas(null) === DEFAULT_RULES');
const norm2 = YUNACOINS_RULES.normalizarReglas({budgetGeneral:100000, budgetSubscribers:20000});
assert(norm2.budgetGeneral === 100000 && norm2.budgetSubscribers === 20000, 'normalizarReglas mezcla campos validos');
const norm3 = YUNACOINS_RULES.normalizarReglas({bandCosts:[1,2]});
assert(JSON.stringify(norm3) === JSON.stringify(R), 'normalizarReglas con dato inválido devuelve DEFAULT_RULES');
console.log('');

/* ============================================================
   TOPE DE ATRIBUTOS POR TEMPORADA DEL JUEGO (PES5-TOPE-1)
   ============================================================ */
console.log('--- Tope de atributos por temporada del juego ---');
const J = (atr) => ({ atributos: atr, escala8: {}, habilidades: {} });
const cambioAtr = (campo, a) => ({ atributos: { [campo]: a } });
// Base 80 -> 90 con tope 90: OK
assert(YUNACOINS_RULES.motivoRechazoMejora(J({ Ataque: 80 }), cambioAtr('Ataque', 90), 500, 90) === null, 'tope: base 80 -> 90 aprobado (tope 90)');
// 89 -> 91 con tope 90: rechazado
assert(/no puede|tope/.test(YUNACOINS_RULES.motivoRechazoMejora(J({ Ataque: 89 }), cambioAtr('Ataque', 91), 500, 90) || ''), 'tope: 89 -> 91 rechazado (tope 90)');
// Leyenda 95 sin cambios: OK aunque el tope sea 90
assert(YUNACOINS_RULES.motivoRechazoMejora(J({ Ataque: 95 }), { atributos: {} }, 0, 90) === null, 'tope: leyenda 95 sin cambios aprobada');
assert(YUNACOINS_RULES.motivoRechazoMejora(J({ Ataque: 95 }), cambioAtr('Ataque', 95), 500, 90) === null, 'tope: leyenda 95 con el mismo valor (y un costo de otra stat) no es un subir: aprobada');
// Leyenda 95 -> 96: rechazado
assert(/no puede subir/.test(YUNACOINS_RULES.motivoRechazoMejora(J({ Ataque: 95 }), cambioAtr('Ataque', 96), 500, 90) || ''), 'tope: leyenda 95 -> 96 rechazada (motivo: no puede subir)');
// Sin tope (null/undefined): no cambia el comportamiento previo
assert(YUNACOINS_RULES.motivoRechazoMejora(J({ Ataque: 95 }), cambioAtr('Ataque', 99), 500, null) === null, 'tope: sin tope (null) no bloquea');
// Bajar sigue rechazándose aunque el tope sea alto
assert(/bajaría/.test(YUNACOINS_RULES.motivoRechazoMejora(J({ Ataque: 80 }), cambioAtr('Ataque', 79), 0, 90) || ''), 'tope: bajar sigue rechazado');
// Temporada sin valor cargado -> hereda el último tope
const T = YUNACOINS_RULES.topeAtributo;
assert(T(1, [90]) === 90, 'topeAtributo: temporada 1 con [90] = 90');
assert(T(3, [90]) === 90, 'topeAtributo: temporada 3 sin valor hereda el último (90)');
assert(T(3, [85, 90]) === 90, 'topeAtributo: temporada 3 con [85,90] hereda 90');
assert(T(2, [85, 90]) === 90, 'topeAtributo: temporada 2 con [85,90] = 90');
// Lista vacía -> sin tope
assert(T(1, []) === null, 'topeAtributo: lista vacía = sin tope (null)');
assert(T(2, []) === null, 'topeAtributo: lista vacía en temporada 2 = sin tope');
assert(T(null, [90]) === null, 'topeAtributo: sin ordinal = sin tope');
// Normalización del juego: "PES5" y "PES 5" son el mismo juego
assert(YUNACOINS_RULES.normalizarJuego(' pes 5 ') === 'PES5' && YUNACOINS_RULES.normalizarJuego('PES5') === 'PES5', 'normalizarJuego: "PES5" y "PES 5" dan lo mismo');
const temporadas = [
  { number: 1, game: 'PES 4' },
  { number: 2, game: 'PES5' },
  { number: 3, game: 'PES 5' },
  { number: 4, game: 'pes 5' },
];
const tdj = YUNACOINS_RULES.temporadaDelJuego(temporadas, 3);
assert(tdj && tdj.ordinal === 2 && tdj.temporadas.join(',') === '2,3,4', `temporadaDelJuego: temporada 3 es la 2.ª de PES5 (obtenido: ${tdj && tdj.ordinal})`);
assert(YUNACOINS_RULES.temporadaDelJuego(temporadas, 2).ordinal === 1, 'temporadaDelJuego: temporada 2 (PES5) es la 1.ª del juego');
assert(YUNACOINS_RULES.temporadaDelJuego(temporadas, 1).ordinal === 1, 'temporadaDelJuego: temporada 1 (PES 4) es la 1.ª de PES 4');
assert(YUNACOINS_RULES.temporadaDelJuego(temporadas, 99) === null, 'temporadaDelJuego: temporada inexistente = null');
// Temporada de referencia: la activa si existe (aunque STATE.season apunte a otra)
const conActiva = [{ number: 1, game: 'PES 4', status: 'finished' }, { number: 2, game: 'PES 5', status: 'active' }, { number: 3, game: 'PES 5', status: 'finished' }];
assert(YUNACOINS_RULES.temporadaActualDelJuego(conActiva, 1).juego === 'PES5', 'temporadaActualDelJuego: usa la activa (PES5) aunque STATE.season sea 1');
assert(YUNACOINS_RULES.temporadaActualDelJuego(conActiva, 1).ordinal === 1, 'temporadaActualDelJuego: la activa es la 1.ª de PES5');
const sinActiva = [{ number: 1, game: 'PES 4', status: 'finished' }, { number: 2, game: 'PES 5', status: 'finished' }];
assert(YUNACOINS_RULES.temporadaActualDelJuego(sinActiva, 2).juego === 'PES5', 'temporadaActualDelJuego: sin activa usa STATE.season');
// validarReglas con topesAtributo
assert(YUNACOINS_RULES.validarReglas(R).length === 0, 'validarReglas: DEFAULT_RULES (topes [90]) valido');
assert(YUNACOINS_RULES.validarReglas(Object.assign({}, R, { topesAtributo: [] })).length === 0, 'validarReglas: lista vacia valida');
assert(YUNACOINS_RULES.validarReglas(Object.assign({}, R, { topesAtributo: [90, 85] })).length > 0, 'validarReglas: topes que bajan son invalidos');
assert(YUNACOINS_RULES.validarReglas(Object.assign({}, R, { topesAtributo: [100] })).length > 0, 'validarReglas: tope 100 es invalido');
assert(YUNACOINS_RULES.normalizarReglas({ topesAtributo: [88, 92] }).topesAtributo.join(',') === '88,92', 'normalizarReglas conserva topesAtributo');
console.log('');

/* ============================================================
   TEMPORADA DE COBRO (COBRO-1)
   ============================================================ */
console.log('--- Temporada de cobro ---');
const cobroSeasons = [
  { number: 1, name: 'T3', game: 'PES 4', status: 'finished' },
  { number: 2, name: 'T1', game: 'PES 5', status: 'active' },
];
assert(YUNACOINS_RULES.temporadaDeCobro(cobroSeasons, 1, [1]) === 2, 'temporadaDeCobro: hay activa (2) y la UI tiene 1 → cobra en 2');
assert(YUNACOINS_RULES.temporadaDeCobro(cobroSeasons, 1) === 2, 'temporadaDeCobro: sin lista de archivadas, la activa sigue contando');
const cobroSinActiva = [{ number: 1, name: 'T3', status: 'finished' }];
assert(YUNACOINS_RULES.temporadaDeCobro(cobroSinActiva, 1, [1]) === 1, 'temporadaDeCobro: no hay activa → stateSeason (1)');
assert(YUNACOINS_RULES.temporadaDeCobro([], 5) === 5, 'temporadaDeCobro: sin temporadas → stateSeason');
assert(YUNACOINS_RULES.temporadaDeCobro(cobroSeasons, 1, [2]) === 1, 'temporadaDeCobro: la activa está archivada → no cuenta (cae a stateSeason 1)');
assert(YUNACOINS_RULES.temporadaDeCobro([{ number: 2, status: 'active' }], 2, [2]) === 2, 'temporadaDeCobro: activa archivada y stateSeason también → stateSeason (la guardia lo rechaza)');
const vOk = YUNACOINS_RULES.validarTemporadaCobro(cobroSeasons, 2, [1]);
assert(vOk.ok === true && vOk.motivo === '', 'validarTemporadaCobro: activa no archivada → ok');
const vFin = YUNACOINS_RULES.validarTemporadaCobro(cobroSeasons, 1, [1]);
assert(vFin.ok === false && /archivada/.test(vFin.motivo), 'validarTemporadaCobro: T3 archivada y finalizada → rechazada (archivada)');
assert(YUNACOINS_RULES.validarTemporadaCobro([{ number: 3, name: 'T2', status: 'finished' }], 3, []).ok === false, 'validarTemporadaCobro: finalizada no archivada → rechazada');
assert(/no está activa/.test(YUNACOINS_RULES.validarTemporadaCobro([{ number: 3, name: 'T2', status: 'finished' }], 3, []).motivo), 'validarTemporadaCobro: motivo dice que no está activa');
assert(YUNACOINS_RULES.validarTemporadaCobro(cobroSeasons, 9, []).ok === false, 'validarTemporadaCobro: temporada inexistente → rechazada');
assert(YUNACOINS_RULES.validarTemporadaCobro([{ number: 2, name: 'T1', status: 'active' }], 2, [2]).ok === false, 'validarTemporadaCobro: activa archivada → rechazada');
assert(/no hay temporada activa/.test(YUNACOINS_RULES.validarTemporadaCobro(cobroSinActiva, 1, [1]).motivo), 'validarTemporadaCobro: sin activa, el motivo lo dice');
assert(!/no hay temporada activa/.test(YUNACOINS_RULES.validarTemporadaCobro(cobroSeasons, 1, [1]).motivo), 'validarTemporadaCobro: con activa, el motivo no lo dice (T3 archivada)');
console.log('');

/* ---- EMP-80-1 · Emparejar a N (cambiosEmparejar, motivoRechazoEmparejar, nivelEmparejar) ---- */
assert(R.nivelEmparejar === 80, 'DEFAULT_RULES.nivelEmparejar = 80');
const jEmp = { atributos: { Ataque: 79, Defensa: 85, Equilibrio: 80, Salto: 40, _ancho_bits: 7 }, escala8: { 'Estabilidad': 3 }, habilidades: { Regate: true } };
const eCam = YUNACOINS_RULES.cambiosEmparejar(jEmp, 80);
assert(eCam.atributos.Ataque === 80 && eCam.atributos.Salto === 80, 'cambiosEmparejar: sube los atributos por debajo de 80 (79→80, 40→80)');
assert(!('Defensa' in eCam.atributos), 'cambiosEmparejar: un atributo en 85 no baja (no aparece)');
assert(!('Equilibrio' in eCam.atributos), 'cambiosEmparejar: un atributo en exactamente 80 no se toca');
assert(!('_ancho_bits' in eCam.atributos), 'cambiosEmparejar: ignora la metadata _ancho_bits');
assert(eCam.total === 0 && eCam.lineas.length === 2, 'cambiosEmparejar: costo 0 y dos líneas');
assert(eCam.lineas.every(l => l.a === 80 && l.de < 80), 'cambiosEmparejar: lineas de → a van hacia el nivel desde abajo');
assert(!('escala8' in eCam) && !('habilidades' in eCam) && !('Estabilidad' in eCam.atributos), 'cambiosEmparejar: no toca escala 1-8 ni habilidades');
assert(Object.keys(YUNACOINS_RULES.cambiosEmparejar({ atributos: { A: 90 } }, 80).atributos).length === 0, 'cambiosEmparejar: todo por encima del nivel → sin cambios');
assert(Object.keys(YUNACOINS_RULES.cambiosEmparejar(jEmp, 0).atributos).length === 0 && Object.keys(YUNACOINS_RULES.cambiosEmparejar(jEmp, 100).atributos).length === 0, 'cambiosEmparejar: nivel fuera de 1-99 → sin cambios');
assert(Object.keys(YUNACOINS_RULES.cambiosEmparejar(jEmp, 79.5).atributos).length === 0, 'cambiosEmparejar: nivel no entero → sin cambios');
assert(Object.keys(YUNACOINS_RULES.cambiosEmparejar(null, 80).atributos).length === 0, 'cambiosEmparejar: jugador nulo → sin cambios (no lanza)');
const cambiosOk = { atributos: { Ataque: 80, Salto: 80 } };
assert(YUNACOINS_RULES.motivoRechazoEmparejar(jEmp, cambiosOk, 80, null) === null, 'motivoRechazoEmparejar: pedido igual a lo que hay que emparejar → ok');
assert(/plantilla desactualizada|ya no coincide/.test(YUNACOINS_RULES.motivoRechazoEmparejar(jEmp, { atributos: { Ataque: 80 } }, 80, null) || ''), 'motivoRechazoEmparejar: falta Salto → rechaza (desactualizada)');
assert(/nivel de emparejar/.test(YUNACOINS_RULES.motivoRechazoEmparejar(jEmp, { atributos: { Ataque: 85, Salto: 80 } }, 80, null) || ''), 'motivoRechazoEmparejar: valor por encima del nivel → rechaza');
assert(/tope/.test(YUNACOINS_RULES.motivoRechazoEmparejar(jEmp, cambiosOk, 80, 79) || ''), 'motivoRechazoEmparejar: supera el tope de temporada → rechaza');
assert(/solo puede tocar atributos/.test(YUNACOINS_RULES.motivoRechazoEmparejar(jEmp, { atributos: cambiosOk.atributos, escala8: { Estabilidad: 5 } }, 80, null) || ''), 'motivoRechazoEmparejar: toca escala → rechaza');
assert(/no hay atributos/.test(YUNACOINS_RULES.motivoRechazoEmparejar(jEmp, { atributos: {} }, 80, null) || ''), 'motivoRechazoEmparejar: sin atributos → rechaza');
assert(/desactualizada/.test(YUNACOINS_RULES.motivoRechazoEmparejar(jEmp, { atributos: { Ataque: 80, Salto: 60 } }, 80, null) || ''), 'motivoRechazoEmparejar: el save cambió (valor distinto de lo esperado) → rechaza');
assert(/nivel de emparejar inválido/.test(YUNACOINS_RULES.motivoRechazoEmparejar(jEmp, cambiosOk, 120, null) || ''), 'motivoRechazoEmparejar: nivel inválido → rechaza');
assert(YUNACOINS_RULES.validarReglas(Object.assign({}, R, { nivelEmparejar: 85 })).length === 0, 'validarReglas: nivelEmparejar 85 es válido');
assert(YUNACOINS_RULES.validarReglas(Object.assign({}, R, { nivelEmparejar: 1 })).length === 0 && YUNACOINS_RULES.validarReglas(Object.assign({}, R, { nivelEmparejar: 99 })).length === 0, 'validarReglas: límites 1 y 99 válidos');
assert(YUNACOINS_RULES.validarReglas(Object.assign({}, R, { nivelEmparejar: 0 })).some(e => /nivelEmparejar/.test(e)), 'validarReglas: nivelEmparejar 0 → error');
assert(YUNACOINS_RULES.validarReglas(Object.assign({}, R, { nivelEmparejar: 100 })).some(e => /nivelEmparejar/.test(e)), 'validarReglas: nivelEmparejar 100 → error');
assert(YUNACOINS_RULES.validarReglas(Object.assign({}, R, { nivelEmparejar: 80.5 })).some(e => /nivelEmparejar/.test(e)), 'validarReglas: nivelEmparejar 80.5 (no entero) → error');
assert(YUNACOINS_RULES.validarReglas(Object.assign({}, R, { nivelEmparejar: '80' })).some(e => /nivelEmparejar/.test(e)), 'validarReglas: nivelEmparejar como texto → error');
assert(YUNACOINS_RULES.normalizarReglas({ maxPositions: 5 }).nivelEmparejar === 80, 'normalizarReglas: sin nivelEmparejar → 80 por defecto');
assert(YUNACOINS_RULES.normalizarReglas({ nivelEmparejar: 85 }).nivelEmparejar === 85, 'normalizarReglas: respeta nivelEmparejar válido (85)');
assert(YUNACOINS_RULES.normalizarReglas({ nivelEmparejar: 200 }).nivelEmparejar === 80, 'normalizarReglas: nivelEmparejar inválido → cae al default completo (80)');
console.log('');

console.log(`\n${fallas === 0 ? 'TODO OK' : fallas + ' FALLO(S)'}`);
process.exit(fallas === 0 ? 0 : 1);
