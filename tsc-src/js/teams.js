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
    if(typeof cloudReady==='function' && !cloudReady()){
      showToast('Configura Cloudinary (js/cloudinary.js) para subir logos','error'); return;
    }
    try {
      showToast('Subiendo logo...');
      logoUrl = await uploadImageToCloud(window._logoFile);
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
   RENDER PÚBLICO — EQUIPOS
   ---------------------------------------------------------- */
async function renderPubTeams(){
  const el = document.getElementById('pub-teams-content');
  const teams = await dbGetAll('teams', t=>t.status==='ACTIVO');

  el.innerHTML = `
  <div style="margin-bottom:12px;">
    <input type="text" id="pub-team-search" placeholder="Buscar equipo..." oninput="filterPubTeams()"
      style="padding:7px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:14px;width:220px;">
  </div>
  <div id="pub-teams-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;"></div>`;

  renderPubTeamsGrid(teams);
}

async function filterPubTeams(){
  const search = document.getElementById('pub-team-search')?.value.toLowerCase()||'';
  let teams = await dbGetAll('teams', t=>t.status==='ACTIVO');
  if(search) teams = teams.filter(t=>t.name.toLowerCase().includes(search));
  renderPubTeamsGrid(teams);
}

function renderPubTeamsGrid(teams){
  const el = document.getElementById('pub-teams-grid');
  if(!el) return;
  if(!teams.length){
    el.innerHTML=`<div style="color:var(--txt3);font-size:16px;grid-column:1/-1;">Sin equipos activos.</div>`;
    return;
  }
  el.innerHTML = teams.map(t=>`
    <div class="card" style="padding:14px;text-align:center;transition:border-color 0.15s;cursor:default;" onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--brd)'">
      <div style="width:52px;height:52px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:${t.color||'#333'};margin:0 auto 8px;border:2px solid var(--brd2);">
        ${t.logo
          ? `<img src="${t.logo}" style="width:100%;height:100%;object-fit:cover;">`
          : `<span style="font-family:'Bebas Neue';font-size:13px;color:#fff;">${_esc(t.ini||'?')}</span>`
        }
      </div>
      <div style="font-size:14px;font-weight:600;line-height:1.3;">${_esc(t.name)}</div>
      ${t.pres?`<div style="font-size:12px;color:var(--txt3);margin-top:3px;">${_esc(t.pres)}</div>`:''}
      <div style="margin-top:6px;">
        <span style="font-family:'Bebas Neue';font-size:17px;color:var(--gold);">${t.yunacoin||0}</span>
        <span style="font-size:11px;color:var(--txt3);"> coins</span>
      </div>
    </div>`).join('');
}
