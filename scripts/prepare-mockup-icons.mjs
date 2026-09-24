import sharp from 'sharp';

// Reuse the illustrated controls in the supplied storyboard, including their rims.
const controls = {
  home: [1889, 60, 101, 101],
  raven: [1889, 165, 101, 101],
  journal: [1889, 272, 101, 101],
};
for (const [name, [left, top, width, height]] of Object.entries(controls)) {
  await sharp('reference/question.png').extract({ left, top, width, height }).webp({ quality: 96 }).toFile(`public/assets/mockup-${name}.webp`);
}
await sharp('reference/journey.png').extract({ left: 1889, top: 378, width: 101, height: 101 }).webp({ quality: 96 }).toFile('public/assets/mockup-door.webp');
await sharp('reference/stage3/page-16-1.png').extract({ left: 934, top: 69, width: 54, height: 74 }).webp({ quality: 96 }).toFile('public/assets/mockup-hourglass.webp');
console.log('Prepared five original illustrated controls.');
