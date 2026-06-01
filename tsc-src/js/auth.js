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
          <input type="password" id="auth-pass" placeholder="••••••••" autocomplete="current-password">
        </div>
        <div id="auth-error" style="color:#e74c3c;font-size:13px;min-height:18px;"></div>
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
  document.getElementById('auth-error').textContent = '';
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
    const name   = AUTH.profile?.displayName || AUTH.user.email;
    const roleLbl = AUTH.role === 'admin' ? 'Admin' : (AUTH.role === 'president' ? 'Presidente' : 'Usuario');
    area.innerHTML =
      `<span class="auth-user" title="${_authEsc(AUTH.user.email)}" style="color:var(--txt2);font-size:12px;margin-right:6px;">`
      + `${_authEsc(name)} · ${roleLbl}</span>`
      + `<button class="mode-btn" onclick="authSignOut()">Salir</button>`;
    if (btnAdm) btnAdm.style.display = (AUTH.role === 'admin') ? '' : 'none';
    if (btnPub) btnPub.style.display = (AUTH.role === 'admin') ? '' : 'none';
  } else {
    area.innerHTML = `<button class="mode-btn" onclick="openAuthModal()">Entrar</button>`;
    if (btnAdm) btnAdm.style.display = 'none';
    if (btnPub) btnPub.style.display = 'none';
    if (STATE.mode === 'admin' && typeof setMode === 'function') setMode('public');
  }
}
