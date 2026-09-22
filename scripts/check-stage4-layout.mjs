import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts/stage4-layout', { recursive: true });
const browser = await chromium.launch();
let failures = 0;
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 412, height: 915 }, { width: 320, height: 740 }, { width: 844, height: 390 }]) {
    if (process.argv[2] && viewport.width !== Number(process.argv[2])) continue;
    for (const largeText of [false, true]) {
      for (const scenario of ['intro', 'combine', 'full-central', 'explain', 'review', 'empty']) {
        const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
        await page.addInitScript(({ scenario, largeText }) => {
          const ideas = ['lifelike', 'setting', 'senses', 'reactions', 'uncertainty', 'pace', 'control', 'contrast'];
          const assignments = Object.fromEntries(ideas.map(id => [id, scenario === 'empty' ? 'irrelevant' : scenario === 'full-central' || scenario === 'review' ? id === 'senses' ? 'supporting' : 'central' : id === 'setting' ? 'central' : 'supporting']));
          const explanation = 'Sensory details make the setting feel threatening, while the characters’ reactions show how that threat affects them. Together, these details build tension for the reader. '.repeat(4).slice(0, 600);
          const connections = scenario === 'review' ? ideas.filter(id => id !== 'senses').map(main => ({ main, supporting: ['senses'], explanation })) : scenario === 'explain' ? [{ main: 'setting', supporting: ['senses', 'reactions'], explanation }] : [];
          localStorage.setItem('forge-of-ideas:settings:v1', JSON.stringify({ largeText, reducedMotion: true, sound: false }));
          localStorage.setItem('forge-of-ideas:progress:v1', JSON.stringify({ version: 1, name: 'Sean', screen: 'connect', prologueIndex: 2, explored: ['how', 'moment', 'tense'], completed: true, generate: { step: 'collected', selected: ideas, completed: true }, sort: { step: 'review', assignments, completed: true }, connect: { step: scenario === 'empty' || scenario === 'full-central' ? 'combine' : scenario, mainIdea: 'setting', supportingIdea: 'reactions', connections, timerPaused: true } }));
        }, { scenario, largeText });
        await page.goto('http://127.0.0.1:5173');
        const skip = page.getByRole('button', { name: 'Skip intro' });
        if (await skip.isVisible()) await skip.click();
        await page.getByRole('button', { name: 'Continue your journey' }).click();
        await page.locator('.connect-dialogue').waitFor();
        await page.evaluate(() => document.fonts.ready);
        const issues = await page.evaluate(() => {
          const errors = [];
          const rect = selector => document.querySelector(selector)?.getBoundingClientRect();
          const overlap = (a, b) => a && b && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
          const frame = rect('.game-frame'), dialogue = rect('.connect-dialogue');
          if (dialogue.bottom > frame.bottom || overlap(dialogue, rect('.utility-bar')) || overlap(dialogue, rect('.save-indicator'))) errors.push(`Dialogue reaches footer: ${JSON.stringify({ frame: frame.toJSON(), dialogue: dialogue.toJSON(), footer: rect('.utility-bar').toJSON() })}`);
          for (const target of ['.connect-inventory', '.connect-title', '.connect-review-panel', '.member-main', '.member-support', '.connect-receptacle', '.connect-missing']) if (overlap(rect(target), dialogue)) errors.push(`${target} overlaps dialogue`);
          if (overlap(rect('.connect-hud'), rect('.side-tools'))) errors.push('HUD overlaps tools');
          if (overlap(rect('.inventory-central'), rect('.inventory-supporting'))) errors.push('Inventories overlap');
          if (overlap(rect('.member-main'), rect('.member-support'))) errors.push('Member cards overlap');
          if (document.documentElement.scrollWidth > innerWidth) errors.push('Horizontal page overflow');
          for (const el of document.querySelectorAll('.connection-ore')) {
            const parent = el.closest('.connect-inventory').getBoundingClientRect(), box = el.getBoundingClientRect();
            if (box.right > parent.right + 1 || box.left < parent.left - 1 || box.bottom > parent.bottom + 1) errors.push(`Ore outside inventory: ${el.textContent}`);
          }
          const input = document.querySelector('textarea');
          if (input && input.getBoundingClientRect().right > dialogue.right) errors.push('Editor overflows parchment');
          return errors;
        });
        const name = `${viewport.width}-${scenario}-${largeText ? 'large' : 'normal'}`;
        if (issues.length) { failures++; console.error(name, issues); } else console.log(`${name}: OK`);
        if (issues.length || viewport.width === 1440 || (viewport.width === 320 && largeText)) await page.screenshot({ path: `artifacts/stage4-layout/${name}.png`, animations: 'disabled', fullPage: true });
        await page.close();
      }
    }
  }
} finally { await browser.close(); }
if (failures) process.exitCode = 1;
