import { useEffect, useRef } from 'react'

/** Анимированные обложки разделов: 24 разных рисунка, у каждого свой цвет.
 *  Каждому разделу достаётся свой рисунок — без повторов внутри одного списка, одинаково на всех экранах.
 *  Анимации только на transform/opacity/stroke — их считает видеокарта. */

type Art = { key: string; c: string; bg: string; draw: () => React.ReactNode }
const d = (i: number, step = 0.2) => ({ animationDelay: `${(i * step).toFixed(2)}s` })

const ARTS: Art[] = [
  { key: 'radar', c: '#00F0E0', bg: '#005963', draw: () => (<>
    {[14, 30, 46, 62, 78].map(r => <circle key={r} cx="75" cy="78" r={r} fill="none" stroke="var(--cv)" strokeWidth=".8" opacity={0.25 + r / 160} />)}
    <path d="M75 0V160M-10 78H160" stroke="var(--cv)" strokeWidth=".6" opacity=".35" />
    <path className="sa-spin4" style={{ transformOrigin: '75px 78px' }} d="M75 78 L75 0 A78 78 0 0 1 142 38 Z" fill="var(--cv)" opacity=".35" />
    {[[104, 50], [48, 104], [118, 96], [60, 40]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="2.4" fill="#fff" /><circle className="sa-halo" style={d(i, .5)} cx={x} cy={y} r="8" fill="var(--cv)" opacity=".35" /></g>)}
  </>) },
  { key: 'terminal', c: '#FFB000', bg: '#6B3A00', draw: () => (<>
    {[[8, 52], [20, 80], [20, 34], [8, 66], [20, 96], [20, 48], [8, 40], [20, 72], [20, 58]].map(([x, w], i) => (
      <g key={i}>{x === 8 && <path d={`M10 ${21 + i * 13}l4 3.2-4 3.2`} stroke="#fff" strokeWidth="1.2" fill="none" strokeLinecap="round" />}
        <rect className="sa-type" style={d(i, .22)} x={x + 12} y={22 + i * 13} width={w} height="4.5" rx="2.2" fill="var(--cv)" opacity={x === 8 ? .9 : .45} /></g>))}
    <rect className="sa-blink" x="20" y="139" width="7" height="11" fill="#fff" />
  </>) },
  { key: 'hex', c: '#FF2D5F', bg: '#6E0526', draw: () => {
    const s = 15, lit = new Set(['2,2', '3,3', '1,4', '4,1', '3,5']), out: React.ReactNode[] = []
    let k = 0
    for (let row = 0; row < 8; row++) for (let col = 0; col < 7; col++) {
      const x = col * s * 1.5 + 6, y = row * s * 1.732 + (col % 2 ? s * .866 : 0) + 2
      const pts = Array.from({ length: 6 }, (_, j) => `${(x + s * Math.cos(Math.PI / 3 * j)).toFixed(1)},${(y + s * Math.sin(Math.PI / 3 * j)).toFixed(1)}`).join(' ')
      out.push(lit.has(`${col},${row}`) ? <polygon key={k++} className="sa-flash" style={d(k, .07)} points={pts} fill="var(--cv)" /> : <polygon key={k++} points={pts} fill="none" stroke="var(--cv)" strokeWidth=".7" opacity=".32" />)
    }
    return <>{out}</>
  } },
  { key: 'neural', c: '#B06BFF', bg: '#34168C', draw: () => {
    const L = [[30, [30, 60, 90, 120]], [75, [20, 50, 80, 110, 140]], [120, [45, 80, 115]]] as [number, number[]][]
    const lines: React.ReactNode[] = []; let k = 0
    for (let a = 0; a < L.length - 1; a++) for (const y1 of L[a][1]) for (const y2 of L[a + 1][1])
      lines.push(<path key={k++} className="sa-link" style={d(k % 9, .3)} d={`M${L[a][0]} ${y1}L${L[a + 1][0]} ${y2}`} stroke="var(--cv)" strokeWidth=".7" />)
    return <>{lines}{L.flatMap(([x, ys], a) => ys.map((y, i) => <circle key={`${a}${i}`} className="sa-pulse" style={d(a * 3 + i, .25)} cx={x} cy={y} r="4" fill={a === 1 ? '#fff' : 'var(--cv)'} />))}</>
  } },
  { key: 'onion', c: '#5CFF2E', bg: '#16560C', draw: () => (
    <g className="sa-spin26" style={{ transformOrigin: '75px 92px' }}>
      {Array.from({ length: 9 }, (_, i) => { const r = 10 + i * 9; return <circle key={i} cx="75" cy="92" r={r} fill="none" stroke="var(--cv)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray={`${(r * 2 * Math.PI * (300 - i * 14) / 360).toFixed(1)} 999`} opacity={.9 - i * .06} transform={`rotate(${-150 + i * 23} 75 92)`} /> })}
    </g>) },
  { key: 'matrix', c: '#39FF88', bg: '#0A4A28', draw: () => (<>
    {Array.from({ length: 10 }, (_, i) => (
      <g key={i} className="sa-rain" style={{ animationDelay: `${(i * .37) % 2}s`, animationDuration: `${2.2 + (i % 4) * .5}s` }}>
        {Array.from({ length: 7 }, (_, j) => <rect key={j} x={6 + i * 14.5} y={j * 12} width="5" height="7" rx="1" fill={j === 6 ? '#fff' : 'var(--cv)'} opacity={.15 + j * .12} />)}
      </g>))}
  </>) },
  { key: 'chain', c: '#FFC83D', bg: '#5A3A00', draw: () => (<>
    {[0, 1, 2, 3].map(i => (
      <g key={i} className="sa-bob" style={d(i, .3)}>
        <rect x={12 + (i % 2) * 58} y={14 + i * 34} width="62" height="26" rx="6" fill="none" stroke="var(--cv)" strokeWidth="1.4" />
        <rect className="sa-type" style={d(i, .5)} x={20 + (i % 2) * 58} y={24 + i * 34} width="34" height="5" rx="2.5" fill="var(--cv)" opacity=".7" />
      </g>))}
    {[0, 1, 2].map(i => <path key={i} className="sa-dash" d={`M${i % 2 ? 100 : 50} ${40 + i * 34}V${48 + i * 34}`} stroke="#fff" strokeWidth="1.4" strokeDasharray="2 3" />)}
  </>) },
  { key: 'shield', c: '#3D8BFF', bg: '#0C2F7A', draw: () => (<>
    {[0, 1, 2].map(i => <path key={i} className="sa-ripple" style={d(i, .8)} d="M75 20 L118 36 V72 C118 102 98 122 75 132 C52 122 32 102 32 72 V36 Z" fill="none" stroke="var(--cv)" strokeWidth="1.5" />)}
    <path d="M75 34 L106 46 V72 C106 94 92 108 75 116 C58 108 44 94 44 72 V46 Z" fill="var(--cv)" opacity=".22" />
    <path className="sa-draw" d="M60 74 L71 85 L92 62" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" />
  </>) },
  { key: 'book', c: '#FF8A3D', bg: '#6A2A05', draw: () => (<>
    <path d="M75 40 V140" stroke="var(--cv)" strokeWidth="1.2" />
    {[0, 1, 2, 3].map(i => <path key={i} className="sa-page" style={{ ...d(i, .9), transformOrigin: '75px 90px' }} d="M75 40 C95 34 112 36 128 42 V138 C112 132 95 130 75 136 Z" fill="var(--cv)" opacity={.12 + i * .08} stroke="var(--cv)" strokeWidth=".8" />)}
    <path d="M75 40 C55 34 38 36 22 42 V138 C38 132 55 130 75 136 Z" fill="none" stroke="var(--cv)" strokeWidth="1.2" />
    {[0, 1, 2, 3, 4].map(i => <rect key={i} className="sa-type" style={d(i, .25)} x="30" y={56 + i * 14} width={34 - (i % 2) * 10} height="3.5" rx="1.7" fill="var(--cv)" opacity=".7" />)}
  </>) },
  { key: 'lock', c: '#FF5CC8', bg: '#6B0A4E', draw: () => (<>
    <g className="sa-spin12r" style={{ transformOrigin: '75px 84px' }}>
      <circle cx="75" cy="84" r="56" fill="none" stroke="var(--cv)" strokeWidth="1" strokeDasharray="3 7" opacity=".6" />
    </g>
    <g className="sa-spin8" style={{ transformOrigin: '75px 84px' }}>
      <circle cx="75" cy="84" r="42" fill="none" stroke="var(--cv)" strokeWidth="5" strokeDasharray="30 14" opacity=".55" />
    </g>
    <rect x="58" y="80" width="34" height="28" rx="6" fill="var(--cv)" opacity=".85" />
    <path className="sa-shackle" d="M64 80 V70 a11 11 0 0 1 22 0 V80" fill="none" stroke="#fff" strokeWidth="4" />
  </>) },
  { key: 'gears', c: '#A0B4C8', bg: '#2A3A4C', draw: () => {
    const gear = (cx: number, cy: number, r: number, n: number) => <g>{Array.from({ length: n }, (_, i) => <rect key={i} x={cx - 3} y={cy - r - 6} width="6" height="9" rx="1.5" fill="var(--cv)" transform={`rotate(${i * 360 / n} ${cx} ${cy})`} />)}<circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--cv)" strokeWidth="5" /><circle cx={cx} cy={cy} r={r * .3} fill="#fff" opacity=".8" /></g>
    return <><g className="sa-spin8" style={{ transformOrigin: '58px 70px' }}>{gear(58, 70, 26, 10)}</g><g className="sa-spin6r" style={{ transformOrigin: '106px 112px' }}>{gear(106, 112, 18, 8)}</g></>
  } },
  { key: 'monitor', c: '#00D1FF', bg: '#004466', draw: () => (<>
    <rect x="18" y="26" width="114" height="80" rx="8" fill="none" stroke="var(--cv)" strokeWidth="1.6" />
    <path d="M60 120 H90 M75 106 V120" stroke="var(--cv)" strokeWidth="1.6" />
    <polyline className="sa-draw2" points="24,80 40,80 48,58 58,96 68,66 78,84 92,84 100,50 110,90 126,90" fill="none" stroke="#fff" strokeWidth="1.8" strokeDasharray="260" />
    <rect className="sa-scan" x="20" y="28" width="110" height="10" fill="var(--cv)" opacity=".25" />
  </>) },
  { key: 'eq', c: '#FF4D4D', bg: '#5E0A0A', draw: () => (<>
    {Array.from({ length: 11 }, (_, i) => <rect key={i} className="sa-eq" style={{ animationDelay: `${(i * .13) % 1}s`, transformOrigin: `${12 + i * 12}px 140px` }} x={8 + i * 12} y="40" width="8" height="100" rx="3" fill="var(--cv)" opacity={.45 + (i % 3) * .2} />)}
  </>) },
  { key: 'helix', c: '#7CFFE4', bg: '#0B4F4A', draw: () => (<>
    {Array.from({ length: 13 }, (_, i) => {
      const y = 12 + i * 11
      return <g key={i} className="sa-twist" style={{ ...d(i, .12), transformOrigin: `75px ${y}px` }}>
        <path d={`M45 ${y} H105`} stroke="var(--cv)" strokeWidth="1" opacity=".5" />
        <circle cx="45" cy={y} r="3.5" fill="var(--cv)" /><circle cx="105" cy={y} r="3.5" fill="#fff" />
      </g>
    })}
  </>) },
  { key: 'atom', c: '#7A8BFF', bg: '#1E237A', draw: () => (<>
    {[0, 60, 120].map((a, i) => (
      <g key={a} transform={`rotate(${a} 75 82)`}>
        <ellipse cx="75" cy="82" rx="58" ry="20" fill="none" stroke="var(--cv)" strokeWidth="1.2" opacity=".7" />
        <g className="sa-spin4" style={{ ...d(i, .7), transformOrigin: '75px 82px' }}><circle cx="133" cy="82" r="4" fill="#fff" /></g>
      </g>))}
    <circle className="sa-pulse" cx="75" cy="82" r="9" fill="var(--cv)" />
  </>) },
  { key: 'tunnel', c: '#E040FB', bg: '#4A0B5E', draw: () => (<>
    {Array.from({ length: 7 }, (_, i) => <rect key={i} className="sa-zoom" style={{ animationDelay: `${i * .45}s`, transformOrigin: '75px 80px' }} x="10" y="15" width="130" height="130" rx="10" fill="none" stroke="var(--cv)" strokeWidth="1.4" />)}
    <path d="M10 15 L75 80 L140 15 M10 145 L75 80 L140 145" stroke="var(--cv)" strokeWidth=".6" opacity=".4" />
  </>) },
  { key: 'stars', c: '#FFE66B', bg: '#4D4300', draw: () => (<>
    {Array.from({ length: 26 }, (_, i) => { const x = (i * 53) % 146 + 2, y = (i * 37) % 150 + 4; return <circle key={i} className="sa-twinkle" style={d(i % 8, .35)} cx={x} cy={y} r={i % 5 === 0 ? 2.6 : 1.2} fill={i % 5 === 0 ? '#fff' : 'var(--cv)'} /> })}
    <path className="sa-meteor" d="M20 20 L60 50" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </>) },
  { key: 'circuit', c: '#2EF0A8', bg: '#05503A', draw: () => (<>
    {['M10 30 H60 V70 H110', 'M10 60 H40 V110 H140', 'M30 150 V120 H80 V90 H140', 'M70 10 V50 H130 V30', 'M90 150 V130 H120'].map((p, i) => (
      <g key={i}><path d={p} fill="none" stroke="var(--cv)" strokeWidth="1.2" opacity=".35" />
        <path className="sa-trace" style={d(i, .6)} d={p} fill="none" stroke="#fff" strokeWidth="1.8" strokeDasharray="14 300" /></g>))}
    {[[60, 70], [40, 110], [80, 90], [130, 30], [120, 130]].map(([x, y], i) => <rect key={i} x={x - 4} y={y - 4} width="8" height="8" rx="2" fill="var(--cv)" />)}
  </>) },
  { key: 'bubbles', c: '#29B6F6', bg: '#0A3D5E', draw: () => (<>
    {[[14, 24, 80, 'l'], [56, 58, 80, 'r'], [14, 92, 64, 'l'], [70, 124, 66, 'r']].map(([x, y, w, s], i) => (
      <g key={i} className="sa-msg" style={d(i, .5)}>
        <rect x={x as number} y={y as number} width={w as number} height="24" rx="12" fill={s === 'r' ? 'var(--cv)' : 'none'} stroke="var(--cv)" strokeWidth="1.2" opacity={s === 'r' ? .8 : .9} />
        <rect x={(x as number) + 12} y={(y as number) + 10} width={(w as number) - 30} height="4" rx="2" fill="#fff" opacity=".8" />
      </g>))}
  </>) },
  { key: 'gamepad', c: '#FF7043', bg: '#5C1E08', draw: () => (<>
    <path d="M38 62 H112 C130 62 140 80 140 100 C140 120 124 128 114 116 L104 104 H46 L36 116 C26 128 10 120 10 100 C10 80 20 62 38 62 Z" fill="none" stroke="var(--cv)" strokeWidth="1.8" />
    <path d="M40 80 V100 M30 90 H50" stroke="var(--cv)" strokeWidth="4" strokeLinecap="round" />
    {[[106, 82], [118, 92], [94, 92], [106, 102]].map(([x, y], i) => <circle key={i} className="sa-press" style={{ ...d(i, .35), transformOrigin: `${x}px ${y}px` }} cx={x} cy={y} r="5" fill={i === 0 ? '#fff' : 'var(--cv)'} />)}
    {[0, 1, 2].map(i => <circle key={i} className="sa-float" style={d(i, .7)} cx={40 + i * 35} cy="30" r="3" fill="var(--cv)" opacity=".7" />)}
  </>) },
  { key: 'card', c: '#4DD0E1', bg: '#0D4A55', draw: () => (<>
    <g className="sa-tilt" style={{ transformOrigin: '75px 80px' }}>
      <rect x="16" y="44" width="118" height="74" rx="10" fill="var(--cv)" opacity=".18" stroke="var(--cv)" strokeWidth="1.4" />
      <rect x="28" y="62" width="22" height="16" rx="3" fill="#FFD873" />
      <path d="M28 70 H50 M39 62 V78" stroke="#8A6A1E" strokeWidth=".8" />
      {[0, 1, 2, 3].map(i => <rect key={i} x={28 + i * 24} y="92" width="18" height="5" rx="2.5" fill="#fff" opacity=".75" />)}
      <circle cx="112" cy="68" r="9" fill="#FF5C5C" opacity=".85" /><circle cx="122" cy="68" r="9" fill="#FFB000" opacity=".85" />
    </g>
    <rect className="sa-glint" x="0" y="40" width="20" height="90" fill="#fff" opacity=".18" transform="skewX(-20)" />
  </>) },
  { key: 'waves', c: '#4D8CFF', bg: '#0F2A6B', draw: () => (<>
    {Array.from({ length: 7 }, (_, i) => <path key={i} className="sa-wave" style={d(i, .25)} d={`M-10 ${40 + i * 14} Q 37 ${24 + i * 14} 75 ${40 + i * 14} T 160 ${40 + i * 14}`} fill="none" stroke="var(--cv)" strokeWidth="1.4" opacity={.85 - i * .09} />)}
  </>) },
  { key: 'target', c: '#FF3D3D', bg: '#4F0A0A', draw: () => (<>
    {[60, 44, 28, 12].map((r, i) => <circle key={r} cx="75" cy="80" r={r} fill="none" stroke="var(--cv)" strokeWidth={i === 3 ? 3 : 1.2} opacity={.4 + i * .15} />)}
    <path d="M75 8 V30 M75 130 V152 M3 80 H25 M125 80 H147" stroke="var(--cv)" strokeWidth="1.4" />
    <g className="sa-aim" style={{ transformOrigin: '75px 80px' }}><circle cx="75" cy="80" r="4" fill="#fff" /><circle className="sa-halo" cx="75" cy="80" r="12" fill="var(--cv)" opacity=".4" /></g>
  </>) },
  { key: 'cube', c: '#B388FF', bg: '#3A1A7A', draw: () => (<>
    <g className="sa-bob">
      <path d="M75 30 L118 54 L75 78 L32 54 Z" fill="var(--cv)" opacity=".55" />
      <path d="M32 54 L75 78 V128 L32 104 Z" fill="var(--cv)" opacity=".3" />
      <path d="M118 54 L75 78 V128 L118 104 Z" fill="var(--cv)" opacity=".18" />
      <path d="M75 30 L118 54 V104 L75 128 L32 104 V54 Z M75 78 V128 M32 54 L75 78 L118 54" fill="none" stroke="#fff" strokeWidth="1" opacity=".7" />
    </g>
    {[0, 1, 2, 3].map(i => <circle key={i} className="sa-float" style={d(i, .5)} cx={20 + i * 37} cy={146 - (i % 2) * 8} r="2.5" fill="var(--cv)" />)}
  </>) },
]

/* Тема раздела → любимые рисунки (по порядку предпочтения). */
const THEMES: [string[], string[]][] = [
  [['osint', 'поиск', 'развед'], ['radar', 'target']],
  [['linux', 'линукс', 'терминал', 'kali'], ['terminal', 'matrix']],
  [['взлом', 'хак', 'эксплойт', 'пентест', '0day'], ['hex', 'target', 'circuit']],
  [['ии', 'ai', 'gpt', 'нейро', 'chatgpt'], ['neural', 'atom']],
  [['аноним', 'tor', 'приват'], ['onion', 'tunnel']],
  [['код', 'python', 'программ', 'разработ', 'скрипт'], ['matrix', 'circuit']],
  [['крипт', 'bitcoin', 'кошел', 'defi'], ['chain', 'cube']],
  [['безопас', 'защит'], ['shield', 'lock']],
  [['курс', 'урок', 'знани', 'теори', 'гайд', 'книг'], ['book', 'stars']],
  [['парол', 'шифр', 'unlock'], ['lock', 'shield']],
  [['инструм', 'tool', 'софт', 'программы'], ['gears', 'cube']],
  [['видео', 'стрим', 'монитор', 'тестир'], ['monitor', 'eq']],
  [['бот', 'telegram', 'телеграм', 'чат'], ['bubbles', 'circuit']],
  [['игр', 'steam', 'game'], ['gamepad', 'stars']],
  [['карт', 'оплат', 'банк', 'плат'], ['card', 'chain']],
  [['сет', 'network', 'трафик', 'перехват', 'vpn'], ['waves', 'tunnel']],
  [['музык', 'аудио', 'звук'], ['eq', 'waves']],
]

function prefsFor(title: string): string[] {
  const t = ` ${title.toLowerCase()} `
  for (const [kw, arts] of THEMES) if (kw.some(k => t.includes(k))) return arts
  return []
}

/* Запомненные назначения: одинаковый рисунок раздела на главной, в каталоге и в шапке раздела. */
const assigned = new Map<number, number>()

/** Раздаёт рисунки списку разделов без повторов (до 24 разделов — все разные). */
export function assignArts(list: { id: number; title: string }[]): Map<number, number> {
  const res = new Map<number, number>()
  const used = new Set<number>()
  const sorted = [...list].sort((a, b) => a.id - b.id)
  for (const s of sorted) {
    const prev = assigned.get(s.id)
    if (prev !== undefined && !used.has(prev)) { res.set(s.id, prev); used.add(prev); continue }
    let pick = -1
    for (const key of prefsFor(s.title)) { const i = ARTS.findIndex(a => a.key === key); if (i >= 0 && !used.has(i)) { pick = i; break } }
    if (pick < 0) { let h = 0; for (const ch of String(s.id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; for (let k = 0; k < ARTS.length; k++) { const i = (h + k) % ARTS.length; if (!used.has(i)) { pick = i; break } } }
    if (pick < 0) pick = s.id % ARTS.length
    res.set(s.id, pick); used.add(pick); assigned.set(s.id, pick)
  }
  return res
}

/** Рисунок раздела: из назначенных, иначе по теме/id. */
export function artIndexFor(s: { id: number; title: string }): number {
  const a = assigned.get(s.id)
  if (a !== undefined) return a
  return assignArts([s]).get(s.id) ?? 0
}

export const artColors = (i: number) => ({ c: ARTS[i % ARTS.length].c, bg: ARTS[i % ARTS.length].bg })
export const artStyle = (i: number) => ({ ['--cv' as string]: ARTS[i % ARTS.length].c, ['--pbg' as string]: ARTS[i % ARTS.length].bg }) as React.CSSProperties

/** Неоновые палитры для мелких элементов (список «Новое»). */
export const POSTER_PAL: [string, string][] = ARTS.map(a => [a.c, a.bg])

/* Анимация идёт только у обложек, которые сейчас видны на экране. */
let io: IntersectionObserver | null = null
function watch(el: Element) {
  if (typeof IntersectionObserver === 'undefined') return () => {}
  io ??= new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('sa-paused', !e.isIntersecting)), { rootMargin: '40px' })
  el.classList.add('sa-paused'); io.observe(el)
  return () => io?.unobserve(el)
}

export default function SectionArt({ index = 0, className = 'sa' }: { index?: number; className?: string }) {
  const art = ARTS[index % ARTS.length]
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => (ref.current ? watch(ref.current) : undefined), [])
  return <svg ref={ref} className={className} viewBox="0 0 150 160" preserveAspectRatio="xMidYMid slice" aria-hidden>{art.draw()}</svg>
}
