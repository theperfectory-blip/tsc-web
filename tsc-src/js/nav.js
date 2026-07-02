/* ----------------------------------------------------------
   PUBLIC SIDEBAR — estado y funciones
   ---------------------------------------------------------- */
let _pubSidebarCollapsed = localStorage.getItem('tsc_pub_sidebar') === 'collapsed';
let _pubHoverTimer = null;

const PUBLIC_SCROLL_PAGES = ['palmares', 'panel', 'calendario', 'equipos', 'sorteo', 'historial'];
const _publicMountedPages = new Set();
const _publicMountPromises = new Map();
let _publicFocusedPage = null;
let _publicFocusToken = 0;

function getPublicScrollPages(){
  return PUBLIC_SCROLL_PAGES.slice();
}

function getMountedPublicPages(){
  return PUBLIC_SCROLL_PAGES.filter(page => _publicMountedPages.has(page));
}

function _isPublicScrollPage(page){
  return PUBLIC_SCROLL_PAGES.includes(page);
}

function _syncPublicNavigation(page, navEl){
  document.querySelectorAll('.pub-nav-item').forEach(t=>t.classList.remove('active'));
  if(navEl && navEl.classList.contains('pub-nav-item')) navEl.classList.add('active');
  else{
    document.querySelectorAll('.pub-nav-item').forEach(t=>{
      if(t.dataset.page === page) t.classList.add('active');
    });
  }
  if(typeof syncRedesignTopnav === 'function') syncRedesignTopnav(page);
  if(page !== 'panel') renderPubSidebarComps().catch(()=>{});
  if(page !== 'historial') renderPubSidebarHistorial();
}

/* Inicializa el flyout-hover del sidebar colapsado (una sola vez, solo escritorio) */
function _initPubSidebarHover(sidebar){
  if(sidebar._hoverInit) return;
  sidebar._hoverInit = true;
  sidebar.addEventListener('mouseenter', ()=>{
    if(!_pubSidebarCollapsed || window.innerWidth <= 768) return;
    clearTimeout(_pubHoverTimer);
    sidebar.classList.add('hover-expand');
  });
  sidebar.addEventListener('mouseleave', ()=>{
    if(!_pubSidebarCollapsed) return;
    _pubHoverTimer = setTimeout(()=> sidebar.classList.remove('hover-expand'), 120);
  });
}

function _applyPubSidebar(visible){
  // Sidebar público retirado: la navegación vive solo en el topnav (topbar fijo, lógica del prototipo).
  // Garantizar que no quede ningún resto visible y dejar #main a ancho completo (sin margen lateral).
  const sidebar  = document.getElementById('pub-sidebar');
  const backdrop = document.getElementById('pub-sidebar-backdrop');
  const main     = document.getElementById('main');
  const menuBtn  = document.getElementById('pub-menu-btn');
  if(sidebar)  sidebar.classList.remove('open','hover-expand','collapsed');
  if(backdrop) backdrop.classList.remove('open');
  if(menuBtn)  menuBtn.style.display = 'none';
  if(main){ main.style.marginLeft = ''; main.style.marginTop = '60px'; }
}

function togglePubSidebar(){
  const sidebar  = document.getElementById('pub-sidebar');
  const backdrop = document.getElementById('pub-sidebar-backdrop');
  const main     = document.getElementById('main');
  const toggleEl = document.getElementById('pub-sidebar-toggle');
  if(!sidebar) return;

  const mobile = window.innerWidth <= 768;
  if(mobile){
    // Móvil: abrir/cerrar cajón
    const isOpen = sidebar.classList.contains('open');
    sidebar.classList.toggle('open', !isOpen);
    if(backdrop) backdrop.classList.toggle('open', !isOpen);
    return;
  }

  // Escritorio: colapsar/expandir
  _pubSidebarCollapsed = !_pubSidebarCollapsed;
  localStorage.setItem('tsc_pub_sidebar', _pubSidebarCollapsed ? 'collapsed' : 'expanded');
  sidebar.classList.toggle('collapsed', _pubSidebarCollapsed);
  sidebar.classList.remove('hover-expand');
  if(toggleEl) toggleEl.innerHTML = _pubSidebarCollapsed ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' : '«';
  if(main) main.style.marginLeft = _pubSidebarCollapsed ? '44px' : '220px';
}

function closePubSidebar(){
  // Solo útil en móvil (backdrop o navegación auto-cierre)
  if(window.innerWidth > 768) return;
  document.getElementById('pub-sidebar')?.classList.remove('open');
  document.getElementById('pub-sidebar-backdrop')?.classList.remove('open');
}

/* ----------------------------------------------------------
   MODO: PÚBLICO / ADMIN
   ---------------------------------------------------------- */
function setMode(mode){
  if(mode==='admin' && STATE.mode!=='admin'){
    // Modo admin requiere sesión iniciada con rol 'admin'
    if(typeof AUTH === 'undefined' || AUTH.role !== 'admin'){
      if(typeof openAuthModal === 'function') openAuthModal();
      else showToast('Inicia sesión como administrador','error');
      return;
    }
  }
  STATE.mode = mode;
  const isAdmin = mode==='admin';
  // Al salir de admin, cerrar el centro de partido en vivo (es solo-gestión).
  if(!isAdmin){ const _lm=document.getElementById('live-match-wrap'); if(_lm) _lm.innerHTML=''; }

  // Admin sidebar
  document.getElementById('sidebar').classList.toggle('open',isAdmin);

  if(isAdmin){
    // Public sidebar oculto + limpiar inline margin para que .with-sidebar CSS actúe
    _applyPubSidebar(false);
    const main = document.getElementById('main');
    if(main){
      main.classList.add('with-sidebar');
      main.classList.remove('public-scroll');
      main.style.marginLeft='';
      main.style.marginTop='60px';
    }
    if(typeof hidePublicTicker==='function') hidePublicTicker();   // oculta + invalida renders pendientes (anti-race)
  } else {
    const main = document.getElementById('main');
    main?.classList.remove('with-sidebar');
    main?.classList.add('public-scroll');
    _applyPubSidebar(true);
    refreshSorteoTabVisibility().catch(()=>{});
    if(typeof renderPublicTicker==='function') renderPublicTicker();   // llamada defensiva (sin dep. de orden de carga)
  }

  document.getElementById('btn-pub')?.classList.toggle('active',!isAdmin);
  document.getElementById('btn-adm')?.classList.toggle('active',isAdmin);
  // Mostrar/ocultar el topnav del rediseño según el modo (oculto en admin) — defensiva
  if(typeof syncRedesignShellMode === 'function') syncRedesignShellMode(mode);
  if(isAdmin){
    _publicFocusedPage = null;
    _publicFocusToken++;
    goAdminPage(STATE.adminPage);
  }
  else { goPublicPage(STATE.publicPage); }
}

/* ----------------------------------------------------------
   NAVEGACIÓN PÚBLICA
   ---------------------------------------------------------- */
function goPublicPage(page, navEl){
  if(page === 'competiciones') page = 'panel';
  if(STATE.mode === 'public' && _isPublicScrollPage(page)){
    closePubSidebar();
    if(typeof scrollToPublicSection === 'function') scrollToPublicSection(page, { navEl });
    else focusPublicSection(page, { navEl });
    return;
  }

  STATE.publicPage = page;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page)?.classList.add('active');
  // Marcar ítem activo en el pub-sidebar
  document.querySelectorAll('.pub-nav-item').forEach(t=>t.classList.remove('active'));
  if(navEl && navEl.classList.contains('pub-nav-item')) navEl.classList.add('active');
  else{
    document.querySelectorAll('.pub-nav-item').forEach(t=>{
      if(t.dataset.page === page) t.classList.add('active');
    });
  }
  // Sincronizar el topnav del rediseño (llamada defensiva — sin dep. de orden de carga)
  if(typeof syncRedesignTopnav === 'function') syncRedesignTopnav(page);
  // Actualizar/limpiar sub-ítems del sidebar según página
  if(page !== 'panel')    renderPubSidebarComps().catch(()=>{});
  if(page !== 'historial') renderPubSidebarHistorial();
  // En móvil: cerrar el cajón al navegar
  closePubSidebar();
  renderPublicPage(page);
}

/* ----------------------------------------------------------
   NAVEGACIÓN ADMIN
   ---------------------------------------------------------- */
function goAdminPage(page, navEl){
  if(typeof liveStop==='function') liveStop();   // sin tiempo real en modo admin
  if(typeof liveRadarStop==='function') liveRadarStop();
  STATE.adminPage = page;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if(navEl) navEl.classList.add('active');
  else{
    document.querySelectorAll('.nav-item').forEach(n=>{
      if(n.getAttribute('onclick')?.includes("'"+page+"'")) n.classList.add('active');
    });
  }
  renderAdminPage(page);
}

/* ----------------------------------------------------------
   RENDER PÁGINAS (stubs — se completan en partes siguientes)
   ---------------------------------------------------------- */
async function renderPublicPage(page){
  switch(page){
    case 'palmares':
      await renderPubPalmares();
      // Palmarés depende de temporadas finalizadas, fases y partidos.
      break;
    case 'panel':
      await renderPubPanel();
      // Panel: partidos (marcadores/vivo) + fases (publicar) + equipos (nombre/logo).
      break;
    case 'competiciones':
      await renderPubComps();
      // Competiciones: estructura de fases, partidos, equipos y competiciones.
      break;
    case 'equipos':
      await renderPubTeams();
      break;
    case 'calendario':
      await renderPubCalendar();
      // Calendario: partidos (programación), fases/equipos (nombres) y
      // calDayLabels (texto del cronograma) → días con texto aparecen al instante.
      break;
    case 'sorteo':        await renderPubSorteo();      break; // tiempo real propio (módulo SORTEO)
    case 'historial':
      await renderPubHistory();
      break;
  }
}

function _subscribeFocusedPublicSection(page){
  if(typeof liveSubscribe !== 'function') return;
  const sub = (key, stores, fn)=>liveSubscribe(key+'-'+STATE.season, stores, fn);
  switch(page){
    case 'palmares':
      sub('palmares', ['palmares','palmares-comps','settings','teams'], ()=>renderPubPalmares());
      break;
    case 'panel':
      sub('panel', ['matches','phases','teams'], ()=>renderPubPanel());
      break;
    case 'equipos':
      sub('equipos', ['teams'], ()=>_refreshPubTeams());
      break;
    case 'calendario':
      sub('calendario', ['matches','phases','teams','calDayLabels'], ()=>renderPubCalendar());
      break;
    case 'historial':
      sub('historial', ['matches','teams','phases'], ()=>renderPubHistory());
      break;
  }
}

async function ensurePublicSectionMounted(page, options){
  const opts = options || {};
  if(!_isPublicScrollPage(page)) return false;
  if(_publicMountedPages.has(page) && !opts.force) return true;
  if(_publicMountPromises.has(page) && !opts.force) return _publicMountPromises.get(page);

  const mount = (async()=>{
    await renderPublicPage(page);
    _publicMountedPages.add(page);
    document.getElementById('page-'+page)?.classList.add('is-mounted');
    document.dispatchEvent(new CustomEvent('tsc:public-section-mounted', { detail:{ page } }));
    return true;
  })().finally(()=>_publicMountPromises.delete(page));

  _publicMountPromises.set(page, mount);
  return mount;
}

async function focusPublicSection(page, options){
  const opts = options || {};
  if(page === 'competiciones') page = 'panel';
  if(STATE.mode !== 'public' || !_isPublicScrollPage(page)) return false;
  const section = document.getElementById('page-'+page);
  if(!section || section.hidden) return false;

  const changed = _publicFocusedPage !== page;
  const token = ++_publicFocusToken;
  STATE.publicPage = page;
  _publicFocusedPage = page;
  document.querySelectorAll('.page.active').forEach(p=>p.classList.remove('active'));
  section.classList.add('active');
  _syncPublicNavigation(page, opts.navEl);

  if(changed || opts.forceLive){
    if(typeof liveStop === 'function') liveStop();
    if(typeof liveRadarStop === 'function') liveRadarStop();
  }

  await ensurePublicSectionMounted(page);
  if(token !== _publicFocusToken || STATE.mode !== 'public' || _publicFocusedPage !== page) return false;

  if(changed || opts.forceLive){
    _subscribeFocusedPublicSection(page);
    // El radar en vivo vive SOLO en el Calendario (junto al hero del partido).
    // Al enfocar la sección con un partido en vivo ya montado, arranca (con fade-in).
    if(page === 'calendario' && window._calHeroLive && typeof liveRadarStart === 'function'){
      liveRadarStart();
    }
  }
  return true;
}

async function renderAdminPage(page){
  switch(page){
    case 'dashboard':           await renderAdmDashboard();   break;
    case 'equipos-admin':       await renderAdmTeams();       break;
    case 'usuarios-admin':      await renderAdmUsuarios();    break;
    case 'competiciones-admin': await renderAdmComps();       break;
    case 'fases-admin':         await renderAdmFases();       break;
    case 'partidos-admin':      await renderAdmMatches();     break;
    case 'sorteo-admin':        await renderAdmSorteo();      break;
    case 'coins-admin':         await renderAdmCoins();       break;
    case 'temporadas-admin':    await renderAdmSeasons();     break;
    case 'datos-admin':         await renderAdmData();        break;
    case 'historial-admin':       await renderAdmHistory();           break;
    case 'historial-tabla-admin': await renderAdmHistoryStandings();   break;
    case 'palmares-admin':        await renderAdmPalmares();           break;
    case 'calendario-admin':      await renderAdmCalendar(); await renderAdmCalendarLabels(); break;
  }
}

/* Bridges sorteo. El módulo sorteo.js maneja el remount automático si cambia
   el contenedor o el modo readOnly. */
async function renderAdmSorteo(){
  if(!window.SORTEO) return;
  await window.SORTEO.init('#sorteo-content', { readOnly:false });
}
async function renderPubSorteo(){
  if(!window.SORTEO) return;
  await window.SORTEO.init('#sorteo-content-pub', { readOnly:true });
}

/* Muestra u oculta la pestaña pública "Sorteo" según haya contenido en la
   temporada actual (algún bombo con equipos). Llamado por renderPublicPage,
   onSeasonChange y por el propio módulo al recibir mensajes de broadcast. */
async function refreshSorteoTabVisibility(){
  const tabs = [document.getElementById('rdp-nav-sorteo'), document.getElementById('pub-nav-sorteo')].filter(Boolean);
  const section = document.getElementById('page-sorteo');
  let show = false;
  try{
    if(window.SORTEO?.hasContentForSeason){
      show = await window.SORTEO.hasContentForSeason(STATE.season);
    }
  }catch(e){ show = false; }
  tabs.forEach(t=> t.style.display = show ? '' : 'none');
  if(section) section.hidden = !show;
  if(typeof refreshPublicScrollSections === 'function') refreshPublicScrollSections();
  if(!show && STATE.publicPage==='sorteo'){
    if(STATE.mode === 'public' && document.getElementById('main')?.classList.contains('public-scroll')){
      if(typeof scrollToPublicSection === 'function') scrollToPublicSection('panel');
      else focusPublicSection('panel');
    }else{
      STATE.publicPage = 'panel';
      document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
      document.getElementById('page-panel')?.classList.add('active');
      if(typeof syncRedesignTopnav==='function') syncRedesignTopnav('panel');
    }
  }
  return show;
}

/* Renderiza sub-ítems de Historial (Partidos | Tabla histórica) */
function renderPubSidebarHistorial(activeTab){
  const container = document.getElementById('pub-sidebar-historial');
  if(!container) return;
  if(STATE.publicPage !== 'historial'){
    container.innerHTML = '';
    return;
  }
  const tab = activeTab || 'partidos';
  container.innerHTML = `
    <div class="pub-sub-comp${tab==='partidos'?' active':''}"
      onclick="renderPubHistory()" title="Partidos">
      Partidos
    </div>
    <div class="pub-sub-comp${tab==='tabla'?' active':''}"
      onclick="renderPubHistoryStandings()" title="Tabla histórica">
      Tabla histórica
    </div>`;
}

/* Renderiza competiciones y fases como sub-ítems del sidebar público */
async function renderPubSidebarComps(){
  const container = document.getElementById('pub-sidebar-comps');
  if(!container) return;
  if(STATE.publicPage !== 'panel'){
    container.innerHTML = '';
    return;
  }
  window._pubState = window._pubState || {};
  const comps = await getForSeason('competitions').catch(()=>[]);
  const isActiveSt = s => {
    if(s==null) return true;
    const n = String(s).trim().toLowerCase();
    return n==='active'||n==='activa'||n==='';
  };
  const active = comps.filter(c=>isActiveSt(c.status));
  if(!active.length){ container.innerHTML=''; return; }

  const selCompId = window._pubState.compId || active[0].id;
  const selComp   = active.find(c=>c.id===selCompId) || active[0];

  const allPhases = await dbGetAll('phases', p=>p.compId===selComp.id).catch(()=>[]);
  const phases = allPhases.filter(p=>{
    if(p.status==null) return true;
    const n = String(p.status).trim().toLowerCase();
    return n==='active'||n==='activa'||n==='';
  }).sort((a,b)=>(a.order||0)-(b.order||0));
  const selPhaseId = window._pubState.phaseId || phases[0]?.id;

  let html = '';
  for(const c of active){
    const isSel = c.id===selComp.id;
    const col   = c.color || 'var(--gold)';
    html += `<div class="pub-sub-comp${isSel?' active':''}"
      onclick="pubSelectComp(${c.id})"
      title="${c.name}"
      ${isSel?`style="color:${col};border-left-color:${col};"`:''}>
      ${c.name}
    </div>`;
    if(isSel){
      for(const p of phases){
        const isPSel = p.id===selPhaseId;
        html += `<div class="pub-sub-phase${isPSel?' active':''}"
          onclick="pubSelectPhase(${p.id})"
          title="${p.name}">
          <span class="pub-sub-dot"></span>${p.name}
        </div>`;
      }
    }
  }
  container.innerHTML = html;
}

async function renderAdmDashboard(){
  const el = document.getElementById('adm-dashboard-content');
  const [teams,comps,matches] = await Promise.all([
    getForSeason('teams'),
    getForSeason('competitions'),
    getForSeason('matches'),
  ]);
  const currentSeason = (await dbGetAll('seasons')).find(s=>s.number===STATE.season);
  const seasonName = getSeasonName(currentSeason);
  el.innerHTML = `
  <div class="grid-4" style="margin-bottom:20px;">
    <div class="stat-card"><div class="stat-num">${teams.length}</div><div class="stat-lbl">Equipos</div></div>
    <div class="stat-card"><div class="stat-num">${comps.length}</div><div class="stat-lbl">Competiciones</div></div>
    <div class="stat-card"><div class="stat-num">${matches.length}</div><div class="stat-lbl">Partidos</div></div>
    <div class="stat-card"><div class="stat-num">${seasonName}</div><div class="stat-lbl">Temporada activa</div></div>
  </div>
  <div class="section-lbl">Acciones rápidas</div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;">
    <button class="btn btn-primary" onclick="goAdminPage('equipos-admin')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> Gestionar equipos</button>
    <button class="btn btn-primary" onclick="goAdminPage('competiciones-admin')"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg> Nueva competición</button>
    <button class="btn btn-primary" onclick="goAdminPage('partidos-admin')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> Registrar partido</button>
    <button class="btn btn-primary" onclick="goAdminPage('coins-admin')"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> YuNaCoins</button>
  </div>`;
}

async function loadSeasons(){
  const seasons = await dbGetAll('seasons');
  const sel = document.getElementById('season-sel');
  sel.innerHTML = '<option value="">Temporada...</option>' +
    seasons.map(s=>`<option value="${s.number}" ${s.number===STATE.season?'selected':''}>${getSeasonName(s)} ${s.status==='active'?'●':''}</option>`).join('');
}

async function onSeasonChange(val){
  if(!val) return;
  STATE.season = parseInt(val);
  window._fwLaunched = {}; // resetear fuegos al cambiar temporada
  await refreshSorteoTabVisibility();
  const page = STATE.mode==='admin' ? STATE.adminPage : STATE.publicPage;
  if(STATE.mode==='admin') renderAdminPage(page);
  else {
    if(typeof liveStop === 'function') liveStop();
    if(typeof liveRadarStop === 'function') liveRadarStop();
    const mounted = getMountedPublicPages();
    for(const mountedPage of mounted){
      const section = document.getElementById('page-'+mountedPage);
      if(section && !section.hidden) await ensurePublicSectionMounted(mountedPage, { force:true });
    }
    await focusPublicSection(STATE.publicPage, { forceLive:true });
    if(typeof renderPublicTicker==='function') renderPublicTicker();
  }
}

window.getPublicScrollPages = getPublicScrollPages;
window.getMountedPublicPages = getMountedPublicPages;
window.ensurePublicSectionMounted = ensurePublicSectionMounted;
window.focusPublicSection = focusPublicSection;

/* ----------------------------------------------------------
   MODALES
   ---------------------------------------------------------- */
