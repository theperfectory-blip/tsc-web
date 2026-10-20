function _esc(v){ return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ----------------------------------------------------------
   Guardas de escritura (MS-5.5)
   - _mxRun: una sola escritura de partidos a la vez (doble clic) y errores
     de red o de reglas como aviso claro en vez de promesa sin capturar.
   - _mxSeasonLocked: la UI ya deshabilita los botones de una temporada
     finalizada, pero el código también debe negarse (H-49).
   ---------------------------------------------------------- */
let _mxBusy = false;
async function _mxRun(fn){
  if(_mxBusy) return;
  _mxBusy = true;
  try{ return await fn(); }
  catch(err){ console.error('[matches]', err); showToast(dbErrorMsg(err),'error'); }
  finally{ _mxBusy = false; }
}

async function _mxSeasonLocked(phaseId){
  const phase = phaseId!=null ? await dbGet('phases', phaseId) : null;
  const comp  = phase?.compId!=null ? await dbGet('competitions', phase.compId) : null;
  const num   = comp?.season ?? STATE.season;
  const season = (await dbGetAll('seasons')).find(s=>s.number===num);
  if(season?.status==='finished'){
    showToast(`${getSeasonName(season)} está finalizada: no admite cambios`,'error');
    return true;
  }
  return false;
}

/* Operaciones de lote (dbWriteBatch) para borrar partidos con su registro
   de historial. Todo lo que guarda o borra una fecha o un partido va en UN
   lote atómico (H-53): antes se escribía documento por documento y un corte
   de red a mitad dejaba la fecha a medias (partidos sin historial, cruces
   viejos y nuevos mezclados, equipo libre sin partidos). */
async function _mxDeleteOps(matchIds){
  if(!matchIds.length) return [];
  const idSet = new Set(matchIds);
  const hist = await dbGetAll('matchHistory', h=>idSet.has(h.matchRef));
  return [
    ...hist.map(h=>({type:'delete', store:'matchHistory', id:h.id})),
    ...matchIds.map(id=>({type:'delete', store:'matches', id})),
  ];
}

/* Fase con el equipo libre y la fecha sugerida de una ronda quitados (si la
   ronda se queda sin partidos ya no significan nada, y el libre seguía
   contando como «ya fue libre»). null si no había nada que quitar. */
function _mxPhaseWithoutRondaMeta(phase, groupIdx, ronda){
  if(!phase) return null;
  const meta = {...(phase.rondaMeta||{})};
  const k = `${groupIdx}_${ronda}`;
  if(!(k in meta) && !((k+'_date') in meta)) return null;
  delete meta[k]; delete meta[k+'_date'];
  return {...phase, rondaMeta:meta};
}

/* ----------------------------------------------------------
   TIEMPO REAL EN ADMIN (Fase 6A para admin)
   El modo público ya se suscribe a 'matches' (nav.js). Aquí hacemos
   lo mismo en admin: cualquier cambio en partidos (local o remoto)
   re-renderiza la vista actual vía onSnapshot → datos siempre frescos
   (sin caché stale). Una sola suscripción por temporada.
   ---------------------------------------------------------- */
async function _rerenderAdminMatchLive(){
  const pid = window._matchPhaseId;
  if(!Number.isFinite(pid)) return;
  // Solo si seguimos en la página de partidos admin
  if(typeof STATE!=='undefined' && (STATE.mode!=='admin' || STATE.adminPage!=='partidos-admin')) return;
  const phase = await dbGet('phases', pid);
  if(!phase) return;
  try{
    if(phase.type==='groups'){
      const gi = window._matchGroupIdx||0;
      if(typeof showMatchGroupTable==='function') await showMatchGroupTable(pid, gi);
    } else if(phase.type==='bracket'){
      const cid=`bracket-container-${pid}`;
      if(document.getElementById(cid)) await renderBracket(pid, cid, true);
    } else if(phase.type==='playoff'){
      const cid=`playoff-container-${pid}`;
      if(document.getElementById(cid)) await renderPlayoff(pid, cid, true);
    } else if(phase.type==='single'){
      const teams = phase.config?.teams||2;
      const cid = teams===4 ? `bracket-container-${pid}` : `playoff-container-${pid}`;
      if(document.getElementById(cid)){
        if(teams===4) await renderBracket(pid, cid, true);
        else await renderPlayoff(pid, cid, true);
      }
    }
  }catch(err){ console.error('[AdminLive] re-render:', err); }
}

function _subscribeAdminMatchesLive(){
  if(typeof liveSubscribe!=='function') return;
  // Key estable por temporada: cambiar de fase NO recrea la suscripción
  // (el callback lee window._matchPhaseId dinámicamente).
  // Escucha partidos (marcadores/vivo), fases (refs/publicar) y equipos (nombre/logo).
  liveSubscribe('adm-matches-'+STATE.season, ['matches','phases','teams'], ()=>_rerenderAdminMatchLive());
}

async function renderAdmMatches(){
  const el = document.getElementById('adm-matches-content');
  const comps  = await getForSeason('competitions');
  const compIds = new Set(comps.map(c=>c.id));
  const phases = await dbGetAll('phases', p=>
    ['groups','bracket','playoff','single'].includes(p.type) && compIds.has(p.compId)
  );

  if(!phases.length){
    el.innerHTML=`<div style="color:var(--txt3);font-size:16px;padding:16px;">No hay fases creadas. Crea una competición y sus fases primero.</div>`;
    return;
  }

  // Agrupar fases por competición
  const phasesByComp = {};
  for(const p of phases){
    if(!phasesByComp[p.compId]) phasesByComp[p.compId]=[];
    phasesByComp[p.compId].push(p);
  }

  const compsSorted = typeof _sortComps==='function' ? _sortComps(comps) : comps;
  for(const k of Object.keys(phasesByComp)) phasesByComp[k].sort((a,b)=>(a.order??a.id)-(b.order??b.id));
  const firstPhase = compsSorted.map(c=>(phasesByComp[c.id]||[])[0]).find(Boolean) || phases[0];

  const compOpts = compsSorted.map(c=>{
    const cphases = phasesByComp[c.id]||[];
    if(!cphases.length) return '';
    return `<optgroup label="${_esc(c.name)}">${cphases.map(p=>`<option value="${p.id}">${_esc(p.name)}</option>`).join('')}</optgroup>`;
  }).join('');

  el.innerHTML = `
  <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:flex-end;">
    <div class="form-group" style="margin:0;">
      <label>Fase</label>
      <select id="match-phase-sel" onchange="onMatchPhaseChange(this.value)" style="padding:7px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:14px;">
        ${compOpts}
      </select>
    </div>
    <div class="form-group" style="margin:0;" id="match-group-wrap">
      <label>Grupo</label>
      <select id="match-group-sel" onchange="onMatchGroupChange(this.value)" style="padding:7px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:14px;"></select>
    </div>
    <button class="btn" id="btn-editar-grupos" onclick="openGroupAssignModal(window._matchPhaseId)" style="display:none;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar grupos</button>
  </div>

  <div id="match-groups-container"></div>
  <div id="matches-list-container" style="margin-top:20px;"></div>
  <div id="match-input-modal-wrap"></div>`;

  // Restaurar última fase seleccionada (memoria + localStorage), si existe en esta temporada
  const lsKeyPhase = `adm_matches_phase_season_${STATE.season}`;
  const rememberedPhaseId = (Number.isFinite(window._matchPhaseId) ? window._matchPhaseId : null);
  const storedPhaseId = parseInt(localStorage.getItem(lsKeyPhase) || '', 10);
  const desiredPhaseId =
    (rememberedPhaseId && phases.some(p=>p.id===rememberedPhaseId)) ? rememberedPhaseId :
    (Number.isFinite(storedPhaseId) && phases.some(p=>p.id===storedPhaseId)) ? storedPhaseId :
    firstPhase.id;

  const phaseSel = document.getElementById('match-phase-sel');
  if(phaseSel) phaseSel.value = String(desiredPhaseId);
  await onMatchPhaseChange(desiredPhaseId);
}

async function onMatchPhaseChange(phaseId){
  const pid = parseInt(phaseId, 10);
  const phase = await dbGet('phases', pid);
  if(!phase) return;

  const currentSeason = (await dbGetAll('seasons')).find(s=>s.number===STATE.season);
  const isFinalized = currentSeason?.status==='finished';

  window._matchPhaseId  = pid;
  // Persistir fase seleccionada por temporada
  localStorage.setItem(`adm_matches_phase_season_${STATE.season}`, String(pid));

  // Memoria de grupo por fase (solo aplica en groups)
  if(!window._matchGroupIdxByPhase) window._matchGroupIdxByPhase = {};
  const storedGroupKey = `adm_matches_group_${STATE.season}_${pid}`;
  const storedGroupIdx = parseInt(localStorage.getItem(storedGroupKey) || '', 10);
  const rememberedGroupIdx = window._matchGroupIdxByPhase[pid];
  const desiredGroupIdx =
    Number.isFinite(rememberedGroupIdx) ? rememberedGroupIdx :
    Number.isFinite(storedGroupIdx) ? storedGroupIdx :
    0;

  const groupWrap = document.getElementById('match-group-wrap');
  // Mantener sincronizado el selector de fase si onMatchPhaseChange se invoca desde código
  const phaseSel = document.getElementById('match-phase-sel');
  if(phaseSel && phaseSel.value !== String(pid)) phaseSel.value = String(pid);

  if(phase.type==='groups'){
    // Mostrar selector de grupo
    if(groupWrap) groupWrap.style.display='';
    const btnReg = document.getElementById('btn-registrar-partido');
    if(btnReg) btnReg.style.display='';
    const config  = phase.config||{};
    const ngroups = config.ngroups||2;
    const sel = document.getElementById('match-group-sel');
    if(sel) sel.innerHTML = Array.from({length:ngroups},(_,i)=>
      `<option value="${i}">Grupo ${String.fromCharCode(65+i)}</option>`
    ).join('');

    // Restaurar grupo si es válido para esta fase
    const safeGroupIdx = Math.min(Math.max(desiredGroupIdx, 0), Math.max(ngroups-1, 0));
    window._matchGroupIdx = safeGroupIdx;
    if(sel) sel.value = String(safeGroupIdx);
    // Persistir el grupo actual al cambiar de fase (evita "volver" a 0)
    window._matchGroupIdxByPhase[pid] = safeGroupIdx;
    localStorage.setItem(`adm_matches_group_${STATE.season}_${pid}`, String(safeGroupIdx));

    await showMatchGroupTable(pid, safeGroupIdx);
    const btnEG=document.getElementById('btn-editar-grupos'); if(btnEG) { btnEG.style.display=''; btnEG.disabled=isFinalized; if(isFinalized) btnEG.style.opacity='0.5'; }

  } else if(phase.type==='bracket'){
    // Ocultar selector de grupo y botón libre
    if(groupWrap) groupWrap.style.display='none';
    const _btnEG2=document.getElementById('btn-editar-grupos'); if(_btnEG2) _btnEG2.style.display='none';
    const cont = document.getElementById('match-groups-container');
    if(cont){
      const cid = `bracket-container-${phaseId}`;
      cont.innerHTML = `<div id="${cid}"></div>`;
      try { await renderBracket(parseInt(phaseId), cid, true); }
      catch(e){ console.error('[bracket] render error:', e); cont.innerHTML=`<div style="padding:16px;color:var(--txt3);">Error al cargar el bracket. <button class="btn btn-sm" onclick="onMatchPhaseChange(${phaseId})">Reintentar</button></div>`; }
    }
    const ml = document.getElementById('matches-list-container');
    if(ml) ml.innerHTML='';

  } else if(phase.type==='playoff'){
    if(groupWrap) groupWrap.style.display='none';
    const _btnEG3=document.getElementById('btn-editar-grupos'); if(_btnEG3) _btnEG3.style.display='none';
    const cont = document.getElementById('match-groups-container');
    if(cont){
      const cid = `playoff-container-${phaseId}`;
      cont.innerHTML = `<div id="${cid}"></div>`;
      await renderPlayoff(parseInt(phaseId), cid, true);
    }
    const ml = document.getElementById('matches-list-container');
    if(ml) ml.innerHTML='';

  } else if(phase.type==='single'){
    // Supercopa / Final: 2 equipos => playoff de 1 cruce; 4 equipos => mini-bracket
    if(groupWrap) groupWrap.style.display='none';
    const _btnEG4=document.getElementById('btn-editar-grupos'); if(_btnEG4) _btnEG4.style.display='none';
    const cont = document.getElementById('match-groups-container');
    if(cont){
      const teams = phase.config?.teams||2;
      if(teams===4){
        const cid = `bracket-container-${phaseId}`;
        cont.innerHTML = `<div id="${cid}"></div>`;
        try { await renderBracket(parseInt(phaseId), cid, true); }
        catch(e){ console.error('[bracket] render error:', e); cont.innerHTML=`<div style="padding:16px;color:var(--txt3);">Error al cargar el bracket. <button class="btn btn-sm" onclick="onMatchPhaseChange(${phaseId})">Reintentar</button></div>`; }
      } else {
        const cid = `playoff-container-${phaseId}`;
        cont.innerHTML = `<div id="${cid}"></div>`;
        await renderPlayoff(parseInt(phaseId), cid, true);
      }
    }
    const ml = document.getElementById('matches-list-container');
    if(ml) ml.innerHTML='';
  }

  // Activar tiempo real en admin para esta vista (una sola suscripción/temporada)
  _subscribeAdminMatchesLive();
}

async function onMatchGroupChange(gi){
  const g = parseInt(gi, 10);
  window._matchGroupIdx = g;
  if(!window._matchGroupIdxByPhase) window._matchGroupIdxByPhase = {};
  if(Number.isFinite(window._matchPhaseId)){
    window._matchGroupIdxByPhase[window._matchPhaseId] = g;
    localStorage.setItem(`adm_matches_group_${STATE.season}_${window._matchPhaseId}`, String(g));
  }
  await showMatchGroupTable(window._matchPhaseId, g);
}

/* ----------------------------------------------------------
   LISTA DE PARTIDOS — reutilizable en admin y público
   ---------------------------------------------------------- */
async function renderMatchesList(phaseId, groupIdx, containerId, showDelete=false){
  const matches = await dbGetAll('matches', m=>m.phaseId===phaseId && m.groupIdx===groupIdx);
  const el = document.getElementById(containerId);
  if(!el) return;
  const isPublicMinimal = /^pub-matches-list-/.test(containerId||'');
  if(!matches.length){
    el.innerHTML=`<div style="color:var(--txt3);font-size:14px;padding:8px 0;">Sin partidos registrados.</div>`;
    return;
  }

  // Cargar todos los equipos para búsqueda rápida
  const allTeams = await dbGetAll('teams');
  const teamById = {};
  allTeams.forEach(t=>teamById[t.id]=t.name);

  function _mRow(m, showDel){
    const gA=m.goalsA,gB=m.goalsB,hasR=gA!=null&&gB!=null;
    const isLive=!!m.live;
    const aW=hasR&&!isLive&&gA>gB,bW=hasR&&!isLive&&gB>gA;
    const fA=!hasR||isLive ? '' : isPublicMinimal
      ? (aW ? 'font-weight:700;color:var(--green);' : bW ? 'opacity:0.55;' : '')
      : (aW ? 'font-weight:700;color:var(--green);' : bW ? 'color:var(--red);opacity:0.7;' : 'color:var(--yellow);');
    const fB=!hasR||isLive ? '' : isPublicMinimal
      ? (bW ? 'font-weight:700;color:var(--green);' : aW ? 'opacity:0.55;' : '')
      : (bW ? 'font-weight:700;color:var(--green);' : aW ? 'color:var(--red);opacity:0.7;' : 'color:var(--yellow);');
    // Buscar nombres desde IDs
    const teamAName = teamById[m.teamA] || String(m.teamA);
    const teamBName = teamById[m.teamB] || String(m.teamB);
    const scoreCell = isLive
      ? `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
           <strong style="font-family:'Bebas Neue';font-size:20px;letter-spacing:1px;color:var(--red);">${gA}-${gB}</strong>
           <span style="display:inline-flex;align-items:center;gap:4px;font-size:9px;font-weight:700;letter-spacing:0.5px;color:var(--red);text-transform:uppercase;"><span class="live-dot live-dot-red" style="width:6px;height:6px;"></span>En vivo</span>
         </div>`
      : `<strong style="font-family:'Bebas Neue';font-size:20px;letter-spacing:1px;">${hasR?gA+'-'+gB:'vs'}</strong>`;
    // Horas de inicio/fin (se graban al jugar en vivo). Aparecen al costado derecho.
    const fmtHora = iso => iso ? new Date(iso).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}) : '';
    const timeCell = (m.liveStartAt||m.liveEndAt)
      ? `<td style="width:104px;text-align:right;padding:6px 14px;font-size:10px;color:var(--txt3);white-space:nowrap;line-height:1.7;">
           ${m.liveStartAt?`<div style="display:flex;align-items:center;gap:3px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0;"></span> ${fmtHora(m.liveStartAt)}</div>`:''}
           ${m.liveEndAt?`<div style="display:flex;align-items:center;gap:3px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg> ${fmtHora(m.liveEndAt)}</div>`:'<div style="display:flex;align-items:center;gap:3px;color:var(--red);"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;flex-shrink:0;"></span> en juego</div>'}
         </td>`
      : `<td style="width:104px;"></td>`;
    return `<tr${isLive?' style="background:rgba(239,68,68,0.06);"':''}>
      <td style="text-align:right;font-weight:500;padding:9px 14px;${fA}">${_esc(teamAName)}</td>
      <td style="text-align:center;width:80px;padding:0 4px;">${scoreCell}</td>
      <td style="font-weight:500;padding:9px 14px;${fB}">${_esc(teamBName)}</td>
      ${timeCell}
      ${showDel?`<td style="width:28px;"><button class="btn btn-xs btn-danger" title="Eliminar partido" aria-label="Eliminar partido" onclick="deleteMatch(${m.id})">${_ICON_X}</button></td>`:''}
    </tr>`;
  }

  // Si no hay rondas → tabla plana
  const hasRondas = matches.some(m=>m.ronda!=null);
  if(!hasRondas){
    el.innerHTML=`<div class="card" style="overflow:hidden;"><table class="tbl" style="width:100%;">
      <thead><tr><th style="text-align:right;">Local</th><th style="text-align:center;width:80px;">Resultado</th><th>Visitante</th>${showDelete?'<th style="width:32px;"></th>':''}</tr></thead>
      <tbody>${matches.map(m=>_mRow(m,showDelete)).join('')}</tbody></table></div>`;
    return;
  }

  // Agrupar por ronda y navegar
  const byRonda={};
  matches.forEach(m=>{ const r=m.ronda!=null?m.ronda:'sin-ronda'; if(!byRonda[r])byRonda[r]=[]; byRonda[r].push(m); });
  const rondaKeys=Object.keys(byRonda).filter(k=>k!=='sin-ronda').map(Number).sort((a,b)=>a-b);
  const hasSinRonda=byRonda['sin-ronda']?.length>0;

  const phase=await dbGet('phases',phaseId);
  const rondaMeta=phase?.rondaMeta||{};

  const stateKey=`ronda_view_${phaseId}_${groupIdx}`;
  if(window[stateKey]===undefined) window[stateKey]=rondaKeys[rondaKeys.length-1];
  // La fecha recordada pudo borrarse: volver a la última existente.
  if(rondaKeys.length && !rondaKeys.includes(window[stateKey])) window[stateKey]=rondaKeys[rondaKeys.length-1];
  const curR=window[stateKey];
  const curIdx=rondaKeys.indexOf(curR);
  const prevR=curIdx>0?rondaKeys[curIdx-1]:null;
  const nextR=curIdx<rondaKeys.length-1?rondaKeys[curIdx+1]:null;

  const ms=byRonda[curR]||[];
  const libreRaw=rondaMeta[`${groupIdx}_${curR}`]||null;
  // libre puede venir como ID (number) o nombre (legacy)
  const libre = libreRaw==null ? null : (teamById[libreRaw] || teamById[Number(libreRaw)] || libreRaw);
  const defaultDate = rondaMeta[`${groupIdx}_${curR}_date`]||null;
  // v1.7: usar playedAt para rango; fallback a date legacy
  const fechasJugadas = ms
    .filter(m=>m.goalsA!=null && m.goalsB!=null)
    .map(m=>(m.playedAt||m.date||'').substring(0,10))
    .filter(Boolean);
  const fechaStr = formatJornadaDateRange(fechasJugadas, defaultDate) || 'Sin fecha';

  el.innerHTML=`
  <div class="card" style="overflow:hidden;">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--brd);background:var(--card2);">
      <button onclick="navegarRonda('${containerId}',${phaseId},${groupIdx},${prevR})"
        style="background:none;border:none;color:${prevR!==null?'var(--txt)':'var(--txt3)'};font-size:22px;cursor:${prevR!==null?'pointer':'default'};padding:0 8px;line-height:1;opacity:${prevR!==null?1:0.3};" ${prevR===null?'disabled':''}>‹</button>
      <div style="text-align:center;">
        <div style="font-family:'Barlow Condensed';font-weight:700;font-size:16px;text-transform:uppercase;letter-spacing:1px;">Fecha ${curR}</div>
        <div style="font-size:11px;color:var(--txt3);text-transform:capitalize;">${fechaStr}</div>
        ${libre?`<div style="font-size:11px;color:var(--gold);margin-top:2px;">Libre: ${escHtml(libre)}</div>`:''}
      </div>
      <button onclick="navegarRonda('${containerId}',${phaseId},${groupIdx},${nextR})"
        style="background:none;border:none;color:${nextR!==null?'var(--txt)':'var(--txt3)'};font-size:22px;cursor:${nextR!==null?'pointer':'default'};padding:0 8px;line-height:1;opacity:${nextR!==null?1:0.3};" ${nextR===null?'disabled':''}>›</button>
    </div>
    <table class="tbl" style="width:100%;"><tbody>${ms.map(m=>_mRow(m,showDelete)).join('')}</tbody></table>
    ${hasSinRonda?`<div style="padding:6px 14px;font-size:12px;color:var(--txt3);border-top:1px solid var(--brd);">+ ${byRonda['sin-ronda'].length} partido(s) sin ronda asignada</div>`:''}
  </div>`;
}

async function navegarRonda(containerId, phaseId, groupIdx, rondaNum){
  if(rondaNum===null||rondaNum===undefined) return;
  window[`ronda_view_${phaseId}_${groupIdx}`]=parseInt(rondaNum);
  await renderMatchesList(phaseId, groupIdx, containerId, false);
}

async function showMatchGroupTable(phaseId, groupIdx){
  const cid = `match-group-table-${phaseId}-${groupIdx}`;
  const cont = document.getElementById('match-groups-container');
  if(cont) cont.innerHTML=`<div id="${cid}"></div>`;
  await renderGroupTable(phaseId, cid, true, groupIdx);

  const currentSeason = (await dbGetAll('seasons')).find(s=>s.number===STATE.season);
  const isFinalized = currentSeason?.status==='finished';

  const listEl = document.getElementById('matches-list-container');
  if(listEl){
    const genLock = isFinalized ? 'Esta temporada está finalizada' : await fxGroupLockReason(phaseId, groupIdx);
    const genIcon = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>`;
    listEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px;margin-bottom:10px;">
        <div class="section-lbl" style="margin:0;">Fechas</div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm" onclick="openFixtureGenModal(${phaseId},${groupIdx})" ${genLock?`disabled style="opacity:0.5;cursor:not-allowed;" title="${_esc(genLock)}"`:`title="Genera todas las fechas del grupo de una vez (todos contra todos, sin repetir rival)"`}>${genIcon} Generar fechas</button>
          <button class="btn btn-sm btn-primary" onclick="openRondaModal(${phaseId},${groupIdx})" ${isFinalized?'disabled style="opacity:0.5;cursor:not-allowed;"':''}>+ Crear fecha</button>
        </div>
      </div>
      ${isFinalized?'<div style="padding:10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt2);font-size:13px;margin-bottom:12px;"><svg style="display:inline;vertical-align:-2px;" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Esta temporada está finalizada. Los cambios no están permitidos.</div>':''}
      <div id="rondas-admin-${phaseId}-${groupIdx}"></div>`;
    await renderRondasAdmin(phaseId, groupIdx, isFinalized);
  }
}

/* ----------------------------------------------------------
   SISTEMA DE RONDAS — Admin
   ---------------------------------------------------------- */
async function renderRondasAdmin(phaseId, groupIdx, isFinalized=false){
  const el = document.getElementById(`rondas-admin-${phaseId}-${groupIdx}`);
  if(!el) return;
  const matches = await dbGetAll('matches', m=>m.phaseId===phaseId && m.groupIdx===groupIdx);
  if(!matches.length){
    el.innerHTML=`<div style="color:var(--txt3);font-size:14px;padding:8px 0;">Sin partidos registrados. Crea una ronda y asigna partidos.</div>`;
    return;
  }
  const phase = await dbGet('phases', phaseId);
  const rondaMeta = phase?.rondaMeta||{};
  const byRonda={};
  matches.forEach(m=>{ const r=m.ronda!=null?m.ronda:'sin-ronda'; if(!byRonda[r]) byRonda[r]=[]; byRonda[r].push(m); });
  const keys = Object.keys(byRonda).sort((a,b)=>{ if(a==='sin-ronda')return 1; if(b==='sin-ronda')return -1; return parseInt(a)-parseInt(b); });

  // Cargar todos los equipos para búsqueda rápida
  const allTeams = await dbGetAll('teams');
  const teamById = {};
  allTeams.forEach(t=>teamById[t.id]=t.name);

  // ¿Hay algún partido EN VIVO en toda la temporada? Si lo hay, se ocultan los
  // botones "🔴 Vivo" de los demás partidos (solo uno en directo a la vez).
  const anyLive = (await dbGetAll('matches', m=>!!m.live && (m.season===STATE.season||!m.season))).length>0;

  el.innerHTML = keys.map(r=>{
    const ms=byRonda[r];
    const label=r==='sin-ronda'?'Sin ronda asignada':`Fecha ${r}`;
    const libreRaw=rondaMeta[`${groupIdx}_${r}`]||null;
    // libre puede venir como ID (number) o nombre (legacy)
    const libre = libreRaw==null ? null : (teamById[libreRaw] || teamById[Number(libreRaw)] || libreRaw);
    const defaultDate = rondaMeta[`${groupIdx}_${r}_date`]||null; // v1.7: fecha por defecto de la jornada

    // v1.7: rango de fechas reales jugadas (basado en playedAt; fallback a date)
    const fechasJugadas = ms
      .filter(m=>m.goalsA!=null && m.goalsB!=null)
      .map(m=>(m.playedAt||m.date||'').substring(0,10))
      .filter(Boolean);
    // Fechas programadas por partido individual (página Calendario) de los
    // pendientes — cubre el caso en que se programó desde ahí y no desde
    // "Fecha" de la jornada (rondaMeta puede no tener nada).
    const fechasProgramadas = ms
      .filter(m=>m.goalsA==null && m.scheduledDate)
      .map(m=>m.scheduledDate);
    const fechaDisplay = formatJornadaDateRange(fechasJugadas, defaultDate, fechasProgramadas);

    const pendientes=ms.filter(m=>m.goalsA==null).length;
    return `<div class="card" style="margin-bottom:10px;overflow:hidden;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-bottom:1px solid var(--brd);background:var(--card2);">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="font-family:'Barlow Condensed';font-weight:700;font-size:14px;letter-spacing:0.5px;text-transform:uppercase;">${label}</span>
          ${fechaDisplay?`<span style="font-size:11px;color:var(--txt3);">${fechaDisplay}</span>`:''}
          ${libre?`<span style="font-size:12px;color:var(--gold);">Libre: <strong>${escHtml(libre)}</strong></span>`:''}
          ${pendientes?`<span style="font-size:11px;background:rgba(201,168,76,0.15);color:var(--gold);padding:1px 6px;border-radius:3px;">${pendientes} pendiente${pendientes>1?'s':''}</span>`:''}
        </div>
        <div style="display:flex;gap:6px;">
          ${r!=='sin-ronda'?`<button class="btn btn-xs" onclick="openAssignDateToJornada(${phaseId},${groupIdx},${r})" ${isFinalized?'disabled style="opacity:0.5;cursor:not-allowed;"':''} title="Asignar fecha a toda la jornada"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Fecha</button>`:''}
          ${r!=='sin-ronda'?`<button class="btn btn-xs" onclick="openRondaModal(${phaseId},${groupIdx},${r})" ${isFinalized?'disabled style="opacity:0.5;cursor:not-allowed;"':''}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar</button>`:''}
          ${r!=='sin-ronda'?`<button class="btn btn-xs btn-danger" onclick="deleteRonda(${phaseId},${groupIdx},${r})" ${isFinalized?'disabled style="opacity:0.5;cursor:not-allowed;"':''} title="Borrar fecha completa"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Borrar fecha</button>`:''}
        </div>
      </div>
      <table class="tbl" style="width:100%;">
        <tbody>${ms.map(m=>{
          const gA=m.goalsA,gB=m.goalsB,hasR=gA!=null&&gB!=null;
          const isLive=!!m.live;
          const aW=hasR&&!isLive&&gA>gB,bW=hasR&&!isLive&&gB>gA;
          const fA=aW?'font-weight:700;color:var(--green);':bW?'opacity:0.55;':'';
          const fB=bW?'font-weight:700;color:var(--green);':aW?'opacity:0.55;':'';
          // Buscar nombres desde IDs
          const teamAName = teamById[m.teamA] || String(m.teamA);
          const teamBName = teamById[m.teamB] || String(m.teamB);
          // v1.7: mostrar día corto del partido (no hora)
          const diaCorto = m.playedAt
            ? new Date(m.playedAt).toLocaleDateString('es-CL',{day:'2-digit',month:'short'}).replace('.','')
            : '';
          let centerCell;
          if(isLive){
            centerCell = `<button class="btn btn-xs" onclick="openLiveMatch(${m.id})" title="Abrir partido en vivo"
              style="font-size:13px;padding:3px 9px;font-family:'Bebas Neue';letter-spacing:1px;background:rgba(239,68,68,0.15);border:1px solid var(--red);color:var(--red);">
              <span class="live-dot live-dot-red" style="width:7px;height:7px;display:inline-block;vertical-align:middle;margin-right:5px;"></span>${gA}-${gB}</button>`;
          } else if(hasR){
            centerCell = `<strong style="font-family:'Bebas Neue';font-size:18px;${isFinalized?'cursor:not-allowed;opacity:0.5;':'cursor:pointer;'}" onclick="${isFinalized?'return;':'openEditResultModal('+m.id+','+phaseId+','+groupIdx+')'}" title="Editar resultado">${gA}-${gB}</strong>`;
          } else if(isFinalized){
            centerCell = `<span style="font-size:11px;color:var(--txt3);">Finalizado</span>`;
          } else if(!anyLive){
            centerCell = `<button class="btn btn-xs" onclick="startLiveGroupMatch(${m.id},${phaseId},${groupIdx})" title="Poner partido EN VIVO" style="font-size:11px;padding:3px 10px;border:1px solid var(--red);color:var(--red);display:inline-flex;align-items:center;gap:4px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;flex-shrink:0;"></span>Vivo</button>`;
          } else {
            centerCell = `<span style="font-size:11px;color:var(--txt3);">vs</span>`;
          }
          // luisTeam (generado por "Generar fechas" en fixture-gen.js): marca de qué lado
          // juega Luis en este partido puntual. Campo aditivo — la mayoría de los partidos
          // no lo tiene.
          const luisBadge = m.luisTeam!=null ? `<span title="Partido de Luis" style="display:inline-flex;align-items:center;color:var(--gold);">${typeof _FX_GAMEPAD_ICON!=='undefined'?_FX_GAMEPAD_ICON:''}</span>` : '';
          const luisA = m.luisTeam===m.teamA ? luisBadge : '';
          const luisB = m.luisTeam===m.teamB ? luisBadge : '';
          return `<tr>
            <td style="text-align:right;padding:7px 10px;${fA}">${luisA?`<span style="display:inline-flex;align-items:center;gap:5px;justify-content:flex-end;">${luisA}${escHtml(teamAName)}</span>`:escHtml(teamAName)}</td>
            <td style="text-align:center;width:120px;">${centerCell}</td>
            <td style="padding:7px 10px;${fB}">${luisB?`<span style="display:inline-flex;align-items:center;gap:5px;">${luisB}${escHtml(teamBName)}</span>`:escHtml(teamBName)}</td>
            <td style="font-size:11px;color:var(--txt3);white-space:nowrap;padding-right:6px;">${diaCorto}</td>
            <td style="width:28px;"><button class="btn btn-xs btn-danger" title="Eliminar partido" aria-label="Eliminar partido" onclick="deleteMatch(${m.id})" ${isFinalized?'disabled style="opacity:0.5;cursor:not-allowed;"':''}>${_ICON_X}</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
  }).join('');
}

/* ----------------------------------------------------------
   v1.7: Helpers de fechas para jornadas
   ---------------------------------------------------------- */
/* Núcleo de formateo: fecha única o rango (sin sufijo), a partir de un
   array de fechas ISO (YYYY-MM-DD). Reusado tanto por partidos ya jugados
   como por partidos programados pendientes. */
function _fmtJornadaDateCore(datesISO){
  const unique = [...new Set(datesISO)].sort();
  if(!unique.length) return null;
  if(unique.length===1){
    const d = new Date(unique[0]+'T12:00:00');
    return d.toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'}).replace(/\./g,'');
  }
  // Múltiples días: rango
  const first = new Date(unique[0]+'T12:00:00');
  const last  = new Date(unique[unique.length-1]+'T12:00:00');
  const sameMonth = first.getMonth()===last.getMonth() && first.getFullYear()===last.getFullYear();
  const sameYear  = first.getFullYear()===last.getFullYear();
  if(sameMonth){
    // 14-15 oct 2025
    const month = first.toLocaleDateString('es-CL',{month:'short'}).replace(/\./g,'');
    return `${first.getDate()}-${last.getDate()} ${month} ${first.getFullYear()}`;
  }
  if(sameYear){
    // 30 sep – 02 oct 2025
    const fStr = first.toLocaleDateString('es-CL',{day:'2-digit',month:'short'}).replace(/\./g,'').replace('-',' ');
    const lStr = last.toLocaleDateString('es-CL',{day:'2-digit',month:'short'}).replace(/\./g,'').replace('-',' ');
    return `${fStr} – ${lStr} ${first.getFullYear()}`;
  }
  // Cruza años
  const fStr = first.toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'}).replace(/\./g,'');
  const lStr = last.toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'}).replace(/\./g,'');
  return `${fStr} – ${lStr}`;
}

/* Precedencia: (1) partidos ya jugados → rango real, sin sufijo. (2) fecha
   sugerida de la jornada (rondaMeta, "Fecha" en Partidos) → fecha única
   "(programada)". (3) fechas por partido individual de los pendientes
   (página Calendario) → rango "(programada)" — cubre el caso de programar
   desde Calendario sin haber tocado "Fecha" de la jornada. (4) nada. */
function formatJornadaDateRange(fechasISO, defaultDate, fechasProgramadas){
  if(fechasISO.length) return _fmtJornadaDateCore(fechasISO);

  if(defaultDate){
    const d = new Date(defaultDate+'T12:00:00');
    return d.toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'}).replace(/\./g,'') + ' (programada)';
  }

  if(fechasProgramadas && fechasProgramadas.length){
    const rango = _fmtJornadaDateCore(fechasProgramadas);
    return rango ? `${rango} (programada)` : null;
  }

  return null;
}

/* ----------------------------------------------------------
   v1.7: Modal "Asignar fecha a toda la jornada"
   - Fecha por defecto (rondaMeta[`${gi}_${r}_date`]): se sugiere al ingresar resultados.
   - Aplicar a todos: setea playedAt en todos los partidos de la jornada (con o sin resultado).
   ---------------------------------------------------------- */
async function openAssignDateToJornada(phaseId, groupIdx, ronda){
  const phase = await dbGet('phases', phaseId);
  const meta = phase?.rondaMeta||{};
  const currentDefault = meta[`${groupIdx}_${ronda}_date`]||'';
  const today = new Date().toISOString().substring(0,10);

  let wrap = document.getElementById('assign-date-wrap');
  if(!wrap){ wrap=document.createElement('div'); wrap.id='assign-date-wrap'; document.body.appendChild(wrap); }

  wrap.innerHTML=`
  <div class="modal-overlay open">
    <div class="modal" style="max-width:380px;">
      <div class="modal-hdr">
        <div class="modal-title">Fecha de la Jornada ${ronda}</div>
        <button class="modal-close" onclick="closeAssignDateModal()">×</button>
      </div>
      <div class="modal-body">
        <label style="display:block;font-size:11px;color:var(--txt3);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Fecha</label>
        <input type="date" id="ad-date" value="${escAttr(currentDefault||today)}"
          style="width:100%;padding:10px 12px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:15px;">

        <div style="margin-top:14px;padding:10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);font-size:12px;color:var(--txt2);line-height:1.5;">
          <strong style="color:var(--txt);">Solo programar:</strong> guarda esta fecha como sugerencia. Al ingresar cada resultado, vendrá pre-llenada (puedes cambiarla).<br><br>
          <strong style="color:var(--txt);">Aplicar a todos:</strong> sobrescribe la fecha de TODOS los partidos de esta jornada (incluso los ya jugados).
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeAssignDateModal()">Cancelar</button>
        <button class="btn" onclick="saveJornadaDate(${phaseId},${groupIdx},${ronda},false)">Solo programar</button>
        <button class="btn btn-primary" onclick="saveJornadaDate(${phaseId},${groupIdx},${ronda},true)">Aplicar a todos</button>
      </div>
    </div>
  </div>`;
}

async function saveJornadaDate(phaseId, groupIdx, ronda, applyAll){
  const dateStr = document.getElementById('ad-date')?.value;
  if(!dateStr){ showToast('Selecciona una fecha','error'); return; }

  await _mxRun(async ()=>{
    if(await _mxSeasonLocked(phaseId)) return;
    const phase = await dbGet('phases', phaseId);
    if(!phase){ showToast('La fase ya no existe','error'); closeAssignDateModal(); return; }
    const meta = {...(phase.rondaMeta||{})};
    meta[`${groupIdx}_${ronda}_date`] = dateStr;

    // Cascada a los partidos: así "Calendario" (que solo mira m.scheduledDate,
    // calendar.js:271) refleja la fecha apenas se guarda desde acá. rondaMeta
    // no tiene hora, así que scheduledTime existente se preserva siempre
    // (spread de ...m antes de pisar scheduledDate).
    const matches = await dbGetAll('matches', m=>m.phaseId===phaseId && m.groupIdx===groupIdx && m.ronda===ronda);
    try{
      // Fase y partidos en un solo lote (H-53).
      const ops = [{type:'set', store:'phases', data:{...phase, rondaMeta:meta}}];
      if(applyAll){
        const playedAtISO = new Date(dateStr+'T12:00:00').toISOString();
        matches.forEach(m=>ops.push({type:'set', store:'matches', data:{...m, playedAt:playedAtISO, scheduledDate:dateStr}}));
      } else {
        // Solo los que todavía no tienen fecha propia — no pisar lo ya
        // programado a mano en la página Calendario.
        matches.filter(m=>!m.scheduledDate)
          .forEach(m=>ops.push({type:'set', store:'matches', data:{...m, scheduledDate:dateStr}}));
      }
      await dbWriteBatch(ops);
      showToast(applyAll ? `Fecha aplicada a ${matches.length} partido(s) de la Jornada ${ronda}` : `Fecha programada para Jornada ${ronda}`);
      closeAssignDateModal();
    } finally {
      // Si algo falló a medias, mostrar lo que quedó realmente guardado.
      await showMatchGroupTable(phaseId, groupIdx);
    }
  });
}

function closeAssignDateModal(){
  const el=document.getElementById('assign-date-wrap');
  if(el) el.innerHTML='';
}

/* ==========================================================
   v1.6: NUEVO MODAL "CREAR FECHA" — sistema de slots
   - Forza completar todos los emparejamientos del grupo.
   - Si hay impares, exige seleccionar 1 equipo libre.
   - Bloquea repetir equipo en la misma fecha.
   - Bloquea pares ya jugados (respeta legs).
   - Solo aplica a fases tipo "groups" (Liga). Bracket/Playoff no usan esto.
   ========================================================== */
/* Resuelve un libreVal (puede ser ID nuevo o nombre legacy) a teamId number. */
function _resolveLibreId(libreVal, teamIds, teamById){
  if(libreVal==null) return null;
  // Caso 1: ya es un ID numérico válido
  const asNum = Number(libreVal);
  if(Number.isFinite(asNum) && teamIds.some(t=>Number(t)===asNum)) return asNum;
  // Caso 2: es nombre legacy → buscar por nombre dentro del grupo
  const byName = teamIds.find(tid=>teamById[tid]?.name===libreVal);
  return byName!=null ? Number(byName) : null;
}

async function openRondaModal(phaseId, groupIdx, editRonda=null){
  const phase = await dbGet('phases', phaseId);
  if(!phase){ showToast('La fase ya no existe','error'); return; }
  if(await _mxSeasonLocked(phaseId)) return;
  const groups = phase?.groups||{};
  const teamIds = (groups[groupIdx]||[]).slice().map(t=>Number(t));

  // Siembra por referencia: si hay refs de este grupo ya resueltas, fijarlas
  // al grupo antes de crear fechas (la tabla origen deja de moverlas).
  if(typeof resolveGroupRefsFor==='function' && (phase?.groupRefs||[]).some(r=>parseInt(r.tGroup)===parseInt(groupIdx))){
    const entries = await resolveGroupRefsFor(phase, groupIdx);
    const pend = entries.filter(e=>e.teamId!=null && !teamIds.includes(Number(e.teamId)));
    if(pend.length){
      const allT = await dbGetAll('teams');
      const names = pend.map(e=>allT.find(t=>t.id===e.teamId)?.name||('#'+e.teamId)).join(', ');
      showConfirm('Fijar equipos por referencia',
        `Llegan por referencia y ya están definidos: ${names}. Para crear fechas se fijarán al grupo (la tabla de origen ya no los cambiará). ¿Continuar?`,
        ()=>_mxRun(async ()=>{
          await materializeGroupRefs(phaseId, groupIdx);
          await showMatchGroupTable(phaseId, groupIdx);
          return true;
        }).then(ok=>{ if(ok) openRondaModal(phaseId, groupIdx, editRonda); }));
      return;
    }
    const unres = entries.filter(e=>e.teamId==null);
    if(unres.length) showToast(`${unres.length} cupo(s) por referencia aún sin definir — la fecha se crea solo con los equipos fijados`,'error');
  }

  if(teamIds.length<2){
    showToast('El grupo necesita al menos 2 equipos','error');
    return;
  }
  // Resolver IDs a objetos de equipo
  const allTeams = await dbGetAll('teams');
  const teamById = {};
  allTeams.forEach(t=>teamById[t.id]=t);
  const nameOf = (tid)=> teamById[tid]?.name || `Team ${tid}`;
  // teamIds (numbers) — fuente de verdad. Los nombres se usan SOLO en la UI.

  const allMatches = await dbGetAll('matches', m=>m.phaseId===phaseId && m.groupIdx===groupIdx);
  const isOdd = teamIds.length%2!==0;
  const slotsCount = Math.floor(teamIds.length/2);
  const maxR = allMatches.reduce((mx,m)=>m.ronda!=null?Math.max(mx,m.ronda):mx,0);
  const targetR = editRonda!=null ? editRonda : maxR+1;
  const legs = phase?.config?.legs||1;
  const legsInt = parseInt(legs,10)||1;
  const rondaMeta = phase?.rondaMeta||{};
  // currentLibre puede venir como ID number (nuevo) o como nombre (legacy persistido antes del fix).
  const rawLibre = rondaMeta[`${groupIdx}_${targetR}`];
  const currentLibre = _resolveLibreId(rawLibre, teamIds, teamById);

  // Estado en memoria del modal: slots[i] = {a:teamId|null, b:teamId|null, matchId:id|null}
  const slots = [];
  let libreInicial = null;
  if(editRonda!=null){
    const existing = allMatches.filter(m=>m.ronda===targetR);
    existing.slice(0, slotsCount).forEach(m=>{
      slots.push({a:m.teamA, b:m.teamB, matchId:m.id, goalsA:m.goalsA, goalsB:m.goalsB, luis:m.luisTeam ?? null});
    });
    libreInicial = currentLibre;
  }
  while(slots.length<slotsCount) slots.push({a:null, b:null, matchId:null, luis:null});

  // Reglas de emparejamiento por formato:
  // legs=1 (media temporada): un cruce solo puede existir una vez.
  // legs=2 (temporada completa): no se repite cruce hasta completar TODA la ida;
  // luego solo se permite la vuelta en orden inverso al primer cruce.
  const expectedFirstLegPairs = (teamIds.length*(teamIds.length-1))/2;
  // pairKey con IDs numéricos: ordenar como números, no como strings (evita
  // que 11||2 quede como "11||2" mientras 2||11 quede "2||11").
  function pairKey(a,b){
    const aN = Number(a), bN = Number(b);
    return aN<bN ? `${aN}||${bN}` : `${bN}||${aN}`;
  }

  function buildPairStats(ignoreMatchIds){
    const stats = new Map();
    allMatches.forEach(m=>{
      if(m.teamA==null || m.teamB==null) return;
      if(ignoreMatchIds && ignoreMatchIds.has(m.id)) return;
      const a = Number(m.teamA), b = Number(m.teamB);
      if(!Number.isFinite(a) || !Number.isFinite(b)) return;
      const key = pairKey(a,b);
      if(!stats.has(key)) stats.set(key,{total:0, dirs:new Map()});
      const s = stats.get(key);
      s.total += 1;
      const dirKey = `${a}>>>${b}`;
      s.dirs.set(dirKey, (s.dirs.get(dirKey)||0)+1);
    });
    return stats;
  }

  const firstLegComplete = (() => {
    const stats = buildPairStats();
    let uniquePairs = 0;
    stats.forEach(v=>{ if(v.total>0) uniquePairs += 1; });
    return uniquePairs >= expectedFirstLegPairs;
  })();

  // Control de "equipo libre" por ciclos (solo grupos impares).
  // legs=1: un equipo no puede quedar libre dos veces.
  // legs=2: un equipo solo puede repetir libre cuando TODOS ya tuvieron uno.
  function buildByeCounts(ignoreRonda){
    const counts = new Map();
    teamIds.forEach(tid=>counts.set(Number(tid),0));
    Object.keys(rondaMeta).forEach(k=>{
      const m = k.match(/^(\d+)_(\d+)$/); // groupIdx_ronda (sin _date)
      if(!m) return;
      const gi = parseInt(m[1],10);
      const rr = parseInt(m[2],10);
      if(gi!==groupIdx) return;
      if(ignoreRonda!=null && rr===ignoreRonda) return;
      const libreVal = rondaMeta[k];
      const tid = _resolveLibreId(libreVal, teamIds, teamById);
      if(tid==null || !counts.has(tid)) return;
      counts.set(tid, (counts.get(tid)||0)+1);
    });
    return counts;
  }

  function byeBlockReason(teamId, ignoreRonda){
    if(teamId==null) return null;
    const tid = Number(teamId);
    const counts = buildByeCounts(ignoreRonda);
    const c = counts.get(tid)||0;
    if(legsInt<=1){
      if(c>=1) return `${nameOf(tid)} ya fue equipo libre en esta temporada`;
      return null;
    }
    const firstByeCycleComplete = teamIds.every(t=>(counts.get(Number(t))||0)>=1);
    if(c===0) return null;
    if(!firstByeCycleComplete) return 'Solo puedes repetir equipo libre después de completar una vuelta de libres';
    if(c>=2) return `${nameOf(tid)} ya completó sus libres de ida y vuelta`;
    return null;
  }

  function pairingBlockReason(a, b, ignoreMatchIds){
    if(a==null || b==null) return null;
    const aN = Number(a), bN = Number(b);
    if(!Number.isFinite(aN) || !Number.isFinite(bN)) return null;
    const stats = buildPairStats(ignoreMatchIds);
    const key = pairKey(aN,bN);
    const pair = stats.get(key) || {total:0, dirs:new Map()};
    const sameDirKey = `${aN}>>>${bN}`;

    if(legsInt<=1){
      if(pair.total>=1) return `${nameOf(aN)} vs ${nameOf(bN)} ya fue registrado en esta temporada`;
      return null;
    }

    // legsInt >= 2
    if(!firstLegComplete){
      if(pair.total>=1) return 'Primero debes completar toda la ida antes de repetir cruces';
      return null;
    }

    // Vuelta habilitada: no crear cruces nuevos, solo invertir los ya existentes una vez.
    if(pair.total===0) return 'En vuelta solo se permiten cruces que ya existieron en la ida';
    if(pair.total>=2) return `${nameOf(aN)} vs ${nameOf(bN)} ya completó ida y vuelta`;
    if((pair.dirs.get(sameDirKey)||0) > 0) return 'La vuelta debe registrarse con local/visita invertidos';
    return null;
  }

  let wrap=document.getElementById('ronda-modal-wrap');
  if(!wrap){wrap=document.createElement('div');wrap.id='ronda-modal-wrap';document.body.appendChild(wrap);}

  // Estado expuesto para el render. Slots/libre = IDs (numbers).
  // teamById permite resolver nombres y otros datos del equipo en el render.
  window._rondaModalState = {
    slots, libre:libreInicial, teamIds, teamById, nameOf, isOdd, slotsCount,
    phaseId, groupIdx, targetR, editRonda, legs, legsInt, allMatches,
    firstLegComplete, pairingBlockReason, byeBlockReason
  };

  renderRondaModalContent();
}

function renderRondaModalContent(){
  const st = window._rondaModalState;
  if(!st) return;
  const wrap = document.getElementById('ronda-modal-wrap');
  if(!wrap) return;
  const mustPickLibreFirst = st.isOdd && st.libre==null;

  // Para cada slot, cuáles son los equipos disponibles (excluyendo los ya usados, salvo el propio)
  const slotsHTML = st.slots.map((slot, idx)=>{
    const optsA = ['<option value="">— Local —</option>'];
    const optsB = ['<option value="">— Visita —</option>'];
    st.teamIds.forEach(tid=>{
      const tName = st.nameOf(tid);
      const tEsc = String(tName).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      // Disponible para Local de este slot: no usado en otros slots ni libre, o es el propio
      const usedElsewhere = (st.slots.some((s2,i2)=>i2!==idx && (s2.a===tid||s2.b===tid))) || (st.libre===tid);
      const isPickedHere = slot.a===tid;
      const blockedByOtherSide = slot.b===tid && !isPickedHere;
      const pairBlockedForA = slot.b!=null && !isPickedHere
        ? !!st.pairingBlockReason(tid, slot.b, slot.matchId?new Set([slot.matchId]):null)
        : false;
      if((!usedElsewhere || isPickedHere) && !blockedByOtherSide && !pairBlockedForA){
        optsA.push(`<option value="${tid}" ${isPickedHere?'selected':''}>${tEsc}</option>`);
      }
      const isPickedHereB = slot.b===tid;
      const blockedByOtherSideB = slot.a===tid && !isPickedHereB;
      const pairBlockedForB = slot.a!=null && !isPickedHereB
        ? !!st.pairingBlockReason(slot.a, tid, slot.matchId?new Set([slot.matchId]):null)
        : false;
      if((!usedElsewhere || isPickedHereB) && !blockedByOtherSideB && !pairBlockedForB){
        optsB.push(`<option value="${tid}" ${isPickedHereB?'selected':''}>${tEsc}</option>`);
      }
    });

    const ignoreIds = new Set();
    if(slot.matchId) ignoreIds.add(slot.matchId);
    const pairReason = (slot.a!=null && slot.b!=null) ? st.pairingBlockReason(slot.a, slot.b, ignoreIds) : null;
    const pairWarn = pairReason ? `<div style="font-size:11px;color:var(--red);margin-top:3px;">${_UI_ALERT_SVG}${escHtml(pairReason)}</div>` : '';

    const sameTeamWarn = (slot.a!=null && slot.a===slot.b)
      ? `<div style="font-size:11px;color:var(--red);margin-top:3px;">${_UI_ALERT_SVG}Local y visita no pueden ser el mismo</div>`
      : '';

    const resultBadge = (slot.matchId && slot.goalsA!=null && slot.goalsB!=null)
      ? `<span style="font-size:10px;color:var(--gold);margin-left:6px;">${slot.goalsA}-${slot.goalsB}</span>`
      : '';

    // Quién controla Luis en este partido puntual (campo aditivo, sin validar
    // el recorrido — solo registrarlo). Opciones dependen de slot.a/slot.b
    // actuales: como el modal re-renderiza en cada updateRondaSlot, si el par
    // cambia las opciones quedan al día solas.
    const luisOptA = slot.a!=null ? `<option value="a" ${slot.luis===slot.a?'selected':''}>Local</option>` : '';
    const luisOptB = slot.b!=null ? `<option value="b" ${slot.luis===slot.b?'selected':''}>Visita</option>` : '';
    const luisCtrl = `
      <span title="¿Quién controla Luis en este partido?" style="display:inline-flex;align-items:center;color:var(--gold);flex:none;">${typeof _FX_GAMEPAD_ICON!=='undefined'?_FX_GAMEPAD_ICON:''}</span>
      <select onchange="updateRondaLuis(${idx},this.value)" title="¿Quién controla Luis en este partido?"
        style="flex:none;width:64px;padding:6px 2px;background:var(--card);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:11px;">
        <option value="">—</option>
        ${luisOptA}${luisOptB}
      </select>`;

    return `
    <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);">
      <div style="font-size:11px;color:var(--txt3);font-weight:600;min-width:60px;">P${idx+1}${resultBadge}</div>
      <select onchange="updateRondaSlot(${idx},'a',this.value)"
        ${mustPickLibreFirst?'disabled':''}
        style="flex:1;padding:6px 8px;background:var(--card);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:13px;">
        ${optsA.join('')}
      </select>
      <span style="font-size:11px;color:var(--txt3);">vs</span>
      <select onchange="updateRondaSlot(${idx},'b',this.value)"
        ${mustPickLibreFirst?'disabled':''}
        style="flex:1;padding:6px 8px;background:var(--card);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:13px;">
        ${optsB.join('')}
      </select>
      ${luisCtrl}
    </div>
    ${pairWarn}${sameTeamWarn}`;
  }).join('');

  // Selector de equipo libre (solo si impar) — va primero como CTA.
  let libreHTML = '';
  if(st.isOdd){
    const optsLibre = ['<option value="">— Selecciona —</option>'];
    st.teamIds.forEach(tid=>{
      const tName = st.nameOf(tid);
      const tEsc = String(tName).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const usedInSlot = st.slots.some(s=>s.a===tid||s.b===tid);
      const isPicked = st.libre===tid;
      const byeBlocked = !isPicked
        ? !!st.byeBlockReason(tid, st.editRonda!=null ? st.targetR : null)
        : false;
      if((!usedInSlot || isPicked) && !byeBlocked){
        optsLibre.push(`<option value="${tid}" ${isPicked?'selected':''}>${tEsc}</option>`);
      }
    });
    const byeWarn = st.libre!=null
      ? st.byeBlockReason(st.libre, st.editRonda!=null ? st.targetR : null)
      : null;
    libreHTML = `
    <div style="margin-top:12px;padding:10px;background:var(--card2);border:1px dashed var(--brd);border-radius:var(--r);">
      <div style="font-size:11px;color:var(--txt3);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Equipo libre esta fecha (impar)</div>
      <select onchange="updateRondaLibre(this.value)"
        style="width:100%;padding:7px 10px;background:var(--card);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:14px;">
        ${optsLibre.join('')}
      </select>
      ${mustPickLibreFirst?`<div style="margin-top:8px;padding:8px 10px;background:rgba(201,168,76,0.12);border:1px solid var(--gold-b);border-radius:var(--r);font-size:12px;color:var(--gold);font-weight:600;">Paso 1: selecciona el equipo libre para habilitar los cruces de la fecha.</div>`:''}
      ${byeWarn?`<div style="font-size:11px;color:var(--red);margin-top:6px;">${_UI_ALERT_SVG}${escHtml(byeWarn)}</div>`:''}
    </div>`;
  }

  // Validación: ¿está completo y válido?
  const allSlotsFilled = st.slots.every(s=>s.a!=null && s.b!=null && s.a!==s.b);
  const hasInvalidPair = st.slots.some(s=>{
    const ignoreIds = new Set();
    if(s.matchId) ignoreIds.add(s.matchId);
    return s.a!=null && s.b!=null && !!st.pairingBlockReason(s.a, s.b, ignoreIds);
  });
  const libreOK = !st.isOdd || (st.libre!=null && !st.byeBlockReason(st.libre, st.editRonda!=null ? st.targetR : null));
  const canSave = allSlotsFilled && !hasInvalidPair && libreOK;

  // Mensaje de progreso
  const filled = st.slots.filter(s=>s.a!=null && s.b!=null && s.a!==s.b).length;
  const libreLabel = st.libre!=null ? escHtml(st.nameOf(st.libre)) : '—';
  const progressMsg = `${filled}/${st.slotsCount} partidos${st.isOdd?` · libre: ${libreLabel}`:''}`;

  wrap.innerHTML=`
  <div class="modal-overlay open">
    <div class="modal" style="max-width:560px;">
      <div class="modal-hdr">
        <div class="modal-title">${st.editRonda!=null?'Editar':'Nueva'} Fecha ${st.targetR} · Grupo ${String.fromCharCode(65+st.groupIdx)}</div>
        <button class="modal-close" onclick="closeRondaModal()">×</button>
      </div>
      <div class="modal-body">
        <div style="font-size:12px;color:var(--txt2);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
          <span>${progressMsg}</span>
          <span style="font-size:11px;color:var(--txt3);">
            ${st.legsInt===2
              ? (st.firstLegComplete ? 'Temporada completa · Vuelta habilitada' : 'Temporada completa · Completa ida primero')
              : 'Media temporada (solo ida)'}
          </span>
        </div>
        ${libreHTML}
        <div style="display:flex;flex-direction:column;gap:6px;max-height:380px;overflow-y:auto;padding-right:4px;">
          ${slotsHTML}
        </div>
        ${hasInvalidPair?`<div style="margin-top:10px;padding:8px;background:rgba(239,68,68,0.1);border:1px solid var(--red);border-radius:var(--r);font-size:12px;color:var(--red);">Hay emparejamientos repetidos. Cámbialos para guardar.</div>`:''}
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeRondaModal()">Cancelar</button>
        <button class="btn btn-primary" ${canSave?'':'disabled style="opacity:0.4;cursor:not-allowed;"'} onclick="saveRonda()">
          ${canSave?`Guardar Fecha ${st.targetR}`:'Completa todos los partidos'}
        </button>
      </div>
    </div>
  </div>`;
}

function updateRondaSlot(slotIdx, side, value){
  const st = window._rondaModalState;
  if(!st) return;
  const slot = st.slots[slotIdx];
  if(!slot) return;
  // value viene del DOM como string; convertir a number ID o null si vacío.
  const tid = (value==='' || value==null) ? null : Number(value);
  slot[side] = (Number.isFinite(tid) ? tid : null);
  // Optimización UX: si se elige el mismo equipo en ambos lados, limpia el opuesto.
  if(slot.a!=null && slot.b!=null && slot.a===slot.b){
    if(side==='a') slot.b = null;
    if(side==='b') slot.a = null;
  }
  // Si el equipo seleccionado está siendo usado como libre, lo liberamos
  if(slot[side]!=null && st.libre===slot[side]) st.libre = null;
  // Coherencia: si el par cambió y el equipo de Luis ya no es ni a ni b,
  // no puede seguir apuntando a un equipo que salió de este partido.
  if(slot.luis!=null && slot.luis!==slot.a && slot.luis!==slot.b) slot.luis = null;
  renderRondaModalContent();
}

// Setea quién controla Luis en un slot puntual: value es 'a'/'b'/'' (ninguno)
// — se resuelve al ID real de slot.a/slot.b, nunca se guarda el string crudo.
// Sistema simple, sin validación del recorrido (a diferencia de
// pairingBlockReason/byeBlockReason): solo registra lo que el admin ya
// verificó a mano.
function updateRondaLuis(slotIdx, value){
  const st = window._rondaModalState;
  if(!st) return;
  const slot = st.slots[slotIdx];
  if(!slot) return;
  slot.luis = value==='a' ? slot.a : value==='b' ? slot.b : null;
  renderRondaModalContent();
}

function updateRondaLibre(value){
  const st = window._rondaModalState;
  if(!st) return;
  const tid = (value==='' || value==null) ? null : Number(value);
  st.libre = Number.isFinite(tid) ? tid : null;
  renderRondaModalContent();
}

async function saveRonda(){
  const st = window._rondaModalState;
  if(!st){ showToast('Estado perdido','error'); return; }

  // Validación final (s.a y s.b ya son IDs numéricos)
  for(const s of st.slots){
    if(s.a==null || s.b==null){ showToast('Faltan equipos por asignar','error'); return; }
    if(s.a===s.b){ showToast('Local y visita iguales','error'); return; }
    const ignoreIds = new Set();
    if(s.matchId) ignoreIds.add(s.matchId);
    const pairReason = st.pairingBlockReason(s.a, s.b, ignoreIds);
    if(pairReason){
      showToast(pairReason,'error');
      return;
    }
  }
  if(st.isOdd && st.libre==null){ showToast('Selecciona el equipo libre','error'); return; }
  if(st.isOdd){
    const byeReason = st.byeBlockReason(st.libre, st.editRonda!=null ? st.targetR : null);
    if(byeReason){ showToast(byeReason,'error'); return; }
  }
  if(_mxBusy) return;

  const {phaseId, groupIdx, targetR} = st;

  // Qué se pierde al editar: cambiar el cruce de un partido con resultado
  // dejaba el marcador pegado a otros equipos; quitar un partido lo borraba
  // sin avisar. Ahora se calcula y se pide confirmación.
  let lost = [];
  if(st.editRonda!=null){
    try{
      const fresh = await dbGetAll('matches', m=>m.phaseId===phaseId && m.groupIdx===groupIdx && m.ronda===targetR);
      const keep = new Set(st.slots.map(s=>s.matchId).filter(Boolean));
      for(const m of fresh){
        if(m.goalsA==null || m.goalsB==null) continue;
        const slot = st.slots.find(s=>s.matchId===m.id);
        if(!keep.has(m.id) || (slot && (slot.a!==m.teamA || slot.b!==m.teamB))) lost.push(m);
      }
    }catch(err){ console.error('[matches]', err); showToast(dbErrorMsg(err),'error'); return; }
  }
  if(lost.length){
    const plural = lost.length===1 ? '' : 's';
    showConfirm('Esto borra resultados',
      `Cambiar el cruce o quitar partidos de la Fecha ${targetR} borra ${lost.length} resultado${plural} ya cargado${plural} (${lost.map(m=>m.goalsA+'-'+m.goalsB).join(', ')}) y su registro del historial. ¿Continuar?`,
      ()=>_commitRonda());
    return;
  }
  await _commitRonda();
}

async function _commitRonda(){
  const st = window._rondaModalState;
  if(!st){ showToast('Estado perdido','error'); return; }
  const {phaseId, groupIdx, targetR} = st;

  await _mxRun(async ()=>{
    if(await _mxSeasonLocked(phaseId)) return;
    const phase = await dbGet('phases', phaseId);
    if(!phase){ showToast('La fase ya no existe','error'); closeRondaModal(); return; }

    const existing = await dbGetAll('matches', m=>m.phaseId===phaseId && m.groupIdx===groupIdx && m.ronda===targetR);
    if(st.editRonda==null && existing.length){
      showToast(`La Fecha ${targetR} ya existe (otra sesión la creó). Se muestra la actual.`,'error');
      closeRondaModal(); await showMatchGroupTable(phaseId, groupIdx); return;
    }
    const existingById = new Map(existing.map(m=>[m.id,m]));
    if(st.slots.some(s=>s.matchId && !existingById.has(s.matchId))){
      showToast('La fecha cambió mientras la editabas. Ábrela de nuevo.','error');
      closeRondaModal(); await showMatchGroupTable(phaseId, groupIdx); return;
    }
    if(existing.some(m=>m.live && !st.slots.some(s=>s.matchId===m.id && s.a===m.teamA && s.b===m.teamB))){
      showToast('Hay un partido en vivo en esta fecha: termínalo antes de cambiar el cruce.','error'); return;
    }

    try{
      // Todo en un solo lote atómico (H-53): altas, cambios de cruce, bajas
      // y el equipo libre. Si falla, la fecha queda como estaba.
      const ops = [];

      // 1) Partidos nuevos.
      st.slots.filter(s=>!s.matchId).forEach(s=>ops.push({type:'add', store:'matches', data:{
        phaseId, groupIdx,
        teamA:s.a, teamB:s.b,
        goalsA:null, goalsB:null,
        ronda:targetR,
        season:STATE.season,
        date:null,
        luisTeam:s.luis ?? null,
      }}));

      // 2) Existentes. Si cambia el cruce, el resultado se va con él (no
      //    puede quedar pegado a otros equipos), y también su historial.
      const changedPairs = [];
      for(const s of st.slots){
        if(!s.matchId) continue;
        const m = existingById.get(s.matchId);
        const sLuis = s.luis ?? null;
        const mLuis = m.luisTeam ?? null;
        const pairChanged = m.teamA!==s.a || m.teamB!==s.b;
        if(!pairChanged && mLuis===sLuis) continue;
        if(pairChanged){
          changedPairs.push(m.id);
          ops.push({type:'set', store:'matches', data:{...m, teamA:s.a, teamB:s.b, ronda:targetR, luisTeam:sLuis,
            goalsA:null, goalsB:null, playedAt:null, date:null}});
        } else {
          ops.push({type:'set', store:'matches', data:{...m, luisTeam:sLuis}});
        }
      }
      if(changedPairs.length){
        const idSet = new Set(changedPairs);
        (await dbGetAll('matchHistory', h=>idSet.has(h.matchRef)))
          .forEach(h=>ops.push({type:'delete', store:'matchHistory', id:h.id}));
      }

      // 3) Los que ya no están en los slots (con su historial).
      const keep = new Set(st.slots.map(s=>s.matchId).filter(Boolean));
      ops.push(...await _mxDeleteOps(existing.filter(m=>!keep.has(m.id)).map(m=>m.id)));

      // 4) Equipo libre en rondaMeta (como ID number)
      const meta = {...(phase.rondaMeta||{})};
      if(st.libre!=null) meta[`${groupIdx}_${targetR}`] = st.libre;
      else delete meta[`${groupIdx}_${targetR}`];
      ops.push({type:'set', store:'phases', data:{...phase, rondaMeta:meta}});

      await dbWriteBatch(ops);

      window._matchRondaActual = targetR;
      showToast(`Fecha ${targetR} guardada`);
      closeRondaModal();
    } finally {
      // Si algo falló a medias, mostrar lo que quedó realmente guardado.
      invalidateStandingsAndSyncBrackets(phaseId);
      await showMatchGroupTable(phaseId, groupIdx);
    }
  });
}

function closeRondaModal(){
  window._rondaModalState = null;
  const el=document.getElementById('ronda-modal-wrap');
  if(el) el.innerHTML='';
}
/* ----------------------------------------------------------
   EDITAR RESULTADO DE PARTIDO (graba fecha/hora real)
   ---------------------------------------------------------- */
async function openEditResultModal(matchId, phaseId, groupIdx){
  const m = await dbGet('matches', matchId);
  if(!m) return;
  let wrap=document.getElementById('edit-result-wrap');
  if(!wrap){wrap=document.createElement('div');wrap.id='edit-result-wrap';document.body.appendChild(wrap);}
  const hasR = m.goalsA!=null && m.goalsB!=null;

  // Buscar nombres de equipos desde IDs
  const allTeams = await dbGetAll('teams');
  const teamById = {};
  allTeams.forEach(t=>teamById[t.id]=t.name);
  const teamAName = teamById[m.teamA] || String(m.teamA);
  const teamBName = teamById[m.teamB] || String(m.teamB);

  // v1.7: fecha sugerida — playedAt existente, o fecha de la jornada, o hoy
  let suggestedDate = '';
  if(m.playedAt){
    suggestedDate = m.playedAt.substring(0,10); // YYYY-MM-DD
  } else if(m.ronda!=null){
    // Buscar la fecha por defecto de la jornada (si la asignaron)
    const phase = await dbGet('phases', phaseId);
    const meta = phase?.rondaMeta||{};
    const defaultDate = meta[`${groupIdx}_${m.ronda}_date`];
    if(defaultDate) suggestedDate = defaultDate;
  }
  if(!suggestedDate){
    suggestedDate = new Date().toISOString().substring(0,10); // hoy
  }

  wrap.innerHTML=`
  <div class="modal-overlay open">
    <div class="modal" style="max-width:360px;">
      <div class="modal-hdr">
        <div class="modal-title">Ingresar resultado</div>
        <button class="modal-close" onclick="closeEditResultModal()">×</button>
      </div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin-bottom:16px;">
          <div style="font-size:13px;font-weight:700;text-align:center;line-height:1.2;">${escHtml(teamAName)}</div>
          <div style="font-family:'Bebas Neue';font-size:20px;color:var(--txt3);">vs</div>
          <div style="font-size:13px;font-weight:700;text-align:center;line-height:1.2;">${escHtml(teamBName)}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;">
          <input type="number" id="er-ga" min="0" max="99" step="1" value="${hasR?m.goalsA:0}"
            style="padding:12px;text-align:center;font-family:'Bebas Neue';font-size:38px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);width:100%;">
          <div style="font-family:'Bebas Neue';font-size:28px;color:var(--txt3);">-</div>
          <input type="number" id="er-gb" min="0" max="99" step="1" value="${hasR?m.goalsB:0}"
            style="padding:12px;text-align:center;font-family:'Bebas Neue';font-size:38px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);width:100%;">
        </div>
        <div style="margin-top:14px;">
          <label style="display:block;font-size:11px;color:var(--txt3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Fecha del partido</label>
          <input type="date" id="er-played-at" value="${escAttr(suggestedDate)}"
            style="width:100%;padding:8px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:14px;">
        </div>
        ${(m.liveStartAt||m.liveEndAt)?`
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--brd);display:flex;justify-content:space-between;font-size:12px;color:var(--txt3);">
          <span style="display:inline-flex;align-items:center;gap:4px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0;"></span> Inicio: <strong style="color:var(--txt2);">${m.liveStartAt?new Date(m.liveStartAt).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}):'—'}</strong></span>
          <span style="display:inline-flex;align-items:center;gap:4px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg> Fin: <strong style="color:var(--txt2);">${m.liveEndAt?new Date(m.liveEndAt).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}):'—'}</strong></span>
        </div>`:''}
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeEditResultModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveEditResult(${matchId},${phaseId},${groupIdx})">Guardar resultado</button>
      </div>
    </div>
  </div>`;
}

async function saveEditResult(matchId, phaseId, groupIdx){
  const rawA = (document.getElementById('er-ga')?.value ?? '').trim();
  const rawB = (document.getElementById('er-gb')?.value ?? '').trim();
  const ga = Number(rawA), gb = Number(rawB);
  // Vacío, negativo, decimal o absurdo: antes «» se guardaba como 0 y -3 como -3.
  if(rawA==='' || rawB==='' || !Number.isInteger(ga) || !Number.isInteger(gb) || ga<0 || gb<0 || ga>99 || gb>99){
    showToast('Los goles deben ser números enteros entre 0 y 99','error'); return;
  }
  const playedAtStr = document.getElementById('er-played-at')?.value || '';

  await _mxRun(async ()=>{
    const m = await dbGet('matches', matchId);
    if(!m){ showToast('El partido ya no existe','error'); closeEditResultModal(); await showMatchGroupTable(phaseId, groupIdx); return; }
    if(await _mxSeasonLocked(m.phaseId)) return;
    if(m.live){ showToast('El partido está en vivo: termínalo desde el centro de partido','error'); return; }

    // Buscar nombres de equipos desde IDs
    const allTeams = await dbGetAll('teams');
    const teamById = {};
    allTeams.forEach(t=>teamById[t.id]=t.name);
    const teamAName = teamById[m.teamA] || String(m.teamA);
    const teamBName = teamById[m.teamB] || String(m.teamB);

    // v1.7: playedAt = fecha elegida (YYYY-MM-DD), date = timestamp del registro
    const playedAtISO = playedAtStr ? new Date(playedAtStr+'T12:00:00').toISOString() : null;

    try{
      const updated = {
        ...m,
        goalsA: ga,
        goalsB: gb,
        playedAt: playedAtISO,
        date: new Date().toISOString(), // timestamp de cuándo se ingresó
      };
      // Resultado e historial juntos (H-53): antes, si fallaba el segundo, la
      // tabla mostraba el resultado y el historial no.
      const rec = await historyRecordFor(updated);
      await dbWriteBatch([
        {type:'set', store:'matches', data:updated},
        ...(rec ? [{type:'set', store:'matchHistory', data:rec}] : []),
      ]);
      showToast(`${teamAName} ${ga}-${gb} ${teamBName} registrado`);
      closeEditResultModal();
    } finally {
      invalidateStandingsAndSyncBrackets(m.phaseId);
      await showMatchGroupTable(phaseId, groupIdx);
    }
  });
}

function closeEditResultModal(){
  const el=document.getElementById('edit-result-wrap');
  if(el) el.innerHTML='';
}

/* ----------------------------------------------------------
   v1.6: populateRivalSelectors / quickAddToRonda eliminados.
   El sistema unificado usa openRondaModal (ver más abajo).
   ---------------------------------------------------------- */

async function openMatchInputModal(phaseId, groupIdx, defaultTeam){
  const pid = phaseId || window._matchPhaseId;
  const gi  = groupIdx!==undefined ? groupIdx : window._matchGroupIdx;
  if(!pid) return;

  const phase     = await dbGet('phases', pid);
  const groups    = phase?.groups||{};
  const teamIds   = groups[gi]||[];
  const legs      = phase?.config?.legs||1; // 1=ida, 2=ida y vuelta
  const existing  = await dbGetAll('matches', m=>m.phaseId===pid && m.groupIdx===gi);

  // Resolver IDs a nombres para mostrar
  const allTeams = await dbGetAll('teams');
  const teamById = {};
  const teamNameById = {};
  allTeams.forEach(t=>{
    teamById[t.id]=t;
    teamNameById[t.id]=t.name;
  });

  // Generar todos los partidos posibles
  const posibles = [];
  for(let i=0; i<teamIds.length; i++){
    for(let j=i+1; j<teamIds.length; j++){
      const a = teamIds[i], b = teamIds[j];
      const aName = teamNameById[a]||`Team ${a}`;
      const bName = teamNameById[b]||`Team ${b}`;
      // Contar cuántas veces ya se jugó este par (en cualquier dirección)
      const jugados = existing.filter(m=>
        (m.teamA===a&&m.teamB===b)||(m.teamA===b&&m.teamB===a)
      ).length;
      if(jugados < legs){
        posibles.push({a, b, jugados});
      }
    }
  }

  let wrap = document.getElementById('match-input-modal-wrap');
  if(!wrap){ wrap=document.createElement('div'); wrap.id='match-input-modal-wrap'; document.body.appendChild(wrap); }

  if(!posibles.length){
    wrap.innerHTML = `
    <div class="modal-overlay open">
      <div class="modal" style="max-width:380px;">
        <div class="modal-hdr">
          <div class="modal-title">Grupo ${String.fromCharCode(65+gi)}</div>
          <button class="modal-close" onclick="closeMatchInputModal()">×</button>
        </div>
        <div class="modal-body" style="text-align:center;padding:24px;">
          <div style="font-size:38px;margin-bottom:12px;">✓</div>
          <div style="font-weight:600;margin-bottom:6px;">Todos los partidos jugados</div>
          <div style="font-size:14px;color:var(--txt2);">
            ${legs===2?'Temporada completa (ida y vuelta) completada.':'Media temporada completada. Si quieres vuelta, edita la fase.'}
          </div>
        </div>
        <div class="modal-footer"><button class="btn" onclick="closeMatchInputModal()">Cerrar</button></div>
      </div>
    </div>`;
    return;
  }

  // Si se especificó un equipo (desde el botón + Partido de la tabla), filtrar solo sus partidos
  const posiblesDisplay = defaultTeam
    ? posibles.filter(p=>p.a===defaultTeam||p.b===defaultTeam)
    : posibles;

  const pendOpts = posiblesDisplay.map((p,i)=>{
    const pAName = teamNameById[p.a]||`Team ${p.a}`;
    const pBName = teamNameById[p.b]||`Team ${p.b}`;
    return `<option value="${i}">${escHtml(pAName)} vs ${escHtml(pBName)}${p.jugados>0?' (vuelta)':''}</option>`;
  }).join('');

  wrap.innerHTML = `
  <div class="modal-overlay open" id="match-input-modal">
    <div class="modal" style="max-width:400px;">
      <div class="modal-hdr">
        <div class="modal-title">Registrar partido · Grupo ${String.fromCharCode(65+gi)}</div>
        <button class="modal-close" onclick="closeMatchInputModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Partido pendiente <span style="color:var(--txt3);font-size:12px;">(${posiblesDisplay.length} restante${posiblesDisplay.length!==1?'s':''}${defaultTeam?' de '+defaultTeam:''})</span></label>
          <select id="mi-match-sel" onchange="updateMatchInputTeams()" style="width:100%;padding:7px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:14px;">
            ${pendOpts}
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin-bottom:14px;">
          <div style="font-size:14px;font-weight:600;text-align:center;" id="mi-label-a">${escHtml(teamNameById[posiblesDisplay[0]?.a]||'')}</div>
          <div style="font-family:'Bebas Neue';font-size:24px;color:var(--txt3);">vs</div>
          <div style="font-size:14px;font-weight:600;text-align:center;" id="mi-label-b">${escHtml(teamNameById[posiblesDisplay[0]?.b]||'')}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;">
          <input type="number" id="mi-ga" min="0" value="0" oninput="updateMatchPreview()"
            style="padding:12px;text-align:center;font-family:'Bebas Neue';font-size:34px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);width:100%;">
          <div style="font-family:'Bebas Neue';font-size:29px;color:var(--txt3);">-</div>
          <input type="number" id="mi-gb" min="0" value="0" oninput="updateMatchPreview()"
            style="padding:12px;text-align:center;font-family:'Bebas Neue';font-size:34px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);width:100%;">
        </div>
        <div id="match-preview" style="margin-top:12px;text-align:center;font-size:14px;color:var(--txt2);"></div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeMatchInputModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveMatchResult(${pid},${gi})">Registrar</button>
      </div>
    </div>
  </div>`;

  // Guardar partidos filtrados para saveMatchResult
  window._pendingMatches = posiblesDisplay;
  window._teamNameById = teamNameById;  // Guardar para updateMatchInputTeams
  updateMatchInputTeams();
  updateMatchPreview();
}

function updateMatchInputTeams(){
  const sel = document.getElementById('mi-match-sel');
  if(!sel||!window._pendingMatches) return;
  const p = window._pendingMatches[parseInt(sel.value)];
  if(!p) return;
  const teamNameById = window._teamNameById || {};
  const la = document.getElementById('mi-label-a');
  const lb = document.getElementById('mi-label-b');
  const ta = document.getElementById('mi-ta');
  const tb = document.getElementById('mi-tb');
  const aName = teamNameById[p.a] || `Team ${p.a}`;
  const bName = teamNameById[p.b] || `Team ${p.b}`;
  if(la) la.textContent = aName;
  if(lb) lb.textContent = bName;
  if(ta) ta.value = aName;
  if(tb) tb.value = bName;
}

function updateMatchPreview(){
  const ta = document.getElementById('mi-ta')?.value||'';
  const tb = document.getElementById('mi-tb')?.value||'';
  const ga = parseInt(document.getElementById('mi-ga')?.value)||0;
  const gb = parseInt(document.getElementById('mi-gb')?.value)||0;
  const prev = document.getElementById('match-preview');
  if(!prev) return;
  if(ga>gb) prev.innerHTML=`<span style="color:var(--green);">${escHtml(ta)}</span> gana`;
  else if(gb>ga) prev.innerHTML=`<span style="color:var(--green);">${escHtml(tb)}</span> gana`;
  else prev.innerHTML=`<span style="color:var(--gold);">Empate</span>`;
}

function closeMatchInputModal(){
  const el = document.getElementById('match-input-modal-wrap');
  if(el) el.innerHTML='';
}

async function saveMatchResult(phaseId, groupIdx){
  const sel     = document.getElementById('mi-match-sel');
  const pending = window._pendingMatches;
  if(!sel || !pending){ showToast('Error al leer el partido','error'); return; }
  const match = pending[parseInt(sel.value)];
  if(!match){ showToast('Selecciona un partido','error'); return; }

  const ta = match.a;
  const tb = match.b;
  const ga = parseInt(document.getElementById('mi-ga').value)||0;
  const gb = parseInt(document.getElementById('mi-gb').value)||0;

  const newId = await dbAdd('matches',{
    phaseId, groupIdx,
    teamA:ta, teamB:tb,
    goalsA:ga, goalsB:gb,
    ronda: window._matchRondaActual||null,
    season:STATE.season,
    date:new Date().toISOString(), // fecha/hora real (registro directo sin ronda)
  });
  await appendOrUpdateHistory(newId);

  invalidateStandingsAndSyncBrackets(phaseId);
  // Resolver nombres para el toast (ta/tb pueden ser IDs)
  const _resolveName = async (v)=>{
    if(typeof v==='number' || Number.isFinite(parseInt(v))){
      const t = await dbGet('teams', parseInt(v));
      return t?.name || `#${v}`;
    }
    return v;
  };
  const naName = await _resolveName(ta);
  const nbName = await _resolveName(tb);
  showToast(`${naName} ${ga}-${gb} ${nbName} registrado`);
  closeMatchInputModal();
  showMatchGroupTable(phaseId, groupIdx);
}

async function deleteMatch(id){
  const m = await dbGet('matches', id);
  if(!m){ showToast('El partido ya no existe','error'); showMatchGroupTable(window._matchPhaseId, window._matchGroupIdx); return; }
  if(await _mxSeasonLocked(m.phaseId)) return;
  if(m.live){ showToast('El partido está en vivo: termínalo antes de eliminarlo','error'); return; }
  const hasR = m.goalsA!=null && m.goalsB!=null;
  showConfirm('¿Eliminar partido?',
    hasR ? `Se borrará el resultado (${m.goalsA}-${m.goalsB}) y su registro del historial; la tabla se recalcula.` : 'El partido aún no tiene resultado.',
    ()=>_mxRun(async ()=>{
      const cur = await dbGet('matches', id);
      if(!cur){ showToast('El partido ya no existe','error'); return; }
      if(cur.live){ showToast('El partido está en vivo: termínalo antes de eliminarlo','error'); return; }
      try{
        const ops = await _mxDeleteOps([id]);
        if(cur.ronda!=null){
          const left = await dbGetAll('matches', m=>m.id!==id && m.phaseId===cur.phaseId && m.groupIdx===cur.groupIdx && m.ronda===cur.ronda);
          const phase = left.length ? null : _mxPhaseWithoutRondaMeta(await dbGet('phases', cur.phaseId), cur.groupIdx, cur.ronda);
          if(phase) ops.push({type:'set', store:'phases', data:phase});
        }
        await dbWriteBatch(ops);
        showToast('Partido eliminado');
      } finally {
        invalidateStandingsAndSyncBrackets(cur.phaseId);
        if(cur.phaseId===window._matchPhaseId) await showMatchGroupTable(cur.phaseId, cur.groupIdx);
      }
    }));
}

async function deleteRonda(phaseId, groupIdx, ronda){
  if(await _mxSeasonLocked(phaseId)) return;
  const toCheck = await dbGetAll('matches', m=>m.phaseId===phaseId && m.groupIdx===groupIdx && m.ronda===ronda);
  if(toCheck.some(m=>m.live)){ showToast('Hay un partido en vivo en esta fecha: termínalo antes de borrarla','error'); return; }
  const conR = toCheck.filter(m=>m.goalsA!=null && m.goalsB!=null).length;
  showConfirm(
    `¿Borrar Fecha ${ronda}?`,
    `Se eliminarán los ${toCheck.length} partido${toCheck.length===1?'':'s'} de esta fecha${conR?` (${conR} con resultado, que también salen del historial)`:''} y su programación asociada.`,
    ()=>_mxRun(async()=>{
      const toDelete = await dbGetAll('matches', m=>m.phaseId===phaseId && m.groupIdx===groupIdx && m.ronda===ronda);
      if(toDelete.some(m=>m.live)){ showToast('Hay un partido en vivo en esta fecha: termínalo antes de borrarla','error'); return; }
      try{
        const ops = await _mxDeleteOps(toDelete.map(m=>m.id));
        const phase = _mxPhaseWithoutRondaMeta(await dbGet('phases', phaseId), groupIdx, ronda);
        if(phase) ops.push({type:'set', store:'phases', data:phase});
        await dbWriteBatch(ops);
        showToast(`Fecha ${ronda} eliminada (${toDelete.length} partido${toDelete.length===1?'':'s'})`);
      } finally {
        invalidateStandingsAndSyncBrackets(phaseId);
        await showMatchGroupTable(phaseId, groupIdx);
      }
    })
  );
}
