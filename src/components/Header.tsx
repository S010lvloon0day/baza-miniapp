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
    <header className="sticky top-0 z-40 bg-bg/96 backdrop-blur-md border-b border-bd/60 px-4 flex items-center gap-3 h-[56px] shrink-0 relative">
      <div className="absolute bottom-0 inset-x-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.12) 30%, rgba(255,255,255,.08) 50%, rgba(255,255,255,.12) 70%, transparent)' }} />
      {showBack && (
        <button onClick={onBack} className="w-8 h-8 -ml-1 flex items-center justify-center rounded-lg bg-s2 border border-bd2 active:bg-bd2 transition-colors shrink-0">
          <ArrowLeft size={17} weight="bold" />
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
