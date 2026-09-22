import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { ElaborateProgress, Infusion } from '../../src/stage5';

const statement = 'The sensory details make the setting feel threatening.';
const writing = 'A detail from my classroom extract would show the room becoming threatening. That change makes the reader anticipate danger.';
const ideas = ['setting', 'senses', 'reactions', 'uncertainty'];
const assignments = { setting: 'central', senses: 'supporting', reactions: 'supporting', uncertainty: 'central' };
const connection = { main: 'setting', supporting: ['senses'], explanation: statement };
const infusion: Infusion = { main: 'setting', runes: ['evidence', 'effect'], response: writing, sourceFingerprint: JSON.stringify(['setting', ['senses'], statement]) };

async function enter(page: Page, elaborate?: Partial<ElaborateProgress>) {
  await page.addInitScript(({ ideas, assignments, connection, elaborate }) => {
    if (localStorage.getItem('forge-of-ideas:progress:v1')) return;
    localStorage.setItem('forge-of-ideas:progress:v1', JSON.stringify({ version: 1, name: 'Sean', screen: 'journey', prologueIndex: 2, explored: ['how', 'moment', 'tense'], completed: true, generate: { step: 'collected', selected: ideas, completed: true }, sort: { step: 'review', assignments, completed: true }, connect: { step: 'review', connections: [connection], completed: true, remainingMs: 60000, timerPaused: false, untimed: false }, ...(elaborate ? { elaborate } : {}) }));
  }, { ideas, assignments, connection, elaborate });
  await page.goto('/');
  const skip = page.getByRole('button', { name: 'Skip intro' });
  if (await skip.isVisible()) await skip.click();
  await page.getByRole('button', { name: 'Continue your journey' }).click();
  await page.getByRole('button', { name: elaborate?.completed ? 'Review Elaborate' : 'Open Elaborate', exact: true }).click();
}

async function saved(page: Page): Promise<ElaborateProgress> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('forge-of-ideas:progress:v1')!).elaborate as ElaborateProgress);
}

test('choose, develop, inspect and complete Stage 5; notes and reload preserve writing', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await enter(page);
  await expect(page.getByRole('heading', { name: 'Elaborating on Ideas', exact: true })).toBeVisible();
  await expect(page.getByRole('timer')).toHaveText('40:00');
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-stage5-intro.png`, fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Enter the chamber', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Select crystal: The setting', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Select crystal: The setting', exact: true }).click();
  await expect(page.getByRole('textbox', { name: /Write how your evidence/ })).toBeVisible();
  await page.getByRole('button', { name: 'Add Evidence rune', exact: true }).click();
  await page.getByRole('button', { name: 'Add Effect rune', exact: true }).click();
  await page.getByRole('textbox', { name: /Write how your evidence/ }).fill(writing);
  expect((await saved(page)).infusions[0]).toMatchObject({ runes: ['evidence', 'effect'], response: writing });
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-stage5-develop.png`, fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Review infusions', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Complete Stage 5', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Inspect infusion: The setting', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(writing);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Complete Stage 5', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Review Elaborate', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Challenge', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quest journal', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(writing);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download notes', exact: true }).click();
  const notes = await readFile((await (await downloadEvent).path())!, 'utf8');
  expect(notes).toContain('Stage 5: Elaborate'); expect(notes).toContain(writing); expect(notes).toContain('Stage 5 completed.');
  await page.keyboard.press('Escape');
  await page.reload();
  const skip = page.getByRole('button', { name: 'Skip intro' }); if (await skip.isVisible()) await skip.click();
  await page.getByRole('button', { name: 'Continue your journey' }).click();
  await page.getByRole('button', { name: 'Review Elaborate', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Inspect infusion: The setting', exact: true })).toBeVisible();
  expect((await saved(page)).infusions[0].response).toBe(writing);
  expect(errors).toEqual([]);
});

test('crystal drag, keyboard fallback, cancelled drag and touch gesture', async ({ page }, testInfo) => {
  await enter(page, { step: 'choose', timerPaused: true });
  const source = page.getByRole('button', { name: 'Select crystal: The setting', exact: true });
  const box = (await source.boundingBox())!;
  const target = (await page.locator('[data-elaborate-chamber]').boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const toX = target.x + target.width / 2, toY = target.y + target.height / 2;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 30, y + 20, { steps: 4 }); await page.keyboard.press('Escape'); await page.mouse.up();
  expect((await saved(page)).activeMain).toBeNull();
  await expect(page.locator('.crystal-drag-ghost')).toHaveCount(0);
  if (testInfo.project.name === 'mobile') {
    const session = await page.context().newCDPSession(page);
    const scroll = await page.evaluate(() => scrollY);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    for (let step = 1; step <= 15; step++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (toX - x) * step / 15, y: y + (toY - y) * step / 15, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    expect(await page.evaluate(() => scrollY)).toBe(scroll);
    await session.detach();
  } else {
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(toX, toY, { steps: 15 }); await page.mouse.up();
  }
  await expect.poll(async () => (await saved(page)).activeMain).toBe('setting');
  await expect(page.locator('.crystal-drag-ghost')).toHaveCount(0);
  await page.getByRole('button', { name: 'Choose another crystal', exact: true }).click();
  await source.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: /Write how your evidence/ })).toBeVisible();
});

test('timer pauses in menus and hidden tabs; expiry keeps the draft', async ({ page }) => {
  await page.clock.install();
  await enter(page, { step: 'develop', activeMain: 'setting', infusions: [infusion], remainingMs: 20_000, timerPaused: false });
  await page.clock.pauseAt(new Date(Date.now() + 100));
  await page.clock.runFor(1500);
  const initial = (await saved(page)).remainingMs;
  await page.getByRole('button', { name: 'Pause timer', exact: true }).click();
  const manual = (await saved(page)).remainingMs;
  await page.clock.fastForward(5000); expect((await saved(page)).remainingMs).toBe(manual);
  await page.getByRole('button', { name: 'Resume timer', exact: true }).click();
  await page.clock.runFor(1500); expect((await saved(page)).remainingMs).toBeLessThan(initial);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const menu = (await saved(page)).remainingMs;
  await page.clock.fastForward(5000); expect((await saved(page)).remainingMs).toBe(menu);
  await page.keyboard.press('Escape');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const hidden = (await saved(page)).remainingMs;
  await page.clock.fastForward(5000); expect((await saved(page)).remainingMs).toBe(hidden);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.fastForward(30_000);
  await expect(page.getByRole('heading', { name: 'Ideas with greater depth.' })).toBeVisible();
  expect((await saved(page)).infusions[0].response).toBe(writing);
  await page.getByRole('button', { name: 'Continue untimed', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('Untimed');
  await page.getByRole('button', { name: 'Use timer', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('40:00');
});

test('upstream connection revision preserves Stage 5 writing until explicitly refreshed', async ({ page }) => {
  await enter(page, { step: 'review', activeMain: 'setting', infusions: [infusion], completed: true, timerPaused: true });
  await page.getByRole('button', { name: 'Journey overview', exact: true }).click();
  await page.getByRole('button', { name: 'Review Connect', exact: true }).click();
  await page.getByRole('button', { name: 'Edit The setting', exact: true }).click();
  await page.getByRole('textbox', { name: /How does the supporting idea/ }).fill('A revised connection about the threatening room.');
  await page.getByRole('button', { name: 'Review connections', exact: true }).click();
  await page.getByRole('button', { name: 'Complete Stage 4', exact: true }).click();
  await page.getByRole('button', { name: 'Open Elaborate', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Complete Stage 5', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Inspect infusion: The setting', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(writing);
  await page.getByRole('button', { name: 'Edit infusion', exact: true }).click();
  await expect(page.getByRole('textbox', { name: /Write how your evidence/ })).toHaveValue(writing);
  await page.getByRole('button', { name: 'Refresh from revised crystal', exact: true }).click();
  await page.getByRole('button', { name: 'Review infusions', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Complete Stage 5', exact: true })).toBeEnabled();
});
