const paths = [
  'M24 9V55',
  'M27 8V54L13 43',
  'M22 6L25 18L39 23L28 32L27 50L18 36L6 30L18 21Z',
  'M12 54V9L35 26V8M12 33L35 45V26',
  'M12 7L23 22L11 39L24 54M30 7L41 22L29 39L42 54',
  'M12 6V31L33 19V55M12 44L33 32',
];

export function RuneGlyph({ index }: { index: number }) {
  return <svg className="rune-glyph" viewBox="0 0 50 64" fill="none" aria-hidden="true"><path d={paths[index]} stroke="currentColor" strokeWidth="8" strokeLinejoin="miter" /></svg>;
}

export function Quill() {
  return <svg className="map-quill" viewBox="0 0 80 170" fill="none" aria-hidden="true"><path d="M9 157C29 97 42 36 72 8 77 37 57 87 28 112L9 157Z" fill="#513530" stroke="#987360" /><path d="M9 157C27 101 44 57 72 8M29 108L24 78M37 84L33 54M45 64L43 38M30 104L57 85M40 77L67 58M49 56L73 37" stroke="#a0806b" strokeWidth="1.2" /><path d="M9 157L5 169" stroke="#d5b083" strokeWidth="1.5" /></svg>;
}
