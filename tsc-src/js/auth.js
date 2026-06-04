'use strict';
/* ============================================================
   AUTENTICACIÓN Y ROLES  (Firebase Auth + colección `users`)
   ------------------------------------------------------------
   Roles: 'public' (sin login) | 'president' | 'admin'
   La colección `users` se indexa por uid (string de Firebase),
   NO por id entero, así que se accede directo a Firestore y no
   por la capa db.js (que asigna ids enteros).
   ============================================================ */

let AUTH = { user: null, role: 'public', teamId: null, profile: null };
let _authMode = 'signin';     // 'signin' | 'signup'
let _pendingSignupName = null; // nombre escrito en el registro (evita carrera con updateProfile)

function _authEsc(v){
  return String(v==null?'':v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function _usersCol(){ return firebase.firestore().collection('users'); }
function isAdmin(){ return AUTH.role === 'admin'; }
function isPresident(){ return AUTH.role === 'president'; }

/* ---- Inyecta el modal de login/registro (una sola vez) ---- */
function _injectAuthModal(){
  if (document.getElementById('auth-modal')) return;
  const div = document.createElement('div');
  div.className = 'modal-overlay';
  div.id = 'auth-modal';
  div.innerHTML = `
    <div class="modal" style="max-width:360px;">
      <div class="modal-hdr">
        <div class="modal-title" id="auth-title">Iniciar sesión</div>
        <button class="modal-close" onclick="closeModal('auth-modal')">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group" id="auth-name-group" style="display:none;">
          <label>Nombre / Club</label>
          <input type="text" id="auth-name" placeholder="Ej: Retrato Lo Retro">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="auth-email" placeholder="tu@email.com" autocomplete="email">
        </div>
        <div class="form-group" style="margin-bottom:6px;">
          <label>Contraseña</label>
          <div style="position:relative;">
            <input type="password" id="auth-pass" placeholder="••••••••" autocomplete="current-password" style="padding-right:40px;width:100%;box-sizing:border-box;">
            <button type="button" id="auth-eye" onclick="toggleAuthPass()" title="Mostrar/ocultar contraseña"
              style="position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:17px;line-height:1;padding:2px;">👁️</button>
          </div>
        </div>
        <div id="auth-error" style="color:#e74c3c;font-size:13px;min-height:18px;"></div>
        <button type="button" id="auth-forgot" onclick="authForgotPassword()"
          style="background:none;border:none;color:var(--txt2);font-size:12px;cursor:pointer;padding:0;text-align:left;">¿Olvidaste tu contraseña?</button>
      </div>
      <div class="modal-footer" style="flex-direction:column;align-items:stretch;gap:8px;">
        <button class="btn btn-primary" id="auth-submit" onclick="authSubmit()">Entrar</button>
        <button class="btn" id="auth-toggle" onclick="toggleAuthMode()" style="background:none;border:none;">¿No tienes cuenta? Crear una</button>
      </div>
    </div>`;
  document.body.appendChild(div);
}

function openAuthModal(){
  _injectAuthModal();
  _authMode = 'signin';
  _renderAuthModalMode();
  openModal('auth-modal');
}

function toggleAuthMode(){
  _authMode = (_authMode === 'signin') ? 'signup' : 'signin';
  _renderAuthModalMode();
}

function _renderAuthModalMode(){
  const signup = _authMode === 'signup';
  document.getElementById('auth-title').textContent  = signup ? 'Crear cuenta' : 'Iniciar sesión';
  document.getElementById('auth-name-group').style.display = signup ? '' : 'none';
  document.getElementById('auth-submit').textContent = signup ? 'Crear cuenta' : 'Entrar';
  document.getElementById('auth-toggle').textContent = signup
    ? '¿Ya tienes cuenta? Inicia sesión'
    : '¿No tienes cuenta? Crear una';
  const forgot = document.getElementById('auth-forgot');
  if (forgot) forgot.style.display = signup ? 'none' : '';   // recuperar solo en login
  // resetear visibilidad de la contraseña al cambiar de modo
  const pass = document.getElementById('auth-pass');
  const eye  = document.getElementById('auth-eye');
  if (pass) pass.type = 'password';
  if (eye)  eye.textContent = '👁️';
  document.getElementById('auth-error').textContent = '';
}

/* Mostrar / ocultar la contraseña (ojo) */
function toggleAuthPass(){
  const inp = document.getElementById('auth-pass');
  const eye = document.getElementById('auth-eye');
  if (!inp) return;
  if (inp.type === 'password'){ inp.type = 'text';     if (eye) eye.textContent = '🙈'; }
  else                        { inp.type = 'password'; if (eye) eye.textContent = '👁️'; }
}

/* Recuperar cuenta: envía email de restablecimiento de contraseña */
async function authForgotPassword(){
  const email = document.getElementById('auth-email').value.trim();
  const errEl = document.getElementById('auth-error');
  errEl.style.color = '#e74c3c';
  if (!email){ errEl.textContent = 'Escribe tu email arriba y vuelve a tocar aquí.'; return; }
  try {
    await firebase.auth().sendPasswordResetEmail(email);
    // Aviso persistente con advertencia de SPAM (no se cierra el modal)
    errEl.style.color = '';
    errEl.innerHTML = `<div style="background:rgba(255,193,7,0.15);border:1px solid #FFC107;border-radius:6px;padding:10px;color:var(--txt);text-align:left;line-height:1.45;font-size:13px;">
      📧 Te enviamos un correo a <b>${_authEsc(email)}</b>.<br>
      ⚠️ <b>Revisa tu carpeta de SPAM</b> / correo no deseado si no lo ves en unos minutos.</div>`;
    showToast('📧 Correo enviado · revisa tu carpeta de SPAM');
  } catch(e){
    errEl.style.color = '#e74c3c';
    errEl.textContent = _authErrorMsg(e);
  }
}

async function authSubmit(){
  const email = document.getElementById('auth-email').value.trim();
  const pass  = document.getElementById('auth-pass').value;
  const errEl = document.getElementById('auth-error');
  errEl.textContent = '';
  if (!email || !pass){ errEl.textContent = 'Completa email y contraseña.'; return; }
  const btn = document.getElementById('auth-submit');
  btn.disabled = true;
  try {
    if (_authMode === 'signup'){
      const name = document.getElementById('auth-name').value.trim();
      _pendingSignupName = name || null;   // lo usa _loadProfile al crear el perfil
      const cred = await firebase.auth().createUserWithEmailAndPassword(email, pass);
      if (name) await cred.user.updateProfile({ displayName: name });
      // el perfil en `users` lo crea onAuthStateChanged → _loadProfile
    } else {
      await firebase.auth().signInWithEmailAndPassword(email, pass);
    }
    closeModal('auth-modal');
    document.getElementById('auth-pass').value = '';
  } catch(e){
    errEl.textContent = _authErrorMsg(e);
  } finally {
    btn.disabled = false;
  }
}

function _authErrorMsg(e){
  const map = {
    'auth/invalid-email':         'Email inválido.',
    'auth/user-not-found':        'No existe una cuenta con ese email.',
    'auth/wrong-password':        'Contraseña incorrecta.',
    'auth/invalid-credential':    'Email o contraseña incorrectos.',
    'auth/email-already-in-use':  'Ya existe una cuenta con ese email.',
    'auth/weak-password':         'La contraseña debe tener al menos 6 caracteres.',
    'auth/too-many-requests':     'Demasiados intentos. Espera un momento.',
  };
  return map[e?.code] || ('Error: ' + (e?.message || e));
}

async function authSignOut(){
  try { await firebase.auth().signOut(); showToast('Sesión cerrada'); }
  catch(e){ showToast('Error al cerrar sesión','error'); }
}

/* ---- Carga (o crea) el perfil del usuario en Firestore ---- */
async function _loadProfile(user){
  const ref = _usersCol().doc(user.uid);
  const snap = await ref.get();
  if (snap.exists) return snap.data();
  const profile = {
    uid: user.uid,
    email: user.email,
    displayName: _pendingSignupName || user.displayName || (user.email||'').split('@')[0],
    role: 'president',   // por defecto; admin se asigna a mano (consola/Fase 5)
    teamId: null,
    createdAt: new Date().toISOString(),
  };
  _pendingSignupName = null;
  await ref.set(profile);
  return profile;
}

/* ---- Listener principal del estado de autenticación ---- */
function onAuthInit(){
  if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function') return;
  _injectAuthModal();
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user){
      let profile;
      try { profile = await _loadProfile(user); }
      catch(e){ profile = { role:'president', teamId:null, displayName:user.email }; }
      AUTH = { user, role: profile.role || 'president', teamId: (profile.teamId ?? null), profile };
    } else {
      AUTH = { user: null, role: 'public', teamId: null, profile: null };
    }
    renderAuthUI();
  });
}

/* ---- Refleja el estado de sesión en la topbar ---- */
function renderAuthUI(){
  const area   = document.getElementById('auth-area');
  const btnPub = document.getElementById('btn-pub');
  const btnAdm = document.getElementById('btn-adm');
  if (!area) return;
  if (AUTH.user){
    // Solo avatar (sin nombre). Foto de la cuenta si existe; si no, SVG genérico.
    const photo  = AUTH.user.photoURL;
    const avatar = photo
      ? `<img src="${_authEsc(photo)}" alt="" style="width:100%;height:100%;object-fit:cover;">`
      : `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="display:block;"><path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12zm0 2.25c-3.6 0-7.5 1.9-7.5 4.95V20.5h15v-1.3c0-3.05-3.9-4.95-7.5-4.95z"/></svg>`;
    area.innerHTML =
      `<button class="auth-avatar" title="Mi perfil" aria-label="Mi perfil" onclick="openProfile()">${avatar}</button>`;
    if (btnAdm) btnAdm.style.display = (AUTH.role === 'admin') ? '' : 'none';
    if (btnPub) btnPub.style.display = (AUTH.role === 'admin') ? '' : 'none';
  } else {
    area.innerHTML = `<button class="mode-btn" onclick="openAuthModal()">Entrar</button>`;
    if (btnAdm) btnAdm.style.display = 'none';
    if (btnPub) btnPub.style.display = 'none';
    if (STATE.mode === 'admin' && typeof setMode === 'function') setMode('public');
  }
}
