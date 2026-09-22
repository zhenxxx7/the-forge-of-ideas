import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { GenerateProgress } from '../../src/stage2';

async function enter(page: Page, generate?: Partial<GenerateProgress>) {
  await page.addInitScript((progress) => {
    if (localStorage.getItem('forge-of-ideas:progress:v1')) return;
    localStorage.setItem('forge-of-ideas:progress:v1', JSON.stringify({
      version: 1, name: 'Sean', screen: progress ? 'generate' : 'journey', prologueIndex: 2,
      explored: ['how', 'moment', 'tense'], completed: true, ...(progress ? { generate: progress } : {}),
    }));
  }, generate);
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await page.getByRole('button', { name: 'Continue your journey' }).click();
  if (!generate) await page.getByRole('button', { name: 'Start Stage 2', exact: true }).click();
}

async function remaining(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('forge-of-ideas:progress:v1')!).generate.remainingMs as number);
}

test('complete Stage 2, review the map, revisit ideas, resume and download notes', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await enter(page);
  await expect(page.getByRole('heading', { name: 'Enter the Forge', exact: true })).toBeAttached();
  await expect(page.getByRole('timer')).toHaveText('60:00');
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-stage2-entrance.png`, animations: 'disabled', fullPage: true });
  await page.getByRole('button', { name: 'Enter the Forge', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Generating Ideas', exact: true })).toBeVisible();
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-stage2-intro.png`, animations: 'disabled', fullPage: true });
  await page.getByRole('button', { name: 'Start gathering', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AI is becoming more lifelike.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review my pouch', exact: true })).toBeDisabled();
  for (const label of ['Lifelike AI', 'The setting', 'Sensory detail', 'Reactions']) {
    await page.getByRole('button', { name: `Explore ${label}`, exact: true }).click();
    await page.getByRole('button', { name: 'Collect idea', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: 'Open idea pouch, 4 collected' })).toBeVisible();
  await page.getByRole('button', { name: 'In your pouch', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open idea pouch, 3 collected' })).toBeVisible();
  await page.getByRole('button', { name: 'Collect idea', exact: true }).click();
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-stage2-explore.png`, animations: 'disabled', fullPage: true });
  await page.getByRole('button', { name: 'Open idea pouch, 4 collected' }).click();
  await expect(page.getByRole('dialog')).toContainText('4 possibilities gathered');
  await expect(page.getByRole('dialog')).toContainText('AI is becoming more lifelike.');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Review my pouch', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your ideas take form.' })).toBeVisible();
  await expect(page.locator('.collected-pouch img')).toBeVisible();
  expect(await page.locator('.collected-pouch img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBeTruthy();
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-stage2-collected.png`, animations: 'disabled', fullPage: true });
  await page.getByRole('button', { name: 'Complete Stage 2', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Review Generate', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Sort', exact: true })).toBeVisible();
  await expect(page.getByLabel('Connect, locked', { exact: true })).toBeVisible();
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-stage2-review.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Quest journal', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Stage 2 completed.');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download notes', exact: true }).click();
  const download = await downloadEvent;
  const notes = await readFile((await download.path())!, 'utf8');
  expect(notes).toContain('Stage 2: Generate');
  expect(notes).toContain('[Mockup idea] AI is becoming more lifelike.');
  expect(notes).toContain('Stage 2 completed.');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Review Generate', exact: true }).click();
  await page.getByRole('button', { name: 'Gather more ideas', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Uncertainty', exact: true }).click();
  await page.getByRole('button', { name: 'Collect idea', exact: true }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await page.getByRole('button', { name: 'Continue your journey' }).click();
  await expect(page.getByRole('button', { name: 'Open idea pouch, 5 collected' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Not knowing what will happen next can create suspense.' })).toBeVisible();
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('timer respects manual pause, menus, hidden tabs, untimed mode and expiry', async ({ page }) => {
  await page.clock.install();
  await enter(page, { step: 'explore', remainingMs: 40_000, selected: ['lifelike'], activeIdea: 'lifelike' });
  await page.clock.pauseAt(new Date(Date.now() + 100));
  const before = await remaining(page);
  await page.clock.runFor(2500);
  expect(await remaining(page)).toBeLessThan(before - 1900);
  await page.getByRole('button', { name: 'Pause timer', exact: true }).click();
  const manualPause = await remaining(page);
  await page.clock.runFor(5000);
  expect(await remaining(page)).toBe(manualPause);
  await page.getByRole('button', { name: 'Resume timer', exact: true }).click();
  await page.clock.runFor(1500);
  expect(await remaining(page)).toBeLessThan(manualPause);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const menuPause = await remaining(page);
  await page.clock.runFor(5000);
  expect(await remaining(page)).toBe(menuPause);
  await page.keyboard.press('Escape');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const hiddenPause = await remaining(page);
  await page.clock.runFor(6000);
  expect(await remaining(page)).toBe(hiddenPause);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.getByRole('button', { name: 'Explore without a timer', exact: true }).click();
  const untimedPause = await remaining(page);
  await page.clock.fastForward(60_000);
  expect(await remaining(page)).toBe(untimedPause);
  await expect(page.getByRole('timer')).toHaveText('Untimed');
  await page.getByRole('button', { name: 'Use timer', exact: true }).click();
  await page.clock.fastForward(45_000);
  await expect(page.getByRole('heading', { name: 'Your ideas take form.' })).toBeVisible();
  await expect(page.getByRole('timer')).toHaveText('00:00');
  await expect(page.getByRole('button', { name: 'Review 1 collected ideas' })).toBeVisible();
  await page.getByRole('button', { name: 'Gather more ideas', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('Untimed');
  await expect(page.getByRole('button', { name: 'Open idea pouch, 1 collected' })).toBeVisible();
});

test('an empty timeout never claims completion and offers untimed recovery', async ({ page }) => {
  await page.clock.install();
  await enter(page, { step: 'explore', remainingMs: 10_000 });
  await page.clock.pauseAt(new Date(Date.now() + 100));
  await page.clock.runFor(15_000);
  await expect(page.getByRole('heading', { name: 'A spark is still waiting.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Complete Stage 2', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Explore without a timer', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('Untimed');
  await page.getByRole('button', { name: 'Collect idea', exact: true }).click();
  await page.getByRole('button', { name: 'Review my pouch', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Complete Stage 2', exact: true })).toBeEnabled();
});
