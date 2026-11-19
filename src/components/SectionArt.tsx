/** Анимированные рисунки на обложках разделов — по цвету обложки (cover-0…5). Чистый SVG + CSS. */

function Radar() {
  return (
    <>
      {[14, 30, 46, 62, 78].map(r => <circle key={r} cx="75" cy="78" r={r} fill="none" stroke="var(--cv)" strokeWidth=".8" opacity={0.25 + r / 160} />)}
      <path d="M75 0V160M-10 78H160" stroke="var(--cv)" strokeWidth=".6" opacity=".35" />
      <path className="sa-sweep" d="M75 78 L75 0 A78 78 0 0 1 142 38 Z" fill="var(--cv)" opacity=".35" />
      {[[104, 50, 3], [48, 104, 2.2], [118, 96, 1.8], [60, 40, 1.6]].map(([x, y, r], i) => (
        <g key={i}><circle cx={x} cy={y} r={r} fill="#fff" /><circle className="sa-halo" style={{ animationDelay: `${i * 0.5}s` }} cx={x} cy={y} r={r * 3} fill="var(--cv)" opacity=".35" /></g>
      ))}
    </>
  )
}

function Terminal() {
  const rows: [number, number][] = [[8, 52], [20, 80], [20, 34], [8, 66], [20, 96], [20, 48], [8, 40], [20, 72], [20, 58]]
  return (
    <>
      {rows.map(([x, w], i) => (
        <g key={i}>
          {x === 8 && <path d={`M10 ${21 + i * 13}l4 3.2-4 3.2`} stroke="#fff" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
          <rect className="sa-type" style={{ animationDelay: `${i * 0.22}s` }} x={x + 12} y={22 + i * 13} width={w} height="4.5" rx="2.2" fill="var(--cv)" opacity={x === 8 ? 0.9 : 0.45} />
        </g>
      ))}
      <rect className="sa-blink" x="20" y={22 + rows.length * 13} width="7" height="11" fill="#fff" />
    </>
  )
}

function Hexes() {
  const s = 15, lit = new Set(['2,2', '3,3', '1,4', '4,1', '3,5'])
  const out: React.ReactNode[] = []
  let k = 0
  for (let row = 0; row < 8; row++) for (let col = 0; col < 7; col++) {
    const x = col * s * 1.5 + 6, y = row * s * 1.732 + (col % 2 ? s * 0.866 : 0) + 2
    const pts = Array.from({ length: 6 }, (_, j) => `${(x + s * Math.cos(Math.PI / 3 * j)).toFixed(1)},${(y + s * Math.sin(Math.PI / 3 * j)).toFixed(1)}`).join(' ')
    out.push(lit.has(`${col},${row}`)
      ? <polygon key={k++} className="sa-hex" style={{ animationDelay: `${k * 0.07}s` }} points={pts} fill="var(--cv)" opacity=".85" />
      : <polygon key={k++} points={pts} fill="none" stroke="var(--cv)" strokeWidth=".7" opacity=".32" />)
  }
  return <>{out}</>
}

const MESH: [number, number][] = [[20, 24], [62, 14], [110, 30], [138, 64], [96, 70], [48, 58], [16, 92], [70, 104], [120, 112], [40, 138], [92, 146], [140, 140]]
const LINKS: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [5, 6], [6, 7], [7, 4], [7, 8], [8, 3], [6, 9], [9, 7], [9, 10], [10, 8], [10, 11], [11, 8], [1, 5], [2, 4]]
function Mesh() {
  return (
    <>
      {LINKS.map(([a, b], i) => <path key={i} className="sa-link" style={{ animationDelay: `${(i % 6) * 0.4}s` }} d={`M${MESH[a][0]} ${MESH[a][1]}L${MESH[b][0]} ${MESH[b][1]}`} stroke="var(--cv)" strokeWidth=".8" />)}
      {MESH.map(([x, y], i) => i % 4 === 0
        ? <g key={i}><circle cx={x} cy={y} r="4.2" fill="#fff" /><circle className="sa-halo" style={{ animationDelay: `${i * 0.3}s` }} cx={x} cy={y} r="10" fill="var(--cv)" opacity=".35" /></g>
        : <circle key={i} cx={x} cy={y} r="2.2" fill="var(--cv)" />)}
    </>
  )
}

function Arcs() {
  return (
    <g className="sa-spin">
      {Array.from({ length: 9 }, (_, i) => {
        const r = 10 + i * 9, d = 300 - i * 14
        return <circle key={i} cx="75" cy="92" r={r} fill="none" stroke="var(--cv)" strokeWidth="1.6" strokeLinecap="round"
          strokeDasharray={`${(r * 2 * Math.PI * d / 360).toFixed(1)} 999`} opacity={0.9 - i * 0.06} transform={`rotate(${-150 + i * 23} 75 92)`} />
      })}
    </g>
  )
}

function Waves() {
  return (
    <>
      {Array.from({ length: 7 }, (_, i) => (
        <path key={i} className="sa-wave" style={{ animationDelay: `${i * 0.25}s` }} d={`M-10 ${40 + i * 14} Q 37 ${24 + i * 14} 75 ${40 + i * 14} T 160 ${40 + i * 14}`}
          fill="none" stroke="var(--cv)" strokeWidth="1.4" opacity={0.85 - i * 0.09} />
      ))}
    </>
  )
}

const ARTS = [Radar, Terminal, Hexes, Mesh, Arcs, Waves]

/** Неоновые палитры постеров: [цвет линий, цвет подложки]. */
export const POSTER_PAL: [string, string][] = [
  ['#00F0E0', '#005963'], ['#FFB000', '#6B3A00'], ['#FF2D5F', '#6E0526'], ['#9B5CFF', '#34168C'], ['#5CFF2E', '#16560C'], ['#3D8BFF', '#0C2F7A'],
]

export default function SectionArt({ cover, index }: { cover?: string; index?: number }) {
  const idx = index ?? (Number((cover ?? '').replace(/\D/g, '')) || 0)
  const Art = ARTS[idx % ARTS.length]
  return (
    <svg className="sa" viewBox="0 0 150 160" preserveAspectRatio="xMidYMid slice" aria-hidden><Art /></svg>
  )
}
