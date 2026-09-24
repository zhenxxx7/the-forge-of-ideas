import { expect, test } from '@playwright/test';

test('touch gestures place an ore on a belt without scrolling the gesture', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touch-input check uses the mobile project.');
  await page.addInitScript(() => {
    localStorage.setItem('forge-of-ideas:settings:v1', JSON.stringify({ reducedMotion: true }));
    localStorage.setItem('forge-of-ideas:progress:v1', JSON.stringify({ version: 1, name: 'Sean', screen: 'sort', completed: true, explored: ['how', 'moment', 'tense'], generate: { selected: ['lifelike', 'setting'], completed: true }, sort: { step: 'sorting', timerPaused: true } }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue your journey' }).click();
  await page.evaluate(() => window.scrollTo(0, 180));
  const source = (await page.getByRole('button', { name: 'Select Lifelike AI', exact: true }).boundingBox())!;
  const target = (await page.getByRole('button', { name: 'Move selected idea to Irrelevant', exact: true }).boundingBox())!;
  const x = source.x + source.width / 2, y = source.y + source.height / 2;
  const toX = target.x + target.width / 2, toY = target.y + target.height / 2;
  const session = await page.context().newCDPSession(page);
  const scrollBefore = await page.evaluate(() => scrollY);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  for (let step = 1; step <= 12; step++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (toX - x) * step / 12, y: y + (toY - y) * step / 12, id: 1 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('forge-of-ideas:progress:v1')!).sort.assignments.lifelike)).toBe('irrelevant');
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
  await expect(page.locator('.sort-drag-ghost')).toHaveCount(0);
  await session.detach();
});
