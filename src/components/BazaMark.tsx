import { useId } from 'react'

/** Знак S010. color — сплошной цвет (для водяных знаков), без него — фирменный фиолетовый градиент.
 *  animate — периодически «раскрывается» и вспыхивает. */
export default function BazaMark({ size = 24, color, animate = false }: { size?: number; color?: string; glow?: boolean; animate?: boolean }) {
  const id = useId().replace(/:/g, '')
  const fill = color ?? `url(#bm${id})`
  return (
    <svg width={size} height={size} viewBox="0 0 240 230" aria-hidden className={animate ? 'bm-anim' : undefined}>
      {!color && (
        <defs>
          <linearGradient id={`bm${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#66C0F4" /><stop offset="1" stopColor="#1A6FFF" />
          </linearGradient>
        </defs>
      )}
      <polygon className="bm-t" fill={fill} points="120,2 238,166 206,166 156,94 120,141 84,94 34,166 2,166" />
      <polygon className="bm-v" fill={fill} points="86,128 120,174 154,128 182,166 120,228 58,166" />
    </svg>
  )
}
