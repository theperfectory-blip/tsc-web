/* ============================================================
   SORTEO — Animación chibi + bombos + sonido
   Pública: SORTEO.init(selector)
   ============================================================ */
(function () {
  const STORAGE_KEY = 'tsc.sorteo.v2';
  const OLD_KEY     = 'tsc.sorteo.v1';
  const FRAME_BASE  = 'assets/chibi/';
  const FRAMES = [
    '01_idle.png','02_reach.png','03_grab.png','04_hold.png',
    '05_show.png','06_crack.png','07_open.png','08_celebrate.png'
  ];

  // Frame, ms hasta el siguiente, y eventos.
  // Reveal en OPEN (frame 6). Drum roll cubre desde clic hasta reveal.
  const SEQ = [
    { frame: 1, dur: 280 },
    { frame: 2, dur: 480 },
    { frame: 3, dur: 360 },
    { frame: 4, dur: 320 },
    { frame: 5, dur: 520, sparks: true, shake: true },
    { frame: 6, dur: 700, reveal: true, tada: true },
    { frame: 7, dur: 1700, confetti: true }
  ];
  const PRE_REVEAL_MS = 280 + 480 + 360 + 320 + 520; // ≈ 1960ms

  /* ---------------- State ---------------- */
  function newBombo(name = 'Bombo', teams = []) {
    return {
      id: 'b_' + Math.random().toString(36).slice(2, 9),
      name, teams: teams.slice(), drawn: []
    };
  }
  const DEFAULT_STATE = () => ({
    bombos: [
      newBombo('Bombo A', ['Wolves FC','Atlas United','Neon Strikers','Ronin City','Iron Lions','Skyline 11']),
      newBombo('Bombo B', ['Fenix XI','Black Panthers','Dragons SC','Shadow Wolves','Aurora United','Nova Real'])
    ],
    activeId: null
  });

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const v = JSON.parse(raw);
        if (v && Array.isArray(v.bombos) && v.bombos.length) return v;
      }
      // Migración v1 → v2
      const oldRaw = localStorage.getItem(OLD_KEY);
      if (oldRaw) {
        const old = JSON.parse(oldRaw);
        if (old && Array.isArray(old.teams)) {
          const b = newBombo('Bombo A', old.teams);
          if (Array.isArray(old.drawn)) b.drawn = old.drawn;
          return { bombos: [b], activeId: b.id };
        }
      }
    } catch(e){}
    return null;
  }
  function saveState(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch(e){}
  }

  let state = loadState() || DEFAULT_STATE();
  if (!state.activeId || !state.bombos.find(b => b.id === state.activeId)) {
    state.activeId = state.bombos[0]?.id || null;
  }

  /* ---------------- DOM refs ---------------- */
  let root, chibi, frameEls, revealCard, revealName, revealLabel, revealMeta,
      sparkBurst, confettiLayer, btnSorteo, btnReset, hint,
      poolCounter, poolEls, drawnEl, drawnHdrCount, listInput,
      bombosBar, bomboBadge, btnSound;

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
  function mount(container) {
    container.innerHTML = TEMPLATE;
    root = container;
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
    listInput      = container.querySelector('#sorteo-list-input');
    bombosBar      = container.querySelector('#bombos-bar');
    bomboBadge     = container.querySelector('#bombo-badge');
    btnSound       = container.querySelector('#btn-sound');

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

    btnSorteo.addEventListener('click', () => { if (window.SFX) SFX.unlock(); drawNext(); });
    btnReset.addEventListener('click', resetActive);
    container.querySelector('#btn-list-apply').addEventListener('click', applyListInput);
    container.querySelector('#btn-list-clear').addEventListener('click', () => {
      const b = activeBombo(); if (!b) return;
      if (confirm(`¿Vaciar "${b.name}"? Se perderán sus equipos y resultados.`)) {
        b.teams = []; b.drawn = []; saveState(state); refreshActive();
      }
    });
    container.querySelector('#btn-add-bombo').addEventListener('click', addBombo);
    container.querySelector('#btn-rename-bombo').addEventListener('click', renameActiveBombo);
    container.querySelector('#btn-delete-bombo').addEventListener('click', deleteActiveBombo);
    btnSound.addEventListener('click', toggleSound);

    showFrame(0);
    chibi.classList.add('idle');
    renderAll();

    // Pre-carga el redoble para que el seek a 2s funcione al primer click
    ensureDrumAudio();
  }

  /* ---------------- Bombos UI ---------------- */
  function addBombo() {
    const name = prompt('Nombre del nuevo bombo:', `Bombo ${String.fromCharCode(65 + state.bombos.length)}`);
    if (!name) return;
    const b = newBombo(name.trim());
    state.bombos.push(b);
    state.activeId = b.id;
    saveState(state); renderAll();
  }
  function renameActiveBombo() {
    const b = activeBombo(); if (!b) return;
    const name = prompt('Nuevo nombre:', b.name);
    if (!name) return;
    b.name = name.trim(); saveState(state); renderBombosBar(); renderHint();
  }
  function deleteActiveBombo() {
    const b = activeBombo(); if (!b) return;
    if (state.bombos.length <= 1) { alert('Debe haber al menos un bombo.'); return; }
    if (!confirm(`¿Eliminar "${b.name}" y sus equipos?`)) return;
    state.bombos = state.bombos.filter(x => x.id !== b.id);
    state.activeId = state.bombos[0].id;
    saveState(state); renderAll();
  }
  function selectBombo(id) {
    if (busy) return;
    state.activeId = id;
    saveState(state);
    refreshActive();
  }

  function renderBombosBar() {
    bombosBar.innerHTML = '';
    state.bombos.forEach(b => {
      const remaining = b.teams.length;
      const total = b.teams.length + b.drawn.length;
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
  function fireConfetti() {
    confettiLayer.classList.remove('fire'); void confettiLayer.offsetWidth;
    confettiLayer.classList.add('fire');
  }
  function shake() {
    chibi.classList.remove('shake'); void chibi.offsetWidth;
    chibi.classList.add('shake');
  }
  function showRevealCard(team, ord, total, bomboName) {
    revealName.textContent = team;
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
  function drawNext() {
    if (busy) return;
    const b = activeBombo();
    if (!b) { flashHint('Crea un bombo primero'); return; }
    if (!b.teams.length) { flashHint('No quedan equipos en este bombo'); return; }

    busy = true; setControlsBusy(true);
    hideRevealCard();
    chibi.classList.remove('idle');

    // Sacar equipo
    const idx = Math.floor(Math.random() * b.teams.length);
    const removed = b.teams.splice(idx, 1)[0];
    const ord = b.drawn.length + 1;
    b.drawn.push({ name: removed, at: Date.now() });
    saveState(state);
    renderPool({ highlight: removed });
    renderBombosBar();

    // 🥁 Redoble (mp3) durante la animación previa al reveal
    drumHandle = playDrumrollAudio(PRE_REVEAL_MS - 80);

    let i = 0;
    const runStep = () => {
      const step = SEQ[i];
      showFrame(step.frame);
      if (step.sparks)   fireSparks();
      if (step.shake)    shake();
      if (step.reveal)   showRevealCard(removed, ord, b.teams.length, b.name);
      if (step.tada && window.SFX) SFX.playTada();
      if (step.confetti) fireConfetti();
      i++;
      if (i < SEQ.length) setTimeout(runStep, step.dur);
      else setTimeout(finishSequence, step.dur);
    };
    runStep();
  }

  function finishSequence() {
    drumHandle = null;
    hideRevealCard();
    setTimeout(() => {
      showFrame(0);
      chibi.classList.add('idle');
      busy = false;
      renderAll();
      setControlsBusy(false);
      const b = activeBombo();
      if (b && !b.teams.length) {
        flashHint(`🎉 ${b.name} completo`, true);
      }
    }, 280);
  }

  function setControlsBusy(b) {
    const ab = activeBombo();
    btnSorteo.disabled = b || !ab || !ab.teams.length;
    btnReset.disabled  = b;
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
    if (!b.teams.length && b.drawn.length) hint.textContent = `${b.name} · sorteado completo`;
    else hint.textContent = b.teams.length
      ? `${b.name} · ${b.teams.length} equipo${b.teams.length===1?'':'s'} en la urna`
      : `${b.name} · añade equipos para empezar`;
  }

  /* ---------------- Reset / list edit ---------------- */
  function resetActive() {
    const b = activeBombo(); if (!b || !b.drawn.length) return;
    if (!confirm(`¿Reiniciar "${b.name}"? Los equipos volverán a la urna.`)) return;
    b.teams = b.teams.concat(b.drawn.map(d => d.name));
    b.drawn = [];
    saveState(state); refreshActive();
  }

  function applyListInput() {
    const b = activeBombo(); if (!b) return;
    const raw = listInput.value || '';
    const items = raw.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean);
    const seen = new Set(); const clean = [];
    for (const t of items) {
      const key = t.toLowerCase();
      if (!seen.has(key)) { seen.add(key); clean.push(t); }
    }
    const drawnLower = new Set(b.drawn.map(d => d.name.toLowerCase()));
    b.drawn = b.drawn.filter(d => clean.some(c => c.toLowerCase() === d.name.toLowerCase()));
    b.teams = clean.filter(c => !drawnLower.has(c.toLowerCase()));
    saveState(state); refreshActive();
    flashHint(`${b.name} actualizado · ${clean.length} equipos`);
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
  function renderAll() {
    renderBombosBar();
    refreshActive();
  }
  function refreshActive() {
    const b = activeBombo();
    listInput.value = b ? b.teams.concat(b.drawn.map(d => d.name)).join('\n') : '';
    renderPool();
    renderDrawn();
    renderHint();
    btnSorteo.disabled = !b || !b.teams.length;
    btnReset.disabled  = !b || !b.drawn.length;
    btnSorteo.textContent = 'Sortear equipo';
    renderBombosBar();
  }
  function renderPool(opts = {}) {
    const { highlight } = opts;
    const b = activeBombo();
    poolEls.innerHTML = '';
    const total = b ? b.teams.length + b.drawn.length : 0;
    poolCounter.querySelector('.num').textContent = b ? b.teams.length : 0;
    poolCounter.querySelector('.total').textContent = '/ ' + total;
    if (!b) return;
    b.teams.forEach(name => {
      const c = document.createElement('span');
      c.className = 'chip';
      c.innerHTML = `<span class="dot"></span>${escapeHtml(name)}`;
      poolEls.appendChild(c);
    });
    b.drawn.forEach(d => {
      const c = document.createElement('span');
      const hl = highlight && d.name === highlight;
      c.className = 'chip ' + (hl ? 'now' : 'drawn');
      c.innerHTML = `<span class="dot"></span>${escapeHtml(d.name)}`;
      poolEls.appendChild(c);
    });
  }
  function renderDrawn() {
    const b = activeBombo();
    drawnHdrCount.textContent = b ? b.drawn.length : 0;
    if (!b || !b.drawn.length) {
      drawnEl.innerHTML = '<div class="drawn-empty">Sin sorteos aún</div>';
      return;
    }
    drawnEl.innerHTML = '';
    b.drawn.forEach((d, i) => {
      const li = document.createElement('li');
      li.className = 'drawn-row';
      const t = new Date(d.at);
      const hh = String(t.getHours()).padStart(2,'0');
      const mm = String(t.getMinutes()).padStart(2,'0');
      li.innerHTML = `
        <span class="num">${i+1}</span>
        <span class="name">${escapeHtml(d.name)}</span>
        <span class="time">${hh}:${mm}</span>`;
      drawnEl.appendChild(li);
    });
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }

  /* ---------------- Template ---------------- */
  const framesHtml = FRAMES.map((f, i) =>
    `<img class="chibi-frame${i===0?' show':''}" src="${FRAME_BASE}${f}" alt="">`
  ).join('');

  const TEMPLATE = `
    <div class="sorteo-grid">
      <!-- STAGE -->
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

      <!-- SIDE -->
      <aside class="sorteo-side">
        <!-- Bombos toolbar -->
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

        <!-- Pool -->
        <div class="side-card">
          <div class="side-hdr">
            <h3>Urna</h3>
            <span class="pill live">EN VIVO</span>
          </div>
          <div class="side-body">
            <div class="team-chips" id="team-chips"></div>
          </div>
        </div>

        <!-- Drawn + editor -->
        <div class="side-card">
          <div class="side-hdr">
            <h3>Resultado</h3>
            <span class="pill"><span id="drawn-count">0</span> sacados</span>
          </div>
          <div class="side-body">
            <ol class="drawn-list" id="drawn-list"></ol>
          </div>
          <div class="side-foot">
            <label>Equipos del bombo activo</label>
            <textarea id="sorteo-list-input" placeholder="Un equipo por línea…"></textarea>
            <div class="side-foot-row">
              <span class="side-foot-help">Salto de línea o coma</span>
              <div style="display:flex;gap:6px;">
                <button class="btn" id="btn-list-clear">Vaciar</button>
                <button class="btn btn-primary" id="btn-list-apply">Aplicar</button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  `;

  /* ---------------- Public API ---------------- */
  window.SORTEO = {
    init(selector = '#sorteo-content') {
      const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
      if (!el) return;
      mount(el);
    },
    /** Reemplaza todos los bombos. arr puede ser:
     *   ['Equipo1','Equipo2'] → un solo bombo "Bombo A"
     *   [{ name:'Bombo A', teams:[...] }, ...] → varios bombos */
    setBombos(arr) {
      if (!Array.isArray(arr) || !arr.length) return;
      let bombos;
      if (typeof arr[0] === 'string') {
        bombos = [newBombo('Bombo A', arr)];
      } else {
        bombos = arr.map(b => newBombo(b.name || 'Bombo', b.teams || []));
      }
      state = { bombos, activeId: bombos[0].id };
      saveState(state);
      if (root) renderAll();
    },
    getBombos() { return JSON.parse(JSON.stringify(state.bombos)); },
    getActive() { return JSON.parse(JSON.stringify(activeBombo())); },
    reset() { resetActive(); }
  };
})();
