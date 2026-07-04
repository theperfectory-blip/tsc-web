'use strict';
/* ============================================================
   SISTEMA DE MOTION — "Matchday Broadcast"
   ------------------------------------------------------------
   Utilidades de animación reutilizables, sin dependencias.
   Todas respetan prefers-reduced-motion: si el usuario lo pide,
   degradan a un estado final instantáneo (sin movimiento).

   API pública (window.MOTION):
     reduced()                  → bool, ¿movimiento reducido?
     reveal(el|sel, opts)       → fade+rise al entrar en viewport
     revealAll(sel, opts)       → reveal con stagger sobre una lista
     stagger(els, opts)         → cascada manual sobre nodos ya visibles
     countUp(el, to, opts)      → número que cuenta hasta `to`
     countdown(el, target, o)   → cuenta atrás viva hacia una fecha
     ticker(el)                 → marquesina horizontal en loop
     onScroll(cb)               → callback throttled de scroll (rAF)
   ============================================================ */

(function () {
  const _mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => _mql.matches;

  /* ---- Util: aplica el estado final de un reveal (sin animar) ---- */
  function _settle(el) {
    el.style.opacity = '1';
    el.style.transform = 'none';
    el.dataset.revealed = '1';
  }

  /* Observer compartido para reveals al entrar en viewport */
  let _io = null;
  function _observer() {
    if (_io) return _io;
    _io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        _io.unobserve(el);
        const delay = parseFloat(el.dataset.revealDelay || '0');
        setTimeout(() => _play(el), delay);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    return _io;
  }

  function _play(el) {
    if (el.dataset.revealed) return;
    el.dataset.revealed = '1';
    const dist = el.dataset.revealDist || '18px';
    el.style.transition =
      'opacity 0.6s var(--ease-out), transform 0.6s var(--ease-out)';
    el.style.willChange = 'opacity, transform';
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
    el.addEventListener('transitionend', function done() {
      el.style.willChange = '';
      el.removeEventListener('transitionend', done);
    });
  }

  /* ---- reveal: prepara un elemento y lo revela al entrar ----
     Idempotente: un nodo ya vinculado (`data-reveal-bound`) o ya revelado
     (`data-revealed`) no se vuelve a preparar con opacity:0 — evita que un
     re-bind accidental (p.ej. un helper de montaje llamado dos veces sobre
     el mismo root) esconda contenido que el usuario ya está viendo. */
  function reveal(target, opts = {}) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    if (el.dataset.revealBound || el.dataset.revealed) return;
    el.dataset.revealBound = '1';
    if (reduced()) { _settle(el); return; }
    const dist = opts.dist || '18px';
    el.dataset.revealDist = dist;
    if (opts.delay) el.dataset.revealDelay = String(opts.delay);
    el.style.opacity = '0';
    el.style.transform = `translateY(${dist})`;
    _observer().observe(el);
  }

  /* ---- revealAll: reveal con stagger sobre varios nodos ---- */
  function revealAll(sel, opts = {}) {
    const root = opts.root || document;
    const els = typeof sel === 'string' ? [...root.querySelectorAll(sel)] : sel;
    const step = opts.step ?? 60;     // ms entre elementos
    const max = opts.max ?? 12;       // tope de stagger (evita esperas largas)
    els.forEach((el, i) => {
      reveal(el, { dist: opts.dist, delay: Math.min(i, max) * step });
    });
  }

  /* ---- revealWithin: vincula SOLO los nodos [data-reveal] nuevos/no
     registrados dentro de una raíz recién montada. Pensado para llamarse
     una vez después del montaje inicial de una sección dinámica (no en
     cada actualización en vivo) — `reveal()` ya es idempotente, así que
     llamarla de más sobre nodos ya vinculados es inofensivo, pero el
     llamador debe evitarlo igual para no re-flashear contenido en vivo. ---- */
  function revealWithin(root, sel = '[data-reveal]') {
    const scope = typeof root === 'string' ? document.querySelector(root) : root;
    if (!scope) return;
    const els = [...scope.querySelectorAll(sel)].filter(el => !el.dataset.revealBound && !el.dataset.revealed);
    els.forEach(el => reveal(el));
  }

  /* ---- settleWithin: para un refresco (NO el montaje inicial) que reconstruye
     nodos [data-reveal] desde cero (p.ej. el hero del Calendario o el bloque
     de hitos/H2H del Historial en cada re-render). tsc:public-section-mounted
     solo se dispara UNA vez, así que estos nodos nuevos nunca pasan por
     revealWithin — sin marcarlos, quedan sin `revealBound`/`revealed` (aunque
     visibles por CSS por defecto, no hay garantía explícita). settleWithin los
     deja YA en su estado final, sin animar ni observar: la entrada fade+rise
     es solo para la primera vez que el contenido aparece en el viewport, nunca
     para un refresco de contenido que el usuario ya está viendo. */
  function settleWithin(root, sel = '[data-reveal]') {
    const scope = typeof root === 'string' ? document.querySelector(root) : root;
    if (!scope) return;
    const els = [...scope.querySelectorAll(sel)].filter(el => !el.dataset.revealBound && !el.dataset.revealed);
    els.forEach(el => { el.dataset.revealBound = '1'; _settle(el); });
  }

  /* ---- stagger: cascada inmediata sobre nodos YA visibles ---- */
  function stagger(els, opts = {}) {
    const list = Array.isArray(els) ? els : [...els];
    const step = opts.step ?? 50;
    const dist = opts.dist || '14px';
    if (reduced()) { list.forEach(_settle); return; }
    list.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = `translateY(${dist})`;
      el.style.transition =
        'opacity 0.5s var(--ease-out), transform 0.5s var(--ease-out)';
      setTimeout(() => {
        requestAnimationFrame(() => {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        });
      }, i * step);
    });
  }

  /* ---- countUp: anima un número entero hasta `to` ---- */
  function countUp(target, to, opts = {}) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    const dur = opts.dur ?? 1100;
    const fmt = opts.format || ((n) => String(Math.round(n)));
    const suffix = opts.suffix || '';
    if (reduced()) { el.textContent = fmt(to) + suffix; return; }
    const start = opts.from ?? 0;
    const t0 = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // cubic-out
      el.textContent = fmt(start + (to - start) * eased) + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = fmt(to) + suffix;
    }
    requestAnimationFrame(frame);
  }

  /* ---- countdown: cuenta atrás viva hacia una fecha (Date|ms) ----
     Llama opts.render(parts) cada segundo. parts = {d,h,m,s,done}.
     Devuelve una función stop(). */
  function countdown(target, when, opts = {}) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    const end = when instanceof Date ? when.getTime() : +when;
    const pad = (n) => String(n).padStart(2, '0');
    const render = opts.render || ((p) => {
      if (!el) return;
      el.textContent = p.done ? (opts.doneText || '¡EN JUEGO!')
        : (p.d > 0 ? `${p.d}d ` : '') + `${pad(p.h)}:${pad(p.m)}:${pad(p.s)}`;
    });
    let timer = null;
    function tick() {
      const diff = end - Date.now();
      if (diff <= 0) {
        render({ d: 0, h: 0, m: 0, s: 0, done: true });
        stop();
        if (opts.onDone) opts.onDone();
        return;
      }
      const s = Math.floor(diff / 1000);
      render({
        d: Math.floor(s / 86400),
        h: Math.floor((s % 86400) / 3600),
        m: Math.floor((s % 3600) / 60),
        s: s % 60,
        done: false,
      });
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    tick();
    timer = setInterval(tick, 1000);
    return stop;
  }

  /* ---- ticker: marquesina horizontal infinita ----
     Duplica el contenido y lo desplaza con transform en loop. */
  function ticker(target, opts = {}) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return () => {};
    const speed = opts.speed ?? 40; // px/s
    if (reduced()) return () => {};
    const track = el.firstElementChild;
    if (!track) return () => {};
    // Clona para cubrir el ancho con margen de seguridad
    const clone = track.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    el.appendChild(clone);
    let x = 0, raf = null, last = performance.now();
    const width = track.scrollWidth;
    function frame(now) {
      const dt = (now - last) / 1000; last = now;
      x -= speed * dt;
      if (-x >= width) x += width;
      track.style.transform = clone.style.transform = `translateX(${x}px)`;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }

  /* ---- onScroll: callback de scroll throttled por rAF ---- */
  function onScroll(cb, target = window) {
    let ticking = false;
    function handler() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { cb(target === window ? window.scrollY : target.scrollTop); ticking = false; });
    }
    target.addEventListener('scroll', handler, { passive: true });
    cb(target === window ? window.scrollY : target.scrollTop);
    return () => target.removeEventListener('scroll', handler);
  }

  /* ---- Chrome: indicador deslizante del sidebar + topbar condensada ----
     Autónomo: no requiere tocar los onclick existentes. Observa cambios de
     clase `.active` en los ítems del sidebar y reposiciona el indicador. */
  function _initChrome() {
    const sidebar = document.getElementById('pub-sidebar');
    const nav = sidebar && sidebar.querySelector('.pub-sidebar-nav');

    // Indicador deslizante
    if (nav && !nav.querySelector('.pub-nav-indicator')) {
      const ind = document.createElement('div');
      ind.className = 'pub-nav-indicator';
      nav.style.position = 'relative';
      nav.appendChild(ind);

      const sync = () => {
        const active = nav.querySelector('.pub-nav-item.active');
        if (!active) { ind.style.opacity = '0'; return; }
        const navRect = nav.getBoundingClientRect();
        const r = active.getBoundingClientRect();
        ind.style.height = r.height + 'px';
        ind.style.transform = `translateY(${r.top - navRect.top}px)`;
        ind.style.opacity = '1';
      };

      // Observa cambios de clase en los ítems (goPublicPage togglea .active)
      const mo = new MutationObserver(sync);
      nav.querySelectorAll('.pub-nav-item').forEach((it) =>
        mo.observe(it, { attributes: true, attributeFilter: ['class'] }));
      window.addEventListener('resize', sync, { passive: true });
      // Sincroniza tras render inicial y tras cualquier click en el nav
      nav.addEventListener('click', () => setTimeout(sync, 30));
      setTimeout(sync, 60);
    }

    // Topbar condensada al hacer scroll
    const topbar = document.getElementById('topbar');
    if (topbar) {
      onScroll((y) => topbar.classList.toggle('condensed', y > 12));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initChrome);
  } else {
    _initChrome();
  }

  /* ---- Paridad con /prototype: fade+rise por sección pública ----
     nav.js dispara 'tsc:public-section-mounted' UNA sola vez, justo después
     del montaje inicial de cada sección (no en cada refresh en vivo — ver
     ensurePublicSectionMounted). Acá se cablea qué revela cada una; el
     mismo patrón que el prototipo (`querySelectorAll('[data-reveal]')` +
     `revealAll('.metro-day', {step:70, dist:'10px'})`), pero por sección y
     re-invocable de forma segura (reveal/revealWithin son idempotentes). */
  function _bindPageReveals(page) {
    const root = document.getElementById('page-' + page);
    if (!root) return;
    switch (page) {
      case 'calendario':
        revealWithin(root);
        revealAll(root.querySelectorAll('.metro-day'), { step: 70, dist: '10px' });
        break;
      case 'sorteo':
      case 'historial':
        revealWithin(root);
        break;
    }
  }
  document.addEventListener('tsc:public-section-mounted', (e) => _bindPageReveals(e.detail?.page));

  window.MOTION = { reduced, reveal, revealAll, revealWithin, settleWithin, stagger, countUp, countdown, ticker, onScroll };
})();
