import type { IdeaId } from './stage2';
import { isIdeaId } from './stage3';
import type { SortAssignments } from './stage3';

export const CONNECT_DURATION_MS = 60 * 60 * 1000;
export const MAX_CONNECTION_TEXT = 600;
export type IdeaConnection = { main: IdeaId; supporting: IdeaId[]; explanation: string };
export type ConnectProgress = {
  step: 'intro' | 'combine' | 'explain' | 'review';
  mainIdea: IdeaId | null;
  supportingIdea: IdeaId | null;
  connections: IdeaConnection[];
  remainingMs: number;
  timerPaused: boolean;
  untimed: boolean;
  completed: boolean;
};

export function newConnectProgress(): ConnectProgress {
  return { step: 'intro', mainIdea: null, supportingIdea: null, connections: [], remainingMs: CONNECT_DURATION_MS, timerPaused: false, untimed: false, completed: false };
}

export function eligibleIdeas(ideas: readonly IdeaId[], assignments: SortAssignments) {
  return { central: ideas.filter(id => assignments[id] === 'central'), supporting: ideas.filter(id => assignments[id] === 'supporting') };
}

export function cleanConnectionText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, MAX_CONNECTION_TEXT) : '';
}

export function connectionIssue(connection: IdeaConnection, ideas: readonly IdeaId[], assignments: SortAssignments): string | null {
  const eligible = eligibleIdeas(ideas, assignments);
  if (!eligible.central.includes(connection.main) || connection.supporting.some(id => !eligible.supporting.includes(id))) return 'Sorting changed. Revisit Sort or revise this crystal.';
  if (!connection.supporting.length) return 'Add a supporting idea.';
  if (connection.supporting.length > 2 || new Set(connection.supporting).size !== connection.supporting.length || connection.supporting.includes(connection.main)) return 'Use one or two different supporting ideas.';
  if (!connection.explanation.trim()) return 'Add a connecting statement.';
  return null;
}

export function connectionsReady(progress: ConnectProgress, ideas: readonly IdeaId[], assignments: SortAssignments): boolean {
  return progress.connections.length > 0 && progress.connections.every(connection => !connectionIssue(connection, ideas, assignments));
}

export function decodeConnect(value: unknown, ideas: readonly IdeaId[], assignments: SortAssignments): ConnectProgress {
  const fresh = newConnectProgress();
  const data = value && typeof value === 'object' ? value as Partial<ConnectProgress> : fresh;
  const connections: IdeaConnection[] = [];
  // Keep authored notes for known ores even if the pouch or sorting has changed.
  // Invalidated connections remain visible for review instead of losing writing.
  for (const item of Array.isArray(data.connections) ? data.connections.slice(0, 32) : []) {
    if (!item || !isIdeaId(item.main) || connections.some(connection => connection.main === item.main)) continue;
    connections.push({ main: item.main, supporting: [...new Set((Array.isArray(item.supporting) ? item.supporting : []).filter((id): id is IdeaId => isIdeaId(id) && id !== item.main))].slice(0, 2), explanation: cleanConnectionText(item.explanation) });
  }
  const eligible = eligibleIdeas(ideas, assignments);
  const mainIdea = isIdeaId(data.mainIdea) && (eligible.central.includes(data.mainIdea) || connections.some(item => item.main === data.mainIdea)) ? data.mainIdea : null;
  const supportingIdea = isIdeaId(data.supportingIdea) && eligible.supporting.includes(data.supportingIdea) && data.supportingIdea !== mainIdea ? data.supportingIdea : null;
  const remainingMs = typeof data.remainingMs === 'number' && Number.isFinite(data.remainingMs) ? Math.max(0, Math.min(CONNECT_DURATION_MS, data.remainingMs)) : CONNECT_DURATION_MS;
  const untimed = data.untimed === true;
  let step = (['intro', 'combine', 'explain', 'review'] as unknown[]).includes(data.step) ? data.step! : fresh.step;
  if (step === 'explain' && !connections.some(item => item.main === mainIdea)) step = 'combine';
  if (remainingMs === 0 && !untimed && (step === 'combine' || step === 'explain')) step = 'review';
  const progress: ConnectProgress = { step, mainIdea, supportingIdea, connections, remainingMs, timerPaused: data.timerPaused === true, untimed, completed: false };
  return { ...progress, completed: data.completed === true && connectionsReady(progress, ideas, assignments) };
}

export function reconcileConnect(progress: ConnectProgress, ideas: readonly IdeaId[], assignments: SortAssignments): ConnectProgress {
  const synced = decodeConnect(progress, ideas, assignments);
  return { ...synced, completed: false, step: synced.connections.length ? 'review' : synced.step };
}

export function canForge(progress: ConnectProgress, ideas: readonly IdeaId[], assignments: SortAssignments): boolean {
  const eligible = eligibleIdeas(ideas, assignments);
  const existing = progress.connections.find(item => item.main === progress.mainIdea);
  return progress.step === 'combine' && !!progress.mainIdea && !!progress.supportingIdea
    && eligible.central.includes(progress.mainIdea) && eligible.supporting.includes(progress.supportingIdea)
    && progress.mainIdea !== progress.supportingIdea && (existing?.supporting.length ?? 0) < 2 && !existing?.supporting.includes(progress.supportingIdea);
}

export function forgeConnection(progress: ConnectProgress, ideas: readonly IdeaId[], assignments: SortAssignments): ConnectProgress {
  if (!canForge(progress, ideas, assignments)) return progress;
  const existing = progress.connections.find(item => item.main === progress.mainIdea);
  const connection: IdeaConnection = { main: progress.mainIdea!, supporting: [...(existing?.supporting ?? []), progress.supportingIdea!], explanation: existing?.explanation ?? '' };
  return { ...progress, step: 'explain', supportingIdea: null, completed: false, connections: existing ? progress.connections.map(item => item.main === connection.main ? connection : item) : [...progress.connections, connection] };
}

export function explainConnection(progress: ConnectProgress, main: IdeaId, text: string): ConnectProgress {
  if (progress.step !== 'explain') return progress;
  const connection = progress.connections.find(item => item.main === main);
  const explanation = cleanConnectionText(text);
  if (!connection || connection.explanation === explanation) return progress;
  return { ...progress, completed: false, connections: progress.connections.map(item => item.main === main ? { ...item, explanation } : item) };
}

export function removeSupportingIdea(progress: ConnectProgress, main: IdeaId, supporting: IdeaId): ConnectProgress {
  if (progress.step !== 'explain' || !progress.connections.some(item => item.main === main && item.supporting.includes(supporting))) return progress;
  return { ...progress, completed: false, connections: progress.connections.map(item => item.main === main ? { ...item, supporting: item.supporting.filter(id => id !== supporting) } : item) };
}

export function advanceConnectTimer(progress: ConnectProgress, elapsedMs: number): ConnectProgress {
  if (!['combine', 'explain'].includes(progress.step) || progress.timerPaused || progress.untimed || !Number.isFinite(elapsedMs) || elapsedMs <= 0) return progress;
  const remainingMs = Math.max(0, progress.remainingMs - elapsedMs);
  return { ...progress, remainingMs, step: remainingMs === 0 ? 'review' : progress.step };
}
