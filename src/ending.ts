export const MAX_REFLECTION_TEXT = 1200;

export type EndingProgress = {
  step: 'portal' | 'archive';
  reflection: string;
  completed: boolean;
};

export function newEndingProgress(): EndingProgress {
  return { step: 'portal', reflection: '', completed: false };
}

export function decodeEnding(value: unknown, challengeComplete: boolean): EndingProgress {
  const data = value && typeof value === 'object' ? value as Partial<EndingProgress> : {};
  return {
    step: challengeComplete && data.step === 'archive' ? 'archive' : 'portal',
    reflection: typeof data.reflection === 'string' ? data.reflection.slice(0, MAX_REFLECTION_TEXT) : '',
    completed: challengeComplete && data.completed === true,
  };
}

// Earlier edits reopen the ending, but never erase the learner's reflection.
export function reconcileEnding(progress: EndingProgress): EndingProgress {
  return { ...progress, step: 'portal', completed: false };
}

export function enterArchive(progress: EndingProgress, challengeComplete: boolean): EndingProgress {
  return challengeComplete ? { ...progress, step: 'archive', completed: true } : progress;
}
