// Solo desarrollo (no se publica). Variante `dist` del sandbox (revisión de
// MS-2.1/2.2): la config hosting-dist abre :5050 SIN ?emu=1, así que su
// primera carga va a producción. Esta sirve el build de dist del sandbox en
// :3001, que firebase-config.js ya trata como modo emulador.
//
// 1. Copia a sandbox/site el código actual de tsc-src (index.html,
//    manifest, css/, js/, data/). assets/ NO se toca: queda la copia
//    recortada de emu-snapshot.mjs.
// 2. node scripts/build-web.mjs --src=sandbox/site --dest=sandbox/dist
// 3. Sirve sandbox/dist en :3001.
//
// Uso: node scripts/emu-dist.mjs   (config tsc-emu-dist de launch.json).
// Usa el mismo puerto que tsc-emu: corre una de las dos a la vez.
// Requiere sandbox/ (emu-snapshot.mjs) y los emuladores (tsc-emu-backend).
import { spawn, execFileSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isExcluded } from './build-exclude.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SITE = join(ROOT, 'sandbox', 'site');
if (!existsSync(SITE)) {
  console.error('[emu-dist] Falta sandbox/site: corre antes node scripts/emu-snapshot.mjs');
  process.exit(1);
}

for (const name of ['index.html', 'manifest.webmanifest', 'css', 'js', 'data']) {
  const from = join(ROOT, 'tsc-src', name);
  if (!existsSync(from)) continue;
  rmSync(join(SITE, name), { recursive: true, force: true });
  cpSync(from, join(SITE, name), { recursive: true, filter: src => !isExcluded(src) });
}
console.log('[emu-dist] sandbox/site: código sincronizado desde tsc-src (assets sin tocar)');

execFileSync(process.execPath, [join(ROOT, 'scripts', 'build-web.mjs'), '--src=sandbox/site', '--dest=sandbox/dist'], { stdio: 'inherit' });

const serve = spawn('npx', ['serve', 'sandbox/dist', '-l', '3001'], { cwd: ROOT, stdio: 'inherit', shell: true });
serve.on('exit', code => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => serve.kill(sig));
