// Extrae un archivo concreto de la memcard PS2 y lo vuelca a disco
const fs = require('fs');
const PATH = process.argv[2];
const WANT = process.argv[3];          // nombre del save (carpeta)
const OUTDIR = process.argv[4];
const raw = fs.readFileSync(PATH);

const pageLen = raw.readUInt16LE(0x28);
const pagesPerCluster = raw.readUInt16LE(0x2A);
const allocOffset = raw.readUInt32LE(0x34);
const rootDirCluster = raw.readUInt32LE(0x3C);
const ifcList = [];
for (let i = 0; i < 32; i++) ifcList.push(raw.readUInt32LE(0x50 + i * 4));
const rawPageLen = pageLen + 16;
const clusterLen = pageLen * pagesPerCluster;

function readClusterPhys(c) {
  const out = Buffer.alloc(clusterLen);
  for (let p = 0; p < pagesPerCluster; p++) {
    const off = (c * pagesPerCluster + p) * rawPageLen;
    raw.copy(out, p * pageLen, off, off + pageLen);
  }
  return out;
}
const readCluster = (c) => readClusterPhys(allocOffset + c);

function fatNext(cluster) {
  const indirectIndex = Math.floor(cluster / 256);
  const fatClusterNum = readClusterPhys(ifcList[Math.floor(indirectIndex / 256)])
    .readUInt32LE((indirectIndex % 256) * 4);
  return readClusterPhys(fatClusterNum).readUInt32LE((cluster % 256) * 4);
}
function chain(start, count) {
  const out = []; let c = start;
  while (out.length < count && c !== 0xFFFFFFFF) {
    out.push(c);
    const n = fatNext(c);
    if ((n & 0x80000000) === 0) break;
    c = n & 0x7FFFFFFF;
  }
  return out;
}
function readEntries(start, n) {
  const cl = chain(start, Math.ceil(n / (clusterLen / 512)));
  const buf = Buffer.concat(cl.map(readCluster));
  const ents = [];
  for (let i = 0; i < n && (i + 1) * 512 <= buf.length; i++) {
    const o = i * 512;
    ents.push({
      mode: buf.readUInt16LE(o), length: buf.readUInt32LE(o + 4),
      cluster: buf.readUInt32LE(o + 0x10),
      name: buf.toString('latin1', o + 0x40, o + 0x60).replace(/\0.*$/, ''),
    });
  }
  return ents;
}
function readFile(start, len) {
  const cl = chain(start, Math.ceil(len / clusterLen));
  return Buffer.concat(cl.map(readCluster)).subarray(0, len);
}

const rootCount = readCluster(rootDirCluster).readUInt32LE(4);
const root = readEntries(rootDirCluster, rootCount).filter(e => (e.mode & 0x8000) && (e.mode & 0x20));
const dir = root.find(d => d.name === WANT);
if (!dir) { console.error('no encontrado:', WANT); process.exit(1); }

fs.mkdirSync(OUTDIR, { recursive: true });
for (const f of readEntries(dir.cluster, dir.length).filter(e => (e.mode & 0x8000) && (e.mode & 0x10))) {
  const data = readFile(f.cluster, f.length);
  const out = `${OUTDIR}/${f.name}`;
  fs.writeFileSync(out, data);
  console.log(`escrito ${out}  ${data.length} b`);
}
