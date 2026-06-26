/* Public shell: topnav, continuous document scroll and focused-section state. */
(function(){
  'use strict';

  const CHROME_OFFSET = 82;
  const SCROLL_LOCK_MS = 700;
  let mountObserver = null;
  let visibilityObserver = null;
  let focusObserver = null;
  let scrollLockUntil = 0;
  let initialized = false;

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

    focusObserver = new IntersectionObserver(entries=>{
      if(!_publicScrollEnabled() || Date.now() < scrollLockUntil) return;
      const candidates = entries
        .filter(entry=>entry.isIntersecting && !entry.target.hidden)
        .sort((a,b)=>{
          const aDistance = Math.abs(a.boundingClientRect.top - CHROME_OFFSET);
          const bDistance = Math.abs(b.boundingClientRect.top - CHROME_OFFSET);
          return aDistance - bDistance;
        });
      const candidate = candidates[0];
      if(!candidate) return;
      const page = _sectionPage(candidate.target);
      if(typeof window.focusPublicSection === 'function'){
        window.focusPublicSection(page);
      }
    }, { root:null, rootMargin:'-90px 0px -55% 0px', threshold:0 });
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
    const top = section.getBoundingClientRect().top + window.scrollY - CHROME_OFFSET;
    window.scrollTo({ top:Math.max(0, top), behavior:_rdpReduced() ? 'auto' : 'smooth' });
    window.setTimeout(()=>{
      if(!_publicScrollEnabled() || STATE.publicPage !== page) return;
      const settledTop = section.getBoundingClientRect().top + window.scrollY - CHROME_OFFSET;
      window.scrollTo({ top:Math.max(0, settledTop), behavior:_rdpReduced() ? 'auto' : 'smooth' });
    }, 420);
    return true;
  }

  function syncRedesignShellMode(mode){
    const nav = document.getElementById('rdp-topnav');
    if(nav) nav.classList.toggle('is-hidden', mode === 'admin');
    if(mode === 'admin') destroyPublicScrollShell();
    else requestAnimationFrame(initPublicScrollShell);
  }

  document.addEventListener('DOMContentLoaded', function(){
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
