/* ============================================================
   TOOL PES5 — seccion "Tool PES5" del panel admin (slice 2.0-1).
   Antes era la pagina suelta prototipo_yunas/pes5-tool.html (que queda solo
   como referencia). Ahora la carga bajo demanda js/pes5-admin.js, despues de
   css/pes5-tool.css y de los modulos pes5-*.js. No va en index.html.
   Todo queda en una IIFE: solo se expone window.PES5_TOOL, con montar, salir
   y los handlers que usan los data-on*. No pisa globales del panel.
   ============================================================ */
(function(){
'use strict';
/* ============================================================
   ICONOS (SVG inline estilo Lucide — nunca emojis, ver CLAUDE.md)
   ============================================================ */
const ICN = {
  folder: '<svg class="icn" viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>',
  file: '<svg class="icn" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
  refresh: '<svg class="icn" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
  link: '<svg class="icn" viewBox="0 0 24 24"><path d="M9 17H7a5 5 0 0 1 0-10h2"/><path d="M15 7h2a5 5 0 0 1 0 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  search: '<svg class="icn" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  users: '<svg class="icn lg" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  shirt: '<svg class="icn lg" viewBox="0 0 24 24"><path d="M16 3l3 4-3 3-2-2v11a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V8l-2 2-3-3 3-4 4 2h2z"/></svg>',
  inbox: '<svg class="icn lg" viewBox="0 0 24 24"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  upload: '<svg class="icn lg" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  x: '<svg class="icn" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  lock: '<svg class="icn" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  unlock: '<svg class="icn" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',
  wallet: '<svg class="icn" viewBox="0 0 24 24"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>',
  save: '<svg class="icn" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  alert: '<svg class="icn" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
};



/* ============================================================
   ESTADO
   ============================================================ */
let EQUIPOS_TSC = [];
let PRESIDENTES_POR_TEAM = {}; // teamId -> {displayName,email}
let CLUBES_PES5 = [];      // Slice C1.2: nombres de los 138 clubes leidos SIEMPRE del save
                            // cargado (nunca de pes5-teams.json); vacio sin save. indice = indice de club.
let VINCULOS_ROTOS = new Set(); // Slice C1.3: teamIds cuyo pes5Club no resolvio a ningun
                            // club del save cargado ("vinculo roto: revincula")
let PLANO = null;          // bytes descifrados del save actualmente cargado (en memoria)
let SAVE_META = null;      // {nombre,tamaño,lastModified}
let OBSERVAR_STOP = null;
let TAB = 'equipos';
let PLANTILLA_ACTUAL = null;    // array de leerJugadorCompleto(...) del equipo elegido
let PLANTILLA_INDICE = null;    // indice de club PES5 elegido en la pestaña Plantilla
let JUGADOR_SELECCIONADO = null; // id de registro seleccionado en el panel lateral
let CAMBIOS_PENDIENTES = {};    // { [jugadorId]: {atributos:{},escala8:{},habilidades:{},edad,altura,pieDominante,lesiones} }

/* ============================================================
   Slice D.R — cobro condicional (mismas reglas que el editor del
   presidente, ver js/yunacoins-rules.js). La tool no tiene UI propia de
   edicion de reglas: usa YUNACOINS_RULES.DEFAULT_RULES tal cual.

   Punto 5 (mapeo de presupuestos, resuelto 15/09):
     - el wallet real de cada equipo es SIEMPRE `team.yunacoin` (nunca un
       numero de regla — `techoPresupuesto`/`presidentWallet` del editor no
       se usan aca, la tool ya tenia el saldo real).
     - orden de consumo INVERTIDO: un jugador suscriptor (`j.subscriber`,
       viene de `leerJugadorCompleto` — nombre que empieza con "$") gasta
       primero el bono de suscriptores; el resto (o el total si no es
       suscriptor) sale del tope general. Ver YUNACOINS_RULES.distribuirCosto.
     - los topes de TEMPORADA no se guardan en `teams`: se derivan del
       libro `coins` (season actual + reason que empieza con 'mejora PES5')
       cada vez que se elige un club en la pestaña Plantilla — ver
       GASTO_TEMPORADA_CACHE / _refrescarGastoTemporadaEquipo.
   ============================================================ */
let YC_RULES = YUNACOINS_RULES.normalizarReglas(null);
let YC_RULES_META = null; // {actualizadoEn, actualizadoPor} del doc pes5_config/reglas

async function cargarReglasFirestore(){
  try {
    const snap = await firebase.firestore().collection('pes5_config').doc('reglas').get();
    const data = snap.exists ? snap.data() : null;
    YC_RULES_META = data ? { actualizadoEn: data.actualizadoEn || null, actualizadoPor: data.actualizadoPor || null } : null;
    return YUNACOINS_RULES.normalizarReglas(data);
  } catch (e) {
    console.warn('[pes5-tool] no se pudieron leer las reglas de Firestore, uso las de codigo:', e);
    return YUNACOINS_RULES.normalizarReglas(null);
  }
}

// Cache de lo ya gastado esta temporada por el equipo cuyo plantel esta
// abierto ahora mismo (derivado del libro `coins`, punto 5c del macro-slice
// — no se persiste nada nuevo en `teams`). Se recalcula cada vez que cambia
// el club elegido (onTeamSelect) y se fuerza de nuevo justo antes de cobrar
// de verdad (confirmarEscribirAlSave) para no confiar en una foto vieja si
// otra sesion ya gasto presupuesto de este equipo mientras tanto.
let GASTO_TEMPORADA_CACHE = { teamId: null, season: null, general: 0, sub: 0 };

async function _refrescarGastoTemporadaEquipo(team, forzar){
  if (!team){ GASTO_TEMPORADA_CACHE = { teamId: null, season: null, general: 0, sub: 0 }; return; }
  if (!forzar && GASTO_TEMPORADA_CACHE.teamId === team.id && GASTO_TEMPORADA_CACHE.season === STATE.season) return;
  const transacciones = await dbGetAll('coins', c =>
    String(c.teamId) === String(team.id) && c.season === STATE.season &&
    typeof c.reason === 'string' && c.reason.indexOf('mejora PES5') === 0);
  const gastado = YUNACOINS_RULES.gastoTemporada(transacciones);
  GASTO_TEMPORADA_CACHE = { teamId: team.id, season: STATE.season, general: gastado.general, sub: gastado.sub };
}

// Equipo TSC (si existe) al que pertenece el club actualmente abierto en la
// pestaña Plantilla. null si el admin eligio un club de "Todos los clubes
// PES5" que ningun equipo TSC tiene vinculado (pes5ClubIdx).
function equipoTSCActual(){
  return EQUIPOS_TSC.find(t => t.pes5ClubIdx === PLANTILLA_INDICE) || null;
}
// "Tiene presidente" = existe un users.teamId == team.id (ver
// cargarEquiposYPresidentes / PRESIDENTES_POR_TEAM, la MISMA fuente que ya
// pinta la columna Presidente en la pestaña Equipos — no se recalcula
// distinto, punto 3 del macro-slice D.R).
function tienePresidente(team){
  return !!(team && PRESIDENTES_POR_TEAM[team.id]);
}
// Cuanto queda del tope general/bono de temporada AHORA MISMO (regla menos
// lo ya gastado, cache de GASTO_TEMPORADA_CACHE — ver _refrescarGastoTemporadaEquipo).
function _restantesTemporada(){
  return YUNACOINS_RULES.topesRestantes(
    { general: GASTO_TEMPORADA_CACHE.general, sub: GASTO_TEMPORADA_CACHE.sub }, YC_RULES);
}
// Reparte TODOS los cambios pendientes del plantel abierto entre bono de
// suscriptores y tope general, con el orden nuevo (punto 5b): itera
// PLANTILLA_ACTUAL en orden de roster y va descontando el bono restante
// jugador por jugador — el orden de asignacion del bono entre varios
// suscriptores editados en un mismo lote no esta especificado en el doc,
// es una decision de esta implementacion (documentada tambien en
// distribuirCosto, js/yunacoins-rules.js). Devuelve
// {totalCosto, fromGeneral, fromSub, porJugador:{[id]:{playerId,playerName,
// subscriber,total,lineas,fromGeneral,fromSub}}}.
function repartoPendienteEquipo(){
  const restantes = _restantesTemporada();
  let subUsadoAcum = 0, totalGeneral = 0, totalSub = 0, totalCosto = 0;
  const porJugador = {};
  (PLANTILLA_ACTUAL || []).forEach(j => {
    if (!CAMBIOS_PENDIENTES[j.id]) return;
    const { total, lineas } = YUNACOINS_RULES.costoCambios(j, CAMBIOS_PENDIENTES[j.id], YC_RULES);
    if (total <= 0) return;
    const disponibleSub = Math.max(0, restantes.subscribers - subUsadoAcum);
    const reparto = YUNACOINS_RULES.distribuirCosto(total, disponibleSub, !!j.subscriber);
    subUsadoAcum += reparto.fromSub;
    totalGeneral += reparto.fromGeneral;
    totalSub += reparto.fromSub;
    totalCosto += total;
    porJugador[j.id] = {
      playerId: j.id, playerName: j.nombre, subscriber: !!j.subscriber,
      total, lineas, fromGeneral: reparto.fromGeneral, fromSub: reparto.fromSub,
    };
  });
  return { totalCosto, fromGeneral: totalGeneral, fromSub: totalSub, porJugador };
}
// Costo de los cambios pendientes de UN jugador (para la linea a linea del
// panel). cambios puede no existir todavia (jugador sin tocar) -> costo 0.
function costoJugador(j){
  return YUNACOINS_RULES.costoCambios(j, CAMBIOS_PENDIENTES[j.id] || {}, YC_RULES);
}
// Costo total (sin desglose) de TODOS los jugadores con cambios pendientes
// — atajo sobre repartoPendienteEquipo() para los lugares que solo
// necesitan el numero total (ej. el conteo del boton).
function costoTotalPendienteEquipo(){
  return repartoPendienteEquipo().totalCosto;
}
// Resumen legible de las lineas de costo de UN jugador, para el campo
// `note` de su transaccion en `coins` (macro-slice D.R, punto 3: "note:
// resumen de lineas" — ahora una transaccion POR JUGADOR, ver punto 5d y
// cobrarMejorasEquipo).
function _resumenLineas(lineas){
  const conCosto = (lineas || []).filter(l => l.costo > 0);
  if (!conCosto.length) return '(sin costo)';
  return conCosto.map(l => `${l.campo} ${l.de}→${l.a} (+${l.costo})`).join(', ');
}
// Registra el cobro real en `coins`/`teams` — mismo patron de
// saveCoinsTransaction (tsc-src/js/coins.js): una transaccion mode:'sub' +
// actualizacion de teams.yunacoin, pero UNA TRANSACCION POR JUGADOR (no una
// sola para todo el lote) — decision tomada para que la metadata `pes5`
// del punto 5d (shape singular: playerId/playerName/subscriber/fromGeneral/
// fromSub/lineas, uno por jugador) sea exacta y estas transacciones se
// puedan sumar despues por jugador en el historial de F. `reparto` es el
// resultado de repartoPendienteEquipo(). Se llama SOLO despues de que el
// save ya se escribio con exito (macro-slice D.R, punto 3).
async function cobrarMejorasEquipo(team, reparto, reason = 'mejora PES5 (admin)'){
  let current = team.yunacoin || 0;
  for (const id of Object.keys(reparto.porJugador)){
    const info = reparto.porJugador[id];
    if (!info || info.total <= 0) continue;
    const newTotal = Math.max(0, current - info.total);
    await dbAdd('coins', {
      teamId: team.id, teamName: team.name, mode: 'sub', amount: info.total,
      reason, note: _resumenLineas(info.lineas),
      before: current, after: newTotal, season: STATE.season, date: new Date().toISOString(),
      pes5: {
        playerId: info.playerId, playerName: info.playerName, subscriber: info.subscriber,
        fromGeneral: info.fromGeneral, fromSub: info.fromSub, lineas: info.lineas,
        pedidoId: info.pedidoId || null,
      },
    });
    current = newTotal;
  }
  await dbPut('teams', { ...team, yunacoin: current });
  team.yunacoin = current; // reflejar en el objeto cacheado en EQUIPOS_TSC (mismo patron que vincularEquipo)
  // lo recien cobrado ya cuenta para los topes de temporada de este equipo
  GASTO_TEMPORADA_CACHE = {
    teamId: team.id, season: STATE.season,
    general: GASTO_TEMPORADA_CACHE.general + reparto.fromGeneral,
    sub: GASTO_TEMPORADA_CACHE.sub + reparto.fromSub,
  };
  return current;
}

/* ============================================================
   MONTAJE EN EL PANEL ADMIN
   montar(contenedor): inyecta el esqueleto de la tool (una sola vez) y la
   renderiza segun la sesion. salir(): para el observador del save, saca el
   editor y libera el bloqueo del equipo. nav.js (via js/pes5-admin.js) llama
   a salir() al dejar la seccion (cambio de pagina admin o modo publico).
   La sesion la maneja el panel: el evento tsc:auth (auth.js) re-renderiza.
   ============================================================ */
const SHELL_HTML = `
<div class="pt-shell">
  <div class="pt-sub">Lee y edita el save de PES5 directo desde la carpeta del juego — equipos, plantillas, pedidos y publicación en un solo lugar.</div>
  <div id="pt-gate"></div>
  <div id="pt-app" style="display:none;">
    <div id="pt-statusbar"></div>
    <div class="pt-tabs" id="pt-tabs-bar"></div>
    <div id="pt-tabcontent"></div>
  </div>
</div>`;

let _montadoEn = null;   // contenedor donde vive el esqueleto (null = seccion no activa)
let _iniciado = false;   // carga inicial (claves, reglas, equipos, save) hecha una sola vez

function _alCambiarAuth(){
  if (!_montadoEn) return;
  // sin sesion de admin no puede quedar un bloqueo de equipo a nombre de nadie
  if (!(AUTH.user && AUTH.role === 'admin')) liberarBloqueoEquipo();
  render();
}

function montar(contenedor){
  if (!contenedor) return;
  _montadoEn = contenedor;
  if (!contenedor.querySelector('#pt-app')) contenedor.innerHTML = SHELL_HTML;
  window.removeEventListener('tsc:auth', _alCambiarAuth);
  window.addEventListener('tsc:auth', _alCambiarAuth);
  render();
}

function salir(){
  _montadoEn = null;
  window.removeEventListener('tsc:auth', _alCambiarAuth);
  if (OBSERVAR_STOP){ try { OBSERVAR_STOP(); } catch (e) {} OBSERVAR_STOP = null; }
  if (window.MEJORAS_EDITOR) MEJORAS_EDITOR.desmontar();
  document.getElementById('pt-ed-overlay')?.remove();
  liberarBloqueoEquipo();
}

function render(){
  const gate = document.getElementById('pt-gate');
  const app = document.getElementById('pt-app');
  if (!gate || !app) return;
  if (!AUTH.user){
    gate.innerHTML = `<div class="gate">${ICN.lock}<div>Iniciá sesión como admin para usar la Tool PES5.</div></div>`;
    app.style.display = 'none';
    return;
  }
  if (AUTH.role !== 'admin'){
    gate.innerHTML = `<div class="gate">${ICN.lock}<div>Esta página es solo para el admin.</div></div>`;
    app.style.display = 'none';
    return;
  }
  gate.innerHTML = '';
  app.style.display = '';
  if (!_iniciado){
    _iniciado = true;
    initApp();
    return;
  }
  // volver a entrar a la seccion: re-render, no recarga
  if (PLANO && !OBSERVAR_STOP) iniciarObservador();
  renderTabs();
  renderStatusBar();
  switchTab(TAB);
}

/* ============================================================
   ARRANQUE (una vez por carga de la pagina)
   ============================================================ */
async function initApp(){
  await PES5_CRYPT.cargarClaves('js/pes5/');
  await PES5_EDITOR.cargarMapa('js/pes5/');
  YC_RULES = await cargarReglasFirestore();
  // Slice C1.2: pes5-teams.json / cargarNombresEquipos ya NO se usan para poblar
  // selectores en esta tool — los 138 clubes salen siempre del save cargado.
  await cargarEquiposYPresidentes();

  // intento silencioso de recuperar la carpeta ya elegida antes (no molesta
  // si no hay ninguna guardada o si el permiso no se puede re-otorgar sin gesto)
  if (PES5_SAVE.tieneSoporte()){
    try {
      const r = await PES5_SAVE.recuperarCarpeta();
      if (r && r.ok) await cargarSaveDesdeCarpeta();
    } catch(e) { /* sin carpeta previa o permiso denegado — el admin elige a mano */ }
  }

  renderTabs();
  renderStatusBar();
  switchTab('equipos');
}

async function cargarEquiposYPresidentes(){
  EQUIPOS_TSC = await dbGetAll('teams');
  EQUIPOS_TSC.sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  PRESIDENTES_POR_TEAM = {};
  try {
    const users = await firebase.firestore().collection('users').get();
    users.docs.forEach(d => {
      const u = d.data();
      if (u.teamId != null) PRESIDENTES_POR_TEAM[u.teamId] = u;
    });
  } catch(e) { console.warn('[pes5-tool] no se pudo cargar la lista de presidentes:', e); }
}

/* ============================================================
   BARRA DE ESTADO DEL SAVE
   ============================================================ */
function renderStatusBar(){
  const el = document.getElementById('pt-statusbar');
  const tieneSoporte = PES5_SAVE.tieneSoporte();
  const carpeta = PES5_SAVE.carpetaActual;

  if (!tieneSoporte){
    // Slice C2.3, punto 6b: causa raiz confirmada — Brave desactiva de
    // fabrica la File System Access API (typeof window.showDirectoryPicker
    // === 'undefined' aun en contexto seguro). La deteccion sigue siendo
    // SIEMPRE tieneSoporte() — nunca userAgent — esto solo aclara el aviso.
    // No hay selector de archivo: un archivo elegido asi es de solo lectura
    // y no permite escribir el save ni dejar backup, asi que ofrecerlo
    // terminaba en un error al aplicar (o en una descarga suelta).
    el.innerHTML = `
      <div class="pt-statusbar">
        <div class="pt-status-item"><span class="pt-dot warn"></span> Este navegador no da acceso directo a carpetas (Chrome/Edge sí, Firefox/Safari no). Si usás <b>Brave</b>, suele venir desactivado: activalo en <code>brave://flags/#file-system-access-api</code> (Enabled), reiniciá el navegador y volvé a entrar. Sin eso no se puede leer ni escribir el save.</div>
      </div>`;
    return;
  }

  if (!carpeta){
    el.innerHTML = `
      <div class="pt-statusbar">
        <div class="pt-status-item"><span class="pt-dot off"></span> Sin carpeta elegida — sugerido: <code>Documents\\KONAMI\\Pro Evolution Soccer 5\\save\\folder1</code></div>
        <div class="pt-status-item" style="font-size:12px;">Si el diálogo no aparece (Brave con el flag apagado, o el navegador de la app), abrí esto en <b>Chrome o Edge</b>.</div>
        <div class="pt-status-actions">
          <button class="btn btn-sm btn-primary" data-onclick="ptElegirCarpetaClick()">${ICN.folder} Elegir carpeta del juego</button>
        </div>
      </div>`;
    return;
  }

  const meta = SAVE_META;
  const fecha = meta ? new Date(meta.lastModified).toLocaleString('es-AR') : '—';
  el.innerHTML = `
    <div class="pt-statusbar">
      <div class="pt-status-item">${ICN.folder} <b>${escHtml(carpeta)}</b></div>
      <div class="pt-status-sep"></div>
      <div class="pt-status-item">${ICN.file} ${meta ? `<b>${escHtml(meta.nombre)}</b> · ${meta.tamaño.toLocaleString('es-AR')} b · ${escHtml(fecha)}` : 'sin leer todavía'}</div>
      <div class="pt-status-actions">
        <button class="btn btn-sm" data-onclick="ptReconectarCarpetaClick()">${ICN.link} Reconectar</button>
        <button class="btn btn-sm" data-onclick="ptRecargarSaveClick()">${ICN.refresh} Recargar</button>
      </div>
    </div>`;
}

async function elegirCarpetaClick(){
  try {
    const r = await PES5_SAVE.elegirCarpeta();
    if (!r.ok){
      if (r.motivo === 'timeout') showToast('El diálogo de carpeta no se abrió. Probá en Chrome o Edge.', 'error');
      return; // el admin cancelo el picker (o no se abrio)
    }
    await cargarSaveDesdeCarpeta();
    renderStatusBar();
    showToast('Carpeta elegida: ' + r.nombre);
  } catch(e) { showToast('Error: ' + (e.message||e), 'error'); }
}
async function reconectarCarpetaClick(){
  try {
    const r = await PES5_SAVE.recuperarCarpeta();
    if (!r || !r.ok){ showToast('No se pudo reconectar — elegí la carpeta de nuevo.', 'error'); return; }
    await cargarSaveDesdeCarpeta();
    renderStatusBar();
  } catch(e) { showToast('Error: ' + (e.message||e), 'error'); }
}
async function recargarSaveClick(){
  await cargarSaveDesdeCarpeta();
  renderStatusBar();
  if (TAB === 'plantilla' && PLANTILLA_INDICE != null) await onTeamSelect(PLANTILLA_INDICE);
  if (TAB === 'equipos') renderEquiposTab();
  showToast('Save recargado');
}
async function cargarSaveDesdeCarpeta(){
  const leido = await PES5_SAVE.leer();
  SAVE_META = { nombre: leido.nombre, tamaño: leido.tamaño, lastModified: leido.lastModified };
  PLANO = PES5_CRYPT.descifrar(leido.bytes);
  recalcularClubesDelSave();
  await migrarPes5ClubIdx();
  iniciarObservador();
}

/* ============================================================
   Slice C1.2 — los 138 clubes SIEMPRE salen del save cargado
   ============================================================ */
function recalcularClubesDelSave(){
  CLUBES_PES5 = PLANO ? Array.from({ length: 138 }, (_, i) => PES5_EDITOR.nombreEquipo(PLANO, i)) : [];
}

/* ============================================================
   Slice C1.3 — migracion automatica pes5Club (nombre) -> pes5ClubIdx (indice)
   Escribe SOLO los equipos que ya tienen pes5Club pero todavia no tienen
   pes5ClubIdx (hoy: FK Tupadre). Idempotente: una vez migrado un equipo,
   pes5ClubIdx ya no es null y se salta en las corridas siguientes.
   ============================================================ */
async function migrarPes5ClubIdx(){
  if (!PLANO) return { migrados: 0, rotos: 0 };
  let migrados = 0, rotos = 0;
  for (const t of EQUIPOS_TSC){
    if (!t.pes5Club || t.pes5ClubIdx != null) continue;
    const idx = PES5_EDITOR.buscarEquipoPorNombre(PLANO, t.pes5Club);
    if (idx < 0){
      VINCULOS_ROTOS.add(t.id);
      rotos++;
      console.warn(`[pes5-tool] vinculo roto: "${t.name}" -> "${t.pes5Club}" no se encontro en el save cargado — revincular a mano.`);
      continue;
    }
    const actualizado = { ...t, pes5ClubIdx: idx };
    await dbPut('teams', actualizado);
    Object.assign(t, actualizado);
    VINCULOS_ROTOS.delete(t.id);
    migrados++;
  }
  if (migrados || rotos) console.log(`[pes5-tool] migracion pes5ClubIdx: ${migrados} migrado(s), ${rotos} roto(s)`);
  return { migrados, rotos };
}
function iniciarObservador(){
  if (OBSERVAR_STOP) OBSERVAR_STOP();
  OBSERVAR_STOP = PES5_SAVE.observar(async (meta) => {
    showToast('El juego volvió a guardar — recargando...');
    await cargarSaveDesdeCarpeta();
    renderStatusBar();
    if (TAB === 'plantilla' && PLANTILLA_INDICE != null) await onTeamSelect(PLANTILLA_INDICE);
    if (TAB === 'equipos') renderEquiposTab();
  }, 3000);
}

/* ============================================================
   TABS
   ============================================================ */
const TABS = [
  { id: 'equipos', label: 'Equipos', icon: ICN.users },
  { id: 'plantilla', label: 'Plantilla', icon: ICN.shirt },
  { id: 'pedidos', label: 'Pedidos', icon: ICN.inbox },
  { id: 'publicar', label: 'Publicar', icon: ICN.upload },
  { id: 'reglas', label: 'Reglas', icon: ICN.wallet },
];
function renderTabs(){
  document.getElementById('pt-tabs-bar').innerHTML = TABS.map(t =>
    `<button class="pt-tab${TAB===t.id?' active':''}" data-onclick="ptSwitchTab('${t.id}')">${t.icon}${escHtml(t.label)}</button>`
  ).join('');
}
function switchTab(id){
  TAB = id;
  renderTabs();
  if (id === 'equipos') renderEquiposTab();
  else if (id === 'plantilla') renderPlantillaTab();
  else if (id === 'pedidos') renderPedidosTab();
  else if (id === 'publicar') renderPublicarTab();
  else if (id === 'reglas') renderReglasTab();
}

/* ============================================================
   PESTAÑA 1 · EQUIPOS
   ============================================================ */
function renderEquiposTab(){
  const cont = document.getElementById('pt-tabcontent');
  // Slice C1.2: los clubes solo existen si hay save cargado (nunca lista fija).
  const hayClubes = !!(PLANO && CLUBES_PES5.length);
  const opciones = hayClubes
    ? ['<option value="">— sin asignar —</option>']
        .concat(CLUBES_PES5.map((n, i) => `<option value="${i}">${escHtml(n)}</option>`)).join('')
    : '';

  // Slice C1.1: solo equipos activos (status !== 'INACTIVO'; si falta el campo, cuenta como activo).
  const equiposActivos = EQUIPOS_TSC.filter(t => t.status !== 'INACTIVO');

  const filas = equiposActivos.map(t => {
    const pres = PRESIDENTES_POR_TEAM[t.id];
    const cupo = (PLANO && t.pes5ClubIdx != null)
      ? PES5_EDITOR.leerPlantillaEquipo(PLANO, t.pes5ClubIdx).length + '/32'
      : '—/32';
    const cupoLleno = cupo === '32/32';
    const roto = VINCULOS_ROTOS.has(t.id);
    const valorSel = t.pes5ClubIdx != null ? String(t.pes5ClubIdx) : '';
    const selectorHtml = hayClubes
      ? `<select data-onchange="ptVincularEquipo(${t.id}, this.value)">${opciones.replace(
          `value="${valorSel}"`, `value="${valorSel}" selected`
        )}</select>`
      : `<select disabled><option>Cargá el save para ver los clubes</option></select>${
          t.pes5Club ? `<div style="font-size:11px;color:var(--txt3);margin-top:2px;">vinculado: ${escHtml(t.pes5Club)}</div>` : ''
        }`;
    return `
      <tr data-nombre="${escHtml((t.name||'').toLowerCase())}">
        <td>${t.logo ? `<img class="pt-escudo" src="${escHtml(t.logo)}" alt="">` : `<span class="pt-escudo-ph">${ICN.shirt}</span>`}</td>
        <td>${escHtml(t.name)}</td>
        <td>${pres ? escHtml(pres.displayName||pres.email) : '<span style="color:var(--txt3)">sin presidente</span>'}</td>
        <td>${selectorHtml}${roto ? ` <span class="badge badge-warn" title="El club vinculado no se encontro en el save cargado">${ICN.alert} vínculo roto: revinculá</span>` : ''}</td>
        <td class="pt-cupo${cupoLleno?' full':''}">${cupo}</td>
      </tr>`;
  }).join('');

  cont.innerHTML = `
    <div class="pt-toolbar">
      <input class="pt-search" id="eq-filtro" placeholder="Filtrar equipo...">
      ${!hayClubes ? `<div class="pt-status-item" style="color:var(--txt3);">${ICN.alert} Cargá el save para ver los clubes</div>` : ''}
    </div>
    <div class="tbl-wrap">
      <table class="tbl" id="eq-tabla">
        <thead><tr><th></th><th>Equipo</th><th>Presidente</th><th>Club PES5</th><th>Cupo</th></tr></thead>
        <tbody>${filas || `<tr><td colspan="5" style="text-align:center;color:var(--txt3);padding:20px;">No hay equipos activos.</td></tr>`}</tbody>
      </table>
    </div>`;
  document.getElementById('eq-filtro').addEventListener('input', (e) => filtrarEquiposTabla(e.target.value));
}
function filtrarEquiposTabla(texto){
  const q = texto.trim().toLowerCase();
  document.querySelectorAll('#eq-tabla tbody tr').forEach(tr => {
    const n = tr.getAttribute('data-nombre') || '';
    tr.style.display = n.includes(q) ? '' : 'none';
  });
}
async function vincularEquipo(teamId, idxStr){
  const team = EQUIPOS_TSC.find(t => t.id === teamId);
  if (!team || !PLANO) return;
  const idx = idxStr === '' ? null : parseInt(idxStr, 10);
  const nombreClub = idx != null ? PES5_EDITOR.nombreEquipo(PLANO, idx) : null;
  // Slice C1.3: pes5ClubIdx es la fuente del vinculo; pes5Club sigue
  // escribiendose como etiqueta informativa con el nombre vigente.
  const actualizado = { ...team, pes5ClubIdx: idx, pes5Club: nombreClub };
  await dbPut('teams', actualizado);
  Object.assign(team, actualizado);
  VINCULOS_ROTOS.delete(teamId);
  showToast(nombreClub ? `${team.name} → ${nombreClub}` : `${team.name} sin equipo`);
  renderEquiposTab();
}

/* ============================================================
   PESTAÑA 2 · PLANTILLA
   ============================================================ */
function renderPlantillaTab(){
  const cont = document.getElementById('pt-tabcontent');
  // Slice C1.2: sin save cargado, la pestaña Plantilla no lista nada.
  if (!PLANO || !CLUBES_PES5.length){
    cont.innerHTML = `<div class="pt-empty">${ICN.alert}<div>Elegí la carpeta del save (o subí el archivo) desde la barra de arriba para ver plantillas.</div></div>`;
    return;
  }
  // Slice C1.1 + C1.3: "Equipos TSC vinculados" = solo equipos activos con
  // pes5ClubIdx resuelto (la fuente del vinculo es el indice, no el nombre).
  const vinculados = EQUIPOS_TSC.filter(t => t.status !== 'INACTIVO' && t.pes5ClubIdx != null);
  const optVinc = vinculados.map(t => `<option value="${t.pes5ClubIdx}">${escHtml(t.name)} (${escHtml(CLUBES_PES5[t.pes5ClubIdx] ?? t.pes5Club ?? '')})</option>`).join('');
  const optTodos = CLUBES_PES5.map((n, i) => `<option value="${i}">${escHtml(n)}</option>`).join('');

  cont.innerHTML = `
    <div class="pt-team-select-row">
      <select id="pl-team-select" data-onchange="ptOnTeamSelectPorIndice(this.value)">
        <option value="">— elegir club —</option>
        <optgroup label="Equipos TSC vinculados">${optVinc}</optgroup>
        <optgroup label="Todos los clubes PES5">${optTodos}</optgroup>
      </select>
    </div>
    <div id="pl-body"></div>
    <div id="pl-writebar"></div>
    <div id="pl-write-status">
      <div class="pt-log" id="pl-log" style="display:none;"></div>
      <div class="pt-panel-msg pt-panel-err" id="pl-error-panel" style="display:none;"></div>
      <div class="pt-panel-msg pt-panel-ok" id="pl-success-panel" style="display:none;"></div>
    </div>`;
  // Si ya habia un club abierto (volvimos a esta pestana), restaurarlo con sus cambios pendientes.
  if (PLANTILLA_INDICE != null && PLANTILLA_ACTUAL){
    const sel = document.getElementById('pl-team-select');
    if (sel) sel.value = String(PLANTILLA_INDICE);
    renderPlantillaBody();
    renderWriteBar();
  }
  // Slice C2.3, punto 4: #pl-write-status vive FUERA de #pl-body a proposito
  // — renderPlantillaBody() solo reescribe #pl-body, asi que el log y los
  // paneles de error/exito nunca se vacian por editar un campo, cambiar de
  // jugador o de equipo (solo se pierden si se sale de la pestaña Plantilla).
}

function onTeamSelectPorIndice(idxStr){
  const nuevo = idxStr === '' ? null : parseInt(idxStr, 10);
  // Los cambios pendientes pertenecen al club abierto: cambiar de club los perderia
  // (y el cobro solo se aplica al club abierto), asi que se pide confirmacion.
  if (Object.keys(CAMBIOS_PENDIENTES).length && nuevo !== PLANTILLA_INDICE){
    if (!confirm('Hay cambios sin escribir en el club actual. Si cambiás de club se descartan. ¿Descartarlos y cambiar?')){
      const sel = document.getElementById('pl-team-select');
      if (sel) sel.value = PLANTILLA_INDICE != null ? String(PLANTILLA_INDICE) : '';
      return;
    }
    CAMBIOS_PENDIENTES = {};
    liberarBloqueoEquipo();
  }
  if (nuevo === null){
    document.getElementById('pl-body').innerHTML = '';
    PLANTILLA_INDICE = null;
    renderWriteBar();
    return;
  }
  onTeamSelect(nuevo);
}

async function onTeamSelect(indiceClub){
  PLANTILLA_INDICE = indiceClub;
  PLANTILLA_ACTUAL = PES5_EDITOR.leerPlantillaCompleta(PLANO, indiceClub);
  JUGADOR_SELECCIONADO = null;
  // Slice D.R punto 5c: refrescar lo ya gastado esta temporada por el
  // equipo TSC recien elegido (si lo hay) ANTES de renderizar, para que el
  // panel de cobro ya muestre los topes restantes correctos.
  await _refrescarGastoTemporadaEquipo(equipoTSCActual());
  renderPlantillaBody();
  renderWriteBar();
}

const COLS_ATTR = ['Ataque','Defensa','Equilibrio','Resistencia','Vel. maxima','Aceleracion','Respuesta','Agilidad',
  'Prec. conduccion','Vel. conduccion','Prec. pase corto','Vel. pase corto','Prec. pase largo','Vel. pase largo',
  'Precision','Potencia','Tecnica de disparo','Prec. saq. falta','Efecto','Cabezazo','Salto','Tecnica','Agresividad',
  'Mentalidad','Cualidades de portero','Trabajo en equipo'];

function renderPlantillaBody(){
  const el = document.getElementById('pl-body');
  if (!el) return;
  const filas = PLANTILLA_ACTUAL.map((j, slot) => {
    const otros = PES5_EDITOR.equiposDelJugador(PLANO, j.id).filter(i => i !== PLANTILLA_INDICE);
    const badge = otros.length ? `<span class="badge badge-warn pt-alsoin" title="tambien en otro roster">${ICN.alert} tambien en: ${otros.map(i=>escHtml(PES5_EDITOR.nombreEquipo(PLANO,i))).join(', ')}</span>` : '';
    const marcaCambio = _tieneAlgunCambio(j.id) ? ' <span class="badge badge-gold" style="margin-left:6px;">editado</span>' : '';
    const celda = (campo, valor, original) => `<td class="pt-stat-cell${valor !== original ? ' pt-cell-changed' : ''}" data-campo="${escHtml(campo)}">${valor}</td>`;
    const cols = COLS_ATTR.map(c => celda(c, _valorActual(j, 'atributos', c), j.atributos[c])).join('');
    const pieV = _valorActual(j, 'simple', 'pieDominante');
    return `
      <tr class="pt-row-jugador${JUGADOR_SELECCIONADO===j.id?' selected':''}" data-jugador="${j.id}" data-onclick="ptAbrirEditorJugador(${j.id})">
        <td>${slot+1}</td>
        <td>${escHtml(j.nombre)}${badge}<span data-marca-editado>${marcaCambio}</span></td>
        <td>${escHtml(j.posicionRegistrada||'—')}</td>
        ${celda('altura', _valorActual(j, 'simple', 'altura'), j.altura)}
        ${celda('edad', _valorActual(j, 'simple', 'edad'), j.edad)}
        <td class="pt-stat-cell${pieV !== j.pieDominante ? ' pt-cell-changed' : ''}" data-campo="pieDominante">${pieV==='izq'?'Izq.':'Der.'}</td>
        ${cols}
      </tr>`;
  }).join('');

  el.innerHTML = `
    <div class="tbl-wrap pt-tbl-wrap">
      <table class="tbl pt-plantilla-table">
        <thead><tr>
          <th>#</th><th>Nombre</th><th>Pos.</th><th>Alt.</th><th>Edad</th><th>Pie</th>
          ${COLS_ATTR.map(c=>`<th>${escHtml(c)}</th>`).join('')}
        </tr></thead>
        <tbody>${filas || `<tr><td colspan="${6+COLS_ATTR.length}" style="text-align:center;color:var(--txt3);padding:20px;">Plantel vacío.</td></tr>`}</tbody>
      </table>
    </div>
    <div class="pt-hint-click">Tocá un jugador para editarlo con el mismo editor que usan los presidentes.</div>`;
}

// ============================================================
// Bloqueo por equipo (Slice Q4): mientras Luis edita un equipo que TIENE presidente, ese presidente
// no puede usar la pagina de mejoras; y si el presidente esta adentro, Luis no puede abrir el editor
// de ese equipo. Se toma al abrir el editor y se mantiene (latido cada 30 s) mientras haya cambios
// pendientes; se libera al descartar, o al escribir el save y publicar la plantilla del equipo.
// Equipos sin presidente no se bloquean. Si nadie renueva el latido, vence a los 3 minutos.
// ============================================================
let BLOQUEO_EQUIPO = null;     // teamId del equipo bloqueado por esta tool
let _bloqLatidoAdmin = null;

function _bloqNombreAdmin(){ return (AUTH.profile && AUTH.profile.displayName) || 'Luis'; }

async function asegurarBloqueoEquipo(team){
  if (!team || !tienePresidente(team)) return true;      // sin presidente no hay a quien bloquear
  if (BLOQUEO_EQUIPO === team.id) return true;
  let r;
  try { r = await PES5_BLOQUEO.tomar(team.id, 'admin', AUTH.user.uid, _bloqNombreAdmin()); }
  catch (e){ console.warn('[pes5-tool] no se pudo tomar el bloqueo, se sigue sin bloqueo:', e); return true; }
  if (!r.ok){
    const hora = r.de && r.de.desde ? new Date(r.de.desde).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '';
    alert(`${(r.de && r.de.nombre) || 'El presidente'} está mejorando ${team.name} ahora${hora ? ' (desde las ' + hora + ')' : ''}. Esperá a que salga para editarlo.`);
    return false;
  }
  BLOQUEO_EQUIPO = team.id;
  if (!_bloqLatidoAdmin){
    _bloqLatidoAdmin = setInterval(() => {
      if (BLOQUEO_EQUIPO == null) return;
      PES5_BLOQUEO.latir(BLOQUEO_EQUIPO, 'admin', AUTH.user.uid, _bloqNombreAdmin()).catch(() => {});
    }, PES5_BLOQUEO.LATIDO_MS);
  }
  renderWriteBar();
  return true;
}

async function liberarBloqueoEquipo(){
  if (_bloqLatidoAdmin){ clearInterval(_bloqLatidoAdmin); _bloqLatidoAdmin = null; }
  const t = BLOQUEO_EQUIPO;
  BLOQUEO_EQUIPO = null;
  if (t != null){ try { await PES5_BLOQUEO.liberar(t, AUTH.user.uid); } catch (e) {} }
  renderWriteBar();
}

// Despues de escribir el save: publicar la plantilla del equipo (para que el presidente vea los
// numeros nuevos) y recien ahi liberar el bloqueo. Si la publicacion falla, el bloqueo sigue.
async function _publicarEquipoTrasEscritura(team){
  if (!team || !tienePresidente(team) || team.status === 'INACTIVO' || team.pes5ClubIdx == null){
    await liberarBloqueoEquipo();
    return;
  }
  const ok = await publicarPlantillas([team.id]);   // libera el bloqueo si publica bien y no quedan pendientes
  if (!ok) showToast(`No se pudo publicar la plantilla de ${team.name}. El bloqueo sigue activo: publicala desde la pestaña Publicar.`, 'error');
}

window.addEventListener('pagehide', () => {
  if (BLOQUEO_EQUIPO != null && AUTH.user) PES5_BLOQUEO.liberar(BLOQUEO_EQUIPO, AUTH.user.uid);
});

// ============================================================
// Editor de jugador: el editor de mejoras (js/mejoras-page.js) se monta en un
// modal de esta seccion con MEJORAS_EDITOR.montar: sin iframe ni postMessage.
// La tool le pasa los datos y recibe el borrador por onAplicar (lo guarda como
// cambio pendiente en CAMBIOS_PENDIENTES); onCerrar cierra el modal. Solo la
// tool escribe el save.
// ============================================================
async function abrirEditorJugador(id){
  const j = PLANTILLA_ACTUAL.find(p => p.id === id);
  if (!j) return;
  if (!(await asegurarBloqueoEquipo(equipoTSCActual()))) return;
  const previo = document.getElementById('pt-ed-overlay');
  if (previo) previo.remove();
  MEJORAS_EDITOR.desmontar();
  JUGADOR_SELECCIONADO = id;
  const ov = document.createElement('div');
  ov.id = 'pt-ed-overlay';
  ov.className = 'pt-ed-overlay';
  ov.onclick = (e) => { if (e.target === ov) cerrarEditorJugador(); };
  ov.innerHTML = `
    <div class="pt-ed-box">
      <div class="pt-ed-hd"><span>${escHtml(j.nombre)}</span>
        <button class="pt-ed-close" data-onclick="ptCerrarEditorJugador()" title="Cerrar">${ICN.x}</button></div>
      <div id="pt-ed-host" class="pt-ed-host"></div>
    </div>`;
  (_montadoEn || document.body).appendChild(ov);
  renderPlantillaBody();
  MEJORAS_EDITOR.montar(document.getElementById('pt-ed-host'), _opcionesEditor(j));
}

function cerrarEditorJugador(){
  if (window.MEJORAS_EDITOR) MEJORAS_EDITOR.desmontar();
  const ov = document.getElementById('pt-ed-overlay');
  if (ov) ov.remove();
  if (JUGADOR_SELECCIONADO != null){ JUGADOR_SELECCIONADO = null; renderPlantillaBody(); }
  if (BLOQUEO_EQUIPO != null && !Object.keys(CAMBIOS_PENDIENTES).length) liberarBloqueoEquipo();
}

// Opciones del editor para el jugador abierto. Si el equipo tiene presidente se
// cobra (reglas y presupuesto reales, descontando lo ya pendiente de OTROS
// jugadores); si no, edicion libre: reglas en cero y presupuesto enorme.
function _opcionesEditor(j){
  const team = equipoTSCActual();
  const cobra = !!(team && tienePresidente(team));
  let reglas, presupuesto;
  if (cobra){
    reglas = Object.assign({}, YC_RULES);
    const reparto = repartoPendienteEquipo();
    const info = reparto.porJugador[j.id];
    const otrosTotal = reparto.totalCosto - (info ? info.total : 0);
    const otrosGeneral = reparto.fromGeneral - (info ? info.fromGeneral : 0);
    const otrosSub = reparto.fromSub - (info ? info.fromSub : 0);
    const restantes = _restantesTemporada();
    presupuesto = {
      general: Math.max(0, Math.min((team.yunacoin || 0) - otrosTotal, restantes.general - otrosGeneral)),
      subscribers: Math.max(0, restantes.subscribers - otrosSub),
      saldo: Math.max(0, (team.yunacoin || 0) - otrosTotal),
    };
  } else {
    reglas = Object.assign({}, YC_RULES, { bandCosts: [0, 0, 0, 0, 0], scale8Cost: 0, abilityCost: 0, injuryCost: 0, budgetGeneral: 0, budgetSubscribers: 0, maxPositions: 12 });
    presupuesto = { general: 1e9, subscribers: 1e9, saldo: 0 };
  }
  const pres = cobra ? PRESIDENTES_POR_TEAM[team.id] : null;
  return {
    modo: 'admin',
    equipo: {
      id: team ? team.id : null,
      name: team ? team.name : (CLUBES_PES5[PLANTILLA_INDICE] || 'Club'),
      pes5Club: CLUBES_PES5[PLANTILLA_INDICE] || null,
      pes5ClubIdx: PLANTILLA_INDICE,
      yunacoin: team ? (team.yunacoin || 0) : 0,
      cobra: cobra,
      presidente: pres ? (pres.displayName || pres.email || null) : null,
    },
    reglas: reglas,
    presupuesto: presupuesto,
    jugadores: PES5_PLANTILLA.plantillaParaEditor(PES5_EDITOR, PLANO, PLANTILLA_INDICE),
    jugadorId: 'r' + j.id,
    pendiente: CAMBIOS_PENDIENTES[j.id] || null,
    onAplicar: recibirAplicarDelEditor,
    onCerrar: cerrarEditorJugador,
  };
}

// El editor entrego el borrador de un jugador (onAplicar): se calcula el diff contra el save
// actual y se guarda como cambio pendiente (o se limpia si volvio al original). El cierre del
// modal lo pide el editor despues (onCerrar).
function recibirAplicarDelEditor(m){
  const registro = PES5_PLANTILLA.registroDeId(m.jugadorId);
  const j = PLANTILLA_ACTUAL ? PLANTILLA_ACTUAL.find(p => p.id === registro) : null;
  if (registro == null || !j) return;
  const original = PES5_PLANTILLA.jugadorParaEditor(PES5_EDITOR, PLANO, registro, PLANTILLA_ACTUAL.indexOf(j));
  const cambios = PES5_PLANTILLA.cambiosDesdeEditor(original, m.draft || {});
  if (Object.keys(cambios).length){
    CAMBIOS_PENDIENTES[registro] = Object.assign({ atributos: {}, escala8: {}, habilidades: {} }, cambios);
    showToast(`Cambios de ${j.nombre} guardados en la tool. Falta escribir el save.`);
  } else {
    delete CAMBIOS_PENDIENTES[registro];
    showToast(`${j.nombre}: sin cambios pendientes.`);
  }
  renderWriteBar();
}

// Barra de escritura del plantel abierto: estado de cobro, cambios pendientes,
// checkbox "PES5 esta cerrado" y botones. Vive en #pl-writebar, fuera de #pl-body.
function renderWriteBar(){
  const el = document.getElementById('pl-writebar');
  if (!el) return;
  if (PLANTILLA_INDICE == null || !PLANTILLA_ACTUAL){ el.innerHTML = ''; return; }
  const cerrado = !!document.getElementById('pes5-cerrado')?.checked;
  const equipoTSC = equipoTSCActual();
  const presidente = tienePresidente(equipoTSC);
  const total = Object.keys(CAMBIOS_PENDIENTES).length;
  const modoDescarga = !PES5_SAVE.tieneSoporte();
  let cobroHtml;
  if (!equipoTSC){
    cobroHtml = `<span class="pt-cobro-badge libre">${ICN.unlock} Sin equipo TSC vinculado · edición libre</span>`;
  } else if (!presidente){
    cobroHtml = `<span class="pt-cobro-badge libre">${ICN.unlock} ${escHtml(equipoTSC.name)} · sin presidente · edición libre</span>`;
  } else {
    const reparto = repartoPendienteEquipo();
    const restantes = _restantesTemporada();
    const saldo = equipoTSC.yunacoin || 0;
    const ev = YUNACOINS_RULES.evaluarPago(saldo, reparto.totalCosto, reparto.fromGeneral, restantes.general);
    cobroHtml = `<span class="pt-cobro-badge pagando">${ICN.wallet} Se cobra a ${escHtml(equipoTSC.name)} · saldo ${saldo.toLocaleString('es-AR')}</span>
      <span class="pt-cobro-txt">Total a cobrar: ${reparto.totalCosto.toLocaleString('es-AR')} · tope gral. restante ${restantes.general.toLocaleString('es-AR')} · bono restante ${restantes.subscribers.toLocaleString('es-AR')}</span>
      ${ev.excedeSaldo ? `<span class="pt-cobro-faltante">${ICN.alert} Saldo insuficiente: faltan ${(reparto.totalCosto - saldo).toLocaleString('es-AR')}</span>` : ''}
      ${(!ev.excedeSaldo && ev.excedeTopeGeneral) ? `<span class="pt-cobro-faltante">${ICN.alert} Supera el tope general de temporada</span>` : ''}`;
  }
  el.innerHTML = `
    <div class="pt-writebar">
      ${cobroHtml}
      ${BLOQUEO_EQUIPO != null ? `<span class="pt-cobro-txt">${ICN.lock} Bloqueo activo: el presidente no puede usar Mejoras hasta que escribas y publiques.</span>` : ''}
      <span class="pt-changes-count">${total} jugador(es) con cambios</span>
      <label><input type="checkbox" id="pes5-cerrado" ${cerrado ? 'checked' : ''}> PES5 está cerrado</label>
      <button class="btn btn-primary btn-sm" id="btn-escribir-save" disabled data-onclick="ptConfirmarEscribirAlSave()">${ICN.save} ${modoDescarga ? 'Descargar save editado' : 'Escribir al save'}</button>
      <button class="btn btn-sm" ${total ? '' : 'disabled'} data-onclick="ptDescartarTodo()">Descartar cambios</button>
    </div>`;
  document.getElementById('pes5-cerrado').addEventListener('change', actualizarBotonEscritura);
  actualizarBotonEscritura();
}
function descartarTodo(){
  if (!Object.keys(CAMBIOS_PENDIENTES).length) return;
  if (!confirm('¿Descartar todos los cambios sin escribir?')) return;
  CAMBIOS_PENDIENTES = {};
  liberarBloqueoEquipo();
  renderPlantillaBody();
  renderWriteBar();
}

function _cambiosDe(id){
  if (!CAMBIOS_PENDIENTES[id]) CAMBIOS_PENDIENTES[id] = { atributos:{}, escala8:{}, habilidades:{} };
  return CAMBIOS_PENDIENTES[id];
}
function _valorActual(j, tipo, campo){
  const c = CAMBIOS_PENDIENTES[j.id];
  if (tipo === 'atributos' && c?.atributos?.[campo] !== undefined) return c.atributos[campo];
  if (tipo === 'escala8' && c?.escala8?.[campo] !== undefined) return c.escala8[campo];
  if (tipo === 'habilidades' && c?.habilidades?.[campo] !== undefined) return c.habilidades[campo];
  if (tipo === 'simple' && c?.[campo] !== undefined) return c[campo];
  return tipo === 'simple' ? j[campo] : j[tipo][campo];
}
// ¿Tiene el jugador `id` algun cambio pendiente REAL (distinto del save)?
// Unica fuente de verdad para "cuantos jugadores con cambios" y para la
// marca "editado" — ver _limpiarSiVacio.
function _tieneAlgunCambio(id){
  const c = CAMBIOS_PENDIENTES[id];
  if (!c) return false;
  return !!(Object.keys(c.atributos||{}).length || Object.keys(c.escala8||{}).length || Object.keys(c.habilidades||{}).length
    || c.edad !== undefined || c.altura !== undefined || c.pieDominante !== undefined || c.lesiones !== undefined);
}
// C2.2 (d): un jugador sin ningun campo pendiente real no debe quedar
// ocupando una entrada vacia en CAMBIOS_PENDIENTES (contaminaria el contador
// "N jugador(es) con cambios" y el resumen del confirm()).
function _limpiarSiVacio(id){
  if (!_tieneAlgunCambio(id)) delete CAMBIOS_PENDIENTES[id];
}
function actualizarBotonEscritura(){
  const btn = document.getElementById('btn-escribir-save');
  const cerrado = document.getElementById('pes5-cerrado')?.checked;
  const totalPendientes = Object.keys(CAMBIOS_PENDIENTES).length;
  const countEl = document.querySelector('.pt-changes-count');
  if (countEl) countEl.textContent = `${totalPendientes} jugador(es) con cambios`;
  // Slice D.R punto 5: si el equipo del club abierto tiene presidente, el
  // saldo real (teams.yunacoin) tiene que alcanzar el total de TODOS los
  // cambios pendientes de este plantel Y el tope general de temporada no
  // se puede exceder (evaluarPago) — si no, no se puede escribir
  // (macro-slice D.R punto 3: "si el saldo no alcanza, no se escribe").
  const equipoTSC = equipoTSCActual();
  let sinSaldo = false;
  if (equipoTSC && tienePresidente(equipoTSC)){
    const reparto = repartoPendienteEquipo();
    const restantes = _restantesTemporada();
    const evalPago = YUNACOINS_RULES.evaluarPago(equipoTSC.yunacoin || 0, reparto.totalCosto, reparto.fromGeneral, restantes.general);
    sinSaldo = !evalPago.ok;
  }
  if (btn) btn.disabled = !(cerrado && totalPendientes) || sinSaldo;
}

// ============================================================
// C2.3 · paneles persistentes de error/exito + toast real (helpers)
// ============================================================
function _ocultarErrorEscritura(){
  const el = document.getElementById('pl-error-panel');
  if (el){ el.style.display = 'none'; el.innerHTML = ''; }
}
function _mostrarErrorEscritura(e){
  const el = document.getElementById('pl-error-panel');
  if (!el) return;
  const carpeta = PES5_SAVE.carpetaActual || '(sin carpeta elegida — modo archivo/descarga)';
  el.innerHTML = `${ICN.alert}<div class="pt-panel-msg-body"><b>Error al escribir al save</b><br>${escHtml(e && e.name || 'Error')}: ${escHtml(e && e.message || String(e))}<br>Carpeta activa: ${escHtml(carpeta)}</div>
    <button class="pt-panel-msg-close" data-onclick="ptOcultarErrorEscritura()" title="Cerrar">${ICN.x}</button>`;
  el.style.display = 'flex';
}
function _ocultarExitoEscritura(){
  const el = document.getElementById('pl-success-panel');
  if (el){ el.style.display = 'none'; el.innerHTML = ''; }
}
function _mostrarExitoEscritura({ backup, bytes }){
  const el = document.getElementById('pl-success-panel');
  if (!el) return;
  const carpeta = PES5_SAVE.carpetaActual;
  const rutaBackup = carpeta ? `${carpeta}/backups-tsc/${backup}` : backup;
  el.innerHTML = `${ICN.save}<div class="pt-panel-msg-body"><b>Save escrito correctamente</b><br>Backup: ${escHtml(rutaBackup)}<br>Tamaño escrito: ${bytes.toLocaleString('es-AR')} b</div>
    <button class="pt-panel-msg-close" data-onclick="ptOcultarExitoEscritura()" title="Cerrar">${ICN.x}</button>`;
  el.style.display = 'flex';
}

// Vuelve a leer la plantilla actual desde PLANO (ya actualizado) sin cerrar
// el panel del jugador que estaba abierto — a diferencia de onTeamSelect(),
// que siempre limpia JUGADOR_SELECCIONADO. Se usa tras un guardado exitoso
// para que el panel de exito y el jugador que se estaba editando sigan
// visibles (C2.3, punto 3).
async function _recargarPlantillaTrasEscritura(){
  cerrarEditorJugador();
  PLANTILLA_ACTUAL = PES5_EDITOR.leerPlantillaCompleta(PLANO, PLANTILLA_INDICE);
  JUGADOR_SELECCIONADO = null;
  renderPlantillaBody();
  renderWriteBar();
}

// C2.1 · el confirm() antes de escribir muestra SOLO equipo + nombres de
// jugadores afectados — el detalle campo por campo ya se ve en el panel
// (clase `changed`).
async function confirmarEscribirAlSave(){
  const ids = Object.keys(CAMBIOS_PENDIENTES);
  if (!ids.length) return;
  const nombreEquipo = PLANTILLA_INDICE != null ? PES5_EDITOR.nombreEquipo(PLANO, PLANTILLA_INDICE) : '(equipo desconocido)';
  const nombresJugadores = ids.map(id => {
    const j = PLANTILLA_ACTUAL.find(p => p.id == id);
    return j ? j.nombre : ('id ' + id);
  }).join(', ');

  // Slice D.R · defensa en profundidad: el boton "Escribir al save" ya
  // queda deshabilitado por actualizarBotonEscritura() cuando el saldo o
  // el tope general de temporada no alcanzan, pero se revalida aca por si
  // CAMBIOS_PENDIENTES cambio de otra forma entre el ultimo render y el
  // click. Se fuerza un refresco de GASTO_TEMPORADA_CACHE (bypass del
  // cache) para no confiar en una foto vieja si otra sesion ya gasto
  // presupuesto de este equipo mientras tanto. "Si el saldo no alcanza, no
  // se escribe" (macro-slice D.R, punto 3).
  const equipoTSCConfirm = equipoTSCActual();
  if (equipoTSCConfirm && tienePresidente(equipoTSCConfirm)){
    await _refrescarGastoTemporadaEquipo(equipoTSCConfirm, true);
    const repartoConfirm = repartoPendienteEquipo();
    const restantesConfirm = _restantesTemporada();
    const saldoConfirm = equipoTSCConfirm.yunacoin || 0;
    const evalConfirm = YUNACOINS_RULES.evaluarPago(saldoConfirm, repartoConfirm.totalCosto, repartoConfirm.fromGeneral, restantesConfirm.general);
    if (!evalConfirm.ok){
      const msg = evalConfirm.excedeSaldo
        ? `${equipoTSCConfirm.name} necesita ${repartoConfirm.totalCosto.toLocaleString('es-AR')} YunaCoins para estos cambios pero tiene ${saldoConfirm.toLocaleString('es-AR')} (faltan ${(repartoConfirm.totalCosto-saldoConfirm).toLocaleString('es-AR')}). No se escribio nada.`
        : `${equipoTSCConfirm.name} supera el tope general de temporada (quedan ${restantesConfirm.general.toLocaleString('es-AR')}, hacen falta ${repartoConfirm.fromGeneral.toLocaleString('es-AR')}). No se escribio nada.`;
      _mostrarErrorEscritura({ name: 'SaldoInsuficiente', message: msg });
      actualizarBotonEscritura();
      return;
    }
  }

  // C2.3, punto 1 y 7 · pedir el permiso de escritura EXPLICITAMENTE aca,
  // antes del confirm() y dentro del mismo gesto de click que lo dispara —
  // es la causa raiz confirmada del cuelgue silencioso (ver nota en
  // pes5-save.js > asegurarEscritura). En modo fallback (sin soporte de
  // File System Access) esto devuelve true sin pedir nada: no hace falta
  // permiso para generar una descarga.
  const permitido = await PES5_SAVE.asegurarEscritura();
  if (!permitido){
    _mostrarErrorEscritura({ name: 'PermisoDenegado', message: 'No se pudo confirmar el permiso de escritura sobre la carpeta del save. Reconectá la carpeta (botón "Reconectar" en la barra de arriba) o elegila de nuevo.' });
    return;
  }

  const nota = PES5_SAVE.tieneSoporte()
    ? 'Se crea backup automático.'
    : 'Se va a descargar el archivo editado (el original de tu carpeta no se toca).';
  const ok = confirm(`Equipo: ${nombreEquipo}\nJugadores: ${nombresJugadores}\n\n${nota} ¿Confirmar?`);
  if (!ok) return;
  await escribirAlSave();
}

// C2.3 · la escritura ya no falla en silencio: paso a paso en #pl-log
// (punto 7 — para saber en que etapa queda colgado un intento fallido),
// panel de error persistente si algo lanza (punto 2), panel de exito
// persistente si termina bien (punto 3), y en modo fallback (sin File
// System Access, ej. Brave) termina en una DESCARGA del save reescrito en
// vez de intentar escribir en disco (punto 6a).
async function escribirAlSave(){
  const logEl = document.getElementById('pl-log');
  // Cada intento nuevo arranca limpio de AMBOS paneles — si el intento
  // anterior habia terminado bien y este vuelve a fallar (o viceversa), no
  // deben quedar un exito y un error persistentes superpuestos.
  _ocultarErrorEscritura();
  _ocultarExitoEscritura();
  if (logEl){ logEl.style.display = ''; logEl.innerHTML = ''; }
  const log = (msg, cls) => { if (!logEl) return; const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = msg; logEl.appendChild(d); };

  // Slice D.R · saco la "foto" del reparto (bono/general por jugador) ANTES
  // de tocar nada (CAMBIOS_PENDIENTES se vacia al final si todo sale bien)
  // — el cobro real se aplica DESPUES de que el save (o la descarga de
  // fallback) se confirmo con exito.
  const equipoCobro = equipoTSCActual();
  const debeCobrar = !!(equipoCobro && tienePresidente(equipoCobro));
  const repartoCobro = debeCobrar ? repartoPendienteEquipo() : null;
  async function _aplicarCobroSiCorresponde(){
    if (!debeCobrar || !repartoCobro || repartoCobro.totalCosto <= 0) return;
    try {
      log(`cobrando ${repartoCobro.totalCosto.toLocaleString('es-AR')} YunaCoins a ${equipoCobro.name} (general ${repartoCobro.fromGeneral.toLocaleString('es-AR')} + bono ${repartoCobro.fromSub.toLocaleString('es-AR')})...`);
      const nuevoSaldo = await cobrarMejorasEquipo(equipoCobro, repartoCobro);
      log(`cobro OK — nuevo saldo de ${equipoCobro.name}: ${nuevoSaldo.toLocaleString('es-AR')}`, 'ok');
      showToast(`-${repartoCobro.totalCosto.toLocaleString('es-AR')} YunaCoins a ${equipoCobro.name} (mejora PES5)`);
      if (TAB === 'equipos') renderEquiposTab();
    } catch(eCobro){
      // El save YA se escribio con exito en este punto — no lo deshacemos
      // (no hay forma segura de "des-escribir"). Se avisa fuerte para que
      // Luis cobre a mano y no quede la mejora gratis sin que se note.
      log('ERROR AL COBRAR (el save SI se escribio): ' + (eCobro.message||eCobro), 'err');
      console.error('[pes5-tool] cobrarMejorasEquipo:', eCobro);
      showToast(`Save escrito pero el cobro a ${equipoCobro.name} FALLO — cobralo a mano (ver log).`, 'error');
    }
  }

  try {
    log('aplicando cambios...');
    const copia = Uint8Array.from(PLANO);
    for (const [id, cambios] of Object.entries(CAMBIOS_PENDIENTES)){
      const escritos = PES5_EDITOR.escribirJugadorCompleto(copia, Number(id), cambios);
      log(`jugador ${id}: ${escritos.length} campo(s) escrito(s)`, 'ok');
    }
    log('cifrando...');
    const cifrado = PES5_CRYPT.cifrar(copia);

    if (!PES5_SAVE.tieneSoporte() || !PES5_SAVE.carpetaActual){
      // Salvavidas: sin handle de carpeta no se puede escribir. Ya no hay
      // selector de archivo (un archivo elegido asi es de solo lectura), pero
      // si el navegador perdio la API o la carpeta quedo revocada, se
      // descarga el save reescrito en vez de dejar al admin sin salida.
      // El original en la carpeta del juego queda intacto y sirve de backup.
      log('generando descarga (sin acceso directo a la carpeta)...');
      PES5_SAVE.descargar(cifrado, 'KONAMI-WIN32PES5OPT');
      log('descarga generada', 'ok');
      showToast('Save editado descargado — copialo a mano a la carpeta del juego.');
      _mostrarExitoEscritura({ backup: '(sin backup automático — no se tocó el archivo en la carpeta del juego, solo se descargó la version editada)', bytes: cifrado.length });
      await _aplicarCobroSiCorresponde();
      PLANO = copia;
      CAMBIOS_PENDIENTES = {};
      await _publicarEquipoTrasEscritura(equipoCobro);
      if (PLANTILLA_INDICE != null) await _recargarPlantillaTrasEscritura();
      return;
    }

    log('pidiendo permiso...');
    const permitido = await PES5_SAVE.asegurarEscritura();
    if (!permitido) throw new Error('permiso de escritura no concedido sobre la carpeta del save');

    const res = await PES5_SAVE.escribir(cifrado, (paso) => {
      if (paso === 'backup') log('haciendo backup...');
      if (paso === 'escribiendo') log('escribiendo...');
      if (paso === 'verificando') log('verificando...');
    });
    log(`guardado OK — backup: ${res.backup}`, 'ok');
    showToast('Save escrito. Backup: ' + res.backup);
    _mostrarExitoEscritura({ backup: res.backup, bytes: cifrado.length });
    await _aplicarCobroSiCorresponde();
    PLANO = copia;
    CAMBIOS_PENDIENTES = {};
    await _publicarEquipoTrasEscritura(equipoCobro);
    if (PLANTILLA_INDICE != null) await _recargarPlantillaTrasEscritura();
    renderStatusBar();
  } catch(e) {
    log('ERROR: ' + (e.message||e), 'err');
    console.error('[pes5-tool] escribirAlSave:', e);
    showToast('Error al escribir: ' + (e.message||e), 'error');
    _mostrarErrorEscritura(e);
  }
}

/* ============================================================
   PESTAÑA 3 · PEDIDOS
   ============================================================ */
let PEDIDOS_PENDIENTES = [];
async function renderPedidosTab(){
  const cont = document.getElementById('pt-tabcontent');
  cont.innerHTML = `<div class="pt-empty">${ICN.inbox}<div>Cargando pedidos…</div></div>`;
  try {
    const q = await firebase.firestore().collection('pedidos_pes5').where('estado', '==', 'pendiente').get();
    PEDIDOS_PENDIENTES = q.docs.map(d => Object.assign({ _id: d.id }, d.data()));
  } catch (e) {
    console.error('[pes5-tool] leer pedidos', e);
    cont.innerHTML = `<div class="pt-empty">${ICN.alert}<div>No se pudieron leer los pedidos: ${escHtml(e.message || String(e))}</div></div>`;
    return;
  }
  PEDIDOS_PENDIENTES.sort((a, b) => String(a.teamName || '').localeCompare(String(b.teamName || '')));
  if (!PEDIDOS_PENDIENTES.length){
    cont.innerHTML = `<div class="pt-empty">${ICN.inbox}<div>No hay pedidos pendientes.</div></div>`;
    return;
  }
  const filas = PEDIDOS_PENDIENTES.map(p => {
    const fecha = p.creadoEn && p.creadoEn.toDate ? p.creadoEn.toDate().toLocaleString('es-CL') : '';
    const esFormacion = p.tipo === 'formacion';
    const lineas = esFormacion
      ? `Formación ${escHtml((p.formacion && p.formacion.nombre) || '')}`
      : (p.lines || []).map(l => `${escHtml(l.label)} ${escHtml(l.from)} → ${escHtml(l.to)}`).join('<br>');
    const aplicable = esFormacion
      ? !!(p.formacion && Array.isArray(p.formacion.slots) && p.pes5ClubIdx != null)
      : !!(p.cambios && p.registro != null);
    const jugador = esFormacion
      ? '<i>Formación</i>'
      : `${escHtml(p.playerName || '')}${p.subscriber ? ' <span class="badge">$</span>' : ''}`;
    return `<tr>
      <td><input type="checkbox" class="ped-sel" value="${escHtml(p._id)}" ${aplicable ? 'checked' : 'disabled'}></td>
      <td>${escHtml(p.teamName || String(p.teamId))}</td>
      <td>${jugador}</td>
      <td style="font-size:12px;">${lineas || '<i>sin detalle</i>'}${aplicable ? '' : '<br><span class="badge badge-warn">pedido viejo, sin datos aplicables</span>'}</td>
      <td style="text-align:right;">${esFormacion ? 'gratis' : Number(p.totalCost || 0).toLocaleString('es-CL')}</td>
      <td style="font-size:12px;">${escHtml(fecha)}</td>
      <td><button class="btn btn-sm" data-onclick="ptRechazarPedido('${escHtml(p._id)}')">Rechazar</button></td>
    </tr>`;
  }).join('');
  cont.innerHTML = `
    <div style="margin-bottom:10px;">Pedidos pendientes de los presidentes. Se cobran recién al aplicarlos, con los precios y el save de este momento.</div>
    ${PLANO ? '' : `<div class="pt-status-item">${ICN.alert} Cargá el save para poder aplicar.</div>`}
    <div class="pt-tbl-wrap"><table class="pt-tbl"><thead><tr>
      <th></th><th>Equipo</th><th>Jugador</th><th>Cambios pedidos</th><th>Costo estimado</th><th>Enviado</th><th></th>
    </tr></thead><tbody>${filas}</tbody></table></div>
    <label style="display:flex;gap:6px;align-items:center;margin:10px 0;font-size:13px;">
      <input type="checkbox" id="ped-cerrado" data-onchange="ptHabilitarAplicarPedidos(this)"> PES5 está cerrado
    </label>
    <button class="btn btn-primary btn-sm" id="btn-aplicar-pedidos" disabled data-onclick="ptAplicarPedidosSeleccionados()">${ICN.save} ${PES5_SAVE.tieneSoporte() ? 'Aplicar seleccionados' : 'Aplicar y descargar save'}</button>
    <div class="pt-log" id="ped-log"></div>`;
}

async function rechazarPedido(id){
  const motivo = prompt('Motivo del rechazo (lo ve el presidente):');
  if (motivo === null) return;
  try {
    await firebase.firestore().collection('pedidos_pes5').doc(id).update({
      estado: 'rechazado', motivo: motivo.trim() || 'sin motivo', rechazadoEn: new Date().toISOString(), rechazadoPor: AUTH.user.email,
    });
    showToast('Pedido rechazado.');
  } catch (e) {
    console.error('[pes5-tool] rechazar', e);
    showToast('No se pudo rechazar: ' + (e.message || e), 'error');
  }
  renderPedidosTab();
}

async function aplicarPedidosSeleccionados(){
  const logEl = document.getElementById('ped-log');
  const log = (msg, cls) => { if (!logEl) return; const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = msg; logEl.appendChild(d); };
  if (logEl) logEl.innerHTML = '';
  if (!PLANO){ showToast('Cargá el save primero.', 'error'); return; }
  const ids = Array.from(document.querySelectorAll('.ped-sel:checked')).map(i => i.value);
  const pedidos = PEDIDOS_PENDIENTES.filter(p => ids.includes(p._id));
  if (!pedidos.length){ showToast('No hay pedidos seleccionados.', 'error'); return; }
  if (!confirm(`Se van a aplicar ${pedidos.length} pedido(s) al save y cobrar a cada equipo. ¿Confirmar?`)) return;

  // 1) evaluar y aplicar sobre una copia, equipo por equipo
  const copia = Uint8Array.from(PLANO);
  const aplicados = [];   // {pedido, team, info}
  const rechazados = [];  // {pedido, motivo}
  const porEquipo = {};
  pedidos.forEach(p => { (porEquipo[p.teamId] = porEquipo[p.teamId] || []).push(p); });
  for (const teamId of Object.keys(porEquipo)){
    const team = EQUIPOS_TSC.find(t => String(t.id) === String(teamId));
    if (!team){ porEquipo[teamId].forEach(p => rechazados.push({ pedido: p, motivo: 'el equipo ya no existe' })); continue; }
    await _refrescarGastoTemporadaEquipo(team, true);
    const restantes = _restantesTemporada();
    let usadoGeneral = 0, usadoSub = 0, usadoTotal = 0;
    for (const p of porEquipo[teamId]){
      if (p.tipo === 'formacion'){
        if (!p.formacion || !Array.isArray(p.formacion.slots)){ rechazados.push({ pedido: p, motivo: 'sin datos de formación' }); continue; }
        if (team.pes5ClubIdx == null || team.pes5ClubIdx !== p.pes5ClubIdx){ rechazados.push({ pedido: p, motivo: 'el equipo cambió de club en el juego' }); continue; }
        const roster = PES5_EDITOR.leerPlantillaEquipo(copia, team.pes5ClubIdx);
        const idsOk = p.formacion.slots.every(s => s && s.slot >= 0 && s.slot <= 10 && roster[s.slot] === s.jugador);
        if (!idsOk){ rechazados.push({ pedido: p, motivo: 'el plantel cambió; el presidente debe pedir la formación de nuevo' }); continue; }
        // reglas del juego: una sola posición por banda, topes y mínimos por línea
        const LINEA = { CT:'def', DI:'def', DD:'def', CIZ:'mid', CDR:'mid', CCD:'mid', CC:'mid', MP:'mid', EI:'att', ED:'att', SD:'att', DC:'att' };
        const CAP_LINEA = { def:5, mid:6, att:5 };
        const MIN_LINEA = { def:2, mid:2, att:1 };
        const NOMBRE_LINEA = { def:'la defensa', mid:'el mediocampo', att:'el ataque' };
        const CAP_POS = { CT:5, CCD:5, CC:5, MP:5, SD:5, DC:5 };
        const slotsForm = p.formacion.slots || [];
        const conPos = slotsForm.filter(s => s && s.posNombre).length;
        const banda = [];
        const porLinea = { def:0, mid:0, att:0 };
        const cuenta = {};
        for (const s of slotsForm){
          const x = s && s.posNombre;
          if (!x) continue;
          if (['DI','DD','CIZ','CDR','EI','ED'].includes(x)) banda.push(x);
          cuenta[x] = (cuenta[x] || 0) + 1;
          if (LINEA[x]) porLinea[LINEA[x]]++;
        }
        // las reglas por posición solo se pueden validar si vienen las 11
        if (conPos === 11){
          const rep = banda.find((x, i) => banda.indexOf(x) !== i);
          if (rep){ rechazados.push({ pedido: p, motivo: 'posiciones repetidas: ' + rep }); continue; }
          const topePos = Object.entries(CAP_POS).find(([x, n]) => (cuenta[x] || 0) > n);
          if (topePos){ rechazados.push({ pedido: p, motivo: 'demasiados ' + topePos[0] }); continue; }
          const topeLinea = Object.entries(CAP_LINEA).find(([l, n]) => porLinea[l] > n);
          if (topeLinea){ rechazados.push({ pedido: p, motivo: 'demasiados jugadores en ' + NOMBRE_LINEA[topeLinea[0]] }); continue; }
          const faltaLinea = Object.entries(MIN_LINEA).find(([l, n]) => porLinea[l] < n);
          if (faltaLinea){ rechazados.push({ pedido: p, motivo: 'faltan jugadores en ' + NOMBRE_LINEA[faltaLinea[0]] }); continue; }
        }
        try {
          PES5_EDITOR.escribirFormacionEquipo(copia, team.pes5ClubIdx, p.formacion.slots);
        } catch (e) {
          rechazados.push({ pedido: p, motivo: 'no se pudo escribir la formación: ' + (e.message || e) }); continue;
        }
        aplicados.push({ pedido: p, team, info: {
          total: 0, fromGeneral: 0, fromSub: 0, formacion: true,
          lineas: [{ label: 'Formación', from: '—', to: p.formacion.nombre || '' }],
        } });
        log(`${team.name}: formación ${p.formacion.nombre || ''} aplicada (gratis)`, 'ok');
        continue;
      }
      if (!p.cambios || p.registro == null){ rechazados.push({ pedido: p, motivo: 'pedido viejo sin datos aplicables' }); continue; }
      if (team.pes5ClubIdx == null || team.pes5ClubIdx !== p.pes5ClubIdx){ rechazados.push({ pedido: p, motivo: 'el equipo cambió de club en el juego' }); continue; }
      if (!PES5_EDITOR.leerPlantillaEquipo(copia, team.pes5ClubIdx).includes(p.registro)){ rechazados.push({ pedido: p, motivo: 'el jugador ya no está en el plantel' }); continue; }
      const j = PES5_EDITOR.leerJugadorCompleto(copia, p.registro);
      const { total, lineas } = YUNACOINS_RULES.costoCambios(j, p.cambios, YC_RULES);
      const reparto = YUNACOINS_RULES.distribuirCosto(total, Math.max(0, restantes.subscribers - usadoSub), !!j.subscriber);
      const pago = YUNACOINS_RULES.evaluarPago((team.yunacoin || 0) - usadoTotal, total, reparto.fromGeneral, restantes.general - usadoGeneral);
      if (!pago.ok){ rechazados.push({ pedido: p, motivo: pago.excedeSaldo ? 'saldo insuficiente' : 'se superó el tope de temporada' }); continue; }
      try {
        PES5_EDITOR.escribirJugadorCompleto(copia, p.registro, p.cambios);
      } catch (e) {
        rechazados.push({ pedido: p, motivo: 'valor inválido: ' + (e.message || e) }); continue;
      }
      usadoGeneral += reparto.fromGeneral; usadoSub += reparto.fromSub; usadoTotal += total;
      aplicados.push({ pedido: p, team, info: {
        pedidoId: p._id, playerId: p.registro, playerName: j.nombre, subscriber: !!j.subscriber,
        total, lineas, fromGeneral: reparto.fromGeneral, fromSub: reparto.fromSub,
      } });
      log(`${team.name} · ${j.nombre}: aplicado en la copia (${total.toLocaleString('es-CL')})`, 'ok');
    }
  }

  // 2) escribir el save (solo si hubo algo aplicado)
  let backup = null;
  if (aplicados.length){
    try {
      log('cifrando...');
      const cifrado = PES5_CRYPT.cifrar(copia);
      // Sin handle de carpeta con permiso de escritura (navegador sin la API,
      // carpeta revocada o permiso denegado) se descarga el save editado en
      // vez de abortar. Mismo criterio que escribirAlSave().
      const puedeEscribir = PES5_SAVE.tieneSoporte() && !!PES5_SAVE.carpetaActual
        && (await PES5_SAVE.asegurarEscritura());
      if (!puedeEscribir){
        PES5_SAVE.descargar(cifrado, 'KONAMI-WIN32PES5OPT');
        backup = '(descarga manual — no se tocó el archivo de la carpeta)';
        log('sin acceso directo a la carpeta: save editado descargado — copialo a mano al juego', 'ok');
        showToast('Save editado descargado — copialo a mano a la carpeta del juego.');
      } else {
        log('pidiendo permiso...');
        const res = await PES5_SAVE.escribir(cifrado);
        backup = res.backup;
        log('save escrito. backup: ' + res.backup, 'ok');
      }
      PLANO = copia;
    } catch (e) {
      console.error('[pes5-tool] escribir save de pedidos', e);
      log('ERROR al escribir el save, no se cobró ni se marcó nada: ' + (e.message || e), 'err');
      showToast('Error al escribir el save: ' + (e.message || e), 'error');
      return;
    }
  }

  // 3) cobrar por equipo y marcar pedidos
  const porEquipoAplicado = {};
  aplicados.forEach(a => { (porEquipoAplicado[a.team.id] = porEquipoAplicado[a.team.id] || []).push(a); });
  for (const teamId of Object.keys(porEquipoAplicado)){
    const lista = porEquipoAplicado[teamId];
    const team = lista[0].team;
    const reparto = { totalCosto: 0, fromGeneral: 0, fromSub: 0, porJugador: {} };
    lista.forEach(a => {
      reparto.totalCosto += a.info.total; reparto.fromGeneral += a.info.fromGeneral; reparto.fromSub += a.info.fromSub;
      reparto.porJugador[a.pedido._id] = a.info;
    });
    await _refrescarGastoTemporadaEquipo(team, true);
    if (reparto.totalCosto > 0){
      try {
        const saldo = await cobrarMejorasEquipo(team, reparto, 'mejora PES5 (pedido)');
        log(`${team.name}: cobrado ${reparto.totalCosto.toLocaleString('es-CL')}, saldo ${saldo.toLocaleString('es-CL')}`, 'ok');
      } catch (e) {
        console.error('[pes5-tool] cobro pedidos', e);
        log(`ERROR cobrando a ${team.name} (el save SÍ se escribió): ${e.message || e}`, 'err');
      }
    } else {
      log(`${team.name}: sin cobro (pedido sin costo)`, 'ok');
    }
    for (const a of lista){
      try {
        await firebase.firestore().collection('pedidos_pes5').doc(a.pedido._id).update({
          estado: 'aplicado', aplicadoEn: new Date().toISOString(), aplicadoPor: AUTH.user.email,
          costoFinal: a.info.total, fromGeneral: a.info.fromGeneral, fromSub: a.info.fromSub, backup,
        });
      } catch (e) { log(`ERROR marcando pedido ${a.pedido._id}: ${e.message || e}`, 'err'); }
    }
  }
  for (const r of rechazados){
    try {
      await firebase.firestore().collection('pedidos_pes5').doc(r.pedido._id).update({
        estado: 'rechazado', motivo: r.motivo, rechazadoEn: new Date().toISOString(), rechazadoPor: AUTH.user.email,
      });
      log(`${r.pedido.teamName || r.pedido.teamId} · ${r.pedido.playerName || ''}: rechazado (${r.motivo})`, 'err');
    } catch (e) { log(`ERROR marcando rechazo ${r.pedido._id}: ${e.message || e}`, 'err'); }
  }
  // Los pedidos de formación se publican solos para que el presidente vea
  // enseguida lo que quedó escrito en el save.
  const equiposFormacion = [...new Set(aplicados.filter(a => a.info.formacion).map(a => a.team.id))];
  if (equiposFormacion.length){
    log('publicando la formación aplicada...');
    await publicarPlantillas(equiposFormacion);
  }
  GASTO_TEMPORADA_CACHE = { teamId: null, season: null, general: 0, sub: 0 };
  showToast(`Pedidos: ${aplicados.length} aplicado(s), ${rechazados.length} rechazado(s).`);
  if (aplicados.some(a => !a.info.formacion)) log('Recordá publicar las plantillas para que los presidentes vean los cambios (pestaña Publicar).');
  setTimeout(renderPedidosTab, 1500);
}

/* ============================================================
   PESTAÑA 4 · PUBLICAR (esqueleto — slice D)
   ============================================================ */
function renderPublicarTab(){
  const cont = document.getElementById('pt-tabcontent');
  if (!PLANO) {
    cont.innerHTML = `<div class="pt-empty">${ICN.upload}<div>Cargá el save para publicar plantillas.</div></div>`;
    return;
  }
  const objetivo = EQUIPOS_TSC.filter(t => t.status !== 'INACTIVO' && t.pes5ClubIdx != null);
  const filas = objetivo.map(t => {
    const clubNombre = CLUBES_PES5[t.pes5ClubIdx] || '?';
    const cantJugadores = PES5_EDITOR.leerPlantillaEquipo(PLANO, t.pes5ClubIdx).length;
    return `
      <tr>
        <td style="padding:10px;">${escHtml(t.name)}</td>
        <td style="padding:10px;font-size:12.5px;color:var(--txt3);">${escHtml(clubNombre)}</td>
        <td style="padding:10px;text-align:center;font-size:12.5px;">${cantJugadores}</td>
        <td style="padding:10px;font-size:12.5px;"><span id="pub-estado-${t.id}">…</span></td>
        <td style="padding:10px;text-align:right;"><button class="btn btn-sm" data-onclick="ptPublicarPlantillaDeEquipo(${t.id})">${ICN.upload} Publicar</button></td>
      </tr>
    `;
  }).join('');
  cont.innerHTML = `
    <div style="max-width:900px;">
      <h2 class="pt-h1">Publicar plantillas</h2>
      <div class="pt-sub">Copia la plantilla actual del save a la web para que cada presidente la vea en su editor.</div>
      <button class="btn btn-primary btn-sm" id="btn-publicar-todos" data-onclick="ptPublicarPlantillas()">${ICN.upload} Publicar todos (${objetivo.length})</button>
      <table style="width:100%;margin-top:14px;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:1px solid var(--brd);color:var(--txt3);">
            <th style="padding:8px;text-align:left;font-weight:600;">Equipo TSC</th>
            <th style="padding:8px;text-align:left;font-weight:600;">Club PES5</th>
            <th style="padding:8px;text-align:center;font-weight:600;">Jugadores</th>
            <th style="padding:8px;text-align:left;font-weight:600;">Última publicación</th>
            <th style="padding:8px;"></th>
          </tr>
        </thead>
        <tbody>
          ${filas}
        </tbody>
      </table>
      <div class="pt-log" id="pub-log"></div>
    </div>
  `;
  cargarEstadoPublicacion(objetivo);
}

async function _hashPlano(){
  const buf = await crypto.subtle.digest('SHA-256', PLANO);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function cargarEstadoPublicacion(equipos){
  const hashActual = await _hashPlano();
  for (const t of equipos){
    const el = document.getElementById('pub-estado-' + t.id);
    if (!el) continue;
    try {
      const snap = await firebase.firestore().collection('pes5_plantillas').doc(String(t.id)).get();
      if (!snap.exists){ el.textContent = 'Nunca'; continue; }
      const d = snap.data();
      const cuando = d.publicadoEn && d.publicadoEn.toDate ? d.publicadoEn.toDate().toLocaleString('es-CL') : 'fecha desconocida';
      const vieja = d.saveHash !== hashActual || d.pes5ClubIdx !== t.pes5ClubIdx;
      el.innerHTML = `${escHtml(cuando)}${vieja ? ' <span class="badge badge-warn">desactualizada</span>' : ' <span class="badge badge-green">al día</span>'}`;
    } catch (e) {
      el.textContent = 'error al leer';
      console.error('[pes5-tool] estado publicacion', t.id, e);
    }
  }
}

/* Reemplazan handlers inline que no entran en la gramática de js/events.js (ver ahí). */
function habilitarAplicarPedidos(chk){ document.getElementById('btn-aplicar-pedidos').disabled = !(chk.checked && PLANO); }
function publicarPlantillaDeEquipo(id){ return publicarPlantillas([id]); }
async function publicarPlantillas(ids){
  const log = document.getElementById('pub-log');
  const linea = (msg, cls) => { if (!log) return; const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = msg; log.appendChild(d); };
  if (!PLANO){ showToast('Cargá el save primero.', 'error'); return; }
  const equipos = EQUIPOS_TSC.filter(t => t.status !== 'INACTIVO' && t.pes5ClubIdx != null && (!ids || ids.includes(t.id)));
  if (!equipos.length){ showToast('No hay equipos para publicar.', 'error'); return; }
  const btn = document.getElementById('btn-publicar-todos'); if (btn) btn.disabled = true;
  if (log) log.innerHTML = '';
  try {
    const saveHash = await _hashPlano();
    for (const t of equipos){
      const jugadores = PES5_PLANTILLA.plantillaParaEditor(PES5_EDITOR, PLANO, t.pes5ClubIdx);
      const formacion = PES5_EDITOR.leerFormacionEquipo(PLANO, t.pes5ClubIdx);
      await firebase.firestore().collection('pes5_plantillas').doc(String(t.id)).set({
        teamId: t.id, teamName: t.name, pes5ClubIdx: t.pes5ClubIdx, pes5Club: CLUBES_PES5[t.pes5ClubIdx] || null,
        jugadores, formacion, saveHash, publicadoPor: AUTH.user.email,
        publicadoEn: firebase.firestore.FieldValue.serverTimestamp(),
      });
      linea(`${t.name}: ${jugadores.length} jugadores publicados${formacion ? ` · formación ${formacion.nombre}` : ''}`, 'ok');
    }
    showToast(`Publicado: ${equipos.length} equipo(s).`);
    if (BLOQUEO_EQUIPO != null && equipos.some(t => t.id === BLOQUEO_EQUIPO) && !Object.keys(CAMBIOS_PENDIENTES).length) await liberarBloqueoEquipo();
    return true;
  } catch (e) {
    console.error('[pes5-tool] publicar', e);
    linea('ERROR: ' + (e.message || e), 'err');
    showToast('Error al publicar: ' + (e.message || e), 'error');
    return false;
  } finally {
    if (btn) btn.disabled = false;
    cargarEstadoPublicacion(equipos);
  }
}

/* ============================================================
   PESTAÑA 5 · REGLAS (Slice R)
   ============================================================ */
function renderReglasTab(){
  const cont = document.getElementById('pt-tabcontent');
  const r = YC_RULES;
  cont.innerHTML = `
    <div style="max-width:600px;">
      <h2 class="pt-h1">Reglas de YunaCoins</h2>
      <div class="pt-sub">Las leen la tool y el editor del presidente. Solo el admin las cambia.</div>

      ${YC_RULES_META ? `
        <div style="font-size:12px;color:var(--txt3);margin-bottom:14px;">
          Última actualización: ${new Date(YC_RULES_META.actualizadoEn).toLocaleString('es-CL')} por ${escHtml(YC_RULES_META.actualizadoPor)}
        </div>
      ` : `
        <div style="font-size:12px;color:var(--txt3);margin-bottom:14px;">
          Todavía no se guardaron: se usan los valores por defecto.
        </div>
      `}

      <div class="pt-fieldgrp" style="margin-bottom:18px;">
        <div class="pt-fieldgrp-title">Topes por temporada</div>
        <div class="pt-field">
          <label>Tope general</label>
          <input type="number" min="0" step="500" id="rg-budgetGeneral" value="${r.budgetGeneral}" style="width:100px;">
        </div>
        <div class="pt-field">
          <label>Bono suscriptores</label>
          <input type="number" min="0" step="500" id="rg-budgetSubscribers" value="${r.budgetSubscribers}" style="width:100px;">
        </div>
      </div>

      <div class="pt-fieldgrp" style="margin-bottom:18px;">
        <div class="pt-fieldgrp-title">Costo por punto (atributos 0-99)</div>
        ${['Menos de 80','80 a 85','86 a 90','91 a 95','96 a 99'].map((label, i) => `
          <div class="pt-field">
            <label>${label}</label>
            <input type="number" min="0" step="10" id="rg-band-${i}" value="${r.bandCosts[i]}" style="width:100px;">
          </div>
        `).join('')}
      </div>

      <div class="pt-fieldgrp" style="margin-bottom:18px;">
        <div class="pt-fieldgrp-title">Otros costos</div>
        <div class="pt-field">
          <label>Atributo escala 1-8, por punto</label>
          <input type="number" min="0" step="10" id="rg-scale8Cost" value="${r.scale8Cost}" style="width:100px;">
        </div>
        <div class="pt-field">
          <label>Habilidad especial</label>
          <input type="number" min="0" step="10" id="rg-abilityCost" value="${r.abilityCost}" style="width:100px;">
        </div>
        <div class="pt-field">
          <label>Resistencia a lesiones, por nivel</label>
          <input type="number" min="0" step="10" id="rg-injuryCost" value="${r.injuryCost}" style="width:100px;">
        </div>
      </div>

      <div class="pt-fieldgrp" style="margin-bottom:18px;">
        <div class="pt-fieldgrp-title">Restricciones de plantilla</div>
        <div class="pt-field">
          <label>Máximo de posiciones por jugador<br><span style="font-size:11px;color:var(--txt3);">El juego permite hasta 12; la TSC usa 5.</span></label>
          <input type="number" min="1" max="12" step="1" id="rg-maxPositions" value="${r.maxPositions}" style="width:100px;">
        </div>
      </div>

      <div id="rg-errores"></div>

      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn btn-primary btn-sm" data-onclick="ptGuardarReglas()">${ICN.save} Guardar</button>
        <button class="btn btn-sm" data-onclick="ptRestaurarReglasDefault()">Restaurar valores por defecto</button>
      </div>
    </div>
  `;
}

function _leerFormReglas(){
  const n = (id) => { const v = parseInt(document.getElementById(id).value, 10); return Number.isFinite(v) ? v : NaN; };
  return {
    bandCosts: [0,1,2,3,4].map(i => n('rg-band-' + i)),
    scale8Cost: n('rg-scale8Cost'), abilityCost: n('rg-abilityCost'), injuryCost: n('rg-injuryCost'),
    budgetGeneral: n('rg-budgetGeneral'), budgetSubscribers: n('rg-budgetSubscribers'),
    maxPositions: n('rg-maxPositions'),
  };
}

function restaurarReglasDefault(){
  const d = YUNACOINS_RULES.DEFAULT_RULES;
  d.bandCosts.forEach((v, i) => { document.getElementById('rg-band-' + i).value = v; });
  ['scale8Cost','abilityCost','injuryCost','budgetGeneral','budgetSubscribers','maxPositions'].forEach(k => { document.getElementById('rg-' + k).value = d[k]; });
  showToast('Valores por defecto cargados en el formulario. Falta Guardar.');
}

async function guardarReglas(){
  const r = _leerFormReglas();
  const errores = YUNACOINS_RULES.validarReglas(r);
  const box = document.getElementById('rg-errores');
  if (errores.length){
    box.innerHTML = errores.map(e => `<div style="color:var(--red,#f87171);font-size:12px;">${escHtml(e)}</div>`).join('');
    return;
  }
  box.innerHTML = '';
  try {
    const doc = Object.assign({}, r, { actualizadoEn: new Date().toISOString(), actualizadoPor: AUTH.user.email });
    await firebase.firestore().collection('pes5_config').doc('reglas').set(doc);
    YC_RULES = YUNACOINS_RULES.normalizarReglas(r);
    YC_RULES_META = { actualizadoEn: doc.actualizadoEn, actualizadoPor: doc.actualizadoPor };
    showToast('Reglas guardadas.');
    renderReglasTab();
  } catch (e) {
    console.error('[pes5-tool] error guardando reglas', e);
    box.innerHTML = `<div style="color:var(--red,#f87171);font-size:12px;">No se pudo guardar: ${escHtml(e.message || String(e))}</div>`;
  }
}

/* ============================================================
   Sin arranque propio: initDB() y onAuthInit() ya corren en el arranque del
   panel (ui-utils.js / auth.js). Llamarlos aca creaba una base y un segundo
   onAuthStateChanged. La tool lee AUTH y escucha tsc:auth en montar().
   ============================================================ */

// Handlers de data-on* (events.js solo llama funciones globales, sin puntos).
// Se exponen con prefijo pt para no pisar globales del panel.
window.ptOcultarErrorEscritura = _ocultarErrorEscritura;
window.ptOcultarExitoEscritura = _ocultarExitoEscritura;
window.ptAbrirEditorJugador = abrirEditorJugador;
window.ptAplicarPedidosSeleccionados = aplicarPedidosSeleccionados;
window.ptCerrarEditorJugador = cerrarEditorJugador;
window.ptConfirmarEscribirAlSave = confirmarEscribirAlSave;
window.ptDescartarTodo = descartarTodo;
window.ptElegirCarpetaClick = elegirCarpetaClick;
window.ptGuardarReglas = guardarReglas;
window.ptHabilitarAplicarPedidos = habilitarAplicarPedidos;
window.ptOnTeamSelectPorIndice = onTeamSelectPorIndice;
window.ptPublicarPlantillaDeEquipo = publicarPlantillaDeEquipo;
window.ptPublicarPlantillas = publicarPlantillas;
window.ptRecargarSaveClick = recargarSaveClick;
window.ptRechazarPedido = rechazarPedido;
window.ptReconectarCarpetaClick = reconectarCarpetaClick;
window.ptRestaurarReglasDefault = restaurarReglasDefault;
window.ptSwitchTab = switchTab;
window.ptVincularEquipo = vincularEquipo;
// Ciclo de vida: lo llaman js/pes5-admin.js (entrar/salir de la seccion).
window.PES5_TOOL = { montar: montar, salir: salir };
})();
