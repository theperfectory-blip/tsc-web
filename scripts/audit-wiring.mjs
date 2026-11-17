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
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, 'tsc-src');
const html = readFileSync(join(SRC, 'index.html'), 'utf8');
const jsFilesHtml = [...html.matchAll(/<script(?: data-boot)? src="(js\/[^"]+\.js)"><\/script>/g)].map(m => m[1]);
// Tambien los que se cargan a demanda (p. ej. js/pes5-admin.js pide la Tool PES5 con document.createElement('script')):
// sus nombres aparecen como literales 'js/….js' en otros archivos js/. Sin esto la Tool no se auditaba.
const jsFilesLazy = new Set();
for (const f of readdirSync(join(SRC, 'js'))) {
  if (!f.endsWith('.js')) continue;
  const code = readFileSync(join(SRC, 'js', f), 'utf8');
  for (const m of code.matchAll(/['"`](js\/[\w\-./]+\.js)['"`]/g)) jsFilesLazy.add(m[1]);
}
const jsFiles = [...new Set([...jsFilesHtml, ...jsFilesLazy])];
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

// Un match en una línea de comentario (empieza con //, /* o *) no es un handler real: se ignora.
const enComentario = (code, idx) => {
  const ini = code.lastIndexOf('\n', idx - 1) + 1;
  const l = code.slice(ini, idx).trimStart();
  return l.startsWith('//') || l.startsWith('/*') || l.startsWith('*');
};

/* ---------- 1. handlers rotos ---------- */
const HANDLER = /\bon(?:click|change|input|submit|keydown|keyup|keypress|focus|blur|load|error|mouseover|mouseout|mouseenter|mouseleave|dblclick|contextmenu|pointerdown|touchstart|scroll|dragstart|dragover|dragleave|dragend|drop)\s*=\s*(?:"([^"]*)"|'([^']*)'|\\"([^"]*)\\")/g;
const broken = [];
const handlerCalls = new Set();
for (const { f, code } of files) {
  for (const m of code.matchAll(HANDLER)) {
    if (enComentario(code, m.index)) continue;
    const body = (m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, '0').replace(/'[^']*'|\\'[^']*\\'/g, "''");
    for (const c of body.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) {
      const name = c[1];
      handlerCalls.add(name);
      if (BUILTIN.has(name) || defs.has(name)) continue;
      broken.push({ name, f, line: lineOf(code, m.index), snippet: (m[1] ?? m[2] ?? m[3]).slice(0, 80) });
    }
  }
}

/* ---------- 1a. handlers que existen pero no son propiedad de window ----------
   js/events.js resuelve data-onclick="fn(…)" con window[fn]. Una función que solo está
   definida dentro de una IIFE (p. ej. pes5-tool.js) existe en el archivo, pero window[fn]
   es undefined: el click no hace nada. Por eso la sección 1 no la ve (cuenta como definida).
   Un nombre es «de window» si: lo asigna `window.fn =` en algún archivo, o es una
   `function`/`var` de primer nivel en un archivo que no va envuelto en IIFE. */
// Rangos (offsets) de los IIFE de primer nivel: van de `(function(){` o `(() =>` en columna 0 al `})();` siguiente.
const iifeRanges = code => {
  const r = [];
  const abre = /^\((?:function\s*\(\s*\)|\(\s*\)\s*=>)/gm;
  let m;
  while ((m = abre.exec(code))) {
    const cierre = /^\}\)\(\);?[ \t]*$/gm;
    cierre.lastIndex = m.index;
    const c = cierre.exec(code);
    r.push([m.index, c ? c.index : code.length]);
  }
  return r;
};
const dentroDeIIFE = (ranges, idx) => ranges.some(([a, b]) => idx >= a && idx <= b);
const winProps = new Set();
for (const { code } of files) for (const m of code.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)\s*=[^=]/g)) winProps.add(m[1]);
for (const { f, code } of files.filter(x => x.f !== 'index.html')) {
  const rangos = iifeRanges(code);
  for (const m of code.matchAll(/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/gm)) if (!dentroDeIIFE(rangos, m.index)) winProps.add(m[1]);
  for (const m of code.matchAll(/^var\s+([A-Za-z_$][\w$]*)\s*=/gm)) if (!dentroDeIIFE(rangos, m.index)) winProps.add(m[1]);
}
for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))
  for (const d of m[1].matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) winProps.add(d[1]);
const noWindow = [];
for (const { f, code } of files) {
  for (const m of code.matchAll(HANDLER)) {
    if (enComentario(code, m.index)) continue;
    const body = (m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, '0').replace(/'[^']*'|\\'[^']*\\'/g, "''");
    for (const c of body.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) {
      const name = c[1];
      if (BUILTIN.has(name) || winProps.has(name) || !defs.has(name)) continue; // los no definidos ya salen en 1
      noWindow.push({ name, f, line: lineOf(code, m.index), snippet: (m[1] ?? m[2] ?? m[3]).slice(0, 80) });
    }
  }
}

/* ---------- 1b. gramática de los data-on* (MS-7.5) ----------
   js/events.js ejecuta los handlers con una gramática fija (sin eval): un
   handler que no la cumple no corre. Las partes armadas en runtime (${…} y
   '+expr+') se reemplazan por un valor antes de leerlo. */
const { _onParse } = createRequire(import.meta.url)(join(SRC, 'js', 'events.js'));
const unparsable = [];
for (const { f, code } of files) {
  if (f === 'js/events.js') continue;
  for (const m of code.matchAll(HANDLER)) {
    if (enComentario(code, m.index)) continue;
    let body = m[1] ?? m[2] ?? m[3] ?? '';
    if (/^\s*(\$\{[^}]*\}|'\+\w+\+')\s*$/.test(body)) continue; // handler entero armado en otra variable
    // Un ${…} en posición de sentencia (inicio o tras «;») es una llamada (p. ej. ${onDec}); el resto, un valor.
    body = body.replace(/(^|;)\s*\$\{[^}]*\}/g, '$1f()').replace(/\$\{[^}]*\}/g, '0').replace(/'\+[^']*?\+'/g, '0').replace(/\\'/g, "'")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    try { _onParse(body); }
    catch (e) { unparsable.push({ f, line: lineOf(code, m.index), snippet: (m[1] ?? m[2] ?? m[3]).slice(0, 80), err: e.message }); }
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
md.push('', `## 1a. Handlers data-on* que no son window.<nombre> (${noWindow.length}) — el click no hace nada`, '');
md.push(noWindow.length ? '| Función | Dónde | Handler |\n|---|---|---|' : '_Ninguno._');
for (const b of noWindow) md.push(`| \`${b.name}\` | ${b.f}:${b.line} | \`${b.snippet.replace(/\|/g, '\\|')}\` |`);
md.push('', `## 1b. Handlers data-on* fuera de la gramática de js/events.js (${unparsable.length})`, '');
md.push(unparsable.length ? '| Dónde | Handler | Error |\n|---|---|---|' : '_Ninguno._');
for (const u of unparsable) md.push(`| ${u.f}:${u.line} | \`${u.snippet.replace(/\|/g, '\\|')}\` | ${u.err} |`);
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
console.log(`[audit-wiring] rotos ${broken.length + noWindow.length} (no definidas ${broken.length} · sin window ${noWindow.length}) · fuera de gramática ${unparsable.length} · muertas ${dead.length} · duplicados ${dups.length} · IDs ${missingIds.size}`);
