// Solo desarrollo (no se publica). Arranca los emuladores de Firestore y
// Auth del sandbox (MS-2.1) con Java en el PATH, aunque no esté en el PATH
// del sistema. Busca Java en JAVA_HOME y luego en ~/jdk-temurin-21.
//
// Uso: node scripts/emu-start.mjs   (config tsc-emu-backend de launch.json)
// Con --functions también levanta el emulador de Functions (:5001); necesita
// `npm install` dentro de functions/.
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const exe = process.platform === 'win32' ? 'java.exe' : 'java';
const candidates = [process.env.JAVA_HOME, path.join(homedir(), 'jdk-temurin-21')].filter(Boolean);
// El zip de Temurin se descomprime con una carpeta intermedia (jdk-21.x+y).
const homes = candidates.flatMap(h => {
  let subs = [];
  try { subs = readdirSync(h, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => path.join(h, d.name)); } catch {}
  return [h, ...subs];
});
const javaHome = homes.find(h => existsSync(path.join(h, 'bin', exe)));
const env = { ...process.env };
if (javaHome) {
  env.JAVA_HOME = javaHome;
  // En Windows la clave suele ser "Path"; se reusa la que exista.
  const key = Object.keys(env).find(k => k.toUpperCase() === 'PATH') || 'PATH';
  env[key] = path.join(javaHome, 'bin') + path.delimiter + (env[key] || '');
  console.log('[emu-start] Java:', javaHome);
} else {
  console.warn('[emu-start] No encontré Java en JAVA_HOME ni en ~/jdk-temurin-21; se usa el del PATH.');
}

// En esta máquina la JVM no puede crear sockets AF_UNIX en %TEMP% (el
// Selector de NIO falla con "Invalid argument: connect" y el emulador de
// Firestore muere al arrancar). Se le da otro directorio para esos sockets.
const sockDir = path.join(homedir(), '.cache', 'firebase');
if (existsSync(sockDir)) {
  env.JAVA_TOOL_OPTIONS = `${env.JAVA_TOOL_OPTIONS || ''} -Djdk.net.unixdomain.tmpdir="${sockDir}"`.trim();
}

const only = process.argv.includes('--functions') ? 'firestore,auth,functions' : 'firestore,auth';
// Comando en un solo string: en Windows firebase es un .cmd y necesita shell.
const child = spawn(`firebase emulators:start --only ${only} --project tsc-web-yuna`, {
  env, stdio: 'inherit', shell: true,
});
child.on('exit', code => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
