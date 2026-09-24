import { describe, expect, it } from 'vitest';
import { cleanName, decodeSave, newSave } from './state';

describe('save validation', () => {
  it('recovers from broken, missing and incompatible saves', () => {
    for (const raw of [null, 'bad json', '{}', 'null', '{"version":2}']) expect(decodeSave(raw)).toBeNull();
  });
  it('preserves valid progress without duplicating keyword discoveries', () => {
    const save = { ...newSave('Sean'), explored: ['how', 'how', 'tense', 'invalid'], prologueIndex: 99 };
    expect(decodeSave(JSON.stringify(save))).toMatchObject({ name: 'Sean', explored: ['how', 'tense'], prologueIndex: 2 });
  });
  it('does not unlock the map from incomplete or tampered progress', () => {
    expect(decodeSave(JSON.stringify({ ...newSave('Sean'), screen: 'journey', completed: true }))).toMatchObject({ screen: 'prepare', completed: false });
    expect(decodeSave(JSON.stringify({ ...newSave('Sean'), screen: 'stage2' }))).toBeNull();
  });
  it('migrates older journey recaps and clamps invalid recap indices', () => {
    const old = { ...newSave('Sean'), screen: 'journey', completed: true, explored: ['how', 'moment', 'tense'], generate: { step: 'collected', selected: ['lifelike'], completed: true } };
    const { journeyStage: _removed, ...legacy } = old;
    expect(decodeSave(JSON.stringify(legacy))?.journeyStage).toBe(2);
    expect(decodeSave(JSON.stringify({ ...old, journeyStage: 99 }))?.journeyStage).toBe(6);
    expect(decodeSave(JSON.stringify({ ...old, journeyStage: -4 }))?.journeyStage).toBe(1);
  });
  it('normalizes names without treating them as HTML', () => {
    expect(cleanName('  Sean   Lee\n ')).toBe('Sean Lee');
    expect(cleanName('x'.repeat(50))).toHaveLength(24);
    expect(newSave('Séan 李').name).toBe('Séan 李');
    expect(newSave('<img src=x>').name).toBe('<img src=x>');
  });
});
