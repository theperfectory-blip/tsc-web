'use strict';
/* ============================================================
   PERFIL DE USUARIO
   - Foto de perfil propia (independiente del escudo del club)
   - Nombre de usuario único (@handle)
   - Nombre para mostrar + cambio de contraseña
   - Si vinculado a club: editar nombre/escudo del club
   ============================================================ */

let _profileAvatarData;        // URL avatar usuario (preview temporal o valor actual)
let _profileAvatarFile;        // archivo avatar pendiente de subir
let _profileAvatarTouched = false;
let _profileLogoData;          // URL escudo del club
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

  let team = null, locked = false;
  if (AUTH.teamId != null){
    try { team = await dbGet('teams', AUTH.teamId); } catch(_){}
  }
  locked = !!(AUTH.profile && AUTH.profile.lockEdits);
  window._profileTeam = team;

  const name     = AUTH.profile?.displayName || AUTH.user.email;
  const email    = AUTH.user.email;
  const username = AUTH.profile?.username || '';
  const roleLbl  = AUTH.role === 'admin' ? 'Admin' : (AUTH.role === 'president' ? 'Presidente' : 'Usuario');

  // Avatar del usuario — usa _profileAvatarData si ya fue tocado, si no usa el guardado en Firestore
  const avatarSrc = _profileAvatarData !== undefined ? _profileAvatarData : (AUTH.profile?.photoURL || null);
  const avatarInner = avatarSrc
    ? `<img src="${_pfEsc(avatarSrc)}" style="width:100%;height:100%;object-fit:cover;">`
    : `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" style="display:block;color:var(--txt3);"><path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12zm0 2.25c-3.6 0-7.5 1.9-7.5 4.95V20.5h15v-1.3c0-3.05-3.9-4.95-7.5-4.95z"/></svg>`;

  let html = `
    <div style="display:flex;gap:14px;align-items:center;margin-bottom:16px;">
      <div id="profile-avatar-preview" style="width:72px;height:72px;border-radius:50%;overflow:hidden;flex:none;display:flex;align-items:center;justify-content:center;background:var(--card2);border:2px solid var(--brd2);">
        ${avatarInner}
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <input type="file" id="profile-avatar-file" accept="image/*" style="display:none;" onchange="profilePreviewAvatar(this)">
        <button class="btn btn-sm" onclick="document.getElementById('profile-avatar-file').click()">Cambiar foto</button>
        <button class="btn btn-xs btn-danger" id="profile-avatar-remove-btn" onclick="profileRemoveAvatar()" style="${avatarSrc ? '' : 'display:none;'}">Quitar foto</button>
      </div>
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
    <div style="font-size:12px;color:var(--txt3);margin:-4px 0 12px;">
      ${_pfEsc(email)} · <b>${roleLbl}</b>
    </div>
    <button class="btn btn-sm" onclick="profileChangePassword()">🔑 Cambiar contraseña</button>
  `;

  // Sección club (solo para usuarios con equipo vinculado)
  if (team){
    const currentLogo = _profileLogoData !== undefined ? _profileLogoData : team.logo;
    const logoInner = currentLogo
      ? `<img src="${_pfEsc(currentLogo)}" style="width:100%;height:100%;object-fit:cover;">`
      : `<span style="font-family:'Bebas Neue';font-size:22px;color:#fff;">${_pfEsc((team.ini||team.name||'?').slice(0,3))}</span>`;
    const dis = locked ? 'disabled' : '';
    html += `
      <div style="border-top:1px solid var(--brd);margin:16px 0 12px;"></div>
      <div class="section-lbl" style="margin-bottom:10px;">Mi club</div>
      ${locked ? `<div style="background:rgba(255,193,7,0.15);border:1px solid #FFC107;border-radius:6px;padding:8px 10px;font-size:12px;color:var(--txt);margin-bottom:12px;">🔒 El administrador bloqueó la edición de nombre y escudo.</div>` : ''}
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:12px;">
        <div id="profile-logo-preview" style="width:64px;height:64px;border-radius:12px;overflow:hidden;flex:none;display:flex;align-items:center;justify-content:center;background:${_pfEsc(team.color||'#333')};">
          ${logoInner}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <input type="file" id="profile-logo-file" accept="image/*" style="display:none;" onchange="profilePreviewLogo(this)">
          <button class="btn btn-sm" ${dis} onclick="document.getElementById('profile-logo-file').click()">Cambiar escudo</button>
          ${(currentLogo) && !locked ? `<button class="btn btn-xs btn-danger" onclick="profileRemoveLogo()">Quitar</button>` : ''}
        </div>
      </div>
      <div class="form-group">
        <label>Nombre del club</label>
        <input type="text" id="profile-team-name" value="${_pfEsc(team.name||'')}" ${dis}>
      </div>
      <button class="btn btn-sm" onclick="profileViewMyMatches()">⟁ Ver el historial de mi club</button>
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

/* ---- Avatar del usuario (foto de perfil, ≠ escudo del club) ---- */

function profilePreviewAvatar(input){
  const file = input.files[0];
  if (!file) return;
  _profileAvatarFile = file;
  _profileAvatarTouched = true;
  const url = URL.createObjectURL(file);
  _profileAvatarData = url;
  const prev = document.getElementById('profile-avatar-preview');
  if (prev) prev.innerHTML = `<img src="${_pfEsc(url)}" style="width:100%;height:100%;object-fit:cover;">`;
  const removeBtn = document.getElementById('profile-avatar-remove-btn');
  if (removeBtn) removeBtn.style.display = '';
  // Actualiza el avatar de la topbar en tiempo real
  _updateTopbarAvatar(url);
}

function profileRemoveAvatar(){
  _profileAvatarData = null;
  _profileAvatarFile = null;
  _profileAvatarTouched = true;
  const prev = document.getElementById('profile-avatar-preview');
  if (prev) prev.innerHTML = `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" style="display:block;color:var(--txt3);"><path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12zm0 2.25c-3.6 0-7.5 1.9-7.5 4.95V20.5h15v-1.3c0-3.05-3.9-4.95-7.5-4.95z"/></svg>`;
  const removeBtn = document.getElementById('profile-avatar-remove-btn');
  if (removeBtn) removeBtn.style.display = 'none';
  _updateTopbarAvatar(null);
}

function _updateTopbarAvatar(url){
  const btn = document.querySelector('.auth-avatar');
  if (!btn) return;
  btn.innerHTML = url
    ? `<img src="${_pfEsc(url)}" alt="" style="width:100%;height:100%;object-fit:cover;">`
    : `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="display:block;"><path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12zm0 2.25c-3.6 0-7.5 1.9-7.5 4.95V20.5h15v-1.3c0-3.05-3.9-4.95-7.5-4.95z"/></svg>`;
}

/* ---- Escudo del club ---- */

function profilePreviewLogo(input){
  const file = input.files[0];
  if (!file) return;
  _profileLogoFile = file;
  _profileLogoTouched = true;
  const url = URL.createObjectURL(file);
  _profileLogoData = url;
  const prev = document.getElementById('profile-logo-preview');
  if (prev) prev.innerHTML = `<img src="${_pfEsc(url)}" style="width:100%;height:100%;object-fit:cover;">`;
}

function profileRemoveLogo(){
  _profileLogoData = null;
  _profileLogoFile = null;
  _profileLogoTouched = true;
  const team = window._profileTeam || {};
  const prev = document.getElementById('profile-logo-preview');
  if (prev) prev.innerHTML = `<span style="font-family:'Bebas Neue';font-size:22px;color:#fff;">${_pfEsc((team.ini||team.name||'?').slice(0,3))}</span>`;
}

/* ---- Acciones de cuenta ---- */

async function profileChangePassword(){
  try {
    await firebase.auth().sendPasswordResetEmail(AUTH.user.email);
    showToast('📧 Te enviamos un correo · revisa tu carpeta de SPAM');
  } catch(e){ showToast('Error: '+(e.code||e.message), 'error'); }
}

function profileViewMyMatches(){
  const team = window._profileTeam;
  if (!team) return;
  closeModal('profile-modal');
  if (typeof _histState !== 'undefined'){ _histState.qA = team.name; _histState.qB = ''; _histState.page = 1; }
  setMode('public');
  goPublicPage('historial');
}

/* ---- Guardar todo ---- */

async function saveProfile(){
  const newName     = document.getElementById('profile-name')?.value.trim();
  const newUsername = document.getElementById('profile-username')?.value.trim();
  const team        = window._profileTeam;
  try {
    const userRef = firebase.firestore().collection('users').doc(AUTH.user.uid);
    const upd     = {};

    // 1. Foto de perfil del usuario (independiente del escudo del club)
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
    if (newName && newName !== (AUTH.profile?.displayName || '')){
      upd.displayName = newName;
    }

    // 3. Nombre de usuario (@handle) con verificación de unicidad
    if (newUsername !== (AUTH.profile?.username || '')){
      if (newUsername){
        const snap = await firebase.firestore().collection('users').where('username','==',newUsername).get();
        const taken = snap.docs.some(d => d.id !== AUTH.user.uid);
        if (taken){ showToast('Ese nombre de usuario ya está en uso','error'); return; }
      }
      upd.username = newUsername || null;
    }

    if (Object.keys(upd).length){
      await userRef.update(upd);
      Object.assign(AUTH.profile, upd);
    }

    // Refleja la nueva foto en la topbar (si cambió)
    if ('photoURL' in upd) _updateTopbarAvatar(upd.photoURL);
    if (typeof renderAuthUI === 'function') renderAuthUI();

    // 4. Escudo y nombre del club — solo si no está bloqueado
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
