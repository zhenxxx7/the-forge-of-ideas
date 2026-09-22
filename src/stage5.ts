import type { IdeaId } from './stage2';
import { isIdeaId } from './stage3';
import type { SortAssignments } from './stage3';
import { connectionIssue } from './stage4';
import type { ConnectProgress, IdeaConnection } from './stage4';

export const ELABORATE_DURATION_MS = 40 * 60 * 1000;
export const MAX_INFUSION_TEXT = 1600;
export const RUNES = [
  { id: 'evidence', label: 'Evidence', cue: 'Choose an exact detail from your classroom extract. Do not invent a quotation.', color: '#a767df', glyph: '◇' },
  { id: 'language', label: 'Language', cue: 'Explore a particular word, image, or sound and what it suggests.', color: '#6886f0', glyph: '⌁' },
  { id: 'structure', label: 'Structure', cue: 'Consider order, pace, pauses, or a shift in the moment.', color: '#81daf0', glyph: '⌘' },
  { id: 'inference', label: 'Inference', cue: 'Explain what a detail leads you to think or anticipate.', color: '#e1bf60', glyph: '✧' },
  { id: 'effect', label: 'Effect', cue: 'Describe how the writer makes the reader feel, and why.', color: '#8bcf87', glyph: '✦' },
  { id: 'focus', label: 'Question', cue: 'Link your explanation back to how this moment becomes tense.', color: '#e9976f', glyph: '↗' },
] as const;
export type RuneId = typeof RUNES[number]['id'];
export type Infusion = { main: IdeaId; runes: RuneId[]; response: string; sourceFingerprint: string };
export type ElaborateProgress = {
  step: 'intro' | 'choose' | 'develop' | 'review';
  activeMain: IdeaId | null;
  infusions: Infusion[];
  remainingMs: number;
  timerPaused: boolean;
  untimed: boolean;
  completed: boolean;
};

export const isRuneId = (value: unknown): value is RuneId => RUNES.some(rune => rune.id === value);
export const cleanInfusionText = (value: unknown): string => typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, MAX_INFUSION_TEXT) : '';
export const sourceFingerprint = (connection: IdeaConnection): string => JSON.stringify([connection.main, connection.supporting, connection.explanation]);

export function newElaborateProgress(): ElaborateProgress {
  return { step: 'intro', activeMain: null, infusions: [], remainingMs: ELABORATE_DURATION_MS, timerPaused: false, untimed: false, completed: false };
}

export function eligibleCrystals(connect: ConnectProgress, ideas: readonly IdeaId[], assignments: SortAssignments): IdeaConnection[] {
  return connect.connections.filter(connection => !connectionIssue(connection, ideas, assignments));
}

export function infusionIssue(infusion: Infusion, connect: ConnectProgress, ideas: readonly IdeaId[], assignments: SortAssignments): string | null {
  const source = connect.connections.find(connection => connection.main === infusion.main);
  if (!source || connectionIssue(source, ideas, assignments)) return 'Crystal changed or is no longer ready. Review Stage 4.';
  if (infusion.sourceFingerprint !== sourceFingerprint(source)) return 'Crystal changed. Review its connection, then refresh this infusion.';
  if (infusion.runes.length < 2) return 'Choose at least two rune flasks.';
  if (!infusion.response.trim()) return 'Write an elaborated response.';
  return null;
}

export function infusionsReady(progress: ElaborateProgress, connect: ConnectProgress, ideas: readonly IdeaId[], assignments: SortAssignments): boolean {
  return progress.infusions.length > 0 && progress.infusions.every(infusion => !infusionIssue(infusion, connect, ideas, assignments));
}

export function decodeElaborate(value: unknown, connect: ConnectProgress, ideas: readonly IdeaId[], assignments: SortAssignments): ElaborateProgress {
  const fresh = newElaborateProgress();
  const data = value && typeof value === 'object' ? value as Partial<ElaborateProgress> : fresh;
  const infusions: Infusion[] = [];
  for (const item of Array.isArray(data.infusions) ? data.infusions.slice(0, 32) : []) {
    if (!item || !isIdeaId(item.main) || infusions.some(infusion => infusion.main === item.main)) continue;
    infusions.push({
      main: item.main,
      runes: [...new Set((Array.isArray(item.runes) ? item.runes : []).filter(isRuneId))],
      response: cleanInfusionText(item.response),
      sourceFingerprint: typeof item.sourceFingerprint === 'string' ? item.sourceFingerprint.slice(0, 1000) : '',
    });
  }
  const eligible = eligibleCrystals(connect, ideas, assignments);
  const activeMain = isIdeaId(data.activeMain) && (eligible.some(item => item.main === data.activeMain) || infusions.some(item => item.main === data.activeMain)) ? data.activeMain : null;
  const remainingMs = typeof data.remainingMs === 'number' && Number.isFinite(data.remainingMs) ? Math.max(0, Math.min(ELABORATE_DURATION_MS, data.remainingMs)) : ELABORATE_DURATION_MS;
  const untimed = data.untimed === true;
  let step = (['intro', 'choose', 'develop', 'review'] as unknown[]).includes(data.step) ? data.step! : fresh.step;
  if (step === 'develop' && !infusions.some(item => item.main === activeMain)) step = 'choose';
  if (remainingMs === 0 && !untimed && (step === 'choose' || step === 'develop')) step = 'review';
  const progress: ElaborateProgress = { step, activeMain, infusions, remainingMs, timerPaused: data.timerPaused === true, untimed, completed: false };
  return { ...progress, completed: data.completed === true && infusionsReady(progress, connect, ideas, assignments) };
}

export function reconcileElaborate(progress: ElaborateProgress, connect: ConnectProgress, ideas: readonly IdeaId[], assignments: SortAssignments): ElaborateProgress {
  const synced = decodeElaborate(progress, connect, ideas, assignments);
  return { ...synced, completed: false, step: synced.infusions.length ? 'review' : synced.step };
}

export function chooseCrystal(progress: ElaborateProgress, main: IdeaId, connect: ConnectProgress, ideas: readonly IdeaId[], assignments: SortAssignments): ElaborateProgress {
  const source = eligibleCrystals(connect, ideas, assignments).find(connection => connection.main === main);
  if (!source || (progress.step !== 'choose' && progress.step !== 'review')) return progress;
  const exists = progress.infusions.some(infusion => infusion.main === main);
  return {
    ...progress, step: 'develop', activeMain: main, completed: false,
    infusions: exists ? progress.infusions : [...progress.infusions, { main, runes: [], response: '', sourceFingerprint: sourceFingerprint(source) }],
  };
}

export function toggleRune(progress: ElaborateProgress, rune: RuneId): ElaborateProgress {
  if (progress.step !== 'develop' || !isRuneId(rune) || !progress.activeMain) return progress;
  return { ...progress, completed: false, infusions: progress.infusions.map(infusion => infusion.main === progress.activeMain ? { ...infusion, runes: infusion.runes.includes(rune) ? infusion.runes.filter(id => id !== rune) : [...infusion.runes, rune] } : infusion) };
}

export function writeInfusion(progress: ElaborateProgress, text: string): ElaborateProgress {
  if (progress.step !== 'develop' || !progress.activeMain) return progress;
  const response = cleanInfusionText(text);
  if (progress.infusions.find(infusion => infusion.main === progress.activeMain)?.response === response) return progress;
  return { ...progress, completed: false, infusions: progress.infusions.map(infusion => infusion.main === progress.activeMain ? { ...infusion, response } : infusion) };
}

export function refreshInfusionSource(progress: ElaborateProgress, connect: ConnectProgress, ideas: readonly IdeaId[], assignments: SortAssignments): ElaborateProgress {
  if (progress.step !== 'develop' || !progress.activeMain) return progress;
  const source = eligibleCrystals(connect, ideas, assignments).find(connection => connection.main === progress.activeMain);
  if (!source) return progress;
  return { ...progress, completed: false, infusions: progress.infusions.map(infusion => infusion.main === progress.activeMain ? { ...infusion, sourceFingerprint: sourceFingerprint(source) } : infusion) };
}

export function advanceElaborateTimer(progress: ElaborateProgress, elapsedMs: number): ElaborateProgress {
  if (!['choose', 'develop'].includes(progress.step) || progress.timerPaused || progress.untimed || !Number.isFinite(elapsedMs) || elapsedMs <= 0) return progress;
  const remainingMs = Math.max(0, progress.remainingMs - elapsedMs);
  return { ...progress, remainingMs, step: remainingMs === 0 ? 'review' : progress.step };
}
