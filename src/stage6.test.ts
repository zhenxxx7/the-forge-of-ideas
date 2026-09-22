import { describe, expect, it } from 'vitest';
import type { IdeaId } from './stage2';
import type { SortAssignments } from './stage3';
import type { ConnectProgress } from './stage4';
import { sourceFingerprint } from './stage5';
import type { ElaborateProgress } from './stage5';
import { aimHits, clampAim, decodeChallenge, launchInfusion, newChallengeProgress, readyInfusions, reconcileChallenge, selectInfusion, targetHits } from './stage6';
import { decodeSave, newSave } from './state';

const ideas: IdeaId[] = ['setting', 'senses', 'uncertainty', 'reactions', 'control', 'pace'];
const assignments: SortAssignments = { setting: 'central', senses: 'supporting', uncertainty: 'central', reactions: 'supporting', control: 'central', pace: 'supporting' };
const connections = [
  { main: 'setting' as const, supporting: ['senses' as const], explanation: 'The room feels unsafe.' },
  { main: 'uncertainty' as const, supporting: ['reactions' as const], explanation: 'Reactions build suspense.' },
  { main: 'control' as const, supporting: ['pace' as const], explanation: 'Pacing limits certainty.' },
];
const connect: ConnectProgress = { step: 'review', mainIdea: null, supportingIdea: null, connections, remainingMs: 10_000, timerPaused: true, untimed: false, completed: true };
const elaborate: ElaborateProgress = { step: 'review', activeMain: null, infusions: connections.map(connection => ({ main: connection.main, runes: ['evidence', 'effect'], response: 'I would use a precise detail from the classroom extract to show how tension builds.', sourceFingerprint: sourceFingerprint(connection) })), remainingMs: 10_000, timerPaused: true, untimed: false, completed: true };

describe('Stage 6 encounter', () => {
  it('migrates Stage 5 saves additively and gates Stage 6', () => {
    const { challenge: _challenge, ...legacy } = { ...newSave('Sean'), screen: 'journey', explored: ['how', 'moment', 'tense'], completed: true, generate: { step: 'collected', selected: ideas, completed: true }, sort: { step: 'review', assignments, completed: true }, connect, elaborate };
    expect(decodeSave(JSON.stringify(legacy))?.challenge).toEqual(newChallengeProgress());
    expect(decodeSave(JSON.stringify({ ...legacy, screen: 'challenge' }))?.screen).toBe('challenge');
    expect(decodeSave(JSON.stringify({ ...legacy, screen: 'challenge', elaborate: { ...elaborate, completed: false } }))?.screen).toBe('elaborate');
    expect(decodeSave(JSON.stringify({ ...legacy, screen: 'challenge', connect: { ...connect, completed: false } }))?.screen).toBe('connect');
  });

  it('uses only ready authored infusions and never treats text as a score', () => {
    const available = readyInfusions(elaborate, connect, ideas, assignments);
    expect(available).toHaveLength(3);
    expect(readyInfusions(elaborate, connect, ['setting', 'senses'], assignments)).toHaveLength(1);
    expect(targetHits(1)).toBe(1); expect(targetHits(3)).toBe(2);
    expect(aimHits(50)).toBe(true); expect(aimHits(72)).toBe(false);
    expect(clampAim(-500)).toBe(0); expect(clampAim(500)).toBe(100); expect(clampAim(NaN)).toBe(72);
    expect(selectInfusion({ ...newChallengeProgress(), step: 'aim' }, 'lifelike', available)).toMatchObject({ selected: null });
    expect(launchInfusion({ ...newChallengeProgress(), step: 'aim' }, available)).toMatchObject({ hits: 0, used: [] });
  });

  it('resolves actual aim, misses and retryable loss without consuming writing', () => {
    const available = readyInfusions(elaborate, connect, ideas, assignments);
    let progress = selectInfusion({ ...newChallengeProgress(), step: 'aim', aim: 72 }, 'setting', available);
    progress = launchInfusion(progress, available);
    expect(progress).toMatchObject({ step: 'aim', used: ['setting'], hits: 0, confusion: 1, lastOutcome: 'miss', completed: false });
    progress = launchInfusion(selectInfusion({ ...progress, aim: 50 }, 'uncertainty', available), available);
    expect(progress).toMatchObject({ step: 'aim', hits: 1, confusion: 1 });
    progress = launchInfusion(selectInfusion(progress, 'control', available), available);
    expect(progress).toMatchObject({ step: 'won', hits: 2, completed: true });
    expect(elaborate.infusions[0].response).toContain('classroom extract');
    const onlyOne = available.slice(0, 1);
    const lost = launchInfusion(selectInfusion({ ...newChallengeProgress(), step: 'aim' }, 'setting', onlyOne), onlyOne);
    expect(lost).toMatchObject({ step: 'lost', hits: 0, confusion: 1, completed: false });
    expect(reconcileChallenge(lost)).toMatchObject({ step: 'intro', used: [], aim: 72 });
  });

  it('bounds tampered saves and invalidates a victory after upstream changes', () => {
    const malformed = decodeChallenge({ step: 'won', selected: 'bogus', used: ['setting', 'setting', 'bogus'], aim: Infinity, hits: 100, confusion: 100, lastOutcome: 'magic', completed: true }, elaborate, connect, ideas, assignments);
    expect(malformed).toMatchObject({ step: 'intro', selected: null, used: ['setting'], aim: 72, hits: 1, confusion: 0, lastOutcome: null, completed: false });
    const available = readyInfusions(elaborate, connect, ideas, assignments);
    let won = selectInfusion({ ...newChallengeProgress(), step: 'aim', aim: 50 }, 'setting', available);
    won = launchInfusion(won, available);
    won = launchInfusion(selectInfusion(won, 'uncertainty', available), available);
    expect(decodeChallenge(won, elaborate, connect, ideas, assignments).completed).toBe(true);
    expect(decodeChallenge(won, { ...elaborate, completed: false }, connect, ideas, assignments).completed).toBe(false);
    expect(reconcileChallenge(won).completed).toBe(false);
  });
});
