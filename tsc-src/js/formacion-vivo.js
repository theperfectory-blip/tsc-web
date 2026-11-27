/* ============================================================
   FORMACIÓN EN VIVO (FV2) — pestaña «En vivo» de la Formación.

   Igual que la Formación de hoy (misma cancha, mismas franjas, mismas reglas
   de posición, misma lista de banca y reservas, misma ficha de comparación de
   js/mejoras-cambio.js y mismos botones Cancelar / Restablecer), pero los
   datos salen del juego, no del save: los lee el puente local
   (tools/pes5/live-bridge.py, contrato en tareas/API_PUENTE.md) con
   GET /estado y GET /leer, y lo que se arma se manda con POST /aplicar.

   Se monta de dos formas:
     - Mejoras del presidente (mejoras.html): botón «En vivo» del editor =
       window.FORMACION_VIVO.abrir() (overlay en #fv-host).
     - Tool PES5 (admin), pestaña «En vivo»:
       window.FORMACION_VIVO.montar(contenedor), en línea.
   window.FORMACION_VIVO.cerrar() / desmontar() para salir.

   Nada de esto escribe en Firestore ni en el save: solo habla con el puente y
   pinta. La geometría de la cancha, el HTML del campo y las reglas de posición
   vienen de window.MEJORAS_EDITOR.vivo (js/mejoras-page.js): acá no hay copias
   de esa lógica.

   Los handlers de data-on* se exponen como window.fv* (js/events.js solo llama
   funciones globales).
   ============================================================ */
window.FORMACION_VIVO = (function(){
'use strict';

/* ---------- tablas fijas ---------- */

const URL_POR_DEFECTO = 'http://127.0.0.1:8765';
const CLAVE_URL = 'tsc_fv_url';
const MS_SONDEO = 1500;
const MS_RECONEXION = 3000;
const FALLOS_PARA_REINTENTAR = 3;

const TEXTO_COND = ['Excelente', 'Buena', 'Normal', 'Baja', 'Muy baja', 'Lesionado'];
const SVG_COND = [
  '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
  '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  '<path d="M7 7l10 10"/><path d="M17 8v9H8"/>',
  '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  '<path d="M12 5v14"/><path d="M5 12h14"/>',
];
/* Las 8 flechas de ataque, en el orden de los bytes del juego
   (←, ↖, ↑, ↗, →, ↘, ↓, ↙). El índice es el bit de `flechasAtaque`. */
const FLECHAS = ['izq', 'arriba-izq', 'arriba', 'arriba-dcha', 'dcha', 'abajo-dcha', 'abajo', 'abajo-izq'];
const FLECHA_TXT = {
  'izq': 'izquierda', 'arriba-izq': 'arriba izquierda', 'arriba': 'arriba', 'arriba-dcha': 'arriba derecha',
  'dcha': 'derecha', 'abajo-dcha': 'abajo derecha', 'abajo': 'abajo', 'abajo-izq': 'abajo izquierda',
};
/* Brújula de Config. individual: 3x3 (el centro es el nombre del jugador). */
const BRUJULA = [
  ['arriba-izq', 'M17 17 7 7M7 16V7h9'], ['arriba', 'M12 19V5M5 12l7-7 7 7'], ['arriba-dcha', 'M7 17 17 7M8 7h9v9'],
  ['izq', 'M19 12H5M12 19l-7-7 7-7'], null, ['dcha', 'M5 12h14M12 5l7 7-7 7'],
  ['abajo-izq', 'M17 7 7 17M16 17H7V8'], ['abajo', 'M12 5v14M19 12l-7 7-7-7'], ['abajo-dcha', 'M7 7l10 10M17 8v9H8'],
];
/* Vector de cada flecha en la CRUZ del juego: es relativa al jugador, como el
   selector de Config. individual. «arriba» = avanzar hacia el arco rival,
   «abajo» = retroceder, «izq»/«dcha» = hacia su banda izquierda/derecha.
   La cancha no usa estos vectores directamente: pasan por vectorCancha(). */
const CRUZ = {
  'izq': [-1, 0], 'arriba-izq': [-1, -1], 'arriba': [0, -1], 'arriba-dcha': [1, -1],
  'dcha': [1, 0], 'abajo-dcha': [1, 1], 'abajo': [0, 1], 'abajo-izq': [-1, 1],
};
const ACT_COLOR = ['#2F7DE1', '#7FD3F7', '#FFFFFF'];   // Alto azul, Normal celeste, Bajo blanca
/* FV9: largo de la flecha defensiva en diámetros del punto del jugador (el
   mismo criterio que la flecha de ataque). Alto larga, Normal mediana, Bajo corta. */
const ACT_LARGO = [1.9, 1.45, 1.05];
const SIGLA_MARCAJE = ['MR', 'ZN', 'HN', 'HA'];

const ESTRATEGIAS = ['Sin estrategia', 'Normal', 'Ataque centro', 'Ataque drcha', 'Ataque izqda', 'Atq. lado opuesto',
  'Cambio banda', 'Desborde DC', 'Zona presión', 'Contraataque', 'Fuera de juego', 'Alineación A', 'Alineación B'];
const NIVEL = ['Manual', 'Auto def.', 'Normal', 'Auto atq.'];
const SISTEMA = ['Normal', 'Líbero', 'Defensa en línea'];
const ABC = ['A', 'B', 'C'];
const ACTITUD = ['Alto', 'Normal', 'Bajo'];
const MARCAJE = ['Marcaje', 'Zonas', 'Al hombre normal', 'Al hombre agresivo'];
const MODO = ['Manual', 'Semi-automático'];
const BOTONES = ['□', '△', '○', '✕'];
const BOTONES_L2 = ['L2', 'AUTO 1', 'AUTO 2', 'AUTO 3'];

/* Ajustes de equipo: clave local -> campo del mapa del puente, etiqueta y lista. */
const AJUSTES = [
  ['nivel', 'nivelAtaqueDefensa', 'Nivel ataq./def.', NIVEL],
  ['sistema', 'sistemaDefensivo', 'Sistema defensivo', SISTEMA],
  ['linea', 'lineaDefensiva', 'Línea defensiva', ABC],
  ['presion', 'zonaPresion', 'Presión', ABC],
  ['offside', 'fueraDeJuego', 'Fuera de juego', ABC],
  ['contra', 'contraataque', 'Contraataque', ABC],
];
/* Lanzadores y capitán: clave local -> campo de la cabecera y etiqueta. */
const LANZADORES = [
  ['ckl', 'cornerIzquierdo', 'Córner izq.'],
  ['ckr', 'cornerDerecho', 'Córner der.'],
  ['tll', 'tiroLibreLargo', 'Tiro libre largo'],
  ['tlc', 'tiroLibreCorto', 'Tiro libre corto'],
  ['pk', 'penal', 'Penal'],
  ['cap', 'capitan', 'Capitán'],
];
/* Códigos de posición del juego (tabla del mapa) -> sigla. */
const CODIGO_SIGLA = {
  0: 'PT', 1: 'CT', 2: 'CT', 3: 'CT', 4: 'LIB', 5: 'LIB', 6: 'CT', 7: 'CT', 8: 'DI', 9: 'DD',
  10: 'CCD', 11: 'CCD', 12: 'CCD', 13: 'CCD', 14: 'CCD', 15: 'DLI', 16: 'DLD', 17: 'CC', 18: 'CC',
  19: 'CC', 20: 'CC', 21: 'CC', 22: 'CIZ', 23: 'CDR', 24: 'MP', 25: 'MP', 26: 'MP', 27: 'MP',
  28: 'MP', 29: 'EI', 30: 'ED', 31: 'SD', 32: 'SD', 33: 'SD', 34: 'SD', 35: 'SD', 36: 'DC',
  37: 'DC', 38: 'DC', 39: 'DC', 40: 'DC',
};
/* Línea de cada sigla, para los colores de la lista y de la cancha. FV8:
   DLI/DLD son MEDIOCAMPO (carrileros), no defensa. */
const SIGLA_LINEA = {
  PT: 'gk', CT: 'def', LIB: 'def', DI: 'def', DD: 'def',
  DLI: 'mid', DLD: 'mid', CCD: 'mid', CC: 'mid', CIZ: 'mid', CDR: 'mid', MP: 'mid',
  EI: 'att', ED: 'att', SD: 'att', DC: 'att',
};
/* Posición natural publicada -> sigla de la cancha (las mismas siglas del
   editor para un jugador que no está entre los 11). */
const PPRINCIPAL_SIGLA = {
  GK: 'PT', CB: 'CT', CWP: 'LIB', SB: 'CAR', WB: 'LAT', DMF: 'MCD', CMF: 'CC',
  AMF: 'MP', SMF: 'VOL', WG: 'EX', SS: 'SD', CF: 'DC',
};
const PPRINCIPAL_LINEA = { GK: 'gk', CB: 'def', CWP: 'def', SB: 'def', WB: 'def', DMF: 'mid', CMF: 'mid', SMF: 'mid', AMF: 'mid', WG: 'att', SS: 'att', CF: 'att' };

/* Menús del juego (el mismo árbol de la pantalla de alineación de PES5). */
const MENUS = [
  ['equipo', 'Ajustes equipo'],
  ['estrategia', 'Ajustes estrategia'],
  ['individual', 'Config. individual'],
  ['lanzador', 'Lanzador / Capitán'],
  ['rapida', 'Config. rápida'],
];
/* Presets de Config. rápida: varios `campo` del mapa escritos de una vez. Las
   Alineaciones A y B guardadas por el juego no se pueden copiar desde la web:
   el puente todavía no expone esos bloques. */
const PRESETS = [
  ['ofensiva', 'Ofensiva', { nivel: 3, linea: 2, presion: 2, offside: 2, contra: 2 }],
  ['equilibrada', 'Equilibrada', { nivel: 2, linea: 1, presion: 1, offside: 1, contra: 1 }],
  ['defensiva', 'Defensiva', { nivel: 1, linea: 0, presion: 0, offside: 0, contra: 0 }],
];
const TEXTO_MOMENTO = {
  previa: {
    reloj: 'Previa',
    txt: 'Antes del partido. Si la pantalla de alineación está abierta, lo que envíes se aplica al instante. Se ven titulares, banca y reservas.',
  },
  jugando: {
    reloj: 'Jugando',
    txt: 'Balón en juego. Puedes armar y enviar: queda en espera hasta que se abra la pantalla de alineación, y se puede cancelar mientras tanto.',
  },
  pausa: {
    reloj: 'Pausa',
    txt: 'Pausa. Si la pantalla de alineación está abierta se aplica ahora; las sustituciones entran cuando se reanude el juego.',
  },
  entretiempo: {
    reloj: 'Entretiempo',
    txt: 'Entretiempo. Si la pantalla de alineación está abierta se aplica ahora; las sustituciones entran al empezar el segundo tiempo.',
  },
  menu: {
    reloj: 'Menú del juego',
    txt: 'El juego no está en un partido en curso. Abre la pantalla de alineación para poder escribir.',
  },
};
const ICONO = {
  cerrar: '<svg class="icn" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  check: '<svg class="icn" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>',
  shield: '<svg class="icn" viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 8.7 8 9 4.6-.3 8-4 8-9V5l-8-3Z"/></svg>',
  engranaje: '<svg class="icn" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>',
  sinConexion: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h.01"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/><path d="M5 12.86a10 10 0 0 1 5.17-2.69"/><path d="M19 12.86a10 10 0 0 0-2.01-1.52"/><path d="M2 8.82a15 15 0 0 1 4.18-2.64"/><path d="M22 8.82a15 15 0 0 0-11.29-3.76"/><path d="m2 2 20 20"/></svg>',
  cerrado: '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.98 3.59c-.01.05-.01.1-.02.15C2.6 9.42 2 14.46 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 16h4.34a2 2 0 0 1 1.41.59L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.55-.6-6.58-.69-7.26a4 4 0 0 0-3.99-3.74Z"/></svg>',
  sinPartido: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>',
  cargando: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>',
  alerta: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
};

/* ---------- estado del panel ---------- */
const D = {
  abierto: false,
  inline: false,
  host: null,
  url: URL_POR_DEFECTO,
  conexion: 'iniciando',   // iniciando | ok | juego-cerrado | sin-partido | sin-conexion
  error: null,
  fallos: 0,               // intentos fallidos seguidos contra el puente
  probado: false,          // el admin ya tocó «Probar» en el panel Conexión
  panelConexion: false,    // panel de URL del puente (solo admin)
  st: null,                // estado que informa el puente
  firma: null,             // JSON del estado, para releer solo cuando cambia algo
  equipos: {},             // {local: modelo, visitante: modelo}
  mio: null, rival: null,
  lado: 'local',
  ladoMio: 'local',
  eleccionManual: false,   // solo la Tool deja elegir el lado a editar
  nombres: new Map(),      // registro (u16) -> jugador publicado
  registrosPropios: new Set(),
  equipoPropio: '',
  nombrePropio: '',
  capa: 'estado',
  sel: null, banca: null, ver: null, cmp: null,
  menu: null, indSlot: null,
  esqSel: null, varSel: null, variantes: null,
  order: [], sent: [], msg: null,
  salidos: [],
  aplicando: false,
  arrastrado: false,
  autoPausa: false,
  releerPendiente: false,
};
let _timer = 0;
let _consultando = false;
let _oyentes = false;
let _arrastre = null;

/* ---------- ayudas ---------- */
function util(){ return (window.MEJORAS_EDITOR && window.MEJORAS_EDITOR.vivo) || null; }
function esc(v){ return escHtml(v); }
function escA(v){ return escAttr(v); }
function num(v){ if (v === '' || v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; }
function reg(v){ const n = Number(String(v == null ? '' : v).replace(/^r/i, '')); return Number.isFinite(n) ? n : null; }
function baseUrl(){ return String(D.url || URL_POR_DEFECTO).replace(/\/+$/, ''); }
function enPartido(){ return !!(D.st && D.st.partidoEmpezado); }
/* Con partido cargado se dibuja la cancha, la lista y el pedido. En los demás
   estados (sin puente, juego cerrado o juego abierto sin partido) no hay
   alineación real: el panel muestra solo la tarjeta del estado. */
function hayPartido(){
  return !!(D.conexion === 'ok' && D.st && D.st.partidoCargado !== false && D.mio);
}
/* «AUTH» es un `let` de nivel superior de js/auth.js: no es propiedad de
   window (igual que en el resto de la app, se consulta con typeof). */
function esAdmin(){
  return typeof AUTH !== 'undefined' && !!AUTH && AUTH.role === 'admin';
}
function esPresidente(){
  return typeof AUTH !== 'undefined' && !!AUTH && AUTH.role === 'president';
}
function esLogueado(){
  return typeof AUTH !== 'undefined' && !!AUTH && !!AUTH.user;
}
/* Jugadores del lado que están en el plantel publicado del usuario. Se mira
   sobre los 11 titulares: con 5 o más el lado es el suyo (el plantel del
   presidente puede estar desactualizado y faltar algún titular, pero no la
   mitad del equipo). */
function idDeCasilla(m, casilla){
  const s = m && m.slots ? m.slots[casilla] : null;
  if (s && s.id != null) return num(s.id);
  const idx = (m && m.orden) ? m.orden[casilla] : null;
  return (m && m.ids && idx != null && m.ids[idx] != null) ? num(m.ids[idx]) : null;
}
function jugadoresPropiosDe(m){
  if (!m || !D.registrosPropios || !D.registrosPropios.size) return 0;
  let n = 0;
  for (let i = 0; i < 11; i++){
    const id = idDeCasilla(m, i);
    if (id != null && D.registrosPropios.has(id)) n++;
  }
  return n;
}
function esMiEquipo(m){
  return jugadoresPropiosDe(m) >= 5;
}
/* El admin edita los dos lados. El presidente, solo el lado que coincide con
   su plantel publicado; cualquier otro caso queda en solo lectura. */
function puedeEditar(){
  if (!hayPartido()) return false;
  if (esAdmin()) return true;
  return esPresidente() && esMiEquipo(D.mio);
}
/* El panel de conexión (URL del puente) es solo para admin. */
function puedeConfigurarConexion(){
  return esAdmin();
}
function olvidarEquipos(){
  D.equipos = {}; D.mio = null; D.rival = null;
  D.sel = null; D.banca = null; D.ver = null; D.cmp = null; D.menu = null;
  D.esqSel = null; D.varSel = null; D.indSlot = null;
  D.nombrePropio = '';
}
function puedeEscribir(){
  const st = D.st || {};
  if (typeof st.puedeEscribir === 'boolean') return st.puedeEscribir;
  return !!st.alineacionAbierta;
}
function momentoActual(){
  const st = D.st; if (!st) return null;
  const m = String(st.momento || '').toLowerCase();
  if (TEXTO_MOMENTO[m]) return m;
  if (!st.partidoEmpezado) return 'previa';
  if (st.pausa) return 'pausa';
  return 'jugando';
}
function msg(texto, aviso){ D.msg = { t: String(texto == null ? '' : texto), w: !!aviso }; }
function esVertical(){
  try { return !!(window.matchMedia && window.matchMedia('(max-width:859.98px)').matches); }
  catch(e){ return false; }
}
function filaLateral(lat){
  const u = util();
  if (u && u.filaLateral) return u.filaLateral(lat);
  return Math.max(1, Math.min(47, Math.round(1 + (Number(lat) - 6) * 46 / 93)));
}
function latDeFila(fila){
  const u = util();
  if (u && u.latDeFila) return u.latDeFila(fila);
  return Math.max(6, Math.min(99, Math.round(6 + (fila - 1) * 93 / 46)));
}

/* ---------- puente ---------- */

/* Petición al puente con tope de tiempo. Los errores del puente se muestran
   tal cual: si el cuerpo trae `error` o `errores`, ese texto se propaga. */
async function pedirJson(ruta, opciones){
  const op = opciones || {};
  const ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
  const temporizador = ctrl ? setTimeout(function(){ try { ctrl.abort(); } catch(e){} }, op.tope || 8000) : 0;
  const cabeceras = {};
  if (op.body != null) cabeceras['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(baseUrl() + ruta, {
      method: op.method || 'GET',
      cache: 'no-store',
      headers: cabeceras,
      body: op.body != null ? JSON.stringify(op.body) : undefined,
      signal: ctrl ? ctrl.signal : undefined,
    });
  } finally {
    if (temporizador) clearTimeout(temporizador);
  }
  const texto = await res.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch(e){ json = null; }
  if (!res.ok){
    const detalle = json
      ? (Array.isArray(json.errores) ? json.errores.join(' · ') : (json.errores || json.error || ''))
      : '';
    throw new Error(detalle || ('El puente respondió HTTP ' + res.status + (texto ? ': ' + texto.slice(0, 240) : '')));
  }
  if (!json) throw new Error('El puente respondió algo que no es JSON.');
  return json;
}

/* EQUIPO del contrato -> modelo del panel. Acepta también la forma cruda de
   pes5_vivo.leer_equipo (titulares + campos) para no depender de detalles. */
function modeloDe(eq, lado){
  if (!eq) return null;
  const campos = eq.campos || {};
  const ids = Array.isArray(eq.ids) ? eq.ids.slice(0, 32).map(function(v){ return num(v); }) : [];
  const orden = [];
  if (Array.isArray(eq.orden) && eq.orden.length >= 32){
    for (let i = 0; i < 32; i++) orden.push(num(eq.orden[i]) || 0);
  }
  /* FV5: las 11 casillas siempre salen del puente. Se acepta `slots` (forma
     del contrato) o `titulares` (forma cruda) y, si falta alguna, se completa
     con la otra lista o con los campos sueltos del registro: nunca se descarta
     una casilla por no tener nombre ni por no ser del plantel del presidente. */
  const crudos = [];
  for (let i = 0; i < 11; i++){
    const deSlot = Array.isArray(eq.slots) ? eq.slots[i] : null;
    const deTitular = Array.isArray(eq.titulares) ? eq.titulares[i] : null;
    crudos.push(deSlot || deTitular || {});
  }
  if (!orden.length){
    // sin orden utilizable: cada casilla es su propio índice
    for (let i = 0; i < 32; i++) orden.push(i);
    crudos.forEach(function(c, i){
      const ind = num(c && c.indice);
      if (i < 32 && ind != null) orden[i] = ind;
    });
  }
  const slots = [];
  for (let i = 0; i < 11; i++){
    const c = crudos[i] || {};
    let prof = num(c.prof);
    if (prof == null && campos.profundidad) prof = num(campos.profundidad[i]);
    let lat = num(c.lat);
    if (lat == null && campos.lateral) lat = num(campos.lateral[i]);
    const codigo = num(c.codigo) != null ? num(c.codigo) : (campos.posicion ? num(campos.posicion[i]) : null);
    let sigla = c.pos ? String(c.pos).toUpperCase() : '';
    if (!sigla && codigo != null) sigla = CODIGO_SIGLA[codigo] || '';
    const flechas = Array.isArray(c.flechas)
      ? c.flechas.filter(function(f){ return typeof f === 'string'; })
      : flechasDeBytes(campos.flechasAtaque && campos.flechasAtaque[i]);
    let act = num(c.act);
    if (act == null && campos.actitudDefensiva) act = num(campos.actitudDefensiva[i]);
    let mark = num(c.mark);
    if (mark == null && campos.marcaje) mark = num(campos.marcaje[i]);
    let rival = num(c.rival);
    if (rival == null && campos.rivalMarcado) rival = num(campos.rivalMarcado[i]);
    if (rival === 255) rival = null;
    if (prof == null) prof = i === 0 ? 1 : 8;
    const profFinal = Math.max(2, Math.min(47, Math.round(prof) || (i === 0 ? 1 : 2)));
    const indice = orden[i] == null ? i : orden[i];
    // El id del slot manda; si el puente no lo trae en `slots`, sale del
    // registro (`ids`) por el índice de plantel de la casilla.
    let id = num(c.id);
    if (id == null && ids[indice] != null) id = num(ids[indice]);
    const s = {
      casilla: i,
      indice: indice,
      id: id,
      prof: profFinal,
      lat: lat == null ? null : Math.max(6, Math.min(99, Math.round(lat))),
      pos: sigla || (i === 0 ? 'PT' : 'CC'),
      codigo: codigo,
      flechas: flechas.slice(0, 2),
      act: act == null ? 1 : Math.max(0, Math.min(2, act)),
      mark: mark == null ? 0 : Math.max(0, Math.min(3, mark)),
      rival: rival,
    };
    s.x = s.prof;
    s.y = (i === 0 || s.lat == null) ? 24 : filaLateral(s.lat);
    slots.push(s);
  }
  /* FV8: familia de medio por banda de la formación de partida. Se lee del
     puente (`eq.bandas`) o de las posiciones, y una banda sin medio declarado
     vale `ci`: DLI/DLD solo si la formación de partida los traía. Queda fijada
     en la lista de casillas para que el selector no la cambie al pasar un
     medio a otra posición (solo la recalcula otra variante o esta lectura). */
  const bandasEq = (eq.bandas && typeof eq.bandas === 'object') ? eq.bandas : null;
  const u = util();
  const bandasVivas = (u && u.modoBandas) ? u.modoBandas(slots) : null;
  slots.bandasBase = {
    izq: (bandasEq ? bandasEq.izq : (bandasVivas && bandasVivas.izq)) === 'dl' ? 'dl' : 'ci',
    der: (bandasEq ? bandasEq.der : (bandasVivas && bandasVivas.der)) === 'dl' ? 'dl' : 'ci',
  };
  const cab = eq.cabecera || {};
  const lanz = cab.lanzadores || {};
  const aj = eq.ajustes || {};
  /* El contrato del puente da los lanzadores como {ckl, ckr, tll, tlc, pk} y la
     forma cruda de pes5_vivo como {cornerIzquierdo, cornerDerecho, …}; se aceptan
     las dos, con números (índice de plantel) o con {indice}. */
  const lanzador = function(corto, largo){
    const v = lanz[corto] != null ? lanz[corto] : lanz[largo];
    return indiceDe(v, cab[largo]);
  };
  const ajustes = {};
  AJUSTES.forEach(function(a){
    let v = num(aj[a[0]]);
    if (v == null && campos[a[1]] != null) v = num(campos[a[1]]);
    ajustes[a[0]] = v == null ? 0 : v;
  });
  ajustes.libero = num(aj.libero) != null ? num(aj.libero) : (num(campos.libero) != null ? num(campos.libero) : 1);
  const modo = num(cab.modo && cab.modo.codigo != null ? cab.modo.codigo : cab.modo) || 0;
  ajustes.modo = num(aj.modo) != null ? num(aj.modo) : modo;
  const capitan = indiceDe(cab.capitan, null);
  return {
    lado: String(eq.lado || lado || 'local').toLowerCase(),
    ids: ids,
    orden: orden,
    slots: slots,
    cambiosRestantes: num(eq.cambiosRestantes),
    cola: Array.isArray(eq.cola) ? eq.cola.slice(0, 7).map(function(q){ return { entra: num(q.entra), sale: num(q.sale) }; }) : [],
    cab: {
      botones: Array.isArray(cab.botones)
        ? cab.botones.slice(0, 4).map(function(b){ return num(b && b.codigo != null ? b.codigo : b) || 0; })
        : [0, 0, 0, 0],
      modo: num(cab.modo && cab.modo.codigo != null ? cab.modo.codigo : cab.modo) || 0,
      lanzadores: {
        ckl: lanzador('ckl', 'cornerIzquierdo'),
        ckr: lanzador('ckr', 'cornerDerecho'),
        tll: lanzador('tll', 'tiroLibreLargo'),
        tlc: lanzador('tlc', 'tiroLibreCorto'),
        pk: lanzador('pk', 'penal'),
        cap: indiceDe(lanz.cap, capitan),
      },
      capitan: indiceDe(lanz.cap, capitan),
    },
    aj: ajustes,
    cond: Array.isArray(eq.estadoJugador) ? eq.estadoJugador.map(function(v){ return num(v); }) : null,
    res: Array.isArray(eq.resistencia) ? eq.resistencia.map(function(r){ return r ? { actual: num(r.actual), max: num(r.maxSaque) } : null; }) : null,
  };
}
/* Capitán y lanzadores: el contrato los da como índice de plantel; la forma
   cruda los da como {indice, id, casilla}. */
function indiceDe(a, b){
  let v = a != null ? a : b;
  if (v && typeof v === 'object') v = v.indice != null ? v.indice : v.indicePlantel;
  const n = num(v);
  return n == null ? null : n;
}
function flechasDeBytes(bytes){
  if (!Array.isArray(bytes) || !bytes.length) return [];
  const out = [];
  for (let j = 0; j < bytes.length && j < FLECHAS.length; j++) if (num(bytes[j])) out.push(FLECHAS[j]);
  return out;
}

/* ---------- nombres ----------
   Los jugadores del juego se reconocen por su registro (u16) en cualquiera de
   los planteles publicados de la web (`pes5_plantillas/${teamId}`), la misma
   fuente que usa el editor de mejoras para el equipo del presidente y la Tool
   para todos. El plantel propio se carga siempre (el editor ya lo tiene en
   memoria); la colección completa se pide además cuando las reglas dejan
   (admin) para que el rival y cualquier otro equipo TSC salgan con nombre.
   Si un id no aparece en ningún plantel, se muestra «Jugador #id». */
function jugadorPublicado(raw){
  if (!raw) return null;
  return {
    id: raw.id, name: raw.name, dorsal: raw.dorsal, tag: raw.tag, primaryPos: raw.primaryPos,
    stats: raw.stats || null, sec: raw.sec || {}, abilities: raw.abilities || {}, positions: raw.positions || {},
    height: raw.height, age: raw.age, foot: raw.foot, side: raw.side,
  };
}
function equipoDeAjustes(){
  const u = util();
  return (u && u.equipo) ? u.equipo() : null;
}
async function cargarNombres(){
  const u = util();
  const mapa = new Map();
  const propios = new Set();
  const agregar = function(raw, esPropio){
    const r = reg(raw && raw.id);
    if (r == null) return;
    if (esPropio) propios.add(r);
    const nuevo = jugadorPublicado(raw);
    const prev = mapa.get(r);
    if (!prev || esPropio || (!prev.stats && nuevo && nuevo.stats)) mapa.set(r, nuevo);
  };
  // 1) El plantel que ya tiene cargado el editor (equipo del presidente en
  //    mejoras.html; en la Tool, el que se está editando).
  if (u && u.jugadores){
    u.jugadores().forEach(function(j){ agregar(j, true); });
  }
  let fs = null;
  try {
    fs = (window.firebase && typeof firebase.firestore === 'function') ? firebase.firestore() : null;
  } catch(e){ fs = null; }   // SDK cargado pero app sin inicializar: se sigue con el editor
  const auth = (typeof AUTH !== 'undefined' && AUTH) ? AUTH : null;
  const teamId = (auth && auth.teamId != null) ? String(auth.teamId) : null;
  if (fs){
    const pedidos = [];
    // 2) El documento del equipo propio: las reglas lo dejan leer siempre, y
    //    así el nombre del equipo sale aunque el editor no esté montado.
    if (teamId){
      pedidos.push(fs.collection('pes5_plantillas').doc(teamId).get().then(function(snap){
        if (!snap.exists) return;
        (snap.data().jugadores || []).forEach(function(raw){ agregar(raw, true); });
      }).catch(function(){ /* sin permiso o sin documento: se sigue con el editor */ }));
    }
    // 3) Todos los planteles publicados (admin; cualquier rol si las reglas
    //    llegan a permitirlo). Si Firestore lo niega, se usa solo el propio.
    pedidos.push(fs.collection('pes5_plantillas').get().then(function(snap){
      snap.docs.forEach(function(d){
        const data = d.data() || {};
        const propio = teamId != null && String(data.teamId) === teamId;
        (data.jugadores || []).forEach(function(raw){ agregar(raw, propio); });
      });
    }).catch(function(){ /* reglas: el presidente solo lee el suyo */ }));
    await Promise.all(pedidos.map(function(p){ return p.catch(function(){}); }));
  }
  D.nombres = mapa;
  D.registrosPropios = propios;
  const propio = equipoDeAjustes();
  D.equipoPropio = propio && propio.name ? String(propio.name) : '';
  // Si la alineación llegó antes que los nombres, reasignar el lado propio.
  if (Object.keys(D.equipos || {}).length) asignarLados();
}
function jugadorDe(m, indice){
  if (!m || indice == null || indice < 0) return null;
  let r = (m.ids && indice < m.ids.length) ? m.ids[indice] : null;
  if (r == null){
    // El puente puede no traer `ids` completos: el slot guarda el id del juego.
    const casilla = m.orden.indexOf(indice);
    if (casilla >= 0 && m.slots[casilla]) r = m.slots[casilla].id;
  }
  const j = r != null ? D.nombres.get(Number(r)) : null;
  if (j) return j;
  const nombre = r != null ? ('Jugador #' + r) : ('Jugador ' + (indice + 1));
  const casilla = m.orden.indexOf(indice);
  const sigla = (casilla >= 0 && casilla <= 10) ? m.slots[casilla].pos : 'CC';
  return { id: 'r' + r, name: nombre, primaryPos: SIGLA_PPRINCIPAL_REV[sigla] || 'CMF', stats: null, sec: null, positions: {} };
}
const SIGLA_PPRINCIPAL_REV = (function(){
  const out = {};
  Object.keys(PPRINCIPAL_SIGLA).forEach(function(k){ out[PPRINCIPAL_SIGLA[k]] = k; });
  return out;
})();
function nombreDe(m, indice){
  const j = jugadorDe(m, indice);
  return j ? j.name : '—';
}
function esPortero(m, indice){
  const j = jugadorDe(m, indice);
  if (j && j.primaryPos) return j.primaryPos === 'GK';
  const casilla = m.orden.indexOf(indice);
  return casilla === 0 || (casilla > 0 && m.slots[casilla].pos === 'PT');
}
function casillaDe(m, indice){ return m ? m.orden.indexOf(indice) : -1; }

/* ---------- pedido ----------
   FV5: cada cambio lleva una clave (jugador/casilla + campo, el campo para los
   ajustes, el rol para lanzadores, la casilla para mover y «esquema» para las
   variantes). Si la clave se repite, la línea se REEMPLAZA en su mismo lugar
   con el último valor y conserva el «Deshacer» de ANTES del primer cambio. Si
   el último valor vuelve al original, la línea desaparece y se restaura ese
   estado. Intercambios y cambios de jugador no llevan clave: se listan uno a
   uno. */
function mismoValor(a, b){
  if (a === b) return true;
  try { return JSON.stringify(a) === JSON.stringify(b); } catch(e){ return false; }
}
function pedir(txt, undo, ops, clave, valor, original){
  D.msg = null;
  D.autoPausa = false;
  const it = { txt: txt, undo: undo, ops: ops || [], clave: clave || null, valor: valor };
  if (!clave){ D.order.push(it); return; }
  let k = -1;
  for (let i = 0; i < D.order.length; i++){
    if (D.order[i].clave === clave){ k = i; break; }
  }
  if (k >= 0){
    const prev = D.order[k];
    const origen = prev.valorOriginal !== undefined ? prev.valorOriginal : original;
    it.undo = prev.undo;          // deshacer hasta ANTES del primer cambio
    it.valorOriginal = origen;
    if (mismoValor(valor, origen)){
      if (typeof prev.undo === 'function') prev.undo();
      D.order.splice(k, 1);
      return;
    }
    D.order[k] = it;
    return;
  }
  if (original !== undefined && mismoValor(valor, original)) return;
  it.valorOriginal = original;
  D.order.push(it);
}
function deshacer(k){
  const it = D.order[k];
  if (!it) return;
  if (typeof it.undo === 'function') it.undo();
  D.order.splice(k, 1);
  D.msg = null;
  pintar();
  if (!D.order.length && !D.sent.length && D.releerPendiente) consultar(true);
}
/* Movimientos del mismo jugador = un solo renglón (se deshacen juntos). */
function registrarMovimiento(casilla, antes){
  const m = D.mio;
  if (!m) return;
  const s = m.slots[casilla];
  if (antes.prof === s.prof && antes.lat === s.lat && antes.pos === s.pos) return;
  const nombre = nombreDe(m, m.orden[casilla]);
  const txt = 'Posición: ' + nombre + ' ' + antes.pos + ' → ' + s.pos + ' (col ' + s.prof + ', fila ' + s.y + ')';
  const ops = [{ op: 'mover', casilla: casilla, prof: s.prof, lat: s.lat, pos: s.pos }];
  const ahora = { prof: s.prof, lat: s.lat, pos: s.pos, x: s.x, y: s.y };
  pedir(txt, function(){ Object.assign(s, antes); }, ops, 'mover:' + casilla, ahora, antes);
}
function instantaneaSlots(m){
  return m.slots.map(function(s){
    return { prof: s.prof, lat: s.lat, pos: s.pos, x: s.x, y: s.y, flechas: (s.flechas || []).slice(), act: s.act };
  });
}

/* ---------- cancha ---------- */
function condIcono(c){
  if (c == null) return '';
  const i = Math.max(0, Math.min(5, c));
  return '<span class="fv-cond c' + i + '" role="img" aria-label="Estado: ' + escA(TEXTO_COND[i]) + '" title="Estado: ' + escA(TEXTO_COND[i]) + '">'
    + '<svg viewBox="0 0 24 24" aria-hidden="true">' + SVG_COND[i] + '</svg></span>';
}
function condMini(c, pos){
  if (c == null) return '';
  const i = Math.max(0, Math.min(5, c));
  return '<span class="fv-dotcond c' + i + '" style="' + pos + '" title="Estado: ' + escA(TEXTO_COND[i]) + '">'
    + '<svg viewBox="0 0 24 24" aria-hidden="true">' + SVG_COND[i] + '</svg></span>';
}
/* Resistencia: línea fina al pie de la tarjeta (no ocupa una celda de la
   rejilla), para que la fila quede en una sola línea. */
function staminaHTML(m, indice){
  const enP = enPartido();
  const r = m.res ? m.res[indice] : null;
  let v = 100;
  if (enP && r && r.actual != null){
    const tope = r.max && r.max > 0 ? r.max : 100;
    v = Math.max(0, Math.min(100, Math.round(r.actual / tope * 100)));
  }
  const clase = v >= 75 ? 'hi' : (v >= 50 ? 'md' : 'lo');
  const etiqueta = enP && r && r.actual != null
    ? ('Resistencia ' + r.actual + (r.max ? ' de ' + r.max : ''))
    : 'Resistencia (el juego la carga al saque inicial)';
  return '<span class="fv-st ' + clase + '" role="img" aria-label="' + escA(etiqueta) + '" title="' + escA(etiqueta) + '"><i style="width:' + v + '%"></i></span>';
}
function canchaHTML(m, opciones){
  const u = util();
  if (!m || !u) return '';
  const o = opciones || {};
  const v = !!o.vertical;
  let puntos = '';
  if (o.rival){
    puntos = m.slots.map(function(s, i){
      const x = u.pctX(s.x, s.y, v), y = u.pctY(s.x, s.y, v);
      const nombre = nombreDe(m, m.orden[i]);
      return '<span class="ep-pitch-dot rv' + (i === 0 ? ' gk' : '') + '" style="left:' + x + '%;top:' + y + '%;" title="' + escA(nombre + ', ' + s.pos) + '"></span>';
    }).join('');
  } else if (!o.mini){
    puntos = m.slots.map(function(s, i){
      const x = u.pctX(s.x, s.y, v), y = u.pctY(s.x, s.y, v);
      const idx = m.orden[i];
      const yo = D.sel === i;
      const nombre = nombreDe(m, idx);
      const etiqueta = nombre + ', ' + s.pos;
      const cond = D.capa === 'estado' ? condMini(m.cond ? m.cond[idx] : null, 'left:' + x + '%;top:' + y + '%') : '';
      // FV5: en solo lectura el punto se dibuja igual, pero sin botón que
      // elija ni arrastre. Todas las casillas se pintan siempre.
      if (o.soloLectura){
        return '<span class="ep-pitch-dot ro' + (i === 0 ? ' gk' : '') + '" style="left:' + x + '%;top:' + y + '%;" title="' + escA(etiqueta) + '"></span>' + cond;
      }
      const clase = ['ep-pitch-dot', yo ? 'me' : '', i === 0 ? 'gk' : ''].filter(Boolean).join(' ');
      const tag = yo ? '<span class="ep-pitch-tag l-' + (SIGLA_LINEA[s.pos] || 'mid') + '">' + esc(s.pos) + '</span>' : '';
      return '<button type="button" class="' + clase + '" style="left:' + x + '%;top:' + y + '%;padding:0" data-onclick="fvPunto(this)" data-slot="' + i + '" aria-label="' + escA(etiqueta) + '" title="' + escA(etiqueta) + '">' + tag + '</button>' + cond;
    }).join('');
  }
  const capas = (o.mini || o.rival) ? '' : capaHTML(m, v);
  return u.cancha({
    vertical: v, pref: o.pref || 'fv', dots: puntos, capas: capas, prev: o.prev || '',
    clase: o.mini ? 'fv-mini' : '', alto: o.alto,
  });
}
/* Flecha de la cruz del juego -> vector de la cancha. Vertical (teléfono,
   ataque hacia arriba): la cruz coincide. Horizontal (ataque a la derecha,
   banda izquierda arriba): la cruz gira 90°, dx = -py, dy = px. Así «arriba»
   (avanzar) sale a la derecha, «abajo» a la izquierda e «izq»/«dcha» hacia
   arriba/abajo. */
function vectorCancha(px, py, v){ return v ? [px, py] : [-py, px]; }
/* Vector expresado ya en la cancha horizontal -> cancha vertical (giro de
   90°). Solo para vectores de la cancha, como la flecha defensiva. */
function rotar(dx, dy, v){ return v ? [dy, -dx] : [dx, dy]; }
/* FV9: flecha del minimapa del juego, proporcional al punto del jugador.
   `diametros` es el largo total en diámetros del punto (el ataque usa 1,45;
   la actitud defensiva, ACT_LARGO). El trazo oscuro del borde va en el mismo
   path (stroke), así se ve nítido en tema claro y oscuro. El tamaño real lo
   pone el CSS con `--fv-diam` (lo mide `ajustarFlechas`) y `--fv-d`, que
   viaja acá. */
function flechaHTML(dx, dy, color, diametros){
  const ang = Math.atan2(dy, dx) * 180 / Math.PI;
  /* El viewBox mide 100 de alto = 1,15 diámetros del punto (el alto de la
     punta, como el juego): así la punta es más alta que el punto y el asta
     queda en 0,41. El ancho del viewBox sale del largo en diámetros. */
  const ALTO = 1.15;
  const d = Math.max(0.9, Number(diametros) || 1.45);
  const ancho = Math.round(d / ALTO * 100);          // largo total en unidades
  const cabeza = Math.min(48, Math.round(ancho * 0.55));
  const codo = ancho - cabeza;
  const cuerpo = 'M2 32H' + codo + 'V0L' + (ancho - 1) + ' 50L' + codo + ' 100V68H2Z';
  return '<svg class="fv-arr" viewBox="0 0 ' + ancho + ' 100" aria-hidden="true" focusable="false"'
    + ' style="color:' + color + ';--fv-ang:' + ang + 'deg;--fv-d:' + d + '"><path d="' + cuerpo + '"/></svg>';
}
/* FV9: la flecha se mide en diámetros del punto, así que cada capa recibe el
   diámetro real del punto de su cancha (3,4 % del ancho del campo, el mismo
   que `.ep-pitch-dot`). Escala con la cancha en escritorio grande, escritorio
   chico y teléfono, horizontal y vertical. Se recalcula en cada pintar()
   (incluido el resize/girar la pantalla) y durante el arrastre. */
function ajustarFlechas(raiz){
  const host = raiz || D.host;
  if (!host || !host.querySelectorAll) return;
  host.querySelectorAll('.fv-capa').forEach(function(capa){
    const campo = capa.closest ? capa.closest('.ep-pitch-field') : null;
    if (!campo) return;
    const ancho = campo.clientWidth;
    if (ancho) capa.style.setProperty('--fv-diam', (ancho * 0.034).toFixed(2) + 'px');
  });
}
/* Durante el arrastre no se repinta (se perdería el punto): se mueve también
   la capa del jugador. FV9: la flecha ya no se achica al llegar al borde; se
   sigue dibujando por fuera de la cancha, como en el juego. */
function moverOverlay(casilla, x, y){
  const host = D.host;
  if (!host || !host.querySelectorAll) return;
  host.querySelectorAll('.fv-capa .fv-ov[data-slot="' + casilla + '"]').forEach(function(ov){
    ov.style.left = x + '%';
    ov.style.top = y + '%';
  });
  ajustarFlechas(host);
}
/* Capas que dibuja el juego sobre la cancha según el submenú. */
function capaHTML(m, v){
  const u = util();
  const c = D.capa;
  if (c === 'estado' || !u) return '';
  let h = '';
  m.slots.forEach(function(s, i){
    const x = u.pctX(s.x, s.y, v), y = u.pctY(s.x, s.y, v);
    const pos = 'left:' + x + '%;top:' + y + '%';
    if (c === 'ataque') (s.flechas || []).forEach(function(f){
      const d = CRUZ[f]; if (!d) return;
      const r = vectorCancha(d[0], d[1], v);
      h += '<span class="fv-ov" data-slot="' + i + '" style="' + pos + '">' + flechaHTML(r[0], r[1], '#FFFFFF', 1.45) + '</span>';
    });
    if (c === 'defensa'){
      // FV5: también el arquero tiene su flecha defensiva (Normal = celeste).
      // FV6: apunta al arco propio: izquierda en horizontal, abajo en vertical.
      // FV9: el largo (Alto/Normal/Bajo) va en diámetros del punto, igual que
      // la flecha de ataque; ya no se acorta en la cancha vertical.
      const act = Math.max(0, Math.min(2, num(s.act) == null ? 1 : num(s.act)));
      const r = rotar(-1, 0, v);
      h += '<span class="fv-ov" data-slot="' + i + '" style="' + pos + '">' + flechaHTML(r[0], r[1], ACT_COLOR[act], ACT_LARGO[act]) + '</span>';
    }
    if (c === 'pos'){
      const linea = SIGLA_LINEA[s.pos] || 'mid';
      h += '<span class="fv-ov fv-sig l-' + linea + '" style="' + pos + '">' + esc(s.pos) + '</span>';
    }
    if (c === 'marcaje' && i > 0){
      const mk = Math.max(0, Math.min(3, s.mark));
      h += '<span class="fv-ov fv-sig m' + mk + '" style="' + pos + '">' + SIGLA_MARCAJE[mk] + '</span>';
    }
  });
  if (c === 'marcaje' && D.rival){
    const R = D.rival;
    const espejo = function(i){ const s = R.slots[i]; return { x: 49 - s.x, y: 48 - s.y }; };
    let svg = '';
    m.slots.forEach(function(s){
      if (s.mark < 2 || s.rival == null || !R.slots[s.rival]) return;
      const r = espejo(s.rival);
      svg += '<line x1="' + u.pctX(s.x, s.y, v) + '" y1="' + u.pctY(s.x, s.y, v) + '" x2="' + u.pctX(r.x, r.y, v) + '" y2="' + u.pctY(r.x, r.y, v) + '"/>';
    });
    h += '<svg class="fv-mkline" viewBox="0 0 100 100" preserveAspectRatio="none">' + svg + '</svg>';
    R.slots.forEach(function(s, i){
      const r = espejo(i);
      h += '<span class="fv-rdot" style="left:' + u.pctX(r.x, r.y, v) + '%;top:' + u.pctY(r.x, r.y, v) + '%" title="' + escA(nombreDe(R, R.orden[i])) + '"></span>';
    });
  }
  return '<div class="fv-capa">' + h + '</div>';
}
const CAPAS = [['pos', 'Posición'], ['ataque', 'Ataque'], ['defensa', 'Defensa'], ['marcaje', 'Marcaje']];
function capasHTML(){
  return '<div class="fv-capas" role="group" aria-label="Qué dibujar en la cancha (por defecto, el estado)">'
    + CAPAS.map(function(c){
      return '<button type="button" data-onclick="fvCapa(this)" data-c="' + c[0] + '" aria-pressed="' + (D.capa === c[0]) + '">' + c[1] + '</button>';
    }).join('') + '</div>';
}
function esquemaTexto(m){
  const cuenta = { def: 0, mid: 0, att: 0 };
  m.slots.forEach(function(s, i){
    if (!i) return;
    cuenta[SIGLA_LINEA[s.pos] || 'mid']++;
  });
  return cuenta.def + '-' + cuenta.mid + '-' + cuenta.att;
}

/* ---------- selección y cambios ---------- */
function posInfoHTML(){
  const m = D.mio;
  const u = util();
  if (!m) return '';
  if (D.sel == null || D.cmp){
    return '<p class="fv-hint">Toca un punto para elegirlo. Arrástralo (mouse o dedo) o usa las flechas del teclado para moverlo: dentro del mediocampo los carrileros (DLI/DLD) conservan su sigla, al cruzar a otra franja cambia de posición. Toca otro titular para intercambiarlos.</p>';
  }
  const i = D.sel, s = m.slots[i];
  const zona = i === 0 ? 'Arquero (posición fija)' : (u ? ({ def: 'Defensa', mid: 'Mediocampo', att: 'Ataque' }[u.tercer(s.x)] || '') : '');
  const opciones = u ? u.opcionesPosicion(m.slots, i, i === 0) : [];
  const sel = i === 0
    ? '<span class="ep-pitch-possel fv-possel-fijo">PT</span>'
    : '<select class="ep-pitch-possel" data-onchange="fvSelPos(this.value)" aria-label="Posición">'
      + opciones.map(function(o){
        var motivo = o.motivo === 'formacion' ? ' (no en esta formación)' : ' (ocupada)';
        return '<option value="' + escA(o.pos) + '"' + (o.pos === s.pos ? ' selected' : '') + (o.disponible ? '' : ' disabled') + '>' + esc(o.pos) + (o.disponible ? '' : motivo) + '</option>';
      }).join('') + '</select>';
  return '<div class="ep-pitch-info">'
    + '<div class="ep-pitch-info-name">' + esc(nombreDe(m, m.orden[i])) + ' <span class="fv-badge">' + esc(s.pos) + '</span></div>'
    + '<div class="ep-pitch-posrow"><span class="ep-pitch-info-zone">Posición</span>' + sel + '</div>'
    + '<span class="ep-pitch-info-zone">' + esc(zona) + ' · col ' + s.prof + ' · fila ' + s.y + '</span>'
    + '</div>';
}
function moverACasilla(casilla, x, y){
  const u = util(), m = D.mio;
  if (!u || !m || casilla === 0) return false;
  const s = m.slots[casilla];
  const nx = Math.max(2, Math.min(47, Math.round(x)));
  const ny = Math.max(1, Math.min(47, Math.round(y)));
  // FV8: el arrastre conserva la sigla dentro de la franja (un DLI sigue
  // siendo DLI al cruzar la mitad, como en el juego) y la familia de medio por
  // banda la decide la formación, no la geometría.
  const pos = (u.posicionAlMover ? u.posicionAlMover(m.slots, s, nx, ny) : (u.posicionEn(nx, ny) || s.pos));
  let elegida = pos;
  if (!u.puedeAsignar(m.slots, elegida, s)){
    const alternativas = (u.opcionesPosicion ? u.opcionesPosicion(m.slots, casilla, false) : [])
      .filter(function(o){ return o.disponible; })
      .map(function(o){ return o.pos; });
    const libre = alternativas.find(function(p){ return u.puedeAsignar(m.slots, p, s); });
    if (!libre) return false;
    elegida = libre;
  }
  s.x = nx; s.y = ny; s.prof = nx; s.lat = latDeFila(ny); s.pos = elegida;
  return true;
}
function tocarTitular(casilla){
  const m = D.mio;
  if (!m || D.cmp) return;
  if (D.banca != null){ abrirCmp(casilla, D.banca); return; }
  if (D.sel == null){ D.sel = casilla; D.ver = m.orden[casilla]; return; }
  if (D.sel === casilla){ D.sel = null; D.ver = null; return; }
  intercambiar(D.sel, casilla);
  D.sel = null; D.ver = null;
}
function intercambiar(a, b){
  const m = D.mio, o = m.orden;
  const ia = o[a], ib = o[b];
  o[a] = ib; o[b] = ia;
  pedir('Intercambio de posición: ' + nombreDe(m, ib) + ' ↔ ' + nombreDe(m, ia),
    function(){ o[a] = ia; o[b] = ib; },
    [{ op: 'intercambiar', casillaA: a, casillaB: b }]);
}
function tocarBanca(indice){
  const m = D.mio;
  if (!m || D.cmp) return;
  if (D.sel != null){ abrirCmp(D.sel, indice); return; }
  if (D.banca === indice){ D.banca = null; D.ver = null; return; }
  D.banca = indice; D.ver = indice;
}
function abrirCmp(casilla, entra){
  const m = D.mio;
  if (!m) return;
  if (enPartido() && casillaDe(m, entra) > 22){ msg('Las reservas no pueden entrar con el partido empezado.', true); return; }
  if (enPartido() && m.slots[casilla].pos === 'PT' && !esPortero(m, entra)){ msg('Al arquero solo lo reemplaza otro portero.', true); return; }
  D.cmp = { casilla: casilla, entra: entra };
}
function pasarRoles(m, sale, entra){
  // El juego le pasa el rol del que sale al que entra (capitán y lanzadores).
  Object.keys(m.cab.lanzadores).forEach(function(k){ if (m.cab.lanzadores[k] === sale) m.cab.lanzadores[k] = entra; });
  if (m.cab.capitan === sale) m.cab.capitan = entra;
}
function aplicarCambio(casilla, entra){
  const m = D.mio;
  if (!m) return;
  const o = m.orden;
  const sale = o[casilla];
  if (sale === entra) return;
  if (!enPartido()){
    const ce = o.indexOf(entra);
    if (ce < 0) return;
    o[casilla] = entra; o[ce] = sale;
    const rolesAntes = JSON.parse(JSON.stringify(m.cab));
    pasarRoles(m, sale, entra);
    pedir('Cambio: entra ' + nombreDe(m, entra) + ' por ' + nombreDe(m, sale),
      function(){ o[casilla] = sale; o[ce] = entra; m.cab = rolesAntes; },
      [{ op: 'cambio', entra: entra, sale: sale }]);
    return;
  }
  if (m.cambiosRestantes != null && m.cambiosRestantes <= 0){ msg('No quedan cambios (Supl. Res. 0).', true); return; }
  const c = casillaDe(m, entra);
  if (c < 11 || c > 22){ msg('Con el partido empezado solo entra un jugador de la banca.', true); return; }
  const q = { entra: entra, sale: sale };
  m.cola.push(q);
  if (m.cambiosRestantes != null) m.cambiosRestantes--;
  pedir('Sustitución: entra ' + nombreDe(m, entra) + ' por ' + nombreDe(m, sale),
    function(){
      const k = m.cola.indexOf(q);
      if (k >= 0) m.cola.splice(k, 1);
      if (m.cambiosRestantes != null) m.cambiosRestantes++;
    },
    [{ op: 'cambio', entra: entra, sale: sale }]);
}
function confirmarCmp(){
  if (!D.cmp) return;
  const c = D.cmp;
  D.cmp = null; D.sel = null; D.banca = null; D.ver = null;
  aplicarCambio(c.casilla, c.entra);
  pintar();
}

/* ---------- esquema y variante ---------- */
async function cargarVariantes(){
  if (D.variantes) return D.variantes;
  try {
    const res = await fetch('js/pes5/pes5-variantes.json', { cache: 'force-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    D.variantes = await res.json();
  } catch(e){
    D.variantes = { esquemas: [], reglaActitud: {} };
    msg('No se pudo cargar el catálogo de esquemas (' + ((e && e.message) || 'error') + ').', true);
  }
  return D.variantes;
}
function varianteSel(){
  const cat = D.variantes;
  if (!cat || !cat.esquemas || D.esqSel == null) return null;
  const e = cat.esquemas[D.esqSel];
  if (!e || D.varSel == null) return null;
  const v = e.variantes[D.varSel];
  if (!v) return null;
  return { esquema: e, variante: v };
}
function lineasDeVariante(v){
  const n = { def: 0, mid: 0, att: 0 };
  (v.puestos || []).forEach(function(p, i){
    if (!i) return;
    n[SIGLA_LINEA[p.sigla] || 'mid']++;
  });
  return n;
}
function aplicarVariante(){
  const cur = varianteSel();
  const m = D.mio;
  const u = util();
  if (!cur || !m) return;
  const antes = instantaneaSlots(m);
  const antesBase = Object.assign({}, m.slots.bandasBase || {});
  const regla = (D.variantes && D.variantes.reglaActitud) || {};
  cur.variante.puestos.forEach(function(p, i){
    const s = m.slots[i];
    const prof = Math.max(2, Math.min(47, Math.round(num(p.prof) || 2)));
    const lat = num(p.lat);
    s.prof = prof;
    s.lat = lat == null ? null : Math.max(6, Math.min(99, Math.round(lat)));
    s.pos = String(p.sigla || s.pos).toUpperCase();
    s.x = s.prof;
    s.y = (i === 0 || s.lat == null) ? 24 : filaLateral(s.lat);
    if (i > 0){
      s.flechas = [];
      s.act = num(regla[s.pos]) == null ? 1 : num(regla[s.pos]);
    }
  });
  // FV8: la variante es la que fija la familia de medio por banda de partida.
  if (u && u.fijarBandasBase) u.fijarBandasBase(m.slots);
  D.menu = null; D.esqSel = null; D.varSel = null;
  D.sel = null; D.banca = null; D.ver = null; D.cmp = null;
  // La variante reescribe posiciones, flechas y actitud de los 11: las líneas
  // individuales de esos datos ya no representan la alineación que se ve.
  D.order = D.order.filter(function(it){
    return !/^(mover:|flechas:|ind:|rival:)/.test(String(it.clave || ''));
  });
  pedir('Esquema: ' + cur.esquema.nombre + ' ' + cur.variante.nombre,
    function(){
      m.slots.forEach(function(s, i){ Object.assign(s, antes[i]); });
      m.slots.bandasBase = Object.assign({}, antesBase);
    },
    [{ op: 'variante', esquema: cur.esquema.nombre, variante: cur.variante.nombre }],
    'esquema', instantaneaSlots(m), antes);
}
function miniPitch(prev){
  const u = util();
  if (!u) return '';
  let puntos = '';
  if (prev && prev.puestos){
    puntos = '<div class="fv-prev" aria-hidden="true">' + prev.puestos.map(function(p, i){
      const prof = Math.max(2, Math.min(47, Math.round(num(p.prof) || 2)));
      const lat = num(p.lat);
      const y = (i === 0 || lat == null) ? 24 : filaLateral(lat);
      const x = u.pctX(prof, y, false), yy = u.pctY(prof, y, false);
      return '<span class="fv-prev-dot' + (i === 0 ? ' gk' : '') + '" style="left:' + x + '%;top:' + yy + '%">' + esc(p.sigla) + '</span>';
    }).join('') + '</div>';
  }
  return u.cancha({ vertical: false, pref: 'fvp', dots: '', capas: '', prev: puntos, clase: 'fv-mini', alto: 210 });
}
async function alternarEsquema(){
  const abrir = D.menu !== 'esquema';
  D.menu = abrir ? 'esquema' : null;
  D.esqSel = null; D.varSel = null;
  D.sel = null; D.banca = null; D.ver = null; D.cmp = null;
  D.msg = null;
  pintar();
  if (abrir){ await cargarVariantes(); pintar(); }
}

/* ---------- menús ---------- */
/* Los dos botones de cada ajuste. El handler es uno solo (fvCiclo) y el grupo
   y la clave viajan en data-*: así el marcado que arma este módulo es siempre
   una llamada literal (js/events.js y el auditor de cableado lo leen igual). */
function cicloHTML(etiqueta, valores, actual, grupo, clave){
  const k = clave == null ? '' : ' data-k="' + escA(clave) + '"';
  return '<div class="fv-linea"><span>' + esc(etiqueta) + '</span><span class="fv-ciclo">'
    + '<button type="button" aria-label="Anterior" data-onclick="fvCiclo(this)" data-g="' + grupo + '"' + k + ' data-d="-1">' + ICONO.prev + '</button>'
    + '<output>' + esc(valores[actual] == null ? '—' : valores[actual]) + '</output>'
    + '<button type="button" aria-label="Siguiente" data-onclick="fvCiclo(this)" data-g="' + grupo + '"' + k + ' data-d="1">' + ICONO.next + '</button>'
    + '</span></div>';
}
function ajustesHTML(){
  const m = D.mio;
  if (!m) return '';
  const A = m.aj;
  let h = AJUSTES.map(function(a){
    return cicloHTML(a[2], a[3], A[a[0]] || 0, 'ajuste', a[0]);
  }).join('');
  if ((A.sistema || 0) === 1){
    const cts = m.slots.map(function(s, i){ return { s: s, i: i }; })
      .filter(function(o){ return o.i > 0 && (o.s.pos === 'CT' || o.s.pos === 'LIB'); });
    h += '<div class="fv-linea"><span>Líbero</span><select class="fv-sel" data-onchange="fvLibero(this.value)">'
      + (cts.length
        ? cts.map(function(o){
          return '<option value="' + o.i + '"' + (A.libero === o.i ? ' selected' : '') + '>' + esc(nombreDe(m, m.orden[o.i])) + '</option>';
        }).join('')
        : '<option value="">Sin CT titular</option>')
      + '</select></div><p class="fv-hint">Con Líbero, el líbero tiene que ser un CT titular, como en el juego.</p>';
  }
  return '<div class="fv-sub">' + h + '</div>';
}
function estrategiaHTML(){
  const m = D.mio;
  if (!m) return '';
  const A = m.aj;
  const etiquetas = (A.modo || 0) === 1 ? BOTONES_L2 : BOTONES;
  let h = cicloHTML('Modo', MODO, A.modo || 0, 'modo', null);
  h += '<div class="ep-form-grp">Estrategias de los botones</div>';
  h += (m.cab.botones || [0, 0, 0, 0]).map(function(codigo, i){
    return '<div class="fv-linea"><span>Botón ' + esc(etiquetas[i]) + '</span><select class="fv-sel" data-onchange="fvEstrategia(this)" data-i="' + i + '" aria-label="Estrategia del botón ' + escA(etiquetas[i]) + '">'
      + ESTRATEGIAS.map(function(s, j){ return '<option value="' + j + '"' + (codigo === j ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('')
      + '</select></div>';
  }).join('');
  return '<div class="fv-sub">' + h + '</div>';
}
function individualHTML(){
  const m = D.mio;
  if (!m) return '';
  const opciones = m.orden.slice(0, 11).map(function(idx, i){
    return '<option value="' + i + '"' + (D.indSlot === i ? ' selected' : '') + '>' + esc(nombreDe(m, idx)) + ' · ' + esc(m.slots[i].pos) + '</option>';
  }).join('');
  let h = '<div class="fv-linea"><span>Jugador</span><select class="fv-sel" data-onchange="fvIndSlot(this.value)"><option value="">Elegir…</option>' + opciones + '</select></div>';
  if (D.indSlot == null || !m.slots[D.indSlot]){
    h += '<p class="fv-hint">Elige un titular para ver sus flechas de ataque, su actitud defensiva y su marcaje.</p>';
  } else {
    const s = m.slots[D.indSlot];
    const compas = BRUJULA.map(function(d){
      if (!d) return '<span class="fv-centro">' + esc(nombreDe(m, m.orden[D.indSlot]).slice(0, 9)) + '</span>';
      const on = (s.flechas || []).indexOf(d[0]) >= 0;
      return '<button type="button" class="' + (on ? 'on' : '') + '" data-onclick="fvFlecha(this)" data-dir="' + d[0] + '" aria-pressed="' + on + '" aria-label="Flecha ' + escA(FLECHA_TXT[d[0]] || d[0]) + '"><svg viewBox="0 0 24 24"><path d="' + d[1] + '"/></svg></button>';
    }).join('');
    h += '<div class="ep-form-grp">Flechas de ataque (hasta 2)</div><div class="fv-compass">' + compas + '</div>'
      + '<p class="fv-hint">↑ = hacia el arco rival. La cancha gira la cruz a su vista: en horizontal, la banda izquierda queda arriba.</p>';
    h += cicloHTML('Actitud defensiva', ACTITUD, s.act || 0, 'ind', 'act');
    h += cicloHTML('Marcaje', MARCAJE, s.mark || 0, 'ind', 'mark');
    if ((s.mark || 0) >= 2){
      const rival = D.rival;
      h += '<div class="fv-linea"><span>Marca a</span><select class="fv-sel" data-onchange="fvRival(this.value)">'
        + '<option value="">Ninguno</option>'
        + (rival ? rival.orden.slice(0, 11).map(function(idx, i){
          return '<option value="' + i + '"' + (s.rival === i ? ' selected' : '') + '>' + esc(nombreDe(rival, idx)) + ' · ' + esc(rival.slots[i].pos) + '</option>';
        }).join('') : '')
        + '</select></div><p class="fv-hint">Se guarda por puesto del rival: si el rival cambia a ese jugador, marca al que entra en su lugar.</p>';
    }
  }
  return '<div class="fv-sub">' + h + '</div>';
}
function lanzadoresHTML(){
  const m = D.mio;
  if (!m) return '';
  return '<div class="fv-sub"><div class="fv-tabla-wrap"><table class="fv-kick"><thead><tr><th scope="col">Jugador</th>'
    + LANZADORES.map(function(c){ return '<th scope="col">' + esc(c[2]) + '</th>'; }).join('')
    + '</tr></thead><tbody>'
    + m.orden.slice(0, 11).map(function(idx){
      return '<tr><td class="nm">' + esc(nombreDe(m, idx)) + '</td>'
        + LANZADORES.map(function(c){
          return '<td><input type="radio" name="fv_k_' + c[0] + '" data-onchange="fvLanzador(this)" data-k="' + c[0] + '" value="' + idx + '"'
            + (m.cab.lanzadores[c[0]] === idx ? ' checked' : '') + ' aria-label="' + escA(c[2] + ': ' + nombreDe(m, idx)) + '"></td>';
        }).join('') + '</tr>';
    }).join('')
    + '</tbody></table></div><p class="fv-hint">Solo titulares. Si sale por cambio, el juego le pasa el rol al que entra.</p></div>';
}
function presetTexto(v){
  return 'Nivel ' + NIVEL[v.nivel] + ' · Línea ' + ABC[v.linea] + ' · Presión ' + ABC[v.presion];
}
function rapidaHTML(){
  return '<div class="fv-sub"><p class="fv-hint">Escribe de una vez los ajustes del equipo (varios <code>campo</code> del mapa).</p>'
    + PRESETS.map(function(p){
      return '<button type="button" class="fv-mi" data-onclick="fvPreset(this)" data-p="' + p[0] + '">' + esc(p[1]) + '<small>' + esc(presetTexto(p[2])) + '</small></button>';
    }).join('')
    + '<p class="fv-hint">Las Alineaciones A y B guardadas por el juego todavía no se pueden copiar: el puente no expone esos bloques.</p></div>';
}
function menuHTML(){
  const items = MENUS.map(function(m){
    return '<button type="button" class="fv-mi' + (D.menu === m[0] ? ' on' : '') + '" data-onclick="fvMenu(this)" data-m="' + m[0] + '" aria-expanded="' + (D.menu === m[0]) + '">' + m[1] + '</button>';
  }).join('');
  const luis = '<button type="button" class="fv-mi" disabled>' + (enPartido() ? 'Salir' : 'Comienzo del partido') + '<small>Luis</small></button>'
    + '<button type="button" class="fv-mi" disabled>Almacenar<small>Luis</small></button>';
  let sub = '';
  if (D.menu && D.mio){
    if (D.menu === 'equipo') sub = ajustesHTML();
    else if (D.menu === 'estrategia') sub = estrategiaHTML();
    else if (D.menu === 'individual') sub = individualHTML();
    else if (D.menu === 'lanzador') sub = lanzadoresHTML();
    else if (D.menu === 'rapida') sub = rapidaHTML();
  }
  return '<div class="fv-menu">' + items + luis + '</div>' + sub;
}

/* ---------- lista ---------- */
function filaHTML(m, casilla, indice, seccion, soloLectura){
  const nombre = nombreDe(m, indice);
  const enOnce = casilla <= 10;
  const jugador = jugadorDe(m, indice);
  const pos = enOnce ? m.slots[casilla].pos : (PPRINCIPAL_SIGLA[jugador && jugador.primaryPos] || (jugador && jugador.primaryPos) || '—');
  const linea = enOnce ? (SIGLA_LINEA[m.slots[casilla].pos] || 'mid') : (PPRINCIPAL_LINEA[jugador && jugador.primaryPos] || 'mid');
  const enCola = (m.cola || []).some(function(q){ return q.entra === indice || q.sale === indice; });
  const salio = D.salidos.indexOf(indice) >= 0;
  const armado = !soloLectura && ((D.sel != null && enOnce && casilla === D.sel) || D.banca === indice);
  const clase = ['ep-form-subbtn', 'fv-fila', 'es-' + seccion, armado ? 'armado' : '', D.ver === indice ? 'ver' : '',
    enCola ? 'queued' : '', salio ? 'salio' : '', soloLectura ? 'ro' : ''].filter(Boolean).join(' ');
  const delta = (!soloLectura && D.sel != null && seccion !== 'titular' && !salio) ? deltaHTML(m, D.sel, indice) : '';
  const deshabilitado = (soloLectura || salio) ? ' disabled' : '';
  const accion = soloLectura ? '' : ' data-onclick="fvFila(this)" data-idx="' + indice + '"';
  const cond = m.cond ? m.cond[indice] : null;
  /* FV7: una sola línea — flecha de condición · nombre · posición — centrada
     verticalmente y con la tarjeta lo más baja posible. La resistencia va
     como línea fina al pie, sin ocupar una celda. */
  return '<button type="button" class="' + clase + '"' + accion + deshabilitado + ' aria-pressed="' + (!!armado) + '">'
    + (cond == null ? '<span class="fv-sincond" aria-hidden="true"></span>' : condIcono(cond))
    + '<span class="ep-form-subname">' + esc(nombre) + '</span>'
    + '<span class="ep-form-cod ep-line-' + linea + '">' + esc(pos) + '</span>'
    + staminaHTML(m, indice)
    + delta
    + '</button>';
}
function deltaHTML(m, casilla, indice){
  const MC = window.MEJORAS_CAMBIO;
  if (!MC || D.sel == null) return '';
  const sale = jugadorDe(m, m.orden[casilla]);
  const entra = jugadorDe(m, indice);
  if (!sale || !entra || !sale.stats || !entra.stats) return '';
  return '<span class="ep-form-cmpd">' + MC.htmlDelta(sale, entra) + '</span>';
}
function listaHTML(m, soloLectura){
  let h = '<div class="ep-form-grp">Titulares</div>';
  h += m.orden.slice(0, 11).map(function(idx, casilla){ return filaHTML(m, casilla, idx, 'titular', soloLectura); }).join('');
  h += '<div class="ep-form-grp">Banca</div>';
  h += m.orden.slice(11, 23).map(function(idx, k){ return filaHTML(m, 11 + k, idx, 'suplente', soloLectura); }).join('');
  if (!enPartido()){
    h += '<div class="ep-form-grp">Reservas</div>';
    h += m.orden.slice(23).map(function(idx, k){ return filaHTML(m, 23 + k, idx, 'reserva', soloLectura); }).join('');
  } else {
    h += '<div class="ep-form-grp">Reservas ocultas durante el partido, como en el juego</div>';
  }
  return '<div class="ep-form-bench fv-bench" role="group" aria-label="Titulares, banca y reservas">' + h + '</div>';
}
function fichaHTML(){
  const m = D.mio;
  if (!m) return '';
  const MC = window.MEJORAS_CAMBIO;
  if (D.cmp){
    const sale = jugadorDe(m, m.orden[D.cmp.casilla]);
    const entra = jugadorDe(m, D.cmp.entra);
    if (MC && sale && entra && sale.stats && entra.stats){
      return '<div class="fv-ficha">' + MC.htmlPanel(sale, entra, { onVolver: 'fvCmpVolver', onConfirmar: 'fvCmpConfirmar', bloqueado: false }) + '</div>';
    }
    return '<div class="fv-ficha fv-ficha-simple"><p class="fv-hint">Entra <b>' + esc(entra ? entra.name : '—') + '</b> por <b>' + esc(sale ? sale.name : '—') + '</b>.</p>'
      + '<div class="fv-acts"><button type="button" class="ep-btn" data-onclick="fvCmpVolver()">Elegir otro</button>'
      + '<button type="button" class="ep-btn primary" data-onclick="fvCmpConfirmar()">Hacer el cambio</button></div></div>';
  }
  if (D.ver != null){
    const p = jugadorDe(m, D.ver);
    if (!p) return '';
    const c = casillaDe(m, D.ver);
    const rol = (c >= 0 && c <= 10) ? 'sale' : 'entra';
    const ayuda = D.banca != null ? 'Toca un titular para que entre en su lugar.'
      : (D.sel != null ? 'Toca otro jugador para cambiarlo con este.' : '');
    if (MC && p.stats) return '<div class="fv-ficha">' + MC.htmlFicha(p, { ayuda: ayuda, rol: rol }) + '</div>';
    return '<div class="fv-ficha fv-ficha-simple"><p class="fv-hint">' + esc(p.name) + '</p></div>';
  }
  return '';
}
function swapbarHTML(){
  if (D.cmp) return '';
  const m = D.mio;
  if (!m) return '';
  if (D.banca != null) return '<div class="fv-swapbar"><span>Entra ' + esc(nombreDe(m, D.banca)) + ': elige a quién reemplaza</span><button type="button" class="ep-btn" data-onclick="fvCancelar()">Cancelar</button></div>';
  if (D.sel != null) return '<div class="fv-swapbar"><span>Cambiar a ' + esc(nombreDe(m, m.orden[D.sel])) + ': elige quién entra</span><button type="button" class="ep-btn" data-onclick="fvCancelar()">Cancelar</button></div>';
  return '';
}

/* ---------- panel ---------- */
function estadoVacioDatos(){
  if (D.conexion === 'sin-conexion'){
    return { tono: 'off', icono: 'sinConexion', gira: false,
      titulo: 'No hay conexión con el juego',
      txt: 'En el PC del juego tiene que estar corriendo el puente.' };
  }
  if (D.conexion === 'juego-cerrado'){
    return { tono: 'warn', icono: 'cerrado', gira: false,
      titulo: 'PES5 está cerrado',
      txt: 'Abre PES5 y entra a la pantalla de alineación para ver la alineación del juego.' };
  }
  if (D.conexion === 'sin-partido'){
    return { tono: 'warn', icono: 'sinPartido', gira: false,
      titulo: 'PES5 está abierto, pero no hay un partido cargado',
      txt: 'Elige los equipos y entra a la pantalla de alineación.' };
  }
  if (D.conexion === 'iniciando'){
    return { tono: 'info', icono: 'cargando', gira: true,
      titulo: 'Conectando con el juego',
      txt: 'Buscando el puente local en este PC.' };
  }
  return { tono: 'warn', icono: 'alerta', gira: false,
    titulo: 'No se pudo leer la alineación',
    txt: 'El puente respondió, pero no devolvió la alineación del juego.' };
}
function estadoVacioHTML(){
  const d = estadoVacioDatos();
  const admin = puedeConfigurarConexion();
  let h = '<section class="fv-card fv-vacio-estado fv-tono-' + d.tono + '">'
    + '<div class="fv-vacio-ic' + (d.gira ? ' gira' : '') + '">' + ICONO[d.icono] + '</div>'
    + '<h3>' + esc(d.titulo) + '</h3>'
    + '<p class="fv-txt">' + esc(d.txt) + '</p>';
  if (D.conexion === 'sin-conexion'){
    h += '<div class="fv-vacio-pie"><span class="fv-reconectando">' + ICONO.cargando + 'Reconectando…</span>'
      + (D.fallos >= FALLOS_PARA_REINTENTAR
        ? '<button type="button" class="ep-btn fv-btn-mini" data-onclick="fvReintentar()">Reintentar ahora</button>'
        : '')
      + '</div>';
  }
  if (D.conexion === 'juego-cerrado' || D.conexion === 'sin-partido'){
    h += '<span class="fv-vacio-nota">Se conecta solo en cuanto el juego lo permita.</span>';
  }
  if (admin){
    if (D.error) h += '<span class="fv-error">' + esc(D.error) + '</span>';
    h += '<p class="fv-hint">La dirección del puente está en «Conexión» (el engranaje).</p>';
  }
  h += '<p class="fv-nota">Solo lee y escribe la alineación del juego: nunca el save.</p>'
    + '</section>';
  return h;
}
function resultadoPruebaHTML(){
  if (D.conexion === 'ok') return '<span class="fv-msg">Responde: hay un partido cargado.</span>';
  if (D.conexion === 'sin-partido') return '<span class="fv-msg wait">Responde: PES5 está abierto, pero no hay un partido cargado.</span>';
  if (D.conexion === 'juego-cerrado') return '<span class="fv-msg wait">Responde: PES5 está cerrado.</span>';
  if (D.conexion === 'sin-conexion'){
    return '<span class="fv-error">No responde' + (D.error ? ': ' + esc(D.error) : '.') + '</span>';
  }
  return '<span class="fv-msg wait">Conectando…</span>';
}
function conexionPanelHTML(){
  return '<section class="fv-card fv-panel-conexion" aria-label="Conexión con el juego">'
    + '<h3><span class="fv-h3-t">' + ICONO.engranaje + 'Conexión</span><span class="fv-sum">Admin</span></h3>'
    + '<label class="fv-url-lbl">URL del puente <input class="fv-url" type="url" value="' + escA(D.url) + '" data-onchange="fvUrl(this.value)" aria-label="URL del puente local" spellcheck="false" autocomplete="off"></label>'
    + '<p class="fv-hint">El puente corre en el PC del juego (<code>python tools/pes5/live-bridge.py</code>) y solo escucha en 127.0.0.1.</p>'
    + (D.probado ? resultadoPruebaHTML() : '')
    + '<div class="fv-acts">'
    + '<button type="button" class="ep-btn" data-onclick="fvProbar()">Probar</button>'
    + '<button type="button" class="fv-x" data-onclick="fvCerrarConexion()">Cerrar</button>'
    + '</div></section>';
}
function conexionHTML(){
  const clase = D.conexion === 'ok' ? 'ok' : (D.conexion === 'sin-conexion' ? 'off' : 'warn');
  const txt = D.conexion === 'ok' ? 'Conectado al juego'
    : D.conexion === 'sin-conexion' ? 'Reconectando…' : 'Conectando…';
  const detalle = (D.conexion === 'sin-conexion' && D.error)
    ? '<span class="fv-error">' + esc(D.error) + '</span>' : '';
  return '<div class="fv-conexion">'
    + '<span class="fv-dot ' + clase + '" aria-hidden="true"></span><b>' + esc(txt) + '</b>'
    + detalle
    + '<span class="fv-nota">Solo lee y escribe la alineación del juego: nunca el save.</span>'
    + '</div>';
}
function estadoHTML(){
  const mom = momentoActual();
  const t = TEXTO_MOMENTO[mom] || null;
  const editable = puedeEditar();
  const chip = !editable ? 'ro' : (puedeEscribir() ? 'ok' : 'wait');
  const chipTxt = !editable ? 'Solo lectura' : (puedeEscribir() ? 'Se aplica ya' : 'En espera');
  let detalle = 'Sin datos del juego.';
  if (D.st){
    const partes = [];
    if (D.st.alineacionAbierta) partes.push('pantalla de alineación abierta');
    if (D.st.partidoEmpezado) partes.push('partido empezado');
    if (D.st.pausa) partes.push('pausa');
    if (D.st.balonEnJuego) partes.push('balón en juego');
    detalle = partes.length ? partes.join(' · ') : 'sin indicadores activos';
  }
  return '<section class="fv-card fv-estado">'
    + '<h3>Estado del partido <span class="fv-chip ' + chip + '">' + chipTxt + '</span></h3>'
    + '<div class="fv-momento"><b>' + esc(t ? t.reloj : '—') + '</b><span>' + esc(detalle) + '</span></div>'
    + '<p class="fv-txt">' + esc(t ? t.txt : 'Conéctate al puente para ver el estado.') + '</p>'
    + '</section>';
}
/* FV5: aviso de solo lectura cuando el partido no es del equipo del
   presidente (o no hay sesión). No se dibuja el pedido ni los botones de
   edición, y la cancha y la lista quedan de lectura. */
function avisoEquipoHTML(){
  const presidente = esPresidente();
  const titulo = presidente ? 'Este partido no es de tu equipo' : 'Solo lectura';
  const txt = presidente
    ? 'Puedes mirar la alineación que está cargada en el juego, pero no editarla: los cambios los hace el equipo dueño de este lado o el admin.'
    : (esLogueado()
      ? 'Esta cuenta no edita la alineación en vivo: solo la ven los presidentes en el partido de su equipo y el admin.'
      : 'Inicia sesión con una cuenta de presidente para editar la alineación de tu equipo.');
  return '<section class="fv-card fv-aviso-equipo">'
    + '<div class="fv-aviso-ic" aria-hidden="true">' + ICONO.shield + '</div>'
    + '<div class="fv-aviso-t"><h3>' + esc(titulo) + '</h3><p class="fv-txt">' + esc(txt) + '</p></div>'
    + '</section>';
}
function canchaCardHTML(editable){
  const m = D.mio;
  if (!m) return '<section class="fv-card"><p class="fv-hint">Todavía no hay una alineación del juego.</p></section>';
  const vertical = esVertical();
  const ed = editable !== false;
  return '<section class="fv-card fv-card-cancha">'
    + '<div class="fv-crest">' + ICONO.shield + '<span>' + esc(nombreDeEquipo(m)) + ' · Alineación</span>'
    + '<span class="fv-lineup">' + esc(esquemaTexto(m)) + '</span>'
    + '<span class="fv-sum">Supl. Res. <b>' + (enPartido() ? (m.cambiosRestantes == null ? '—' : m.cambiosRestantes) : '—') + '</b></span></div>'
    + capasHTML()
    + '<div class="fv-cancha' + (vertical ? ' vert' : '') + '">'
    + canchaHTML(m, { vertical: vertical, soloLectura: !ed, alto: vertical ? Math.min(360, Math.round((window.innerHeight || 640) * 0.42)) : null })
    + '</div>'
    + (ed ? posInfoHTML() : '')
    + '</section>';
}
function listaCardHTML(editable){
  const m = D.mio;
  if (!m) return '';
  return '<section class="fv-card fv-card-lista">' + listaHTML(m, editable === false) + fichaHTML() + '</section>';
}
function pedidoHTML(){
  const items = D.order.length
    ? '<ol class="fv-ol">' + D.order.map(function(it, k){
      return '<li><span>' + esc(it.txt) + '</span><button type="button" class="fv-x" data-onclick="fvDeshacer(this)" data-k="' + k + '">Deshacer</button></li>';
    }).join('') + '</ol>'
    : '<span class="fv-vacio">Sin cambios todavía. Lo que armes en la cancha o en los menús se suma acá y se puede deshacer uno por uno.</span>';
  const enviados = D.sent.length
    ? '<div class="ep-form-grp">Enviados, esperando que se abra la alineación</div><ol class="fv-ol">' + D.sent.map(function(it, k){
      return '<li class="wait"><span>' + esc(it.txt) + '</span><button type="button" class="fv-x" data-onclick="fvCancelarEnviado(this)" data-k="' + k + '">Cancelar</button></li>';
    }).join('') + '</ol>'
    : '';
  const aviso = D.msg ? '<span class="fv-msg' + (D.msg.w ? ' wait' : '') + '">' + esc(D.msg.t) + '</span>' : '';
  return '<section class="fv-card fv-pedido"><h3>Pedido en vivo <span class="fv-chip ' + (puedeEscribir() ? 'ok' : 'wait') + '">' + (puedeEscribir() ? 'Se aplica ya' : 'En espera') + '</span></h3>'
    + items + enviados + aviso
    + '<div class="fv-acts">'
    + '<button type="button" class="ep-btn" data-onclick="fvRestablecer()"' + (D.order.length ? '' : ' disabled') + '>Restablecer</button>'
    + '<button type="button" class="ep-btn primary" data-onclick="fvEnviar()"' + ((D.order.length && !D.aplicando) ? '' : ' disabled') + '>' + ICONO.check + (D.aplicando ? 'Enviando…' : 'Enviar al juego') + '</button>'
    + '</div></section>';
}
function rivalCardHTML(){
  const R = D.rival;
  if (!R) return '<section class="fv-card fv-rival"><h3>Rival</h3><p class="fv-hint">El puente no devolvió el otro equipo.</p></section>';
  const vertical = esVertical();
  return '<section class="fv-card fv-rival"><h3>Rival <span class="fv-sum">Supl. Res. <b>' + (enPartido() ? (R.cambiosRestantes == null ? '—' : R.cambiosRestantes) : '—') + '</b></span></h3>'
    + canchaHTML(R, { mini: true, rival: true, vertical: vertical, alto: vertical ? 240 : null, pref: 'fvr' })
    + '<div class="fv-sum"><span>Rival · solo lectura</span><b>' + esc(esquemaTexto(R)) + '</b></div>'
    + '<div class="fv-bench">' + R.orden.slice(0, 11).map(function(idx, i){
      const linea = SIGLA_LINEA[R.slots[i].pos] || 'mid';
      return '<div class="ep-form-subbtn fv-fila fv-fila-rival ro">'
        + '<span class="ep-form-subname">' + esc(nombreDe(R, idx)) + '</span>'
        + '<span class="ep-form-cod ep-line-' + linea + '">' + esc(R.slots[i].pos) + '</span>'
        + '</div>';
    }).join('') + '</div></section>';
}
function nombreDeEquipo(m){
  if (!m) return 'Equipo';
  if (D.mio === m && esMiEquipo(m) && D.nombrePropio) return D.nombrePropio;
  return m.lado === 'local' ? 'Equipo local' : 'Equipo visitante';
}
/* El plantel propio reconoce su lado aunque el partido sea local o visitante.
   Para el presidente, si ninguno de los dos lados coincide con su plantel, se
   queda en el lado con más jugadores suyos (normalmente el local) y el panel
   queda en solo lectura con el aviso «Este partido no es de tu equipo». */
function asignarLados(){
  const lados = Object.keys(D.equipos || {});
  if (!lados.length){ D.mio = null; D.rival = null; D.nombrePropio = ''; return; }
  let lado = D.lado;
  if (!D.eleccionManual){
    let mejor = lados[0], puntaje = -1, propio = null;
    lados.forEach(function(l){
      const m = D.equipos[l];
      const n = (m.ids || []).filter(function(id){ return id != null && D.registrosPropios.has(Number(id)); }).length;
      if (n > puntaje){ puntaje = n; mejor = l; }
      if (!propio && esMiEquipo(m)) propio = l;
    });
    lado = propio || mejor;
  }
  if (!D.equipos[lado]) lado = lados[0];
  D.lado = lado; D.ladoMio = lado;
  D.mio = D.equipos[lado];
  D.rival = D.equipos[lado === 'local' ? 'visitante' : 'local'] || null;
  D.nombrePropio = esMiEquipo(D.mio) && D.equipoPropio ? D.equipoPropio : '';
}
function panelHTML(){
  const m = D.mio;
  const conPartido = hayPartido();
  const editable = conPartido && puedeEditar();
  const chip = puedeEscribir() ? 'ok' : 'wait';
  const cabecera = '<div class="fv-hd">'
    + '<div class="fv-hd-t">' + ICONO.shield + '<h2>Formación en vivo' + (conPartido && m ? ' · ' + esc(nombreDeEquipo(m)) : '') + '</h2></div>'
    + '<div class="fv-hd-chips">'
    + (conPartido ? '<span class="fv-chip live">En vivo</span>' : '')
    + (conPartido ? (editable
      ? '<span class="fv-chip ' + chip + '">' + (puedeEscribir() ? 'Se aplica ya' : 'En espera') + '</span>'
      : '<span class="fv-chip ro">Solo lectura</span>') : '')
    + (conPartido && enPartido() ? '<span class="fv-chip">Supl. Res. ' + (m && m.cambiosRestantes != null ? m.cambiosRestantes : '—') + '</span>' : '')
    + (conPartido && D.inline ? '<label class="fv-lado">Edito <select class="fv-sel" data-onchange="fvLado(this.value)">'
      + '<option value="local"' + (D.lado === 'local' ? ' selected' : '') + '>Local</option>'
      + '<option value="visitante"' + (D.lado === 'visitante' ? ' selected' : '') + '>Visitante</option></select></label>' : '')
    + (puedeConfigurarConexion() ? '<button type="button" class="fv-gear" data-onclick="fvConexionPanel()" aria-label="Conexión" title="Conexión" aria-expanded="' + (!!D.panelConexion) + '">' + ICONO.engranaje + '<span>Conexión</span></button>' : '')
    + '</div>'
    + '<button type="button" class="fv-cerrar" data-onclick="fvCerrar()" aria-label="Cerrar">' + ICONO.cerrar + '</button>'
    + '</div>';
  const panel = (D.panelConexion && puedeConfigurarConexion()) ? conexionPanelHTML() : '';
  let cuerpo, pie = '';
  if (conPartido){
    // FV5: si el partido no es del equipo del presidente, solo lectura: cancha
    // y lista sin selección, sin menú y sin pedido.
    cuerpo = '<div class="fv-body">'
      + panel
      + conexionHTML()
      + (editable ? '' : avisoEquipoHTML())
      + estadoHTML()
      + '<div class="fv-grid">'
        + '<div class="fv-col">' + canchaCardHTML(editable) + (editable ? swapbarHTML() : '') + listaCardHTML(editable) + '</div>'
        + '<div class="fv-col">' + (editable ? '<section class="fv-card"><h3>Menú del juego</h3>' + menuHTML() + '</section>' + pedidoHTML() : '') + rivalCardHTML() + '</div>'
      + '</div></div>';
    pie = editable ? '<div class="fv-foot">'
      + '<button type="button" class="ep-btn fv-soon-btn" data-onclick="fvAuto()" aria-disabled="true" title="El puente todavía no tiene esta operación">Alineación auto. <small>Próximamente</small></button>'
      + '<button type="button" class="ep-btn" data-onclick="fvEsquema()" aria-expanded="' + (D.menu === 'esquema') + '">Esquema</button>'
      + '<span class="fv-foot-sp"></span>'
      + '<button type="button" class="ep-btn" data-onclick="fvCancelar()"' + ((D.sel != null || D.banca != null || D.cmp) ? '' : ' disabled') + '>Cancelar</button>'
      + '<button type="button" class="ep-btn" data-onclick="fvRestablecer()"' + (D.order.length ? '' : ' disabled') + '>Restablecer</button>'
      + '<button type="button" class="ep-btn primary" data-onclick="fvEnviar()"' + ((D.order.length && !D.aplicando) ? '' : ' disabled') + '>' + ICONO.check + (D.aplicando ? 'Enviando…' : 'Enviar al juego') + '</button>'
      + '</div>' : '';
  } else {
    // Sin partido cargado no se dibuja cancha, lista, menú ni pedido: solo el
    // estado claro (y el panel de conexión, si el admin lo abrió).
    cuerpo = '<div class="fv-body fv-body-vacio">' + panel + estadoVacioHTML() + '</div>';
  }
  const hoja = (editable && D.menu === 'esquema') ? hojaEsquemaHTML() : '';
  const contenido = '<div class="fv-modal' + (D.inline ? ' fv-modal-inline' : '') + '" role="dialog" aria-label="Formación en vivo">'
    + cabecera + cuerpo + pie + hoja + '</div>';
  if (D.inline) return '<div class="ep-root fv-root fv-inline">' + contenido + '</div>';
  return '<div class="ep-overlay fv-velo" data-onclick="fvFondo(event)">' + contenido + '</div>';
}
function hojaEsquemaHTML(){
  const cat = D.variantes;
  const E = (cat && cat.esquemas) || [];
  const cur = varianteSel();
  let h = '<div class="fv-sheet" data-onclick="fvFondoHoja(event)"><div class="fv-sheet-in" role="dialog" aria-label="Esquema y variante">'
    + '<div class="fv-grab" aria-hidden="true"></div><h3>Esquema y variante</h3>';
  if (!cat){
    h += '<p class="fv-hint">Cargando el catálogo del juego…</p>';
  } else if (!E.length){
    h += '<p class="fv-hint">No se pudo cargar el catálogo de esquemas.</p>';
  } else {
    const total = E.reduce(function(a, x){ return a + x.variantes.length; }, 0);
    h += '<p class="fv-hint">' + E.length + ' esquemas y ' + total + ' variantes del juego. Aplicar una variante reinicia las flechas y pone la actitud, como en el juego.</p>';
    h += '<div class="fv-esq-sch" role="group" aria-label="Esquemas">' + E.map(function(x, i){
      return '<button type="button" class="fv-esq-schb" data-onclick="fvEsqEsquema(this)" data-i="' + i + '" aria-pressed="' + (D.esqSel === i) + '">' + esc(x.nombre) + '</button>';
    }).join('') + '</div>';
    const e = D.esqSel != null ? E[D.esqSel] : null;
    if (e){
      h += '<div class="fv-esq-vars" role="group" aria-label="Variantes ' + escA(e.nombre) + '">' + e.variantes.map(function(v, i){
        return '<button type="button" class="fv-esq-var' + (D.varSel === i ? ' on' : '') + '" data-onclick="fvEsqVariante(this)" data-i="' + i + '" aria-pressed="' + (D.varSel === i) + '">' + esc(v.nombre) + '</button>';
      }).join('') + '</div>';
    }
    if (cur){
      const n = lineasDeVariante(cur.variante);
      h += '<div class="fv-esq-cancha">' + miniPitch(cur.variante) + '</div>'
        + '<div class="fv-esq-sum"><b>' + esc(cur.esquema.nombre + ' ' + cur.variante.nombre) + '</b><span>' + n.def + ' defensas · ' + n.mid + ' medios · ' + n.att + ' delanteros</span></div>';
    } else {
      h += '<p class="fv-hint">Elige un esquema y toca una variante para verla en la cancha antes de aplicarla. El pedido no cambia hasta tocar Aplicar.</p>';
    }
  }
  h += '<div class="fv-acts"><button type="button" class="ep-btn" data-onclick="fvEsqCancelar()">Cancelar</button>'
    + '<button type="button" class="ep-btn primary" data-onclick="fvEsqAplicar()"' + (cur ? '' : ' disabled') + '>Aplicar</button></div>'
    + '</div></div>';
  return h;
}
function pintar(){
  const host = D.host;
  if (!host) return;
  const prev = host.querySelector('.fv-body');
  const scroll = prev ? prev.scrollTop : 0;
  host.innerHTML = panelHTML();
  const ahora = host.querySelector('.fv-body');
  if (ahora && scroll) ahora.scrollTop = scroll;
  ajustarFlechas(host);
}

/* ---------- envío ---------- */
/* Clave de una op para el POST: lo que escribe el mismo dato se pisa. Los
   intercambios y cambios de jugador no llevan clave (cada uno cuenta). */
function claveOp(o){
  if (!o || !o.op) return null;
  if (o.op === 'campo'){
    return 'campo:' + (o.bloque || 'principal') + ':' + o.nombre
      + ':' + (o.casilla == null ? '' : o.casilla)
      + ':' + (o.indice == null ? '' : o.indice);
  }
  if (o.op === 'mover') return 'mover:' + o.casilla;
  if (o.op === 'variante') return 'variante';
  return null;
}
/* Última línea de cada clave, en su mismo lugar (intercambios y cambios se
   conservan todos). */
function itemsUnicos(items){
  const out = [];
  const pos = new Map();
  (items || []).forEach(function(it){
    if (!it.clave){ out.push(it); return; }
    if (pos.has(it.clave)) out[pos.get(it.clave)] = it;
    else { pos.set(it.clave, out.length); out.push(it); }
  });
  return out;
}
/* FV5: el POST manda una sola op por dato (la última). Las 8 flechas de
   ataque de un jugador son 8 datos distintos y viajan las 8. */
function opsDe(items){
  const pares = [];
  (items || []).forEach(function(it){
    (it.ops || []).forEach(function(o){ pares.push({ o: o, k: claveOp(o) }); });
  });
  const ultima = new Map();
  pares.forEach(function(p, i){ if (p.k) ultima.set(p.k, i); });
  return pares.filter(function(p, i){ return !p.k || ultima.get(p.k) === i; }).map(function(p){ return p.o; });
}
/* Quita de una lista las líneas enviadas y las que comparten clave con ellas
   (la última es la que se aplicó): así no queda una línea vieja «en espera». */
function quitarItems(lista, items){
  const claves = new Set();
  (items || []).forEach(function(it){ if (it.clave) claves.add(it.clave); });
  return (lista || []).filter(function(x){
    if ((items || []).indexOf(x) >= 0) return false;
    if (x.clave && claves.has(x.clave)) return false;
    return true;
  });
}
function guardarEnEspera(items){
  items.forEach(function(it){
    if (!it.clave){ D.sent.push(it); return; }
    const k = D.sent.findIndex(function(x){ return x.clave === it.clave; });
    if (k >= 0) D.sent[k] = it; else D.sent.push(it);
  });
  D.order = quitarItems(D.order, items);
}
async function enviar(){
  if (D.aplicando || !D.order.length) return;
  if (!hayPartido()){
    msg('No hay un partido cargado en el juego.', true);
    pintar();
    return;
  }
  if (!puedeEditar()){
    msg('Solo lectura: este partido no es de tu equipo.', true);
    pintar();
    return;
  }
  const items = itemsUnicos(D.order.slice());
  const ops = opsDe(items);
  if (!ops.length){ msg('Esos cambios todavía no se pueden escribir en el juego.', true); pintar(); return; }
  if (!D.mio){ msg('No hay datos del juego: reconecta con «Reintentar».', true); pintar(); return; }
  if (!puedeEscribir()){
    guardarEnEspera(items);
    msg('En espera: se envía solo cuando se abra la pantalla de alineación del juego. Lo puedes cancelar mientras tanto.', true);
    pintar();
    return;
  }
  await aplicar(items);
}
async function aplicar(items){
  if (D.aplicando || !items.length) return;
  if (!puedeEditar()) return;
  const ops = opsDe(itemsUnicos(items));
  if (!ops.length) return;
  D.aplicando = true;
  pintar();
  try {
    const r = await pedirJson('/aplicar', { method: 'POST', body: { lado: D.ladoMio, ops: ops, salieron: D.salidos } });
    if (r && r.ok){
      D.order = quitarItems(D.order, items);
      D.sent = quitarItems(D.sent, items);
      if (Array.isArray(r.salieron)) D.salidos = r.salieron.map(function(v){ return num(v); }).filter(function(v){ return v != null; });
      msg('Aplicado en el juego. Luis ve los cambios en su pantalla.');
      D.aplicando = false;
      try { await leer(true); } catch(e){ /* si falla la relectura, el mensaje de aplicado se mantiene */ }
      return;
    }
    const errores = (r && Array.isArray(r.errores)) ? r.errores : [];
    msg(errores.length ? errores.join(' · ') : 'El puente no aplicó los cambios.', true);
    if (r && r.cerrada){
      guardarEnEspera(D.order.filter(function(x){ return items.indexOf(x) >= 0; }));
    } else {
      D.autoPausa = true;   // no reintentar lo mismo cada 1,5 s
    }
  } catch(e){
    msg((e && e.message) ? e.message : 'No se pudo enviar al juego.', true);
  } finally {
    D.aplicando = false;
    pintar();
  }
}

/* ---------- conexión ---------- */
function claveEstado(){ return D.conexion + '|' + D.fallos + '|' + (D.error || '') + '|' + (D.firma || ''); }
async function consultar(forzar){
  if (_consultando) return;
  _consultando = true;
  const antes = claveEstado();
  let releer = !!forzar;
  let releyo = false;
  let respuesta = false;
  try {
    const r = await pedirJson('/estado');
    if (r.ok === false){
      D.conexion = 'sin-conexion';
      D.error = (r.errores || []).join(' · ') || 'el puente devolvió un error';
      D.st = null;
      D.firma = null;
      olvidarEquipos();
      releer = false;
    } else if (r.juego === false){
      D.conexion = 'juego-cerrado';
      D.error = null;
      D.st = null;
      D.firma = null;
      olvidarEquipos();
      releer = false;
      if (!D.sent.length) D.autoPausa = false;
      respuesta = true;
    } else {
      respuesta = true;
      const estado = r.estado || {};
      const firma = JSON.stringify(estado);
      const abiertaAntes = !!(D.st && D.st.alineacionAbierta);
      const teniaEquipos = !!D.mio;
      D.st = estado;
      if (estado.partidoCargado === false){
        D.conexion = 'sin-partido';
        D.error = null;
        D.firma = firma;
        if (teniaEquipos) olvidarEquipos();
        D.releerPendiente = false;
        releer = false;
      } else {
        D.conexion = 'ok';
        D.error = null;
        if (firma !== D.firma) releer = true;
        if (!teniaEquipos) releer = true;   // falta la alineación: se reintenta solo
        if (!abiertaAntes && !!estado.alineacionAbierta){
          releer = true;
          D.autoPausa = false;   // se abrió la alineación: vale reintentar lo enviado
        }
        D.firma = firma;
      }
    }
  } catch(e){
    D.conexion = 'sin-conexion';
    D.error = (e && e.message) || 'no se pudo conectar con el puente';
    D.st = null;
    D.firma = null;
    olvidarEquipos();
    releer = false;
  } finally {
    _consultando = false;
  }
  D.fallos = respuesta ? 0 : D.fallos + 1;
  if (D.conexion === 'ok' && releer){
    if (!D.order.length && !D.sent.length){
      try { await leer(); releyo = true; } catch(e){ D.error = (e && e.message) || D.error; }
    } else {
      D.releerPendiente = true;
    }
  }
  // No se repinta si el sondeo no trajo nada nuevo: así no se pierde el foco ni
  // lo que se está escribiendo en la URL del puente (panel de admin).
  const escribiendo = D.panelConexion && focoEnCampo();
  if ((releyo || claveEstado() !== antes) && !escribiendo) pintar();
  if (D.abierto && hayPartido() && puedeEditar() && D.sent.length && puedeEscribir() && !D.aplicando && !D.autoPausa) await aplicar(D.sent.slice());
}
async function leer(forzar){
  if (!forzar && (D.order.length || D.sent.length)){ D.releerPendiente = true; return; }
  const r = await pedirJson('/leer?lado=ambos');
  if (r.ok === false) throw new Error((r.errores || []).join(' · ') || 'el puente no devolvió la alineación');
  if (r.estado) D.st = r.estado;
  if (r.estado && r.estado.partidoCargado === false){
    // El juego quedó en el menú (o cambiando de equipos): no hay alineación.
    D.conexion = 'sin-partido';
    D.error = null;
    olvidarEquipos();
    D.releerPendiente = false;
    return;
  }
  const equipos = Array.isArray(r.equipos) ? r.equipos : [];
  const mapa = {};
  equipos.forEach(function(eq){
    const m = modeloDe(eq, eq && eq.lado);
    if (m) mapa[m.lado] = m;
  });
  if (!Object.keys(mapa).length){
    olvidarEquipos();
    throw new Error('el puente no devolvió equipos');
  }
  D.equipos = mapa;
  asignarLados();
  D.releerPendiente = false;
  if (!puedeEditar()){
    D.sel = null; D.banca = null; D.ver = null; D.cmp = null;
    D.menu = null; D.esqSel = null; D.varSel = null; D.indSlot = null;
  } else if (D.sel != null && D.mio && D.sel > 10) D.sel = null;
}
function intervalo(){
  return D.conexion === 'sin-conexion' ? MS_RECONEXION : MS_SONDEO;
}
function programar(){
  pararSondeo();
  if (!D.abierto) return;
  _timer = setTimeout(function(){
    if (!D.abierto) return;
    consultar(false).then(programar, programar);
  }, intervalo());
}
function arrancarSondeo(){
  pararSondeo();
  consultar(true).then(programar, programar);
}
function pararSondeo(){
  if (_timer){ clearTimeout(_timer); _timer = 0; }
}

/* ---------- ciclo de vida ---------- */
function reiniciar(){
  D.conexion = 'iniciando'; D.error = null; D.st = null; D.firma = null;
  D.fallos = 0; D.probado = false; D.panelConexion = false;
  D.equipos = {}; D.mio = null; D.rival = null; D.lado = 'local'; D.ladoMio = 'local'; D.eleccionManual = false;
  D.capa = 'estado'; D.sel = null; D.banca = null; D.ver = null; D.cmp = null;
  D.menu = null; D.indSlot = null; D.esqSel = null; D.varSel = null;
  D.order = []; D.sent = []; D.msg = null; D.salidos = []; D.aplicando = false; D.releerPendiente = false;
  D.arrastrado = false; D.autoPausa = false;
  D.nombrePropio = '';
}
async function abrir(){
  if (D.abierto) return;
  D.abierto = true;
  D.inline = false;
  try { D.url = localStorage.getItem(CLAVE_URL) || URL_POR_DEFECTO; } catch(e){ D.url = URL_POR_DEFECTO; }
  reiniciar();
  let host = document.getElementById('fv-host');
  if (!host){
    host = document.createElement('div');
    host.id = 'fv-host';
    document.body.appendChild(host);
  }
  host.className = 'ep-root fv-root';
  D.host = host;
  document.documentElement.classList.add('ep-lock');
  enganchar();
  pintar();
  await cargarNombres();
  pintar();
  arrancarSondeo();
}
function cerrar(){
  if (!D.abierto) return;
  D.abierto = false;
  pararSondeo();
  if (D.host) D.host.innerHTML = '';
  if (!D.inline) document.documentElement.classList.remove('ep-lock');
  D.host = null;
  D.equipos = {}; D.mio = null; D.rival = null; D.order = []; D.sent = []; D.cmp = null;
  D.arrastrado = false; D.autoPausa = false;
}
async function montarPanel(contenedor){
  if (!contenedor) return;
  if (D.abierto) cerrar();
  D.abierto = true;
  D.inline = true;
  D.host = contenedor;
  try { D.url = localStorage.getItem(CLAVE_URL) || URL_POR_DEFECTO; } catch(e){ D.url = URL_POR_DEFECTO; }
  reiniciar();
  enganchar();
  pintar();
  await cargarNombres();
  pintar();
  arrancarSondeo();
}
function desmontarPanel(){ if (D.inline) cerrar(); }

/* ---------- oyentes ---------- */
function focoEnCampo(){
  const el = document.activeElement;
  return !!(el && el.closest && el.closest('input,select,textarea'));
}
function enganchar(){
  if (_oyentes) return;
  _oyentes = true;
  document.addEventListener('keydown', function(e){
    if (!D.abierto) return;
    if (e.key === 'Escape'){
      if (D.panelConexion){ D.panelConexion = false; pintar(); e.preventDefault(); return; }
      if (D.menu){ D.menu = null; D.esqSel = null; D.varSel = null; pintar(); e.preventDefault(); return; }
      if (!D.inline){ cerrar(); e.preventDefault(); }
      return;
    }
    if (D.sel == null || D.sel === 0 || D.cmp || D.menu === 'esquema' || focoEnCampo()) return;
    const paso = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!paso) return;
    e.preventDefault();
    const m = D.mio;
    if (!m) return;
    const s = m.slots[D.sel];
    const v = esVertical();
    const dx = v ? -paso[1] : paso[0];
    const dy = v ? paso[0] : paso[1];
    const antes = { prof: s.prof, lat: s.lat, pos: s.pos, x: s.x, y: s.y };
    if (!moverACasilla(D.sel, s.x + dx, s.y + dy)) return;
    registrarMovimiento(D.sel, antes);
    pintar();
  });
  document.addEventListener('pointerdown', function(e){
    if (!D.abierto || D.cmp || D.menu === 'esquema') return;
    const dot = (e.target && e.target.closest) ? e.target.closest('#fv-pitch-dots .ep-pitch-dot[data-slot]') : null;
    if (!dot || !D.mio) return;
    const casilla = Number(dot.dataset.slot);
    if (!(casilla > 0)) return;
    // Sin repintar: el clic (que llega después) elige el punto y el arrastre
    // mueve este mismo nodo. Repintar acá soltaría el punto que se arrastra.
    const s = D.mio.slots[casilla];
    _arrastre = {
      casilla: casilla, campo: dot.closest('.ep-pitch-field'), punto: dot,
      x0: e.clientX, y0: e.clientY, activo: false,
      antes: { prof: s.prof, lat: s.lat, pos: s.pos, x: s.x, y: s.y },
    };
  });
  document.addEventListener('pointermove', function(e){
    if (!_arrastre) return;
    if (!_arrastre.activo){
      if (Math.hypot(e.clientX - _arrastre.x0, e.clientY - _arrastre.y0) < 5) return;
      _arrastre.activo = true;
      D.sel = _arrastre.casilla;
      D.ver = D.mio ? D.mio.orden[_arrastre.casilla] : null;
      _arrastre.punto.classList.add('me', 'dragging');
    }
    if (e.cancelable) e.preventDefault();
    const u = util();
    if (!u) return;
    const v = esVertical();
    const celda = u.celdaDesdeCampo(_arrastre.campo, e.clientX, e.clientY, v);
    if (!celda) return;
    if (!moverACasilla(_arrastre.casilla, celda.x, celda.y)) return;
    const s = D.mio.slots[_arrastre.casilla];
    const px = u.pctX(s.x, s.y, v), py = u.pctY(s.x, s.y, v);
    _arrastre.punto.style.left = px + '%';
    _arrastre.punto.style.top = py + '%';
    moverOverlay(_arrastre.casilla, px, py);
  });
  const soltar = function(){
    if (!_arrastre) return;
    const a = _arrastre;
    _arrastre = null;
    if (!a.activo) return;
    D.arrastrado = true;              // el clic que sigue no vuelve a elegir
    setTimeout(function(){ D.arrastrado = false; }, 0);
    registrarMovimiento(a.casilla, a.antes);
    pintar();
  };
  document.addEventListener('pointerup', soltar);
  document.addEventListener('pointercancel', soltar);
  window.addEventListener('resize', function(){ if (D.abierto) pintar(); });
}

/* ---------- handlers (data-on*) ---------- */
function fvFondo(e){ if (e && e.target === e.currentTarget) cerrar(); }
function fvFondoHoja(e){
  if (e && e.target === e.currentTarget){
    D.menu = null; D.esqSel = null; D.varSel = null;
    pintar();
  }
}
function fvCerrar(){ cerrar(); }
function fvReintentar(){
  D.error = null; D.firma = null; D.fallos = 0;
  consultar(true).then(programar, programar);
}
function fvConexionPanel(){
  if (!puedeConfigurarConexion()) return;
  D.panelConexion = !D.panelConexion;
  D.probado = false;
  pintar();
}
function fvCerrarConexion(){ D.panelConexion = false; pintar(); }
async function fvProbar(){
  D.probado = true;
  await consultar(true);
  programar();
  pintar();
}
function fvUrl(valor){
  const v = String(valor || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(v)){
    msg('La URL del puente tiene que empezar con http:// (por ejemplo http://127.0.0.1:8765).', true);
    pintar();
    return;
  }
  D.url = v;
  try { localStorage.setItem(CLAVE_URL, v); } catch(e){}
  D.error = null; D.firma = null;
  D.probado = false;
  consultar(true).then(programar, programar);
}
function fvPunto(el){
  if (!puedeEditar() || !el || !el.dataset || D.cmp || D.arrastrado) return;
  tocarTitular(Number(el.dataset.slot));
  pintar();
}
function fvFila(el){
  if (!puedeEditar() || !el || !el.dataset || D.cmp || !D.mio) return;
  const indice = Number(el.dataset.idx);
  const casilla = casillaDe(D.mio, indice);
  if (casilla >= 0 && casilla <= 10) tocarTitular(casilla);
  else tocarBanca(indice);
  pintar();
}
function fvSelPos(valor){
  const m = D.mio;
  if (!puedeEditar() || !m || D.sel == null || D.sel === 0 || !valor) return;
  const s = m.slots[D.sel];
  if (s.pos === valor) return;
  const u = util();
  if (u && !u.puedeAsignar(m.slots, valor, s)){
    // FV8: la otra familia de medio por banda sale gris en el juego y tampoco
    // se puede elegir acá.
    const familia = u.FAMILIA_BANDA ? u.FAMILIA_BANDA[valor] : null;
    const banda = u.SIGLA_BANDA ? u.SIGLA_BANDA[valor] : null;
    const modo = (u.bandasBaseDe && banda) ? u.bandasBaseDe(m.slots)[banda] : null;
    if (familia && modo && modo !== familia){
      msg('Esta formación usa ' + (modo === 'dl' ? 'DLI/DLD' : 'CIZ/CDR') + ' en esa banda: ' + valor + ' no se puede elegir.', true);
    } else {
      msg('Esa posición no se puede usar: la línea ya está completa.', true);
    }
    pintar();
    return;
  }
  const antes = { prof: s.prof, lat: s.lat, pos: s.pos, x: s.x, y: s.y };
  s.pos = valor;
  registrarMovimiento(D.sel, antes);
  pintar();
}
function fvCancelar(){
  D.sel = null; D.banca = null; D.cmp = null; D.ver = null;
  pintar();
}
function fvCmpVolver(){ D.cmp = null; pintar(); }
function fvCmpConfirmar(){ if (puedeEditar()) confirmarCmp(); }
function fvCapa(el){
  const cual = el && el.dataset ? el.dataset.c : null;
  if (!cual) return;
  D.capa = D.capa === cual ? 'estado' : cual;
  pintar();
}
function fvMenu(el){
  if (!puedeEditar()) return;
  const clave = el && el.dataset ? el.dataset.m : null;
  if (!clave) return;
  D.menu = D.menu === clave ? null : clave;
  D.esqSel = null; D.varSel = null;
  D.sel = null; D.banca = null; D.ver = null; D.cmp = null;
  pintar();
}
function fvDeshacer(el){
  if (!el || !el.dataset) return;
  deshacer(Number(el.dataset.k));
}
function fvCancelarEnviado(el){
  if (!el || !el.dataset) return;
  const it = D.sent.splice(Number(el.dataset.k), 1)[0];
  if (it && typeof it.undo === 'function') it.undo();
  msg('Cancelado: no se aplicará en el juego.');
  pintar();
  if (!D.order.length && !D.sent.length && D.releerPendiente) consultar(true);
}
function fvRestablecer(){
  if (!puedeEditar()) return;
  for (let k = D.order.length - 1; k >= 0; k--){
    const it = D.order[k];
    if (it && typeof it.undo === 'function') it.undo();
  }
  D.order = [];
  D.msg = null;
  D.sel = null; D.banca = null; D.cmp = null; D.ver = null;
  pintar();
  consultar(true);
}
async function fvEsquema(){ if (puedeEditar()) await alternarEsquema(); }
function fvEsqEsquema(el){
  if (!el || !el.dataset) return;
  D.esqSel = Number(el.dataset.i); D.varSel = null;
  pintar();
}
function fvEsqVariante(el){
  if (!el || !el.dataset) return;
  D.varSel = Number(el.dataset.i);
  pintar();
}
function fvEsqAplicar(){ if (puedeEditar()) aplicarVariante(); pintar(); }
function fvEsqCancelar(){ D.menu = null; D.esqSel = null; D.varSel = null; pintar(); }
function fvAuto(){
  msg('Alineación auto.: próximamente. El puente todavía no tiene esa operación.', true);
  pintar();
}
/* Un solo handler para los botones ‹ › de los ajustes: el grupo (equipo,
   config. individual o modo) y la clave viajan en data-*. */
function fvCiclo(el){
  if (!el || !el.dataset) return;
  const grupo = el.dataset.g, clave = el.dataset.k, delta = Number(el.dataset.d);
  if (grupo === 'ajuste') fvAjuste(clave, delta);
  else if (grupo === 'ind') fvIndAjuste(clave, delta);
  else if (grupo === 'modo') fvModo(delta);
}
function fvAjuste(clave, delta){
  const m = D.mio;
  if (!puedeEditar() || !m) return;
  const def = AJUSTES.find(function(a){ return a[0] === clave; });
  if (!def) return;
  const lista = def[3];
  const antes = m.aj[def[0]] || 0;
  const liberoAntes = m.aj.libero;
  const nuevo = (antes + (Number(delta) >= 0 ? 1 : -1) + lista.length) % lista.length;
  m.aj[def[0]] = nuevo;
  const ops = [{ op: 'campo', nombre: def[1], valor: nuevo }];
  let extra = '';
  if (def[0] === 'sistema' && nuevo === 1){
    const libre = m.aj.libero;
    const valido = libre >= 1 && libre <= 10 && m.slots[libre] && ['CT', 'LIB'].indexOf(m.slots[libre].pos) >= 0;
    if (!valido){
      const ct = m.slots.findIndex(function(s, i){ return i > 0 && (s.pos === 'CT' || s.pos === 'LIB'); });
      if (ct > 0){
        m.aj.libero = ct;
        ops.push({ op: 'campo', nombre: 'libero', valor: ct });
        extra = ' · líbero: ' + nombreDe(m, m.orden[ct]);
      }
    }
  }
  pedir(def[2] + ': ' + lista[nuevo] + extra,
    function(){ m.aj[def[0]] = antes; m.aj.libero = liberoAntes; },
    ops, 'ajuste:' + def[0], nuevo, antes);
  pintar();
}
function fvLibero(valor){
  const m = D.mio;
  if (!puedeEditar() || !m) return;
  const casilla = Number(valor);
  if (!(casilla >= 1 && casilla <= 10)) return;
  const antes = m.aj.libero;
  m.aj.libero = casilla;
  pedir('Líbero: ' + nombreDe(m, m.orden[casilla]),
    function(){ m.aj.libero = antes; },
    [{ op: 'campo', nombre: 'libero', valor: casilla }], 'libero', casilla, antes);
  pintar();
}
function fvModo(delta){
  const m = D.mio;
  if (!puedeEditar() || !m) return;
  const antes = m.aj.modo || 0;
  const nuevo = (antes + (Number(delta) >= 0 ? 1 : -1) + MODO.length) % MODO.length;
  m.aj.modo = nuevo;
  pedir('Modo de estrategia: ' + MODO[nuevo],
    function(){ m.aj.modo = antes; },
    [{ op: 'campo', nombre: 'modoEstrategia', valor: nuevo, bloque: 'cabecera' }], 'modo', nuevo, antes);
  pintar();
}
function fvEstrategia(el){
  const m = D.mio;
  if (!puedeEditar() || !m || !el || !el.dataset) return;
  const k = Number(el.dataset.i);
  if (!(k >= 0 && k <= 3)) return;
  const codigo = Number(el.value);
  const antes = m.cab.botones[k] || 0;
  m.cab.botones[k] = codigo;
  pedir('Estrategia del botón ' + (k + 1) + ': ' + ESTRATEGIAS[codigo],
    function(){ m.cab.botones[k] = antes; },
    [{ op: 'campo', nombre: 'estrategiaBoton', valor: codigo, indice: k, bloque: 'cabecera' }],
    'estrategia:' + k, codigo, antes);
  pintar();
}
function fvIndSlot(valor){
  if (!puedeEditar()) return;
  D.indSlot = (valor === '' || valor == null) ? null : Number(valor);
  pintar();
}
function fvFlecha(el){
  const m = D.mio;
  if (!puedeEditar() || !m || D.indSlot == null || !el || !el.dataset) return;
  const dir = el.dataset.dir;
  if (!dir) return;
  const s = m.slots[D.indSlot];
  const antes = (s.flechas || []).slice();
  const k = s.flechas.indexOf(dir);
  if (k >= 0) s.flechas.splice(k, 1);
  else {
    if (s.flechas.length >= 2) s.flechas.shift();
    s.flechas.push(dir);
  }
  D.capa = 'ataque';
  const ops = FLECHAS.map(function(f, j){
    return { op: 'campo', nombre: 'flechasAtaque', casilla: D.indSlot, indice: j, valor: s.flechas.indexOf(f) >= 0 ? 1 : 0 };
  });
  const nombres = s.flechas.map(function(f){ return FLECHA_TXT[f] || f; }).join(', ') || 'ninguna';
  pedir(nombreDe(m, m.orden[D.indSlot]) + ': flechas ' + nombres,
    function(){ s.flechas = antes.slice(); }, ops,
    'flechas:' + D.indSlot, s.flechas.slice().sort(), antes.slice().sort());
  pintar();
}
function fvIndAjuste(clave, delta){
  const m = D.mio;
  if (!puedeEditar() || !m || D.indSlot == null) return;
  if (clave !== 'act' && clave !== 'mark') return;
  const s = m.slots[D.indSlot];
  const lista = clave === 'act' ? ACTITUD : MARCAJE;
  const antes = s[clave] || 0;
  const rivalAntes = s.rival;
  const nuevo = (antes + (Number(delta) >= 0 ? 1 : -1) + lista.length) % lista.length;
  s[clave] = nuevo;
  const ops = [{ op: 'campo', nombre: clave === 'act' ? 'actitudDefensiva' : 'marcaje', casilla: D.indSlot, valor: nuevo }];
  if (clave === 'mark' && nuevo >= 2 && s.rival == null && D.rival){
    s.rival = 9;
    ops.push({ op: 'campo', nombre: 'rivalMarcado', casilla: D.indSlot, valor: 9 });
  }
  D.capa = clave === 'act' ? 'defensa' : 'marcaje';
  const etiqueta = clave === 'act' ? 'Actitud defensiva' : 'Marcaje';
  pedir(nombreDe(m, m.orden[D.indSlot]) + ': ' + etiqueta + ' ' + lista[nuevo],
    function(){ s[clave] = antes; s.rival = rivalAntes; }, ops,
    'ind:' + D.indSlot + ':' + clave, nuevo, antes);
  pintar();
}
function fvRival(valor){
  const m = D.mio;
  if (!puedeEditar() || !m || D.indSlot == null) return;
  const s = m.slots[D.indSlot];
  const antes = s.rival;
  const clave = 'rival:' + D.indSlot;
  if (valor === ''){
    s.rival = null;
    pedir(nombreDe(m, m.orden[D.indSlot]) + ': sin marca fija',
      function(){ s.rival = antes; },
      [{ op: 'campo', nombre: 'rivalMarcado', casilla: D.indSlot, valor: 255 }], clave, null, antes);
  } else {
    const casilla = Number(valor);
    s.rival = casilla;
    pedir(nombreDe(m, m.orden[D.indSlot]) + ': marca a ' + (D.rival ? nombreDe(D.rival, D.rival.orden[casilla]) : ('rival ' + (casilla + 1))),
      function(){ s.rival = antes; },
      [{ op: 'campo', nombre: 'rivalMarcado', casilla: D.indSlot, valor: casilla }], clave, casilla, antes);
  }
  D.capa = 'marcaje';
  pintar();
}
function fvLanzador(el){
  const m = D.mio;
  if (!puedeEditar() || !m || !el || !el.dataset) return;
  const clave = el.dataset.k;
  const def = LANZADORES.find(function(l){ return l[0] === clave; });
  if (!def) return;
  const indice = Number(el.value);
  const antes = m.cab.lanzadores[clave];
  const capAntes = m.cab.capitan;
  m.cab.lanzadores[clave] = indice;
  if (clave === 'cap') m.cab.capitan = indice;
  pedir(def[2] + ': ' + nombreDe(m, indice),
    function(){ m.cab.lanzadores[clave] = antes; if (clave === 'cap') m.cab.capitan = capAntes; },
    [{ op: 'campo', nombre: def[1], valor: indice, bloque: 'cabecera' }],
    'lanzador:' + clave, indice, antes);
  pintar();
}
function fvPreset(el){
  const m = D.mio;
  const nombre = el && el.dataset ? el.dataset.p : null;
  const p = PRESETS.find(function(x){ return x[0] === nombre; });
  if (!puedeEditar() || !m || !p) return;
  const valores = p[2];
  AJUSTES.forEach(function(a){
    const clave = a[0];
    if (valores[clave] == null) return;
    const antes = m.aj[clave] || 0;
    const nuevo = valores[clave];
    if (antes === nuevo) return;
    m.aj[clave] = nuevo;
    pedir('Config. rápida (' + p[1] + ') · ' + a[2] + ': ' + a[3][nuevo],
      function(){ m.aj[clave] = antes; },
      [{ op: 'campo', nombre: a[1], valor: nuevo }], 'ajuste:' + clave, nuevo, antes);
  });
  pintar();
}
function fvLado(valor){
  if (!esAdmin()) return;
  D.eleccionManual = true;
  D.lado = valor === 'visitante' ? 'visitante' : 'local';
  D.sel = null; D.banca = null; D.ver = null; D.cmp = null;
  asignarLados();
  pintar();
}
async function fvEnviar(){ await enviar(); }

/* Los handlers de data-on* tienen que existir como propiedad de window
   (js/events.js resuelve window[nombre]). */
window.fvFondo = fvFondo;
window.fvFondoHoja = fvFondoHoja;
window.fvCerrar = fvCerrar;
window.fvReintentar = fvReintentar;
window.fvConexionPanel = fvConexionPanel;
window.fvCerrarConexion = fvCerrarConexion;
window.fvProbar = fvProbar;
window.fvUrl = fvUrl;
window.fvPunto = fvPunto;
window.fvFila = fvFila;
window.fvSelPos = fvSelPos;
window.fvCancelar = fvCancelar;
window.fvCmpVolver = fvCmpVolver;
window.fvCmpConfirmar = fvCmpConfirmar;
window.fvCapa = fvCapa;
window.fvMenu = fvMenu;
window.fvDeshacer = fvDeshacer;
window.fvCancelarEnviado = fvCancelarEnviado;
window.fvRestablecer = fvRestablecer;
window.fvEsquema = fvEsquema;
window.fvEsqEsquema = fvEsqEsquema;
window.fvEsqVariante = fvEsqVariante;
window.fvEsqAplicar = fvEsqAplicar;
window.fvEsqCancelar = fvEsqCancelar;
window.fvAuto = fvAuto;
window.fvCiclo = fvCiclo;
window.fvLibero = fvLibero;
window.fvEstrategia = fvEstrategia;
window.fvIndSlot = fvIndSlot;
window.fvFlecha = fvFlecha;
window.fvRival = fvRival;
window.fvLanzador = fvLanzador;
window.fvPreset = fvPreset;
window.fvLado = fvLado;
window.fvEnviar = fvEnviar;

return {
  abrir: abrir,
  cerrar: cerrar,
  montar: montarPanel,
  desmontar: desmontarPanel,
  consultar: function(){ return consultar(true); },
};
})();
