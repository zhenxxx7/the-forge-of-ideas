import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, Feather, FlaskConical, Hourglass, Pause, Play, RotateCcw, Trash2 } from 'lucide-react';
import { playSound } from '../audio';
import { IDEA_PROMPTS, formatGenerateTime } from '../stage2';
import type { IdeaId } from '../stage2';
import type { SortAssignments } from '../stage3';
import type { ConnectProgress } from '../stage4';
import { advanceElaborateTimer, chooseCrystal, ELABORATE_DURATION_MS, eligibleCrystals, infusionIssue, infusionsReady, MAX_INFUSION_TEXT, refreshInfusionSource, RUNES, toggleRune, writeInfusion } from '../stage5';
import type { ElaborateProgress, RuneId } from '../stage5';
import { ConnectionCrystal } from './ConnectionCrystal';
import { Frame, GoldButton, RoundButton } from './GameUI';
import { InfusionVial } from './InfusionVial';
import { Modal } from './Modal';
import { Ornament } from './Ornament';
import { useCrystalDrag } from './useCrystalDrag';

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

export function ElaborateStage({ progress, connect, ideas, assignments, paused, reducedMotion, onChange, onReturn, onConnect, onComplete }: Props) {
  const [visible, setVisible] = useState(!document.hidden);
  const [activeRune, setActiveRune] = useState<RuneId | null>(null);
  const [inspectMain, setInspectMain] = useState<IdeaId | null>(null);
  const [removeMain, setRemoveMain] = useState<IdeaId | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const crystals = eligibleCrystals(connect, ideas, assignments);
  const current = progress.infusions.find(infusion => infusion.main === progress.activeMain);
  const currentSource = connect.connections.find(connection => connection.main === progress.activeMain);
  const working = progress.step === 'choose' || progress.step === 'develop';
  const modalOpen = inspectMain !== null || removeMain !== null;
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
    setActiveRune(null); playSound();
  }
  function choose(id: IdeaId) {
    if (!crystals.some(connection => connection.main === id)) return;
    onChange(state => chooseCrystal(state, id, connect, ideas, assignments));
    setActiveRune(null); setInspectMain(null); playSound('chime');
  }
  const drag = useCrystalDrag(progress.step !== 'choose' || paused || modalOpen || !visible, choose);

  function infusionList() {
    return <div className="infusion-list">{progress.infusions.map(infusion => {
      const issue = infusionIssue(infusion, connect, ideas, assignments);
      return <button key={infusion.main} className={`infusion-card ${issue ? 'infusion-draft' : 'infusion-ready'}`} aria-label={`Inspect infusion: ${ideaFor(infusion.main).label}`} onClick={() => setInspectMain(infusion.main)}><InfusionVial main={infusion.main} /><strong>{ideaFor(infusion.main).label}</strong><span>{infusion.runes.length} runes · {issue ? 'Needs review' : 'Ready'}</span></button>;
    })}{!progress.infusions.length && <p className="no-infusions">No infusions yet. Choose one of your connected crystals to begin.</p>}</div>;
  }

  return <div className={`elaborate-stage ${still ? 'elaborate-still' : ''}`}>
    <div className="elaborate-hud"><div className={`forge-timer ${expired ? 'timer-expired' : ''}`}><Hourglass aria-hidden="true" /><div><span className="hud-label">{progress.untimed ? 'YOUR OWN PACE' : 'ELABORATING TIME'}</span><span role="timer" aria-live="off" aria-label="Elaborating time remaining">{progress.untimed ? 'Untimed' : formatGenerateTime(progress.remainingMs)}</span></div>{working && !progress.untimed && <button aria-label={progress.timerPaused ? 'Resume timer' : 'Pause timer'} onClick={() => onChange(state => ({ ...state, timerPaused: !state.timerPaused }))}>{progress.timerPaused ? <Play /> : <Pause />}</button>}</div><button className="elaborate-meter" aria-label={`Open infusion collection, ${progress.infusions.length} infusions`} onClick={() => onChange(state => ({ ...state, step: 'review' }))}><FlaskConical /><span><small>INFUSIONS</small><strong>{readyCount} / {progress.infusions.length} ready</strong></span></button>{working && <button className="timer-mode" aria-pressed={progress.untimed} onClick={() => onChange(state => ({ ...state, untimed: !state.untimed, remainingMs: state.remainingMs || ELABORATE_DURATION_MS }))}>{progress.untimed ? 'Use timer' : 'Elaborate without a timer'}</button>}</div>

    {progress.step === 'intro' && <Frame className="elaborate-title scene-enter"><p className="eyebrow">THE FORGE OF IDEAS</p><h1 ref={heading} tabIndex={-1}>Elaborating on Ideas</h1><Ornament /><p>Your connected ideas are ready to develop.</p><span className="stage-number">STAGE 05</span></Frame>}

    {progress.step === 'choose' && <>
      <h1 ref={heading} tabIndex={-1} className="sr-only">Choose a connected crystal</h1>
      <Frame className="elaborate-crystal-tray"><p className="eyebrow">YOUR IDEA CRYSTALS</p><h2>Choose a connection</h2><div role="group" aria-label="Connected crystals" className="crystal-tray-list">{crystals.map(connection => <button key={connection.main} className={`crystal-choice ${drag.dragging === connection.main ? 'crystal-dragging' : ''}`} aria-label={`Select crystal: ${ideaFor(connection.main).label}`} {...drag.handlers(connection.main)}><ConnectionCrystal strengthened={connection.supporting.length === 2} /><span>{ideaFor(connection.main).label}</span>{progress.infusions.some(infusion => infusion.main === connection.main) && <Check size={13} aria-label="Infusion started" />}</button>)}</div>{!crystals.length && <p>Return to Connect and finish a crystal first.</p>}</Frame>
      <div className={`elaborate-chamber-drop ${drag.over ? 'chamber-drag-over' : ''}`} data-elaborate-chamber aria-label="Central crystal chamber"><span>PLACE A CRYSTAL HERE</span><ConnectionCrystal /></div>
    </>}

    {progress.step === 'develop' && current && <>
      <h1 ref={heading} tabIndex={-1} className="sr-only">Develop your infusion</h1>
      <Frame className="elaborate-source"><p className="eyebrow">CONNECTED IDEA</p><h2>{ideaFor(current.main).label}</h2><p>{currentSource?.explanation ?? 'This crystal needs another review in Connect.'}</p><small>Use your classroom extract for any evidence you quote.</small><button className="text-link" onClick={onConnect}>Review connection <ArrowRight size={13} /></button></Frame>
      <div className="elaborate-chamber-active" aria-hidden="true"><ConnectionCrystal strengthened={(currentSource?.supporting.length ?? 0) === 2} /></div>
      <Frame className="infusion-editor"><p className="eyebrow">DEVELOP YOUR RESPONSE</p><h2>{ideaFor(current.main).label}</h2><label htmlFor="infusion-response">Write how your evidence and writer’s choices develop this connection.</label><textarea id="infusion-response" value={current.response} maxLength={MAX_INFUSION_TEXT} onChange={event => onChange(state => writeInfusion(state, event.target.value))} placeholder="Use the runes for prompts. Write in your own words…" aria-describedby="infusion-help" /><div className="infusion-editor-count"><span id="infusion-help">{infusionIssue(current, connect, ideas, assignments) ?? 'Ready to turn into an infusion.'}</span><span>{current.response.length} / {MAX_INFUSION_TEXT}</span></div>{currentSource && current.sourceFingerprint !== JSON.stringify([currentSource.main, currentSource.supporting, currentSource.explanation]) && <button className="text-link" onClick={() => onChange(state => refreshInfusionSource(state, connect, ideas, assignments))}>Refresh from revised crystal</button>}<div className="infusion-editor-actions"><button className="text-link" onClick={enterChoose}>Choose another</button><GoldButton className="small" onClick={() => { onChange(state => ({ ...state, step: 'review' })); playSound(); }}>Review infusions <ArrowRight /></GoldButton></div></Frame>
      <div className="rune-choice-row" role="group" aria-label="Rune flasks">{RUNES.map((rune, index) => <button key={rune.id} style={{ '--rune-color': rune.color, '--flask-position': `${[20.7, 31.3, 42.7, 54.5, 66.3, 78.2][index]}%`, '--flask-top': index === 0 || index === 5 ? '60%' : '68%' } as React.CSSProperties} className={`rune-flask ${current.runes.includes(rune.id) ? 'rune-selected' : ''}`} aria-label={`${current.runes.includes(rune.id) ? 'Remove' : 'Add'} ${rune.label} rune`} aria-pressed={current.runes.includes(rune.id)} onClick={() => { setActiveRune(rune.id); onChange(state => toggleRune(state, rune.id)); playSound(); }}><span className="rune-glyph" aria-hidden="true">{rune.glyph}</span><span className="rune-label">{rune.label}</span></button>)}</div>
      <div className="rune-hint" role="status">{cue ? <><strong>{cue.label}:</strong> {cue.cue}</> : 'Select at least two rune flasks for writing prompts.'}</div>
    </>}

    {progress.step === 'review' && <Frame className="infusion-review scene-enter"><p className="eyebrow">YOUR INFUSIONS</p><h1 ref={heading} tabIndex={-1}>{ready ? 'Ideas with greater depth.' : 'Infusions in progress.'}</h1><p>{readyCount} of {progress.infusions.length} infusions ready. Select a flask to inspect or revise your writing.</p>{infusionList()}</Frame>}

    {progress.step !== 'develop' && <section className="dialogue-scroll elaborate-dialogue" aria-label="Raven dialogue"><div className="scroll-paper" aria-hidden="true" /><div className="scroll-roll roll-left" aria-hidden="true" /><div className="scroll-roll roll-right" aria-hidden="true" /><div className="dialogue-content"><div className="dialogue-topline"><span className="speaker-label"><Feather />YOUR RAVEN GUIDE</span><span className="dialogue-pagination">05 · ELABORATE</span></div><p className="dialogue-copy">{progress.step === 'intro' ? 'The chamber turns your connected ideas into infusions. Choose a crystal, use the rune flasks to guide your thinking, and write a fuller response in your own words.' : progress.step === 'choose' ? crystals.length ? 'Drag a crystal into the central chamber, or select one from the collection. The six rune flasks will then offer ways to develop your response.' : 'Your crystals need attention first. Return to Connect and complete a valid connection.' : ready ? 'Beautiful infusions. Select one to inspect its runes and your response. Return whenever you want to refine your thinking.' : expired ? 'Time for a pause. Your writing is saved. Inspect drafts, or continue untimed.' : 'Select an infusion to inspect its writing. Complete at least one, and review every draft before finishing this stage.'}</p><div className="elaborate-dialogue-actions"><span>{progress.step === 'review' ? 'Your writing is saved locally; no automatic literary score.' : '40-minute timer · pause or choose untimed play'}</span>{progress.step === 'intro' && <GoldButton className="small" onClick={enterChoose}>Enter the chamber <ArrowRight /></GoldButton>}{progress.step === 'choose' && <button className="parchment-link" onClick={onConnect}>Review Stage 4</button>}{progress.step === 'review' && <><button className="parchment-link" onClick={enterChoose}>{expired ? 'Continue untimed' : 'Make another infusion'}</button><GoldButton className="small" disabled={!ready} onClick={onComplete}>{progress.completed ? 'Return to journey' : 'Complete Stage 5'} <ArrowRight /></GoldButton></>}</div></div><div className="dialogue-navigation"><RoundButton label="Previous" onClick={progress.step === 'intro' || progress.step === 'choose' ? onReturn : enterChoose}><ChevronLeft /></RoundButton></div></section>}
    {progress.step === 'develop' && <button className="elaborate-back" onClick={enterChoose}><RotateCcw size={13} /> Choose another crystal</button>}

    {inspected && <Modal title={`${ideaFor(inspected.main).label} infusion`} onClose={() => setInspectMain(null)} className="infusion-inspect"><div className="inspected-vial"><InfusionVial main={inspected.main} /></div><p className="modal-intro">{inspected.runes.map(id => RUNES.find(rune => rune.id === id)!.label).join(' · ') || 'No runes selected yet'}</p><p className="inspected-response">{inspected.response || 'No elaborated response written yet.'}</p><p className="inspected-status">{infusionIssue(inspected, connect, ideas, assignments) ?? 'Ready to carry forward.'}</p><div className="modal-actions"><GoldButton onClick={() => choose(inspected.main)} disabled={!crystals.some(connection => connection.main === inspected.main)}>Edit infusion</GoldButton><button className="quiet-button" onClick={() => { setInspectMain(null); setRemoveMain(inspected.main); }}><Trash2 size={14} /> Remove</button></div></Modal>}
    {removeMain && <Modal title="Remove this infusion?" onClose={() => setRemoveMain(null)}><p className="modal-intro">This removes the rune choices and written response for {ideaFor(removeMain).label}. Your Stage 4 crystal remains available.</p><div className="modal-actions"><GoldButton onClick={() => { const main = removeMain; onChange(state => ({ ...state, infusions: state.infusions.filter(infusion => infusion.main !== main), activeMain: state.activeMain === main ? null : state.activeMain, step: 'review', completed: false })); setRemoveMain(null); }}>Remove infusion</GoldButton><button className="quiet-button" onClick={() => setRemoveMain(null)}>Keep infusion</button></div></Modal>}
    {drag.ghost}
  </div>;
}
