function _esc(v){ return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

const COMP_TYPES = [
  {id:'league',  icon:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>', name:'Liga / Grupos',       desc:'Round robin por grupos'},
  {id:'cup',     icon:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>', name:'Eliminación directa', desc:'Bracket con ida/vuelta'},
  {id:'playoff', icon:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>', name:'Playoff cruzado',     desc:'Cruza clasificados'},
  {id:'super',   icon:'★', name:'Superclásico',        desc:'Partido único o serie'},
];

const PHASE_TYPES = [
  {id:'groups',  name:'Fase de grupos',      desc:'Round robin por grupos'},
  {id:'bracket', name:'Eliminación directa', desc:'Bracket, ida/vuelta config.'},
  {id:'playoff', name:'Playoff cruzado',     desc:'Cruza clasificados de zonas'},
  {id:'single',  name:'Supercopa / Final',   desc:'1 cruce o mini-bracket de 4'},
];



/* ----------------------------------------------------------
   RENDER ADMIN — COMPETICIONES
   ---------------------------------------------------------- */
async function renderAdmComps(){
  const el = document.getElementById('adm-comps-content');
  const comps = await getForSeason('competitions');
  const currentSeason = (await dbGetAll('seasons')).find(s=>s.number===STATE.season);
  const seasonName = getSeasonName(currentSeason);
  const isFinalized = currentSeason?.status==='finished';

  el.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
    <div style="font-size:14px;color:var(--txt2);">${comps.length} competición(es) en ${seasonName}</div>
    <button class="btn btn-primary" onclick="openCompModal()" ${isFinalized?'disabled style="opacity:0.5;cursor:not-allowed;"':''}>+ Nueva competición</button>
  </div>
  ${isFinalized?'<div style="padding:10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt2);font-size:13px;margin-bottom:12px;"><svg style="display:inline;vertical-align:-2px;" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Esta temporada está finalizada. Los cambios no están permitidos.</div>':''}
  <div id="comps-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;"></div>
  <div id="comp-modal-wrap"></div>`;

  window._seasonFinalized = isFinalized;
  await renderCompsGrid(comps);
}

async function renderCompsGrid(comps){
  const el = document.getElementById('comps-grid');
  if(!el) return;
  if(!comps.length){
    el.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--txt3);border:1px dashed var(--brd2);border-radius:var(--rl);">
      <div style="font-size:16px;margin-bottom:12px;">No hay competiciones en esta temporada.</div>
      <button class="btn btn-primary" onclick="openCompModal()">+ Crear primera</button>
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
    <div class="card" style="border-top:4px solid ${c.color||'var(--gold)'};transition:border-color 0.15s;" onmouseover="this.style.boxShadow='0 0 0 1px ${c.color||'var(--gold)'}'" onmouseout="this.style.boxShadow=''">
      <div class="card-hdr">
        <div>
          <div style="font-size:17px;font-weight:600;">${_esc(c.name)}</div>
          <div style="font-size:13px;color:var(--txt3);margin-top:2px;">${_esc(seasonMap[c.season])}</div>
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
        ${c.desc?`<div style="font-size:13px;color:var(--txt2);line-height:1.5;margin-bottom:10px;">${_esc(c.desc)}</div>`:''}
        <div style="display:flex;gap:6px;padding-top:10px;border-top:1px solid var(--brd);">
          <button class="btn btn-sm" data-cid="${c.id}" data-cname="${c.name.replace(/"/g,'&quot;')}" onclick="openFasesForComp(this.dataset.cid,this.dataset.cname)">Ver fases</button>
          <button class="btn btn-sm" onclick="openCompModal(${c.id})" ${c.status==='finished'||window._seasonFinalized?'disabled style="opacity:0.5;cursor:not-allowed;"':''}>Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deleteComp(${c.id})" ${c.status==='finished'||window._seasonFinalized?'disabled style="opacity:0.5;cursor:not-allowed;"':''}>✕</button>
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
  const seasonOpts = seasons.map(s=>`<option value="${s.number}" ${s.number===STATE.season?'selected':''}>${getSeasonName(s)}</option>`).join('');

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
          <input type="text" id="cf-name" value="${comp?.name||''}" placeholder="Liga 1ra División · T1">
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
            <span id="comp-color-hex" style="font-size:13px;color:var(--txt2);font-family:monospace;">${selColor}</span>
            <button class="btn btn-sm" onclick="openColorPicker(window._compColorGetter(), c=>{ window._compColorGetter=()=>c; document.getElementById('comp-color-preview').style.background=c; document.getElementById('comp-color-hex').textContent=c; })"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="17.5" cy="10.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="8.5" cy="7.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="6.5" cy="12.5" r="1.5" fill="currentColor" stroke="none"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg> Cambiar color</button>
          </div>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label>Descripción (opcional)</label>
          <textarea id="cf-desc" placeholder="Ej: 2 grupos de 9 equipos, clasifica al bracket final...">${comp?.desc||''}</textarea>
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

async function saveComp(id){
  const name   = document.getElementById('cf-name').value.trim();
  const season = parseInt(document.getElementById('cf-season').value);
  const teams  = parseInt(document.getElementById('cf-teams').value)||null;
  const status = document.getElementById('cf-status').value;
  const desc   = document.getElementById('cf-desc').value.trim();
  const type   = window._compTypeGetter?.()  || 'league';
  const color  = window._compColorGetter?.() || PALETTE[1];

  if(!name){ showToast('El nombre es obligatorio','error'); return; }

  const data = {name, type, season, totalTeams:teams, status, color, desc, updatedAt:new Date().toISOString()};

  if(id){
    const existing = await dbGet('competitions',id);
    await dbPut('competitions',{...existing,...data});
    showToast('Competición actualizada');
  } else {
    await dbAdd('competitions',{...data, createdAt:new Date().toISOString()});
    showToast('Competición creada');
  }
  closeCompModal();
  renderAdmComps();
}

async function deleteComp(id){
  id = parseInt(id);
  console.log('[deleteComp] id recibido:', id, 'tipo:', typeof id);
  const comp = await dbGet('competitions',id);
  console.log('[deleteComp] comp encontrada:', comp);
  showConfirm(
    '¿Eliminar competición?',
    `Se eliminará "${comp?.name||'esta competición'}" y todas sus fases.`,
    async()=>{
      console.log('[deleteComp] callback ejecutado, borrando id:', id);
      try{
        await dbDelete('competitions',id);
        console.log('[deleteComp] dbDelete competitions OK');
        // verificar que se borró
        const check = await dbGet('competitions',id);
        console.log('[deleteComp] verificación post-delete:', check);
        const fases = await dbGetAll('phases', p=>parseInt(p.compId)===id);
        console.log('[deleteComp] fases a borrar:', fases.length);
        for(const f of fases) await dbDelete('phases',f.id);
        showToast('Competición eliminada');
        await renderAdmComps();
      }catch(e){
        console.error('[deleteComp] ERROR:', e);
        showToast('Error al eliminar: '+e?.message,'error');
      }
    }
  );
}
