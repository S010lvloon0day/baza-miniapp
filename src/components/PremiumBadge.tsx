import Icon from './Icon'

/** Фирменный значок Premium: полированное золото + бегущий блик. */
export default function PremiumBadge({ small, label = 'Premium', className = '' }: { small?: boolean; label?: string; className?: string }) {
  return (
    <span className={`pbadge gold-metal sheen ${small ? 'sm' : ''} ${className}`}>
      <span className="gem"><Icon name="crown" size={small ? 9 : 11} accent="#FFD873" /></span>
      <span className="pt">{label}</span>
    </span>
  )
}
