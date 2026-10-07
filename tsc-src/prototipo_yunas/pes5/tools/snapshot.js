// Captura el estado actual del save de PES5 con una etiqueta.
//   node tools/snapshot.js "fulham-80"
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const SAVE = process.env.PES5_SAVE ||
  'C:/Users/Administrator/Documents/KONAMI/Pro Evolution Soccer 5/save/folder1/KONAMI-WIN32PES5OPT';
const DIR = path.join(__dirname, '..', 'snapshots');

const label = (process.argv[2] || 'sin-etiqueta').replace(/[^a-zA-Z0-9_-]/g, '-');
if (!fs.existsSync(SAVE)) { console.error('No encuentro el save en:', SAVE); process.exit(1); }

const data = fs.readFileSync(SAVE);
const md5 = crypto.createHash('md5').update(data).digest('hex');
const mtime = fs.statSync(SAVE).mtime.toISOString().slice(0, 16).replace(/[:T]/g, '');

// ¿ya tenemos este contenido exacto?
const previos = fs.readdirSync(DIR).filter(f => f.endsWith('.bin'));
for (const f of previos) {
  const h = crypto.createHash('md5').update(fs.readFileSync(path.join(DIR, f))).digest('hex');
  if (h === md5) {
    console.log(`El save es IDENTICO a ${f} (md5 ${md5.slice(0, 8)}).`);
    console.log('El juego no escribio nada nuevo — no capturo un duplicado.');
    process.exit(0);
  }
}

const n = String(previos.length).padStart(2, '0');
const out = path.join(DIR, `${n}-${label}-${mtime}.bin`);
fs.writeFileSync(out, data);
console.log(`Capturado: ${path.basename(out)}`);
console.log(`  ${data.length} bytes   md5 ${md5}`);
console.log(`  instantaneas guardadas: ${previos.length + 1}`);
