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
      <div style="font-family:'Bebas Neue';font-size:38px;color:var(--gold);min-width:48px;word-break:break-word;">${escHtml(getSeasonName(s))}</div>
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
          ${escHtml(s.game)}
        </div>`:''}
        <div style="font-size:13px;color:var(--txt3);">Creada: ${s.createdAt?new Date(s.createdAt).toLocaleDateString('es-CL'):'—'}</div>
        ${s.finishedAt?`<div style="font-size:13px;color:var(--txt3);">Finalizada: ${new Date(s.finishedAt).toLocaleDateString('es-CL')}</div>`:''}
      </div>
      <div style="display:flex;gap:6px;">
        ${s.number!==STATE.season?`<button class="btn btn-sm" onclick="switchToSeason(${s.number})">Ir</button>`:''}
        <button class="btn btn-sm" onclick="openSeasonModal(${s.number})" ${s.status==='finished'?'disabled':''} style="display:inline-flex;align-items:center;gap:4px;${s.status==='finished'?'opacity:0.5;cursor:not-allowed;':''}"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Editar</button>
        ${s.status==='active'?`<button class="btn btn-sm btn-danger" onclick="confirmFinalizeSeason(${s.number})">Finalizar</button>`:''}
        ${s.status==='finished'?`<button class="btn btn-sm" onclick="confirmReactivateSeason(${s.number})" style="display:inline-flex;align-items:center;gap:4px;"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>Reactivar</button>`:''}
        <button class="btn btn-sm btn-danger" onclick="confirmDeleteSeason(${s.number})" title="Eliminar temporada por completo" style="display:inline-flex;align-items:center;gap:4px;"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>Eliminar</button>
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
          <input type="text" id="sm-name" maxlength="40" placeholder="${isCreate?'Ej: Temporada 2026':''}" value="${escAttr(season?.name||'')}" style="font-size:16px;">
        </div>
        <div class="form-group">
          <label>Juego</label>
          <input type="text" id="sm-game" maxlength="40" placeholder="Ej: PES 2024, FC 25" value="${escAttr(season?.game||'')}" style="font-size:16px;">
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

/* Evita doble envío: dos clics en «Crear» leían el mismo máximo y creaban
   dos temporadas con el mismo número. */
let _seasonBusy = false;

async function saveSeasonModal(number){
  if(_seasonBusy) return;
  _seasonBusy = true;
  const isCreate=number===null;
  try {
    const name=document.getElementById('sm-name').value.trim();
    const game=document.getElementById('sm-game').value.trim();
    if(isCreate){
      const existing=await dbGetAll('seasons');
      const numVal=existing.length>0?Math.max(...existing.map(s=>s.number))+1:1;
      await dbAdd('seasons',{number:numVal,name:name||null,game:game||null,status:'active',createdAt:new Date().toISOString()});
      document.getElementById('season-modal-wrap').innerHTML='';
      showToast('Temporada '+numVal+' creada');
      // Pasa a la temporada nueva por el mismo camino que «Ir» (persiste la
      // selección y limpia el estado de la anterior).
      await _applySeasonSwitch(numVal);
      return;
    }
    const season=(await dbGetAll('seasons')).find(s=>s.number===number);
    if(!season){ showToast('Temporada no encontrada','error'); return; }
    const nameChanged = (season.name||null) !== (name||null);
    const gameChanged = (season.game||null) !== (game||null);
    await dbPut('seasons',{...season,name:name||null,game:game||null});
    if((nameChanged||gameChanged) && typeof refreshHistoryForSeason==='function'){
      await refreshHistoryForSeason(number);
    }
    showToast('Temporada actualizada');
    document.getElementById('season-modal-wrap').innerHTML='';
    await loadSeasons();
    await renderAdmSeasons();
  } catch(err){
    showToast('Error al guardar la temporada: '+dbErrorMsg(err),'error');
  } finally {
    _seasonBusy = false;
  }
}

/* Cambio de temporada desde la lista: mismo camino que el selector de la
   topbar (onSeasonChange), que persiste la temporada en localStorage — antes
   un reload volvía a la anterior — y recalcula la pestaña de sorteo. */
async function _applySeasonSwitch(number){
  closeAllModals();
  localStorage.removeItem(`adm_matches_phase_season_${number}`);
  STATE.season = number;
  await loadSeasons();   // arma el <select> de la topbar con esta temporada marcada
  await onSeasonChange(String(number));
}

async function switchToSeason(number){
  await _applySeasonSwitch(number);
  showToast('Cambiado a Temporada '+number);
}

async function confirmFinalizeSeason(number){
  showConfirm('¿Finalizar Temporada '+number+'?',
    'Sus competiciones, fases y partidos quedan de solo lectura, y sus resultados pasan a contar en la tabla histórica. Se puede reactivar después.',
    async()=>{await finalizeSeason(number);});
}

async function finalizeSeason(number){
  try {
    const season=(await dbGetAll('seasons')).find(s=>s.number===number);
    if(!season){ showToast('Temporada no encontrada','error'); return; }
    await dbPut('seasons',{...season,status:'finished',finishedAt:new Date().toISOString()});
    closeAllModals();
    await loadSeasons();
    showToast('Temporada '+number+' finalizada');
    await renderAdmSeasons();
  } catch(err){
    showToast('Error al finalizar: '+dbErrorMsg(err),'error');
  }
}


async function confirmReactivateSeason(number){
  // Reactivar no borra nada: la tabla histórica solo suma temporadas
  // finalizadas, así que sus partidos dejan de contar mientras esté activa.
  showConfirm('¿Reactivar Temporada '+number+'?',
    'Vuelve a estar activa y editable. Sus partidos dejan de contar en la tabla histórica hasta que se vuelva a finalizar.',
    async()=>{await reactivateSeason(number);});
}

/* ----------------------------------------------------------
   ELIMINAR TEMPORADA (completo, en cascada)
   A diferencia de finalizar/reactivar (que solo tocan seasons.status),
   esto borra de verdad los registros de la temporada:
   - por `season`: competitions, matches, coins, sorteo, sorteoEvents,
     calDayLabels;
   - phases NO tienen `season`: se borran por `compId` de las competiciones
     de la temporada (antes quedaban huérfanas);
   - matchHistory por `seasonRef`.
   No se tocan: `teams` (plantel global, y los saldos de YuNaCoins viven en
   el equipo) ni `palmares` (su `season` es una etiqueta de texto, «T3», del
   palmarés histórico, no el número de temporada).
   ---------------------------------------------------------- */
async function _collectSeasonCascade(number){
  const [comps, matches, coinsRows, sorteoRows, sorteoEvRows, calLabels, matchHist] = await Promise.all([
    dbGetAll('competitions', r=>r.season===number),
    dbGetAll('matches',      r=>r.season===number),
    dbGetAll('coins',        r=>r.season===number),
    dbGetAll('sorteo',       r=>r.season===number),
    dbGetAll('sorteoEvents', r=>r.season===number),
    dbGetAll('calDayLabels', r=>r.season===number),
    dbGetAll('matchHistory', r=>r.seasonRef===number),
  ]);
  const compIds = new Set(comps.map(c=>c.id));
  const phases = await dbGetAll('phases', p=>compIds.has(p.compId) || p.season===number);
  return { comps, phases, matches, coinsRows, sorteoRows, sorteoEvRows, calLabels, matchHist };
}

async function confirmDeleteSeason(number){
  try {
    const season = (await dbGetAll('seasons')).find(s=>s.number===number);
    if(!season){ showToast('Temporada no encontrada','error'); return; }
    const c = await _collectSeasonCascade(number);

    const counts = [
      c.comps.length        && `${c.comps.length} competiciones`,
      c.phases.length       && `${c.phases.length} fases`,
      c.matches.length      && `${c.matches.length} partidos`,
      c.coinsRows.length    && `${c.coinsRows.length} movimientos de YuNaCoins`,
      (c.sorteoRows.length + c.sorteoEvRows.length) && `el sorteo (${c.sorteoEvRows.length} bolillas sorteadas)`,
      c.calLabels.length    && `${c.calLabels.length} etiquetas de calendario`,
      c.matchHist.length    && `${c.matchHist.length} partidos en el historial`,
    ].filter(Boolean);

    const keep = 'No se tocan los equipos, sus saldos de YuNaCoins ni el palmarés.';
    const detail = counts.length
      ? `Se eliminarán de forma permanente: ${counts.join(', ')}. ${keep} Esta acción no se puede deshacer.`
      : `Esta temporada no tiene datos asociados. ${keep} Esta acción no se puede deshacer.`;

    showConfirm(`¿Eliminar ${getSeasonName(season)} por completo?`, detail, async()=>{ await deleteSeason(number); });
  } catch(err){
    showToast('Error al preparar el borrado: '+dbErrorMsg(err),'error');
  }
}

async function deleteSeason(number){
  if(_seasonBusy) return;
  _seasonBusy = true;
  try {
    const seasons = await dbGetAll('seasons');
    const season = seasons.find(s=>s.number===number);
    if(!season){ showToast('Temporada no encontrada','error'); return; }

    const c = await _collectSeasonCascade(number);
    const ids = rows => rows.map(r=>r.id);

    // Hijos primero (partidos → fases → competiciones), después el resto y
    // al final la temporada: si algo falla a mitad, la temporada sigue en la
    // lista y se puede volver a eliminar para terminar. dbDeleteMany borra
    // en lotes (un batch de Firestore cada 450) en vez de uno por uno.
    await dbDeleteMany('matches',      ids(c.matches));
    await dbDeleteMany('phases',       ids(c.phases));
    await dbDeleteMany('competitions', ids(c.comps));
    await dbDeleteMany('coins',        ids(c.coinsRows));
    await dbDeleteMany('sorteoEvents', ids(c.sorteoEvRows));
    await dbDeleteMany('sorteo',       ids(c.sorteoRows));
    await dbDeleteMany('calDayLabels', ids(c.calLabels));
    await dbDeleteMany('matchHistory', ids(c.matchHist));

    // Invalidar cache de standings de las fases borradas (bracket.js).
    if(typeof invalidateStandingsCache==='function'){
      c.phases.forEach(p=>invalidateStandingsCache(p.id));
    }

    // Limpiar estado en memoria/localStorage referido a esta temporada.
    localStorage.removeItem(`adm_matches_phase_season_${number}`);

    const wasCurrent = STATE.season===number;
    await dbDelete('seasons', season.id);

    closeAllModals();
    showToast('Temporada '+number+' eliminada');
    if(wasCurrent){
      const remaining = await dbGetAll('seasons');
      const next = remaining.find(s=>s.status==='active') || remaining[0];
      // Si no queda ninguna temporada, STATE.season se corrige recién al
      // crear la próxima (saveSeasonModal pasa a ella).
      if(next){ await _applySeasonSwitch(next.number); return; }
    }
    await loadSeasons();
    if(STATE.mode==='admin') await renderAdminPage(STATE.adminPage);
  } catch(err){
    showToast('Error al eliminar: '+dbErrorMsg(err),'error');
  } finally {
    _seasonBusy = false;
  }
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
    showToast('Error al reactivar: '+dbErrorMsg(err),'error');
  }
}

