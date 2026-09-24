import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, Download, Feather, ScrollText } from 'lucide-react';
import { playSound } from '../audio';
import { STAGES } from '../data';
import { MAX_REFLECTION_TEXT, enterArchive } from '../ending';
import type { EndingProgress } from '../ending';
import { IDEA_PROMPTS } from '../stage2';
import type { Save } from '../state';
import { GoldButton, RoundButton } from './GameUI';
import { Modal } from './Modal';
import { SCRIPT } from '../storyboard';

type Props = {
  save: Save;
  paused: boolean;
  saveFailed: boolean;
  onChange: (update: (current: EndingProgress) => EndingProgress) => void;
  onReturn: () => void;
  onDownload: () => void;
};

function RecordScroll() {
  const id = useId();
  return <svg viewBox="0 0 800 230" aria-hidden="true" className="record-scroll-art">
    <defs>
      <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#7b441b" /><stop offset=".12" stopColor="#d29e58" /><stop offset=".35" stopColor="#f5d49a" /><stop offset=".58" stopColor="#e9bd7c" /><stop offset=".88" stopColor="#bc8447" /><stop offset="1" stopColor="#613714" /></linearGradient>
      <linearGradient id={`${id}-gold`}><stop stopColor="#241304" /><stop offset=".18" stopColor="#84521c" /><stop offset=".33" stopColor="#edc574" /><stop offset=".43" stopColor="#fff0b8" /><stop offset=".53" stopColor="#b77e31" /><stop offset=".76" stopColor="#4b290e" /><stop offset=".89" stopColor="#d9a149" /><stop offset="1" stopColor="#291509" /></linearGradient>
      <radialGradient id={`${id}-seal`} cx=".38" cy=".3"><stop stopColor="#a34635" /><stop offset=".66" stopColor="#742321" /><stop offset="1" stopColor="#390c13" /></radialGradient>
      <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%"><feTurbulence baseFrequency=".1 .14" numOctaves="2" seed="12" type="fractalNoise" result="grain" /><feColorMatrix in="grain" type="saturate" values="0" result="gray" /><feComponentTransfer in="gray" result="faint"><feFuncA type="linear" slope=".15" /></feComponentTransfer><feComposite in="faint" in2="SourceGraphic" operator="in" result="texture" /><feBlend in="SourceGraphic" in2="texture" mode="multiply" /></filter>
      <clipPath id={`${id}-paper-clip`}><path d="M113 50Q400 37 687 50L687 160Q400 178 113 160Z" /></clipPath>
    </defs>
    <ellipse cx="400" cy="177" rx="342" ry="23" fill="#160904" opacity=".6" />
    <path d="M113 50Q400 37 687 50L687 160Q400 178 113 160Z" fill={`url(#${id}-paper)`} stroke="#754318" strokeWidth="3" filter={`url(#${id}-grain)`} />
    <g clipPath={`url(#${id}-paper-clip)`}>
      {[0,1,2,3].map(i => <path key={i} d={`M108 ${59+i*27}l32 -6 22 7 30 -8 19 9 29 -6 26 9 33 -5 24 3 22 -7 39 5 29 -5 18 9 30 -7 31 6 24 -8 32 5 36 -7 19 9 43 -8 39 10 22 -4 34 5`} fill="none" stroke={i%2 ? '#844b21' : '#ffe3ad'} strokeWidth="7" opacity=".17" />)}
      <path d="M124 67Q398 52 676 67M124 147Q400 164 677 148" fill="none" stroke="#ffe4b2" strokeWidth="2" opacity=".6" />
      <path d="M126 57v103M135 54v107M663 52v112M673 54v109" stroke="#7e4a21" opacity=".4" strokeWidth="3" />
    </g>
    {[104,696].map((x,i) => <g key={x}>
      <path d={`M${x-24} 35q24 -13 39 0v135q-17 17-39 0Z`} fill={`url(#${id}-gold)`} stroke="#2a1307" strokeWidth="3" />
      <ellipse cx={x-6} cy="35" rx="20" ry="7" fill="#efc474" stroke="#4b2911" strokeWidth="3" />
      <path d={`M${x-23} 52h38M${x-23} 154h38`} stroke="#e1ae58" strokeWidth="8" />
      <path d={`M${x-22} 59h37M${x-22} 161h37`} stroke="#59330e" strokeWidth="4" />
      <path d={i ? 'M714 76h20v13h17l15 18-15 18h-17v11h-20Z' : 'M80 76H60v13H43l-15 18 15 18h17v11h20Z'} fill={`url(#${id}-gold)`} stroke="#38200b" strokeWidth="3" />
      <path d={`M${x-13} 64v78`} stroke="#fff0b4" strokeWidth="3" opacity=".75" />
    </g>)}
    <path d="M374 44 416 44 426 215 398 198 367 222 379 128Z" fill="#d9ae61" stroke="#653615" strokeWidth="2" />
    <path d="M380 44h30l8 157-20-14-23 20 10-79Z" fill="#70202a" />
    <path d="M387 46h7v145l-12 10Z" fill="#a65047" opacity=".5" />
    <path d="M362 97 367 77 386 70 408 70 426 82 439 99 435 122 423 139 401 146 380 141 364 129 357 112Z" fill="#431016" stroke="#be7850" strokeWidth="2" />
    <circle cx="398" cy="108" r="35" fill={`url(#${id}-seal)`} />
    <circle cx="398" cy="108" r="29" fill="none" stroke="#b66e51" strokeWidth="2" opacity=".55" />
    <path d="M385 123Q379 100 408 85Q414 103 389 119M385 126 406 92M387 114 400 112" fill="none" stroke="#c88a62" strokeWidth="3" strokeLinecap="round" opacity=".8" />
  </svg>;
}

export function EndingStage({ save, paused, saveFailed, onChange, onReturn, onDownload }: Props) {
  const [recordOpen, setRecordOpen] = useState(false);
  const [entering, setEntering] = useState(false);
  const [visible, setVisible] = useState(!document.hidden);
  const heading = useRef<HTMLHeadingElement>(null);
  const portalTimer = useRef<number | null>(null);
  const archive = save.ending.step === 'archive';

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [archive]);
  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  useEffect(() => () => { if (portalTimer.current !== null) window.clearTimeout(portalTimer.current); }, []);

  function throughPortal() {
    if (entering || paused) return;
    playSound('chime');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onChange(progress => enterArchive(progress, save.challenge.completed));
      return;
    }
    setEntering(true);
    portalTimer.current = window.setTimeout(() => {
      onChange(progress => enterArchive(progress, save.challenge.completed));
      setEntering(false);
      portalTimer.current = null;
    }, 560);
  }

  return <div className={`ending-stage ${paused || recordOpen || !visible ? 'ending-still' : ''} ${entering ? 'portal-entering' : ''}`}>
    <div className="ending-motes" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} style={{ '--mote-index': index, '--mote-row': index % 3 } as React.CSSProperties} />)}</div>
    <section className="ending-heading">
      <p className="eyebrow">{archive ? 'YOUR IDEAS HAVE A HOME' : 'THE LIGHT RETURNS'}</p>
      <h1 ref={heading} tabIndex={-1}>{archive ? 'The Archival Hall' : 'A journey well forged.'}</h1>
      <p>{archive ? `${save.name} · Journey complete` : 'From a spark of thought to a voice of your own.'}</p>
    </section>

    {archive ? <button className={`archive-scroll-button ${save.ending.reflection.trim() ? 'record-signed' : ''}`} onClick={() => { setRecordOpen(true); playSound(); }} aria-label="Open your journey record">
      <RecordScroll /><span className="archive-scroll-cue"><ScrollText size={16} />Open your journey record</span>
    </button> : <button className="ending-portal" onClick={throughPortal} disabled={entering} aria-label="Enter the Archival Hall through the portal"><span className="portal-shimmer" aria-hidden="true" /><span className="portal-label">ENTER THE PORTAL <ArrowRight size={15} /></span></button>}

    <section className="dialogue-scroll ending-dialogue" aria-label="Raven dialogue">
      <div className="scroll-paper" aria-hidden="true" /><div className="scroll-roll roll-left" aria-hidden="true" /><div className="scroll-roll roll-right" aria-hidden="true" />
      <div className="dialogue-content">
        <div className="dialogue-topline"><span className="speaker-label"><Feather />YOUR RAVEN GUIDE</span><span className="dialogue-pagination">{archive ? 'THE ARCHIVAL HALL' : 'JOURNEY COMPLETE'}</span></div>
        <p className="dialogue-copy">{archive ? SCRIPT.archive : SCRIPT.ending}</p>
        <div className="ending-dialogue-actions"><span>{archive ? 'Saved in this browser. Download a copy to keep.' : 'Your writing travels with you.'}</span>{archive ? <GoldButton className="small" onClick={() => setRecordOpen(true)}>View journey record <ScrollText /></GoldButton> : <GoldButton className="small" onClick={throughPortal} disabled={entering}>Enter the Archival Hall <ArrowRight /></GoldButton>}</div>
      </div>
      <div className={`dialogue-navigation ${archive ? '' : 'ending-no-arrows'}`}><RoundButton label={archive ? 'Return to the restored valley' : 'Return to your journey'} onClick={archive ? () => { onChange(progress => ({ ...progress, step: 'portal' })); playSound(); } : onReturn}><ChevronLeft /></RoundButton></div>
    </section>

    {recordOpen && <Modal title="Your journey record" onClose={() => setRecordOpen(false)} className="archive-record-modal">
      <div className="archive-record-heading"><span className="record-seal"><Feather /></span><p className="eyebrow">THE FORGE OF IDEAS</p><h3>{save.name}</h3><p>From first idea to thoughtful response.</p></div>
      <ol className="archive-stage-list">{STAGES.slice(0, 6).map(stage => <li key={stage.id}><Check size={14} /><span>{stage.number} · {stage.name}</span></li>)}</ol>
      <div className="archive-totals"><span><strong>{save.generate.selected.length}</strong> ideas gathered</span><span><strong>{save.connect.connections.length}</strong> connections forged</span><span><strong>{save.elaborate.infusions.length}</strong> responses developed</span></div>
      <div className="archive-writing"><h3>Your developed ideas</h3>{save.elaborate.infusions.map(infusion => <details key={infusion.main}><summary>{IDEA_PROMPTS.find(idea => idea.id === infusion.main)!.label}</summary><p>{infusion.response}</p></details>)}</div>
      <label className="archive-reflection-label" htmlFor="journey-reflection">One thought to carry forward <small>Optional · What helped your ideas grow? What would you try next?</small></label>
      <textarea id="journey-reflection" rows={4} maxLength={MAX_REFLECTION_TEXT} value={save.ending.reflection} onChange={event => { const reflection = event.target.value.slice(0, MAX_REFLECTION_TEXT); onChange(progress => ({ ...progress, reflection })); }} placeholder="I learned that…" aria-describedby="reflection-save-note" />
      <p id="reflection-save-note" className="archive-save-note">{save.ending.reflection.length} / {MAX_REFLECTION_TEXT} · {saveFailed ? 'Could not save in this browser. Download your notes before leaving.' : 'Saved automatically in this browser.'}</p>
      <p className="settings-note">Your record celebrates participation, not a literary grade. No account or server archive is created. Download your notes before clearing browser data.</p>
      <div className="archive-record-actions"><GoldButton onClick={onDownload}>Download quest notes <Download /></GoldButton><button className="quiet-button" onClick={() => setRecordOpen(false)}>Back to the Hall</button></div>
    </Modal>}
  </div>;
}
