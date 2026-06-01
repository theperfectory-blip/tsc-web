/* ==========================================================
   PARTE 5 — BRACKETS Y PLAYOFFS
   ========================================================== */

/* ----------------------------------------------------------
   UTILS BRACKET
   ---------------------------------------------------------- */
function getWinner(m){
  if(!m||m.ga===null||m.ga===undefined) return null;
  if(m.ga>m.gb) return m.teamA;
  if(m.gb>m.ga) return m.teamB;
  // Empate → usar penales si existen
  if(m.ga===m.gb){
    if(m.penA!=null && m.penB!=null){
      if(m.penA>m.penB) return m.teamA;
      if(m.penB>m.penA) return m.teamB;
    }
  }
  return null;
}

function getPlayoffWinner(m){
  if(!m||m.leg1a===undefined||m.leg1a===null) return null;
  const totA=(m.leg1a||0)+(m.leg2a||0);
  const totB=(m.leg1b||0)+(m.leg2b||0);
  if(totA>totB) return m.teamA;
  if(totB>totA) return m.teamB;
  return null;
}

async function getTeamLogo(name){
  const teams = await dbGetAll('teams', t=>t.name===name);
  return teams[0]||null;
}

function teamLogoHtml(name, team, size=28){
  const ini = team?.ini||name?.substring(0,3)||'?';
  const col = team?.color||'#333';
  if(team?.logo) return `<div style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;flex-shrink:0;"><img src="${team.logo}" style="width:100%;height:100%;object-fit:cover;"></div>`;
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${col};display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue';font-size:${Math.floor(size*0.35)}px;color:#fff;flex-shrink:0;">${ini}</div>`;
}

/* ----------------------------------------------------------
   FUEGOS ARTIFICIALES DEL CAMPEÓN
   ---------------------------------------------------------- */
(function(){
  let _fwCanvas=null, _fwRAF=null, _fwRunning=false;
  let _audioCtx=null;

  function _getAudioCtx(){
    if(!_audioCtx) _audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    return _audioCtx;
  }

  // Sonido de cohete subiendo: silbido ascendente
  function _soundRocketLaunch(volScale){
    try{
      const ctx = _getAudioCtx();
      const vol = volScale||0.18;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      const t = ctx.currentTime;
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(900, t+0.6);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t+0.65);
      osc.start(t); osc.stop(t+0.65);
    }catch(e){}
  }

  // Sonido de explosión: burst de ruido + boom grave
  function _soundExplosion(volScale){
    try{
      const ctx = _getAudioCtx();
      const vol = volScale||0.28;
      const now = ctx.currentTime;

      // Boom grave
      const osc = ctx.createOscillator();
      const gBoom = ctx.createGain();
      osc.connect(gBoom); gBoom.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(20, now+0.4);
      gBoom.gain.setValueAtTime(vol, now);
      gBoom.gain.exponentialRampToValueAtTime(0.001, now+0.4);
      osc.start(now); osc.stop(now+0.4);

      // Crackle de ruido blanco
      const bufSize = ctx.sampleRate * 0.25;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for(let i=0;i<bufSize;i++) data[i]=(Math.random()*2-1);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gNoise = ctx.createGain();
      src.connect(gNoise); gNoise.connect(ctx.destination);
      gNoise.gain.setValueAtTime(vol*0.6, now);
      gNoise.gain.exponentialRampToValueAtTime(0.001, now+0.25);
      src.start(now); src.stop(now+0.25);
    }catch(e){}
  }

  window.launchChampionFireworks = function(teamColors){
    // Si ya hay fuegos corriendo, no relanzar
    if(_fwRunning) return;

    // Parsear color del equipo → RGB para variantes
    function hexToRgb(hex){
      hex=hex.replace('#','');
      if(hex.length===3) hex=hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
      const n=parseInt(hex,16);
      return [(n>>16)&255,(n>>8)&255,n&255];
    }
    function rgbStr(r,g,b,a){ return `rgba(${r},${g},${b},${a})`; }
    function lighten(rgb,t){ return rgb.map(c=>Math.round(c+(255-c)*t)); }
    function darken(rgb,t){  return rgb.map(c=>Math.round(c*(1-t))); }

    let primaryHex = '#C9A84C';
    let secondaryHex = '#FFD86B';
    if(typeof teamColors === 'string'){
      primaryHex = teamColors || primaryHex;
      secondaryHex = primaryHex;
    }else if(teamColors && typeof teamColors === 'object'){
      primaryHex = teamColors.primary || primaryHex;
      secondaryHex = teamColors.secondary || teamColors.primary || secondaryHex;
    }

    const BASE_A = hexToRgb(primaryHex);
    const BASE_B = hexToRgb(secondaryHex);
    const PALETTE = [
      BASE_A,
      BASE_B,
      lighten(BASE_A,0.45),
      lighten(BASE_B,0.45),
      darken(BASE_A,0.28),
      darken(BASE_B,0.28),
      [255,255,220],   // blanco-crema
      [255,255,255],   // blanco puro
    ];

    // Crear canvas overlay fijo encima de todo
    _fwCanvas = document.createElement('canvas');
    _fwCanvas.id = 'fw-canvas';
    Object.assign(_fwCanvas.style, {
      position:'fixed', top:'0', left:'0',
      width:'100%', height:'100%',
      pointerEvents:'none',
      zIndex:'9999',
      opacity:'1',
    });
    document.body.appendChild(_fwCanvas);

    const ctx  = _fwCanvas.getContext('2d');
    let W, H;
    function resize(){
      W = _fwCanvas.width  = window.innerWidth;
      H = _fwCanvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // ── Partícula ──
    class Particle {
      constructor(x,y,color){
        this.x=x; this.y=y;
        const angle = Math.random()*Math.PI*2;
        const speed = 1.5 + Math.random()*5;
        this.vx = Math.cos(angle)*speed;
        this.vy = Math.sin(angle)*speed - Math.random()*2;
        this.alpha = 1;
        this.decay = 0.012 + Math.random()*0.018;
        this.radius = 2.5 + Math.random()*2.5;
        this.color = color;
        this.gravity = 0.12;
        // Chispas tipo estrella aleatoriamente
        this.isStar = Math.random()<0.25;
        this.rot = Math.random()*Math.PI*2;
        this.rotSpeed = (Math.random()-0.5)*0.15;
        // Rastro
        this.trail = [];
        this.maxTrail = Math.floor(3+Math.random()*4);
      }
      update(){
        this.trail.push({x:this.x,y:this.y,a:this.alpha});
        if(this.trail.length>this.maxTrail) this.trail.shift();
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.vx *= 0.98;
        this.alpha -= this.decay;
        this.rot += this.rotSpeed;
      }
      draw(ctx){
        if(this.alpha<=0) return;
        const [r,g,b] = this.color;
        // Rastro
        this.trail.forEach((t,i)=>{
          const ta = t.a*(i/this.trail.length)*0.4;
          ctx.beginPath();
          ctx.arc(t.x,t.y,this.radius*0.6,0,Math.PI*2);
          ctx.fillStyle=rgbStr(r,g,b,ta);
          ctx.fill();
        });
        if(this.isStar){
          // Estrella de 4 puntas
          ctx.save();
          ctx.translate(this.x,this.y);
          ctx.rotate(this.rot);
          ctx.beginPath();
          const s=this.radius*1.4;
          for(let i=0;i<8;i++){
            const a=i*Math.PI/4;
            const r2=i%2===0?s:s*0.45;
            i===0?ctx.moveTo(Math.cos(a)*r2,Math.sin(a)*r2):ctx.lineTo(Math.cos(a)*r2,Math.sin(a)*r2);
          }
          ctx.closePath();
          ctx.fillStyle=rgbStr(r,g,b,this.alpha);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);
          ctx.fillStyle=rgbStr(r,g,b,this.alpha);
          ctx.fill();
        }
      }
      isDead(){ return this.alpha<=0; }
    }

    // ── Cohete ──
    class Rocket {
      constructor(){
        this.x = W*0.15 + Math.random()*(W*0.7);
        this.y = H;
        // targetY: entre 10% y 55% desde arriba, siempre dentro de pantalla
        this.targetY = H*0.10 + Math.random()*(H*0.45);
        // velocidad inicial calculada con cinemática: v = sqrt(2*g*d)
        const dist = this.y - this.targetY;
        const gravity = 0.15;
        this.vy = -Math.sqrt(2 * gravity * dist);
        this.vx = (Math.random()-0.5)*3;
        this.color = PALETTE[Math.floor(Math.random()*PALETTE.length)];
        this.exploded=false;
        this.trail=[];
        // Duración del viaje en segundos para sincronizar el silbido
        this._travelSec = Math.abs(this.vy) / gravity / 60;
        _soundRocketLaunch(0.12 + Math.random()*0.08);
      }
      update(){
        this.trail.push({x:this.x,y:this.y});
        if(this.trail.length>10) this.trail.shift();
        this.x+=this.vx; this.y+=this.vy; this.vy+=0.15;
        if(this.vy>=0) this.explode();
      }
      explode(){
        this.exploded=true;
        const count=80+Math.floor(Math.random()*60);
        for(let i=0;i<count;i++) particles.push(new Particle(this.x,this.y,this.color));
        // Segunda explosión interna (color complementario)
        const c2=PALETTE[Math.floor(Math.random()*PALETTE.length)];
        for(let i=0;i<30;i++) particles.push(new Particle(this.x,this.y,c2));
        // Sonido de explosión
        _soundExplosion(0.2 + Math.random()*0.12);
      }
      draw(ctx){
        for(let i=0;i<this.trail.length;i++){
          const t=this.trail[i];
          const a=(i/this.trail.length)*0.8;
          const [r,g,b]=this.color;
          ctx.beginPath();
          ctx.arc(t.x,t.y,2,0,Math.PI*2);
          ctx.fillStyle=rgbStr(r,g,b,a);
          ctx.fill();
        }
        const [r,g,b]=this.color;
        ctx.beginPath();
        ctx.arc(this.x,this.y,3,0,Math.PI*2);
        ctx.fillStyle=rgbStr(r,g,b,1);
        ctx.fill();
      }
    }

    let particles=[], rockets=[];
    let elapsed=0;
    const DURATION=7000; // ms totales con fuegos
    const FADE_START=5500;
    let lastRocket=0;
    let startTime=performance.now();
    _fwRunning=true;

    // Lanzar primeros cohetes de inmediato
    function spawnRocket(){ rockets.push(new Rocket()); }
    spawnRocket(); spawnRocket(); spawnRocket();

    function loop(now){
      elapsed = now-startTime;
      ctx.clearRect(0,0,W,H);

      // Opacidad global del canvas para fade out
      let opacity=1;
      if(elapsed>FADE_START) opacity=1-((elapsed-FADE_START)/(DURATION-FADE_START));
      opacity=Math.max(0,Math.min(1,opacity));
      _fwCanvas.style.opacity=opacity;

      // Nuevos cohetes periódicamente
      if(elapsed<DURATION-1500 && now-lastRocket>350+Math.random()*400){
        spawnRocket();
        if(Math.random()<0.35) spawnRocket(); // doble lanzamiento ocasional
        lastRocket=now;
      }

      // Actualizar y dibujar cohetes
      rockets=rockets.filter(r=>{
        r.update(); if(!r.exploded) r.draw(ctx); return !r.exploded;
      });

      // Actualizar y dibujar partículas
      particles=particles.filter(p=>{
        p.update(); p.draw(ctx); return !p.isDead();
      });

      if(elapsed<DURATION || particles.length>0){
        _fwRAF=requestAnimationFrame(loop);
      } else {
        _cleanup();
      }
    }

    _fwRAF=requestAnimationFrame(loop);

    function _cleanup(){
      _fwRunning=false;
      if(_fwCanvas && _fwCanvas.parentNode){
        _fwCanvas.parentNode.removeChild(_fwCanvas);
        _fwCanvas=null;
      }
      window.removeEventListener('resize',resize);
      if(_fwRAF) cancelAnimationFrame(_fwRAF);
    }

    // Cancelar si el usuario hace click (para no molestar)
    document.addEventListener('click', function once(){
      _cleanup();
      document.removeEventListener('click',once);
    }, {once:true});
  };
})();


/* ----------------------------------------------------------
   RENDER BRACKET ELIMINATORIO
   Soporta 4, 8, 16, 32 equipos, dos lados opuestos
   ---------------------------------------------------------- */
async function renderBracket(phaseId, containerId, isAdmin=false){
  const el = document.getElementById(containerId);
  if(!el) return;

  const phase = await dbGet('phases', phaseId);
  if(!phase){ el.innerHTML='<div style="color:var(--txt3);">Fase no encontrada.</div>'; return; }

  const config = phase.config||{};
  const totalTeams = config.teams||8;
  const legs = config.legs||'single';
  const finalSingle = config.finalSingle!==false;

  // Cargar partidos del bracket
  const allMatches = await dbGetAll('matches', m=>m.phaseId===phaseId);

  // Estructura de rondas
  const rounds = buildBracketRounds(totalTeams);

  // Mapear partidos existentes
  const matchMap = {};
  allMatches.forEach(m=>{ matchMap[m.slotId]=m; });

  // Rellenar slots con clasificados de grupos si es derivada
  const slots = await buildBracketSlots(phase, rounds, matchMap);

  // Cargar mapa de equipos para búsqueda de nombres
  const allTeams = await dbGetAll('teams');
  const teamById = {};
  allTeams.forEach(t=>teamById[t.id]=t.name);
  window._bracketTeamById = teamById;

  // Render
  el.innerHTML = renderBracketHTML(phase, rounds, slots, matchMap, isAdmin, legs, finalSingle);

  // Escalar bracket para llenar ancho disponible sin scroll
  requestAnimationFrame(()=>{ scaleBracket(phase.id); setTimeout(()=>scaleBracket(phase.id),150); });

  // Cargar logos async
  loadBracketLogos(slots);

  // ✅ Actualizar dinámicamente nombres y colores de equipos (temporada actual)
  if(STATE.season === (phase.season || STATE.season)){
    updateBracketTeamsDynamic(slots);
  }

  // ── Fuegos artificiales del campeón (solo vista pública, contenedor visible) ──
  if(!isAdmin){
    const finalSlotFW = (slots[rounds.length-1]&&slots[rounds.length-1][0])||null;
    const champFW = finalSlotFW ? getWinner(finalSlotFW) : null;
    if(champFW){
      // Solo lanzar si el contenedor está actualmente visible en pantalla
      const elRect = el.getBoundingClientRect();
      const isVisible = elRect.width > 0 && elRect.height > 0 && elRect.top < window.innerHeight;
      if(!window._fwLaunched) window._fwLaunched = {};
      if(isVisible && !window._fwLaunched[phaseId]){
        window._fwLaunched[phaseId] = true;
        // champFW puede ser ID (number) o nombre (legacy)
        const champTeam = (typeof champFW==='number' || Number.isFinite(parseInt(champFW)))
          ? (await dbGet('teams', parseInt(champFW))) || {}
          : ((await dbGetAll('teams', t=>t.name===champFW))[0] || {});
        setTimeout(()=>{
          window.launchChampionFireworks({
            primary: champTeam.color || '#C9A84C',
            secondary: champTeam.color2 || champTeam.color || '#FFD86B',
          });
        }, 800);
      }
    }
  }
}

function buildBracketRounds(totalTeams){
  // Retorna array de rondas con número de partidos
  // totalTeams=8 → [{name:'Cuartos',matches:4},{name:'Semifinal',matches:2},{name:'Final',matches:1}]
  const rounds=[];
  let n = totalTeams/2;
  const names = {1:'Final',2:'Semifinal',4:'Cuartos de final',8:'Octavos de final',16:'Dieciseisavos'};
  while(n>=1){
    rounds.push({name:names[n]||`Ronda de ${n*2}`, matches:n});
    n=Math.floor(n/2);
  }
  return rounds;
}

/* ----------------------------------------------------------
   CACHE DE STANDINGS POR FASE (para no recalcular múltiples veces)
   ---------------------------------------------------------- */
const _standingsCache = {};

async function getStandingsForPhase(phaseId){
  if(_standingsCache[phaseId]) return _standingsCache[phaseId];
  const phase    = await dbGet('phases', parseInt(phaseId));
  if(!phase) return {};
  const matches  = await dbGetAll('matches', m=>m.phaseId===parseInt(phaseId));
  const groups   = phase.groups||{};
  const criteria = await getCriteria(parseInt(phaseId));
  const result   = {};
  Object.keys(groups).forEach(gi=>{
    const teamNames = (groups[gi]||[]).filter(t=>t!=null);
    const gMatches  = matches.filter(m=>m.groupIdx===parseInt(gi));
    const standings = calcGroupStandings(teamNames, gMatches, criteria, gMatches);
    result[parseInt(gi)] = standings; // result[groupIdx] = [{name, pts, ...}]
  });
  _standingsCache[phaseId] = result;
  return result;
}

function invalidateStandingsCache(phaseId){ delete _standingsCache[phaseId]; }

/* Resuelve una ref dinámica → ID del equipo o null */
async function resolveSlotRef(ref){
  if(!ref) return null;
  if(ref.type==='fixed') return ref.team||null;
  // Referencia directa de un equipo (creada por el módulo Sorteo).
  if(ref.type==='team'){
    const tid = parseInt(ref.teamId);
    return Number.isFinite(tid) ? tid : null;
  }
  if(ref.type==='ref'){
    const standings = await getStandingsForPhase(ref.phaseId);
    const group     = standings[ref.groupIdx]||[];
    const team      = group[ref.place-1]; // place es 1-based, standings tienen {id, pts, ...}
    return team?.id || null;
  }
  if(ref.type==='playoff_winner'){
    const winner = await getPlayoffWinnerForMatch(ref.phaseId, ref.matchIdx);
    if(winner==null) return null;
    // Compatibilidad: getPlayoffWinnerForMatch retorna teamA/teamB del match,
    // que con el sistema de IDs ya son numbers. Si fuese un nombre legacy, hacemos lookup.
    if(typeof winner === 'number') return winner;
    const asInt = parseInt(winner);
    if(Number.isFinite(asInt) && String(asInt)===String(winner)) return asInt;
    const team = await dbGetAll('teams', t=>t.name===winner);
    return team[0]?.id || null;
  }
  if(ref.type==='winner'){
    // Ganador de un partido anterior del mismo bracket
    return null; // se propaga automáticamente
  }
  return null;
}

/* Etiqueta legible de una ref para mostrar en slot TBD */
async function refLabel(ref){
  if(!ref) return 'Por definir';
  if(ref.type==='fixed') return ref.team||'Por definir';
  if(ref.type==='team') return 'Sorteo';
  if(ref.type==='ref'){
    const ordinal = ['1ro','2do','3ro','4to','5to','6to','7mo','8vo','9no'][ref.place-1]||`${ref.place}°`;
    const groupLetter = String.fromCharCode(65+ref.groupIdx);
    return `G${groupLetter}-${ordinal}`;
  }
  if(ref.type==='playoff_winner'){
    const phase = await dbGet('phases', parseInt(ref.phaseId));
    const phaseName = phase?.name || 'Playoff';
    return `Ganador Llave ${parseInt(ref.matchIdx)+1} · ${phaseName}`;
  }
  return 'Por definir';
}

/* Colores por grupo (cíclico) y por posición */
const GROUP_COLORS = ['#3B82F6','#25A864','#E84040','#8B5CF6','#F97316','#14B8A6','#EC4899','#EAB308'];
const PLACE_COLORS = ['#C9A84C','#9CA3AF','#CD7F32','#6366F1','#F87171','#34D399','#60A5FA','#F472B6'];

/* Renderiza un badge coloreado a partir de un label "GX-Nro" */
function refBadgeHTML(label){
  const m = label.match(/^G([A-Z])-(.+)$/);
  if(!m) return `<span style="font-size:11px;color:var(--txt3);">${label}</span>`;
  const groupIdx = m[1].charCodeAt(0)-65;
  const placeIdx = ['1ro','2do','3ro','4to','5to','6to','7mo','8vo'].indexOf(m[2]);
  const gColor = GROUP_COLORS[groupIdx % GROUP_COLORS.length];
  const pColor = PLACE_COLORS[Math.max(0,placeIdx) % PLACE_COLORS.length];
  return `<span style="font-size:11px;font-weight:700;font-family:'Barlow Condensed';letter-spacing:0.3px;">` +
    `<span style="color:${gColor};">G${m[1]}</span>` +
    `<span style="color:var(--txt3);">-</span>` +
    `<span style="color:${pColor};">${m[2]}</span>` +
    `</span>`;
}

async function buildBracketSlots(phase, rounds, matchMap){
  // Invalidar cache al reconstruir
  invalidateStandingsCache(phase.id);

  // slots[roundIdx][matchIdx] = {teamA, teamB, ga, gb, refA, refB, labelA, labelB}
  const slots = rounds.map(r=>Array(r.matches).fill(null).map(()=>({
    teamA:null, teamB:null, ga:null, gb:null,
    refA:null, refB:null, labelA:'Por definir', labelB:'Por definir'
  })));

  // ── 1. Resolver referencias dinámicas (slotRefs) ──────────────────
  const slotRefs = phase.slotRefs||[];
  for(const ref of slotRefs){
    const {slotIdx, side} = ref;
    if(!slots[0][slotIdx]) continue;
    const team  = await resolveSlotRef(ref);
    const label = await refLabel(ref);
    if(side==='A'){
      slots[0][slotIdx].teamA  = team;
      slots[0][slotIdx].refA   = ref;
      slots[0][slotIdx].labelA = label;
    } else {
      slots[0][slotIdx].teamB  = team;
      slots[0][slotIdx].refB   = ref;
      slots[0][slotIdx].labelB = label;
    }
  }

  // ── 2. Compatibilidad con sourceGroups antiguo ────────────────────
  if(phase.sourceGroups && !slotRefs.length){
    const classified = await getClassifiedFromPhase(phase.sourcePhaseId);
    const pairings   = phase.sourceGroups;
    pairings.forEach((pair,i)=>{
      if(!slots[0][i]) return;
      slots[0][i].teamA = classified[pair.a]||null;
      slots[0][i].teamB = classified[pair.b]||null;
    });
  } else if(phase.manualSlots && !slotRefs.length){
    phase.manualSlots.forEach((ms,i)=>{
      if(slots[0][i]) slots[0][i] = {...slots[0][i], ...ms};
    });
  }

  // ── 3. Rellenar desde matchMap y propagar ganadores ───────────────
  rounds.forEach((r,ri)=>{
    r.matches && Array.from({length:r.matches}).forEach((_,mi)=>{
      const slotId=`${phase.id}_r${ri}_m${mi}`;
      const saved=matchMap[slotId];
      if(saved){
        slots[ri][mi].teamA=saved.teamA||slots[ri][mi].teamA;
        slots[ri][mi].teamB=saved.teamB||slots[ri][mi].teamB;
        slots[ri][mi].ga=saved.goalsA??null;
        slots[ri][mi].gb=saved.goalsB??null;
        slots[ri][mi].penA=saved.penA??null;
        slots[ri][mi].penB=saved.penB??null;
      }
      // Propagar ganador a siguiente ronda
      if(ri+1<rounds.length){
        const w=getWinner(slots[ri][mi]);
        if(w){
          const nextMatch=Math.floor(mi/2);
          const isA=mi%2===0;
          if(!slots[ri+1][nextMatch]) slots[ri+1][nextMatch]={teamA:null,teamB:null,ga:null,gb:null,refA:null,refB:null,labelA:'Ganador anterior',labelB:'Ganador anterior'};
          if(isA) slots[ri+1][nextMatch].teamA=w;
          else    slots[ri+1][nextMatch].teamB=w;
        }
      }
    });
  });

  return slots;
}

async function getClassifiedFromPhase(sourcePhaseId){
  if(!sourcePhaseId) return {};
  const standings = await getStandingsForPhase(sourcePhaseId);
  const result = {};
  Object.keys(standings).forEach(gi=>{
    const letter = String.fromCharCode(65+parseInt(gi));
    // Standings desde calcGroupStandings: {id, pts, ...}. Guardamos el ID del equipo.
    standings[gi].forEach((s,pos)=>{ result[`${pos+1}${letter}`]=s.id; });
  });
  return result;
}

function renderBracketHTML(phase, rounds, slots, matchMap, isAdmin, legs, finalSingle){
  const nRounds = rounds.length;
  if(!nRounds) return '<div style="color:var(--txt3);">Sin rondas configuradas.</div>';

  const _bkCs = getComputedStyle(document.documentElement);
  const CARD_W = parseFloat(_bkCs.getPropertyValue('--bk-card-w')) || 220;
  const ROW_H  = parseFloat(_bkCs.getPropertyValue('--bk-row-h')) || 88;

  const leftSlots  = slots.map(r => r.slice(0, Math.ceil(r.length/2)));
  const rightSlots = slots.map(r => r.slice(Math.ceil(r.length/2)));
  const hasRight   = rightSlots[0] && rightSlots[0].length > 0;

  /* ── SVG Trofeo ── */
  const trophySVG = '<svg viewBox="0 0 140 200" xmlns="http://www.w3.org/2000/svg" style="width:130px;height:185px;filter:drop-shadow(0 0 28px rgba(201,168,76,0.9));display:block;margin:0 auto;">'
    +'<defs>'
    +'<linearGradient id="tga" x1="0%" y1="0%" x2="60%" y2="100%"><stop offset="0%" stop-color="#FFF0A0"/><stop offset="30%" stop-color="#E8C84A"/><stop offset="65%" stop-color="#C9A030"/><stop offset="100%" stop-color="#8A6010"/></linearGradient>'
    +'<linearGradient id="tgb" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FFF0A0"/><stop offset="50%" stop-color="#C9A84C"/><stop offset="100%" stop-color="#705010"/></linearGradient>'
    +'</defs>'
    +'<rect x="28" y="185" width="84" height="11" rx="5" fill="url(#tga)"/>'
    +'<rect x="36" y="175" width="68" height="12" rx="4" fill="url(#tgb)"/>'
    +'<rect x="57" y="135" width="26" height="42" rx="6" fill="url(#tga)"/>'
    +'<ellipse cx="70" cy="136" rx="32" ry="8" fill="url(#tgb)"/>'
    +'<path d="M38 80 Q28 118 70 136 Q112 118 102 80 Z" fill="url(#tga)"/>'
    +'<path d="M48 80 Q40 112 70 128 Q100 112 92 80 Z" fill="url(#tgb)" opacity="0.5"/>'
    +'<ellipse cx="70" cy="80" rx="32" ry="9" fill="url(#tga)"/>'
    +'<ellipse cx="70" cy="34" rx="28" ry="8" fill="url(#tga)"/>'
    +'<path d="M42 34 L38 80 Q70 90 102 80 L98 34 Z" fill="url(#tga)" opacity="0.9"/>'
    +'<path d="M38 80 Q10 76 12 48 Q14 26 42 28" fill="none" stroke="url(#tga)" stroke-width="9" stroke-linecap="round"/>'
    +'<path d="M38 80 Q12 76 14 50 Q16 30 42 32" fill="none" stroke="url(#tgb)" stroke-width="4" stroke-linecap="round" opacity="0.6"/>'
    +'<path d="M102 80 Q130 76 128 48 Q126 26 98 28" fill="none" stroke="url(#tga)" stroke-width="9" stroke-linecap="round"/>'
    +'<path d="M102 80 Q128 76 126 50 Q124 30 98 32" fill="none" stroke="url(#tgb)" stroke-width="4" stroke-linecap="round" opacity="0.6"/>'
    +'<text x="70" y="100" text-anchor="middle" font-size="28" fill="rgba(0,0,0,0.18)" font-family="serif">\u2605</text>'
    +'</svg>';

  function ini(n){ return n ? n.substring(0,3).toUpperCase() : '?'; }

  function logoCircle(id, name){
    return '<div id="'+id+'" style="width:34px;height:34px;border-radius:50%;background:var(--card2);border:2px solid var(--brd2);flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-family:\'Barlow Condensed\';font-size:9px;font-weight:700;color:var(--txt3);">'+ini(name)+'</div>';
  }

  function teamRow(logoId, teamId, score, isWin, isTbd, label, clickFn){
    var name = (teamId && window._bracketTeamById) ? window._bracketTeamById[teamId] : null;
    var txt = name||(label||'Por definir');
    var bdr = isWin ? 'border-left:3px solid var(--gold);' : 'border-left:3px solid transparent;';
    var bg  = isWin ? 'background:rgba(201,168,76,0.09);' : '';
    var op  = isTbd ? 'opacity:0.4;' : '';
    var cur = clickFn ? 'cursor:pointer;' : '';
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;'+bdr+bg+op+cur+'transition:background 0.1s;" '
      +(clickFn?'onclick="'+clickFn+'"':'')+'>'
      +logoCircle(logoId, name)
      +'<span style="flex:1;font-family:\'Barlow Condensed\';font-size:15px;font-weight:'+(isWin?700:600)+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px;color:'+(isTbd?'var(--txt3)':'var(--txt)')+';">'+txt+'</span>'
      +'<span style="font-family:\'Bebas Neue\';font-size:20px;min-width:22px;text-align:right;color:'+(isWin?'var(--gold)':'var(--txt3)')+';">'+score+'</span>'
      +'</div>';
  }

  function matchCard(slot, ri, mi, side){
    if(!slot) return '<div style="width:'+CARD_W+'px;height:'+(ROW_H*2)+'px;"></div>';
    var realMi = mi + (side==='right' ? Math.ceil(rounds[ri].matches/2) : 0);
    var slotId = phase.id+'_r'+ri+'_m'+realMi;
    var isDraw = slot.ga!==null && slot.gb!==null && slot.ga===slot.gb;
    var hasPen = isDraw && slot.penA!=null && slot.penB!=null;
    var aW = slot.ga!==null && (slot.ga>slot.gb||(hasPen&&slot.penA>slot.penB));
    var bW = slot.gb!==null && (slot.gb>slot.ga||(hasPen&&slot.penB>slot.penA));
    var aTbd=!slot.teamA, bTbd=!slot.teamB;
    var hasResult=slot.ga!==null&&slot.gb!==null;
    var sA=slot.ga!==null?(hasPen?slot.ga+'('+slot.penA+')':''+slot.ga):'-';
    var sB=slot.gb!==null?(hasPen?slot.gb+'('+slot.penB+')':''+slot.gb):'-';
    var cfn=(!aTbd&&!bTbd)?"openBracketMatchModal('"+phase.id+"',"+ri+","+realMi+","+isAdmin+")":null;
    // Resaltar bordes solo cuando ya hay equipo resuelto (no cuando solo existe la referencia)
    var bc=(slot.teamA||slot.teamB)?'var(--gold-b)':'var(--brd)';

    var bA='',bB='';
    if(isAdmin&&ri===0&&!hasResult){
      bA='<div style="padding:0 10px 4px;">'
        +'<button onclick="event.stopPropagation();openSlotRefModal('+phase.id+','+realMi+',\'A\')" style="font-size:10px;padding:2px 6px;background:var(--card2);border:1px solid var(--brd2);border-radius:3px;color:'+(slot.teamA?'var(--gold)':'var(--txt3)')+';cursor:pointer;">'
          +(slot.refA?(slot.teamA?'&#10003; ':'⏱ ')+refBadgeHTML(slot.labelA):' Ref')+'</button>'
        +'</div>';
      bB='<div style="padding:0 10px 4px;">'
        +'<button onclick="event.stopPropagation();openSlotRefModal('+phase.id+','+realMi+',\'B\')" style="font-size:10px;padding:2px 6px;background:var(--card2);border:1px solid var(--brd2);border-radius:3px;color:'+(slot.teamB?'var(--gold)':'var(--txt3)')+';cursor:pointer;">'
          +(slot.refB?(slot.teamB?'&#10003; ':'⏱ ')+refBadgeHTML(slot.labelB):' Ref')+'</button>'
        +'</div>';
    }

    return '<div style="background:var(--card);border:1px solid '+bc+';border-radius:10px;overflow:hidden;'
      +'width:'+CARD_W+'px;flex-shrink:0;box-shadow:0 2px 16px rgba(0,0,0,0.12);" '
      +'onmouseover="this.style.boxShadow=\'0 4px 24px rgba(201,168,76,0.22)\';this.style.borderColor=\'var(--gold-b)\'" '
      +'onmouseout="this.style.boxShadow=\'0 2px 16px rgba(0,0,0,0.12)\';this.style.borderColor=\''+bc+'\'">'
      +teamRow('blogo-'+slotId+'-a',slot.teamA,sA,aW,aTbd,slot.labelA,cfn)
      +bA
      +'<div style="height:1px;background:var(--brd);margin:0 10px;"></div>'
      +teamRow('blogo-'+slotId+'-b',slot.teamB,sB,bW,bTbd,slot.labelB,cfn)
      +bB
      +'</div>';
  }

  /* ── Columna de ronda
     nFirst = nº de partidos en ronda 0 del mismo lado
     Altura total = nFirst * ROW_H * 2
     Cada partido en ri ocupa colH/nSlots de esa altura
  ── */
  function buildCol(rSlots, ri, side, nFirst){
    var colH = nFirst * ROW_H * 2;
    var slotH = colH / rSlots.length;
    // Lado derecho: invertir el orden visual de los partidos
    var ordered = side==='right' ? rSlots.slice().reverse() : rSlots;
    var cells = ordered.map(function(slot, vi){
      var localMi = side==='right' ? (rSlots.length-1-vi) : vi;
      return '<div style="height:'+slotH+'px;display:flex;align-items:center;justify-content:center;padding:4px 0;">'
        +matchCard(slot, ri, localMi, side)
        +'</div>';
    }).join('');
    return '<div style="display:flex;flex-direction:column;width:'+(CARD_W+24)+'px;flex-shrink:0;">'
      +'<div style="height:32px;display:flex;align-items:center;justify-content:center;font-family:\'Barlow Condensed\';font-weight:700;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:var(--txt3);">'+rounds[ri].name+'</div>'
      +cells
      +'</div>';
  }

  /* ── Lado izquierdo: columnas de izquierda a derecha (Cuartos→Semi→Final)
     Lado derecho: columnas de derecha a izquierda (Final←Semi←Cuartos)
     AMBOS se renderizan en orden normal (ri=0 primero),
     y el lado derecho se voltea con flex-direction:row-reverse en su wrapper
  ── */
  function renderSide(sideSlots, side){
    var nFirst = sideSlots[0] ? sideSlots[0].length : 1;
    // Excluir última ronda (Final) — va al centro
    var cols = sideSlots.slice(0,-1).map(function(rSlots,ri){
      return buildCol(rSlots, ri, side, nFirst);
    });
    // Lado derecho: invertir el orden de las columnas para que Semi esté junto al centro
    if(side==='right') cols.reverse();
    return '<div style="display:flex;flex-direction:row;">'+cols.join('')+'</div>';
  }

  /* ── Final ── */
  var finalSlot = (slots[nRounds-1]&&slots[nRounds-1][0])||{teamA:null,teamB:null,ga:null,gb:null};
  var champId = getWinner(finalSlot);
  var champ = (champId && window._bracketTeamById) ? window._bracketTeamById[champId] : null;
  var nFirst = leftSlots[0] ? leftSlots[0].length : 1;
  var colH = nFirst * ROW_H * 2;

  var champSection = champ
    ? '<div style="text-align:center;margin-top:24px;padding-bottom:8px;">'+trophySVG
      +'<div style="font-family:\'Barlow Condensed\';font-size:13px;letter-spacing:4px;color:var(--gold);text-transform:uppercase;margin-top:10px;">Campe&oacute;n</div>'
      +'<div style="font-family:\'Bebas Neue\';font-size:34px;letter-spacing:2px;color:var(--txt);line-height:1;">'+champ+'</div></div>'
    : '<div style="text-align:center;margin-top:24px;padding-bottom:8px;opacity:0.5;">'+trophySVG
      +'<div style="font-family:\'Barlow Condensed\';font-size:12px;letter-spacing:2px;color:var(--txt3);text-transform:uppercase;margin-top:10px;">Campe&oacute;n por definir</div></div>';

  var centerW = CARD_W + 40;

  var bracketUid = 'bk-'+phase.id;
  var totalTeams = (slots[0]?.length || 0) * 2;
  return '<div id="'+bracketUid+'-wrap" data-bk-teams="'+totalTeams+'" style="padding:24px 0 32px;width:100%;overflow-x:auto;overflow-y:visible;box-sizing:border-box;">'
    +'<div id="'+bracketUid+'-inner" style="display:inline-flex;flex-direction:column;align-items:center;transform-origin:top center;">'
      +'<div style="font-family:\'Bebas Neue\';font-size:30px;letter-spacing:6px;color:var(--gold);text-align:center;margin-bottom:20px;text-shadow:0 0 30px rgba(201,168,76,0.35);">'+(phase.name||'Fase Final')+'</div>'
      +'<div style="display:flex;align-items:flex-start;margin:0 auto;">'
        +renderSide(leftSlots,'left')
        +'<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:'+centerW+'px;">'
          +'<div style="height:32px;display:flex;align-items:center;justify-content:center;font-family:\'Barlow Condensed\';font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--txt3);">Final</div>'
          +'<div style="height:'+colH+'px;display:flex;align-items:center;justify-content:center;width:100%;">'
            +matchCard(finalSlot, nRounds-1, 0, 'left')
          +'</div>'
        +'</div>'
        +(hasRight ? renderSide(rightSlots,'right') : '')
      +'</div>'
      +champSection
    +'</div>'
  +'</div>';
}


/* Escala el bracket: ancho y alto del viewport; scroll horizontal si hace falta */
function scaleBracket(phaseId){
  var uid = 'bk-'+phaseId;
  var wrap  = document.getElementById(uid+'-wrap');
  var inner = document.getElementById(uid+'-inner');
  if(!wrap || !inner) return;
  inner.style.transform = '';
  var teams = parseInt(wrap.getAttribute('data-bk-teams') || '8', 10);
  // Evita recorte lateral: para 8+ no ampliar por encima del tamaño natural.
  var maxScale = teams <= 4 ? 1.00 : 1.00;
  var minScale = teams <= 4 ? 0.70 : 0.55;
  var availW = wrap.clientWidth - 4;
  var rect = wrap.getBoundingClientRect();
  var availH = Math.max(window.innerHeight - rect.top - 40, 420);
  var natW = inner.scrollWidth;
  var natH = inner.scrollHeight;
  if(natW < 1) return;
  var s = Math.min(availW / natW, availH / natH, maxScale);
  if(s < minScale) s = minScale;
  inner.style.transform       = 'scale('+s+')';
  inner.style.transformOrigin = 'top center';
  // Al re-renderizar, comenzar siempre desde el borde izquierdo.
  wrap.scrollLeft = 0;
  var padY = 24 + 32;
  var glowSafe = teams <= 4 ? 90 : 48;
  wrap.style.height = (inner.scrollHeight * s + padY + glowSafe) + 'px';
}
// Re-escalar en resize de ventana
window.addEventListener('resize', function(){
  document.querySelectorAll('[id$="-wrap"]').forEach(function(wrap){
    var m = wrap.id.match(/^bk-(\d+)-wrap$/);
    if(m) scaleBracket(parseInt(m[1]));
  });
});

function loadBracketLogos(slots){
  setTimeout(async()=>{
    const refs=new Set();
    slots.forEach(r=>r.forEach(s=>{if(s?.teamA!=null)refs.add(s.teamA);if(s?.teamB!=null)refs.add(s.teamB);}));
    if(!refs.size) return;
    const allTeams = await dbGetAll('teams');
    const byId   = Object.fromEntries(allTeams.map(t=>[t.id, t]));
    const byName = Object.fromEntries(allTeams.map(t=>[t.name, t]));
    for(const ref of refs){
      const team = byId[ref] || byName[ref];
      if(!team?.logo) continue;
      const key = team.name?.substring(0,6) || String(ref);
      document.querySelectorAll(`[id*="${key}"]`).forEach(el=>{
        if(el.id.startsWith('blogo-')) el.innerHTML=`<img src="${team.logo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      });
    }
  },100);
}

/* ----------------------------------------------------------
   MODAL ASIGNACIÓN DE REFERENCIA DE SLOT
   ---------------------------------------------------------- */
async function openSlotRefModal(phaseId, slotIdx, side, targetType='bracket'){
  phaseId = parseInt(phaseId);
  const phase = await dbGet('phases', phaseId);
  if(!phase) return;
  window._slotRefTargetType = targetType;

  // Referencias por tabla (misma competición)
  const groupPhases = await dbGetAll('phases', p =>
    p.type==='groups' && p.compId===phase.compId && (p.season===STATE.season||!p.season) && p.id!==phaseId
  );
  // Referencias por llave de playoff (permite cruce de divisiones si comparten temporada)
  const playoffPhases = await dbGetAll('phases', p =>
    p.type==='playoff' && (p.season===STATE.season||!p.season) && p.id!==phaseId
  );
  const competitions = await dbGetAll('competitions');

  // Ref actual para este slot/side
  const existing = (phase.slotRefs||[]).find(r=>r.slotIdx===slotIdx&&r.side===side);

  let selSourceType = existing?.type==='playoff_winner' ? 'playoff_winner' : 'ref';
  let selPhaseId  = existing?.type==='ref' ? existing.phaseId : (groupPhases[0]?.id||null);
  let selGroupIdx = existing?.groupIdx ?? 0;
  let selPlace    = existing?.place    ?? 1;
  let selPlayoffPhaseId = existing?.type==='playoff_winner' ? existing.phaseId : (playoffPhases[0]?.id||null);
  let selPlayoffMatchIdx = existing?.type==='playoff_winner' ? (existing.matchIdx ?? 0) : 0;

  let wrap = document.getElementById('slot-ref-modal-wrap');
  if(!wrap){ wrap=document.createElement('div'); wrap.id='slot-ref-modal-wrap'; document.body.appendChild(wrap); }

  async function buildModal(){
    const selPhase = groupPhases.find(p=>p.id===selPhaseId);
    const selPlayoff = playoffPhases.find(p=>p.id===selPlayoffPhaseId);
    const groups   = selPhase?.groups||{};
    const nGroups  = Object.keys(groups).length||1;
    const groupSize= groups[selGroupIdx]?.length || (selPhase?.config?.teamsPerGroup||8);
    const playoffMatchups = getPlayoffMatchupsCount(selPlayoff);

    const phaseOpts = groupPhases.map(p=>{
      const compName = competitions.find(c=>c.id===p.compId)?.name || '';
      return `<option value="${p.id}" ${p.id===selPhaseId?'selected':''}>${p.name}${compName ? ' — ' + compName : ''}</option>`;
    }).join('');
    const playoffOpts = playoffPhases.map(p=>{
      const compName = competitions.find(c=>c.id===p.compId)?.name || 'Sin competición';
      const mCount = getPlayoffMatchupsCount(p);
      return `<option value="${p.id}" ${p.id===selPlayoffPhaseId?'selected':''}>${compName} → ${p.name} (${mCount} cruce${mCount===1?'':'s'})</option>`;
    }).join('');

    const groupOpts = Array.from({length:nGroups},(_,i)=>`
      <option value="${i}" ${i===selGroupIdx?'selected':''}>Grupo ${String.fromCharCode(65+i)}</option>`
    ).join('');

    const placeOpts = Array.from({length:groupSize},(_,i)=>`
      <option value="${i+1}" ${i+1===selPlace?'selected':''}>${['1ro','2do','3ro','4to','5to','6to','7mo','8vo','9no'][i]||`${i+1}°`}</option>`
    ).join('');
    // Si cambió el playoff origen, asegurar que la llave seleccionada siga siendo válida
    if(!Number.isFinite(selPlayoffMatchIdx) || selPlayoffMatchIdx<0) selPlayoffMatchIdx = 0;
    if(selPlayoffMatchIdx >= playoffMatchups) selPlayoffMatchIdx = playoffMatchups-1;

    const playoffKeyOpts = Array.from({length:playoffMatchups},(_,i)=>`
      <option value="${i}" ${i===selPlayoffMatchIdx?'selected':''}>Llave ${i+1}</option>`
    ).join('');

    // Preview: resolver quién sería ahora
    let previewTeam = '—';
    if(selSourceType==='ref' && selPhaseId){
      // Standings ahora devuelven {id, pts, ...} sin .name → resolver el nombre vía dbGet
      const standings = await getStandingsForPhase(selPhaseId);
      const standingEntry = standings[selGroupIdx]?.[selPlace-1];
      if(standingEntry?.id != null){
        const team = await dbGet('teams', standingEntry.id);
        previewTeam = team?.name || `#${standingEntry.id}`;
      } else {
        // Fallback: si no hay standings (sin partidos jugados), usar el orden de asignación al grupo
        const selPhaseData = await dbGet('phases', selPhaseId);
        const groupTeams = selPhaseData?.groups?.[selGroupIdx] || [];
        const teamId = groupTeams[selPlace-1];
        if(teamId != null){
          const team = await dbGet('teams', teamId);
          previewTeam = team?.name || `#${teamId}`;
        } else {
          previewTeam = '(sin datos aún)';
        }
      }
    } else if(selSourceType==='playoff_winner' && selPlayoffPhaseId!=null){
      const winnerRef = await getPlayoffWinnerForMatch(selPlayoffPhaseId, selPlayoffMatchIdx);
      if(winnerRef==null){
        previewTeam = '(llave sin definir)';
      } else if(typeof winnerRef==='number' || Number.isFinite(parseInt(winnerRef))){
        const team = await dbGet('teams', parseInt(winnerRef));
        previewTeam = team?.name || `#${winnerRef}`;
      } else {
        previewTeam = winnerRef; // legacy: nombre directo
      }
    }

    const ordinal = ['1ro','2do','3ro','4to','5to','6to','7mo','8vo','9no'][selPlace-1]||`${selPlace}°`;
    const groupLetter = String.fromCharCode(65+selGroupIdx);
    const shortLabel = selSourceType==='ref'
      ? `G${groupLetter}-${ordinal}`
      : `Ganador Llave ${selPlayoffMatchIdx+1}`;
    const badgePreview = refBadgeHTML(shortLabel);

    wrap.innerHTML = `
    <div class="modal-overlay open" id="slot-ref-modal">
      <div class="modal" style="max-width:420px;">
        <div class="modal-hdr">
          <div class="modal-title">Asignar Slot ${side==='A'?'Superior':'Inferior'} · Partido ${slotIdx+1}</div>
          <button class="modal-close" onclick="document.getElementById('slot-ref-modal-wrap').innerHTML=''">×</button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:14px;">

          <div style="background:var(--gold-l);border:1px solid var(--gold-b);border-radius:var(--r);padding:10px 12px;font-size:14px;">
            <div style="color:var(--txt3);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Referencia actual</div>
            <div style="font-weight:600;font-size:17px;">${badgePreview}</div>
            <div style="color:var(--txt2);margin-top:3px;">Equipo ahora: <strong style="color:var(--txt);">${previewTeam}</strong></div>
          </div>

          <div class="form-group">
            <label>Tipo de referencia</label>
            <select id="sref-source" style="width:100%;">
              <option value="ref" ${selSourceType==='ref'?'selected':''}>Posición de fase de grupos</option>
              <option value="playoff_winner" ${selSourceType==='playoff_winner'?'selected':''}>Ganador de llave (playoff)</option>
            </select>
          </div>

          <div id="sref-ref-block" style="display:${selSourceType==='ref'?'block':'none'};">
            <div class="form-group">
            <label>Fase origen</label>
              <select id="sref-phase" style="width:100%;" ${groupPhases.length?'':('disabled style="opacity:0.6;"')}>${groupPhases.length?phaseOpts:`<option>${phase.compId?'No hay fases de grupos en esta competición':'Esta fase no está vinculada a una competición'}</option>`}</select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Grupo</label>
                <select id="sref-group">${groupOpts}</select>
              </div>
              <div class="form-group">
                <label>Posición</label>
                <select id="sref-place">${placeOpts}</select>
              </div>
            </div>
          </div>

          <div id="sref-playoff-block" style="display:${selSourceType==='playoff_winner'?'block':'none'};">
            <div class="form-group">
              <label>Playoff origen</label>
              <select id="sref-playoff-phase" style="width:100%;">${playoffPhases.length?playoffOpts:'<option>No hay playoffs disponibles</option>'}</select>
            </div>
            <div class="form-group">
              <label>Llave</label>
              <select id="sref-playoff-key">${playoffKeyOpts}</select>
            </div>
          </div>

          <div style="padding:8px 12px;background:var(--card2);border-radius:var(--r);font-size:13px;color:var(--txt2);">
            💡 El slot se actualizará automáticamente al cambiar la tabla de posiciones.
          </div>
        </div>
        <div class="modal-footer" style="justify-content:space-between;">
          <button class="btn btn-danger btn-sm" id="slot-ref-remove-btn">Quitar ref</button>
          <div style="display:flex;gap:8px;">
            <button class="btn" onclick="document.getElementById('slot-ref-modal-wrap').innerHTML=''">Cancelar</button>
            <button class="btn btn-primary" id="slot-ref-save-btn">Guardar</button>
          </div>
        </div>
      </div>
    </div>`;

    // Listeners para preview en tiempo real
    document.getElementById('sref-source')?.addEventListener('change', async e=>{
      selSourceType = e.target.value;
      await buildModal();
    });
    document.getElementById('sref-phase')?.addEventListener('change', async e=>{
      selPhaseId  = parseInt(e.target.value);
      selGroupIdx = 0; selPlace = 1;
      await buildModal();
    });
    document.getElementById('sref-group')?.addEventListener('change', e=>{
      selGroupIdx = parseInt(e.target.value);
      buildModal();
    });
    document.getElementById('sref-place')?.addEventListener('change', e=>{
      selPlace = parseInt(e.target.value);
      buildModal();
    });
    document.getElementById('sref-playoff-phase')?.addEventListener('change', async e=>{
      selPlayoffPhaseId = parseInt(e.target.value);
      selPlayoffMatchIdx = 0;
      await buildModal();
    });
    document.getElementById('sref-playoff-key')?.addEventListener('change', e=>{
      selPlayoffMatchIdx = parseInt(e.target.value);
      buildModal();
    });

    // Botones con addEventListener para evitar conflictos con confirm-overlay
    document.getElementById('slot-ref-remove-btn')?.addEventListener('click', ()=>{
      removeSlotRef(phaseId, slotIdx, side);
    });
    document.getElementById('slot-ref-save-btn')?.addEventListener('click', ()=>{
      saveSlotRef(phaseId, slotIdx, side);
    });

    // Exponer valores actuales para saveSlotRef
    window._slotRefState = { sourceType:selSourceType, phaseId:selPhaseId, groupIdx:selGroupIdx, place:selPlace, playoffPhaseId:selPlayoffPhaseId, playoffMatchIdx:selPlayoffMatchIdx };
  }

  await buildModal();
}

async function saveSlotRef(phaseId, slotIdx, side){
  // Leer directamente del DOM — _slotRefState puede estar desactualizado
  const sourceType = document.getElementById('sref-source')?.value || 'ref';

  const phase = await dbGet('phases', phaseId);
  const refs  = (phase.slotRefs||[]).filter(r=>!(r.slotIdx===slotIdx&&r.side===side));

  if(sourceType==='playoff_winner'){
    const srcPlayoffPhaseId = parseInt(document.getElementById('sref-playoff-phase')?.value);
    const matchIdx = parseInt(document.getElementById('sref-playoff-key')?.value);
    if(!srcPlayoffPhaseId || isNaN(matchIdx)) return;
    const srcPlayoffPhase = await dbGet('phases', srcPlayoffPhaseId);
    const maxMatchups = getPlayoffMatchupsCount(srcPlayoffPhase);
    if(matchIdx < 0 || matchIdx >= maxMatchups){
      showToast('La llave seleccionada no es válida para ese playoff','error');
      return;
    }
    refs.push({ type:'playoff_winner', slotIdx, side, phaseId:srcPlayoffPhaseId, matchIdx });
  } else {
    const srcPhaseId = parseInt(document.getElementById('sref-phase')?.value);
    const groupIdx   = parseInt(document.getElementById('sref-group')?.value);
    const place      = parseInt(document.getElementById('sref-place')?.value);
    if(!srcPhaseId || isNaN(groupIdx) || isNaN(place)) return;
    refs.push({ type:'ref', slotIdx, side, phaseId:srcPhaseId, groupIdx, place });
  }

  await dbPut('phases', {...phase, slotRefs:refs});

  document.getElementById('slot-ref-modal-wrap').innerHTML='';
  invalidateStandingsCache(phaseId);
  await rerenderPhaseFromRefTarget(phaseId, window._slotRefTargetType||'bracket');
  showToast('Referencia guardada');
}

function getPlayoffMatchupsCount(phase){
  if(!phase) return 1;
  const fromConfig = parseInt(phase?.config?.matchups, 10);
  if(Number.isFinite(fromConfig) && fromConfig > 0) return fromConfig;
  const fromSlots = Array.isArray(phase?.playoffSlots) ? phase.playoffSlots.length : 0;
  if(fromSlots > 0) return fromSlots;
  return 1;
}

async function removeSlotRef(phaseId, slotIdx, side){
  const phase = await dbGet('phases', phaseId);
  const refs  = (phase.slotRefs||[]).filter(r=>!(r.slotIdx===slotIdx&&r.side===side));
  await dbPut('phases', {...phase, slotRefs:refs});
  document.getElementById('slot-ref-modal-wrap').innerHTML='';
  invalidateStandingsCache(phaseId);
  await rerenderPhaseFromRefTarget(phaseId, window._slotRefTargetType||'bracket');
  showToast('Referencia eliminada');
}

async function rerenderPhaseFromRefTarget(phaseId, targetType='bracket'){
  if(targetType==='playoff'){
    const cid = document.querySelector(`[id="playoff-container-${phaseId}"]`)?.id
      || document.querySelector('[id^="playoff-container-"]')?.id;
    if(cid){
      const pid = parseInt(cid.replace('playoff-container-',''));
      if(pid===phaseId) await renderPlayoff(pid, cid, true);
    }
    return;
  }
  const cid = document.querySelector(`[id="bracket-container-${phaseId}"]`)?.id
    || document.querySelector('[id^="bracket-container-"]')?.id;
  if(cid){
    const pid=parseInt(cid.replace('bracket-container-',''));
    if(pid===phaseId) await renderBracket(pid,cid,true);
  }
}

/* ----------------------------------------------------------
   MODAL RESULTADO BRACKET
   ---------------------------------------------------------- */
async function openBracketMatchModal(phaseId, roundIdx, matchIdx, isAdmin){
  if(!isAdmin) return;
  const phase   = await dbGet('phases', parseInt(phaseId));
  const matches = await dbGetAll('matches', m=>m.phaseId===parseInt(phaseId));
  const matchMap={};
  matches.forEach(m=>{matchMap[m.slotId]=m;});

  const rounds = buildBracketRounds(phase.config?.teams||8);
  const slots  = await buildBracketSlots(phase, rounds, matchMap);
  const slot   = slots[roundIdx]?.[matchIdx];
  if(!slot||slot.teamA==null||slot.teamB==null) return;

  // Resolver nombres a partir de IDs (slot.teamA/teamB ahora son IDs numéricos).
  const _allTeams = await dbGetAll('teams');
  const _nameById = Object.fromEntries(_allTeams.map(t=>[t.id, t.name]));
  const _resolveName = (ref)=>{
    if(typeof ref==='number' || Number.isFinite(parseInt(ref))) return _nameById[parseInt(ref)] || `#${ref}`;
    return ref;
  };
  const nameA = _resolveName(slot.teamA);
  const nameB = _resolveName(slot.teamB);

  const slotId=`${phaseId}_r${roundIdx}_m${matchIdx}`;
  const existing=matchMap[slotId];

  let wrap=document.getElementById('bracket-match-wrap');
  if(!wrap){wrap=document.createElement('div');wrap.id='bracket-match-wrap';document.body.appendChild(wrap);}

  wrap.innerHTML=`
  <div class="modal-overlay open" id="bracket-match-modal">
    <div class="modal" style="max-width:360px;">
      <div class="modal-hdr">
        <div class="modal-title">${rounds[roundIdx]?.name||'Partido'}</div>
        <button class="modal-close" onclick="closeBracketMatchModal()">×</button>
      </div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;margin-bottom:12px;">
          <div style="font-size:14px;font-weight:600;text-align:center;">${nameA}</div>
          <div style="font-family:'Bebas Neue';font-size:22px;color:var(--txt3);">vs</div>
          <div style="font-size:14px;font-weight:600;text-align:center;">${nameB}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;">
          <input type="number" id="bm-ga" min="0" value="${existing?.goalsA??''}" placeholder="0"
            style="padding:12px;text-align:center;font-family:'Bebas Neue';font-size:34px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);width:100%;">
          <div style="font-family:'Bebas Neue';font-size:29px;color:var(--txt3);">-</div>
          <input type="number" id="bm-gb" min="0" value="${existing?.goalsB??''}" placeholder="0"
            style="padding:12px;text-align:center;font-family:'Bebas Neue';font-size:34px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);width:100%;">
        </div>

        <!-- Sección penales — aparece solo si empate -->
        <div id="bm-penalty-section" style="margin-top:12px;display:${(existing?.penA!=null)?'block':'none'};">
          <div style="font-size:12px;color:var(--txt3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;padding-top:10px;border-top:1px solid var(--brd);">Penales</div>
          <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;">
            <input type="number" id="bm-pa" min="0" value="${existing?.penA??''}" placeholder="0"
              style="padding:10px;text-align:center;font-family:'Bebas Neue';font-size:26px;background:var(--card2);border:1px solid var(--gold-b);border-radius:var(--r);color:var(--gold);width:100%;">
            <div style="font-family:'Bebas Neue';font-size:22px;color:var(--txt3);">-</div>
            <input type="number" id="bm-pb" min="0" value="${existing?.penB??''}" placeholder="0"
              style="padding:10px;text-align:center;font-family:'Bebas Neue';font-size:26px;background:var(--card2);border:1px solid var(--gold-b);border-radius:var(--r);color:var(--gold);width:100%;">
          </div>
        </div>

        <!-- Toggle penales -->
        <div style="margin-top:10px;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;color:var(--txt2);">
            <input type="checkbox" id="bm-pen-toggle" ${existing?.penA!=null?'checked':''}
              onchange="document.getElementById('bm-penalty-section').style.display=this.checked?'block':'none'">
            Definir por penales
          </label>
        </div>
      </div>
      <div class="modal-footer" style="justify-content:space-between;">
        ${existing ? `<button class="btn btn-danger btn-sm" onclick="deleteBracketMatch('${slotId}',${phaseId},${roundIdx},${matchIdx})">✕ Eliminar</button>` : '<div></div>'}
        <div style="display:flex;gap:8px;">
          <button class="btn" onclick="closeBracketMatchModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="saveBracketMatch('${slotId}',${phaseId},${JSON.stringify(slot.teamA)},${JSON.stringify(slot.teamB)},${roundIdx},${matchIdx})">Guardar</button>
        </div>
      </div>
    </div>
  </div>`;

  // Mostrar sección penales automáticamente si marcan empate
  const checkEmpate = ()=>{
    const ga = parseInt(document.getElementById('bm-ga').value);
    const gb = parseInt(document.getElementById('bm-gb').value);
    const toggle = document.getElementById('bm-pen-toggle');
    if(!isNaN(ga) && !isNaN(gb) && ga===gb){
      toggle.checked = true;
      document.getElementById('bm-penalty-section').style.display='block';
    }
  };
  document.getElementById('bm-ga').addEventListener('input', checkEmpate);
  document.getElementById('bm-gb').addEventListener('input', checkEmpate);
}

function closeBracketMatchModal(){
  const el=document.getElementById('bracket-match-wrap');
  if(el) el.innerHTML='';
}

async function deleteBracketMatch(slotId, phaseId, roundIdx, matchIdx){
  showConfirm('¿Eliminar resultado?','Se borrará el resultado de este partido.',async()=>{
    const existing = await dbGetAll('matches', m=>m.slotId===slotId && m.phaseId===phaseId);
    for(const m of existing){
      await removeHistoryByMatchRef(m.id);
      await dbDelete('matches', m.id);
    }
    closeBracketMatchModal();
    showToast('Resultado eliminado');
    const cid = document.querySelector('[id^="bracket-container-"]')?.id;
    if(cid) renderBracket(phaseId, cid, true);
  });
}

async function saveBracketMatch(slotId, phaseId, teamA, teamB, roundIdx, matchIdx){
  const ga = parseInt(document.getElementById('bm-ga').value)||0;
  const gb = parseInt(document.getElementById('bm-gb').value)||0;
  const hasPen = document.getElementById('bm-pen-toggle')?.checked;
  const pa = hasPen ? (parseInt(document.getElementById('bm-pa').value)||0) : null;
  const pb = hasPen ? (parseInt(document.getElementById('bm-pb').value)||0) : null;

  // Validar penales: solo si empate y penales distintos
  if(hasPen && ga===gb && pa===pb && pa!==null){
    showToast('Los penales no pueden terminar en empate','error'); return;
  }

  const existing = await dbGetAll('matches',m=>m.slotId===slotId&&m.phaseId===phaseId);
  const data = {
    slotId, phaseId, teamA, teamB,
    goalsA:ga, goalsB:gb,
    penA: pa, penB: pb,
    roundIdx, matchIdx,
    season:STATE.season,
    date:new Date().toISOString()
  };
  let savedId;
  if(existing.length){
    savedId = existing[0].id;
    await dbPut('matches',{...existing[0],...data});
  } else {
    savedId = await dbAdd('matches',data);
  }
  await appendOrUpdateHistory(savedId);

  // Resolver nombres para el toast (teamA/B pueden ser IDs)
  const _resolveName = async (v)=>{
    if(typeof v==='number' || Number.isFinite(parseInt(v))){
      const t = await dbGet('teams', parseInt(v));
      return t?.name || `#${v}`;
    }
    return v;
  };
  const nameA = await _resolveName(teamA);
  const nameB = await _resolveName(teamB);
  const penStr = pa!==null ? ` (pen ${pa}-${pb})` : '';
  showToast(`${nameA} ${ga}-${gb}${penStr} ${nameB}`);
  closeBracketMatchModal();
  const cid=document.querySelector('[id^="bracket-container-"]')?.id;
  if(cid) renderBracket(phaseId, cid, true);
}

/* ----------------------------------------------------------
   ACTUALIZACIÓN DINÁMICA DE EQUIPOS EN BRACKET
   Resuelve dinámicamente nombre, color e iniciales para temporada actual
   ---------------------------------------------------------- */
async function updateBracketTeamsDynamic(slots){
  if(!slots || slots.length === 0) return;

  // Pre-cargar equipos UNA vez (no por iteración)
  const teams = await getForSeason('teams');
  const byId   = Object.fromEntries(teams.map(t=>[t.id, t]));
  const byName = Object.fromEntries(teams.map(t=>[t.name, t]));
  const lookup = (ref)=>{
    if(ref==null) return null;
    if(typeof ref==='number' || Number.isFinite(parseInt(ref))){
      return byId[parseInt(ref)] || null;
    }
    return byName[ref] || null;
  };

  for(const roundSlots of slots){
    for(const slot of roundSlots){
      const tA = lookup(slot.teamA);
      if(tA) slot._teamA_dynamic = {name:tA.name, color:tA.color||'#888', ini:tA.ini||'?'};
      const tB = lookup(slot.teamB);
      if(tB) slot._teamB_dynamic = {name:tB.name, color:tB.color||'#888', ini:tB.ini||'?'};
    }
  }
  updateBracketDOM(slots);
}

function updateBracketDOM(slots){
  // Buscar todos los elementos de equipo renderizados y actualizar dinámicamente
  document.querySelectorAll('[id^="tlogo-"]').forEach(logoEl => {
    const id = logoEl.id; // formato: tlogo-phaseId-ri-mi-side
    const parts = id.replace('tlogo-', '').split('-');
    if(parts.length >= 3){
      // Encontrar el slot correspondiente
      // Esto es un poco complejo sin refactorizar todo, así que por ahora
      // actualizar desde los datos guardados en slot._teamA_dynamic / _teamB_dynamic
    }
  });
}

/* ----------------------------------------------------------
   RENDER PLAYOFF (ida y vuelta)
   ---------------------------------------------------------- */
