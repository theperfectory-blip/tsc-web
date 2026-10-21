
const COMP_TYPES = [
  {id:'league',  icon:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>', name:'Liga / Grupos',       desc:'Round robin por grupos'},
  {id:'cup',     icon:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>', name:'Eliminación directa', desc:'Bracket con ida/vuelta'},
  {id:'playoff', icon:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>', name:'Playoff cruzado',     desc:'Cruza clasificados'},
  {id:'super',   icon:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>', name:'Superclásico',        desc:'Partido único o serie'},
];

/* Ícono de borrar (Lucide x) para los botones de eliminar de competiciones y fases. */
const _ICON_X = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

const PHASE_TYPES = [
  {id:'groups',  name:'Fase de grupos',      desc:'Round robin por grupos'},
  {id:'bracket', name:'Eliminación directa', desc:'Bracket, ida/vuelta config.'},
  {id:'playoff', name:'Playoff cruzado',     desc:'Cruza clasificados de zonas'},
  {id:'single',  name:'Supercopa / Final',   desc:'1 cruce o mini-bracket de 4'},
];



/* Orden de listado: campo `order` explícito (editable por drag&drop) con
   fallback a `id` para competiciones que todavía no lo tienen — así no se
   reordenan solas al desplegar. Usado por el grid admin y el listado público. */
function _sortComps(comps){
  const key = c => c.order ?? c.id;
  return comps.slice().sort((a,b)=>key(a)-key(b));
}

/* ----------------------------------------------------------
   RENDER ADMIN — COMPETICIONES
   ---------------------------------------------------------- */
async function renderAdmComps(){
  const el = document.getElementById('adm-comps-content');
  const comps = _sortComps(await getForSeason('competitions'));
  const currentSeason = (await dbGetAll('seasons')).find(s=>s.number===STATE.season);
  const seasonName = getSeasonName(currentSeason);
  const isFinalized = currentSeason?.status==='finished';

  el.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
    <div style="font-size:14px;color:var(--txt2);">${comps.length} competición(es) en ${seasonName}</div>
    <div style="display:flex;gap:8px;">
      <button class="btn" onclick="openCompReorderModal()" ${isFinalized||comps.length<2?'disabled style="opacity:0.5;cursor:not-allowed;"':''}>
        <svg style="display:inline;vertical-align:-3px;margin-right:4px;" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        Reordenar
      </button>
      <button class="btn btn-primary" onclick="openCompModal()" ${isFinalized?'disabled style="opacity:0.5;cursor:not-allowed;"':''}>+ Nueva competición</button>
    </div>
  </div>
  ${isFinalized?'<div style="padding:10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt2);font-size:13px;margin-bottom:12px;"><svg style="display:inline;vertical-align:-2px;" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Esta temporada está finalizada. Los cambios no están permitidos.</div>':''}
  <div id="comps-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;"></div>
  <div id="comp-modal-wrap"></div>
  <div id="comp-reorder-wrap"></div>`;

  window._seasonFinalized = isFinalized;
  await renderCompsGrid(comps);
}

async function renderCompsGrid(comps){
  const el = document.getElementById('comps-grid');
  if(!el) return;
  if(!comps.length){
    el.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--txt3);border:1px dashed var(--brd2);border-radius:var(--rl);">
      <div style="font-size:16px;margin-bottom:12px;">No hay competiciones en esta temporada.</div>
      ${window._seasonFinalized?'':'<button class="btn btn-primary" onclick="openCompModal()">+ Crear primera</button>'}
    </div>`;
    return;
  }
  const seasons = await dbGetAll('seasons');
  const seasonMap = Object.fromEntries(seasons.map(s=>[s.number, getSeasonName(s)]));
  el.innerHTML = comps.map(c=>{
    const tipo = COMP_TYPES.find(t=>t.id===c.type)||COMP_TYPES[0];
    const statusCls = c.status==='active'?'badge-green':c.status==='finished'?'badge-gold':'badge-gray';
    const statusLbl = c.status==='active'?'Activa':c.status==='finished'?'Finalizada':'Borrador';
    return `
    <div class="card" style="border-top:4px solid ${safeCssColor(c.color,'var(--gold)')};transition:border-color 0.15s;" onmouseover="this.style.boxShadow='0 0 0 1px ${safeCssColor(c.color,'var(--gold)')}'" onmouseout="this.style.boxShadow=''">
      <div class="card-hdr">
        <div>
          <div style="font-size:17px;font-weight:600;">${escHtml(c.name)}</div>
          <div style="font-size:13px;color:var(--txt3);margin-top:2px;">${escHtml(seasonMap[c.season])}</div>
        </div>
        <span class="badge ${statusCls}">${statusLbl}</span>
      </div>
      <div style="padding:12px 14px;">
        <div style="display:inline-flex;align-items:center;gap:4px;font-size:13px;color:var(--txt3);padding:3px 8px;background:var(--card2);border-radius:20px;border:1px solid var(--brd);margin-bottom:8px;">
          ${tipo.icon} ${tipo.name}
        </div>
        <div style="display:flex;gap:14px;margin-bottom:8px;">
          <div style="font-size:13px;color:var(--txt2);">Equipos: <span style="color:var(--txt);font-weight:600;">${c.totalTeams||'—'}</span></div>
        </div>
        ${c.desc?`<div style="font-size:13px;color:var(--txt2);line-height:1.5;margin-bottom:10px;">${escHtml(c.desc)}</div>`:''}
        <div style="display:flex;gap:6px;padding-top:10px;border-top:1px solid var(--brd);">
          <button class="btn btn-sm" data-cid="${c.id}" data-cname="${escAttr(c.name)}" onclick="openFasesForComp(this.dataset.cid,this.dataset.cname)">Ver fases</button>
          <button class="btn btn-sm" onclick="openCompModal(${c.id})" ${c.status==='finished'||window._seasonFinalized?'disabled style="opacity:0.5;cursor:not-allowed;"':''}>Editar</button>
          <button class="btn btn-sm btn-danger" title="Eliminar competición" aria-label="Eliminar competición" onclick="deleteComp(${c.id})" ${c.status==='finished'||window._seasonFinalized?'disabled style="opacity:0.5;cursor:not-allowed;"':''}>${_ICON_X}</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ----------------------------------------------------------
   MODAL COMPETICIÓN
   ---------------------------------------------------------- */
async function openCompModal(id=null){
  let comp = id ? await dbGet('competitions',id) : null;
  const wrap = document.getElementById('comp-modal-wrap');
  let selType  = comp?.type  || 'league';
  let selColor = comp?.color || PALETTE[1];

  const seasons = await dbGetAll('seasons');
  const seasonOpts = seasons.map(s=>`<option value="${s.number}" ${s.number===(comp?.season??STATE.season)?'selected':''}>${escHtml(getSeasonName(s))}</option>`).join('');

  wrap.innerHTML = `
  <div class="modal-overlay open" id="comp-modal">
    <div class="modal">
      <div class="modal-hdr">
        <div class="modal-title">${id?'Editar competición':'Nueva competición'}</div>
        <button class="modal-close" onclick="closeCompModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Nombre de la competición</label>
          <input type="text" id="cf-name" value="${escAttr(comp?.name||'')}" maxlength="60" placeholder="Liga 1ra División · T1">
        </div>
        <div class="form-group">
          <label>Tipo de formato</label>
          <div id="comp-type-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:4px;"></div>
        </div>
        <div class="form-row3">
          <div class="form-group">
            <label>Temporada</label>
            <select id="cf-season">${seasonOpts}</select>
          </div>
          <div class="form-group">
            <label>Total equipos</label>
            <input type="number" id="cf-teams" value="${comp?.totalTeams||''}" min="2" placeholder="Ej: 32">
          </div>
          <div class="form-group">
            <label>Estado</label>
            <select id="cf-status">
              <option value="draft"    ${comp?.status==='draft'   ?'selected':''}>Borrador</option>
              <option value="active"   ${comp?.status==='active'  ||!comp?'selected':''}>Activa</option>
              <option value="finished" ${comp?.status==='finished'?'selected':''}>Finalizada</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Color identificador</label>
          <div style="display:flex;align-items:center;gap:10px;margin-top:4px;">
            <div id="comp-color-preview" style="width:32px;height:32px;border-radius:6px;background:${selColor};border:1px solid var(--brd2);cursor:pointer;flex-shrink:0;" onclick="openColorPicker(window._compColorGetter(), c=>{ window._compColorGetter=()=>c; document.getElementById('comp-color-preview').style.background=c; document.getElementById('comp-color-hex').textContent=c; })"></div>
            <span id="comp-color-hex" style="font-size:13px;color:var(--txt2);font-family:monospace;">${escHtml(selColor)}</span>
            <button class="btn btn-sm" onclick="openColorPicker(window._compColorGetter(), c=>{ window._compColorGetter=()=>c; document.getElementById('comp-color-preview').style.background=c; document.getElementById('comp-color-hex').textContent=c; })"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="17.5" cy="10.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="8.5" cy="7.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="6.5" cy="12.5" r="1.5" fill="currentColor" stroke="none"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg> Cambiar color</button>
          </div>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label>Descripción (opcional)</label>
          <textarea id="cf-desc" maxlength="500" placeholder="Ej: 2 grupos de 9 equipos, clasifica al bracket final...">${escHtml(comp?.desc||'')}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeCompModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveComp(${id||'null'})">Guardar</button>
      </div>
    </div>
  </div>`;

  // Construir type grid con addEventListener (onclick inline no accede al closure)
  function buildTypeGrid(){
    const grid = document.getElementById('comp-type-grid');
    grid.innerHTML = COMP_TYPES.map(t=>`
      <div data-type="${t.id}" style="padding:9px 10px;border:1px solid ${selType===t.id?'var(--gold)':'var(--brd2)'};border-radius:var(--r);cursor:pointer;background:${selType===t.id?'var(--gold-l)':'transparent'};transition:all 0.15s;">
        <div style="font-size:14px;font-weight:600;">${t.icon} ${t.name}</div>
        <div style="font-size:13px;color:var(--txt2);margin-top:2px;">${t.desc}</div>
      </div>`).join('');
    grid.querySelectorAll('[data-type]').forEach(el=>{
      el.addEventListener('click',()=>{ selType=el.dataset.type; buildTypeGrid(); });
    });
  }

  buildTypeGrid();

  // Exponer para usar en saveComp
  window._compTypeGetter  = ()=>selType;
  window._compColorGetter = ()=>selColor;
}

function closeCompModal(){ document.getElementById('comp-modal-wrap').innerHTML=''; }

let _compSaving = false;

async function saveComp(id){
  if(_compSaving) return;   // doble clic en «Guardar» creaba dos competiciones
  const name   = document.getElementById('cf-name').value.trim();
  const season = parseInt(document.getElementById('cf-season').value);
  const teams  = parseInt(document.getElementById('cf-teams').value)||null;
  const status = document.getElementById('cf-status').value;
  const desc   = document.getElementById('cf-desc').value.trim();
  const type   = window._compTypeGetter?.()  || 'league';
  const color  = window._compColorGetter?.() || PALETTE[1];

  if(!name){ showToast('El nombre es obligatorio','error'); return; }
  if(teams!=null && teams<2){ showToast('El total de equipos debe ser 2 o más','error'); return; }

  const data = {name, type, season, totalTeams:teams, status, color, desc, updatedAt:new Date().toISOString()};

  _compSaving = true;
  try {
    const target = (await dbGetAll('seasons')).find(s=>s.number===season);
    if(!target){ showToast('La temporada elegida no existe','error'); return; }
    if(target.status==='finished'){ showToast(`${getSeasonName(target)} está finalizada: no admite cambios`,'error'); return; }
    if(id){
      const existing = await dbGet('competitions',id);
      if(!existing){ showToast('La competición ya no existe','error'); closeCompModal(); renderAdmComps(); return; }
      await dbPut('competitions',{...existing,...data});
      showToast('Competición actualizada');
    } else {
      await dbAdd('competitions',{...data, createdAt:new Date().toISOString()});
      showToast('Competición creada');
    }
    closeCompModal();
    renderAdmComps();
  } catch(err){
    showToast('No se pudo guardar la competición: '+dbErrorMsg(err),'error');
  } finally {
    _compSaving = false;
  }
}

/* Todo lo que cuelga de un conjunto de fases: sus partidos (matches.phaseId)
   y el registro de historial de cada partido (matchHistory.matchRef).
   Lo comparten el borrado de fase y el de competición (MS-5.3): antes se
   borraba solo la fase y sus partidos quedaban huérfanos (se seguían
   contando en el historial, la tabla histórica y la ficha del club). */
async function _collectPhaseCascade(phaseIds){
  const pids = new Set(phaseIds.map(Number));
  const matches = pids.size ? await dbGetAll('matches', m=>pids.has(m.phaseId)) : [];
  const mids = new Set(matches.map(m=>m.id));
  const matchHist = mids.size ? await dbGetAll('matchHistory', h=>mids.has(h.matchRef)) : [];
  return { matches, matchHist };
}

/* Borra hijos primero (historial → partidos → fases): si algo falla a mitad,
   el padre sigue en pantalla y se puede volver a eliminar para terminar. */
async function _deletePhaseCascade(phases, c){
  const ids = rows => rows.map(r=>r.id);
  await dbDeleteMany('matchHistory', ids(c.matchHist));
  await dbDeleteMany('matches',      ids(c.matches));
  await dbDeleteMany('phases',       ids(phases));
  if(typeof invalidateStandingsCache==='function') phases.forEach(p=>invalidateStandingsCache(p.id));
}

function _cascadeSummary(phases, c){
  const n = (k, one, many) => `${k} ${k===1?one:many}`;
  return [
    phases.length      && n(phases.length, 'fase', 'fases'),
    c.matches.length   && n(c.matches.length, 'partido', 'partidos'),
    c.matchHist.length && n(c.matchHist.length, 'registro del historial', 'registros del historial'),
  ].filter(Boolean);
}

let _compDeleting = false;

async function deleteComp(id){
  id = parseInt(id);
  try {
    const comp = await dbGet('competitions',id);
    if(!comp){ showToast('La competición ya no existe','error'); renderAdmComps(); return; }
    const fases = await dbGetAll('phases', p=>parseInt(p.compId)===id);
    const parts = _cascadeSummary(fases, await _collectPhaseCascade(fases.map(f=>f.id)));
    showConfirm(
      '¿Eliminar competición?',
      `Se eliminará "${comp.name}"`+(parts.length?` junto con ${parts.join(', ')}`:'')+'. Esta acción no se puede deshacer.',
      async()=>{
        if(_compDeleting) return;
        _compDeleting = true;
        try{
          // Se vuelve a leer al confirmar: pudo cambiar con el aviso abierto.
          const fasesNow = await dbGetAll('phases', p=>parseInt(p.compId)===id);
          await _deletePhaseCascade(fasesNow, await _collectPhaseCascade(fasesNow.map(f=>f.id)));
          await dbDelete('competitions',id);
          showToast('Competición eliminada');
        }catch(e){
          showToast('Error al eliminar: '+dbErrorMsg(e),'error');
        }finally{
          _compDeleting = false;
          await renderAdmComps();
        }
      }
    );
  } catch(err){
    showToast('Error al preparar el borrado: '+dbErrorMsg(err),'error');
  }
}

/* ----------------------------------------------------------
   ORDEN DE COMPETICIONES — lista 1D con drag & drop (mismo
   patrón que openCriteriaModal en standings.js: variables de
   arrastre propias, re-render solo de la lista al soltar).
   ---------------------------------------------------------- */
let _compDragId = null, _compDragOverId = null;

async function openCompReorderModal(){
  const comps = _sortComps(await getForSeason('competitions'));
  window._compOrderDraft = comps.map(c=>String(c.id));
  window._compOrderMap   = Object.fromEntries(comps.map(c=>[String(c.id), c]));

  const wrap = document.getElementById('comp-reorder-wrap');
  if(!wrap) return;

  wrap.innerHTML = `
  <div class="modal-overlay open" id="comp-reorder-modal">
    <div class="modal" style="max-width:460px;">
      <div class="modal-hdr">
        <div class="modal-title">Reordenar competiciones</div>
        <button class="modal-close" onclick="closeCompReorderModal()">×</button>
      </div>
      <div class="modal-body">
        <div style="font-size:13px;color:var(--txt2);margin-bottom:14px;line-height:1.5;">
          Arrastra para cambiar el orden en que aparecen (admin y público).
        </div>
        <div id="comp-reorder-list"
          style="display:flex;flex-direction:column;gap:5px;min-height:44px;padding:6px;background:var(--card2);border-radius:var(--r);border:1px solid var(--brd);"
          ondragover="event.preventDefault()" ondrop="compReorderDropOnContainer(event)"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="saveCompOrder()">Guardar orden</button>
        <button class="btn" onclick="closeCompReorderModal()">Cancelar</button>
      </div>
    </div>
  </div>`;
  _renderCompReorderList();
}

function _renderCompReorderList(){
  const el = document.getElementById('comp-reorder-list');
  if(!el) return;
  const order = window._compOrderDraft || [];
  const map   = window._compOrderMap || {};
  el.innerHTML = order.map((id,i)=>{
    const c = map[id];
    if(!c) return '';
    return `
    <div draggable="true" data-id="${id}"
      ondragstart="compReorderDragStart(event)"
      ondragover="compReorderDragOver(event)"
      ondragleave="compReorderDragLeave(event)"
      ondrop="compReorderDrop(event)"
      ondragend="compReorderDragEnd()"
      style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--card);border:1px solid var(--brd2);border-radius:var(--r);cursor:grab;transition:background 0.15s,border-color 0.15s;">
      <span style="color:var(--txt3);display:flex;flex-direction:column;gap:2px;flex-shrink:0;">
        <svg viewBox="0 0 16 10" width="14" height="10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <line x1="1" y1="2" x2="15" y2="2"/><line x1="1" y1="5" x2="15" y2="5"/><line x1="1" y1="8" x2="15" y2="8"/>
        </svg>
      </span>
      <span style="font-size:12px;font-weight:700;color:var(--txt3);min-width:16px;">${i+1}.</span>
      <div style="width:10px;height:10px;border-radius:50%;background:${safeCssColor(c.color,'var(--gold)')};flex-shrink:0;"></div>
      <span style="font-size:14px;flex:1;">${escHtml(c.name)}</span>
    </div>`;
  }).join('');
}

function compReorderDragStart(e){
  _compDragId = e.currentTarget.dataset.id;
  e.currentTarget.style.opacity='0.45';
  e.dataTransfer.effectAllowed='move';
}
function compReorderDragOver(e){
  e.preventDefault();
  e.dataTransfer.dropEffect='move';
  const el = e.currentTarget;
  const id = el.dataset?.id;
  if(id && id!==_compDragId && id!==_compDragOverId){
    _compDragOverId=id;
    document.querySelectorAll('#comp-reorder-list [data-id]').forEach(x=>{ x.style.borderColor=''; x.style.background=''; });
    el.style.borderColor='var(--gold)';
    el.style.background='rgba(201,168,76,0.08)';
  }
}
function compReorderDragLeave(e){
  e.currentTarget.style.borderColor='';
  e.currentTarget.style.background='';
}
function compReorderDragEnd(){
  document.querySelectorAll('#comp-reorder-list [data-id]').forEach(x=>{ x.style.opacity=''; x.style.borderColor=''; x.style.background=''; });
  _compDragId=null; _compDragOverId=null;
}
function compReorderDrop(e){
  e.preventDefault(); e.stopPropagation();
  if(!_compDragId) return;
  const targetId = e.currentTarget.dataset?.id;
  if(!targetId || targetId===_compDragId){ compReorderDragEnd(); return; }
  const ord = [...(window._compOrderDraft||[])];
  const from = ord.indexOf(_compDragId), to = ord.indexOf(targetId);
  if(from===-1||to===-1){ compReorderDragEnd(); return; }
  ord.splice(from,1); ord.splice(to,0,_compDragId);
  window._compOrderDraft = ord;
  _renderCompReorderList();
}
function compReorderDropOnContainer(e){
  e.preventDefault();
  if(!_compDragId) return;
  const ord = [...(window._compOrderDraft||[])];
  const from = ord.indexOf(_compDragId);
  if(from===-1) return;
  ord.splice(from,1); ord.push(_compDragId);
  window._compOrderDraft = ord;
  _renderCompReorderList();
}

function closeCompReorderModal(){
  const el = document.getElementById('comp-reorder-wrap');
  if(el) el.innerHTML='';
  window._compOrderDraft = null;
  window._compOrderMap = null;
}

async function saveCompOrder(){
  const order = window._compOrderDraft || [];
  const map   = window._compOrderMap || {};
  try {
    for(let i=0;i<order.length;i++){
      const c = map[order[i]];
      if(!c || c.order===i) continue; // sin cambio
      await dbPut('competitions', {...c, order:i});
    }
    showToast('Orden guardado');
  } catch(err){
    showToast('No se pudo guardar el orden: '+dbErrorMsg(err),'error');
  }
  closeCompReorderModal();
  renderAdmComps();
}
