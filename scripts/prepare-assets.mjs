import sharp from 'sharp';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const out = resolve(root, 'public/assets');
await mkdir(out, { recursive: true });
const study = process.argv[2];
if (!study) throw new Error('Pass the supplied landing-screen__bg.png path.');
await sharp(study).resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 91 }).toFile(resolve(out, 'study.webp'));
const source = resolve(root, 'reference/journey.png');
const icons = {
  prepare: [970, 168, 111, 112],
  generate: [739, 321, 112, 113],
  sort: [892, 321, 112, 113],
  connect: [1046, 321, 112, 113],
  elaborate: [1200, 321, 112, 113],
  challenge: [893, 477, 112, 111],
  archive: [1046, 477, 112, 111],
};
for (const [name, [left, top, width, height]] of Object.entries(icons)) {
  await sharp(source).extract({ left, top, width, height }).webp({ quality: 95 }).toFile(resolve(out, `${name}.webp`));
}
await sharp(resolve(root, 'reference/landing.png')).extract({ left: 963, top: 68, width: 123, height: 131 }).webp({ quality: 95 }).toFile(resolve(out, 'moe.webp'));
await sharp(resolve(root, 'reference/question.png')).extract({ left: 410, top: 925, width: 400, height: 130 }).webp({ quality: 94 }).toFile(resolve(out, 'paper-texture.webp'));
const storyboard = process.argv[3];
if (storyboard) {
  await sharp(storyboard).extract({ left: 118, top: 65, width: 63, height: 79 }).png().toFile(resolve(out, 'cpdd.png'));
}
for (const name of ['raven.svg', 'raven-beak-open.svg']) {
  await copyFile(resolve(study, '..', name), resolve(out, name));
}
await writeFile(resolve(out, 'asset-manifest.json'), JSON.stringify({
  source: 'User-supplied MOE English Literature Secondary PDF and storyboard',
  study: 'User-supplied landing-screen__bg.png, optimized to WebP without changing its composition',
  raven: 'Original user-supplied raven.svg and raven-beak-open.svg, copied unchanged',
  icons: 'Extracted from page 9 of the supplied PDF',
  logos: 'Extracted from supplied reference artwork; no new institutional affiliation claimed',
}, null, 2));
console.log('Prepared study, seven stage icons, paper texture and supplied logos.');
