import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const svg = await readFile('public/assets/raven.svg', 'utf8');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent(svg);
  const parts = await page.locator('svg > path').evaluateAll(paths => paths.map((path, index) => {
    const { x, y, width, height } = path.getBBox();
    return { index, fill: path.getAttribute('fill'), x, y, width, height };
  }).filter(part => part.x > 219 && part.y < 110));
  console.log(JSON.stringify(parts, null, 2));
} finally {
  await browser.close();
}

const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
let grid = '';
for (let x = 190; x <= 285; x += 5) grid += `<path d="M${x} 25V120" stroke="#66eeaa" stroke-width=".14"/><text x="${x + .3}" y="29" font-size="2.2" fill="#fff">${x}</text>`;
for (let y = 30; y <= 115; y += 5) grid += `<path d="M190 ${y}H285" stroke="#66eeaa" stroke-width=".14"/><text x="190.4" y="${y - .6}" font-size="2.2" fill="#fff">${y}</text>`;
await mkdir('artifacts/raven', { recursive: true });
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="950" height="950" viewBox="190 25 95 95"><rect x="190" y="25" width="95" height="95" fill="#68686b"/>${inner}${grid}</svg>`)).png().toFile('artifacts/raven/head-grid.png');
