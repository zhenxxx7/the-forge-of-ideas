import { describe, expect, it } from 'vitest';
import { decodeEnding, enterArchive, MAX_REFLECTION_TEXT, newEndingProgress, reconcileEnding } from './ending';
import { decodeSave, newSave } from './state';

function completedSave() {
  const save = newSave('Sean');
  save.completed = true;
  save.explored = ['how', 'moment', 'tense'];
  save.generate = { ...save.generate, step: 'collected', selected: ['setting', 'senses'], completed: true };
  save.sort = { ...save.sort, step: 'review', assignments: { setting: 'central', senses: 'supporting' }, completed: true };
  const connection = { main: 'setting' as const, supporting: ['senses' as const], explanation: 'Sensory details build tension.' };
  save.connect = { ...save.connect, step: 'review', connections: [connection], completed: true };
  save.elaborate = { ...save.elaborate, step: 'review', infusions: [{ main: 'setting', runes: ['evidence', 'effect'], response: 'My own literary response.', sourceFingerprint: JSON.stringify([connection.main, connection.supporting, connection.explanation]) }], completed: true };
  save.challenge = { ...save.challenge, step: 'won', used: ['setting'], hits: 1, completed: true };
  save.screen = 'ending';
  return save;
}

describe('Journey ending', () => {
  it('migrates an existing Stage 6 save without changing learner work', () => {
    const { ending: _ending, ...legacy } = completedSave();
    const save = decodeSave(JSON.stringify(legacy))!;
    expect(save.ending).toEqual(newEndingProgress());
    expect(save.screen).toBe('ending');
    expect(save.elaborate.infusions).toEqual(legacy.elaborate.infusions);
  });

  it('opens the archive only after a completed encounter', () => {
    const fresh = newEndingProgress();
    expect(enterArchive(fresh, false)).toBe(fresh);
    expect(enterArchive(fresh, true)).toEqual({ step: 'archive', reflection: '', completed: true });
    expect(decodeEnding({ step: 'archive', completed: true, reflection: 'Keep this thought.' }, false)).toEqual({ step: 'portal', completed: false, reflection: 'Keep this thought.' });
  });

  it('bounds malformed data and supports replaying the valley after completion', () => {
    expect(decodeEnding(null, true)).toEqual(newEndingProgress());
    expect(decodeEnding({ step: 'bogus', reflection: 43, completed: 'yes' }, true)).toEqual(newEndingProgress());
    expect(decodeEnding({ reflection: 'x'.repeat(5000) }, true).reflection).toHaveLength(MAX_REFLECTION_TEXT);
    const save = completedSave();
    save.ending = { step: 'portal', completed: true, reflection: 'Next time I will explain the effect.' };
    expect(decodeSave(JSON.stringify(save))?.ending).toEqual(save.ending);
  });

  it('routes to the first unfinished prerequisite and keeps the reflection', () => {
    for (const [stage, route] of [['generate', 'generate'], ['sort', 'sort'], ['connect', 'connect'], ['elaborate', 'elaborate'], ['challenge', 'challenge']] as const) {
      const save = completedSave();
      save.ending = { step: 'archive', completed: true, reflection: 'Evidence helps me explain.' };
      save[stage].completed = false;
      const decoded = decodeSave(JSON.stringify(save))!;
      expect(decoded.screen).toBe(route);
      expect(decoded.ending).toEqual({ step: 'portal', completed: false, reflection: save.ending.reflection });
      expect(decoded.elaborate.infusions[0].response).toBe('My own literary response.');
    }
  });

  it('reopens completion after revisions without clearing the reflection', () => {
    const ending = { step: 'archive' as const, completed: true, reflection: 'A saved thought.' };
    expect(reconcileEnding(ending)).toEqual({ step: 'portal', completed: false, reflection: 'A saved thought.' });
    expect(ending.completed).toBe(true);
  });
});
