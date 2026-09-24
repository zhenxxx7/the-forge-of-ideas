import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { newSave } from '../../src/state';

async function enterPrologue(page: Page, reducedMotion = false) {
  await page.addInitScript((reduce: boolean) => {
    localStorage.setItem('forge-of-ideas:settings:v1', JSON.stringify({
      sound: false,
      reducedMotion: reduce,
      largeText: false,
    }));
  }, reducedMotion);
  await page.goto('/');
  const skip = page.getByRole('button', { name: 'Skip intro' });
  if (await skip.isVisible()) await skip.click();
  await page.getByRole('button', { name: 'Begin the journey', exact: true }).click();
  await page.getByLabel('Your name', { exact: true }).fill('Ava');
  await page.getByRole('button', { name: 'Yes', exact: true }).click();
  await expect(page.locator('.screen-prologue .dialogue-scroll')).toBeVisible();
}

test('parchment opens from center; rolls separate before ink appears', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await enterPrologue(page);
  await expect(page.locator('.screen-prologue .scroll-paper')).toHaveCSS('background-image', /forge-dialogue-parchment\.webp/);

  const motion = await page.locator('.screen-prologue .dialogue-scroll').evaluate(section => {
    const paper = section.querySelector<HTMLElement>('.scroll-paper')!;
    const leftRoll = section.querySelector<HTMLElement>('.roll-left')!;
    const rightRoll = section.querySelector<HTMLElement>('.roll-right')!;
    const content = section.querySelector<HTMLElement>('.dialogue-content')!;
    const elements = [paper, leftRoll, rightRoll, content];
    const animations = elements.map(element => element.getAnimations()[0]);
    if (animations.some(animation => !animation?.effect)) throw new Error('Missing parchment animation');

    const timing = animations.map(animation => {
      const { delay, duration } = animation.effect!.getTiming();
      return { delay: Number(delay), duration: Number(duration) };
    });
    animations.forEach(animation => animation.pause());

    function insetSides(value: string) {
      const match = /^inset\(([^)]+)\)/.exec(value);
      if (!match) throw new Error(`Expected inset clip-path; received ${value}`);
      const parts = match[1].trim().split(/\s+/).map(parseFloat);
      return { right: parts.length > 1 ? parts[1] : parts[0], left: parts.length > 3 ? parts[3] : parts.length > 1 ? parts[1] : parts[0] };
    }

    function sample(time: number) {
      animations.forEach(animation => { animation.currentTime = time; });
      const frame = section.getBoundingClientRect();
      const normalizedCenter = (element: Element) => {
        const rect = element.getBoundingClientRect();
        return ((rect.left + rect.right) / 2 - frame.left) / frame.width;
      };
      return {
        paper: insetSides(getComputedStyle(paper).clipPath),
        leftRoll: normalizedCenter(leftRoll),
        rightRoll: normalizedCenter(rightRoll),
        leftRollOpacity: Number(getComputedStyle(leftRoll).opacity),
        rightRollOpacity: Number(getComputedStyle(rightRoll).opacity),
        inkOpacity: Number(getComputedStyle(content).opacity),
      };
    }

    const [paperTiming, , , inkTiming] = timing;
    const initial = sample(0);
    const middle = sample(paperTiming.delay + paperTiming.duration / 2);
    const complete = sample(Math.max(...timing.map(({ delay, duration }) => delay + duration)) + 1);
    return { initial, middle, complete, paperTiming, inkTiming };
  });

  expect(motion.paperTiming.duration).toBeGreaterThan(0);
  expect(motion.inkTiming.delay).toBeGreaterThanOrEqual(motion.paperTiming.delay + motion.paperTiming.duration);
  expect(motion.initial.paper.left).toBeGreaterThan(35);
  expect(Math.abs(motion.initial.paper.left - motion.initial.paper.right)).toBeLessThan(1);
  expect(motion.middle.paper.left).toBeLessThan(motion.initial.paper.left);
  expect(motion.middle.paper.left).toBeGreaterThan(motion.complete.paper.left);
  expect(motion.complete.paper.left).toBeLessThan(1);
  expect(motion.complete.paper.right).toBeLessThan(1);

  expect(Math.abs(motion.initial.leftRoll - .5)).toBeLessThan(.1);
  expect(Math.abs(motion.initial.rightRoll - .5)).toBeLessThan(.1);
  expect(motion.middle.leftRoll).toBeLessThan(motion.initial.leftRoll - .1);
  expect(motion.middle.rightRoll).toBeGreaterThan(motion.initial.rightRoll + .1);
  expect(motion.complete.leftRoll).toBeLessThan(motion.middle.leftRoll);
  expect(motion.complete.rightRoll).toBeGreaterThan(motion.middle.rightRoll);
  expect(motion.complete.leftRollOpacity).toBe(0);
  expect(motion.complete.rightRollOpacity).toBe(0);

  expect(motion.initial.inkOpacity).toBe(0);
  expect(motion.middle.inkOpacity).toBe(0);
  expect(motion.complete.inkOpacity).toBe(1);
});

test('entering next scene starts a fresh parchment opening', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await enterPrologue(page);
  const firstScroll = await page.locator('.screen-prologue .dialogue-scroll').elementHandle();

  await page.getByRole('button', { name: 'Start Stage 1', exact: true }).click();
  const nextScroll = page.locator('.screen-prepare .dialogue-scroll');
  await expect(nextScroll).toBeVisible();
  expect(await firstScroll!.evaluate(element => element.isConnected)).toBe(false);
  const animation = await nextScroll.locator('.scroll-paper').evaluate(element => {
    const effect = element.getAnimations()[0]?.effect;
    return effect?.getTiming().duration;
  });
  expect(Number(animation)).toBeGreaterThan(0);
});

test('Stage 5 keeps its rolls hidden in the intro and reveals ink only after the chamber scroll opens', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    localStorage.setItem('forge-of-ideas:settings:v1', JSON.stringify({ sound: false, reducedMotion: false, largeText: false }));
    localStorage.setItem('forge-of-ideas:progress:v1', JSON.stringify({
      version: 1, name: 'Sean', screen: 'journey', prologueIndex: 2,
      explored: ['how', 'moment', 'tense'], completed: true,
      generate: { step: 'collected', selected: ['setting', 'senses', 'reactions', 'uncertainty'], completed: true },
      sort: { step: 'review', assignments: { setting: 'central', senses: 'supporting', reactions: 'supporting', uncertainty: 'central' }, completed: true },
      connect: { step: 'review', connections: [{ main: 'setting', supporting: ['senses'], explanation: 'The sensory details make the setting feel threatening.' }], completed: true, remainingMs: 60000, timerPaused: false, untimed: false },
    }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue your journey', exact: true }).click();
  await page.getByRole('button', { name: 'Open Elaborate', exact: true }).click();

  const intro = page.locator('.elaborate-phase-intro .elaborate-dialogue');
  await expect(intro.locator('.scroll-paper, .scroll-roll')).toHaveCount(3);
  for (const part of await intro.locator('.scroll-paper, .scroll-roll').all()) {
    await expect(part).toHaveCSS('display', 'none');
  }
  const introElement = await intro.elementHandle();

  await page.getByRole('button', { name: 'Enter the elaborating chamber', exact: true }).click();
  const opened = page.locator('.elaborate-phase-choose .elaborate-dialogue');
  await expect(opened).toBeVisible();
  expect(await introElement!.evaluate(element => element.isConnected)).toBe(false);

  const reveal = await opened.evaluate(section => {
    const paper = section.querySelector<HTMLElement>('.scroll-paper')!;
    const content = section.querySelector<HTMLElement>('.dialogue-content')!;
    const paperAnimation = paper.getAnimations()[0];
    const inkAnimation = content.getAnimations()[0];
    if (!paperAnimation?.effect || !inkAnimation?.effect) throw new Error('Stage 5 parchment animation did not restart');
    paperAnimation.pause();
    inkAnimation.pause();
    const paperDuration = Number(paperAnimation.effect.getTiming().duration);
    const inkDelay = Number(inkAnimation.effect.getTiming().delay);
    const inkDuration = Number(inkAnimation.effect.getTiming().duration);
    const sample = (time: number) => {
      paperAnimation.currentTime = time;
      inkAnimation.currentTime = time;
      return { clip: getComputedStyle(paper).clipPath, ink: Number(getComputedStyle(content).opacity) };
    };
    return {
      paperDuration, inkDelay,
      start: sample(0), opening: sample(paperDuration / 2),
      complete: sample(inkDelay + inkDuration + 1),
    };
  });

  expect(reveal.inkDelay).toBeGreaterThanOrEqual(reveal.paperDuration);
  expect(reveal.start.clip).toContain('48.4%');
  expect(reveal.opening.clip).not.toBe(reveal.start.clip);
  expect(reveal.start.ink).toBe(0);
  expect(reveal.opening.ink).toBe(0);
  expect(reveal.complete.ink).toBe(1);
});

for (const preference of ['game setting', 'system preference'] as const) {
  test(`${preference}: parchment and text appear fully open without waiting`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: preference === 'system preference' ? 'reduce' : 'no-preference' });
    await enterPrologue(page, preference === 'game setting');

    const state = await page.locator('.screen-prologue .dialogue-scroll').evaluate(section => {
      const paper = section.querySelector<HTMLElement>('.scroll-paper')!;
      const left = section.querySelector<HTMLElement>('.roll-left')!.getBoundingClientRect();
      const right = section.querySelector<HTMLElement>('.roll-right')!.getBoundingClientRect();
      const content = section.querySelector<HTMLElement>('.dialogue-content')!;
      const frame = section.getBoundingClientRect();
      return {
        paperClip: getComputedStyle(paper).clipPath,
        paperAnimation: getComputedStyle(paper).animationName,
        contentOpacity: Number(getComputedStyle(content).opacity),
        contentAnimation: getComputedStyle(content).animationName,
        leftCenter: ((left.left + left.right) / 2 - frame.left) / frame.width,
        rightCenter: ((right.left + right.right) / 2 - frame.left) / frame.width,
      };
    });

    expect(state.paperAnimation).toBe('none');
    expect(state.contentAnimation).toBe('none');
    expect(state.paperClip).toBe('none');
    expect(state.contentOpacity).toBe(1);
    expect(state.leftCenter).toBeLessThan(.1);
    expect(state.rightCenter).toBeGreaterThan(.9);
    await expect(page.locator('.screen-prologue .dialogue-copy')).not.toBeEmpty();
  });
}

test('prologue navigation clears parchment rolls and stays in frame', async ({ page }) => {
  await enterPrologue(page, true);

  const layout = await page.locator('.screen-prologue .dialogue-scroll').evaluate(scroll => {
    const frame = scroll.closest<HTMLElement>('.game-frame');
    const paper = scroll.querySelector<HTMLElement>('.scroll-paper');
    const rightRoll = scroll.querySelector<HTMLElement>('.roll-right');
    const navigation = scroll.querySelector<HTMLElement>('.dialogue-navigation');
    if (!frame || !paper || !rightRoll || !navigation) throw new Error('Missing prologue parchment controls');

    const rect = (element: Element) => {
      const { left, right, top, bottom } = element.getBoundingClientRect();
      return { left, right, top, bottom };
    };
    return {
      frame: rect(frame),
      paper: rect(paper),
      rightRoll: rect(rightRoll),
      navigation: rect(navigation),
      buttons: [...navigation.querySelectorAll('button')].map(rect),
      viewportBottom: innerHeight,
    };
  });

  expect(layout.buttons).toHaveLength(2);
  const targets = [layout.navigation, ...layout.buttons];
  const overlaps = (a: typeof layout.frame, b: typeof layout.frame) =>
    Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);

  for (const target of targets) {
    expect(target.left).toBeGreaterThanOrEqual(layout.frame.left);
    expect(target.right).toBeLessThanOrEqual(layout.frame.right);
    expect(target.top).toBeGreaterThanOrEqual(layout.frame.top);
    expect(target.bottom).toBeLessThanOrEqual(layout.frame.bottom);
    expect(target.bottom).toBeLessThanOrEqual(layout.viewportBottom);
    expect(overlaps(target, layout.paper)).toBe(false);
    expect(overlaps(target, layout.rightRoll)).toBe(false);
  }
});

test('stage navigation shares one baseline after parchment animation', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const save = newSave('Ava');
  save.screen = 'generate';
  save.completed = true;
  save.explored = ['how', 'moment', 'tense'];
  save.generate.step = 'entrance';
  await page.addInitScript(seed => {
    localStorage.setItem('forge-of-ideas:progress:v1', JSON.stringify(seed));
    localStorage.setItem('forge-of-ideas:settings:v1', JSON.stringify({ sound: false, reducedMotion: false, largeText: false }));
  }, save);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue your journey', exact: true }).click();

  async function checkNavigation() {
    const dialogue = page.locator('.generate-dialogue');
    await dialogue.locator('.dialogue-content').evaluate(async element => {
      await Promise.all(element.getAnimations().map(animation => animation.finished));
    });
    const layout = await dialogue.evaluate(section => {
      const frame = section.closest<HTMLElement>('.game-frame')!;
      const paper = section.querySelector<HTMLElement>('.scroll-paper')!;
      const previous = section.querySelector<HTMLElement>('.dialogue-navigation .round-button')!;
      const next = section.querySelector<HTMLElement>('.gold-button')!;
      const rect = (element: Element) => {
        const { left, right, top, bottom } = element.getBoundingClientRect();
        return { left, right, top, bottom };
      };
      return { frame: rect(frame), paper: rect(paper), previous: rect(previous), next: rect(next), viewportBottom: innerHeight };
    });
    const overlaps = (a: typeof layout.paper, b: typeof layout.paper) =>
      Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
    expect(Math.abs(layout.previous.top - layout.next.top)).toBeLessThanOrEqual(2);
    expect(layout.next.left - layout.previous.right).toBeGreaterThanOrEqual(6);
    for (const button of [layout.previous, layout.next]) {
      expect(button.right).toBeLessThanOrEqual(layout.frame.right);
      expect(button.bottom).toBeLessThanOrEqual(layout.frame.bottom);
      expect(button.bottom).toBeLessThanOrEqual(layout.viewportBottom);
      expect(overlaps(button, layout.paper)).toBe(false);
    }
  }

  await checkNavigation();
  if (testInfo.project.name === 'desktop') {
    const previous = page.getByRole('button', { name: 'Previous', exact: true });
    const tooltip = previous.locator('.button-tooltip');
    await previous.hover();
    await expect(tooltip).toBeVisible();
    await expect.poll(async () => {
      const buttonBox = await previous.boundingBox();
      const tooltipBox = await tooltip.boundingBox();
      return Math.abs(buttonBox!.x + buttonBox!.width / 2 - tooltipBox!.x - tooltipBox!.width / 2);
    }).toBeLessThan(3);
  }
  await page.getByRole('button', { name: 'Enter the Forge', exact: true }).click();
  await checkNavigation();
});
