export default function BazaMark({ size = 24, color = '#17E584' }: { size?: number; color?: string; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 240 230" fill={color} aria-hidden>
      <polygon points="120,2 238,166 206,166 156,94 120,141 84,94 34,166 2,166" />
      <polygon points="86,128 120,174 154,128 182,166 120,228 58,166" />
    </svg>
  )
}
