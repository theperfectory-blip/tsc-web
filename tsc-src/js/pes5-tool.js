/* ============================================================
   TOOL PES5 — seccion "Tool PES5" del panel admin (slice 2.0-1).
   Antes era una pagina suelta (borrada en el slice
   5.A). Ahora la carga bajo demanda js/pes5-admin.js, despues de
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
  lista: '<svg class="icn" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  clock: '<svg class="icn" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>',
  plus: '<svg class="icn" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
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
// 3.A: modo de la tool, fijado en montar(). 'pc' si hay File System Access; 'movil' en el resto.
let _modo = 'pc';
// 3.B: pedido que tiene abierto el modal de rechazo (null = ningun modal).
let RECHAZO_ID = null;
let PLANTILLA_ACTUAL = null;    // array de leerJugadorCompleto(...) del equipo elegido
let PLANTILLA_INDICE = null;    // indice de club PES5 elegido en la pestaña Plantilla
let JUGADOR_SELECCIONADO = null; // id de registro seleccionado en el panel lateral
// Edicion gratis (admin): con la casilla marcada no se cobra al equipo del club abierto.
// Se apaga sola al cambiar de club y despues de escribir el save.
let EDICION_GRATIS = false;
let CAMBIOS_PENDIENTES = {};    // { [jugadorId]: {atributos:{},escala8:{},habilidades:{},edad,altura,pieDominante,lesiones} }
// RETRO: save ANTERIOR cargado solo como referencia para las mejoras retroactivas
// (nunca reemplaza PLANO ni dispara observadores/publicacion). null = no hay.
let PLANO_RETRO = null;
let RETRO = null;               // estado del modal «Mejoras retroactivas» (ver abrirRetro)

/* ============================================================
   Slice D.R — cobro condicional (mismas reglas que el editor del
   presidente, ver js/yunacoins-rules.js). La tool no tiene UI propia de
   edicion de reglas: usa YUNACOINS_RULES.DEFAULT_RULES tal cual.

   Punto 5 (mapeo de presupuestos, resuelto 15/09):
     - el wallet real de cada equipo es SIEMPRE `team.yunacoin` (nunca un
       numero de regla — `techoPresupuesto`/`presidentWallet` del editor no
       se usan aca, la tool ya tenia el saldo real).
     - BONO-3: el bono de suscriptores es SOLO para jugadores con «$» (suscriptor,
       `j.subscriber` de `leerJugadorCompleto` — nombre que empieza con "$"). Un
       suscriptor gasta primero el bono y, agotado, sigue con el tope general; un
       jugador sin «$» gasta solo del tope general. Ver
       YUNACOINS_RULES.distribuirCosto.
     - los topes de TEMPORADA no se guardan en `teams`: se derivan del
       libro `coins` (season actual + reason que empieza con 'mejora PES5')
       cada vez que se elige un club en la pestaña Plantilla — ver
       GASTO_TEMPORADA_CACHE / _refrescarGastoTemporadaEquipo.
   ============================================================ */
let YC_RULES = YUNACOINS_RULES.normalizarReglas(null);
let YC_RULES_META = null; // {actualizadoEn, actualizadoPor} del doc pes5_config/reglas
let YC_SEASONS = [];      // temporadas (seasons) para contar la temporada N del juego (tope de atributos)

/* Tope de atributos vigente para la temporada actual del juego (PES5-TOPE-1).
   Devuelve null si no hay temporada cargada o la lista de topes está vacía. */
function _topeAtributoVigente(){
  const info = YUNACOINS_RULES.temporadaActualDelJuego(YC_SEASONS, STATE.season);
  return info ? YUNACOINS_RULES.topeAtributo(info.ordinal, YC_RULES.topesAtributo) : null;
}

/* COBRO-1: temporada en la que se cobran las mejoras (coins, presupuesto y topes
   extra). Es la activa no archivada; si no hay, STATE.season (la UI). */
function _temporadasArchivadas(){
  return (YC_SEASONS || []).map(s => Number(s.number)).filter(n => dbIsArchivedSeason(n));
}
function _temporadaCobro(){
  return YUNACOINS_RULES.temporadaDeCobro(YC_SEASONS, STATE.season, _temporadasArchivadas());
}
function _nombreTemporadaCobro(){
  const n = _temporadaCobro();
  const s = (YC_SEASONS || []).find(x => Number(x.number) === n);
  return s ? getSeasonName(s) + ' (temporada ' + n + ')' : 'temporada ' + n;
}

/* EMP-80-2 · perfiles fijados por temporada y jugador: pes5_perfiles/{temporada}_{teamId} = { perfiles: {[registro]: 'base'|'suscriptor'|'ninguno'} }.
   Solo el admin escribe. Sin valor fijado, el perfil es el calculo en vivo (perfilEmparejar). */
let PERFILES_TOOL = null; // { [docId]: { [registro]: valor } } cargado desde Firestore; null = todavia no leido (o la lectura fallo)
function _docPerfiles(teamId, season){ return String(season) + '_' + String(teamId); }
async function _cargarPerfilesTool(){
  try {
    const snap = await firebase.firestore().collection('pes5_perfiles').get();
    const mapa = {};
    snap.forEach(d => { mapa[d.id] = (d.data() && d.data().perfiles) || {}; });
    PERFILES_TOOL = mapa;
    return mapa;
  } catch (e) {
    // Queda en null a proposito: el proximo que lo necesite reintenta la lectura.
    PERFILES_TOOL = null;
    throw e;
  }
}
function _fijadoTool(teamId, registro){
  if (!PERFILES_TOOL || teamId == null || registro == null) return null;
  const m = PERFILES_TOOL[_docPerfiles(teamId, _temporadaCobro())];
  const v = m ? m[String(registro)] : undefined;
  return v == null ? null : v;
}
// Perfil con el que se cobra un jugador del save del equipo: fijado si existe, si no el calculo en vivo.
function _perfilTool(teamId, j){
  const cfg = _emparejarCfg();
  if (!cfg || !j) return null;
  const fijado = _fijadoTool(teamId, j.id);
  if (fijado != null) return YUNACOINS_RULES.perfilParaJugador(null, cfg, fijado);
  return YUNACOINS_RULES.perfilEmparejar(j, cfg);
}
// Costo de una mejora de un jugador del save con su perfil (mismo calculo que el presidente).
function _costoTool(teamId, j, cambios){
  return YUNACOINS_RULES.costoCambios(j, cambios, YC_RULES, { perfil: _perfilTool(teamId, j), cfg: _emparejarCfg() });
}
// Calcula y guarda el perfil de los jugadores del club que todavia no lo tienen fijado para la temporada de cobro.
// No pisa los fijados. Jugadores sin perfil (fichaje, leyenda) quedan en 'ninguno'.
async function _completarPerfilesEquipo(teamId, clubIdx){
  const cfg = _emparejarCfg();
  if (!cfg || !PLANO || clubIdx == null || teamId == null) return { agregados: 0 };
  const season = _temporadaCobro();
  const id = _docPerfiles(teamId, season);
  const ref = firebase.firestore().collection('pes5_perfiles').doc(id);
  const snap = await ref.get();
  const actual = snap.exists && snap.data().perfiles ? Object.assign({}, snap.data().perfiles) : {};
  const plantel = PES5_EDITOR.leerPlantillaEquipo(PLANO, clubIdx).map(reg => PES5_EDITOR.leerJugadorCompleto(PLANO, reg));
  const nuevos = YUNACOINS_RULES.perfilesFaltantes(plantel, actual, cfg);
  const n = Object.keys(nuevos).length;
  if (n){
    const perfiles = Object.assign({}, actual, nuevos);
    await ref.set({ season: season, teamId: String(teamId), perfiles: perfiles,
      fijadoEn: firebase.firestore.FieldValue.serverTimestamp(), fijadoPor: AUTH.user ? AUTH.user.email : null }, { merge: true });
    PERFILES_TOOL = PERFILES_TOOL || {};
    PERFILES_TOOL[id] = perfiles;
  }
  return { agregados: n };
}
// EMP-80-2 (cierre): antes de aprobar un pedido o de escribir un cambio directo, si alguno de los
// jugadores tocados no tiene perfil fijado en la temporada, se fija el plantel entero del equipo.
// Se llama con el save ANTES de escribir (PLANO todavia no tiene los cambios). No pisa los fijados.
// Lanza error si no se pudo guardar: en ese caso no se escribe nada.
async function _fijarPlantelSiFalta(team, registros){
  if (!team || team.pes5ClubIdx == null || !PLANO) return { agregados: 0 };
  const lista = (registros || []).filter(r => r != null);
  if (!lista.length) return { agregados: 0 };
  if (!PERFILES_TOOL) await _cargarPerfilesTool();
  const mapa = PERFILES_TOOL[_docPerfiles(team.id, _temporadaCobro())] || {};
  if (!lista.some(r => mapa[String(r)] == null)) return { agregados: 0 };
  return _completarPerfilesEquipo(team.id, team.pes5ClubIdx);
}
// Boton «Fijar perfiles de la temporada» (plantilla del club abierto).
async function ptFijarPerfiles(){
  const team = equipoTSCActual();
  if (!team){ showToast('El club no está vinculado a un equipo TSC.', 'error'); return; }
  try {
    const r = await _completarPerfilesEquipo(team.id, team.pes5ClubIdx);
    showToast(r.agregados ? `Perfiles fijados: ${r.agregados} jugador(es) nuevos.` : 'Todos los jugadores ya tenían perfil fijado.');
    renderPlantillaBody();
  } catch (e) {
    console.error('[pes5-tool] fijar perfiles', e);
    showToast('No se pudieron fijar los perfiles: ' + (e.message || e), 'error');
  }
}
// Override del admin: cambia el perfil fijado de un jugador (base | suscriptor | ninguno).
async function ptPerfilOverride(registro, el){
  const team = equipoTSCActual();
  const valor = el ? el.value : '';
  if (!team || !YUNACOINS_RULES.PERFIL_FIJADO_VALORES.includes(valor)) return;
  const season = _temporadaCobro();
  const id = _docPerfiles(team.id, season);
  try {
    await firebase.firestore().collection('pes5_perfiles').doc(id).set({ season: season, teamId: String(team.id),
      perfiles: { [String(registro)]: valor }, fijadoEn: firebase.firestore.FieldValue.serverTimestamp(),
      fijadoPor: AUTH.user ? AUTH.user.email : null }, { merge: true });
    PERFILES_TOOL = PERFILES_TOOL || {};
    PERFILES_TOOL[id] = Object.assign({}, PERFILES_TOOL[id] || {}, { [String(registro)]: valor });
    showToast('Perfil de emparejar de la temporada: ' + valor);
    cerrarEditorJugador();
    renderPlantillaBody();
  } catch (e) {
    console.error('[pes5-tool] override perfil', e);
    showToast('No se pudo guardar el perfil: ' + (e.message || e), 'error');
  }
}
// Select del editor del jugador: perfil fijado para la temporada (o «sin fijar» si no hay).
// Si la lectura de los perfiles todavia no llego o fallo (PERFILES_TOOL null), NO se
// muestra «sin fijar»: un desplegable «no se pudo leer», deshabilitado, para que no se
// guarde un perfil encima sin saber el que habia.
function _selectPerfilHTML(registro){
  if (!_emparejarCfg()) return '';
  const team = equipoTSCActual();
  if (!team) return '';
  if (!PERFILES_TOOL){
    return `<select class="pt-ed-perfil" disabled title="No se pudieron leer los perfiles fijados de la temporada: se reintenta al volver a abrir el jugador">
      <option>Perfil: no se pudo leer</option></select>`;
  }
  const fijado = _fijadoTool(team.id, registro);
  const opt = (v, t) => `<option value="${v}"${fijado === v ? ' selected' : ''}>${t}</option>`;
  return `<select class="pt-ed-perfil" data-onchange="ptPerfilOverride(${Number(registro)}, this)" title="Perfil de emparejar fijado para la temporada: corrige el cobro gratis">
    ${fijado == null ? '<option value="">Perfil: sin fijar</option>' : ''}${opt('base', 'Perfil: Base')}${opt('suscriptor', 'Perfil: Suscriptor')}${opt('ninguno', 'Perfil: ninguno')}</select>`;
}

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

// Tope extra por equipo de la temporada actual (premio del admin): {teamId: {extra, motivo}}.
let YC_TOPES_EXTRA = {};
let YC_TOPES_EXTRA_META = null;
function _docTopesExtra(){
  return firebase.firestore().collection('pes5_config').doc('topesExtra-' + _temporadaCobro());
}
async function cargarTopesExtra(){
  YC_TOPES_EXTRA = {}; YC_TOPES_EXTRA_META = null;
  if (STATE.season == null) return;
  try {
    const snap = await _docTopesExtra().get();
    const data = snap.exists ? snap.data() : null;
    YC_TOPES_EXTRA = YUNACOINS_RULES.normalizarTopesExtra(data);
    YC_TOPES_EXTRA_META = data ? { actualizadoEn: data.actualizadoEn || null, actualizadoPor: data.actualizadoPor || null } : null;
  } catch (e) {
    console.warn('[pes5-tool] no se pudieron leer los topes extra:', e);
  }
}
// Reglas con el tope general de ESE equipo (general + su extra de la temporada).
function _reglasEquipo(teamId){
  return YUNACOINS_RULES.reglasConExtra(YC_RULES, YUNACOINS_RULES.extraDeEquipo(YC_TOPES_EXTRA, teamId));
}

// Cache de lo ya gastado esta temporada por el equipo cuyo plantel esta
// abierto ahora mismo (derivado del libro `coins`, punto 5c del macro-slice
// — no se persiste nada nuevo en `teams`). Se recalcula cada vez que cambia
// el club elegido (onTeamSelect) y se fuerza de nuevo justo antes de cobrar
// de verdad (confirmarEscribirAlSave) para no confiar en una foto vieja si
// otra sesion ya gasto presupuesto de este equipo mientras tanto.
let GASTO_TEMPORADA_CACHE = { teamId: null, season: null, general: 0, sub: 0, transacciones: [] };

async function _refrescarGastoTemporadaEquipo(team, forzar){
  if (!team){ GASTO_TEMPORADA_CACHE = { teamId: null, season: null, general: 0, sub: 0, transacciones: [] }; return; }
  const temp = _temporadaCobro();
  if (!forzar && GASTO_TEMPORADA_CACHE.teamId === team.id && GASTO_TEMPORADA_CACHE.season === temp) return;
  const transacciones = await dbGetAll('coins', c =>
    String(c.teamId) === String(team.id) && c.season === temp &&
    typeof c.reason === 'string' && c.reason.indexOf('mejora PES5') === 0);
  const gastado = YUNACOINS_RULES.gastoTemporada(transacciones);
  // BONO-5: se guarda tambien el libro (por jugador) para calcular el bono restante de CADA «$».
  GASTO_TEMPORADA_CACHE = { teamId: team.id, season: temp, general: gastado.general, sub: gastado.sub, transacciones: transacciones };
}
// BONO-5: bono que le queda a UN jugador del plantel abierto (su cuota de la temporada menos
// lo que ya consumió de su bono en el libro `coins`). 0 si no tiene «$». Si el cache es de
// otro equipo, se usa el libro vacío (bono completo) en vez de mezclar equipos.
function _bonoRestanteJugadorTool(registro, esSuscriptor, teamId){
  if (!esSuscriptor || registro == null) return 0;
  const cachePropio = teamId == null || String(GASTO_TEMPORADA_CACHE.teamId) === String(teamId);
  const cuota = (_reglasEquipo(teamId != null ? teamId : GASTO_TEMPORADA_CACHE.teamId) || YC_RULES).budgetSubscribers;
  return YUNACOINS_RULES.bonoRestanteJugador(
    cachePropio ? (GASTO_TEMPORADA_CACHE.transacciones || []) : [], [], registro, cuota, true);
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
// Se cobra al EQUIPO (saldo teams.yunacoin + libro `coins`) siempre que haya un
// equipo TSC vinculado al club y el admin no marcó «Edición gratis»; tener
// presidente o no ya no cambia el cobro. Solo un club PES5 sin equipo TSC
// vinculado queda en edición libre.
function _cobraEquipo(team){
  return !!(team && !EDICION_GRATIS);
}
function tienePresidente(team){
  return !!(team && PRESIDENTES_POR_TEAM[team.id]);
}
// Cuanto queda del tope general/bono de temporada AHORA MISMO (regla menos
// lo ya gastado, cache de GASTO_TEMPORADA_CACHE — ver _refrescarGastoTemporadaEquipo).
function _restantesTemporada(){
  return YUNACOINS_RULES.topesRestantes(
    { general: GASTO_TEMPORADA_CACHE.general, sub: GASTO_TEMPORADA_CACHE.sub }, _reglasEquipo(GASTO_TEMPORADA_CACHE.teamId),
    _nSuscriptoresDelEquipo(GASTO_TEMPORADA_CACHE.teamId));
}
// BONO-1: suscriptores del equipo en el save abierto (jugador con «$» delante del nombre, el mismo
// criterio que jugadorParaEditor → subscriber). El bono del equipo = regla por jugador × este numero.
function _nSuscriptoresDelEquipo(teamId){
  const team = teamId != null ? EQUIPOS_TSC.find(t => String(t.id) === String(teamId)) : null;
  if (!team || team.pes5ClubIdx == null || !PLANO) return 0;
  return PES5_EDITOR.leerPlantillaEquipo(PLANO, team.pes5ClubIdx)
    .filter(id => PES5_EDITOR.nombreDeRegistro(PLANO, id).startsWith('$')).length;
}
// Reparte TODOS los cambios pendientes del plantel abierto entre bono de CADA jugador y
// tope general (BONO-5). El bono es diferencial por jugador: cada «$» gasta primero SU
// propio bono restante (su cuota menos lo que ya gastó de su bono esta temporada) y,
// agotado, el resto va al general; un jugador sin «$» va entero al general. Lo que gasta
// un suscriptor no le quita bono a otro. Si el mismo jugador tiene varios pedidos en el
// lote, se descuenta lo ya asignado a su bono en los anteriores. Devuelve
// {totalCosto, fromGeneral, fromSub, porJugador:{[id]:{playerId,playerName,
// subscriber,total,lineas,fromGeneral,fromSub}}}.
function repartoPendienteEquipo(){
  let totalGeneral = 0, totalSub = 0, totalCosto = 0;
  const usadoSubPorJugador = {};
  const porJugador = {};
  (PLANTILLA_ACTUAL || []).forEach(j => {
    if (!CAMBIOS_PENDIENTES[j.id]) return;
    const { total, lineas } = _costoTool((equipoTSCActual() || {}).id, j, CAMBIOS_PENDIENTES[j.id]);
    if (total <= 0) return;
    const disponibleSub = Math.max(0, _bonoRestanteJugadorTool(j.id, j.subscriber, (equipoTSCActual() || {}).id) - (usadoSubPorJugador[j.id] || 0));
    const reparto = YUNACOINS_RULES.distribuirCosto(total, disponibleSub, !!j.subscriber);
    usadoSubPorJugador[j.id] = (usadoSubPorJugador[j.id] || 0) + reparto.fromSub;
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
  return _costoTool((equipoTSCActual() || {}).id, j, CAMBIOS_PENDIENTES[j.id] || {});
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
  // 4.B: sin sobregiro silencioso. Si el saldo no alcanza para el reparto completo,
  // se lanza ANTES de escribir nada de este equipo (el pedido queda pendiente).
  const totalCobro = Object.values(reparto.porJugador).reduce((s, i) => s + (i && i.total > 0 ? i.total : 0), 0);
  YUNACOINS_RULES.cobroSinSobregiro(team.yunacoin || 0, totalCobro);
  let current = team.yunacoin || 0;
  for (const id of Object.keys(reparto.porJugador)){
    const info = reparto.porJugador[id];
    if (!info || info.total <= 0) continue;
    const newTotal = current - info.total;
    // `info.nota` (opcional) la arma quien llama, p. ej. «Retroactiva: …» para
    // las mejoras ya hechas. Sin ella, el resumen de siempre.
    const nota = info.nota != null ? String(info.nota) : _resumenLineas(info.lineas);
    await dbAdd('coins', {
      teamId: team.id, teamName: team.name, mode: 'sub', amount: info.total,
      reason, note: nota,
      before: current, after: newTotal, season: _temporadaCobro(), date: new Date().toISOString(),
      streamlabs: YUNACOINS_RULES.marcaStreamlabsInicial(team),
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
  // lo recien cobrado ya cuenta para los topes de temporada de este equipo.
  // BONO-5: tambien entra al libro en memoria, para que el bono restante por jugador
  // (repartoPendienteEquipo / _opcionesEditor) quede al dia sin releer Firestore.
  if (!Array.isArray(GASTO_TEMPORADA_CACHE.transacciones)) GASTO_TEMPORADA_CACHE.transacciones = [];
  Object.values(reparto.porJugador).forEach(function(info){
    if (!info || !(info.total > 0)) return;
    GASTO_TEMPORADA_CACHE.transacciones.push({
      reason: reason, mode: 'sub', amount: info.total,
      pes5: { playerId: info.playerId, fromSub: info.fromSub, fromGeneral: info.fromGeneral },
    });
  });
  GASTO_TEMPORADA_CACHE = {
    teamId: team.id, season: _temporadaCobro(),
    general: GASTO_TEMPORADA_CACHE.general + reparto.fromGeneral,
    sub: GASTO_TEMPORADA_CACHE.sub + reparto.fromSub,
    transacciones: GASTO_TEMPORADA_CACHE.transacciones,
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
  <div id="pt-pausa"></div>
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

/* 3.A — modo de la tool. 'pc' si PES5_SAVE.tieneSoporte() (puede leer y escribir el
   save); 'movil' en cualquier otro caso: telefono, APK, Firefox, Safari y Brave con el
   flag apagado. Se decide por capacidad, no por ancho ni por userAgent. El ancho solo
   cambia el layout (CSS). Se fija una vez por montaje. */
function ptModo(){ return _modo; }
// Pestañas de cada modo. Slice 4 suma YunaCoins a los dos modos.
const TABS_MOVIL = ['pedidos', 'yunacoins', 'reglas'];
function tabsDelModo(){
  return _modo === 'movil' ? TABS.filter(t => TABS_MOVIL.includes(t.id)) : TABS;
}

function montar(contenedor){
  if (!contenedor) return;
  _montadoEn = contenedor;
  _modo = PES5_SAVE.tieneSoporte() ? 'pc' : 'movil';
  if (!contenedor.querySelector('#pt-app')) contenedor.innerHTML = SHELL_HTML;
  window.removeEventListener('tsc:auth', _alCambiarAuth);
  window.addEventListener('tsc:auth', _alCambiarAuth);
  render();
}

function salir(){
  _montadoEn = null;
  cerrarDetallePedido();
  document.getElementById('pt-rech-ov')?.remove();
  RECHAZO_ID = null;
  cerrarRetro();
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
    cerrarRetro();
    gate.innerHTML = `<div class="gate">${ICN.lock}<div>Inicia sesión como admin para usar la Tool PES5.</div></div>`;
    app.style.display = 'none';
    return;
  }
  if (AUTH.role !== 'admin'){
    cerrarRetro();
    gate.innerHTML = `<div class="gate">${ICN.lock}<div>Esta página es solo para el admin.</div></div>`;
    app.style.display = 'none';
    return;
  }
  gate.innerHTML = '';
  app.style.display = '';
  cargarPausaTool();
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
  try { YC_SEASONS = await dbGetAll('seasons'); } catch(e) { console.warn('[pes5-tool] no se pudieron leer las temporadas', e); YC_SEASONS = []; }
  await cargarTopesExtra();
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
/* Mismo chequeo que js/boot-splash.js: APK (Capacitor) o puntero tactil. Solo cambia el
   texto del aviso de la barra de estado; el modo lo decide PES5_SAVE.tieneSoporte(). */
function _esTactilOApk(){
  try {
    if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) return true;
  } catch (e) { /* sin Capacitor */ }
  return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
}

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
    // 3.A: en el telefono o la APK el aviso largo no corresponde: solo se dice que modo es.
    if (_esTactilOApk()){
      el.innerHTML = `
        <div class="pt-statusbar">
          <div class="pt-status-item"><span class="pt-dot off"></span> Modo móvil: pedidos y reglas. Para leer o escribir el save, abre esta sección en Chrome o Edge en la PC.</div>
        </div>`;
      return;
    }
    el.innerHTML = `
      <div class="pt-statusbar">
        <div class="pt-status-item"><span class="pt-dot warn"></span> Este navegador no da acceso directo a carpetas (Chrome/Edge sí, Firefox/Safari no). Si usas <b>Brave</b>, suele venir desactivado: actívalo en <code>brave://flags/#file-system-access-api</code> (Enabled), reinicia el navegador y vuelve a entrar. Sin eso no se puede leer ni escribir el save.</div>
        <div class="pt-status-item" style="font-size:12px;">Mientras tanto funciona el modo móvil: pedidos y reglas.</div>
      </div>`;
    return;
  }

  if (!carpeta){
    el.innerHTML = `
      <div class="pt-statusbar">
        <div class="pt-status-item"><span class="pt-dot off"></span> Sin carpeta elegida — sugerido: <code>Documents\\KONAMI\\Pro Evolution Soccer 5\\save\\folder1</code></div>
        <div class="pt-status-item pt-status-note">Si el diálogo no aparece (Brave con el flag apagado, o el navegador de la app), abre esto en <b>Chrome o Edge</b>.</div>
        <div class="pt-status-actions">
          <button class="btn btn-sm btn-primary" data-onclick="ptElegirCarpetaClick()">${ICN.folder} Elegir carpeta del juego</button>
        </div>
      </div>`;
    return;
  }

  const meta = SAVE_META;
  const fecha = meta ? new Date(meta.lastModified).toLocaleString('es-AR') : '—';
  const pend = PLANTILLAS_DESACTUALIZADAS || [];
  const aviso = pend.length
    ? `<div class="pt-statusbar">
        <div class="pt-status-item"><span class="badge badge-warn">${ICN.alert} ${pend.length} ${pend.length === 1 ? 'plantilla desactualizada' : 'plantillas desactualizadas'}: el presidente ve datos viejos. Usa «Publicar save» para publicarlas.</span></div>
      </div>`
    : '';
  el.innerHTML = `
    <div class="pt-statusbar">
      <div class="pt-status-item">${ICN.folder} <b>${escHtml(carpeta)}</b></div>
      <div class="pt-status-sep"></div>
      <div class="pt-status-item">${ICN.file} ${meta ? `<b>${escHtml(meta.nombre)}</b> · ${meta.tamaño.toLocaleString('es-AR')} b · ${escHtml(fecha)}` : 'sin leer todavía'}</div>
      <div class="pt-status-actions">
        <button class="btn btn-sm" data-onclick="ptActualizarSaveClick()">${ICN.refresh} Actualizar save</button>
      </div>
    </div>${aviso}`;
}

/* Aviso de plantillas desactualizadas (2.0-4). Compara cada pes5_plantillas con el save abierto
   (saveHash y pes5ClubIdx). Solo AVISA: publicar lo decide el admin con el boton, nunca solo,
   porque el save puede estar a mitad de edicion. */
let PLANTILLAS_DESACTUALIZADAS = null;
async function revisarPlantillasDesactualizadas(){
  PLANTILLAS_DESACTUALIZADAS = null;
  if (PLANO){
    const equipos = EQUIPOS_TSC.filter(t => t.status !== 'INACTIVO' && t.pes5ClubIdx != null);
    try {
      if (equipos.length){
        const publicadas = {};
        const snap = await firebase.firestore().collection('pes5_plantillas').get();
        snap.forEach(d => { publicadas[d.id] = d.data(); });
        const hashes = {};
        for (const t of equipos){ if (publicadas[t.id]) hashes[t.id] = await _teamHashDe(t); }
        PLANTILLAS_DESACTUALIZADAS = PES5_PLANTILLA.desactualizadas(equipos, publicadas, hashes);
      }
    } catch (e){
      console.error('[pes5-tool] plantillas desactualizadas', e);
    }
  }
  if (document.getElementById('pt-statusbar')) renderStatusBar();
}

async function elegirCarpetaClick(){
  try {
    const r = await PES5_SAVE.elegirCarpeta();
    if (!r.ok){
      if (r.motivo === 'timeout') showToast('El diálogo de carpeta no se abrió. Prueba en Chrome o Edge.', 'error');
      return; // el admin cancelo el picker (o no se abrio)
    }
    await cargarSaveDesdeCarpeta();
    renderStatusBar();
    showToast('Carpeta elegida: ' + r.nombre);
  } catch(e) { showToast('Error: ' + (e.message||e), 'error'); }
}
/* SYNC-1 · «Actualizar save» (reemplaza Reconectar + Recargar). Si el permiso de la carpeta sigue
   vigente, recarga; si no, pide el permiso (recuperarCarpeta) y despues recarga. */
async function actualizarSaveClick(){
  try {
    if (!(await PES5_SAVE.permisoVigente())){
      const r = await PES5_SAVE.recuperarCarpeta();
      if (!r || !r.ok){ showToast('No se pudo reconectar — elige la carpeta de nuevo.', 'error'); return; }
    }
    await cargarSaveDesdeCarpeta();
    renderStatusBar();
    await releerPlantillaAbierta();
    if (TAB === 'equipos') renderEquiposTab();
    showToast('Save recargado');
  } catch(e) { showToast('Error: ' + (e.message||e), 'error'); }
}
/* ORD-1: el orden del plantel es el del save (bloque 5: slot 0 = arquero, 1-10 titulares...).
   Cada vez que cambia PLANO (recarga o cambio hecho en el juego) hay que releer el club abierto,
   estés en la pestaña Plantilla o no. Antes solo se releía con TAB === 'plantilla', y al volver a
   la pestaña se pintaba la copia vieja del orden. */
async function releerPlantillaAbierta(){
  if (PLANTILLA_INDICE == null || !PLANO) return;
  if (TAB === 'plantilla') { await onTeamSelect(PLANTILLA_INDICE); return; }
  PLANTILLA_ACTUAL = PES5_EDITOR.leerPlantillaCompleta(PLANO, PLANTILLA_INDICE);
}
async function cargarSaveDesdeCarpeta(){
  // Si el modal de mejoras retroactivas estaba abierto, sus filas quedan viejas
  // cuando cambia PLANO: se cierra (el save anterior se vuelve a elegir).
  if (document.getElementById('pt-retro-ov')) cerrarRetro();
  const leido = await PES5_SAVE.leer();
  SAVE_META = { nombre: leido.nombre, tamaño: leido.tamaño, lastModified: leido.lastModified };
  renderPausaTool(); // SAVE-1: el boton «Publicar save» se habilita al tener un save abierto
  PLANO = PES5_CRYPT.descifrar(leido.bytes);
  recalcularClubesDelSave();
  await migrarPes5ClubIdx();
  iniciarObservador();
  await revisarPlantillasDesactualizadas();
  return leido;   // SYNC-1: Publicar save usa estos bytes (los mismos que quedaron en PLANO)
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
    await releerPlantillaAbierta();
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
  { id: 'yunacoins', label: 'YunaCoins', icon: ICN.refresh },
  { id: 'reglas', label: 'Reglas', icon: ICN.wallet },
];
function renderTabs(){
  document.getElementById('pt-tabs-bar').innerHTML = tabsDelModo().map(t =>
    `<button class="pt-tab${TAB===t.id?' active':''}" data-onclick="ptSwitchTab('${t.id}')">${t.icon}${escHtml(t.label)}</button>`
  ).join('');
}
function switchTab(id){
  // una pestaña que no existe en este modo cae en la primera disponible
  const visibles = tabsDelModo();
  if (!visibles.some(t => t.id === id)) id = visibles[0].id;
  TAB = id;
  renderTabs();
  if (id === 'equipos') renderEquiposTab();
  else if (id === 'plantilla') renderPlantillaTab();
  else if (id === 'pedidos') renderPedidosTab();
  else if (id === 'yunacoins') renderYunacoinsTab();
  else if (id === 'reglas') renderReglasTab();
}

/* ============================================================
   PESTAÑA 1 · EQUIPOS
   ============================================================ */
function renderEquiposTab(){
  const cont = document.getElementById('pt-tabcontent');
  // Slice C1.2: los clubes solo existen si hay save cargado (nunca lista fija).
  const hayClubes = !!(PLANO && CLUBES_PES5.length);

  // Slice C1.1: solo equipos activos (status !== 'INACTIVO'; si falta el campo, cuenta como activo).
  const equiposActivos = EQUIPOS_TSC.filter(t => t.status !== 'INACTIVO');
  // Club repetido (2.0-4): la logica es pura y vive en js/pes5-clubes.js (tests en tools/).
  // Un club de otro equipo activo sale deshabilitado con su dueño, «Arsenal (Malvinas Jr)».
  const opcionesDe = (t) => PES5_CLUBES.opcionesClub(CLUBES_PES5, EQUIPOS_TSC, t).map(o =>
    `<option value="${o.value}"${o.selected ? ' selected' : ''}${o.disabled ? ' disabled' : ''}>${escHtml(o.label)}</option>`
  ).join('');

  const filas = equiposActivos.map(t => {
    const pres = PRESIDENTES_POR_TEAM[t.id];
    const cupo = (PLANO && t.pes5ClubIdx != null)
      ? PES5_EDITOR.leerPlantillaEquipo(PLANO, t.pes5ClubIdx).length + '/32'
      : '—/32';
    const cupoLleno = cupo === '32/32';
    const roto = VINCULOS_ROTOS.has(t.id);
    const repetido = PES5_CLUBES.repetidoDe(t, EQUIPOS_TSC);
    const selectorHtml = hayClubes
      ? `<select data-onchange="ptVincularEquipo(${t.id}, this.value)">${opcionesDe(t)}</select>`
      : `<select disabled><option>Carga el save para ver los clubes</option></select>${
          t.pes5Club ? `<div style="font-size:11px;color:var(--txt3);margin-top:2px;">vinculado: ${escHtml(t.pes5Club)}</div>` : ''
        }`;
    return `
      <tr data-nombre="${escHtml((t.name||'').toLowerCase())}">
        <td>${t.logo ? `<img class="pt-escudo" src="${escHtml(t.logo)}" alt="">` : `<span class="pt-escudo-ph">${ICN.shirt}</span>`}</td>
        <td>${escHtml(t.name)}</td>
        <td>${pres ? escHtml(pres.displayName||pres.email) : '<span style="color:var(--txt3)">sin presidente</span>'}</td>
        <td>${selectorHtml}${roto ? ` <span class="badge badge-warn" title="El club vinculado no se encontro en el save cargado">${ICN.alert} vínculo roto: revincula</span>` : ''}${repetido ? ` <span class="pt-badge-repetido" title="Dos equipos tienen este club: corregilo a mano">${ICN.alert} club repetido con ${escHtml(repetido.name)}</span>` : ''}</td>
        <td class="pt-cupo${cupoLleno?' full':''}">${cupo}</td>
      </tr>`;
  }).join('');

  cont.innerHTML = `
    <div class="pt-toolbar">
      <input class="pt-search" id="eq-filtro" placeholder="Filtrar equipo...">
      ${!hayClubes ? `<div class="pt-status-item" style="color:var(--txt3);">${ICN.alert} Carga el save para ver los clubes</div>` : ''}
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
  // Club repetido (2.0-4): dos pestañas o dos admins pueden vincular el mismo club a la vez. Antes de
  // escribir se relee la base (no la cache); si otro equipo activo ya lo tiene, no se escribe.
  if (idx != null){
    const frescos = await dbGetAll('teams');
    const otro = PES5_CLUBES.otroEquipoConClub(frescos, idx, teamId);
    if (otro){
      showToast(`${CLUBES_PES5[idx]} ya lo tiene ${otro.name}. Elige otro club.`, 'error');
      renderEquiposTab();
      return;
    }
  }
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
    cont.innerHTML = `<div class="pt-empty">${ICN.alert}<div>Elige la carpeta del save (o sube el archivo) desde la barra de arriba para ver plantillas.</div></div>`;
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
  // EMP-80-2: leer los perfiles fijados de la temporada y repintar el cuerpo cuando lleguen.
  if (!PERFILES_TOOL){
    _cargarPerfilesTool().then(() => { if (PLANTILLA_ACTUAL) renderPlantillaBody(); }).catch(e => {
      console.warn('[pes5-tool] perfiles fijados', e);
      showToast('No se pudieron leer los perfiles fijados de la temporada: ' + (e.message || e), 'error');
    });
  }
  // Si ya habia un club abierto (volvimos a esta pestana), restaurarlo con sus cambios pendientes.
  if (PLANTILLA_INDICE != null && PLANTILLA_ACTUAL){
    // ORD-1: releer del save (no usar la copia de cuando se entró antes): el orden pudo cambiar en el juego.
    PLANTILLA_ACTUAL = PES5_EDITOR.leerPlantillaCompleta(PLANO, PLANTILLA_INDICE);
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
    if (!confirm('Hay cambios sin escribir en el club actual. Si cambias de club se descartan. ¿Descartarlos y cambiar?')){
      const sel = document.getElementById('pl-team-select');
      if (sel) sel.value = PLANTILLA_INDICE != null ? String(PLANTILLA_INDICE) : '';
      return;
    }
    CAMBIOS_PENDIENTES = {};
    liberarBloqueoEquipo();
  }
  // BLOQ-1: al cambiar de equipo, el admin suelta el bloqueo del anterior (aunque no tuviera cambios pendientes).
  if (nuevo !== PLANTILLA_INDICE && BLOQUEO_EQUIPO != null) liberarBloqueoEquipo();
  if (nuevo !== PLANTILLA_INDICE) EDICION_GRATIS = false;
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

  // EMP-80-2: boton para fijar los perfiles de emparejar de la temporada (solo si el club es de un equipo TSC).
  const _eqFijar = equipoTSCActual();
  const barraPerfiles = (_emparejarCfg() && _eqFijar)
    ? `<div class="pt-perfiles-bar"><span class="pt-perfiles-txt">Perfiles de emparejar · ${escHtml(_nombreTemporadaCobro())}</span>
        <button class="btn btn-sm" data-onclick="ptFijarPerfiles()" title="Calcula el perfil de los jugadores que todavía no lo tienen. No pisa los fijados.">Fijar perfiles de la temporada</button></div>`
    : '';
  // RETRO: mejoras hechas fuera de la web (se cobran, no se escriben en el save).
  // Visible con el club vinculado a un equipo TSC, tenga o no presidente.
  const barraRetro = _eqFijar
    ? `<div class="pt-retro-bar"><span class="pt-retro-bar-txt">¿Hiciste mejoras fuera de la web? Regístralas como cobro: no se toca el save.</span>
        <button class="btn btn-sm" data-onclick="ptAbrirRetro()">${ICN.clock} Mejoras retroactivas</button></div>`
    : '';
  el.innerHTML = barraPerfiles + barraRetro + `
    <div class="tbl-wrap pt-tbl-wrap">
      <table class="tbl pt-plantilla-table">
        <thead><tr>
          <th>#</th><th>Nombre</th><th>Pos.</th><th>Alt.</th><th>Edad</th><th>Pie</th>
          ${COLS_ATTR.map(c=>`<th>${escHtml(c)}</th>`).join('')}
        </tr></thead>
        <tbody>${filas || `<tr><td colspan="${6+COLS_ATTR.length}" style="text-align:center;color:var(--txt3);padding:20px;">Plantel vacío.</td></tr>`}</tbody>
      </table>
    </div>
    <div class="pt-hint-click">Toca un jugador para editarlo con el mismo editor que usan los presidentes.</div>`;
}

// ============================================================
// MEJORAS RETROACTIVAS (RETRO)
// Luis carga el saldo y registra como cobro las mejoras que ya hizo fuera de la
// web. El único dato automático es el diff entre un save ANTERIOR (referencia)
// y el save actual; todo lo calculado es una propuesta editable. Nunca escribe
// el save: solo llama a cobrarMejorasEquipo con reason 'mejora PES5 retroactiva'.
// ============================================================
const RETRO_PREFIJO = 'Retroactiva:';

function _retroFmt(n){ return Math.max(0, Math.round(Number(n) || 0)).toLocaleString('es-CL'); }
function _retroPerfilEtiqueta(p){ return p === 'base' ? 'Base' : p === 'suscriptor' ? 'Suscriptor' : 'ninguno'; }

// Monto efectivo de una fila: el editado por Luis o, si está vacío, el calculado.
function _retroMontoDe(f){
  if (!f) return 0;
  const v = f.monto;
  return Math.max(0, Math.round(Number(v != null && v !== '' ? v : f.costoCalculado) || 0));
}

/* Bono que le queda a cada «$» del lote AHORA (libro coins + lo ya gastado).
   Se llama después de refrescar GASTO_TEMPORADA_CACHE del equipo. */
function _retroBonoPorJugador(team){
  const out = {};
  (RETRO && RETRO.filas || []).forEach(f => {
    if (!f || !f.subscriber || f.playerId == null) return;
    out[String(f.playerId)] = _bonoRestanteJugadorTool(f.playerId, true, team.id);
  });
  return out;
}
function _retroReparto(){
  const team = equipoTSCActual();
  if (!team || !RETRO) return null;
  return YUNACOINS_RULES.repartoRetroactivo(RETRO.filas, _retroBonoPorJugador(team));
}

/* Arma las filas del diff save anterior → save actual. Los jugadores que no
   existen en el anterior (o cambiaron de nombre) quedan «sin dato», con monto 0
   para completar a mano. Las filas manuales agregadas antes se conservan. */
function _retroFilasDesdeSaveAnterior(){
  const team = equipoTSCActual();
  if (!team || !PLANO || !PLANO_RETRO || !RETRO) return;
  const manuales = (RETRO.filas || []).filter(f => f && f.manual);
  const filas = [];
  (PLANTILLA_ACTUAL || []).forEach((j, slot) => {
    const base = {
      playerId: j.id, playerName: j.nombre, subscriber: !!j.subscriber, perfil: 'ninguno',
      resumen: '(sin cambios)', nota: '', marcada: false, conCambios: false, sinDato: false,
      manual: false, costoCalculado: 0, monto: 0, lineas: [],
    };
    let oldEd, curEd, oldJ;
    try {
      oldEd = PES5_PLANTILLA.jugadorParaEditor(PES5_EDITOR, PLANO_RETRO, j.id, slot);
      curEd = PES5_PLANTILLA.jugadorParaEditor(PES5_EDITOR, PLANO, j.id, slot);
      oldJ = PES5_EDITOR.leerJugadorCompleto(PLANO_RETRO, j.id);
    } catch (e) {
      filas.push(Object.assign({}, base, { sinDato: true, resumen: 'sin dato: no se pudo leer en el save anterior' }));
      return;
    }
    const nombreViejo = oldEd && oldEd.name ? String(oldEd.name).trim().toLowerCase() : '';
    const nombreAhora = curEd && curEd.name ? String(curEd.name).trim().toLowerCase() : '';
    if (!oldJ || !nombreViejo || !nombreAhora || nombreViejo !== nombreAhora) {
      filas.push(Object.assign({}, base, { sinDato: true, resumen: 'sin dato: el jugador no coincide con el save anterior' }));
      return;
    }
    const cambios = PES5_PLANTILLA.cambiosDesdeEditor(oldEd, curEd);
    // El costo se calcula sobre el jugador VIEJO: costoCambios usa sus valores
    // como «de» y el perfil fijado del registro para la temporada de cobro.
    const { total, lineas } = _costoTool(team.id, oldJ, cambios);
    const perfil = _perfilTool(team.id, oldJ) || 'ninguno';
    const conCambios = Object.keys(cambios).length > 0;
    const cobrable = perfil !== 'ninguno' && total > 0;
    filas.push(Object.assign({}, base, {
      perfil: perfil,
      resumen: conCambios ? _resumenLineas(lineas) : '(sin cambios)',
      costoCalculado: total,
      monto: cobrable ? total : 0,
      marcada: cobrable,
      lineas: lineas,
      conCambios: conCambios,
    }));
  });
  RETRO.filas = filas.concat(manuales);
}

function _retroVisibles(){
  if (!RETRO) return [];
  return RETRO.filas.map((f, i) => ({ f: f, i: i })).filter(x => {
    const f = x.f;
    return RETRO.verTodos || f.manual || f.sinDato || f.conCambios || _retroMontoDe(f) > 0;
  });
}

function _retroFilaHTML(f, i){
  const chip = `<span class="pt-retro-chip ${f.perfil === 'suscriptor' ? 'sub' : f.perfil === 'base' ? 'base' : 'ninguno'}">${escHtml(_retroPerfilEtiqueta(f.perfil))}</span>`;
  const sinDato = f.sinDato ? '<span class="pt-retro-chip warn">sin dato</span>' : '';
  const manual = f.manual ? '<span class="pt-retro-chip manual">manual</span>' : '';
  const calc = _retroFmt(f.costoCalculado);
  const monto = _retroMontoDe(f);
  return `<div class="pt-retro-row${f.marcada ? ' on' : ''}">
    <label class="pt-retro-check" title="Incluir en el cobro">
      <input type="checkbox" ${f.marcada ? 'checked' : ''} data-onchange="ptRetroMarcar(${i}, this)">
    </label>
    <div class="pt-retro-main">
      <div class="pt-retro-nombre">${escHtml(f.playerName)} ${chip}${sinDato}${manual}</div>
      <div class="pt-retro-resumen">${escHtml(f.resumen || '')}</div>
      <label class="pt-retro-campo pt-retro-nota"><span>Nota</span>
        <input type="text" maxlength="120" placeholder="Opcional: lo que se hizo" value="${escAttr(f.nota || '')}" data-oninput="ptRetroNota(${i}, this)"></label>
    </div>
    <div class="pt-retro-cifras">
      <div class="pt-retro-calc">Calculado <b>${calc}</b></div>
      <label class="pt-retro-campo"><span>A cobrar</span>
        <input type="number" min="0" step="50" inputmode="numeric" value="${monto > 0 ? String(monto) : ''}" data-oninput="ptRetroMonto(${i}, this)"></label>
    </div>
    <div class="pt-retro-fila-acc">${f.manual ? `<button type="button" class="pt-retro-quitar" data-onclick="ptRetroQuitar(${i})" title="Quitar línea" aria-label="Quitar línea">${ICN.x}</button>` : ''}</div>
  </div>`;
}

function _retroPintarLista(){
  const el = document.getElementById('pt-retro-lista-wrap');
  if (!el || !RETRO) return;
  const vis = _retroVisibles();
  const ocultas = RETRO.filas.length - vis.length;
  let verTodos = '';
  if (RETRO.verTodos) verTodos = '<button type="button" class="btn btn-sm" data-onclick="ptRetroVerTodos()">Ver solo con cambios</button>';
  else if (ocultas > 0) verTodos = `<button type="button" class="btn btn-sm" data-onclick="ptRetroVerTodos()">Ver todos (${ocultas})</button>`;
  const filas = vis.length
    ? vis.map(x => _retroFilaHTML(x.f, x.i)).join('')
    : '<div class="pt-retro-vacio">No hay filas con cambios. Puedes agregar una línea manual arriba.</div>';
  el.innerHTML = `<div class="pt-retro-lista-hd"><span>${vis.length} fila(s) visible(s)</span>${verTodos}</div>
    <div class="pt-retro-lista">${filas}</div>`;
}

function _retroPintarAviso(){
  const el = document.getElementById('pt-retro-aviso');
  if (!el || !RETRO) return;
  const partes = [];
  partes.push(RETRO.nombreRetro
    ? `<div class="pt-retro-ok">${ICN.file} Save anterior: <b>${escHtml(RETRO.nombreRetro)}</b></div>`
    : `<div class="pt-retro-info">${ICN.file} Carga un save anterior para calcular las mejoras hechas. Sin él, solo puedes agregar líneas manuales.</div>`);
  if (RETRO.prev && RETRO.prev.n > 0){
    partes.push(`<div class="pt-retro-warn">${ICN.alert} Este equipo ya tiene ${RETRO.prev.n} movimiento(s) «mejora PES5 retroactiva» en ${escHtml(_nombreTemporadaCobro())} por ${_retroFmt(RETRO.prev.total)} YC. Revisa no registrarlos dos veces.</div>`);
  }
  el.innerHTML = partes.join('');
}

function _retroPintarResumen(){
  const el = document.getElementById('pt-retro-resumen');
  const ok = document.getElementById('pt-retro-ok');
  if (!el || !RETRO) return;
  const team = equipoTSCActual();
  const reparto = _retroReparto();
  if (!team || !reparto){ el.innerHTML = ''; if (ok) ok.disabled = true; return; }
  const saldo = Number(team.yunacoin) || 0;
  const restantes = _restantesTemporada();
  const ev = YUNACOINS_RULES.evaluarPago(saldo, reparto.totalCosto, reparto.fromGeneral, restantes.general);
  const despues = saldo - reparto.totalCosto;
  const jugadores = Object.keys(reparto.porJugador).map(id => {
    const p = reparto.porJugador[id];
    return `<div class="pt-retro-res-jug"><span>${escHtml(p.playerName)}${p.subscriber ? ' ($)' : ''}</span>
      <span>Bono ${_retroFmt(p.fromSub)} · General ${_retroFmt(p.fromGeneral)} · Total ${_retroFmt(p.total)}</span></div>`;
  }).join('');
  const avisos = [];
  if (ev.excedeSaldo) avisos.push(`<div class="pt-retro-err">${ICN.alert} El saldo no alcanza: carga YunaCoins al equipo en Admin → YunaCoins.</div>`);
  if (ev.excedeTopeGeneral) avisos.push(`<div class="pt-retro-warn">${ICN.alert} El total general (${_retroFmt(reparto.fromGeneral)}) supera el tope general restante (${_retroFmt(restantes.general)}). Se permite: son mejoras ya hechas.</div>`);
  el.innerHTML = `
    <div class="pt-retro-res-line"><span>Total a cobrar</span><b>${_retroFmt(reparto.totalCosto)} YC</b></div>
    <div class="pt-retro-res-line"><span>Reparto bono / general</span><b>${_retroFmt(reparto.fromSub)} / ${_retroFmt(reparto.fromGeneral)}</b></div>
    <div class="pt-retro-res-line"><span>Saldo de ${escHtml(team.name)}</span><b>${_retroFmt(saldo)} → ${_retroFmt(despues)}</b></div>
    <div class="pt-retro-res-line"><span>Tope general restante</span><b>${_retroFmt(restantes.general)}</b></div>
    ${jugadores ? `<div class="pt-retro-res-jugs">${jugadores}</div>` : ''}
    ${avisos.join('')}`;
  if (ok) ok.disabled = ev.excedeSaldo || !(reparto.totalCosto > 0);
}

function _retroModalHTML(){
  const team = equipoTSCActual();
  const opciones = (PLANTILLA_ACTUAL || []).map(j =>
    `<option value="${j.id}">${escHtml(j.nombre)}${j.subscriber ? ' ($)' : ''}</option>`).join('');
  return `
    <div class="pt-retro-box" role="dialog" aria-modal="true" aria-labelledby="pt-retro-tit">
      <div class="pt-retro-hd">
        <div>
          <h3 id="pt-retro-tit">Mejoras retroactivas</h3>
          <div class="pt-retro-sub">${escHtml(team ? team.name : '')} · ${escHtml(_nombreTemporadaCobro())} · se cobran; el save no se toca</div>
        </div>
        <button type="button" class="pt-ed-close" data-onclick="ptCerrarRetro()" title="Cerrar" aria-label="Cerrar">${ICN.x}</button>
      </div>
      <div class="pt-retro-body">
        <div id="pt-retro-aviso"></div>
        <div class="pt-retro-bloque">
          <div class="pt-retro-bloque-t">1 · Save anterior (referencia)</div>
          <div class="pt-retro-fila-acciones">
            <input type="file" id="retro-file" class="pt-retro-file" data-onchange="ptRetroSaveAnterior(this)">
            <button type="button" class="btn btn-sm" data-onclick="ptRetroCargarAnterior()">${ICN.upload} Cargar save anterior</button>
            <span class="pt-retro-hint">Solo se lee: no reemplaza el save abierto ni dispara publicación.</span>
          </div>
        </div>
        <div class="pt-retro-bloque">
          <div class="pt-retro-bloque-t">2 · Agregar línea manual</div>
          <div class="pt-retro-manual">
            <label class="pt-retro-campo"><span>Jugador</span><select id="retro-manual-jugador">${opciones}</select></label>
            <label class="pt-retro-campo"><span>Monto (YC)</span><input type="number" id="retro-manual-monto" min="0" step="50" inputmode="numeric" placeholder="0"></label>
            <label class="pt-retro-campo pt-retro-manual-nota"><span>Nota</span><input type="text" id="retro-manual-nota" maxlength="120" placeholder="Ej: subida hecha a mano en el juego"></label>
            <button type="button" class="btn btn-sm" data-onclick="ptRetroAgregarManual()">${ICN.plus} Agregar</button>
          </div>
        </div>
        <div id="pt-retro-lista-wrap"></div>
        <div class="pt-retro-resumen" id="pt-retro-resumen"></div>
      </div>
      <div class="pt-retro-foot">
        <button type="button" class="btn btn-sm" data-onclick="ptCerrarRetro()">Cancelar</button>
        <button type="button" class="btn btn-primary btn-sm" id="pt-retro-ok" disabled data-onclick="ptRetroConfirmar()">Registrar cobro</button>
      </div>
    </div>`;
}

async function abrirRetro(){
  const team = equipoTSCActual();
  if (!team || !PLANO){ showToast('Elige un club vinculado a un equipo TSC para cobrar mejoras retroactivas.', 'error'); return; }
  if (document.getElementById('pt-retro-ov')) return;
  if (!PERFILES_TOOL && _emparejarCfg()){
    try { await _cargarPerfilesTool(); }
    catch (e) { console.warn('[pes5-tool] retro: perfiles fijados', e); }
  }
  try { await _refrescarGastoTemporadaEquipo(team, true); }
  catch (e) { console.warn('[pes5-tool] retro: gasto de la temporada', e); }
  let prev = { n: 0, total: 0 };
  try {
    const temp = _temporadaCobro();
    const movs = await dbGetAll('coins', c => String(c.teamId) === String(team.id)
      && Number(c.season) === Number(temp) && c.reason === 'mejora PES5 retroactiva');
    prev = { n: movs.length, total: movs.reduce((s, m) => s + (Number(m.amount) || 0), 0) };
  } catch (e) { console.warn('[pes5-tool] retro: movimientos previos', e); }
  RETRO = { teamId: team.id, filas: [], verTodos: false, nombreRetro: null, prev: prev, seq: 0 };
  PLANO_RETRO = null;
  const previo = document.getElementById('pt-retro-ov');
  if (previo) previo.remove();
  const ov = document.createElement('div');
  ov.id = 'pt-retro-ov';
  ov.className = 'pt-retro-ov';
  ov.setAttribute('data-onclick', 'ptCerrarRetroFondo(event)');
  ov.innerHTML = _retroModalHTML();
  (_montadoEn || document.body).appendChild(ov);
  document.addEventListener('keydown', _retroEsc);
  _retroPintarAviso();
  _retroPintarLista();
  _retroPintarResumen();
}
function _retroEsc(e){
  if (e && e.key === 'Escape'){ e.preventDefault(); cerrarRetro(); }
}
function cerrarRetroFondo(e){
  if (e && e.target && e.target.id === 'pt-retro-ov') cerrarRetro();
}
function cerrarRetro(){
  document.getElementById('pt-retro-ov')?.remove();
  document.removeEventListener('keydown', _retroEsc);
  RETRO = null;
  PLANO_RETRO = null;
}
function retroCargarAnterior(){
  const input = document.getElementById('retro-file');
  if (input) input.click();
}
async function retroLeerSaveAnterior(input){
  const file = input && input.files && input.files[0];
  if (!file || !RETRO) return;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    PLANO_RETRO = PES5_CRYPT.descifrar(bytes);
    RETRO.nombreRetro = file.name;
    _retroFilasDesdeSaveAnterior();
    _retroPintarAviso();
    _retroPintarLista();
    _retroPintarResumen();
    showToast('Save anterior cargado: ' + file.name);
  } catch (e) {
    PLANO_RETRO = null;
    RETRO.nombreRetro = null;
    console.error('[pes5-tool] retro: leer save anterior', e);
    showToast('No se pudo leer el save anterior: ' + (e.message || e), 'error');
  } finally {
    if (input) input.value = '';
  }
}
function retroMarcar(i, el){
  const f = RETRO && RETRO.filas[i];
  if (!f) return;
  f.marcada = !!(el && el.checked);
  const row = el && el.closest ? el.closest('.pt-retro-row') : null;
  if (row) row.classList.toggle('on', f.marcada);
  _retroPintarResumen();
}
function retroMonto(i, el){
  const f = RETRO && RETRO.filas[i];
  if (!f) return;
  const n = Math.max(0, Math.round(Number(el && el.value) || 0));
  f.monto = n;
  if (n > 0 && !f.marcada){
    f.marcada = true;
    // La casilla no se repinta en cada tecla: se marca sola para que el cobro sea coherente.
    const row = el && el.closest ? el.closest('.pt-retro-row') : null;
    const chk = row ? row.querySelector('input[type=checkbox]') : null;
    if (chk) chk.checked = true;
    if (row) row.classList.add('on');
  }
  _retroPintarResumen();
}
function retroNota(i, el){
  const f = RETRO && RETRO.filas[i];
  if (!f) return;
  f.nota = (el && el.value) || '';
}
function retroVerTodos(){
  if (!RETRO) return;
  RETRO.verTodos = !RETRO.verTodos;
  _retroPintarLista();
}
function retroAgregarManual(){
  const team = equipoTSCActual();
  if (!team || !RETRO) return;
  const sel = document.getElementById('retro-manual-jugador');
  const montoEl = document.getElementById('retro-manual-monto');
  const notaEl = document.getElementById('retro-manual-nota');
  const registro = sel ? parseInt(sel.value, 10) : NaN;
  const j = (PLANTILLA_ACTUAL || []).find(p => Number(p.id) === registro);
  const monto = Math.max(0, Math.round(Number(montoEl && montoEl.value) || 0));
  if (!j || !(monto > 0)){ showToast('Elige un jugador y un monto mayor que 0.', 'error'); return; }
  const perfil = _perfilTool(team.id, j) || 'ninguno';
  RETRO.seq = (RETRO.seq || 0) + 1;
  RETRO.filas.push({
    playerId: j.id, playerName: j.nombre, subscriber: !!j.subscriber, perfil: perfil,
    resumen: 'línea manual', nota: ((notaEl && notaEl.value) || '').trim(),
    marcada: true, conCambios: true, sinDato: false, manual: true,
    costoCalculado: 0, monto: monto, lineas: [],
  });
  if (montoEl) montoEl.value = '';
  if (notaEl) notaEl.value = '';
  _retroPintarLista();
  _retroPintarResumen();
}
function retroQuitar(i){
  if (!RETRO || !RETRO.filas[i]) return;
  RETRO.filas.splice(i, 1);
  _retroPintarLista();
  _retroPintarResumen();
}
async function retroConfirmar(){
  const team = equipoTSCActual();
  if (!team || !RETRO) return;
  const reparto = _retroReparto();
  if (!reparto || !(reparto.totalCosto > 0)){ showToast('No hay filas para cobrar.', 'error'); return; }
  const saldo = Number(team.yunacoin) || 0;
  if (saldo < reparto.totalCosto){
    showToast('El saldo no alcanza: carga YunaCoins al equipo en Admin → YunaCoins.', 'error');
    return;
  }
  // COBRO-1: la temporada de cobro tiene que admitir movimientos (activa y no archivada).
  if (!(await _validarCobroAntesDeEscribir())) return;
  if (!RETRO) return; // se cerró el modal mientras se releían las temporadas
  // Nota por jugador: «Retroactiva:» + las notas de Luis + resumen de líneas.
  Object.keys(reparto.porJugador).forEach(id => {
    const info = reparto.porJugador[id];
    const notas = (RETRO.filas || [])
      .filter(f => f && f.marcada !== false && f.playerId != null
        && String(f.playerId) === String(id) && _retroMontoDe(f) > 0
        && f.nota && String(f.nota).trim())
      .map(f => String(f.nota).trim());
    const partes = notas.slice();
    partes.push(_resumenLineas(info.lineas));
    info.nota = RETRO_PREFIJO + ' ' + partes.join(' · ');
  });
  const nombres = Object.values(reparto.porJugador).map(p => p.playerName).join(', ');
  const total = reparto.totalCosto;
  showConfirm('Registrar mejoras retroactivas',
    `Equipo: ${team.name} · Jugadores: ${nombres} · Total: ${_retroFmt(total)} YunaCoins · Temporada: ${_nombreTemporadaCobro()}. Se registra el cobro; el save no se toca.`,
    async () => {
      const btn = document.getElementById('pt-retro-ok');
      if (btn) btn.disabled = true;
      try {
        await cobrarMejorasEquipo(team, reparto, 'mejora PES5 retroactiva');
      } catch (e) {
        console.error('[pes5-tool] cobro retroactivo', e);
        showToast('No se pudo registrar el cobro: ' + (e.message || e), 'error');
        if (btn) btn.disabled = false;
        return;
      }
      showToast(`-${_retroFmt(total)} YunaCoins a ${team.name} (mejoras retroactivas)`);
      cerrarRetro();
      // Refrescar topes/barras como después de un cobro normal. Si la lectura
      // falla, el cobro YA quedó registrado: solo se avisa en consola.
      try { await _refrescarGastoTemporadaEquipo(team, true); }
      catch (e) { console.warn('[pes5-tool] retro: refrescar gasto tras el cobro', e); }
      if (TAB === 'plantilla'){ renderPlantillaBody(); renderWriteBar(); }
      if (TAB === 'equipos') renderEquiposTab();
    });
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

// BLOQ-1: si otra persona tiene el bloqueo vivo, el admin decide: confirmacion de la app. Si acepta,
// toma el control (las reglas le permiten sobrescribir) y se continua la accion `continuar`.
// Si cancela, no pasa nada y el editor no se abre.
async function asegurarBloqueoEquipo(team, continuar){
  if (!team || !tienePresidente(team)) return true;      // sin presidente no hay a quien bloquear
  if (BLOQUEO_EQUIPO === team.id) return true;
  let r;
  try { r = await PES5_BLOQUEO.tomar(team.id, 'admin', AUTH.user.uid, _bloqNombreAdmin()); }
  catch (e){ console.warn('[pes5-tool] no se pudo tomar el bloqueo, se sigue sin bloqueo:', e); return true; }
  if (!r.ok){
    const d = r.de || {};
    const hora = d.desde ? new Date(d.desde).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '';
    // La hora termina en «p. m.»: si ya trae punto, no se agrega otro.
    const cierre = hora && /\.$/.test(hora) ? ' ' : '. ';
    showConfirm('Bloqueo activo',
      `${d.nombre || 'El presidente'} está editando ${team.name}${hora ? ' desde ' + hora : ''}${cierre}¿Tomar el control? Sus cambios sin enviar se pierden.`,
      () => _tomarControlEquipo(team, continuar));
    return false;
  }
  _activarBloqueoAdmin(team);
  return true;
}
async function _tomarControlEquipo(team, continuar){
  try { await PES5_BLOQUEO.tomarControl(team.id, 'admin', AUTH.user.uid, _bloqNombreAdmin()); }
  catch (e){ showToast('No se pudo tomar el control: ' + (e.message || e), 'error'); return; }
  _activarBloqueoAdmin(team);
  showToast(`Tomaste el control de ${team.name}.`);
  if (typeof continuar === 'function') continuar();
}
function _activarBloqueoAdmin(team){
  BLOQUEO_EQUIPO = team.id;
  if (!_bloqLatidoAdmin){
    _bloqLatidoAdmin = setInterval(() => {
      if (BLOQUEO_EQUIPO == null) return;
      PES5_BLOQUEO.latir(BLOQUEO_EQUIPO, 'admin', AUTH.user.uid, _bloqNombreAdmin()).catch(() => {});
    }, PES5_BLOQUEO.LATIDO_MS);
  }
  renderWriteBar();
}
// BLOQ-1: antes de cerrar sesion (auth.js) el admin suelta el bloqueo del equipo, mientras las reglas lo dejan.
window.bloqueoAdminSoltar = async function bloqueoAdminSoltar(){ await liberarBloqueoEquipo(); };

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
  if (!ok) showToast(`No se pudo publicar la plantilla de ${team.name}. El bloqueo sigue activo: publicala desde la pestaña Pedidos.`, 'error');
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
  if (!(await asegurarBloqueoEquipo(equipoTSCActual(), () => abrirEditorJugador(id)))) return;
  // EMP-80-2: la lectura de los perfiles fijados va en segundo plano; si Luis abre un
  // jugador antes de que termine (o fallo), se espera aca antes de pintar el select.
  // Si vuelve a fallar, el select queda en «no se pudo leer» (deshabilitado).
  if (!PERFILES_TOOL && _emparejarCfg() && equipoTSCActual()){
    try { await _cargarPerfilesTool(); }
    catch (e) {
      console.warn('[pes5-tool] perfiles fijados', e);
      showToast('No se pudieron leer los perfiles fijados de la temporada: ' + (e.message || e), 'error');
    }
  }
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
        ${_btnEmparejarHTML(id)}${_selectPerfilHTML(id)}
        <button class="pt-ed-close" data-onclick="ptCerrarEditorJugador()" title="Cerrar">${ICN.x}</button></div>
      ${_casillaGratisHTML(equipoTSCActual(), 'ed')}
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

// Opciones del editor para el jugador abierto. Si el club está vinculado a un
// equipo TSC se cobra (reglas y presupuesto reales, descontando lo ya pendiente
// de OTROS jugadores), tenga presidente o no; si no, edicion libre: reglas en
// cero y presupuesto enorme.
function _opcionesEditor(j){
  const team = equipoTSCActual();
  const cobra = _cobraEquipo(team);
  // slice 2.1-A: datos del aviso grande (gastado de la temporada, tope extra y su motivo, lo reservado por otros cambios)
  const extraEq = team ? YUNACOINS_RULES.extraDeEquipo(YC_TOPES_EXTRA, team.id) : 0;
  const motivoEq = (team && YC_TOPES_EXTRA[String(team.id)] && YC_TOPES_EXTRA[String(team.id)].motivo) || '';
  let reglas, presupuesto;
  let gastado = { general: 0, sub: 0 }, pendientesOtros = { total: 0, general: 0, sub: 0 };
  if (cobra){
    reglas = _reglasEquipo(team.id);
    const reparto = repartoPendienteEquipo();
    const info = reparto.porJugador[j.id];
    const otrosTotal = reparto.totalCosto - (info ? info.total : 0);
    const otrosGeneral = reparto.fromGeneral - (info ? info.fromGeneral : 0);
    const otrosSub = reparto.fromSub - (info ? info.fromSub : 0);
    const restantes = _restantesTemporada();
    // BONO-5: el bono que el editor muestra y descuenta es el DEL JUGADOR abierto
    // (su cuota menos lo que ya gastó de su bono en el libro coins de la temporada).
    const bonoJugador = _bonoRestanteJugadorTool(j.id, j.subscriber, team.id);
    // Dato del equipo para la barra cuando se edita un jugador sin «$»: suma de bonos restantes.
    const bonoEquipo = (PLANTILLA_ACTUAL || []).reduce(function(s, x){
      return s + _bonoRestanteJugadorTool(x.id, x.subscriber, team.id);
    }, 0);
    presupuesto = {
      general: Math.max(0, Math.min((team.yunacoin || 0) - otrosTotal, restantes.general - otrosGeneral)),
      subscribers: bonoJugador,
      bonoJugador: bonoJugador,
      bonoEquipo: bonoEquipo,
      saldo: Math.max(0, (team.yunacoin || 0) - otrosTotal),
    };
    const delEquipo = GASTO_TEMPORADA_CACHE.teamId === team.id;
    gastado = { general: delEquipo ? GASTO_TEMPORADA_CACHE.general : 0, sub: delEquipo ? GASTO_TEMPORADA_CACHE.sub : 0 };
    pendientesOtros = { total: otrosTotal, general: otrosGeneral, sub: otrosSub };
  } else {
    // Edicion gratis de un equipo vinculado: sin costos, pero con el maximo de posiciones de la TSC.
    const gratisEquipo = !!team;
    reglas = Object.assign({}, YC_RULES, { bandCosts: [0, 0, 0, 0, 0], scale8Cost: 0, abilityCost: 0, injuryCost: 0, budgetGeneral: 0, budgetSubscribers: 0, maxPositions: gratisEquipo ? YC_RULES.maxPositions : 12 });
    presupuesto = { general: 1e9, subscribers: 1e9, saldo: 0 };
  }
  const pres = cobra ? PRESIDENTES_POR_TEAM[team.id] : null;
  return {
    modo: 'admin',
    topeAtributo: _topeAtributoVigente(),   // PES5-TOPE-1: tope de atributos de la temporada actual (null = sin tope)
    equipo: {
      id: team ? team.id : null,
      name: team ? team.name : (CLUBES_PES5[PLANTILLA_INDICE] || 'Club'),
      pes5Club: CLUBES_PES5[PLANTILLA_INDICE] || null,
      pes5ClubIdx: PLANTILLA_INDICE,
      yunacoin: team ? (team.yunacoin || 0) : 0,
      cobra: cobra,
      gratis: !cobra && !!team,
      presidente: pres ? (pres.displayName || pres.email || null) : null,
    },
    reglas: reglas,
    presupuesto: presupuesto,
    jugadores: PES5_PLANTILLA.plantillaParaEditor(PES5_EDITOR, PLANO, PLANTILLA_INDICE),
    jugadorId: 'r' + j.id,
    pendiente: CAMBIOS_PENDIENTES[j.id] || null,
    gastado: gastado,
    pendientesOtros: pendientesOtros,
    extra: extraEq,
    motivo: motivoEq,
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

// Casilla grande «Edición gratis»: para cualquier equipo TSC vinculado (a un club sin equipo no se le cobra nunca).
function _casillaGratisHTML(team, donde){
  if (!team) return '';
  return `<label class="pt-gratis${EDICION_GRATIS ? ' on' : ''}" for="pt-gratis-${donde}">
    <input type="checkbox" id="pt-gratis-${donde}" ${EDICION_GRATIS ? 'checked' : ''} data-onchange="ptToggleEdicionGratis(this)">
    <span class="pt-gratis-txt"><b>Edición gratis</b><span>No cobrar YunaCoins a ${escHtml(team.name)} por estos cambios</span></span>
  </label>`;
}
function toggleEdicionGratis(el){
  const on = el && typeof el === "object" ? !!el.checked : !!el;
  EDICION_GRATIS = !!on;
  showToast(EDICION_GRATIS ? 'Edición gratis: estos cambios no se cobran.' : 'Se vuelve a cobrar los cambios.');
  // Si el editor esta abierto, se guarda su borrador como pendiente y se vuelve a montar con los costos nuevos.
  if (JUGADOR_SELECCIONADO != null && window.MEJORAS_EDITOR && document.getElementById('pt-ed-overlay')){
    const b = MEJORAS_EDITOR.borrador ? MEJORAS_EDITOR.borrador() : null;
    if (b) recibirAplicarDelEditor(b);
    const j = PLANTILLA_ACTUAL.find(p => p.id === JUGADOR_SELECCIONADO);
    const casilla = document.getElementById('pt-gratis-ed');
    if (casilla){ casilla.checked = EDICION_GRATIS; casilla.closest('.pt-gratis').classList.toggle('on', EDICION_GRATIS); }
    if (j) MEJORAS_EDITOR.montar(document.getElementById('pt-ed-host'), _opcionesEditor(j));
  }
  renderPlantillaBody();
  renderWriteBar();
}

// Barra de escritura del plantel abierto: estado de cobro, cambios pendientes,
// checkbox "PES5 esta cerrado" y botones. Vive en #pl-writebar, fuera de #pl-body.
/* ================= BONO4 · las mismas dos barras del editor =================
   Copia chica de la animación de js/mejoras-page.js: la Tool no comparte un
   archivo de UI con el editor (solo lo monta), así que la función va duplicada
   con el mismo comportamiento — el número cuenta y la barra se achica en ~300 ms,
   la barra que baja se ilumina ~400 ms, y sin animación con prefers-reduced-motion.
   El bono baja primero y, agotado, sigue el general (BONO-3). */
const BARRA_MS = 300;
const BARRA_DESTELLO_MS = 400;
function _ptSinMovimiento(){
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
function _ptFmt(n){ return Math.max(0, Math.round(n || 0)).toLocaleString('es-CL'); }
function _ptNumero(el, def){
  const n = Number(String((el && el.textContent) || '').replace(/[^\d-]/g, ''));
  return Number.isFinite(n) ? n : (def || 0);
}
const _ptAnimNumero = new WeakMap();
function ptAnimarNumero(el, desde, hasta, opts){
  if (!el) return;
  const o = opts || {};
  const dur = Math.max(0, o.duracion == null ? BARRA_MS : o.duracion);
  const retraso = Math.max(0, o.retraso || 0);
  const previo = _ptAnimNumero.get(el);
  if (previo){
    if (previo.raf) cancelAnimationFrame(previo.raf);
    if (previo.timer) clearTimeout(previo.timer);
    _ptAnimNumero.delete(el);
  }
  const fin = Math.round(Number(hasta) || 0);
  const ini = desde == null ? _ptNumero(el, fin) : Math.round(Number(desde) || 0);
  if (!dur || _ptSinMovimiento() || ini === fin){ el.textContent = _ptFmt(fin); return; }
  const estado = { raf: 0, timer: 0 };
  const arrancar = function(){
    const t0 = performance.now();
    const paso = function(t){
      const p = Math.min(1, (t - t0) / dur);
      const v = Math.round(ini + (fin - ini) * (1 - Math.pow(1 - p, 3)));
      el.textContent = _ptFmt(p < 1 ? v : fin);
      if (p < 1) estado.raf = requestAnimationFrame(paso);
      else if (_ptAnimNumero.get(el) === estado) _ptAnimNumero.delete(el);
    };
    estado.raf = requestAnimationFrame(paso);
  };
  _ptAnimNumero.set(el, estado);
  if (retraso) estado.timer = setTimeout(arrancar, retraso);
  else arrancar();
}
const _ptDestellos = new WeakMap();
function ptDestelloBarra(row, retraso){
  if (!row || _ptSinMovimiento()) return;
  const previo = _ptDestellos.get(row);
  if (previo){ clearTimeout(previo.t1); clearTimeout(previo.t2); }
  row.classList.remove('pt-barra-baja');
  const estado = { t1: 0, t2: 0 };
  estado.t1 = setTimeout(function(){
    row.classList.remove('pt-barra-baja');
    void row.offsetWidth;
    row.classList.add('pt-barra-baja');
    estado.t2 = setTimeout(function(){ row.classList.remove('pt-barra-baja'); }, BARRA_DESTELLO_MS + 60);
  }, Math.max(0, retraso || 0));
  _ptDestellos.set(row, estado);
}
const _ptTimerBarra = new WeakMap();
function ptPintarBarra(cfg){
  if (!cfg) return;
  const total = Math.max(0, Number(cfg.total) || 0);
  const queda = Math.max(0, Number(cfg.queda) || 0);
  const retraso = Math.max(0, cfg.retraso || 0);
  if (cfg.cap) cfg.cap.textContent = _ptFmt(total);
  if (cfg.val) ptAnimarNumero(cfg.val, cfg.desde, queda, { retraso: retraso });
  if (cfg.fill){
    const pct = total > 0 ? Math.min(100, Math.max(0, queda / total * 100)) : 0;
    if (_ptSinMovimiento()){
      cfg.fill.style.transition = 'none';
      cfg.fill.style.width = pct + '%';
    } else {
      cfg.fill.style.transition = '';
      const previo = _ptTimerBarra.get(cfg.fill);
      if (previo) clearTimeout(previo);
      if (retraso){
        const t = setTimeout(function(){
          cfg.fill.style.width = pct + '%';
          _ptTimerBarra.delete(cfg.fill);
        }, retraso);
        _ptTimerBarra.set(cfg.fill, t);
      } else cfg.fill.style.width = pct + '%';
    }
  }
  if (cfg.baja) ptDestelloBarra(cfg.row, retraso);
}
/* BONO4: totales de la temporada (general con su tope extra y bono de
   suscriptores) para las dos barras del plantel abierto. */
function _topesTemporadaEquipo(team){
  const reglas = _reglasEquipo(team ? team.id : null);
  const n = _nSuscriptoresDelEquipo(team ? team.id : null);
  return YUNACOINS_RULES.topesRestantes({ general: 0, sub: 0 }, reglas, n);
}
/* BONO4: dos barras «queda X de Y» del reparto del equipo, con la animación del
   editor. Se pintan después de escribir el markup (id base 'pt-barra-...'). */
function _ptPintarBarras(datos){
  if (!datos) return;
  const barBono = document.getElementById('pt-barra-bono');
  if (barBono) barBono.hidden = !(datos.bonoTotal > 0);
  const bajaBono = datos.subDespues < datos.subAntes;
  const bajaGeneral = datos.genDespues < datos.genAntes;
  ptPintarBarra({
    row: barBono,
    fill: document.getElementById('pt-barra-bono-fill'),
    val: document.getElementById('pt-barra-bono-val'),
    cap: document.getElementById('pt-barra-bono-cap'),
    total: datos.bonoTotal, queda: datos.subDespues, desde: datos.prevBono, baja: bajaBono, retraso: 0,
  });
  ptPintarBarra({
    row: document.getElementById('pt-barra-general'),
    fill: document.getElementById('pt-barra-general-fill'),
    val: document.getElementById('pt-barra-general-val'),
    cap: document.getElementById('pt-barra-general-cap'),
    total: datos.generalTotal, queda: datos.genDespues, desde: datos.prevGeneral, baja: bajaGeneral,
    retraso: (bajaBono && bajaGeneral) ? BARRA_MS : 0,
  });
}
function _ptBarrasHTML(){
  return `<div class="pt-barras" id="pt-barras">
    <div class="pt-barra" id="pt-barra-bono" hidden>
      <span class="pt-barra-txt">Bono de suscriptores (cada uno solo para su jugador): queda <b id="pt-barra-bono-val">0</b> de <span id="pt-barra-bono-cap">0</span></span>
      <span class="pt-barra-bar" aria-hidden="true"><i id="pt-barra-bono-fill"></i></span>
    </div>
    <div class="pt-barra" id="pt-barra-general">
      <span class="pt-barra-txt">Tope general: queda <b id="pt-barra-general-val">0</b> de <span id="pt-barra-general-cap">0</span></span>
      <span class="pt-barra-bar" aria-hidden="true"><i id="pt-barra-general-fill"></i></span>
    </div>
  </div>`;
}
function renderWriteBar(){
  const el = document.getElementById('pl-writebar');
  if (!el) return;
  if (PLANTILLA_INDICE == null || !PLANTILLA_ACTUAL){ el.innerHTML = ''; return; }
  // BONO4: lo que se ve ahora en las barras, para contar desde ahí y no desde 0
  // cuando el bloque se rehace.
  const prevBono = _ptNumero(document.getElementById('pt-barra-bono-val'), 0);
  const prevGeneral = _ptNumero(document.getElementById('pt-barra-general-val'), 0);
  const cerrado = !!document.getElementById('pes5-cerrado')?.checked;
  const equipoTSC = equipoTSCActual();
  const cobra = _cobraEquipo(equipoTSC);
  const total = Object.keys(CAMBIOS_PENDIENTES).length;
  const modoDescarga = !PES5_SAVE.tieneSoporte();
  let cobroHtml;
  let barras = null;
  if (!equipoTSC){
    cobroHtml = `<span class="pt-cobro-badge libre">${ICN.unlock} Sin equipo TSC vinculado · edición libre</span>`;
  } else if (!cobra){
    cobroHtml = `<span class="pt-cobro-badge gratis">${ICN.unlock} Edición gratis · no se cobra a ${escHtml(equipoTSC.name)} (saldo ${(equipoTSC.yunacoin || 0).toLocaleString('es-CL')})</span>`;
  } else {
    const reparto = repartoPendienteEquipo();
    const restantes = _restantesTemporada();
    const saldo = equipoTSC.yunacoin || 0;
    const ev = YUNACOINS_RULES.evaluarPago(saldo, reparto.totalCosto, reparto.fromGeneral, restantes.general);
    const tot = _topesTemporadaEquipo(equipoTSC);
    const subAntes = Math.max(0, restantes.subscribers);
    const genAntes = Math.max(0, restantes.general);
    barras = {
      bonoTotal: tot.subscribers, generalTotal: tot.general,
      subAntes: subAntes, genAntes: genAntes,
      subDespues: Math.max(0, subAntes - reparto.fromSub),
      genDespues: Math.max(0, genAntes - reparto.fromGeneral),
      prevBono: prevBono, prevGeneral: prevGeneral,
    };
    cobroHtml = `<span class="pt-cobro-badge pagando">${ICN.wallet} Se cobra a ${escHtml(equipoTSC.name)} · saldo ${saldo.toLocaleString('es-CL')}</span>
      <span class="pt-cobro-txt">Total a cobrar: ${reparto.totalCosto.toLocaleString('es-CL')} · tope gral. restante ${restantes.general.toLocaleString('es-CL')} · bono restante ${restantes.subscribers.toLocaleString('es-CL')}</span>
      ${ev.excedeSaldo ? `<span class="pt-cobro-faltante">${ICN.alert} Saldo insuficiente: faltan ${(reparto.totalCosto - saldo).toLocaleString('es-CL')}</span>` : ''}
      ${(!ev.excedeSaldo && ev.excedeTopeGeneral) ? `<span class="pt-cobro-faltante">${ICN.alert} Supera el tope general de temporada</span>` : ''}`;
  }
  el.innerHTML = `
    ${_casillaGratisHTML(equipoTSC, 'wb')}
    <div class="pt-writebar">
      ${cobroHtml}
      ${BLOQUEO_EQUIPO != null ? `<span class="pt-cobro-txt">${ICN.lock} Bloqueo activo: el presidente no puede usar Mejoras hasta que escribas y publiques.</span>` : ''}
      <span class="pt-changes-count">${total} jugador(es) con cambios</span>
      <label><input type="checkbox" id="pes5-cerrado" ${cerrado ? 'checked' : ''}> PES5 está cerrado</label>
      <button class="btn btn-primary btn-sm" id="btn-escribir-save" disabled data-onclick="ptConfirmarEscribirAlSave()">${ICN.save} ${modoDescarga ? 'Descargar save editado' : 'Escribir al save'}</button>
      <button class="btn btn-sm" ${total ? '' : 'disabled'} data-onclick="ptDescartarTodo()">Descartar cambios</button>
    </div>
    ${barras ? _ptBarrasHTML() : ''}`;
  if (barras) requestAnimationFrame(function(){ _ptPintarBarras(barras); });
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
  // Slice D.R punto 5: si el club abierto tiene equipo TSC (se le cobra, tenga
  // presidente o no), el saldo real (teams.yunacoin) tiene que alcanzar el total
  // de TODOS los cambios pendientes de este plantel Y el tope general de
  // temporada no se puede exceder (evaluarPago) — si no, no se puede escribir
  // (macro-slice D.R punto 3: "si el saldo no alcanza, no se escribe").
  const equipoTSC = equipoTSCActual();
  let sinSaldo = false;
  if (_cobraEquipo(equipoTSC)){
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
  if (_cobraEquipo(equipoTSCConfirm)){
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
    _mostrarErrorEscritura({ name: 'PermisoDenegado', message: 'No se pudo confirmar el permiso de escritura sobre la carpeta del save. Reconecta la carpeta (botón "Actualizar save" en la barra de arriba) o elegila de nuevo.' });
    return;
  }

  const nota = PES5_SAVE.tieneSoporte()
    ? 'Se crea backup automático.'
    : 'Se va a descargar el archivo editado (el original de tu carpeta no se toca).';
  const avisoGratis = (EDICION_GRATIS && equipoTSCConfirm) ? '\nEDICIÓN GRATIS: no se cobran YunaCoins.\n' : '';
  const avisoCobro = (_cobraEquipo(equipoTSCConfirm) && !EDICION_GRATIS) ? `Cobro en: ${_nombreTemporadaCobro()}\n` : '';
  const ok = confirm(`Equipo: ${nombreEquipo}\nJugadores: ${nombresJugadores}\n${avisoGratis}${avisoCobro}\n${nota} ¿Confirmar?`);
  if (!ok) return;
  await escribirAlSave();
}

// C2.3 · la escritura ya no falla en silencio: paso a paso en #pl-log
// (punto 7 — para saber en que etapa queda colgado un intento fallido),
// panel de error persistente si algo lanza (punto 2), panel de exito
// persistente si termina bien (punto 3), y en modo fallback (sin File
// System Access, ej. Brave) termina en una DESCARGA del save reescrito en
// vez de intentar escribir en disco (punto 6a).
/* COBRO-1: antes de escribir un save con cobro, la temporada de cobro tiene que estar
   activa y no archivada. Refresca la lista de temporadas (puede haber cambiado en la
   sesión). Devuelve false (con aviso claro) si no se puede registrar el cobro. */
async function _validarCobroAntesDeEscribir(log){
  try { YC_SEASONS = await dbGetAll('seasons'); } catch(e) { console.warn('[pes5-tool] no se pudieron releer las temporadas', e); }
  const v = YUNACOINS_RULES.validarTemporadaCobro(YC_SEASONS, _temporadaCobro(), _temporadasArchivadas());
  if (v.ok) return true;
  const arch = _temporadasArchivadas();
  const hayActiva = (YC_SEASONS || []).some(s => s.status === 'active' && !arch.includes(Number(s.number)));
  const accion = hayActiva ? 'elige la temporada activa en el selector' : 'crea la temporada activa en Temporadas';
  const msg = `No se escribió el save: ${v.motivo}. Las mejoras con costo se cobran en la temporada activa: ${accion}.`;
  if (log) log(msg, 'err');
  _mostrarErrorEscritura({ name: 'TemporadaCobro', message: msg });
  showToast(msg, 'error');
  return false;
}

/* ============================================================
   EMP-80-1 · Emparejar a N (admin, por jugador, sin costo)
   Sube cada atributo del perfil (Base o Suscriptor, definidos en Reglas) hasta su maximo. Pasa por escribirAlSave(op):
   el mismo guardado, pero con op NO cobra, escribe SOLO ese jugador y deja registro en
   pes5_mejoras (sinCosto: true). No crea coins ni toca CAMBIOS_PENDIENTES.
   ============================================================ */
function _emparejarCfg(){
  return (YC_RULES && YC_RULES.emparejar) || null;
}
// ¿Hay algun perfil con boton? Si no, no se muestra el boton en el editor.
function _hayPerfilEmparejarActivo(){
  const cfg = _emparejarCfg();
  return !!cfg && ['base', 'suscriptor'].some(n => YUNACOINS_RULES.rangoEmparejar(cfg, n));
}
// Estado del emparejar de un jugador del save: perfil, maximo, lineas (de → a) y motivo si no aplica.
function _emparejarDe(registro){
  const vacio = { perfil: null, max: null, lineas: [], cambios: null, nombre: '', motivo: 'No hay plantilla cargada.' };
  if (!PLANO || registro == null) return vacio;
  const cfg = _emparejarCfg();
  const j = PES5_EDITOR.leerJugadorCompleto(PLANO, registro);
  const r = YUNACOINS_RULES.cambiosEmparejar(j, cfg, _fijadoTool((equipoTSCActual() || {}).id, registro));
  const cambios = { atributos: r.atributos };
  // Defensa previa a escribir: la misma que usa la aprobación de un pedido, con el tope de la temporada.
  // Si no hay perfil, el motivo lo dice cambiosEmparejar; si lo hay, lo dice motivoRechazoEmparejar.
  const motivo = r.perfil
    ? YUNACOINS_RULES.motivoRechazoEmparejar(j, cambios, cfg, _topeAtributoVigente(), _fijadoTool((equipoTSCActual() || {}).id, registro))
    : (r.motivo || 'Este jugador no puede emparejarse.');
  return {
    perfil: r.perfil,
    max: r.perfil ? YUNACOINS_RULES.rangoEmparejar(cfg, r.perfil).max : null,
    lineas: r.lineas,
    cambios: cambios,
    nombre: j.nombre || '',
    motivo: motivo,
  };
}
function _btnEmparejarHTML(registro){
  if (!_hayPerfilEmparejarActivo()) return '';
  const info = _emparejarDe(registro);
  let motivo = '';
  if (!equipoTSCActual()) motivo = 'El club no tiene equipo asignado: no se puede registrar el emparejar.';
  else if (info.motivo) motivo = info.motivo;
  else if (Object.keys(CAMBIOS_PENDIENTES).length) motivo = 'Hay cambios pendientes en la tool: guarda o descarta los cambios antes de emparejar.';
  const etiqueta = info.max != null ? 'Emparejar a ' + info.max : 'Emparejar';
  const title = motivo || ('Sube ' + info.lineas.length + ' atributo(s) a ' + info.max + ' sin costo (perfil ' + info.perfil + ')');
  return `<button class="btn btn-sm pt-ed-emparejar" data-onclick="ptEmparejarJugador(${Number(registro)})"${motivo ? ' disabled' : ''} title="${escAttr(title)}"><svg class="icn" viewBox="0 0 24 24"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg> ${escHtml(etiqueta)}</button>`;
}
function emparejarJugadorAdmin(registro){
  const info = _emparejarDe(registro);
  if (info.motivo){ showToast(info.motivo, 'error'); return; }
  if (Object.keys(CAMBIOS_PENDIENTES).length){ showToast('Guarda o descarta los cambios pendientes antes de emparejar.', 'error'); return; }
  const filas = info.lineas.map(l => `<li><span>${escHtml(l.campo)}</span><span class="pt-emp-de">${Number(l.de)} → <strong>${Number(l.a)}</strong></span></li>`).join('');
  const previo = document.getElementById('pt-emp-overlay');
  if (previo) previo.remove();
  const ov = document.createElement('div');
  ov.id = 'pt-emp-overlay';
  ov.className = 'pt-ed-overlay';
  ov.innerHTML = `
    <div class="pt-ed-box pt-emp-box">
      <div class="pt-ed-hd"><span>Emparejar a ${Number(info.max)}: ${escHtml(info.nombre)}</span>
        <button class="pt-ed-close" data-onclick="ptCerrarEmparejar()" title="Cerrar">${ICN.x}</button></div>
      <ul class="pt-emp-list">${filas}</ul>
      <p class="pt-emp-costo">Costo: 0 YuNaCoins. No se cobra ni se crea ningún movimiento en coins.</p>
      <div class="pt-emp-acciones">
        <button class="btn btn-sm" data-onclick="ptCerrarEmparejar()">Cancelar</button>
        <button class="btn btn-primary btn-sm" data-onclick="ptConfirmarEmparejar(${Number(registro)})">Emparejar sin costo</button>
      </div>
    </div>`;
  (_montadoEn || document.body).appendChild(ov);
}
function cerrarEmparejar(){
  const ov = document.getElementById('pt-emp-overlay');
  if (ov) ov.remove();
}
async function confirmarEmparejar(registro){
  cerrarEmparejar();
  // Se vuelve a calcular y a validar justo antes de escribir (motivoRechazoEmparejar incluido).
  const info = _emparejarDe(registro);
  if (info.motivo){ showToast(info.motivo, 'error'); return; }
  if (!info.perfil || !info.lineas.length){ showToast('No hay nada que emparejar.', 'error'); return; }
  if (Object.keys(CAMBIOS_PENDIENTES).length){ showToast('Guarda o descarta los cambios pendientes antes de emparejar.', 'error'); return; }
  await escribirAlSave({ registro: Number(registro), nombre: info.nombre, perfil: info.perfil, nivel: info.max, cambios: info.cambios, lineas: info.lineas });
  cerrarEditorJugador(); // el save cambió: el editor de ese jugador quedó con datos viejos
}
async function _registrarEmparejarAdmin(team, op){
  const u = AUTH.user || {};
  await firebase.firestore().collection('pes5_mejoras').add({
    tipo: 'emparejar', sinCosto: true, nivel: op.nivel, perfil: op.perfil || null,
    teamId: String(team.id), teamName: team.name || null,
    playerId: op.registro, playerName: op.nombre || null,
    lineas: op.lineas.map(l => ({ campo: l.campo, de: l.de, a: l.a })),
    totalCost: 0, season: _temporadaCobro(), por: u.email || null, uid: u.uid || null,
    creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
  });
}
async function _registrarEmparejarAdminSeguro(team, op){
  try { await _registrarEmparejarAdmin(team, op); }
  catch (e) {
    console.error('[pes5-tool] registro del emparejar', e);
    showToast('Save escrito, pero no se pudo dejar el registro del emparejar: ' + (e.message || e), 'error');
  }
}

async function escribirAlSave(op){
  const logEl = document.getElementById('pl-log');
  // EMP-80-2: el cobro usa los perfiles fijados vigentes (si no se pudieron leer, se usa el calculo en vivo y se avisa).
  if (!PERFILES_TOOL){
    try { await _cargarPerfilesTool(); }
    catch (e) { showToast('No se pudieron leer los perfiles fijados: ' + (e.message || e), 'error'); return; }
  }
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
  // EMP-80-1: un emparejar (op) nunca cobra; la edición gratis del equipo no aplica a él.
  const debeCobrar = op ? false : _cobraEquipo(equipoCobro);
  if (!op && !debeCobrar && EDICION_GRATIS && equipoCobro){
    log(`edición gratis: no se cobra a ${equipoCobro.name} (marcada por ${(AUTH.user && AUTH.user.email) || 'admin'})`);
  }
  // EMP-80-2 (cierre): antes de cobrar o escribir, si algun jugador tocado no tiene perfil fijado, se fija el plantel.
  try {
    await _fijarPlantelSiFalta(equipoCobro, op ? [op.registro] : Object.keys(CAMBIOS_PENDIENTES).map(Number));
  } catch (e) {
    log('No se fijaron los perfiles de emparejar del equipo (' + (e.message || e) + '). No se escribió nada.', 'err');
    return;
  }
  const repartoCobro = debeCobrar ? repartoPendienteEquipo() : null;
  // Slice 2.0-4 (4.D): con cobro, la lista de Loyalty tiene que ser reciente (12 h)
  if (debeCobrar && repartoCobro && repartoCobro.totalCosto > 0 && window.PES5_YUNACOINS){
    if (!(await window.PES5_YUNACOINS.guardiaCobro(log, repartoCobro.totalCosto))){ log('Escritura cancelada: el cobro necesita una lista de Loyalty reciente.', 'err'); return; }
  }
  // COBRO-1: si la temporada de cobro no admite movimientos, NO se escribe el save
  // (si no, la mejora quedaría escrita y sin cobrar).
  if (debeCobrar && repartoCobro && repartoCobro.totalCosto > 0){
    if (!(await _validarCobroAntesDeEscribir(log))) return;
  }
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
    const aEscribir = op ? { [op.registro]: op.cambios } : CAMBIOS_PENDIENTES;
    for (const [id, cambios] of Object.entries(aEscribir)){
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
      if (op) await _registrarEmparejarAdminSeguro(equipoCobro, op);
      PLANO = copia;
      if (!op){ CAMBIOS_PENDIENTES = {}; EDICION_GRATIS = false; }
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
    if (op) await _registrarEmparejarAdminSeguro(equipoCobro, op);
    PLANO = copia;
    if (!op){ CAMBIOS_PENDIENTES = {}; EDICION_GRATIS = false; }
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
async function renderPedidosTab(opts){
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
  const movil = ptModo() === 'movil';
  // Publicar vive en Pedidos (solo PC, como antes la pestaña). El aviso de desactualizadas apunta a «Publicar save».
  const bloquePub = movil ? '' : _bloquePublicarHTML();
  if (!PEDIDOS_PENDIENTES.length){
    cont.innerHTML = `<div class="pt-empty">${ICN.inbox}<div>No hay pedidos pendientes.</div></div><div class="pt-log" id="ped-log"></div>${bloquePub}`;
    _despuesDeRenderPedidos(movil, opts);
    return;
  }
  const grupos = _ptGruposPedidos();
  const acordeon = grupos.map(g => _ptEquipoHTML(g, movil)).join('');
  const intro = movil
    ? `<div style="margin-bottom:10px;">Pedidos pendientes de los presidentes.</div>
       <div class="pt-status-item" style="margin-bottom:12px;">${ICN.alert} Los pedidos se aplican desde la PC con el save abierto.</div>`
    : `<div style="margin-bottom:10px;">Pedidos pendientes de los presidentes. Se cobran recién al aplicarlos, con los precios y el save de este momento.</div>
       ${PLANO ? '' : `<div class="pt-status-item">${ICN.alert} Carga el save para poder aplicar.</div>`}`;
  if (movil){
    cont.innerHTML = `
      ${intro}
      <div class="pt-ped-acc">${acordeon}</div>
      <div class="pt-log" id="ped-log"></div>`;
    _despuesDeRenderPedidos(movil, opts);
    return;
  }
  // PEDPC: en escritorio, lista en tabla a la izquierda y panel fijo de selección a la derecha.
  // En angosto (≤ 860 px) el CSS apila todo en una columna y oculta el encabezado de la tabla.
  const nEquipos = grupos.length, nPedidos = PEDIDOS_PENDIENTES.length;
  cont.innerHTML = `
    ${intro}
    <div class="pt-ped-layout">
      <div class="pt-ped-main">
        <div class="pt-ped-bar">
          <span class="pt-ped-bar-txt">${nEquipos} ${nEquipos === 1 ? 'equipo' : 'equipos'} · ${nPedidos} ${nPedidos === 1 ? 'pedido' : 'pedidos'}</span>
          <button type="button" class="btn btn-sm pt-ped-todo" id="btn-ped-todo" data-estado="cerrado" data-onclick="ptPedAlternarTodo(this)">${PT_PED_ICON.abrir} Abrir todo</button>
        </div>
        <div class="pt-ped-acc pt-ped-acc--escritorio">
          <div class="pt-ped-head" aria-hidden="true">
            <span></span><span>Equipo</span><span>Pedidos</span><span>Tipos</span><span>Costo</span>
          </div>
          ${acordeon}
        </div>
      </div>
      ${_ptPanelHTML()}
    </div>
    ${bloquePub}`;
  _despuesDeRenderPedidos(movil, opts);
}

/* Acordeón de pedidos (3 niveles: equipo › tipo › pedido). Solo arma HTML: las
   casillas .ped-sel conservan value = id del pedido y aplicarPedidosSeleccionados
   las lee igual que antes. Los grupos nacen cerrados. */
const PT_PED_TIPOS = [
  { key: 'mejoras', label: 'Mejoras' },
  { key: 'alineacion', label: 'Alineación' },
  { key: 'formacion', label: 'Formación' },
  { key: 'emparejar', label: 'Emparejar' },
];
const PT_PED_ICON = {
  abrir: '<svg class="icn" viewBox="0 0 24 24" aria-hidden="true"><polyline points="7 6 12 11 17 6"/><polyline points="7 13 12 18 17 13"/></svg>',
  cerrar: '<svg class="icn" viewBox="0 0 24 24" aria-hidden="true"><polyline points="7 11 12 6 17 11"/><polyline points="7 18 12 13 17 18"/></svg>',
};
function _ptClaveEquipo(p){
  return p.teamId != null && p.teamId !== '' ? String(p.teamId) : 'n:' + String(p.teamName || 'sin-equipo');
}
function _ptTipoPedido(p){
  if (p.tipo === 'emparejar') return 'emparejar';
  if (p.tipo === 'formacion'){
    return (p.lines || []).some(l => l && l.label === 'Cambio de alineación') ? 'alineacion' : 'formacion';
  }
  return 'mejoras';
}
function _ptPedidoAplicable(p){
  return p.tipo === 'formacion'
    ? !!(p.formacion && Array.isArray(p.formacion.slots) && p.pes5ClubIdx != null)
    : !!(p.cambios && p.registro != null);
}
function _ptCostoPedido(p){
  return _ptTipoPedido(p) === 'mejoras' ? Number(p.totalCost || 0) : 0;
}
function _ptCostoTexto(n){
  const v = Number(n || 0);
  return v > 0 ? v.toLocaleString('es-CL') + ' YC' : 'gratis';
}
function _ptGruposPedidos(){
  const porEquipo = new Map();
  for (const p of PEDIDOS_PENDIENTES){
    const key = _ptClaveEquipo(p);
    if (!porEquipo.has(key)){
      porEquipo.set(key, {
        key: key, nombre: String(p.teamName || p.teamId || 'Sin equipo'),
        total: 0, aplicables: 0, tipos: new Map(), pedidos: [],
      });
    }
    const g = porEquipo.get(key);
    g.pedidos.push(p);
    g.total += _ptCostoPedido(p);
    if (_ptPedidoAplicable(p)) g.aplicables++;
    const tipo = _ptTipoPedido(p);
    if (!g.tipos.has(tipo)) g.tipos.set(tipo, []);
    g.tipos.get(tipo).push(p);
  }
  return Array.from(porEquipo.values()).map(g => ({
    key: g.key, nombre: g.nombre, total: g.total, aplicables: g.aplicables, pedidos: g.pedidos,
    tipos: PT_PED_TIPOS.filter(t => g.tipos.has(t.key))
      .map(t => ({ key: t.key, label: t.label, pedidos: g.tipos.get(t.key) })),
  }));
}
/* TOOLDET (detalle por pedido): todas las líneas del pedido en un solo formato.
   Se arman desde p.lines (lo que vio el presidente al pedir) y, si un pedido
   viejo no trae líneas, desde p.cambios para que no quede nada afuera:
   atributos con antes → después, habilidades nuevas o quitadas, posiciones,
   lesiones, altura, edad y pie dominante. */
function _ptLineasDetalle(p){
  const out = [];
  const vistos = new Set();
  const push = (label, from, to) => {
    const l = String(label == null ? '' : label).trim();
    if (!l) return;
    if (vistos.has(l.toLowerCase())) return;
    vistos.add(l.toLowerCase());
    out.push({ label: l, from: from == null ? '' : String(from), to: to == null ? '' : String(to) });
  };
  for (const l of (p.lines || [])){
    if (!l) continue;
    push(l.label, l.from, l.to);
  }
  const c = p.cambios || null;
  if (c && typeof c === 'object'){
    const falta = (label) => !vistos.has(String(label).toLowerCase());
    if (c.atributos) for (const [campo, v] of Object.entries(c.atributos)) if (falta(campo)) push(campo, '—', v);
    if (c.escala8) for (const [campo, v] of Object.entries(c.escala8)) if (falta(campo)) push(campo, '—', v);
    if (c.habilidades) for (const [campo, v] of Object.entries(c.habilidades)) if (falta(campo)) push(campo, v ? '—' : 'habilidad', v ? 'habilidad nueva' : 'quitada');
    const yaHayPosiciones = Array.from(vistos).some(l => l.indexOf('posición') === 0 || l.indexOf('posicion') === 0);
    if (Array.isArray(c.posiciones) && !yaHayPosiciones && falta('Posiciones')) push('Posiciones', '—', c.posiciones.join(', '));
    if (c.posicionRegistrada && falta('Posición natural')) push('Posición natural', '—', c.posicionRegistrada);
    if (c.banda && falta('Banda')) push('Banda', '—', c.banda);
    if (c.lesiones !== undefined && falta('Res. lesión')) push('Res. lesión', '—', c.lesiones);
    if (c.pieDominante !== undefined && falta('Pie dominante')) push('Pie dominante', '—', c.pieDominante);
    if (c.altura !== undefined && falta('Altura')) push('Altura', '—', c.altura + ' cm');
    if (c.edad !== undefined && falta('Edad')) push('Edad', '—', c.edad);
  }
  return out;
}
/* TOOLDET: cambios que Luis suele rechazar (esta temporada no se permiten subir
   altura ni agregar posiciones a jugadores reales, y la edad es de admin). Solo
   se resaltan: acá no se rechaza nada automáticamente. */
function _ptRevisarLinea(l){
  const label = String((l && l.label) || '').toLowerCase();
  const from = String((l && l.from) || '');
  const to = String((l && l.to) || '').toLowerCase();
  if (label.indexOf('altura') === 0) return true;
  if (label.indexOf('edad') === 0) return true;
  if (label.indexOf('posición:') === 0 || label.indexOf('posicion:') === 0){
    if (to === 'agregada') return true;
    if (from === '—' && to !== 'quitada') return true;
  }
  return false;
}
/* TOOLDET: título de la fila (equipo › tipo › pedido). */
function _ptTituloPedido(p){
  const tipo = _ptTipoPedido(p);
  if (tipo === 'alineacion') return 'Cambio de alineación';
  if (tipo === 'formacion'){
    const nombre = p.formacion && p.formacion.nombre;
    return 'Cambio de formación' + (nombre ? ' · ' + nombre : '');
  }
  if (tipo === 'emparejar'){
    const nivel = p.nivel != null ? p.nivel : ((p.perfil && p.perfil.max != null) ? p.perfil.max : null);
    return nivel != null ? 'Emparejar a ' + nivel : 'Emparejar';
  }
  return p.playerName || 'Jugador sin nombre';
}
function _ptFechaPedido(p){
  const t = p && p.creadoEn;
  if (!t) return '';
  try {
    const d = t.toDate ? t.toDate() : new Date(t);
    return isNaN(d.getTime()) ? '' : d.toLocaleString('es-CL');
  } catch (_){ return ''; }
}
/* PEDPC: chips de colores por tipo en la fila del equipo (escritorio). */
function _ptChipsTipoHTML(g){
  return g.tipos.map(t => `<span class="pt-ped-chip pt-tipo-${t.key}">${escHtml(t.label)} <b>${t.pedidos.length}</b></span>`).join('');
}
/* PEDPC: panel derecho con el resumen de la selección, la confirmación de PES5 cerrado,
   el botón de aplicar y el log de la última aplicación (mismo #ped-log de siempre). */
function _ptPanelHTML(){
  return `<aside class="pt-ped-side" aria-label="Pedidos seleccionados">
    <h3 class="pt-ped-side-title">Selección</h3>
    <div class="pt-ped-res">
      <div class="pt-ped-res-line"><span>Pedidos seleccionados</span><b id="ped-sel-n">0</b></div>
      <div class="pt-ped-res-line"><span>Equipos seleccionados</span><b id="ped-sel-equipos">0</b></div>
      <div class="pt-ped-res-total"><span>Total a cobrar</span><b id="ped-sel-total">gratis</b></div>
    </div>
    <label class="pt-ped-cerrado"><input type="checkbox" id="ped-cerrado" data-onchange="ptHabilitarAplicarPedidos(this)"> PES5 está cerrado</label>
    <button class="btn btn-primary btn-sm" id="btn-aplicar-pedidos" disabled data-onclick="ptAplicarPedidosSeleccionados()">${ICN.save} ${PES5_SAVE.tieneSoporte() ? 'Aplicar seleccionados' : 'Aplicar y descargar save'}</button>
    <div class="pt-log" id="ped-log"></div>
  </aside>`;
}
/* PEDPC: resumen de lo marcado, con las mismas casillas .ped-sel que aplica
   aplicarPedidosSeleccionados (no se toca esa función). */
function _ptResumenSeleccion(){
  const ids = new Set(Array.from(document.querySelectorAll('#pt-tabcontent .ped-sel:checked')).map(el => el.value));
  const pedidos = PEDIDOS_PENDIENTES.filter(p => ids.has(p._id));
  const equipos = new Set(pedidos.map(p => _ptClaveEquipo(p)));
  const total = pedidos.reduce((s, p) => s + _ptCostoPedido(p), 0);
  return { pedidos: pedidos.length, equipos: equipos.size, total: total };
}
function ptPedActualizarPanel(){
  const n = document.getElementById('ped-sel-n');
  if (!n) return;
  const r = _ptResumenSeleccion();
  n.textContent = String(r.pedidos);
  const eq = document.getElementById('ped-sel-equipos');
  if (eq) eq.textContent = String(r.equipos);
  const total = document.getElementById('ped-sel-total');
  if (total) total.textContent = _ptCostoTexto(r.total);
}
/* PEDPC: abre o cierra todos los equipos de la lista de escritorio. En angosto también
   abre los tipos (que siguen siendo plegables ahí); en ancho los tipos ya van abiertos. */
function ptPedAlternarTodo(btn){
  const cont = document.querySelector('#pt-tabcontent .pt-ped-acc--escritorio');
  if (!btn || !cont) return;
  const abrir = btn.dataset.estado !== 'abierto';
  for (const team of cont.querySelectorAll(':scope > .pt-ped-team')){
    const cab = team.querySelector(':scope > .pt-ped-team-hd .pt-ped-team-toggle');
    const cuerpo = team.querySelector(':scope > .pt-ped-team-body');
    if (cab) cab.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    if (cuerpo) cuerpo.hidden = !abrir;
    for (const t of team.querySelectorAll('.pt-ped-type-toggle')) t.setAttribute('aria-expanded', abrir ? 'true' : 'false');
  }
  btn.dataset.estado = abrir ? 'abierto' : 'cerrado';
  btn.innerHTML = abrir ? `${PT_PED_ICON.cerrar} Cerrar todo` : `${PT_PED_ICON.abrir} Abrir todo`;
}
function _ptPedidoHTML(p, movil){
  const tipo = _ptTipoPedido(p);
  const aplicable = _ptPedidoAplicable(p);
  const eq = _ptClaveEquipo(p);
  const titulo = _ptTituloPedido(p);
  const nCambios = _ptLineasDetalle(p).length;
  // En PC la casilla elige qué pedidos aplicar. En el teléfono no se aplica nada (3.B).
  const sel = movil ? '' : `<input type="checkbox" class="ped-sel" value="${escAttr(p._id)}" data-eq="${escAttr(eq)}" aria-label="Aplicar este pedido" data-onchange="ptPedSelPedido(this)" ${aplicable ? 'checked' : 'disabled'}>`;
  const esFormacion = tipo === 'formacion' || tipo === 'alineacion';
  const sub = !esFormacion && p.subscriber ? ' <span class="badge">$</span>' : '';
  const viejo = !movil && !aplicable ? ' <span class="badge badge-warn">pedido viejo, sin datos aplicables</span>' : '';
  // TOOLDET: el emparejar se titula «Emparejar a N»; el jugador va debajo.
  const nombreJugador = tipo === 'emparejar' && p.playerName ? String(p.playerName) : '';
  // TOOLDET: la fila ya no corta el detalle: muestra el título, cuántos cambios
  // trae y un botón «Detalle» que abre todo el pedido en una ventana centrada.
  return `<div class="pt-ped-item">
    <div class="pt-ped-row">
      ${sel}
      <span class="pt-ped-nombre">
        <span class="pt-ped-nombre-t">${escHtml(titulo)}${sub}${viejo}</span>
        ${nombreJugador ? `<span class="pt-ped-nombre-sub">${escHtml(nombreJugador)}</span>` : ''}
      </span>
      <span class="pt-ped-cambios">${nCambios} ${nCambios === 1 ? 'cambio' : 'cambios'}</span>
      <span class="pt-ped-costo">${_ptCostoTexto(_ptCostoPedido(p))}</span>
      <button type="button" class="btn btn-sm pt-ped-det-btn" data-onclick="ptVerDetallePedido('${escAttr(p._id)}')">${ICN.lista} Detalle</button>
      <button type="button" class="btn btn-sm pt-btn-rechazar pt-ped-rech-icn" title="Rechazar pedido" aria-label="Rechazar pedido" data-onclick="ptRechazarPedido('${escAttr(p._id)}')">${movil ? 'Rechazar' : ICN.x}</button>
    </div>
  </div>`;
}
function _ptTipoHTML(t, movil){
  // PEDPC: en escritorio la tarjeta va abierta (sin hidden; el CSS la mantiene visible) y en
  // angosto se pliega con aria-expanded. En el teléfono sigue el acordeón de siempre.
  return `<div class="pt-ped-type">
    <button type="button" class="pt-ped-type-toggle pt-ped-toggle" aria-expanded="false" data-onclick="ptPedToggle(this)">
      <span class="pt-ped-chev" aria-hidden="true"></span>
      <span class="pt-ped-type-nombre">${escHtml(t.label)}</span>
      <span class="pt-ped-cant">${t.pedidos.length}</span>
    </button>
    <div class="pt-ped-type-body"${movil ? ' hidden' : ''}>${t.pedidos.map(p => _ptPedidoHTML(p, movil)).join('')}</div>
  </div>`;
}
function _ptEquipoHTML(g, movil){
  const n = g.pedidos.length;
  const todos = movil ? '' : `<input type="checkbox" class="pt-ped-allchk" data-eq="${escAttr(g.key)}" aria-label="Seleccionar todos los pedidos de este equipo" data-onchange="ptPedSelEquipo(this)" ${g.aplicables ? 'checked' : 'disabled'}>`;
  const meta = `${n} ${n === 1 ? 'pedido' : 'pedidos'} · ${_ptCostoTexto(g.total)}`;
  return `<div class="pt-ped-team">
    <div class="pt-ped-team-hd">
      ${todos}
      <button type="button" class="pt-ped-team-toggle pt-ped-toggle" aria-expanded="false" data-onclick="ptPedToggle(this)">
        <span class="pt-ped-chev" aria-hidden="true"></span>
        <span class="pt-ped-team-nombre">${escHtml(g.nombre)}</span>
        <span class="pt-ped-team-meta">${meta}</span>
      </button>
      ${movil ? '' : `
        <span class="pt-ped-team-cant">${n}</span>
        <span class="pt-ped-team-tipos">${_ptChipsTipoHTML(g)}</span>
        <span class="pt-ped-team-costo">${_ptCostoTexto(g.total)}</span>`}
    </div>
    <div class="pt-ped-team-body" hidden>${g.tipos.map(t => _ptTipoHTML(t, movil)).join('')}</div>
  </div>`;
}
/* Abre/cierra un nivel del acordeón (equipo o tipo). El panel es hijo del
   contenedor del botón, no su hermano (el encabezado del equipo lo envuelve). */
function ptPedToggle(btn){
  if (!btn) return;
  const grupo = btn.closest('.pt-ped-team, .pt-ped-type');
  const body = grupo ? grupo.querySelector(':scope > .pt-ped-team-body, :scope > .pt-ped-type-body') : null;
  if (!body) return;
  const abierto = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', abierto ? 'false' : 'true');
  // PEDPC: en la lista de escritorio el cuerpo del tipo no usa hidden: lo muestra u oculta
  // el CSS según aria-expanded (ancho) o lo deja siempre abierto (escritorio).
  if (body.classList.contains('pt-ped-type-body') && btn.closest('.pt-ped-acc--escritorio')) return;
  body.hidden = abierto;
}
function _ptSelsDeEquipo(eq){
  return Array.from(document.querySelectorAll('#pt-tabcontent .ped-sel')).filter(el => el.dataset && el.dataset.eq === eq);
}
function _ptAllChkDeEquipo(eq){
  return Array.from(document.querySelectorAll('#pt-tabcontent .pt-ped-allchk')).find(el => el.dataset && el.dataset.eq === eq) || null;
}
/* Casilla del equipo: marca o desmarca todas sus casillas aplicables. */
function ptPedSelEquipo(chk){
  const eq = (chk.dataset && chk.dataset.eq) || '';
  for (const el of _ptSelsDeEquipo(eq)) if (!el.disabled) el.checked = !!chk.checked;
  chk.indeterminate = false;
  ptPedActualizarPanel();
}
/* Casilla de un pedido: deja la del equipo en marcada / indeterminada / vacía. */
function ptPedSelPedido(chk){
  const eq = (chk.dataset && chk.dataset.eq) || '';
  const sels = _ptSelsDeEquipo(eq).filter(el => !el.disabled);
  const todos = _ptAllChkDeEquipo(eq);
  if (todos){
    const marcados = sels.filter(el => el.checked).length;
    todos.checked = sels.length > 0 && marcados === sels.length;
    todos.indeterminate = marcados > 0 && marcados < sels.length;
  }
  ptPedActualizarPanel();
}

/* TOOLDET — ventana centrada con TODO el pedido. Bloquea el resto (overlay),
   tiene scroll propio y cierra con la X, Esc o tocando fuera. No rechaza nada:
   resalta en ámbar los cambios que Luis suele rechazar (altura, posiciones
   agregadas y edad) y ofrece el mismo rechazo con motivo que ya existe. */
function _ptDetalleLineaHTML(l){
  const revisar = _ptRevisarLinea(l);
  const hayAntes = l.from !== '' && l.from != null && String(l.from) !== String(l.to);
  return `<li class="pt-det-line${revisar ? ' pt-det-line--rev' : ''}">
    <span class="pt-det-lbl">${revisar ? ICN.alert : ''}${escHtml(l.label)}</span>
    <span class="pt-det-val">${hayAntes ? `<span class="pt-det-from">${escHtml(String(l.from))}</span><span class="pt-det-arrow" aria-hidden="true">→</span>` : ''}<span class="pt-det-to">${escHtml(l.to)}</span>${revisar ? '<span class="pt-det-rev">revisar</span>' : ''}</span>
  </li>`;
}
function _ptDetalleHTML(p){
  const equipo = p.teamName || (p.teamId != null ? String(p.teamId) : 'Sin equipo');
  const fecha = _ptFechaPedido(p);
  const lineas = _ptLineasDetalle(p);
  const nRevisar = lineas.filter(_ptRevisarLinea).length;
  const g = Number(p.fromGeneral || 0);
  const s = Number(p.fromSub || 0);
  const meta = [
    `<div class="pt-det-meta-i"><span>Equipo</span><b>${escHtml(equipo)}</b></div>`,
    p.playerName ? `<div class="pt-det-meta-i"><span>Jugador</span><b>${escHtml(p.playerName)}${p.dorsal != null && p.dorsal !== '' ? ' · #' + escHtml(String(p.dorsal)) : ''}</b></div>` : '',
    fecha ? `<div class="pt-det-meta-i"><span>Enviado</span><b>${escHtml(fecha)}</b></div>` : '',
    `<div class="pt-det-meta-i"><span>Costo total</span><b>${_ptCostoTexto(_ptCostoPedido(p))}</b></div>`,
    (g > 0 || s > 0)
      ? `<div class="pt-det-meta-i"><span>Reparto</span><b>General ${g.toLocaleString('es-CL')} YC · Bono ${s.toLocaleString('es-CL')} YC</b></div>`
      : '',
  ].join('');
  const cuerpo = lineas.length
    ? `<ul class="pt-det-list">${lineas.map(_ptDetalleLineaHTML).join('')}</ul>`
    : '<div class="pt-det-empty">Este pedido no trae detalle de cambios.</div>';
  return `<div class="pt-det-box" role="dialog" aria-modal="true" aria-labelledby="pt-det-tit" tabindex="-1">
    <div class="pt-det-hd">
      <div>
        <h3 id="pt-det-tit">${escHtml(_ptTituloPedido(p))}</h3>
        <div class="pt-det-hd-sub">${escHtml(equipo)}</div>
      </div>
      <button type="button" class="pt-side-close" data-onclick="ptCerrarDetallePedido()" title="Cerrar" aria-label="Cerrar">${ICN.x}</button>
    </div>
    <div class="pt-det-meta">${meta}</div>
    <div class="pt-det-body">
      <div class="pt-det-resumen"><b>${lineas.length} ${lineas.length === 1 ? 'cambio' : 'cambios'}</b>${nRevisar ? ` · <span class="pt-det-rev">${nRevisar} para revisar</span>` : ''}${_ptPedidoAplicable(p) ? '' : ' · <span class="pt-det-viejo">pedido viejo, sin datos aplicables</span>'}</div>
      ${cuerpo}
    </div>
    <div class="pt-det-foot">
      <button type="button" class="btn btn-sm pt-btn-rechazar" data-onclick="ptRechazarDesdeDetalle('${escAttr(p._id)}')">Rechazar</button>
      <button type="button" class="btn btn-sm" data-onclick="ptCerrarDetallePedido()">Cerrar</button>
    </div>
  </div>`;
}
function verDetallePedido(id){
  const p = PEDIDOS_PENDIENTES.find(x => String(x._id) === String(id));
  if (!p){ showToast('No se encontró el pedido. Recarga la lista.', 'error'); return; }
  cerrarDetallePedido();
  const ov = document.createElement('div');
  ov.id = 'pt-det-ov';
  ov.className = 'pt-det-ov';
  ov.setAttribute('data-onclick', 'ptCerrarDetalleFondo(event)');
  ov.innerHTML = _ptDetalleHTML(p);
  (_montadoEn || document.body).appendChild(ov);
  document.addEventListener('keydown', _ptDetalleEsc);
  const box = ov.querySelector('.pt-det-box');
  if (box) box.focus();
}
function cerrarDetallePedido(){
  document.getElementById('pt-det-ov')?.remove();
  document.removeEventListener('keydown', _ptDetalleEsc);
}
function _ptDetalleEsc(e){
  if (e && e.key === 'Escape'){
    e.preventDefault();
    cerrarDetallePedido();
  }
}
function cerrarDetalleFondo(e){
  if (e && e.target && e.target.id === 'pt-det-ov') cerrarDetallePedido();
}
/* El rechazo del modal es el mismo flujo de siempre: cierra el detalle y abre
   la ventana de motivo obligatorio. */
function rechazarDesdeDetalle(id){
  cerrarDetallePedido();
  rechazarPedido(id);
}

/* Tras pintar Pedidos: restaura el log de la ultima aplicacion (si vuelve a pintar) y
   carga el estado de cada plantilla en el bloque Publicar (solo PC). */
function _despuesDeRenderPedidos(movil, opts){
  if (opts && opts.logHtml){
    const el = document.getElementById('ped-log');
    if (el) el.innerHTML = opts.logHtml;
  }
  ptPedActualizarPanel();   // PEDPC: panel derecho en vivo con lo que nace marcado
  if (!movil && PLANO) cargarEstadoPublicacion(_equiposPublicables());
}

/* 3.B — rechazo con motivo obligatorio. Modal propio de la seccion (no prompt()), igual
   en PC y en el telefono. Cancelar no escribe nada; Rechazar exige un motivo no vacio. */
function rechazarPedido(id){
  const p = PEDIDOS_PENDIENTES.find(x => x._id === id);
  if (!p){ showToast('No se encontró el pedido. Recarga la lista.', 'error'); return; }
  cerrarRechazo();
  RECHAZO_ID = id;
  const equipo = p.teamName || String(p.teamId);
  const detalle = p.tipo === 'formacion' ? 'Formación' : (p.playerName || '');
  const ov = document.createElement('div');
  ov.id = 'pt-rech-ov';
  ov.className = 'pt-rech-ov';
  ov.innerHTML = `
    <div class="pt-rech-box" role="dialog" aria-modal="true" aria-labelledby="pt-rech-tit">
      <div class="pt-rech-hd"><h3 id="pt-rech-tit">Rechazar pedido</h3>
        <button class="pt-side-close" data-onclick="ptCerrarRechazo()" title="Cerrar" aria-label="Cerrar">${ICN.x}</button></div>
      <div class="pt-rech-sub">${escHtml(equipo)}${detalle ? ' · ' + escHtml(detalle) : ''}</div>
      <label class="pt-rech-lbl" for="pt-rech-motivo">Motivo (lo ve el presidente)</label>
      <textarea id="pt-rech-motivo" class="pt-rech-motivo" rows="4" data-oninput="ptRechazoMotivoInput(this)"></textarea>
      <div class="pt-rech-foot">
        <button class="btn btn-sm" data-onclick="ptCerrarRechazo()">Cancelar</button>
        <button class="btn btn-primary btn-sm" id="pt-rech-ok" disabled data-onclick="ptConfirmarRechazo()">Rechazar</button>
      </div>
    </div>`;
  (_montadoEn || document.body).appendChild(ov);
  setTimeout(() => document.getElementById('pt-rech-motivo')?.focus(), 0);
}
function cerrarRechazo(){
  document.getElementById('pt-rech-ov')?.remove();
  RECHAZO_ID = null;
}
function rechazoMotivoInput(el){
  const ok = document.getElementById('pt-rech-ok');
  if (ok) ok.disabled = !el.value.trim();
}
async function confirmarRechazo(){
  const id = RECHAZO_ID;
  const motivo = ((document.getElementById('pt-rech-motivo') || {}).value || '').trim();
  if (!id || !motivo) return; // motivo obligatorio: sin texto no se escribe nada
  const ok = document.getElementById('pt-rech-ok');
  if (ok) ok.disabled = true;
  try {
    await firebase.firestore().collection('pedidos_pes5').doc(id).update({
      estado: 'rechazado', motivo: motivo, rechazadoEn: new Date().toISOString(), rechazadoPor: AUTH.user.email,
    });
    showToast('Pedido rechazado.');
  } catch (e) {
    console.error('[pes5-tool] rechazar', e);
    showToast('No se pudo rechazar: ' + (e.message || e), 'error');
    if (ok) ok.disabled = false;
    return;
  }
  cerrarRechazo();
  renderPedidosTab();
}

/* Slice 2.0-4 (4.D): costo estimado de los pedidos que van a cobrar, antes del confirm. Usa las
   mismas comprobaciones basicas que aplicarPedidosSeleccionados (equipo, club y jugador en el
   plantel); la formacion es gratis. Es una cota: un pedido que luego se rechace por saldo o tope
   ya estaba contado, nunca queda sin contar. */
function _costoEstimadoPedidos(pedidos){
  let total = 0;
  for (const p of pedidos){
    if (p.tipo === 'formacion' || !p.cambios || p.registro == null) continue;
    const team = EQUIPOS_TSC.find(t => String(t.id) === String(p.teamId));
    if (!team || team.pes5ClubIdx == null || team.pes5ClubIdx !== p.pes5ClubIdx) continue;
    if (!PES5_EDITOR.leerPlantillaEquipo(PLANO, team.pes5ClubIdx).includes(p.registro)) continue;
    const j = PES5_EDITOR.leerJugadorCompleto(PLANO, p.registro);
    total += _costoTool(team.id, j, p.cambios).total;
  }
  return total;
}
/* 2.0-6.H: plantilla publicada de un equipo (lo que vio el presidente al pedir). */
async function _leerPublicadaDeEquipo(teamId){
  const snap = await firebase.firestore().collection('pes5_plantillas').doc(String(teamId)).get();
  if (!snap.exists) return null;
  const data = snap.data();
  return { data: data, ms: PES5_PLANTILLA.msDeFecha(data.publicadoEn) };
}
function _motivoSinVistaPublicada(pub, pedido){
  if (!pub) return 'no hay plantilla publicada para este equipo';
  return PES5_PLANTILLA.vistaDelPedido(pub.ms, PES5_PLANTILLA.msDeFecha(pedido.creadoEn));
}
function _motivoCambioFormacion(c){
  return 'la formación del save cambió desde la publicada que vio el presidente: slot ' + c.slot + ', ' + c.campo + ' era ' + c.era + ', ahora ' + c.ahora + ' (plantilla desactualizada)';
}
/* ============================================================
   PED2 — dos pedidos del mismo jugador en un mismo lote
   ------------------------------------------------------------
   Los pedidos de un equipo se aplican del mas viejo al mas nuevo
   (creadoEn) y, si dos tocan al mismo jugador, el segundo se valida
   contra «lo publicado + lo que este lote ya aplico», no contra lo
   publicado solo: al aplicarse el primero, la copia del save deja de
   coincidir con la publicacion en esos campos y antes se rechazaba
   como «plantilla desactualizada» (bug de produccion, San Martin de
   Mendoza: Niang, Ribery, Cana — el que «cambio» fue el otro pedido
   del mismo presidente, no Luis).
   Regla de costo: cada pedido paga lo suyo, medido contra el save como
   esta al aplicarlo. Lo que otro pedido del lote ya subio no se cobra
   dos veces (mismo valor: 0) y, si este pedido sube mas arriba, paga
   solo el tramo nuevo. El precio declarado (totalCost) se compara con
   el save actual y, cuando hay otro pedido del mismo jugador antes en
   el lote, tambien con la publicacion sola: el pedido pudo armarse
   antes de que el lote aplicara lo suyo (el presidente lo arma sobre
   lo publicado, no sobre la copia del save).
   ============================================================ */
// Cambios que este lote ya escribio en la copia para un jugador (registro), en orden.
function _cambiosDelLoteDe(cambiosDelLote, registro){
  return (registro == null ? null : cambiosDelLote[String(registro)]) || [];
}
// Anota los cambios de un pedido ya aplicado en la copia.
function _anotarCambiosDelLote(cambiosDelLote, registro, cambios){
  if (registro == null || !cambios) return;
  (cambiosDelLote[String(registro)] = cambiosDelLote[String(registro)] || []).push(cambios);
}
// Base contra la que se valida un pedido: lo publicado + los cambios previos del lote.
function _baseDelPedido(jPub, cambiosPrevios){
  return cambiosPrevios.length ? PES5_PLANTILLA.publicadoConAplicados(jPub, cambiosPrevios) : jPub;
}
// Costo de un pedido contra una base que no es el save (la plantilla publicada), con el MISMO
// perfil que se usa para cobrarle al jugador del save (`_costoTool` usa el perfil del jugador
// del save; aca se pasa explicito para no depender de leer un perfil de una base sintetica).
function _costoContraBase(teamId, jugadorDelSave, base, cambios){
  return YUNACOINS_RULES.costoCambios(base, cambios, YC_RULES, { perfil: _perfilTool(teamId, jugadorDelSave), cfg: _emparejarCfg() });
}
async function aplicarPedidosSeleccionados(){
  const logEl = document.getElementById('ped-log');
  const log = (msg, cls) => { if (!logEl) return; const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = msg; logEl.appendChild(d); };
  if (logEl) logEl.innerHTML = '';
  if (!PLANO){ showToast('Carga el save primero.', 'error'); return; }
  const ids = Array.from(document.querySelectorAll('.ped-sel:checked')).map(i => i.value);
  const pedidos = PEDIDOS_PENDIENTES.filter(p => ids.includes(p._id));
  if (!pedidos.length){ showToast('No hay pedidos seleccionados.', 'error'); return; }
  // EMP-80-2: perfiles fijados al día antes de cobrar (la misma funcion que usa el presidente).
  try { await _cargarPerfilesTool(); } catch (e) { showToast('No se pudieron leer los perfiles fijados: ' + (e.message || e), 'error'); return; }
  // EMP-80-2 (cierre): antes de evaluar o cobrar, se fija el plantel de cada equipo que tenga un jugador sin perfil
  // fijado. El save todavia es el original: el perfil sale del estado previo a las mejoras.
  try {
    for (const teamId of [...new Set(pedidos.map(p => String(p.teamId)))]){
      const team = EQUIPOS_TSC.find(t => String(t.id) === teamId);
      await _fijarPlantelSiFalta(team, pedidos.filter(p => String(p.teamId) === teamId && p.registro != null).map(p => p.registro));
    }
  } catch (e) { showToast('No se fijaron los perfiles de emparejar (' + (e.message || e) + '): no se aplicó nada.', 'error'); return; }
  // Slice 2.0-4 (4.D): si aplicar cobra algo, con la lista de Loyalty vencida se pide confirmacion explicita
  if (window.PES5_YUNACOINS && !(await window.PES5_YUNACOINS.guardiaCobro(log, _costoEstimadoPedidos(pedidos)))){ log('Aplicacion cancelada: el cobro necesita una lista de Loyalty reciente.', 'err'); return; }
  if (!confirm(`Se van a aplicar ${pedidos.length} pedido(s) al save y cobrar a cada equipo. ¿Confirmar?`)) return;

  // 1) evaluar y aplicar sobre una copia, equipo por equipo
  // 2.0-6.H: cada pedido se evalúa contra la plantilla publicada que vio el presidente.
  const publicadas = {};
  try {
    for (const teamId of [...new Set(pedidos.map(p => String(p.teamId)))]) publicadas[teamId] = await _leerPublicadaDeEquipo(teamId);
  } catch (e) {
    log('ERROR leyendo las plantillas publicadas: ' + (e.message || e) + ' (no se escribió nada)', 'err');
    return;
  }
  const copia = Uint8Array.from(PLANO);
  const aplicados = [];   // {pedido, team, info}
  const rechazados = [];  // {pedido, motivo}
  const porEquipo = {};
  pedidos.forEach(p => { (porEquipo[p.teamId] = porEquipo[p.teamId] || []).push(p); });
  // PED2: dentro de cada equipo se procesan del pedido mas viejo al mas nuevo (creadoEn); antes
  // el orden dependia de la lista. Asi «lo ya aplicado por el lote» es lo que el presidente ya
  // habia mandado antes, no lo que vino primero en la seleccion.
  Object.keys(porEquipo).forEach(t => { porEquipo[t] = PES5_PLANTILLA.pedidosEnOrdenDeCreacion(porEquipo[t]); });
  // PED2: cambios que este lote ya escribio en la copia, por jugador (registro).
  const cambiosDelLote = {};
  // PES5-TOPE-1: tope de atributos de la temporada actual (null = sin tope)
  const topeTemporada = _topeAtributoVigente();
  for (const teamId of Object.keys(porEquipo)){
    const team = EQUIPOS_TSC.find(t => String(t.id) === String(teamId));
    if (!team){ porEquipo[teamId].forEach(p => rechazados.push({ pedido: p, motivo: 'el equipo ya no existe' })); continue; }
    await _refrescarGastoTemporadaEquipo(team, true);
    const restantes = _restantesTemporada();
    let usadoGeneral = 0, usadoTotal = 0;
    // BONO-5: el bono es de cada jugador. Los pedidos pendientes de ESTE equipo que no
    // estan en este lote siguen reservando su bono; los del lote se recalculan ahora, asi
    // que no cuentan (su fromSub viejo no se usa). `usadoSubPorJugador` suma lo asignado
    // en este mismo lote cuando un jugador tiene mas de un pedido.
    const idsDelLote = new Set(porEquipo[teamId].map(x => x._id));
    const pendientesFuera = PEDIDOS_PENDIENTES
      .filter(x => x && x.estado === 'pendiente' && !idsDelLote.has(x._id)
        && String(x.teamId) === String(teamId) && x.registro != null)
      .map(x => ({ playerId: x.registro, fromSub: Number(x.fromSub) || 0, estado: 'pendiente' }));
    const usadoSubPorJugador = {};
    for (const p of porEquipo[teamId]){
      if (p.tipo === 'formacion'){
        if (!p.formacion || !Array.isArray(p.formacion.slots)){ rechazados.push({ pedido: p, motivo: 'sin datos de formación' }); continue; }
        if (team.pes5ClubIdx == null || team.pes5ClubIdx !== p.pes5ClubIdx){ rechazados.push({ pedido: p, motivo: 'el equipo cambió de club en el juego' }); continue; }
        const pub = publicadas[String(teamId)];
        const motivoVistaF = _motivoSinVistaPublicada(pub, p);
        if (motivoVistaF){ rechazados.push({ pedido: p, motivo: motivoVistaF }); continue; }
        if (!pub.data.formacion || !Array.isArray(pub.data.formacion.slots)){ rechazados.push({ pedido: p, motivo: 'no hay formación publicada para comparar' }); continue; }
        const formSave = PES5_EDITOR.leerFormacionEquipo(copia, team.pes5ClubIdx);
        const cambioF = formSave
          ? PES5_PLANTILLA.formacionContraPublicada(pub.data.formacion.slots, formSave.slots)
          : { slot: '—', campo: 'formación', era: 'publicada', ahora: 'no existe en el save' };
        if (cambioF){ rechazados.push({ pedido: p, motivo: _motivoCambioFormacion(cambioF) }); continue; }
        // FORM-1: el pedido trae los 11 titulares por slot. Pueden ser otros que los del save (un suplente
        // que entra): se reordena el roster antes de escribir. Lo que tiene que valer: los 11 están en el
        // plantel, son distintos, y el arquero (slot 0) no cambia.
        const roster = PES5_EDITOR.leerPlantillaEquipo(copia, team.pes5ClubIdx);
        const titularesPedido = [];
        for (let s = 0; s <= 10; s++) titularesPedido.push((p.formacion.slots || []).find(x => x && x.slot === s) || null);
        const idsOk = titularesPedido.every(x => x && x.jugador != null && roster.includes(x.jugador))
          && new Set(titularesPedido.map(x => x.jugador)).size === 11
          // FORM-2: el arquero (slot 0) puede cambiar, pero solo por otro portero del plantel
          && (titularesPedido[0].jugador === roster[0]
            || PES5_PLANTILLA.jugadorParaEditor(PES5_EDITOR, copia, titularesPedido[0].jugador, 0).primaryPos === 'GK');
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
        // Atomico: aplicarFormacionPedido trabaja sobre una copia y solo pasa el resultado a `copia`
        // si el orden de titulares Y la formacion salen bien (si no, el roster queda como estaba).
        let cambiosTitulares = 0;
        try {
          // ORD-4: los intercambios de banca (pares) se aplican en la misma operacion, en orden, o no se aplica nada
          cambiosTitulares = PES5_EDITOR.aplicarFormacionPedido(copia, team.pes5ClubIdx, titularesPedido.map(x => x.jugador), p.formacion.slots, p.bancaSwaps);
        } catch (e) {
          if (e && e.codigo === 'banca'){
            const nombre = PES5_EDITOR.nombreDeRegistro(copia, e.registro) || ('el jugador ' + e.registro);
            rechazados.push({ pedido: p, motivo: `${nombre} ya no está en la banca; el presidente debe pedir la alineación de nuevo` }); continue;
          }
          rechazados.push({ pedido: p, motivo: 'no se pudo escribir la formación: ' + (e.message || e) }); continue;
        }
        aplicados.push({ pedido: p, team, info: {
          total: 0, fromGeneral: 0, fromSub: 0, formacion: true,
          lineas: (p.lines && p.lines.length) ? p.lines.map(l => ({ label: l.label, from: l.from || '—', to: l.to || '' })) : [{ label: 'Formación', from: '—', to: p.formacion.nombre || '' }],
        } });
        const esAlin = (p.lines || []).some(l => l.label === 'Cambio de alineación');
        log(`${team.name}: ${esAlin ? 'cambio de alineación' : 'formación'} ${p.formacion.nombre || ''} aplicado (gratis)${cambiosTitulares ? ` · ${cambiosTitulares} cambio(s) de titulares` : ''}`, 'ok');
        continue;
      }
      if (p.tipo === 'emparejar'){
        // EMP-80-1: «emparejar a N» del presidente. Costo 0: no pasa por costoCambios, ni por el saldo, ni genera coins.
        if (p.registro == null || !p.cambios){ rechazados.push({ pedido: p, motivo: 'pedido de emparejar sin datos' }); continue; }
        if (team.pes5ClubIdx == null || team.pes5ClubIdx !== p.pes5ClubIdx){ rechazados.push({ pedido: p, motivo: 'el equipo cambió de club en el juego' }); continue; }
        if (!PES5_EDITOR.leerPlantillaEquipo(copia, team.pes5ClubIdx).includes(p.registro)){ rechazados.push({ pedido: p, motivo: 'el jugador ya no está en el plantel' }); continue; }
        const pubE = publicadas[String(teamId)];
        const motivoVistaE = _motivoSinVistaPublicada(pubE, p);
        if (motivoVistaE){ rechazados.push({ pedido: p, motivo: motivoVistaE }); continue; }
        const jPubE = (pubE.data.jugadores || []).find(x => x && x.id === 'r' + p.registro);
        if (!jPubE){ rechazados.push({ pedido: p, motivo: 'el jugador no está en la plantilla publicada' }); continue; }
        const jSaveE = PES5_PLANTILLA.jugadorParaEditor(PES5_EDITOR, copia, p.registro, 0);
        // PED2: si otro pedido del lote ya toco este jugador, la base suma lo que el lote aplico.
        const previosE = _cambiosDelLoteDe(cambiosDelLote, p.registro);
        const cambioE = PES5_PLANTILLA.cambiosContraSave(_baseDelPedido(jPubE, previosE), jSaveE, p.cambios);
        if (cambioE){ rechazados.push({ pedido: p, motivo: 'el jugador cambió desde el pedido (plantilla desactualizada): ' + cambioE.campo }); continue; }
        // Perfil y maximo se recalculan con las reglas actuales y el save actual (no se confia en el pedido).
        const cfgE = _emparejarCfg();
        const jE = PES5_EDITOR.leerJugadorCompleto(copia, p.registro);
        const fijadoE = _fijadoTool(team.id, p.registro);
        const perfilE = fijadoE != null ? YUNACOINS_RULES.perfilParaJugador(null, cfgE, fijadoE) : YUNACOINS_RULES.perfilEmparejar(jE, cfgE);
        if (!perfilE){ rechazados.push({ pedido: p, motivo: YUNACOINS_RULES.motivoSinEmparejar(jE, cfgE) || 'el jugador ya no es elegible para emparejar' }); continue; }
        const nivelCfg = YUNACOINS_RULES.rangoEmparejar(cfgE, perfilE).max;
        if (p.perfil !== perfilE || p.nivel !== nivelCfg){ rechazados.push({ pedido: p, motivo: 'el perfil o el nivel cambió desde el pedido (pedido ' + (p.perfil || '—') + ' ' + p.nivel + ', ahora ' + perfilE + ' ' + nivelCfg + ')' }); continue; }
        const motivoE = YUNACOINS_RULES.motivoRechazoEmparejar(jE, p.cambios, cfgE, topeTemporada, fijadoE);
        if (motivoE){ rechazados.push({ pedido: p, motivo: motivoE }); continue; }
        try {
          PES5_EDITOR.escribirJugadorCompleto(copia, p.registro, p.cambios);
        } catch (e) {
          rechazados.push({ pedido: p, motivo: 'valor inválido: ' + (e.message || e) }); continue;
        }
        const lineasE = YUNACOINS_RULES.cambiosEmparejar(jE, cfgE, fijadoE).lineas;
        _anotarCambiosDelLote(cambiosDelLote, p.registro, p.cambios);   // PED2: el lote ya lo escribio
        aplicados.push({ pedido: p, team, info: {
          pedidoId: p._id, playerId: p.registro, playerName: jE.nombre, subscriber: !!jE.subscriber,
          total: 0, lineas: lineasE, fromGeneral: 0, fromSub: 0, emparejar: true, nivel: nivelCfg,
        } });
        log(`${team.name} · ${jE.nombre}: emparejado a ${nivelCfg} (sin costo)`, 'ok');
        continue;
      }
      if (!p.cambios || p.registro == null){ rechazados.push({ pedido: p, motivo: 'pedido viejo sin datos aplicables' }); continue; }
      if (team.pes5ClubIdx == null || team.pes5ClubIdx !== p.pes5ClubIdx){ rechazados.push({ pedido: p, motivo: 'el equipo cambió de club en el juego' }); continue; }
      if (!PES5_EDITOR.leerPlantillaEquipo(copia, team.pes5ClubIdx).includes(p.registro)){ rechazados.push({ pedido: p, motivo: 'el jugador ya no está en el plantel' }); continue; }
      // 2.0-6.H: el pedido tiene que estar armado sobre la publicación vigente y el save debe seguir igual en esos campos.
      const pubM = publicadas[String(teamId)];
      const motivoVistaM = _motivoSinVistaPublicada(pubM, p);
      if (motivoVistaM){ rechazados.push({ pedido: p, motivo: motivoVistaM }); continue; }
      const jPub = (pubM.data.jugadores || []).find(x => x && x.id === 'r' + p.registro);
      if (!jPub){ rechazados.push({ pedido: p, motivo: 'el jugador no está en la plantilla publicada' }); continue; }
      const jSave = PES5_PLANTILLA.jugadorParaEditor(PES5_EDITOR, copia, p.registro, 0);
      // PED2: base de la validacion = lo publicado + lo que este lote ya aplico a este jugador.
      const previosM = _cambiosDelLoteDe(cambiosDelLote, p.registro);
      const cambioM = PES5_PLANTILLA.cambiosContraSave(_baseDelPedido(jPub, previosM), jSave, p.cambios);
      if (cambioM){ rechazados.push({ pedido: p, motivo: 'el jugador cambió desde el pedido (plantilla desactualizada): ' + cambioM.campo + ' era ' + cambioM.era + ', ahora ' + cambioM.ahora }); continue; }
      const j = PES5_EDITOR.leerJugadorCompleto(copia, p.registro);
      // PED2: `total` es el delta contra el save de ahora: lo que otro pedido del lote ya subio
      // a este jugador no se cobra dos veces y, si este pedido sube mas arriba, paga solo el
      // tramo nuevo. Si no hay otro pedido del mismo jugador antes en el lote, es el costo de
      // siempre (contra lo publicado, porque el save tiene que seguir igual en esos campos).
      const { total, lineas } = _costoTool(team.id, j, p.cambios);
      // EMP-80-2: el pedido tiene que costar lo mismo que hoy con la misma funcion (tramo gratis incluido).
      // Un pedido armado con otra tarifa se rechaza y el presidente lo arma de nuevo.
      // PED2: con otro pedido del mismo jugador antes en el lote, el precio declarado tambien
      // puede ser el de la publicacion sola (el pedido se armo antes de que el lote aplicara lo
      // suyo). Se acepta cualquiera de los dos y se cobra `total` (el delta).
      let precioDelPedido = total;   // el que se usa para la defensa de «cambio sin costo»
      if (previosM.length){
        const totalPublicado = _costoContraBase(team.id, j, PES5_PLANTILLA.jugadorReglasDeEditor(jPub), p.cambios).total;
        if (p.totalCost != null && Number(p.totalCost) !== total && Number(p.totalCost) !== totalPublicado){
          rechazados.push({ pedido: p, motivo: 'costo desactualizado: el pedido costaba ' + Number(p.totalCost).toLocaleString('es-CL') + ' y hoy cuesta ' + totalPublicado.toLocaleString('es-CL') + ' (se armó con otra tarifa)' });
          continue;
        }
        // Un pedido cuyos campos ya subio otro pedido del lote queda en 0 a proposito (no se
        // cobra dos veces): el precio contra lo publicado dice que el pedido si sube algo.
        precioDelPedido = totalPublicado;
      } else if (p.totalCost != null && Number(p.totalCost) !== total){
        rechazados.push({ pedido: p, motivo: 'costo desactualizado: el pedido costaba ' + Number(p.totalCost).toLocaleString('es-CL') + ' y hoy cuesta ' + total.toLocaleString('es-CL') + ' (se armó con otra tarifa)' });
        continue;
      }
      const motivoCosto = YUNACOINS_RULES.motivoRechazoMejora(j, p.cambios, precioDelPedido, topeTemporada, { perfil: _perfilTool(team.id, j), cfg: _emparejarCfg() });
      if (motivoCosto){ rechazados.push({ pedido: p, motivo: motivoCosto }); continue; }
      // BONO-5: el bono que puede usar este pedido es el del JUGADOR (su cuota menos lo que
      // ya gastó de su bono en el libro coins, menos los otros pedidos pendientes del mismo
      // equipo que no están en este lote y menos lo ya asignado en el lote).
      const bonoJugador = YUNACOINS_RULES.bonoRestanteJugador(
        GASTO_TEMPORADA_CACHE.transacciones || [], pendientesFuera, p.registro,
        _reglasEquipo(team.id).budgetSubscribers, !!j.subscriber);
      const reparto = YUNACOINS_RULES.distribuirCosto(total, Math.max(0, bonoJugador - (usadoSubPorJugador[p.registro] || 0)), !!j.subscriber);
      const pago = YUNACOINS_RULES.evaluarPago((team.yunacoin || 0) - usadoTotal, total, reparto.fromGeneral, restantes.general - usadoGeneral);
      if (!pago.ok){ rechazados.push({ pedido: p, motivo: pago.excedeSaldo ? 'saldo insuficiente' : 'se superó el tope de temporada' }); continue; }
      try {
        PES5_EDITOR.escribirJugadorCompleto(copia, p.registro, p.cambios);
      } catch (e) {
        rechazados.push({ pedido: p, motivo: 'valor inválido: ' + (e.message || e) }); continue;
      }
      _anotarCambiosDelLote(cambiosDelLote, p.registro, p.cambios);   // PED2: el lote ya lo escribio
      usadoGeneral += reparto.fromGeneral; usadoTotal += total;
      usadoSubPorJugador[p.registro] = (usadoSubPorJugador[p.registro] || 0) + reparto.fromSub;
      aplicados.push({ pedido: p, team, info: {
        pedidoId: p._id, playerId: p.registro, playerName: j.nombre, subscriber: !!j.subscriber,
        total, lineas, fromGeneral: reparto.fromGeneral, fromSub: reparto.fromSub,
      } });
      log(`${team.name} · ${j.nombre}: aplicado en la copia (${total.toLocaleString('es-CL')})`, 'ok');
    }
  }

  // 2) escribir el save (solo si hubo algo aplicado)
  let backup = null;
  // COBRO-1: con costo, la temporada de cobro tiene que admitir movimientos antes de escribir
  if (aplicados.some(a => a.info && a.info.total > 0) && !(await _validarCobroAntesDeEscribir(log))) return;
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
  GASTO_TEMPORADA_CACHE = { teamId: null, season: null, general: 0, sub: 0, transacciones: [] };
  showToast(`Pedidos: ${aplicados.length} aplicado(s), ${rechazados.length} rechazado(s).`);
  if (aplicados.some(a => !a.info.formacion)) log('Publica para que el presidente vea los cambios.');
  // El save cambió: los equipos tocados quedan desactualizados. El aviso y el bloque Publicar lo muestran.
  const logHtml = logEl ? logEl.innerHTML : '';
  setTimeout(async () => { await revisarPlantillasDesactualizadas(); renderPedidosTab({ logHtml }); }, 1500);
}

/* ============================================================
   PUBLICAR PLANTILLAS (dentro de Pedidos, solo PC)
   Antes era la pestaña Publicar (slice D). Mismo contenido y mismas funciones de publicacion.
   ============================================================ */
function _equiposPublicables(){
  return EQUIPOS_TSC.filter(t => t.status !== 'INACTIVO' && t.pes5ClubIdx != null);
}
function _bloquePublicarHTML(){
  const abre = '<section class="pt-pub-block"><h3 class="pt-pub-title">Publicar plantillas</h3>';
  if (!PLANO) return `${abre}<div class="pt-empty">${ICN.upload}<div>Carga el save para publicar plantillas.</div></div></section>`;
  const objetivo = _equiposPublicables();
  const filas = objetivo.map(t => {
    const clubNombre = CLUBES_PES5[t.pes5ClubIdx] || '?';
    const cantJugadores = PES5_EDITOR.leerPlantillaEquipo(PLANO, t.pes5ClubIdx).length;
    return `
      <tr>
        <td>${escHtml(t.name)}</td>
        <td style="font-size:12.5px;color:var(--txt3);">${escHtml(clubNombre)}</td>
        <td style="text-align:center;font-size:12.5px;">${cantJugadores}</td>
        <td style="font-size:12.5px;"><span id="pub-estado-${t.id}">…</span></td>
        <td style="text-align:right;"><button class="btn btn-sm" data-onclick="ptPublicarPlantillaDeEquipo(${t.id})">${ICN.upload} Publicar</button></td>
      </tr>`;
  }).join('');
  return `${abre}
      <div class="pt-sub">Copia la plantilla actual del save a la web para que cada presidente la vea en su editor. Para publicar todos los equipos a la vez, usa «Publicar save».</div>
      <div class="pt-tbl-wrap"><table class="tbl pt-tbl-publicar">
        <thead><tr><th>Equipo TSC</th><th>Club PES5</th><th style="text-align:center;">Jugadores</th><th>Última publicación</th><th></th></tr></thead>
        <tbody>${filas}</tbody>
      </table></div>
      <div class="pt-log" id="pub-log"></div>
    </section>`;
}

async function _hashPlano(){
  const buf = await crypto.subtle.digest('SHA-256', PLANO);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* Contenido publicable de UN equipo y su teamHash (SHA-256 del JSON canonico de ese equipo).
   Cambiar un jugador de otro equipo no cambia el teamHash de este (5.E). */
async function _contenidoEquipo(t){
  const jugadores = PES5_PLANTILLA.plantillaParaEditor(PES5_EDITOR, PLANO, t.pes5ClubIdx);
  const formacion = PES5_EDITOR.leerFormacionEquipo(PLANO, t.pes5ClubIdx);
  const teamHash = await _sha256Texto(PES5_PLANTILLA.contenidoDelEquipo(jugadores, formacion));
  return { jugadores, formacion, teamHash };
}
async function _teamHashDe(t){ return (await _contenidoEquipo(t)).teamHash; }
async function _sha256Texto(texto){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function cargarEstadoPublicacion(equipos){
  for (const t of equipos){
    const el = document.getElementById('pub-estado-' + t.id);
    if (!el) continue;
    try {
      const snap = await firebase.firestore().collection('pes5_plantillas').doc(String(t.id)).get();
      if (!snap.exists){ el.textContent = 'Nunca'; continue; }
      const d = snap.data();
      const cuando = d.publicadoEn && d.publicadoEn.toDate ? d.publicadoEn.toDate().toLocaleString('es-CL') : 'fecha desconocida';
      const vieja = PES5_PLANTILLA.plantillaDesactualizada(d, t, await _teamHashDe(t));
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
/* Escribe en pes5_plantillas las plantillas de `equipos` que cambiaron (debeReescribirPublicacion
   salta las iguales). Llena `escritos` con los nombres escritos, aun si falla a mitad de camino. */
async function _escribirPlantillas(equipos, escritos, linea){
  const saveHash = await _hashPlano();
  for (const t of equipos){
    const { jugadores, formacion, teamHash } = await _contenidoEquipo(t);
    // EMP-80-2: al publicar, los jugadores nuevos (fichajes) quedan con su perfil; los fijados no se tocan.
    try {
      const rp = await _completarPerfilesEquipo(t.id, t.pes5ClubIdx);
      if (rp.agregados) linea(`${t.name}: ${rp.agregados} perfil(es) de emparejar fijados`, 'ok');
    } catch (e) { linea(`${t.name}: no se fijaron los perfiles: ${e.message || e}`, 'err'); }
    // 2.0-6.H2: sin cambios no se reescribe (publicadoEn queda igual).
    const refPlantilla = firebase.firestore().collection('pes5_plantillas').doc(String(t.id));
    const previa = await refPlantilla.get();
    if (!PES5_PLANTILLA.debeReescribirPublicacion(previa.exists ? previa.data() : null, teamHash, t.pes5ClubIdx)){
      linea(`${t.name}: sin cambios, ya estaba publicada`, 'ok');
      continue;
    }
    await refPlantilla.set({
      teamId: t.id, teamName: t.name, pes5ClubIdx: t.pes5ClubIdx, pes5Club: CLUBES_PES5[t.pes5ClubIdx] || null,
      jugadores, formacion, saveHash, teamHash, publicadoPor: AUTH.user.email,
      publicadoEn: firebase.firestore.FieldValue.serverTimestamp(),
    });
    escritos.push(t.name);
    linea(`${t.name}: ${jugadores.length} jugadores publicados${formacion ? ` · formación ${formacion.nombre}` : ''}`, 'ok');
  }
}
async function _liberarBloqueoSiPublicado(equipos){
  if (BLOQUEO_EQUIPO != null && equipos.some(t => t.id === BLOQUEO_EQUIPO) && !Object.keys(CAMBIOS_PENDIENTES).length) await liberarBloqueoEquipo();
}
async function publicarPlantillas(ids){
  const log = document.getElementById('pub-log');
  const linea = (msg, cls) => { if (!log) return; const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = msg; log.appendChild(d); };
  if (!PLANO){ showToast('Carga el save primero.', 'error'); return; }
  const equipos = EQUIPOS_TSC.filter(t => t.status !== 'INACTIVO' && t.pes5ClubIdx != null && (!ids || ids.includes(t.id)));
  if (!equipos.length){ showToast('No hay equipos para publicar.', 'error'); return; }
  if (log) log.innerHTML = '';
  try {
    await _escribirPlantillas(equipos, [], linea);
    showToast(`Publicado: ${equipos.length} equipo(s).`);
    await _liberarBloqueoSiPublicado(equipos);
    return true;
  } catch (e) {
    console.error('[pes5-tool] publicar', e);
    linea('ERROR: ' + (e.message || e), 'err');
    showToast('Error al publicar: ' + (e.message || e), 'error');
    return false;
  } finally {
    cargarEstadoPublicacion(equipos);
    revisarPlantillasDesactualizadas();
  }
}

/* ============================================================
   PESTAÑA 5 · REGLAS (Slice R)
   ============================================================ */
/* Slice 2.0-4 (4.C): la pestana vive en js/pes5-yunacoins.js (carga con la Tool). */
function renderYunacoinsTab(){
  if (window.PES5_YUNACOINS) window.PES5_YUNACOINS.render(document.getElementById('pt-tabcontent'));
}
function _bloqueTopesExtraHTML(){
  if (STATE.season == null){
    return `<div class="pt-fieldgrp" style="margin-bottom:18px;"><div class="pt-fieldgrp-title">Tope extra por equipo</div>
      <div style="font-size:12px;color:var(--txt3);">No hay temporada activa: el tope extra se asigna por temporada.</div></div>`;
  }
  const activos = EQUIPOS_TSC.filter(t => t.status === 'ACTIVO').slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'es'));
  const nombre = id => { const t = EQUIPOS_TSC.find(x => String(x.id) === String(id)); return t ? t.name : ('Equipo ' + id); };
  const filas = Object.keys(YC_TOPES_EXTRA).map(id => {
    const e = YC_TOPES_EXTRA[id];
    const total = (YC_RULES.budgetGeneral || 0) + e.extra;
    return `<tr>
      <td>${escHtml(nombre(id))}</td>
      <td style="text-align:right;">+${e.extra.toLocaleString('es-CL')}</td>
      <td style="text-align:right;">${total.toLocaleString('es-CL')}</td>
      <td>${escHtml(e.motivo || '')}</td>
      <td><button class="btn btn-sm" data-onclick="ptQuitarTopeExtra('${escAttr(id)}')">Quitar</button></td>
    </tr>`;
  }).join('');
  return `
    <div class="pt-fieldgrp" style="margin-bottom:18px;">
      <div class="pt-fieldgrp-title">Tope extra por equipo · temporada activa</div>
      <div style="font-size:12px;color:var(--txt3);margin-bottom:10px;">Premio para campeones o equipos con buen desempeño: se suma al tope general solo para ese equipo y solo esta temporada. No da YunaCoins: el equipo paga con su saldo.</div>
      ${filas ? `<table class="tbl" style="width:100%;margin-bottom:12px;">
        <thead><tr><th>Equipo</th><th style="text-align:right;">Extra</th><th style="text-align:right;">Tope total</th><th>Motivo</th><th></th></tr></thead>
        <tbody>${filas}</tbody></table>` : `<div style="font-size:12px;color:var(--txt3);margin-bottom:12px;">Ningún equipo tiene tope extra.</div>`}
      <div class="pt-field">
        <label>Equipo</label>
        <select id="te-equipo"><option value="">Elige un equipo</option>${activos.map(t => `<option value="${escAttr(t.id)}">${escHtml(t.name)}</option>`).join('')}</select>
      </div>
      <div class="pt-field">
        <label>Extra (YunaCoins)<br><span style="font-size:11px;color:var(--txt3);">0 lo quita.</span></label>
        <input type="number" min="0" step="500" id="te-extra" value="" style="width:100px;">
      </div>
      <div class="pt-field">
        <label>Motivo</label>
        <input type="text" maxlength="100" id="te-motivo" placeholder="Ej: Campeón T2" style="width:200px;">
      </div>
      <div id="te-errores"></div>
      <div class="pt-acciones">
        <button class="btn btn-primary btn-sm" data-onclick="ptGuardarTopeExtra()">${ICN.save} Guardar tope extra</button>
      </div>
      ${YC_TOPES_EXTRA_META && YC_TOPES_EXTRA_META.actualizadoEn ? `<div style="font-size:12px;color:var(--txt3);margin-top:8px;">Última actualización: ${new Date(YC_TOPES_EXTRA_META.actualizadoEn).toLocaleString('es-CL')} por ${escHtml(YC_TOPES_EXTRA_META.actualizadoPor || '')}</div>` : ''}
    </div>`;
}

async function _escribirTopesExtra(nuevo){
  const equipos = {};
  Object.keys(nuevo).forEach(id => { equipos[id] = { extra: nuevo[id].extra, motivo: nuevo[id].motivo || '' }; });
  const doc = { temporada: STATE.season, equipos, actualizadoEn: new Date().toISOString(), actualizadoPor: AUTH.user.email };
  await _docTopesExtra().set(doc);
  YC_TOPES_EXTRA = YUNACOINS_RULES.normalizarTopesExtra(doc);
  YC_TOPES_EXTRA_META = { actualizadoEn: doc.actualizadoEn, actualizadoPor: doc.actualizadoPor };
}

async function guardarTopeExtra(){
  const box = document.getElementById('te-errores');
  const id = document.getElementById('te-equipo').value;
  const extra = parseInt(document.getElementById('te-extra').value, 10);
  const motivo = String(document.getElementById('te-motivo').value || '').trim().slice(0, 100);
  const err = msg => { box.innerHTML = `<div style="color:var(--red,#f87171);font-size:12px;">${escHtml(msg)}</div>`; };
  if (!id) return err('Elige un equipo.');
  if (!Number.isFinite(extra) || extra < 0) return err('El extra tiene que ser un número mayor o igual a 0.');
  const nuevo = Object.assign({}, YC_TOPES_EXTRA);
  if (extra === 0) delete nuevo[id]; else nuevo[id] = { extra, motivo };
  try {
    await _escribirTopesExtra(nuevo);
    showToast(extra === 0 ? 'Tope extra quitado.' : 'Tope extra guardado.');
    renderReglasTab();
  } catch (e) {
    console.error('[pes5-tool] error guardando tope extra', e);
    err('No se pudo guardar: ' + (e.message || String(e)));
  }
}

async function quitarTopeExtra(id){
  if (!YC_TOPES_EXTRA[id]) return;
  const nuevo = Object.assign({}, YC_TOPES_EXTRA);
  delete nuevo[id];
  try {
    await _escribirTopesExtra(nuevo);
    showToast('Tope extra quitado.');
    renderReglasTab();
  } catch (e) {
    console.error('[pes5-tool] error quitando tope extra', e);
    showToast('No se pudo quitar: ' + (e.message || e), 'error');
  }
}

/* Bloque «Tope de atributos por temporada del juego» (PES5-TOPE-1): la lista editable
   y, debajo, qué temporadas cuenta la web como temporada N del juego actual. */
function _bloqueTopeAtributoHTML(r){
  const info = YUNACOINS_RULES.temporadaActualDelJuego(YC_SEASONS, STATE.season);
  let cuenta ='<div style="font-size:12px;color:var(--txt3);margin-top:8px;">No hay temporada actual cargada: sin tope por ahora.</div>';
  if (info){
    const nombre = (n) => { const s = YC_SEASONS.find(x => Number(x.number) === n); return s && s.name ? ' (' + escHtml(s.name) + ')' : ''; };
    const activa = (YC_SEASONS || []).find(s => s.status === 'active');
    const filas = info.temporadas.map((n, i) => `<div style="font-size:12px;">${i + 1}.ª del juego: temporada ${n}${nombre(n)}${activa && n === Number(activa.number) ? ' <b>(activa)</b>' : ''}</div>`).join('');
    const tope = YUNACOINS_RULES.topeAtributo(info.ordinal, r.topesAtributo);
    const nombreT = (n) => { const s = YC_SEASONS.find(x => Number(x.number) === n); return s ? escHtml(getSeasonName(s)) : ('T' + n); };
    const primera = info.temporadas.length ? nombreT(info.temporadas[0]) : '—';
    cuenta = `<div style="font-size:13px;font-weight:600;margin-top:8px;">${escHtml(info.juego)} · 1.ª temporada = ${primera} · tope ${tope == null ? 'sin tope' : tope}</div>
      <div style="font-size:12px;color:var(--txt2);margin-top:6px;">La web cuenta así sus temporadas del juego:</div>${filas}`;
  }
  return `<div class="pt-fieldgrp" style="margin-bottom:18px;">
      <div class="pt-fieldgrp-title">Tope de atributos por temporada del juego</div>
      <div class="pt-field">
        <label>Tope por temporada (0-99), separados por coma<br><span style="font-size:11px;color:var(--txt3);">Ej.: 90 = la 1.ª temporada del juego tiene tope 90; "90, 93" = la 2.ª sube a 93. Si falta un valor se hereda el último. Vacío = sin tope.</span></label>
        <input type="text" id="rg-topesAtributo" value="${escAttr(r.topesAtributo.join(', '))}" style="width:220px;">
      </div>
      ${cuenta}
    </div>`;
}

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
          <label>Bono por jugador suscriptor</label>
          <input type="number" min="0" step="500" id="rg-budgetSubscribers" value="${r.budgetSubscribers}" style="width:100px;">
          <div class="pt-field-hint">se multiplica por los suscriptores («$») del equipo; solo esos jugadores gastan el bono</div>
        </div>
      </div>

      ${_bloqueTopeAtributoHTML(r)}

      ${_bloqueTopesExtraHTML()}

      <div class="pt-fieldgrp" style="margin-bottom:18px;">
        <div class="pt-fieldgrp-title">Costo por punto (atributos 0-99)</div>
        ${['Hasta 80','81 a 85','86 a 90','91 a 95','96 a 99'].map((label, i) => `
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
      ${_emparejarReglasHTML(r)}

      <div id="rg-errores"></div>

      <div class="pt-acciones">
        <button class="btn btn-primary btn-sm" data-onclick="ptGuardarReglas()">${ICN.save} Guardar</button>
        <button class="btn btn-sm" data-onclick="ptRestaurarReglasDefault()">Restaurar valores por defecto</button>
      </div>
    </div>
  `;
}

/* EMP-80-1 · bloque «Emparejamiento sin costo». Los valores los define Luis; el codigo no trae numeros.
   Los ejemplos son solo texto de ayuda (placeholder), nunca se guardan. */
function _emparejarReglasHTML(r){
  const e = (r && r.emparejar) || {};
  const val = (x) => (x == null || x === '' ? '' : String(x));
  // Cada perfil trae sus propias condiciones (lesion y escala 1-8). Vacio = ese chequeo no se aplica.
  const fila = (nombre, etiqueta) => {
    const p = e[nombre] || {};
    // Cada fila: label completo a la izquierda y su input a la derecha (ver .pt-emp-fila en pes5-tool.css).
    return `<div class="pt-emp-perfil">
      <div class="pt-emp-perfil-nombre">${etiqueta}</div>
      <div class="pt-emp-fila"><label for="rg-emp-${nombre}-min">Mínimo</label>
        <input type="number" min="1" max="99" step="1" id="rg-emp-${nombre}-min" value="${escAttr(val(p.min))}"></div>
      <div class="pt-emp-fila"><label for="rg-emp-${nombre}-max">Máximo</label>
        <input type="number" min="1" max="99" step="1" id="rg-emp-${nombre}-max" value="${escAttr(val(p.max))}"></div>
      <div class="pt-emp-fila pt-emp-fila-check"><label class="pt-toggle" for="rg-emp-${nombre}-subir"><input type="checkbox" id="rg-emp-${nombre}-subir"${p.subir === true ? ' checked' : ''}> Subir gratis hasta el máximo</label></div>
      <div class="pt-emp-fila"><label for="rg-emp-${nombre}-lesion">Resistencia a lesiones</label>
        <select id="rg-emp-${nombre}-lesion">${['', 'A', 'B', 'C'].map(x => `<option value="${x}"${(p.lesion || '') === x ? ' selected' : ''}>${x || '—'}</option>`).join('')}</select></div>
      <div class="pt-emp-fila"><label for="rg-emp-${nombre}-escala8">Parámetros 1-8</label>
        <input type="number" min="1" max="8" step="1" id="rg-emp-${nombre}-escala8" value="${escAttr(val(p.escala8))}" placeholder="4"></div>
    </div>`;
  };
  return `<div class="pt-fieldgrp" style="margin-bottom:18px;">
    <div class="pt-fieldgrp-title">Emparejamiento sin costo</div>
    <div style="font-size:12px;color:var(--txt3);margin-bottom:10px;">Cada perfil tiene sus condiciones. Vacío = ese chequeo no se aplica a ese perfil. Un perfil sin «Subir gratis» no tiene botón. Ejemplo: Base 79–80 con lesión C; Suscriptor 84–85 con lesión B; parámetros 1-8 en 4.</div>
    ${fila('base', 'Base')}
    ${fila('suscriptor', 'Suscriptor')}
  </div>`;
}
// Lee el bloque del formulario. Vacio = null (perfil sin rango, o chequeo que no se aplica). Texto no numerico = NaN (lo rechaza validarEmparejar).
function _leerEmparejarForm(){
  const num = (id) => {
    const t = String(document.getElementById(id).value || '').trim();
    if (t === '') return null;
    const v = Number(t);
    return Number.isFinite(v) ? v : NaN;
  };
  const perfil = (nombre) => ({
    min: num('rg-emp-' + nombre + '-min'),
    max: num('rg-emp-' + nombre + '-max'),
    subir: document.getElementById('rg-emp-' + nombre + '-subir').checked,
    lesion: document.getElementById('rg-emp-' + nombre + '-lesion').value || null,
    escala8: num('rg-emp-' + nombre + '-escala8'),
  });
  return {
    base: perfil('base'),
    suscriptor: perfil('suscriptor'),
  };
}

function _leerFormReglas(){
  const n = (id) => { const v = parseInt(document.getElementById(id).value, 10); return Number.isFinite(v) ? v : NaN; };
  return {
    bandCosts: [0,1,2,3,4].map(i => n('rg-band-' + i)),
    scale8Cost: n('rg-scale8Cost'), abilityCost: n('rg-abilityCost'), injuryCost: n('rg-injuryCost'),
    budgetGeneral: n('rg-budgetGeneral'), budgetSubscribers: n('rg-budgetSubscribers'),
    maxPositions: n('rg-maxPositions'),
    emparejar: _leerEmparejarForm(),
    topesAtributo: _leerListaTopes(document.getElementById('rg-topesAtributo').value),
  };
}

/* "90, 92" -> [90, 92]. Vacío -> [] (sin tope). Lo que no es número queda NaN y lo rechaza validarReglas. */
function _leerListaTopes(texto){
  const t = String(texto || '').trim();
  if (!t) return [];
  return t.split(/[,;\s]+/).filter(x => x !== '').map(x => Number(x));
}

function restaurarReglasDefault(){
  const d = YUNACOINS_RULES.DEFAULT_RULES;
  d.bandCosts.forEach((v, i) => { document.getElementById('rg-band-' + i).value = v; });
  ['scale8Cost','abilityCost','injuryCost','budgetGeneral','budgetSubscribers','maxPositions'].forEach(k => { document.getElementById('rg-' + k).value = d[k]; });
  // EMP-80-1: el emparejar no tiene valores por defecto: se vacia el formulario.
  ['base', 'suscriptor'].forEach(n => {
    document.getElementById('rg-emp-' + n + '-min').value = '';
    document.getElementById('rg-emp-' + n + '-max').value = '';
    document.getElementById('rg-emp-' + n + '-subir').checked = false;
    document.getElementById('rg-emp-' + n + '-lesion').value = '';
    document.getElementById('rg-emp-' + n + '-escala8').value = '';
  });
  document.getElementById('rg-topesAtributo').value = d.topesAtributo.join(', ');
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

/* ============================================================
   PAUSA-1 · pausa de mejoras mientras Luis edita el save
   pes5_config/pausa = { pausado, por, desde }. Lo escribe solo el admin (reglas); los presidentes lo leen en vivo.
   Los pedidos que llegan con la pausa activa los rechaza el servidor (regla de create de pedidos_pes5).
   ============================================================ */
let PAUSA_ESTADO = null; // { pausado, desde: Date|null } · null mientras no se lee
const PAUSA_REF = () => firebase.firestore().collection('pes5_config').doc('pausa');
function _fechaPausa(v){ return v && v.toDate ? v.toDate() : (v ? new Date(v) : null); }
function _horaPausa(d){ return d ? d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''; }

async function cargarPausaTool(){
  if (!AUTH.user || AUTH.role !== 'admin') return;
  try {
    const s = await PAUSA_REF().get();
    const d = s.exists ? s.data() : {};
    PAUSA_ESTADO = { pausado: d.pausado === true, desde: _fechaPausa(d.desde) };
  } catch (e) {
    console.warn('[pes5-tool] pausa', e);
    PAUSA_ESTADO = { pausado: false, desde: null };
  }
  await cargarSavePublicadoTool();
  renderPausaTool();
}

function renderPausaTool(){
  const el = document.getElementById('pt-pausa');
  if (!el) return;
  if (!PAUSA_ESTADO){ el.innerHTML = ''; return; }
  const pausado = PAUSA_ESTADO.pausado;
  // SAVE-1 / SYNC-1: «Publicar save» va junto a «Pausar mejoras». Sin save abierto queda deshabilitado con un hint.
  const sinSave = !SAVE_META;
  const pub = SAVE_PUB_META;
  el.innerHTML = `
    <div class="pt-pausa${pausado ? ' on' : ''}">
      <span class="pt-pausa-txt">${pausado
        ? `${ICN.alert} Mejoras pausadas desde ${escHtml(_horaPausa(PAUSA_ESTADO.desde) || '—')}`
        : 'Mejoras activas: los presidentes pueden pedir cambios'}</span>
      <span class="pt-pausa-acciones">
        ${sinSave ? '<span class="pt-hint">Abre el save (carpeta del juego) para poder publicarlo.</span>' : ''}
        <button class="btn btn-sm btn-primary" data-onclick="ptPublicarSaveClick()"${sinSave ? ' disabled' : ''}>${ICN.upload} Publicar save</button>
        <button class="btn btn-sm" data-onclick="ptPausaToggle()">${pausado ? 'Reanudar mejoras' : 'Pausar mejoras'}</button>
      </span>
    </div>
    <div class="pt-pausa pt-save-pub">
      <span class="pt-pausa-txt">${ICN.save} ${pub
        ? `Save publicado: <b>${escHtml(SAVE_PUBLICADO.fechaCorta(pub.subidoEn))}</b> · por ${escHtml(pub.subidoPor || '—')}`
        : 'Todavía no hay save publicado'}</span>
    </div>`;
}

/* SAVE-1 · save publicado (lo baja el presidente desde Mejoras). Metadatos en pes5_config/save. */
let SAVE_PUB_META = null; // {subidoPor, subidoEn: Date|null, tamano, nombreArchivo}; null = nada publicado

async function cargarSavePublicadoTool(){
  try {
    SAVE_PUB_META = await SAVE_PUBLICADO.leerMeta();
  } catch (e) {
    console.warn('[pes5-tool] save publicado', e);
    SAVE_PUB_META = null;
  }
}

function _nombreAdminSave(){
  return (AUTH.profile && AUTH.profile.displayName) || (AUTH.user && AUTH.user.displayName) || 'Admin';
}

/* SYNC-1 · «Publicar save» (un solo boton). Al confirmar, en este orden:
   a) relee el archivo de la carpeta; b) publica las plantillas que cambiaron (todos los equipos
   TSC activos con pes5ClubIdx, tambien sin presidente); c) sube el save a Storage; d) si la casilla
   «Reanudar mejoras al terminar» esta marcada y las mejoras estan pausadas, las reanuda.
   Si un paso falla, se detiene y el resumen dice que quedo hecho y que no. */
let _PUB_SAVE_OCUPADO = false;

// Lo que muestra la confirmacion: relee, cuenta las plantillas que cambian y revisa las dos guardas.
async function _prepararPublicarSave(){
  const leido = await cargarSaveDesdeCarpeta();
  await cargarSavePublicadoTool();
  const equipos = _equiposPublicables();
  const cambian = [];
  for (const t of equipos){
    const { teamHash } = await _contenidoEquipo(t);
    const previa = await firebase.firestore().collection('pes5_plantillas').doc(String(t.id)).get();
    if (PES5_PLANTILLA.debeReescribirPublicacion(previa.exists ? previa.data() : null, teamHash, t.pes5ClubIdx)) cambian.push(t);
  }
  const pend = await firebase.firestore().collection('pedidos_pes5').where('estado', '==', 'pendiente').get();
  const afectados = PES5_PLANTILLA.pedidosDeEquipos(pend.docs.map(d => Object.assign({ _id: d.id }, d.data())), cambian.map(t => t.id));
  return {
    leido, cambian, afectados,
    saveViejo: PES5_PLANTILLA.saveMasViejoQuePublicado(leido.lastModified, SAVE_PUB_META),
  };
}

async function ptPublicarSaveClick(){
  if (_PUB_SAVE_OCUPADO) return;
  if (!SAVE_META) return showToast('Abre el save antes de publicarlo.', 'error');
  _PUB_SAVE_OCUPADO = true;
  try {
    _mostrarConfirmPublicarSave(await _prepararPublicarSave());
  } catch (e) {
    console.error('[pes5-tool] preparar publicar save', e);
    showToast('No se pudo preparar la publicación: ' + (e.message || e), 'error');
  } finally { _PUB_SAVE_OCUPADO = false; }
}

function _mostrarConfirmPublicarSave(plan){
  document.getElementById('pt-pub-save-ov')?.remove();
  const pausado = !!(PAUSA_ESTADO && PAUSA_ESTADO.pausado);
  const n = plan.cambian.length;
  const pub = SAVE_PUB_META;
  const fechaPub = pub && pub.subidoEn ? SAVE_PUBLICADO.fechaCorta(pub.subidoEn) : null;
  const resumen = n === 0
    ? 'Ninguna plantilla cambió: solo se sube el save.'
    : `Se publican <b>${n}</b> ${n === 1 ? 'plantilla cambiada' : 'plantillas cambiadas'}.`;
  const reemplazo = fechaPub
    ? `Se reemplaza el save publicado del <b>${escHtml(fechaPub)}</b>${pub.subidoPor ? ` (de ${escHtml(pub.subidoPor)})` : ''}.`
    : 'Es el primer save publicado.';
  const avisos = [];
  if (plan.afectados.length){
    const k = plan.afectados.length;
    avisos.push(`<div class="pt-aviso">${ICN.alert} Hay ${k} ${k === 1 ? 'pedido pendiente' : 'pedidos pendientes'} de equipos cuya plantilla cambia: estos pedidos quedarán viejos.</div>`);
  }
  if (plan.saveViejo){
    avisos.push(`<div class="pt-aviso fuerte">${ICN.alert} Tu save es más viejo que el publicado (de ${escHtml(pub.subidoPor || '—')}, ${escHtml(fechaPub || '—')}). Publicarlo pisaría esos cambios.</div>`);
  }
  const hayAviso = avisos.length > 0;
  const reanudarHtml = pausado
    ? '<label class="pt-chk"><input type="checkbox" id="pt-pub-save-reanudar" checked> Reanudar mejoras al terminar</label>'
    : '';
  const ov = document.createElement('div');
  ov.id = 'pt-pub-save-ov';
  ov.className = 'confirm-overlay open';
  ov.innerHTML = `
    <div class="confirm-box">
      <h4>Publicar save</h4>
      <p>${resumen}</p>
      <p>${reemplazo}</p>
      ${avisos.join('')}
      ${reanudarHtml}
      <div class="confirm-actions">
        <button class="btn" data-onclick="ptCerrarPublicarSave()">Volver</button>
        <button class="btn ${plan.saveViejo ? 'btn-danger' : 'btn-primary'}" data-onclick="ptPublicarSaveConfirmar()">${hayAviso ? 'Publicar igual' : 'Publicar save'}</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
}

function ptCerrarPublicarSave(){ document.getElementById('pt-pub-save-ov')?.remove(); }

async function ptPublicarSaveConfirmar(){
  if (_PUB_SAVE_OCUPADO) return;
  const chk = document.getElementById('pt-pub-save-reanudar');
  const reanudar = !!(chk && chk.checked);
  ptCerrarPublicarSave();
  _PUB_SAVE_OCUPADO = true;
  try { await _ejecutarPublicarSave(reanudar); }
  finally { _PUB_SAVE_OCUPADO = false; }
}

async function _ejecutarPublicarSave(reanudar){
  const hecho = [];
  const noHecho = [];
  const escritos = [];
  let paso = 'a';
  try {
    // a) relee: lo que se publica es lo que hay en el archivo en este momento
    const leido = await cargarSaveDesdeCarpeta();
    hecho.push('Save releído de la carpeta.');
    // b) plantillas que cambiaron (incluye equipos sin presidente vinculado)
    paso = 'b';
    const equipos = _equiposPublicables();
    await _escribirPlantillas(equipos, escritos, () => {});
    await _liberarBloqueoSiPublicado(equipos);
    hecho.push(escritos.length
      ? `Plantillas publicadas (${escritos.length}): ${escritos.join(', ')}.`
      : 'Plantillas: ninguna cambió.');
    // c) sube el save que se acaba de leer (mismos bytes que quedaron en PLANO)
    paso = 'c';
    const blob = new Blob([leido.bytes], { type: 'application/octet-stream' });
    SAVE_PUB_META = await SAVE_PUBLICADO.subirBlob(blob, { subidoPor: _nombreAdminSave(), nombreArchivo: leido.nombre, lastModified: leido.lastModified });
    hecho.push('Save subido: los presidentes ya pueden descargarlo desde Mejoras.');
    // d) reanuda mejoras, solo si todo lo anterior salio bien
    paso = 'd';
    if (PAUSA_ESTADO && PAUSA_ESTADO.pausado){
      if (reanudar){
        const ok = await escribirPausaTool(false);
        if (!ok) throw new Error('no se pudieron reanudar las mejoras');
        hecho.push('Mejoras reanudadas.');
      } else {
        hecho.push('Mejoras siguen pausadas (no se reanudaron).');
      }
    }
    showToast('Save publicado.');
    _mostrarResultadoPublicarSave(true, hecho, noHecho);
  } catch (e) {
    console.error('[pes5-tool] publicar save', e);
    const msg = e.message || String(e);
    if (paso === 'b' && escritos.length) hecho.push(`Plantillas publicadas antes del error (${escritos.length}): ${escritos.join(', ')}.`);
    if (paso === 'a') noHecho.push(`No se pudo releer el save (${msg}). No se publicó nada.`);
    if (paso === 'b') noHecho.push(`Plantillas: error al publicar (${msg}). No se subió el save y no se reanudaron las mejoras.`);
    if (paso === 'c') noHecho.push(`Save no subido (${msg}). No se reanudaron las mejoras.`);
    if (paso === 'd') noHecho.push(`Mejoras no reanudadas (${msg}). Reanúdalas con el botón de la barra.`);
    _mostrarResultadoPublicarSave(false, hecho, noHecho);
  } finally {
    renderPausaTool();
    renderStatusBar();
    cargarEstadoPublicacion(_equiposPublicables());
    revisarPlantillasDesactualizadas();
  }
}

function _mostrarResultadoPublicarSave(ok, hecho, noHecho){
  document.getElementById('pt-pub-save-ov')?.remove();
  const lista = arr => arr.map(t => `<li>${escHtml(t)}</li>`).join('');
  const ov = document.createElement('div');
  ov.id = 'pt-pub-save-ov';
  ov.className = 'confirm-overlay open';
  ov.innerHTML = `
    <div class="confirm-box">
      <h4>${ok ? 'Save publicado' : 'La publicación se detuvo'}</h4>
      ${hecho.length ? `<p><b>Quedó hecho:</b></p><ul>${lista(hecho)}</ul>` : ''}
      ${noHecho.length ? `<p><b>No quedó hecho:</b></p><ul>${lista(noHecho)}</ul>` : ''}
      <div class="confirm-actions"><button class="btn" data-onclick="ptCerrarPublicarSave()">Cerrar</button></div>
    </div>`;
  document.body.appendChild(ov);
}

async function ptPausaToggle(){
  if (!PAUSA_ESTADO) return;
  if (PAUSA_ESTADO.pausado) return escribirPausaTool(false);
  let n = 0;
  try {
    n = (await firebase.firestore().collection('pedidos_pes5').where('estado', '==', 'pendiente').get()).size;
  } catch (e) {
    showToast('No se pudo contar los pedidos pendientes: ' + (e.message || e), 'error');
    return;
  }
  if (n > 0) return mostrarAvisoPausaTool(n);
  return escribirPausaTool(true);
}

function mostrarAvisoPausaTool(n){
  document.getElementById('pt-pausa-ov')?.remove();
  const ov = document.createElement('div');
  ov.id = 'pt-pausa-ov';
  ov.className = 'confirm-overlay open';
  const plural = n === 1 ? 'Hay 1 pedido pendiente' : `Hay ${n} pedidos pendientes`;
  ov.innerHTML = `
    <div class="confirm-box">
      <h4>Pausar mejoras</h4>
      <p>${plural}. Te recomendamos aprobarlos o rechazarlos antes de pausar.</p>
      <div class="confirm-actions">
        <button class="btn" data-onclick="ptPausaVolver()">Volver</button>
        <button class="btn btn-danger" data-onclick="ptPausaIgual()">Pausar igual</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
}

// Devuelve true si la pausa quedo escrita (SYNC-1: Publicar save la usa para decidir si sigue).
async function escribirPausaTool(pausado){
  document.getElementById('pt-pausa-ov')?.remove();
  try {
    await PAUSA_REF().set({
      pausado: pausado,
      por: AUTH.user.uid,
      desde: firebase.firestore.FieldValue.serverTimestamp(),
    });
    showToast(pausado ? 'Mejoras pausadas. Los presidentes ya no pueden enviar pedidos.' : 'Mejoras reanudadas.');
    await cargarPausaTool();
    return true;
  } catch (e) {
    showToast('No se pudo cambiar la pausa: ' + (e.message || e), 'error');
    return false;
  }
}

// Handlers de data-on* (events.js solo llama funciones globales, sin puntos).
// Se exponen con prefijo pt para no pisar globales del panel.
window.ptOcultarErrorEscritura = _ocultarErrorEscritura;
window.ptOcultarExitoEscritura = _ocultarExitoEscritura;
window.ptAbrirEditorJugador = abrirEditorJugador;
window.ptFijarPerfiles = ptFijarPerfiles;
window.ptAbrirRetro = abrirRetro;
window.ptCerrarRetro = cerrarRetro;
window.ptCerrarRetroFondo = cerrarRetroFondo;
window.ptRetroCargarAnterior = retroCargarAnterior;
window.ptRetroSaveAnterior = retroLeerSaveAnterior;
window.ptRetroMarcar = retroMarcar;
window.ptRetroMonto = retroMonto;
window.ptRetroNota = retroNota;
window.ptRetroVerTodos = retroVerTodos;
window.ptRetroAgregarManual = retroAgregarManual;
window.ptRetroQuitar = retroQuitar;
window.ptRetroConfirmar = retroConfirmar;
window.ptPerfilOverride = ptPerfilOverride;
window.ptEmparejarJugador = emparejarJugadorAdmin;
window.ptCerrarEmparejar = cerrarEmparejar;
window.ptConfirmarEmparejar = confirmarEmparejar;
window.ptAplicarPedidosSeleccionados = aplicarPedidosSeleccionados;
window.ptCerrarEditorJugador = cerrarEditorJugador;
window.ptConfirmarEscribirAlSave = confirmarEscribirAlSave;
window.ptDescartarTodo = descartarTodo;
window.ptElegirCarpetaClick = elegirCarpetaClick;
window.ptGuardarReglas = guardarReglas;
window.ptToggleEdicionGratis = toggleEdicionGratis;
window.ptGuardarTopeExtra = guardarTopeExtra;
window.ptQuitarTopeExtra = quitarTopeExtra;
window.ptHabilitarAplicarPedidos = habilitarAplicarPedidos;
window.ptOnTeamSelectPorIndice = onTeamSelectPorIndice;
window.ptPublicarPlantillaDeEquipo = publicarPlantillaDeEquipo;
window.ptActualizarSaveClick = actualizarSaveClick;
window.ptPublicarSaveClick = ptPublicarSaveClick;
window.ptPublicarSaveConfirmar = ptPublicarSaveConfirmar;
window.ptCerrarPublicarSave = ptCerrarPublicarSave;
window.ptRechazarPedido = rechazarPedido;
window.ptCerrarRechazo = cerrarRechazo;
window.ptConfirmarRechazo = confirmarRechazo;
window.ptRechazoMotivoInput = rechazoMotivoInput;
window.ptPedToggle = ptPedToggle;
window.ptPedSelEquipo = ptPedSelEquipo;
window.ptPedSelPedido = ptPedSelPedido;
window.ptPedAlternarTodo = ptPedAlternarTodo;
window.ptVerDetallePedido = verDetallePedido;
window.ptCerrarDetallePedido = cerrarDetallePedido;
window.ptCerrarDetalleFondo = cerrarDetalleFondo;
window.ptRechazarDesdeDetalle = rechazarDesdeDetalle;
window.ptRestaurarReglasDefault = restaurarReglasDefault;
window.ptSwitchTab = switchTab;
window.ptVincularEquipo = vincularEquipo;
window.ptPausaToggle = ptPausaToggle;
window.ptPausaVolver = () => document.getElementById('pt-pausa-ov')?.remove();
window.ptPausaIgual = () => escribirPausaTool(true);
// Ciclo de vida: lo llaman js/pes5-admin.js (entrar/salir de la seccion).
window.PES5_TOOL = { montar: montar, salir: salir };
})();
