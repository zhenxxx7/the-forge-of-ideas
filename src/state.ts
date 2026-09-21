import type { Keyword, Screen } from './data';

export const SAVE_KEY = 'forge-of-ideas:progress:v1';
export const SETTINGS_KEY = 'forge-of-ideas:settings:v1';
export type Save = {
  version: 1;
  name: string;
  screen: Extract<Screen, 'prologue' | 'prepare' | 'journey'>;
  prologueIndex: number;
  explored: Keyword[];
  completed: boolean;
};
export type Settings = { sound: boolean; reducedMotion: boolean; largeText: boolean };
const validKeywords: Keyword[] = ['how', 'moment', 'tense'];

export function cleanName(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
}

export function newSave(name: string): Save {
  return { version: 1, name: cleanName(name), screen: 'prologue', prologueIndex: 0, explored: [], completed: false };
}

export function decodeSave(raw: string | null): Save | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const s = value as Partial<Save>;
    if (s.version !== 1 || typeof s.name !== 'string' || cleanName(s.name).length < 2) return null;
    if (!['prologue', 'prepare', 'journey'].includes(s.screen ?? '')) return null;
    const explored = [...new Set((Array.isArray(s.explored) ? s.explored : []).filter((v): v is Keyword => validKeywords.includes(v)))];
    return {
      version: 1, name: cleanName(s.name),
      screen: s.screen === 'journey' && explored.length !== 3 ? 'prepare' : s.screen as Save['screen'],
      prologueIndex: Number.isInteger(s.prologueIndex) ? Math.max(0, Math.min(2, s.prologueIndex!)) : 0,
      explored, completed: s.completed === true && explored.length === 3,
    };
  } catch { return null; }
}

export function readSave(): Save | null {
  try { return decodeSave(localStorage.getItem(SAVE_KEY)); } catch { return null; }
}

export function persistSave(save: Save): boolean {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch { return false; }
}

export function readSettings(): Settings {
  const defaults: Settings = { sound: false, reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches, largeText: false };
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    if (!value || typeof value !== 'object') return defaults;
    return {
      sound: typeof value.sound === 'boolean' ? value.sound : defaults.sound,
      reducedMotion: typeof value.reducedMotion === 'boolean' ? value.reducedMotion : defaults.reducedMotion,
      largeText: typeof value.largeText === 'boolean' ? value.largeText : defaults.largeText,
    };
  } catch { return defaults; }
}
