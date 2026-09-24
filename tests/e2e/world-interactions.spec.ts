import { expect, test } from '@playwright/test';
import { newSave, SAVE_KEY, SETTINGS_KEY } from '../../src/state';

function battleSave() {
  const save = newSave('Maya');
  const statement = 'Sensory detail makes the setting threatening and builds tension.';
  save.screen = 'challenge';
  save.explored = ['how', 'moment', 'tense'];
  save.completed = true;
  save.generate = { ...save.generate, step: 'collected', selected: ['setting', 'senses'], completed: true };
  save.sort = { ...save.sort, step: 'review', assignments: { setting: 'central', senses: 'supporting' }, completed: true };
  save.connect = { ...save.connect, step: 'review', connections: [{ main: 'setting', supporting: ['senses'], explanation: statement }], completed: true };
  save.elaborate = { ...save.elaborate, step: 'review', infusions: [{ main: 'setting', runes: ['evidence', 'effect'], response: 'A precise classroom detail develops suspense in the threatening setting.', sourceFingerprint: JSON.stringify(['setting', ['senses'], statement]) }], completed: true };
  return save;
}

async function enterBattle(page: import('@playwright/test').Page) {
  await page.addInitScript(({ key, settingsKey, progress }) => {
    localStorage.setItem(key, JSON.stringify(progress));
    localStorage.setItem(settingsKey, JSON.stringify({ sound: false, reducedMotion: true, largeText: false }));
  }, { key: SAVE_KEY, settingsKey: SETTINGS_KEY, progress: battleSave() });
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue your journey' }).click();
  await page.getByRole('button', { name: 'Face the Beast' }).click();
  await page.getByRole('button', { name: 'Take aim' }).click();
}

test('the illustrated letter and question phrases work without the Next controls', async ({ page }) => {
  await page.goto('/');
  const letter = page.getByRole('button', { name: 'Open the sealed letter' });
  if (test.info().project.name === 'desktop') {
    await expect(letter).toBeVisible();
    await letter.click();
  } else {
    await page.getByRole('button', { name: 'Begin the journey' }).click();
  }
  await expect(page.getByLabel('Your name', { exact: true })).toBeVisible();
  await page.getByLabel('Your name', { exact: true }).fill('Maya');
  await page.getByRole('button', { name: 'Yes', exact: true }).click();
  await page.getByRole('button', { name: 'Start Stage 1' }).click();
  await page.getByRole('button', { name: 'Inspect How in the question' }).click();
  await expect(page.getByRole('button', { name: 'Inspect How in the question' })).toHaveAttribute('aria-pressed', 'true');
  const moment = page.getByRole('button', { name: 'Inspect this moment in the question' });
  await moment.focus();
  await page.keyboard.press('Enter');
  await expect(moment).toHaveAttribute('aria-pressed', 'true');
  const tense = page.getByRole('button', { name: 'Inspect so tense in the question' });
  await tense.focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'View your journey' })).toBeEnabled();
});

test('gateway, ore gathering and conveyors can progress the quest directly', async ({ page }) => {
  const save = newSave('Maya');
  save.screen = 'generate';
  save.explored = ['how', 'moment', 'tense'];
  save.completed = true;
  await page.addInitScript(({ key, settingsKey, progress }) => {
    localStorage.setItem(key, JSON.stringify(progress));
    localStorage.setItem(settingsKey, JSON.stringify({ sound: false, reducedMotion: true, largeText: false }));
  }, { key: SAVE_KEY, settingsKey: SETTINGS_KEY, progress: save });
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue your journey' }).click();
  await page.getByRole('button', { name: 'Open the Forge gateway' }).click();
  await page.getByRole('button', { name: 'Step through the Forge gateway' }).click();
  const ore = page.getByRole('button', { name: 'Explore The setting' });
  await ore.hover();
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  await expect(ore).toHaveClass(/collected-ore/);
  await expect(page.getByRole('button', { name: 'Review my pouch' })).toBeEnabled();
  await page.getByRole('button', { name: 'Review my pouch' }).click();
  await page.getByRole('button', { name: 'Complete Stage 2' }).click();
  await page.getByRole('button', { name: 'Continue to Sort' }).click();
  await page.getByRole('button', { name: 'Activate sorting conveyors' }).click();
  await page.getByRole('button', { name: 'Select The setting' }).click();
  await page.getByRole('button', { name: 'Place on Central belt' }).click();
  await expect(page.getByRole('button', { name: 'Release the sorted ideas' })).toBeEnabled();
  await page.getByRole('button', { name: 'Release the sorted ideas' }).click();
  await expect(page.locator('.screen-journey')).toBeVisible();
});

test('chamber, infusion, battlefield and portal react to world actions', async ({ page }) => {
  test.setTimeout(90_000);
  const save = newSave('Maya');
  save.screen = 'connect';
  save.explored = ['how', 'moment', 'tense'];
  save.completed = true;
  save.generate = { ...save.generate, step: 'collected', selected: ['setting', 'senses'], completed: true };
  save.sort = { ...save.sort, step: 'review', assignments: { setting: 'central', senses: 'supporting' }, completed: true };
  await page.addInitScript(({ key, settingsKey, progress }) => {
    localStorage.setItem(key, JSON.stringify(progress));
    localStorage.setItem(settingsKey, JSON.stringify({ sound: false, reducedMotion: true, largeText: false }));
  }, { key: SAVE_KEY, settingsKey: SETTINGS_KEY, progress: save });
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue your journey' }).click();
  await page.getByRole('button', { name: 'Enter the connecting chamber' }).click();
  await page.getByRole('button', { name: 'Select central idea: The setting' }).click();
  await page.getByRole('button', { name: 'Select supporting idea: Sensory detail' }).click();
  await page.getByRole('button', { name: 'Forge selected ideas in the central chamber' }).click();
  await page.getByRole('button', { name: 'Write connecting statement' }).click();
  await page.getByLabel('How does the supporting idea', { exact: false }).fill('Sensory detail makes the setting threatening and builds tension.');
  await page.getByRole('button', { name: 'Save statement' }).click();
  await page.getByRole('button', { name: 'Complete Stage 4' }).click();
  await page.getByRole('button', { name: 'Continue to Elaborate' }).click();
  await page.getByRole('button', { name: 'Enter the elaborating chamber' }).click();
  await page.getByRole('button', { name: 'Place a crystal in the central chamber' }).click();
  await page.getByRole('button', { name: 'Add Evidence rune' }).click();
  await page.getByRole('button', { name: 'Add Effect rune' }).click();
  await expect(page.locator('.elaborate-stage')).toHaveClass(/brew-active/);
  await page.getByRole('button', { name: 'Write elaborated response' }).click();
  await page.getByLabel('Write how your evidence', { exact: false }).fill('A precise detail from the classroom extract makes the setting threatening and its effect develops suspense.');
  await page.getByRole('button', { name: 'Save response' }).click();
  await expect(page.locator('.elaborate-stage')).toHaveClass(/brew-ready/);
  await page.getByRole('button', { name: 'Review infusions' }).click();
  await page.getByRole('button', { name: 'Complete Stage 5' }).click();
  await page.getByRole('button', { name: 'Continue to Challenge' }).click();
  await page.getByRole('button', { name: 'Face the Beast' }).click();
  await page.getByRole('button', { name: 'Take aim' }).click();
  const vial = await page.getByRole('button', { name: 'Select infusion: The setting' }).boundingBox();
  const frame = await page.locator('.game-frame').boundingBox();
  await page.mouse.move(vial!.x + vial!.width / 2, vial!.y + vial!.height / 2);
  await page.mouse.down();
  await page.mouse.move(frame!.x + frame!.width * 0.5, frame!.y + frame!.height * 0.44, { steps: 16 });
  await page.mouse.up();
  await expect(page.locator('.challenge-won')).toBeVisible();
  await page.getByRole('button', { name: 'Complete Stage 6' }).click();
  await page.getByRole('button', { name: 'Enter the Archival Hall through the portal' }).click();
  await expect(page.locator('.ending-phase-archive')).toBeVisible();
  await page.getByRole('button', { name: 'Open your journey record' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('a touch-dragged flask strikes the Beast without scrolling the page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touch gesture uses the mobile project.');
  await enterBattle(page);
  const vial = (await page.getByRole('button', { name: 'Select infusion: The setting' }).boundingBox())!;
  const frame = (await page.locator('.game-frame').boundingBox())!;
  const from = { x: vial.x + vial.width / 2, y: vial.y + vial.height / 2 };
  const to = { x: frame.x + frame.width * 0.5, y: frame.y + frame.height * 0.44 };
  const scrollBefore = await page.evaluate(() => scrollY);
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...from, id: 1 }] });
  for (let step = 1; step <= 16; step++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * step / 16, y: from.y + (to.y - from.y) * step / 16, id: 1 }] });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('.challenge-won')).toBeVisible();
  await expect(page.locator('.challenge-drag-vial')).toHaveCount(0);
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
  await session.detach();
});

test('double-tapping the same battlefield point throws the selected flask', async ({ page }) => {
  await enterBattle(page);
  await page.getByRole('button', { name: 'Select infusion: The setting' }).click();
  const field = page.getByRole('button', { name: 'Aim in the battlefield' });
  const box = (await field.boundingBox())!;
  const position = { x: box.width / 2, y: box.height / 2 };
  await field.click({ position });
  await field.click({ position });
  await expect(page.locator('.challenge-won')).toBeVisible();
});
