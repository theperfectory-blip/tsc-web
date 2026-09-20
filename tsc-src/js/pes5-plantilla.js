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
    AMF:'Mediapunta', SMF:'Volante', CMF:'Centrocampista central (MC)', WB:'Carrilero',
    DMF:'Centrocampista defensivo (MCD)', SB:'Lateral', CB:'Central', CWP:'Libero', PT_GK:'Portero' };
  const BUCKET_BY_POS = { CF:'DC', SS:'DC', WG:'DC', AMF:'ME', SMF:'ME', CMF:'ME', WB:'DE', DMF:'ME', SB:'DE', CB:'DE', CWP:'DE', PT_GK:'PT' };
  const POSITION_LABEL = { CF:'Delantero centro', SS:'Segundo delantero', WG:'Extremo', AMF:'Mediapunta',
    SMF:'Volante', CMF:'Centrocampista central', WB:'Carrilero', DMF:'Centrocampista defensivo',
    SB:'Lateral', CB:'Central', CWP:'Líbero', GK:'Portero' };
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
      stats, sec, abilities, positions,
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
    if (!Object.keys(c.atributos).length) delete c.atributos;
    if (!Object.keys(c.escala8).length) delete c.escala8;
    if (!Object.keys(c.habilidades).length) delete c.habilidades;
    return c;
  }

  // Slice Q2: inversa de cambiosDesdeEditor. Recibe un jugador en formato editor y
  // "cambios" en formato de la tool ({atributos, escala8, habilidades, altura, edad,
  // pieDominante, lesiones}) y devuelve una COPIA del jugador con esos cambios aplicados.
  // No muta el original. Con cambios null/undefined devuelve una copia igual.
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
    return j;
  }

  return {
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
    aplicarCambiosAlJugador: aplicarCambiosAlJugador,
  };
});
