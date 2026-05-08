export default function Shield({ size = 24, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 100 100" fill="none"
      style={glow ? { filter: 'drop-shadow(0 0 18px rgba(0,255,65,.7)) drop-shadow(0 0 40px rgba(0,255,65,.3))' } : undefined}
    >
      <path d="M50 8L14 22V50C14 68 30 84 50 92C70 84 86 68 86 50V22L50 8Z"
        fill="#0A1A0A" stroke="#00FF41" strokeWidth="1.5" />
      <circle cx="50" cy="36" r="4.5" fill="#00FF41" />
      <circle cx="33" cy="53" r="3" fill="#00FF41" opacity=".75" />
      <circle cx="67" cy="53" r="3" fill="#00FF41" opacity=".75" />
      <circle cx="43" cy="66" r="2.5" fill="#00FF41" opacity=".5" />
      <circle cx="57" cy="66" r="2.5" fill="#00FF41" opacity=".5" />
      <line x1="50" y1="36" x2="33" y2="53" stroke="#00FF41" strokeWidth="1" opacity=".55" />
      <line x1="50" y1="36" x2="67" y2="53" stroke="#00FF41" strokeWidth="1" opacity=".55" />
      <line x1="33" y1="53" x2="43" y2="66" stroke="#00FF41" strokeWidth="1" opacity=".4" />
      <line x1="67" y1="53" x2="57" y2="66" stroke="#00FF41" strokeWidth="1" opacity=".4" />
      <line x1="43" y1="66" x2="57" y2="66" stroke="#00FF41" strokeWidth="1" opacity=".3" />
    </svg>
  )
}
