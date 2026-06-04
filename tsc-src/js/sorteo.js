/* ============================================================
   SORTEO — Animación chibi + bombos + sonido
   Persistencia: IndexedDB store 'sorteo' (un registro por temporada)
   Equipos referenciados por ID; nombre solo visual.
   Pública: SORTEO.init(selector), SORTEO.refresh()
   ============================================================ */
(function () {
  const FRAME_BASE = 'assets/chibi/';
  const FRAMES = [
    '01_idle.png','02_reach.png','03_grab.png','04_hold.png',
    '05_show.png','06_crack.png','07_open.png','08_celebrate.png'
  ];

  const SEQ = [
    { frame: 1, dur: 280 },
    { frame: 2, dur: 480 },
    { frame: 3, dur: 360 },
    { frame: 4, dur: 320 },
    { frame: 5, dur: 520, sparks: true, shake: true },
    { frame: 6, dur: 700, reveal: true, tada: true },
    { frame: 7, dur: 1700, confetti: true }
  ];
  const PRE_REVEAL_MS = 280 + 480 + 360 + 320 + 520;

  /* ---------------- State ---------------- */
  function newBomboId() { return 'b_' + Math.random().toString(36).slice(2, 9); }
  function newBombo(name = 'Bombo', teamIds = []) {
    return { id: newBomboId(), name, teamIds: teamIds.slice(), drawn: [] };
  }
  function emptyState() {
    const a = newBombo('Bombo A');
    const b = newBombo('Bombo B');
    return { bombos: [a, b], activeId: a.id };
  }

  let state = emptyState();
  let stateRecordId = null;
  let stateSeason   = null;
  let teamsById     = {};
  let activeTeamIds = new Set();
  let readOnly      = false;
  let mountedSelector = null;
  // Memoria del picker "Vincular": recuerda última comp/fase abierta para
  // no resetear al primer ítem cuando el admin reabre el modal.
  let _pickerLastCompId  = null;
  let _pickerLastPhaseId = null;
  // Flag de "equipo en animación": mientras está seteado, los renders tratan
  // a ese equipo como NO sorteado (no se tacha en la urna ni cuenta en los
  // contadores). Se limpia 1s después de terminar la animación, recién ahí
  // el chip aparece tachado al final de la lista.
  let _drawingTeamId = null;
  function effectiveDrawnIds(b) {
    const ids = (b?.drawn || []).map(d => d.teamId);
    if (_drawingTeamId == null) return ids;
    return ids.filter(t => t !== _drawingTeamId);
  }

  /* ---- BroadcastChannel: sincroniza admin ↔ público en distintas pestañas. ---- */
  const BC_NAME = 'tsc.sorteo.v1';
  let bc = null;
  function ensureBC() {
    if (bc || typeof BroadcastChannel === 'undefined') return bc;
    bc = new BroadcastChannel(BC_NAME);
    bc.addEventListener('message', onBroadcast);
    return bc;
  }
  function broadcast(msg) {
    try { ensureBC()?.postMessage(msg); } catch(e){}
  }
  async function onBroadcast(ev) {
    const m = ev.data; if (!m || !root) return;
    if (m.season != null && stateSeason != null && m.season !== stateSeason) return;
    if (m.type === 'state') {
      // En público preservamos la selección local de bombo (el espectador
      // puede estar mirando otro bombo distinto al que el admin acaba de
      // tocar). En admin sí seguimos la nueva selección.
      const keepLocalActive = readOnly ? state.activeId : null;
      await loadState();
      if (keepLocalActive && state.bombos.find(b => b.id === keepLocalActive)) {
        state.activeId = keepLocalActive;
      }
      await renderAll();
      if (typeof refreshSorteoTabVisibility === 'function') refreshSorteoTabVisibility();
    } else if (m.type === 'draw' && readOnly) {
      await loadState();
      state.activeId = m.bomboId;
      await refreshTeamsCache();
      const b = activeBombo(); if (!b) return;
      const drawnSet = new Set(b.drawn.map(d => d.teamId));
      const remaining = b.teamIds.filter(id => teamIsActive(id) && !drawnSet.has(id)).length;
      await playDrawAnimation(b, m.teamId, m.ord, remaining);
    }
  }

  /* ---- Tiempo real CROSS-DEVICE para espectadores (Firestore onSnapshot). ----
     BroadcastChannel solo sincroniza pestañas del mismo dispositivo; los
     espectadores en sus móviles necesitan esto para ver el sorteo en vivo
     (con la animación pick-and-open-ball), no solo al recargar. */
  let _sorteoUnsub = null;
  let _pendingSnap = null;   // snapshot recibido durante una animación (se procesa al terminar)
  function _subscribeSorteoLive() {
    if (typeof dbSubscribe !== 'function') { ensureBC(); return; }
    _unsubscribeSorteoLive();
    _sorteoUnsub = dbSubscribe('sorteo', r => r.season === stateSeason, onSorteoSnapshot);
  }
  function _unsubscribeSorteoLive() {
    if (_sorteoUnsub) { try { _sorteoUnsub(); } catch(e){} _sorteoUnsub = null; }
  }
  async function onSorteoSnapshot(rows) {
    if (!root || !readOnly) return;
    // Si hay una animación en curso, NO procesar el snapshot: un renderAll
    // aquí recrearía el DOM y dejaría la animación pegada a media pose.
    // El estado ya quedó cargado antes de animar; el próximo snapshot sincroniza.
    if (busy) { _pendingSnap = rows; return; }
    const rec = rows.find(r => r.season === stateSeason);
    if (!rec) return;
    const newBombos = rec.bombos || [];
    // Detectar un equipo recién sorteado comparando con el estado conocido.
    let nd = null;
    for (const nb of newBombos) {
      const ob = state.bombos.find(b => b.id === nb.id);
      const oldCount = ob ? ob.drawn.length : 0;
      if ((nb.drawn || []).length > oldCount) {
        const last = nb.drawn[nb.drawn.length - 1];
        nd = { bomboId: nb.id, teamId: last.teamId, ord: nb.drawn.length };
        break;
      }
    }
    const visible = root && root.offsetParent !== null;
    if (nd && !busy && visible) {
      // Reproducir la animación del nuevo equipo (igual que el broadcast 'draw').
      await loadState();
      state.activeId = nd.bomboId;
      await refreshTeamsCache();
      const b = activeBombo(); if (!b) return;
      const drawnSet = new Set(b.drawn.map(d => d.teamId));
      const remaining = b.teamIds.filter(id => teamIsActive(id) && !drawnSet.has(id)).length;
      await playDrawAnimation(b, nd.teamId, nd.ord, remaining);
    } else {
      // Reset / nuevo bombo / no visible: refrescar el estado sin animar.
      const keepLocalActive = state.activeId;
      await loadState();
      if (keepLocalActive && state.bombos.find(b => b.id === keepLocalActive)) state.activeId = keepLocalActive;
      await renderAll();
      if (typeof refreshSorteoTabVisibility === 'function') refreshSorteoTabVisibility();
    }
  }

  async function loadState() {
    const season = (typeof STATE !== 'undefined' && STATE.season) || 1;
    const all = await dbGetAll('sorteo', r => r.season === season);
    if (all.length) {
      const rec = all[0];
      state = { bombos: rec.bombos || [], activeId: rec.activeId || null };
      stateRecordId = rec.id;
    } else {
      state = emptyState();
      stateRecordId = await dbAdd('sorteo', {
        season, bombos: state.bombos, activeId: state.activeId, updatedAt: Date.now()
      });
    }
    stateSeason = season;
    if (!state.activeId || !state.bombos.find(b => b.id === state.activeId)) {
      state.activeId = state.bombos[0]?.id || null;
    }
  }
  async function saveState() {
    if (stateRecordId == null) return;
    await dbPut('sorteo', {
      id: stateRecordId, season: stateSeason,
      bombos: state.bombos, activeId: state.activeId, updatedAt: Date.now()
    });
    broadcast({ type:'state', season: stateSeason });
  }

  async function refreshTeamsCache() {
    const teams = await dbGetAll('teams');
    teamsById = {};
    activeTeamIds = new Set();
    for (const t of teams) {
      teamsById[t.id] = t;
      if ((t.status || 'ACTIVO') === 'ACTIVO') activeTeamIds.add(t.id);
    }
  }
  function teamName(id) { return teamsById[id]?.name || '— equipo eliminado —'; }
  function teamIsActive(id) { return activeTeamIds.has(id); }

  /* ---------------- DOM refs ---------------- */
  let root, chibi, frameEls, revealCard, revealName, revealLabel, revealMeta,
      sparkBurst, confettiLayer, btnSorteo, btnReset, hint,
      poolCounter, poolEls, drawnEl, drawnHdrCount,
      bombosBar, bomboBadge, btnSound, btnEditTeams;

  let busy = false;
  let drumHandle = null;

  function activeBombo() { return state.bombos.find(b => b.id === state.activeId) || null; }

  /* ---- Drumroll audio (mp3) ---- */
  let drumAudio = null;
  function ensureDrumAudio() {
    if (drumAudio) return drumAudio;
    drumAudio = new Audio('assets/sounds/drumroll.mp3');
    drumAudio.preload = 'auto';
    drumAudio.load();
    return drumAudio;
  }
  function playDrumrollAudio(durationMs) {
    const a = ensureDrumAudio();
    a.volume = (window.SFX && SFX.enabled === false) ? 0 : 0.9;
    try { a.currentTime = 0; } catch(e){}
    const p = a.play();
    if (p && p.catch) p.catch(err => console.warn('drumroll play failed:', err));
    const stopAt = setTimeout(() => stopDrumroll(true), Math.max(0, durationMs));
    return { stop() { clearTimeout(stopAt); stopDrumroll(true); } };
  }
  function stopDrumroll(fade=false) {
    if (!drumAudio) return;
    if (fade && drumAudio.volume > 0) {
      const a = drumAudio;
      const start = a.volume; const t0 = performance.now();
      const step = () => {
        const dt = (performance.now() - t0) / 80;
        if (dt >= 1) { a.pause(); a.currentTime = 0; a.volume = start; return; }
        a.volume = Math.max(0, start * (1 - dt));
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    } else {
      drumAudio.pause(); drumAudio.currentTime = 0;
    }
  }

  /* ---------------- Mount ---------------- */
  async function mount(container) {
    _unsubscribeSorteoLive();   // cancelar suscripción en vivo previa si se remonta
    container.innerHTML = TEMPLATE;
    root = container;
    root.classList.toggle('sorteo-readonly', !!readOnly);
    chibi          = container.querySelector('.chibi-anchor');
    frameEls       = container.querySelectorAll('.chibi-frame');
    revealCard     = container.querySelector('.reveal-card');
    revealName     = container.querySelector('.reveal-name');
    revealLabel    = container.querySelector('.reveal-label');
    revealMeta     = container.querySelector('.reveal-meta');
    sparkBurst     = container.querySelector('.spark-burst');
    confettiLayer  = container.querySelector('.confetti-layer');
    btnSorteo      = container.querySelector('#btn-sorteo');
    btnReset       = container.querySelector('#btn-sorteo-reset');
    hint           = container.querySelector('.stage-hint');
    poolCounter    = container.querySelector('#pool-counter');
    poolEls        = container.querySelector('#team-chips');
    drawnEl        = container.querySelector('#drawn-list');
    drawnHdrCount  = container.querySelector('#drawn-count');
    bombosBar      = container.querySelector('#bombos-bar');
    bomboBadge     = container.querySelector('#bombo-badge');
    btnSound       = container.querySelector('#btn-sound');
    btnEditTeams   = container.querySelector('#btn-edit-teams');

    // Sparks (12)
    for (let i = 0; i < 12; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      const angle = (i / 12) * Math.PI * 2;
      const dist  = 90 + Math.random() * 40;
      s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      s.style.animationDelay = (Math.random() * 80) + 'ms';
      sparkBurst.appendChild(s);
    }
    // Confetti (40)
    const colors = ['#ffd23f','#2ea3ff','#ffffff','#ff7e3a','#29c073'];
    for (let i = 0; i < 40; i++) {
      const c = document.createElement('span');
      c.className = 'confetti';
      c.style.background = colors[i % colors.length];
      c.style.left = (Math.random() * 100) + '%';
      c.style.animationDelay = (Math.random() * 600) + 'ms';
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      confettiLayer.appendChild(c);
    }

    if (!readOnly) {
      btnSorteo.addEventListener('click', () => { if (window.SFX) SFX.unlock(); drawNext(); });
      btnReset.addEventListener('click', resetActive);
      btnEditTeams.addEventListener('click', openTeamPicker);
      container.querySelector('#btn-add-bombo').addEventListener('click', addBombo);
      container.querySelector('#btn-rename-bombo').addEventListener('click', renameActiveBombo);
      container.querySelector('#btn-delete-bombo').addEventListener('click', deleteActiveBombo);
    }
    btnSound.addEventListener('click', toggleSound);

    showFrame(0);
    chibi.classList.add('idle');

    await loadState();
    await renderAll();
    ensureDrumAudio();
    // Público con backend Firestore → tiempo real cross-device (onSnapshot).
    // Admin o backend local → BroadcastChannel (sincroniza pestañas locales).
    if (readOnly && typeof USE_FIRESTORE !== 'undefined' && USE_FIRESTORE && typeof dbSubscribe === 'function') {
      _subscribeSorteoLive();
    } else {
      ensureBC();
    }
  }

  /* ---------------- Bombos UI ---------------- */
  async function addBombo() {
    const name = prompt('Nombre del nuevo bombo:', `Bombo ${String.fromCharCode(65 + state.bombos.length)}`);
    if (!name) return;
    const b = newBombo(name.trim());
    state.bombos.push(b);
    state.activeId = b.id;
    await saveState();
    await renderAll();
  }
  async function renameActiveBombo() {
    const b = activeBombo(); if (!b) return;
    const name = prompt('Nuevo nombre:', b.name);
    if (!name) return;
    b.name = name.trim();
    await saveState();
    await renderBombosBar();
    renderHint();
  }
  async function deleteActiveBombo() {
    const b = activeBombo(); if (!b) return;
    if (state.bombos.length <= 1) { showToastSafe('Debe haber al menos un bombo.', 'error'); return; }
    if (!confirm(`¿Eliminar "${b.name}" y sus equipos?`)) return;
    state.bombos = state.bombos.filter(x => x.id !== b.id);
    state.activeId = state.bombos[0].id;
    await saveState();
    await renderAll();
  }
  async function selectBombo(id) {
    if (busy) return;
    state.activeId = id;
    // En público (readOnly) el cambio es local: no persistir ni emitir, así
    // el admin no se ve forzado a seguir la selección del espectador.
    if (!readOnly) await saveState();
    await refreshActive();
    await renderLinkedPhasesMirror();
  }

  async function renderBombosBar() {
    bombosBar.innerHTML = '';
    state.bombos.forEach(b => {
      const total = b.teamIds.filter(teamIsActive).length;
      const drawnIds = new Set(effectiveDrawnIds(b));
      const drawnVisible = [...drawnIds].filter(teamIsActive).length;
      const remaining = Math.max(0, total - drawnVisible);
      const tab = document.createElement('button');
      tab.className = 'bombo-tab' + (b.id === state.activeId ? ' active' : '');
      tab.dataset.id = b.id;
      tab.innerHTML = `
        <span class="bombo-tab-name">${escapeHtml(b.name)}</span>
        <span class="bombo-tab-count">${remaining}/${total}</span>`;
      tab.addEventListener('click', () => selectBombo(b.id));
      bombosBar.appendChild(tab);
    });
    const b = activeBombo();
    if (b) bomboBadge.textContent = b.name;
  }

  /* ---------------- Animation ---------------- */
  function showFrame(idx) {
    frameEls.forEach((el, i) => el.classList.toggle('show', i === idx));
  }
  function fireSparks() {
    sparkBurst.classList.remove('fire'); void sparkBurst.offsetWidth;
    sparkBurst.classList.add('fire');
  }
  /* Paleta dinámica por equipo: usa team.color (primario), team.color2
     (secundario) más variantes claras + blanco. Misma lógica que los
     fuegos artificiales del campeón en bracket.js. */
  function teamConfettiPalette(teamId) {
    const t = teamsById[teamId];
    const primary   = t?.color  || '#C9A84C';
    const secondary = t?.color2 || t?.color || '#3B82F6';
    const hexToRgb = (hex) => {
      let h = String(hex || '').replace('#','');
      if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
      const n = parseInt(h, 16) || 0;
      return [(n>>16)&255, (n>>8)&255, n&255];
    };
    const toHex = ([r,g,b]) => '#' + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
    const lighten = (rgb, t) => rgb.map(c => Math.round(c + (255-c)*t));
    const A = hexToRgb(primary);
    const B = hexToRgb(secondary);
    return [
      toHex(A), toHex(B),
      toHex(lighten(A, 0.45)), toHex(lighten(B, 0.45)),
      '#ffffff'
    ];
  }
  function fireConfetti(teamId) {
    if (teamId != null) {
      const palette = teamConfettiPalette(teamId);
      const spans = confettiLayer.querySelectorAll('.confetti');
      spans.forEach((s, i) => { s.style.background = palette[i % palette.length]; });
    }
    confettiLayer.classList.remove('fire'); void confettiLayer.offsetWidth;
    confettiLayer.classList.add('fire');
  }
  function shake() {
    chibi.classList.remove('shake'); void chibi.offsetWidth;
    chibi.classList.add('shake');
  }
  function showRevealCard(name, ord, total, bomboName) {
    revealName.textContent = name;
    revealLabel.textContent = `Equipo elegido · ${bomboName}`;
    revealMeta.innerHTML = `Bola <b>#${ord}</b> · quedan <b>${total}</b>`;
    revealCard.classList.remove('out'); revealCard.classList.remove('in');
    void revealCard.offsetWidth;
    revealCard.classList.add('in');
  }
  function hideRevealCard() {
    revealCard.classList.remove('in'); revealCard.classList.add('out');
  }

  /* ---------------- Sorteo flow ---------------- */
  async function drawNext() {
    if (busy || readOnly) return;
    const b = activeBombo();
    if (!b) { flashHint('Crea un bombo primero'); return; }

    const drawnSet = new Set(b.drawn.map(d => d.teamId));
    const pool = b.teamIds.filter(id => teamIsActive(id) && !drawnSet.has(id));
    if (!pool.length) { flashHint('No quedan equipos en este bombo'); return; }

    const teamId = pool[Math.floor(Math.random() * pool.length)];
    const ord = b.drawn.length + 1;
    b.drawn.push({ teamId, at: Date.now() });
    await saveState();
    broadcast({ type:'draw', season: stateSeason, bomboId: b.id, teamId, ord });
    await playDrawAnimation(b, teamId, ord, pool.length - 1);
  }

  async function playDrawAnimation(b, teamId, ord, remaining) {
    busy = true;
    // Flag: durante la animación + 1s post, los renders tratan a este equipo
    // como NO sorteado (chip sigue disponible, sin tachado y sin highlight).
    _drawingTeamId = teamId;
    setControlsBusy(true);
    hideRevealCard();
    chibi.classList.remove('idle');
    // Render plano: ningún equipo de la urna debe resaltarse durante la
    // animación. El chip migra al final tachado recién 1s después.
    await renderPool();
    await renderBombosBar();

    drumHandle = playDrumrollAudio(PRE_REVEAL_MS - 80);

    let i = 0;
    const runStep = () => {
      const step = SEQ[i];
      // Un error en un efecto (p.ej. audio bloqueado en el espectador) NO debe
      // cortar la secuencia: la animación visual debe completarse siempre.
      try {
        showFrame(step.frame);
        if (step.sparks)   fireSparks();
        if (step.shake)    shake();
        if (step.reveal)   showRevealCard(teamName(teamId), ord, remaining, b.name);
        if (step.tada && window.SFX) SFX.playTada();
        if (step.confetti) fireConfetti(teamId);
      } catch(e){ console.warn('[sorteo] paso de animación falló (continúa):', e); }
      i++;
      if (i < SEQ.length) setTimeout(runStep, step.dur);
      else setTimeout(finishSequence, step.dur);
    };
    runStep();
  }

  async function finishSequence() {
    drumHandle = null;
    hideRevealCard();
    setTimeout(async () => {
      showFrame(0);
      chibi.classList.add('idle');
      // 1s extra antes de revelar el chip tachado y reactivar el botón.
      // busy se mantiene true en ese intervalo para evitar doble-click.
      setTimeout(async () => {
        _drawingTeamId = null;
        busy = false;
        await renderAll();
        setControlsBusy(false);
        const b = activeBombo();
        if (b) {
          const drawnSet = new Set(b.drawn.map(d => d.teamId));
          const remaining = b.teamIds.filter(id => teamIsActive(id) && !drawnSet.has(id));
          if (!remaining.length && b.drawn.length) flashHint(`🎉 ${b.name} completo`, true);
        }
        // Público en vivo: si llegó un sorteo durante esta animación, procesarlo ahora.
        if (readOnly && _pendingSnap) {
          const snap = _pendingSnap; _pendingSnap = null;
          onSorteoSnapshot(snap);
        }
      }, 1000);
    }, 280);
  }

  function setControlsBusy(b) {
    const ab = activeBombo();
    let hasPool = false;
    if (ab) {
      const drawnSet = new Set(effectiveDrawnIds(ab));
      hasPool = ab.teamIds.some(id => teamIsActive(id) && !drawnSet.has(id));
    }
    btnSorteo.disabled = b || !hasPool;
    btnReset.disabled  = b || !ab || !ab.drawn.length;
    btnSorteo.textContent = b ? 'Sorteando…' : 'Sortear equipo';
  }

  function flashHint(msg, persist=false) {
    hint.textContent = msg;
    hint.style.color = 'var(--gold)';
    if (!persist) setTimeout(() => { hint.style.color = ''; renderHint(); }, 1800);
  }
  function renderHint() {
    const b = activeBombo();
    if (!b) { hint.textContent = 'Sin bombos'; return; }
    const drawnSet = new Set(effectiveDrawnIds(b));
    const pool = b.teamIds.filter(id => teamIsActive(id) && !drawnSet.has(id));
    if (!pool.length && b.drawn.length) hint.textContent = `${b.name} · sorteado completo`;
    else hint.textContent = pool.length
      ? `${b.name} · ${pool.length} equipo${pool.length===1?'':'s'} en la urna`
      : `${b.name} · añade equipos para empezar`;
  }

  /* ---------------- Reset ---------------- */
  async function resetActive() {
    const b = activeBombo(); if (!b || !b.drawn.length) return;
    if (!confirm(`¿Reiniciar "${b.name}"? Los equipos volverán a la urna.`)) return;
    b.drawn = [];
    await saveState();
    await refreshActive();
  }

  /* ---------------- Team picker modal ---------------- */
  async function openTeamPicker() {
    const b = activeBombo(); if (!b) { showToastSafe('Crea un bombo primero','error'); return; }
    // Regla: un equipo solo puede estar en un bombo a la vez. Ocultamos los
    // que ya están en otros bombos de esta temporada. Se recalcula cada vez
    // que se abre el modal, así editar otro bombo libera/bloquea equipos.
    const inOtherBombos = new Set();
    for (const bb of state.bombos) {
      if (bb.id === b.id) continue;
      for (const tid of bb.teamIds) inOtherBombos.add(tid);
    }
    const teams = (await dbGetAll('teams', t => (t.status || 'ACTIVO') === 'ACTIVO'))
      .filter(t => !inOtherBombos.has(t.id))
      .sort((a, c) => a.name.localeCompare(c.name, 'es'));
    // selected se filtra también: si por datos legacy hubiera un teamId
    // duplicado entre bombos, al guardar quedará limpio.
    const selected = new Set(b.teamIds.filter(id => !inOtherBombos.has(id)));

    const wrap = document.createElement('div');
    wrap.className = 'modal-overlay open';
    wrap.id = 'sorteo-team-picker';
    wrap.innerHTML = `
      <div class="modal" style="max-width:540px;">
        <div class="modal-hdr">
          <div class="modal-title">Equipos en ${escapeHtml(b.name)}</div>
          <button class="modal-close" onclick="document.getElementById('sorteo-team-picker').remove()">×</button>
        </div>
        <div class="modal-body">
          <div style="display:flex;gap:8px;margin-bottom:10px;align-items:center;">
            <input id="stp-search" placeholder="Buscar equipo…"
              style="flex:1;padding:6px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:14px;">
            <button class="btn btn-sm" id="stp-all">Todos</button>
            <button class="btn btn-sm" id="stp-none">Ninguno</button>
          </div>
          <div id="stp-list" style="max-height:50vh;overflow:auto;border:1px solid var(--brd);border-radius:var(--r);background:var(--card2);"></div>
          <div id="stp-count" style="margin-top:8px;font-size:13px;color:var(--txt3);"></div>
        </div>
        <div class="modal-footer">
          <button class="btn" onclick="document.getElementById('sorteo-team-picker').remove()">Cancelar</button>
          <button class="btn btn-primary" id="stp-save">Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    const listEl   = wrap.querySelector('#stp-list');
    const countEl  = wrap.querySelector('#stp-count');
    const searchEl = wrap.querySelector('#stp-search');

    function renderList(filter='') {
      const f = filter.trim().toLowerCase();
      const filtered = teams.filter(t => !f || t.name.toLowerCase().includes(f));
      listEl.innerHTML = filtered.map(t => {
        const checked = selected.has(t.id) ? 'checked' : '';
        const ini = (t.ini || t.name.substring(0,3));
        const col = t.color || '#333';
        const logo = t.logo
          ? `<img src="${t.logo}" style="width:100%;height:100%;object-fit:cover;">`
          : `<span style="font-family:'Bebas Neue';font-size:11px;color:#fff;">${escapeHtml(ini)}</span>`;
        return `
          <label class="stp-row" data-id="${t.id}" style="display:flex;align-items:center;gap:10px;padding:6px 10px;border-bottom:1px solid var(--brd);cursor:pointer;">
            <input type="checkbox" data-id="${t.id}" ${checked}>
            <div style="width:26px;height:26px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:${col};flex-shrink:0;">${logo}</div>
            <span style="flex:1;font-size:14px;">${escapeHtml(t.name)}</span>
            ${t.pres ? `<span style="font-size:12px;color:var(--txt3);">${escapeHtml(t.pres)}</span>` : ''}
          </label>`;
      }).join('') || `<div style="padding:14px;color:var(--txt3);text-align:center;">Sin resultados</div>`;
      countEl.textContent = `${selected.size} de ${teams.length} seleccionados`;
    }
    renderList();

    listEl.addEventListener('change', (e) => {
      const cb = e.target.closest('input[type="checkbox"]'); if (!cb) return;
      const id = parseInt(cb.dataset.id);
      if (cb.checked) selected.add(id); else selected.delete(id);
      countEl.textContent = `${selected.size} de ${teams.length} seleccionados`;
    });
    searchEl.addEventListener('input', () => renderList(searchEl.value));
    wrap.querySelector('#stp-all').addEventListener('click', () => {
      teams.forEach(t => selected.add(t.id)); renderList(searchEl.value);
    });
    wrap.querySelector('#stp-none').addEventListener('click', () => {
      selected.clear(); renderList(searchEl.value);
    });

    wrap.querySelector('#stp-save').addEventListener('click', async () => {
      // Conserva orden previo y agrega los nuevos al final.
      const prev = b.teamIds.filter(id => selected.has(id));
      const added = [...selected].filter(id => !b.teamIds.includes(id));
      b.teamIds = [...prev, ...added];
      // Si removimos un team que estaba en drawn, sacarlo del histórico.
      b.drawn = b.drawn.filter(d => selected.has(d.teamId));
      await saveState();
      wrap.remove();
      await refreshActive();
      showToastSafe(`${b.name} actualizado · ${selected.size} equipos`);
    });
  }

  /* ---------------- Sound toggle ---------------- */
  function toggleSound() {
    if (!window.SFX) return;
    SFX.setEnabled(!SFX.enabled);
    btnSound.classList.toggle('off', !SFX.enabled);
    btnSound.title = SFX.enabled ? 'Sonido activado' : 'Sonido silenciado';
    btnSound.textContent = SFX.enabled ? '🔊' : '🔇';
  }

  /* ---------------- Render ---------------- */
  async function renderAll() {
    await refreshTeamsCache();
    await renderBombosBar();
    await refreshActive();
    await renderLinkedPhasesMirror();
  }
  async function refreshActive() {
    await refreshTeamsCache();
    await renderPool();
    renderDrawn();
    renderHint();
    setControlsBusy(false);
    await renderBombosBar();
    await renderLinkedPhasesMirror();
  }

  /* Mirror: muestra debajo del sorteo los grupos/brackets vinculados desde
     CUALQUIER bola sorteada en la temporada actual. Solo las tablas/llaves;
     no incluye partidos ni fechas (esa data vive en la página Partidos). */
  async function renderLinkedPhasesMirror() {
    const mirror = root?.querySelector('#sorteo-phases-mirror');
    if (!mirror) return;

    // Conjunto único de phaseIds linkeados desde cualquier bola.
    const phaseIds = new Set();
    for (const bb of state.bombos) {
      for (const d of (bb.drawn || [])) {
        if (d.link?.phaseId) phaseIds.add(d.link.phaseId);
      }
    }
    if (!phaseIds.size) {
      mirror.innerHTML = '';
      return;
    }

    // Cargar fases en lote y filtrar a las que existen en esta temporada.
    const phases = [];
    for (const pid of phaseIds) {
      const p = await dbGet('phases', pid);
      if (!p) continue;
      // Solo competiciones de la temporada cargada.
      const comp = await dbGet('competitions', p.compId);
      if (!comp || comp.season !== stateSeason) continue;
      phases.push({ phase: p, comp });
    }
    phases.sort((a, b) =>
      (a.comp.name || '').localeCompare(b.comp.name || '', 'es') ||
      (a.phase.name || '').localeCompare(b.phase.name || '', 'es')
    );

    if (!phases.length) { mirror.innerHTML = ''; return; }

    // Render skeleton: una tarjeta por fase, con su propio container interno.
    mirror.innerHTML = `
      <div class="mirror-hdr">Vinculaciones en curso</div>
      <div class="mirror-grid">
        ${phases.map(({ phase, comp }) => {
          const cls = phase.type === 'bracket' ? 'mirror-card bracket' : 'mirror-card groups';
          const containerId = phase.type === 'bracket'
            ? `bracket-container-${phase.id}`
            : `groups-container-${phase.id}`;
          return `<div class="${cls}">
            <div class="mirror-card-hdr">
              <span class="mirror-comp">${escapeHtml(comp.name)}</span>
              <span class="mirror-sep">·</span>
              <span class="mirror-phase">${escapeHtml(phase.name || ('Fase '+phase.id))}</span>
              <span class="mirror-type ${phase.type}">${phase.type === 'bracket' ? 'Bracket' : 'Grupos'}</span>
            </div>
            <div class="mirror-card-body" id="${containerId}"></div>
          </div>`;
        }).join('')}
      </div>`;

    // Disparar el render real de cada fase usando las funciones existentes.
    // isAdmin=false para que no expongan controles editables en el mirror.
    for (const { phase } of phases) {
      try {
        if (phase.type === 'bracket' && typeof renderBracket === 'function') {
          await renderBracket(phase.id, `bracket-container-${phase.id}`, false);
        } else if (phase.type === 'groups' && typeof renderGroupTable === 'function') {
          await renderGroupTable(phase.id, `groups-container-${phase.id}`, false);
        }
      } catch (e) {
        console.warn('mirror render failed for phase', phase.id, e);
      }
    }
  }
  async function renderPool(opts = {}) {
    const { highlightId } = opts;
    const b = activeBombo();
    poolEls.innerHTML = '';
    const visibleIds = b ? b.teamIds.filter(teamIsActive) : [];
    const drawnSet = b ? new Set(effectiveDrawnIds(b)) : new Set();
    const total = visibleIds.length;
    const remaining = visibleIds.filter(id => !drawnSet.has(id)).length;
    poolCounter.querySelector('.num').textContent = remaining;
    poolCounter.querySelector('.total').textContent = '/ ' + total;
    if (!b) return;
    // Disponibles primero (no sorteados), luego ya sorteados al final.
    // Mientras hay una bola en animación, ese equipo se considera "no sorteado"
    // para que su chip no aparezca tachado hasta 1s después del confeti.
    const effective = new Set(effectiveDrawnIds(b));
    const notDrawn = visibleIds.filter(id => !effective.has(id));
    const alreadyDrawn = visibleIds.filter(id => effective.has(id));
    notDrawn.forEach(id => {
      const c = document.createElement('span');
      c.className = 'chip' + (highlightId === id ? ' now' : '');
      // Sin punto dorado para no contaminar la lectura de los disponibles.
      c.innerHTML = escapeHtml(teamName(id));
      poolEls.appendChild(c);
    });
    alreadyDrawn.forEach(id => {
      const c = document.createElement('span');
      const isHighlight = highlightId === id;
      c.className = 'chip drawn' + (isHighlight ? ' now' : '');
      c.innerHTML = escapeHtml(teamName(id));
      poolEls.appendChild(c);
    });
  }
  function renderDrawn() {
    const b = activeBombo();
    // Indexa cada entrada con su índice global en b.drawn para callbacks.
    const indexed = b
      ? b.drawn.map((d, i) => ({ d, i })).filter(x => teamIsActive(x.d.teamId))
      : [];
    drawnHdrCount.textContent = indexed.length;
    if (!b || !indexed.length) {
      drawnEl.innerHTML = '<div class="drawn-empty">Sin sorteos aún</div>';
      return;
    }
    drawnEl.innerHTML = '';
    indexed.forEach(({ d, i: globalIdx }, displayIdx) => {
      const li = document.createElement('li');
      li.className = 'drawn-row';
      const t = new Date(d.at);
      const hh = String(t.getHours()).padStart(2,'0');
      const mm = String(t.getMinutes()).padStart(2,'0');
      const linkBadge = d.link
        ? `<span class="drawn-link">${renderLinkBadgeText(d.link)}</span>`
        : '';
      const btn = readOnly ? '' : `<button class="drawn-link-btn" data-gidx="${globalIdx}">${d.link ? 'Cambiar' : 'Vincular'}</button>`;
      li.innerHTML = `
        <span class="num">${displayIdx+1}</span>
        <span class="name">${escapeHtml(teamName(d.teamId))}</span>
        <span class="time">${hh}:${mm}</span>
        ${linkBadge}
        ${btn}`;
      drawnEl.appendChild(li);
    });
    if (!readOnly) {
      drawnEl.querySelectorAll('.drawn-link-btn').forEach(btn => {
        btn.addEventListener('click', () => openLinkPicker(parseInt(btn.dataset.gidx)));
      });
    }
  }

  function renderLinkBadgeText(link) {
    if (!link) return '';
    if (link.kind === 'group') return `→ Grupo ${String.fromCharCode(65 + link.groupIdx)} · pos ${link.posIdx + 1}`;
    if (link.kind === 'bracket') return `→ Llave ${link.slotIdx + 1} · lado ${link.side}`;
    return '→ vinculado';
  }

  /* ---------------- Link picker (vincular bola a fase) ----------------
     Auto-save al click. Sorteo es autoridad: si el equipo ya está en otra
     posición de la fase, se libera; si la posición destino estaba ocupada,
     se desplaza al ocupante (queda sin asignar). Capacidad por grupo
     definida por phase.config.groupSizes / teamsPerGroup. */
  async function openLinkPicker(drawnGlobalIdx) {
    if (readOnly) return;
    const b = activeBombo(); if (!b) return;
    const entry = b.drawn[drawnGlobalIdx]; if (!entry) return;
    const teamId = entry.teamId;

    const comps = await dbGetAll('competitions', c => c.season === stateSeason);

    // Prioridad de selección inicial:
    //   1) si la bola tiene link, ir a esa comp/fase
    //   2) sino, usar la última que el admin tuvo abierta
    //   3) sino, primera comp de la lista
    let selCompId, selPhaseId;
    if (entry.link) {
      selPhaseId = entry.link.phaseId;
      selCompId  = (await dbGet('phases', entry.link.phaseId))?.compId;
    } else if (_pickerLastPhaseId && comps.find(c => c.id === _pickerLastCompId)) {
      selCompId  = _pickerLastCompId;
      selPhaseId = _pickerLastPhaseId;
    } else {
      selCompId  = comps[0]?.id;
      selPhaseId = null;
    }

    // Snapshot al abrir el modal para "Deshacer cambios". Copia profunda
    // de todas las fases y de todos los registros sorteo: cubre cualquier
    // cosa que se modifique durante la sesión del modal (incluso si se
    // cambia entre múltiples fases).
    const undoSnapshot = {
      phases:  JSON.parse(JSON.stringify(await dbGetAll('phases'))),
      sorteos: JSON.parse(JSON.stringify(await dbGetAll('sorteo')))
    };

    document.getElementById('sorteo-link-picker')?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'modal-overlay open';
    wrap.id = 'sorteo-link-picker';
    wrap.innerHTML = `
      <div class="modal" style="max-width:780px;">
        <div class="modal-hdr">
          <div class="modal-title">Vincular: <span style="color:var(--gold);">${escapeHtml(teamName(teamId))}</span></div>
          <button class="modal-close" onclick="document.getElementById('sorteo-link-picker').remove()">×</button>
        </div>
        <div class="modal-body">
          <div style="display:flex;gap:12px;margin-bottom:14px;">
            <div style="flex:1;">
              <label style="display:block;font-size:11px;color:var(--txt3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Competición</label>
              <select id="slp-comp" style="width:100%;padding:6px 8px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:14px;"></select>
            </div>
            <div style="flex:1;">
              <label style="display:block;font-size:11px;color:var(--txt3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Fase</label>
              <select id="slp-phase" style="width:100%;padding:6px 8px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:14px;"></select>
            </div>
          </div>
          <div id="slp-grid" style="min-height:200px;"></div>
        </div>
        <div class="modal-footer" style="justify-content:space-between;">
          <div style="display:flex;gap:8px;">
            <button class="btn" id="slp-undo" title="Restaurar al estado al abrir el modal">↺ Deshacer cambios</button>
            <button class="btn btn-danger" id="slp-clear">Limpiar vínculo</button>
          </div>
          <button class="btn" onclick="document.getElementById('sorteo-link-picker').remove()">Cerrar</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    const compSel  = wrap.querySelector('#slp-comp');
    const phaseSel = wrap.querySelector('#slp-phase');
    const gridEl   = wrap.querySelector('#slp-grid');

    compSel.innerHTML = comps.length
      ? comps.map(c => `<option value="${c.id}" ${c.id===selCompId?'selected':''}>${escapeHtml(c.name)}</option>`).join('')
      : '<option value="">Sin competiciones en la temporada</option>';

    async function refreshPhases() {
      const cid = parseInt(compSel.value);
      const phases = await dbGetAll('phases', p => p.compId === cid && (p.type === 'groups' || p.type === 'bracket'));
      phaseSel.innerHTML = phases.length
        ? phases.map(p => {
            const tag = p.type === 'bracket' ? '◉' : '◈';
            return `<option value="${p.id}" ${p.id===selPhaseId?'selected':''}>${tag} ${escapeHtml(p.name || ('Fase '+p.id))}</option>`;
          }).join('')
        : '<option value="">Sin fases tipo grupos / bracket</option>';
      if (!phases.find(p => p.id === selPhaseId)) selPhaseId = phases[0]?.id || null;
      if (selPhaseId) phaseSel.value = selPhaseId;
      _pickerLastPhaseId = selPhaseId;
      _pickerLastCompId  = parseInt(compSel.value) || _pickerLastCompId;
      await refreshGrid();
    }

    async function refreshGrid() {
      selPhaseId = parseInt(phaseSel.value) || null;
      if (!selPhaseId) {
        gridEl.innerHTML = '<div style="padding:24px;color:var(--txt3);text-align:center;">No hay fases vinculables en esta competición.</div>';
        return;
      }
      const phase = await dbGet('phases', selPhaseId);
      if (!phase) {
        gridEl.innerHTML = '<div style="padding:24px;color:var(--txt3);text-align:center;">Fase no encontrada.</div>';
        return;
      }
      if (phase.type === 'bracket') {
        const totalTeams = parseInt(phase.config?.teams) || 0;
        const rounds = (totalTeams > 0 && typeof buildBracketRounds === 'function')
          ? buildBracketRounds(totalTeams) : null;
        const matchCount = rounds?.[0]?.matches || 0;
        if (!matchCount) {
          gridEl.innerHTML = '<div style="padding:24px;color:var(--txt3);text-align:center;">Bracket sin tamaño configurado.</div>';
          return;
        }
        const refs = phase.slotRefs || [];
        const findRef = (si, sd) => refs.find(r => r.slotIdx === si && r.side === sd);
        // Resuelve cada slot a {teamId, type} para mostrar quién ocupa
        const slotCells = [];
        for (let si = 0; si < matchCount; si++) {
          for (const sd of ['A','B']) {
            const r = findRef(si, sd);
            let tid = null, kind = null;
            if (r) {
              kind = r.type;
              if (r.type === 'team') tid = parseInt(r.teamId);
              else tid = await resolveSlotRef(r);
            }
            slotCells.push({ si, sd, tid, kind, ref:r });
          }
        }
        gridEl.innerHTML = `<div style="font-size:11px;color:var(--txt3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
          ${rounds[0].name} · ${totalTeams} equipos · ${matchCount} llaves
        </div>
        <div class="slp-bracket">
          ${Array.from({length:matchCount},(_,si)=>{
            const cellA = slotCells.find(c=>c.si===si && c.sd==='A');
            const cellB = slotCells.find(c=>c.si===si && c.sd==='B');
            const cellHtml = (cell) => {
              const t = cell.tid;
              if (t != null) {
                const mine = t === teamId;
                const labelExtra = cell.kind === 'team'
                  ? (mine ? '' : '<span class="slp-tag-soft">sorteo</span>')
                  : '<span class="slp-tag-warn">ref dinámica</span>';
                return `<div class="slp-bslot ${mine?'mine':'taken'}" data-si="${cell.si}" data-sd="${cell.sd}">
                  <span class="slp-side">${cell.sd}</span>
                  <span class="slp-name">${escapeHtml(teamName(t))}</span>
                  ${mine ? '<span class="slp-tag">aquí</span>' : labelExtra}
                </div>`;
              }
              return `<div class="slp-bslot empty" data-si="${cell.si}" data-sd="${cell.sd}">
                <span class="slp-side">${cell.sd}</span>
                <span class="slp-hint">click para asignar</span>
              </div>`;
            };
            return `<div class="slp-bmatch">
              <div class="slp-bmatch-hdr">Llave ${si+1}</div>
              ${cellHtml(cellA)}
              ${cellHtml(cellB)}
            </div>`;
          }).join('')}
        </div>`;
        gridEl.querySelectorAll('.slp-bslot').forEach(el => {
          if (el.classList.contains('mine')) return;
          el.addEventListener('click', async () => {
            const si = parseInt(el.dataset.si);
            const sd = el.dataset.sd;
            await assignBracketLink(drawnGlobalIdx, selPhaseId, si, sd);
            await refreshGrid();
          });
        });
        return;
      }
      if (phase.type !== 'groups') {
        gridEl.innerHTML = '<div style="padding:24px;color:var(--txt3);text-align:center;">Tipo de fase no soportado en sorteo.</div>';
        return;
      }
      const cfg = phase.config || {};
      const ngroups = cfg.ngroups || Object.keys(phase.groups || {}).length || 2;
      const fallback = parseInt(cfg.teamsPerGroup) || 0;
      const sizes = Array.isArray(cfg.groupSizes) && cfg.groupSizes.length
        ? cfg.groupSizes
        : Array(ngroups).fill(fallback);
      const groups = phase.groups || {};

      gridEl.innerHTML = `<div class="slp-grid">
        ${Array.from({length:ngroups},(_,gi)=>{
          const cap = parseInt(sizes[gi]) || 0;
          const arr = groups[gi] || [];
          const occupied = arr.filter(t=>t!=null).length;
          const slotsHtml = [];
          for (let pos=0; pos<cap; pos++) {
            const t = arr[pos];
            if (t != null) {
              const mine = t === teamId;
              slotsHtml.push(`<div class="slp-slot ${mine?'mine':'taken'}" data-group="${gi}" data-pos="${pos}">
                <span class="slp-pos">${pos+1}</span>
                <span class="slp-name">${escapeHtml(teamName(t))}</span>
                ${mine?'<span class="slp-tag">aquí</span>':''}
              </div>`);
            } else {
              slotsHtml.push(`<div class="slp-slot empty" data-group="${gi}" data-pos="${pos}">
                <span class="slp-pos">${pos+1}</span>
                <span class="slp-hint">click para asignar</span>
              </div>`);
            }
          }
          if (cap === 0) {
            slotsHtml.push('<div class="slp-warn">Capacidad no configurada en la fase</div>');
          }
          return `<div class="slp-group">
            <div class="slp-group-hdr">Grupo ${String.fromCharCode(65+gi)} <span class="slp-cap">${occupied}/${cap||'∞'}</span></div>
            <div class="slp-slots">${slotsHtml.join('')}</div>
          </div>`;
        }).join('')}
      </div>`;

      gridEl.querySelectorAll('.slp-slot').forEach(el => {
        el.addEventListener('click', async () => {
          const gi = parseInt(el.dataset.group);
          const po = parseInt(el.dataset.pos);
          await assignLink(drawnGlobalIdx, selPhaseId, gi, po);
          await refreshGrid();
        });
      });
    }

    compSel.addEventListener('change', () => {
      _pickerLastCompId = parseInt(compSel.value) || null;
      refreshPhases();
    });
    phaseSel.addEventListener('change', () => {
      _pickerLastPhaseId = parseInt(phaseSel.value) || null;
      refreshGrid();
    });
    wrap.querySelector('#slp-clear').addEventListener('click', async () => {
      await clearLink(drawnGlobalIdx);
      await refreshGrid();
    });
    wrap.querySelector('#slp-undo').addEventListener('click', async () => {
      // Restaurar todas las fases tocadas (escribimos todas; las no tocadas
      // simplemente se sobrescriben con su mismo contenido).
      for (const p of undoSnapshot.phases) {
        await dbPut('phases', p);
        if (typeof invalidateStandingsCache === 'function') invalidateStandingsCache(p.id);
      }
      // Restaurar registros sorteo (incluye links de todas las bolas).
      for (const s of undoSnapshot.sorteos) {
        await dbPut('sorteo', s);
      }
      // Recargar estado en memoria y refrescar UI + broadcast a otras pestañas.
      await loadState();
      broadcast({ type:'state', season: stateSeason });
      await refreshActive();
      await refreshGrid();
      showToastSafe('Cambios deshechos');
    });

    await refreshPhases();
  }

  async function assignLink(drawnGlobalIdx, phaseId, groupIdx, posIdx) {
    if (readOnly) return;
    const b = activeBombo(); if (!b) return;
    const entry = b.drawn[drawnGlobalIdx]; if (!entry) return;
    const teamId = entry.teamId;

    // 1. Liberar vínculo previo (si existía y apuntaba a otra fase/posición).
    if (entry.link) await unbindFromPhase(entry.link, teamId);

    // 2. Cargar fase y normalizar groups.
    const phase = await dbGet('phases', phaseId);
    if (!phase) return;
    const groups = phase.groups ? JSON.parse(JSON.stringify(phase.groups)) : {};

    // 3. Si el equipo está en otra posición de esta misma fase, lo quitamos.
    Object.keys(groups).forEach(gi => {
      const arr = groups[gi] || [];
      for (let j = 0; j < arr.length; j++) if (arr[j] === teamId) arr[j] = null;
      groups[gi] = arr;
    });

    // 4. Asegurar capacidad en el grupo destino y guardar la posición.
    if (!groups[groupIdx]) groups[groupIdx] = [];
    while (groups[groupIdx].length <= posIdx) groups[groupIdx].push(null);
    const prevOccupant = groups[groupIdx][posIdx];
    groups[groupIdx][posIdx] = teamId;

    await dbPut('phases', { ...phase, groups });
    if (typeof invalidateStandingsCache === 'function') invalidateStandingsCache(phaseId);

    // 5. Invalidar links stale en TODOS los bombos:
    //    a) cualquier link que apuntara a esta posición destino (lo perdió el ocupante anterior)
    //    b) cualquier link del mismo teamId en otra posición de esta fase
    for (const bb of state.bombos) {
      for (const d of bb.drawn) {
        if (!d.link || d.link.phaseId !== phaseId) continue;
        if (d.link.groupIdx === groupIdx && d.link.posIdx === posIdx && d.teamId !== teamId) d.link = null;
        else if (d.teamId === teamId && !(d.link.groupIdx === groupIdx && d.link.posIdx === posIdx)) d.link = null;
      }
    }

    // 6. Persistir el link en el sorteo y refrescar.
    entry.link = { phaseId, kind:'group', groupIdx, posIdx };
    await saveState();
    await refreshActive();

    const groupLetter = String.fromCharCode(65 + groupIdx);
    if (prevOccupant != null && prevOccupant !== teamId) {
      showToastSafe(`${teamName(teamId)} → Grupo ${groupLetter} pos ${posIdx+1} · desplazado ${teamName(prevOccupant)}`);
    } else {
      showToastSafe(`${teamName(teamId)} → Grupo ${groupLetter} pos ${posIdx+1}`);
    }
  }

  async function clearLink(drawnGlobalIdx) {
    if (readOnly) return;
    const b = activeBombo(); if (!b) return;
    const entry = b.drawn[drawnGlobalIdx]; if (!entry?.link) return;
    await unbindFromPhase(entry.link, entry.teamId);
    entry.link = null;
    await saveState();
    await refreshActive();
    showToastSafe(`${teamName(entry.teamId)} desvinculado`);
  }

  async function unbindFromPhase(link, teamId) {
    if (!link) return;
    const phase = await dbGet('phases', link.phaseId);
    if (!phase) return;
    if (link.kind === 'group') {
      const groups = phase.groups ? JSON.parse(JSON.stringify(phase.groups)) : {};
      const arr = groups[link.groupIdx] || [];
      if (arr[link.posIdx] === teamId) {
        arr[link.posIdx] = null;
        groups[link.groupIdx] = arr;
        await dbPut('phases', { ...phase, groups });
        if (typeof invalidateStandingsCache === 'function') invalidateStandingsCache(link.phaseId);
      }
    } else if (link.kind === 'bracket') {
      const refs = (phase.slotRefs || []).filter(r => {
        const match = r.slotIdx === link.slotIdx && r.side === link.side;
        if (!match) return true;
        // Solo retira refs tipo 'team' del mismo equipo (no toca refs dinámicas heredadas).
        return !(r.type === 'team' && parseInt(r.teamId) === teamId);
      });
      await dbPut('phases', { ...phase, slotRefs: refs });
      if (typeof invalidateStandingsCache === 'function') invalidateStandingsCache(link.phaseId);
    }
  }

  /* Asignar bola a slot (lado A/B) de un bracket. Sorteo es autoridad:
     reemplaza cualquier ref previa en ese slot (incluyendo refs dinámicas). */
  async function assignBracketLink(drawnGlobalIdx, phaseId, slotIdx, side) {
    if (readOnly) return;
    const b = activeBombo(); if (!b) return;
    const entry = b.drawn[drawnGlobalIdx]; if (!entry) return;
    const teamId = entry.teamId;

    // 1. Liberar vínculo previo de esta bola.
    if (entry.link) await unbindFromPhase(entry.link, teamId);

    // 2. Cargar fase y trabajar sobre slotRefs.
    const phase = await dbGet('phases', phaseId);
    if (!phase) return;
    let refs = (phase.slotRefs || []).slice();

    // 3. Si el mismo equipo ya estaba en otro slot 'team' de esta fase, sacarlo.
    refs = refs.filter(r => !(r.type === 'team' && parseInt(r.teamId) === teamId));

    // 4. Detectar ocupante anterior en el slot destino (para toast + invalidar links).
    const prevRef = (phase.slotRefs || []).find(r => r.slotIdx === slotIdx && r.side === side);
    let displacedTeamId = null;
    if (prevRef) {
      if (prevRef.type === 'team') displacedTeamId = parseInt(prevRef.teamId);
      // refs no-'team' simplemente se eliminan: sorteo manda
      refs = refs.filter(r => !(r.slotIdx === slotIdx && r.side === side));
    }

    // 5. Insertar nuestra ref.
    refs.push({ type:'team', slotIdx, side, teamId });

    await dbPut('phases', { ...phase, slotRefs: refs });
    if (typeof invalidateStandingsCache === 'function') invalidateStandingsCache(phaseId);

    // 6. Invalidar links stale en TODOS los bombos.
    for (const bb of state.bombos) {
      for (const d of bb.drawn) {
        if (!d.link || d.link.phaseId !== phaseId || d.link.kind !== 'bracket') continue;
        // a) link apuntando al destino (lo perdió el desplazado)
        if (d.link.slotIdx === slotIdx && d.link.side === side && d.teamId !== teamId) d.link = null;
        // b) link previo del mismo teamId en otro slot
        else if (d.teamId === teamId && !(d.link.slotIdx === slotIdx && d.link.side === side)) d.link = null;
      }
    }

    entry.link = { phaseId, kind:'bracket', slotIdx, side };
    await saveState();
    await refreshActive();

    if (displacedTeamId != null && displacedTeamId !== teamId) {
      showToastSafe(`${teamName(teamId)} → Llave ${slotIdx+1} lado ${side} · desplazado ${teamName(displacedTeamId)}`);
    } else if (prevRef && prevRef.type !== 'team') {
      showToastSafe(`${teamName(teamId)} → Llave ${slotIdx+1} lado ${side} · reemplazó ref dinámica`);
    } else {
      showToastSafe(`${teamName(teamId)} → Llave ${slotIdx+1} lado ${side}`);
    }
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }
  function showToastSafe(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type);
  }

  /* ---------------- Template ---------------- */
  const framesHtml = FRAMES.map((f, i) =>
    `<img class="chibi-frame${i===0?' show':''}" src="${FRAME_BASE}${f}" alt="">`
  ).join('');

  const TEMPLATE = `
    <div class="sorteo-grid">
      <section class="sorteo-stage">
        <div class="stage-strip">
          <div class="stage-title">
            <span class="pip"></span>Sorteo en directo
            <span id="bombo-badge" class="bombo-badge">—</span>
          </div>
          <div class="stage-strip-right">
            <div class="stage-counter" id="pool-counter">
              <span class="num">0</span><span class="total">/ 0</span>
              <span class="lbl">en la urna</span>
            </div>
            <button id="btn-sound" class="icon-mini" title="Sonido">🔊</button>
          </div>
        </div>

        <div class="stage-body">
          <div class="confetti-layer"></div>
          <div class="stage-floor"></div>
          <div class="chibi-anchor idle">
            ${framesHtml}
            <div class="spark-burst"></div>
          </div>

          <div class="reveal-card" aria-live="polite">
            <div class="reveal-label">Equipo elegido</div>
            <div class="reveal-name">—</div>
            <div class="reveal-meta">—</div>
          </div>
        </div>

        <div class="stage-actions">
          <button class="btn-ghost" id="btn-sorteo-reset">↺ Reiniciar bombo</button>
          <button class="btn-sorteo" id="btn-sorteo">Sortear equipo</button>
        </div>
        <div class="stage-hint">Listo</div>
      </section>

      <aside class="sorteo-side">
        <div class="side-card bombos-card">
          <div class="side-hdr">
            <h3>Bombos</h3>
            <div class="bombos-actions">
              <button class="icon-mini" id="btn-rename-bombo" title="Renombrar bombo activo">✎</button>
              <button class="icon-mini" id="btn-delete-bombo" title="Eliminar bombo activo">✕</button>
              <button class="icon-mini primary" id="btn-add-bombo" title="Añadir bombo">＋</button>
            </div>
          </div>
          <div class="bombos-bar" id="bombos-bar"></div>
        </div>

        <div class="side-card">
          <div class="side-hdr">
            <h3>Urna</h3>
            <span class="pill live">EN VIVO</span>
          </div>
          <div class="side-body">
            <div class="team-chips" id="team-chips"></div>
          </div>
          <div class="side-foot">
            <button class="btn btn-primary" id="btn-edit-teams" style="width:100%;">Editar equipos del bombo…</button>
          </div>
        </div>

        <div class="side-card">
          <div class="side-hdr">
            <h3>Resultado</h3>
            <span class="pill"><span id="drawn-count">0</span> sacados</span>
          </div>
          <div class="side-body">
            <ol class="drawn-list" id="drawn-list"></ol>
          </div>
        </div>
      </aside>
    </div>

    <!-- Mirror de fases vinculadas por el sorteo (grupos/brackets en construcción) -->
    <div id="sorteo-phases-mirror" class="sorteo-mirror"></div>
  `;

  /* ---------------- Public API ---------------- */
  window.SORTEO = {
    /** Monta el módulo en el contenedor dado. Si ya está montado en el mismo
     *  contenedor con el mismo modo, sólo refresca. Si cambia, remonta. */
    async init(selector = '#sorteo-content', opts = {}) {
      const sel = typeof selector === 'string' ? selector : null;
      const el  = typeof selector === 'string' ? document.querySelector(selector) : selector;
      if (!el) return;
      const wantReadOnly = !!opts.readOnly;
      if (mountedSelector === sel && readOnly === wantReadOnly && root === el) {
        await this.refresh();
        return;
      }
      // Limpia el contenedor anterior para evitar IDs duplicados en el DOM
      // (admin y público comparten template).
      if (mountedSelector && mountedSelector !== sel) {
        const prev = document.querySelector(mountedSelector);
        if (prev) prev.innerHTML = '';
      }
      readOnly = wantReadOnly;
      mountedSelector = sel;
      await mount(el);
    },
    /** Recarga estado desde IDB y refresca render. */
    async refresh() {
      if (!root) return;
      await loadState();
      await renderAll();
    },
    /** Helper para la pestaña pública: ¿hay contenido sorteable en la
     *  temporada dada? (algún bombo con al menos un equipo). */
    async hasContentForSeason(season) {
      const recs = await dbGetAll('sorteo', r => r.season === season);
      if (!recs.length) return false;
      return (recs[0].bombos || []).some(b => (b.teamIds || []).length > 0);
    },
    getBombos() { return JSON.parse(JSON.stringify(state.bombos)); },
    getActive() { return JSON.parse(JSON.stringify(activeBombo())); },
    async reset() { if (!readOnly) await resetActive(); }
  };
})();
