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

   ------------------------------------------------------------
   RECORRIDO DE LUIS
   ------------------------------------------------------------
   Luis juega UN partido por fecha (los otros 3 los simula). Maneja un
   equipo y enfrenta a otro. En la temporada tiene que manejar a TODOS
   los equipos del grupo y enfrentar a TODOS los equipos del grupo.

   Formalización: σ = permutación de los n equipos, σ(x) = rival cuando
   Luis maneja a x. Los n partidos de Luis son las aristas {x, σ(x)}.
     - σ(x) ≠ x           → no jugar contra uno mismo.
     - σ(σ(x)) ≠ x         → nada de ciclos de 2: sería el MISMO partido
                             dos veces (en ida el cruce {x,y} existe una
                             sola vez).
     - las n aristas deben cubrir TODAS las fechas del calendario.

   n impar → n fechas, n partidos de Luis → exactamente 1 por fecha.
   n par   → n-1 fechas, n partidos de Luis → exactamente 1 fecha
             termina con 2 partidos suyos (forzoso por conteo: n
             partidos en n-1 fechas, todas cubiertas, no hay forma de
             evitarlo). Decisión del usuario: los grupos de 8 se quedan
             con esa fecha doble.

   n=4 y n=6 son IMPOSIBLES — verificado por enumeración exhaustiva (no
   muestreo), 0 recorridos en ambos. No es un bug ni depende del
   calendario particular: K4 y K6 tienen 1-factorización única salvo
   isomorfismo, así que es imposible para CUALQUIER calendario de esos
   tamaños. Conteo de recorridos válidos por n (enumeración exhaustiva):
   n=4→0, n=5→4, n=6→0, n=7→12, n=8→252. El modal avisa "imposible por
   matemática, no por bug" para n=4/6 y genera el calendario igual, sin
   partidos marcados para Luis.

   LIMITACIÓN CONOCIDA (no resuelta a propósito): si después de generar,
   el admin edita una fecha a mano con openRondaModal, el campo
   `luisTeam` de los partidos puede quedar inconsistente — el partido
   marcado puede dejar de existir, o el recorrido completo puede
   romperse (un σ que ya no cubre todas las fechas). No hay ninguna
   revalidación automática cuando se edita a mano.
   ============================================================ */

function _fxEsc(v){ return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* Ícono SVG inline estilo Lucide (gamepad-2) — marca el partido de Luis en el
   preview del modal y en renderRondasAdmin (matches.js). Nunca emojis. */
const _FX_GAMEPAD_ICON = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="2"/></svg>`;

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

function _fxPairKey(a,b){
  const aN = Number(a), bN = Number(b);
  return aN<bN ? `${aN}||${bN}` : `${bN}||${aN}`;
}

/* Presupuesto de nodos explorados por intento de búsqueda. Calibrado
   midiendo n=4..16 (el peor caso real): con 2000 nodos, la probabilidad de
   encontrar recorrido dentro de los 20 reintentos de
   _fxGenerateCalendarAndRoute es >99.9999% para n=14/15/16 (los más caros),
   y el peor caso teórico de los 20 reintentos ronda ~90ms — nada que
   necesite el loader (que recién aparece a los 300ms). n=8, el tamaño real
   de un grupo de la TSC, ni se acerca a gastar el presupuesto (ver test:
   max real sin ningún presupuesto ya era ~1ms). Subir el número mejora la
   tasa de éxito por intento pero también el peor caso por intento — 2000
   es el punto donde ambos quedan cómodos a la vez. */
const FX_ROUTE_NODE_BUDGET = 2000;

/* ------------------------------------------------------------
   RECORRIDO DE LUIS — ver doc completa arriba (cabecera del archivo).

   Busca σ por backtracking, asignando σ(x) equipo por equipo (NO
   fuerza bruta sobre las n! permutaciones: para n=16 son ~2·10^13,
   inviable en el navegador). Dos estructuras de poda:
     - bijectividad + anti-fixed-point + anti-2-ciclo (obligatorias,
       definen qué es un σ válido);
     - poda por cobertura: si a esta altura ya no alcanzan los partidos
       que quedan por asignar para cubrir las fechas que faltan, cortar
       la rama.
   Ninguna poda evita que, con mala suerte en el orden de exploración,
   una rama tarde mucho en cerrarse — por eso hay además un PRESUPUESTO
   de nodos: pasado `nodeBudget`, la búsqueda se corta sola (no cuelga
   la pestaña) y devuelve inconclusa en vez de agotar el árbol.

   `rounds` es UNA vuelta (ida o vuelta, no la temporada completa con
   legs=2 — eso lo maneja _fxBuildLuisRouteForLegs).

   Devuelve { route, exhausted }:
     - route: [{ronda, teamA, teamB, maneja}] (n entradas, ronda
       1-indexado LOCAL a `rounds`) si encontró, si no null.
     - exhausted: true  → se recorrió TODO el árbol de búsqueda posible
                          para este calendario (no se cortó por
                          presupuesto). route=null acá significa
                          IMPOSIBLE para este calendario en particular
                          (y, para n=4/n=6, para cualquier calendario —
                          ver header).
                  false → se agotó el presupuesto de nodos antes de
                          terminar de explorar. route=null acá es
                          INCONCLUSO, no imposible: vale la pena
                          reintentar con otro calendario.
   ------------------------------------------------------------ */
function fxBuildLuisRoute(rounds, teamIds, nodeBudget=FX_ROUTE_NODE_BUDGET){
  const n = teamIds.length;
  if(n < 3 || !rounds.length) return { route:null, exhausted:true }; // <3 equipos: ningún ciclo válido existe, siempre

  // pairKey -> partido real {ronda, teamA, teamB}. El round-robin garantiza
  // que cada par de equipos del grupo tiene EXACTAMENTE un partido acá.
  const matchByPair = new Map();
  rounds.forEach((rd, ri)=>{
    rd.pairs.forEach(p=>{
      matchByPair.set(_fxPairKey(p.a, p.b), { ronda: ri+1, teamA: p.a, teamB: p.b });
    });
  });
  const totalRounds = rounds.length;

  const order        = _fxShuffle(teamIds.map(Number)); // orden de asignación (aleatorio: recorrido distinto por sorteo)
  const sigma         = new Map(); // domain -> value, según se van fijando
  const usedAsValue   = new Set(); // equipos ya elegidos como rival de alguien (bijectividad)
  const coveredRounds = new Set();

  let nodesVisited = 0;
  let budgetHit    = false;

  function backtrack(i){
    nodesVisited++;
    if(nodesVisited > nodeBudget){ budgetHit = true; return false; }
    if(i === n) return coveredRounds.size === totalRounds;

    const x = order[i];
    const remainingAfterThis = n - i - 1; // equipos que quedan por procesar DESPUÉS de este
    const candidates = _fxShuffle(
      order.filter(y => y!==x && !usedAsValue.has(y) && sigma.get(y)!==x)
    );

    for(const y of candidates){
      if(budgetHit) return false;
      const match = matchByPair.get(_fxPairKey(x, y));
      if(!match) continue; // no debería faltar en un round-robin completo, pero por las dudas

      const isNewRound = !coveredRounds.has(match.ronda);
      // Poda de cobertura: si tras este paso todavía faltarían más fechas
      // por cubrir que pasos disponibles para cubrirlas, esta rama no puede cerrar.
      const roundsLeftAfter = totalRounds - coveredRounds.size - (isNewRound?1:0);
      if(roundsLeftAfter > remainingAfterThis) continue;

      sigma.set(x, y);
      usedAsValue.add(y);
      if(isNewRound) coveredRounds.add(match.ronda);

      if(backtrack(i+1)) return true;

      sigma.delete(x);
      usedAsValue.delete(y);
      if(isNewRound) coveredRounds.delete(match.ronda);
    }
    return false;
  }

  const found = backtrack(0);
  if(!found) return { route:null, exhausted: !budgetHit };

  const route = [];
  sigma.forEach((y, x)=>{
    const match = matchByPair.get(_fxPairKey(x, y));
    route.push({ ronda: match.ronda, teamA: match.teamA, teamB: match.teamB, maneja: x });
  });
  route.sort((a,b)=>a.ronda-b.ronda);
  return { route, exhausted:false };
}

/* legs=2: un recorrido INDEPENDIENTE por vuelta (σ distinto en ida y en
   vuelta) — decisión del usuario: así Luis maneja y enfrenta a todos DOS
   veces en la temporada completa (una por vuelta), no una sola vez total.
   `rounds` acá SÍ es la temporada completa (ida+vuelta concatenada, como
   la devuelve fxBuildRoundRobin con legs=2). Mismo contrato {route,exhausted}
   que fxBuildLuisRoute: si CUALQUIERA de las dos vueltas queda inconclusa
   por presupuesto, el combinado también cuenta como inconcluso (no imposible). */
function _fxBuildLuisRouteForLegs(rounds, teamIds, legs, nodeBudget=FX_ROUTE_NODE_BUDGET){
  if(parseInt(legs,10) !== 2) return fxBuildLuisRoute(rounds, teamIds, nodeBudget);
  const half = rounds.length/2;
  const ida = fxBuildLuisRoute(rounds.slice(0, half), teamIds, nodeBudget);
  if(!ida.route) return { route:null, exhausted: ida.exhausted };
  const vuelta = fxBuildLuisRoute(rounds.slice(half), teamIds, nodeBudget);
  if(!vuelta.route) return { route:null, exhausted: vuelta.exhausted };
  vuelta.route.forEach(r=>{ r.ronda += half; }); // remapear a numeración GLOBAL de fecha
  return { route: ida.route.concat(vuelta.route), exhausted:false };
}

const FX_ROUTE_MAX_ATTEMPTS = 20;

/* Genera un calendario y busca el recorrido de Luis; si no existe, REBARAJA
   el calendario entero (no solo el recorrido) y reintenta, hasta ~20 veces.
   Si ninguno de los intentos da recorrido, se queda con el ÚLTIMO calendario
   igual — es válido como calendario aunque el recorrido no exista.

   status devuelto:
     'found'      → route tiene los n (o 2n) partidos de Luis.
     'impossible' → los 20 intentos probaron, cada uno agotando TODO su
                     árbol de búsqueda, que no hay recorrido — matemática,
                     no presupuesto (n=4 y n=6 caen siempre acá).
     'budget'     → al menos uno de los 20 intentos se cortó por
                     presupuesto sin terminar de explorar: inconcluso, no
                     probado imposible (raro con FX_ROUTE_NODE_BUDGET
                     calibrado para n hasta 16 — ver header). */
function _fxGenerateCalendarAndRoute(teamIds, legs){
  let rounds = null, route = null, allExhausted = true;
  for(let attempt=0; attempt<FX_ROUTE_MAX_ATTEMPTS; attempt++){
    rounds = fxBuildRoundRobin(teamIds, legs);
    const result = _fxBuildLuisRouteForLegs(rounds, teamIds, legs);
    if(result.route){ route = result.route; break; }
    if(!result.exhausted) allExhausted = false;
  }
  const status = route ? 'found' : (allExhausted ? 'impossible' : 'budget');
  return { rounds, route, status };
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
  // El calendario Y el recorrido de Luis se sortean juntos acá — _fxGenerateCalendarAndRoute
  // ya reintenta hasta 20 veces internamente y devuelve `status`, que es lo único que
  // decide qué aviso mostrar (ver renderFixtureGenModal). Nada de listas hardcodeadas.
  const { rounds, route, status } = _fxGenerateCalendarAndRoute(st.teamIds, st.legs);
  st.rounds = rounds;
  st.route  = route;
  st.status = status;
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

  // Partidos de Luis por fecha (índice 1-based, como `ronda`). Puede haber 2 entradas
  // en UNA sola fecha (grupo par: la "fecha doble", ver header) — el resto, 0 o 1.
  const luisByRonda = {};
  if(st.route) st.route.forEach(r=>{ (luisByRonda[r.ronda] ||= []).push(r); });

  const preview = st.rounds.map((rd, i)=>{
    const ronda    = i+1;
    const luisHere = luisByRonda[ronda] || [];
    return `
    <div style="padding:7px 10px;border-bottom:1px solid var(--brd);">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <span style="font-family:'Barlow Condensed';font-weight:700;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:var(--txt2);">Fecha ${ronda}</span>
        ${rd.libre!=null?`<span style="font-size:10px;color:var(--gold);">Libre: ${_fxEsc(nameOf(rd.libre))}</span>`:''}
        ${luisHere.length===2?`<span style="font-size:10px;color:var(--gold);font-weight:600;">2 partidos de Luis</span>`:''}
      </div>
      ${rd.pairs.map(p=>{
        const luisEntry = luisHere.find(r=>_fxPairKey(r.teamA,r.teamB)===_fxPairKey(p.a,p.b));
        return `
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:center;font-size:12px;padding:2px 4px;${luisEntry?'background:rgba(201,168,76,0.10);border-radius:4px;':''}">
          <span style="text-align:right;">${_fxEsc(nameOf(p.a))}</span>
          <span style="color:var(--txt3);font-size:10px;">vs</span>
          <span>${_fxEsc(nameOf(p.b))}</span>
        </div>
        ${luisEntry?`<div style="display:flex;align-items:center;justify-content:center;gap:4px;font-size:10px;color:var(--gold);padding-bottom:3px;">${_FX_GAMEPAD_ICON}Luis maneja a ${_fxEsc(nameOf(luisEntry.maneja))}</div>`:''}`;
      }).join('')}
    </div>`;
  }).join('');

  const replaceWarn = st.existingIds.length ? `
    <div style="margin-bottom:10px;padding:8px 10px;background:rgba(201,168,76,0.12);border:1px solid var(--gold-b);border-radius:var(--r);font-size:12px;color:var(--gold);display:flex;gap:6px;align-items:flex-start;">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <span>Se reemplazarán las ${st.existingRondas} fecha(s) vacía(s) que ya tiene el grupo. Ningún partido tiene resultado, así que no se pierde nada.</span>
    </div>` : '';

  // El aviso lo decide `status` (calculado por _fxGenerateCalendarAndRoute), NUNCA una
  // lista hardcodeada de tamaños de grupo — el buscador ya distingue "imposible por
  // matemática" (agotó el árbol de búsqueda en los 20 intentos) de "no encontramos
  // dentro del presupuesto" (inconcluso, reintentable con otro sorteo). Duplicar ese
  // conocimiento acá es justo lo que se desincronizó cuando la lista era [4,6] y un
  // grupo de 2 equipos (también imposible) se quedaba sin ningún aviso.
  const luisImpossibleWarn = st.status==='impossible' ? `
    <div style="margin-bottom:10px;padding:8px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);font-size:12px;color:var(--txt2);display:flex;gap:6px;align-items:flex-start;">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>Con ${st.teamIds.length} equipos no existe un partido de Luis por fecha que lo lleve a manejar y enfrentar a todos — es <strong style="color:var(--txt);">imposible por matemática, no por bug</strong> (para cualquier calendario, no solo este). El calendario se genera igual, solo que sin partidos marcados para Luis.</span>
    </div>` : '';

  // status==='budget': distinto del anterior a propósito — acá NO está probado que sea
  // imposible, solo que no se encontró recorrido dentro del presupuesto de nodos en
  // ninguno de los 20 sorteos que se probaron. "Barajar de nuevo" puede resolverlo.
  const luisBudgetWarn = st.status==='budget' ? `
    <div style="margin-bottom:10px;padding:8px 10px;background:var(--card2);border:1px solid var(--brd);border-radius:var(--r);font-size:12px;color:var(--txt2);display:flex;gap:6px;align-items:flex-start;">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span>No se encontró un partido de Luis por fecha para este calendario en particular — probá <strong style="color:var(--txt);">"Barajar de nuevo"</strong>. No está probado que sea imposible, solo no salió en los sorteos que se intentaron.</span>
    </div>` : '';

  const luisSummary = st.status==='found' ? `
    <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--gold);margin-bottom:10px;">
      ${_FX_GAMEPAD_ICON}<span>Luis maneja los ${st.teamIds.length} equipos y enfrenta a los ${st.teamIds.length}${st.legs===2?' (dos veces cada uno: una por vuelta)':''} — el partido marcado en cada fecha.</span>
    </div>` : '';

  wrap.innerHTML = `
  <div class="modal-overlay open">
    <div class="modal" style="max-width:520px;position:relative;">
      <div class="sala-loader sala-loader-hide" id="fx-loader" aria-hidden="true" style="border-radius:var(--rl);">
        <img src="assets/tsc_sin_fondo.png" alt="">
        <div class="sala-loader-text" id="fx-loader-text" aria-live="polite">Generando fechas</div>
        <div class="sala-loader-bar"><div class="sala-loader-fill" id="fx-loader-fill"></div></div>
      </div>
      <div class="modal-hdr">
        <div class="modal-title">Generar fechas · Grupo ${String.fromCharCode(65+st.groupIdx)}</div>
        <button class="modal-close" onclick="closeFixtureGenModal()">×</button>
      </div>
      <div class="modal-body">
        ${replaceWarn}
        ${luisImpossibleWarn}
        ${luisBudgetWarn}
        ${luisSummary}
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
  if(window._fxLoaderTimer){ clearTimeout(window._fxLoaderTimer); window._fxLoaderTimer = null; }
  window._fxState = null;
  const el = document.getElementById('fixture-gen-wrap');
  if(el) el.innerHTML = '';
}

/* ------------------------------------------------------------
   Loader — mismo componente visual que la Sala de Trofeos
   (.sala-loader / css/redesign.css), reusado tal cual. Arranca oculto
   (sala-loader-hide) y solo se muestra si fxGenerate tarda más de
   ~300ms: un parpadeo de menos que eso se ve peor que nada. La barra
   avanza por etapa REAL (borrando → escribiendo partidos → guardando
   libres) — nunca un porcentaje inventado.
   ------------------------------------------------------------ */
function _fxSetLoaderProgress(pct){
  const fill = document.getElementById('fx-loader-fill');
  if(fill) fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}
function _fxShowLoader(){ document.getElementById('fx-loader')?.classList.remove('sala-loader-hide'); }
function _fxHideLoader(){ document.getElementById('fx-loader')?.classList.add('sala-loader-hide'); }

/* ------------------------------------------------------------
   Guardado
   ------------------------------------------------------------ */
async function fxGenerate(){
  const st = window._fxState;
  if(!st || !st.rounds?.length) return;
  const {phaseId, groupIdx} = st;

  const btn = document.getElementById('fx-save-btn');
  if(btn){ btn.disabled = true; btn.style.opacity = '0.5'; btn.textContent = 'Generando…'; }

  _fxSetLoaderProgress(0);
  window._fxLoaderTimer = setTimeout(_fxShowLoader, 300);
  const stopLoader = ()=>{
    if(window._fxLoaderTimer){ clearTimeout(window._fxLoaderTimer); window._fxLoaderTimer = null; }
    _fxHideLoader();
  };

  try{
    // Revalidar contra la DB: alguien pudo registrar un resultado con el modal abierto.
    const current = await dbGetAll('matches', m=>m.phaseId===phaseId && m.groupIdx===groupIdx);
    const locked  = current.filter(_fxIsPlayed);
    if(locked.length){
      stopLoader();
      showToast('El grupo ya tiene partidos jugados — no se generó nada','error');
      closeFixtureGenModal();
      await showMatchGroupTable(phaseId, groupIdx);
      return;
    }

    // Fuera las fechas vacías previas (sin resultados: no hay historial que limpiar).
    if(current.length){
      _fxSetLoaderProgress(20);
      await dbDeleteMany('matches', current.map(m=>m.id));
    }

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

    // luisTeam: aditivo — solo los partidos del recorrido lo llevan. Si st.route es
    // null (status 'impossible' o 'budget'), ningún item lo lleva y el calendario se
    // guarda igual (ver header: "el calendario se genera igual, sin partidos marcados").
    if(st.route){
      st.route.forEach(r=>{
        const key = _fxPairKey(r.teamA, r.teamB);
        const item = items.find(it => it.ronda===r.ronda && _fxPairKey(it.teamA, it.teamB)===key);
        if(item) item.luisTeam = r.maneja;
      });
    }

    _fxSetLoaderProgress(50);
    await dbAddMany('matches', items);

    // rondaMeta: limpiar el grupo (libres y fechas programadas viejas) y grabar los libres nuevos.
    _fxSetLoaderProgress(80);
    const phase = await dbGet('phases', phaseId);
    const meta  = {...(phase?.rondaMeta||{})};
    const mine  = new RegExp(`^${groupIdx}_\\d+(_date)?$`);
    Object.keys(meta).forEach(k=>{ if(mine.test(k)) delete meta[k]; });
    st.rounds.forEach((rd, i)=>{ if(rd.libre!=null) meta[`${groupIdx}_${i+1}`] = rd.libre; });
    await dbPut('phases', {...phase, rondaMeta:meta});
    _fxSetLoaderProgress(100);

    // El navegador de fechas apuntaba a una ronda que ya no existe.
    delete window[`ronda_view_${phaseId}_${groupIdx}`];
    window._matchRondaActual = 1;
    invalidateStandingsCache(phaseId);

    stopLoader();
    showToast(`${st.rounds.length} fechas generadas · ${items.length} partidos`);
    closeFixtureGenModal();
    await showMatchGroupTable(phaseId, groupIdx);
  }catch(err){
    stopLoader();
    console.error('[fixture-gen]', err);
    showToast('Error al generar las fechas','error');
    if(btn){ btn.disabled = false; btn.style.opacity = ''; btn.textContent = `Generar ${st.rounds.length} fechas`; }
  }
}
