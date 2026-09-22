import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, Feather, Gem, Hourglass, Link2, Pause, Play, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { formatGenerateTime, IDEA_PROMPTS } from '../stage2';
import type { IdeaId } from '../stage2';
import type { SortAssignments } from '../stage3';
import { advanceConnectTimer, canForge, connectionIssue, connectionsReady, CONNECT_DURATION_MS, eligibleIdeas, explainConnection, forgeConnection, MAX_CONNECTION_TEXT, removeSupportingIdea } from '../stage4';
import type { ConnectProgress, IdeaConnection } from '../stage4';
import { playSound } from '../audio';
import { Frame, GoldButton, RoundButton } from './GameUI';
import { Modal } from './Modal';
import { Ornament } from './Ornament';
import { SortGem } from './SortGem';
import { ConnectionCrystal } from './ConnectionCrystal';
import { useConnectionDrag } from './useConnectionDrag';
import type { ConnectionSlot } from './useConnectionDrag';

type Props = {
  progress: ConnectProgress;
  ideas: readonly IdeaId[];
  assignments: SortAssignments;
  paused: boolean;
  reducedMotion: boolean;
  onChange: (update: (current: ConnectProgress) => ConnectProgress) => void;
  onReturn: () => void;
  onSort: () => void;
  onComplete: () => void;
};
const ideaFor = (id: IdeaId) => IDEA_PROMPTS.find(idea => idea.id === id)!;

export function ConnectStage({ progress, ideas, assignments, paused, reducedMotion, onChange, onReturn, onSort, onComplete }: Props) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [removeMain, setRemoveMain] = useState<IdeaId | null>(null);
  const [feedback, setFeedback] = useState('Select one ore from each collection, or drag it into its receptacle.');
  const [visible, setVisible] = useState(!document.hidden);
  const [forgeVersion, setForgeVersion] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const eligible = eligibleIdeas(ideas, assignments);
  const hasPair = eligible.central.length > 0 && eligible.supporting.length > 0;
  const current = progress.connections.find(item => item.main === progress.mainIdea);
  const working = progress.step === 'combine' || progress.step === 'explain';
  const expired = progress.remainingMs === 0 && !progress.untimed;
  const modalOpen = libraryOpen || removeMain !== null;
  const motionPaused = paused || modalOpen || progress.timerPaused || !visible || !working;
  const ready = connectionsReady(progress, ideas, assignments);
  const validCount = progress.connections.filter(connection => !connectionIssue(connection, ideas, assignments)).length;

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
      if (wasVisible) onChange(state => advanceConnectTimer(state, elapsed));
    };
    const visibility = () => { tick(); wasVisible = !document.hidden; };
    const interval = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', visibility); tick(); };
  }, [working, progress.timerPaused, progress.untimed, paused, modalOpen, onChange]);

  function selectOre(id: IdeaId, slot: ConnectionSlot) {
    if (progress.step !== 'combine' || !eligible[slot].includes(id)) return;
    if (slot === 'central') onChange(state => ({ ...state, mainIdea: id, supportingIdea: null }));
    else onChange(state => ({ ...state, supportingIdea: id }));
    setFeedback(`${ideaFor(id).label} placed in the ${slot === 'central' ? 'central' : 'supporting'} receptacle.`);
    playSound();
  }
  const drag = useConnectionDrag(progress.step !== 'combine' || paused || modalOpen || !visible, selectOre, () => setFeedback('Use the matching receptacle. Your selection has not changed.'));

  function combine(main: IdeaId | null = progress.mainIdea) {
    onChange(state => ({ ...state, step: 'combine', mainIdea: main, supportingIdea: null, untimed: state.remainingMs === 0 ? true : state.untimed }));
    setFeedback('Select one ore from each collection, or drag it into its receptacle.');
    playSound();
  }
  function edit(connection: IdeaConnection) {
    setLibraryOpen(false);
    onChange(state => ({ ...state, step: 'explain', mainIdea: connection.main, supportingIdea: null, untimed: state.remainingMs === 0 ? true : state.untimed }));
    playSound();
  }
  function forge() {
    if (!canForge(progress, ideas, assignments)) return;
    onChange(state => forgeConnection(state, ideas, assignments));
    setForgeVersion(value => value + 1);
    setFeedback('Your ideas are connected. Explain the relationship in your own words.');
    playSound('chime');
  }

  function inventory(slot: ConnectionSlot) {
    const ids = eligible[slot];
    return <Frame className={`connect-inventory inventory-${slot}`}><div className="connect-inventory-heading"><h2>{slot === 'central' ? 'Central ideas' : 'Supporting ideas'}</h2><span>{ids.length} ores</span></div><div className="connect-inventory-grid" role="group" aria-label={`${slot === 'central' ? 'Central' : 'Supporting'} idea collection`}>{ids.map(id => <button key={id} className={`connection-ore ${progress.mainIdea === id || progress.supportingIdea === id ? 'ore-in-receptacle' : ''} ${drag.dragging === id ? 'ore-being-dragged' : ''}`} aria-label={`Select ${slot} idea: ${ideaFor(id).label}`} aria-pressed={progress.mainIdea === id || progress.supportingIdea === id} {...drag.handlers(id, slot)}><SortGem id={id} /><span>{ideaFor(id).label}</span>{current?.supporting.includes(id) && <Check className="linked-ore-check" aria-label="Already connected" />}</button>)}</div>{!ids.length && <p className="inventory-empty">No {slot} ideas yet. Revisit Sort.</p>}</Frame>;
  }

  function connectionList() {
    return <div className="connection-list">{progress.connections.map(connection => {
      const issue = connectionIssue(connection, ideas, assignments);
      return <article key={connection.main} className={issue ? 'connection-needs-review' : 'connection-finished'}><ConnectionCrystal strengthened={connection.supporting.length === 2} /><div><h3>{ideaFor(connection.main).label}</h3><p className="connection-pair-label">{connection.supporting.length ? connection.supporting.map(id => ideaFor(id).label).join(' + ') : 'No supporting idea yet'}</p><p className="connection-explanation-preview">{connection.explanation || 'A connecting statement is still waiting.'}</p><span className="connection-state">{issue ?? 'Ready to carry forward'}</span><div className="connection-item-actions"><button className="text-link" onClick={() => edit(connection)}>Edit {ideaFor(connection.main).label}</button><button className="icon-button" aria-label={`Remove crystal: ${ideaFor(connection.main).label}`} onClick={() => { setLibraryOpen(false); setRemoveMain(connection.main); }}><Trash2 /></button></div></div></article>;
    })}{!progress.connections.length && <div className="empty-connections"><Gem /><p>No crystals yet. Connect a central idea to a supporting idea to begin.</p></div>}</div>;
  }

  return <div className={`connect-stage ${motionPaused ? 'connect-motion-paused' : ''} ${reducedMotion ? 'connect-still' : ''}`}>
    <div className="connect-energy" aria-hidden="true"><i className="energy-left" /><i className="energy-right" /></div>
    <div className="connect-hud"><div className={`forge-timer ${expired ? 'timer-expired' : ''}`}><Hourglass aria-hidden="true" /><div><span className="hud-label">{progress.untimed ? 'YOUR OWN PACE' : 'CONNECTING TIME'}</span><span role="timer" aria-live="off" aria-label="Connecting time remaining">{progress.untimed ? 'Untimed' : formatGenerateTime(progress.remainingMs)}</span></div>{working && !progress.untimed && <button aria-label={progress.timerPaused ? 'Resume timer' : 'Pause timer'} onClick={() => onChange(state => ({ ...state, timerPaused: !state.timerPaused }))}>{progress.timerPaused ? <Play /> : <Pause />}</button>}</div><button className="connect-progress" aria-label={`Open crystal collection, ${progress.connections.length} crystals`} onClick={() => setLibraryOpen(true)}><Gem /><span><small>IDEA CRYSTALS</small><strong>{validCount}<span> / {progress.connections.length} ready</span></strong></span></button>{working && <button className="timer-mode" aria-pressed={progress.untimed} onClick={() => onChange(state => ({ ...state, untimed: !state.untimed, remainingMs: state.remainingMs || CONNECT_DURATION_MS }))}>{progress.untimed ? 'Use timer' : 'Connect without a timer'}</button>}</div>

    {progress.step === 'intro' && <Frame className="connect-title scene-enter"><p className="eyebrow">THE FORGE OF IDEAS</p><h1 ref={heading} tabIndex={-1}>Connecting Ideas</h1><Ornament /><p>Bring your ideas together.<br />Make the relationship clear.</p><span className="stage-number">STAGE 04</span></Frame>}

    {working && <>
      <h1 className="sr-only" ref={heading} tabIndex={-1}>{progress.step === 'combine' ? 'Connect your ideas' : 'Explain your connection'}</h1>
      {progress.step === 'combine' ? <>{inventory('central')}{inventory('supporting')}</> : current && <>
        <Frame className="connection-member member-main"><p className="eyebrow">YOUR CENTRAL IDEA</p><SortGem id={current.main} /><h2>{ideaFor(current.main).label}</h2><p>{ideaFor(current.main).text}</p></Frame>
        <Frame className="connection-member member-support"><p className="eyebrow">SUPPORTING IDEAS · {current.supporting.length} / 2</p>{current.supporting.map(id => <div className="support-member" key={id}><SortGem id={id} /><div><h2>{ideaFor(id).label}</h2><p>{ideaFor(id).text}</p></div><button className="icon-button" aria-label={`Disconnect ${ideaFor(id).label}`} onClick={() => onChange(state => removeSupportingIdea(state, current.main, id))}><X /></button></div>)}{!current.supporting.length && <p>Add a supporting idea to give this crystal a connection.</p>}<button className="text-link" disabled={current.supporting.length >= 2} onClick={() => combine(current.main)}><Plus /> Add supporting idea</button></Frame>
      </>}

      <div className="chamber-visual" aria-hidden="true">{current && current.supporting.length > 0 ? <div key={`${current.main}-${forgeVersion}`} className="crystal-materialize"><ConnectionCrystal strengthened={current.supporting.length === 2} /><span className="crystal-halo" /></div> : <div className="chamber-spark"><Link2 /></div>}</div>

      {progress.step === 'combine' && <>
        <div className={`connect-receptacle receptacle-central ${drag.over === 'central' ? 'receptacle-drag-over' : ''}`} data-connect-slot="central"><span className="receptacle-label">CENTRAL IDEA</span>{progress.mainIdea ? <><SortGem id={progress.mainIdea} /><strong>{ideaFor(progress.mainIdea).label}</strong><button className="receptacle-clear" aria-label="Clear central receptacle" onClick={() => onChange(state => ({ ...state, mainIdea: null }))}><X /></button></> : <span className="receptacle-empty">Select or drop a central ore</span>}</div>
        <div className={`connect-receptacle receptacle-supporting ${drag.over === 'supporting' ? 'receptacle-drag-over' : ''}`} data-connect-slot="supporting"><span className="receptacle-label">SUPPORTING IDEA</span>{progress.supportingIdea ? <><SortGem id={progress.supportingIdea} /><strong>{ideaFor(progress.supportingIdea).label}</strong><button className="receptacle-clear" aria-label="Clear supporting receptacle" onClick={() => onChange(state => ({ ...state, supportingIdea: null }))}><X /></button></> : <span className="receptacle-empty">Select or drop a supporting ore</span>}</div>
        {!hasPair && <Frame className="connect-missing"><h2>A connection needs two kinds of idea.</h2><p>{!eligible.central.length && !eligible.supporting.length ? 'Your pouch has no central or supporting ideas.' : !eligible.central.length ? 'Your sorting has no central idea yet.' : 'Your sorting has no supporting idea yet.'} Reconsider the categories in Sort. Nothing will be changed for you.</p><GoldButton className="small" onClick={onSort}>Revisit sorting <ArrowRight /></GoldButton></Frame>}
      </>}
    </>}

    {progress.step === 'review' && <Frame className="connect-review-panel scene-enter"><p className="eyebrow">{expired ? 'TIME TO REFLECT' : 'YOUR CRYSTAL COLLECTION'}</p><h1 ref={heading} tabIndex={-1}>{ready ? 'Ideas, stronger together.' : 'Connections in the making.'}</h1><p>{validCount} of {progress.connections.length} crystals ready. Your statements describe your thinking, not a graded answer.</p>{connectionList()}<button className="text-link" onClick={() => setLibraryOpen(true)}>Read all connections <ArrowRight /></button></Frame>}

    <section className="dialogue-scroll connect-dialogue" aria-label="Raven dialogue"><div className="scroll-paper" aria-hidden="true" /><div className="scroll-roll roll-left" aria-hidden="true" /><div className="scroll-roll roll-right" aria-hidden="true" /><div className="dialogue-content"><div className="dialogue-topline"><span className="speaker-label"><Feather />{progress.step === 'explain' ? 'MAKE THE RELATIONSHIP CLEAR' : 'YOUR RAVEN GUIDE'}</span><span className="dialogue-pagination">04 · CONNECT</span></div>
      {progress.step === 'intro' && <p className="dialogue-copy">As you gathered and sorted ideas, connections may already have begun to appear. Now pair a central idea with a supporting idea. Their connection becomes a crystal; your own words will explain what holds it together.</p>}
      {progress.step === 'combine' && <><div className="connection-readout"><div><span>CENTRAL</span><p>{progress.mainIdea ? ideaFor(progress.mainIdea).text : 'Choose the main point you want to develop.'}</p></div><div><span>SUPPORTING</span><p>{progress.supportingIdea ? ideaFor(progress.supportingIdea).text : 'Choose a supporting idea that develops your main point.'}</p></div></div>{current && <p className="connection-hint">This central idea already has {current.supporting.length} of 2 supporting ideas.{current.supporting.length === 2 ? ' Review its crystal or choose a different central idea.' : ' Add one more, or review the existing crystal.'}</p>}</>}
      {progress.step === 'explain' && current && <div className="connection-writing"><label htmlFor="connecting-statement">How does the supporting idea develop your central idea and help answer the question?</label><textarea id="connecting-statement" value={current.explanation} maxLength={MAX_CONNECTION_TEXT} onChange={event => onChange(state => explainConnection(state, current.main, event.target.value))} placeholder="Explain the relationship in your own words…" aria-describedby="connection-writing-help" rows={3} /><div id="connection-writing-help"><span>{connectionIssue(current, ideas, assignments) ?? 'Your statement is saved locally. You can refine it anytime.'}</span><span>{current.explanation.length} / {MAX_CONNECTION_TEXT}</span></div></div>}
      {progress.step === 'review' && <p className="dialogue-copy">{ready ? 'You have brought your main and supporting ideas together and explained their relationships. Revisit any crystal to refine your thinking. These connections are the starting points for a more developed response.' : 'Your writing and selected ideas are safe. Review the crystals that still need attention, or return to Sort if their categories have changed. Complete at least one explained connection before moving on.'}</p>}
      <div className="connect-dialogue-actions"><span role="status">{progress.step === 'intro' ? '60-minute timer · pause or choose untimed play' : progress.step === 'combine' ? feedback : progress.step === 'explain' ? 'One central idea · up to two supporting ideas' : 'Saved writing is never removed by a sorting change.'}</span>
        {progress.step === 'intro' && <GoldButton className="small" onClick={() => combine(null)}>Enter the chamber <ArrowRight /></GoldButton>}
        {progress.step === 'combine' && <>{current && <button className="parchment-link" onClick={() => edit(current)}>Review this crystal</button>}<GoldButton className="small" disabled={!canForge(progress, ideas, assignments)} onClick={forge}>{current?.supporting.length ? 'Strengthen crystal' : 'Forge connection'} <Link2 /></GoldButton></>}
        {progress.step === 'explain' && current && <><button className="parchment-link" onClick={() => combine(null)}>Connect another idea</button><GoldButton className="small" disabled={!!connectionIssue(current, ideas, assignments)} onClick={() => { onChange(state => ({ ...state, step: 'review' })); playSound(); }}>Review connections <ArrowRight /></GoldButton></>}
        {progress.step === 'review' && <><button className="parchment-link" onClick={() => combine(null)}>{expired ? 'Continue untimed' : 'Make another connection'}</button><GoldButton className="small" disabled={!ready} onClick={onComplete}>{progress.completed ? 'Return to journey' : 'Complete Stage 4'} <ArrowRight /></GoldButton></>}
      </div></div><div className="dialogue-navigation"><RoundButton label="Previous" onClick={progress.step === 'intro' || progress.step === 'combine' ? onReturn : () => combine()}><ChevronLeft /></RoundButton></div></section>

    {libraryOpen && <Modal title="Your idea crystals" onClose={() => setLibraryOpen(false)} className="connection-library"><p className="modal-intro">Keep your connections open to revision. Any statement needing attention stays here until you revise or deliberately remove it.</p>{connectionList()}<GoldButton onClick={() => setLibraryOpen(false)}>Return to the chamber</GoldButton></Modal>}
    {removeMain && <Modal title="Remove this crystal?" onClose={() => setRemoveMain(null)}><p className="modal-intro">This removes the connection and its written statement for {ideaFor(removeMain).label}. Your original ores and sorting decisions stay unchanged. Download your journal first if you want a copy.</p><div className="modal-actions"><GoldButton onClick={() => { const main = removeMain; onChange(state => ({ ...state, connections: state.connections.filter(item => item.main !== main), mainIdea: state.mainIdea === main ? null : state.mainIdea, completed: false, step: 'review' })); setRemoveMain(null); }}>Remove crystal</GoldButton><button className="quiet-button" onClick={() => setRemoveMain(null)}>Keep crystal</button></div></Modal>}
    {drag.ghost}
    {working && <button className="connect-back-sort" onClick={onSort}><RotateCcw /> Revisit Sort</button>}
  </div>;
}
