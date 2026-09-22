import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { ConnectProgress } from '../../src/stage4';
import type { SortAssignments } from '../../src/stage3';

const ideas = ['lifelike', 'setting', 'senses', 'reactions', 'uncertainty', 'pace'];
const assignments: SortAssignments = { lifelike: 'irrelevant', setting: 'central', senses: 'supporting', reactions: 'supporting', uncertainty: 'central', pace: 'supporting' };
const statement = 'Sensory details make the setting feel threatening. The reactions reveal the effect of this threat.';
const explained: Partial<ConnectProgress> = { step: 'explain', mainIdea: 'setting', timerPaused: true, connections: [{ main: 'setting', supporting: ['senses'], explanation: statement }] };
async function enter(page: Page, connect?: Partial<ConnectProgress>, categories = assignments) {
  await page.addInitScript(({ ideas, connect, categories }) => {
    if (localStorage.getItem('forge-of-ideas:progress:v1')) return;
    localStorage.setItem('forge-of-ideas:progress:v1', JSON.stringify({ version: 1, name: 'Sean', screen: connect ? 'connect' : 'journey', prologueIndex: 2, explored: ['how', 'moment', 'tense'], completed: true, generate: { step: 'collected', selected: ideas, completed: true }, sort: { step: 'review', assignments: categories, completed: true }, ...(connect ? { connect } : {}) }));
  }, { ideas, connect, categories });
  await page.goto('/'); await resume(page);
  if (!connect) await page.getByRole('button', { name: 'Start Stage 4', exact: true }).click();
}
async function resume(page: Page) {
  const skip = page.getByRole('button', { name: 'Skip intro' });
  if (await skip.isVisible()) await skip.click();
  await page.getByRole('button', { name: 'Continue your journey' }).click();
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(localStorage.getItem('forge-of-ideas:progress:v1')!).connect as ConnectProgress); }
async function choose(page: Page, slot: string, label: string) { await page.getByRole('button', { name: `Select ${slot} idea: ${label}`, exact: true }).click(); }
async function sortIdea(page: Page, label: string, category: string) {
  await page.getByRole('button', { name: `Select ${label}`, exact: true }).click();
  await page.getByRole('button', { name: `Move selected idea to ${category}`, exact: true }).click();
}

test('complete Stage 4 with two supporting ideas, notes, reload and revision', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await enter(page);
  await expect(page.getByRole('heading', { name: 'Connecting Ideas', exact: true })).toBeVisible();
  await expect(page.getByRole('timer')).toHaveText('60:00');
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-stage4-intro.png`, fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Enter the chamber', exact: true }).click();
  await expect(page.getByRole('button', { name: /Select .*Lifelike AI/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Forge connection', exact: true })).toBeDisabled();
  await choose(page, 'central', 'The setting'); await choose(page, 'supporting', 'Sensory detail');
  await page.getByRole('button', { name: 'Forge connection', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Explain your connection', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review connections', exact: true })).toBeDisabled();
  const editor = page.getByRole('textbox', { name: /How does the supporting idea/ });
  await editor.fill(statement);
  await page.getByRole('button', { name: 'Add supporting idea', exact: true }).click();
  await choose(page, 'supporting', 'Sensory detail');
  await expect(page.getByRole('button', { name: 'Strengthen crystal', exact: true })).toBeDisabled();
  await choose(page, 'supporting', 'Reactions');
  await page.getByRole('button', { name: 'Strengthen crystal', exact: true }).click();
  await expect(editor).toHaveValue(statement);
  await expect(page.getByRole('button', { name: 'Add supporting idea', exact: true })).toBeDisabled();
  expect((await saved(page)).connections).toEqual([{ main: 'setting', supporting: ['senses', 'reactions'], explanation: statement }]);
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-stage4-explain.png`, fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Review connections', exact: true }).click();
  await page.getByRole('button', { name: 'Complete Stage 4', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Review Connect', exact: true })).toBeVisible();
  await expect(page.getByLabel('Elaborate, locked', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quest journal', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(statement);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download notes', exact: true }).click();
  const notes = await readFile((await (await downloadEvent).path())!, 'utf8');
  expect(notes).toContain('Stage 4: Connect'); expect(notes).toContain(statement); expect(notes).toContain('Stage 4 completed.');
  await page.keyboard.press('Escape');
  await page.reload(); await resume(page);
  await page.getByRole('button', { name: 'Review Connect', exact: true }).click();
  await page.getByRole('button', { name: 'Edit The setting', exact: true }).click();
  await editor.fill('   ');
  await expect(page.getByRole('button', { name: 'Review connections', exact: true })).toBeDisabled();
  expect((await saved(page)).completed).toBe(false);
  await editor.fill(statement);
  await page.reload(); await resume(page);
  await expect(editor).toHaveValue(statement);
  expect(errors).toEqual([]);
});

test('matching receptacle drag, wrong drop, Escape and keyboard selection', async ({ page }, testInfo) => {
  await enter(page, { step: 'combine', timerPaused: true });
  if (testInfo.project.name === 'mobile') await page.evaluate(() => window.scrollTo(0, 350));
  const box = (await page.getByRole('button', { name: 'Select central idea: The setting', exact: true }).boundingBox())!;
  const correct = (await page.locator('.receptacle-central').boundingBox())!;
  const wrong = (await page.locator('.receptacle-supporting').boundingBox())!;
  const dragTo = async (target: typeof correct) => {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 15 }); await page.mouse.up();
  };
  await dragTo(wrong); expect((await saved(page)).mainIdea).toBeNull();
  await dragTo(correct); expect((await saved(page)).mainIdea).toBe('setting');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 30, { steps: 4 });
  await page.keyboard.press('Escape'); await page.mouse.up();
  expect((await saved(page)).mainIdea).toBe('setting');
  await expect(page.locator('.connect-drag-ghost')).toHaveCount(0);
  await page.getByRole('button', { name: 'Select supporting idea: Sensory detail', exact: true }).focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Forge connection', exact: true }).focus(); await page.keyboard.press('Space');
  await expect(page.getByRole('textbox', { name: /How does the supporting idea/ })).toBeVisible();
  await expect.poll(() => page.locator('.crystal-materialize').evaluate(element => Number(getComputedStyle(element).opacity))).toBe(1);
  expect(await page.locator('.crystal-materialize > svg').evaluate(element => getComputedStyle(element).animationPlayState)).toBe('paused');
  await page.getByRole('button', { name: 'Resume timer', exact: true }).click();
  expect(await page.locator('.crystal-materialize > svg').evaluate(element => getComputedStyle(element).animationPlayState)).toBe('running');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.crystal-materialize').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
});

test('empty categories require learner-led sorting, never an invented pair', async ({ page }) => {
  const empty = Object.fromEntries(ideas.map(id => [id, 'irrelevant'])) as SortAssignments;
  await enter(page, { step: 'combine', timerPaused: true }, empty);
  await expect(page.getByRole('heading', { name: 'A connection needs two kinds of idea.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Forge connection', exact: true })).toBeDisabled();
  expect((await saved(page)).connections).toEqual([]);
  await page.getByRole('button', { name: 'Revisit sorting', exact: true }).click();
  await sortIdea(page, 'The setting', 'Central'); await sortIdea(page, 'Sensory detail', 'Supporting');
  await page.getByRole('button', { name: 'Review sorting', exact: true }).click();
  await page.getByRole('button', { name: 'Complete Stage 3', exact: true }).click();
  await page.getByRole('button', { name: 'Open Connect', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A connection needs two kinds of idea.' })).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Central idea collection', exact: true }).getByRole('button')).toHaveCount(1);
  await expect(page.getByRole('group', { name: 'Supporting idea collection', exact: true }).getByRole('button')).toHaveCount(1);
});

test('menus, manual pause and hidden tabs stop the timer; expiry keeps writing', async ({ page }) => {
  await page.clock.install();
  await enter(page, { ...explained, remainingMs: 20_000, timerPaused: false });
  await page.clock.pauseAt(new Date(Date.now() + 100));
  await page.clock.runFor(1500);
  const initial = (await saved(page)).remainingMs;
  await page.getByRole('button', { name: 'Pause timer', exact: true }).click();
  const manual = (await saved(page)).remainingMs;
  await page.clock.fastForward(5000); expect((await saved(page)).remainingMs).toBe(manual);
  await page.getByRole('button', { name: 'Resume timer', exact: true }).click();
  await page.clock.runFor(1500); expect((await saved(page)).remainingMs).toBeLessThan(initial);
  await page.getByRole('button', { name: 'Open crystal collection, 1 crystals', exact: true }).click();
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
  await page.getByRole('textbox', { name: /How does the supporting idea/ }).fill(statement + ' Still thinking.');
  await page.clock.fastForward(30_000);
  await expect(page.getByRole('heading', { name: 'Ideas, stronger together.' })).toBeVisible();
  expect((await saved(page)).connections[0].explanation).toBe(statement + ' Still thinking.');
  await page.getByRole('button', { name: 'Continue untimed', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('Untimed');
  await page.clock.fastForward(120_000); await expect(page.getByRole('timer')).toHaveText('Untimed');
  await page.getByRole('button', { name: 'Use timer', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('60:00');
});

test('upstream sorting changes flag saved writing for repair; deletion is explicit', async ({ page }) => {
  await enter(page, { ...explained, completed: true });
  await page.getByRole('button', { name: 'Revisit Sort', exact: true }).click();
  await sortIdea(page, 'Sensory detail', 'Irrelevant');
  expect((await saved(page)).completed).toBe(false);
  expect((await saved(page)).connections[0].explanation).toBe(statement);
  await page.getByRole('button', { name: 'Journey overview', exact: true }).click();
  await expect(page.getByLabel('Connect, locked', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open Sort', exact: true }).click();
  await page.getByRole('button', { name: 'Review sorting', exact: true }).click();
  await page.getByRole('button', { name: 'Complete Stage 3', exact: true }).click();
  await page.getByRole('button', { name: 'Open Connect', exact: true }).click();
  await expect(page.getByText('Sorting changed. Revisit Sort or revise this crystal.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Complete Stage 4', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Edit The setting', exact: true }).click();
  await page.getByRole('button', { name: 'Disconnect Sensory detail', exact: true }).click();
  await expect(page.getByRole('textbox', { name: /How does the supporting idea/ })).toHaveValue(statement);
  await page.getByRole('button', { name: 'Add supporting idea', exact: true }).click();
  await choose(page, 'supporting', 'Reactions');
  await page.getByRole('button', { name: 'Forge connection', exact: true }).click();
  await page.getByRole('button', { name: 'Review connections', exact: true }).click();
  await page.getByRole('button', { name: 'Remove crystal: The setting', exact: true }).click();
  await page.getByRole('button', { name: 'Keep crystal', exact: true }).click();
  expect((await saved(page)).connections[0].explanation).toBe(statement);
  await page.getByRole('button', { name: 'Remove crystal: The setting', exact: true }).click();
  await page.getByRole('button', { name: 'Remove crystal', exact: true }).click();
  expect((await saved(page)).connections).toEqual([]);
  await expect(page.getByRole('button', { name: 'Complete Stage 4', exact: true })).toBeDisabled();
});

test('discarding a collected ore retains the authored connection across reload', async ({ page }) => {
  await enter(page, { ...explained, completed: true });
  await page.getByRole('button', { name: 'Journey overview', exact: true }).click();
  await page.getByRole('button', { name: 'Review Generate', exact: true }).click();
  await page.getByRole('button', { name: 'Gather more ideas', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Sensory detail', exact: true }).click();
  await page.getByRole('button', { name: 'In your pouch', exact: true }).click();
  expect((await saved(page)).connections[0].explanation).toBe(statement);
  expect((await saved(page)).completed).toBe(false);
  await page.reload(); await resume(page);
  await page.getByRole('button', { name: 'Quest journal', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(statement);
  await expect(page.getByRole('dialog')).toContainText('Sorting changed. Revisit Sort or revise this crystal.');
});

test('touch dragging reaches the matching bowl without scrolling the gesture', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touch-input check uses mobile emulation.');
  await enter(page, { step: 'combine', timerPaused: true });
  await page.evaluate(() => window.scrollTo(0, 350));
  const source = (await page.getByRole('button', { name: 'Select central idea: The setting', exact: true }).boundingBox())!;
  const target = (await page.locator('.receptacle-central').boundingBox())!;
  const x = source.x + source.width / 2, y = source.y + source.height / 2;
  const toX = target.x + target.width / 2, toY = target.y + target.height / 2;
  const session = await page.context().newCDPSession(page);
  const scroll = await page.evaluate(() => scrollY);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  for (let step = 1; step <= 15; step++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (toX - x) * step / 15, y: y + (toY - y) * step / 15, id: 1 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(async () => (await saved(page)).mainIdea).toBe('setting');
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  await expect(page.locator('.connect-drag-ghost')).toHaveCount(0);
  await session.detach();
});
