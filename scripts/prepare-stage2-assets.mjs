import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const [portal, pouch, closed] = process.argv.slice(2);
if (!portal || !pouch || !closed) throw new Error('Pass the open portal, transparent pouch and closed portal PNG paths.');
await mkdir('public/assets', { recursive: true });
await sharp(portal).resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 91 }).toFile('public/assets/stage2-portal.webp');
await sharp(closed).resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 91 }).toFile('public/assets/stage2-portal-closed.webp');
const metadata = await sharp(pouch).metadata();
if (!metadata.hasAlpha) throw new Error('The pouch must have a real alpha channel.');
await sharp(pouch).resize({ width: 760, withoutEnlargement: true }).webp({ quality: 92, alphaQuality: 100 }).toFile('public/assets/stage2-idea-pouch.webp');
console.log('Prepared Stage 2 portal and alpha-preserving pouch assets.');
