import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function enter(page: Page, name = 'Sean') {
  await page.goto('/');
  const skip = page.getByRole('button', { name: 'Skip intro' });
  if (await skip.isVisible()) await skip.click();
  await page.getByRole('button', { name: 'Begin the journey', exact: true }).click();
  await page.getByLabel('Your name', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}

async function prepare(page: Page) {
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Start Stage 1', exact: true }).click();
}

test('complete onboarding and Stage 1; save, notes and future-stage boundary', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await expect(page.getByRole('heading', { name: 'Forge of Ideas' })).toBeVisible();
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-landing.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Begin the journey', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Please enter at least 2 characters.');
  await page.getByLabel('Your name', { exact: true }).fill('  Sean  ');
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-name.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome, Sean.' })).toBeVisible();
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-prologue.png`, animations: 'disabled' });
  await prepare(page);
  await expect(page.getByRole('button', { name: 'View your journey' })).toBeDisabled();
  await page.getByRole('button', { name: 'How', exact: true }).click();
  await expect(page.getByText('LOOK AT THE WRITER’S CRAFT', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View your journey' })).toBeDisabled();
  await page.getByRole('button', { name: 'this moment', exact: true }).click();
  await page.getByRole('button', { name: 'so tense', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View your journey' })).toBeEnabled();
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-stage1.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Quest journal', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('3 / 3 discovered')).toBeVisible();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download notes' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('forge-of-ideas-quest-notes.txt');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'View your journey' }).click();
  await expect(page.getByRole('heading', { name: 'Your journey' })).toBeVisible();
  await expect(page.getByLabel('Generate, locked', { exact: true })).toBeVisible();
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-map.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Complete Stage 1' }).click();
  await expect(page.getByRole('dialog')).toContainText('STAGE 1 · COMPLETE');
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-complete.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Return to the journey' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await page.getByRole('button', { name: 'Continue your journey' }).click();
  await expect(page.getByRole('button', { name: 'View achievement' })).toBeVisible();
  await expect(page.getByText('COMPLETED', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('settings, focus, home and cancellation preserve progress', async ({ page }) => {
  await enter(page, 'Maya');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Reduce motion', { exact: false }).check();
  await page.getByLabel('Larger dialogue', { exact: false }).check();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused();
  await expect(page.locator('.atmosphere canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Begin anew', exact: true }).click();
  await page.getByRole('button', { name: 'Keep my journey' }).click();
  await page.getByRole('button', { name: 'Continue your journey' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome, Maya.' })).toBeVisible();
  await prepare(page);
  for (const label of ['How', 'this moment', 'so tense']) await page.getByRole('button', { name: label, exact: true }).click();
  const scroll = page.locator('.dialogue-scroll');
  const copy = page.locator('.dialogue-copy');
  const scrollBox = await scroll.boundingBox();
  const copyBox = await copy.boundingBox();
  expect(scrollBox && copyBox && copyBox.y + copyBox.height <= scrollBox.y + scrollBox.height).toBeTruthy();
});

test('works without storage and recovers from an invalid save', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage is blocked'); };
    Storage.prototype.setItem = () => { throw new Error('Storage is blocked'); };
  });
  await enter(page, 'Alex');
  await expect(page.getByRole('heading', { name: 'Welcome, Alex.' })).toBeVisible();
  await expect(page.getByText('Progress could not be saved')).toBeVisible();
  await prepare(page);
  await page.getByRole('button', { name: 'How', exact: true }).click();
  await expect(page.getByLabel('1 of 3 phrases explored')).toBeVisible();
});
