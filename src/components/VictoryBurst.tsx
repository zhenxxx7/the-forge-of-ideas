import { useId } from 'react';

/** A bounded, code-native impact. Only the containing layer animates. */
export function VictoryBurst() {
  const id = useId();
  return <svg className="victory-embers" viewBox="0 0 480 350" aria-hidden="true">
    <defs>
      <radialGradient id={`${id}-smoke`}><stop stopColor="#6d1914" /><stop offset=".5" stopColor="#23191be8" /><stop offset=".85" stopColor="#171719b3" /><stop offset="1" stopColor="#10131900" /></radialGradient>
      <radialGradient id={`${id}-fire`}><stop stopColor="#fffdd9" /><stop offset=".18" stopColor="#fff759" /><stop offset=".4" stopColor="#ffac0c" /><stop offset=".7" stopColor="#e5390c" /><stop offset="1" stopColor="#a7101200" /></radialGradient>
      <linearGradient id={`${id}-flame`} x1="0" y1="1" x2=".3" y2="0"><stop stopColor="#a4130b" /><stop offset=".5" stopColor="#ff5209" /><stop offset=".8" stopColor="#ffc825" /><stop offset="1" stopColor="#fff4ac" /></linearGradient>
      <filter id={`${id}-rough`} x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="18" result="noise" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="21" /></filter>
      <filter id={`${id}-glow`}><feGaussianBlur stdDeviation="5" /></filter>
    </defs>
    <g fill={`url(#${id}-smoke)`}>
      {[[117,179,107],[341,182,117],[194,113,96],[288,108,88],[188,244,96],[294,241,103],[86,230,59],[388,219,63]].map(([cx,cy,r],i) => <circle key={i} cx={cx} cy={cy} r={r} />)}
    </g>
    <ellipse cx="244" cy="190" rx="142" ry="122" fill={`url(#${id}-fire)`} filter={`url(#${id}-glow)`} />
    <g filter={`url(#${id}-rough)`}>
      <path d="M204 258 176 226 140 241 159 205 120 171 176 182 150 135 195 151 192 94 224 129 241 75 251 139 297 100 281 152 333 143 304 179 353 200 299 212 315 251 276 240 251 288 233 252Z" fill={`url(#${id}-flame)`} />
      <path d="m211 229-17-30-30 4 27-27-6-28 33 9 17-41 12 40 31-18-6 39 29 20-29 9-9 41-23-26-22 19Z" fill="#ffd428" />
      <path d="m220 205-15-21 24-3 9-26 14 26 17 9-20 13-2 26-13-22Z" fill="#fffdd9" />
    </g>
    <g fill="#ffc53c">
      {[[123,126,7,3],[168,85,4,9],[308,80,3,8],[355,143,9,3],[374,247,5,3],[286,297,3,7],[154,288,7,3],[94,195,8,3],[337,267,4,7],[213,61,3,5]].map(([x,y,w,h],i) => <rect key={i} x={x} y={y} width={w} height={h} transform={`rotate(${i * 31} ${x} ${y})`} />)}
    </g>
  </svg>;
}
