#!/usr/bin/env node
'use strict';
/* Smoke de paridad tsc-src / dist (slice 2.2, H-20). Solo desarrollo.

   Carga los <script> de las dos variantes, en el mismo orden que el
   navegador, dentro de un contexto `vm` con window/document/firebase
   simulados (stubs que absorben cualquier acceso) y compara:
   - las globales definidas (funciones y variables) tras cargar;
   - los listeners registrados al cargar (addEventListener en window,
     document y elementos), porque perder un registro no quita globales;
   - los errores lanzados al cargar cada script / bundle.
   Si en `dist` falta una global o un listener que `tsc-src` sí tiene, un
   módulo cortó su bundle. Se ve además qué archivo lanzó el error.

   Puntos ciegos: un archivo que solo declara `function` (el navegador las
   define igual por hoisting, así que tampoco rompe) y el código que solo
   corre con el SDK de Firebase cargado (acá no está). No reemplaza la
   prueba en navegador (tsc-emu-dist): ver docs/reportes/MS-2.2.md.

   Uso: node scripts/smoke-parity.mjs   (corre antes build-web.mjs) */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// Stub universal: cualquier propiedad devuelve otro stub; es llamable y
// construible. `addEventListener` anota `<objeto>:<evento>` en `listeners`.
function makeStub(label, listeners) {
  const fn = function () {};
  return new Proxy(fn, {
    get(_, k) {
      if (k === Symbol.toPrimitive) return () => '';
      if (k === 'then') return undefined;
      if (k === 'length') return 0;
      if (k === Symbol.iterator) return function* () {};
      if (k === 'addEventListener') return type => { listeners.push(`${label}:${type}`); };
      // Promesa real (nunca resuelve): `then` es undefined en los stubs para
      // que `await stub` no se cuelgue, pero el splash inline usa fonts.ready.then.
      if (k === 'ready' && label === 'document.fonts') return new Promise(() => {});
      return makeStub(`${label}.${String(k)}`, listeners);
    },
    set() { return true; },
    has() { return true; },
    apply() { return makeStub(`${label}()`, listeners); },
    construct() { return makeStub(`new ${label}`, listeners); },
  });
}

function runVariant(dir, label) {
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script(?:\s+src="([^"]+)")?\s*>([\s\S]*?)<\/script>/g)]
    .map(m => ({ src: m[1], code: m[2] }))
    .filter(s => !s.src || !/^https?:/.test(s.src));
  const store = new Map();
  const baseline = new Set();
  const listeners = [];
  const stub = label => makeStub(label, listeners);
  const ctx = vm.createContext({});
  // Entorno mínimo: localStorage real en memoria, resto stubs.
  const ls = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
  Object.assign(ctx, {
    window: ctx, self: ctx, globalThis: ctx, top: ctx, parent: ctx,
    document: stub('document'), navigator: { userAgent: 'node-smoke', onLine: true, language: 'es' },
    location: { hostname: 'smoke.invalid', href: 'http://smoke.invalid/', protocol: 'http:', search: '', hash: '', origin: 'http://smoke.invalid', port: '', pathname: '/' },
    localStorage: ls, sessionStorage: { ...ls },
    firebase: undefined, // como si gstatic estuviera bloqueado: db.js cae a IndexedDB
    indexedDB: stub('indexedDB'), Capacitor: undefined,
    console: { log() {}, info() {}, debug() {}, warn() {}, error() {} },
    setTimeout: () => 0, setInterval: () => 0, clearTimeout() {}, clearInterval() {}, requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    addEventListener: type => { listeners.push(`window:${type}`); }, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    fetch: () => new Promise(() => {}), Image: function () { return stub('img'); }, Audio: function () { return stub('audio'); }, Notification: stub('Notification'),
    IntersectionObserver: function () { return { observe() {}, disconnect() {} }; }, ResizeObserver: function () { return { observe() {}, disconnect() {} }; },
    MutationObserver: function () { return { observe() {}, disconnect() {} }; }, getComputedStyle: () => stub('cs'),
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, screen: { width: 1280, height: 800 }, history: stub('history'),
    THREE: stub('THREE'), CustomEvent: function () {}, Event: function () {}, HTMLElement: function () {}, Element: function () {},
  });
  for (const k of Object.keys(ctx)) baseline.add(k);
  const errors = [];
  for (const s of scripts) {
    const name = s.src || 'inline';
    const code = s.src ? readFileSync(join(dir, s.src), 'utf8') : s.code;
    try { vm.runInContext(code, ctx, { filename: name }); }
    catch (e) { errors.push(`${name}: ${e && e.message}`); }
  }
  // Globales: declaraciones function/var van al contexto; let/const quedan en el scope script.
  const globals = new Set(Object.keys(ctx).filter(k => !baseline.has(k)));
  const lexical = new Set();
  for (const s of scripts) {
    const code = s.src ? readFileSync(join(dir, s.src), 'utf8') : s.code;
    for (const m of code.matchAll(/^(?:const|let|class)\s+([A-Za-z_$][\w$]*)/gm)) lexical.add(m[1]);
  }
  // Un const/let/class definido solo existe si el script llegó a ejecutarlo.
  const lexOk = new Set();
  for (const n of lexical) { try { if (vm.runInContext(`typeof ${n}`, ctx) !== 'undefined') lexOk.add(n); } catch {} }
  return { label, scripts: scripts.length, globals, lexOk, listeners, errors };
}

// Reconstruye dist/ para comparar contra el código actual.
execFileSync(process.execPath, [join(ROOT, 'scripts', 'build-web.mjs')], { stdio: 'inherit' });

const a = runVariant(join(ROOT, 'tsc-src'), 'tsc-src');
const b = runVariant(join(ROOT, 'dist'), 'dist');
const union = (r) => new Set([...r.globals, ...r.lexOk]);
const A = union(a), B = union(b);
const onlySrc = [...A].filter(x => !B.has(x)).sort();
const onlyDist = [...B].filter(x => !A.has(x)).sort();
// Listeners como multiconjunto: el mismo evento puede registrarse varias veces.
const tally = list => list.reduce((m, k) => m.set(k, (m.get(k) || 0) + 1), new Map());
const La = tally(a.listeners), Lb = tally(b.listeners);
const lostListeners = [...La].filter(([k, n]) => (Lb.get(k) || 0) < n).map(([k, n]) => `${k} (${n - (Lb.get(k) || 0)})`);
const extraListeners = [...Lb].filter(([k, n]) => (La.get(k) || 0) < n).map(([k, n]) => `${k} (${n - (La.get(k) || 0)})`);

for (const r of [a, b]) {
  console.log(`\n[${r.label}] ${r.scripts} scripts · ${union(r).size} globales (${r.globals.size} var/function + ${r.lexOk.size} let/const/class) · ${r.listeners.length} listeners · ${r.errors.length} errores de carga`);
  for (const e of r.errors) console.log('   ! ' + e);
}
console.log(`\nSolo en tsc-src (${onlySrc.length}): ${onlySrc.join(', ') || '—'}`);
console.log(`Solo en dist   (${onlyDist.length}): ${onlyDist.join(', ') || '—'}`);
console.log(`Listeners que faltan en dist (${lostListeners.length}): ${lostListeners.join(', ') || '—'}`);
console.log(`Listeners de más en dist     (${extraListeners.length}): ${extraListeners.join(', ') || '—'}`);
const msgs = r => r.errors.map(e => e.slice(e.indexOf(': ') + 2)).sort().join('|');
const errDiff = msgs(a) !== msgs(b);
if (errDiff) console.log('Los errores de carga difieren entre variantes.');
process.exitCode = onlySrc.length || onlyDist.length || lostListeners.length || extraListeners.length || errDiff ? 1 : 0;
console.log(process.exitCode ? '\nPARIDAD: FALLA' : '\nPARIDAD: OK');
