// Descifrado/cifrado del option file de PES5 PC (KONAMI-WIN32PES5OPT).
// Puerto a browser de tsc-src/prototipo_yunas/pes5/tools/pes5-crypt.js.
// Mismo algoritmo (ver ese archivo para la explicacion completa), usando
// DataView en vez de Buffer de Node. DataView.getInt32/setInt32(offset,true)
// son little-endian y de 32 bits con signo, igual que Buffer.readInt32LE.

const PES5_CRYPT = (() => {
  let KEYS = null; // {block, blockSize, key, keyPC} — cargado con cargarClaves()

  async function cargarClaves(baseUrl = '') {
    if (KEYS) return KEYS;
    const res = await fetch(baseUrl + 'pes5-keys.json');
    KEYS = await res.json();
    return KEYS;
  }

  const XORC = 0x6C371625, ADD = 1815549477;

  function capaPC(bytes) {
    const { keyPC } = KEYS;
    for (let i = 0; i < bytes.length; i++) bytes[i] ^= keyPC[i % 256];
  }

  function bloques(view, descifrarModo) {
    const { block, blockSize, key } = KEYS;
    for (let i = 1; i < 10; i++) {
      let j = 0;
      const fin = block[i] + blockSize[i];
      for (let k = block[i]; k < fin; k += 4) {
        const m = view.getInt32(k, true);
        const n = descifrarModo
          ? ((((m - key[j] + ADD) | 0) ^ XORC) | 0)
          : (((((m ^ XORC) | 0) - ADD + key[j]) | 0));
        view.setInt32(k, n | 0, true);
        if (++j === 367) j = 0;
      }
    }
  }

  function checksums(view) {
    const { block, blockSize } = KEYS;
    for (let i = 0; i < 10; i++) {
      let s = 0;
      const fin = block[i] + blockSize[i];
      for (let k = block[i]; k < fin; k += 4) s = (s + view.getInt32(k, true)) | 0;
      view.setInt32(block[i] - 8, s | 0, true);
    }
  }

  function descifrar(bufferOrigen) {
    if (!KEYS) throw new Error('llamar cargarClaves() antes de usar descifrar/cifrar');
    const bytes = new Uint8Array(bufferOrigen.slice(0));
    capaPC(bytes);
    const view = new DataView(bytes.buffer);
    bloques(view, true);
    return bytes;
  }

  function cifrar(bufferOrigen) {
    if (!KEYS) throw new Error('llamar cargarClaves() antes de usar descifrar/cifrar');
    const bytes = new Uint8Array(bufferOrigen.slice(0));
    const view = new DataView(bytes.buffer);
    bloques(view, false);
    checksums(view);
    capaPC(bytes);
    return bytes;
  }

  return { cargarClaves, descifrar, cifrar, get block() { return KEYS && KEYS.block; }, get blockSize() { return KEYS && KEYS.blockSize; } };
})();
