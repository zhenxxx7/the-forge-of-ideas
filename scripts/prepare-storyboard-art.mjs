import sharp from 'sharp';
import path from 'node:path';

// The built-in image generator's original exports remain untouched.
const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/prepare-storyboard-art.mjs <generated-image-directory>');
const atlas = path.join(source, 'exec-5dfc222d-638a-418f-a5ee-384ae35d3d7d.png');
const potions = path.join(source, 'exec-e5029f4a-0050-49c7-ba15-28ae3817366a.png');
for (let index = 0; index < 9; index++) {
  const cell = await sharp(atlas).extract({ left: index % 3 * 418, top: Math.floor(index / 3) * 418, width: 418, height: 418 }).toBuffer();
  await sharp(cell).trim({ threshold: 15 }).resize(240, 240, { fit: 'contain', background: '#00000000' }).webp({ quality: 92 }).toFile(`public/assets/ore-${index}.webp`);
}
for (let index = 0; index < 3; index++) {
  const cell = await sharp(potions).extract({ left: index * 512, top: 0, width: 512, height: 1024 }).toBuffer();
  await sharp(cell).trim({ threshold: 15 }).resize(320, 560, { fit: 'contain', background: '#00000000' }).webp({ quality: 93 }).toFile(`public/assets/infusion-${index}.webp`);
}
await sharp(path.join(source, 'exec-da70edb1-1c81-4964-9df8-ae9dd861e39a.png')).trim({ threshold: 15 }).resize({ width: 1600 }).webp({ quality: 94 }).toFile('public/assets/storybook-wordmark.webp');
console.log('Prepared nine ores, three infusions, and the storybook wordmark.');
