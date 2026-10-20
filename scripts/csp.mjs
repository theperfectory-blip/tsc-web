// Solo desarrollo (no se publica). Fuente única de la Content-Security-Policy
// (slice 3.5, H-05).
//   - Web: header Content-Security-Policy (enforce desde 3.5; antes una semana en
//     Report-Only) en firebase.json.
//   - APK: build-www.mjs la inyecta como <meta> en www/index.html (la APK no
//     recibe los headers de hosting). Un <meta> no admite frame-ancestors.
//
// `node scripts/csp.mjs --check` verifica que firebase.json tenga la misma
// política en todos los headers de documentos HTML.
//
// 'unsafe-inline' en script-src es temporal: lo exigen los ~430 handlers
// on*="…" inline (se quita en 7.5). 'wasm-unsafe-eval' y worker-src blob:
// los pide el decodificador Draco de los trofeos 3D (palmares.js), y
// connect-src blob: las texturas del GLTFLoader.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'", 'https://www.gstatic.com', 'https://cdn.jsdelivr.net'],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'img-src': ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
  'media-src': ["'self'"],
  'connect-src': [
    "'self'",
    'blob:', // GLTFLoader pide las texturas embebidas del .glb con fetch(blob:)
    'https://firestore.googleapis.com',
    'https://identitytoolkit.googleapis.com',
    'https://securetoken.googleapis.com',
    'https://southamerica-east1-tsc-web-yuna.cloudfunctions.net',
    'https://api.cloudinary.com',
    'https://firebasestorage.googleapis.com',
    // La APK baja del hosting las temporadas archivadas que no trae (MS-5.15).
    'https://teamsubscup.web.app',
  ],
  'worker-src': ["'self'", 'blob:'],
  'frame-src': ['https://tsc-web-yuna.firebaseapp.com'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
};

export function cspString({ meta = false, extra = {} } = {}) {
  return Object.entries(CSP_DIRECTIVES)
    .filter(([k]) => !(meta && k === 'frame-ancestors'))
    .map(([k, v]) => [k, [...v, ...(extra[k] || [])]])
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] && process.argv.includes('--check')) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const fb = JSON.parse(readFileSync(join(root, 'firebase.json'), 'utf8'));
  const want = cspString();
  const found = fb.hosting.headers.flatMap(h => h.headers.filter(x => /^Content-Security-Policy/.test(x.key)).map(x => ({ src: h.source, ...x })));
  // Enforce desde el cierre de 3.5: un header -Report-Only también cuenta como distinto.
  const bad = found.filter(x => x.value !== want || x.key !== 'Content-Security-Policy');
  if (!found.length || bad.length) {
    console.error(`[csp] firebase.json no coincide con scripts/csp.mjs (${found.length} headers, ${bad.length} distintos: ${bad.map(b => b.src).join(', ')})`);
    process.exit(1);
  }
  console.log(`[csp] firebase.json OK (${found.length} headers, ${found[0].key})`);
}
