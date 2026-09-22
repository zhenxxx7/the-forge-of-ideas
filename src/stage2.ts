export const GENERATE_DURATION_MS = 60 * 60 * 1000;

// The first prompt is visible in the supplied mockup. The others are editable
// starter ideas, not quotations from or an answer key for the literary extract.
export const IDEA_PROMPTS = [
  { id: 'lifelike', label: 'Lifelike AI', text: 'AI is becoming more lifelike.', source: 'Mockup idea', prompt: 'Could this connection help you think about the boundary between something imagined and something real? Check it against your extract.' },
  { id: 'setting', label: 'The setting', text: 'A place that should feel safe can become unsettling.', source: 'Starter idea', prompt: 'Look again at the setting. What makes the place seem safe, strange, or threatening? Gather an idea before deciding how useful it is.' },
  { id: 'senses', label: 'Sensory detail', text: 'Vivid sensory details can make danger feel close.', source: 'Starter idea', prompt: 'Look for details of sight, sound, smell, or touch. Could any of them make the moment feel more immediate?' },
  { id: 'reactions', label: 'Reactions', text: 'A character’s reaction can reveal fear before danger is explained.', source: 'Starter idea', prompt: 'Notice what characters say and do. What might their reactions suggest to a reader?' },
  { id: 'uncertainty', label: 'Uncertainty', text: 'Not knowing what will happen next can create suspense.', source: 'Starter idea', prompt: 'What is still uncertain in this moment? Consider what the reader knows, suspects, or has yet to discover.' },
  { id: 'pace', label: 'Pace', text: 'Changes in pace can make a reader pause or feel rushed.', source: 'Starter idea', prompt: 'Explore sentence lengths, pauses, and the order in which details appear. Keep any possible connections for now.' },
  { id: 'control', label: 'Control', text: 'Technology can change the balance of control in a family.', source: 'Starter idea', prompt: 'This is a broad thematic connection. Could it connect to a particular detail, or might it lead you away from the question?' },
  { id: 'contrast', label: 'Contrast', text: 'A contrast between ordinary life and danger can feel disturbing.', source: 'Starter idea', prompt: 'Look for contrasting details or expectations. You can gather this idea now and evaluate its relevance later.' },
] as const;

export type IdeaId = typeof IDEA_PROMPTS[number]['id'];
export type GenerateStep = 'entrance' | 'intro' | 'explore' | 'collected';
export type GenerateProgress = {
  step: GenerateStep;
  selected: IdeaId[];
  activeIdea: IdeaId;
  remainingMs: number;
  timerPaused: boolean;
  untimed: boolean;
  completed: boolean;
};

const isIdea = (value: unknown): value is IdeaId => IDEA_PROMPTS.some(idea => idea.id === value);

export function newGenerateProgress(): GenerateProgress {
  return { step: 'entrance', selected: [], activeIdea: 'lifelike', remainingMs: GENERATE_DURATION_MS, timerPaused: false, untimed: false, completed: false };
}

export function decodeGenerate(value: unknown): GenerateProgress {
  const fresh = newGenerateProgress();
  if (!value || typeof value !== 'object') return fresh;
  const data = value as Partial<GenerateProgress>;
  const selected = [...new Set((Array.isArray(data.selected) ? data.selected : []).filter(isIdea))];
  const remainingMs = typeof data.remainingMs === 'number' && Number.isFinite(data.remainingMs)
    ? Math.max(0, Math.min(GENERATE_DURATION_MS, data.remainingMs)) : GENERATE_DURATION_MS;
  const untimed = data.untimed === true;
  let step = (['entrance', 'intro', 'explore', 'collected'] as unknown[]).includes(data.step) ? data.step! : fresh.step;
  if (step === 'explore' && remainingMs === 0 && !untimed) step = 'collected';
  return {
    step, selected, remainingMs, untimed,
    activeIdea: isIdea(data.activeIdea) ? data.activeIdea : fresh.activeIdea,
    timerPaused: data.timerPaused === true,
    completed: data.completed === true && selected.length > 0,
  };
}

export function toggleIdea(progress: GenerateProgress, id: IdeaId): GenerateProgress {
  if (progress.step !== 'explore') return progress;
  return {
    ...progress, completed: false,
    selected: progress.selected.includes(id) ? progress.selected.filter(value => value !== id) : [...progress.selected, id],
  };
}

export function advanceGenerateTimer(progress: GenerateProgress, deltaMs: number): GenerateProgress {
  if (progress.step !== 'explore' || progress.timerPaused || progress.untimed || !Number.isFinite(deltaMs) || deltaMs <= 0) return progress;
  const remainingMs = Math.max(0, progress.remainingMs - deltaMs);
  return { ...progress, remainingMs, step: remainingMs === 0 ? 'collected' : progress.step };
}

export function formatGenerateTime(remainingMs: number): string {
  const seconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
