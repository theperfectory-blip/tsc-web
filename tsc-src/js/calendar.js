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
function _calLogo(team, size){
  const s = size||36;
  if(!team) return `<div class="cal-logo cal-logo--ph" style="width:${s}px;height:${s}px;font-size:${Math.floor(s/3)}px;">?</div>`;
  if(team.logo) return `<img class="cal-logo" src="${_esc(team.logo)}" style="width:${s}px;height:${s}px;" alt="${_esc(team.name)}">`;
  const initials = (team.name||'?').substring(0,2).toUpperCase();
  const bg = team.color||'#555';
  return `<div class="cal-logo cal-logo--ph" style="width:${s}px;height:${s}px;background:${_esc(bg)};font-size:${Math.floor(s/3)}px;">${_esc(initials)}</div>`;
}

/* ─ guardar programación con debounce ────────────────────── */
const _calTimer = {};

function _calSave(matchId, dateStr, timeStr){
  clearTimeout(_calTimer[matchId]);
  _calTimer[matchId] = setTimeout(async ()=>{
    const m = await dbGet('matches', matchId);
    if(!m) return;
    await dbPut('matches', {...m, scheduledDate: dateStr||null, scheduledTime: timeStr||null});
    const row = document.querySelector(`.cal-adm-row[data-mid="${matchId}"]`);
    if(row){ row.classList.add('cal-adm-row--ok'); setTimeout(()=>row.classList.remove('cal-adm-row--ok'),1200); }
  }, 700);
}

async function calClearSchedule(matchId){
  const m = await dbGet('matches', matchId);
  if(!m) return;
  await dbPut('matches', {...m, scheduledDate:null, scheduledTime:null});
  showToast('Programación eliminada');
  await renderAdmCalendar();
}

/* ================================================================
   VISTA ADMIN
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
  const phaseById = Object.fromEntries(allPhases.map(p=>[p.id, p]));
  const compById  = Object.fromEntries(comps.map(c=>[c.id, c]));

  const pending = allMatches.filter(m=> m.goalsA==null && m.teamA && m.teamB);

  if(!pending.length){
    el.innerHTML = `<div class="cal-empty">
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <p>No hay partidos pendientes de programar</p>
    </div>`;
    return;
  }

  const sortKey = m => (m.scheduledDate||'9999')+(m.scheduledTime||'00:00');
  const scheduled   = pending.filter(m=>  m.scheduledDate).sort((a,b)=>sortKey(a)<sortKey(b)?-1:1);
  const unscheduled = pending.filter(m=> !m.scheduledDate);

  const byDate = {};
  for(const m of scheduled){
    if(!byDate[m.scheduledDate]) byDate[m.scheduledDate] = [];
    byDate[m.scheduledDate].push(m);
  }

  const rowHtml = (m)=>{
    const ta    = teamById[m.teamA];
    const tb    = teamById[m.teamB];
    const phase = phaseById[m.phaseId];
    const comp  = phase ? compById[phase.compId] : null;
    const taN   = ta?.name || String(m.teamA);
    const tbN   = tb?.name || String(m.teamB);
    const phN   = phase?.name || '';
    const col   = comp?.color || 'var(--gold)';
    const hasSched = !!m.scheduledDate;
    return `
    <div class="cal-adm-row${hasSched?' cal-adm-row--sched':''}" data-mid="${m.id}">
      <div class="cal-adm-teams">
        ${_calLogo(ta,28)}
        <span class="cal-adm-tname">${_esc(taN)}</span>
        <span class="cal-adm-vs">vs</span>
        <span class="cal-adm-tname">${_esc(tbN)}</span>
        ${_calLogo(tb,28)}
      </div>
      <div class="cal-adm-controls">
        <span class="cal-adm-phase" style="color:${col};border-color:${col};">${_esc(phN)}</span>
        <input type="date" class="cal-inp cal-inp-date" value="${m.scheduledDate||''}"
          title="Fecha" aria-label="Fecha del partido"
          onchange="_calSave(${m.id},this.value,this.closest('.cal-adm-row').querySelector('.cal-inp-time').value)">
        <input type="time" class="cal-inp cal-inp-time" value="${m.scheduledTime||''}"
          title="Hora" aria-label="Hora del partido"
          onchange="_calSave(${m.id},this.closest('.cal-adm-row').querySelector('.cal-inp-date').value,this.value)">
        ${hasSched?`<button class="btn btn-xs cal-adm-clear" onclick="calClearSchedule(${m.id})" title="Quitar fecha">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>`:''}
      </div>
    </div>`;
  };

  const sectionHdr = (label, icon, count, muted)=>`
    <div class="cal-adm-hdr${muted?' cal-adm-hdr--muted':''}">
      ${icon}
      <span>${label}</span>
      <span class="cal-adm-hdr-count">${count} partido${count!==1?'s':''}</span>
    </div>`;

  const icoCalendar = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
  const icoInfo     = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  let html = '';
  for(const [dateStr, ms] of Object.entries(byDate)){
    html += `<section class="cal-adm-section">
      ${sectionHdr(_calFormatDay(dateStr), icoCalendar, ms.length, false)}
      ${ms.map(rowHtml).join('')}
    </section>`;
  }
  if(unscheduled.length){
    html += `<section class="cal-adm-section cal-adm-section--unsched">
      ${sectionHdr('Sin programar', icoInfo, unscheduled.length, true)}
      ${unscheduled.map(rowHtml).join('')}
    </section>`;
  }

  el.innerHTML = html;
}

/* ================================================================
   VISTA PÚBLICA
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

  const upcoming = allMatches
    .filter(m=> m.scheduledDate && m.scheduledDate>=today && m.goalsA==null && m.teamA && m.teamB)
    .sort((a,b)=>{
      const ka = a.scheduledDate+(a.scheduledTime||'00:00');
      const kb = b.scheduledDate+(b.scheduledTime||'00:00');
      return ka<kb?-1:1;
    });

  if(!upcoming.length){
    el.innerHTML = `
    <div class="cal-pub-empty">
      <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <div class="cal-pub-empty-title">Sin partidos programados</div>
      <div class="cal-pub-empty-sub">Los próximos partidos aparecerán aquí en cuanto el admin los programe</div>
    </div>`;
    return;
  }

  const byDate = {};
  for(const m of upcoming){
    if(!byDate[m.scheduledDate]) byDate[m.scheduledDate] = [];
    byDate[m.scheduledDate].push(m);
  }

  const cardHtml = (m)=>{
    const ta    = teamById[m.teamA];
    const tb    = teamById[m.teamB];
    const phase = phaseById[m.phaseId];
    const comp  = phase ? compById[phase.compId] : null;
    const taN   = ta?.name || String(m.teamA);
    const tbN   = tb?.name || String(m.teamB);
    const compN = comp?.name || '';
    const phN   = phase?.name || '';
    const col   = comp?.color || 'var(--gold)';
    const time  = m.scheduledTime ? m.scheduledTime.substring(0,5) : null;
    const label = [compN, phN].filter(Boolean).join(' · ');

    return `
    <div class="cal-pub-card" style="--cc:${col};">
      <div class="cal-pub-card-head">
        <span class="cal-pub-comp" style="color:${col};">${_esc(label)}</span>
        ${time?`<span class="cal-pub-time">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${_esc(time)}
        </span>`:'<span class="cal-pub-time cal-pub-time--tbd">Hora por definir</span>'}
      </div>
      <div class="cal-pub-matchup">
        <div class="cal-pub-team">
          ${_calLogo(ta, 44)}
          <span class="cal-pub-tname">${_esc(taN)}</span>
        </div>
        <span class="cal-pub-vs">VS</span>
        <div class="cal-pub-team cal-pub-team--r">
          <span class="cal-pub-tname">${_esc(tbN)}</span>
          ${_calLogo(tb, 44)}
        </div>
      </div>
    </div>`;
  };

  const total = upcoming.length;
  let html = `<div class="cal-pub-summary">${total} partido${total!==1?'s':''} próximo${total!==1?'s':''}</div>`;

  for(const [dateStr, ms] of Object.entries(byDate)){
    const isToday = dateStr === today;
    html += `
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

  el.innerHTML = html;
}
