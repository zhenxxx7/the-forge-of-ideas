import { openSettings } from './helpers';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { newSave, SAVE_KEY, SETTINGS_KEY } from '../../src/state';

async function enterStage(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('forge-of-ideas:progress:v1', JSON.stringify({
      version: 1, name: 'Sean', screen: 'prepare', prologueIndex: 2, explored: [], completed: false,
    }));
    localStorage.setItem('forge-of-ideas:settings:v1', JSON.stringify({ sound: false, reducedMotion: false, largeText: false }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue your journey' }).click();
  await expect(page.getByRole('button', { name: 'How', exact: true })).toBeVisible();
  await expect(page.locator('.raven-character')).not.toHaveClass(/raven-flight-active/, { timeout: 5_000 });
}

async function angle(page: Page) {
  return page.locator('.raven-jaw').evaluate(jaw => Number(jaw.getAttribute('transform')?.match(/rotate\(([-\d.]+)/)?.[1] ?? 0));
}

test('raven source includes full tail with transparent left margin', async () => {
  const path = fileURLToPath(new URL('../../public/assets/raven.svg', import.meta.url));
  const source = await readFile(path, 'utf8');
  const viewBoxX = Number(source.match(/viewBox="(-?\d+(?:\.\d+)?)/)?.[1]);
  expect(viewBoxX).toBeLessThan(-63);

  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = (x: number, y: number) => data[(y * info.width + x) * info.channels + info.channels - 1];
  const previouslyClippedWidth = Math.round(-viewBoxX);
  let restoredTailPixels = 0;
  for (let y = 0; y < info.height; y++) {
    expect(alpha(0, y)).toBe(0);
    for (let x = 1; x < previouslyClippedWidth; x++) {
      if (alpha(x, y) > 64) restoredTailPixels++;
    }
  }
  expect(restoredTailPixels).toBeGreaterThan(500);
});

test('raven interpolates smoothly while perched and speaking', async ({ page }) => {
  const fetched: string[] = [];
  page.on('request', request => fetched.push(request.url()));
  await enterStage(page);
  await page.getByRole('button', { name: 'How', exact: true }).click();
  const samples = await page.locator('.raven-rig').evaluate(svg => new Promise<{ jaw: number; time: number; body: number[] }[]>(resolve => {
    const frames: { jaw: number; time: number; body: number[] }[] = [];
    const start = performance.now();
    const read = (now: number) => {
      const body = svg.querySelector('.raven-body') as SVGGraphicsElement;
      const matrix = body.getScreenCTM()!;
      frames.push({
        jaw: Number(svg.querySelector('.raven-jaw')?.getAttribute('transform')?.match(/rotate\(([-\d.]+)/)?.[1] ?? 0),
        time: now, body: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f],
      });
      if (now - start < 1200) requestAnimationFrame(read);
      else resolve(frames);
    };
    requestAnimationFrame(read);
  }));
  expect(new Set(samples.map(frame => frame.jaw.toFixed(1))).size).toBeGreaterThan(20);
  expect(Math.max(...samples.map(frame => frame.jaw))).toBeGreaterThan(10);
  for (let index = 1; index < samples.length; index++) {
    const previous = samples[index - 1];
    const current = samples[index];
    expect(current.body).toEqual(samples[0].body);
    expect(Math.abs(current.jaw - previous.jaw)).toBeLessThan(0.34 * Math.min(current.time - previous.time, 40) + 0.05);
  }
  expect(fetched.some(url => url.endsWith('/assets/raven.svg'))).toBeTruthy();
  expect(fetched.some(url => url.includes('raven-beak-open.svg'))).toBeFalsy();
  await expect(page.locator('.raven-character img')).toHaveCount(0);
  await expect.poll(() => angle(page), { timeout: 6500 }).toBe(0);
});

test('raven flies between distant perches and settles without clipping the frame', async ({ page }) => {
  const save = newSave('Sean');
  save.screen = 'generate';
  save.explored = ['how', 'moment', 'tense'];
  save.completed = true;
  await page.addInitScript(({ key, settingsKey, progress }) => {
    localStorage.setItem(key, JSON.stringify(progress));
    localStorage.setItem(settingsKey, JSON.stringify({ sound: false, reducedMotion: false, largeText: false }));
  }, { key: SAVE_KEY, settingsKey: SETTINGS_KEY, progress: save });
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue your journey' }).click();
  const raven = page.locator('.raven-character');
  await expect(raven).toHaveClass(/raven-flight-active/);
  const positions = await page.locator('.raven-flight-layer').evaluate(layer => new Promise<number[]>(resolve => {
    const xs: number[] = [];
    const capture = () => {
      xs.push(layer.getBoundingClientRect().left);
      if (xs.length < 12) requestAnimationFrame(capture);
      else resolve(xs);
    };
    requestAnimationFrame(capture);
  }));
  expect(Math.max(...positions) - Math.min(...positions)).toBeGreaterThan(4);
  await expect(raven).not.toHaveClass(/raven-flight-active/, { timeout: 5_000 });
  const frame = await page.locator('.game-frame').boundingBox();
  const settled = await page.locator('.raven-rig').boundingBox();
  expect(settled!.x).toBeGreaterThanOrEqual(frame!.x - 1);
  expect(settled!.x + settled!.width).toBeLessThanOrEqual(frame!.x + frame!.width + 1);
});

test('rapid dialogue changes ease from the current jaw position', async ({ page }) => {
  await enterStage(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.getByRole('button', { name: 'How', exact: true }).click();
  await page.clock.runFor(300);
  const before = await angle(page);
  expect(before).toBeGreaterThan(8);
  await page.getByRole('button', { name: 'this moment', exact: true }).click();
  expect(await angle(page)).toBe(before);
  await page.clock.runFor(16);
  const after = await angle(page);
  expect(after).toBeGreaterThan(before * 0.7);
  expect(after).toBeLessThan(before);
  await page.clock.runFor(4000);
  expect(await angle(page)).toBe(0);
});

test('both game and live system reduced-motion settings stop the rig', async ({ page }) => {
  await enterStage(page);
  await openSettings(page);
  await page.getByLabel('Reduce motion', { exact: false }).check();
  await page.keyboard.press('Escape');
  await expect(page.locator('.raven-head')).toHaveAttribute('transform', 'rotate(0.000 193 96)');
  await page.getByRole('button', { name: 'How', exact: true }).click();
  expect(await angle(page)).toBe(0);
  await openSettings(page);
  await page.getByLabel('Reduce motion', { exact: false }).uncheck();
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'this moment', exact: true }).click();
  await expect(page.locator('.raven-jaw')).toHaveAttribute('transform', 'rotate(0.000 230.5 67)');
  await expect(page.locator('.raven-head')).toHaveAttribute('transform', 'rotate(0.000 193 96)');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: 'so tense', exact: true }).click();
  await expect.poll(() => angle(page)).toBeGreaterThan(5);
});
