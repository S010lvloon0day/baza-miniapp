import { ArrowLeft, BookmarkSimple, MagnifyingGlass, Bell } from '@phosphor-icons/react'
import BazaMark from './BazaMark'

interface Props {
  title?: string
  showBack?: boolean
  onBack?: () => void
  onSearch?: () => void
  onBell?: () => void
  bookmarked?: boolean
  onBookmark?: () => void
}

export default function Header({ title, showBack, onBack, onSearch, onBell, bookmarked, onBookmark }: Props) {
  if (showBack) {
    return (
      <header className="sticky top-0 z-40 bg-bg/96 backdrop-blur-md border-b border-bd/60 px-4 flex items-center gap-3 h-[56px] shrink-0 relative">
        <div className="absolute bottom-0 inset-x-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.12) 30%, rgba(255,255,255,.08) 50%, rgba(255,255,255,.12) 70%, transparent)' }} />
        <button onClick={onBack} className="w-8 h-8 -ml-1 flex items-center justify-center rounded-lg bg-s2 border border-bd2 active:bg-bd2 transition-colors shrink-0">
          <ArrowLeft size={17} weight="bold" />
        </button>
        {title && (
          <span className="flex-1 text-[15px] font-semibold tracking-wide truncate">{title}</span>
        )}
        {onBookmark !== undefined && (
          <button onClick={onBookmark} className={`p-1 active:opacity-60 transition-colors ${bookmarked ? 'text-green' : 'text-gray2'}`}>
            <BookmarkSimple size={22} weight={bookmarked ? 'fill' : 'regular'} />
          </button>
        )}
      </header>
    )
  }

  // Brand header — same on every tab root screen (Главная/Разделы/Поиск/Избранное/История/Профиль), per the mockup.
  return (
    <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur border-b border-white/[.08] px-4 flex items-center gap-2.5 h-[56px] shrink-0">
      <div
        className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ background: 'linear-gradient(155deg,#16211a,#0d0f0e)', border: '1px solid rgba(34,197,94,.35)' }}
      >
        <BazaMark size={16} />
      </div>
      <span className="flex-1 text-[15px] font-extrabold tracking-wide truncate">BAZA<span className="text-green">.</span>{title}</span>
      {onSearch && (
        <button
          className="w-8 h-8 rounded-full bg-white/[.06] flex items-center justify-center active:bg-white/[.14] transition-colors shrink-0"
          onClick={onSearch}
          aria-label="Поиск"
        >
          <MagnifyingGlass size={16} weight="bold" />
        </button>
      )}
      {onBell && (
        <button
          className="w-8 h-8 rounded-full bg-white/[.06] flex items-center justify-center active:bg-white/[.14] transition-colors shrink-0"
          onClick={onBell}
          aria-label="Уведомления"
        >
          <Bell size={16} weight="bold" />
        </button>
      )}
    </header>
  )
}
