// Descifrado/cifrado del option file de PES5 PC (KONAMI-WIN32PES5OPT, 1.250.304 b).
// Algoritmo tomado del codigo de PES5-OF-Decrypter (lazanet), a su vez derivado
// del PESFan Editor de purplehaze. Dos capas:
//   1) capa PC: XOR byte a byte con keyPC (256 bytes, ciclica)
//   2) capa comun: por bloques, sobre palabras de 32 bits LE:
//        plano = (cifrado - key[j] + 1815549477) XOR 0x6C371625
//      con key[] de 367 palabras, ciclica, reiniciada en cada bloque.
const fs = require('fs'), path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, 'OptionFile.java'), 'latin1');
function arr(nombre) {
  const i = SRC.indexOf(nombre + ' = {');
  if (i < 0) throw new Error('no encuentro el array ' + nombre);
  const a = SRC.indexOf('{', i), b = SRC.indexOf('}', a);
  return SRC.slice(a + 1, b).split(',').map(x => {
    const t = x.trim();
    if (t === 'Byte.MAX_VALUE') return 127;
    if (t === 'Byte.MIN_VALUE') return -128;
    return parseInt(t, 10);
  });
}
const block = arr('block'), blockSize = arr('blockSize');
// el constructor de OptionFile.java suma 1815543808 (0x6C370000) a cada
// elemento de la clave antes de usarla. Sin esto, la mitad alta de cada
// palabra de 32 bits sale corrida y solo descifra medio nombre.
const key = arr('key').map(v => (v + 1815543808) | 0);
const keyPC = arr('keyPC').map(v => v & 0xFF);

const XORC = 0x6C371625, ADD = 1815549477;

function capaPC(d) { for (let i = 0; i < d.length; i++) d[i] ^= keyPC[i % 256]; }

function bloques(d, descifrar) {
  for (let i = 1; i < 10; i++) {
    let j = 0;
    const fin = block[i] + blockSize[i];
    for (let k = block[i]; k < fin; k += 4) {
      const m = d.readInt32LE(k);
      const n = descifrar
        ? ((((m - key[j] + ADD) | 0) ^ XORC) | 0)
        : (((((m ^ XORC) | 0) - ADD + key[j]) | 0));
      d.writeInt32LE(n | 0, k);
      if (++j === 367) j = 0;
    }
  }
}

function checksums(d) {
  // OptionFile.java: checkSums() arranca en i=0 (10 bloques, 0..9) y se
  // llama DESPUES de encrypt() — la suma es sobre los dwords ya cifrados,
  // no sobre el texto plano. El bloque 0 nunca pasa por el cifrado de
  // bloques (ese arranca en i=1) pero si tiene su propio checksum.
  for (let i = 0; i < 10; i++) {
    let s = 0;
    const fin = block[i] + blockSize[i];
    for (let k = block[i]; k < fin; k += 4) s = (s + d.readInt32LE(k)) | 0;
    d.writeInt32LE(s | 0, block[i] - 8);
  }
}

const descifrar = (buf) => { const d = Buffer.from(buf); capaPC(d); bloques(d, true); return d; };
const cifrar    = (buf) => { const d = Buffer.from(buf); bloques(d, false); checksums(d); capaPC(d); return d; };

module.exports = { descifrar, cifrar, block, blockSize,
  TABLA_JUGADORES: { base: block[4], stride: 124, registros: blockSize[4] / 124 } };

if (require.main === module) {
  const [modo, ent, sal] = process.argv.slice(2);
  if (!modo || !ent || !sal) { console.error('uso: node pes5-crypt.js <descifrar|cifrar> <entrada> <salida>'); process.exit(1); }
  const out = modo === 'descifrar' ? descifrar(fs.readFileSync(ent)) : cifrar(fs.readFileSync(ent));
  fs.writeFileSync(sal, out);
  console.log(`${modo}: ${ent} -> ${sal} (${out.length} b)`);
}
