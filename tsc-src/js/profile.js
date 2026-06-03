'use strict';
/* ============================================================
   PERFIL DE USUARIO
   - Editar nombre propio y cambiar contraseña
   - Si está vinculado a un club: ver datos + historial y editar
     nombre/logo (versión simple), salvo que el admin lo bloquee.
   ============================================================ */

let _profileLogoData;          // URL del logo (existente o preview temporal)
let _profileLogoFile;          // archivo nuevo pendiente de subir a la nube
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

  // Equipo vinculado + bloqueo de edición
  let team = null, locked = false;
  if (AUTH.teamId != null){
    try { team = await dbGet('teams', AUTH.teamId); } catch(_){}
  }
  locked = !!(AUTH.profile && AUTH.profile.lockEdits);
  window._profileTeam = team;

  const name  = AUTH.profile?.displayName || AUTH.user.email;
  const email = AUTH.user.email;
  const roleLbl = AUTH.role === 'admin' ? 'Admin' : (AUTH.role === 'president' ? 'Presidente' : 'Usuario');

  // --- Sección Cuenta ---
  let html = `
    <div class="form-group">
      <label>Tu nombre</label>
      <input type="text" id="profile-name" value="${_pfEsc(name)}">
    </div>
    <div style="font-size:12px;color:var(--txt3);margin:-4px 0 12px;">
      ${_pfEsc(email)} · <b>${roleLbl}</b>
    </div>
    <button class="btn btn-sm" onclick="profileChangePassword()">🔑 Cambiar contraseña</button>
  `;

  // --- Sección Club ---
  if (team){
    const logoInner = (_profileLogoData || team.logo)
      ? `<img src="${_pfEsc(_profileLogoData || team.logo)}" style="width:100%;height:100%;object-fit:cover;">`
      : `<span style="font-family:'Bebas Neue';font-size:22px;color:#fff;">${_pfEsc((team.ini||team.name||'?').slice(0,3))}</span>`;
    const dis = locked ? 'disabled' : '';
    html += `
      <div style="border-top:1px solid var(--brd);margin:16px 0 12px;"></div>
      <div class="section-lbl" style="margin-bottom:10px;">Mi club</div>
      ${locked ? `<div style="background:rgba(255,193,7,0.15);border:1px solid #FFC107;border-radius:6px;padding:8px 10px;font-size:12px;color:var(--txt);margin-bottom:12px;">🔒 El administrador bloqueó la edición de nombre y logo.</div>` : ''}
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:12px;">
        <div id="profile-logo-preview" style="width:64px;height:64px;border-radius:12px;overflow:hidden;flex:none;display:flex;align-items:center;justify-content:center;background:${_pfEsc(team.color||'#333')};">
          ${logoInner}
        </div>
        <div>
          <input type="file" id="profile-logo-file" accept="image/*" style="display:none;" onchange="profilePreviewLogo(this)">
          <button class="btn btn-sm" ${dis} onclick="document.getElementById('profile-logo-file').click()">Cambiar logo</button>
          ${(team.logo||_profileLogoData)&&!locked ? `<button class="btn btn-xs btn-danger" onclick="profileRemoveLogo()">Quitar</button>` : ''}
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
    <div class="modal-footer" style="margin-top:18px;padding:0;border:none;">
      <button class="btn btn-primary" onclick="saveProfile()">Guardar cambios</button>
    </div>`;

  body.innerHTML = html;
}

function profilePreviewLogo(input){
  const file = input.files[0];
  if (!file) return;
  _profileLogoFile = file;
  _profileLogoTouched = true;
  const url = URL.createObjectURL(file);
  _profileLogoData = url;  // preview temporal; se sube al guardar
  const prev = document.getElementById('profile-logo-preview');
  if (prev) prev.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`;
}

function profileRemoveLogo(){
  _profileLogoData = null;
  _profileLogoFile = null;
  _profileLogoTouched = true;
  const team = window._profileTeam || {};
  const prev = document.getElementById('profile-logo-preview');
  if (prev) prev.innerHTML = `<span style="font-family:'Bebas Neue';font-size:22px;color:#fff;">${_pfEsc((team.ini||team.name||'?').slice(0,3))}</span>`;
}

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

async function saveProfile(){
  const newName = document.getElementById('profile-name')?.value.trim();
  const team = window._profileTeam;
  try {
    // 1. Nombre propio (perfil de usuario)
    if (newName && newName !== (AUTH.profile?.displayName || '')){
      await firebase.firestore().collection('users').doc(AUTH.user.uid).update({ displayName: newName });
      if (AUTH.profile) AUTH.profile.displayName = newName;
      if (typeof renderAuthUI === 'function') renderAuthUI();
    }
    // 2. Club (nombre + logo) — solo si no está bloqueado
    if (team){
      const locked = !!(AUTH.profile && AUTH.profile.lockEdits);
      if (!locked){
        const newTeamName = document.getElementById('profile-team-name')?.value.trim();
        const upd = { ...team };
        let changed = false;
        if (newTeamName && newTeamName !== team.name){ upd.name = newTeamName; changed = true; }
        if (_profileLogoTouched){
          let newLogo = _profileLogoData ?? null;
          if (_profileLogoFile){
            if (typeof cloudReady==='function' && !cloudReady()){ showToast('Configura Cloudinary para subir logos','error'); return; }
            try { newLogo = await uploadImageToCloud(_profileLogoFile); }
            catch(e){ showToast('No se pudo subir el logo: '+(e.message||e),'error'); return; }
          }
          upd.logo = newLogo; changed = true;
        }
        if (changed){ await dbPut('teams', upd); window._profileTeam = upd; }
      }
    }
    showToast('Perfil actualizado');
    closeModal('profile-modal');
  } catch(e){
    showToast('Error al guardar: '+(e.code||e.message), 'error');
  }
}
