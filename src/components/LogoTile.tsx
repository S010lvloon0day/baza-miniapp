import BazaMark from './BazaMark'

/** Плитка с логотипом S010 — шапка главной, чата, аватар админа. */
export default function LogoTile({ size = 40 }: { size?: number }) {
  return (
    <span className="logo-tile" style={{ width: size, height: size, borderRadius: Math.round(size * 0.34) }}>
      <BazaMark size={Math.round(size * 0.6)} animate />
    </span>
  )
}
