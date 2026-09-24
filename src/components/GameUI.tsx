import type { ReactNode } from 'react';
import { Corner } from './Ornament';
import { StoryIcon } from './StoryIcon';

export function Frame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`ornate-panel ${className}`}>
    <Corner className="top-left" /><Corner className="top-right" />
    <Corner className="bottom-left" /><Corner className="bottom-right" />
    {children}
  </section>;
}

export function GoldButton({ children, onClick, type = 'button', className = '', disabled = false }: { children: ReactNode; onClick?: () => void; type?: 'button' | 'submit'; className?: string; disabled?: boolean }) {
  return <button className={`gold-button ${className}`} type={type} onClick={onClick} disabled={disabled}><span>{children}</span></button>;
}

export function RoundButton({ label, children, onClick, disabled = false, className = '' }: { label: string; children: ReactNode; onClick: () => void; disabled?: boolean; className?: string }) {
  const previous = label === 'Previous' || label === 'Return to the restored valley' || label === 'Return to your journey';
  const next = label === 'Next' || label === 'Start Stage 1' || label === 'View your journey';
  return <button aria-label={label} title={label} className={`round-button ${className}`} onClick={onClick} disabled={disabled}>{previous || next ? <StoryIcon name={previous ? 'previous' : 'next'} /> : children}<span className="button-tooltip" aria-hidden="true">{label}</span></button>;
}
