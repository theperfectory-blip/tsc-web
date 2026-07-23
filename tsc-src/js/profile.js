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
let _profileReturnFocus = null;   // elemento al que devolver el foco al cerrar el drawer

function _pfEsc(v){
  return String(v==null?'':v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ── Pila de capas cerrables con Escape ─────────────────────────
   El drawer de perfil, el modal de fotos y el visor ampliado pueden quedar
   anidados (visor > fotos > perfil). El handler global de ui-utils.js
   cierra TODOS los .modal-overlay.open/.profile-backdrop.open de un tirón
   con un solo Escape — correcto para el resto de la app (un modal a la
   vez), pero rompe acá: un Escape debe cerrar solo la capa de más arriba.
   Este handler intercepta en capture ANTES que el global (bubble) y cierra
   únicamente el tope de la pila; con la pila vacía no hace nada y el
   handler global sigue funcionando sin cambios para el resto de la app. */
const _pfEscStack = [];
function _pfPushEscLayer(closeFn){ _pfEscStack.push(closeFn); }
function _pfPopEscLayer(closeFn){
  const i = _pfEscStack.lastIndexOf(closeFn);
  if (i !== -1) _pfEscStack.splice(i, 1);
}
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !_pfEscStack.length) return;
  e.preventDefault();
  e.stopPropagation();
  _pfEscStack[_pfEscStack.length - 1]();
}, true);

function _pfCloseProfileModal(){ closeModal('profile-modal'); }

function _injectProfileModal(){
  if (document.getElementById('profile-modal')) return;
  // Drawer anclado arriba-derecha (desktop) · full-height (móvil), no un modal centrado.
  const div = document.createElement('div');
  div.className = 'profile-backdrop';
  div.id = 'profile-modal';
  div.setAttribute('role','dialog');
  div.setAttribute('aria-modal','true');
  div.setAttribute('aria-label','Mi perfil');
  div.innerHTML = `
    <div class="profile-menu">
      <div class="pp-drawer" id="profile-drawer" tabindex="-1">
        <button type="button" class="pp-close" aria-label="Cerrar perfil" onclick="closeModal('profile-modal')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div id="profile-body"></div>
      </div>
    </div>`;
  document.body.appendChild(div);
  // Click en el backdrop (fuera del panel) cierra el drawer.
  div.addEventListener('mousedown', e=>{ if(e.target===div) closeModal('profile-modal'); });
  // Gestión de foco: el drawer cierra por varias vías (botón, backdrop, Escape
  // global). Observamos la clase .open para correr setup/teardown sin importar
  // cómo se cerró: foco al panel al abrir, atrapado mientras abierto, devuelto al
  // disparador al cerrar.
  let _wasOpen = false;
  new MutationObserver(()=>{
    const open = div.classList.contains('open');
    if(open && !_wasOpen){
      _wasOpen = true;
      document.addEventListener('keydown', _profileTrapKeydown, true);
      _onProfileOpen();
    } else if(!open && _wasOpen){
      _wasOpen = false;
      document.removeEventListener('keydown', _profileTrapKeydown, true);
      _onProfileClose();
    }
  }).observe(div, { attributes:true, attributeFilter:['class'] });
}

/* Elementos enfocables visibles dentro del drawer (orden DOM). */
function _profileFocusables(drawer){
  if(!drawer) return [];
  return [...drawer.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
    .filter(el => el.offsetWidth>0 || el.offsetHeight>0 || el===document.activeElement);
}

/* Al abrir: recuerda el disparador, marca el botón como expandido y mueve el foco
   al panel (primer enfocable, o el panel mismo como respaldo). */
function _onProfileOpen(){
  const drawer = document.getElementById('profile-drawer');
  const btn = document.getElementById('profile-btn');
  _profileReturnFocus = btn || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  if(btn) btn.setAttribute('aria-expanded','true');
  _pfPushEscLayer(_pfCloseProfileModal);
  if(!drawer) return;
  const f = _profileFocusables(drawer);
  (f[0] || drawer).focus({ preventScroll:true });
}

/* Al cerrar: desmarca el botón y devuelve el foco al disparador. */
function _onProfileClose(){
  const btn = document.getElementById('profile-btn');
  if(btn) btn.setAttribute('aria-expanded','false');
  _pfPopEscLayer(_pfCloseProfileModal);
  const ret = _profileReturnFocus;
  _profileReturnFocus = null;
  if(ret && document.contains(ret)){ try{ ret.focus({ preventScroll:true }); }catch(e){} }
}

/* Atrapa el Tab dentro del drawer mientras está abierto (ciclo first↔last). */
function _profileTrapKeydown(e){
  if(e.key!=='Tab') return;
  const drawer = document.getElementById('profile-drawer');
  if(!drawer) return;
  const f = _profileFocusables(drawer);
  if(!f.length){ e.preventDefault(); drawer.focus({ preventScroll:true }); return; }
  const first = f[0], last = f[f.length-1], active = document.activeElement;
  if(e.shiftKey){
    if(active===first || !drawer.contains(active)){ e.preventDefault(); last.focus(); }
  } else {
    if(active===last || !drawer.contains(active)){ e.preventDefault(); first.focus(); }
  }
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

/* ── Vitrina de títulos (palmarés) ──────────────────────────── */

async function _pfTeamTitles(teamId){
  if (teamId == null) return [];
  const all = await getAllPalmaresRecords();
  return all.filter(r => r.teamId === teamId);
}

function _pfCompImportanceIdx(key){
  const i = PALM_IMPORTANCE.indexOf(key);
  return i === -1 ? PALM_IMPORTANCE.length : i;
}

/* Un chip por competición ganada, ordenado por PALM_IMPORTANCE (no por el
   orden de columnas de PALMARES_COMPS). Descarta títulos de una copa que ya
   no existe en PALMARES_COMPS en vez de romper el render con datos a medias. */
function _pfVitrinaChips(teamTitles){
  const byComp = new Map();
  teamTitles.forEach(r => byComp.set(r.competition, (byComp.get(r.competition)||0) + 1));
  return [...byComp.entries()]
    .map(([key, n]) => ({ key, n, comp: palmaresCompByKey(key) }))
    .filter(c => c.comp)
    .sort((a, b) => _pfCompImportanceIdx(a.key) - _pfCompImportanceIdx(b.key));
}

async function renderProfileBody(){
  const body = document.getElementById('profile-body');
  if (!body) return;

  const team   = AUTH.teamId != null ? await dbGet('teams', AUTH.teamId).catch(()=>null) : null;
  const locked = !!(AUTH.profile && AUTH.profile.lockEdits);
  window._profileTeam = team;

  const name     = AUTH.profile?.displayName || AUTH.user.email;
  const email    = AUTH.user.email;
  const username = AUTH.profile?.username || '';
  const verified = AUTH.user.emailVerified;
  const roleLbl  = AUTH.role==='admin' ? 'Admin' : (AUTH.role==='president' ? 'Presidente' : 'Usuario');

  const avatarSrc = _profileAvatarData !== undefined ? _profileAvatarData : (AUTH.profile?.photoURL || null);
  const currentLogo = _profileLogoData !== undefined ? _profileLogoData : team?.logo;

  const tc  = (team?.color  && /^#[0-9A-Fa-f]{3,8}$/.test(team.color))  ? team.color  : '#1a1a2e';
  const tc2 = (team?.color2 && /^#[0-9A-Fa-f]{3,8}$/.test(team.color2)) ? team.color2 : tc;

  // Forma reciente: últimos 5 resultados del club (desde matches de la temporada)
  let recentForm = [];
  if(team){
    try {
      const done = (await getForSeason('matches'))
        .filter(m=>(m.teamA===team.id||m.teamB===team.id) && m.goalsA!=null && m.goalsB!=null)
        .sort((a,b)=>{
          const ka=(a.scheduledDate||'')+String(a.id||0).padStart(9,'0');
          const kb=(b.scheduledDate||'')+String(b.id||0).padStart(9,'0');
          return ka<kb?-1:ka>kb?1:0;
        });
      recentForm = done.slice(-5).map(m=>{
        const isA=m.teamA===team.id, gf=isA?m.goalsA:m.goalsB, ga=isA?m.goalsB:m.goalsA;
        return gf>ga?'w':gf<ga?'l':'d';
      });
    } catch(e){ recentForm=[]; }
  }

  const stats = team ? await _loadTeamStats(AUTH.teamId, team).catch(()=>null) : null;

  // Palmarés del club: títulos ganados, para el contador del header y la vitrina
  const teamTitles = team ? await _pfTeamTitles(team.id).catch(()=>[]) : [];
  const titlesTotal = teamTitles.length;
  const vitrinaChips = _pfVitrinaChips(teamTitles);
  const hasChampionPhotos = teamTitles.some(r => _palmGallerySafeItems(r.gallery).length > 0);
  // Admin ve el botón aunque no haya fotos todavía: es quien las carga, no
  // solo quien las mira (A.4 escondía el único camino para subir la primera).
  const showPhotosBtn = hasChampionPhotos || AUTH.role === 'admin';
  const photosBtnLabel = hasChampionPhotos ? 'Fotos de campeón' : 'Agregar fotos';

  // ── Crest para el header ─────────────────────────────────────
  const crestContent = currentLogo
    ? `<img src="${_pfEsc(currentLogo)}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" alt="">`
    : `<span style="font-family:'Bebas Neue';font-size:17px;color:#fff;">${_pfEsc((team?.ini||team?.name||'?').slice(0,3).toUpperCase())}</span>`;
  const titlesBadge = titlesTotal > 0
    ? `<span class="pp-titles-badge" title="${titlesTotal} título${titlesTotal===1?'':'s'} en el club">×${titlesTotal}</span>`
    : '';

  // ── Header con gradiente del club ────────────────────────────
  const _pipLetter = { w:'V', d:'E', l:'D' };
  const hdrHtml = `<div class="pp-hdr" style="--team-color:${_pfEsc(tc)};--team-color-2:${_pfEsc(tc2)};">
    <div class="pp-id">
      ${team ? `
        <label for="profile-logo-file" style="position:relative;display:block;${locked?'':'cursor:pointer;'}" title="${locked?'Bloqueado':'Cambiar escudo'}">
          <div class="pp-crest" id="profile-logo-preview" style="background:${_pfEsc(tc)};">${crestContent}</div>
          ${titlesBadge}
        </label>
        <input type="file" id="profile-logo-file" accept="image/*" style="display:none;" ${locked?'disabled':''} onchange="profileSelectLogo(this)">
      ` : `
        <label for="profile-avatar-file" style="cursor:pointer;" title="Cambiar foto de perfil">
          <div class="pp-crest" id="profile-avatar-preview" style="border-radius:50%;background:rgba(255,255,255,0.15);">
            ${avatarSrc ? `<img src="${_pfEsc(avatarSrc)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">` : `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`}
          </div>
        </label>
        <input type="file" id="profile-avatar-file" accept="image/*" style="display:none;" onchange="profileSelectAvatar(this)">
      `}
      <div>
        <div class="pp-club">${_pfEsc(team?.name || name)}</div>
        <div class="pp-user">
          ${_pfEsc(username ? '@'+username : email.split('@')[0])}
          <span class="pp-role">${_pfEsc(roleLbl)}</span>
        </div>
      </div>
    </div>
  </div>`;

  // ── Cuerpo ───────────────────────────────────────────────────
  let bd = '';

  if(stats && stats.P > 0) bd += _statsHTML(stats);

  if(recentForm.length){
    bd += `<div class="pp-line">
      <span class="pp-line-label">Forma reciente</span>
      <div class="form-strip" title="Forma reciente (últimos ${recentForm.length})" aria-label="Forma reciente">${recentForm.map(r=>`<span class="form-pip ${r}" title="${r==='w'?'Victoria':r==='d'?'Empate':'Derrota'}">${_pipLetter[r]||''}</span>`).join('')}</div>
    </div>`;
  }

  if(vitrinaChips.length){
    bd += `<div class="pp-vitrina">
      <span class="pp-line-label">Vitrina</span>
      <div class="pp-vitrina-chips">
        ${vitrinaChips.map(c => `
          <div class="pp-vitrina-chip" style="--chip-color:${_pfEsc(_palmIsHex(c.comp.color)?c.comp.color:'#DAA520')};">
            <span class="pp-vitrina-chip-trophy">${renderTrophy(c.key, 22)}</span>
            <span class="pp-vitrina-chip-label">${_pfEsc(c.comp.label||c.key)}</span>
            <span class="pp-vitrina-chip-n">×${c.n}</span>
          </div>`).join('')}
      </div>
      ${showPhotosBtn ? `<button type="button" class="pp-vitrina-photos-btn" onclick="openChampionPhotosModal(${team.id},this)">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>
        ${photosBtnLabel}
      </button>` : ''}
    </div>`;
  }

  if(team){
    bd += `<button type="button" class="pp-sec" onclick="profileViewMyMatches()">
      <span style="display:flex;align-items:center;gap:8px;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><polyline points="12 7 12 12 15 15"/></svg>Ver el historial de mi club</span>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>`;
  }

  if(AUTH.role==='admin'){
    bd += `<button type="button" class="pp-sec pp-admin" onclick="closeModal('profile-modal');goAdminPage('dashboard');">
      <span style="display:flex;align-items:center;gap:8px;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>Panel Admin</span>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>`;
  }

  if(team){
    bd += `<button type="button" class="pp-sec" aria-expanded="false" aria-controls="profile-club-section" onclick="profileToggleDisclosure('profile-club-section',this)">
      <span style="display:flex;align-items:center;gap:8px;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 9h6"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>Club</span>
      <svg class="pp-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
    <div id="profile-club-section" class="pp-disclosure" hidden>
      ${locked ? `<div class="pp-lock"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span>El administrador bloqueó la edición del club.</span></div>` : ''}
      <div class="form-group" style="margin:0;"><label for="profile-team-name">Nombre del club</label><input type="text" id="profile-team-name" value="${_pfEsc(team.name||'')}" ${locked?'disabled':''}></div>
    </div>`;
  } else {
    if(AUTH.role==='president') bd += '<div class="pp-empty">Aún no tienes un club vinculado. Pídele al administrador que te asigne tu equipo.</div>';
    bd += '<input type="hidden" id="profile-team-name" value="">';
  }

  bd += `<button type="button" class="pp-sec" aria-expanded="false" aria-controls="profile-account-section" onclick="profileToggleDisclosure('profile-account-section',this)">
    <span style="display:flex;align-items:center;gap:8px;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>Mi cuenta</span>
    <svg class="pp-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </button>
  <div id="profile-account-section" class="pp-disclosure" hidden>
    ${team ? `<div class="pp-avatar-row">
      <label for="profile-avatar-file" class="pp-avatar-edit" title="Cambiar foto de perfil">
        <span id="profile-avatar-preview">${avatarSrc ? `<img src="${_pfEsc(avatarSrc)}" alt="">` : `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`}</span>
        <svg class="pp-avatar-pencil" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
      </label>
      <input type="file" id="profile-avatar-file" accept="image/*" hidden onchange="profileSelectAvatar(this)">
      <span>Foto de perfil personal</span>
    </div>` : ''}
    <div class="form-group" style="margin:0;"><label for="profile-name">Nombre para mostrar</label><input type="text" id="profile-name" value="${_pfEsc(name)}"></div>
    <div class="form-group" style="margin:0;"><label for="profile-username">Nombre de usuario</label>
      <div class="pp-at-input"><span aria-hidden="true">@</span><input type="text" id="profile-username" value="${_pfEsc(username)}" placeholder="nombre_usuario" oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9_]/g,'')"></div>
    </div>
    <div class="pp-email-status">${_pfEsc(email)} ${verified
      ? `<span class="pp-verified"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>verificado</span>`
      : `<span class="pp-unverified">sin verificar</span><button class="btn btn-xs" onclick="profileResendVerification()">Verificar</button>`}
    </div>
    <button type="button" class="pp-sec" aria-expanded="false" aria-controls="profile-password-change-section" onclick="profileTogglePasswordChange(this)">
      <span style="display:flex;align-items:center;gap:8px;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>Cambiar contraseña</span>
      <svg class="pp-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
    <div id="profile-password-change-section" class="pp-disclosure pp-disclosure-nested" hidden>
      <div class="form-group"><label for="profile-curr-pass-pw">Contraseña actual</label><input type="password" id="profile-curr-pass-pw" placeholder="••••••••" autocomplete="current-password"></div>
      <div class="form-group"><label for="profile-new-pw">Nueva contraseña (mín. 6 caracteres)</label><input type="password" id="profile-new-pw" placeholder="••••••••" autocomplete="new-password"></div>
      <div class="form-group"><label for="profile-new-pw2">Confirmar nueva contraseña</label><input type="password" id="profile-new-pw2" placeholder="••••••••" autocomplete="new-password"></div>
      <div class="pp-actions"><button class="btn btn-sm" onclick="profileTogglePasswordChange()">Cancelar</button><button class="btn btn-sm btn-primary" onclick="profileChangePassword()">Actualizar contraseña</button></div>
    </div>
    <button type="button" class="pp-sec" aria-expanded="false" aria-controls="profile-email-change-section" onclick="profileToggleEmailChange(this)">
      <span style="display:flex;align-items:center;gap:8px;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg>Cambiar email</span>
      <svg class="pp-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
    <div id="profile-email-change-section" class="pp-disclosure pp-disclosure-nested" hidden>
      <div class="form-group"><label for="profile-new-email">Nuevo email</label><input type="email" id="profile-new-email" placeholder="nuevo@email.com" autocomplete="off"></div>
      <div class="form-group"><label for="profile-curr-pass-email">Contraseña actual (para confirmar)</label><input type="password" id="profile-curr-pass-email" placeholder="••••••••" autocomplete="current-password"></div>
      <div class="pp-actions"><button class="btn btn-sm" onclick="profileToggleEmailChange()">Cancelar</button><button class="btn btn-sm btn-primary" onclick="profileChangeEmail()">Enviar verificación</button></div>
    </div>
  </div>`;

  body.innerHTML = `${hdrHtml}
    <div class="pp-body">${bd}</div>
    <div class="pp-foot">
      <button class="btn btn-danger btn-sm" onclick="closeModal('profile-modal');authSignOut();">Cerrar sesión</button>
      <button class="btn btn-primary" onclick="saveProfile()">Guardar cambios</button>
    </div>`;
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
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-linecap="round" style="color:var(--txt3);flex:none;"><circle cx="11" cy="11" r="8" stroke-width="2.5" fill="none"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke-width="2.5"/></svg>
          <input type="range" id="crop-zoom-sl" min="0" max="100" value="0" style="flex:1;accent-color:var(--gold);" oninput="cropZoomSlider(this.value)">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-linecap="round" style="color:var(--txt3);flex:none;"><circle cx="11" cy="11" r="8" stroke-width="2.5" fill="none"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke-width="2.5"/><line x1="8" y1="11" x2="14" y2="11" stroke-width="2"/><line x1="11" y1="8" x2="11" y2="14" stroke-width="2"/></svg>
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
    : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
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

function profileToggleDisclosure(sectionId, button){
  const sec = document.getElementById(sectionId);
  if(!sec) return;
  const trigger = button || document.querySelector(`[aria-controls="${sectionId}"]`);
  const open = sec.hidden;
  sec.hidden = !open;
  trigger?.setAttribute('aria-expanded', String(open));
}

function profileToggleEmailChange(button){
  const sec = document.getElementById('profile-email-change-section');
  if (!sec) return;
  const trigger = button || document.querySelector('[aria-controls="profile-email-change-section"]');
  const open = sec.hidden;
  sec.hidden = !open;
  trigger?.setAttribute('aria-expanded', String(open));
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

function profileTogglePasswordChange(button){
  const sec = document.getElementById('profile-password-change-section');
  if (!sec) return;
  const trigger = button || document.querySelector('[aria-controls="profile-password-change-section"]');
  const open = sec.hidden;
  sec.hidden = !open;
  trigger?.setAttribute('aria-expanded', String(open));
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

/* ── Modal "Fotos de campeón" ───────────────────────────────── */
/* Miniaturas de las galerías de palmarés de un club, agrupadas por título
   (cada foto pertenece a un palmares.{id}, no al club suelto). Compartido
   por la tarjeta de perfil (Slice A) y la futura ficha de club (Slice B). */

let _champPhotosGroups = [];

function _champPhotosModalClose(){ closeModal('champ-photos-modal'); }

function _injectChampionPhotosModal(){
  if (document.getElementById('champ-photos-modal')) return;
  const el = document.createElement('div');
  el.className = 'modal-overlay';
  el.id = 'champ-photos-modal';
  el.setAttribute('role','dialog');
  el.setAttribute('aria-modal','true');
  el.setAttribute('aria-labelledby','champ-photos-title');
  el.innerHTML = `
    <div class="modal champ-photos-modal-inner">
      <div class="modal-hdr">
        <div class="modal-title" id="champ-photos-title">Fotos de campeón</div>
        <button type="button" class="modal-close" aria-label="Cerrar" onclick="closeModal('champ-photos-modal')">×</button>
      </div>
      <div class="modal-body" id="champ-photos-body"></div>
    </div>`;
  document.body.appendChild(el);
  el.addEventListener('mousedown', e => { if (e.target === el) closeModal('champ-photos-modal'); });

  // Puede quedar anidado sobre el drawer de perfil (.profile-backdrop.open) —
  // se registra en la misma pila que el drawer y el visor (ver _pfEscStack
  // arriba) para que Escape cierre solo esta capa, no las de abajo.
  let wasOpen = false;
  new MutationObserver(()=>{
    const open = el.classList.contains('open');
    if (open && !wasOpen){
      wasOpen = true;
      _pfPushEscLayer(_champPhotosModalClose);
    } else if (!open && wasOpen){
      wasOpen = false;
      _pfPopEscLayer(_champPhotosModalClose);
    }
  }).observe(el, { attributes:true, attributeFilter:['class'] });
}

function _champPhotosBodyHTML(groups, isAdmin = AUTH.role === 'admin'){
  if (!groups.length) return `<div class="pp-empty">Todavía no hay fotos cargadas.</div>`;
  return groups.map((g, gi) => {
    const when = g.rec.season || g.rec.year || '';
    const empty = g.items.length === 0;
    // Grupo con fotos: header con "Editar imágenes" + grilla. Grupo vacío:
    // sin grilla vacía — un estado propio que deja claro que el botón es
    // para cargar la primera foto, no para editar algo que no existe.
    // Los dos botones de escritura (editar/agregar) se guardan con isAdmin
    // ACÁ, no solo en el llamador: openChampionPhotosModal hoy filtra los
    // grupos vacíos para no-admin, pero esta función también la reusa el
    // Slice B (ficha pública de club) — no puede depender de que quien la
    // llame siempre filtre bien.
    const editBtn = !empty && isAdmin ? `<button type="button" class="champ-photos-edit-btn" onclick="closeModal('champ-photos-modal');openPalmaresGallery(${g.rec.id});">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
          Editar imágenes
        </button>` : '';
    const body = empty
      ? `<div class="champ-photos-empty-group">
          <span>Este título todavía no tiene fotos.</span>
          ${isAdmin ? `<button type="button" class="champ-photos-add-btn" onclick="closeModal('champ-photos-modal');openPalmaresGallery(${g.rec.id});">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            Agregar fotos
          </button>` : ''}
        </div>`
      : `<div class="champ-photos-grid">
        ${g.items.map((it, ii) => `
          <button type="button" class="champ-thumb" onclick="openPhotoViewer(${gi},${ii},this)" aria-label="Ampliar foto${it.alt ? ': '+_pfEsc(it.alt) : ''}">
            <img src="${_pfEsc(it.url)}" alt="${_pfEsc(it.alt)}" loading="lazy">
          </button>`).join('')}
      </div>`;
    return `<div class="champ-photos-group">
      <div class="champ-photos-group-hdr">
        <span class="champ-photos-group-trophy">${renderTrophy(g.rec.competition, 20)}</span>
        <span class="champ-photos-group-label">${_pfEsc(g.comp.label || g.rec.competition)}${when ? ` · ${_pfEsc(when)}` : ''}</span>
        ${editBtn}
      </div>
      ${body}
    </div>`;
  }).join('');
}

async function openChampionPhotosModal(teamId, triggerEl){
  const team = await dbGet('teams', teamId).catch(()=>null);
  if (!team) return;
  const isAdmin = AUTH.role === 'admin';
  const teamTitles = await _pfTeamTitles(teamId).catch(()=>[]);
  // No-admin: solo títulos con fotos (como antes). Admin: TODOS los
  // títulos del club, incluidos los de galería vacía — si no, quien tiene
  // que cargar la primera foto de un título no ve dónde hacerlo.
  const groups = teamTitles
    .map(rec => ({ rec, comp: palmaresCompByKey(rec.competition), items: _palmGallerySafeItems(rec.gallery) }))
    .filter(g => g.comp && (isAdmin || g.items.length > 0))
    .sort((a, b) => _pfCompImportanceIdx(a.rec.competition) - _pfCompImportanceIdx(b.rec.competition));

  _champPhotosGroups = groups;
  _injectChampionPhotosModal();
  document.getElementById('champ-photos-title').textContent = `Fotos de campeón · ${team.name || ''}`;
  document.getElementById('champ-photos-body').innerHTML = _champPhotosBodyHTML(groups, isAdmin);
  openModal('champ-photos-modal');
}

/* Si el drawer de perfil sigue abierto cuando se guarda una galería desde
   "Editar/Agregar fotos" (evento disparado por savePalmaresGallery en
   palmares.js), refresca la tarjeta para que el admin vea las fotos
   nuevas — y el botón "Agregar fotos" pase a "Fotos de campeón" — sin
   cerrar y reabrir el perfil. Evento en vez de llamada directa: palmares.js
   no necesita importar ni conocer ninguna función de este archivo, solo
   anuncia el hecho ("se guardó la galería de este registro"); si mañana
   `renderProfileBody` cambia de nombre, este archivo es el único que hay
   que tocar. La única vía hoy para llegar a openPalmaresGallery con el
   drawer abierto es este propio botón (el backdrop del drawer bloquea el
   resto de la UI mientras está abierto), así que el teamId del evento
   siempre coincide con window._profileTeam — se valida igual, para no
   depender de esa coincidencia de la UI actual. */
document.addEventListener('palmares:gallery-saved', async e => {
  if (!document.getElementById('profile-modal')?.classList.contains('open')) return;
  const team = window._profileTeam;
  if (!team || (e.detail && e.detail.teamId != null && e.detail.teamId !== team.id)) return;
  await renderProfileBody();
});

/* ── Visor ampliado de foto ──────────────────────────────────── */
/* No existía ningún visor en la app. Sigue el mismo patrón de ciclo de vida
   que el drawer de perfil (_injectProfileModal/_profileTrapKeydown, arriba):
   MutationObserver sobre la clase .open hace el setup/teardown (listener de
   teclado, bloqueo de scroll, devolución de foco) sin importar por qué vía
   se cerró. Puede abrirse ANIDADO sobre el modal de fotos (que a su vez
   puede estar anidado sobre el drawer de perfil) — el cierre con Escape se
   coordina con la pila compartida (_pfEscStack, arriba), no acá: este
   visor solo hace push/pop, igual que las otras dos capas. */
let _champViewerPos = null;         // {g: índice de grupo, i: índice de foto}
let _champViewerReturnFocus = null;

function _injectPhotoViewer(){
  if (document.getElementById('photo-viewer')) return;
  const el = document.createElement('div');
  el.className = 'photo-viewer-backdrop';
  el.id = 'photo-viewer';
  el.setAttribute('role','dialog');
  el.setAttribute('aria-modal','true');
  el.setAttribute('aria-label','Foto ampliada');
  el.innerHTML = `
    <button type="button" class="pv-close" aria-label="Cerrar visor" onclick="closePhotoViewer()">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <button type="button" class="pv-nav pv-prev" aria-label="Foto anterior" onclick="photoViewerStep(-1)">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <div class="pv-stage">
      <img id="photo-viewer-img" src="" alt="">
      <div class="pv-caption" id="photo-viewer-caption"></div>
    </div>
    <button type="button" class="pv-nav pv-next" aria-label="Foto siguiente" onclick="photoViewerStep(1)">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>`;
  document.body.appendChild(el);
  el.addEventListener('mousedown', e => { if (e.target === el) closePhotoViewer(); });

  let wasOpen = false;
  new MutationObserver(()=>{
    const open = el.classList.contains('open');
    if (open && !wasOpen){
      wasOpen = true;
      document.addEventListener('keydown', _photoViewerTrapKeydown, true);
      document.body.classList.add('photo-viewer-open');
      _pfPushEscLayer(closePhotoViewer);
      el.querySelector('.pv-close')?.focus({ preventScroll:true });
    } else if (!open && wasOpen){
      wasOpen = false;
      document.removeEventListener('keydown', _photoViewerTrapKeydown, true);
      document.body.classList.remove('photo-viewer-open');
      _pfPopEscLayer(closePhotoViewer);
      _champViewerPos = null;
      const ret = _champViewerReturnFocus;
      _champViewerReturnFocus = null;
      if (ret && document.contains(ret)){ try{ ret.focus({ preventScroll:true }); }catch(e){} }
    }
  }).observe(el, { attributes:true, attributeFilter:['class'] });
}

function _renderPhotoViewer(){
  const { g, i } = _champViewerPos;
  const group = _champPhotosGroups[g];
  const item = group.items[i];
  const img = document.getElementById('photo-viewer-img');
  const cap = document.getElementById('photo-viewer-caption');
  if (img){ img.src = item.url; img.alt = item.alt || ''; }
  if (cap) cap.textContent = item.alt || '';
  const multi = group.items.length > 1;
  const prev = document.querySelector('#photo-viewer .pv-prev');
  const next = document.querySelector('#photo-viewer .pv-next');
  if (prev) prev.disabled = !multi;
  if (next) next.disabled = !multi;
}

function openPhotoViewer(groupIndex, itemIndex, triggerEl){
  const group = _champPhotosGroups[groupIndex];
  if (!group || !group.items[itemIndex]) return;
  _injectPhotoViewer();
  _champViewerPos = { g: groupIndex, i: itemIndex };
  _champViewerReturnFocus = triggerEl instanceof HTMLElement ? triggerEl
    : (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  _renderPhotoViewer();
  document.getElementById('photo-viewer')?.classList.add('open');
}

function closePhotoViewer(){
  document.getElementById('photo-viewer')?.classList.remove('open');
}

function photoViewerStep(dir){
  if (!_champViewerPos) return;
  const group = _champPhotosGroups[_champViewerPos.g];
  if (!group || group.items.length < 2) return;
  _champViewerPos.i = (_champViewerPos.i + dir + group.items.length) % group.items.length;
  _renderPhotoViewer();
}

/* Atrapa Tab (ciclo first↔last, precedente: _profileTrapKeydown) + flechas
   navegan. Escape se maneja en la pila compartida (_pfEscStack), no acá. */
function _photoViewerTrapKeydown(e){
  if (e.key === 'ArrowLeft'){ photoViewerStep(-1); return; }
  if (e.key === 'ArrowRight'){ photoViewerStep(1); return; }
  if (e.key !== 'Tab') return;
  const el = document.getElementById('photo-viewer');
  if (!el) return;
  const f = [...el.querySelectorAll('button:not([disabled])')];
  const first = f[0], last = f[f.length-1], active = document.activeElement;
  if (e.shiftKey){
    if (active===first || !el.contains(active)){ e.preventDefault(); last.focus(); }
  } else {
    if (active===last || !el.contains(active)){ e.preventDefault(); first.focus(); }
  }
}
