#!/usr/bin/env node
'use strict';
/* Genera www/ (webDir de Capacitor) a partir de tsc-src/, copiando SOLO lo
   que index.html/js referencian en producción: index.html, css/, js/,
   assets/, data/. Whitelist en vez de exclude-list a propósito — así
   graphify-out/, docs/, .serve-*.log, prototype.html, "palmares 3d/" o
   trophies-svg/ (ninguno cargado en runtime, ver grep en js/) nunca
   terminan empaquetados en el APK aunque aparezca un archivo nuevo de
   dev-tooling en tsc-src/ que esta lista no conozca. */
import { existsSync, rmSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isExcluded } from './build-exclude.mjs';
import { cspString } from './csp.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, 'tsc-src');
const DEST = join(ROOT, 'www');
const INCLUDE = ['index.html', 'manifest.webmanifest', 'css', 'js', 'assets', 'data'];

rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });

for (const name of INCLUDE) {
  const from = join(SRC, name);
  if (!existsSync(from)) {
    console.warn(`[build-www] falta tsc-src/${name}, se omite`);
    continue;
  }
  cpSync(from, join(DEST, name), { recursive: true, filter: src => !isExcluded(src) });
}

// CSP de la APK (slice 3.5): la APK no recibe los headers de Firebase
// Hosting, así que la política va como <meta>, en modo enforce.
const indexPath = join(DEST, 'index.html');
const html = readFileSync(indexPath, 'utf8');
const meta = `<meta http-equiv="Content-Security-Policy" content="${cspString({ meta: true })}">`;
if (!/<meta charset[^>]*>/i.test(html)) throw new Error('[build-www] no encontré <meta charset> en index.html');
writeFileSync(indexPath, html.replace(/(<meta charset[^>]*>)/i, `$1
${meta}`));

console.log(`[build-www] www/ generado desde tsc-src/ (${INCLUDE.join(', ')})`);
