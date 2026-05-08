import brandLogo from '../assets/brand-logo.jpg'

export default function Logo({ size = 60, glow = false }: { size?: number; glow?: boolean }) {
  const inner = Math.round(size * 0.78)

  return (
    <div
      className="relative flex items-center justify-center rounded-full bg-white overflow-hidden border border-white/20"
      style={{
        width: size,
        height: size,
        boxShadow: glow
          ? '0 0 0 1px rgba(199,166,255,.28), 0 0 26px rgba(157,92,255,.62), 0 0 70px rgba(157,92,255,.24)'
          : '0 0 0 1px rgba(199,166,255,.18)',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(157,92,255,.16),transparent_54%)]" />
      <img
        src={brandLogo}
        alt="S010lvloon"
        className="relative object-contain"
        style={{ width: inner, height: inner }}
      />
    </div>
  )
}
