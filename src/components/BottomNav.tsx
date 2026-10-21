
export type Tab = 'home' | 'cats' | 'search' | 'favs' | 'recent' | 'prof' | 'ctor' | 'chat'

import Icon from './Icon'
import type { IconName } from './Icon'

const ICONS: Record<Exclude<Tab, 'search'>, IconName> = {
  home: 'home', chat: 'chat', cats: 'sections', favs: 'library', recent: 'history', prof: 'profile', ctor: 'tool',
}

const TABS: { id: Exclude<Tab, 'search'>; label: string }[] = [
  { id: 'home',   label: 'Главная'   },
  { id: 'chat',   label: 'Чат'       },
  { id: 'cats',   label: 'Разделы'   },
  { id: 'favs',   label: 'Библиотека' },
  { id: 'prof',   label: 'Профиль'    },
]

const CTOR_TAB = { id: 'ctor' as const, label: 'Конструктор' }

interface Props {
  active: Tab
  onChange: (t: Tab) => void
  showConstructor?: boolean
  /** Счётчики на вкладках (например, новые обсуждения у админа). */
  badges?: Partial<Record<Tab, number>>
}

export default function BottomNav({ active, onChange, showConstructor, badges }: Props) {
  const tabs = showConstructor ? [...TABS, CTOR_TAB] : TABS
  const dense = tabs.length > 5
  return (
    <nav className="glass fixed z-50 flex p-[5px] rounded-[32px]"
      style={{ left: 10, right: 10, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}>
      {tabs.map(({ id, label }) => {
        const on = active === id
        const badge = badges?.[id] ?? 0
        return (
          <button key={id} onClick={() => onChange(id)} aria-current={on ? 'page' : undefined}
            className={`relative flex-1 flex flex-col items-center gap-[3px] rounded-[26px] transition-colors ${dense ? 'py-[7px]' : 'pt-[8px] pb-[7px]'} ${on ? 'bg-white/10 text-green' : 'text-gray active:bg-white/5'}`}
            style={on ? { boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)' } : undefined}>
            <Icon name={ICONS[id]} size={dense ? 22 : 24} accent={on ? 'brand' : 'current'} />
            <span className={`leading-none font-medium ${dense ? 'text-[9.5px]' : 'text-[10.5px]'}`}>{label}</span>
            {badge > 0 && (
              <span className="absolute top-1 left-1/2 ml-[7px] min-w-[17px] h-[17px] px-1 rounded-full bg-green text-ink text-[10px] font-bold flex items-center justify-center tabular-nums">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
