// Compara dos instantaneas del save. Como la ofuscacion es XOR posicional,
// C1 ^ C2 = P1 ^ P2: la clave se cancela y vemos el cambio REAL del texto plano.
//   node tools/xor-diff.js snapshots/00-baseline.bin snapshots/01-fulham-80-....bin
const fs = require('fs');

const [A, B] = process.argv.slice(2);
if (!A || !B) { console.error('uso: node xor-diff.js <antes.bin> <despues.bin>'); process.exit(1); }
const a = fs.readFileSync(A), b = fs.readFileSync(B);
if (a.length !== b.length) console.log(`AVISO: tamanos distintos (${a.length} vs ${b.length})`);

const n = Math.min(a.length, b.length);
const runs = []; let st = -1;
for (let i = 0; i < n; i++) {
  if (a[i] !== b[i]) { if (st < 0) st = i; }
  else if (st >= 0) { runs.push([st, i - 1]); st = -1; }
}
if (st >= 0) runs.push([st, n - 1]);

const total = runs.reduce((s, [x, y]) => s + (y - x + 1), 0);
console.log(`bytes distintos: ${total} de ${n}  (${(100 * total / n).toFixed(4)}%)`);
console.log(`regiones cambiadas: ${runs.length}\n`);

// agrupar regiones cercanas (<256 b) para leerlas como bloques logicos
const grupos = [];
for (const [s, e] of runs) {
  const g = grupos[grupos.length - 1];
  if (g && s - g[1] < 256) g[1] = e; else grupos.push([s, e]);
}
console.log(`agrupadas en ${grupos.length} bloques:\n`);
for (const [s, e] of grupos.slice(0, 40)) {
  console.log(`  0x${s.toString(16)} .. 0x${e.toString(16)}   (${e - s + 1} b)`);
  const len = Math.min(e - s + 1, 32);
  const xor = Buffer.alloc(len);
  for (let i = 0; i < len; i++) xor[i] = a[s + i] ^ b[s + i];
  console.log(`     antes : ${a.subarray(s, s + len).toString('hex')}`);
  console.log(`     despues: ${b.subarray(s, s + len).toString('hex')}`);
  console.log(`     XOR    : ${xor.toString('hex')}   <- cambio real del texto plano`);
}
if (grupos.length > 40) console.log(`  ... y ${grupos.length - 40} bloques mas`);
