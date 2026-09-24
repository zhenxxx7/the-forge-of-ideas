import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { SCRIPT } from '../../src/storyboard';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const statement = 'Sensory detail develops the threatening setting and makes the reader anticipate danger.';
const response = 'I would examine a precise detail in the classroom extract, explain the writer’s choice, and connect its effect to the tension in this moment.';

test('mockup journey: onboarding through every stage to the archive', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('forge-of-ideas:settings:v1', JSON.stringify({ sound: false, reducedMotion: true, largeText: false })));
  await page.goto('/');
  await expect(page.locator('.screen-landing')).toBeVisible();
  await button(page, 'Begin the journey').click();
  await button(page, 'Yes').click();
  await expect(page.getByRole('alert')).toHaveText('Please enter at least 2 characters.');
  await page.getByLabel('Your name', { exact: true }).fill('Sean');
  await button(page, 'Yes').click();
  await expect(page.locator('.dialogue-copy')).toContainText('Hello Sean.');
  await button(page, 'Start Stage 1').click();
  await expect(page.locator('.dialogue-copy')).toHaveText(SCRIPT.prepare);
  await expect(button(page, 'View your journey')).toBeDisabled();
  for (const word of ['How', 'this moment', 'so tense']) await button(page, word).click();
  await button(page, 'View your journey').click();
  await expect(page.locator('.journey-map .stage-tile')).toHaveCount(7);
  await expect(button(page, 'Locked Sort')).toBeDisabled();
  await button(page, 'Continue to Generate').click();

  await expect(page.locator('.dialogue-copy')).toHaveText(SCRIPT.entrance);
  await button(page, 'Enter the Forge').click();
  await expect(page.locator('.dialogue-copy')).toHaveText(SCRIPT.generateIntro);
  await button(page, 'Start gathering').click();
  await expect(button(page, 'Review my pouch')).toBeDisabled();
  for (const label of ['The setting', 'Sensory detail']) {
    await button(page, 'Explore ' + label).click();
    await page.locator('.idea-card').hover();
    await button(page, 'Collect idea').click();
  }
  await button(page, 'Review my pouch').click();
  await expect(page.locator('.dialogue-copy')).toHaveText(SCRIPT.generateCollected);
  await button(page, 'Complete Stage 2').click();
  await button(page, 'Continue to Sort').click();

  await expect(page.locator('.dialogue-copy')).toHaveText(SCRIPT.sortIntro);
  await button(page, 'Start sorting').click();
  for (const [label, category] of [['The setting', 'Central'], ['Sensory detail', 'Supporting']]) {
    await button(page, 'Select ' + label).click();
    await button(page, 'Move selected idea to ' + category).click();
  }
  await button(page, 'Complete Stage 3').click();
  await button(page, 'Continue to Connect').click();

  await expect(page.locator('.mockup-ore-grid .ore-preview')).toHaveCount(9);
  await button(page, 'Enter the chamber').click();
  await button(page, 'Select central idea: The setting').click();
  await button(page, 'Select supporting idea: Sensory detail').click();
  await button(page, 'Forge connection').click();
  await expect(page.locator('.dialogue-copy')).toHaveText(SCRIPT.connectionMade);
  await button(page, 'Complete Stage 4').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('How does the supporting idea', { exact: false }).fill(statement);
  await button(page, 'Save statement').click();
  await button(page, 'Complete Stage 4').click();
  await button(page, 'Continue to Elaborate').click();

  await expect(page.locator('.elaborate-title')).toBeVisible();
  await expect(page.locator('.scroll-paper')).toBeHidden();
  await button(page, 'Enter the chamber').click();
  await expect(page.locator('.dialogue-copy')).toHaveText(SCRIPT.elaborateChoose);
  await button(page, 'Select crystal: The setting').click();
  await button(page, 'Add Evidence rune').click();
  await button(page, 'Add Effect rune').click();
  await button(page, 'Write elaborated response').click();
  await page.getByLabel('Write how your evidence', { exact: false }).fill(response);
  await button(page, 'Save response').click();
  await button(page, 'Review infusions').click();
  await expect(page.locator('.dialogue-copy')).toHaveText(SCRIPT.infusions);
  await button(page, 'Inspect infusion: The setting').click();
  await expect(page.getByRole('dialog')).toContainText(response);
  await page.keyboard.press('Escape');
  await button(page, 'Complete Stage 5').click();
  await button(page, 'Continue to Challenge').click();

  await expect(page.locator('.dialogue-copy')).toHaveText(SCRIPT.beastIntro);
  await button(page, 'Face the Beast').click();
  await expect(page.locator('.challenge-stock .infusion-vial')).toBeVisible();
  await button(page, 'Take aim').click();
  await button(page, 'Select infusion: The setting').click();
  await page.getByLabel('Horizontal aim').fill('50');
  await button(page, 'Launch infusion').click();
  await expect(page.locator('.challenge-won')).toBeVisible();
  await expect(page.locator('.scroll-paper')).toBeHidden();
  await button(page, 'Complete Stage 6').click();

  await expect(page.locator('.dialogue-copy')).toHaveText(SCRIPT.ending);
  await button(page, 'Enter the Archival Hall through the portal').click();
  await expect(page.locator('.dialogue-copy')).toHaveText(SCRIPT.archive);
  await button(page, 'Open your journey record').click();
  await page.getByLabel('One thought to carry forward', { exact: false }).fill('Each supporting idea develops my main point.');
  await page.getByText('The setting', { exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(response);
  const downloadPromise = page.waitForEvent('download');
  await button(page, 'Download quest notes').click();
  const download = await downloadPromise;
  const notes = await readFile((await download.path())!, 'utf8');
  expect(notes).toContain(statement);
  expect(notes).toContain(response);
  expect(notes).toContain('Each supporting idea develops my main point.');
  await page.keyboard.press('Escape');
  await page.reload();
  await button(page, 'Continue your journey').click();
  await button(page, 'View journey record').click();
  await expect(page.getByLabel('One thought to carry forward', { exact: false })).toHaveValue('Each supporting idea develops my main point.');
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-storyboard-record.png`, fullPage: true });
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('settings and keyboard access stay available through raven menu', async ({ page }) => {
  await page.goto('/');
  await button(page, 'Begin the journey').click();
  await page.getByLabel('Your name', { exact: true }).fill('Maya');
  await button(page, 'Yes').click();
  await button(page, 'Ask the raven').click();
  await button(page, 'Settings').click();
  await page.getByLabel('Reduce motion', { exact: false }).check();
  await page.getByLabel('Larger dialogue', { exact: false }).check();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await button(page, 'Start Stage 1').focus();
  await page.keyboard.press('Enter');
  await button(page, 'How').focus();
  await page.keyboard.press('Enter');
  await expect(button(page, 'How')).toHaveAttribute('aria-pressed', 'true');
  await button(page, 'Home').click();
  await button(page, 'Begin anew').click();
  await button(page, 'Keep my journey').click();
  await button(page, 'Continue your journey').click();
  await expect(page.locator('.screen-prepare')).toBeVisible();
  const box = await page.locator('.dialogue-scroll').boundingBox();
  const text = await page.locator('.dialogue-copy').boundingBox();
  expect(text!.y + text!.height).toBeLessThanOrEqual(box!.y + box!.height);
});
