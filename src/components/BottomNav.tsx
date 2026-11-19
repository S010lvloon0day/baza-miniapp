
export type Tab = 'home' | 'cats' | 'search' | 'favs' | 'recent' | 'prof' | 'ctor' | 'chat'

import { useEffect } from 'react'
import Icon from './Icon'
import type { IconName } from './Icon'

const ICONS: Record<Exclude<Tab, 'search'>, IconName> = {
  home: 'home', chat: 'chat', cats: 'sections', favs: 'library', recent: 'history', prof: 'profile', ctor: 'shield',
}

const TABS: { id: Exclude<Tab, 'search'>; label: string }[] = [
  { id: 'home',   label: 'Главная'   },
  { id: 'chat',   label: 'Чат'       },
  { id: 'cats',   label: 'Разделы'   },
  { id: 'favs',   label: 'Библиотека' },
  { id: 'prof',   label: 'Профиль'    },
]

const CTOR_TAB = { id: 'ctor' as const, label: 'Админка' }

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
  // Экранная клавиатура: на телефоне (сенсорный экран) меню прячем всё время, пока фокус в поле ввода —
  // в iOS высота экрана при клавиатуре часто не меняется, поэтому по ней одной судить нельзя.
  // Если клавиатуру закрыли «назад» (Android), а фокус остался — снимаем фокус, и меню возвращается.
  useEffect(() => {
    const vv = window.visualViewport
    const touch = window.matchMedia?.('(pointer: coarse)').matches ?? ('ontouchstart' in window)
    let maxH = vv?.height ?? window.innerHeight, shrunk = false
    const isField = (el: Element | null) => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable) && !(el as HTMLInputElement).readOnly
      && !['checkbox', 'radio', 'range', 'button', 'submit', 'file', 'color'].includes((el as HTMLInputElement).type)
    const check = () => {
      const h = vv?.height ?? window.innerHeight
      const focused = isField(document.activeElement)
      if (!focused) { maxH = Math.max(maxH, h); shrunk = false }
      else if (h < maxH - 120) shrunk = true
      else if (shrunk && h >= maxH - 40) { shrunk = false; (document.activeElement as HTMLElement)?.blur?.() }
      const open = isField(document.activeElement) && (touch || h < maxH - 120)
      document.body.classList.toggle('kb-open', open)
    }
    const later = () => window.setTimeout(check, 30)
    document.addEventListener('focusin', check); document.addEventListener('focusout', later)
    vv?.addEventListener('resize', check); window.addEventListener('resize', check)
    document.body.classList.add('has-nav')
    return () => {
      document.removeEventListener('focusin', check); document.removeEventListener('focusout', later)
      vv?.removeEventListener('resize', check); window.removeEventListener('resize', check)
      document.body.classList.remove('has-nav', 'kb-open')
    }
  }, [])
  return (
    <nav className="app-nav nav-v2 fixed z-[45] flex"
      style={{ left: '50%', transform: 'translateX(-50%)', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}>
      {tabs.map(({ id, label }) => {
        const on = active === id
        const badge = badges?.[id] ?? 0
        return (
          <button key={id} onClick={() => onChange(id)} aria-current={on ? 'page' : undefined} aria-label={label} title={label}
            className={`nv-b ${on ? 'on' : ''} ${dense ? 'dense' : ''}`}>
            <Icon name={ICONS[id]} size={21} accent={on ? '#7A4DFF' : 'current'} />
            {on && <span className="nv-l">{label}</span>}
            {badge > 0 && <span className="nv-badge">{badge > 99 ? '99+' : badge}</span>}
          </button>
        )
      })}
    </nav>
  )
}
