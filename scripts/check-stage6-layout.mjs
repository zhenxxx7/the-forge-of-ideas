import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts/stage6-layout', { recursive: true });
const browser = await chromium.launch();
let failures = 0;
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 412, height: 915 }, { width: 320, height: 740 }, { width: 844, height: 390 }]) {
    if (process.argv[2] && viewport.width !== Number(process.argv[2])) continue;
    for (const largeText of [false, true]) {
      for (const scenario of ['intro', 'instructions', 'aim', 'won', 'lost']) {
        const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
        await page.addInitScript(({ scenario, largeText }) => {
          const ideas = ['setting', 'senses', 'uncertainty', 'reactions', 'control', 'pace'];
          const assignments = { setting: 'central', senses: 'supporting', uncertainty: 'central', reactions: 'supporting', control: 'central', pace: 'supporting' };
          const connections = [{ main: 'setting', supporting: ['senses'], explanation: 'The room feels unsafe.' }, { main: 'uncertainty', supporting: ['reactions'], explanation: 'Reactions build suspense.' }, { main: 'control', supporting: ['pace'], explanation: 'Pacing limits certainty.' }];
          const infusions = connections.map(connection => ({ main: connection.main, runes: ['evidence', 'effect'], response: 'This is my interpretation of the moment. I will use a precise detail from the classroom extract, explain the writer’s choices, and connect the effect to the question. '.repeat(12).slice(0, 1600), sourceFingerprint: JSON.stringify([connection.main, connection.supporting, connection.explanation]) }));
          const challenge = { step: scenario, selected: scenario === 'aim' ? 'setting' : null, used: scenario === 'won' ? ['setting', 'uncertainty'] : scenario === 'lost' ? ['setting', 'uncertainty', 'control'] : [], aim: 50, hits: scenario === 'won' ? 2 : scenario === 'lost' ? 1 : 0, confusion: scenario === 'lost' ? 2 : 0, completed: scenario === 'won' };
          localStorage.setItem('forge-of-ideas:settings:v1', JSON.stringify({ largeText, reducedMotion: true, sound: false }));
          localStorage.setItem('forge-of-ideas:progress:v1', JSON.stringify({ version: 1, name: 'Sean', screen: 'challenge', prologueIndex: 2, explored: ['how', 'moment', 'tense'], completed: true, generate: { step: 'collected', selected: ideas, completed: true }, sort: { step: 'review', assignments, completed: true }, connect: { step: 'review', connections, completed: true }, elaborate: { step: 'review', infusions, completed: true }, challenge }));
        }, { scenario, largeText });
        await page.goto('http://127.0.0.1:5173');
        const skip = page.getByRole('button', { name: 'Skip intro' }); if (await skip.isVisible()) await skip.click();
        await page.getByRole('button', { name: 'Continue your journey' }).click();
        await page.locator('.challenge-stage').waitFor();
        await page.evaluate(() => document.fonts.ready);
        const issues = await page.evaluate(() => {
          const errors = [];
          const rect = selector => document.querySelector(selector)?.getBoundingClientRect();
          const overlaps = (a, b) => a && b && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
          const frame = rect('.game-frame'), footer = rect('.utility-bar'), save = rect('.save-indicator'), dialogue = rect('.challenge-dialogue');
          for (const target of ['.challenge-dialogue', '.challenge-stock', '.challenge-controls', '.challenge-result', '.challenge-status']) {
            const box = rect(target);
            if (!box) continue;
            if (box.bottom > frame.bottom + 1 || box.left < frame.left - 1 || box.right > frame.right + 1) errors.push(`${target} exceeds frame`);
            if (overlaps(box, footer) || overlaps(box, save)) errors.push(`${target} overlaps footer ${JSON.stringify({ box: box.toJSON(), footer: footer.toJSON(), save: save.toJSON() })}`);
          }
          for (const target of ['.challenge-stock', '.challenge-controls', '.challenge-result']) if (overlaps(rect(target), dialogue)) errors.push(`${target} overlaps dialogue ${JSON.stringify({ box: rect(target).toJSON(), dialogue: dialogue.toJSON() })}`);
          if (overlaps(rect('.challenge-stock'), rect('.challenge-controls'))) errors.push('Stock overlaps controls');
          if (overlaps(rect('.challenge-status'), rect('.side-tools'))) errors.push('Status overlaps tools');
          if (document.documentElement.scrollWidth > innerWidth) errors.push('Horizontal page overflow');
          return errors;
        });
        const name = `${viewport.width}-${scenario}-${largeText ? 'large' : 'normal'}`;
        if (issues.length) { failures++; console.error(name, issues); } else console.log(`${name}: OK`);
        if (issues.length || viewport.width === 1440 || (viewport.width === 320 && largeText)) await page.screenshot({ path: `artifacts/stage6-layout/${name}.png`, animations: 'disabled', fullPage: true });
        await page.close();
      }
    }
  }
} finally { await browser.close(); }
if (failures) process.exitCode = 1;
