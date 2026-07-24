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
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ── Zona horaria de los partidos ─────────────────────────────
   scheduledDate/scheduledTime se guardan en hora de Lima (Luis teclea su
   propia hora ahí — el input y el guardado NO cambian, esto es solo
   visualización). Lima no tiene horario de verano: offset fijo, así que
   construir el instante con ese offset explícito da el instante absoluto
   real sin ambigüedad, sin importar la zona del que mira. Todo lo que se
   MUESTRA (hora, fecha del encabezado, pasado/hoy/futuro, countdown) se
   deriva de ese instante y se convierte con la zona CON NOMBRE del que
   mira (_pfViewerTimezone/formatInUserTZ, profile.js) — nunca con un
   offset fijo del lado del viewer, para que Intl maneje solo el DST de
   zonas que sí lo tienen (Chile, etc.). */
const _CAL_LIMA_OFFSET = '-05:00'; // Lima/UTC-5, sin DST

function _calMatchInstant(m){
  if(!m?.scheduledDate) return null;
  const inst = new Date(`${m.scheduledDate}T${(m.scheduledTime||'00:00')}:00${_CAL_LIMA_OFFSET}`);
  return isNaN(inst.getTime()) ? null : inst;
}

/* Hora de un partido en la zona del que mira. Degrada a la hora de Lima
   cruda solo si no hay instante real que convertir, o si formatInUserTZ no
   está disponible (no debería pasar: profile.js carga antes que
   calendar.js, script 586 vs 608 en index.html). */
function _calMatchTimeLocal(m){
  const inst = _calMatchInstant(m);
  if(inst && typeof formatInUserTZ === 'function'){
    return formatInUserTZ(inst, { hour:'2-digit', minute:'2-digit', hour12:false });
  }
  return m?.scheduledTime ? m.scheduledTime.substring(0,5) : null;
}

/* YYYY-MM-DD local del que mira para un instante — misma resolución de tz
   que formatInUserTZ (_pfViewerTimezone, profile.js), formateada en-CA
   para el orden año-mes-día que ya usa el resto del calendario. */
function _calLocalDateStr(inst){
  if(!inst) return null;
  const tz = typeof _pfViewerTimezone === 'function' ? _pfViewerTimezone() : undefined;
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit' }).format(inst);
}

/* Fecha LOCAL DEL VIEWER de una jornada completa (`dateStr` = fecha de
   Lima, clave de byDateAll — la jornada NO se reagrupa, sigue entera bajo
   un solo encabezado): sale del instante del PRIMER partido del día (`ms`
   ya viene ordenado por scheduledTime). Un día sin partidos con hora real
   (solo label, ej. "Libre") no tiene instante que convertir — se muestra
   la fecha de Lima tal cual. */
function _calJornadaViewerDate(dateStr, ms){
  const first = ms && ms[0];
  const inst = first ? _calMatchInstant(first) : null;
  return _calLocalDateStr(inst) || dateStr;
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
   TOOLBAR ADMIN — "Notificar stream de hoy"
   ================================================================ */

/* Callable de Cloud Functions (Fase 8, backend FCM) — región no-default,
   por eso firebase.app().functions(region) en vez de firebase.functions().
   Es TASKS_REGION (no la región del Firestore del proyecto): la callable
   encola una Cloud Task, y Cloud Tasks no está disponible en la región
   donde vive el Firestore. Ver functions/lib/config.js para el detalle. */
function _notifyStreamTodayCallable(){
  return firebase.app().functions('southamerica-east1').httpsCallable('notifyStreamToday');
}

async function notifyStreamTodayClick(){
  const btn = document.getElementById('btn-notify-stream-today');
  const run = async ()=>{
    if(btn){ btn.disabled = true; }
    try {
      const date = _calTodayStr();
      const res  = await _notifyStreamTodayCallable()({ date, season: STATE.season });
      const d = res.data || {};
      if(!d.matchesToday){
        showToast('No hay partidos programados hoy');
      } else {
        const parts = [`${d.notifiedUsers||0} presidente(s) notificados`];
        if(d.skippedDedup)          parts.push(`${d.skippedDedup} ya avisados`);
        if(d.invalidTokensRemoved)  parts.push(`${d.invalidTokensRemoved} token(s) vencidos limpiados`);
        showToast(parts.join(' · '));
      }
    } catch(e){
      console.error('[notifyStreamToday]', e);
      showToast(e?.message || 'No se pudo enviar la notificación', 'error');
    } finally {
      if(btn){ btn.disabled = false; }
    }
  };
  if(typeof showConfirm==='function'){
    showConfirm(
      '¿Notificar stream de hoy?',
      'Se enviará un aviso push a todos los presidentes que juegan hoy. Esta acción no se puede deshacer.',
      run
    );
  } else {
    await run();
  }
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

  /* ── Pre-calcular standings de grupos ───────────────────────── */
  const groupStandings = {}; // {phaseId: {groupIdx: [{id,...}]}}
  for(const ph of allPhases){
    if(ph.type !== 'groups') continue;
    groupStandings[ph.id] = {};
    const phMs = byPhase[ph.id] || [];
    for(const [gi, teamIds] of Object.entries(ph.groups || {})){
      const gIdx = parseInt(gi);
      const groupMs = phMs.filter(m => m.groupIdx === gIdx);
      const validIds = (teamIds || []).filter(v => v != null);
      if(validIds.length){
        groupStandings[ph.id][gIdx] = calcGroupStandings(validIds, groupMs, ['pts','dg','gf'], groupMs);
      }
    }
  }

  /* ── Pre-calcular ganadores de playoffs ya jugados ──────────── */
  const playoffWinnersByPhase = {}; // {phaseId: [winnerId|null]}
  for(const ph of allPhases){
    if(ph.type !== 'playoff') continue;
    try {
      const winners = await getPlayoffWinnersFromPhase(ph.id);
      playoffWinnersByPhase[ph.id] = winners || [];
    } catch(e){ playoffWinnersByPhase[ph.id] = []; }
  }

  /* ── Resolver un slotRef a {id, label} ──────────────────────── */
  const resolveRef = (ref) => {
    if(!ref) return {id:null, label:'Por definir'};
    if(ref.type === 'team'){
      const id = parseInt(ref.teamId);
      return {id, label: teamById[id]?.name || '?'};
    }
    if(ref.type === 'ref'){
      const g = String.fromCharCode(65 + parseInt(ref.groupIdx));
      const defaultLabel = `Pos ${ref.place} G${g}`;
      const standings = groupStandings[ref.phaseId]?.[ref.groupIdx];
      if(standings && standings.length >= ref.place){
        const team = standings[ref.place - 1];
        if(team) return {id: team.id, label: teamById[team.id]?.name || defaultLabel};
      }
      return {id:null, label: defaultLabel};
    }
    if(ref.type === 'playoff_winner'){
      const defaultLabel = `Gan. Llave ${(ref.matchIdx||0)+1}`;
      const winners = playoffWinnersByPhase[ref.phaseId];
      const wId = winners?.[ref.matchIdx];
      if(wId != null) return {id: wId, label: teamById[wId]?.name || defaultLabel};
      return {id:null, label: defaultLabel};
    }
    return {id:null, label:'Por definir'};
  };

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
          }
          if(!leg2Done){
            entries.push({...baseEntry, slotId:sid2, slotLeg:2,
              scheduledDate: leg2?.scheduledDate||null, scheduledTime: leg2?.scheduledTime||null});
          }
          /* si ambos jugados → no aparece ninguno */
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

    /* vuelta: el equipo B juega en casa → invertir orden visual */
    const isVueltaRow = e.slotLeg === 2;
    const [dA_id,dA_lbl,dB_id,dB_lbl] = isVueltaRow
      ? [e.teamB,e.labelB,e.teamA,e.labelA]
      : [e.teamA,e.labelA,e.teamB,e.labelB];
    return `
    <div class="cal-adm-row${hasSched?' cal-adm-row--sched':''}" ${dataAttrs}>
      <div class="cal-adm-teams">
        ${_calLogo(dA_id, 28, dA_lbl)}
        <span class="cal-adm-tname">${_esc(dA_lbl)}</span>
        <span class="cal-adm-vs">vs</span>
        <span class="cal-adm-tname">${_esc(dB_lbl)}</span>
        ${_calLogo(dB_id, 28, dB_lbl)}
      </div>
      <div class="cal-adm-controls">
        ${e.slotLeg===1?'<span class="cal-adm-leg cal-adm-leg--ida">IDA</span>':e.slotLeg===2?'<span class="cal-adm-leg cal-adm-leg--vuelta">VUELTA</span>':''}
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
   CRONOGRAMA ADMIN — labels de días
   ================================================================ */

/* Guarda (debounced) texto Y tipo de un día — lee ambos desde el DOM.
   El debounce por sí solo NO alcanza: solo cancela un setTimeout pendiente,
   no un guardado que ya está en vuelo (dbGetAll+dbAdd/dbPut viajando a
   Firestore). Dos ediciones separadas por >400ms pero cercanas entre sí
   podían ambas ver "no existe" y ambas crear un doc → duplicados para el
   mismo día. _calLblInFlight encadena los guardados de una misma fecha:
   el N+1 espera a que el N haya terminado antes de preguntar "¿existe?". */
const _calLblTimer = {};
const _calLblInFlight = {};
function _calSaveDayLabel(dateStr){
  clearTimeout(_calLblTimer[dateStr]);
  _calLblTimer[dateStr] = setTimeout(()=>{
    const prev = _calLblInFlight[dateStr] || Promise.resolve();
    _calLblInFlight[dateStr] = prev.then(()=>_calDoSaveDayLabel(dateStr)).catch(()=>{});
  }, 400);
}

async function _calDoSaveDayLabel(dateStr){
  try {
    const inp  = document.querySelector(`.cal-lbl-inp[data-date="${CSS.escape(dateStr)}"]`);
    const sel  = document.querySelector(`.cal-lbl-type[data-date="${CSS.escape(dateStr)}"]`);
    const text = inp ? (inp.value || '') : '';
    const type = sel ? (sel.value || '') : '';
    const existing = await dbGetAll('calDayLabels', r => r.season === STATE.season && r.date === dateStr);
    const payload = { season: STATE.season, date: dateStr, text, type };
    if(existing.length){
      /* Auto-reparación: si quedaron duplicados de una carrera vieja, esta
         edición los consolida — el primero se actualiza con el valor actual
         del DOM (da igual cuál sea "el primero", Firestore no garantiza
         orden) y el resto se borra por id. */
      await dbPut('calDayLabels', {...existing[0], ...payload});
      for(const dup of existing.slice(1)) await dbDelete('calDayLabels', dup.id);
    } else if(text.trim() || type){
      await dbAdd('calDayLabels', payload);
    }
    /* feedback visual en el input */
    if(inp){ inp.classList.add('cal-lbl-inp--saved'); setTimeout(()=>inp.classList.remove('cal-lbl-inp--saved'), 900); }
  } catch(e){
    console.warn('[calDayLabels] Error al guardar:', e.code || e.message);
    showToast('Error al guardar. Verifica permisos de Firestore.');
  }
}

/* Offset de mes mostrado en el cronograma admin (0 = mes actual) */
let _calLblMonthOffset = 0;

/* Cambia de mes en el cronograma admin (delta = -1 / +1) */
function calLblNavMonth(delta){
  _calLblMonthOffset += delta;
  renderAdmCalendarLabels();
}

/* Renderiza el cronograma: UN mes a la vez, con flechas ‹ › */
async function renderAdmCalendarLabels(){
  const el = document.getElementById('adm-calendar-labels');
  if(!el) return;

  const labels = await dbGetAll('calDayLabels', r => r.season === STATE.season).catch(()=>[]);
  const labelByDate = Object.fromEntries(labels.map(l => [l.date, {text: l.text||'', type: l.type||''}]));

  const today = _calTodayStr();
  const [cy, cm] = today.split('-').map(Number);

  /* mes a mostrar según el offset (Date normaliza el cruce de año) */
  const shown = new Date(cy, (cm - 1) + _calLblMonthOffset, 1);
  const year  = shown.getFullYear();
  const month = shown.getMonth() + 1; /* 1-12 */

  const daysInMonth = new Date(year, month, 0).getDate();
  const rows = [];
  for(let d = 1; d <= daysInMonth; d++){
    const dateStr  = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isPast   = dateStr < today;
    const isToday  = dateStr === today;
    const cls      = isPast ? 'past' : isToday ? 'today' : 'future';
    const dayAbbr  = _CAL_DIAS[new Date(year, month - 1, d).getDay()].substring(0, 3);
    const shortDate= `${d} ${_CAL_MESES[month-1].substring(0,3)}`;
    const val      = labelByDate[dateStr] || {text:'', type:''};
    const selOpts  = [
      ['', 'Partidos'],
      ['libre', 'Libre'],
      ['sorteo', 'Sorteo'],
    ].map(([v,l])=>`<option value="${v}" ${val.type===v?'selected':''}>${l}</option>`).join('');
    rows.push(`
    <div class="cal-lbl-day cal-lbl-day--${cls}">
      <span class="cal-lbl-dot"></span>
      <span class="cal-lbl-date" title="${_esc(dayAbbr)}">${_esc(shortDate)}</span>
      <select class="cal-lbl-type" data-date="${_esc(dateStr)}" onchange="_calSaveDayLabel(this.dataset.date)">${selOpts}</select>
      <input class="cal-lbl-inp" type="text" maxlength="64"
        placeholder="Etiqueta del día..."
        data-date="${_esc(dateStr)}"
        value="${_esc(val.text)}"
        oninput="_calSaveDayLabel(this.dataset.date)">
    </div>`);
  }

  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const monthName = cap(_CAL_MESES[month - 1]);

  el.innerHTML = `
  <div class="cal-lbl-section">
    <div class="cal-lbl-hdr">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      Cronograma
    </div>
    <div class="cal-lbl-nav">
      <button class="cal-lbl-arrow" type="button" onclick="calLblNavMonth(-1)" aria-label="Mes anterior">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="cal-lbl-nav-title">${_esc(monthName)} ${year}</span>
      <button class="cal-lbl-arrow" type="button" onclick="calLblNavMonth(1)" aria-label="Mes siguiente">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
    <div class="cal-lbl-track">
      ${rows.join('')}
    </div>
  </div>`;
}

/* ================================================================
   VISTA PÚBLICA — renderPubCalendar
   ================================================================ */

/* Hero broadcast del calendario: si hay un partido EN VIVO ese es el foco
   (marcador grande, pulso rojo); si no, el PRÓXIMO partido con cuenta atrás
   viva (MOTION.countdown). El timeline + lista quedan como soporte debajo.
   _calCountdownStop guarda el stop() del countdown anterior para limpiarlo en
   cada re-render (anti-leak en la suscripción en vivo). */
let _calCountdownStop = null;
let _calHeroCleanup = null;

/* Contexto del hero (para los CTA reales sin escapar nombres en onclick) */
let _calHeroCtx = null;

/* Ancla (vivo/hoy) calculada por el render más reciente de renderPubCalendar
   — leída por _calCenterAnchorScroll (llamada desde nav.js al ENFOCAR la
   sección, no en cada re-render) para centrar el scroll interno del .metro.
   null si no hay ancla, o si el render no llegó a montar un .metro (rama sin
   visibleDates). */
let _calAnchorDateStr = null;

/* Botón CTA del hero. El rótulo va en un <span class="hm-btn-label"> separado del
   icono: es lo único que escribe la máquina de escribir, así el SVG nunca se borra.
   El aria-label fija el nombre accesible aunque el rótulo se vacíe durante la animación. */
function _calCtaBtn(cls, label, icon){
  return `<button type="button" class="btn ${cls}" aria-label="${_esc(label)}">${icon||''}<span class="hm-btn-label">${_esc(label)}</span></button>`;
}

function _calHeroHtml(m, isLive, ctx){
  const { teamById, phaseById, compById } = ctx;
  const ta = teamById[m.teamA]||null, tb = teamById[m.teamB]||null;
  const phase = phaseById[m.phaseId];
  const comp  = phase ? compById[phase.compId] : null;
  const taN = ta?.name || m.labelA || 'Por definir';
  const tbN = tb?.name || m.labelB || 'Por definir';
  const label = [comp?.name||'', phase?.name||''].filter(Boolean).join(' · ');
  const time  = _calMatchTimeLocal(m);
  const heroInst = _calMatchInstant(m);
  const when  = m.scheduledDate ? `${_calFormatDay(_calLocalDateStr(heroInst) || m.scheduledDate)}${time?` · ${time}`:''}` : (time||'');
  const eyebrowChip = isLive
    ? `<span class="chip chip-live"><span class="chip-dot"></span><span class="hm-chip-label">En vivo</span></span>`
    : (label ? `<span class="chip"><span class="hm-chip-label">${_esc(label)}</span></span>` : '');

  // CTAs reales: H2H (si ambos equipos están definidos) + ir a la competición.
  const bothReal = !!(ta && tb);
  _calHeroCtx = { taN, tbN, compId: comp?.id ?? null, phaseId: phase?.id ?? null, bothReal };
  const ctaH2H = bothReal
    ? _calCtaBtn('btn-gold hm-cta-h2h', 'Ver enfrentamientos', '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M8 21H3v-5"/><path d="M3 21l7-7"/></svg>')
    : '';
  const ctaComp = comp?.id!=null
    ? _calCtaBtn('btn-ghost hm-cta-comp', 'Ver competición', '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>')
    : _calCtaBtn('btn-ghost hm-cta-cal', 'Calendario completo', '');

  return `
  <div class="hero hero-match hm-collapsible" style="margin-bottom:0;" data-reveal>
    <div class="hm-border"></div>
    <button type="button" class="hm-peek hm-toggle" aria-expanded="false" aria-label="${isLive?'Partido en vivo':'Próximo partido'}: ${_esc(taN)} contra ${_esc(tbN)}">
      <span class="hm-peek-lbl">${isLive ? 'En vivo' : 'Próximo partido'}</span>
      ${isLive
        ? `<span class="hm-count" style="color:var(--red);">${m.goalsA??0} — ${m.goalsB??0}</span>`
        : `<span class="hm-count" id="hm-countdown">—</span>`}
      <span class="hm-peek-hint">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        Ver enfrentamiento
      </span>
    </button>
    <div class="hm-expand">
      <div class="hm-top">${eyebrowChip}</div>
      <div class="hm-face">
        <div class="hm-side home">
          ${_calLogo(ta, 64, taN)}
          <span class="hm-name">${_esc(taN)}</span>
        </div>
        <div class="hm-mid">
          ${isLive
            ? `<div class="hm-count" style="font-size:3rem;color:var(--red);">${m.goalsA??0}—${m.goalsB??0}</div>`
            : when ? `<div class="hm-when">${_esc(when)}</div>` : ''}
        </div>
        <div class="hm-side away">
          <span class="hm-name">${_esc(tbN)}</span>
          ${_calLogo(tb, 64, tbN)}
        </div>
      </div>
      <div class="hm-cta">${ctaH2H}${ctaComp}</div>
    </div>
  </div>`;
}

/* Hero de temporada finalizada / pre-temporada (sin próximo ni en vivo). */
function _calOffseasonHero(){
  _calHeroCtx = null;
  return `
  <div class="hm-collapsible" data-reveal>
    <div class="hm-border"></div>
    <button type="button" class="hm-peek hm-toggle" aria-expanded="false" aria-label="Temporada sin partidos programados">
      <span class="hm-peek-lbl">Copa Suscriptores</span>
      <span class="hm-count" style="font-size:clamp(1.8rem,1rem+2.4vw,2.8rem);">Sin partidos</span>
      <span class="hm-peek-hint">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        Ver detalles
      </span>
    </button>
    <div class="hm-expand">
      <div class="hm-top"><span class="chip"><span class="hm-chip-label">Próximamente</span></span></div>
      <p style="color:var(--txt3);font-size:14px;text-align:center;max-width:420px;margin:4px auto 0;line-height:1.5;">La temporada no tiene partidos programados ahora mismo. En cuanto el administrador publique el calendario, el próximo partido aparecerá aquí con su cuenta atrás.</p>
      <div class="hm-cta">${_calCtaBtn('btn-ghost hm-cta-comp', 'Ver competiciones', '')}</div>
    </div>
  </div>`;
}

/* Cablea el toggle (click + teclado), CTAs y máquina de escribir del hero.
   `anchorDateStr` (opcional): fecha de Lima (data-cal-date) del ancla del
   metro (vivo/hoy) para centrar el scroll del CTA "ir al calendario" sobre
   ESE día en vez del tope del metro. `container` (opcional): el nodo
   ESTABLE que nunca se reemplaza (#pub-calendar-content) — hace falta
   porque el CTA resuelve su destino recién al hacer click, no al cablear:
   si `scope` fue un staging wrapper (actualización atómica, no el primer
   montaje), para ese momento ya quedó vacío — el commit atómico mueve sus
   hijos a `container` y lo deja sin nada que buscar. El resto de los CTAs
   (H2H, competición) no sufre esto porque resuelven su elemento UNA vez acá
   mismo, al cablear, antes de que exista ese vaciado. */
function _calWireHero(scope, anchorDateStr, container){
  _calHeroCleanup?.();
  _calHeroCleanup = null;
  const hero = scope.querySelector('.hm-collapsible');
  const toggleBtn = hero?.querySelector('.hm-toggle');
  if(!hero || !toggleBtn) return;
  const controller = new AbortController();
  const listen = { signal:controller.signal };
  const intervals = new Set();
  let observer = null;

  /* ── Máquina de escribir (portada del prototipo) ─────────────────────── */
  const _reduced = ()=> window.MOTION?.reduced() || matchMedia('(prefers-reduced-motion:reduce)').matches;
  let _run = 0;
  // Solo se escriben spans de texto puro (.hm-name, .hm-when, .hm-chip-label,
  // .hm-btn-label). Nunca el .chip ni el .btn directamente: contienen SVG / .chip-dot
  // que textContent destruiría.
  const seqGroups = ()=>[
    [...hero.querySelectorAll('.hm-expand .hm-name'), hero.querySelector('.hm-when')],
    [...hero.querySelectorAll('.hm-top .hm-chip-label'), ...hero.querySelectorAll('.hm-cta .hm-btn-label')],
  ].map(g=>g.filter(Boolean));
  const seqEls = ()=>seqGroups().flat();

  const _stash = el=>{ if(el && el.dataset.full===undefined) el.dataset.full=el.textContent.trim(); };
  const _reserve = el=>{
    _stash(el);
    el.textContent=el.dataset.full;
    const w=Math.ceil(el.getBoundingClientRect().width);
    if(w) el.style.minWidth=w+'px';
    el.textContent=''; el.style.opacity='0'; el.classList.remove('hm-typing');
  };
  const _clear = el=>{ _stash(el); el.textContent=''; el.style.opacity='0'; el.style.minWidth=''; el.classList.remove('hm-typing'); };
  const _fill  = el=>{ _stash(el); el.textContent=el.dataset.full; el.style.opacity=''; el.style.minWidth=''; el.classList.remove('hm-typing'); };

  const _type = (el, speed, token)=>new Promise(resolve=>{
    if(!el) return resolve();
    el.style.opacity='1'; el.classList.add('hm-typing');
    const full=el.dataset.full; let i=0;
    const id=setInterval(()=>{
      if(token!==_run){ clearInterval(id); intervals.delete(id); return resolve(); }
      el.textContent=full.slice(0,++i);
      if(i>=full.length){ clearInterval(id); intervals.delete(id); el.classList.remove('hm-typing'); resolve(); }
    }, speed);
    intervals.add(id);
  });

  async function typeIn(){
    const token=++_run, groups=seqGroups(), all=groups.flat();
    if(_reduced()){ all.forEach(_fill); return; }
    all.forEach(_reserve);
    for(const g of groups){
      if(token!==_run) return;
      await Promise.all(g.map(el=>_type(el,20,token)));
    }
  }
  function resetSeq(){ _run++; seqEls().forEach(_reduced()?_fill:_clear); }

  /* La etiqueta «Próximo partido» se escribe al entrar en viewport */
  const lbl=hero.querySelector('.hm-peek-lbl');
  if(lbl){
    if(!_reduced()) _clear(lbl);
    if('IntersectionObserver' in window){
      observer = new IntersectionObserver((ents,obs)=>{
        ents.forEach(e=>{ if(e.isIntersecting){ _reduced()?_fill(lbl):(_reserve(lbl),_type(lbl,32,_run)); obs.unobserve(e.target); }});
      },{threshold:0.4});
      observer.observe(hero);
    } else {
      _fill(lbl);
    }
  }
  if(!_reduced()) seqEls().forEach(_clear);

  /* ── Toggle + typewriter ──────────────────────────────────────────────── */
  const toggle = ()=>{
    const open=hero.classList.toggle('open');
    toggleBtn.setAttribute('aria-expanded', String(open));
    open ? typeIn() : resetSeq();
  };
  toggleBtn.addEventListener('click', toggle, listen);
  hero.addEventListener('mouseenter', typeIn, listen);
  hero.addEventListener('mouseleave', resetSeq, listen);
  hero.addEventListener('focusin',  typeIn, listen);
  hero.addEventListener('focusout', e=>{ if(!hero.contains(e.relatedTarget)) resetSeq(); }, listen);

  /* ── CTAs ─────────────────────────────────────────────────────────────── */
  const h2h = scope.querySelector('.hm-cta-h2h');
  if(h2h) h2h.addEventListener('click', (e)=>{ e.stopPropagation(); _calHeroGoH2H(); }, listen);
  const comp = scope.querySelector('.hm-cta-comp');
  if(comp) comp.addEventListener('click', (e)=>{ e.stopPropagation(); _calHeroGoComp(); }, listen);
  const cal = scope.querySelector('.hm-cta-cal');
  if(cal) cal.addEventListener('click', (e)=>{ e.stopPropagation();
    // root = container si está disponible (siempre resuelve sobre el nodo
    // vivo actual), scope como respaldo (primer montaje: son el mismo nodo).
    const root = container || scope;
    // Centrar el ancla (vivo/hoy) si existe; si no, comportamiento de
    // siempre (tope del metro).
    const anchorEl = anchorDateStr ? root.querySelector(`[data-cal-date="${anchorDateStr}"]`) : null;
    const target = anchorEl || root.querySelector('.metro');
    target?.scrollIntoView({behavior:_reduced()?'auto':'smooth', block: anchorEl ? 'center' : 'start'}); }, listen);

  /* ── Proximidad del radar en vivo ─────────────────────────────────────────
     Si el hero está en vivo, el cursor sobre la tarjeta acerca el sonido (limpio
     y más alto); al salir vuelve a lejano+eco. Por defecto: lejano. */
  if(hero.querySelector('.chip-live') && typeof liveRadarProximity === 'function'){
    liveRadarProximity(false);
    hero.addEventListener('mouseenter', ()=>liveRadarProximity(true), listen);
    hero.addEventListener('mouseleave', ()=>liveRadarProximity(false), listen);
    hero.addEventListener('focusin',  ()=>liveRadarProximity(true), listen);
    hero.addEventListener('focusout', e=>{ if(!hero.contains(e.relatedTarget)) liveRadarProximity(false); }, listen);
  }
  _calHeroCleanup = ()=>{
    _run++;
    observer?.disconnect();
    intervals.forEach(clearInterval);
    intervals.clear();
    controller.abort();
    if(typeof liveRadarProximity==='function') liveRadarProximity(false);
    _calHeroCleanup = null;
  };
}

/* Centra el ancla (vivo/hoy) DENTRO del scroll interno del .metro
   (max-height:520px; overflow-y:auto — redesign.css) — nunca el de la
   página: en el sitio público el scroll es continuo/de una sola pieza, así
   que scrollIntoView burbujearía hasta ahí y arrastraría toda la página a
   la sección. scrollTop calculado a mano en su lugar, robusto frente a
   offsetParent (el .metro puede estar dentro de un stack con position
   relative/absolute del staging atómico).

   Se llama UNA vez, al MOSTRAR la sección (focusPublicSection, nav.js — el
   mismo momento en que hoy arranca el radar en vivo), nunca en cada
   re-render con la sección YA enfocada: la suscripción en vivo
   (_subscribeFocusedPublicSection) puede refrescar el calendario por
   cambios ajenos al ancla (otro partido cambia de fecha, etc.) mientras el
   usuario navega el metro a mano — recentrar en cada uno de esos refrescos
   pelearía contra ese scroll manual. Lee `_calAnchorDateStr`, fijado por el
   render más reciente de renderPubCalendar. */
function _calCenterAnchorScroll(){
  if(!_calAnchorDateStr) return;
  const container = document.getElementById('pub-calendar-content');
  const scroller  = container?.querySelector('.metro');
  const aEl       = scroller?.querySelector(`[data-cal-date="${_calAnchorDateStr}"]`);
  if(!scroller || !aEl) return;
  const delta = aEl.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
  scroller.scrollTop = Math.max(0, scroller.scrollTop + delta - (scroller.clientHeight - aEl.clientHeight)/2);
}

/* CTA: ver enfrentamientos (H2H) en el Historial entre los dos equipos del hero. */
async function _calHeroGoH2H(){
  const ctx = _calHeroCtx;
  if(!ctx || !ctx.bothReal) return;
  if(typeof focusPublicSection==='function') await focusPublicSection('historial');
  if(typeof histH2HShow==='function') histH2HShow(ctx.taN, ctx.tbN);
}

/* CTA: ir a la competición Y fase del partido (top de la sección 02). */
async function _calHeroGoComp(){
  const ctx = _calHeroCtx;
  // Pre-fijar comp+fase para que el panel monte ya en la fase correcta del partido.
  if(ctx && ctx.compId!=null){
    window._pubState = window._pubState || {};
    window._pubState.compId  = ctx.compId;
    window._pubState.phaseId = ctx.phaseId ?? null;
    window._pubState.groupIdx = 0;
  }
  // Navegar con scroll al top de la sección 02 (fallback a focus si no hay scroll-shell).
  if(typeof scrollToPublicSection==='function') await scrollToPublicSection('panel');
  else if(typeof focusPublicSection==='function') await focusPublicSection('panel');
  // Re-render explícito para reflejar comp+fase (por si el panel ya estaba montado).
  if(ctx && ctx.compId!=null && typeof pubSelectComp==='function') await pubSelectComp(ctx.compId, ctx.phaseId);
}

/* Arranca la cuenta atrás del hero «próximo partido». Usa MOTION.countdown si
   está disponible; si no, degrada a hora/fecha estática (sin animación).
   `scope` acota la búsqueda al hero recién armado (staging o `el` directo):
   con el staging atómico puede haber momentáneamente DOS #hm-countdown en el
   documento (el viejo, todavía visible, y el nuevo, aún oculto) — un
   document.getElementById global tomaría el primero en el árbol (el viejo) y
   le engancharía el countdown que en realidad es para el nuevo. */
function _calInitHeroCountdown(m, scope){
  const cEl = (scope || document).querySelector('#hm-countdown');
  if(!cEl) return;
  if(!m.scheduledDate){ cEl.textContent = m.scheduledTime ? m.scheduledTime.substring(0,5) : '—'; return; }
  // Instante real (Lima, −05:00) — no un Date sin offset, que el navegador
  // interpretaría en SU propia zona (el bug original: la cuenta atrás no
  // se movía al cambiar de zona porque nunca miraba una zona real).
  const target = _calMatchInstant(m);
  if(window.MOTION && typeof MOTION.countdown==='function' && target && !isNaN(target.getTime())){
    _calCountdownStop = MOTION.countdown(cEl, target, { doneText:'¡En juego!' });
  } else {
    const localTime = _calMatchTimeLocal(m);
    cEl.textContent = localTime || _calFormatDay(_calLocalDateStr(target) || m.scheduledDate);
  }
}

async function renderPubCalendar(){
  const el = document.getElementById('pub-calendar-content');
  if(!el) return;
  // Mismo fix que renderPubPanel: estabilizar altura ANTES de tocar el DOM —
  // red de seguridad adicional al staging atómico de abajo (cubre el intervalo
  // entre el commit final y el rAF de asentado).
  const _prevCalHeight = el.offsetHeight;
  if(_prevCalHeight > 0) el.style.minHeight = _prevCalHeight + 'px';
  el.setAttribute('aria-busy', 'true');

  // Actualización atómica (igual que renderPubPanel): con contenido previo, todo
  // se arma en un staging invisible superpuesto EXACTAMENTE sobre el mismo
  // cuadro (position:absolute; inset:0; visibility:hidden — nunca display:none
  // ni fuera de pantalla, para que las mediciones de layout sigan siendo
  // reales) y se commitea de una sola vez al final. El hero anterior (con su
  // countdown y sus listeners) permanece intacto y respondiendo hasta ese
  // commit — NO se lo desconecta antes de tener el reemplazo listo. En el
  // primer montaje (sin contenido previo) se permite el placeholder "Cargando".
  const hasPrevContent = el.childElementCount > 0;
  let stagingWrap = null;
  let stage = el;
  if (hasPrevContent) {
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    stagingWrap = document.createElement('div');
    stagingWrap.style.cssText = 'position:absolute;inset:0;visibility:hidden;pointer-events:none;';
    el.appendChild(stagingWrap);
    stage = stagingWrap;
  }
  let stageReady = false;

  try {
  if(!hasPrevContent) stage.innerHTML = '<div class="cal-loading">Cargando...</div>';

  const [allMatches, teams, allPhases, comps, dayLabels] = await Promise.all([
    getForSeason('matches'),
    getForSeason('teams'),
    getForSeason('phases'),
    getForSeason('competitions'),
    dbGetAll('calDayLabels', r => r.season === STATE.season).catch(()=>[]),
  ]);

  const teamById   = Object.fromEntries(teams.map(t=>[t.id, t]));
  const phaseById  = Object.fromEntries(allPhases.map(p=>[p.id, p]));
  const compById   = Object.fromEntries(comps.map(c=>[c.id, c]));
  const labelByDate= Object.fromEntries(dayLabels.map(l=>[l.date, {text:l.text||'', type:l.type||''}]));
  const today      = _calTodayStr();

  /* Próximos (foco del hero): futuros sin resultado, ordenados por fecha/hora. */
  const upcoming = allMatches
    .filter(m=> m.scheduledDate && m.scheduledDate>=today && m.goalsA==null)
    .sort((a,b)=>{
      const ka=a.scheduledDate+(a.scheduledTime||'00:00');
      const kb=b.scheduledDate+(b.scheduledTime||'00:00');
      return ka<kb?-1:1;
    });

  /* TODOS los partidos con fecha (pasados y futuros) agrupados por día,
     ordenados por hora dentro de cada día. */
  const byDateAll = {};
  for(const m of allMatches){
    if(!m.scheduledDate) continue;
    (byDateAll[m.scheduledDate] = byDateAll[m.scheduledDate] || []).push(m);
  }
  Object.values(byDateAll).forEach(arr=>arr.sort((a,b)=>
    (a.scheduledTime||'00:00')<(b.scheduledTime||'00:00')?-1:1));

  /* ── Hero: partido EN VIVO (foco) o, en su defecto, el próximo ───────────── */
  if(_calCountdownStop){ try{ _calCountdownStop(); }catch(e){} _calCountdownStop=null; }
  const liveMatch = allMatches.find(m=>m.live && m.teamA && m.teamB);
  const heroMatch = liveMatch || upcoming[0] || null;
  const heroIsLive = !!liveMatch;
  const heroCtx = { teamById, phaseById, compById };
  // Off-season SIEMPRE que no haya próximo ni en vivo (aunque existan dayLabels históricos).
  const heroHtml = heroMatch ? _calHeroHtml(heroMatch, heroIsLive, heroCtx) : _calOffseasonHero();

  // El radar en vivo vive SOLO aquí (Calendario). El flag lo lee focusPublicSection
  // para arrancarlo al enfocar una sección ya montada. Solo suena si esta sección es
  // la enfocada (evita que el pre-montaje de secciones previas dispare sonido).
  window._calHeroLive = !!(heroMatch && heroIsLive);
  if(typeof liveRadarStart === 'function'){
    const focused = (typeof STATE === 'undefined') || STATE.publicPage === 'calendario';
    (window._calHeroLive && focused) ? liveRadarStart() : liveRadarStop();
  }

  /* Días con evento: partidos ∪ labels (texto/tipo), pasados y futuros. */
  const labelDatesAll = dayLabels
    .filter(l => (l.text && l.text.trim()) || l.type)
    .map(l => l.date);
  const allDatesFull = [...new Set([...Object.keys(byDateAll), ...labelDatesAll])].sort();

  /* Fecha LOCAL DEL VIEWER de cada jornada (clave = fecha de Lima, sin
     reagrupar — ver _calJornadaViewerDate). Se usa para clasificar
     pasado/hoy/futuro y para el encabezado del día (metroDay más abajo):
     antes ambos comparaban la fecha de Lima cruda contra el "hoy" del
     viewer, una comparación Lima-vs-viewer inconsistente. */
  const jornadaViewerDate = {};
  for(const d of allDatesFull) jornadaViewerDate[d] = _calJornadaViewerDate(d, byDateAll[d]);

  /* Visibles: normalmente el día pasado MÁS RECIENTE (en gris) + hoy + todos
     los futuros. A medida que pasan los días, los pasados se ocultan
     dejando solo el último, con la dinámica del metro (punto gris). */
  const pastDates   = allDatesFull.filter(d => jornadaViewerDate[d] < today);
  const futureDates = allDatesFull.filter(d => jornadaViewerDate[d] >= today);
  const mostRecentPast = pastDates.length ? pastDates[pastDates.length-1] : null;

  /* Ancla para centrar el metro (#5): el partido EN VIVO (si tiene fecha
     propia, o sea si aparece en byDateAll) > el día de HOY si tiene algo
     que mostrar (partidos o label) > ninguna — en ese caso, el
     comportamiento de siempre (arriba). */
  let anchorDateStr = null;
  if(liveMatch && liveMatch.scheduledDate && byDateAll[liveMatch.scheduledDate]){
    anchorDateStr = liveMatch.scheduledDate;
  } else {
    anchorDateStr = allDatesFull.find(d => jornadaViewerDate[d] === today) || null;
  }
  _calAnchorDateStr = anchorDateStr;

  const HORIZON_ROWS = 10; // filas de partido en el horizonte inicial (también el presupuesto para centrar el ancla)
  let visibleDates;
  if(anchorDateStr){
    // Ventana de días pasados alrededor del ancla (no solo el último pasado)
    // para que pueda quedar centrada: retrocede acumulando ~mitad del
    // presupuesto de filas, mismo patrón que el recorte del horizonte de
    // abajo. Desde ahí hasta el final de allDatesFull ya incluye el ancla
    // y todo lo futuro — funciona aunque el ancla (un vivo tardío) caiga
    // técnicamente del lado "pasado" de la clasificación.
    const anchorIdx = allDatesFull.indexOf(anchorDateStr);
    const HALF = Math.ceil(HORIZON_ROWS / 2);
    let pastRows = 0, pastStart = anchorIdx;
    for(let i = anchorIdx - 1; i >= 0; i--){
      const rows = byDateAll[allDatesFull[i]]?.length || 0;
      if(pastRows + rows > HALF && pastRows > 0) break;
      pastRows += rows;
      pastStart = i;
    }
    visibleDates = allDatesFull.slice(pastStart);
  } else {
    visibleDates = (mostRecentPast ? [mostRecentPast] : []).concat(futureDates);
  }

  if(!visibleDates.length){
    _calAnchorDateStr = null; // no hay .metro que montar en esta rama
    stage.innerHTML = heroMatch
      ? `${heroHtml}
        <div class="cal-pub-empty">
          <div class="cal-pub-empty-title">No hay más partidos programados</div>
          <div class="cal-pub-empty-sub">Los próximos partidos aparecerán aquí en cuanto el admin los programe</div>
        </div>`
      : heroHtml;
    stageReady = true;
    _calWireHero(stage, null, el);
    if(heroMatch && !heroIsLive) _calInitHeroCountdown(heroMatch, stage);
    return;
  }

  /* Una fila compacta de partido dentro del metro. Días pasados muestran el
     marcador; futuros, la hora. */
  const metroMatch = (m)=>{
    const ta = teamById[m.teamA]||null, tb = teamById[m.teamB]||null;
    const phase = phaseById[m.phaseId];
    const comp  = phase ? compById[phase.compId] : null;
    const taN = ta?.name || m.labelA || 'Por definir';
    const tbN = tb?.name || m.labelB || 'Por definir';
    /* detectar ida/vuelta desde m.leg o desde el sufijo del slotId */
    const mLeg = m.leg != null ? m.leg
      : (m.slotId?.endsWith('_leg1') ? 1 : m.slotId?.endsWith('_leg2') ? 2 : null);
    /* vuelta: el equipo B juega en casa → invertir orden visual */
    const isVueltaMm = mLeg === 2;
    const [mmTaN,mmTbN,mmTa,mmTb] = isVueltaMm
      ? [tbN,taN,tb,ta] : [taN,tbN,ta,tb];
    const iniA = (mmTa?.ini || mmTaN).substring(0,3).toUpperCase();
    const iniB = (mmTb?.ini || mmTbN).substring(0,3).toUpperCase();
    const colA = mmTa?.color || '#333', colB = mmTb?.color || '#333';
    const crestA = mmTa?.logo ? `<img src="${_esc(mmTa.logo)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : _esc(iniA);
    const crestB = mmTb?.logo ? `<img src="${_esc(mmTb.logo)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : _esc(iniB);
    const time = _calMatchTimeLocal(m);
    const played = m.goalsA!=null && m.goalsB!=null;
    /* en vuelta el marcador también se invierte visualmente */
    const scoreA = isVueltaMm ? m.goalsB : m.goalsA;
    const scoreB = isVueltaMm ? m.goalsA : m.goalsB;
    const lead = played
      ? `<span class="mm-score">${_esc(scoreA)}-${_esc(scoreB)}</span>`
      : `<span class="mm-time">${_esc(time||'—')}</span>`;
    const label = [comp?.name||'', phase?.name||''].filter(Boolean).join(' · ');
    const legBadge = mLeg===1
      ? '<span class="mm-leg mm-leg--ida">IDA</span>'
      : mLeg===2 ? '<span class="mm-leg mm-leg--vuelta">VTA</span>' : '';
    return `<div class="metro-match">
      ${lead}
      <span class="mm-fixture">
        <span class="mm-side mm-side-a">
          <span class="mm-crest" style="--tc:${_esc(colA)};">${crestA}</span>
          <span class="mm-name">${_esc(mmTaN)}</span>
        </span>
        <span class="mm-sep">–</span>
        <span class="mm-side mm-side-b">
          <span class="mm-name">${_esc(mmTbN)}</span>
          <span class="mm-crest" style="--tc:${_esc(colB)};">${crestB}</span>
        </span>
      </span>
      ${legBadge}
      ${label?`<span class="mm-comp">${_esc(label)}</span>`:''}
    </div>`;
  };

  /* Un día del metro: dot + fecha (+ tag Libre/Sorteo/texto) + partidos. */
  const metroDay = (dateStr)=>{
    const ms = byDateAll[dateStr] || [];
    // Fecha mostrada y clasificación: la del viewer para esta jornada (ya
    // precalculada arriba), no la de Lima cruda — data-cal-date sigue
    // siendo la clave de Lima (es lo que usa el ancla para encontrar el
    // elemento a scrollear, y las búsquedas por fecha en byDateAll/etc.).
    const viewerDateStr = jornadaViewerDate[dateStr] || dateStr;
    const isPast = viewerDateStr < today, isToday = viewerDateStr === today;
    const has = ms.length>0;
    const lbl = labelByDate[dateStr] || {text:'', type:''};
    const tagText = lbl.type==='libre' ? 'Libre' : lbl.type==='sorteo' ? 'Sorteo' : (lbl.text||'');
    const cls = ['metro-day', has?'has':'empty', isToday?'today':'', isPast?'past':''].filter(Boolean).join(' ');
    return `<div class="${cls}" data-cal-date="${dateStr}">
      <div class="metro-dot"></div>
      <div class="metro-date">${_esc(_calFormatDay(viewerDateStr))}${tagText?`<span class="mm-tag">${_esc(tagText)}</span>`:''}</div>
      ${has ? ms.map(metroMatch).join('') : (tagText ? '' : '<div class="metro-empty">Sin partidos</div>')}
    </div>`;
  };

  /* Horizonte inicial: 10 filas de partido. El resto se carga de 10 en 10
     dentro del mismo contenedor scrolleable. (HORIZON_ROWS ya está
     declarado arriba, donde también se usa para armar la ventana de
     pasado alrededor del ancla.) */
  let seenRows = 0, cutoff = visibleDates.length - 1;
  for(let i=0;i<visibleDates.length;i++){
    const dStr = visibleDates[i];
    const dayRows = byDateAll[dStr]?.length || 0;
    if(seenRows + dayRows > HORIZON_ROWS && seenRows > 0){ cutoff = i - 1; break; }
    seenRows += dayRows;
  }
  // Garantía dura: el ancla (vivo/hoy) SIEMPRE entra en el horizonte
  // inicial, aunque su propia jornada por sí sola exceda el presupuesto de
  // filas — no puede quedar detrás de "Cargar más".
  if(anchorDateStr){
    const anchorPos = visibleDates.indexOf(anchorDateStr);
    if(anchorPos > cutoff) cutoff = anchorPos;
  }
  const horizonDates = visibleDates.slice(0, cutoff+1);
  const pendingDates = visibleDates.slice(cutoff+1);
  const moreBtn = pendingDates.length
    ? `<button type="button" class="metro-more">
         <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
         Cargar más
       </button>`
    : '';

  stage.innerHTML=`
    <div class="cal-duo">
      ${heroHtml}
      <div class="metro" aria-label="Cronograma de la temporada">
        <div class="metro-track">
          ${horizonDates.map(metroDay).join('')}
          ${moreBtn}
        </div>
      </div>
    </div>`;
  stageReady = true;

  /* Toggle colapsable del hero (click + teclado) + CTAs reales */
  _calWireHero(stage, anchorDateStr, el);

  /* «Cargar más»: añade las siguientes 10 filas in situ (scroll interno). */
  const _pending = [...pendingDates];
  const metroEl  = stage.querySelector('.metro-track');
  const _wireMore = () => {
    const btn = metroEl?.querySelector('.metro-more');
    if(!btn) return;
    btn.addEventListener('click', () => {
      if(!_pending.length){ btn.remove(); return; }
      let rowsAdded = 0;
      const toRender = [];
      while(_pending.length){
        const d = _pending[0];
        const dayRows = byDateAll[d]?.length || 0;
        if(rowsAdded + dayRows > HORIZON_ROWS && rowsAdded > 0) break;
        toRender.push(_pending.shift());
        rowsAdded += dayRows;
      }
      const tmp = document.createElement('div');
      tmp.innerHTML = toRender.map(metroDay).join('');
      while(tmp.firstChild) metroEl.insertBefore(tmp.firstChild, btn);
      if(!_pending.length) btn.remove();
      else{
        const reduced = window.MOTION?.reduced() || matchMedia('(prefers-reduced-motion:reduce)').matches;
        btn.scrollIntoView({ behavior:reduced?'auto':'smooth', block:'nearest' });
      }
    });
  };
  _wireMore();

  /* Cuenta atrás del hero (solo si el foco es el «próximo partido», no en vivo) */
  if(heroMatch && !heroIsLive) _calInitHeroCountdown(heroMatch, stage);
  } finally {
    // Commit atómico: si se armó en staging, reemplaza TODO de una sola vez —
    // recién ahí se desconectan los listeners/countdown/observers del hero
    // ANTERIOR (vía _calWireHero, que limpia lo previo antes de cablear lo
    // nuevo), nunca antes de tener el reemplazo listo. Si el fetch falló antes
    // de terminar de armar el staging (stageReady sigue false), se descarta el
    // staging sin tocar el contenido real — el hero anterior sigue intacto y
    // respondiendo.
    if (stagingWrap) {
      if (stageReady) {
        _calCommitStage(el, stagingWrap);
        // tsc:public-section-mounted (revealWithin) ya cableó el hero del PRIMER
        // montaje; este commit es un refresco que recreó el hero desde cero — sin
        // asentarlo explícitamente, el nodo nuevo queda sin `revealBound`/`revealed`.
        // NUNCA debe repetir la animación de entrada (el usuario ya está viendo
        // esta sección), solo quedar directamente en su estado final.
        if (window.MOTION?.settleWithin) MOTION.settleWithin(el);
      } else {
        stagingWrap.remove();
      }
    }
    // Timeout de respaldo: en una pestaña sin foco/backgrounded rAF puede no
    // dispararse nunca — sin esto, el montaje de la sección se cuelga para siempre.
    await _calRafOrTimeout();
    el.style.minHeight = '';
    el.removeAttribute('aria-busy');
  }
}

/* Reemplaza el contenido de `el` por el de `stagingWrap` en un solo paso
   síncrono (ver _pubCommitStage en public.js: mismo patrón, copia local para
   no acoplar calendar.js a public.js). No hay ids `__staging` que normalizar
   acá: el hero no usa ids fijos que colisionen (solo #hm-countdown, ya resuelto
   vía scope en _calInitHeroCountdown). */
function _calCommitStage(el, stagingWrap){
  const frag = document.createDocumentFragment();
  while (stagingWrap.firstChild) frag.appendChild(stagingWrap.firstChild);
  el.innerHTML = '';
  el.appendChild(frag);
}

/* rAF con red de seguridad: resuelve con el primer frame real, o a los `ms`
   si el navegador nunca lo entrega (pestaña sin foco/backgrounded). */
function _calRafOrTimeout(ms = 400){
  return new Promise(resolve=>{
    let done = false;
    const finish = () => { if(!done){ done = true; resolve(); } };
    requestAnimationFrame(finish);
    setTimeout(finish, ms);
  });
}
