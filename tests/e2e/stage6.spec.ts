import { openJourney } from './helpers';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { ChallengeProgress } from '../../src/stage6';

const writing = 'I would use a precise classroom detail to show how the setting makes the reader anticipate danger.';
const statement = 'The sensory details make the setting threatening.';
const ideas = ['setting', 'senses', 'uncertainty', 'reactions', 'control', 'pace'];
const assignments = { setting: 'central', senses: 'supporting', uncertainty: 'central', reactions: 'supporting', control: 'central', pace: 'supporting' };
const connections = [
  { main: 'setting', supporting: ['senses'], explanation: statement },
  { main: 'uncertainty', supporting: ['reactions'], explanation: 'The reactions keep the outcome uncertain.' },
  { main: 'control', supporting: ['pace'], explanation: 'The pacing limits what the reader knows.' },
];
const infusions = connections.map(connection => ({ main: connection.main, runes: ['evidence', 'effect'], response: writing, sourceFingerprint: JSON.stringify([connection.main, connection.supporting, connection.explanation]) }));

async function enter(page: Page, count = 1, challenge?: Partial<ChallengeProgress>) {
  await page.addInitScript(({ ideas, assignments, connections, infusions, count, challenge }) => {
    if (localStorage.getItem('forge-of-ideas:progress:v1')) return;
    localStorage.setItem('forge-of-ideas:progress:v1', JSON.stringify({ version: 1, name: 'Sean', screen: 'journey', prologueIndex: 2, explored: ['how', 'moment', 'tense'], completed: true, generate: { step: 'collected', selected: ideas, completed: true }, sort: { step: 'review', assignments, completed: true }, connect: { step: 'review', connections: connections.slice(0, count), completed: true, timerPaused: true }, elaborate: { step: 'review', infusions: infusions.slice(0, count), completed: true, timerPaused: true }, ...(challenge ? { challenge } : {}) }));
  }, { ideas, assignments, connections, infusions, count, challenge });
  await page.goto('/');
  const skip = page.getByRole('button', { name: 'Skip intro' }); if (await skip.isVisible()) await skip.click();
  await page.getByRole('button', { name: 'Continue your journey' }).click();
  await page.getByRole('button', { name: challenge?.completed ? 'Review Challenge' : 'Open Challenge', exact: true }).click();
}

async function beginAim(page: Page) {
  await page.getByRole('button', { name: 'Face the Beast', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Aim instructions', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Take aim', exact: true }).click();
}

async function saved(page: Page): Promise<ChallengeProgress> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('forge-of-ideas:progress:v1')!).challenge as ChallengeProgress);
}

test('miss, retry, hit and complete Stage 6; reload and notes preserve the result', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await enter(page);
  await expect(page.getByRole('heading', { name: 'The Inarticulate Beast', exact: true })).toBeVisible();
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-stage6-intro.png`, fullPage: true, animations: 'disabled' });
  await beginAim(page);
  await expect(page.getByRole('button', { name: 'Launch infusion', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Select infusion: The setting', exact: true }).click();
  await page.getByRole('button', { name: 'Read selected writing', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(writing);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('slider', { name: /Horizontal aim/ })).toHaveValue('72');
  await page.getByRole('button', { name: 'Launch infusion', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Try another approach.', exact: true })).toBeVisible();
  expect(await saved(page)).toMatchObject({ step: 'lost', hits: 0, confusion: 1, used: ['setting'], completed: false });
  await page.getByRole('button', { name: 'Retry encounter', exact: true }).click();
  await page.getByRole('button', { name: 'Select infusion: The setting', exact: true }).click();
  await page.getByRole('slider', { name: /Horizontal aim/ }).fill('50');
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-stage6-aim.png`, fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Launch infusion', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The Beast retreats.', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Complete Stage 6', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A journey well forged.', exact: true })).toBeVisible();
  await openJourney(page);
  await expect(page.getByRole('button', { name: 'Review Challenge', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Archival Hall', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quest journal', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(writing);
  await expect(page.getByRole('dialog')).toContainText('The Beast retreated');
  const event = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download notes', exact: true }).click();
  const notes = await readFile((await (await event).path())!, 'utf8');
  expect(notes).toContain('Stage 6: Challenge'); expect(notes).toContain('Stage 6 completed.'); expect(notes).toContain(writing);
  await page.keyboard.press('Escape');
  await page.reload();
  const skip = page.getByRole('button', { name: 'Skip intro' }); if (await skip.isVisible()) await skip.click();
  await page.getByRole('button', { name: 'Continue your journey' }).click();
  await expect(page.getByRole('button', { name: 'Review Challenge', exact: true })).toBeVisible();
  expect((await saved(page)).completed).toBe(true);
  expect(errors).toEqual([]);
});

test('three infusions support a miss followed by two hits; pointer and keyboard aiming work', async ({ page }) => {
  await enter(page, 3);
  await beginAim(page);
  await expect(page.locator('.challenge-stock-list button:enabled')).toHaveCount(3);
  await page.getByRole('button', { name: 'Select infusion: The setting', exact: true }).click();
  await page.getByRole('button', { name: 'Launch infusion', exact: true }).click();
  await expect.poll(async () => (await saved(page)).confusion).toBe(1);
  await expect(page.locator('.challenge-stock-list button:enabled')).toHaveCount(2);
  await page.getByRole('button', { name: 'Select infusion: Uncertainty', exact: true }).click();
  const field = (await page.locator('.game-frame').boundingBox())!;
  await page.mouse.click(field.x + field.width * .5, field.y + (field.width < 600 ? 280 : field.height * .35));
  await expect(page.getByRole('slider', { name: /Horizontal aim/ })).toHaveValue('50');
  await page.getByRole('button', { name: 'Launch infusion', exact: true }).click();
  await expect.poll(async () => (await saved(page)).hits).toBe(1);
  await page.getByRole('button', { name: 'Select infusion: Control', exact: true }).focus(); await page.keyboard.press('Enter');
  await page.getByRole('slider', { name: /Horizontal aim/ }).focus(); await page.keyboard.press('ArrowLeft');
  await page.getByRole('button', { name: 'Launch infusion', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The Beast retreats.', exact: true })).toBeVisible();
  expect(await saved(page)).toMatchObject({ hits: 2, confusion: 1, completed: true });
});

test('enabling system reduced motion during a throw still resolves the encounter', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await enter(page);
  await beginAim(page);
  await page.getByRole('button', { name: 'Select infusion: The setting', exact: true }).click();
  await page.getByRole('slider', { name: /Horizontal aim/ }).fill('50');
  await page.getByRole('button', { name: 'Launch infusion', exact: true }).click();
  await expect(page.locator('.challenge-shot')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('heading', { name: 'The Beast retreats.', exact: true })).toBeVisible();
  expect((await saved(page)).completed).toBe(true);
});

test('revising Stage 5 invalidates Stage 6 victory without losing authored prose', async ({ page }) => {
  await enter(page, 1, { step: 'won', selected: null, used: ['setting'], aim: 50, hits: 1, confusion: 0, lastOutcome: 'hit', completed: true });
  await openJourney(page);
  await page.getByRole('button', { name: 'Review Elaborate', exact: true }).click();
  await page.getByRole('button', { name: 'Inspect infusion: The setting', exact: true }).click();
  await page.getByRole('button', { name: 'Edit infusion', exact: true }).click();
  const revised = writing + ' I would also discuss the reader’s expectation.';
  await page.getByRole('textbox', { name: /Write how your evidence/ }).fill(revised);
  await openJourney(page);
  await expect(page.getByLabel('Locked Challenge', { exact: true })).toBeVisible();
  expect((await saved(page)).completed).toBe(false);
  await page.getByRole('button', { name: 'Open Elaborate', exact: true }).click();
  await page.getByRole('button', { name: 'Review infusions', exact: true }).click();
  await page.getByRole('button', { name: 'Complete Stage 5', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open Challenge', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quest journal', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(revised);
});
