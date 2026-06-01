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
  q: '',
  page: 1,
  mode: 'admin', // 'admin' | 'public'
};

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
  const {fJuego, fTemp, fInst, q} = _histState;
  const ql = (q||'').trim().toLowerCase();
  return rows.filter(r=>{
    if(fJuego && r.juego!==fJuego) return false;
    if(fTemp  && r.temporada!==fTemp) return false;
    if(fInst  && r.instancia!==fInst) return false;
    if(ql){
      // Solo buscar en nombres de equipos (los otros campos tienen filtros propios).
      const hay = [r.equipoA, r.equipoB]
        .some(v => String(v||'').toLowerCase().includes(ql));
      if(!hay) return false;
    }
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
    if(t.name) lookup.set(String(t.name).toLowerCase(), entry);
    entry.previousNames.forEach(p=>{
      lookup.set(p.toLowerCase(), entry);
    });
  }
  window._histTeamLookup = lookup;

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

async function _renderHistoryFull(el, isAdmin){
  try {
    const all = await _getResolvedRecords();

    if(!all.length){
      el.innerHTML = `<div style="color:var(--txt3);font-size:15px;padding:20px;text-align:center;">
        Aún no hay partidos en el historial.
      </div>`;
      return;
    }

    // Usar clases en vez de IDs globales para evitar colisión entre vista admin y pública
    // (ambas pueden coexistir en el DOM y duplican IDs).
    el.innerHTML = `
      ${_renderHistorySubNav('partidos', isAdmin)}
      <div class="hist-filters-zone"></div>
      <div class="hist-summary-zone" style="font-size:12px;color:var(--txt3);margin-bottom:8px;"></div>
      <div class="hist-table-zone card" style="overflow:auto;"></div>
      <div class="hist-more-zone"></div>
    `;

    _renderFiltersZone(el, all, isAdmin);
    _refreshTableZone(el, all, isAdmin);
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
      <div class="form-group" style="margin:0;flex:1;min-width:180px;">
        <label>Buscar equipo</label>
        <input type="text" class="hist-q" value="${_esc(_histState.q)}" oninput="histSetSearch(this.value)" placeholder="Ej: PROMETEUS, MALVINAS..."
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
  const safeName = _esc(equipoName);
  if(!lookup || !equipoName) return safeName;

  const entry = lookup.get(String(equipoName).toLowerCase());
  if(!entry) return safeName;

  const isHistoricalName = entry.currentName && entry.currentName.toLowerCase() !== String(equipoName).toLowerCase();
  const hasPrev = entry.previousNames.length > 0;
  if(!isHistoricalName && !hasPrev) return safeName;

  // Tooltip: lista con bullets (saltos de línea). Único affordance visible.
  const tooltipLines = [];
  if(isHistoricalName){
    tooltipLines.push(`Hoy se llama: ${entry.currentName}`);
    if(hasPrev) tooltipLines.push('');
  }
  if(hasPrev){
    tooltipLines.push('Nombres anteriores:');
    entry.previousNames.forEach(p=>tooltipLines.push(`• ${p}`));
  }
  const tooltip = _esc(tooltipLines.join('\n'));

  return `<span title="${tooltip}">${safeName}<sup style="color:var(--gold);margin-left:3px;cursor:help;font-size:10px;">ⓘ</sup></span>`;
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

async function histSetSearch(value){
  _histState.q = value;
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
  _histState.q      = '';
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
  mode: 'admin',
};

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

  // Lookup por nombre (actual + previousNames) → entry de equipo
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
    if(t.name) lookup.set(String(t.name).toLowerCase(), entry);
    entry.previousNames.forEach(p=>lookup.set(p.toLowerCase(), entry));
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
    const lookA = lookup.get(eA.toLowerCase());
    const lookB = lookup.get(eB.toLowerCase());
    const keyA = (lookA?.currentName) ? lookA.currentName.toUpperCase() : eA.toUpperCase();
    const keyB = (lookB?.currentName) ? lookB.currentName.toUpperCase() : eB.toUpperCase();
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
  arr.sort((a,b)=>{
    if(b.pts !== a.pts) return b.pts - a.pts;
    if(b.dg !== a.dg)   return b.dg - a.dg;
    if(b.gf !== a.gf)   return b.gf - a.gf;
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
              <th style="text-align:center;">PJ</th>
              <th style="text-align:center;">V</th>
              <th style="text-align:center;">E</th>
              <th style="text-align:center;">P</th>
              <th style="text-align:center;">GF</th>
              <th style="text-align:center;">GC</th>
              <th style="text-align:center;">DG</th>
              <th style="text-align:center;">Pts</th>
              <th style="text-align:center;">Rend.</th>
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
        <span title="${tooltip}">${_esc(s.name)}${iconPrev}</span>
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
  if(isAdmin) return '';
  const tabStyle = (act)=>`padding:6px 14px;font-family:'Barlow Condensed';font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;border-radius:20px;cursor:pointer;border:2px solid ${act?'var(--gold)':'var(--brd)'};background:${act?'var(--gold-l)':'transparent'};color:${act?'var(--gold)':'var(--txt2)'};transition:all 0.15s;`;
  return `
    <div style="display:flex;gap:8px;margin-bottom:14px;">
      <button onclick="renderPubHistory()" style="${tabStyle(active==='partidos')}">Partidos</button>
      <button onclick="renderPubHistoryStandings()" style="${tabStyle(active==='tabla')}">Tabla histórica</button>
    </div>
  `;
}

async function histStdSetFilter(key, value){
  _histStdState[key] = value;
  if(key==='fJuego'){ _histStdState.fTemp = ''; }
  if(_histStdState.mode==='admin') await renderAdmHistoryStandings();
  else await renderPubHistoryStandings();
}

async function histStdClearFilters(){
  _histStdState.fJuego = '';
  _histStdState.fTemp  = '';
  if(_histStdState.mode==='admin') await renderAdmHistoryStandings();
  else await renderPubHistoryStandings();
}
