'use strict';
/* public-bracket.js — Renderers públicos broadcast de bracket (.gbr-*) y playoff (.tie-*).
   Reutilizan la PREPARACIÓN DE DATOS de bracket.js / playoff.js (buildBracketRounds,
   buildBracketSlots, getWinner, resolveSlotRef, refLabel) pero construyen su propio
   markup read-only. NO llaman a renderBracket()/renderPlayoff() (que mutan el DOM admin,
   inyectan botones de edición y lanzan los fuegos del admin). Cargado entre playoff.js
   y public.js (ver index.html). */

function _pbEsc(v){ return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function _pbFmtDate(d){
  if(!d) return '';
  return /^\d{4}-\d{2}-\d{2}/.test(String(d))
    ? new Date(d).toLocaleDateString('es-CL',{weekday:'short',day:'numeric',month:'numeric'})
    : String(d);
}

/* Mapa rico de equipos: id → {name, ini, color, color2, logo} */
async function _pbTeamMap(){
  const teams = await dbGetAll('teams');
  const m = {};
  teams.forEach(t=>{
    m[t.id] = {
      name: t.name,
      ini: String(t.ini || t.name || '?').substring(0,3).toUpperCase(),
      color: (t.color && /^#[0-9A-Fa-f]{3,8}$/.test(t.color)) ? t.color : '#444',
      color2:(t.color2 && /^#[0-9A-Fa-f]{3,8}$/.test(t.color2)) ? t.color2 : (t.color||'#222'),
      logo: t.logo || null,
    };
  });
  return m;
}

/* Resuelve un slot a un objeto de equipo público; TBD si no hay id */
function _pbTeamPublic(teamId, teamMap, label){
  if(teamId!=null && teamMap[teamId]) return Object.assign({ tbd:false }, teamMap[teamId]);
  return { name:null, ini:'?', color:'#444', color2:'#222', logo:null, tbd:true, label:label||'Por definir' };
}

/* Iconos Lucide inline (stroke, currentColor) */
const _PB_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
const _PB_CHEVL = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
const _PB_CHEVR = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

/* Trofeo: usa el renderer de palmares si está disponible; si no, un trofeo Lucide. */
function _pbTrophyHTML(copaKey, size){
  if(copaKey && typeof renderTrophy==='function' && typeof PALMARES_COMPS!=='undefined'){
    const match = PALMARES_COMPS.find(c=>c.key===copaKey);
    if(match) return renderTrophy(copaKey, size);
  }
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="var(--gold)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;
}

/* Badge ganador (check Lucide + sufijo 'v' si fue por gol de visita) */
function _pbWinBadge(decidedBy){
  return `<span class="gbr-win-badge">${_PB_CHECK}${decidedBy==='away'?'<small>v</small>':''}</span>`;
}

/* ════════════════════════════════════════════════════════════════
   BRACKET broadcast
   ════════════════════════════════════════════════════════════════ */

/* Construye las round-cards desde los slots REALES de buildBracketSlots */
function _pbBracketCards(phase, rounds, slots, teamMap){
  const awayGoal = !!(phase.config && phase.config.awayGoal);
  return rounds.map((r, ri)=>{
    const rowSlots = slots[ri] || [];
    const cards = rowSlots.map((slot, mi)=>{
      slot = slot || { teamA:null, teamB:null };
      const ta = _pbTeamPublic(slot.teamA, teamMap, slot.labelA);
      const tb = _pbTeamPublic(slot.teamB, teamMap, slot.labelB);
      const live = !!slot.live;
      const twoLeg = !!slot.twoLeg;
      const winner = live ? null : getWinner(slot);
      let scoreA='-', scoreB='-', status='Pendiente', decidedBy=null;
      let wA=false, wB=false;

      if(twoLeg){
        const leg1Done = slot.leg1a!=null && slot.leg1b!=null;
        const leg2Done = slot.leg2a!=null && slot.leg2b!=null;
        const totA=(slot.leg1a||0)+(slot.leg2a||0), totB=(slot.leg1b||0)+(slot.leg2b||0);
        if(leg1Done && leg2Done && !live){
          scoreA=String(totA); scoreB=String(totB);
          wA = winner===slot.teamA; wB = winner===slot.teamB;
          if(totA!==totB) decidedBy='global';
          else if(awayGoal && (slot.leg2a||0)!==(slot.leg1b||0)) decidedBy='away';
          else if(slot.penA!=null && slot.penB!=null) decidedBy='pen';
          else decidedBy='global';
          status = decidedBy==='pen' ? `Global · pen ${_pbEsc(slot.penA)}-${_pbEsc(slot.penB)}`
                 : decidedBy==='away' ? 'Global · visita' : 'Global';
        } else if(live){
          status = slot.leg2Live ? 'En vivo · Vuelta' : 'En vivo · Ida';
        } else {
          status = leg1Done ? 'Vuelta pendiente' : 'Ida pendiente';
        }
      } else {
        const done = slot.ga!=null && slot.gb!=null;
        if(done && !live){
          scoreA=String(slot.ga); scoreB=String(slot.gb);
          wA = winner===slot.teamA; wB = winner===slot.teamB;
          const isDraw = slot.ga===slot.gb;
          decidedBy = (isDraw && slot.penA!=null && slot.penB!=null) ? 'pen' : 'global';
          status = decidedBy==='pen' ? `Final · pen ${_pbEsc(slot.penA)}-${_pbEsc(slot.penB)}` : 'Final';
        } else if(live){
          status='En vivo';
        }
      }

      return {
        slot:r.name, mi, ta, tb, scoreA, scoreB, status,
        empty: ta.tbd && tb.tbd, live, twoLeg, decidedBy, wA, wB,
        leg1A: slot.leg1a ?? null, leg1B: slot.leg1b ?? null,
        leg2A: slot.leg2a ?? null, leg2B: slot.leg2b ?? null,
        penA: slot.penA ?? null, penB: slot.penB ?? null,
        date:''
      };
    });
    return { idx:ri, name:r.name, matchCount:cards.length, cards };
  });
}

function _pbCrestMini(t){
  const inner = t.logo ? `<img src="${_pbEsc(t.logo)}" alt="">` : _pbEsc(t.ini||'?');
  return `<span class="gbr-crest-mini" style="--team-color:${_pbEsc(t.color||'#444')};--team-color-2:${_pbEsc(t.color2||'#222')};">${inner}</span>`;
}
function _pbCrestTree(t){
  const inner = t.logo ? `<img src="${_pbEsc(t.logo)}" alt="">` : _pbEsc(t.ini||'?');
  return `<span class="gbr-tree-crest" style="--team-color:${_pbEsc(t.color||'#444')};--team-color-2:${_pbEsc(t.color2||'#222')};">${inner}</span>`;
}

function _pbScoreMini(c, side){
  if(c.twoLeg){
    const d1 = side==='A' ? c.leg1A : c.leg1B;
    const d2 = side==='A' ? c.leg2A : c.leg2B;
    const pen = c.decidedBy==='pen' ? (side==='A' ? c.penA : c.penB) : null;
    return `<span class="gbr-score-mini" style="font-size:14px;letter-spacing:.6px;">${_pbEsc(d1!=null?d1:'–')}<span style="color:var(--txt3);margin:0 2px;">|</span>${_pbEsc(d2!=null?d2:'–')}${pen!=null?`(${_pbEsc(pen)})`:''}</span>`;
  }
  const s = side==='A' ? c.scoreA : c.scoreB;
  return `<span class="gbr-score-mini">${_pbEsc(s==null||s===''?'-':s)}</span>`;
}

/* Fila de equipo (mobile mini) */
function _pbTeamlineMini(c, side, t, win){
  if(!t) return '';
  const tbd = t.tbd;
  return `<div class="gbr-teamline ${win?'win':''} ${tbd?'tbd':''}">
    ${_pbCrestMini(t)}
    <span class="gbr-name-mini">${_pbEsc(t.name||t.label||'Por definir')}</span>
    ${win?_pbWinBadge(c.decidedBy):''}
    ${_pbScoreMini(c, side)}
  </div>`;
}

function _pbMobCard(c, slotH){
  const live = c.live;
  const head = live
    ? `<div class="gbr-date-mini">${_pbEsc(c.slot||'Llave')}<span class="gbr-live-tag"><span class="live-dot"></span>${_pbEsc(c.status)}</span></div>`
    : `<div class="gbr-date-mini">${_pbEsc(c.slot || _pbFmtDate(c.date) || c.status || 'Llave')}</div>`;
  return `<div class="gbr-mobile-slot" style="height:${slotH}px;">
    <div class="gbr-mobile-card ${live?'is-live':''}">
      ${head}
      ${_pbTeamlineMini(c,'A',c.ta,c.wA)}
      <div class="gbr-sep-mini"></div>
      ${_pbTeamlineMini(c,'B',c.tb,c.wB)}
    </div>
  </div>`;
}

function _pbConnectorSVG(leftRound, rightRound, colH, leftSlotH, rightSlotH){
  if(!rightRound || !rightRound.cards.length) return '';
  const W=24, xA=0, xB=9, xC=W;
  const paths = rightRound.cards.map((_, ri)=>{
    const liA = ri*2;
    const liB = Math.min(liA+1, leftRound.cards.length-1);
    const y1 = Math.round((liA*leftSlotH)+(leftSlotH/2));
    const y2 = Math.round((liB*leftSlotH)+(leftSlotH/2));
    const ym = Math.round((ri*rightSlotH)+(rightSlotH/2));
    return [`M${xA} ${y1} H${xB}`,`M${xA} ${y2} H${xB}`,`M${xB} ${y1} V${y2}`,`M${xB} ${ym} H${xC}`].join(' ');
  }).join(' ');
  return `<svg class="gbr-mobile-connectors" viewBox="0 0 ${W} ${colH}" preserveAspectRatio="none" aria-hidden="true"><path d="${paths}"/></svg>`;
}

/* Árbol desktop (todas las rondas a la vez) */
function _pbDesktopTreeHTML(roundCards, compName, phaseName, copaKey){
  if(!roundCards.length) return `<div class="gbr-empty">Sin datos de bracket.</div>`;
  const N = roundCards.length, ROW_H=88, CARD_W=320, COL_W=CARD_W+24;
  const halfRounds = roundCards.slice(0, N-1);
  const finalRound = roundCards[N-1];
  const nFirstLeft = Math.max(1, halfRounds.length ? Math.ceil(halfRounds[0].cards.length/2) : 1);
  const colH = nFirstLeft * ROW_H * 2;

  const scoreHTML = (c, side, win)=>{
    const col = win ? 'var(--gold)' : 'var(--txt3)';
    if(c.twoLeg){
      const d1 = side==='A'?c.leg1A:c.leg1B, d2 = side==='A'?c.leg2A:c.leg2B;
      const pen = c.decidedBy==='pen' ? (side==='A'?c.penA:c.penB) : null;
      const hasAny = d1!=null || d2!=null;
      if(!hasAny) return `<span class="gbr-tree-score" style="color:${col};">-</span>`;
      return `<span class="gbr-tree-score" style="font-size:18px;letter-spacing:1px;white-space:nowrap;color:${col};">${_pbEsc(d1!=null?d1:'–')}<span style="color:var(--txt3);margin:0 2px;">|</span>${_pbEsc(d2!=null?d2:'–')}${pen!=null?`(${_pbEsc(pen)})`:''}</span>`;
    }
    const s = side==='A'?c.scoreA:c.scoreB;
    return `<span class="gbr-tree-score" style="color:${col};">${_pbEsc(s==null||s===''?'-':s)}</span>`;
  };
  const tr = (c, side, t, win)=>{
    if(!t) return '';
    return `<div class="gbr-tree-row ${win?'win':''} ${t.tbd?'tbd':''}">
      ${_pbCrestTree(t)}
      <span class="gbr-tree-name">${_pbEsc(t.name||t.label||'Por definir')}</span>
      ${win?_pbWinBadge(c.decidedBy):''}
      ${scoreHTML(c, side, win)}
    </div>`;
  };
  const card = (c, slotH)=>`<div style="height:${slotH}px;display:flex;align-items:center;justify-content:center;">
    <div class="gbr-tree-card ${c&&c.live?'is-live':''}" style="width:${CARD_W}px;">
      ${tr(c,'A',c&&c.ta,c&&c.wA)}
      <div class="gbr-tree-sep"></div>
      ${tr(c,'B',c&&c.tb,c&&c.wB)}
    </div>
  </div>`;
  const col = (roundCards2, roundName, nSlots)=>{
    const slotH = colH / Math.max(1, nSlots);
    return `<div style="display:flex;flex-direction:column;width:${COL_W}px;flex-shrink:0;">
      <div class="gbr-rtitle">${_pbEsc(roundName)}</div>
      ${roundCards2.map(c=>card(c, slotH)).join('')}
    </div>`;
  };

  let leftHTML='', rightHTML='';
  for(let i=0;i<halfRounds.length;i++){
    const r = halfRounds[i];
    const lCards = r.cards.slice(0, Math.ceil(r.cards.length/2));
    const rCards = r.cards.slice(Math.ceil(r.cards.length/2));
    leftHTML += col(lCards, r.name, lCards.length);
    rightHTML = col(rCards.slice().reverse(), r.name, rCards.length) + rightHTML;
  }

  const finalCard = finalRound.cards[0] || {ta:{tbd:true},tb:{tbd:true}};
  const winner = finalCard.wA ? finalCard.ta : finalCard.wB ? finalCard.tb : null;
  const trophy = _pbTrophyHTML(copaKey, 96);
  const champ = winner
    ? `<div class="gbr-champ"><div style="filter:drop-shadow(0 0 18px rgba(201,168,76,.55));display:inline-block;">${trophy}</div>
        <div class="gbr-champ-lbl">Campeón</div><div class="gbr-champ-name">${_pbEsc(winner.name)}</div></div>`
    : `<div class="gbr-champ tbd"><div style="display:inline-block;">${trophy}</div><div class="gbr-champ-lbl">Campeón por definir</div></div>`;

  const finalCenterW = CARD_W + 40;
  const finalCenter = `<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:${finalCenterW}px;">
    <div class="gbr-rtitle">Final</div>
    <div style="height:${colH}px;display:flex;align-items:center;justify-content:center;width:100%;">${card(finalCard, colH)}</div>
    ${champ}
  </div>`;

  return `<div>${leftHTML}${finalCenter}${rightHTML}</div>`;
}

/* Monta el bracket: árbol desktop + pager móvil con navegación y conectores */
function _pbBracketMount(el, roundCards, compName, phase, copaKey){
  const N = roundCards.length;

  const mobileHTML = `
    <div class="gbr-kicker" style="padding:10px 14px 0;">${_pbEsc(compName||'Competición')}</div>
    <div class="gbr-nav-bar">
      <button type="button" class="gbr-nav-btn gbr-nav-back" aria-label="Ronda anterior">${_PB_CHEVL}</button>
      <div class="gbr-round-title gbr-title-left">${_pbEsc(roundCards[0]?.name||'')}</div>
      <div class="gbr-round-title gbr-title-right">${_pbEsc(roundCards[1]?.name||'')}</div>
      <button type="button" class="gbr-nav-btn gbr-nav-fwd" aria-label="Ronda siguiente">${_PB_CHEVR}</button>
    </div>
    <div class="gbr-mobile-viewport"></div>`;

  el.innerHTML = `<div class="gbr-shell">
    <div class="gbr-mobile-wrap">${mobileHTML}</div>
    <div class="gbr-tree-wrap">${_pbDesktopTreeHTML(roundCards, compName, phase.name, copaKey)}</div>
  </div>`;

  const pairHTML = (pi)=>{
    const leftRound = roundCards[pi];
    const rightRound = pi+1<N ? roundCards[pi+1] : null;
    const constrainedUnit = window.innerWidth<=760 ? 98 : 112;
    const colH = Math.max(leftRound.cards.length*constrainedUnit, 220);
    const leftSlotH = Math.max(92, Math.floor(colH/Math.max(1,leftRound.cards.length)));
    const rightSlotH = rightRound ? Math.max(110, Math.floor(colH/Math.max(1,rightRound.cards.length))) : leftSlotH;
    const leftHTML = leftRound.cards.map(c=>_pbMobCard(c, leftSlotH)).join('');
    const rightHTML = rightRound ? rightRound.cards.map(c=>_pbMobCard(c, rightSlotH)).join('') : '';
    const conn = rightRound ? _pbConnectorSVG(leftRound, rightRound, colH, leftSlotH, rightSlotH) : '';
    return `<div class="gbr-mobile-pair">
      <div class="gbr-mobile-round is-constrained"><div class="gbr-mobile-stack" style="height:${colH}px;">${leftHTML}</div></div>
      <div class="gbr-mobile-connector-col" style="height:${colH}px;">${conn}</div>
      <div class="gbr-mobile-round is-open"><div class="gbr-mobile-stack" style="height:${colH}px;">${rightHTML}</div></div>
    </div>`;
  };
  const updateNav = (pi)=>{
    const leftRound = roundCards[pi], rightRound = roundCards[pi+1]||null;
    const back = el.querySelector('.gbr-nav-back'), fwd = el.querySelector('.gbr-nav-fwd');
    const lt = el.querySelector('.gbr-title-left'), rt = el.querySelector('.gbr-title-right');
    if(lt) lt.textContent = leftRound?.name || '';
    if(rt) rt.textContent = rightRound?.name || '';
    if(back) back.disabled = pi<=0;
    if(fwd) fwd.disabled = pi>=(N-2);
  };
  const renderStatic = (pi)=>{
    const vp = el.querySelector('.gbr-mobile-viewport');
    if(!vp) return;
    vp.innerHTML = `<div class="gbr-mobile-rail"><div class="gbr-mobile-pane">${pairHTML(pi)}</div></div>`;
    updateNav(pi);
  };
  const animateTo = (fromPi, toPi)=>{
    const vp = el.querySelector('.gbr-mobile-viewport');
    if(!vp) return;
    const dir = toPi>fromPi ? 'forward' : 'backward';
    vp.innerHTML = dir==='forward'
      ? `<div class="gbr-mobile-rail anim-forward"><div class="gbr-mobile-pane half">${pairHTML(fromPi)}</div><div class="gbr-mobile-pane half">${pairHTML(toPi)}</div></div>`
      : `<div class="gbr-mobile-rail anim-backward"><div class="gbr-mobile-pane half">${pairHTML(toPi)}</div><div class="gbr-mobile-pane half">${pairHTML(fromPi)}</div></div>`;
    updateNav(toPi);
    const rail = vp.querySelector('.gbr-mobile-rail');
    if(!rail){ renderStatic(toPi); return; }
    requestAnimationFrame(()=>{ requestAnimationFrame(()=>rail.classList.add('go')); });
    rail.addEventListener('transitionend', ()=>renderStatic(toPi), { once:true });
  };

  let _pi = 0, _animating = false;
  renderStatic(0);
  const moveTo = (next)=>{
    if(_animating || next<0 || next>(N-2) || next===_pi) return;
    _animating = true;
    animateTo(_pi, next);
    setTimeout(()=>{ _pi = next; _animating = false; }, 390);
  };
  el.querySelector('.gbr-nav-back')?.addEventListener('click', ()=>moveTo(_pi-1));
  el.querySelector('.gbr-nav-fwd')?.addEventListener('click', ()=>moveTo(_pi+1));

  // Fuegos del campeón (una vez por fase, solo si el contenedor está visible)
  _pbMaybeFireworks(el, roundCards, phase.id);
}

function _pbMaybeFireworks(el, roundCards, phaseId){
  const finalCard = roundCards[roundCards.length-1]?.cards?.[0];
  const winner = finalCard && (finalCard.wA ? finalCard.ta : finalCard.wB ? finalCard.tb : null);
  if(!winner) return;
  if(!window._fwLaunched) window._fwLaunched = {};
  if(window._fwLaunched[phaseId]) return;
  const rect = el.getBoundingClientRect();
  const visible = rect.width>0 && rect.height>0 && rect.top<window.innerHeight && rect.bottom>0;
  if(!visible || typeof window.launchChampionFireworks!=='function') return;
  window._fwLaunched[phaseId] = true;
  setTimeout(()=>window.launchChampionFireworks({ primary: winner.color||'#C9A84C', secondary: winner.color2||winner.color||'#FFD86B' }), 700);
}

async function _pubRenderBracketBroadcast(phaseId, containerId){
  const el = document.getElementById(containerId);
  if(!el) return;
  const phase = await dbGet('phases', phaseId);
  if(!phase){ el.innerHTML='<div class="gbr-shell"><div class="gbr-empty">Fase no encontrada.</div></div>'; return; }

  const config = phase.config||{};
  const totalTeams = config.teams||8;
  const allMatches = await dbGetAll('matches', m=>m.phaseId===phaseId);
  const rounds = buildBracketRounds(totalTeams);
  const matchMap = {};
  allMatches.forEach(m=>{ matchMap[m.slotId]=m; });
  const slots = await buildBracketSlots(phase, rounds, matchMap);
  const teamMap = await _pbTeamMap();

  const roundCards = _pbBracketCards(phase, rounds, slots, teamMap);
  if(!roundCards.length || !roundCards[0].cards.length){
    el.innerHTML = '<div class="gbr-shell"><div class="gbr-empty">Sin datos de bracket.</div></div>';
    return;
  }

  if(typeof loadPalmaresComps === 'function'){ try{ await loadPalmaresComps(); }catch(e){} }
  const comp = await dbGet('competitions', phase.compId).catch(()=>null);
  _pbBracketMount(el, roundCards, comp?.name || '', phase, phase.bracketCopaKey || null);
}

/* ════════════════════════════════════════════════════════════════
   PLAYOFF / SINGLE broadcast (.tie-*)
   ════════════════════════════════════════════════════════════════ */

function _pbTieCrest(t){
  const inner = t.logo ? `<img src="${_pbEsc(t.logo)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">` : _pbEsc(t.ini||'?');
  return `<div class="tie-crest">${inner}</div>`;
}

/* Una fila de equipo dentro de una tie-card */
function _pbTieRow(t, legs, agg, cls, decidedBy){
  const legCells = legs.map(v=>`<span class="tie-leg">${_pbEsc(v)}</span>`).join('');
  const badge = cls==='winner' ? `<span class="tie-win">${_PB_CHECK}${decidedBy==='away'?'<small>v</small>':''}</span>` : '';
  return `<div class="tie-row ${cls}" style="--team-color:${_pbEsc(t.color||'#444')};--team-color-2:${_pbEsc(t.color2||'#222')};">
    <div class="tie-team">${_pbTieCrest(t)}<span class="tie-name"><span>${_pbEsc(t.name||t.label||'Por definir')}</span>${badge}</span></div>
    ${legCells}
    <span class="tie-agg">${_pbEsc(agg)}</span>
  </div>`;
}

async function _pubRenderPlayoffBroadcast(phaseId, containerId){
  const el = document.getElementById(containerId);
  if(!el) return;
  const phase = await dbGet('phases', phaseId);
  if(!phase){ el.innerHTML='<div class="gbr-empty">Fase no encontrada.</div>'; return; }

  const config = phase.config||{};
  const matchups = config.matchups||3;
  const legsCount = parseInt(config.legs)||2;
  const awayGoal = !!config.awayGoal;
  const isSingle = phase.type==='single';

  const allMatches = await dbGetAll('matches', m=>m.phaseId===phaseId);
  const matchMap = {};
  allMatches.forEach(m=>{ matchMap[m.slotId]=m; });
  const teamMap = await _pbTeamMap();

  // Slots + referencias dinámicas (mismo orden que playoff.js)
  const slots = phase.playoffSlots || Array(matchups).fill(null).map(()=>({teamA:null,teamB:null}));
  const slotRefs = phase.slotRefs||[];
  for(const ref of slotRefs){
    const idx = ref.slotIdx;
    if(!slots[idx]) continue;
    const team = await resolveSlotRef(ref);
    const label = await refLabel(ref);
    if(ref.side==='A'){ slots[idx].teamA = team; slots[idx].labelA = label; }
    else { slots[idx].teamB = team; slots[idx].labelB = label; }
  }
  allMatches.forEach(m=>{
    const idx = m.matchIdx;
    if(slots[idx]){ slots[idx].teamA = slots[idx].teamA||m.teamA; slots[idx].teamB = slots[idx].teamB||m.teamB; }
  });

  const nSlots = isSingle ? 1 : slots.length;
  const phaseDefinesChampion = isSingle && nSlots===1;
  let championId = null, championTeam = null;
  const cards = [];

  for(let i=0;i<nSlots;i++){
    const slot = slots[i] || {teamA:null,teamB:null};
    const legData = [];
    for(let leg=1;leg<=legsCount;leg++){
      const sid = `${phaseId}_m${i}_leg${leg}`;
      legData.push(matchMap[sid] || {teamA:slot.teamA,teamB:slot.teamB,goalsA:null,goalsB:null});
    }
    const totA = legData.reduce((s,l)=>s+(l.goalsA||0),0);
    const totB = legData.reduce((s,l)=>s+(l.goalsB||0),0);
    const anyLegLive = legData.some(l=>l.live);
    const allPlayed = !anyLegLive && legData.every(l=>l.goalsA!==null && l.goalsB!==null);
    const deciding = legData[legsCount-1];
    const penA = deciding?.penA ?? null, penB = deciding?.penB ?? null;

    let winner=null, decidedBy='';
    if(allPlayed){
      if(totA>totB){ winner=slot.teamA; decidedBy='global'; }
      else if(totB>totA){ winner=slot.teamB; decidedBy='global'; }
      else if(awayGoal && legsCount>=2){
        const awayA = legData[1]?.goalsA ?? 0;   // A visita en la vuelta
        const awayB = legData[0]?.goalsB ?? 0;   // B visita en la ida
        if(awayA>awayB){ winner=slot.teamA; decidedBy='away'; }
        else if(awayB>awayA){ winner=slot.teamB; decidedBy='away'; }
      }
      if(!winner && penA!==null && penB!==null && penA!==penB){
        winner = penA>penB ? slot.teamA : slot.teamB; decidedBy='pen';
      }
    }

    const ta = _pbTeamPublic(slot.teamA, teamMap, slot.labelA);
    const tb = _pbTeamPublic(slot.teamB, teamMap, slot.labelB);
    const legsA = legData.map(l=>l.goalsA!=null?l.goalsA:'–');
    const legsB = legData.map(l=>l.goalsB!=null?l.goalsB:'–');
    const aggA = allPlayed ? (decidedBy==='pen' ? `${totA}(${penA})` : `${totA}`) : (legData.some(l=>l.goalsA!=null) ? String(totA) : '–');
    const aggB = allPlayed ? (decidedBy==='pen' ? `${totB}(${penB})` : `${totB}`) : (legData.some(l=>l.goalsB!=null) ? String(totB) : '–');

    const clsA = winner!=null ? (winner===slot.teamA?'winner':'loser') : '';
    const clsB = winner!=null ? (winner===slot.teamB?'winner':'loser') : '';

    if(phaseDefinesChampion && i===0 && winner!=null){
      championId = winner;
      championTeam = winner===slot.teamA ? ta : tb;
    }

    // Estado (chip): EN VIVO / Finalizado / pendiente
    let stateHTML;
    if(anyLegLive){
      const liveIdx = legData.findIndex(l=>l.live);
      const tag = legsCount>1 ? ` · ${liveIdx===0?'Ida':'Vuelta'}` : '';
      stateHTML = `<span class="chip chip-live"><span class="chip-dot"></span>En vivo${_pbEsc(tag)}</span>`;
    } else if(allPlayed){
      stateHTML = `<span class="chip chip-final">Finalizado</span>`;
    } else {
      const playedAny = legData.some(l=>l.goalsA!=null);
      stateHTML = `<span class="tie-pending">${playedAny?'En curso':'Por disputarse'}</span>`;
    }

    const lbl = isSingle ? (phase.name||'Final') : `Llave ${i+1}`;
    const colHdr = legsCount>1
      ? `<div class="tie-cols"><span></span><span>Ida</span><span>Vta</span><span>Global</span></div>`
      : `<div class="tie-cols" style="grid-template-columns:minmax(0,1fr) 44px 64px;"><span></span><span>Partido</span><span>Total</span></div>`;
    const legsArrA = legsCount>1 ? legsA : [legsA[0]];
    const legsArrB = legsCount>1 ? legsB : [legsB[0]];
    const rowStyle = legsCount>1 ? '' : 'grid-template-columns:minmax(0,1fr) 44px 64px;';

    const subAway = (decidedBy==='away') ? `<div class="tie-sub">Define por gol de visita</div>`
                 : (allPlayed && totA===totB && winner==null) ? `<div class="tie-sub">Empate global · pendiente de definición</div>`
                 : '';

    // Para 1 leg, ajustar el grid de las filas vía estilo inline
    const rowA = legsCount>1 ? _pbTieRow(ta, legsArrA, aggA, clsA, decidedBy)
               : `<div class="tie-row ${clsA}" style="${rowStyle}--team-color:${_pbEsc(ta.color||'#444')};--team-color-2:${_pbEsc(ta.color2||'#222')};"><div class="tie-team">${_pbTieCrest(ta)}<span class="tie-name"><span>${_pbEsc(ta.name||ta.label||'Por definir')}</span>${clsA==='winner'?`<span class="tie-win">${_PB_CHECK}${decidedBy==='away'?'<small>v</small>':''}</span>`:''}</span></div><span class="tie-leg">${_pbEsc(legsArrA[0])}</span><span class="tie-agg">${_pbEsc(aggA)}</span></div>`;
    const rowB = legsCount>1 ? _pbTieRow(tb, legsArrB, aggB, clsB, decidedBy)
               : `<div class="tie-row ${clsB}" style="${rowStyle}--team-color:${_pbEsc(tb.color||'#444')};--team-color-2:${_pbEsc(tb.color2||'#222')};"><div class="tie-team">${_pbTieCrest(tb)}<span class="tie-name"><span>${_pbEsc(tb.name||tb.label||'Por definir')}</span>${clsB==='winner'?`<span class="tie-win">${_PB_CHECK}${decidedBy==='away'?'<small>v</small>':''}</span>`:''}</span></div><span class="tie-leg">${_pbEsc(legsArrB[0])}</span><span class="tie-agg">${_pbEsc(aggB)}</span></div>`;

    cards.push(`<div class="tie-card">
      <div class="tie-hdr"><span class="th-lbl">${_pbEsc(lbl)}</span>${stateHTML}</div>
      ${colHdr}
      ${rowA}
      ${rowB}
      ${subAway}
    </div>`);
  }

  // Single/supercopa: título + trofeo + campeón debajo
  if(isSingle){
    const trophy = _pbTrophyHTML(phase.bracketCopaKey||null, 110);
    el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:18px;padding:8px 0 4px;">
      <div style="font-family:'Bebas Neue';font-size:28px;letter-spacing:6px;color:var(--gold);text-align:center;text-shadow:0 0 30px rgba(201,168,76,0.35);">${_pbEsc(phase.name||'Final')}</div>
      <div style="filter:drop-shadow(0 0 26px rgba(201,168,76,0.7));">${trophy}</div>
      <div class="ties-grid" style="width:100%;max-width:480px;">${cards.join('')}</div>
      ${championTeam ? `<div class="gbr-champ"><div class="gbr-champ-lbl">Campeón</div><div class="gbr-champ-name" style="font-size:36px;">${_pbEsc(championTeam.name||'')}</div></div>` : ''}
    </div>`;
  } else {
    el.innerHTML = `<div class="ties-grid${cards.length===4?' ties-grid--four':''}">${cards.join('')}</div>`;
  }

  // Fuegos del campeón (una vez por fase, si visible)
  if(championId!=null){
    if(!window._fwLaunched) window._fwLaunched = {};
    if(!window._fwLaunched[phaseId]){
      const rect = el.getBoundingClientRect();
      const visible = rect.width>0 && rect.height>0 && rect.top<window.innerHeight && rect.bottom>0;
      if(visible && typeof window.launchChampionFireworks==='function'){
        window._fwLaunched[phaseId] = true;
        const ct = championTeam || {};
        setTimeout(()=>window.launchChampionFireworks({ primary: ct.color||'#C9A84C', secondary: ct.color2||ct.color||'#FFD86B' }), 700);
      }
    }
  }
}
