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

/* ¿Este partido EXIGE un ganador al finalizar?
   - bracket / single (partido único): sí.
   - bracket twoLeg (ida y vuelta): solo el leg 2 (vuelta) exige ganador global.
   - playoff: solo el partido DECISIVO de la serie (último leg). La ida puede
     terminar empatada — la serie se resuelve por el global/visita/penales.
   - grupos: no (el empate es un resultado válido). */
function _liveMustHaveWinner(m, phase){
  const t = phase?.type;
  if(t==='bracket' || t==='single'){
    // Cruce ida y vuelta: la ida (leg 1) puede terminar empatada;
    // la vuelta (leg 2) exige un ganador global (gol visita o penales).
    const slotLegMatch = /_leg(\d+)$/.exec(String(m.slotId||''));
    if(slotLegMatch && phase?.config?.legs==='double'){
      return parseInt(slotLegMatch[1]) >= 2; // solo vuelta exige ganador
    }
    return true; // partido único → siempre exige ganador
  }
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

/* ----------------------------------------------------------
   Escrituras del centro en vivo (MS-5.8)
   - Cola única: cada clic (gol, penal, finalizar...) espera al anterior, para
     que dos clics seguidos no lean el mismo marcador y se pisen.
   - Errores de red o de reglas como aviso claro, nunca promesa sin capturar.
   - Un partido que ya no está en vivo (finalizado o descartado desde otra
     pantalla) no se modifica: antes cada gol lo volvía a poner en vivo.
   ---------------------------------------------------------- */
let _lmQueue = Promise.resolve();
function _lmEnqueue(fn, what){
  const run = _lmQueue.then(fn);
  _lmQueue = run.catch(()=>{});
  return run.catch(err=>{
    console.error('[LiveMatch]', err);
    showToast((what ? what+': ' : '')+dbErrorMsg(err), 'error');
  });
}

const _LM_ICON = {
  clock:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  check:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><polyline points="20 6 9 17 4 12"/></svg>',
  undo:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
};

/* Partido vigente y todavía en vivo, o null (con aviso). Rechaza también las
   temporadas finalizadas (H-49: la UI ya lo bloquea, el código también). */
async function _lmLiveDoc(matchId){
  const m = await dbGet('matches', matchId);
  if(!m){ showToast('Partido no encontrado','error'); return null; }
  if(!m.live){
    showToast('Este partido ya no está en vivo','error');
    closeLiveMatch();
    return null;
  }
  if(await _mxSeasonLocked(m.phaseId)) return null;
  return m;
}

/* Devuelve OTRO partido que esté EN VIVO (distinto de exceptId), o null.
   Solo puede haber un partido en vivo a la vez en todo el torneo. Si la
   lectura falla, el error sube: antes devolvía null y dejaba pasar un
   segundo partido en vivo. */
async function _findOtherLiveMatch(exceptId){
  const all = await dbGetAll('matches', m=>!!m.live);
  return all.find(m=>m.id!==exceptId) || null;
}

async function _blockIfOtherLive(exceptId){
  const other = await _findOtherLiveMatch(exceptId);
  if(other) showToast('Ya hay otro partido en vivo: finalízalo o descártalo primero','error');
  return !!other;
}

/* Pone un partido EN VIVO. existing: partido guardado (o null si el cruce
   todavía no tiene documento); fresh: campos del documento nuevo. */
async function _lmStart(phaseId, existing, fresh, ctx){
  if(!_liveCanEdit()){ showToast('Cambia a modo administrador para gestionar el partido','error'); return; }
  if(await _mxSeasonLocked(phaseId)) return;
  if(existing?.live){ _liveCtx = ctx; await openLiveMatch(existing.id); return; }
  if(await _blockIfOtherLive(existing?.id)) return;
  const teamA = existing ? existing.teamA : fresh.teamA;
  const teamB = existing ? existing.teamB : fresh.teamB;
  if(teamA==null || teamB==null){ showToast('El cruce todavía no tiene los dos equipos definidos','error'); return; }
  // Un cruce ya jugado cuyo ganador pasó a una ronda jugada: ponerlo en vivo y
  // cambiar el resultado dejaría esa ronda con un equipo que ya no gana.
  if(existing && existing.goalsA!=null && existing.roundIdx!=null){
    const phase = await dbGet('phases', phaseId);
    if(phase?.type==='bracket' && typeof _bkNextPlayed==='function'
       && await _bkNextPlayed(phase, existing.roundIdx, existing.matchIdx||0)){
      showToast('La ronda siguiente ya tiene resultado con el ganador de este cruce: bórralo antes de ponerlo en vivo','error');
      return;
    }
  }
  const now = new Date().toISOString();
  let id;
  if(existing){
    id = existing.id;
    await dbPut('matches', { ...existing, goalsA: existing.goalsA??0, goalsB: existing.goalsB??0, live:true, liveStartAt: existing.liveStartAt||now, liveEndAt:null, playedAt: existing.playedAt||now });
  } else {
    id = await dbAdd('matches', { ...fresh, goalsA:0, goalsB:0, penA:null, penB:null, season:STATE.season, live:true, liveStartAt:now, liveEndAt:null, date:now });
  }
  if(typeof invalidateStandingsAndSyncBrackets==='function') invalidateStandingsAndSyncBrackets(phaseId);
  _liveCtx = ctx;
  await openLiveMatch(id);
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
function startLiveGroupMatch(matchId, phaseId, groupIdx){
  return _lmEnqueue(async ()=>{
    const m = await dbGet('matches', matchId);
    if(!m){ showToast('Partido no encontrado','error'); return; }
    await _lmStart(m.phaseId ?? phaseId, m, null, { kind:'group', phaseId, groupIdx });
  }, 'No se pudo poner el partido en vivo');
}

/* ---- Iniciar EN VIVO: eliminatoria (bracket) ---- */
function startLiveBracketMatch(slotId, phaseId, teamA, teamB, roundIdx, matchIdx){
  phaseId = parseInt(phaseId, 10);
  return _lmEnqueue(async ()=>{
    const existing = await dbGetAll('matches', m=>m.slotId===slotId && m.phaseId===phaseId);
    await _lmStart(phaseId, existing[0]||null, { slotId, phaseId, teamA, teamB, roundIdx, matchIdx }, { kind:'bracket', phaseId });
  }, 'No se pudo poner el partido en vivo');
}

/* ---- Iniciar EN VIVO: leg de bracket ida/vuelta ---- */
function startLiveBracketLeg(baseSlotId, phaseId, legNum, teamA, teamB, roundIdx, matchIdx){
  phaseId = parseInt(phaseId, 10);
  const slotId = baseSlotId + '_leg' + legNum;
  return _lmEnqueue(async ()=>{
    const existing = await dbGetAll('matches', m=>m.slotId===slotId && m.phaseId===phaseId);
    await _lmStart(phaseId, existing[0]||null, { slotId, phaseId, teamA, teamB, roundIdx, matchIdx, leg:legNum }, { kind:'bracket', phaseId });
  }, 'No se pudo poner el partido en vivo');
}

/* ---- Iniciar EN VIVO: leg de playoff (serie ida/vuelta) ---- */
function startLivePlayoffLeg(phaseId, slotId, matchIdx, leg, teamA, teamB){
  phaseId = parseInt(phaseId, 10);
  return _lmEnqueue(async ()=>{
    const existing = await dbGetAll('matches', m=>m.slotId===slotId && m.phaseId===phaseId);
    await _lmStart(phaseId, existing[0]||null, { slotId, phaseId, teamA, teamB, matchIdx, leg }, { kind:'playoff', phaseId });
  }, 'No se pudo poner el partido en vivo');
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
      <div style="font-size:14px;font-weight:700;text-align:center;line-height:1.2;min-height:34px;display:flex;align-items:center;">${escHtml(name)}</div>
      <div id="lm-${side}" style="font-family:'Bebas Neue';font-size:64px;line-height:1;text-align:center;color:var(--txt);">${val}</div>
      <button class="btn btn-primary" onclick="liveGoal(${matchId},'${side}')" style="width:100%;font-family:'Barlow Condensed';font-weight:700;font-size:16px;letter-spacing:1px;padding:10px 0;display:flex;align-items:center;justify-content:center;gap:6px;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>GOL</button>
    </div>`;

  const penCol = (side, val)=>`
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
      <button class="btn btn-xs" onclick="livePenAdjust(${matchId},'${side}',1)" style="width:40px;">+</button>
      <div id="lm-pen-${side}" style="font-family:'Bebas Neue';font-size:32px;line-height:1;min-width:44px;text-align:center;color:var(--gold);">${val??0}</div>
      <button class="btn btn-xs" onclick="livePenAdjust(${matchId},'${side}',-1)" style="width:40px;">−</button>
    </div>`;

  // Acciones del pie según tipo de fase
  let footer = `<button class="btn" onclick="closeLiveMatch()">Cerrar</button>`;
  footer += `<button class="btn btn-danger btn-sm" onclick="liveDiscard(${matchId})" title="Cancelar el en vivo (no queda como jugado)"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Descartar</button>`;
  if(knockout){
    if(!m.extraTime){
      footer += `<button class="btn" onclick="liveSetExtraTime(${matchId})" title="Entró en tiempo extra">${_LM_ICON.clock} Prórroga</button>`;
    }
    footer += `<button class="btn" onclick="liveTogglePenalties(${matchId})">Penales</button>`;
  }
  footer += `<button class="btn btn-primary" onclick="liveFinalize(${matchId})">${_LM_ICON.check} Finalizar</button>`;

  wrap.innerHTML = `
  <div class="modal-overlay open" id="live-match-modal">
    <div class="modal" style="max-width:440px;">
      <div class="modal-hdr">
        <div class="modal-title" style="display:flex;align-items:center;gap:9px;">
          <span class="live-dot live-dot-red"></span>EN VIVO
          ${m.extraTime?`<span style="font-size:11px;color:var(--gold);border:1px solid var(--gold-b);border-radius:10px;padding:1px 8px;letter-spacing:0.5px;">${_LM_ICON.clock} TIEMPO EXTRA</span>`:''}
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
          <button class="btn btn-sm" onclick="liveReset(${matchId})" title="Reiniciar marcador a 0-0" style="color:var(--txt2);">${_LM_ICON.undo} Reiniciar</button>
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
          <span style="display:inline-flex;align-items:center;gap:4px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0;"></span> Inicio: <strong style="color:var(--txt2);">${fmtTime(m.liveStartAt)}</strong></span>
          <span style="display:inline-flex;align-items:center;gap:4px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg> Fin: <strong style="color:var(--txt2);">${m.liveEndAt?fmtTime(m.liveEndAt):'en juego'}</strong></span>
        </div>

        <div id="lm-warn" style="margin-top:10px;font-size:12px;color:var(--yellow);text-align:center;min-height:16px;"></div>
      </div>
      <div class="modal-footer" style="flex-wrap:wrap;gap:8px;">
        ${footer}
      </div>
    </div>
  </div>`;
}

/* Marca un gol (botón GOL): +1 al equipo, persiste y refresca el número. */
function liveGoal(matchId, side){
  return liveAdjust(matchId, side, 1);
}

/* Reinicia el marcador a 0-0 (sin perder el estado EN VIVO). */
function liveReset(matchId){
  if(!_liveCanEdit()) return;
  return _lmEnqueue(async ()=>{
    const m = await _lmLiveDoc(matchId);
    if(!m) return;
    const doReset = ()=>_lmEnqueue(async ()=>{
      const cur = await _lmLiveDoc(matchId);
      if(!cur) return;
      await dbPut('matches', { ...cur, goalsA:0, goalsB:0 });
      if(typeof invalidateStandingsAndSyncBrackets==='function') invalidateStandingsAndSyncBrackets(cur.phaseId);
      const elA = document.getElementById('lm-ga'); if(elA) elA.textContent = 0;
      const elB = document.getElementById('lm-gb'); if(elB) elB.textContent = 0;
      _liveClearWarn();
    }, 'No se pudo reiniciar el marcador');
    if((m.goalsA||0)+(m.goalsB||0) > 0 && typeof showConfirm==='function'){
      showConfirm('¿Reiniciar el marcador?', `Se pierde el marcador actual (${m.goalsA||0}-${m.goalsB||0}) y vuelve a 0-0. El partido sigue en vivo.`, doReset);
    } else { doReset(); }
  }, 'No se pudo reiniciar el marcador');
}

/* Ajusta el marcador (de 0 a 99), persiste y refresca tabla + modal. */
function liveAdjust(matchId, side, delta){
  if(!_liveCanEdit()) return;
  return _lmEnqueue(async ()=>{
    const m = await _lmLiveDoc(matchId);
    if(!m) return;
    let ga = m.goalsA||0, gb = m.goalsB||0;
    if(side==='ga') ga = Math.min(99, Math.max(0, ga+delta));
    else            gb = Math.min(99, Math.max(0, gb+delta));
    if(ga===(m.goalsA||0) && gb===(m.goalsB||0)) return;
    await dbPut('matches', { ...m, goalsA:ga, goalsB:gb });
    if(typeof invalidateStandingsAndSyncBrackets==='function') invalidateStandingsAndSyncBrackets(m.phaseId);
    const elA = document.getElementById('lm-ga'); if(elA) elA.textContent = ga;
    const elB = document.getElementById('lm-gb'); if(elB) elB.textContent = gb;
    _liveRefreshBackground();
    _liveClearWarn();
  }, 'No se pudo guardar el marcador');
}

function liveSetExtraTime(matchId){
  if(!_liveCanEdit()) return;
  return _lmEnqueue(async ()=>{
    const m = await _lmLiveDoc(matchId);
    if(!m) return;
    await dbPut('matches', { ...m, extraTime:true });
    await openLiveMatch(matchId); // re-render para mostrar badge y ocultar el botón
  }, 'No se pudo marcar el tiempo extra');
}

function liveTogglePenalties(matchId){
  const sec = document.getElementById('lm-penalty-section');
  if(sec) sec.style.display = (sec.style.display==='none' || !sec.style.display) ? 'block' : 'none';
}

function livePenAdjust(matchId, side, delta){
  if(!_liveCanEdit()) return;
  return _lmEnqueue(async ()=>{
    const m = await _lmLiveDoc(matchId);
    if(!m) return;
    let pa = m.penA||0, pb = m.penB||0;
    if(side==='a') pa = Math.min(99, Math.max(0, pa+delta));
    else           pb = Math.min(99, Math.max(0, pb+delta));
    await dbPut('matches', { ...m, penA:pa, penB:pb });
    const elA = document.getElementById('lm-pen-a'); if(elA) elA.textContent = pa;
    const elB = document.getElementById('lm-pen-b'); if(elB) elB.textContent = pb;
    _liveRefreshBackground();
    _liveClearWarn();
  }, 'No se pudo guardar los penales');
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

function liveFinalize(matchId){
  if(!_liveCanEdit()){ showToast('Cambia a modo administrador para gestionar el partido','error'); return; }
  return _lmEnqueue(()=>_liveFinalize(matchId), 'No se pudo finalizar el partido');
}

async function _liveFinalize(matchId){
  const m = await _lmLiveDoc(matchId);   // un doble clic en «Finalizar» llega aquí con el partido ya cerrado
  if(!m) return;
  const phase = await dbGet('phases', m.phaseId);
  const ga = m.goalsA||0, gb = m.goalsB||0;
  const okGoal = n => Number.isInteger(n) && n>=0 && n<=99;
  if(!okGoal(ga) || !okGoal(gb) || (m.penA!=null && !okGoal(m.penA)) || (m.penB!=null && !okGoal(m.penB))){
    _liveWarn('El marcador debe ser de números enteros entre 0 y 99. Usa «Reiniciar» y vuelve a cargarlo.');
    return;
  }

  // ¿Hace falta un desempate (prórroga/penales) que aún no está resuelto?
  // Default de legs DEBE coincidir con renderPlayoff (2 en playoff/single); si
  // aquí usáramos 1, una serie ida/vuelta se trataría como partido único y un
  // empate en la vuelta pediría penales sin sumar la ida.
  const ptype      = phase?.type;
  const defaultLegs= (ptype==='playoff' || ptype==='single') ? 2 : 1;
  // 'double' no es un número → parseInt('double')=NaN; convertirlo a 2 explícitamente.
  const configLegs = phase?.config?.legs;
  const legsCount  = (configLegs==='double') ? 2 : (parseInt(configLegs)||defaultLegs);
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

  // Los penales solo valen si el partido o la serie los necesitan; si se
  // tocaron y después el marcador resolvió el cruce, no se guardan.
  const penA = needsTiebreak ? m.penA : null;
  const penB = needsTiebreak ? m.penB : null;
  const now = new Date().toISOString();
  const finalDoc = { ...m, goalsA:ga, goalsB:gb, penA, penB, live:false, liveEndAt: now, playedAt: m.playedAt || now };
  // Partido e historial en UN lote (H-59): antes eran dos escrituras y un
  // corte entre ambas dejaba el partido finalizado sin historial.
  await dbWriteBatch(await _bkResultOps([{ doc:finalDoc, history:true }]));
  if(typeof invalidateStandingsAndSyncBrackets==='function') invalidateStandingsAndSyncBrackets(m.phaseId);
  // Guardar contexto ANTES de cerrar (closeLiveMatch lo pone a null).
  const _savedCtx = _liveCtx ? {..._liveCtx} : null;
  showToast(`Partido finalizado · ${ga}-${gb}`);
  closeLiveMatch();
  // Re-render forzado: esperamos 250ms para que Firestore propague el cambio
  // antes de releer (collection.get() puede servir datos de caché momentáneamente
  // si el onSnapshot todavía no procesó el write de live:false).
  if(_savedCtx){
    await new Promise(r=>setTimeout(r,250));
    try{
      if(_savedCtx.kind==='playoff'||_savedCtx.kind==='single'){
        const cid=document.querySelector('[id^="playoff-container-"]')?.id;
        if(cid) await renderPlayoff(_savedCtx.phaseId, cid, true);
      } else if(_savedCtx.kind==='bracket'){
        const cid=document.querySelector('[id^="bracket-container-"]')?.id;
        if(cid) await renderBracket(_savedCtx.phaseId, cid, true);
      } else if(_savedCtx.kind==='group' && typeof showMatchGroupTable==='function'){
        showMatchGroupTable(_savedCtx.phaseId, _savedCtx.groupIdx);
      }
    }catch(e){ console.error('[LiveMatch] re-render post-finalizar:', e); }
  }
}

/* Cancela el partido EN VIVO sin dejarlo como jugado. El partido y su
   registro de historial se tocan en un solo lote.
   - Cruce sin fecha asignada: se borra el documento (vuelve a «por jugar»).
   - Con fecha asignada en el Calendario, o en fase de grupos: se conserva el
     documento (fecha, hora y equipos) y solo se quita el marcador. Antes un
     cruce programado perdía su fecha al descartarlo. */
function liveDiscard(matchId){
  if(!_liveCanEdit()){ showToast('Cambia a modo administrador','error'); return; }
  return _lmEnqueue(async ()=>{
    const m = await _lmLiveDoc(matchId);
    if(!m) return;
    const hist = await dbGetAll('matchHistory', h=>h.matchRef===m.id);
    const score = `${m.goalsA||0}-${m.goalsB||0}`;
    const lost = hist.length
      ? `Se pierde el marcador (${score}) y su registro de historial.`
      : `Se pierde el marcador actual (${score}).`;
    const doDiscard = ()=>_lmEnqueue(async ()=>{
      const cur = await _lmLiveDoc(matchId);
      if(!cur) return;
      const curHist = await dbGetAll('matchHistory', h=>h.matchRef===cur.id);
      const histOps = curHist.map(h=>({type:'delete', store:'matchHistory', id:h.id}));
      const ops = (cur.slotId && !cur.scheduledDate)
        ? [...histOps, {type:'delete', store:'matches', id:cur.id}]
        : [{type:'set', store:'matches', data:{ ...cur, live:false, goalsA:null, goalsB:null, penA:null, penB:null, extraTime:false, liveStartAt:null, liveEndAt:null, playedAt:null }}, ...histOps];
      await dbWriteBatch(ops);
      if(typeof invalidateStandingsAndSyncBrackets==='function') invalidateStandingsAndSyncBrackets(cur.phaseId);
      showToast('Partido en vivo descartado');
      closeLiveMatch();
    }, 'No se pudo descartar el partido');
    showConfirm('¿Descartar partido en vivo?', `Se cancela el EN VIVO y el partido vuelve a «por jugar» (no queda como 0-0). ${lost}`, doDiscard);
  }, 'No se pudo descartar el partido');
}

function closeLiveMatch(){
  const el = document.getElementById('live-match-wrap');
  if(el) el.innerHTML='';
  _liveRefreshBackground();
  _liveCtx = null;
}
