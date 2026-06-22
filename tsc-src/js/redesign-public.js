(function(){
'use strict';
/* ===== Datos de ejemplo (clubes reales del torneo, stats plausibles) ===== */
const CLUBS = [
  { name:'Retrato Lo Retro',  ini:'RLR', color:'#8B1A1A', color2:'#1A1A1A', pj:142, win:52, tit:3, status:'activo', form:['w','w','d','l','w'] },
  { name:'Malvinas JR',       ini:'MJR', color:'#1A4A7A', color2:'#6FB1E0', pj:98,  win:51, tit:1, status:'activo', form:['w','l','w','d','w'] },
  { name:'Xeneizes FC',       ini:'XEN', color:'#003087', color2:'#FCD116', pj:112, win:39, tit:0, status:'activo', form:['l','d','l','w','d'] },
  { name:'Chapulines FC',     ini:'CHA', color:'#2E7D46', color2:'#E8C547', pj:121, win:48, tit:1, status:'activo', form:['w','w','w','d','l'] },
  { name:'AC Angeles Rojos',  ini:'AAR', color:'#C0392B', color2:'#F2F2F2', pj:161, win:50, tit:2, status:'activo', form:['d','w','l','w','w'] },
  { name:'Centinela Lima',    ini:'CLM', color:'#6C3FA0', color2:'#C9A227', pj:127, win:46, tit:1, status:'activo', form:['w','d','w','l','d'] },
  { name:'Pyramids',          ini:'PYR', color:'#C9A227', color2:'#1A1A2E', pj:132, win:42, tit:0, status:'activo', form:['l','l','w','d','w'] },
  { name:'FC Prometeus',      ini:'FCP', color:'#4A6572', color2:'#FF6B35', pj:152, win:55, tit:4, status:'activo', form:['w','w','w','w','d'] },
  { name:'Trota Mundos FC',   ini:'TRO', color:'#1F6E43', color2:'#0A3D24', pj:102, win:51, tit:0, status:'activo', form:['w','w','l','d','w'] },
  { name:'Escarlatas FC',     ini:'ESC', color:'#A32D2D', color2:'#2D0A0A', pj:134, win:40, tit:0, status:'activo', form:['l','w','d','l','w'] },
  { name:'Wakanda FC',        ini:'WAK', color:'#2B2D42', color2:'#8D99AE', pj:128, win:45, tit:0, status:'activo', form:['w','d','d','w','l'] },
  { name:'Ganen o Ban',       ini:'GOB', color:'#0B6E4F', color2:'#F7B32B', pj:131, win:46, tit:0, status:'activo', form:['w','w','d','l','w'] },
  { name:'Fenomenos FC',      ini:'FEN', color:'#388E3C', color2:'#1B5E20', pj:141, win:44, tit:0, status:'activo', form:['d','l','w','w','d'] },
  { name:'Blues FC',          ini:'BLU', color:'#1565C0', color2:'#0D47A1', pj:96,  win:48, tit:0, status:'activo', form:['w','w','w','d','w'] },
  { name:'Indep. Cordero',    ini:'IND', color:'#B71C1C', color2:'#212121', pj:129, win:42, tit:0, status:'activo', form:['l','d','l','w','l'] },
  { name:'Los Nhupis',        ini:'NHU', color:'#00897B', color2:'#004D40', pj:101, win:39, tit:0, status:'activo', form:['l','l','d','w','l'] },
  { name:'Star FC',           ini:'STR', color:'#555555', color2:'#888888', pj:160, win:42, tit:0, status:'inactivo', form:['l','l','d','l','d'] },
  { name:'Soy Tronco FC',     ini:'STF', color:'#5D4037', color2:'#8D6E63', pj:88,  win:35, tit:0, status:'inactivo', form:['l','d','l','l','w'] },
];

/* Jerarquía: COMPETICIÓN → FASES. Cada fase es 'grupos' (tabla+marcadores)
   o 'llaves' (eliminatoria a doble partido). Al cambiar de competición o de
   fase, el contenido se reemplaza in-place y todo lo de abajo reflowea. */
const COMPETICIONES = [
  { name:'1ra División', accent:'#DAA520', fases:[
    { name:'Fase de grupos', tipo:'grupos', group:'Grupo A', fecha:'Fecha 1 de 7',
      standings:[
        { pos:1, ini:'ALE', color:'#3F8F4E', name:'Atl. Lechuguero',   pj:1, v:1, e:0, p:0, gf:2, gc:0, pts:3, zone:'up'  },
        { pos:2, ini:'CHA', color:'#2E7D46', name:'Chapulines FC',     pj:1, v:1, e:0, p:0, gf:2, gc:0, pts:3, zone:'up'  },
        { pos:3, ini:'AAR', color:'#C0392B', name:'AC Angeles Rojos',  pj:1, v:0, e:1, p:0, gf:0, gc:0, pts:1, zone:''    },
        { pos:4, ini:'ESC', color:'#A32D2D', name:'Escarlatas FC',     pj:1, v:0, e:1, p:0, gf:0, gc:0, pts:1, zone:''    },
        { pos:5, ini:'PRE', color:'#5D4037', name:'FC Prehistoricos',  pj:1, v:0, e:1, p:0, gf:0, gc:0, pts:1, zone:''    },
        { pos:6, ini:'FEN', color:'#388E3C', name:'Fenomenos FC',      pj:1, v:0, e:1, p:0, gf:0, gc:0, pts:1, zone:''    },
        { pos:7, ini:'ALB', color:'#455A64', name:'Alberdi 23',        pj:1, v:0, e:0, p:1, gf:0, gc:2, pts:0, zone:'down'},
        { pos:8, ini:'AJY', color:'#1565C0', name:'Atl. Junior Yoshua',pj:1, v:0, e:0, p:1, gf:0, gc:2, pts:0, zone:'down'},
      ],
      scores:[
        { h:'Fenomenos FC',     hc:'#388E3C', hn:0, a:'AC Angeles Rojos',   ac:'#C0392B', an:0, status:'live'  },
        { h:'Chapulines FC',    hc:'#2E7D46', hn:2, a:'Atl. Junior Yoshua', ac:'#1565C0', an:0, status:'final' },
        { h:'Alberdi 23',       hc:'#455A64', hn:0, a:'Atl. Lechuguero',    ac:'#3F8F4E', an:2, status:'final' },
        { h:'FC Prehistoricos', hc:'#5D4037', hn:0, a:'Escarlatas FC',      ac:'#A32D2D', an:0, status:'final' },
      ] },
    { name:'Eliminatoria', tipo:'llaves', llaves:[
      { lbl:'Semifinal 1', estado:{cls:'final', txt:'Definida'}, rows:[
        { ini:'ALE', name:'Atl. Lechuguero', c1:'#3F8F4E', c2:'#0E3D26', ida:'2', vta:'2', glob:'4', res:'winner' },
        { ini:'AAR', name:'AC Angeles Rojos', c1:'#C0392B', c2:'#2D0A0A', ida:'1', vta:'2', glob:'3', res:'loser' },
      ] },
      { lbl:'Semifinal 2', estado:{cls:'pending', txt:'Vuelta · Vie 13 · 21:00'}, rows:[
        { ini:'CHA', name:'Chapulines FC', c1:'#2E7D46', c2:'#0E3D26', ida:'1', vta:'–', glob:'1', res:'' },
        { ini:'FEN', name:'Fenomenos FC', c1:'#388E3C', c2:'#0A1018', ida:'1', vta:'–', glob:'1', res:'' },
      ] },
    ] },
  ] },
  { name:'2da División', accent:'#CD7F32', fases:[
    { name:'Fase de grupos', tipo:'grupos', group:'Grupo B', fecha:'Fecha 3 de 7',
      standings:[
        { pos:1, ini:'BLU', color:'#1565C0', name:'Blues FC',            pj:3, v:3, e:0, p:0, gf:9, gc:1, pts:9, zone:'up'  },
        { pos:2, ini:'CLM', color:'#6C3FA0', name:'Centinela Lima',      pj:3, v:2, e:0, p:1, gf:6, gc:4, pts:6, zone:'up'  },
        { pos:3, ini:'SMM', color:'#7B1FA2', name:'San Martin de Mendoza',pj:3, v:1, e:1, p:1, gf:4, gc:4, pts:4, zone:''   },
        { pos:4, ini:'FKT', color:'#00897B', name:'FK Tupadre',          pj:3, v:1, e:0, p:2, gf:3, gc:6, pts:3, zone:''    },
        { pos:5, ini:'BOC', color:'#1565C0', name:'Boca JR 98',          pj:3, v:0, e:1, p:2, gf:2, gc:5, pts:1, zone:'down'},
        { pos:6, ini:'WAK', color:'#1F2436', name:'Wakanda FC',          pj:3, v:0, e:0, p:3, gf:1, gc:5, pts:0, zone:'down'},
      ],
      scores:[
        { h:'Blues FC',  hc:'#1565C0', hn:7, a:'San Martin de Mendoza', ac:'#7B1FA2', an:0, status:'final' },
        { h:'Centinela Lima', hc:'#6C3FA0', hn:3, a:'FK Tupadre',       ac:'#00897B', an:1, status:'final' },
        { h:'Boca JR 98', hc:'#1565C0', hn:1, a:'Wakanda FC',           ac:'#1F2436', an:1, status:'live'  },
      ] },
    { name:'Playoffs permanencia', tipo:'llaves', llaves:[
      { lbl:'Llave 1 · Permanencia', estado:{cls:'final', txt:'Definida'}, rows:[
        { ini:'TRO', name:'Trota Mundos FC', c1:'#1F6E43', c2:'#0A3D24', ida:'2', vta:'1', glob:'3', res:'winner' },
        { ini:'ESC', name:'Escarlatas FC',   c1:'#A32D2D', c2:'#2D0A0A', ida:'1', vta:'1', glob:'2', res:'loser' },
      ] },
      { lbl:'Llave 2 · Permanencia', estado:{cls:'pending', txt:'Vuelta · Jue 12 · 21:00'}, rows:[
        { ini:'LTA', name:'La Tocata AS',     c1:'#1B7A4A', c2:'#0E3D26', ida:'0', vta:'–', glob:'0', res:'' },
        { ini:'PRE', name:'FC Prehistoricos', c1:'#5D4037', c2:'#2D1A12', ida:'2', vta:'–', glob:'2', res:'' },
      ] },
    ] },
  ] },
  { name:'Copa del Emperador', accent:'#E8C97A', fases:[
    { name:'Fase de grupos', tipo:'grupos', group:'Grupo Único', fecha:'Fecha 2 de 3',
      standings:[
        { pos:1, ini:'LTA', color:'#1B7A4A', name:'La Tocata AS',  pj:2, v:2, e:0, p:0, gf:5, gc:1, pts:6, zone:'up' },
        { pos:2, ini:'JNR', color:'#E8C01D', name:'Junior',        pj:2, v:1, e:0, p:1, gf:3, gc:3, pts:3, zone:'up' },
        { pos:3, ini:'YUN', color:'#D12C2C', name:'Yunaited FC',   pj:2, v:1, e:0, p:1, gf:2, gc:2, pts:3, zone:''   },
        { pos:4, ini:'RED', color:'#CF1414', name:'Reds LFC',      pj:2, v:0, e:0, p:2, gf:1, gc:5, pts:0, zone:'down'},
      ],
      scores:[
        { h:'La Tocata AS', hc:'#1B7A4A', hn:3, a:'Reds LFC', ac:'#CF1414', an:0, status:'final' },
        { h:'Junior',       hc:'#E8C01D', hn:2, a:'Yunaited FC', ac:'#D12C2C', an:2, status:'final' },
      ] },
    { name:'Final', tipo:'llaves', llaves:[
      { lbl:'Gran Final', estado:{cls:'pending', txt:'Dom 15 · 20:00'}, rows:[
        { ini:'LTA', name:'La Tocata AS', c1:'#1B7A4A', c2:'#0E3D26', ida:'–', vta:'–', glob:'–', res:'' },
        { ini:'JNR', name:'Junior',       c1:'#E8C01D', c2:'#1F4E8C', ida:'–', vta:'–', glob:'–', res:'' },
      ] },
    ] },
  ] },
  { name:'Liga de Campeones', accent:'#EAEAEA', fases:[
    { name:'Final', tipo:'grupos', group:'Final', fecha:'Partido único',
      standings:[
        { pos:1, ini:'JNR', color:'#E8C01D', name:'Junior',       pj:1, v:1, e:0, p:0, gf:2, gc:1, pts:3, zone:'up' },
        { pos:2, ini:'DBR', color:'#C0392B', name:'Diablos Rojos',pj:1, v:0, e:0, p:1, gf:1, gc:2, pts:0, zone:'down'},
      ],
      scores:[
        { h:'Junior', hc:'#E8C01D', hn:2, a:'Diablos Rojos', ac:'#C0392B', an:1, status:'final' },
      ] },
  ] },
];
let _ci = 0, _fi = 0;

const METRO = [
  { d:'LUN 8',  cls:'has',   matches:[{t:'21:00', a:'CHA', ac:'#2E7D46', b:'AJY', bc:'#1565C0', txt:'Chapulines 2-0 Atl. J. Yoshua', comp:'1RA DIV'}] },
  { d:'MAR 9',  cls:'empty', matches:[] },
  { d:'MIÉ 10 · HOY', cls:'today has', matches:[
      {t:'EN VIVO', a:'FEN', ac:'#388E3C', b:'AAR', bc:'#C0392B', txt:'Fenomenos 0-0 AC Angeles Rojos', comp:'1RA DIV', live:true},
      {t:'21:00', a:'TRO', ac:'#1F6E43', b:'ESC', bc:'#A32D2D', txt:'Trota Mundos vs Escarlatas', comp:'PLAY OFFS'}
  ]},
  { d:'JUE 11', cls:'empty', matches:[] },
  { d:'VIE 12', cls:'has',  matches:[
      {t:'20:00', a:'LTA', ac:'#1B7A4A', b:'PRE', bc:'#5D4037', txt:'La Tocata vs FC Prehistoricos', comp:'PLAY OFFS'},
      {t:'22:00', a:'BLU', ac:'#1565C0', b:'CLM', bc:'#6C3FA0', txt:'Blues FC vs Centinela Lima', comp:'2DA DIV'}
  ]},
];

const HIST_TABLE = [
  { pos:1, ini:'FCP', tc:'#4A6572', name:'FC Prometeus',     pj:152, pts:251, rend:55.0 },
  { pos:2, ini:'AAR', tc:'#C0392B', name:'AC Angeles Rojos', pj:161, pts:242, rend:50.1 },
  { pos:3, ini:'RLR', tc:'#8B1A1A', name:'Retrato Lo Retro', pj:142, pts:223, rend:52.3 },
  { pos:4, ini:'AJY', tc:'#1565C0', name:'Atl. Junior Yoshua',pj:134, pts:222, rend:55.2 },
  { pos:5, ini:'STR', tc:'#555555', name:'Star',             pj:160, pts:204, rend:42.5 },
  { pos:6, ini:'EXR', tc:'#B71C1C', name:'Expreso Rojo',     pj:123, pts:197, rend:53.4 },
  { pos:7, ini:'FEN', tc:'#388E3C', name:'Fenomenos FC',     pj:141, pts:187, rend:44.2 },
  { pos:8, ini:'GOB', tc:'#0B6E4F', name:'Ganen O Ban',      pj:131, pts:181, rend:46.1 },
];

const TICKER = [
  { comp:'1RA DIV', txt:'CHAPULINES <b>2-0</b> ATL. J. YOSHUA' },
  { comp:'1RA DIV', txt:'ALBERDI 23 <b>0-2</b> ATL. LECHUGUERO' },
  { comp:'2DA DIV', txt:'CENTINELA LIMA <b>3-1</b> FK TUPADRE' },
  { comp:'2DA DIV', txt:'BLUES FC <b>7-0</b> SAN MARTIN DE MENDOZA' },
  { comp:'COPA YUNA', txt:'FC PROMETEUS <b>1-0</b> WAKANDA FC' },
  { comp:'PLAY OFFS', txt:'HOY 21:00 · TROTA MUNDOS VS ESCARLATAS' },
];

/* ===== Render ===== */
function esc(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// Ticker — boot movido a initRedesignPublic()

// Clubes — vitrina aleatoria de 6 activos, "cargar más" añade otros 6.
const CLUBS_BATCH = 6;
let _clubPool = [];
let _clubShown = 0;

function clubCardHTML(c){
  const c2 = c.color2 || c.color;
  return `
  <div class="club-stage">
  <div class="club-card" style="--team-color:${c.color};--team-color-2:${c2};">
    <div class="club-band">
      <div class="club-crest">${c.ini}</div>
      <div class="club-name">${esc(c.name)}</div>
    </div>
    <div class="club-body">
      <div class="club-stats">
        <div class="club-stat"><b>${c.pj}</b><span>Partidos</span></div>
        <div class="club-stat"><b>${c.win}%</b><span>Victorias</span></div>
        <div class="club-stat"><b class="gold">${c.tit}</b><span>Títulos</span></div>
      </div>
      <div class="club-foot">
        <span class="fs-lbl">Forma</span>
        <div class="form-strip">${c.form.map(f =>
          `<span class="form-pip ${f}">${f==='w'?'V':f==='d'?'E':'D'}</span>`).join('')}</div>
      </div>
    </div>
  </div>
  </div>`;
}

function _shuffle(a){ const r=[...a]; for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]];} return r; }

function _appendClubs(list){
  const grid = document.getElementById('clubs-grid');
  const start = grid.children.length;
  grid.insertAdjacentHTML('beforeend', list.map(clubCardHTML).join(''));
  const freshStages = [...grid.children].slice(start);
  // Anima la tarjeta interna (no el escenario): así el transform inline del stagger
  // no pisa el lift de hover, que vive en .club-stage.
  const freshCards = freshStages.map(s => s.querySelector('.club-card'));
  MOTION.stagger(freshCards, { step: 55 });
  freshCards.forEach(card => card.querySelectorAll('.club-stat b').forEach(b => {
    const raw = b.textContent; const n = parseInt(raw); if (isNaN(n)) return;
    MOTION.countUp(b, n, { dur: 900, suffix: raw.includes('%') ? '%' : '' });
  }));
}

function initClubs(){
  const actives = CLUBS.filter(c => (c.status||'activo') === 'activo');
  _clubPool = _shuffle(actives);
  _clubShown = 0;
  document.getElementById('clubs-grid').innerHTML = '';
  loadMoreClubs(true);
}

/* V1 «Reflector»: el foco (radial en color del club) sigue al cursor dentro de
   cada tarjeta. Delegado en document → vale para tarjetas añadidas con «cargar más». */
(() => {
  if (MOTION.reduced() || !matchMedia('(pointer:fine)').matches) return;
  document.addEventListener('pointermove', e => {
    const card = e.target.closest && e.target.closest('.club-card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive:true });
})();

function loadMoreClubs(first){
  const btn = document.getElementById('load-more');
  const next = _clubPool.slice(_clubShown, _clubShown + CLUBS_BATCH);
  if (!next.length) return;
  const render = () => {
    _appendClubs(next);
    _clubShown += next.length;
    if (btn) btn.classList.remove('loading');
    if (_clubShown >= _clubPool.length)
      document.getElementById('load-more-wrap').style.display = 'none';
  };
  if (first) { render(); return; }
  btn.classList.add('loading');
  setTimeout(render, 500);
}

// initClubs() — boot movido a initRedesignPublic()

// Filas de clasificación de una competición
function _standRowsHTML(standings){
  return standings.map(r => `
  <div class="stand-row ${r.zone==='up'?'zone-up':r.zone==='down'?'zone-down':''}" style="--team-color:${r.color};">
    <span class="st-fix">
      <span class="st-pos">${r.pos}</span>
      <span class="st-crest" style="background:${r.color};">${r.ini}</span>
      <span class="st-name">${esc(r.name)}</span>
    </span>
    <span class="st-c">${r.pj}</span>
    <span class="st-c">${r.v}</span>
    <span class="st-c">${r.e}</span>
    <span class="st-c">${r.p}</span>
    <span class="st-c">${r.gf}</span>
    <span class="st-c">${r.gc}</span>
    <span class="st-pts">${r.pts}</span>
  </div>`).join('');
}
// Marcadores de una competición (EN VIVO primero)
function _scoreRowsHTML(scores){
  return scores.map(s => `
  <div class="score-row" style="--team-color:${s.hc};">
    <div class="score-edge"></div>
    <div class="score-body">
      <span class="score-team">${esc(s.h)}</span>
      <div class="score-nums">
        <span class="score-n ${s.hn<s.an?'lose':''}">${s.hn}</span>
        ${s.status==='live'
          ? '<span class="chip chip-live"><span class="chip-dot"></span>En vivo</span>'
          : '<span class="chip chip-final">Final</span>'}
        <span class="score-n ${s.an<s.hn?'lose':''}">${s.an}</span>
      </div>
      <span class="score-team away">${esc(s.a)}</span>
    </div>
    <div class="score-edge" style="--team-color:${s.ac};"></div>
  </div>`).join('');
}
// Difuminado de bordes de la tabla según el scroll horizontal
function _bindStandFade(){
  const sc = document.getElementById('stand-scroll');
  if (!sc) return;
  const card = sc.closest('.stand-card');
  const upd = () => {
    card.classList.toggle('more-r', sc.scrollLeft + sc.clientWidth < sc.scrollWidth - 2);
    card.classList.toggle('more-l', sc.scrollLeft > 2);
  };
  sc.addEventListener('scroll', upd, { passive:true });
  window.addEventListener('resize', upd);
  upd();
}
// Render de una fase de grupos (tabla estilo Google + marcadores)
function _gruposHTML(f){
  return `
    <div class="comps-duo">
      <div class="stand-card">
        <div class="stand-hdr">
          <span class="stand-title">${esc(f.group)}</span>
          <span class="chip chip-today">${esc(f.fecha)}</span>
        </div>
        <div class="stand-scrollwrap">
          <div class="stand-scroll" id="stand-scroll">
            <div class="stand-grid">
              <div class="stand-colhead" aria-hidden="true">
                <span class="st-fix">Club</span>
                <span>PJ</span><span>G</span><span>E</span><span>P</span>
                <span>GF</span><span>GC</span><span class="st-ph">PTS</span>
              </div>
              <div id="stand-rows">${_standRowsHTML(f.standings)}</div>
            </div>
          </div>
          <div class="stand-fade l"></div>
          <div class="stand-fade r"></div>
        </div>
        <div class="stand-legend">
          <span><i style="background:var(--green);"></i>Clasifica</span>
          <span><i style="background:var(--red);"></i>Nueva zona</span>
        </div>
      </div>
      <div class="scores-stack">${_scoreRowsHTML(f.scores)}</div>
    </div>`;
}
// Render de una fase eliminatoria (llaves a doble partido)
function _llavesHTML(llaves){
  return `<div class="ties-grid">` + llaves.map(k => `
    <div class="tie-card">
      <div class="tie-hdr">
        <span class="th-lbl">${esc(k.lbl)}</span>
        ${k.estado.cls==='final'
          ? `<span class="chip chip-final">${esc(k.estado.txt)}</span>`
          : `<span class="tie-pending">${esc(k.estado.txt)}</span>`}
      </div>
      <div class="tie-cols"><span></span><span>Ida</span><span>Vta</span><span>Global</span></div>
      ${k.rows.map(r => `
        <div class="tie-row ${r.res}" style="--team-color:${r.c1};--team-color-2:${r.c2};">
          <div class="tie-team"><div class="tie-crest">${esc(r.ini)}</div><span class="tie-name">${esc(r.name)}</span></div>
          <span class="tie-leg">${esc(r.ida)}</span><span class="tie-leg">${esc(r.vta)}</span><span class="tie-agg">${esc(r.glob)}</span>
        </div>`).join('')}
    </div>`).join('') + `</div>`;
}
// Contenido de la fase activa: se reemplaza in-place → todo lo de abajo reflowea
function renderFaseContent(){
  const f = COMPETICIONES[_ci].fases[_fi];
  const el = document.getElementById('comp-content');
  if (f.tipo === 'grupos'){ el.innerHTML = _gruposHTML(f); _bindStandFade(); }
  else if (f.tipo === 'llaves'){ el.innerHTML = _llavesHTML(f.llaves); }
}

/* Carrusel «una a la vez»: el activo centrado y grande, los vecinos asoman
   difuminados. Cambia con drag/swipe o clic en un vecino. Reutilizable. */
function makeCarousel(cc, getItems, onChange){
  const view = cc.querySelector('.cc-view');
  const track = cc.querySelector('.cc-track');
  let idx = 0;
  function curTx(){
    const m = new DOMMatrixReadOnly(getComputedStyle(track).transform);
    return m.m41;
  }
  function center(animate){
    const it = track.children[idx]; if (!it) return;
    const PEEK = window.innerWidth <= 560 ? 14 : 30;
    if (!animate){ track.style.transition = 'none'; }
    view.style.width = (it.offsetWidth + PEEK*2) + 'px';
    const tx = view.clientWidth/2 - (it.offsetLeft + it.offsetWidth/2);
    track.style.transform = `translateX(${tx}px)`;
    [...track.children].forEach((c,i)=>c.classList.toggle('active', i===idx));
    if (!animate){ void track.offsetWidth; track.style.transition = ''; }
  }
  function render(keepIdx){
    const items = getItems();
    track.innerHTML = items.map((t,i)=>`<button class="cc-item" data-i="${i}">${esc(t)}</button>`).join('');
    if (!keepIdx || idx >= items.length) idx = 0;
    center(false);
  }
  function set(i, fromUser){
    const n = track.children.length;
    idx = Math.max(0, Math.min(n-1, i));
    center(true);
    if (onChange) onChange(idx, fromUser);
  }
  // drag / swipe
  let down=false, x0=0, tx0=0, moved=false;
  track.addEventListener('pointerdown', e => {
    down=true; x0=e.clientX; tx0=curTx(); moved=false; track.classList.add('dragging');
    track.setPointerCapture?.(e.pointerId);
  });
  track.addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 4) moved = true;
    track.style.transform = `translateX(${tx0 + dx}px)`;
  });
  function release(){
    if (!down) return; down=false; track.classList.remove('dragging');
    // snap al item cuyo centro quede más cerca del centro del view
    const point = view.clientWidth/2 - curTx();
    let best=0, bd=Infinity;
    [...track.children].forEach((c,i)=>{ const cc2=c.offsetLeft+c.offsetWidth/2; const d=Math.abs(cc2-point); if(d<bd){bd=d;best=i;} });
    set(best, true);
  }
  track.addEventListener('pointerup', release);
  track.addEventListener('pointercancel', release);
  // clic directo en un vecino visible
  track.addEventListener('click', e => {
    const it = e.target.closest('.cc-item');
    if (it && !moved) set(+it.dataset.i, true);
  });
  window.addEventListener('resize', () => center(false));
  return { render, set, get idx(){ return idx; } };
}

// Carruseles de fases / competiciones / historial: las instancias se construyen
// en initRedesignPublic() (makeCarousel toca el DOM del prototipo al crearse).
// Las variables siguen siendo globales para que el resto del módulo las vea.
let faseCarousel, compCarousel, histCarousel;
// boot (construcción + render) movido a initRedesignPublic()

// Línea de metro (calendario semanal) — boot movido a initRedesignPublic()
// Tabla histórica con barras de rendimiento — boot movido a initRedesignPublic()

/* ===== 07 · Lista de partidos: nº arriba, equipos a lo ancho ===== */
const MATCHES = [
  { id:2164, h:'FK Tupadre',            hn:2, a:'Blues FC',              an:0 },
  { id:2163, h:'FK Tupadre',            hn:0, a:'San Martin de Mendoza', an:2 },
  { id:2162, h:'Blues FC',              hn:7, a:'San Martin de Mendoza', an:0 },
  { id:2161, h:'AC Angeles Rojos',      hn:0, a:'San Martin de Mendoza', an:1 },
  { id:2160, h:'San Martin de Mendoza', hn:1, a:'Boca JR 98',           an:0 },
];
// histm innerHTML — boot movido a initRedesignPublic()

/* ===== 07 · H2H con autocompletado: escribe dos equipos y se cruza su
   historial. Datos mock pero deterministas (mismo par → mismo registro). ===== */
const TEAMS = [
  { ini:'RLR', name:'Retrato Lo Retro',      c1:'#8B1A1A', c2:'#1A1A1A' },
  { ini:'AAR', name:'AC Angeles Rojos',      c1:'#C0392B', c2:'#F2F2F2' },
  { ini:'LTA', name:'La Tocata AS',          c1:'#1B7A4A', c2:'#0E3D26' },
  { ini:'AJY', name:'Atl. Junior Yoshua',    c1:'#1565C0', c2:'#0D47A1' },
  { ini:'FCP', name:'FC Prometeus',          c1:'#4A6572', c2:'#FF6B35' },
  { ini:'ALE', name:'Atl. Lechuguero',       c1:'#3F8F4E', c2:'#0E3D26' },
  { ini:'CHA', name:'Chapulines FC',         c1:'#2E7D46', c2:'#0E3D26' },
  { ini:'ESC', name:'Escarlatas FC',         c1:'#A32D2D', c2:'#1A1A1A' },
  { ini:'PRE', name:'FC Prehistoricos',      c1:'#5D4037', c2:'#2D1A12' },
  { ini:'FEN', name:'Fenomenos FC',          c1:'#388E3C', c2:'#0A1018' },
  { ini:'ALB', name:'Alberdi 23',            c1:'#455A64', c2:'#1A1A1A' },
  { ini:'BLU', name:'Blues FC',              c1:'#1565C0', c2:'#0D47A1' },
  { ini:'TRO', name:'Trota Mundos FC',       c1:'#1F6E43', c2:'#0A3D24' },
  { ini:'SMM', name:'San Martin de Mendoza', c1:'#7B1FA2', c2:'#2A0E3D' },
  { ini:'CLM', name:'Centinela Lima',        c1:'#6C3FA0', c2:'#1A1A1A' },
  { ini:'BOC', name:'Boca JR 98',            c1:'#1565C0', c2:'#E8C01D' },
  { ini:'FKT', name:'FK Tupadre',            c1:'#00897B', c2:'#1A1A1A' },
];
function _h2hData(a, b){
  const [x, y] = [a, b].slice().sort((p, q) => p.ini < q.ini ? -1 : 1);
  let seed = 7; for (const ch of (x.ini + y.ini)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const total = 6 + seed % 12;
  const wx = seed % (total + 1);
  const wy = (seed >>> 5) % (total + 1 - wx);
  const draws = total - wx - wy;
  return a === x ? { total, wa:wx, wb:wy, draws } : { total, wa:wy, wb:wx, draws };
}
function _h2hMark(name, q){
  const i = name.toLowerCase().indexOf(q);
  if (i < 0) return esc(name);
  return esc(name.slice(0, i)) + '<mark>' + esc(name.slice(i, i + q.length)) + '</mark>' + esc(name.slice(i + q.length));
}
(function setupH2H(){
  const inA = document.getElementById('h2h-a'), inB = document.getElementById('h2h-b');
  const acA = document.getElementById('h2h-ac-a'), acB = document.getElementById('h2h-ac-b');
  const result = document.getElementById('h2h-result'), hint = document.getElementById('h2h-hint');
  if (!inA || !inB || !acA || !acB || !result || !hint) return;   // markup del prototipo ausente
  let pickA = null, pickB = null;

  function render(){
    if (pickA && pickB && pickA !== pickB){
      const d = _h2hData(pickA, pickB);
      result.innerHTML = `
        <div class="h2h-face">
          <div class="h2h-side" style="--team-color:${pickA.c1};--team-color-2:${pickA.c2};">
            <div class="h2h-crest">${pickA.ini}</div><div class="h2h-name">${esc(pickA.name)}</div>
          </div>
          <div class="h2h-vs">VS</div>
          <div class="h2h-side" style="--team-color:${pickB.c1};--team-color-2:${pickB.c2};">
            <div class="h2h-crest">${pickB.ini}</div><div class="h2h-name">${esc(pickB.name)}</div>
          </div>
        </div>
        <div class="h2h-record">${d.total} duelos · <b>${d.wa}</b> ${esc(pickA.ini)} · <b>${d.draws}</b> empates · <b>${d.wb}</b> ${esc(pickB.ini)}</div>`;
      result.classList.add('show');
      hint.style.display = 'none';
    } else {
      result.classList.remove('show');
      hint.style.display = '';
    }
  }

  function wire(input, ac, isA){
    input.addEventListener('input', () => {
      if (isA) pickA = null; else pickB = null;
      render();
      const q = input.value.trim().toLowerCase();
      const other = isA ? pickB : pickA;
      const matches = q ? TEAMS.filter(t => t.name.toLowerCase().includes(q) && t !== other).slice(0, 6) : [];
      if (!matches.length){ ac.classList.remove('show'); ac.innerHTML = ''; return; }
      ac.innerHTML = matches.map(t => `<div class="h2h-ac-item" style="--team-color:${t.c1};" data-ini="${t.ini}">
        <span class="h2h-ac-crest">${t.ini}</span>${_h2hMark(t.name, q)}</div>`).join('');
      ac.classList.add('show');
      ac.querySelectorAll('.h2h-ac-item').forEach(it => {
        it.addEventListener('mousedown', e => {   // mousedown corre antes del blur
          e.preventDefault();
          const t = TEAMS.find(x => x.ini === it.dataset.ini);
          if (isA) pickA = t; else pickB = t;
          input.value = t.name;
          ac.classList.remove('show'); ac.innerHTML = '';
          render();
        });
      });
    });
    input.addEventListener('blur', () => setTimeout(() => ac.classList.remove('show'), 120));
    input.addEventListener('focus', () => { if (ac.innerHTML) ac.classList.add('show'); });
  }
  wire(inA, acA, true);
  wire(inB, acB, false);

  // Llamado desde el botón «Ver enfrentamientos» del hero: rellena el mano a mano con
  // los dos equipos del próximo partido y lleva la vista a esa tarjeta (sin buscar a mano).
  window.h2hShow = (iniA, iniB) => {
    const ta = TEAMS.find(t => t.ini === iniA), tb = TEAMS.find(t => t.ini === iniB);
    if (!ta || !tb) return;
    pickA = ta; pickB = tb;
    inA.value = ta.name; inB.value = tb.name;
    acA.classList.remove('show'); acB.classList.remove('show');
    render();
    const target = document.querySelector('.h2h-frame') || result;
    if (target) target.scrollIntoView({ behavior:'smooth', block:'center' });
  };
})();

/* Hero colapsable: en desktop el :hover lo despliega. En táctil (sin hover) el tap
   alterna .open; con teclado, Enter/Espacio. Los botones internos no disparan el toggle. */
(() => {
  const hero = document.querySelector('.hm-collapsible');
  if (!hero) return;

  /* Máquina de escribir con sensación de DESCUBRIMIENTO: los textos arrancan vacíos
     (guardados en data-full), se reserva su ancho para que nada salte, y se escriben en
     cascada. Al salir el cursor se vacían otra vez → cada hover lo regenera de cero. */
  let _run = 0;   // token: invalida cualquier secuencia previa al re-disparar

  // Textos del despliegue en orden de jerarquía (arriba → abajo): chips → equipos → fecha → botones.
  const seqEls = () => [
    ...hero.querySelectorAll('.hm-top .chip'),
    ...hero.querySelectorAll('.hm-expand .hm-name'),
    hero.querySelector('.hm-when'),
    ...hero.querySelectorAll('.hm-cta .btn'),
  ].filter(Boolean);

  function _stash(el){ if (el && el.dataset.full === undefined) el.dataset.full = el.textContent.trim(); }
  // Reserva el ancho final (mide con el texto completo) y deja el elemento vacío y oculto.
  function _reserve(el){
    _stash(el);
    el.textContent = el.dataset.full;
    const w = Math.ceil(el.getBoundingClientRect().width);
    if (w) el.style.minWidth = w + 'px';
    el.textContent = ''; el.style.opacity = '0'; el.classList.remove('hm-typing');
  }
  function _clear(el){ _stash(el); el.textContent = ''; el.style.opacity = '0'; el.style.minWidth = ''; el.classList.remove('hm-typing'); }
  function _fill(el){ _stash(el); el.textContent = el.dataset.full; el.style.opacity = ''; el.style.minWidth = ''; el.classList.remove('hm-typing'); }

  function _type(el, speed, token){
    return new Promise(resolve => {
      if (!el) return resolve();
      el.style.opacity = '1'; el.classList.add('hm-typing');
      const full = el.dataset.full; let i = 0;
      const id = setInterval(() => {
        if (token !== _run){ clearInterval(id); return resolve(); }     // cancelado
        el.textContent = full.slice(0, ++i);
        if (i >= full.length){ clearInterval(id); el.classList.remove('hm-typing'); resolve(); }
      }, speed);
    });
  }

  async function typeIn(){
    const token = ++_run, els = seqEls();
    if (MOTION.reduced()){ els.forEach(_fill); return; }
    els.forEach(_reserve);                       // reservar espacio + ocultar (sin saltos)
    for (const el of els){ if (token !== _run) return; await _type(el, 22, token); }
  }
  function resetSeq(){ _run++; seqEls().forEach(MOTION.reduced() ? _fill : _clear); }

  // (1) Más relevante: la etiqueta «Próximo partido» se escribe al entrar el hero en vista.
  const lbl = hero.querySelector('.hm-peek-lbl');
  if (!MOTION.reduced()) _clear(lbl);
  new IntersectionObserver((ents, obs) => {
    ents.forEach(e => { if (e.isIntersecting){ MOTION.reduced() ? _fill(lbl) : (_reserve(lbl), _type(lbl, 32, _run)); obs.unobserve(e.target); } });
  }, { threshold: 0.4 }).observe(hero);

  // (2) Despliegue: arrancan vacíos y se escriben en cascada; al salir se vacían de nuevo.
  if (!MOTION.reduced()) seqEls().forEach(_clear);
  hero.addEventListener('mouseenter', typeIn);
  hero.addEventListener('mouseleave', resetSeq);
  hero.addEventListener('focusin', typeIn);
  hero.addEventListener('focusout', e => { if (!hero.contains(e.relatedTarget)) resetSeq(); });

  const toggle = () => {
    const open = hero.classList.toggle('open');
    hero.setAttribute('aria-expanded', open ? 'true' : 'false');
    open ? typeIn() : resetSeq();
  };
  hero.addEventListener('click', e => {
    if (e.target.closest('.hm-cta')) return;          // dejar pasar los botones
    if (matchMedia('(hover:none)').matches) toggle();  // solo en táctil
  });
  hero.addEventListener('keydown', e => {
    if (e.target.closest('.hm-cta')) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });
})();

/* Navegación de secciones (dentro del topbar): indicador deslizante dorado→verde,
   scroll suave al hacer clic, scrollspy, y auto-centrado del botón activo en la pista
   cuando hay overflow (los que no caben quedan tras el fade de los bordes). */
(() => {
  const nav = document.querySelector('.topbar-nav');
  const track = document.getElementById('tn-track');
  if (!nav || !track) return;
  const items = [...nav.querySelectorAll('.sec-nav-btn')];
  const ind = document.getElementById('sec-nav-ind');
  const CHROME = 82;             // topbar 48 + ticker 34
  let lock = 0;                  // ignora el scrollspy justo tras un clic
  const moveInd = btn => { ind.style.left = btn.offsetLeft + 'px'; ind.style.width = btn.offsetWidth + 'px'; };
  const ensureVisible = btn => track.scrollTo({
    left: btn.offsetLeft - track.clientWidth / 2 + btn.offsetWidth / 2,
    behavior: MOTION.reduced() ? 'auto' : 'smooth' });
  const setActive = btn => { if (!btn) return; items.forEach(b => b.classList.toggle('active', b === btn)); moveInd(btn); ensureVisible(btn); };
  items.forEach(btn => btn.addEventListener('click', () => {
    setActive(btn); lock = Date.now();
    const sec = document.getElementById(btn.dataset.target);
    if (sec) window.scrollTo({ top: sec.getBoundingClientRect().top + scrollY - CHROME - 12,
      behavior: MOTION.reduced() ? 'auto' : 'smooth' });
  }));
  requestAnimationFrame(() => setActive(items.find(b => b.classList.contains('active')) || items[0]));
  addEventListener('resize', () => { const a = items.find(b => b.classList.contains('active')); if (a) moveInd(a); });
  const spy = new IntersectionObserver(ents => {
    if (Date.now() < lock + 700) return;
    ents.forEach(e => { if (e.isIntersecting) setActive(items.find(b => b.dataset.target === e.target.id)); });
  }, { rootMargin: `-${CHROME + 8}px 0px -55% 0px`, threshold: 0 });
  items.map(b => document.getElementById(b.dataset.target)).filter(Boolean).forEach(s => spy.observe(s));
})();

/* ===== Motion ===== */
// MOTION.countdown / data-reveal / revealAll / ticker — boot movido a initRedesignPublic()
// Las filas de la tabla se regeneran al cambiar de competición: sin reveal
// (si no, quedan a medio animar). Se muestran completas siempre.

// Count-up de hitos del historial al entrar en viewport
const hitoIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const b = e.target.querySelector('b[data-n]');
    if (b && !b._done){ b._done = true; MOTION.countUp(b, parseInt(b.dataset.n), { dur: 1400 }); }
    hitoIO.unobserve(e.target);
  });
}, { threshold: 0.4 });
// hitoIO observe — boot movido a initRedesignPublic()

// Barras de rendimiento de la tabla histórica al entrar en viewport
const barIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.querySelectorAll('.ht-bar i').forEach(i => { i.style.width = i.dataset.w + '%'; });
    barIO.unobserve(e.target);
  });
}, { threshold: 0.2 });
// barIO observe — boot movido a initRedesignPublic()

/* ===== 01 · Palmarés — LA SALA (umbral 2D → fotorrealismo) ===== */
/* Cada competición tiene su copa GLB propia y su lista de campeones.
   Swipe ↑/↓ navega campeones · swipe ←/→ navega competiciones. */
const COMPS = [
  { name:'TSC 1RA DIVISIÓN', cup:'assets/copas/copa_1.glb', champions:[
    { name:'RETRATO LO RETRO',   ini:'RLR', ed:'Campeón · T1 · PES 4', c1:'#8B1A1A', c2:'#1A1A1A' },
    { name:'LA TOCATA AS',       ini:'LTA', ed:'Campeón · T1 · PES 3', c1:'#1B7A4A', c2:'#0E3D26' },
    { name:'ATL. JUNIOR YOSHUA', ini:'AJY', ed:'Campeón · T1 · PES 2', c1:'#1565C0', c2:'#0D47A1' },
    { name:'AC ANGELES ROJOS',   ini:'AAR', ed:'Campeón · T1 · PES 5', c1:'#C0392B', c2:'#F2F2F2' },
    { name:'FC PROMETEUS',       ini:'FCP', ed:'Campeón · T1 · PES 6', c1:'#4A6572', c2:'#FF6B35' },
  ]},
  { name:'COPA DEL EMPERADOR', cup:'assets/copas/copa_2.glb', champions:[
    { name:'LA TOCATA AS',       ini:'LTA', ed:'Campeón · T1 · PES 4', c1:'#1B7A4A', c2:'#0E3D26' },
    { name:'JUNIOR',             ini:'JNR', ed:'Campeón · T1 · PES 3', c1:'#E8C01D', c2:'#1F4E8C' },
    { name:'YUNAITED FC',        ini:'YUN', ed:'Campeón · T1 · PES 2', c1:'#D12C2C', c2:'#F1C40F' },
    { name:'REDS LFC',           ini:'RED', ed:'Campeón · T1 · PES 5', c1:'#CF1414', c2:'#F6EB61' },
  ]},
  { name:'SUPER COPA', cup:'assets/copas/copa_3.glb', champions:[
    { name:'LA TOCATA AS',       ini:'LTA', ed:'Campeón · T1 · PES 4', c1:'#1B7A4A', c2:'#0E3D26' },
    { name:'JUNIOR',             ini:'JNR', ed:'Campeón · T1 · PES 3', c1:'#E8C01D', c2:'#1F4E8C' },
    { name:'REDS LFC',           ini:'RED', ed:'Campeón · T1 · PES 5', c1:'#CF1414', c2:'#F6EB61' },
  ]},
  { name:'LIGA DE CAMPEONES', cup:'assets/copas/copa_4.glb', champions:[
    { name:'JUNIOR',             ini:'JNR', ed:'Campeón · T1 · PES 4', c1:'#E8C01D', c2:'#1F4E8C' },
    { name:'DIABLOS ROJOS',      ini:'DBR', ed:'Campeón · T1 · PES 3', c1:'#C0392B', c2:'#1A1A1A' },
  ]},
  { name:'TSC 2DA DIVISIÓN', cup:'assets/copas/copa_5.glb', champions:[
    { name:'RIVER PLATE 96',     ini:'RIV', ed:'Campeón · T1 · PES 4', c1:'#E9EEF5', c2:'#D12C2C' },
    { name:'NEOHALCONES SOLARES',ini:'NHS', ed:'Campeón · T1 · PES 3', c1:'#F1C40F', c2:'#E67E22' },
    { name:'SARNOSAS',           ini:'SAR', ed:'Campeón · T1 · PES 2', c1:'#95A5A6', c2:'#2C3E50' },
    { name:'SHOHOKU',            ini:'SHO', ed:'Campeón · T1 · PES 5', c1:'#D93434', c2:'#1A1A1A' },
  ]},
];
let _compIdx = 0, _champIdx = 0;
const curComp   = () => COMPS[_compIdx];
const curChamps = () => COMPS[_compIdx].champions;
const curChamp  = () => COMPS[_compIdx].champions[_champIdx];

/* Colores → luz: un color muy oscuro apagaría la sala; se sube su luminosidad */
function hexToRgba(hex, a){
  const h = (hex || '#ffffff').replace('#','');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c+c).join('') : h, 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}
function lightenForLight(hex){
  const h = (hex || '#ffffff').replace('#','');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c+c).join('') : h, 16);
  let r = (n>>16)&255, g = (n>>8)&255, b = n&255;
  const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
  if (lum < 0.38){
    const k = (0.38 - lum) / Math.max(0.02, 1 - lum);
    r = Math.round(r + (255-r)*k); g = Math.round(g + (255-g)*k); b = Math.round(b + (255-b)*k);
  }
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
}

/* Nombre de competición + dots de campeón (estilo stories) */
function _renderComp(){
  document.getElementById('sala-comp').textContent = curComp().name;
  document.getElementById('sala-dots').innerHTML = curChamps().map((_, i) =>
    `<span class="sala-dot${i === _champIdx ? ' on' : ''}"></span>`).join('');
}
function _syncDots(){
  document.querySelectorAll('#sala-dots .sala-dot').forEach((d, i) =>
    d.classList.toggle('on', i === _champIdx));
}

function _renderChamp(){
  const c = curChamp();
  document.getElementById('sala-plate-txt').innerHTML =
    `<b>${esc(c.name)}</b><small>${esc(c.ed.toUpperCase())}</small>`;
  document.getElementById('sala-champ').textContent =
    `${c.name} — ${c.ed.replace('Campeón · ','')}`;
  // Los focos de la foto visten los dos colores del club
  const sala = document.getElementById('sala');
  const L = lightenForLight(c.c1), R = lightenForLight(c.c2);
  sala.style.setProperty('--beam-l', hexToRgba(L, 0.85));
  sala.style.setProperty('--beam-l-soft', hexToRgba(L, 0.22));
  sala.style.setProperty('--beam-r', hexToRgba(R, 0.85));
  sala.style.setProperty('--beam-r-soft', hexToRgba(R, 0.22));
  sala.style.setProperty('--haze-l', hexToRgba(L, 0.42));
  sala.style.setProperty('--haze-r', hexToRgba(R, 0.42));
  sala.style.setProperty('--spark-l', hexToRgba(L, 0.94));
  sala.style.setProperty('--spark-r', hexToRgba(R, 0.94));
  CUP.setLights(L, R);
  _syncDots();
  if (sala.classList.contains('open')) _startCollage();
}
/* Campeón: swipe ↑ siguiente, ↓ anterior (cíclico dentro de la competición) */
function salaPickChamp(i){
  const n = curChamps().length;
  _champIdx = ((i % n) + n) % n;
  _renderChamp();
}
function salaNextChamp(){ salaPickChamp(_champIdx + 1); }
function salaPrevChamp(){ salaPickChamp(_champIdx - 1); }
/* Competición: swipe ← siguiente, → anterior. Recarga la copa GLB y resetea
   al campeón vigente de esa competición. */
function salaPickComp(i){
  const n = COMPS.length;
  _compIdx = ((i % n) + n) % n;
  _champIdx = 0;
  CUP.setCup(curComp().cup);
  _renderComp();
  _renderChamp();
}
function salaNextComp(){ salaPickComp(_compIdx + 1); }
function salaPrevComp(){ salaPickComp(_compIdx - 1); }

/* ---- Collage dinámico: máx 3 momentos en la pared del fondo. Derivan en
   sentido contrario al giro de la copa (la copa gira hacia la derecha →
   las fotos viajan hacia la izquierda) y se desvanecen para cargar
   las siguientes. Placeholders con los colores del club hasta tener fotos. */
/* Slots sesgados a la PARED del fondo (y bajos): ahora que las fotos viven
   detrás del piso/podio, las mantenemos en la banda superior para que asomen
   tras la copa y el podio en vez de quedar ocultas bajo el suelo. */
const COLLAGE_SLOTS = [
  { x: -3, y: 6,  r:-7, dx:-92, dy:-8,  spin:-7, dur:7600, peak:.80 },
  { x: 20, y: -4, r: 3, dx:-54, dy: 10, spin: 5, dur:9300, peak:.74 },
  { x: 50, y: 2,  r:-3, dx:-74, dy:-6,  spin:-4, dur:8200, peak:.78 },
  { x: 66, y: 14, r: 5, dx:-48, dy: 14, spin: 6, dur:10100, peak:.72 },
  { x: 6,  y: 26, r: 4, dx:-66, dy:-10, spin: 4, dur:8700, peak:.70 },
  { x: 36, y: 22, r:-5, dx:-40, dy: 8,  spin:-6, dur:9700, peak:.70 },
];
const SHOT_DUR = 8700;
const MAX_SHOTS = 7;   // tope duro de fotos simultáneas (evita acumulación/lag)
let _collageTimers = [], _shotSeq = 0;

function _champShots(c){
  if (c._shots) return c._shots;
  c._shots = [0,1,2,3,4].map(i => {
    const cv = document.createElement('canvas'); cv.width = 480; cv.height = 300;
    const x = cv.getContext('2d');
    const g = x.createLinearGradient(0, 0, 480, 300);
    g.addColorStop(0, '#2a3346'); g.addColorStop(1, lightenForLight(c.c1));
    x.fillStyle = g; x.fillRect(0, 0, 480, 300);
    x.strokeStyle = 'rgba(255,255,255,0.20)'; x.lineWidth = 3; x.strokeRect(8, 8, 464, 284);
    x.fillStyle = 'rgba(255,255,255,0.30)';
    x.font = '400 130px Bebas Neue, sans-serif'; x.textAlign = 'center';
    x.fillText(c.ini, 240, 175);
    x.fillStyle = 'rgba(240,244,250,0.75)';
    x.font = '600 18px Barlow Condensed, sans-serif';
    x.fillText('MOMENTO DEL CAMPEON · ' + (i+1), 240, 252);
    return cv.toDataURL('image/jpeg', 0.85);
  });
  return c._shots;
}
function _spawnShot(slot){
  const stage = document.getElementById('sala-collage');
  if (!stage || stage.querySelectorAll('.sala-shot').length >= MAX_SHOTS) return;
  const shots = _champShots(curChamp());
  const el = document.createElement('div');
  el.className = 'sala-shot';
  el.innerHTML = `<img src="${shots[_shotSeq++ % shots.length]}" alt="">`;
  el.style.left = (slot.x + Math.random()*5 - 2.5) + '%';
  el.style.top  = (slot.y + Math.random()*6 - 3) + '%';
  stage.appendChild(el);
  if (MOTION.reduced()){ el.style.opacity = '0.65'; return; }
  const dur = (slot.dur || SHOT_DUR) + Math.random()*900 - 450;
  const driftX = (slot.dx || -60) + Math.random()*26 - 13;
  const driftY = (slot.dy || 0) + Math.random()*20 - 10;
  const r0 = (slot.r || 0) + Math.random()*5 - 2.5;
  const r1 = r0 + (slot.spin || (Math.random() > 0.5 ? 5 : -5));
  const peak = slot.peak || 0.72;
  const anim = el.animate([
    { opacity: 0,    transform: `translate3d(0,0,0) rotate(${r0}deg) scale(0.94)` },
    { opacity: peak, transform: `translate3d(${driftX*.22}px,${driftY*.22}px,0) rotate(${r0 + (r1-r0)*.22}deg) scale(0.99)`, offset: 0.16 },
    { opacity: peak, transform: `translate3d(${driftX*.76}px,${driftY*.76}px,0) rotate(${r0 + (r1-r0)*.76}deg) scale(1.04)`, offset: 0.78 },
    { opacity: 0,    transform: `translate3d(${driftX}px,${driftY}px,0) rotate(${r1}deg) scale(1.08)` },
  ], { duration: dur, easing: 'linear', fill: 'forwards' });
  anim.onfinish = () => el.remove();
}
function _startCollage(){
  _stopCollage();
  if (MOTION.reduced()){ COLLAGE_SLOTS.forEach(s => _spawnShot(s)); return; }
  COLLAGE_SLOTS.forEach((slot, i) => {
    const kick = () => {
      _spawnShot(slot);
      _collageTimers.push(setTimeout(kick, (slot.dur || SHOT_DUR) + 260 + Math.random()*900));
    };
    // entrada escalonada (no las 6 de golpe): cascada ~0.85s + el cap MAX_SHOTS
    _collageTimers.push(setTimeout(kick, i * 850 + Math.random()*300));
  });
}
function _stopCollage(){
  _collageTimers.forEach(clearTimeout); _collageTimers = [];
  document.querySelectorAll('#sala-collage .sala-shot').forEach(s => s.remove());
}

/* ---- Anclaje de copa y placa al pedestal de la foto (1672x941, cover) ----
   Medido sobre la foto: contact = fila donde la base de la copa toca el
   centro elíptico del tablero; panel = marco de madera del frente donde
   vive la placa. La cámara 3D es nivelada (sin keystone) y queda ~6° por
   encima de la base — el mismo ángulo con que la foto ve el tablero. */
/* contact = fila de la foto donde la base toca el centro del tablero (subida
   respecto al borde frontal para que la copa parezca al medio del podio).
   shiftXr = corrimiento horizontal (fracción de vw) para centrar el podio:
   se aplica al fondo Y a la copa/placa a la vez, así nunca se desalinean. */
/* Assets nuevos a 1536x1024 (sin_fondo.png = piso+podio con alfa real,
   focos.png = focos con alfa, mismo canvas → mismo ox/oy/s). Medido sobre
   sin_fondo: podio cx=744 (48.4%), tablero tope ~544, contacto copa ~568,
   cuerpo ~401px, panel marco cy≈715. focScale=1 → focos al 100% del canvas
   (mismo porte que imagen 1). shiftXr=0 → sin franja negra. */
const SALA_IMG = { w:1536, h:1024, shiftXr:0,
  // Focos anclados a fondo_completo (16:9) por la posición de su LENTE como
  // fracción del viewport → en 1080p calzan igual que la referencia, sin
  // depender del recorte cover del piso. lcx/lcy = lente dentro del recorte;
  // Lx/Ly = lente en el viewport (medido en fondo_completo). focoH = alto del
  // recorte como fracción de la altura del viewport.
  focoH:0.86,
  focoL:{img:'foco_izquierdo.png', cw:531, ch:912, lcx:0.437, lcy:0.081, Lx:0.145, Ly:0.168},
  focoR:{img:'foco_derecho.png',   cw:354, ch:912, lcx:0.352, lcy:0.102, Lx:0.807, Ly:0.168},
  ped:{ cx:744, contact:568, w:401, panel:{ cx:744, cy:715, w:330 } } };
const CUP_VIEW = { fov:30, dist:5, baseY:-0.525 };
function salaLayout(){
  const sala = document.getElementById('sala');
  const vw = sala.clientWidth, vh = sala.clientHeight;
  if (!vw || !vh) return;
  const s  = Math.max(vw / SALA_IMG.w, vh / SALA_IMG.h);
  const shiftX = vw * SALA_IMG.shiftXr;
  const ox = (vw - SALA_IMG.w * s) / 2 + shiftX, oy = (vh - SALA_IMG.h * s) / 2;
  // el fondo y el foreground usan el mismo ox/oy/s que la copa → clavados juntos.
  // Las imágenes pesadas (≈5MB) se inyectan aquí (1ª apertura) y no en el HTML/CSS,
  // así no penalizan la carga inicial del prototipo (lazy-load real).
  const bgSize = (SALA_IMG.w * s) + 'px ' + (SALA_IMG.h * s) + 'px';
  const bgPos  = ox + 'px ' + oy + 'px';
  // Pared del fondo (.sala-room) = gradiente CSS, no necesita posicionado.
  // Piso+podio (sin_fondo) y focos comparten EXACTAMENTE el mismo encuadre
  // (mismo 1536x1024 → quedan clavados entre sí). Imágenes lazy-load al abrir.
  const fg = sala.querySelector('.sala-foreground');
  if (fg){
    if (!fg.style.backgroundImage) fg.style.backgroundImage = "url('assets/sin_fondo.png')";
    fg.style.backgroundSize = bgSize;
    fg.style.backgroundPosition = bgPos;
  }
  // Focos: DOS PNG independientes (izq/der) anclados a fondo_completo por la
  // LENTE (fracción del viewport), con alto = focoH·vh. NO usan ox/oy/s (el
  // recorte cover del piso desplazaría/agrandaría los focos en 1080p y dejaría
  // de calzar con la referencia). Los haces nacen exactamente en la lente.
  const focos = sala.querySelector('.sala-focos');
  if (focos){
    const L = SALA_IMG.focoL, R = SALA_IMG.focoR, Hf = SALA_IMG.focoH;
    if (!focos.style.backgroundImage){
      focos.style.backgroundImage = "url('assets/"+L.img+"'), url('assets/"+R.img+"')";
      focos.style.backgroundRepeat = 'no-repeat, no-repeat';
    }
    const place = (f) => {
      const dh = Hf * vh, ds = dh / f.ch, dw = f.cw * ds;
      return { x0: f.Lx*vw - f.lcx*dw, y0: f.Ly*vh - f.lcy*dh, dw, dh };
    };
    const pl = place(L), pr = place(R);
    focos.style.backgroundSize =
      pl.dw+'px '+pl.dh+'px, '+pr.dw+'px '+pr.dh+'px';
    focos.style.backgroundPosition =
      pl.x0+'px '+pl.y0+'px, '+pr.x0+'px '+pr.y0+'px';
    // Lente = origen de los haces (fracción del viewport, = fondo_completo).
    sala.style.setProperty('--bl-x', (L.Lx*100).toFixed(1)+'%');
    sala.style.setProperty('--bl-y', (L.Ly*100).toFixed(1)+'%');
    sala.style.setProperty('--br-x', (R.Lx*100).toFixed(1)+'%');
    sala.style.setProperty('--br-y', (R.Ly*100).toFixed(1)+'%');
  }
  const px      = ox + SALA_IMG.ped.cx * s;
  const contact = oy + SALA_IMG.ped.contact * s;
  const pw      = SALA_IMG.ped.w * s;
  const plate = document.getElementById('sala-plate');
  const plateX = ox + SALA_IMG.ped.panel.cx * s;
  const plateW = Math.round(SALA_IMG.ped.panel.w * s * 0.82);
  plate.style.left = plateX + 'px';
  plate.style.top = (oy + SALA_IMG.ped.panel.cy * s) + 'px';
  plate.style.width = plateW + 'px';
  plate.style.setProperty('--plate-fs', Math.round(plateW * 0.105) + 'px');
  const host = document.getElementById('sala-cup');
  const cw = Math.round(pw * 1.9), ch = Math.round(pw * 1.5);
  // fila del canvas (desde arriba) donde proyecta la base de la copa
  const tanH = Math.tan(CUP_VIEW.fov * Math.PI / 360) * CUP_VIEW.dist;
  const rowFrac = (1 - CUP_VIEW.baseY / tanH) / 2;
  host.style.left = px + 'px';
  host.style.top = (contact - ch * rowFrac) + 'px';
  host.style.width = cw + 'px';
  host.style.height = ch + 'px';
  CUP.resize(cw, ch);
}
window.addEventListener('resize', () => {
  const sala = document.getElementById('sala');
  if (sala && sala.classList.contains('open')) salaLayout();
});

/* ---- Copa 3D (Three.js con carga perezosa). Sin podio propio: se posa
   sobre el pedestal real de la foto. Provisional hasta tener los modelos. */
function _loadScript(src){
  return new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = src; sc.onload = res;
    sc.onerror = () => rej(new Error(src + ' no cargó'));
    document.head.appendChild(sc);
  });
}
let _threeP = null;
function _loadThree(){
  if (window.THREE && THREE.GLTFLoader) return Promise.resolve();
  if (!_threeP) _threeP =
    (window.THREE ? Promise.resolve() : _loadScript('https://unpkg.com/three@0.147.0/build/three.min.js'))
      .then(() => window.THREE.GLTFLoader ? null : _loadScript('https://unpkg.com/three@0.147.0/examples/js/loaders/GLTFLoader.js'))
      .then(() => window.THREE.DRACOLoader ? null : _loadScript('https://unpkg.com/three@0.147.0/examples/js/loaders/DRACOLoader.js'))
      .catch(e => { _threeP = null; throw e; });
  return _threeP;
}
const CUP = (() => {
  let renderer, scene, camera, clock, cup = null, spotL, spotR, inited = false;
  let pendW = 0, pendH = 0, tL = null, tR = null, loadedUrl = null;

  /* Copa real (.glb, comprimida con Draco): se normaliza a ~1.55 unidades
     de alto con la base en y=0 para posarse en el pedestal de la foto. */
  function _loadCup(url){
    if (loadedUrl === url) return;
    loadedUrl = url;
    const loader = new THREE.GLTFLoader();
    const draco = new THREE.DRACOLoader();
    draco.setDecoderPath('https://unpkg.com/three@0.147.0/examples/js/libs/draco/');
    loader.setDRACOLoader(draco);
    loader.load(url, (gltf) => {
      const obj = gltf.scene;
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      if (!size.y) return;
      obj.scale.setScalar(1.7 / size.y);
      const b2 = new THREE.Box3().setFromObject(obj);
      const c = b2.getCenter(new THREE.Vector3());
      obj.position.x -= c.x; obj.position.z -= c.z;
      obj.position.y -= b2.min.y;   // base del modelo en y=0 del grupo
      const rotY = cup ? cup.rotation.y : 0;
      if (cup) scene.remove(cup);
      cup = new THREE.Group();
      cup.add(obj);
      cup.position.y = CUP_VIEW.baseY;  // salaLayout proyecta esta fila al contacto del tablero
      cup.rotation.y = rotY;
      scene.add(cup);
    }, undefined, (err) => { loadedUrl = null; console.warn('La copa no cargó:', err.message || err); });
  }

  function _env(){
    // entorno neutro y frío: la plata debe leerse plata, no bronce
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0.00, '#4a5468'); g.addColorStop(0.42, '#1a2230');
    g.addColorStop(0.55, '#8b93a3'); g.addColorStop(0.62, '#11141c'); g.addColorStop(1, '#000');
    x.fillStyle = g; x.fillRect(0, 0, 256, 128);
    x.fillStyle = 'rgba(240,245,255,0.95)';
    [30, 95, 160, 225].forEach(px => x.fillRect(px, 18, 14, 34));
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromEquirectangular(tex).texture;
    tex.dispose(); pm.dispose();
  }
  function init(host){
    if (inited) return; inited = true;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    // cámara nivelada (sin keystone): las verticales de la copa quedan
    // verticales y la base se ve con el mismo ~6° que el tablero de la foto
    camera = new THREE.PerspectiveCamera(CUP_VIEW.fov, 1, 0.1, 50);
    camera.position.set(0, 0, CUP_VIEW.dist);
    camera.lookAt(0, 0, 0);
    clock = new THREE.Clock();
    _env();
    scene.add(new THREE.AmbientLight(0x39496a, 0.55));
    const key = new THREE.DirectionalLight(0xfff3dd, 0.8);
    key.position.set(0, 6, 5); scene.add(key);
    const mk = (x) => {
      const sp = new THREE.SpotLight(0xffffff, 2.0, 30, Math.PI/5.5, 0.55, 1.2);
      sp.position.set(x, 4.2, -1.8);
      sp.target.position.set(0, 0.4, 0);
      scene.add(sp, sp.target);
      return sp;
    };
    spotL = mk(-4); spotR = mk(4);
    tL = new THREE.Color('#f3e8d2'); tR = new THREE.Color('#f3e8d2');
    _contactShadow();
    if (pendW) resizeNow(pendW, pendH);
  }
  /* Sombra de contacto: ancla la copa al tablero — sin ella parece pegada */
  function _contactShadow(){
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(128, 128, 18, 128, 128, 128);
    g.addColorStop(0, 'rgba(0,0,0,0.5)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.24)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(0.46, 48),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = CUP_VIEW.baseY + 0.002;
    scene.add(m);
  }
  function resizeNow(w, h){
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  function _tick(){
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!cup){ renderer.render(scene, camera); return; }
    cup.rotation.y += dt * 0.45;
    spotL.color.lerp(tL, dt * 3.5);
    spotR.color.lerp(tR, dt * 3.5);
    renderer.render(scene, camera);
  }
  return {
    start(host){
      _loadThree().then(() => {
        init(host);
        _loadCup(curComp().cup);
        const c = curChamp();
        tL.set(lightenForLight(c.c1)); tR.set(lightenForLight(c.c2));
        renderer.setAnimationLoop(_tick);
      }).catch(e => console.warn('Sala sin copa 3D:', e.message));
    },
    stop(){ if (renderer) renderer.setAnimationLoop(null); },
    setCup(url){ if (inited) _loadCup(url); },
    resize(w, h){ if (renderer) resizeNow(w, h); else { pendW = w; pendH = h; } },
    setLights(c1, c2){ if (tL){ tL.set(c1); tR.set(c2); } },
  };
})();

/* ---- Niebla volumétrica ORGÁNICA (canvas 2D). NO es una capa estática: dos
   focos de emisión RECORREN lento todo el ancho con compuertas (gusts) que a
   veces se cierran, y un VIENTO global hace MIGRAR toda la masa por la pantalla,
   con la densidad global "respirando" muy lento. Así ninguna zona queda con
   niebla permanente: cada área se despeja por momentos (no siempre el suelo).
   Partículas grandes/suaves/tenues que se solapan + blur CSS = humo de
   escenario. z9, blend screen. */
class Smoke{
  constructor(ctx,color){
    this.ctx=ctx;this.color=color||[170,175,187];
    this.p=[];this.running=false;this._r=null;this.t=0;
    this.W=ctx.canvas.width;this.H=ctx.canvas.height;
  }
  _mk(x){
    return {
      x, y:this.H+10+Math.random()*40,
      vx:(Math.random()-.5)*.30,
      vy:-(0.55+Math.random()*1.0),          // sube y ATRAVIESA toda la pantalla
      r:80+Math.random()*90, gr:0.12+Math.random()*0.22, // crece al subir → la columna se abre
      a:0.026+Math.random()*0.05,
      life:0, max:1200+Math.random()*700,    // vive lo suficiente para llegar arriba y SALIR
      ph:Math.random()*6.283, ps:0.006+Math.random()*0.008, pa:0.55+Math.random()*1.05,
      ph2:Math.random()*6.283, ps2:0.015+Math.random()*0.014
    };
  }
  _burst(cx,spread,amt){
    const n=Math.random()<(amt%1)?Math.ceil(amt):Math.floor(amt);
    for(let i=0;i<n;i++) this.p.push(this._mk(cx+(Math.random()-.5)*spread));
  }
  emit(){
    const {W,t}=this; const T=t/60; const N=5;
    // N columnas repartidas por todo el ancho; cada base se DESPLAZA sola y
    // pulsa con su propia compuerta → plumas distintas que entran por abajo.
    for(let k=0;k<N;k++){
      const ph=k*1.7;
      const cx=W*((k+0.5)/N + 0.13*Math.sin(T*(0.05+0.013*k)+ph) + 0.06*Math.sin(T*0.083+ph*2));
      const gate=0.3+0.7*Math.max(0, Math.sin(T*(0.085+0.022*k)+ph*1.3));
      this._burst(cx, W*0.11, 0.31*gate);
    }
  }
  _adv(){
    this.t++; const T=this.t/60, W=this.W;
    // viento global + leve sesgo hacia arriba: la masa migra y SALE por arriba/lados
    const windX=0.5*Math.sin(T*0.06) + 0.28*Math.sin(T*0.026+1.1);
    const windY=-0.05 + 0.06*Math.sin(T*0.037+0.5);
    this.p=this.p.filter(q=>q.life<q.max && q.y>-q.r-30 && q.x>-q.r-160 && q.x<W+q.r+160);
    for(const q of this.p){
      q.life++;
      // la amplitud de la turbulencia CRECE al subir → la columna se ensancha
      const widen=0.3+(q.life/q.max)*1.7;
      const turb=(Math.sin(q.life*q.ps+q.ph)+Math.sin(q.life*q.ps2+q.ph2)*0.6)*q.pa*widen;
      q.x += q.vx + windX + turb;
      q.y += q.vy + windY;
      q.r += q.gr;
    }
  }
  step(n){for(let i=0;i<n;i++){ if(this.t%4===0)this.emit(); this._adv(); }}
  _draw(){
    const{ctx,p,color}=this;const[r,g,b]=color;const W=this.W;
    const gA=0.85 + 0.15*Math.sin(this.t/60*0.045+1.0);
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    for(const q of p){
      const tin=Math.min(1, q.life/(q.max*0.12));        // aparece suave al nacer
      // se DESVANECE al acercarse a los bordes → sale de pantalla, no muere dentro
      const fx=Math.min(1, q.x/130, (W-q.x)/130);
      const fy=Math.min(1, q.y/200);                     // borde superior
      const a=q.a*tin*Math.max(0,Math.min(fx,fy))*gA;
      if(a<=.0015)continue;
      ctx.globalAlpha=a;
      const gd=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,q.r);
      gd.addColorStop(0,`rgba(${r},${g},${b},0.95)`);
      gd.addColorStop(.45,`rgba(${r},${g},${b},0.4)`);
      gd.addColorStop(1,`rgba(${r},${g},${b},0)`);
      ctx.fillStyle=gd;ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,6.283);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  _loop(){
    if(this.t%4===0) this.emit();   // emisión continua, no por timeouts
    this._adv();this._draw();
    if(this.running)this._r=requestAnimationFrame(()=>this._loop());
  }
  start(){if(this.running)return;this.running=true;this._loop();}
  stop(){
    this.running=false;
    if(this._r){cancelAnimationFrame(this._r);this._r=null;}
    this.p.length=0;
    const c=this.ctx.canvas;this.ctx.clearRect(0,0,c.width,c.height);
  }
}
let _smoke=null;
function _initSalaSmoke(){
  if(_smoke){_smoke.stop();_smoke=null;}
  const c=document.querySelector('#sala .sala-smoke-canvas');
  if(!c||window.matchMedia('(max-width:760px)').matches)return;
  c.width=1280;c.height=720;
  const ctx=c.getContext('2d');
  _smoke=new Smoke(ctx,[170,175,187]);
  _smoke.step(1100);   // pre-carga: al abrir ya hay columnas repartidas y subiendo
  _smoke.start();
}
function _stopSalaSmoke(){ if(_smoke){_smoke.stop();_smoke=null;} }
function openSala(){
  const sala = document.getElementById('sala');
  sala.classList.add('open');
  sala.setAttribute('aria-hidden','false');
  document.body.classList.add('sala-open');
  salaLayout();
  _renderComp();
  _renderChamp();
  CUP.start(document.getElementById('sala-cup'));
  _initSalaSmoke();
  AUDIO.enterSala();
}
function closeSala(){
  const sala = document.getElementById('sala');
  if (!sala.classList.contains('open')) return;
  sala.classList.remove('open');
  sala.setAttribute('aria-hidden','true');
  document.body.classList.remove('sala-open');
  _stopCollage();
  _stopSalaSmoke();
  CUP.stop();
  AUDIO.apply();
}
// _renderComp() — boot movido a initRedesignPublic()
document.addEventListener('keydown', e => {
  const sala = document.getElementById('sala');
  if (!sala) return;
  if (e.key === 'Escape') closeSala();
  if (sala.classList.contains('open')){
    if (e.key === 'ArrowUp')    salaNextChamp();
    if (e.key === 'ArrowDown')  salaPrevChamp();
    if (e.key === 'ArrowLeft')  salaNextComp();
    if (e.key === 'ArrowRight') salaPrevComp();
  }
});

/* Gestos en la sala: swipe ↑ campeón siguiente · ↓ anterior · ← competición
   siguiente · → anterior. Dirección dominante decide el eje. */
(() => {
  const sala = document.getElementById('sala');
  if (!sala) return;
  let x0 = 0, y0 = 0, t0 = 0, on = false;
  sala.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) { on = false; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); on = true;
  }, { passive:true });
  sala.addEventListener('touchend', e => {
    if (!on) return; on = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (Date.now() - t0 > 700 || Math.max(adx, ady) < 48) return;  // lento o tap
    if (ady > adx) { dy < 0 ? salaNextChamp() : salaPrevChamp(); }  // vertical → campeón
    else           { dx < 0 ? salaNextComp()  : salaPrevComp();  }  // horizontal → competición
  }, { passive:true });
})();

/* ===== Audio del palmarés: lejano y con reverb fuera, limpio dentro =====
   Un solo loop del tema con dos caminos de ganancia:
   - wet: lowpass 900Hz → convolver (IR generada) → "suena tras la puerta"
   - dry: directo → la sala a volumen presente
   El crossfade entre caminos ES el umbral. */
const AUDIO = (() => {
  let ctx, dry, wet, ready = false, loading = false;
  let soundOn = false, userMuted = false, visible = false;

  function _impulse(c){
    const len = Math.floor(c.sampleRate * 3.2), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++){
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1) * Math.pow(1 - i/len, 2.8);
    }
    return ir;
  }
  async function _init(){
    if (ready || loading) return; loading = true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buf = await ctx.decodeAudioData(
        await (await fetch('assets/sounds/palmares_theme.mp3')).arrayBuffer());
      dry = ctx.createGain(); dry.gain.value = 0; dry.connect(ctx.destination);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const conv = ctx.createConvolver(); conv.buffer = _impulse(ctx);
      wet = ctx.createGain(); wet.gain.value = 0;
      lp.connect(conv); conv.connect(wet); wet.connect(ctx.destination);
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      src.connect(dry); src.connect(lp);
      src.start();
      ready = true;
      apply();
    } catch(e){ console.warn('Tema del palmarés no disponible:', e); }
    finally { loading = false; }
  }
  function _ramp(g, v, t){
    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(v, now + t);
  }
  function apply(){
    if (!ready) return;
    if (ctx.state === 'suspended') ctx.resume();
    const inSala = document.getElementById('sala').classList.contains('open');
    if (!soundOn)     { _ramp(dry, 0, 0.6);    _ramp(wet, 0, 0.6); }
    else if (inSala)  { _ramp(dry, 0.55, 1.8); _ramp(wet, 0.05, 1.8); }
    else if (visible) { _ramp(dry, 0, 1.2);    _ramp(wet, 0.12, 1.2); }
    else              { _ramp(dry, 0, 0.8);    _ramp(wet, 0, 0.8); }
  }
  const IC_ON  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;display:block;"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
  const IC_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;display:block;"><path d="M11 5 6 9H2v6h4l5 4z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>';
  function syncUI(){
    const ic = document.getElementById('amb-ic'), lbl = document.getElementById('amb-lbl');
    if (ic) ic.innerHTML = soundOn ? IC_ON : IC_OFF;
    if (lbl) lbl.textContent = soundOn ? 'Ambiente' : 'Sonido';
    const ab = document.getElementById('amb-btn');
    if (ab) ab.classList.toggle('on', soundOn);
    const m = document.getElementById('sala-mute');
    if (m) m.innerHTML = soundOn ? IC_ON : IC_OFF;
  }
  return {
    toggle(){
      soundOn = !soundOn; userMuted = !soundOn;
      if (soundOn && !ready) _init(); else apply();
      syncUI();
    },
    enterSala(){
      if (!soundOn && !userMuted){ soundOn = true; syncUI(); }
      if (soundOn && !ready) _init(); else apply();
    },
    apply,
    setVisible(v){ visible = v; apply(); },
    syncUI,
  };
})();
function toggleSound(){ AUDIO.toggle(); }
// AUDIO.syncUI() — boot movido a initRedesignPublic()

// El ambiente solo suena con el palmarés a la vista
const palmIO = new IntersectionObserver(
  es => es.forEach(e => AUDIO.setVisible(e.isIntersecting)), { threshold: 0.25 });
// palmEl + palmIO.observe — boot movido a initRedesignPublic()

/* ===== 06 · Rig 2.5D del chibi: sigue el cursor con inercia ===== */
(function(){
  if (MOTION.reduced() || !matchMedia('(pointer:fine)').matches) return;
  const stage = document.querySelector('.sorteo-stage');
  const tilt = document.getElementById('chibi-tilt');
  if (!stage || !tilt) return;
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
  function loop(){
    cx += (tx - cx) * 0.09; cy += (ty - cy) * 0.09;
    tilt.style.transform = `rotateY(${cx.toFixed(2)}deg) rotateX(${cy.toFixed(2)}deg)`;
    if (Math.abs(tx - cx) > 0.02 || Math.abs(ty - cy) > 0.02) raf = requestAnimationFrame(loop);
    else raf = null;
  }
  const ensure = () => { if (!raf) raf = requestAnimationFrame(loop); };
  stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width  * 2 - 1) * 7;
    ty = -((e.clientY - r.top) / r.height * 2 - 1) * 5;
    ensure();
  });
  stage.addEventListener('pointerleave', () => { tx = 0; ty = 0; ensure(); });
})();

/* ===== Perfil del topbar: abre la tarjeta del presidente (clonada de la
   sección 09, sin modificarla) en un dropdown anclado a la esquina ===== */
function toggleProfile(force){
  const menu = document.getElementById('profile-menu');
  const back = document.getElementById('profile-backdrop');
  const btn  = document.getElementById('profile-btn');
  const open = (force === undefined) ? !menu.classList.contains('open') : force;
  if (open && !menu.dataset.filled){
    const card = document.querySelector('#profile-card-src .pp-drawer');
    if (card){ menu.appendChild(card.cloneNode(true)); menu.dataset.filled = '1'; }
  }
  menu.classList.toggle('open', open);
  back.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
/* Estado de sesión (mock): deslogueado → botón «Entrar»; logueado → chip de perfil.
   El acceso Admin es discreto: vive dentro del menú de perfil, no en el topbar. */
function setAuth(loggedIn){
  document.getElementById('tb-enter').style.display   = loggedIn ? 'none' : '';
  document.getElementById('profile-btn').style.display = loggedIn ? '' : 'none';
  if (!loggedIn) toggleProfile(false);
}
document.addEventListener('keydown', e => {
  const pm = document.getElementById('profile-menu');
  if (e.key === 'Escape' && pm && pm.classList.contains('open')) toggleProfile(false);
});

/* ============================================================
   01 · PALMARÉS — Sala de Trofeos (parqué SVG): carrusel 3D de
   vitrinas con trofeos SVG, focos dinámicos y panel de campeones.
   Portado de la web original (palmares.js) y conectado a la sala
   fullscreen 3D del prototipo: doble click / Enter abre openSala().
   ============================================================ */
function _uid(){ return 'p'+Math.random().toString(36).slice(2,9); }
function trophyClassica(size=120){const u=_uid();return `<svg class="palm-trophy classica" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${u}-g" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#B8860B"/><stop offset="45%" stop-color="#FFE082"/><stop offset="100%" stop-color="#B8860B"/></linearGradient><radialGradient id="${u}-h" cx="35%" cy="30%"><stop offset="0%" stop-color="#FFE8AE"/><stop offset="100%" stop-color="#B8860B"/></radialGradient></defs><circle cx="100" cy="20" r="10" fill="url(#${u}-h)" stroke="#8B6914" stroke-width="0.6"/><path d="M 78 30 Q 100 24 122 30 L 120 44 L 80 44 Z" fill="url(#${u}-g)" stroke="#8B6914" stroke-width="0.6"/><path d="M 70 44 L 130 44 L 132 56 Q 132 116 100 134 Q 68 116 68 56 Z" fill="url(#${u}-g)" stroke="#8B6914" stroke-width="0.6"/><path d="M 70 58 Q 38 60 38 88 Q 38 104 60 98" fill="none" stroke="url(#${u}-g)" stroke-width="7" stroke-linecap="round"/><path d="M 130 58 Q 162 60 162 88 Q 162 104 140 98" fill="none" stroke="url(#${u}-g)" stroke-width="7" stroke-linecap="round"/><rect x="94" y="134" width="12" height="22" fill="url(#${u}-g)" stroke="#8B6914" stroke-width="0.4"/><rect x="76" y="156" width="48" height="14" rx="2" fill="url(#${u}-g)" stroke="#8B6914" stroke-width="0.4"/><rect x="58" y="170" width="84" height="20" rx="3" fill="url(#${u}-g)" stroke="#8B6914" stroke-width="0.4"/><ellipse cx="100" cy="62" rx="18" ry="3" fill="rgba(255,255,255,0.35)"/></svg>`;}
function trophyImperial(size=120){const u=_uid();return `<svg class="palm-trophy imperial" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${u}-g" x1="0%" x2="100%"><stop offset="0%" stop-color="#A8854D"/><stop offset="50%" stop-color="#FFE8AE"/><stop offset="100%" stop-color="#A8854D"/></linearGradient></defs><path d="M 72 14 L 80 28 L 88 8 L 96 24 L 100 4 L 104 24 L 112 8 L 120 28 L 128 14 L 128 34 L 72 34 Z" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.6"/><circle cx="80" cy="10" r="2.4" fill="#B22222"/><circle cx="100" cy="4" r="2.4" fill="#B22222"/><circle cx="120" cy="10" r="2.4" fill="#B22222"/><ellipse cx="100" cy="38" rx="30" ry="5" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.6"/><path d="M 76 38 L 124 38 L 118 132 Q 100 144 82 132 Z" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.6"/><path d="M 76 52 Q 52 70 58 108" fill="none" stroke="url(#${u}-g)" stroke-width="4" stroke-linecap="round"/><path d="M 124 52 Q 148 70 142 108" fill="none" stroke="url(#${u}-g)" stroke-width="4" stroke-linecap="round"/><rect x="88" y="142" width="24" height="10" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.4"/><rect x="78" y="152" width="44" height="12" rx="2" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.4"/><rect x="66" y="164" width="68" height="14" rx="2" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.4"/><rect x="54" y="178" width="92" height="16" rx="3" fill="url(#${u}-g)" stroke="#8B5A2B" stroke-width="0.4"/><ellipse cx="100" cy="56" rx="14" ry="2.5" fill="rgba(255,255,255,0.35)"/></svg>`;}
function trophyKonami(size=120){const u=_uid();return `<svg class="palm-trophy konami" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="${u}-ball" cx="32%" cy="28%"><stop offset="0%" stop-color="#FFEAB0"/><stop offset="55%" stop-color="#F1C232"/><stop offset="100%" stop-color="#6B5210"/></radialGradient><linearGradient id="${u}-ped" x1="0%" x2="100%"><stop offset="0%" stop-color="#5A5A5A"/><stop offset="50%" stop-color="#E0E0E0"/><stop offset="100%" stop-color="#5A5A5A"/></linearGradient></defs><circle cx="100" cy="80" r="55" fill="url(#${u}-ball)" stroke="#5C420F" stroke-width="0.6"/><g fill="none" stroke="#5C420F" stroke-width="1.6" opacity="0.55"><polygon points="100,38 117,48 117,68 100,78 83,68 83,48"/><polygon points="100,78 117,68 130,82 124,102 107,108 100,98"/><polygon points="100,78 83,68 70,82 76,102 93,108 100,98"/><polygon points="70,82 53,90 50,108 60,120 76,116 76,102"/><polygon points="130,82 147,90 150,108 140,120 124,116 124,102"/><polygon points="100,98 107,108 100,124 93,108"/></g><ellipse cx="80" cy="58" rx="14" ry="8" fill="rgba(255,255,255,0.45)"/><path d="M 78 140 L 100 130 L 122 140 L 116 188 L 84 188 Z" fill="url(#${u}-ped)" stroke="#3A3A3A" stroke-width="0.6"/><ellipse cx="100" cy="200" rx="58" ry="9" fill="url(#${u}-ped)" stroke="#3A3A3A" stroke-width="0.6"/><ellipse cx="100" cy="198" rx="58" ry="4" fill="#F0F0F0"/></svg>`;}
function trophyOrejona(size=120){const u=_uid();return `<svg class="palm-trophy orejona" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${u}-g" x1="0%" x2="100%"><stop offset="0%" stop-color="#8A8A8A"/><stop offset="50%" stop-color="#F4F4F4"/><stop offset="100%" stop-color="#7A7A7A"/></linearGradient></defs><path d="M 68 50 L 132 50 L 138 60 Q 142 118 100 148 Q 58 118 62 60 Z" fill="url(#${u}-g)" stroke="#4A4A4A" stroke-width="0.6"/><ellipse cx="100" cy="50" rx="32" ry="6" fill="#3A3A3A"/><ellipse cx="100" cy="49" rx="30" ry="4" fill="#1A1A1A"/><path d="M 70 56 C 16 30, 10 96, 60 124" fill="none" stroke="url(#${u}-g)" stroke-width="9" stroke-linecap="round"/><path d="M 130 56 C 184 30, 190 96, 140 124" fill="none" stroke="url(#${u}-g)" stroke-width="9" stroke-linecap="round"/><rect x="95" y="148" width="10" height="32" fill="url(#${u}-g)" stroke="#4A4A4A" stroke-width="0.4"/><rect x="80" y="180" width="40" height="9" rx="2" fill="url(#${u}-g)" stroke="#4A4A4A" stroke-width="0.4"/><rect x="68" y="189" width="64" height="14" rx="3" fill="url(#${u}-g)" stroke="#4A4A4A" stroke-width="0.4"/><ellipse cx="100" cy="80" rx="18" ry="4" fill="rgba(255,255,255,0.4)"/></svg>`;}
function trophySobria(size=120){const u=_uid();return `<svg class="palm-trophy sobria" viewBox="0 0 200 240" width="${size}" height="${size*1.2}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${u}-g" x1="0%" x2="100%"><stop offset="0%" stop-color="#5C2E0C"/><stop offset="50%" stop-color="#E8A05A"/><stop offset="100%" stop-color="#5C2E0C"/></linearGradient></defs><path d="M 76 32 Q 100 18 124 32 L 122 46 L 78 46 Z" fill="url(#${u}-g)" stroke="#3A1A06" stroke-width="0.6"/><path d="M 78 46 L 122 46 L 124 60 Q 124 110 100 124 Q 76 110 76 60 Z" fill="url(#${u}-g)" stroke="#3A1A06" stroke-width="0.6"/><rect x="93" y="124" width="14" height="28" fill="url(#${u}-g)" stroke="#3A1A06" stroke-width="0.4"/><rect x="76" y="152" width="48" height="10" rx="2" fill="url(#${u}-g)" stroke="#3A1A06" stroke-width="0.4"/><rect x="60" y="162" width="80" height="18" rx="3" fill="url(#${u}-g)" stroke="#3A1A06" stroke-width="0.4"/><ellipse cx="100" cy="64" rx="14" ry="3" fill="rgba(255,255,255,0.3)"/></svg>`;}
const TROPHY_RENDERERS = { classica:trophyClassica, imperial:trophyImperial, konami:trophyKonami, orejona:trophyOrejona, sobria:trophySobria };
const PALM_META = [
  { trophy:'classica', color:'#DAA520' },
  { trophy:'imperial', color:'#E8C97A' },
  { trophy:'konami',   color:'#D8D8D8' },
  { trophy:'orejona',  color:'#EAEAEA' },
  { trophy:'sobria',   color:'#CD7F32' },
];
function renderTrophyStyle(trophy, size){ const fn = TROPHY_RENDERERS[trophy]; return fn ? fn(size) : ''; }

/* Datos de la sala derivados de COMPS (mismos campeones que la sala 3D) */
function _palmTeamById(){
  const map = {};
  COMPS.forEach(c => c.champions.forEach(ch => {
    if (!map[ch.ini]) map[ch.ini] = { id:ch.ini, ini:ch.ini, name:ch.name, color:ch.c1, color2:ch.c2 };
  }));
  return map;
}
function _palmCompData(){
  return COMPS.map((c, ci) => {
    const meta = PALM_META[ci] || PALM_META[0];
    const records = c.champions.map((ch, i) => {
      const t = (ch.ed.match(/T\d+/) || [''])[0];
      const j = (ch.ed.match(/PES\s*\d+/) || [''])[0];
      return { id: ci*100 + i, teamId: ch.ini, season: t, juego: j, year: null };
    });
    return {
      comp: { key: c.name, label: c.name, color: meta.color, trophy: meta.trophy },
      records, champion: records[0],
      champTeam: _palmTeamById()[c.champions[0].ini],
    };
  });
}

function _palmCaseHTML(data, idx){
  const { comp, records } = data;
  const n = (records || []).length;
  return `
    <div class="tr-case" data-idx="${idx}" style="--accent:${comp.color}">
      <div class="tr-case-niche">
        <div class="tr-case-spot"></div>
        <div class="tr-case-back"></div>
        <div class="tr-case-glow"></div>
        <div class="tr-case-trophy">${renderTrophyStyle(comp.trophy, 160)}</div>
        <div class="tr-case-base">
          <div class="tr-case-plaque">
            <span class="tr-case-comp">${esc(comp.label)}</span>
            ${n ? `<span class="tr-case-meta">${n} ${n===1?'edición':'ediciones'}</span>` : `<span class="tr-case-empty">Sin campeón aún</span>`}
          </div>
        </div>
      </div>
    </div>`;
}

function _palmInfoPanel(data, teamById){
  const { records, champion } = data;
  if (!records.length) return `<div class="tr-history"><div class="tr-history-empty">No hay títulos registrados.</div></div>`;
  const expanded = champion || records[0];
  const list = records.map(r => {
    const team = teamById[r.teamId] || {};
    const isExp = r.id === expanded.id;
    const isVig = champion && r.id === champion.id;
    const primary = r.season || (r.year ? String(r.year) : '—');
    const secondary = [r.juego, r.season && r.year ? r.year : null].filter(Boolean).join(' · ');
    const tags = [r.season, r.juego, r.year].filter(Boolean).join(' · ');
    return `
      <li class="tr-hist-row${isExp ? ' tr-hist-row--exp' : ''}" data-rec-id="${r.id}">
        ${tags ? `<span class="tr-hist-tags">${esc(tags)}</span>` : ''}
        <span class="tr-hist-year">${esc(primary)}${secondary?`<small>${esc(secondary)}</small>`:''}</span>
        <span class="tr-hist-team">
          <span class="tr-hist-logo" style="background:${team.color || '#333'}"><span>${esc(team.ini || '?')}</span></span>
          <span class="tr-hist-name">${esc(team.name || '—')}</span>
          ${isVig ? `<span class="tr-hist-badge">VIGENTE</span>` : ''}
        </span>
      </li>`;
  }).join('');
  return `<div class="tr-history"><ul class="tr-history-list">${list}</ul></div>`;
}

function _palmOpenFs(i){ _compIdx = i; _champIdx = 0; openSala(); }

/* ===== Conversión a line-art: rellena → solo contorno (currentColor) ===== */
function _mvLineArt(svg, sw){
  try{
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const s = doc.documentElement;
    if (s.querySelector('parsererror')) return svg;
    s.querySelectorAll('defs').forEach(d => d.remove());
    s.removeAttribute('width'); s.removeAttribute('height'); s.removeAttribute('class');
    s.querySelectorAll('path,rect,circle,ellipse,polygon,polyline,line').forEach(el => {
      const f = (el.getAttribute('fill') || '').trim();
      if (/^rgba\(255/i.test(f) && !el.getAttribute('stroke')){ el.remove(); return; }
      el.setAttribute('fill', 'none');
      el.setAttribute('stroke', 'currentColor');
      el.setAttribute('stroke-width', sw);
      el.setAttribute('stroke-linecap', 'round');
      el.setAttribute('stroke-linejoin', 'round');
    });
    return new XMLSerializer().serializeToString(s);
  } catch(e){ return svg; }
}

let _mvSel = 0;
function _mvComp(i){
  const c = COMPS[i], meta = PALM_META[i] || PALM_META[0];
  return { c, meta, vig: c.champions[0],
           ediciones: c.champions.length,
           campeones: new Set(c.champions.map(ch => ch.ini)).size };
}

function _mvHeroHTML(i){
  const { c, meta } = _mvComp(i);
  const full = renderTrophyStyle(meta.trophy, 200);
  const line = _mvLineArt(renderTrophyStyle(meta.trophy, 200), 1.5);
  return `
    <div class="mv-stage" data-idx="${i}" style="--metal:${meta.color}" role="button" tabindex="0"
         onclick="_palmOpenFs(${i})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();_palmOpenFs(${i});}">
      <div class="mv-scene">
        <div class="mv-axis"></div>
        <div class="mv-halo"></div>
        <div class="mv-trophy">
          <div class="mv-layer mv-line">${line}</div>
          <div class="mv-layer mv-full">${full}</div>
        </div>
      </div>
      <div class="mv-cap">
        <div class="mv-comp-name">${esc(c.name)}</div>
        <span class="mv-cta">[ Inspeccionar vitrina ]</span>
      </div>
    </div>`;
}

function _mvDataHTML(i){
  const { vig, ediciones, campeones } = _mvComp(i);
  return `
    <div class="mv-vig">
      <div class="mv-lbl">Campeón vigente</div>
      <div class="mv-vig-row">
        <span class="mv-badge" style="background:${vig.c1}">${esc(vig.ini)}</span>
        <span class="mv-vig-name">${esc(vig.name)}</span>
      </div>
    </div>
    <div class="mv-counts">
      <div class="mv-count"><div class="mv-lbl">Ediciones</div><div class="mv-num">${ediciones}</div></div>
      <div class="mv-count"><div class="mv-lbl">Campeones</div><div class="mv-num">${campeones}</div></div>
    </div>`;
}

function _mvNavHTML(){
  return COMPS.map((c, i) => {
    const meta = PALM_META[i] || PALM_META[0];
    const ico = _mvLineArt(renderTrophyStyle(meta.trophy, 36), 2.2);
    return `
      <button class="mv-nav-row${i === _mvSel ? ' on' : ''}" data-i="${i}" style="--metal:${meta.color}" onclick="_mvSelect(${i})">
        <span class="mv-nav-ico">${ico}</span>
        <span class="mv-nav-name">${esc(c.name)}</span>
        <svg class="mv-nav-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>`;
  }).join('');
}

function _mvBindHero(){
  const stage = document.querySelector('#mv-hero .mv-stage');
  if (!stage) return;
  if (MOTION.reduced() || !matchMedia('(pointer:fine)').matches) return;
  const scene = stage.querySelector('.mv-scene'), MAXY = 15, MAXX = 11;
  stage.addEventListener('pointerenter', () => scene.classList.add('mv-active'));
  stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width  * 2 - 1;
    const py = (e.clientY - r.top)  / r.height * 2 - 1;
    scene.style.transform = `rotateY(${(px*MAXY).toFixed(2)}deg) rotateX(${(-py*MAXX).toFixed(2)}deg)`;
  });
  stage.addEventListener('pointerleave', () => { scene.classList.remove('mv-active'); scene.style.transform = ''; });
}

function _mvSelect(i){
  if (i === _mvSel) return;
  _mvSel = i;
  const mvEl = document.getElementById('mv');
  if (mvEl) mvEl.style.setProperty('--metal', (PALM_META[i] || PALM_META[0]).color);
  document.querySelectorAll('#mv-nav .mv-nav-row').forEach((b, k) => b.classList.toggle('on', k === i));
  const hero = document.getElementById('mv-hero'), data = document.getElementById('mv-data');
  if (hero){ hero.innerHTML = _mvHeroHTML(i); _mvBindHero(); }
  if (data){ data.innerHTML = _mvDataHTML(i); }
}

/* Fade-out en bordes de cualquier contenedor con scroll horizontal cortado
   (misma dinámica que la tabla de grupos: _bindStandFade). Reutilizable. */
function _bindEdgeFade(el){
  if (!el) return;
  const upd = () => {
    el.classList.toggle('more-r', el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    el.classList.toggle('more-l', el.scrollLeft > 2);
  };
  el.addEventListener('scroll', upd, { passive:true });
  window.addEventListener('resize', upd);
  upd();
}

function rdpRenderPalmares(){
  const el = document.getElementById('pub-palmares-content');
  if (!el) return;
  _mvSel = Math.min(_mvSel, COMPS.length - 1);
  const totalTitles = COMPS.reduce((s, c) => s + c.champions.length, 0);
  const totalChampions = new Set(COMPS.flatMap(c => c.champions.map(ch => ch.ini))).size;
  const headIco = _mvLineArt(renderTrophyStyle('classica', 40), 2);
  el.innerHTML = `
    <style>
      .mv{ background:rgba(255,255,255,.022); border:1px solid rgba(255,255,255,.07); border-radius:18px; padding:20px 22px; }
      .mv-head{ display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; padding-bottom:16px; border-bottom:1px solid rgba(255,255,255,.06); }
      .mv-head-id{ display:flex; align-items:center; gap:13px; }
      .mv-head-ico{ width:40px; height:48px; color:#DAA520; display:flex; flex:none; }
      .mv-head-ico svg{ width:100%; height:100%; }
      .mv-kicker{ font-size:15px; letter-spacing:2px; text-transform:uppercase; font-weight:700; color:var(--txt); }
      .mv-headsub{ font-size:12px; color:var(--txt2); margin-top:3px; max-width:380px; line-height:1.4; }
      .mv-stats{ display:flex; align-items:center; gap:12px; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:var(--txt2); }
      .mv-stats b{ color:#DAA520; font-size:14px; font-weight:700; margin-right:3px; }
      .mv-stats i{ width:4px; height:4px; border-radius:50%; background:rgba(255,255,255,.22); }
      .mv-body{ position:relative; display:grid; grid-template-columns:248px minmax(0,1fr) 270px; gap:18px; margin-top:18px; align-items:stretch; }
      .mv-nav{ display:flex; flex-direction:column; gap:9px; }
      .mv-nav-row{ --metal:#DAA520; flex:1; display:flex; align-items:center; gap:11px; width:100%; text-align:left;
        background:rgba(20,24,31,.82); border:1px solid rgba(255,255,255,.07); border-radius:12px; padding:11px 13px;
        color:var(--txt); cursor:pointer; transition:transform .4s ease, filter .4s ease, border-color .2s, background .2s; will-change:transform; font-family:inherit; }
      @media (hover:hover) and (pointer:fine){
        .mv-nav-row:hover{ background:rgba(33,39,50,.92); transform:scale(1.1); }
        .mv-nav:hover .mv-nav-row:not(:hover){ filter:blur(10px); transform:scale(.9); }
      }
      .mv-nav-row.on{ border-color:var(--metal); background:color-mix(in srgb, var(--metal) 16%, rgba(20,24,31,.85)); }
      .mv-nav-ico{ width:24px; height:29px; color:var(--metal); flex:none; display:flex; }
      .mv-nav-ico svg{ width:100%; height:100%; }
      .mv-nav-name{ flex:1; font-size:13px; letter-spacing:.5px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .mv-nav-row.on .mv-nav-name{ color:var(--metal); }
      .mv-nav-chev{ color:var(--txt2); flex:none; }
      .mv-nav-row.on .mv-nav-chev{ color:var(--metal); }
      .mv-hero{ position:relative; }
      .mv-body::before{ content:''; position:absolute; inset:0; z-index:0; pointer-events:none; opacity:.85;
        background-image:linear-gradient(color-mix(in srgb,var(--metal) 13%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--metal) 13%,transparent) 1px,transparent 1px);
        background-size:28px 28px; }
      .mv-nav, .mv-hero, .mv-data{ position:relative; z-index:1; }
      .mv-stage{ --metal:#DAA520; position:relative; overflow:hidden; height:100%; min-height:460px; display:flex; flex-direction:column; align-items:center; justify-content:center;
        border-radius:14px; perspective:1100px; padding:10px 0; cursor:pointer; }
      .mv-scene{ position:relative; z-index:1; width:420px; height:440px; transform-style:preserve-3d; animation:mvFloat 7s ease-in-out infinite; will-change:transform; }
      .mv-scene.mv-active{ animation:none; transition:transform .12s ease-out; }
      .mv-axis{ position:absolute; left:50%; top:8%; bottom:8%; width:1px; transform:translateZ(-60px); opacity:.3;
        background:repeating-linear-gradient(var(--metal) 0 4px,transparent 4px 9px); }
      .mv-halo{ position:absolute; left:50%; top:46%; width:360px; height:360px; transform:translate(-50%,-50%) translateZ(-10px);
        background:radial-gradient(circle,color-mix(in srgb,var(--metal) 16%,transparent),transparent 65%); }
      .mv-trophy{ position:absolute; inset:0; transform:translateZ(50px); color:var(--metal);
        filter:drop-shadow(0 14px 16px rgba(0,0,0,.5)) drop-shadow(0 0 9px color-mix(in srgb,var(--metal) 35%,transparent)); }
      .mv-layer{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; transition:opacity .4s ease, transform .4s ease; }
      .mv-layer svg{ width:auto; height:410px; display:block; }
      .mv-line{ opacity:1; }
      .mv-full{ opacity:0; transform:scale(.93); }
      .mv-stage:hover .mv-line{ opacity:0; }
      .mv-stage:hover .mv-full{ opacity:1; transform:scale(1); }
      .mv-cap{ position:absolute; left:0; right:0; bottom:34px; z-index:3; text-align:center; pointer-events:none; }
      .mv-comp-name{ font-size:18px; letter-spacing:1.5px; text-transform:uppercase; font-weight:700; color:var(--txt); text-shadow:0 2px 12px rgba(0,0,0,.85); }
      .mv-cta{ display:inline-flex; align-items:center; gap:6px; margin-top:11px; font-size:12px; letter-spacing:1.5px; text-transform:uppercase;
        color:var(--metal); padding:10px 18px; border:1px solid color-mix(in srgb,var(--metal) 45%,transparent); border-radius:10px;
        background:color-mix(in srgb,var(--metal) 12%, rgba(20,24,31,.7)); transition:background .2s; }
      .mv-stage:hover .mv-cta{ background:color-mix(in srgb,var(--metal) 22%, rgba(20,24,31,.7)); }
      .mv-data{ display:flex; flex-direction:column; justify-content:center; gap:16px; }
      .mv-vig{ background:rgba(20,24,31,.82); border:1px solid rgba(255,255,255,.07); border-radius:12px; padding:14px; }
      .mv-lbl{ font-size:10px; letter-spacing:1.2px; text-transform:uppercase; color:var(--txt2); }
      .mv-vig-row{ display:flex; align-items:center; gap:10px; margin-top:10px; }
      .mv-badge{ width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#fff; flex:none; }
      .mv-vig-name{ font-size:14px; font-weight:600; color:var(--txt); }
      .mv-counts{ display:grid; grid-template-columns:1fr 1fr; gap:0; padding:2px 4px; }
      .mv-count{ background:transparent; border:none; border-radius:0; padding:2px 8px; text-align:center; }
      .mv-count + .mv-count{ border-left:1px solid rgba(255,255,255,.1); }
      .mv-num{ font-size:40px; font-weight:700; color:var(--txt); line-height:1; }
      .mv-count .mv-lbl{ margin-bottom:10px; }
      @keyframes mvFloat{ 0%,100%{ transform:rotateX(3deg) rotateY(-5deg);} 50%{ transform:rotateX(-2.5deg) rotateY(6deg);} }
      @media (prefers-reduced-motion: reduce){ .mv-scene{ animation:none!important; } }
      @media (max-width:860px){
        .mv-body{ grid-template-columns:1fr; }
        .mv-nav{ flex-direction:row; overflow-x:auto; scrollbar-width:none; padding-bottom:2px;
          -webkit-mask-image:linear-gradient(to right, transparent 0, #000 var(--ef-l,0px), #000 calc(100% - var(--ef-r,0px)), transparent 100%);
          mask-image:linear-gradient(to right, transparent 0, #000 var(--ef-l,0px), #000 calc(100% - var(--ef-r,0px)), transparent 100%); }
        .mv-nav::-webkit-scrollbar{ display:none; }
        .mv-nav.more-l{ --ef-l:34px; }
        .mv-nav.more-r{ --ef-r:34px; }
        .mv-nav-row{ flex:0 0 auto; width:auto; }
        .mv-nav-name{ max-width:150px; }
        .mv-stage{ min-height:400px; }
        .mv-scene{ width:300px; height:360px; }
        .mv-layer svg{ height:320px; }
        .mv-halo{ width:260px; height:260px; }
        .mv-grid{ inset:-50px; }
        .mv-cap{ bottom:24px; }
        .mv-data{ flex-direction:row; }
        .mv-vig{ flex:1; }
        .mv-counts{ flex:1; }
      }
      @media (max-width:560px){ .mv-data{ flex-direction:column; } .mv-stats{ font-size:10px; gap:9px; } }
      @media (min-width:1100px){
        .mv-body{ grid-template-columns:248px minmax(0,1fr) 360px; }
        .mv-vig{ padding:20px 18px; }
        .mv-vig .mv-lbl{ font-size:11px; letter-spacing:1.3px; }
        .mv-badge{ width:50px; height:50px; font-size:15px; }
        .mv-vig-row{ gap:14px; margin-top:13px; }
        .mv-vig-name{ font-size:21px; }
      }
    </style>
    <div class="mv" id="mv" style="--metal:${(PALM_META[_mvSel]||PALM_META[0]).color}">
      <div class="mv-head">
        <div class="mv-head-id">
          <span class="mv-head-ico">${headIco}</span>
          <div>
            <div class="mv-kicker">Modo vitrina</div>
            <div class="mv-headsub">Trofeos, campeones y momentos históricos en una experiencia fullscreen</div>
          </div>
        </div>
        <div class="mv-stats">
          <span><b>${COMPS.length}</b> competiciones</span><i></i>
          <span><b>${totalTitles}</b> títulos</span><i></i>
          <span><b>${totalChampions}</b> campeones</span>
        </div>
      </div>
      <div class="mv-body">
        <nav class="mv-nav" id="mv-nav">${_mvNavHTML()}</nav>
        <div class="mv-hero" id="mv-hero">${_mvHeroHTML(_mvSel)}</div>
        <aside class="mv-data" id="mv-data">${_mvDataHTML(_mvSel)}</aside>
      </div>
    </div>`;
  _mvBindHero();
  _bindEdgeFade(el.querySelector('#mv-nav'));
  if ('IntersectionObserver' in window){
    new IntersectionObserver(es => es.forEach(e => {
      el.querySelectorAll('.mv-scene').forEach(s => s.style.animationPlayState = e.isIntersecting ? 'running' : 'paused');
    }), { threshold: 0.04 }).observe(el);
  }
}

function initTrophyRoom(root, compData, teamById){
  const N = compData.length;
  const stage = root.querySelector('#tr-stage');
  const room = root.querySelector('#tr-room');
  const flash = root.querySelector('#tr-flash');
  const prevBtn = root.querySelector('#tr-prev');
  const nextBtn = root.querySelector('#tr-next');
  const hint = root.querySelector('#tr-drag-hint');
  const sideEl = root.querySelector('#tr-side-panel');
  const cards = [...stage.querySelectorAll('.tr-case')];
  let pos = 0, target = 0, snapped = -1, dragging = false;
  let dragStartX = 0, dragStartPos = 0, velocity = 0, frame = null;
  let movedDuringDrag = false, interacted = false, firstSnap = true;

  function positionCards(){
    const W = stage.clientWidth || room.clientWidth || 1100;
    const STEP_X = Math.min(290, Math.max(180, W * 0.22)), STEP_Z = 180, TILT = 26;
    cards.forEach((c, i) => {
      let off = i - pos;
      while (off >  N/2) off -= N;
      while (off < -N/2) off += N;
      const abs = Math.abs(off), scale = Math.max(0.55, 1 - abs*0.16);
      const x = off*STEP_X, z = -abs*STEP_Z, rotY = -off*TILT;
      const op = abs > 2.6 ? 0 : Math.max(0, 1 - Math.pow(abs/2.6, 1.6));
      const blur = abs > 0.6 ? Math.min(2.5, (abs-0.6)*1.4) : 0;
      c.style.transform = `translate(-50%, -50%) translate3d(${x}px, 0, ${z}px) rotateY(${rotY}deg) scale(${scale})`;
      c.style.opacity = op.toFixed(3);
      c.style.zIndex = String(1000 - Math.round(abs*100));
      c.style.filter = blur ? `blur(${blur.toFixed(2)}px)` : '';
      c.classList.toggle('is-active', abs < 0.5);
    });
  }
  function setActive(idx){ target = idx; interacted = true; if (hint) hint.classList.add('is-hidden'); }
  function nearestTarget(cardIdx){ const k = Math.round((target - cardIdx)/N); return cardIdx + k*N; }
  function snapTarget(){ target = Math.round(target); }
  function triggerCinematicSnap(idx){
    const card = cards[((idx % N) + N) % N]; if (!card) return;
    flash.classList.remove('fire'); void flash.offsetWidth; flash.classList.add('fire');
    card.classList.remove('cinematic-snap'); void card.offsetWidth; card.classList.add('cinematic-snap');
  }
  function tick(){
    const k = dragging ? 1 : 0.18, diff = target - pos;
    if (Math.abs(diff) < 0.0008 && !dragging) pos = target; else pos += diff*k;
    positionCards();
    const currentSnap = ((Math.round(pos) % N) + N) % N;
    if (currentSnap !== snapped){
      snapped = currentSnap;
      if (sideEl) sideEl.innerHTML = _palmInfoPanel(compData[currentSnap], teamById);
      updateSpotlights(currentSnap);
      if (!firstSnap) triggerCinematicSnap(currentSnap);
      firstSnap = false;
    }
    frame = requestAnimationFrame(tick);
  }
  function updateSpotlights(idx){
    const data = compData[idx]; if (!data) return;
    const champTeam = data.champTeam;
    const isHex = h => h && /^#[0-9a-fA-F]{6}$/.test(h);
    const hex1 = isHex(champTeam?.color) ? champTeam.color : isHex(data.comp.color) ? data.comp.color : '#ffd479';
    const hex2 = isHex(champTeam?.color2) ? champTeam.color2 : hex1;
    function applySpot(spot, hex){
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
      spot.style.setProperty('--spot-color', hex);
      spot.style.setProperty('--spot-glow', `rgba(${r},${g},${b},0.45)`);
      spot.style.setProperty('--spot-cone', `rgba(${r},${g},${b},0.10)`);
    }
    room.querySelectorAll('.tr-spot').forEach((spot, i) => applySpot(spot, i % 2 === 0 ? hex1 : hex2));
  }
  function onPointerDown(e){
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true; movedDuringDrag = false; dragStartX = e.clientX; dragStartPos = target;
    pos = target; velocity = 0; room.classList.add('is-dragging'); interacted = true;
    if (hint) hint.classList.add('is-hidden');
  }
  function onPointerMove(e){
    if (!dragging) return;
    const W = stage.clientWidth || room.clientWidth || 1100;
    const STEP_X = Math.min(290, Math.max(180, W*0.22));
    const dx = e.clientX - dragStartX;
    if (Math.abs(dx) > 15){ movedDuringDrag = true; if (_longPressTimer){ clearTimeout(_longPressTimer); _longPressTimer = null; } }
    const newTarget = dragStartPos - dx/STEP_X; velocity = newTarget - target; target = newTarget;
  }
  function onPointerUp(){ if (!dragging) return; dragging = false; room.classList.remove('is-dragging'); target += velocity*6; snapTarget(); }
  stage.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  const DBL_MS = 600, LONG_MS = 500;
  let _lastClickIdx = -1, _lastClickT = 0, _longPressTimer = null;
  cards.forEach((c, i) => {
    c.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      _longPressTimer = setTimeout(() => {
        _longPressTimer = null;
        if (movedDuringDrag) return;
        const idx = ((Math.round(target) % N) + N) % N;
        if (idx !== i){ setActive(nearestTarget(i)); snapTarget(); }
        _palmOpenFs(i);
      }, LONG_MS);
    });
    c.addEventListener('pointerup', () => { if (_longPressTimer){ clearTimeout(_longPressTimer); _longPressTimer = null; } });
    c.addEventListener('pointercancel', () => { if (_longPressTimer){ clearTimeout(_longPressTimer); _longPressTimer = null; } });
    c.addEventListener('click', () => {
      if (movedDuringDrag) return;
      if (window.matchMedia('(pointer:coarse)').matches){ setActive(nearestTarget(i)); return; }
      const now = performance.now();
      const isDouble = _lastClickIdx === i && (now - _lastClickT) < DBL_MS;
      if (isDouble){
        _lastClickIdx = -1; _lastClickT = 0;
        const idx = ((Math.round(target) % N) + N) % N;
        if (idx !== i){ setActive(nearestTarget(i)); snapTarget(); }
        setTimeout(() => _palmOpenFs(i), 180);
      } else { _lastClickIdx = i; _lastClickT = now; setActive(nearestTarget(i)); }
    });
  });
  prevBtn.addEventListener('click', () => { setActive(target - 1); snapTarget(); });
  nextBtn.addEventListener('click', () => { setActive(target + 1); snapTarget(); });
  function onKey(e){
    if (!root.isConnected || document.getElementById('sala').classList.contains('open')) return;
    if (e.key === 'ArrowLeft')  { setActive(target - 1); snapTarget(); }
    if (e.key === 'ArrowRight') { setActive(target + 1); snapTarget(); }
  }
  window.addEventListener('keydown', onKey);
  const ro = new ResizeObserver(() => positionCards());
  ro.observe(room);
  positionCards();
  tick();
  setTimeout(() => { if (!interacted && hint) hint.classList.add('is-hidden'); }, 7000);
}

// rdpRenderPalmares() — boot movido a initRedesignPublic()

/* ============================================================
   BOOT GATE: nada se ejecuta al cargar el script. Todo el arranque/render
   que tocaba el DOM del prototipo vive aquí y se dispara una sola vez cuando
   el host (la app real) llama a window.initRedesignPublic(), una vez que las
   secciones del prototipo ya existen en el DOM. Orden = el original del archivo.
   ============================================================ */
function initRedesignPublic(){
  if (window._rdpBooted) return;
  window._rdpBooted = true;

  // Ticker
  document.getElementById('ticker-track').innerHTML = TICKER.map(t =>
    `<span class="ticker-item"><span class="tk-comp">${t.comp}</span> ${t.txt}</span>`).join('');

  // Clubes
  initClubs();

  // Carrusel de fases (depende de la competición activa)
  faseCarousel = makeCarousel(
    document.getElementById('cc-fase'),
    () => COMPETICIONES[_ci].fases.map(f => f.name),
    (i) => { _fi = i; renderFaseContent(); }
  );
  // Carrusel de competiciones (al cambiar, recarga las fases y resetea a la 1ª)
  compCarousel = makeCarousel(
    document.getElementById('cc-comp'),
    () => COMPETICIONES.map(c => c.name),
    (i) => {
      _ci = i; _fi = 0;
      document.getElementById('cc-comp').style.setProperty('--cc-accent', COMPETICIONES[i].accent);
      faseCarousel.render(false);
      renderFaseContent();
    }
  );
  compCarousel.render(false);
  document.getElementById('cc-comp').style.setProperty('--cc-accent', COMPETICIONES[0].accent);
  faseCarousel.render(false);
  renderFaseContent();

  // Carrusel de historial (alterna entre las dos fases; ambos panes viven en el DOM)
  histCarousel = makeCarousel(
    document.getElementById('cc-hist'),
    () => ['Partidos', 'Tabla histórica'],
    (i) => {
      document.getElementById('hist-pane-0').hidden = (i !== 0);
      document.getElementById('hist-pane-1').hidden = (i !== 1);
    }
  );
  histCarousel.render(false);

  // Línea de metro (calendario semanal)
  document.getElementById('metro').innerHTML = METRO.map(day => {
    if (!day.matches.length) {
      return `<div class="metro-day empty ${day.cls}">
        <span class="metro-dot"></span>
        <div class="metro-date">${day.d} — sin partidos</div>
      </div>`;
    }
    return `<div class="metro-day ${day.cls}">
      <span class="metro-dot"></span>
      <div class="metro-date">${day.d}${day.cls.includes('today')?' <span class="chip chip-live" style="font-size:9px;"><span class="chip-dot"></span>Jornada en curso</span>':''}</div>
      ${day.matches.map(m => `
        <div class="metro-match">
          <span class="mm-time" ${m.live?'style="color:var(--red);"':''}>${m.t}</span>
          <span class="mm-crest" style="--tc:${m.ac};background:${m.ac};">${m.a}</span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;">${m.txt}</span>
          <span class="mm-crest" style="--tc:${m.bc};background:${m.bc};">${m.b}</span>
          <span class="mm-comp">${m.comp}</span>
        </div>`).join('')}
    </div>`;
  }).join('');

  // Tabla histórica con barras de rendimiento
  document.getElementById('ht-rows').innerHTML = HIST_TABLE.map(r => `
    <div class="ht-row">
      <span class="ht-pos">${r.pos}</span>
      <div class="ht-team"><span class="ht-crest" style="background:${r.tc};">${r.ini}</span><span class="ht-name">${esc(r.name)}</span></div>
      <span class="ht-pj">${r.pj}</span>
      <span class="ht-pts">${r.pts}</span>
      <div class="ht-rend"><div class="ht-bar"><i data-w="${r.rend}"></i></div><span class="ht-pct">${r.rend.toFixed(1)}%</span></div>
    </div>`).join('');

  // Lista de partidos (historial)
  document.getElementById('histm').innerHTML = MATCHES.map(m => `
    <div class="histm-row">
      <div class="hr-num">#${m.id}</div>
      <div class="hr-duel">
        <span class="hr-team ${m.hn > m.an ? 'win' : ''}">${esc(m.h)}</span>
        <span class="hr-score">${m.hn}-${m.an}</span>
        <span class="hr-team away ${m.an > m.hn ? 'win' : ''}">${esc(m.a)}</span>
      </div>
    </div>`).join('');

  // Motion
  MOTION.countdown('#hm-countdown', Date.now() + (4*3600 + 18*60) * 1000, {});
  document.querySelectorAll('[data-reveal]').forEach(el => MOTION.reveal(el));
  MOTION.revealAll('.metro-day', { step: 70, dist: '10px' });
  MOTION.ticker(document.getElementById('ticker'), { speed: 50 });

  // Count-up de hitos del historial al entrar en viewport
  document.querySelectorAll('.hito').forEach(h => hitoIO.observe(h));

  // Barras de rendimiento de la tabla histórica al entrar en viewport
  barIO.observe(document.querySelector('.ht-card'));

  // Sala de trofeos: render inicial de la competición
  _renderComp();

  // Audio del palmarés
  AUDIO.syncUI();
  const palmEl = document.getElementById('pub-palmares-content');
  if (palmEl) palmIO.observe(palmEl);

  // Palmarés (modo vitrina)
  rdpRenderPalmares();
}
window.initRedesignPublic = initRedesignPublic;
})();
