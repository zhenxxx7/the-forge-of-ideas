import type { Page } from '@playwright/test';

export async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Ask the raven', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
}

export async function openJourney(page: Page) {
  if (await page.getByRole('dialog').isVisible()) await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Ask the raven', exact: true }).click();
  await page.getByRole('button', { name: 'Journey overview', exact: true }).click();
}
