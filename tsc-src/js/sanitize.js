'use strict';

/* ----------------------------------------------------------
   ESCAPE Y URLS SEGURAS — helper único (slice 0.1, H-01)
   ----------------------------------------------------------
   Todo dato que escribe un rol no admin (presidente: teams.name/logo;
   usuario: displayName/photoURL/username) y termina en innerHTML pasa
   por acá. Se carga justo después de state.js para que esté disponible
   en todos los módulos.
   ---------------------------------------------------------- */

const _ESC_MAP = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };

/* Texto dentro de un elemento. */
function escHtml(v){
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => _ESC_MAP[c]);
}

/* Valor de un atributo entre comillas (dobles o simples). */
function escAttr(v){
  return escHtml(v);
}

/* URL de imagen aceptable para <img src>. Solo admite https:, rutas
   relativas a assets/ y data:image/. Cualquier otra cosa devuelve '' y
   el que llama muestra el fallback de iniciales. El resultado ya va
   escapado para usarse dentro de src="…". */
function safeImgUrl(v){
  if (typeof v !== 'string') return '';
  const s = v.trim();
  if (!s) return '';
  const ok = /^https:\/\//i.test(s)
          || /^(?:\.\/)?assets\//.test(s)
          || /^data:image\//i.test(s);
  return ok ? escAttr(s) : '';
}

/* Color CSS para style="background:…". Solo hex, rgb()/hsl() simples
   y var(--x); si no, el fallback. */
function safeCssColor(v, fallback){
  const fb = fallback || '#333';
  if (typeof v !== 'string') return fb;
  const s = v.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(s)) return s;
  if (/^(?:rgb|hsl)a?\([\d\s.,%/]+\)$/i.test(s)) return s;
  if (/^var\(--[\w-]+\)$/.test(s)) return s;
  return fb;
}
