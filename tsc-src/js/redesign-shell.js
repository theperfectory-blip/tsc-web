/* redesign-shell.js — Slice 3 (rediseño): topnav pública en la topbar mapeada a goPublicPage().
   - Gateada por STATE.mode vía syncRedesignShellMode(): visible en público (aunque seas admin),
     oculta en modo admin.
   - Indicador deslizante sincronizado con la página activa vía syncRedesignTopnav().
   - Sorteo omitido (sin botón): no deja .active "stale" ni el indicador colgado de la página previa.
   - Respeta reduced motion (MOTION.reduced() / prefers-reduced-motion) en el scroll horizontal.
   Expone window.syncRedesignTopnav y window.syncRedesignShellMode; nav.js los llama de forma defensiva
   (typeof ... === 'function'), sin depender del orden de carga. */
(function(){
  'use strict';

  // true si el usuario pidió menos movimiento. Prioriza el helper del rediseño (MOTION.reduced),
  // con fallback a matchMedia si MOTION no está cargado.
  function _rdpReduced(){
    try{
      if(window.MOTION && typeof window.MOTION.reduced === 'function') return !!window.MOTION.reduced();
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches);
    }catch(e){ return false; }
  }

  // Sincroniza el botón activo + el indicador del topnav con la página pública actual.
  // Para páginas SIN botón (p.ej. 'sorteo', omitido en Slice 3): limpia toda .active y
  // oculta el indicador (width 0) para que no quede sobre la página anterior.
  function syncRedesignTopnav(page){
    var track = document.getElementById('rdp-tn-track');
    if(!track) return;
    var btns = Array.prototype.slice.call(track.querySelectorAll('.sec-nav-btn'));
    var ind  = document.getElementById('rdp-nav-ind');
    var active = btns.find(function(b){ return b.dataset.page === page; }) || null;
    btns.forEach(function(b){ b.classList.toggle('active', b === active); });
    if(ind){
      if(active){ ind.style.left = active.offsetLeft + 'px'; ind.style.width = active.offsetWidth + 'px'; }
      else      { ind.style.width = '0px'; }   // sin botón -> indicador oculto
    }
    if(active){
      track.scrollTo({
        left: active.offsetLeft - track.clientWidth / 2 + active.offsetWidth / 2,
        behavior: _rdpReduced() ? 'auto' : 'smooth'
      });
    }
  }

  // Muestra/oculta el topnav según el modo (oculto en admin). Gateo por STATE.mode, no por rol.
  function syncRedesignShellMode(mode){
    var nav = document.getElementById('rdp-topnav');
    if(nav) nav.classList.toggle('is-hidden', mode === 'admin');
  }

  document.addEventListener('DOMContentLoaded', function(){
    // Posición inicial del indicador (tras layout) según la página pública por defecto.
    requestAnimationFrame(function(){
      syncRedesignTopnav((typeof STATE !== 'undefined' && STATE.publicPage) || 'palmares');
    });
    // Reposicionar el indicador del botón activo al cambiar el ancho.
    window.addEventListener('resize', function(){
      var a = document.querySelector('#rdp-tn-track .sec-nav-btn.active');
      if(!a) return;
      var ind = document.getElementById('rdp-nav-ind');
      if(ind){ ind.style.left = a.offsetLeft + 'px'; ind.style.width = a.offsetWidth + 'px'; }
    });
  });

  window.syncRedesignTopnav   = syncRedesignTopnav;
  window.syncRedesignShellMode = syncRedesignShellMode;
})();
