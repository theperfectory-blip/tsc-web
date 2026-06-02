'use strict';
/* ============================================================
   ADMIN · GESTIÓN DE USUARIOS
   El admin ve a todos los registrados y les asigna rol + club.
   (Los presidentes se auto-registran; aquí el admin los vincula.)
   ============================================================ */

function _uaEsc(v){
  return String(v==null?'':v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

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
    users = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    teams = teamsRaw;
  } catch(e){
    el.innerHTML = `<div style="color:var(--red);padding:14px;">Error al cargar usuarios: ${_uaEsc(e.code||e.message)}</div>`;
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
  const teamOpts = (sel)=> `<option value="">— sin club —</option>` +
    teamsSorted.map(t=>`<option value="${t.id}" ${t.id===sel?'selected':''}>${_uaEsc(t.name)}</option>`).join('');

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
              <td style="padding:8px 10px;font-weight:600;">${_uaEsc(u.displayName||'(sin nombre)')}${isMe?' <span style="color:var(--gold);font-size:11px;">(tú)</span>':''}</td>
              <td style="padding:8px 10px;color:var(--txt2);">${_uaEsc(u.email||'')}</td>
              <td style="padding:8px 10px;">
                <select style="${selStyle}" ${isMe?'disabled title="No puedes cambiar tu propio rol (evita quedar sin acceso)"':''} onchange="adminSetUserRole('${_uaEsc(u.uid)}', this.value)">
                  <option value="president" ${u.role==='president'?'selected':''}>Presidente</option>
                  <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
                </select>
              </td>
              <td style="padding:8px 10px;">
                <select style="${selStyle}" onchange="adminSetUserTeam('${_uaEsc(u.uid)}', this.value)">${teamOpts(u.teamId ?? null)}</select>
              </td>
              <td style="padding:8px 10px;text-align:center;">
                <input type="checkbox" ${u.lockEdits?'checked':''} title="Marcado = este usuario NO puede editar nombre/logo de su club" onchange="adminSetUserLock('${_uaEsc(u.uid)}', this.checked)">
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

async function adminSetUserLock(uid, locked){
  try {
    await firebase.firestore().collection('users').doc(uid).update({ lockEdits: locked });
    showToast(locked ? '🔒 Edición de club bloqueada para este usuario' : 'Edición de club habilitada');
  } catch(e){
    showToast('Error: '+(e.code||e.message), 'error');
    renderAdmUsuarios();
  }
}

async function adminSetUserRole(uid, role){
  try {
    await firebase.firestore().collection('users').doc(uid).update({ role });
    showToast('Rol actualizado');
  } catch(e){
    showToast('Error al actualizar rol: '+(e.code||e.message), 'error');
    renderAdmUsuarios();
  }
}

async function adminSetUserTeam(uid, val){
  const teamId = val ? parseInt(val) : null;
  try {
    await firebase.firestore().collection('users').doc(uid).update({ teamId });
    showToast(teamId ? 'Club vinculado' : 'Club desvinculado');
  } catch(e){
    showToast('Error al vincular club: '+(e.code||e.message), 'error');
    renderAdmUsuarios();
  }
}
