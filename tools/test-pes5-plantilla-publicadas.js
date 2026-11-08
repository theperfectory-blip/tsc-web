'use strict';
/* Tests en node: plantillas publicadas desactualizadas (aviso de la Tool) y suscriptor de un
   jugador publicado (defensa del editor del presidente). Fixtures INVENTADOS.
   Correr: node --test tools/test-pes5-plantilla-publicadas.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../tsc-src/js/pes5-plantilla.js');

test('plantillaDesactualizada: el mismo save y el mismo club estan al dia', () => {
  const pub = { saveHash: 'h1', pes5ClubIdx: 3 };
  assert.equal(P.plantillaDesactualizada(pub, { pes5ClubIdx: 3 }, 'h1'), false);
});

test('plantillaDesactualizada: el save cambio desde la publicacion', () => {
  const pub = { saveHash: 'h1', pes5ClubIdx: 3 };
  assert.equal(P.plantillaDesactualizada(pub, { pes5ClubIdx: 3 }, 'h2'), true);
});

test('plantillaDesactualizada: el club vinculado cambio aunque el save sea el mismo', () => {
  const pub = { saveHash: 'h1', pes5ClubIdx: 3 };
  assert.equal(P.plantillaDesactualizada(pub, { pes5ClubIdx: 4 }, 'h1'), true);
});

test('desactualizadas: solo los equipos con plantilla publicada que no coincide; los nunca publicados no salen', () => {
  const equipos = [
    { id: 1, name: 'Arsenal', pes5ClubIdx: 2 },
    { id: 2, name: 'Malvinas Jr', pes5ClubIdx: 5 },
    { id: 3, name: 'Sin publicar', pes5ClubIdx: 6 },
  ];
  const publicadas = {
    1: { saveHash: 'viejo', pes5ClubIdx: 2 },      // el save cambio: desactualizada
    2: { saveHash: 'h-actual', pes5ClubIdx: 5 },   // al dia
  };
  assert.deepEqual(P.desactualizadas(equipos, publicadas, 'h-actual'), [{ teamId: 1, teamName: 'Arsenal' }]);
});

test('desactualizadas: sin publicadas o sin equipos no hay aviso', () => {
  assert.deepEqual(P.desactualizadas([{ id: 1, name: 'X', pes5ClubIdx: 1 }], {}, 'h'), []);
  assert.deepEqual(P.desactualizadas(undefined, { 1: { saveHash: 'a', pes5ClubIdx: 1 } }, 'h'), []);
});

test('esSuscriptorPublicado: el flag, o el nombre con $ aunque la publicacion sea vieja', () => {
  // jugador renombrado en el juego a «$Renombrado»; la plantilla publicada no trae el flag
  assert.equal(P.esSuscriptorPublicado({ name: '$Renombrado', subscriber: false }), true);
  assert.equal(P.esSuscriptorPublicado({ name: 'Juan', subscriber: true }), true);
  assert.equal(P.esSuscriptorPublicado({ name: 'Juan', subscriber: false }), false);
  assert.equal(P.esSuscriptorPublicado({ name: null, subscriber: false }), false);
  assert.equal(P.esSuscriptorPublicado({}), false);
});
