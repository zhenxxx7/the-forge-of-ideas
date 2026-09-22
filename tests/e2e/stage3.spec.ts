import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { SortProgress } from '../../src/stage3';

const ideas = ['lifelike', 'setting', 'senses', 'reactions'];
async function enter(page: Page, sort?: Partial<SortProgress>) {
  await page.addInitScript(({ ideas, sort }) => {
    if (localStorage.getItem('forge-of-ideas:progress:v1')) return;
    localStorage.setItem('forge-of-ideas:progress:v1', JSON.stringify({ version: 1, name: 'Sean', screen: sort ? 'sort' : 'journey', prologueIndex: 2, explored: ['how', 'moment', 'tense'], completed: true, generate: { step: 'collected', selected: ideas, activeIdea: 'lifelike', completed: true }, ...(sort ? { sort } : {}) }));
  }, { ideas, sort });
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await page.getByRole('button', { name: 'Continue your journey' }).click();
  if (!sort) await page.getByRole('button', { name: 'Start Stage 3', exact: true }).click();
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(localStorage.getItem('forge-of-ideas:progress:v1')!).sort as SortProgress); }
async function place(page: Page, label: string, category: string) {
  await page.getByRole('button', { name: `Select ${label}`, exact: true }).click();
  await page.getByRole('button', { name: `Move selected idea to ${category}`, exact: true }).click();
}

test('Stage 2 pouch becomes editable sorting belts, completion, notes and saved review', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await enter(page);
  await expect(page.getByRole('heading', { name: 'Sorting Ideas', exact: true })).toBeVisible();
  await expect(page.getByRole('timer')).toHaveText('40:00');
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-stage3-intro.png`, fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Start sorting', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Unsorted ideas', exact: true }).getByRole('button')).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Review sorting', exact: true })).toBeDisabled();
  await place(page, 'Lifelike AI', 'Central');
  await place(page, 'Lifelike AI', 'Irrelevant');
  await page.getByRole('button', { name: 'Undo last move', exact: true }).click();
  expect((await saved(page)).assignments.lifelike).toBe('central');
  await page.getByRole('button', { name: 'Return to tray', exact: true }).click();
  expect((await saved(page)).assignments.lifelike).toBeUndefined();
  await place(page, 'Lifelike AI', 'Irrelevant');
  await place(page, 'The setting', 'Central');
  await place(page, 'Sensory detail', 'Supporting');
  await place(page, 'Reactions', 'Supporting');
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-stage3-sorting.png`, fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Review sorted ideas, 4 of 4', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('AI is becoming more lifelike.');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Review sorting', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A clearer way forward.' })).toBeVisible();
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-stage3-review.png`, fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Complete Stage 3', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Review Sort', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Connect', exact: true })).toBeVisible();
  await expect(page.getByLabel('Elaborate, locked', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quest journal', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Stage 3 completed.');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download notes', exact: true }).click();
  const notes = await readFile((await (await downloadEvent).path())!, 'utf8');
  expect(notes).toContain('Stage 3: Sort'); expect(notes).toContain('IRRELEVANT\nAI is becoming more lifelike.'); expect(notes).toContain('Stage 3 completed.');
  await page.keyboard.press('Escape');
  await page.reload();
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await page.getByRole('button', { name: 'Continue your journey' }).click();
  await page.getByRole('button', { name: 'Review Sort', exact: true }).click();
  await page.getByRole('button', { name: 'Reconsider ideas', exact: true }).click();
  await place(page, 'Lifelike AI', 'Supporting');
  expect((await saved(page)).completed).toBe(false);
  expect((await saved(page)).assignments.lifelike).toBe('supporting');
  expect(errors).toEqual([]);
});

test('pointer drag, cancelled drag and keyboard categories remain reversible', async ({ page }) => {
  await enter(page, { step: 'sorting', timerPaused: true });
  const ore = page.getByRole('button', { name: 'Select Lifelike AI', exact: true });
  await ore.scrollIntoViewIfNeeded();
  const from = (await ore.boundingBox())!;
  const belt = (await page.getByRole('button', { name: 'Move selected idea to Central', exact: true }).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(belt.x + belt.width / 2, belt.y + belt.height / 2, { steps: 15 });
  await page.mouse.up();
  expect((await saved(page)).assignments.lifelike).toBe('central');
  const setting = page.getByRole('button', { name: 'Select The setting', exact: true });
  await setting.scrollIntoViewIfNeeded();
  const second = (await setting.boundingBox())!;
  await page.mouse.move(second.x + second.width / 2, second.y + second.height / 2);
  await page.mouse.down(); await page.mouse.move(second.x - 30, second.y - 30, { steps: 5 });
  await page.keyboard.press('Escape'); await page.mouse.up();
  expect((await saved(page)).assignments.setting).toBeUndefined();
  await setting.focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Move selected idea to Supporting', exact: true }).focus(); await page.keyboard.press('Space');
  expect((await saved(page)).assignments.setting).toBe('supporting');
  await expect(page.locator('.sort-drag-ghost')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.belt-running-surface i').first().evaluate(element => getComputedStyle(element).animationName)).toBe('none');
});

test('timer pauses for menus and hidden tabs; partial expiry recovers untimed', async ({ page }) => {
  await page.clock.install();
  await enter(page, { step: 'sorting', remainingMs: 20_000, assignments: { lifelike: 'irrelevant' } });
  await page.clock.pauseAt(new Date(Date.now() + 100));
  await page.clock.runFor(1500);
  const initial = (await saved(page)).remainingMs;
  await page.getByRole('button', { name: 'Pause timer', exact: true }).click();
  const manual = (await saved(page)).remainingMs;
  await page.clock.fastForward(5000); expect((await saved(page)).remainingMs).toBe(manual);
  await page.getByRole('button', { name: 'Resume timer', exact: true }).click();
  await page.clock.runFor(1500); expect((await saved(page)).remainingMs).toBeLessThan(initial);
  await page.getByRole('button', { name: 'Review sorted ideas, 1 of 4', exact: true }).click();
  const modal = (await saved(page)).remainingMs;
  await page.clock.fastForward(10_000); expect((await saved(page)).remainingMs).toBe(modal);
  await page.keyboard.press('Escape');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const hidden = (await saved(page)).remainingMs;
  await page.clock.fastForward(10_000); expect((await saved(page)).remainingMs).toBe(hidden);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = (await saved(page)).remainingMs;
  await page.clock.fastForward(10_000); expect((await saved(page)).remainingMs).toBe(settings);
  await page.keyboard.press('Escape');
  await page.clock.fastForward(30_000);
  await expect(page.getByRole('heading', { name: 'A few ideas need a place.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Complete Stage 3', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Continue untimed', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('Untimed');
  expect((await saved(page)).assignments).toEqual({ lifelike: 'irrelevant' });
  await page.clock.fastForward(120_000); await expect(page.getByRole('timer')).toHaveText('Untimed');
  await page.getByRole('button', { name: 'Use timer', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('40:00');
});

test('revising the Stage 2 pouch keeps retained assignments and reopens sorting', async ({ page }) => {
  await enter(page, { step: 'review', completed: true, assignments: { lifelike: 'irrelevant', setting: 'central', senses: 'supporting', reactions: 'supporting' } });
  await page.getByRole('button', { name: 'Journey overview', exact: true }).click();
  await page.getByRole('button', { name: 'Review Generate', exact: true }).click();
  await page.getByRole('button', { name: 'Gather more ideas', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Lifelike AI', exact: true }).click();
  await page.getByRole('button', { name: 'In your pouch', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Pace', exact: true }).click();
  await page.getByRole('button', { name: 'Collect idea', exact: true }).click();
  await page.getByRole('button', { name: 'Journey overview', exact: true }).click();
  await expect(page.getByLabel('Sort, locked', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open Generate', exact: true }).click();
  await page.getByRole('button', { name: 'Review my pouch', exact: true }).click();
  await page.getByRole('button', { name: 'Complete Stage 2', exact: true }).click();
  await page.getByRole('button', { name: 'Open Sort', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Unsorted ideas', exact: true }).getByRole('button')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Select Pace', exact: true })).toBeVisible();
  expect((await saved(page)).assignments).toEqual({ setting: 'central', senses: 'supporting', reactions: 'supporting' });
  expect((await saved(page)).completed).toBe(false);
});
