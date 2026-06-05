'use strict';
/* ============================================================
   PERFIL DE USUARIO
   - Foto de perfil propia (independiente del escudo del club)
   - Nombre de usuario único (@handle)
   - Nombre para mostrar + cambio de contraseña
   - Cambio de email con re-autenticación
   - Verificación de email
   - Estadísticas del club (gráfico W/D/L + GF/GC)
   - Si vinculado a club: editar nombre/escudo del club
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

  // Carga equipo primero, luego stats (stats necesitan el objeto team para comparar nombres)
  const team  = AUTH.teamId != null ? await dbGet('teams', AUTH.teamId).catch(()=>null) : null;
  const stats = team ? await _loadTeamStats(AUTH.teamId, team) : null;
  const locked = !!(AUTH.profile && AUTH.profile.lockEdits);
  window._profileTeam = team;

  const name     = AUTH.profile?.displayName || AUTH.user.email;
  const email    = AUTH.user.email;
  const username = AUTH.profile?.username || '';
  const verified = AUTH.user.emailVerified;
  const roleLbl  = AUTH.role === 'admin' ? 'Admin' : (AUTH.role === 'president' ? 'Presidente' : 'Usuario');

  // Avatar del usuario (≠ escudo del club)
  const avatarSrc = _profileAvatarData !== undefined ? _profileAvatarData : (AUTH.profile?.photoURL || null);
  const avatarInner = avatarSrc
    ? `<img src="${_pfEsc(avatarSrc)}" style="width:100%;height:100%;object-fit:cover;">`
    : `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" style="display:block;color:var(--txt3);"><path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12zm0 2.25c-3.6 0-7.5 1.9-7.5 4.95V20.5h15v-1.3c0-3.05-3.9-4.95-7.5-4.95z"/></svg>`;

  // Badge de verificación de email
  const verBadge = verified
    ? `<span style="color:#2ecc71;font-size:11px;font-weight:600;">✓ verificado</span>`
    : `<span style="color:#FFC107;font-size:11px;font-weight:600;">⚠ sin verificar</span>
       <button class="btn btn-xs" onclick="profileResendVerification()" style="font-size:10px;padding:2px 7px;">Verificar</button>`;

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

    <div style="font-size:12px;color:var(--txt3);margin:-4px 0 10px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
      ${_pfEsc(email)} ${verBadge} · <b>${roleLbl}</b>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:2px;">
      <button class="btn btn-sm" onclick="profileChangePassword()">🔑 Cambiar contraseña</button>
      <button class="btn btn-sm" onclick="profileToggleEmailChange()">✉ Cambiar email</button>
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

  // ── Sección Club ────────────────────────────────────────────
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
    `;

    // Stats + donut chart
    if (stats) html += _statsHTML(stats);

    html += `
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:12px;">
        <div id="profile-logo-preview" style="width:64px;height:64px;border-radius:12px;overflow:hidden;flex:none;display:flex;align-items:center;justify-content:center;background:${_pfEsc(team.color||'#333')};">
          ${logoInner}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <input type="file" id="profile-logo-file" accept="image/*" style="display:none;" onchange="profilePreviewLogo(this)">
          <button class="btn btn-sm" ${dis} onclick="document.getElementById('profile-logo-file').click()">Cambiar escudo</button>
          ${currentLogo && !locked ? `<button class="btn btn-xs btn-danger" onclick="profileRemoveLogo()">Quitar</button>` : ''}
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

/* ── Estadísticas del club ──────────────────────────────────── */

async function _loadTeamStats(teamId, team){
  const id = Number(teamId);

  // Normalización idéntica a history.js (_histNorm puede no estar cargado aún)
  const _norm = s => String(s||'').toUpperCase().replace(/[.,]/g,'').replace(/\s+/g,' ').trim();
  const allNames = new Set([
    _norm(team.name),
    ...((Array.isArray(team.previousNames) ? team.previousNames : []).map(_norm))
  ].filter(Boolean));

  let W=0, D=0, L=0, GF=0, GA=0;
  const _tally = (gf, ga) => {
    GF += gf; GA += ga;
    if (gf > ga) W++; else if (gf < ga) L++; else D++;
  };

  // Carga en paralelo: JSON estático + matchHistory live + matches (para resolver refs)
  const [staticRows, liveHistory, allMatches] = await Promise.all([
    typeof loadStaticHistory === 'function' ? loadStaticHistory() : Promise.resolve([]),
    dbGetAll('matchHistory', h => h.source === 'live'),
    dbGetAll('matches'),
  ]);
  const matchById = {};
  for (const m of allMatches) matchById[m.id] = m;

  // Fuente 1: JSON estático — identificación por nombre de equipo
  for (const r of staticRows){
    if (r.golesA == null || r.golesB == null) continue;
    const isA = allNames.has(_norm(r.equipoA));
    const isB = !isA && allNames.has(_norm(r.equipoB));
    if (!isA && !isB) continue;
    _tally(isA ? r.golesA : r.golesB, isA ? r.golesB : r.golesA);
  }

  // Fuente 2: matchHistory live — congelados (nombre guardado) o sin congelar (via matchRef)
  for (const h of liveHistory){
    if (h.golesA == null || h.golesB == null) continue;
    if (h.equipoA && h.equipoB){
      // Registro congelado: nombres guardados directamente
      const isA = allNames.has(_norm(h.equipoA));
      const isB = !isA && allNames.has(_norm(h.equipoB));
      if (!isA && !isB) continue;
      _tally(isA ? h.golesA : h.golesB, isA ? h.golesB : h.golesA);
    } else if (h.matchRef != null){
      // No congelado (temporada actual): resolver via matches store por ID
      const m = matchById[h.matchRef];
      if (!m) continue;
      const mA = Number(m.teamA), mB = Number(m.teamB);
      if (mA !== id && mB !== id) continue;
      _tally(mA === id ? h.golesA : h.golesB, mA === id ? h.golesB : h.golesA);
    }
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

/* ── Avatar del usuario (foto de perfil, ≠ escudo del club) ── */

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

/* ── Escudo del club ────────────────────────────────────────── */

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

/* ── Verificación y cambio de email ────────────────────────── */

async function profileResendVerification(){
  try {
    await AUTH.user.sendEmailVerification();
    showToast('📧 Correo de verificación enviado · revisa tu SPAM');
  } catch(e){ showToast('Error: '+(e.code||e.message),'error'); }
}

function profileToggleEmailChange(){
  const sec = document.getElementById('profile-email-change-section');
  if (!sec) return;
  const open = sec.style.display === 'none' || !sec.style.display;
  sec.style.display = open ? '' : 'none';
  if (open){
    document.getElementById('profile-new-email')?.focus();
  } else {
    if (document.getElementById('profile-new-email'))     document.getElementById('profile-new-email').value = '';
    if (document.getElementById('profile-curr-pass-email')) document.getElementById('profile-curr-pass-email').value = '';
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
    showToast('📧 Correo de verificación enviado a '+newEmail+' · revisa tu SPAM');
    profileToggleEmailChange();
  } catch(e){
    showToast(errMap[e.code] || ('Error: '+(e.message||e)), 'error');
  }
}

/* ── Cambio de contraseña ───────────────────────────────────── */

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

/* ── Guardar todo ───────────────────────────────────────────── */

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
