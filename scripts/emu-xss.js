/* Solo sandbox (MS-3.1). Detector de inyección para la prueba de sinks.
   Se inyecta con scripts/emu-xss.mjs en sandbox/site/xss.html (o en la
   variante dist), antes que todo el código de la app. Los datos de prueba
   (sandbox/backup-xss.json) llevan en cada nombre de equipo, logo y campo
   de perfil un marcador que, si llega al HTML sin escapar, crea:
   - un elemento <zq-t> (contexto texto),
   - un atributo zq-a / zq-b (atributo con comillas dobles / simples),
   - un atributo zq-l (URL de logo dentro de src="…"),
   o deja el marcador dentro de un handler on*="…" (nombre en JS inline).
   Cada hallazgo guarda la pila del innerHTML/insertAdjacentHTML que lo
   creó. Lectura: window.__XSS__.report(); window.__XSS__.reset(). */
(function () {
  const X = window.__XSS__ = {
    hits: [], seen: new Set(), calls: 0,
    reset() { this.hits = []; this.seen = new Set(); },
    report() {
      return { total: this.hits.length, hits: this.hits.map(h => ({ ...h })) };
    },
  };
  window.zqx = function () { X.hits.push({ kind: 'js-exec', where: location.hash, stack: new Error().stack }); };

  const RAW = /<zq-t>|zq-[abl]=/;
  let lastStack = '';
  function hook(proto, prop) {
    const d = Object.getOwnPropertyDescriptor(proto, prop);
    if (!d || !d.set) return;
    Object.defineProperty(proto, prop, {
      ...d,
      set(v) {
        if (typeof v === 'string' && RAW.test(v)) lastStack = new Error().stack;
        return d.set.call(this, v);
      },
    });
  }
  hook(Element.prototype, 'innerHTML');
  hook(Element.prototype, 'outerHTML');
  const iah = Element.prototype.insertAdjacentHTML;
  Element.prototype.insertAdjacentHTML = function (pos, html) {
    if (typeof html === 'string' && RAW.test(html)) lastStack = new Error().stack;
    return iah.call(this, pos, html);
  };

  function where(el) {
    const page = el.closest && el.closest('[id^="page-"], .modal-overlay, [id$="-wrap"]');
    const parts = [];
    for (let n = el; n && n !== document.body && parts.length < 4; n = n.parentElement) {
      parts.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.classList[0] ? '.' + n.classList[0] : ''));
    }
    return (page ? page.id + ' > ' : '') + parts.join(' > ');
  }
  function add(kind, el, detail) {
    const key = kind + '|' + where(el) + '|' + (detail || '');
    if (X.seen.has(key)) return;
    X.seen.add(key);
    X.hits.push({ kind, where: where(el), detail: detail || '', stack: lastStack.split('\n').slice(2, 6).join(' | ') });
  }
  /* Un nombre dentro de un handler es seguro si viaja como literal JSON
     (escAttr(JSON.stringify(x))): el código compila y la comilla doble del
     marcador aparece escapada (\"). Con '…' o solo escape HTML, la comilla
     simple del marcador rompe la sintaxis y queda como hallazgo. */
  function jsonSafe(code) {
    try { new Function(code); } catch { return false; }
    return code.includes('\\"zq-a=1');
  }
  function scan(root) {
    if (!(root instanceof Element)) return;
    const els = [root, ...root.querySelectorAll('*')];
    for (const el of els) {
      if (el.tagName === 'ZQ-T') add('texto', el);
      for (const a of el.attributes) {
        if (a.name === 'zq-a') add('atributo "…"', el);
        else if (a.name === 'zq-b') add("atributo '…'", el);
        else if (a.name === 'zq-l') add('logo src', el);
        else if (a.name.startsWith('on') && a.value.includes('ZQ') && !jsonSafe(a.value)) add('handler ' + a.name, el, a.value.slice(0, 120));
      }
    }
  }
  new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'attributes') scan(m.target);
      else m.addedNodes.forEach(scan);
    }
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true });
})();
