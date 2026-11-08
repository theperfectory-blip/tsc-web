'use strict';
/* Tests en node: plantillas publicadas desactualizadas (aviso de la Tool, teamHash por equipo, 5.E)
   y suscriptor de un jugador publicado (defensa del editor del presidente). Fixtures INVENTADOS.
   Correr: node --test tools/test-pes5-plantilla-publicadas.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const P = require('../tsc-src/js/pes5-plantilla.js');

// Mismo calculo que la Tool (_sha256Texto sobre contenidoDelEquipo), con node:crypto.
const teamHash = (jugadores, formacion) =>
  crypto.createHash('sha256').update(P.contenidoDelEquipo(jugadores, formacion)).digest('hex');

const ROSTER_A = [{ id: 'r1', name: 'Ana', stats: { ataque: 70 } }, { id: 'r2', name: 'Beto', stats: { ataque: 60 } }];
const ROSTER_B = [{ id: 'r9', name: 'Caro', stats: { ataque: 80 } }];
const FORM_A = { nombre: 'Formacion 4-4-2', slots: [{ slot: 0, jugador: 'r1' }] };

test('canonicoJSON: el mismo contenido da el mismo texto aunque cambie el orden de las claves', () => {
  assert.equal(P.canonicoJSON({ b: 1, a: { y: 2, x: 3 } }), P.canonicoJSON({ a: { x: 3, y: 2 }, b: 1 }));
  assert.equal(P.canonicoJSON({ a: undefined, b: 1 }), P.canonicoJSON({ b: 1 }));
});

test('teamHash: cambiar un jugador de ESTE equipo cambia su hash', () => {
  const antes = teamHash(ROSTER_A, FORM_A);
  const rosterACambiado = [{ id: 'r1', name: 'Ana', stats: { ataque: 71 } }, ROSTER_A[1]];
  assert.notEqual(teamHash(rosterACambiado, FORM_A), antes);
  assert.notEqual(teamHash(ROSTER_A, { nombre: 'Otra', slots: [] }), antes);   // tambien la formacion cuenta
});

test('plantillaDesactualizada: mismo contenido y mismo club estan al dia', () => {
  const pub = { teamHash: 'h1', pes5ClubIdx: 3 };
  assert.equal(P.plantillaDesactualizada(pub, { pes5ClubIdx: 3 }, 'h1'), false);
});

test('plantillaDesactualizada: el contenido de este equipo cambio', () => {
  const pub = { teamHash: 'h1', pes5ClubIdx: 3 };
  assert.equal(P.plantillaDesactualizada(pub, { pes5ClubIdx: 3 }, 'h2'), true);
});

test('plantillaDesactualizada: el club vinculado cambio aunque el contenido sea el mismo', () => {
  const pub = { teamHash: 'h1', pes5ClubIdx: 3 };
  assert.equal(P.plantillaDesactualizada(pub, { pes5ClubIdx: 4 }, 'h1'), true);
});

test('plantillaDesactualizada: una publicacion vieja, sin teamHash, cuenta como desactualizada', () => {
  const vieja = { saveHash: 'hash-global-viejo', pes5ClubIdx: 3 };
  assert.equal(P.plantillaDesactualizada(vieja, { pes5ClubIdx: 3 }, 'h1'), true);
});

test('5.E: cambiar un jugador de OTRO equipo no deja desactualizada la plantilla de este', () => {
  // Un save con dos equipos: A (club 2) y B (club 4). Se publica A, despues cambia un jugador de B.
  const pubA = { teamHash: teamHash(ROSTER_A, FORM_A), pes5ClubIdx: 2, saveHash: 'hash-del-save-viejo' };
  const equipoA = { id: 1, name: 'Arsenal', pes5ClubIdx: 2 };
  // el contenido de A se lee del save nuevo: sus registros no cambiaron
  assert.equal(P.plantillaDesactualizada(pubA, equipoA, teamHash(ROSTER_A, FORM_A)), false);
  // y la de B si queda desactualizada: su contenido cambio
  const pubB = { teamHash: teamHash(ROSTER_B, FORM_A), pes5ClubIdx: 4 };
  const rosterBCambiado = [{ id: 'r9', name: 'Caro', stats: { ataque: 85 } }];
  assert.equal(P.plantillaDesactualizada(pubB, { pes5ClubIdx: 4 }, teamHash(rosterBCambiado, FORM_A)), true);
});

test('desactualizadas: solo los equipos con plantilla publicada que no coincide; los nunca publicados no salen', () => {
  const equipos = [
    { id: 1, name: 'Arsenal', pes5ClubIdx: 2 },
    { id: 2, name: 'Malvinas Jr', pes5ClubIdx: 5 },
    { id: 3, name: 'Sin publicar', pes5ClubIdx: 6 },
  ];
  const publicadas = {
    1: { teamHash: 'viejo', pes5ClubIdx: 2 },      // el contenido de Arsenal cambio: desactualizada
    2: { teamHash: 'h-dos', pes5ClubIdx: 5 },      // al dia
  };
  const hashes = { 1: 'h-uno', 2: 'h-dos' };
  assert.deepEqual(P.desactualizadas(equipos, publicadas, hashes), [{ teamId: 1, teamName: 'Arsenal' }]);
});

test('desactualizadas: sin publicadas o sin equipos no hay aviso', () => {
  assert.deepEqual(P.desactualizadas([{ id: 1, name: 'X', pes5ClubIdx: 1 }], {}, {}), []);
  assert.deepEqual(P.desactualizadas(undefined, { 1: { teamHash: 'a', pes5ClubIdx: 1 } }, {}), []);
});

test('esSuscriptorPublicado: el flag, o el nombre con $ aunque la publicacion sea vieja', () => {
  // jugador renombrado en el juego a «$Renombrado»; la plantilla publicada no trae el flag
  assert.equal(P.esSuscriptorPublicado({ name: '$Renombrado', subscriber: false }), true);
  assert.equal(P.esSuscriptorPublicado({ name: 'Juan', subscriber: true }), true);
  assert.equal(P.esSuscriptorPublicado({ name: 'Juan', subscriber: false }), false);
  assert.equal(P.esSuscriptorPublicado({ name: null, subscriber: false }), false);
  assert.equal(P.esSuscriptorPublicado({}), false);
});
