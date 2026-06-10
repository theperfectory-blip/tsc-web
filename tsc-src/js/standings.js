/* ==========================================================
   PARTE 4 — TABLA DE GRUPOS + CRITERIOS DE CLASIFICACIÓN
   ========================================================== */

/* ----------------------------------------------------------
   CRITERIOS DE CLASIFICACIÓN (por competición)
   Por defecto: pts → dg → gf → enfrentamiento directo
   ---------------------------------------------------------- */
const DEFAULT_CRITERIA = [
  {id:'pts',    name:'Puntos',                 key:(a)=>a.pts},
  {id:'dg',     name:'Diferencia de goles',    key:(a)=>a.gf-a.gc},
  {id:'gf',     name:'Goles a favor',          key:(a)=>a.gf},
  {id:'direct', name:'Enfrentamiento directo', key:null},
  {id:'custom', name:'Orden alfabético',       key:null},
];

// Obtener criterios activos de una fase (o usar default)
async function getCriteria(phaseId){
  const phase = await dbGet('phases', phaseId);
  if(phase?.criteria && phase.criteria.length>0) return phase.criteria;
  return DEFAULT_CRITERIA.map(c=>c.id);
}

// Nombre del criterio custom para esta fase
async function getCustomCriterionName(phaseId){
  const phase = await dbGet('phases', phaseId);
  return phase?.customCriterionName || 'Orden alfabético';
}

async function saveCriteria(phaseId, criteriaIds, disabledIds=[], customName=null){
  const phase = await dbGet('phases', phaseId);
  if(phase){
    await dbPut('phases',{
      ...phase,
      criteria: criteriaIds,
      criteriaDisabled: disabledIds,
      ...(customName !== null ? {customCriterionName: customName} : {})
    });
  }
}

/* ----------------------------------------------------------
   CALCULAR STANDINGS con criterios configurables
   ---------------------------------------------------------- */
function calcGroupStandings(teamIds, matchesInGroup, criteriaIds, allGroupMatches, teamNamesById={}){
  // Init stats using teamIds as keys
  const stats = {};
  teamIds.forEach(tid=>{
    const tidStr = String(tid);
    stats[tidStr]={id:tid,pts:0,pj:0,v:0,e:0,p:0,gf:0,gc:0,results:[]};
  });

  // Procesar partidos — SOLO los que tienen resultado registrado
  matchesInGroup.forEach(m=>{
    const tidA = String(m.teamA), tidB = String(m.teamB);
    if(!stats[tidA]||!stats[tidB]) return;
    // v1.6: ignorar partidos pendientes (sin marcador). No suman PJ ni puntos.
    if(m.goalsA==null || m.goalsB==null) return;
    const a=stats[tidA], b=stats[tidB];
    a.pj++;b.pj++;
    a.gf+=m.goalsA;a.gc+=m.goalsB;
    b.gf+=m.goalsB;b.gc+=m.goalsA;
    if(m.goalsA>m.goalsB){a.v++;a.pts+=3;a.results.push('w');b.p++;b.results.push('l');}
    else if(m.goalsA===m.goalsB){a.e++;a.pts++;a.results.push('d');b.e++;b.pts++;b.results.push('d');}
    else{b.v++;b.pts+=3;b.results.push('w');a.p++;a.results.push('l');}
  });

  const arr = Object.values(stats);

  // Función de comparación según criterios
  function compare(a, b){
    for(const cid of (criteriaIds||['pts','dg','gf'])){
      const crit = DEFAULT_CRITERIA.find(c=>c.id===cid);
      if(!crit) continue;

      if(crit.id==='direct'){
        // Enfrentamiento directo entre a y b — solo partidos jugados
        const directMatches = allGroupMatches.filter(m=>{
          const ma = parseInt(m.teamA), mb = parseInt(m.teamB);
          return ((ma===a.id&&mb===b.id)||(ma===b.id&&mb===a.id))
            && m.goalsA!=null && m.goalsB!=null;
        });
        let ptsa=0,ptsb=0;
        directMatches.forEach(m=>{
          if(parseInt(m.teamA)===a.id){
            if(m.goalsA>m.goalsB) ptsa+=3;
            else if(m.goalsA===m.goalsB){ptsa++;ptsb++;}
            else ptsb+=3;
          } else {
            if(m.goalsB>m.goalsA) ptsa+=3;
            else if(m.goalsA===m.goalsB){ptsa++;ptsb++;}
            else ptsb+=3;
          }
        });
        if(ptsb!==ptsa) return ptsb-ptsa;
      } else if(crit.id==='custom'){
        // Orden alfabético por nombre de equipo
        const na = (teamNamesById[a.id]||'').toLowerCase();
        const nb = (teamNamesById[b.id]||'').toLowerCase();
        if(na<nb) return -1;
        if(na>nb) return 1;
      } else if(crit.key){
        const va=crit.key(a), vb=crit.key(b);
        if(vb!==va) return vb-va;
      }
    }
    return 0;
  }

  return arr.sort(compare);
}

/* ----------------------------------------------------------
   VERIFICAR CLASIFICACIÓN MATEMÁTICA
   ---------------------------------------------------------- */
function isMathConfirmed(standings, pos, advance, totalMatchdays, zones){
  const team = standings[pos];
  const maxGames = standings.length - 1;
  const remaining = maxGames - team.pj;

  // Determinar zona actual del equipo
  const getZoneCutoff = ()=>{
    if(!zones||!zones.length) return advance;
    let acc=0;
    for(const z of zones){
      acc += z.count;
      if(pos < acc) return acc; // retorna el límite de su zona
    }
    return advance;
  };
  const zoneCutoff = getZoneCutoff();
  const zoneStart  = zoneCutoff - (()=>{ let acc=0; for(const z of (zones||[])){acc+=z.count;if(pos<acc)return z.count;} return advance; })();

  if(pos < advance){
    // ¿Puede ser alcanzado por el primero FUERA de su zona?
    if(zoneCutoff >= standings.length) return true;
    const challenger = standings[zoneCutoff];
    if(!challenger) return true;
    return team.pts > (challenger.pts + (maxGames - challenger.pj)*3);
  } else {
    // ¿Puede alcanzar al último DENTRO de la zona superior?
    if(advance <= 0) return false;
    const safe = standings[advance-1];
    if(!safe) return false;
    return safe.pts > (team.pts + remaining*3);
  }
}

/* ----------------------------------------------------------
   RENDER TABLA DE GRUPOS (vista pública y admin)
   ---------------------------------------------------------- */
async function renderGroupTable(phaseId, containerId, isAdmin=false, filterGroupIdx=null){
  const el = document.getElementById(containerId);
  if(!el) return;

  const phase = await dbGet('phases', phaseId);
  if(!phase){ el.innerHTML='<div style="color:var(--txt3);font-size:16px;">Fase no encontrada.</div>'; return; }

  const criteriaIds = await getCriteria(phaseId);
  const config = phase.config||{};
  const ngroups = config.ngroups||2;
  const zones   = phase.zones||[];

  // advance = mayor posición de la primera zona (para isMathConfirmed)
  // Nuevo sistema: max position de zonas que no son la última
  let advance;
  if(zones.length > 0 && zones[0].positions?.length){
    // Tomar todas las posiciones de todas las zonas excepto la última
    const nonLastZones = zones.slice(0,-1);
    const allPos = nonLastZones.flatMap(z=>z.positions||[]);
    advance = allPos.length ? Math.max(...allPos)+1 : 0;
  } else {
    advance = zones.length > 1
      ? zones.slice(0,-1).reduce((acc,z)=>acc+(z.count||0), 0)
      : zones.length===1 ? zones[0].count||0 : Math.ceil((config.teamsPerGroup||9)/2);
  }

  // Obtener todos los partidos de esta fase
  const allMatches = await dbGetAll('matches', m=>m.phaseId===phaseId);

  // Nombres de equipos para criterio alfabético
  const _allTeams = await dbGetAll('teams', t=>t.season===STATE.season||!t.season);
  const teamNamesById = {};
  _allTeams.forEach(t=>{ teamNamesById[t.id] = t.name||''; });

  // Obtener equipos asignados a esta fase (grupos)
  const groupAssignments = phase.groups||{}; // {groupIdx: [teamNames]}

  // Si no hay asignaciones ni refs de siembra, mostrar mensaje
  if(!Object.keys(groupAssignments).length && !(phase.groupRefs||[]).length){
    el.innerHTML = isAdmin
      ? `<div style="text-align:center;padding:24px;color:var(--txt3);border:1px dashed var(--brd2);border-radius:var(--rl);">
          <div style="font-size:16px;margin-bottom:10px;">No hay grupos configurados aún.</div>
          <button class="btn btn-primary btn-sm" onclick="openGroupAssignModal(${phaseId})">Asignar equipos a grupos</button>
        </div>`
      : `<div style="color:var(--txt3);font-size:16px;padding:16px;">Grupos no configurados aún.</div>`;
    return;
  }

  let html = '';

  for(let gi=0; gi<ngroups; gi++){
    if(filterGroupIdx!==null && gi!==parseInt(filterGroupIdx)) continue;
    const groupName  = `Grupo ${String.fromCharCode(65+gi)}`;
    const teamIds    = (groupAssignments[gi]||[]).filter(t=>t!=null);

    // Equipos sembrados por referencia (resolución en vivo desde la tabla origen)
    const refEntries = (phase.groupRefs||[]).some(r=>parseInt(r.tGroup)===gi)
      ? await resolveGroupRefsFor(phase, gi)
      : [];
    const refResolved = refEntries.filter(e=>e.teamId!=null && !teamIds.includes(e.teamId));
    const refResolvedIds = new Set(refResolved.map(e=>e.teamId));
    const refPending = refEntries.filter(e=>e.teamId==null);

    if(!teamIds.length && !refEntries.length) continue;

    const calcIds = [...teamIds, ...refResolved.map(e=>e.teamId)];
    const groupMatches = allMatches.filter(m=>m.groupIdx===gi);
    const standings    = calcGroupStandings(calcIds, groupMatches, criteriaIds, groupMatches, teamNamesById);

    // Zona de cada posición — usa positions por grupo si existe
    const getZone = (pos, groupIdx)=>{
      const hasPositionsDefined = zones.some(z => z.positions && (
        Array.isArray(z.positions) ? z.positions.length > 0 : Object.keys(z.positions).length > 0
      ));

      // Nuevo sistema: positions por grupo
      for(const z of zones){
        if(!z.positions) continue;
        if(Array.isArray(z.positions)){
          if(z.positions.includes(pos)) return z;
        } else if(typeof z.positions === 'object'){
          const gPos = z.positions[groupIdx] ?? z.positions[String(groupIdx)] ?? [];
          if(gPos.includes(pos)) return z;
        }
      }
      // Fallback legacy: count acumulativo — solo si NO hay positions definidas
      if(!hasPositionsDefined){
        let acc=0;
        for(const z of zones){
          acc += z.count||0;
          if(pos < acc) return z;
        }
      }
      return null;
    };

    const rows = await Promise.all(standings.map(async (s,i)=>{
      const zone      = getZone(i, gi);
      const confirmed = isMathConfirmed(standings, i, advance, standings.length-1, zones);
      const dg        = s.gf - s.gc;
      const last3     = s.results.slice(-3);
      while(last3.length<3) last3.unshift('empty');

      // ✅ Resolver dinámicamente datos del equipo para temporada actual
      const teamData = await resolveTeamData(s.id);
      const displayName = teamData.name;
      const displayIni = teamData.ini;
      const displayColor = teamData.color;

      const posStyle = zone
        ? `background:${zone.color}22;color:${zone.color};`
        : `background:var(--card2);color:var(--txt3);`;

      const confBadge = confirmed
        ? `<span style="font-size:11px;font-weight:700;color:${zone?.color||'var(--txt3)'};margin-left:3px;">✓</span>`
        : '';

      // Badge para equipos que llegan por referencia (aún no fijados al grupo)
      const refBadge = refResolvedIds.has(s.id)
        ? `<span title="Llega por referencia desde otra fase — se fija al crear su primera fecha" style="font-size:9px;font-weight:700;color:var(--gold);background:var(--gold-l);border:1px dashed var(--gold-b);border-radius:3px;padding:1px 4px;margin-left:5px;letter-spacing:0.5px;">REF</span>`
        : '';

      const dots = last3.map(r=>{
        const bg = r==='w'?'#25A864':r==='d'?'var(--txt3)':r==='l'?'#E84040':'var(--brd2)';
        return `<div style="width:8px;height:8px;border-radius:50%;background:${bg};flex-shrink:0;"></div>`;
      }).join('');

      return `<tr style="transition:background 0.1s;" onmouseover="this.style.background='var(--card2)'" onmouseout="this.style.background=''">
        <td style="padding:7px 8px;">
          <div style="width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;${posStyle}">${i+1}</div>
        </td>
        <td style="padding:7px 8px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:24px;height:24px;border-radius:50%;background:${displayColor};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:#fff;flex-shrink:0;overflow:hidden;" id="tlogo-${phaseId}-${gi}-${i}">
              ${displayIni.substring(0,3).toUpperCase()}
            </div>
            <span style="font-size:14px;font-weight:500;">${displayName}</span>${confBadge}${refBadge}
          </div>
        </td>
        <td style="padding:7px 8px;font-weight:700;font-size:16px;">${s.pts}</td>
        <td style="padding:7px 8px;color:var(--txt2);">${s.pj}</td>
        <td style="padding:7px 8px;color:var(--txt2);">${s.v}</td>
        <td style="padding:7px 8px;color:var(--txt2);">${s.e}</td>
        <td style="padding:7px 8px;color:var(--txt2);">${s.p}</td>
        <td style="padding:7px 8px;">${s.gf}</td>
        <td style="padding:7px 8px;">${s.gc}</td>
        <td style="padding:7px 8px;${dg>0?'color:var(--green);':dg<0?'color:var(--red)':'color:var(--txt2)'}">
          ${dg>0?'+'+dg:dg}
        </td>
        <td style="padding:7px 8px;">
          <div style="display:flex;align-items:center;justify-content:flex-end;gap:3px;">${dots}</div>
        </td>
      </tr>`;
    }));

    // Leyenda de zonas
    const legendItems = zones.map(z=>
      `<div style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--txt2);">
        <div style="width:10px;height:10px;border-radius:2px;background:${z.color};flex-shrink:0;"></div>${z.name}
      </div>`
    ).join('');

    html += `
    <div class="card" style="margin-bottom:14px;">
      <div class="card-hdr">
        <div class="card-title">${groupName}</div>
        <div style="display:flex;align-items:center;gap:6px;">
          <button onclick="openCriteriaModal(${phaseId},'${containerId}',${isAdmin})"
            style="background:none;border:1px solid var(--brd);border-radius:var(--r);color:var(--txt2);cursor:pointer;padding:3px 8px;font-size:13px;display:flex;align-items:center;gap:4px;transition:all 0.15s;"
            onmouseover="this.style.borderColor='var(--gold)';this.style.color='var(--gold)'"
            onmouseout="this.style.borderColor='var(--brd)';this.style.color='var(--txt2)'"
            title="Criterios de clasificación">
            ℹ Criterios
          </button>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid var(--brd);">
              <th style="padding:6px 8px;font-size:12px;color:var(--txt3);font-weight:700;text-transform:uppercase;text-align:left;width:28px;">#</th>
              <th style="padding:6px 8px;font-size:12px;color:var(--txt3);font-weight:700;text-transform:uppercase;text-align:left;">Equipo</th>
              <th style="padding:6px 8px;font-size:12px;color:var(--txt3);font-weight:700;text-transform:uppercase;text-align:left;">PTS</th>
              <th style="padding:6px 8px;font-size:12px;color:var(--txt3);font-weight:700;text-transform:uppercase;text-align:left;">PJ</th>
              <th style="padding:6px 8px;font-size:12px;color:var(--txt3);font-weight:700;text-transform:uppercase;text-align:left;">V</th>
              <th style="padding:6px 8px;font-size:12px;color:var(--txt3);font-weight:700;text-transform:uppercase;text-align:left;">E</th>
              <th style="padding:6px 8px;font-size:12px;color:var(--txt3);font-weight:700;text-transform:uppercase;text-align:left;">P</th>
              <th style="padding:6px 8px;font-size:12px;color:var(--txt3);font-weight:700;text-transform:uppercase;text-align:left;">GF</th>
              <th style="padding:6px 8px;font-size:12px;color:var(--txt3);font-weight:700;text-transform:uppercase;text-align:left;">GC</th>
              <th style="padding:6px 8px;font-size:12px;color:var(--txt3);font-weight:700;text-transform:uppercase;text-align:left;">DG</th>
              <th style="padding:6px 8px;font-size:12px;color:var(--txt3);font-weight:700;text-transform:uppercase;text-align:right;">Últ.</th>
            </tr>
          </thead>
          <tbody>${rows.join('')}${refPending.map(e=>`
            <tr style="opacity:0.65;">
              <td style="padding:7px 8px;">
                <div style="width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;background:var(--card2);color:var(--txt3);">·</div>
              </td>
              <td style="padding:7px 8px;" colspan="10">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div style="width:24px;height:24px;border-radius:50%;border:1px dashed var(--brd2);display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--txt3);flex-shrink:0;">?</div>
                  <span style="font-size:14px;color:var(--txt3);font-style:italic;">Por definir</span>
                  ${refBadgeHTML(e.label)}
                  <span style="font-size:11px;color:var(--txt3);">· se resuelve cuando termine la fase origen</span>
                </div>
              </td>
            </tr>`).join('')}</tbody>
        </table>
      </div>
      <div style="padding:8px 12px;border-top:1px solid var(--brd);display:flex;gap:12px;flex-wrap:wrap;">
        ${legendItems}
        <div style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--txt2);">
          <div style="width:8px;height:8px;border-radius:50%;background:#25A864;"></div>Victoria
        </div>
        <div style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--txt2);">
          <div style="width:8px;height:8px;border-radius:50%;background:var(--txt3);"></div>Empate
        </div>
        <div style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--txt2);">
          <div style="width:8px;height:8px;border-radius:50%;background:#E84040;"></div>Derrota
        </div>
        <div style="margin-left:auto;font-size:12px;color:var(--txt3);">✓ Clasificado matemáticamente</div>
      </div>
    </div>`;

    // Cargar logos async
    setTimeout(async()=>{
      for(let si=0;si<standings.length;si++){
        const team = await dbGet('teams', standings[si].id);
        if(team && team.logo){
          const lel = document.getElementById(`tlogo-${phaseId}-${gi}-${si}`);
          if(lel) lel.innerHTML=`<img src="${team.logo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        }
      }
    },100);
  }

  el.innerHTML = html || `<div style="color:var(--txt3);font-size:16px;padding:16px;">Sin grupos con equipos asignados.</div>`;
}

/* ----------------------------------------------------------
   MODAL CRITERIOS DE CLASIFICACIÓN
   ---------------------------------------------------------- */
let _criteriaPhaseId=null, _criteriaContainerId=null, _criteriaIsAdmin=false;
let _dragId=null, _dragOverId=null;

function _criteriaItemName(c, customName){
  return c.id==='custom' ? (customName||'Orden alfabético') : c.name;
}

async function openCriteriaModal(phaseId, containerId, isAdmin){
  _criteriaPhaseId=phaseId; _criteriaContainerId=containerId; _criteriaIsAdmin=isAdmin;

  const phase = await dbGet('phases', phaseId);
  const savedActive   = (phase?.criteria?.length>0) ? phase.criteria : DEFAULT_CRITERIA.map(c=>c.id);
  const savedDisabled = phase?.criteriaDisabled || [];
  const savedCustom   = phase?.customCriterionName || 'Orden alfabético';

  // Init state (preserve in-progress changes if modal is re-rendering)
  if(window._criteriaInitPhase !== phaseId){
    window._activeCriteria   = [...savedActive];
    window._disabledCriteria = [...savedDisabled];
    window._customCriterionName = savedCustom;
    window._criteriaInitPhase = phaseId;
  }

  const active   = window._activeCriteria   || [];
  const disabled = window._disabledCriteria || [];
  const customName = window._customCriterionName || 'Orden alfabético';

  const activeItems   = active.map(id=>DEFAULT_CRITERIA.find(c=>c.id===id)).filter(Boolean);
  const disabledItems = disabled.map(id=>DEFAULT_CRITERIA.find(c=>c.id===id)).filter(Boolean);

  let wrap = document.getElementById('criteria-modal-wrap');
  if(!wrap){ wrap=document.createElement('div'); wrap.id='criteria-modal-wrap'; document.body.appendChild(wrap); }

  const _adminDesc = isAdmin
    ? `<div style="font-size:13px;color:var(--txt2);margin-bottom:14px;line-height:1.5;">
        Arrastra para reordenar. La × mueve el criterio a "en desuso" (no se borra).
        Los cambios se aplican en tiempo real al guardar.
       </div>`
    : `<div style="font-size:13px;color:var(--txt2);margin-bottom:14px;line-height:1.5;">
        Criterios de desempate aplicados en orden de prioridad.
       </div>`;

  const _activeRows = activeItems.map((c,i)=>{
    const displayName = _criteriaItemName(c, customName);
    if(!isAdmin){
      return `<div style="padding:6px 10px;font-size:14px;color:var(--txt);">${i+1}. ${displayName}</div>`;
    }
    const nameCell = c.id==='custom'
      ? `<input id="criteria-custom-name" value="${displayName.replace(/"/g,'&quot;')}"
           style="font-size:14px;flex:1;background:transparent;border:none;border-bottom:1px solid var(--brd2);color:var(--txt);outline:none;padding:1px 2px;"
           oninput="window._customCriterionName=this.value"
           placeholder="Nombre del criterio">`
      : `<span style="font-size:14px;flex:1;">${i+1}. ${displayName}</span>`;
    return `
    <div draggable="true" data-id="${c.id}"
      ondragstart="criteriaDragStart(event)"
      ondragover="criteriaDragOver(event)"
      ondragleave="criteriaDragLeave(event)"
      ondrop="criteriaDrop(event)"
      ondragend="criteriaDragEnd()"
      style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--card);border:1px solid var(--brd2);border-radius:var(--r);cursor:grab;transition:background 0.15s,border-color 0.15s;">
      <span style="color:var(--txt3);display:flex;flex-direction:column;gap:2px;flex-shrink:0;">
        <svg viewBox="0 0 16 10" width="14" height="10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <line x1="1" y1="2" x2="15" y2="2"/><line x1="1" y1="5" x2="15" y2="5"/><line x1="1" y1="8" x2="15" y2="8"/>
        </svg>
      </span>
      <span style="font-size:12px;font-weight:700;color:var(--txt3);min-width:16px;">${i+1}.</span>
      ${nameCell}
      <button onclick="criteriaDisable('${c.id}')" title="Mover a en desuso"
        style="background:none;border:none;color:var(--txt3);cursor:pointer;font-size:18px;line-height:1;padding:0 2px;flex-shrink:0;"
        onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--txt3)'">×</button>
    </div>`;
  }).join('');

  const _disabledSection = (isAdmin && disabledItems.length) ? `
    <div style="font-size:11px;color:var(--txt3);text-transform:uppercase;letter-spacing:1.2px;margin:16px 0 8px;border-top:1px solid var(--brd);padding-top:14px;">
      Criterios en desuso
    </div>
    <div style="display:flex;flex-direction:column;gap:5px;">
      ${disabledItems.map(c=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:var(--card2);border:1px dashed var(--brd);border-radius:var(--r);opacity:0.7;">
        <span style="font-size:13px;color:var(--txt2);">${_criteriaItemName(c,customName)}</span>
        <button onclick="criteriaRestore('${c.id}')" class="btn btn-xs" title="Restaurar criterio">+ Restaurar</button>
      </div>`).join('')}
    </div>` : '';

  wrap.innerHTML = `
  <div class="modal-overlay open" id="criteria-modal">
    <div class="modal" style="max-width:460px;">
      <div class="modal-hdr">
        <div class="modal-title">Criterios de clasificación</div>
        <button class="modal-close" onclick="closeCriteriaModal()">×</button>
      </div>
      <div class="modal-body">
        ${_adminDesc}
        <div style="font-size:11px;color:var(--txt3);text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;">Criterios activos (en orden)</div>
        <div id="criteria-active"
          style="display:flex;flex-direction:column;gap:5px;min-height:44px;padding:6px;background:var(--card2);border-radius:var(--r);border:1px solid var(--brd);"
          ${isAdmin?'ondragover="event.preventDefault()" ondrop="criteriaDropOnContainer(event)"':''}>
          ${_activeRows || '<div style="padding:8px;font-size:13px;color:var(--txt3);">Sin criterios activos.</div>'}
        </div>
        ${_disabledSection}
      </div>
      <div class="modal-footer">
        ${isAdmin?`<button class="btn btn-primary" onclick="saveCriteriaAndRefresh()">Guardar y aplicar</button>`:''}
        <button class="btn" onclick="closeCriteriaModal()">Cerrar</button>
      </div>
    </div>
  </div>`;
}

function closeCriteriaModal(){
  const el = document.getElementById('criteria-modal-wrap');
  if(el) el.innerHTML='';
  window._criteriaInitPhase = null; // reset state on close
}

/* ── Drag & drop ── */
function criteriaDragStart(e){
  _dragId = e.currentTarget.dataset.id;
  e.currentTarget.style.opacity='0.45';
  e.dataTransfer.effectAllowed='move';
}
function criteriaDragOver(e){
  e.preventDefault();
  e.dataTransfer.dropEffect='move';
  const el = e.currentTarget;
  const id = el.dataset?.id;
  if(id && id!==_dragId && id!==_dragOverId){
    _dragOverId=id;
    // Remove highlight from all, add to target
    document.querySelectorAll('#criteria-active [data-id]').forEach(el=>{ el.style.borderColor=''; el.style.background=''; });
    el.style.borderColor='var(--gold)';
    el.style.background='rgba(201,168,76,0.08)';
  }
}
function criteriaDragLeave(e){
  e.currentTarget.style.borderColor='';
  e.currentTarget.style.background='';
}
function criteriaDragEnd(){
  document.querySelectorAll('#criteria-active [data-id]').forEach(el=>{ el.style.opacity=''; el.style.borderColor=''; el.style.background=''; });
  _dragId=null; _dragOverId=null;
}
function criteriaDrop(e){
  e.preventDefault(); e.stopPropagation();
  if(!_dragId) return;
  const targetId = e.currentTarget.dataset?.id;
  if(!targetId || targetId===_dragId){ criteriaDragEnd(); return; }
  const ac=[...(window._activeCriteria||[])];
  const from=ac.indexOf(_dragId), to=ac.indexOf(targetId);
  if(from===-1||to===-1){ criteriaDragEnd(); return; }
  ac.splice(from,1); ac.splice(to,0,_dragId);
  window._activeCriteria=ac;
  _renderCriteriaModal();
}
function criteriaDropOnContainer(e){
  // Drop on container itself (empty area) — move dragged item to end
  e.preventDefault();
  if(!_dragId) return;
  const ac=[...(window._activeCriteria||[])];
  const from=ac.indexOf(_dragId);
  if(from===-1) return;
  ac.splice(from,1); ac.push(_dragId);
  window._activeCriteria=ac;
  _renderCriteriaModal();
}

function criteriaDisable(id){
  window._activeCriteria=(window._activeCriteria||[]).filter(x=>x!==id);
  if(!(window._disabledCriteria||[]).includes(id))
    window._disabledCriteria=[...(window._disabledCriteria||[]),id];
  _renderCriteriaModal();
}

function criteriaRestore(id){
  window._disabledCriteria=(window._disabledCriteria||[]).filter(x=>x!==id);
  if(!(window._activeCriteria||[]).includes(id))
    window._activeCriteria=[...(window._activeCriteria||[]),id];
  _renderCriteriaModal();
}

function _renderCriteriaModal(){
  openCriteriaModal(_criteriaPhaseId, _criteriaContainerId, _criteriaIsAdmin);
}

async function saveCriteriaAndRefresh(){
  const phase = await dbGet('phases', _criteriaPhaseId);
  const savedActive   = phase?.criteria || DEFAULT_CRITERIA.map(c=>c.id);
  const savedDisabled = phase?.criteriaDisabled || [];
  const savedCustom   = phase?.customCriterionName || 'Orden alfabético';
  const newActive     = window._activeCriteria  || [];
  const newDisabled   = window._disabledCriteria || [];
  const newCustom     = window._customCriterionName || 'Orden alfabético';

  const changed = JSON.stringify(newActive) !== JSON.stringify(savedActive)
               || JSON.stringify(newDisabled) !== JSON.stringify(savedDisabled)
               || newCustom !== savedCustom;

  if(!changed){ closeCriteriaModal(); return; }

  showConfirm(
    '¿Aplicar cambios a los criterios?',
    'La tabla de clasificación se recalculará en tiempo real con el nuevo orden.',
    async () => {
      await saveCriteria(_criteriaPhaseId, newActive, newDisabled, newCustom);
      closeCriteriaModal();
      showToast('Criterios guardados. Tabla actualizada.');
      renderGroupTable(_criteriaPhaseId, _criteriaContainerId, _criteriaIsAdmin);
    }
  );
}

/* ----------------------------------------------------------
   MODAL ASIGNACIÓN DE EQUIPOS A GRUPOS
   ---------------------------------------------------------- */
/* ----------------------------------------------------------
   buildTeamCompMap — devuelve Map<teamId, [{id,name,color}]>
   - Recorre fases tipo groups / bracket / playoff / single de la temporada activa
   - Solo registra equipos asignados explícitamente (no slotRefs dinámicos)
   - Permite excluir una fase (la que el admin está editando)
   ---------------------------------------------------------- */
async function buildTeamCompMap({excludePhaseId=null}={}){
  const allPhases = await dbGetAll('phases', p=>p.season===STATE.season||!p.season);
  const allComps  = await dbGetAll('competitions', c=>c.season===STATE.season||!c.season);
  const compById  = Object.fromEntries(allComps.map(c=>[c.id, c]));
  const map = new Map();

  const addParticipation = (teamId, comp)=>{
    if(teamId==null || !comp) return;
    const tid = typeof teamId==='number' ? teamId : (Number.isFinite(parseInt(teamId)) ? parseInt(teamId) : null);
    if(tid==null) return;
    if(!map.has(tid)) map.set(tid, []);
    const arr = map.get(tid);
    if(!arr.find(c=>c.id===comp.id)){
      arr.push({id: comp.id, name: comp.name||'', color: comp.color||'var(--gold)'});
    }
  };

  for(const p of allPhases){
    if(excludePhaseId!=null && p.id===excludePhaseId) continue;
    const comp = compById[p.compId];
    if(!comp) continue;

    // Tipo groups: phase.groups[gi] = [teamId, ...]   (null = slot vacío)
    if(p.groups && typeof p.groups==='object'){
      Object.values(p.groups).flat().filter(t=>t!=null).forEach(tid=>addParticipation(tid, comp));
    }
    // Tipo bracket: manualSlots[i] = {teamA, teamB} (asignación explícita)
    if(Array.isArray(p.manualSlots)){
      p.manualSlots.forEach(s=>{
        addParticipation(s?.teamA, comp);
        addParticipation(s?.teamB, comp);
      });
    }
    // Tipo playoff/single: playoffSlots[i] = {teamA, teamB}
    if(Array.isArray(p.playoffSlots)){
      p.playoffSlots.forEach(s=>{
        addParticipation(s?.teamA, comp);
        addParticipation(s?.teamB, comp);
      });
    }
  }

  return map;
}

async function openGroupAssignModal(phaseId, groupIdx=null){
  const phase  = await dbGet('phases', phaseId);
  const teams  = await dbGetAll('teams', t=>t.status==='ACTIVO');
  const config = phase?.config||{};
  const ngroups= config.ngroups||2;
  const groups = phase?.groups ? JSON.parse(JSON.stringify(phase.groups)) : {};

  // Init grupos vacíos si no existen
  for(let i=0;i<ngroups;i++){ if(!groups[i]) groups[i]=[]; }

  // Capacidad por grupo: groupSizes[i] (si está) o teamsPerGroup como fallback
  const fallbackPerGroup = parseInt(config.teamsPerGroup) || 0;
  const sizes = Array.isArray(config.groupSizes) && config.groupSizes.length
    ? config.groupSizes
    : Array(ngroups).fill(fallbackPerGroup);
  const groupCapacities = Array.from({length:ngroups},(_,i)=>{
    const v = parseInt(sizes[i]);
    return Number.isFinite(v) && v>0 ? v : null; // null = sin límite
  });
  window._assignGroupCapacities = groupCapacities;

  // Mapear teamId → [{id,name,color}] de competiciones donde participa
  // (excluyendo la fase actual; los slotRefs dinámicos NO se cuentan).
  window._teamCompMap = await buildTeamCompMap({excludePhaseId: phaseId});

  let wrap = document.getElementById('group-assign-wrap');
  if(!wrap){
    wrap = document.createElement('div');
    wrap.id = 'group-assign-wrap';
    document.body.appendChild(wrap);
  }

  wrap.innerHTML = `
  <div class="modal-overlay open" id="group-assign-modal">
    <div class="modal" style="max-width:600px;">
      <div class="modal-hdr">
        <div class="modal-title">Asignar equipos a grupos</div>
        <button class="modal-close" onclick="closeGroupAssignModal()">×</button>
      </div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <!-- Grupos -->
          <div>
            <div style="font-size:12px;color:var(--txt3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Grupos</div>
            <div id="groups-slots" style="display:flex;flex-direction:column;gap:8px;"></div>
          </div>
          <!-- Equipos disponibles -->
          <div>
            <div style="font-size:12px;color:var(--txt3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Equipos disponibles</div>
            <input type="text" id="assign-search" placeholder="Buscar..." oninput="filterAssignTeams()"
              style="width:100%;padding:6px 8px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);color:var(--txt);font-size:14px;margin-bottom:6px;">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--txt2);cursor:pointer;margin-bottom:8px;user-select:none;">
              <input type="checkbox" id="assign-only-free" onchange="filterAssignTeams()" style="cursor:pointer;">
              Ocultar equipos ya asignados a otras competiciones
            </label>
            <div id="assign-teams-list" style="max-height:360px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;"></div>
          </div>
        </div>
      </div>
      <div class="modal-footer" style="justify-content:space-between;">
        <button class="btn" onclick="undoAssignChanges()" title="Restaurar al estado al abrir el modal">↺ Deshacer cambios</button>
        <div style="display:flex;gap:8px;">
          <button class="btn" onclick="closeGroupAssignModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="saveGroupAssign(${phaseId})">Guardar grupos</button>
        </div>
      </div>
    </div>
  </div>`;

  window._assignGroups = groups;
  window._assignPhaseId = phaseId;
  window._assignPhaseCompId = phase?.compId ?? null;
  window._assignAllTeams = teams;
  // Refs de siembra (staged): se persisten junto con los grupos al guardar.
  window._assignGroupRefs = phase?.groupRefs ? JSON.parse(JSON.stringify(phase.groupRefs)) : [];
  // Snapshot inicial para "Deshacer cambios" (deep clone, robusto ante sparse).
  window._assignOriginalGroups = JSON.parse(JSON.stringify(groups));
  window._assignOriginalGroupRefs = JSON.parse(JSON.stringify(window._assignGroupRefs));

  renderAssignGroupSlots();
  renderAssignTeamsList(teams, groups);
}

/* ── Refs de siembra en el modal de asignación ── */
function _groupRefsOf(gi){
  return (window._assignGroupRefs||[])
    .map((r,idx)=>({r,idx}))
    .filter(x=>parseInt(x.r.tGroup)===parseInt(gi));
}

/* Llamado por saveSlotRef (bracket.js) cuando targetType==='group' */
function addGroupRefFromModal(ref){
  const gi = parseInt(ref.tGroup);
  const caps = window._assignGroupCapacities || [];
  const cap = caps[gi];
  const teamCount = ((window._assignGroups||{})[gi]||[]).filter(t=>t!=null).length;
  const refCount  = _groupRefsOf(gi).length;
  if(cap!=null && teamCount+refCount >= cap){
    showToast(`Grupo ${String.fromCharCode(65+gi)} está completo (${cap}/${cap})`,'error');
    return;
  }
  if(!window._assignGroupRefs) window._assignGroupRefs = [];
  window._assignGroupRefs.push(ref);
  renderAssignGroupSlots();
  renderAssignTeamsList(window._assignAllTeams||[], window._assignGroups||{});
  showToast('Referencia añadida · se guarda con "Guardar grupos"');
}

function removeGroupRef(idx){
  (window._assignGroupRefs||[]).splice(idx,1);
  renderAssignGroupSlots();
  renderAssignTeamsList(window._assignAllTeams||[], window._assignGroups||{});
}

function renderAssignTeamsList(teams, groups){
  const el = document.getElementById('assign-teams-list');
  if(!el) return;
  const inGroups = new Set(Object.values(groups).flat().filter(t=>t!=null));
  const search = (document.getElementById('assign-search')?.value||'').toLowerCase();
  const onlyFree = !!document.getElementById('assign-only-free')?.checked;

  const tcMap = window._teamCompMap || new Map();
  const compsOf = (tid)=>{
    if(tcMap instanceof Map) return tcMap.get(tid) || [];
    return tcMap[tid] || []; // fallback si quedó como objeto plano
  };

  const filtered = teams.filter(t=>{
    if(inGroups.has(t.id)) return false;
    if(search && !t.name.toLowerCase().includes(search)) return false;
    if(onlyFree && compsOf(t.id).length>0) return false;
    return true;
  });

  const ngroups = Object.keys(groups).length;
  const caps = window._assignGroupCapacities || [];

  el.innerHTML = filtered.map(t=>{
    const comps = compsOf(t.id);
    const chips = comps.map(c=>{
      const safeName = _escTxt(c.name);
      const color = c.color || 'var(--gold)';
      return `<span title="${safeName}"
        style="font-size:10px;font-weight:600;color:${color};background:${color}22;border:1px solid ${color}44;border-radius:3px;padding:1px 6px;line-height:1.4;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;">
        ● ${safeName}
      </span>`;
    }).join('');

    return `<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);">
      <div style="width:22px;height:22px;border-radius:50%;background:${t.color||'#333'};overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;flex-shrink:0;">
        ${t.logo?`<img src="${t.logo}" style="width:100%;height:100%;object-fit:cover;">`:`${_escTxt(t.ini||'?')}`}
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:2px;overflow:hidden;min-width:0;">
        <span style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_escTxt(t.name)}</span>
        ${chips ? `<div style="display:flex;gap:3px;flex-wrap:wrap;">${chips}</div>` : ''}
      </div>
      <select onchange="addToGroup(this.value,'${t.id}');this.value=''"
        style="padding:3px 6px;background:var(--card);border:1px solid var(--brd);border-radius:3px;color:var(--txt);font-size:12px;cursor:pointer;flex-shrink:0;">
        <option value="">→ Gr.</option>
        ${Array.from({length:ngroups},(_,i)=>{
          const count = (groups[i]||[]).filter(t=>t!=null).length + _groupRefsOf(i).length;
          const cap   = caps[i];
          const full  = cap!=null && count>=cap;
          const label = full
            ? `${String.fromCharCode(65+i)} (lleno)`
            : (cap!=null ? `${String.fromCharCode(65+i)} (${count}/${cap})` : String.fromCharCode(65+i));
          return `<option value="${i}" ${full?'disabled':''}>${label}</option>`;
        }).join('')}
      </select>
    </div>`;
  }).join('') || `<div style="color:var(--txt3);font-size:14px;padding:8px;">${onlyFree ? 'Sin equipos libres. Desmarcá el filtro para ver todos.' : 'Todos los equipos asignados.'}</div>`;
}

function _escTxt(v){
  return String(v==null?'':v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function filterAssignTeams(){
  renderAssignTeamsList(window._assignAllTeams||[], window._assignGroups||{});
}

function addToGroup(groupIdx, teamId){
  if(!window._assignGroups) return;
  const gi = parseInt(groupIdx);
  if(!window._assignGroups[gi]) window._assignGroups[gi]=[];
  const arr = window._assignGroups[gi];
  const caps = window._assignGroupCapacities || [];
  const cap  = caps[gi];
  // Capacidad real = equipos presentes + refs de siembra (no contar slots reservados).
  const filledCount = arr.filter(t=>t!=null).length + _groupRefsOf(gi).length;
  if(cap!=null && filledCount >= cap){
    const letter = String.fromCharCode(65+gi);
    if(typeof showToast==='function'){
      showToast(`Grupo ${letter} está completo (${cap}/${cap})`,'error');
    }
    return;
  }
  const tid = parseInt(teamId);
  if(arr.filter(t=>t!=null).includes(tid)){
    renderAssignGroupSlots();
    return;
  }
  // Si hay un slot reservado por sorteo (null), lo rellenamos en su sitio.
  const nullIdx = arr.indexOf(null);
  if(nullIdx >= 0) arr[nullIdx] = tid;
  else arr.push(tid);
  renderAssignGroupSlots();
  renderAssignTeamsList(window._assignAllTeams||[], window._assignGroups||{});
}

function removeFromGroup(groupIdx, teamId){
  if(!window._assignGroups) return;
  const tid = parseInt(teamId);
  window._assignGroups[groupIdx]=(window._assignGroups[groupIdx]||[]).filter(n=>n!==tid);
  renderAssignGroupSlots();
  renderAssignTeamsList(window._assignAllTeams||[], window._assignGroups||{});
}

async function renderAssignGroupSlots(){
  const groups = window._assignGroups||{};
  const allTeams = window._assignAllTeams||[];
  const caps = window._assignGroupCapacities || [];
  const teamById = {}; allTeams.forEach(t=>teamById[t.id]=t);
  const ngroups = Object.keys(groups).length;
  const el = document.getElementById('groups-slots');
  if(!el) return;

  // Resolver preview en vivo de cada ref staged (equipo actual según tabla origen)
  const refRows = {}; // gi -> html[]
  for(let gi=0; gi<ngroups; gi++){
    refRows[gi] = [];
    for(const {r, idx} of _groupRefsOf(gi)){
      let label, resolvedName;
      if(r.type==='team'){
        const t = teamById[r.teamId] || allTeams.find(x=>x.id===parseInt(r.teamId));
        label = 'Directo'; resolvedName = t?.name || `#${r.teamId}`;
      } else {
        label = (typeof refLabel==='function') ? await refLabel(r, window._assignPhaseCompId) : 'Ref';
        let tid = null;
        if(typeof resolveSlotRef==='function'){
          if(r.type==='ref' && r.phaseId!=null && typeof invalidateStandingsCache==='function')
            invalidateStandingsCache(parseInt(r.phaseId));
          tid = await resolveSlotRef(r).catch(()=>null);
        }
        resolvedName = tid!=null ? (teamById[tid]?.name || `#${tid}`) : 'Por definir';
      }
      const badge = (typeof refBadgeHTML==='function' && r.type!=='team') ? refBadgeHTML(label) : `<span style="font-size:11px;color:var(--txt3);">${label}</span>`;
      refRows[gi].push(`<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:3px 6px;background:var(--card);border:1px dashed var(--gold-b);border-radius:3px;font-size:13px;">
        <span style="display:flex;align-items:center;gap:6px;min-width:0;">
          ${badge}
          <span style="color:${resolvedName==='Por definir'?'var(--txt3)':'var(--txt)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_escTxt(resolvedName)}</span>
        </span>
        <button onclick="removeGroupRef(${idx})" title="Quitar referencia" style="background:none;border:none;color:var(--txt3);cursor:pointer;font-size:14px;flex-shrink:0;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--txt3)'">×</button>
      </div>`);
    }
  }

  el.innerHTML = Array.from({length:ngroups},(_,i)=>{
    const arr = groups[i]||[];
    // null = slot reservado (sorteo). No cuenta como equipo ni se muestra como "Team null".
    const nonNull = arr.filter(t=>t!=null);
    const refCount = refRows[i].length;
    const count = nonNull.length + refCount;
    const reserved = arr.length - nonNull.length;
    const cap   = caps[i];
    const full  = cap!=null && count>=cap;
    const near  = cap!=null && !full && (cap-count)<=2;
    const counterColor = full ? 'var(--gold)' : near ? '#E8B340' : 'var(--txt3)';
    const counterText = cap!=null ? `${count}/${cap}` : `${count} equipos`;
    const fullBadge = full ? `<span style="font-size:10px;color:var(--gold);background:rgba(201,168,76,0.15);border:1px solid var(--gold-b);border-radius:3px;padding:1px 5px;margin-left:6px;">LLENO</span>` : '';
    const reservedBadge = reserved>0 ? `<span title="Slot reservado por sorteo (vacío)" style="font-size:10px;color:#E8B340;background:rgba(232,179,64,0.12);border:1px solid #E8B340;border-radius:3px;padding:1px 5px;margin-left:6px;">${reserved} reservado${reserved===1?'':'s'}</span>` : '';
    const borderColor = full ? 'var(--gold-b)' : 'var(--brd)';
    return `
    <div style="background:var(--card2);border:1px solid ${borderColor};border-radius:var(--r);overflow:hidden;">
      <div style="padding:5px 10px;font-size:13px;font-weight:700;color:var(--txt2);border-bottom:1px solid var(--brd);font-family:'Barlow Condensed';text-transform:uppercase;display:flex;align-items:center;">
        <span>Grupo ${String.fromCharCode(65+i)}</span>
        <span style="font-weight:400;color:${counterColor};margin-left:6px;">(${counterText})</span>
        ${fullBadge}${reservedBadge}
        <button onclick="openSlotRefModal(${window._assignPhaseId},${i},'R','group')" title="Sembrar desde otra fase (posición de grupo, ganador de llave...)"
          style="margin-left:auto;background:none;border:1px solid var(--gold-b);border-radius:3px;color:var(--gold);cursor:pointer;font-size:10px;padding:1px 6px;text-transform:none;font-family:'Barlow';font-weight:600;"
          onmouseover="this.style.background='var(--gold-l)'" onmouseout="this.style.background='none'">+ Por referencia</button>
      </div>
      <div id="gslot-${i}" style="padding:6px 8px;min-height:36px;display:flex;flex-direction:column;gap:4px;">
        ${nonNull.map(tid=>{
          const team = teamById[tid];
          const name = team?.name || `Team ${tid}`;
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:3px 6px;background:var(--card);border-radius:3px;font-size:13px;">
            <span>${name}</span>
            <button onclick="removeFromGroup(${i},${tid})" style="background:none;border:none;color:var(--txt3);cursor:pointer;font-size:14px;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--txt3)'">×</button>
          </div>`;
        }).join('')}
        ${refRows[i].join('')}
        ${reserved>0 ? Array.from({length:reserved},()=>`<div style="display:flex;align-items:center;padding:3px 6px;background:transparent;border:1px dashed var(--brd);border-radius:3px;font-size:12px;color:var(--txt3);">slot reservado</div>`).join('') : ''}
      </div>
    </div>`;
  }).join('');
}

async function saveGroupAssign(phaseId){
  const phase = await dbGet('phases', phaseId);
  const oldGroups = phase.groups || {};
  const newGroups = window._assignGroups || {};

  // Guard: si un equipo con partidos jugados quedaría fuera (no está en
  // ningún grupo del nuevo estado), bloquear el guardado.
  const oldTeams = new Set(Object.values(oldGroups).flat().filter(t=>t!=null));
  const newTeams = new Set(Object.values(newGroups).flat().filter(t=>t!=null));
  const removed = [...oldTeams].filter(t => !newTeams.has(t));
  if (removed.length) {
    const phaseMatches = await dbGetAll('matches', m => m.phaseId === phaseId && m.goalsA != null && m.goalsB != null);
    const teamsWithResults = new Set();
    phaseMatches.forEach(m => { teamsWithResults.add(m.teamA); teamsWithResults.add(m.teamB); });
    const risky = removed.filter(t => teamsWithResults.has(t));
    if (risky.length) {
      const allTeams = await dbGetAll('teams');
      const names = risky.map(t => allTeams.find(x=>x.id===t)?.name || `#${t}`).join(', ');
      showToast(`No se puede guardar: estos equipos tienen partidos con resultado y quedarían fuera de la fase: ${names}. Usá "Deshacer cambios" o devolvelos al grupo.`, 'error');
      return;
    }
  }

  await dbPut('phases',{...phase, groups:newGroups, groupRefs: window._assignGroupRefs||[]});
  showToast('Grupos guardados');
  closeGroupAssignModal();
  // Refrescar si la tabla está visible
  const containerId = `groups-container-${phaseId}`;
  if(document.getElementById(containerId)){
    renderGroupTable(phaseId, containerId, true);
  }
  // Notificar que cambió la asignación de grupos
  if(typeof notifyTeamChanged === 'function'){
    await notifyTeamChanged(null);
  }
}

function undoAssignChanges(){
  if(!window._assignOriginalGroups) return;
  window._assignGroups = JSON.parse(JSON.stringify(window._assignOriginalGroups));
  window._assignGroupRefs = JSON.parse(JSON.stringify(window._assignOriginalGroupRefs||[]));
  renderAssignGroupSlots();
  renderAssignTeamsList(window._assignAllTeams||[], window._assignGroups||{});
  if(typeof showToast === 'function') showToast('Cambios deshechos');
}

function closeGroupAssignModal(){
  const el = document.getElementById('group-assign-wrap');
  if(el) el.innerHTML='';
  delete window._assignOriginalGroups;
  delete window._assignOriginalGroupRefs;
  delete window._assignGroupRefs;
}

/* ----------------------------------------------------------
   RESOLUCIÓN DINÁMICA DE EQUIPOS EN GRUPOS (temporada actual)
   ---------------------------------------------------------- */
async function resolveTeamData(teamIdOrName){
  const teams = await getForSeason('teams');
  let team;

  // Si es un número, buscar por ID
  if(typeof teamIdOrName === 'number' || Number.isFinite(parseInt(teamIdOrName))){
    const tid = parseInt(teamIdOrName);
    team = teams.find(t => t.id === tid);
  } else {
    // Fallback: buscar por nombre para datos antiguos
    team = teams.find(t => t.name === teamIdOrName);
  }

  if(!team) {
    // Si no existe, devolver como desconocido
    return {name: `${teamIdOrName}`, color: '#888', ini: '?'};
  }

  // Devolver datos actuales del equipo (dinámicos)
  return {
    name: team.name,
    color: team.color || '#888',
    color2: team.color2 || team.color || '#888',
    ini: team.ini || '?'
  };
}

/* ----------------------------------------------------------
   RENDER ADMIN — PARTIDOS (registro de resultados)
   ---------------------------------------------------------- */
