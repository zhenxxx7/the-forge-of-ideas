import sharp from 'sharp';

// Keep the supplied vector source; rasterize once so the opening animation
// composites smoothly without repainting its detailed embedded artwork.
await sharp('public/assets/forge-dialogue-parchment.svg', { density: 180 })
  .resize({ width: 2400 })
  .webp({ quality: 93, effort: 6 })
  .toFile('public/assets/forge-dialogue-parchment.webp');
