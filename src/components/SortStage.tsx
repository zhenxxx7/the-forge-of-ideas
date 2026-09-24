import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { ArrowRight, Check, ChevronLeft, Feather, Layers3, Pause, Play, RotateCcw, Undo2 } from 'lucide-react';
import { formatGenerateTime, IDEA_PROMPTS } from '../stage2';
import type { IdeaId } from '../stage2';
import { advanceSortTimer, allIdeasSorted, assignIdea, isSortCategory, SORT_CATEGORIES, SORT_DURATION_MS } from '../stage3';
import type { SortCategory, SortProgress } from '../stage3';
import { playSound } from '../audio';
import { Frame, GoldButton, RoundButton } from './GameUI';
import { Modal } from './Modal';
import { Ornament } from './Ornament';
import { SortGem } from './SortGem';
import { SCRIPT } from '../storyboard';
import { StoryIcon } from './StoryIcon';

type Props = {
  progress: SortProgress;
  ideas: readonly IdeaId[];
  paused: boolean;
  reducedMotion: boolean;
  onChange: (update: (current: SortProgress) => SortProgress) => void;
  onReturn: () => void;
  onComplete: () => void;
};
type Drag = { id: IdeaId; pointer: number; startX: number; startY: number; x: number; y: number; moved: boolean };
type Flight = { id: IdeaId; x: number; y: number; toX: number; toY: number };

export function SortStage({ progress, ideas, paused, reducedMotion, onChange, onReturn, onComplete }: Props) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [visible, setVisible] = useState(!document.hidden);
  const [feedback, setFeedback] = useState('Select an ore, then choose its belt.');
  const [undo, setUndo] = useState<{ id: IdeaId; previous: SortCategory | null } | null>(null);
  const [dragId, setDragId] = useState<IdeaId | null>(null);
  const [overBelt, setOverBelt] = useState<SortCategory | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const drag = useRef<Drag | null>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const flightElement = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const suppressClick = useRef(false);
  const sorting = progress.step === 'sorting' || progress.step === 'review';
  const activeId = progress.activeIdea;
  const activeIdea = IDEA_PROMPTS.find(idea => idea.id === activeId);
  const category = activeId ? progress.assignments[activeId] : undefined;
  const unsorted = ideas.filter(id => !progress.assignments[id]);
  const sortedCount = ideas.length - unsorted.length;
  const ready = allIdeasSorted(progress, ideas);
  const expired = progress.remainingMs === 0 && !progress.untimed;
  const motionPaused = paused || reviewOpen || progress.timerPaused || !visible || !sorting;

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [progress.step]);
  useEffect(() => { setUndo(null); }, [progress.step, ideas]);

  useEffect(() => {
    const visibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);

  useEffect(() => {
    if (!sorting || progress.timerPaused || progress.untimed || paused || reviewOpen) return;
    let previous = performance.now();
    let wasVisible = !document.hidden;
    const tick = () => {
      const now = performance.now();
      const elapsed = now - previous;
      previous = now;
      if (wasVisible) onChange(current => advanceSortTimer(current, elapsed));
    };
    const visibility = () => { tick(); wasVisible = !document.hidden; };
    const interval = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', visibility); tick(); };
  }, [sorting, progress.timerPaused, progress.untimed, paused, reviewOpen, onChange]);

  function cancelDrag() {
    cancelAnimationFrame(frame.current);
    drag.current = null;
    setDragId(null);
    setOverBelt(null);
  }

  useEffect(() => {
    if (motionPaused || reducedMotion) cancelDrag();
  }, [motionPaused, reducedMotion]);
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape') cancelDrag(); };
    const blur = () => cancelDrag();
    window.addEventListener('keydown', cancel);
    window.addEventListener('blur', blur);
    return () => { cancelAnimationFrame(frame.current); window.removeEventListener('keydown', cancel); window.removeEventListener('blur', blur); };
  }, []);

  useEffect(() => {
    if (!flight || !flightElement.current) return;
    if (reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !visible) { setFlight(null); return; }
    const animation = flightElement.current.animate([
      { transform: `translate3d(${flight.x - 20}px, ${flight.y - 24}px, 0) scale(1)`, opacity: 1 },
      { transform: `translate3d(${flight.toX - 20}px, ${flight.toY - 24}px, 0) scale(.7)`, opacity: 0 },
    ], { duration: 460, easing: 'cubic-bezier(.2,.7,.25,1)', fill: 'both' });
    void animation.finished.then(() => setFlight(current => current === flight ? null : current)).catch(() => {});
    return () => animation.cancel();
  }, [flight, reducedMotion, visible]);

  function select(id: IdeaId) {
    onChange(current => ({ ...current, activeIdea: id }));
    setFeedback(`${IDEA_PROMPTS.find(idea => idea.id === id)!.label} selected. Choose a conveyor.`);
    playSound();
  }

  function place(id: IdeaId, target: SortCategory | null, origin?: { x: number; y: number }) {
    if (!sorting || !ideas.includes(id)) return;
    const previous = progress.assignments[id] ?? null;
    if (previous === target) { setFeedback('This idea is already on that belt. You can choose a different one.'); return; }
    setUndo({ id, previous });
    onChange(current => assignIdea({ ...current, step: 'sorting' }, ideas, id, target));
    const label = IDEA_PROMPTS.find(idea => idea.id === id)!.label;
    setFeedback(target ? `${label} moved to ${SORT_CATEGORIES.find(item => item.id === target)!.label}.` : `${label} returned to the unsorted tray.`);
    playSound(target ? 'chime' : 'click');
    if (target && !reducedMotion) {
      const source = document.querySelector(`[data-sort-idea="${id}"]`)?.getBoundingClientRect();
      const destination = document.querySelector(`[data-sort-category="${target}"] .belt-gems`)?.getBoundingClientRect();
      if (destination && (origin || source)) setFlight({ id, x: origin?.x ?? source!.x + source!.width / 2, y: origin?.y ?? source!.y + source!.height / 2, toX: destination.x + destination.width / 2, toY: destination.y + 28 });
    }
  }

  function pointerDown(event: ReactPointerEvent<HTMLButtonElement>, id: IdeaId) {
    if (!sorting || event.button !== 0) return;
    suppressClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id, pointer: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false };
  }

  function pointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    current.x = event.clientX; current.y = event.clientY;
    if (!current.moved && Math.hypot(current.x - current.startX, current.y - current.startY) < 8) return;
    if (!current.moved) { current.moved = true; setDragId(current.id); }
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (!drag.current) return;
      if (ghost.current) ghost.current.style.transform = `translate3d(${current.x - 20}px, ${current.y - 24}px, 0)`;
      const target = document.elementFromPoint(current.x, current.y)?.closest<HTMLElement>('[data-sort-category]')?.dataset.sortCategory;
      setOverBelt(isSortCategory(target) ? target : null);
    });
  }

  function pointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    if (current.moved) {
      suppressClick.current = true;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-sort-category]')?.dataset.sortCategory;
      if (isSortCategory(target)) place(current.id, target, { x: event.clientX, y: event.clientY });
      else setFeedback('No belt selected. Your idea stays where it was.');
    }
    cancelDrag();
  }

  function ideaButton(id: IdeaId) {
    const idea = IDEA_PROMPTS.find(item => item.id === id)!;
    return <button key={id} className={`sort-ore ${activeId === id ? 'selected-sort-ore' : ''} ${dragId === id ? 'dragging-sort-ore' : ''}`} data-sort-idea={id} aria-label={`Select ${idea.label}`} aria-pressed={activeId === id} onPointerDown={event => pointerDown(event, id)} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancelDrag} onLostPointerCapture={() => { if (drag.current) cancelDrag(); }} onDragStart={event => event.preventDefault()} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } select(id); }}>
      <SortGem id={id} /><span>{idea.label}</span>
    </button>;
  }

  function beginSorting() {
    onChange(current => ({ ...current, step: 'sorting', activeIdea: current.activeIdea, untimed: current.remainingMs === 0 ? true : current.untimed }));
    playSound();
  }

  function placeOnBelt(target: SortCategory) {
    if (activeId) { place(activeId, target); return; }
    setFeedback('Choose an ore from the tray first, then touch a conveyor.');
    document.querySelector<HTMLButtonElement>('.sort-ore-grid .sort-ore')?.focus({ preventScroll: true });
    playSound('click');
  }

  const groups = <div className="sort-review-groups">{SORT_CATEGORIES.map(item => <section key={item.id} style={{ '--belt-color': item.color } as CSSProperties}>
    <h3>{item.label}<span>{ideas.filter(id => progress.assignments[id] === item.id).length}</span></h3><p>{item.description}</p>
    <ul>{ideas.filter(id => progress.assignments[id] === item.id).map(id => <li key={id}><SortGem id={id} /><span>{IDEA_PROMPTS.find(idea => idea.id === id)!.text}</span></li>)}</ul>
    {!ideas.some(id => progress.assignments[id] === item.id) && <p className="empty-category">No ideas on this belt.</p>}
  </section>)}{unsorted.length > 0 && <section className="unsorted-review"><h3>Still to sort<span>{unsorted.length}</span></h3><ul>{unsorted.map(id => <li key={id}><SortGem id={id} /><span>{IDEA_PROMPTS.find(idea => idea.id === id)!.text}</span></li>)}</ul></section>}</div>;

  return <div className={`sort-stage ${motionPaused ? 'sort-motion-paused' : ''}`}>
    {progress.step === 'intro' && <button type="button" className="sort-machine-start" aria-label="Activate sorting conveyors" title="Activate sorting conveyors" onClick={beginSorting} disabled={!ideas.length}>
      <span className="sort-machine-knob" aria-hidden="true"><Play /></span><span className="sort-machine-label" aria-hidden="true">Start conveyors</span>
    </button>}
    <div className="sort-hud">
      <div className={`forge-timer ${expired ? 'timer-expired' : ''}`}><StoryIcon name="hourglass" /><div><span className="hud-label">{progress.untimed ? 'YOUR OWN PACE' : 'SORTING TIME'}</span><span role="timer" aria-live="off" aria-label="Sorting time remaining">{progress.untimed ? 'Untimed' : formatGenerateTime(progress.remainingMs)}</span></div>{sorting && !progress.untimed && <button aria-label={progress.timerPaused ? 'Resume timer' : 'Pause timer'} onClick={() => onChange(current => ({ ...current, timerPaused: !current.timerPaused }))}>{progress.timerPaused ? <Play /> : <Pause />}</button>}</div>
      <button className="sort-progress" aria-label={`Review sorted ideas, ${sortedCount} of ${ideas.length}`} onClick={() => setReviewOpen(true)}><Layers3 /><span><small>IDEAS SORTED</small><strong>{sortedCount}<span> / {ideas.length}</span></strong></span></button>
      {sorting && <button className="timer-mode" aria-pressed={progress.untimed} onClick={() => onChange(current => ({ ...current, step: 'sorting', untimed: !current.untimed, remainingMs: current.remainingMs || SORT_DURATION_MS }))}>{progress.untimed ? 'Use timer' : 'Sort without a timer'}</button>}
    </div>

    {progress.step === 'intro' && <Frame className="sort-title scene-enter"><p className="eyebrow">The Forge of Ideas</p><h1 ref={heading} tabIndex={-1}>Sorting Ideas</h1><Ornament /><p>Find what matters. Give every idea a place.</p><span className="stage-number">STAGE 03</span></Frame>}

    {sorting && <>
      <h1 className="sr-only" ref={heading} tabIndex={-1}>Sort your ideas</h1>
      <Frame className="sort-tray"><div className="sort-tray-heading"><span className="eyebrow">YOUR IDEA ORES</span><span>{unsorted.length} to sort</span></div><p>Select an ore, then a belt. Or drag it across.</p><div className="sort-ore-grid" role="group" aria-label="Unsorted ideas">{unsorted.map(ideaButton)}{Array.from({ length: Math.max(0, 9 - unsorted.length) }, (_, i) => <span className="ore-preview empty-slot" key={`empty-${i}`} />)}</div>{!unsorted.length && <div className="all-sorted"><Check /><h2>Every idea has a place.</h2><p>Select an ore on a belt to reconsider it.</p></div>}<button className="sort-undo" disabled={!undo} onClick={() => { if (!undo) return; onChange(current => assignIdea(current, ideas, undo.id, undo.previous)); setUndo(null); setFeedback('Last move undone.'); playSound(); }}><Undo2 /> Undo last move</button></Frame>
      <div className="sorting-belts" aria-label="Sorting categories">{SORT_CATEGORIES.map(item => <section key={item.id} className={`sorting-belt belt-${item.id} ${overBelt === item.id ? 'belt-drag-over' : ''}`} style={{ '--belt-color': item.color } as CSSProperties} data-sort-category={item.id}>
        <div className="belt-running-surface" aria-hidden="true"><i /></div>
        <button className="belt-destination" aria-label={`Move selected idea to ${item.label}`} onClick={() => placeOnBelt(item.id)}><strong>{item.label}</strong><span>{item.description}</span><small>{ideas.filter(id => progress.assignments[id] === item.id).length} ideas</small></button>
        <div className="belt-gems" role="group" aria-label={`${item.label} ideas`}>{ideas.filter(id => progress.assignments[id] === item.id).map(ideaButton)}</div>
        <button className="belt-drop-zone" aria-label={`Place on ${item.label} belt`} onClick={() => placeOnBelt(item.id)}><span>Place here</span></button>
      </section>)}</div>
      {ready && <button type="button" className="sort-machine-finish" aria-label="Release the sorted ideas" title="Release the sorted ideas" onClick={onComplete}>
        <span className="sort-machine-knob" aria-hidden="true"><Check /></span><span className="sort-machine-label" aria-hidden="true">Release ideas</span>
      </button>}
      <div key={feedback} className="sort-world-feedback" role="status" aria-live="polite">{ready ? 'All ideas sorted. Release them into the next chamber.' : feedback}</div>
    </>}



    <section className="dialogue-scroll sort-dialogue" aria-label="Raven dialogue"><div className="scroll-paper" aria-hidden="true" /><div className="scroll-roll roll-left" aria-hidden="true" /><div className="scroll-roll roll-right" aria-hidden="true" /><div className="dialogue-content">
      <div className="dialogue-topline"><span className="speaker-label"><Feather />{sorting ? 'HOW DOES BRADBURY MAKE THIS MOMENT SO TENSE?' : 'YOUR RAVEN GUIDE'}</span><span className="dialogue-pagination">03 · SORT</span></div>
      <p className="dialogue-copy">{progress.step === 'intro' ? SCRIPT.sortIntro : SCRIPT.sort}</p>
      {sorting && activeIdea && <p className="sort-selected-readout" aria-live="polite"><strong>{activeIdea.label}:</strong> {activeIdea.text}</p>}
      <div className="sort-dialogue-actions"><span role="status">{sorting ? feedback : progress.step === 'intro' ? `${ideas.length} collected ideas · 40-minute timer · untimed available` : 'You can revisit your choices from the journey map.'}</span>
        {progress.step === 'intro' && <GoldButton className="small" onClick={beginSorting} disabled={!ideas.length}>Start sorting <ArrowRight /></GoldButton>}
        {sorting && <>{category && activeId && <button className="parchment-link" onClick={() => place(activeId, null)}>Return to tray</button>}<GoldButton className="small" disabled={!ready} onClick={onComplete}>Complete Stage 3 <ArrowRight /></GoldButton></>}

      </div></div><div className="dialogue-navigation"><RoundButton label="Previous" onClick={sorting ? () => onChange(current => ({ ...current, step: 'intro' })) : onReturn}><ChevronLeft /></RoundButton></div></section>

    {reviewOpen && <Modal title="Your sorting decisions" onClose={() => setReviewOpen(false)} className="sort-review-modal"><p className="modal-intro">{sortedCount} of {ideas.length} ideas sorted. Reconsider any category in the sorting activity. These choices are not marked right or wrong.</p>{groups}<GoldButton onClick={() => setReviewOpen(false)}>Return to sorting <RotateCcw /></GoldButton></Modal>}
    {dragId && <div className="sort-drag-ghost" ref={ghost} aria-hidden="true" style={{ transform: `translate3d(${(drag.current?.x ?? 0) - 20}px, ${(drag.current?.y ?? 0) - 24}px, 0)` }}><SortGem id={dragId} /></div>}
    {flight && <div className="sort-flight" ref={flightElement} aria-hidden="true"><SortGem id={flight.id} /></div>}
  </div>;
}
