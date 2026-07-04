/* Public shell: topnav, continuous document scroll and focused-section state. */
(function(){
  'use strict';

  const SCROLL_LOCK_MS = 700;
  let mountObserver = null;
  let visibilityObserver = null;
  let focusObserver = null;
  let scrollLockUntil = 0;
  let initialized = false;
  let _chromeResizeObserver = null;

  /* Leer --chrome-h del DOM (fallback 82 hasta que JS escriba el valor medido). */
  function _chromeH(){
    const v = getComputedStyle(document.documentElement).getPropertyValue('--chrome-h').trim();
    return parseInt(v) || 82;
  }

  /* Mide #topbar y #ticker (si visible) y escribe --topbar-h / --chrome-h en el :root. */
  function _measureChrome(){
    const topbar = document.getElementById('topbar');
    if(!topbar) return;
    const topbarH = topbar.getBoundingClientRect().height || topbar.offsetHeight || 48;
    const ticker  = document.getElementById('ticker');
    /* ticker es position:fixed → offsetParent siempre null; usar display computed en su lugar */
    const tickerH = (ticker && getComputedStyle(ticker).display !== 'none')
      ? (ticker.getBoundingClientRect().height || ticker.offsetHeight || 0)
      : 0;
    const root = document.documentElement;
    root.style.setProperty('--topbar-h', topbarH + 'px');
    root.style.setProperty('--chrome-h', (topbarH + tickerH) + 'px');
  }

  /* Recalcula chrome y, si el focusObserver ya existe, lo reconstruye con el nuevo rootMargin. */
  function _updateChrome(){
    _measureChrome();
    if(initialized && focusObserver){
      /* focusObserver usa rootMargin inmutable → reconstruir para que tome --chrome-h nuevo. */
      const sections = _activeSections();
      focusObserver.disconnect();
      focusObserver = _buildFocusObserver();
      sections.forEach(s=>focusObserver.observe(s));
    }
  }

  function _buildFocusObserver(){
    const chromeH = _chromeH();
    const topBound = chromeH + 8;
    /* IntersectionObserver solo entrega en `entries` los targets cuyo estado
       de intersección CAMBIÓ en este callback — no todas las secciones
       actualmente visibles. Si una sección (p.ej. Sorteo) ya estaba
       intersectando y sigue intersectando sin cruzar el threshold de nuevo,
       puede no aparecer en ningún lote posterior y nunca ser candidata: el
       foco salta de una sección a otra saltándose las de en medio. Por eso
       `entries` se usa solo como señal de "algo cambió, hay que reevaluar" —
       el candidato se recalcula SIEMPRE con los rects en vivo de todas las
       secciones activas (mismo criterio de intersección que el rootMargin de
       abajo, pero medido en el momento, no el que trae el entry viejo). */
    return new IntersectionObserver(()=>{
      if(!_publicScrollEnabled() || Date.now() < scrollLockUntil) return;
      const bottomBound = window.innerHeight * 0.45;
      const candidates = _activeSections()
        .map(section=>({ section, rect:section.getBoundingClientRect() }))
        .filter(({rect})=> rect.bottom > topBound && rect.top < bottomBound)
        .sort((a,b)=> Math.abs(a.rect.top - chromeH) - Math.abs(b.rect.top - chromeH));
      const candidate = candidates[0];
      if(!candidate) return;
      const page = _sectionPage(candidate.section);
      if(typeof window.focusPublicSection === 'function'){
        window.focusPublicSection(page);
      }
    }, { root:null, rootMargin:`-${topBound}px 0px -55% 0px`, threshold:0 });
  }

  function _initChromeObserver(){
    if(_chromeResizeObserver) return;
    _measureChrome();
    if(typeof ResizeObserver !== 'undefined'){
      _chromeResizeObserver = new ResizeObserver(_updateChrome);
      const topbar = document.getElementById('topbar');
      const ticker  = document.getElementById('ticker');
      if(topbar) _chromeResizeObserver.observe(topbar);
      if(ticker)  _chromeResizeObserver.observe(ticker);
    }
    window.addEventListener('resize', _updateChrome, { passive:true });
  }

  function _rdpReduced(){
    try{
      if(window.MOTION && typeof window.MOTION.reduced === 'function') return !!window.MOTION.reduced();
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches);
    }catch(e){ return false; }
  }

  function _pages(){
    return typeof window.getPublicScrollPages === 'function'
      ? window.getPublicScrollPages()
      : ['palmares', 'panel', 'calendario', 'equipos', 'sorteo', 'historial'];
  }

  function _sectionPage(section){
    return section?.id?.replace(/^page-/, '') || '';
  }

  function _activeSections(){
    return _pages()
      .map(page=>document.getElementById('page-'+page))
      .filter(section=>section && !section.hidden);
  }

  function _publicScrollEnabled(){
    return typeof STATE !== 'undefined'
      && STATE.mode === 'public'
      && document.getElementById('main')?.classList.contains('public-scroll');
  }

  function _nextFrame(){
    return new Promise(resolve=>requestAnimationFrame(resolve));
  }

  function syncRedesignTopnav(page){
    const track = document.getElementById('rdp-tn-track');
    if(!track) return;
    const btns = Array.from(track.querySelectorAll('.sec-nav-btn'));
    const ind = document.getElementById('rdp-nav-ind');
    const active = btns.find(button=>button.dataset.page === page) || null;
    btns.forEach(button=>button.classList.toggle('active', button === active));
    if(ind){
      if(active){
        ind.style.left = active.offsetLeft + 'px';
        ind.style.width = active.offsetWidth + 'px';
      }else{
        ind.style.width = '0px';
      }
    }
    if(active){
      track.scrollTo({
        left: active.offsetLeft - track.clientWidth / 2 + active.offsetWidth / 2,
        behavior: _rdpReduced() ? 'auto' : 'smooth'
      });
    }
  }

  function _dispatchVisibility(entry){
    document.dispatchEvent(new CustomEvent('tsc:public-section-visible', {
      detail:{
        page: _sectionPage(entry.target),
        visible: entry.isIntersecting,
        ratio: entry.intersectionRatio
      }
    }));
  }

  function _createObservers(){
    if(!('IntersectionObserver' in window)) return;

    mountObserver = new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting) return;
        const page = _sectionPage(entry.target);
        if(typeof window.ensurePublicSectionMounted === 'function'){
          window.ensurePublicSectionMounted(page);
        }
      });
    }, { root:null, rootMargin:'600px 0px', threshold:0.01 });

    visibilityObserver = new IntersectionObserver(entries=>{
      entries.forEach(_dispatchVisibility);
    }, { root:null, threshold:[0, 0.01, 0.25, 0.5, 0.75] });

    focusObserver = _buildFocusObserver();
  }

  function refreshPublicScrollSections(){
    if(!initialized || !_publicScrollEnabled()) return;
    [mountObserver, visibilityObserver, focusObserver].forEach(observer=>observer?.disconnect());
    _activeSections().forEach(section=>{
      mountObserver?.observe(section);
      visibilityObserver?.observe(section);
      focusObserver?.observe(section);
    });
  }

  function initPublicScrollShell(){
    if(!_publicScrollEnabled()) return;
    if(!initialized){
      initialized = true;
      _createObservers();
    }
    refreshPublicScrollSections();
    const initial = _pages().includes(STATE.publicPage) ? STATE.publicPage : 'palmares';
    if(typeof window.focusPublicSection === 'function'){
      window.focusPublicSection(initial);
    }
  }

  function destroyPublicScrollShell(){
    [mountObserver, visibilityObserver, focusObserver].forEach(observer=>observer?.disconnect());
    initialized = false;
    mountObserver = null;
    visibilityObserver = null;
    focusObserver = null;
  }

  async function scrollToPublicSection(page, options){
    const opts = options || {};
    if(!_publicScrollEnabled()) return false;
    const section = document.getElementById('page-'+page);
    if(!section || section.hidden) return false;

    scrollLockUntil = Number.POSITIVE_INFINITY;
    try{
      const targetIndex = _pages().indexOf(page);
      const preceding = _activeSections().filter(sectionEl=>{
        return _pages().indexOf(_sectionPage(sectionEl)) <= targetIndex;
      });
      if(typeof window.ensurePublicSectionMounted === 'function'){
        for(const sectionEl of preceding){
          await window.ensurePublicSectionMounted(_sectionPage(sectionEl));
        }
      }
      if(typeof window.focusPublicSection === 'function'){
        await window.focusPublicSection(page, { navEl:opts.navEl });
      }
      await _nextFrame();
      await _nextFrame();
    }catch(error){
      scrollLockUntil = 0;
      throw error;
    }
    scrollLockUntil = Date.now() + SCROLL_LOCK_MS;
    const top = section.getBoundingClientRect().top + window.scrollY - _chromeH();
    window.scrollTo({ top:Math.max(0, top), behavior:_rdpReduced() ? 'auto' : 'smooth' });
    window.setTimeout(()=>{
      if(!_publicScrollEnabled() || STATE.publicPage !== page) return;
      const settledTop = section.getBoundingClientRect().top + window.scrollY - _chromeH();
      window.scrollTo({ top:Math.max(0, settledTop), behavior:_rdpReduced() ? 'auto' : 'smooth' });
    }, 420);
    return true;
  }

  function syncRedesignShellMode(mode){
    const nav    = document.getElementById('rdp-topnav');
    const topbar = document.getElementById('topbar');
    if(nav)    nav.classList.toggle('is-hidden', mode === 'admin');
    if(topbar) topbar.classList.toggle('public-mode', mode === 'public');
    if(mode === 'admin') destroyPublicScrollShell();
    else requestAnimationFrame(initPublicScrollShell);
  }

  document.addEventListener('DOMContentLoaded', function(){
    _initChromeObserver();
    requestAnimationFrame(function(){
      syncRedesignTopnav((typeof STATE !== 'undefined' && STATE.publicPage) || 'palmares');
      initPublicScrollShell();
    });
    window.addEventListener('resize', function(){
      const active = document.querySelector('#rdp-tn-track .sec-nav-btn.active');
      if(!active) return;
      const ind = document.getElementById('rdp-nav-ind');
      if(ind){
        ind.style.left = active.offsetLeft + 'px';
        ind.style.width = active.offsetWidth + 'px';
      }
    });
  });

  window.syncRedesignTopnav = syncRedesignTopnav;
  window.syncRedesignShellMode = syncRedesignShellMode;
  window.initPublicScrollShell = initPublicScrollShell;
  window.destroyPublicScrollShell = destroyPublicScrollShell;
  window.refreshPublicScrollSections = refreshPublicScrollSections;
  window.scrollToPublicSection = scrollToPublicSection;
})();
