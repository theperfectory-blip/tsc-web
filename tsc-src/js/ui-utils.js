function openModal(id){ document.getElementById(id)?.classList.add('open'); }
function closeModal(id){ document.getElementById(id)?.classList.remove('open'); }

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    document.querySelectorAll('.modal-overlay.open,.confirm-overlay.open')
      .forEach(m=>m.classList.remove('open'));
  }
});

/* ----------------------------------------------------------
   CONFIRM DIALOG
   ---------------------------------------------------------- */
let _confirmCb = null;
function showConfirm(title, msg, cb){
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent   = msg;
  _confirmCb = cb;
  document.getElementById('confirm-overlay').classList.add('open');
}
function closeConfirm(){ document.getElementById('confirm-overlay').classList.remove('open'); _confirmCb=null; }
function runConfirm(){ const cb=_confirmCb; closeConfirm(); if(cb) cb(); }

/* ----------------------------------------------------------
   TOAST
   ---------------------------------------------------------- */
function showToast(msg, type='success'){
  const el = document.createElement('div');
  el.className = `toast-item ${type}`;
  el.textContent = (type==='success'?'✓ ':type==='error'?'✕ ':'') + msg;
  document.getElementById('toast').appendChild(el);
  setTimeout(()=>el.remove(), 3000);
}

/* ----------------------------------------------------------
   TEMA
   ---------------------------------------------------------- */
function setTheme(theme){
  STATE.theme = theme;
  document.documentElement.setAttribute('data-theme',theme);
  localStorage.setItem('tsc_theme',theme);
  document.getElementById('theme-dark-btn').classList.toggle('btn-primary',theme==='dark');
  document.getElementById('theme-light-btn').classList.toggle('btn-primary',theme==='light');
}

/* ----------------------------------------------------------
   SETTINGS
   ---------------------------------------------------------- */
function openSettings(){
  openModal('settings-modal');
  // Reflejar el estado de sonido actual en los controles
  const on = document.getElementById('snd-on');
  const vol = document.getElementById('snd-vol');
  if (on && window.SFX)  on.checked = window.SFX.enabled !== false;
  if (vol && window.SFX) vol.value = Math.round((window.SFX.getVolume ? window.SFX.getVolume() : 0.85) * 100);
}

/* Control de sonido GLOBAL (afecta SFX y el palmarés, que lee SFX). */
function setSoundOn(b){
  if (window.SFX){ window.SFX.unlock(); window.SFX.setEnabled(!!b); if (b) window.SFX.radarPing(); }
}
function setSoundVol(v){
  const vol = Math.max(0, Math.min(1, (parseFloat(v) || 0) / 100));
  if (window.SFX){ window.SFX.unlock(); window.SFX.setVolume(vol); }
}
function sndPreview(){
  if (window.SFX && window.SFX.enabled !== false){ window.SFX.unlock(); window.SFX.radarPing(); }
}
function saveSettings(){
  closeModal('settings-modal');
  showToast('Configuración guardada');
}

/* ----------------------------------------------------------
   DATOS INICIALES
   ---------------------------------------------------------- */
const EQUIPOS_INICIALES = [
  {name:'MALVINAS JR',ini:'MJR',status:'ACTIVO',color:'#1A4A7A'},
  {name:'STAR',ini:'STR',status:'INACTIVO',color:'#888',previousNames:['STAR FC']},
  {name:'REAL MAIZ FC',ini:'RMZ',status:'INACTIVO',color:'#888'},
  {name:'XENEIZES FC',ini:'XEN',status:'ACTIVO',color:'#003087'},
  {name:'RETRATO LO RETRO',ini:'RLR',status:'ACTIVO',color:'#8B1A1A'},
  {name:'SOY TRONCO FC',ini:'STF',status:'INACTIVO',color:'#888'},
  {name:'METALEROS',ini:'MET',status:'INACTIVO',color:'#888'},
  {name:'MIRASOL FC',ini:'MIR',status:'INACTIVO',color:'#888'},
  {name:'GANEN O BAN',ini:'GOB',status:'ACTIVO',color:'#1A5E3A'},
  {name:'LA BOLSA FC',ini:'LBF',status:'INACTIVO',color:'#888'},
  {name:'MOTILONES HH',ini:'MOT',status:'INACTIVO',color:'#888'},
  {name:'AC DORMIDOS',ini:'ACD',status:'INACTIVO',color:'#888'},
  {name:'EXPRESO ROJO',ini:'EXR',status:'INACTIVO',color:'#888'},
  {name:'COMANDO THRASH',ini:'CTH',status:'INACTIVO',color:'#888'},
  {name:'CENTINELA LIMA',ini:'CLM',status:'ACTIVO',color:'#5A1A8B'},
  {name:'PYRAMIDS',ini:'PYR',status:'ACTIVO',color:'#B8860B'},
  {name:'AC ANGELES ROJOS',ini:'AAR',status:'ACTIVO',color:'#C0392B',previousNames:['AC. ANGELES ROJOS','DIABLOS ROJOS','AC DIABLOS ROJOS','AC. DIABLOS ROJOS']},
  {name:'FC PROMETEUS',ini:'FCP',status:'ACTIVO',color:'#2C3E50'},
  {name:'NEW GRANADE',ini:'NGR',status:'INACTIVO',color:'#888'},
  {name:'U DE CHILE',ini:'UDC',status:'INACTIVO',color:'#888'},
  {name:'INDEP. CORDERO',ini:'IND',status:'ACTIVO',color:'#7B241C'},
  {name:'WAKANDA FC',ini:'WAK',status:'ACTIVO',color:'#1A3A5C'},
  {name:'GUERREROS Z',ini:'GUZ',status:'INACTIVO',color:'#888'},
  {name:'PARAGUAYOS FC',ini:'PAR',status:'INACTIVO',color:'#888'},
  {name:'VENDEHUESOS FC',ini:'VEN',status:'INACTIVO',color:'#888'},
  {name:'FENOMENOS FC',ini:'FEN',status:'ACTIVO',color:'#1A5C1A'},
  {name:'D. SIESTA',ini:'DSI',status:'ACTIVO',color:'#4A235A'},
  {name:'SARNOSAS FC',ini:'SAR',status:'ACTIVO',color:'#784212'},
  {name:'ESCARLATAS FC',ini:'ESC',status:'ACTIVO',color:'#922B21'},
  {name:'SS FACCIO',ini:'SSF',status:'INACTIVO',color:'#888'},
  {name:'JUAN CARLOS FC',ini:'JCF',status:'INACTIVO',color:'#888'},
  {name:'LOS NHUPIS',ini:'NHU',status:'ACTIVO',color:'#1A3A1A'},
  {name:'REAL A OCANHA',ini:'RAO',status:'INACTIVO',color:'#888'},
  {name:'AL ASATIR',ini:'ALA',status:'INACTIVO',color:'#888'},
  {name:'FARIA FC',ini:'FAR',status:'INACTIVO',color:'#888'},
  {name:'ATL. JUNIOR YOSHUA',ini:'AJY',status:'ACTIVO',color:'#1F618D'},
  {name:'GUARANI AF',ini:'GUA',status:'INACTIVO',color:'#888'},
  {name:'TROTA MUNDOS FC',ini:'TRO',status:'ACTIVO',color:'#1A4A2E'},
  {name:'ATL. LECHUGUERO',ini:'ALE',status:'ACTIVO',color:'#2E4A1A'},
  {name:'LA TOCATA AS',ini:'LTA',status:'ACTIVO',color:'#4A4A1A'},
  {name:'FC PREHISTORICOS',ini:'PRE',status:'ACTIVO',color:'#3D2B1F'},
  {name:'YUNAITED FC',ini:'YUN',status:'ACTIVO',color:'#1A1A4A'},
  {name:'CHAPULINES FC',ini:'CHA',status:'ACTIVO',color:'#2E7D32'},
  {name:'WOLFES',ini:'WOL',status:'INACTIVO',color:'#888'},
  {name:'BULLDOGS FC',ini:'BUL',status:'ACTIVO',color:'#4A1A1A'},
  {name:'NEOHALCONES SOLARES FC',ini:'NHS',status:'ACTIVO',color:'#1A3A4A',previousNames:['HALCONES SOLARES CF']},
  {name:'REDS LFC',ini:'RED',status:'ACTIVO',color:'#C0392B'},
  {name:'CARBONEROS FC',ini:'CAR',status:'INACTIVO',color:'#888'},
  {name:'CD SAN JUAN',ini:'CSJ',status:'INACTIVO',color:'#888'},
  {name:'JAOZ FC',ini:'JAO',status:'INACTIVO',color:'#888'},
  {name:'SHOHOKU',ini:'SHO',status:'INACTIVO',color:'#888'},
  {name:'COSA NOSTRA',ini:'CNO',status:'INACTIVO',color:'#888'},
  {name:'CESAR FC',ini:'CES',status:'ACTIVO',color:'#1A4A4A'},
  {name:'RIVER PLATE 96',ini:'RIV',status:'ACTIVO',color:'#922B21'},
  {name:'ALBERDI 23',ini:'ALB',status:'ACTIVO',color:'#1A1A3A'},
  {name:'BOCA JR 98',ini:'BOC',status:'INACTIVO',color:'#888'},
  {name:'SAN MARTIN DE MENDOZA',ini:'SMM',status:'ACTIVO',color:'#1A3A1A'},
  {name:'SOLEB CS FC',ini:'SOL',status:'ACTIVO',color:'#3A1A4A'},
  {name:'BLUES FC',ini:'BLU',status:'ACTIVO',color:'#1A2A4A'},
  {name:'FK TUPADRE',ini:'FKT',status:'ACTIVO',color:'#3A3A1A'},
];

async function seedInitialData(){
  const seasons = await dbGetAll('seasons');
  if(seasons.length>0) return; // ya inicializado
  // Temporada 1
  await dbAdd('seasons',{number:1,status:'active',createdAt:new Date().toISOString()});
  // 60 equipos
  for(const eq of EQUIPOS_INICIALES){
    await dbAdd('teams',{...eq,yunacoin:0,logo:null,season:1,pres:'',createdAt:new Date().toISOString()});
  }
  showToast('Base de datos inicializada con 60 equipos');
}


/* ----------------------------------------------------------
   MIGRACIÓN: Convertir nombres de equipos a IDs
   ---------------------------------------------------------- */
async function migrateTeamNamesToIds(){
  const teams = await dbGetAll('teams');
  const nameToId = {};
  teams.forEach(t=>nameToId[t.name]=t.id);

  // Migrar fases (grupos)
  const phases = await dbGetAll('phases');
  for(const phase of phases){
    if(phase.groups){
      let needsUpdate = false;
      const newGroups = {};
      Object.entries(phase.groups).forEach(([idx, teamList])=>{
        if(Array.isArray(teamList)){
          const converted = teamList.map(item=>{
            // Si es un número, ya es ID
            if(typeof item === 'number' || Number.isFinite(parseInt(item))) return parseInt(item);
            // Si es string, buscar el ID del equipo
            if(nameToId[item]) { needsUpdate=true; return nameToId[item]; }
            // Si no encuentra, mantener como está
            return item;
          });
          newGroups[idx] = converted;
        }
      });
      if(needsUpdate) await dbPut('phases', {...phase, groups:newGroups});
    }
  }

  // Migrar partidos (teamA, teamB)
  const matches = await dbGetAll('matches');
  for(const match of matches){
    let needsUpdate = false;
    const updated = {...match};
    if(match.teamA && typeof match.teamA === 'string' && nameToId[match.teamA]){
      updated.teamA = nameToId[match.teamA];
      needsUpdate = true;
    }
    if(match.teamB && typeof match.teamB === 'string' && nameToId[match.teamB]){
      updated.teamB = nameToId[match.teamB];
      needsUpdate = true;
    }
    if(needsUpdate) await dbPut('matches', updated);
  }
}

/* ----------------------------------------------------------
   MIGRACIÓN: Sincronizar previousNames del seed con teams en IDB
   Si el seed agregó variantes de nombres (ej. "AC. ANGELES ROJOS" como
   previousName de "AC ANGELES ROJOS"), aseguramos que los equipos ya
   creados las tengan también. Sin esto la tabla histórica sigue contando
   esas variantes como equipos separados.
   ---------------------------------------------------------- */
async function syncTeamPreviousNames(){
  const flag = await dbGetAll('settings', s=>s.key==='teamsSyncedPrevNames_v1');
  if(flag.length>0) return;
  const teams = await dbGetAll('teams');
  const seedByName = {};
  EQUIPOS_INICIALES.forEach(eq => { seedByName[eq.name] = eq; });
  let updated = 0;
  for(const t of teams){
    const seed = seedByName[t.name];
    if(!seed?.previousNames?.length) continue;
    const existing = Array.isArray(t.previousNames) ? t.previousNames : [];
    const merged = [...new Set([...existing, ...seed.previousNames])];
    if(merged.length !== existing.length){
      await dbPut('teams', {...t, previousNames: merged});
      updated++;
    }
  }
  await dbAdd('settings', {key:'teamsSyncedPrevNames_v1', value:true});
  if(updated > 0) console.log(`[teams] previousNames sincronizados en ${updated} equipos`);
}

/* ----------------------------------------------------------
   MIGRACIÓN v3: DIABLOS ROJOS es el nombre ANTIGUO de AC ANGELES ROJOS
   (corrige la v2, que erróneamente los había separado).
   - Elimina el equipo independiente DIABLOS ROJOS si existe
   - Agrega "DIABLOS ROJOS" (y variantes) a previousNames de AC ANGELES ROJOS
   Así los partidos históricos jugados como DIABLOS ROJOS cuentan para
   AC ANGELES ROJOS en la tabla histórica. Auto-corrige datos existentes.
   ---------------------------------------------------------- */
async function migrateTeamsV3MergeDiablos(){
  const flag = await dbGetAll('settings', s=>s.key==='teamsMergedV3Diablos');
  if(flag.length>0) return;
  const teams = await dbGetAll('teams');

  // 1. Agregar los nombres de DIABLOS a previousNames de AC ANGELES ROJOS
  const angeles = teams.find(t => t.name === 'AC ANGELES ROJOS');
  if (angeles) {
    const namesToAdd = ['DIABLOS ROJOS','AC DIABLOS ROJOS','AC. DIABLOS ROJOS'];
    const existing = Array.isArray(angeles.previousNames) ? angeles.previousNames : [];
    const merged = [...new Set([...existing, ...namesToAdd])];
    if (merged.length !== existing.length) {
      await dbPut('teams', {...angeles, previousNames: merged});
    }
  }

  // 2. Eliminar el equipo independiente DIABLOS ROJOS (es el mismo club)
  const diablos = teams.find(t => t.name === 'DIABLOS ROJOS');
  if (diablos) {
    await dbDelete('teams', diablos.id);
  }

  await dbAdd('settings', {key:'teamsMergedV3Diablos', value:true, at:new Date().toISOString()});
  console.log('[teams] migración v3: DIABLOS ROJOS fusionado en AC ANGELES ROJOS');
}

/* ----------------------------------------------------------
   MIGRACIÓN v4: re-asignar títulos huérfanos a AC ANGELES ROJOS
   Al fusionar DIABLOS ROJOS (v3) se borró el equipo, dejando registros
   de palmarés apuntando a un teamId que ya no existe. Los re-apunta a
   AC ANGELES ROJOS (el mismo club). En instalaciones nuevas no hay
   huérfanos (el seed mapea por previousNames), así que es no-op.
   ---------------------------------------------------------- */
async function migratePalmaresV4DiablosToAngeles(){
  const flag = await dbGetAll('settings', s=>s.key==='palmaresDiablosV4');
  if(flag.length>0) return;
  const teams = await dbGetAll('teams');
  const angeles = teams.find(t => t.name === 'AC ANGELES ROJOS');
  if (angeles) {
    const teamIds = new Set(teams.map(t => t.id));
    const pal = await dbGetAll('palmares');
    let fixed = 0;
    for (const p of pal) {
      if (!teamIds.has(p.teamId)) {           // teamId huérfano (era DIABLOS)
        await dbPut('palmares', {...p, teamId: angeles.id});
        fixed++;
      }
    }
    if (fixed) console.log(`[palmares] migración v4: ${fixed} títulos huérfanos re-asignados a AC ANGELES ROJOS`);
  }
  await dbAdd('settings', {key:'palmaresDiablosV4', value:true, at:new Date().toISOString()});
}

/* ----------------------------------------------------------
   ARRANQUE
   ---------------------------------------------------------- */
window.addEventListener('load', async ()=>{
  await initDB();
  const savedTheme = localStorage.getItem('tsc_theme')||'dark';
  setTheme(savedTheme);
  await seedInitialData();
  if(typeof seedHistoryIfEmpty==='function') await seedHistoryIfEmpty();
  // Migrar datos antiguos con nombres a IDs
  await migrateTeamNamesToIds();
  // Sincronizar previousNames (resuelve duplicados en tabla histórica)
  await syncTeamPreviousNames();
  // v3: DIABLOS ROJOS es el nombre antiguo de AC ANGELES ROJOS (fusionar)
  await migrateTeamsV3MergeDiablos();
  // Sembrar palmarés histórico si la IDB está vacía
  if(typeof seedPalmaresIfEmpty==='function') await seedPalmaresIfEmpty();
  // v4: re-asignar títulos huérfanos de DIABLOS ROJOS a AC ANGELES ROJOS
  await migratePalmaresV4DiablosToAngeles();
  await loadSeasons();
  setMode('public');
  // Inicializar autenticación (Firebase Auth + roles)
  if(typeof onAuthInit === 'function') onAuthInit();
});

/* ----------------------------------------------------------
   SINCRONIZACIÓN DINÁMICA DE EQUIPOS
   Cuando cambia un equipo, recarga las vistas que lo muestran
   ---------------------------------------------------------- */
async function notifyTeamChanged(teamId){
  // Limpiar cachés de datos resueltos
  if(typeof _resolveCache !== 'undefined'){
    Object.keys(_resolveCache).forEach(key => delete _resolveCache[key]);
  }
  if(typeof _standingsCache !== 'undefined'){
    _standingsCache.clear?.();
  }

  // Regenerar registros de historial para la temporada actual si el equipo cambió de nombre
  if(typeof refreshHistoryForSeason === 'function'){
    await refreshHistoryForSeason(STATE.season);
  }

  // Recargar la vista actual si es relevante
  const currentMode = STATE.mode;
  const currentPage = currentMode === 'admin' ? STATE.adminPage : STATE.publicPage;

  // Si estamos en historial, recargar
  if(currentPage === 'historial-admin' || currentPage === 'historial'){
    if(currentMode === 'admin' && typeof renderAdmHistory === 'function'){
      await renderAdmHistory();
    } else if(typeof renderPubHistory === 'function'){
      await renderPubHistory();
    }
  }

  // Si estamos en grupos, recargar tabla de posiciones
  if(currentPage === 'standings' && typeof renderAdmFases === 'function'){
    await renderAdmFases();
  }

  // Si estamos viendo una fase con grupos, recargar
  if(window._matchPhaseId && typeof showMatchGroupTable === 'function'){
    await showMatchGroupTable(window._matchPhaseId, window._matchGroupIdx || 0);
  }

  // Si estamos en brackets, recargar
  if(window._bracketPhaseId && typeof renderBracket === 'function'){
    await renderBracket(window._bracketPhaseId, 'pub-bracket-content', false);
  }

  // Si estamos en panel público, recargar
  if(currentPage === 'panel' && typeof renderPubPanel === 'function'){
    await renderPubPanel();
  }

  // Si estamos en vista de equipos, recargar
  if((currentPage === 'equipos' || currentPage === 'teams') && typeof renderAdmTeams === 'function'){
    await renderAdmTeams();
  }
}
