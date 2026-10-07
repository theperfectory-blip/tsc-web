// Slice P: pes5-plantilla.js (posiciones, O, banda, Carrilero/Lateral) y la regla maxPositions.
// Uso: node test-slice-p-plantilla.js   (el save real se abre en SOLO LECTURA)
const fs = require('fs'), path = require('path'), vm = require('vm');
const { TextDecoder } = require('util');
const { descifrar } = require('./pes5-crypt.js');
const JS_DIR = path.join(__dirname, '..', '..', '..', 'js');
const SAVE_REAL = process.env.PES5_SAVE || 'C:/Users/Administrator/Documents/KONAMI/Pro Evolution Soccer 5/save/folder1/KONAMI-WIN32PES5OPT';
const P = require('../../../js/pes5-plantilla.js');
const R = require('../../../js/yunacoins-rules.js');
const sb = { console, TextDecoder, fetch: async (u) => ({ json: async () => JSON.parse(fs.readFileSync(path.join(JS_DIR, 'pes5', u.split('/').pop()), 'utf8')) }) };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(JS_DIR, 'pes5-editor.js'), 'utf8') + '\nthis.E = PES5_EDITOR;', sb);
const E = sb.E;
let fallas = 0, n = 0;
const ok = (c, m) => { n++; if (c) console.log('OK   — ' + m); else { console.log('FALLO — ' + m); fallas++; } };
const J = (x) => JSON.stringify(x);

(async () => {
  await E.cargarMapa('./');
  const plano = descifrar(new Uint8Array(fs.readFileSync(SAVE_REAL)));

  // ---- Carrilero/Lateral ----
  ok(P.POSITION_MAP.WB === 'Lateral' && P.POSITION_MAP.SB === 'Carrilero', 'POSITION_MAP: WB=Lateral, SB=Carrilero');
  ok(P.POSITION_LABEL.WB === 'Lateral' && P.POSITION_LABEL.SB === 'Carrilero', 'POSITION_LABEL: WB=Lateral, SB=Carrilero');
  ok(P.BUCKET_BY_POS && P.BUCKET_BY_POS.WB === 'ME' && P.BUCKET_BY_POS.SB === 'DE', 'BUCKET_BY_POS: WB=ME, SB=DE');

  // ---- Stranzl en formato editor ----
  const s = P.jugadorParaEditor(E, plano, 2, 0);
  ok(s.primaryPos === 'SB' && s.tag === 'Carrilero', `Stranzl: primaryPos SB / tag Carrilero (${s.primaryPos}/${s.tag})`);
  ok(s.bucket === 'DE', `Stranzl: bucket DE (${s.bucket})`);
  ok(s.positions.CB && s.positions.SB && s.positions.WB && s.positions.SMF && !s.positions.GK && !s.positions.CF, 'Stranzl: marcadas CB, SB(Carrilero), WB(Lateral), SMF(Volante)');
  ok(['D', 'I', 'A'].includes(s.side), `Stranzl: side definido (${s.side})`);

  // ---- ida y vuelta de cambios ----
  const nuevo = J(s); const d = JSON.parse(nuevo);
  d.positions.GK = true; d.positions.SB = true; d.primaryPos = 'GK'; d.side = s.side === 'A' ? 'D' : 'A';
  const cc = P.cambiosDesdeEditor(s, d);
  ok(Array.isArray(cc.posiciones) && cc.posiciones.includes('Portero') && cc.posiciones.includes('Carrilero'), `cambiosDesdeEditor emite posiciones (${J(cc.posiciones)})`);
  ok(cc.posicionRegistrada === 'Portero', 'cambiosDesdeEditor emite posicionRegistrada = Portero');
  ok(cc.banda === (d.side === 'A' ? 'ambas' : 'der'), `cambiosDesdeEditor emite banda (${cc.banda})`);
  const antes = J(s);
  const x = P.aplicarCambiosAlJugador(s, cc);
  ok(J(s) === antes, 'aplicarCambiosAlJugador no muta el original');
  ok(x.positions.GK === true && x.primaryPos === 'GK' && x.tag === 'Portero' && x.bucket === 'PT' && x.side === d.side, 'aplicar: posiciones, primaryPos, tag, bucket y side');
  ok(J(P.cambiosDesdeEditor(s, x)) === J(cc), 'ida y vuelta: cambiosDesdeEditor(o, aplicar(o, cc)) === cc');
  ok(!('posiciones' in P.cambiosDesdeEditor(s, JSON.parse(antes))), 'sin cambios no emite posiciones');
  // el orden de las claves no cuenta
  const d2 = JSON.parse(antes); const rev = {}; Object.keys(d2.positions).reverse().forEach(k => rev[k] = d2.positions[k]); d2.positions = rev;
  const c2 = P.cambiosDesdeEditor(s, d2);
  ok(!('posiciones' in c2) && !('posicionRegistrada' in c2), 'cambiar solo el orden de las claves no emite cambios de posiciones');
  // solo la O, sin tocar el conjunto
  const d3 = JSON.parse(antes); d3.primaryPos = 'WB';
  const c3 = P.cambiosDesdeEditor(s, d3);
  ok(c3.posicionRegistrada === 'Lateral' && !('posiciones' in c3), `solo mover la O: posicionRegistrada=Lateral y sin posiciones (${J(c3)})`);
  // los cambios de la tool entran al save sin filtros y se leen igual
  const copia = Uint8Array.from(plano);
  E.escribirJugadorCompleto(copia, 2, cc);
  const s2 = P.jugadorParaEditor(E, copia, 2, 0);
  ok(s2.primaryPos === 'GK' && s2.positions.GK && s2.side === d.side, `escribir cc al save y releer: O=GK, GK marcado, side=${d.side}`);

  // ---- regla maxPositions ----
  const def = R.DEFAULT_RULES || (R.reglasPorDefecto && R.reglasPorDefecto());
  ok(def && def.maxPositions === 5, `maxPositions por defecto = 5 (${def && def.maxPositions})`);
  const base = Object.assign({}, def);
  ok(R.validarReglas(Object.assign({}, base, { maxPositions: 1 })).length === 0, 'maxPositions 1 valido');
  ok(R.validarReglas(Object.assign({}, base, { maxPositions: 12 })).length === 0, 'maxPositions 12 valido');
  for (const malo of [0, 13, 2.5, '5', null]) ok(R.validarReglas(Object.assign({}, base, { maxPositions: malo })).length > 0, `maxPositions ${J(malo)} invalido`);
  ok(R.normalizarReglas({ maxPositions: 7 }).maxPositions === 7, 'normalizarReglas conserva maxPositions 7');
  ok(R.normalizarReglas({}).maxPositions === 5, 'normalizarReglas sin dato usa 5');
  ok(R.normalizarReglas({ maxPositions: 99 }).maxPositions === 5, 'normalizarReglas con dato invalido vuelve al default');

  console.log(`\n${n} aserciones. ${fallas === 0 ? 'TODO OK' : fallas + ' FALLO(S)'}`);
  process.exit(fallas === 0 ? 0 : 1);
})().catch(e => { console.error('ERROR:', e.stack || e); process.exit(1); });
