import { useEffect, useRef } from 'react'

/** Анимированные обложки разделов: почти 50 разных рисунков, у каждого свой цвет.
 *  Каждому разделу достаётся свой рисунок — без повторов внутри одного списка, одинаково на всех экранах.
 *  Анимации только на transform/opacity/stroke — их считает видеокарта. */

type Art = { key: string; c: string; bg: string; draw: () => React.ReactNode }
const d = (i: number, step = 0.2) => ({ animationDelay: `${(i * step).toFixed(2)}s` })

const ARTS: Art[] = [
  { key: 'spider', c: '#FF5370', bg: '#4F0A1C', draw: () => (<>
    {Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return <path key={i} d={`M0 0L${(Math.cos(a) * 80).toFixed(1)} ${(Math.sin(a) * 80).toFixed(1)}`} transform="translate(40 40)" stroke="var(--cv)" strokeWidth=".7" opacity=".55" /> })}
    {[16, 32, 48, 64].map(r => <polygon key={r} transform="translate(40 40)" points={Array.from({ length: 8 }, (_, i) => `${(Math.cos(i * Math.PI / 4) * r).toFixed(1)},${(Math.sin(i * Math.PI / 4) * r).toFixed(1)}`).join(' ')} fill="none" stroke="var(--cv)" strokeWidth=".7" opacity=".55" />)}
    <path d="M104 0V64" stroke="#fff" strokeWidth=".8" opacity=".6" className="sa-wave" />
    <g className="sa-wave"><ellipse cx="104" cy="74" rx="9" ry="11" fill="var(--cv)" /><circle cx="104" cy="60" r="6" fill="var(--cv)" />
      <path d="M96 68l-12-6M96 74H82M96 80l-12 6M112 68l12-6M112 74h14M112 80l12 6" stroke="var(--cv)" strokeWidth="1.6" strokeLinecap="round" /></g>
  </>) },
  { key: 'hoodie', c: '#00E676', bg: '#003D1E', draw: () => (<>
    <path d="M30 150C30 112 44 96 56 90a32 32 0 1 1 38 0c12 6 26 22 26 60z" fill="#081A10" stroke="var(--cv)" strokeWidth="1.4" />
    <path d="M52 66a23 26 0 0 1 46 0v12a23 18 0 0 1-46 0z" fill="#000" />
    <g className="sa-blink"><rect x="62" y="70" width="8" height="3" rx="1.5" fill="var(--cv)" /><rect x="80" y="70" width="8" height="3" rx="1.5" fill="var(--cv)" /></g>
    <rect x="44" y="118" width="62" height="30" rx="3" fill="#0A2416" stroke="var(--cv)" strokeWidth="1" />
    {[0, 1, 2].map(i => <rect key={i} className="sa-type" style={d(i, .4)} x="50" y={124 + i * 7} width={[40, 28, 48][i]} height="3" rx="1.5" fill="var(--cv)" />)}
  </>) },
  { key: 'crack', c: '#FFAB00', bg: '#4D3300', draw: () => (<>
    <path d="M75 18l46 18v34c0 34-20 54-46 66-26-12-46-32-46-66V36z" fill="var(--cv)" opacity=".18" stroke="var(--cv)" strokeWidth="1.6" />
    <path className="sa-draw" style={{ strokeDasharray: 60 }} d="M80 20L68 52 84 66 64 96 78 112 70 134" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinejoin="round" />
    {[[40, 120], [112, 112], [30, 70]].map(([x, y], i) => <rect key={i} className="sa-msg" style={d(i, .6)} x={x} y={y} width="7" height="7" fill="var(--cv)" transform={`rotate(${20 + i * 30} ${x} ${y})`} />)}
  </>) },
  { key: 'hexdump', c: '#76FF03', bg: '#1E4000', draw: () => (<>
    {Array.from({ length: 10 }, (_, i) => <text key={i} className={i === 5 ? 'sa-twinkle' : undefined} x="8" y={22 + i * 13} fontSize="7.2" fill={i === 5 ? '#fff' : 'var(--cv)'} opacity={i === 5 ? 1 : .55} fontFamily="ui-monospace,Menlo,monospace">{`${(0x4010 + i * 16).toString(16)}  ${['90 90 90 90 31 c0 50 68', '2f 2f 73 68 68 2f 62 69', '6e 89 e3 50 53 89 e1 b0', '0b cd 80 eb fe 41 41 41', '41 41 41 41 41 41 41 41', 'ef be ad de 0d f0 ad ba', '00 00 00 00 ff ff ff ff', 'e8 c0 ff ff ff 2f 62 69', '6e 2f 73 68 00 cc cc cc', 'c3 90 90 90 90 90 90 90'][i]}`}</text>)}
    <rect className="sa-scan" x="4" y="14" width="142" height="10" fill="#fff" opacity=".1" />
  </>) },
  { key: 'plane', c: '#40C4FF', bg: '#073A55', draw: () => (<>
    <path className="sa-dash" d="M10 140C40 120 50 140 80 110" stroke="var(--cv)" strokeWidth="1.4" strokeDasharray="4 5" fill="none" />
    <g className="sa-float"><path d="M138 30L26 74l34 12 6 34 16-22 28 18z" fill="var(--cv)" opacity=".9" /><path d="M60 86l78-56-56 68" fill="#fff" opacity=".5" /></g>
  </>) },
  { key: 'checklist', c: '#69F0AE', bg: '#0A4026', draw: () => (<>
    <rect x="26" y="18" width="98" height="126" rx="8" fill="#08160F" stroke="var(--cv)" strokeWidth="1.2" />
    {[0, 1, 2, 3, 4].map(i => <g key={i}><rect x="38" y={34 + i * 21} width="12" height="12" rx="3" fill="none" stroke="var(--cv)" strokeWidth="1.2" />
      <path className="sa-draw" style={{ ...d(i, .35), strokeDasharray: 60 }} d={`M40 ${40 + i * 21}l4 4 7-8`} stroke={i === 3 ? '#FF5252' : '#fff'} strokeWidth="2" fill="none" />
      <rect x="58" y={37 + i * 21} width={[52, 40, 56, 34, 46][i]} height="5" rx="2.5" fill="var(--cv)" opacity=".45" /></g>)}
  </>) },
  { key: 'wrench', c: '#B0BEC5', bg: '#263238', draw: () => (<>
    <g className="sa-tilt" style={{ transformOrigin: '75px 80px' }}><path d="M104 26a24 24 0 0 0-30 30L28 102a10 10 0 0 0 14 14l46-46a24 24 0 0 0 30-30l-14 14-12-2-2-12z" fill="var(--cv)" opacity=".85" /></g>
    <g className="sa-rot" style={{ transformOrigin: '118px 120px' }}><circle cx="118" cy="120" r="14" fill="none" stroke="#fff" strokeWidth="5" strokeDasharray="5 4" /></g>
  </>) },
  { key: 'coin', c: '#F7931A', bg: '#4D2A00', draw: () => (<>
    <g className="sa-coin" style={{ transformOrigin: '75px 72px' }}><circle cx="75" cy="72" r="38" fill="var(--cv)" /><circle cx="75" cy="72" r="31" fill="none" stroke="#fff" strokeWidth="1.2" opacity=".5" />
      <text x="75" y="88" textAnchor="middle" fontSize="46" fontWeight="800" fill="#fff" fontFamily="Inter,Arial,sans-serif">₿</text></g>
    {[[22, 130], [46, 140], [104, 138], [128, 126]].map(([x, y], i) => <g key={i} className="sa-msg" style={d(i, .7)}><rect x={x - 9} y={y - 4} width="18" height="8" rx="2" fill="none" stroke="var(--cv)" strokeWidth="1" /></g>)}
    <path d="M31 130H37M55 140H95M113 138H119" stroke="var(--cv)" strokeWidth=".8" strokeDasharray="2 2" className="sa-dash" />
  </>) },
  { key: 'question', c: '#00E5FF', bg: '#004450', draw: () => (<>
    <g className="sa-bob"><path d="M20 30h110a10 10 0 0 1 10 10v56a10 10 0 0 1-10 10H62l-22 18v-18H20a10 10 0 0 1-10-10V40a10 10 0 0 1 10-10z" fill="var(--cv)" opacity=".2" stroke="var(--cv)" strokeWidth="1.4" />
      <text x="75" y="88" textAnchor="middle" fontSize="54" fontWeight="800" fill="#fff" fontFamily="Inter,Arial,sans-serif">?</text></g>
    {[0, 1, 2].map(i => <circle key={i} className="sa-pulse" style={d(i, .3)} cx={98 + i * 12} cy="140" r="3.5" fill="var(--cv)" />)}
  </>) },
  { key: 'film', c: '#FF4081', bg: '#550022', draw: () => (<>
    <g className="sa-roll">{[0, 1].map(r => <g key={r}><rect x="-30" y={24 + r * 52} width="220" height="40" fill="#14060C" stroke="var(--cv)" strokeWidth="1" />
      {Array.from({ length: 12 }, (_, i) => <g key={i}><rect x={-26 + i * 18} y={27 + r * 52} width="7" height="5" rx="1" fill="var(--cv)" opacity=".7" /><rect x={-26 + i * 18} y={56 + r * 52} width="7" height="5" rx="1" fill="var(--cv)" opacity=".7" /></g>)}</g>)}</g>
    <rect x="10" y="134" width="130" height="8" rx="4" fill="var(--cv)" opacity=".25" /><rect className="sa-type" x="10" y="134" width="90" height="8" rx="4" fill="var(--cv)" />
    <path d="M60 20V128" stroke="#fff" strokeWidth="1.4" opacity=".8" />
  </>) },
  { key: 'server', c: '#00B0FF', bg: '#003352', draw: () => (<>
    {[0, 1, 2, 3].map(i => <g key={i}><rect x="28" y={22 + i * 30} width="94" height="24" rx="4" fill="#061A28" stroke="var(--cv)" strokeWidth="1.2" />
      {[0, 1, 2, 3, 4].map(k => <rect key={k} x={38 + k * 8} y={30 + i * 30} width="4" height="8" rx="1" fill="var(--cv)" opacity=".4" />)}
      <circle className="sa-blink" style={d(i + 1, .27)} cx="104" cy={34 + i * 30} r="2.6" fill="#00E676" /><circle className="sa-blink" style={d(i, .41)} cx="112" cy={34 + i * 30} r="2.6" fill="var(--cv)" /></g>)}
  </>) },
  { key: 'bulb', c: '#FFEB3B', bg: '#4A4300', draw: () => (<>
    {Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return <path key={i} className="sa-twinkle" style={d(i, .2)} d={`M${75 + Math.cos(a) * 46} ${66 + Math.sin(a) * 46}L${75 + Math.cos(a) * 58} ${66 + Math.sin(a) * 58}`} stroke="var(--cv)" strokeWidth="3" strokeLinecap="round" /> })}
    <path className="sa-pulse" d="M75 34a28 28 0 0 0-16 51c3 3 4 6 4 10h24c0-4 1-7 4-10a28 28 0 0 0-16-51z" fill="var(--cv)" opacity=".9" />
    <rect x="63" y="100" width="24" height="6" rx="2" fill="#fff" opacity=".7" /><rect x="66" y="109" width="18" height="6" rx="2" fill="#fff" opacity=".5" />
  </>) },
  { key: 'plug', c: '#B2FF59', bg: '#2E4A00', draw: () => (<>
    <g className="sa-bob"><path d="M58 20v22M82 20v22" stroke="var(--cv)" strokeWidth="5" strokeLinecap="round" /><rect x="46" y="40" width="48" height="30" rx="7" fill="var(--cv)" /><path d="M70 70v14" stroke="var(--cv)" strokeWidth="6" /></g>
    <path className="sa-dash" d="M70 86C70 120 20 110 20 148" stroke="var(--cv)" strokeWidth="2.4" fill="none" strokeDasharray="4 4" />
    <text className="sa-twinkle" x="78" y="128" fontSize="9" fill="#fff" fontFamily="ui-monospace,Menlo,monospace">200 OK</text>
  </>) },
  { key: 'chip', c: '#EA80FC', bg: '#3E0F4A', draw: () => (<>
    {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M${48 + i * 11} 18v18M${48 + i * 11} 124v18M18 ${48 + i * 11}h18M114 ${48 + i * 11}h18`} stroke="var(--cv)" strokeWidth="2" opacity=".6" />)}
    <rect x="36" y="36" width="78" height="88" rx="8" fill="#1A0820" stroke="var(--cv)" strokeWidth="1.6" />
    <rect className="sa-pulse" x="56" y="58" width="38" height="44" rx="4" fill="var(--cv)" opacity=".5" />
    <text x="75" y="85" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily="ui-monospace,Menlo,monospace">LLM</text>
  </>) },
  { key: 'globe', c: '#00E5A0', bg: '#00402C', draw: () => (<>
    <g><circle cx="75" cy="78" r="48" fill="none" stroke="var(--cv)" strokeWidth="1.4" />
      <g className="sa-sway">{[-36, -12, 12, 36].map(o => <ellipse key={o} cx={75 + o} cy="78" rx={Math.max(4, 48 - Math.abs(o) * 1.1)} ry="48" fill="none" stroke="var(--cv)" strokeWidth=".6" opacity=".5" />)}</g>
      {[-24, 0, 24].map(o => <path key={o} d={`M${75 - Math.sqrt(48 * 48 - o * o)} ${78 + o}H${75 + Math.sqrt(48 * 48 - o * o)}`} stroke="var(--cv)" strokeWidth=".6" opacity=".5" />)}</g>
    <g className="sa-bob"><path d="M96 52c-9 0-16 7-16 16 0 12 16 26 16 26s16-14 16-26c0-9-7-16-16-16z" fill="#fff" /><circle cx="96" cy="68" r="5" fill="var(--pbg)" /></g>
    <circle className="sa-halo" cx="96" cy="96" r="10" fill="var(--cv)" opacity=".5" />
  </>) },
  { key: 'bug', c: '#FF5252', bg: '#5C0B12', draw: () => (<>
    <g className="sa-bob"><ellipse cx="75" cy="86" rx="22" ry="30" fill="none" stroke="var(--cv)" strokeWidth="1.6" /><circle cx="75" cy="52" r="10" fill="none" stroke="var(--cv)" strokeWidth="1.6" />
      <path d="M75 58V116M53 76H32M53 92H30M53 106H36M97 76h21M97 92h23M97 106h-1h18M69 44l-8-10M81 44l8-10" stroke="var(--cv)" strokeWidth="1.4" strokeLinecap="round" /></g>
    <g className="sa-float" style={d(1, .5)}><circle cx="112" cy="40" r="15" fill="none" stroke="#fff" strokeWidth="2" /><path d="M123 51l13 13" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></g>
    {[[40, 130], [112, 128], [30, 40]].map(([x, y], i) => <circle key={i} className="sa-twinkle" style={d(i, .6)} cx={x} cy={y} r="2" fill="var(--cv)" />)}
  </>) },
  { key: 'phone', c: '#7CFF6B', bg: '#123F0C', draw: () => (<>
    <rect className="sa-tilt" x="45" y="16" width="60" height="122" rx="11" fill="#0A0F0A" stroke="var(--cv)" strokeWidth="1.4" />
    <rect x="66" y="22" width="18" height="4" rx="2" fill="var(--cv)" opacity=".5" />
    {Array.from({ length: 12 }, (_, i) => <rect key={i} className="sa-pulse" style={d(i, .18)} x={53 + (i % 3) * 16} y={36 + Math.floor(i / 3) * 18} width="11" height="11" rx="3" fill="var(--cv)" opacity={i % 4 === 1 ? .95 : .4} />)}
    <rect x="62" y="124" width="26" height="3" rx="1.5" fill="#fff" opacity=".6" />
  </>) },
  { key: 'browser', c: '#4FC3F7', bg: '#0A3550', draw: () => (<>
    <rect x="12" y="26" width="128" height="104" rx="8" fill="#08131C" stroke="var(--cv)" strokeWidth="1" />
    <rect x="12" y="26" width="128" height="16" rx="8" fill="var(--cv)" opacity=".25" />
    <rect x="40" y="30" width="90" height="8" rx="4" fill="#08131C" /><text x="44" y="36.5" fontSize="6" fill="var(--cv)" fontFamily="ui-monospace,Menlo,monospace">https://target.site/?q=</text>
    {['<script>', '  alert(1)', '</script>', "' OR 1=1 --"].map((t, i) => <text key={i} className="sa-type" style={d(i, .5)} x="22" y={62 + i * 15} fontSize="9" fill={i === 3 ? '#fff' : 'var(--cv)'} fontFamily="ui-monospace,Menlo,monospace">{t}</text>)}
  </>) },
  { key: 'packets', c: '#26C6DA', bg: '#053A40', draw: () => (<>
    {Array.from({ length: 9 }, (_, i) => <g key={i}><text x="12" y={30 + i * 13} fontSize="6.5" fill="var(--cv)" opacity=".7" fontFamily="ui-monospace,Menlo,monospace">{['TCP', 'UDP', 'DNS', 'HTTP', 'TLS', 'ARP', 'TCP', 'ICMP', 'SSH'][i]}</text>
      <rect x="38" y={25 + i * 13} width={40 + ((i * 37) % 60)} height="5" rx="2.5" fill="var(--cv)" opacity=".35" /></g>)}
    <rect className="sa-scan" x="8" y="20" width="136" height="12" rx="3" fill="#fff" opacity=".18" />
    <path className="sa-draw" d="M10 146q12-18 24 0t24 0 24 0 24 0 24 0 24 0" stroke="var(--cv)" strokeWidth="1.6" fill="none" strokeDasharray="60" />
  </>) },
  { key: 'soc', c: '#FF9100', bg: '#4F2600', draw: () => (<>
    <rect x="10" y="20" width="130" height="120" rx="9" fill="#110B05" stroke="var(--cv)" strokeWidth=".8" />
    {[30, 52, 22, 64, 40, 70, 34].map((h, i) => <rect key={i} className="sa-eq" style={d(i, .15)} x={20 + i * 16} y={128 - h} width="10" height={h} rx="2" fill="var(--cv)" opacity=".55" />)}
    <g className="sa-twinkle"><rect x="20" y="30" width="62" height="16" rx="4" fill="#FF3D3D" opacity=".85" /><text x="26" y="41" fontSize="7.5" fill="#fff" fontFamily="ui-monospace,Menlo,monospace">ALERT ▲ 3</text></g>
    <circle className="sa-halo" cx="122" cy="38" r="8" fill="var(--cv)" opacity=".5" /><circle cx="122" cy="38" r="3" fill="#fff" />
  </>) },
  { key: 'eye', c: '#18FFFF', bg: '#00474A', draw: () => (<>
    <path d="M10 80Q75 20 140 80Q75 140 10 80Z" fill="none" stroke="var(--cv)" strokeWidth="1.6" />
    <g className="sa-float"><circle cx="75" cy="80" r="24" fill="none" stroke="var(--cv)" strokeWidth="1.2" /><circle cx="75" cy="80" r="11" fill="var(--cv)" /><circle cx="70" cy="75" r="3.5" fill="#fff" /></g>
    <path className="sa-sweep" d="M75 78L75 30" stroke="#fff" strokeWidth=".8" opacity=".5" />
    {[30, 50, 70].map((r, i) => <circle key={i} className="sa-ripple" style={d(i, .8)} cx="75" cy="76" r={r} fill="none" stroke="var(--cv)" strokeWidth=".6" />)}
  </>) },
  { key: 'ghost', c: '#E1BEE7', bg: '#3A1946', draw: () => (<>
    <g className="sa-float"><path d="M45 130V70a30 30 0 0 1 60 0v60l-10-9-10 9-10-9-10 9-10-9z" fill="var(--cv)" opacity=".85" /><circle cx="64" cy="74" r="5" fill="#1A0E22" /><circle cx="86" cy="74" r="5" fill="#1A0E22" /></g>
    {[[25, 40], [125, 55], [30, 120], [120, 125], [100, 20]].map(([x, y], i) => <circle key={i} className="sa-twinkle" style={d(i, .45)} cx={x} cy={y} r="2.2" fill="#fff" />)}
    <path d="M10 146H140" stroke="var(--cv)" strokeWidth=".6" strokeDasharray="3 5" className="sa-dash" opacity=".6" />
  </>) },
  { key: 'camera', c: '#FFD740', bg: '#4D3B00', draw: () => (<>
    <path d="M20 30V60H40" stroke="var(--cv)" strokeWidth="2" fill="none" />
    <g className="sa-pan" style={{ transformOrigin: '40px 60px' }}><rect x="40" y="48" width="64" height="26" rx="5" fill="var(--cv)" opacity=".85" /><circle cx="104" cy="61" r="9" fill="#1F1800" stroke="var(--cv)" strokeWidth="2" /><circle className="sa-blink" cx="50" cy="56" r="2.4" fill="#FF3D3D" />
      <path d="M112 61L150 40V82Z" fill="var(--cv)" opacity=".15" /></g>
    {[18, 30, 42].map((r, i) => <path key={i} className="sa-twinkle" style={d(i, .4)} d={`M${75 - r} ${130 - r * .2}a${r} ${r} 0 0 1 ${r * 2} 0`} stroke="var(--cv)" strokeWidth="1.4" fill="none" />)}
    <circle cx="75" cy="130" r="4" fill="#fff" />
  </>) },
  { key: 'braces', c: '#FFEA00', bg: '#4A4200', draw: () => (<>
    <text className="sa-bob" x="18" y="104" fontSize="70" fontWeight="700" fill="var(--cv)" fontFamily="ui-monospace,Menlo,monospace">{'{'}</text>
    <text className="sa-bob" style={d(1, .5)} x="96" y="104" fontSize="70" fontWeight="700" fill="var(--cv)" fontFamily="ui-monospace,Menlo,monospace">{'}'}</text>
    {['const o = {', '  proto: x,', '  ...obj', '}'].map((t, i) => <text key={i} className="sa-type" style={d(i, .45)} x="50" y={64 + i * 12} fontSize="7.5" fill="#fff" opacity=".85" fontFamily="ui-monospace,Menlo,monospace">{t}</text>)}
  </>) },
  { key: 'repl', c: '#FFD43B', bg: '#203A5A', draw: () => (<>
    {['>>> import os', '>>> def run():', '...     return 42', '>>> run()', '42', '>>> for i in range(3):'].map((t, i) => (
      <text key={i} className="sa-type" style={d(i, .4)} x="12" y={36 + i * 17} fontSize="9" fill={i === 4 ? '#fff' : i % 2 ? '#5FA8FF' : 'var(--cv)'} fontFamily="ui-monospace,Menlo,monospace">{t}</text>))}
    <rect className="sa-blink" x="12" y="140" width="7" height="2.4" fill="#fff" />
  </>) },
  { key: 'fingerprint', c: '#69F0AE', bg: '#0B4A2B', draw: () => (<>
    {[12, 20, 28, 36, 44, 52].map((r, i) => <path key={i} className="sa-draw" style={{ ...d(i, .25), strokeDasharray: 60 }} d={`M${75 - r} ${84}a${r} ${r * 1.15} 0 0 1 ${r * 2} 0v${10 + i * 3}`} stroke="var(--cv)" strokeWidth="1.8" fill="none" strokeLinecap="round" />)}
    <rect className="sa-scan" x="14" y="24" width="122" height="3" rx="1.5" fill="#fff" opacity=".7" />
  </>) },
  { key: 'redteam', c: '#FF1744', bg: '#5A0016', draw: () => (<>
    <path d="M100 30v100" stroke="#fff" strokeWidth="2.5" opacity=".25" />
    {[0, 1, 2].map(i => <g key={i} className="sa-msg" style={d(i, 1.2)}><path d={`M14 ${50 + i * 30}H86`} stroke="var(--cv)" strokeWidth="2.2" /><path d={`M80 ${44 + i * 30}l9 6-9 6`} fill="var(--cv)" /></g>)}
    {[[100, 48], [100, 80], [100, 110]].map(([x, y], i) => <circle key={i} className="sa-halo" style={d(i, 1.2)} cx={x} cy={y} r="10" fill="var(--cv)" opacity=".6" />)}
    <path d="M118 30l18 10v26c0 18-8 26-18 30-10-4-18-12-18-30" fill="none" stroke="var(--cv)" strokeWidth="1" opacity=".5" />
  </>) },
  { key: 'ransom', c: '#FF6E40', bg: '#5A1A08', draw: () => (<>
    {[[18, 30], [62, 30], [106, 30], [18, 88], [62, 88], [106, 88]].map(([x, y], i) => <g key={i}>
      <path d={`M${x} ${y}h18l8 8v36h-26z`} fill="#1A0A05" stroke="var(--cv)" strokeWidth="1" opacity=".8" />
      <g className="sa-flash" style={d(i, .3)}><rect x={x + 6} y={y + 22} width="14" height="11" rx="2" fill="var(--cv)" /><path d={`M${x + 9} ${y + 22}v-4a4 4 0 0 1 8 0v4`} stroke="var(--cv)" strokeWidth="1.6" fill="none" /></g></g>)}
    <text className="sa-twinkle" x="30" y="150" fontSize="8" fill="#fff" fontFamily="ui-monospace,Menlo,monospace">.locked  ₿ 0.5</text>
  </>) },
  { key: 'virus', c: '#C6FF00', bg: '#334200', draw: () => (<>
    <g className="sa-rot">{Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5, x = 75 + Math.cos(a) * 40, y = 80 + Math.sin(a) * 40; return <g key={i}><path d={`M${75 + Math.cos(a) * 26} ${80 + Math.sin(a) * 26}L${x} ${y}`} stroke="var(--cv)" strokeWidth="2" /><circle cx={x} cy={y} r="4.5" fill="var(--cv)" /></g> })}
      <circle cx="75" cy="80" r="27" fill="var(--cv)" opacity=".25" stroke="var(--cv)" strokeWidth="1.6" /></g>
    {[[64, 72], [84, 86], [72, 92]].map(([x, y], i) => <circle key={i} className="sa-pulse" style={d(i, .4)} cx={x} cy={y} r="4" fill="#fff" opacity=".8" />)}
  </>) },
  { key: 'topology', c: '#40C4FF', bg: '#06344D', draw: () => {
    const N = [[30, 40], [75, 28], [120, 46], [44, 92], [100, 96], [70, 136], [130, 128]]
    const E = [[0, 1], [1, 2], [0, 3], [1, 4], [2, 4], [3, 4], [3, 5], [4, 6], [5, 6]]
    return <>{E.map(([a, b], i) => <path key={i} className="sa-dash" d={`M${N[a][0]} ${N[a][1]}L${N[b][0]} ${N[b][1]}`} stroke="var(--cv)" strokeWidth="1" strokeDasharray="3 4" opacity=".7" />)}
      {N.map(([x, y], i) => <g key={i}><rect x={x - 8} y={y - 6} width="16" height="12" rx="2.5" fill="#06202E" stroke="var(--cv)" strokeWidth="1.2" /><circle className="sa-blink" style={d(i, .3)} cx={x - 3} cy={y} r="1.5" fill="#fff" /></g>)}</>
  } },
  { key: 'robot', c: '#80D8FF', bg: '#0B3A55', draw: () => (<>
    <g className="sa-bob"><path d="M75 26v14" stroke="var(--cv)" strokeWidth="2" /><circle className="sa-halo" cx="75" cy="24" r="5" fill="var(--cv)" /><circle cx="75" cy="24" r="3" fill="#fff" />
      <rect x="40" y="40" width="70" height="56" rx="14" fill="#08202E" stroke="var(--cv)" strokeWidth="1.6" />
      <rect className="sa-blink" x="54" y="58" width="12" height="12" rx="6" fill="var(--cv)" /><rect className="sa-blink" x="84" y="58" width="12" height="12" rx="6" fill="var(--cv)" />
      <path d="M62 84h26" stroke="var(--cv)" strokeWidth="2" strokeLinecap="round" /></g>
    <g className="sa-msg"><rect x="20" y="108" width="74" height="22" rx="11" fill="var(--cv)" opacity=".85" /><text x="30" y="122" fontSize="8" fill="#08202E" fontFamily="ui-monospace,Menlo,monospace">Привет! Чем…</text></g>
  </>) },
  { key: 'cloud', c: '#B3E5FC', bg: '#103A55', draw: () => (<>
    <path className="sa-float" d="M42 96a20 20 0 0 1 4-39 28 28 0 0 1 54-6 22 22 0 0 1 8 45z" fill="var(--cv)" opacity=".25" stroke="var(--cv)" strokeWidth="1.6" />
    {[54, 75, 96].map((x, i) => <g key={i} className="sa-msg" style={d(i, .7)}><path d={`M${x} 140V112`} stroke="var(--cv)" strokeWidth="2" /><path d={`M${x - 6} 118l6-7 6 7`} stroke="var(--cv)" strokeWidth="2" fill="none" /></g>)}
  </>) },
  { key: 'db', c: '#FFAB40', bg: '#4D2C00', draw: () => (<>
    {[0, 1, 2].map(i => <g key={i} className="sa-bob" style={d(i, .3)}><ellipse cx="62" cy={36 + i * 32} rx="36" ry="10" fill="#1A1000" stroke="var(--cv)" strokeWidth="1.4" /><path d={`M26 ${36 + i * 32}v20a36 10 0 0 0 72 0v-20`} fill="none" stroke="var(--cv)" strokeWidth="1.4" /></g>)}
    <text className="sa-type" x="20" y="144" fontSize="8" fill="#fff" fontFamily="ui-monospace,Menlo,monospace">SELECT * FROM users</text>
    <circle className="sa-halo" cx="118" cy="50" r="10" fill="var(--cv)" opacity=".5" />
  </>) },
  { key: 'wifi', c: '#64FFDA', bg: '#004D40', draw: () => (<>
    {[16, 32, 48, 64].map((r, i) => <path key={i} className="sa-twinkle" style={d(3 - i, .3)} d={`M${75 - r * .9} ${118 - r * .45}a${r} ${r} 0 0 1 ${r * 1.8} 0`} stroke="var(--cv)" strokeWidth="5" fill="none" strokeLinecap="round" />)}
    <circle cx="75" cy="124" r="7" fill="#fff" /><circle className="sa-halo" cx="75" cy="124" r="14" fill="var(--cv)" opacity=".4" />
  </>) },
  { key: 'key', c: '#FFE57F', bg: '#4D3F00', draw: () => (<>
    <g className="sa-tilt" style={{ transformOrigin: '50px 80px' }}><circle cx="50" cy="80" r="22" fill="none" stroke="var(--cv)" strokeWidth="5" /><path d="M72 80H130M112 80v16M124 80v12" stroke="var(--cv)" strokeWidth="5" strokeLinecap="round" /></g>
    <rect className="sa-glint" x="0" y="50" width="16" height="60" fill="#fff" opacity=".25" />
    {[0, 1, 2, 3, 4, 5].map(i => <circle key={i} className="sa-flash" style={d(i, .25)} cx={38 + i * 15} cy="132" r="4" fill="var(--cv)" />)}
  </>) },
  { key: 'disk', c: '#90CAF9', bg: '#0D2F55', draw: () => (<>
    <rect x="18" y="24" width="114" height="112" rx="10" fill="#0A1626" stroke="var(--cv)" strokeWidth="1.2" />
    <g className="sa-rot"><circle cx="68" cy="80" r="40" fill="none" stroke="var(--cv)" strokeWidth="1.2" /><circle cx="68" cy="80" r="26" fill="none" stroke="var(--cv)" strokeWidth=".7" opacity=".6" /><path d="M68 40v12" stroke="#fff" strokeWidth="1.4" /></g>
    <circle cx="68" cy="80" r="6" fill="var(--cv)" /><path className="sa-tilt" style={{ transformOrigin: '118px 120px' }} d="M118 120L84 76" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
  </>) },
  { key: 'phish', c: '#FF80AB', bg: '#5A0E30', draw: () => (<>
    <g className="sa-bob"><rect x="22" y="64" width="80" height="54" rx="6" fill="#1C0812" stroke="var(--cv)" strokeWidth="1.4" /><path d="M22 66l40 28 40-28" stroke="var(--cv)" strokeWidth="1.4" fill="none" /></g>
    <path d="M118 10V60" stroke="#fff" strokeWidth="1" opacity=".6" />
    <path className="sa-wave" d="M118 60v14a9 9 0 0 1-18 0" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <text className="sa-twinkle" x="22" y="140" fontSize="8" fill="var(--cv)" fontFamily="ui-monospace,Menlo,monospace">Срочно! Подтвердите…</text>
  </>) },
  { key: 'chart', c: '#00E676', bg: '#00401F', draw: () => (<>
    {[30, 60, 90, 120].map(y => <path key={y} d={`M14 ${y}H140`} stroke="var(--cv)" strokeWidth=".4" opacity=".3" />)}
    <path className="sa-draw" style={{ strokeDasharray: 240 }} d="M14 124L40 104 60 112 84 76 104 84 136 34" stroke="var(--cv)" strokeWidth="2.4" fill="none" strokeLinejoin="round" />
    <circle className="sa-halo" cx="136" cy="34" r="9" fill="var(--cv)" opacity=".5" /><circle cx="136" cy="34" r="3.5" fill="#fff" />
  </>) },
  { key: 'bash', c: '#FF8A1F', bg: '#5A2400', draw: () => (<>
    <rect x="10" y="22" width="132" height="118" rx="9" fill="#0B0D12" opacity=".85" stroke="var(--cv)" strokeWidth=".8" />
    <path d="M10 40H142" stroke="var(--cv)" strokeWidth=".6" opacity=".5" />
    {['#FF5F57', '#FEBC2E', '#28C840'].map((f, i) => <circle key={i} cx={22 + i * 9} cy="31" r="2.6" fill={f} />)}
    {[['$ uname -a', .9], ['Linux kali 6.8 x86_64', .55], ['$ sudo su', .9], ['root@kali:~#', 1], ['$ ls /etc', .9], ['passwd  hosts  ssh', .55]].map(([t, o], i) => (
      <text key={i} className="sa-type" style={d(i, .45)} x="18" y={56 + i * 14} fontFamily="ui-monospace,Menlo,monospace" fontSize="8.5" fill={i === 3 ? '#fff' : 'var(--cv)'} opacity={o as number}>{t as string}</text>))}
    <rect className="sa-blink" x="18" y="134" width="6" height="2.2" fill="#fff" />
  </>) },
  { key: 'windows', c: '#1A9FFF', bg: '#06305E', draw: () => (<>
    {[[34, 18, 0], [16, 52, 1], [52, 82, 2]].map(([x, y, i]) => (
      <g key={i} className="sa-float" style={d(i, .6)}>
        <rect x={x} y={y} width="88" height="58" rx="5" fill="#0B1424" stroke="var(--cv)" strokeWidth=".8" opacity=".95" />
        <rect x={x} y={y} width="88" height="11" rx="5" fill="var(--cv)" opacity=".35" />
        <path d={`M${x + 64} ${y + 5.5}h4M${x + 72} ${y + 3.5}h4v4h-4zM${x + 80} ${y + 3.5}l4 4m0-4l-4 4`} stroke="#fff" strokeWidth=".8" fill="none" />
        {i === 2
          ? <text x={x + 6} y={y + 26} fontFamily="ui-monospace,Menlo,monospace" fontSize="7.5" fill="var(--cv)">PS C:\&gt;<tspan className="sa-blink" fill="#fff"> _</tspan></text>
          : [0, 1, 2].map(k => <rect key={k} className="sa-type" style={d(k + i * 3, .3)} x={x + 6} y={y + 18 + k * 9} width={[60, 44, 52][k]} height="4" rx="2" fill="var(--cv)" opacity=".55" />)}
      </g>))}
  </>) },
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
  { key: 'summit', c: '#FF8A3D', bg: '#4A1C05', draw: () => (<>
    <g className="sa-rot" style={{ transformOrigin: '36px 36px' }}>{Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5; return <path key={i} d={`M${(36 + Math.cos(a) * 20).toFixed(1)} ${(36 + Math.sin(a) * 20).toFixed(1)}L${(36 + Math.cos(a) * 27).toFixed(1)} ${(36 + Math.sin(a) * 27).toFixed(1)}`} stroke="var(--cv)" strokeWidth="2" strokeLinecap="round" opacity=".7" /> })}</g>
    <circle className="sa-pulse" cx="36" cy="36" r="13" fill="var(--cv)" opacity=".85" />
    <path d="M-4 150L48 66 74 104 102 58 156 150z" fill="#1E0A02" stroke="var(--cv)" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M48 66l12 20-12-6-12 6zM102 58l14 24-14-7-14 7z" fill="#fff" opacity=".85" />
    <path className="sa-dash" d="M18 150C40 128 60 134 72 116S96 86 102 58" stroke="#fff" strokeWidth="1.4" strokeDasharray="4 5" fill="none" opacity=".8" />
    <path d="M102 58V22" stroke="#fff" strokeWidth="1.8" />
    <path className="sa-wave" d="M103 23l22 7-22 8z" fill="#FF3D2E" />
  </>) },
]

/* Тема раздела → любимые рисунки (по порядку предпочтения). */
const THEMES: [string[], string[]][] = [
  // «Знания Маркаряна» — у каждого подраздела свой смысловой рисунок
  [['знания маркаряна'], ['summit']],
  [['эфиры базы', 'эфиры 2022', 'эфиры 2023', 'эфиры 2024', 'эфиры 2025'], ['eq', 'waves', 'packets', 'bubbles']],
  [['подкасты, гайды', 'интервью и большие', 'аудиоподкасты'], ['film', 'eq', 'bubbles']],
  [['тело и здоровье', 'гормоны и тестостерон'], ['helix', 'atom']],
  [['биохакинг, добавки'], ['atom', 'helix']],
  [['питание и жкт'], ['cube', 'eq']],
  [['сон, режим'], ['stars']],
  [['биомеханика, осанка'], ['target', 'gears']],
  [['внешность и гигиена'], ['camera']],
  [['сила, спорт'], ['shield', 'target']],
  [['экология и вредное'], ['virus']],
  [['психика и мышление', 'мысли арсена'], ['neural', 'atom']],
  [['тревога и сдвг'], ['waves', 'neural']],
  [['воля, мотивация'], ['target', 'stars']],
  [['принцип агрессии'], ['redteam', 'target']],
  [['интеллект, речь'], ['bubbles', 'book']],
  [['мужчина и женщина', 'психология женщин'], ['bubbles', 'helix']],
  [['отношения и секс'], ['chain']],
  [['семья, дети'], ['shield']],
  [['картина мира', 'общество и цивилизация'], ['globe']],
  [['разоблачения и конспир'], ['eye', 'radar']],
  [['дебаты и прогнозы'], ['radar', 'bubbles']],
  [['деньги и реализация', 'деньги, бизнес и статус'], ['chart', 'coin']],
  [['grind university'], ['book', 'chart']],
  [['письма из лагеря'], ['lock', 'key']],
  [['письма и личное', 'письма арсена'], ['book', 'stars']],
  [['молодой арсен'], ['plane', 'summit']],
  [['книги и рекомендации'], ['book']],
  [['офицеры и сообщество', 'офицеры и задачи'], ['shield', 'target']],
  [['отзывы и результаты'], ['stars']],
  [['с чего начать', 'новичку и правила'], ['checklist', 'bulb']],
  [['тематические подборки'], ['bulb', 'stars']],
  [['курсы и тренинги', 'release', 'tr 20', 'курс: гормоны', 'мини-курс'], ['book', 'summit', 'stars']],
  [[' крипт', 'криптовал', 'bitcoin', 'биткоин', 'блокчейн', 'кошел', 'defi', 'nft'], ['coin', 'chain']],
  [['вопрос', 'faq', 'ответы'], ['question', 'bubbles']],
  [['монтаж', 'видеоген', 'видео', 'meta ai', 'контент'], ['film', 'eq']],
  [['сервер', 'vps', 'хостинг'], ['server', 'cloud']],
  [['лайфхак', 'фишк', 'совет'], ['bulb', 'stars']],
  [['api', 'подключен'], ['plug', 'circuit']],
  [['локальн', 'ollama', 'lm studio'], ['chip', 'neural']],
  [['гео', 'geo', 'карты google', 'местополож'], ['globe', 'radar']],
  [['dork', 'дорк'], ['eye', 'radar']],
  [['чат-бот', 'llm', 'genai', 'chatgpt', 'ии агент', 'агент', 'hermes', 'antigravity'], ['robot', 'chip', 'neural']],
  [['bug bounty', 'bounty'], ['bug', 'spider']], 
  [['тестирование по', 'jira', 'postman', 'через тестирование', 'tdd'], ['checklist', 'bug']],
  [['android', 'андроид', 'flutter', 'мобил', 'телефон', ' ios', 'iphone'], ['phone']],
  [['wireshark', 'пакет', 'перехват', 'трафик', 'сниф'], ['packets', 'waves']],
  [['soc ', 'siem', 'sentinel', 'alert', 'инцидент'], ['soc', 'monitor', 'eye', 'packets', 'topology']],
  [['threat', 'угроз'], ['eye', 'radar']],
  [['обход игр', 'читы'], ['gamepad', 'ghost']],
  [['evasion', 'антидетект'], ['ghost', 'onion']],
  [['tscm', 'слежк', 'жучк', 'прослуш', 'физическ'], ['camera', 'key']],
  [['javascript', ' js', 'прототип', 'языки программ', 'dart'], ['braces', 'matrix']],
  [['python', 'питон', '🐍', 'pyqt'], ['repl', 'matrix']],
  [['антифрод', 'фрод', 'fraud'], ['fingerprint', 'card']],
  [['красн', 'red team', 'атак', 'attack'], ['redteam', 'target', 'virus', 'hex']],
  [['вымогат', 'ransom', 'шифрован'], ['ransom', 'lock']],
  [['malware', 'вирус', 'троян', 'вредонос'], ['virus', 'hex']],
  [['промпт', 'prompt'], ['bubbles', 'robot']],
  [['сетев', 'network', 'vlan', 'ospf', 'bgp', 'dhcp', 'маршрутиз', 'коммутир', 'etherchannel', 'nmap', 'сканирование сети'], ['topology', 'radar']],
  [['vpn', 'acl'], ['tunnel', 'shield']],
  [['облач', 'cloud', 'aws', 'azure', 'cloner'], ['cloud', 'cube']],
  [['sql', 'база данн', 'database'], ['db']],
  [['wi-fi', 'wifi', 'беспровод'], ['wifi', 'waves']],
  [['восстанов', 'forensic', 'форенз'], ['disk']],
  [['социальн', 'фишинг', 'phish', 'скам', 'доверия', 'психи'], ['phish', 'bubbles']],
  [['заработ', 'бизнес', 'маркет', 'трейд', 'инвест', 'завод'], ['chart']],
  [['веб', 'web', 'сайт', 'парсинг'], ['browser', 'spider', 'crack', 'hexdump', 'circuit']],
  [['парол', 'pdf', 'keepass', 'секрет', 'unlock'], ['key', 'lock']],
  [['linux', 'линукс', 'kali', '🐧'], ['bash', 'terminal']],
  [['windows', 'виндовс'], ['windows', 'monitor']],
  [['операционн'], ['monitor', 'gears']],
  [['osint', 'осинт', 'разведк', 'detective', 'детектив', 'поиск'], ['radar', 'eye']],
  [['взлом', 'хак', 'эксплуат', 'пентест', 'проникнов', 'уязвим'], ['hoodie', 'hex', 'target', 'crack', 'hexdump', 'key', 'virus', 'redteam']],
  [['тестирован'], ['checklist']],
  [['без цензуры', 'deepseek', 'claude', 'ии', 'ai', 'gpt', 'нейро'], ['neural', 'atom', 'chip']],
  [['аноним', 'tor', 'приват', 'россии'], ['onion', 'tunnel']],
  [['безопас', 'защит', 'соц сет'], ['shield', 'lock']],
  [['телеграм', 'telegram', 'бот'], ['plane', 'bubbles', 'robot']],
  [['автоматиз', 'скрипт'], ['terminal', 'gears', 'repl']],
  [['инструм', 'tool', 'программы', 'софт', 'сервис'], ['wrench', 'gears', 'cube']],
  [['карт', 'оплат', 'банк'], ['card', 'chain']],
  [['игр', 'steam', 'game'], ['gamepad']],
  [['код', 'программ', 'разработ', 'приложен'], ['braces', 'circuit']],
  [['сайты'], ['browser']],
  [['курс', 'урок', 'обучен', 'знани', 'теори', 'гайд', 'публикац', 'введение', 'модуль', 'тема', 'тест', 'материал'], ['book', 'stars']],
]

function prefsFor(title: string): string[] {
  const t = ` ${title.toLowerCase().replace(/_/g, ' ')} `, out: string[] = []
  for (const [kw, arts] of THEMES) if (kw.some(k => t.includes(k))) for (const a of arts) if (!out.includes(a)) out.push(a)
  return out
}
function rankFor(title: string): number {
  const t = ` ${title.toLowerCase().replace(/_/g, ' ')} `
  const i = THEMES.findIndex(([kw]) => kw.some(k => t.includes(k)))
  return i < 0 ? 999 : i
}

const prefs0 = (t: string) => prefsFor(t)

/* Нейтральные рисунки — для разделов без явной темы (уроки, модули). */
const NEUTRAL = ['book', 'stars', 'cube', 'atom', 'helix', 'tunnel', 'gears', 'circuit', 'bulb', 'question']

/* Запомненные назначения: одинаковый рисунок раздела на главной, в каталоге и в шапке раздела. */
const assigned = new Map<number, number>()

/** Раздаёт рисунки списку разделов без повторов (пока рисунков хватает — все разные, дальше меняется цвет). */
export function assignArts(list: { id: number; title: string }[]): Map<number, number> {
  const res = new Map<number, number>()
  const used = new Set<number>()
  const sorted = [...list].sort((a, b) => rankFor(a.title) - rankFor(b.title) || a.id - b.id)
  for (const s of sorted) {
    const prev = assigned.get(s.id)
    if (prev !== undefined && !used.has(prev) && (prefs0(s.title).length === 0 || prefs0(s.title).includes(ARTS[prev % ARTS.length].key))) { res.set(s.id, prev); used.add(prev); continue }
    let pick = -1
    const prefs = prefsFor(s.title)
    for (const key of prefs) { const i = ARTS.findIndex(a => a.key === key); if (i >= 0 && !used.has(i)) { pick = i; break } }
    if (pick < 0) for (const key of NEUTRAL) { const i = ARTS.findIndex(a => a.key === key); if (i >= 0 && !used.has(i)) { pick = i; break } }
    if (pick < 0) for (const key of prefs) { for (let v = 1; v < 4 && pick < 0; v++) { const i = ARTS.findIndex(a => a.key === key) + v * ARTS.length; if (i >= v * ARTS.length && !used.has(i)) pick = i } if (pick >= 0) break }
    if (pick < 0) { let h = 0; for (const ch of String(s.id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; for (let k = 0; k < ARTS.length * 3; k++) { const i = (h + k) % (ARTS.length * 3); if (!used.has(i)) { pick = i; break } } }
    if (pick < 0) pick = s.id
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

const HUE = [0, 140, 230, 300]
const shift = (hex: string, v: number) => { if (!v) return hex; const n = parseInt(hex.slice(1), 16); let r = (n >> 16) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dd = mx - mn; let h = 0, sat = 0; if (dd) { sat = l > .5 ? dd / (2 - mx - mn) : dd / (mx + mn); h = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; h *= 60 } h = (h + HUE[v % 4]) % 360; return `hsl(${h.toFixed(0)} ${(sat * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%)` }
const at = (i: number) => { const a = ARTS[i % ARTS.length], v = Math.floor(i / ARTS.length) % 4; return { c: shift(a.c, v), bg: shift(a.bg, v) } }
export const artColors = (i: number) => at(i)
export const artStyle = (i: number) => ({ ['--cv' as string]: at(i).c, ['--pbg' as string]: at(i).bg }) as React.CSSProperties

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
  return <svg ref={ref} className={className} viewBox="0 0 150 160" preserveAspectRatio="xMidYMid slice" style={artStyle(index)} aria-hidden>{art.draw()}</svg>
}
