async function renderPlayoff(phaseId, containerId, isAdmin=false){
  const el=document.getElementById(containerId);
  if(!el) return;

  const phase=await dbGet('phases', phaseId);
  if(!phase){el.innerHTML='<div style="color:var(--txt3);">Fase no encontrada.</div>';return;}

  const config=phase.config||{};
  const matchups=config.matchups||3;
  const legsCount=parseInt(config.legs)||2;
  const awayGoal=config.awayGoal||false;
  const isSingle=phase.type==='single';

  const allMatches=await dbGetAll('matches',m=>m.phaseId===phaseId);
  const matchMap={};
  allMatches.forEach(m=>{matchMap[m.slotId]=m;});
  // ¿Hay algún partido EN VIVO en esta fase? Si lo hay, se ocultan los botones
  // "🔴 Vivo" de los demás cruces (solo puede haber uno en directo a la vez).
  const anyLiveInPhase = allMatches.some(m=>m.live);

  // Mapa de IDs a nombres para mostrar
  const allTeams = await dbGetAll('teams');
  const teamById = {};
  allTeams.forEach(t=>teamById[t.id]=t.name);

  // Slots del playoff
  const slots=phase.playoffSlots||Array(matchups).fill(null).map((_,i)=>({teamA:null,teamB:null}));

  // Referencias dinámicas para playoff (posición de grupos / ganador de llave).
  const slotRefs = phase.slotRefs||[];
  for(const ref of slotRefs){
    const idx = ref.slotIdx;
    if(!slots[idx]) continue;
    const team = await resolveSlotRef(ref);
    const label = await refLabel(ref);
    if(ref.side==='A'){
      slots[idx].teamA = team;
      slots[idx].refA = ref;
      slots[idx].labelA = label;
    } else {
      slots[idx].teamB = team;
      slots[idx].refB = ref;
      slots[idx].labelB = label;
    }
  }

  // Rellenar teamA/teamB desde matchMap si existen
  allMatches.forEach(m=>{
    const idx=m.matchIdx;
    if(slots[idx]){
      slots[idx].teamA=slots[idx].teamA||m.teamA;
      slots[idx].teamB=slots[idx].teamB||m.teamB;
    }
  });

  /* ── Vista pública de supercopa (tipo single, 1 cruce) ── */
  if(!isAdmin && isSingle){
    const slot=slots[0]||{teamA:null,teamB:null};
    const legDataSC=[];
    for(let leg=1;leg<=legsCount;leg++){
      const sid=`${phaseId}_m0_leg${leg}`;
      const saved=matchMap[sid];
      legDataSC.push(saved||{teamA:slot.teamA,teamB:slot.teamB,goalsA:null,goalsB:null});
    }
    const totA=legDataSC.reduce((s,l)=>s+(l.goalsA||0),0);
    const totB=legDataSC.reduce((s,l)=>s+(l.goalsB||0),0);
    const allPlayedSC=legDataSC.every(l=>l.goalsA!==null&&l.goalsB!==null);
    const decidingSC=legDataSC[legsCount-1];
    const penASC=decidingSC?.penA??null;
    const penBSC=decidingSC?.penB??null;
    let champSC=null;
    if(allPlayedSC){
      if(totA>totB) champSC=slot.teamA;
      else if(totB>totA) champSC=slot.teamB;
      else if(penASC!==null&&penBSC!==null&&penASC!==penBSC) champSC=penASC>penBSC?slot.teamA:slot.teamB;
    }

    const trophySVGsc='<svg viewBox="0 0 140 200" xmlns="http://www.w3.org/2000/svg" style="width:120px;height:170px;filter:drop-shadow(0 0 28px rgba(201,168,76,0.9));display:block;margin:0 auto;">'
      +'<defs>'
      +'<linearGradient id="tgasc" x1="0%" y1="0%" x2="60%" y2="100%"><stop offset="0%" stop-color="#FFF0A0"/><stop offset="30%" stop-color="#E8C84A"/><stop offset="65%" stop-color="#C9A030"/><stop offset="100%" stop-color="#8A6010"/></linearGradient>'
      +'<linearGradient id="tgbsc" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FFF0A0"/><stop offset="50%" stop-color="#C9A84C"/><stop offset="100%" stop-color="#705010"/></linearGradient>'
      +'</defs>'
      +'<rect x="28" y="185" width="84" height="11" rx="5" fill="url(#tgasc)"/>'
      +'<rect x="36" y="175" width="68" height="12" rx="4" fill="url(#tgbsc)"/>'
      +'<rect x="57" y="135" width="26" height="42" rx="6" fill="url(#tgasc)"/>'
      +'<ellipse cx="70" cy="136" rx="32" ry="8" fill="url(#tgbsc)"/>'
      +'<path d="M38 80 Q28 118 70 136 Q112 118 102 80 Z" fill="url(#tgasc)"/>'
      +'<path d="M48 80 Q40 112 70 128 Q100 112 92 80 Z" fill="url(#tgbsc)" opacity="0.5"/>'
      +'<ellipse cx="70" cy="80" rx="32" ry="9" fill="url(#tgasc)"/>'
      +'<ellipse cx="70" cy="34" rx="28" ry="8" fill="url(#tgasc)"/>'
      +'<path d="M42 34 L38 80 Q70 90 102 80 L98 34 Z" fill="url(#tgasc)" opacity="0.9"/>'
      +'<path d="M38 80 Q10 76 12 48 Q14 26 42 28" fill="none" stroke="url(#tgasc)" stroke-width="9" stroke-linecap="round"/>'
      +'<path d="M38 80 Q12 76 14 50 Q16 30 42 32" fill="none" stroke="url(#tgbsc)" stroke-width="4" stroke-linecap="round" opacity="0.6"/>'
      +'<path d="M102 80 Q130 76 128 48 Q126 26 98 28" fill="none" stroke="url(#tgasc)" stroke-width="9" stroke-linecap="round"/>'
      +'<path d="M102 80 Q128 76 126 50 Q124 30 98 32" fill="none" stroke="url(#tgbsc)" stroke-width="4" stroke-linecap="round" opacity="0.6"/>'
      +'<text x="70" y="100" text-anchor="middle" font-size="28" fill="rgba(0,0,0,0.18)" font-family="serif">★</text>'
      +'</svg>';

    const teamASC=slot.teamA||(slot.labelA||'Por definir');
    const teamBSC=slot.teamB||(slot.labelB||'Por definir');
    const hasBothSC=!!(slot.teamA&&slot.teamB);
    const hasAnySC=legDataSC.some(l=>l.goalsA!==null);

    const legRowsSC=legDataSC.map((ld,li)=>{
      const label=legsCount>1?(li===0?'Ida':'Vuelta'):'Partido';
      const sA=ld.goalsA!==null?ld.goalsA:'—';
      const sB=ld.goalsB!==null?ld.goalsB:'—';
      const aW=ld.goalsA!==null&&ld.goalsA>ld.goalsB;
      const bW=ld.goalsB!==null&&ld.goalsB>ld.goalsA;
      return `<div style="display:flex;align-items:center;justify-content:center;gap:10px;">
        <span style="font-size:12px;color:var(--txt3);min-width:44px;text-align:right;">${label}</span>
        <span style="font-family:'Bebas Neue';font-size:22px;color:${aW?'var(--gold)':'var(--txt)'};">${sA}</span>
        <span style="font-size:13px;color:var(--txt3);">-</span>
        <span style="font-family:'Bebas Neue';font-size:22px;color:${bW?'var(--gold)':'var(--txt)'};">${sB}</span>
      </div>`;
    }).join('');

    el.innerHTML=`
    <div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:24px 16px;">
      <div style="font-family:'Bebas Neue';font-size:28px;letter-spacing:6px;color:var(--gold);text-align:center;text-shadow:0 0 30px rgba(201,168,76,0.35);">${phase.name}</div>
      ${trophySVGsc}
      <div class="card" style="max-width:480px;width:100%;padding:20px 24px;box-sizing:border-box;">
        <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;${hasAnySC?'margin-bottom:16px;':''}">
          <div style="text-align:right;">
            <div style="font-size:16px;font-weight:${champSC===slot.teamA?'700':'500'};color:${champSC===slot.teamA?'var(--gold)':hasBothSC?'var(--txt)':'var(--txt3)'};">${teamASC}</div>
            ${champSC===slot.teamA?'<div style="font-size:11px;color:var(--gold);text-transform:uppercase;letter-spacing:2px;margin-top:3px;">✓ Campeón</div>':''}
          </div>
          <div style="font-family:\'Bebas Neue\';font-size:20px;color:var(--txt3);text-align:center;">vs</div>
          <div style="text-align:left;">
            <div style="font-size:16px;font-weight:${champSC===slot.teamB?'700':'500'};color:${champSC===slot.teamB?'var(--gold)':hasBothSC?'var(--txt)':'var(--txt3)'};">${teamBSC}</div>
            ${champSC===slot.teamB?'<div style="font-size:11px;color:var(--gold);text-transform:uppercase;letter-spacing:2px;margin-top:3px;">✓ Campeón</div>':''}
          </div>
        </div>
        ${hasAnySC?`<div style="display:flex;flex-direction:column;align-items:center;gap:8px;border-top:1px solid var(--brd);padding-top:14px;">
          ${legRowsSC}
          ${allPlayedSC&&legsCount>1?`<div style="font-size:13px;color:var(--txt3);margin-top:4px;">Total: <strong style="color:var(--txt);">${totA} – ${totB}</strong></div>`:''}
          ${penASC!==null?`<div style="font-size:12px;color:var(--txt3);">Penales: <strong style="color:var(--txt);">${penASC} – ${penBSC}</strong></div>`:''}
        </div>`:`<div style="text-align:center;color:var(--txt3);font-size:14px;padding-top:8px;border-top:1px solid var(--brd);">Partido por disputarse</div>`}
      </div>
      ${champSC?`<div style="text-align:center;margin-top:4px;">
        <div style="font-family:'Barlow Condensed';font-size:13px;letter-spacing:4px;color:var(--gold);text-transform:uppercase;">Campeón</div>
        <div style="font-family:'Bebas Neue';font-size:40px;letter-spacing:2px;color:var(--txt);line-height:1.1;">${champSC}</div>
      </div>`:''}
    </div>`;

    if(champSC){
      const elRect=el.getBoundingClientRect();
      const isVisible=elRect.width>0&&elRect.height>0&&elRect.top<window.innerHeight;
      if(!window._fwLaunched) window._fwLaunched={};
      if(isVisible&&!window._fwLaunched[phaseId]){
        window._fwLaunched[phaseId]=true;
        // champSC puede ser ID (number) o nombre (legacy)
        const champTeam=(typeof champSC==='number' || Number.isFinite(parseInt(champSC)))
          ? (await dbGet('teams', parseInt(champSC))) || {}
          : ((await dbGetAll('teams', t=>t.name===champSC))[0] || {});
        setTimeout(()=>{
          window.launchChampionFireworks({
            primary:champTeam.color||'#C9A84C',
            secondary:champTeam.color2||champTeam.color||'#FFD86B',
          });
        },800);
      }
    }
    return;
  }

  let html=`<div style="display:flex;flex-direction:column;gap:10px;">`;

  slots.forEach((slot,i)=>{
    const legData=[];
    for(let leg=1;leg<=legsCount;leg++){
      const sid=`${phaseId}_m${i}_leg${leg}`;
      const saved=matchMap[sid];
      legData.push(saved||{teamA:slot.teamA,teamB:slot.teamB,goalsA:null,goalsB:null,slotId:sid});
    }

    // Calcular totales de serie
    const totA=legData.reduce((s,l)=>s+(l.goalsA||0),0);
    const totB=legData.reduce((s,l)=>s+(l.goalsB||0),0);
    // Un leg EN VIVO no cierra la serie (no se corona ganador hasta finalizar).
    const anyLegLive=legData.some(l=>l.live);
    const allPlayed=!anyLegLive && legData.every(l=>l.goalsA!==null && l.goalsB!==null);
    const decidingLeg = legData[legsCount-1];
    const penA = decidingLeg?.penA ?? null;
    const penB = decidingLeg?.penB ?? null;

    let winner = null;
    let awayA = 0, awayB = 0;
    let decidedBy = '';
    if(allPlayed){
      if(totA>totB){
        winner = slot.teamA;
        decidedBy = 'global';
      } else if(totB>totA){
        winner = slot.teamB;
        decidedBy = 'global';
      } else if(awayGoal && legsCount>=2){
        // Convención: en ida teamA es local, en vuelta teamB es local.
        awayA = (legData[1]?.goalsA ?? 0); // goles de visita de A en la vuelta
        awayB = (legData[0]?.goalsB ?? 0); // goles de visita de B en la ida
        if(awayA>awayB){
          winner = slot.teamA;
          decidedBy = 'away';
        } else if(awayB>awayA){
          winner = slot.teamB;
          decidedBy = 'away';
        }
      }
      if(!winner && penA!==null && penB!==null && penA!==penB){
        winner = penA>penB ? slot.teamA : slot.teamB;
        decidedBy = 'pen';
      }
    }

    const legHtml=legData.map((ld,li)=>{
      const ldTeamAName = ld.teamA ? (teamById[ld.teamA] || (typeof ld.teamA==='string'?ld.teamA:'')) : '';
      const ldTeamBName = ld.teamB ? (teamById[ld.teamB] || (typeof ld.teamB==='string'?ld.teamB:'')) : '';
      const legNo = li+1;
      const isLegLive = !!ld.live;
      const bothTeams = slot.teamA && slot.teamB;
      // La vuelta solo se puede jugar cuando la ida ya terminó (no en vivo y con resultado).
      const prevLegDone = (li===0) || (legData[li-1] && legData[li-1].goalsA!==null && legData[li-1].goalsB!==null && !legData[li-1].live);
      // En vivo (admin) abre el centro; si no, el editor de leg.
      const clickAttr = (isAdmin && isLegLive && ld.id!=null) ? `openLiveMatch(${ld.id})`
        : (isAdmin && bothTeams && (ld.teamA&&ld.teamB)) ? `openPlayoffLegModal('${phaseId}','${ld.slotId}',${i},${legNo},'${ldTeamAName.replace(/'/g,"\\'")}','${ldTeamBName.replace(/'/g,"\\'")}',${isAdmin})` : '';
      const sa = ld.goalsA!==null?ld.goalsA:'-', sb = ld.goalsB!==null?ld.goalsB:'-';
      const colA = isLegLive?'var(--red)':(ld.goalsA!==null&&ld.goalsA>ld.goalsB?'var(--gold)':'var(--txt)');
      const colB = isLegLive?'var(--red)':(ld.goalsB!==null&&ld.goalsB>ld.goalsA?'var(--gold)':'var(--txt)');
      return `
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <span style="font-size:12px;color:var(--txt3);min-width:32px;">${legsCount>1?(li===0?'Ida':'Vuelta'):'Partido'}</span>
        <div ${isLegLive?'class="live-border"':''} style="display:flex;align-items:center;gap:6px;background:${isLegLive?'rgba(239,68,68,0.1)':'var(--card2)'};border:${isLegLive?'2px':'1px'} solid ${isLegLive?'var(--red)':'var(--brd)'};border-radius:var(--r);padding:4px 10px;cursor:${clickAttr?'pointer':'default'};"
          ${clickAttr?`onclick="${clickAttr}"`:''}>
          <span style="font-size:14px;font-weight:${ld.goalsA!==null&&ld.goalsA>ld.goalsB?'700':'400'};color:${colA};">${sa}</span>
          <span style="font-size:13px;color:var(--txt3);">-</span>
          <span style="font-size:14px;font-weight:${ld.goalsB!==null&&ld.goalsB>ld.goalsA?'700':'400'};color:${colB};">${sb}</span>
        </div>
        ${isLegLive?'<span style="display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:0.5px;"><span class="live-dot live-dot-red" style="width:6px;height:6px;"></span>Vivo</span>':''}
        ${(isAdmin && !anyLiveInPhase && !isLegLive && bothTeams && prevLegDone && (ld.goalsA===null || ld.goalsB===null))
          ? `<button onclick="event.stopPropagation();startLivePlayoffLeg('${phaseId}','${ld.slotId}',${i},${legNo},${JSON.stringify(slot.teamA)},${JSON.stringify(slot.teamB)})" style="font-size:9px;padding:2px 6px;background:rgba(239,68,68,0.12);border:1px solid var(--red);border-radius:3px;color:var(--red);cursor:pointer;">🔴 Vivo</button>`
          : (isAdmin && !anyLiveInPhase && !isLegLive && bothTeams && li>0 && !prevLegDone)
          ? `<span style="font-size:9px;color:var(--txt3);font-style:italic;">termina la ida primero</span>`
          : ''}
      </div>`;
    }).join('');

    const teamAName = slot.teamA ? (teamById[slot.teamA] || slot.labelA || 'Por definir') : (slot.labelA||'Por definir');
    const teamBName = slot.teamB ? (teamById[slot.teamB] || slot.labelB || 'Por definir') : (slot.labelB||'Por definir');
    const teamAIni = (teamById[slot.teamA] || slot.labelA || '').substring(0,3).toUpperCase() || '?';
    const teamBIni = (teamById[slot.teamB] || slot.labelB || '').substring(0,3).toUpperCase() || '?';

    // Construir marcador con penales si aplica: "3(5)" o solo "3"
    const scoreA = allPlayed ? (decidedBy==='pen' ? `${totA}(${penA})` : `${totA}`) : null;
    const scoreB = allPlayed ? (decidedBy==='pen' ? `${totB}(${penB})` : `${totB}`) : null;

    // Indicador de cómo ganó: '✓v' = gol de visita, '✓' = global/penales
    const winBadgeA = winner===slot.teamA
      ? `<span style="font-family:'Bebas Neue';font-size:13px;color:var(--gold);letter-spacing:0.5px;">${decidedBy==='away'?'✓v':'✓'}</span>` : '';
    const winBadgeB = winner===slot.teamB
      ? `<span style="font-family:'Bebas Neue';font-size:13px;color:var(--gold);letter-spacing:0.5px;">${decidedBy==='away'?'✓v':'✓'}</span>` : '';

    const wA = winner===slot.teamA, wB = winner===slot.teamB;

    html+=`
    <div class="card">
      <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;padding:12px 14px;">

        <!-- Equipo A: logo | nombre | goles ✓ -->
        <div style="display:flex;align-items:center;gap:7px;">
          <div style="width:28px;height:28px;border-radius:50%;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--txt2);flex-shrink:0;" id="plogo-${phaseId}-${i}-a">${teamAIni}</div>
          <span style="font-size:15px;font-weight:${wA?'700':'400'};color:${wA?'var(--gold)':'var(--txt)'};">${teamAName}</span>
          ${scoreA!==null?`<span style="font-family:'Bebas Neue';font-size:20px;color:${wA?'var(--gold)':'var(--txt2)'};">${scoreA}</span>`:''}
          ${winBadgeA}
        </div>

        <!-- Centro: ida/vuelta + aviso de empate si falta decidir -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:5px;">
          ${legHtml}
          ${allPlayed&&totA===totB&&!winner?`<div style="font-size:10px;color:var(--yellow);text-align:center;">Define por ${awayGoal&&legsCount>=2?'visita o ':''}penales</div>`:''}
          ${isAdmin?(isSingle
            ?`<button class="btn btn-xs" onclick="openSupercopaTeamAssign(${phaseId},${i})" style="font-size:11px;margin-top:4px;">✎ Asignar equipos</button>`
            :`<div style="display:flex;gap:6px;margin-top:2px;">
              <button class="btn btn-xs" onclick="openSlotRefModal(${phaseId},${i},'A','playoff')" style="font-size:10px;opacity:0.75;">Ref A</button>
              <button class="btn btn-xs" onclick="openSlotRefModal(${phaseId},${i},'B','playoff')" style="font-size:10px;opacity:0.75;">Ref B</button>
            </div>`)
          :''}
        </div>

        <!-- Equipo B: ✓ goles | nombre | logo -->
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:7px;">
          ${winBadgeB}
          ${scoreB!==null?`<span style="font-family:'Bebas Neue';font-size:20px;color:${wB?'var(--gold)':'var(--txt2)'};">${scoreB}</span>`:''}
          <span style="font-size:15px;font-weight:${wB?'700':'400'};color:${wB?'var(--gold)':'var(--txt)'};">${teamBName}</span>
          <div style="width:28px;height:28px;border-radius:50%;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--txt2);flex-shrink:0;" id="plogo-${phaseId}-${i}-b">${teamBIni}</div>
        </div>
      </div>
    </div>`;
  });

  html+=`</div>`;
  el.innerHTML=html;

  // Logos async
  setTimeout(async()=>{
    for(let i=0;i<slots.length;i++){
      for(const side of ['a','b']){
        const teamId=side==='a'?slots[i].teamA:slots[i].teamB;
        if(!teamId) continue;
        const team=allTeams.find(t=>t.id===teamId);
        if(team?.logo){
          const el=document.getElementById(`plogo-${phaseId}-${i}-${side}`);
          if(el) el.innerHTML=`<img src="${team.logo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        }
      }
    }
  },100);
}

/* ----------------------------------------------------------
   MODAL LEG DE PLAYOFF
   ---------------------------------------------------------- */
async function openPlayoffLegModal(phaseId, slotId, matchIdx, leg, teamA, teamB, isAdmin){
  if(!isAdmin) return;
  const existing=await dbGetAll('matches',m=>m.slotId===slotId&&m.phaseId===parseInt(phaseId));
  const cur=existing[0];

  let wrap=document.getElementById('playoff-leg-wrap');
  if(!wrap){wrap=document.createElement('div');wrap.id='playoff-leg-wrap';document.body.appendChild(wrap);}

  const phase=await dbGet('phases',parseInt(phaseId));
  const legsCount=parseInt(phase?.config?.legs)||2;
  const canSetPenalties = (leg===legsCount); // penales solo en partido decisivo de la serie

  wrap.innerHTML=`
  <div class="modal-overlay open">
    <div class="modal" style="max-width:340px;">
      <div class="modal-hdr">
        <div class="modal-title">${legsCount>1?(leg===1?'Partido de ida':'Partido de vuelta'):'Partido'}</div>
        <button class="modal-close" onclick="closePlayoffLegModal()">×</button>
      </div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;margin-bottom:6px;">
          <div style="font-size:14px;font-weight:600;text-align:center;">${teamA}</div>
          <div style="font-family:'Bebas Neue';font-size:19px;color:var(--txt3);">vs</div>
          <div style="font-size:14px;font-weight:600;text-align:center;">${teamB}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;">
          <input type="number" id="pl-ga" min="0" value="${cur?.goalsA??0}"
            style="padding:12px;text-align:center;font-family:'Bebas Neue';font-size:34px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);width:100%;">
          <div style="font-family:'Bebas Neue';font-size:26px;color:var(--txt3);">-</div>
          <input type="number" id="pl-gb" min="0" value="${cur?.goalsB??0}"
            style="padding:12px;text-align:center;font-family:'Bebas Neue';font-size:34px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);width:100%;">
        </div>
        ${canSetPenalties?`
        <div style="margin-top:10px;">
          <div style="font-size:12px;color:var(--txt3);text-transform:uppercase;letter-spacing:0.7px;margin-bottom:5px;">Penales (si persiste empate en la serie)</div>
          <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;">
            <input type="number" id="pl-pa" min="0" placeholder="-" value="${cur?.penA??''}"
              style="padding:8px;text-align:center;font-family:'Bebas Neue';font-size:24px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);width:100%;">
            <div style="font-family:'Bebas Neue';font-size:20px;color:var(--txt3);">-</div>
            <input type="number" id="pl-pb" min="0" placeholder="-" value="${cur?.penB??''}"
              style="padding:8px;text-align:center;font-family:'Bebas Neue';font-size:24px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);width:100%;">
          </div>
        </div>`:''}
      </div>
      <div class="modal-footer" style="justify-content:space-between;">
        ${cur?`<button class="btn btn-danger btn-sm" onclick="closePlayoffLegModal();deletePlayoffLeg('${phaseId}','${slotId}',${matchIdx},${leg})">🗑 Borrar</button>`:'<div></div>'}
        <div style="display:flex;gap:8px;">
          <button class="btn" onclick="closePlayoffLegModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="savePlayoffLeg('${phaseId}','${slotId}',${matchIdx},${leg},'${teamA.replace(/'/g,"\\'")}','${teamB.replace(/'/g,"\\'")}')">Guardar</button>
        </div>
      </div>
    </div>
  </div>`;
}

function closePlayoffLegModal(){
  const el=document.getElementById('playoff-leg-wrap');
  if(el) el.innerHTML='';
}

async function deletePlayoffLeg(phaseId, slotId, matchIdx, leg){
  showConfirm('¿Eliminar resultado?','Se borrará el resultado guardado de este partido del playoff.', async()=>{
    const matches = await dbGetAll('matches', m=>m.slotId===slotId && m.phaseId===parseInt(phaseId));
    for(const m of matches){
      await removeHistoryByMatchRef(m.id);
      await dbDelete('matches', m.id);
    }
    closePlayoffLegModal();
    showToast(`${leg===1?'Ida':'Vuelta'} eliminada`);
    const cid=document.querySelector('[id^="playoff-container-"]')?.id;
    if(cid) renderPlayoff(parseInt(phaseId), cid, true);
  });
}

async function savePlayoffLeg(phaseId, slotId, matchIdx, leg, teamA, teamB){
  const ga=parseInt(document.getElementById('pl-ga').value)||0;
  const gb=parseInt(document.getElementById('pl-gb').value)||0;
  const paRaw=document.getElementById('pl-pa')?.value;
  const pbRaw=document.getElementById('pl-pb')?.value;
  const pa=(paRaw===''||paRaw==null)?null:(parseInt(paRaw)||0);
  const pb=(pbRaw===''||pbRaw==null)?null:(parseInt(pbRaw)||0);
  const existing=await dbGetAll('matches',m=>m.slotId===slotId&&m.phaseId===parseInt(phaseId));
  if((pa===null)!==(pb===null)){ showToast('Completa ambos campos de penales','error'); return; }
  if(pa!==null && pb!==null && pa===pb){ showToast('En penales debe haber un ganador','error'); return; }
  const data={slotId,phaseId:parseInt(phaseId),teamA,teamB,goalsA:ga,goalsB:gb,penA:pa,penB:pb,matchIdx,leg,season:STATE.season,date:new Date().toISOString()};
  let savedId;
  const sameLeg = existing.find(m=>m.leg===leg);
  if(sameLeg){
    savedId = sameLeg.id;
    await dbPut('matches',{...sameLeg,...data});
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
  showToast(`${nameA} ${ga}-${gb}${penStr} ${nameB} (${leg===1?'ida':'vuelta'})`);
  closePlayoffLegModal();
  const cid=document.querySelector('[id^="playoff-container-"]')?.id;
  if(cid) renderPlayoff(parseInt(phaseId), cid, true);
}

/* ----------------------------------------------------------
   ASIGNACIÓN MANUAL DE EQUIPOS A PLAYOFF
   ---------------------------------------------------------- */
/* ==========================================================
   v1.8: Modal de asignación de equipos en playoff
   - Organiza equipos por pools de origen:
     1) Zonas de fases de grupos (cualquier comp activa de la temporada)
     2) Ganadores de cualquier fase tipo playoff/bracket previa
     3) Lista completa de equipos activos (libre)
   - Sin auto-magia: el admin elige a mano qué equipo va a cada slot.
   ========================================================== */
async function openPlayoffTeamAssign(phaseId, matchIdx){
  const phase=await dbGet('phases',phaseId);
  const slots=phase?.playoffSlots||[];
  const cur=slots[matchIdx]||{};

  // ── Construir pools disponibles ────────────────────────────
  const pools = await buildPlayoffPools(phaseId);

  // Generar HTML de optgroups. `selected` puede ser ID number o string legacy.
  const buildOpts = (selected) => {
    const selStr = selected==null ? '' : String(selected);
    let html = `<option value="">— Seleccionar —</option>`;
    pools.forEach(pool=>{
      if(!pool.options.length) return;
      html += `<optgroup label="${pool.label}">`;
      pool.options.forEach(opt=>{
        const sel = String(opt.value)===selStr ? ' selected' : '';
        html += `<option value="${String(opt.value).replace(/"/g,'&quot;')}"${sel}>${opt.label}</option>`;
      });
      html += `</optgroup>`;
    });
    return html;
  };

  let wrap=document.getElementById('playoff-assign-wrap');
  if(!wrap){wrap=document.createElement('div');wrap.id='playoff-assign-wrap';document.body.appendChild(wrap);}

  wrap.innerHTML=`
  <div class="modal-overlay open">
    <div class="modal" style="max-width:480px;">
      <div class="modal-hdr">
        <div class="modal-title">Asignar equipos · Cruce ${matchIdx+1}</div>
        <button class="modal-close" onclick="closePlayoffAssignModal()">×</button>
      </div>
      <div class="modal-body">
        <div style="font-size:12px;color:var(--txt2);background:var(--card2);border-left:2px solid var(--gold);border-radius:var(--r);padding:7px 10px;margin-bottom:12px;line-height:1.5;">
          Los equipos están agrupados por origen: zonas de fases de grupos, ganadores de playoffs/brackets previos, y todos los equipos activos.
        </div>
        <div class="form-group">
          <label>Equipo A (local)</label>
          <select id="pa-ta" style="width:100%;padding:7px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);">
            ${buildOpts(cur.teamA)}
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label>Equipo B (visitante)</label>
          <select id="pa-tb" style="width:100%;padding:7px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);">
            ${buildOpts(cur.teamB)}
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closePlayoffAssignModal()">Cancelar</button>
        ${(cur.teamA||cur.teamB)?`<button class="btn btn-danger" onclick="clearPlayoffAssign(${phaseId},${matchIdx})">Limpiar</button>`:''}
        <button class="btn btn-primary" onclick="savePlayoffAssign(${phaseId},${matchIdx})">Guardar</button>
      </div>
    </div>
  </div>`;
}

// Construye los pools de equipos disponibles para asignar en un playoff
async function buildPlayoffPools(currentPhaseId){
  const pools = [];
  const allTeams = await dbGetAll('teams', t=>t.status==='ACTIVO');
  const teamNameById = Object.fromEntries((await dbGetAll('teams')).map(t=>[t.id, t.name]));
  const nameOf = (id)=> teamNameById[id] ?? `#${id}`;

  const currentPhase = await dbGet('phases', currentPhaseId);
  const season = currentPhase?.season || STATE.season;

  const allPhases = await dbGetAll('phases', p=>(p.season===season||!p.season));
  const allComps = await dbGetAll('competitions');
  const groupPhases = allPhases.filter(p=>p.type==='groups' && p.id!==currentPhaseId && p.compId===currentPhase?.compId);

  for(const gp of groupPhases){
    const comp = allComps.find(c=>c.id===gp.compId);
    const compName = comp?.name || '';
    const groups = gp.groups||{};
    const zones = gp.zones||[];
    if(!zones.length) continue;

    // Calcular standings actuales para ordenar por mérito
    const phaseMatches = await dbGetAll('matches', m=>m.phaseId===gp.id);
    const standingsByGroup = {};
    Object.entries(groups).forEach(([gi, teamIds])=>{
      const groupMatches = phaseMatches.filter(m=>m.groupIdx===parseInt(gi));
      standingsByGroup[gi] = calcGroupStandings((teamIds||[]).filter(t=>t!=null), groupMatches, ['pts','dg','gf'], groupMatches);
    });

    for(const zone of zones){
      const teamsInZone = [];
      Object.entries(zone.positions||{}).forEach(([gi, idxArr])=>{
        const standings = standingsByGroup[gi]||[];
        idxArr.forEach(idx=>{
          const team = standings[idx];
          if(team){
            teamsInZone.push({
              id: team.id,                            // ID del equipo (number)
              name: nameOf(team.id),                  // resuelto al render
              groupLabel: 'G'+String.fromCharCode(65+parseInt(gi)),
              position: idx+1
            });
          }
        });
      });
      if(!teamsInZone.length) continue;
      teamsInZone.sort((a,b)=>a.position-b.position || a.groupLabel.localeCompare(b.groupLabel));
      pools.push({
        label: `${compName} → ${zone.name}`,
        options: teamsInZone.map(t=>({
          value: String(t.id),
          label: `${t.position}° ${t.groupLabel} · ${t.name}`
        }))
      });
    }
  }

  const playoffPhases = allPhases.filter(p=>p.type==='playoff' && p.id!==currentPhaseId);
  for(const pp of playoffPhases){
    const winners = await getPlayoffWinnersFromPhase(pp.id);
    if(!winners.length) continue;
    const comp = allComps.find(c=>c.id===pp.compId);
    pools.push({
      label: `${comp?.name||''} → Ganadores: ${pp.name}`,
      options: winners.map((w,i)=>({
        value: String(w),                                // w es ID
        label: `Ganador cruce ${i+1} · ${nameOf(w)}`
      }))
    });
  }

  const bracketPhases = allPhases.filter(p=>p.type==='bracket' && p.id!==currentPhaseId);
  for(const bp of bracketPhases){
    const winners = await getBracketWinners(bp.id);
    if(!winners.length) continue;
    const comp = allComps.find(c=>c.id===bp.compId);
    pools.push({
      label: `${comp?.name||''} → Resultados: ${bp.name}`,
      options: winners
    });
  }

  pools.push({
    label: 'Todos los equipos activos',
    options: allTeams
      .map(t=>({value: String(t.id), label: t.name}))
      .sort((a,b)=>a.label.localeCompare(b.label))
  });

  return pools;
}

// Helper: ganadores de un bracket (campeón, finalista, semifinalistas)
async function getBracketWinners(bracketPhaseId){
  const phase = await dbGet('phases', bracketPhaseId);
  if(!phase) return [];
  const config = phase.config||{};
  const totalTeams = config.teams||8;
  const rounds = buildBracketRounds(totalTeams);
  const matches = await dbGetAll('matches', m=>m.phaseId===bracketPhaseId);
  const matchMap = {};
  matches.forEach(m=>{matchMap[m.slotId]=m;});
  const slots = await buildBracketSlots(phase, rounds, matchMap);

  // Resolver IDs → nombres para los labels
  const teamNameById = Object.fromEntries((await dbGetAll('teams')).map(t=>[t.id, t.name]));
  const nameOf = (v)=> teamNameById[v] ?? (typeof v==='string' ? v : `#${v}`);

  const out = [];
  const finalSlot = slots[rounds.length-1]?.[0];
  if(finalSlot){
    const champ = getWinner(finalSlot);
    if(champ!=null) out.push({value: String(champ), label:`Campeón · ${nameOf(champ)}`});
    const sub = finalSlot.teamA===champ ? finalSlot.teamB : finalSlot.teamA;
    if(sub!=null) out.push({value: String(sub), label:`Subcampeón · ${nameOf(sub)}`});
  }
  if(rounds.length>=2){
    const semiSlots = slots[rounds.length-2]||[];
    semiSlots.forEach((s)=>{
      const w = getWinner(s);
      if(s.teamA && s.teamB && w!=null){
        const loser = s.teamA===w ? s.teamB : s.teamA;
        if(loser!=null) out.push({value: String(loser), label:`Semifinalista · ${nameOf(loser)}`});
      }
    });
  }
  return out;
}

async function clearPlayoffAssign(phaseId, matchIdx){
  if(!confirm('¿Limpiar este cruce? Se borrarán equipos, referencias y resultados de la llave.')) return;
  const phase=await dbGet('phases',phaseId);
  const slots=phase?.playoffSlots||[];
  if(slots[matchIdx]) slots[matchIdx]={teamA:null,teamB:null};
  const refs=(phase?.slotRefs||[]).filter(r=>r.slotIdx!==matchIdx);
  await dbPut('phases',{...phase,playoffSlots:slots,slotRefs:refs});

  // Borrar partidos de la llave para evitar que reaparezcan desde matchMap.
  const matches=await dbGetAll('matches',m=>m.phaseId===phaseId && m.matchIdx===matchIdx);
  for(const m of matches){ await dbDelete('matches', m.id); }

  showToast('Cruce limpiado');
  closePlayoffAssignModal();
  const cid=document.querySelector('[id^="playoff-container-"]')?.id;
  if(cid) renderPlayoff(phaseId, cid, true);
}

function closePlayoffAssignModal(){
  const el=document.getElementById('playoff-assign-wrap');
  if(el) el.innerHTML='';
}

async function savePlayoffAssign(phaseId, matchIdx){
  // Los <option> ahora usan IDs como value: convertir a Number.
  const taRaw=document.getElementById('pa-ta').value;
  const tbRaw=document.getElementById('pa-tb').value;
  if(!taRaw||!tbRaw){showToast('Selecciona ambos equipos','error');return;}
  if(taRaw===tbRaw){showToast('Los equipos deben ser distintos','error');return;}
  const ta = Number.isFinite(parseInt(taRaw)) ? parseInt(taRaw) : taRaw;
  const tb = Number.isFinite(parseInt(tbRaw)) ? parseInt(tbRaw) : tbRaw;
  const phase=await dbGet('phases',phaseId);
  const slots=phase?.playoffSlots||Array(phase?.config?.matchups||3).fill(null).map(()=>({teamA:null,teamB:null}));
  const prev = slots[matchIdx]||{};
  const changed = prev.teamA!==ta || prev.teamB!==tb;
  slots[matchIdx]={teamA:ta,teamB:tb};

  // Si se asigna manualmente, esta llave deja de depender de refs dinámicas.
  const refs=(phase?.slotRefs||[]).filter(r=>r.slotIdx!==matchIdx);

  // Si cambian equipos, limpiar resultados previos de la llave para evitar mezcla de series.
  if(changed){
    const oldMatches=await dbGetAll('matches',m=>m.phaseId===phaseId && m.matchIdx===matchIdx);
    for(const m of oldMatches){ await dbDelete('matches', m.id); }
  }

  await dbPut('phases',{...phase,playoffSlots:slots,slotRefs:refs});
  showToast('Equipos asignados');
  closePlayoffAssignModal();
  const cid=document.querySelector('[id^="playoff-container-"]')?.id;
  if(cid) renderPlayoff(phaseId, cid, true);
}

/* ----------------------------------------------------------
   SUPERCOPA — asignación simple de equipos activos
   ---------------------------------------------------------- */
async function openSupercopaTeamAssign(phaseId, matchIdx){
  const phase=await dbGet('phases',parseInt(phaseId));
  const slots=phase?.playoffSlots||[];
  const cur=slots[matchIdx]||{};

  const activeTeams=await dbGetAll('teams',t=>t.status==='ACTIVO');
  activeTeams.sort((a,b)=>a.name.localeCompare(b.name));

  const teamOpts=(selected)=>{
    const selStr = selected==null ? '' : String(selected);
    return `<option value="">— Seleccionar —</option>`+
      activeTeams.map(t=>`<option value="${t.id}" ${String(t.id)===selStr?'selected':''}>${t.name}</option>`).join('');
  };

  let wrap=document.getElementById('supercopa-assign-wrap');
  if(!wrap){wrap=document.createElement('div');wrap.id='supercopa-assign-wrap';document.body.appendChild(wrap);}

  wrap.innerHTML=`
  <div class="modal-overlay open">
    <div class="modal" style="max-width:380px;">
      <div class="modal-hdr">
        <div class="modal-title">Asignar equipos</div>
        <button class="modal-close" onclick="closeSupercopaAssignModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Equipo A (local)</label>
          <select id="sc-ta" style="width:100%;padding:8px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);">
            ${teamOpts(cur.teamA)}
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label>Equipo B (visitante)</label>
          <select id="sc-tb" style="width:100%;padding:8px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);">
            ${teamOpts(cur.teamB)}
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeSupercopaAssignModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveSupercopaAssign(${phaseId},${matchIdx})">Guardar</button>
      </div>
    </div>
  </div>`;
}

function closeSupercopaAssignModal(){
  const el=document.getElementById('supercopa-assign-wrap');
  if(el) el.innerHTML='';
}

async function saveSupercopaAssign(phaseId, matchIdx){
  const taRaw=document.getElementById('sc-ta').value;
  const tbRaw=document.getElementById('sc-tb').value;
  if(!taRaw||!tbRaw){showToast('Selecciona ambos equipos','error');return;}
  if(taRaw===tbRaw){showToast('Los equipos deben ser distintos','error');return;}
  const ta = Number.isFinite(parseInt(taRaw)) ? parseInt(taRaw) : taRaw;
  const tb = Number.isFinite(parseInt(tbRaw)) ? parseInt(tbRaw) : tbRaw;

  const phase=await dbGet('phases',phaseId);
  const slots=phase?.playoffSlots||Array(phase?.config?.matchups||1).fill(null).map(()=>({teamA:null,teamB:null}));
  const prev=slots[matchIdx]||{};
  const changed=prev.teamA!==ta||prev.teamB!==tb;
  slots[matchIdx]={teamA:ta,teamB:tb};

  const refs=(phase?.slotRefs||[]).filter(r=>r.slotIdx!==matchIdx);
  if(changed){
    const oldMatches=await dbGetAll('matches',m=>m.phaseId===phaseId&&m.matchIdx===matchIdx);
    for(const m of oldMatches) await dbDelete('matches',m.id);
  }

  await dbPut('phases',{...phase,playoffSlots:slots,slotRefs:refs});
  showToast('Equipos asignados');
  closeSupercopaAssignModal();
  const cid=document.querySelector('[id^="playoff-container-"]')?.id;
  if(cid) renderPlayoff(parseInt(phaseId),cid,true);
}

async function getPlayoffWinnersFromPhase(sourcePhaseId){
  const phase=await dbGet('phases',sourcePhaseId);
  const matches=await dbGetAll('matches',m=>m.phaseId===sourcePhaseId);
  const slots=phase?.playoffSlots||[];
  const config=phase?.config||{};
  const legsCount=parseInt(config.legs)||2;
  const awayGoal=!!config.awayGoal;

  const maxIdx = Math.max(
    (slots.length?slots.length-1:0),
    ...matches.map(m=>parseInt(m.matchIdx)).filter(Number.isFinite)
  );

  // Por compatibilidad con UI: devolver array alineado a matchIdx (pero filtramos nulos al final)
  const winners = Array.from({length:Math.max(0,maxIdx+1)},(_,i)=>{
    const legMatches = matches.filter(m=>parseInt(m.matchIdx)===i);
    if(!legMatches.length) return null;

    const slot = slots[i] || null;
    const teamA = slot?.teamA || legMatches[0].teamA;
    const teamB = slot?.teamB || legMatches[0].teamB;
    if(!teamA || !teamB) return null;

    const totA = legMatches.reduce((s,m)=>s + (m.teamA===teamA ? m.goalsA : (m.teamB===teamA ? m.goalsB : 0)), 0);
    const totB = legMatches.reduce((s,m)=>s + (m.teamA===teamB ? m.goalsA : (m.teamB===teamB ? m.goalsB : 0)), 0);

    if(totA>totB) return teamA;
    if(totB>totA) return teamB;

    if(awayGoal && legsCount>=2){
      // Convención existente en renderPlayoff:
      // - en ida el equipo "B" (slot.teamB) juega como visita → se usa goalsB de ida
      // - en vuelta el equipo "A" (slot.teamA) juega como visita → se usa goalsA de vuelta
      const ida = legMatches.find(m=>parseInt(m.leg)===1) || legMatches[0];
      const vuelta = legMatches.find(m=>parseInt(m.leg)===2) || legMatches[legMatches.length-1];
      const awayGoalsA = (vuelta?.goalsA ?? 0);
      const awayGoalsB = (ida?.goalsB ?? 0);
      if(awayGoalsA>awayGoalsB) return teamA;
      if(awayGoalsB>awayGoalsA) return teamB;
    }

    const deciding = legMatches.find(m=>parseInt(m.leg)===legsCount) || legMatches[legMatches.length-1];
    if(deciding && deciding.penA!=null && deciding.penB!=null && deciding.penA!==deciding.penB){
      return deciding.penA>deciding.penB ? teamA : teamB;
    }
    return null;
  });

  return winners.filter(Boolean);
}

async function getPlayoffWinnerForMatch(sourcePhaseId, targetMatchIdx){
  const phase=await dbGet('phases',sourcePhaseId);
  if(!phase) return null;
  const slots=phase?.playoffSlots||[];
  const matches=await dbGetAll('matches',m=>m.phaseId===sourcePhaseId && m.matchIdx===targetMatchIdx);
  if(!matches.length) return null;
  const config=phase?.config||{};
  const legsCount=parseInt(config.legs)||2;
  const awayGoal=!!config.awayGoal;

  const slot = slots[targetMatchIdx];
  // Robustez: si el slot no tiene equipos aún, derivar de los partidos registrados
  const teamA = slot?.teamA || matches[0].teamA;
  const teamB = slot?.teamB || matches[0].teamB;
  if(!teamA || !teamB) return null;

  const totA=matches.reduce((s,m)=>s+(m.teamA===teamA?m.goalsA:(m.teamB===teamA?m.goalsB:0)),0);
  const totB=matches.reduce((s,m)=>s+(m.teamA===teamB?m.goalsA:(m.teamB===teamB?m.goalsB:0)),0);
  if(totA>totB) return teamA;
  if(totB>totA) return teamB;
  if(awayGoal && legsCount>=2){
    const ida = matches.find(m=>parseInt(m.leg)===1) || matches[0];
    const vuelta = matches.find(m=>parseInt(m.leg)===2) || matches[matches.length-1];
    // Convención existente en renderPlayoff (sin inferir home/away desde "teamA/teamB"):
    // - equipo A visita en la vuelta → away goles de A = goalsA de vuelta
    // - equipo B visita en la ida    → away goles de B = goalsB de ida
    const awayGoalsA = (vuelta?.goalsA ?? 0);
    const awayGoalsB = (ida?.goalsB ?? 0);
    if(awayGoalsA>awayGoalsB) return teamA;
    if(awayGoalsB>awayGoalsA) return teamB;
  }
  const deciding = matches.find(m=>parseInt(m.leg)===legsCount) || matches[matches.length-1];
  if(deciding && deciding.penA!=null && deciding.penB!=null && deciding.penA!==deciding.penB){
    return deciding.penA>deciding.penB ? teamA : teamB;
  }
  return null;
}

/* ----------------------------------------------------------
   PANEL PÚBLICO — navegación por competición y fase
   ---------------------------------------------------------- */
// Estado de navegación pública
window._pubState = { compId: null, phaseId: null, groupIdx: 0 };

