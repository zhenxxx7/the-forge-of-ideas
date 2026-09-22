import { useId } from 'react';
import type { IdeaId } from '../stage2';

const colors: Record<IdeaId, string> = {
  lifelike: '#397dec', setting: '#75d64b', senses: '#31cce0', reactions: '#a869e5',
  uncertainty: '#7ed4ee', pace: '#eb9c62', control: '#db6798', contrast: '#85dc93',
};

export function InfusionVial({ main }: { main: IdeaId }) {
  const color = colors[main];
  const gradientId = `vial-${useId().replaceAll(':', '')}`;
  return <svg className="infusion-vial" viewBox="0 0 120 160" aria-hidden="true">
    <defs><linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f8fff0" /><stop offset=".35" stopColor={color} /><stop offset="1" stopColor="#122c43" /></linearGradient></defs>
    <path d="M48 8h24v28l-8 13v8c25 4 41 27 41 55 0 24-21 39-45 39S15 136 15 112c0-28 16-51 41-55v-8l-8-13Z" fill="#18293b" stroke="#e3d59d" strokeWidth="3" />
    <path d="M28 87c-4 10-5 17-5 25 0 20 16 31 37 31s37-11 37-31c0-8-1-15-5-25-19 6-45 6-64 0Z" fill={`url(#${gradientId})`} opacity=".92" />
    <path d="M30 81c15 7 45 8 60 0" fill="none" stroke="#d6ffec" strokeWidth="2" opacity=".72" />
    <path d="M36 76c-9 18-9 39 0 51M43 68l8-6" fill="none" stroke="#fffef0" strokeWidth="5" strokeLinecap="round" opacity=".55" />
    <path d="M46 24h28M46 40h28M21 122h78" stroke="#bba265" strokeWidth="6" strokeLinecap="round" />
    <path d="M52 8h16v12H52z" fill="#ae8b4e" stroke="#f4dea3" strokeWidth="2" />
    <circle cx="71" cy="108" r="5" fill="#edffe4" opacity=".65" /><circle cx="52" cy="126" r="3" fill="#edffe4" opacity=".65" />
  </svg>;
}
