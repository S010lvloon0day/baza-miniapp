import type { ReactNode } from 'react'

export type Tab = 'home' | 'cats' | 'search' | 'favs' | 'recent' | 'prof'

const ICONS: Record<Exclude<Tab, 'search'>, ReactNode> = {
  home: <path d="M12 3.2a1 1 0 0 1 .64.23l7.5 6.15A1 1 0 0 1 20.5 10v9a1 1 0 0 1-1 1h-4.25a.75.75 0 0 1-.75-.75v-4.5a2.5 2.5 0 0 0-5 0v4.5a.75.75 0 0 1-.75.75H4.5a1 1 0 0 1-1-1v-9a1 1 0 0 1 .36-.77l7.5-6.15A1 1 0 0 1 12 3.2z" />,
  cats: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="2.5" />
      <rect x="13" y="3" width="8" height="8" rx="2.5" />
      <rect x="3" y="13" width="8" height="8" rx="2.5" />
      <rect x="13" y="13" width="8" height="8" rx="2.5" />
    </>
  ),
  favs: <path d="M6.5 3.5A1.5 1.5 0 0 1 8 2h8a1.5 1.5 0 0 1 1.5 1.5v17.1a.75.75 0 0 1-1.18.62L12 17.4l-4.32 3.82a.75.75 0 0 1-1.18-.62V3.5z" />,
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
  { id: 'cats',   label: 'Разделы'   },
  { id: 'favs',   label: 'Избранное' },
  { id: 'recent', label: 'История'   },
  { id: 'prof',   label: 'Профиль'   },
]

interface Props { active: Tab; onChange: (t: Tab) => void }

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex z-50"
      style={{
        gap: 2,
        background: 'rgba(10,10,13,.92)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255,255,255,.08)',
        padding: '8px 6px calc(env(safe-area-inset-bottom, 10px) + 6px)',
      }}
    >
      {TABS.map(({ id, label }) => {
        const on = active === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex-1 flex flex-col items-center gap-1 rounded-[13px] transition-colors duration-150 active:bg-white/[.06]"
            style={{
              padding: '15px 2px',
              background: on ? 'linear-gradient(180deg,rgba(34,197,94,.22),rgba(34,197,94,.08))' : 'transparent',
              border: on ? '1px solid rgba(74,232,133,.55)' : '1px solid transparent',
              boxShadow: on ? '0 0 14px rgba(34,197,94,.3)' : 'none',
              color: on ? '#4AE885' : '#75757f',
            }}
          >
            <svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor">
              {ICONS[id]}
            </svg>
            <span className="text-[9.5px] font-bold tracking-[.1px]">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
