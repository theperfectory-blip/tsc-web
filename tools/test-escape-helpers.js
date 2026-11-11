// Guarda contra helpers de escape sin definir (caso 2.1-B: `_esc(` quedo sin definicion
// tras 7.1 y romped el modal «Editar» de equipos en produccion).
// Falla si alguna llamada a una funcion con nombre de escape (esc*, _esc*, escape*)
// en tsc-src/js no tiene definicion en ningun archivo de tsc-src/js.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const JS_DIR = path.join(__dirname, '..', 'tsc-src', 'js');
const archivos = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js')).sort();
const fuentes = archivos.map(f => ({ f, code: fs.readFileSync(path.join(JS_DIR, f), 'utf8') }));

// Nombres definidos en cualquier archivo (globales o locales).
const definidos = new Set();
for (const { code } of fuentes) {
  for (const m of code.matchAll(/(?:function\s+|const\s+|let\s+|var\s+)([A-Za-z_$][\w$]*)/g)) definidos.add(m[1]);
  for (const m of code.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) definidos.add(m[1]);
}

// Llamadas a un nombre de escape que no es metodo (sin punto delante).
// Solo nombres de helper de escape: _esc*, escape*, esc y escHtml/escAttr/escUrl/escJs.
// (No `esc\w*` a secas: `escalar(`, `escritura(` no son escapes.)
const LLAMADA = /(?<![\w$.])(_esc[\w$]*|escape[\w$]*|esc(?:Html|Attr|Url|Js)?)\s*\(/g;

test('todo helper de escape llamado en tsc-src/js tiene definicion', () => {
  const sinDefinir = [];
  for (const { f, code } of fuentes) {
    code.split('\n').forEach((linea, i) => {
      for (const m of linea.matchAll(LLAMADA)) {
        if (!definidos.has(m[1])) sinDefinir.push(`${f}:${i + 1} -> ${m[1]}(`);
      }
    });
  }
  assert.deepStrictEqual(sinDefinir, [], 'helpers de escape sin definir:\n' + sinDefinir.join('\n'));
});

test('escAttr escapa comillas, < y > (caso streamlabsUser del modal de equipos)', () => {
  const vm = require('node:vm');
  const src = fs.readFileSync(path.join(JS_DIR, 'sanitize.js'), 'utf8');
  const { escAttr, escHtml } = vm.runInNewContext(src + '\n({escAttr, escHtml})', {});
  const malo = `"><img src=x onerror=alert(1)>'\``;
  const out = escAttr(malo);
  assert.ok(!/["'<>`]/.test(out), 'quedo algun caracter peligroso: ' + out);
  assert.strictEqual(escAttr('LuisYuNa3210'), 'LuisYuNa3210');
  assert.strictEqual(escHtml('<b>'), '&lt;b&gt;');
});

test('los helpers de sanitize.js siguen existiendo', () => {
  for (const nombre of ['escHtml', 'escAttr', 'safeImgUrl']) {
    assert.ok(definidos.has(nombre), `falta ${nombre} en tsc-src/js/sanitize.js`);
  }
});
