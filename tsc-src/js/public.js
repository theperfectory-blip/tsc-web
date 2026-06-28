/* ============================================================
   CARRUSEL COMP ─ FASE (rediseño broadcast). Navegador "una a la
   vez": el activo va centrado y grande, los vecinos asoman difuminados.
   Cambia con drag/swipe o clic en un vecino. Portado del prototipo
   (sin mocks), escape vía _tkEsc. El listener de resize se liga una
   sola vez (anti-leak); cada render del panel recrea las instancias.
   ============================================================ */
let _pubCompCarousel = null, _pubFaseCarousel = null, _pubCarouselResizeBound = false;

function _pubBindCarouselResize(){
  if(_pubCarouselResizeBound) return;
  _pubCarouselResizeBound = true;
  window.addEventListener('resize', ()=>{ _pubCompCarousel?.recenter(); _pubFaseCarousel?.recenter(); });
}

/* Crea un carrusel sobre un contenedor .cc (con .cc-view > .cc-track vacío).
   `activeIdx` posiciona el item activo SIN disparar onChange (evita loop de
   re-render). Solo la interacción del usuario (drag/clic) llama onChange(idx). */
function _pubMakeCarousel(cc, items, activeIdx, onChange){
  const view = cc.querySelector('.cc-view');
  const track = cc.querySelector('.cc-track');
  if(!view || !track) return null;
  let idx = Math.max(0, activeIdx||0);
  const curTx = ()=> new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
  function center(animate){
    const it = track.children[idx]; if(!it) return;
    const PEEK = window.innerWidth <= 560 ? 14 : 30;
    if(!animate) track.style.transition = 'none';
    view.style.width = (it.offsetWidth + PEEK*2) + 'px';
    const tx = view.clientWidth/2 - (it.offsetLeft + it.offsetWidth/2);
    track.style.transform = `translateX(${tx}px)`;
    [...track.children].forEach((c,i)=>c.classList.toggle('active', i===idx));
    if(!animate){ void track.offsetWidth; track.style.transition = ''; }
  }
  // Pinta los items y centra el activo (sin animar, sin onChange).
  track.innerHTML = items.map((t,i)=>`<button type="button" class="cc-item" data-i="${i}">${_tkEsc(t)}</button>`).join('');
  if(idx >= track.children.length) idx = 0;
  center(false);
  function set(i, fromUser){
    const prev = idx;
    idx = Math.max(0, Math.min(track.children.length-1, i));
    center(true);
    if(fromUser && idx!==prev && onChange) onChange(idx);
  }
  // drag / swipe con snap al vecino más cercano
  let down=false, x0=0, tx0=0, moved=false;
  track.addEventListener('pointerdown', e=>{ down=true; x0=e.clientX; tx0=curTx(); moved=false; track.classList.add('dragging'); track.setPointerCapture?.(e.pointerId); });
  track.addEventListener('pointermove', e=>{ if(!down) return; const dx=e.clientX-x0; if(Math.abs(dx)>4) moved=true; track.style.transform=`translateX(${tx0+dx}px)`; });
  function release(){
    if(!down) return; down=false; track.classList.remove('dragging');
    const point = view.clientWidth/2 - curTx();
    let best=0, bd=Infinity;
    [...track.children].forEach((c,i)=>{ const m=c.offsetLeft+c.offsetWidth/2; const d=Math.abs(m-point); if(d<bd){bd=d;best=i;} });
    set(best, true);
  }
  track.addEventListener('pointerup', release);
  track.addEventListener('pointercancel', release);
  track.addEventListener('click', e=>{ const it=e.target.closest('.cc-item'); if(it && !moved) set(+it.dataset.i, true); });
  return { recenter: ()=>center(false), get idx(){ return idx; } };
}

async function renderPubPanel(){
  // Escape local (function-scoped): public.js no define _esc global a propósito.
  const esc = v => String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const el = document.getElementById('pub-panel-content');
  const comps = await getForSeason('competitions');

  // filtro tolerante — acepta 'active', mayúsculas, espacios, y comps sin status
  const isActiveStatus = s => {
    if(s==null) return true; // sin status definido = activa por defecto (legacy)
    const norm = String(s).trim().toLowerCase();
    return norm==='active' || norm==='activa' || norm==='';
  };
  const active = comps.filter(c=>isActiveStatus(c.status));

  if(!active.length){
    el.innerHTML = `
      <div class="comp-sticky">
        <div class="comp-title"><span class="pd-n">02</span><span class="pub-fase-single">Competiciones</span></div>
      </div>
      <div style="color:var(--txt3);font-size:16px;padding:20px 0;">No hay competiciones activas en T${esc(STATE.season)}.</div>`;
    return;
  }
  // Si no hay comp seleccionada, tomar la primera
  if(!window._pubState.compId || !active.find(c=>c.id===window._pubState.compId)){
    window._pubState.compId = active[0].id;
    window._pubState.phaseId = null;
  }
  const selComp = active.find(c=>c.id===window._pubState.compId) || active[0];

  const allPhases = await dbGetAll('phases', p=>p.compId===selComp.id);
  const phases = allPhases.filter(p=>{
    if(p.status==null) return true;
    const norm = String(p.status).trim().toLowerCase();
    return norm==='active' || norm==='activa' || norm==='';
  });
  phases.sort((a,b)=>(a.order||0)-(b.order||0));

  if(!window._pubState.phaseId || !phases.find(p=>p.id===window._pubState.phaseId)){
    window._pubState.phaseId = phases[0]?.id || null;
  }
  const selPhase = phases.find(p=>p.id===window._pubState.phaseId);

  const phaseContentId = `pub-phase-content-${selComp.id}-${selPhase?.id}`;

  // Navegador broadcast «competición ─ fase»: dos carruseles que se instancian tras
  // montar el DOM (ver más abajo). En reposo muestran el activo grande; los vecinos
  // asoman difuminados. Con 1 fase se muestra su nombre fijo; con 0, solo la comp.
  const _accentOf = c => /^#[0-9A-Fa-f]{3,8}$/.test(String(c.color||'')) ? c.color : 'var(--gold)';
  const faseHead = phases.length>1
    ? `<span class="cc-sep">—</span><div class="cc cc-fase" id="pub-cc-fase"><div class="cc-view"><div class="cc-track"></div></div></div>`
    : (phases.length===1 ? `<span class="cc-sep">—</span><span class="pub-fase-single">${esc(selPhase?.name||'')}</span>` : '');
  const compHead = `
    <div class="comp-sticky">
      <div class="comp-title">
        <span class="pd-n">02</span>
        <div class="cc cc-comp" id="pub-cc-comp"><div class="cc-view"><div class="cc-track"></div></div></div>
        ${faseHead}
      </div>
    </div>`;

  const noPhasesMsg = !phases.length
    ? `<div style="color:var(--txt3);font-size:14px;padding:24px;text-align:center;background:var(--card2);border:1px dashed var(--brd);border-radius:var(--r);">
        <strong style="color:var(--gold);">${esc(selComp.name)}</strong> no tiene fases activas todavía.<br>
        <span style="font-size:12px;">Crea una fase desde el modo administrador.</span>
      </div>`
    : '';

  // Bloque EN VIVO destacado (arriba del panel) — partidos en juego de la temporada.
  // Solo aparece cuando hay al menos un partido en vivo; si no, no se muestra nada.
  let liveBlock = '';
  const liveMatches = await dbGetAll('matches', m=>m.live && (m.season===STATE.season||!m.season));
  if(liveMatches.length){
    const lvTeams = await dbGetAll('teams');
    const lvById = {}; lvTeams.forEach(t=>lvById[t.id]=t);
    const lvPhases = await dbGetAll('phases'); const phaseById={}; lvPhases.forEach(p=>phaseById[p.id]=p);
    const lvComps  = await dbGetAll('competitions'); const compById={}; lvComps.forEach(c=>compById[c.id]=c);
    const fmtT = iso => iso ? new Date(iso).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}) : '';
    const logoOf = (tid)=> (typeof teamLogoHtml==='function') ? teamLogoHtml(lvById[tid]?.name||('#'+tid), lvById[tid], 30) : '';
    liveBlock = `<div class="live-border" style="margin-bottom:22px;border:2px solid var(--red);border-radius:var(--r);overflow:hidden;background:rgba(239,68,68,0.05);">
      ${liveMatches.map((m,idx)=>{
        const a=esc(lvById[m.teamA]?.name||('#'+m.teamA)), b=esc(lvById[m.teamB]?.name||('#'+m.teamB));
        const ph=phaseById[m.phaseId]; const comp=ph?compById[ph.compId]:null;
        const compName=esc(comp?.name||'');
        return `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:rgba(239,68,68,0.13);font-family:'Barlow Condensed';font-weight:700;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:var(--red);${idx>0?'border-top:1px solid rgba(239,68,68,0.25);':''}">
          <span class="live-dot live-dot-red"></span>En vivo${compName?` · <span style="color:var(--gold);">${compName}</span>`:''}
        </div>
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;padding:14px 16px;">
          <div style="display:flex;align-items:center;justify-content:flex-end;gap:9px;font-weight:700;font-size:16px;">${a}${logoOf(m.teamA)}</div>
          <div style="text-align:center;min-width:90px;">
            <div style="font-family:'Bebas Neue';font-size:34px;letter-spacing:2px;color:var(--red);line-height:1;">${m.goalsA||0}-${m.goalsB||0}</div>
            ${m.liveStartAt?`<div style="font-size:10px;color:var(--txt3);margin-top:3px;">desde ${fmtT(m.liveStartAt)}</div>`:''}
          </div>
          <div style="display:flex;align-items:center;justify-content:flex-start;gap:9px;font-weight:700;font-size:16px;">${logoOf(m.teamB)}${b}</div>
        </div>`;
      }).join('')}
    </div>`;
  }
  // Ping de radar mientras haya partido en vivo a la vista (respeta on/off de sonido)
  if(typeof liveRadarStart==='function'){ liveMatches.length ? liveRadarStart() : liveRadarStop(); }

  el.innerHTML = `
    ${compHead}
    ${liveBlock}
    ${noPhasesMsg}
    <div id="${phaseContentId}"></div>`;

  // Instanciar carruseles comp/fase ya con el DOM montado. Se posicionan en el activo
  // sin disparar onChange; solo el drag/clic del usuario navega (pubSelectComp/Phase).
  _pubCompCarousel = null; _pubFaseCarousel = null;
  const _compCC = document.getElementById('pub-cc-comp');
  if(_compCC){
    _pubCompCarousel = _pubMakeCarousel(_compCC, active.map(c=>c.name), active.findIndex(c=>c.id===selComp.id), i=>pubSelectComp(active[i].id));
    _compCC.style.setProperty('--cc-accent', _accentOf(selComp));
  }
  const _faseCC = document.getElementById('pub-cc-fase');
  if(_faseCC){
    _pubFaseCarousel = _pubMakeCarousel(_faseCC, phases.map(p=>p.name), phases.findIndex(p=>p.id===selPhase?.id), i=>pubSelectPhase(phases[i].id));
  }
  _pubBindCarouselResize();
  // Reasentar tras el layout/fuentes (Bebas Neue cambia anchos → recentrar).
  requestAnimationFrame(()=>{ _pubCompCarousel?.recenter(); _pubFaseCarousel?.recenter(); });

  // Blindar render para que un error en una fase no deje en blanco el panel.
  if(selPhase){
    try {
      if(selPhase.type==='groups'){
        // Composición broadcast: por grupo, tabla .stand-card + marcadores .scores-stack.
        await _pubRenderGroupsBroadcast(selPhase.id, phaseContentId);
      }
    else if(selPhase.type==='bracket') await _pubRenderBracketBroadcast(selPhase.id, phaseContentId);
    else if(selPhase.type==='playoff') await _pubRenderPlayoffBroadcast(selPhase.id, phaseContentId);
    else if(selPhase.type==='single'){
      const teams = selPhase.config?.teams||2;
      if(teams===4) await _pubRenderBracketBroadcast(selPhase.id, phaseContentId);
      else await _pubRenderPlayoffBroadcast(selPhase.id, phaseContentId);
    }
    else {
      const ct = document.getElementById(phaseContentId);
      if(ct) ct.innerHTML = `<div style="color:var(--txt3);padding:20px;text-align:center;">Tipo de fase no soportado: <code>${esc(selPhase.type||'(vacío)')}</code></div>`;
    }
    } catch(err) {
      console.error(`[Panel público] Error renderizando fase ${selPhase.id}:`, err);
      const ct = document.getElementById(phaseContentId);
      if(ct) ct.innerHTML = `
        <div style="background:rgba(239,68,68,0.1);border:1px solid var(--red);border-radius:var(--r);padding:14px;color:var(--red);font-size:13px;">
          <strong>Error renderizando "${esc(selPhase.name)}":</strong><br>
          <code style="font-size:11px;color:var(--txt2);">${esc((err.message||err).toString())}</code><br>
          <span style="font-size:12px;color:var(--txt3);">Abre la consola (F12) para ver el detalle. Probablemente la fase tiene datos corruptos o le faltan grupos.</span>
        </div>`;
    }
  }
}

/* Render BROADCAST de una fase de grupos (vista pública). Por cada grupo emite
   una composición .comps-duo = tabla .stand-card (club fijo a la izquierda + stats
   con scroll horizontal y fade en los bordes) + .scores-stack (marcadores del grupo,
   EN VIVO primero). Reutiliza SOLO funciones de datos de standings.js
   (calcGroupStandings, getCriteria, resolveTeamData, resolveGroupRefsFor) — no toca
   el módulo compartido ni renderMatchesList. Todo dato externo escapado con _tkEsc. */
async function _pubRenderGroupsBroadcast(phaseId, containerId){
  const el = document.getElementById(containerId);
  if(!el) return;
  const phase = await dbGet('phases', phaseId);
  if(!phase){ el.innerHTML = '<div style="color:var(--txt3);font-size:15px;padding:16px;">Fase no encontrada.</div>'; return; }
  const criteriaIds = await getCriteria(phaseId);
  const config = phase.config||{};
  const ngroups = config.ngroups||2;
  const zones = phase.zones||[];
  const allMatches = await dbGetAll('matches', m=>m.phaseId===phaseId);
  const _allTeams = await dbGetAll('teams', t=>t.season===STATE.season||!t.season);
  const teamNamesById = {}, teamById = {};
  _allTeams.forEach(t=>{ teamNamesById[t.id]=t.name||''; teamById[t.id]=t; });
  const groupAssignments = phase.groups||{};

  if(!Object.keys(groupAssignments).length && !(phase.groupRefs||[]).length){
    el.innerHTML = '<div style="color:var(--txt3);font-size:15px;padding:16px;">Grupos no configurados aún.</div>';
    return;
  }

  // Zona de una posición (misma lógica de zonas que renderGroupTable, solo lectura).
  const getZone = (pos, gi)=>{
    const hasPos = zones.some(z=>z.positions && (Array.isArray(z.positions)?z.positions.length>0:Object.keys(z.positions).length>0));
    for(const z of zones){
      if(!z.positions) continue;
      if(Array.isArray(z.positions)){ if(z.positions.includes(pos)) return z; }
      else if(typeof z.positions==='object'){ const gp=z.positions[gi]??z.positions[String(gi)]??[]; if(gp.includes(pos)) return z; }
    }
    if(!hasPos){ let acc=0; for(const z of zones){ acc+=z.count||0; if(pos<acc) return z; } }
    return null;
  };
  // Acento verde (clasifica) para zonas no-últimas; rojo (cae) para la última de 2+.
  const zoneCls = z => { if(!z) return ''; const idx=zones.indexOf(z); return (zones.length>1 && idx===zones.length-1) ? 'zone-down' : 'zone-up'; };
  const colorOf = c => /^#[0-9A-Fa-f]{3,8}$/.test(String(c||'')) ? c : 'var(--gold)';

  let html = '';
  for(let gi=0; gi<ngroups; gi++){
    const groupName = `Grupo ${String.fromCharCode(65+gi)}`;
    const teamIds = (groupAssignments[gi]||[]).filter(t=>t!=null);
    const refEntries = (phase.groupRefs||[]).some(r=>parseInt(r.tGroup)===gi) ? await resolveGroupRefsFor(phase, gi) : [];
    const refResolved = refEntries.filter(e=>e.teamId!=null && !teamIds.includes(e.teamId));
    if(!teamIds.length && !refEntries.length) continue;
    const calcIds = [...teamIds, ...refResolved.map(e=>e.teamId)];
    const groupMatches = allMatches.filter(m=>m.groupIdx===gi);
    const standings = calcGroupStandings(calcIds, groupMatches, criteriaIds, groupMatches, teamNamesById);

    const rows = await Promise.all(standings.map(async (s,i)=>{
      const zone = getZone(i, gi);
      const td = await resolveTeamData(s.id);
      const name = td.name||'';
      const ini = (td.ini||name||'').substring(0,3).toUpperCase();
      const col = colorOf(td.color);
      return `<div class="stand-row ${zoneCls(zone)}" style="--team-color:${col};">
        <span class="st-fix">
          <span class="st-pos">${i+1}</span>
          <span class="st-crest" style="background:${col};">${_tkEsc(ini)}</span>
          <span class="st-name">${_tkEsc(name)}</span>
        </span>
        <span class="st-c">${s.pj}</span><span class="st-c">${s.v}</span><span class="st-c">${s.e}</span>
        <span class="st-c">${s.p}</span><span class="st-c">${s.gf}</span><span class="st-c">${s.gc}</span>
        <span class="st-pts">${s.pts}</span>
      </div>`;
    }));

    // Marcadores del grupo: EN VIVO primero, luego finalizados.
    const played = groupMatches.filter(m=>m.goalsA!=null && m.goalsB!=null);
    const scoreList = [...played.filter(m=>m.live), ...played.filter(m=>!m.live)];
    const scoreRow = m => {
      const ta=teamById[m.teamA], tb=teamById[m.teamB];
      const an=m.goalsA||0, bn=m.goalsB||0;
      return `<div class="score-row" style="--team-color:${colorOf(ta?.color)};">
        <div class="score-edge"></div>
        <div class="score-body">
          <span class="score-team">${_tkEsc(ta?.name||('#'+m.teamA))}</span>
          <div class="score-nums">
            <span class="score-n ${an<bn?'lose':''}">${an}</span>
            ${m.live?'<span class="chip chip-live"><span class="chip-dot"></span>En vivo</span>':'<span class="chip chip-final">Final</span>'}
            <span class="score-n ${bn<an?'lose':''}">${bn}</span>
          </div>
          <span class="score-team away">${_tkEsc(tb?.name||('#'+m.teamB))}</span>
        </div>
        <div class="score-edge" style="--team-color:${colorOf(tb?.color)};"></div>
      </div>`;
    };
    const scoresHtml = scoreList.length
      ? scoreList.map(scoreRow).join('')
      : '<div style="color:var(--txt3);font-size:13px;padding:16px;text-align:center;border:1px dashed var(--brd);border-radius:var(--r);">Sin partidos jugados todavía.</div>';
    const legend = zones.map(z=>`<span><i style="background:${colorOf(z.color)};"></i>${_tkEsc(z.name||'')}</span>`).join('');

    html += `
    <div class="comps-duo" style="margin-bottom:22px;">
      <div class="stand-card">
        <div class="stand-hdr"><span class="stand-title">${_tkEsc(groupName)}</span></div>
        <div class="stand-scrollwrap">
          <div class="stand-scroll">
            <div class="stand-grid">
              <div class="stand-colhead" aria-hidden="true">
                <span class="st-fix">Club</span>
                <span>PJ</span><span>G</span><span>E</span><span>P</span><span>GF</span><span>GC</span><span class="st-ph">PTS</span>
              </div>
              <div>${rows.join('')}</div>
            </div>
          </div>
          <div class="stand-fade l"></div>
          <div class="stand-fade r"></div>
        </div>
        ${legend?`<div class="stand-legend">${legend}</div>`:''}
      </div>
      <div class="scores-stack">${scoresHtml}</div>
    </div>`;
  }
  el.innerHTML = html || '<div style="color:var(--txt3);font-size:15px;padding:16px;">Sin grupos con equipos asignados.</div>';

  // Fade de bordes según scroll horizontal (igual que el prototipo).
  el.querySelectorAll('.stand-card').forEach(card=>{
    const sc = card.querySelector('.stand-scroll'); if(!sc) return;
    const upd = ()=>{ card.classList.toggle('more-r', sc.scrollLeft+sc.clientWidth < sc.scrollWidth-2); card.classList.toggle('more-l', sc.scrollLeft>2); };
    sc.addEventListener('scroll', upd, {passive:true});
    upd();
  });
}

async function pubShowMatchesGroup(phaseId, groupIdx, btnEl){
  window._pubState.groupIdx = groupIdx;   // recordar grupo activo para el re-render en vivo
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
  window._pubState.groupIdx = 0;   // nueva competición → arrancar en el primer grupo
  await renderPubPanel();
}

async function pubSelectPhase(phaseId){
  window._pubState.phaseId = phaseId;
  window._pubState.groupIdx = 0;   // nueva fase → arrancar en el primer grupo
  await renderPubPanel();
}

/* renderPubHistory: ahora vive en js/history.js (historial dinámico de partidos) */

/* ============================================================
   TICKER DE RESULTADOS (rediseño) — datos REALES, sin mock.
   Oculto por defecto; visible solo en modo público y solo si hay
   partidos en vivo o finalizados. Orden: live primero, luego
   finalizados por fecha desc, cap 8. Clearance de #main vía la
   clase .with-ticker (no depende de body.redesign).
   ============================================================ */
function _tkEsc(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* Token de secuencia para invalidar renders async en vuelo (anti-race): si se
   cambia a admin o llega un render más nuevo, los pendientes se descartan sin
   tocar el DOM (no muestran el ticker en admin ni pisan un render reciente). */
let _publicTickerSeq = 0;

/* Handle de la marquesina (MOTION.ticker). MOTION.ticker clona el track y deja
   un loop de rAF; hay que detenerlo y quitar el clon antes de re-render u ocultar
   para no acumular clones ni rAFs huérfanos. */
let _tickerStop = null;
function _stopTickerMarquee(){
  if(_tickerStop){ try{ _tickerStop(); }catch(e){} _tickerStop = null; }
  const ticker = document.getElementById('ticker');
  if(ticker) ticker.querySelectorAll('.ticker-track[aria-hidden="true"]').forEach(n=>n.remove());
  const track = document.getElementById('ticker-track');
  if(track) track.style.transform = '';
}

function hidePublicTicker(){
  _publicTickerSeq++;                       // invalida cualquier render en vuelo
  _stopTickerMarquee();
  const ticker = document.getElementById('ticker');
  const track  = document.getElementById('ticker-track');
  const main   = document.getElementById('main');
  if(track)  track.innerHTML = '';
  if(ticker) ticker.style.display = 'none';
  if(main)   main.classList.remove('with-ticker');
}

async function renderPublicTicker(){
  const seq    = ++_publicTickerSeq;
  const ticker = document.getElementById('ticker');
  const track  = document.getElementById('ticker-track');
  const main   = document.getElementById('main');
  if(!ticker || !track) return;
  const hideTicker   = ()=>{ _stopTickerMarquee(); track.innerHTML=''; ticker.style.display='none'; if(main) main.classList.remove('with-ticker'); };
  const stillCurrent = ()=> seq===_publicTickerSeq && typeof STATE!=='undefined' && STATE.mode==='public';

  // Solo en modo público (chequeo inicial síncrono)
  if(typeof STATE==='undefined' || STATE.mode!=='public'){ hideTicker(); return; }

  let matches;
  try{ matches = await dbGetAll('matches', m => m.season===STATE.season || !m.season); }
  catch(e){ console.warn('[ticker] no se pudieron leer partidos:', e); if(stillCurrent()) hideTicker(); return; }
  if(!stillCurrent()) return;               // superseded o cambió a admin -> no tocar el DOM

  const live = matches.filter(m => m.live);
  const done = matches
    .filter(m => !m.live && m.goalsA!=null && m.goalsB!=null)
    .sort((a,b) => String(b.playedAt||b.date||'').localeCompare(String(a.playedAt||a.date||'')));
  const ordered = [...live, ...done].slice(0, 8);
  if(!ordered.length){ hideTicker(); return; }

  // Mapas para nombres reales (equipos / fase→competición)
  const [teams, phases, comps] = await Promise.all([
    dbGetAll('teams'), dbGetAll('phases'), dbGetAll('competitions')
  ]);
  if(!stillCurrent()) return;               // recheck tras el segundo await
  const tById={}; teams.forEach(t => tById[t.id]=t);
  const phById={}; phases.forEach(p => phById[p.id]=p);
  const cById={}; comps.forEach(c => cById[c.id]=c);
  const nameOf = id => { const t=tById[id]; return t ? (t.name||('#'+id)) : ('#'+id); };
  const compOf = m => { const ph=phById[m.phaseId]; const c=ph?cById[ph.compId]:null; return c?c.name:''; };

  // Punto "en vivo": SVG, nunca emoji
  const liveDot = `<svg class="tk-live" viewBox="0 0 24 24" width="9" height="9" aria-hidden="true"><circle cx="12" cy="12" r="6" fill="var(--red)"/></svg>`;

  track.innerHTML = ordered.map(m => {
    const comp  = compOf(m);
    const a     = nameOf(m.teamA), b = nameOf(m.teamB);
    const score = `${m.goalsA ?? 0}-${m.goalsB ?? 0}`;
    return `<span class="ticker-item">`
      + (comp ? `<span class="tk-comp">${_tkEsc(comp)}</span>` : '')
      + (m.live ? liveDot : '')
      + `${_tkEsc(a)} <b>${_tkEsc(score)}</b> ${_tkEsc(b)}`
      + `</span>`;
  }).join('');

  _stopTickerMarquee();                     // limpia marquesina previa (clon + rAF)
  ticker.style.display = 'flex';
  if(main) main.classList.add('with-ticker');
  if(window.MOTION && typeof MOTION.ticker==='function'){
    _tickerStop = MOTION.ticker('#ticker', { speed: 50 });   // der→izq, respeta reduced-motion
  }
}

