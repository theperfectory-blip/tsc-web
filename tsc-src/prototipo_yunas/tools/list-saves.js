// Parser minimo del sistema de archivos de una memory card PS2 (formato "ECC", 528 b/pagina)
const fs = require('fs');
const PATH = process.argv[2];
const raw = fs.readFileSync(PATH);

// ---- superbloque ----
const magic = raw.toString('latin1', 0, 28);
const pageLen = raw.readUInt16LE(0x28);
const pagesPerCluster = raw.readUInt16LE(0x2A);
const pagesPerBlock = raw.readUInt16LE(0x2C);
const clustersPerCard = raw.readUInt32LE(0x30);
const allocOffset = raw.readUInt32LE(0x34);
const allocEnd = raw.readUInt32LE(0x38);
const rootDirCluster = raw.readUInt32LE(0x3C);
const ifcList = [];
for (let i = 0; i < 32; i++) ifcList.push(raw.readUInt32LE(0x50 + i * 4));

const rawPageLen = pageLen + 16; // 512 + ECC
const clusterLen = pageLen * pagesPerCluster;

console.log('magic:', JSON.stringify(magic));
console.log({ pageLen, pagesPerCluster, pagesPerBlock, clustersPerCard, allocOffset, allocEnd, rootDirCluster, clusterLen });

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
  const fatOffset = cluster % 256;
  const indirectIndex = Math.floor(cluster / 256);
  const indirectOffset = indirectIndex % 256;
  const dblIndex = Math.floor(indirectIndex / 256);
  const indirectClusterNum = ifcList[dblIndex];
  const fatClusterNum = readClusterPhys(indirectClusterNum).readUInt32LE(indirectOffset * 4);
  return readClusterPhys(fatClusterNum).readUInt32LE(fatOffset * 4);
}

// cadena de clusters de una entrada
function chain(startCluster, count) {
  const out = [];
  let c = startCluster;
  while (out.length < count && c !== 0xFFFFFFFF) {
    out.push(c);
    const n = fatNext(c);
    if ((n & 0x80000000) === 0) break;
    c = n & 0x7FFFFFFF;
  }
  return out;
}

function readEntries(startCluster, n) {
  const perCluster = clusterLen / 512;
  const needed = Math.ceil(n / perCluster);
  const cl = chain(startCluster, needed);
  const buf = Buffer.concat(cl.map(readCluster));
  const ents = [];
  for (let i = 0; i < n; i++) {
    const o = i * 512;
    if (o + 512 > buf.length) break;
    ents.push({
      mode: buf.readUInt16LE(o + 0x00),
      length: buf.readUInt32LE(o + 0x04),
      cluster: buf.readUInt32LE(o + 0x10),
      name: buf.toString('latin1', o + 0x40, o + 0x60).replace(/\0.*$/, ''),
    });
  }
  return ents;
}

const DF_FILE = 0x0010, DF_DIR = 0x0020, DF_EXISTS = 0x8000;
// la entrada "." del propio directorio raiz dice cuantas entradas tiene
const rootCount = readCluster(rootDirCluster).readUInt32LE(0x04);
const root = readEntries(rootDirCluster, rootCount).filter(e => (e.mode & DF_EXISTS) && e.name !== '.' && e.name !== '..');

console.log('\n=== SAVES EN LA TARJETA ===');
for (const d of root) {
  if (!(d.mode & DF_DIR)) continue;
  const files = readEntries(d.cluster, d.length).filter(e => (e.mode & DF_EXISTS) && (e.mode & DF_FILE));
  const total = files.reduce((a, f) => a + f.length, 0);
  console.log(`\n[${d.name}]  (${files.length} archivos, ${total} bytes)`);
  for (const f of files) console.log(`    ${f.name.padEnd(24)} ${String(f.length).padStart(9)} b   cluster=${f.cluster}`);
}
