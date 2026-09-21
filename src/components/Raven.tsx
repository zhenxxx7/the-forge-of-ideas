import { useEffect, useState } from 'react';

export function Raven({ speakingKey, reducedMotion, landing }: { speakingKey: string | null; reducedMotion: boolean; landing: boolean }) {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    if (speakingKey === null || reducedMotion) { setSpeaking(false); return; }
    setSpeaking(true);
    const timeout = window.setTimeout(() => setSpeaking(false), 3400);
    return () => clearTimeout(timeout);
  }, [speakingKey, reducedMotion]);

  return <div className={`raven-character ${landing ? 'raven-landing' : 'raven-guide'} ${speaking ? 'is-speaking' : ''}`} aria-hidden="true">
    <img className="raven-closed" src="/assets/raven.svg" alt="" draggable={false} />
    <img className="raven-open" src="/assets/raven-beak-open.svg" alt="" draggable={false} />
  </div>;
}
