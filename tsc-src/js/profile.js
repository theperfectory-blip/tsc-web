'use strict';
/* ============================================================
   PERFIL DE USUARIO
   ============================================================ */

let _profileAvatarData;
let _profileAvatarFile;
let _profileAvatarTouched = false;
let _profileLogoData;
let _profileLogoFile;
let _profileLogoTouched = false;

function _pfEsc(v){
  return String(v==null?'':v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function _injectProfileModal(){
  if (document.getElementById('profile-modal')) return;
  const div = document.createElement('div');
  div.className = 'modal-overlay';
  div.id = 'profile-modal';
  div.innerHTML = `
    <div class="modal" style="max-width:460px;">
      <div class="modal-hdr">
        <div class="modal-title">Mi perfil</div>
        <button class="modal-close" onclick="closeModal('profile-modal')">×</button>
      </div>
      <div class="modal-body" id="profile-body"></div>
    </div>`;
  document.body.appendChild(div);
}

async function openProfile(){
  if (typeof AUTH === 'undefined' || !AUTH.user){ if(typeof openAuthModal==='function') openAuthModal(); return; }
  _injectProfileModal();
  _profileAvatarData = undefined;
  _profileAvatarFile = undefined;
  _profileAvatarTouched = false;
  _profileLogoData = undefined;
  _profileLogoFile = undefined;
  _profileLogoTouched = false;
  openModal('profile-modal');
  document.getElementById('profile-body').innerHTML = `<div style="color:var(--txt3);padding:14px;">Cargando...</div>`;
  await renderProfileBody();
}

async function renderProfileBody(){
  const body = document.getElementById('profile-body');
  if (!body) return;

  const team  = AUTH.teamId != null ? await dbGet('teams', AUTH.teamId).catch(()=>null) : null;
  const stats = team ? await _loadTeamStats(AUTH.teamId, team) : null;
  const locked = !!(AUTH.profile && AUTH.profile.lockEdits);
  window._profileTeam = team;

  const name     = AUTH.profile?.displayName || AUTH.user.email;
  const email    = AUTH.user.email;
  const username = AUTH.profile?.username || '';
  const verified = AUTH.user.emailVerified;
  const roleLbl  = AUTH.role === 'admin' ? 'Admin' : (AUTH.role === 'president' ? 'Presidente' : 'Usuario');

  const avatarSrc = _profileAvatarData !== undefined ? _profileAvatarData : (AUTH.profile?.photoURL || null);
  const avatarInner = avatarSrc
    ? `<img src="${_pfEsc(avatarSrc)}" style="width:100%;height:100%;object-fit:cover;">`
    : `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" style="display:block;color:var(--txt3);"><path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12zm0 2.25c-3.6 0-7.5 1.9-7.5 4.95V20.5h15v-1.3c0-3.05-3.9-4.95-7.5-4.95z"/></svg>`;

  const verBadge = verified
    ? `<span style="color:#2ecc71;font-size:11px;font-weight:600;">✓ verificado</span>`
    : `<span style="color:#FFC107;font-size:11px;font-weight:600;"><svg style="display:inline;vertical-align:-2px;" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> sin verificar</span>
       <button class="btn btn-xs" onclick="profileResendVerification()" style="font-size:10px;padding:2px 7px;">Verificar</button>`;

  const editBadge = `
    <span style="position:absolute;bottom:3px;right:3px;background:var(--gold);border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.5);pointer-events:none;">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="#000"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
    </span>`;

  let html = `
    <div style="display:flex;gap:14px;align-items:center;margin-bottom:16px;">
      <label for="profile-avatar-file" style="position:relative;width:72px;height:72px;flex:none;cursor:pointer;" title="Cambiar foto de perfil">
        <div id="profile-avatar-preview" style="width:72px;height:72px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--card2);border:2px solid var(--brd2);">
          ${avatarInner}
        </div>
        ${editBadge}
      </label>
      <input type="file" id="profile-avatar-file" accept="image/*" style="display:none;" onchange="profileSelectAvatar(this)">
    </div>

    <div class="form-group">
      <label>Nombre para mostrar</label>
      <input type="text" id="profile-name" value="${_pfEsc(name)}">
    </div>
    <div class="form-group">
      <label>Nombre de usuario</label>
      <div style="position:relative;">
        <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--txt3);font-size:14px;pointer-events:none;">@</span>
        <input type="text" id="profile-username" value="${_pfEsc(username)}" placeholder="nombre_usuario"
          style="padding-left:26px;"
          oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9_]/g,'')">
      </div>
    </div>

    <div style="font-size:12px;color:var(--txt3);margin:-4px 0 10px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
      ${_pfEsc(email)} ${verBadge} · <b>${roleLbl}</b>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:2px;">
      <button class="btn btn-sm" onclick="profileTogglePasswordChange()"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg> Cambiar contraseña</button>
      <button class="btn btn-sm" onclick="profileToggleEmailChange()"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Cambiar email</button>
    </div>

    <div id="profile-password-change-section" style="display:none;background:var(--card2);border-radius:8px;padding:12px;margin-top:10px;">
      <div class="form-group" style="margin-bottom:8px;">
        <label style="font-size:12px;">Contraseña actual</label>
        <input type="password" id="profile-curr-pass-pw" placeholder="••••••••" autocomplete="current-password">
      </div>
      <div class="form-group" style="margin-bottom:8px;">
        <label style="font-size:12px;">Nueva contraseña (mín. 6 caracteres)</label>
        <input type="password" id="profile-new-pw" placeholder="••••••••" autocomplete="new-password">
      </div>
      <div class="form-group" style="margin-bottom:10px;">
        <label style="font-size:12px;">Confirmar nueva contraseña</label>
        <input type="password" id="profile-new-pw2" placeholder="••••••••" autocomplete="new-password">
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button class="btn btn-sm" onclick="profileTogglePasswordChange()">Cancelar</button>
        <button class="btn btn-sm btn-primary" onclick="profileChangePassword()">Actualizar contraseña</button>
      </div>
    </div>

    <div id="profile-email-change-section" style="display:none;background:var(--card2);border-radius:8px;padding:12px;margin-top:10px;">
      <div class="form-group" style="margin-bottom:8px;">
        <label style="font-size:12px;">Nuevo email</label>
        <input type="email" id="profile-new-email" placeholder="nuevo@email.com" autocomplete="off">
      </div>
      <div class="form-group" style="margin-bottom:10px;">
        <label style="font-size:12px;">Contraseña actual (para confirmar)</label>
        <input type="password" id="profile-curr-pass-email" placeholder="••••••••" autocomplete="current-password">
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button class="btn btn-sm" onclick="profileToggleEmailChange()">Cancelar</button>
        <button class="btn btn-sm btn-primary" onclick="profileChangeEmail()">Enviar verificación</button>
      </div>
    </div>
  `;

  // ── Sección Club ──────────────────────────────────────────────
  if (team){
    const currentLogo = _profileLogoData !== undefined ? _profileLogoData : team.logo;
    const logoInner = currentLogo
      ? `<img src="${_pfEsc(currentLogo)}" style="width:100%;height:100%;object-fit:cover;">`
      : `<span style="font-family:'Bebas Neue';font-size:22px;color:#fff;">${_pfEsc((team.ini||team.name||'?').slice(0,3))}</span>`;

    html += `
      <div style="border-top:1px solid var(--brd);margin:16px 0 12px;"></div>
      <div class="section-lbl" style="margin-bottom:10px;">Mi club</div>
      ${locked ? `<div style="background:rgba(255,193,7,0.15);border:1px solid #FFC107;border-radius:6px;padding:8px 10px;font-size:12px;color:var(--txt);margin-bottom:12px;"><svg style="display:inline;vertical-align:-2px;" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> El administrador bloqueó la edición de nombre y escudo.</div>` : ''}
    `;

    if (stats) html += _statsHTML(stats);

    html += `
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:12px;">
        <label for="profile-logo-file" style="position:relative;width:64px;height:64px;flex:none;${locked?'':'cursor:pointer;'}" title="${locked?'':'Cambiar escudo'}">
          <div id="profile-logo-preview" style="width:64px;height:64px;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:${_pfEsc(team.color||'#333')};">
            ${logoInner}
          </div>
          ${!locked ? `<span style="position:absolute;bottom:3px;right:3px;background:var(--gold);border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.5);pointer-events:none;">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="#000"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </span>` : ''}
        </label>
        <input type="file" id="profile-logo-file" accept="image/*" style="display:none;" ${locked?'disabled':''} onchange="profileSelectLogo(this)">
        <div class="form-group" style="flex:1;margin:0;">
          <label>Nombre del club</label>
          <input type="text" id="profile-team-name" value="${_pfEsc(team.name||'')}" ${locked?'disabled':''}>
        </div>
      </div>
      <button class="btn btn-sm" onclick="profileViewMyMatches()"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><polyline points="12 7 12 12 15 15"/></svg> Ver el historial de mi club</button>
    `;
  } else if (AUTH.role === 'president'){
    html += `
      <div style="border-top:1px solid var(--brd);margin:16px 0 12px;"></div>
      <div style="font-size:13px;color:var(--txt3);padding:6px 0;">
        Aún no tienes un club vinculado. Pídele al administrador que te asigne tu equipo.
      </div>`;
  }

  html += `
    <div class="modal-footer" style="margin-top:18px;padding:0;border:none;display:flex;justify-content:space-between;align-items:center;gap:8px;">
      <button class="btn btn-danger btn-sm" onclick="closeModal('profile-modal');authSignOut();">Cerrar sesión</button>
      <button class="btn btn-primary" onclick="saveProfile()">Guardar cambios</button>
    </div>`;

  body.innerHTML = html;
}

/* ── Estadísticas del club ──────────────────────────────────── */

async function _loadTeamStats(teamId, team){
  const _norm = s => String(s||'').toUpperCase().replace(/[.,]/g,'').replace(/\s+/g,' ').trim();
  const allNames = new Set([
    _norm(team.name),
    ...((Array.isArray(team.previousNames) ? team.previousNames : []).map(_norm))
  ].filter(Boolean));

  const rows = await _getResolvedRecords();

  let W=0, D=0, L=0, GF=0, GA=0;
  for (const r of rows){
    if (r.golesA == null || r.golesB == null) continue;
    const isA = allNames.has(_norm(r.equipoA));
    const isB = !isA && allNames.has(_norm(r.equipoB));
    if (!isA && !isB) continue;
    const gf = isA ? r.golesA : r.golesB;
    const ga = isA ? r.golesB : r.golesA;
    GF += gf; GA += ga;
    if (gf > ga) W++; else if (gf < ga) L++; else D++;
  }
  return { W, D, L, GF, GA, P: W+D+L };
}

function _donutSVG(segs, size=72){
  const total = segs.reduce((s,d) => s + d.value, 0);
  const r = 27, cx = size/2, cy = size/2;
  const circ = 2 * Math.PI * r;
  if (!total){
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--brd2)" stroke-width="9"/></svg>`;
  }
  let cum = 0;
  const circles = segs.map(s => {
    if (!s.value) return '';
    const len = (s.value / total) * circ;
    const off = -(cum / total) * circ;
    cum += s.value;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="9" stroke-dasharray="${len.toFixed(2)} ${(circ-len).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
  }).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${circles}</svg>`;
}

function _statsHTML(s){
  const { W, D, L, GF, GA, P } = s;
  if (!P) return `<div style="font-size:12px;color:var(--txt3);margin-bottom:14px;">Sin partidos registrados aún.</div>`;
  const maxG = Math.max(GF, GA, 1);
  const bar = (n, color) => {
    const w = Math.round(n / maxG * 100);
    return `<div style="height:5px;border-radius:3px;background:var(--brd2);overflow:hidden;"><div style="height:100%;width:${w}%;background:${color};border-radius:3px;"></div></div>`;
  };
  const chart = _donutSVG([
    { value: W, color: '#2ecc71' },
    { value: D, color: '#95a5a6' },
    { value: L, color: '#e74c3c' },
  ]);
  return `
    <div style="display:flex;gap:14px;align-items:center;background:var(--card2);border-radius:10px;padding:12px 14px;margin-bottom:14px;">
      <div style="flex:none;position:relative;width:72px;height:72px;">
        ${chart}
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;line-height:1.1;pointer-events:none;">
          <div style="font-size:16px;font-weight:700;font-family:'Bebas Neue';">${P}</div>
          <div style="font-size:9px;color:var(--txt3);letter-spacing:0.5px;">PJ</div>
        </div>
      </div>
      <div style="flex:1;font-size:12px;display:flex;flex-direction:column;gap:5px;">
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:2px;">
          <span><span style="color:#2ecc71;">●</span> G <b>${W}</b></span>
          <span><span style="color:#95a5a6;">●</span> E <b>${D}</b></span>
          <span><span style="color:#e74c3c;">●</span> P <b>${L}</b></span>
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--txt3);">
            <span>Goles a favor</span><b style="color:var(--txt);">${GF}</b>
          </div>
          ${bar(GF, '#f1c40f')}
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--txt3);margin-top:3px;">
            <span>Goles en contra</span><b style="color:var(--txt);">${GA}</b>
          </div>
          ${bar(GA, '#e74c3c')}
        </div>
      </div>
    </div>`;
}

/* ── Cropper de imagen ──────────────────────────────────────── */

const _crop = {
  type: 'avatar', imageEl: null,
  x: 0, y: 0, scale: 1, minScale: 1,
  drag: false, dsx: 0, dsy: 0, lastDist: 0,
  onConfirm: null,
};
const _CVP = 280; // tamaño del viewport del cropper (px)

function _injectCropModal(){
  if (document.getElementById('crop-modal')) return;
  const el = document.createElement('div');
  el.className = 'modal-overlay';
  el.id = 'crop-modal';
  el.innerHTML = `
    <div class="modal" style="max-width:340px;">
      <div class="modal-hdr">
        <div class="modal-title">Ajustar imagen</div>
        <button class="modal-close" onclick="closeCropModal()">×</button>
      </div>
      <div class="modal-body" style="padding:16px;display:flex;flex-direction:column;align-items:center;gap:12px;">
        <div id="crop-vp" style="width:${_CVP}px;height:${_CVP}px;overflow:hidden;position:relative;cursor:grab;background:#111;flex:none;touch-action:none;">
          <img id="crop-img" style="position:absolute;top:0;left:0;transform-origin:0 0;user-select:none;" draggable="false">
        </div>
        <div style="font-size:11px;color:var(--txt3);">Arrastra · Rueda o desliza para zoom</div>
        <div style="display:flex;align-items:center;gap:8px;width:100%;">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="color:var(--txt3);flex:none;"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2.5" fill="none"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2.5"/></svg>
          <input type="range" id="crop-zoom-sl" min="0" max="100" value="0" style="flex:1;accent-color:var(--gold);" oninput="cropZoomSlider(this.value)">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="color:var(--txt3);flex:none;"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2.5" fill="none"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2.5"/><line x1="8" y1="11" x2="14" y2="11" stroke="currentColor" stroke-width="2"/><line x1="11" y1="8" x2="11" y2="14" stroke="currentColor" stroke-width="2"/></svg>
        </div>
      </div>
      <div class="modal-footer" style="justify-content:space-between;">
        <button class="btn btn-sm" onclick="closeCropModal()">Cancelar</button>
        <button class="btn btn-sm btn-primary" onclick="confirmCrop()">Confirmar</button>
      </div>
    </div>`;
  document.body.appendChild(el);

  const vp = el.querySelector('#crop-vp');

  // Mouse drag
  vp.addEventListener('mousedown', e => {
    e.preventDefault();
    _crop.drag = true; _crop.dsx = e.clientX - _crop.x; _crop.dsy = e.clientY - _crop.y;
    vp.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', e => {
    if (!_crop.drag) return;
    _crop.x = e.clientX - _crop.dsx; _crop.y = e.clientY - _crop.dsy;
    _cropClamp(); _cropApply();
  });
  window.addEventListener('mouseup', () => {
    if (!_crop.drag) return;
    _crop.drag = false;
    const v = document.getElementById('crop-vp'); if (v) v.style.cursor = 'grab';
  });

  // Wheel zoom
  vp.addEventListener('wheel', e => {
    e.preventDefault();
    _cropZoomAt(1 + (e.deltaY < 0 ? 0.1 : -0.1), e.clientX, e.clientY);
  }, { passive: false });

  // Touch drag + pinch
  vp.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length === 1){
      _crop.drag = true;
      _crop.dsx = e.touches[0].clientX - _crop.x;
      _crop.dsy = e.touches[0].clientY - _crop.y;
    } else if (e.touches.length === 2){
      _crop.drag = false;
      _crop.lastDist = _touchDist(e.touches);
    }
  }, { passive: false });
  vp.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 1 && _crop.drag){
      _crop.x = e.touches[0].clientX - _crop.dsx;
      _crop.y = e.touches[0].clientY - _crop.dsy;
      _cropClamp(); _cropApply();
    } else if (e.touches.length === 2){
      const dist = _touchDist(e.touches);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      _cropZoomAt(dist / _crop.lastDist, midX, midY);
      _crop.lastDist = dist;
    }
  }, { passive: false });
  vp.addEventListener('touchend', () => { _crop.drag = false; });
}

function _touchDist(touches){
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx*dx + dy*dy);
}

function _cropApply(){
  const img = document.getElementById('crop-img');
  if (img) img.style.transform = `translate(${_crop.x}px,${_crop.y}px) scale(${_crop.scale})`;
}

function _cropClamp(){
  const iW = _crop.imageEl.naturalWidth * _crop.scale;
  const iH = _crop.imageEl.naturalHeight * _crop.scale;
  _crop.x = iW <= _CVP ? (_CVP - iW) / 2 : Math.max(Math.min(0, _crop.x), _CVP - iW);
  _crop.y = iH <= _CVP ? (_CVP - iH) / 2 : Math.max(Math.min(0, _crop.y), _CVP - iH);
}

function _cropZoomAt(factor, screenX, screenY){
  const newScale = Math.max(_crop.minScale, Math.min(_crop.minScale * 5, _crop.scale * factor));
  const vp = document.getElementById('crop-vp');
  if (!vp) return;
  const rect = vp.getBoundingClientRect();
  const r = newScale / _crop.scale;
  _crop.x = (screenX - rect.left) - r * ((screenX - rect.left) - _crop.x);
  _crop.y = (screenY - rect.top)  - r * ((screenY - rect.top)  - _crop.y);
  _crop.scale = newScale;
  _cropClamp(); _cropApply();
  // sincronizar slider
  const sl = document.getElementById('crop-zoom-sl');
  if (sl) sl.value = Math.round(((newScale - _crop.minScale) / (_crop.minScale * 4)) * 100);
}

function cropZoomSlider(pct){
  const target = _crop.minScale * (1 + (pct / 100) * 4);
  const r = target / _crop.scale;
  _crop.x = _CVP/2 - r * (_CVP/2 - _crop.x);
  _crop.y = _CVP/2 - r * (_CVP/2 - _crop.y);
  _crop.scale = target;
  _cropClamp(); _cropApply();
}

function openCropModal(file, type, onConfirm){
  _injectCropModal();
  _crop.type = type;
  _crop.onConfirm = onConfirm;
  _crop.drag = false;

  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    _crop.imageEl = img;
    const minS = Math.max(_CVP / img.naturalWidth, _CVP / img.naturalHeight);
    _crop.scale = minS; _crop.minScale = minS;
    _crop.x = (_CVP - img.naturalWidth  * minS) / 2;
    _crop.y = (_CVP - img.naturalHeight * minS) / 2;

    const ci = document.getElementById('crop-img');
    if (ci){ ci.src = url; ci.style.width = img.naturalWidth+'px'; ci.style.height = img.naturalHeight+'px'; }

    const vp = document.getElementById('crop-vp');
    if (vp) vp.style.borderRadius = type === 'avatar' ? '50%' : '14px';

    const sl = document.getElementById('crop-zoom-sl');
    if (sl) sl.value = '0';

    _cropApply();
  };
  img.src = url;
  openModal('crop-modal');
}

function closeCropModal(){
  closeModal('crop-modal');
}

function confirmCrop(){
  const img = _crop.imageEl;
  if (!img) return;
  const OUT = 420;
  const canvas = document.createElement('canvas');
  canvas.width = OUT; canvas.height = OUT;
  canvas.getContext('2d').drawImage(
    img,
    -_crop.x / _crop.scale, -_crop.y / _crop.scale,
    _CVP / _crop.scale, _CVP / _crop.scale,
    0, 0, OUT, OUT
  );
  canvas.toBlob(blob => {
    const file = new File([blob], 'img.jpg', { type: 'image/jpeg' });
    const blobUrl = URL.createObjectURL(blob);
    closeModal('crop-modal');
    if (_crop.onConfirm) _crop.onConfirm(blobUrl, file);
  }, 'image/jpeg', 0.9);
}

/* ── Selección de foto de perfil ────────────────────────────── */

function profileSelectAvatar(input){
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  openCropModal(file, 'avatar', (url, croppedFile) => {
    _profileAvatarData = url;
    _profileAvatarFile = croppedFile;
    _profileAvatarTouched = true;
    const prev = document.getElementById('profile-avatar-preview');
    if (prev) prev.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`;
    _updateTopbarAvatar(url);
  });
}

function _updateTopbarAvatar(url){
  const btn = document.querySelector('.tp-avatar');
  if (!btn) return;
  btn.innerHTML = url
    ? `<img src="${_pfEsc(url)}" alt="" style="width:100%;height:100%;object-fit:cover;">`
    : `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="display:block;"><path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12zm0 2.25c-3.6 0-7.5 1.9-7.5 4.95V20.5h15v-1.3c0-3.05-3.9-4.95-7.5-4.95z"/></svg>`;
}

/* ── Selección de escudo del club ───────────────────────────── */

function profileSelectLogo(input){
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  openCropModal(file, 'logo', (url, croppedFile) => {
    _profileLogoData = url;
    _profileLogoFile = croppedFile;
    _profileLogoTouched = true;
    const prev = document.getElementById('profile-logo-preview');
    if (prev) prev.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`;
  });
}

/* ── Verificación y cambio de email ────────────────────────── */

async function profileResendVerification(){
  try {
    await AUTH.user.sendEmailVerification();
    showToast('Correo de verificación enviado · revisa tu SPAM');
  } catch(e){ showToast('Error: '+(e.code||e.message),'error'); }
}

function profileToggleEmailChange(){
  const sec = document.getElementById('profile-email-change-section');
  if (!sec) return;
  const open = sec.style.display === 'none' || !sec.style.display;
  sec.style.display = open ? '' : 'none';
  if (open) document.getElementById('profile-new-email')?.focus();
  else {
    const a = document.getElementById('profile-new-email');
    const b = document.getElementById('profile-curr-pass-email');
    if (a) a.value = ''; if (b) b.value = '';
  }
}

async function profileChangeEmail(){
  const newEmail = document.getElementById('profile-new-email')?.value.trim();
  const pass     = document.getElementById('profile-curr-pass-email')?.value;
  if (!newEmail || !pass){ showToast('Completa el nuevo email y tu contraseña actual','error'); return; }
  const errMap = {
    'auth/wrong-password':      'Contraseña incorrecta.',
    'auth/invalid-credential':  'Contraseña incorrecta.',
    'auth/email-already-in-use':'Ese email ya está en uso.',
    'auth/invalid-email':       'Email inválido.',
    'auth/too-many-requests':   'Demasiados intentos. Espera un momento.',
  };
  try {
    const cred = firebase.auth.EmailAuthProvider.credential(AUTH.user.email, pass);
    await AUTH.user.reauthenticateWithCredential(cred);
    await AUTH.user.verifyBeforeUpdateEmail(newEmail);
    showToast('Correo de verificación enviado a '+newEmail+' · revisa tu SPAM');
    profileToggleEmailChange();
  } catch(e){
    showToast(errMap[e.code] || ('Error: '+(e.message||e)), 'error');
  }
}

/* ── Cambio de contraseña con re-autenticación ──────────────── */

function profileTogglePasswordChange(){
  const sec = document.getElementById('profile-password-change-section');
  if (!sec) return;
  const open = sec.style.display === 'none' || !sec.style.display;
  sec.style.display = open ? '' : 'none';
  if (open) document.getElementById('profile-curr-pass-pw')?.focus();
  else ['profile-curr-pass-pw','profile-new-pw','profile-new-pw2']
         .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
}

async function profileChangePassword(){
  const currPass = document.getElementById('profile-curr-pass-pw')?.value;
  const newPw    = document.getElementById('profile-new-pw')?.value;
  const newPw2   = document.getElementById('profile-new-pw2')?.value;
  if (!currPass || !newPw || !newPw2){ showToast('Completa todos los campos','error'); return; }
  if (newPw.length < 6){ showToast('La nueva contraseña debe tener al menos 6 caracteres','error'); return; }
  if (newPw !== newPw2){ showToast('Las contraseñas nuevas no coinciden','error'); return; }
  const errMap = {
    'auth/wrong-password':     'Contraseña actual incorrecta.',
    'auth/invalid-credential': 'Contraseña actual incorrecta.',
    'auth/too-many-requests':  'Demasiados intentos. Espera un momento.',
    'auth/weak-password':      'La contraseña es demasiado débil.',
  };
  try {
    const cred = firebase.auth.EmailAuthProvider.credential(AUTH.user.email, currPass);
    await AUTH.user.reauthenticateWithCredential(cred);
    await AUTH.user.updatePassword(newPw);
    showToast('Contraseña actualizada');
    profileTogglePasswordChange();
  } catch(e){
    showToast(errMap[e.code] || ('Error: '+(e.message||e)), 'error');
  }
}

function profileViewMyMatches(){
  const team = window._profileTeam;
  if (!team) return;
  closeModal('profile-modal');
  if (typeof _histState !== 'undefined'){ _histState.qA = team.name; _histState.qB = ''; _histState.page = 1; }
  setMode('public');
  goPublicPage('historial');
}

/* Helper global — formatea una fecha en la zona horaria del usuario (DST automático) */
function formatInUserTZ(date, opts = {}){
  const tz = (typeof AUTH !== 'undefined' && AUTH.profile?.timezone)
    || localStorage.getItem('tsc_timezone')
    || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Intl.DateTimeFormat('es', { timeZone: tz, ...opts }).format(new Date(date));
}

/* ── Guardar todo ───────────────────────────────────────────── */

async function saveProfile(){
  const newName     = document.getElementById('profile-name')?.value.trim();
  const newUsername = document.getElementById('profile-username')?.value.trim();
  const team        = window._profileTeam;
  try {
    const userRef = firebase.firestore().collection('users').doc(AUTH.user.uid);
    const upd     = {};

    // 1. Foto de perfil
    if (_profileAvatarTouched){
      let newPhotoURL = _profileAvatarData ?? null;
      if (_profileAvatarFile){
        if (typeof cloudReady==='function' && !cloudReady()){ showToast('Configura Cloudinary para subir fotos','error'); return; }
        showToast('Subiendo foto...');
        try { newPhotoURL = await uploadImageToCloud(_profileAvatarFile); }
        catch(e){ showToast('No se pudo subir la foto: '+(e.message||e),'error'); return; }
      }
      upd.photoURL = newPhotoURL;
    }

    // 2. Nombre para mostrar
    if (newName && newName !== (AUTH.profile?.displayName || '')) upd.displayName = newName;

    // 3. Nombre de usuario (@handle) con verificación de unicidad
    if (newUsername !== (AUTH.profile?.username || '')){
      if (newUsername){
        const snap = await firebase.firestore().collection('users').where('username','==',newUsername).get();
        if (snap.docs.some(d => d.id !== AUTH.user.uid)){ showToast('Ese nombre de usuario ya está en uso','error'); return; }
      }
      upd.username = newUsername || null;
    }

    if (Object.keys(upd).length){
      await userRef.update(upd);
      Object.assign(AUTH.profile, upd);
    }

    if ('photoURL' in upd) _updateTopbarAvatar(upd.photoURL);
    if (typeof renderAuthUI === 'function') renderAuthUI();

    // 4. Escudo y nombre del club
    if (team){
      const locked = !!(AUTH.profile && AUTH.profile.lockEdits);
      if (!locked){
        const newTeamName = document.getElementById('profile-team-name')?.value.trim();
        const updTeam = { ...team };
        let changed = false;
        if (newTeamName && newTeamName !== team.name){ updTeam.name = newTeamName; changed = true; }
        if (_profileLogoTouched){
          let newLogo = _profileLogoData ?? null;
          if (_profileLogoFile){
            if (typeof cloudReady==='function' && !cloudReady()){ showToast('Configura Cloudinary para subir logos','error'); return; }
            showToast('Subiendo escudo...');
            try { newLogo = await uploadImageToCloud(_profileLogoFile); }
            catch(e){ showToast('No se pudo subir el escudo: '+(e.message||e),'error'); return; }
          }
          updTeam.logo = newLogo; changed = true;
        }
        if (changed){ await dbPut('teams', updTeam); window._profileTeam = updTeam; }
      }
    }

    showToast('Perfil actualizado');
    closeModal('profile-modal');
  } catch(e){
    showToast('Error al guardar: '+(e.code||e.message), 'error');
  }
}
