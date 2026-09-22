import { describe, expect, it } from 'vitest';
import { advanceConnectTimer, canForge, cleanConnectionText, connectionIssue, connectionsReady, CONNECT_DURATION_MS, decodeConnect, eligibleIdeas, explainConnection, forgeConnection, MAX_CONNECTION_TEXT, newConnectProgress, reconcileConnect, removeSupportingIdea } from './stage4';
import type { ConnectProgress } from './stage4';
import type { SortAssignments } from './stage3';
import type { IdeaId } from './stage2';
import { decodeSave, newSave } from './state';

const ideas: IdeaId[] = ['setting', 'senses', 'reactions', 'lifelike', 'uncertainty', 'pace'];
const assignments: SortAssignments = { setting: 'central', senses: 'supporting', reactions: 'supporting', lifelike: 'irrelevant', uncertainty: 'central', pace: 'supporting' };
const combine: ConnectProgress = { ...newConnectProgress(), step: 'combine', mainIdea: 'setting', supportingIdea: 'senses' };
const explained: ConnectProgress = { ...forgeConnection(combine, ideas, assignments), connections: [{ main: 'setting', supporting: ['senses'], explanation: 'The details make the setting feel threatening.' }] };
const previous = { ...newSave('Sean'), screen: 'journey', explored: ['how', 'moment', 'tense'], completed: true, generate: { step: 'collected', selected: ideas, completed: true }, sort: { step: 'review', assignments, completed: true } };

describe('Stage 4 connections and persistence', () => {
  it('migrates legacy saves additively and respects every prerequisite', () => {
    const { connect: _connect, ...legacy } = previous;
    expect(decodeSave(JSON.stringify(legacy))).toMatchObject({ ...legacy, connect: newConnectProgress() });
    expect(decodeSave(JSON.stringify({ ...previous, screen: 'connect' }))?.screen).toBe('connect');
    expect(decodeSave(JSON.stringify({ ...previous, screen: 'connect', sort: { ...previous.sort, completed: false } }))?.screen).toBe('sort');
    expect(decodeSave(JSON.stringify({ ...previous, screen: 'connect', generate: { ...previous.generate, completed: false } }))?.screen).toBe('generate');
    const invalid = decodeSave(JSON.stringify({ ...previous, screen: 'connect', explored: [], connect: { ...explained, completed: true } }));
    expect(invalid?.screen).toBe('prepare');
    expect(invalid?.connect.connections).toEqual(explained.connections);
    expect(invalid?.connect.completed).toBe(false);
  });

  it('uses only currently collected central and supporting ideas', () => {
    expect(eligibleIdeas(ideas, assignments)).toEqual({ central: ['setting', 'uncertainty'], supporting: ['senses', 'reactions', 'pace'] });
    for (const invalid of [{ ...combine, mainIdea: 'lifelike' as const }, { ...combine, supportingIdea: 'setting' as const }, { ...combine, supportingIdea: null }, { ...combine, step: 'intro' as const }]) expect(forgeConnection(invalid, ideas, assignments)).toBe(invalid);
    expect(canForge(combine, ['setting'], assignments)).toBe(false);
    expect(canForge(combine, ideas, assignments)).toBe(true);
  });

  it('keeps one crystal per central idea and at most two distinct supports', () => {
    const first = forgeConnection(combine, ideas, assignments);
    expect(first).toMatchObject({ step: 'explain', supportingIdea: null, connections: [{ main: 'setting', supporting: ['senses'], explanation: '' }] });
    const duplicate = { ...explained, step: 'combine' as const, supportingIdea: 'senses' as const };
    expect(canForge(duplicate, ideas, assignments)).toBe(false);
    const second = forgeConnection({ ...duplicate, supportingIdea: 'reactions' }, ideas, assignments);
    expect(second.connections).toEqual([{ ...explained.connections[0], supporting: ['senses', 'reactions'] }]);
    expect(canForge({ ...second, step: 'combine', supportingIdea: 'pace' }, ideas, assignments)).toBe(false);
    const another = forgeConnection({ ...second, step: 'combine', mainIdea: 'uncertainty', supportingIdea: 'senses' }, ideas, assignments);
    expect(another.connections).toHaveLength(2);
    expect(another.connections[1].supporting).toEqual(['senses']);
  });

  it('requires written statements for every saved crystal without semantic grading', () => {
    expect(connectionsReady(newConnectProgress(), ideas, assignments)).toBe(false);
    expect(connectionsReady(forgeConnection(combine, ideas, assignments), ideas, assignments)).toBe(false);
    expect(connectionIssue({ ...explained.connections[0], explanation: ' \n\t ' }, ideas, assignments)).toBe('Add a connecting statement.');
    const written = explainConnection(explained, 'setting', ' My own interpretation\nwith another line. ');
    expect(connectionsReady(written, ideas, assignments)).toBe(true);
    expect(written.connections[0].explanation).toBe(' My own interpretation\nwith another line. ');
    expect(explainConnection({ ...written, completed: true }, 'setting', '').completed).toBe(false);
    const draft = forgeConnection({ ...written, step: 'combine', mainIdea: 'uncertainty', supportingIdea: 'senses' }, ideas, assignments);
    expect(connectionsReady(draft, ideas, assignments)).toBe(false);
  });

  it('disconnects support without dropping authored statements', () => {
    const changed = removeSupportingIdea({ ...explained, completed: true }, 'setting', 'senses');
    expect(changed.connections).toEqual([{ ...explained.connections[0], supporting: [] }]);
    expect(changed.completed).toBe(false);
    expect(connectionIssue(changed.connections[0], ideas, assignments)).toBe('Add a supporting idea.');
    expect(removeSupportingIdea(changed, 'setting', 'reactions')).toBe(changed);
  });

  it('preserves stale connections after pouch or sorting edits and invalidates completion', () => {
    const changed = reconcileConnect({ ...explained, completed: true }, ['setting', 'reactions'], { setting: 'supporting', reactions: 'central' });
    expect(changed).toMatchObject({ completed: false, step: 'review', connections: explained.connections });
    expect(connectionIssue(changed.connections[0], ['setting', 'reactions'], assignments)).toMatch(/Sorting changed/);
    const restored = decodeSave(JSON.stringify({ ...previous, generate: { ...previous.generate, completed: false }, connect: { ...explained, completed: true } }));
    expect(restored?.connect.connections).toEqual(explained.connections);
    expect(restored?.connect.completed).toBe(false);
  });

  it('sanitizes malformed saved fields, bounds content, and never trusts a completion flag', () => {
    const result = decodeConnect({ step: 'explain', mainIdea: 'unknown', supportingIdea: 'lifelike', completed: true, timerPaused: 'true', remainingMs: Infinity, connections: [null, { main: 'unknown' }, { main: 'setting', supporting: ['setting', 'senses', 'senses', 'reactions', 'pace', 'unknown'], explanation: '\u0000' + 'a'.repeat(900) }, { main: 'setting', explanation: 'duplicate' }] }, ideas, assignments);
    expect(result).toMatchObject({ step: 'combine', mainIdea: null, supportingIdea: null, remainingMs: CONNECT_DURATION_MS, timerPaused: false });
    expect(result.connections).toHaveLength(1);
    expect(result.connections[0].supporting).toEqual(['senses', 'reactions']);
    expect(result.connections[0].explanation).toHaveLength(MAX_CONNECTION_TEXT);
    expect(cleanConnectionText(1)).toBe('');
    expect(decodeConnect({ completed: true }, ideas, assignments).completed).toBe(false);
    expect(decodeConnect({ ...explained, remainingMs: -1 }, ideas, assignments).step).toBe('review');
    expect(decodeConnect({ ...explained, remainingMs: 0, untimed: true }, ideas, assignments).step).toBe('explain');
    expect(decodeConnect({ remainingMs: 1e10 }, ideas, assignments).remainingMs).toBe(CONNECT_DURATION_MS);
  });

  it('times only active combining and explaining, and preserves all work on expiry', () => {
    for (const progress of [combine, explained]) {
      expect(advanceConnectTimer({ ...progress, remainingMs: 1000 }, 250).remainingMs).toBe(750);
      expect(advanceConnectTimer({ ...progress, remainingMs: 1000 }, 5000)).toMatchObject({ step: 'review', remainingMs: 0, connections: progress.connections });
    }
    for (const progress of [{ ...explained, timerPaused: true }, { ...explained, untimed: true }, { ...explained, step: 'intro' as const }, { ...explained, step: 'review' as const }]) expect(advanceConnectTimer(progress, 9000)).toBe(progress);
    for (const elapsed of [NaN, Infinity, 0, -20]) expect(advanceConnectTimer(explained, elapsed)).toBe(explained);
  });
});
