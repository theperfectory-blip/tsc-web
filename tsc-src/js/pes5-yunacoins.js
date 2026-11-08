'use strict';
/* ============================================================
   PESTANA YUNACOINS de la Tool PES5 (slice 2.0-4, 4.C y 4.D).
   Plan B: Luis copia la lista de Loyalty (Streamlabs → Loyalty → Users) y la pega
   aca. La tool calcula la vista previa (sin escribir), arma la lista de ajustes
   para Streamlabs (poné a @X en N) y, con «Preparar» y «Aplicar», escribe los saldos.
   La logica pura esta en js/yunacoins-rules.js (testeada en tools/).
   Se carga bajo demanda con la Tool (js/pes5-admin.js). Sin API, sin carpeta del juego:
   funciona igual en PC y en movil.
   ============================================================ */
window.PES5_YUNACOINS = (() => {
  const SYNC_KEY = 'yunacoinsSync';
  const R = () => YUNACOINS_RULES;
  const esc = (v) => escHtml(v == null ? '' : String(v));
  const fmt = (n) => (Number(n) || 0).toLocaleString('es-AR');
  const ahora = () => new Date();

  const ICO = {
    copy: '<svg class="icn" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    check: '<svg class="icn" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
    alert: '<svg class="icn" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>',
  };

  let ui = { texto: '', calc: null, msg: '', msgTipo: '', ajustes: [], chk: false };
  let ctr = null;

  function haceTexto(enIso){
    const h = R().horasDesde(enIso, ahora());
    if (h == null) return 'nunca';
    if (h < 1) return 'hace menos de 1 h';
    return 'hace ' + Math.floor(h) + ' h';
  }
  function emailActual(){
    try { const u = firebase.auth().currentUser; return (u && u.email) || 'admin'; } catch (e) { return 'admin'; }
  }
  async function leerSync(){
    const rows = await dbGetAll('settings', s => s.key === SYNC_KEY);
    return rows[0] || null;
  }
  async function guardarSync(row, value){
    await dbPut('settings', { ...(row || {}), key: SYNC_KEY, value: value });
  }

  // Lee todo lo que la vista necesita. No escribe nada.
  async function calcular(){
    const temporada = STATE.season;
    const [teams, movs, sync] = await Promise.all([
      dbGetAll('teams'),
      dbGetAll('coins', c => c.season === temporada),
      leerSync(),
    ]);
    const porEquipo = new Map();
    for (const m of movs){
      const k = String(m.teamId);
      if (!porEquipo.has(k)) porEquipo.set(k, []);
      porEquipo.get(k).push(m);
    }
    const mapeados = teams.filter(t => String(t.streamlabsUser || '').trim());
    const sinMapeo = teams.filter(t => t.status === 'ACTIVO' && !String(t.streamlabsUser || '').trim()).map(t => t.name);
    const equipos = mapeados.map(t => ({
      teamId: t.id, teamName: t.name, streamlabsUser: t.streamlabsUser,
      saldoWeb: Number(t.yunacoin) || 0,
      neto: R().netoPendiente(porEquipo.get(String(t.id)) || [], temporada),
    }));
    const parseo = ui.texto.trim() ? R().parsearListaLoyalty(ui.texto) : null;
    const vista = parseo ? R().vistaPrevia(equipos, parseo) : null;
    return {
      sync: sync, value: (sync && sync.value) || {}, equipos: equipos, sinMapeo: sinMapeo,
      parseo: parseo, vista: vista, pendientes: R().equiposConPendientes(movs, temporada).size,
    };
  }

  function msg(texto, tipo){ ui.msg = texto; ui.msgTipo = tipo || 'info'; }

  function renderEstado(c){
    const v = c.value;
    const pre = v.preparado;
    return `
      <section class="yc-card">
        <h3 class="yc-h3">Estado</h3>
        <dl class="yc-dl">
          <div><dt>Última sincronización</dt><dd>${v.en ? esc(new Date(v.en).toLocaleString('es-AR')) : 'nunca'}</dd></div>
          <div><dt>Antigüedad</dt><dd>${esc(haceTexto(v.en))}</dd></div>
          <div><dt>Hecha por</dt><dd>${esc(v.por || '—')}</dd></div>
          <div><dt>Equipos con pendientes</dt><dd>${c.pendientes}</dd></div>
        </dl>
        ${pre ? `<p class="yc-aviso">Hay ajustes preparados desde ${esc(new Date(pre.en).toLocaleString('es-AR'))} para ${Object.keys(pre.equipos || {}).length} equipo(s). Editá esos usuarios en Streamlabs y después «Aplicar».</p>` : ''}
      </section>`;
  }

  function renderPegar(){
    return `
      <section class="yc-card">
        <h3 class="yc-h3">Pegar la lista de Loyalty</h3>
        <p class="yc-ayuda">Streamlabs → Loyalty → Users: copiá la lista y pegala acá. <strong>Copiá la lista antes de editar en Streamlabs.</strong></p>
        <textarea id="yc-texto" class="yc-texto" rows="6" placeholder="usuario    puntos" aria-label="Lista de Loyalty pegada" data-oninput="ycTexto(this)">${esc(ui.texto)}</textarea>
        <div class="yc-acciones">
          <button type="button" class="yc-btn primary" data-onclick="ycVistaPrevia()">Vista previa</button>
        </div>
      </section>`;
  }

  function renderVista(c){
    if (!c.vista) return '';
    const v = c.vista;
    const filas = v.filas.map(f => `
      <div class="yc-fila${f.encontrado ? '' : ' sin'}">
        <div class="yc-fila-hd"><b>${esc(f.teamName)}</b><span>@${esc(f.usuario)}</span></div>
        <dl class="yc-dl yc-dl-2">
          <div><dt>Loyalty pegado</dt><dd>${f.encontrado ? fmt(f.pegado) : 'no aparece'}</dd></div>
          <div><dt>Neto pendiente</dt><dd>${fmt(f.neto)}</dd></div>
          <div><dt>Saldo nuevo</dt><dd class="yc-strong">${f.encontrado ? fmt(f.saldoNuevo) : '—'}</dd></div>
          <div><dt>Saldo web</dt><dd>${fmt(f.saldoWeb)}</dd></div>
          <div><dt>Diferencia</dt><dd>${f.encontrado ? (f.diferencia > 0 ? '+' : '') + fmt(f.diferencia) : '—'}</dd></div>
        </dl>
      </div>`).join('');
    const avisos = [];
    if (c.sinMapeo.length) avisos.push(`Equipos activos sin mapeo a Streamlabs: ${esc(c.sinMapeo.join(', '))}.`);
    if (v.noEncontrados.length) avisos.push(`Usuarios del mapeo que no aparecen en lo pegado: ${esc(v.noEncontrados.map(u => '@' + u).join(', '))}.`);
    if (v.usuariosSinEquipo) avisos.push(`${v.usuariosSinEquipo} usuario(s) de la lista no son de ningún equipo.`);
    const p = c.parseo;
    if (p){
      avisos.push(`Líneas leídas: ${p.lineas}. Ignoradas (ruido): ${p.ignoradas}. Duplicadas: ${p.duplicados}.`);
      if (p.ambiguos.length) avisos.push(`Usuarios repetidos con puntos distintos (no se usan): ${esc(p.ambiguos.map(u => '@' + u).join(', '))}.`);
    }
    return `
      <section class="yc-card">
        <h3 class="yc-h3">Vista previa</h3>
        <p class="yc-ayuda">No escribe nada. Saldo nuevo = pegado − neto pendiente.</p>
        ${avisos.length ? `<ul class="yc-avisos">${avisos.map(a => `<li>${a}</li>`).join('')}</ul>` : ''}
        <div class="yc-lista">${filas || '<p class="yc-ayuda">No hay equipos con mapeo a Streamlabs.</p>'}</div>
      </section>`;
  }

  function renderAjustes(c){
    if (!c.vista) return '';
    ui.ajustes = R().ajustesStreamlabs(c.vista.filas);
    if (!ui.ajustes.length) return `
      <section class="yc-card">
        <h3 class="yc-h3">Ajustes para Streamlabs</h3>
        <p class="yc-ayuda">Ningún equipo tiene neto pendiente: no hay nada que editar en Streamlabs.</p>
      </section>`;
    const items = ui.ajustes.map((a, i) => `
      <li class="yc-ajuste">
        <span>Poné a <b>@${esc(a.usuario)}</b> en <b class="yc-strong">${fmt(a.objetivo)}</b> <small>(${esc(a.teamName)})</small></span>
        <button type="button" class="yc-btn ghost" data-onclick="ycCopiar(${i})" aria-label="Copiar ajuste de ${esc(a.usuario)}">${ICO.copy}Copiar</button>
      </li>`).join('');
    return `
      <section class="yc-card">
        <h3 class="yc-h3">Ajustes para Streamlabs</h3>
        <p class="yc-ayuda">Editá estos pocos usuarios a mano con el lápiz del panel de Loyalty.</p>
        <ol class="yc-ajustes">${items}</ol>
      </section>`;
  }

  function renderPreparar(c){
    const hayEncontrados = !!(c.vista && c.vista.filas.some(f => f.encontrado));
    return `
      <section class="yc-card">
        <h3 class="yc-h3">Preparar y aplicar</h3>
        <p class="yc-ayuda">«Preparar» guarda una foto de los saldos y no toca nada más. «Aplicar» usa esa foto: escribe los saldos y marca los movimientos como sincronizados.</p>
        <div class="yc-acciones">
          <button type="button" class="yc-btn" data-onclick="ycPreparar()" ${hayEncontrados ? '' : 'disabled'}>Preparar ajustes</button>
        </div>
        <label class="yc-chk"><input type="checkbox" id="yc-chk" ${ui.chk ? 'checked' : ''} data-onchange="ycChk(this)"> Ya cargué los ajustes en Streamlabs</label>
        <div class="yc-acciones">
          <button type="button" class="yc-btn primary" data-onclick="ycAplicar()" ${ui.chk && c.value.preparado ? '' : 'disabled'}>Aplicar</button>
        </div>
      </section>`;
  }

  function render(cont){
    ctr = cont || ctr;
    return refrescar();
  }

  async function refrescar(){
    if (!ctr) return;
    ctr.innerHTML = '<p class="yc-ayuda">Leyendo YunaCoins…</p>';
    try {
      ui.calc = await calcular();
      const c = ui.calc;
      ctr.innerHTML = `
        <div class="yc-root">
          <h2 class="pt-h1">YunaCoins</h2>
          <div class="pt-sub">Sincronización con Streamlabs Loyalty (copiar y pegar).</div>
          ${ui.msg ? `<div class="yc-msg ${ui.msgTipo}">${esc(ui.msg)}</div>` : ''}
          ${renderEstado(c)}
          ${renderPegar()}
          ${renderVista(c)}
          ${renderAjustes(c)}
          ${renderPreparar(c)}
        </div>`;
    } catch (e){
      console.error('[yunacoins]', e);
      ctr.innerHTML = `<div class="yc-msg err">No se pudo leer YunaCoins: ${esc(e.message || e)}</div>`;
    }
  }

  // ---- acciones de la pestana ----
  async function vistaPrevia(){
    ui.texto = (document.getElementById('yc-texto') || {}).value || '';
    if (!ui.texto.trim()){ msg('Pegá la lista de Loyalty antes de la vista previa.', 'err'); return refrescar(); }
    msg('', '');
    return refrescar();
  }

  async function preparar(){
    ui.texto = (document.getElementById('yc-texto') || {}).value || '';
    const c = await calcular();
    if (!c.vista){ msg('Pegá la lista de Loyalty primero.', 'err'); return refrescar(); }
    const encontrados = c.vista.filas.filter(f => f.encontrado);
    if (!encontrados.length){ msg('Ningún equipo con mapeo aparece en la lista pegada: no hay nada que preparar.', 'err'); return refrescar(); }
    const lote = 'lote-' + Date.now();
    const en = new Date().toISOString();
    const foto = R().construirFoto(c.vista.filas, lote, en);
    const hacer = async () => {
      await guardarSync(c.sync, { ...c.value, preparado: { ...foto, por: emailActual() } });
      ui.chk = false;
      msg(`Preparado: ${encontrados.length} equipo(s). Editá los usuarios en Streamlabs y después «Aplicar».`, 'ok');
      await refrescar();
    };
    if (c.value.preparado){
      showConfirm('¿Reemplazar los ajustes preparados?', 'Ya hay una foto preparada. Se reemplaza por esta lista.', hacer);
      return;
    }
    return hacer();
  }

  // Aplicar usa la foto guardada. Si la lista pegada no esta vacia, se resuelve con la guardia (4.C.7).
  async function aplicar(){
    ui.texto = (document.getElementById('yc-texto') || {}).value || '';
    const c = await calcular();
    const foto = c.value.preparado;
    if (!foto){ msg('No hay ajustes preparados. Primero «Preparar ajustes».', 'err'); return refrescar(); }
    const pegadoNuevo = c.parseo && c.parseo.filas.length
      ? new Map(c.parseo.filas.map(f => [R().normUsuario(f.usuario), f.puntos])) : null;
    const plan = R().resolverAplicar(foto, pegadoNuevo);
    const cuenta = { aplicar: 0, ya_ajustado: 0, conflicto: 0, sin_usuario: 0 };
    for (const p of Object.values(plan)) cuenta[p.accion] = (cuenta[p.accion] || 0) + 1;
    const txt = `Se escriben ${cuenta.aplicar + cuenta.ya_ajustado} saldo(s). ` +
      (cuenta.ya_ajustado ? `${cuenta.ya_ajustado} ya estaban ajustados en Streamlabs (no se resta otra vez). ` : '') +
      (cuenta.conflicto + cuenta.sin_usuario ? `${cuenta.conflicto + cuenta.sin_usuario} quedan fuera (conflicto o usuario no encontrado).` : '');
    showConfirm('¿Aplicar los saldos?', txt, () => ejecutar(plan, foto, c));
  }

  async function ejecutar(plan, foto, c){
    const lote = foto.lote;
    const en = new Date().toISOString();
    const por = emailActual();
    const teams = await dbGetAll('teams');
    const movs = await dbGetAll('coins', m => m.season === STATE.season);
    const marca = { estado: 'sincronizado', lote: lote, en: en };
    const aplicados = [];
    const excluidos = [];
    for (const [teamId, p] of Object.entries(plan)){
      const team = teams.find(t => String(t.id) === teamId);
      if (p.accion === 'conflicto' || p.accion === 'sin_usuario'){ excluidos.push({ teamId: teamId, teamName: team ? team.name : null, motivo: p.accion }); continue; }
      if (!team){ excluidos.push({ teamId: teamId, teamName: null, motivo: 'equipo inexistente' }); continue; }
      const saldoAntes = Number(team.yunacoin) || 0;
      const saldoNuevo = p.saldo;
      const pend = movs.filter(m => String(m.teamId) === teamId && R().estadoStreamlabs(m) === 'pendiente');
      const ops = [];
      if (saldoNuevo !== saldoAntes){
        ops.push({ type: 'add', store: 'coins', data: {
          teamId: team.id, teamName: team.name, mode: 'sync', amount: Math.abs(saldoNuevo - saldoAntes),
          reason: 'Loyalty', note: 'Saldo sincronizado con Loyalty',
          before: saldoAntes, after: saldoNuevo, season: STATE.season, date: en, streamlabs: marca,
        } });
      }
      ops.push({ type: 'set', store: 'teams', data: { ...team, yunacoin: saldoNuevo } });
      for (const m of pend) ops.push({ type: 'set', store: 'coins', data: { ...m, streamlabs: marca } });
      if (ops.length > DB_BATCH_MAX){ excluidos.push({ teamId: teamId, teamName: team.name, motivo: 'demasiados movimientos para un lote' }); continue; }
      // un equipo entero por lote: un corte deja equipos enteros hechos o sin hacer
      await dbWriteBatch(ops);
      aplicados.push({ teamId: teamId, teamName: team.name, saldoAntes: saldoAntes, saldoNuevo: saldoNuevo, pendientes: pend.length });
    }
    await guardarSync(c.sync, {
      en: en, por: por, lote: lote, equipos: aplicados.length,
      noEncontrados: c.vista ? c.vista.noEncontrados : [],
      excluidos: excluidos,
      preparado: null,
    });
    ui.chk = false;
    msg(`Aplicado: ${aplicados.length} equipo(s).` + (excluidos.length ? ` ${excluidos.length} quedaron fuera (conflicto o usuario no encontrado): revisalos antes de volver a aplicar.` : ''), excluidos.length ? 'warn' : 'ok');
    await refrescar();
  }

  // ---- 4.D: guardia de frescura para los cobros (la llama pes5-tool antes de cobrar) ----
  function modalCobroVencido(h){
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'yc-modal-ov';
      const texto = h == null
        ? 'Todavía no hay una lista de Loyalty sincronizada.'
        : `El saldo es de hace ${Math.floor(h)} h. Pegá la lista de Loyalty antes de cobrar.`;
      wrap.innerHTML = `
        <div class="yc-modal">
          <h3 class="yc-h3">Cobro con saldo viejo</h3>
          <p>${esc(texto)}</p>
          <label class="yc-chk"><input type="checkbox" id="yc-cobrar-igual"> Cobrar igual con saldo viejo (puede haber sobregiro)</label>
          <div class="yc-acciones">
            <button type="button" class="yc-btn primary" data-act="ir">Ir a YunaCoins</button>
            <button type="button" class="yc-btn" data-act="cobrar" disabled>Cobrar igual</button>
            <button type="button" class="yc-btn ghost" data-act="cancelar">Cancelar</button>
          </div>
        </div>`;
      document.body.appendChild(wrap);
      const chk = wrap.querySelector('#yc-cobrar-igual');
      const btnCobrar = wrap.querySelector('[data-act="cobrar"]');
      chk.addEventListener('change', () => { btnCobrar.disabled = !chk.checked; });
      const cerrar = (accion) => { wrap.remove(); resolve({ accion: accion, casilla: chk.checked }); };
      wrap.querySelector('[data-act="ir"]').addEventListener('click', () => cerrar('ir'));
      btnCobrar.addEventListener('click', () => cerrar('cobrar'));
      wrap.querySelector('[data-act="cancelar"]').addEventListener('click', () => cerrar('cancelar'));
    });
  }

  // Devuelve true si el cobro puede seguir. Si la lista esta vencida, pregunta; «Ir a YunaCoins» devuelve false.
  async function guardiaCobro(log){
    const sync = await leerSync();
    const en = sync && sync.value && sync.value.en;
    if (!R().listaVencida(en, ahora())) return true;
    const h = R().horasDesde(en, ahora());
    const d = await modalCobroVencido(h);
    if (d.accion === 'ir'){
      if (typeof window.ptSwitchTab === 'function') window.ptSwitchTab('yunacoins');
      return false;
    }
    if (d.accion === 'cobrar' && d.casilla){
      if (log) log(`COBRO CON SALDO VIEJO (sincronizado ${h == null ? 'nunca' : 'hace ' + Math.floor(h) + ' h'}): puede haber sobregiro.`, 'warn');
      return true;
    }
    return false;
  }

  window.ycVistaPrevia = vistaPrevia;
  window.ycPreparar = preparar;
  window.ycAplicar = aplicar;
  window.ycChk = (el) => { ui.chk = !!el.checked; return refrescar(); };
  // Lo que se escribe en el textarea se guarda al instante: refrescar() repinta la pestaña y no debe perderlo.
  window.ycTexto = (el) => { ui.texto = el.value; };
  window.ycCopiar = (i) => {
    const a = ui.ajustes[i];
    if (!a) return;
    const txt = `Poné a @${a.usuario} en ${a.objetivo}`;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => msg('Copiado: ' + txt, 'ok')).then(refrescar, refrescar);
    else { msg('Copiá a mano: ' + txt, 'warn'); refrescar(); }
  };

  return { render: render, guardiaCobro: guardiaCobro };
})();
