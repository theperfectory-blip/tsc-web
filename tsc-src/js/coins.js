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

/* COBRO-1: temporada en la que se registran los movimientos de coins. Es la activa
   no archivada si existe; si no, la seleccionada en la UI (STATE.season). Ver
   YUNACOINS_RULES.temporadaDeCobro. Devuelve {n, ok, motivo, nombre}. */
async function _coinsTemporadaInfo(){
  const seasons = await dbGetAll('seasons');
  const archivadas = seasons.map(s=>s.number).filter(n=>dbIsArchivedSeason(n));
  const n = YUNACOINS_RULES.temporadaDeCobro(seasons, STATE.season, archivadas);
  const v = YUNACOINS_RULES.validarTemporadaCobro(seasons, n, archivadas);
  const s = seasons.find(x=>Number(x.number)===Number(n));
  return { n, ok: v.ok, motivo: v.motivo, nombre: s ? getSeasonName(s) : ('T'+n) };
}

/* Para escribir: null (con aviso) si la temporada de cobro no admite movimientos. */
async function _coinsTemporadaCobro(){
  const info = await _coinsTemporadaInfo();
  if(!info.ok){
    showToast(`No se mueven YuNaCoins: ${info.motivo}.`,'error');
    return null;
  }
  return info;
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

/* COBRO-1: línea que dice en qué temporada se registra el movimiento (o por qué no se puede). */
function _coinsCobroLineaHTML(c){
  return c.ok
    ? `<div style="font-size:13px;color:var(--txt2);margin-bottom:12px;">Se registra en <strong style="color:var(--txt);">${escHtml(c.nombre)}</strong> (temporada activa).</div>`
    : `<div style="font-size:13px;color:var(--red,#f87171);margin-bottom:12px;">No se puede mover YuNaCoins: ${escHtml(c.motivo)}.</div>`;
}

/* ==========================================================
   COINS1 · tope de la temporada en el modal de Agregar
   ----------------------------------------------------------
   Luis hace de «banco»: carga coins que el equipo después gasta en mejoras.
   Para no cargarle de más, el modal muestra cuánto le SIRVE cargar: el tope
   de la temporada (general + extra del equipo + bono de suscriptores) menos
   lo ya gastado en mejoras, menos el saldo que tiene hoy. Todo de solo
   lectura: si falta un dato se dice «sin datos de …», no se inventa.
   ========================================================== */
const _COINS_FALTA_LABEL = {
  temporada: 'la temporada de cobro',
  reglas: 'las reglas de la temporada',
  extra: 'el tope extra del equipo',
  plantilla: 'la plantilla publicada',
  libro: 'el libro de YuNaCoins',
};

/* Junta los datos del tope de un equipo: reglas, extra, suscriptores de la
   plantilla publicada y lo gastado esta temporada en el libro `coins`. */
async function _coinsDatosTope(team, cobro){
  const saldo = Number(team && team.yunacoin) || 0;
  const out = { reglas: null, extra: 0, motivoExtra: '', nSuscriptores: null, gastado: null, saldo, faltan: [], resumen: null };
  const season = cobro && cobro.n != null ? cobro.n : null;
  if(season == null) out.faltan.push('temporada');
  if(typeof firebase === 'undefined' || !firebase.firestore){
    out.faltan.push('reglas','extra','plantilla','libro');
    return out;
  }
  let fs;
  try{ fs = firebase.firestore(); }
  catch(e){
    console.warn('[coins] tope: Firestore no está disponible', e);
    out.faltan.push('reglas','extra','plantilla','libro');
    return out;
  }
  try{
    const snap = await fs.collection('pes5_config').doc('reglas').get();
    if(snap.exists) out.reglas = YUNACOINS_RULES.normalizarReglas(snap.data());
    else out.faltan.push('reglas');
  }catch(e){ console.warn('[coins] tope: no se pudieron leer las reglas', e); out.faltan.push('reglas'); }
  try{
    if(season != null){
      const snap = await fs.collection('pes5_config').doc('topesExtra-' + season).get();
      const topes = YUNACOINS_RULES.normalizarTopesExtra(snap.exists ? snap.data() : null);
      const e = topes[String(team.id)];
      out.extra = e ? e.extra : 0;      // sin doc = equipo sin extra (no es dato faltante)
      out.motivoExtra = e ? (e.motivo || '') : '';
    }
  }catch(e){ console.warn('[coins] tope: no se pudo leer el tope extra', e); out.faltan.push('extra'); }
  try{
    const snap = await fs.collection('pes5_plantillas').doc(String(team.id)).get();
    const jugadores = snap.exists && Array.isArray(snap.data().jugadores) ? snap.data().jugadores : null;
    if(jugadores){
      // Suscriptor = jugador con «$» delante del nombre (mismo criterio que el save).
      out.nSuscriptores = jugadores.filter(j => String((j && j.name) || '').startsWith('$')).length;
    }else{
      out.faltan.push('plantilla');
    }
  }catch(e){ console.warn('[coins] tope: no se pudo leer la plantilla publicada', e); out.faltan.push('plantilla'); }
  try{
    if(season != null){
      const tx = await dbGetAll('coins', c => String(c.teamId) === String(team.id)
        && Number(c.season) === Number(season)
        && typeof c.reason === 'string' && c.reason.indexOf('mejora PES5') === 0);
      out.gastado = YUNACOINS_RULES.gastoTemporada(tx);
    }
  }catch(e){ console.warn('[coins] tope: no se pudo leer el libro coins', e); out.faltan.push('libro'); }
  if(out.reglas && out.gastado && out.nSuscriptores != null && season != null){
    out.resumen = YUNACOINS_RULES.resumenCarga({
      reglas: out.reglas, extra: out.extra, nSuscriptores: out.nSuscriptores, gastado: out.gastado, saldo: out.saldo,
    });
  }
  return out;
}

/* TOPE-1 · bloque del tope de la temporada en el modal de Agregar. El número
   grande es el tope TOTAL del equipo (base + extra + bono de suscriptores),
   con el desglose chico debajo (solo las partes que existen); «Saldo» va
   aparte porque es otro número. El bono y el extra amplían el tope: no son
   coins regaladas, se gastan con el saldo del equipo. */
function _coinsTopeHTML(d){
  const nf = n => Number(n || 0).toLocaleString('es-CL');
  if(!d) return '';
  const box = lineas => `<div style="margin:-4px 0 14px;padding:8px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);font-size:12px;line-height:1.5;color:var(--txt2);">
    ${lineas.filter(Boolean).map(l => `<div>${l}</div>`).join('')}
  </div>`;
  const r = d.resumen;
  if(!r){
    const falta = d.faltan.length ? d.faltan.map(k => _COINS_FALTA_LABEL[k] || k).join(', ') : 'el tope de la temporada';
    const gastado = d.gastado ? (Number(d.gastado.general || 0) + Number(d.gastado.sub || 0)) : null;
    return box([
      `Tope del equipo esta temporada: <span style="color:var(--txt3);">sin datos de ${escHtml(falta)}</span>`,
      `${gastado != null ? `Gastado: ${nf(gastado)} · ` : ''}Saldo: ${nf(d.saldo)}`,
      `Le sirve cargar hasta: <span style="color:var(--txt3);">sin datos de ${escHtml(falta)}</span>`,
    ]);
  }
  // Desglose: base siempre que haya bono o extra; el motivo del extra si lo hay.
  const partes = [];
  if(r.bono > 0 || r.extra > 0) partes.push(`Base ${nf(r.topeGeneral)}`);
  if(r.bono > 0) partes.push(`${nf(d.nSuscriptores)} ${d.nSuscriptores === 1 ? 'suscriptor' : 'suscriptores'} ${nf(r.bono)}`);
  if(r.extra > 0) partes.push(`${d.motivoExtra ? escHtml(d.motivoExtra) + ' ' : 'Extra '}${nf(r.extra)}`);
  return box([
    `Tope del equipo esta temporada: <strong style="color:var(--txt);">${nf(r.topeTotal)}</strong>`,
    partes.length ? `<span style="color:var(--txt2);">${partes.join(' + ')}</span>` : '',
    `Gastado: ${nf(r.gastadoTotal)} · Saldo: ${nf(r.saldo)}`,
    `Le sirve cargar hasta: <strong style="color:var(--gold);">${nf(r.sirveCargar)}</strong>`,
  ]);
}

/* Aviso (no bloqueo) de la vista previa: la cantidad supera lo que el equipo
   puede gastar esta temporada en mejoras. */
function _coinsSobraHTML(mode, amount){
  const r = window._coinsTopeResumen;
  if(mode !== 'add' || !r || isNaN(amount) || !(amount > r.sirveCargar)) return '';
  const sobra = amount - r.sirveCargar;
  return `<div style="margin-top:6px;font-size:12px;line-height:1.4;color:var(--txt2);">Supera lo que puede gastar esta temporada en mejoras: le quedarían <strong style="color:var(--gold);">${sobra.toLocaleString('es-CL')}</strong> sin usar.</div>`;
}

/* Motivo elegido en el modal ('' si no hay select). */
function _coinsMotivo(){
  return document.getElementById('ci-reason')?.value || '';
}

/* COINS1 · reembolso: cantidad entera >= 0 (las dos partes pueden ser 0). */
function _coinsParte(raw){
  const t = String(raw == null ? '' : raw).trim();
  if(!/^\d+$/.test(t)) return NaN;
  const n = Number(t);
  return n >= 0 && n <= COINS_MAX ? n : NaN;
}

/* Reembolso: por defecto todo va al tope general (= la cantidad). */
function _coinsReembolsoDefaults(amount){
  const g = document.getElementById('ci-reembolso-general');
  const s = document.getElementById('ci-reembolso-sub');
  if(!g || !s) return;
  g.value = String(Number.isFinite(amount) ? amount : 0);
  s.value = '0';
}

/* Reembolso: muestra u oculta los dos campos y dice si suman la cantidad. */
function _coinsReembolsoUI(amount, visible){
  const box = document.getElementById('coins-reembolso');
  if(!box) return;
  box.style.display = visible ? '' : 'none';
  if(!visible) return;
  const g = _coinsParte(document.getElementById('ci-reembolso-general')?.value);
  const s = _coinsParte(document.getElementById('ci-reembolso-sub')?.value);
  const hint = document.getElementById('coins-reembolso-hint');
  if(!hint) return;
  if(isNaN(g) || isNaN(s)){
    hint.innerHTML = `<span style="color:var(--red);">Escribe dos enteros (0 o más): tienen que sumar ${Number.isFinite(amount) ? amount.toLocaleString('es-CL') : 'la cantidad'}.</span>`;
    return;
  }
  const suma = g + s;
  hint.innerHTML = (Number.isFinite(amount) && suma !== amount)
    ? `<span style="color:var(--red);">General ${g.toLocaleString('es-CL')} + bono ${s.toLocaleString('es-CL')} = ${suma.toLocaleString('es-CL')}: tiene que sumar ${amount.toLocaleString('es-CL')}.</span>`
    : `Se devuelven ${suma.toLocaleString('es-CL')} coins y vuelven al tope${s > 0 ? ` (general ${g.toLocaleString('es-CL')} · bono ${s.toLocaleString('es-CL')})` : ''}.`;
}

/* Al cambiar el motivo: muestra los campos del reembolso y reinicia el reparto. */
function onCoinsReasonChange(){
  const esReembolso = _coinsMotivo() === 'reembolso';
  const amount = _coinsAmount(document.getElementById('ci-amount')?.value);
  window._coinsReembolsoManual = false;
  if(esReembolso) _coinsReembolsoDefaults(amount);
  _coinsReembolsoUI(amount, esReembolso);
  updateCoinsPreview(Number(window._coinsSaldoModal) || 0, window._coinsModalMode || 'add');
}

/* Al editar a mano una de las dos partes del reembolso. */
function coinsReembolsoEditado(){
  window._coinsReembolsoManual = true;
  const amount = _coinsAmount(document.getElementById('ci-amount')?.value);
  _coinsReembolsoUI(amount, true);
  updateCoinsPreview(Number(window._coinsSaldoModal) || 0, window._coinsModalMode || 'add');
}

async function openCoinsModal(teamId, mode){
  const team = await dbGet('teams', teamId);
  if(!team){ showToast('El equipo ya no existe','error'); renderAdmCoins(); return; }
  const cobro = await _coinsTemporadaInfo();
  const isAdd = mode==='add';
  // COINS1: el bloque del tope solo tiene sentido al AGREGAR coins.
  const tope = isAdd ? await _coinsDatosTope(team, cobro) : null;
  window._coinsTopeResumen = tope && tope.resumen ? tope.resumen : null;
  window._coinsSaldoModal = Number(team.yunacoin) || 0;
  window._coinsModalMode = mode;
  window._coinsReembolsoManual = false;
  const wrap = document.getElementById('coins-modal-wrap');
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
        ${_coinsTopeHTML(tope)}
        ${_coinsCobroLineaHTML(cobro)}
        <div class="form-group">
          <label>Cantidad</label>
          <input type="number" id="ci-amount" min="1" value="100" style="font-family:'Bebas Neue';font-size:29px;text-align:center;" data-oninput="updateCoinsPreview(${team.yunacoin||0},'${mode}')">
        </div>
        <div class="form-group">
          <label>Motivo</label>
          <select id="ci-reason" data-onchange="onCoinsReasonChange()" style="width:100%;padding:8px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);">
            ${isAdd?'<option value="stream">Stream</option><option value="victoria">Victoria</option><option value="campeon">Campeón</option><option value="evento">Evento</option><option value="bonus">Bonus</option><option value="otro">Otro</option><option value="reembolso">Reembolso de mejora</option>':'<option value="compra">Compra jugador</option><option value="mejora">Mejora stats</option><option value="tactica">Táctica</option><option value="multa">Multa</option><option value="otro">Otro</option>'}
          </select>
        </div>
        ${isAdd?`<div class="form-group" id="coins-reembolso" style="display:none;">
          <label>¿A qué tope vuelve? (general + bono = cantidad)</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div>
              <span style="display:block;font-size:12px;color:var(--txt2);margin-bottom:4px;">Devolver al tope general</span>
              <input type="number" id="ci-reembolso-general" min="0" value="0" data-oninput="coinsReembolsoEditado()">
            </div>
            <div>
              <span style="display:block;font-size:12px;color:var(--txt2);margin-bottom:4px;">Devolver al bono</span>
              <input type="number" id="ci-reembolso-sub" min="0" value="0" data-oninput="coinsReembolsoEditado()">
            </div>
          </div>
          <div id="coins-reembolso-hint" style="margin-top:6px;font-size:12px;line-height:1.4;color:var(--txt3);"></div>
        </div>`:''}
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
  // COINS1 · reembolso: mientras no se edite a mano, el reparto sigue la cantidad.
  const esReembolso = mode==='add' && _coinsMotivo()==='reembolso';
  if(esReembolso){
    if(!window._coinsReembolsoManual) _coinsReembolsoDefaults(amount);
    _coinsReembolsoUI(amount, true);
  }
  const aviso = _coinsSobraHTML(mode, amount);
  if(isNaN(amount)){ el.innerHTML = `<span style="color:var(--txt3);font-size:14px;">${_COINS_AMOUNT_MSG}</span>${aviso}`; return; }
  if(mode!=='add' && amount>current){ el.innerHTML = `<span style="color:var(--red);font-size:14px;">Saldo insuficiente: el equipo tiene ${current.toLocaleString('es-CL')} coins</span>${aviso}`; return; }
  const newTotal = mode==='add' ? current+amount : current-amount;
  el.innerHTML = `Nuevo saldo: <strong style="color:var(--gold);font-family:'Bebas Neue';font-size:22px;">${newTotal.toLocaleString('es-CL')}</strong> coins${aviso}`;
}

function closeCoinsModal(){ document.getElementById('coins-modal-wrap').innerHTML=''; }

function saveCoinsTransaction(teamId, mode){
  return _coinsRun(async ()=>{
    if(mode!=='add' && mode!=='sub') return;
    const amount = _coinsAmount(document.getElementById('ci-amount')?.value);
    const motivo = _coinsMotivo() || 'otro';
    const note   = (document.getElementById('ci-note')?.value||'').trim().slice(0,200);
    if(isNaN(amount)){ showToast(_COINS_AMOUNT_MSG,'error'); return; }
    /* COINS1 · reembolso de mejora: devuelve las coins al equipo Y reintegra el
       tope de la temporada (pes5 con fromGeneral/fromSub negativos, que
       gastoTemporada resta). El movimiento es mode 'add': suma saldo. */
    let reason = motivo;
    let pes5 = null;
    if(mode==='add' && motivo==='reembolso'){
      const g = _coinsParte(document.getElementById('ci-reembolso-general')?.value);
      const s = _coinsParte(document.getElementById('ci-reembolso-sub')?.value);
      if(isNaN(g) || isNaN(s)){ showToast('Reembolso: el tope general y el bono tienen que ser enteros de 0 o más','error'); return; }
      if(g + s !== amount){
        showToast(`Reembolso: tiene que sumar ${amount.toLocaleString('es-CL')} (general ${g.toLocaleString('es-CL')} + bono ${s.toLocaleString('es-CL')} = ${(g+s).toLocaleString('es-CL')})`,'error');
        return;
      }
      reason = 'mejora PES5 reembolso';
      pes5 = { fromGeneral: -g, fromSub: -s, reembolso: true };
    }
    const cob = await _coinsTemporadaCobro();
    if(!cob) return;
    const team = await dbGet('teams', teamId);
    if(!team){ showToast('El equipo ya no existe','error'); closeCoinsModal(); renderAdmCoins(); return; }
    const current = Number(team.yunacoin)||0;
    if(mode==='sub' && amount>current){
      showToast(`${team.name} tiene ${current.toLocaleString('es-CL')} coins: no se pueden restar ${amount.toLocaleString('es-CL')}`,'error');
      return;
    }
    const newTotal = mode==='add' ? current+amount : current-amount;
    const mov = {teamId,teamName:team.name,mode,amount,reason,note,before:current,after:newTotal,season:cob.n,date:new Date().toISOString(),streamlabs:YUNACOINS_RULES.marcaStreamlabsInicial(team)};
    if(pes5) mov.pes5 = pes5;
    await dbWriteBatch([
      {type:'add', store:'coins', data:mov},
      {type:'set', store:'teams', data:{...team,yunacoin:newTotal}},
    ]);
    showToast(pes5 ? `Reembolso: +${amount.toLocaleString('es-CL')} coins a ${team.name}` : `${mode==='add'?'+':'-'}${amount.toLocaleString('es-CL')} coins a ${team.name}`);
    closeCoinsModal();
    renderAdmCoins();
  });
}

async function openCoinsHistory(teamId){
  const team    = await dbGet('teams', teamId);
  const history = await dbGetAll('coins', c=>c.teamId===teamId);
  const sorted  = history.sort((a,b)=>new Date(b.date)-new Date(a.date));
  const wrap    = document.getElementById('coins-history-wrap');
  const RLABELS = {stream:'Stream',victoria:'Victoria',campeon:'Campeón',evento:'Evento',bonus:'Bonus',compra:'Compra jugador',mejora:'Mejora stats',tactica:'Táctica',multa:'Multa',otro:'Otro',reembolso:'Reembolso de mejora','mejora PES5 reembolso':'Reembolso de mejora'};
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
  const cobro = await _coinsTemporadaInfo();
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
        <div style="margin-top:10px;">${_coinsCobroLineaHTML(cobro)}</div>
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
    const cob = await _coinsTemporadaCobro();
    if(!cob) return;
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
        ops.push({type:'add', store:'coins', data:{teamId:team.id,teamName:team.name,mode,amount:delta,reason,note:'Masivo',before:cur,after:nxt,season:cob.n,date,streamlabs:YUNACOINS_RULES.marcaStreamlabsInicial(team)}});
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
