import { useEffect, useId, useRef } from 'react';
import { dampPose, mouthShape, SPEECH_DURATION, speechPose } from './ravenMotion';

// Cuts follow the original feather line and lower mandible. All feathers come
// from raven.svg; the differently sized open-beak reference is not a frame.
const HEAD = 'M156 0H322V120H220L215 110L207 106L203 97L196 93L189 86L180 82L174 76L165 71L156 65Z';
const HEAD_CORE = 'M163 0H322V121H222V90L213 87L204 83L190 77L178 70L163 62Z';
const JAW = 'M226.267 63.531L231.424 65.133L234.776 66.987C246 72 259 81 268.55 90.519L268.55 92.7L267.539 92.469C264.728 88.589 257.384 85.37 252.544 83.109L238.604 76.596L236.447 75.997L236.873 75.417L234.574 74.012L228.662 70.304L227.82 69.869L230.464 69.144L229.089 67.526L228.96 66.525Z';

export function Raven({ speakingKey, reducedMotion, landing }: { speakingKey: string | null; reducedMotion: boolean; landing: boolean }) {
  const id = useId().replace(/:/g, '');
  const head = useRef<SVGGElement>(null);
  const jaw = useRef<SVGGElement>(null);
  const mouth = useRef<SVGPathElement>(null);
  const speechStarted = useRef<number | null>(null);
  const pose = useRef({ jaw: 0, head: 0 });

  useEffect(() => {
    speechStarted.current = speakingKey === null ? null : performance.now();
  }, [speakingKey]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let previous = performance.now();
    let idleTime = 0;
    let hiddenAt: number | null = null;

    function paint(jawAngle: number, headAngle: number) {
      head.current?.setAttribute('transform', `rotate(${headAngle.toFixed(3)} 193 96)`);
      jaw.current?.setAttribute('transform', `rotate(${jawAngle.toFixed(3)} 230.5 67)`);
      mouth.current?.setAttribute('d', mouthShape(jawAngle));
      mouth.current?.setAttribute('opacity', String(Math.min(1, jawAngle / 2)));
    }

    function tick(now: number) {
      // Clamp long stalls so the next painted pose cannot jump.
      const delta = Math.min(now - previous, 40);
      previous = now;
      idleTime += delta;
      const elapsed = speechStarted.current === null ? SPEECH_DURATION : now - speechStarted.current;
      const talking = elapsed >= 0 && elapsed < SPEECH_DURATION;
      const targetJaw = speechPose(elapsed) * 19;
      const targetHead = Math.sin(idleTime / 1000 * Math.PI / 2.8) * 0.65 - targetJaw * 0.045;
      pose.current.jaw = dampPose(pose.current.jaw, targetJaw, delta);
      pose.current.head = dampPose(pose.current.head, targetHead, delta, 180);
      if (!talking && pose.current.jaw < 0.01) pose.current.jaw = 0;
      paint(pose.current.jaw, pose.current.head);
      frame = requestAnimationFrame(tick);
    }

    function syncMotion() {
      cancelAnimationFrame(frame);
      const now = performance.now();
      if (reducedMotion || media.matches) {
        pose.current = { jaw: 0, head: 0 };
        paint(0, 0);
        return;
      }
      if (document.hidden) {
        hiddenAt ??= now;
        return;
      }
      // Hold the pose in hidden tabs, then continue without skipping frames.
      if (hiddenAt !== null && speechStarted.current !== null) speechStarted.current += now - hiddenAt;
      hiddenAt = null;
      previous = now;
      frame = requestAnimationFrame(tick);
    }

    syncMotion();
    media.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncMotion);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener('change', syncMotion);
      document.removeEventListener('visibilitychange', syncMotion);
    };
  }, [reducedMotion]);

  return <div className={`raven-character ${landing ? 'raven-landing' : 'raven-guide'}`} aria-hidden="true">
    <svg className="raven-rig" viewBox="0 0 322 280" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg" focusable="false">
      <defs>
        <image id={`${id}-art`} href="/assets/raven.svg" width="322" height="280" />
        <clipPath id={`${id}-head-cut`}><path d={HEAD} /></clipPath>
        <clipPath id={`${id}-jaw-cut`}><path d={JAW} /></clipPath>
        <linearGradient id={`${id}-neck-fade`} x1="0" y1="90" x2="0" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="white" /><stop offset="1" stopColor="black" />
        </linearGradient>
        <mask id={`${id}-body-mask`} x="0" y="0" width="322" height="280" maskUnits="userSpaceOnUse" style={{ maskType: 'luminance' }}>
          <rect width="322" height="280" fill="white" /><path d={HEAD_CORE} fill="black" />
        </mask>
        <mask id={`${id}-head-mask`} x="0" y="0" width="322" height="280" maskUnits="userSpaceOnUse" style={{ maskType: 'luminance' }}>
          <rect width="322" height="280" fill="white" />
          <rect width="222" height="280" fill={`url(#${id}-neck-fade)`} /><path d={JAW} fill="black" />
        </mask>
      </defs>
      <use className="raven-body" href={`#${id}-art`} mask={`url(#${id}-body-mask)`} />
      <g className="raven-head" ref={head}>
        <path className="raven-mouth" ref={mouth} fill="#160e14" opacity="0" />
        <g className="raven-jaw" ref={jaw}>
          <use href={`#${id}-art`} clipPath={`url(#${id}-jaw-cut)`} />
        </g>
        <g clipPath={`url(#${id}-head-cut)`}>
          <use href={`#${id}-art`} mask={`url(#${id}-head-mask)`} />
        </g>
      </g>
    </svg>
  </div>;
}
