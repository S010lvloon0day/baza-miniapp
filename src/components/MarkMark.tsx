import { useId } from 'react'

/** Знак «Знания Маркаряна»: вершина-«М» с развевающимся флагом, дышащее солнце с лучами и тропа к пику. */
export default function MarkMark({ size = 44 }: { size?: number }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="mm">
      <defs>
        <linearGradient id={`mmg${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFC56B" /><stop offset="1" stopColor="#FF5A1F" />
        </linearGradient>
        <radialGradient id={`mms${id}`}><stop offset="0" stopColor="#FFF3C4" /><stop offset="1" stopColor="#FFB13D" /></radialGradient>
      </defs>
      <g className="mm-rays" style={{ transformOrigin: '12px 12px' }}>
        {Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4
          return <path key={i} d={`M${(12 + Math.cos(a) * 7.5).toFixed(1)} ${(12 + Math.sin(a) * 7.5).toFixed(1)}L${(12 + Math.cos(a) * 10.5).toFixed(1)} ${(12 + Math.sin(a) * 10.5).toFixed(1)}`} stroke="#FFD27A" strokeWidth="1.3" strokeLinecap="round" /> })}
      </g>
      <circle className="mm-sun" cx="12" cy="12" r="5" fill={`url(#mms${id})`} />
      <polygon points="2,44 15,20 22,30 30,17 46,44" fill={`url(#mmg${id})`} />
      <polygon points="15,20 19,27 15,25 11,27" fill="#FFF3DC" opacity=".9" />
      <polygon points="30,17 35,26 30,23.5 26,26" fill="#FFF3DC" opacity=".9" />
      <path className="mm-trail" d="M8 44C14 38 20 40 24 34S29 24 30 17" fill="none" stroke="#FFF3DC" strokeWidth="1.2" strokeDasharray="2 2.6" strokeLinecap="round" />
      <path d="M30 17V5.5" stroke="#FFF3DC" strokeWidth="1.4" strokeLinecap="round" />
      <path className="mm-flag" d="M30.6 5.8L39 8.2 30.6 10.8z" fill="#FF3D2E" style={{ transformOrigin: '30.6px 8.3px' }} />
    </svg>
  )
}
