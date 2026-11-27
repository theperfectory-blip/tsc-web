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

/* ----------------------------------------------------------
   YCORDEN · orden de los equipos en YuNaCoins
   ----------------------------------------------------------
   La función que ordena (activos alfabético por nombre, inactivos al final
   por ID) vive en ui-utils.js —compartida con la sección Equipos
   (EQORDEN)—: `ordenarEquiposActivosPrimero(teams)`.
   ---------------------------------------------------------- */

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
  // YCORDEN: activos primero y, dentro de cada grupo, el ranking por saldo.
  // Los inactivos van al final, después de la fila separadora.
  const { activos, inactivos } = ordenarEquiposActivosPrimero(teams);
  const porSaldo = (a,b)=>(b.yunacoin||0)-(a.yunacoin||0);
  activos.sort(porSaldo);
  inactivos.sort(porSaldo);
  const filaHTML = t=>{
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
  };
  const sepInactivos = `<tr><td colspan="6" style="padding:9px 10px;background:var(--card2);border-top:1px solid var(--brd2);border-bottom:1px solid var(--brd);font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:var(--txt3);">Inactivos</td></tr>`;
  if(!activos.length && !inactivos.length){
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--txt3);">No hay equipos.</td></tr>`;
    return;
  }
  tbody.innerHTML =
    activos.map(filaHTML).join('') +
    (inactivos.length ? sepInactivos + inactivos.map(filaHTML).join('') : '');
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
   coins regaladas, se gastan con el saldo del equipo. BONO-3: el bono solo lo
   pueden usar los jugadores con «$», y el desglose lo dice. */
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
  // BONO-5: el bono es POR JUGADOR («cada uno solo para su jugador»), no una
  // bolsa del equipo: el desglose muestra cuánto le toca a cada «$».
  const partes = [];
  if(r.bono > 0 || r.extra > 0) partes.push(`Base ${nf(r.topeGeneral)}`);
  if(r.bono > 0){
    const nSub = Number(d.nSuscriptores) || 0;
    const porJugador = nSub > 0 ? r.bono / nSub : 0;
    partes.push(nSub === 1
      ? `1 suscriptor × ${nf(porJugador)} (solo para su jugador)`
      : `${nf(nSub)} suscriptores × ${nf(porJugador)} (cada uno solo para su jugador)`);
  }
  if(r.extra > 0) partes.push(`Extra ${nf(r.extra)}`);
  return box([
    `Tope del equipo esta temporada: <strong style="color:var(--txt);">${nf(r.topeTotal)}</strong>`,
    partes.length ? `<span style="color:var(--txt2);">${partes.join(' + ')}</span>` : '',
    `Gastado: ${nf(r.gastadoTotal)} · Saldo: ${nf(r.saldo)}`,
    `Le sirve cargar hasta: <strong style="color:var(--gold);">${nf(r.sirveCargar)}</strong>`,
    r.bono > 0 ? '<span style="color:var(--txt3);">El bono de cada jugador con «$» solo se puede gastar en ese jugador.</span>' : '',
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

/* ==========================================================
   HIST2 · Historial de YuNaCoins del equipo (acordeón)
   ----------------------------------------------------------
   Jerarquía temporada › tipo › movimiento con <details>/<summary>
   nativos (sin handlers propios). La agrupación y las sumas las hace
   YUNACOINS_RULES.agruparHistorialCoins (pura, con test en tools/).
   Estilos en css/components.css (clases .ch-*).
   ========================================================== */
const _COINS_HIST_RLABELS = {stream:'Stream',victoria:'Victoria',campeon:'Campeón',evento:'Evento',bonus:'Bonus',compra:'Compra jugador',mejora:'Mejora stats',tactica:'Táctica',multa:'Multa',otro:'Otro',reembolso:'Reembolso de mejora','mejora PES5':'Mejora PES5','mejora PES5 (admin)':'Mejora PES5','mejora PES5 (pedido)':'Mejora PES5','mejora PES5 reembolso':'Reembolso de mejora','mejora PES5 retroactiva':'Retroactiva'};

function _coinsHistNF(n){
  return (Number(n) || 0).toLocaleString('es-CL');
}

/* dd/mm hh:mm en hora local (la tabla vieja mostraba la fecha larga). */
function _coinsHistFecha(iso){
  const d = new Date(iso);
  if(isNaN(d.getTime())) return '—';
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function _coinsHistLineaHTML(l){
  if(!l) return '';
  const costo = Number(l.costo);
  const costoHTML = Number.isFinite(costo) && costo > 0
    ? ` <span class="ch-linea-costo">+${_coinsHistNF(costo)}</span>` : '';
  return `<li><span class="ch-linea-campo">${escHtml(l.campo || '—')}</span><span class="ch-linea-val">${escHtml(l.de == null ? '—' : l.de)} → ${escHtml(l.a == null ? '—' : l.a)}</span>${costoHTML}</li>`;
}

/* Detalle de un movimiento: nota completa, líneas del cambio y desglose pes5. */
function _coinsHistDetalleHTML(t, nota){
  const partes = [];
  if(nota) partes.push(`<div class="ch-det-nota">${escHtml(nota)}</div>`);
  const p = t.pes5 && typeof t.pes5 === 'object' ? t.pes5 : null;
  if(p){
    if(Array.isArray(p.lineas) && p.lineas.length){
      partes.push(`<ul class="ch-lineas">${p.lineas.map(_coinsHistLineaHTML).join('')}</ul>`);
    }
    const dinero = [];
    if(p.fromSub != null) dinero.push(`<span>Del bono: <b>${_coinsHistNF(p.fromSub)}</b></span>`);
    if(p.fromGeneral != null) dinero.push(`<span>Del general: <b>${_coinsHistNF(p.fromGeneral)}</b></span>`);
    if(p.reembolso) dinero.push('<span>Reembolso de mejora</span>');
    if(dinero.length) partes.push(`<div class="ch-det-partes">${dinero.join('')}</div>`);
    if(p.pedidoId) partes.push(`<div class="ch-det-pedido">Pedido: ${escHtml(p.pedidoId)}</div>`);
  }
  return partes.join('');
}

function _coinsHistMovHTML(t){
  const isAdd = t.mode === 'add';
  const label = _COINS_HIST_RLABELS[t.reason] || t.reason || (isAdd ? 'Ingreso' : 'Descuento');
  const esMejora = typeof t.reason === 'string' && t.reason.indexOf('mejora PES5') === 0;
  const jugador = esMejora && t.pes5 && t.pes5.playerName ? String(t.pes5.playerName) : '';
  // La etiqueta ya dice «Retroactiva»: no se repite el prefijo de la nota.
  const nota = t.reason === 'mejora PES5 retroactiva' && String(t.note||'').indexOf('Retroactiva:') === 0
    ? String(t.note).slice('Retroactiva:'.length).trim() : t.note;
  const monto = Math.abs(Number(t.amount) || 0);
  const saldo = t.after == null ? '—' : _coinsHistNF(t.after);
  const detalle = _coinsHistDetalleHTML(t, nota);
  return `<details class="ch-mov">
    <summary class="ch-mov-sum">
      <span class="ch-fecha">${_coinsHistFecha(t.date)}</span>
      <span class="ch-motivo">${escHtml(label)}${jugador ? `<span class="ch-jugador">${escHtml(jugador)}</span>` : ''}</span>
      <span class="ch-monto ${isAdd ? 'ch-green' : 'ch-red'}">${isAdd ? '+' : '−'}${_coinsHistNF(monto)}</span>
      <span class="ch-saldo">${escHtml(saldo)}</span>
      <svg class="ch-chev ch-chev--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </summary>
    <div class="ch-det">${detalle || '<div class="ch-det-vacio">Sin detalle.</div>'}</div>
  </details>`;
}

function _coinsHistTipoHTML(t){
  // Hasta 30 movimientos a la vista; el resto, detrás de «Ver más».
  const visibles = t.movimientos.slice(0, 30);
  const resto = t.movimientos.slice(30);
  const suma = Number(t.suma) || 0;
  return `<details class="ch-tipo">
    <summary class="ch-tipo-sum">
      <svg class="ch-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      <span class="ch-tipo-nombre">${escHtml(t.label)}</span>
      <span class="ch-cant">${t.n}</span>
      <span class="ch-suma ${suma < 0 ? 'ch-red' : 'ch-green'}">${suma < 0 ? '−' : '+'}${_coinsHistNF(Math.abs(suma))}</span>
    </summary>
    <div class="ch-tipo-body">
      ${visibles.map(_coinsHistMovHTML).join('')}
      ${resto.length ? `<details class="ch-mas">
        <summary class="ch-mas-btn">Ver más (${resto.length})</summary>
        <div class="ch-mas-body">${resto.map(_coinsHistMovHTML).join('')}</div>
      </details>` : ''}
    </div>
  </details>`;
}

function _coinsHistTemporadaHTML(t, nombres){
  const nombre = (nombres && nombres[t.season]) || t.nombre;
  return `<details class="ch-season"${t.abierta ? ' open' : ''}>
    <summary class="ch-season-sum">
      <svg class="ch-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      <span class="ch-season-nombre">${escHtml(nombre)}</span>
      <span class="ch-meta">${t.n} ${t.n === 1 ? 'movimiento' : 'movimientos'}</span>
      <span class="ch-flujo"><span class="ch-green">+${_coinsHistNF(t.ingresos)}</span><span class="ch-sep">/</span><span class="ch-red">−${_coinsHistNF(t.gastos)}</span></span>
    </summary>
    <div class="ch-season-body">${t.tipos.map(_coinsHistTipoHTML).join('')}</div>
  </details>`;
}

async function openCoinsHistory(teamId){
  const team = await dbGet('teams', teamId);
  if(!team){ showToast('El equipo ya no existe', 'error'); renderAdmCoins(); return; }
  const [cobro, history, seasons] = await Promise.all([
    _coinsTemporadaInfo(),
    dbGetAll('coins', c => String(c.teamId) === String(teamId)),
    dbGetAll('seasons'),
  ]);
  const nombres = {};
  (seasons || []).forEach(s => {
    if(s && s.number != null) nombres[Number(s.number)] = getSeasonName(s);
  });
  const grupos = YUNACOINS_RULES.agruparHistorialCoins(history, cobro.n);
  const cobroNombre = nombres[Number(cobro.n)] || cobro.nombre;
  const saldo = Number(team.yunacoin) || 0;
  const wrap = document.getElementById('coins-history-wrap');
  if(!wrap) return;
  wrap.innerHTML = `
  <div class="modal-overlay open ch-overlay">
    <div class="modal ch-modal" role="dialog" aria-modal="true" aria-label="Historial de YuNaCoins de ${escAttr(team.name)}">
      <div class="modal-hdr ch-hdr">
        <div class="modal-title">Historial · ${escHtml(team.name)}</div>
        <button class="modal-close" data-onclick="_tscClear('coins-history-wrap')" aria-label="Cerrar">×</button>
      </div>
      <div class="modal-body ch-body">
        <div class="ch-cards">
          <div class="ch-card"><div class="ch-card-lbl">Saldo actual</div><div class="ch-card-val ch-gold">${_coinsHistNF(saldo)}</div></div>
          <div class="ch-card"><div class="ch-card-lbl">Ingresos esta temporada</div><div class="ch-card-val ch-green">+${_coinsHistNF(grupos.temporadaCobro.ingresos)}</div></div>
          <div class="ch-card"><div class="ch-card-lbl">Gastos esta temporada</div><div class="ch-card-val ch-red">−${_coinsHistNF(grupos.temporadaCobro.gastos)}</div></div>
        </div>
        <div class="ch-cobro">Temporada de cobro: <strong>${escHtml(cobroNombre)}</strong></div>
        ${grupos.temporadas.length
          ? grupos.temporadas.map(t => _coinsHistTemporadaHTML(t, nombres)).join('')
          : '<div class="ch-vacio">Sin movimientos.</div>'}
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
