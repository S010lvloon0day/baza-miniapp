import { ArrowLeft, BookmarkSimple, Bell } from '@phosphor-icons/react'
import Logo from './Logo'

interface Props {
  title?: string
  showBack?: boolean
  onBack?: () => void
  showLogo?: boolean
  showBell?: boolean
  bookmarked?: boolean
  onBookmark?: () => void
}

export default function Header({ title, showBack, onBack, showLogo, showBell, bookmarked, onBookmark }: Props) {
  return (
    <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur border-b border-bd px-4 flex items-center gap-3 h-[56px] shrink-0">
      {showBack && (
        <button onClick={onBack} className="text-white p-1 -ml-1 active:opacity-60">
          <ArrowLeft size={22} weight="bold" />
        </button>
      )}
      {showLogo && <Logo size={28} />}
      {title && (
        <span className="flex-1 text-[15px] font-semibold tracking-wide truncate">{title}</span>
      )}
      {showBell && (
        <button className="text-gray2 p-1 active:opacity-60">
          <Bell size={20} weight="fill" />
        </button>
      )}
      {onBookmark !== undefined && (
        <button onClick={onBookmark} className={`p-1 active:opacity-60 transition-colors ${bookmarked ? 'text-green' : 'text-gray2'}`}>
          <BookmarkSimple size={22} weight={bookmarked ? 'fill' : 'regular'} />
        </button>
      )}
    </header>
  )
}
