'use strict';
/* Tests en node del club PES5 repetido (slice 2.0-4). Fixtures INVENTADOS (nombres de equipo y
   indices de club de ejemplo). Correr: node --test tools/test-pes5-clubes.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../tsc-src/js/pes5-clubes.js');

const CLUBES = ['Club Uno', 'Club Dos', 'Arsenal', 'Club Cuatro', 'Club Cinco', 'Club Seis'];

// Equipos de ejemplo. Arsenal (idx 2) lo tiene FK; Malvinas Jr (id 2) lo quiere.
const EQ = [
  { id: 1, name: 'FK', pes5ClubIdx: 2, status: 'ACTIVO' },
  { id: 2, name: 'Malvinas Jr', pes5ClubIdx: 4, status: 'ACTIVO' },
  { id: 3, name: 'Sin club', pes5ClubIdx: null, status: 'ACTIVO' },
  { id: 4, name: 'Inactivo', pes5ClubIdx: 5, status: 'INACTIVO' },
];

test('duenosDeClub: solo equipos activos y con club; un club puede tener varios dueños si hay duplicado', () => {
  const m = C.duenosDeClub(EQ);
  assert.deepEqual(m.get(2).map(t => t.id), [1]);
  assert.deepEqual(m.get(4).map(t => t.id), [2]);
  assert.equal(m.has(5), false);                       // el equipo inactivo no cuenta
  const dup = [...EQ, { id: 5, name: 'Dup', pes5ClubIdx: 2, status: 'ACTIVO' }];
  assert.deepEqual(C.duenosDeClub(dup).get(2).map(t => t.id), [1, 5]);
});

test('otroEquipoConClub: el club de otro equipo activo bloquea; el propio no', () => {
  assert.equal(C.otroEquipoConClub(EQ, 2, 2).name, 'FK');      // Malvinas quiere Arsenal: lo tiene FK
  assert.equal(C.otroEquipoConClub(EQ, 2, 1), null);           // FK ya es dueno: no es otro
  assert.equal(C.otroEquipoConClub(EQ, 3, 2), null);           // club libre
  assert.equal(C.otroEquipoConClub(EQ, null, 2), null);        // desvincular siempre se permite
});

test('otroEquipoConClub: compara el indice como numero (la base puede traerlo como texto)', () => {
  const texto = [{ id: 1, name: 'FK', pes5ClubIdx: '2', status: 'ACTIVO' }];
  assert.equal(C.otroEquipoConClub(texto, 2, 9).name, 'FK');
});

test('otroEquipoConClub: un equipo inactivo no bloquea el club', () => {
  assert.equal(C.otroEquipoConClub(EQ, 5, 2), null);           // el club 5 solo lo tiene un inactivo
});

test('repetidoDe: marca el club compartido de un equipo ya guardado, no un club propio', () => {
  const dup = [...EQ, { id: 5, name: 'Dup', pes5ClubIdx: 2, status: 'ACTIVO' }];
  assert.equal(C.repetidoDe(dup[0], dup).name, 'Dup');         // FK comparte Arsenal con Dup
  assert.equal(C.repetidoDe(EQ[1], EQ), null);                 // Malvinas tiene un club libre de otros
  assert.equal(C.repetidoDe(EQ[3], EQ), null);                 // inactivo: no se marca
});

test('opcionesClub: el club de otro equipo sale deshabilitado con su dueño; el propio sigue elegible', () => {
  const opc = C.opcionesClub(CLUBES, EQ, EQ[1]);              // Malvinas Jr (club 4)
  const arsenal = opc.find(o => o.value === '2');              // Arsenal lo tiene FK
  assert.equal(arsenal.disabled, true);
  assert.equal(arsenal.label, 'Arsenal (FK)');
  const propio = opc.find(o => o.value === '4');              // su propio club
  assert.equal(propio.disabled, false);
  assert.equal(propio.selected, true);
  const libre = opc.find(o => o.value === '0');
  assert.equal(libre.disabled, false);
  assert.equal(libre.label, 'Club Uno');
});

test('opcionesClub: primera opcion «sin asignar», y seleccionada si el equipo no tiene club', () => {
  const opc = C.opcionesClub(CLUBES, EQ, EQ[2]);              // Sin club
  assert.equal(opc[0].value, '');
  assert.equal(opc[0].selected, true);
  assert.equal(opc.filter(o => o.selected).length, 1);
});

test('opcionesClub: con un duplicado ya guardado, el dueño actual conserva su club seleccionado', () => {
  const dup = [...EQ, { id: 5, name: 'Dup', pes5ClubIdx: 2, status: 'ACTIVO' }];
  const opc = C.opcionesClub(CLUBES, dup, dup[0]);            // FK, con Arsenal compartido
  const arsenal = opc.find(o => o.value === '2');
  assert.equal(arsenal.selected, true);
  assert.equal(arsenal.disabled, false);                      // su propio club sigue elegible
});
