import { expect, test } from '@playwright/test';

test('landing wordmark remains smaller and clear of the raven', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('forge-of-ideas:settings:v1', JSON.stringify({ sound: false, reducedMotion: true, largeText: false })));
  await page.goto('/');

  const wordmark = page.locator('.hero-title');
  const raven = page.locator('.screen-landing .raven-character');
  await expect(wordmark.locator('img')).toBeVisible();
  await expect(raven).toBeVisible();

  const titleBox = await wordmark.boundingBox();
  const ravenBox = await raven.boundingBox();
  expect(titleBox).not.toBeNull();
  expect(ravenBox).not.toBeNull();
  const horizontalOverlap = Math.min(titleBox!.x + titleBox!.width, ravenBox!.x + ravenBox!.width) - Math.max(titleBox!.x, ravenBox!.x);
  const verticalOverlap = Math.min(titleBox!.y + titleBox!.height, ravenBox!.y + ravenBox!.height) - Math.max(titleBox!.y, ravenBox!.y);
  expect(horizontalOverlap <= 0 || verticalOverlap <= 0).toBe(true);

  if (page.viewportSize()!.width > 600) expect(titleBox!.width).toBeLessThan(page.viewportSize()!.width / 2);
});
