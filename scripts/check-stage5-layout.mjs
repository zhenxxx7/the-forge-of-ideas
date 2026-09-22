import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts/stage5-layout', { recursive: true });
const browser = await chromium.launch();
let failures = 0;
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 412, height: 915 }, { width: 320, height: 740 }, { width: 844, height: 390 }]) {
    if (process.argv[2] && viewport.width !== Number(process.argv[2])) continue;
    for (const largeText of [false, true]) {
      for (const scenario of ['intro', 'choose', 'develop', 'review']) {
        const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
        await page.addInitScript(({ scenario, largeText }) => {
          const ideas = ['lifelike', 'setting', 'senses', 'reactions', 'uncertainty', 'pace', 'control', 'contrast'];
          const assignments = { lifelike: 'central', setting: 'central', senses: 'supporting', reactions: 'supporting', uncertainty: 'central', pace: 'supporting', control: 'central', contrast: 'supporting' };
          const mains = ['lifelike', 'setting', 'uncertainty', 'control'];
          const connections = mains.map((main, index) => ({ main, supporting: [index % 2 ? 'senses' : 'pace'], explanation: `This connected idea helps me examine how tension develops in the moment. ${'I need to check a precise detail from the classroom extract. '.repeat(5)}`.slice(0, 600) }));
          const response = 'This is my interpretation of the moment. I will use a precise detail from the classroom extract, explain the writer’s choices, and connect the effect to the question. '.repeat(12).slice(0, 1600);
          const infusions = scenario === 'review' ? connections.map(connection => ({ main: connection.main, runes: ['evidence', 'effect'], response, sourceFingerprint: JSON.stringify([connection.main, connection.supporting, connection.explanation]) })) : scenario === 'develop' ? [{ main: 'setting', runes: ['evidence', 'effect'], response, sourceFingerprint: JSON.stringify([connections[1].main, connections[1].supporting, connections[1].explanation]) }] : [];
          localStorage.setItem('forge-of-ideas:settings:v1', JSON.stringify({ largeText, reducedMotion: true, sound: false }));
          localStorage.setItem('forge-of-ideas:progress:v1', JSON.stringify({ version: 1, name: 'Sean', screen: 'elaborate', prologueIndex: 2, explored: ['how', 'moment', 'tense'], completed: true, generate: { step: 'collected', selected: ideas, completed: true }, sort: { step: 'review', assignments, completed: true }, connect: { step: 'review', connections, completed: true, timerPaused: true }, elaborate: { step: scenario, activeMain: scenario === 'develop' ? 'setting' : null, infusions, timerPaused: true } }));
        }, { scenario, largeText });
        await page.goto('http://127.0.0.1:5173');
        const skip = page.getByRole('button', { name: 'Skip intro' });
        if (await skip.isVisible()) await skip.click();
        await page.getByRole('button', { name: 'Continue your journey' }).click();
        await page.locator('.elaborate-stage').waitFor();
        await page.evaluate(() => document.fonts.ready);
        const issues = await page.evaluate(() => {
          const errors = [];
          const rect = selector => document.querySelector(selector)?.getBoundingClientRect();
          const overlaps = (a, b) => a && b && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
          const frame = rect('.game-frame'), footer = rect('.utility-bar'), save = rect('.save-indicator');
          for (const target of ['.elaborate-dialogue', '.rune-hint', '.infusion-review', '.infusion-editor', '.elaborate-crystal-tray']) {
            const box = rect(target);
            if (!box) continue;
            if (box.bottom > frame.bottom + 1 || box.left < frame.left - 1 || box.right > frame.right + 1) errors.push(`${target} exceeds frame`);
            if (overlaps(box, footer) || overlaps(box, save)) errors.push(`${target} overlaps footer`);
          }
          if (overlaps(rect('.elaborate-hud'), rect('.side-tools'))) errors.push('HUD overlaps tools');
          for (const target of ['.elaborate-crystal-tray', '.infusion-review', '.elaborate-source', '.infusion-editor', '.elaborate-title']) if (overlaps(rect(target), rect('.elaborate-dialogue'))) errors.push(`${target} overlaps dialogue`);
          for (const flask of document.querySelectorAll('.rune-flask')) {
            const box = flask.getBoundingClientRect();
            if (box.bottom > frame.bottom + 1 || box.left < frame.left - 1 || box.right > frame.right + 1) errors.push('Rune flask exceeds frame');
            if (overlaps(box, footer) || overlaps(box, save)) errors.push('Rune flask overlaps footer');
            if (overlaps(box, rect('.infusion-editor'))) errors.push('Editor overlaps rune flask');
            if (overlaps(box, rect('.rune-hint'))) errors.push('Rune flask overlaps hint');
          }
          if (document.documentElement.scrollWidth > innerWidth) errors.push('Horizontal page overflow');
          const input = rect('textarea'), editor = rect('.infusion-editor');
          if (input && editor && (input.right > editor.right + 1 || input.bottom > editor.bottom + 1)) errors.push('Editor input overflows panel');
          return errors;
        });
        const name = `${viewport.width}-${scenario}-${largeText ? 'large' : 'normal'}`;
        if (issues.length) { failures++; console.error(name, issues); } else console.log(`${name}: OK`);
        if (issues.length || viewport.width === 1440 || (viewport.width === 320 && largeText)) await page.screenshot({ path: `artifacts/stage5-layout/${name}.png`, animations: 'disabled', fullPage: true });
        await page.close();
      }
    }
  }
} finally { await browser.close(); }
if (failures) process.exitCode = 1;
