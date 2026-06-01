const COMP_TYPES = [
  {id:'league',  icon:'◈', name:'Liga / Grupos',       desc:'Round robin por grupos'},
  {id:'cup',     icon:'◉', name:'Eliminación directa', desc:'Bracket con ida/vuelta'},
  {id:'playoff', icon:'⇄', name:'Playoff cruzado',     desc:'Cruza clasificados'},
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
  ${isFinalized?'<div style="padding:10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt2);font-size:13px;margin-bottom:12px;">⚠ Esta temporada está finalizada. Los cambios no están permitidos.</div>':''}
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
          <div style="font-size:17px;font-weight:600;">${c.name}</div>
          <div style="font-size:13px;color:var(--txt3);margin-top:2px;">${seasonMap[c.season]}</div>
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
        ${c.desc?`<div style="font-size:13px;color:var(--txt2);line-height:1.5;margin-bottom:10px;">${c.desc}</div>`:''}
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
            <button class="btn btn-sm" onclick="openColorPicker(window._compColorGetter(), c=>{ window._compColorGetter=()=>c; document.getElementById('comp-color-preview').style.background=c; document.getElementById('comp-color-hex').textContent=c; })">🎨 Cambiar color</button>
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
