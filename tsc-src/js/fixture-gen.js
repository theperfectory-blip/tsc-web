'use strict';
/* ============================================================
   GENERACIÓN AUTOMÁTICA DE FECHAS — fases tipo "groups"
   ------------------------------------------------------------
   Método del círculo (Berger): garantiza que cada par de equipos
   se cruce EXACTAMENTE una vez por vuelta. Nunca se repite rival,
   que es justo lo que el generador del PES 4 hace mal.

   Reglas que respeta (las mismas que valida a mano openRondaModal):
   - legs=1 → solo ida: cada cruce una única vez.
   - legs=2 → ida + vuelta con local/visita invertidos.
   - Grupo impar → equipo fantasma: quien lo "enfrenta" queda libre,
     exactamente un libre por equipo y por vuelta.

   Solo corre sobre grupos SIN partidos jugados ni en vivo: el botón
   se bloquea si hay resultados, y saveRonda sigue siendo la vía para
   editar a mano. Bracket/playoff/single no usan este módulo.
   ============================================================ */

function _fxEsc(v){ return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* Un partido bloquea la generación si ya se jugó o está en vivo. */
function _fxIsPlayed(m){ return !!m.live || (m.goalsA!=null && m.goalsB!=null); }

/* Fisher-Yates sobre una copia. */
function _fxShuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

/* ------------------------------------------------------------
   Método del círculo. Devuelve [{pairs:[{a,b}], libre:teamId|null}]
   con una entrada por fecha, en orden (fecha 1 = índice 0).

   N par  → N-1 fechas de N/2 partidos.
   N impar→ N fechas de (N-1)/2 partidos + 1 libre cada una.
   legs=2 → se anexa la vuelta espejo (local/visita invertidos).
   ------------------------------------------------------------ */
function fxBuildRoundRobin(teamIds, legs=1){
  const ids = _fxShuffle(teamIds.map(Number));
  if(ids.length < 2) return [];
  if(ids.length % 2 !== 0) ids.push(null); // fantasma → marca el equipo libre

  const n     = ids.length;
  const flip  = Math.random() < 0.5; // moneda global: no siempre el mismo lado abre de local
  const ida   = [];
  let rot     = ids.slice(1); // ids[0] queda fijo, rota el resto

  for(let r=0; r<n-1; r++){
    const line  = [ids[0], ...rot];
    const pairs = [];
    let libre   = null;

    for(let i=0; i<n/2; i++){
      let a = line[i], b = line[n-1-i];
      if(a===null || b===null){ libre = (a===null ? b : a); continue; }
      // El equipo fijo alternaría siempre de local: se invierte en fechas impares
      // para equilibrar local/visita. `flip` espeja todo el calendario.
      let swap = (i===0) ? (r%2===1) : false;
      if(flip) swap = !swap;
      if(swap) [a,b] = [b,a];
      pairs.push({a,b});
    }

    ida.push({pairs, libre});
    rot = [rot[rot.length-1], ...rot.slice(0,-1)];
  }

  if(parseInt(legs,10) !== 2) return ida;

  // Vuelta: mismos cruces, local y visita invertidos.
  const vuelta = ida.map(rd=>({
    pairs: rd.pairs.map(p=>({a:p.b, b:p.a})),
    libre: rd.libre
  }));
  return ida.concat(vuelta);
}

/* ------------------------------------------------------------
   Estado del grupo: por qué (o no) se puede generar.
   ------------------------------------------------------------ */
async function fxGroupLockReason(phaseId, groupIdx){
  const matches = await dbGetAll('matches', m=>m.phaseId===phaseId && m.groupIdx===groupIdx);
  const played  = matches.filter(_fxIsPlayed);
  if(played.length){
    const live = played.filter(m=>m.live).length;
    return live
      ? 'Hay un partido en vivo en este grupo'
      : `El grupo ya tiene ${played.length} partido(s) jugado(s) — bórralos para regenerar`;
  }
  return null;
}

/* ------------------------------------------------------------
   Modal
   ------------------------------------------------------------ */
async function openFixtureGenModal(phaseId, groupIdx){
  const phase = await dbGet('phases', phaseId);
  if(!phase) return;

  // Mismo guard que openRondaModal: no generar con cupos por referencia sin fijar.
  if(typeof resolveGroupRefsFor==='function' && (phase.groupRefs||[]).some(r=>parseInt(r.tGroup)===parseInt(groupIdx))){
    const entries = await resolveGroupRefsFor(phase, groupIdx);
    const pend = entries.filter(e=>e.teamId!=null && !(phase.groups?.[groupIdx]||[]).map(Number).includes(Number(e.teamId)));
    if(pend.length){
      const allT  = await dbGetAll('teams');
      const names = pend.map(e=>allT.find(t=>t.id===e.teamId)?.name||('#'+e.teamId)).join(', ');
      showConfirm('Fijar equipos por referencia',
        `Llegan por referencia y ya están definidos: ${names}. Para generar las fechas se fijarán al grupo (la tabla de origen ya no los cambiará). ¿Continuar?`,
        async ()=>{
          await materializeGroupRefs(phaseId, groupIdx);
          await showMatchGroupTable(phaseId, groupIdx);
          openFixtureGenModal(phaseId, groupIdx);
        });
      return;
    }
    if(entries.some(e=>e.teamId==null)){
      showToast('Hay cupos por referencia sin definir — completa el grupo antes de generar','error');
      return;
    }
  }

  const teamIds = (phase.groups?.[groupIdx]||[]).map(Number);
  if(teamIds.length < 2){ showToast('El grupo necesita al menos 2 equipos','error'); return; }

  const locked = await fxGroupLockReason(phaseId, groupIdx);
  if(locked){ showToast(locked,'error'); return; }

  const allTeams = await dbGetAll('teams');
  const teamById = {};
  allTeams.forEach(t=>teamById[t.id]=t);

  // Fechas vacías ya creadas: se reemplazan (no hay resultados que perder).
  const existing = await dbGetAll('matches', m=>m.phaseId===phaseId && m.groupIdx===groupIdx);

  window._fxState = {
    phaseId, groupIdx, teamIds, teamById,
    legs: parseInt(phase.config?.legs,10)||1,
    existingIds: existing.map(m=>m.id),
    existingRondas: [...new Set(existing.map(m=>m.ronda).filter(r=>r!=null))].length,
    rounds: null
  };
  fxShuffleAgain();
}

function fxShuffleAgain(){
  const st = window._fxState;
  if(!st) return;
  st.rounds = fxBuildRoundRobin(st.teamIds, st.legs);
  renderFixtureGenModal();
}

function renderFixtureGenModal(){
  const st = window._fxState;
  if(!st) return;
  let wrap = document.getElementById('fixture-gen-wrap');
  if(!wrap){ wrap=document.createElement('div'); wrap.id='fixture-gen-wrap'; document.body.appendChild(wrap); }

  const nameOf     = tid => st.teamById[tid]?.name || `Team ${tid}`;
  const totalGames = st.rounds.reduce((n,rd)=>n+rd.pairs.length, 0);
  const isOdd      = st.teamIds.length % 2 !== 0;

  const preview = st.rounds.map((rd, i)=>`
    <div style="padding:7px 10px;border-bottom:1px solid var(--brd);">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <span style="font-family:'Barlow Condensed';font-weight:700;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:var(--txt2);">Fecha ${i+1}</span>
        ${rd.libre!=null?`<span style="font-size:10px;color:var(--gold);">Libre: ${_fxEsc(nameOf(rd.libre))}</span>`:''}
      </div>
      ${rd.pairs.map(p=>`
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:center;font-size:12px;padding:1px 0;">
          <span style="text-align:right;">${_fxEsc(nameOf(p.a))}</span>
          <span style="color:var(--txt3);font-size:10px;">vs</span>
          <span>${_fxEsc(nameOf(p.b))}</span>
        </div>`).join('')}
    </div>`).join('');

  const replaceWarn = st.existingIds.length ? `
    <div style="margin-bottom:10px;padding:8px 10px;background:rgba(201,168,76,0.12);border:1px solid var(--gold-b);border-radius:var(--r);font-size:12px;color:var(--gold);display:flex;gap:6px;align-items:flex-start;">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <span>Se reemplazarán las ${st.existingRondas} fecha(s) vacía(s) que ya tiene el grupo. Ningún partido tiene resultado, así que no se pierde nada.</span>
    </div>` : '';

  wrap.innerHTML = `
  <div class="modal-overlay open">
    <div class="modal" style="max-width:520px;">
      <div class="modal-hdr">
        <div class="modal-title">Generar fechas · Grupo ${String.fromCharCode(65+st.groupIdx)}</div>
        <button class="modal-close" onclick="closeFixtureGenModal()">×</button>
      </div>
      <div class="modal-body">
        ${replaceWarn}
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--txt2);margin-bottom:10px;">
          <span><strong style="color:var(--txt);">${st.teamIds.length}</strong> equipos · <strong style="color:var(--txt);">${st.rounds.length}</strong> fechas · <strong style="color:var(--txt);">${totalGames}</strong> partidos</span>
          <span style="font-size:11px;color:var(--txt3);">${st.legs===2?'Ida y vuelta':'Solo ida'}${isOdd?' · 1 libre por fecha':''}</span>
        </div>
        <div style="padding:8px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);font-size:12px;color:var(--txt2);line-height:1.5;margin-bottom:10px;">
          Todos contra todos: cada equipo enfrenta a cada rival <strong style="color:var(--txt);">una sola vez</strong>${st.legs===2?' por vuelta':''}. Nadie repite rival y nadie juega dos veces la misma fecha.
        </div>
        <div style="max-height:300px;overflow-y:auto;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);">
          ${preview}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeFixtureGenModal()">Cancelar</button>
        <button class="btn" onclick="fxShuffleAgain()">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
          Barajar de nuevo
        </button>
        <button class="btn btn-primary" id="fx-save-btn" onclick="fxGenerate()">Generar ${st.rounds.length} fechas</button>
      </div>
    </div>
  </div>`;
}

function closeFixtureGenModal(){
  window._fxState = null;
  const el = document.getElementById('fixture-gen-wrap');
  if(el) el.innerHTML = '';
}

/* ------------------------------------------------------------
   Guardado
   ------------------------------------------------------------ */
async function fxGenerate(){
  const st = window._fxState;
  if(!st || !st.rounds?.length) return;
  const {phaseId, groupIdx} = st;

  const btn = document.getElementById('fx-save-btn');
  if(btn){ btn.disabled = true; btn.style.opacity = '0.5'; btn.textContent = 'Generando…'; }

  try{
    // Revalidar contra la DB: alguien pudo registrar un resultado con el modal abierto.
    const current = await dbGetAll('matches', m=>m.phaseId===phaseId && m.groupIdx===groupIdx);
    const locked  = current.filter(_fxIsPlayed);
    if(locked.length){
      showToast('El grupo ya tiene partidos jugados — no se generó nada','error');
      closeFixtureGenModal();
      await showMatchGroupTable(phaseId, groupIdx);
      return;
    }

    // Fuera las fechas vacías previas (sin resultados: no hay historial que limpiar).
    if(current.length) await dbDeleteMany('matches', current.map(m=>m.id));

    const items = [];
    st.rounds.forEach((rd, i)=>{
      rd.pairs.forEach(p=>items.push({
        phaseId, groupIdx,
        teamA:p.a, teamB:p.b,
        goalsA:null, goalsB:null,
        ronda:i+1,
        season:STATE.season,
        date:null,
      }));
    });
    await dbAddMany('matches', items);

    // rondaMeta: limpiar el grupo (libres y fechas programadas viejas) y grabar los libres nuevos.
    const phase = await dbGet('phases', phaseId);
    const meta  = {...(phase?.rondaMeta||{})};
    const mine  = new RegExp(`^${groupIdx}_\\d+(_date)?$`);
    Object.keys(meta).forEach(k=>{ if(mine.test(k)) delete meta[k]; });
    st.rounds.forEach((rd, i)=>{ if(rd.libre!=null) meta[`${groupIdx}_${i+1}`] = rd.libre; });
    await dbPut('phases', {...phase, rondaMeta:meta});

    // El navegador de fechas apuntaba a una ronda que ya no existe.
    delete window[`ronda_view_${phaseId}_${groupIdx}`];
    window._matchRondaActual = 1;
    invalidateStandingsCache(phaseId);

    showToast(`${st.rounds.length} fechas generadas · ${items.length} partidos`);
    closeFixtureGenModal();
    await showMatchGroupTable(phaseId, groupIdx);
  }catch(err){
    console.error('[fixture-gen]', err);
    showToast('Error al generar las fechas','error');
    if(btn){ btn.disabled = false; btn.style.opacity = ''; btn.textContent = `Generar ${st.rounds.length} fechas`; }
  }
}
