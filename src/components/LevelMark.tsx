import type { Level } from '../utils/title'

const C: Record<Level, [string, string]> = { easy: ['#17E584', 'Лёгкий'], mid: ['#F5C25A', 'Средний'], hard: ['#FF5A6E', 'Сложный'] }

/** Фирменный маркер уровня — ромб вместо цветных кружков-эмодзи. */
export default function LevelMark({ level, size = 10 }: { level?: Level | string; size?: number }) {
  if (!level || !(level in C)) return null
  const [color, label] = C[level as Level]
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-label={label} role="img" style={{ display: 'inline-block', flexShrink: 0, verticalAlign: '0.05em', marginRight: 6 }}>
      <path d="M5 0.5 9.5 5 5 9.5 0.5 5z" fill={color} />
    </svg>
  )
}
