/* ----------------------------------------------------------
   FASES — navegación desde competición
   ---------------------------------------------------------- */
let _currentCompId   = null;
let _currentCompName = '';

/* Helpers para validación contra comp.totalTeams */
function computePhaseTeamTotal(type, config){
  if(!config) return null;
  if(type==='groups'){
    const sizes = Array.isArray(config.groupSizes) && config.groupSizes.length
      ? config.groupSizes
      : Array(config.ngroups||0).fill(config.teamsPerGroup||0);
    return sizes.reduce((a,b)=>a+(parseInt(b)||0), 0) || null;
  }
  if(type==='bracket') return parseInt(config.teams)||null;
  if(type==='playoff') return (parseInt(config.matchups)||0) * 2 || null;
  if(type==='single')  return parseInt(config.teams)||null;
  return null;
}

function _esc(v){
  return String(v==null?'':v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function openFasesForComp(compId, compName){
  _currentCompId   = compId;
  _currentCompName = compName;
  goAdminPage('fases-admin');
}

/* ----------------------------------------------------------
   RENDER ADMIN — FASES
   ---------------------------------------------------------- */
async function renderAdmFases(){
  const el = document.getElementById('adm-fases-content');

  // Si no hay competición seleccionada, mostrar selector
  const comps = await getForSeason('competitions');
  const currentSeason = (await dbGetAll('seasons')).find(s=>s.number===STATE.season);
  const isFinalized = currentSeason?.status==='finished';

  // Si la comp seleccionada no pertenece a esta temporada (o ya no existe), resetear
  if(_currentCompId && !comps.some(c=>c.id===_currentCompId)){
    _currentCompId = null;
    _currentCompName = '';
  }
  if(!_currentCompId && comps.length>0) _currentCompId = comps[0].id, _currentCompName = comps[0].name;

  const compOpts = comps.map(c=>`<option value="${c.id}" ${c.id===_currentCompId?'selected':''}>${c.name}</option>`).join('');

  el.innerHTML = `
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
    <div style="font-size:14px;color:var(--txt2);">Competición:</div>
    <select id="fase-comp-sel" onchange="onFaseCompChange(this.value)"
      style="padding:6px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:14px;">
      ${compOpts}
    </select>
    <button class="btn btn-primary btn-sm" onclick="openPhaseModal()" ${!_currentCompId||isFinalized?'disabled':''} style="${isFinalized?'opacity:0.5;cursor:not-allowed;':''}">+ Nueva fase</button>
  </div>
  ${isFinalized?'<div style="padding:10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt2);font-size:13px;margin-bottom:12px;"><svg style="display:inline;vertical-align:-2px;" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Esta temporada está finalizada. Los cambios no están permitidos.</div>':''}
  <div id="phases-list" style="display:flex;flex-direction:column;gap:10px;"></div>
  <div id="phase-modal-wrap"></div>`;

  if(_currentCompId) await renderPhasesList();
}

async function onFaseCompChange(val){
  _currentCompId = parseInt(val);
  const comp = await dbGet('competitions', _currentCompId);
  _currentCompName = comp?.name||'';
  await renderPhasesList();
}

async function renderPhasesList(){
  const el = document.getElementById('phases-list');
  if(!el) return;
  const currentSeason = (await dbGetAll('seasons')).find(s=>s.number===STATE.season);
  const isFinalized = currentSeason?.status==='finished';
  const phases = await dbGetAll('phases', p=>p.compId===_currentCompId);
  const sorted  = phases.sort((a,b)=>a.order-b.order);

  if(!sorted.length){
    el.innerHTML=`<div style="text-align:center;padding:32px;color:var(--txt3);border:1px dashed var(--brd2);border-radius:var(--rl);">
      <div style="font-size:16px;margin-bottom:10px;">No hay fases en esta competición.</div>
      <button class="btn btn-primary btn-sm" onclick="openPhaseModal()">+ Crear primera fase</button>
    </div>`;
    return;
  }

  el.innerHTML = sorted.map(p=>{
    const tipo = PHASE_TYPES.find(t=>t.id===p.type)||PHASE_TYPES[0];
    // v1.7.01: Borrador más llamativo (las fases en borrador NO aparecen en público)
    const isDraft = p.status==='draft';
    const isDone  = p.status==='done';
    const statusCls = isDraft?'badge-warn':isDone?'badge-gold':'badge-green';
    const statusLbl = isDraft?'⚠ Borrador (oculto al público)':isDone?'Finalizada':'Activa';
    const typeColor = p.type==='groups'?'#3B82F6':p.type==='bracket'?'#8B5CF6':p.type==='playoff'?'#C9A84C':p.type==='single'?'#F59E0B':'#888';

    // Meta info
    let meta = '';
    if(p.type==='groups' && p.config){
      meta += `<span class="badge badge-gray">${p.config.ngroups||0} grupos · ${p.config.teamsPerGroup||0} eq. c/u</span> `;
    }
    if(p.type==='bracket' && p.config){
      meta += `<span class="badge badge-gray">${p.config.teams||0} equipos</span> `;
      meta += `<span class="badge badge-gray">${p.config.legs==='double'?'Ida y vuelta':'Partido único'}</span> `;
    }
    if(p.type==='playoff' && p.config){
      meta += `<span class="badge badge-gray">${p.config.legs==='2'?'Ida y vuelta':'Partido único'}</span> `;
    }

    // v1.7.01: botón rápido para publicar/despublicar
    const togglePublishBtn = isDone
      ? '' // Si está finalizada, no toggle
      : `<button class="btn btn-sm" title="${isDraft?'Publicar (visible al público)':'Despublicar (ocultar al público)'}"
           onclick="togglePhasePublish(${p.id})"
           style="${isDraft?'background:var(--green);color:#000;font-weight:600;':''}">
           ${isDraft?'▲ Publicar':'▼ Ocultar'}
         </button>`;

    return `
    <div class="card" style="border-left:4px solid ${typeColor};${isDraft?'opacity:0.85;':''}">
      <div style="display:flex;align-items:stretch;">
        <div style="flex:1;padding:12px 14px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
            <div style="width:22px;height:22px;border-radius:50%;background:${typeColor}22;color:${typeColor};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0;">${p.order}</div>
            <div style="font-size:16px;font-weight:600;flex:1;">${p.name}</div>
            <span class="badge badge-blue" style="font-size:11px;">${tipo.name}</span>
            <span class="badge ${statusCls}">${statusLbl}</span>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">${meta}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;padding:12px;border-left:1px solid var(--brd);">
          ${togglePublishBtn}
          <button class="btn btn-sm" onclick="openPhaseModal(${p.id})" ${isFinalized?'disabled style="opacity:0.5;cursor:not-allowed;"':''}>Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deletePhase(${p.id})" ${isFinalized?'disabled style="opacity:0.5;cursor:not-allowed;"':''}>✕</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// v1.7.01: toggle rápido publicar/despublicar
async function togglePhasePublish(phaseId){
  const phase = await dbGet('phases', phaseId);
  if(!phase) return;
  const newStatus = phase.status==='draft' ? 'active' : 'draft';
  await dbPut('phases', {...phase, status:newStatus, updatedAt:new Date().toISOString()});
  showToast(newStatus==='active' ? `"${phase.name}" publicada` : `"${phase.name}" oculta al público`);
  await renderPhasesList();
}

/* ----------------------------------------------------------
   MODAL FASE
   ---------------------------------------------------------- */
async function openPhaseModal(id=null){
  let phase = id ? await dbGet('phases',id) : null;
  const wrap = document.getElementById('phase-modal-wrap');
  let selType = phase?.type || 'groups';
  let zones = phase?.zones ? JSON.parse(JSON.stringify(phase.zones)) : [
    {color:'#3B82F6', name:'Clasifica siguiente fase', positions:[], count:0},
    {color:'#E84040', name:'Eliminado', positions:[], count:0},
  ];

  // Fases de grupos disponibles para fase derivada
  const groupPhases = await dbGetAll('phases', p=>p.compId===_currentCompId && p.type==='groups');
  const gpOpts = groupPhases.map(p=>`<option value="${p.id}" ${phase?.originPhaseId===p.id?'selected':''}>${p.name}</option>`).join('');

  // Total de equipos declarado por la competición (para mostrar como referencia)
  const _comp = _currentCompId ? await dbGet('competitions', _currentCompId) : null;
  const _compTotal = parseInt(_comp?.totalTeams);
  const compInfoBanner = Number.isFinite(_compTotal) && _compTotal > 0
    ? `<div style="background:var(--card2);border:1px solid var(--brd);border-left:3px solid var(--gold);border-radius:var(--r);padding:8px 12px;margin-bottom:12px;font-size:13px;color:var(--txt2);">
         <strong style="color:var(--txt);">${_esc(_comp.name)}</strong> declara <strong style="color:var(--gold);">${_compTotal} equipos</strong>. La configuración de esta fase no puede excederlos.
       </div>`
    : (_comp ? `<div style="background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);padding:8px 12px;margin-bottom:12px;font-size:12px;color:var(--txt3);">
         La competición <strong>${_esc(_comp.name)}</strong> no declara total de equipos. Configurá <em>Total equipos</em> en la competición para activar la validación.
       </div>` : '');

  wrap.innerHTML = `
  <div class="modal-overlay open" id="phase-modal">
    <div class="modal" style="max-width:560px;">
      <div class="modal-hdr">
        <div class="modal-title">${id?'Editar fase':'Nueva fase'}</div>
        <button class="modal-close" onclick="closePhaseModal()">×</button>
      </div>
      <div class="modal-body">
        ${compInfoBanner}
        <div class="form-group">
          <label>Nombre de la fase</label>
          <input type="text" id="pf-name" value="${phase?.name||''}" placeholder="Ej: Fase de grupos, Cuartos de final...">
        </div>

        <div class="form-group">
          <label>Tipo de fase</label>
          <div id="phase-type-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:4px;"></div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Estado</label>
            <select id="pf-status">
              <option value="draft"  ${phase?.status==='draft' ?'selected':''}>Borrador</option>
              <option value="active" ${phase?.status==='active' || !phase?'selected':''}>Activa</option>
              <option value="done"   ${phase?.status==='done'  ?'selected':''}>Finalizada</option>
            </select>
          </div>
          <div class="form-group">
            <label>Orden</label>
            <input type="number" id="pf-order" value="${phase?.order||1}" min="1">
          </div>
        </div>

        <!-- Config: Grupos -->
        <div id="cfg-groups" style="display:none;">
          <div style="font-size:12px;color:var(--txt3);text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--brd);padding-bottom:4px;margin-bottom:10px;">Configuración de grupos</div>
          <div class="form-row">
            <div class="form-group">
              <label>Nº de grupos</label>
              <input type="number" id="pf-ngroups" value="${phase?.config?.ngroups||2}" min="1" max="16">
            </div>
            <div class="form-group">
              <label>Formato</label>
              <select id="pf-groups-legs">
                <option value="1" ${(phase?.config?.legs||1)==1?'selected':''}>Media temporada (ida)</option>
                <option value="2" ${phase?.config?.legs==2?'selected':''}>Temporada completa (ida y vuelta)</option>
              </select>
            </div>
          </div>
          <div id="group-sizes-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;"></div>
          <div style="font-size:12px;color:var(--txt3);text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--brd);padding-bottom:4px;margin-bottom:10px;">Zonas de clasificación</div>
          <div id="zones-list" style="display:flex;flex-direction:column;gap:6px;"></div>
          <button onclick="addZone()" style="margin-top:6px;width:100%;padding:6px;border:1px dashed var(--brd2);background:transparent;color:var(--txt2);border-radius:var(--r);cursor:pointer;font-size:14px;">+ Agregar zona</button>
        </div>

        <!-- Config: Bracket -->
        <div id="cfg-bracket" style="display:none;">
          <div style="font-size:12px;color:var(--txt3);text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--brd);padding-bottom:4px;margin-bottom:10px;">Configuración del bracket</div>
          <div class="form-row">
            <div class="form-group">
              <label>Nº de equipos</label>
              <select id="pf-bteams">
                ${[4,8,16,32].map(n=>`<option value="${n}" ${(phase?.config?.teams||16)===n?'selected':''}>${n} equipos</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>3er y 4to lugar</label>
              <select id="pf-third">
                <option value="0" ${!phase?.config?.thirdPlace?'selected':''}>No</option>
                <option value="1" ${phase?.config?.thirdPlace?'selected':''}>Sí</option>
              </select>
            </div>
          </div>
          <div class="toggle-row">
            <label>Ida y vuelta en todas las rondas</label>
            <label class="toggle"><input type="checkbox" id="pf-legsall" ${phase?.config?.legs==='double'?'checked':''}><span class="toggle-slider"></span></label>
          </div>
          <div class="toggle-row">
            <label>Gol de visita desempata (ida y vuelta)</label>
            <label class="toggle"><input type="checkbox" id="pf-bawaygoal" ${phase?.config?.awayGoal?'checked':''}><span class="toggle-slider"></span></label>
          </div>
          <div class="toggle-row">
            <label>Final a partido único</label>
            <label class="toggle"><input type="checkbox" id="pf-finalonly" ${phase?.config?.finalSingle!==false?'checked':''}><span class="toggle-slider"></span></label>
          </div>
        </div>

        <!-- Config: Playoff -->
        <div id="cfg-playoff" style="display:none;">
          <div style="font-size:12px;color:var(--txt3);text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--brd);padding-bottom:4px;margin-bottom:10px;">Configuración del playoff</div>
          <div class="form-row">
            <div class="form-group">
              <label>Nº de cruces</label>
              <input type="number" id="pf-matchups" value="${phase?.config?.matchups||3}" min="1">
            </div>
            <div class="form-group">
              <label>Partidos por cruce</label>
              <select id="pf-playoff-legs">
                <option value="1" ${phase?.config?.legs==='1'?'selected':''}>Partido único</option>
                <option value="2" ${phase?.config?.legs!=='1'?'selected':''}>Ida y vuelta</option>
              </select>
            </div>
          </div>
          <div class="toggle-row">
            <label>Gol de visitante como desempate</label>
            <label class="toggle"><input type="checkbox" id="pf-awaygoal" ${phase?.config?.awayGoal?'checked':''}><span class="toggle-slider"></span></label>
          </div>
        </div>

        <!-- Config: Supercopa / Final (single) -->
        <div id="cfg-single" style="display:none;">
          <div style="font-size:12px;color:var(--txt3);text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--brd);padding-bottom:4px;margin-bottom:10px;">Configuración de la supercopa</div>
          <div class="form-row">
            <div class="form-group">
              <label>Modo</label>
              <select id="pf-single-mode">
                <option value="2" ${(phase?.config?.teams||2)==2?'selected':''}>1 cruce (2 equipos)</option>
                <option value="4" ${phase?.config?.teams==4?'selected':''}>Mini-bracket (4 equipos)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Partidos por cruce</label>
              <select id="pf-single-legs">
                ${(()=>{
                  // Normalizar: bracket usa 'single'/'double', playoff usa '1'/'2'
                  const raw = phase?.config?.legs;
                  const isDouble = raw==='double' || raw==='2' || raw===2;
                  return `
                    <option value="single" ${!isDouble?'selected':''}>Partido único</option>
                    <option value="double" ${isDouble?'selected':''}>Ida y vuelta</option>
                  `;
                })()}
              </select>
            </div>
          </div>
          <div class="toggle-row" id="pf-single-finalrow" style="display:none;">
            <label>Final a partido único (solo en mini-bracket)</label>
            <label class="toggle"><input type="checkbox" id="pf-single-finalonly" ${phase?.config?.finalSingle!==false?'checked':''}><span class="toggle-slider"></span></label>
          </div>
          <div class="toggle-row">
            <label>Gol de visitante como desempate</label>
            <label class="toggle"><input type="checkbox" id="pf-single-awaygoal" ${phase?.config?.awayGoal?'checked':''}><span class="toggle-slider"></span></label>
          </div>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closePhaseModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="savePhase(${id||'null'})">Guardar fase</button>
      </div>
    </div>
  </div>`;

  function buildPhaseTypeGrid(){
    const grid = document.getElementById('phase-type-grid');
    grid.innerHTML = PHASE_TYPES.map(t=>`
      <div data-type="${t.id}" style="padding:9px 10px;border:1px solid ${selType===t.id?'var(--gold)':'var(--brd2)'};border-radius:var(--r);cursor:pointer;background:${selType===t.id?'var(--gold-l)':'transparent'};transition:all 0.15s;">
        <div style="font-size:14px;font-weight:600;">${t.name}</div>
        <div style="font-size:13px;color:var(--txt2);margin-top:2px;">${t.desc}</div>
      </div>`).join('');
    grid.querySelectorAll('[data-type]').forEach(el=>{
      el.addEventListener('click',()=>{ selType=el.dataset.type; buildPhaseTypeGrid(); togglePhaseSections(); });
    });
  }

  function togglePhaseSections(){
    ['groups','bracket','playoff','single'].forEach(s=>{
      const el = document.getElementById('cfg-'+s);
      if(el) el.style.display = selType===s ? '' : 'none';
    });
    // Cuando es single, mostrar toggle "final único" solo si modo = 4 equipos
    if(selType==='single'){
      const modeSel = document.getElementById('pf-single-mode');
      const finalRow = document.getElementById('pf-single-finalrow');
      if(modeSel && finalRow){
        const updateFinalRow = ()=>{
          finalRow.style.display = (parseInt(modeSel.value)===4) ? '' : 'none';
        };
        updateFinalRow();
        modeSel.onchange = updateFinalRow;
      }
    }
  }

  // groupSizes: array con el nº de equipos por cada grupo
  let groupSizes = phase?.config?.groupSizes
    ? [...phase.config.groupSizes]
    : Array.from({length: phase?.config?.ngroups||2}, ()=> phase?.config?.teamsPerGroup||9);

  function renderGroupSizes(){
    const el = document.getElementById('group-sizes-list');
    if(!el) return;
    const n = parseInt(document.getElementById('pf-ngroups')?.value)||2;
    // Ajustar array al nº de grupos actual
    while(groupSizes.length < n) groupSizes.push(groupSizes[groupSizes.length-1]||9);
    groupSizes.length = n;

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px;">
        ${groupSizes.map((sz,i)=>`
          <div class="form-group" style="margin:0;">
            <label style="font-size:12px;">Grupo ${String.fromCharCode(65+i)}</label>
            <input type="number" data-gidx="${i}" value="${sz}" min="2" max="32"
              style="padding:5px 8px;border-radius:var(--r);border:1px solid var(--brd);background:var(--card2);color:var(--txt);font-size:14px;width:100%;">
          </div>`).join('')}
      </div>`;

    // Listeners para actualizar groupSizes y re-renderizar zonas
    el.querySelectorAll('[data-gidx]').forEach(inp=>{
      inp.addEventListener('input', ()=>{
        const i = parseInt(inp.dataset.gidx);
        groupSizes[i] = parseInt(inp.value)||9;
        document.getElementById('pos-picker-drop')?.remove();
        renderZones();
      });
    });
  }

  function getGroupSizes(){
    return [...groupSizes];
  }

  function getTeamsPerGroup(){
    // Retorna el máximo entre todos los grupos (para el picker de posiciones)
    return Math.max(...groupSizes, 1);
  }

  function getTakenPositions(exceptIdx=null){
    // Retorna mapa { groupIdx: Set<pos> } de posiciones tomadas por otras zonas
    const takenByGroup = {};
    zones.forEach((z,i)=>{
      if(i===exceptIdx) return;
      const pos = z.positions;
      if(!pos) return;
      if(Array.isArray(pos)){
        // Legacy: aplica a todos los grupos
        groupSizes.forEach((_,gi)=>{
          if(!takenByGroup[gi]) takenByGroup[gi] = new Set();
          pos.forEach(p=>takenByGroup[gi].add(p));
        });
      } else if(typeof pos === 'object'){
        Object.keys(pos).forEach(gi=>{
          const gIdx = parseInt(gi);
          if(!takenByGroup[gIdx]) takenByGroup[gIdx] = new Set();
          (pos[gi]||[]).forEach(p=>takenByGroup[gIdx].add(p));
        });
      }
    });
    return takenByGroup;
  }

  function renderZones(){
    const el = document.getElementById('zones-list');
    if(!el) return;
    const sizes = getGroupSizes();
    const ngroups = sizes.length;

    el.innerHTML = zones.map((z,i)=>{
      const positions = z.positions||[];
      let label;
      if(!positions || (Array.isArray(positions) && positions.length===0) || Object.keys(positions).length===0){
        label = 'Sin posiciones';
      } else if(ngroups === 1){
        const arr = Array.isArray(positions) ? positions : (positions[0]||[]);
        label = arr.map(p=>`${p+1}°`).join(', ') || 'Sin posiciones';
      } else {
        // Mostrar resumen por grupo
        label = sizes.map((_,gi)=>{
          const arr = Array.isArray(positions) ? positions : (positions[gi]||[]);
          return arr.length ? `G${String.fromCharCode(65+gi)}:${arr.map(p=>p+1).join(',')}` : null;
        }).filter(Boolean).join(' ') || 'Sin posiciones';
      }

      return `
      <div style="display:grid;grid-template-columns:28px 1fr auto 28px;align-items:center;gap:6px;margin-bottom:2px;">
        <div data-zone-color="${i}" style="width:24px;height:24px;border-radius:50%;background:${z.color};cursor:pointer;border:2px solid rgba(255,255,255,0.2);flex-shrink:0;" title="Cambiar color"></div>
        <input data-zone-name="${i}" value="${z.name}" placeholder="Nombre de zona"
          style="padding:5px 8px;border-radius:var(--r);border:1px solid var(--brd);background:var(--card2);color:var(--txt);font-size:14px;width:100%;">
        <button data-zone-pos="${i}" style="padding:4px 10px;border-radius:var(--r);border:1px solid var(--brd2);background:var(--card2);color:${label!=='Sin posiciones'?'var(--txt)':'var(--txt3)'};font-size:13px;cursor:pointer;white-space:nowrap;min-width:90px;text-align:left;max-width:160px;overflow:hidden;text-overflow:ellipsis;" title="${label}">
          ${label!=='Sin posiciones' ? label : '+ Posiciones'}
        </button>
        <button onclick="removeZone(${i})" style="background:none;border:none;color:var(--txt3);cursor:pointer;font-size:22px;line-height:1;padding:2px;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--txt3)'">×</button>
      </div>`;
    }).join('');

    // ⚠️ CRÍTICO: Sincronizar nombres de zona cuando se editan (input + blur)
    el.querySelectorAll('[data-zone-name]').forEach(inp=>{
      inp.addEventListener('input', ()=>{
        const idx = parseInt(inp.dataset.zoneName);
        if(zones[idx]) zones[idx].name = inp.value.trim();
      });
      inp.addEventListener('blur', ()=>{
        const idx = parseInt(inp.dataset.zoneName);
        if(zones[idx]) zones[idx].name = inp.value.trim();
      });
    });

    // Color picker
    el.querySelectorAll('[data-zone-color]').forEach(dot=>{
      dot.addEventListener('click',()=>{
        const i = parseInt(dot.dataset.zoneColor);
        openColorPicker(zones[i].color, c=>{ zones[i].color=c; renderZones(); });
      });
    });

    // Selector de posiciones
    el.querySelectorAll('[data-zone-pos]').forEach(btn=>{
      btn.addEventListener('click', e=>{
        e.stopPropagation();
        const i = parseInt(btn.dataset.zonePos);
        openPositionPicker(i, btn);
      });
    });

    window._zonesRef = zones;
  }

  function openPositionPicker(zoneIdx, anchorEl){
    const sizes = getGroupSizes();
    const ngroups = sizes.length;

    document.getElementById('pos-picker-drop')?.remove();

    const takenByGroup = getTakenPositions(zoneIdx);

    // Convertir positions al formato objeto por grupo
    const rawPos = zones[zoneIdx].positions || {};
    const current = {};
    sizes.forEach((_,gi)=>{
      if(Array.isArray(rawPos)){
        current[gi] = new Set(rawPos);
      } else {
        current[gi] = new Set(rawPos[gi]||rawPos[String(gi)]||[]);
      }
    });

    let activeGroup = 0;

    const drop = document.createElement('div');
    drop.id = 'pos-picker-drop';

    // Posicionamiento inteligente — nunca fuera de pantalla
    const rect = anchorEl.getBoundingClientRect();
    const dropW = 220;
    const left  = Math.min(rect.left, window.innerWidth - dropW - 8);
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow > 200 ? rect.bottom + 4 : rect.top - 210;

    drop.style.cssText = `
      position:fixed;left:${left}px;top:${top}px;
      z-index:6000;background:var(--card);border:1px solid var(--brd2);
      border-radius:var(--r);padding:8px;width:${dropW}px;
      box-shadow:0 4px 16px rgba(0,0,0,0.4);`;

    const renderDrop = ()=>{
      const sz = sizes[activeGroup]||9;
      const takenSet = takenByGroup[activeGroup] || new Set();

      const tabs = ngroups > 1
        ? `<div style="display:flex;gap:3px;margin-bottom:8px;flex-wrap:wrap;">
            ${sizes.map((_,gi)=>`
              <button data-gtab="${gi}" style="padding:2px 8px;border-radius:3px;font-size:13px;cursor:pointer;
                border:1px solid ${gi===activeGroup?'var(--gold)':'var(--brd2)'};
                background:${gi===activeGroup?'var(--gold-l)':'var(--card2)'};
                color:${gi===activeGroup?'var(--gold)':'var(--txt2)'};">
                G${String.fromCharCode(65+gi)}
              </button>`).join('')}
          </div>` : '';

      drop.innerHTML = `
        <div style="font-size:12px;color:var(--txt3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
          Posiciones${ngroups>1?` · Grupo ${String.fromCharCode(65+activeGroup)}`:''}
        </div>
        ${tabs}
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
          ${Array.from({length:sz},(_,p)=>{
            const isTaken = takenSet.has(p);
            const isSel   = current[activeGroup]?.has(p);
            return `<button data-pos="${p}" style="
              width:30px;height:30px;border-radius:var(--r);font-size:13px;font-weight:600;
              cursor:${isTaken?'not-allowed':'pointer'};
              border:2px solid ${isSel?zones[zoneIdx].color:'var(--brd2)'};
              background:${isSel?zones[zoneIdx].color+'33':isTaken?'var(--brd)':'var(--card2)'};
              color:${isTaken?'var(--txt3)':isSel?zones[zoneIdx].color:'var(--txt2)'};
              opacity:${isTaken?'0.4':'1'};transition:all 0.1s;"
              ${isTaken?'disabled':''}>
              ${p+1}
            </button>`;
          }).join('')}
        </div>
        <div style="display:flex;justify-content:flex-end;gap:6px;">
          <button id="pos-pick-cancel" class="btn btn-sm">Cancelar</button>
          <button id="pos-pick-ok" class="btn btn-primary btn-sm">Aplicar</button>
        </div>`;

      drop.querySelectorAll('[data-gtab]').forEach(b=>{
        b.addEventListener('mousedown', e=>{
          e.stopPropagation();
          activeGroup = parseInt(b.dataset.gtab);
          renderDrop();
        });
      });

      drop.querySelectorAll('[data-pos]').forEach(b=>{
        if(!b.disabled) b.addEventListener('mousedown', e=>{
          e.stopPropagation();
          const p = parseInt(b.dataset.pos);
          if(!current[activeGroup]) current[activeGroup] = new Set();
          if(current[activeGroup].has(p)) current[activeGroup].delete(p);
          else current[activeGroup].add(p);
          renderDrop();
        });
      });

      drop.querySelector('#pos-pick-cancel').addEventListener('mousedown', e=>{
        e.stopPropagation(); drop.remove();
      });
      drop.querySelector('#pos-pick-ok').addEventListener('mousedown', e=>{
        e.stopPropagation();
        // Preservar nombres editados en los inputs ANTES de reconstruir el HTML
        document.querySelectorAll('#zones-list input[type=text]').forEach((inp,i)=>{
          if(zones[i]) zones[i].name = inp.value;
        });
        const posObj = {};
        sizes.forEach((_,gi)=>{
          posObj[gi] = Array.from(current[gi]||[]).sort((a,b)=>a-b);
        });
        zones[zoneIdx].positions = posObj;
        zones[zoneIdx].count = Math.max(...Object.values(posObj).map(a=>a.length), 0);
        drop.remove();
        renderZones();
      });
    };

    renderDrop();
    document.body.appendChild(drop);

    requestAnimationFrame(()=>{
      const closeHandler = (e)=>{
        if(!drop.contains(e.target)){
          drop.remove();
          document.removeEventListener('mousedown', closeHandler);
        }
      };
      document.addEventListener('mousedown', closeHandler);
    });
  }

  window.addZone = ()=>{
    const defaults = ['#3B82F6','#25A864','#E84040','#C9A84C','#8B5CF6','#F97316'];
    const used = zones.map(z=>z.color);
    const next = defaults.find(c=>!used.includes(c))||'#888888';
    zones.push({color:next, name:'Nueva zona', positions:{}, count:0});
    renderZones();
  };
  window.removeZone = (i)=>{ zones.splice(i,1); renderZones(); };

  window._phaseTypeGetter = ()=>selType;
  window._zonesGetter     = ()=>zones;
  window._groupSizesGetter = ()=>groupSizes;

  buildPhaseTypeGrid();
  togglePhaseSections();
  renderGroupSizes();
  renderZones();

  // Cuando cambia nº de grupos → re-renderizar tamaños y zonas
  document.getElementById('pf-ngroups')?.addEventListener('input', ()=>{
    document.getElementById('pos-picker-drop')?.remove();
    renderGroupSizes();
    renderZones();
  });

  // Cuando cambia equipos por grupo → cerrar picker y re-renderizar zonas
  document.getElementById('pf-tpg')?.addEventListener('input', ()=>{
    document.getElementById('pos-picker-drop')?.remove();
    renderZones();
  });
} // fin openPhaseModal

function closePhaseModal(){ document.getElementById('phase-modal-wrap').innerHTML=''; }

async function savePhase(id){
  id = (id && id!=='null') ? parseInt(id) : null;
  const name   = document.getElementById('pf-name').value.trim();
  const status = document.getElementById('pf-status').value;
  const order  = parseInt(document.getElementById('pf-order').value)||1;
  const type   = window._phaseTypeGetter?.() || 'groups';

  if(!name){ showToast('El nombre es obligatorio','error'); return; }

  // ⚠️ CRÍTICO: Sincronizar nombres de zonas antes de guardar
  if(type==='groups'){
    const zonesList = document.getElementById('zones-list');
    if(zonesList){
      const zones = window._zonesGetter?.() || [];
      zonesList.querySelectorAll('input[type=text]').forEach((inp, i)=>{
        if(zones[i]) zones[i].name = inp.value.trim();
      });
    }
  }

  let config = {};
  if(type==='groups'){
    const ngroups = parseInt(document.getElementById('pf-ngroups').value)||2;
    const sizes   = window._groupSizesGetter?.() || Array(ngroups).fill(9);
    const legs    = parseInt(document.getElementById('pf-groups-legs')?.value)||1;
    config = {
      ngroups,
      groupSizes:   sizes,
      teamsPerGroup: Math.max(...sizes),
      legs, // 1=media temporada, 2=temporada completa
    };
  } else if(type==='bracket'){
    config = {
      teams:       parseInt(document.getElementById('pf-bteams').value)||16,
      legs:        document.getElementById('pf-legsall').checked?'double':'single',
      thirdPlace:  document.getElementById('pf-third').value==='1',
      finalSingle: document.getElementById('pf-finalonly').checked,
      awayGoal:    document.getElementById('pf-bawaygoal')?.checked||false,
    };
  } else if(type==='playoff'){
    config = {
      matchups: parseInt(document.getElementById('pf-matchups').value)||3,
      legs:     document.getElementById('pf-playoff-legs').value,
      awayGoal: document.getElementById('pf-awaygoal').checked,
    };
  } else if(type==='single'){
    const teams = parseInt(document.getElementById('pf-single-mode').value)||2;
    const legsRaw = document.getElementById('pf-single-legs').value; // 'single' | 'double'
    if(teams===4){
      // Mini-bracket: usa formato bracket
      config = {
        teams,
        legs:        legsRaw, // 'single' | 'double'
        finalSingle: document.getElementById('pf-single-finalonly')?.checked!==false,
        thirdPlace:  false,
        awayGoal:    document.getElementById('pf-single-awaygoal').checked,
      };
    } else {
      // 1 cruce: usa formato playoff de 1 matchup
      config = {
        teams,
        matchups: 1,
        legs:     legsRaw==='double' ? '2' : '1',
        awayGoal: document.getElementById('pf-single-awaygoal').checked,
      };
    }
  }

  const zones = window._zonesGetter?.() || [];
  const data  = {
    name, type, status, order, config,
    zones: type==='groups' ? zones : [],
    compId: _currentCompId,
    updatedAt: new Date().toISOString(),
  };

  // ── Validación: total de equipos de la fase ≤ comp.totalTeams ──
  // Solo se valida si la competición tiene `totalTeams` declarado.
  const _comp = _currentCompId ? await dbGet('competitions', _currentCompId) : null;
  const _compTotal = parseInt(_comp?.totalTeams);
  if(Number.isFinite(_compTotal) && _compTotal > 0){
    const phaseTotal = computePhaseTeamTotal(type, config);
    if(phaseTotal != null && phaseTotal > _compTotal){
      showToast(`La fase requiere ${phaseTotal} equipos pero "${_comp.name}" declara ${_compTotal}. Ajustá la configuración o aumentá el total de la competición.`,'error');
      return;
    }
  }

  if(id){
    const existing = await dbGet('phases',id);
    await dbPut('phases',{...existing,...data});
    invalidateStandingsCache(id); // zonas cambiaron, invalidar cache
    showToast('Fase actualizada');
  } else {
    await dbAdd('phases',{...data, createdAt:new Date().toISOString()});
    showToast('Fase creada');
  }
  closePhaseModal();
  renderPhasesList();
  // Si la tabla de partidos está visible, refrescarla para aplicar las nuevas zonas
  if(document.getElementById('adm-matches-content')?.closest('.page.active')){
    renderAdmMatches();
  }
}

async function deletePhase(id){
  const phase = await dbGet('phases',id);
  showConfirm(
    '¿Eliminar fase?',
    `Se eliminará "${phase?.name}" y todos sus partidos asociados.`,
    async()=>{
      await dbDelete('phases',id);
      showToast('Fase eliminada');
      renderPhasesList();
    }
  );
}

/* ----------------------------------------------------------
   RENDER PÚBLICO — COMPETICIONES
   ---------------------------------------------------------- */
async function renderPubComps(){
  const el = document.getElementById('pub-comps-content');
  const comps = await getForSeason('competitions');
  // v1.7: filtro tolerante (igual criterio que renderPubPanel)
  const isActiveStatus = s => {
    if(s==null) return true;
    const norm = String(s).trim().toLowerCase();
    return norm==='active' || norm==='activa' || norm==='';
  };
  const active = comps.filter(c=>isActiveStatus(c.status));

  if(!active.length){
    el.innerHTML=`<div style="color:var(--txt3);font-size:16px;">No hay competiciones activas en T${STATE.season}.</div>`;
    return;
  }

  el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;">
    ${active.map(c=>{
      const tipo = COMP_TYPES.find(t=>t.id===c.type)||COMP_TYPES[0];
      return `
      <div class="card" style="border-top:4px solid ${c.color||'var(--gold)'};padding:14px;">
        <div style="font-size:17px;font-weight:600;margin-bottom:4px;">${c.name}</div>
        <div style="display:inline-flex;align-items:center;gap:4px;font-size:13px;color:var(--txt3);padding:2px 8px;background:var(--card2);border-radius:20px;border:1px solid var(--brd);margin-bottom:8px;">
          ${tipo.icon} ${tipo.name}
        </div>
        <div style="font-size:13px;color:var(--txt2);">Equipos: <strong>${c.totalTeams||'—'}</strong></div>
        ${c.desc?`<div style="font-size:13px;color:var(--txt3);margin-top:6px;line-height:1.5;">${c.desc}</div>`:''}
      </div>`;
    }).join('')}
  </div>`;
}
