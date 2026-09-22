import type { CSSProperties } from 'react';
import { IDEA_PROMPTS } from '../stage2';
import type { IdeaId } from '../stage2';

const hues = [280, 35, 190, 145, 210, 320, 10, 255];

export function SortGem({ id }: { id: IdeaId }) {
  const hue = hues[IDEA_PROMPTS.findIndex(idea => idea.id === id)];
  return <svg className="sort-gem" viewBox="0 0 64 72" fill="none" aria-hidden="true" style={{ '--gem-hue': hue } as CSSProperties}>
    <path d="M30 3 48 12 59 38 45 64 18 69 4 46 10 19Z" fill={`hsl(${hue} 38% 35%)`} stroke={`hsl(${hue} 30% 78%)`} strokeWidth="1.2" />
    <path d="m30 3 7 23-27-7Z" fill={`hsl(${hue} 37% 79%)`} /><path d="m30 3 18 9 11 26-22-12Z" fill={`hsl(${hue} 47% 50%)`} />
    <path d="m10 19 27 7-10 23L4 46Z" fill={`hsl(${hue} 40% 61%)`} /><path d="m37 26 22 12-14 26-18-15Z" fill={`hsl(${hue} 50% 38%)`} />
    <path d="m4 46 23 3-9 20Z" fill={`hsl(${hue} 45% 41%)`} /><path d="m27 49 18 15-27 5Z" fill={`hsl(${hue} 32% 66%)`} />
    <path d="m37 26 4 8-9 7 1-9Z" fill="#fff8df" opacity=".67" /><path d="m10 19 20-16-7 15Z" fill="#fff9ec" opacity=".55" />
  </svg>;
}
