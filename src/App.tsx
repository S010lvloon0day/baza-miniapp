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
import CompetePage from './pages/CompetePage'
import ChatPage from './pages/ChatPage'
import GiveawayPage from './pages/GiveawayPage'
import SubmitPage from './pages/SubmitPage'
import CoursesListPage from './pages/courses/CoursesListPage'
import CourseDetailPage from './pages/courses/CourseDetailPage'
import CoursePlayer from './pages/courses/CoursePlayer'
import ConstructorPage from './pages/constructor/ConstructorPage'
import FeedbackPage from './pages/FeedbackPage'
import { feedback } from './api/social'
import BottomNav from './components/BottomNav'
import type { Tab } from './components/BottomNav'
import Header from './components/Header'
import NotifySheet from './components/NotifySheet'
import { api } from './api/client'
import type { Section } from './api/client'
import { isBookmarked, removeBookmarkRemote, saveBookmarkRemote, syncBookmarks } from './store/bookmarks'
import { isCourseFav, isSectionFav, toggleCourseFav, toggleSectionFav } from './store/favsExtra'

const tg = (window as any).Telegram?.WebApp

/** На десктопных клиентах Telegram открываем мини-апп во весь экран сразу.
 *  requestFullscreen — Bot API 8.0+; на старых/неподдерживающих клиентах просто
 *  приходит событие fullscreenFailed, ничего не ломается. На телефоне не трогаем
 *  (там работает обычный expand), на вебе нативного фуллскрина нет. */
function fullscreenSupported() {
  return (tg?.platform === 'tdesktop' || tg?.platform === 'macos')
    && tg?.isVersionAtLeast?.('8.0') === true && typeof tg?.requestFullscreen === 'function'
}

function enterFullscreenOnDesktop() {
  try {
    // Уважаем выбор пользователя: если он выбрал оконный режим — не разворачиваем.
    const pref = localStorage.getItem('fsPref')
    if (fullscreenSupported() && pref !== 'off' && !tg.isFullscreen) {
      tg.requestFullscreen()
    }
  } catch { /* не критично */ }
}

type View =
  | { type: 'tab'; tab: Tab }
  | { type: 'section'; section: Section; page: number }
  | { type: 'material'; id: number; sectionId: number }
  | { type: 'giveaway' }
  | { type: 'submit' }
  | { type: 'courses'; section: Section }
  | { type: 'course'; courseId: number; title: string }
  | { type: 'player'; courseId: number }
  | { type: 'feedback' }
  | { type: 'compete' }

/** Ссылка из бота: ?m=<id> / startapp=m<id> — материал, ?feedback=1 / startapp=feedback — лента. */
function readDeepLink(): { material?: number; feedback?: boolean; chat?: boolean } {
  const qp = new URLSearchParams(location.search)
  const sp: string = tg?.initDataUnsafe?.start_param || ''
  const m = Number(qp.get('m') || (sp.match(/^m(\d+)$/)?.[1] ?? ''))
  return {
    material: Number.isInteger(m) && m > 0 ? m : undefined,
    feedback: qp.get('feedback') === '1' || sp === 'feedback',
    chat: qp.get('chat') === '1' || sp === 'chat',
  }
}

export default function App() {
  const [deepLink] = useState(readDeepLink)
  const [started, setStarted] = useState(() => !!localStorage.getItem('started') || !!deepLink.material || deepLink.feedback || !!deepLink.chat)
  const [tab, setTab] = useState<Tab>(deepLink.chat ? 'chat' : 'home')
  const [stack, setStack] = useState<View[]>([])
  const [bmTick, setBmTick] = useState(0)
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [botUsername, setBotUsername] = useState('')
  const [upgradePending, setUpgradePending] = useState(false)
  // Квест виден только когда сервер разрешил (включён или текущий юзер — админ)
  const [giveawayVisible, setGiveawayVisible] = useState(false)
  // Вкладка конструктора — только для админов, признак приходит с сервера
  const [isAdmin, setIsAdmin] = useState(false)
  const [ctorEditing, setCtorEditing] = useState(false)
  // Новые комментарии и оценки с прошлого просмотра ленты (только у админа)
  const [fbUnread, setFbUnread] = useState(0)
  const [fbUnanswered, setFbUnanswered] = useState(0)
  // Отступы под оверлей Telegram в полноэкранном режиме (на ПК), чтобы шапку не перекрывало.
  const [safeInset, setSafeInset] = useState({ top: 0, right: 0, left: 0 })
  // Полноэкранный/оконный режим на ПК: текущее состояние и признак поддержки.
  const [fs, setFs] = useState<boolean>(() => !!tg?.isFullscreen)
  const [fsSupported] = useState<boolean>(() => fullscreenSupported())

  /** Открыть материал, зная только id (из ссылки бота или ленты обсуждений). */
  const openMaterialById = (id: number, replace = false) => {
    api.material(id).then(d => {
      const view: View = { type: 'material', id, sectionId: d.section_id }
      setStack(s => (replace ? [view] : [...s, view]))
    }).catch(() => {})
  }


  useEffect(() => {
    tg?.expand?.()
    tg?.ready?.()
    enterFullscreenOnDesktop()
    api.config().then(c => {
      if (c.bot_username) setBotUsername(c.bot_username)
      setGiveawayVisible(!!c.giveaway_visible)
      setIsAdmin(!!c.is_admin)
      if (c.is_admin && deepLink.feedback) setStack([{ type: 'feedback' }])
    }).catch(() => {})
    if (deepLink.material) openMaterialById(deepLink.material, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshUnread = useCallback(() => {
    feedback.unread().then(r => {
      if (r.ok) { setFbUnread(r.total); setFbUnanswered(r.unanswered) }
    })
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    refreshUnread()
    const t = window.setInterval(refreshUnread, 60_000)
    return () => window.clearInterval(t)
  }, [isAdmin, refreshUnread])

  useEffect(() => {
    if (!started) return
    syncBookmarks().finally(() => setBmTick(t => t + 1))
  }, [started])

  // Следим за безопасной зоной контента — в фуллскрине на ПК Telegram рисует свои
  // кнопки поверх, и шапку надо сдвинуть. Вне фуллскрина инсеты нулевые (без изменений).
  useEffect(() => {
    const apply = () => {
      const i = tg?.contentSafeAreaInset
      if (i) setSafeInset({ top: i.top || 0, right: i.right || 0, left: i.left || 0 })
      setFs(!!tg?.isFullscreen)
    }
    apply()
    tg?.onEvent?.('contentSafeAreaChanged', apply)
    tg?.onEvent?.('safeAreaChanged', apply)
    tg?.onEvent?.('fullscreenChanged', apply)
    return () => {
      tg?.offEvent?.('contentSafeAreaChanged', apply)
      tg?.offEvent?.('safeAreaChanged', apply)
      tg?.offEvent?.('fullscreenChanged', apply)
    }
  }, [])

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

  // Переключение полноэкранного/оконного режима на ПК; выбор запоминаем в localStorage.
  const toggleFullscreen = useCallback(() => {
    try {
      if (tg?.isFullscreen) { tg.exitFullscreen?.(); localStorage.setItem('fsPref', 'off') }
      else { tg?.requestFullscreen?.(); localStorage.setItem('fsPref', 'on') }
    } catch { /* не критично */ }
  }, [])

  const openGiveaway = () => setStack(s => [...s, { type: 'giveaway' }])
  const openSubmit = () => setStack(s => [...s, { type: 'submit' }])
  const openSection = (section: Section) =>
    setStack(s => [
      ...s,
      section.section_type === 'courses'
        ? { type: 'courses', section }
        : { type: 'section', section, page: 0 },
    ])
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
    if (t !== 'ctor') setCtorEditing(false)
  }

  const openFeedback = () => setStack(s => [...s, { type: 'feedback' }])

  const openCompete = () => setStack(s => [...s, { type: 'compete' }])

  const openCourse = (courseId: number, title = 'Курс') =>
    setStack(s => [...s, { type: 'course', courseId, title }])

  const openPlayer = (courseId: number) =>
    setStack(s => [...s, { type: 'player', courseId }])

  /** Из плеера возвращаемся к странице курса — там прогресс и отзывы. */
  const backToCourse = () =>
    setStack(s => {
      const idx = s.map(v => v.type).lastIndexOf('course')
      return idx === -1 ? [] : s.slice(0, idx + 1)
    })

  if (!started) {
    return <SplashPage onStart={startApp} />
  }

  const top = stack[stack.length - 1]
  const isMat = top?.type === 'material'

  const renderContent = () => {
    if (!top) {
      if (tab === 'home')   return <HomePage onSection={openSection} onMaterial={openMaterial} onTabCats={() => switchTab('cats')} onSubmit={openSubmit} onCompete={openCompete} onChat={() => switchTab('chat')} />
      if (tab === 'cats')   return <CatsPage onSection={openSection} onGiveaway={giveawayVisible ? openGiveaway : undefined} />
      if (tab === 'search') return <SearchPage onMaterial={openMaterial} />
      if (tab === 'favs')   return <FavsPage key={bmTick} onMaterial={openMaterial} onSection={openSection} onCourse={openCourse} />
      if (tab === 'recent') return <RecentPage onMaterial={openMaterial} />
      if (tab === 'chat')   return <ChatPage />
      if (tab === 'prof')   return <ProfilePage scrollToPlans={upgradePending} onScrolled={() => setUpgradePending(false)} onCompete={openCompete} />
      if (tab === 'ctor') {
        if (!isAdmin) return null
        if (ctorEditing) return <ConstructorPage editing={ctorEditing} onEditingChange={setCtorEditing} />
        return (
          <div className="flex flex-col flex-1 overflow-hidden">
            <button onClick={openFeedback}
              className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-green/30 px-4 py-3 text-left active:opacity-80"
              style={{ background: 'radial-gradient(120% 120% at 0% 0%, rgba(34,197,94,.12), transparent 60%), #0D0D11' }}>
              <span className="text-[20px]">💬</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-bold">Обсуждения и оценки</span>
                <span className="block text-[11.5px] text-gray truncate">
                  {fbUnread > 0 ? `Новых: ${fbUnread}` : 'Новых нет'}{fbUnanswered > 0 ? ` · без ответа: ${fbUnanswered}` : ''}
                </span>
              </span>
              {fbUnread > 0 && (
                <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-green text-black text-[11px] font-extrabold flex items-center justify-center">
                  {fbUnread}
                </span>
              )}
              <span className="text-gray">›</span>
            </button>
            <ConstructorPage editing={ctorEditing} onEditingChange={setCtorEditing} />
          </div>
        )
      }
    }
    if (top?.type === 'feedback') {
      if (!isAdmin) return null
      return <FeedbackPage onOpenMaterial={id => openMaterialById(id)} onSeen={() => { setFbUnread(0); refreshUnread() }} />
    }
    if (top?.type === 'compete') {
      return <CompetePage />
    }
    if (top?.type === 'courses') {
      return <CoursesListPage sectionId={top.section.id} onOpen={openCourse} />
    }
    if (top?.type === 'course') {
      return <CourseDetailPage courseId={top.courseId} onStart={() => openPlayer(top.courseId)} />
    }
    if (top?.type === 'player') {
      return <CoursePlayer courseId={top.courseId} onExit={backToCourse} />
    }
    if (top?.type === 'section') {
      return <SectionPage section={top.section} initialPage={top.page} onMaterial={openMaterial} onSubsection={openSection} onUpgrade={() => { setStack([]); setTab('prof'); setUpgradePending(true) }} />
    }
    if (top?.type === 'submit') {
      // Форма заявки доступна всем — сервер сам решит, можно ли автору сейчас.
      return <SubmitPage onDone={goBack} />
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
      if (tab === 'ctor' && ctorEditing) {
        return <Header showBack fullscreen={fs} onToggleFullscreen={fsSupported ? toggleFullscreen : undefined} onBack={() => setCtorEditing(false)} title="Конструктор" />
      }
      if (tab === 'chat') {
        return <Header showBack onBack={() => switchTab('home')} title="Чат базы" fullscreen={fs} onToggleFullscreen={fsSupported ? toggleFullscreen : undefined} />
      }
      const titles: Record<Tab, string> = { home: '', cats: 'Разделы', search: 'Поиск', favs: 'Избранное', recent: 'История', prof: 'Профиль', ctor: 'Конструктор', chat: 'Чат базы' }
      return <Header title={titles[tab]} onSearch={() => switchTab('search')} onBell={() => setNotifyOpen(true)} fullscreen={fs} onToggleFullscreen={fsSupported ? toggleFullscreen : undefined} />
    }
    if (top.type === 'feedback') {
      return <Header showBack fullscreen={fs} onToggleFullscreen={fsSupported ? toggleFullscreen : undefined} onBack={goBack} title="Обсуждения" />
    }
    if (top.type === 'compete') {
      return <Header showBack fullscreen={fs} onToggleFullscreen={fsSupported ? toggleFullscreen : undefined} onBack={goBack} title="Рейтинг" />
    }
    if (top.type === 'courses') {
      const sid = top.section.id
      return (
        <Header
          showBack fullscreen={fs} onToggleFullscreen={fsSupported ? toggleFullscreen : undefined} onBack={goBack} title={top.section.title}
          bookmarked={isSectionFav(sid)}
          onBookmark={() => { toggleSectionFav(sid); setBmTick(t => t + 1) }}
        />
      )
    }
    if (top.type === 'course') {
      const courseId = top.courseId
      return (
        <Header
          showBack fullscreen={fs} onToggleFullscreen={fsSupported ? toggleFullscreen : undefined} onBack={goBack} title="Курс"
          bookmarked={isCourseFav(courseId)}
          onBookmark={() => { toggleCourseFav(courseId); setBmTick(t => t + 1) }}
        />
      )
    }
    if (top.type === 'player') {
      return <Header showBack fullscreen={fs} onToggleFullscreen={fsSupported ? toggleFullscreen : undefined} onBack={backToCourse} title="Обучение" />
    }
    if (top.type === 'giveaway') {
      return <Header showBack fullscreen={fs} onToggleFullscreen={fsSupported ? toggleFullscreen : undefined} onBack={goBack} title="Секретный розыгрыш" />
    }
    if (top.type === 'section') {
      const sid = top.section.id
      return (
        <Header
          showBack fullscreen={fs} onToggleFullscreen={fsSupported ? toggleFullscreen : undefined} onBack={goBack} title={top.section.title}
          bookmarked={isSectionFav(sid)}
          onBookmark={() => { toggleSectionFav(sid); setBmTick(t => t + 1) }}
        />
      )
    }
    if (top.type === 'material') {
      const bm = isBookmarked(top.id)
      return (
        <Header
          showBack fullscreen={fs} onToggleFullscreen={fsSupported ? toggleFullscreen : undefined} onBack={goBack}
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
    <div className="flex flex-col h-full bg-bg"
      style={{ paddingTop: safeInset.top, paddingRight: safeInset.right, paddingLeft: safeInset.left, overflowX: 'hidden', maxWidth: '100vw' }}>
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

      {!isMat && tab !== 'chat' && <BottomNav active={tab} onChange={switchTab} showConstructor={isAdmin} badges={{ ctor: fbUnread }} />}

      <NotifySheet open={notifyOpen} onClose={() => setNotifyOpen(false)} />
    </div>
  )
}
