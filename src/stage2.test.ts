import { describe, expect, it } from 'vitest';
import { advanceGenerateTimer, decodeGenerate, formatGenerateTime, GENERATE_DURATION_MS, IDEA_PROMPTS, newGenerateProgress, toggleIdea } from './stage2';
import { decodeSave, newSave } from './state';

describe('Stage 2 state and migration', () => {
  it('adds Stage 2 to an existing Stage 1 save without losing progress', () => {
    const original = { version: 1, name: 'Sean', screen: 'journey', prologueIndex: 2, explored: ['how', 'moment', 'tense'], completed: true };
    const migrated = decodeSave(JSON.stringify(original));
    expect(migrated).toMatchObject(original);
    expect(migrated?.generate).toEqual(newGenerateProgress());
  });

  it('does not unlock Generate with incomplete Stage 1 progress', () => {
    const save = { ...newSave('Sean'), screen: 'generate', generate: { ...newGenerateProgress(), selected: ['lifelike'], completed: true } };
    expect(decodeSave(JSON.stringify(save))).toMatchObject({ screen: 'prepare', completed: false, generate: newGenerateProgress() });
  });

  it('validates saved ideas, timer bounds, flags and active prompt', () => {
    expect(decodeGenerate({ step: 'bogus', selected: ['lifelike', 'lifelike', 'bad', {}, null], activeIdea: 'bad', remainingMs: -200, completed: true, timerPaused: 'true' })).toEqual({
      ...newGenerateProgress(), selected: ['lifelike'], remainingMs: 0, completed: true,
    });
    expect(decodeGenerate({ remainingMs: Infinity, selected: {}, completed: true })).toEqual(newGenerateProgress());
    expect(decodeGenerate({ remainingMs: GENERATE_DURATION_MS * 5 }).remainingMs).toBe(GENERATE_DURATION_MS);
    expect(decodeGenerate({ step: 'explore', remainingMs: 0 }).step).toBe('collected');
    expect(decodeGenerate({ step: 'explore', remainingMs: 0, untimed: true }).step).toBe('explore');
  });

  it('allows collecting, removing and revisiting without duplicate ores', () => {
    const progress = { ...newGenerateProgress(), step: 'explore' as const };
    const collected = toggleIdea(progress, 'lifelike');
    expect(collected.selected).toEqual(['lifelike']);
    expect(toggleIdea(collected, 'lifelike').selected).toEqual([]);
    expect(toggleIdea({ ...collected, completed: true }, 'setting').completed).toBe(false);
    expect(toggleIdea({ ...collected, step: 'collected' }, 'setting').selected).toEqual(['lifelike']);
    const full = IDEA_PROMPTS.reduce((state, idea) => toggleIdea(state, idea.id), progress as ReturnType<typeof newGenerateProgress>);
    expect(full.selected).toHaveLength(8);
  });

  it('uses elapsed time, pauses safely, and preserves ideas on expiry', () => {
    const progress = { ...newGenerateProgress(), step: 'explore' as const, selected: ['lifelike' as const], remainingMs: 1500 };
    expect(advanceGenerateTimer(progress, 400)).toMatchObject({ remainingMs: 1100, step: 'explore' });
    expect(advanceGenerateTimer(progress, 2000)).toMatchObject({ remainingMs: 0, step: 'collected', selected: ['lifelike'], completed: false });
    for (const changed of [{ ...progress, timerPaused: true }, { ...progress, untimed: true }, { ...progress, step: 'intro' as const }]) expect(advanceGenerateTimer(changed, 1000)).toBe(changed);
    for (const elapsed of [-1, NaN, Infinity]) expect(advanceGenerateTimer(progress, elapsed)).toBe(progress);
  });

  it('formats real time without negative values or early zeroes', () => {
    expect(formatGenerateTime(GENERATE_DURATION_MS)).toBe('60:00');
    expect(formatGenerateTime(3252000)).toBe('54:12');
    expect(formatGenerateTime(1)).toBe('00:01');
    expect(formatGenerateTime(-1000)).toBe('00:00');
  });
});
