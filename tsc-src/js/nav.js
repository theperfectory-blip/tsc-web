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
  document.getElementById('pubnav').classList.toggle('open',!isAdmin);
  document.getElementById('sidebar').classList.toggle('open',isAdmin);
  document.getElementById('main').classList.toggle('with-sidebar',isAdmin);
  document.getElementById('btn-pub').classList.toggle('active',!isAdmin);
  document.getElementById('btn-adm').classList.toggle('active',isAdmin);
  // Ajustar margin-top según nav visible
  document.getElementById('main').style.marginTop = isAdmin ? '60px' : '92px';
  if(isAdmin){ goAdminPage(STATE.adminPage); }
  else { goPublicPage(STATE.publicPage); }
}

/* ----------------------------------------------------------
   NAVEGACIÓN PÚBLICA
   ---------------------------------------------------------- */
function goPublicPage(page, tabEl){
  STATE.publicPage = page;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page)?.classList.add('active');
  document.querySelectorAll('.pub-tab').forEach(t=>t.classList.remove('active'));
  if(tabEl) tabEl.classList.add('active');
  else{
    document.querySelectorAll('.pub-tab').forEach(t=>{
      if(t.getAttribute('onclick')?.includes("'"+page+"'")) t.classList.add('active');
    });
  }
  renderPublicPage(page);
}

/* ----------------------------------------------------------
   NAVEGACIÓN ADMIN
   ---------------------------------------------------------- */
function goAdminPage(page, navEl){
  if(typeof liveStop==='function') liveStop();   // sin tiempo real en modo admin
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
  if(typeof liveStop==='function') liveStop();   // cancela tiempo real de la vista anterior
  await refreshSorteoTabVisibility();
  switch(page){
    case 'palmares':      await renderPubPalmares();    break;
    case 'panel':
      await renderPubPanel();
      // Tiempo real: el panel se re-renderiza solo cuando cambian los partidos.
      if(typeof liveSubscribe==='function')
        liveSubscribe('panel-'+STATE.season, 'matches', ()=>renderPubPanel());
      break;
    case 'competiciones': await renderPubComps();       break;
    case 'equipos':       await renderPubTeams();       break;
    case 'sorteo':        await renderPubSorteo();      break;
    case 'historial':     await renderPubHistory();     break;
  }
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
  const tab = document.getElementById('pub-tab-sorteo');
  if(!tab) return;
  let show = false;
  try{
    if(window.SORTEO?.hasContentForSeason){
      show = await window.SORTEO.hasContentForSeason(STATE.season);
    }
  }catch(e){ show = false; }
  tab.style.display = show ? '' : 'none';
  if(!show && STATE.publicPage==='sorteo'){
    STATE.publicPage = 'panel';
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById('page-panel')?.classList.add('active');
  }
}

/* Stubs temporales */
async function renderPubPanel(){}
async function renderPubHistory(){}
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
    <button class="btn btn-primary" onclick="goAdminPage('equipos-admin')">⚑ Gestionar equipos</button>
    <button class="btn btn-primary" onclick="goAdminPage('competiciones-admin')">◉ Nueva competición</button>
    <button class="btn btn-primary" onclick="goAdminPage('partidos-admin')">⚽ Registrar partido</button>
    <button class="btn btn-primary" onclick="goAdminPage('coins-admin')">◎ YuNaCoins</button>
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
  else renderPublicPage(page);
}

/* ----------------------------------------------------------
   MODALES
   ---------------------------------------------------------- */
