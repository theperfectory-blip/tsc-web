function _esc(v){ return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ─ helpers de fecha ─────────────────────────────────────── */
const _CAL_DIAS  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const _CAL_MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function _calFormatDay(dateStr){
  const [y,m,d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m-1, d);
  return `${_CAL_DIAS[dt.getDay()]}, ${d} de ${_CAL_MESES[m-1]}`;
}
function _calTodayStr(){
  return new Date().toISOString().substring(0,10);
}

/* ─ logo helper ──────────────────────────────────────────── */
function _calLogo(team, size, fallbackLabel){
  const s = size||36;
  if(!team){
    const initials = fallbackLabel ? String(fallbackLabel).substring(0,2).toUpperCase() : '?';
    return `<div class="cal-logo cal-logo--ph" style="width:${s}px;height:${s}px;background:#555;font-size:${Math.floor(s/3)}px;">${_esc(initials)}</div>`;
  }
  if(team.logo) return `<img class="cal-logo" src="${_esc(team.logo)}" style="width:${s}px;height:${s}px;" alt="${_esc(team.name)}">`;
  const initials = (team.name||'?').substring(0,2).toUpperCase();
  const bg = team.color||'#555';
  return `<div class="cal-logo cal-logo--ph" style="width:${s}px;height:${s}px;background:${_esc(bg)};font-size:${Math.floor(s/3)}px;">${_esc(initials)}</div>`;
}

/* ================================================================
   GUARDADO — debounced
   ================================================================ */
const _calTimer = {};

/* Grupo: actualiza doc de partido existente */
function _calSave(matchId, dateStr, timeStr, rkey){
  const key = rkey || String(matchId);
  clearTimeout(_calTimer[key]);
  _calTimer[key] = setTimeout(async ()=>{
    const m = await dbGet('matches', matchId);
    if(!m) return;
    await dbPut('matches', {...m, scheduledDate: dateStr||null, scheduledTime: timeStr||null});
    _calRowOk(key);
  }, 700);
}

/* Bracket / playoff: crea o actualiza placeholder doc */
function _calSaveSlot(phaseId, slotId, teamA, teamB, labelA, labelB, matchIdx, roundIdx, leg, dateStr, timeStr, rkey){
  const key = rkey || slotId;
  clearTimeout(_calTimer[key]);
  _calTimer[key] = setTimeout(async ()=>{
    const existing = await dbGetAll('matches', m => m.slotId===slotId && m.phaseId===phaseId);
    if(existing.length){
      // Preservar resultado si ya existe — solo actualizar schedule
      for(const doc of existing){
        await dbPut('matches', {...doc, scheduledDate: dateStr||null, scheduledTime: timeStr||null});
      }
    } else {
      const data = {
        slotId,
        phaseId,
        teamA: teamA!=null ? teamA : null,
        teamB: teamB!=null ? teamB : null,
        labelA: labelA || null,
        labelB: labelB || null,
        goalsA: null,
        goalsB: null,
        season: STATE.season,
        scheduledDate: dateStr||null,
        scheduledTime: timeStr||null,
      };
      if(matchIdx != null) data.matchIdx = matchIdx;
      if(roundIdx != null) data.roundIdx = roundIdx;
      if(leg      != null) data.leg      = leg;
      await dbAdd('matches', data);
    }
    _calRowOk(key);
  }, 700);
}

function _calRowOk(key){
  const row = document.querySelector(`.cal-adm-row[data-rkey="${key}"]`);
  if(row){ row.classList.add('cal-adm-row--ok'); setTimeout(()=>row.classList.remove('cal-adm-row--ok'),1200); }
}

/* Handler unificado para los inputs de fecha/hora */
function _calOnChange(input){
  const row    = input.closest('.cal-adm-row');
  const date   = row.querySelector('.cal-inp-date').value;
  const time   = row.querySelector('.cal-inp-time').value;
  const rkey   = row.dataset.rkey;
  const mid    = row.dataset.mid;
  if(mid){
    _calSave(parseInt(mid), date, time, rkey);
    return;
  }
  const sid  = row.dataset.sid;
  const pid  = parseInt(row.dataset.pid);
  const ta   = row.dataset.ta  ? parseInt(row.dataset.ta)  : null;
  const tb   = row.dataset.tb  ? parseInt(row.dataset.tb)  : null;
  const la   = row.dataset.la  || '';
  const lb   = row.dataset.lb  || '';
  const mi   = row.dataset.mi  !== '' && row.dataset.mi  != null ? parseInt(row.dataset.mi)  : null;
  const ri   = row.dataset.ri  !== '' && row.dataset.ri  != null ? parseInt(row.dataset.ri)  : null;
  const leg  = row.dataset.leg !== '' && row.dataset.leg != null ? parseInt(row.dataset.leg) : null;
  _calSaveSlot(pid, sid, ta, tb, la, lb, mi, ri, leg, date, time, rkey);
}

async function calClearSchedule(matchId, phaseId, slotId){
  if(matchId!=null && matchId!=='null'){
    const m = await dbGet('matches', parseInt(matchId));
    if(m) await dbPut('matches', {...m, scheduledDate:null, scheduledTime:null});
  } else if(slotId && phaseId!=null){
    const pid = parseInt(phaseId);
    const existing = await dbGetAll('matches', m=>m.slotId===slotId && m.phaseId===pid);
    for(const m of existing){
      if(m.goalsA==null && m.goalsB==null){
        await dbDelete('matches', m.id);
      } else {
        await dbPut('matches', {...m, scheduledDate:null, scheduledTime:null});
      }
    }
  }
  showToast('Programación eliminada');
  await renderAdmCalendar();
}

/* ================================================================
   VISTA ADMIN — renderAdmCalendar
   ================================================================ */
async function renderAdmCalendar(){
  const el = document.getElementById('adm-calendar-content');
  if(!el) return;
  el.innerHTML = '<div class="cal-loading">Cargando...</div>';

  const [allMatches, teams, allPhases, comps] = await Promise.all([
    getForSeason('matches'),
    getForSeason('teams'),
    getForSeason('phases'),
    getForSeason('competitions'),
  ]);

  const teamById  = Object.fromEntries(teams.map(t=>[t.id, t]));
  const compById  = Object.fromEntries(comps.map(c=>[c.id, c]));

  /* agrupar matches por phaseId para búsqueda rápida */
  const byPhase = {};
  for(const m of allMatches){
    if(!byPhase[m.phaseId]) byPhase[m.phaseId] = [];
    byPhase[m.phaseId].push(m);
  }

  /* ── Construir lista unificada de "entradas pendientes" ─────── */
  const entries = [];

  for(const phase of allPhases){
    const comp   = compById[phase.compId];
    const phasMs = byPhase[phase.id] || [];

    /* ── GRUPOS ─────────────────────────────────────── */
    if(phase.type === 'groups'){
      for(const m of phasMs){
        if(m.goalsA!=null || !m.teamA || !m.teamB) continue;
        entries.push({
          phase, comp,
          matchId: m.id,
          teamA:   teamById[m.teamA] || null,
          teamB:   teamById[m.teamB] || null,
          labelA:  teamById[m.teamA]?.name || String(m.teamA),
          labelB:  teamById[m.teamB]?.name || String(m.teamB),
          scheduledDate: m.scheduledDate||null,
          scheduledTime: m.scheduledTime||null,
        });
      }
      continue;
    }

    /* ── BRACKET / PLAYOFF / SINGLE ────────────────────
       Todos usan slotRefs para definir cruces. El matchupCount
       se deriva del slotIdx máximo en slotRefs (no de config.matchups
       que puede no existir). Para dos vueltas se muestran leg1 y leg2
       de forma independiente según cuál esté sin resultado.
       ─────────────────────────────────────────────────── */
    if(phase.type==='bracket' || phase.type==='playoff' || phase.type==='single'){
      const refs      = phase.slotRefs || [];
      const isBracket = phase.type==='bracket';

      /* resolver un slotRef a {id, label} */
      const resolveRef = (ref)=>{
        if(!ref) return {id:null, label:'Por definir'};
        if(ref.type==='team'){
          const id = parseInt(ref.teamId);
          return {id, label: teamById[id]?.name || '?'};
        }
        if(ref.type==='ref'){
          const g = String.fromCharCode(65+parseInt(ref.groupIdx));
          return {id:null, label:`Pos ${ref.place} G${g}`};
        }
        if(ref.type==='playoff_winner') return {id:null, label:`Gan. Llave ${(ref.matchIdx||0)+1}`};
        return {id:null, label:'Por definir'};
      };

      /* dos vueltas: bracket con legs=double, playoff/single con legs="2" */
      const twoLeg = isBracket
        ? phase.config?.legs === 'double'
        : String(phase.config?.legs) === '2';

      /* agrupar refs por slotIdx */
      const refBySlot = {};
      for(const ref of refs){
        if(!refBySlot[ref.slotIdx]) refBySlot[ref.slotIdx] = {};
        refBySlot[ref.slotIdx][ref.side] = ref;
      }

      /* si hay playoffSlots con equipos asignados manualmente, usarlos como fuente alternativa */
      const manualSlots = (phase.playoffSlots||[]).filter(s=>s?.teamA!=null||s?.teamB!=null);

      /* número de cruces = max slotIdx de refs, o largo de playoffSlots si no hay refs */
      let matchupCount;
      if(refs.length){
        matchupCount = refs.reduce((mx,r)=>Math.max(mx,r.slotIdx),-1)+1;
      } else if(manualSlots.length){
        matchupCount = (phase.playoffSlots||[]).length;
      } else {
        continue;
      }

      for(let mi=0; mi<matchupCount; mi++){
        /* resolver equipo A y B */
        let taId=null, tbId=null, labelA='Por definir', labelB='Por definir';
        const curRefs = refBySlot[mi];
        if(curRefs){
          const rA = resolveRef(curRefs.A);
          const rB = resolveRef(curRefs.B);
          taId   = rA.id; tbId   = rB.id;
          labelA = teamById[taId]?.name || rA.label;
          labelB = teamById[tbId]?.name || rB.label;
        } else if(manualSlots[mi]){
          const s = manualSlots[mi];
          taId   = s.teamA ? parseInt(s.teamA) : null;
          tbId   = s.teamB ? parseInt(s.teamB) : null;
          labelA = teamById[taId]?.name || s.labelA || 'Por definir';
          labelB = teamById[tbId]?.name || s.labelB || 'Por definir';
        } else {
          continue;
        }

        const baseEntry = {
          phase, comp,
          matchId: null,
          slotPhaseId:  phase.id,
          slotTeamAId:  taId,
          slotTeamBId:  tbId,
          slotMatchIdx: mi,
          slotRoundIdx: isBracket ? 0 : null,
          teamA:   teamById[taId]||null,
          teamB:   teamById[tbId]||null,
          labelA,
          labelB,
        };

        if(!twoLeg){
          /* vuelta única */
          const slotId = `${phase.id}_r0_m${mi}`;
          const doc    = phasMs.find(m=>m.slotId===slotId);
          if(doc && doc.goalsA!=null) continue;
          entries.push({...baseEntry, slotId, slotLeg:null,
            scheduledDate: doc?.scheduledDate||null, scheduledTime: doc?.scheduledTime||null});
        } else {
          /* dos vueltas: mostrar el leg pendiente */
          const sid1 = isBracket ? `${phase.id}_r0_m${mi}_leg1` : `${phase.id}_m${mi}_leg1`;
          const sid2 = isBracket ? `${phase.id}_r0_m${mi}_leg2` : `${phase.id}_m${mi}_leg2`;
          const leg1 = phasMs.find(m=>m.slotId===sid1);
          const leg2 = phasMs.find(m=>m.slotId===sid2);
          const leg1Done = leg1 && leg1.goalsA!=null;
          const leg2Done = leg2 && leg2.goalsA!=null;
          if(!leg1Done){
            entries.push({...baseEntry, slotId:sid1, slotLeg:1,
              scheduledDate: leg1?.scheduledDate||null, scheduledTime: leg1?.scheduledTime||null});
          } else if(!leg2Done){
            entries.push({...baseEntry, slotId:sid2, slotLeg:2,
              scheduledDate: leg2?.scheduledDate||null, scheduledTime: leg2?.scheduledTime||null});
          }
          /* si ambos jugados → no aparece */
        }
      }
      continue;
    }
  }

  if(!entries.length){
    el.innerHTML = `<div class="cal-empty">
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <p>No hay partidos pendientes de programar</p>
    </div>`;
    return;
  }

  /* split: programados / sin programar */
  const scheduled   = entries.filter(e=>  e.scheduledDate).sort((a,b)=>{
    const ka=a.scheduledDate+(a.scheduledTime||'00:00');
    const kb=b.scheduledDate+(b.scheduledTime||'00:00');
    return ka<kb?-1:1;
  });
  const unscheduled = entries.filter(e=> !e.scheduledDate);

  const byDate={};
  for(const e of scheduled){
    if(!byDate[e.scheduledDate]) byDate[e.scheduledDate]=[];
    byDate[e.scheduledDate].push(e);
  }

  /* ── row HTML ───────────────────────────────────────────── */
  const rowHtml = (e)=>{
    const col      = e.comp?.color||'var(--gold)';
    const compN    = e.comp?.name||'';
    const phN      = e.phase?.name||'';
    const badge    = [compN,phN].filter(Boolean).join(' · ');
    const hasSched = !!e.scheduledDate;

    /* data-* attributes para _calOnChange */
    const rkey = e.matchId ? String(e.matchId) : String(e.slotId);
    let dataAttrs = `data-rkey="${_esc(rkey)}"`;
    if(e.matchId){
      dataAttrs += ` data-mid="${e.matchId}"`;
    } else {
      dataAttrs += ` data-sid="${_esc(e.slotId)}"`;
      dataAttrs += ` data-pid="${e.slotPhaseId}"`;
      dataAttrs += ` data-ta="${e.slotTeamAId!=null?e.slotTeamAId:''}"`;
      dataAttrs += ` data-tb="${e.slotTeamBId!=null?e.slotTeamBId:''}"`;
      dataAttrs += ` data-la="${_esc(e.labelA)}"`;
      dataAttrs += ` data-lb="${_esc(e.labelB)}"`;
      dataAttrs += ` data-mi="${e.slotMatchIdx!=null?e.slotMatchIdx:''}"`;
      dataAttrs += ` data-ri="${e.slotRoundIdx!=null?e.slotRoundIdx:''}"`;
      dataAttrs += ` data-leg="${e.slotLeg!=null?e.slotLeg:''}"`;
    }

    /* clear call */
    const clearCall = e.matchId
      ? `calClearSchedule('${e.matchId}',null,null)`
      : `calClearSchedule(null,'${e.slotPhaseId}','${_esc(e.slotId)}')`;

    return `
    <div class="cal-adm-row${hasSched?' cal-adm-row--sched':''}" ${dataAttrs}>
      <div class="cal-adm-teams">
        ${_calLogo(e.teamA, 28, e.labelA)}
        <span class="cal-adm-tname">${_esc(e.labelA)}</span>
        <span class="cal-adm-vs">vs</span>
        <span class="cal-adm-tname">${_esc(e.labelB)}</span>
        ${_calLogo(e.teamB, 28, e.labelB)}
      </div>
      <div class="cal-adm-controls">
        <span class="cal-adm-phase" style="color:${col};border-color:${col};">${_esc(badge)}</span>
        <input type="date" class="cal-inp cal-inp-date" value="${e.scheduledDate||''}"
          title="Fecha" onchange="_calOnChange(this)">
        <input type="time" class="cal-inp cal-inp-time" value="${e.scheduledTime||''}"
          title="Hora" onchange="_calOnChange(this)">
        ${hasSched?`<button class="btn btn-xs cal-adm-clear" onclick="${clearCall}" title="Quitar fecha">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>`:''}
      </div>
    </div>`;
  };

  const sectionHdr=(label,icon,count,muted)=>`
    <div class="cal-adm-hdr${muted?' cal-adm-hdr--muted':''}">
      ${icon}
      <span>${label}</span>
      <span class="cal-adm-hdr-count">${count} partido${count!==1?'s':''}</span>
    </div>`;

  const icoCalendar=`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
  const icoInfo    =`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  let html='';
  for(const [dateStr,ms] of Object.entries(byDate)){
    html+=`<section class="cal-adm-section">
      ${sectionHdr(_calFormatDay(dateStr),icoCalendar,ms.length,false)}
      ${ms.map(rowHtml).join('')}
    </section>`;
  }
  if(unscheduled.length){
    html+=`<section class="cal-adm-section cal-adm-section--unsched">
      ${sectionHdr('Sin programar',icoInfo,unscheduled.length,true)}
      ${unscheduled.map(rowHtml).join('')}
    </section>`;
  }

  el.innerHTML=html;
}

/* ================================================================
   VISTA PÚBLICA — renderPubCalendar
   ================================================================ */
async function renderPubCalendar(){
  const el = document.getElementById('pub-calendar-content');
  if(!el) return;
  el.innerHTML = '<div class="cal-loading">Cargando...</div>';

  const [allMatches, teams, allPhases, comps] = await Promise.all([
    getForSeason('matches'),
    getForSeason('teams'),
    getForSeason('phases'),
    getForSeason('competitions'),
  ]);

  const teamById  = Object.fromEntries(teams.map(t=>[t.id, t]));
  const phaseById = Object.fromEntries(allPhases.map(p=>[p.id, p]));
  const compById  = Object.fromEntries(comps.map(c=>[c.id, c]));
  const today     = _calTodayStr();

  /* incluir partidos de CUALQUIER tipo que tengan scheduledDate y sin resultado */
  const upcoming = allMatches
    .filter(m=> m.scheduledDate && m.scheduledDate>=today && m.goalsA==null)
    .sort((a,b)=>{
      const ka=a.scheduledDate+(a.scheduledTime||'00:00');
      const kb=b.scheduledDate+(b.scheduledTime||'00:00');
      return ka<kb?-1:1;
    });

  if(!upcoming.length){
    el.innerHTML=`
    <div class="cal-pub-empty">
      <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <div class="cal-pub-empty-title">Sin partidos programados</div>
      <div class="cal-pub-empty-sub">Los próximos partidos aparecerán aquí en cuanto el admin los programe</div>
    </div>`;
    return;
  }

  const byDate={};
  for(const m of upcoming){
    if(!byDate[m.scheduledDate]) byDate[m.scheduledDate]=[];
    byDate[m.scheduledDate].push(m);
  }

  const cardHtml=(m)=>{
    const ta    = teamById[m.teamA]||null;
    const tb    = teamById[m.teamB]||null;
    const phase = phaseById[m.phaseId];
    const comp  = phase ? compById[phase.compId] : null;

    /* nombres: team object > labelA/B del doc > fallback */
    const taN   = ta?.name || m.labelA || 'Por definir';
    const tbN   = tb?.name || m.labelB || 'Por definir';
    const compN = comp?.name||'';
    const phN   = phase?.name||'';
    const col   = comp?.color||'var(--gold)';
    const time  = m.scheduledTime ? m.scheduledTime.substring(0,5) : null;
    const label = [compN,phN].filter(Boolean).join(' · ');

    return `
    <div class="cal-pub-card" style="--cc:${col};">
      <div class="cal-pub-card-head">
        <span class="cal-pub-comp" style="color:${col};">${_esc(label)}</span>
        ${time
          ?`<span class="cal-pub-time"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${_esc(time)}</span>`
          :`<span class="cal-pub-time cal-pub-time--tbd">Hora por definir</span>`
        }
      </div>
      <div class="cal-pub-matchup">
        <div class="cal-pub-team">
          ${_calLogo(ta, 44, taN)}
          <span class="cal-pub-tname">${_esc(taN)}</span>
        </div>
        <span class="cal-pub-vs">VS</span>
        <div class="cal-pub-team cal-pub-team--r">
          <span class="cal-pub-tname">${_esc(tbN)}</span>
          ${_calLogo(tb, 44, tbN)}
        </div>
      </div>
    </div>`;
  };

  const total=upcoming.length;
  let html=`<div class="cal-pub-summary">${total} partido${total!==1?'s':''} próximo${total!==1?'s':''}</div>`;

  for(const [dateStr,ms] of Object.entries(byDate)){
    const isToday=dateStr===today;
    html+=`
    <div class="cal-pub-day">
      <div class="cal-pub-day-hdr${isToday?' cal-pub-day-hdr--today':''}">
        <div class="cal-pub-day-pill">
          ${isToday?'<span class="cal-pub-dot"></span>':''}
          <span class="cal-pub-day-name">${_calFormatDay(dateStr)}</span>
        </div>
        <span class="cal-pub-day-cnt">${ms.length} partido${ms.length!==1?'s':''}</span>
      </div>
      <div class="cal-pub-cards">
        ${ms.map(cardHtml).join('')}
      </div>
    </div>`;
  }

  el.innerHTML=html;
}
