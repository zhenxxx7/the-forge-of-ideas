import { useEffect, useRef, useState } from 'react';
import type { DragEvent, MouseEvent, PointerEvent } from 'react';
import type { IdeaId } from '../stage2';
import { SortGem } from './SortGem';

export type ConnectionSlot = 'central' | 'supporting';
type Drag = { id: IdeaId; slot: ConnectionSlot; pointer: number; x: number; y: number; startX: number; startY: number; moved: boolean };

export function useConnectionDrag(disabled: boolean, onDrop: (id: IdeaId, slot: ConnectionSlot) => void, onCancel: () => void) {
  const [dragging, setDragging] = useState<IdeaId | null>(null);
  const [over, setOver] = useState<ConnectionSlot | null>(null);
  const drag = useRef<Drag | null>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const skipClick = useRef(false);
  function cancel() { cancelAnimationFrame(raf.current); drag.current = null; setDragging(null); setOver(null); }
  useEffect(() => { if (disabled) cancel(); }, [disabled]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { skipClick.current = !!drag.current?.moved; cancel(); } };
    const blur = () => cancel();
    window.addEventListener('keydown', escape); window.addEventListener('blur', blur);
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener('keydown', escape); window.removeEventListener('blur', blur); };
  }, []);

  function handlers(id: IdeaId, slot: ConnectionSlot) {
    return {
      onPointerDown(event: PointerEvent<HTMLButtonElement>) {
        if (disabled || event.button !== 0) return;
        skipClick.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { id, slot, pointer: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
      },
      onPointerMove(event: PointerEvent<HTMLButtonElement>) {
        const current = drag.current;
        if (!current || current.pointer !== event.pointerId) return;
        current.x = event.clientX; current.y = event.clientY;
        if (!current.moved && Math.hypot(current.x - current.startX, current.y - current.startY) < 8) return;
        if (!current.moved) { current.moved = true; setDragging(id); }
        cancelAnimationFrame(raf.current);
        raf.current = requestAnimationFrame(() => {
          if (!drag.current) return;
          if (ghost.current) ghost.current.style.transform = `translate3d(${current.x - 20}px, ${current.y - 24}px, 0)`;
          const target = document.elementFromPoint(current.x, current.y)?.closest<HTMLElement>('[data-connect-slot]')?.dataset.connectSlot;
          setOver(target === current.slot ? current.slot : null);
        });
      },
      onPointerUp(event: PointerEvent<HTMLButtonElement>) {
        const current = drag.current;
        if (!current || current.pointer !== event.pointerId) return;
        if (current.moved) {
          skipClick.current = true;
          const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-connect-slot]')?.dataset.connectSlot;
          if (target === current.slot) onDrop(current.id, current.slot); else onCancel();
        }
        cancel();
      },
      onPointerCancel: cancel,
      onLostPointerCapture() { if (drag.current) cancel(); },
      onDragStart(event: DragEvent<HTMLButtonElement>) { event.preventDefault(); },
      onClick(event: MouseEvent<HTMLButtonElement>) {
        const suppress = skipClick.current && event.detail > 0;
        skipClick.current = false;
        if (!disabled && !suppress) onDrop(id, slot);
      },
    };
  }

  return { handlers, dragging, over, ghost: dragging && <div className="connect-drag-ghost" ref={ghost} style={{ transform: `translate3d(${(drag.current?.x ?? 0) - 20}px, ${(drag.current?.y ?? 0) - 24}px, 0)` }} aria-hidden="true"><SortGem id={dragging} /></div> };
}
