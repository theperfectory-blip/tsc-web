/* ==========================================================
   PARTE 6 — YUNACOINS, TEMPORADAS Y EXPORT/IMPORT
   ========================================================== */


/* ----------------------------------------------------------
   Guardas de escritura (MS-5.9)
   - Cada movimiento escribe el registro en `coins` y el saldo del equipo en
     UN lote (H-53): antes eran dos escrituras y un corte entre ambas dejaba
     un movimiento sin saldo (o al revés).
   - Una sola operación a la vez (doble clic) y errores de red o de reglas
     como aviso claro.
   - Los movimientos llevan la temporada seleccionada: en una temporada
     finalizada el código se niega (el archivo de la temporada, D8, no debe
     recibir movimientos nuevos).
   ---------------------------------------------------------- */
const COINS_MAX = 1000000;
let _coinsBusy = false;
async function _coinsRun(fn){
  if(_coinsBusy) return;
  _coinsBusy = true;
  try{ return await fn(); }
  catch(err){ console.error('[coins]', err); showToast(dbErrorMsg(err),'error'); }
  finally{ _coinsBusy = false; }
}

async function _coinsSeasonLocked(){
  const season = (await dbGetAll('seasons')).find(s=>s.number===STATE.season);
  if(season?.status==='finished'){
    showToast(`${getSeasonName(season)} está finalizada: elige la temporada activa para mover YuNaCoins`,'error');
    return true;
  }
  return false;
}

/* Cantidad de un input: entero de 1 a COINS_MAX, o NaN. parseInt aceptaba
   «12abc» y «1.5» (como 12 y 1). */
function _coinsAmount(raw){
  const t = String(raw==null?'':raw).trim();
  if(!/^\d+$/.test(t)) return NaN;
  const n = Number(t);
  return n>=1 && n<=COINS_MAX ? n : NaN;
}
const _COINS_AMOUNT_MSG = `La cantidad debe ser un número entero entre 1 y ${COINS_MAX.toLocaleString('es-CL')}`;

async function renderAdmCoins(){
  const el = document.getElementById('adm-coins-content');
  const teams = await dbGetAll('teams');
  // Mapa teamId → presidente vinculado (cuenta users.teamId).
  window._presByTeam = (typeof buildPresidentByTeam==='function')
    ? await buildPresidentByTeam()
    : {};
  const total   = teams.reduce((s,t)=>s+(t.yunacoin||0),0);
  const promedio = teams.length ? Math.round(total/teams.length) : 0;
  const maxCoins = Math.max(...teams.map(t=>t.yunacoin||0),1);
  el.innerHTML = `
  <div class="grid-4" style="margin-bottom:20px;">
    <div class="stat-card"><div class="stat-num">${total.toLocaleString('es-CL')}</div><div class="stat-lbl">Total circulación</div></div>
    <div class="stat-card"><div class="stat-num">${promedio.toLocaleString('es-CL')}</div><div class="stat-lbl">Promedio por equipo</div></div>
    <div class="stat-card"><div class="stat-num">${teams.length}</div><div class="stat-lbl">Equipos</div></div>
    <div class="stat-card"><div class="stat-num">${Math.max(0,...teams.map(t=>t.yunacoin||0)).toLocaleString('es-CL')}</div><div class="stat-lbl">Mayor saldo</div></div>
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
    <div class="section-lbl" style="margin:0;">Saldos por equipo</div>
    <div style="display:flex;gap:8px;">
      <input type="text" id="coins-search" placeholder="Buscar equipo..." data-oninput="filterCoinsTable()"
        style="padding:6px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:14px;width:180px;">
      <button class="btn btn-primary btn-sm" data-onclick="openBulkCoinsModal()">+ Asignar masivo</button>
    </div>
  </div>
  <div class="card">
    <div class="tbl-wrap">
      <table class="tbl">
        <thead><tr><th style="width:44px;">Logo</th><th>Equipo</th><th>Presidente</th><th style="text-align:right;">Saldo</th><th style="width:200px;">Distribución</th><th style="width:160px;">Acciones</th></tr></thead>
        <tbody id="coins-tbody"></tbody>
      </table>
    </div>
  </div>
  <div id="coins-modal-wrap"></div>
  <div id="coins-history-wrap"></div>`;
  renderCoinsTable(teams, maxCoins);
}

function renderCoinsTable(teams, maxCoins){
  const tbody = document.getElementById('coins-tbody');
  if(!tbody) return;
  const sorted = [...teams].sort((a,b)=>(b.yunacoin||0)-(a.yunacoin||0));
  tbody.innerHTML = sorted.map(t=>{
    const coins = t.yunacoin||0;
    const pct   = maxCoins>0 ? Math.round((coins/maxCoins)*100) : 0;
    return `<tr>
      <td><div style="width:32px;height:32px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:${safeCssColor(t.color,'#333')};">
        ${safeImgUrl(t.logo)?`<img src="${safeImgUrl(t.logo)}" style="width:100%;height:100%;object-fit:cover;">`:`<span style="font-family:'Bebas Neue';font-size:11px;color:#fff;">${escHtml(t.ini||'?')}</span>`}
      </div></td>
      <td style="font-weight:600;">${escHtml(t.name)}</td>
      <td style="color:var(--txt2);">${(()=>{const p=(window._presByTeam&&window._presByTeam[t.id])||t.pres;return p?`<span style="display:inline-flex;align-items:center;gap:5px;">${escHtml(p)}${(window._presByTeam&&window._presByTeam[t.id])?'<span title="Cuenta vinculada" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);flex-shrink:0;"></span>':''}</span>`:'<span style="color:var(--txt3);">—</span>';})()}</td>
      <td style="text-align:right;font-family:'Bebas Neue';font-size:22px;color:var(--gold);">${coins.toLocaleString('es-CL')}</td>
      <td><div style="display:flex;align-items:center;gap:6px;">
        <div style="flex:1;height:4px;background:var(--brd2);border-radius:2px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:var(--gold);border-radius:2px;"></div>
        </div>
        <span style="font-size:12px;color:var(--txt3);min-width:28px;text-align:right;">${pct}%</span>
      </div></td>
      <td><div style="display:flex;gap:4px;">
        <button class="btn btn-xs btn-primary" data-onclick="openCoinsModal(${t.id},'add')">+ Coins</button>
        <button class="btn btn-xs btn-danger" data-onclick="openCoinsModal(${t.id},'sub')">- Coins</button>
        <button class="btn btn-xs" data-onclick="openCoinsHistory(${t.id})"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></button>
      </div></td>
    </tr>`;
  }).join('');
}

async function filterCoinsTable(){
  const search = (document.getElementById('coins-search')?.value||'').toLowerCase();
  let teams = await dbGetAll('teams');
  if(search) teams = teams.filter(t=>String(t.name||'').toLowerCase().includes(search)||String(t.pres||'').toLowerCase().includes(search));
  const maxCoins = Math.max(...teams.map(t=>t.yunacoin||0),1);
  renderCoinsTable(teams, maxCoins);
}

async function openCoinsModal(teamId, mode){
  const team = await dbGet('teams', teamId);
  if(!team){ showToast('El equipo ya no existe','error'); renderAdmCoins(); return; }
  const wrap = document.getElementById('coins-modal-wrap');
  const isAdd = mode==='add';
  wrap.innerHTML = `
  <div class="modal-overlay open" id="coins-modal">
    <div class="modal" style="max-width:380px;">
      <div class="modal-hdr">
        <div class="modal-title">${isAdd?'Agregar':'Restar'} YuNaCoins</div>
        <button class="modal-close" data-onclick="closeCoinsModal()">×</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--card2);border-radius:var(--r);margin-bottom:14px;">
          <div style="width:36px;height:36px;border-radius:50%;background:${safeCssColor(team.color,'#333')};display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue';font-size:13px;color:#fff;flex-shrink:0;">${escHtml(team.ini||'?')}</div>
          <div>
            <div style="font-size:16px;font-weight:600;">${escHtml(team.name)}</div>
            <div style="font-size:13px;color:var(--txt2);">Saldo actual: <strong style="color:var(--gold);">${(team.yunacoin||0).toLocaleString('es-CL')} coins</strong></div>
          </div>
        </div>
        <div class="form-group">
          <label>Cantidad</label>
          <input type="number" id="ci-amount" min="1" value="100" style="font-family:'Bebas Neue';font-size:29px;text-align:center;" data-oninput="updateCoinsPreview(${team.yunacoin||0},'${mode}')">
        </div>
        <div class="form-group">
          <label>Motivo</label>
          <select id="ci-reason" style="width:100%;padding:8px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);">
            ${isAdd?'<option value="stream">Stream</option><option value="victoria">Victoria</option><option value="campeon">Campeón</option><option value="evento">Evento</option><option value="bonus">Bonus</option><option value="otro">Otro</option>':'<option value="compra">Compra jugador</option><option value="mejora">Mejora stats</option><option value="tactica">Táctica</option><option value="multa">Multa</option><option value="otro">Otro</option>'}
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label>Nota (opcional)</label>
          <input type="text" id="ci-note" placeholder="Descripción del movimiento...">
        </div>
        <div id="coins-preview" style="margin-top:12px;text-align:center;padding:8px;background:var(--card2);border-radius:var(--r);font-size:16px;"></div>
      </div>
      <div class="modal-footer">
        <button class="btn" data-onclick="closeCoinsModal()">Cancelar</button>
        <button class="btn ${isAdd?'btn-primary':'btn-danger'}" data-onclick="saveCoinsTransaction(${teamId},'${mode}')">${isAdd?'Agregar':'Restar'}</button>
      </div>
    </div>
  </div>`;
  updateCoinsPreview(team.yunacoin||0, mode);
}

function updateCoinsPreview(current, mode){
  const amount = _coinsAmount(document.getElementById('ci-amount')?.value);
  const el = document.getElementById('coins-preview');
  if(!el) return;
  if(isNaN(amount)){ el.innerHTML = `<span style="color:var(--txt3);font-size:14px;">${_COINS_AMOUNT_MSG}</span>`; return; }
  if(mode!=='add' && amount>current){ el.innerHTML = `<span style="color:var(--red);font-size:14px;">Saldo insuficiente: el equipo tiene ${current.toLocaleString('es-CL')} coins</span>`; return; }
  const newTotal = mode==='add' ? current+amount : current-amount;
  el.innerHTML = `Nuevo saldo: <strong style="color:var(--gold);font-family:'Bebas Neue';font-size:22px;">${newTotal.toLocaleString('es-CL')}</strong> coins`;
}

function closeCoinsModal(){ document.getElementById('coins-modal-wrap').innerHTML=''; }

function saveCoinsTransaction(teamId, mode){
  return _coinsRun(async ()=>{
    if(mode!=='add' && mode!=='sub') return;
    const amount = _coinsAmount(document.getElementById('ci-amount')?.value);
    const reason = document.getElementById('ci-reason')?.value || 'otro';
    const note   = (document.getElementById('ci-note')?.value||'').trim().slice(0,200);
    if(isNaN(amount)){ showToast(_COINS_AMOUNT_MSG,'error'); return; }
    if(await _coinsSeasonLocked()) return;
    const team = await dbGet('teams', teamId);
    if(!team){ showToast('El equipo ya no existe','error'); closeCoinsModal(); renderAdmCoins(); return; }
    const current = Number(team.yunacoin)||0;
    if(mode==='sub' && amount>current){
      showToast(`${team.name} tiene ${current.toLocaleString('es-CL')} coins: no se pueden restar ${amount.toLocaleString('es-CL')}`,'error');
      return;
    }
    const newTotal = mode==='add' ? current+amount : current-amount;
    await dbWriteBatch([
      {type:'add', store:'coins', data:{teamId,teamName:team.name,mode,amount,reason,note,before:current,after:newTotal,season:STATE.season,date:new Date().toISOString()}},
      {type:'set', store:'teams', data:{...team,yunacoin:newTotal}},
    ]);
    showToast(`${mode==='add'?'+':'-'}${amount.toLocaleString('es-CL')} coins a ${team.name}`);
    closeCoinsModal();
    renderAdmCoins();
  });
}

async function openCoinsHistory(teamId){
  const team    = await dbGet('teams', teamId);
  const history = await dbGetAll('coins', c=>c.teamId===teamId);
  const sorted  = history.sort((a,b)=>new Date(b.date)-new Date(a.date));
  const wrap    = document.getElementById('coins-history-wrap');
  const RLABELS = {stream:'Stream',victoria:'Victoria',campeon:'Campeón',evento:'Evento',bonus:'Bonus',compra:'Compra jugador',mejora:'Mejora stats',tactica:'Táctica',multa:'Multa',otro:'Otro'};
  wrap.innerHTML = `
  <div class="modal-overlay open">
    <div class="modal" style="max-width:500px;">
      <div class="modal-hdr">
        <div class="modal-title">Historial · ${escHtml(team.name)}</div>
        <button class="modal-close" data-onclick="_tscClear('coins-history-wrap')">×</button>
      </div>
      <div class="modal-body" style="padding:0;">
        ${!sorted.length?'<div style="padding:24px;text-align:center;color:var(--txt3);">Sin movimientos.</div>':`
        <div style="max-height:400px;overflow-y:auto;">
          <table class="tbl">
            <thead><tr><th>Fecha</th><th>Motivo</th><th style="text-align:right;">Monto</th><th style="text-align:right;">Saldo</th></tr></thead>
            <tbody>${sorted.map(t=>{
              const isAdd=t.mode==='add';
              const d=new Date(t.date);
              const fecha=d.toLocaleDateString('es-CL')+' '+d.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});
              return `<tr>
                <td style="font-size:13px;color:var(--txt3);white-space:nowrap;">${fecha}</td>
                <td><div style="font-size:14px;">${escHtml(RLABELS[t.reason]||t.reason)}</div>${t.note?`<div style="font-size:12px;color:var(--txt3);">${escHtml(t.note)}</div>`:''}</td>
                <td style="text-align:right;font-family:'Bebas Neue';font-size:19px;color:${isAdd?'var(--green)':'var(--red)'};">${isAdd?'+':'-'}${t.amount.toLocaleString('es-CL')}</td>
                <td style="text-align:right;font-family:'Bebas Neue';font-size:17px;color:var(--gold);">${t.after.toLocaleString('es-CL')}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>`}
      </div>
      <div class="modal-footer"><button class="btn" data-onclick="_tscClear('coins-history-wrap')">Cerrar</button></div>
    </div>
  </div>`;
}

async function openBulkCoinsModal(){
  const teams = await dbGetAll('teams', t=>t.status==='ACTIVO');
  document.getElementById('coins-modal-wrap').innerHTML = `
  <div class="modal-overlay open">
    <div class="modal" style="max-width:400px;">
      <div class="modal-hdr">
        <div class="modal-title">Asignación masiva</div>
        <button class="modal-close" data-onclick="closeCoinsModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Operación</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <button id="bulk-add-btn" class="btn btn-primary" data-onclick="setBulkMode('add')">+ Agregar a todos</button>
            <button id="bulk-sub-btn" class="btn" data-onclick="setBulkMode('sub')">- Restar a todos</button>
          </div>
        </div>
        <div class="form-group"><label>Cantidad por equipo</label><input type="number" id="bulk-amount" min="1" value="50" style="font-family:'Bebas Neue';font-size:29px;text-align:center;"></div>
        <div class="form-group"><label>Motivo</label><input type="text" id="bulk-reason" placeholder="Ej: Participación stream viernes..."></div>
        <div style="padding:10px;background:var(--card2);border-radius:var(--r);font-size:14px;color:var(--txt2);">Se aplicará a <strong style="color:var(--txt);">${teams.length} equipos activos</strong>.</div>
      </div>
      <div class="modal-footer">
        <button class="btn" data-onclick="closeCoinsModal()">Cancelar</button>
        <button class="btn btn-primary" data-onclick="saveBulkCoins()">Aplicar</button>
      </div>
    </div>
  </div>`;
  window._bulkMode = 'add';
}

function setBulkMode(mode){
  window._bulkMode=mode;
  ['add','sub'].forEach(m=>{
    const btn=document.getElementById(`bulk-${m}-btn`);
    if(btn){btn.classList.toggle('btn-primary',m===mode);btn.classList.toggle('btn',m!==mode);}
  });
}

function saveBulkCoins(){
  return _coinsRun(async ()=>{
    const amount = _coinsAmount(document.getElementById('bulk-amount')?.value);
    const reason = (document.getElementById('bulk-reason')?.value||'').trim().slice(0,60) || 'Masivo';
    const mode   = window._bulkMode==='sub' ? 'sub' : 'add';
    if(isNaN(amount)){ showToast(_COINS_AMOUNT_MSG,'error'); return; }
    if(await _coinsSeasonLocked()) return;
    const teams = await dbGetAll('teams',t=>t.status==='ACTIVO');
    // Restar nunca deja saldo negativo: a cada equipo se le resta lo que tiene,
    // hasta la cantidad pedida, y el movimiento registra lo restado de verdad.
    const plan = teams.map(team=>{
      const cur = Number(team.yunacoin)||0;
      const delta = mode==='add' ? amount : Math.min(cur, amount);
      return {team, cur, delta};
    }).filter(p=>p.delta>0);
    if(!plan.length){ showToast('Ningún equipo activo tiene saldo para restar','error'); return; }
    if(plan.length*2 > DB_BATCH_MAX){ showToast(`Son demasiados equipos para un solo lote (${plan.length}): el máximo es ${DB_BATCH_MAX/2}`,'error'); return; }
    const moved = plan.reduce((sum,p)=>sum+p.delta,0);
    const short = mode==='sub' ? plan.filter(p=>p.delta<amount).length : 0;
    const msg = mode==='add'
      ? `Se agregan ${amount.toLocaleString('es-CL')} coins a cada uno de los ${plan.length} equipos activos (${moved.toLocaleString('es-CL')} en total). Motivo: ${reason}.`
      : `Se restan hasta ${amount.toLocaleString('es-CL')} coins a ${plan.length} equipos activos (${moved.toLocaleString('es-CL')} en total)${short?`; ${short} tienen menos saldo y quedan en 0`:''}. Motivo: ${reason}.`;
    const apply = ()=>_coinsRun(async ()=>{
      const date = new Date().toISOString();
      const ops = [];
      for(const {team,cur,delta} of plan){
        const nxt = mode==='add' ? cur+delta : cur-delta;
        ops.push({type:'add', store:'coins', data:{teamId:team.id,teamName:team.name,mode,amount:delta,reason,note:'Masivo',before:cur,after:nxt,season:STATE.season,date}});
        ops.push({type:'set', store:'teams', data:{...team,yunacoin:nxt}});
      }
      await dbWriteBatch(ops);
      showToast(`${mode==='add'?'+':'-'}${amount.toLocaleString('es-CL')} coins a ${plan.length} equipos`);
      closeCoinsModal();
      renderAdmCoins();
    });
    showConfirm('¿Aplicar asignación masiva?', msg, apply);
  });
}
