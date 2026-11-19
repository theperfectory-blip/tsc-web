// Pruebas del componente «comparar antes de cambiar» (slices CMP2 y CMP3).
// Carga tsc-src/js/mejoras-cambio.js en un contexto vm con sanitize.js, igual
// que lo hace el navegador (escHtml global), y comprueba los métodos públicos
// y las garantías de las dos tarjetas en línea: la ficha de un jugador (con el
// color de su rol y las mismas piezas) y la comparación SALE / ENTRA en dos
// mitades.
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
    height: op.height === undefined ? 178 : op.height,
    age: op.age === undefined ? 25 : op.age,
    foot: op.foot === undefined ? 'Der.' : op.foot,
    stats, sec, positions, abilities,
  };
}
const panel = (sale, entra, op) => MC.htmlPanel(sale, entra, op || {});
const ficha = (jugador, op) => MC.htmlFicha(jugador, op || {});
const OP = { onVolver: 'elegirOtro', onConfirmar: 'hacerCambio' };

/* Texto de las dos mitades de una sección de listas (Habilidades / Posiciones).
   Devuelve { izq, der } del primer bloque cuyo título es «titulo». */
function mitades(html, titulo) {
  const inicio = html.indexOf('<h3 class="mc-grp-hd">' + titulo + '</h3>');
  assert.ok(inicio >= 0, 'falta la sección ' + titulo);
  const fin = html.indexOf('</section>', inicio);
  const bloque = html.slice(inicio, fin);
  const trozos = bloque.split('class="mc-half mc-half-in"');
  assert.strictEqual(trozos.length, 2, 'la sección ' + titulo + ' debe tener dos mitades');
  return { izq: trozos[0], der: trozos[1] };
}

test('expone los cinco métodos públicos', () => {
  assert.deepStrictEqual(Object.keys(MC).sort(),
    ['delta', 'htmlDelta', 'htmlFicha', 'htmlPanel', 'promedio']);
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

test('htmlPanel y htmlFicha: escapan los nombres con HTML', () => {
  const html = panel(jugador({ name: '<script>alert(1)</script>' }),
    jugador({ name: '<img src=x onerror=alert(1)>' }), OP);
  assert.ok(!html.includes('<script'), 'quedó un <script sin escapar');
  assert.ok(!html.includes('<img'), 'quedó un <img sin escapar');
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));

  const f = ficha(jugador({ name: '<b>Raro</b>' }));
  assert.ok(!f.includes('<b>Raro</b>'));
  assert.ok(f.includes('&lt;b&gt;Raro&lt;/b&gt;'));
});

test('htmlPanel: una fila por atributo principal y secundario 99, con el mayor resaltado', () => {
  const html = panel(jugador({ base: 60 }), jugador({ base: 90 }), OP);
  assert.strictEqual((html.match(/class="mc-row"/g) || []).length, 26);
  assert.strictEqual((html.match(/class="mc-row mc-row-sm"/g) || []).length, 5); // 1–8 y lesión
  assert.ok(html.includes('Ataque'));
  assert.ok(html.includes('Cualidades de portero'));
  // el que entra gana todas: cada fila tiene un solo mc-best (el de la derecha)
  assert.strictEqual((html.match(/mc-val mc-val-in mc-best/g) || []).length, 26);
  assert.strictEqual((html.match(/mc-val mc-val-out mc-best/g) || []).length, 0);
});

test('htmlPanel: muestra los secundarios y la resistencia a lesiones', () => {
  const html = panel(jugador({ sec: { inj: 'A', cons: 8, cond: 7, wff: 6, wfa: 5 } }),
    jugador({ sec: { inj: 'C', cons: 3, cond: 2, wff: 1, wfa: 1 } }), OP);
  for (const nombre of ['Mentalidad', 'Regularidad en el juego', 'Cualidades de portero',
    'Trabajo en equipo', 'Estabilidad', 'Frec. pie malo', 'Prec. pie malo', 'Res. lesión']) {
    assert.ok(html.includes(nombre), 'falta el secundario ' + nombre);
  }
  // la lesión A del que sale es la mejor: se resalta a la izquierda
  const filaLesion = html.slice(html.indexOf('Res. lesión') - 260, html.indexOf('Res. lesión'));
  assert.ok(filaLesion.includes('mc-val mc-val-out mc-best'));
  assert.ok(filaLesion.includes('>A<'));
});

test('htmlPanel: posiciones a cada lado (sale a la izquierda, entra a la derecha)', () => {
  const html = panel(jugador({ positions: { CB: true }, primaryPos: 'CB' }),
    jugador({ positions: { CF: true }, primaryPos: 'CF' }), OP);
  const { izq, der } = mitades(html, 'Posiciones');
  assert.ok(izq.includes('>CB<'), 'la posición del que sale debe quedar a la izquierda');
  assert.ok(!izq.includes('>CF<'), 'la posición del que entra no debe quedar a la izquierda');
  assert.ok(der.includes('>CF<'), 'la posición del que entra debe quedar a la derecha');
  assert.ok(!der.includes('>CB<'), 'la posición del que sale no debe quedar a la derecha');
  assert.ok(html.includes('mc-pos mc-pos-def'));
  assert.ok(html.includes('mc-pos mc-pos-att'));
});

test('htmlPanel: marca la posición principal en cada mitad', () => {
  const html = panel(jugador({ positions: { CB: true, SB: true }, primaryPos: 'CB' }),
    jugador({ positions: { CF: true, SS: true }, primaryPos: 'CF' }), OP);
  assert.ok(html.includes('class="mc-pos mc-pos-def mc-pos-main" title="Central · Principal">CB'));
  assert.ok(html.includes('class="mc-pos mc-pos-att mc-pos-main" title="Delantero centro · Principal">CF'));
});

test('htmlPanel: altura, edad y pie del que sale a la izquierda y del que entra a la derecha', () => {
  const html = panel(jugador({ height: 170, age: 21, foot: 'Izq.' }),
    jugador({ height: 190, age: 30, foot: 'Der.' }), OP);
  assert.ok(html.includes('>Datos<'));
  assert.ok(html.indexOf('170 cm') < html.indexOf('190 cm'), 'altura del que sale a la izquierda');
  assert.ok(html.indexOf('21<') < html.indexOf('30<'), 'edad del que sale a la izquierda');
  assert.ok(html.includes('Izq.') && html.includes('Der.'));
  assert.strictEqual((html.match(/mc-row mc-row-data/g) || []).length, 3);
});

test('htmlPanel: sin habilidades no muestra el bloque', () => {
  const sin = panel(jugador({}), jugador({}), OP);
  assert.ok(!sin.includes('Habilidades'), 'no debería aparecer el título Habilidades');
  assert.ok(sin.includes('Posiciones'), 'las posiciones sí se muestran');
});

test('htmlPanel: habilidades del que sale a la izquierda y del que entra a la derecha', () => {
  const html = panel(jugador({ abilities: { dribbling: true } }),
    jugador({ abilities: { passing: true, longThrow: true } }), OP);
  const { izq, der } = mitades(html, 'Habilidades');
  assert.ok(izq.includes('Regate'), 'Regate (sale) debe ir a la izquierda');
  assert.ok(!izq.includes('Pase<'), 'Pase (entra) no debe ir a la izquierda');
  assert.ok(der.includes('Pase<'), 'Pase (entra) debe ir a la derecha');
  assert.ok(der.includes('Hab. saque largo'));
  assert.ok(!html.includes('Marcaje'), 'no debe listar habilidades que no tiene');
});

test('htmlPanel: usa data-onclick con los nombres de opciones y nunca onclick', () => {
  const html = panel(jugador({}), jugador({}), OP);
  assert.ok(html.includes('data-onclick="elegirOtro()"'));
  assert.ok(html.includes('data-onclick="hacerCambio()"'));
  assert.ok(!/(?<![-\w])onclick\s*=/i.test(html), 'hay un onclick= suelto (debe ser data-onclick)');
  // sin opciones válidas la tarjeta no inventa handlers
  assert.ok(!panel(jugador({}), jugador({}), {}).includes('data-onclick'));
  assert.ok(!panel(jugador({}), jugador({}), { onVolver: 'mal nombre();' }).includes('data-onclick'));
});

test('htmlPanel: los botones van al final y «Hacer el cambio» se apaga en pausa', () => {
  const html = panel(jugador({}), jugador({}), OP);
  assert.ok(html.indexOf('mc-actions') > html.indexOf('Posiciones'),
    'las acciones van después de las posiciones, dentro del flujo');
  assert.ok(!html.includes('disabled'), 'sin pausa el botón queda activo');

  const bloqueado = panel(jugador({}), jugador({}), Object.assign({ bloqueado: true }, OP));
  assert.ok(bloqueado.includes(
    'class="mc-btn mc-btn-go" data-onclick="hacerCambio()" disabled aria-disabled="true"'));
  // «Elegir otro» sigue activo
  assert.ok(bloqueado.includes('class="mc-btn" data-onclick="elegirOtro()"'));
});

test('htmlPanel: no es una hoja ni un panel flotante (sin velo ni dialog)', () => {
  const html = panel(jugador({}), jugador({}), OP);
  assert.ok(!html.includes('mc-velo'));
  assert.ok(!html.includes('role="dialog"'));
  assert.ok(html.includes('class="mc-panel mc-cmp"'));
});

test('htmlFicha: las mismas piezas que la comparación, con un jugador a todo el ancho', () => {
  const f = ficha(jugador({ name: 'Uno', base: 75, stats: { atk: 90 },
    sec: { inj: 'B', cons: 6, cond: 5, wff: 3, wfa: 2 } }));
  for (const titulo of ['Principales', 'Secundarios', 'Datos', 'Posiciones']) {
    assert.ok(f.includes('>' + titulo + '<'), 'falta la sección ' + titulo);
  }
  assert.ok(f.includes('Ataque'));
  assert.ok(f.includes('Res. lesión'));
  assert.ok(f.includes('Regularidad en el juego'));
  assert.ok(f.includes('Altura') && f.includes('178 cm'));
  assert.ok(f.includes('Edad') && f.includes('25'));
  assert.ok(f.includes('Pie') && f.includes('Der.'));
  // mismas clases de fila y de barra que htmlPanel
  assert.strictEqual((f.match(/class="mc-row"/g) || []).length, 26);
  assert.strictEqual((f.match(/class="mc-row mc-row-sm"/g) || []).length, 5);
  assert.ok(f.includes('mc-stats'));
  assert.ok(f.includes('mc-bar mc-bar-out'));
  assert.ok(f.includes('mc-val mc-val-out'));
  // una sola barra por fila (no dos mitades) y de izquierda a derecha
  assert.strictEqual((f.match(/mc-bar /g) || []).length, 26 + 5);
  assert.ok(f.includes('<span class="mc-lbl">Ataque</span><span class="mc-bar mc-bar-out"'));
  assert.ok(f.includes('width:90.9%'), 'la barra de Ataque (90/99) debe medir 90,9 %');
  assert.ok(!f.includes('mc-actions'), 'sin acciones: no hay cambio que confirmar');
  assert.ok(!f.includes('mc-halves'), 'la ficha no se parte en dos mitades');
});

test('htmlFicha: color según el rol (titular rojo, suplente o reserva verde)', () => {
  const sale = ficha(jugador({}), { rol: 'sale' });
  assert.ok(sale.includes('class="mc-panel mc-ficha mc-ficha-sale"'));
  assert.ok(sale.includes('mc-bar mc-bar-out'));
  assert.ok(sale.includes('mc-val mc-val-out'));
  assert.ok(!sale.includes('mc-bar-in'), 'el titular no lleva barras verdes');

  const entra = ficha(jugador({}), { rol: 'entra' });
  assert.ok(entra.includes('class="mc-panel mc-ficha mc-ficha-entra"'));
  assert.ok(entra.includes('mc-bar mc-bar-in'));
  assert.ok(entra.includes('mc-val mc-val-in'));
  assert.ok(!entra.includes('mc-bar-out'), 'el que entra no lleva barras rojas');

  // por defecto (sin rol) se pinta como el que sale, igual que en htmlPanel
  assert.ok(ficha(jugador({})).includes('mc-ficha-sale'));
});

test('htmlFicha: encabezado con nombre, posición y dorsal', () => {
  const f = ficha(jugador({ name: 'Uno', dorsal: '9', primaryPos: 'CB' }), { rol: 'sale' });
  assert.ok(f.includes('<span class="mc-fname">Uno</span>'));
  assert.ok(f.includes('<span class="mc-fpos mc-pos-def">CB</span>'));
  assert.ok(f.includes('<span class="mc-fdorsal">#9</span>'));
});

test('htmlFicha: escapa el nombre y el dorsal con HTML', () => {
  const f = ficha(jugador({ name: '<b>Raro</b>' }));
  assert.ok(!f.includes('<b>Raro</b>'));
  assert.ok(f.includes('&lt;b&gt;Raro&lt;/b&gt;'));

  const d = ficha(jugador({ dorsal: '<img src=x>' }));
  assert.ok(!d.includes('<img'));
  assert.ok(d.includes('&lt;img src=x&gt;'));
});

test('htmlFicha: habilidades solo si tiene y posición principal marcada', () => {
  const con = ficha(jugador({ primaryPos: 'CF', positions: { CF: true, SS: true },
    abilities: { striker: true } }));
  assert.ok(con.includes('Habilidades'));
  assert.ok(con.includes('Hab. goleadora'));
  assert.ok(con.includes('mc-pos-att mc-pos-main'));

  const sin = ficha(jugador({}));
  assert.ok(!sin.includes('Habilidades'), 'sin habilidades no se muestra el bloque');
  assert.ok(sin.includes('Posiciones'));
});

test('htmlPanel con un solo jugador devuelve la ficha con el rol correcto', () => {
  assert.ok(panel(jugador({}), null, OP).includes('mc-ficha-sale'));
  assert.ok(panel(null, jugador({}), OP).includes('mc-ficha-entra'));
  assert.strictEqual(panel(null, null, OP), '');
});

test('htmlFicha: sin jugador devuelve cadena vacía', () => {
  assert.strictEqual(ficha(null), '');
});
