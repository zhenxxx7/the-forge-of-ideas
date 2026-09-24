import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { dampPose, mouthShape, SPEECH_DURATION, speechPose } from './ravenMotion';
import './ravenFlight.css';

// Cuts follow the original feather line and lower mandible. All feathers come
// from raven.svg; the differently sized open-beak reference is not a frame.
const HEAD = 'M156 0H322V120H220L215 110L207 106L203 97L196 93L189 86L180 82L174 76L165 71L156 65Z';
const HEAD_CORE = 'M163 0H322V121H222V90L213 87L204 83L190 77L178 70L163 62Z';
const JAW = 'M226.267 63.531L231.424 65.133L234.776 66.987C246 72 259 81 268.55 90.519L268.55 92.7L267.539 92.469C264.728 88.589 257.384 85.37 252.544 83.109L238.604 76.596L236.447 75.997L236.873 75.417L234.574 74.012L228.662 70.304L227.82 69.869L230.464 69.144L229.089 67.526L228.96 66.525Z';

type Perch = { left: number; top: number; width: number; height: number };
const FLIGHT_TIME = 1350;
let lastPerchAcrossUnmount: { perch: Perch; sceneKey?: string; at: number } | null = null;

function perchOf(element: Element): Perch {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { left, top, width, height };
}

function needsFlight(from: Perch, to: Perch) {
  if (from.width < 1 || from.height < 1 || to.width < 1 || to.height < 1) return false;
  const x = Math.abs(from.left + from.width / 2 - to.left - to.width / 2);
  const y = Math.abs(from.top + from.height / 2 - to.top - to.height / 2);
  return Math.hypot(x, y) > 18 || Math.abs(from.width / to.width - 1) > 0.15;
}

export function Raven({ speakingKey, reducedMotion, landing, sceneKey }: { speakingKey: string | null; reducedMotion: boolean; landing: boolean; sceneKey?: string }) {
  const id = useId().replace(/:/g, '');
  const flightLayer = useRef<HTMLDivElement>(null);
  const priorPerch = useRef<Perch | null>(null);
  const priorSceneKey = useRef<string | undefined>(undefined);
  const pendingSceneHop = useRef(false);
  const visualPerch = useRef<Perch | null>(null);
  const flightAnimation = useRef<Animation | null>(null);
  const flightFrame = useRef(0);
  const [flying, setFlying] = useState(false);
  const [flyingLeft, setFlyingLeft] = useState(false);
  const head = useRef<SVGGElement>(null);
  const jaw = useRef<SVGGElement>(null);
  const mouth = useRef<SVGPathElement>(null);
  const speechStarted = useRef<number | null>(null);
  const pose = useRef({ jaw: 0, head: 0 });

  useEffect(() => {
    speechStarted.current = speakingKey === null ? null : performance.now();
  }, [speakingKey]);

  // The CSS parent moves to each scene's perch. Invert that layout jump on a
  // child layer, then fly through a raised arc to the new perch. Keep the last
  // visual rectangle when a second move interrupts the first flight.
  useLayoutEffect(() => {
    const layer = flightLayer.current;
    if (!layer) return;
    const source = visualPerch.current ?? priorPerch.current ?? (
      lastPerchAcrossUnmount && performance.now() - lastPerchAcrossUnmount.at < 180_000
        ? lastPerchAcrossUnmount.perch : null
    );
    const previousScene = priorSceneKey.current ?? lastPerchAcrossUnmount?.sceneKey;
    const changedScene = previousScene !== undefined && sceneKey !== undefined && previousScene !== sceneKey;
    priorSceneKey.current = sceneKey;
    flightAnimation.current?.cancel();
    cancelAnimationFrame(flightFrame.current);
    flightAnimation.current = null;
    const target = perchOf(layer);
    priorPerch.current = target;

    const movedPerch = source ? needsFlight(source, target) : false;
    const sceneHop = changedScene || pendingSceneHop.current;
    if (!source || (!movedPerch && !sceneHop) || reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden) {
      visualPerch.current = target;
      pendingSceneHop.current = false;
      setFlying(false);
      return;
    }

    // StrictMode replays effects before first animation frame. Retain the
    // takeoff origin across that replay instead of silently cancelling flight.
    visualPerch.current = source;
    pendingSceneHop.current = sceneHop && !movedPerch;

    const dx = source.left - target.left;
    const dy = source.top - target.top;
    const sx = source.width / target.width;
    const sy = source.height / target.height;
    const frame = layer.closest('.game-frame')?.getBoundingClientRect();
    const drift = sceneHop && !movedPerch ? Math.min(70, (frame?.width ?? 1200) * 0.06) : 0;
    const rise = Math.min(
      155,
      Math.max(48, (frame?.height ?? 700) * 0.14),
      Math.max(0, Math.min(source.top, target.top) - (frame?.top ?? 0) - 16),
    );
    const travel = Math.hypot(dx, dy);
    const duration = movedPerch ? Math.min(1750, FLIGHT_TIME + travel * 0.25) : 950;
    layer.style.setProperty('--raven-flight-ms', `${duration}ms`);
    const transform = (portion: number, lift: number, angle: number, sidestep = 0) =>
      `translate(${(dx * portion + sidestep).toFixed(2)}px, ${(dy * portion - lift).toFixed(2)}px) scale(${(1 + (sx - 1) * portion).toFixed(4)}, ${(1 + (sy - 1) * portion).toFixed(4)}) rotate(${angle}deg)`;
    setFlyingLeft(dx > 0); // The destination is left of the previous perch.
    setFlying(true);
    const animation = layer.animate([
      { transform: transform(1, 0, 0), offset: 0 },
      { transform: transform(0.84, rise * 0.78, -6, drift * 0.55), offset: 0.18 },
      { transform: transform(0.44, rise, -3, drift), offset: 0.53 },
      { transform: transform(0.08, rise * 0.23, 5, drift * 0.45), offset: 0.86 },
      { transform: 'none', offset: 1 },
    ], { duration, easing: 'cubic-bezier(.33,.03,.2,1)', fill: 'both' });
    flightAnimation.current = animation;
    const track = () => {
      if (flightAnimation.current !== animation) return;
      pendingSceneHop.current = false;
      visualPerch.current = perchOf(layer);
      flightFrame.current = requestAnimationFrame(track);
    };
    flightFrame.current = requestAnimationFrame(track);
    void animation.finished.then(() => {
      if (flightAnimation.current !== animation) return;
      cancelAnimationFrame(flightFrame.current);
      flightAnimation.current = null;
      animation.cancel();
      visualPerch.current = perchOf(layer);
      setFlying(false);
    }).catch(() => { /* A new destination or reduced motion cancelled this flight. */ });
  }, [sceneKey, speakingKey, landing, reducedMotion]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncFlight = () => {
      const animation = flightAnimation.current;
      if (!animation) return;
      if (reducedMotion || media.matches) {
        animation.cancel();
        cancelAnimationFrame(flightFrame.current);
        flightAnimation.current = null;
        visualPerch.current = flightLayer.current ? perchOf(flightLayer.current) : null;
        setFlying(false);
      } else if (document.hidden) animation.pause();
      else if (animation.playState === 'paused') animation.play();
    };
    media.addEventListener('change', syncFlight);
    document.addEventListener('visibilitychange', syncFlight);
    return () => {
      media.removeEventListener('change', syncFlight);
      document.removeEventListener('visibilitychange', syncFlight);
    };
  }, [reducedMotion]);

  useEffect(() => () => {
    const layer = flightLayer.current;
    const perch = visualPerch.current ?? (layer ? perchOf(layer) : priorPerch.current);
    if (perch) lastPerchAcrossUnmount = { perch, sceneKey: priorSceneKey.current, at: performance.now() };
    flightAnimation.current?.cancel();
    cancelAnimationFrame(flightFrame.current);
  }, []);

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

  return <div className={`raven-character ${landing ? 'raven-landing' : 'raven-guide'} ${flying ? 'raven-flight-active' : ''} ${flyingLeft ? 'raven-flight-left' : ''}`} style={{ transition: 'none' }} aria-hidden="true">
    <div className="raven-flight-layer" ref={flightLayer}>
    <svg className="raven-rig" viewBox="-80 0 402 280" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg" focusable="false">
      <defs>
        <image id={`${id}-art`} href="/assets/raven.svg" x="-80" width="402" height="280" />
        <clipPath id={`${id}-head-cut`}><path d={HEAD} /></clipPath>
        <clipPath id={`${id}-jaw-cut`}><path d={JAW} /></clipPath>
        <linearGradient id={`${id}-neck-fade`} x1="0" y1="90" x2="0" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="white" /><stop offset="1" stopColor="black" />
        </linearGradient>
        <mask id={`${id}-body-mask`} x="-80" y="0" width="402" height="280" maskUnits="userSpaceOnUse" style={{ maskType: 'luminance' }}>
          <rect x="-80" width="402" height="280" fill="white" /><path d={HEAD_CORE} fill="black" />
        </mask>
        <mask id={`${id}-head-mask`} x="-80" y="0" width="402" height="280" maskUnits="userSpaceOnUse" style={{ maskType: 'luminance' }}>
          <rect x="-80" width="402" height="280" fill="white" />
          <rect width="222" height="280" fill={`url(#${id}-neck-fade)`} /><path d={JAW} fill="black" />
        </mask>
      </defs>
      <use className="raven-body" href={`#${id}-art`} mask={`url(#${id}-body-mask)`} />
      <g className="raven-flight-wing" aria-hidden="true">
        <path d="M159 123C127 100 93 68 54 51C72 82 105 115 146 136Q160 140 159 123Z" fill="#242832" stroke="#11141b" strokeWidth="2.5" />
        <path d="M158 126C128 102 84 84 38 75C64 104 105 127 146 139Q160 139 158 126Z" fill="#30343f" stroke="#12151c" strokeWidth="2.5" />
        <path d="M160 130C123 111 77 106 27 109C62 132 108 145 149 145Q164 143 160 130Z" fill="#22252f" stroke="#0d1016" strokeWidth="2.5" />
        <path d="M161 136C127 130 83 138 39 159C79 158 119 153 153 149Q166 146 161 136Z" fill="#292d37" stroke="#11141b" strokeWidth="2.5" />
        <path d="M65 69Q97 94 137 122M51 85Q95 108 141 132M48 116Q96 130 142 139M61 151Q106 143 143 143" fill="none" stroke="#626a76" strokeWidth="1.1" strokeLinecap="round" opacity=".58" />
        <path d="M161 127Q138 113 111 112Q125 134 159 146Q172 136 161 127Z" fill="#3a404d" stroke="#0d1016" strokeWidth="2" />
      </g>
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
    </div>
  </div>;
}
