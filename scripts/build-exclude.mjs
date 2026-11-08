'use strict';
/* Lista de exclusión compartida por build-web.mjs (dist/) y build-www.mjs
   (www/). Nada de esto se carga en runtime y no debe publicarse: documentos
   internos, material de trabajo y dotfiles. Se aplica por nombre en cualquier
   nivel del árbol. */
import { basename } from 'node:path';

export const EXCLUDE_NAMES = new Set([
  'docs', 'trophies-svg', 'graphify-out', 'trophies-upload', '_cmp', 'node_modules',
  // Rama 2.0: material de diseno interno. La investigacion y los scripts de prueba
  // ya no viven en tsc-src/ (slice 5.A): estan en docs/2.0/investigacion/ y tools/.
  '_material-diseno'
]);

export function isExcluded(pathOrName){
  const name = basename(pathOrName);
  return name.startsWith('.') || /\.md$/i.test(name) || EXCLUDE_NAMES.has(name);
}
