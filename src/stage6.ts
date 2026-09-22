import type { IdeaId } from './stage2';
import { isIdeaId } from './stage3';
import type { SortAssignments } from './stage3';
import type { ConnectProgress } from './stage4';
import { infusionIssue } from './stage5';
import type { ElaborateProgress, Infusion } from './stage5';

export const MAX_CONFUSION = 3;
export const HIT_AIM_MIN = 43;
export const HIT_AIM_MAX = 57;
export type ChallengeProgress = {
  step: 'intro' | 'instructions' | 'aim' | 'won' | 'lost';
  selected: IdeaId | null;
  used: IdeaId[];
  aim: number;
  hits: number;
  confusion: number;
  lastOutcome: 'hit' | 'miss' | null;
  completed: boolean;
};

export function newChallengeProgress(): ChallengeProgress {
  return { step: 'intro', selected: null, used: [], aim: 72, hits: 0, confusion: 0, lastOutcome: null, completed: false };
}

export function readyInfusions(elaborate: ElaborateProgress, connect: ConnectProgress, ideas: readonly IdeaId[], assignments: SortAssignments): Infusion[] {
  return elaborate.infusions.filter(infusion => !infusionIssue(infusion, connect, ideas, assignments));
}

export const targetHits = (count: number): number => Math.min(2, Math.max(1, count));
export const aimHits = (aim: number): boolean => Number.isFinite(aim) && aim >= HIT_AIM_MIN && aim <= HIT_AIM_MAX;
export const clampAim = (aim: number): number => Number.isFinite(aim) ? Math.max(0, Math.min(100, Math.round(aim))) : 72;

export function selectInfusion(progress: ChallengeProgress, main: IdeaId, available: readonly Infusion[]): ChallengeProgress {
  if (progress.step !== 'aim' || progress.used.includes(main) || !available.some(infusion => infusion.main === main)) return progress;
  return { ...progress, selected: main };
}

export function launchInfusion(progress: ChallengeProgress, available: readonly Infusion[]): ChallengeProgress {
  if (progress.step !== 'aim' || !progress.selected || progress.used.includes(progress.selected) || !available.some(infusion => infusion.main === progress.selected)) return progress;
  const hit = aimHits(progress.aim);
  const used = [...progress.used, progress.selected];
  const hits = progress.hits + (hit ? 1 : 0);
  const confusion = progress.confusion + (hit ? 0 : 1);
  const won = hits >= targetHits(available.length);
  const lost = !won && (confusion >= MAX_CONFUSION || hits + available.length - used.length < targetHits(available.length));
  return { ...progress, step: won ? 'won' : lost ? 'lost' : 'aim', selected: null, used, hits, confusion, lastOutcome: hit ? 'hit' : 'miss', completed: won };
}

export function decodeChallenge(value: unknown, elaborate: ElaborateProgress, connect: ConnectProgress, ideas: readonly IdeaId[], assignments: SortAssignments): ChallengeProgress {
  const fresh = newChallengeProgress();
  const data = value && typeof value === 'object' ? value as Partial<ChallengeProgress> : fresh;
  const available = readyInfusions(elaborate, connect, ideas, assignments);
  const used = [...new Set((Array.isArray(data.used) ? data.used : []).filter(isIdeaId))].filter(id => available.some(infusion => infusion.main === id));
  const selected = isIdeaId(data.selected) && !used.includes(data.selected) && available.some(infusion => infusion.main === data.selected) ? data.selected : null;
  const hits = Number.isInteger(data.hits) ? Math.max(0, Math.min(used.length, data.hits!)) : 0;
  const confusion = Number.isInteger(data.confusion) ? Math.max(0, Math.min(MAX_CONFUSION, used.length - hits, data.confusion!)) : 0;
  const step = (['intro', 'instructions', 'aim', 'won', 'lost'] as unknown[]).includes(data.step) ? data.step! : fresh.step;
  const completed = data.completed === true && step === 'won' && elaborate.completed && hits >= targetHits(available.length);
  return { step: completed ? 'won' : step === 'won' ? 'intro' : step, selected, used, aim: clampAim(data.aim ?? fresh.aim), hits, confusion, lastOutcome: data.lastOutcome === 'hit' || data.lastOutcome === 'miss' ? data.lastOutcome : null, completed };
}

export function reconcileChallenge(progress: ChallengeProgress): ChallengeProgress {
  return { ...newChallengeProgress(), aim: progress.aim };
}
