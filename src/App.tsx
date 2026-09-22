import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Bird, Check, ChevronLeft, ChevronRight, Compass, Download, Feather, Home, LockKeyhole, Maximize, Minimize, RotateCcw, ScrollText, Settings2, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { KEYWORDS, STAGES, prologue } from './data';
import type { Keyword, Screen } from './data';
import { cleanName, newSave, persistSave, readSave, readSettings, SETTINGS_KEY } from './state';
import type { Save, Settings } from './state';
import { playSound, setSound } from './audio';
import { Atmosphere } from './game/Atmosphere';
import { Ornament } from './components/Ornament';
import { Modal } from './components/Modal';
import { Raven } from './components/Raven';
import { Frame, GoldButton, RoundButton } from './components/GameUI';
import { GenerateStage } from './components/GenerateStage';
import { IDEA_PROMPTS } from './stage2';
import type { GenerateProgress } from './stage2';
import { SortStage } from './components/SortStage';
import { allIdeasSorted, reconcileSort, SORT_CATEGORIES } from './stage3';
import type { SortProgress } from './stage3';
import { ConnectStage } from './components/ConnectStage';
import { connectionIssue, connectionsReady, reconcileConnect } from './stage4';
import type { ConnectProgress } from './stage4';
import { ElaborateStage } from './components/ElaborateStage';
import { infusionIssue, infusionsReady, reconcileElaborate, RUNES } from './stage5';
import type { ElaborateProgress } from './stage5';
import { ChallengeStage } from './components/ChallengeStage';
import { readyInfusions, reconcileChallenge, targetHits } from './stage6';
import type { ChallengeProgress } from './stage6';
import { EndingStage } from './components/EndingStage';
import { reconcileEnding } from './ending';
import type { EndingProgress } from './ending';

type Overlay = 'help' | 'journal' | 'settings' | 'restart' | 'complete' | null;

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [save, setSave] = useState<Save | null>(readSave);
  const [settings, setSettings] = useState<Settings>(readSettings);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [activeKeyword, setActiveKeyword] = useState<Keyword | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [toast, setToast] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const gameFrame = useRef<HTMLDivElement>(null);
  const active = screen === 'prologue' || screen === 'prepare' || screen === 'journey' || screen === 'generate' || screen === 'sort' || screen === 'connect' || screen === 'elaborate' || screen === 'challenge' || screen === 'ending';
  const explored = save?.explored ?? [];
  const allExplored = explored.length === 3;
  const pages = prologue(save?.name ?? 'adventurer');
  const dialogueIndex = save?.prologueIndex ?? 0;
  const currentKeyword = KEYWORDS.find((keyword) => keyword.id === activeKeyword);
  const stage2Complete = save?.generate.completed === true;
  const stage3Complete = stage2Complete && save?.sort.completed === true;
  const stage4Complete = stage3Complete && save?.connect.completed === true;
  const stage5Complete = stage4Complete && save?.elaborate.completed === true;
  const stage6Complete = stage5Complete && save?.challenge.completed === true;
  const generateLabel = stage2Complete ? 'Review Stage 2' : save?.generate.step === 'entrance' ? 'Start Stage 2' : 'Continue Stage 2';
  const sortLabel = stage3Complete ? 'Review Stage 3' : save?.sort.step === 'intro' ? 'Start Stage 3' : 'Continue Stage 3';
  const connectLabel = stage4Complete ? 'Review Stage 4' : save?.connect.step === 'intro' ? 'Start Stage 4' : 'Continue Stage 4';
  const elaborateLabel = stage5Complete ? 'Review Stage 5' : save?.elaborate.step === 'intro' ? 'Start Stage 5' : 'Continue Stage 5';
  const challengeLabel = stage6Complete ? 'Review Stage 6' : save?.challenge.step === 'intro' ? 'Start Stage 6' : 'Continue Stage 6';
  const updateGenerate = useCallback((update: (current: GenerateProgress) => GenerateProgress) => {
    setSave(current => {
      if (!current?.completed) return current;
      const generate = update(current.generate);
      if (generate === current.generate) return current;
      const pouchChanged = generate.selected.length !== current.generate.selected.length || generate.selected.some(id => !current.generate.selected.includes(id));
      const sort = pouchChanged ? reconcileSort(current.sort, generate.selected) : current.sort;
      const connect = pouchChanged ? reconcileConnect(current.connect, generate.selected, sort.assignments) : current.connect;
      return { ...current, generate, sort, connect, elaborate: pouchChanged ? reconcileElaborate(current.elaborate, connect, generate.selected, sort.assignments) : current.elaborate, challenge: pouchChanged ? reconcileChallenge(current.challenge) : current.challenge, ending: pouchChanged ? reconcileEnding(current.ending) : current.ending };
    });
  }, []);
  const updateSort = useCallback((update: (current: SortProgress) => SortProgress) => {
    setSave(current => {
      if (!current?.generate.completed) return current;
      const sort = update(current.sort);
      if (sort === current.sort) return current;
      const changed = sort.assignments !== current.sort.assignments;
      const connect = changed ? reconcileConnect(current.connect, current.generate.selected, sort.assignments) : current.connect;
      return { ...current, sort, connect, elaborate: changed ? reconcileElaborate(current.elaborate, connect, current.generate.selected, sort.assignments) : current.elaborate, challenge: changed ? reconcileChallenge(current.challenge) : current.challenge, ending: changed ? reconcileEnding(current.ending) : current.ending };
    });
  }, []);
  const updateConnect = useCallback((update: (current: ConnectProgress) => ConnectProgress) => {
    setSave(current => {
      if (!current?.generate.completed || !current.sort.completed) return current;
      const connect = update(current.connect);
      const changed = connect.connections !== current.connect.connections;
      return connect === current.connect ? current : { ...current, connect, elaborate: changed ? reconcileElaborate(current.elaborate, connect, current.generate.selected, current.sort.assignments) : current.elaborate, challenge: changed ? reconcileChallenge(current.challenge) : current.challenge, ending: changed ? reconcileEnding(current.ending) : current.ending };
    });
  }, []);
  const updateElaborate = useCallback((update: (current: ElaborateProgress) => ElaborateProgress) => {
    setSave(current => {
      if (!current?.connect.completed) return current;
      const elaborate = update(current.elaborate);
      const changed = elaborate.infusions !== current.elaborate.infusions || elaborate.completed !== current.elaborate.completed;
      return elaborate === current.elaborate ? current : { ...current, elaborate, challenge: changed ? reconcileChallenge(current.challenge) : current.challenge, ending: changed ? reconcileEnding(current.ending) : current.ending };
    });
  }, []);
  const updateChallenge = useCallback((update: (current: ChallengeProgress) => ChallengeProgress) => {
    setSave(current => {
      if (!current?.elaborate.completed) return current;
      const challenge = update(current.challenge);
      return challenge === current.challenge ? current : { ...current, challenge, ending: !challenge.completed ? reconcileEnding(current.ending) : current.ending };
    });
  }, []);
  const updateEnding = useCallback((update: (current: EndingProgress) => EndingProgress) => {
    setSave(current => current?.challenge.completed ? { ...current, ending: update(current.ending) } : current);
  }, []);

  useEffect(() => {
    if (screen !== 'splash') return;
    const timeout = window.setTimeout(() => setScreen('landing'), settings.reducedMotion ? 700 : 2400);
    return () => clearTimeout(timeout);
  }, [screen, settings.reducedMotion]);

  useEffect(() => {
    if (save) setSaveFailed(!persistSave(save));
  }, [save]);

  useEffect(() => {
    setSound(settings.sound);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* Settings still apply in memory. */ }
  }, [settings]);

  useEffect(() => {
    if (screen === 'name') nameRef.current?.focus();
    else if (screen !== 'splash') heading.current?.focus({ preventScroll: true });
  }, [screen]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  function go(next: Screen) {
    if (next === 'generate' && !save?.completed) return;
    if (next === 'sort' && !save?.generate.completed) return;
    if (next === 'connect' && !stage3Complete) return;
    if (next === 'elaborate' && !stage4Complete) return;
    if (next === 'challenge' && !stage5Complete) return;
    if (next === 'ending' && !stage6Complete) return;
    playSound();
    setScreen(next);
    setActiveKeyword(null);
    if (next === 'prologue' || next === 'prepare' || next === 'journey' || next === 'generate' || next === 'sort' || next === 'connect' || next === 'elaborate' || next === 'challenge' || next === 'ending') {
      setSave((current) => current ? { ...current, screen: next } : current);
    }
  }

  function submitName(event: FormEvent) {
    event.preventDefault();
    const name = cleanName(nameInput);
    if (name.length < 2) {
      setNameError('Please enter at least 2 characters.');
      nameRef.current?.focus();
      return;
    }
    setSave(editingName && save ? { ...save, name, screen: 'prologue', prologueIndex: 0 } : newSave(name));
    setNameError('');
    setScreen('prologue');
    playSound('chime');
  }

  function begin() {
    setEditingName(false);
    if (save) setOverlay('restart');
    else { setNameInput(''); setNameError(''); go('name'); }
  }

  function chooseKeyword(id: Keyword) {
    setActiveKeyword(id);
    const fresh = !explored.includes(id);
    setSave((current) => current ? { ...current, explored: fresh ? [...current.explored, id] : current.explored } : current);
    playSound(fresh ? 'chime' : 'click');
  }

  function nextDialogue() {
    if (dialogueIndex < pages.length - 1) {
      setSave((current) => current ? { ...current, prologueIndex: current.prologueIndex + 1 } : current);
      playSound();
    } else go('prepare');
  }

  function previousDialogue() {
    if (dialogueIndex > 0) {
      setSave((current) => current ? { ...current, prologueIndex: current.prologueIndex - 1 } : current);
      playSound();
    } else { setEditingName(true); setNameInput(save?.name ?? ''); go('name'); }
  }

  function complete() {
    if (!allExplored) return;
    setSave((current) => current ? { ...current, completed: true, screen: 'journey' } : current);
    setOverlay('complete');
    playSound('chime');
  }

  function completeGenerate() {
    if (!save?.generate.selected.length) return;
    setSave(current => current ? { ...current, screen: 'journey', generate: { ...current.generate, step: 'collected', completed: true } } : current);
    setScreen('journey');
    setToast('Stage 2 complete. Sorting Ideas is now open.');
    playSound('chime');
  }

  function completeSort() {
    if (!save?.generate.completed || !allIdeasSorted(save.sort, save.generate.selected)) return;
    setSave(current => current ? { ...current, screen: 'journey', sort: { ...current.sort, step: 'review', completed: true } } : current);
    setScreen('journey');
    setToast('Stage 3 complete. Connecting Ideas is now open.');
    playSound('chime');
  }

  function completeConnect() {
    if (!save || !stage3Complete || !connectionsReady(save.connect, save.generate.selected, save.sort.assignments)) return;
    setSave(current => current ? { ...current, screen: 'journey', connect: { ...current.connect, step: 'review', completed: true } } : current);
    setScreen('journey');
    setToast('Stage 4 complete. Elaborating on Ideas is now open.');
    playSound('chime');
  }

  function completeElaborate() {
    if (!save || !stage4Complete || !infusionsReady(save.elaborate, save.connect, save.generate.selected, save.sort.assignments)) return;
    setSave(current => current ? { ...current, screen: 'journey', elaborate: { ...current.elaborate, step: 'review', completed: true } } : current);
    setScreen('journey');
    setToast('Stage 5 complete. The Beast challenge is now open.');
    playSound('chime');
  }

  function completeChallenge() {
    if (!save || !stage5Complete || !save.challenge.completed || save.challenge.hits < targetHits(readyInfusions(save.elaborate, save.connect, save.generate.selected, save.sort.assignments).length)) return;
    setSave(current => current ? { ...current, screen: 'ending', ending: { ...current.ending, step: 'portal' }, challenge: { ...current.challenge, step: 'won', completed: true } } : current);
    setScreen('ending');
    setToast('Stage 6 complete. The way to the Archival Hall is open.');
    playSound('chime');
  }

  function revisitSort() {
    setSave(current => current ? { ...current, screen: 'sort', sort: { ...current.sort, step: 'sorting', untimed: current.sort.remainingMs === 0 ? true : current.sort.untimed } } : current);
    setScreen('sort');
    playSound();
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else setToast('Fullscreen is not supported here. Try landscape view.');
    } catch { setToast('Fullscreen is unavailable in this browser window.'); }
  }

  function downloadNotes() {
    const text = [
      'THE FORGE OF IDEAS', `Adventurer: ${save?.name ?? 'Adventurer'}`, 'Stage 1: Prepare', '',
      'The Veldt — Ray Bradbury', 'Question: How does Bradbury make this moment so tense?', '',
      ...KEYWORDS.filter((keyword) => explored.includes(keyword.id)).flatMap((keyword) => [keyword.label.toUpperCase(), keyword.explanation, '']),
      save?.completed ? 'Stage 1 completed.' : `${explored.length}/3 key phrases explored.`,
      '', 'Stage 2: Generate',
      ...(save?.generate.selected ?? []).map(id => {
        const idea = IDEA_PROMPTS.find(item => item.id === id)!;
        return `[${idea.source}] ${idea.text}`;
      }),
      save?.generate.selected.length ? (stage2Complete ? 'Stage 2 completed.' : 'Idea gathering in progress.') : 'No ideas collected yet.',
      'Starter ideas are not quotations or a graded answer. Check them against your classroom extract.',
      '', 'Stage 3: Sort',
      ...SORT_CATEGORIES.flatMap(category => [category.label.toUpperCase(), ...(save?.generate.selected ?? []).filter(id => save?.sort.assignments[id] === category.id).map(id => IDEA_PROMPTS.find(idea => idea.id === id)!.text), '']),
      'STILL TO SORT', ...(save?.generate.selected ?? []).filter(id => !save?.sort.assignments[id]).map(id => IDEA_PROMPTS.find(idea => idea.id === id)!.text),
      stage3Complete ? 'Stage 3 completed.' : 'Sorting in progress.',
      'Categories reflect your choices, not a graded answer key.',
      '', 'Stage 4: Connect',
      ...(save?.connect.connections ?? []).flatMap(connection => [
        `CENTRAL: ${IDEA_PROMPTS.find(idea => idea.id === connection.main)!.text}`,
        ...connection.supporting.map(id => `SUPPORTING: ${IDEA_PROMPTS.find(idea => idea.id === id)!.text}`),
        `CONNECTING STATEMENT: ${connection.explanation || '(not written yet)'}`,
        save ? connectionIssue(connection, save.generate.selected, save.sort.assignments) ?? 'Connection ready.' : '', '',
      ]),
      stage4Complete ? 'Stage 4 completed.' : 'Connections in progress.',
      'Written statements reflect your thinking, not an automatically graded answer.',
      '', 'Stage 5: Elaborate',
      ...(save?.elaborate.infusions ?? []).flatMap(infusion => [
        `CRYSTAL: ${IDEA_PROMPTS.find(idea => idea.id === infusion.main)!.label}`,
        `RUNES: ${infusion.runes.map(id => RUNES.find(rune => rune.id === id)!.label).join(', ') || '(none)'}`,
        `ELABORATED RESPONSE: ${infusion.response || '(not written yet)'}`,
        save ? infusionIssue(infusion, save.connect, save.generate.selected, save.sort.assignments) ?? 'Infusion ready.' : '', '',
      ]),
      stage5Complete ? 'Stage 5 completed.' : 'Infusions in progress.',
      'Rune choices and writing reflect your thinking, not an automatically graded answer.',
      '', 'Stage 6: Challenge',
      `Infusions launched: ${save?.challenge.used.length ?? 0}. Hits: ${save?.challenge.hits ?? 0}. Confusion: ${save?.challenge.confusion ?? 0}.`,
      stage6Complete ? 'Stage 6 completed. The Beast retreated.' : 'Beast encounter in progress.',
      'Encounter accuracy is a game mechanic, not a literary grade. Your written responses remain unchanged.',
      '', 'The Archival Hall',
      stage6Complete && save?.ending.completed ? 'Journey complete. Your work is recorded in the Archival Hall.' : 'Complete the Beast encounter and enter the Archival Hall to finish your journey.',
      `REFLECTION: ${save?.ending.reflection || '(not written yet)'}`,
      'This record is stored in your browser, not in an online archive. Keep this downloaded copy.',
    ].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'forge-of-ideas-quest-notes.txt'; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast('Your quest notes have been downloaded.');
  }

  let dialogue: ReactNode;
  let dialogueLabel = 'YOUR RAVEN GUIDE';
  if (screen === 'prologue') {
    dialogue = <p key={dialogueIndex} className="dialogue-copy text-enter">{pages[dialogueIndex].text}</p>;
  } else if (screen === 'prepare') {
    dialogueLabel = currentKeyword ? currentKeyword.title.toUpperCase() : 'YOUR FIRST QUEST';
    dialogue = <div className="text-enter" key={activeKeyword ?? 'default'}>
      <p className="dialogue-copy">{currentKeyword?.explanation ?? 'It’s time to prepare for your quest. Let’s uncover some things you will need to look out for. Select each key phrase in the question above to discover what it asks of you.'}</p>
      {allExplored && <p className="dialogue-hint success"><Check size={16} /> All three key phrases explored. You’re ready to see the journey ahead.</p>}
    </div>;
  } else {
    dialogue = <>
      <p className="dialogue-copy">{stage6Complete ? `The Beast has retreated, ${save?.name}. Your ideas and writing are still yours to revisit and refine.` : stage5Complete ? `Your crystal infusions are ready, ${save?.name}. Take them into the Beast encounter, or return to Elaborate to refine your response.` : stage4Complete ? `Your ideas have taken a stronger form, ${save?.name}. Select Elaborate to deepen a crystal with your own writing. You can return to earlier stages whenever your thinking changes.` : stage3Complete ? `You have considered how each idea relates to the question, ${save?.name}. Now connect a central idea with supporting ideas and explain the relationship. Your writing will give each crystal its meaning.` : stage2Complete ? `You have gathered ${save?.generate.selected.length} ideas, ${save?.name}. Now sort them into central, supporting, and irrelevant ideas. You can always return to Generate to reconsider your pouch.` : `Well prepared, ${save?.name}. Every strong response begins with understanding the question. Your next steps will turn a spark of an idea into something extraordinary.`}</p>
      <div className="journey-finish"><span>{stage6Complete ? <><Feather size={14} /> {save?.ending.completed ? 'Journey complete. Revisit your record.' : 'The Archival Hall is open.'}</> : stage5Complete ? <><Feather size={14} /> Challenge is open. Face the Beast.</> : stage4Complete ? <><Feather size={14} /> Elaborate is open. Deepen your ideas.</> : stage3Complete ? <><Feather size={14} /> Connect is open. Bring ideas together.</> : stage2Complete ? <><Feather size={14} /> Sort is open. Find what matters.</> : <><Feather size={14} /> {save?.completed ? 'Generate is open. Gather your ideas.' : 'Complete Prepare to unlock Generate.'}</>}</span><GoldButton onClick={stage6Complete ? () => go('ending') : stage5Complete ? () => go('challenge') : stage4Complete ? () => go('elaborate') : stage3Complete ? () => go('connect') : stage2Complete ? () => go('sort') : save?.completed ? () => go('generate') : complete} className="small">{stage6Complete ? save?.ending.completed ? 'Revisit the ending' : 'Continue to the ending' : stage5Complete ? challengeLabel : stage4Complete ? elaborateLabel : stage3Complete ? connectLabel : stage2Complete ? sortLabel : save?.completed ? generateLabel : 'Complete Stage 1'} <ArrowRight /></GoldButton></div>
    </>;
  }

  return <main className={`app ${settings.reducedMotion ? 'reduced-motion' : ''} ${settings.largeText ? 'large-text' : ''}`}>
    <div className={`game-frame screen-${screen} ${screen === 'generate' ? `generate-${save?.generate.step}` : screen === 'sort' ? `sort-phase-${save?.sort.step}` : screen === 'connect' ? `connect-phase-${save?.connect.step}` : screen === 'elaborate' ? `elaborate-phase-${save?.elaborate.step}` : screen === 'challenge' ? `challenge-phase-${save?.challenge.step}` : screen === 'ending' ? `ending-phase-${save?.ending.step}` : ''}`} ref={gameFrame} data-testid="game-frame">
      <div className="room-art" aria-hidden="true" />
      <div className="room-vignette" aria-hidden="true" />
      {screen !== 'splash' && screen !== 'generate' && screen !== 'sort' && screen !== 'connect' && screen !== 'elaborate' && screen !== 'challenge' && screen !== 'ending' && <Atmosphere reducedMotion={settings.reducedMotion} />}
      {screen !== 'splash' && screen !== 'name' && <Raven reducedMotion={settings.reducedMotion} landing={screen === 'landing'} speakingKey={active ? screen === 'ending' ? `ending-${save?.ending.step}` : screen === 'challenge' ? `challenge-${save?.challenge.step}-${save?.challenge.lastOutcome}` : screen === 'elaborate' ? `elaborate-${save?.elaborate.step}-${save?.elaborate.activeMain}` : screen === 'connect' ? `connect-${save?.connect.step}-${save?.connect.mainIdea}-${save?.connect.supportingIdea}` : screen === 'sort' ? `sort-${save?.sort.step}-${save?.sort.activeIdea}` : screen === 'generate' ? `generate-${save?.generate.step}-${save?.generate.activeIdea}` : `${screen}-${dialogueIndex}-${activeKeyword ?? ''}` : null} />}

      {screen === 'splash' ? <div className="splash-screen">
        <div className="splash-brand"><img src="/assets/cpdd.png" alt="Curriculum Planning and Development Division logo" /><p>CURRICULUM PLANNING &<br />DEVELOPMENT DIVISION</p><span>presents</span></div>
        <button className="splash-skip" onClick={() => go('landing')}>Skip intro <ArrowRight size={16} /></button>
      </div> : <>
        {screen === 'landing' && <section className="landing-content scene-enter" aria-label="Welcome to The Forge of Ideas">
          <img className="moe-crest" src="/assets/moe.webp" alt="Ministry of Education, Singapore" />
          <div className="hero-title"><p className="title-the">The</p><h1 ref={heading} tabIndex={-1}>Forge of Ideas</h1><p className="hero-kicker">A LITERARY ADVENTURE</p></div>
          <div className="landing-actions">
            <GoldButton onClick={save ? () => go(save.screen) : begin}>{save ? 'Continue your journey' : 'Begin the journey'} <ArrowRight /></GoldButton>
            {save ? <div className="resume-details"><span>Welcome back, {save.name}</span><button onClick={begin}>Begin anew <RotateCcw size={12} /></button></div> : <p className="landing-caption">Every great response begins with a spark.</p>}
          </div>
          <div className="landing-footer"><span>SECONDARY ENGLISH LITERATURE</span><span>GENERATE · SORT · CONNECT · ELABORATE · CHALLENGE</span></div>
        </section>}

        {screen === 'name' && <div className="name-scene scene-enter">
          <Frame className="name-panel">
            <p className="eyebrow">BEFORE YOUR ADVENTURE BEGINS</p>
            <h1>Enter your name</h1>
            <p className="panel-subtitle">What shall the raven call you?</p>
            <form onSubmit={submitName} noValidate>
              <label className="sr-only" htmlFor="player-name">Your name</label>
              <div className={`name-field ${nameError ? 'invalid' : ''}`}><Feather aria-hidden="true" /><input ref={nameRef} id="player-name" name="name" placeholder="Your name" value={nameInput} onChange={(event) => { setNameInput(event.target.value); setNameError(''); }} maxLength={24} autoComplete="given-name" aria-describedby="name-helper" aria-invalid={Boolean(nameError)} /></div>
              <p id="name-helper" className={nameError ? 'field-help error' : 'field-help'} role={nameError ? 'alert' : undefined}>{nameError || 'A first name or nickname is all you need.'}</p>
              <div className="form-actions"><GoldButton type="submit">Continue <ArrowRight /></GoldButton><button type="button" className="quiet-button" onClick={() => go('landing')}>Cancel</button></div>
            </form>
            <Ornament />
          </Frame>
          <p className="local-note"><LockKeyhole size={12} /> Your journey is saved on this device.</p>
        </div>}

        {active && <>
          <header className="scene-header">
            <span className="scene-diamond"><Feather /></span><div><span className="eyebrow">THE FORGE OF IDEAS</span><p>{screen === 'ending' ? save?.ending.step === 'archive' ? 'The Archival Hall' : 'Journey complete' : screen === 'prologue' ? 'The Prologue' : screen === 'challenge' ? 'Stage 6 · Challenge' : screen === 'elaborate' ? 'Stage 5 · Elaborate' : screen === 'connect' ? 'Stage 4 · Connect' : screen === 'sort' ? 'Stage 3 · Sort' : screen === 'generate' ? 'Stage 2 · Generate' : screen === 'journey' && stage6Complete ? 'Stages 1–6 · Your journey' : screen === 'journey' && stage5Complete ? 'Stages 1–5 · Your journey' : screen === 'journey' && stage4Complete ? 'Stages 1–4 · Your journey' : screen === 'journey' && stage3Complete ? 'Stages 1–3 · Your journey' : screen === 'journey' && stage2Complete ? 'Stages 1–2 · Your journey' : 'Stage 1 · Prepare'}</p></div>
          </header>
          <nav className="side-tools" aria-label="Game tools">
            <RoundButton label="Home" onClick={() => go('landing')}><Home /></RoundButton>
            <RoundButton label="Ask the raven" onClick={() => { setOverlay('help'); playSound(); }}><Bird /></RoundButton>
            <RoundButton label="Quest journal" onClick={() => { setOverlay('journal'); playSound(); }}><ScrollText /></RoundButton>
            {(screen === 'journey' || screen === 'generate' || screen === 'sort' || screen === 'connect' || screen === 'elaborate' || screen === 'challenge' || screen === 'ending') && <RoundButton label="Journey overview" onClick={() => screen !== 'journey' ? go('journey') : setToast(stage6Complete ? 'Your journey is complete. Revisit a stage or enter the Archival Hall.' : 'Select an unlocked stage to review your work. Defeat the Beast to open the Archival Hall.')}><Compass /></RoundButton>}
          </nav>

          {screen === 'prologue' && <section className="prologue-intro scene-enter" aria-label="Prologue">
            <Feather className="prologue-feather" aria-hidden="true" />
            <p className="eyebrow">{pages[dialogueIndex].note}</p>
            <h1 ref={heading} tabIndex={-1} key={dialogueIndex} className="text-enter">{pages[dialogueIndex].title}</h1>
            <Ornament />
          </section>}

          {screen === 'prepare' && <Frame className="question-panel scene-enter">
            <div className="question-topline"><span className="eyebrow">YOUR QUESTION</span><span className="keyword-count" aria-label={`${explored.length} of 3 phrases explored`}>{explored.length} <span>/ 3</span><Sparkles size={13} /></span></div>
            <h1 ref={heading} tabIndex={-1}><mark className={explored.includes('how') ? 'discovered' : ''}>How</mark> does Bradbury make <mark className={explored.includes('moment') ? 'discovered' : ''}>this moment</mark> <mark className={explored.includes('tense') ? 'discovered' : ''}>so tense</mark>?</h1>
            <Ornament />
            <p className="keyword-prompt">Explore the key phrases</p>
            <div className="keyword-buttons">{KEYWORDS.map((keyword) => <button key={keyword.id} className={`keyword-button ${activeKeyword === keyword.id ? 'selected' : ''} ${explored.includes(keyword.id) ? 'explored' : ''}`} aria-pressed={activeKeyword === keyword.id} onClick={() => chooseKeyword(keyword.id)}>{keyword.label}{explored.includes(keyword.id) && <Check size={13} aria-label="explored" />}</button>)}</div>
            <p className="question-source">“The Veldt” · Ray Bradbury</p>
          </Frame>}

          {screen === 'journey' && <Frame className="journey-panel scene-enter">
            <div className="journey-heading"><span className="eyebrow">FROM A SPARK TO A STORY</span><h1 ref={heading} tabIndex={-1}>Your journey</h1></div>
            <div className="journey-map" aria-label="Seven stops on your journey">
              <div className="map-row first-row"><button className="stage-tile current-stage" onClick={() => go('prepare')} title="Review Stage 1"><span className="stage-art"><img src="/assets/prepare.webp" alt="" /><span className="stage-check"><Check size={13} /></span></span><span className="stage-name">Prepare</span><span className="stage-caption">{save?.completed ? 'COMPLETED' : 'YOU ARE HERE'}</span></button></div>
              <div className="map-branches" aria-hidden="true" />
              <div className="map-row middle-row">{STAGES.slice(1, 5).map((stage) => {
                const unlocked = stage.id === 'generate' ? save?.completed : stage.id === 'sort' ? stage2Complete : stage.id === 'connect' ? stage3Complete : stage4Complete;
                const done = stage.id === 'generate' ? stage2Complete : stage.id === 'sort' ? stage3Complete : stage.id === 'connect' ? stage4Complete : stage5Complete;
                return unlocked && (stage.id === 'generate' || stage.id === 'sort' || stage.id === 'connect' || stage.id === 'elaborate') ? <button key={stage.id} className="stage-tile current-stage" aria-label={`${done ? 'Review' : 'Open'} ${stage.name}`} title={stage.id === 'elaborate' ? elaborateLabel : stage.id === 'connect' ? connectLabel : stage.id === 'sort' ? sortLabel : generateLabel} onClick={() => go(stage.id as 'sort' | 'generate' | 'connect' | 'elaborate')}><span className="stage-art"><img src={`/assets/${stage.id}.webp`} alt="" /><span className="stage-check">{done ? <Check /> : <Sparkles />}</span></span><span className="stage-name">{stage.name}</span><span className="stage-caption">{done ? 'COMPLETED' : `OPEN · STAGE ${Number(stage.number)}`}</span></button> : <div className="stage-tile locked-stage" key={stage.id} title={`${stage.name}: ${stage.description} ${stage.id === 'generate' ? 'Complete Stage 1 to unlock.' : stage.id === 'sort' ? 'Complete Stage 2 to unlock.' : stage.id === 'connect' ? 'Complete Stage 3 to unlock.' : 'Complete Stage 4 to unlock.'}`} aria-label={`${stage.name}, locked`}><span className="stage-art"><img src={`/assets/${stage.id}.webp`} alt="" /><LockKeyhole className="stage-lock" size={12} /></span><span className="stage-name">{stage.name}</span><span className="stage-caption">STAGE {Number(stage.number)}</span></div>;
              })}</div>
              <div className="map-row last-row">{STAGES.slice(5).map(stage => {
                const unlocked = stage.id === 'challenge' ? stage5Complete : stage6Complete;
                const done = stage.id === 'challenge' ? stage6Complete : save?.ending.completed;
                return unlocked ? <button key={stage.id} className="stage-tile current-stage" aria-label={`${done ? 'Review' : 'Open'} ${stage.name}`} title={stage.id === 'challenge' ? challengeLabel : 'Revisit the ending and your journey record'} onClick={() => go(stage.id === 'challenge' ? 'challenge' : 'ending')}><span className="stage-art"><img src={`/assets/${stage.id}.webp`} alt="" /><span className="stage-check">{done ? <Check /> : <Sparkles />}</span></span><span className="stage-name">{stage.name}</span><span className="stage-caption">{done ? 'COMPLETED' : stage.id === 'challenge' ? 'OPEN · STAGE 6' : 'OPEN · ENDING'}</span></button> : <div className="stage-tile locked-stage" key={stage.id} title={`${stage.name}: ${stage.description} ${stage.id === 'challenge' ? 'Complete Stage 5 to unlock.' : 'Complete Stage 6 to unlock.'}`} aria-label={`${stage.name}, locked`}><span className="stage-art"><img src={`/assets/${stage.id}.webp`} alt="" /><LockKeyhole className="stage-lock" size={12} /></span><span className="stage-name">{stage.name}</span></div>;
              })}</div>
            </div>
            {save?.completed && <button className="stage1-achievement-link" onClick={() => setOverlay('complete')}>View achievement</button>}
          </Frame>}

          {screen === 'generate' && save && <GenerateStage progress={save.generate} paused={overlay !== null} onChange={updateGenerate} onReturn={() => go('journey')} onComplete={completeGenerate} />}
          {screen === 'sort' && save && <SortStage progress={save.sort} ideas={save.generate.selected} paused={overlay !== null} reducedMotion={settings.reducedMotion} onChange={updateSort} onReturn={() => go('journey')} onComplete={completeSort} />}
          {screen === 'connect' && save && <ConnectStage progress={save.connect} ideas={save.generate.selected} assignments={save.sort.assignments} paused={overlay !== null} reducedMotion={settings.reducedMotion} onChange={updateConnect} onReturn={() => go('journey')} onSort={revisitSort} onComplete={completeConnect} />}
          {screen === 'elaborate' && save && <ElaborateStage progress={save.elaborate} connect={save.connect} ideas={save.generate.selected} assignments={save.sort.assignments} paused={overlay !== null} reducedMotion={settings.reducedMotion} onChange={updateElaborate} onReturn={() => go('journey')} onConnect={() => go('connect')} onComplete={completeElaborate} />}
          {screen === 'challenge' && save && <ChallengeStage progress={save.challenge} elaborate={save.elaborate} connect={save.connect} ideas={save.generate.selected} assignments={save.sort.assignments} paused={overlay !== null} reducedMotion={settings.reducedMotion} onChange={updateChallenge} onReturn={() => go('journey')} onElaborate={() => go('elaborate')} onComplete={completeChallenge} />}
          {screen === 'ending' && save && <EndingStage save={save} paused={overlay !== null} saveFailed={saveFailed} onChange={updateEnding} onReturn={() => go('journey')} onDownload={downloadNotes} />}

          {screen !== 'generate' && screen !== 'sort' && screen !== 'connect' && screen !== 'elaborate' && screen !== 'challenge' && screen !== 'ending' && <section className="dialogue-scroll" aria-label="Raven dialogue">
            <div className="scroll-paper" aria-hidden="true" /><div className="scroll-roll roll-left" aria-hidden="true" /><div className="scroll-roll roll-right" aria-hidden="true" />
            <div className="dialogue-content" aria-live="polite" aria-atomic="true">
              <div className="dialogue-topline"><span className="speaker-label"><Feather size={13} />{dialogueLabel}</span><span className="dialogue-pagination">{screen === 'prologue' ? `${String(dialogueIndex + 1).padStart(2, '0')} / 03` : screen === 'prepare' ? '01 · PREPARE' : 'THE PATH AHEAD'}</span></div>
              {dialogue}
            </div>
            <div className="dialogue-navigation">
              <RoundButton label="Previous" onClick={() => screen === 'prologue' ? previousDialogue() : go(screen === 'prepare' ? 'prologue' : 'prepare')}><ChevronLeft /></RoundButton>
              {screen !== 'journey' && <RoundButton label={screen === 'prepare' ? 'View your journey' : dialogueIndex === 2 ? 'Start Stage 1' : 'Next'} onClick={() => screen === 'prologue' ? nextDialogue() : go('journey')} disabled={screen === 'prepare' && !allExplored} className="next-button"><ChevronRight /></RoundButton>}
            </div>
          </section>}
          {screen === 'prepare' && !allExplored && <p className="continue-hint">Explore all three phrases to continue <ArrowRight size={12} /></p>}
        </>}

        <div className="utility-bar" aria-label="Display and audio settings">
          <button className="utility-button" aria-label={settings.sound ? 'Mute sounds' : 'Enable sounds'} title={settings.sound ? 'Mute sounds' : 'Enable sounds'} onClick={() => { const next = !settings.sound; setSettings({ ...settings, sound: next }); setSound(next); if (next) playSound('chime'); }}>{settings.sound ? <Volume2 /> : <VolumeX />}</button>
          <button className="utility-button" aria-label="Settings" title="Settings" onClick={() => setOverlay('settings')}><Settings2 /></button>
          <button className="utility-button" aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} onClick={() => void toggleFullscreen()}>{fullscreen ? <Minimize /> : <Maximize />}</button>
        </div>
        {active && <div className="save-indicator"><span className={saveFailed ? 'save-dot failed' : 'save-dot'} />{saveFailed ? 'Progress could not be saved' : 'PROGRESS SAVED'}</div>}
      </>}
      {toast && <div className="toast" role="status"><Feather size={16} />{toast}</div>}
    </div>

    {overlay === 'settings' && <Modal title="Make yourself at home" onClose={() => setOverlay(null)}>
      <p className="modal-intro">A few small comforts for your journey.</p>
      <div className="settings-list">{([
        ['sound', 'Interaction sounds', 'Gentle chimes when you explore and continue.'],
        ['reducedMotion', 'Reduce motion', 'Still candlelight, no drifting particles or transitions.'],
        ['largeText', 'Larger dialogue', 'A little more room for every word.'],
      ] as const).map(([key, title, description]) => <label className="setting-row" key={key}><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" checked={settings[key]} onChange={(event) => setSettings({ ...settings, [key]: event.target.checked })} /><span className="switch-track" aria-hidden="true" /></label>)}</div>
      <p className="settings-note">Settings and progress stay in this browser. Sound is optional.</p>
      <GoldButton onClick={() => setOverlay(null)}>{screen === 'ending' ? 'Return to the ending' : screen === 'generate' || screen === 'sort' || screen === 'connect' || screen === 'elaborate' || screen === 'challenge' ? 'Return to the Forge' : 'Return to the study'}</GoldButton>
    </Modal>}

    {overlay === 'help' && <Modal title="A word from the raven" onClose={() => setOverlay(null)}>
      <div className="raven-advice"><Bird size={36} /><p>{screen === 'ending' ? 'Step through the glowing portal to reach the Archival Hall. Open the sealed scroll to review your writing and add an optional reflection. Download quest notes for a separate copy: progress stays in this browser, not on a server. Use the back arrow to revisit the valley, or Journey overview to revisit earlier stages. Earlier edits keep your writing and reflection but reopen completion checks.' : screen === 'challenge' ? 'Choose one of your ready Stage 5 infusions. Tap the Beast or use the horizontal aim slider, then launch. Hits depend only on aim, not on an automatic literary score. A miss raises Confusion; if you run out of usable infusions, retry the encounter. Your writing is never consumed. The flight and ambient motion pause in menus and hidden tabs, and reduced motion shortens effects.' : screen === 'elaborate' ? 'Choose or drag a completed connection crystal into the chamber. Select at least two of the six rune prompts, then write your own elaboration grounded in your classroom extract. Save each infusion to review it. At least one ready infusion is needed to complete Stage 5, and every saved infusion must be ready. Your writing is not automatically graded. If an earlier connection changes, your draft stays safe but needs an explicit refresh before it counts again. The 40-minute timer pauses in menus and hidden tabs; untimed play is available.' : screen === 'connect' ? 'Choose one central and one supporting ore, or drag each to its matching receptacle, then forge a connection. Write how the supporting idea develops the central point and helps answer the question. Each central idea can have up to two supporting ideas. Complete at least one crystal with a written statement; every saved crystal must be ready. Your writing is not automatically graded. Revisit Sort if you need different categories. Changing earlier ideas preserves your statements but may require review. The 60-minute timer pauses in menus and hidden tabs; untimed play is available.' : screen === 'sort' ? 'Select an ore to read its idea on the parchment, then select a category belt. You can also drag ores onto belts with a mouse or touch. Central ideas directly answer the question; supporting ideas develop a point; irrelevant ideas do not help this response. These are your decisions, not an automatic score. Sort every collected idea before completing Stage 3. Undo, return to tray, and revisiting belts let you change your mind. The 40-minute timer pauses in menus and hidden tabs, and untimed sorting is available.' : screen === 'generate' ? 'Select a glowing ore, read its idea, then choose Collect idea. Select it again to remove it. Gather any ideas you want to consider; there are no right-or-wrong scores at this stage. Review at least one idea in your pouch to complete Stage 2. The 60-minute exploration timer pauses in menus, away from this stage, or in a hidden tab. You may also pause it or explore untimed.' : screen === 'prepare' ? 'A question is a map in disguise. Explore “How”, “this moment” and “so tense”. Each phrase tells you something different about the response you need to write.' : screen === 'journey' ? 'Select Prepare to revisit the question. Completing Stage 1 unlocks Generate; Stage 2 unlocks Sort; Stage 3 unlocks Connect; Stage 4 unlocks Elaborate; Stage 5 unlocks Challenge. Earlier changes preserve your writing but may require review. Defeat the Beast in Stage 6 to unlock the ending and Archival Hall.' : 'Take your time, adventurer. Use the arrows on the parchment to follow my introduction. Your progress is saved as you go.'}</p></div>
      {screen === 'generate' && <p className="settings-note">“AI is becoming more lifelike” comes from the mockup. Other prompts are starter ideas for classroom review, not quotations from the text. Use your classroom extract to check their relevance.</p>}
      <div className="help-controls"><p><kbd>Tab</kbd> Move between controls</p><p><kbd>Enter</kbd> / <kbd>Space</kbd> Select a focused button</p><p><kbd>Esc</kbd> Close this window</p></div>
      <GoldButton onClick={() => setOverlay(null)}>I’m ready <Feather /></GoldButton>
    </Modal>}

    {overlay === 'journal' && <Modal title="Your quest journal" onClose={() => setOverlay(null)} className="journal-modal">
      <p className="journal-owner"><Feather size={16} />{save?.name}’s notes<span>{explored.length} / 3 discovered</span></p>
      <blockquote>How does Bradbury make this moment so tense?</blockquote>
      <p className="journal-source">“The Veldt” · Ray Bradbury</p>
      <div className="journal-entries">{KEYWORDS.map((keyword) => <section key={keyword.id} className={explored.includes(keyword.id) ? 'discovered-note' : 'locked-note'}><h3>{explored.includes(keyword.id) ? <Check size={15} /> : <LockKeyhole size={14} />}{keyword.label}</h3><p>{explored.includes(keyword.id) ? keyword.explanation : 'Explore this phrase in Stage 1 to add it to your journal.'}</p></section>)}</div>
      <div className="journal-entries generated-journal"><h3>Stage 2 · Idea pouch</h3>{save?.generate.selected.length ? <>{save.generate.selected.map(id => {
        const idea = IDEA_PROMPTS.find(item => item.id === id)!;
        return <section key={id}><h3><Sparkles size={15} />{idea.label}</h3><p>{idea.text}</p><small>{idea.source} · Check against your extract</small></section>;
      })}<p>{stage2Complete ? 'Stage 2 completed. You can revisit Generate to reconsider these ideas.' : 'Your gathered ideas are saved. Return to Generate to keep exploring.'}</p></> : <p>Collect ideas in Stage 2 to add them here.</p>}</div>
      <div className="journal-entries sorted-journal"><h3>Stage 3 · Sorting decisions</h3>{SORT_CATEGORIES.map(category => <section key={category.id}><h3>{category.label}</h3>{save?.generate.selected.some(id => save.sort.assignments[id] === category.id) ? <ul>{save.generate.selected.filter(id => save.sort.assignments[id] === category.id).map(id => <li key={id}>{IDEA_PROMPTS.find(idea => idea.id === id)!.text}</li>)}</ul> : <p>No ideas on this belt yet.</p>}</section>)}<p>{stage3Complete ? 'Stage 3 completed. Revisit Sort to reconsider your choices.' : 'Sort all collected ideas and review your decisions to complete Stage 3.'}</p></div>
      <div className="journal-entries connected-journal"><h3>Stage 4 · Connecting statements</h3>{save?.connect.connections.length ? save.connect.connections.map(connection => <section key={connection.main}><h3>{IDEA_PROMPTS.find(idea => idea.id === connection.main)!.label}</h3><p><strong>Supporting:</strong> {connection.supporting.map(id => IDEA_PROMPTS.find(idea => idea.id === id)!.label).join(' + ') || 'None yet'}</p><p className="journal-statement">{connection.explanation || 'No statement written yet.'}</p><small>{connectionIssue(connection, save.generate.selected, save.sort.assignments) ?? 'Connection ready.'}</small></section>) : <p>Connect your sorted ideas in Stage 4 to add your own statements here.</p>}<p>{stage4Complete ? 'Stage 4 completed. Your connections can still be refined.' : 'Explain each saved connection and review it to complete Stage 4.'}</p></div>
      <div className="journal-entries elaborated-journal"><h3>Stage 5 · Idea infusions</h3>{save?.elaborate.infusions.length ? save.elaborate.infusions.map(infusion => <section key={infusion.main}><h3>{IDEA_PROMPTS.find(idea => idea.id === infusion.main)!.label}</h3><p><strong>Runes:</strong> {infusion.runes.map(id => RUNES.find(rune => rune.id === id)!.label).join(' · ') || 'None chosen yet'}</p><p className="journal-statement">{infusion.response || 'No elaboration written yet.'}</p><small>{infusionIssue(infusion, save.connect, save.generate.selected, save.sort.assignments) ?? 'Infusion ready.'}</small></section>) : <p>Develop a crystal in Stage 5 to add your own writing here.</p>}<p>{stage5Complete ? 'Stage 5 completed. Revisit Elaborate to refine your writing.' : 'Select runes and write your response to complete Stage 5.'}</p></div>
      <div className="journal-entries challenged-journal"><h3>Stage 6 · Beast encounter</h3><section><h3>{stage6Complete ? 'The Beast retreated' : 'Challenge in progress'}</h3><p>{save?.challenge.hits ?? 0} hits · {save?.challenge.confusion ?? 0} Confusion · {save?.challenge.used.length ?? 0} infusions launched</p><small>Accuracy is a game mechanic, not a literary grade. Your Stage 5 responses remain above.</small></section></div>
      <div className="journal-entries"><h3>The Archival Hall</h3><section><h3>{stage6Complete && save?.ending.completed ? 'Journey complete' : 'Your final record'}</h3><p className="journal-statement">{save?.ending.reflection || 'Enter the Archival Hall after the Beast encounter to add an optional reflection.'}</p><small>Stored in this browser. Download your notes to keep a separate copy.</small></section></div>
      <button className="outlined-button" onClick={downloadNotes}><Download size={16} /> Download notes</button>
    </Modal>}

    {overlay === 'restart' && <Modal title="Begin a new journey?" onClose={() => setOverlay(null)}>
      <p className="modal-intro">Your new adventure will replace {save?.name}’s saved progress once you enter a name. You can download your current notes first.</p>
      <button className="text-link" onClick={downloadNotes}><Download size={15} /> Save my quest notes</button>
      <div className="modal-actions"><GoldButton onClick={() => { setOverlay(null); setNameInput(''); setNameError(''); go('name'); }}>Begin anew</GoldButton><button className="quiet-button" onClick={() => setOverlay(null)}>Keep my journey</button></div>
    </Modal>}

    {overlay === 'complete' && <Modal title="A well-prepared adventurer" onClose={() => setOverlay(null)} className="achievement-modal">
      <div className="achievement-seal"><Feather size={38} /><span><Check size={14} /></span></div>
      <p className="achievement-name">{save?.name}</p><p className="achievement-label">STAGE 1 · COMPLETE</p>
      <p className="modal-intro">You’ve uncovered the writer’s craft, the focus of the extract, and the effect on the reader. Your first spark is ready for the forge.</p>
      <div className="achievement-keywords">{KEYWORDS.map((keyword) => <span key={keyword.id}><Check size={13} />{keyword.label}</span>)}</div>
      <p className="next-chapter"><Sparkles size={14} /> Generating Ideas is now open.</p>
      <GoldButton onClick={() => { setOverlay(null); go('generate'); }}>Start Stage 2 <ArrowRight /></GoldButton>
      <button className="text-link achievement-download" onClick={downloadNotes}><Download size={16} /> Save quest notes</button>
      <button className="quiet-button" onClick={() => setOverlay(null)}>Return to the journey <ArrowLeft size={13} /></button>
    </Modal>}
  </main>;
}
