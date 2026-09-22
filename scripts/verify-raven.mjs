import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mouthShape } from '../src/components/ravenMotion.ts';

// Visual QA: use the actual React SVG rig, not a separate mockup of it.
await mkdir('artifacts/raven', { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:5173');
  const skip = page.getByRole('button', { name: 'Skip intro' });
  if (await skip.isVisible()) await skip.click();
  await page.getByRole('button', { name: 'Begin the journey', exact: true }).click();
  await page.getByLabel('Your name', { exact: true }).fill('Sean');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.screenshot({ path: 'artifacts/raven/scene.png', animations: 'disabled' });
  const markup = await page.locator('.raven-rig').evaluate(svg => svg.outerHTML);
  const source = await readFile('public/assets/raven.svg', 'utf8');
  const embedded = markup.replace('href="/assets/raven.svg"', `href="data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}"`);
  const frames = [];
  for (const angle of [0, 5, 10, 15, 19]) {
    await page.setContent(`<style>body{margin:0;background:#343944}svg{width:644px;height:560px}</style>${embedded}`);
    await page.locator('.raven-rig').evaluate((svg, { angle, mouth }) => {
      svg.setAttribute('viewBox', '170 20 115 110');
      svg.querySelector('.raven-jaw').setAttribute('transform', `rotate(${angle} 230.5 67)`);
      svg.querySelector('.raven-mouth').setAttribute('d', mouth);
      svg.querySelector('.raven-mouth').setAttribute('opacity', String(Math.min(1, angle / 2)));
    }, { angle, mouth: mouthShape(angle) });
    const frame = await page.locator('.raven-rig').screenshot({ path: `artifacts/raven/pose-${angle}.png` });
    frames.push(await sharp(frame).resize(322, 280).toBuffer());
  }
  await sharp({ create: { width: 322 * frames.length, height: 280, channels: 4, background: '#343944' } })
    .composite(frames.map((input, index) => ({ input, left: index * 322, top: 0 })))
    .png().toFile('artifacts/raven/poses.png');
  console.log('Saved actual rig poses and scene in artifacts/raven/.');
} finally {
  await browser.close();
}
