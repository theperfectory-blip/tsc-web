async function renderPubPanel(){
  const el = document.getElementById('pub-panel-content');
  const comps = await getForSeason('competitions');

  // v1.7: filtro tolerante — acepta 'active', mayúsculas, espacios, y comps sin status
  const isActiveStatus = s => {
    if(s==null) return true; // sin status definido = activa por defecto (legacy)
    const norm = String(s).trim().toLowerCase();
    return norm==='active' || norm==='activa' || norm==='';
  };
  const active = comps.filter(c=>isActiveStatus(c.status));

  // Diagnóstico en consola para detectar competiciones excluidas
  const excluded = comps.filter(c=>!isActiveStatus(c.status));
  if(excluded.length){
    console.warn(`[Panel público] ${excluded.length} competición(es) excluidas por status:`,
      excluded.map(c=>({name:c.name, status:c.status, season:c.season})));
  }
  console.log(`[Panel público] T${STATE.season}: ${comps.length} comps total, ${active.length} mostradas`,
    active.map(c=>({id:c.id, name:c.name, status:c.status, season:c.season})));

  if(!active.length){
    el.innerHTML=`<div style="color:var(--txt3);font-size:16px;padding:20px 0;">No hay competiciones activas en T${STATE.season}.</div>`;
    return;
  }
  // Si no hay comp seleccionada, tomar la primera
  if(!window._pubState.compId || !active.find(c=>c.id===window._pubState.compId)){
    window._pubState.compId = active[0].id;
    window._pubState.phaseId = null;
  }
  const selComp = active.find(c=>c.id===window._pubState.compId) || active[0];
  console.log(`[Panel público] Comp seleccionada:`, {id:selComp.id, name:selComp.name});

  // v1.7: mismo criterio tolerante para fases
  const allPhases = await dbGetAll('phases', p=>p.compId===selComp.id);
  const phases = allPhases.filter(p=>{
    if(p.status==null) return true;
    const norm = String(p.status).trim().toLowerCase();
    return norm==='active' || norm==='activa' || norm==='';
  });
  phases.sort((a,b)=>(a.order||0)-(b.order||0));
  console.log(`[Panel público] Fases para "${selComp.name}":`, allPhases.length, 'total,', phases.length, 'activas',
    phases.map(p=>({id:p.id, name:p.name, type:p.type, status:p.status})));

  if(!window._pubState.phaseId || !phases.find(p=>p.id===window._pubState.phaseId)){
    window._pubState.phaseId = phases[0]?.id || null;
  }
  const selPhase = phases.find(p=>p.id===window._pubState.phaseId);

  // ── Botones de competición ──
  const compBtns = active.map(c=>`
    <button onclick="pubSelectComp(${c.id})"
      style="padding:7px 16px;font-family:'Barlow Condensed';font-weight:700;font-size:14px;
        text-transform:uppercase;letter-spacing:0.5px;border-radius:20px;cursor:pointer;
        border:2px solid ${c.id===selComp.id?(c.color||'var(--gold)'):'var(--brd)'};
        background:${c.id===selComp.id?'var(--card2)':'transparent'};
        color:${c.id===selComp.id?(c.color||'var(--gold)'):'var(--txt2)'};
        transition:all 0.15s;">
      ${c.name}
    </button>`).join('');

  // ── Botones de fase ──
  const phaseBtns = phases.map(p=>`
    <button onclick="pubSelectPhase(${p.id})"
      style="padding:5px 14px;font-family:'Barlow Condensed';font-weight:700;font-size:13px;
        text-transform:uppercase;letter-spacing:0.5px;border-radius:20px;cursor:pointer;
        border:2px solid ${p.id===selPhase?.id?'var(--gold)':'var(--brd)'};
        background:${p.id===selPhase?.id?'var(--gold-l)':'transparent'};
        color:${p.id===selPhase?.id?'var(--gold)':'var(--txt2)'};
        transition:all 0.15s;">
      ${p.name}
    </button>`).join('');

  const phaseContentId = `pub-phase-content-${selComp.id}-${selPhase?.id}`;

  // v1.7.001: aviso si no hay fases activas en esta comp
  const noPhasesMsg = !phases.length
    ? `<div style="color:var(--txt3);font-size:14px;padding:24px;text-align:center;background:var(--card2);border:1px dashed var(--brd);border-radius:var(--r);">
        <strong style="color:var(--gold);">${selComp.name}</strong> no tiene fases activas todavía.<br>
        <span style="font-size:12px;">Crea una fase desde el modo administrador.</span>
      </div>`
    : '';

  el.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
      ${compBtns}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--brd);">
      ${phaseBtns}
    </div>
    ${noPhasesMsg}
    <div id="${phaseContentId}"></div>`;

  // v1.7.001: blindar render para que un error en una fase no deje en blanco el panel
  if(selPhase){
    try {
      console.log(`[Panel público] Renderizando fase:`, {id:selPhase.id, name:selPhase.name, type:selPhase.type});
      if(selPhase.type==='groups'){
        // Tabla de posiciones
        await renderGroupTable(selPhase.id, phaseContentId, false);
        // Selector de grupo para partidos
        const phase = await dbGet('phases', selPhase.id);
        const ngroups = phase?.config?.ngroups || 2;
        const groupAssignments = phase?.groups || {};
        console.log(`[Panel público] Fase groups:`, {ngroups, groupKeys:Object.keys(groupAssignments)});
        if(Object.keys(groupAssignments).length){
        // Botones de grupo para ver partidos
        const groupBtns = Array.from({length:ngroups},(_,i)=>`
          <button onclick="pubShowMatchesGroup(${selPhase.id},${i},this)"
            style="padding:4px 14px;font-family:'Barlow Condensed';font-weight:700;font-size:13px;
              text-transform:uppercase;border-radius:20px;cursor:pointer;
              border:1px solid var(--brd2);background:transparent;color:var(--txt2);transition:all 0.15s;"
            data-group="${i}">
            Grupo ${String.fromCharCode(65+i)}
          </button>`).join('');
        const matchesWrap = document.createElement('div');
        matchesWrap.id = `pub-matches-wrap-${selPhase.id}`;
        matchesWrap.innerHTML = `
          <div style="margin-top:24px;">
            <div class="section-lbl">Partidos</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;" id="pub-matches-group-btns-${selPhase.id}">
              ${groupBtns}
            </div>
            <div id="pub-matches-list-${selPhase.id}"></div>
          </div>`;
        document.getElementById(phaseContentId)?.appendChild(matchesWrap);
        // Mostrar grupo 0 por defecto
        await pubShowMatchesGroup(selPhase.id, 0, document.querySelector(`[data-group="0"]`));
      }
    }
    else if(selPhase.type==='bracket') await renderBracket(selPhase.id, phaseContentId, false);
    else if(selPhase.type==='playoff') await renderPlayoff(selPhase.id, phaseContentId, false);
    else if(selPhase.type==='single'){
      const teams = selPhase.config?.teams||2;
      if(teams===4) await renderBracket(selPhase.id, phaseContentId, false);
      else await renderPlayoff(selPhase.id, phaseContentId, false);
    }
    else {
      console.warn(`[Panel público] Tipo de fase desconocido: "${selPhase.type}"`);
      const ct = document.getElementById(phaseContentId);
      if(ct) ct.innerHTML = `<div style="color:var(--txt3);padding:20px;text-align:center;">Tipo de fase no soportado: <code>${selPhase.type||'(vacío)'}</code></div>`;
    }
    } catch(err) {
      console.error(`[Panel público] Error renderizando fase ${selPhase.id} ("${selPhase.name}"):`, err);
      const ct = document.getElementById(phaseContentId);
      if(ct) ct.innerHTML = `
        <div style="background:rgba(239,68,68,0.1);border:1px solid var(--red);border-radius:var(--r);padding:14px;color:var(--red);font-size:13px;">
          <strong>Error renderizando "${selPhase.name}":</strong><br>
          <code style="font-size:11px;color:var(--txt2);">${(err.message||err).toString().replace(/</g,'&lt;')}</code><br>
          <span style="font-size:12px;color:var(--txt3);">Abre la consola (F12) para ver el detalle. Probablemente la fase tiene datos corruptos o le faltan grupos.</span>
        </div>`;
    }
  }
}

async function pubShowMatchesGroup(phaseId, groupIdx, btnEl){
  // Resaltar botón activo
  const btnsContainer = document.getElementById(`pub-matches-group-btns-${phaseId}`);
  if(btnsContainer) btnsContainer.querySelectorAll('button').forEach(b=>{
    b.style.background = 'transparent';
    b.style.color = 'var(--txt2)';
    b.style.borderColor = 'var(--brd2)';
  });
  if(btnEl){
    btnEl.style.background = 'var(--gold-l)';
    btnEl.style.color = 'var(--gold)';
    btnEl.style.borderColor = 'var(--gold-b)';
  }
  try {
    await renderMatchesList(phaseId, groupIdx, `pub-matches-list-${phaseId}`, false);
  } catch(err) {
    console.error(`[Panel público] Error renderMatchesList phase=${phaseId} group=${groupIdx}:`, err);
    const c = document.getElementById(`pub-matches-list-${phaseId}`);
    if(c) c.innerHTML = `<div style="color:var(--red);font-size:12px;padding:10px;">Error al cargar partidos: ${(err.message||err).toString().replace(/</g,'&lt;')}</div>`;
  }
}

async function pubSelectComp(compId){
  window._pubState.compId = compId;
  window._pubState.phaseId = null;
  await renderPubPanel();
}

async function pubSelectPhase(phaseId){
  window._pubState.phaseId = phaseId;
  await renderPubPanel();
}

/* renderPubHistory: ahora vive en js/history.js (historial dinámico de partidos) */

