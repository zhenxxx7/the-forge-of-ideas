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
  const [firing, setFiring] = useState<{ main: IdeaId; aim: number } | null>(null);
  const [impact, setImpact] = useState<'hit' | 'miss' | null>(null);
  const [inspected, setInspected] = useState<IdeaId | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const available = readyInfusions(elaborate, connect, ideas, assignments);
  const remaining = available.filter(infusion => !progress.used.includes(infusion.main));
  const selected = available.find(infusion => infusion.main === progress.selected);
  const inspectedInfusion = available.find(infusion => infusion.main === inspected);
  const required = targetHits(available.length);
  const still = paused || inspected !== null || !visible;

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [progress.step]);
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
    onChange(state => ({ ...state, aim: clampAim((event.clientX - frame.left) / frame.width * 100) }));
  }

  function fire() {
    if (!selected || firing || paused) return;
    setFiring({ main: selected.main, aim: progress.aim });
    playSound('chime');
  }

  function resolveShot() {
    if (!firing) return;
    const hit = aimHits(firing.aim);
    onChange(state => launchInfusion({ ...state, selected: firing.main, aim: firing.aim }, available));
    setImpact(hit ? 'hit' : 'miss');
    setFiring(null);
    playSound(hit ? 'chime' : 'click');
  }

  function retry() {
    onChange(() => ({ ...newChallengeProgress(), step: 'aim', aim: progress.aim }));
    setImpact(null);
    playSound();
  }

  const copy = progress.step === 'intro'
    ? 'The Inarticulate Beast blocks your path. Your own elaborated ideas can cast light into the darkness. Take the infusions you forged and face it.'
    : progress.step === 'instructions'
      ? `Choose an infusion, aim at the beast, then launch. A missed throw raises Confusion. Land ${required} ${required === 1 ? 'hit' : 'hits'} to dispel the shadow; if you run out of infusions, you can retry without losing your writing.`
      : progress.step === 'aim'
        ? progress.lastOutcome === 'hit' ? 'Your infusion struck the Beast. The shadow weakens. Select another and keep your aim true.' : progress.lastOutcome === 'miss' ? 'The infusion missed and Confusion rose. Take a breath, select another, or retry if your stock runs out.' : 'Select a vial from your stock. Tap the battlefield or adjust the aim slider, then launch. Your writing is already safe in the journal.'
        : progress.step === 'won'
          ? 'Your ideas give the darkness shape, and the Beast retreats. Keep your infusions and writing; this victory is a game milestone, not a literary grade.'
          : 'The shadows gathered before your infusions landed. Retry this encounter; your Stage 5 writing and crystals are untouched.';

  return <div className={`challenge-stage ${still ? 'challenge-still' : ''} ${reducedMotion ? 'challenge-reduced' : ''} challenge-${progress.step}`}>
    <div className="challenge-beast" aria-hidden="true"><img src="/assets/stage6-beast.webp" alt="" /></div>
    {progress.step !== 'intro' && <div className="challenge-status" aria-label="Encounter status"><div className="beast-status"><span>THE INARTICULATE BEAST</span><strong>{Math.max(0, required - progress.hits)} / {required} shadow</strong><div className="status-track"><span style={{ width: `${Math.max(0, (required - progress.hits) / required * 100)}%` }} /></div></div><div className="confusion-status"><span>CONFUSION</span><strong>{progress.confusion} / {MAX_CONFUSION}</strong><div className="status-track"><span style={{ width: `${progress.confusion / MAX_CONFUSION * 100}%` }} /></div></div></div>}

    {(progress.step === 'instructions' || progress.step === 'aim') && <Frame className="challenge-stock"><p className="eyebrow">INFUSION STOCK</p><h2>{remaining.length} ready to throw</h2><div className="challenge-stock-list">{available.map(infusion => <button key={infusion.main} className={`challenge-vial-choice ${progress.selected === infusion.main ? 'chosen' : ''}`} aria-label={`Select infusion: ${ideaFor(infusion.main).label}`} aria-pressed={progress.selected === infusion.main} disabled={progress.used.includes(infusion.main) || progress.step !== 'aim' || !!firing} onClick={() => { onChange(state => selectInfusion(state, infusion.main, available)); playSound(); }}><InfusionVial main={infusion.main} /><span>{ideaFor(infusion.main).label}</span>{progress.used.includes(infusion.main) && <small>THROWN</small>}</button>)}</div>{selected && <button className="text-link" onClick={() => setInspected(selected.main)}>Read selected writing</button>}</Frame>}

    {progress.step === 'aim' && <>
      <svg className="challenge-arc" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d={`M 75 63 Q 64 18 ${progress.aim} 46`} /></svg>
      <button className="challenge-aim-surface" aria-label="Aim in the battlefield" title="Tap the beast to aim" onPointerDown={aimAt} disabled={!!firing || paused} />
      <div className="challenge-reticle" style={{ left: `${progress.aim}%` }} aria-hidden="true"><Crosshair /></div>
      <Frame className="challenge-controls"><p className="eyebrow">TAKE AIM</p><label htmlFor="challenge-aim">Horizontal aim <strong>{progress.aim}%</strong></label><input id="challenge-aim" type="range" min="0" max="100" value={progress.aim} disabled={!!firing || paused} onChange={event => onChange(state => ({ ...state, aim: clampAim(Number(event.target.value)) }))} /><div className="challenge-control-actions"><span>{selected ? ideaFor(selected.main).label : 'Choose an infusion first'}</span><GoldButton className="small" onClick={fire} disabled={!selected || !!firing || paused}>Launch infusion <ArrowRight /></GoldButton></div></Frame>
      {firing && <div className="challenge-shot" style={{ '--shot-end': `${firing.aim}%` } as React.CSSProperties} onAnimationEnd={resolveShot} aria-hidden="true"><InfusionVial main={firing.main} /></div>}
      {impact && <div className={`challenge-impact impact-${impact}`} style={{ left: impact === 'hit' ? '50%' : `${progress.aim}%` }} aria-hidden="true" />}
    </>}

    {(progress.step === 'won' || progress.step === 'lost') && <Frame className="challenge-result"><p className="eyebrow">{progress.step === 'won' ? 'THE SHADOW BREAKS' : 'THE SHADOWS GATHER'}</p><h1 ref={heading} tabIndex={-1}>{progress.step === 'won' ? 'The Beast retreats.' : 'Try another approach.'}</h1><p>{progress.step === 'won' ? `${progress.hits} ${progress.hits === 1 ? 'infusion' : 'infusions'} found the mark.` : 'Your infusions return for another attempt. Your writing has not changed.'}</p></Frame>}
    {progress.step === 'intro' && <h1 ref={heading} className="sr-only" tabIndex={-1}>The Inarticulate Beast</h1>}
    {progress.step === 'instructions' && <h1 ref={heading} className="sr-only" tabIndex={-1}>Aim instructions</h1>}
    {progress.step === 'aim' && <h1 ref={heading} className="sr-only" tabIndex={-1}>Aim and launch infusions</h1>}

    <section className="dialogue-scroll challenge-dialogue" aria-label="Raven dialogue"><div className="scroll-paper" aria-hidden="true" /><div className="scroll-roll roll-left" aria-hidden="true" /><div className="scroll-roll roll-right" aria-hidden="true" /><div className="dialogue-content"><div className="dialogue-topline"><span className="speaker-label"><Feather />YOUR RAVEN GUIDE</span><span className="dialogue-pagination">06 · CHALLENGE</span></div><p className="dialogue-copy">{copy}</p><div className="challenge-dialogue-actions"><span>{progress.step === 'aim' ? `${progress.hits} / ${required} hits · ${remaining.length} infusions left` : 'Your Stage 5 writing remains safe.'}</span>{progress.step === 'intro' && <GoldButton className="small" onClick={() => { onChange(state => ({ ...state, step: 'instructions' })); playSound(); }}>Face the Beast <ArrowRight /></GoldButton>}{progress.step === 'instructions' && <GoldButton className="small" onClick={() => { onChange(state => ({ ...state, step: 'aim' })); playSound(); }}>Take aim <Crosshair /></GoldButton>}{progress.step === 'aim' && <button className="parchment-link" onClick={onElaborate}>Review infusions</button>}{progress.step === 'lost' && <GoldButton className="small" onClick={retry}>Retry encounter <RotateCcw /></GoldButton>}{progress.step === 'won' && <GoldButton className="small" onClick={onComplete}>Complete Stage 6 <Sparkles /></GoldButton>}</div></div><div className="dialogue-navigation"><RoundButton label="Previous" onClick={progress.step === 'intro' ? onReturn : progress.step === 'instructions' ? () => onChange(state => ({ ...state, step: 'intro' })) : onReturn}><ChevronLeft /></RoundButton></div></section>
    {inspectedInfusion && <Modal title={`${ideaFor(inspectedInfusion.main).label} infusion`} onClose={() => setInspected(null)}><p className="modal-intro">Your response, unchanged from Stage 5:</p><p className="challenge-inspect-response">{inspectedInfusion.response}</p><GoldButton onClick={() => setInspected(null)}>Return to aiming</GoldButton></Modal>}
  </div>;
}
