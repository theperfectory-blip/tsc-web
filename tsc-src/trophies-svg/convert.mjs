import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import sharp from 'sharp';

const dir = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

const svgFiles = readdirSync(dir).filter(f => f.endsWith('.svg'));
console.log(`Convirtiendo ${svgFiles.length} SVGs...`);

for (const file of svgFiles) {
  const svgPath = join(dir, file);
  const pngPath = join(dir, basename(file, '.svg') + '.png');
  await sharp(svgPath)
    .resize(800, 960)
    .png()
    .toFile(pngPath);
  console.log(`  ✓ ${basename(file, '.svg')}.png`);
}
console.log('Listo.');
