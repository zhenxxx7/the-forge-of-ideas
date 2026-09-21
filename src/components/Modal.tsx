import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Ornament } from './Ornament';

export function Modal({ title, onClose, children, className = '' }: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const lastFocus = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => { dialog.close(); lastFocus?.focus(); };
  }, []);

  return <dialog className={`modal ${className}`} ref={ref} aria-labelledby={id} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-content">
      <button className="icon-button modal-close" aria-label="Close dialog" onClick={onClose}><X /></button>
      <Ornament />
      <h2 id={id}>{title}</h2>
      {children}
    </div>
  </dialog>;
}
