import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

if (!process.argv[2]) throw new Error('Pass the generated clean elaboration-room PNG path.');
const output = new URL('../public/assets/stage5-elaboration-room.webp', import.meta.url);
await sharp(process.argv[2]).resize({ width: 2048, withoutEnlargement: true }).webp({ quality: 87 }).toFile(fileURLToPath(output));
console.log('Prepared public/assets/stage5-elaboration-room.webp');
