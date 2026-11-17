'use strict';
/* Tests en node: SYNC-1 (Publicar save). Funciones puras de pes5-plantilla.js:
   saveMasViejoQuePublicado (guarda de «tu save es mas viejo») y pedidosDeEquipos (aviso de pedidos
   que quedan viejos). Fixtures INVENTADOS.
   Correr: node --test tools/test-sync-1.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../tsc-src/js/pes5-plantilla.js');

test('saveMasViejoQuePublicado: sin publicado o sin fecha local no avisa', () => {
  assert.equal(P.saveMasViejoQuePublicado(1000, null), false);
  assert.equal(P.saveMasViejoQuePublicado(undefined, { lastModified: 2000 }), false);
  assert.equal(P.saveMasViejoQuePublicado(null, { lastModified: 2000 }), false);
});

test('saveMasViejoQuePublicado: compara contra lastModified guardado en la subida', () => {
  const pub = { lastModified: 5000, subidoEn: new Date(9000) };   // lastModified manda sobre subidoEn
  assert.equal(P.saveMasViejoQuePublicado(4000, pub), true);      // local mas viejo: avisa
  assert.equal(P.saveMasViejoQuePublicado(5000, pub), false);     // mismo archivo: no avisa
  assert.equal(P.saveMasViejoQuePublicado(6000, pub), false);     // local mas nuevo: no avisa
});

test('saveMasViejoQuePublicado: el save recien subido no se marca como viejo contra su propia subida', () => {
  // Por eso se guarda lastModified: subidoEn (hora del servidor) siempre es posterior al archivo.
  const mtime = 7000;
  const pub = { lastModified: mtime, subidoEn: new Date(8000) };
  assert.equal(P.saveMasViejoQuePublicado(mtime, pub), false);
});

test('saveMasViejoQuePublicado: publicacion anterior a SYNC-1 (sin lastModified) compara con subidoEn', () => {
  const pub = { lastModified: null, subidoEn: new Date(9000) };
  assert.equal(P.saveMasViejoQuePublicado(8000, pub), true);
  assert.equal(P.saveMasViejoQuePublicado(9500, pub), false);
  assert.equal(P.saveMasViejoQuePublicado(8000, { subidoEn: 9000 }), true);   // subidoEn como numero
});

test('pedidosDeEquipos: devuelve solo los pedidos de los equipos que cambian (teamId como texto)', () => {
  const pedidos = [
    { _id: 'a', teamId: '3' },
    { _id: 'b', teamId: 7 },
    { _id: 'c', teamId: '9' },
    { _id: 'd' },
  ];
  const r = P.pedidosDeEquipos(pedidos, [3, '7']);
  assert.deepEqual(r.map(p => p._id), ['a', 'b']);
});

test('pedidosDeEquipos: sin equipos o sin pedidos devuelve lista vacia', () => {
  assert.deepEqual(P.pedidosDeEquipos([{ _id: 'a', teamId: '1' }], []), []);
  assert.deepEqual(P.pedidosDeEquipos(null, [1]), []);
});
