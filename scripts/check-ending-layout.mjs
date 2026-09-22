import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';

const seed = JSON.parse(await readFile(new URL('../tests/fixtures/ending-save.json', import.meta.url), 'utf8'));
await mkdir('artifacts/ending-layout', { recursive: true });
const browser = await chromium.launch();
let failures = 0;
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 412, height: 915 }, { width: 320, height: 740 }, { width: 844, height: 390 }]) {
    if (process.argv[2] && viewport.width !== Number(process.argv[2])) continue;
    for (const largeText of [false, true]) {
      for (const scene of ['portal', 'archive', 'record']) {
        const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
        await page.addInitScript(({ seed, scene, largeText }) => {
          localStorage.setItem('forge-of-ideas:settings:v1', JSON.stringify({ largeText, reducedMotion: true, sound: false }));
          localStorage.setItem('forge-of-ideas:progress:v1', JSON.stringify({ ...seed, name: 'AlexandertheAdventurer1234', screen: 'ending', ending: { step: scene === 'portal' ? 'portal' : 'archive', completed: scene !== 'portal', reflection: 'Evidence connects my ideas. '.repeat(45).slice(0, 1200) } }));
        }, { seed, scene, largeText });
        await page.goto('http://127.0.0.1:5173');
        const skip = page.getByRole('button', { name: 'Skip intro' }); if (await skip.isVisible()) await skip.click();
        await page.getByRole('button', { name: 'Continue your journey' }).click();
        await page.locator('.ending-stage').waitFor();
        if (scene === 'record') {
          await page.getByRole('button', { name: 'Open your journey record', exact: true }).click();
          await page.getByRole('dialog').getByText('The setting', { exact: true }).click();
        }
        await page.evaluate(() => document.fonts.ready);
        const issues = await page.evaluate(scene => {
          const errors = [];
          const rect = selector => document.querySelector(selector)?.getBoundingClientRect();
          const overlaps = (a, b) => a && b && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
          const frame = rect('.game-frame');
          for (const selector of ['.ending-heading', '.ending-dialogue', '.ending-portal', '.archive-scroll-button']) {
            const box = rect(selector);
            if (!box) continue;
            if (box.bottom > frame.bottom + 1 || box.left < frame.left - 1 || box.right > frame.right + 1) errors.push(`${selector} exceeds frame`);
            if (overlaps(box, rect('.utility-bar')) || overlaps(box, rect('.save-indicator'))) errors.push(`${selector} overlaps footer`);
          }
          for (const selector of ['.ending-heading', '.ending-portal', '.archive-scroll-button']) if (overlaps(rect(selector), rect('.ending-dialogue'))) errors.push(`${selector} overlaps dialogue`);
          if (overlaps(rect('.ending-heading'), rect('.side-tools'))) errors.push('Heading overlaps tools');
          if (scene === 'record') {
            const dialog = document.querySelector('.archive-record-modal');
            if (dialog.scrollWidth > dialog.clientWidth + 1) errors.push('Record scrolls horizontally');
            const box = dialog.getBoundingClientRect();
            if (box.left < 0 || box.right > innerWidth || box.top < 0 || box.bottom > innerHeight + 1) errors.push('Record exceeds viewport');
          }
          if (document.documentElement.scrollWidth > innerWidth) errors.push('Horizontal page overflow');
          return errors;
        }, scene);
        const name = `${viewport.width}-${scene}-${largeText ? 'large' : 'normal'}`;
        if (issues.length) { failures++; console.error(name, issues); } else console.log(`${name}: OK`);
        await page.screenshot({ path: `artifacts/ending-layout/${name}.png`, fullPage: true, animations: 'disabled' });
        await page.close();
      }
    }
  }
} finally { await browser.close(); }
if (failures) process.exitCode = 1;
