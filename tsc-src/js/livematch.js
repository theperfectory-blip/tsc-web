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

/* ¿Este partido EXIGE un ganador al finalizar?
   - bracket / single (partido único): sí.
   - playoff: solo el partido DECISIVO de la serie (último leg). La ida puede
     terminar empatada — la serie se resuelve por el global/visita/penales.
   - grupos: no (el empate es un resultado válido). */
function _liveMustHaveWinner(m, phase){
  const t = phase?.type;
  if(t==='bracket' || t==='single') return true;
  if(t==='playoff'){
    const legsCount = parseInt(phase?.config?.legs)||2;
    return legsCount<=1 || m.leg===legsCount;
  }
  return false;
}

/* La gestión del partido en vivo SOLO está permitida en modo admin.
   El "modo público" es una vista de espectador (solo-lectura), aunque
   el usuario tenga rol admin. Las reglas de Firestore son la barrera
   real; esto evita además mostrar/usar controles de edición fuera de admin. */
function _liveCanEdit(){
  return typeof STATE !== 'undefined' && STATE.mode === 'admin';
}

/* Devuelve OTRO partido que esté EN VIVO (distinto de exceptId), o null.
   Solo puede haber un partido en vivo a la vez en todo el torneo. */
async function _findOtherLiveMatch(exceptId){
  try {
    const all = await dbGetAll('matches', m=>!!m.live);
    return all.find(m=>m.id!==exceptId) || null;
  } catch(_){ return null; }
}

/* Avisa (toast) si ya hay otro partido en vivo. Devuelve true si está bloqueado. */
async function _blockIfOtherLive(exceptId){
  const other = await _findOtherLiveMatch(exceptId);
  if(other){
    showToast('Ya hay un partido EN VIVO. Finalízalo antes de iniciar otro.', 'error');
    return true;
  }
  return false;
}

/* Refresca la vista de admin de fondo (lista de fechas, bracket o playoff)
   para que el marcador en miniatura siga al modal en tiempo real. */
function _liveRefreshBackground(){
  const ctx = _liveCtx;
  if(!ctx) return;
  try {
    if(ctx.kind==='group' && typeof showMatchGroupTable==='function'){
      showMatchGroupTable(ctx.phaseId, ctx.groupIdx);
    } else if(ctx.kind==='bracket' && typeof renderBracket==='function'){
      const cid = document.querySelector('[id^="bracket-container-"]')?.id;
      if(cid) renderBracket(ctx.phaseId, cid, true);
    } else if(ctx.kind==='playoff' && typeof renderPlayoff==='function'){
      const cid = document.querySelector('[id^="playoff-container-"]')?.id;
      if(cid) renderPlayoff(ctx.phaseId, cid, true);
    }
  } catch(err){
    console.error('[LiveMatch] Error al refrescar fondo:', err);
  }
}

/* ---- Iniciar EN VIVO: fase de grupos ---- */
async function startLiveGroupMatch(matchId, phaseId, groupIdx){
  if(!_liveCanEdit()){ showToast('Cambia a modo administrador para gestionar el partido','error'); return; }
  if(await _blockIfOtherLive(matchId)) return;
  const m = await dbGet('matches', matchId);
  if(!m){ showToast('Partido no encontrado','error'); return; }
  const now = new Date().toISOString();
  await dbPut('matches', {
    ...m,
    goalsA: m.goalsA!=null ? m.goalsA : 0,
    goalsB: m.goalsB!=null ? m.goalsB : 0,
    live: true,
    liveStartAt: m.liveStartAt || now,
    liveEndAt: null,
    playedAt: m.playedAt || now,
  });
  if(typeof invalidateStandingsCache==='function') invalidateStandingsCache(phaseId);
  _liveCtx = { kind:'group', phaseId, groupIdx };
  await openLiveMatch(matchId);
}

/* ---- Iniciar EN VIVO: eliminatoria (bracket) ---- */
async function startLiveBracketMatch(slotId, phaseId, teamA, teamB, roundIdx, matchIdx){
  if(!_liveCanEdit()){ showToast('Cambia a modo administrador para gestionar el partido','error'); return; }
  phaseId = parseInt(phaseId, 10);
  const existing = await dbGetAll('matches', m=>m.slotId===slotId && m.phaseId===phaseId);
  if(await _blockIfOtherLive(existing[0]?.id)) return;
  const now = new Date().toISOString();
  let id;
  if(existing.length){
    id = existing[0].id;
    await dbPut('matches', { ...existing[0], goalsA: existing[0].goalsA??0, goalsB: existing[0].goalsB??0, live:true, liveStartAt: existing[0].liveStartAt||now, liveEndAt:null });
  } else {
    id = await dbAdd('matches', {
      slotId, phaseId, teamA, teamB,
      goalsA:0, goalsB:0, penA:null, penB:null,
      roundIdx, matchIdx, season:STATE.season,
      live:true, liveStartAt:now, liveEndAt:null, date:now,
    });
  }
  if(typeof invalidateStandingsCache==='function') invalidateStandingsCache(phaseId);
  _liveCtx = { kind:'bracket', phaseId };
  await openLiveMatch(id);
}

/* ---- Iniciar EN VIVO: leg de playoff (serie ida/vuelta) ---- */
async function startLivePlayoffLeg(phaseId, slotId, matchIdx, leg, teamA, teamB){
  if(!_liveCanEdit()){ showToast('Cambia a modo administrador para gestionar el partido','error'); return; }
  phaseId = parseInt(phaseId, 10);
  const existing = await dbGetAll('matches', m=>m.slotId===slotId && m.phaseId===phaseId);
  if(await _blockIfOtherLive(existing[0]?.id)) return;
  const now = new Date().toISOString();
  let id;
  if(existing.length){
    id = existing[0].id;
    await dbPut('matches', { ...existing[0], goalsA: existing[0].goalsA??0, goalsB: existing[0].goalsB??0, live:true, liveStartAt: existing[0].liveStartAt||now, liveEndAt:null });
  } else {
    id = await dbAdd('matches', {
      slotId, phaseId, teamA, teamB,
      goalsA:0, goalsB:0, penA:null, penB:null,
      matchIdx, leg, season:STATE.season,
      live:true, liveStartAt:now, liveEndAt:null, date:now,
    });
  }
  if(typeof invalidateStandingsCache==='function') invalidateStandingsCache(phaseId);
  _liveCtx = { kind:'playoff', phaseId };
  await openLiveMatch(id);
}

/* ---- Abrir el centro en vivo ---- */
async function openLiveMatch(matchId){
  if(!_liveCanEdit()){ showToast('Cambia a modo administrador para gestionar el partido','error'); return; }
  const m = await dbGet('matches', matchId);
  if(!m){ showToast('Partido no encontrado','error'); return; }
  const phase = await dbGet('phases', m.phaseId);
  const knockout = _liveMustHaveWinner(m, phase); // exige ganador (prórroga/penales)

  const allTeams = await dbGetAll('teams');
  const byId = {}; allTeams.forEach(t=>byId[t.id]=t);
  const nameA = byId[m.teamA]?.name || String(m.teamA);
  const nameB = byId[m.teamB]?.name || String(m.teamB);
  const teamObjA = byId[m.teamA], teamObjB = byId[m.teamB];

  let wrap = document.getElementById('live-match-wrap');
  if(!wrap){ wrap=document.createElement('div'); wrap.id='live-match-wrap'; document.body.appendChild(wrap); }

  const ga = m.goalsA||0, gb = m.goalsB||0;
  const hasPen = m.penA!=null && m.penB!=null;
  const showPen = knockout && (hasPen || (m.extraTime && ga===gb));
  const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}) : '—';

  // Columna de un equipo: logo + nombre + marcador grande + botón GOL grande
  const logoHtml = (name, obj)=> (typeof teamLogoHtml==='function') ? teamLogoHtml(name, obj, 44) : '';
  const teamCol = (side, name, obj, val)=>`
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
      ${logoHtml(name, obj)}
      <div style="font-size:14px;font-weight:700;text-align:center;line-height:1.2;min-height:34px;display:flex;align-items:center;">${_lmEsc(name)}</div>
      <div id="lm-${side}" style="font-family:'Bebas Neue';font-size:64px;line-height:1;text-align:center;color:var(--txt);">${val}</div>
      <button class="btn btn-primary" onclick="liveGoal(${matchId},'${side}')" style="width:100%;font-family:'Barlow Condensed';font-weight:700;font-size:16px;letter-spacing:1px;padding:10px 0;">⚽ GOL</button>
    </div>`;

  const penCol = (side, val)=>`
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
      <button class="btn btn-xs" onclick="livePenAdjust(${matchId},'${side}',1)" style="width:40px;">+</button>
      <div id="lm-pen-${side}" style="font-family:'Bebas Neue';font-size:32px;line-height:1;min-width:44px;text-align:center;color:var(--gold);">${val??0}</div>
      <button class="btn btn-xs" onclick="livePenAdjust(${matchId},'${side}',-1)" style="width:40px;">−</button>
    </div>`;

  // Acciones del pie según tipo de fase
  let footer = `<button class="btn" onclick="closeLiveMatch()">Cerrar</button>`;
  footer += `<button class="btn btn-danger btn-sm" onclick="liveDiscard(${matchId})" title="Cancelar el en vivo (no queda como jugado)">🗑 Descartar</button>`;
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
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:14px;align-items:start;">
          ${teamCol('ga', nameA, teamObjA, ga)}
          <div style="font-family:'Bebas Neue';font-size:44px;color:var(--txt3);padding-top:104px;">-</div>
          ${teamCol('gb', nameB, teamObjB, gb)}
        </div>

        <div style="display:flex;justify-content:center;margin-top:14px;">
          <button class="btn btn-sm" onclick="liveReset(${matchId})" title="Reiniciar marcador a 0-0" style="color:var(--txt2);">↺ Reiniciar</button>
        </div>

        <div id="lm-penalty-section" style="margin-top:14px;display:${showPen?'block':'none'};">
          <div style="font-size:12px;color:var(--txt3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;padding-top:12px;border-top:1px solid var(--brd);">Penales</div>
          <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;">
            ${penCol('a', m.penA)}
            <div style="font-family:'Bebas Neue';font-size:24px;color:var(--txt3);">-</div>
            ${penCol('b', m.penB)}
          </div>
        </div>

        <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--brd);display:flex;justify-content:space-between;font-size:12px;color:var(--txt3);">
          <span>🟢 Inicio: <strong style="color:var(--txt2);">${fmtTime(m.liveStartAt)}</strong></span>
          <span>🏁 Fin: <strong style="color:var(--txt2);">${m.liveEndAt?fmtTime(m.liveEndAt):'en juego'}</strong></span>
        </div>

        <div id="lm-warn" style="margin-top:10px;font-size:12px;color:var(--yellow);text-align:center;min-height:16px;"></div>
      </div>
      <div class="modal-footer" style="flex-wrap:wrap;gap:8px;">
        ${footer}
      </div>
    </div>
  </div>`;
}

/* Marca un gol (botón ⚽ GOL): +1 al equipo, persiste y refresca el número. */
async function liveGoal(matchId, side){
  await liveAdjust(matchId, side, 1);
}

/* Reinicia el marcador a 0-0 (sin perder el estado EN VIVO). */
async function liveReset(matchId){
  if(!_liveCanEdit()) return;
  const m = await dbGet('matches', matchId);
  if(!m) return;
  await dbPut('matches', { ...m, goalsA:0, goalsB:0, live:true });
  if(typeof invalidateStandingsCache==='function') invalidateStandingsCache(m.phaseId);
  const elA = document.getElementById('lm-ga'); if(elA) elA.textContent = 0;
  const elB = document.getElementById('lm-gb'); if(elB) elB.textContent = 0;
  _liveClearWarn();
}

/* Ajusta el marcador (clamp ≥0), persiste y refresca tabla + modal. */
async function liveAdjust(matchId, side, delta){
  if(!_liveCanEdit()) return;
  const m = await dbGet('matches', matchId);
  if(!m) return;
  let ga = m.goalsA||0, gb = m.goalsB||0;
  if(side==='ga') ga = Math.max(0, ga+delta);
  else            gb = Math.max(0, gb+delta);
  await dbPut('matches', { ...m, goalsA:ga, goalsB:gb, live:true });
  if(typeof invalidateStandingsCache==='function') invalidateStandingsCache(m.phaseId);
  const elA = document.getElementById('lm-ga'); if(elA) elA.textContent = ga;
  const elB = document.getElementById('lm-gb'); if(elB) elB.textContent = gb;
  _liveRefreshBackground();
  _liveClearWarn();
}

async function liveSetExtraTime(matchId){
  if(!_liveCanEdit()) return;
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
  if(!_liveCanEdit()) return;
  const m = await dbGet('matches', matchId);
  if(!m) return;
  let pa = m.penA||0, pb = m.penB||0;
  if(side==='a') pa = Math.max(0, pa+delta);
  else           pb = Math.max(0, pb+delta);
  await dbPut('matches', { ...m, penA:pa, penB:pb, live:true });
  const elA = document.getElementById('lm-pen-a'); if(elA) elA.textContent = pa;
  const elB = document.getElementById('lm-pen-b'); if(elB) elB.textContent = pb;
  _liveRefreshBackground();
  _liveClearWarn();
}

function _liveWarn(msg){ const w=document.getElementById('lm-warn'); if(w) w.textContent=msg; }
function _liveClearWarn(){ const w=document.getElementById('lm-warn'); if(w) w.textContent=''; }

/* Estado de una serie de playoff/single de varios legs.
   Considera el marcador ACTUAL de todos los legs (ya persistidos) y la
   misma jerarquía de desempate que renderPlayoff: global → gol de visita.
   Devuelve { needPen } = true SOLO si tras jugar todos los legs el global
   sigue empatado y el gol de visita no resuelve (entonces sí hacen falta
   penales en el leg decisivo). */
async function _playoffSeriesNeedsPenalties(m, phase){
  const config    = phase?.config || {};
  const legsCount = parseInt(config.legs) || 2;
  const awayGoal  = config.awayGoal || false;
  // Identificar la serie por el PREFIJO del slotId (`${phaseId}_m${idx}_legN`)
  // en vez de depender solo de `matchIdx`, que puede faltar en docs antiguos.
  const legNum = x=>{ const r=/_leg(\d+)$/.exec(String(x.slotId||'')); return r?parseInt(r[1]):(x.leg||0); };
  const seriesPrefix = String(m.slotId||'').replace(/_leg\d+$/,''); // "6_m0"
  const legs = await dbGetAll('matches', x=>{
    if(x.phaseId!==m.phaseId) return false;
    if(seriesPrefix) return String(x.slotId||'').indexOf(seriesPrefix+'_leg')===0;
    return x.matchIdx===m.matchIdx; // fallback si no hay slotId
  });
  legs.sort((a,b)=>legNum(a)-legNum(b));
  const allPlayed = legs.length>=legsCount && legs.every(l=>l.goalsA!=null && l.goalsB!=null);
  if(!allPlayed) return false; // aún faltan legs: no se fuerza desempate aquí
  const totA = legs.reduce((s,l)=>s+(l.goalsA||0),0);
  const totB = legs.reduce((s,l)=>s+(l.goalsB||0),0);
  if(totA!==totB) return false;             // hay ganador por global
  if(awayGoal && legsCount>=2){
    const awayA = legs[1]?.goalsA ?? 0;     // visita de A en la vuelta
    const awayB = legs[0]?.goalsB ?? 0;     // visita de B en la ida
    if(awayA!==awayB) return false;         // resuelto por gol de visita
  }
  return true;                              // global empatado → penales
}

async function liveFinalize(matchId){
  if(!_liveCanEdit()){ showToast('Cambia a modo administrador para gestionar el partido','error'); return; }
  const m = await dbGet('matches', matchId);
  if(!m){ showToast('Partido no encontrado','error'); return; }
  const phase = await dbGet('phases', m.phaseId);
  const ga = m.goalsA||0, gb = m.goalsB||0;

  // ¿Hace falta un desempate (prórroga/penales) que aún no está resuelto?
  // Default de legs DEBE coincidir con renderPlayoff (2 en playoff/single); si
  // aquí usáramos 1, una serie ida/vuelta se trataría como partido único y un
  // empate en la vuelta pediría penales sin sumar la ida.
  const ptype      = phase?.type;
  const defaultLegs= (ptype==='playoff' || ptype==='single') ? 2 : 1;
  const legsCount  = parseInt(phase?.config?.legs) || defaultLegs;
  const isKnockout = ['bracket','single','playoff'].includes(ptype);
  // Nº de leg: del campo, o derivado del slotId (`..._legN`) si el campo falta.
  const slotLegMatch = /_leg(\d+)$/.exec(String(m.slotId||''));
  const mLeg = (m.leg!=null) ? m.leg : (slotLegMatch ? parseInt(slotLegMatch[1]) : null);
  const isMultiLeg = legsCount>=2 && mLeg!=null;   // serie ida/vuelta
  let needsTiebreak = false;
  if(isKnockout){
    if(isMultiLeg){
      // En la IDA el empate es válido; solo el leg decisivo puede exigir desempate,
      // y SOLO si el GLOBAL de la serie sigue empatado (no el marcador del leg).
      needsTiebreak = (mLeg===legsCount) && await _playoffSeriesNeedsPenalties(m, phase);
    } else {
      // Partido único (bracket/single/supercopa de 1 partido): empate → desempate.
      needsTiebreak = (ga===gb);
    }
  }

  if(needsTiebreak){
    const pa = m.penA, pb = m.penB;
    if(pa==null || pb==null || pa===pb){
      _liveWarn('Eliminatoria empatada: define un ganador por prórroga o penales.');
      const sec = document.getElementById('lm-penalty-section'); if(sec) sec.style.display='block';
      return;
    }
  }

  const now = new Date().toISOString();
  await dbPut('matches', {
    ...m,
    goalsA:ga, goalsB:gb,
    live:false,
    liveEndAt: now,
    playedAt: m.playedAt || now,
  });
  if(typeof appendOrUpdateHistory==='function') await appendOrUpdateHistory(matchId);
  if(typeof invalidateStandingsCache==='function') invalidateStandingsCache(m.phaseId);
  showToast(`Partido finalizado · ${ga}-${gb}`);
  closeLiveMatch();
  _liveRefreshBackground();
}

/* Cancela el partido EN VIVO sin dejarlo como jugado.
   - bracket/playoff (con slotId): borra el doc → vuelve a "por jugar".
   - grupos: quita live y borra el marcador → vuelve a pendiente. */
async function liveDiscard(matchId){
  if(!_liveCanEdit()){ showToast('Cambia a modo administrador','error'); return; }
  const m = await dbGet('matches', matchId);
  if(!m) return;
  const doDiscard = async ()=>{
    if(m.slotId){
      if(typeof removeHistoryByMatchRef==='function') await removeHistoryByMatchRef(m.id);
      await dbDelete('matches', m.id);
    } else {
      await dbPut('matches', { ...m, live:false, goalsA:null, goalsB:null, penA:null, penB:null, extraTime:false, liveStartAt:null, liveEndAt:null });
    }
    if(typeof invalidateStandingsCache==='function') invalidateStandingsCache(m.phaseId);
    showToast('Partido en vivo descartado');
    closeLiveMatch();
  };
  if(typeof showConfirm==='function'){
    showConfirm('¿Descartar partido en vivo?', 'Se cancelará el EN VIVO y el partido volverá a "por jugar" (no queda como 0-0).', doDiscard);
  } else { await doDiscard(); }
}

function closeLiveMatch(){
  const el = document.getElementById('live-match-wrap');
  if(el) el.innerHTML='';
  _liveRefreshBackground();
  _liveCtx = null;
}
