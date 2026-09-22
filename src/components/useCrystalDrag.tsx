import { useEffect, useRef, useState } from 'react';
import type { DragEvent, MouseEvent, PointerEvent } from 'react';
import type { IdeaId } from '../stage2';
import { ConnectionCrystal } from './ConnectionCrystal';

type Drag = { id: IdeaId; pointer: number; x: number; y: number; startX: number; startY: number; moved: boolean };

export function useCrystalDrag(disabled: boolean, onDrop: (id: IdeaId) => void) {
  const current = useRef<Drag | null>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const skipClick = useRef(false);
  const [dragging, setDragging] = useState<IdeaId | null>(null);
  const [over, setOver] = useState(false);
  function cancel() { cancelAnimationFrame(raf.current); current.current = null; setDragging(null); setOver(false); }
  useEffect(() => { if (disabled) cancel(); }, [disabled]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { skipClick.current = !!current.current?.moved; cancel(); } };
    const blur = () => cancel();
    window.addEventListener('keydown', escape); window.addEventListener('blur', blur);
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener('keydown', escape); window.removeEventListener('blur', blur); };
  }, []);
  const atChamber = (x: number, y: number) => !!document.elementFromPoint(x, y)?.closest('[data-elaborate-chamber]');

  function handlers(id: IdeaId) {
    return {
      onPointerDown(event: PointerEvent<HTMLButtonElement>) {
        if (disabled || event.button !== 0) return;
        skipClick.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
        current.current = { id, pointer: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
      },
      onPointerMove(event: PointerEvent<HTMLButtonElement>) {
        const drag = current.current;
        if (!drag || drag.pointer !== event.pointerId) return;
        drag.x = event.clientX; drag.y = event.clientY;
        if (!drag.moved && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 8) return;
        if (!drag.moved) { drag.moved = true; setDragging(id); }
        cancelAnimationFrame(raf.current);
        raf.current = requestAnimationFrame(() => {
          if (!current.current) return;
          if (ghost.current) ghost.current.style.transform = `translate3d(${drag.x - 23}px, ${drag.y - 31}px, 0)`;
          setOver(atChamber(drag.x, drag.y));
        });
      },
      onPointerUp(event: PointerEvent<HTMLButtonElement>) {
        const drag = current.current;
        if (!drag || drag.pointer !== event.pointerId) return;
        if (drag.moved) { skipClick.current = true; if (atChamber(event.clientX, event.clientY)) onDrop(id); }
        cancel();
      },
      onPointerCancel: cancel,
      onLostPointerCapture() { if (current.current) cancel(); },
      onDragStart(event: DragEvent<HTMLButtonElement>) { event.preventDefault(); },
      onClick(event: MouseEvent<HTMLButtonElement>) { const suppress = skipClick.current && event.detail > 0; skipClick.current = false; if (!disabled && !suppress) onDrop(id); },
    };
  }

  return { handlers, dragging, over, ghost: dragging && <div className="crystal-drag-ghost" ref={ghost} style={{ transform: `translate3d(${(current.current?.x ?? 0) - 23}px, ${(current.current?.y ?? 0) - 31}px, 0)` }} aria-hidden="true"><ConnectionCrystal /></div> };
}
