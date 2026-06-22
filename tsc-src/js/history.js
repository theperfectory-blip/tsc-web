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
// Resuelve un texto de búsqueda a UN equipo (o null si es ambiguo / sin match)
function _histResolveTeam(query, teams){
  const q = _histNorm(query);
  if(!q || !teams || !teams.length) return null;
  const exact = teams.find(t => _histNorm(t.name) === q
    || (t.previousNames||[]).some(p => _histNorm(p) === q));
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
  _histState.mode = 'public';
  if(typeof renderPubSidebarHistorial==='function') renderPubSidebarHistorial('partidos');
  const el = document.getElementById('pub-history-content');
  if(!el) return;
  await _renderHistoryFull(el, false);
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
  }));
}

/* Hitos del historial público: 4 stat cards (partidos, goles, mayor goleada,
   temporadas) calculadas de los records resueltos. Los números animan con
   MOTION.countUp; «mayor goleada» es texto (marcador) → sin countUp. */
function _pubHistoryHitos(records){
  let goles=0, maxDiff=-1, maxLabel='—';
  const temps = new Set();
  for(const r of records){
    const a=parseInt(r.golesA), b=parseInt(r.golesB);
    if(!isNaN(a) && !isNaN(b)){
      goles += a+b;
      const diff=Math.abs(a-b);
      if(diff>maxDiff){ maxDiff=diff; maxLabel = `${Math.max(a,b)}-${Math.min(a,b)}`; }
    }
    if(r.temporada) temps.add(String(r.temporada).trim());
  }
  const card=(val,label,isText)=>`
    <div class="hito-stage">
      <div class="hito">
        <b ${isText?'':`data-n="${val}"`}>${isText?_esc(val):'0'}</b>
        <span>${_esc(label)}</span>
      </div>
    </div>`;
  return `<div class="hitos-grid">
    ${card(records.length,'Partidos jugados')}
    ${card(goles,'Goles anotados')}
    ${card(maxLabel,'Mayor goleada',true)}
    ${card(temps.size,'Temporadas')}
  </div>`;
}

/* Anima los contadores de los hitos. Degrada a valor final si no hay MOTION
   (o si el usuario pidió movimiento reducido — countUp lo respeta internamente). */
function _pubHistoryCountUp(el){
  const nums = el.querySelectorAll('.hito b[data-n]');
  if(!(window.MOTION && typeof MOTION.countUp==='function')){
    nums.forEach(b=>{ b.textContent = b.dataset.n; });
    return;
  }
  nums.forEach(b=>{ const n=parseInt(b.dataset.n); if(!isNaN(n)) MOTION.countUp(b, n, { dur:1000 }); });
}

async function _renderHistoryFull(el, isAdmin){
  try {
    const all = await _getResolvedRecords();

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

    // PÚBLICO: hitos broadcast + carrusel «Partidos | Tabla histórica».
    // Las zonas de filtros/tabla viven dentro del pane "partidos" → los handlers
    // (histSetFilter/histSetSearch/histShowMore) las encuentran como descendientes.
    el.innerHTML = `
      ${_pubHistoryHitos(all)}
      <div class="hist-pub-tabs">
        <button type="button" class="hist-tab active" data-tab="partidos">Partidos</button>
        <button type="button" class="hist-tab" data-tab="tabla">Tabla histórica</button>
      </div>
      <div class="hist-pane" data-pane="partidos">
        <div class="hist-filters-zone"></div>
        <div class="hist-summary-zone" style="font-size:12px;color:var(--txt3);margin-bottom:8px;"></div>
        <div class="hist-table-zone card" style="overflow:auto;"></div>
        <div class="hist-more-zone"></div>
      </div>
      <div class="hist-pane" data-pane="tabla" hidden></div>
    `;
    _renderFiltersZone(el, all, false);
    _refreshTableZone(el, all, false);
    _pubHistoryCountUp(el);

    // Carrusel de vistas: la tabla histórica se renderiza perezosamente al abrirla.
    const paneP = el.querySelector('[data-pane="partidos"]');
    const paneT = el.querySelector('[data-pane="tabla"]');
    let tablaLoaded = false;
    el.querySelectorAll('.hist-tab').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const tab = btn.dataset.tab;
        el.querySelectorAll('.hist-tab').forEach(b=>b.classList.toggle('active', b===btn));
        if(paneP) paneP.hidden = tab!=='partidos';
        if(paneT) paneT.hidden = tab!=='tabla';
        if(tab==='tabla' && !tablaLoaded && paneT){
          tablaLoaded = true;
          await _renderHistoryStandingsInto(paneT, false);
        }
      });
    });
    return;
  } catch(err){
    console.error('[Historial] Error al renderizar:', err);
    el.innerHTML = `
      <div style="background:rgba(239,68,68,0.1);border:1px solid var(--red);border-radius:var(--r);padding:14px;color:var(--red);font-size:13px;">
        <strong>Error al cargar el historial:</strong><br>
        <code style="font-size:11px;color:var(--txt2);">${(err.message||err).toString().replace(/</g,'&lt;')}</code><br>
        <span style="font-size:12px;color:var(--txt3);">Abre la consola (F12) para más detalles. Suele resolverse con un hard reload (Ctrl+Shift+R).</span>
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
  _histStdState.mode = 'public';
  if(typeof renderPubSidebarHistorial==='function') renderPubSidebarHistorial('tabla');
  const el = document.getElementById('pub-history-content');
  if(!el) return;
  await _renderHistoryStandingsInto(el, false);
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
