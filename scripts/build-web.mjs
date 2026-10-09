#!/usr/bin/env node
'use strict';
/* Genera dist/ (carpeta pública de Firebase Hosting) a partir de tsc-src/.

   Por qué existe: index.html carga ~36 <script> y 7 hojas de estilo. Cada
   archivo era un pedido aparte y, desde fuera de Chile (Perú), cada uno
   pagaba la latencia completa. Acá se juntan en unos pocos archivos con el
   hash del contenido en el nombre, servidos con caché "immutable" de un año:
   un visitante que vuelve no vuelve a pedir NI UNO hasta el próximo deploy
   que cambie algo (el index.html, que siempre se revalida, apunta al hash
   nuevo).

   Semántica idéntica a cargar los archivos por separado:
   - Los scripts se concatenan en el MISMO orden de index.html.
   - 'use strict' solo vale al inicio de un script. Como hay archivos con y
     sin él, se agrupan en TRAMOS CONSECUTIVOS del mismo modo: cada bundle es
     todo estricto o todo no estricto, igual que sus archivos originales.
   - Mismo scope global (siguen siendo <script> clásicos), mismo orden de
     ejecución. Única diferencia: si un archivo lanzara un error al cargarse,
     se cortaría el resto de SU bundle (antes solo él).
   - El CSS se concatena en orden en bundles/ (misma profundidad que css/,
     así los url('../assets/...') siguen resolviendo igual).

   Solo usa módulos de Node (sin npm install): corre igual en local y en el
   workflow de GitHub Actions que despliega.

   Uso: node scripts/build-web.mjs   (también corre solo como predeploy de
        hosting en firebase.json) */
import { existsSync, rmSync, cpSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, 'tsc-src');
const DEST = join(ROOT, 'dist');
const BUNDLE_DIR = 'bundles';

// Lo mismo que hosting.ignore excluía al publicar tsc-src/ directamente.
const SKIP = new Set(['graphify-out', 'trophies-upload', 'node_modules', '_cmp']);

rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });
for (const name of readdirSync(SRC)) {
  if (name.startsWith('.') || SKIP.has(name)) continue;
  cpSync(join(SRC, name), join(DEST, name), {
    recursive: true,
    filter: src => !basename(src).startsWith('.') && !SKIP.has(basename(src))
  });
}
mkdirSync(join(DEST, BUNDLE_DIR), { recursive: true });

const hash = text => createHash('sha256').update(text).digest('hex').slice(0, 10);

function writeBundle(prefix, ext, content){
  const name = `${BUNDLE_DIR}/${prefix}.${hash(content)}.${ext}`;
  writeFileSync(join(DEST, name), content);
  return name;
}

// ¿El archivo arranca con la directiva 'use strict'? (se permiten comentarios
// y espacios antes, igual que en el prólogo de directivas de JS)
function isStrict(code){
  return /^(?:\s+|\/\*[\s\S]*?\*\/|\/\/[^\n]*)*(['"])use strict\1/.test(code);
}

let html = readFileSync(join(SRC, 'index.html'), 'utf8');

/* ---------- CSS ---------- */
const CSS_RE = /<link rel="stylesheet" href="(css\/[^"]+\.css)">\s*\n?/g;
const cssFiles = [...html.matchAll(CSS_RE)].map(m => m[1]);
if (cssFiles.length) {
  const css = cssFiles.map(f => {
    const code = readFileSync(join(SRC, f), 'utf8');
    if (/@import|@charset/i.test(code)) throw new Error(`${f} usa @import/@charset: no se puede concatenar a ciegas`);
    return `/* ===== ${f} ===== */\n${code}`;
  }).join('\n');
  const cssName = writeBundle('app', 'css', css);
  let first = true;
  html = html.replace(CSS_RE, () => {
    if (!first) return '';
    first = false;
    return `<link rel="stylesheet" href="${cssName}">\n`;
  });
}

/* ---------- JS ---------- */
const JS_RE = /<script src="(js\/[^"]+\.js)"><\/script>\s*\n?/g;
const jsFiles = [...html.matchAll(JS_RE)].map(m => m[1]);
const runs = [];
for (const f of jsFiles) {
  const code = readFileSync(join(SRC, f), 'utf8');
  const strict = isStrict(code);
  const last = runs[runs.length - 1];
  if (last && last.strict === strict) last.files.push({ f, code });
  else runs.push({ strict, files: [{ f, code }] });
}
const tags = runs.map((run, i) => {
  // El primer archivo de un tramo estricto empieza con su 'use strict', que
  // pasa a ser el prólogo del bundle: nada de código antes (comentarios sí).
  const body = run.files.map(({ f, code }) => `/* ===== ${f} ===== */\n${code}`).join('\n;\n');
  const name = writeBundle(`app-${String(i + 1).padStart(2, '0')}`, 'js', body + '\n');
  return `<script src="${name}"></script>\n`;
});
let jsIdx = 0;
html = html.replace(JS_RE, () => (jsIdx++ === 0 ? tags.join('') : ''));

writeFileSync(join(DEST, 'index.html'), html);

console.log(`[build-web] dist/ generado · ${cssFiles.length} CSS → 1 · ${jsFiles.length} JS → ${runs.length} (tramos ${runs.map(r => (r.strict ? 'S' : 'N') + r.files.length).join(' ')})`);
