'use strict';
/* ============================================================
   CENTRO DE PARTIDO EN VIVO — Fase 6B
   ------------------------------------------------------------
   Unificado para fase de grupos y eliminatorias (bracket).
   Ambos tipos guardan goles en `matches.goalsA/goalsB`; las
   eliminatorias además usan `penA/penB` (ya existentes).

   Modelo añadido al doc del partido:
     live: true|false   → partido en juego (luz roja en público)
     extraTime: true    → entró en tiempo extra (solo eliminatoria)

   Mientras el partido está "live", cada cambio de marcador se
   persiste al instante → la suscripción de tiempo real (6A)
   refresca el panel público y su tabla de posiciones.

   "Finalizar" apaga la luz (live:false), consolida el historial
   y recalcula. En eliminatoria exige un ganador (prórroga/penales).
   ============================================================ */

let _liveCtx = null;   // { kind:'group'|'bracket', phaseId, groupIdx }

function _lmEsc(v){
  return String(v==null?'':v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ¿La fase no admite empate? (eliminatoria) */
function _lmIsKnockout(phaseType){
  return ['bracket','single','playoff'].includes(phaseType);
}

/* Refresca la vista de admin de fondo (lista de fechas o bracket). */
function _liveRefreshBackground(){
  const ctx = _liveCtx;
  if(!ctx) return;
  if(ctx.kind==='group' && typeof showMatchGroupTable==='function'){
    showMatchGroupTable(ctx.phaseId, ctx.groupIdx);
  } else if(ctx.kind==='bracket' && typeof renderBracket==='function'){
    const cid = document.querySelector('[id^="bracket-container-"]')?.id;
    if(cid) renderBracket(ctx.phaseId, cid, true);
  }
}

/* ---- Iniciar EN VIVO: fase de grupos ---- */
async function startLiveGroupMatch(matchId, phaseId, groupIdx){
  const m = await dbGet('matches', matchId);
  if(!m){ showToast('Partido no encontrado','error'); return; }
  await dbPut('matches', {
    ...m,
    goalsA: m.goalsA!=null ? m.goalsA : 0,
    goalsB: m.goalsB!=null ? m.goalsB : 0,
    live: true,
    playedAt: m.playedAt || new Date().toISOString(),
  });
  if(typeof invalidateStandingsCache==='function') invalidateStandingsCache(phaseId);
  _liveCtx = { kind:'group', phaseId, groupIdx };
  await openLiveMatch(matchId);
}

/* ---- Iniciar EN VIVO: eliminatoria (bracket) ---- */
async function startLiveBracketMatch(slotId, phaseId, teamA, teamB, roundIdx, matchIdx){
  phaseId = parseInt(phaseId, 10);
  const existing = await dbGetAll('matches', m=>m.slotId===slotId && m.phaseId===phaseId);
  let id;
  if(existing.length){
    id = existing[0].id;
    await dbPut('matches', { ...existing[0], goalsA: existing[0].goalsA??0, goalsB: existing[0].goalsB??0, live:true });
  } else {
    id = await dbAdd('matches', {
      slotId, phaseId, teamA, teamB,
      goalsA:0, goalsB:0, penA:null, penB:null,
      roundIdx, matchIdx, season:STATE.season,
      live:true, date:new Date().toISOString(),
    });
  }
  if(typeof invalidateStandingsCache==='function') invalidateStandingsCache(phaseId);
  _liveCtx = { kind:'bracket', phaseId };
  await openLiveMatch(id);
}

/* ---- Abrir el centro en vivo ---- */
async function openLiveMatch(matchId){
  const m = await dbGet('matches', matchId);
  if(!m){ showToast('Partido no encontrado','error'); return; }
  const phase = await dbGet('phases', m.phaseId);
  const knockout = _lmIsKnockout(phase?.type);

  const allTeams = await dbGetAll('teams');
  const nameById = {}; allTeams.forEach(t=>nameById[t.id]=t.name);
  const nameA = nameById[m.teamA] || String(m.teamA);
  const nameB = nameById[m.teamB] || String(m.teamB);

  let wrap = document.getElementById('live-match-wrap');
  if(!wrap){ wrap=document.createElement('div'); wrap.id='live-match-wrap'; document.body.appendChild(wrap); }

  const ga = m.goalsA||0, gb = m.goalsB||0;
  const hasPen = m.penA!=null && m.penB!=null;
  const showPen = knockout && (hasPen || (m.extraTime && ga===gb));

  const scoreCol = (side, val)=>`
    <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
      <button class="btn" onclick="liveAdjust(${matchId},'${side}',1)" style="width:54px;height:42px;font-size:22px;padding:0;">+</button>
      <div id="lm-${side}" style="font-family:'Bebas Neue';font-size:64px;line-height:1;min-width:70px;text-align:center;color:var(--txt);">${val}</div>
      <button class="btn" onclick="liveAdjust(${matchId},'${side}',-1)" style="width:54px;height:42px;font-size:22px;padding:0;">−</button>
    </div>`;

  const penCol = (side, val)=>`
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
      <button class="btn btn-xs" onclick="livePenAdjust(${matchId},'${side}',1)" style="width:40px;">+</button>
      <div id="lm-pen-${side}" style="font-family:'Bebas Neue';font-size:32px;line-height:1;min-width:44px;text-align:center;color:var(--gold);">${val??0}</div>
      <button class="btn btn-xs" onclick="livePenAdjust(${matchId},'${side}',-1)" style="width:40px;">−</button>
    </div>`;

  // Acciones del pie según tipo de fase
  let footer = `<button class="btn" onclick="closeLiveMatch()">Cerrar</button>`;
  if(knockout){
    if(!m.extraTime){
      footer += `<button class="btn" onclick="liveSetExtraTime(${matchId})" title="Entró en tiempo extra">⏱ Prórroga</button>`;
    }
    footer += `<button class="btn" onclick="liveTogglePenalties(${matchId})">🥅 Penales</button>`;
  }
  footer += `<button class="btn btn-primary" onclick="liveFinalize(${matchId})">✓ Finalizar</button>`;

  wrap.innerHTML = `
  <div class="modal-overlay open" id="live-match-modal">
    <div class="modal" style="max-width:440px;">
      <div class="modal-hdr">
        <div class="modal-title" style="display:flex;align-items:center;gap:9px;">
          <span class="live-dot live-dot-red"></span>EN VIVO
          ${m.extraTime?`<span style="font-size:11px;color:var(--gold);border:1px solid var(--gold-b);border-radius:10px;padding:1px 8px;letter-spacing:0.5px;">⏱ TIEMPO EXTRA</span>`:''}
        </div>
        <button class="modal-close" onclick="closeLiveMatch()">×</button>
      </div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;margin-bottom:14px;">
          <div style="font-size:15px;font-weight:700;text-align:center;line-height:1.2;">${_lmEsc(nameA)}</div>
          <div style="font-family:'Bebas Neue';font-size:18px;color:var(--txt3);">VS</div>
          <div style="font-size:15px;font-weight:700;text-align:center;line-height:1.2;">${_lmEsc(nameB)}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;">
          ${scoreCol('ga', ga)}
          <div style="font-family:'Bebas Neue';font-size:40px;color:var(--txt3);">-</div>
          ${scoreCol('gb', gb)}
        </div>

        <div id="lm-penalty-section" style="margin-top:16px;display:${showPen?'block':'none'};">
          <div style="font-size:12px;color:var(--txt3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;padding-top:12px;border-top:1px solid var(--brd);">Penales</div>
          <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;">
            ${penCol('a', m.penA)}
            <div style="font-family:'Bebas Neue';font-size:24px;color:var(--txt3);">-</div>
            ${penCol('b', m.penB)}
          </div>
        </div>

        <div id="lm-warn" style="margin-top:12px;font-size:12px;color:var(--yellow);text-align:center;min-height:16px;"></div>
      </div>
      <div class="modal-footer" style="flex-wrap:wrap;gap:8px;">
        ${footer}
      </div>
    </div>
  </div>`;
}

/* Ajusta el marcador (clamp ≥0), persiste y refresca solo los números. */
async function liveAdjust(matchId, side, delta){
  const m = await dbGet('matches', matchId);
  if(!m) return;
  let ga = m.goalsA||0, gb = m.goalsB||0;
  if(side==='ga') ga = Math.max(0, ga+delta);
  else            gb = Math.max(0, gb+delta);
  await dbPut('matches', { ...m, goalsA:ga, goalsB:gb, live:true });
  if(typeof invalidateStandingsCache==='function') invalidateStandingsCache(m.phaseId);
  const elA = document.getElementById('lm-ga'); if(elA) elA.textContent = ga;
  const elB = document.getElementById('lm-gb'); if(elB) elB.textContent = gb;
  _liveClearWarn();
}

async function liveSetExtraTime(matchId){
  const m = await dbGet('matches', matchId);
  if(!m) return;
  await dbPut('matches', { ...m, extraTime:true, live:true });
  await openLiveMatch(matchId); // re-render para mostrar badge y ocultar el botón
}

function liveTogglePenalties(matchId){
  const sec = document.getElementById('lm-penalty-section');
  if(sec) sec.style.display = (sec.style.display==='none' || !sec.style.display) ? 'block' : 'none';
}

async function livePenAdjust(matchId, side, delta){
  const m = await dbGet('matches', matchId);
  if(!m) return;
  let pa = m.penA||0, pb = m.penB||0;
  if(side==='a') pa = Math.max(0, pa+delta);
  else           pb = Math.max(0, pb+delta);
  await dbPut('matches', { ...m, penA:pa, penB:pb, live:true });
  const elA = document.getElementById('lm-pen-a'); if(elA) elA.textContent = pa;
  const elB = document.getElementById('lm-pen-b'); if(elB) elB.textContent = pb;
  _liveClearWarn();
}

function _liveWarn(msg){ const w=document.getElementById('lm-warn'); if(w) w.textContent=msg; }
function _liveClearWarn(){ const w=document.getElementById('lm-warn'); if(w) w.textContent=''; }

async function liveFinalize(matchId){
  const m = await dbGet('matches', matchId);
  if(!m){ showToast('Partido no encontrado','error'); return; }
  const phase = await dbGet('phases', m.phaseId);
  const knockout = _lmIsKnockout(phase?.type);
  const ga = m.goalsA||0, gb = m.goalsB||0;

  if(knockout && ga===gb){
    const pa = m.penA, pb = m.penB;
    if(pa==null || pb==null || pa===pb){
      _liveWarn('Eliminatoria empatada: define un ganador por prórroga o penales.');
      const sec = document.getElementById('lm-penalty-section'); if(sec) sec.style.display='block';
      return;
    }
  }

  await dbPut('matches', {
    ...m,
    goalsA:ga, goalsB:gb,
    live:false,
    playedAt: m.playedAt || new Date().toISOString(),
  });
  if(typeof appendOrUpdateHistory==='function') await appendOrUpdateHistory(matchId);
  if(typeof invalidateStandingsCache==='function') invalidateStandingsCache(m.phaseId);
  showToast(`Partido finalizado · ${ga}-${gb}`);
  closeLiveMatch();
  _liveRefreshBackground();
}

function closeLiveMatch(){
  const el = document.getElementById('live-match-wrap');
  if(el) el.innerHTML='';
  _liveRefreshBackground();
}
