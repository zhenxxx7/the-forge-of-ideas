import type { ReactNode } from 'react';
import { Corner } from './Ornament';

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
  return <button aria-label={label} title={label} className={`round-button ${className}`} onClick={onClick} disabled={disabled}>{children}<span className="button-tooltip" aria-hidden="true">{label}</span></button>;
}
