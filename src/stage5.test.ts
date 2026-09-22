import { describe, expect, it } from 'vitest';
import type { IdeaId } from './stage2';
import type { SortAssignments } from './stage3';
import type { ConnectProgress } from './stage4';
import { advanceElaborateTimer, chooseCrystal, cleanInfusionText, decodeElaborate, eligibleCrystals, ELABORATE_DURATION_MS, infusionIssue, infusionsReady, MAX_INFUSION_TEXT, newElaborateProgress, reconcileElaborate, refreshInfusionSource, sourceFingerprint, toggleRune, writeInfusion } from './stage5';
import type { ElaborateProgress } from './stage5';
import { decodeSave, newSave } from './state';

const ideas: IdeaId[] = ['setting', 'senses', 'reactions', 'uncertainty'];
const assignments: SortAssignments = { setting: 'central', senses: 'supporting', reactions: 'supporting', uncertainty: 'central' };
const connect: ConnectProgress = {
  step: 'review', mainIdea: null, supportingIdea: null, connections: [
    { main: 'setting', supporting: ['senses'], explanation: 'The sensory details make the setting threatening.' },
    { main: 'uncertainty', supporting: ['reactions'], explanation: 'The reactions leave the outcome unclear.' },
  ], remainingMs: 1000, timerPaused: false, untimed: false, completed: true,
};
const writing = 'The precise detail in the classroom extract makes the room feel less safe. Its effect leaves the reader expecting a threat.';
const baseSave = { ...newSave('Sean'), screen: 'journey', explored: ['how', 'moment', 'tense'], completed: true, generate: { step: 'collected', selected: ideas, completed: true }, sort: { step: 'review', assignments, completed: true }, connect };

function written(): ElaborateProgress {
  let progress = chooseCrystal({ ...newElaborateProgress(), step: 'choose' }, 'setting', connect, ideas, assignments);
  progress = toggleRune(toggleRune(progress, 'evidence'), 'effect');
  return writeInfusion(progress, writing);
}

describe('Stage 5 elaboration', () => {
  it('migrates earlier saves and gates Stage 5 behind a completed Stage 4', () => {
    const { elaborate: _elaborate, ...legacy } = baseSave;
    expect(decodeSave(JSON.stringify(legacy))?.elaborate).toEqual(newElaborateProgress());
    expect(decodeSave(JSON.stringify({ ...legacy, screen: 'elaborate' }))?.screen).toBe('elaborate');
    expect(decodeSave(JSON.stringify({ ...legacy, screen: 'elaborate', connect: { ...connect, completed: false } }))?.screen).toBe('connect');
    expect(decodeSave(JSON.stringify({ ...legacy, screen: 'elaborate', sort: { ...legacy.sort, completed: false } }))?.screen).toBe('sort');
  });

  it('offers only ready connection crystals; supports rune and writing edits without grading', () => {
    expect(eligibleCrystals(connect, ideas, assignments)).toHaveLength(2);
    expect(chooseCrystal({ ...newElaborateProgress(), step: 'choose' }, 'senses', connect, ideas, assignments)).toMatchObject({ activeMain: null, infusions: [] });
    let progress = chooseCrystal({ ...newElaborateProgress(), step: 'choose' }, 'setting', connect, ideas, assignments);
    expect(progress).toMatchObject({ step: 'develop', activeMain: 'setting' });
    expect(infusionIssue(progress.infusions[0], connect, ideas, assignments)).toBe('Choose at least two rune flasks.');
    progress = toggleRune(progress, 'evidence');
    expect(infusionIssue(progress.infusions[0], connect, ideas, assignments)).toBe('Choose at least two rune flasks.');
    progress = toggleRune(progress, 'effect');
    expect(infusionIssue(progress.infusions[0], connect, ideas, assignments)).toBe('Write an elaborated response.');
    progress = writeInfusion(progress, writing);
    expect(infusionIssue(progress.infusions[0], connect, ideas, assignments)).toBeNull();
    expect(infusionsReady(progress, connect, ideas, assignments)).toBe(true);
    progress = toggleRune(progress, 'effect');
    expect(infusionsReady(progress, connect, ideas, assignments)).toBe(false);
    expect(cleanInfusionText(42)).toBe('');
    expect(cleanInfusionText('\u0000' + 'x'.repeat(MAX_INFUSION_TEXT + 10))).toHaveLength(MAX_INFUSION_TEXT);
  });

  it('preserves drafts through upstream edits and requires explicit source refresh', () => {
    const completed = { ...written(), step: 'review' as const, completed: true };
    const changedConnect = { ...connect, connections: [{ ...connect.connections[0], explanation: 'Revised my connecting statement.' }, connect.connections[1]] };
    const reconciled = reconcileElaborate(completed, changedConnect, ideas, assignments);
    expect(reconciled.infusions[0].response).toBe(writing);
    expect(reconciled.completed).toBe(false);
    expect(infusionIssue(reconciled.infusions[0], changedConnect, ideas, assignments)).toMatch(/refresh/);
    const editing = chooseCrystal(reconciled, 'setting', changedConnect, ideas, assignments);
    const refreshed = refreshInfusionSource(editing, changedConnect, ideas, assignments);
    expect(refreshed.infusions[0].response).toBe(writing);
    expect(refreshed.infusions[0].sourceFingerprint).toBe(sourceFingerprint(changedConnect.connections[0]));
    expect(infusionsReady(refreshed, changedConnect, ideas, assignments)).toBe(true);
    const removed = reconcileElaborate(completed, { ...connect, connections: [connect.connections[1]] }, ideas, assignments);
    expect(removed.infusions[0].response).toBe(writing);
    expect(infusionIssue(removed.infusions[0], connect, ['uncertainty', 'reactions'], assignments)).toMatch(/no longer ready/);
  });

  it('sanitizes saved data, validates completion and retains writing across reload', () => {
    const draft = written();
    const loaded = decodeSave(JSON.stringify({ ...baseSave, screen: 'elaborate', elaborate: { ...draft, completed: true } }));
    expect(loaded?.screen).toBe('elaborate');
    expect(loaded?.elaborate.completed).toBe(true);
    expect(loaded?.elaborate.infusions[0].response).toBe(writing);
    const malformed = decodeElaborate({ step: 'develop', activeMain: 'bogus', remainingMs: Infinity, timerPaused: 'yes', completed: true, infusions: [null, { main: 'bogus' }, { main: 'setting', runes: ['evidence', 'evidence', 'nonsense'], response: '\u0000' + 'z'.repeat(2000), sourceFingerprint: 'wrong' }, { main: 'setting', response: 'duplicate' }] }, connect, ideas, assignments);
    expect(malformed).toMatchObject({ step: 'choose', activeMain: null, remainingMs: ELABORATE_DURATION_MS, timerPaused: false, completed: false });
    expect(malformed.infusions).toHaveLength(1);
    expect(malformed.infusions[0]).toMatchObject({ runes: ['evidence'], sourceFingerprint: 'wrong' });
    expect(malformed.infusions[0].response).toHaveLength(MAX_INFUSION_TEXT);
    expect(decodeElaborate({ ...draft, infusions: [...draft.infusions, { ...draft.infusions[0], main: 'uncertainty', runes: [] }], completed: true }, connect, ideas, assignments).completed).toBe(false);
  });

  it('times only active work and preserves drafts at expiry', () => {
    const draft = written();
    expect(advanceElaborateTimer({ ...draft, remainingMs: 1000 }, 250).remainingMs).toBe(750);
    expect(advanceElaborateTimer({ ...draft, remainingMs: 1000 }, 5000)).toMatchObject({ step: 'review', remainingMs: 0, infusions: draft.infusions });
    for (const state of [{ ...draft, timerPaused: true }, { ...draft, untimed: true }, { ...draft, step: 'intro' as const }, { ...draft, step: 'review' as const }]) expect(advanceElaborateTimer(state, 1000)).toBe(state);
    for (const elapsed of [NaN, Infinity, 0, -10]) expect(advanceElaborateTimer(draft, elapsed)).toBe(draft);
  });
});
