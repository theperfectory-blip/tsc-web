/* ============================================================
   Editor de mejoras de jugadores — componente montable (slice 2.0-1.B).
   - mejoras.html (presidente): al cargar, iniciarPagina() lo monta en #mej-host.
   - Tool PES5 (admin, panel): MEJORAS_EDITOR.montar(contenedor, {modo:"admin", ...}).
     Sin iframe ni postMessage: onAplicar({jugadorId, draft, costo}) y onCerrar().
   Todo queda en una IIFE. Solo se exponen MEJORAS_EDITOR, los handlers de data-on*
   (events.js solo llama funciones globales sin puntos) y mejToggleTheme.
   ============================================================ */
window.MEJORAS_EDITOR = (function(){
'use strict';
/* Markup del editor (antes estaba en mejoras.html). Lo inserta montar(). */
const MEJ_MARKUP = `
<div id="mej-root" class="ep-root" data-vista="plantilla">
<div id="ep-gate" style="display:none;max-width:480px;margin:60px auto;padding:24px;text-align:center;color:var(--txt2);"></div>
<div class="ep-shell" id="ep-shell" style="display:none;">
  <header class="ep-top">
    <a class="ep-top-back" href="index.html" aria-label="Volver a la web"><svg class="icn" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></a>
    <div class="ep-top-badge" id="ep-top-badge" aria-hidden="true">TSC</div>
    <div class="ep-top-txt">
      <span class="ep-top-name" id="ep-top-name">Mi equipo</span>
      <span class="ep-top-sub">Mejoras de jugadores</span>
    </div>
    <div class="ep-top-acc">
      <button class="ep-top-btn" id="ep-acc-btn" aria-label="Cuenta" aria-expanded="false" data-onclick="mejToggleCuenta()"><svg class="icn" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></button>
      <div class="ep-acc-menu" id="ep-acc-menu" hidden>
        <div class="ep-acc-sesion" id="ep-auth-status"></div>
        <button class="ep-theme-btn" id="ep-theme-btn" data-onclick="mejToggleTheme()"></button>
      </div>
    </div>
  </header>

  <div class="ep-layout">
    <aside class="ep-roster">
      <section class="ep-saldo" aria-label="YunaCoins del equipo">
        <div class="ep-saldo-lbl">Saldo del equipo</div>
        <div class="ep-saldo-val" title="Saldo total de YunaCoins del equipo"><b id="ep-balance-total">0</b><span>YC</span></div>
        <div class="ep-cap">
          <div class="ep-cap-txt"><span>Queda del tope de la temporada</span><span><b id="ep-balance-general">0</b> / <span id="ep-hero-general-cap">0</span></span></div>
          <div class="ep-cap-bar" aria-hidden="true"><i id="ep-cap-fill"></i></div>
        </div>
        <div class="ep-bono"><span>Bono suscriptores</span><b id="ep-balance-sub">0</b></div>
      </section>

      <div class="ep-access">
        <button class="ep-acc formation" data-onclick="openFormationModal()"><span class="ep-acc-t">Formación</span><span class="ep-acc-s" id="ep-form-sub">Gratis</span></button>
        <button class="ep-acc" data-onclick="openAuditModal()"><span class="ep-acc-t">Pedidos</span><span class="ep-acc-s" id="ep-pedidos-sub">Sin pendientes</span><span class="badge" id="ep-hist-badge">0</span></button>
      </div>

      <div class="ep-pend" id="ep-pend" hidden></div>

      <div class="ep-roster-hd"><input id="ep-search" type="search" placeholder="Buscar jugador" aria-label="Buscar jugador" data-oninput="renderRoster()"></div>

      <div class="ep-seg" role="tablist" aria-label="Grupo de la plantilla">
        <button role="tab" id="ep-seg-titular" aria-selected="true" data-onclick="setSquadTab('titular')">Titulares <b id="ep-seg-n-titular">0</b></button>
        <button role="tab" id="ep-seg-suplente" aria-selected="false" data-onclick="setSquadTab('suplente')">Suplentes <b id="ep-seg-n-suplente">0</b></button>
        <button role="tab" id="ep-seg-reserva" aria-selected="false" data-onclick="setSquadTab('reserva')">Reserva <b id="ep-seg-n-reserva">0</b></button>
      </div>

      <div class="ep-roster-list" id="ep-roster-list"></div>
    </aside>

    <section class="ep-editor">
      <div class="ep-edit-hd">
        <button class="ep-back" data-onclick="mejVolverPlantilla()" aria-label="Volver a la plantilla"><svg class="icn" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>Plantilla</button>
        <span class="ep-edit-pos" id="ep-edit-pos">Titular 1 de 11</span>
        <button class="ep-navbtn" data-onclick="mejPasar(-1)" aria-label="Jugador anterior"><svg class="icn" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
        <button class="ep-navbtn" data-onclick="mejPasar(1)" aria-label="Jugador siguiente"><svg class="icn" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>
      </div>

      <h1 id="ep-title" class="ep-sr">Editar jugador</h1>

      <div class="ep-card" id="ep-card"></div>

      <nav class="ep-pager" aria-label="Páginas de atributos">
        <button class="ep-pgbtn" id="ep-prev" data-onclick="gotoPage(-1)" title="Pagina anterior" aria-label="Pagina anterior"><svg class="icn" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
        <div class="ep-pgcenter">
          <div class="ep-pgtitle"><span id="ep-page-title">Principales</span> <span class="ep-pgnum" id="ep-pgnum">1/4</span></div>
          <div class="ep-pgdots" id="ep-pgdots" aria-hidden="true"></div>
        </div>
        <button class="ep-pgbtn" id="ep-next" data-onclick="gotoPage(1)" title="Pagina siguiente" aria-label="Pagina siguiente"><svg class="icn" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>
      </nav>

      <div class="ep-rows" id="ep-rows"></div>
      <div class="ep-hint" id="ep-hint" hidden></div>

      <div class="ep-cart">
        <div class="ep-cart-info">
          <span class="ep-cart-count" id="ep-cart-count">Sin cambios</span>
          <span class="ep-cart-left" id="ep-cart-left"></span>
        </div>
        <div class="ep-cart-tot"><b id="ep-cost">0</b></div>
        <div id="ep-warn" class="ep-warn"></div>
        <div class="ep-cart-actions">
          <button class="ep-cart-btn" data-onclick="discardChanges()" aria-label="Descartar cambios" title="Descartar cambios"><svg class="icn" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v5h5"/></svg></button>
          <button class="ep-cart-go" id="ep-apply" data-onclick="openApplyConfirm()"><svg class="icn" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>Revisar</button>
        </div>
      </div>
    </section>
  </div>
</div>

<div id="ep-confirm-wrap"></div>
<div id="ep-audit-wrap"></div>
<div id="ep-pitch-wrap"></div>
<div id="ep-alt-wrap"></div>
</div>
`;
/* Cierra un modal solo si el click fue en el fondo (reemplaza onclick="if(event.target===this)..."; ver js/events.js). */
function closeIfBackdrop(e, fn){ if(e.target===e.currentTarget) fn(); }
function jsq(s){ return String(s).replace(/'/g,"\\'"); }

/* ================= auth (Firebase) — reusa js/auth.js del proyecto ================= */
/* auth.js necesita estos globales minimos: STATE.mode, openModal/closeModal (toggle
   .open, via components.css) y showToast (acá alias del mini-toast propio del prototipo). */
function openModal(id){ document.getElementById(id)?.classList.add('open'); _syncScrollLock(); }
function closeModal(id){ document.getElementById(id)?.classList.remove('open'); _syncScrollLock(); }

/* Mientras haya un modal abierto (confirmar, historial, formacion, login) la pagina de atras
   no debe scrollear: pone/saca html.ep-lock (ver "Scroll aislado" en mejoras.html). Los tres
   modales propios se montan/desmontan cambiando el innerHTML de su contenedor, asi que se
   observan esos contenedores; el de login pasa por openModal/closeModal. */
function _syncScrollLock(){
  const abierto = !!document.querySelector('.ep-overlay, .modal-overlay.open');
  document.documentElement.classList.toggle('ep-lock', abierto);
}
function showToast(msg){ showMiniToast(msg); }

/* Sobreescribe el renderAuthUI() generico de auth.js (pensado para la topbar
   real) con uno propio para este mock: actualiza el badge de estado y
   controla el gate duro de acceso (ep-gate vs ep-shell). */
/* Slice Q2: modo admin. La Tool PES5 monta el editor con sus datos (sin iframe ni
   postMessage) y recibe el borrador por onAplicar. En este modo NO escribe en Firestore. */
let ADMIN_EMBED = false; // true solo dentro de montar(contenedor, {modo:'admin'}) (Tool PES5)
let ADMIN_PENDIENTE = null; // cambios ya guardados en la tool para el jugador abierto (formato de la tool)
let EQUIPO_TSC = null; // doc de tsc-src/js/teams.js para AUTH.teamId, con .pes5Club
let _gateTeamId = undefined; // evita refetch repetido del mismo equipo
let _gatePlantillaClub = undefined; // club PES5 con el que se cargo PLAYERS actualmente

async function renderAuthUI(){
  if (ADMIN_EMBED) return; // modo admin: no hay gate, los datos los manda la tool
  const el = document.getElementById('ep-auth-status');
  if (el){
    if (!AUTH.user) el.innerHTML = `<button class="ep-theme-btn" data-onclick="openAuthModal()">Iniciar sesion</button>`;
    else if (!AUTH.teamId) el.textContent = `${escHtml(AUTH.profile?.displayName||AUTH.user.email)} · sin equipo asignado`;
    else el.innerHTML = `${escHtml(AUTH.profile?.displayName||AUTH.user.email)} <button class="ep-theme-btn" data-onclick="authSignOut()">Salir</button>`;
  }

  if (AUTH.user){
    try {
      const q = await firebase.firestore().collection('pedidos_pes5').where('uid', '==', AUTH.user.uid).get();
      actualizarBadgeHistorial(q.docs.map(d => d.data()));
    } catch (e) {}
  }

  const gate = document.getElementById('ep-gate'), shell = document.getElementById('ep-shell');
  if (!gate || !shell) return;

  if (!AUTH.user){
    EQUIPO_TSC = null; _gateTeamId = undefined;
    gate.style.display = ''; shell.style.display = 'none';
    gate.innerHTML = `<p>Iniciá sesión para editar tu equipo.</p><button class="ep-btn primary" data-onclick="openAuthModal()">Iniciar sesión</button>`;
    return;
  }
  if (!AUTH.teamId){
    EQUIPO_TSC = null; _gateTeamId = undefined;
    gate.style.display = ''; shell.style.display = 'none';
    gate.innerHTML = `<p>Tu cuenta todavía no tiene un equipo de la TSC asignado. Pedile al admin que te vincule uno.</p>`;
    return;
  }
  if (_gateTeamId !== AUTH.teamId){
    _gateTeamId = AUTH.teamId;
    try { EQUIPO_TSC = await dbGet('teams', AUTH.teamId); } catch(e){ EQUIPO_TSC = null; }
    RULES = await cargarReglasFirestore();
    RULES = YUNACOINS_RULES.reglasConExtra(RULES, await cargarTopeExtraEquipo(AUTH.teamId));
    // Slice D2: recalcular el presupuesto disponible (topes - gastado - pedidos pendientes)
    await recalcularPresupuestoReal();
  }
  if (!EQUIPO_TSC || EQUIPO_TSC.pes5ClubIdx == null){
    gate.style.display = ''; shell.style.display = 'none';
    gate.innerHTML = `<p>Tu equipo (<b>${escHtml(EQUIPO_TSC?.name||'')}</b>) todavía no tiene un club de PES5 vinculado. Esperá a que Luis lo asigne.</p>`;
    return;
  }
  if (!PLAYERS.length || _gatePlantillaClub !== EQUIPO_TSC.pes5ClubIdx){
    let hayPlantilla = false;
    try { hayPlantilla = await cargarPlantillaReal(AUTH.teamId, EQUIPO_TSC.pes5ClubIdx); } catch(e){}
    if (!hayPlantilla){
      PLAYERS = []; PLAYER_BY_ID = {}; _gatePlantillaClub = undefined;
      gate.style.display = ''; shell.style.display = 'none';
      gate.innerHTML = `<p>Tu equipo (<b>${escHtml(EQUIPO_TSC.name)}</b> · ${escHtml(EQUIPO_TSC.pes5Club)}) todavía no fue publicado por Luis. Esperá a que corra la tool.</p>`;
      return;
    }
    _gatePlantillaClub = EQUIPO_TSC.pes5ClubIdx;
    APP.playerId = PLAYERS[0].id;
    loadDraft();
  }
  // Slice Q4: un solo editor a la vez por equipo. Si el admin lo esta editando, se muestra el aviso.
  const bq = await tomarBloqueoPresidente();
  if (!bq.ok){ mostrarBloqueoActivo(bq.de); return; }
  iniciarLatidoPresidente();
  gate.style.display = 'none'; shell.style.display = '';
  renderAll();
}
/* gate: recien se puede aplicar un pedido real con sesion + equipo + club PES5 asignados */
function puedeMandarPedido(){ return !!(AUTH.user && AUTH.teamId && EQUIPO_TSC?.pes5ClubIdx != null); }

/* ================= tema claro/oscuro (comparte clave con el resto de la app) ================= */

const SUN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>';

function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('ep-theme-btn');
  if(btn) btn.innerHTML = (theme==='light' ? MOON_SVG+'Oscuro' : SUN_SVG+'Claro');
}
function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme')==='light' ? 'light' : 'dark';
  const next = cur==='light' ? 'dark' : 'light';
  localStorage.setItem('tsc_theme', next);
  applyTheme(next);
}
applyTheme(localStorage.getItem('tsc_theme') || 'dark');

/* ================= datos oficiales (contexto_copa_subs1.md) ================= */

const MAIN_STATS = [
  {k:'atk',l:'Ataque',d:'Un valor mas alto favorece las posiciones atacantes.'},
  {k:'def',l:'Defensa',d:'Un valor mas alto favorece las posiciones defensivas.'},
  {k:'equ',l:'Equilibrio',d:'Indica la resistencia de un jugador ante las cargas del contrario.'},
  {k:'res',l:'Resistencia',d:'Si este valor es menor que 1/2, la velocidad y carreras pierden intensidad.'},
  {k:'vm', l:'Vel. maxima',d:'Un valor mas alto aumenta la velocidad de carrera.'},
  {k:'ace',l:'Aceleracion',d:'Rapidez con la que el jugador alcanza su velocidad maxima.'},
  {k:'rsp',l:'Respuesta',d:'Un valor mas alto aumenta la sensibilidad hacia balones sueltos y altos.'},
  {k:'agi',l:'Agilidad',d:'Cuanto mas alto sea este valor, mayor sera la agilidad del jugador.'},
  {k:'pcd',l:'Prec. conduccion',d:'Mejora la capacidad de posesion del balon del jugador al regatear.'},
  {k:'vcd',l:'Vel. conduccion',d:'Reduce la diferencia en velocidad entre movimiento normal y regate.'},
  {k:'ppc',l:'Prec. p.c.',d:'Aumenta la precision y el exito en pases ras del suelo.'},
  {k:'vpc',l:'Vel. p.c.',d:'Reduce la posibilidad de que el contrario intercepte el pase corto.'},
  {k:'ppl',l:'Prec. p.l.',d:'Aumenta la precision y el exito del pase largo.'},
  {k:'vpl',l:'Vel. p.l.',d:'Aumenta la velocidad del pase largo y centros.'},
  {k:'pre',l:'Precision',d:'Un valor mas alto aumenta la precision ante el gol.'},
  {k:'pot',l:'Potencia',d:'Aumenta la potencia del disparo.'},
  {k:'ted',l:'Tec. disp',d:'Efectivo al tirar a la porteria desde posiciones dificiles.'},
  {k:'psf',l:'Prec. saq. fta.',d:'Configura los niveles de precision de los saques de falta.'},
  {k:'efe',l:'Efecto',d:'Un valor mas alto aumenta el efecto curvado de la trayectoria del balon.'},
  {k:'cab',l:'Cabezazo',d:'Determina la capacidad de juego aereo del jugador.'},
  {k:'sal',l:'Salto',d:'Determina la altura de salto del jugador.'},
  {k:'tec',l:'Tecnica',d:'Valores bajos tienden a botar la pelota al atraparla, perdiendo tiempo.'},
  {k:'agr',l:'Agresividad',d:'Un valor mas alto aumenta la actitud atacante del jugador.'},
];
const MAIN_BY_KEY = Object.fromEntries(MAIN_STATS.map(s=>[s.k,s]));
const ECHO_KEYS = ['psf','efe','cab','sal','tec','agr'];
/* pagina 1 = las principales SIN las 6 que se repiten al inicio de la pagina 2 */
const PAGE1_STATS = MAIN_STATS.filter(s=>!ECHO_KEYS.includes(s.k));

const SEC_NEW = [
  {k:'ment',l:'Mentalidad',sc:99,d:'A mas alto, menor efecto de la fatiga; mejora cuando el equipo pierde.'},
  {k:'cons',l:'Regularidad en el juego',sc:8, d:'Cuanto mas alto, mayor consistencia del jugador.'},
  {k:'gk',  l:'Cualidades de portero',sc:99,d:'Nivel general de las cualidades de guardameta.'},
  {k:'teq', l:'Trabajo en equipo',sc:99,d:'Un valor mas alto aumenta las posibilidades de exito del pase.'},
  {k:'cond',l:'Estabilidad',sc:8, d:'Mantiene mejor su condicion jugando partidos consecutivos.'},
  {k:'wff', l:'Frec. pie malo',sc:8, d:'Determina cada cuanto usa la pierna no dominante.'},
  {k:'wfa', l:'Prec. pie malo',sc:8, d:'Determina la precision con la pierna no dominante.'},
  {k:'inj', l:'Res. lesion',sc:'inj',d:'Determina la resistencia del jugador a sufrir lesiones.'},
];
const INJ_DEF = SEC_NEW.find(s=>s.k==='inj');

/* orden y nombres verificados contra pes5-map.json > habilidades (mismo
   orden de bit = mismo orden que la pantalla del juego). Antes estaba
   partido en "ofensivas" / "defensivas y portero" como en otro PES, pero
   en el archivo real estan entremezcladas en un solo bloque continuo — no
   hay tal separacion en la pantalla real, es una sola lista. */
const ALL_ABILITIES = [
  {k:'dribbling',l:'Regate',d:'Los jugadores COM favorecen el regate cuando tienen la pelota.'},
  {k:'dribbleKeeping',l:'Habilidades de regate',d:'Puede proteger el balon con regates dificiles.'},
  {k:'positioning',l:'Cap. posic.',d:'Posiciona bien al jugador al recibir pases y centros.'},
  {k:'reaction',l:'Reaccion',d:'Mas riesgo de fuera de juego, pero mas oportunidades de gol.'},
  {k:'playmaker',l:'Cap. mando',d:'Aumenta la percepcion de la formacion de ataque del equipo.'},
  {k:'passing',l:'Pase',d:'Permite pases atrasados casi infalibles que conducen a goles.'},
  {k:'striker',l:'Hab. goleadora',d:'Posiciona al jugador en la linea delantera buscando el gol.'},
  {k:'oneVOneShoot',l:'Hab. gol. 1 a 1',d:'Mejora la precision del disparo mano a mano ante el portero.'},
  {k:'postPlayer',l:'Hab. jugador poste',d:'Mejora la posesion en la boca de la porteria y el pase directo.'},
  {k:'linePos',l:'Lineas',d:'Mejora ataque/defensa en la linea de fuera de juego.'},
  {k:'midRange',l:'Disparos medios',d:'Mejora la precision y el exito de los disparos desde media distancia.'},
  {k:'side',l:'Lado',d:'Mejora el juego en las areas cerca de la linea de banda.'},
  {k:'center',l:'Centro',d:'Mejora el juego en las areas centrales.'},
  {k:'pkKick',l:'Hab. lanza penaltis',d:'Mejora la precision al lanzar penaltis.'},
  {k:'oneTouchPass',l:'Hab. pase 1 toque',d:'Mejora la precision en el juego directo (paredes).'},
  {k:'outside',l:'Exterior',d:'Usa la parte externa del pie para golpear el balon.'},
  {k:'manMarkClose',l:'Marcar hombre',d:'Mejora la capacidad de marcar de cerca a un rival especifico.'},
  {k:'sliding',l:'Hab. deslizandose',d:'Mejora la precision en los cortes (entradas).'},
  {k:'manMark',l:'Marcaje',d:'Buena colocacion y capacidad de permanecer con el hombre marcado.'},
  {k:'dfLine',l:'Ctrl. linea defensa',d:'Ajusta la linea defensiva para atrapar al rival en fuera de juego.'},
  {k:'pkKeeper',l:'Hab. portero penaltis',d:'Mejora la habilidad para detener penaltis.'},
  {k:'oneVOneKeeper',l:'Hab. port 1 a 1',d:'Buena respuesta y mayor habilidad para parar 1 contra 1.'},
  {k:'longThrow',l:'Hab. saque largo',d:'Aumenta la distancia del saque de banda.'},
];
const ALL_ABILITY_KEYS = ALL_ABILITIES.map(a=>a.k);
const ABILITY_BY_KEY = Object.fromEntries(ALL_ABILITIES.map(a=>[a.k,a]));

/* nombres tal como aparecen en la version en español del juego (verificados
   in-game esta sesion, ver pes5-map.json > posiciones — antes tenian
   terminologia generica de otros PES que no coincidia con esta version) */
const POSITIONS = [
  {k:'CF', l:'Delantero centro'},
  {k:'SS', l:'Segundo delantero'},
  {k:'WG', l:'Extremo'},
  {k:'AMF',l:'Mediapunta'},
  {k:'SMF',l:'Volante'},
  {k:'CMF',l:'Centrocampista central'},
  {k:'WB', l:'Lateral'},
  {k:'DMF',l:'Centrocampista defensivo'},
  {k:'SB', l:'Carrilero'},
  {k:'CB', l:'Central'},
  {k:'CWP',l:'Líbero'},
  {k:'GK', l:'Portero'},
];
const POS_BY_KEY = Object.fromEntries(POSITIONS.map(p=>[p.k,p]));

const PAGES = ['Principales','Secundarios','Habilidades especiales','Posiciones'];

/* mapeo de tags locales (contexto_copa_subs1.md / plantilla) -> posicion PES5 (pagina 5) */
const POS_MAP = {PT:'GK',CT:'CB',CLT:'WB',CCD:'DMF',CCO:'AMF',MP:'SMF',MC:'CMF',DC:'CF',EX:'WG',
  CA:'WB',DD:'SB',DI:'SB',CDR:'SB',CIZ:'SB',LIB:'CWP',Pivote:'DMF'};

/* ================= cancha de formacion (modulo aparte del editor de jugadores) =================
   Grilla: 45 columnas (eje defensa<->ataque) x 47 filas (eje lateral), = la
   cantidad de pasos de extremo a extremo de la pantalla original.

   Los tres cuadros de color NO son tercios iguales: medidos sobre la captura
   del juego el azul ocupa ~33%, el verde ~40% y el rojo/marron ~27% del ancho.
   Un jugador no puede salir de la cancha, y al cruzar a un cuadro de otro
   color pasa a tener la posicion de ese cuadro.
   La tabla de etiquetas por celda es una aproximacion (no tenemos el algoritmo
   exacto del juego), con las abreviaturas que ya usa la plantilla. */
const PITCH_COLS = 47;
const PITCH_ROWS = 47;
/* Colores apagados, muestreados de la captura del juego (no son saturados).
   Cada franja se define por columnas: la 15 es defensa y la 16 medio, la 34
   es medio y la 35 delantera. El borde entre franjas cae justo en el medio
   de esas dos columnas, asi el pintado coincide exacto con la grilla. */
const PITCH_ZONES = [
  {key:'def', from:2,  to:15, label:'Defensa',    color:'#3f6f85'},
  {key:'mid', from:16, to:34, label:'Mediocampo', color:'#4d7d55'},
  {key:'att', from:35, to:47, label:'Ataque',     color:'#6d4a3a'},
];
const PITCH_ZONE_BY_KEY = Object.fromEntries(PITCH_ZONES.map(z=>[z.key,z]));
/* Rectangulos de cada posicion en la grilla (profundidad d, lateral l).
   Datos del juego: pasos laterales por posicion y, cuando la posicion no
   ocupa toda su franja, los pasos de profundidad.
     CT 23 lat · DI/DD 15 · CDR/CIZ 15 · CCO 23x12 · MP 23x12 · CC 35x12
     SD 8x35 · EI/ED 15 · DC 23
   Las que no tienen profundidad abarcan toda su franja (azul, verde o roja).
   Lateral: fila 1 = banda izquierda, fila 47 = banda derecha. */
const PITCH_POS_ZONAS = {
  // azul · defensa (columnas 2..15)
  DI:  { d:[2,15],  l:[1,16]  },   // 15 laterales, lado izquierdo
  DD:  { d:[2,15],  l:[32,47] },   // 15 laterales, lado derecho
  CT:  { d:[2,15],  l:[12,35] },   // 23 laterales, centro
  // verde · mediocampo (columnas 16..34)
  CIZ: { d:[16,34], l:[1,16]  },   // 15, izquierda
  CDR: { d:[16,34], l:[32,47] },   // 15, derecha
  CCD: { d:[16,28], l:[12,35] },   // 12 de profundidad, atras
  CC:  { d:[19,31], l:[6,41]  },   // 12 de profundidad, 35 laterales
  MP:  { d:[22,34], l:[12,35] },   // 12 de profundidad, dentro del verde
  // rojo · ataque (columnas 35..47)
  EI:  { d:[35,47], l:[1,16]  },   // 15, izquierda
  ED:  { d:[35,47], l:[32,47] },   // 15, derecha
  DC:  { d:[35,47], l:[12,35] },   // 23, centro
  SD:  { d:[35,43], l:[6,41] },   // 8 de profundidad, 35 laterales centrado (5 y 6 de margen)
};
/* Posiciones que ofrece el juego segun el bloque donde cae el jugador.
   Aprobado con el usuario: las de banda solo de su lado, y las centrales
   pueden repetirse. LIB no se usa (el juego no la reconoce desde aca). */
const PITCH_POS_POR_BLOQUE = {
  def:{ izq:['DI','CT'],            centro:['CT'],            der:['DD','CT'] },
  mid:{ izq:['CIZ','CC','CCD','MP'], centro:['CCD','CC','MP'], der:['CDR','CC','CCD','MP'] },
  att:{ izq:['EI','SD','DC'],       centro:['SD','DC'],       der:['ED','SD','DC'] },
};
// posiciones de banda: solo puede haber una de cada una en la formacion
const PITCH_POS_BANDA = new Set(['DI','DD','CIZ','CDR','EI','ED']);
/* Reglas del juego: no se puede amontonar gente en una linea.
   5 defensas (CT+DI+DD), 6 medios, 5 delanteros; y como maximo 5 de un
   mismo puesto central. */
const PITCH_POS_LINEA = {
  CT:'def', DI:'def', DD:'def',
  CIZ:'mid', CDR:'mid', CCD:'mid', CC:'mid', MP:'mid',
  EI:'att', ED:'att', SD:'att', DC:'att',
};
const PITCH_LINEA_MAX = { def:5, mid:6, att:5 };
/* Minimos por linea: el juego no deja vaciar una zona. */
const PITCH_LINEA_MIN = { def:2, mid:2, att:1 };
const PITCH_POS_MAX = { CT:5, CCD:5, CC:5, MP:5, SD:5, DC:5 };
function pitchLado(y){ return y <= 18 ? 'izq' : (y >= 30 ? 'der' : 'centro'); }
function posicionesEnBloque(x,y){
  const zona = pitchThird(x);
  return (PITCH_POS_POR_BLOQUE[zona] || PITCH_POS_POR_BLOQUE.mid)[pitchLado(y)];
}
const PITCH_POS_COLOR = { def:'rgba(111,179,209,0.55)', mid:'rgba(127,196,138,0.55)', att:'rgba(201,138,94,0.60)' };
/* Devuelve la posicion del jugador segun el rectangulo que lo contiene; si
   cae en varios (las zonas se solapan), gana el de centro mas cercano. */
function posicionEn(x,y){
  let mejor = null, mejorDist = Infinity;
  for (const code of Object.keys(PITCH_POS_ZONAS)){
    const z = PITCH_POS_ZONAS[code];
    if (x < z.d[0] || x > z.d[1] || y < z.l[0] || y > z.l[1]) continue;
    const dx = x - (z.d[0]+z.d[1])/2, dy = y - (z.l[0]+z.l[1])/2;
    const dist = dx*dx + dy*dy;
    if (dist < mejorDist){ mejorDist = dist; mejor = code; }
  }
  return mejor;
}
/* Profundidad util: la columna 2 es la ultima linea (donde estan el arquero
   y los centrales) y la 47 el delantero mas adelantado. La columna 1 y la 2
   son la MISMA linea en pantalla, como en el juego (el save guarda 1 para el
   arquero y 2 para el defensor, pero se dibujan alineados). */
function pitchFrac(x){ return Math.max(0, Math.min(1, (Math.max(2,x)-2)/(PITCH_COLS-2))); }
function pitchThird(x){
  for (const z of PITCH_ZONES) if (x <= z.to) return z.key;
  return 'att';
}
function pitchLabelFor(x,y,playerId){
  /* el arquero es arquero en cualquier parte del area: no cambia de posicion */
  if(playerId && PLAYER_BY_ID[playerId] && PLAYER_BY_ID[playerId].primaryPos==='GK') return 'PT';
  return posicionEn(x,y) || 'CC';
}
function isKeeperSlot(slot){ return PLAYER_BY_ID[slot.id]?.primaryPos === 'GK'; }
/* Grilla 47x47 -> porcentaje dentro del cesped. El margen es medio circulo
   en las dos direcciones: el punto en el tope queda entero dentro de la
   cancha (tangente al borde) y, en profundidad, medio afuera de la franja
   de color. En horizontal 1,7% del ancho y en vertical 3,8% del alto dan el
   mismo margen en pixeles (el campo es 2,2:1). */
const PITCH_PAD_X = 1.7, PITCH_PAD_Y = 3.8;
/* Orientacion de la cancha (slice 3d): vertical en el telefono (< 860 px), horizontal en
   escritorio. Es UNA sola variable: pitchPctX / pitchPctY, pitchRectGrilla y
   pitchCeldaDesdePunto la leen. La grilla (x profundidad, y lateral) y los margenes no
   cambian: solo se rotan. Lo que se guarda (prof/lat) no depende de esto. */
let PITCH_VERTICAL = false;
const clamp01 = v => Math.max(0, Math.min(1, v));
function pitchLatFrac(y){ return clamp01((y-1)/(PITCH_ROWS-1)); }
/* Porcentaje dentro del campo en pantalla (left = X, top = Y) de la celda (x, y).
   Horizontal: x (profundidad) de izquierda a derecha, y (lateral) de arriba abajo.
   Vertical: y (lateral) de izquierda a derecha, x sube desde el arco propio (x = 2 abajo). */
function pitchPctX(x, y){
  return PITCH_VERTICAL
    ? PITCH_PAD_Y + pitchLatFrac(y)*(100-2*PITCH_PAD_Y)
    : PITCH_PAD_X + pitchFrac(x)*(100-2*PITCH_PAD_X);
}
function pitchPctY(x, y){
  return PITCH_VERTICAL
    ? PITCH_PAD_X + (1-pitchFrac(x))*(100-2*PITCH_PAD_X)
    : PITCH_PAD_Y + pitchLatFrac(y)*(100-2*PITCH_PAD_Y);
}
/* Rectangulo en % que cubre las celdas x en [xa, xb] e y en [ya, yb] (franjas, zona de posicion). */
function pitchRectGrilla(xa, xb, ya, yb){
  const xs = [pitchPctX(xa,ya), pitchPctX(xb,ya), pitchPctX(xa,yb), pitchPctX(xb,yb)];
  const ys = [pitchPctY(xa,ya), pitchPctY(xb,ya), pitchPctY(xa,yb), pitchPctY(xb,yb)];
  const left = Math.min(...xs), top = Math.min(...ys);
  return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
}
/* Inversa de la grilla: punto de la pantalla -> celda (x, y) mas cercana. Usa
   el area util del campo (sin el borde de 3 px, clientLeft/clientTop) y las
   mismas constantes que pitchPctX / pitchPctY: la celda que devuelve es la
   que se dibuja en ese punto. null si no hay campo en pantalla. */
function pitchCeldaDesdePunto(clientX, clientY){
  const campo = document.getElementById('ep-pitch-field');
  if (!campo || !campo.clientWidth || !campo.clientHeight) return null;
  const r = campo.getBoundingClientRect();
  const xPct = (clientX - r.left - campo.clientLeft) / campo.clientWidth * 100;
  const yPct = (clientY - r.top - campo.clientTop) / campo.clientHeight * 100;
  if (PITCH_VERTICAL){
    // vertical: X de pantalla = lateral (y); Y de pantalla = profundidad (x), arriba = mas adelante
    const fy = clamp01((xPct - PITCH_PAD_Y) / (100 - 2*PITCH_PAD_Y));
    const fx = clamp01(1 - (yPct - PITCH_PAD_X) / (100 - 2*PITCH_PAD_X));
    return {
      x: Math.round(2 + fx * (PITCH_COLS - 2)),
      y: Math.round(1 + fy * (PITCH_ROWS - 1)),
    };
  }
  const fx = clamp01((xPct - PITCH_PAD_X) / (100 - 2*PITCH_PAD_X));
  const fy = clamp01((yPct - PITCH_PAD_Y) / (100 - 2*PITCH_PAD_Y));
  return {
    x: Math.round(2 + fx * (PITCH_COLS - 2)),
    y: Math.round(1 + fy * (PITCH_ROWS - 1)),
  };
}
/* Franjas: cada una cubre sus columnas (pitchRectGrilla). Entre la 15 y la 16 (y
   entre la 34 y la 35) queda un hueco sin pintar de un paso, que separa las zonas
   como en el juego. */

/* Formacion titular 4-1-2-3 compacto (contexto_copa_subs1.md): solo las
   11 coordenadas del dibujo. La primera es la del arquero.
   Los jugadores salen del plantel REAL publicado (ids 'r'+registro, ver
   js/pes5-plantilla.js): antes esta lista traia ids fijos de la demo de
   FK Tupadre ('michelo', 'kewell'...) y con cualquier plantilla publicada
   el modal se rompia (PLAYER_BY_ID[id] undefined). */
const FORMATION_COORDS = [
  {x:2,  y:24},
  {x:10, y:40}, {x:9,  y:29}, {x:9,  y:19}, {x:10, y:8},
  {x:17, y:24},
  {x:25, y:31}, {x:25, y:17},
  {x:37, y:39}, {x:41, y:24}, {x:37, y:9},
];
let FORMATION_NAME = '4-1-2-3 compacto';
let FORMACION_PUBLICADA = null; // formacion leida del save y publicada por la Tool (opcion B)
function _formationKey(){ return 'tsc_ep_formation_' + (EQUIPO_TSC?.id ?? AUTH?.teamId ?? 'x'); }

/* Lateral del save: 6..99 (2 unidades por casilla) -> fila 1..47 de la grilla. */
function _filaLateral(lat){
  return Math.max(1, Math.min(47, Math.round(1 + (lat - 6) * 46 / 93)));
}
/* Formato publicado por la Tool: { nombre, slots:[{slot,jugador,prof,lat}] }.
   El arquero (slot 0) no guarda lateral y se dibuja al centro, con SU propia
   profundidad: en el save es 1 (la linea de meta), un paso por detras de la
   ultima linea defensiva. Antes se copiaba la profundidad del defensor mas
   atrasado y el arquero quedaba pegado a la defensa, que no es como se ve
   en el juego. */
function formacionDesdePublicada(f){
  const slots = (f && Array.isArray(f.slots) ? f.slots : []).filter(s => s && s.slot >= 0 && s.slot <= 10);
  if (slots.length !== FORMATION_COORDS.length) return null;
  return slots.slice().sort((a, b) => a.slot - b.slot).map(s => ({
    id: 'r' + s.jugador,
    // El arquero se dibuja en la MISMA columna que el defensor mas atrasado:
    // en el save guarda 1 y los de campo no bajan de 2, pero el juego los
    // pinta sobre la misma linea (verificado en captura de PES5). Por eso el
    // minimo visual es 2 y el arquero se limita a el.
    x: s.slot === 0 ? Math.max(2, Math.min(47, Math.round(s.prof) || 1))
                    : Math.max(2, Math.min(47, Math.round(s.prof) || 2)),
    y: s.slot === 0 ? 24 : _filaLateral(s.lat),
    pos: s.posNombre || null,
  }));
}

/* Los 11 titulares del archivo (slot 0-10, la seccion "Titulares" de la
   lista; si faltan se completa con los siguientes por slot). El arquero,
   si hay uno, va a la coordenada del arquero. */
function formacionPorDefecto(){
  const orden = [...PLAYERS].sort((a,b) => (a.slot ?? 999) - (b.slot ?? 999)).slice(0, FORMATION_COORDS.length);
  const gk = orden.findIndex(p => p.primaryPos === 'GK');
  if (gk > 0) orden.unshift(orden.splice(gk, 1)[0]);
  return orden.map((p, i) => ({ id: p.id, x: FORMATION_COORDS[i].x, y: FORMATION_COORDS[i].y }));
}
/* La guardada solo vale si sus 11 ids siguen existiendo en el plantel
   actual (Luis pudo republicar o cambiar el club vinculado). */
function formacionVigente(){
  // Opcion B: la verdad es la formacion del save, publicada por la Tool.
  if (FORMACION_PUBLICADA){
    const pub = formacionDesdePublicada(FORMACION_PUBLICADA);
    if (pub && pub.every(s => s && PLAYER_BY_ID[s.id])) return pub;
  }
  try{
    const saved = JSON.parse(localStorage.getItem(_formationKey())||'null');
    if (Array.isArray(saved) && saved.length === FORMATION_COORDS.length
        && saved.every(s => s && PLAYER_BY_ID[s.id]) && new Set(saved.map(s => s.id)).size === saved.length) return saved;
  }catch(e){}
  return formacionPorDefecto();
}
let FORMATION = null; // se arma al abrir el modal, cuando ya hay plantel

/* ================= reglas de mejora (editables por el admin) =================
   Slice D.R: los NUMEROS y la logica de costo se movieron a
   js/yunacoins-rules.js (YUNACOINS_RULES) para compartirlos con
   pes5-tool.html. Nada de esto cambia de comportamiento: DEFAULT_RULES,
   bandCost99, costRange99, INJURY_ORDER, HEIGHT_CAPS y heightBracket(Count)
   pasan a delegar en el modulo; RULES sigue siendo la copia mutable local
   (editable desde el modal de reglas, persistida en localStorage) que ya
   existia. */

const DEFAULT_RULES = YUNACOINS_RULES.DEFAULT_RULES;
// Slice R: las reglas vienen de Firestore (pes5_config/reglas), las edita solo
// el admin desde la Tool PES5. Aca son de solo lectura.
let RULES = YUNACOINS_RULES.normalizarReglas(null);
async function cargarReglasFirestore(){
  try {
    const snap = await firebase.firestore().collection('pes5_config').doc('reglas').get();
    return YUNACOINS_RULES.normalizarReglas(snap.exists ? snap.data() : null);
  } catch (e) {
    console.warn('[editor] no se pudieron leer las reglas de Firestore, uso las de codigo:', e);
    return YUNACOINS_RULES.normalizarReglas(null);
  }
}

// Tope extra del equipo en la temporada actual (premio del admin, pes5_config/topesExtra-<temporada>).
async function cargarTopeExtraEquipo(teamId){
  if (STATE.season == null || teamId == null) return 0;
  try {
    const snap = await firebase.firestore().collection('pes5_config').doc('topesExtra-' + STATE.season).get();
    const topes = YUNACOINS_RULES.normalizarTopesExtra(snap.exists ? snap.data() : null);
    return YUNACOINS_RULES.extraDeEquipo(topes, teamId);
  } catch (e) {
    console.warn('[editor] no se pudo leer el tope extra', e);
    return 0;
  }
}

// Slice D2: presupuesto disponible = topes de temporada (reglas) menos lo ya
// cobrado esta temporada (libro coins) menos lo reservado en pedidos
// pendientes propios; el general nunca supera el saldo real del equipo.
async function recalcularPresupuestoReal(){
  const wallet = EQUIPO_TSC ? (EQUIPO_TSC.yunacoin || 0) : 0;
  let gastado = { general: 0, sub: 0 };
  try {
    const tx = await dbGetAll('coins', c => String(c.teamId) === String(AUTH.teamId) && c.season === STATE.season
      && typeof c.reason === 'string' && c.reason.indexOf('mejora PES5') === 0);
    gastado = YUNACOINS_RULES.gastoTemporada(tx);
  } catch (e) { console.warn('[editor] no se pudo leer el libro coins', e); }
  let pendG = 0, pendS = 0, pendTotal = 0;
  APP.pendientes = [];
  try {
    const q = await firebase.firestore().collection('pedidos_pes5')
      .where('uid', '==', AUTH.user.uid).where('estado', '==', 'pendiente').get();
    q.forEach(d => {
      const p = d.data(); pendG += p.fromGeneral || 0; pendS += p.fromSub || 0; pendTotal += p.totalCost || 0;
      APP.pendientes.push(Object.assign({ _id: d.id }, p)); // presentacion: aviso y marca «Pedido» (sin lecturas nuevas)
    });
  } catch (e) { console.warn('[editor] no se pudieron leer los pedidos pendientes', e); }
  const rest = YUNACOINS_RULES.topesRestantes(gastado, RULES);
  APP.budget = {
    general: Math.max(0, Math.min(wallet - pendTotal, rest.general - pendG)),
    subscribers: Math.max(0, rest.subscribers - pendS),
  };
  APP.saldo = Math.max(0, wallet - pendTotal); // saldo total del equipo menos lo ya reservado en pedidos pendientes
  APP.bloqueoPorAplicado = await _hayAplicadoSinPublicar();
}

/* 2.0-6.H: true si Luis aplico pedidos de este equipo despues de la ultima publicacion de su plantilla.
   Mientras tanto el presidente no manda pedidos (se armarian sobre una vista vieja). */
async function _hayAplicadoSinPublicar(){
  if (ADMIN_EMBED || !AUTH.teamId || !AUTH.user) return false;
  try {
    const pub = await firebase.firestore().collection('pes5_plantillas').doc(String(AUTH.teamId)).get();
    if (!pub.exists) return false;
    const q = await firebase.firestore().collection('pedidos_pes5')
      .where('uid', '==', AUTH.user.uid).where('estado', '==', 'aplicado').get();
    const aplicados = q.docs.map(d => d.data()).filter(p => String(p.teamId) === String(AUTH.teamId));
    return PES5_PLANTILLA.aplicadosDespuesDePublicar(aplicados, PES5_PLANTILLA.msDeFecha(pub.data().publicadoEn));
  } catch (e) { console.warn('[editor] no se pudo revisar la publicacion', e); return false; }
}

const BAND_MAX = YUNACOINS_RULES.BAND_MAX; // ya no se usa aca directo (queda para el modal de reglas si hace falta)
function bandCost99(dest){ return YUNACOINS_RULES.bandCost99(dest, RULES); }
function costRange99(from,to){ return YUNACOINS_RULES.costRange99(from, to, RULES); }
const INJURY_ORDER = YUNACOINS_RULES.INJURY_ORDER;

function tierClass99(v){
  if(v<=79) return 'n';
  if(v<=89) return 'y';
  if(v<=95) return 'o';
  return 'r';
}
const TIER_COLOR = {n:'var(--tier-n)', y:'var(--tier-y)', o:'var(--tier-o)', r:'var(--tier-r)'};

/* ================= plantel FK Tupadre (plantilla_fk_tupa_dre.md, 32 jugadores) ================= */

const DEFAULT80 = {}; MAIN_STATS.forEach(s=>DEFAULT80[s.k]=80);
const DEFAULT_SEC = {ment:80,cons:4,gk:50,teq:80,cond:4,wff:4,wfa:4,inj:'C'};
/* orden real del plantel (bloque 5 de PES5): los primeros 11 slots son el
   once titular en orden de cancha, del 12 al 23 los suplentes, el resto
   reserva (algunos equipos no llegan a tener reserva). Ver
   pes5-map.json > equipos.roster. */
const SQUAD_SECTIONS = [
  {key:'titular',  label:'Titulares', color:'var(--bkt-dc)', from:0,  to:11},
  {key:'suplente', label:'Suplentes', color:'var(--bkt-me)', from:11, to:23},
  {key:'reserva',  label:'Reserva',   color:'var(--bkt-de)', from:23, to:Infinity},
];
/* silueta de accion por bucket (assets/mejoras/1..4.webp) */
const BUCKET_PHOTO = {PT:'assets/mejoras/1.webp', DE:'assets/mejoras/2.webp', ME:'assets/mejoras/3.webp', DC:'assets/mejoras/4.webp'};

/* ================= reglas de altura (Categoria 2, MD seccion 2) =================
   Cupo del PLANTEL COMPLETO (fichajes reales incluidos en el conteo, pero su
   altura no se puede tocar). Solo suscriptores y jugadores base pueden editar
   su altura, y solo si el tramo destino todavia tiene cupo entre los demas. */
const HEIGHT_CAPS = YUNACOINS_RULES.HEIGHT_CAPS;
const HEIGHT_BRACKET_LABEL = YUNACOINS_RULES.HEIGHT_BRACKET_LABEL;
function heightBracket(h){ return YUNACOINS_RULES.heightBracket(h); }
function heightBracketCount(bracket, excludeId){
  return YUNACOINS_RULES.heightBracketCount(PLAYERS, bracket, excludeId);
}

function mkPlayer(o){
  const stats = Object.assign({}, DEFAULT80, o.stats||{});
  const sec = Object.assign({}, DEFAULT_SEC, o.sec||{});
  const abilities = {}; ALL_ABILITY_KEYS.forEach(k=>abilities[k]=false); (o.abilities||[]).forEach(k=>abilities[k]=true);
  const positions = {}; POSITIONS.forEach(p=>positions[p.k]=false); (o.positions||[]).forEach(k=>positions[k]=true);
  const primaryPos = POS_MAP[o.posTag] || 'CMF';
  positions[primaryPos] = true;
  return {
    id:o.id, name:o.name, dorsal:o.dorsal, tag:o.posTag, bucket:o.bucket, heightFixed:!!o.locked,
    subscriber:!!o.subscriber,
    country:o.country||'FK Tupadre', height:o.height||178, age:o.age||25, foot:o.foot||'Der.',
    primaryPos, stats, sec, abilities, positions, favfoot:o.favfoot||'D',
  };
}

/* Dataset de PES4 usado mientras se armaba el prototipo — ya NO se usa para
   render (ver cargarPlantillaReal()), queda solo de referencia. */
const PLAYERS_DEMO = [
  /* --- Fichajes reales (8) — bloqueados, stats originales del juego --- */
  mkPlayer({id:'kewell',name:'Kewell',dorsal:'20',posTag:'EX',bucket:'DC',locked:true,country:'Australia',height:178,age:27,foot:'Der.',
    stats:{atk:84,def:40,equ:85,res:90,vm:88,ace:95,rsp:90,agi:93,pcd:94,vcd:85,ppc:82,vpc:80,ppl:85,vpl:88,pre:86,pot:80,ted:90,psf:82,efe:87,cab:65,sal:78,tec:88,agr:90},
    sec:{ment:85,cons:8,gk:50,teq:85,cond:7,wff:6,wfa:6,inj:'A'},
    abilities:['dribbling','dribbleKeeping','passing','midRange','pkKick','oneTouchPass','center','outside'],
    positions:['AMF','WB']}),
  mkPlayer({id:'rothen',name:'Rothen',dorsal:'8',posTag:'CLT',bucket:'DE',locked:true,country:'Francia',height:181,age:29,foot:'Izq.',
    stats:{atk:85,def:52,equ:83,res:88,vm:81,ace:80,rsp:82,agi:80,pcd:82,vcd:81,ppc:90,vpc:85,ppl:90,vpl:85,pre:87,pot:83,ted:78,psf:90,efe:85,cab:70,sal:78,tec:88,agr:80},
    sec:{ment:80,cons:7,gk:50,teq:84,cond:7,wff:5,wfa:5,inj:'A'},
    abilities:['passing','midRange','outside'],
    positions:['WG']}),
  mkPlayer({id:'cannavaro',name:'F. Cannavaro',dorsal:'5',posTag:'CT',bucket:'DE',locked:true,country:'Italia',height:176,age:30,foot:'Der.',
    stats:{atk:57,def:92,equ:87,res:82,vm:76,ace:88,rsp:96,agi:83,pcd:68,vcd:75,ppc:70,vpc:74,ppl:73,vpl:77,pre:58,pot:85,ted:60,psf:69,efe:66,cab:85,sal:95,tec:77,agr:60},
    sec:{ment:80,cons:7,gk:50,teq:85,cond:8,wff:5,wfa:5,inj:'A'},
    abilities:['manMark'],
    positions:[]}),
  mkPlayer({id:'bmoore',name:'B. Moore',dorsal:'?',posTag:'CT',bucket:'DE',locked:true,country:'Inglaterra',height:185,age:28,foot:'Der.',
    stats:{atk:60,def:99,equ:80,res:86,vm:66,ace:67,rsp:88,agi:73,pcd:70,vcd:62,ppc:76,vpc:75,ppl:78,vpl:74,pre:63,pot:76,ted:60,psf:60,efe:55,cab:87,sal:70,tec:70,agr:56},
    sec:{ment:94,cons:8,gk:50,teq:98,cond:8,wff:5,wfa:5,inj:'A'},
    abilities:['dfLine','manMark'],
    positions:['WB']}),
  mkPlayer({id:'voller',name:'Voller',dorsal:'?',posTag:'DC',bucket:'DC',locked:true,country:'Alemania',height:177,age:30,foot:'Der.',
    stats:{atk:95,def:46,equ:78,res:90,vm:85,ace:94,rsp:97,agi:90,pcd:76,vcd:81,ppc:80,vpc:77,ppl:78,vpl:76,pre:95,pot:82,ted:94,psf:55,efe:52,cab:92,sal:87,tec:78,agr:90},
    sec:{ment:87,cons:6,gk:50,teq:80,cond:8,wff:6,wfa:5,inj:'C'},
    abilities:['positioning','reaction','striker'],
    positions:[]}),
  mkPlayer({id:'stojkovic',name:'Stojkovic',dorsal:'19',posTag:'CCO',bucket:'ME',locked:true,country:'Serbia',height:175,age:28,foot:'Der.',
    stats:{atk:87,def:52,equ:76,res:80,vm:81,ace:83,rsp:84,agi:88,pcd:94,vcd:83,ppc:93,vpc:82,ppl:94,vpl:80,pre:87,pot:82,ted:92,psf:90,efe:88,cab:70,sal:65,tec:97,agr:80},
    sec:{ment:84,cons:7,gk:50,teq:85,cond:8,wff:6,wfa:5,inj:'A'},
    abilities:['dribbling','playmaker','oneVOneShoot','pkKick','longThrow','oneTouchPass','outside'],
    positions:[]}),
  mkPlayer({id:'brehme',name:'Brehme',dorsal:'?',posTag:'CLT',bucket:'DE',locked:true,country:'Alemania',height:179,age:34,foot:'Izq.',
    stats:{atk:85,def:75,equ:81,res:90,vm:76,ace:75,rsp:71,agi:76,pcd:80,vcd:77,ppc:78,vpc:76,ppl:98,vpl:80,pre:83,pot:88,ted:77,psf:95,efe:93,cab:74,sal:84,tec:80,agr:85},
    sec:{ment:82,cons:8,gk:50,teq:88,cond:8,wff:8,wfa:8,inj:'A'},
    abilities:['pkKick','outside'],
    positions:['DMF','CWP']}),
  mkPlayer({id:'didi',name:'Didi',dorsal:'?',posTag:'CCD',bucket:'ME',locked:true,country:'Brasil',height:174,age:31,foot:'Der.',
    stats:{atk:86,def:72,equ:72,res:86,vm:73,ace:72,rsp:75,agi:83,pcd:90,vcd:78,ppc:95,vpc:86,ppl:90,vpl:85,pre:84,pot:77,ted:73,psf:98,efe:70,cab:74,sal:73,tec:94,agr:88},
    sec:{ment:76,cons:8,gk:50,teq:92,cond:8,wff:5,wfa:5,inj:'A'},
    abilities:['playmaker','pkKick'],
    positions:[]}),

  /* --- Suscriptores (4) — editable, con acceso al bono de 25k una vez agotado el general --- */
  mkPlayer({id:'wwhite',name:'Walter White',dorsal:'99',posTag:'CT',bucket:'DE',locked:false,subscriber:true,country:'FK Tupadre',height:205,age:26,foot:'Der.',
    sec:{ment:85,cons:7,gk:85,teq:85,cond:8,wff:4,wfa:4,inj:'C'},
    stats:{atk:85,def:85,equ:85,res:85,vm:85,ace:85,rsp:85,agi:85,pcd:85,vcd:85,ppc:85,vpc:85,ppl:85,vpl:85,pre:85,pot:85,ted:85,psf:85,efe:85,cab:85,sal:85,tec:85,agr:85},
    abilities:['dfLine','sliding'],
    positions:['DMF']}),
  mkPlayer({id:'goodman',name:'Saul Goodman',dorsal:'77',posTag:'Pivote',bucket:'ME',locked:false,subscriber:true,country:'FK Tupadre',height:175,age:25,foot:'Der.',
    sec:{ment:85,cons:7,gk:85,teq:85,cond:8,wff:4,wfa:4,inj:'C'},
    stats:{atk:85,def:85,equ:85,res:85,vm:85,ace:85,rsp:85,agi:85,pcd:85,vcd:85,ppc:85,vpc:85,ppl:85,vpl:85,pre:85,pot:85,ted:85,psf:85,efe:85,cab:85,sal:85,tec:85,agr:85},
    abilities:['reaction','passing','manMark'],
    positions:['SMF']}),
  mkPlayer({id:'epstein',name:'Epstein',dorsal:'66',posTag:'DC',bucket:'DC',locked:false,subscriber:true,country:'FK Tupadre',height:205,age:24,foot:'Der.',
    sec:{ment:85,cons:7,gk:85,teq:85,cond:8,wff:4,wfa:4,inj:'C'},
    stats:{atk:85,def:85,equ:85,res:85,vm:85,ace:85,rsp:85,agi:85,pcd:85,vcd:85,ppc:85,vpc:85,ppl:85,vpl:85,pre:85,pot:85,ted:85,psf:85,efe:85,cab:85,sal:85,tec:85,agr:85},
    abilities:['striker','oneVOneShoot','linePos'],
    positions:['AMF','WG']}),
  mkPlayer({id:'dsanchez',name:'$Daniel Sanchez',dorsal:'25',posTag:'CCO',bucket:'ME',locked:false,subscriber:true,country:'FK Tupadre',height:197,age:24,foot:'Izq.',
    stats:{atk:90,def:85,equ:88,res:87,vm:90,ace:86,rsp:85,agi:87,pcd:88,vcd:85,ppc:90,vpc:90,ppl:89,vpl:86,pre:90,pot:90,ted:90,psf:89,efe:85,cab:85,sal:85,tec:86,agr:88},
    sec:{ment:85,cons:7,gk:85,teq:85,cond:7,wff:7,wfa:7,inj:'A'},
    abilities:['linePos','striker','side','outside'],
    positions:['CF','WG','WB']}),

  /* --- Plantilla base (20) — editable, base 80 + mejoras registradas --- */
  mkPlayer({id:'bugatti',name:'A. Bugatti',dorsal:'69',posTag:'CT',bucket:'DE',locked:false,country:'FK Tupadre',height:197,age:27,foot:'Der.',
    stats:{rsp:90}, sec:{cond:7,cons:6}, abilities:['manMark','dfLine'], positions:[]}),
  mkPlayer({id:'michelo',name:'Michelo',dorsal:'45',posTag:'PT',bucket:'PT',locked:false,country:'FK Tupadre',height:197,age:32,foot:'Der.',
    stats:{rsp:90}, sec:{gk:90,cond:8,cons:7}, abilities:['oneVOneKeeper','pkKeeper'], positions:[]}),
  mkPlayer({id:'camiroaga',name:'Camiroaga',dorsal:'12',posTag:'PT',bucket:'PT',locked:false,country:'FK Tupadre',height:189,age:26,foot:'Der.',
    positions:[]}),
  mkPlayer({id:'zelensky',name:'Zelensky',dorsal:'13',posTag:'PT',bucket:'PT',locked:false,country:'FK Tupadre',height:180,age:28,foot:'Der.',
    positions:[]}),
  mkPlayer({id:'bbibi',name:'B. Bibi',dorsal:'4',posTag:'CA',bucket:'DE',locked:false,country:'FK Tupadre',height:189,age:25,foot:'Der.',
    positions:[]}),
  mkPlayer({id:'billclinton',name:'Bill Clinton',dorsal:'42',posTag:'CCD',bucket:'ME',locked:false,country:'FK Tupadre',height:186,age:29,foot:'Der.',
    positions:['WB']}),
  mkPlayer({id:'maradroga',name:'MARADROGA',dorsal:'10',posTag:'CCD',bucket:'ME',locked:false,country:'FK Tupadre',height:180,age:27,foot:'Der.',
    positions:['WB','AMF']}),
  mkPlayer({id:'evomorales',name:'Evo Morales',dorsal:'22',posTag:'CLT',bucket:'DE',locked:false,country:'FK Tupadre',height:178,age:30,foot:'Der.',
    positions:[]}),
  mkPlayer({id:'masivobro',name:'MASIVO BRO',dorsal:'15',posTag:'CCO',bucket:'ME',locked:false,country:'FK Tupadre',height:181,age:24,foot:'Der.',
    positions:['WB','WG']}),
  mkPlayer({id:'putin',name:'Putin',dorsal:'1',posTag:'DC',bucket:'DC',locked:false,country:'FK Tupadre',height:181,age:31,foot:'Der.',
    positions:['WB']}),
  mkPlayer({id:'kimjongun',name:'Kim Jong-un',dorsal:'9',posTag:'DC',bucket:'DC',locked:false,country:'FK Tupadre',height:189,age:26,foot:'Der.',
    positions:['WG']}),
  mkPlayer({id:'charliekirk',name:'Charlie Kirk',dorsal:'17',posTag:'DC',bucket:'DC',locked:false,country:'FK Tupadre',height:189,age:28,foot:'Der.',
    positions:['WG']}),
  mkPlayer({id:'patoyanez',name:'Pato Yanez',dorsal:'14',posTag:'DC',bucket:'DC',locked:false,country:'FK Tupadre',height:197,age:25,foot:'Der.',
    positions:['WG']}),
  mkPlayer({id:'elonmusk',name:'Elon Musk',dorsal:'44',posTag:'MP',bucket:'ME',locked:false,country:'FK Tupadre',height:193,age:29,foot:'Der.',
    stats:{rsp:90}, sec:{cond:8,cons:7}, abilities:['playmaker','passing'], positions:[]}),
  mkPlayer({id:'adolfhitler',name:'Adolf Hitler',dorsal:'33',posTag:'MP',bucket:'ME',locked:false,country:'FK Tupadre',height:172,age:27,foot:'Der.',
    stats:{rsp:90}, sec:{cond:7,cons:6}, abilities:['passing','reaction'], positions:[]}),
  mkPlayer({id:'kanyewest',name:'Kanye West',dorsal:'21',posTag:'DD',bucket:'DE',locked:false,country:'FK Tupadre',height:189,age:26,foot:'Der.',
    stats:{rsp:90}, sec:{teq:85,cond:8,cons:7}, abilities:['reaction','side'], positions:[]}),
  mkPlayer({id:'huevitorey',name:'Huevito Rey',dorsal:'3',posTag:'DI',bucket:'DE',locked:false,country:'FK Tupadre',height:180,age:24,foot:'Der.',
    stats:{def:85,rsp:90}, sec:{teq:85,cond:8,cons:7}, abilities:['manMark'], positions:[]}),
  mkPlayer({id:'karoldance',name:'Karol Dance',dorsal:'7',posTag:'CDR',bucket:'DE',locked:false,country:'FK Tupadre',height:172,age:23,foot:'Der.',
    sec:{cond:7}, abilities:['outside'], positions:[]}),
  mkPlayer({id:'superbigote',name:'SUPER BIGOTE',dorsal:'11',posTag:'CIZ',bucket:'DE',locked:false,country:'FK Tupadre',height:185,age:28,foot:'Izq.',
    abilities:['outside'], positions:[]}),
  mkPlayer({id:'georgefloyd',name:'George Floyd',dorsal:'46',posTag:'CCD',bucket:'ME',locked:false,country:'FK Tupadre',height:189,age:27,foot:'Der.',
    sec:{cond:7}, positions:[]}),
];
/* Plantel real, publicado por Luis con tools/admin-tool-luis.html en
   pes5_plantillas/{teamId}. Arranca vacio — lo llena cargarPlantillaReal(). */
let PLAYERS = [];
let PLAYER_BY_ID = {};

/* jugador tal como lo publica admin-tool-luis.html -> forma que usa el
   render de esta pagina (mkPlayer ya no aplica: los datos ya vienen
   completos, no hay defaults que mezclar). */
function jugadorDesdePlantillaReal(raw, equipo){
  return {
    id: raw.id, slot: raw.slot, name: raw.name, dorsal: raw.dorsal || '', tag: raw.tag, bucket: raw.bucket,
    heightFixed: false, subscriber: PES5_PLANTILLA.esSuscriptorPublicado(raw), country: equipo.teamName || 'TSC',
    height: raw.height, age: raw.age, foot: raw.foot,
    primaryPos: raw.primaryPos, stats: raw.stats, sec: raw.sec,
    abilities: raw.abilities, positions: raw.positions, favfoot: raw.favfoot,
    side: raw.side, // banda (D|I|A); las plantillas publicadas antes del slice P no la traen
  };
}

/* Carga la plantilla real del equipo del presidente desde Firestore.
   Devuelve true si habia plantilla publicada Y VIGENTE (mismo pes5Club que
   el vinculado ahora — si Luis cambio el club vinculado despues de la
   ultima publicacion, la foto vieja queda invalida hasta que la repita). */
async function cargarPlantillaReal(teamId, pes5ClubActual){
  const snap = await firebase.firestore().collection('pes5_plantillas').doc(String(teamId)).get();
  if (!snap.exists) return false;
  if (snap.data().pes5ClubIdx == null || snap.data().pes5ClubIdx !== pes5ClubActual) return false;
  const equipo = snap.data();
  PLAYERS = (equipo.jugadores || []).map(j => jugadorDesdePlantillaReal(j, equipo));
  PLAYER_BY_ID = Object.fromEntries(PLAYERS.map(p=>[p.id,p]));
  FORMACION_PUBLICADA = equipo.formacion || null;
  return PLAYERS.length > 0;
}

/* ================= estado ================= */

const APP = {
  playerId: null, // se fija en cargarPlantillaReal() -> renderAuthUI(), no hay dataset local
  page: 1,
  // Presentacion (2.0-3c): grupo de la plantilla que se ve (titular / suplente / reserva) y
  // los pedidos pendientes propios, que se llenan con la lectura que ya existe (sin lecturas nuevas).
  squadTab: 'titular',
  pendientes: [],
  bloqueoPorAplicado: false,   // 2.0-6.H: Luis aplico cambios que aun no publico
  // Slice D.R punto 5a: el wallet real es SIEMPRE teams.yunacoin, nunca
  // hardcodeado. Aca EQUIPO_TSC todavia no cargo (arranca en null antes de
  // loguearse) — se recalcula con el valor real apenas carga, ver
  // renderAuthUI() > "if (_gateTeamId !== AUTH.teamId)".
  budget: YUNACOINS_RULES.techoPresupuesto(EQUIPO_TSC ? EQUIPO_TSC.yunacoin : 0, RULES),
  draft: null,
  hint: 'Selecciona un atributo para ver su descripcion.',
};

function currentPlayer(){ return PLAYER_BY_ID[APP.playerId]; }
function loadDraft(){
  const p = currentPlayer();
  // Modo admin: el borrador arranca desde el original + lo ya guardado en la tool.
  const src = (ADMIN_EMBED && ADMIN_PENDIENTE) ? PES5_PLANTILLA.aplicarCambiosAlJugador(p, ADMIN_PENDIENTE) : p;
  APP.draft = JSON.parse(JSON.stringify({
    stats:src.stats, sec:src.sec, abilities:src.abilities, positions:src.positions, primaryPos:src.primaryPos, side:src.side, favfoot:src.favfoot, height:src.height, age:src.age,
  }));
}

function pendingCost(){
  const p = currentPlayer(), d = APP.draft;
  if(!p || !d) return 0;
  let total=0;
  MAIN_STATS.forEach(s=>{ if(d.stats[s.k]>p.stats[s.k]) total += costRange99(p.stats[s.k], d.stats[s.k]); });
  SEC_NEW.forEach(s=>{
    if(s.sc===99){ if(d.sec[s.k]>p.sec[s.k]) total += costRange99(p.sec[s.k], d.sec[s.k]); }
    else if(s.sc===8){ if(d.sec[s.k]>p.sec[s.k]) total += (d.sec[s.k]-p.sec[s.k])*RULES.scale8Cost; }
    else if(s.sc==='inj'){
      const from=INJURY_ORDER.indexOf(p.sec.inj), to=INJURY_ORDER.indexOf(d.sec.inj);
      if(to>from) total += (to-from)*RULES.injuryCost;
    }
  });
  ALL_ABILITY_KEYS.forEach(k=>{ if(d.abilities[k] && !p.abilities[k]) total += RULES.abilityCost; });
  return total;
}
/* techo de gasto del jugador (4.F): los suscriptores suman el bono exclusivo al tope general;
   el resto del plantel solo ve el general. Los dos quedan acotados por el saldo real del equipo.
   Formula en YUNACOINS_RULES.bonoSuscriptor (ver cabecera de yunacoins-rules.js). APP.saldo ya
   descuenta lo reservado en pedidos pendientes. La edicion libre de la tool (equipo sin cobro)
   no tiene saldo que limite. */
function remainingForPlayer(p){
  if(!p) return 0;
  const cobra = !(EQUIPO_TSC && EQUIPO_TSC.cobra === false);
  const pool = { general: APP.budget.general, subscribers: APP.budget.subscribers, saldo: cobra ? APP.saldo : undefined };
  return YUNACOINS_RULES.bonoSuscriptor(pool, !!p.subscriber);
}
/* saldo disponible EN VIVO — ya descuenta lo acumulado en el borrador actual */
function remainingBalance(){ return remainingForPlayer(currentPlayer()) - pendingCost(); }
function canAfford(nextCost){ return nextCost <= remainingBalance(); }

/* ================= render: roster (agrupado por posicion, estilo PES5) ================= */

/* Presentacion: linea de cada posicion (color de la fila) y codigo corto de la posicion. */
const LINEA_POS = {GK:'gk', CB:'def', CWP:'def', SB:'def', WB:'def', CMF:'mid', DMF:'mid', AMF:'mid', SMF:'mid', CF:'att', SS:'att', WG:'att'};
const CODIGO_POS = {GK:'PT', CB:'CT', CWP:'LI', SB:'CAR', WB:'LAT', DMF:'MCD', CMF:'CC', AMF:'MP', SMF:'VOL', WG:'EX', SS:'SD', CF:'DC'};
function sectionKeyOfSlot(slot){ const s = slot ?? 999; return s < 11 ? 'titular' : s < 23 ? 'suplente' : 'reserva'; }
function renderRoster(){
  const q = (document.getElementById('ep-search').value||'').toLowerCase();
  const list = document.getElementById('ep-roster-list');
  // conteos y estado del segmentado (siempre sobre todo el plantel)
  SQUAD_SECTIONS.forEach(sec=>{
    const n = PLAYERS.filter(p => sectionKeyOfSlot(p.slot) === sec.key).length;
    const b = document.getElementById('ep-seg-n-' + sec.key);
    if (b) b.textContent = n;
    const tab = document.getElementById('ep-seg-' + sec.key);
    if (tab) tab.setAttribute('aria-selected', String(sec.key === APP.squadTab));
  });

  function item(p){
    const pos = p.primaryPos || 'CB';
    const linea = LINEA_POS[pos] || 'mid';
    const pendiente = (APP.pendientes||[]).some(x => x.playerId === p.id && x.estado === 'pendiente');
    return `<div class="ep-pitem ${p.id===APP.playerId?'active':''}" data-onclick="selectPlayer('${p.id}')">
      <span class="ep-pitem-pos ep-line-${linea}">${escHtml(CODIGO_POS[pos] || pos)}</span>
      <span class="ep-pitem-info">
        <span class="ep-pitem-name">${escHtml(p.name)}${p.heightFixed?' <span class="ep-real-badge">REAL</span>':p.subscriber?' <span class="ep-subs-badge">SUSCRIPTOR</span>':''}</span>
        <span class="ep-pitem-tag">${escHtml((POS_BY_KEY[pos] && POS_BY_KEY[pos].l) || p.tag || '')}</span>
      </span>
      ${pendiente ? '<span class="ep-pitem-pedido">Pedido</span>' : ''}
    </div>`;
  }

  let html = '';
  SQUAD_SECTIONS.forEach(sec=>{
    // sin busqueda se ve el grupo elegido en el segmentado; con busqueda, todos los grupos que coinciden
    if (!q && sec.key !== APP.squadTab) return;
    const players = PLAYERS
      .filter(p => sectionKeyOfSlot(p.slot) === sec.key && p.name.toLowerCase().includes(q))
      .sort((a,b) => (a.slot ?? 0) - (b.slot ?? 0)); // orden real del archivo, no alfabetico ni por posicion
    if(!players.length) return;
    if (q) html += `<div class="ep-bkt-hd">${sec.label}</div>`;
    html += players.map(item).join('');
  });
  list.innerHTML = html || '<div style="padding:14px;color:var(--txt3);font-size:13px;">Sin resultados.</div>';
  // Slice F.M: en movil la lista es una tira horizontal; traer el jugador activo a la vista.
  const activo = list.querySelector('.ep-pitem.active');
  if (activo && window.matchMedia('(max-width: 860px)').matches) activo.scrollIntoView({ block: 'nearest', inline: 'center' });
}

function selectPlayer(id){
  APP.playerId = id;
  APP.page = 1;
  APP.hint = 'Selecciona un atributo para ver su descripcion.';
  const jugador = PLAYER_BY_ID[id];
  if (jugador) APP.squadTab = sectionKeyOfSlot(jugador.slot); // el segmentado sigue al jugador elegido
  loadDraft();
  renderAll();
  // Telefono (<860 px): tocar un jugador abre el editor como vista propia. El scroll de la
  // plantilla se guarda solo cuando se sale de ella, para volver al mismo lugar.
  if (!ADMIN_EMBED && window.matchMedia('(max-width: 859.98px)').matches){
    const r = _raiz();
    if (r && r.dataset.vista !== 'editor') _scrollPlantilla = window.scrollY;
    setVista('editor');
    window.scrollTo(0, 0);
  }
}
/* Presentacion (2.0-3c): vistas del telefono. En escritorio las dos columnas van siempre. */
let _scrollPlantilla = 0;
function setVista(v){ const r = _raiz(); if (r) r.dataset.vista = v; }
/* Menu de cuenta de la cabecera: sesion, tema y salir (presentacion). */
function mejToggleCuenta(){
  const m = document.getElementById('ep-acc-menu'), b = document.getElementById('ep-acc-btn');
  if (!m) return;
  m.hidden = !m.hidden;
  if (b) b.setAttribute('aria-expanded', String(!m.hidden));
}
function mejVolverPlantilla(){
  setVista('plantilla');
  window.scrollTo(0, _scrollPlantilla || 0);
  renderRoster();
}
function setSquadTab(key){
  APP.squadTab = key;
  renderRoster();
}
/* Jugador anterior / siguiente en el orden de la plantilla (titulares, suplentes, reserva). */
function mejPasar(delta){
  const orden = PLAYERS.slice().sort((a,b) => (a.slot ?? 0) - (b.slot ?? 0));
  const i = orden.findIndex(p => p.id === APP.playerId);
  if (!orden.length || i < 0) return;
  selectPlayer(orden[(i + delta + orden.length) % orden.length].id);
}
/* «Titular 3 de 11», «Suplente 2 de 12», «Reserva 1» para el encabezado del editor. */
function posicionEnPlantilla(p){
  const s = p.slot ?? 0;
  if (s < 11) return 'Titular ' + (s + 1) + ' de 11';
  if (s < 23) return 'Suplente ' + (s - 10) + ' de 12';
  return 'Reserva ' + (s - 22);
}

/* ================= render: card ================= */

function renderCard(){
  const p = currentPlayer();
  const d = APP.draft;
  const lockSvg = '<svg class="icn" viewBox="0 0 24 24" style="width:12px;height:12px;"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  const heightVal = p.heightFixed ? p.height : d.height;
  // Presentacion (2.0-3c): las cuatro casillas. La altura se edita desde su casilla con el mismo control.
  // Altura (2.0-3e): la casilla es un boton con el valor y un lapiz. El ajuste (adjustHeight) va en la hoja chica.
  const altCambio = !p.heightFixed && d.height !== p.height;
  const heightCtl = p.heightFixed
    ? `<b>${heightVal} cm ${lockSvg}</b>`
    : `<button type="button" class="ep-casilla-btn" data-onclick="mejAbrirAltura()" aria-label="Altura ${heightVal} cm. Editar">
        <b class="${altCambio ? 'chg' : ''}">${heightVal} cm</b>${altCambio ? `<s class="ep-casilla-old">${p.height}</s>` : ''}
        <svg class="icn ep-casilla-pencil" viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
      </button>`;
  const ageCtl = ADMIN_EMBED
    ? `<div class="ep-casilla-ctl ep-casilla-ctl-row"><b>${d.age}</b><div class="ep-rstep">
        <button data-onclick="adjustAge(-1)">&minus;</button>
        <button data-onclick="adjustAge(1)">+</button>
      </div></div>`
    : `<b>${p.age}</b>`;
  const posRegistrada = d.primaryPos || p.primaryPos;
  const posLabel = POS_BY_KEY[posRegistrada]?.l || posRegistrada;
  const linea = LINEA_POS[posRegistrada] || 'mid';
  const banda = d.side !== undefined ? (SIDE_LABEL[d.side] || '—') : '—';
  const pie = FOOT_LABEL[d.favfoot] || p.foot;
  document.getElementById('ep-card').innerHTML = `
    <div class="ep-ficha">
      <div class="ep-ficha-top">
        <div class="ep-posbig ep-line-${linea}">${escHtml(CODIGO_POS[posRegistrada] || posRegistrada)}</div>
        <div class="ep-ficha-txt">
          <div class="ep-name">${escHtml(p.name)}${p.heightFixed?' <span class="ep-real-badge">REAL</span>':p.subscriber?' <span class="ep-subs-badge">SUSCRIPTOR</span>':''}</div>
          <div class="ep-tag">${p.dorsal && p.dorsal !== '?' ? '#' + escHtml(p.dorsal) + ' · ' : ''}${escHtml(posLabel)} · ${escHtml(p.country)}</div>
        </div>
      </div>
      <div class="ep-casillas">
        <div class="ep-casilla"><span>Edad</span>${ageCtl}</div>
        <div class="ep-casilla"><span>Altura</span>${heightCtl}</div>
        <div class="ep-casilla"><span>Pie</span><b>${escHtml(pie)}</b></div>
        <div class="ep-casilla"><span>Banda</span><b>${escHtml(banda)}</b></div>
      </div>
      ${p.heightFixed?'<div class="ep-height-note">Fichaje real: la altura no se puede editar in-game.</div>':''}
    </div>
  `;
  document.getElementById('ep-edit-pos').textContent = posicionEnPlantilla(p);
}

/* ================= render: pager / hint / cart ================= */

function renderPager(){
  document.getElementById('ep-page-title').textContent = PAGES[APP.page-1];
  document.getElementById('ep-pgnum').textContent = APP.page + '/' + PAGES.length;
  document.getElementById('ep-prev').disabled = APP.page<=1;
  document.getElementById('ep-next').disabled = APP.page>=PAGES.length;
  // marcas de pagina como en el juego: una activa (larga) y el resto
  document.getElementById('ep-pgdots').innerHTML = PAGES.map((_, i) => `<i class="${i===APP.page-1?'on':''}"></i>`).join('');
}
/* Aviso del pedido pendiente (presentacion): usa los pedidos que ya carga el editor. */
function renderPending(){
  const pend = (APP.pendientes||[]).filter(x => x.estado === 'pendiente');
  const sub = document.getElementById('ep-pedidos-sub');
  if (sub) sub.textContent = pend.length ? pend.length + ' en revisión' : 'Sin pendientes';
  // globito: la misma cuenta que el texto (mejoras y formaciones pendientes)
  const globo = document.getElementById('ep-hist-badge');
  if (globo) globo.textContent = pend.length;
  const box = document.getElementById('ep-pend');
  if (!box) return;
  const bloqueo = !ADMIN_EMBED && !!APP.bloqueoPorAplicado;
  const avisoBloqueo = 'Luis aplicó cambios que todavía no publicó. Esperá a que publique para pedir más.';
  if (ADMIN_EMBED || (!pend.length && !bloqueo)){ box.hidden = true; box.innerHTML = ''; return; }
  if (!pend.length){
    box.hidden = false;
    box.innerHTML = `<svg class="icn" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span>${avisoBloqueo}</span>`;
    return;
  }
  const x = pend[0];
  const resumen = (x.lines||[]).map(l => l.label + (typeof l.from === 'number' && typeof l.to === 'number' ? ' ' + (l.to - l.from > 0 ? '+' : '') + (l.to - l.from) : '')).join(', ') || 'cambios';
  const mas = pend.length > 1 ? ' (+' + (pend.length - 1) + ' más)' : '';
  // pedido de formacion: no tiene jugador, va con el nombre de la formacion
  const nombreForm = x.tipo === 'formacion' ? ((x.formacion && x.formacion.nombre) || (x.lines && x.lines[0] && x.lines[0].to) || '') : '';
  const frase = x.tipo === 'formacion'
    ? `Formación ${escHtml(nombreForm)} espera que Luis la aplique.`
    : `${escHtml(x.playerName || 'Jugador')} · ${escHtml(resumen)} espera que Luis lo aplique.`;
  box.hidden = false;
  box.innerHTML = `<svg class="icn" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span>${bloqueo ? avisoBloqueo + ' ' : ''}${frase}${mas} Podés cancelarlo desde Pedidos mientras siga pendiente.</span>`;
}
function gotoPage(delta){
  const next = APP.page + delta;
  if(next<1 || next>PAGES.length) return;
  APP.page = next;
  renderAll();
}
function setHint(text){
  APP.hint = text;
  document.getElementById('ep-hint').textContent = text;
  renderRows();
}
/* la zona de yunacoins vive fuera del editor (es el dato mas importante);
   el numerador baja en vivo (antes de aplicar/confirmar), el "/ tope" solo
   cambia cuando el admin guarda reglas nuevas. */
function renderHero(){
  const cost = pendingCost();
  // Slice D.R punto 5b: orden INVERTIDO — un suscriptor gasta primero el
  // bono, el resto (o todo, si no es suscriptor) sale del general. Mismo
  // YUNACOINS_RULES.distribuirCosto que usa la tool (pes5-tool.html).
  const p = currentPlayer();
  const { fromGeneral, fromSub } = YUNACOINS_RULES.distribuirCosto(cost, APP.budget.subscribers, !!(p && p.subscriber));
  document.getElementById('ep-hero-general-cap').textContent = RULES.budgetGeneral.toLocaleString('es-CL');
  document.getElementById('ep-balance-total').textContent = Math.max(0, (APP.saldo || 0) - cost).toLocaleString('es-CL');
  document.getElementById('ep-balance-general').textContent = (APP.budget.general - fromGeneral).toLocaleString('es-CL');
  document.getElementById('ep-balance-sub').textContent = (APP.budget.subscribers - fromSub).toLocaleString('es-CL');
  // barra del tope de temporada: lo que queda sobre el tope, mismos datos que el texto de arriba
  const cap = RULES.budgetGeneral || 0;
  const quedaGeneral = APP.budget.general - fromGeneral;
  const fill = document.getElementById('ep-cap-fill');
  if (fill) fill.style.width = cap > 0 ? Math.min(100, Math.max(0, quedaGeneral / cap * 100)) + '%' : '0%';
}
function renderCart(){
  const cost = pendingCost();
  const n = pendingChangeLines().length;
  document.getElementById('ep-cost').textContent = cost > 0 ? '−' + cost.toLocaleString('es-CL') : '0';
  document.getElementById('ep-cart-count').textContent = n ? n + (n === 1 ? ' cambio' : ' cambios') : 'Sin cambios';
  document.getElementById('ep-cart-left').textContent = n ? 'queda ' + Math.max(0, (APP.saldo || 0) - cost).toLocaleString('es-CL') + ' YC' : '';
  renderHero();
  const applyBtn = document.getElementById('ep-apply');
  applyBtn.disabled = (pendingChangeLines().length===0 && !(ADMIN_EMBED && ADMIN_PENDIENTE && Object.keys(ADMIN_PENDIENTE).length)) || (!ADMIN_EMBED && !!APP.bloqueoPorAplicado);
  document.getElementById('ep-warn').textContent = '';
}

function discardChanges(){
  loadDraft();
  renderCard();   // la ficha (casilla de altura) vuelve al jugador
  renderRows();
  renderCart();
  showMiniToast('Cambios descartados');
}

/* ---- diff entre borrador y jugador actual (para el modal de confirmacion / historial) ---- */
function pendingChangeLines(){
  const p = currentPlayer(), d = APP.draft;
  const lines = [];
  MAIN_STATS.forEach(s=>{
    if(d.stats[s.k]!==p.stats[s.k]) lines.push({label:s.l, from:p.stats[s.k], to:d.stats[s.k], cost:costRange99(p.stats[s.k],d.stats[s.k])});
  });
  SEC_NEW.forEach(s=>{
    if(s.sc===99){ if(d.sec[s.k]!==p.sec[s.k]) lines.push({label:s.l, from:p.sec[s.k], to:d.sec[s.k], cost:costRange99(p.sec[s.k],d.sec[s.k])}); }
    else if(s.sc===8){ if(d.sec[s.k]!==p.sec[s.k]) lines.push({label:s.l, from:p.sec[s.k], to:d.sec[s.k], cost:Math.max(0,d.sec[s.k]-p.sec[s.k])*RULES.scale8Cost}); }
    else if(d.sec.inj!==p.sec.inj){
      const from=INJURY_ORDER.indexOf(p.sec.inj), to=INJURY_ORDER.indexOf(d.sec.inj);
      lines.push({label:s.l, from:p.sec.inj, to:d.sec.inj, cost:Math.max(0,to-from)*RULES.injuryCost});
    }
  });
  ALL_ABILITY_KEYS.forEach(k=>{
    if(d.abilities[k] && !p.abilities[k]) lines.push({label:ABILITY_BY_KEY[k].l, from:'—', to:'habilidad nueva', cost:RULES.abilityCost});
  });
  POSITIONS.forEach(pos=>{
    if(d.positions[pos.k] && !p.positions[pos.k]) lines.push({label:'Posicion: '+pos.l, from:'—', to:'agregada', cost:0});
    if(!d.positions[pos.k] && p.positions[pos.k]) lines.push({label:'Posicion: '+pos.l, from:'marcada', to:'quitada', cost:0});
  });
  if(d.primaryPos !== undefined && d.primaryPos !== p.primaryPos) {
    const posDeKey = k => Object.values(POSITIONS).find(pos=>pos.k===k);
    lines.push({label:'Posición natural', from:POS_BY_KEY[p.primaryPos]?.l||p.primaryPos, to:POS_BY_KEY[d.primaryPos]?.l||d.primaryPos, cost:0});
  }
  if(d.side !== undefined && p.side !== undefined && d.side !== p.side) {
    lines.push({label:'Banda', from:SIDE_LABEL[p.side]||'—', to:SIDE_LABEL[d.side]||'—', cost:0});
  }
  if(ADMIN_EMBED){
    ALL_ABILITY_KEYS.forEach(k=>{
      if(!d.abilities[k] && p.abilities[k]) lines.push({label:ABILITY_BY_KEY[k].l, from:'habilidad', to:'quitada', cost:0});
    });
    if(d.age!==p.age) lines.push({label:'Edad', from:p.age, to:d.age, cost:0});
  }
  if(d.favfoot!==p.favfoot) lines.push({label:'Pie dominante', from:FOOT_LABEL[p.favfoot]||p.favfoot, to:FOOT_LABEL[d.favfoot]||d.favfoot, cost:0});
  if(d.height!==p.height) lines.push({label:'Altura', from:p.height+' cm', to:d.height+' cm', cost:0});
  return lines;
}

/* ================= modal: confirmar aplicar ================= */

function openApplyConfirm(){
  const p = currentPlayer();
  const lines = pendingChangeLines();
  if(lines.length===0){
    // Modo admin: si el borrador volvio al original pero habia cambios guardados, "aplicar" los limpia.
    if(ADMIN_EMBED && ADMIN_PENDIENTE && Object.keys(ADMIN_PENDIENTE).length) commitChangesAdmin();
    return;
  }
  const cost = pendingCost();
  // saldo, tope y bono antes y despues del pedido: los mismos datos que muestra el saldo
  const { fromGeneral, fromSub } = YUNACOINS_RULES.distribuirCosto(cost, APP.budget.subscribers, !!p.subscriber);
  const saldoAntes = APP.saldo || 0;
  const saldoDespues = Math.max(0, saldoAntes - cost);
  const cap = RULES.budgetGeneral || 0;
  const quedaGeneral = APP.budget.general - fromGeneral;
  const wrap = document.getElementById('ep-confirm-wrap');
  wrap.innerHTML = `
  <div class="ep-overlay ep-overlay-sheet" data-onclick="closeIfBackdrop(event,closeApplyConfirm)">
    <section class="ep-sheet" role="dialog" aria-modal="true" aria-labelledby="ep-sheet-tit">
      <div class="ep-grab" aria-hidden="true"></div>
      <div class="ep-sheet-hd">
        <h2 id="ep-sheet-tit">${ADMIN_EMBED ? 'Revisar cambios' : 'Revisar pedido'}</h2>
        <span>${ADMIN_EMBED ? 'Queda como cambio pendiente en la Tool PES5.' : 'Se cobra cuando Luis lo aplica en el juego. Mientras esté pendiente lo podés cancelar.'}</span>
      </div>
      <ul class="ep-sheet-list">
        ${lines.map(l=>`<li class="ep-sheet-line">
          <span class="lbl">${escHtml(p.name)} · ${escHtml(l.label)}</span>
          <span class="chg">${escHtml(l.from)} → ${escHtml(l.to)}</span>
          <span class="cost">${l.cost>0? '+'+l.cost.toLocaleString('es-CL') : 'gratis'}</span>
        </li>`).join('')}
      </ul>
      ${ADMIN_EMBED ? '' : `<dl class="ep-sheet-saldo">
        <div><dt>Saldo</dt><dd>${saldoAntes.toLocaleString('es-CL')} <span>→</span> <b>${saldoDespues.toLocaleString('es-CL')} YC</b></dd></div>
        <div><dt>Queda del tope</dt><dd>${quedaGeneral.toLocaleString('es-CL')} / ${cap.toLocaleString('es-CL')}</dd></div>
        <div><dt>Bono suscriptores usado</dt><dd>${fromSub.toLocaleString('es-CL')}</dd></div>
      </dl>`}
      <div class="ep-sheet-act">
        <button class="ep-btn" data-onclick="closeApplyConfirm()">Seguir editando</button>
        <button class="ep-btn primary" data-onclick="commitChanges()">${ADMIN_EMBED ? 'Aplicar cambios' : 'Enviar a Luis'}</button>
      </div>
    </section>
  </div>`;
}
function closeApplyConfirm(){ document.getElementById('ep-confirm-wrap').innerHTML=''; }

async function commitChanges(){
  if (ADMIN_EMBED) return commitChangesAdmin();
  if (APP.bloqueoPorAplicado){ closeApplyConfirm(); showMiniToast('Luis aplicó cambios que todavía no publicó: esperá a que publique para pedir más.'); return; }
  const p = currentPlayer();
  const lines = pendingChangeLines();
  const cost = pendingCost();
  if(lines.length===0 || cost>remainingForPlayer(p)){ closeApplyConfirm(); return; }
  if(!puedeMandarPedido()){
    closeApplyConfirm();
    showMiniToast(AUTH.user ? 'Tu cuenta no tiene un equipo asignado — pedile al admin que te vincule uno.' : 'Iniciá sesión para mandar el pedido.');
    return;
  }

  const draftJugador = {
    stats: Object.assign({}, p.stats, APP.draft.stats),
    sec: Object.assign({}, p.sec, APP.draft.sec),
    abilities: Object.assign({}, p.abilities, APP.draft.abilities),
    positions: APP.draft.positions, primaryPos: APP.draft.primaryPos, side: APP.draft.side,
    height: APP.draft.height, favfoot: APP.draft.favfoot,
  };
  const cambios = PES5_PLANTILLA.cambiosDesdeEditor(p, draftJugador);
  const registro = PES5_PLANTILLA.registroDeId(p.id);
  if (registro == null || !Object.keys(cambios).length){
    closeApplyConfirm();
    showMiniToast('No hay cambios aplicables para mandar.');
    return;
  }

  /* Slice D.R punto 5b (orden INVERTIDO, 15/09): si es suscriptor, primero
     se gasta el bono exclusivo; agotado el bono, el resto sigue con el
     general. Si no es suscriptor, todo sale del general. */
  const { fromGeneral, fromSub } = YUNACOINS_RULES.distribuirCosto(cost, APP.budget.subscribers, !!p.subscriber);

  const btn = document.getElementById('ep-apply');
  if (btn) btn.disabled = true;
  try {
    /* el pedido a Firestore es lo que el admin aplica con la tool; el presidente solo puede cancelarlo mientras esta pendiente (ver firebase/firestore.rules). */
    await firebase.firestore().collection('pedidos_pes5').add({
      uid: AUTH.user.uid,
      teamId: String(AUTH.teamId),
      teamName: EQUIPO_TSC?.name || null,
      pes5Club: EQUIPO_TSC?.pes5Club || null,
      playerId: p.id,
      playerName: p.name,
      registro,
      pes5ClubIdx: EQUIPO_TSC ? EQUIPO_TSC.pes5ClubIdx : null,
      cambios,
      dorsal: p.dorsal,
      subscriber: !!p.subscriber,
      lines,
      totalCost: cost,
      fromGeneral, fromSub,
      estado: 'pendiente',
      creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch(e){
    if (btn) btn.disabled = false;
    showMiniToast('No se pudo mandar el pedido: ' + (e?.message || e));
    return;
  }

  APP.budget.general -= fromGeneral;
  APP.budget.subscribers -= fromSub;
  APP.saldo = Math.max(0, (APP.saldo || 0) - cost);

  Object.assign(p.stats, APP.draft.stats);
  Object.assign(p.sec, APP.draft.sec);
  Object.assign(p.abilities, APP.draft.abilities);
  Object.assign(p.positions, APP.draft.positions);
  p.primaryPos = APP.draft.primaryPos;
  if(APP.draft.side !== undefined) p.side = APP.draft.side;
  p.tag = POS_BY_KEY[p.primaryPos]?.l || p.primaryPos;
  p.favfoot = APP.draft.favfoot;
  p.height = APP.draft.height;

  AUDIT_LOG.push({
    ts: Date.now(), playerId:p.id, playerName:p.name, dorsal:p.dorsal, subscriber:!!p.subscriber,
    lines, totalCost:cost, fromGeneral, fromSub,
    budgetAfter:{general:APP.budget.general, subscribers:APP.budget.subscribers},
  });
  saveAuditLog();

  // presentacion: el pedido recien enviado ya cuenta como pendiente (marca «Pedido» y aviso)
  APP.pendientes.push({ _id: 'local-' + Date.now(), playerId: p.id, playerName: p.name, lines, totalCost: cost, estado: 'pendiente' });
  closeApplyConfirm();
  renderCard();
  renderRows();
  renderCart();
  renderRoster();
  renderPending();
  showMiniToast(`Pedido enviado a Luis: -${cost.toLocaleString('es-CL')} YunaCoins`);
}

let _toastTimer=null;
function showMiniToast(msg){
  let el = document.getElementById('ep-mini-toast');
  if(!el){
    el = document.createElement('div');
    el.id='ep-mini-toast';
    el.style.cssText='position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--card3);'+
      'border:1px solid var(--gold-b);color:var(--txt);padding:9px 18px;border-radius:999px;font-size:13px;z-index:970;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity='1';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(()=>{ el.style.transition='opacity .4s'; el.style.opacity='0'; }, 1600);
}

/* ================= historial (registro para notificar al admin) ================= */

const AUDIT_KEY = 'tsc_ep_audit_log';
/* normaliza entradas al esquema actual — tolera el esquema viejo
   (balanceBefore/balanceAfter planos, sin budgetAfter/fromGeneral/fromSub) */
function normalizeAuditEntry(e){
  if(!e || typeof e!=='object') return null;
  const hasNewBudget = e.budgetAfter && typeof e.budgetAfter==='object';
  return Object.assign({}, e, {
    lines: Array.isArray(e.lines) ? e.lines : [],
    totalCost: Number(e.totalCost||0),
    fromGeneral: e.fromGeneral!=null ? Number(e.fromGeneral) : Number(e.totalCost||0),
    fromSub: e.fromSub!=null ? Number(e.fromSub) : 0,
    subscriber: !!e.subscriber,
    budgetAfter: hasNewBudget
      ? {general:Number(e.budgetAfter.general||0), subscribers:Number(e.budgetAfter.subscribers||0)}
      : {general:Number(e.balanceAfter||0), subscribers:0},
  });
}
function loadAuditLog(){
  try{
    const raw = JSON.parse(localStorage.getItem(AUDIT_KEY)||'[]');
    if(!Array.isArray(raw)) return [];
    return raw.map(normalizeAuditEntry).filter(Boolean);
  }catch(e){ return []; }
}
function saveAuditLog(){
  try{ localStorage.setItem(AUDIT_KEY, JSON.stringify(AUDIT_LOG.slice(-200))); }catch(e){}
}
const AUDIT_LOG = loadAuditLog();

async function openAuditModal(){
  const wrap = document.getElementById('ep-audit-wrap');
  wrap.innerHTML = `<div class="ep-overlay"><div class="ep-modal wide"><div class="ep-modal-body">Cargando historial…</div></div></div>`;
  let pedidos = [], movimientos = [];
  try {
    const q = await firebase.firestore().collection('pedidos_pes5').where('uid', '==', AUTH.user.uid).get();
    pedidos = q.docs.map(d => Object.assign({ _id: d.id }, d.data()));
    // la lista del historial es la misma fuente que el aviso y el globito
    APP.pendientes = pedidos.filter(p => p.estado === 'pendiente');
    renderPending();
  } catch (e) { console.warn('[mejoras] pedidos', e); }
  try {
    movimientos = await dbGetAll('coins', c => String(c.teamId) === String(AUTH.teamId)
      && typeof c.reason === 'string' && c.reason.indexOf('mejora PES5') === 0);
  } catch (e) { console.warn('[mejoras] coins', e); }
  const ms = v => v && v.toDate ? v.toDate().getTime() : (v ? new Date(v).getTime() : 0);
  pedidos.sort((a, b) => ms(b.creadoEn) - ms(a.creadoEn));
  movimientos.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  const ESTADO = { pendiente: 'Pendiente', aplicado: 'Aplicado', rechazado: 'Rechazado', cancelado: 'Cancelado' };
  const fecha = v => { const t = ms(v); return t ? new Date(t).toLocaleString('es-CL') : ''; };
  const filasPedidos = pedidos.length ? pedidos.map(p => `
    <div class="ep-audit-entry">
      <div class="ep-audit-entry-hd"><b>${escHtml(p.playerName || '')}</b><span>${escHtml(fecha(p.creadoEn))}</span></div>
      <div class="sum">${(p.lines || []).map(l => `${escHtml(l.label)} ${escHtml(l.from)}&rarr;${escHtml(l.to)}`).join(', ')}</div>
      <div class="sum" style="margin-top:4px;">
        <span class="badge">${escHtml(ESTADO[p.estado] || p.estado || '')}</span>
        &middot; ${Number(p.costoFinal != null ? p.costoFinal : (p.totalCost || 0)).toLocaleString('es-CL')} YunaCoins
        ${p.estado === 'rechazado' && p.motivo ? `&middot; motivo: ${escHtml(p.motivo)}` : ''}
        ${p.estado === 'pendiente' ? `<button class="ep-btn" style="margin-left:8px;" data-onclick="cancelarPedidoDesdeHistorial('${escHtml(p._id)}')">Cancelar pedido</button>` : ''}
      </div>
    </div>`).join('') : '<div class="sum">Todavía no mandaste pedidos.</div>';
  const filasMov = movimientos.length ? movimientos.map(m => `
    <div class="ep-diffline">
      <div class="lbl">${escHtml((m.pes5 && m.pes5.playerName) || '')} &middot; ${escHtml(m.note || '')}</div>
      <div class="chg">${escHtml(m.date ? new Date(m.date).toLocaleString('es-CL') : '')}</div>
      <div class="cost">-${Number(m.amount || 0).toLocaleString('es-CL')}</div>
    </div>`).join('') : '<div class="sum">Sin cobros de mejoras esta temporada.</div>';
  wrap.innerHTML = `
  <div class="ep-overlay" data-onclick="closeIfBackdrop(event,closeAuditModal)">
    <div class="ep-modal wide">
      <div class="ep-modal-hd">
        <h2>Historial de mejoras</h2>
        <button class="ep-modal-close" data-onclick="closeAuditModal()">&times;</button>
      </div>
      <div class="ep-modal-body">
        <div style="font-family:'Barlow Condensed';font-weight:700;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--txt3);margin-bottom:8px;">Mis pedidos</div>
        ${filasPedidos}
        <div style="font-family:'Barlow Condensed';font-weight:700;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--txt3);margin:16px 0 8px;">Cobros al equipo</div>
        ${filasMov}
      </div>
    </div>
  </div>`;
  actualizarBadgeHistorial(pedidos);
}
async function cancelarPedidoDesdeHistorial(id){
  if (!confirm('¿Cancelar este pedido? No se cobra nada.')) return;
  try {
    await cancelarPedido(id);
    showMiniToast('Pedido cancelado.');
  } catch (e) {
    showMiniToast('No se pudo cancelar: ' + (e && e.message ? e.message : e));
  }
  renderAll();
  openAuditModal();
}
function actualizarBadgeHistorial(pedidos){
  const el = document.getElementById('ep-hist-badge');
  if (el) el.textContent = (pedidos || []).filter(p => p.estado === 'pendiente').length;
}
function closeAuditModal(){ document.getElementById('ep-audit-wrap').innerHTML=''; }
function clearAuditLog(){
  AUDIT_LOG.length = 0;
  saveAuditLog();
  renderCart();
  openAuditModal();
}

/* ================= MODULO APARTE: formacion / estrategia =================
   No comparte estado con el editor de jugadores: tiene su propio borrador y
   se guarda solo al Confirmar. */

const FORM = { draft:null, sel:0, motivo:null };
let FORM_DRAG = null; // arrastre en curso de un punto de la cancha (slice 2.0-2)
let _formRaf = 0;     // frame pendiente del render durante el arrastre

function openFormationModal(){
  if (PLAYERS.length < FORMATION_COORDS.length){
    showMiniToast('El plantel todavia no tiene 11 jugadores para armar la formacion.');
    return;
  }
  FORMATION = formacionVigente();
  FORMATION_NAME = (FORMACION_PUBLICADA && FORMACION_PUBLICADA.nombre) || FORMATION_NAME;
  FORM.draft = JSON.parse(JSON.stringify(FORMATION));
  // Si la formacion publicada es vieja y no trae posiciones, se completan
  // con la primera opcion valida de cada bloque (asi las reglas tienen datos).
  completarPosiciones();
  FORM.sel = 0;
  FORM.motivo = null;
  FORM_DRAG = null;
  FORM.resumen = 'mejores';
  _pitchSyncOrientation();
  _montarModalCancha();
}
/* Arma o rehace el modal con el borrador actual: al abrir y al cambiar la orientacion
   (slice 3d). No reinicia el borrador ni la seleccion. */
function _montarModalCancha(){
  // En pantalla tactil la ayuda habla de arrastrar; con mouse, de las flechas.
  const toqueFino = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const wrap = document.getElementById('ep-pitch-wrap');
  // Las franjas no llegan a los bordes y dejan un hueco sin pintar entre
  // zonas (centro de la columna 15 al centro de la 16, y 34 a 35).
  const franjas = PITCH_ZONES.map(z => {
    const e = pitchRectGrilla(z.from, z.to, 1, PITCH_ROWS);
    return `<div class="ep-pitch-zone" style="left:${e.left}%;width:${e.width}%;top:${e.top}%;height:${e.height}%;background:${z.color};"></div>`;
  }).join('');
  // Las zonas ya no llevan linea blanca: las separa el hueco sin pintar.
  wrap.innerHTML = `
  <div class="ep-overlay" data-onclick="closeIfBackdrop(event,closeFormationModal)">
    <div class="ep-modal wide${PITCH_VERTICAL ? ' ep-form-vert' : ''}">
      <div class="ep-modal-hd">
        <h2>Formacion &middot; estrategia</h2>
        <button class="ep-modal-close" data-onclick="closeFormationModal()">&times;</button>
      </div>
      <div class="ep-modal-body">
        <div class="ep-pitch-crest">
          <svg class="icn" viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 8.7 8 9 4.6-.3 8-4 8-9V5l-8-3Z"/></svg>
          ${escHtml(EQUIPO_TSC?.name || 'Tu equipo')} &middot; Alineacion
          <span class="ep-pitch-lineup" id="ep-form-lineup" title="Alineacion segun las lineas en la cancha">${escHtml(_nombreFormacionDraft(FORM.draft))}</span>
        </div>
        <div class="ep-pitch-field${PITCH_VERTICAL ? ' vertical' : ''}" id="ep-pitch-field">
          ${franjas}
          <div class="ep-pitch-halfline"></div>
          <div class="ep-pitch-circle"></div>
          <div class="ep-pitch-box left"></div>
          <div class="ep-pitch-box right"></div>
          <div class="ep-pitch-arc left"></div>
          <div class="ep-pitch-arc right"></div>
          <div class="ep-pitch-goal left"></div>
          <div class="ep-pitch-goal right"></div>
          <div id="ep-pitch-pos" style="position:absolute;inset:0;z-index:2;pointer-events:none;"></div>
          <div id="ep-pitch-dots" style="position:absolute;inset:0;z-index:3;"></div>
        </div>
        <div class="ep-pitch-info">
          <div class="ep-pitch-info-name" id="ep-form-name"></div>
          <div class="ep-pitch-posrow">
            <span class="ep-pitch-info-zone">Posicion</span>
            <select id="ep-form-pos" class="ep-pitch-possel" data-onchange="setFormationPos(this.value)"></select>
          </div>
          <div class="ep-pitch-selctl">
            <button class="ep-pgbtn" data-onclick="cycleFormationPlayer(-1)" title="Jugador anterior" aria-label="Jugador anterior">
              <svg class="icn" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>
            <span class="ep-pitch-info-zone" id="ep-form-zone"></span>
            <button class="ep-pgbtn" data-onclick="cycleFormationPlayer(1)" title="Jugador siguiente" aria-label="Jugador siguiente">
              <svg class="icn" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>
          </div>
        </div>
        <div class="ep-pitch-ficha" id="ep-pitch-ficha"${PITCH_VERTICAL ? '' : ' hidden'}>
          <div class="ep-casillas" id="ep-form-casillas"></div>
        </div>
        <div class="ep-res" id="ep-res"${PITCH_VERTICAL ? '' : ' hidden'}>
            <div class="ep-res-tabs" role="tablist" aria-label="Resumen del jugador">
              <button role="tab" id="ep-res-t-mejores" data-onclick="setFormResumen('mejores')">Mejores</button>
              <button role="tab" id="ep-res-t-peores" data-onclick="setFormResumen('peores')">Peores</button>
              <button role="tab" id="ep-res-t-habilidades" data-onclick="setFormResumen('habilidades')">Habilid.</button>
              <button role="tab" id="ep-res-t-posiciones" data-onclick="setFormResumen('posiciones')">Posic.</button>
            </div>
            <div class="ep-res-body" id="ep-res-body"></div>
        </div>
        <div class="ep-pitch-nudge" role="group" aria-label="Ajuste fino de la posicion">
          <button class="ep-nudge up" data-onclick="moveFormationScreen('up')" title="Subir" aria-label="Subir">
            <svg class="icn" viewBox="0 0 24 24"><path d="m18 15-6-6-6 6"/></svg></button>
          <button class="ep-nudge left" data-onclick="moveFormationScreen('left')" title="Atrás" aria-label="Atrás">
            <svg class="icn" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
          <span class="ep-nudge-c" aria-hidden="true"></span>
          <button class="ep-nudge right" data-onclick="moveFormationScreen('right')" title="Adelante" aria-label="Adelante">
            <svg class="icn" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>
          <button class="ep-nudge down" data-onclick="moveFormationScreen('down')" title="Bajar" aria-label="Bajar">
            <svg class="icn" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button>
        </div>
        <div class="ep-pitch-hint">
          <span>${toqueFino ? 'Arrastrá un punto para moverlo.' : 'Clic en un punto para elegirlo · flechas (en pantalla o del teclado) para moverlo.'}</span>
          <span id="ep-form-coords"></span>
        </div>
      </div>
      <div class="ep-modal-foot">
        <button class="ep-btn" data-onclick="resetFormationDraft()">Restablecer</button>
        <button class="ep-btn" data-onclick="closeFormationModal()">Cancelar</button>
        <button class="ep-btn primary" data-onclick="confirmFormation()">
          <svg class="icn" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>Confirmar</button>
      </div>
    </div>
  </div>`;
  renderFormationModal();
  _engancharArrastreCampo();
  _formObservarAlto();
}
function closeFormationModal(){
  FORM_DRAG = null;
  _formDejarDeObservar();
  document.getElementById('ep-pitch-wrap').innerHTML='';
}

/* Arrastre sobre la cancha (slice 2.0-2): solo con dedo o lapiz; con mouse el
   clic solo elige el punto (decision de Jimbo: en PC se mueve con la cruz o el
   teclado). Se decide por pointerType, no por matchMedia. Un solo listener en el
   campo, no uno por punto: renderFormationModal reemplaza los puntos en cada
   render. El campo captura el puntero, asi el arrastre sigue aunque el punto se
   redibuje o el dedo salga de la cancha. */
const FORM_RADIO_TOQUE = 22; // px: el punto se ve de ~12 px; la zona de toque es ~44 px

function _centroPunto(campo, slot){
  const r = campo.getBoundingClientRect();
  return {
    x: r.left + campo.clientLeft + pitchPctX(slot.x, slot.y) / 100 * campo.clientWidth,
    y: r.top + campo.clientTop + pitchPctY(slot.x, slot.y) / 100 * campo.clientHeight,
  };
}
function _formProgramarRender(){
  if (_formRaf) return;
  _formRaf = requestAnimationFrame(() => { _formRaf = 0; renderFormationModal(); });
}
function _formPointerDown(e){
  if (e.button !== 0 || FORM_DRAG) return;
  const campo = e.currentTarget;
  let mejor = -1, mejorDist = Infinity;
  FORM.draft.forEach((slot, i) => {
    const c = _centroPunto(campo, slot);
    const d = Math.hypot(c.x - e.clientX, c.y - e.clientY);
    if (d < mejorDist){ mejorDist = d; mejor = i; }
  });
  if (mejor < 0 || mejorDist > FORM_RADIO_TOQUE) return; // toque lejos de los puntos: no hace nada
  const slot = FORM.draft[mejor];
  const c = _centroPunto(campo, slot);
  selectFormationPlayer(mejor);
  // Captura en todos los tipos de puntero: si se suelta fuera de la cancha, el clic
  // se entrega al campo y no al overlay (que cerraria el modal al soltar sobre el fondo).
  try { campo.setPointerCapture(e.pointerId); } catch (err) {}
  // Con mouse solo se selecciona: no se arrastra (ver el bloque de arriba).
  if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
  FORM_DRAG = {
    id: e.pointerId, idx: mejor, activo: false,
    celda: { x: slot.x, y: slot.y },
    // el punto no salta al dedo: se mueve con el desfasaje con que se lo agarro
    offX: c.x - e.clientX, offY: c.y - e.clientY,
    inicioX: e.clientX, inicioY: e.clientY,
    motivo: null,
  };
}
function _formPointerMove(e){
  const d = FORM_DRAG;
  if (!d || e.pointerId !== d.id) return;
  if (!d.activo){
    if (Math.hypot(e.clientX - d.inicioX, e.clientY - d.inicioY) < 4) return; // temblor, no es arrastre
    d.activo = true;
    _formProgramarRender();
  }
  const celda = pitchCeldaDesdePunto(e.clientX + d.offX, e.clientY + d.offY);
  if (!celda || (celda.x === d.celda.x && celda.y === d.celda.y)) return;
  d.celda = celda;
  FORM.sel = d.idx;
  // Si el destino no vale, el punto queda en la ultima celda valida; el motivo
  // del primer rechazo se muestra una sola vez, al soltar.
  if (!moveFormationDotTo(celda.x, celda.y, { silencioso: true }) && !d.motivo) d.motivo = FORM.motivo;
  _formProgramarRender();
}
function _formPointerFin(e){
  const d = FORM_DRAG;
  if (!d || e.pointerId !== d.id) return;
  FORM_DRAG = null;
  try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
  if (_formRaf){ cancelAnimationFrame(_formRaf); _formRaf = 0; }
  renderFormationModal();
  if (e.type === 'pointerup' && d.motivo) showMiniToast(d.motivo);
}
function _engancharArrastreCampo(){
  const campo = document.getElementById('ep-pitch-field');
  if (!campo) return;
  campo.addEventListener('pointerdown', _formPointerDown);
  campo.addEventListener('pointermove', _formPointerMove);
  campo.addEventListener('pointerup', _formPointerFin);
  campo.addEventListener('pointercancel', _formPointerFin);
}

function renderFormationModal(){
  const wrap = document.getElementById('ep-pitch-wrap');
  if(!wrap.innerHTML) return;
  const dots = FORM.draft.map((slot,i)=>{
    const pl = PLAYER_BY_ID[slot.id];
    const xPct = pitchPctX(slot.x, slot.y);
    const yPct = pitchPctY(slot.x, slot.y);
    const isSel = i===FORM.sel;
    const label = slot.pos || pitchLabelFor(slot.x, slot.y, slot.id);
    const arrastrando = FORM_DRAG && FORM_DRAG.activo && FORM_DRAG.idx === i && !isKeeperSlot(slot);
    return `<div class="ep-pitch-dot ${isSel?'me':''} ${isKeeperSlot(slot)?'gk':''} ${arrastrando?'dragging':''}"
      style="left:${xPct}%;top:${yPct}%;" title="${escHtml(pl.name)}">
      ${isSel?`<span class="ep-pitch-tag">${label}</span>`:''}
    </div>`;
  }).join('');
  document.getElementById('ep-pitch-dots').innerHTML = dots;

  // Alineacion en vivo (defensas-mediocampistas-delanteros segun las franjas).
  const lineupEl = document.getElementById('ep-form-lineup');
  if (lineupEl) lineupEl.textContent = _nombreFormacionDraft(FORM.draft);

  // Zona de la posicion del jugador seleccionado, pintada mas intensa.
  const selSlot = FORM.draft[FORM.sel];
  const selCode = selSlot.pos || pitchLabelFor(selSlot.x, selSlot.y, selSlot.id);
  const zonaPos = PITCH_POS_ZONAS[selCode];
  const posCont = document.getElementById('ep-pitch-pos');
  if (posCont){
    if (zonaPos){
      const zr = pitchRectGrilla(zonaPos.d[0], zonaPos.d[1], zonaPos.l[0], zonaPos.l[1]);
      posCont.innerHTML = `<div class="ep-pitch-pos" style="left:${zr.left}%;top:${zr.top}%;width:${zr.width}%;height:${zr.height}%;background:${PITCH_POS_COLOR[pitchThird((zonaPos.d[0]+zonaPos.d[1])/2)]};"></div>`;
    } else {
      posCont.innerHTML = ''; // arquero: no tiene zona de posicion
    }
  }

  const slot = FORM.draft[FORM.sel];
  const pl = PLAYER_BY_ID[slot.id];
  const label = slot.pos || pitchLabelFor(slot.x, slot.y, slot.id);
  const keeper = isKeeperSlot(slot);
  document.getElementById('ep-form-name').innerHTML =
    `${escHtml(pl.name)} ${pl.dorsal && pl.dorsal !== '?' ? `<span style="color:var(--txt3);font-size:12px;">#${escHtml(pl.dorsal)}</span>` : ''}
     <span class="ep-subs-badge">${label}</span>`;
  document.getElementById('ep-form-zone').textContent = keeper
    ? 'Arquero (posicion fija)'
    : PITCH_ZONE_BY_KEY[pitchThird(slot.x)].label;
  document.getElementById('ep-form-coords').textContent =
    `Columna ${slot.x}/${PITCH_COLS} · Fila ${slot.y}/${PITCH_ROWS}`;
  // selector de posicion: solo las que corresponden al bloque donde cae,
  // mas la que ya tiene (aunque haya quedado fuera de zona), sin repetir
  // las de banda.
  const sel = document.getElementById('ep-form-pos');
  if (sel){
    const opciones = opcionesPosicion(slot);
    sel.innerHTML = opciones.map(o =>
      `<option value="${escHtml(o.pos)}"${o.pos === label ? ' selected' : ''}${o.disponible ? '' : ' disabled'}>${escHtml(o.pos)}${o.disponible ? '' : ' (ocupada)'}</option>`
    ).join('');
    sel.disabled = keeper;
  }
  _renderFichaFormacion();
  _formAjustarAlto();
}

/* ================= Slice 3d: ficha y resumen del jugador seleccionado (solo vertical) ================= */
const FORM_CAMPO_MAX = 520;      // px: la cancha no crece mas que esto
const FORM_RESUMEN_ALTO = 150;   // px libres que pide el resumen (spec 3d): se reservan aunque la pestana sea corta
const FORM_CAMPO_MIN = 230;      // la cancha no baja de aca: con resumen, lo que sobra tras el resumen; sin el, se oculta el resumen
const FORM_ESCALA_CHICA = new Set(['cons','cond','wff','wfa','inj']); // escala 1-8 o lesion: fuera de mejores/peores
function _formValoresJugador(p){
  const out = [];
  for (const s of MAIN_STATS) out.push({ label: ETIQUETA_FILA[s.k] || s.l, value: p.stats[s.k] });
  for (const s of SEC_NEW) if (s.sc === 99 && !FORM_ESCALA_CHICA.has(s.k)) out.push({ label: s.l, value: p.sec[s.k] });
  return out.filter(x => typeof x.value === 'number');
}
/* chips que entran en el contenedor (2 lineas, overflow oculto); el resto se resume con «+N» */
function _formChipsQueEntran(cont, chips){
  let n = chips.length;
  const html = k => chips.slice(0, k).join('') + (k < chips.length ? `<span class="ep-chip ep-chip-mas">+${chips.length - k}</span>` : '');
  cont.innerHTML = html(n);
  while (n > 0 && cont.scrollHeight > cont.clientHeight + 1){ n--; cont.innerHTML = html(n); }
}
function _renderFichaFormacion(){
  if (!PITCH_VERTICAL || !document.getElementById('ep-pitch-ficha')) return;
  const slot = FORM.draft[FORM.sel];
  const p = slot && PLAYER_BY_ID[slot.id];
  if (!p) return;
  const banda = p.side !== undefined ? (SIDE_LABEL[p.side] || '—') : '—';
  const pie = FOOT_LABEL[p.favfoot] || p.foot;
  document.getElementById('ep-form-casillas').innerHTML = `
    <div class="ep-casilla"><span>Edad</span><b>${escHtml(p.age)}</b></div>
    <div class="ep-casilla"><span>Altura</span><b>${escHtml(p.height)} cm</b></div>
    <div class="ep-casilla"><span>Pie</span><b>${escHtml(pie)}</b></div>
    <div class="ep-casilla"><span>Banda</span><b>${escHtml(banda)}</b></div>`;
  const tab = FORM.resumen || 'mejores';
  for (const t of ['mejores','peores','habilidades','posiciones']){
    const b = document.getElementById('ep-res-t-' + t);
    if (b){ b.setAttribute('aria-selected', String(t === tab)); b.classList.toggle('on', t === tab); }
  }
  const body = document.getElementById('ep-res-body');
  if (tab === 'mejores' || tab === 'peores'){
    const orden = _formValoresJugador(p).sort((a,b) => tab === 'mejores' ? b.value - a.value : a.value - b.value).slice(0, 4);
    body.className = 'ep-res-body ep-res-list';
    body.innerHTML = orden.map(s => `<div class="ep-res-item"><span>${escHtml(s.label)}</span><b style="color:${TIER_COLOR[tierClass99(s.value)]};">${s.value}</b></div>`).join('');
  } else if (tab === 'habilidades'){
    body.className = 'ep-res-body ep-chips';
    _formChipsQueEntran(body, ALL_ABILITIES.filter(a => p.abilities[a.k]).map(a => `<span class="ep-chip">${escHtml(a.l)}</span>`));
  } else {
    body.className = 'ep-res-body ep-chips';
    const pos = POSITIONS.filter(q => p.positions[q.k]).sort((a,b) => (b.k === p.primaryPos) - (a.k === p.primaryPos));
    _formChipsQueEntran(body, pos.map(q => `<span class="ep-chip${q.k === p.primaryPos ? ' nat' : ''}">${escHtml(POS_BY_KEY[q.k]?.l || q.k)}</span>`));
  }
}
function setFormResumen(tab){ FORM.resumen = tab; _renderFichaFormacion(); _formAjustarAlto(); }

/* Orientacion: una sola fuente (la media query). Al cambiar con el modal abierto se
   cancela un arrastre en curso y se redibuja con el mismo borrador. */
const _PITCH_MQ = (typeof window !== 'undefined' && window.matchMedia) ? window.matchMedia('(max-width: 859.98px)') : null;
function _pitchSyncOrientation(){ PITCH_VERTICAL = !!(_PITCH_MQ && _PITCH_MQ.matches); return PITCH_VERTICAL; }
function _pitchOrientacionCambio(){
  _pitchSyncOrientation();
  const wrap = document.getElementById('ep-pitch-wrap');
  if (!wrap || !wrap.innerHTML) return;
  FORM_DRAG = null;
  _montarModalCancha();
}
if (_PITCH_MQ && _PITCH_MQ.addEventListener) _PITCH_MQ.addEventListener('change', _pitchOrientacionCambio);

let FORM_RO = null;
function _formObservarAlto(){
  _formDejarDeObservar();
  const body = document.querySelector('#ep-pitch-wrap .ep-modal-body');
  if (body && typeof ResizeObserver !== 'undefined'){
    FORM_RO = new ResizeObserver(() => _formAjustarAlto());
    FORM_RO.observe(body);
  }
  _formAjustarAlto();
}
function _formDejarDeObservar(){ if (FORM_RO){ FORM_RO.disconnect(); FORM_RO = null; } }
/* Alto de la cancha vertical: toma el alto que sobra. Muestra el resumen solo si la cancha
   queda FORM_CAMPO_MIN de cancha; si no, solo la ficha; si tampoco entra, ninguna. Horizontal: como antes. */
function _formAjustarAlto(){
  const wrap = document.getElementById('ep-pitch-wrap');
  const body = wrap && wrap.querySelector('.ep-modal-body');
  const campo = document.getElementById('ep-pitch-field');
  const fic = document.getElementById('ep-pitch-ficha');
  const res = document.getElementById('ep-res');
  if (!body || !campo) return;
  if (!PITCH_VERTICAL){ campo.style.removeProperty('--campo-h'); if (fic) fic.hidden = true; return; }
  // Medir con ficha y resumen visibles; luego decidir cuanto entra cada uno.
  campo.style.removeProperty('--campo-h');
  if (fic) fic.hidden = false;
  if (res) res.hidden = false;
  const cs = getComputedStyle(body);
  const gap = parseFloat(cs.rowGap) || 10;
  const libreTot = body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const fijosEls = [...body.children].filter(el => el !== campo && el !== fic && el !== res && el.offsetHeight > 0);
  const fijos = fijosEls.reduce((s, el) => s + el.offsetHeight, 0);
  const ficAlto = fic ? fic.offsetHeight : 0;
  const resAlto = res ? res.offsetHeight : 0;
  // altura de la cancha si quedan visibles la ficha y/o el resumen (cada bloque suma un espacio)
  const alto = (conFic, conRes) => libreTot - fijos - (conFic ? ficAlto : 0) - (conRes ? resAlto : 0)
    - (fijosEls.length + 1 + (conFic ? 1 : 0) + (conRes ? 1 : 0) - 1) * gap;
  let conFicha = true;
  // el resumen se muestra solo si, reservando FORM_RESUMEN_ALTO, la cancha conserva FORM_CAMPO_MIN
  const conResumen = alto(true, false) - FORM_RESUMEN_ALTO - gap >= FORM_CAMPO_MIN;
  let h = alto(true, conResumen);
  if (h < FORM_CAMPO_MIN){ conFicha = false; h = alto(false, false); }
  if (res) res.hidden = !conResumen;
  if (fic) fic.hidden = !conFicha;
  campo.style.setProperty('--campo-h', Math.max(160, Math.min(FORM_CAMPO_MAX, Math.floor(h))) + 'px');
}

function opcionesPosicion(slot){
  if (isKeeperSlot(slot) || FORM.draft.indexOf(slot) === 0) return [{ pos:'PT', disponible:true }];
  const base = posicionesEnBloque(slot.x, slot.y);
  const out = base.map(p => ({ pos: p, disponible: puedeAsignar(p, slot) }));
  // la posicion actual se mantiene aunque haya quedado fuera de zona
  if (slot.pos && !base.includes(slot.pos)) out.unshift({ pos: slot.pos, disponible: true });
  return out;
}
/* ¿Se puede asignar esta posicion a este jugador sin romper las reglas? */
function puedeAsignar(pos, slot){
  const linea = PITCH_POS_LINEA[pos];
  if (!linea) return false;
  const otros = FORM.draft.filter(s => s !== slot);
  if (otros.filter(s => s.pos && PITCH_POS_LINEA[s.pos] === linea).length >= PITCH_LINEA_MAX[linea]) return false;
  const maxPos = PITCH_POS_MAX[pos];
  if (maxPos && otros.filter(s => s.pos === pos).length >= maxPos) return false;
  if (PITCH_POS_BANDA.has(pos) && otros.some(s => s.pos === pos)) return false;
  return true;
}
/* Cuenta cuantos jugadores hay en cada linea segun su posicion declarada. */
function contarLineas(draft){
  const cuenta = { def:0, mid:0, att:0 };
  for (const s of draft || []) if (s && s.pos && PITCH_POS_LINEA[s.pos]) cuenta[PITCH_POS_LINEA[s.pos]]++;
  return cuenta;
}
const PITCH_LINEA_NOMBRE = { def:'defensas', mid:'mediocampistas', att:'delanteros' };
/* Linea que quedo por debajo del minimo y que ademas empeoro con el cambio
   (asi una formacion vieja ya invalida se puede ir corrigiendo).
   Recibe los conteos de antes y despues. */
function lineaBajoMinimo(ca, cd){
  for (const l of Object.keys(PITCH_LINEA_MIN)){
    if (cd[l] < PITCH_LINEA_MIN[l] && cd[l] < ca[l]) return l;
  }
  return null;
}
/* Valida la formacion completa. Devuelve el motivo del rechazo o null. */
function validarFormacion(draft){
  const cuenta = {};
  const porLinea = { def:0, mid:0, att:0 };
  for (const s of draft || []){
    if (!s || !s.pos) continue;
    cuenta[s.pos] = (cuenta[s.pos] || 0) + 1;
    if (PITCH_POS_LINEA[s.pos]) porLinea[PITCH_POS_LINEA[s.pos]]++;
  }
  for (const pos of PITCH_POS_BANDA) if ((cuenta[pos] || 0) > 1) return `no puede haber dos ${pos} en la formacion`;
  for (const [pos, max] of Object.entries(PITCH_POS_MAX)) if ((cuenta[pos] || 0) > max) return `maximo ${max} ${pos}`;
  for (const [l, max] of Object.entries(PITCH_LINEA_MAX)) if (porLinea[l] > max) return `maximo ${max} ${PITCH_LINEA_NOMBRE[l]}`;
  for (const [l, min] of Object.entries(PITCH_LINEA_MIN)) if (porLinea[l] < min) return `minimo ${min} ${PITCH_LINEA_NOMBRE[l]}`;
  return null;
}
/* Completa las posiciones que falten (formaciones publicadas viejas) con la
   primera opcion valida de cada bloque, respetando los topes. */
function completarPosiciones(){
  FORM.draft.forEach((s, i) => {
    if (s.pos) return;
    if (i === 0 || isKeeperSlot(s)){ s.pos = 'PT'; return; }
    const opciones = posicionesEnBloque(s.x, s.y);
    s.pos = opciones.find(p => puedeAsignar(p, s)) || opciones[0] || null;
  });
}
/* Al mover, si la posicion actual ya no pertenece al bloque nuevo (o no se
   puede por los topes), se pasa sola a la primera opcion valida. Dentro del
   bloque se mantiene, como en el juego. */
function ajustarPosicionAlMover(slot){
  if (!slot || isKeeperSlot(slot) || slot.pos === 'PT') return true;
  const opciones = posicionesEnBloque(slot.x, slot.y);
  if (slot.pos && opciones.includes(slot.pos) && puedeAsignar(slot.pos, slot)) return true;
  const libre = opciones.find(p => puedeAsignar(p, slot));
  if (libre){ slot.pos = libre; return true; }
  return false; // la linea de destino ya esta llena
}
function setFormationPos(valor){
  const slot = FORM.draft[FORM.sel];
  if (!slot || !valor) return;
  const antes = contarLineas(FORM.draft);
  const anterior = slot.pos;
  slot.pos = valor;
  const baja = lineaBajoMinimo(antes, contarLineas(FORM.draft));
  if (baja){
    slot.pos = anterior;
    const etiqueta = { def:'La defensa', mid:'El mediocampo', att:'La delantera' }[baja];
    const min = PITCH_LINEA_MIN[baja];
    showMiniToast(`${etiqueta} necesita al menos ${min} jugador${min > 1 ? 'es' : ''}.`);
    renderFormationModal();
    return;
  }
  renderFormationModal();
}
function selectFormationPlayer(i){ FORM.sel = i; renderFormationModal(); }
function cycleFormationPlayer(delta){
  FORM.sel = (FORM.sel + delta + FORM.draft.length) % FORM.draft.length;
  renderFormationModal();
}
/* Mueve el jugador seleccionado a la celda (x, y) como un solo cambio. Devuelve
   true si quedo ahi. Si no, deja el jugador donde estaba, guarda el motivo en
   FORM.motivo y muestra el toast (salvo {silencioso:true}, que usa el arrastre:
   ese muestra un solo toast al soltar). No renderiza: lo hace quien llama. */
function moveFormationDotTo(x, y, opciones){
  const silencioso = !!(opciones && opciones.silencioso);
  const slot = FORM.draft[FORM.sel];
  const fallo = (msg) => {
    FORM.motivo = msg;
    if (!silencioso) showMiniToast(msg);
    return false;
  };
  if (isKeeperSlot(slot)) return fallo('El arquero no se mueve de su posicion.');
  // Columna 2 = ultima linea: ahi esta tambien el arquero. La columna 1 es
  // margen contra la linea de meta (el juego no deja bajar mas).
  const antes = { x: slot.x, y: slot.y, pos: slot.pos };
  const lineasAntes = contarLineas(FORM.draft);
  const nx = Math.min(PITCH_COLS, Math.max(2, Math.round(x)));
  const ny = Math.min(PITCH_ROWS, Math.max(1, Math.round(y)));
  slot.x = nx; slot.y = ny;
  if (!ajustarPosicionAlMover(slot)){
    slot.x = antes.x; slot.y = antes.y; slot.pos = antes.pos;
    const linea = { def:'La defensa', mid:'El mediocampo', att:'El ataque' }[pitchThird(nx)] || 'Esa linea';
    return fallo(`${linea} ya tiene el maximo de jugadores.`);
  }
  const baja = lineaBajoMinimo(lineasAntes, contarLineas(FORM.draft));
  if (baja){
    slot.x = antes.x; slot.y = antes.y; slot.pos = antes.pos;
    const linea = { def:'La defensa', mid:'El mediocampo', att:'La delantera' }[baja];
    const min = PITCH_LINEA_MIN[baja];
    return fallo(`${linea} necesita al menos ${min} jugador${min > 1 ? 'es' : ''}.`);
  }
  FORM.motivo = null;
  return true;
}
/* Ajuste de una celda: la cruz de 2.C y las flechas del teclado. */
function moveFormationDot(dx,dy){
  const slot = FORM.draft[FORM.sel];
  moveFormationDotTo(slot.x + dx, slot.y + dy);
  renderFormationModal();
}
/* Flechas y cruz segun la pantalla. Horizontal: arriba = y-1, izquierda = x-1 (arco propio a la
   izquierda). Vertical: arriba = x+1 (adelante), izquierda = y-1 (banda izquierda). */
const FORM_DIR_HORIZ = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };
const FORM_DIR_VERT  = { up:[1,0], down:[-1,0], left:[0,-1], right:[0,1] };
function moveFormationScreen(dir){
  const [dx, dy] = (PITCH_VERTICAL ? FORM_DIR_VERT : FORM_DIR_HORIZ)[dir] || [0, 0];
  moveFormationDot(dx, dy);
}
function resetFormationDraft(){
  FORM.draft = JSON.parse(JSON.stringify(formacionVigente()));
  completarPosiciones();
  renderFormationModal();
  showMiniToast('Formacion restablecida a la del save.');
}
/* Nombre 4-4-2 derivado del borrador (mismas franjas que la cancha:
   defensa hasta la columna 15, medio 16-34, ataque 35-47). */
function _nombreFormacionDraft(draft){
  const cuenta = { def:0, mid:0, att:0 };
  for (const s of (draft || []).slice(1)){
    if (s && Number.isFinite(s.x)) cuenta[pitchThird(s.x)]++;
  }
  return `${cuenta.def}-${cuenta.mid}-${cuenta.att}`;
}
/* Opcion B: el presidente manda la formacion como pedido y la Tool la
   escribe en el save. No cuesta YunaCoins. */
async function confirmFormation(){
  FORMATION = JSON.parse(JSON.stringify(FORM.draft));
  const error = validarFormacion(FORMATION);
  if (error){ showMiniToast('Formacion invalida: ' + error + '.'); return; }
  const nombre = _nombreFormacionDraft(FORMATION);
  const slots = FORMATION.map((s, i) => ({
    slot: i,
    jugador: PES5_PLANTILLA.registroDeId(s.id),
    // El arquero siempre se guarda en 1 (linea de meta), aunque en pantalla
    // se dibuje en la columna 2 junto al defensor mas atrasado; el resto no
    // baja de 2, que es el minimo de los jugadores de campo en el save.
    prof: i === 0 ? 1 : Math.max(2, Math.min(47, Math.round(s.x))),
    lat: i === 0 ? null : Math.max(6, Math.min(99, Math.round(6 + (s.y - 1) * 93 / 46))),
    posNombre: s.pos || null,
  }));
  try {
    await firebase.firestore().collection('pedidos_pes5').add({
      uid: AUTH.user.uid,
      teamId: String(AUTH.teamId),
      teamName: EQUIPO_TSC?.name || null,
      pes5Club: EQUIPO_TSC?.pes5Club || null,
      tipo: 'formacion',
      pes5ClubIdx: EQUIPO_TSC ? EQUIPO_TSC.pes5ClubIdx : null,
      formacion: { nombre, slots },
      lines: [{ label: 'Formación', from: FORMATION_NAME, to: nombre }],
      totalCost: 0,
      estado: 'pendiente',
      creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
    });
    try{ localStorage.setItem(_formationKey(), JSON.stringify(FORMATION)); }catch(e){}
    FORMATION_NAME = nombre;
    // presentacion: la formacion recien enviada ya cuenta como pendiente (aviso y globito)
    APP.pendientes.push({ _id: 'local-' + Date.now(), tipo: 'formacion', formacion: { nombre }, lines: [{ label: 'Formación', from: '', to: nombre }], estado: 'pendiente' });
    renderPending();
    closeFormationModal();
    showMiniToast('Formacion enviada. La Tool la aplica al save.');
  } catch(e) {
    console.warn('[editor] pedido de formacion', e);
    showMiniToast('No se pudo enviar la formacion: ' + (e?.message || e));
  }
}
document.addEventListener('keydown', function(e){
  const wrap = document.getElementById('ep-pitch-wrap');
  if(!wrap || !wrap.innerHTML) return;
  const move = {ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down'};
  if(move[e.key]){ e.preventDefault(); moveFormationScreen(move[e.key]); return; }
  if(e.key==='Tab'){ e.preventDefault(); cycleFormationPlayer(e.shiftKey?-1:1); }
});

/* ================= adjust (con tope EN VIVO de YunaCoins disponibles) ================= */

/* ================= Altura en hoja chica (2.0-3e) =================
   La casilla Altura abre esta hoja. El ajuste es el mismo adjustHeight de siempre (cupo de
   Categoria 2 incluido): aca solo cambia donde se toca. Mantener + o - repite el paso. */
const ALT_PAUSA_MS = 450;   // antes de empezar a repetir
const ALT_REPITE_MS = 90;   // intervalo de la repeticion
let _altTimer = 0, _altRepetido = false;
function _altParar(){ clearTimeout(_altTimer); _altTimer = 0; }
/* Texto del tope: el mismo criterio que adjustHeight (tramo destino con cupo de HEIGHT_CAPS). */
function _altCupoTexto(p){
  if (ADMIN_EMBED) return 'Modo admin: sin tope de cupo de Categoría 2.';
  const cur = APP.draft.height;
  const curB = heightBracket(cur);
  if (curB){
    const n = heightBracketCount(curB, p.id) + 1;   // este jugador tambien ocupa el tramo
    return `Tramo ${HEIGHT_BRACKET_LABEL[curB]}: ${n} de ${HEIGHT_CAPS[curB]} jugadores.`;
  }
  for (let h = cur + 1; h <= 205; h++){
    const nxt = heightBracket(h);
    if (!nxt) continue;
    const libres = HEIGHT_CAPS[nxt] - heightBracketCount(nxt, p.id);
    return libres > 0
      ? `Subir a ${HEIGHT_BRACKET_LABEL[nxt]}: ${libres} ${libres === 1 ? 'lugar libre' : 'lugares libres'}.`
      : `Subir a ${HEIGHT_BRACKET_LABEL[nxt]}: cupo lleno.`;
  }
  return 'Esta altura no tiene tope de cupo.';
}
function _altRefrescar(){
  const p = currentPlayer();
  const num = document.getElementById('ep-alt-num');
  if (!p || !num) return;
  const cur = APP.draft.height;
  const cambio = cur !== p.height;
  num.textContent = cur;
  num.classList.toggle('chg', cambio);
  const old = document.getElementById('ep-alt-old');
  if (old) old.textContent = cambio ? String(p.height) : '';
  document.getElementById('ep-alt-menos').disabled = cur <= 148;
  document.getElementById('ep-alt-mas').disabled = cur >= 205;
  document.getElementById('ep-alt-cupo').textContent = _altCupoTexto(p);
}
/* Un paso con adjustHeight. Devuelve true si la altura cambio (si no, hubo tope o cupo). */
function _altPaso(delta){
  const antes = APP.draft.height;
  adjustHeight(delta);
  _altRefrescar();
  return APP.draft.height !== antes;
}
function _altEnlazar(){
  const enlazar = (id, delta) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('pointerdown', e => {
      if (e.button !== 0 || btn.disabled) return;
      _altRepetido = false;
      _altParar();
      _altTimer = setTimeout(function repetir(){
        if (!_altPaso(delta)){ _altParar(); return; }   // tope o cupo: se corta la repeticion
        _altRepetido = true;
        _altTimer = setTimeout(repetir, ALT_REPITE_MS);
      }, ALT_PAUSA_MS);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => btn.addEventListener(t, _altParar));
    btn.addEventListener('click', () => {
      if (_altRepetido){ _altRepetido = false; return; }   // el press largo ya sumo
      _altPaso(delta);
    });
  };
  enlazar('ep-alt-menos', -1);
  enlazar('ep-alt-mas', 1);
}
function _altTecla(e){ if (e.key === 'Escape') mejCerrarAltura(); }
function mejAbrirAltura(){
  const p = currentPlayer();
  const wrap = document.getElementById('ep-alt-wrap');
  if (!p || !wrap || p.heightFixed) return;
  wrap.innerHTML = `
  <div class="ep-overlay ep-overlay-sheet" data-onclick="closeIfBackdrop(event,mejCerrarAltura)">
    <section class="ep-sheet" role="dialog" aria-modal="true" aria-labelledby="ep-alt-tit">
      <div class="ep-grab" aria-hidden="true"></div>
      <div class="ep-sheet-hd">
        <h2 id="ep-alt-tit">Altura · gratis</h2>
        <span>Sin costo en YunaCoins. Sujeta al cupo de Categoría 2.</span>
      </div>
      <div class="ep-alt-step">
        <button type="button" class="ep-alt-btn" id="ep-alt-menos" aria-label="Bajar altura">&minus;</button>
        <div class="ep-alt-val"><b id="ep-alt-num" aria-live="polite"></b><span>cm</span><s id="ep-alt-old" class="ep-alt-old"></s></div>
        <button type="button" class="ep-alt-btn" id="ep-alt-mas" aria-label="Subir altura">+</button>
      </div>
      <div class="ep-alt-cupo" id="ep-alt-cupo"></div>
      <div class="ep-sheet-act ep-alt-act">
        <button type="button" class="ep-btn primary ep-alt-listo" data-onclick="mejCerrarAltura()">Listo</button>
      </div>
    </section>
  </div>`;
  _altEnlazar();
  _altRefrescar();
  document.addEventListener('keydown', _altTecla);
  const listo = wrap.querySelector('.ep-alt-listo');
  if (listo) listo.focus();
}
function mejCerrarAltura(){
  _altParar();
  _altRepetido = false;
  document.removeEventListener('keydown', _altTecla);
  const wrap = document.getElementById('ep-alt-wrap');
  if (wrap) wrap.innerHTML = '';
}

/* altura: gratis (sin costo en YunaCoins), pero sujeta al cupo de Categoria 2.
   Bloquea solo cuando el cambio HACE ENTRAR al jugador a un tramo que ya esta
   lleno entre el resto del plantel — moverse dentro del mismo tramo, o a uno
   sin tope, siempre esta permitido. */
function adjustHeight(delta){
  const p = currentPlayer();
  if(p.heightFixed) return;
  const cur = APP.draft.height;
  const next = cur + delta;
  if(next<148 || next>205) return;
  const curBracket = heightBracket(cur);
  const nextBracket = heightBracket(next);
  if(!ADMIN_EMBED && nextBracket && nextBracket!==curBracket){
    const count = heightBracketCount(nextBracket, p.id);
    if(count >= HEIGHT_CAPS[nextBracket]){
      showMiniToast(`Cupo lleno para altura ${HEIGHT_BRACKET_LABEL[nextBracket]} (max ${HEIGHT_CAPS[nextBracket]} jugadores).`);
      return;
    }
  }
  APP.draft.height = next;
  renderCard();
  renderCart();
}

function adjustMain(key,delta){
  const p = currentPlayer();
  APP.hint = MAIN_BY_KEY[key].d;
  document.getElementById('ep-hint').textContent = APP.hint;
  const cur = APP.draft.stats[key];
  if(delta>0){
    if(cur>=99){ renderRows(); return; }
    if(!canAfford(bandCost99(cur+1))){ showMiniToast('Saldo insuficiente — no puedes superar el total de YunaCoins disponibles.'); renderRows(); return; }
    APP.draft.stats[key] = cur+1;
  }else{
    if(cur<=(ADMIN_EMBED ? 0 : p.stats[key])){ renderRows(); return; }
    APP.draft.stats[key] = cur-1;
  }
  renderRows(); renderCart();
}
function adjustSec(key,delta){
  const p = currentPlayer();
  const def = SEC_NEW.find(s=>s.k===key);
  APP.hint = def.d;
  document.getElementById('ep-hint').textContent = APP.hint;
  const cur = APP.draft.sec[key];
  const max = def.sc===99 ? 99 : 8;
  if(delta>0){
    if(cur>=max){ renderRows(); return; }
    const nextCost = def.sc===99 ? bandCost99(cur+1) : RULES.scale8Cost;
    if(!canAfford(nextCost)){ showMiniToast('Saldo insuficiente — no puedes superar el total de YunaCoins disponibles.'); renderRows(); return; }
    APP.draft.sec[key] = cur+1;
  }else{
    if(cur<=(ADMIN_EMBED ? (def.sc===99 ? 0 : 1) : p.sec[key])){ renderRows(); return; }
    APP.draft.sec[key] = cur-1;
  }
  renderRows(); renderCart();
}
function adjustInjury(delta){
  const p = currentPlayer();
  APP.hint = INJ_DEF.d;
  document.getElementById('ep-hint').textContent = APP.hint;
  const baseIdx = INJURY_ORDER.indexOf(p.sec.inj);
  const curIdx  = INJURY_ORDER.indexOf(APP.draft.sec.inj);
  if(delta>0){
    if(curIdx>=2){ renderRows(); return; }
    if(!canAfford(RULES.injuryCost)){ showMiniToast('Saldo insuficiente — no puedes superar el total de YunaCoins disponibles.'); renderRows(); return; }
    APP.draft.sec.inj = INJURY_ORDER[curIdx+1];
  }else{
    if(curIdx<=(ADMIN_EMBED ? 0 : baseIdx)){ renderRows(); return; }
    APP.draft.sec.inj = INJURY_ORDER[curIdx-1];
  }
  renderRows(); renderCart();
}
function toggleAbility(key){
  const p = currentPlayer();
  // Marca la fila como seleccionada igual que adjustMain/adjustSec: la fila activa
  // se decide comparando APP.hint con la descripcion de la fila.
  const ab = ABILITY_BY_KEY[key];
  if(ab){ APP.hint = ab.d; document.getElementById('ep-hint').textContent = ab.d; }
  if(p.abilities[key] && !ADMIN_EMBED){ renderRows(); return; } // ya comprada antes, no se puede "vender" (el admin si puede quitarla)
  if(!APP.draft.abilities[key] && !p.abilities[key] && !canAfford(RULES.abilityCost)){
    showMiniToast('Saldo insuficiente — no puedes superar el total de YunaCoins disponibles.'); renderRows(); return;
  }
  APP.draft.abilities[key] = !APP.draft.abilities[key];
  renderRows(); renderCart();
}
function togglePosition(key){
  const p = currentPlayer();
  const d = APP.draft;
  const on = d.positions[key];
  const marcadasCount = Object.values(d.positions).filter(Boolean).length;

  // El tope reglamentario de la TSC (maxPositions) es solo del presidente: el admin edita libre
  // (por ejemplo al nivelar plantillas). Quitar posiciones siempre se puede.
  if(!ADMIN_EMBED && !on && marcadasCount >= RULES.maxPositions) {
    showMiniToast('Tope de ' + RULES.maxPositions + ' posiciones.');
    return;
  }
  if(!ADMIN_EMBED){
    // Presidente: no puede desmarcar la registrada
    if(on && key === d.primaryPos){ showMiniToast('Es la posición natural: primero elegí otra como natural.'); return; }
  } else {
    // Admin: no puede desmarcar todas
    if(on && marcadasCount === 1) {
      showMiniToast('Tiene que quedar al menos una posición.');
      return;
    }
    // Admin: si desmarca la registrada, pasar a la primera marcada restante
    if(on && key === d.primaryPos) {
      for(const pos of POSITIONS) {
        if(pos.k !== key && d.positions[pos.k]) {
          d.primaryPos = pos.k;
          break;
        }
      }
    }
  }

  d.positions[key] = !d.positions[key];
  renderCard(); renderRows(); renderCart();
}
// El save de PES5 guarda un solo bit para el pie dominante: derecho o izquierdo. No existe "ambos".
const FOOT_LABEL = { D: 'Der.', I: 'Izq.' };
const SIDE_LABEL = { D: 'Der.', I: 'Izq.', A: 'Ambas' };
function setFavFoot(v){
  APP.draft.favfoot = v;
  renderCard(); renderRows(); renderCart(); // la tarjeta muestra el pie elegido y el boton de guardar se reevalua
}
function setSide(v){
  APP.draft.side = v;
  renderCard(); renderRows(); renderCart();
}
function setPrimaryPos(k){
  if(!APP.draft.positions[k]) return;
  APP.draft.primaryPos = k;
  renderCard(); renderRows(); renderCart();
}

function starSvg(on){
  return `<svg class="icn star ${on?'on':''}" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>`;
}

/* ================= render: filas por pagina ================= */

function numericRowHTML(label,desc,value,min,max,colorFn,onDec,onInc,locked,affordNext,costSoFar){
  const color = colorFn(value);
  const pct = Math.round(value/max*100);
  const decDisabled = locked || value<=(ADMIN_EMBED ? (max===8 ? 1 : 0) : min);
  const incDisabled = locked || value>=max || !affordNext;
  const sel = APP.hint===desc;
  const cambiada = value !== min; // min = valor original del jugador: si cambio, la fila se resalta
  const tono = cambiada ? 'var(--gold)' : color; // fila cambiada: valor y barra en dorado
  const costBadge = costSoFar>0 ? `<span class="ep-rcost-row">+${costSoFar.toLocaleString('es-CL')}</span>` : '';
  const viejo = cambiada ? `<span class="ep-rold">${min}</span>` : '';
  // la descripcion vive dentro de la fila: la del atributo elegido o la de un cambio pendiente
  const detalle = (sel || cambiada) ? `<div class="ep-rdesc">${escHtml(desc)}</div>` : '';
  return `<div class="ep-row ${sel?'sel':''} ${cambiada?'chg':''} ${locked?'locked':''}" data-onclick="setHint('${jsq(desc)}')">
    <div class="ep-rmain">
      <div class="ep-rhead"><span class="ep-rlabel">${escHtml(label)}</span>${costBadge}</div>
      <div class="ep-rbar"><i style="width:${pct}%;background:${tono};"></i></div>
    </div>
    <div class="ep-rnum">${viejo}<span class="ep-rval" style="color:${tono};">${value}</span></div>
    <div class="ep-rstep">
      <button ${decDisabled?'disabled':''} aria-label="Bajar ${escHtml(label)}" data-onclick="event.stopPropagation();${onDec}">&minus;</button>
      <button ${incDisabled?'disabled':''} aria-label="Subir ${escHtml(label)}" data-onclick="event.stopPropagation();${onInc}">+</button>
    </div>
    ${detalle}
  </div>`;
}

/* Presentacion (2.0-3c): grupos de la pagina Principales y etiquetas completas de la propuesta.
   Solo cambian lo que se muestra; las claves (k) y MAIN_STATS siguen igual. */
const GRUPOS_PRINCIPALES = [
  ['Rol', ['atk','def']],
  ['Físico', ['equ','res','vm','ace','rsp','agi']],
  ['Balón y pase', ['pcd','vcd','ppc','vpc','ppl','vpl']],
  ['Disparo', ['pre','pot','ted']],
];
const ETIQUETA_FILA = {atk:'Ataque', def:'Defensa', equ:'Equilibrio', res:'Resistencia', vm:'Vel. máxima', ace:'Aceleración',
  rsp:'Respuesta', agi:'Agilidad', pcd:'Prec. conducción', vcd:'Vel. conducción', ppc:'Prec. pase corto', vpc:'Vel. pase corto',
  ppl:'Prec. pase largo', vpl:'Vel. pase largo', pre:'Precisión', pot:'Potencia', ted:'Téc. de disparo'};

function renderRows(){
  const p = currentPlayer();
  const d = APP.draft;
  const wrap = document.getElementById('ep-rows');
  let html = '';

  if(APP.page===1){
    html = GRUPOS_PRINCIPALES.map(([titulo, keys]) => `<div class="ep-grp">${titulo}</div>` + keys.map(k => {
      const s = MAIN_BY_KEY[k];
      const v = d.stats[k];
      const afford = v>=99 || canAfford(bandCost99(v+1));
      const cost = v>p.stats[k] ? costRange99(p.stats[k], v) : 0;
      return numericRowHTML(ETIQUETA_FILA[k] || s.l, s.d, v, p.stats[k], 99, val=>TIER_COLOR[tierClass99(val)],
        `adjustMain('${k}',-1)`, `adjustMain('${k}',1)`, false, afford, cost);
    }).join('')).join('');
  }

  if(APP.page===2){
    html += ECHO_KEYS.map(k=>{
      const s = MAIN_BY_KEY[k]; const v = d.stats[k];
      const afford = v>=99 || canAfford(bandCost99(v+1));
      const cost = v>p.stats[k] ? costRange99(p.stats[k], v) : 0;
      return numericRowHTML(s.l, s.d, v, p.stats[k], 99, val=>TIER_COLOR[tierClass99(val)],
        `adjustMain('${k}',-1)`, `adjustMain('${k}',1)`, false, afford, cost);
    }).join('');
    html += SEC_NEW.map(s=>{
      if(s.sc===99){
        const v = d.sec[s.k];
        const afford = v>=99 || canAfford(bandCost99(v+1));
        const cost = v>p.sec[s.k] ? costRange99(p.sec[s.k], v) : 0;
        return numericRowHTML(s.l, s.d, v, p.sec[s.k], 99, val=>TIER_COLOR[tierClass99(val)],
          `adjustSec('${s.k}',-1)`, `adjustSec('${s.k}',1)`, false, afford, cost);
      }
      if(s.sc===8){
        const v = d.sec[s.k];
        const afford = v>=8 || canAfford(RULES.scale8Cost);
        const cost = v>p.sec[s.k] ? (v-p.sec[s.k])*RULES.scale8Cost : 0;
        return numericRowHTML(s.l, s.d, v, p.sec[s.k], 8, ()=>'var(--tier-n)',
          `adjustSec('${s.k}',-1)`, `adjustSec('${s.k}',1)`, false, afford, cost);
      }
      // injury C/B/A
      const v = d.sec.inj;
      const idx = INJURY_ORDER.indexOf(v);
      const baseIdx = INJURY_ORDER.indexOf(p.sec.inj);
      const afford = idx>=2 || canAfford(RULES.injuryCost);
      const cost = idx>baseIdx ? (idx-baseIdx)*RULES.injuryCost : 0;
      return `<div class="ep-row ${APP.hint===s.d?'sel':''}" data-onclick="setHint('${jsq(s.d)}')">
        <div class="ep-rlabel">${escHtml(s.l)}</div>
        ${cost>0?`<div class="ep-rcost-row">+${cost.toLocaleString('es-CL')}</div>`:''}
        <div class="ep-rval" style="color:var(--tier-n);">${v}</div>
        <div class="ep-rbar"></div>
        <div class="ep-rstep">
          <button ${v==='C'?'disabled':''} data-onclick="event.stopPropagation();adjustInjury(-1)">&minus;</button>
          <button ${v==='A'||!afford?'disabled':''} data-onclick="event.stopPropagation();adjustInjury(1)">+</button>
        </div>
      </div>`;
    }).join('');
  }

  function abilityRow(a){
    const on = d.abilities[a.k];
    const boughtBefore = p.abilities[a.k];
    const canToggle = boughtBefore || on || canAfford(RULES.abilityCost);
    return `<div class="ep-row ${APP.hint===a.d?'sel':''} ${(!on&&!canToggle)?'locked':''}" data-onclick="setHint('${jsq(a.d)}')">
      <div class="ep-rlabel">${escHtml(a.l)}</div>
      <div class="ep-rcost">${on&&!boughtBefore?'+'+RULES.abilityCost:''}</div>
      <div class="ep-rstar ${on?'on':''}" data-onclick="event.stopPropagation();toggleAbility('${a.k}')">${starSvg(on)}</div>
    </div>`;
  }
  function padRow(){ return `<div class="ep-row pad"><div class="ep-rlabel">&mdash;</div></div>`; }

  if(APP.page===3){
    html = ALL_ABILITIES.map(abilityRow).join('');
  }
  if(APP.page===4){
    html = POSITIONS.map(pos=>{
      const on = d.positions[pos.k];
      const isRegistered = pos.k === d.primaryPos;
      const hint = isRegistered ? 'Posición natural (círculo O): la posición principal del jugador.' : (on ? 'Posición secundaria (sin costo). Con el botón circular la hacés natural.' : 'Posición secundaria disponible para este jugador (sin costo en YunaCoins).');
      const circleBtn = on && !isRegistered
        ? `<button class="ep-register-btn" title="Hacer natural (círculo O)" data-onclick="event.stopPropagation();setPrimaryPos('${pos.k}')"><svg class="icn" viewBox="0 0 24 24" style="width:16px;height:16px;"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button>`
        : '';
      const labelBadge = isRegistered
        ? `<span style="color:var(--gold);font-size:11px;">(natural)</span>`
        : '';
      return `<div class="ep-row" data-onclick="setHint('${jsq(hint)}')">
        <div class="ep-rlabel">${escHtml(pos.l)} ${labelBadge}</div>
        <div style="display:flex;gap:5px;align-items:center;">
          ${circleBtn}
          <div class="ep-rstar ${on?'on':''}" data-onclick="event.stopPropagation();togglePosition('${pos.k}')">${starSvg(on)}</div>
        </div>
      </div>`;
    }).join('') + `
      <div class="ep-row" data-onclick="setHint('Pie dominante del jugador. En el juego solo puede ser derecho o izquierdo.')">
        <div class="ep-rlabel">Pie dominante</div>
        <div class="ep-rfoot">
          <button class="${d.favfoot==='I'?'on':''}" data-onclick="event.stopPropagation();setFavFoot('I')">Izq.</button>
          <button class="${d.favfoot==='D'?'on':''}" data-onclick="event.stopPropagation();setFavFoot('D')">Der.</button>
        </div>
      </div>
      <div class="ep-row" data-onclick="setHint('Banda donde rinde más el jugador (derecha, izquierda o ambas). Es independiente del pie.')">
        <div class="ep-rlabel">Banda</div>
        <div class="ep-rfoot">
          <button class="${d.side==='D'?'on':''}" data-onclick="event.stopPropagation();setSide('D')">Der.</button>
          <button class="${d.side==='I'?'on':''}" data-onclick="event.stopPropagation();setSide('I')">Izq.</button>
          <button class="${d.side==='A'?'on':''}" data-onclick="event.stopPropagation();setSide('A')">Ambas</button>
        </div>
      </div>`;
  }

  wrap.innerHTML = html;
}

/* ================= boot ================= */

function renderAll(){
  renderTop();
  renderRoster();
  renderCard();
  renderPager();
  renderRows();
  renderCart();
  renderPending();
  document.getElementById('ep-hint').textContent = APP.hint;
}
/* Cabecera: nombre del equipo e iniciales (presentacion). En modo admin lo pisa renderAdminBar. */
function renderTop(){
  const nombre = (EQUIPO_TSC && EQUIPO_TSC.name) || 'Mi equipo';
  const nameEl = document.getElementById('ep-top-name');
  if (nameEl && !ADMIN_EMBED) nameEl.textContent = nombre;
  const badge = document.getElementById('ep-top-badge');
  if (badge && !ADMIN_EMBED){
    const iniciales = nombre.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    badge.textContent = iniciales || 'TSC';
  }
}

// Slice D2: el presidente cancela un pedido propio mientras esta pendiente.
// La UI que la llama llega en el slice F.
async function cancelarPedido(pedidoId){
  await firebase.firestore().collection('pedidos_pes5').doc(pedidoId).update({
    estado: 'cancelado', canceladoEn: new Date().toISOString(),
  });
  await recalcularPresupuestoReal();
}

/* ================= Slice Q2: modo admin embebido ================= */

function adjustAge(delta){
  if(!ADMIN_EMBED) return;
  const next = APP.draft.age + delta;
  if(next<15 || next>46) return;
  APP.draft.age = next;
  renderCard(); renderCart();
}

// Barra superior del modo admin: titulo con el equipo y si se cobra o es edicion libre.
function renderAdminBar(){
  const top = document.querySelector('.ep-top-txt');
  if(!top) return;
  const e = EQUIPO_TSC;
  const estado = e.cobra
    ? `Se cobra a ${escHtml(e.name)} · saldo ${Number(e.yunacoin||0).toLocaleString('es-CL')}`
    : 'Sin presidente · edición libre, sin cobro';
  const nameEl = document.getElementById('ep-top-name');
  if (nameEl) nameEl.textContent = 'Editando · ' + (e.name || '');
  const sub = top.querySelector('.ep-top-sub');
  if (sub) sub.textContent = e.pes5Club || 'Mejoras de jugadores';
  let tag = top.querySelector('.ep-admin-tag');
  if(!tag){ tag = document.createElement('span'); tag.className = 'ep-admin-tag'; top.appendChild(tag); }
  tag.textContent = estado;
}

function iniciarModoAdmin(m){
  RULES = m.reglas;
  EQUIPO_TSC = m.equipo;
  PLAYERS = (m.jugadores || []).map(j => jugadorDesdePlantillaReal(j, { teamName: m.equipo.name }));
  PLAYER_BY_ID = Object.fromEntries(PLAYERS.map(p => [p.id, p]));
  APP.budget = { general: m.presupuesto.general, subscribers: m.presupuesto.subscribers };
  APP.saldo = m.presupuesto.saldo || 0;
  APP.playerId = m.jugadorId;
  APP.page = 1;
  APP.hint = 'Selecciona un atributo para ver su descripcion.';
  ADMIN_PENDIENTE = m.pendiente || null;
  loadDraft();
  _raiz().classList.add('admin-embed');
  if(!m.equipo.cobra) _raiz().classList.add('admin-libre');
  document.getElementById('ep-gate').style.display = 'none';
  document.getElementById('ep-shell').style.display = '';
  const ap = document.getElementById('ep-apply');
  if(ap) ap.lastChild.textContent = 'Guardar en la tool';
  renderAdminBar();
  renderAll();
}

// "Aplicar" en modo admin: no escribe nada. Le entrega el borrador a quien monto el editor
// (onAplicar) y despues le pide cerrarse (onCerrar). Antes iba por postMessage a la tool.
function commitChangesAdmin(){
  const p = currentPlayer();
  closeApplyConfirm();
  const draft = { stats: APP.draft.stats, sec: APP.draft.sec, abilities: APP.draft.abilities, positions: APP.draft.positions, primaryPos: APP.draft.primaryPos, side: APP.draft.side, height: APP.draft.height, favfoot: APP.draft.favfoot, age: APP.draft.age };
  if (typeof _opciones.onAplicar === 'function') _opciones.onAplicar({ jugadorId: p.id, draft: draft, costo: pendingCost() });
  if (typeof _opciones.onCerrar === 'function') _opciones.onCerrar();
}

/* ================= Slice Q4: bloqueo por equipo (un solo editor a la vez) ================= */
let _bloqLatido = null, _bloqObs = null, _bloqSondeo = null;

function _bloqNombre(){
  return (AUTH.profile && AUTH.profile.displayName) || (AUTH.user && AUTH.user.email && AUTH.user.email.split('@')[0]) || 'Presidente';
}

// Toma el bloqueo del equipo como presidente. Si el admin lo tiene vigente devuelve { ok:false, de }.
// Si Firestore falla (reglas, red), no se bloquea al usuario: se sigue sin bloqueo.
async function tomarBloqueoPresidente(){
  try { return await PES5_BLOQUEO.tomar(AUTH.teamId, 'presidente', AUTH.user.uid, _bloqNombre()); }
  catch (e){ console.warn('[mejoras] no se pudo tomar el bloqueo, se sigue sin bloqueo:', e); return { ok: true }; }
}

function iniciarLatidoPresidente(){
  if (_bloqLatido) return;
  // mientras la pagina esta visible se renueva el bloqueo; oculta, vence solo a los 3 minutos
  _bloqLatido = setInterval(async () => {
    if (document.visibilityState !== 'visible' || !AUTH.user || AUTH.teamId == null) return;
    try {
      const r = await PES5_BLOQUEO.latir(AUTH.teamId, 'presidente', AUTH.user.uid, _bloqNombre());
      if (!r.ok) mostrarBloqueoActivo(r.de);
    } catch (e) {}
  }, PES5_BLOQUEO.LATIDO_MS);
  window.addEventListener('pagehide', () => {
    if (AUTH.user && AUTH.teamId != null) PES5_BLOQUEO.liberar(AUTH.teamId, AUTH.user.uid);
  });
  // si el admin toma el equipo mientras el presidente esta adentro, se lo bloquea al instante
  try {
    _bloqObs = PES5_BLOQUEO.observar(AUTH.teamId, (d) => {
      if (d && PES5_BLOQUEO.vivo(d) && d.uid !== AUTH.user.uid) mostrarBloqueoActivo(d);
    });
  } catch (e) {}
}

// Pantalla de espera: el admin esta editando el equipo. Se resetea el estado cargado para que,
// cuando se libere, se vuelva a leer la plantilla publicada, las reglas y el saldo actualizados.
function mostrarBloqueoActivo(d){
  const gate = document.getElementById('ep-gate'), shell = document.getElementById('ep-shell');
  if (!gate || !shell) return;
  PLAYERS = []; PLAYER_BY_ID = {}; _gatePlantillaClub = undefined; _gateTeamId = undefined;
  const hora = d && d.desde ? new Date(d.desde).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '';
  shell.style.display = 'none';
  gate.style.display = '';
  gate.innerHTML = `<p><b>${escHtml((d && d.nombre) || 'El admin')}</b> está editando tu equipo en este momento${hora ? ` (desde las ${escHtml(hora)})` : ''}.</p>
    <p>Vas a poder mejorar tus jugadores cuando termine y publique los cambios. Esta pantalla se actualiza sola.</p>`;
  if (!_bloqSondeo){
    _bloqSondeo = setInterval(async () => {
      try {
        const actual = await PES5_BLOQUEO.leer(AUTH.teamId);
        if (!actual || !PES5_BLOQUEO.vivo(actual) || actual.uid === AUTH.user.uid){
          clearInterval(_bloqSondeo); _bloqSondeo = null;
          renderAuthUI();
        }
      } catch (e) {}
    }, 15000);
  }
}


/* ================= API del componente (slice 2.0-1.B) ================= */

let _montado = null;      // contenedor donde esta montado el editor (null = no montado)
let _opciones = {};       // opciones de montar(): onAplicar / onCerrar (modo admin)
let _observers = [];      // MutationObserver de los contenedores de los modales

function _raiz(){ return document.getElementById('mej-root'); }

function _observarWraps(){
  _observers.forEach(o => o.disconnect());
  _observers = [];
  ['ep-confirm-wrap', 'ep-audit-wrap', 'ep-pitch-wrap'].forEach(id => {
    const el = document.getElementById(id);
    if (el){
      const o = new MutationObserver(_syncScrollLock);
      o.observe(el, { childList: true });
      _observers.push(o);
    }
  });
}

function _alCambiarAuthPresidente(){ renderAuthUI(); }

/* Monta el editor dentro de `contenedor`. opciones.modo: "presidente" (default, mejoras.html)
   o "admin" (Tool PES5): {equipo, reglas, presupuesto, jugadores, jugadorId, pendiente,
   onAplicar({jugadorId, draft, costo}), onCerrar()}. En admin no escribe en Firestore. */
function montar(contenedor, opciones){
  if (!contenedor) return;
  desmontar();
  opciones = opciones || {};
  _opciones = opciones;
  ADMIN_EMBED = opciones.modo === 'admin';
  contenedor.innerHTML = MEJ_MARKUP;
  _montado = contenedor;
  _observarWraps();
  if (ADMIN_EMBED){
    iniciarModoAdmin(opciones);
  } else {
    window.addEventListener('tsc:auth', _alCambiarAuthPresidente);
  }
}

/* Saca el editor del DOM y suelta lo que engancha afuera (eventos, latidos, observers). */
function desmontar(){
  window.removeEventListener('tsc:auth', _alCambiarAuthPresidente);
  _observers.forEach(o => o.disconnect());
  _observers = [];
  if (_bloqSondeo){ clearInterval(_bloqSondeo); _bloqSondeo = null; }
  if (_bloqLatido){ clearInterval(_bloqLatido); _bloqLatido = null; }
  if (_bloqObs){ try { _bloqObs(); } catch (e) {} _bloqObs = null; }
  document.documentElement.classList.remove('ep-lock');
  if (_montado){ _montado.innerHTML = ''; _montado = null; }
  _opciones = {};
  ADMIN_EMBED = false;
}

/* mejoras.html: monta el editor en #mej-host y arranca la base y la sesion (lo que antes
   hacia el final del script). En el panel no existe #mej-host y no hace nada. */
function iniciarPagina(){
  const host = document.getElementById('mej-host');
  if (!host) return;
  montar(host, { modo: 'presidente' });
  // mejoras.html no carga ui-utils.js: el editor pone sus openModal/closeModal/showToast
  // para que auth.js (login) los encuentre. Si ya existen (panel), no se tocan.
  if (typeof window.openModal !== 'function') window.openModal = openModal;
  if (typeof window.closeModal !== 'function') window.closeModal = closeModal;
  if (typeof window.showToast !== 'function') window.showToast = showToast;
  if (typeof initDB === 'function') initDB().then(() => { if (typeof onAuthInit === 'function') onAuthInit(); });
}

// Handlers de data-on* (events.js solo llama funciones globales, sin puntos).
window.adjustAge = adjustAge;
window.adjustHeight = adjustHeight;
window.mejAbrirAltura = mejAbrirAltura;
window.mejCerrarAltura = mejCerrarAltura;
window.adjustInjury = adjustInjury;
window.adjustMain = adjustMain;
window.adjustSec = adjustSec;
window.cancelarPedidoDesdeHistorial = cancelarPedidoDesdeHistorial;
window.closeApplyConfirm = closeApplyConfirm;
window.closeAuditModal = closeAuditModal;
window.closeFormationModal = closeFormationModal;
window.closeIfBackdrop = closeIfBackdrop;
window.commitChanges = commitChanges;
window.confirmFormation = confirmFormation;
window.cycleFormationPlayer = cycleFormationPlayer;
window.discardChanges = discardChanges;
window.gotoPage = gotoPage;
window.moveFormationDot = moveFormationDot;
window.openApplyConfirm = openApplyConfirm;
window.openAuditModal = openAuditModal;
window.openFormationModal = openFormationModal;
window.renderRoster = renderRoster;
window.resetFormationDraft = resetFormationDraft;
window.selectFormationPlayer = selectFormationPlayer;
window.selectPlayer = selectPlayer;
window.setFavFoot = setFavFoot;
window.setFormationPos = setFormationPos;
window.moveFormationScreen = moveFormationScreen;
window.setFormResumen = setFormResumen;
window.setHint = setHint;
window.setPrimaryPos = setPrimaryPos;
window.setSide = setSide;
window.toggleAbility = toggleAbility;
window.togglePosition = togglePosition;
window.mejToggleTheme = toggleTheme;
window.setSquadTab = setSquadTab;
window.mejVolverPlantilla = mejVolverPlantilla;
window.mejPasar = mejPasar;
window.mejToggleCuenta = mejToggleCuenta;

iniciarPagina();

return { montar: montar, desmontar: desmontar };
})();
