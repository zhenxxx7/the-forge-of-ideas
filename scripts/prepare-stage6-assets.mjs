import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

if (!process.argv[2] || !process.argv[3]) throw new Error('Pass the generated battlefield and transparent beast PNG paths.');
await sharp(process.argv[2]).resize({ width: 2048, withoutEnlargement: true }).webp({ quality: 87 }).toFile(fileURLToPath(new URL('../public/assets/stage6-battlefield.webp', import.meta.url)));
await sharp(process.argv[3]).resize({ width: 1024, withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 95 }).toFile(fileURLToPath(new URL('../public/assets/stage6-beast.webp', import.meta.url)));
console.log('Prepared Stage 6 battlefield and transparent beast assets.');
