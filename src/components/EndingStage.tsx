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
      <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#a56728" /><stop offset=".15" stopColor="#e2b776" /><stop offset=".42" stopColor="#ffe0a1" /><stop offset=".67" stopColor="#e7be80" /><stop offset="1" stopColor="#865122" /></linearGradient>
      <linearGradient id={`${id}-gold`}><stop stopColor="#38200d" /><stop offset=".28" stopColor="#c49445" /><stop offset=".48" stopColor="#ffe4a1" /><stop offset=".7" stopColor="#946021" /><stop offset="1" stopColor="#291709" /></linearGradient>
      <radialGradient id={`${id}-seal`}><stop stopColor="#9f3f3b" /><stop offset=".72" stopColor="#742124" /><stop offset="1" stopColor="#380f15" /></radialGradient>
    </defs>
    <ellipse cx="400" cy="186" rx="340" ry="22" fill="#120b07" opacity=".55" />
    <path d="M99 52 Q398 41 701 52 L701 157 Q402 178 99 157Z" fill={`url(#${id}-paper)`} stroke="#895325" strokeWidth="3" />
    <path d="M112 65 Q395 58 688 65 M112 144 Q400 154 688 144" fill="none" stroke="#f8d596" strokeWidth="2" opacity=".6" />
    {[90, 710].map(x => <g key={x}><path d={`M${x - 10} 34 Q${x + 12} 29 ${x + 16} 47 L${x + 16} 162 Q${x + 9} 182 ${x - 10} 174Z`} fill={`url(#${id}-gold)`} stroke="#37200e" strokeWidth="4" /><path d={`M${x - 18} 53 L${x + 24} 53 M${x - 18} 152 L${x + 24} 152`} stroke="#c99950" strokeWidth="7" /><path d={`M${x < 400 ? 63 : 733} 88 l${x < 400 ? -33 : 33} 18 l${x < 400 ? 33 : -33} 17Z`} fill={`url(#${id}-gold)`} /></g>)}
    <path d="M377 46 L423 46 L433 220 L400 201 L367 220Z" fill="#79252b" stroke="#d6ac63" strokeWidth="3" />
    <circle cx="400" cy="110" r="42" fill={`url(#${id}-seal)`} stroke="#d29563" strokeWidth="3" />
    <circle cx="400" cy="110" r="32" fill="none" stroke="#c0765b" opacity=".65" />
    <path d="M387 125 Q381 102 410 87 Q416 105 391 121 M387 128 L408 94 M389 116 L402 114" fill="none" stroke="#d89c73" strokeWidth="3" strokeLinecap="round" />
  </svg>;
}

export function EndingStage({ save, paused, saveFailed, onChange, onReturn, onDownload }: Props) {
  const [recordOpen, setRecordOpen] = useState(false);
  const [visible, setVisible] = useState(!document.hidden);
  const heading = useRef<HTMLHeadingElement>(null);
  const archive = save.ending.step === 'archive';

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [archive]);
  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  function throughPortal() {
    onChange(progress => enterArchive(progress, save.challenge.completed));
    playSound('chime');
  }

  return <div className={`ending-stage ${paused || recordOpen || !visible ? 'ending-still' : ''}`}>
    <div className="ending-motes" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} style={{ '--mote-index': index, '--mote-row': index % 3 } as React.CSSProperties} />)}</div>
    <section className="ending-heading">
      <p className="eyebrow">{archive ? 'YOUR IDEAS HAVE A HOME' : 'THE LIGHT RETURNS'}</p>
      <h1 ref={heading} tabIndex={-1}>{archive ? 'The Archival Hall' : 'A journey well forged.'}</h1>
      <p>{archive ? `${save.name} · Journey complete` : 'From a spark of thought to a voice of your own.'}</p>
    </section>

    {archive ? <button className="archive-scroll-button" onClick={() => { setRecordOpen(true); playSound(); }} aria-label="Open your journey record">
      <RecordScroll /><span><ScrollText size={16} />Open your journey record</span>
    </button> : <button className="ending-portal" onClick={throughPortal} aria-label="Enter the Archival Hall through the portal"><span className="portal-shimmer" aria-hidden="true" /><span className="portal-label">ENTER THE PORTAL <ArrowRight size={15} /></span></button>}

    <section className="dialogue-scroll ending-dialogue" aria-label="Raven dialogue">
      <div className="scroll-paper" aria-hidden="true" /><div className="scroll-roll roll-left" aria-hidden="true" /><div className="scroll-roll roll-right" aria-hidden="true" />
      <div className="dialogue-content">
        <div className="dialogue-topline"><span className="speaker-label"><Feather />YOUR RAVEN GUIDE</span><span className="dialogue-pagination">{archive ? 'THE ARCHIVAL HALL' : 'JOURNEY COMPLETE'}</span></div>
        <p className="dialogue-copy">{archive ? `Welcome to the Archival Hall, ${save.name}. This scroll brings together the ideas, connections, and writing you forged. Open it to look back on your journey, add a reflection, and keep a copy of your work.` : `Congratulations, ${save.name}! The Inarticulate Beast has been defeated, and light has returned to the valley. When you are ready, step through the portal to the Archival Hall, where your work will be celebrated.`}</p>
        <div className="ending-dialogue-actions"><span>{archive ? 'Saved in this browser. Download a copy to keep.' : 'Your writing travels with you.'}</span>{archive ? <GoldButton className="small" onClick={onDownload}>Download quest notes <Download /></GoldButton> : <GoldButton className="small" onClick={throughPortal}>Enter the Archival Hall <ArrowRight /></GoldButton>}</div>
      </div>
      <div className="dialogue-navigation"><RoundButton label={archive ? 'Return to the restored valley' : 'Return to your journey'} onClick={archive ? () => { onChange(progress => ({ ...progress, step: 'portal' })); playSound(); } : onReturn}><ChevronLeft /></RoundButton></div>
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
