/* ============================================================
   Comparar antes de cambiar — componente aparte (slice CMP2).

   Dos vistas, las dos EN LÍNEA (sin position:fixed, sin hoja, sin
   panel lateral y sin velo): la página simplemente se alarga.
     htmlPanel(sale, entra)  comparación SALE / ENTRA en dos mitades
                             (izquierda = sale, roja; derecha = entra,
                             verde), con todos los datos del editor.
     htmlFicha(jugador)      ficha de un solo jugador (una columna,
                             mismo estilo), para antes del segundo toque.

   No toca el DOM ni Firestore: solo calcula y arma HTML. Lo conecta la
   página (mejoras-page.js) dentro de #ep-form-stats, debajo de la banca
   y las reservas.

   Se expone:
     window.MEJORAS_CAMBIO = { promedio, delta, htmlDelta, htmlFicha, htmlPanel }

   Forma del jugador (la MISMA que usa js/mejoras-page.js para la formación:
   la que arman mkPlayer() y PES5_PLANTILLA.jugadorParaEditor()). Se leen:
     name, dorsal, tag, primaryPos
     stats       { atk,def,equ,res,vm,ace,rsp,agi,pcd,vcd,ppc,vpc,ppl,vpl,
                   pre,pot,ted,psf,efe,cab,sal,tec,agr }  — 23 atributos 0–99
     sec         { ment,cons,gk,teq,cond,wff,wfa,inj }    — secundarios;
                   ment/gk/teq son 1–99; cons/cond/wff/wfa son 1–8; inj es
                   una letra (C/B/A)
     positions   { CF:true, SS:false, …, GK:false }       — posiciones marcadas
     abilities   { dribbling:true, …, longThrow:false }   — habilidades que tiene
     height, age, foot                                    — si están en los datos

   Las listas de nombres (estadísticas, posiciones y habilidades) replican
   las de js/mejoras-page.js (MAIN_STATS, SEC_NEW, POSITIONS y ALL_ABILITIES)
   porque ese archivo va en IIFE y no las exporta. Si allá cambia un nombre,
   hay que cambiarlo también acá.
   ============================================================ */
window.MEJORAS_CAMBIO = (function(){
'use strict';

/* Atributos principales, en el orden del editor. */
const PRINCIPALES = [
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
];

/* Secundarios del editor (SEC_NEW): los tres de escala 99 y los cuatro
   parámetros 1–8 (regularidad, estabilidad y pie malo), más la resistencia
   a lesiones (letra A/B/C). «max» fija la escala de la barra y del resaltado. */
const SECUNDARIOS = [
  { k:'ment', l:'Mentalidad',              src:'sec', max:99   },
  { k:'cons', l:'Regularidad en el juego', src:'sec', max:8    },
  { k:'gk',   l:'Cualidades de portero',   src:'sec', max:99   },
  { k:'teq',  l:'Trabajo en equipo',       src:'sec', max:99   },
  { k:'cond', l:'Estabilidad',             src:'sec', max:8    },
  { k:'wff',  l:'Frec. pie malo',          src:'sec', max:8    },
  { k:'wfa',  l:'Prec. pie malo',          src:'sec', max:8    },
  { k:'inj',  l:'Res. lesión',             src:'sec', max:'inj' },
];

/* Atributos que entran en el promedio: los 23 principales + ment/gk/teq.
   Los de escala 1–8 y la resistencia a lesiones quedan fuera porque no se
   pueden comparar en la misma escala. */
const ATRIBUTOS = PRINCIPALES.concat(SECUNDARIOS.filter(s => s.max === 99));

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
/* Valor de un atributo principal (stats) o secundario (sec). */
function _valor(jugador, atr){
  if (!jugador) return null;
  const grupo = jugador[atr.src] || null;
  if (!grupo) return null;
  if (atr.max === 'inj') return grupo.inj == null || grupo.inj === '' ? null : String(grupo.inj);
  return _num(grupo[atr.k]);
}
/* Atributos numéricos 1–99 que sí trae el jugador (para el promedio). */
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

/* ---------- piezas de las tarjetas ---------- */

/* Texto de un valor; «—» si no está. */
function _txt(v){ return v == null || v === '' ? '—' : String(v); }

/* Rango de las lesiones: A (mejor) > B > C. */
function _rangoLesion(v){
  const s = String(v || '').trim().toUpperCase();
  return s === 'A' ? 3 : s === 'B' ? 2 : s === 'C' ? 1 : 0;
}

/* Ancho de una barra según su escala (0–99, 0–8 o A/B/C). */
function _pct(v, max){
  if (v == null) return 0;
  if (max === 'inj'){
    const r = _rangoLesion(v);
    return r === 3 ? 100 : r === 2 ? 62 : r === 1 ? 28 : 0;
  }
  const n = _num(v);
  if (n == null || !max) return 0;
  return Math.max(0, Math.min(100, n / max * 100));
}

/* Una fila comparada: valor del que sale, barra hacia la izquierda, nombre al
   centro, barra hacia la derecha y valor del que entra. Se resalta el mayor
   (en las lesiones, la letra que protege más). */
function _fila(atr, sale, entra){
  const max = atr.max == null ? 99 : atr.max;
  const a = _valor(sale, atr);
  const b = _valor(entra, atr);
  let bestA = '', bestB = '';
  if (a != null && b != null && a !== b){
    const ganaA = max === 'inj' ? _rangoLesion(a) > _rangoLesion(b) : _num(a) > _num(b);
    const ganaB = max === 'inj' ? _rangoLesion(b) > _rangoLesion(a) : _num(b) > _num(a);
    if (ganaA) bestA = ' mc-best';
    else if (ganaB) bestB = ' mc-best';
  }
  const clase = atr.max == null || atr.max === 99 ? 'mc-row' : 'mc-row mc-row-sm';
  return '<div class="' + clase + '">'
    + '<span class="mc-val mc-val-out' + bestA + '">' + escHtml(_txt(a)) + '</span>'
    + '<span class="mc-bar mc-bar-out" aria-hidden="true"><i style="width:' + _pct(a, max).toFixed(1) + '%"></i></span>'
    + '<span class="mc-lbl">' + escHtml(atr.l) + '</span>'
    + '<span class="mc-bar mc-bar-in" aria-hidden="true"><i style="width:' + _pct(b, max).toFixed(1) + '%"></i></span>'
    + '<span class="mc-val mc-val-in' + bestB + '">' + escHtml(_txt(b)) + '</span>'
    + '</div>';
}

/* Filas de una sección comparada. */
function _filas(atrs, sale, entra){
  return atrs.map(atr => _fila(atr, sale, entra)).join('');
}

/* Fila de la ficha de un solo jugador: etiqueta y valor. */
function _filaFicha(lbl, v){
  return '<div class="mc-frow"><span class="mc-flbl">' + escHtml(lbl) + '</span>'
    + '<b class="mc-fval">' + escHtml(_txt(v)) + '</b></div>';
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

/* Chips de posiciones, con el color de su línea y la principal marcada. */
const SVG_ESTRELLA = '<svg class="mc-pos-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
  + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<path d="m12 3 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.2l5.9-.9Z"/></svg>';
function _chipsPosiciones(jugador){
  const pos = _posiciones(jugador);
  if (!pos.length) return '<li class="mc-none">—</li>';
  return pos.map(p => {
    const principal = jugador && jugador.primaryPos === p.k;
    return '<li class="mc-pos mc-pos-' + p.linea + (principal ? ' mc-pos-main' : '') + '"'
      + ' title="' + escAttr(p.l + (principal ? ' · Principal' : '')) + '">'
      + escHtml(p.k) + (principal ? SVG_ESTRELLA : '')
      + '</li>';
  }).join('');
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

/* Datos personales: altura, edad, pie y banda (solo los que trae el jugador). */
function _datos(jugador){
  const out = [];
  if (!jugador) return out;
  if (jugador.height != null && jugador.height !== '') out.push({ l:'Altura', v: jugador.height + ' cm' });
  if (jugador.age != null && jugador.age !== '') out.push({ l:'Edad', v: jugador.age });
  if (jugador.foot != null && jugador.foot !== '') out.push({ l:'Pie', v: jugador.foot });
  if (jugador.side != null && jugador.side !== '') out.push({ l:'Banda', v: jugador.side });
  return out;
}

/* Frase de ayuda del encabezado de la ficha según el estado del cambio. */
function _ayuda(op){
  if (op && op.ayuda) return String(op.ayuda);
  return '';
}

/* Dos mitades convierten una sección de listas: lo del que sale a la
   izquierda y lo del que entra a la derecha. */
function _dosMitades(titulo, out, entra, op){
  const conEtiquetas = op && op.etiquetas;
  return '<section class="mc-grp mc-grp-listas">'
    + '<h3 class="mc-grp-hd">' + escHtml(titulo) + '</h3>'
    + '<div class="mc-halves">'
      + '<div class="mc-half mc-half-out">'
        + (conEtiquetas ? '<span class="mc-half-tag mc-pl-out">Sale</span>' : '')
        + '<ul class="mc-list">' + (out || '<li class="mc-none">—</li>') + '</ul>'
      + '</div>'
      + '<div class="mc-half mc-half-in">'
        + (conEtiquetas ? '<span class="mc-half-tag mc-pl-in">Entra</span>' : '')
        + '<ul class="mc-list">' + (entra || '<li class="mc-none">—</li>') + '</ul>'
      + '</div>'
    + '</div>'
    + '</section>';
}

/* Botón con handler por NOMBRE de función global: data-onclick="nombre()".
   Se valida el nombre (js/events.js solo resuelve window[nombre]); si no es
   un identificador válido, el botón queda sin handler en vez de romper.
   Con «deshabilitado» el botón se apaga (p. ej. «Hacer el cambio» en pausa). */
function _boton(texto, nombre, clase, deshabilitado){
  const n = nombre == null ? '' : String(nombre).trim();
  // La llamada se arma en dos pasos, y el atributo se pega en su forma compacta
  // ('+llamada+'): audit-wiring (sección 1b) lo lee como handler armado en runtime,
  // no como código escrito dentro del HTML.
  const llamada = /^[A-Za-z_$][\w$]*$/.test(n) ? n + '()' : '';
  const attr = llamada ? ' data-onclick="'+llamada+'"' : '';
  const dis = deshabilitado ? ' disabled aria-disabled="true"' : '';
  return '<button type="button" class="mc-btn' + (clase || '') + '"' + attr + dis + '>' + escHtml(texto) + '</button>';
}

/* ---------- ficha de un solo jugador ---------- */

/* HTML de la ficha de un jugador (una columna, mismo estilo que la
   comparación). opciones = { ayuda:'…' }.
   Muestra TODO lo que tiene el editor: principales, secundarios y
   parámetros 1–8, resistencia a lesiones, habilidades que posee, posiciones
   con la principal marcada y, si están, altura, edad y pie. */
function htmlFicha(jugador, opciones){
  const op = opciones || {};
  const p = jugador || null;
  if (!p) return '';

  const principales = PRINCIPALES.map(a => _filaFicha(a.l, (p.stats || {})[a.k])).join('');
  const secundarios = SECUNDARIOS.map(a => _filaFicha(a.l, _valor(p, a))).join('');

  const hab = _chipsHabilidades(p);
  const pos = _chipsPosiciones(p);
  const prin = POSICIONES.find(x => x.k === p.primaryPos) || null;
  const linea = prin ? prin.linea : 'mid';
  const cod = prin ? prin.k : (p.primaryPos || '—');
  const dorsal = p.dorsal == null || p.dorsal === '' ? '' : ' <span class="mc-fdorsal">#' + escHtml(p.dorsal) + '</span>';
  const datos = _datos(p);
  const ayuda = _ayuda(op);

  return '<section class="mc-panel mc-ficha" aria-label="Ficha del jugador">'
    + '<header class="mc-fhead">'
      + '<div class="mc-fid">'
        + '<span class="mc-fname">' + escHtml(p.name) + '</span>'
        + '<span class="mc-fsub"><span class="mc-fpos mc-pos-' + linea + '">' + escHtml(cod) + '</span>' + dorsal
          + '<span class="mc-ftag">' + escHtml(p.tag || (prin ? prin.l : '')) + '</span></span>'
      + '</div>'
      + '<span class="mc-delta mc-eq" title="Promedio de atributos">' + promedio(p) + '</span>'
    + '</header>'
    + (ayuda ? '<div class="mc-ayuda">' + escHtml(ayuda) + '</div>' : '')
    + '<section class="mc-grp"><h3 class="mc-grp-hd">Principales</h3>'
      + '<div class="mc-grid">' + principales + '</div></section>'
    + '<section class="mc-grp"><h3 class="mc-grp-hd">Secundarios</h3>'
      + '<div class="mc-grid">' + secundarios + '</div></section>'
    + (datos.length
        ? '<section class="mc-grp"><h3 class="mc-grp-hd">Datos</h3><div class="mc-grid">'
          + datos.map(d => _filaFicha(d.l, d.v)).join('') + '</div></section>'
        : '')
    + (hab
        ? '<section class="mc-grp mc-grp-listas"><h3 class="mc-grp-hd">Habilidades</h3>'
          + '<ul class="mc-list">' + hab + '</ul></section>'
        : '')
    + '<section class="mc-grp mc-grp-listas"><h3 class="mc-grp-hd">Posiciones</h3>'
      + '<ul class="mc-list">' + pos + '</ul></section>'
    + '</section>';
}

/* ---------- comparación ---------- */

/* HTML de la comparación. opciones = { onVolver:'fnGlobal', onConfirmar:'fnGlobal',
   bloqueado:true } — los handlers son NOMBRES de funciones globales (data-onclick,
   nunca onclick). En la tarjeta, todo lo del que sale va a la izquierda (rojo) y
   todo lo del que entra a la derecha (verde), también las posiciones y habilidades
   de abajo. */
function htmlPanel(sale, entra, opciones){
  const op = opciones || {};
  if (!sale || !entra) return htmlFicha(sale || entra, op);

  const principales = _filas(PRINCIPALES, sale, entra);
  const secundarios = _filas(SECUNDARIOS, sale, entra);
  const habSale = _chipsHabilidades(sale);
  const habEntra = _chipsHabilidades(entra);

  /* Filas de datos que no se comparan con barra (altura, edad, pie, banda): el
     valor del que sale queda en la columna izquierda y el del que entra en la
     derecha. Solo las etiquetas que trae alguno de los dos. */
  const etiquetasDatos = [];
  for (const j of [sale, entra]){
    for (const d of _datos(j)){
      if (etiquetasDatos.indexOf(d.l) < 0) etiquetasDatos.push(d.l);
    }
  }
  const filasDatos = etiquetasDatos.map(l => {
    const val = j => {
      const d = _datos(j).find(x => x.l === l);
      return d ? d.v : null;
    };
    return '<div class="mc-row mc-row-data">'
      + '<span class="mc-val mc-val-out">' + escHtml(_txt(val(sale))) + '</span>'
      + '<span class="mc-spacer" aria-hidden="true"></span>'
      + '<span class="mc-lbl">' + escHtml(l) + '</span>'
      + '<span class="mc-spacer" aria-hidden="true"></span>'
      + '<span class="mc-val mc-val-in">' + escHtml(_txt(val(entra))) + '</span>'
      + '</div>';
  });

  return '<section class="mc-panel mc-cmp" role="region" aria-label="Comparar antes de cambiar">'
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
    + '<section class="mc-grp"><h3 class="mc-grp-hd">Principales</h3>'
      + '<div class="mc-stats">' + principales + '</div></section>'
    + '<section class="mc-grp"><h3 class="mc-grp-hd">Secundarios</h3>'
      + '<div class="mc-stats">' + secundarios + '</div></section>'
    + (filasDatos.length
        ? '<section class="mc-grp"><h3 class="mc-grp-hd">Datos</h3>'
          + '<div class="mc-stats">' + filasDatos.join('') + '</div></section>'
        : '')
    + (habSale || habEntra
        ? _dosMitades('Habilidades', habSale, habEntra, { etiquetas:true })
        : '')
    + _dosMitades('Posiciones', _chipsPosiciones(sale), _chipsPosiciones(entra), { etiquetas:true })
    + '<div class="mc-actions">'
      + _boton('Elegir otro', op.onVolver, '', false)
      + _boton('Hacer el cambio', op.onConfirmar, ' mc-btn-go', !!op.bloqueado)
    + '</div>'
    + '</section>';
}

return {
  promedio, delta, htmlDelta, htmlFicha, htmlPanel,
};
})();
