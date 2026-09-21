export function Ornament({ className = '' }: { className?: string }) {
  return <svg className={`ornament ${className}`} viewBox="0 0 300 36" fill="none" aria-hidden="true">
    <path d="M4 18h66c19 0 21-13 31-13 9 0 12 14 2 14-9 0-6-10-1-7M296 18h-66c-19 0-21-13-31-13-9 0-12 14-2 14 9 0 6-10 1-7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M83 24c26 12 40-17 55-12M217 24c-26 12-40-17-55-12M150 2l9 16-9 16-9-16zM124 18l5-5 5 5-5 5zM166 18l5-5 5 5-5 5z" stroke="currentColor" strokeWidth="1.4" />
    <path d="m150 10 4 8-4 8-4-8z" fill="currentColor" />
  </svg>;
}

export function Corner({ className = '' }: { className?: string }) {
  return <svg className={`corner ${className}`} viewBox="0 0 70 70" fill="none" aria-hidden="true">
    <path d="M3 57V13c0-5 4-10 10-10h44M11 61V24c0-7 6-13 13-13h37" stroke="currentColor" strokeWidth="1" />
    <path d="M6 6c12 0 4 16 19 15-8 6-13 3-12-4-1 18 21 6 22 19C21 35 31 50 18 49c7-7 1-13-5-12C6 39 9 48 4 50M11 11c12 1 7 14 18 10 12-4 6-15 1-12-4 2-1 6 2 3M20 31c-2-8 10-13 18-5-8-2-10 5-18 5Z" stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity=".25" />
    <path d="m49 1 4 4-4 4-4-4zM1 49l4-4 4 4-4 4z" fill="currentColor" />
  </svg>;
}
