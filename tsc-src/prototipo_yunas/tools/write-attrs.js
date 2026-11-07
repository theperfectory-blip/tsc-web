// Escribe atributos de un jugador en una memcard PS2 de PES4, usando pes4-map.json.
// Arregla el checksum de seccion y recalcula la ECC de las paginas tocadas.
//   node pes4-write.js <card-entrada> <jugador> <card-salida> <attr=valor> [...]
const fs = require('fs');
const path = require('path');

const MAP = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'pes4-map.json'), 'utf8'));
const [CARD_IN, PLAYER, CARD_OUT, ...assigns] = process.argv.slice(2);
const raw = fs.readFileSync(CARD_IN);

// ---------- filesystem ----------
const pageLen = raw.readUInt16LE(0x28), ppc = raw.readUInt16LE(0x2A);
const allocOffset = raw.readUInt32LE(0x34), rootDirCluster = raw.readUInt32LE(0x3C);
const ifc = []; for (let i = 0; i < 32; i++) ifc.push(raw.readUInt32LE(0x50 + i * 4));
const rpl = pageLen + 16, clen = pageLen * ppc;
const rcp = (c) => { const o = Buffer.alloc(clen); for (let p = 0; p < ppc; p++) { const f = (c * ppc + p) * rpl; raw.copy(o, p * pageLen, f, f + pageLen); } return o; };
const rc = (c) => rcp(allocOffset + c);
const fatNext = (c) => { const ii = Math.floor(c / 256); const fc = rcp(ifc[Math.floor(ii / 256)]).readUInt32LE((ii % 256) * 4); return rcp(fc).readUInt32LE((c % 256) * 4); };
const chain = (s, n) => { const o = []; let c = s; while (o.length < n && c !== 0xFFFFFFFF) { o.push(c); const x = fatNext(c); if ((x & 0x80000000) === 0) break; c = x & 0x7FFFFFFF; } return o; };
const ents = (s, n) => { const b = Buffer.concat(chain(s, Math.ceil(n / (clen / 512))).map(rc)); const r = []; for (let i = 0; i < n && (i + 1) * 512 <= b.length; i++) { const o = i * 512; r.push({ length: b.readUInt32LE(o + 4), cluster: b.readUInt32LE(o + 0x10), name: b.toString('latin1', o + 0x40, o + 0x60).replace(/\0.*$/, '') }); } return r; };
const dir = ents(rootDirCluster, rc(rootDirCluster).readUInt32LE(4)).find(e => e.name === 'BESLES-52760PES4OPT');
const fe = ents(dir.cluster, dir.length).find(e => e.name === 'BESLES-52760PES4OPT');
const optChain = chain(fe.cluster, Math.ceil(fe.length / clen));
const opt = Buffer.concat(optChain.map(rc)).subarray(0, fe.length);

// offset dentro del option file -> offset absoluto en el .ps2
function toRaw(f) {
  const ci = Math.floor(f / clen), inCl = f % clen;
  const page = (allocOffset + optChain[ci]) * ppc + Math.floor(inCl / pageLen);
  return { raw: page * rpl + (inCl % pageLen), page };
}

// ---------- ubicar el jugador ----------
const T = MAP.playerTable;
const nameAt = (o) => { let s = ''; for (let i = 0; i < 32; i += 2) { const l = opt[o + i], h = opt[o + i + 1]; if (!l && !h) break; if (h !== 0 || l < 32 || l > 126) return null; s += String.fromCharCode(l); } return s || null; };
let recOff = -1, idx = -1;
for (let i = 0; i < T.records; i++) { const o = T.base + i * T.stride; if (nameAt(o) === PLAYER) { recOff = o; idx = i; break; } }
if (recOff < 0) { console.error('jugador no encontrado:', PLAYER); process.exit(1); }
console.log(`jugador: ${PLAYER}  idx ${idx}  offset 0x${recOff.toString(16)}`);

// ---------- leer/escribir campos de 7 bits en offsets de bit arbitrarios ----------
const readField = (bit) => { let v = 0; for (let i = 0; i < 7; i++) { const b = bit + i; v |= ((opt[recOff + (b >> 3)] >> (b & 7)) & 1) << i; } return v; };
const touchedFileBytes = new Set();
function writeField(bit, val) {
  for (let i = 0; i < 7; i++) {
    const b = bit + i, fo = recOff + (b >> 3), mask = 1 << (b & 7);
    const on = (val >> i) & 1;
    if (on) opt[fo] |= mask; else opt[fo] &= ~mask;
    touchedFileBytes.add(fo);
  }
}

// ---------- aplicar ----------
const ATTRS = MAP.attributes;
const before = {}, after = {};
for (const k of Object.keys(ATTRS)) if (!k.startsWith('_')) before[k] = readField(ATTRS[k].bit);

const plan = {};
for (const a of assigns) {
  const [k, v] = a.split('=');
  if (k === 'RESTO') { for (const kk of Object.keys(ATTRS)) if (!kk.startsWith('_') && plan[kk] === undefined) plan[kk] = +v; continue; }
  if (!ATTRS[k]) { console.error('atributo desconocido:', k, '\nvalidos:', Object.keys(ATTRS).filter(x => !x.startsWith('_')).join(', ')); process.exit(1); }
  plan[k] = +v;
}
for (const [k, v] of Object.entries(plan)) {
  if (v < 0 || v > 99) { console.error(`valor fuera de rango 0-99: ${k}=${v}`); process.exit(1); }
  writeField(ATTRS[k].bit, v);
}
for (const k of Object.keys(ATTRS)) if (!k.startsWith('_')) after[k] = readField(ATTRS[k].bit);

console.log('\natributo                antes  despues');
for (const k of Object.keys(ATTRS)) {
  if (k.startsWith('_')) continue;
  const ch = before[k] !== after[k];
  console.log('  ' + k.padEnd(22), String(before[k]).padStart(4), String(after[k]).padStart(8), ch ? ' <-' : '');
}

// ---------- volcar bytes al .ps2 + checksum + ECC ----------
const touchedPages = new Set();
let sumDelta = 0;
const origOpt = Buffer.concat(optChain.map(rc)).subarray(0, fe.length);  // relectura limpia
for (const fo of touchedFileBytes) {
  sumDelta += opt[fo] - origOpt[fo];
  const m = toRaw(fo);
  raw[m.raw] = opt[fo];
  touchedPages.add(m.page);
}
const CK = MAP.sectionChecksum.offset;
const ckm = toRaw(CK);
const oldCk = raw[ckm.raw], newCk = ((oldCk + sumDelta) % 256 + 256) % 256;
raw[ckm.raw] = newCk;
touchedPages.add(ckm.page);
console.log(`\nchecksum de seccion: delta ${sumDelta}  ->  0x${oldCk.toString(16)} pasa a 0x${newCk.toString(16)}`);

const par = (v) => { let p = 0; while (v) { p ^= v & 1; v >>= 1; } return p; };
function eccBlock(off) {
  const bp = [], col = new Array(8).fill(0);
  for (let i = 0; i < 128; i++) { const v = raw[off + i]; bp.push(par(v)); for (let j = 0; j < 8; j++) col[j] ^= (v >> j) & 1; }
  const lpo = new Array(7).fill(0), lpe = new Array(7).fill(0);
  for (let i = 0; i < 128; i++) for (let k = 0; k < 7; k++) { if ((i >> k) & 1) lpo[k] ^= bp[i]; else lpe[k] ^= bp[i]; }
  const cpo = [0, 0, 0], cpe = [0, 0, 0];
  for (let j = 0; j < 8; j++) for (let k = 0; k < 3; k++) { if ((j >> k) & 1) cpo[k] ^= col[j]; else cpe[k] ^= col[j]; }
  const p3 = (a) => (a[0] | a[1] << 1 | a[2] << 2) & 7;
  const p7 = (a) => (a[0] | a[1] << 1 | a[2] << 2 | a[3] << 3 | a[4] << 4 | a[5] << 5 | a[6] << 6) & 0x7F;
  return [((~p3(cpe)) & 7) | (((~p3(cpo)) & 7) << 4), (~p7(lpe)) & 0x7F, (~p7(lpo)) & 0x7F];
}
for (const page of touchedPages) {
  const base = page * rpl;
  for (let blk = 0; blk < 4; blk++) { const e = eccBlock(base + blk * 128); raw[base + 512 + blk * 3] = e[0]; raw[base + 512 + blk * 3 + 1] = e[1]; raw[base + 512 + blk * 3 + 2] = e[2]; }
}
console.log('paginas tocadas:', [...touchedPages].join(', '));
fs.writeFileSync(CARD_OUT, raw);
console.log('ESCRITO en ' + CARD_OUT);
