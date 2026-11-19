'use strict';
/* ============================================================
   YUNACOINS_RULES — reglas de costo compartidas (Slice D.R)
   ------------------------------------------------------------
   Modulo puro, SIN DOM: se puede cargar tanto en un <script> de
   navegador (define window.YUNACOINS_RULES) como en Node (para el
   test tools/test-yunacoins-rules.js, via module.exports).

   Origen: hasta este slice las reglas de costo vivian SOLO dentro
   de mejoras.html. Este modulo las porta EXACTAMENTE
   (mismos numeros, misma logica) para que:
     - mejoras.html (editor del presidente) las use
       en vez de su copia local (sin cambiar ningun costo mostrado).
     - pes5-tool.html (Slice D.R, admin) pueda cobrar desde la tool
       con las MISMAS reglas y dejar el MISMO rastro en `coins`/`teams`
       que un pedido del presidente (ver macro-slice D.R).

   Referencias de linea = mejoras.html ANTES de este
   slice (ver commit previo a este cambio). OJO: BAND-1 corrigio el tramo
   de 80 (ver `BAND_MAX` abajo): el editor ya no tiene su copia propia y las
   bandas quedan SOLO aca; los numeros de linea son historicos:
     - DEFAULT_RULES      ~linea 630
     - BAND_MAX            linea 639 (antes [79,85,90,95,99]; ahora [80,...])
     - bandCost99          linea 652
     - costRange99         linea 656
     - HEIGHT_CAPS          linea 691
     - heightBracket/Count  lineas 693-700
     - budget de dos niveles (presidentWallet/budgetGeneral/budgetSubscribers)
       y remainingForPlayer  lineas 861-897

   ------------------------------------------------------------
   ACTUALIZACION (macro-slice D.R, punto 5 — resuelto 15/09):
     - `presidentWallet` DEJA de ser un valor de regla: el saldo real de
       cada equipo es `teams.yunacoin`, se pasa explicito a
       `techoPresupuesto(walletReal, rules)`. Nunca se lee de DEFAULT_RULES.
     - Orden de consumo (BONO-3): SOLO un jugador con «$» (suscriptor,
       `subscriber: true`) gasta primero el bono de suscriptores; agotado el
       bono, el resto sale del tope general. Un jugador sin «$» gasta solo del
       tope general: nunca toca el bono. Ver `distribuirCosto`.
     - Los topes de temporada (`budgetGeneral`/`budgetSubscribers`) no se
       guardan en `teams`: se derivan del libro `coins` (`gastoTemporada`)
       filtrando `season` actual + `reason` que empieza con 'mejora PES5'.
     - `puedePagar` real = saldo real >= total Y los topes de temporada no
       se exceden (general para todos, bono solo para suscriptores) — ver `evaluarPago`.
     - 4.F + BONO-3: el TECHO de un jugador nunca supera el saldo real del equipo.
         suscriptor («$»): techo = min(saldo, topeGeneralRestante + bonoRestante)
         sin «$»: techo = min(saldo, topeGeneralRestante)
       Lo calcula `bonoSuscriptor(pool, esSuscriptor)` con pool = {saldo,
       general, subscribers}. `saldo` es `teams.yunacoin` (en el editor del
       presidente, menos lo reservado en pedidos pendientes). El COBRO NO
       cambia: todo se paga con los YunaCoins del equipo (`evaluarPago` exige
       saldo >= total) y el neto pendiente usa el `amount` completo del
       movimiento, bono incluido (`netoPendiente`).
     - 4.G (Plan B apagable): `transporte` en settings/yunacoinsSync. 'manual' es
       el default (copiar y pegar, la unica implementacion en la 2.0); 'api' es el
       Plan A (2.1). Sin campo o con otro valor, manual. `transporteDe(value)`.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.YUNACOINS_RULES = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  /* ---- valores por defecto (EXACTOS, portados de DEFAULT_RULES) ----
     `presidentWallet` (punto 5, macro-slice D.R) YA NO vive aca: el saldo
     real de un equipo es siempre `teams.yunacoin`, nunca un numero fijo de
     regla. Se pasa explicito a `techoPresupuesto(walletReal, rules)`. */
  const DEFAULT_RULES = {
    bandCosts: [50, 100, 250, 500, 1000],   // hasta 80, 81-85, 86-90, 91-95, 96-99 (BAND-1: el 80 cuesta 50)
    scale8Cost: 250,                        // Consistency/Condition/Weak foot (escala 4-8, o 1-8 en el save real)
    abilityCost: 500,                       // habilidad especial (estrella)
    injuryCost: 250,                        // por nivel de Res. lesion (C->B->A)
    budgetGeneral: 50000,                   // tope de temporada: lo maximo que se puede gastar en mejoras generales
    budgetSubscribers: 25000,               // bono por jugador suscriptor (× suscriptores del equipo, bonoEquipo)
    maxPositions: 5,                        // maximo de posiciones marcadas por jugador (el juego permite hasta 12)
    topesAtributo: [90],                    // tope absoluto de atributos 0-99 por temporada del juego: [0] = 1.ª temporada del juego, [1] = 2.ª, ...; si falta un valor se hereda el último
    // EMP-80-1: sin numeros por defecto. Luis define los perfiles en Reglas (ver validarEmparejar).
    emparejar: { base: { min: null, max: null, subir: false, lesion: null, escala8: null }, suscriptor: { min: null, max: null, subir: false, lesion: null, escala8: null } },
  };

  /* techo superior (inclusive) de cada banda de costo. BAND-1: el primer
     tramo llega hasta 80 inclusive (el punto de 79 a 80 cuesta 50, no 100).
     Desde 81 en adelante no cambia nada. */
  const BAND_MAX = [80, 85, 90, 95, 99];

  /* cupos por franja de altura (Categoria 2, MD seccion 2), EXACTOS */
  const HEIGHT_CAPS = { hi: 2, mid: 7, lo: 8 };
  const HEIGHT_BRACKET_LABEL = { hi: '≥198 cm', mid: '190-197 cm', lo: '186-189 cm' };

  /* orden de mejora de resistencia a lesiones, EXACTO del editor */
  const INJURY_ORDER = ['C', 'B', 'A'];

  /* ---- costo de atributos 0-99 (bandas) ---- */
  // bandCost99(dest): costo de UN punto que hace que el atributo llegue a
  // `dest`. Recorre BAND_MAX y devuelve rules.bandCosts[i] de la primera
  // banda que cubre a `dest`. Antes era copia de la linea 652-655 del editor;
  // desde BAND-1 la fuente unica es esta (el editor la importa de aca).
  function bandCost99(dest, rules) {
    const r = rules || DEFAULT_RULES;
    for (let i = 0; i < BAND_MAX.length; i++) {
      if (dest <= BAND_MAX[i]) return r.bandCosts[i];
    }
    return r.bandCosts[r.bandCosts.length - 1];
  }

  // costRange99(from,to): suma bandCost99 para cada punto entre from+1 y to
  // (si to<=from, el bucle no corre y devuelve 0 — subir cuesta, bajar es
  // gratis). Antes copia de la linea 656-660 del editor (ver BAND-1).
  function costRange99(from, to, rules) {
    let sum = 0;
    for (let v = from + 1; v <= to; v++) sum += bandCost99(v, rules);
    return sum;
  }

  /* ---- EMP-80-2 · tramo gratis dentro del perfil ----
     Los puntos de un atributo 0-99 que caen dentro del rango del perfil (min..max) cuestan 0; el resto
     se cobra con la banda normal. Solo atributos 0-99: escala 1-8, habilidades y lesiones nunca tienen
     tramo gratis. Sin perfil (fichaje, leyenda, perfil null) todo se cobra igual que antes. */
  // Puntos gratis de subir `campo` de `de` a `a` con `perfil` ('base' | 'suscriptor' | null).
  function tramoGratis(campo, de, a, perfil, cfg) {
    if (!perfil || typeof campo !== 'string' || campo.charAt(0) === '_') return 0;
    if (typeof de !== 'number' || typeof a !== 'number' || a <= de) return 0;
    const r = rangoEmparejar(cfg, perfil);
    if (!r) return 0;
    const desde = Math.max(de + 1, r.min), hasta = Math.min(a, r.max);
    return hasta >= desde ? hasta - desde + 1 : 0;
  }
  // Costo de subir `campo` de `de` a `a` con su perfil: cada punto gratis vale 0, los demas la banda.
  function costoAtributoConPerfil(campo, de, a, perfil, cfg, rules) {
    if (typeof de !== 'number' || typeof a !== 'number' || a <= de) return 0;
    let sum = 0;
    for (let v = de + 1; v <= a; v++) {
      if (tramoGratis(campo, v - 1, v, perfil, cfg) === 1) continue;
      sum += bandCost99(v, rules);
    }
    return sum;
  }

  /* ---- altura: franja + cupo (Categoria 2) ---- */
  function heightBracket(h) {
    if (h >= 198) return 'hi';
    if (h >= 190) return 'mid';
    if (h >= 186) return 'lo';
    return null;
  }
  // heightBracketCount(jugadores, bracket, excludeId): cuenta cuantos
  // jugadores de la lista (plantel completo) ya ocupan una franja de altura,
  // excluyendo al que se esta editando. `jugadores` debe traer `.id` y
  // `.height` (mismo shape que PLAYERS en el editor o PLANTILLA_ACTUAL en
  // la tool). Misma logica que heightBracketCount del editor (linea 699).
  function heightBracketCount(jugadores, bracket, excludeId) {
    return (jugadores || []).filter(function (p) {
      return p.id !== excludeId && heightBracket(p.height) === bracket;
    }).length;
  }

  /* ============================================================
     BONO DE SUSCRIPTOR — RESUELTO (macro-slice D.R, punto 5, 15/09)
     ------------------------------------------------------------
     Modelo definitivo (con el ejemplo del usuario): el presidente tiene
     400.000 yunas acumuladas (`teams.yunacoin`, el saldo REAL, un solo
     numero). Por temporada puede gastar en mejoras hasta un TOPE GENERAL
     (regla, ej. 100.000) sobre cualquier jugador, mas un BONO DE
     SUSCRIPTORES (regla, ej. 20.000) que SOLO pueden usar los jugadores con
     «$» del equipo. Todo descuenta del saldo real: la transaccion en `coins`
     lleva `amount = fromGeneral + fromSub`.

     BONO-3 (decision de Jimbo y Luis, reemplaza a BONO-2): el bono vuelve a ser
     SOLO para suscriptores («$»). Un jugador con «$» consume primero el bono y,
     agotado, sigue con el tope general; uno sin «$» gasta solo del tope general.
     El tamaño del bono sigue siendo del equipo: `budgetSubscribers` × suscriptores
     del equipo (`bonoEquipo`). El cobro sale siempre del saldo real (el bono no
     regala monedas).

     `techoPresupuesto(walletReal, rules)` arma el pool `{general,
     subscribers}` de una sesion: `general` es `Math.min(walletReal,
     rules.budgetGeneral)` — el saldo real SIEMPRE se pasa como parametro
     (nunca se lee de un numero de regla, punto 5a). `bonoSuscriptor(pool,
     esSuscriptor)` es el TECHO visible para un jugador (cuanto puede llegar a
     gastar en total, sin importar el orden); el orden solo afecta COMO se reparte
     un costo ya calculado entre bono y general (`distribuirCosto`, mas abajo).
     4.F: el techo nunca supera el saldo real (`bonoSuscriptor` lo aplica; ver cabecera).

     Los topes de TEMPORADA (`budgetGeneral`/`budgetSubscribers`) no se
     guardan en `teams`: se derivan del libro `coins` filtrando `season`
     actual + `reason` que empiece con 'mejora PES5' (`gastoTemporada` /
     `topesRestantes`, mas abajo) — cada transaccion de mejora lleva su
     propio desglose `pes5.fromGeneral`/`pes5.fromSub` para poder
     recomputarlos (punto 5c/5d del macro-slice).
     ============================================================ */
  /* BONO-1: bono de suscriptores de UN equipo = regla por jugador suscriptor × cantidad de
     jugadores suscriptores del equipo (los que tienen «$» delante del nombre, igual que
     `subscriber`). Ej.: regla 10.000 → 1 suscriptor = 10.000; 4 suscriptores = 40.000.
     Sin el conteo (undefined) vale 0: quien llama tiene que pasarlo. Es responsivo: se
     recalcula con cada plantilla o save. */
  function bonoEquipo(rules, nSuscriptores) {
    const r = rules || DEFAULT_RULES;
    const porJugador = Math.max(0, Number(r.budgetSubscribers) || 0);
    const n = Math.max(0, Math.floor(Number(nSuscriptores) || 0));
    return porJugador * n;
  }
  function techoPresupuesto(walletReal, rules, nSuscriptores) {
    const r = rules || DEFAULT_RULES;
    const saldo = Math.max(0, walletReal || 0);
    return {
      saldo: saldo,
      general: Math.min(saldo, r.budgetGeneral),
      subscribers: bonoEquipo(r, nSuscriptores),
    };
  }
  /* 4.F + BONO-3: TECHO de gasto de UN jugador, nunca mayor que el saldo real.
     pool = {saldo, general, subscribers} (general y subscribers son lo que queda de cada
     tope de temporada). BONO-3: el bono es solo para suscriptores («$»), así que el techo es
     general + bono para un suscriptor y solo general para el resto (ej.: general 120.000 +
     3 suscriptores × 10.000 = 150.000 para un «$», 120.000 para uno sin «$»).
     Sin `saldo` en el pool no hay tope por saldo. */
  function bonoSuscriptor(pool, esSuscriptor) {
    if (!pool) return 0;
    const general = pool.general || 0;
    const subscribers = pool.subscribers || 0;
    const techo = esSuscriptor ? general + subscribers : general;
    if (pool.saldo == null) return techo;
    return Math.min(Math.max(0, pool.saldo), techo);
  }

  /* ============================================================
     distribuirCosto — reparte el costo TOTAL ya calculado (costoCambios)
     de la edicion de UN jugador entre bono de suscriptores y tope general.
     BONO-3: el bono es solo para suscriptores («$»):
       - suscriptor (`esSuscriptor` true): `fromSub = min(cost, subscribersRestantes)`,
         `fromGeneral = cost - fromSub` (el resto, sin techo propio aca —
         si excede el tope general de temporada, eso lo detecta
         `evaluarPago`/`topesRestantes`, no esta funcion).
       - no suscriptor: todo `fromGeneral`, `fromSub` siempre 0.
     El bono va primero para el suscriptor (el orden que ya usaba la regla).
     `subscribersRestantes` es lo que queda del BONO en este momento (tope
     de regla menos lo ya gastado esta temporada y, si se estan repartiendo
     varios jugadores en un mismo lote, menos lo ya asignado a jugadores
     anteriores del mismo lote — ver pes5-tool.js > repartoPendienteEquipo).
     ============================================================ */
  function distribuirCosto(cost, subscribersRestantes, esSuscriptor) {
    const c = cost || 0;
    if (!esSuscriptor) return { fromGeneral: c, fromSub: 0 };
    const fromSub = Math.min(c, Math.max(0, subscribersRestantes || 0));
    return { fromGeneral: c - fromSub, fromSub: fromSub };
  }

  /* ============================================================
     gastoTemporada / topesRestantes — derivan cuanto queda de cada tope de
     temporada SIN guardar nada nuevo en `teams` (punto 5c del macro-slice):
     se recorre el libro `coins` (ya filtrado por el llamador: `season`
     actual + `teamId` + `reason` que empieza con 'mejora PES5' — el filtro
     de coleccion no es responsabilidad de este modulo puro) y se suma el
     desglose `pes5.fromGeneral`/`pes5.fromSub` de cada transaccion.
     ============================================================ */
  function gastoTemporada(transacciones) {
    let general = 0, sub = 0;
    (transacciones || []).forEach(function (t) {
      const meta = (t && t.pes5) || {};
      general += meta.fromGeneral || 0;
      sub += meta.fromSub || 0;
    });
    return { general: general, sub: sub };
  }
  /* ============================================================
     Tope extra por equipo (premio del admin a campeones o buen desempeño)
     ------------------------------------------------------------
     Se guarda por temporada en pes5_config/topesExtra-<temporada>, campo
     `equipos: {<teamId>: {extra, motivo}}`. Suma al tope GENERAL de
     temporada de ese equipo; no toca el bono de suscriptores ni da
     YunaCoins: el equipo sigue pagando con su saldo.
     ============================================================ */
  function normalizarTopesExtra(data) {
    const out = {};
    const eq = data && data.equipos;
    if (!eq || typeof eq !== 'object') return out;
    Object.keys(eq).forEach(function (id) {
      const e = eq[id] || {};
      const n = Math.floor(Number(e.extra));
      if (Number.isFinite(n) && n > 0) {
        out[String(id)] = { extra: n, motivo: typeof e.motivo === 'string' ? e.motivo.slice(0, 100) : '' };
      }
    });
    return out;
  }
  function extraDeEquipo(topesExtra, teamId) {
    const e = topesExtra && teamId != null ? topesExtra[String(teamId)] : null;
    return e ? e.extra : 0;
  }
  function reglasConExtra(rules, extra) {
    const r = Object.assign({}, rules || DEFAULT_RULES);
    const n = Math.floor(Number(extra));
    if (Number.isFinite(n) && n > 0) r.budgetGeneral = (r.budgetGeneral || 0) + n;
    return r;
  }

  /* BONO-1: nSuscriptores = jugadores suscriptores del equipo AHORA (ver bonoEquipo). Lo ya gastado
     del bono (libro coins) se descuenta del bono nuevo: si el equipo tenia 1 suscriptor y gasto
     20.000 y ahora tiene 4 (bono 40.000), quedan 20.000; si baja a 1 (bono 10.000), queda 0. */
  function topesRestantes(gastado, rules, nSuscriptores) {
    const r = rules || DEFAULT_RULES;
    const g = (gastado && gastado.general) || 0;
    const s = (gastado && gastado.sub) || 0;
    return {
      general: Math.max(0, r.budgetGeneral - g),
      subscribers: Math.max(0, bonoEquipo(r, nSuscriptores) - s),
    };
  }

  /* ============================================================
     BONO-5 · bono POR JUGADOR (reemplaza la bolsa del equipo de BONO-3)
     ------------------------------------------------------------
     Cada jugador con «$» tiene su PROPIO bono de `budgetSubscribers` por
     temporada y solo se puede gastar en ESE jugador. No es una bolsa común:
     lo que gasta A no le quita bono a B. El cobro sigue saliendo del saldo del
     equipo; el bono solo amplía cuánto de un jugador puede salir del bono en
     lugar del tope general.

     `gastoBonoJugador` suma lo que ESE jugador ya consumió de su bono:
       - movimientos del libro `coins` de la temporada (el llamador ya filtró
         temporada/equipo y `reason` que empieza con 'mejora PES5') con
         `pes5.playerId` == `playerId`: se suma `pes5.fromSub` (un reembolso
         trae `fromSub` negativo y devuelve bono);
       - sus pedidos pendientes (`estado` 'pendiente' o sin estado): se suma
         su `fromSub` ya repartido.
     `bonoRestanteJugador` devuelve max(0, porJugador - gasto) si el jugador
     tiene «$»; 0 si no. Sin `porJugador` usa la regla `budgetSubscribers`.
     Comparaciones por String: `playerId` puede venir como número o texto.
     ============================================================ */
  function gastoBonoJugador(transacciones, pendientes, playerId) {
    if (playerId == null) return 0;
    const id = String(playerId);
    let gastado = 0;
    (transacciones || []).forEach(function (t) {
      if (!t || !t.pes5 || t.pes5.playerId == null) return;
      if (typeof t.reason === 'string' && t.reason.indexOf('mejora PES5') !== 0) return;
      if (String(t.pes5.playerId) !== id) return;
      gastado += Number(t.pes5.fromSub) || 0;
    });
    (pendientes || []).forEach(function (p) {
      if (!p || p.playerId == null) return;
      if (p.estado && p.estado !== 'pendiente') return;
      if (String(p.playerId) !== id) return;
      gastado += Number(p.fromSub) || 0;
    });
    return gastado;
  }
  function bonoRestanteJugador(transacciones, pendientes, playerId, porJugador, esSuscriptor) {
    if (!esSuscriptor) return 0;
    const cuota = porJugador == null
      ? Math.max(0, Number(DEFAULT_RULES.budgetSubscribers) || 0)
      : Math.max(0, Number(porJugador) || 0);
    return Math.max(0, cuota - gastoBonoJugador(transacciones, pendientes, playerId));
  }

  /* ============================================================
     resumenPresupuesto (slice 2.1-A) — arma los numeros del aviso grande del
     editor de mejoras. Puro: no lee Firestore ni el DOM.
       - saldo: saldo real del equipo (teams.yunacoin).
       - reglas: reglas BASE, SIN el tope extra (budgetGeneral, budgetSubscribers).
       - extra: tope extra del equipo esta temporada (0 si no tiene).
       - gastado: {general, sub} de gastoTemporada (libro coins, sin pendientes).
       - pendientes: {total, general, sub} ya reservado: pedidos pendientes
         propios (presidente) o cambios de otros jugadores (admin). No incluye
         la edicion en curso.
     Devuelve:
       saldoDisponible  saldo menos lo reservado (lo que el aviso muestra como saldo).
       topeGeneral, extra, topeTotal   tope general de base, extra y su suma.
       gastadoGeneral, gastadoSub      lo gastado de la temporada.
       restanteGeneral, restanteSub    lo que queda de cada tope (ya descontado lo reservado).
        disponibleBase         min(saldoDisponible, restanteGeneral): techo de un jugador SIN «$».
        disponibleAhora        min(saldoDisponible, restanteGeneral + restanteSub): techo de un jugador CON «$».
        disponibleSuscriptor   alias de disponibleAhora (BONO-3: el bono es solo para «$»).
       limitaPor             'saldo' o 'tope': cual de los dos es el limite de disponibleAhora.
       bonoSoloSuscriptores  true: la UI puede aclarar que el bono es solo para «$».
     ============================================================ */
  function resumenPresupuesto(opts) {
    const o = opts || {};
    const r = o.reglas || DEFAULT_RULES;
    const saldo = Math.max(0, Number(o.saldo) || 0);
    const extra = Math.max(0, Math.floor(Number(o.extra) || 0));
    const gastado = o.gastado || {};
    const pend = o.pendientes || {};
    const topeGeneral = Math.max(0, Number(r.budgetGeneral) || 0);
    const topeSub = bonoEquipo(r, o.nSuscriptores); // BONO-1: por jugador suscriptor × suscriptores del equipo
    const topeTotal = topeGeneral + extra;
    const gastadoGeneral = Math.max(0, Number(gastado.general) || 0);
    const gastadoSub = Math.max(0, Number(gastado.sub) || 0);
    const saldoDisponible = Math.max(0, saldo - (Number(pend.total) || 0));
    const restanteGeneral = Math.max(0, topeTotal - gastadoGeneral - (Number(pend.general) || 0));
    const restanteSub = Math.max(0, topeSub - gastadoSub - (Number(pend.sub) || 0));
    return {
      saldoDisponible: saldoDisponible,
      topeGeneral: topeGeneral,
      extra: extra,
      topeTotal: topeTotal,
      gastadoGeneral: gastadoGeneral,
      gastadoSub: gastadoSub,
      restanteGeneral: restanteGeneral,
      restanteSub: restanteSub,
      disponibleBase: Math.min(saldoDisponible, restanteGeneral),
      disponibleAhora: Math.min(saldoDisponible, restanteGeneral + restanteSub),
      disponibleSuscriptor: Math.min(saldoDisponible, restanteGeneral + restanteSub),
      limitaPor: saldoDisponible < restanteGeneral + restanteSub ? 'saldo' : 'tope',
      bonoSoloSuscriptores: true,
    };
  }

  /* ============================================================
     COINS1 · resumenCarga — lo que le SIRVE cargar a Luis a un equipo en el
     modal de Agregar YuNaCoins (el «banco»: pasa coins de Streamlabs a la
     web). Puro: no lee Firestore ni el DOM, todo viene en `opts`:
       reglas         reglas base de la temporada (budgetGeneral, budgetSubscribers).
       extra          tope extra del equipo esta temporada (0 si no tiene).
       nSuscriptores  jugadores con «$» en la plantilla publicada del equipo.
       gastado        {general, sub} de gastoTemporada (libro coins).
       saldo          saldo real del equipo (teams.yunacoin).
     Devuelve:
       topeGeneral   tope base de la temporada.
       extra         tope extra del equipo (premio).
       bono          bono de suscriptores (regla por jugador × suscriptores).
       topeTotal     topeGeneral + extra + bono.
       gastadoTotal  lo gastado en la temporada (general + bono).
       restanteGeneral  lo que queda del tope general (base + extra, sin negativo).
       restanteBono     lo que queda del bono de suscriptores (sin negativo).
       restante      restanteGeneral + restanteBono: lo que todavía puede gastar
                     en mejoras (por tope, sin compensar uno con el otro).
       restanteSuscriptor  alias de restante (BONO-3: el máximo lo alcanza un «$»).
       saldo         saldo actual del equipo.
       sirveCargar   lo que le falta de saldo para llegar a `restante`; nunca
                     negativo (si ya le alcanza, 0). No mira el saldo del
                     bono aparte: es un solo numero para el modal.
       bonoSoloSuscriptores  true: el bono es solo para jugadores con «$».
     Un reembolso resta del gasto (`fromGeneral`/`fromSub` negativos), asi que
     `restante` vuelve a subir sin tocar `teams`.
     ============================================================ */
  function resumenCarga(opts) {
    const o = opts || {};
    const r = o.reglas || DEFAULT_RULES;
    const saldo = Math.max(0, Number(o.saldo) || 0);
    const extra = Math.max(0, Math.floor(Number(o.extra) || 0));
    const gastado = o.gastado || {};
    const topeGeneral = Math.max(0, Number(r.budgetGeneral) || 0);
    const bono = bonoEquipo(r, o.nSuscriptores);
    const gastadoGeneral = Number(gastado.general) || 0;
    const gastadoSub = Number(gastado.sub) || 0;
    const restanteGeneral = Math.max(0, topeGeneral + extra - gastadoGeneral);
    const restanteBono = Math.max(0, bono - gastadoSub);
    const restante = restanteGeneral + restanteBono;
    return {
      topeGeneral: topeGeneral,
      extra: extra,
      bono: bono,
      topeTotal: topeGeneral + extra + bono,
      gastadoTotal: gastadoGeneral + gastadoSub,
      restanteGeneral: restanteGeneral,
      restanteBono: restanteBono,
      restante: restante,
      restanteSuscriptor: restante,
      saldo: saldo,
      sirveCargar: Math.max(0, restante - saldo),
      bonoSoloSuscriptores: true,
    };
  }

  /* ============================================================
     evaluarPago — version completa de `puedePagar` (punto 5 del
     macro-slice): "puedePagar = saldo real >= total Y los topes de
     temporada no se exceden (tope general para todos, bono solo para
     suscriptores)". El bono nunca puede "excederse" por si solo porque
     `distribuirCosto` ya lo clampea con `Math.min` — el unico exceso
     posible es que `fromGeneral` supere lo que queda del tope general de
     temporada. `fromGeneral`/`fromSub` deben venir de `distribuirCosto`
     (o de sumar varios `distribuirCosto` de un lote).
     ============================================================ */
  function evaluarPago(saldoReal, totalCosto, fromGeneral, restanteGeneral) {
    const excedeSaldo = (saldoReal || 0) < (totalCosto || 0);
    const excedeTopeGeneral = (fromGeneral || 0) > (restanteGeneral || 0);
    return {
      ok: !excedeSaldo && !excedeTopeGeneral,
      excedeSaldo: excedeSaldo,
      excedeTopeGeneral: excedeTopeGeneral,
    };
  }

  /* ============================================================
     costoCambios — NUEVO en este slice (no existia en el editor tal cual).
     ------------------------------------------------------------
     Combina bandCost99/costRange99/scale8Cost/abilityCost/injuryCost para
     calcular el costo total de un objeto de cambios con el MISMO shape que
     recibe `PES5_EDITOR.escribirJugadorCompleto` (ver js/pes5-editor.js):
       cambios = { atributos:{campo:valor}, escala8:{campo:valor},
                   habilidades:{campo:bool}, altura, edad, pieDominante,
                   lesiones }
     y un jugador original con el MISMO shape que
     `PES5_EDITOR.leerJugadorCompleto` (o `leerPlantillaCompleta`):
       jugadorOriginal = { atributos:{}, escala8:{}, habilidades:{},
                            altura, edad, pieDominante, lesiones, ... }

     Regla de direccion (IDENTICA a pendingCost()/pendingChangeLines() del
     editor, lineas 877-891 y 1020-1042): subir de banda/escala/lesion
     cuesta, bajar es gratis (costo 0); ganar una habilidad cuesta,
     perderla es gratis. `altura`, `edad` y `pieDominante` no tienen costo
     en las reglas actuales (igual que en el editor: pendingChangeLines
     siempre les pone `cost:0`).

     Decision de esta funcion (no es un numero, es un detalle de
     presentacion): el editor original, si el diff va "para atras" en
     escala8 o lesiones, calculaba un `cost` NEGATIVO en la linea del
     modal de confirmacion (aunque nunca lo sumaba al total — el total
     usa la misma guarda de direccion que aca). Esta funcion en cambio
     deja el costo de linea en 0 cuando no hay alza, para no mostrarle a
     Luis un numero negativo confuso en la tool. Los NUMEROS de costo
     (bandCosts, scale8Cost, abilityCost, injuryCost) son exactamente los
     mismos; lo unico que cambia es como se despliega un downgrade.
     ============================================================ */
  function costoCambios(jugadorOriginal, cambios, rules, ctx) {
    const r = rules || DEFAULT_RULES;
    const lineas = [];
    let total = 0;
    const p = jugadorOriginal || {};
    const c = cambios || {};
    // ctx (EMP-80-2, opcional): { perfil: 'base'|'suscriptor'|null, cfg: reglas.emparejar }.
    // Con perfil, el tramo dentro de su rango es gratis. Sin ctx, el costo es el de siempre.
    const perfil = ctx && ctx.perfil ? ctx.perfil : null;
    const cfgEmp = ctx ? ctx.cfg : null;

    if (c.atributos) {
      Object.keys(c.atributos).forEach(function (campo) {
        const de = (p.atributos || {})[campo];
        const a = c.atributos[campo];
        if (a === de) return;
        const costo = a > de
          ? (perfil ? costoAtributoConPerfil(campo, de, a, perfil, cfgEmp, r) : costRange99(de, a, r))
          : 0;
        const gratis = a > de && perfil ? tramoGratis(campo, de, a, perfil, cfgEmp) : 0;
        if (costo > 0) total += costo;
        lineas.push({ campo: campo, de: de, a: a, costo: costo, gratis: gratis });
      });
    }
    if (c.escala8) {
      Object.keys(c.escala8).forEach(function (campo) {
        const de = (p.escala8 || {})[campo];
        const a = c.escala8[campo];
        if (a === de) return;
        const costo = a > de ? (a - de) * r.scale8Cost : 0;
        if (costo > 0) total += costo;
        lineas.push({ campo: campo, de: de, a: a, costo: costo });
      });
    }
    if (c.habilidades) {
      Object.keys(c.habilidades).forEach(function (campo) {
        const de = !!(p.habilidades || {})[campo];
        const a = !!c.habilidades[campo];
        if (a === de) return;
        const costo = (a && !de) ? r.abilityCost : 0;
        if (costo > 0) total += costo;
        lineas.push({ campo: campo, de: de, a: a, costo: costo });
      });
    }
    if (c.lesiones !== undefined && c.lesiones !== p.lesiones) {
      const de = INJURY_ORDER.indexOf(p.lesiones);
      const a = INJURY_ORDER.indexOf(c.lesiones);
      const costo = a > de ? (a - de) * r.injuryCost : 0;
      if (costo > 0) total += costo;
      lineas.push({ campo: 'lesiones', de: p.lesiones, a: c.lesiones, costo: costo });
    }
    ['altura', 'edad', 'pieDominante'].forEach(function (campo) {
      if (c[campo] !== undefined && c[campo] !== p[campo]) {
        // sin costo en las reglas actuales — igual que pendingChangeLines()
        lineas.push({ campo: campo, de: p[campo], a: c[campo], costo: 0 });
      }
    });

    return { total: total, lineas: lineas };
  }

  /* Defensa de costo de una mejora (2.0-6.H). `jugadorActual` es el jugador del save AHORA
     (leerJugadorCompleto) y `total` el costo calculado con costoCambios. Devuelve el motivo
     de rechazo o null. Nunca baja un atributo ni una habilidad, y un pedido que toca
     atributos, escala u habilidades no puede costar 0. Lesiones, altura, pie, posiciones
     y banda no entran aca: su costo ya lo dice costoCambios. */
  /* EMP-80-2b: `ctx` = { perfil, cfg } (igual que costoCambios). Un total 0 es valido solo si TODO lo que
     sube es tramo gratis del perfil (cada punto dentro de [min, max]). Escala, habilidades y lesiones con
     cambios siempre cuestan: si el total da 0 con algo asi, el pedido se rechaza (protege contra pedidos manipulados). */
  function motivoRechazoMejora(jugadorActual, cambios, total, tope, ctx) {
    const c = cambios || {};
    const j = jugadorActual || {};
    const atr = c.atributos || {}, esc = c.escala8 || {}, hab = c.habilidades || {};
    for (const campo of Object.keys(atr)) {
      const de = (j.atributos || {})[campo], a = atr[campo];
      if (typeof de === 'number' && typeof a === 'number' && a < de) return campo + ' bajaría de ' + de + ' a ' + a;
    }
    // Tope de temporada (solo atributos 0-99). Un atributo que sube no puede pasar del
    // tope. Si el jugador ya está por encima (leyenda), conserva su valor pero no sube.
    if (typeof tope === 'number') {
      for (const campo of Object.keys(atr)) {
        const de = (j.atributos || {})[campo], a = atr[campo];
        if (typeof de === 'number' && typeof a === 'number' && a > de && a > tope) {
          return de >= tope
            ? campo + ' ya está en ' + de + ' y el tope de la temporada es ' + tope + ': no puede subir'
            : campo + ' subiría a ' + a + ' y el tope de la temporada es ' + tope;
        }
      }
    }
    for (const campo of Object.keys(esc)) {
      const de = (j.escala8 || {})[campo], a = esc[campo];
      if (typeof de === 'number' && typeof a === 'number' && a < de) return campo + ' bajaría de ' + de + ' a ' + a;
    }
    for (const campo of Object.keys(hab)) {
      if (!!(j.habilidades || {})[campo] && !hab[campo]) return 'la habilidad ' + campo + ' se quitaría';
    }
    const tocaStats = Object.keys(atr).length + Object.keys(esc).length + Object.keys(hab).length > 0;
    if (tocaStats && !(total > 0) && !_soloTramoGratis(j, atr, esc, hab, ctx)) {
      return 'cambio sin costo: el pedido no sube ningún atributo ni habilidad pagada';
    }
    return null;
  }
  // Un pedido de costo 0 es legitimo solo si sube atributos y cada punto que sube cae en el tramo gratis
  // del perfil; no hay escala ni habilidades en el pedido.
  function _soloTramoGratis(j, atr, esc, hab, ctx) {
    const perfil = ctx && ctx.perfil ? ctx.perfil : null;
    const cfg = ctx ? ctx.cfg : null;
    if (!perfil || Object.keys(esc).length || Object.keys(hab).length) return false;
    let sube = false;
    for (const campo of Object.keys(atr)) {
      const de = (j.atributos || {})[campo], a = atr[campo];
      if (typeof de !== 'number' || typeof a !== 'number') return false;
      if (a < de) return false;
      if (a === de) continue;
      sube = true;
      if (tramoGratis(campo, de, a, perfil, cfg) !== a - de) return false;
    }
    return sube;
  }

  /* ================= EMP-80-1 · Emparejar sin costo ==========================
     Reglas de LUIS: Tool PES5 › Reglas › «Emparejamiento sin costo». No hay numeros en el codigo.
     reglas.emparejar = {
       base:       { min, max, subir, lesion, escala8 },  // perfil Base
       suscriptor: { min, max, subir, lesion, escala8 },  // perfil Suscriptor, igual
     }
     min/max: stats entre min y max; se emparejan a max. lesion: null | 'A'|'B'|'C'. escala8: null | 1..8.
     Cada perfil tiene sus propias condiciones (EMP-80-1b). Un campo vacio = ese chequeo no se aplica
     para ese perfil. Compatibilidad: lesion y escala8 en la raiz (version anterior) valen como
     respaldo para el perfil que no tenga el suyo.
     subir=false, o min/max vacios: el perfil no tiene boton. Las funciones reciben esa config tal cual.
     Origen: NO hay un dato de origen guardado todavia (fichajes = slice futuro). El jugador se clasifica
     solo por perfil; `fichaje === true` (si lo trae el llamador) lo excluye.
     ========================================================================== */
  const PERFILES_EMPAREJAR = ['base', 'suscriptor'];
  const LESIONES_EMPAREJAR = ['A', 'B', 'C'];
  const FICHAJE_EMPAREJAR_MSG = 'Jugador con stats propias (fichaje): las mejoras se compran';

  function _enteroEmp(v, min, max) { return Number.isInteger(v) && v >= min && v <= max; }

  // Valor de un campo (lesion / escala8) del perfil. Si el perfil no lo tiene, se usa el de la raiz
  // (compatibilidad con la version anterior). Vacio o invalido = null = ese chequeo no se aplica.
  function _valorPerfilEmp(cfg, nombre, campo, valido) {
    const p = cfg && cfg[nombre];
    const propio = p ? p[campo] : undefined;
    if (propio != null && propio !== '') return valido(propio) ? propio : null;
    const raiz = cfg ? cfg[campo] : undefined;
    return raiz != null && raiz !== '' && valido(raiz) ? raiz : null;
  }
  function _lesionValida(v) { return LESIONES_EMPAREJAR.includes(v); }
  function _escalaValida(v) { return _enteroEmp(v, 1, 8); }

  // Rango {min,max,lesion,escala8} de un perfil ACTIVO (subir=true y rango valido); null si no tiene boton.
  // lesion y escala8 son null cuando ese chequeo no se aplica a este perfil.
  function rangoEmparejar(cfg, nombre) {
    const p = cfg && cfg[nombre];
    if (!p || p.subir !== true) return null;
    if (!_enteroEmp(p.min, 1, 99) || !_enteroEmp(p.max, 1, 99) || p.min > p.max) return null;
    return {
      min: p.min,
      max: p.max,
      lesion: _valorPerfilEmp(cfg, nombre, 'lesion', _lesionValida),
      escala8: _valorPerfilEmp(cfg, nombre, 'escala8', _escalaValida),
    };
  }

  // Atributos 0-99 numericos (sin metadata '_').
  function _statsNumEmp(atributos) {
    return Object.keys(atributos || {})
      .filter(k => k.charAt(0) !== '_' && typeof atributos[k] === 'number' && Number.isFinite(atributos[k]))
      .map(k => [k, atributos[k]]);
  }
  // Parametros 1-8 numericos (sin metadata '_').
  function _escalaNumEmp(escala8) {
    return Object.keys(escala8 || {})
      .filter(k => k.charAt(0) !== '_' && typeof escala8[k] === 'number' && Number.isFinite(escala8[k]))
      .map(k => [k, escala8[k]]);
  }
  function _tieneHabilidadEmp(habilidades) {
    return Object.keys(habilidades || {}).some(k => k.charAt(0) !== '_' && habilidades[k] === true);
  }

  /* EMP-80-2 · perfil del jugador. `fijado` es el valor guardado en pes5_perfiles para la temporada:
     'base' | 'suscriptor' | 'ninguno'. Sin valor fijado (null/undefined), se usa el calculo en vivo
     (perfilEmparejar). Un perfil fijado no se recalcula aunque cambien las stats. */
  const PERFIL_FIJADO_VALORES = ['base', 'suscriptor', 'ninguno'];
  function perfilParaJugador(jugador, cfg, fijado) {
    if (fijado == null) return perfilEmparejar(jugador, cfg);
    if (fijado === 'base' || fijado === 'suscriptor') return rangoEmparejar(cfg, fijado) ? fijado : null;
    return null;
  }
  // Valor que se guarda en pes5_perfiles para un perfil calculado (null -> 'ninguno').
  function valorPerfilFijado(perfil) { return perfil === 'base' || perfil === 'suscriptor' ? perfil : 'ninguno'; }
  /* Perfiles que faltan por fijar en un plantel: calcula con perfilEmparejar (sobre el save ANTES de
     escribir) a cada jugador que no tenga valor en `fijado` (mapa { [registro]: valor }). No pisa los
     fijados. Devuelve { [registro]: 'base' | 'suscriptor' | 'ninguno' } solo con los nuevos. */
  function perfilesFaltantes(jugadores, fijado, cfg) {
    const f = fijado || {};
    const out = {};
    (jugadores || []).forEach(function (j) {
      if (!j || j.id == null) return;
      const reg = String(j.id);
      if (f[reg] != null) return;
      out[reg] = valorPerfilFijado(perfilEmparejar(j, cfg));
    });
    return out;
  }

  const LESION_MSG = (l) => 'La resistencia a lesiones no es la exigida (' + l + ').';
  const ESCALA_MSG = (e) => 'Los parámetros 1-8 no están en el valor exigido (' + e + ').';
  const LESION_DESCONOCIDA_MSG = 'La resistencia a lesiones del jugador no se reconoce: no se puede emparejar.';

  // Condiciones propias de un perfil (lesion y escala8 de ESE perfil). Devuelve el motivo o null.
  function _faltaCondicionPerfil(j, r) {
    if (r.lesion !== null && j.lesiones !== r.lesion) return LESION_MSG(r.lesion);
    if (r.escala8 !== null) {
      const vals = _escalaNumEmp(j.escala8);
      if (!vals.length || vals.some(([, v]) => v !== r.escala8)) return ESCALA_MSG(r.escala8);
    }
    return null;
  }

  // Perfil del jugador: 'base', 'suscriptor' o null. Todas las condiciones a la vez.
  function perfilEmparejar(jugador, cfg) {
    const j = jugador || {};
    if (j.fichaje === true) return null;
    const stats = _statsNumEmp(j.atributos);
    if (!stats.length) return null;
    if (_tieneHabilidadEmp(j.habilidades)) return null;
    // Una lesion que no es A, B o C nunca se lee como otra: el jugador no es elegible.
    if (!_lesionValida(j.lesiones)) return null;
    for (const nombre of PERFILES_EMPAREJAR) {
      const r = rangoEmparejar(cfg, nombre);
      if (!r || !stats.every(([, v]) => v >= r.min && v <= r.max)) continue;
      if (_faltaCondicionPerfil(j, r) === null) return nombre;
    }
    return null;
  }

  // Motivo por el que el jugador NO puede emparejarse, o null si puede.
  function motivoSinEmparejar(jugador, cfg) {
    const j = jugador || {};
    if (!PERFILES_EMPAREJAR.some(n => rangoEmparejar(cfg, n))) return 'No hay perfiles de emparejamiento configurados en Reglas.';
    if (j.fichaje === true) return FICHAJE_EMPAREJAR_MSG;
    const stats = _statsNumEmp(j.atributos);
    if (!stats.length) return FICHAJE_EMPAREJAR_MSG;
    if (_tieneHabilidadEmp(j.habilidades)) return 'Tiene una habilidad especial activa: no se puede emparejar.';
    if (!_lesionValida(j.lesiones)) return LESION_DESCONOCIDA_MSG;
    // Motivo del primer perfil cuyo rango de stats sí calza: dice qué condición propia le falta.
    let primero = null;
    for (const nombre of PERFILES_EMPAREJAR) {
      const r = rangoEmparejar(cfg, nombre);
      if (!r || !stats.every(([, v]) => v >= r.min && v <= r.max)) continue;
      const m = _faltaCondicionPerfil(j, r);
      if (m === null) return null;
      if (primero === null) primero = m;
    }
    return primero !== null ? primero : FICHAJE_EMPAREJAR_MSG;
  }

  /* Emparejar: sube cada stat del perfil hasta su maximo. Nunca baja nada ni toca habilidades
     ni parametros 1-8. Costo 0 (no pasa por costoCambios ni genera coins).
     Devuelve { atributos: {campo: max}, lineas: [{campo, de, a}], total: 0, perfil, motivo }.
     Si el jugador no es elegible: atributos vacio y motivo. */
  function cambiosEmparejar(jugador, cfg, fijado) {
    const out = { atributos: {}, lineas: [], total: 0, perfil: null, motivo: null };
    const fijo = fijado != null;
    const perfil = fijo ? perfilParaJugador(jugador, cfg, fijado) : perfilEmparejar(jugador, cfg);
    if (!perfil) {
      out.motivo = fijo
        ? (fijado === 'ninguno' ? 'Este jugador no tiene perfil de emparejar fijado.' : 'El perfil fijado no está activo en Reglas.')
        : (motivoSinEmparejar(jugador, cfg) || 'No se puede emparejar este jugador.');
      return out;
    }
    const rango = rangoEmparejar(cfg, perfil);
    if (fijo) {
      // Con perfil fijado, emparejar es costo 0: solo vale si todas las stats ya estan dentro del rango.
      const fuera = _statsNumEmp(jugador.atributos).filter(([, v]) => v < rango.min || v > rango.max);
      if (fuera.length) {
        out.motivo = 'Hay stats fuera del rango del perfil ' + perfil + ' (' + fuera.map(([k, v]) => k + ' ' + v).join(', ') + '): no se puede emparejar sin costo.';
        return out;
      }
    }
    const max = rango.max;
    _statsNumEmp(jugador.atributos).forEach(([campo, de]) => {
      if (de >= max) return;
      out.atributos[campo] = max;
      out.lineas.push({ campo: campo, de: de, a: max });
    });
    out.perfil = perfil;
    return out;
  }

  /* Defensa de un pedido o registro «emparejar». La usan aplicarPedidosSeleccionados (pedido del
     presidente) y el admin antes de escribir. Devuelve el motivo de rechazo o null. Solo `atributos`;
     cada valor tiene que ser EXACTAMENTE lo que da cambiosEmparejar sobre el save actual. Si el save
     cambio desde que se armo el pedido, se rechaza (plantilla desactualizada). Nunca supera el maximo
     del perfil ni el tope de la temporada. */
  function motivoRechazoEmparejar(jugadorActual, cambios, cfg, tope, fijado) {
    const c = cambios || {};
    if (Object.keys(c).some(k => k !== 'atributos')) return 'el emparejar solo puede tocar atributos';
    const esp = cambiosEmparejar(jugadorActual, cfg, fijado);
    if (!esp.perfil) return esp.motivo || 'el jugador ya no es elegible para emparejar';
    const atr = c.atributos || {};
    const campos = Object.keys(atr);
    if (!campos.length) return 'no hay atributos para emparejar';
    const max = rangoEmparejar(cfg, esp.perfil).max;
    for (const campo of campos) {
      const v = atr[campo];
      if (typeof v !== 'number' || !Number.isFinite(v)) return campo + ': valor inválido';
      if (v > max) return campo + ' subiría a ' + v + ' y el máximo del perfil ' + esp.perfil + ' es ' + max;
      if (typeof tope === 'number' && v > tope) return campo + ' subiría a ' + v + ' y el tope de la temporada es ' + tope;
      if (esp.atributos[campo] !== v) return campo + ' ya no coincide con lo que hay que emparejar (plantilla desactualizada)';
    }
    const faltan = Object.keys(esp.atributos).filter(k => !(k in atr));
    if (faltan.length) return 'faltan atributos por emparejar (plantilla desactualizada): ' + faltan.join(', ');
    return null;
  }

  /* Validacion del bloque de Reglas (validarReglas). Un perfil puede quedar vacio entero, pero no a
     medias. Los rangos no pueden solaparse. */
  function validarEmparejar(e) {
    const errores = [];
    if (e == null) return errores;
    if (typeof e !== 'object') return ['emparejar: formato inválido'];
    const rangos = {};
    for (const nombre of PERFILES_EMPAREJAR) {
      const p = e[nombre] || {};
      const et = nombre === 'base' ? 'Base' : 'Suscriptor';
      if (p.escala8 != null && p.escala8 !== '' && !_escalaValida(p.escala8)) errores.push(et + ': parámetros 1-8: entero entre 1 y 8, o vacío');
      if (p.lesion != null && p.lesion !== '' && !_lesionValida(p.lesion)) errores.push(et + ': resistencia a lesiones: A, B o C, o vacía');
      const hayMin = p.min != null && p.min !== '';
      const hayMax = p.max != null && p.max !== '';
      if (!hayMin && !hayMax) {
        if (p.subir === true) errores.push(et + ': marcaste «subir gratis» pero el rango está vacío');
        continue;
      }
      if (!hayMin || !hayMax) { errores.push(et + ': completa el mínimo y el máximo, o deja el perfil vacío'); continue; }
      if (!_enteroEmp(p.min, 1, 99) || !_enteroEmp(p.max, 1, 99)) { errores.push(et + ': mínimo y máximo, enteros entre 1 y 99'); continue; }
      if (p.min > p.max) { errores.push(et + ': el mínimo no puede ser mayor que el máximo'); continue; }
      if (p.subir !== undefined && typeof p.subir !== 'boolean') { errores.push(et + ': «subir gratis» debe ser sí o no'); continue; }
      rangos[nombre] = { min: p.min, max: p.max };
    }
    if (rangos.base && rangos.suscriptor) {
      const a = rangos.base, b = rangos.suscriptor;
      if (a.min <= b.max && b.min <= a.max) errores.push('los rangos Base y Suscriptor no pueden solaparse');
    }
    // Campos comunes de la version anterior (raiz): solo se validan si vienen.
    if (e.escala8 != null && e.escala8 !== '' && !_escalaValida(e.escala8)) errores.push('parámetros 1-8: entero entre 1 y 8, o vacío');
    if (e.lesion != null && e.lesion !== '' && !_lesionValida(e.lesion)) errores.push('resistencia a lesiones: A, B o C, o vacía');
    return errores;
  }

  function puedePagar(saldo, total) {
    return (saldo || 0) >= total;
  }

  // Slice R: valida un objeto de reglas. Devuelve [] si esta bien, o una
  // lista de mensajes de error en castellano.
  function validarReglas(r) {
    const errores = [];
    const entero = (v) => Number.isInteger(v) && v >= 0;
    const enteroRango = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
    if (!r || typeof r !== 'object') return ['reglas vacias'];
    if (!Array.isArray(r.bandCosts) || r.bandCosts.length !== 5) errores.push('bandCosts debe tener 5 valores');
    else {
      r.bandCosts.forEach((v, i) => { if (!entero(v)) errores.push('banda ' + (i + 1) + ': entero >= 0'); });
      for (let i = 1; i < r.bandCosts.length; i++) {
        if (entero(r.bandCosts[i]) && entero(r.bandCosts[i - 1]) && r.bandCosts[i] < r.bandCosts[i - 1]) errores.push('las bandas no pueden bajar: banda ' + (i + 1) + ' < banda ' + i);
      }
    }
    ['scale8Cost', 'abilityCost', 'injuryCost', 'budgetGeneral', 'budgetSubscribers'].forEach((k) => {
      if (!entero(r[k])) errores.push(k + ': entero >= 0');
    });
    if (!enteroRango(r.maxPositions, 1, 12)) errores.push('maxPositions debe ser un entero entre 1 y 12');
    // EMP-80-1: si viene, tiene que ser un nivel de atributo válido. Si falta, normalizarReglas pone 80.
    if (r.emparejar !== undefined) errores.push(...validarEmparejar(r.emparejar));
    const topes = r.topesAtributo;
    if (!Array.isArray(topes) || topes.length > 50) errores.push('topesAtributo debe ser una lista de hasta 50 valores (puede estar vacía = sin tope)');
    else {
      topes.forEach((v, i) => { if (!enteroRango(v, 0, 99)) errores.push('tope temporada ' + (i + 1) + ': entero entre 0 y 99'); });
      for (let i = 1; i < topes.length; i++) {
        if (enteroRango(topes[i], 0, 99) && enteroRango(topes[i - 1], 0, 99) && topes[i] < topes[i - 1]) errores.push('los topes no pueden bajar: temporada ' + (i + 1) + ' < temporada ' + i);
      }
    }
    return errores;
  }

  /* Tope de atributos por temporada del juego (ver DEFAULT_RULES.topesAtributo).
     Funciones puras: el juego de una temporada se compara normalizado (sin espacios
     ni distinción de mayúsculas), así «PES5» y «PES 5» cuentan como el mismo juego. */
  function normalizarJuego(game) {
    return String(game == null ? '' : game).trim().toUpperCase().replace(/\s+/g, '');
  }

  // Posición (1-based) de la temporada `seasonNumber` entre las temporadas del mismo juego,
  // ordenadas por número. Devuelve {ordinal, temporadas, juego} o null si no existe.
  function temporadaDelJuego(seasons, seasonNumber) {
    const lista = Array.isArray(seasons) ? seasons : [];
    const n = Number(seasonNumber);
    const actual = lista.find(s => s && Number(s.number) === n);
    if (!actual) return null;
    const juego = normalizarJuego(actual.game);
    const temporadas = lista
      .filter(s => s && normalizarJuego(s.game) === juego)
      .map(s => Number(s.number))
      .filter(x => Number.isFinite(x))
      .sort((a, b) => a - b);
    return { ordinal: temporadas.indexOf(n) + 1, temporadas: temporadas, juego: juego };
  }

  // Temporada de referencia para el tope: la temporada ACTIVA si existe (es la que se
  // juega ahora); si no hay ninguna activa, la que diga la app (STATE.season).
  function temporadaActualDelJuego(seasons, seasonNumber) {
    const lista = Array.isArray(seasons) ? seasons : [];
    const activa = lista.find(s => s && s.status === 'active');
    return temporadaDelJuego(lista, activa ? activa.number : seasonNumber);
  }

  /* Temporada de COBRO (coins y presupuesto de temporada): la activa NO archivada si
     existe; si no hay ninguna, `stateSeason` (la que tiene seleccionada la UI, que
     puede estar finalizada). `archivadas` = números de temporadas archivadas. */
  function temporadaDeCobro(seasons, stateSeason, archivadas) {
    const lista = Array.isArray(seasons) ? seasons : [];
    const arch = new Set((Array.isArray(archivadas) ? archivadas : []).map(Number));
    const activa = lista.find(s => s && s.status === 'active' && !arch.has(Number(s.number)));
    return activa ? Number(activa.number) : stateSeason;
  }

  /* Validación de la temporada de cobro antes de escribir nada. Devuelve {ok, motivo}:
     ok solo si la temporada existe, está activa (no finalizada) y no está archivada. */
  function validarTemporadaCobro(seasons, seasonNumber, archivadas) {
    const lista = Array.isArray(seasons) ? seasons : [];
    const n = Number(seasonNumber);
    const arch = new Set((Array.isArray(archivadas) ? archivadas : []).map(Number));
    const s = lista.find(x => x && Number(x.number) === n);
    const hayActiva = lista.some(x => x && x.status === 'active' && !arch.has(Number(x.number)));
    const sinActiva = hayActiva ? '' : 'no hay temporada activa; ';
    if (!s) return { ok: false, motivo: sinActiva + 'no existe la temporada ' + seasonNumber };
    const nombre = s.name || ('T' + s.number);
    if (arch.has(n)) return { ok: false, motivo: sinActiva + 'la temporada ' + nombre + ' está archivada (solo lectura)' };
    if (s.status !== 'active') return { ok: false, motivo: sinActiva + 'la temporada ' + nombre + ' no está activa (' + (s.status || 'sin estado') + ')' };
    return { ok: true, motivo: '' };
  }

  // Tope de atributo para la temporada `ordinal` del juego. Si la lista no tiene ese
  // valor se hereda el último cargado. Lista vacía o sin ordinal = sin tope (null).
  function topeAtributo(ordinal, topes) {
    if (!Array.isArray(topes) || !topes.length) return null;
    if (!Number.isFinite(ordinal) || ordinal < 1) return null;
    return topes[Math.min(ordinal, topes.length) - 1];
  }

  // Slice R: mezcla lo que venga de Firestore sobre DEFAULT_RULES. Si data es
  // null/invalida, devuelve una copia de DEFAULT_RULES. Nunca lanza.
  function normalizarReglas(data) {
    const base = JSON.parse(JSON.stringify(DEFAULT_RULES));
    if (!data || typeof data !== 'object') return base;
    const campos = ['bandCosts', 'scale8Cost', 'abilityCost', 'injuryCost', 'budgetGeneral', 'budgetSubscribers', 'maxPositions', 'topesAtributo', 'emparejar'];
    const candidato = Object.assign({}, base);
    campos.forEach((k) => { if (data[k] !== undefined) candidato[k] = Array.isArray(data[k]) ? data[k].slice() : data[k]; });
    return validarReglas(candidato).length ? base : candidato;
  }

  /* ================= Slice 4 · nucleo YunaCoins + Plan B =================
     Funciones PURAS (sin DOM ni Firestore). Las usan coins.js, pes5-tool.js y la
     pestana YunaCoins. Ver docs/MACRO_SLICE_2.0_CIERRE.md (Slice 4) y
     docs/2.0/investigacion/MACRO_SLICE_STREAMLABS.md §1.

     Convencion de signos (4.C): neto = Σ(sub) − Σ(add) de los movimientos
     `pendiente` de la temporada: lo que la web gasto de mas (positivo) o agrego
     (negativo) y Streamlabs todavia no refleja. saldo nuevo = pegado − neto. */
  const LOYALTY_FRESCURA_HORAS = 12;   // 4.D: mas de esto → el cobro se bloquea

  // 4.A: marca inicial de un movimiento que mueve saldo.
  function marcaStreamlabsInicial(team) {
    const mapeado = !!(team && String(team.streamlabsUser || '').trim());
    return { estado: mapeado ? 'pendiente' : 'sin_mapeo', lote: null, en: null };
  }
  // Movimientos viejos (sin el campo) cuentan como sincronizados: nunca como pendientes.
  function estadoStreamlabs(mov) {
    return (mov && mov.streamlabs && mov.streamlabs.estado) || 'sincronizado';
  }
  // 4.A: neto pendiente de una lista de movimientos, solo de la temporada indicada.
  function netoPendiente(movimientos, temporada) {
    let neto = 0;
    for (const m of movimientos || []) {
      if (!m || estadoStreamlabs(m) !== 'pendiente') continue;
      if (temporada != null && m.season !== temporada) continue;
      const monto = Number(m.amount) || 0;
      if (m.mode === 'sub') neto += monto;
      else if (m.mode === 'add') neto -= monto;
    }
    return neto;
  }
  // Equipos (ids) que tienen algun movimiento pendiente de la temporada.
  function equiposConPendientes(movimientos, temporada) {
    const ids = new Set();
    for (const m of movimientos || []) {
      if (!m || estadoStreamlabs(m) !== 'pendiente') continue;
      if (temporada != null && m.season !== temporada) continue;
      ids.add(String(m.teamId));
    }
    return ids;
  }

  function normUsuario(s) { return String(s || '').trim().replace(/^@+/, '').toLowerCase(); }

  // 4.C: parser tolerante de lo que se copia de Streamlabs → Loyalty → Users.
  // Acepta tab o espacio entre usuario y puntos, `@` opcional, miles con . , o espacio.
  // Las lineas que no son un usuario con puntos (encabezados, rangos, botones) se ignoran y se cuentan.
  const RE_PUNTOS = /^(?:\d{1,3}(?:[.,\u00a0 ]\d{3})+|\d+)$/;
  const RE_RUIDO = /^(?:\d+\s*[-–]\s*\d+|mostrar|p[aá]gina|rango|total|usuario|users?|puntos|points|siguiente|anterior|ver|buscar)\b/i;
  function parsearListaLoyalty(texto) {
    const porUsuario = new Map();   // normalizado -> { nombre, puntos: [..] }
    let ignoradas = 0, lineas = 0;
    for (const crudo of String(texto || '').split(/\r?\n/)) {
      const linea = crudo.trim();
      if (!linea) continue;
      lineas++;
      let usuario = null, puntosRaw = null;
      if (linea.includes('\t')) {
        const i = linea.lastIndexOf('\t');
        usuario = linea.slice(0, i).trim();
        puntosRaw = linea.slice(i + 1).trim();
      } else {
        const m = linea.match(/^(.*?)\s+(\d{1,3}(?:[.,\u00a0 ]\d{3})+|\d+)$/);
        if (m) { usuario = m[1].trim(); puntosRaw = m[2]; }
      }
      const norm = normUsuario(usuario);
      if (!usuario || !puntosRaw || !RE_PUNTOS.test(puntosRaw.trim()) || !/[\p{L}\p{N}]/u.test(norm) || RE_RUIDO.test(usuario)) {
        ignoradas++;
        continue;
      }
      const puntos = parseInt(puntosRaw.replace(/\D/g, ''), 10);
      if (!Number.isSafeInteger(puntos)) { ignoradas++; continue; }
      if (!porUsuario.has(norm)) porUsuario.set(norm, { nombre: usuario.replace(/^@+/, ''), puntos: [] });
      porUsuario.get(norm).puntos.push(puntos);
    }
    const filas = [], ambiguos = [];
    let duplicados = 0;
    for (const [norm, v] of porUsuario) {
      if (v.puntos.length > 1) {
        duplicados += v.puntos.length - 1;
        if (new Set(v.puntos).size > 1) { ambiguos.push(norm); continue; }   // mismo usuario, puntos distintos: no se usa
      }
      filas.push({ usuario: norm, nombre: v.nombre, puntos: v.puntos[0] });
    }
    return { filas, ignoradas, duplicados, ambiguos, lineas };
  }

  /* 4.C vista previa: NO escribe nada.
     equipos: [{teamId, teamName, streamlabsUser, saldoWeb, neto}] (solo los que tienen mapeo).
     parseo: resultado de parsearListaLoyalty. */
  function vistaPrevia(equipos, parseo) {
    const mapa = new Map((parseo && parseo.filas || []).map(f => [f.usuario, f.puntos]));
    const mapeados = new Set();
    const filas = (equipos || []).map(e => {
      const u = normUsuario(e.streamlabsUser);
      mapeados.add(u);
      const pegado = mapa.has(u) ? mapa.get(u) : null;
      const neto = Number(e.neto) || 0;
      const saldoWeb = Number(e.saldoWeb) || 0;
      const saldoNuevo = pegado == null ? null : pegado - neto;
      return {
        teamId: e.teamId, teamName: e.teamName, usuario: u,
        encontrado: pegado != null, pegado, neto, saldoWeb, saldoNuevo,
        diferencia: saldoNuevo == null ? null : saldoNuevo - saldoWeb,
      };
    });
    return {
      filas,
      noEncontrados: filas.filter(f => !f.encontrado).map(f => f.usuario),
      usuariosSinEquipo: [...mapa.keys()].filter(u => !mapeados.has(u)).length,
    };
  }

  // Lista corta para Streamlabs: solo equipos encontrados con neto distinto de 0.
  function ajustesStreamlabs(filas) {
    return (filas || []).filter(f => f.encontrado && f.neto !== 0)
      .map(f => ({ teamId: f.teamId, teamName: f.teamName, usuario: f.usuario, objetivo: f.saldoNuevo }));
  }

  // 4.C «Preparar»: la foto que se guarda antes de que Luis edite Streamlabs.
  function construirFoto(filas, lote, en) {
    const equipos = {};
    for (const f of filas || []) {
      if (!f.encontrado) continue;
      equipos[String(f.teamId)] = { usuario: f.usuario, pegado: f.pegado, neto: f.neto, objetivo: f.saldoNuevo };
    }
    return { lote: lote, en: en, equipos: equipos };
  }

  /* 4.C.7 «Aplicar» y su guardia contra el doble descuento. foto = la guardada;
     pegadoNuevo = Map usuario -> puntos de un pegado nuevo hecho con la foto abierta,
     o null si «Aplicar» usa la foto tal cual.
     - sin pegado nuevo: aplicar el objetivo de la foto.
     - pegado nuevo == objetivo: ya ajustado en Streamlabs. Saldo = pegado, sin restar otra vez.
     - pegado nuevo == pegado de la foto: todavia no se edito. Se aplica el objetivo.
     - cualquier otro valor: conflicto, el equipo queda fuera hasta que Luis lo revise. */
  function resolverAplicar(foto, pegadoNuevo) {
    const out = {};
    for (const [teamId, e] of Object.entries((foto && foto.equipos) || {})) {
      if (!pegadoNuevo) { out[teamId] = { accion: 'aplicar', saldo: e.objetivo }; continue; }
      const p2 = pegadoNuevo.get(normUsuario(e.usuario));
      if (p2 == null) out[teamId] = { accion: 'sin_usuario' };
      else if (p2 === e.objetivo) out[teamId] = { accion: 'ya_ajustado', saldo: p2 };
      else if (p2 === e.pegado) out[teamId] = { accion: 'aplicar', saldo: e.objetivo };
      else out[teamId] = { accion: 'conflicto', pegadoNuevo: p2 };
    }
    return out;
  }

  /* 4.B cobro sin sobregiro: devuelve el saldo nuevo, o lanza si no alcanza.
     No escribe nada: quien llama escribe solo si esto no lanzo. */
  function cobroSinSobregiro(saldo, total) {
    const s = Number(saldo) || 0;
    const t = Number(total) || 0;
    if (t < 0) throw new Error('cobro negativo: ' + t);
    if (s - t < 0) throw new Error('sobregiro: el saldo es ' + s + ' y el cobro ' + t);
    return s - t;
  }

  /* 4.D: decide si un cobro pide confirmacion por lista de Loyalty vencida. Un cobro de costo 0
     (p. ej. una formacion, que es gratis) nunca se bloquea: no descuenta nada del saldo. */
  function debeBloquearPorFrescura(enIso, ahora, costo) {
    if (!(Number(costo) > 0)) return false;
    return listaVencida(enIso, ahora);
  }

  /* 4.G: transporte de los saldos de Loyalty. 'manual' = Plan B (copiar y pegar);
     'api' = Plan A (API de Streamlabs, 2.1). Sin campo o con otro valor: manual. */
  const TRANSPORTES = ['manual', 'api'];
  function transporteDe(value) {
    return value && value.transporte === 'api' ? 'api' : 'manual';
  }

  // 4.D: horas desde una sincronizacion ISO. null si nunca hubo.
  function horasDesde(enIso, ahora) {
    if (!enIso) return null;
    const t = Date.parse(enIso);
    if (isNaN(t)) return null;
    const ahoraMs = ahora instanceof Date ? ahora.getTime() : (ahora != null ? Date.parse(ahora) : Date.now());
    return (ahoraMs - t) / 3600000;
  }
  // 4.D: la lista esta vencida si nunca se sincronizo o si pasaron mas de LOYALTY_FRESCURA_HORAS.
  function listaVencida(enIso, ahora) {
    const h = horasDesde(enIso, ahora);
    return h == null || h > LOYALTY_FRESCURA_HORAS;
  }

  return {
    DEFAULT_RULES: DEFAULT_RULES,
    BAND_MAX: BAND_MAX,
    HEIGHT_CAPS: HEIGHT_CAPS,
    HEIGHT_BRACKET_LABEL: HEIGHT_BRACKET_LABEL,
    INJURY_ORDER: INJURY_ORDER,
    bandCost99: bandCost99,
    costRange99: costRange99,
    heightBracket: heightBracket,
    heightBracketCount: heightBracketCount,
    techoPresupuesto: techoPresupuesto,
    bonoEquipo: bonoEquipo,
    bonoSuscriptor: bonoSuscriptor,
    distribuirCosto: distribuirCosto,
    gastoTemporada: gastoTemporada,
    topesRestantes: topesRestantes,
    gastoBonoJugador: gastoBonoJugador,
    bonoRestanteJugador: bonoRestanteJugador,
    resumenPresupuesto: resumenPresupuesto,
    resumenCarga: resumenCarga,
    normalizarTopesExtra: normalizarTopesExtra,
    extraDeEquipo: extraDeEquipo,
    reglasConExtra: reglasConExtra,
    evaluarPago: evaluarPago,
    costoCambios: costoCambios,
    motivoRechazoMejora: motivoRechazoMejora,
    perfilEmparejar: perfilEmparejar,
    cambiosEmparejar: cambiosEmparejar,
    motivoSinEmparejar: motivoSinEmparejar,
    motivoRechazoEmparejar: motivoRechazoEmparejar,
    rangoEmparejar: rangoEmparejar,
    tramoGratis: tramoGratis,
    costoAtributoConPerfil: costoAtributoConPerfil,
    perfilParaJugador: perfilParaJugador,
    valorPerfilFijado: valorPerfilFijado,
    perfilesFaltantes: perfilesFaltantes,
    PERFIL_FIJADO_VALORES: PERFIL_FIJADO_VALORES,
    validarEmparejar: validarEmparejar,
    FICHAJE_EMPAREJAR_MSG: FICHAJE_EMPAREJAR_MSG,
    puedePagar: puedePagar,
    validarReglas: validarReglas,
    normalizarReglas: normalizarReglas,
    normalizarJuego: normalizarJuego,
    temporadaDelJuego: temporadaDelJuego,
    temporadaActualDelJuego: temporadaActualDelJuego,
    temporadaDeCobro: temporadaDeCobro,
    validarTemporadaCobro: validarTemporadaCobro,
    topeAtributo: topeAtributo,
    LOYALTY_FRESCURA_HORAS: LOYALTY_FRESCURA_HORAS,
    marcaStreamlabsInicial: marcaStreamlabsInicial,
    estadoStreamlabs: estadoStreamlabs,
    netoPendiente: netoPendiente,
    equiposConPendientes: equiposConPendientes,
    normUsuario: normUsuario,
    parsearListaLoyalty: parsearListaLoyalty,
    vistaPrevia: vistaPrevia,
    ajustesStreamlabs: ajustesStreamlabs,
    construirFoto: construirFoto,
    resolverAplicar: resolverAplicar,
    cobroSinSobregiro: cobroSinSobregiro,
    horasDesde: horasDesde,
    listaVencida: listaVencida,
    debeBloquearPorFrescura: debeBloquearPorFrescura,
    TRANSPORTES: TRANSPORTES,
    transporteDe: transporteDe,
  };
});
