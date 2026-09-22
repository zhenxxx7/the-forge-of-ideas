export function ConnectionCrystal({ strengthened = false }: { strengthened?: boolean }) {
  return <svg className={`connection-crystal ${strengthened ? 'crystal-strengthened' : ''}`} viewBox="0 0 100 140" fill="none" aria-hidden="true">
    <path d="M50 3 83 28 94 90 50 137 9 94 17 29Z" fill="#1d6667" stroke="#c1ffe1" strokeWidth="1.5" />
    <path d="M50 3 52 48 17 29Z" fill="#b8f8dc" /><path d="m50 3 33 25-31 20Z" fill="#6ad3ad" />
    <path d="m17 29 35 19-19 52L9 94Z" fill="#3baf92" /><path d="m52 48 31-20 11 62-39 11Z" fill="#247c71" />
    <path d="m52 48 3 53-22-1Z" fill="#b4f4cd" /><path d="m9 94 24 6 17 37Z" fill="#26785f" />
    <path d="m33 100 22 1-5 36Z" fill="#75d7ac" /><path d="m55 101 39-11-44 47Z" fill="#114d52" />
    <path d="m30 37 15-19-5 29Z" fill="#f6ffe4" opacity=".8" /><path d="m65 70 7-15 3 16-8 12Z" fill="#dbffe0" opacity=".8" />
    {strengthened && <><path d="m18 63 18 37 14 37 5-36 28-73" stroke="#f1e7a1" strokeWidth="2" opacity=".7" /><path d="m82 10 2 8 8 2-8 2-2 8-2-8-8-2 8-2Z" fill="#fff2b7" /></>}
  </svg>;
}
