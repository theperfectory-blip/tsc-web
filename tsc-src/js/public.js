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
  cc._pubCarousel?.dispose?.();
  const view = cc.querySelector('.cc-view');
  const track = cc.querySelector('.cc-track');
  if(!view || !track) return null;
  const controller = new AbortController();
  const listen = { signal:controller.signal };
  let idx = Math.max(0, activeIdx||0);
  const curTx = ()=> new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
  function center(animate){
    const it = track.children[idx]; if(!it) return;
    const isHitoFilter = cc.classList.contains('hito-filter-rail');
    const PEEK = isHitoFilter ? (window.innerWidth <= 560 ? 4 : 6) : (window.innerWidth <= 560 ? 14 : 30);
    if(!animate) track.style.transition = 'none';
    view.style.width = (it.offsetWidth + PEEK*2) + 'px';
    const tx = view.clientWidth/2 - (it.offsetLeft + it.offsetWidth/2);
    track.style.transform = `translateX(${tx}px)`;
    [...track.children].forEach((c,i)=>{
      const active = i===idx;
      c.classList.toggle('active', active);
      c.setAttribute('aria-pressed', String(active));
      if(active) c.setAttribute('aria-current', 'true');
      else c.removeAttribute('aria-current');
    });
    if(!animate){ void track.offsetWidth; track.style.transition = ''; }
  }
  // Pinta los items y centra el activo (sin animar, sin onChange).
  track.setAttribute('role', 'group');
  track.setAttribute('aria-label', cc.getAttribute('aria-label') || 'Selector');
  track.innerHTML = items.map((t,i)=>`<button type="button" class="cc-item" data-i="${i}" aria-pressed="${i===idx?'true':'false'}">${_tkEsc(t)}</button>`).join('');
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
  track.addEventListener('pointerdown', e=>{ down=true; x0=e.clientX; tx0=curTx(); moved=false; track.classList.add('dragging'); track.setPointerCapture?.(e.pointerId); }, listen);
  track.addEventListener('pointermove', e=>{ if(!down) return; const dx=e.clientX-x0; if(Math.abs(dx)>4) moved=true; track.style.transform=`translateX(${tx0+dx}px)`; }, listen);
  function release(){
    if(!down) return; down=false; track.classList.remove('dragging');
    const point = view.clientWidth/2 - curTx();
    let best=0, bd=Infinity;
    [...track.children].forEach((c,i)=>{ const m=c.offsetLeft+c.offsetWidth/2; const d=Math.abs(m-point); if(d<bd){bd=d;best=i;} });
    set(best, true);
  }
  track.addEventListener('pointerup', release, listen);
  track.addEventListener('pointercancel', release, listen);
  track.addEventListener('click', e=>{ const it=e.target.closest('.cc-item'); if(it && !moved) set(+it.dataset.i, true); }, listen);
  track.addEventListener('keydown', e=>{
    let next = null;
    if(e.key==='ArrowLeft') next = idx-1;
    else if(e.key==='ArrowRight') next = idx+1;
    else if(e.key==='Home') next = 0;
    else if(e.key==='End') next = track.children.length-1;
    if(next==null) return;
    e.preventDefault();
    set(next, true);
    track.children[idx]?.focus();
  }, listen);
  const api = {
    recenter: ()=>center(false),
    dispose: ()=>{
      controller.abort();
      track.classList.remove('dragging');
      if(cc._pubCarousel===api) delete cc._pubCarousel;
    },
    get idx(){ return idx; }
  };
  cc._pubCarousel = api;
  return api;
}

function _pubCaptureVisualAnchor(el){
  return el ? { el, top:el.getBoundingClientRect().top } : null;
}

async function _pubRestoreVisualAnchor(anchor, page){
  if(typeof focusPublicSection==='function') await focusPublicSection(page);
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  await new Promise(resolve=>setTimeout(resolve, 50));
  _pubRestoreScrollAnchor(anchor);
}

/* Igual que _pubRestoreVisualAnchor pero SIN pasar por focusPublicSection: la usa
   nav.js dentro de un refresco que YA fue disparado por el propio foco/suscripción
   en vivo, donde volver a invocar focusPublicSection generaría un ciclo de
   foco/render redundante (o recursión). Solo corrige la posición visual del
   ancla, sea cual sea la causa real del cambio de altura. */
function _pubRestoreScrollAnchor(anchor){
  if(!anchor?.el?.isConnected) return;
  const delta = anchor.el.getBoundingClientRect().top - anchor.top;
  if(Math.abs(delta)>0.5) window.scrollBy({ top:delta, left:0, behavior:'auto' });
}

async function renderPubPanel(){
  // Escape local (function-scoped): public.js no define _esc global a propósito.
  const esc = v => String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const el = document.getElementById('pub-panel-content');
  // Estabiliza la altura ANTES de tocar el DOM (red de seguridad adicional al
  // staging atómico de abajo: cubre el intervalo entre el commit final y el
  // rAF de asentado, por si una fuente/imagen tardía cambia la altura real).
  const _prevPanelHeight = el.offsetHeight;
  if (_prevPanelHeight > 0) el.style.minHeight = _prevPanelHeight + 'px';
  el.setAttribute('aria-busy', 'true');

  // Actualización atómica: si YA hay contenido visible (no es el primer montaje),
  // todo el nuevo contenido (encabezado + carruseles + el renderer de fase que
  // corresponda) se arma en un staging invisible superpuesto EXACTAMENTE sobre
  // el mismo cuadro (position:absolute; inset:0 dentro de `el`, que pasa a
  // relative). Al estar solo `visibility:hidden` (no display:none ni fuera de
  // pantalla), su getBoundingClientRect() coincide con la posición real en
  // viewport — así los chequeos de "¿está visible?" del bracket/playoff (fuegos
  // del campeón) siguen viendo coordenadas reales aunque el contenido todavía
  // no se haya mostrado. El contenido anterior permanece intacto y visible
  // hasta el commit final (_pubCommitStage), que reemplaza todo de una sola vez
  // y nunca deja un contenedor de fase vacío en pantalla durante los awaits. En
  // el primer montaje (sin contenido previo) no hay nada que preservar: se
  // monta directo sobre `el` (ahí sí se permite el hueco vacío momentáneo).
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
  const idSuffix = stagingWrap ? '__staging' : '';
  let stageReady = false;

  try {
  _pubCompCarousel?.dispose?.();
  _pubFaseCarousel?.dispose?.();
  _pubCompCarousel = null;
  _pubFaseCarousel = null;
  const comps = _sortComps(await getForSeason('competitions'));

  // filtro tolerante — acepta 'active', mayúsculas, espacios, y comps sin status
  const isActiveStatus = s => {
    if(s==null) return true; // sin status definido = activa por defecto (legacy)
    const norm = String(s).trim().toLowerCase();
    return norm==='active' || norm==='activa' || norm==='';
  };
  const active = comps.filter(c=>isActiveStatus(c.status));

  if(!active.length){
    stage.innerHTML = `
      <div class="comp-sticky">
        <div class="comp-title"><span class="pd-n">02</span><span class="pub-fase-single">Competiciones</span></div>
      </div>
      <div style="color:var(--txt3);font-size:16px;padding:20px 0;">No hay competiciones activas en T${esc(STATE.season)}.</div>`;
    stageReady = true;
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

  const phaseContentId = `pub-phase-content-${selComp.id}-${selPhase?.id}${idSuffix}`;
  const compCCId = `pub-cc-comp${idSuffix}`;
  const faseCCId = `pub-cc-fase${idSuffix}`;

  // Navegador broadcast «competición ─ fase»: dos carruseles que se instancian tras
  // montar el DOM (ver más abajo). En reposo muestran el activo grande; los vecinos
  // asoman difuminados. Con 1 fase se muestra su nombre fijo; con 0, solo la comp.
  const _accentOf = c => /^#[0-9A-Fa-f]{3,8}$/.test(String(c.color||'')) ? c.color : 'var(--gold)';
  const faseHead = phases.length>1
    ? `<span class="cc-sep">—</span><div class="cc cc-fase" id="${faseCCId}"><div class="cc-view"><div class="cc-track"></div></div></div>`
    : (phases.length===1 ? `<span class="cc-sep">—</span><span class="pub-fase-single">${esc(selPhase?.name||'')}</span>` : '');
  const compHead = `
    <div class="comp-sticky">
      <div class="comp-title">
        <span class="pd-n">02</span>
        <div class="cc cc-comp" id="${compCCId}"><div class="cc-view"><div class="cc-track"></div></div></div>
        ${faseHead}
      </div>
    </div>`;

  const noPhasesMsg = !phases.length
    ? `<div style="color:var(--txt3);font-size:14px;padding:24px;text-align:center;background:var(--card2);border:1px dashed var(--brd);border-radius:var(--r);">
        <strong style="color:var(--gold);">${esc(selComp.name)}</strong> no tiene fases activas todavía.<br>
        <span style="font-size:12px;">Crea una fase desde el modo administrador.</span>
      </div>`
    : '';

  // El estado EN VIVO vive SOLO en el Calendario (hero broadcast). La sección 02 es
  // de consulta: muestra el calendario completo, pero conserva cada cruce como VS
  // mientras está pendiente/en vivo y publica el marcador solo al finalizar.

  stage.innerHTML = `
    ${compHead}
    ${noPhasesMsg}
    <div id="${phaseContentId}"></div>`;
  stageReady = true;

  // Instanciar carruseles comp/fase ya con el DOM montado. Se posicionan en el activo
  // sin disparar onChange; solo el drag/clic del usuario navega (pubSelectComp/Phase).
  const _compCC = document.getElementById(compCCId);
  if(_compCC){
    _pubCompCarousel = _pubMakeCarousel(_compCC, active.map(c=>c.name), active.findIndex(c=>c.id===selComp.id), i=>pubSelectComp(active[i].id));
    _compCC.style.setProperty('--cc-accent', _accentOf(selComp));
  }
  const _faseCC = document.getElementById(faseCCId);
  if(_faseCC){
    _pubFaseCarousel = _pubMakeCarousel(_faseCC, phases.map(p=>p.name), phases.findIndex(p=>p.id===selPhase?.id), i=>pubSelectPhase(phases[i].id));
  }
  _pubBindCarouselResize();
  // Reasentar tras el layout/fuentes (Bebas Neue cambia anchos → recentrar). Las
  // medidas son válidas incluso en staging: visibility:hidden se sigue layoutando.
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
          <strong>No pudimos mostrar "${esc(selPhase.name)}".</strong><br>
          <span style="font-size:12px;color:var(--txt3);">Intenta nuevamente en unos segundos.</span>
        </div>`;
    }
  }
  } finally {
    // Commit atómico: si se armó en staging, reemplaza TODO el contenido de una
    // sola vez (nunca queda un frame con `el` vacío ni con ambas copias a la
    // vez). Si el fetch falló ANTES de terminar de armar el staging (stageReady
    // sigue false), se descarta el staging sin tocar el contenido real — un
    // error de red nunca debe vaciar lo que ya se veía.
    if (stagingWrap) {
      if (stageReady) _pubCommitStage(el, stagingWrap);
      else stagingWrap.remove();
    }
    // Soltar la altura solo después de que el renderer específico terminó Y el
    // layout se asentó (una fuente/imagen tardía todavía podría cambiar la
    // altura real un frame más tarde). Timeout de respaldo: si la pestaña está
    // en background/sin foco, rAF puede no dispararse nunca — sin la red de
    // seguridad, esto colgaría el montaje de la sección para siempre.
    await _rafOrTimeout();
    el.style.minHeight = '';
    el.removeAttribute('aria-busy');
  }
}

/* Reemplaza el contenido de `el` por el de `stagingWrap` en un solo paso
   síncrono (JS de una sola hebra: el navegador no puede pintar un frame
   intermedio con `el` vacío) y normaliza los ids temporales `__staging` a su
   forma real, para que el próximo render pueda volver a usarlos sin choque. */
function _pubCommitStage(el, stagingWrap){
  const frag = document.createDocumentFragment();
  while (stagingWrap.firstChild) frag.appendChild(stagingWrap.firstChild);
  el.innerHTML = '';
  el.appendChild(frag);
  el.querySelectorAll('[id$="__staging"]').forEach(node=>{ node.id = node.id.slice(0, -'__staging'.length); });
}

/* rAF con red de seguridad: resuelve con el primer frame real, o a los
   `ms` si el navegador nunca lo entrega (pestaña sin foco/backgrounded). */
function _rafOrTimeout(ms = 400){
  return new Promise(resolve=>{
    let done = false;
    const finish = () => { if(!done){ done = true; resolve(); } };
    requestAnimationFrame(finish);
    setTimeout(finish, ms);
  });
}

/* ── Paginador de partidos por FECHA/jornada (sección 02) ─────────────────────
   «Fecha» = la jornada que crea el admin (campo m.ronda), NO la fecha de
   calendario. Cada grupo muestra TODOS los partidos creados, agrupados por ronda,
   etiquetados «Fecha N» (con su fecha programada como subtítulo) y paginados con
   flechas < >. Los goles solo se publican cuando el partido deja de estar en vivo.
   Todas las fechas se renderizan como
   «páginas» ocultas; las flechas alternan cuál se ve (sin re-render del panel).
   El índice activo por grupo se persiste en _pubScoreDateIdx para sobrevivir a
   los re-render en vivo (liveSubscribe). */
let _pubScoreDateIdx = {};
const _PUB_CHEVRON_L = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
const _PUB_CHEVRON_R = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

/* groupKey identifica el grupo (`${phaseId}-${gi}`); rondaMeta/gi resuelven la
   fecha programada de cada jornada (phase.rondaMeta[`${gi}_${ronda}_date`]). */
function _pubScoresPagerHtml(groupKey, matches, scoreRow, rondaMeta, gi){
  if(!matches.length){
    return '<div class="scores-empty">No hay partidos creados todavía.</div>';
  }
  // Agrupar por jornada (m.ronda). Los sin ronda caen en un bucket «∅» al final.
  const byRonda = new Map();
  matches.forEach(m=>{ const k = m.ronda!=null ? m.ronda : '∅'; if(!byRonda.has(k)) byRonda.set(k,[]); byRonda.get(k).push(m); });
  const keys = [...byRonda.keys()].sort((a,b)=> a==='∅'?1 : b==='∅'?-1 : a-b);
  // Dentro de cada jornada: orden por id (orden en que el admin cargó los partidos).
  byRonda.forEach(arr=>arr.sort((x,y)=>(x.id||0)-(y.id||0)));
  // Índice activo: el guardado (clamp, preserva navegación manual) o, por defecto,
  // la primera jornada PENDIENTE entre las que ya tienen fecha/hora asignada en el
  // calendario (rondaMeta) — si todas esas están completas, la última con fecha; si
  // ninguna jornada tiene fecha asignada todavía, la última creada (fallback previo).
  let idx = _pubScoreDateIdx[groupKey];
  if(idx==null){
    const isComplete = k => (byRonda.get(k)||[]).every(m=>m.goalsA!=null && m.goalsB!=null && !m.live);
    const withDate = keys.filter(k=>k!=='∅' && rondaMeta && rondaMeta[`${gi}_${k}_date`]);
    if(withDate.length){
      const pending = withDate.find(k=>!isComplete(k));
      const target  = pending!=null ? pending : withDate[withDate.length-1];
      idx = keys.indexOf(target);
    } else {
      idx = keys.length-1;
    }
  }
  idx = Math.max(0, Math.min(keys.length-1, idx));
  _pubScoreDateIdx[groupKey] = idx;

  const fechaLbl = k => k==='∅' ? 'Sin jornada' : `Fecha ${k}`;
  const fechaSub = k => {
    if(k==='∅') return '';
    const jugadas = (byRonda.get(k)||[])
      .filter(m=>m.goalsA!=null && m.goalsB!=null && !m.live)
      .map(m=>(m.playedAt||m.date||'').substring(0,10))
      .filter(Boolean);
    const dd = rondaMeta ? (rondaMeta[`${gi}_${k}_date`]||null) : null;
    return (typeof formatJornadaDateRange==='function') ? (formatJornadaDateRange(jugadas, dd)||'') : '';
  };
  const pages = keys.map((k,i)=>
    `<div class="scores-date-page" data-label="${_tkEsc(fechaLbl(k))}" data-sub="${_tkEsc(fechaSub(k))}"${i===idx?'':' hidden'}>${byRonda.get(k).map(scoreRow).join('')}</div>`
  ).join('');
  // La barra se muestra SIEMPRE (aunque haya una sola jornada) para que la «Fecha N»
  // sea visible; las flechas se deshabilitan en los extremos.
  const lblHtml = k => `<b>${_tkEsc(fechaLbl(k))}</b>${fechaSub(k)?`<small>${_tkEsc(fechaSub(k))}</small>`:''}`;
  const bar = `<div class="scores-datebar" data-key="${_tkEsc(groupKey)}" data-idx="${idx}">
      <button type="button" class="scores-arrow" aria-label="Fecha anterior" onclick="pubScoreDateNav(this,-1)"${idx<=0?' disabled':''}>${_PUB_CHEVRON_L}</button>
      <span class="scores-datelbl">${lblHtml(keys[idx])}</span>
      <button type="button" class="scores-arrow" aria-label="Fecha siguiente" onclick="pubScoreDateNav(this,1)"${idx>=keys.length-1?' disabled':''}>${_PUB_CHEVRON_R}</button>
    </div>`;
  return `<div class="scores-pager">${bar}<div class="scores-pages">${pages}</div></div>`;
}

/* Navega entre jornadas del paginador (onclick inline). Alterna la página visible
   y persiste el índice por grupo. dir = -1 (anterior) | +1 (siguiente). */
function pubScoreDateNav(btn, dir){
  const pager = btn.closest('.scores-pager'); if(!pager) return;
  const bar = pager.querySelector('.scores-datebar'); if(!bar) return;
  const pages = [...pager.querySelectorAll('.scores-date-page')];
  const n = pages.length; if(!n) return;
  let idx = Math.max(0, Math.min(n-1, (parseInt(bar.dataset.idx)||0) + dir));
  bar.dataset.idx = String(idx);
  pages.forEach((p,i)=>{ p.hidden = i!==idx; });
  const lbl = pager.querySelector('.scores-datelbl');
  if(lbl){
    const sub = pages[idx].dataset.sub || '';
    lbl.innerHTML = `<b>${_tkEsc(pages[idx].dataset.label||'')}</b>${sub?`<small>${_tkEsc(sub)}</small>`:''}`;
  }
  const arrows = bar.querySelectorAll('.scores-arrow');
  if(arrows[0]) arrows[0].disabled = idx<=0;
  if(arrows[1]) arrows[1].disabled = idx>=n-1;
  if(bar.dataset.key) _pubScoreDateIdx[bar.dataset.key] = idx;
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
  const colorOf = c => /^#[0-9A-Fa-f]{3,8}$/.test(String(c||'')) ? c : 'var(--gold)';
  // Color real de la zona (mismo criterio que el posStyle de renderGroupTable admin,
  // standings.js:261-263) — nunca fijo verde/rojo, sigue lo que configuró el admin.
  const posStyle = z => z ? `background:${colorOf(z.color)}22;color:${colorOf(z.color)};` : '';

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
      const crest = td.logo
        ? `<span class="st-crest"><img src="${_tkEsc(td.logo)}" alt="" style="width:100%;height:100%;object-fit:cover;"></span>`
        : `<span class="st-crest" style="background:${col};">${_tkEsc(ini)}</span>`;
      return `<div class="stand-row" style="--team-color:${col};">
        <span class="st-fix">
          <span class="st-pos" style="${posStyle(zone)}">${i+1}</span>
          ${crest}
          <span class="st-name">${_tkEsc(name)}</span>
        </span>
        <span class="st-pts">${s.pts}</span>
        <span class="st-c">${s.pj}</span><span class="st-c">${s.v}</span><span class="st-c">${s.e}</span>
        <span class="st-c">${s.p}</span><span class="st-c">${s.gf}</span><span class="st-c">${s.gc}</span>
      </div>`;
    }));

    // Calendario completo del grupo. Pendientes y en vivo permanecen como VS; la
    // suscripción en tiempo real publica el marcador solo cuando live pasa a false.
    // luisTeam (generado por "Generar fechas" en fixture-gen.js, o seteado a
    // mano en el modal de fecha): marca qué lado controla Luis en este
    // partido puntual. Se muestra SOLO del lado controlado (no en el rival,
    // a diferencia de una versión anterior de este fix) — junto al marcador,
    // a la izquierda si controla al local (teamA) o a la derecha si controla
    // a la visita (teamB). Mismo criterio que el admin (matches.js), que ya
    // marca solo el lado controlado.
    const luisIcon = title => `<span title="${_tkEsc(title)}" style="display:inline-flex;align-items:center;color:var(--gold);">${typeof _FX_GAMEPAD_ICON!=='undefined'?_FX_GAMEPAD_ICON:''}</span>`;
    const scoreRow = m => {
      const ta=teamById[m.teamA], tb=teamById[m.teamB];
      const an=m.goalsA||0, bn=m.goalsB||0;
      const isFinal=m.goalsA!=null && m.goalsB!=null && !m.live;
      const center = isFinal
        ? `<span class="score-n ${an<bn?'lose':''}">${an}</span>
            <span class="chip chip-final">Final</span>
            <span class="score-n ${bn<an?'lose':''}">${bn}</span>`
        : '<span class="chip chip-vs">VS</span>';
      const luisMark = m.luisTeam!=null ? luisIcon('Luis controla este equipo') : '';
      const luisLeft  = (luisMark && m.luisTeam===m.teamA) ? luisMark : '';
      const luisRight = (luisMark && m.luisTeam===m.teamB) ? luisMark : '';
      return `<div class="score-row" style="--team-color:${colorOf(ta?.color)};">
        <div class="score-edge"></div>
        <div class="score-body">
          <span class="score-team">${_tkEsc(ta?.name||('#'+m.teamA))}</span>
          <div class="score-nums">${luisLeft}${center}${luisRight}</div>
          <span class="score-team away">${_tkEsc(tb?.name||('#'+m.teamB))}</span>
        </div>
        <div class="score-edge" style="--team-color:${colorOf(tb?.color)};"></div>
      </div>`;
    };
    const scoresHtml = _pubScoresPagerHtml(`${phaseId}-${gi}`, groupMatches, scoreRow, phase.rondaMeta||{}, gi);
    const legend = zones.map(z=>`<span><i style="background:${colorOf(z.color)};"></i>${_tkEsc(z.name||'')}</span>`).join('');

    html += `
    <div class="comps-duo" style="margin-bottom:22px;">
      <div class="stand-card">
        <div class="stand-hdr">
          <span class="stand-title">${_tkEsc(groupName)}</span>
          <button type="button" class="stand-criteria-btn" onclick="openCriteriaModal(${phaseId}, '${containerId}', false)" title="Criterios de clasificación" aria-label="Ver criterios de clasificación">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </button>
        </div>
        <div class="stand-scrollwrap">
          <div class="stand-scroll">
            <div class="stand-grid">
              <div class="stand-colhead" aria-hidden="true">
                <span class="st-fix">Club</span>
                <span class="st-ph">PTS</span><span>PJ</span><span>G</span><span>E</span><span>P</span><span>GF</span><span>GC</span>
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
    if(c) c.innerHTML = '<div style="color:var(--red);font-size:12px;padding:10px;">No pudimos cargar los partidos. Intenta nuevamente.</div>';
  }
}

async function pubSelectComp(compId, phaseId){
  const anchor = _pubCaptureVisualAnchor(document.getElementById('pub-panel-content'));
  window._pubState.compId = compId;
  // phaseId opcional: el CTA del calendario fija la fase del partido; el carrusel de
  // competiciones la omite → null → renderPubPanel toma la primera fase.
  window._pubState.phaseId = phaseId != null ? phaseId : null;
  window._pubState.groupIdx = 0;   // nueva competición → arrancar en el primer grupo
  await renderPubPanel();
  await _pubRestoreVisualAnchor(anchor, 'panel');
}

async function pubSelectPhase(phaseId){
  const anchor = _pubCaptureVisualAnchor(document.getElementById('pub-panel-content'));
  window._pubState.phaseId = phaseId;
  window._pubState.groupIdx = 0;   // nueva fase → arrancar en el primer grupo
  await renderPubPanel();
  await _pubRestoreVisualAnchor(anchor, 'panel');
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
