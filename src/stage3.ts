import { IDEA_PROMPTS } from './stage2';
import type { IdeaId } from './stage2';

export const SORT_DURATION_MS = 40 * 60 * 1000;
export const SORT_CATEGORIES = [
  { id: 'central', label: 'Central', description: 'Directly answers the question', guidance: 'A central idea helps explain how Bradbury creates tension in this moment. What detail in your extract could support it?', color: '#77dda0' },
  { id: 'supporting', label: 'Supporting', description: 'Develops a central idea', guidance: 'A supporting idea adds detail or context to a central idea. Consider which point it could develop.', color: '#efba64' },
  { id: 'irrelevant', label: 'Irrelevant', description: 'Does not help this response', guidance: 'An idea may be interesting without helping answer this particular question. You can set it aside without losing it.', color: '#74c9ed' },
] as const;
export type SortCategory = typeof SORT_CATEGORIES[number]['id'];
export type SortStep = 'intro' | 'sorting' | 'review';
export type SortAssignments = Partial<Record<IdeaId, SortCategory>>;
export type SortProgress = {
  step: SortStep;
  assignments: SortAssignments;
  activeIdea: IdeaId | null;
  remainingMs: number;
  timerPaused: boolean;
  untimed: boolean;
  completed: boolean;
};
export const isSortCategory = (value: unknown): value is SortCategory => SORT_CATEGORIES.some(category => category.id === value);
export const isIdeaId = (value: unknown): value is IdeaId => IDEA_PROMPTS.some(idea => idea.id === value);

export function newSortProgress(): SortProgress {
  return { step: 'intro', assignments: {}, activeIdea: null, remainingMs: SORT_DURATION_MS, timerPaused: false, untimed: false, completed: false };
}

export function allIdeasSorted(progress: SortProgress, ideas: readonly IdeaId[]): boolean {
  return ideas.length > 0 && ideas.every(id => isSortCategory(progress.assignments[id]));
}

export function decodeSort(value: unknown, ideas: readonly IdeaId[]): SortProgress {
  const fresh = newSortProgress();
  const data = value && typeof value === 'object' ? value as Partial<SortProgress> : fresh;
  const assignments: SortAssignments = {};
  for (const id of ideas) {
    const category = data.assignments?.[id];
    if (isSortCategory(category)) assignments[id] = category;
  }
  const remainingMs = typeof data.remainingMs === 'number' && Number.isFinite(data.remainingMs)
    ? Math.max(0, Math.min(SORT_DURATION_MS, data.remainingMs)) : SORT_DURATION_MS;
  const untimed = data.untimed === true;
  let step = (['intro', 'sorting', 'review'] as unknown[]).includes(data.step) ? data.step! : 'intro' as const;
  if (step === 'sorting' && remainingMs === 0 && !untimed) step = 'review';
  const progress: SortProgress = {
    step, assignments, remainingMs, untimed,
    activeIdea: data.activeIdea && ideas.includes(data.activeIdea) ? data.activeIdea : null,
    timerPaused: data.timerPaused === true, completed: false,
  };
  return { ...progress, completed: data.completed === true && allIdeasSorted(progress, ideas) };
}

// Pouch edits keep the classifications of retained ideas. Removed ideas no longer
// appear in sorting, and a changed collection must be reviewed again.
export function reconcileSort(progress: SortProgress, ideas: readonly IdeaId[]): SortProgress {
  const synced = decodeSort(progress, ideas);
  return { ...synced, completed: false, step: progress.step === 'intro' ? 'intro' : synced.remainingMs === 0 && !synced.untimed ? 'review' : 'sorting' };
}

export function assignIdea(progress: SortProgress, ideas: readonly IdeaId[], id: IdeaId, category: SortCategory | null): SortProgress {
  if (progress.step !== 'sorting' || !ideas.includes(id) || (category !== null && !isSortCategory(category))) return progress;
  if ((progress.assignments[id] ?? null) === category) return progress;
  const assignments = { ...progress.assignments };
  if (category) assignments[id] = category;
  else delete assignments[id];
  return { ...progress, assignments, completed: false, activeIdea: id };
}

export function advanceSortTimer(progress: SortProgress, elapsedMs: number): SortProgress {
  if (progress.step !== 'sorting' || progress.timerPaused || progress.untimed || !Number.isFinite(elapsedMs) || elapsedMs <= 0) return progress;
  const remainingMs = Math.max(0, progress.remainingMs - elapsedMs);
  return { ...progress, remainingMs, step: remainingMs === 0 ? 'review' : progress.step };
}
