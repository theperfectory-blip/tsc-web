'use strict';
/* ============================================================
   ESTELA DE CURSOR — cursor-fx.js
   ------------------------------------------------------------
   Dibuja en un único canvas FIJO por ENCIMA de absolutamente
   todo (--z-cursor-fx, por encima incluso de #sala) — así no
   importa si una tarjeta, tabla o barra tiene fondo opaco o
   transparente, la estela siempre se ve. `pointer-events:none`
   en el canvas: nunca bloquea clics.

   Elegible desde Configuración general (ver ui-utils.js →
   openSettings/saveSettings, botones .trail-picker en index.html).
   4 propuestas + apagado, todas motor Canvas2D liviano (sin
   nodos DOM por partícula):
     - ribbon:        líneas elásticas (resorte/fricción) que
                       persiguen el cursor, tono dorado→verde
     - sparks:        chispas doradas que se disparan del cursor
     - comet:         una sola estela cónica, minimal
     - constellation: nodos encadenados con líneas entre vecinos

   Respeta prefers-reduced-motion (no arranca el canvas) y pausa
   el loop en pestaña oculta o tras reposo prolongado del mouse.

   Táctil (móvil web y APK Capacitor): no hay puntero real que perseguir,
   así que el módulo entero queda inerte — ni crea el canvas ni escucha
   pointermove. IS_TOUCH se calcula una sola vez al cargar el script (el
   tipo de puntero de un dispositivo no cambia en caliente).
   ============================================================ */
(function () {
  const VARIANTS = ['ribbon', 'sparks', 'comet', 'constellation', 'off'];
  const STORE_KEY = 'tsc_cursorfx_variant';
  const IDLE_STOP_MS = 1400;

  function _isTouchDevice() {
    try {
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
    } catch (_) { /* matchMedia no disponible */ }
    return (navigator.maxTouchPoints || 0) > 0;
  }
  const IS_TOUCH = _isTouchDevice();

  let canvas, ctx, dpr = 1;
  let variant = 'off';
  let running = false, raf = 0;
  let mx = 0, my = 0, lastMove = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---- ribbon: cadena de nodos resorte/fricción por trail ---- */
  const ribbon = (() => {
    const TRAILS = 14, NODES = 30, FRICTION = 0.52, DAMPENING = 0.25, TENSION = 0.98;
    let lines = [], phase = Math.random() * Math.PI * 2;

    function makeLine(spring) {
      const nodes = [];
      for (let i = 0; i < NODES; i++) nodes.push({ x: mx, y: my, vx: 0, vy: 0 });
      return { spring, friction: FRICTION + Math.random() * 0.01 - 0.002, nodes };
    }
    function reset() {
      lines = Array.from({ length: TRAILS }, (_, i) => makeLine(0.4 + (i / TRAILS) * 0.025));
    }
    function updateLine(line) {
      let spring = line.spring;
      const head = line.nodes[0];
      head.vx += (mx - head.x) * spring;
      head.vy += (my - head.y) * spring;
      for (let i = 0; i < line.nodes.length; i++) {
        const node = line.nodes[i];
        if (i > 0) {
          const prev = line.nodes[i - 1];
          node.vx += (prev.x - node.x) * spring;
          node.vy += (prev.y - node.y) * spring;
          node.vx += prev.vx * DAMPENING;
          node.vy += prev.vy * DAMPENING;
        }
        node.vx *= line.friction; node.vy *= line.friction;
        node.x += node.vx; node.y += node.vy;
        spring *= TENSION;
      }
    }
    function drawLine(line) {
      const n = line.nodes;
      ctx.beginPath();
      ctx.moveTo(n[0].x, n[0].y);
      for (let i = 1; i < n.length - 2; i++) {
        const a = n[i], b = n[i + 1];
        ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      const a = n[n.length - 2], b = n[n.length - 1];
      ctx.quadraticCurveTo(a.x, a.y, b.x, b.y);
      ctx.stroke();
    }
    function step() {
      phase += 0.0016;
      const hue = 40 + ((Math.sin(phase) + 1) / 2) * 110; // dorado(40)→verde(150), nunca arcoíris
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `hsla(${hue.toFixed(1)},60%,55%,0.22)`;
      ctx.lineWidth = 1;
      lines.forEach((l) => { updateLine(l); drawLine(l); });
    }
    return { reset, step };
  })();

  /* ---- sparks: chispas que se disparan del cursor ---- */
  const sparks = (() => {
    let particles = [];
    function spawn() {
      for (let i = 0; i < 2; i++) {
        particles.push({
          x: mx, y: my,
          vx: (Math.random() - 0.5) * 1.6,
          vy: -Math.random() * 1.6 - 0.3,
          life: 1,
          size: 1.4 + Math.random() * 2,
          green: Math.random() < 0.18,
        });
      }
      if (particles.length > 160) particles.splice(0, particles.length - 160);
    }
    function step() {
      ctx.globalCompositeOperation = 'lighter';
      particles = particles.filter((p) => p.life > 0.03);
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.02; p.life *= 0.96;
        ctx.fillStyle = p.green
          ? `rgba(70,217,138,${(p.life * 0.8).toFixed(2)})`
          : `rgba(232,212,139,${(p.life * 0.8).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    return { reset: () => { particles = []; }, spawn, step };
  })();

  /* ---- comet: una sola estela cónica, minimal ---- */
  const comet = (() => {
    let pts = [];
    function step() {
      pts.push({ x: mx, y: my });
      if (pts.length > 16) pts.shift();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i < pts.length; i++) {
        const t = i / pts.length;
        ctx.strokeStyle = `rgba(201,168,76,${(t * 0.55).toFixed(2)})`;
        ctx.lineWidth = t * 5;
        ctx.beginPath();
        ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
        ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
    }
    return { reset: () => { pts = []; }, step };
  })();

  /* ---- constellation: nodos encadenados, líneas entre vecinos cercanos ---- */
  const constellation = (() => {
    const N = 9, LINK = 130;
    let nodes = [];
    function reset() { nodes = Array.from({ length: N }, () => ({ x: mx, y: my })); }
    function step() {
      let px = mx, py = my;
      nodes.forEach((n, i) => {
        n.x += (px - n.x) * (0.32 - i * 0.02);
        n.y += (py - n.y) * (0.32 - i * 0.02);
        px = n.x; py = n.y;
      });
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (d >= LINK) continue;
          ctx.strokeStyle = `rgba(201,168,76,${((1 - d / LINK) * 0.35).toFixed(2)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
      nodes.forEach((n, i) => {
        ctx.fillStyle = i % 3 === 0 ? 'rgba(70,217,138,0.85)' : 'rgba(232,212,139,0.85)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    return { reset, step };
  })();

  const ENGINES = { ribbon, sparks, comet, constellation };

  function frame(now) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const engine = ENGINES[variant];
    if (engine) engine.step();
    if (now - lastMove < IDLE_STOP_MS) {
      raf = requestAnimationFrame(frame);
    } else {
      running = false;
    }
  }

  function wake() {
    if (IS_TOUCH || running || variant === 'off' || MOTION.reduced()) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (ctx) ctx.clearRect(0, 0, innerWidth, innerHeight);
  }

  function setVariant(v) {
    if (IS_TOUCH) { variant = 'off'; return; } // sin puntero real: la elección de settings no activa nada
    if (!VARIANTS.includes(v)) return;
    variant = v;
    try { localStorage.setItem(STORE_KEY, v); } catch (_) { /* storage no disponible */ }
    const engine = ENGINES[v];
    if (engine) engine.reset();
    if (v === 'off' || MOTION.reduced()) stop(); else wake();
  }

  function getVariant() { return IS_TOUCH ? 'off' : variant; }

  function init() {
    if (IS_TOUCH) {
      // Defensivo: si por lo que sea ya hay un canvas en el DOM (HMR, doble
      // carga del script), sacarlo — en táctil nunca debe quedar visible.
      document.getElementById('cursor-fx')?.remove();
      return;
    }
    canvas = document.createElement('canvas');
    canvas.id = 'cursor-fx';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();

    mx = innerWidth / 2; my = innerHeight / 2;

    let stored = null;
    try { stored = localStorage.getItem(STORE_KEY); } catch (_) { /* storage no disponible */ }
    setVariant(VARIANTS.includes(stored) ? stored : 'off');

    addEventListener('resize', resize, { passive: true });

    if (MOTION.reduced()) return; // sin listeners de movimiento

    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY; lastMove = performance.now();
      if (variant === 'sparks') sparks.spawn();
      wake();
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else if (variant !== 'off') wake();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.CURSOR_FX = { setVariant, getVariant, variants: VARIANTS.slice() };
})();
