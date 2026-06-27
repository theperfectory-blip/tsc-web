/* ==========================================================
   PARTE 2 — MÓDULO DE EQUIPOS
   ========================================================== */

function _esc(v){ return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ----------------------------------------------------------
   RENDER ADMIN — EQUIPOS
   ---------------------------------------------------------- */
async function renderAdmTeams(){
  const el = document.getElementById('adm-teams-content');
  const teams = await dbGetAll('teams');

  // Mapa teamId → comps en que participa (temporada activa, dinámico al render).
  window._teamCompMap = (typeof buildTeamCompMap==='function')
    ? await buildTeamCompMap()
    : new Map();

  // Mapa teamId → presidente vinculado (cuenta users.teamId).
  window._presByTeam = (typeof buildPresidentByTeam==='function')
    ? await buildPresidentByTeam()
    : {};

  el.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <input type="text" id="team-search" placeholder="Buscar equipo..." oninput="filterTeamsTable()"
        style="padding:7px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:14px;width:180px;">
      <select id="team-status-filter" onchange="filterTeamsTable()"
        style="padding:7px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:14px;">
        <option value="">Todos</option>
        <option value="ACTIVO">Activos</option>
        <option value="INACTIVO">Inactivos</option>
      </select>
    </div>
    <button class="btn btn-primary" onclick="openTeamModal()">+ Nuevo equipo</button>
  </div>
  <div class="card">
    <div class="tbl-wrap">
      <table class="tbl" id="teams-tbl">
        <thead>
          <tr>
            <th style="width:40px;">#</th>
            <th style="width:44px;">Logo</th>
            <th>Nombre</th>
            <th>Iniciales</th>
            <th>Presidente</th>
            <th>Estado</th>
            <th>Competiciones (T${STATE.season})</th>
            <th style="text-align:right;">YuNaCoins</th>
            <th style="width:100px;">Acciones</th>
          </tr>
        </thead>
        <tbody id="teams-tbody"></tbody>
      </table>
    </div>
  </div>
  <div id="team-modal-wrap"></div>`;

  renderTeamsTable(teams);
}

function renderTeamsTable(teams){
  const tbody = document.getElementById('teams-tbody');
  if(!tbody) return;
  if(!teams.length){
    tbody.innerHTML=`<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--txt3);">No hay equipos.</td></tr>`;
    return;
  }
  const tcMap = window._teamCompMap;
  const compsOf = (tid)=>{
    if(!tcMap) return [];
    return (tcMap instanceof Map) ? (tcMap.get(tid)||[]) : (tcMap[tid]||[]);
  };
  const escTxt = (v)=>String(v==null?'':v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  tbody.innerHTML = teams.map((t,i)=>{
    const comps = compsOf(t.id);
    const chips = comps.length
      ? `<div style="display:flex;gap:3px;flex-wrap:wrap;">` + comps.map(c=>{
          const safeName = escTxt(c.name);
          const color = c.color || 'var(--gold)';
          return `<span title="${safeName}" style="font-size:10px;font-weight:600;color:${color};background:${color}22;border:1px solid ${color}44;border-radius:3px;padding:1px 6px;line-height:1.4;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;">● ${safeName}</span>`;
        }).join('') + `</div>`
      : `<span style="font-size:11px;color:var(--txt3);">—</span>`;
    return `
    <tr id="team-row-${t.id}">
      <td style="color:var(--txt3);">${i+1}</td>
      <td>
        <div style="width:32px;height:32px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:${t.color||'#333'};flex-shrink:0;">
          ${t.logo
            ? `<img src="${t.logo}" style="width:100%;height:100%;object-fit:cover;">`
            : `<span style="font-family:'Bebas Neue';font-size:11px;color:#fff;">${t.ini||'?'}</span>`
          }
        </div>
      </td>
      <td style="font-weight:600;">${t.name}</td>
      <td><span class="badge badge-gray">${t.ini||'—'}</span></td>
      <td style="color:var(--txt2);">${(()=>{const p=(window._presByTeam&&window._presByTeam[t.id])||t.pres;return p?`<span style="display:inline-flex;align-items:center;gap:5px;">${escTxt(p)}${(window._presByTeam&&window._presByTeam[t.id])?'<span title="Cuenta vinculada" style="font-size:9px;color:var(--green);">●</span>':''}</span>`:'<span style="color:var(--txt3);">—</span>';})()}</td>
      <td>
        <span class="badge ${t.status==='ACTIVO'?'badge-green':'badge-gray'}">
          ${t.status||'ACTIVO'}
        </span>
      </td>
      <td>${chips}</td>
      <td style="text-align:right;font-family:'Bebas Neue';font-size:19px;color:var(--gold);">${t.yunacoin||0}</td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-xs" onclick="openTeamModal(${t.id})">Editar</button>
          <button class="btn btn-xs btn-danger" onclick="deleteTeam(${t.id})">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function filterTeamsTable(){
  const search = document.getElementById('team-search')?.value.toLowerCase()||'';
  const status = document.getElementById('team-status-filter')?.value||'';
  let teams = await dbGetAll('teams');
  if(search) teams = teams.filter(t=>t.name.toLowerCase().includes(search)||t.ini?.toLowerCase().includes(search));
  if(status) teams = teams.filter(t=>t.status===status);
  renderTeamsTable(teams);
}

/* ----------------------------------------------------------
   MODAL EQUIPO
   ---------------------------------------------------------- */
async function openTeamModal(id=null){
  let team = id ? await dbGet('teams',id) : null;
  const wrap = document.getElementById('team-modal-wrap');
  // Cuentas para el selector de presidente (vínculo real users.teamId).
  const _presUsers = (typeof loadUsersForSelect==='function') ? await loadUsersForSelect() : [];
  const _presLinkedUid = id ? (_presUsers.find(u=>u.teamId===id)?.uid || '') : '';
  const _presEsc = (v)=>String(v==null?'':v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  wrap.innerHTML = `
  <div class="modal-overlay open" id="team-modal">
    <div class="modal">
      <div class="modal-hdr">
        <div class="modal-title">${id?'Editar equipo':'Nuevo equipo'}</div>
        <button class="modal-close" onclick="closeTeamModal()">×</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:16px;">
          <!-- Logo uploader -->
          <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;">
            <div id="logo-preview" style="width:64px;height:64px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:${team?.color||'#333'};border:2px solid var(--brd2);cursor:pointer;" onclick="document.getElementById('logo-file').click()">
              ${team?.logo
                ? `<img src="${team.logo}" style="width:100%;height:100%;object-fit:cover;">`
                : `<span style="font-family:'Bebas Neue';font-size:17px;color:#fff;" id="logo-ini-preview">${team?.ini||'?'}</span>`
              }
            </div>
            <input type="file" id="logo-file" accept="image/*" style="display:none;" onchange="previewLogo(this)">
            <button class="btn btn-xs" onclick="document.getElementById('logo-file').click()">Subir logo</button>
            ${team?.logo?`<button class="btn btn-xs btn-danger" onclick="removeLogo()">Quitar</button>`:''}
          </div>
          <div style="flex:1;">
            <div class="form-group">
              <label>Nombre del equipo</label>
              <input type="text" id="tf-name" value="${team?.name||''}" placeholder="YUNAITED FC">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Iniciales (3 max)</label>
                <input type="text" id="tf-ini" value="${team?.ini||''}" maxlength="3" placeholder="YUN"
                  oninput="document.getElementById('logo-ini-preview')&&(document.getElementById('logo-ini-preview').textContent=this.value.toUpperCase())">
              </div>
              <div class="form-group">
                <label>Estado</label>
                <select id="tf-status">
                  <option value="ACTIVO" ${team?.status==='ACTIVO'||!team?'selected':''}>Activo</option>
                  <option value="INACTIVO" ${team?.status==='INACTIVO'?'selected':''}>Inactivo</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Presidente / Suscriptor <span style="font-size:11px;color:var(--txt3);font-weight:400;">(cuenta vinculada)</span></label>
          ${_presUsers.length
            ? `<select id="tf-pres-uid" style="width:100%;padding:9px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:15px;">
                 <option value="">— sin presidente —</option>
                 ${_presUsers.map(u=>`<option value="${u.uid}" ${u.uid===_presLinkedUid?'selected':''}>${_presEsc(u.name)}${u.role==='president'?' (presidente)':u.role==='admin'?' (admin)':''}${(u.teamId!=null&&u.teamId!==id)?' · ya tiene club':''}</option>`).join('')}
               </select>
               <div style="font-size:11px;color:var(--txt3);margin-top:4px;">Se asigna la cuenta del suscriptor; el vínculo es la fuente de verdad (no texto libre).</div>`
            : `<input type="text" id="tf-pres" value="${team?.pres||''}" placeholder="Nombre del suscriptor">
               <div style="font-size:11px;color:var(--txt3);margin-top:4px;">Inicia sesión como admin para vincular cuentas de presidente.</div>`
          }
        </div>

        <div class="form-group">
          <label style="display:flex;align-items:center;justify-content:space-between;">
            <span>Nombres anteriores</span>
            <button type="button" class="btn btn-xs" onclick="addPrevName('')">+ Agregar nombre</button>
          </label>
          <div id="tf-prev-names" style="display:flex;flex-direction:column;gap:6px;"></div>
          <div style="font-size:11px;color:var(--txt3);margin-top:4px;">
            Cada caja es un nombre histórico distinto.
            ${team ? '<strong style="color:var(--txt2);"><svg style="display:inline;vertical-align:-2px;" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Si cambias el nombre, el actual se agregará automáticamente.</strong>' : ''}
            Aparecerán con ⓘ en el historial de partidos.
          </div>
        </div>

        <div class="form-group">
          <label>Colores del equipo</label>
          <div style="display:flex;align-items:center;gap:10px;">
            <input type="color" id="tf-color" value="${team?.color||'#1A4A7A'}"
              style="width:44px;height:36px;padding:2px;border-radius:var(--r);border:1px solid var(--brd);cursor:pointer;background:transparent;"
              oninput="updateColorPreview(this.value,'primary')">
            <input type="text" id="tf-color-hex" value="${team?.color||'#1A4A7A'}"
              style="width:100px;padding:7px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:16px;"
              oninput="syncColorPicker(this.value,'primary')">
            <div id="color-swatch" style="width:36px;height:36px;border-radius:50%;background:${team?.color||'#1A4A7A'};border:2px solid var(--brd2);"></div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:8px;">
            <input type="color" id="tf-color2" value="${team?.color2||team?.color||'#C9A84C'}"
              style="width:44px;height:36px;padding:2px;border-radius:var(--r);border:1px solid var(--brd);cursor:pointer;background:transparent;"
              oninput="updateColorPreview(this.value,'secondary')">
            <input type="text" id="tf-color2-hex" value="${team?.color2||team?.color||'#C9A84C'}"
              style="width:100px;padding:7px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:16px;"
              oninput="syncColorPicker(this.value,'secondary')">
            <div id="color2-swatch" style="width:36px;height:36px;border-radius:50%;background:${team?.color2||team?.color||'#C9A84C'};border:2px solid var(--brd2);"></div>
            <span style="font-size:12px;color:var(--txt3);">Secundario</span>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
            ${['#1A4A7A','#C0392B','#2E7D32','#B8860B','#1A1A4A','#4A235A','#1A4A2E','#3D2B1F','#1F618D','#1A3A4A','#784212','#1A5E3A']
              .map(c=>`<div onclick="setTeamColor('${c}','primary')" style="width:22px;height:22px;border-radius:50%;background:${c};cursor:pointer;border:2px solid transparent;transition:border-color 0.15s;" onmouseover="this.style.borderColor='var(--txt)'" onmouseout="this.style.borderColor='transparent'"></div>`).join('')}
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
            ${['#1A4A7A','#C0392B','#2E7D32','#B8860B','#1A1A4A','#4A235A','#1A4A2E','#3D2B1F','#1F618D','#1A3A4A','#784212','#1A5E3A']
              .map(c=>`<div onclick="setTeamColor('${c}','secondary')" style="width:22px;height:22px;border-radius:50%;background:${c};cursor:pointer;border:2px solid transparent;transition:border-color 0.15s;" onmouseover="this.style.borderColor='var(--txt)'" onmouseout="this.style.borderColor='transparent'"></div>`).join('')}
          </div>
        </div>

        <div class="form-group" style="margin-bottom:0;">
          <label>YuNaCoins actuales</label>
          <input type="number" id="tf-coins" value="${team?.yunacoin||0}" min="0">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeTeamModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveTeam(${id||'null'})">Guardar</button>
      </div>
    </div>
  </div>`;

  // Logo: _logoData = URL actual (o null); _logoFile = archivo nuevo pendiente de subir.
  window._logoData = team?.logo||null;
  window._logoFile = null;

  // Pre-poblar nombres anteriores. Acepta array nuevo (previousNames)
  // o string legacy (historyNames separado por →, , o ;)
  let prev = [];
  if(Array.isArray(team?.previousNames)){
    prev = team.previousNames.map(s=>String(s).trim()).filter(Boolean);
  } else if(team?.historyNames){
    prev = String(team.historyNames).split(/\s*(?:→|->|,|;|\|)\s*/).map(s=>s.trim()).filter(Boolean);
  }
  const prevContainer = document.getElementById('tf-prev-names');
  if(prevContainer){
    if(!prev.length){
      prevContainer.innerHTML = `<div style="font-size:12px;color:var(--txt3);font-style:italic;">Sin nombres anteriores. Usá <strong>+ Agregar nombre</strong>.</div>`;
    } else {
      prev.forEach(n=>addPrevName(n));
    }
  }
}

function addPrevName(value){
  const container = document.getElementById('tf-prev-names');
  if(!container) return;
  // Quitar el placeholder italic si existe
  if(container.querySelector('.tf-prev-empty') || container.children.length===1 && !container.querySelector('.tf-prev-row')){
    container.innerHTML = '';
  }
  const row = document.createElement('div');
  row.className = 'tf-prev-row';
  row.style.cssText = 'display:flex;gap:6px;align-items:center;';
  row.innerHTML = `
    <input type="text" class="tf-prev-input" value="${String(value||'').replace(/"/g,'&quot;')}" placeholder="Ej: NOMBRE ANTERIOR"
      style="flex:1;padding:7px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:14px;">
    <button type="button" class="btn btn-xs btn-danger" onclick="this.parentElement.remove();_normalizePrevContainer()" title="Quitar">×</button>
  `;
  container.appendChild(row);
  row.querySelector('input')?.focus();
}

function _normalizePrevContainer(){
  const container = document.getElementById('tf-prev-names');
  if(!container) return;
  if(!container.querySelector('.tf-prev-row')){
    container.innerHTML = `<div class="tf-prev-empty" style="font-size:12px;color:var(--txt3);font-style:italic;">Sin nombres anteriores. Usá <strong>+ Agregar nombre</strong>.</div>`;
  }
}

function closeTeamModal(){
  document.getElementById('team-modal-wrap').innerHTML='';
  window._logoData = null;
}

function previewLogo(input){
  const file = input.files[0];
  if(!file) return;
  // Guardamos el archivo y mostramos un preview local; la subida ocurre al Guardar.
  window._logoFile = file;
  const url = URL.createObjectURL(file);
  window._logoData = url; // preview visual temporal (se reemplaza por la URL de la nube al guardar)
  const preview = document.getElementById('logo-preview');
  if(preview) preview.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`;
}

function removeLogo(){
  window._logoData = null;
  window._logoFile = null;
  const ini = document.getElementById('tf-ini')?.value||'?';
  const color = document.getElementById('tf-color')?.value||'#333';
  const preview = document.getElementById('logo-preview');
  if(preview){
    preview.style.background = color;
    preview.innerHTML = `<span style="font-family:'Bebas Neue';font-size:17px;color:#fff;" id="logo-ini-preview">${ini.toUpperCase()}</span>`;
  }
}

function updateColorPreview(val, target='primary'){
  const isPrimary = target!=='secondary';
  const hexId = isPrimary ? 'tf-color-hex' : 'tf-color2-hex';
  const swatchId = isPrimary ? 'color-swatch' : 'color2-swatch';
  const hexEl = document.getElementById(hexId);
  const swatchEl = document.getElementById(swatchId);
  if(hexEl) hexEl.value = val;
  if(swatchEl) swatchEl.style.background = val;
  if(isPrimary){
    const preview = document.getElementById('logo-preview');
    if(preview && !window._logoData) preview.style.background = val;
  }
}

function syncColorPicker(val, target='primary'){
  if(/^#[0-9A-Fa-f]{6}$/.test(val)){
    const isPrimary = target!=='secondary';
    const pickerId = isPrimary ? 'tf-color' : 'tf-color2';
    const swatchId = isPrimary ? 'color-swatch' : 'color2-swatch';
    const pickerEl = document.getElementById(pickerId);
    const swatchEl = document.getElementById(swatchId);
    if(pickerEl) pickerEl.value = val;
    if(swatchEl) swatchEl.style.background = val;
    if(isPrimary && !window._logoData){
      const preview = document.getElementById('logo-preview');
      if(preview) preview.style.background = val;
    }
  }
}

function setTeamColor(color, target='primary'){
  const isPrimary = target!=='secondary';
  const pickerId = isPrimary ? 'tf-color' : 'tf-color2';
  const hexId = isPrimary ? 'tf-color-hex' : 'tf-color2-hex';
  const swatchId = isPrimary ? 'color-swatch' : 'color2-swatch';
  const pickerEl = document.getElementById(pickerId);
  const hexEl = document.getElementById(hexId);
  const swatchEl = document.getElementById(swatchId);
  if(pickerEl) pickerEl.value = color;
  if(hexEl) hexEl.value = color;
  if(swatchEl) swatchEl.style.background = color;
  if(isPrimary && !window._logoData){
    const preview = document.getElementById('logo-preview');
    if(preview) preview.style.background = color;
  }
}

async function saveTeam(id){
  const name  = document.getElementById('tf-name').value.trim();
  const ini   = document.getElementById('tf-ini').value.trim().toUpperCase();
  // `pres` (texto legacy) solo existe en modo sin cuentas; si hay selector, se preserva el valor previo.
  const _presInput = document.getElementById('tf-pres');
  const pres  = _presInput ? _presInput.value.trim() : (id ? ((await dbGet('teams',id))?.pres || '') : '');
  const color = document.getElementById('tf-color').value;
  const color2 = document.getElementById('tf-color2')?.value || color;
  const status= document.getElementById('tf-status').value;
  const coins = parseInt(document.getElementById('tf-coins').value)||0;

  if(!name){ showToast('El nombre es obligatorio','error'); return; }

  // Subir el logo nuevo a la nube (Cloudinary) → guardamos solo la URL.
  let logoUrl = window._logoData || null;
  if(window._logoFile){
    const _f = window._logoFile;
    const _allowed = ['image/jpeg','image/jpg','image/png','image/webp'];
    if(!_allowed.includes(_f.type)){
      showToast('Formato no permitido. Usa JPG, PNG o WebP.','error'); return;
    }
    if(_f.size > 2 * 1024 * 1024){
      showToast('El archivo supera el límite de 2 MB.','error'); return;
    }
    if(typeof cloudReady==='function' && !cloudReady()){
      showToast('Configura Cloudinary (js/cloudinary.js) para subir logos','error'); return;
    }
    try {
      showToast('Subiendo logo...');
      logoUrl = await uploadImageToCloud(_f);
    } catch(e){ showToast('No se pudo subir el logo: '+(e.message||e),'error'); return; }
  }

  // Recopilar nombres anteriores: una caja por nombre, descartando vacíos y duplicados
  const prevInputs = [...document.querySelectorAll('#tf-prev-names .tf-prev-input')];
  const previousNames = [];
  prevInputs.forEach(inp=>{
    const v = (inp.value||'').trim();
    if(!v) return;
    if(v.toLowerCase()===name.toLowerCase()) return; // ignorar si coincide con el nombre actual
    if(!previousNames.some(p=>p.toLowerCase()===v.toLowerCase())) previousNames.push(v);
  });

  const data = {
    name, ini, pres, color, color2, status,
    yunacoin: coins,
    previousNames,                                  // ← nuevo (array)
    historyNames: previousNames.join(' → '),        // ← compatibilidad legacy (string)
    logo: logoUrl,
    updatedAt: new Date().toISOString(),
  };

  let teamId = id;
  if(id){
    const existing = await dbGet('teams',id);
    // Si el nombre cambió, agregar el nombre anterior automáticamente al historial
    if(existing.name && existing.name !== name){
      // Agregar nombre anterior solo si no está ya en previousNames
      if(!previousNames.some(p=>p.toLowerCase()===existing.name.toLowerCase())){
        previousNames.unshift(existing.name); // agregar al inicio
        data.previousNames = previousNames;
        data.historyNames = previousNames.join(' → ');
      }
    }
    await dbPut('teams',{...existing,...data});
    showToast('Equipo actualizado');
    // Notificar cambio de equipo para recargar vistas dinámicas
    await notifyTeamChanged(id);
  } else {
    teamId = await dbAdd('teams',{...data, season:1, createdAt:new Date().toISOString()});
    showToast('Equipo creado');
  }
  // Vincular la cuenta del presidente (selector). Mueve users.teamId.
  const _presSel = document.getElementById('tf-pres-uid');
  if(_presSel && typeof updatePresidentLink==='function'){
    await updatePresidentLink(teamId, _presSel.value || null);
  }
  closeTeamModal();
  renderAdmTeams();
}

async function deleteTeam(id){
  const team = await dbGet('teams',id);
  showConfirm(
    '¿Eliminar equipo?',
    `Se eliminará "${team?.name}" permanentemente.`,
    async ()=>{
      await dbDelete('teams',id);
      showToast('Equipo eliminado');
      renderAdmTeams();
    }
  );
}

/* ----------------------------------------------------------
   RENDER PÚBLICO — EQUIPOS · Vitrina aleatoria + "cargar más"
   ---------------------------------------------------------- */

/* Estado de la vista pública — único objeto, evita tandas zombi */
let _pubTeamsView = { all:[], pool:[], shown:0, query:'', renderToken:0, timer:null };

/* Número de columnas reales de #pub-teams-grid */
function _clubCols(){
  const el = document.getElementById('pub-teams-grid');
  if(!el) return 3;
  const style = getComputedStyle(el);
  const cols = style.gridTemplateColumns.split(' ').filter(Boolean).length;
  return cols > 0 ? cols : 3;
}

/* Tamaño de tanda: múltiplo de columnas más cercano a 6 (filas enteras) */
function _clubBatch(){
  const cols  = _clubCols();
  const ideal = Math.max(cols, Math.round(6 / cols) * cols);
  return ideal;
}

/* Fisher-Yates */
function _shuffle(arr){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Construye el HTML de una tarjeta (sin animaciones, solo markup) */
function _pubTeamCardHtml(t){
  const _col = v => /^#[0-9A-Fa-f]{3,8}$/.test(String(v||'')) ? v : '#333';
  const stats  = window._pubTeamStats  || {};
  const titles = window._pubTeamTitles || new Map();
  const c1 = _col(t.color), c2 = _col(t.color2 || t.color);
  const crest = t.logo
    ? `<img src="${_esc(t.logo)}" alt="" loading="lazy">`
    : `${_esc(t.ini||'?')}`;
  const s = stats[t.id] || {pj:0,v:0,recent:[]};
  const winPct = s.pj>0 ? Math.round(s.v/s.pj*100) : 0;
  const tit = (titles.get(t.id)?._total) || 0;
  const form = (s.recent||[]).slice(-5);
  const formHTML = form.length
    ? form.map(f=>`<span class="form-pip ${f}">${f==='w'?'V':f==='d'?'E':'D'}</span>`).join('')
    : `<span style="font-size:11px;color:var(--txt3);">Sin datos</span>`;
  return `
    <div class="club-stage">
      <div class="club-card" style="--team-color:${c1};--team-color-2:${c2};">
        <div class="club-band">
          <div class="club-crest">${crest}</div>
          <div class="club-name">${_esc(t.name)}</div>
        </div>
        <div class="club-body">
          <div class="club-stats">
            <div class="club-stat"><b>${s.pj}</b><span>Partidos</span></div>
            <div class="club-stat"><b>${winPct}%</b><span>Victorias</span></div>
            <div class="club-stat"><b class="gold">${tit}</b><span>Títulos</span></div>
          </div>
          <div class="club-foot">
            <span class="fs-lbl">Forma</span>
            <div class="form-strip">${formHTML}</div>
          </div>
        </div>
      </div>
    </div>`;
}

/* Inserta tarjetas de pool[from..from+count] con animación stagger+countUp */
function _appendPubTeams(from, count, token){
  const el = document.getElementById('pub-teams-grid');
  if(!el) return;
  if(token !== _pubTeamsView.renderToken) return; /* descarta tanda obsoleta */
  const slice = _pubTeamsView.pool.slice(from, from + count);
  if(!slice.length) return;
  const frag = document.createElement('div');
  frag.innerHTML = slice.map(_pubTeamCardHtml).join('');
  const newCards = [];
  /* Iterar sobre elements (no text nodes) para que querySelector no falle */
  Array.from(frag.children).forEach(child => {
    el.appendChild(child);
    const card = el.lastElementChild.querySelector('.club-card');
    if(card) newCards.push(card);
  });
  _pubTeamsView.shown = from + slice.length;
  /* Animación solo si no se pidió movimiento reducido */
  const reduced = window.MOTION && typeof MOTION.reduced==='function' && MOTION.reduced();
  if(!reduced){
    if(window.MOTION && typeof MOTION.stagger==='function') MOTION.stagger(newCards, { step:45 });
    if(window.MOTION && typeof MOTION.countUp==='function'){
      newCards.forEach(card=>card && card.querySelectorAll('.club-stat b').forEach(b=>{
        const raw = b.textContent, n = parseInt(raw);
        if(isNaN(n)) return;
        MOTION.countUp(b, n, { dur:850, suffix: raw.includes('%') ? '%' : '' });
      }));
    }
  }
  _updateLoadMoreBtn();
  _pubBindTeamsSpotlight();
}

/* Actualiza visibilidad del botón "cargar más" */
function _updateLoadMoreBtn(){
  const wrap = document.getElementById('pub-teams-load-more');
  if(!wrap) return;
  const exhausted = _pubTeamsView.shown >= _pubTeamsView.pool.length;
  wrap.style.display = (_pubTeamsView.query || exhausted) ? 'none' : 'flex';
}

/* Carga la siguiente tanda (con delay y estado loading excepto la primera) */
function loadMorePubTeams(first){
  const view = _pubTeamsView;
  const token = view.renderToken;
  const from  = view.shown;
  const count = _clubBatch();
  if(from >= view.pool.length) return;

  const btn = document.getElementById('pub-teams-btn-more');

  if(first){
    _appendPubTeams(from, count, token);
  } else {
    if(btn){ btn.disabled = true; btn.setAttribute('aria-busy','true'); btn.classList.add('loading'); }
    clearTimeout(view.timer);
    view.timer = setTimeout(()=>{
      if(token !== view.renderToken) return;
      _appendPubTeams(from, count, token);
      if(btn){ btn.disabled = false; btn.setAttribute('aria-busy','false'); btn.classList.remove('loading'); }
    }, 500);
  }
}

async function renderPubTeams(){
  const el = document.getElementById('pub-teams-content');
  const teams = await dbGetAll('teams', t=>t.status==='ACTIVO');

  /* Bump token + cancelar timer pendiente */
  clearTimeout(_pubTeamsView.timer);
  _pubTeamsView.renderToken++;
  const token = _pubTeamsView.renderToken;

  /* Stats reales */
  try {
    window._pubTeamStats  = (typeof _computeTeamStats==='function') ? await _computeTeamStats() : {};
    window._pubTeamTitles = (typeof aggregatePalmaresByTeam==='function') ? await aggregatePalmaresByTeam() : new Map();
  } catch(e){
    console.warn('[Equipos] stats de historial no disponibles:', e);
    window._pubTeamStats = {}; window._pubTeamTitles = new Map();
  }

  if(token !== _pubTeamsView.renderToken) return; /* cancelado */

  /* Rellenar cache y pool barajado */
  _pubTeamsView.all   = teams;
  _pubTeamsView.pool  = _shuffle(teams);
  _pubTeamsView.shown = 0;
  _pubTeamsView.query = '';

  if(!teams.length){
    el.innerHTML = `<p style="color:var(--txt3);font-size:15px;padding:24px 0;">Sin equipos activos.</p>`;
    return;
  }

  el.innerHTML = `
  <div id="pub-teams-grid" class="clubs-grid"></div>
  <div id="pub-teams-load-more" class="load-more-wrap" style="display:none;">
    <button id="pub-teams-btn-more" type="button" class="load-more"
      aria-controls="pub-teams-grid"
      onclick="loadMorePubTeams(false)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1"/>
      </svg>
      Cargar más equipos
    </button>
  </div>`;

  loadMorePubTeams(true);
}

function filterPubTeams(){
  const search = (document.getElementById('pub-team-search')?.value || '').toLowerCase().trim();

  clearTimeout(_pubTeamsView.timer);
  _pubTeamsView.renderToken++;
  _pubTeamsView.query = search;

  const el = document.getElementById('pub-teams-grid');
  if(!el) return;

  if(!search){
    /* Sin query: volver a vitrina barajada desde el principio */
    _pubTeamsView.pool  = _shuffle(_pubTeamsView.all);
    _pubTeamsView.shown = 0;
    el.innerHTML = '';
    loadMorePubTeams(true);
    return;
  }

  /* Con query: mostrar todos los matches, ocultar botón */
  const matches = _pubTeamsView.all.filter(t => t.name.toLowerCase().includes(search));
  el.innerHTML = matches.length
    ? matches.map(_pubTeamCardHtml).join('')
    : `<div style="grid-column:1/-1;color:var(--txt3);font-size:15px;padding:24px 0;text-align:center;">No hay equipos que coincidan.</div>`;
  _pubTeamsView.shown = matches.length;

  const wrap = document.getElementById('pub-teams-load-more');
  if(wrap) wrap.style.display = 'none';

  _pubBindTeamsSpotlight();
}

/* Live refresh: reconcilia pool por team.id sin re-shuffle ni resetear shown */
async function _refreshPubTeams(){
  clearTimeout(_pubTeamsView.timer);
  _pubTeamsView.renderToken++;
  const token = _pubTeamsView.renderToken;

  try {
    window._pubTeamStats  = (typeof _computeTeamStats==='function') ? await _computeTeamStats() : {};
    window._pubTeamTitles = (typeof aggregatePalmaresByTeam==='function') ? await aggregatePalmaresByTeam() : new Map();
  } catch(e){ /* stats no críticas */ }

  if(token !== _pubTeamsView.renderToken) return;

  const fresh = await dbGetAll('teams', t=>t.status==='ACTIVO');
  if(token !== _pubTeamsView.renderToken) return;

  const freshById = new Map(fresh.map(t=>[t.id, t]));

  /* Reconciliar pool: actualizar existentes, quitar inactivos, añadir nuevos al final */
  const reconPool = _pubTeamsView.pool
    .filter(t=>freshById.has(t.id))
    .map(t=>freshById.get(t.id));
  const poolIds = new Set(reconPool.map(t=>t.id));
  fresh.forEach(t=>{ if(!poolIds.has(t.id)) reconPool.push(t); });

  /* Ajustar shown si se eliminaron equipos por debajo del límite visible */
  const newShown = Math.min(_pubTeamsView.shown, reconPool.length);

  _pubTeamsView.all   = fresh;
  _pubTeamsView.pool  = reconPool;
  _pubTeamsView.shown = newShown;

  /* Si hay búsqueda activa, re-filtrar sobre cache nuevo */
  if(_pubTeamsView.query){
    filterPubTeams();
    return;
  }

  /* Sin búsqueda: re-render las tarjetas ya visibles */
  const el = document.getElementById('pub-teams-grid');
  if(!el) return;
  el.innerHTML = reconPool.slice(0, newShown).map(_pubTeamCardHtml).join('');
  _pubBindTeamsSpotlight();
  _updateLoadMoreBtn();
}

/* Stats reales por equipo desde el historial (estáticos + lives), mismo criterio
   que la tabla histórica: pj/v/e/p + forma (últimos 5). Clave = id de equipo, matcheando
   nombre actual y previousNames. Cero mock — bebe del historial del main. */
async function _computeTeamStats(){
  const records = await _getResolvedRecords();
  const teams   = await dbGetAll('teams');
  const norm = s => String(s||'').toUpperCase().replace(/[.,]/g,'').replace(/\s+/g,' ').trim();
  const byName = new Map();
  for(const t of teams){
    if(t.name) byName.set(norm(t.name), t.id);
    (Array.isArray(t.previousNames)?t.previousNames:[]).forEach(p=>{ if(p) byName.set(norm(p), t.id); });
  }
  const classify = (typeof _classifyOutcomeFIFA==='function')
    ? _classifyOutcomeFIFA
    : (r=>{ const a=parseInt(r.golesA)||0, b=parseInt(r.golesB)||0; return a>b?'A':(a<b?'B':'D'); });
  const stats = {};
  const ensure = id => stats[id] || (stats[id] = {pj:0,v:0,e:0,p:0,recent:[]});
  const sorted = records.slice().sort((a,b)=> (a.id||0)-(b.id||0)); // cronológico ascendente
  for(const r of sorted){
    const idA = byName.get(norm(r.equipoA));
    const idB = byName.get(norm(r.equipoB));
    if(idA==null && idB==null) continue;
    const out = classify(r);
    if(idA!=null){ const s=ensure(idA); s.pj++; if(out==='A'){s.v++;s.recent.push('w');} else if(out==='B'){s.p++;s.recent.push('l');} else {s.e++;s.recent.push('d');} }
    if(idB!=null){ const s=ensure(idB); s.pj++; if(out==='B'){s.v++;s.recent.push('w');} else if(out==='A'){s.p++;s.recent.push('l');} else {s.e++;s.recent.push('d');} }
  }
  return stats;
}

/* Spotlight: un foco con el color del club sigue al cursor dentro de cada tarjeta.
   Delegado en document (una sola vez) → vale para tarjetas re-renderizadas por el
   buscador. Solo con puntero fino y si el usuario no pidió movimiento reducido. */
let _pubTeamsSpotlightBound = false;
function _pubBindTeamsSpotlight(){
  if(_pubTeamsSpotlightBound) return;
  if(typeof matchMedia==='function' && !matchMedia('(pointer:fine)').matches) return;
  if(window.MOTION && typeof MOTION.reduced==='function' && MOTION.reduced()) return;
  _pubTeamsSpotlightBound = true;
  document.addEventListener('pointermove', e=>{
    const card = e.target.closest && e.target.closest('.club-card');
    if(!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive:true });
}

