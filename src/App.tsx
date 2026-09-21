import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Bird, Check, ChevronLeft, ChevronRight, Compass, Download, Feather, Home, LockKeyhole, Maximize, Minimize, RotateCcw, ScrollText, Settings2, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { KEYWORDS, STAGES, prologue } from './data';
import type { Keyword, Screen } from './data';
import { cleanName, newSave, persistSave, readSave, readSettings, SETTINGS_KEY } from './state';
import type { Save, Settings } from './state';
import { playSound, setSound } from './audio';
import { Atmosphere } from './game/Atmosphere';
import { Corner, Ornament } from './components/Ornament';
import { Modal } from './components/Modal';
import { Raven } from './components/Raven';

type Overlay = 'help' | 'journal' | 'settings' | 'restart' | 'complete' | null;

function Frame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`ornate-panel ${className}`}>
    <Corner className="top-left" /><Corner className="top-right" />
    <Corner className="bottom-left" /><Corner className="bottom-right" />
    {children}
  </section>;
}

function GoldButton({ children, onClick, type = 'button', className = '', disabled = false }: { children: ReactNode; onClick?: () => void; type?: 'button' | 'submit'; className?: string; disabled?: boolean }) {
  return <button className={`gold-button ${className}`} type={type} onClick={onClick} disabled={disabled}><span>{children}</span></button>;
}

function RoundButton({ label, children, onClick, disabled = false, className = '' }: { label: string; children: ReactNode; onClick: () => void; disabled?: boolean; className?: string }) {
  return <button aria-label={label} title={label} className={`round-button ${className}`} onClick={onClick} disabled={disabled}>{children}<span className="button-tooltip" aria-hidden="true">{label}</span></button>;
}

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
  const active = screen === 'prologue' || screen === 'prepare' || screen === 'journey';
  const explored = save?.explored ?? [];
  const allExplored = explored.length === 3;
  const pages = prologue(save?.name ?? 'adventurer');
  const dialogueIndex = save?.prologueIndex ?? 0;
  const currentKeyword = KEYWORDS.find((keyword) => keyword.id === activeKeyword);

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
    playSound();
    setScreen(next);
    setActiveKeyword(null);
    if (next === 'prologue' || next === 'prepare' || next === 'journey') {
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
      'Next: Generate → Sort → Connect → Elaborate.',
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
      <p className="dialogue-copy">Well prepared, {save?.name}. Every strong response begins with understanding the question. Your next steps will turn a spark of an idea into something extraordinary.</p>
      <div className="journey-finish"><span><LockKeyhole size={14} /> Stages 2–6 await a future chapter.</span><GoldButton onClick={complete} className="small">{save?.completed ? 'View achievement' : 'Complete Stage 1'} <ArrowRight /></GoldButton></div>
    </>;
  }

  return <main className={`app ${settings.reducedMotion ? 'reduced-motion' : ''} ${settings.largeText ? 'large-text' : ''}`}>
    <div className={`game-frame screen-${screen}`} ref={gameFrame} data-testid="game-frame">
      <div className="room-art" aria-hidden="true" />
      <div className="room-vignette" aria-hidden="true" />
      {screen !== 'splash' && <Atmosphere reducedMotion={settings.reducedMotion} />}
      {screen !== 'splash' && screen !== 'name' && <Raven reducedMotion={settings.reducedMotion} landing={screen === 'landing'} speakingKey={active ? `${screen}-${dialogueIndex}-${activeKeyword ?? ''}` : null} />}

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
          <div className="landing-footer"><span>SECONDARY ENGLISH LITERATURE</span><span>GENERATE · SORT · CONNECT · ELABORATE</span></div>
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
            <span className="scene-diamond"><Feather /></span><div><span className="eyebrow">THE FORGE OF IDEAS</span><p>{screen === 'prologue' ? 'The Prologue' : 'Stage 1 · Prepare'}</p></div>
          </header>
          <nav className="side-tools" aria-label="Game tools">
            <RoundButton label="Home" onClick={() => go('landing')}><Home /></RoundButton>
            <RoundButton label="Ask the raven" onClick={() => { setOverlay('help'); playSound(); }}><Bird /></RoundButton>
            <RoundButton label="Quest journal" onClick={() => { setOverlay('journal'); playSound(); }}><ScrollText /></RoundButton>
            {screen === 'journey' && <RoundButton label="Journey overview" onClick={() => setToast('You’re viewing your journey. Later stages are still locked.')}><Compass /></RoundButton>}
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
              <div className="map-row middle-row">{STAGES.slice(1, 5).map((stage) => <div className="stage-tile locked-stage" key={stage.id} title={`${stage.name}: ${stage.description} Available in a future chapter.`} aria-label={`${stage.name}, locked`}><span className="stage-art"><img src={`/assets/${stage.id}.webp`} alt="" /><LockKeyhole className="stage-lock" size={12} /></span><span className="stage-name">{stage.name}</span><span className="stage-caption">STAGE {Number(stage.number)}</span></div>)}</div>
              <div className="map-row last-row">{STAGES.slice(5).map((stage) => <div className="stage-tile locked-stage" key={stage.id} title={`${stage.name}: ${stage.description} Available in a future chapter.`} aria-label={`${stage.name}, locked`}><span className="stage-art"><img src={`/assets/${stage.id}.webp`} alt="" /><LockKeyhole className="stage-lock" size={12} /></span><span className="stage-name">{stage.name}</span></div>)}</div>
            </div>
          </Frame>}

          <section className="dialogue-scroll" aria-label="Raven dialogue">
            <div className="scroll-paper" aria-hidden="true" /><div className="scroll-roll roll-left" aria-hidden="true" /><div className="scroll-roll roll-right" aria-hidden="true" />
            <div className="dialogue-content" aria-live="polite" aria-atomic="true">
              <div className="dialogue-topline"><span className="speaker-label"><Feather size={13} />{dialogueLabel}</span><span className="dialogue-pagination">{screen === 'prologue' ? `${String(dialogueIndex + 1).padStart(2, '0')} / 03` : screen === 'prepare' ? '01 · PREPARE' : 'THE PATH AHEAD'}</span></div>
              {dialogue}
            </div>
            <div className="dialogue-navigation">
              <RoundButton label="Previous" onClick={() => screen === 'prologue' ? previousDialogue() : go(screen === 'prepare' ? 'prologue' : 'prepare')}><ChevronLeft /></RoundButton>
              {screen !== 'journey' && <RoundButton label={screen === 'prepare' ? 'View your journey' : dialogueIndex === 2 ? 'Start Stage 1' : 'Next'} onClick={() => screen === 'prologue' ? nextDialogue() : go('journey')} disabled={screen === 'prepare' && !allExplored} className="next-button"><ChevronRight /></RoundButton>}
            </div>
          </section>
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
      <GoldButton onClick={() => setOverlay(null)}>Return to the study</GoldButton>
    </Modal>}

    {overlay === 'help' && <Modal title="A word from the raven" onClose={() => setOverlay(null)}>
      <div className="raven-advice"><Bird size={36} /><p>{screen === 'prepare' ? 'A question is a map in disguise. Explore “How”, “this moment” and “so tense”. Each phrase tells you something different about the response you need to write.' : screen === 'journey' ? 'You have taken your first step. Select Prepare to revisit the question, or complete Stage 1 to record your achievement. The remaining stages will open in a future chapter.' : 'Take your time, adventurer. Use the arrows on the parchment to follow my introduction. Your progress is saved as you go.'}</p></div>
      <div className="help-controls"><p><kbd>Tab</kbd> Move between controls</p><p><kbd>Enter</kbd> / <kbd>Space</kbd> Select a focused button</p><p><kbd>Esc</kbd> Close this window</p></div>
      <GoldButton onClick={() => setOverlay(null)}>I’m ready <Feather /></GoldButton>
    </Modal>}

    {overlay === 'journal' && <Modal title="Your quest journal" onClose={() => setOverlay(null)} className="journal-modal">
      <p className="journal-owner"><Feather size={16} />{save?.name}’s notes<span>{explored.length} / 3 discovered</span></p>
      <blockquote>How does Bradbury make this moment so tense?</blockquote>
      <p className="journal-source">“The Veldt” · Ray Bradbury</p>
      <div className="journal-entries">{KEYWORDS.map((keyword) => <section key={keyword.id} className={explored.includes(keyword.id) ? 'discovered-note' : 'locked-note'}><h3>{explored.includes(keyword.id) ? <Check size={15} /> : <LockKeyhole size={14} />}{keyword.label}</h3><p>{explored.includes(keyword.id) ? keyword.explanation : 'Explore this phrase in Stage 1 to add it to your journal.'}</p></section>)}</div>
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
      <p className="next-chapter"><LockKeyhole size={14} /> Generating Ideas is your next chapter. Coming later.</p>
      <GoldButton onClick={downloadNotes}><Download size={16} /> Save quest notes</GoldButton>
      <button className="quiet-button" onClick={() => setOverlay(null)}>Return to the journey <ArrowLeft size={13} /></button>
    </Modal>}
  </main>;
}
