/* ============================================================
   SPLASH DE ARRANQUE
   ------------------------------------------------------------
   Antes era un <script> inline en index.html; pasó a archivo para que
   la CSP no necesite 'unsafe-inline' (MS-7.5). Corre apenas se lee,
   antes del resto del HTML: no lo junta build-web en un bundle (el
   atributo data-boot lo saca de su patrón) y mantiene su lugar.
   ============================================================ */
(function(){
  var READY_KEYS = ['dom','publicMounted','fonts','logoImg','yunaImg'];
  var state = { _failed: [] };
  var readyResolve;
  var readyPromise = new Promise(function(res){ readyResolve = res; });

  function checkReady(){
    for(var i=0;i<READY_KEYS.length;i++){ if(!state[READY_KEYS[i]]) return; }
    readyResolve();
  }
  window.markBootStep = function(name, failed){
    if(state[name]) return;
    state[name] = true;
    if(failed) state._failed.push(name); // asset no crítico: se sigue igual, solo queda registrado
    checkReady();
  };
  window.waitBootAssets = function(){ return readyPromise; };
  window.TSC_BOOT_READY = state; // debug: window.TSC_BOOT_READY.publicMounted, ._failed, etc.

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ markBootStep('dom'); });
  } else { markBootStep('dom'); }

  document.addEventListener('tsc:public-section-mounted', function(){ markBootStep('publicMounted'); }, { once:true });

  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(function(){ markBootStep('fonts'); }, function(){ markBootStep('fonts', true); });
  } else { markBootStep('fonts'); }

  var splashImg = document.querySelector('#boot-splash img');
  if(splashImg && splashImg.complete && splashImg.naturalWidth > 0){
    markBootStep('logoImg');
  } else if(splashImg){
    splashImg.addEventListener('load', function(){ markBootStep('logoImg'); }, { once:true });
    splashImg.addEventListener('error', function(){ markBootStep('logoImg', true); }, { once:true });
  } else { markBootStep('logoImg'); }

  var yunaImg = new Image();
  yunaImg.addEventListener('load', function(){ markBootStep('yunaImg'); }, { once:true });
  yunaImg.addEventListener('error', function(){ markBootStep('yunaImg', true); }, { once:true });
  yunaImg.src = 'assets/chibi/LuisYuNa_nuevo_128.webp';

  function isNativeApk(){
    try {
      return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
    } catch(_){ return false; }
  }

  window.hideBootSplashWhenReady = function(){
    return waitBootAssets().then(function(){
      if(!isNativeApk()) return;
      return new Promise(function(r){ requestAnimationFrame(function(){ requestAnimationFrame(r); }); });
    }).then(function(){
      document.dispatchEvent(new CustomEvent('tsc:boot-ready'));
    });
  };

  function hideBootSplash(){
    var el = document.getElementById('boot-splash');
    if(!el) return;
    el.classList.add('boot-splash-hide');
    setTimeout(function(){ el.remove(); }, 400);
  }
  document.addEventListener('tsc:boot-ready', hideBootSplash, { once:true });
  window.hideBootSplashWhenReady();

  function showStatus(text){
    var el = document.getElementById('boot-splash-status');
    if(el) el.textContent = text;
  }
  setTimeout(function(){
    if(document.getElementById('boot-splash') && !window.__TSC_BOOT_OFFLINE__) showStatus('Esto está tardando más de lo normal…');
  }, 10000);
  setTimeout(function(){
    if(document.getElementById('boot-splash') && !window.__TSC_BOOT_OFFLINE__) showStatus('Problema al cargar. Revisa tu conexión e intenta de nuevo.');
  }, 25000);
})();
