#!/usr/bin/env node
'use strict';
/* Reduce las copas 3D de la Sala del Palmarés a un número de triángulos que
   una GPU modesta (o un teléfono vía APK) puede girar a 60 fps.

   Los GLB originales traían ~1.4–2.3 M de triángulos cada uno: más triángulos
   que píxeles ocupa la copa en pantalla, así que el detalle extra no se ve
   pero sí cuesta (decodificar Draco, memoria y fps). Se simplifican con
   meshoptimizer (manteniendo bordes/costuras de UV) y se re-comprimen con
   Draco, igual que los originales — palmares.js no cambia.

   Entrada:  assets-src/trophies-hi/copa_N.glb   (originales, fuera del deploy;
             también recuperables con `git show c02cc00:tsc-src/assets/trophies/copa_N.glb`)
   Salida:   tsc-src/assets/trophies/copa_N.glb

   Uso: node scripts/optimize-trophies.mjs [ratio] [error]
        defaults: ratio 0.25 (≈25 % de los triángulos), error 0.01
        (0.25 se eligió comparando píxel a píxel contra el original: por debajo
        de ~0.2 el cuerpo liso de las copas "escaneadas" empieza a mancharse,
        porque sus normales originales son ruidosas) */
import { readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, prune, dedup, draco } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, 'assets-src', 'trophies-hi');
const DEST = join(ROOT, 'tsc-src', 'assets', 'trophies');
const ratio = Number(process.argv[2] || 0.25);
const error = Number(process.argv[3] || 0.01);

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule()
  });

await MeshoptSimplifier.ready;
mkdirSync(DEST, { recursive: true });

function countTris(doc){
  let n = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      n += (idx ? idx.getCount() : prim.getAttribute('POSITION').getCount()) / 3;
    }
  }
  return n;
}

for (const file of readdirSync(SRC).filter(f => f.endsWith('.glb')).sort()) {
  const doc = await io.read(join(SRC, file));
  const before = countTris(doc);
  await doc.transform(
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio, error }),
    dedup(),
    prune(),
    draco()
  );
  const after = countTris(doc);
  const out = join(DEST, file);
  await io.write(out, doc);
  console.log(`${file}: ${Math.round(before).toLocaleString()} → ${Math.round(after).toLocaleString()} triángulos`);
}
