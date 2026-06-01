/* ============================================================
   PALMARÉS — Campeones históricos de la TSC
   Store IDB: 'palmares'  · un registro = un título conquistado
   { id, teamId, competition, year?, season?, notes? }

   Versión: vista pública rediseñada como Trophy Room (drag).
   Vista admin idéntica a la anterior.
   ============================================================ */

/* ---------------- Competiciones canónicas ---------------- */
const PALMARES_COMPS = [
  { key:'TSC 1RA DIVISION',              label:'TSC 1ra División',     short:'1ra',   trophy:'classica', color:'#DAA520' },
  { key:'COPA DEL EMPERADOR DE LA TSC',  label:'Copa del Emperador',   short:'Emp.',  trophy:'imperial', color:'#E8C97A' },
  { key:'SUPER COPA DE LA TSC',          label:'Super Copa',           short:'Super', trophy:'konami',   color:'#D8D8D8' },
  { key:'LIGA DE CAMPEONES',             label:'Liga de Campeones',    short:'LdC',   trophy:'orejona',  color:'#EAEAEA' },
  { key:'TSC 2DA DIVISION',              label:'TSC 2da División',     short:'2da',   trophy:'sobria',   color:'#CD7F32' },
];
function palmaresCompByKey(key){ return PALMARES_COMPS.find(c => c.key === key); }
function palmaresCompIndex(key){
  const i = PALMARES_COMPS.findIndex(c => c.key === key);
  return i < 0 ? PALMARES_COMPS.length : i;
}

/* ---------------- SVG Trofeos (5 siluetas) ---------------- */
function _uid(){ return 'p'+Math.random().toString(36).slice(2,9); }

function trophyClassica(size=120){
  const u = _uid();
  return `<svg class="palm-trophy classica" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${u}-g" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#B8860B"/><stop offset="45%" stop-color="#FFE082"/><stop offset="100%" stop-color="#B8860B"/>
      </linearGradient>
      <radialGradient id="${u}-h" cx="35%" cy="30%">
        <stop offset="0%" stop-color="#FFE8AE"/><stop offset="100%" stop-color="#B8860B"/>
      </radialGradient>
    </defs>
    <circle cx="100" cy="20" r="10" fill="url(#${u}-h)" stroke="#8B6914" stroke-width="0.6"/>
    <path d="M 78 30 Q 100 24 122 30 L 120 44 L 80 44 Z" fill="url(#${u}-g)" stroke="#8B6914" stroke-width="0.6"/>
    <path d="M 70 44 L 130 44 L 132 56 Q 132 116 100 134 Q 68 116 68 56 Z" fill="url(#${u}-g)" stroke="#8B6914" stroke-width="0.6"/>
    <path d="M 70 58 Q 38 60 38 88 Q 38 104 60 98" fill="none" stroke="url(#${u}-g)" stroke-width="7" stroke-linecap="round"/>
    <path d="M 130 58 Q 162 60 162 88 Q 162 104 140 98" fill="none" stroke="url(#${u}-g)" stroke-width="7" stroke-linecap="round"/>
    <rect x="94" y="134" width="12" height="22" fill="url(#${u}-g)" stroke="#8B6914" stroke-width="0.4"/>
    <rect x="76" y="156" width="48" height="14" rx="2" fill="url(#${u}-g)" stroke="#8B6914" stroke-width="0.4"/>
    <rect x="58" y="170" width="84" height="20" rx="3" fill="url(#${u}-g)" stroke="#8B6914" stroke-width="0.4"/>
    <ellipse cx="100" cy="62" rx="18" ry="3" fill="rgba(255,255,255,0.35)"/>
  </svg>`;
}
function trophyImperial(size=120){
  const u = _uid();
  return `<svg class="palm-trophy imperial" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${u}-g" x1="0%" x2="100%"><stop offset="0%" stop-color="#A8854D"/><stop offset="50%" stop-color="#FFE8AE"/><stop offset="100%" stop-color="#A8854D"/></linearGradient></defs>
    <path d="M 72 14 L 80 28 L 88 8 L 96 24 L 100 4 L 104 24 L 112 8 L 120 28 L 128 14 L 128 34 L 72 34 Z" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.6"/>
    <circle cx="80" cy="10" r="2.4" fill="#B22222"/><circle cx="100" cy="4" r="2.4" fill="#B22222"/><circle cx="120" cy="10" r="2.4" fill="#B22222"/>
    <ellipse cx="100" cy="38" rx="30" ry="5" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.6"/>
    <path d="M 76 38 L 124 38 L 118 132 Q 100 144 82 132 Z" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.6"/>
    <path d="M 76 52 Q 52 70 58 108" fill="none" stroke="url(#${u}-g)" stroke-width="4" stroke-linecap="round"/>
    <path d="M 124 52 Q 148 70 142 108" fill="none" stroke="url(#${u}-g)" stroke-width="4" stroke-linecap="round"/>
    <rect x="88" y="142" width="24" height="10" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.4"/>
    <rect x="78" y="152" width="44" height="12" rx="2" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.4"/>
    <rect x="66" y="164" width="68" height="14" rx="2" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.4"/>
    <rect x="54" y="178" width="92" height="16" rx="3" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.4"/>
    <ellipse cx="100" cy="56" rx="14" ry="2.5" fill="rgba(255,255,255,0.35)"/>
  </svg>`;
}
function trophyKonami(size=120){
  const u = _uid();
  return `<svg class="palm-trophy konami" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="${u}-ball" cx="32%" cy="28%"><stop offset="0%" stop-color="#FFEAB0"/><stop offset="55%" stop-color="#F1C232"/><stop offset="100%" stop-color="#6B5210"/></radialGradient>
      <linearGradient id="${u}-ped" x1="0%" x2="100%"><stop offset="0%" stop-color="#5A5A5A"/><stop offset="50%" stop-color="#E0E0E0"/><stop offset="100%" stop-color="#5A5A5A"/></linearGradient>
    </defs>
    <circle cx="100" cy="80" r="55" fill="url(#${u}-ball)" stroke="#5C420F" stroke-width="0.6"/>
    <g fill="none" stroke="#5C420F" stroke-width="1.6" opacity="0.55">
      <polygon points="100,38 117,48 117,68 100,78 83,68 83,48"/>
      <polygon points="100,78 117,68 130,82 124,102 107,108 100,98"/>
      <polygon points="100,78 83,68 70,82 76,102 93,108 100,98"/>
      <polygon points="70,82 53,90 50,108 60,120 76,116 76,102"/>
      <polygon points="130,82 147,90 150,108 140,120 124,116 124,102"/>
      <polygon points="100,98 107,108 100,124 93,108"/>
    </g>
    <ellipse cx="80" cy="58" rx="14" ry="8" fill="rgba(255,255,255,0.45)"/>
    <path d="M 78 140 L 100 130 L 122 140 L 116 188 L 84 188 Z" fill="url(#${u}-ped)" stroke="#3A3A3A" stroke-width="0.6"/>
    <line x1="92" y1="138" x2="89" y2="186" stroke="#3A3A3A" stroke-width="1" opacity="0.5"/>
    <line x1="100" y1="135" x2="100" y2="188" stroke="#3A3A3A" stroke-width="1" opacity="0.5"/>
    <line x1="108" y1="138" x2="111" y2="186" stroke="#3A3A3A" stroke-width="1" opacity="0.5"/>
    <ellipse cx="100" cy="200" rx="58" ry="9" fill="url(#${u}-ped)" stroke="#3A3A3A" stroke-width="0.6"/>
    <ellipse cx="100" cy="198" rx="58" ry="4" fill="#F0F0F0"/>
  </svg>`;
}
function trophyOrejona(size=120){
  const u = _uid();
  return `<svg class="palm-trophy orejona" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${u}-g" x1="0%" x2="100%"><stop offset="0%" stop-color="#8A8A8A"/><stop offset="50%" stop-color="#F4F4F4"/><stop offset="100%" stop-color="#7A7A7A"/></linearGradient></defs>
    <path d="M 68 50 L 132 50 L 138 60 Q 142 118 100 148 Q 58 118 62 60 Z" fill="url(#${u}-g)" stroke="#4A4A4A" stroke-width="0.6"/>
    <ellipse cx="100" cy="50" rx="32" ry="6" fill="#3A3A3A"/>
    <ellipse cx="100" cy="49" rx="30" ry="4" fill="#1A1A1A"/>
    <path d="M 70 56 C 16 30, 10 96, 60 124" fill="none" stroke="url(#${u}-g)" stroke-width="9" stroke-linecap="round"/>
    <path d="M 130 56 C 184 30, 190 96, 140 124" fill="none" stroke="url(#${u}-g)" stroke-width="9" stroke-linecap="round"/>
    <rect x="95" y="148" width="10" height="32" fill="url(#${u}-g)" stroke="#4A4A4A" stroke-width="0.4"/>
    <rect x="80" y="180" width="40" height="9" rx="2" fill="url(#${u}-g)" stroke="#4A4A4A" stroke-width="0.4"/>
    <rect x="68" y="189" width="64" height="14" rx="3" fill="url(#${u}-g)" stroke="#4A4A4A" stroke-width="0.4"/>
    <ellipse cx="100" cy="80" rx="18" ry="4" fill="rgba(255,255,255,0.4)"/>
  </svg>`;
}
function trophySobria(size=120){
  const u = _uid();
  return `<svg class="palm-trophy sobria" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${u}-g" x1="0%" x2="100%"><stop offset="0%" stop-color="#5C2E0C"/><stop offset="50%" stop-color="#E8A05A"/><stop offset="100%" stop-color="#5C2E0C"/></linearGradient></defs>
    <path d="M 76 32 Q 100 18 124 32 L 122 46 L 78 46 Z" fill="url(#${u}-g)" stroke="#3A1A06" stroke-width="0.6"/>
    <path d="M 78 46 L 122 46 L 124 60 Q 124 110 100 124 Q 76 110 76 60 Z" fill="url(#${u}-g)" stroke="#3A1A06" stroke-width="0.6"/>
    <rect x="93" y="124" width="14" height="28" fill="url(#${u}-g)" stroke="#3A1A06" stroke-width="0.4"/>
    <rect x="76" y="152" width="48" height="10" rx="2" fill="url(#${u}-g)" stroke="#3A1A06" stroke-width="0.4"/>
    <rect x="60" y="162" width="80" height="18" rx="3" fill="url(#${u}-g)" stroke="#3A1A06" stroke-width="0.4"/>
    <ellipse cx="100" cy="64" rx="14" ry="3" fill="rgba(255,255,255,0.3)"/>
  </svg>`;
}
const TROPHY_RENDERERS = { classica: trophyClassica, imperial: trophyImperial, konami: trophyKonami, orejona: trophyOrejona, sobria: trophySobria };
function renderTrophy(key, size=120){
  const comp = palmaresCompByKey(key);
  const fn = TROPHY_RENDERERS[comp?.trophy];
  return fn ? fn(size) : '';
}

/* ---------------- Helpers ---------------- */
async function getAllPalmaresRecords(){ return dbGetAll('palmares'); }
async function aggregatePalmaresByTeam(){
  const recs = await getAllPalmaresRecords();
  const out = new Map();
  for (const r of recs) {
    if (!out.has(r.teamId)) out.set(r.teamId, { _total: 0 });
    const t = out.get(r.teamId);
    t[r.competition] = (t[r.competition] || 0) + 1;
    t._total++;
  }
  return out;
}
function reigningChampion(records, compKey){
  const filtered = records.filter(r => r.competition === compKey);
  if (!filtered.length) return null;
  filtered.sort((a, b) => {
    const yA = a.year || 0, yB = b.year || 0;
    if (yA !== yB) return yB - yA;
    return (b.id || 0) - (a.id || 0);
  });
  return filtered[0];
}
function _esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function _escAttr(s){ return _esc(s).replace(/`/g,'&#96;'); }

/* ============================================================
   PÚBLICO — Trophy Room (drag horizontal)
   ============================================================ */
async function renderPubPalmares(){
  const el = document.getElementById('pub-palmares-content');
  if(!el) return;

  const [recs, allTeams] = await Promise.all([ getAllPalmaresRecords(), dbGetAll('teams') ]);
  const teamById = {}; allTeams.forEach(t => teamById[t.id] = t);

  const compData = PALMARES_COMPS.map(comp => {
    const compRecs = recs
      .filter(r => r.competition === comp.key)
      .sort((a, b) => (b.year||0) - (a.year||0) || (b.id||0) - (a.id||0));
    const champion = compRecs[0] || null;
    const champTeam = champion ? teamById[champion.teamId] : null;
    return { comp, records: compRecs, champion, champTeam };
  });

  const totalTitles    = recs.length;
  const totalChampions = new Set(recs.map(r => r.teamId)).size;

  el.innerHTML = `
    <div class="tr-root" id="tr-root">
      <header class="tr-header">
        <h1 class="tr-title">Sala de Trofeos</h1>
        <div class="tr-subtitle">Arrastra para explorar · ${PALMARES_COMPS.length} competiciones · ${totalTitles} títulos · ${totalChampions} campeones</div>
      </header>

      <div class="tr-room" id="tr-room">
        <div class="tr-bg-wall"></div>
        <div class="tr-bg-glow"></div>
        <div class="tr-spotlights">${Array.from({length:7}).map(()=>`<span class="tr-spot"></span>`).join('')}</div>
        <div class="tr-floor"></div>
        <div class="tr-stage" id="tr-stage">${compData.map((d, i) => buildCase(d, i)).join('')}</div>

        <button class="tr-nav tr-nav-prev" id="tr-prev" aria-label="Copa anterior">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="tr-nav tr-nav-next" id="tr-next" aria-label="Copa siguiente">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>

        <div class="tr-drag-hint" id="tr-drag-hint">
          <svg viewBox="0 0 64 24" width="58" height="22"><path d="M2 12h60M8 6l-6 6 6 6M56 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>Arrastra</span>
        </div>
      </div>

      <nav class="tr-dots" id="tr-dots">
        ${compData.map((d, i) => `
          <button class="tr-dot" data-idx="${i}" style="--accent:${d.comp.color}" title="${_esc(d.comp.label)}">
            <span class="tr-dot-tip">${renderTrophy(d.comp.key, 16)}</span>
            <span class="tr-dot-label">${_esc(d.comp.short)}</span>
          </button>
        `).join('')}
      </nav>

      <section class="tr-info" id="tr-info"></section>
    </div>
  `;

  initTrophyRoom(el, compData, teamById);
}

function buildCase(data, idx){
  const { comp } = data;
  const titleCount = data.records.length;
  return `
    <div class="tr-case" data-idx="${idx}" style="--accent:${comp.color}">
      <div class="tr-case-niche">
        <div class="tr-case-spot"></div>
        <div class="tr-case-back"></div>
        <div class="tr-case-glow"></div>
        <div class="tr-case-trophy">${renderTrophy(comp.key, 160)}</div>
        <div class="tr-case-base">
          <div class="tr-case-plaque">
            <span class="tr-case-comp">${_esc(comp.label)}</span>
            <span class="tr-case-count">${titleCount} ${titleCount===1?'título':'títulos'}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildInfoPanel(data, teamById){
  const { comp, records, champTeam, champion } = data;

  const perTeam = {};
  records.forEach(r => { perTeam[r.teamId] = (perTeam[r.teamId]||0)+1; });

  const list = records.map((r, i) => {
    const team = teamById[r.teamId] || {};
    const isReigning = i === 0;
    const totalForTeam = perTeam[r.teamId];
    return `
      <li class="tr-hist-row ${isReigning?'reigning':''}">
        <span class="tr-hist-year">${r.year || '—'}${r.season?`<small>${_esc(r.season)}</small>`:''}</span>
        <span class="tr-hist-team">
          <span class="tr-hist-logo" style="background:${team.color || '#333'}">
            ${team.logo ? `<img src="${_esc(team.logo)}" alt="">` : `<span>${_esc(team.ini || (team.name||'?').slice(0,2))}</span>`}
          </span>
          <span class="tr-hist-name">${_esc(team.name || '—')}</span>
        </span>
        <span class="tr-hist-multi">${totalForTeam > 1 ? `×${totalForTeam}` : ''}</span>
        <span class="tr-hist-badge-wrap">${isReigning ? '<span class="tr-hist-badge">VIGENTE</span>' : ''}</span>
      </li>
    `;
  }).join('');

  const colorHalo = champTeam?.color || comp.color;

  return `
    <div class="tr-champ" style="--halo:${colorHalo}">
      <div class="tr-champ-eyebrow">${_esc(comp.label)}</div>
      ${champTeam ? `
        <div class="tr-champ-body">
          <div class="tr-champ-logo" style="background:${champTeam.color || '#333'}">
            ${champTeam.logo ? `<img src="${_esc(champTeam.logo)}" alt="">` : `<span>${_esc(champTeam.ini || champTeam.name.slice(0,2))}</span>`}
          </div>
          <div class="tr-champ-text">
            <div class="tr-champ-label">Campeón vigente</div>
            <div class="tr-champ-name">${_esc(champTeam.name)}</div>
            <div class="tr-champ-meta">
              ${champion.year ? `<span>${champion.year}</span>` : ''}
              ${champion.season ? `<span class="tr-dotsep">·</span><span>${_esc(champion.season)}</span>` : ''}
              ${perTeam[champTeam.id] > 1 ? `<span class="tr-dotsep">·</span><span>${perTeam[champTeam.id]} en esta copa</span>` : ''}
            </div>
          </div>
        </div>
      ` : `
        <div class="tr-champ-empty">
          <div class="tr-champ-label">Aún sin campeón</div>
          <div class="tr-champ-name">La primera edición está por jugarse.</div>
        </div>
      `}
    </div>

    <div class="tr-history">
      <header class="tr-history-hdr">
        <h2>Historial de campeones</h2>
        <span class="tr-history-count">${records.length} ${records.length===1?'edición':'ediciones'}</span>
      </header>
      ${records.length ? `<ul class="tr-history-list">${list}</ul>` : `<div class="tr-history-empty">No hay títulos registrados en esta competición.</div>`}
    </div>
  `;
}

function initTrophyRoom(root, compData, teamById){
  const N       = compData.length;
  const stage   = root.querySelector('#tr-stage');
  const room    = root.querySelector('#tr-room');
  const info    = root.querySelector('#tr-info');
  const dotsEl  = root.querySelector('#tr-dots');
  const prevBtn = root.querySelector('#tr-prev');
  const nextBtn = root.querySelector('#tr-next');
  const hint    = root.querySelector('#tr-drag-hint');
  const cards   = [...stage.querySelectorAll('.tr-case')];

  let pos = 0, target = 0, snapped = -1, dragging = false;
  let dragStartX = 0, dragStartPos = 0;
  let velocity = 0, frame = null;
  let movedDuringDrag = false, interacted = false;

  function positionCards(){
    const W = room.clientWidth || 1100;
    const STEP_X = Math.min(290, Math.max(180, W * 0.22));
    const STEP_Z = 180;
    const TILT   = 26;

    cards.forEach((c, i) => {
      let off = i - pos;
      if (off >  N/2) off -= N;
      if (off < -N/2) off += N;

      const abs   = Math.abs(off);
      const scale = Math.max(0.55, 1 - abs * 0.16);
      const x     = off * STEP_X;
      const z     = -abs * STEP_Z;
      const rotY  = -off * TILT;
      const op    = abs > 2.6 ? 0 : Math.max(0, 1 - Math.pow(abs/2.6, 1.6));
      const blur  = abs > 0.6 ? Math.min(2.5, (abs - 0.6) * 1.4) : 0;

      c.style.transform = `translate(-50%, -50%) translate3d(${x}px, 0, ${z}px) rotateY(${rotY}deg) scale(${scale})`;
      c.style.opacity   = op.toFixed(3);
      c.style.zIndex    = String(1000 - Math.round(abs * 100));
      c.style.filter    = blur ? `blur(${blur.toFixed(2)}px)` : '';
      c.classList.toggle('is-active', abs < 0.5);
    });
  }

  function setActive(idx){
    target = idx;
    interacted = true;
    if (hint) hint.classList.add('is-hidden');
  }
  function snapTarget(){ target = Math.round(target); }

  function tick(){
    const k = dragging ? 1 : 0.18;
    const diff = target - pos;
    if (Math.abs(diff) < 0.0008 && !dragging) pos = target;
    else pos += diff * k;
    positionCards();

    const currentSnap = ((Math.round(pos) % N) + N) % N;
    if (currentSnap !== snapped) {
      snapped = currentSnap;
      renderInfo(currentSnap);
      updateDots(currentSnap);
    }
    frame = requestAnimationFrame(tick);
  }

  function renderInfo(idx){
    const data = compData[idx];
    if (!data) return;
    info.innerHTML = buildInfoPanel(data, teamById);
  }
  function updateDots(idx){
    dotsEl.querySelectorAll('.tr-dot').forEach((d, i) => d.classList.toggle('is-active', i === idx));
  }

  function onPointerDown(e){
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    movedDuringDrag = false;
    dragStartX = e.clientX;
    dragStartPos = target;
    pos = target;
    velocity = 0;
    room.classList.add('is-dragging');
    interacted = true;
    if (hint) hint.classList.add('is-hidden');
    try { stage.setPointerCapture(e.pointerId); } catch(_){}
  }
  function onPointerMove(e){
    if (!dragging) return;
    const W = room.clientWidth || 1100;
    const STEP_X = Math.min(290, Math.max(180, W * 0.22));
    const dx = e.clientX - dragStartX;
    if (Math.abs(dx) > 4) movedDuringDrag = true;
    const newTarget = dragStartPos - dx / STEP_X;
    velocity = newTarget - target;
    target   = newTarget;
  }
  function onPointerUp(e){
    if (!dragging) return;
    dragging = false;
    room.classList.remove('is-dragging');
    try { stage.releasePointerCapture(e.pointerId); } catch(_){}
    target = target + velocity * 6;
    snapTarget();
  }
  stage.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup',   onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  cards.forEach((c, i) => c.addEventListener('click', () => { if (!movedDuringDrag) setActive(i); }));
  prevBtn.addEventListener('click', () => { setActive(target - 1); snapTarget(); });
  nextBtn.addEventListener('click', () => { setActive(target + 1); snapTarget(); });
  dotsEl.querySelectorAll('.tr-dot').forEach((d, i) => d.addEventListener('click', () => setActive(i)));

  function onKey(e){
    if (!root.isConnected) return;
    if (e.key === 'ArrowLeft')  { setActive(target - 1); snapTarget(); }
    if (e.key === 'ArrowRight') { setActive(target + 1); snapTarget(); }
  }
  window.addEventListener('keydown', onKey);

  let wheelLock = false;
  room.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) < 8 || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    if (wheelLock) return;
    wheelLock = true;
    setActive(target + (e.deltaX > 0 ? 1 : -1));
    snapTarget();
    setTimeout(() => wheelLock = false, 280);
  }, { passive: false });

  const ro = new ResizeObserver(() => positionCards());
  ro.observe(room);

  const mo = new MutationObserver(() => {
    if (!root.isConnected) {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup',   onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('keydown', onKey);
      ro.disconnect();
      mo.disconnect();
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  positionCards();
  updateDots(0);
  // No llamamos renderInfo(0) acá: tick() lo dispara en el primer frame
  // y evitamos cancelar la animación al hacerlo dos veces seguidas.
  tick();

  setTimeout(() => { if (!interacted && hint) hint.classList.add('is-hidden'); }, 7000);
}

/* ============================================================
   ADMIN — Matriz de palmarés (igual que antes)
   ============================================================ */
async function renderAdmPalmares(){
  const el = document.getElementById('adm-palmares-content');
  if(!el) return;

  const [recs, allTeams] = await Promise.all([ getAllPalmaresRecords(), dbGetAll('teams') ]);
  const teamById = {}; allTeams.forEach(t => teamById[t.id] = t);
  const agg = await aggregatePalmaresByTeam();
  const teamsWithTitles = [...agg.entries()]
    .map(([tid, counts]) => ({ team: teamById[tid], counts }))
    .filter(x => x.team)
    .sort((a, b) => (b.counts._total - a.counts._total) || a.team.name.localeCompare(b.team.name, 'es'));

  el.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
    <div style="font-size:14px;color:var(--txt2);">${recs.length} título(s) registrado(s) · ${teamsWithTitles.length} club(es) campeón(es)</div>
    <button class="btn btn-primary" onclick="openPalmaresAddModal()">+ Agregar título</button>
  </div>
  <div class="card" style="overflow:auto;">
    <table class="palm-admin-table">
      <thead>
        <tr>
          <th class="head-teams">Clubes campeones</th>
          ${PALMARES_COMPS.map(c => `<th class="head-comp"><div class="head-comp-inner">${renderTrophy(c.key, 22)}<span>${_esc(c.label)}</span></div></th>`).join('')}
          <th class="head-total">Total</th>
          <th class="head-actions"></th>
        </tr>
      </thead>
      <tbody>
        ${teamsWithTitles.length === 0
          ? `<tr><td colspan="${PALMARES_COMPS.length+3}" style="text-align:center;padding:30px;color:var(--txt3);">No hay títulos registrados aún.</td></tr>`
          : teamsWithTitles.map(({team, counts}) => `
              <tr>
                <td class="cell-team">
                  <div class="team-cell">
                    <div class="team-logo" style="background:${team.color || '#333'};">
                      ${team.logo ? `<img src="${team.logo}">` : `<span>${_esc(team.ini || team.name.substring(0,3))}</span>`}
                    </div>
                    <span class="team-name">${_esc(team.name)}</span>
                  </div>
                </td>
                ${PALMARES_COMPS.map(c => {
                  const n = counts[c.key] || 0;
                  return `<td class="cell-count ${n>0?'has':'zero'}" onclick="openPalmaresCellEdit(${team.id}, '${_escAttr(c.key)}')">${n>0?`<span class="big-n">${n}</span>`:''}</td>`;
                }).join('')}
                <td class="cell-total">${counts._total}</td>
                <td class="cell-actions"><button class="btn btn-xs" onclick="openPalmaresAddModal(${team.id})">+ Título</button></td>
              </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div id="palmares-modal-wrap"></div>`;
}

async function openPalmaresAddModal(presetTeamId=null){
  const teams = await dbGetAll('teams', t => (t.status||'ACTIVO') === 'ACTIVO');
  teams.sort((a,b) => a.name.localeCompare(b.name, 'es'));
  const wrap = document.getElementById('palmares-modal-wrap');
  wrap.innerHTML = `
  <div class="modal-overlay open" id="palmares-add-modal">
    <div class="modal" style="max-width:440px;">
      <div class="modal-hdr"><div class="modal-title">Agregar título</div><button class="modal-close" onclick="closePalmaresModals()">×</button></div>
      <div class="modal-body">
        <div class="form-group"><label>Equipo</label>
          <select id="palm-team">${teams.map(t => `<option value="${t.id}" ${t.id===presetTeamId?'selected':''}>${_esc(t.name)}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Competición</label>
          <select id="palm-comp">${PALMARES_COMPS.map(c => `<option value="${_escAttr(c.key)}">${_esc(c.label)}</option>`).join('')}</select>
        </div>
        <div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><label>Año</label><input type="number" id="palm-year" placeholder="2024" min="1900" max="2100"></div>
          <div><label>Temporada</label><input type="text" id="palm-season" placeholder="T1"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closePalmaresModals()">Cancelar</button>
        <button class="btn btn-primary" onclick="savePalmaresAdd()">Guardar título</button>
      </div>
    </div>
  </div>`;
}
async function savePalmaresAdd(){
  const teamId = parseInt(document.getElementById('palm-team').value);
  const competition = document.getElementById('palm-comp').value;
  const yearRaw = document.getElementById('palm-year').value.trim();
  const seasonRaw = document.getElementById('palm-season').value.trim();
  const rec = { teamId, competition };
  if (yearRaw) rec.year = parseInt(yearRaw);
  if (seasonRaw) rec.season = seasonRaw;
  rec.createdAt = new Date().toISOString();
  await dbAdd('palmares', rec);
  if (typeof showToast === 'function') showToast('Título registrado');
  closePalmaresModals();
  renderAdmPalmares();
}
async function openPalmaresCellEdit(teamId, compKey){
  const team = await dbGet('teams', teamId);
  const comp = palmaresCompByKey(compKey);
  if (!team || !comp) return;
  const recs = (await dbGetAll('palmares', r => r.teamId === teamId && r.competition === compKey))
    .sort((a, b) => (b.year || 0) - (a.year || 0) || (b.id - a.id));
  const wrap = document.getElementById('palmares-modal-wrap');
  wrap.innerHTML = `
  <div class="modal-overlay open" id="palmares-cell-modal">
    <div class="modal" style="max-width:480px;">
      <div class="modal-hdr"><div class="modal-title">${_esc(team.name)} · ${_esc(comp.label)}</div><button class="modal-close" onclick="closePalmaresModals()">×</button></div>
      <div class="modal-body">
        <div style="margin-bottom:12px;font-size:13px;color:var(--txt3);">${recs.length} título(s) registrado(s)</div>
        <div id="palm-cell-list" style="display:flex;flex-direction:column;gap:6px;max-height:46vh;overflow:auto;">
          ${recs.length === 0
            ? `<div style="padding:14px;text-align:center;color:var(--txt3);border:1px dashed var(--brd);border-radius:var(--r);">Sin títulos aún en esta competición.</div>`
            : recs.map(r => `
                <div class="palm-rec-row" data-id="${r.id}" style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);">
                  ${renderTrophy(comp.key, 22)}
                  <span style="flex:1;font-size:14px;">${r.year ? `<b>${r.year}</b>` : '<span style="color:var(--txt3);">año?</span>'}${r.season ? ` · <span style="color:var(--txt2);">${_esc(r.season)}</span>` : ''}</span>
                  <button class="btn btn-xs btn-danger" onclick="deletePalmaresRecord(${r.id}, ${teamId}, '${_escAttr(compKey)}')">Quitar</button>
                </div>`).join('')}
        </div>
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--brd);display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end;">
          <div><label style="font-size:11px;color:var(--txt3);">Año</label><input type="number" id="palm-cell-year" placeholder="2024" min="1900" max="2100"></div>
          <div><label style="font-size:11px;color:var(--txt3);">Temporada</label><input type="text" id="palm-cell-season" placeholder="T1"></div>
          <button class="btn btn-primary" onclick="addPalmaresRecord(${teamId}, '${_escAttr(compKey)}')">+ Agregar</button>
        </div>
      </div>
      <div class="modal-footer"><button class="btn" onclick="closePalmaresModals()">Cerrar</button></div>
    </div>
  </div>`;
}
async function addPalmaresRecord(teamId, compKey){
  const yearRaw = document.getElementById('palm-cell-year').value.trim();
  const seasonRaw = document.getElementById('palm-cell-season').value.trim();
  const rec = { teamId, competition: compKey, createdAt: new Date().toISOString() };
  if (yearRaw) rec.year = parseInt(yearRaw);
  if (seasonRaw) rec.season = seasonRaw;
  await dbAdd('palmares', rec);
  if (typeof showToast === 'function') showToast('Título agregado');
  await openPalmaresCellEdit(teamId, compKey);
  renderAdmPalmares();
}
async function deletePalmaresRecord(recId, teamId, compKey){
  if (!confirm('¿Quitar este título del palmarés?')) return;
  await dbDelete('palmares', recId);
  if (typeof showToast === 'function') showToast('Título eliminado');
  await openPalmaresCellEdit(teamId, compKey);
  renderAdmPalmares();
}
function closePalmaresModals(){
  const wrap = document.getElementById('palmares-modal-wrap');
  if (wrap) wrap.innerHTML = '';
}
