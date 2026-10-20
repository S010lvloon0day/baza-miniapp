import type { ReactNode } from 'react'

export type Tab = 'home' | 'cats' | 'search' | 'favs' | 'recent' | 'prof' | 'ctor' | 'chat'

const ICONS: Record<Exclude<Tab, 'search'>, ReactNode> = {
  chat: (
    <g fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.7L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z" />
      <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />
    </g>
  ),
  ctor: (
    <g fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L2 19l3 3 7.3-7.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6z" />
    </g>
  ),
  home: <path d="M12 3.2a1 1 0 0 1 .64.23l7.5 6.15A1 1 0 0 1 20.5 10v9a1 1 0 0 1-1 1h-4.25a.75.75 0 0 1-.75-.75v-4.5a2.5 2.5 0 0 0-5 0v4.5a.75.75 0 0 1-.75.75H4.5a1 1 0 0 1-1-1v-9a1 1 0 0 1 .36-.77l7.5-6.15A1 1 0 0 1 12 3.2z" />,
  cats: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="2.5" />
      <rect x="13" y="3" width="8" height="8" rx="2.5" />
      <rect x="3" y="13" width="8" height="8" rx="2.5" />
      <rect x="13" y="13" width="8" height="8" rx="2.5" />
    </>
  ),
  favs: (
    <g fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.2A1.2 1.2 0 0 1 5.2 4H9a2.3 2.3 0 0 1 2.3 1.6A2.3 2.3 0 0 1 13.6 4h3.2A1.2 1.2 0 0 1 18 5.2v12.3a1 1 0 0 1-1 1h-3.6a2 2 0 0 0-1.8 1.1 2 2 0 0 0-1.8-1.1H5a1 1 0 0 1-1-1V5.2z" />
      <path d="M11.3 5.8v13" />
      <path d="M19.4 7.1l1.5.4a1 1 0 0 1 .72 1.22l-2.6 9.9" />
    </g>
  ),
  recent: (
    <g fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.2" />
      <path d="M12 7.5v5l3.5 2" />
    </g>
  ),
  prof: (
    <>
      <circle cx="12" cy="7.8" r="4.3" />
      <path d="M4 20.2c0-4.3 3.6-6.9 8-6.9s8 2.6 8 6.9a1 1 0 0 1-1 .8H5a1 1 0 0 1-1-.8z" />
    </>
  ),
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
  return (
    <nav
      className="glass fixed left-0 right-0 flex z-50"
      style={{
        gap: 2,
        bottom: 'calc(env(safe-area-inset-bottom, 8px) + 10px)',
        marginLeft: 12,
        marginRight: 12,
        padding: '8px 8px',
        borderRadius: 26,
        background:
          'linear-gradient(180deg, rgba(255,255,255,.1), rgba(255,255,255,0) 38%), rgba(14,14,19,.42)',
      }}
    >
      {tabs.map(({ id, label }) => {
        const on = active === id
        const badge = badges?.[id] ?? 0
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="relative flex-1 flex flex-col items-center gap-1 rounded-[13px] transition-colors duration-150 active:bg-white/[.06]"
            style={{
              padding: tabs.length > 5 ? '11px 1px' : '12px 2px',
              background: on ? 'linear-gradient(180deg,rgba(34,197,94,.22),rgba(34,197,94,.08))' : 'transparent',
              border: on ? '1px solid rgba(74,232,133,.55)' : '1px solid transparent',
              boxShadow: on ? '0 0 14px rgba(34,197,94,.3)' : 'none',
              color: on ? '#4AE885' : '#75757f',
            }}
          >
            <svg width={tabs.length > 5 ? 21 : 23} height={tabs.length > 5 ? 21 : 23} viewBox="0 0 24 24" fill="currentColor">
              {ICONS[id]}
            </svg>
            <span
              className="font-bold tracking-[.1px] leading-none text-center"
              style={{ fontSize: tabs.length > 5 ? 8.5 : 9.5 }}
            >
              {label}
            </span>
            {badge > 0 && (
              <span className="absolute top-1 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-green text-black text-[9.5px] font-extrabold flex items-center justify-center"
                style={{ boxShadow: '0 0 8px rgba(34,197,94,.6)' }}>
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
