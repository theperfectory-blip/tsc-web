/* ============================================================
   Comparar antes de cambiar — componente aparte (slice CMP).

   Panel que muestra, antes de confirmar un cambio en la formación, al
   jugador que SALE contra el que ENTRA. No toca el DOM ni Firestore:
   solo calcula y arma HTML. Lo conecta la página (mejoras-page.js) cuando
   el coordinador lo cablee.

   Se expone:
     window.MEJORAS_CAMBIO = { promedio, delta, htmlDelta, htmlPanel }

   Forma del jugador (la MISMA que usa js/mejoras-page.js para la formación:
   la que arman mkPlayer() y PES5_PLANTILLA.jugadorParaEditor()). Solo se
   leen estos campos:
     name        string  — nombre visible
     dorsal      string|number — número de camiseta ('' si no tiene)
     tag         string  — etiqueta de su posición principal (p. ej. "Portero")
     primaryPos  string  — código PES5 de su posición principal (GK, CB, …)
     stats       { atk,def,equ,res,vm,ace,rsp,agi,pcd,vcd,ppc,vpc,ppl,vpl,
                   pre,pot,ted,psf,efe,cab,sal,tec,agr }  — 23 atributos 0–99
     sec         { ment,cons,gk,teq,cond,wff,wfa,inj }    — secundarios;
                   ment/gk/teq son 1–99; cons/cond/wff/wfa son 1–8; inj es
                   una letra (C/B/A)
     positions   { CF:true, SS:false, …, GK:false }       — posiciones marcadas
     abilities   { dribbling:true, …, longThrow:false }   — habilidades que tiene

   Las listas de nombres (estadísticas, posiciones y habilidades) replican
   las de js/mejoras-page.js (MAIN_STATS, POSITIONS, ALL_ABILITIES) porque
   ese archivo va en IIFE y no las exporta. Si allá cambia un nombre, hay
   que cambiarlo también acá.
   ============================================================ */
window.MEJORAS_CAMBIO = (function(){
'use strict';

/* Atributos que entran en el promedio y que se comparan fila por fila.
   «src» dice de qué objeto del jugador se lee (stats o sec).
   Solo atributos numéricos 1–99: los secundarios de escala 1–8
   (cons, cond, wff, wfa) y la resistencia a lesiones (inj, letra) quedan
   fuera porque no se pueden comparar en la misma escala. */
const ATRIBUTOS = [
  { k:'atk', l:'Ataque',              src:'stats' },
  { k:'def', l:'Defensa',             src:'stats' },
  { k:'equ', l:'Equilibrio',          src:'stats' },
  { k:'res', l:'Resistencia',         src:'stats' },
  { k:'vm',  l:'Vel. máxima',         src:'stats' },
  { k:'ace', l:'Aceleración',         src:'stats' },
  { k:'rsp', l:'Respuesta',           src:'stats' },
  { k:'agi', l:'Agilidad',            src:'stats' },
  { k:'pcd', l:'Prec. conducción',    src:'stats' },
  { k:'vcd', l:'Vel. conducción',     src:'stats' },
  { k:'ppc', l:'Prec. p.c.',          src:'stats' },
  { k:'vpc', l:'Vel. p.c.',           src:'stats' },
  { k:'ppl', l:'Prec. p.l.',          src:'stats' },
  { k:'vpl', l:'Vel. p.l.',           src:'stats' },
  { k:'pre', l:'Precisión',           src:'stats' },
  { k:'pot', l:'Potencia',            src:'stats' },
  { k:'ted', l:'Tec. disp',           src:'stats' },
  { k:'psf', l:'Prec. saq. fta.',     src:'stats' },
  { k:'efe', l:'Efecto',              src:'stats' },
  { k:'cab', l:'Cabezazo',            src:'stats' },
  { k:'sal', l:'Salto',               src:'stats' },
  { k:'tec', l:'Técnica',             src:'stats' },
  { k:'agr', l:'Agresividad',         src:'stats' },
  { k:'ment', l:'Mentalidad',             src:'sec' },
  { k:'gk',   l:'Cualidades de portero',  src:'sec' },
  { k:'teq',  l:'Trabajo en equipo',      src:'sec' },
];

/* Posiciones del juego, en el orden de la página «Posiciones» del editor.
   «linea» decide el color del chip: portero amarillo, defensa azul,
   mediocampo verde, ataque rojo. */
const POSICIONES = [
  { k:'CF',  l:'Delantero centro',         linea:'att' },
  { k:'SS',  l:'Segundo delantero',        linea:'att' },
  { k:'WG',  l:'Extremo',                  linea:'att' },
  { k:'AMF', l:'Mediapunta',               linea:'mid' },
  { k:'SMF', l:'Volante',                  linea:'mid' },
  { k:'CMF', l:'Centrocampista central',   linea:'mid' },
  { k:'WB',  l:'Lateral',                  linea:'def' },
  { k:'DMF', l:'Centrocampista defensivo', linea:'mid' },
  { k:'SB',  l:'Carrilero',                linea:'def' },
  { k:'CB',  l:'Central',                  linea:'def' },
  { k:'CWP', l:'Líbero',                   linea:'def' },
  { k:'GK',  l:'Portero',                  linea:'gk'  },
];

/* Habilidades especiales, en el orden de bits del juego (igual que
   ALL_ABILITIES en mejoras-page.js). Solo se muestran las que tiene. */
const HABILIDADES = [
  { k:'dribbling',       l:'Regate' },
  { k:'dribbleKeeping',  l:'Habilidades de regate' },
  { k:'positioning',     l:'Cap. posic.' },
  { k:'reaction',        l:'Reacción' },
  { k:'playmaker',       l:'Cap. mando' },
  { k:'passing',         l:'Pase' },
  { k:'striker',         l:'Hab. goleadora' },
  { k:'oneVOneShoot',    l:'Hab. gol. 1 a 1' },
  { k:'postPlayer',      l:'Hab. jugador poste' },
  { k:'linePos',         l:'Líneas' },
  { k:'midRange',        l:'Disparos medios' },
  { k:'side',            l:'Lado' },
  { k:'center',          l:'Centro' },
  { k:'pkKick',          l:'Hab. lanza penaltis' },
  { k:'oneTouchPass',    l:'Hab. pase 1 toque' },
  { k:'outside',         l:'Exterior' },
  { k:'manMarkClose',    l:'Marcar hombre' },
  { k:'sliding',         l:'Hab. deslizándose' },
  { k:'manMark',         l:'Marcaje' },
  { k:'dfLine',          l:'Ctrl. línea defensa' },
  { k:'pkKeeper',        l:'Hab. portero penaltis' },
  { k:'oneVOneKeeper',   l:'Hab. port 1 a 1' },
  { k:'longThrow',       l:'Hab. saque largo' },
];

/* ---------- lectura de valores ---------- */

/* Número válido o null (no convierte null/'' en 0). */
function _num(v){
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
/* Valor de un atributo del jugador, o null si no lo tiene. */
function _valor(jugador, atr){
  if (!jugador) return null;
  const grupo = jugador[atr.src];
  return grupo ? _num(grupo[atr.k]) : null;
}
/* Atributos numéricos 1–99 que sí trae el jugador. */
function _valores(jugador){
  const out = [];
  for (const atr of ATRIBUTOS){
    const v = _valor(jugador, atr);
    if (v != null) out.push(v);
  }
  return out;
}

/* ---------- cálculos ---------- */

/* Promedio entero de los atributos numéricos 1–99 (23 de stats + ment/gk/teq
   de sec). Sin atributos devuelve 0. */
function promedio(jugador){
  const vals = _valores(jugador);
  if (!vals.length) return 0;
  let suma = 0;
  for (const v of vals) suma += v;
  return Math.round(suma / vals.length);
}

/* entra - sale, sobre los promedios. */
function delta(sale, entra){
  return promedio(entra) - promedio(sale);
}

/* Pastilla con el promedio del que entra y la diferencia: «78 (+4)». */
function htmlDelta(sale, entra){
  const d = delta(sale, entra);
  const clase = d > 0 ? 'mc-up' : (d < 0 ? 'mc-down' : 'mc-eq');
  const signo = d > 0 ? '+' + d : (d < 0 ? String(d) : '0');
  return '<span class="mc-delta ' + clase + '">' + promedio(entra) + ' (' + signo + ')</span>';
}

/* ---------- piezas del panel ---------- */

/* Ancho de la barra: los atributos son 0–99. */
function _pct(v){
  if (v == null) return 0;
  return Math.max(0, Math.min(100, v / 99 * 100));
}

/* Una fila: valor del que sale, barra hacia la izquierda, nombre al centro,
   barra hacia la derecha y valor del que entra. Se resalta el mayor. */
function _fila(atr, sale, entra){
  const a = _valor(sale, atr);
  const b = _valor(entra, atr);
  const bestA = a != null && b != null && a > b ? ' mc-best' : '';
  const bestB = b != null && a != null && b > a ? ' mc-best' : '';
  const txtA = a == null ? '—' : String(a);
  const txtB = b == null ? '—' : String(b);
  return '<div class="mc-row">'
    + '<span class="mc-val mc-val-out' + bestA + '">' + txtA + '</span>'
    + '<span class="mc-bar mc-bar-out" aria-hidden="true"><i style="width:' + _pct(a).toFixed(1) + '%"></i></span>'
    + '<span class="mc-lbl">' + escHtml(atr.l) + '</span>'
    + '<span class="mc-bar mc-bar-in" aria-hidden="true"><i style="width:' + _pct(b).toFixed(1) + '%"></i></span>'
    + '<span class="mc-val mc-val-in' + bestB + '">' + txtB + '</span>'
    + '</div>';
}

/* Posiciones marcadas del jugador (si no hay marcas, la principal). */
function _posiciones(jugador){
  const out = [];
  if (!jugador) return out;
  const marcadas = jugador.positions || null;
  for (const p of POSICIONES){
    if (marcadas && marcadas[p.k]) out.push(p);
  }
  if (!out.length && jugador.primaryPos){
    const principal = POSICIONES.find(p => p.k === jugador.primaryPos);
    if (principal) out.push(principal);
  }
  return out;
}

/* Chips de posiciones, con el color de su línea. */
function _chipsPosiciones(jugador){
  const pos = _posiciones(jugador);
  if (!pos.length) return '<span class="mc-none">—</span>';
  return pos.map(p =>
    '<li class="mc-pos mc-pos-' + p.linea + '" title="' + escHtml(p.l) + '">' + escHtml(p.k) + '</li>'
  ).join('');
}

/* Chips de las habilidades que tiene ('' si no tiene ninguna). */
function _chipsHabilidades(jugador){
  const tiene = jugador && jugador.abilities ? jugador.abilities : null;
  if (!tiene) return '';
  return HABILIDADES
    .filter(a => tiene[a.k])
    .map(a => '<li class="mc-hab">' + escHtml(a.l) + '</li>')
    .join('');
}

/* Etiqueta de posición para el encabezado: usa la del editor si viene; si no,
   el nombre largo de la posición principal. */
function _metaJugador(jugador){
  if (!jugador) return '—';
  let pos = '';
  if (jugador.tag) pos = String(jugador.tag);
  else {
    const p = POSICIONES.find(x => x.k === jugador.primaryPos);
    pos = p ? p.l : '';
  }
  const dorsal = jugador.dorsal == null || jugador.dorsal === '' ? '' : ' · #' + jugador.dorsal;
  return pos + dorsal;
}

/* Columna del encabezado (SALE o ENTRA). */
function _lado(jugador, clase, rotulo){
  const nombre = jugador && jugador.name != null ? String(jugador.name) : '—';
  return '<div class="mc-side mc-side-' + clase + '">'
    + '<span class="mc-tag">' + escHtml(rotulo) + '</span>'
    + '<span class="mc-name">' + escHtml(nombre) + '</span>'
    + '<span class="mc-meta">' + escHtml(_metaJugador(jugador)) + '</span>'
    + '</div>';
}

/* Botón con handler por NOMBRE de función global: data-onclick="nombre()".
   Se valida el nombre (js/events.js solo resuelve window[nombre]); si no es
   un identificador válido, el botón queda sin handler en vez de romper. */
function _boton(texto, nombre, clase){
  const n = nombre == null ? '' : String(nombre).trim();
  // La llamada se arma en dos pasos, y el atributo se pega en su forma compacta
  // ('+llamada+'): audit-wiring (sección 1b) lo lee como handler armado en runtime,
  // no como código escrito dentro del HTML.
  const llamada = /^[A-Za-z_$][\w$]*$/.test(n) ? n + '()' : '';
  const attr = llamada ? ' data-onclick="'+llamada+'"' : '';
  return '<button type="button" class="mc-btn' + (clase || '') + '"' + attr + '>' + escHtml(texto) + '</button>';
}

/* ---------- panel completo ---------- */

/* HTML del panel. opciones = { onVolver:'fnGlobal', onConfirmar:'fnGlobal' }:
   los dos handlers son NOMBRES de funciones globales que se escriben como
   data-onclick (nunca onclick). */
function htmlPanel(sale, entra, opciones){
  const op = opciones || {};

  const filas = ATRIBUTOS.map(atr => _fila(atr, sale, entra)).join('');

  const habSale = _chipsHabilidades(sale);
  const habEntra = _chipsHabilidades(entra);
  const colHab = (habSale || habEntra)
    ? '<section class="mc-col mc-col-hab">'
      + '<h3 class="mc-col-hd">Habilidades</h3>'
      + (habSale ? '<div class="mc-pl"><span class="mc-pl-tag mc-pl-out">Sale</span>'
          + '<ul class="mc-list mc-list-hab">' + habSale + '</ul></div>' : '')
      + (habEntra ? '<div class="mc-pl"><span class="mc-pl-tag mc-pl-in">Entra</span>'
          + '<ul class="mc-list mc-list-hab">' + habEntra + '</ul></div>' : '')
      + '</section>'
    : '';

  return '<section class="mc-panel" role="dialog" aria-label="Comparar antes de cambiar">'
    + '<div class="mc-grip" aria-hidden="true"></div>'
    + '<header class="mc-head">'
      + _lado(sale, 'out', 'SALE')
      + '<div class="mc-swap" aria-hidden="true">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M4 8h13"/><path d="m14 4 4 4-4 4"/><path d="M20 16H7"/><path d="m10 12-4 4 4 4"/>'
        + '</svg>'
      + '</div>'
      + _lado(entra, 'in', 'ENTRA')
    + '</header>'
    + '<div class="mc-deltaline">' + htmlDelta(sale, entra) + '</div>'
    + '<div class="mc-stats">' + filas + '</div>'
    + '<div class="mc-foot">'
      + '<section class="mc-col">'
        + '<h3 class="mc-col-hd">Posiciones</h3>'
        + '<div class="mc-pl"><span class="mc-pl-tag mc-pl-out">Sale</span>'
          + '<ul class="mc-list mc-list-pos">' + _chipsPosiciones(sale) + '</ul></div>'
        + '<div class="mc-pl"><span class="mc-pl-tag mc-pl-in">Entra</span>'
          + '<ul class="mc-list mc-list-pos">' + _chipsPosiciones(entra) + '</ul></div>'
      + '</section>'
      + colHab
    + '</div>'
    + '<div class="mc-actions">'
      + _boton('Elegir otro', op.onVolver, '')
      + _boton('Hacer el cambio', op.onConfirmar, ' mc-btn-go')
    + '</div>'
    + '</section>';
}

return { promedio: promedio, delta: delta, htmlDelta: htmlDelta, htmlPanel: htmlPanel };
})();
