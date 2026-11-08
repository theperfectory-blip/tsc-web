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
   slice (ver commit previo a este cambio):
     - DEFAULT_RULES      ~linea 630
     - BAND_MAX            linea 639
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
     - Orden de consumo INVERTIDO: un jugador suscriptor gasta primero el
       bono de suscriptores; agotado el bono, sigue con el tope general. Un
       jugador NO suscriptor solo ve el tope general. Ver `distribuirCosto`.
     - Los topes de temporada (`budgetGeneral`/`budgetSubscribers`) no se
       guardan en `teams`: se derivan del libro `coins` (`gastoTemporada`)
       filtrando `season` actual + `reason` que empieza con 'mejora PES5'.
     - `puedePagar` real = saldo real >= total Y los topes de temporada no
       se exceden (general para todos, bono solo para suscriptores) — ver
       `evaluarPago`.
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
    bandCosts: [50, 100, 250, 500, 1000],   // <80, 80-85, 86-90, 91-95, 96-99
    scale8Cost: 250,                        // Consistency/Condition/Weak foot (escala 4-8, o 1-8 en el save real)
    abilityCost: 500,                       // habilidad especial (estrella)
    injuryCost: 250,                        // por nivel de Res. lesion (C->B->A)
    budgetGeneral: 50000,                   // tope de temporada: lo maximo que se puede gastar en mejoras generales
    budgetSubscribers: 25000,               // bono exclusivo de temporada, solo para jugadores suscriptores
    maxPositions: 5,                        // maximo de posiciones marcadas por jugador (el juego permite hasta 12)
  };

  /* techo superior (inclusive) de cada banda de costo, EXACTO del editor */
  const BAND_MAX = [79, 85, 90, 95, 99];

  /* cupos por franja de altura (Categoria 2, MD seccion 2), EXACTOS */
  const HEIGHT_CAPS = { hi: 2, mid: 7, lo: 8 };
  const HEIGHT_BRACKET_LABEL = { hi: '≥198 cm', mid: '190-197 cm', lo: '186-189 cm' };

  /* orden de mejora de resistencia a lesiones, EXACTO del editor */
  const INJURY_ORDER = ['C', 'B', 'A'];

  /* ---- costo de atributos 0-99 (bandas) ---- */
  // bandCost99(dest): costo de UN punto que hace que el atributo llegue a
  // `dest`. Recorre BAND_MAX y devuelve rules.bandCosts[i] de la primera
  // banda que cubre a `dest` — IDENTICO a la linea 652-655 del editor.
  function bandCost99(dest, rules) {
    const r = rules || DEFAULT_RULES;
    for (let i = 0; i < BAND_MAX.length; i++) {
      if (dest <= BAND_MAX[i]) return r.bandCosts[i];
    }
    return r.bandCosts[r.bandCosts.length - 1];
  }

  // costRange99(from,to): suma bandCost99 para cada punto entre from+1 y to
  // (si to<=from, el bucle no corre y devuelve 0 — subir cuesta, bajar es
  // gratis). IDENTICO a la linea 656-660 del editor.
  function costRange99(from, to, rules) {
    let sum = 0;
    for (let v = from + 1; v <= to; v++) sum += bandCost99(v, rules);
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
     SUSCRIPTORES (regla, ej. 20.000) que solo se puede gastar en jugadores
     suscriptores. Todo descuenta del saldo real: la transaccion en `coins`
     lleva `amount = fromGeneral + fromSub`.

     Orden de consumo (INVERTIDO respecto de la primera version de este
     modulo — la vieja gastaba el general primero siempre):
       - jugador SUSCRIPTOR: primero el bono; agotado el bono, el resto
         sigue con el tope general sin problema.
       - jugador NO suscriptor: solo el tope general, nunca toca el bono.
     Asi un suscriptor puede terminar por encima del nivel base del resto
     del plantel — es el incentivo buscado (dato del usuario, 15/09).

     `techoPresupuesto(walletReal, rules)` arma el pool `{general,
     subscribers}` de una sesion: `general` es `Math.min(walletReal,
     rules.budgetGeneral)` — el saldo real SIEMPRE se pasa como parametro
     (nunca se lee de un numero de regla, punto 5a). `bonoSuscriptor(pool,
     esSuscriptor)` sigue siendo el TECHO visible para un jugador (cuanto
     puede llegar a gastar en total, sin importar el orden) — no cambia con
     la inversion de orden, que solo afecta COMO se reparte un costo ya
     calculado entre bono y general (`distribuirCosto`, mas abajo).

     Los topes de TEMPORADA (`budgetGeneral`/`budgetSubscribers`) no se
     guardan en `teams`: se derivan del libro `coins` filtrando `season`
     actual + `reason` que empiece con 'mejora PES5' (`gastoTemporada` /
     `topesRestantes`, mas abajo) — cada transaccion de mejora lleva su
     propio desglose `pes5.fromGeneral`/`pes5.fromSub` para poder
     recomputarlos (punto 5c/5d del macro-slice).
     ============================================================ */
  function techoPresupuesto(walletReal, rules) {
    const r = rules || DEFAULT_RULES;
    return {
      general: Math.min(walletReal || 0, r.budgetGeneral),
      subscribers: r.budgetSubscribers,
    };
  }
  function bonoSuscriptor(pool, esSuscriptor) {
    if (!pool) return 0;
    const general = pool.general || 0;
    const subscribers = pool.subscribers || 0;
    return esSuscriptor ? general + subscribers : general;
  }

  /* ============================================================
     distribuirCosto — reparte el costo TOTAL ya calculado (costoCambios)
     de la edicion de UN jugador entre bono de suscriptores y tope general,
     con el ORDEN NUEVO (punto 5b del macro-slice, invierte la logica vieja
     de este archivo):
       - suscriptor: `fromSub = min(cost, subscribersRestantes)`,
         `fromGeneral = cost - fromSub` (el resto, sin techo propio aca —
         si excede el tope general de temporada, eso lo detecta
         `evaluarPago`/`topesRestantes`, no esta funcion).
       - no suscriptor: todo `fromGeneral`, `fromSub` siempre 0.
     `subscribersRestantes` es lo que queda del BONO en este momento (tope
     de regla menos lo ya gastado esta temporada y, si se estan repartiendo
     varios jugadores en un mismo lote, menos lo ya asignado a jugadores
     anteriores del mismo lote — ver pes5-tool.html > repartoPendienteEquipo,
     que itera el plantel en orden de roster y va descontando el bono
     disponible jugador por jugador; ese orden de asignacion entre varios
     suscriptores simultaneos no esta especificado en el doc, es una
     decision de esta implementacion).
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
  function topesRestantes(gastado, rules) {
    const r = rules || DEFAULT_RULES;
    const g = (gastado && gastado.general) || 0;
    const s = (gastado && gastado.sub) || 0;
    return {
      general: Math.max(0, r.budgetGeneral - g),
      subscribers: Math.max(0, r.budgetSubscribers - s),
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
  function costoCambios(jugadorOriginal, cambios, rules) {
    const r = rules || DEFAULT_RULES;
    const lineas = [];
    let total = 0;
    const p = jugadorOriginal || {};
    const c = cambios || {};

    if (c.atributos) {
      Object.keys(c.atributos).forEach(function (campo) {
        const de = (p.atributos || {})[campo];
        const a = c.atributos[campo];
        if (a === de) return;
        const costo = a > de ? costRange99(de, a, r) : 0;
        if (costo > 0) total += costo;
        lineas.push({ campo: campo, de: de, a: a, costo: costo });
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
    return errores;
  }

  // Slice R: mezcla lo que venga de Firestore sobre DEFAULT_RULES. Si data es
  // null/invalida, devuelve una copia de DEFAULT_RULES. Nunca lanza.
  function normalizarReglas(data) {
    const base = JSON.parse(JSON.stringify(DEFAULT_RULES));
    if (!data || typeof data !== 'object') return base;
    const campos = ['bandCosts', 'scale8Cost', 'abilityCost', 'injuryCost', 'budgetGeneral', 'budgetSubscribers', 'maxPositions'];
    const candidato = Object.assign({}, base);
    campos.forEach((k) => { if (data[k] !== undefined) candidato[k] = Array.isArray(data[k]) ? data[k].slice() : data[k]; });
    return validarReglas(candidato).length ? base : candidato;
  }

  /* ================= Slice 4 · nucleo YunaCoins + Plan B =================
     Funciones PURAS (sin DOM ni Firestore). Las usan coins.js, pes5-tool.js y la
     pestana YunaCoins. Ver docs/MACRO_SLICE_2.0_CIERRE.md (Slice 4) y
     tsc-src/prototipo_yunas/MACRO_SLICE_STREAMLABS.md §1.

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
    bonoSuscriptor: bonoSuscriptor,
    distribuirCosto: distribuirCosto,
    gastoTemporada: gastoTemporada,
    topesRestantes: topesRestantes,
    evaluarPago: evaluarPago,
    costoCambios: costoCambios,
    puedePagar: puedePagar,
    validarReglas: validarReglas,
    normalizarReglas: normalizarReglas,
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
  };
});
