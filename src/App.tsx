import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SplashPage from './pages/SplashPage'
import HomePage from './pages/HomePage'
import CatsPage from './pages/CatsPage'
import SearchPage from './pages/SearchPage'
import SectionPage from './pages/SectionPage'
import MaterialPage from './pages/MaterialPage'
import FavsPage from './pages/FavsPage'
import RecentPage from './pages/RecentPage'
import ProfilePage from './pages/ProfilePage'
import GiveawayPage from './pages/GiveawayPage'
import BottomNav from './components/BottomNav'
import type { Tab } from './components/BottomNav'
import Header from './components/Header'
import Logo from './components/Logo'
import NotifySheet from './components/NotifySheet'
import { api } from './api/client'
import type { Section } from './api/client'
import { isBookmarked, removeBookmarkRemote, saveBookmarkRemote, syncBookmarks } from './store/bookmarks'

const tg = (window as any).Telegram?.WebApp

type View =
  | { type: 'tab'; tab: Tab }
  | { type: 'section'; section: Section; page: number }
  | { type: 'material'; id: number; sectionId: number }
  | { type: 'giveaway' }

export default function App() {
  const [started, setStarted] = useState(() => !!localStorage.getItem('started'))
  const [tab, setTab] = useState<Tab>('home')
  const [stack, setStack] = useState<View[]>([])
  const [bmTick, setBmTick] = useState(0)
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [botUsername, setBotUsername] = useState('')
  const [upgradePending, setUpgradePending] = useState(false)
  // Квест виден только когда сервер разрешил (включён или текущий юзер — админ)
  const [giveawayVisible, setGiveawayVisible] = useState(false)

  useEffect(() => {
    tg?.expand?.()
    tg?.ready?.()
    api.config().then(c => {
      if (c.bot_username) setBotUsername(c.bot_username)
      setGiveawayVisible(!!c.giveaway_visible)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!started) return
    syncBookmarks().finally(() => setBmTick(t => t + 1))
  }, [started])

  // Show/hide Telegram back button
  useEffect(() => {
    if (!started) return
    if (stack.length > 0) {
      tg?.BackButton?.show?.()
      tg?.BackButton?.onClick?.(goBack)
    } else {
      tg?.BackButton?.hide?.()
    }
    return () => tg?.BackButton?.offClick?.(goBack)
  }, [stack, started])

  const startApp = () => {
    localStorage.setItem('started', '1')
    setStarted(true)
  }

  const goBack = useCallback(() => setStack(s => s.slice(0, -1)), [])

  const openGiveaway = () => setStack(s => [...s, { type: 'giveaway' }])
  const openSection = (section: Section) => setStack(s => [...s, { type: 'section', section, page: 0 }])
  const openMaterial = (id: number, sectionId: number, page: number = 0) =>
    setStack(s => {
      const updated = s.map(v =>
        v.type === 'section' && v.section.id === sectionId ? { ...v, page } : v
      )
      return [...updated, { type: 'material', id, sectionId }]
    })

  const switchTab = (t: Tab) => {
    setTab(t)
    setStack([])
  }

  if (!started) {
    return <SplashPage onStart={startApp} />
  }

  const top = stack[stack.length - 1]
  const isMat = top?.type === 'material'

  const renderContent = () => {
    if (!top) {
      if (tab === 'home')   return <HomePage onSection={openSection} onMaterial={openMaterial} onTabCats={() => switchTab('cats')} onGiveaway={openGiveaway} showGiveaway={giveawayVisible} botUsername={botUsername} />
      if (tab === 'cats')   return <CatsPage onSection={openSection} onGiveaway={giveawayVisible ? openGiveaway : undefined} />
      if (tab === 'search') return <SearchPage onMaterial={openMaterial} />
      if (tab === 'favs')   return <FavsPage key={bmTick} onMaterial={openMaterial} />
      if (tab === 'recent') return <RecentPage onMaterial={openMaterial} />
      if (tab === 'prof')   return <ProfilePage scrollToPlans={upgradePending} onScrolled={() => setUpgradePending(false)} />
    }
    if (top?.type === 'section') {
      return <SectionPage section={top.section} initialPage={top.page} onMaterial={openMaterial} onSubsection={openSection} onUpgrade={() => { setStack([]); setTab('prof'); setUpgradePending(true) }} />
    }
    if (top?.type === 'giveaway') {
      // Защита: если квест скрыт (не админ / выключен) — не открываем экран
      if (!giveawayVisible) return null
      return <GiveawayPage />
    }
    if (top?.type === 'material') {
      return (
        <MaterialPage
          materialId={top.id}
          sectionId={top.sectionId}
          botUsername={botUsername}
          onUpgrade={() => { setStack([]); setTab('prof'); setUpgradePending(true) }}
          onNavId={(id) => setStack(s => {
            const prev = s.slice(0, -1)
            return [...prev, { type: 'material', id, sectionId: top.sectionId }]
          })}
        />
      )
    }
    return null
  }

  const renderHeader = () => {
    if (!top) {
      if (tab === 'home') return (
        <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur border-b border-bd px-4 flex items-center gap-3 h-[56px] shrink-0">
          <Logo size={30} />
          <span className="flex-1 text-[15px] font-semibold tracking-wide">
            <span className="text-green">S010</span>lvloon
          </span>
          <button className="text-gray2 p-1 active:opacity-60" onClick={() => setNotifyOpen(true)}>🔔</button>
        </header>
      )
      const titles: Record<Tab, string> = { home: '', cats: 'Категории', search: 'Поиск', favs: 'Избранное', recent: 'История', prof: 'Профиль' }
      return <Header showLogo={tab === 'cats'} title={titles[tab]} />
    }
    if (top.type === 'giveaway') {
      return <Header showBack onBack={goBack} title="Секретный розыгрыш" />
    }
    if (top.type === 'section') {
      return <Header showBack onBack={goBack} title={top.section.title} />
    }
    if (top.type === 'material') {
      const bm = isBookmarked(top.id)
      return (
        <Header
          showBack onBack={goBack}
          bookmarked={bm}
          onBookmark={() => {
            if (isBookmarked(top.id)) removeBookmarkRemote(top.id)
            else saveBookmarkRemote(top.id)
            setBmTick(t => t + 1)
          }}
        />
      )
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg">
      {renderHeader()}

      <AnimatePresence mode="wait">
        <motion.div
          key={`${tab}-${stack.length}-${top?.type === 'material' ? top.id : ''}`}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col flex-1 overflow-hidden"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>

      {!isMat && <BottomNav active={tab} onChange={switchTab} />}

      <NotifySheet open={notifyOpen} onClose={() => setNotifyOpen(false)} />
    </div>
  )
}
