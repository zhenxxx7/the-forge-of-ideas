import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts/stage3-layout', { recursive: true });
const browser = await chromium.launch();
let failures = 0;
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 412, height: 915 }, { width: 320, height: 740 }, { width: 844, height: 390 }]) {
    if (process.argv[2] && viewport.width !== Number(process.argv[2])) continue;
    for (const largeText of [false, true]) {
      for (const scenario of ['intro', 'sorting', 'full-belt', 'review']) {
        const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
        await page.addInitScript(({ scenario, largeText }) => {
          const ideas = ['lifelike', 'setting', 'senses', 'reactions', 'uncertainty', 'pace', 'control', 'contrast'];
          const assignments = scenario === 'full-belt' || scenario === 'review' ? Object.fromEntries(ideas.map(id => [id, 'central'])) : {};
          localStorage.setItem('forge-of-ideas:settings:v1', JSON.stringify({ largeText, reducedMotion: true, sound: false }));
          localStorage.setItem('forge-of-ideas:progress:v1', JSON.stringify({ version: 1, name: 'Sean', screen: 'sort', prologueIndex: 2, explored: ['how', 'moment', 'tense'], completed: true, generate: { step: 'collected', selected: ideas, completed: true }, sort: { step: scenario === 'full-belt' ? 'sorting' : scenario, activeIdea: 'uncertainty', assignments, timerPaused: true } }));
        }, { scenario, largeText });
        await page.goto('http://127.0.0.1:5173');
        const skip = page.getByRole('button', { name: 'Skip intro' });
        if (await skip.isVisible()) await skip.click();
        await page.getByRole('button', { name: 'Continue your journey' }).click();
        await page.locator('.sort-dialogue').waitFor();
        await page.evaluate(() => document.fonts.ready);
        const issues = await page.evaluate(() => {
          const errors = [];
          const rect = selector => document.querySelector(selector)?.getBoundingClientRect();
          const overlap = (a, b) => a && b && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
          const frame = rect('.game-frame');
          const dialogue = rect('.sort-dialogue');
          if (dialogue.bottom > frame.bottom || overlap(dialogue, rect('.utility-bar')) || overlap(dialogue, rect('.save-indicator'))) errors.push(`Dialogue reaches footer or frame bottom: ${JSON.stringify(['.game-frame', '.sort-stage', '.sort-dialogue', '.utility-bar', '.save-indicator'].map(selector => ({ selector, rect: rect(selector).toJSON(), bottom: getComputedStyle(document.querySelector(selector)).bottom })))}`);
          for (const target of ['.sort-tray', '.sort-title', '.sort-review', '.sorting-belt']) if (overlap(rect(target), dialogue)) errors.push(`${target} overlaps dialogue`);
          if (overlap(rect('.sort-hud'), rect('.side-tools'))) errors.push('HUD overlaps tools');
          if (overlap(rect('.sort-tray'), rect('.sorting-belt'))) errors.push('Tray overlaps belt');
          if (document.documentElement.scrollWidth > innerWidth) errors.push('Horizontal page overflow');
          for (const el of document.querySelectorAll('.sort-tray .sort-ore, .belt-gems .sort-ore')) {
            const parent = el.closest('.sort-tray, .sorting-belt').getBoundingClientRect();
            const box = el.getBoundingClientRect();
            if (box.right > parent.right + 1 || box.left < parent.left - 1 || box.bottom > parent.bottom + 1) errors.push(`Ore outside its tray or belt: ${el.textContent}`);
          }
          if (overlap(rect('.sort-undo'), rect('.sort-ore-grid'))) errors.push('Undo overlaps ore grid');
          return errors;
        });
        const name = `${viewport.width}-${scenario}-${largeText ? 'large' : 'normal'}`;
        if (issues.length) { failures++; console.error(name, issues); } else console.log(`${name}: OK`);
        if (issues.length || viewport.width === 1440 || (viewport.width === 320 && largeText)) await page.screenshot({ path: `artifacts/stage3-layout/${name}.png`, animations: 'disabled', fullPage: true });
        await page.close();
      }
    }
  }
} finally { await browser.close(); }
if (failures) process.exitCode = 1;
