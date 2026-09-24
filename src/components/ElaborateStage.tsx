import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, Feather, FlaskConical, Pause, Play, Trash2 } from 'lucide-react';
import { playSound } from '../audio';
import { IDEA_PROMPTS, formatGenerateTime } from '../stage2';
import type { IdeaId } from '../stage2';
import type { SortAssignments } from '../stage3';
import type { ConnectProgress } from '../stage4';
import { advanceElaborateTimer, chooseCrystal, ELABORATE_DURATION_MS, eligibleCrystals, infusionIssue, infusionsReady, MAX_INFUSION_TEXT, refreshInfusionSource, RUNES, toggleRune, writeInfusion } from '../stage5';
import type { ElaborateProgress, RuneId } from '../stage5';
import { SortGem } from './SortGem';
import { RuneGlyph } from './RuneGlyph';
import { ConnectionCrystal } from './ConnectionCrystal';
import { Frame, GoldButton, RoundButton } from './GameUI';
import { InfusionVial } from './InfusionVial';
import { Modal } from './Modal';
import { Ornament } from './Ornament';
import { useCrystalDrag } from './useCrystalDrag';
import { SCRIPT } from '../storyboard';
import { StoryIcon } from './StoryIcon';

type Props = {
  progress: ElaborateProgress;
  connect: ConnectProgress;
  ideas: readonly IdeaId[];
  assignments: SortAssignments;
  paused: boolean;
  reducedMotion: boolean;
  onChange: (update: (current: ElaborateProgress) => ElaborateProgress) => void;
  onReturn: () => void;
  onConnect: () => void;
  onComplete: () => void;
};
const ideaFor = (id: IdeaId) => IDEA_PROMPTS.find(idea => idea.id === id)!;
// Bottle centers in the Stage 5 room artwork, measured across the 16:9 scene.
const FLASK_POSITIONS = [26.6, 36.5, 48.3, 61, 72.7, 83.1] as const;

export function ElaborateStage({ progress, connect, ideas, assignments, paused, reducedMotion, onChange, onReturn, onConnect, onComplete }: Props) {
  const [visible, setVisible] = useState(!document.hidden);
  const [writerOpen, setWriterOpen] = useState(false);
  const [activeRune, setActiveRune] = useState<RuneId | null>(null);
  const [chamberCue, setChamberCue] = useState(false);
  const [inspectMain, setInspectMain] = useState<IdeaId | null>(null);
  const [removeMain, setRemoveMain] = useState<IdeaId | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const crystals = eligibleCrystals(connect, ideas, assignments);
  const current = progress.infusions.find(infusion => infusion.main === progress.activeMain);
  const currentSource = connect.connections.find(connection => connection.main === progress.activeMain);
  const working = progress.step === 'choose' || progress.step === 'develop';
  const modalOpen = inspectMain !== null || removeMain !== null || writerOpen;
  const expired = progress.remainingMs === 0 && !progress.untimed;
  const still = paused || modalOpen || progress.timerPaused || !visible || !working || reducedMotion;
  const ready = infusionsReady(progress, connect, ideas, assignments);
  const readyCount = progress.infusions.filter(infusion => !infusionIssue(infusion, connect, ideas, assignments)).length;
  const inspected = progress.infusions.find(infusion => infusion.main === inspectMain);
  const cue = RUNES.find(rune => rune.id === activeRune);

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [progress.step]);
  useEffect(() => {
    const visibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  useEffect(() => {
    if (!working || progress.timerPaused || progress.untimed || paused || modalOpen) return;
    let previous = performance.now();
    let wasVisible = !document.hidden;
    const tick = () => {
      const now = performance.now(); const elapsed = now - previous; previous = now;
      if (wasVisible) onChange(state => advanceElaborateTimer(state, elapsed));
    };
    const visibility = () => { tick(); wasVisible = !document.hidden; };
    const interval = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', visibility); tick(); };
  }, [working, progress.timerPaused, progress.untimed, paused, modalOpen, onChange]);

  function enterChoose() {
    onChange(state => ({ ...state, step: 'choose', activeMain: null, untimed: state.remainingMs === 0 ? true : state.untimed }));
    setActiveRune(null); setChamberCue(false); playSound();
  }
  function choose(id: IdeaId) {
    if (!crystals.some(connection => connection.main === id)) return;
    onChange(state => chooseCrystal(state, id, connect, ideas, assignments));
    setActiveRune(null); setChamberCue(false); setInspectMain(null); playSound('chime');
  }
  const drag = useCrystalDrag(progress.step !== 'choose' || paused || modalOpen || !visible, choose);

  function infusionList() {
    return <div className="infusion-list">{progress.infusions.map(infusion => {
      const issue = infusionIssue(infusion, connect, ideas, assignments);
      return <button key={infusion.main} className={`infusion-card ${issue ? 'infusion-draft' : 'infusion-ready'}`} aria-label={`Inspect infusion: ${ideaFor(infusion.main).label}`} onClick={() => setInspectMain(infusion.main)}><InfusionVial main={infusion.main} /><strong>{ideaFor(infusion.main).label}</strong><span>{infusion.runes.length} runes · {issue ? 'Needs review' : 'Ready'}</span></button>;
    })}{!progress.infusions.length && <p className="no-infusions">No infusions yet. Choose one of your connected crystals to begin.</p>}</div>;
  }

  return <div className={`elaborate-stage ${still ? 'elaborate-still' : ''} ${current?.runes.length ? 'brew-active' : ''} ${current && !infusionIssue(current, connect, ideas, assignments) ? 'brew-ready' : ''}`}>
    <div className="elaborate-hud"><div className={`forge-timer ${expired ? 'timer-expired' : ''}`}><StoryIcon name="hourglass" /><div><span className="hud-label">{progress.untimed ? 'YOUR OWN PACE' : 'ELABORATING TIME'}</span><span role="timer" aria-live="off" aria-label="Elaborating time remaining">{progress.untimed ? 'Untimed' : formatGenerateTime(progress.remainingMs)}</span></div>{working && !progress.untimed && <button aria-label={progress.timerPaused ? 'Resume timer' : 'Pause timer'} onClick={() => onChange(state => ({ ...state, timerPaused: !state.timerPaused }))}>{progress.timerPaused ? <Play /> : <Pause />}</button>}</div><button className="elaborate-meter" aria-label={`Open infusion collection, ${progress.infusions.length} infusions`} onClick={() => onChange(state => ({ ...state, step: 'review' }))}><FlaskConical /><span><small>INFUSIONS</small><strong>{readyCount} / {progress.infusions.length} ready</strong></span></button>{working && <button className="timer-mode" aria-pressed={progress.untimed} onClick={() => onChange(state => ({ ...state, untimed: !state.untimed, remainingMs: state.remainingMs || ELABORATE_DURATION_MS }))}>{progress.untimed ? 'Use timer' : 'Elaborate without a timer'}</button>}</div>

    {progress.step === 'intro' && <Frame className="elaborate-title scene-enter"><p className="eyebrow">The Forge of Ideas</p><h1 ref={heading} tabIndex={-1}>Elaborating on Ideas</h1><Ornament /><p>Your connected ideas are ready to develop.</p><span className="stage-number">STAGE 05</span><button className="elaborate-intro-machine" onClick={enterChoose} aria-label="Enter the elaborating chamber"><FlaskConical aria-hidden="true" /><span>Touch the chamber</span></button></Frame>}

    {(progress.step === 'choose' || progress.step === 'develop') && <>
      <h1 ref={heading} tabIndex={-1} className="sr-only">Choose a connected crystal</h1>
      <Frame className="elaborate-crystal-tray"><p className="eyebrow">YOUR IDEA CRYSTALS</p><h2>Choose a connection</h2><div role="group" aria-label="Connected crystals" className="crystal-tray-list">{crystals.map(connection => <button key={connection.main} className={`crystal-choice ${drag.dragging === connection.main ? 'crystal-dragging' : ''}`} aria-label={`Select crystal: ${ideaFor(connection.main).label}`} {...(progress.step === 'choose' ? drag.handlers(connection.main) : { onClick: () => choose(connection.main) })}><SortGem id={connection.main} /><span>{ideaFor(connection.main).label}</span>{progress.infusions.some(infusion => infusion.main === connection.main) && <Check size={13} aria-label="Infusion started" />}</button>)}</div>{!crystals.length && <p>Return to Connect and finish a crystal first.</p>}</Frame>
      {progress.step === 'choose' && <div className={`elaborate-chamber-drop ${drag.over ? 'chamber-drag-over' : ''}`} data-elaborate-chamber aria-label="Central crystal chamber"><ConnectionCrystal /><button className="elaborate-chamber-tap" aria-label="Place a crystal in the central chamber" onClick={() => { if (crystals.length === 1) choose(crystals[0].main); else setChamberCue(true); }}><FlaskConical aria-hidden="true" /><span>{chamberCue && crystals.length !== 1 ? 'Choose a crystal on the left' : 'Place a crystal here'}</span></button></div>}
    </>}

    {progress.step === 'develop' && current && <>
      <h1 ref={heading} tabIndex={-1} className="sr-only">Develop your infusion</h1>
      <Frame className="elaborate-source"><p className="eyebrow">CONNECTED IDEA</p><h2>{ideaFor(current.main).label}</h2><p>{currentSource?.explanation ?? 'This crystal needs another review in Connect.'}</p><small>Use your classroom extract for any evidence you quote.</small><button className="text-link" onClick={onConnect}>Review connection <ArrowRight size={13} /></button></Frame>
      <button className="elaborate-chamber-active" onClick={() => setWriterOpen(true)} aria-label="Write elaborated response" title="Write elaborated response"><SortGem id={current.main} /></button>
      {writerOpen && <Modal title="Elaborate your idea" onClose={() => setWriterOpen(false)}><Frame className="infusion-editor"><p className="modal-intro">{currentSource?.explanation}</p><p className="eyebrow">DEVELOP YOUR RESPONSE</p><h2>{ideaFor(current.main).label}</h2><label htmlFor="infusion-response">Write how your evidence and writer’s choices develop this connection.</label><textarea id="infusion-response" value={current.response} maxLength={MAX_INFUSION_TEXT} onChange={event => onChange(state => writeInfusion(state, event.target.value))} placeholder="Use the runes for prompts. Write in your own words…" aria-describedby="infusion-help" /><div className="infusion-editor-count"><span id="infusion-help">{infusionIssue(current, connect, ideas, assignments) ?? 'Ready to turn into an infusion.'}</span><span>{current.response.length} / {MAX_INFUSION_TEXT}</span></div>{currentSource && current.sourceFingerprint !== JSON.stringify([currentSource.main, currentSource.supporting, currentSource.explanation]) && <button className="text-link" onClick={() => onChange(state => refreshInfusionSource(state, connect, ideas, assignments))}>Refresh from revised crystal</button>}<div className="infusion-editor-actions"><button className="text-link" onClick={() => { setWriterOpen(false); enterChoose(); }}>Choose another</button><GoldButton className="small" onClick={() => { setWriterOpen(false); onChange(state => ({ ...state, step: 'review' })); playSound(); }}>Review infusions <ArrowRight /></GoldButton></div></Frame><GoldButton onClick={() => setWriterOpen(false)}>Save response</GoldButton></Modal>}
      <div className="rune-choice-row" role="group" aria-label="Rune flasks">{RUNES.map((rune, index) => <button key={rune.id} style={{ '--rune-color': rune.color, '--flask-position': `${FLASK_POSITIONS[index]}%`, '--flask-top': index === 0 || index === 5 ? '61.5%' : '68.7%' } as React.CSSProperties} className={`rune-flask ${current.runes.includes(rune.id) ? 'rune-selected' : ''}`} aria-label={`${current.runes.includes(rune.id) ? 'Remove' : 'Add'} ${rune.label} rune`} aria-pressed={current.runes.includes(rune.id)} onClick={() => { setActiveRune(rune.id); onChange(state => toggleRune(state, rune.id)); playSound(); }}><RuneGlyph index={index} /><span className="rune-label">{rune.label}</span></button>)}</div>
      <div className="rune-hint" role="status">{cue ? <><strong>{cue.label}:</strong> {cue.cue}</> : 'Select at least two rune flasks for writing prompts.'}</div>
    </>}

    {progress.step === 'review' && <Frame className="infusion-review scene-enter"><p className="eyebrow">YOUR INFUSIONS</p><h1 ref={heading} tabIndex={-1}>{ready ? 'Ideas with greater depth.' : 'Infusions in progress.'}</h1><p>{readyCount} of {progress.infusions.length} infusions ready. Select a flask to inspect or revise your writing.</p>{infusionList()}</Frame>}

    {progress.step !== 'develop' && <section key={progress.step} className="dialogue-scroll elaborate-dialogue" aria-label="Raven dialogue"><div className="scroll-paper" aria-hidden="true" /><div className="scroll-roll roll-left" aria-hidden="true" /><div className="scroll-roll roll-right" aria-hidden="true" /><div className="dialogue-content"><div className="dialogue-topline"><span className="speaker-label"><Feather />YOUR RAVEN GUIDE</span><span className="dialogue-pagination">05 · ELABORATE</span></div><p className="dialogue-copy">{progress.step === 'intro' ? 'The chamber turns your connected ideas into infusions. Choose a crystal, use the rune flasks to guide your thinking, and write a fuller response in your own words.' : progress.step === 'choose' ? crystals.length ? SCRIPT.elaborateChoose : 'Your crystals need attention first. Return to Connect and complete a valid connection.' : ready ? SCRIPT.infusions : expired ? 'Time for a pause. Your writing is saved. Inspect drafts, or continue untimed.' : 'Select an infusion to inspect its writing. Complete at least one, and review every draft before finishing this stage.'}</p><div className="elaborate-dialogue-actions"><span>{progress.step === 'review' ? 'Your writing is saved locally; no automatic literary score.' : '40-minute timer · pause or choose untimed play'}</span>{progress.step === 'intro' && <GoldButton className="small" onClick={enterChoose}>Enter the chamber <ArrowRight /></GoldButton>}{progress.step === 'choose' && <><button className="parchment-link" onClick={onConnect}>Review Stage 4</button><GoldButton className="small" disabled>Select a crystal</GoldButton></>}{progress.step === 'review' && <><button className="parchment-link" onClick={enterChoose}>{expired ? 'Continue untimed' : 'Make another infusion'}</button><GoldButton className="small" disabled={!ready} onClick={onComplete}>{progress.completed ? 'Return to journey' : 'Complete Stage 5'} <ArrowRight /></GoldButton></>}</div></div><div className="dialogue-navigation"><RoundButton label="Previous" onClick={progress.step === 'intro' ? onReturn : progress.step === 'choose' ? () => onChange(state => ({ ...state, step: 'intro' })) : enterChoose}><ChevronLeft /></RoundButton></div></section>}
    {progress.step === 'develop' && <nav className="scene-navigation" aria-label="Scene navigation"><RoundButton label="Previous" onClick={enterChoose}><StoryIcon name="previous" /></RoundButton><RoundButton label="Review infusions" onClick={() => { if (current && infusionIssue(current, connect, ideas, assignments)) setWriterOpen(true); else { onChange(state => ({ ...state, step: 'review' })); playSound(); } }}><StoryIcon name="next" /></RoundButton></nav>}

    {inspected && <Modal title={`${ideaFor(inspected.main).label} infusion`} onClose={() => setInspectMain(null)} className="infusion-inspect"><div className="inspected-vial"><InfusionVial main={inspected.main} /></div><p className="modal-intro">{inspected.runes.map(id => RUNES.find(rune => rune.id === id)!.label).join(' · ') || 'No runes selected yet'}</p><p className="inspected-response">{inspected.response || 'No elaborated response written yet.'}</p><p className="inspected-status">{infusionIssue(inspected, connect, ideas, assignments) ?? 'Ready to carry forward.'}</p><div className="modal-actions"><GoldButton onClick={() => { choose(inspected.main); setWriterOpen(true); }} disabled={!crystals.some(connection => connection.main === inspected.main)}>Edit infusion</GoldButton><button className="quiet-button" onClick={() => { setInspectMain(null); setRemoveMain(inspected.main); }}><Trash2 size={14} /> Remove</button></div></Modal>}
    {removeMain && <Modal title="Remove this infusion?" onClose={() => setRemoveMain(null)}><p className="modal-intro">This removes the rune choices and written response for {ideaFor(removeMain).label}. Your Stage 4 crystal remains available.</p><div className="modal-actions"><GoldButton onClick={() => { const main = removeMain; onChange(state => ({ ...state, infusions: state.infusions.filter(infusion => infusion.main !== main), activeMain: state.activeMain === main ? null : state.activeMain, step: 'review', completed: false })); setRemoveMain(null); }}>Remove infusion</GoldButton><button className="quiet-button" onClick={() => setRemoveMain(null)}>Keep infusion</button></div></Modal>}
    {drag.ghost}
  </div>;
}
