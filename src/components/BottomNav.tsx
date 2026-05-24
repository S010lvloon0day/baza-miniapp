import { House, SquaresFour, BookmarkSimple, ClockCounterClockwise, User, MagnifyingGlass } from '@phosphor-icons/react'

export type Tab = 'home' | 'cats' | 'search' | 'favs' | 'recent' | 'prof'

const TABS: { id: Tab; icon: typeof House; label: string }[] = [
  { id: 'home',   icon: House,                 label: 'Главная'   },
  { id: 'cats',   icon: SquaresFour,           label: 'Разделы'   },
  { id: 'search', icon: MagnifyingGlass,       label: 'Поиск'     },
  { id: 'favs',   icon: BookmarkSimple,        label: 'Избранное' },
  { id: 'recent', icon: ClockCounterClockwise, label: 'История'   },
  { id: 'prof',   icon: User,                  label: 'Профиль'   },
]

interface Props { active: Tab; onChange: (t: Tab) => void }

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[60px] bg-s1/95 backdrop-blur border-t border-bd flex z-50">
      {TABS.map(({ id, icon: Icon, label }) => {
        const on = active === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[9px] font-mono tracking-wide transition-colors duration-150 relative
              ${on ? 'text-green' : 'text-gray2'}`}
          >
            {on && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-white"
                style={{ boxShadow: '0 0 8px rgba(255,255,255,.8), 0 0 16px rgba(255,255,255,.3)' }}
              />
            )}
            <Icon size={20} weight={on ? 'fill' : 'regular'} />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
