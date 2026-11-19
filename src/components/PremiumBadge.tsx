import BazaMark from './BazaMark'

/** Значок Premium: тёмная «таблетка» с тонкой шампань-рамкой, знаком S010 и мягким бликом. */
export default function PremiumBadge({ small, label = 'Premium', className = '' }: { small?: boolean; label?: string; className?: string }) {
  return (
    <span className={`pbadge2 ${small ? 'sm' : ''} ${className}`}>
      <BazaMark size={small ? 10 : 13} color="url(#pbGold)" />
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <defs><linearGradient id="pbGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF1C9" /><stop offset="1" stopColor="#D9A94E" /></linearGradient></defs>
      </svg>
      <span className="pt2">{label}</span>
    </span>
  )
}
