import Icon from './Icon'
import BazaMark from './BazaMark'

interface Props {
  title?: string
  showBack?: boolean
  onBack?: () => void
  onSearch?: () => void
  onBell?: () => void
  bookmarked?: boolean
  onBookmark?: () => void
  fullscreen?: boolean
  onToggleFullscreen?: () => void
}

function Btn({ onClick, label, children, tone = 'plain' }: { onClick?: () => void; label: string; children: React.ReactNode; tone?: 'plain' | 'on' }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors active:bg-white/10 ${tone === 'on' ? 'text-gold' : 'text-[#CFDAD4]'}`}>
      {children}
    </button>
  )
}

export default function Header({ title, showBack, onBack, onSearch, onBell, bookmarked, onBookmark, fullscreen, onToggleFullscreen }: Props) {
  const fs = onToggleFullscreen && (
    <Btn onClick={onToggleFullscreen} label={fullscreen ? 'Оконный режим' : 'Полный экран'}>
      <Icon name={fullscreen ? 'fsIn' : 'fsOut'} size={19} />
    </Btn>
  )
  if (showBack) {
    return (
      <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur-xl border-b border-white/[.06] px-2 flex items-center gap-1 h-[54px] shrink-0">
        <Btn onClick={onBack} label="Назад"><Icon name="back" size={22} className="text-fg" /></Btn>
        <span className="flex-1 min-w-0 font-display font-semibold text-[15px] truncate">{title}</span>
        {fs}
        {onBookmark !== undefined && (
          <Btn onClick={onBookmark} label={bookmarked ? 'Убрать из библиотеки' : 'В библиотеку'} tone={bookmarked ? 'on' : 'plain'}>
            <Icon name={bookmarked ? 'bookmarkFill' : 'bookmark'} size={21} accent="current" />
          </Btn>
        )}
      </header>
    )
  }
  return (
    <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur-xl px-4 flex items-center gap-2.5 h-[56px] shrink-0">
      <BazaMark size={20} />
      <span className="flex-1 min-w-0 truncate font-display font-semibold text-[17px]">{title || 'База'}</span>
      {fs}
      {onSearch && <Btn onClick={onSearch} label="Поиск"><Icon name="search" size={21} /></Btn>}
      {onBell && <Btn onClick={onBell} label="Уведомления"><Icon name="bell" size={21} /></Btn>}
    </header>
  )
}
