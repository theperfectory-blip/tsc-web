'use strict';

/* ==========================================================
   HISTORIAL DINÁMICO DE PARTIDOS
   - Imported: SERVIDOS DEL JSON ESTÁTICO `data/historial-seed.json`
     (no viven en IndexedDB → mismos datos en cualquier navegador,
      cualquier máquina; el JSON es la fuente de verdad).
   - Live: viven en IndexedDB store `matchHistory` (creados por la app
     cuando el admin registra un partido en "Partidos").
   - Filtros en cascada: Juego → Temporada → Instancia.
   - Búsqueda: input que NO se regenera (mantiene foco/cursor).
   ========================================================== */

const HIST_PAGE_SIZE = 100;

const _histState = {
  fJuego: '',
  fTemp: '',
  fInst: '',
  qA: '',
  qB: '',
  page: 1,
  mode: 'admin', // 'admin' | 'public'
};

// Equipos cacheados (los setea _getResolvedRecords) para resolver los buscadores
let _histTeams = [];
// Normaliza nombres: sin puntos/comas, espacios colapsados, mayúsculas
const _histNorm = s => String(s||'').toUpperCase().replace(/[.,]/g,'').replace(/\s+/g,' ').trim();
// Resuelve solo cuando el texto coincide exactamente con el nombre actual o histórico.
function _histResolveExactTeam(query, teams){
  const q = _histNorm(query);
  if(!q || !teams || !teams.length) return null;
  return teams.find(t => _histNorm(t.name) === q
    || (t.previousNames||[]).some(p => _histNorm(p) === q)) || null;
}
// Resuelve un texto de búsqueda a UN equipo (o null si es ambiguo / sin match)
function _histResolveTeam(query, teams){
  const q = _histNorm(query);
  if(!q || !teams || !teams.length) return null;
  const exact = _histResolveExactTeam(query, teams);
  if(exact) return exact;
  const matches = teams.filter(t => {
    const names = [t.name, ...((t.previousNames)||[])].map(_histNorm);
    return names.some(n => n.includes(q));
  });
  return matches.length === 1 ? matches[0] : null;
}

// Cache in-memory del JSON estático (se carga una vez por sesión).
let _staticHistoryCache = null;
let _staticHistoryPromise = null;

/* ----------------------------------------------------------
   Helpers
   ---------------------------------------------------------- */
function computeResultado(gA, gB, pA, pB){
  const hasPen = pA!=null && pB!=null;
  if(gA>gB) return 'Gana A';
  if(gB>gA) return 'Gana B';
  if(hasPen){
    if(pA>pB) return 'Gana A (PK)';
    if(pB>pA) return 'Gana B (PK)';
  }
  return 'Empate';
}

function _esc(v){
  return String(v==null?'':v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ----------------------------------------------------------
   Carga del JSON estático (cacheado en memoria por sesión)
   ---------------------------------------------------------- */
function loadStaticHistory(){
  if(_staticHistoryCache) return Promise.resolve(_staticHistoryCache);
  if(_staticHistoryPromise) return _staticHistoryPromise;
  _staticHistoryPromise = (async ()=>{
    try {
      const res = await fetch('data/historial-seed.json');
      if(!res.ok) throw new Error('HTTP '+res.status);
      const rows = await res.json();
      // Marcar todos como imported por seguridad
      _staticHistoryCache = rows.map(r => ({...r, source: 'imported'}));
      console.log(`[Historial] Estáticos cargados: ${_staticHistoryCache.length}`);
      return _staticHistoryCache;
    } catch(err){
      console.warn('[Historial] No se pudo cargar el JSON estático:', err.message);
      _staticHistoryCache = [];
      return _staticHistoryCache;
    }
  })();
  return _staticHistoryPromise;
}

/* ----------------------------------------------------------
   MIGRACIÓN one-shot: limpiar imported antiguos del IDB
   (de versiones previas que sí los persistían).
   ---------------------------------------------------------- */
async function cleanLegacyImportedFromIDB(){
  const flag = await dbGetAll('settings', s=>s.key==='historyMigratedToStatic');
  if(flag.length) return; // ya migrado

  const all = await dbGetAll('matchHistory');
  const importedIds = all.filter(h=>h.source==='imported').map(h=>h.id);

  if(importedIds.length){
    // Usa la abstracción dbDelete (funciona en IndexedDB y Firestore)
    for(const id of importedIds) await dbDelete('matchHistory', id);
    console.log(`[Historial] Migración: ${importedIds.length} imported legacy removidos`);
  }

  // También limpiar el flag viejo para evitar confusión
  const oldVersionRows = await dbGetAll('settings', s=>s.key==='historySeedVersion');
  for(const r of oldVersionRows) await dbDelete('settings', r.id);

  await dbAdd('settings', {key:'historyMigratedToStatic', value:true});
}

// Wrapper para compatibilidad con ui-utils.js (que llama seedHistoryIfEmpty al arrancar).
async function seedHistoryIfEmpty(){
  await cleanLegacyImportedFromIDB();
  await loadStaticHistory();
}

/* ----------------------------------------------------------
   API — sync con matches store
   ---------------------------------------------------------- */
async function appendOrUpdateHistory(matchId){
  const m = await dbGet('matches', matchId);
  if(!m) return;
  if(m.goalsA==null || m.goalsB==null) return;

  const phase  = m.phaseId ? await dbGet('phases', m.phaseId) : null;
  const comp   = phase?.compId ? await dbGet('competitions', phase.compId) : null;
  const seasonNumber = m.season ?? comp?.season ?? STATE.season;

  const penA = m.penA ?? null;
  const penB = m.penB ?? null;

  const existing = await dbGetAll('matchHistory', h=>h.matchRef===matchId);
  const data = {
    golesA: m.goalsA, golesB: m.goalsB, penA, penB,
    source: 'live',
    matchRef: matchId,
    seasonRef: seasonNumber,
  };

  if(existing.length){
    await dbPut('matchHistory', {...existing[0], ...data});
  } else {
    // Continuar IDs después del max(estáticos, IDB)
    const [staticRows, idbAll] = await Promise.all([
      loadStaticHistory(),
      dbGetAll('matchHistory'),
    ]);
    const maxStatic = staticRows.reduce((mx,r)=>Math.max(mx, r.id||0), 0);
    const maxIdb    = idbAll.reduce((mx,r)=>Math.max(mx, r.id||0), 0);
    const nextId    = Math.max(maxStatic, maxIdb) + 1;
    await dbAdd('matchHistory', {id:nextId, ...data, createdAt: new Date().toISOString()});
  }
}

async function removeHistoryByMatchRef(matchId){
  const existing = await dbGetAll('matchHistory', h=>h.matchRef===matchId);
  for(const h of existing) await dbDelete('matchHistory', h.id);
}

/* ----------------------------------------------------------
   Resolver dinámicamente los valores de un record (live)
   o devolver tal cual los estáticos (imported).
   ---------------------------------------------------------- */
async function resolveHistoryRecord(h){
  // Estáticos: salen del JSON ya formateados
  if(h.source==='imported'){
    return {
      juego: h.juego || '',
      temporada: h.temporada || '',
      instancia: h.instancia || '',
      equipoA: h.equipoA || '—',
      equipoB: h.equipoB || '—',
      golesA: h.golesA,
      golesB: h.golesB,
      penA: h.penA,
      penB: h.penB,
      resultado: h.resultado || computeResultado(h.golesA, h.golesB, h.penA, h.penB),
    };
  }

  // Live: resolver desde matches/teams/phases
  if(h.source==='live' && h.matchRef){
    const m = await dbGet('matches', h.matchRef);
    if(!m){
      return {
        juego: '—', temporada: '—', instancia: '—',
        equipoA: '—', equipoB: '—',
        golesA: h.golesA, golesB: h.golesB,
        penA: h.penA, penB: h.penB,
        resultado: computeResultado(h.golesA, h.golesB, h.penA, h.penB),
      };
    }

    const phase  = m.phaseId ? await dbGet('phases', m.phaseId) : null;
    const comp   = phase?.compId ? await dbGet('competitions', phase.compId) : null;
    const seasonNumber = m.season ?? comp?.season ?? STATE.season;
    const isCurrentSeason = (seasonNumber === STATE.season);

    const resolveTeam = async (ref) => {
      if(Number.isFinite(parseInt(ref))){
        return await dbGet('teams', parseInt(ref));
      }
      const teams = await dbGetAll('teams', t=>t.name===ref);
      return teams.length ? teams[0] : null;
    };

    if(isCurrentSeason){
      // Temporada actual: resolver dinámicamente para reflejar renames inmediatamente
      const seasons = await dbGetAll('seasons');
      const season  = seasons.find(s=>s.number===seasonNumber);
      const teamA   = await resolveTeam(m.teamA);
      const teamB   = await resolveTeam(m.teamB);
      return {
        juego: (season?.game||'').trim() || 'PES 4',
        temporada: season ? getSeasonName(season) : `T${seasonNumber||'?'}`,
        instancia: phase?.name || '—',
        equipoA: teamA?.name || m.teamA || '—',
        equipoB: teamB?.name || m.teamB || '—',
        golesA: h.golesA, golesB: h.golesB,
        penA: h.penA, penB: h.penB,
        resultado: computeResultado(h.golesA, h.golesB, h.penA, h.penB),
      };
    }

    // Temporada pasada: usar campos congelados si existen
    if(h.juego && h.temporada && h.instancia && h.equipoA && h.equipoB){
      return {
        juego: h.juego, temporada: h.temporada, instancia: h.instancia,
        equipoA: h.equipoA, equipoB: h.equipoB,
        golesA: h.golesA, golesB: h.golesB,
        penA: h.penA, penB: h.penB,
        resultado: h.resultado || computeResultado(h.golesA, h.golesB, h.penA, h.penB),
      };
    }
    // Si no están congelados, resolver una vez y persistir
    const seasons = await dbGetAll('seasons');
    const season  = seasons.find(s=>s.number===seasonNumber);
    const teamA   = await resolveTeam(m.teamA);
    const teamB   = await resolveTeam(m.teamB);
    const out = {
      juego: (season?.game||'').trim() || 'PES 4',
      temporada: season ? getSeasonName(season) : `T${seasonNumber||'?'}`,
      instancia: phase?.name || '—',
      equipoA: teamA?.name || m.teamA || '—',
      equipoB: teamB?.name || m.teamB || '—',
      golesA: h.golesA, golesB: h.golesB,
      penA: h.penA, penB: h.penB,
      resultado: computeResultado(h.golesA, h.golesB, h.penA, h.penB),
    };
    await dbPut('matchHistory', {...h, ...out});
    return out;
  }
  return h;
}

/* Re-genera todas las filas live de una temporada (cuando cambia su nombre o juego). */
async function refreshHistoryForSeason(seasonNumber){
  const matches = await dbGetAll('matches', m=>m.season===seasonNumber);
  for(const m of matches){
    if(m.goalsA!=null && m.goalsB!=null){
      await appendOrUpdateHistory(m.id);
    }
  }
  if(document.getElementById('adm-history-content') && STATE.adminPage==='historial-admin'){
    await renderAdmHistory();
  } else if(document.getElementById('pub-history-content') && STATE.publicPage==='historial'){
    await renderPubHistory();
  }
}

/* ----------------------------------------------------------
   FILTRADO
   ---------------------------------------------------------- */
function _applyFilters(rows){
  const {fJuego, fTemp, fInst, qA, qB} = _histState;
  const qal = _histNorm(qA), qbl = _histNorm(qB);
  return rows.filter(r=>{
    if(fJuego && r.juego!==fJuego) return false;
    if(fTemp  && r.temporada!==fTemp) return false;
    if(fInst  && r.instancia!==fInst) return false;
    const a = _histNorm(r.equipoA), b = _histNorm(r.equipoB);
    if(qal && !(a.includes(qal) || b.includes(qal))) return false;
    if(qbl && !(a.includes(qbl) || b.includes(qbl))) return false;
    return true;
  });
}

function _sortDesc(rows){
  return rows.slice().sort((a,b)=>{
    if(b.id !== a.id) return b.id - a.id;
    return new Date(b.createdAt||0) - new Date(a.createdAt||0);
  });
}

/* ----------------------------------------------------------
   RENDER
   ---------------------------------------------------------- */
async function renderAdmHistory(){
  _histState.mode = 'admin';
  const el = document.getElementById('adm-history-content');
  if(!el){
    console.error('[Historial admin] Contenedor #adm-history-content NO existe');
    return;
  }
  el.innerHTML = `<div style="color:var(--txt3);font-size:14px;padding:14px;">Cargando historial...</div>`;
  console.log('[Historial admin] Iniciando render');
  await _renderHistoryFull(el, true);
  console.log('[Historial admin] Render finalizado');
}

async function renderPubHistory(){
  const renderToken = ++_pubHistRenderToken;
  _histState.mode = 'public';
  if(typeof renderPubSidebarHistorial==='function') renderPubSidebarHistorial('partidos');
  const el = document.getElementById('pub-history-content');
  if(!el) return;
  // Antes del primer montaje real, #page-historial todavía no tiene
  // `is-mounted` (ensurePublicSectionMounted la agrega recién DESPUÉS de que
  // esta función termine) — así se distingue el primer render (deja que
  // tsc:public-section-mounted → revealWithin haga la entrada fade+rise) de
  // un refresco posterior (foco repetido o dato en vivo), que recrea
  // .hito-stage/.h2h-frame/#pub-histm desde cero y NUNCA debe re-animarlos.
  const isRefresh = document.getElementById('page-historial')?.classList.contains('is-mounted');
  _injectHistHeader(0);
  await _renderHistoryFull(el, false, renderToken);
  if(isRefresh && window.MOTION?.settleWithin) MOTION.settleWithin(el);
}

/* ----------------------------------------------------------
   CARRUSEL CC-HIST (cabecera sticky de la sección 06)
   ---------------------------------------------------------- */
let _pubHistCarousel = null;
let _pubHistCarouselResizeBound = false;
let _pubHistRenderToken = 0;
/* Firma de los datos del último render público — permite que un refresco
   pasivo (reenfoque/live) con datos idénticos no toque el DOM. */
let _pubHistLastSig = null;
function _pubBindHistCarouselResize(){
  if(_pubHistCarouselResizeBound) return;
  _pubHistCarouselResizeBound = true;
  window.addEventListener('resize', ()=>{ _pubHistCarousel?.recenter?.(); });
}
/* Sub-vista activa de la sección 06 (0=Partidos, 1=Tabla histórica) — usada
   por la suscripción en vivo (nav.js) para refrescar la vista que el usuario
   tiene realmente abierta, en vez de forzar siempre "Partidos". */
function _pubHistActiveView(){ return _pubHistCarousel?.idx ?? 0; }
async function _pubSwitchHistoryView(idx){
  const anchor = typeof _pubCaptureVisualAnchor==='function'
    ? _pubCaptureVisualAnchor(document.getElementById('page-historial'))
    : null;
  if(idx===0) await renderPubHistory();
  else await renderPubHistoryStandings();
  if(typeof _pubRestoreVisualAnchor==='function') await _pubRestoreVisualAnchor(anchor, 'historial');
  else if(typeof focusPublicSection==='function') await focusPublicSection('historial');
}
function _injectHistHeader(activeIdx){
  const page = document.getElementById('page-historial');
  if(!page) return;
  let sticky = page.querySelector('.comp-sticky.hist-header');
  if(!sticky){
    sticky = document.createElement('div');
    sticky.className = 'comp-sticky hist-header';
    sticky.innerHTML = '<div class="comp-title"><span class="pd-n">06</span>'
      +'<div class="cc cc-hist" id="pub-cc-hist"><div class="cc-view"><div class="cc-track"></div></div></div>'
      +'</div>';
    const content = document.getElementById('pub-history-content');
    if(content) page.insertBefore(sticky, content);
    else page.prepend(sticky);
  }
  const cc = document.getElementById('pub-cc-hist');
  if(cc && typeof _pubMakeCarousel==='function'){
    cc.setAttribute('aria-label', 'Vista del historial');
    _pubHistCarousel = _pubMakeCarousel(cc, ['Partidos','Tabla histórica'], activeIdx, i=>{
      _pubSwitchHistoryView(i).catch(err=>console.error('[Historial] Error cambiando vista:', err));
    });
    _pubBindHistCarouselResize();
    requestAnimationFrame(()=>{ _pubHistCarousel?.recenter?.(); });
  }
}

/* Devuelve la unión: estáticos (JSON) + lives (IDB), todos resueltos.
   Además construye/actualiza window._histTeamLookup con los nombres
   actuales y previousNames de cada equipo, para resolver notas en el render. */
async function _getResolvedRecords(){
  const [staticRows, idbLive, allTeams] = await Promise.all([
    loadStaticHistory(),
    dbGetAll('matchHistory', h=>h.source==='live'),
    dbGetAll('teams'),
  ]);

  // Lookup teamLowerCaseName → {currentName, previousNames, teamId}
  const lookup = new Map();
  for(const t of allTeams){
    const entry = {
      currentName: t.name,
      previousNames: (Array.isArray(t.previousNames)?t.previousNames:[]).map(s=>String(s).trim()).filter(Boolean),
      teamId: t.id,
    };
    if(t.name) lookup.set(_histNorm(t.name), entry);
    entry.previousNames.forEach(p=>{
      lookup.set(_histNorm(p), entry);
    });
  }
  window._histTeamLookup = lookup;
  _histTeams = allTeams;   // para resolver los buscadores Equipo A / Equipo B

  const all = [...staticRows, ...idbLive];
  const resolved = await Promise.all(all.map(h => resolveHistoryRecord(h)));
  return resolved.map((r, idx) => ({
    ...r,
    id: all[idx].id,
    source: all[idx].source,
    createdAt: all[idx].createdAt,
    matchRef: all[idx].matchRef,
    // Aditivo (no cambia consumidores existentes): permite que _computeTeamStats
    // (teams.js) filtre agregados por temporada finalizada, igual criterio que
    // _computeHistoricalStandings. undefined en los 'imported' (no aplica).
    seasonRef: all[idx].seasonRef,
  }));
}

/* Hitos del historial público: 4 stat cards (partidos, goles, mayor goleada,
   temporadas) calculadas de los records resueltos. Los números animan con
   MOTION.countUp; «mayor goleada» es texto (marcador) → sin countUp. */
/* ═══════════════════════════════════════════════════════════════════
   VISTA PÚBLICA «Historial» (Partidos): hitos + filtros (cc-games/cc-seasons)
   + mano a mano con autocompletado por teclado + lista .histm.
   La tabla administrativa .tbl NO se usa en público.
   ═══════════════════════════════════════════════════════════════════ */
const _pubH = {
  all:[], teamList:[], game:'', season:'',
  pickA:null, pickB:null, selectedId:null,
  gameCar:null, seasonCar:null, blowout:null, mostGoals:null,
};

/* Orden de temporadas: T1, T2... primero; luego SEM1...; resto alfabético natural */
function _histSeasonSort(a,b){
  const key = v=>{
    const s = String(v||'').trim();
    const t = s.match(/^T\s*(\d+)$/i);     if(t) return [0, Number(t[1]), s];
    const sem = s.match(/^SEM\s*(\d+)$/i); if(sem) return [1, Number(sem[1]), s];
    return [2, 999, s];
  };
  const ka=key(a), kb=key(b);
  return ka[0]-kb[0] || ka[1]-kb[1] || ka[2].localeCompare(kb[2],'es',{numeric:true});
}
function _pubHValid(m){ return m && m.equipoA && m.equipoB && m.golesA!=null && m.golesB!=null; }
function _pubHWinner(m){
  const res = computeResultado(m.golesA, m.golesB, m.penA, m.penB);
  if(/Gana A/.test(res)) return 1;
  if(/Gana B/.test(res)) return 2;
  return 0;
}
function _pubHScore(m){
  const pen = (m.penA!=null && m.penB!=null) ? ` (${m.penA}-${m.penB})` : '';
  return `${m.golesA}-${m.golesB}${pen}`;
}
function _pubHIni(name){ return String(name||'?').replace(/[^A-Za-zÁÉÍÓÚÑ ]/g,'').split(/\s+/).map(w=>w[0]||'').join('').slice(0,3).toUpperCase() || '?'; }
function _pubHTeamMeta(name){
  const t = _pubH.teamList.find(x => _histNorm(x.name)===_histNorm(name) || (x.previousNames||[]).some(p=>_histNorm(p)===_histNorm(name)));
  return t || { id:'_'+name, name, ini:_pubHIni(name), color:'#5f6368', color2:'#3c4043', search:_histNorm(name) };
}
function _pubHFiltered(){
  return _pubH.all.filter(r => (!_pubH.game || r.juego===_pubH.game) && (!_pubH.season || r.temporada===_pubH.season));
}
function _pubHScopeLabel(){
  return [_pubH.game || 'Todos los juegos', _pubH.season || 'Todas las temporadas'].join(' · ');
}

/* Lista .histm de partidos (renderer público, reemplaza la tabla .tbl) */
function _pubHistmList(matches, title, selectedId){
  const rows = matches.filter(_pubHValid).slice(0, 40);
  if(!rows.length){
    return `<div class="histm-row"><div class="hr-num">${_esc(title||'Sin partidos')}</div>
      <div class="hr-duel"><span class="hr-team">No hay partidos para este filtro</span><span class="hr-score">—</span><span class="hr-team away">Ajusta juego o temporada</span></div></div>`;
  }
  const head = `<div class="histm-row" style="background:var(--bg-deep);"><div class="hr-num">${_esc(title||'Partidos')}</div>
    <div class="hr-duel"><span class="hr-team">${rows.length} partido${rows.length===1?'':'s'}</span><span class="hr-score">${matches.length>rows.length?'+':''}</span><span class="hr-team away">${_esc(_pubHScopeLabel())}</span></div></div>`;
  const body = rows.map(m=>{
    const w = _pubHWinner(m), wa = w===1, wb = w===2;
    const meta = [m.temporada, m.juego, m.instancia].filter(Boolean).join(' · ');
    return `<div class="histm-row ${String(m.id)===String(selectedId)?'selected':''}">
      <div class="hr-num">#${_esc(m.id||'')}<span style="display:block;font-size:10px;color:var(--txt3);letter-spacing:.5px;">${_esc(meta)}</span></div>
      <div class="hr-duel"><span class="hr-team ${wa?'win':''}">${_esc(m.equipoA)}</span><span class="hr-score">${_esc(_pubHScore(m))}</span><span class="hr-team away ${wb?'win':''}">${_esc(m.equipoB)}</span></div>
    </div>`;
  }).join('');
  return head + body;
}

function _pubHistoryHitos(records){
  const valid = records.filter(_pubHValid);
  const goles = valid.reduce((s,r)=>s+(parseInt(r.golesA)||0)+(parseInt(r.golesB)||0),0);
  return `<div class="hitos-grid">
    <div class="hito-stage hito-filter-stage" data-reveal>
      <div class="hito hito-centered" id="hito-total">
        <b data-n="${valid.length}">0</b><span>Partidos</span>
        <div class="hito-filter-row">
          <div class="cc hito-filter-rail" id="cc-games"><div class="cc-view"><div class="cc-track"></div></div></div>
          <span class="hito-filter-sep">—</span>
          <div class="cc hito-filter-rail" id="cc-seasons"><div class="cc-view"><div class="cc-track"></div></div></div>
        </div>
      </div>
    </div>
    <div class="hito-stage" data-reveal>
      <div class="hito hito-centered" id="hito-goals">
        <b data-n="${goles}">0</b><span>Goles anotados</span>
        <small class="hito-filter-note" id="hito-goals-scope">${valid.length?(goles/valid.length).toFixed(2):'0.00'} goles por partido</small>
      </div>
    </div>
    <div class="hito-stage hito-click" data-reveal>
      <button class="hito" id="hito-blowout" type="button"><b>—</b><span>Mayor goleada</span><small class="hito-scope" id="hito-blowout-scope">Toca para ver el partido</small></button>
    </div>
    <div class="hito-stage hito-click" data-reveal>
      <button class="hito" id="hito-mostgoals" type="button"><b>—</b><span>Partido con más goles</span><small class="hito-scope" id="hito-mostgoals-scope">Toca para ver el partido</small></button>
    </div>
  </div>`;
}

/* Anima un número entero hacia su valor objetivo.
   Degrada al valor final (sin animación) si no hay rAF o si el usuario pidió
   movimiento reducido (prefers-reduced-motion). */
const _pubHCountRaf = new WeakMap();
function _pubHCount(el, to){
  if(!el) return;
  const previous = _pubHCountRaf.get(el);
  if(previous) cancelAnimationFrame(previous);
  _pubHCountRaf.delete(el);
  const from = parseInt(String(el.textContent).replace(/\D/g,''))||0;
  const _reduced = window.MOTION?.reduced?.() ?? matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(from===to || _reduced || !(window.requestAnimationFrame)){ el.textContent=String(to); return; }
  const dur = Math.min(650, Math.max(220, Math.abs(to-from)*0.9)), t0 = performance.now();
  (function step(ts){
    const p = Math.min(1,(ts-t0)/dur), e = p<.5?2*p*p:-1+(4-2*p)*p;
    el.textContent = String(Math.round(from+(to-from)*e));
    if(p<1) _pubHCountRaf.set(el, requestAnimationFrame(step));
    else _pubHCountRaf.delete(el);
  })(t0);
}

/* Conteo one-shot disparado por viewport. La sección Historial se MONTA ~600px
   antes de ser visible (montaje lazy del shell), así que animar en el montaje
   gastaría la animación fuera de pantalla — el usuario nunca la vería. En su
   lugar, el contador queda en 0 y anima 0→N recién cuando entra al viewport,
   una sola vez. Un cambio de filtro (nodo ya marcado `data-counted`) anima de
   inmediato porque la sección ya está visible y el usuario acaba de interactuar.
   Mismo rootMargin/threshold que el reveal de motion.js para que conteo y
   fade+rise entren juntos. */
let _pubHCountObserver = null;
function _pubHCountObs(){
  if(_pubHCountObserver) return _pubHCountObserver;
  if(!('IntersectionObserver' in window)) return null;
  _pubHCountObserver = new IntersectionObserver((entries, obs)=>{
    for(const e of entries){
      if(!e.isIntersecting) continue;
      obs.unobserve(e.target);
      e.target.dataset.counted = '1';
      _pubHCount(e.target, parseInt(e.target.dataset.n)||0);
    }
  }, { rootMargin:'0px 0px -8% 0px', threshold:0.08 });
  return _pubHCountObserver;
}

/* Programa el conteo de un contador de hito:
   - reduced-motion: valor final directo, sin animar ni observar.
   - ya contado (revelado antes) o ya visible: anima de inmediato.
   - primera vez y fuera de pantalla: queda en 0 y anima al entrar al viewport. */
function _pubScheduleCount(el, to){
  if(!el) return;
  el.dataset.n = String(to);
  const _reduced = window.MOTION?.reduced?.() ?? matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(_reduced){ el.textContent = String(to); el.dataset.counted = '1'; return; }
  const obs = _pubHCountObs();
  const r = el.getBoundingClientRect();
  const visible = r.top < window.innerHeight && r.bottom > 0;
  if(el.dataset.counted || !obs || visible){ el.dataset.counted = '1'; _pubHCount(el, to); return; }
  el.textContent = '0';
  obs.observe(el);
}

/* Recalcula hitos (cuenta, goles, mayor goleada, más goles) y los cablea al H2H */
function _pubUpdateHitos(records){
  const valid = records.filter(_pubHValid);
  const goles = valid.reduce((s,r)=>s+(parseInt(r.golesA)||0)+(parseInt(r.golesB)||0),0);
  const blowout = valid.slice().sort((a,b)=>
    Math.abs((b.golesA||0)-(b.golesB||0))-Math.abs((a.golesA||0)-(a.golesB||0)) ||
    ((b.golesA||0)+(b.golesB||0))-((a.golesA||0)+(a.golesB||0)))[0] || null;
  const mostGoals = valid.slice().sort((a,b)=>
    ((b.golesA||0)+(b.golesB||0))-((a.golesA||0)+(a.golesB||0)) ||
    Math.abs((b.golesA||0)-(b.golesB||0))-Math.abs((a.golesA||0)-(a.golesB||0)))[0] || null;
  _pubH.blowout = blowout; _pubH.mostGoals = mostGoals;

  const totalB = document.querySelector('#hito-total b'), goalsB = document.querySelector('#hito-goals b');
  if(totalB) _pubScheduleCount(totalB, valid.length);
  if(goalsB) _pubScheduleCount(goalsB, goles);
  const goalsScope = document.getElementById('hito-goals-scope');
  if(goalsScope) goalsScope.textContent = `${valid.length?(goles/valid.length).toFixed(2):'0.00'} goles por partido`;

  const blowB = document.querySelector('#hito-blowout b'), blowScope = document.getElementById('hito-blowout-scope');
  if(blowB) blowB.textContent = blowout ? `${blowout.golesA}-${blowout.golesB}` : '—';
  if(blowScope) blowScope.textContent = blowout ? `${blowout.equipoA} vs ${blowout.equipoB}` : 'Sin datos';
  const mostB = document.querySelector('#hito-mostgoals b'), mostScope = document.getElementById('hito-mostgoals-scope');
  if(mostB) mostB.textContent = mostGoals ? String((mostGoals.golesA||0)+(mostGoals.golesB||0)) : '—';
  if(mostScope) mostScope.textContent = mostGoals ? `${mostGoals.equipoA} vs ${mostGoals.equipoB}` : 'Sin datos';

  const blowEl = document.getElementById('hito-blowout');
  if(blowEl) blowEl.onclick = ()=>{ if(blowout) histH2HShow(blowout.equipoA, blowout.equipoB); };
  const mostEl = document.getElementById('hito-mostgoals');
  if(mostEl) mostEl.onclick = ()=>{ if(mostGoals) histH2HShow(mostGoals.equipoA, mostGoals.equipoB); };
}

/* Pinta el mano a mano (resultado + lista de duelos directos) */
function _pubDrawH2H(title){
  const result = document.getElementById('h2h-result'), hint = document.getElementById('h2h-hint');
  const histm = document.getElementById('pub-histm');
  const pickA = _pubH.pickA, pickB = _pubH.pickB;
  if(!result || !hint) return;
  if(!pickA || !pickB || pickA.id===pickB.id){
    result.classList.remove('show'); result.innerHTML=''; hint.style.display='';
    if(histm) histm.innerHTML = _pubHistmList(_pubHFiltered().slice().sort((a,b)=>(b.id||0)-(a.id||0)), 'Últimos partidos', null);
    return;
  }
  const namesA = new Set([pickA.name, ...((pickA.previousNames)||[])].map(_histNorm));
  const namesB = new Set([pickB.name, ...((pickB.previousNames)||[])].map(_histNorm));
  const direct = _pubHFiltered().filter(r =>
    (namesA.has(_histNorm(r.equipoA)) && namesB.has(_histNorm(r.equipoB))) ||
    (namesA.has(_histNorm(r.equipoB)) && namesB.has(_histNorm(r.equipoA))));
  let wa=0, wb=0, dr=0, gfA=0, gfB=0;
  direct.forEach(r=>{
    const swap = namesA.has(_histNorm(r.equipoB));
    const ga = Number(swap?r.golesB:r.golesA)||0, gb = Number(swap?r.golesA:r.golesB)||0;
    gfA+=ga; gfB+=gb;
    const w = _pubHWinner(swap ? {...r, golesA:r.golesB, golesB:r.golesA, penA:r.penB, penB:r.penA} : r);
    if(w===1) wa++; else if(w===2) wb++; else dr++;
  });
  const iniA = pickA.ini||_pubHIni(pickA.name), iniB = pickB.ini||_pubHIni(pickB.name);
  result.innerHTML = `<div class="h2h-face">
    <div class="h2h-side" style="--team-color:${_esc(pickA.color||'#5f6368')};--team-color-2:${_esc(pickA.color2||pickA.color||'#3c4043')};"><div class="h2h-crest">${_esc(iniA)}</div><div class="h2h-name">${_esc(pickA.name)}</div></div>
    <div class="h2h-vs">VS</div>
    <div class="h2h-side" style="--team-color:${_esc(pickB.color||'#5f6368')};--team-color-2:${_esc(pickB.color2||pickB.color||'#3c4043')};"><div class="h2h-crest">${_esc(iniB)}</div><div class="h2h-name">${_esc(pickB.name)}</div></div>
  </div><div class="h2h-record">${direct.length} duelo${direct.length===1?'':'s'} · <b>${wa}</b> ${_esc(iniA)} · <b>${dr}</b> empate${dr===1?'':'s'} · <b>${wb}</b> ${_esc(iniB)} · GF ${gfA}-${gfB}</div>`;
  result.classList.add('show'); hint.style.display='none';
  if(histm) histm.innerHTML = _pubHistmList(direct.slice().sort((a,b)=>(b.id||0)-(a.id||0)), title||'Mano a mano', _pubH.selectedId);
}

/* Aplica filtros (juego/temporada): hitos + H2H/lista.
   Sincroniza el mismo filtro a la tabla histórica (_histStdState) para que ambas
   vistas reflejen juego/temporada de forma coherente. */
function _pubApplyFilters(){
  _histStdState.fJuego = _pubH.game;
  _histStdState.fTemp  = _pubH.season;
  const filtered = _pubHFiltered();
  _pubUpdateHitos(filtered);
  if(_pubH.pickA && _pubH.pickB) _pubDrawH2H('Mano a mano');
  else _pubDrawH2H();
}

/* Autocompletado H2H con teclado (↑/↓/Enter/Esc), foco, selección y blur */
function _pubSetupH2H(){
  const inA = document.getElementById('h2h-a'), inB = document.getElementById('h2h-b');
  const acA = document.getElementById('h2h-ac-a'), acB = document.getElementById('h2h-ac-b');
  if(!inA || !inB) return;

  const wire = (input, ac, isA)=>{
    let activeIdx = -1, items = [];
    // Patrón ARIA combobox: el input refleja abierto/cerrado (aria-expanded) y
    // la opción activa (aria-activedescendant); cada opción anuncia su estado
    // (aria-selected) al lector de pantalla.
    const close = ()=>{
      ac.classList.remove('show'); activeIdx=-1;
      input.setAttribute('aria-expanded','false');
      input.removeAttribute('aria-activedescendant');
    };
    const highlight = ()=>{
      const opts = ac.querySelectorAll('.h2h-ac-item');
      opts.forEach((it,i)=>{
        const on = i===activeIdx;
        it.classList.toggle('active', on);
        it.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      const act = opts[activeIdx];
      if(act){ act.scrollIntoView({block:'nearest'}); input.setAttribute('aria-activedescendant', act.id); }
      else input.removeAttribute('aria-activedescendant');
    };
    const choose = (t)=>{
      if(!t) return;
      if(isA) _pubH.pickA = t; else _pubH.pickB = t;
      input.value = t.name; _pubH.selectedId = null; close();
      _pubDrawH2H('Mano a mano');
    };
    const render = ()=>{
      if(isA) _pubH.pickA=null; else _pubH.pickB=null;
      const q = _histNorm(input.value);
      items = q ? _pubH.teamList.filter(t=>t.search.includes(q)).slice(0,7) : [];
      ac.innerHTML = items.map((t,i)=>`<div class="h2h-ac-item" id="${ac.id}-opt-${i}" role="option" aria-selected="false" style="--team-color:${_esc(t.color||'#5f6368')};" data-id="${_esc(t.id)}"><span class="h2h-ac-crest">${_esc(t.ini||_pubHIni(t.name))}</span>${_esc(t.name)}</div>`).join('');
      const open = !!items.length;
      ac.classList.toggle('show', open);
      input.setAttribute('aria-expanded', open ? 'true' : 'false');
      if(!open) input.removeAttribute('aria-activedescendant');
      activeIdx = -1;
      ac.querySelectorAll('.h2h-ac-item').forEach((it,i)=>{
        it.addEventListener('mousedown', e=>{ e.preventDefault(); choose(items[i]); });
      });
      // resolución por texto exacto (sin elegir de la lista)
      const exact = _histResolveExactTeam(input.value, _pubH.teamList);
      if(isA) _pubH.pickA = exact; else _pubH.pickB = exact;
      if(_pubH.pickA && _pubH.pickB) _pubDrawH2H('Mano a mano');
      else _pubDrawH2H();
    };
    input.addEventListener('input', render);
    input.addEventListener('keydown', e=>{
      if(!ac.classList.contains('show') || !items.length){
        if(e.key==='Enter'){ const exact=_histResolveTeam(input.value,_pubH.teamList); if(exact) choose(exact); }
        return;
      }
      if(e.key==='ArrowDown'){ e.preventDefault(); activeIdx=Math.min(items.length-1, activeIdx+1); highlight(); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); activeIdx=Math.max(0, activeIdx-1); highlight(); }
      else if(e.key==='Enter'){ e.preventDefault(); choose(activeIdx>=0?items[activeIdx]:(_histResolveTeam(input.value,_pubH.teamList))); }
      else if(e.key==='Escape'){ close(); }
    });
    input.addEventListener('blur', ()=> setTimeout(close, 120));
  };
  wire(inA, acA, true);
  wire(inB, acB, false);
}

/* Carruseles cc-games / cc-seasons (reusa _pubMakeCarousel).
   Abren en la posición del filtro vigente (persistido entre vistas). */
function _pubBuildHistCarousels(){
  const ccG = document.getElementById('cc-games'), ccS = document.getElementById('cc-seasons');
  if(!ccG || !ccS || typeof _pubMakeCarousel!=='function') return;
  const games = ['Todos', ...[...new Set(_pubH.all.map(r=>r.juego).filter(Boolean))].sort()];
  const seasonsFor = g => ['Todas', ...[...new Set((g?_pubH.all.filter(r=>r.juego===g):_pubH.all).map(r=>r.temporada).filter(Boolean))].sort(_histSeasonSort)];
  // Si el filtro persistido ya no existe en los datos, se descarta.
  if(_pubH.game && !games.includes(_pubH.game)) _pubH.game = '';

  const buildSeasons = (seasonIdx)=>{
    _pubH.seasonCar = _pubMakeCarousel(ccS, seasonsFor(_pubH.game), seasonIdx, (i)=>{
      const seasons = seasonsFor(_pubH.game);
      _pubH.season = seasons[i]==='Todas' ? '' : seasons[i];
      _pubH.selectedId = null; _pubApplyFilters();
    });
  };
  const gameIdx = Math.max(0, games.indexOf(_pubH.game || 'Todos'));
  _pubH.gameCar = _pubMakeCarousel(ccG, games, gameIdx, (i)=>{
    _pubH.game = games[i]==='Todos' ? '' : games[i];
    _pubH.season = ''; _pubH.selectedId = null;
    buildSeasons(0);
    _pubApplyFilters();
  });
  const seasons0 = seasonsFor(_pubH.game);
  if(_pubH.season && !seasons0.includes(_pubH.season)) _pubH.season = '';
  buildSeasons(Math.max(0, seasons0.indexOf(_pubH.season || 'Todas')));
}

/* Orquesta la vista pública «Partidos». Conserva el filtro juego/temporada entre
   cambios de vista (Historial ↔ Tabla histórica) para que ambas vistas coincidan. */
function _pubResetHistFilters(){
  _pubH.game=''; _pubH.season=''; _pubH.selectedId=null;
  _pubH.pickA=null; _pubH.pickB=null;
  const inA=document.getElementById('h2h-a'), inB=document.getElementById('h2h-b');
  if(inA) inA.value='';
  if(inB) inB.value='';
  document.getElementById('h2h-ac-a')?.classList.remove('show');
  document.getElementById('h2h-ac-b')?.classList.remove('show');
  _pubBuildHistCarousels();
  _pubApplyFilters();
}

function _pubInitMatchesView(el, all){
  _pubH.all = all.filter(_pubHValid);
  _pubH.teamList = (_histTeams||[]).map(t => ({...t, ini: t.ini||_pubHIni(t.name), search: [t.name, ...((t.previousNames)||[])].map(_histNorm).join(' ')}))
    .sort((a,b)=>String(a.name).localeCompare(String(b.name),'es'));
  // El H2H seleccionado no persiste entre vistas; el filtro juego/temporada sí.
  _pubH.pickA=null; _pubH.pickB=null; _pubH.selectedId=null;
  _pubBuildHistCarousels();
  _pubSetupH2H();
  _pubApplyFilters();
  const resetBtn=el.querySelector('#hist-reset');
  if(resetBtn) resetBtn.addEventListener('click', _pubResetHistFilters);
}

async function _renderHistoryFull(el, isAdmin, renderToken=null){
  try {
    const all = await _getResolvedRecords();
    if(!isAdmin && renderToken!==_pubHistRenderToken) return;

    // Dirty-check (solo público): el reenfoque de la sección fuerza un render
    // completo (nav.js) para no mostrar datos stale — pero si los datos NO
    // cambiaron desde el último render y la vista Partidos ya está montada,
    // reconstruir el DOM es destructivo gratis: reinicia el conteo animado de
    // los hitos (arrancan en <b>0</b> y cuentan de nuevo), borra los inputs
    // H2H del usuario y puede mover el scroll por el reemplazo del contenido
    // bajo el viewport. Los datos SÍ se leen frescos en cada pasada (arriba):
    // un cambio ocurrido fuera de foco cambia la firma y renderiza al volver.
    // Si la vista actual no es Partidos (p.ej. Tabla histórica, o un cambio
    // de vista explícito del usuario), no hay #pub-histm y se renderiza igual.
    if(!isAdmin){
      const sig = all.length + '|' + JSON.stringify(all);
      if(sig === _pubHistLastSig && el.querySelector('#pub-histm')) return;
      _pubHistLastSig = sig;
    }

    if(!all.length){
      el.innerHTML = `<div style="color:var(--txt3);font-size:15px;padding:20px;text-align:center;">
        Aún no hay partidos en el historial.
      </div>`;
      return;
    }

    if(isAdmin){
      // ADMIN: comportamiento original (filtros + tabla + export), sin tocar.
      el.innerHTML = `
        ${_renderHistorySubNav('partidos', isAdmin)}
        <div class="hist-filters-zone"></div>
        <div class="hist-summary-zone" style="font-size:12px;color:var(--txt3);margin-bottom:8px;"></div>
        <div class="hist-table-zone card" style="overflow:auto;"></div>
        <div class="hist-more-zone"></div>
      `;
      _renderFiltersZone(el, all, isAdmin);
      _refreshTableZone(el, all, isAdmin);
      return;
    }

    // PÚBLICO: hitos (con filtros cc-games/cc-seasons inline) + mano a mano con
    // autocompletado por teclado + lista .histm. Sin tabla administrativa .tbl.
    // Navegación «Historial | Tabla histórica» controlada por el carrusel cc-hist.
    el.innerHTML = `
      ${_pubHistoryHitos(all)}
      <div class="hist-duo">
        <div class="h2h-frame" data-reveal>
          <div class="h2h-card">
            <div class="h2h-search">
              <div class="h2h-field">
                <input class="h2h-input" id="h2h-a" type="text" placeholder="Equipo 1" autocomplete="off" aria-label="Primer equipo"
                  role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="h2h-ac-a" aria-haspopup="listbox">
                <div class="h2h-ac" id="h2h-ac-a" role="listbox" aria-label="Resultados para el primer equipo"></div>
              </div>
              <span class="h2h-vs-sm">VS</span>
              <div class="h2h-field">
                <input class="h2h-input" id="h2h-b" type="text" placeholder="Equipo 2" autocomplete="off" aria-label="Segundo equipo"
                  role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="h2h-ac-b" aria-haspopup="listbox">
                <div class="h2h-ac" id="h2h-ac-b" role="listbox" aria-label="Resultados para el segundo equipo"></div>
              </div>
            </div>
            <div class="h2h-hint" id="h2h-hint">Escribe dos equipos para ver su mano a mano</div>
            <div class="h2h-result" id="h2h-result"></div>
          </div>
        </div>
        <div class="histm" id="pub-histm" data-reveal></div>
      </div>
      <button class="hist-redo-btn" id="hist-reset" title="Limpiar filtros" aria-label="Limpiar filtros">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74"/><polyline points="3 3 3 9 9 9"/></svg>
      </button>
    `;
    // _pubInitMatchesView → _pubApplyFilters → _pubUpdateHitos anima los contadores
    // una sola vez (vía _pubHCount, que respeta prefers-reduced-motion).
    _pubInitMatchesView(el, all);
    return;
  } catch(err){
    console.error('[Historial] Error al renderizar:', err);
    if(!isAdmin && renderToken!==_pubHistRenderToken) return;
    el.innerHTML = `
      <div style="background:rgba(239,68,68,0.1);border:1px solid var(--red);border-radius:var(--r);padding:14px;color:var(--red);font-size:13px;">
        <strong>No pudimos cargar el historial.</strong><br>
        <span style="font-size:12px;color:var(--txt3);">Intenta nuevamente en unos segundos.</span>
      </div>`;
  }
}

function _renderFiltersZone(el, all, isAdmin){
  const zone = el.querySelector('.hist-filters-zone');
  if(!zone) return;

  const juegos = [...new Set(all.map(r=>r.juego).filter(Boolean))].sort();
  const exportBtn = isAdmin
    ? `<button class="btn btn-primary btn-sm" onclick="exportHistoryToExcel()">⤓ Exportar Excel</button>`
    : '';

  zone.innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px;">
      <div class="form-group" style="margin:0;min-width:120px;">
        <label>Juego</label>
        <select class="hist-sel-juego" onchange="histSetFilter('fJuego',this.value)" style="padding:6px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:13px;width:100%;">
          <option value="">Todos</option>
          ${juegos.map(j=>`<option value="${_esc(j)}">${_esc(j)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="margin:0;min-width:140px;">
        <label>Temporada</label>
        <select class="hist-sel-temp" onchange="histSetFilter('fTemp',this.value)" style="padding:6px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:13px;width:100%;"></select>
      </div>
      <div class="form-group" style="margin:0;min-width:160px;">
        <label>Instancia</label>
        <select class="hist-sel-inst" onchange="histSetFilter('fInst',this.value)" style="padding:6px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:13px;width:100%;"></select>
      </div>
      <div class="form-group" style="margin:0;flex:1;min-width:150px;">
        <label>Equipo A</label>
        <input type="text" class="hist-qa" value="${_esc(_histState.qA)}" oninput="histSetSearch('qA', this.value)" placeholder="Ej: ANGELES, PROMETEUS..."
          style="padding:6px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:13px;width:100%;">
      </div>
      <div class="form-group" style="margin:0;flex:1;min-width:150px;">
        <label>Equipo B <span style="color:var(--txt3);font-weight:400;text-transform:none;font-size:11px;">(para Mano a Mano)</span></label>
        <input type="text" class="hist-qb" value="${_esc(_histState.qB)}" oninput="histSetSearch('qB', this.value)" placeholder="vs. otro equipo..."
          style="padding:6px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:13px;width:100%;">
      </div>
      <button class="btn btn-sm" onclick="histClearFilters()">Limpiar</button>
      ${exportBtn}
    </div>
  `;

  const selJuego = zone.querySelector('.hist-sel-juego');
  if(selJuego) selJuego.value = _histState.fJuego;
  _refreshDependentSelects(el, all);
}

function _refreshDependentSelects(el, all){
  const tempPool = _histState.fJuego ? all.filter(r=>r.juego===_histState.fJuego) : all;
  const temps = [...new Set(tempPool.map(r=>r.temporada).filter(Boolean))].sort();
  const selTemp = el.querySelector('.hist-sel-temp');
  if(selTemp){
    selTemp.innerHTML = `<option value="">Todas</option>` +
      temps.map(t=>`<option value="${_esc(t)}">${_esc(t)}</option>`).join('');
    selTemp.value = temps.includes(_histState.fTemp) ? _histState.fTemp : '';
    _histState.fTemp = selTemp.value;
  }
  let instPool = all;
  if(_histState.fJuego) instPool = instPool.filter(r=>r.juego===_histState.fJuego);
  if(_histState.fTemp)  instPool = instPool.filter(r=>r.temporada===_histState.fTemp);
  const insts = [...new Set(instPool.map(r=>r.instancia).filter(Boolean))].sort();
  const selInst = el.querySelector('.hist-sel-inst');
  if(selInst){
    selInst.innerHTML = `<option value="">Todas</option>` +
      insts.map(i=>`<option value="${_esc(i)}">${_esc(i)}</option>`).join('');
    selInst.value = insts.includes(_histState.fInst) ? _histState.fInst : '';
    _histState.fInst = selInst.value;
  }
}

function _refreshTableZone(el, all, isAdmin){
  const summary = el.querySelector('.hist-summary-zone');
  const table   = el.querySelector('.hist-table-zone');
  const more    = el.querySelector('.hist-more-zone');
  if(!table) return;

  // ¿Modo Mano a Mano? Ambos buscadores resuelven a equipos distintos.
  const teamA = _histResolveTeam(_histState.qA, _histTeams);
  const teamB = _histResolveTeam(_histState.qB, _histTeams);
  if(teamA && teamB && teamA.id !== teamB.id){
    const base = all.filter(r =>
      (!_histState.fJuego || r.juego===_histState.fJuego) &&
      (!_histState.fTemp  || r.temporada===_histState.fTemp) &&
      (!_histState.fInst  || r.instancia===_histState.fInst)
    );
    if(summary) summary.textContent = '';
    if(more) more.innerHTML = '';
    table.classList.remove('card');
    table.style.overflow = 'visible';
    table.innerHTML = _buildH2HPanel(teamA, teamB, base);
    return;
  }
  table.classList.add('card');
  table.style.overflow = 'auto';

  const filtered = _sortDesc(_applyFilters(all));
  const total    = filtered.length;
  const limit    = _histState.page * HIST_PAGE_SIZE;
  const slice    = filtered.slice(0, limit);

  if(summary){
    summary.textContent = `${total.toLocaleString('es-CL')} partido${total===1?'':'s'}` +
      (total!==all.length ? ` · de ${all.length.toLocaleString('es-CL')} en total` : '');
  }

  table.innerHTML = `
    <table class="tbl" style="width:100%;font-size:13px;">
      <thead>
        <tr>
          <th style="text-align:right;">ID</th>
          <th>Juego</th>
          <th>Temporada</th>
          <th>Instancia</th>
          <th style="text-align:right;">Equipo A</th>
          <th style="text-align:center;">Goles A</th>
          <th style="text-align:center;">Goles B</th>
          <th>Equipo B</th>
          <th style="text-align:center;">Pen. A</th>
          <th style="text-align:center;">Pen. B</th>
          <th>Resultado</th>
        </tr>
      </thead>
      <tbody>${slice.map(r=>_histRowHTML(r)).join('')}</tbody>
    </table>
  `;

  if(more){
    more.innerHTML = (slice.length<total)
      ? `<div style="text-align:center;margin-top:14px;">
           <button class="btn" onclick="histShowMore()">Mostrar más (${(total-slice.length).toLocaleString('es-CL')} restantes)</button>
         </div>`
      : '';
  }
}

function _histRowHTML(r){
  const gA=r.golesA, gB=r.golesB;
  const aW = gA>gB || /Gana A/.test(r.resultado||'');
  const bW = gB>gA || /Gana B/.test(r.resultado||'');
  const styleA = aW ? 'font-weight:700;color:var(--green);' : (bW?'opacity:0.6;':'');
  const styleB = bW ? 'font-weight:700;color:var(--green);' : (aW?'opacity:0.6;':'');
  const penA = r.penA!=null ? r.penA : '';
  const penB = r.penB!=null ? r.penB : '';
  const isLive = r.source==='live';

  return `<tr>
    <td style="text-align:right;font-family:'Bebas Neue';color:var(--txt3);padding:6px 10px;">${r.id}</td>
    <td style="padding:6px 10px;">${_esc(r.juego)}</td>
    <td style="padding:6px 10px;">${_esc(r.temporada)}</td>
    <td style="padding:6px 10px;">${_esc(r.instancia)}</td>
    <td style="text-align:right;padding:6px 10px;${styleA}">${_teamCellHTML(r.equipoA, 'right')}</td>
    <td style="text-align:center;font-family:'Bebas Neue';font-size:18px;padding:6px 4px;${styleA}">${gA}</td>
    <td style="text-align:center;font-family:'Bebas Neue';font-size:18px;padding:6px 4px;${styleB}">${gB}</td>
    <td style="padding:6px 10px;${styleB}">${_teamCellHTML(r.equipoB, 'left')}</td>
    <td style="text-align:center;color:var(--txt3);padding:6px 4px;">${penA}</td>
    <td style="text-align:center;color:var(--txt3);padding:6px 4px;">${penB}</td>
    <td style="padding:6px 10px;font-size:12px;color:${isLive?'var(--gold)':'var(--txt2)'};">${_esc(r.resultado)}</td>
  </tr>`;
}

/* Render de una celda de equipo con nota de nombres anteriores.
   - Si el equipo (actual) tiene previousNames: muestra el ícono ⓘ con tooltip.
   - Si el nombre que aparece en la fila ES un nombre anterior: nota "ahora: NombreActual".
*/
function _teamCellHTML(equipoName, align='left'){
  const lookup = window._histTeamLookup;
  const safeRaw = _esc(equipoName);
  if(!lookup || !equipoName) return safeRaw;

  const entry = lookup.get(_histNorm(equipoName));
  if(!entry) return safeRaw;   // nombre sin equipo conocido: mostrar tal cual

  // Mostrar SIEMPRE el nombre actual/canónico del club (resuelto por id de equipo)
  const displayName = _esc(entry.currentName || equipoName);
  const recordedDiffers = _histNorm(entry.currentName) !== _histNorm(equipoName);
  const hasPrev = entry.previousNames.length > 0;
  if(!recordedDiffers && !hasPrev) return displayName;

  // Tooltip: nota del nombre con que figuró este partido + nombres anteriores.
  const tooltipLines = [];
  if(recordedDiffers) tooltipLines.push(`En este partido figuró como: ${equipoName}`);
  if(hasPrev){
    if(recordedDiffers) tooltipLines.push('');
    tooltipLines.push('Nombres anteriores:');
    entry.previousNames.forEach(p=>tooltipLines.push(`• ${p}`));
  }
  const tooltip = _esc(tooltipLines.join('\n'));

  return `<span class="hist-prev-tap" data-prev="${tooltip}" title="${tooltip}" onclick="histShowPrev(event,this)" style="cursor:pointer;">${displayName}<sup style="color:var(--gold);margin-left:3px;font-size:10px;">ⓘ</sup></span>`;
}

/* Muestra los nombres anteriores en un popover al TOCAR la ⓘ (clave en móvil,
   donde no hay hover). En desktop sigue funcionando el title. Toggle: se cierra
   al tocar fuera o al volver a tocar el mismo. */
function histShowPrev(event, el){
  if(event){ event.stopPropagation(); event.preventDefault(); }
  const text = (el.getAttribute('data-prev')||'').trim();
  const existing = document.querySelector('.hist-prev-pop');
  const sameKey = existing && existing.dataset.for === text;
  if(existing) existing.remove();
  if(sameKey || !text) return;
  const pop = document.createElement('div');
  pop.className = 'hist-prev-pop';
  pop.dataset.for = text;
  pop.style.cssText = 'position:fixed;z-index:99999;background:var(--card2);border:1px solid var(--gold-b,#c9a84c);border-radius:8px;padding:8px 12px;font-size:12px;line-height:1.5;color:var(--txt);box-shadow:0 8px 28px rgba(0,0,0,0.5);max-width:240px;white-space:pre-line;';
  pop.textContent = text;
  document.body.appendChild(pop);
  const r = el.getBoundingClientRect();
  let left = Math.min(r.left, window.innerWidth - pop.offsetWidth - 8);
  if(left < 8) left = 8;
  let top = r.bottom + 6;
  if(top + pop.offsetHeight > window.innerHeight - 8) top = r.top - pop.offsetHeight - 6;
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
  setTimeout(()=>{
    const close = ()=>{ pop.remove(); document.removeEventListener('click', close); };
    document.addEventListener('click', close, { once:true });
  }, 0);
}

/* ----------------------------------------------------------
   Eventos de filtro
   ---------------------------------------------------------- */
function _currentHistContainer(){
  return _histState.mode==='admin'
    ? document.getElementById('adm-history-content')
    : document.getElementById('pub-history-content');
}

async function histSetFilter(key, value){
  _histState[key] = value;
  if(key==='fJuego'){ _histState.fTemp=''; _histState.fInst=''; }
  if(key==='fTemp'){ _histState.fInst=''; }
  _histState.page = 1;
  const el = _currentHistContainer();
  if(!el) return;
  const all = await _getResolvedRecords();
  _refreshDependentSelects(el, all);
  _refreshTableZone(el, all, _histState.mode==='admin');
}

async function histSetSearch(which, value){
  _histState[which] = value;
  _histState.page = 1;
  const el = _currentHistContainer();
  if(!el) return;
  const all = await _getResolvedRecords();
  _refreshTableZone(el, all, _histState.mode==='admin');
}

async function histClearFilters(){
  _histState.fJuego = '';
  _histState.fTemp  = '';
  _histState.fInst  = '';
  _histState.qA     = '';
  _histState.qB     = '';
  _histState.page   = 1;
  if(_histState.mode==='admin') await renderAdmHistory();
  else await renderPubHistory();
}

async function histShowMore(){
  _histState.page += 1;
  const el = _currentHistContainer();
  if(!el) return;
  const all = await _getResolvedRecords();
  _refreshTableZone(el, all, _histState.mode==='admin');
}

/* ----------------------------------------------------------
   EXPORTAR A EXCEL
   ---------------------------------------------------------- */
async function _loadXLSXLib(){
  if(window.XLSX) return window.XLSX;
  await new Promise((res, rej)=>{
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload = res;
    s.onerror = ()=>rej(new Error('No se pudo cargar SheetJS'));
    document.head.appendChild(s);
  });
  return window.XLSX;
}

async function exportHistoryToExcel(){
  try {
    showToast('Preparando Excel...');
    const XLSX = await _loadXLSXLib();
    const all  = await _getResolvedRecords();
    const rows = _sortDesc(all).map(r=>({
      'ID': r.id,
      'Juego': r.juego,
      'Temporada': r.temporada,
      'Instancia': r.instancia,
      'Equipo A': r.equipoA,
      'Goles A': r.golesA,
      'Goles B': r.golesB,
      'Equipo B': r.equipoB,
      'Pen. A': r.penA||'',
      'Pen. B': r.penB||'',
      'Resultado': r.resultado,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Partidos');
    const stamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `HISTORIAL_TSC_${stamp}.xlsx`);
    showToast(`Excel exportado: ${rows.length} partidos`);
  } catch(err){
    console.error(err);
    showToast('Error al exportar Excel: '+err.message,'error');
  }
}

/* ==========================================================
   TABLA HISTÓRICA ACUMULADA
   - Imported (JSON estático): siempre cuentan.
   - Live (IDB): solo cuentan si su temporada está 'finished'.
     → al reactivar la temporada, los lives dejan de contar
       automáticamente (no se persiste snapshot).
   - Penales = Empate (regla FIFA tradicional). Solo "Gana A"/"Gana B"
     sin (PK) cuentan como Victoria/Derrota.
   - Rendimiento = Pts / (PJ × 3) × 100  (estilo FIFA actual).
   ========================================================== */
const _histStdState = {
  fJuego: '',
  fTemp: '',
  sortBy: 'pts',     // pj | v | e | p | gf | gc | dg | pts | rend
  sortDir: 'desc',   // 'asc' | 'desc'
  mode: 'admin',
};

/* Encabezado de columna ordenable (con flecha si está activa) */
function _histStdTh(label, key){
  const active = _histStdState.sortBy === key;
  const arrow  = active ? (_histStdState.sortDir==='asc' ? ' ▲' : ' ▼') : '';
  const col    = active ? 'color:var(--gold);font-weight:700;' : '';
  return `<th onclick="histStdSort('${key}')" title="Ordenar por ${label}" style="text-align:center;cursor:pointer;user-select:none;white-space:nowrap;${col}">${label}${arrow}</th>`;
}

function _classifyOutcomeFIFA(r){
  // Empata: Empate o cualquiera definido por penales (PK).
  const res = String(r.resultado||'');
  if(/PK\)/.test(res)) return 'E';
  if(res==='Gana A')   return 'A';
  if(res==='Gana B')   return 'B';
  return 'E';
}

async function _computeHistoricalStandings(){
  const [staticRows, idbLive, allTeams, seasons] = await Promise.all([
    loadStaticHistory(),
    dbGetAll('matchHistory', h=>h.source==='live'),
    dbGetAll('teams'),
    dbGetAll('seasons'),
  ]);

  // Set de números de temporada finalizadas (los lives de seasons activas NO cuentan)
  const finishedSet = new Set(seasons.filter(s=>s.status==='finished').map(s=>s.number));

  // Lookup por nombre (actual + previousNames) → entry de equipo.
  // Normaliza (sin puntos/comas, espacios colapsados, mayúsculas) para que
  // variantes como "AC. ANGELES ROJOS" y "AC ANGELES ROJOS" cuenten igual.
  const normName = s => String(s||'').toUpperCase().replace(/[.,]/g,'').replace(/\s+/g,' ').trim();
  const lookup = new Map();
  for(const t of allTeams){
    const entry = {
      currentName: t.name,
      teamId: t.id,
      logo: t.logo || null,
      color: t.color || null,
      ini: t.ini || null,
      previousNames: (Array.isArray(t.previousNames)?t.previousNames:[]).map(s=>String(s).trim()).filter(Boolean),
      status: t.status || 'ACTIVO',
    };
    if(t.name) lookup.set(normName(t.name), entry);
    entry.previousNames.forEach(p=>lookup.set(normName(p), entry));
  }

  // Resolver lives: cada uno con su match/phase/comp/season para extraer juego, temporada, equipoA/B
  const liveResolved = await Promise.all(idbLive.map(h => resolveHistoryRecord(h)));
  const liveWithMeta = liveResolved.map((r, idx) => ({
    ...r,
    seasonRef: idbLive[idx].seasonRef,
  }));

  // Filtrar lives: solo los de temporadas finalizadas
  const livesEligible = liveWithMeta.filter(r => finishedSet.has(r.seasonRef));

  const all = [...staticRows, ...livesEligible];

  // Aplicar filtros (juego, temporada)
  const fJuego = _histStdState.fJuego;
  const fTemp  = _histStdState.fTemp;
  const filtered = all.filter(r=>{
    if(fJuego && r.juego!==fJuego) return false;
    if(fTemp  && r.temporada!==fTemp) return false;
    return true;
  });

  // Acumular stats por equipo (clave = currentName si matchea, sino el propio nombre)
  const stats = new Map();
  const ensure = (key, sample)=>{
    if(!stats.has(key)){
      stats.set(key, {
        key,
        name: sample?.currentName || key,
        logo: sample?.logo || null,
        color: sample?.color || null,
        ini: sample?.ini || null,
        previousNames: sample?.previousNames || [],
        teamId: sample?.teamId ?? null,
        pj:0, v:0, e:0, p:0, gf:0, gc:0,
      });
    }
    return stats.get(key);
  };

  for(const r of filtered){
    const eA = String(r.equipoA||'').trim();
    const eB = String(r.equipoB||'').trim();
    if(!eA || !eB) continue;
    const lookA = lookup.get(normName(eA));
    const lookB = lookup.get(normName(eB));
    // Clave estricta por id de equipo (un club = un id); si no resuelve, por nombre.
    const keyA = lookA ? `#${lookA.teamId}` : normName(eA);
    const keyB = lookB ? `#${lookB.teamId}` : normName(eB);
    if(keyA===keyB) continue; // safety
    const a = ensure(keyA, lookA);
    const b = ensure(keyB, lookB);
    const gA = parseInt(r.golesA)||0;
    const gB = parseInt(r.golesB)||0;
    a.pj++; b.pj++;
    a.gf+=gA; a.gc+=gB;
    b.gf+=gB; b.gc+=gA;
    const out = _classifyOutcomeFIFA(r);
    if(out==='A'){ a.v++; b.p++; }
    else if(out==='B'){ b.v++; a.p++; }
    else { a.e++; b.e++; }
  }

  // Calcular DG, Pts, Rendimiento. Filtrar PJ=0.
  const arr = [...stats.values()].filter(s=>s.pj>0);
  arr.forEach(s=>{
    s.dg = s.gf - s.gc;
    s.pts = s.v*3 + s.e;
    s.rendimiento = s.pj>0 ? (s.pts / (s.pj*3)) : 0;
  });
  const _sb  = _histStdState.sortBy || 'pts';
  const _dir = _histStdState.sortDir === 'asc' ? 1 : -1;
  const _val = (s)=> _sb==='rend' ? s.rendimiento : (s[_sb] ?? 0);
  arr.sort((a,b)=>{
    const d = _val(a) - _val(b);
    if(d !== 0) return _dir * d;
    // Desempates fijos (para orden estable)
    if(b.pts !== a.pts) return b.pts - a.pts;
    if(b.dg !== a.dg)   return b.dg - a.dg;
    return a.name.localeCompare(b.name);
  });

  // Para los selects: opciones disponibles según juego (cascada)
  const juegosAll  = [...new Set(all.map(r=>r.juego).filter(Boolean))].sort();
  const tempPool   = fJuego ? all.filter(r=>r.juego===fJuego) : all;
  const temporadas = [...new Set(tempPool.map(r=>r.temporada).filter(Boolean))].sort();

  return {standings: arr, juegosAll, temporadas, totalMatches: filtered.length, livesPending: liveWithMeta.length - livesEligible.length};
}

async function renderAdmHistoryStandings(){
  _histStdState.mode = 'admin';
  const el = document.getElementById('adm-history-standings-content');
  if(!el) return;
  await _renderHistoryStandingsInto(el, true);
}

async function renderPubHistoryStandings(){
  const renderToken = ++_pubHistRenderToken;
  _histStdState.mode = 'public';
  // La tabla histórica pública hereda el filtro juego/temporada del carrusel.
  _histStdState.fJuego = _pubH.game;
  _histStdState.fTemp  = _pubH.season;
  if(typeof renderPubSidebarHistorial==='function') renderPubSidebarHistorial('tabla');
  const el = document.getElementById('pub-history-content');
  if(!el) return;
  _injectHistHeader(1);
  await _pubRenderHistoryStandings(el, renderToken);
}

/* ── Tabla histórica pública: 6 layouts responsive (_htLayout) + expansión ── */
const _htState = { rows:[], expanded:false };
function _htNum(v){ return Number.isFinite(Number(v)) ? String(Number(v)) : '—'; }
function _htPct(v){ return Number.isFinite(Number(v)) ? `${Number(v).toFixed(1)}%` : '—'; }
function _htStatCell(value){ return `<div class="ht-detail-item"><b>${_esc(_htNum(value))}</b></div>`; }
function _htStatHeadCell(label){ return `<div class="ht-detail-item"><span>${_esc(label)}</span></div>`; }
const _PB_X = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
const _PB_PLUS = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';

function _htLayout(){
  const w = window.innerWidth;
  if(w>=1360) return { key:'full', grid:'34px minmax(0,1.7fr) repeat(7,minmax(44px,.55fr)) 58px minmax(240px,1.35fr)', cols:['pj','pg','pe','pp','gf','gc','dif','pts','rend'], detailCols:'repeat(8,minmax(0,1fr))', canToggle:false };
  if(w>=1180) return { key:'wide', grid:'34px minmax(0,1.65fr) repeat(6,minmax(42px,.52fr)) 56px minmax(220px,1.2fr)', cols:['pj','pg','pe','pp','gf','gc','pts','rend'], detailCols:'repeat(8,minmax(0,1fr))', canToggle:false };
  if(w>=1080) return { key:'mid', grid:'34px minmax(0,1.6fr) repeat(4,minmax(42px,.52fr)) 56px minmax(200px,1.1fr)', cols:['pj','pg','pe','pp','pts','rend'], detailCols:'repeat(4,minmax(0,1fr))', canToggle:false };
  if(w>=860)  return { key:'trim', grid:'34px minmax(0,1.5fr) repeat(3,minmax(42px,.5fr)) 56px minmax(160px,1fr)', cols:['pj','gf','gc','pts','rend'], detailCols:'repeat(4,minmax(0,1fr))', canToggle:false };
  if(_htState.expanded) return { key:'detail', grid: w>=620 ? '32px minmax(0,1.1fr) minmax(250px,1fr)' : '30px minmax(0,1fr) minmax(170px,.95fr)', cols:['detail'], detailCols: w>=620 ? 'repeat(8,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))', canToggle:true };
  return { key:'compact', grid: w>=620 ? '32px minmax(0,1.2fr) 46px 54px minmax(108px,1fr)' : '30px minmax(0,1fr) 40px 48px minmax(90px,1fr)', cols:['pj','pts','rend'], detailCols:'repeat(4,minmax(0,1fr))', canToggle:true };
}
function _htHeader(layout){
  const toggle = layout.canToggle
    ? `<button type="button" class="ht-head-btn" data-ht-toggle="rend" aria-pressed="${layout.key==='detail'?'true':'false'}"><span>Rendimiento</span><span class="ht-head-ico">${layout.key==='detail'?_PB_X:_PB_PLUS}</span></button>`
    : 'Rendimiento';
  if(layout.key==='detail') return `<div class="ht-fix"><span>#</span><span>Equipo</span><button type="button" class="ht-head-btn ht-fix-close" data-ht-toggle="rend" aria-pressed="true" aria-label="Colapsar estadísticas">${_PB_X}</button></div><div class="ht-detail">`
    + ['PJ','PG','PE','PP','GF','GC','DIF','PTS'].map(_htStatHeadCell).join('') + `</div>`;
  return `<span>#</span><span>Equipo</span>` + layout.cols.map(col=>{
    if(col==='rend') return `<span>${toggle}</span>`;
    return `<span class="ht-stat">${({pj:'PJ',pg:'PG',pe:'PE',pp:'PP',gf:'GF',gc:'GC',dif:'DIF',pts:'PTS'})[col]}</span>`;
  }).join('');
}
function _htCrest(r){
  const inner = r.logo ? `<img src="${_esc(r.logo)}" alt="">` : _esc(r.ini||_pubHIni(r.name));
  return `<span class="ht-crest" style="background:${_esc(r.color||'#5f6368')};">${inner}</span>`;
}
/* Nombre del equipo + ícono ⓘ si tiene nombres anteriores (mismo patrón que
   _histStdRowHTML: hover muestra title en desktop, tocar abre popover vía
   histShowPrev en móvil). */
function _htNameHTML(r){
  if(!(r.previousNames && r.previousNames.length)) return `<span class="ht-name">${_esc(r.name)}</span>`;
  const tooltip = _esc(['Nombres anteriores:', ...r.previousNames.map(p=>`• ${p}`)].join('\n'));
  return `<span class="ht-name hist-prev-tap" data-prev="${tooltip}" title="${tooltip}" onclick="histShowPrev(event,this)" style="cursor:pointer;">${_esc(r.name)}<sup style="color:var(--gold);margin-left:3px;cursor:help;font-size:10px;">ⓘ</sup></span>`;
}
function _htRow(r, layout){
  const detail = `<div class="ht-detail">`
    + _htStatCell(r.pj) + _htStatCell(r.w) + _htStatCell(r.d) + _htStatCell(r.l)
    + _htStatCell(r.gf) + _htStatCell(r.gc) + _htStatCell(r.dif) + _htStatCell(r.pts)
    + `</div>`;
  if(layout.key==='detail'){
    return `<div class="ht-row"><div class="ht-fix"><span class="ht-pos">${r.pos}</span>
      <div class="ht-team">${_htCrest(r)}${_htNameHTML(r)}</div></div>${detail}</div>`;
  }
  const cells = layout.cols.map(col=>{
    if(col==='rend'){
      const width = Math.max(4, Math.min(100, Number(r.rend)||0)).toFixed(1);
      return `<div class="ht-rend"><div class="ht-bar"><i style="width:0%;" data-w="${width}"></i></div><span class="ht-pct">${_htPct(r.rend)}</span></div>`;
    }
    const val = ({pj:r.pj,pg:r.w,pe:r.d,pp:r.l,gf:r.gf,gc:r.gc,dif:r.dif,pts:r.pts})[col];
    const cls = col==='pts' ? 'ht-pts' : 'ht-col';
    return `<span class="${cls} ${layout.canToggle?'ht-col-hide-in-detail':''}">${_esc(_htNum(val))}</span>`;
  }).join('');
  return `<div class="ht-row"><span class="ht-pos">${r.pos}</span>
    <div class="ht-team">${_htCrest(r)}${_htNameHTML(r)}</div>${cells}</div>`;
}
function _renderHtTable(el){
  const card = el.querySelector('.ht-card');
  const head = card?.querySelector('.ht-row.hdr');
  const rows = card?.querySelector('#ht-rows');
  if(!card || !head || !rows) return;
  const layout = _htLayout();
  card.dataset.layout = layout.key;
  card.style.setProperty('--ht-grid', layout.grid);
  card.style.setProperty('--ht-detail-cols', layout.detailCols);
  head.innerHTML = _htHeader(layout);
  rows.innerHTML = _htState.rows.map(r=>_htRow(r, layout)).join('');
  // Rellena las barras de rendimiento (transición CSS desde 0%).
  requestAnimationFrame(()=>{ rows.querySelectorAll('.ht-bar i').forEach(b=>{ b.style.width = (b.dataset.w||0)+'%'; }); });
  // Re-evalúa el fade de bordes (scroll horizontal del detalle): el ancho de
  // contenido pudo cambiar con el layout nuevo.
  card.querySelector('.ht-scroll')?._htFadeUpdate?.();
}

let _htBound = false;
let _htObserver = null;
function _bindHtTable(el){
  const card = el.querySelector('.ht-card');
  if(!card) return;
  card.addEventListener('click', e=>{
    const btn = e.target.closest('[data-ht-toggle="rend"]');
    if(!btn || window.innerWidth>=860) return;
    _htState.expanded = !_htState.expanded;
    _renderHtTable(el);
  });
  const scroll = card.querySelector('.ht-scroll');
  if(scroll){
    const updFade = ()=>{ card.classList.toggle('more-r', scroll.scrollLeft+scroll.clientWidth < scroll.scrollWidth-2); card.classList.toggle('more-l', scroll.scrollLeft>2); };
    scroll._htFadeUpdate = updFade;
    scroll.addEventListener('scroll', updFade, {passive:true});
    updFade();
  }
  if(!_htBound){
    _htBound = true;
    window.addEventListener('resize', ()=>{
      const live = document.querySelector('#pub-history-content .ht-card');
      if(!live) return;
      if(window.innerWidth>=860 && _htState.expanded) _htState.expanded = false;
      _renderHtTable(live.closest('#pub-history-content') || document);
    });
  }
  // Anima barras al entrar en viewport
  _htObserver?.disconnect();
  _htObserver = null;
  if('IntersectionObserver' in window){
    _htObserver = new IntersectionObserver((ents,obs)=>{
      ents.forEach(e=>{ if(!e.isIntersecting) return;
        card.querySelectorAll('.ht-bar i').forEach(bar=>{ bar.style.width=(bar.dataset.w||0)+'%'; });
        obs.unobserve(e.target);
      });
    },{threshold:0.1});
    _htObserver.observe(card);
  }
}

/* Renderer público de la tabla histórica con markup .ht-* responsive (sin controles admin). */
async function _pubRenderHistoryStandings(el, renderToken){
  try {
    const data = await _computeHistoricalStandings();
    if(renderToken!==_pubHistRenderToken) return;
    if(!data.standings.length){
      el.innerHTML = '<div style="color:var(--txt3);font-size:15px;padding:20px;text-align:center;">No hay datos suficientes para la tabla histórica.</div>';
      return;
    }
    _htState.expanded = false;
    _htState.rows = data.standings.map((s,i)=>({
      pos:i+1, name:s.name||'?', ini:(s.ini||(s.name||'?').substring(0,3)).toUpperCase(),
      color:s.color||'#5f6368', logo:s.logo||null,
      pj:s.pj, w:s.v, d:s.e, l:s.p, gf:s.gf, gc:s.gc, dif:s.dg, pts:s.pts,
      rend:(s.rendimiento||0)*100,
      previousNames:s.previousNames||[],
    }));
    el.innerHTML = `<div class="ht-card"><div class="ht-scrollwrap"><div class="ht-scroll"><div class="ht-row hdr"></div><div id="ht-rows"></div></div><div class="ht-fade l"></div><div class="ht-fade r"></div></div></div>`;
    _renderHtTable(el);
    _bindHtTable(el);
  } catch(err){
    console.error('[Tabla histórica pública]', err);
    if(renderToken!==_pubHistRenderToken) return;
    el.innerHTML = '<div style="background:rgba(239,68,68,0.1);border:1px solid var(--red);border-radius:var(--r);padding:14px;color:var(--red);font-size:13px;"><strong>No pudimos calcular la tabla histórica.</strong><br><span style="font-size:12px;color:var(--txt3);">Intenta nuevamente en unos segundos.</span></div>';
  }
}

/* Activa el mano a mano público entre dos equipos (por inicial o nombre).
   Si la vista «Partidos» del Historial no está montada, la renderiza primero. */
async function histH2HShow(qA, qB){
  if(!document.getElementById('h2h-a')) await renderPubHistory();
  const resolve = q => _pubH.teamList.find(t=>(t.ini||'').toUpperCase()===String(q).toUpperCase())
    || _histResolveTeam(q, _pubH.teamList)
    || _pubHTeamMeta(q);
  const ta = resolve(qA), tb = resolve(qB);
  if(!ta || !tb) return;
  _pubH.pickA = ta; _pubH.pickB = tb; _pubH.selectedId = null;
  const inA = document.getElementById('h2h-a'), inB = document.getElementById('h2h-b');
  if(inA) inA.value = ta.name;
  if(inB) inB.value = tb.name;
  _pubDrawH2H('Mano a mano');
  const _h2hReduced = window.MOTION?.reduced() || matchMedia('(prefers-reduced-motion:reduce)').matches;
  document.querySelector('.h2h-frame')?.scrollIntoView({behavior:_h2hReduced?'auto':'smooth', block:'center'});
}

async function _renderHistoryStandingsInto(el, isAdmin){
  try {
    const data = await _computeHistoricalStandings();

    el.innerHTML = `
      ${_renderHistorySubNav('tabla', isAdmin)}
      <div id="hist-std-filters" style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px;">
        <div class="form-group" style="margin:0;min-width:120px;">
          <label>Juego</label>
          <select onchange="histStdSetFilter('fJuego',this.value)" style="padding:6px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:13px;width:100%;">
            <option value="">Todos</option>
            ${data.juegosAll.map(j=>`<option value="${_esc(j)}" ${_histStdState.fJuego===j?'selected':''}>${_esc(j)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin:0;min-width:140px;">
          <label>Temporada</label>
          <select onchange="histStdSetFilter('fTemp',this.value)" style="padding:6px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:13px;width:100%;">
            <option value="">Todas</option>
            ${data.temporadas.map(t=>`<option value="${_esc(t)}" ${_histStdState.fTemp===t?'selected':''}>${_esc(t)}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-sm" onclick="histStdClearFilters()">Limpiar</button>
        <div style="margin-left:auto;font-size:12px;color:var(--txt3);">
          ${data.standings.length.toLocaleString('es-CL')} equipo${data.standings.length===1?'':'s'} · ${data.totalMatches.toLocaleString('es-CL')} partidos
          ${data.livesPending>0 ? `<br><span style="color:var(--gold);">${data.livesPending} partido${data.livesPending===1?'':'s'} pendiente${data.livesPending===1?'':'s'} de finalizar temporada</span>`:''}
        </div>
      </div>
      <div class="card" style="overflow:auto;">
        <table class="tbl" style="width:100%;font-size:13px;">
          <thead>
            <tr>
              <th style="width:40px;text-align:right;">#</th>
              <th>Equipo</th>
              ${_histStdTh('PJ','pj')}
              ${_histStdTh('V','v')}
              ${_histStdTh('E','e')}
              ${_histStdTh('P','p')}
              ${_histStdTh('GF','gf')}
              ${_histStdTh('GC','gc')}
              ${_histStdTh('DG','dg')}
              ${_histStdTh('Pts','pts')}
              ${_histStdTh('Rend.','rend')}
            </tr>
          </thead>
          <tbody>${data.standings.map((s,i)=>_histStdRowHTML(s, i)).join('')}</tbody>
        </table>
      </div>
    `;
  } catch(err){
    console.error('[Tabla histórica] Error:', err);
    el.innerHTML = `<div style="background:rgba(239,68,68,0.1);border:1px solid var(--red);border-radius:var(--r);padding:14px;color:var(--red);font-size:13px;">
      <strong>Error al calcular tabla histórica:</strong><br>
      <code style="font-size:11px;color:var(--txt2);">${(err.message||err).toString().replace(/</g,'&lt;')}</code>
    </div>`;
  }
}

function _histStdRowHTML(s, i){
  const dg = s.dg;
  const dgStyle = dg>0 ? 'color:var(--green);' : dg<0 ? 'color:var(--red);' : 'color:var(--txt2);';
  const dgTxt = dg>0 ? `+${dg}` : dg;
  const rendPct = (s.rendimiento*100).toFixed(1);
  const rendColor = s.rendimiento>=0.6 ? 'var(--green)' : s.rendimiento>=0.4 ? 'var(--gold)' : 'var(--red)';
  const ini = s.ini || (s.name?.substring(0,3) || '?').toUpperCase();
  const logoHTML = s.logo
    ? `<img src="${s.logo}" style="width:100%;height:100%;object-fit:cover;">`
    : `${_esc(ini)}`;

  // Tooltip de previousNames si tiene
  const tooltipLines = [];
  if(s.previousNames && s.previousNames.length){
    tooltipLines.push('Nombres anteriores:');
    s.previousNames.forEach(p=>tooltipLines.push(`• ${p}`));
  }
  const tooltip = _esc(tooltipLines.join('\n'));
  const iconPrev = s.previousNames && s.previousNames.length
    ? `<sup style="color:var(--gold);margin-left:3px;cursor:help;font-size:10px;">ⓘ</sup>`
    : '';

  return `<tr>
    <td style="text-align:right;color:var(--txt3);padding:6px 10px;font-family:'Bebas Neue';">${i+1}</td>
    <td style="padding:6px 10px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:24px;height:24px;border-radius:50%;background:${s.color||'#333'};overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;flex-shrink:0;">${logoHTML}</div>
        <span ${tooltip?`class="hist-prev-tap" data-prev="${tooltip}" title="${tooltip}" onclick="histShowPrev(event,this)" style="cursor:pointer;"`:''}>${_esc(s.name)}${iconPrev}</span>
      </div>
    </td>
    <td style="text-align:center;color:var(--txt2);padding:6px 4px;">${s.pj}</td>
    <td style="text-align:center;color:var(--txt2);padding:6px 4px;">${s.v}</td>
    <td style="text-align:center;color:var(--txt2);padding:6px 4px;">${s.e}</td>
    <td style="text-align:center;color:var(--txt2);padding:6px 4px;">${s.p}</td>
    <td style="text-align:center;color:var(--txt2);padding:6px 4px;">${s.gf}</td>
    <td style="text-align:center;color:var(--txt2);padding:6px 4px;">${s.gc}</td>
    <td style="text-align:center;padding:6px 4px;${dgStyle}">${dgTxt}</td>
    <td style="text-align:center;font-weight:700;padding:6px 4px;">${s.pts}</td>
    <td style="text-align:center;color:${rendColor};font-weight:600;padding:6px 4px;">${rendPct}%</td>
  </tr>`;
}

/* Sub-nav Partidos | Tabla histórica.
   Solo en vista pública: en admin la navegación se hace por el sidebar.
*/
function _renderHistorySubNav(active, isAdmin){
  return ''; // Sub-nav movido al sidebar público
}

async function histStdSetFilter(key, value){
  _histStdState[key] = value;
  if(key==='fJuego'){ _histStdState.fTemp = ''; }
  if(_histStdState.mode==='admin') await renderAdmHistoryStandings();
  else await renderPubHistoryStandings();
}

async function histStdSort(key){
  if(_histStdState.sortBy === key){
    _histStdState.sortDir = _histStdState.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    _histStdState.sortBy = key;
    _histStdState.sortDir = 'desc';   // por defecto de mayor a menor
  }
  if(_histStdState.mode==='admin') await renderAdmHistoryStandings();
  else await renderPubHistoryStandings();
}

async function histStdClearFilters(){
  _histStdState.fJuego = '';
  _histStdState.fTemp  = '';
  if(_histStdState.mode==='admin') await renderAdmHistoryStandings();
  else await renderPubHistoryStandings();
}

/* ============================================================
   MANO A MANO (H2H) — panel de enfrentamientos directos entre dos
   equipos. Integrado en "Partidos": se activa al escribir un equipo
   en cada buscador (Equipo A / Equipo B). Devuelve el HTML del panel.
   ============================================================ */
function _buildH2HPanel(teamA, teamB, records){
  const namesA = new Set([teamA.name, ...(teamA.previousNames||[])].map(_histNorm));
  const namesB = new Set([teamB.name, ...(teamB.previousNames||[])].map(_histNorm));

  // Partidos donde se enfrentan A y B (en cualquier orden)
  const matches = (records||[]).filter(r=>{
    const a = _histNorm(r.equipoA), b = _histNorm(r.equipoB);
    return (namesA.has(a) && namesB.has(b)) || (namesA.has(b) && namesB.has(a));
  });

  if(!matches.length){
    return `<div style="color:var(--txt3);font-size:14px;padding:24px;text-align:center;">
      <b>${_esc(teamA.name)}</b> y <b>${_esc(teamB.name)}</b> no se han enfrentado${(_histState.fJuego||_histState.fTemp||_histState.fInst)?' (con los filtros actuales)':' en el historial'}.</div>`;
  }

  let winsA=0, draws=0, winsB=0, gfA=0, gfB=0, penWinsA=0, penWinsB=0;
  const rows = [];
  for(const r of matches){
    const aIsHome = namesA.has(_histNorm(r.equipoA));
    const gHome = parseInt(r.golesA)||0, gAway = parseInt(r.golesB)||0;
    const gA = aIsHome ? gHome : gAway;        // goles del equipo A
    const gB = aIsHome ? gAway : gHome;        // goles del equipo B
    gfA += gA; gfB += gB;
    if(gA>gB) winsA++; else if(gA<gB) winsB++; else {
      draws++;
      // desempate por penales si los hay
      const pHome = parseInt(r.penA), pAway = parseInt(r.penB);
      if(Number.isFinite(pHome) && Number.isFinite(pAway) && pHome!==pAway){
        const pA = aIsHome ? pHome : pAway, pB = aIsHome ? pAway : pHome;
        if(pA>pB) penWinsA++; else penWinsB++;
      }
    }
    rows.push({ temporada:r.temporada, juego:r.juego, instancia:r.instancia, gA, gB,
      pen: (Number.isFinite(parseInt(r.penA))&&Number.isFinite(parseInt(r.penB))) ?
           (aIsHome?`${parseInt(r.penA)}-${parseInt(r.penB)}`:`${parseInt(r.penB)}-${parseInt(r.penA)}`) : '' });
  }

  const badge = (t)=>`<span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:${t.color||'#333'};color:#fff;font-size:10px;font-weight:700;flex:none;">${_esc(t.ini||t.name.slice(0,3))}</span>`;
  const penNote = (penWinsA||penWinsB) ? `<div style="font-size:11px;color:var(--txt3);margin-top:4px;text-align:center;">(${penWinsA+penWinsB} empate${(penWinsA+penWinsB)===1?'':'s'} definido${(penWinsA+penWinsB)===1?'':'s'} por penales: ${_esc(teamA.ini||'A')} ${penWinsA} · ${penWinsB} ${_esc(teamB.ini||'B')})</div>` : '';

  return `
    <div class="card" style="padding:16px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;min-width:0;">${badge(teamA)}<b style="font-size:14px;">${_esc(teamA.name)}</b></div>
        <span style="color:var(--txt3);font-size:12px;">${matches.length} partido${matches.length===1?'':'s'}</span>
        <div style="display:flex;align-items:center;gap:8px;min-width:0;justify-content:flex-end;"><b style="font-size:14px;">${_esc(teamB.name)}</b>${badge(teamB)}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;text-align:center;gap:8px;">
        <div><div style="font-size:26px;font-weight:800;color:var(--green,#2ecc71);">${winsA}</div><div style="font-size:11px;color:var(--txt3);text-transform:uppercase;">Gana ${_esc(teamA.ini||'A')}</div></div>
        <div><div style="font-size:26px;font-weight:800;color:var(--txt2);">${draws}</div><div style="font-size:11px;color:var(--txt3);text-transform:uppercase;">Empates</div></div>
        <div><div style="font-size:26px;font-weight:800;color:var(--gold);">${winsB}</div><div style="font-size:11px;color:var(--txt3);text-transform:uppercase;">Gana ${_esc(teamB.ini||'B')}</div></div>
      </div>
      <div style="text-align:center;font-size:13px;color:var(--txt2);margin-top:10px;">Goles: <b>${gfA}</b> — <b>${gfB}</b></div>
      ${penNote}
    </div>
    <div class="card" style="overflow:auto;">
      <table class="tbl" style="width:100%;font-size:13px;">
        <thead><tr>
          <th>Temporada</th><th>Juego</th><th>Instancia</th>
          <th style="text-align:right;">${_esc(teamA.ini||'A')}</th>
          <th style="text-align:center;">Marcador</th>
          <th>${_esc(teamB.ini||'B')}</th>
        </tr></thead>
        <tbody>
          ${rows.map(r=>`<tr>
            <td>${_esc(r.temporada||'')}</td><td>${_esc(r.juego||'')}</td><td>${_esc(r.instancia||'')}</td>
            <td style="text-align:right;${r.gA>r.gB?'font-weight:700;color:var(--green,#2ecc71);':''}">${_esc(teamA.name)}</td>
            <td style="text-align:center;font-weight:700;">${r.gA} - ${r.gB}${r.pen?`<div style="font-size:10px;color:var(--txt3);font-weight:400;">pen ${r.pen}</div>`:''}</td>
            <td style="${r.gB>r.gA?'font-weight:700;color:var(--gold);':''}">${_esc(teamB.name)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}
