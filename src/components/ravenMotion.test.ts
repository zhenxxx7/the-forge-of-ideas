import { describe, expect, it } from 'vitest';
import { dampPose, jawTip, SPEECH_DURATION, speechPose } from './ravenMotion';

describe('raven interpolation', () => {
  it('has continuous intermediate poses and comes to rest between phrases', () => {
    const poses = Array.from({ length: SPEECH_DURATION + 1 }, (_, time) => speechPose(time));
    expect(Math.min(...poses)).toBe(0);
    expect(Math.max(...poses)).toBe(1);
    expect(new Set(poses.map(pose => pose.toFixed(3))).size).toBeGreaterThan(200);
    expect(Math.max(...poses.slice(1).map((pose, index) => Math.abs(pose - poses[index])))).toBeLessThan(0.014);
    expect(speechPose(-1)).toBe(0);
    expect(speechPose(SPEECH_DURATION + 500)).toBe(0);
  });

  it('damps by elapsed time, not by display frame rate', () => {
    function simulate(fps: number) {
      let pose = 0;
      for (let frame = 0; frame < fps; frame++) pose = dampPose(pose, 19, 1000 / fps);
      return pose;
    }
    expect(simulate(30)).toBeCloseTo(simulate(60), 10);
    expect(simulate(60)).toBeCloseTo(simulate(120), 10);
  });

  it('closes from the current position on interruption without overshoot', () => {
    const pose = dampPose(17, 0, 1000 / 60);
    expect(pose).toBeGreaterThan(12);
    expect(pose).toBeLessThan(17);
    expect(dampPose(pose, 19, 1000 / 60)).toBeGreaterThan(pose);
    expect(dampPose(pose, 0, 0)).toBe(pose);
  });

  it('keeps the jaw tip on a constant-radius hinge', () => {
    const closed = jawTip(0);
    const opened = jawTip(19);
    expect(closed.x).toBeCloseTo(268.3);
    expect(closed.y).toBeCloseTo(91.5);
    expect(opened.y).toBeGreaterThan(closed.y);
    expect(Math.hypot(opened.x - 230.5, opened.y - 67)).toBeCloseTo(Math.hypot(closed.x - 230.5, closed.y - 67));
  });
});
