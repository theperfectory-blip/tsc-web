// Solo sandbox (MS-2.5). Arma sandbox/site/probe.html: el index.html del
// sandbox con scripts/emu-probe.js inyectado justo después del SDK de
// Firebase, para medir lecturas por visita en el emulador.
// Uso: node scripts/emu-probe.mjs  →  abrir http://localhost:3001/probe.html
// (con tsc-emu y tsc-emu-backend arriba) y leer window.__PROBE__.report().
import { copyFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SITE = join(ROOT, 'sandbox', 'site');
if (!existsSync(SITE)) { console.error('[emu-probe] Falta sandbox/site (emu-snapshot.mjs)'); process.exit(1); }
copyFileSync(join(ROOT, 'scripts', 'emu-probe.js'), join(SITE, '_probe.js'));
const html = readFileSync(join(SITE, 'index.html'), 'utf8');
const marker = /(<script src="https:\/\/www\.gstatic\.com\/firebasejs\/[^"]+firebase-functions-compat\.js"><\/script>)/;
if (!marker.test(html)) { console.error('[emu-probe] No encontré el SDK de Functions en index.html'); process.exit(1); }
writeFileSync(join(SITE, 'probe.html'), html.replace(marker, '$1\n<script src="_probe.js"></script>'));
console.log('[emu-probe] sandbox/site/probe.html listo');
