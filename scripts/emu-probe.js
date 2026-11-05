/* Solo sandbox (MS-2.5). Sonda de lecturas de Firestore: envuelve el SDK
   compat para contar listeners abiertos/cerrados y documentos leídos, con la
   misma regla que factura Firestore (aprox.):
   - get() de consulta: docs devueltos (mínimo 1); get() de documento: 1.
   - onSnapshot: los docChanges de cada snapshot que viene del servidor
     (el primero trae la colección entera).
   Las escrituras propias (hasPendingWrites) y la caché no se cuentan.
   Se inyecta con scripts/emu-probe.mjs en sandbox/site/probe.html, después
   del SDK y antes del código de la app. Lectura: window.__PROBE__.report(). */
(function () {
  if (typeof firebase === 'undefined' || !firebase.firestore) return;
  const P = window.__PROBE__ = {
    reads: {}, gets: {}, listeners: {}, open: 0, opened: 0, closed: 0, log: [],
    reset() { this.reads = {}; this.gets = {}; this.log = []; },
    report() {
      const total = Object.values(this.reads).reduce((a, b) => a + b, 0);
      return { total, reads: { ...this.reads }, gets: { ...this.gets }, openListeners: this.open, opened: this.opened, closed: this.closed, byPath: { ...this.listeners } };
    },
  };
  const add = (k, n) => { P.reads[k] = (P.reads[k] || 0) + n; };
  const pathOf = q => (q && q._delegate && q._delegate._query && q._delegate._query.path && q._delegate._query.path.segments || []).join('/')
    || (q && q.path) || (q && q.id) || '?';
  const FS = firebase.firestore;
  const wrapSnap = (proto, kind) => {
    const orig = proto.onSnapshot;
    proto.onSnapshot = function (...args) {
      const path = kind === 'doc' ? this.path : pathOf(this);
      const i = args.findIndex(a => typeof a === 'function' || (a && typeof a.next === 'function'));
      const next = typeof args[i] === 'function' ? args[i] : args[i].next.bind(args[i]);
      const wrapped = snap => {
        if (!snap.metadata.fromCache && !snap.metadata.hasPendingWrites) {
          const n = kind === 'doc' ? 1 : snap.docChanges().length;
          if (n) add(path, n);
        }
        return next(snap);
      };
      if (typeof args[i] === 'function') args[i] = wrapped; else args[i] = { ...args[i], next: wrapped };
      P.open++; P.opened++; P.listeners[path] = (P.listeners[path] || 0) + 1;
      const unsub = orig.apply(this, args);
      let done = false;
      return () => { if (!done) { done = true; P.open--; P.closed++; P.listeners[path]--; } return unsub(); };
    };
  };
  const wrapGet = (proto, kind) => {
    const orig = proto.get;
    proto.get = function (...args) {
      const path = kind === 'doc' ? this.path : pathOf(this);
      P.gets[path] = (P.gets[path] || 0) + 1;
      return orig.apply(this, args).then(snap => {
        if (!snap.metadata.fromCache) add(path, kind === 'doc' ? 1 : Math.max(1, snap.size));
        return snap;
      });
    };
  };
  wrapSnap(FS.Query.prototype, 'query'); wrapGet(FS.Query.prototype, 'query');
  for (const k of ['onSnapshot', 'get']) {
    if (Object.prototype.hasOwnProperty.call(FS.CollectionReference.prototype, k)) {
      (k === 'get' ? wrapGet : wrapSnap)(FS.CollectionReference.prototype, 'query');
    }
  }
  wrapSnap(FS.DocumentReference.prototype, 'doc'); wrapGet(FS.DocumentReference.prototype, 'doc');
  console.warn('[probe] sonda de lecturas activa (solo sandbox)');
})();
