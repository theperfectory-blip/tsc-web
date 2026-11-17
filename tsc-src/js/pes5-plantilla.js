'use strict';
/* ============================================================
   PES5_PLANTILLA — formato de jugador para editor + cambios
   ============================================================
   Modulo puro, SIN DOM: se puede cargar tanto en un <script> de
   navegador (define window.PES5_PLANTILLA) como en Node (para el
   test tools/test-pes5-plantilla.js, via module.exports).

   Funciones:
     - jugadorParaEditor(ED, bytes, registro, slot): lee UN jugador
       del save y lo convierte a la forma que espera el editor.
     - plantillaParaEditor(ED, bytes, indiceClub): lista de jugadores
       de UN club.
     - registroDeId(id): extrae el numero de 'r123'.
     - cambiosDesdeEditor(original, draft): solo lo que cambio.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PES5_PLANTILLA = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const STAT_MAP = { atk:'Ataque', def:'Defensa', equ:'Equilibrio', res:'Resistencia', vm:'Vel. maxima',
    ace:'Aceleracion', rsp:'Respuesta', agi:'Agilidad', pcd:'Prec. conduccion', vcd:'Vel. conduccion',
    ppc:'Prec. pase corto', vpc:'Vel. pase corto', ppl:'Prec. pase largo', vpl:'Vel. pase largo',
    pre:'Precision', pot:'Potencia', ted:'Tecnica de disparo', psf:'Prec. saq. falta', efe:'Efecto',
    cab:'Cabezazo', sal:'Salto', tec:'Tecnica', agr:'Agresividad' };
  const SEC_MAP = { ment:'Mentalidad', cons:'Regularidad en el juego', gk:'Cualidades de portero',
    teq:'Trabajo en equipo', cond:'Estabilidad', wff:'Frec. pie malo', wfa:'Prec. pie malo' };
  const ABILITY_MAP = { dribbling:'Regate', dribbleKeeping:'Hab. regate', postPlayer:'Hab. jugador poste',
    positioning:'Cap. posic.', reaction:'Reaccion', linePos:'Lineas', striker:'Hab. goleadora',
    playmaker:'Cap. mando', passing:'Pase', midRange:'Disparos medios', oneVOneShoot:'Hab. gol. 1 a 1',
    pkKick:'Hab. lanza penaltis', longThrow:'Hab. saque largo', oneTouchPass:'Hab. pase 1 toque',
    side:'Lado', center:'Centro', outside:'Exterior', manMark:'Marcaje', manMarkClose:'Marcar hombre',
    dfLine:'Control linea defensa', sliding:'Hab. deslizandose',
    pkKeeper:'Hab. portero penaltis', oneVOneKeeper:'Hab. portero 1 a 1' };
  const POSITION_MAP = { CF:'Delantero centro (DC)', SS:'Segundo delantero (SD)', WG:'Extremo',
    AMF:'Mediapunta', SMF:'Volante', CMF:'Centrocampista central (MC)', WB:'Lateral',
    DMF:'Centrocampista defensivo (MCD)', SB:'Carrilero', CB:'Central', CWP:'Libero', PT_GK:'Portero' };
  const BUCKET_BY_POS = { CF:'DC', SS:'DC', WG:'DC', AMF:'ME', SMF:'ME', CMF:'ME', WB:'ME', DMF:'ME', SB:'DE', CB:'DE', CWP:'DE', PT_GK:'PT' };
  const POSITION_LABEL = { CF:'Delantero centro', SS:'Segundo delantero', WG:'Extremo', AMF:'Mediapunta',
    SMF:'Volante', CMF:'Centrocampista central', WB:'Lateral', DMF:'Centrocampista defensivo',
    SB:'Carrilero', CB:'Central', CWP:'Líbero', GK:'Portero' };
  const INJ_BY_RAW = ['C','B','A'];

  function jugadorParaEditor(ED, bytes, registro, slot){
    const nombre = ED.nombreDeRegistro(bytes, registro);
    const stats = {}; for (const [k,campo] of Object.entries(STAT_MAP)) stats[k] = ED.leerCampoJugador(bytes, registro, campo);
    const sec = {}; for (const [k,campo] of Object.entries(SEC_MAP)) sec[k] = ED.leerCampoJugador(bytes, registro, campo);
    sec.inj = INJ_BY_RAW[ED.leerCampoJugador(bytes, registro, 'Resistencia lesiones')] || 'C';

    const marcadas = ED.posicionesMarcadas(bytes, registro);
    const positions = {};
    for (const protoKey of Object.keys(POSITION_MAP)) positions[protoKey === 'PT_GK' ? 'GK' : protoKey] = marcadas.includes(POSITION_MAP[protoKey]);
    const regNombre = ED.posicionRegistrada(bytes, registro);
    const protoKeyRegistrada = Object.keys(POSITION_MAP).find(k => POSITION_MAP[k] === regNombre) || 'CMF';
    const primaryPos = protoKeyRegistrada === 'PT_GK' ? 'GK' : protoKeyRegistrada;

    const abilities = {};
    for (const [k, campo] of Object.entries(ABILITY_MAP)) abilities[k] = !!ED.leerCampoJugador(bytes, registro, campo);

    const pie = ED.leerCampoJugador(bytes, registro, 'Pie dominante');
    const banda = ED.leerBanda(bytes, registro);
    const side = banda === 'ambas' ? 'A' : banda === 'izq' ? 'I' : 'D';

    return {
      id: 'r' + registro,
      slot,
      name: nombre,
      dorsal: '',
      bucket: BUCKET_BY_POS[protoKeyRegistrada] || 'ME',
      height: ED.leerCampoJugador(bytes, registro, 'Altura'),
      age: ED.leerCampoJugador(bytes, registro, 'Edad'),
      foot: pie === 1 ? 'Izq.' : 'Der.',
      favfoot: pie === 1 ? 'I' : 'D',
      primaryPos, tag: POSITION_LABEL[primaryPos] || primaryPos,
      stats, sec, abilities, positions, side,
      subscriber: nombre.startsWith('$'),
    };
  }

  function plantillaParaEditor(ED, bytes, indiceClub){
    return ED.leerPlantillaEquipo(bytes, indiceClub).map((id, slot) => jugadorParaEditor(ED, bytes, id, slot));
  }

  function registroDeId(id){
    if (!id || typeof id !== 'string' || !id.startsWith('r')) return null;
    const num = parseInt(id.substring(1), 10);
    return Number.isInteger(num) ? num : null;
  }

  /* EMP-80-1: atributos 0-99 de un jugador del editor (stats + sec no escala), con los
     nombres del save, para cambiosEmparejar. Es el mismo conjunto que cambiosDesdeEditor
     manda a `atributos` (escala 1-8 y lesiones quedan fuera). Devuelve {campo: numero}. */
  function atributosDeEditor(p) {
    const out = {};
    const ESCALA8 = { cons: true, cond: true, wff: true, wfa: true };
    if (p && p.stats) for (const [k, campo] of Object.entries(STAT_MAP)) {
      if (typeof p.stats[k] === 'number') out[campo] = p.stats[k];
    }
    if (p && p.sec) for (const [k, campo] of Object.entries(SEC_MAP)) {
      if (!ESCALA8[k] && typeof p.sec[k] === 'number') out[campo] = p.sec[k];
    }
    return out;
  }

  /* EMP-80-1: jugador del editor en la forma que lee la regla de emparejar (perfilEmparejar):
     atributos 0-99, habilidades (booleanas), lesiones (A/B/C), parametros 1-8 y fichaje. */
  function jugadorEmparejarDeEditor(p) {
    const q = p || {};
    const hab = {};
    if (q.abilities) for (const [k, v] of Object.entries(q.abilities)) hab[k] = v === true;
    const sec = q.sec || {};
    return {
      atributos: atributosDeEditor(q),
      habilidades: hab,
      lesiones: sec.inj,
      escala8: { cons: sec.cons, cond: sec.cond, wff: sec.wff, wfa: sec.wfa },
      fichaje: q.heightFixed === true,
    };
  }

  function cambiosDesdeEditor(original, draft) {
    const c = { atributos: {}, escala8: {}, habilidades: {} };
    const ESCALA8 = { cons: 'Regularidad en el juego', cond: 'Estabilidad', wff: 'Frec. pie malo', wfa: 'Prec. pie malo' };
    for (const [k, campo] of Object.entries(STAT_MAP)) {
      if (draft.stats && draft.stats[k] !== undefined && draft.stats[k] !== original.stats[k]) c.atributos[campo] = draft.stats[k];
    }
    for (const [k, campo] of Object.entries(SEC_MAP)) {
      if (!draft.sec || draft.sec[k] === undefined || draft.sec[k] === original.sec[k]) continue;
      if (ESCALA8[k]) c.escala8[campo] = draft.sec[k]; else c.atributos[campo] = draft.sec[k];
    }
    if (draft.sec && draft.sec.inj !== undefined && draft.sec.inj !== original.sec.inj) c.lesiones = draft.sec.inj;
    for (const [k, campo] of Object.entries(ABILITY_MAP)) {
      if (draft.abilities && draft.abilities[k] !== undefined && !!draft.abilities[k] !== !!original.abilities[k]) c.habilidades[campo] = !!draft.abilities[k];
    }
    if (draft.height !== undefined && draft.height !== original.height) c.altura = draft.height;
    if (draft.age !== undefined && draft.age !== original.age) c.edad = draft.age;
    if (draft.favfoot !== undefined && draft.favfoot !== original.favfoot) c.pieDominante = draft.favfoot === 'I' ? 'izq' : 'der';
    // Slice P: posiciones, primaryPos y side (banda)
    if (draft.positions && original.positions) {
      const originalesActivos = Object.keys(original.positions).filter(k => original.positions[k]);
      const nuevosActivos = Object.keys(draft.positions).filter(k => draft.positions[k]);
      // Comparar como conjuntos: mismo tamaño Y todos los elementos del uno estan en el otro
      const mismoTamano = originalesActivos.length === nuevosActivos.length;
      const todosEn = originalesActivos.every(k => nuevosActivos.includes(k));
      if (!mismoTamano || !todosEn) {
        // Orden: de las claves de POSITION_MAP, en el orden que esten marcadas
        const posActivas = Object.keys(POSITION_MAP).filter(k => draft.positions[k === 'PT_GK' ? 'GK' : k]);
        c.posiciones = posActivas.map(k => POSITION_MAP[k]);
      }
    }
    if (draft.primaryPos !== undefined && draft.primaryPos !== original.primaryPos) {
      c.posicionRegistrada = POSITION_MAP[draft.primaryPos === 'GK' ? 'PT_GK' : draft.primaryPos];
    }
    if (draft.side !== undefined && draft.side !== original.side) {
      c.banda = draft.side === 'I' ? 'izq' : draft.side === 'A' ? 'ambas' : 'der';
    }
    if (!Object.keys(c.atributos).length) delete c.atributos;
    if (!Object.keys(c.escala8).length) delete c.escala8;
    if (!Object.keys(c.habilidades).length) delete c.habilidades;
    return c;
  }

  // Slice Q2: inversa de cambiosDesdeEditor. Recibe un jugador en formato editor y
  // "cambios" en formato de la tool ({atributos, escala8, habilidades, altura, edad,
  // pieDominante, lesiones, posiciones, posicionRegistrada, banda}) y devuelve una COPIA
  // del jugador con esos cambios aplicados. No muta el original. Con cambios null/undefined
  // devuelve una copia igual.
  function aplicarCambiosAlJugador(jugador, cambios) {
    const j = JSON.parse(JSON.stringify(jugador));
    if (!cambios) return j;
    const ESCALA8 = { cons: 'Regularidad en el juego', cond: 'Estabilidad', wff: 'Frec. pie malo', wfa: 'Prec. pie malo' };
    for (const [k, campo] of Object.entries(STAT_MAP)) {
      if (cambios.atributos && cambios.atributos[campo] !== undefined) j.stats[k] = cambios.atributos[campo];
    }
    for (const [k, campo] of Object.entries(SEC_MAP)) {
      const src = ESCALA8[k] ? cambios.escala8 : cambios.atributos;
      if (src && src[campo] !== undefined) j.sec[k] = src[campo];
    }
    if (cambios.lesiones !== undefined) j.sec.inj = cambios.lesiones;
    for (const [k, campo] of Object.entries(ABILITY_MAP)) {
      if (cambios.habilidades && cambios.habilidades[campo] !== undefined) j.abilities[k] = !!cambios.habilidades[campo];
    }
    if (cambios.altura !== undefined) j.height = cambios.altura;
    if (cambios.edad !== undefined) j.age = cambios.edad;
    if (cambios.pieDominante !== undefined) {
      j.favfoot = cambios.pieDominante === 'izq' ? 'I' : 'D';
      j.foot = cambios.pieDominante === 'izq' ? 'Izq.' : 'Der.';
    }
    // Slice P: aplicar posiciones, primaryPos y side
    if (cambios.posiciones && Array.isArray(cambios.posiciones)) {
      const positions = {};
      Object.keys(POSITION_MAP).forEach(k => positions[k === 'PT_GK' ? 'GK' : k] = false);
      cambios.posiciones.forEach(nombre => {
        const protoKey = Object.keys(POSITION_MAP).find(k => POSITION_MAP[k] === nombre);
        if (protoKey) positions[protoKey === 'PT_GK' ? 'GK' : protoKey] = true;
      });
      j.positions = positions;
    }
    if (cambios.posicionRegistrada !== undefined) {
      const protoKey = Object.keys(POSITION_MAP).find(k => POSITION_MAP[k] === cambios.posicionRegistrada);
      if (protoKey) j.primaryPos = protoKey === 'PT_GK' ? 'GK' : protoKey;
      j.tag = POSITION_LABEL[j.primaryPos] || j.primaryPos;
      j.bucket = BUCKET_BY_POS[protoKey] || 'ME';
    }
    if (cambios.banda !== undefined) {
      j.side = cambios.banda === 'izq' ? 'I' : cambios.banda === 'ambas' ? 'A' : 'D';
    }
    return j;
  }

  /* JSON canonico: claves ordenadas, sin undefined. Mismo contenido, mismo texto, siempre. */
  function canonicoJSON(v) {
    if (Array.isArray(v)) return '[' + v.map(x => canonicoJSON(x === undefined ? null : x)).join(',') + ']';
    if (v !== null && typeof v === 'object') {
      return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort()
        .map(k => JSON.stringify(k) + ':' + canonicoJSON(v[k])).join(',') + '}';
    }
    return JSON.stringify(v === undefined ? null : v);
  }
  /* Lo que se publica de UN equipo (jugadores + formacion). Solo depende de los registros de ESE
     club: el teamHash cambia cuando cambia este equipo, no cuando cambia otro. */
  function contenidoDelEquipo(jugadores, formacion) {
    return canonicoJSON({ jugadores: jugadores || [], formacion: formacion == null ? null : formacion });
  }
  /* Plantilla publicada (pes5_plantillas/{teamId}) frente al save abierto. Desactualizada =
     el contenido del equipo cambio (teamHash distinto), o el club vinculado cambio (pes5ClubIdx
     distinto), o la publicacion es vieja y no trae teamHash (cuenta una sola vez: al volver a
     publicar la plantilla queda al dia). saveHash queda como dato informativo. */
  function plantillaDesactualizada(publicada, equipo, teamHashActual) {
    return !publicada.teamHash
      || publicada.teamHash !== teamHashActual
      || publicada.pes5ClubIdx !== equipo.pes5ClubIdx;
  }
  /* equipos: los vinculados y activos (los filtra quien llama). publicadas: { [teamId]: doc }.
     hashes: { [teamId]: teamHash del save actual }. Un equipo sin plantilla publicada no sale aca:
     es «Nunca», no «desactualizada». */
  function desactualizadas(equipos, publicadas, hashes) {
    return (equipos || [])
      .filter(t => publicadas && publicadas[t.id]
        && plantillaDesactualizada(publicadas[t.id], t, (hashes || {})[t.id]))
      .map(t => ({ teamId: t.id, teamName: t.name }));
  }
  /* Suscriptor de un jugador publicado: el flag, o el nombre con $ (la misma regla de
     jugadorParaEditor). Asi un jugador renombrado en el juego cuenta aunque la publicacion sea vieja. */
  function esSuscriptorPublicado(raw) {
    return !!raw.subscriber || String(raw.name || '').startsWith('$');
  }

  /* ---- Pedidos armados sobre una plantilla (slice 2.0-6.H) ----
     `cambios` de un pedido son valores ABSOLUTOS calculados contra la plantilla publicada
     que vio el presidente. Si el save cambio despues, aplicarlo deshace trabajo pagado.
     Para saber que vio el presidente: la publicacion vigente al crear el pedido. Si la
     plantilla se publico despues del pedido, esa vista no se puede reconstruir: se rechaza. */
  // Milisegundos de un Timestamp de Firestore, un Date, un ISO o un numero. null si no hay.
  function msDeFecha(v) {
    if (v == null) return null;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.toDate === 'function') return v.toDate().getTime();
    const t = typeof v === 'string' ? Date.parse(v) : (typeof v === 'number' ? v : NaN);
    return Number.isFinite(t) ? t : null;
  }
  // null si el pedido se armo sobre la publicacion vigente; si no, el motivo.
  function vistaDelPedido(publicadoMs, creadoMs) {
    if (publicadoMs == null) return 'no hay plantilla publicada para este equipo';
    if (creadoMs == null) return 'el pedido no tiene fecha de creación';
    if (publicadoMs > creadoMs) return 'la plantilla se publicó después de este pedido: el presidente pidió sobre una versión anterior (tiene que pedir de nuevo)';
    return null;
  }
  // Compara lo que el pedido toca (cambios) con el jugador del save ahora. Ambos en forma de editor.
  // null si el save sigue igual a lo publicado en esos campos; si no, { campo, era, ahora }.
  function cambiosContraSave(publicadoJugador, saveJugador, cambios) {
    const dif = cambiosDesdeEditor(publicadoJugador, saveJugador);   // save vs publicado
    const era = cambiosDesdeEditor(saveJugador, publicadoJugador);   // publicado (lo que vio el presidente)
    const c = cambios || {};
    for (const grupo of Object.keys(c)) {
      const val = c[grupo];
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        for (const campo of Object.keys(val)) {
          if (dif[grupo] && Object.prototype.hasOwnProperty.call(dif[grupo], campo)) {
            return { campo: campo, era: era[grupo] ? era[grupo][campo] : undefined, ahora: dif[grupo][campo] };
          }
        }
      } else if (Object.prototype.hasOwnProperty.call(dif, grupo)) {
        return { campo: grupo, era: era[grupo], ahora: dif[grupo] };
      }
    }
    return null;
  }
  // Formacion del save contra la publicada (slots 0-10). null si son iguales; si no, el primer cambio.
  function formacionContraPublicada(publicadaSlots, saveSlots) {
    const porSlot = (arr) => {
      const m = {};
      (arr || []).forEach(s => { if (s && Number.isInteger(s.slot)) m[s.slot] = s; });
      return m;
    };
    const pub = porSlot(publicadaSlots), ahora = porSlot(saveSlots);
    for (let k = 0; k <= 10; k++) {
      const a = pub[k] || {}, b = ahora[k] || {};
      for (const campo of ['jugador', 'prof', 'lat', 'posNombre']) {
        const va = a[campo] === undefined ? null : a[campo];
        const vb = b[campo] === undefined ? null : b[campo];
        if (va !== vb) return { slot: k, campo: campo, era: va, ahora: vb };
      }
    }
    return null;
  }
  // true si algun pedido aplicado es posterior a la publicacion (Luis aplico lo que aun no publico).
  function aplicadosDespuesDePublicar(aplicados, publicadoMs) {
    const lista = aplicados || [];
    if (publicadoMs == null) return lista.length > 0;
    return lista.some(p => { const t = msDeFecha(p.aplicadoEn); return t != null && t > publicadoMs; });
  }

  /* Republicar (2.0-6.H2): si el doc ya guarda el mismo contenido (teamHash) y club, no se
     reescribe; asi publicadoEn no cambia y los pedidos armados sobre esa vista siguen validos. */
  function debeReescribirPublicacion(previa, teamHash, pes5ClubIdx) {
    if (!previa) return true;
    return !(previa.teamHash === teamHash && previa.pes5ClubIdx === pes5ClubIdx);
  }

  /* SYNC-1: el save abierto es mas viejo que el publicado? Compara la fecha de modificacion del
     archivo local con la que guardo la ultima subida (pes5_config/save.lastModified). Si la subida
     no la trae (anterior a SYNC-1), compara con subidoEn. Sin publicado o sin fecha local, no avisa. */
  function saveMasViejoQuePublicado(localLM, pub) {
    if (localLM == null || !pub) return false;
    let ref = null;
    if (typeof pub.lastModified === 'number') ref = pub.lastModified;
    else if (pub.subidoEn instanceof Date) ref = pub.subidoEn.getTime();
    else if (typeof pub.subidoEn === 'number') ref = pub.subidoEn;
    return ref != null && Number(localLM) < ref;
  }
  /* SYNC-1: los pedidos cuyo equipo esta en teamIds (teamId se compara como texto). */
  function pedidosDeEquipos(pedidos, teamIds) {
    const ids = new Set((teamIds || []).map(String));
    return (pedidos || []).filter(p => p && ids.has(String(p.teamId)));
  }

  /* FIX-CANCEL: el pedido de formacion pendiente mas reciente (o null). Solo manda lo que aun no aplico Luis:
     un pedido cancelado o aplicado no cuenta. Sin fecha (pedido local recien enviado) es el mas nuevo. */
  function formacionPendienteMasReciente(pedidos, msDe) {
    const ms = typeof msDe === 'function' ? msDe : (p => msDeFecha(p.creadoEn));
    const tiempo = p => { const m = ms(p); return m == null ? Number.MAX_SAFE_INTEGER : m; };
    const lista = (pedidos || []).filter(p => p && p.tipo === 'formacion' && p.estado === 'pendiente'
      && p.formacion && Array.isArray(p.formacion.slots));
    if (!lista.length) return null;
    return lista.slice().sort((a, b) => tiempo(a) - tiempo(b)).pop();
  }
  /* FORM-4: que cambio en QUIEN juega, entre dos 11 (ids de jugador en orden de slot 0-10).
     Devuelve textos: "Juan ↔ $Yuni" (dos titulares intercambian lugar) o "Entra X por Y" (quien entra
     toma el lugar de quien sale). nombreDe(id) da el nombre. [] si el 11 es el mismo. */
  function cambiosDeAlineacion(baseIds, nuevaIds, nombreDe) {
    const b = baseIds || [], n = nuevaIds || [];
    const txt = typeof nombreDe === 'function' ? nombreDe : (id => String(id));
    const out = [], hecho = new Set();
    for (let i = 0; i < n.length; i++) {
      if (hecho.has(i) || b[i] === n[i]) continue;
      const j = b.indexOf(n[i]);
      if (j >= 0 && j !== i && n[j] === b[i]) {
        out.push(txt(b[i]) + ' ↔ ' + txt(b[j]));
        hecho.add(i); hecho.add(j);
      } else {
        out.push('Entra ' + txt(n[i]) + ' por ' + txt(b[i]));
        hecho.add(i);
      }
    }
    return out;
  }

  /* ORD-2: el roster (por slot) tal como queda tras aplicar un 11 nuevo. Es el mismo calculo que
     ordenarTitulares de pes5-editor.js: cada titular que entra intercambia su slot con el que sale.
     Mejoras lo usa para ordenar la banca, asi se ve lo que la Tool va a escribir. */
  function rosterTrasTitulares(baseIds, titularesIds) {
    const r = (baseIds || []).slice(), t = titularesIds || [];
    for (let s = 0; s <= 10 && s < t.length; s++) {
      const quiere = t[s];
      if (r[s] === quiere) continue;
      const k = r.indexOf(quiere);
      if (k < 0) continue;
      [r[s], r[k]] = [r[k], r[s]];
    }
    return r;
  }

  return {
    rosterTrasTitulares: rosterTrasTitulares,
    cambiosDeAlineacion: cambiosDeAlineacion,
    formacionPendienteMasReciente: formacionPendienteMasReciente,
    debeReescribirPublicacion: debeReescribirPublicacion,
    saveMasViejoQuePublicado: saveMasViejoQuePublicado,
    pedidosDeEquipos: pedidosDeEquipos,
    msDeFecha: msDeFecha,
    vistaDelPedido: vistaDelPedido,
    cambiosContraSave: cambiosContraSave,
    formacionContraPublicada: formacionContraPublicada,
    aplicadosDespuesDePublicar: aplicadosDespuesDePublicar,
    STAT_MAP: STAT_MAP,
    SEC_MAP: SEC_MAP,
    ABILITY_MAP: ABILITY_MAP,
    POSITION_MAP: POSITION_MAP,
    BUCKET_BY_POS: BUCKET_BY_POS,
    POSITION_LABEL: POSITION_LABEL,
    INJ_BY_RAW: INJ_BY_RAW,
    jugadorParaEditor: jugadorParaEditor,
    plantillaParaEditor: plantillaParaEditor,
    registroDeId: registroDeId,
    cambiosDesdeEditor: cambiosDesdeEditor,
    atributosDeEditor: atributosDeEditor,
    jugadorEmparejarDeEditor: jugadorEmparejarDeEditor,
    aplicarCambiosAlJugador: aplicarCambiosAlJugador,
    canonicoJSON: canonicoJSON,
    contenidoDelEquipo: contenidoDelEquipo,
    plantillaDesactualizada: plantillaDesactualizada,
    desactualizadas: desactualizadas,
    esSuscriptorPublicado: esSuscriptorPublicado,
  };
});
