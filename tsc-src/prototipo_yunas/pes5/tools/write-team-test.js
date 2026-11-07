// Prueba de escritura de plantillas de equipo (bloque 5). Usa la formula
// confirmada offset=667458+indice_equipo*64+slot*2 (32 slots de uint16LE,
// 0=vacio) para: dar de baja a un jugador (swap con el ultimo slot activo,
// clasico swap-and-pop) y transferir un jugador (baja en origen + alta en
// el primer slot vacio del destino). No reproduce el orden interno exacto
// que usa el juego (arquero/defensa/medio/delantero) — solo garantiza que
// los slots activos queden compactos al inicio, sin huecos.
const fs = require('fs'), path = require('path');
const { descifrar, cifrar } = require('./pes5-crypt.js');

const TEAM_BASE = 803608, TEAM_STRIDE = 140;
const ROSTER_BASE = 667458, ROSTER_STRIDE = 64, SLOTS = 32;
const PLAYER_BASE = 36872, PLAYER_STRIDE = 124;

function teamName(buf, i) {
  const off = TEAM_BASE + i * TEAM_STRIDE;
  return buf.slice(off, off + 16).toString('latin1').split('\0')[0].trim();
}
function findTeamIndex(buf, nombre) {
  const total = 138;
  for (let i = 0; i < total; i++) if (teamName(buf, i) === nombre) return i;
  throw new Error('equipo no encontrado: ' + nombre);
}
function playerName(buf, id) {
  const off = PLAYER_BASE + id * PLAYER_STRIDE;
  return buf.slice(off, off + 30).toString('utf16le').split('\0')[0].trim();
}
function findPlayerId(buf, nombre) {
  for (let i = 0; i < 5000; i++) if (playerName(buf, i) === nombre) return i;
  throw new Error('jugador no encontrado: ' + nombre);
}
function rosterOffset(teamIndex) { return ROSTER_BASE + teamIndex * ROSTER_STRIDE; }
function readRoster(buf, teamIndex) {
  const off = rosterOffset(teamIndex);
  const slots = [];
  for (let s = 0; s < SLOTS; s++) slots.push(buf.readUInt16LE(off + s * 2));
  return slots;
}
function writeRoster(buf, teamIndex, slots) {
  const off = rosterOffset(teamIndex);
  for (let s = 0; s < SLOTS; s++) buf.writeUInt16LE(slots[s] || 0, off + s * 2);
}
function removeFromTeam(buf, teamIndex, playerId) {
  const slots = readRoster(buf, teamIndex);
  const idx = slots.indexOf(playerId);
  if (idx < 0) throw new Error('jugador ' + playerId + ' no esta en el equipo ' + teamIndex);
  let lastActive = -1;
  for (let s = 0; s < SLOTS; s++) if (slots[s] !== 0) lastActive = s;
  if (idx !== lastActive) slots[idx] = slots[lastActive];
  slots[lastActive] = 0;
  writeRoster(buf, teamIndex, slots);
}
function addToTeam(buf, teamIndex, playerId) {
  const slots = readRoster(buf, teamIndex);
  const free = slots.indexOf(0);
  if (free < 0) throw new Error('equipo ' + teamIndex + ' sin cupo (32/32)');
  slots[free] = playerId;
  writeRoster(buf, teamIndex, slots);
}

const entrada = process.argv[2];
const salida = process.argv[3];
if (!entrada || !salida) {
  console.error('uso: node write-team-test.js <entrada> <salida>');
  process.exit(1);
}

const d = descifrar(fs.readFileSync(entrada));

// 1) baja: Harkins fuera de Blackburn Rovers
const tBlackburn = findTeamIndex(d, 'Blackburn Rovers');
const idHarkins = findPlayerId(d, 'Harkins');
console.log(`Baja: Harkins (id ${idHarkins}) fuera de Blackburn Rovers (equipo ${tBlackburn})`);
console.log('  roster antes:', readRoster(d, tBlackburn).filter(Boolean).map(id => playerName(d, id)));
removeFromTeam(d, tBlackburn, idHarkins);
console.log('  roster despues:', readRoster(d, tBlackburn).filter(Boolean).map(id => playerName(d, id)));

// 2) traspaso: Forssell de Birmingham City a Aston Villa
const tBirmingham = findTeamIndex(d, 'Birmingham City');
const tAstonVilla = findTeamIndex(d, 'Aston Villa');
const idForssell = findPlayerId(d, 'Forssell');
console.log(`Traspaso: Forssell (id ${idForssell}) de Birmingham City (${tBirmingham}) a Aston Villa (${tAstonVilla})`);
console.log('  Birmingham antes:', readRoster(d, tBirmingham).filter(Boolean).map(id => playerName(d, id)));
console.log('  Aston Villa antes:', readRoster(d, tAstonVilla).filter(Boolean).map(id => playerName(d, id)));
removeFromTeam(d, tBirmingham, idForssell);
addToTeam(d, tAstonVilla, idForssell);
console.log('  Birmingham despues:', readRoster(d, tBirmingham).filter(Boolean).map(id => playerName(d, id)));
console.log('  Aston Villa despues:', readRoster(d, tAstonVilla).filter(Boolean).map(id => playerName(d, id)));

const out = cifrar(d);
fs.writeFileSync(salida, out);
console.log(`\nEscrito: ${salida} (${out.length} b)`);
