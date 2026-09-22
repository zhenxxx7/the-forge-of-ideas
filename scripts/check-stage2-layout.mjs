import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts/stage2-layout', { recursive: true });
const browser = await chromium.launch();
let failures = 0;
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 412, height: 915 }, { width: 320, height: 740 }, { width: 844, height: 390 }]) {
    for (const largeText of [false, true]) {
      for (const step of ['intro', 'explore', 'collected']) {
        const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
        await page.addInitScript(({ step, largeText }) => {
          localStorage.setItem('forge-of-ideas:settings:v1', JSON.stringify({ largeText, reducedMotion: true, sound: false }));
          localStorage.setItem('forge-of-ideas:progress:v1', JSON.stringify({ version: 1, name: 'Sean', screen: 'generate', prologueIndex: 2, explored: ['how', 'moment', 'tense'], completed: true, generate: { step, selected: ['lifelike', 'setting', 'senses', 'reactions'], activeIdea: 'reactions', timerPaused: true } }));
        }, { step, largeText });
        await page.goto('http://127.0.0.1:5173');
        const skip = page.getByRole('button', { name: 'Skip intro' });
        if (await skip.isVisible()) await skip.click();
        await page.getByRole('button', { name: 'Continue your journey' }).click();
        await page.locator('.generate-dialogue').waitFor();
        const issues = await page.evaluate(() => {
          const errors = [];
          const rect = selector => document.querySelector(selector)?.getBoundingClientRect();
          const overlap = (a, b) => a && b && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
          const frame = rect('.game-frame');
          const dialogue = rect('.generate-dialogue');
          if (dialogue.bottom > frame.bottom || overlap(dialogue, rect('.utility-bar')) || overlap(dialogue, rect('.save-indicator'))) errors.push('Dialogue reaches utility bar / frame bottom');
          for (const target of ['.idea-card', '.generate-title', '.collected-pouch', '.collection-feedback']) {
            if (overlap(rect(target), dialogue)) errors.push(`${target} overlaps dialogue`);
          }
          if (overlap(rect('.idea-card'), rect('.collection-feedback'))) errors.push('Card overlaps collection count');
          if (overlap(rect('.forge-hud'), rect('.side-tools'))) errors.push('HUD overlaps tools');
          if (document.documentElement.scrollWidth > innerWidth) errors.push('Horizontal page overflow');
          for (const button of document.querySelectorAll('.idea-card button, .forge-hud button')) {
            const box = button.getBoundingClientRect();
            if (box.right > frame.right + 1 || box.left < frame.left - 1) errors.push(`Button outside frame: ${button.textContent}`);
          }
          return errors;
        });
        const name = `${viewport.width}-${step}-${largeText ? 'large' : 'normal'}`;
        if (issues.length) { failures++; console.error(name, issues); }
        else console.log(`${name}: OK`);
        if (issues.length || (viewport.width === 320 && largeText) || (viewport.width === 1440 && step === 'explore' && !largeText)) await page.screenshot({ path: `artifacts/stage2-layout/${name}.png`, animations: 'disabled', fullPage: true });
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}
if (failures) process.exitCode = 1;
