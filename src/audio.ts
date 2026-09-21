// Short, locally synthesized UI sounds. Audio starts only after an explicit user action.
let context: AudioContext | undefined;
let enabled = false;

export function setSound(value: boolean) { enabled = value; }

export function playSound(kind: 'click' | 'chime' = 'click') {
  if (!enabled || !('AudioContext' in window)) return;
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => undefined);
    const now = context.currentTime;
    const notes = kind === 'chime' ? [523.25, 659.25, 783.99] : [440];
    notes.forEach((frequency, index) => {
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      const start = now + index * 0.09;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(kind === 'chime' ? 0.035 : 0.024, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      oscillator.connect(gain).connect(context!.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.32);
    });
  } catch { /* Audio unavailable: the learning flow still works. */ }
}
