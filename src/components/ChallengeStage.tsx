import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { ArrowRight, ChevronLeft, Crosshair, Feather, RotateCcw, Sparkles } from 'lucide-react';
import { playSound } from '../audio';
import { IDEA_PROMPTS } from '../stage2';
import type { IdeaId } from '../stage2';
import type { SortAssignments } from '../stage3';
import type { ConnectProgress } from '../stage4';
import type { ElaborateProgress } from '../stage5';
import { aimHits, clampAim, launchInfusion, newChallengeProgress, readyInfusions, selectInfusion, targetHits, MAX_CONFUSION } from '../stage6';
import type { ChallengeProgress } from '../stage6';
import { Frame, GoldButton, RoundButton } from './GameUI';
import { InfusionVial } from './InfusionVial';
import { Modal } from './Modal';
import { SCRIPT } from '../storyboard';
import { VictoryBurst } from './VictoryBurst';

type Props = {
  progress: ChallengeProgress;
  elaborate: ElaborateProgress;
  connect: ConnectProgress;
  ideas: readonly IdeaId[];
  assignments: SortAssignments;
  paused: boolean;
  reducedMotion: boolean;
  onChange: (update: (current: ChallengeProgress) => ChallengeProgress) => void;
  onReturn: () => void;
  onElaborate: () => void;
  onComplete: () => void;
};
const ideaFor = (id: IdeaId) => IDEA_PROMPTS.find(idea => idea.id === id)!;

export function ChallengeStage({ progress, elaborate, connect, ideas, assignments, paused, reducedMotion, onChange, onReturn, onElaborate, onComplete }: Props) {
  const [visible, setVisible] = useState(!document.hidden);
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [firing, setFiring] = useState<{ main: IdeaId; aim: number } | null>(null);
  const [impact, setImpact] = useState<'hit' | 'miss' | null>(null);
  const [inspected, setInspected] = useState<IdeaId | null>(null);
  const [vialDrag, setVialDrag] = useState<{ main: IdeaId; x: number; y: number } | null>(null);
  const [throwHint, setThrowHint] = useState('Drag a flask onto the Beast, or choose one and aim.');
  const vialPointer = useRef<{ pointerId: number; main: IdeaId; startX: number; startY: number } | null>(null);
  const suppressVialClick = useRef(false);
  const lastAimTap = useRef<{ aim: number; time: number } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const available = readyInfusions(elaborate, connect, ideas, assignments);
  const remaining = available.filter(infusion => !progress.used.includes(infusion.main));
  const selected = available.find(infusion => infusion.main === progress.selected);
  const inspectedInfusion = available.find(infusion => infusion.main === inspected);
  const required = targetHits(available.length);
  const still = paused || inspected !== null || !visible;

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [progress.step]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReducedMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  useEffect(() => {
    if (!impact) return;
    const timer = window.setTimeout(() => setImpact(null), reducedMotion ? 100 : 650);
    return () => window.clearTimeout(timer);
  }, [impact, reducedMotion]);

  function aimAt(event: PointerEvent<HTMLButtonElement>) {
    if (firing || paused) return;
    const frame = event.currentTarget.closest('.game-frame')?.getBoundingClientRect();
    if (!frame) return;
    const aim = clampAim((event.clientX - frame.left) / frame.width * 100);
    const now = performance.now();
    if (selected && lastAimTap.current && now - lastAimTap.current.time < 850 && Math.abs(lastAimTap.current.aim - aim) < 8) {
      lastAimTap.current = null;
      fire(selected.main, aim);
      return;
    }
    lastAimTap.current = { aim, time: now };
    onChange(state => ({ ...state, aim }));
    setThrowHint(selected ? 'Tap here again to throw.' : 'Choose a flask before throwing.');
  }

  function fire(main: IdeaId | null = selected?.main ?? null, aim = progress.aim) {
    if (!main || firing || paused) return;
    setFiring({ main, aim });
    setThrowHint('Infusion in flight…');
    playSound('chime');
  }

  function startVialDrag(event: PointerEvent<HTMLButtonElement>, main: IdeaId) {
    if (firing || paused || (event.pointerType === 'mouse' && event.button !== 0)) return;
    vialPointer.current = { pointerId: event.pointerId, main, startX: event.clientX, startY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveVial(event: PointerEvent<HTMLButtonElement>) {
    const pointer = vialPointer.current;
    if (!pointer || pointer.pointerId !== event.pointerId || Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) < 12) return;
    const frame = event.currentTarget.closest('.game-frame')?.getBoundingClientRect();
    if (!frame) return;
    setVialDrag({ main: pointer.main, x: (event.clientX - frame.left) / frame.width * 100, y: (event.clientY - frame.top) / frame.height * 100 });
  }

  function releaseVial(event: PointerEvent<HTMLButtonElement>) {
    const pointer = vialPointer.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    vialPointer.current = null;
    setVialDrag(null);
    if (Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) < 12) return;
    suppressVialClick.current = true;
    window.setTimeout(() => { suppressVialClick.current = false; }, 0);
    const frame = event.currentTarget.closest('.game-frame')?.getBoundingClientRect();
    if (!frame) return;
    const x = (event.clientX - frame.left) / frame.width * 100;
    const y = (event.clientY - frame.top) / frame.height * 100;
    const aim = clampAim(x);
    onChange(state => ({ ...selectInfusion(state, pointer.main, available), aim }));
    if (x >= 25 && x <= 75 && y >= 18 && y <= 70) {
      lastAimTap.current = null;
      fire(pointer.main, aim);
    } else {
      lastAimTap.current = null;
      setThrowHint('Flask selected. Drop it on the Beast to throw.');
      playSound();
    }
  }

  function resolveShot() {
    if (!firing) return;
    const hit = aimHits(firing.aim);
    onChange(state => launchInfusion({ ...state, selected: firing.main, aim: firing.aim }, available));
    setImpact(hit ? 'hit' : 'miss');
    setFiring(null);
    setThrowHint(hit ? 'Infusion struck the Beast.' : 'Missed. Adjust your aim before next throw.');
    playSound(hit ? 'chime' : 'click');
  }

  // Reduced-motion removes CSS animations, so animationend cannot resolve a throw.
  useEffect(() => {
    if (!firing || still || !(reducedMotion || systemReducedMotion)) return;
    const timer = window.setTimeout(resolveShot, 80);
    return () => window.clearTimeout(timer);
  }, [firing, still, reducedMotion, systemReducedMotion]);

  function retry() {
    onChange(() => ({ ...newChallengeProgress(), step: 'aim', aim: progress.aim }));
    setImpact(null);
    setThrowHint('Drag a flask onto the Beast, or choose one and aim.');
    playSound();
  }

  const copy = progress.step === 'intro' ? SCRIPT.beastIntro : progress.step === 'lost' ? 'The shadows have gathered. Try again with your infusions.' : SCRIPT.beast;

  return <div className={`challenge-stage ${still ? 'challenge-still' : ''} ${reducedMotion ? 'challenge-reduced' : ''} challenge-${progress.step} ${selected ? 'has-selected-infusion' : ''} ${firing ? 'is-firing' : ''} ${vialDrag ? 'is-dragging-vial' : ''}`}>
    {progress.step === 'won' && <VictoryBurst />}<div className="challenge-beast" aria-hidden="true"><img src="/assets/stage6-beast.webp" alt="" /></div>
    {(progress.step === 'aim' || progress.step === 'won' || progress.step === 'lost') && <div className="challenge-status" aria-label="Encounter status"><div className="beast-status"><span>Beast</span><strong>{Math.max(0, required - progress.hits)} / {required} shadow</strong><div className="status-track"><span style={{ width: `${Math.max(0, (required - progress.hits) / required * 100)}%` }} /></div></div><div className="confusion-status"><span>CONFUSION</span><strong>{progress.confusion} / {MAX_CONFUSION}</strong><div className="status-track"><span style={{ width: `${progress.confusion / MAX_CONFUSION * 100}%` }} /></div></div></div>}

    {(progress.step === 'instructions' || progress.step === 'aim' || progress.step === 'won') && <Frame className="challenge-stock"><p className="eyebrow">INFUSION STOCK</p><h2>{remaining.length} ready to throw</h2><div className="challenge-stock-list">{available.map(infusion => <button key={infusion.main} className={`challenge-vial-choice ${progress.selected === infusion.main ? 'chosen' : ''} ${progress.used.includes(infusion.main) ? 'vial-used' : ''}`} aria-label={`Select infusion: ${ideaFor(infusion.main).label}`} aria-pressed={progress.selected === infusion.main} disabled={progress.used.includes(infusion.main) || progress.step !== 'aim' || !!firing} onPointerDown={event => startVialDrag(event, infusion.main)} onPointerMove={moveVial} onPointerUp={releaseVial} onPointerCancel={() => { vialPointer.current = null; setVialDrag(null); }} onClick={() => { if (suppressVialClick.current) return; lastAimTap.current = null; onChange(state => selectInfusion(state, infusion.main, available)); setThrowHint('Drag this flask onto the Beast, or tap twice to throw.'); playSound(); }}><InfusionVial main={infusion.main} /><span>{ideaFor(infusion.main).label}</span>{progress.used.includes(infusion.main) && <small>THROWN</small>}</button>)}{Array.from({length: Math.max(0, 3 - available.length)}, (_,i) => <span className="challenge-vial-choice empty-slot" key={i} aria-hidden="true" />)}</div>{selected && <button className="text-link" onClick={() => setInspected(selected.main)}>Read selected writing</button>}</Frame>}
    {progress.step === 'aim' && <p className="battlefield-hint" role="status">{throwHint}</p>}

    {progress.step === 'aim' && <>
      <svg className="challenge-arc" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d={`M 75 63 Q 64 18 ${progress.aim} 46`} /></svg>
      <button className="challenge-aim-surface" aria-label="Aim in the battlefield" title="Tap the beast to aim" onPointerDown={aimAt} disabled={!!firing || paused} />
      <div className="challenge-reticle" style={{ left: `${progress.aim}%` }} aria-hidden="true"><Crosshair /></div>
      <Frame className="challenge-controls"><p className="eyebrow">TAKE AIM</p><label htmlFor="challenge-aim">Horizontal aim <strong>{progress.aim}%</strong></label><input id="challenge-aim" type="range" min="0" max="100" value={progress.aim} disabled={!!firing || paused} onChange={event => onChange(state => ({ ...state, aim: clampAim(Number(event.target.value)) }))} /><div className="challenge-control-actions"><span>{selected ? ideaFor(selected.main).label : 'Choose an infusion first'}</span></div></Frame>
      {selected && !firing && <div className="challenge-ready-vial" aria-hidden="true"><InfusionVial main={selected.main} /></div>}
      {vialDrag && <div className="challenge-drag-vial" style={{ left: `${vialDrag.x}%`, top: `${vialDrag.y}%` }} aria-hidden="true"><InfusionVial main={vialDrag.main} /></div>}
      {firing && <div className="challenge-shot" style={{ '--shot-end': `${firing.aim}%` } as React.CSSProperties} onAnimationEnd={resolveShot} aria-hidden="true"><InfusionVial main={firing.main} /></div>}
      {impact && <div className={`challenge-impact impact-${impact}`} style={{ left: impact === 'hit' ? '50%' : `${progress.aim}%` }} aria-hidden="true" />}
    </>}

    {(progress.step === 'won' || progress.step === 'lost') && <Frame className="challenge-result"><p className="eyebrow">{progress.step === 'won' ? 'THE SHADOW BREAKS' : 'THE SHADOWS GATHER'}</p><h1 ref={heading} tabIndex={-1}>{progress.step === 'won' ? 'The Beast retreats.' : 'Try another approach.'}</h1><p>{progress.step === 'won' ? `${progress.hits} ${progress.hits === 1 ? 'infusion' : 'infusions'} found the mark.` : 'Your infusions return for another attempt. Your writing has not changed.'}</p></Frame>}
    {progress.step === 'intro' && <h1 ref={heading} className="sr-only" tabIndex={-1}>The Inarticulate Beast</h1>}
    {progress.step === 'instructions' && <h1 ref={heading} className="sr-only" tabIndex={-1}>Aim instructions</h1>}
    {progress.step === 'aim' && <h1 ref={heading} className="sr-only" tabIndex={-1}>Aim and launch infusions</h1>}

    <section className="dialogue-scroll challenge-dialogue" aria-label="Raven dialogue"><div className="scroll-paper" aria-hidden="true" /><div className="scroll-roll roll-left" aria-hidden="true" /><div className="scroll-roll roll-right" aria-hidden="true" /><div className="dialogue-content"><div className="dialogue-topline"><span className="speaker-label"><Feather />YOUR RAVEN GUIDE</span><span className="dialogue-pagination">06 · CHALLENGE</span></div><p className="dialogue-copy">{copy}</p><div className="challenge-dialogue-actions"><span>{progress.step === 'aim' ? `${progress.hits} / ${required} hits · ${remaining.length} infusions left` : 'Your Stage 5 writing remains safe.'}</span>{progress.step === 'intro' && <GoldButton className="small" onClick={() => { onChange(state => ({ ...state, step: 'instructions' })); playSound(); }}>Face the Beast <ArrowRight /></GoldButton>}{progress.step === 'instructions' && <GoldButton className="small" onClick={() => { onChange(state => ({ ...state, step: 'aim' })); playSound(); }}>Take aim <Crosshair /></GoldButton>}{progress.step === 'aim' && <><button className="parchment-link" onClick={onElaborate}>Review infusions</button><GoldButton className="small" onClick={() => fire()} disabled={!selected || !!firing || paused}>Launch infusion <ArrowRight /></GoldButton></>}{progress.step === 'lost' && <GoldButton className="small" onClick={retry}>Retry encounter <RotateCcw /></GoldButton>}{progress.step === 'won' && <GoldButton className="small" onClick={onComplete}>Complete Stage 6 <Sparkles /></GoldButton>}</div></div><div className="dialogue-navigation"><RoundButton label="Previous" onClick={progress.step === 'intro' ? onReturn : progress.step === 'instructions' ? () => onChange(state => ({ ...state, step: 'intro' })) : progress.step === 'aim' ? () => onChange(state => ({ ...state, step: 'instructions' })) : onReturn}><ChevronLeft /></RoundButton></div></section>
    {inspectedInfusion && <Modal title={`${ideaFor(inspectedInfusion.main).label} infusion`} onClose={() => setInspected(null)}><p className="modal-intro">Your response, unchanged from Stage 5:</p><p className="challenge-inspect-response">{inspectedInfusion.response}</p><GoldButton onClick={() => setInspected(null)}>Return to aiming</GoldButton></Modal>}
  </div>;
}
