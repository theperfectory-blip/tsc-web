async function renderAdmSeasons(){
  const el=document.getElementById('adm-seasons-content');
  const seasons=await dbGetAll('seasons');
  el.innerHTML=`
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
    <div style="font-size:14px;color:var(--txt2);">${seasons.length} temporada(s)</div>
    <button class="btn btn-primary" onclick="openSeasonModal()">+ Nueva temporada</button>
  </div>
  <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px;">
    ${seasons.sort((a,b)=>b.number-a.number).map(s=>`
    <div class="card" style="padding:14px;display:flex;align-items:center;gap:14px;">
      <div style="font-family:'Bebas Neue';font-size:38px;color:var(--gold);min-width:48px;word-break:break-word;">${getSeasonName(s)}</div>
      <div style="flex:1;">
        <div style="display:flex;gap:8px;margin-bottom:4px;">
          <span class="badge ${s.status==='active'?'badge-green':s.status==='finished'?'badge-gold':'badge-gray'}">${s.status==='active'?'Activa':s.status==='finished'?'Finalizada':'Borrador'}</span>
          ${s.number===STATE.season?'<span class="badge badge-blue">Actual</span>':''}
        </div>
        ${s.game?`<div style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--txt3);margin-bottom:6px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 3v18"></path>
            <path d="M3 12h18"></path>
          </svg>
          ${s.game}
        </div>`:''}
        <div style="font-size:13px;color:var(--txt3);">Creada: ${s.createdAt?new Date(s.createdAt).toLocaleDateString('es-CL'):'—'}</div>
        ${s.finishedAt?`<div style="font-size:13px;color:var(--txt3);">Finalizada: ${new Date(s.finishedAt).toLocaleDateString('es-CL')}</div>`:''}
      </div>
      <div style="display:flex;gap:6px;">
        ${s.number!==STATE.season?`<button class="btn btn-sm" onclick="switchToSeason(${s.number})">Ir</button>`:''}
        <button class="btn btn-sm" onclick="openSeasonModal(${s.number})" ${s.status==='finished'?'disabled style="opacity:0.5;cursor:not-allowed;"':''}>✎ Editar</button>
        ${s.status==='active'?`<button class="btn btn-sm btn-danger" onclick="confirmFinalizeSeason(${s.number})">Finalizar</button>`:''}
        ${s.status==='finished'?`<button class="btn btn-sm" onclick="confirmReactivateSeason(${s.number})">🔄 Reactivar</button>`:''}
      </div>
    </div>`).join('')}
  </div>
  <div id="season-modal-wrap"></div>`;
}

async function openSeasonModal(number=null){
  let season=null;
  const isCreate=number===null;
  if(!isCreate) season=(await dbGetAll('seasons')).find(s=>s.number===number);

  document.getElementById('season-modal-wrap').innerHTML=`
  <div class="modal-overlay open">
    <div class="modal" style="max-width:380px;">
      <div class="modal-hdr">
        <div class="modal-title">${isCreate?'Nueva temporada':'Editar Temporada '+number}</div>
        <button class="modal-close" onclick="document.getElementById('season-modal-wrap').innerHTML=''">×</button>
      </div>
      <div class="modal-body">
        ${!isCreate?`<div class="form-group">
          <label>Número</label>
          <input type="number" id="sm-number" min="1" placeholder="1" value="${season?.number||''}" readonly style="font-family:'Bebas Neue';font-size:28px;text-align:center;">
        </div>`:''}
        <div class="form-group">
          <label>${isCreate?'Nombre':'Nombre (opcional)'}</label>
          <input type="text" id="sm-name" placeholder="${isCreate?'Ej: Temporada 2026':''}" value="${season?.name||''}" style="font-size:16px;">
        </div>
        <div class="form-group">
          <label>Juego</label>
          <input type="text" id="sm-game" placeholder="Ej: PES 2024, FC 25" value="${season?.game||''}" style="font-size:16px;">
        </div>
        ${!isCreate?`<div style="display:flex;gap:8px;margin-top:12px;">
          <span class="badge ${season?.status==='active'?'badge-green':season?.status==='finished'?'badge-gold':'badge-gray'}">${season?.status==='active'?'Activa':season?.status==='finished'?'Finalizada':'Borrador'}</span>
        </div>`:''}
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="document.getElementById('season-modal-wrap').innerHTML=''">Cancelar</button>
        <button class="btn btn-primary" onclick="saveSeasonModal(${isCreate?'null':number})">${isCreate?'Crear':'Guardar'}</button>
      </div>
    </div>
  </div>`;
  document.getElementById('sm-name').focus();
}

async function saveSeasonModal(number){
  const isCreate=number===null;
  if(isCreate){
    const name=document.getElementById('sm-name').value.trim();
    const game=document.getElementById('sm-game').value.trim();
    const existing=await dbGetAll('seasons');
    const numVal=existing.length>0?Math.max(...existing.map(s=>s.number))+1:1;
    await dbAdd('seasons',{number:numVal,name:name||null,game:game||null,status:'active',createdAt:new Date().toISOString()});
    STATE.season=numVal;
    showToast('Temporada '+numVal+' creada');
  } else {
    const season=(await dbGetAll('seasons')).find(s=>s.number===number);
    const name=document.getElementById('sm-name').value.trim();
    const game=document.getElementById('sm-game').value.trim();
    const nameChanged = (season?.name||null) !== (name||null);
    const gameChanged = (season?.game||null) !== (game||null);
    await dbPut('seasons',{...season,name:name||null,game:game||null});
    if((nameChanged||gameChanged) && typeof refreshHistoryForSeason==='function'){
      await refreshHistoryForSeason(number);
    }
    showToast('Temporada actualizada');
  }
  document.getElementById('season-modal-wrap').innerHTML='';
  await loadSeasons();
  renderAdmSeasons();
}

async function switchToSeason(number){
  STATE.season=number;
  window._fwLaunched = {};
  window._currentCompId = null;
  window._currentCompName = '';
  window._matchPhaseId = null;
  window._matchGroupIdx = null;
  window._matchGroupIdxByPhase = {};
  localStorage.removeItem(`adm_matches_phase_season_${number}`);
  closeAllModals();
  await loadSeasons();
  showToast('Cambiado a Temporada '+number);
  const page = STATE.adminPage;
  if(STATE.mode==='admin') renderAdminPage(page);
  else renderPublicPage(page);
}

async function confirmFinalizeSeason(number){
  showConfirm('¿Finalizar Temporada '+number+'?','Se archivará el estado actual.',async()=>{await finalizeSeason(number);});
}

async function finalizeSeason(number){
  const season=(await dbGetAll('seasons')).find(s=>s.number===number);
  await dbPut('seasons',{...season,status:'finished',finishedAt:new Date().toISOString()});
  closeAllModals();
  await loadSeasons();
  showToast('Temporada '+number+' finalizada');
  renderAdmSeasons();
}


async function confirmReactivateSeason(number){
  showConfirm('¿Reactivar Temporada '+number+'?','Volverá al estado activo y se eliminarán sus registros del histórico.',async()=>{await reactivateSeason(number);});
}

function closeAllModals(){
  const modals = ['phase-modal-wrap','match-input-modal-wrap','assign-date-wrap','comp-modal-wrap'];
  modals.forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.innerHTML = '';
  });
  const pages = ['adm-fases-content','adm-matches-content','adm-comps-content'];
  pages.forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.innerHTML = '';
  });
}

async function reactivateSeason(number){
  try {
    const season=(await dbGetAll('seasons')).find(s=>s.number===number);
    await dbPut('seasons',{...season,status:'active',finishedAt:null});
    closeAllModals();
    await loadSeasons();
    showToast('Temporada '+number+' reactivada');
    renderAdmSeasons();
  } catch(err){
    showToast('Error: '+err.message,'error');
  }
}

