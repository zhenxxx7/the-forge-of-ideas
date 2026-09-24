import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Feather, Gem, Pause, Play, ShoppingBag, Sparkles, X } from 'lucide-react';
import { advanceGenerateTimer, formatGenerateTime, IDEA_PROMPTS, toggleIdea } from '../stage2';
import type { GenerateProgress, GenerateStep } from '../stage2';
import { Frame, GoldButton, RoundButton } from './GameUI';
import { Ornament } from './Ornament';
import { Modal } from './Modal';
import { playSound } from '../audio';
import { SCRIPT } from '../storyboard';
import { StoryIcon } from './StoryIcon';
import '../midstageInteraction.css';

type Props = {
  progress: GenerateProgress;
  paused: boolean;
  onChange: (update: (current: GenerateProgress) => GenerateProgress) => void;
  onReturn: () => void;
  onComplete: () => void;
};

function IdeaOre({ className = '' }: { className?: string }) {
  return <svg className={`idea-ore ${className}`} viewBox="0 0 72 82" fill="none" aria-hidden="true">
    <path d="M34 2 61 17 70 53 39 79 5 58 2 25Z" fill="#86112f" stroke="#ec6e83" strokeWidth="1" />
    <path d="M34 2 25 28 2 25Z" fill="#ffe0c2" /><path d="m34 2 27 15-15 20-21-9Z" fill="#ee3657" />
    <path d="m25 28 21 9-9 29L5 58Z" fill="#b30d36" /><path d="m46 37 15-20 9 36-33 13Z" fill="#f24b6a" />
    <path d="m37 66 33-13-31 26Z" fill="#7e082a" /><path d="m5 58 32 8 2 13Z" fill="#dd1f4e" />
    <path d="m25 28 21 9-14 5Z" fill="#ff8c98" />
  </svg>;
}

function GatewayTransition({ open }: { open: boolean }) {
  return <div className={`gateway-effects ${open ? 'gateway-open' : ''}`} aria-hidden="true">
    <div className="gateway-closed-background" />
  </div>;
}

export function GenerateStage({ progress, paused, onChange, onReturn, onComplete }: Props) {
  const [pouchOpen, setPouchOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const oreHold = useRef<{ pointer: number; x: number; y: number; element: HTMLButtonElement; timer: number } | null>(null);
  const suppressOreClick = useRef(false);
  const suppressionTimer = useRef<number | null>(null);
  const currentIndex = IDEA_PROMPTS.findIndex(idea => idea.id === progress.activeIdea);
  const idea = IDEA_PROMPTS[currentIndex];
  const isCollected = progress.selected.includes(idea.id);
  const hasIdeas = progress.selected.length > 0;
  const exploring = progress.step === 'explore';
  const expired = progress.remainingMs === 0 && !progress.untimed;

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [progress.step]);
  useEffect(() => () => {
    if (oreHold.current) window.clearTimeout(oreHold.current.timer);
    if (suppressionTimer.current !== null) window.clearTimeout(suppressionTimer.current);
  }, []);

  useEffect(() => {
    if (!exploring || progress.timerPaused || progress.untimed || paused || pouchOpen) return;
    let previous = performance.now();
    let visible = !document.hidden;
    const tick = () => {
      const now = performance.now();
      const elapsed = now - previous;
      previous = now;
      if (visible) onChange(current => advanceGenerateTimer(current, elapsed));
    };
    const visibility = () => { tick(); visible = !document.hidden; };
    const interval = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', visibility);
      tick();
    };
  }, [exploring, progress.timerPaused, progress.untimed, paused, pouchOpen, onChange]);

  function go(step: GenerateStep) {
    onChange(current => ({ ...current, step, untimed: step === 'explore' && current.remainingMs === 0 ? true : current.untimed }));
    playSound();
  }

  function select(index: number) {
    onChange(current => ({ ...current, activeIdea: IDEA_PROMPTS[(index + IDEA_PROMPTS.length) % IDEA_PROMPTS.length].id }));
    playSound();
  }

  function collect() {
    onChange(current => toggleIdea(current, idea.id));
    playSound(isCollected ? 'click' : 'chime');
  }

  function cancelOreHold() {
    const held = oreHold.current;
    if (!held) return;
    window.clearTimeout(held.timer);
    held.element.classList.remove('ore-holding');
    oreHold.current = null;
  }

  function finishOreHold() {
    cancelOreHold();
    if (suppressOreClick.current) {
      if (suppressionTimer.current !== null) window.clearTimeout(suppressionTimer.current);
      suppressionTimer.current = window.setTimeout(() => { suppressOreClick.current = false; suppressionTimer.current = null; }, 500);
    }
  }

  function beginOreHold(event: ReactPointerEvent<HTMLButtonElement>, id: typeof idea.id) {
    if (event.button !== 0) return;
    cancelOreHold();
    const element = event.currentTarget;
    element.classList.add('ore-holding');
    const pointer = event.pointerId;
    const x = event.clientX;
    const y = event.clientY;
    const timer = window.setTimeout(() => {
      if (oreHold.current?.pointer !== pointer) return;
      suppressOreClick.current = true;
      onChange(current => toggleIdea({ ...current, activeIdea: id }, id));
      playSound(progress.selected.includes(id) ? 'click' : 'chime');
      cancelOreHold();
    }, 550);
    oreHold.current = { pointer, x, y, element, timer };
  }

  function moveOreHold(event: ReactPointerEvent<HTMLButtonElement>) {
    const held = oreHold.current;
    if (held?.pointer === event.pointerId && Math.hypot(event.clientX - held.x, event.clientY - held.y) > 12) cancelOreHold();
  }

  const dialogue = progress.step === 'entrance'
    ? SCRIPT.entrance
    : progress.step === 'intro'
      ? SCRIPT.generateIntro
      : progress.step === 'explore'
        ? SCRIPT.generateExplore
        : hasIdeas
          ? SCRIPT.generateCollected
          : 'Your pouch is still empty. There is no penalty for taking your time. Return to the gateway and gather an idea that you would like to explore.';

  return <>
    <GatewayTransition open={progress.step !== 'entrance'} />
    <div className="forge-motes" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ '--mote': index } as CSSProperties} />)}</div>
    {(progress.step === 'entrance' || progress.step === 'intro') && <button type="button" className={`forge-gateway-hotspot ${progress.step === 'intro' ? 'gateway-step-through' : ''}`} aria-label={progress.step === 'entrance' ? 'Open the Forge gateway' : 'Step through the Forge gateway'} title={progress.step === 'entrance' ? 'Open the Forge gateway' : 'Step through the Forge gateway'} onClick={() => go(progress.step === 'entrance' ? 'intro' : 'explore')}>
      <span className="gateway-handle-cue" aria-hidden="true" /><span className="gateway-action-cue" aria-hidden="true">{progress.step === 'entrance' ? 'Open gateway' : 'Step inside'}</span>
    </button>}
    <div className="forge-hud">
      <div className={`forge-timer ${expired ? 'timer-expired' : ''}`}>
        <StoryIcon name="hourglass" />
        <div><span className="hud-label">{progress.untimed ? 'YOUR OWN PACE' : 'EXPLORATION TIME'}</span><span role="timer" aria-live="off" aria-label={progress.untimed ? 'Untimed exploration' : 'Time remaining'}>{progress.untimed ? 'Untimed' : formatGenerateTime(progress.remainingMs)}</span></div>
        {exploring && !progress.untimed && <button aria-label={progress.timerPaused ? 'Resume timer' : 'Pause timer'} title={progress.timerPaused ? 'Resume timer' : 'Pause timer'} onClick={() => onChange(current => ({ ...current, timerPaused: !current.timerPaused }))}>{progress.timerPaused ? <Play /> : <Pause />}</button>}
      </div>
      <button className="forge-pouch-meter" aria-label={`Open idea pouch, ${progress.selected.length} collected`} onClick={() => setPouchOpen(true)}>
        <ShoppingBag aria-hidden="true" /><span><span className="hud-label">IDEA POUCH</span><span className="pouch-meter-track"><span style={{ width: `${progress.selected.length / IDEA_PROMPTS.length * 100}%` }} /></span></span><strong>{progress.selected.length}<small>/{IDEA_PROMPTS.length}</small></strong>
      </button>
      {exploring && <button className="timer-mode" aria-pressed={progress.untimed} onClick={() => onChange(current => ({ ...current, untimed: !current.untimed, remainingMs: current.remainingMs || 60 * 60 * 1000 }))}>{progress.untimed ? 'Use timer' : 'Explore without a timer'}</button>}
    </div>

    {progress.step === 'entrance' && <h1 className="sr-only" ref={heading} tabIndex={-1}>Enter the Forge</h1>}

    {progress.step === 'intro' && <Frame className="generate-title scene-enter">
      <p className="eyebrow">The Forge of Ideas</p><h1 ref={heading} tabIndex={-1}>Generating Ideas</h1><Ornament /><p>Every possibility begins with a spark.</p><span className="stage-number">STAGE 02</span>
    </Frame>}

    {exploring && <div className="idea-exploration">
      <h1 className="sr-only" ref={heading} tabIndex={-1}>Gather your ideas</h1>
      <div className="idea-charms" role="group" aria-label="Idea prompts">{IDEA_PROMPTS.map((item, index) => <button key={item.id} className={`ore-button ore-${index} ${item.id === idea.id ? 'active-ore' : ''} ${progress.selected.includes(item.id) ? 'collected-ore' : ''}`} aria-label={`Explore ${item.label}`} aria-pressed={item.id === idea.id} title={`Tap to inspect ${item.label}; hold to ${progress.selected.includes(item.id) ? 'return it to the forest' : 'gather it'}`} onPointerDown={event => beginOreHold(event, item.id)} onPointerMove={moveOreHold} onPointerUp={finishOreHold} onPointerCancel={finishOreHold} onContextMenu={event => event.preventDefault()} onClick={() => { if (suppressOreClick.current) { suppressOreClick.current = false; return; } select(index); }}>
        <span className="ore-crystal"><IdeaOre />{progress.selected.includes(item.id) && <Check className="ore-check" />}</span><span className="ore-caption">{item.label}</span>
      </button>)}</div>
      <Frame className="idea-card">
        <div className="idea-card-heading"><span className="eyebrow">{idea.source}</span><span>{String(currentIndex + 1).padStart(2, '0')} / 08</span></div>
        <div key={idea.id} className="idea-copy text-enter" aria-live="polite" aria-atomic="true"><h2>{idea.text}</h2><Ornament /></div>
        <div className="idea-card-actions"><button className="idea-arrow" aria-label="Previous idea" onClick={() => select(currentIndex - 1)}><ChevronLeft /></button><GoldButton className={isCollected ? 'idea-collected' : ''} onClick={collect}>{isCollected ? <><Check /> In your pouch</> : <><Gem /> Collect idea</>}</GoldButton><button className="idea-arrow" aria-label="Next idea" onClick={() => select(currentIndex + 1)}><ChevronRight /></button></div>
        <p className="idea-action-hint">{isCollected ? 'In your pouch. Hold this ore to return it.' : 'Tap an ore to inspect it. Hold it to gather it.'}</p>
      </Frame>
      <span className="collection-feedback" role="status" key={progress.selected.join('-')}>{hasIdeas ? `${progress.selected.length} ${progress.selected.length === 1 ? 'idea' : 'ideas'} in your pouch` : 'Your first idea is waiting.'}</span>
    </div>}

    {progress.step === 'collected' && <section className="collected-scene scene-enter" aria-label="Your collected ideas">
      <div className="collected-heading"><p className="eyebrow">{expired ? 'TIME TO REFLECT' : 'A POCKETFUL OF POSSIBILITIES'}</p><h1 ref={heading} tabIndex={-1}>{hasIdeas ? 'Your ideas take form.' : 'A spark is still waiting.'}</h1></div>
      {hasIdeas ? <button className="collected-pouch" aria-label={`Review ${progress.selected.length} collected ideas`} onClick={() => setPouchOpen(true)}><img src="/assets/stage2-idea-pouch.webp" alt="Leather pouch filled with ruby-red idea ores" draggable={false} /><span><Sparkles /> {progress.selected.length} ideas gathered · View pouch</span></button> : <div className="empty-pouch"><ShoppingBag /><p>Gather an idea to fill your pouch.</p></div>}
    </section>}

    <section className="dialogue-scroll generate-dialogue" aria-label="Raven dialogue">
      <div className="scroll-paper" aria-hidden="true" /><div className="scroll-roll roll-left" aria-hidden="true" /><div className="scroll-roll roll-right" aria-hidden="true" />
      <div className="dialogue-content">
        <div className="dialogue-topline"><span className="speaker-label"><Feather />{progress.step === 'explore' ? 'FOLLOW THE SPARK' : 'YOUR RAVEN GUIDE'}</span><span className="dialogue-pagination">02 · GENERATE</span></div>
        <p className="dialogue-copy" aria-live="polite" aria-atomic="true">{dialogue}</p>
        <div className="generate-dialogue-actions">
          <span>{exploring ? 'Starter ideas are not quotations. Check them against your extract.' : progress.step === 'intro' ? '60-minute timer · pause or turn it off anytime' : progress.step === 'collected' ? 'Your ideas stay in your journal.' : 'Generate · Sort · Connect · Elaborate'}</span>
          {progress.step === 'entrance' && <GoldButton className="small" onClick={() => go('intro')}>Enter the Forge <ArrowRight /></GoldButton>}
          {progress.step === 'intro' && <GoldButton className="small" onClick={() => go('explore')}>Start gathering <ArrowRight /></GoldButton>}
          {exploring && <GoldButton className="small" onClick={() => go('collected')} disabled={!hasIdeas}>Review my pouch <ArrowRight /></GoldButton>}
          {progress.step === 'collected' && <><button className="parchment-link" onClick={() => go('explore')}>{hasIdeas ? 'Gather more ideas' : 'Explore without a timer'}</button>{hasIdeas && <GoldButton className="small" onClick={onComplete}>{progress.completed ? 'Return to journey' : 'Complete Stage 2'} <ArrowRight /></GoldButton>}</>}
        </div>
      </div>
      <div className="dialogue-navigation"><RoundButton label="Previous" onClick={() => progress.step === 'entrance' ? onReturn() : go(progress.step === 'intro' ? 'entrance' : progress.step === 'explore' ? 'intro' : 'explore')}><ChevronLeft /></RoundButton></div>
    </section>

    {pouchOpen && <Modal title="Your idea pouch" onClose={() => setPouchOpen(false)} className="idea-pouch-modal">
      <p className="modal-intro">{hasIdeas ? `${progress.selected.length} possibilities gathered. These are starting points to consider, not a graded answer.` : 'Your pouch is empty. Explore a glowing ore and select Collect idea.'}</p>
      <div className="pouch-notes">{progress.selected.map(id => {
        const collected = IDEA_PROMPTS.find(item => item.id === id)!;
        return <section key={id}><IdeaOre /><div><span>{collected.source}</span><p>{collected.text}</p></div>{exploring && <button className="icon-button" aria-label={`Remove ${collected.label}`} onClick={() => onChange(current => toggleIdea(current, id))}><X /></button>}</section>;
      })}</div>
      <GoldButton onClick={() => setPouchOpen(false)}>Return to the Forge</GoldButton>
    </Modal>}
  </>;
}
