// Pruebas del componente «comparar antes de cambiar» (slice CMP).
// Carga tsc-src/js/mejoras-cambio.js en un contexto vm con sanitize.js, igual
// que lo hace el navegador (escHtml global), y comprueba los cuatro métodos
// públicos y las garantías del HTML del panel.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = path.join(__dirname, '..', 'tsc-src', 'js');
const fuente = fs.readFileSync(path.join(SRC, 'mejoras-cambio.js'), 'utf8');
const sanitize = fs.readFileSync(path.join(SRC, 'sanitize.js'), 'utf8');

const ctx = vm.createContext({ window: {} });
vm.runInContext(sanitize + '\n' + fuente, ctx, { filename: 'mejoras-cambio+viz.js' });
const MC = ctx.window.MEJORAS_CAMBIO;

const CLAVES_STATS = ['atk', 'def', 'equ', 'res', 'vm', 'ace', 'rsp', 'agi', 'pcd', 'vcd',
  'ppc', 'vpc', 'ppl', 'vpl', 'pre', 'pot', 'ted', 'psf', 'efe', 'cab', 'sal', 'tec', 'agr'];
const CLAVES_HAB = ['dribbling', 'dribbleKeeping', 'positioning', 'reaction', 'playmaker',
  'passing', 'striker', 'oneVOneShoot', 'postPlayer', 'linePos', 'midRange', 'side', 'center',
  'pkKick', 'oneTouchPass', 'outside', 'manMarkClose', 'sliding', 'manMark', 'dfLine',
  'pkKeeper', 'oneVOneKeeper', 'longThrow'];
const CLAVES_POS = ['CF', 'SS', 'WG', 'AMF', 'SMF', 'CMF', 'WB', 'DMF', 'SB', 'CB', 'CWP', 'GK'];

/* Jugador con la forma que arma mejoras-page.js. base = valor de los 26
   atributos del promedio; lo demás se puede pisar con op.*. */
function jugador(op) {
  op = op || {};
  const base = op.base == null ? 75 : op.base;
  const stats = {}; CLAVES_STATS.forEach(k => { stats[k] = base; });
  Object.assign(stats, op.stats || {});
  const sec = { ment: base, cons: 4, gk: base, teq: base, cond: 4, wff: 4, wfa: 4, inj: 'C' };
  Object.assign(sec, op.sec || {});
  const positions = {}; CLAVES_POS.forEach(k => { positions[k] = false; });
  Object.assign(positions, op.positions || {});
  const abilities = {}; CLAVES_HAB.forEach(k => { abilities[k] = false; });
  Object.assign(abilities, op.abilities || {});
  return {
    name: op.name == null ? 'Jugador' : op.name,
    dorsal: op.dorsal == null ? '7' : op.dorsal,
    tag: op.tag == null ? 'Portero' : op.tag,
    primaryPos: op.primaryPos == null ? 'GK' : op.primaryPos,
    stats, sec, positions, abilities,
  };
}
const panel = (sale, entra, op) => MC.htmlPanel(sale, entra, op || {});
const OP = { onVolver: 'elegirOtro', onConfirmar: 'hacerCambio' };

test('expone los cuatro métodos públicos', () => {
  assert.deepStrictEqual(Object.keys(MC).sort(), ['delta', 'htmlDelta', 'htmlPanel', 'promedio']);
  for (const f of Object.values(MC)) assert.strictEqual(typeof f, 'function');
});

test('promedio: media entera de los atributos 1–99 (23 stats + ment/gk/teq)', () => {
  assert.strictEqual(MC.promedio(jugador({ base: 80 })), 80);
  // (23×60 + 3×86) / 26 = 63 exacto
  assert.strictEqual(MC.promedio(jugador({ base: 60, sec: { ment: 86, gk: 86, teq: 86 } })), 63);
  // 2081 / 26 = 80,04 -> 80
  const uno = MC.promedio(jugador({ base: 80, stats: { atk: 81 } }));
  assert.strictEqual(uno, 80);
  assert.ok(Number.isInteger(uno));
});

test('promedio: ignora los secundarios de escala 1–8 y la resistencia a lesiones', () => {
  const a = jugador({ base: 70 });
  const b = jugador({ base: 70, sec: { cons: 8, cond: 8, wff: 8, wfa: 8, inj: 'A' } });
  assert.strictEqual(MC.promedio(a), MC.promedio(b));
});

test('promedio: sin atributos devuelve 0', () => {
  assert.strictEqual(MC.promedio(null), 0);
  assert.strictEqual(MC.promedio({}), 0);
});

test('delta: entra menos sale, sobre los promedios', () => {
  assert.strictEqual(MC.delta(jugador({ base: 74 }), jugador({ base: 80 })), 6);
  assert.strictEqual(MC.delta(jugador({ base: 80 }), jugador({ base: 74 })), -6);
  assert.strictEqual(MC.delta(jugador({ base: 70 }), jugador({ base: 70 })), 0);
});

test('htmlDelta: promedio del que entra y clase según el signo', () => {
  assert.strictEqual(MC.htmlDelta(jugador({ base: 74 }), jugador({ base: 80 })),
    '<span class="mc-delta mc-up">80 (+6)</span>');
  assert.strictEqual(MC.htmlDelta(jugador({ base: 80 }), jugador({ base: 74 })),
    '<span class="mc-delta mc-down">74 (-6)</span>');
  assert.strictEqual(MC.htmlDelta(jugador({ base: 70 }), jugador({ base: 70 })),
    '<span class="mc-delta mc-eq">70 (0)</span>');
});

test('htmlPanel: escapa los nombres con HTML', () => {
  const html = panel(jugador({ name: '<script>alert(1)</script>' }),
    jugador({ name: '<img src=x onerror=alert(1)>' }), OP);
  assert.ok(!html.includes('<script'), 'quedó un <script sin escapar');
  assert.ok(!html.includes('<img'), 'quedó un <img sin escapar');
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('htmlPanel: sin habilidades no muestra la columna', () => {
  const sin = panel(jugador({}), jugador({}), OP);
  assert.ok(!sin.includes('mc-col-hab'), 'no debería existir la columna de habilidades');
  assert.ok(!sin.includes('Habilidades'), 'no debería aparecer el título Habilidades');
  assert.ok(sin.includes('Posiciones'), 'las posiciones sí se muestran');
});

test('htmlPanel: muestra solo las habilidades que tiene', () => {
  const html = panel(jugador({ abilities: { dribbling: true } }),
    jugador({ abilities: { passing: true, longThrow: true } }), OP);
  assert.ok(html.includes('mc-col-hab'));
  assert.ok(html.includes('Regate'));
  assert.ok(html.includes('Pase'));
  assert.ok(html.includes('Hab. saque largo'));
  assert.ok(!html.includes('Marcaje'), 'no debe listar habilidades que no tiene');
});

test('htmlPanel: usa data-onclick con los nombres de opciones y nunca onclick', () => {
  const html = panel(jugador({}), jugador({}), OP);
  assert.ok(html.includes('data-onclick="elegirOtro()"'));
  assert.ok(html.includes('data-onclick="hacerCambio()"'));
  assert.ok(!/(?<![-\w])onclick\s*=/i.test(html), 'hay un onclick= suelto (debe ser data-onclick)');
  // sin opciones válidas el panel no inventa handlers
  assert.ok(!panel(jugador({}), jugador({}), {}).includes('data-onclick'));
  assert.ok(!panel(jugador({}), jugador({}), { onVolver: 'mal nombre();' }).includes('data-onclick'));
});

test('htmlPanel: una fila por atributo, con el mayor resaltado', () => {
  const html = panel(jugador({ base: 60 }), jugador({ base: 90 }), OP);
  assert.strictEqual((html.match(/class="mc-row"/g) || []).length, 26);
  assert.ok(html.includes('Ataque'));
  assert.ok(html.includes('Cualidades de portero'));
  // el que entra gana todas: cada fila tiene un solo mc-best (el de la derecha)
  assert.strictEqual((html.match(/mc-val mc-val-in mc-best/g) || []).length, 26);
  assert.strictEqual((html.match(/mc-val mc-val-out mc-best/g) || []).length, 0);
});

test('htmlPanel: posiciones con el color de su línea', () => {
  const html = panel(jugador({ positions: { CB: true, SB: true } }),
    jugador({ positions: { CF: true }, primaryPos: 'CF' }), OP);
  assert.ok(html.includes('mc-pos mc-pos-def'));
  assert.ok(html.includes('mc-pos mc-pos-att'));
  assert.ok(html.includes('>CB<'));
  assert.ok(html.includes('>CF<'));
});
