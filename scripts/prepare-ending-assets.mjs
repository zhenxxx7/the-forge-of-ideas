import sharp from 'sharp';

const sources = [
  ['C:/Users/zhenx/.codex/generated_images/01a0c255-294f-7953-befa-8c212641ed8c/exec-b33742fa-8571-4668-9d8d-c27d1f2635f0.png', 'public/assets/ending-valley.webp'],
  ['C:/Users/zhenx/.codex/generated_images/01a0c255-294f-7953-befa-8c212641ed8c/exec-cf5dd127-6793-465b-b312-79b686043987.png', 'public/assets/ending-archive.webp'],
];
for (const [source, output] of sources) {
  const result = await sharp(source).resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 86 }).toFile(output);
  console.log(`${output}: ${result.width}x${result.height}, ${result.size} bytes`);
}
