export const SPEECH_DURATION = 3400;

// A phrase with rests between syllables. Smooth curves supply the in-between
// poses; we never swap drawings or advance by a fixed frame count.
const syllables = [
  [120, 440, 0.85], [500, 760, 0.57], [820, 1170, 1],
  [1400, 1720, 0.73], [1830, 2140, 0.92],
  [2380, 2670, 0.62], [2740, 3160, 0.84],
] as const;

export function speechPose(elapsed: number): number {
  for (const [start, end, strength] of syllables) {
    if (elapsed >= start && elapsed <= end) {
      const progress = (elapsed - start) / (end - start);
      return strength * Math.sin(Math.PI * progress) ** 2;
    }
  }
  return 0;
}

// Time-based damping responds consistently on 60/90/120 Hz displays and eases
// from the current pose when dialogue changes in the middle of a syllable.
export function dampPose(current: number, target: number, deltaMs: number, responseMs = 58): number {
  return target + (current - target) * Math.exp(-Math.max(0, deltaMs) / responseMs);
}

export function jawTip(angle: number) {
  const radians = angle * Math.PI / 180;
  const x = 268.3 - 230.5;
  const y = 91.5 - 67;
  return {
    x: 230.5 + x * Math.cos(radians) - y * Math.sin(radians),
    y: 67 + x * Math.sin(radians) + y * Math.cos(radians),
  };
}

export function mouthShape(angle: number): string {
  const tip = jawTip(angle);
  // The mouth membrane ends halfway along the bill. The outer opening stays
  // transparent, so opening the jaw does not look like stretching a solid beak.
  const x = 230.5 + (tip.x - 230.5) * 0.53;
  const y = 67 + (tip.y - 67) * 0.53;
  return `M230.5 67Q241 72 250.534 79.985L${x.toFixed(3)} ${y.toFixed(3)}Q236 77 230.5 67Z`;
}
