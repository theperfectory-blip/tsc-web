'use strict';
/* ============================================================
   DELEGACIÓN DE EVENTOS (MS-7.5, H-05)
   ------------------------------------------------------------
   Los handlers van en atributos data-onclick (texto «abrirX(1,'a',this)»; también
   data-onchange, data-oninput, data-onkeydown, data-onpointerdown,
   data-onmouseover/out y los de drag) en vez de onclick="…". Así la CSP
   no necesita 'unsafe-inline' en script-src.

   Un solo listener por tipo en `document` recorre el camino del evento
   (del target hacia arriba, como el burbujeo de un onclick inline) y
   ejecuta cada data-on* que encuentra. No hay eval: el texto se lee con
   una gramática chica y fija, la de todos los handlers de la app:

     handler := sentencia (';' sentencia)* [';']
     sentencia := 'return' [valor] | ruta '(' [valor (',' valor)*] ')'
     valor := número | 'texto' | "texto" | true | false | null | undefined
            | ruta            (this, event, window o una global, con .props)
     ruta := nombre ('.' nombre)*

   `this` es el elemento del atributo; `event`, el evento con
   `currentTarget` apuntando a ese elemento (como en un handler inline).
   `return false` hace preventDefault. Un handler que no cumple la
   gramática no corre y deja el error en consola.
   ============================================================ */
const _ON_TYPES = ['click','change','input','keydown','pointerdown','mouseover','mouseout',
  'dragstart','dragover','dragleave','dragend','drop'];
const _onCache = new Map();

function _onTokens(src){
  const out = [];
  let i = 0;
  while(i < src.length){
    const c = src[i];
    if(/\s/.test(c)){ i++; continue; }
    if(c==="'" || c==='"'){
      let s = ''; i++;
      while(i < src.length && src[i] !== c){
        if(src[i] === '\\'){
          const n = src[++i];
          if(n === 'u'){ s += String.fromCharCode(parseInt(src.substr(i+1,4),16)); i += 5; continue; }
          if(n === 'x'){ s += String.fromCharCode(parseInt(src.substr(i+1,2),16)); i += 3; continue; }
          s += ({n:'\n', t:'\t', r:'\r', b:'\b', f:'\f', v:'\v', '0':'\0'})[n] ?? n; i++; continue;
        }
        s += src[i++];
      }
      if(i >= src.length) throw new Error('texto sin cerrar');
      i++; out.push({t:'lit', v:s}); continue;
    }
    const num = /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(src.slice(i));
    if(num && (c === '-' || /\d|\./.test(c))){ out.push({t:'lit', v:Number(num[0])}); i += num[0].length; continue; }
    const id = /^[A-Za-z_$][\w$]*/.exec(src.slice(i));
    if(id){ out.push({t:'id', v:id[0]}); i += id[0].length; continue; }
    if('(),.;'.includes(c)){ out.push({t:c}); i++; continue; }
    throw new Error(`carácter inesperado «${c}»`);
  }
  return out;
}

/* Texto del handler → lista de sentencias. Exportada para los tests. */
function _onParse(src){
  const tk = _onTokens(src);
  let p = 0;
  const peek = t => tk[p] && tk[p].t === t;
  const eat = t => { if(!peek(t)) throw new Error(`se esperaba «${t}»`); return tk[p++]; };
  const KW = {true:true, false:false, null:null, undefined:undefined};
  function path(){
    const names = [eat('id').v];
    while(peek('.')){ p++; names.push(eat('id').v); }
    return names;
  }
  function value(){
    if(peek('lit')) return {lit: tk[p++].v};
    if(peek('id') && Object.prototype.hasOwnProperty.call(KW, tk[p].v) && !(tk[p+1] && tk[p+1].t === '.'))
      return {lit: KW[tk[p++].v]};
    const names = path();
    if(peek('(')) throw new Error('llamada dentro de un argumento');
    return {ref: names};
  }
  const stmts = [];
  while(p < tk.length){
    if(peek(';')){ p++; continue; }
    if(peek('id') && tk[p].v === 'return'){
      p++;
      stmts.push({ret: (p < tk.length && !peek(';')) ? value() : {lit: undefined}});
      continue;
    }
    const names = path();
    eat('(');
    const args = [];
    if(!peek(')')){
      args.push(value());
      while(peek(',')){ p++; args.push(value()); }
    }
    eat(')');
    stmts.push({call: names, args});
    if(p < tk.length && !peek(';')) throw new Error('se esperaba «;»');
  }
  return stmts;
}

const _ON_EVENT_METHODS = new Set(['stopPropagation','preventDefault']);
const _onNativeSrc = Function.prototype.toString;
function _onIsNative(fn){
  try { return /\{\s*\[native code\]\s*\}\s*$/.test(_onNativeSrc.call(fn)); } catch(_){ return true; }
}

function _onEventFor(e, el){
  return new Proxy(e, {
    get(t, k){
      if(k === 'currentTarget') return el;
      const v = Reflect.get(t, k, t);
      return typeof v === 'function' ? v.bind(t) : v;
    }
  });
}

function _onResolve(names, el, ev){
  const root = names[0];
  let obj = root === 'this' ? el : root === 'event' ? ev : root === 'window' ? window : window[root];
  if(obj === undefined && root !== 'this' && !(root in window)) throw new Error(`«${root}» no existe`);
  for(let i = 1; i < names.length; i++){
    if(obj == null) throw new Error(`«${names.slice(0, i).join('.')}» es ${obj}`);
    obj = obj[names[i]];
  }
  return obj;
}

function _onRun(src, el, e){
  let stmts = _onCache.get(src);
  if(!stmts){ stmts = _onParse(src); _onCache.set(src, stmts); }
  const ev = _onEventFor(e, el);
  const val = a => 'lit' in a ? a.lit : _onResolve(a.ref, el, ev);
  for(const s of stmts){
    if(s.ret){ if(val(s.ret) === false) e.preventDefault(); return; }
    // Solo funciones de la app (globales escritas en js/) o event.stopPropagation /
    // preventDefault. Nada nativo (fetch, eval, setTimeout, location…): un
    // data-on* inyectado no puede usarse para saltar la CSP.
    let owner, fn;
    if(s.call.length === 2 && s.call[0] === 'event' && _ON_EVENT_METHODS.has(s.call[1])){
      owner = ev; fn = ev[s.call[1]];
    } else if(s.call.length === 1){
      fn = _onResolve(s.call, el, ev);
      if(typeof fn === 'function' && _onIsNative(fn)) throw new Error(`«${s.call[0]}» no es una función de la app`);
    } else throw new Error(`«${s.call.join('.')}»: solo se llaman funciones globales de la app`);
    if(typeof fn !== 'function') throw new Error(`«${s.call.join('.')}» no es una función`);
    fn.apply(owner, s.args.map(val));
  }
}

if(typeof document !== 'undefined'){
  _ON_TYPES.forEach(type => {
    const attr = 'data-on' + type;
    document.addEventListener(type, e => {
      // composedPath: el camino que tenía el evento al despacharse, aunque un
      // handler saque el elemento del DOM (un re-render) a mitad de camino.
      for(const el of e.composedPath()){
        if(el === document || el === window) break;
        if(el.nodeType !== 1 || !el.hasAttribute(attr)) continue;
        try { _onRun(el.getAttribute(attr), el, e); }
        catch(err){ console.error(`[eventos] ${attr}="${el.getAttribute(attr)}":`, err); }
        if(e.cancelBubble) break;
      }
    });
  });
}

/* ---------- Ayudas para los handlers de una línea ---------- */
// Estilos de hover: _tscStyle(this,'color','var(--red)','borderColor','…')
function _tscStyle(el, ...pairs){
  for(let i = 0; i + 1 < pairs.length; i += 2) el.style[pairs[i]] = pairs[i+1];
}
function _tscClear(id){ const el = document.getElementById(id); if(el) el.innerHTML = ''; }
function _tscRemove(id){ document.getElementById(id)?.remove(); }
function _tscClick(id){ document.getElementById(id)?.click(); }
function _tscShow(id, on){ const el = document.getElementById(id); if(el) el.style.display = on ? 'block' : 'none'; }
function _tscSetValue(el, v){ el.value = v; }
function _tscRemoveParent(el){ el.parentElement?.remove(); }

if(typeof module !== 'undefined') module.exports = { _onParse };
