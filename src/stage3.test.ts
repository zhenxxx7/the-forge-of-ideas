import { describe, expect, it } from 'vitest';
import { advanceSortTimer, allIdeasSorted, assignIdea, decodeSort, newSortProgress, reconcileSort, SORT_DURATION_MS } from './stage3';
import { decodeSave, newSave } from './state';
import { newGenerateProgress } from './stage2';
import type { IdeaId } from './stage2';

const ids: IdeaId[] = ['lifelike', 'setting', 'senses'];
const previousSave = { ...newSave('Sean'), screen: 'journey', completed: true, explored: ['how', 'moment', 'tense'], generate: { ...newGenerateProgress(), step: 'collected', completed: true, selected: ids } };

describe('Stage 3 sorting and migrations', () => {
  it('migrates a Stage 2 save while preserving its pouch and clock', () => {
    const { sort: _sort, ...legacy } = previousSave;
    const restored = decodeSave(JSON.stringify(legacy));
    expect(restored).toMatchObject(legacy);
    expect(restored?.sort).toEqual({ ...newSortProgress(), activeIdea: ids[0] });
  });

  it('requires completed Stage 2 and valid Stage 1 before resuming Sort', () => {
    expect(decodeSave(JSON.stringify({ ...previousSave, screen: 'sort', generate: { ...previousSave.generate, completed: false } }))?.screen).toBe('generate');
    expect(decodeSave(JSON.stringify({ ...previousSave, screen: 'sort', explored: [] }))?.screen).toBe('prepare');
  });

  it('accepts only current pouch IDs and valid categories', () => {
    expect(decodeSort({ assignments: { lifelike: 'central', setting: 'wrong', control: 'supporting', unknown: 'irrelevant' }, activeIdea: 'control', remainingMs: -1, step: 'sorting', completed: true, timerPaused: 'true' }, ids)).toEqual({ ...newSortProgress(), assignments: { lifelike: 'central' }, activeIdea: 'setting', remainingMs: 0, step: 'review' });
    expect(decodeSort({ remainingMs: Infinity }, []).remainingMs).toBe(SORT_DURATION_MS);
    expect(decodeSort({ remainingMs: 9e9, step: 'invalid' }, []).step).toBe('intro');
    expect(decodeSort({ remainingMs: 9e9 }, []).remainingMs).toBe(SORT_DURATION_MS);
  });

  it('moves an idea between categories without duplicating it and can unsort it', () => {
    const start = { ...newSortProgress(), step: 'sorting' as const };
    const central = assignIdea(start, ids, 'lifelike', 'central');
    const moved = assignIdea(central, ids, 'lifelike', 'irrelevant');
    expect(moved.assignments).toEqual({ lifelike: 'irrelevant' });
    expect(assignIdea(moved, ids, 'lifelike', null).assignments).toEqual({});
    expect(assignIdea(moved, ids, 'lifelike', 'irrelevant')).toBe(moved);
    expect(assignIdea(moved, ids, 'contrast', 'central')).toBe(moved);
    expect(assignIdea(newSortProgress(), ids, 'lifelike', 'central').assignments).toEqual({});
  });

  it('requires all collected ideas, but does not grade category choices', () => {
    expect(allIdeasSorted(newSortProgress(), [])).toBe(false);
    expect(allIdeasSorted({ ...newSortProgress(), assignments: { lifelike: 'central' } }, ids)).toBe(false);
    const sorted = ids.reduce<ReturnType<typeof newSortProgress>>((progress, id) => assignIdea(progress, ids, id, 'irrelevant'), { ...newSortProgress(), step: 'sorting' });
    expect(allIdeasSorted(sorted, ids)).toBe(true);
    expect(decodeSort({ ...sorted, completed: true }, ids).completed).toBe(true);
    expect(assignIdea({ ...sorted, completed: true }, ids, 'senses', 'central').completed).toBe(false);
  });

  it('invalidates completion on pouch edits while retaining surviving decisions', () => {
    const progress = { ...newSortProgress(), step: 'review' as const, assignments: { lifelike: 'central' as const, setting: 'supporting' as const }, completed: true, remainingMs: 12345 };
    const synced = reconcileSort(progress, ['setting', 'senses']);
    expect(synced).toMatchObject({ completed: false, step: 'sorting', assignments: { setting: 'supporting' }, remainingMs: 12345 });
    expect(synced.activeIdea).toBe('senses');
    expect(reconcileSort(progress, []).assignments).toEqual({});
  });

  it('keeps sorting work in an in-progress Generate save, but not its completion', () => {
    const save = { ...previousSave, generate: { ...previousSave.generate, completed: false }, sort: { ...newSortProgress(), assignments: { lifelike: 'central' }, completed: true } };
    expect(decodeSave(JSON.stringify(save))?.sort).toMatchObject({ assignments: { lifelike: 'central' }, completed: false });
  });

  it('pauses safely, expires to review, and preserves partial assignments', () => {
    const progress = { ...newSortProgress(), step: 'sorting' as const, remainingMs: 900, assignments: { lifelike: 'supporting' as const } };
    expect(advanceSortTimer(progress, 300).remainingMs).toBe(600);
    expect(advanceSortTimer(progress, 1500)).toMatchObject({ remainingMs: 0, step: 'review', completed: false, assignments: progress.assignments });
    for (const state of [{ ...progress, timerPaused: true }, { ...progress, untimed: true }, { ...progress, step: 'intro' as const }]) expect(advanceSortTimer(state, 5000)).toBe(state);
    for (const time of [NaN, Infinity, -10]) expect(advanceSortTimer(progress, time)).toBe(progress);
    expect(decodeSort({ ...progress, remainingMs: 0, untimed: true }, ids).step).toBe('sorting');
  });
});
