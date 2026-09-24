import { openSettings, openJourney } from './helpers';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import seed from '../fixtures/ending-save.json' with { type: 'json' };

const reflection = 'Connecting evidence to an effect helped me explain my ideas. Next time I will compare language choices.';
const writing = seed.elaborate.infusions[0].response;

async function resume(page: Page) {
  await page.goto('/');
  const skip = page.getByRole('button', { name: 'Skip intro' }); if (await skip.isVisible()) await skip.click();
  await page.getByRole('button', { name: 'Continue your journey' }).click();
}

async function enter(page: Page, archived = false) {
  await page.addInitScript(({ seed, archived, reflection }) => {
    if (localStorage.getItem('forge-of-ideas:progress:v1')) return;
    localStorage.setItem('forge-of-ideas:settings:v1', JSON.stringify({ reducedMotion: false, largeText: false, sound: false }));
    localStorage.setItem('forge-of-ideas:progress:v1', JSON.stringify({ ...seed, ...(archived ? { screen: 'ending', ending: { step: 'archive', completed: true, reflection } } : {}) }));
  }, { seed, archived, reflection });
  await resume(page);
}

test('Stage 6 leads through the portal to a saved, downloadable journey record', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await enter(page);
  await page.getByRole('button', { name: 'Complete Stage 6', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A journey well forged.', exact: true })).toBeFocused();
  const portal = page.getByRole('button', { name: 'Enter the Archival Hall through the portal', exact: true });
  await portal.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'The Archival Hall', exact: true })).toBeFocused();
  const scroll = page.getByRole('button', { name: 'Open your journey record', exact: true });
  await scroll.focus(); await page.keyboard.press('Space');
  const record = page.getByRole('dialog', { name: 'Your journey record', exact: true });
  await expect(record).toContainText('Sean');
  await expect(record).toContainText('06 · Challenge');
  await record.getByText('The setting', { exact: true }).click();
  await expect(record).toContainText(writing);
  await record.getByRole('textbox', { name: /One thought to carry forward/ }).fill(reflection);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('forge-of-ideas:progress:v1')!).ending.reflection)).toBe(reflection);
  const event = page.waitForEvent('download'); await record.getByRole('button', { name: 'Download quest notes', exact: true }).click();
  const notes = await readFile((await (await event).path())!, 'utf8');
  expect(notes).toContain('Journey complete.'); expect(notes).toContain(reflection); expect(notes).toContain(writing);
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-ending-record.png`, fullPage: true, animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(scroll).toBeFocused();
  await openJourney(page);
  await page.getByRole('button', { name: 'Review Archival Hall', exact: true }).click();
  await expect(scroll).toBeVisible();
  await resume(page);
  await expect(page.getByRole('heading', { name: 'The Archival Hall', exact: true })).toBeVisible();
  await scroll.click();
  await expect(record.getByRole('textbox', { name: /One thought to carry forward/ })).toHaveValue(reflection);
  expect(errors).toEqual([]);
});

test('earlier writing changes relock the ending but preserve the reflection', async ({ page }) => {
  await enter(page, true);
  await openJourney(page);
  await page.getByRole('button', { name: 'Review Elaborate', exact: true }).click();
  await page.getByRole('button', { name: 'Inspect infusion: The setting', exact: true }).click();
  await page.getByRole('button', { name: 'Edit infusion', exact: true }).click();
  await page.getByRole('textbox', { name: /Write how your evidence/ }).fill(writing + ' A new thought.');
  await openJourney(page);
  await expect(page.getByLabel('Locked Archival Hall', { exact: true })).toBeVisible();
  const ending = await page.evaluate(() => JSON.parse(localStorage.getItem('forge-of-ideas:progress:v1')!).ending);
  expect(ending).toEqual({ step: 'portal', completed: false, reflection });
  await page.getByRole('button', { name: 'Quest journal', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(reflection);
  await expect(page.getByRole('dialog')).toContainText('A new thought.');
});

test('ending motion pauses in menus and supports larger text and reduced motion', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'Complete Stage 6', exact: true }).click();
  await expect(page.locator('.portal-shimmer')).toHaveCSS('animation-play-state', 'running');
  await openSettings(page);
  await expect(page.locator('.portal-shimmer')).toHaveCSS('animation-play-state', 'paused');
  await page.getByLabel('Reduce motion', { exact: false }).check();
  await page.getByLabel('Larger dialogue', { exact: false }).check();
  await page.keyboard.press('Escape');
  await expect(page.locator('.portal-shimmer')).toHaveCSS('animation-name', 'none');
  await page.getByRole('button', { name: 'Enter the Archival Hall through the portal', exact: true }).click();
  await page.getByRole('button', { name: 'Return to the restored valley', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A journey well forged.', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Enter the Archival Hall through the portal', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The Archival Hall', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
