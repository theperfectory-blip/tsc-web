// Extrae el option file de varias memcards y las compara entre si
const fs = require('fs');

function openCard(path) {
  const raw = fs.readFileSync(path);
  const pageLen = raw.readUInt16LE(0x28);
  const ppc = raw.readUInt16LE(0x2A);
  const allocOffset = raw.readUInt32LE(0x34);
  const rootDirCluster = raw.readUInt32LE(0x3C);
  const ifc = []; for (let i = 0; i < 32; i++) ifc.push(raw.readUInt32LE(0x50 + i * 4));
  const rpl = pageLen + 16, cl = pageLen * ppc;
  const rcp = (c) => { const o = Buffer.alloc(cl); for (let p = 0; p < ppc; p++) { const off = (c * ppc + p) * rpl; raw.copy(o, p * pageLen, off, off + pageLen); } return o; };
  const rc = (c) => rcp(allocOffset + c);
  const fatNext = (c) => { const ii = Math.floor(c / 256); const fc = rcp(ifc[Math.floor(ii / 256)]).readUInt32LE((ii % 256) * 4); return rcp(fc).readUInt32LE((c % 256) * 4); };
  const chain = (s, n) => { const o = []; let c = s; while (o.length < n && c !== 0xFFFFFFFF) { o.push(c); const x = fatNext(c); if ((x & 0x80000000) === 0) break; c = x & 0x7FFFFFFF; } return o; };
  const ents = (s, n) => { const b = Buffer.concat(chain(s, Math.ceil(n / (cl / 512))).map(rc)); const r = []; for (let i = 0; i < n && (i + 1) * 512 <= b.length; i++) { const o = i * 512; r.push({ mode: b.readUInt16LE(o), length: b.readUInt32LE(o + 4), cluster: b.readUInt32LE(o + 0x10), name: b.toString('latin1', o + 0x40, o + 0x60).replace(/\0.*$/, '') }); } return r; };
  const rootCount = rc(rootDirCluster).readUInt32LE(4);
  const dir = ents(rootDirCluster, rootCount).find(e => e.name === 'BESLES-52760PES4OPT');
  const fe = ents(dir.cluster, dir.length).find(e => e.name === 'BESLES-52760PES4OPT');
  const opt = Buffer.concat(chain(fe.cluster, Math.ceil(fe.length / cl)).map(rc)).subarray(0, fe.length);
  return { raw, opt };
}

const S = 124, LO = 0x7b50, MB = 0x55540;   // MASIVO BRO
const slots = (opt, off) => { const a = []; for (let g = 0; g < 6; g++) { const v = opt.readUInt32LE(off + 0x38 + g * 4); for (let k = 0; k < 4; k++) a.push((v >>> (k * 7)) & 0x7F); } return a; };

const cards = process.argv.slice(2).map(p => {
  const label = p.split(/[\\/]/).pop();
  const c = openCard(p);
  return { label, ...c };
});

console.log('=== estado de MASIVO BRO en cada tarjeta ===');
for (const c of cards) console.log('  ' + c.label.padEnd(58), slots(c.opt, MB).join(' '));

function diff(a, b, name) {
  console.log(`\n=== diff del OPTION FILE: ${name} ===`);
  if (a.length !== b.length) { console.log('  tamanos distintos', a.length, b.length); return; }
  const runs = []; let st = -1;
  for (let i = 0; i < a.length; i++) { if (a[i] !== b[i]) { if (st < 0) st = i; } else if (st >= 0) { runs.push([st, i - 1]); st = -1; } }
  if (st >= 0) runs.push([st, a.length - 1]);
  console.log('  rangos cambiados:', runs.length);
  for (const [s, e] of runs) {
    const inPlayerTable = s >= LO && s <= LO + 4923 * S;
    const idx = inPlayerTable ? Math.floor((s - LO) / S) : null;
    const rel = inPlayerTable ? (s - LO) % S : null;
    let tag;
    if (inPlayerTable) tag = `tabla jugadores, idx ${idx}, +0x${rel.toString(16)}` + (idx === 2564 ? '  <- MASIVO BRO' : '  <- OTRO JUGADOR');
    else tag = '*** FUERA DE LA TABLA DE JUGADORES  <- CANDIDATO A CHECKSUM ***';
    console.log(`   0x${s.toString(16)}..0x${e.toString(16)} (${e - s + 1} b)  ${tag}`);
    if (!inPlayerTable) {
      console.log(`      antes : ${a.subarray(s, Math.min(e + 1, s + 24)).toString('hex')}`);
      console.log(`      despues: ${b.subarray(s, Math.min(e + 1, s + 24)).toString('hex')}`);
    }
  }
}

for (let i = 0; i + 1 < cards.length; i++) diff(cards[i].opt, cards[i + 1].opt, `${cards[i].label}  ->  ${cards[i + 1].label}`);
if (cards.length > 2) diff(cards[0].opt, cards[cards.length - 1].opt, `${cards[0].label}  ->  ${cards[cards.length - 1].label}`);
