#!/usr/bin/env node
'use strict';
/* Auditor estático de cableado (slice 2.3). Solo desarrollo: no se publica.

   Recorre index.html y los JS de tsc-src/ (heurístico, por regex, sin parser)
   y reporta en docs/reportes/MS-2.3-cableado.md:
   1. Handlers on*="fn(…)" (HTML y templates JS) que llaman funciones sin definir.
   2. Funciones globales que nadie referencia (candidatas a código muerto).
   3. Nombres globales definidos en más de un archivo.
   4. IDs pedidos con getElementById que no existen en ningún template.

   Uso: node scripts/audit-wiring.mjs   (sin dependencias) */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, 'tsc-src');
const html = readFileSync(join(SRC, 'index.html'), 'utf8');
const jsFiles = [...html.matchAll(/<script src="(js\/[^"]+\.js)"><\/script>/g)].map(m => m[1]);
const files = [{ f: 'index.html', code: html }, ...jsFiles.map(f => ({ f, code: readFileSync(join(SRC, f), 'utf8') }))];
const lineOf = (code, idx) => code.slice(0, idx).split('\n').length;

// Globales del navegador / librerías que un handler puede llamar sin que las defina el proyecto.
const BUILTIN = new Set(['alert','confirm','prompt','event','this','window','document','history','location','navigator',
  'setTimeout','setInterval','clearTimeout','clearInterval','requestAnimationFrame','parseInt','parseFloat','String',
  'Number','Boolean','JSON','Math','Date','Array','Object','encodeURIComponent','decodeURIComponent','stopPropagation',
  'preventDefault','if','return','function','typeof','new','void','isNaN','console','firebase','Capacitor','THREE',
  'localStorage','sessionStorage','fetch','open','close','focus','blur','click','remove','add','toggle','Event','Promise']);

/* ---------- definiciones globales (columna 0, como en este código) ---------- */
const defs = new Map(); // nombre -> [{f,line,kind}]
const addDef = (name, f, line, kind) => { if (!defs.has(name)) defs.set(name, []); defs.get(name).push({ f, line, kind }); };
for (const { f, code } of files.filter(x => x.f !== 'index.html')) {
  for (const m of code.matchAll(/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/gm)) addDef(m[1], f, lineOf(code, m.index), 'function');
  for (const m of code.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)) addDef(m[1], f, lineOf(code, m.index), 'var');
  for (const m of code.matchAll(/^(?:window|self)\.([A-Za-z_$][\w$]*)\s*=[^=]/gm)) addDef(m[1], f, lineOf(code, m.index), 'window');
}
// <script> inline de index.html (línea 74): también define globales.
for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
  const off = m.index;
  for (const d of m[1].matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) addDef(d[1], 'index.html(inline)', lineOf(html, off + d.index), 'function');
}
// window.fn = … dentro de funciones (indentado)
for (const { f, code } of files.filter(x => x.f !== 'index.html'))
  for (const m of code.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)\s*=[^=]/g)) if (!defs.has(m[1])) addDef(m[1], f, lineOf(code, m.index), 'window');

/* ---------- 1. handlers rotos ---------- */
const HANDLER = /\bon(?:click|change|input|submit|keydown|keyup|keypress|focus|blur|load|error|mouseover|mouseout|mouseenter|mouseleave|dblclick|contextmenu|pointerdown|touchstart|scroll)\s*=\s*(?:"([^"]*)"|'([^']*)'|\\"([^"]*)\\")/g;
const broken = [];
const handlerCalls = new Set();
for (const { f, code } of files) {
  for (const m of code.matchAll(HANDLER)) {
    const body = (m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, '0').replace(/'[^']*'|\\'[^']*\\'/g, "''");
    for (const c of body.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) {
      const name = c[1];
      handlerCalls.add(name);
      if (BUILTIN.has(name) || defs.has(name)) continue;
      broken.push({ name, f, line: lineOf(code, m.index), snippet: (m[1] ?? m[2] ?? m[3]).slice(0, 80) });
    }
  }
}

/* ---------- 2. funciones sin referencias ---------- */
const allCode = files.map(x => x.code).join('\n');
const dead = [];
for (const [name, list] of defs) {
  if (!list.some(d => d.kind === 'function')) continue;
  const re = new RegExp('(?<![\\w$])' + name.replace(/\$/g, '\\$') + '(?![\\w$])', 'g');
  const count = (allCode.match(re) || []).length;
  const own = list.length; // cada definición cuenta una aparición
  if (count - own <= 0 && !handlerCalls.has(name)) dead.push({ name, ...list[0] });
}

/* ---------- 3. duplicados ---------- */
const dups = [...defs].filter(([, l]) => new Set(l.map(d => d.f)).size > 1 && l.some(d => d.kind !== 'window' || true))
  .map(([name, l]) => ({ name, where: l.map(d => `${d.f}:${d.line}`) }));

/* ---------- 4. IDs inexistentes (heurística) ---------- */
const idsDefined = new Set();
for (const { code } of files) {
  for (const m of code.matchAll(/\bid\s*=\s*\\?["']([^"'\\$]+)["']/g)) idsDefined.add(m[1]);
  for (const m of code.matchAll(/\bid\s*=\s*\\?["']([^"'\\]*)\$\{/g)) idsDefined.add('PREFIX:' + m[1]);
  for (const m of code.matchAll(/\.id\s*=\s*['"`]([^'"`$]+)['"`]/g)) idsDefined.add(m[1]);
  for (const m of code.matchAll(/\.setAttribute\(\s*['"]id['"]\s*,\s*['"`]([^'"`$]+)['"`]/g)) idsDefined.add(m[1]);
}
const prefixes = [...idsDefined].filter(i => i.startsWith('PREFIX:')).map(i => i.slice(7)).filter(Boolean);
const missingIds = new Map();
for (const { f, code } of files) {
  for (const m of code.matchAll(/getElementById\(\s*(['"`])([^'"`]*)\1\s*\)/g)) {
    const id = m[2];
    if (id.includes('${')) {
      const pre = id.split('${')[0];
      if (pre && !prefixes.some(p => p.startsWith(pre) || pre.startsWith(p))) {
        if (!missingIds.has(id)) missingIds.set(id, []);
        missingIds.get(id).push(`${f}:${lineOf(code, m.index)}`);
      }
      continue;
    }
    if (idsDefined.has(id) || prefixes.some(p => p && id.startsWith(p))) continue;
    if (!missingIds.has(id)) missingIds.set(id, []);
    missingIds.get(id).push(`${f}:${lineOf(code, m.index)}`);
  }
}

/* ---------- reporte ---------- */
const md = [];
md.push('# MS-2.3 · Auditor estático de cableado', '',
  `Generado por \`node scripts/audit-wiring.mjs\` · ${new Date().toISOString().slice(0, 10)}. Heurístico (regex, sin parser): cada hallazgo se confirma a mano antes de actuar. Lo usan M4, M5 y M7.`, '',
  `Alcance: index.html + ${jsFiles.length} JS · ${defs.size} nombres globales definidos.`, '');
md.push(`## 1. Handlers que llaman funciones no definidas (${broken.length})`, '');
md.push(broken.length ? '| Función | Dónde | Handler |\n|---|---|---|' : '_Ninguno._');
for (const b of broken) md.push(`| \`${b.name}\` | ${b.f}:${b.line} | \`${b.snippet.replace(/\|/g, '\\|')}\` |`);
md.push('', `## 2. Funciones sin ninguna referencia (${dead.length}) — candidatas a código muerto para 7.2`, '',
  'Ojo: pueden usarse por nombre dinámico (`window[...]`), desde la consola o desde Android; verificar antes de borrar.', '');
for (const d of dead.sort((a, b) => a.f.localeCompare(b.f))) md.push(`- \`${d.name}\` · ${d.f}:${d.line}`);
md.push('', `## 3. Nombres globales duplicados entre archivos (${dups.length})`, '');
for (const d of dups) md.push(`- \`${d.name}\` · ${d.where.join(', ')}`);
md.push('', `## 4. getElementById con ID que no existe en ningún template (${missingIds.size}) — heurística`, '');
for (const [id, w] of missingIds) md.push(`- \`${id}\` · ${w.slice(0, 4).join(', ')}${w.length > 4 ? ` (+${w.length - 4})` : ''}`);
md.push('');
mkdirSync(join(ROOT, 'docs', 'reportes'), { recursive: true });
writeFileSync(join(ROOT, 'docs', 'reportes', 'MS-2.3-cableado.md'), md.join('\n'));
console.log(`[audit-wiring] rotos ${broken.length} · muertas ${dead.length} · duplicados ${dups.length} · IDs ${missingIds.size}`);
