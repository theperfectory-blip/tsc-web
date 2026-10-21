'use strict';
/* ============================================================
   ADMIN · GESTIÓN DE USUARIOS
   El admin ve a todos los registrados y les asigna rol + club.
   (Los presidentes se auto-registran; aquí el admin los vincula.)
   ============================================================ */

async function renderAdmUsuarios(){
  const el = document.getElementById('adm-usuarios-content');
  if(!el) return;
  el.innerHTML = `<div style="color:var(--txt3);padding:14px;">Cargando usuarios...</div>`;

  if(typeof firebase === 'undefined' || typeof firebase.firestore !== 'function'){
    el.innerHTML = `<div style="color:var(--red);padding:14px;">Firebase no está disponible.</div>`;
    return;
  }

  let users, teams;
  try {
    const [snap, teamsRaw] = await Promise.all([
      firebase.firestore().collection('users').get(),
      dbGetAll('teams'),
    ]);
    // uid sale del id del documento y va al final: un campo `uid` dentro del
    // perfil (lo escribe el propio usuario al registrarse) no puede pisarlo.
    users = snap.docs.map(d => ({ ...d.data(), uid: d.id }));
    window._uaUsers = users;   // para adminSetUserTeam (quién tiene ya cada club)
    _uaBackfillUsernames(users);   // sin esperar
    teams = teamsRaw;
    window._uaTeams = teamsRaw;
  } catch(e){
    el.innerHTML = `<div style="color:var(--red);padding:14px;">Error al cargar usuarios: ${escHtml(dbErrorMsg(e))}</div>`;
    return;
  }

  // Admins primero, luego por nombre
  users.sort((a,b)=>{
    if((a.role==='admin')!==(b.role==='admin')) return a.role==='admin' ? -1 : 1;
    return String(a.displayName||a.email||'').localeCompare(String(b.displayName||b.email||''));
  });

  const teamsSorted = teams.filter(t=>t.name).sort((a,b)=>a.name.localeCompare(b.name));
  const myUid = (typeof AUTH!=='undefined' && AUTH.user) ? AUTH.user.uid : null;

  if(!users.length){
    el.innerHTML = `<div style="color:var(--txt3);font-size:14px;padding:20px;text-align:center;">
      Aún no hay usuarios registrados.<br>
      <span style="font-size:13px;">Cuando un presidente cree su cuenta desde "Entrar → Crear una", aparecerá aquí para vincularlo a su club.</span>
    </div>`;
    return;
  }

  const selStyle = "padding:5px 8px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:13px;min-width:130px;";
  // Solo se asigna club a cuentas con el email verificado (slice 3.7, D7;
  // lo exigen también las reglas). Se puede seguir quitando el club.
  const teamOpts = (sel, canAssign)=> `<option value="">— sin club —</option>` +
    teamsSorted.map(t=>`<option value="${t.id}" ${t.id===sel?'selected':''} ${(!canAssign && t.id!==sel)?'disabled':''}>${escHtml(t.name)}</option>`).join('');

  el.innerHTML = `
    <div style="color:var(--txt3);font-size:13px;margin-bottom:12px;">
      ${users.length} usuario${users.length===1?'':'s'} · asigna el <b>rol</b> y el <b>club</b> de cada uno.
      Un admin controla todo; un presidente solo edita su club.
    </div>
    <div class="card" style="overflow:auto;">
      <table class="tbl" style="width:100%;font-size:13px;">
        <thead><tr>
          <th style="padding:8px 10px;">Usuario</th>
          <th style="padding:8px 10px;">Email</th>
          <th style="padding:8px 10px;">Rol</th>
          <th style="padding:8px 10px;">Club vinculado</th>
          <th style="padding:8px 10px;text-align:center;">Bloquear edición</th>
        </tr></thead>
        <tbody>
          ${users.map(u=>{
            const isMe = u.uid===myUid;
            return `<tr>
              <td style="padding:8px 10px;font-weight:600;">${escHtml(u.displayName||'(sin nombre)')}${isMe?' <span style="color:var(--gold);font-size:11px;">(tú)</span>':''}</td>
              <td style="padding:8px 10px;color:var(--txt2);">${escHtml(u.email||'')}
                ${u.emailVerified===true
                  ? '<span title="Email verificado" style="margin-left:6px;font-size:11px;color:var(--green);">verificado</span>'
                  : '<span title="Esta cuenta aún no verificó su email (o no inició sesión desde que existe la verificación): no se le puede asignar club" style="margin-left:6px;font-size:11px;color:var(--gold);">sin verificar</span>'}
              </td>
              <td style="padding:8px 10px;">
                <select style="${selStyle}" ${isMe?'disabled title="No puedes cambiar tu propio rol (evita quedar sin acceso)"':''} onchange="adminSetUserRole(${escAttr(JSON.stringify(u.uid))}, this.value)">
                  <option value="president" ${u.role==='president'?'selected':''}>Presidente</option>
                  <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
                </select>
              </td>
              <td style="padding:8px 10px;">
                <select style="${selStyle}" ${(!u.emailVerified && !isMe)?'title="Email sin verificar: no se puede asignar club"':''} onchange="adminSetUserTeam(${escAttr(JSON.stringify(u.uid))}, this.value)">${teamOpts(u.teamId ?? null, u.emailVerified===true || isMe)}</select>
              </td>
              <td style="padding:8px 10px;text-align:center;">
                <input type="checkbox" ${u.lockEdits?'checked':''} title="Marcado = este usuario NO puede editar nombre/logo de su club" onchange="adminSetUserLock(${escAttr(JSON.stringify(u.uid))}, this.checked)">
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

/* Reserva en usernames/{nombre} el @usuario de las cuentas anteriores a 3.7
   (idempotente: solo crea las que faltan; solo admin, la regla le deja crear
   a nombre de otro). Si dos cuentas tuvieran el mismo, gana la primera. */
async function _uaBackfillUsernames(users){
  try {
    const col = firebase.firestore().collection('usernames');
    for(const u of users){
      if(!u.username || !/^[a-z0-9_]{1,30}$/.test(u.username)) continue;
      const ref = col.doc(u.username);
      if(!(await ref.get()).exists) await ref.set({ uid: u.uid });
    }
  } catch(e){ console.warn('[usuarios] reserva de @usuario:', e.code||e.message); }
}

async function adminSetUserLock(uid, locked){
  try {
    await firebase.firestore().collection('users').doc(uid).update({ lockEdits: locked });
    showToast(locked ? 'Edición de club bloqueada para este usuario' : 'Edición de club habilitada');
  } catch(e){
    showToast('Error: '+dbErrorMsg(e), 'error');
    renderAdmUsuarios();
  }
}

async function adminSetUserRole(uid, role){
  if(role!=='president' && role!=='admin'){ renderAdmUsuarios(); return; }
  try {
    await firebase.firestore().collection('users').doc(uid).update({ role });
    showToast('Rol actualizado');
  } catch(e){
    showToast('Error al actualizar rol: '+dbErrorMsg(e), 'error');
    renderAdmUsuarios();
  }
}

/* Un club tiene un solo presidente (lo mismo que hace el selector del modal
   de equipo, updatePresidentLink). Antes, asignar desde esta tabla un club
   que ya tenía cuenta dejaba a las dos vinculadas al mismo club. */
async function adminSetUserTeam(uid, val){
  const teamId = val ? parseInt(val) : null;
  const other = teamId!=null
    ? (window._uaUsers||[]).find(u=>u.uid!==uid && u.teamId===teamId)
    : null;
  if(other){
    // Restaurar el <select> mientras se confirma (si se cancela, queda como estaba).
    await renderAdmUsuarios();
    const team = (window._uaTeams||[]).find(t=>t.id===teamId);
    showConfirm(
      '¿Mover el club a esta cuenta?',
      `${team?.name||'Ese club'} ya está vinculado a ${other.displayName||other.email||'otra cuenta'}. Esa cuenta quedará sin club.`,
      async()=>{ await _uaApplyTeam(uid, teamId, other.uid); }
    );
    return;
  }
  await _uaApplyTeam(uid, teamId, null);
}

async function _uaApplyTeam(uid, teamId, unlinkUid){
  try {
    const fs = firebase.firestore();
    const batch = fs.batch();   // las dos cuentas o ninguna
    if(unlinkUid) batch.update(fs.collection('users').doc(unlinkUid), { teamId: null });
    batch.update(fs.collection('users').doc(uid), { teamId });
    await batch.commit();
    showToast(teamId ? 'Club vinculado' : 'Club desvinculado');
  } catch(e){
    showToast('Error al vincular club: '+dbErrorMsg(e), 'error');
  }
  renderAdmUsuarios();
}

/* Lista de cuentas para el selector de presidente en el modal de equipo.
   Devuelve [] si no hay Firestore o no hay permiso (no admin). */
async function loadUsersForSelect(){
  if(typeof USE_FIRESTORE==='undefined' || !USE_FIRESTORE) return [];
  if(typeof firebase==='undefined' || typeof firebase.firestore!=='function') return [];
  try {
    const snap = await firebase.firestore().collection('users').get();
    return snap.docs.map(d=>({
      uid: d.id,
      name: d.data().displayName || d.data().email || '(sin nombre)',
      teamId: d.data().teamId ?? null,
      role: d.data().role,
      emailVerified: d.data().emailVerified === true,
    }));
  } catch(e){ console.warn('[users] no se pudo cargar:', e.code||e.message); return []; }
}

/* Vincula un equipo a una cuenta (users.teamId). Quita el vínculo previo
   de quien tuviera este equipo, y asigna el nuevo presidente. Solo admin.
   En un solo lote: antes, si la cuenta nueva no se podía vincular (p. ej.
   email sin verificar), la anterior ya había quedado desvinculada.
   `strict`: relanza el error en vez de avisar (lo usa deleteTeam). */
async function updatePresidentLink(teamId, newUid, opts = {}){
  if(typeof USE_FIRESTORE==='undefined' || !USE_FIRESTORE) return;
  if(typeof firebase==='undefined' || typeof firebase.firestore!=='function') return;
  try {
    const fs = firebase.firestore();
    const snap = await fs.collection('users').where('teamId', '==', teamId).get();
    const batch = fs.batch();
    let n = 0;
    snap.docs.forEach(d=>{
      if(d.id!==newUid){ batch.update(d.ref, { teamId: null }); n++; }
    });
    if(newUid && !snap.docs.some(d=>d.id===newUid)){
      batch.update(fs.collection('users').doc(newUid), { teamId }); n++;
    }
    if(n) await batch.commit();
  } catch(e){
    if(opts.strict) throw e;
    console.warn('[pres-link]', e.code||e.message);
    showToast('No se pudo vincular el presidente: '+dbErrorMsg(e),'error');
  }
}

/* Mapa { teamId: nombre del presidente } a partir de las cuentas vinculadas
   (users.teamId). Prioriza el rol 'president'; si no, cualquier cuenta
   vinculada (p.ej. un admin dueño de su club). Solo en backend Firestore. */
async function buildPresidentByTeam(){
  const map = {};
  if(typeof USE_FIRESTORE==='undefined' || !USE_FIRESTORE) return map;
  if(typeof firebase==='undefined' || typeof firebase.firestore!=='function') return map;
  try {
    const snap = await firebase.firestore().collection('users').get();
    snap.docs.forEach(d=>{
      const u = d.data();
      if(u.teamId==null) return;
      const name = u.displayName || u.email || 'Presidente';
      // Un presidente "real" pisa a cualquier otra cuenta vinculada al mismo club.
      if(map[u.teamId]==null || u.role==='president') map[u.teamId] = name;
    });
  } catch(e){ console.warn('[pres] no se pudo cargar users:', e.code||e.message); }
  return map;
}
