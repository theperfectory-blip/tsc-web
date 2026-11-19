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
        <div class="ep-saldo-lbl">Tu saldo</div>
        <div class="ep-saldo-val" title="YunaCoins cargadas en la cuenta del equipo"><b id="ep-balance-total">0</b><span>YC</span></div>
        <div class="ep-edicion" id="ep-edicion" hidden><span id="ep-edicion-lbl">Esta edición</span><b id="ep-edicion-val"></b><span class="ep-edicion-note" id="ep-edicion-note"></span></div>
        <div class="ep-cap ep-cap-doble">
          <div class="ep-bar" id="ep-bar-bono" hidden>
            <div class="ep-cap-txt"><span>Bono suscriptores (solo $): queda <b id="ep-balance-bono">0</b> de <span id="ep-hero-bono-cap">0</span></span></div>
            <div class="ep-cap-bar" aria-hidden="true"><i id="ep-bono-fill"></i></div>
          </div>
          <div class="ep-bar" id="ep-bar-general">
            <div class="ep-cap-txt"><span>Tope general: queda <b id="ep-balance-general">0</b> de <span id="ep-hero-general-cap">0</span></span></div>
            <div class="ep-cap-bar" aria-hidden="true"><i id="ep-cap-fill"></i></div>
          </div>
          <div class="ep-cap-desg" id="ep-cap-desg" hidden></div>
        </div>
        <div class="ep-disp" id="ep-disp" hidden>Puedes gastar hasta <b id="ep-disp-val">0</b> YC: te limita el tope de la temporada</div>
      </section>

      <div class="ep-access">
        <button class="ep-acc formation" data-onclick="openFormationModal()"><span class="ep-acc-t">Formación</span><span class="ep-acc-s" id="ep-form-sub">Gratis</span></button>
        <button class="ep-acc" data-onclick="openAuditModal()"><span class="ep-acc-t">Pedidos</span><span class="ep-acc-s" id="ep-pedidos-sub">Sin pendientes</span><span class="badge" id="ep-hist-badge">0</span></button>
      </div>

      <div class="ep-cart-panel" id="ep-cart-panel" hidden></div>

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

      <section class="ep-aviso" id="ep-aviso" aria-live="polite" hidden></section>

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
      <div class="ep-hint" id="ep-hint" aria-live="polite"></div>

      <div class="ep-cart">
        <div class="ep-cart-info">
          <span class="ep-cart-count" id="ep-cart-count">Sin cambios</span>
          <span class="ep-cart-left" id="ep-cart-left"></span>
        </div>
        <div class="ep-cart-tot"><b id="ep-cost">0</b></div>
        <div id="ep-warn" class="ep-warn"></div>
        <div class="ep-cart-actions">
          <button class="ep-cart-btn" data-onclick="discardChanges()" aria-label="Descartar cambios" title="Descartar cambios"><svg class="icn" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v5h5"/></svg></button>
          <button class="ep-cart-go" id="ep-apply" data-onclick="openReviewAll()"><svg class="icn" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>Revisar</button>
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

/* ================= MINVER: version minima del cliente de mejoras =================
   MEJORAS_CLIENTE es la version de las reglas de costo/bono/pedidos que entiende este
   cliente. TODO pedido que crea el editor la manda en el campo `cliente` de
   pedidos_pes5, y las reglas lo comparan con pes5_config/app.minCliente:
   - Cuando cambian las reglas de costo, bono o el formato de los pedidos, se sube este
     numero a mano (junto con el cambio) y se publica una APK/nueva version web.
   - El minimo aceptado lo decide y lo escribe aparte Jimbo/coordinador a mano en
     pes5_config/app = { minCliente: <entero> }: nadie puede crear pedidos con un
     cliente menor. No hay UI para ese valor, ni en la Tool ni en el panel.
   - Sin pes5_config/app no hay minimo: cualquier cliente puede pedir. */
const MEJORAS_CLIENTE = 2;

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
  // CARRO1: el carrito es de la cuenta que lo armo. Si cambia la sesion, no se hereda.
  if (AUTH.user && AUTH.user.uid !== _carritoUid){
    APP.drafts = {}; APP.draftsBase = {};
    _carritoUid = AUTH.user.uid;
  }
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
    gate.innerHTML = `<p>Inicia sesión para editar tu equipo.</p><button class="ep-btn primary" data-onclick="openAuthModal()">Iniciar sesión</button>`;
    return;
  }
  if (!AUTH.teamId){
    EQUIPO_TSC = null; _gateTeamId = undefined;
    gate.style.display = ''; shell.style.display = 'none';
    gate.innerHTML = `<p>Tu cuenta todavía no tiene un equipo de la TSC asignado. Pide al admin que te vincule uno.</p>`;
    return;
  }
  if (_gateTeamId !== AUTH.teamId){
    _gateTeamId = AUTH.teamId;
    try { EQUIPO_TSC = await dbGet('teams', AUTH.teamId); } catch(e){ EQUIPO_TSC = null; }
    RULES = await cargarReglasFirestore();
    COBRO_TEMPORADA = await cargarTemporadaCobro();
    const topeExtra = await cargarTopeExtraEquipo(AUTH.teamId); // {extra, motivo}: el aviso lo muestra aparte
    APP.extra = topeExtra.extra; APP.motivo = topeExtra.motivo;
    RULES = YUNACOINS_RULES.reglasConExtra(RULES, topeExtra.extra);
    TOPE_TEMPORADA = await cargarTopeTemporada();
    // Slice D2: recalcular el presupuesto disponible (topes - gastado - pedidos pendientes)
    await recalcularPresupuestoReal();
  }
  if (!EQUIPO_TSC || EQUIPO_TSC.pes5ClubIdx == null){
    gate.style.display = ''; shell.style.display = 'none';
    gate.innerHTML = `<p>Tu equipo (<b>${escHtml(EQUIPO_TSC?.name||'')}</b>) todavía no tiene un club de PES5 vinculado. Espera a que Luis lo asigne.</p>`;
    return;
  }
  if (!PLAYERS.length || _gatePlantillaClub !== EQUIPO_TSC.pes5ClubIdx){
    let hayPlantilla = false;
    try { hayPlantilla = await cargarPlantillaReal(AUTH.teamId, EQUIPO_TSC.pes5ClubIdx); } catch(e){}
    if (!hayPlantilla){
      PLAYERS = []; PLAYER_BY_ID = {}; _gatePlantillaClub = undefined;
      gate.style.display = ''; shell.style.display = 'none';
      gate.innerHTML = `<p>Tu equipo (<b>${escHtml(EQUIPO_TSC.name)}</b> · ${escHtml(EQUIPO_TSC.pes5Club)}) todavía no fue publicado por Luis. Espera a que corra la tool.</p>`;
      return;
    }
    _gatePlantillaClub = EQUIPO_TSC.pes5ClubIdx;
    // BONO-1: el bono depende de los suscriptores de la plantilla recien cargada: recalcular ahora.
    await recalcularPresupuestoReal();
    // EMP-80-2: perfiles fijados de la temporada de cobro (si el admin ya los fijo). Sin doc: calculo en vivo.
    try { PERFILES_FIJADOS = await cargarPerfilesFijados(AUTH.teamId, COBRO_TEMPORADA ?? STATE.season); }
    catch(e){ console.warn('[mejoras] no se pudieron leer los perfiles fijados', e); PERFILES_FIJADOS = null; }
    // CARRO1: recuperar los borradores en espera guardados en este navegador.
    _carritoCargar();
    APP.playerId = PLAYER_BY_ID[APP.playerId] ? APP.playerId : PLAYERS[0].id;
    loadDraft();
  }
  // Slice Q4: un solo editor a la vez por equipo. Si el admin lo esta editando, se muestra el aviso.
  // BLOQ-1: si la edicion esta pausada por inactividad, no se vuelve a tomar el bloqueo hasta «Volver a entrar».
  if (_pausadoInactividad){ _mostrarPausa(); return; }
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
  {k:'vm', l:'Vel. máxima',d:'Un valor mas alto aumenta la velocidad de carrera.'},
  {k:'ace',l:'Aceleración',d:'Rapidez con la que el jugador alcanza su velocidad maxima.'},
  {k:'rsp',l:'Respuesta',d:'Un valor mas alto aumenta la sensibilidad hacia balones sueltos y altos.'},
  {k:'agi',l:'Agilidad',d:'Cuanto mas alto sea este valor, mayor sera la agilidad del jugador.'},
  {k:'pcd',l:'Prec. conducción',d:'Mejora la capacidad de posesion del balon del jugador al regatear.'},
  {k:'vcd',l:'Vel. conducción',d:'Reduce la diferencia en velocidad entre movimiento normal y regate.'},
  {k:'ppc',l:'Prec. p.c.',d:'Aumenta la precision y el exito en pases ras del suelo.'},
  {k:'vpc',l:'Vel. p.c.',d:'Reduce la posibilidad de que el contrario intercepte el pase corto.'},
  {k:'ppl',l:'Prec. p.l.',d:'Aumenta la precision y el exito del pase largo.'},
  {k:'vpl',l:'Vel. p.l.',d:'Aumenta la velocidad del pase largo y centros.'},
  {k:'pre',l:'Precisión',d:'Un valor mas alto aumenta la precision ante el gol.'},
  {k:'pot',l:'Potencia',d:'Aumenta la potencia del disparo.'},
  {k:'ted',l:'Tec. disp',d:'Efectivo al tirar a la porteria desde posiciones dificiles.'},
  {k:'psf',l:'Prec. saq. fta.',d:'Configura los niveles de precision de los saques de falta.'},
  {k:'efe',l:'Efecto',d:'Un valor mas alto aumenta el efecto curvado de la trayectoria del balon.'},
  {k:'cab',l:'Cabezazo',d:'Determina la capacidad de juego aereo del jugador.'},
  {k:'sal',l:'Salto',d:'Determina la altura de salto del jugador.'},
  {k:'tec',l:'Técnica',d:'Valores bajos tienden a botar la pelota al atraparla, perdiendo tiempo.'},
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
  {k:'inj', l:'Res. lesión',sc:'inj',d:'Determina la resistencia del jugador a sufrir lesiones.'},
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
  {k:'reaction',l:'Reacción',d:'Mas riesgo de fuera de juego, pero mas oportunidades de gol.'},
  {k:'playmaker',l:'Cap. mando',d:'Aumenta la percepcion de la formacion de ataque del equipo.'},
  {k:'passing',l:'Pase',d:'Permite pases atrasados casi infalibles que conducen a goles.'},
  {k:'striker',l:'Hab. goleadora',d:'Posiciona al jugador en la linea delantera buscando el gol.'},
  {k:'oneVOneShoot',l:'Hab. gol. 1 a 1',d:'Mejora la precision del disparo mano a mano ante el portero.'},
  {k:'postPlayer',l:'Hab. jugador poste',d:'Mejora la posesion en la boca de la porteria y el pase directo.'},
  {k:'linePos',l:'Líneas',d:'Mejora ataque/defensa en la linea de fuera de juego.'},
  {k:'midRange',l:'Disparos medios',d:'Mejora la precision y el exito de los disparos desde media distancia.'},
  {k:'side',l:'Lado',d:'Mejora el juego en las areas cerca de la linea de banda.'},
  {k:'center',l:'Centro',d:'Mejora el juego en las areas centrales.'},
  {k:'pkKick',l:'Hab. lanza penaltis',d:'Mejora la precision al lanzar penaltis.'},
  {k:'oneTouchPass',l:'Hab. pase 1 toque',d:'Mejora la precision en el juego directo (paredes).'},
  {k:'outside',l:'Exterior',d:'Usa la parte externa del pie para golpear el balon.'},
  {k:'manMarkClose',l:'Marcar hombre',d:'Mejora la capacidad de marcar de cerca a un rival especifico.'},
  {k:'sliding',l:'Hab. deslizándose',d:'Mejora la precision en los cortes (entradas).'},
  {k:'manMark',l:'Marcaje',d:'Buena colocacion y capacidad de permanecer con el hombre marcado.'},
  {k:'dfLine',l:'Ctrl. línea defensa',d:'Ajusta la linea defensiva para atrapar al rival en fuera de juego.'},
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
/* FORM-4: alineacion y formacion. Una sola lectura para la cancha, la lista y la ficha:
   1) el borrador (modal abierto), 2) el pedido de formacion pendiente, 3) la publicada, 4) la local. */
/* Lineas del pedido: un "Cambio de alineacion" por cada cambio de quien juega, y "Formacion" solo si
   se movieron los puntos o la posicion de un lugar (4-3-3, etc.). */
function _lineasFormacion(base, nueva, nombreNueva){
  const nombreDe = id => (PLAYER_BY_ID[id] && PLAYER_BY_ID[id].name) || '—';
  const lineas = PES5_PLANTILLA.cambiosDeAlineacion(base.map(s => s.id), nueva.map(s => s.id), nombreDe)
    .map(t => ({ label: 'Cambio de alineación', from: '', to: t }));
  const puntos = base.some((s, i) => { const n = nueva[i]; return !n || s.x !== n.x || s.y !== n.y || s.pos !== n.pos; });
  const nombreBase = _nombreFormacionDraft(base);
  if (puntos || !lineas.length){
    const igual = nombreNueva === nombreBase;
    lineas.push({ label: 'Formación', from: igual ? '' : nombreBase, to: igual && puntos ? nombreNueva + ' (puntos movidos)' : nombreNueva });
  }
  return lineas;
}
/* El pedido de formacion pendiente (el ultimo que aun no aplico Luis), como alineacion. */
const _tiempoPedido = p => { const m = PES5_PLANTILLA.msDeFecha(p.creadoEn); return m == null ? Number.MAX_SAFE_INTEGER : m; };
function _formacionPendiente(){
  const x = PES5_PLANTILLA.formacionPendienteMasReciente(APP.pendientes);
  if (!x) return null;
  const f = formacionDesdePublicada({ slots: x.formacion.slots });
  return f && f.every(s => PLAYER_BY_ID[s.id]) ? f : null;
}
/* Lo que se muestra como 11: con el modal abierto, el borrador; si no, la alineacion vigente. */
function alineacionVigente(){
  return (FORM_ABIERTO && FORM.draft) ? FORM.draft : formacionVigente();
}
function titularSpot(id){ return alineacionVigente().find(s => s.id === id) || null; }
/* Nombre de cada lugar de la cancha: solo expande la sigla de la cancha (no es una posicion del juego). */
const PITCH_LUGAR_NOMBRE = {
  PT:'Portero', CT:'Central', DI:'Defensa izquierdo', DD:'Defensa derecho',
  CCD:'Centrocampista defensivo', CC:'Centrocampista central', CIZ:'Centrocampista izquierdo', CDR:'Centrocampista derecho',
  MP:'Mediapunta', EI:'Extremo izquierdo', ED:'Extremo derecho', SD:'Segundo delantero', DC:'Delantero centro',
};
/* Etiqueta de un titular: el nombre del lugar. La posicion principal del jugador va aparte solo si su
   etiqueta de POSITIONS es distinta del nombre del lugar (comparacion de texto, sin mapeo). */
function _tagLugar(spotPos, natural){
  const lugar = PITCH_LUGAR_NOMBRE[spotPos] || spotPos;
  const nat = (POS_BY_KEY[natural] && POS_BY_KEY[natural].l) || '';
  if (!nat || nat === lugar) return lugar;
  return `${lugar} · natural: ${nat}`;
}
/* Seccion de cada jugador: titular (en el 11 vigente), suplente (primeros 12 de la banca) o reserva. */
/* ORD-2: el roster en el orden que deja el save al aplicar el 11 que se ve (slot 0-10 = titulares, 11 en adelante
   = banca). Cada titular que entra toma el slot del suplente y el que sale va a ese mismo slot, igual que la Tool
   (ordenarTitulares). Antes la banca se ordenaba por slot y el que salia caia siempre al principio. */
/* ORD-2/ORD-3: el roster en el orden que deja el save (slot 0-10 = titulares, 11 en adelante = banca).
   Con el modal abierto manda el borrador (FORM.bancaOrden). Si no, el pedido pendiente (con su banca si la tiene)
   o el save. */
function _rosterVisible(){
  if (FORM_ABIERTO && FORM.bancaOrden) return [...alineacionVigente().map(s => s.id), ...FORM.bancaOrden];
  return _rosterVigente();
}
function _rosterVigente(){
  const tit = formacionVigente().map(s => s.id);
  const base = PLAYERS.filter(p => p.slot != null).slice().sort((a, b) => a.slot - b.slot).map(p => p.id);
  const banca = PES5_PLANTILLA.rosterTrasTitulares(base, tit).slice(11);
  // ORD-4: el pedido pendiente que manda lleva sus intercambios de banca (pares): se replican en el mismo orden
  // que aplicara la Tool, asi el aviso y la banca muestran lo que Luis va a escribir.
  const pend = PES5_PLANTILLA.formacionPendienteMasReciente(APP.pendientes);
  if (pend && Array.isArray(pend.bancaSwaps) && _formacionPendiente()){
    for (let k = 0; k + 1 < pend.bancaSwaps.length; k += 2){
      const a = banca.indexOf('r' + pend.bancaSwaps[k]), b = banca.indexOf('r' + pend.bancaSwaps[k + 1]);
      if (a >= 0 && b >= 0) [banca[a], banca[b]] = [banca[b], banca[a]];
    }
  }
  const usados = new Set(tit);
  const bancaSinRepetir = [...new Set(banca.filter(id => !usados.has(id)))];
  const resto = PLAYERS.map(p => p.id).filter(id => !usados.has(id) && !bancaSinRepetir.includes(id));
  return [...tit, ...bancaSinRepetir, ...resto];
}
/* Seccion de cada jugador: titular (en el 11 vigente), suplente (primeros 12 de la banca) o reserva. */
function _seccionesPlantel(){
  const sec = {};
  alineacionVigente().forEach(s => { sec[s.id] = 'titular'; });
  _rosterVisible().filter(id => sec[id] !== 'titular' && PLAYER_BY_ID[id])
    .forEach((id, i) => { sec[id] = i < 12 ? 'suplente' : 'reserva'; });
  return sec;
}
/* Plantel en el orden que se muestra: el 11 en el orden de la cancha y luego la banca en el orden del save. */
function plantelOrdenado(){
  const sec = _seccionesPlantel();
  const titulares = alineacionVigente().map(s => PLAYER_BY_ID[s.id]).filter(Boolean);
  const banca = _rosterVisible().filter(id => sec[id] !== 'titular' && PLAYER_BY_ID[id]).map(id => PLAYER_BY_ID[id]);
  return [...titulares, ...banca];
}
function formacionVigente(){
  const pendiente = _formacionPendiente();
  if (pendiente) return pendiente;
  // Opcion B: la verdad es la formacion del save, publicada por la Tool.
  if (FORMACION_PUBLICADA){
    const pub = formacionDesdePublicada(FORMACION_PUBLICADA);
    if (pub && pub.every(s => s && PLAYER_BY_ID[s.id])) return pub;
  }
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

// COBRO-1: temporada en la que se cobran las mejoras (activa no archivada; si no, STATE.season).
let COBRO_TEMPORADA = null;
async function cargarTemporadaCobro(){
  try {
    const seasons = await dbGetAll('seasons');
    const archivadas = seasons.map(s => Number(s.number)).filter(n => dbIsArchivedSeason(n));
    return YUNACOINS_RULES.temporadaDeCobro(seasons, STATE.season, archivadas);
  } catch(e) {
    console.warn('[editor] no se pudo leer la temporada de cobro', e);
    return STATE.season;
  }
}

// Tope extra del equipo en la temporada de cobro (premio del admin, pes5_config/topesExtra-<temporada>).
// Devuelve {extra, motivo}: extra suma al tope general; motivo se muestra en el aviso.
async function cargarTopeExtraEquipo(teamId){
  const nada = { extra: 0, motivo: '' };
  if (STATE.season == null || teamId == null) return nada;
  try {
    const snap = await firebase.firestore().collection('pes5_config').doc('topesExtra-' + (COBRO_TEMPORADA ?? STATE.season)).get();
    const topes = YUNACOINS_RULES.normalizarTopesExtra(snap.exists ? snap.data() : null);
    const e = topes[String(teamId)];
    return e ? { extra: e.extra, motivo: e.motivo || '' } : nada;
  } catch (e) {
    console.warn('[editor] no se pudo leer el tope extra', e);
    return nada;
  }
}

// Slice D2: presupuesto disponible = topes de temporada (reglas) menos lo ya
// cobrado esta temporada (libro coins) menos lo reservado en pedidos
// pendientes propios; el general nunca supera el saldo real del equipo.
/* BONO-1: suscriptores del plantel cargado (publicado en el presidente, del save en la Tool).
   El bono del equipo es la regla por jugador × este numero. */
function _nSuscriptoresPlantel(){
  return PLAYERS.filter(p => p.subscriber).length;
}
async function recalcularPresupuestoReal(){
  const wallet = EQUIPO_TSC ? (EQUIPO_TSC.yunacoin || 0) : 0;
  let gastado = { general: 0, sub: 0 };
  try {
    const tx = await dbGetAll('coins', c => String(c.teamId) === String(AUTH.teamId) && c.season === (COBRO_TEMPORADA ?? STATE.season)
      && typeof c.reason === 'string' && c.reason.indexOf('mejora PES5') === 0);
    gastado = YUNACOINS_RULES.gastoTemporada(tx);
    // EMP-80-1: jugadores con mejoras PAGADAS en la temporada de cobro (bloquea «Solicitar emparejar»)
    APP.pagadosRegistro = new Set(tx.filter(c => c.pes5 && !c.pes5.reembolso && c.pes5.playerId != null && Number(c.amount) > 0).map(c => Number(c.pes5.playerId)));
  } catch (e) { console.warn('[editor] no se pudo leer el libro coins', e); APP.pagadosRegistro = null; }
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
  const rest = YUNACOINS_RULES.topesRestantes(gastado, RULES, _nSuscriptoresPlantel());
  // slice 2.1-A: lo que necesita el aviso grande (sin pendientes de la edicion en curso)
  APP.gastado = { general: gastado.general, sub: gastado.sub };
  APP.pend = { total: pendTotal, general: pendG, sub: pendS };
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

/* EMP-80-2 · costo con el perfil del jugador: los puntos dentro de su rango (min..max) son gratis; el
   resto, la banda normal. El perfil sale de pes5_perfiles (fijado por temporada) o, si no hay, del calculo
   en vivo. Escala, habilidades y lesiones nunca tienen tramo gratis (no pasan por aca). */
let PERFILES_FIJADOS = null; // { [registro]: 'base' | 'suscriptor' | 'ninguno' } de pes5_perfiles; null = sin fijar
function registroPres(p){ return PES5_PLANTILLA.registroDeId(p.id); }
// Valor fijado del jugador (o null si la temporada no lo tiene fijado).
function fijadoPres(p){
  if (!PERFILES_FIJADOS || !p) return null;
  const v = PERFILES_FIJADOS[String(registroPres(p))];
  return v == null ? null : v;
}
// Perfil del jugador con el que se cobra: fijado si existe, si no el calculo en vivo (sobre el jugador original).
function perfilPres(p){
  const cfg = emparejarCfgPres();
  if (!p || !cfg) return null;
  const fijado = fijadoPres(p);
  if (fijado != null) return YUNACOINS_RULES.perfilParaJugador(null, cfg, fijado);
  return YUNACOINS_RULES.perfilEmparejar(PES5_PLANTILLA.jugadorEmparejarDeEditor(p), cfg);
}
function costoStatDe(p, campo, from, to){
  return YUNACOINS_RULES.costoAtributoConPerfil(campo, from, to, perfilPres(p), emparejarCfgPres(), RULES);
}
function costoStatPres(campo, from, to){
  return costoStatDe(currentPlayer(), campo, from, to);
}
function costoPuntoPres(campo, v){ return costoStatPres(campo, v-1, v); }
function gratisStatDe(p, campo, from, to){
  return YUNACOINS_RULES.tramoGratis(campo, from, to, perfilPres(p), emparejarCfgPres());
}
const PERFIL_LABEL = { base: 'Base', suscriptor: 'Suscriptor' };
// Texto del costo de una linea. Con tramo gratis: «+200 · 1 sin costo (perfil Base)»; sin costo: «sin costo (perfil X)».
function lineaCostoTexto(l){
  const g = Number(l.gratis || 0);
  const etiqueta = l.perfil && PERFIL_LABEL[l.perfil] ? PERFIL_LABEL[l.perfil] : null;
  if (l.cost > 0 && g > 0) return '+' + Number(l.cost).toLocaleString('es-CL') + ' · ' + g + ' sin costo (perfil ' + etiqueta + ')';
  if (l.cost > 0) return '+' + Number(l.cost).toLocaleString('es-CL');
  if (g > 0 && etiqueta) return 'sin costo (perfil ' + etiqueta + ')';
  return 'gratis';
}
async function cargarPerfilesFijados(teamId, season){
  if (season == null || teamId == null) return null;
  const snap = await firebase.firestore().collection('pes5_perfiles').doc(season + '_' + teamId).get();
  return snap.exists && snap.data().perfiles ? snap.data().perfiles : null;
}
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

  /* --- Suscriptores (4) — editable, con acceso al bono de suscriptores (solo jugadores $) --- */
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
  budget: YUNACOINS_RULES.techoPresupuesto(EQUIPO_TSC ? EQUIPO_TSC.yunacoin : 0, RULES, 0), // BONO-1: el conteo llega con recalcularPresupuestoReal
  gastado: { general: 0, sub: 0 },              // slice 2.1-A: gastado de la temporada (libro coins)
  pend: { total: 0, general: 0, sub: 0 },       // slice 2.1-A: reservado en pedidos / cambios de otros
  extra: 0, motivo: '',                         // slice 2.1-A: tope extra del equipo y su motivo
  draft: null,
  // CARRO1: un borrador por jugador, en espera hasta mandarlos todos. APP.draft es
  // siempre el del jugador abierto (misma referencia que su entrada del carrito).
  drafts: {},
  draftsBase: {}, // firma de lo publicado con la que se armo cada borrador del carrito
  hint: 'Selecciona un atributo para ver su descripción.',
  // MEJUI2: posición cuya descripción está abierta. Solo ella muestra «Hacer principal»
  // en la línea fija de abajo (la forma discreta de cambiar la posición natural).
  posSel: null,
};

function currentPlayer(){ return PLAYER_BY_ID[APP.playerId]; }

/* ================= PED1 · un solo pedido pendiente de mejoras por jugador =================
   Antes el borrador partia siempre del jugador publicado y `APP.pendientes` solo se usaba para
   pintar la marca «Pedido»: si el presidente volvia a mandar cambios del mismo jugador sin
   cancelar el anterior, quedaban dos pedidos pendientes solapados y la Tool aplicaba uno y
   rechazaba el otro («el jugador cambio desde el pedido») con perdida de cambios.
   Ahora: el borrador parte de lo publicado + los cambios del pedido pendiente, y al enviar se
   manda UN pedido nuevo con TODOS los cambios respecto de lo publicado, cancelando el pendiente
   anterior en el mismo paso. El pedido de mejoras no lleva 'tipo' (formacion y emparejar si). */
function pendientesMejoraDeJugador(p){
  if (!p) return [];
  const registro = registroPres(p);
  return (APP.pendientes || []).filter(x => x && x.estado === 'pendiente' && !x.tipo
    && (x.playerId === p.id
        || (registro != null && x.registro != null && Number(x.registro) === Number(registro))));
}
/* El pedido de mejoras pendiente mas reciente del jugador (null si no hay ninguno). */
function pedidoMejoraPendiente(p){
  const lista = pendientesMejoraDeJugador(p).slice().sort((a, b) => _tiempoPedido(a) - _tiempoPedido(b));
  return lista.length ? lista[lista.length - 1] : null;
}
/* Pedidos de emparejar pendientes del jugador (EMP-80-1). */
function pendientesEmparejarDeJugador(p){
  if (!p) return [];
  const registro = registroPres(p);
  return (APP.pendientes || []).filter(x => x && x.estado === 'pendiente' && x.tipo === 'emparejar'
    && (x.playerId === p.id
        || (registro != null && x.registro != null && Number(x.registro) === Number(registro))));
}
/* Jugador del que parte el borrador: lo publicado + los cambios de los pedidos pendientes.
   Lo normal es uno solo; si quedaron pedidos viejos solapados (el bug PED1) se aplican en
   orden y se conservan los cambios de todos hasta que se mande el pedido unico. */
function jugadorBaseBorrador(p){
  const lista = pendientesMejoraDeJugador(p)
    .filter(x => x.cambios)
    .sort((a, b) => _tiempoPedido(a) - _tiempoPedido(b));
  let j = p;
  lista.forEach(x => {
    try { j = PES5_PLANTILLA.aplicarCambiosAlJugador(j, x.cambios); }
    catch(e){ console.warn('[mejoras] pedido pendiente ilegible', e); }
  });
  return j;
}
/* YunaCoins que el pedido pendiente ya tiene reservados para este jugador. */
function costoReservadoJugador(p){
  return pendientesMejoraDeJugador(p).reduce((s, x) => s + Number(x.totalCost || 0), 0);
}
/* Costo que el pedido nuevo suma sobre lo ya reservado (la reserva no se cuenta dos veces). */
function pendingCostSinReservar(){
  return Math.max(0, pendingCost() - costoReservadoJugador(currentPlayer()));
}
/* Reparto general/suscriptores del pedido nuevo: al reemplazar, el pendiente del jugador libera
   su parte de suscriptores antes de repartir (mismo calculo que el envio). */
function repartoDelPedidoNuevo(p, cost){
  const liberadoSub = pendientesMejoraDeJugador(p).reduce((s, x) => s + Number(x.fromSub || 0), 0);
  return YUNACOINS_RULES.distribuirCosto(cost, Math.max(0, (APP.budget.subscribers || 0) + liberadoSub), !!(p && p.subscriber));
}
/* Cambios del borrador respecto de lo PUBLICADO: es lo que lleva el pedido nuevo. */
function cambiosDelBorrador(p, d){
  return PES5_PLANTILLA.cambiosDesdeEditor(p, {
    stats: Object.assign({}, p.stats, d.stats),
    sec: Object.assign({}, p.sec, d.sec),
    abilities: Object.assign({}, p.abilities, d.abilities),
    positions: d.positions, primaryPos: d.primaryPos, side: d.side,
    height: d.height, favfoot: d.favfoot, age: d.age,
  });
}
/* ¿El borrador es exactamente el pedido que ya esta pendiente? (no hay nada nuevo que mandar) */
function borradorYaPedido(p){
  if (!p || !APP.draft) return false;
  const pedido = pedidoMejoraPendiente(p);
  if (!pedido || !pedido.cambios) return false;
  const cambios = cambiosDelBorrador(p, APP.draft);
  if (!Object.keys(cambios).length) return false;
  return PES5_PLANTILLA.canonicoJSON(cambios) === PES5_PLANTILLA.canonicoJSON(pedido.cambios);
}

/* ================= CARRO1 · carrito de mejoras (varios jugadores a la vez) =================
   Un borrador por jugador en APP.drafts[playerId]. Al cambiar de jugador se guarda el que
   se deja (solo si tiene cambios respecto de su base) y al volver se recupera. APP.draft es
   siempre el del jugador abierto, asi que todo el editor de atributos sigue igual.
   El carrito se persiste en localStorage (clave por uid + equipo) y se borra al enviarlo. */
const CARRO_PREFIJO = 'tsc_ep_carrito_';
let _carritoUltimo = null;   // ultimo JSON escrito: evita reescribir si nada cambio
let _carritoUid = null;      // uid dueno del carrito en memoria (se limpia al cambiar de cuenta)

function _clonarDraft(d){ return JSON.parse(JSON.stringify(d)); }
function _draftComparable(d){
  return {
    stats: d.stats, sec: d.sec, abilities: d.abilities, positions: d.positions,
    primaryPos: d.primaryPos, side: d.side, height: d.height, favfoot: d.favfoot, age: d.age,
  };
}
function _firmaDraft(d){ return PES5_PLANTILLA.canonicoJSON(_draftComparable(d || {})); }
/* Firma de lo PUBLICADO del jugador: si cambio (Luis republico), los borradores guardados
   de ese jugador se descartan al recuperar el carrito. */
function _firmaPublicada(p){
  return PES5_PLANTILLA.canonicoJSON({
    stats: p.stats, sec: p.sec, abilities: p.abilities, positions: p.positions,
    primaryPos: p.primaryPos, side: p.side, height: p.height, favfoot: p.favfoot, age: p.age,
  });
}
function _carritoActivo(){
  return !ADMIN_EMBED && !!(AUTH && AUTH.user && AUTH.user.uid === _carritoUid && AUTH.teamId != null) && PLAYERS.length > 0;
}
function _carritoClave(){
  if (!AUTH || !AUTH.user || AUTH.teamId == null) return null;
  return CARRO_PREFIJO + AUTH.user.uid + '_' + AUTH.teamId;
}
/* Jugador base del borrador: publicado + los cambios del pedido pendiente (PED1).
   En modo admin: el original + lo ya guardado en la tool. */
function _draftBase(p){
  const src = (ADMIN_EMBED && ADMIN_PENDIENTE) ? PES5_PLANTILLA.aplicarCambiosAlJugador(p, ADMIN_PENDIENTE) : jugadorBaseBorrador(p);
  return _clonarDraft({
    stats:src.stats, sec:src.sec, abilities:src.abilities, positions:src.positions, primaryPos:src.primaryPos, side:src.side, favfoot:src.favfoot, height:src.height, age:src.age,
  });
}
function _draftDifiereDelBase(p, d){
  return _firmaDraft(d) !== _firmaDraft(_draftBase(p));
}
/* Borrador vivo de un jugador: el abierto (APP.draft) o el guardado en el carrito. */
function _draftVigenteDe(p){
  if (!p) return null;
  if (p.id === APP.playerId && APP.draft) return APP.draft;
  return (APP.drafts && APP.drafts[p.id]) || null;
}
/* Entradas del carrito, en el orden del plantel: {p, d, costo}. Solo las que tienen
   cambios propios respecto de su base (publicado + pedido pendiente). */
function _carritoEntradas(){
  if (!_carritoActivo()) return [];
  const out = [];
  plantelOrdenado().forEach(p => {
    const d = _draftVigenteDe(p);
    if (!d || !_draftDifiereDelBase(p, d)) return;
    out.push({ p: p, d: d, costo: pendingCostDe(p, d) });
  });
  return out;
}
function _carritoCosto(){
  return _carritoEntradas().reduce((s, e) => s + e.costo, 0);
}
function _carritoReservado(){
  return _carritoEntradas().reduce((s, e) => s + costoReservadoJugador(e.p), 0);
}
/* Lo que el carrito suma de verdad al saldo: el costo de los pedidos nuevos menos lo que
   los pedidos pendientes que reemplaza ya tenian reservado (no se cuenta dos veces). */
function _carritoNeto(){
  return Math.max(0, _carritoCosto() - _carritoReservado());
}
function _carritoExcede(){
  return _carritoFalta() > 0;
}
/* BONO-3: cuanto le sobra al carrito por encima de lo disponible. Cada jugador consume
   su propio tope (el bono solo si tiene «$»), asi que se revisa el reparto completo:
   general, bono y saldo. Lo que los pedidos reemplazados ya reservaban vuelve a estar libre. */
function _carritoFalta(){
  if (!_carritoActivo()) return 0;
  const neto = _carritoNeto();
  if (!(neto > 0)) return 0;
  const entradas = _carritoEntradas();
  if (!entradas.length) return 0;
  const rep = _repartoCarrito(entradas);
  const faltaGeneral = rep.totalGeneral - (APP.budget.general || 0) - rep.liberadoGeneral;
  const faltaBono = rep.totalSub - (APP.budget.subscribers || 0) - rep.liberadoSub;
  const faltaSaldo = neto - (APP.saldo || 0);
  return Math.max(0, faltaGeneral, faltaBono, faltaSaldo);
}
/* Guarda el borrador abierto en el carrito (si cambio respecto de su base) y persiste. */
function guardarDraftActual(){
  if (!_carritoActivo() || !APP.playerId) return;
  const p = PLAYER_BY_ID[APP.playerId];
  if (!p || !APP.draft) return;
  if (_draftDifiereDelBase(p, APP.draft)){
    APP.drafts[p.id] = _clonarDraft(APP.draft);
    APP.draftsBase[p.id] = _firmaPublicada(p);
  } else {
    delete APP.drafts[p.id];
    delete APP.draftsBase[p.id];
  }
  _carritoGuardar();
}
function _carritoGuardar(){
  if (!_carritoActivo()) return;
  const clave = _carritoClave();
  if (!clave) return;
  const drafts = {};
  Object.keys(APP.drafts).forEach(id => {
    const p = PLAYER_BY_ID[id], d = APP.drafts[id];
    if (!p || !d) return;
    drafts[id] = { nombre: p.name, base: APP.draftsBase[id] || _firmaPublicada(p), draft: d };
  });
  const vacio = !Object.keys(drafts).length;
  const raw = vacio ? null : JSON.stringify({ v: 1, drafts: drafts });
  if (raw === _carritoUltimo) return;
  try {
    if (vacio) localStorage.removeItem(clave);
    else localStorage.setItem(clave, raw);
    _carritoUltimo = raw;
  } catch(e){ /* sin localStorage: el carrito sigue en memoria */ }
}
/* Recupera el carrito guardado. Descarta borradores de jugadores que ya no estan en el
   plantel publicado o cuya base cambio (plantilla republicada despues de armarlo). */
function _carritoCargar(){
  APP.drafts = {};
  APP.draftsBase = {};
  _carritoUltimo = null;
  _carritoUid = (AUTH && AUTH.user) ? AUTH.user.uid : null;
  const clave = _carritoClave();
  if (!clave) return;
  let raw = null;
  try { raw = localStorage.getItem(clave); } catch(e){ raw = null; }
  if (!raw) return;
  let data = null;
  try { data = JSON.parse(raw); } catch(e){ data = null; }
  if (!data || data.v !== 1 || !data.drafts) return;
  const descartados = [];
  Object.keys(data.drafts).forEach(id => {
    const e = data.drafts[id] || {};
    const p = PLAYER_BY_ID[id];
    if (!p){ descartados.push(e.nombre || 'un jugador'); return; }
    if (!e.draft || e.base !== _firmaPublicada(p)){ descartados.push(p.name); return; }
    APP.drafts[id] = e.draft;
    APP.draftsBase[id] = e.base;
  });
  _carritoUltimo = raw;
  if (descartados.length){
    const nombres = descartados.slice(0, 3).join(', ') + (descartados.length > 3 ? ' y ' + (descartados.length - 3) + ' mas' : '');
    showMiniToast('Se descartaron cambios de ' + nombres + ': la plantilla se actualizó');
    _carritoGuardar();
  }
}
/* Descarta los borradores cuyo jugador ya no esta o cuyo publicado cambio (p. ej. al recargar
   la plantilla despues de aplicar/cancelar un pedido). */
function _carritoValidar(){
  if (!_carritoActivo()) return;
  const descartados = [];
  Object.keys(APP.drafts).forEach(id => {
    const p = PLAYER_BY_ID[id];
    if (!p || (APP.draftsBase[id] && APP.draftsBase[id] !== _firmaPublicada(p))){
      descartados.push(p ? p.name : 'un jugador');
      delete APP.drafts[id];
      delete APP.draftsBase[id];
    }
  });
  if (!descartados.length) return;
  _carritoGuardar();
  const nombres = descartados.slice(0, 3).join(', ') + (descartados.length > 3 ? ' y ' + (descartados.length - 3) + ' mas' : '');
  showMiniToast('Se descartaron cambios de ' + nombres + ': la plantilla se actualizó');
}

function loadDraft(){
  const p = currentPlayer();
  if (!p){ APP.draft = null; return; }
  // CARRO1: al volver a un jugador se recupera su borrador guardado; si no hay, la base
  // de siempre (admin: original + tool; presidente PED1: publicado + pedido pendiente).
  const guardado = (!ADMIN_EMBED && APP.drafts[p.id]) ? APP.drafts[p.id] : null;
  APP.draft = _clonarDraft(guardado || _draftBase(p));
}

/* Costo del borrador de UN jugador contra lo publicado (cada uno con su perfil). */
function pendingCostDe(p, d){
  if(!p || !d) return 0;
  let total=0;
  MAIN_STATS.forEach(s=>{ if(d.stats[s.k]>p.stats[s.k]) total += costoStatDe(p, s.k, p.stats[s.k], d.stats[s.k]); });
  SEC_NEW.forEach(s=>{
    if(s.sc===99){ if(d.sec[s.k]>p.sec[s.k]) total += costoStatDe(p, s.k, p.sec[s.k], d.sec[s.k]); }
    else if(s.sc===8){ if(d.sec[s.k]>p.sec[s.k]) total += (d.sec[s.k]-p.sec[s.k])*RULES.scale8Cost; }
    else if(s.sc==='inj'){
      const from=INJURY_ORDER.indexOf(p.sec.inj), to=INJURY_ORDER.indexOf(d.sec.inj);
      if(to>from) total += (to-from)*RULES.injuryCost;
    }
  });
  ALL_ABILITY_KEYS.forEach(k=>{ if(d.abilities[k] && !p.abilities[k]) total += RULES.abilityCost; });
  return total;
}

function pendingCost(){
  return pendingCostDe(currentPlayer(), APP.draft);
}
/* techo de gasto del jugador (4.F + BONO-3): el bono solo lo puede usar un jugador
   con «$» (suscriptor); el resto del plantel ve solo el tope general. Los dos quedan
   acotados por el saldo real del equipo.
   Formula en YUNACOINS_RULES.bonoSuscriptor (ver cabecera de yunacoins-rules.js). APP.saldo ya
   descuenta lo reservado en pedidos pendientes. La edicion libre de la tool (equipo sin cobro)
   no tiene saldo que limite. */
function remainingForPlayer(p){
  if(!p) return 0;
  const cobra = !(EQUIPO_TSC && EQUIPO_TSC.cobra === false);
  const pool = { general: APP.budget.general, subscribers: APP.budget.subscribers, saldo: cobra ? APP.saldo : undefined };
  return YUNACOINS_RULES.bonoSuscriptor(pool, !!p.subscriber);
}
/* saldo disponible EN VIVO — ya descuenta lo acumulado en TODO el carrito (BONO-3: cada
   jugador consume su propio tope, el bono solo si tiene «$»), sin contar dos veces los
   pedidos pendientes que ya venian reservados */
function remainingBalance(){ return remainingForPlayer(currentPlayer()) - (ADMIN_EMBED ? pendingCostSinReservar() : _carritoNeto()); }
function canAfford(nextCost){ return nextCost <= remainingBalance(); }

/* ================= render: roster (agrupado por posicion, estilo PES5) ================= */

/* Presentacion: linea de cada posicion (color de la fila) y codigo corto de la posicion. */
const LINEA_POS = {GK:'gk', CB:'def', CWP:'def', SB:'def', WB:'def', CMF:'mid', DMF:'mid', AMF:'mid', SMF:'mid', CF:'att', SS:'att', WG:'att'};
const CODIGO_POS = {GK:'PT', CB:'CT', CWP:'LI', SB:'CAR', WB:'LAT', DMF:'MCD', CMF:'CC', AMF:'MP', SMF:'VOL', WG:'EX', SS:'SD', CF:'DC'};
function sectionKeyOfSlot(slot){ const s = slot ?? 999; return s < 11 ? 'titular' : s < 23 ? 'suplente' : 'reserva'; }
function renderRoster(){
  const q = (document.getElementById('ep-search').value||'').toLowerCase();
  const list = document.getElementById('ep-roster-list');
  const secs = _seccionesPlantel();
  const ordenPlantel = plantelOrdenado();
  // CARRO1: marca de los jugadores que tienen un borrador en espera (punto + costo).
  const carro = {};
  _carritoEntradas().forEach(e => { carro[e.p.id] = e; });
  // conteos y estado del segmentado (siempre sobre todo el plantel)
  SQUAD_SECTIONS.forEach(sec=>{
    const n = PLAYERS.filter(p => secs[p.id] === sec.key).length;
    const b = document.getElementById('ep-seg-n-' + sec.key);
    if (b) b.textContent = n;
    const tab = document.getElementById('ep-seg-' + sec.key);
    if (tab) tab.setAttribute('aria-selected', String(sec.key === APP.squadTab));
  });

  function item(p){
    const pos = p.primaryPos || 'CB';
    const sp = titularSpot(p.id); // en el 11: la etiqueta es el lugar de la cancha
    const codigo = sp ? (sp.pos || CODIGO_POS[pos] || pos) : (CODIGO_POS[pos] || pos);
    const linea = sp ? (PITCH_POS_LINEA[sp.pos] || LINEA_POS[pos] || 'mid') : (LINEA_POS[pos] || 'mid');
    const pendiente = (APP.pendientes||[]).some(x => x.playerId === p.id && x.estado === 'pendiente');
    const enCarro = carro[p.id];
    return `<div class="ep-pitem ${p.id===APP.playerId?'active':''}" data-onclick="selectPlayer('${p.id}')">
      <span class="ep-pitem-pos ep-line-${linea}">${escHtml(codigo)}</span>
      <span class="ep-pitem-info">
        <span class="ep-pitem-name">${escHtml(p.name)}${p.heightFixed?' <span class="ep-real-badge">REAL</span>':p.subscriber?' <span class="ep-subs-badge">SUSCRIPTOR</span>':''}</span>
        <span class="ep-pitem-tag">${escHtml(sp ? _tagLugar(sp.pos, p.primaryPos) : ((POS_BY_KEY[pos] && POS_BY_KEY[pos].l) || p.tag || ''))}</span>
      </span>
      ${enCarro ? `<span class="ep-pitem-carro" title="Cambios en espera: ${enCarro.costo.toLocaleString('es-CL')} YC"><i aria-hidden="true"></i>${enCarro.costo.toLocaleString('es-CL')}</span>` : ''}
      ${pendiente ? '<span class="ep-pitem-pedido">Pedido</span>' : ''}
    </div>`;
  }

  let html = '';
  SQUAD_SECTIONS.forEach(sec=>{
    // sin busqueda se ve el grupo elegido en el segmentado; con busqueda, todos los grupos que coinciden
    if (!q && sec.key !== APP.squadTab) return;
    const players = PLAYERS
      .filter(p => secs[p.id] === sec.key && p.name.toLowerCase().includes(q))
      .sort((a,b) => ordenPlantel.indexOf(a) - ordenPlantel.indexOf(b)); // orden de la cancha (11) y luego la banca
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
  // CARRO1: el borrador que se deja queda en el carrito (solo si tiene cambios).
  if (id !== APP.playerId) guardarDraftActual();
  APP.playerId = id;
  APP.page = 1;
  APP.posSel = null;
  APP.hint = 'Selecciona un atributo para ver su descripción.';
  const jugador = PLAYER_BY_ID[id];
  if (jugador) APP.squadTab = _seccionesPlantel()[id] || 'titular'; // el segmentado sigue al jugador elegido
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

/* ================= EMP-80-1 · Solicitar emparejar a N (presidente, sin costo) =================
   Pedido de costo 0 por jugador. No descuenta saldo ni reserva YunaCoins (totalCost 0). Pasa por el
   flujo normal de pedidos: lo aplica Luis en la Tool (aplicarPedidosSeleccionados, rama tipo 'emparejar').
   Solo antes de empezar a mejorar a ese jugador: se bloquea si ya tiene mejoras pagadas en la
   temporada de cobro o un pedido pagado pendiente. Un solo pedido de emparejar pendiente por jugador. */
function emparejarCfgPres(){
  return (RULES && RULES.emparejar) || null;
}
// ¿Hay algun perfil con boton? Si no, el boton no aparece.
function hayPerfilEmparejarPres(){
  const cfg = emparejarCfgPres();
  return !!cfg && ['base', 'suscriptor'].some(n => YUNACOINS_RULES.rangoEmparejar(cfg, n));
}
// Motivo por el que NO se puede pedir el emparejar de este jugador (null = se puede).
function motivoNoEmparejar(p){
  if (!p) return 'Jugador no encontrado.';
  if (ADMIN_EMBED) return 'Lo empareja el admin desde la Tool PES5.';
  if (!AUTH.user || !AUTH.teamId) return 'Tu cuenta no tiene equipo asignado.';
  const registro = PES5_PLANTILLA.registroDeId(p.id);
  if (registro == null) return 'Este jugador no está en el save.';
  if (APP.bloqueoPorAplicado) return 'Luis aplicó cambios que todavía no publicó: espera a que publique.';
  const pend = APP.pendientes || [];
  if (pend.some(x => x.tipo === 'emparejar' && Number(x.registro) === Number(registro))) return 'Ya hay un pedido de emparejar pendiente para este jugador.';
  if (pend.some(x => !x.tipo && Number(x.registro) === Number(registro) && (x.totalCost || 0) > 0)) return 'Este jugador tiene una mejora pagada pendiente: ya no se puede emparejar.';
  if (!APP.pagadosRegistro) return 'No se pudo verificar si el jugador tiene mejoras pagadas (o todavía no cargó). Prueba de nuevo.';
  if (APP.pagadosRegistro.has(Number(registro))) return 'Este jugador ya tiene mejoras pagadas en la temporada de cobro: ya no se puede emparejar.';
  // EMP-80-2: con perfil fijado para la temporada, el emparejar usa ese perfil (no el calculo en vivo).
  const fijado = fijadoPres(p);
  if (fijado != null){
    const r0 = YUNACOINS_RULES.cambiosEmparejar(PES5_PLANTILLA.jugadorEmparejarDeEditor(p), emparejarCfgPres(), fijado);
    return r0.perfil ? null : r0.motivo;
  }
  return YUNACOINS_RULES.motivoSinEmparejar(PES5_PLANTILLA.jugadorEmparejarDeEditor(p), emparejarCfgPres());
}
function emparejarBtnHTML(p){
  if (!hayPerfilEmparejarPres()) return '';
  const cfg = emparejarCfgPres();
  const motivo = motivoNoEmparejar(p);
  const perfil = perfilPres(p);
  const max = perfil ? YUNACOINS_RULES.rangoEmparejar(cfg, perfil).max : null;
  const etiqueta = max != null ? 'Solicitar emparejar a ' + max : 'Solicitar emparejar';
  const title = motivo || ('Sube los atributos del perfil ' + perfil + ' hasta ' + max + ' sin costo. Luis lo revisa.');
  return `<div class="ep-emparejar">
    <button type="button" class="ep-btn ep-emparejar-btn" data-onclick="solicitarEmparejar('${p.id}')"${motivo ? ' disabled' : ''} title="${escAttr(title)}">
      <svg class="icn" viewBox="0 0 24 24" aria-hidden="true"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>
      ${escHtml(etiqueta)}
    </button>${motivo ? `<span class="ep-emparejar-note">${escHtml(motivo)}</span>` : ''}
  </div>`;
}
function solicitarEmparejar(playerId){
  if (_bloqueadoPorPausa()) return;
  if (ADMIN_EMBED) return;
  const p = PLAYER_BY_ID[playerId];
  const motivo = motivoNoEmparejar(p);
  if (motivo){ showMiniToast(motivo); return; }
  const cfg = emparejarCfgPres();
  const r = YUNACOINS_RULES.cambiosEmparejar(PES5_PLANTILLA.jugadorEmparejarDeEditor(p), cfg, fijadoPres(p));
  if (!r.perfil || !r.lineas.length){ showMiniToast(r.motivo || 'No hay atributos que emparejar.'); return; }
  const max = YUNACOINS_RULES.rangoEmparejar(cfg, r.perfil).max;
  const wrap = document.getElementById('ep-confirm-wrap');
  wrap.innerHTML = `
  <div class="ep-overlay ep-overlay-sheet" data-onclick="closeIfBackdrop(event,closeApplyConfirm)">
    <section class="ep-sheet" role="dialog" aria-modal="true" aria-labelledby="ep-sheet-emp">
      <div class="ep-grab" aria-hidden="true"></div>
      <div class="ep-sheet-hd">
        <h2 id="ep-sheet-emp">Solicitar emparejar a ${Number(max)}</h2>
        <span>Luis lo revisa y lo aplica en el juego. No descuenta saldo ni reserva YunaCoins.</span>
      </div>
      <ul class="ep-sheet-list">
        ${r.lineas.map(l => `<li class="ep-sheet-line">
          <span class="lbl">${escHtml(p.name)} · ${escHtml(l.campo)}</span>
          <span class="chg">${Number(l.de)} → ${Number(l.a)}</span>
          <span class="cost">gratis</span>
        </li>`).join('')}
      </ul>
      <dl class="ep-sheet-saldo">
        <div><dt>Costo</dt><dd><b>0 YC</b></dd></div>
      </dl>
      <div class="ep-sheet-act">
        <button class="ep-btn" data-onclick="closeApplyConfirm()">Cancelar</button>
        <button class="ep-btn primary" data-onclick="confirmarSolicitarEmparejar('${p.id}')">Enviar a Luis</button>
      </div>
    </section>
  </div>`;
}
async function confirmarSolicitarEmparejar(playerId){
  if (_bloqueadoPorPausa()) return;
  closeApplyConfirm();
  const p = PLAYER_BY_ID[playerId];
  const motivo = motivoNoEmparejar(p);   // se vuelve a comprobar al enviar
  if (motivo){ showMiniToast(motivo); return; }
  const cfg = emparejarCfgPres();
  const r = YUNACOINS_RULES.cambiosEmparejar(PES5_PLANTILLA.jugadorEmparejarDeEditor(p), cfg, fijadoPres(p));
  if (!r.perfil || !r.lineas.length){ showMiniToast(r.motivo || 'No hay atributos que emparejar.'); return; }
  const nivel = YUNACOINS_RULES.rangoEmparejar(cfg, r.perfil).max;
  const registro = PES5_PLANTILLA.registroDeId(p.id);
  const fs = firebase.firestore();
  const nuevoRef = fs.collection('pedidos_pes5').doc();
  const viejos = pendientesEmparejarDeJugador(p);   // PED1: un solo emparejar pendiente por jugador
  try {
    /* PED1: si por lo que sea ya habia un emparejar pendiente de este jugador (dos pestanas,
       lista vieja), se cancela en el mismo batch para no dejar dos pendientes. Las reglas ya
       permiten crear y cancelar el propio en la misma escritura. */
    const batch = fs.batch();
    viejos.forEach(x => {
      if (x._id && String(x._id).indexOf('local-') !== 0){
        batch.update(fs.collection('pedidos_pes5').doc(x._id), {
          estado: 'cancelado', canceladoEn: new Date().toISOString(),
        });
      }
    });
    batch.set(nuevoRef, {
      uid: AUTH.user.uid,
      teamId: String(AUTH.teamId),
      teamName: EQUIPO_TSC?.name || null,
      pes5Club: EQUIPO_TSC?.pes5Club || null,
      tipo: 'emparejar',
      cliente: MEJORAS_CLIENTE,
      pes5ClubIdx: EQUIPO_TSC ? EQUIPO_TSC.pes5ClubIdx : null,
      playerId: p.id,
      playerName: p.name,
      registro,
      dorsal: p.dorsal ?? null,
      subscriber: !!p.subscriber,
      perfil: r.perfil,
      nivel,
      cambios: { atributos: r.atributos },
      lines: r.lineas.map(l => ({ label: l.campo, from: l.de, to: l.a })),
      totalCost: 0,
      fromGeneral: 0,
      fromSub: 0,
      estado: 'pendiente',
      creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
    });
    await batch.commit();
  } catch (e) {
    await _avisarErrorPedido(e, 'No se pudo mandar el pedido: ');
    return;
  }
  // presentacion: el pedido ya cuenta como pendiente (boton, aviso y globito). No reserva saldo.
  APP.pendientes = (APP.pendientes || []).filter(x => viejos.indexOf(x) < 0);
  APP.pendientes.push({ _id: nuevoRef.id, tipo: 'emparejar', playerId: p.id, registro, perfil: r.perfil, nivel, lines: [], totalCost: 0, estado: 'pendiente' });
  renderCard();
  renderPending();
  showMiniToast('Pedido de emparejar enviado. Luis lo revisa.');
}

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
      ${ADMIN_EMBED ? '' : emparejarBtnHTML(p)}
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
/* HIST1: tarjeta de resumen del panel lateral, una sola linea y un boton. El detalle
   (y la cancelacion) vive en la ventana del historial, que se abre en Pendientes. */
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
  if (ADMIN_EMBED || (!pend.length && !bloqueo)){ box.hidden = true; box.innerHTML = ''; return; }

  const total = pend.reduce((s, x) => s + Number(x.totalCost || 0), 0);
  const linea = pend.length
    ? pend.length + (pend.length === 1 ? ' pedido en revisión' : ' pedidos en revisión')
      + ' · ' + Number(total).toLocaleString('es-CL') + ' YC'
    : '';
  box.hidden = false;
  box.innerHTML = `
    <div class="ep-pend-hd">
      <span class="ep-pend-lbl">${pend.length ? 'En revisión' : 'Esperando publicación'}</span>
    </div>
    ${linea ? `<div class="ep-res-line">${linea}</div>` : ''}
    ${bloqueo ? '<div class="ep-pend-bloq">Luis aplicó cambios que todavía no publicó.</div>' : ''}
    ${pend.length ? `<button type="button" class="ep-pend-ver" data-onclick="openAuditModal('pendiente')">Ver</button>` : ''}`;
}
function gotoPage(delta){
  const next = APP.page + delta;
  if(next<1 || next>PAGES.length) return;
  APP.page = next;
  APP.posSel = null;
  // MEJUI-1: la linea fija arranca con una ayuda corta de la pagina abierta.
  APP.hint = ['Toca un atributo para ver su descripción.',
    'Toca un atributo para ver su descripción.',
    'Toca una habilidad para ver qué hace.',
    'Toca una posición para ver qué significa.'][APP.page-1];
  renderAll();
}
function _pintarHint(text){
  const el = document.getElementById('ep-hint');
  if (!el) return;
  el.title = text || '';
  el.classList.remove('accion');
  el.textContent = text || '';
  // MEJUI2: con una posición secundaria abierta, la línea de descripción ofrece
  // «Hacer principal» (forma discreta de cambiar la posición natural). La principal
  // no lleva botón: no se puede quitar.
  const pos = APP.posSel && APP.page === 4 ? POS_BY_KEY[APP.posSel] : null;
  if (!pos || !APP.draft || !APP.draft.positions[pos.k] || pos.k === APP.draft.primaryPos) return;
  const txt = document.createElement('span');
  txt.className = 'ep-hint-txt';
  txt.textContent = text || '';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ep-hint-btn';
  btn.textContent = 'Hacer principal';
  btn.setAttribute('data-onclick', `hacerPrincipal('${pos.k}')`);
  el.textContent = '';
  el.append(txt, btn);
  el.classList.add('accion');
}
function setHint(text){
  APP.posSel = null;
  APP.hint = text;
  _pintarHint(text);
  renderRows();
}
function _fmtYC(n){ return Math.max(0, Math.round(n || 0)).toLocaleString('es-CL'); }

/* ================= BONO4 · los topes bajan a la vista =================
   Mientras se edita, el número cuenta y la barra se achica en ~300 ms; la barra
   que está bajando se ilumina ~400 ms para que el ojo vaya a ella. Con un
   jugador con «$» el bono baja primero y, cuando llega a 0, sigue el general;
   sin «$» solo baja el general. Sin animación con prefers-reduced-motion.

   UNA sola función de animación de números para el editor (la Tool del admin
   tiene una copia chica: no comparten archivo, ver js/pes5-tool.js). Cancela la
   animación anterior del mismo elemento; `desde: null` arranca desde lo que se
   ve en pantalla (así un clic rápido no salta). */
const BARRA_MS = 300;
const BARRA_DESTELLO_MS = 400;
function _sinMovimiento(){
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
const _animNumero = new WeakMap();
function animarNumero(el, desde, hasta, opts){
  if (!el) return;
  const o = opts || {};
  const dur = Math.max(0, o.duracion == null ? BARRA_MS : o.duracion);
  const retraso = Math.max(0, o.retraso || 0);
  const fmt = typeof o.formato === 'function' ? o.formato : _fmtYC;
  const previo = _animNumero.get(el);
  if (previo){
    if (previo.raf) cancelAnimationFrame(previo.raf);
    if (previo.timer) clearTimeout(previo.timer);
    _animNumero.delete(el);
  }
  const fin = Math.round(Number(hasta) || 0);
  const ini = desde == null ? _numeroVisible(el, fin) : Math.round(Number(desde) || 0);
  if (!dur || _sinMovimiento() || ini === fin){ el.textContent = fmt(fin); return; }
  const estado = { raf: 0, timer: 0 };
  const arrancar = function(){
    const t0 = performance.now();
    const paso = function(t){
      const p = Math.min(1, (t - t0) / dur);
      const v = Math.round(ini + (fin - ini) * (1 - Math.pow(1 - p, 3)));
      el.textContent = fmt(p < 1 ? v : fin);
      if (p < 1) estado.raf = requestAnimationFrame(paso);
      else if (_animNumero.get(el) === estado) _animNumero.delete(el);
    };
    estado.raf = requestAnimationFrame(paso);
  };
  _animNumero.set(el, estado);
  if (retraso) estado.timer = setTimeout(arrancar, retraso);
  else arrancar();
}
/* Valor que se ve ahora en el elemento (los números van con separador es-CL). */
function _numeroVisible(el, def){
  const n = Number(String((el && el.textContent) || '').replace(/[^\d-]/g, ''));
  return Number.isFinite(n) ? n : (def || 0);
}
/* Destello suave de la barra que baja (400 ms). Repetirlo reinicia la animación. */
const _destellosBarra = new WeakMap();
function destelloBarra(row, retraso){
  if (!row || _sinMovimiento()) return;
  const previo = _destellosBarra.get(row);
  if (previo){ clearTimeout(previo.t1); clearTimeout(previo.t2); }
  row.classList.remove('ep-barra-baja');
  const estado = { t1: 0, t2: 0 };
  estado.t1 = setTimeout(function(){
    row.classList.remove('ep-barra-baja');
    void row.offsetWidth; // reinicia la animación si se repite seguido
    row.classList.add('ep-barra-baja');
    estado.t2 = setTimeout(function(){ row.classList.remove('ep-barra-baja'); }, BARRA_DESTELLO_MS + 60);
  }, Math.max(0, retraso || 0));
  _destellosBarra.set(row, estado);
}
/* Pinta una barra «queda X de Y»: número animado + ancho con transition 300 ms. */
const _timerBarra = new WeakMap();
function pintarBarra(cfg){
  if (!cfg) return;
  const total = Math.max(0, Number(cfg.total) || 0);
  const queda = Math.max(0, Number(cfg.queda) || 0);
  const retraso = Math.max(0, cfg.retraso || 0);
  if (cfg.cap) cfg.cap.textContent = _fmtYC(total);
  if (cfg.val) animarNumero(cfg.val, cfg.desde, queda, { retraso: retraso });
  if (cfg.fill){
    const pct = total > 0 ? Math.min(100, Math.max(0, queda / total * 100)) : 0;
    if (_sinMovimiento()){
      cfg.fill.style.transition = 'none';
      cfg.fill.style.width = pct + '%';
    } else {
      cfg.fill.style.transition = '';
      const previo = _timerBarra.get(cfg.fill);
      if (previo) clearTimeout(previo);
      if (retraso){
        const t = setTimeout(function(){
          cfg.fill.style.width = pct + '%';
          _timerBarra.delete(cfg.fill);
        }, retraso);
        _timerBarra.set(cfg.fill, t);
      } else cfg.fill.style.width = pct + '%';
    }
  }
  if (cfg.baja) destelloBarra(cfg.row, retraso);
}
/* BONO4: cuánto queda de cada tope DESPUÉS de la edición en curso. Es la regla
   BONO-3 aplicada a la vista: el bono primero para un jugador con «$» y, agotado,
   el general; un jugador sin «$» gasta solo del general. Con carrito se reparte
   el carrito completo jugador por jugador y vuelven las reservas que reemplaza. */
function _repartoBarras(r){
  const subAntes = Math.max(0, r.restanteSub || 0);
  const genAntes = Math.max(0, r.restanteGeneral || 0);
  if (ADMIN_EMBED){
    const p = currentPlayer();
    let libSub = 0, libGen = 0;
    pendientesMejoraDeJugador(p).forEach(function(x){
      libSub += Number(x.fromSub || 0);
      libGen += Number(x.fromGeneral || 0);
    });
    const rep = YUNACOINS_RULES.distribuirCosto(pendingCostSinReservar(), subAntes + libSub, !!(p && p.subscriber));
    return {
      subAntes: subAntes, subDespues: Math.max(0, subAntes + libSub - rep.fromSub),
      genAntes: genAntes, genDespues: Math.max(0, genAntes + libGen - rep.fromGeneral),
    };
  }
  const rep = _repartoCarrito(_carritoEntradas());
  return {
    subAntes: subAntes, subDespues: Math.max(0, subAntes + rep.liberadoSub - rep.totalSub),
    genAntes: genAntes, genDespues: Math.max(0, genAntes + rep.liberadoGeneral - rep.totalGeneral),
  };
}
/* TOPE-1: el tope del equipo de la temporada es base + bono de suscriptores +
   tope extra (premio o reembolso): el bono y el extra AMPLÍAN el tope, no son
   YunaCoins que se regalen (se pagan con el saldo del equipo). BONO-3: el tramo
   del bono aclara que solo lo pueden usar los jugadores con «$». Los números
   salen de YUNACOINS_RULES: resumenPresupuesto (mismos del aviso grande) y
   bonoEquipo (regla por suscriptor × suscriptores del plantel). El desglose
   solo trae las partes que existen: sin suscriptores ni extra no hay desglose. */
function _topeEquipoDatos(){
  const r = resumenAviso();
  const n = _nSuscriptoresPlantel();
  const bono = YUNACOINS_RULES.bonoEquipo(RULES, n);
  const partes = [];
  if (bono > 0 || r.extra > 0) partes.push('Base ' + _fmtYC(r.topeGeneral));
  if (bono > 0) partes.push(n + (n === 1 ? ' suscriptor ' : ' suscriptores ') + _fmtYC(bono) + ' (solo jugadores $)');
  if (r.extra > 0) partes.push('Extra ' + _fmtYC(r.extra));   // sin motivo: Jimbo prefiere solo «Extra N»
  return { r: r, bono: bono, total: r.topeTotal + bono, desglose: partes.join(' + ') };
}
/* la zona de yunacoins vive fuera del editor (es el dato mas importante);
   los numeros bajan en vivo (antes de aplicar/confirmar) y el tope solo
   cambia cuando cambian los suscriptores, el extra o las reglas.
   SALDO1: es el UNICO bloque de saldo del presidente (el panel grande
   «Presupuesto de la temporada» se quito de ahi). Muestra: tu saldo, la barra
   del tope con su desglose chico, «Gastado: N» dentro del desglose, «Esta
   edición: −N YC» debajo del saldo y, SOLO cuando el tope limita (queda del
   tope < saldo), la linea «Puedes gastar hasta X». Si limita el saldo no se
   repite el mismo numero. */
function renderHero(){
  // CARRO1: el saldo baja con TODO el carrito (cada borrador con el costo de su jugador);
  // lo que los pedidos pendientes ya reservaban no se cuenta dos veces.
  const cost = ADMIN_EMBED ? pendingCostSinReservar() : _carritoNeto();
  const costPedido = ADMIN_EMBED ? pendingCost() : _carritoCosto(); // costo total de los cambios en curso
  const d = _topeEquipoDatos();
  const r = d.r;
  // lo que queda de cada tope ya descuenta lo gastado y lo reservado; la
  // edicion en curso todavia no esta aplicada, asi que se resta aparte.
  const saldoBruto = Math.max(0, APP.saldo || 0);
  // BONO-3: el bono solo lo puede usar un jugador con «$». «Queda del tope» sigue
  // mostrando el tope del EQUIPO (base + bono + extra); «Puedes gastar hasta» usa el
  // techo del jugador abierto (general, o general + bono si es «$»).
  const esSub = !!(currentPlayer() && currentPlayer().subscriber);
  const topeJugador = r.restanteGeneral + (esSub ? r.restanteSub : 0);
  const saldo = Math.max(0, saldoBruto - cost);
  animarNumero(document.getElementById('ep-balance-total'), null, saldo);
  // BONO4: dos barras debajo de «Tu saldo». El bono baja primero y, cuando
  // termina, el general; la barra que baja se ilumina. Con carrito, las dos
  // muestran lo que queda después de TODO el carrito.
  const rep = _repartoBarras(r);
  const bonoTotal = d.bono;
  const generalTotal = r.topeTotal;
  const barBono = document.getElementById('ep-bar-bono');
  if (barBono) barBono.hidden = !(bonoTotal > 0);
  const bajaBono = rep.subDespues < rep.subAntes;
  const bajaGeneral = rep.genDespues < rep.genAntes;
  pintarBarra({
    row: barBono,
    fill: document.getElementById('ep-bono-fill'),
    val: document.getElementById('ep-balance-bono'),
    cap: document.getElementById('ep-hero-bono-cap'),
    total: bonoTotal, queda: rep.subDespues, desde: null, baja: bajaBono, retraso: 0,
  });
  pintarBarra({
    row: document.getElementById('ep-bar-general'),
    fill: document.getElementById('ep-cap-fill'),
    val: document.getElementById('ep-balance-general'),
    cap: document.getElementById('ep-hero-general-cap'),
    total: generalTotal, queda: rep.genDespues, desde: null, baja: bajaGeneral,
    retraso: (bajaBono && bajaGeneral) ? BARRA_MS : 0,
  });
  // desglose chico del tope; «Gastado: N» entra aca (solo si hay algo gastado)
  const desg = document.getElementById('ep-cap-desg');
  if (desg){
    const gastado = (r.gastadoGeneral || 0) + (r.gastadoSub || 0);
    const partes = [];
    if (d.desglose) partes.push(d.desglose);
    if (gastado > 0) partes.push('Gastado: ' + _fmtYC(gastado));
    desg.textContent = partes.join(' · ');
    desg.hidden = !partes.length;
  }
  // «Esta edición / Tu carrito: −N YC»: el costo de lo que se esta editando ahora, solo si suma.
  const ed = document.getElementById('ep-edicion');
  if (ed){
    const pendiente = ADMIN_EMBED ? null : pedidoMejoraPendiente(currentPlayer());
    const entradasEd = ADMIN_EMBED ? [] : _carritoEntradas();
    const hayPend = !!pendiente || entradasEd.some(e => !!pedidoMejoraPendiente(e.p));
    ed.hidden = !(costPedido > 0);
    const lbl = document.getElementById('ep-edicion-lbl');
    if (lbl) lbl.textContent = pendiente ? 'Tu pedido' : (entradasEd.length > 1 ? 'Tu carrito' : 'Esta edición');
    const val = document.getElementById('ep-edicion-val');
    if (val) val.textContent = costPedido > 0 ? '−' + _fmtYC(costPedido) + ' YC' : '';
    const note = document.getElementById('ep-edicion-note');
    if (note) note.textContent = (hayPend && costPedido > 0)
      ? (pendiente ? '· reemplaza tu pedido pendiente' : '· reemplaza tus pedidos pendientes')
      : '';
  }
  // «Disponible ahora» solo si el tope es el que limita; si limita el saldo, el
  // numero ya esta en «Tu saldo» y no se repite. BONO-3: el techo es el del
  // jugador abierto (un jugador sin «$» no puede usar el bono).
  const disponible = Math.max(0, Math.min(saldoBruto, topeJugador) - cost);
  const disp = document.getElementById('ep-disp');
  if (disp) disp.hidden = !(topeJugador < saldoBruto);
  const dv = document.getElementById('ep-disp-val');
  if (dv) animarNumero(dv, null, disponible);
}
/* ================= Slice 2.1-A: aviso de presupuesto (solo Tool PES5) =================
   SALDO1: en el editor del PRESIDENTE este panel ya no se pinta (su bloque compacto
   «Tu saldo» muestra los mismos numeros una sola vez). En la Tool del admin se
   conserva porque ahi la plantilla —y con ella el bloque compacto— esta oculta, y
   porque tiene avisos propios («Edición gratis», «sin cobro», pendientes de otros).
   Los numeros salen de YUNACOINS_RULES.resumenPresupuesto (pura, con tests en
   tools/test-aviso-presupuesto.js). Modo admin: la Tool pasa gastado, extra,
   motivo, pendientesOtros y equipo.gratis. */
function resumenAviso(){
  const extra = APP.extra || 0;
  return YUNACOINS_RULES.resumenPresupuesto({
    saldo: EQUIPO_TSC ? (EQUIPO_TSC.yunacoin || 0) : 0,
    reglas: { budgetGeneral: (RULES.budgetGeneral || 0) - extra, budgetSubscribers: RULES.budgetSubscribers },
    nSuscriptores: _nSuscriptoresPlantel(), // BONO-1
    extra: extra,
    gastado: APP.gastado,
    pendientes: APP.pend,
  });
}
let _avisoFirma = '';
function renderAviso(){
  const el = document.getElementById('ep-aviso');
  if (!el) return;
  // SALDO1: el panel grande no existe en el editor del presidente (el bloque
  // compacto de «Tu saldo» muestra los mismos numeros, sin repetirlos). Solo la
  // Tool del admin lo conserva: ahi la plantilla esta oculta y el aviso es el
  // unico lugar con los numeros y con «Edición gratis» / «sin cobro».
  if (!ADMIN_EMBED){ el.hidden = true; el.className = 'ep-aviso'; el.innerHTML = ''; _avisoFirma = ''; return; }
  const e = EQUIPO_TSC;
  if (!e || !APP.draft){ el.hidden = true; el.innerHTML = ''; _avisoFirma = ''; return; }
  const fmt = n => Math.round(n || 0).toLocaleString('es-CL');
  el.hidden = false;
  if (e.gratis || !e.cobra){
    const firma = e.gratis ? 'gratis' : 'libre';
    if (firma === _avisoFirma && el.firstChild) return;
    _avisoFirma = firma;
    el.className = 'ep-aviso ' + firma;
    el.innerHTML = e.gratis
      ? `<div class="ep-aviso-big">Edición gratis: no se cobra</div>
      <p class="ep-aviso-sub">No se descuentan YunaCoins de ${escHtml(e.name || 'este equipo')} por estos cambios.</p>`
      : `<div class="ep-aviso-big">Edición libre: no se cobra</div>
      <p class="ep-aviso-sub">El equipo no tiene presidente: sin costo ni topes.</p>`;
    return;
  }
  const d = _topeEquipoDatos();
  const r = d.r;
  // PED1: los números bajan con lo que el pedido nuevo suma de verdad (el pendiente del
  // jugador ya está reservado y se reemplaza: no se cuenta dos veces).
  const cost = pendingCostSinReservar();
  const costPedido = pendingCost();
  const pendiente = ADMIN_EMBED ? null : pedidoMejoraPendiente(currentPlayer());
  // misma foto que el bloque de saldo: los números bajan en vivo con la
  // edición en curso (todavía no enviada), y «Esta edición» dice cuánto suma.
  const saldoBruto = r.saldoDisponible;
  // BONO-3: «Queda del tope» es del EQUIPO; «Disponible ahora» es el techo del
  // jugador abierto (el bono solo lo usa un jugador con «$»).
  const esSub = !!(currentPlayer() && currentPlayer().subscriber);
  const topeJugador = r.restanteGeneral + (esSub ? r.restanteSub : 0);
  const saldo = Math.max(0, saldoBruto - cost);
  const disponible = Math.max(0, Math.min(saldoBruto, topeJugador) - cost);
  // BONO4: mismas dos barras que el bloque de saldo del presidente, con el bono
  // bajando primero y el general después. El markup se rehace solo si cambia la
  // forma (edición gratis/libre, desglose o si hay bono); los números y las barras
  // se actualizan en sitio para que la animación no se corte en cada clic.
  const rep = _repartoBarras(r);
  const bonoTotal = d.bono;
  const generalTotal = r.topeTotal;
  const firma = 'aviso|' + (e.name || '') + '|' + (d.desglose ? 'd' : '') + '|' + (bonoTotal > 0 ? 'b' : '');
  const nuevo = firma !== _avisoFirma || !document.getElementById('ep-aviso-general-v');
  const prevSaldo = _numeroVisible(document.getElementById('ep-aviso-saldo-v'), saldo);
  const prevDisp = _numeroVisible(document.getElementById('ep-aviso-disp-v'), disponible);
  const prevBono = _numeroVisible(document.getElementById('ep-aviso-bono-v'), rep.subDespues);
  const prevGen = _numeroVisible(document.getElementById('ep-aviso-general-v'), rep.genDespues);
  if (nuevo){
    _avisoFirma = firma;
    el.className = 'ep-aviso';
    el.innerHTML = `
    <div class="ep-aviso-hd"><span class="ep-aviso-lbl">Presupuesto de la temporada</span><span class="ep-aviso-team">${escHtml(e.name || '')}</span></div>
    <div class="ep-aviso-grid">
      <div class="ep-aviso-cell">
        <span class="ep-aviso-k">Tu saldo</span>
        <span class="ep-aviso-saldo"><b class="ep-aviso-n" id="ep-aviso-saldo-v">0</b><span class="ep-aviso-u">YC</span></span>
      </div>
      <div class="ep-aviso-cell">
        <span class="ep-aviso-k">Tope del equipo esta temporada</span>
        <span class="ep-aviso-saldo"><b class="ep-aviso-n" id="ep-aviso-tope-v">0</b><span class="ep-aviso-u">YC</span></span>
        <span class="ep-aviso-note" id="ep-aviso-desg"></span>
      </div>
      <div class="ep-aviso-cell ep-aviso-barras">
        <span class="ep-aviso-k">Queda del tope</span>
        <div class="ep-bar" id="ep-aviso-bar-bono" hidden>
          <div class="ep-cap-txt"><span>Bono suscriptores (solo $): queda <b id="ep-aviso-bono-v">0</b> de <span id="ep-aviso-bono-cap">0</span></span></div>
          <div class="ep-cap-bar" aria-hidden="true"><i id="ep-aviso-bono-fill"></i></div>
        </div>
        <div class="ep-bar" id="ep-aviso-bar-general">
          <div class="ep-cap-txt"><span>Tope general: queda <b id="ep-aviso-general-v">0</b> de <span id="ep-aviso-general-cap">0</span></span></div>
          <div class="ep-cap-bar" aria-hidden="true"><i id="ep-aviso-general-fill"></i></div>
        </div>
        <span class="ep-aviso-note" id="ep-aviso-gastado"></span>
      </div>
      <div class="ep-aviso-cell ep-aviso-disp">
        <span class="ep-aviso-k">Disponible ahora</span>
        <span class="ep-aviso-saldo"><b class="ep-aviso-n" id="ep-aviso-disp-v">0</b><span class="ep-aviso-u">YC</span></span>
        <span class="ep-aviso-note" id="ep-aviso-limite"></span>
      </div>
    </div>
    <div class="ep-aviso-cost" id="ep-aviso-cost"></div>`;
  }
  const pintar = function(){
    const topeEl = document.getElementById('ep-aviso-tope-v');
    if (topeEl) topeEl.textContent = fmt(d.total);
    const desg = document.getElementById('ep-aviso-desg');
    if (desg){ desg.textContent = d.desglose || ''; desg.hidden = !d.desglose; }
    const gast = document.getElementById('ep-aviso-gastado');
    if (gast) gast.textContent = 'Gastado esta temporada ' + fmt(r.gastadoGeneral + r.gastadoSub);
    const lim = document.getElementById('ep-aviso-limite');
    if (lim) lim.textContent = saldoBruto < topeJugador ? 'Limita tu saldo' : 'Limita el tope';
    const costEl = document.getElementById('ep-aviso-cost');
    if (costEl) costEl.innerHTML = costPedido > 0
      ? `${pendiente ? 'Tu pedido' : 'Esta edición'}: <b>−${fmt(costPedido)} YC</b>${pendiente ? ' · reemplaza tu pedido pendiente' : ''}`
      : 'Esta edición: sin costo';
    animarNumero(document.getElementById('ep-aviso-saldo-v'), nuevo ? prevSaldo : null, saldo);
    animarNumero(document.getElementById('ep-aviso-disp-v'), nuevo ? prevDisp : null, disponible);
    const barBono = document.getElementById('ep-aviso-bar-bono');
    if (barBono) barBono.hidden = !(bonoTotal > 0);
    const bajaBono = rep.subDespues < rep.subAntes;
    const bajaGeneral = rep.genDespues < rep.genAntes;
    pintarBarra({
      row: barBono,
      fill: document.getElementById('ep-aviso-bono-fill'),
      val: document.getElementById('ep-aviso-bono-v'),
      cap: document.getElementById('ep-aviso-bono-cap'),
      total: bonoTotal, queda: rep.subDespues, desde: prevBono, baja: bajaBono, retraso: 0,
    });
    pintarBarra({
      row: document.getElementById('ep-aviso-bar-general'),
      fill: document.getElementById('ep-aviso-general-fill'),
      val: document.getElementById('ep-aviso-general-v'),
      cap: document.getElementById('ep-aviso-general-cap'),
      total: generalTotal, queda: rep.genDespues, desde: prevGen, baja: bajaGeneral,
      retraso: (bajaBono && bajaGeneral) ? BARRA_MS : 0,
    });
  };
  if (nuevo) requestAnimationFrame(pintar);
  else pintar();
}
function renderCart(){
  // CARRO1: el borrador abierto queda en el carrito en cada cambio (y se persiste).
  if (!ADMIN_EMBED) guardarDraftActual();
  const entradas = ADMIN_EMBED ? [] : _carritoEntradas();
  const cost = ADMIN_EMBED ? pendingCost() : _carritoCosto();
  const neto = ADMIN_EMBED ? pendingCostSinReservar() : _carritoNeto();
  const n = ADMIN_EMBED
    ? pendingChangeLines().length
    : entradas.reduce((s, e) => s + pendingChangeLinesDe(e.p, e.d).length, 0);
  const p = currentPlayer();
  // PED1: si el jugador ya tiene un pedido pendiente, el borrador (y el pedido nuevo) lo
  // incluyen: el texto lo dice para que el presidente no crea que se perdio lo que ya pidio.
  const pendiente = ADMIN_EMBED ? null : pedidoMejoraPendiente(p);
  const yaPedido = !ADMIN_EMBED && borradorYaPedido(p);
  const excede = !ADMIN_EMBED && _carritoExcede();
  document.getElementById('ep-cost').textContent = cost > 0 ? '−' + cost.toLocaleString('es-CL') : '0';
  let texto;
  if (ADMIN_EMBED){
    texto = n
      ? (p ? p.name + ' · ' : '') + n + (n === 1 ? ' cambio' : ' cambios') + (pendiente ? ' · reemplaza tu pedido pendiente' : '')
      : 'Sin cambios';
  } else if (yaPedido && !entradas.length){
    texto = (p ? p.name + ' · ' : '') + 'pedido enviado (sin cambios nuevos)';
  } else if (!entradas.length){
    texto = 'Sin cambios';
  } else if (entradas.length === 1){
    const e = entradas[0];
    const nE = pendingChangeLinesDe(e.p, e.d).length;
    texto = e.p.name + ' · ' + nE + (nE === 1 ? ' cambio' : ' cambios')
      + (pedidoMejoraPendiente(e.p) ? ' · reemplaza tu pedido pendiente' : '');
  } else {
    const hayPend = entradas.some(e => !!pedidoMejoraPendiente(e.p));
    texto = entradas.length + ' jugadores en espera · ' + n + (n === 1 ? ' cambio' : ' cambios')
      + (hayPend ? ' · reemplaza pedidos pendientes' : '');
  }
  document.getElementById('ep-cart-count').textContent = texto;
  document.getElementById('ep-cart-left').textContent = cost > 0
    ? 'queda ' + Math.max(0, (APP.saldo || 0) - neto).toLocaleString('es-CL') + ' YC'
    : '';
  renderHero();
  renderAviso();
  renderCarritoPanel();
  const applyBtn = document.getElementById('ep-apply');
  const sinNada = !entradas.length && !(ADMIN_EMBED && ADMIN_PENDIENTE && Object.keys(ADMIN_PENDIENTE).length);
  applyBtn.disabled = sinNada || (!ADMIN_EMBED && (yaPedido || !!APP.bloqueoPorAplicado || excede));
  applyBtn.title = ADMIN_EMBED
    ? ''
    : (excede ? 'El carrito supera el saldo disponible' : (entradas.length ? 'Revisar y mandar todos los cambios en espera' : ''));
  document.getElementById('ep-warn').textContent = excede
    ? 'El carrito supera lo disponible: quita ' + _carritoFalta().toLocaleString('es-CL') + ' YC.'
    : '';
}

/* ================= CARRO1 · tarjeta de cambios en espera =================
   HIST1: solo el resumen en una linea y dos botones («Descartar» y «Revisar todo»).
   El detalle por jugador se ve en la hoja de revision (CARRO2). Se puede mirar con
   mejoras pausadas; descartar y enviar siguen bloqueados por la pausa. */
/* CARRO2: texto «antes → después» de un cambio (compartido por la hoja de revision). */
function _textoCambio(l){
  return (l.from === '' || l.from == null || l.from === '—')
    ? String(l.to == null ? '' : l.to)
    : `${l.from} → ${l.to}`;
}
function _pluralCambios(n){
  return (n || 0) + (n === 1 ? ' cambio' : ' cambios');
}
/* CARRO2: color de la línea del jugador (el mismo de su posición en la plantilla), para el
   punto que abre la fila plegable de la revisión. */
function _lineaDeJugador(p){
  if (!p) return 'mid';
  const sp = titularSpot(p.id);
  return (sp ? PITCH_POS_LINEA[sp.pos] : null) || LINEA_POS[p.primaryPos] || 'mid';
}
/* CARRO2: una fila plegable por jugador (cerrada salvo que se pida abierta): nombre con el
   color de su línea, cantidad de cambios y costo; al desplegarla, una línea por cambio
   (atributo antes → después, habilidad, posición, lesión) con su costo. */
function _filaRevisionHTML(e, opts){
  if (!e || !e.p || !e.d) return '';
  const abierto = !!(opts && opts.abierto);
  const lineas = pendingChangeLinesDe(e.p, e.d);
  const id = String(e.p.id);
  const detalle = lineas.length
    ? lineas.map(l => {
        const costoTxt = lineaCostoTexto(l);
        return `<li class="ep-rev-line">
        <span class="ep-rev-lbl">${escHtml(l.label || '')}</span>
        <span class="ep-rev-chg">${escHtml(_textoCambio(l))}</span>
        <span class="ep-rev-cost" title="${escAttr(costoTxt)}">${escHtml(costoTxt)}</span>
      </li>`;
      }).join('')
    : '<li class="ep-rev-line"><span class="ep-rev-lbl">Sin detalle</span></li>';
  return `<details class="ep-rev-item" data-jugador="${escAttr(id)}"${abierto ? ' open' : ''}>
    <summary class="ep-rev-sum">
      <span class="ep-rev-dot ep-line-${_lineaDeJugador(e.p)}" aria-hidden="true"></span>
      <span class="ep-rev-name">${escHtml(e.p.name)}</span>
      <span class="ep-rev-n">${_pluralCambios(lineas.length)}</span>
      <span class="ep-rev-cost">${_fmtYC(e.costo)} YC</span>
      <svg class="icn" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </summary>
    <ul class="ep-rev-det">${detalle}</ul>
  </details>`;
}
/* CARRO2: «Abrir todo / Cerrar todo» de la hoja de revisión (solo con más de 3 jugadores).
   Las filas son <details>, así que el estado se lee de su atributo open. */
function _revSyncToggle(){
  const btn = document.getElementById('ep-rev-toggle');
  if (!btn) return;
  const box = document.getElementById('ep-rev-body');
  const items = box ? Array.from(box.querySelectorAll('details.ep-rev-item')) : [];
  const abiertos = items.filter(d => d.open).length;
  const todos = items.length > 0 && abiertos === items.length;
  btn.textContent = todos ? 'Cerrar todo' : 'Abrir todo';
  btn.setAttribute('aria-expanded', String(abiertos > 0));
  btn.title = todos ? 'Cerrar el detalle de todos los jugadores' : 'Abrir el detalle de todos los jugadores';
}
function toggleRevisionTodo(){
  const box = document.getElementById('ep-rev-body');
  if (!box) return;
  const items = Array.from(box.querySelectorAll('details.ep-rev-item'));
  if (!items.length) return;
  const abrir = items.some(d => !d.open);
  items.forEach(d => { d.open = abrir; });
  _revSyncToggle();
}
/* El estado del botón también sigue a los clics en cada fila. */
document.addEventListener('toggle', function(){ _revSyncToggle(); }, true);
function renderCarritoPanel(){
  const box = document.getElementById('ep-cart-panel');
  if (!box) return;
  const entradas = ADMIN_EMBED ? [] : _carritoEntradas();
  if (!entradas.length){ box.hidden = true; box.innerHTML = ''; return; }
  const total = _carritoCosto();
  const excede = _carritoExcede();
  const nCambios = entradas.reduce((s, e) => s + pendingChangeLinesDe(e.p, e.d).length, 0);
  // HIST1: una sola linea. Con un jugador se lo nombra; con varios, la cuenta y el total.
  const linea = entradas.length === 1
    ? escHtml(entradas[0].p.name) + ' · ' + _pluralCambios(nCambios) + ' · ' + _fmtYC(total) + ' YC'
    : entradas.length + ' jugadores · ' + _fmtYC(total) + ' YC';
  box.hidden = false;
  box.innerHTML = `
    <div class="ep-pend-hd">
      <span class="ep-pend-lbl">Cambios en espera</span>
    </div>
    <div class="ep-res-line">${linea}</div>
    ${excede ? '<div class="ep-carro-warn">El carrito supera lo disponible.</div>' : ''}
    <div class="ep-carro-act">
      <button type="button" class="ep-btn" data-onclick="descartarCarrito()">Descartar</button>
      <button type="button" class="ep-btn primary" data-onclick="openReviewAll()"${excede ? ' disabled' : ''}>Revisar todo</button>
    </div>`;
}

function discardChanges(){
  // CARRO1: descarta solo el jugador abierto; el resto del carrito queda.
  if (_bloqueadoPorPausa()) return;
  const p = currentPlayer();
  if (p){ delete APP.drafts[p.id]; delete APP.draftsBase[p.id]; }
  loadDraft();
  _carritoGuardar();
  renderAll();
  showMiniToast('Cambios descartados');
}
function descartarCarritoJugador(id){
  if (_bloqueadoPorPausa()) return;
  const p = PLAYER_BY_ID[id];
  delete APP.drafts[id];
  delete APP.draftsBase[id];
  if (id === APP.playerId) loadDraft();
  _carritoGuardar();
  renderAll();
  if (p) showMiniToast('Se descartaron los cambios de ' + p.name);
}
function descartarCarrito(){
  if (_bloqueadoPorPausa()) return;
  if (!_carritoEntradas().length){ showMiniToast('No hay cambios en espera.'); return; }
  APP.drafts = {};
  APP.draftsBase = {};
  loadDraft();
  _carritoGuardar();
  renderAll();
  showMiniToast('Carrito vacío');
}

/* ---- diff entre un borrador y lo publicado (modal de confirmacion / historial / carrito) ---- */
function pendingChangeLinesDe(p, d){
  if (!p || !d) return [];
  const lines = [];
  MAIN_STATS.forEach(s=>{
    if(d.stats[s.k]!==p.stats[s.k]) lines.push({label:s.l, from:p.stats[s.k], to:d.stats[s.k], cost:costoStatDe(p, s.k, p.stats[s.k], d.stats[s.k]), gratis:(d.stats[s.k]>p.stats[s.k] ? gratisStatDe(p, s.k, p.stats[s.k], d.stats[s.k]) : 0), perfil:perfilPres(p)});
  });
  SEC_NEW.forEach(s=>{
    if(s.sc===99){ if(d.sec[s.k]!==p.sec[s.k]) lines.push({label:s.l, from:p.sec[s.k], to:d.sec[s.k], cost:costoStatDe(p, s.k, p.sec[s.k], d.sec[s.k]), gratis:(d.sec[s.k]>p.sec[s.k] ? gratisStatDe(p, s.k, p.sec[s.k], d.sec[s.k]) : 0), perfil:perfilPres(p)}); }
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
    if(d.positions[pos.k] && !p.positions[pos.k]) lines.push({label:'Posición: '+pos.l, from:'—', to:'agregada', cost:0});
    if(!d.positions[pos.k] && p.positions[pos.k]) lines.push({label:'Posición: '+pos.l, from:'marcada', to:'quitada', cost:0});
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
function pendingChangeLines(){
  return pendingChangeLinesDe(currentPlayer(), APP.draft);
}

/* ================= modal: confirmar aplicar ================= */

/* CARRO2: misma fila plegable que «Revisar todo», pero con un solo jugador la fila va ABIERTA:
   no hay lista que recortar y el pedido se confirma con los cambios a la vista. */
function openApplyConfirm(){
  if (_bloqueadoPorPausa()) return;
  const p = currentPlayer();
  const lines = pendingChangeLines();
  if(lines.length===0){
    // Modo admin: si el borrador volvio al original pero habia cambios guardados, "aplicar" los limpia.
    if(ADMIN_EMBED && ADMIN_PENDIENTE && Object.keys(ADMIN_PENDIENTE).length) commitChangesAdmin();
    return;
  }
  if (!ADMIN_EMBED && pendientesEmparejarDeJugador(p).length){
    showMiniToast('Este jugador tiene un pedido de emparejar pendiente: espera a que Luis lo aplique o cancélalo en Pedidos antes de mandar mejoras.');
    return;
  }
  if (!ADMIN_EMBED && borradorYaPedido(p)){
    showMiniToast('Ya mandaste estos cambios para ' + p.name + ': edita algo para mandar un pedido nuevo.');
    return;
  }
  const cost = pendingCost();
  // PED1: el pedido pendiente del jugador ya reserva su costo; el pedido nuevo lo reemplaza.
  const reservado = ADMIN_EMBED ? 0 : costoReservadoJugador(p);
  const pendiente = ADMIN_EMBED ? null : pedidoMejoraPendiente(p);
  const costoSinReservar = Math.max(0, cost - reservado);
  // saldo, tope y bono antes y despues del pedido: los mismos datos que muestra el saldo
  const { fromSub } = repartoDelPedidoNuevo(p, cost);
  const saldoAntes = APP.saldo || 0;
  const saldoDespues = Math.max(0, saldoAntes - costoSinReservar);
  const d = _topeEquipoDatos();
  const topeAntes = Math.max(0, d.r.restanteGeneral + d.r.restanteSub);
  const topeDespues = Math.max(0, topeAntes - costoSinReservar);
  const wrap = document.getElementById('ep-confirm-wrap');
  wrap.innerHTML = `
  <div class="ep-overlay ep-overlay-sheet" data-onclick="closeIfBackdrop(event,closeApplyConfirm)">
    <section class="ep-sheet" role="dialog" aria-modal="true" aria-labelledby="ep-sheet-tit">
      <div class="ep-grab" aria-hidden="true"></div>
      <div class="ep-sheet-hd">
        <h2 id="ep-sheet-tit">${ADMIN_EMBED ? 'Revisar cambios' : 'Revisar pedido'}</h2>
        <span>${ADMIN_EMBED ? 'Queda como cambio pendiente en la Tool PES5.'
          : (pendiente
              ? 'Reemplaza tu pedido anterior de ' + escHtml(p.name) + ': se cancela al enviar. Se cobra cuando Luis lo aplica en el juego.'
              : 'Se cobra cuando Luis lo aplica en el juego. Mientras esté pendiente lo puedes cancelar.')}</span>
      </div>
      <div class="ep-rev-body">${_filaRevisionHTML({ p: p, d: APP.draft, costo: cost }, { abierto: true })}</div>
      ${ADMIN_EMBED ? '' : `<dl class="ep-sheet-saldo">
        <div><dt>Total del pedido</dt><dd><b>${cost.toLocaleString('es-CL')} YC</b></dd></div>
        <div><dt>Saldo</dt><dd>${saldoAntes.toLocaleString('es-CL')} <span>→</span> <b>${saldoDespues.toLocaleString('es-CL')} YC</b></dd></div>
        <div><dt>Tope del equipo</dt><dd>${topeAntes.toLocaleString('es-CL')} <span>→</span> <b>${topeDespues.toLocaleString('es-CL')} YC</b> de ${d.total.toLocaleString('es-CL')}</dd></div>
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

/* ================= CARRO1 · «Revisar todo» (todos los jugadores en espera) =================
   Reparto bono/general del carrito: el bono se consume primero, en el orden del plantel, pero
   SOLO los jugadores con «$» usan el bono (BONO-3); cada uno usa su propio `subscriber` con
   YUNACOINS_RULES.distribuirCosto (igual que la Tool). Al reemplazar pedidos pendientes se
   libera antes su parte de suscriptores. */
function _repartoCarrito(entradas){
  const liberadoGeneral = entradas.reduce((s, e) => s + pendientesMejoraDeJugador(e.p).reduce((a, x) => a + Number(x.fromGeneral || 0), 0), 0);
  const liberadoSub = entradas.reduce((s, e) => s + pendientesMejoraDeJugador(e.p).reduce((a, x) => a + Number(x.fromSub || 0), 0), 0);
  let subsRestantes = Math.max(0, (APP.budget.subscribers || 0) + liberadoSub);
  const filas = entradas.map(e => {
    const r = YUNACOINS_RULES.distribuirCosto(e.costo, subsRestantes, !!(e.p && e.p.subscriber));
    subsRestantes = Math.max(0, subsRestantes - r.fromSub);
    return Object.assign({}, e, { fromGeneral: r.fromGeneral, fromSub: r.fromSub });
  });
  return {
    filas: filas,
    liberadoGeneral: liberadoGeneral,
    liberadoSub: liberadoSub,
    totalCost: filas.reduce((s, f) => s + f.costo, 0),
    totalGeneral: filas.reduce((s, f) => s + f.fromGeneral, 0),
    totalSub: filas.reduce((s, f) => s + f.fromSub, 0),
  };
}
function _idsPendientesDe(p){
  return pendientesMejoraDeJugador(p).map(x => String(x._id)).sort().join('|');
}
function openReviewAll(){
  if (ADMIN_EMBED) return openApplyConfirm();
  // HIST1: en pausa se puede mirar el carrito; el envio lo corta commitCarrito.
  if (APP.bloqueoPorAplicado){
    showMiniToast('Luis aplicó cambios que todavía no publicó: espera a que publique para pedir más.');
    return;
  }
  if (!puedeMandarPedido()){
    showMiniToast(AUTH.user ? 'Tu cuenta no tiene un equipo asignado — pide al admin que te vincule uno.' : 'Inicia sesión para mandar el pedido.');
    return;
  }
  guardarDraftActual();
  const entradas = _carritoEntradas();
  if (!entradas.length){ showMiniToast('No tienes cambios en espera: edita un jugador para sumarlo al carrito.'); return; }
  const conEmparejar = entradas.filter(e => pendientesEmparejarDeJugador(e.p).length);
  if (conEmparejar.length){
    showMiniToast('Quita del carrito a ' + conEmparejar.map(e => e.p.name).join(', ') + ': tiene un pedido de emparejar pendiente.');
    return;
  }
  if (_carritoExcede()){
    const falta = _carritoFalta();
    showMiniToast('El carrito supera el saldo disponible: quita ' + falta.toLocaleString('es-CL') + ' YC.');
    return;
  }
  const rep = _repartoCarrito(entradas);
  const neto = Math.max(0, rep.totalCost - rep.liberadoGeneral - rep.liberadoSub);
  const saldoAntes = APP.saldo || 0;
  const saldoDespues = Math.max(0, saldoAntes - neto);
  const d = _topeEquipoDatos();
  const topeAntes = Math.max(0, d.r.restanteGeneral + d.r.restanteSub);
  const topeDespues = Math.max(0, topeAntes - neto);
  const totalCambios = entradas.reduce((s, e) => s + pendingChangeLinesDe(e.p, e.d).length, 0);
  const grupos = entradas.map(e => _filaRevisionHTML(e)).join('');
  const muchos = entradas.length > 3;
  const wrap = document.getElementById('ep-confirm-wrap');
  wrap.innerHTML = `
  <div class="ep-overlay ep-overlay-sheet" data-onclick="closeIfBackdrop(event,closeApplyConfirm)">
    <section class="ep-sheet ep-sheet-largo" role="dialog" aria-modal="true" aria-labelledby="ep-sheet-carro">
      <div class="ep-grab" aria-hidden="true"></div>
      <div class="ep-sheet-hd">
        <h2 id="ep-sheet-carro">Revisar todo el carrito</h2>
        <span>Se manda un pedido por jugador, con todos sus cambios contra lo publicado. Los pedidos pendientes que reemplazas se cancelan al enviar y se cobra cuando Luis los aplica.</span>
      </div>
      ${muchos ? `<div class="ep-rev-bar">
        <span class="ep-rev-bar-txt">${entradas.length} jugadores · ${_pluralCambios(totalCambios)}</span>
        <button type="button" class="ep-rev-toggle" id="ep-rev-toggle" aria-expanded="false" aria-controls="ep-rev-body" data-onclick="toggleRevisionTodo()" title="Abrir el detalle de todos los jugadores">Abrir todo</button>
      </div>` : ''}
      <div class="ep-rev-body" id="ep-rev-body">${grupos}</div>
      <dl class="ep-sheet-saldo">
        <div><dt>Total del carrito</dt><dd><b>${rep.totalCost.toLocaleString('es-CL')} YC</b></dd></div>
        <div><dt>Saldo</dt><dd>${saldoAntes.toLocaleString('es-CL')} <span>→</span> <b>${saldoDespues.toLocaleString('es-CL')} YC</b></dd></div>
        <div><dt>Tope del equipo</dt><dd>${topeAntes.toLocaleString('es-CL')} <span>→</span> <b>${topeDespues.toLocaleString('es-CL')} YC</b> de ${d.total.toLocaleString('es-CL')}</dd></div>
        <div><dt>Bono suscriptores usado</dt><dd>${rep.totalSub.toLocaleString('es-CL')}</dd></div>
      </dl>
      <div class="ep-sheet-act">
        <button class="ep-btn" data-onclick="closeApplyConfirm()">Seguir editando</button>
        <button class="ep-btn primary" data-onclick="commitCarrito()">Enviar todo</button>
      </div>
    </section>
  </div>`;
}
/* Envia UN pedido por jugador del carrito. Cancelaciones + altas van en el MISMO batch: si
   falla, no se manda nada y el carrito queda intacto (las reglas ya permiten cada operacion). */
async function commitCarrito(){
  if (_bloqueadoPorPausa()) return;
  if (ADMIN_EMBED) return commitChangesAdmin();
  if (APP.bloqueoPorAplicado){
    closeApplyConfirm();
    showMiniToast('Luis aplicó cambios que todavía no publicó: espera a que publique para pedir más.');
    return;
  }
  if (!puedeMandarPedido()){
    closeApplyConfirm();
    showMiniToast(AUTH.user ? 'Tu cuenta no tiene un equipo asignado — pide al admin que te vincule uno.' : 'Inicia sesión para mandar el pedido.');
    return;
  }
  const entradas = _carritoEntradas();
  if (!entradas.length){ closeApplyConfirm(); return; }
  const conEmparejar = entradas.filter(e => pendientesEmparejarDeJugador(e.p).length);
  if (conEmparejar.length){
    closeApplyConfirm();
    showMiniToast('Quita del carrito a ' + conEmparejar.map(e => e.p.name).join(', ') + ': tiene un pedido de emparejar pendiente.');
    return;
  }
  const sinRegistro = entradas.filter(e => registroPres(e.p) == null);
  if (sinRegistro.length){
    closeApplyConfirm();
    showMiniToast('No se pudo mandar: ' + sinRegistro.map(e => e.p.name).join(', ') + ' no está en el save.');
    return;
  }
  if (_carritoExcede()){
    closeApplyConfirm();
    showMiniToast('El carrito supera el saldo disponible: quita cambios antes de enviarlo.');
    return;
  }
  // PED1 · la lista se relee justo antes de armar el envio: si otra pestana dejo o cancelo
  // un pendiente de algun jugador del carrito, se corta para no perder esos cambios.
  const antes = entradas.map(e => String(e.p.id) + ':' + _idsPendientesDe(e.p)).join('||');
  await _refrescarPendientes();
  const despues = entradas.map(e => String(e.p.id) + ':' + _idsPendientesDe(e.p)).join('||');
  if (antes !== despues){
    closeApplyConfirm();
    renderAll();
    showMiniToast('Se actualizaron tus pedidos pendientes: vuelve a abrir los jugadores para sumar esos cambios.');
    return;
  }
  const filas = entradas.map(e => {
    const pend = pedidoMejoraPendiente(e.p);
    return {
      p: e.p, d: e.d, costo: pendingCostDe(e.p, e.d),
      cambios: cambiosDelBorrador(e.p, e.d),
      lineas: pendingChangeLinesDe(e.p, e.d),
      viejos: pendientesMejoraDeJugador(e.p),
      pend: pend,
    };
  }).filter(f => f.cambios && Object.keys(f.cambios).length
    && !(f.pend && f.pend.cambios && PES5_PLANTILLA.canonicoJSON(f.cambios) === PES5_PLANTILLA.canonicoJSON(f.pend.cambios)));
  if (!filas.length){
    closeApplyConfirm();
    showMiniToast('No hay cambios aplicables para mandar.');
    return;
  }
  const rep = _repartoCarrito(filas.map(f => ({ p: f.p, d: f.d, costo: f.costo })));
  filas.forEach((f, i) => { f.fromGeneral = rep.filas[i].fromGeneral; f.fromSub = rep.filas[i].fromSub; });
  const neto = Math.max(0, rep.totalCost - rep.liberadoGeneral - rep.liberadoSub);
  // BONO-3: cada jugador ya trae su reparto (el bono solo si tiene «$»); se revisan los tres topes.
  const excedeGeneral = rep.totalGeneral > (APP.budget.general || 0) + rep.liberadoGeneral;
  const excedeBono = rep.totalSub > (APP.budget.subscribers || 0) + rep.liberadoSub;
  const excedeSaldo = neto > (APP.saldo || 0);
  if (excedeGeneral || excedeBono || excedeSaldo){
    closeApplyConfirm();
    showMiniToast('El carrito supera lo disponible: quita cambios antes de enviarlo.');
    return;
  }
  const btn = document.querySelector('#ep-confirm-wrap .ep-btn.primary');
  if (btn) btn.disabled = true;
  const fs = firebase.firestore();
  const refs = filas.map(() => fs.collection('pedidos_pes5').doc());
  try {
    const batch = fs.batch();
    filas.forEach((f, i) => {
      f.viejos.forEach(x => {
        if (x._id && String(x._id).indexOf('local-') !== 0){
          batch.update(fs.collection('pedidos_pes5').doc(x._id), {
            estado: 'cancelado', canceladoEn: new Date().toISOString(),
          });
        }
      });
      batch.set(refs[i], {
        uid: AUTH.user.uid,
        teamId: String(AUTH.teamId),
        teamName: EQUIPO_TSC?.name || null,
        pes5Club: EQUIPO_TSC?.pes5Club || null,
        cliente: MEJORAS_CLIENTE,
        playerId: f.p.id,
        playerName: f.p.name,
        registro: registroPres(f.p),
        pes5ClubIdx: EQUIPO_TSC ? EQUIPO_TSC.pes5ClubIdx : null,
        cambios: f.cambios,
        dorsal: f.p.dorsal,
        subscriber: !!f.p.subscriber,
        lines: f.lineas,
        totalCost: f.costo,
        fromGeneral: f.fromGeneral,
        fromSub: f.fromSub,
        estado: 'pendiente',
        creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
  } catch(e){
    if (btn) btn.disabled = false;
    await _avisarErrorPedido(e, 'No se pudo mandar el carrito: ');
    return;
  }
  /* Reserva de YunaCoins: los pendientes viejos dejan de reservar y los nuevos reservan una
     sola vez. Se ajusta en memoria y despues se recalcula del servidor. */
  const reservadoTotal = rep.liberadoGeneral + rep.liberadoSub;
  APP.budget.general = Math.max(0, (APP.budget.general || 0) + rep.liberadoGeneral - rep.totalGeneral);
  APP.budget.subscribers = Math.max(0, (APP.budget.subscribers || 0) + rep.liberadoSub - rep.totalSub);
  APP.saldo = Math.max(0, (APP.saldo || 0) + reservadoTotal - rep.totalCost);
  const idsViejos = new Set();
  filas.forEach(f => f.viejos.forEach(x => idsViejos.add(x)));
  APP.pendientes = (APP.pendientes || []).filter(x => !idsViejos.has(x));
  const locales = filas.map((f, i) => ({
    _id: refs[i].id, playerId: f.p.id, playerName: f.p.name, registro: registroPres(f.p),
    cambios: f.cambios, lines: f.lineas, totalCost: f.costo, fromGeneral: f.fromGeneral, fromSub: f.fromSub,
    estado: 'pendiente', creadoEn: new Date().toISOString(),
  }));
  APP.pendientes.push(...locales);
  filas.forEach(f => {
    AUDIT_LOG.push({
      ts: Date.now(), playerId: f.p.id, playerName: f.p.name, dorsal: f.p.dorsal, subscriber: !!f.p.subscriber,
      lines: f.lineas, totalCost: f.costo, fromGeneral: f.fromGeneral, fromSub: f.fromSub,
      reemplaza: f.pend ? String(f.pend._id || '') : '',
      budgetAfter: { general: APP.budget.general, subscribers: APP.budget.subscribers },
    });
  });
  saveAuditLog();
  APP.drafts = {};
  APP.draftsBase = {};
  _carritoGuardar();
  await recalcularPresupuestoReal();
  // lectura eventual: conservar los pedidos recien creados si el servidor aun no los trae
  locales.forEach(x => {
    if (!APP.pendientes.some(y => String(y._id) === String(x._id))) APP.pendientes.push(x);
  });
  loadDraft();
  closeApplyConfirm();
  renderAll();
  showMiniToast(filas.length === 1
    ? `Pedido enviado a Luis: -${rep.totalCost.toLocaleString('es-CL')} YunaCoins`
    : `Carrito enviado a Luis: ${filas.length} jugadores · -${rep.totalCost.toLocaleString('es-CL')} YunaCoins`);
}

/* Relee los pedidos pendientes del presidente (la misma consulta que
   recalcularPresupuestoReal) y deja APP.pendientes igual que el servidor. Se usa antes de
   mandar un pedido: si otra pestana dejo un pendiente del mismo jugador, se cancela igual. */
async function _refrescarPendientes(){
  try {
    const q = await firebase.firestore().collection('pedidos_pes5')
      .where('uid', '==', AUTH.user.uid).where('estado', '==', 'pendiente').get();
    APP.pendientes = q.docs.map(d => Object.assign({ _id: d.id }, d.data()));
  } catch(e){ console.warn('[editor] no se pudieron releer los pedidos pendientes', e); }
}

async function commitChanges(){
  if (_bloqueadoPorPausa()) return;
  if (ADMIN_EMBED) return commitChangesAdmin();
  if (APP.bloqueoPorAplicado){ closeApplyConfirm(); showMiniToast('Luis aplicó cambios que todavía no publicó: espera a que publique para pedir más.'); return; }
  const p = currentPlayer();
  const lines = pendingChangeLines();
  const cost = pendingCost();
  if(lines.length===0){ closeApplyConfirm(); return; }
  if(!puedeMandarPedido()){
    closeApplyConfirm();
    showMiniToast(AUTH.user ? 'Tu cuenta no tiene un equipo asignado — pide al admin que te vincule uno.' : 'Inicia sesión para mandar el pedido.');
    return;
  }
  // PED1 · un solo pedido pendiente por jugador: la lista se relee del servidor justo antes
  // de armar el envio, para reemplazar tambien lo que haya quedado de otra pestana.
  const antes = pendientesMejoraDeJugador(p).map(x => String(x._id)).sort().join('|');
  await _refrescarPendientes();
  if (pendientesMejoraDeJugador(p).map(x => String(x._id)).sort().join('|') !== antes){
    // Otra pestana dejo un pendiente de este jugador: si se manda este pedido, ese se cancela
    // y sus cambios se perderfan. Se corta aca y el presidente vuelve a abrir al jugador.
    closeApplyConfirm();
    renderPending();
    showMiniToast('Se actualizó tu pedido pendiente de ' + p.name + ': vuelve a abrirlo para sumar esos cambios.');
    return;
  }
  // PED1: el pedido pendiente del jugador ya reserva su costo; el nuevo lo reemplaza (no suma dos veces).
  const reservado = costoReservadoJugador(p);
  const costoSinReservar = Math.max(0, cost - reservado);
  if (costoSinReservar > remainingForPlayer(p)){ closeApplyConfirm(); return; }
  if (pendientesEmparejarDeJugador(p).length){
    closeApplyConfirm();
    showMiniToast('Este jugador tiene un pedido de emparejar pendiente: espera a que Luis lo aplique o cancélalo en Pedidos antes de mandar mejoras.');
    return;
  }

  const viejos = pendientesMejoraDeJugador(p);  // PED1: los que este pedido reemplaza
  const pendiente = pedidoMejoraPendiente(p);
  const cambios = cambiosDelBorrador(p, APP.draft);
  const registro = PES5_PLANTILLA.registroDeId(p.id);
  if (registro == null || !Object.keys(cambios).length){
    closeApplyConfirm();
    showMiniToast('No hay cambios aplicables para mandar.');
    return;
  }
  if (pendiente && pendiente.cambios
      && PES5_PLANTILLA.canonicoJSON(cambios) === PES5_PLANTILLA.canonicoJSON(pendiente.cambios)){
    closeApplyConfirm();
    showMiniToast('Ya mandaste estos cambios para ' + p.name + ': edita algo para mandar un pedido nuevo.');
    return;
  }

  /* Slice D.R punto 5b (orden INVERTIDO, 15/09): si es suscriptor, primero
     se gasta el bono exclusivo; agotado el bono, el resto sigue con el
     general. Si no es suscriptor, todo sale del general. Al reemplazar un pedido
     pendiente se libera antes su parte de suscriptores (repartoDelPedidoNuevo). */
  const { fromGeneral, fromSub } = repartoDelPedidoNuevo(p, cost);
  const liberadoGeneral = viejos.reduce((s, x) => s + Number(x.fromGeneral || 0), 0);
  const liberadoSub = viejos.reduce((s, x) => s + Number(x.fromSub || 0), 0);

  const btn = document.getElementById('ep-apply');
  if (btn) btn.disabled = true;
  const fs = firebase.firestore();
  const nuevoRef = fs.collection('pedidos_pes5').doc();
  try {
    /* PED1 · un solo pedido pendiente de mejoras por jugador: el pedido nuevo (todos los
       cambios contra lo publicado) y la cancelación del anterior van en el MISMO batch, asi
       nunca quedan dos pendientes del mismo jugador. Las reglas de Firestore ya permiten las
       dos operaciones por separado (crear y cancelar el propio mientras esta pendiente), asi
       que el batch no necesita cambios de reglas: si una falla no se escribe ninguna y el
       pedido anterior sigue pendiente. Mismo update que cancelarPedidoDesdeHistorial. */
    const batch = fs.batch();
    viejos.forEach(x => {
      if (x._id && String(x._id).indexOf('local-') !== 0){
        batch.update(fs.collection('pedidos_pes5').doc(x._id), {
          estado: 'cancelado', canceladoEn: new Date().toISOString(),
        });
      }
    });
    batch.set(nuevoRef, {
      uid: AUTH.user.uid,
      teamId: String(AUTH.teamId),
      teamName: EQUIPO_TSC?.name || null,
      pes5Club: EQUIPO_TSC?.pes5Club || null,
      cliente: MEJORAS_CLIENTE,
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
    await batch.commit();
  } catch(e){
    if (btn) btn.disabled = false;
    await _avisarErrorPedido(e, 'No se pudo mandar el pedido: ');
    return;
  }

  /* Reserva de YunaCoins (PED1): el pedido viejo deja de reservar y el nuevo reserva una sola
     vez. Se ajusta en memoria y despues se recalcula del servidor (pedidos pendientes + coins). */
  APP.budget.general = Math.max(0, (APP.budget.general || 0) + liberadoGeneral - fromGeneral);
  APP.budget.subscribers = Math.max(0, (APP.budget.subscribers || 0) + liberadoSub - fromSub);
  APP.saldo = Math.max(0, (APP.saldo || 0) + reservado - cost);
  APP.pendientes = (APP.pendientes || []).filter(x => viejos.indexOf(x) < 0);
  const nuevoLocal = {
    _id: nuevoRef.id, playerId: p.id, playerName: p.name, registro,
    cambios, lines, totalCost: cost, fromGeneral, fromSub, estado: 'pendiente',
    creadoEn: new Date().toISOString(),
  };
  APP.pendientes.push(nuevoLocal);

  AUDIT_LOG.push({
    ts: Date.now(), playerId:p.id, playerName:p.name, dorsal:p.dorsal, subscriber:!!p.subscriber,
    lines, totalCost:cost, fromGeneral, fromSub,
    reemplaza: pendiente ? String(pendiente._id || '') : '',
    budgetAfter:{general:APP.budget.general, subscribers:APP.budget.subscribers},
  });
  saveAuditLog();

  // el jugador publicado NO se toca: lo que se ve es lo publicado + el pedido pendiente (loadDraft).
  await recalcularPresupuestoReal();
  if (!pendientesMejoraDeJugador(p).length) APP.pendientes.push(nuevoLocal); // lectura eventual: no perder el pedido recien creado
  loadDraft();
  closeApplyConfirm();
  renderAll();
  showMiniToast(pendiente
    ? `Pedido enviado a Luis: -${cost.toLocaleString('es-CL')} YunaCoins · reemplaza tu pedido anterior de ${p.name}`
    : `Pedido enviado a Luis: -${cost.toLocaleString('es-CL')} YunaCoins`);
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

/* ================= HIST1 · ventana del historial de pedidos =================
   Los cancelados no se muestran (los cancelados a mano y los que PED1 reemplazó al
   mandar un pedido nuevo del mismo jugador). Pestañas Pendientes / Aplicados /
   Rechazados; cada pedido es una fila cerrada (se abre para ver el detalle) y al
   final «Cobros al equipo», también cerrada. */
let _AUDIT = { tab: 'pendiente', pedidos: [], movimientos: [] };
let _auditSeq = 0;   // sube al cerrar: una carga vieja no vuelve a abrir la ventana
const AUDIT_TABS = [['pendiente', 'Pendientes'], ['aplicado', 'Aplicados'], ['rechazado', 'Rechazados']];
const _msAudit = v => v && v.toDate ? v.toDate().getTime() : (v ? new Date(v).getTime() : 0);
/* fecha corta de la derecha de cada fila */
function _fechaCorta(v){
  const t = _msAudit(v);
  return t ? new Date(t).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';
}
/* «antes → después» de una linea guardada en el pedido */
function _textoLineaPedido(l){
  if (!l) return '';
  return (l.from === '' || l.from == null || l.from === '—')
    ? String(l.to == null ? '' : l.to)
    : String(l.from) + ' → ' + String(l.to);
}
/* Las lineas de alineacion vienen como «Entra X por Y» o «X ↔ Y». */
function _textoAlineacionPedido(t){
  const s = String(t == null ? '' : t);
  let m = /^Entra (.+) por (.+)$/.exec(s);
  if (m) return 'entra ' + m[1] + ', sale ' + m[2];
  m = /^(.+?) ↔ (.+)$/.exec(s);
  if (m) return m[1] + ' y ' + m[2] + ' cambian de lugar';
  return s;
}
/* Titulo de una linea: un pedido de mejoras, formacion/alineacion o emparejar. */
function _tituloPedido(p){
  const lineas = Array.isArray(p.lines) ? p.lines : [];
  if (p.tipo === 'emparejar'){
    const nivel = Number(p.nivel);
    return escHtml(p.playerName || 'Jugador')
      + (Number.isFinite(nivel) && nivel > 0 ? ' · Emparejar a ' + nivel : ' · Emparejar');
  }
  if (p.tipo === 'formacion'){
    const linForm = lineas.find(l => l && l.label === 'Formación');
    const alin = lineas.filter(l => l && l.label === 'Cambio de alineación');
    if (linForm){
      const antes = linForm.from ? String(linForm.from) : '';
      const despues = linForm.to ? String(linForm.to) : ((p.formacion && p.formacion.nombre) || '');
      return 'Cambio de formación: ' + escHtml(antes ? antes + ' → ' + despues : despues);
    }
    if (alin.length === 1) return 'Cambio de alineación: ' + escHtml(_textoAlineacionPedido(alin[0].to));
    if (alin.length > 1) return alin.length + ' cambios de alineación';
    const nombre = (p.formacion && p.formacion.nombre) || '';
    return 'Cambio de formación' + (nombre ? ': ' + escHtml(nombre) : '');
  }
  return escHtml(p.playerName || 'Jugador') + ' · ' + _pluralCambios(lineas.length)
    + ' · ' + _fmtYC(p.totalCost) + ' YC';
}
/* El detalle de la fila: una linea por cambio (atributo, habilidad, posicion, lesion, altura). */
function _detallePedidoHTML(p){
  const lineas = Array.isArray(p.lines) ? p.lines : [];
  if (!lineas.length) return '<li class="ep-rev-line"><span class="ep-rev-lbl">Sin detalle</span></li>';
  return lineas.map(l => `<li class="ep-rev-line">
      <span class="ep-rev-lbl">${escHtml(l.label || '')}</span>
      <span class="ep-rev-chg">${escHtml(_textoLineaPedido(l))}</span>
    </li>`).join('');
}
function _filaPedidoHTML(p){
  const id = String(p._id || '');
  const motivo = p.estado === 'rechazado' && p.motivo
    ? `<span class="ep-hist-motivo">${escHtml(p.motivo)}</span>` : '';
  const cancelar = p.estado === 'pendiente' && id && id.indexOf('local-') !== 0
    ? `<button type="button" class="ep-btn ep-hist-cancel" data-onclick="cancelarPedidoDesdeHistorial('${escAttr(id)}')">Cancelar pedido</button>` : '';
  return `<details class="ep-rev-item ep-hist-item">
    <summary class="ep-rev-sum ep-hist-sum">
      <span class="ep-hist-txt">
        <span class="ep-hist-title">${_tituloPedido(p)}</span>
        ${motivo}
      </span>
      <span class="ep-hist-fecha">${escHtml(_fechaCorta(p.creadoEn))}</span>
      <svg class="icn" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </summary>
    <ul class="ep-rev-det">${_detallePedidoHTML(p)}</ul>
    ${cancelar}
  </details>`;
}
/* «Cobros al equipo»: fila cerrada con el total de la temporada; al abrir, los movimientos
   (los reembolsos suman, con +monto). */
function _filaCobrosHTML(){
  const movs = _AUDIT.movimientos || [];
  // El total es el mismo que «Gastado esta temporada»: el desglose pes5 de cada
  // movimiento (los reembolsos vienen con fromGeneral negativo). Sin desglose, el monto.
  const total = movs.reduce((s, m) => {
    const meta = m.pes5 || {};
    const neto = (meta.fromGeneral != null || meta.fromSub != null)
      ? Number(meta.fromGeneral || 0) + Number(meta.fromSub || 0)
      : (meta.reembolso ? -1 : 1) * Number(m.amount || 0);
    return s + neto;
  }, 0);
  const filas = movs.length ? movs.map(m => {
    const reembolso = !!(m.pes5 && m.pes5.reembolso);
    const quien = (m.pes5 && m.pes5.playerName) || '';
    const lbl = reembolso ? 'Reembolso' + (quien ? ' · ' + quien : '') : quien;
    return `<div class="ep-diffline">
      <div class="lbl">${escHtml(lbl)}${m.note ? ' &middot; ' + escHtml(m.note) : ''}</div>
      <div class="chg">${escHtml(m.date ? new Date(m.date).toLocaleDateString('es-CL') : '')}</div>
      <div class="cost">${reembolso ? '+' : '-'}${Number(m.amount || 0).toLocaleString('es-CL')}</div>
    </div>`;
  }).join('') : '<div class="ep-hist-vacio">Sin cobros de mejoras esta temporada.</div>';
  return `<details class="ep-rev-item ep-hist-item ep-hist-cobros">
    <summary class="ep-rev-sum ep-hist-sum">
      <span class="ep-hist-txt"><span class="ep-hist-title">Cobros al equipo</span></span>
      <span class="ep-hist-total">${Number(total).toLocaleString('es-CL')} YC</span>
      <svg class="icn" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </summary>
    <div class="ep-hist-movs">${filas}</div>
  </details>`;
}
function _renderAuditModal(){
  const wrap = document.getElementById('ep-audit-wrap');
  if (!wrap) return;
  // PED1: los cancelados (a mano o reemplazados) no son parte del historial visible.
  const pedidos = (_AUDIT.pedidos || []).filter(p => p.estado !== 'cancelado');
  const tab = AUDIT_TABS.some(t => t[0] === _AUDIT.tab) ? _AUDIT.tab : 'pendiente';
  _AUDIT.tab = tab;
  const cuenta = {
    pendiente: pedidos.filter(p => p.estado === 'pendiente').length,
    aplicado: pedidos.filter(p => p.estado === 'aplicado').length,
    rechazado: pedidos.filter(p => p.estado === 'rechazado').length,
  };
  const delTab = pedidos.filter(p => p.estado === tab);
  const vacio = {
    pendiente: 'No tienes pedidos en revisión.',
    aplicado: 'Todavía no hay pedidos aplicados.',
    rechazado: 'No tienes pedidos rechazados.',
  }[tab];
  const filas = delTab.length ? delTab.map(_filaPedidoHTML).join('')
    : `<div class="ep-hist-vacio">${vacio}</div>`;
  wrap.innerHTML = `
  <div class="ep-overlay" data-onclick="closeIfBackdrop(event,closeAuditModal)">
    <div class="ep-modal wide" role="dialog" aria-modal="true" aria-labelledby="ep-audit-tit">
      <div class="ep-modal-hd">
        <h2 id="ep-audit-tit">Historial de mejoras</h2>
        <button class="ep-modal-close" data-onclick="closeAuditModal()" aria-label="Cerrar">&times;</button>
      </div>
      <div class="ep-modal-body">
        <div class="ep-hist-tabs" role="tablist" aria-label="Estado de los pedidos">
          ${AUDIT_TABS.map(([k, l]) => `<button type="button" role="tab" class="ep-hist-tab" aria-selected="${k === tab ? 'true' : 'false'}" data-onclick="setAuditTab('${k}')">${l}<b>${cuenta[k]}</b></button>`).join('')}
        </div>
        <div class="ep-hist-list" role="tabpanel">${filas}</div>
        ${_filaCobrosHTML()}
      </div>
    </div>
  </div>`;
  actualizarBadgeHistorial(pedidos);
}
function setAuditTab(tab){
  if (!AUDIT_TABS.some(t => t[0] === tab)) return;
  _AUDIT.tab = tab;
  _renderAuditModal();
}
async function openAuditModal(tab){
  const wrap = document.getElementById('ep-audit-wrap');
  if (!wrap) return;
  const seq = ++_auditSeq;
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
    // mismo filtro de temporada que recalcularPresupuestoReal: el total es el de la temporada de cobro
    movimientos = await dbGetAll('coins', c => String(c.teamId) === String(AUTH.teamId)
      && c.season === (COBRO_TEMPORADA ?? STATE.season)
      && typeof c.reason === 'string' && c.reason.indexOf('mejora PES5') === 0);
  } catch (e) { console.warn('[mejoras] coins', e); }
  if (seq !== _auditSeq) return;   // se cerró mientras cargaba
  pedidos.sort((a, b) => _msAudit(b.creadoEn) - _msAudit(a.creadoEn));
  movimientos.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  _AUDIT = {
    tab: (tab === 'aplicado' || tab === 'rechazado') ? tab : 'pendiente',
    pedidos,
    movimientos,
  };
  _renderAuditModal();
}
/* La ventana se cierra con X, tocando fuera o con Esc. */
document.addEventListener('keydown', function(e){
  if (e.key !== 'Escape') return;
  const wrap = document.getElementById('ep-audit-wrap');
  if (wrap && wrap.innerHTML) closeAuditModal();
});
async function cancelarPedidoDesdeHistorial(id){
  if (_bloqueadoPorPausa()) return;
  if (!confirm('¿Cancelar este pedido? No se cobra nada.')) return;
  try {
    await cancelarPedido(id);
    showMiniToast('Pedido cancelado.');
  } catch (e) {
    showMiniToast('No se pudo cancelar: ' + (e && e.message ? e.message : e));
  }
  renderAll();
  openAuditModal(_AUDIT.tab);
}
function actualizarBadgeHistorial(pedidos){
  const el = document.getElementById('ep-hist-badge');
  if (el) el.textContent = (pedidos || []).filter(p => p.estado === 'pendiente').length;
}
function closeAuditModal(){ _auditSeq++; document.getElementById('ep-audit-wrap').innerHTML=''; }
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
let FORM_FLASH = null; // MEJUI-4: jugador que acaba de cambiar (animacion corta de un solo render)
let FORM_BASE = null;     // FORM-4: alineacion con la que se abrio el modal (base del pedido)
let FORM_ABIERTO = false; // FORM-4: el modal de formacion esta abierto (manda el borrador)
// ORD-4: los intercambios de banca del borrador van en FORM.bancaPares (pares de ids, en el orden en que se hicieron).
let _formRaf = 0;     // frame pendiente del render durante el arrastre
let FORM_COORDS_HASTA = 0; // FORM4: hasta cuando se ve «Columna/Fila» despues de mover un punto
let FORM_COORDS_T = 0;     // temporizador que lo esconde
// INTEG: cambio titular↔banca/reserva pendiente de confirmar en el panel de comparacion.
let FORM_CMP = null;  // { slot, entra, prev:{sel,armado,banca,verId} } con el panel abierto
let FORM_CMP_HTML = ''; // ultimo HTML pintado del panel: no se rehace en cada render

function openFormationModal(){
  if (_bloqueadoPorPausa()) return;
  if (PLAYERS.length < FORMATION_COORDS.length){
    showMiniToast('El plantel todavía no tiene 11 jugadores para armar la formación.');
    return;
  }
  FORMATION = formacionVigente();
  FORMATION_NAME = (FORMACION_PUBLICADA && FORMACION_PUBLICADA.nombre) || FORMATION_NAME;
  FORM.draft = JSON.parse(JSON.stringify(FORMATION));
  // Si la formacion publicada es vieja y no trae posiciones, se completan
  // con la primera opcion valida de cada bloque (asi las reglas tienen datos).
  completarPosiciones();
  FORM_BASE = JSON.parse(JSON.stringify(FORM.draft)); FORM_ABIERTO = true;
  FORM.sel = 0;
  FORM.motivo = null;
  FORM_DRAG = null;
  FORM_CMP = null; FORM_CMP_HTML = '';
  _formCmpVisto = false;
  // Sin selección explícita del usuario no hay ficha: FORM.verId queda vacío
  // hasta que toque un jugador del 11 o de la banca/reservas (CMP3).
  FORM.armado = false; FORM.banca = null; FORM.verId = null;
  FORM.bancaOrden = _rosterVigente().slice(11); FORM.bancaPares = [];
  _pitchSyncOrientation();
  _montarModalCancha();
}
/* Arma o rehace el modal con el borrador actual: al abrir y al cambiar la orientacion
   (slice 3d). No reinicia el borrador ni la seleccion. */
function _montarModalCancha(){
  const wrap = document.getElementById('ep-pitch-wrap');
  FORM_CMP_HTML = ''; // el contenedor de la ficha se rehace con el modal: se vuelve a pintar
  _formCmpVisto = false;
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
        <h2>Formación &middot; estrategia</h2>
        <button class="ep-modal-close" data-onclick="closeFormationModal()">&times;</button>
      </div>
      <div class="ep-modal-body">
        <div class="ep-pitch-top">
          <div class="ep-pitch-crest">
            <svg class="icn" viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 8.7 8 9 4.6-.3 8-4 8-9V5l-8-3Z"/></svg>
            ${escHtml(EQUIPO_TSC?.name || 'Tu equipo')} &middot; Alineación
            <span class="ep-pitch-lineup" id="ep-form-lineup" title="Alineación según las líneas en la cancha">${escHtml(_nombreFormacionDraft(FORM.draft))}</span>
            <button type="button" class="ep-pitch-info-btn" data-onclick="openFormationHelp()" aria-label="Cómo usar la formación" title="Cómo usar la formación">
              <span class="ep-pitch-info-ic" aria-hidden="true">
                <svg class="icn" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.9h.01"/></svg>
              </span>
            </button>
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
            <div id="ep-form-coords" class="ep-pitch-coords" hidden></div>
          </div>
        </div>
        <div class="ep-form-lista" id="ep-form-lista">
          <div class="ep-pitch-info">
            <div class="ep-pitch-info-name" id="ep-form-name"></div>
            <div class="ep-pitch-posrow">
              <span class="ep-pitch-info-zone">Posición</span>
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
          <div class="ep-form-bench" id="ep-form-bench" role="group" aria-label="Banca y reservas"></div>
          <div class="ep-form-stats" id="ep-form-stats" hidden></div>
        </div>
      </div>
      <div class="ep-form-swapbar" id="ep-form-swapbar" aria-live="polite" hidden></div>
      <div class="ep-modal-foot">
        <button class="ep-btn" data-onclick="resetFormationDraft()">Restablecer</button>
        <button class="ep-btn" data-onclick="closeFormationModal()">Cancelar</button>
        <button class="ep-btn primary" data-onclick="confirmFormation()">
          <svg class="icn" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>Confirmar</button>
      </div>
    </div>
    <div class="ep-form-help" id="ep-form-help"></div>
  </div>`;
  renderFormationModal();
  _engancharArrastreCampo();
  _formObservarAlto();
}
function closeFormationModal(){
  FORM_ABIERTO = false;
  FORM.bancaOrden = null;
  FORM_CMP = null; FORM_CMP_HTML = '';   // INTEG: la comparacion se va con el modal
  _formCmpVisto = false;
  _formPararCoords();
  renderRoster();
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
/* ================= FORM-2: seleccion, intercambio y ficha completa =================
   Reglas:
   - Tocar un jugador (cancha o lista) lo selecciona y muestra su ficha completa.
   - Con uno seleccionado, tocar otro lo cambia de lugar si la combinacion es valida:
       titular con titular: intercambian lugares (si son porteros, solo entre porteros);
       suplente con titular: el suplente entra en el lugar del titular y este pasa a la banca.
   - El arquero (slot 0) solo se cambia por otro arquero (la Tool valida que el que entra sea portero).
   - Tocar el mismo jugador otra vez no hace nada. «Cancelar» quita la seleccion.
   Estado: FORM.armado (hay un jugador esperando companero), FORM.banca (id del suplente armado
   cuando el primer toque fue en la lista), FORM.verId (jugador de la ficha). */
function _formEsPortero(id){ const p = PLAYER_BY_ID[id]; return !!p && p.primaryPos === 'GK'; }
function _formIdxDeId(id){ return FORM.draft ? FORM.draft.findIndex(s => s.id === id) : -1; }
function _formEsArqueroSlot(i){ return i === 0 || isKeeperSlot(FORM.draft[i]); }
/* Un jugador puede ocupar el lugar i del 11 si ambos son porteros o ninguno lo es. */
function _formLegalEntrada(id, i){
  if (!FORM.draft[i] || _formEnParBanca(id)) return false;
  return _formEsPortero(id) === _formEsArqueroSlot(i);
}
/* Dos titulares del 11 se intercambian si ambos son porteros o ninguno lo es. */
function _formPuedeIntercambiar(a, b){
  return a !== b && !!FORM.draft[a] && !!FORM.draft[b] && _formEsArqueroSlot(a) === _formEsArqueroSlot(b);
}
function intercambiarTitulares(a, b){
  if (_bloqueadoPorPausa()) return;
  const nombre = id => (PLAYER_BY_ID[id] && PLAYER_BY_ID[id].name) || 'Jugador';
  const idA = FORM.draft[a].id, idB = FORM.draft[b].id;
  const tmp = FORM.draft[a].id;
  FORM.draft[a].id = FORM.draft[b].id;
  FORM.draft[b].id = tmp;
  FORM.sel = b; FORM.armado = false; FORM.banca = null; FORM.verId = null; FORM.motivo = null;
  FORM_FLASH = FORM.draft[b].id;
  showMiniToast('Entra ' + nombre(idB) + ', sale ' + nombre(idA));
}
/* El jugador id ocupa el lugar i; el que estaba en ese lugar queda fuera del 11 (banca). */
function _formEntrar(id, i){
  if (_bloqueadoPorPausa()) return;
  const nombre = pid => (PLAYER_BY_ID[pid] && PLAYER_BY_ID[pid].name) || 'Jugador';
  const sale = FORM.draft[i].id;
  _formCambiarEnBanca(id, sale);
  FORM.draft[i].id = id;
  FORM.sel = i; FORM.armado = false; FORM.banca = null; FORM.verId = null; FORM.motivo = null;
  FORM_FLASH = id;
  showMiniToast('Entra ' + nombre(id) + ', sale ' + nombre(sale));
}
/* ORD-4: un jugador con un intercambio de banca en este pedido no entra al 11 hasta deshacerlo. */
function _formEnParBanca(id){ return (FORM.bancaPares || []).some(p => p[0] === id || p[1] === id); }
function _formMensajeIlegal(id){
  if (id && _formEnParBanca(id)){ showMiniToast('Tiene un intercambio de banca en este pedido: deshazlo antes de ponerlo en el 11.'); return; }
  showMiniToast('El arquero solo se cambia por otro arquero.');
}
/* Toque en un jugador del 11 (cancha o lista). Devuelve true si cambio la formacion. */
function formacionTocarTitular(i){
  if (_bloqueadoPorPausa()) return false;
  if (!FORM.draft[i]) return false;
  // 1) hay un suplente armado: entra en este lugar
  if (FORM.banca){
    if (!_formLegalEntrada(FORM.banca, i)){ _formMensajeIlegal(FORM.banca); FORM.verId = FORM.banca; renderFormationModal(); return false; }
    // INTEG: primero se compara (panel SALE/ENTRA); el cambio se aplica al confirmar
    if (_formCmpAbrir(FORM.banca, i)){ renderFormationModal(); return false; }
    _formEntrar(FORM.banca, i); renderFormationModal(); return true;
  }
  // 2) ya estaba marcado este mismo titular: el toque lo desmarca
  if (FORM.armado && FORM.sel === i){
    FORM.armado = false; FORM.motivo = null;
    renderFormationModal();
    return false;
  }
  // 3) hay un titular armado: se intercambian
  if (FORM.armado){
    if (_formPuedeIntercambiar(FORM.sel, i)){ intercambiarTitulares(FORM.sel, i); renderFormationModal(); return true; }
    _formMensajeIlegal();
  }
  // 4) seleccionar: muestra la ficha, marca la fila y abre la franja de cambio
  FORM.sel = i; FORM.armado = true; FORM.banca = null; FORM.verId = FORM.draft[i].id; FORM.motivo = null;
  renderFormationModal();
  return false;
}
/* Toque en un jugador de la lista (data-jugador). Los que estan en el 11 van por formacionTocarTitular. */
function formacionTocarBanca(el){
  if (_bloqueadoPorPausa()) return;
  const id = el && el.dataset ? el.dataset.jugador : null;
  if (!id || !PLAYER_BY_ID[id]) return;
  const i = _formIdxDeId(id);
  if (i >= 0){ formacionTocarTitular(i); return; }
  // CMP2: con la comparación abierta, tocar otro jugador de la banca o reservas
  // cambia solo el que ENTRA (el que SALE sigue siendo el del 11), sin cerrarla.
  if (FORM_CMP){
    if (!_formLegalEntrada(id, FORM_CMP.slot)){ _formMensajeIlegal(id); return; }
    _formCmpAbrir(id, FORM_CMP.slot);
    renderFormationModal();
    return;
  }
  // MEJUI-4: tocar de nuevo al marcado anula la seleccion (igual que «Cancelar»)
  if (FORM.banca === id){ formacionCancelarArmado(); return; }
  // ORD-3: con un suplente o reserva armado, otro suplente o reserva lo intercambia de lugar en la banca
  if (FORM.banca && FORM.banca !== id){ _formSwapBanca(FORM.banca, id); renderFormationModal(); return; }
  // ya hay un titular armado: el suplente entra en su lugar, si la combinacion es valida
  if (FORM.armado && !FORM.banca){
    if (_formLegalEntrada(id, FORM.sel)){
      // INTEG: primero se compara (panel SALE/ENTRA); el cambio se aplica al confirmar
      if (_formCmpAbrir(id, FORM.sel)){ renderFormationModal(); return; }
      _formEntrar(id, FORM.sel); renderFormationModal(); return;
    }
    _formMensajeIlegal(id);
  }
  FORM.banca = id; FORM.armado = true; FORM.verId = id; FORM.motivo = null;
  renderFormationModal();
}
/* ORD-4: intercambio exacto de dos suplentes o reservas en la banca. Cada intercambio es un par [a, b] en
   FORM.bancaPares, en el orden en que se hizo; el pedido lo manda como bancaSwaps y cada par es una linea
   «Banca: X ↔ Y». Deshacer: si el par es el ultimo intercambio hecho, se quita (un swap repetido es su propia
   inversa, asi que la banca vuelve a como estaba). Un par anterior no se quita: quitarlo cambiaria el orden de los
   demas intercambios que se aplican despues. */
function _formSwapBanca(a, b){
  if (_bloqueadoPorPausa()) return;
  const ia = FORM.bancaOrden.indexOf(a), ib = FORM.bancaOrden.indexOf(b);
  if (ia < 0 || ib < 0 || ia === ib) return;
  const ultimo = FORM.bancaPares[FORM.bancaPares.length - 1];
  if (ultimo && ((ultimo[0] === a && ultimo[1] === b) || (ultimo[0] === b && ultimo[1] === a))) FORM.bancaPares.pop();
  else FORM.bancaPares.push([a, b]);
  [FORM.bancaOrden[ia], FORM.bancaOrden[ib]] = [FORM.bancaOrden[ib], FORM.bancaOrden[ia]];
  FORM.banca = null; FORM.armado = false; FORM.verId = null; FORM.motivo = null;
}
/* Cuando un suplente entra al 11, el que sale ocupa su lugar en la banca (igual que la Tool). */
function _formCambiarEnBanca(entra, sale){
  if (!FORM.bancaOrden || !sale) return;
  const i = FORM.bancaOrden.indexOf(entra);
  if (i >= 0) FORM.bancaOrden[i] = sale;
}
function formacionCancelarArmado(){
  FORM.armado = false; FORM.banca = null; FORM.motivo = null;
  FORM.verId = null;   // CMP3: sin selección no queda ficha
  FORM_CMP = null; FORM_CMP_HTML = '';
  _formCmpVisto = false;
  renderFormationModal();
}
/* ================= INTEG: comparar antes de cambiar (ficha CMP2) =================
   Con js/mejoras-cambio.js cargado (window.MEJORAS_CAMBIO), el segundo toque de un
   cambio titular↔banca/reserva ya no aplica el cambio: la ficha que está debajo de
   la banca y las reservas (#ep-form-stats) pasa a la comparación SALE/ENTRA del
   componente, EN LÍNEA (sin velo ni panel flotante), y el cambio se hace al
   confirmar. Si el componente no está cargado, el segundo toque aplica como siempre.
   Mientras la comparación está abierta, FORM_CMP = { slot, entra, prev }:
     slot  lugar del 11 que se cambia
     entra id del jugador de banca o reservas que ocuparía ese lugar
     prev  selección de antes de abrir la comparación (a donde vuelve «Elegir otro») */
function _formCmpDisponible(){
  return !!(window.MEJORAS_CAMBIO && typeof window.MEJORAS_CAMBIO.htmlPanel === 'function'
    && typeof window.MEJORAS_CAMBIO.htmlFicha === 'function');
}
/* Abre la comparación para el cambio entra ↔ draft[slot]. Devuelve true si la abrió;
   en ese caso el cambio NO se aplica todavía. */
function _formCmpAbrir(entra, slot){
  if (!_formCmpDisponible() || !FORM.draft[slot]) return false;
  const sale = FORM.draft[slot].id;
  if (!PLAYER_BY_ID[sale] || !PLAYER_BY_ID[entra]) return false;
  // Si ya hay una comparación abierta (el usuario toca otro jugador de la banca)
  // se conserva la selección original: «Elegir otro» vuelve a donde estaba.
  const prev = FORM_CMP ? FORM_CMP.prev
    : { sel: FORM.sel, armado: FORM.armado, banca: FORM.banca, verId: FORM.verId };
  FORM_CMP = { slot, entra, prev };
  return true;
}
/* Rol del jugador en la ficha (CMP3): 'sale' si está en el 11 (titular, el que
   saldría; rojo) y 'entra' si es de la banca o las reservas (verde). */
function _formRolFicha(p){
  return p && _formIdxDeId(p.id) >= 0 ? 'sale' : 'entra';
}
/* Pinta la tarjeta de #ep-form-stats: la comparación si está abierta; si no, la
   ficha del jugador elegido (mismas piezas que la comparación, a todo el ancho).
   Sin selección explícita no pinta nada y el contenedor queda oculto.
   Solo reescribe si cambió el HTML: así no se reinicia nada en cada render de la cancha.
   Al abrirse la comparación se lleva la tarjeta a la vista con un scroll suave
   (sin animación si el usuario prefiere menos movimiento). */
let _formCmpVisto = false; // en el render anterior ya había comparación abierta
function _formRenderFicha(){
  const cont = document.getElementById('ep-form-stats');
  if (!cont) return;
  const p = FORM.verId ? PLAYER_BY_ID[FORM.verId] : null;
  let html = '';
  let esCmp = false;
  if (FORM_CMP && _formCmpDisponible() && FORM.draft[FORM_CMP.slot]){
    const sale = PLAYER_BY_ID[FORM.draft[FORM_CMP.slot].id];
    const entra = PLAYER_BY_ID[FORM_CMP.entra];
    if (sale && entra){
      html = window.MEJORAS_CAMBIO.htmlPanel(sale, entra, {
        onVolver: 'mejCmpVolver',
        onConfirmar: 'mejCmpConfirmar',
        bloqueado: _pausaSinAviso(),
      });
      esCmp = true;
    }
  }
  if (!html && p){
    html = window.MEJORAS_CAMBIO && typeof window.MEJORAS_CAMBIO.htmlFicha === 'function'
      ? window.MEJORAS_CAMBIO.htmlFicha(p, { ayuda: _formAyudaFicha(), rol: _formRolFicha(p) })
      : _formFichaSimple(p);
  }
  if (html !== FORM_CMP_HTML){
    FORM_CMP_HTML = html;
    cont.innerHTML = html;
  }
  cont.hidden = !html;
  if (esCmp && !_formCmpVisto){
    // block:'nearest': basta con que la tarjeta quede a la vista, sin saltar al tope.
    try {
      const sinAnimacion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      cont.scrollIntoView({ block: 'nearest', behavior: sinAnimacion ? 'auto' : 'smooth' });
    } catch (err) {}
  }
  _formCmpVisto = esCmp;
}
/* Pausa (o cliente viejo) sin lanzar el toast de _bloqueadoPorPausa: la ficha se
   puede VER siempre, pero «Hacer el cambio» queda apagado. */
function _pausaSinAviso(){
  return _pausadasAhora() || _desactualizadoAhora();
}
/* Ayuda corta encima de la ficha de un solo jugador, según lo que está armado. */
function _formAyudaFicha(){
  if (FORM.banca) return 'Toca un titular para que entre en su lugar.';
  if (FORM.armado) return 'Toca otro jugador para intercambiarlo con este.';
  return '';
}
/* Ficha mínima de respaldo si el componente no se cargó (nunca debería pasar en
   el flujo real: mejoras-cambio.js va antes de este archivo). */
function _formFichaSimple(p){
  return '<div class="mc-panel mc-ficha"><div class="mc-fhead"><div class="mc-fid">'
    + '<span class="mc-fname">' + escHtml(p.name) + '</span>'
    + '<span class="mc-fsub">' + escHtml(p.tag || p.primaryPos || '') + '</span>'
    + '</div></div></div>';
}
/* «Elegir otro» de la comparación: la cierra, no cambia nada y deja elegido el
   primer jugador (vuelve a su ficha de un solo jugador). */
function mejCmpVolver(){
  if (!FORM_CMP) return;
  const prev = FORM_CMP.prev;
  FORM_CMP = null; FORM_CMP_HTML = '';
  _formCmpVisto = false;
  FORM.sel = prev.sel; FORM.armado = prev.armado; FORM.banca = prev.banca;
  FORM.verId = prev.verId; FORM.motivo = null;
  renderFormationModal();
}
/* «Hacer el cambio» de la comparación: la cierra y aplica el cambio con la misma
   función del cambio en dos toques (_formEntrar: respeta la regla del arquero y
   bancaSwaps, y avisa «Entra X, sale Y»). */
function mejCmpConfirmar(){
  if (_bloqueadoPorPausa()) return;
  if (!FORM_CMP) return;
  const slot = FORM_CMP.slot, entra = FORM_CMP.entra;
  FORM_CMP = null; FORM_CMP_HTML = '';
  _formCmpVisto = false;
  if (!FORM.draft[slot]){ renderFormationModal(); return; }
  if (!_formLegalEntrada(entra, slot)){ _formMensajeIlegal(entra); renderFormationModal(); return; }
  _formEntrar(entra, slot);
  renderFormationModal();
}
/* Esc = «Elegir otro»: cierra la comparación, no el modal. En captura, para que
   ninguna otra capa lo consuma antes (el resto de la app cierra modales con
   Escape en burbuja). */
document.addEventListener('keydown', function(e){
  if (e.key !== 'Escape' || !FORM_CMP || _formAyudaAbierta()) return;
  e.stopPropagation();
  mejCmpVolver();
}, true);
/* FORM4: Esc cierra solo la ayuda (encima queda la formación tal como estaba). */
document.addEventListener('keydown', function(e){
  if (e.key !== 'Escape' || !_formAyudaAbierta()) return;
  e.preventDefault();
  e.stopPropagation();
  closeFormationHelp();
}, true);
/* Banca y reservas (y la ficha del jugador elegido), en la mitad inferior del modal.
   MEJUI-4: una fila por jugador, con el dorsal y las iniciales de posicion en el color de
   su linea (clases ep-line-*, como el editor); banca en celeste/azul y reservas en verde.
   MEJUI2: los titulares no se repiten acá (están en la cancha).
   Con un jugador marcado, los destinos validos se resaltan (.puede) y el resto se
   atenua (.no), sin bloquear el toque: si no vale, el toast explica por que. */
function _lineaFormacion(p, slot, i){
  if (i === 0 || (slot && slot.pos === 'PT')) return 'gk';
  return PITCH_POS_LINEA[slot && slot.pos] || LINEA_POS[p.primaryPos] || 'mid';
}
function _formRenderBancaYPanel(){
  const bancaEl = document.getElementById('ep-form-bench');
  const armadoId = FORM.banca || (FORM.armado && FORM.draft[FORM.sel] ? FORM.draft[FORM.sel].id : null);
  // INTEG: con un TITULAR elegido, cada jugador de banca o reservas que puede entrar
  // muestra a la derecha la diferencia de promedio (componente MEJORAS_CAMBIO).
  const MC = _formCmpDisponible() ? window.MEJORAS_CAMBIO : null;
  const titular = (MC && FORM.armado && !FORM.banca && FORM.draft[FORM.sel])
    ? PLAYER_BY_ID[FORM.draft[FORM.sel].id] : null;
  if (bancaEl){
    const secs = _seccionesPlantel();
    const fila = (p, seccion) => {
      const i = _formIdxDeId(p.id);
      const slot = i >= 0 ? FORM.draft[i] : null;
      const linea = _lineaFormacion(p, slot, i);
      const cod = (slot && slot.pos) || CODIGO_POS[p.primaryPos] || p.primaryPos || '';
      const dorsal = p.dorsal && p.dorsal !== '?' ? '#' + p.dorsal : '';
      const puede = !armadoId || p.id === armadoId || (
        FORM.banca
          ? (i >= 0 ? _formLegalEntrada(FORM.banca, i) : true)
          : (i >= 0 ? _formPuedeIntercambiar(FORM.sel, i) : _formLegalEntrada(p.id, FORM.sel)));
      const cls = ['ep-form-subbtn', 'es-' + seccion, i >= 0 ? 'en11' : '',
        p.id === FORM.verId ? 'ver' : '', p.id === armadoId ? 'armado' : '',
        armadoId && !puede ? 'no' : '', armadoId && puede && p.id !== armadoId ? 'puede' : '',
        FORM_FLASH === p.id ? 'flash' : ''].filter(Boolean).join(' ');
      const delta = (titular && i < 0 && puede && p.id !== titular.id)
        ? `<span class="ep-form-cmpd">${MC.htmlDelta(titular, p)}</span>` : '';
      return `<button type="button" class="${cls}" data-onclick="formacionTocarBanca(this)"
        data-jugador="${escAttr(p.id)}" title="${escAttr(p.name)}" aria-pressed="${p.id === armadoId ? 'true' : 'false'}">
        <span class="ep-form-num ep-line-${linea}${dorsal ? '' : ' vacia'}">${dorsal ? escHtml(dorsal) : ''}</span>
        <span class="ep-form-subname">${escHtml(p.name)}</span>
        <span class="ep-form-cod ep-line-${linea}">${escHtml(cod)}</span>${delta}
      </button>`;
    };
    // MEJUI2: abajo de la cancha va solo la banca y los reservas (los titulares ya están
    // en la cancha y se tocan ahí): así la lista de cambios queda a la vista en la mitad
    // inferior de la pantalla.
    const grupos = [['suplente', 'Banca'], ['reserva', 'Reservas']];
    bancaEl.innerHTML = grupos.map(([sec, titulo]) => {
      const ids = _rosterVisible().filter(id => secs[id] === sec && PLAYER_BY_ID[id]);
      if (!ids.length) return '';
      return `<div class="ep-form-grp">${titulo}</div>` + ids.map(id => fila(PLAYER_BY_ID[id], sec)).join('');
    }).join('') || '<span class="ep-form-subnone">Sin jugadores en el plantel.</span>';
  }
  _formRenderFicha();
}
/* Ficha del jugador: la arma js/mejoras-cambio.js (htmlFicha / htmlPanel), la misma
   tarjeta para la ficha de un jugador y para la comparación SALE/ENTRA. */

function _formProgramarRender(){
  if (_formRaf) return;
  _formRaf = requestAnimationFrame(() => { _formRaf = 0; renderFormationModal(); });
}
function _formPointerDown(e){
  if (e.button !== 0 || FORM_DRAG || FORM_CMP) return;
  if (_bloqueadoPorPausa()) return;   // PAUSA-2: con la pausa no se mueve ningun jugador
  const campo = e.currentTarget;
  let mejor = -1, mejorDist = Infinity;
  FORM.draft.forEach((slot, i) => {
    const c = _centroPunto(campo, slot);
    const d = Math.hypot(c.x - e.clientX, c.y - e.clientY);
    if (d < mejorDist){ mejorDist = d; mejor = i; }
  });
  if (mejor < 0 || mejorDist > FORM_RADIO_TOQUE) return; // toque lejos de los puntos: no hace nada
  // FORM-2: el toque decide (seleccionar, intercambiar o entrar). Si cambio la formacion, no hay arrastre.
  if (formacionTocarTitular(mejor)) return;
  // INTEG: si ese toque abrio el panel de comparacion, el gesto termina aca (no hay arrastre).
  if (FORM_CMP) return;
  const slot = FORM.draft[mejor];
  const c = _centroPunto(campo, slot);
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
  // PAUSA-2: si la pausa empieza con un arrastre en curso, el gesto se corta (un solo aviso).
  if (_bloqueadoPorPausa()){ FORM_DRAG = null; return; }
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
    return `<div class="ep-pitch-dot ${isSel?'me':''} ${isKeeperSlot(slot)?'gk':''} ${arrastrando?'dragging':''} ${FORM_FLASH===slot.id?'flash':''}"
      style="left:${xPct}%;top:${yPct}%;" title="${escHtml(pl.name)}">
      ${isSel?`<span class="ep-pitch-tag">${label}</span>`:''}
    </div>`;
  }).join('');
  document.getElementById('ep-pitch-dots').innerHTML = dots;

  _formRenderBancaYPanel();

  // MEJUI-4: franja fija con la instruccion del cambio y «Cancelar». Reservada: solo
  // aparece mientras hay un jugador marcado, asi no cambia el alto del resto al tocar.
  // FORM4: con la comparación abierta sobra (ya tiene «Elegir otro» y «Hacer el cambio»).
  const bar = document.getElementById('ep-form-swapbar');
  if (bar){
    const armadoId = FORM_CMP ? null
      : (FORM.banca || (FORM.armado && FORM.draft[FORM.sel] ? FORM.draft[FORM.sel].id : null));
    if (!armadoId){ bar.hidden = true; bar.innerHTML = ''; }
    else {
      const nom = (PLAYER_BY_ID[armadoId] && PLAYER_BY_ID[armadoId].name) || 'Jugador';
      const texto = FORM.banca
        ? `Entra ${nom}: elige a quién reemplaza`
        : `Cambiar a ${nom}: elige quién entra`;
      bar.hidden = false;
      bar.innerHTML = `<span class="ep-form-swaptxt">${escHtml(texto)}</span>
        <button type="button" class="ep-btn" data-onclick="formacionCancelarArmado()">Cancelar</button>`;
    }
  }

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
    ? 'Arquero (posición fija)'
    : PITCH_ZONE_BY_KEY[pitchThird(slot.x)].label;
  // FORM4: la columna y la fila son una etiqueta chica que se ve solo mientras se
  // mueve o se ajusta el punto (arrastre, cruz o flechas del teclado). No ocupa lugar.
  _formPintarCoords(slot);
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
  FORM_FLASH = null; // la animacion corre una sola vez en este render
  _formAjustarAlto();
}

/* ================= Slice 3d: alto de la cancha (solo vertical; la ficha va debajo, dentro del scroll) ================= */
const FORM_CAMPO_MAX = 520;      // px: la cancha no crece mas que esto
const FORM_CAMPO_MIN = 230;      // la cancha no baja de aca; si el modal es mas bajo, el modal se desplaza

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
/* MEJUI2: alto de la cancha vertical. La cancha ocupa algo menos de la mitad superior de
   la pantalla del celular y la lista de banca/reservas se queda con el resto, con su
   propio scroll (ver .ep-form-lista). Horizontal: sin alto fijo. */
function _formAjustarAlto(){
  const wrap = document.getElementById('ep-pitch-wrap');
  const body = wrap && wrap.querySelector('.ep-modal-body');
  const campo = document.getElementById('ep-pitch-field');
  if (!body || !campo) return;
  if (!PITCH_VERTICAL){ campo.style.removeProperty('--campo-h'); return; }
  campo.style.removeProperty('--campo-h');
  const cs = getComputedStyle(body);
  const pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
  const gap = parseFloat(cs.rowGap) || 10;
  const util = body.clientHeight - pad;
  // Lo que no es la cancha arriba (franja del equipo y ayuda), con sus separaciones.
  const top = campo.parentElement;
  const topEls = top ? [...top.children].filter(el => el !== campo) : [];
  const otrosTop = topEls.reduce((s, el) => s + el.offsetHeight, 0);
  const gapTop = parseFloat(top ? getComputedStyle(top).rowGap : 0) || gap;
  const gapsTop = Math.max(0, top ? top.children.length - 1 : 0) * gapTop;
  // Unos 44% del alto de la pantalla; el tope evita que la lista quede sin espacio en
  // pantallas muy bajas (en un telefono normal no recorta la cancha).
  const altoPantalla = window.innerHeight || body.clientHeight || 640;
  const topePorLista = util - otrosTop - gapsTop - gap - 60;
  const h = Math.max(FORM_CAMPO_MIN, Math.min(FORM_CAMPO_MAX, Math.floor(altoPantalla * 0.44), Math.floor(topePorLista)));
  campo.style.setProperty('--campo-h', h + 'px');
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
  for (const pos of PITCH_POS_BANDA) if ((cuenta[pos] || 0) > 1) return `no puede haber dos ${pos} en la formación`;
  for (const [pos, max] of Object.entries(PITCH_POS_MAX)) if ((cuenta[pos] || 0) > max) return `máximo ${max} ${pos}`;
  for (const [l, max] of Object.entries(PITCH_LINEA_MAX)) if (porLinea[l] > max) return `máximo ${max} ${PITCH_LINEA_NOMBRE[l]}`;
  for (const [l, min] of Object.entries(PITCH_LINEA_MIN)) if (porLinea[l] < min) return `mínimo ${min} ${PITCH_LINEA_NOMBRE[l]}`;
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
  if (_bloqueadoPorPausa()) return;
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
  _formAvisarCoords(); // FORM4: al ajustar la posición también se ve la columna/fila un momento
  renderFormationModal();
}
/* ================= FORM4: etiqueta «Columna/Fila» y ayuda del (i) =================
   La columna y la fila dejan de ocupar una franja fija: se ven solo mientras se
   mueve o se ajusta el punto (arrastre en curso, cruz o flechas del teclado) y se
   van solas a los ~1,6 s. La ayuda larga pasa a un modal que abre el (i) del
   encabezado (mismo estilo de modal del editor). */
function _formCoordsVisibles(){
  return !!((FORM_DRAG && FORM_DRAG.activo) || FORM_COORDS_HASTA > Date.now());
}
function _formPararCoords(){
  if (FORM_COORDS_T){ clearTimeout(FORM_COORDS_T); FORM_COORDS_T = 0; }
  FORM_COORDS_HASTA = 0;
}
function _formPintarCoords(slot){
  const el = document.getElementById('ep-form-coords');
  if (!el) return;
  const ver = !!slot && _formCoordsVisibles();
  el.hidden = !ver;
  if (ver) el.textContent = `Columna ${slot.x}/${PITCH_COLS} · Fila ${slot.y}/${PITCH_ROWS}`;
}
/* Un movimiento con la cruz o el teclado muestra la etiqueta un momento. */
function _formAvisarCoords(){
  FORM_COORDS_HASTA = Date.now() + 1600;
  if (FORM_COORDS_T) clearTimeout(FORM_COORDS_T);
  FORM_COORDS_T = setTimeout(() => {
    FORM_COORDS_T = 0; FORM_COORDS_HASTA = 0;
    _formPintarCoords(FORM.draft[FORM.sel]);
  }, 1700);
}
function _formAyudaAbierta(){
  const el = document.getElementById('ep-form-help');
  return !!(el && el.innerHTML);
}
function openFormationHelp(){
  const el = document.getElementById('ep-form-help');
  if (!el) return;
  el.innerHTML = `
  <div class="ep-overlay ep-help-velo" data-onclick="closeIfBackdrop(event,closeFormationHelp)">
    <section class="ep-modal ep-help-modal" role="dialog" aria-modal="true" aria-labelledby="ep-help-tit">
      <div class="ep-modal-hd">
        <h2 id="ep-help-tit">Cómo usar la formación</h2>
        <button class="ep-modal-close" data-onclick="closeFormationHelp()" aria-label="Cerrar">&times;</button>
      </div>
      <div class="ep-modal-body">
        <ul class="ep-help-list">
          <li>Toca un jugador del 11 y después a quién entra (o al revés): queda marcado.</li>
          <li>Toca otra vez al marcado, o «Cancelar», para anular el cambio.</li>
          <li>Antes de cambiar ves la comparación: «Hacer el cambio» la confirma.</li>
          <li>Las flechas ‹ › cambian de jugador y el selector «Posición» ajusta su puesto.</li>
          <li>Arrastra un punto para moverlo por la cancha. El arquero no se mueve.</li>
        </ul>
      </div>
      <div class="ep-modal-foot">
        <button class="ep-btn primary" id="ep-help-listo" data-onclick="closeFormationHelp()">Entendido</button>
      </div>
    </section>
  </div>`;
  const listo = document.getElementById('ep-help-listo');
  if (listo) listo.focus();
}
function closeFormationHelp(){
  const el = document.getElementById('ep-form-help');
  if (el) el.innerHTML = '';
}
function selectFormationPlayer(i){ FORM.sel = i; renderFormationModal(); }
/* FORM4: la flecha ‹ › mueve la única selección de la formación. Con la
   comparación abierta, la comparación pasa al titular nuevo si ese cambio es
   legal (arquero solo por portero); si no, se cierra y queda la ficha del
   titular con un aviso corto. En pausa se puede mirar, pero no se arma nada. */
function _formIrATitular(i){
  const slot = FORM.draft && FORM.draft[i];
  if (!slot) return;
  FORM.sel = i;
  FORM.verId = slot.id;
  FORM.motivo = null;
  if (FORM_CMP){
    if (_formLegalEntrada(FORM_CMP.entra, i)){
      // La comparación sigue al titular elegido y «Elegir otro» deja armado a ese
      // mismo titular (no al que estaba cuando se abrió la comparación).
      const armado = !_pausaSinAviso();
      FORM_CMP = { slot: i, entra: FORM_CMP.entra, prev: { sel: i, armado, banca: null, verId: slot.id } };
      FORM.armado = armado; FORM.banca = null;
      return;
    }
    const entra = PLAYER_BY_ID[FORM_CMP.entra];
    const sale = PLAYER_BY_ID[slot.id];
    FORM_CMP = null; FORM_CMP_HTML = '';
    _formCmpVisto = false;
    FORM.armado = !_pausaSinAviso(); FORM.banca = null;
    showMiniToast(`${(entra && entra.name) || 'Ese jugador'} no puede reemplazar a ${(sale && sale.name) || 'ese titular'}.`);
    return;
  }
  FORM.armado = !_pausaSinAviso();
  FORM.banca = null;
}
function cycleFormationPlayer(delta){
  const n = (FORM.draft && FORM.draft.length) || 0;
  if (!n) return;
  _formIrATitular((FORM.sel + delta + n) % n);
  renderFormationModal();
}
/* Mueve el jugador seleccionado a la celda (x, y) como un solo cambio. Devuelve
   true si quedo ahi. Si no, deja el jugador donde estaba, guarda el motivo en
   FORM.motivo y muestra el toast (salvo {silencioso:true}, que usa el arrastre:
   ese muestra un solo toast al soltar). No renderiza: lo hace quien llama. */
function moveFormationDotTo(x, y, opciones){
  if (_bloqueadoPorPausa()) return false;
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
    const linea = { def:'La defensa', mid:'El mediocampo', att:'El ataque' }[pitchThird(nx)] || 'Esa línea';
    return fallo(`${linea} ya tiene el máximo de jugadores.`);
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
  if (moveFormationDotTo(slot.x + dx, slot.y + dy)) _formAvisarCoords();
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
  if (_bloqueadoPorPausa()) return;
  FORM.draft = JSON.parse(JSON.stringify(formacionVigente()));
  FORM.bancaOrden = _rosterVigente().slice(11); FORM.bancaPares = []; FORM.banca = null; FORM.armado = false;
  FORM.verId = null;   // CMP3: restablecer también quita la ficha
  completarPosiciones();
  renderFormationModal();
  showMiniToast('Formación restablecida a la del save.');
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
  if (_bloqueadoPorPausa()) return;
  FORMATION = JSON.parse(JSON.stringify(FORM.draft));
  const error = validarFormacion(FORMATION);
  if (error){ showMiniToast('Formación inválida: ' + error + '.'); return; }
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
  // ORD-4: sin cambio de titulares no sale la linea «Formacion»; la banca viaja como pares (bancaSwaps) y sus lineas
  const base = FORM_BASE || FORMATION;
  const titularesCambian = base.some((s, i) => !FORMATION[i] || s.id !== FORMATION[i].id || s.x !== FORMATION[i].x || s.y !== FORMATION[i].y || s.pos !== FORMATION[i].pos);
  const lineasBanca = FORM.bancaPares.map(([a, b]) => ({ label: 'Banca', from: '', to: `${PLAYER_BY_ID[a].name} ↔ ${PLAYER_BY_ID[b].name}` }));
  const lineasPedido = [...(titularesCambian ? _lineasFormacion(base, FORMATION, nombre) : []), ...lineasBanca];
  const bancaSwaps = FORM.bancaPares.flatMap(([a, b]) => [PES5_PLANTILLA.registroDeId(a), PES5_PLANTILLA.registroDeId(b)]);
  const extraBanca = bancaSwaps.length ? { bancaSwaps } : {};
  try {
    await firebase.firestore().collection('pedidos_pes5').add({
      uid: AUTH.user.uid,
      teamId: String(AUTH.teamId),
      teamName: EQUIPO_TSC?.name || null,
      pes5Club: EQUIPO_TSC?.pes5Club || null,
      tipo: 'formacion',
      cliente: MEJORAS_CLIENTE,
      pes5ClubIdx: EQUIPO_TSC ? EQUIPO_TSC.pes5ClubIdx : null,
      formacion: { nombre, slots },
      lines: lineasPedido,
      totalCost: 0,
      estado: 'pendiente',
      creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
      ...extraBanca,
    });
    FORMATION_NAME = nombre;
    // presentacion: la formacion recien enviada ya cuenta como pendiente (aviso y globito)
    APP.pendientes.push({ _id: 'local-' + Date.now(), tipo: 'formacion', formacion: { nombre, slots }, lines: lineasPedido, estado: 'pendiente', ...extraBanca });
    renderPending();
    closeFormationModal();
    showMiniToast('Formación enviada. La Tool la aplica al save.');
  } catch(e) {
    console.warn('[editor] pedido de formacion', e);
    await _avisarErrorPedido(e, 'No se pudo enviar la formación: ');
  }
}
document.addEventListener('keydown', function(e){
  const wrap = document.getElementById('ep-pitch-wrap');
  if(!wrap || !wrap.innerHTML) return;
  if(_formAyudaAbierta()) return;   // FORM4: con la ayuda abierta, las teclas son de la ayuda
  if(FORM_CMP) return;   // INTEG: con el panel de comparacion abierto, las teclas son del panel
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
  if (_bloqueadoPorPausa()) return;
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
  if (_bloqueadoPorPausa()) return;
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
  if (_bloqueadoPorPausa()) return;
  const p = currentPlayer();
  APP.hint = MAIN_BY_KEY[key].d;
  _pintarHint(APP.hint);
  const cur = APP.draft.stats[key];
  if(delta>0){
    if(cur>=99){ renderRows(); return; }
    const topeM = motivoTopeSubida(p.stats[key], cur+1);
    if(topeM){ showMiniToast(topeM); renderRows(); return; }
    if(!canAfford(costoPuntoPres(key, cur+1))){ showMiniToast('Saldo insuficiente — no puedes superar el total de YunaCoins disponibles.'); renderRows(); return; }
    APP.draft.stats[key] = cur+1;
  }else{
    if(cur<=(ADMIN_EMBED ? 0 : p.stats[key])){ renderRows(); return; }
    APP.draft.stats[key] = cur-1;
  }
  renderRows(); renderCart();
}
function adjustSec(key,delta){
  if (_bloqueadoPorPausa()) return;
  const p = currentPlayer();
  const def = SEC_NEW.find(s=>s.k===key);
  APP.hint = def.d;
  _pintarHint(APP.hint);
  const cur = APP.draft.sec[key];
  const max = def.sc===99 ? 99 : 8;
  if(delta>0){
    if(cur>=max){ renderRows(); return; }
    if(def.sc===99){
      const topeM = motivoTopeSubida(p.sec[key], cur+1);
      if(topeM){ showMiniToast(topeM); renderRows(); return; }
    }
    const nextCost = def.sc===99 ? costoPuntoPres(key, cur+1) : RULES.scale8Cost;
    if(!canAfford(nextCost)){ showMiniToast('Saldo insuficiente — no puedes superar el total de YunaCoins disponibles.'); renderRows(); return; }
    APP.draft.sec[key] = cur+1;
  }else{
    if(cur<=(ADMIN_EMBED ? (def.sc===99 ? 0 : 1) : p.sec[key])){ renderRows(); return; }
    APP.draft.sec[key] = cur-1;
  }
  renderRows(); renderCart();
}
function adjustInjury(delta){
  if (_bloqueadoPorPausa()) return;
  const p = currentPlayer();
  APP.hint = INJ_DEF.d;
  _pintarHint(APP.hint);
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
  if (_bloqueadoPorPausa()) return;
  const p = currentPlayer();
  // Marca la fila como seleccionada igual que adjustMain/adjustSec: la fila activa
  // se decide comparando APP.hint con la descripcion de la fila.
  const ab = ABILITY_BY_KEY[key];
  if(ab){ APP.hint = ab.d; _pintarHint(ab.d); }
  if(p.abilities[key] && !ADMIN_EMBED){ renderRows(); return; } // ya comprada antes, no se puede "vender" (el admin si puede quitarla)
  if(!APP.draft.abilities[key] && !p.abilities[key] && !canAfford(RULES.abilityCost)){
    showMiniToast('Saldo insuficiente — no puedes superar el total de YunaCoins disponibles.'); renderRows(); return;
  }
  APP.draft.abilities[key] = !APP.draft.abilities[key];
  renderRows(); renderCart();
}
function togglePosition(key){
  if (_bloqueadoPorPausa()) return;
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
    if(on && key === d.primaryPos){ showMiniToast('Es la posición natural: primero elige otra como natural.'); return; }
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
  // MEJUI2: la linea fija sigue a la posicion que se toca (la estrella corta el burbujeo).
  const pos = POS_BY_KEY[key];
  if (pos){
    APP.posSel = key;
    APP.hint = key === d.primaryPos ? 'Posición natural del jugador.'
      : (d.positions[key] ? 'Posición secundaria. Usa «Hacer principal» para que sea la natural.'
                          : 'Posición disponible para este jugador (sin costo en YunaCoins).');
    _pintarHint(APP.hint);
  }
  renderCard(); renderRows(); renderCart();
}
/* MEJUI2: tocar el nombre de una posición abre su descripción y deja «Hacer principal»
   en la línea fija de abajo (solo si está marcada y no es la natural). */
function mejVerPosicion(key){
  const pos = POS_BY_KEY[key];
  if (!pos) return;
  const d = APP.draft;
  APP.posSel = key;
  APP.hint = key === d.primaryPos ? 'Posición natural del jugador.'
    : (d.positions[key] ? 'Posición secundaria. Usa «Hacer principal» para que sea la natural.'
                        : 'Posición disponible para este jugador (sin costo en YunaCoins).');
  _pintarHint(APP.hint);
  renderRows();
}
// El save de PES5 guarda un solo bit para el pie dominante: derecho o izquierdo. No existe "ambos".
const FOOT_LABEL = { D: 'Der.', I: 'Izq.' };
const SIDE_LABEL = { D: 'Der.', I: 'Izq.', A: 'Ambas' };
function setFavFoot(v){
  if (_bloqueadoPorPausa()) return;
  APP.draft.favfoot = v;
  renderCard(); renderRows(); renderCart(); // la tarjeta muestra el pie elegido y el boton de guardar se reevalua
}
function setSide(v){
  if (_bloqueadoPorPausa()) return;
  APP.draft.side = v;
  renderCard(); renderRows(); renderCart();
}
function setPrimaryPos(k){
  if (_bloqueadoPorPausa()) return;
  if(!APP.draft.positions[k]) return;
  APP.draft.primaryPos = k;
  APP.posSel = k;
  APP.hint = 'Posición natural del jugador.';
  _pintarHint(APP.hint);
  renderCard(); renderRows(); renderCart();
}

function starSvg(on){
  return `<svg class="icn star ${on?'on':''}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>`;
}

/* ================= render: filas por pagina ================= */

/* PES5-TOPE-1: tope de atributos (0-99) de la temporada actual del juego. null = sin tope. */
let TOPE_TEMPORADA = null;

async function cargarTopeTemporada(){
  try {
    const seasons = await dbGetAll('seasons');
    const info = YUNACOINS_RULES.temporadaActualDelJuego(seasons, STATE.season);
    return info ? YUNACOINS_RULES.topeAtributo(info.ordinal, RULES.topesAtributo) : null;
  } catch(e) {
    console.warn('[mejoras] no se pudo leer el tope de temporada', e);
    return null;
  }
}

/* Mensaje si subir de `original` a `nuevo` supera el tope de temporada; null si está permitido.
   Un atributo que ya está por encima del tope (leyenda) conserva su valor, pero no sube. */
function motivoTopeSubida(original, nuevo){
  if(TOPE_TEMPORADA==null || typeof original!=='number' || !(nuevo > original) || !(nuevo > TOPE_TEMPORADA)) return null;
  return original >= TOPE_TEMPORADA
    ? 'Tope de temporada ' + TOPE_TEMPORADA + ': este atributo ya está en ' + original + ' y no puede subir.'
    : 'Tope de temporada ' + TOPE_TEMPORADA + ': no puede pasar de ' + TOPE_TEMPORADA + '.';
}

function numericRowHTML(label,desc,value,min,max,colorFn,onDec,onInc,locked,affordNext,costSoFar){
  const color = colorFn(value);
  const pct = Math.round(value/max*100);
  const decDisabled = locked || value<=(ADMIN_EMBED ? (max===8 ? 1 : 0) : min);
  // PES5-TOPE-1: el tope de temporada bloquea subir (y muestra el motivo en la fila)
  const topeM = motivoTopeSubida(min, value+1);
  const incDisabled = locked || value>=max || !affordNext || !!topeM;
  const sel = APP.hint===desc;
  const cambiada = value !== min; // min = valor original del jugador: si cambio, la fila se resalta
  const tono = cambiada ? 'var(--gold)' : color; // fila cambiada: valor y barra en dorado
  const costBadge = costSoFar>0 ? `<span class="ep-rcost-row">+${costSoFar.toLocaleString('es-CL')}</span>` : '';
  const viejo = cambiada ? `<span class="ep-rold">${min}</span>` : '';
  // MEJUI-1: la descripcion ya no vive dentro de la fila; va en la linea fija de abajo (#ep-hint).
  // El aviso de tope de temporada se conserva: es un estado, no la descripcion del atributo.
  const aviso = topeM ? `<div class="ep-rdesc" style="color:var(--gold);">${escHtml(topeM)}</div>` : '';
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
    ${aviso}
  </div>`;
}

/* Presentacion (2.0-3c): etiquetas completas de la propuesta.
   MEJUI-1: el juego no agrupa los atributos por rol, asi que la pagina Principales
   los lista seguidos, en el orden de siempre (PAGE1_STATS). Solo cambia lo que se
   muestra; las claves (k) y MAIN_STATS siguen igual. */
const ETIQUETA_FILA = {atk:'Ataque', def:'Defensa', equ:'Equilibrio', res:'Resistencia', vm:'Vel. máxima', ace:'Aceleración',
  rsp:'Respuesta', agi:'Agilidad', pcd:'Prec. conducción', vcd:'Vel. conducción', ppc:'Prec. pase corto', vpc:'Vel. pase corto',
  ppl:'Prec. pase largo', vpl:'Vel. pase largo', pre:'Precisión', pot:'Potencia', ted:'Téc. de disparo'};

function renderRows(){
  const p = currentPlayer();
  const d = APP.draft;
  const wrap = document.getElementById('ep-rows');
  let html = '';

  if(APP.page===1){
    html = PAGE1_STATS.map(s => {
      const k = s.k;
      const v = d.stats[k];
      const afford = v>=99 || canAfford(costoPuntoPres(k, v+1));
      const cost = v>p.stats[k] ? costoStatPres(k, p.stats[k], v) : 0;
      return numericRowHTML(ETIQUETA_FILA[k] || s.l, s.d, v, p.stats[k], 99, val=>TIER_COLOR[tierClass99(val)],
        `adjustMain('${k}',-1)`, `adjustMain('${k}',1)`, false, afford, cost);
    }).join('');
  }

  if(APP.page===2){
    html += ECHO_KEYS.map(k=>{
      const s = MAIN_BY_KEY[k]; const v = d.stats[k];
      const afford = v>=99 || canAfford(costoPuntoPres(k, v+1));
      const cost = v>p.stats[k] ? costoStatPres(k, p.stats[k], v) : 0;
      return numericRowHTML(s.l, s.d, v, p.stats[k], 99, val=>TIER_COLOR[tierClass99(val)],
        `adjustMain('${k}',-1)`, `adjustMain('${k}',1)`, false, afford, cost);
    }).join('');
    html += SEC_NEW.map(s=>{
      if(s.sc===99){
        const v = d.sec[s.k];
        const afford = v>=99 || canAfford(costoPuntoPres(s.k, v+1));
        const cost = v>p.sec[s.k] ? costoStatPres(s.k, p.sec[s.k], v) : 0;
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

  // MEJUI2: la fila solo muestra la descripción (linea fija); la estrella grande es el
  // control que agrega o quita la habilidad. Misma lógica y costo que siempre (toggleAbility).
  function abilityRow(a){
    const on = d.abilities[a.k];
    const boughtBefore = p.abilities[a.k];
    const canToggle = boughtBefore || on || canAfford(RULES.abilityCost);
    const etiqueta = `${on ? 'Quitar' : 'Agregar'} ${a.l}`;
    return `<div class="ep-row ep-hab ${APP.hint===a.d?'sel':''} ${on?'on':''} ${(!on&&!canToggle)?'locked':''}" data-onclick="setHint('${jsq(a.d)}')">
      <div class="ep-rlabel ep-hab-nombre">${escHtml(a.l)}</div>
      <button type="button" class="ep-hab-estrella ${on?'on':''}" aria-pressed="${on?'true':'false'}" aria-label="${escAttr(etiqueta)}" title="${escAttr(etiqueta)}" data-onclick="event.stopPropagation();toggleAbility('${a.k}')">${starSvg(on)}</button>
    </div>`;
  }
  function padRow(){ return `<div class="ep-row pad"><div class="ep-rlabel">&mdash;</div></div>`; }

  if(APP.page===3){
    html = ALL_ABILITIES.map(abilityRow).join('');
  }
  if(APP.page===4){
    // MEJUI2: una sola estrella grande por fila (sin interruptores). El código va en el
    // color de su línea, el nombre al centro y «Principal» junto a la estrella cuando es
    // la posición natural. La principal no se quita: togglePosition lo impide.
    html = POSITIONS.map(pos=>{
      const on = d.positions[pos.k];
      const isRegistered = pos.k === d.primaryPos;
      const linea = LINEA_POS[pos.k] || 'mid';
      const codigo = CODIGO_POS[pos.k] || pos.k;
      const etiqueta = `${on ? 'Quitar' : 'Agregar'} ${pos.l}`;
      const sel = APP.posSel === pos.k;
      const principal = isRegistered
        ? '<span class="ep-pos-principal">Principal</span>'
        : '';
      return `<div class="ep-row ep-pos ${on?'on':''} ${sel?'sel':''}" data-onclick="mejVerPosicion('${pos.k}')">
        <span class="ep-pos-code ep-line-${linea}" aria-hidden="true">${escHtml(codigo)}</span>
        <div class="ep-rlabel ep-pos-nombre">${escHtml(pos.l)}</div>
        <span class="ep-pos-lado">${principal}<button type="button" class="ep-pos-star ${on?'on':''}" aria-pressed="${on?'true':'false'}"
          aria-label="${escAttr(etiqueta)}" title="${escAttr(etiqueta)}" data-onclick="event.stopPropagation();togglePosition('${pos.k}')">${starSvg(on)}</button></span>
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

  wrap.classList.toggle('ep-rows-hab', APP.page===3);
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
  _pintarHint(APP.hint);
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
  if (!ADMIN_EMBED) await _volverAPlantillaPublicada();
}
/* FIX-CANCEL: lo que se mostro al enviar (valores del jugador, alineacion) salia de la copia en memoria.
   Al cancelar se vuelve a leer la plantilla publicada, se rehace el borrador y se redibuja, sin recargar. */
async function _volverAPlantillaPublicada(){
  try { await cargarPlantillaReal(AUTH.teamId, EQUIPO_TSC.pes5ClubIdx); }
  catch(e){ console.warn('[mejoras] plantilla publicada', e); }
  _carritoValidar(); // CARRO1: si la plantilla cambio, los borradores viejos ya no sirven
  loadDraft();
  renderAll();
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
    : (e.gratis ? 'Edición gratis · no se cobra a ' + (e.name || '') : 'Sin presidente · edición libre, sin cobro');
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
  TOPE_TEMPORADA = (typeof m.topeAtributo === 'number') ? m.topeAtributo : null;
  EQUIPO_TSC = m.equipo;
  PLAYERS = (m.jugadores || []).map(j => jugadorDesdePlantillaReal(j, { teamName: m.equipo.name }));
  PLAYER_BY_ID = Object.fromEntries(PLAYERS.map(p => [p.id, p]));
  APP.budget = { general: m.presupuesto.general, subscribers: m.presupuesto.subscribers };
  APP.saldo = m.presupuesto.saldo || 0;
  // slice 2.1-A: el aviso grande necesita lo gastado, el tope extra y lo que reservan otros cambios
  APP.gastado = { general: (m.gastado && m.gastado.general) || 0, sub: (m.gastado && m.gastado.sub) || 0 };
  APP.pend = m.pendientesOtros || { total: 0, general: 0, sub: 0 };
  APP.extra = m.extra || 0;
  APP.motivo = m.motivo || '';
  APP.playerId = m.jugadorId;
  APP.page = 1;
  APP.hint = 'Selecciona un atributo para ver su descripción.';
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

// BLOQ-1: el latido y el observador son del uid que los arranco (_bloqUid). Si la sesion cambia
// (cierre de sesion, otra cuenta en la misma pestana), dejan de correr: nunca renuevan el bloqueo a nombre de otro.
let _bloqUid = null;
let _bloqTeamLatido = null;
function _alSalirPagina(){
  if (_bloqUid && _bloqTeamLatido != null) PES5_BLOQUEO.liberar(_bloqTeamLatido, _bloqUid).catch(() => {});
}
// Pausa por inactividad (BLOQ-1 ampliado): sin clic, tecla ni cambio de input durante
// PES5_BLOQUEO.INACTIVIDAD_MS, el bloqueo se libera y la edicion queda pausada (lo armado se conserva en pantalla).
let _bloqInact = null, _ultimaActividad = 0, _pausadoInactividad = false;
function _marcarActividad(){ if (!_pausadoInactividad) _ultimaActividad = Date.now(); }
function _quitarPausa(){
  const el = document.getElementById('mej-pausa');
  if (el) el.remove();
}
function _mostrarPausa(){
  if (document.getElementById('mej-pausa')) return;
  const el = document.createElement('div');
  el.id = 'mej-pausa';
  el.className = 'mej-pausa';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = `<div class="mej-pausa-box">
      <p>Tu edición se pausó por inactividad. Vuelve a entrar para seguir.</p>
      <button type="button" class="ep-btn primary" data-onclick="volverAEntrarPresidente()">Volver a entrar</button>
    </div>`;
  document.body.appendChild(el);
}
// La pausa: se libera el bloqueo y se cortan latido y observador. No se toca lo armado en pantalla.
async function _pausarPorInactividad(){
  if (_pausadoInactividad || !_bloqUid) return;
  _pausadoInactividad = true;
  _pausarIntervalos();
  _mostrarPausa();
  try { await PES5_BLOQUEO.liberar(_bloqTeamLatido, _bloqUid); } catch (e) { console.warn('[mejoras] no se pudo liberar el bloqueo por inactividad', e); }
}
function _revisarInactividad(){
  if (_pausadoInactividad || !_bloqUid) return;
  if (Date.now() - _ultimaActividad >= PES5_BLOQUEO.INACTIVIDAD_MS) _pausarPorInactividad();
}
// Boton «Volver a entrar»: vuelve a tomar el bloqueo si el equipo esta libre.
async function volverAEntrarPresidente(){
  if (!AUTH.user || AUTH.teamId == null) return;
  if (_bloqUid && AUTH.user.uid !== _bloqUid) return;
  const bq = await tomarBloqueoPresidente();
  if (!bq.ok){ _quitarPausa(); _pausadoInactividad = false; mostrarBloqueoActivo(bq.de); return; }
  _pausadoInactividad = false;
  _bloqUid = AUTH.user.uid;
  _bloqTeamLatido = AUTH.teamId;
  _ultimaActividad = Date.now();
  _quitarPausa();
  _arrancarIntervalos();
}
window.volverAEntrarPresidente = volverAEntrarPresidente;
// Al volver a la pestaña: si la edicion no estaba pausada, se revisa la inactividad y se re-toma el bloqueo si esta libre.
async function _alCambiarVisibilidad(){
  if (document.visibilityState !== 'visible' || !_bloqUid) return;
  _revisarInactividad();
  if (_pausadoInactividad) return;
  try {
    const r = await PES5_BLOQUEO.tomar(_bloqTeamLatido, 'presidente', _bloqUid, _bloqNombre());
    if (!r.ok) mostrarBloqueoActivo(r.de);
  } catch (e) {}
}
function _pausarIntervalos(){
  if (_bloqLatido){ clearInterval(_bloqLatido); _bloqLatido = null; }
  if (_bloqObs){ try { _bloqObs(); } catch (e) {} _bloqObs = null; }
}
function _arrancarIntervalos(){
  if (!_bloqLatido){
    // mientras la pagina esta visible se renueva el bloqueo; oculta, vence solo a los 3 minutos
    _bloqLatido = setInterval(async () => {
      // Otra sesion (o sin sesion): el latido se apaga y no renueva nada.
      if (!AUTH.user || AUTH.user.uid !== _bloqUid || AUTH.teamId !== _bloqTeamLatido){ _detenerBloqueoPresidente(); return; }
      if (document.visibilityState !== 'visible' || _pausadoInactividad) return;
      try {
        const r = await PES5_BLOQUEO.latir(_bloqTeamLatido, 'presidente', _bloqUid, _bloqNombre());
        if (!r.ok) mostrarBloqueoActivo(r.de);
      } catch (e) {}
    }, PES5_BLOQUEO.LATIDO_MS);
  }
  if (!_bloqInact) _bloqInact = setInterval(_revisarInactividad, 10000);
  if (!_bloqObs){
    // si el admin toma el equipo mientras el presidente esta adentro, se lo bloquea al instante
    try {
      _bloqObs = PES5_BLOQUEO.observar(_bloqTeamLatido, (d) => {
        if (!AUTH.user || AUTH.user.uid !== _bloqUid) return;
        if (d && PES5_BLOQUEO.vivo(d) && d.uid !== _bloqUid) mostrarBloqueoActivo(d);
      });
    } catch (e) {}
  }
}
function _detenerBloqueoPresidente(){
  _pausarIntervalos();
  if (_bloqSondeo){ clearInterval(_bloqSondeo); _bloqSondeo = null; }
  if (_bloqInact){ clearInterval(_bloqInact); _bloqInact = null; }
  window.removeEventListener('pagehide', _alSalirPagina);
  ['click', 'keydown', 'input', 'change'].forEach(ev => document.removeEventListener(ev, _marcarActividad, true));
  document.removeEventListener('visibilitychange', _alCambiarVisibilidad);
  _quitarPausa();
  _pausadoInactividad = false;
  _bloqUid = null;
  _bloqTeamLatido = null;
}
function iniciarLatidoPresidente(){
  if (_bloqUid || !AUTH.user || AUTH.teamId == null) return;
  _bloqUid = AUTH.user.uid;
  _bloqTeamLatido = AUTH.teamId;
  _pausadoInactividad = false;
  _ultimaActividad = Date.now();
  window.addEventListener('pagehide', _alSalirPagina);
  ['click', 'keydown', 'input', 'change'].forEach(ev => document.addEventListener(ev, _marcarActividad, true));
  document.addEventListener('visibilitychange', _alCambiarVisibilidad);
  _arrancarIntervalos();
}
// BLOQ-1: se llama ANTES de cerrar sesion (auth.js): libera el bloqueo del presidente mientras las reglas
// todavia lo dejan, y corta latido y observador.
window.bloqueoPresidenteSoltar = async function bloqueoPresidenteSoltar(){
  const uid = _bloqUid, tid = _bloqTeamLatido;
  _detenerBloqueoPresidente();
  if (uid && tid != null){
    try { await PES5_BLOQUEO.liberar(tid, uid); } catch (e) { console.warn('[mejoras] no se pudo liberar el bloqueo al salir', e); }
  }
};

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

/* ================= PAUSA-1: pausa de mejoras (lectura en vivo, sin recargar) =================
   Luis pausa las mejoras mientras edita el save (pes5_config/pausa). Con la pausa el editor queda
   en solo lectura (PAUSA-2): aviso arriba y ninguna funcion que modifique el borrador, la
   formacion, la banca o mande un pedido hace su trabajo. Al reanudar se habilita solo.
   El servidor tambien rechaza el pedido (regla de create). */
let PAUSA = null;      // { pausado } de pes5_config/pausa; null hasta leerlo
let _pausaUnsub = null;
const MSG_PAUSA = 'Mejoras pausadas: Luis está actualizando el juego. Puedes mirar, pero no editar.';
/* MINVER: minimo de cliente que exige el servidor (pes5_config/app.minCliente). null hasta
   leerlo; si no hay documento, no hay minimo. Se lee en vivo, igual que la pausa. */
let MIN_CLIENTE = null;
let _versionUnsub = null;
const MSG_ACTUALIZA = 'Tu app está desactualizada. Actualízala para hacer mejoras.';
function _desactualizadoAhora(){
  return !ADMIN_EMBED && Number.isInteger(MIN_CLIENTE) && MEJORAS_CLIENTE < MIN_CLIENTE;
}
/* MINVER: si el pedido falla con permission-denied y el servidor tiene minimo configurado, el
   motivo es un cliente viejo (el servidor ya no acepta su `cliente`); se avisa de la actualizacion
   en vez de mostrar el error crudo de Firestore. Si todavia no se leyo el minimo, se reintenta
   leerlo una vez para no depender de que el snapshot haya llegado. */
async function _avisarErrorPedido(e, prefijo){
  const code = String((e && (e.code || (e.cause && e.cause.code))) || '');
  const permiso = code.indexOf('permission-denied') >= 0;
  if (permiso && MIN_CLIENTE == null && typeof firebase !== 'undefined'){
    try {
      const s = await firebase.firestore().collection('pes5_config').doc('app').get();
      const v = s.exists ? Number(s.data().minCliente) : null;
      if (Number.isInteger(v)){ MIN_CLIENTE = v; aplicarPausa(); }
    } catch (err) { /* sin lectura: queda el error generico */ }
  }
  showMiniToast(MIN_CLIENTE != null && permiso ? MSG_ACTUALIZA : prefijo + (e?.message || e));
}
function _pausadasAhora(){ return !ADMIN_EMBED && !!(PAUSA && PAUSA.pausado); }
/* PAUSA-2 / MINVER: punto de control unico. Devuelve true (y avisa con el toast) cuando la accion
   queda bloqueada por la pausa o porque el cliente es mas viejo que el minimo del servidor. Se
   llama al inicio de toda funcion que modifique el borrador del jugador, la formacion, la
   alineacion o la banca, o que mande un pedido. En la Tool del admin no aplica ninguno de los dos:
   _pausadasAhora() y _desactualizadoAhora() ya devuelven false con ADMIN_EMBED. */
function _bloqueadoPorPausa(){
  if (_desactualizadoAhora()){
    showMiniToast(MSG_ACTUALIZA);
    return true;
  }
  if (!_pausadasAhora()) return false;
  showMiniToast(MSG_PAUSA);
  return true;
}
function iniciarPausa(){
  if (ADMIN_EMBED || _pausaUnsub || typeof firebase === 'undefined') return;
  try {
    _pausaUnsub = firebase.firestore().collection('pes5_config').doc('pausa').onSnapshot(
      s => { PAUSA = { pausado: !!(s.exists && s.data().pausado === true) }; aplicarPausa(); },
      e => console.warn('[mejoras] pausa', e));
  } catch (e) { console.warn('[mejoras] pausa', e); }
}
/* MINVER: lee el minimo del servidor y deja el editor en solo lectura si este cliente no llega. */
function iniciarVersion(){
  if (ADMIN_EMBED || _versionUnsub || typeof firebase === 'undefined') return;
  try {
    _versionUnsub = firebase.firestore().collection('pes5_config').doc('app').onSnapshot(
      s => {
        const v = s.exists ? Number(s.data().minCliente) : null;
        MIN_CLIENTE = Number.isInteger(v) ? v : null;
        aplicarPausa();
      },
      e => console.warn('[mejoras] version minima', e));
  } catch (e) { console.warn('[mejoras] version minima', e); }
}
function aplicarPausa(){
  const pausado = _pausadasAhora();
  const viejo = _desactualizadoAhora();
  const bloqueado = pausado || viejo;
  const raiz = _raiz();
  if (raiz) raiz.classList.toggle('ep-pausado', bloqueado);
  let av = document.getElementById('ep-pausa-aviso');
  if (!bloqueado){ if (av) av.hidden = true; return; }
  if (!av){
    av = document.createElement('div');
    av.id = 'ep-pausa-aviso';
    av.className = 'ep-pausa-aviso';
    // PAUSA-2: arriba del layout y fuera de las dos vistas del telefono, asi el aviso se ve
    // igual mirando la plantilla o el editor de un jugador.
    const shell = document.getElementById('ep-shell');
    const layout = shell && shell.querySelector('.ep-layout');
    if (layout && layout.parentNode) layout.parentNode.insertBefore(av, layout);
    else if (shell && shell.firstChild) shell.insertBefore(av, shell.firstChild);
    else return;   // el editor todavia no esta montado
  }
  av.hidden = false;
  if (viejo){
    // MINVER: mismo mecanismo que la pausa (solo lectura), con la salida a la web, donde
    // apk-promo/updater avisan de la actualizacion de la APK.
    av.innerHTML = `<svg class="icn" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg><span>${escHtml(MSG_ACTUALIZA)}</span><a class="ep-btn" href="index.html" style="margin-left:auto;text-decoration:none">Volver al inicio</a>`;
    return;
  }
  av.innerHTML = `<svg class="icn" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg><span>${escHtml(MSG_PAUSA)}</span>`;
}

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

function _alCambiarAuthPresidente(){ renderAuthUI(); _montarBarraSave(); }

/* SAVE-1: barra «Descargar save» (solo en mejoras.html; en el panel no existe el contenedor). */
function _montarBarraSave(){
  if (typeof SAVE_PUBLICADO === 'undefined') return;
  SAVE_PUBLICADO.montarBarra(document.getElementById('mej-save-pub'));
}

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
    aplicarPausa(); // PAUSA-2: si ya estaba pausado al montar, el aviso y el solo lectura quedan puestos
  }
}

/* Modo admin: borrador del jugador abierto, con la misma forma que entrega onAplicar. */
function borrador(){
  if (!ADMIN_EMBED || !APP.draft) return null;
  const p = currentPlayer();
  if (!p) return null;
  const d = APP.draft;
  return { jugadorId: p.id, draft: { stats: d.stats, sec: d.sec, abilities: d.abilities, positions: d.positions, primaryPos: d.primaryPos, side: d.side, height: d.height, favfoot: d.favfoot, age: d.age } };
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
  iniciarPausa();
  iniciarVersion();
  _montarBarraSave();
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
window.closeFormationHelp = closeFormationHelp;
window.closeIfBackdrop = closeIfBackdrop;
window.commitChanges = commitChanges;
window.confirmFormation = confirmFormation;
window.confirmarSolicitarEmparejar = confirmarSolicitarEmparejar;
window.cycleFormationPlayer = cycleFormationPlayer;
window.discardChanges = discardChanges;
window.gotoPage = gotoPage;
window.moveFormationDot = moveFormationDot;
window.openApplyConfirm = openApplyConfirm;
window.openReviewAll = openReviewAll;
window.commitCarrito = commitCarrito;
window.toggleRevisionTodo = toggleRevisionTodo;
window.setAuditTab = setAuditTab;
window.descartarCarrito = descartarCarrito;
window.descartarCarritoJugador = descartarCarritoJugador;
window.openAuditModal = openAuditModal;
window.openFormationModal = openFormationModal;
window.openFormationHelp = openFormationHelp;
window.renderRoster = renderRoster;
window.resetFormationDraft = resetFormationDraft;
window.selectFormationPlayer = selectFormationPlayer;
window.solicitarEmparejar = solicitarEmparejar;
window.selectPlayer = selectPlayer;
window.mejVerPosicion = mejVerPosicion;
window.hacerPrincipal = setPrimaryPos;
window.setFavFoot = setFavFoot;
window.setFormationPos = setFormationPos;
window.formacionTocarBanca = formacionTocarBanca;
window.formacionCancelarArmado = formacionCancelarArmado;
// INTEG: handlers por NOMBRE del panel de comparacion (data-onclick del componente)
window.mejCmpVolver = mejCmpVolver;
window.mejCmpConfirmar = mejCmpConfirmar;
window.moveFormationScreen = moveFormationScreen;
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

return { montar: montar, desmontar: desmontar, borrador: borrador };
})();
