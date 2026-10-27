import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Icon from '../../components/Icon'
import type { IconName } from '../../components/Icon'
import BazaMark from '../../components/BazaMark'
import { adminApi } from '../../api/admin'
import type { Overview } from '../../api/admin'
import UploadPage from '../constructor/UploadPage'
import ConstructorPage from '../constructor/ConstructorPage'
import FeedbackPage from '../FeedbackPage'
import { SectionsScreen, MaterialScreen } from './ContentScreens'
import { UsersScreen, UserScreen, SubmissionsScreen, CommentsScreen } from './PeopleScreens'
import { BannersScreen, PinnedScreen, BroadcastScreen, PaymentsScreen, LogsScreen } from './MiscScreens'
import { Loader, Toaster, errMsg, num } from './ui'

export type Screen =
  | { k: 'home' } | { k: 'content' } | { k: 'section'; id: number; title: string } | { k: 'material'; id: number }
  | { k: 'upload' } | { k: 'users' } | { k: 'user'; id: number } | { k: 'subs' } | { k: 'comments' } | { k: 'feedback' }
  | { k: 'courses' } | { k: 'banners' } | { k: 'pinned' } | { k: 'broadcast' } | { k: 'payments' } | { k: 'logs' }

export interface Nav { push: (s: Screen) => void; back: () => void }

const TITLES: Partial<Record<Screen['k'], string>> = {
  content: 'Контент', material: 'Материал', upload: 'Новый материал', users: 'Пользователи', user: 'Пользователь',
  subs: 'Заявки', comments: 'Комментарии', feedback: 'Обсуждения', courses: 'Курсы', banners: 'Баннеры',
  pinned: 'Закреп в боте', broadcast: 'Рассылка', payments: 'Оплаты', logs: 'Журнал',
}

// Стек экранов переживает размонтирование (например, «Как видят» → назад)
let savedStack: Screen[] = [{ k: 'home' }]

interface Props { fbUnread: number; onFeedbackSeen: () => void; onOpenMaterial: (id: number) => void }

export default function AdminPage({ fbUnread, onFeedbackSeen, onOpenMaterial }: Props) {
  const [stack, setStack] = useState<Screen[]>(savedStack)
  useEffect(() => { savedStack = stack }, [stack])
  const [courseEditing, setCourseEditing] = useState(false)
  const top = stack[stack.length - 1]
  const nav: Nav = {
    push: s => { setStack(st => [...st, s]); window.scrollTo(0, 0) },
    back: () => setStack(st => (st.length > 1 ? st.slice(0, -1) : st)),
  }
  const goBack = () => { if (top.k === 'courses' && courseEditing) setCourseEditing(false); else nav.back() }

  // системная кнопка «Назад» Telegram
  useEffect(() => {
    const bb = (window as any).Telegram?.WebApp?.BackButton
    if (!bb) return
    if (stack.length > 1) { bb.show(); bb.onClick(goBack); return () => { bb.offClick(goBack); bb.hide() } }
    bb.hide()
  })

  const title = top.k === 'section' ? top.title : TITLES[top.k] || 'Админка'

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {top.k !== 'home' && (
        <div className="sticky top-0 z-30 flex items-center gap-2 px-2 h-14 bg-bg/85 backdrop-blur-xl border-b border-white/[.06]">
          <button onClick={goBack} aria-label="Назад" className="w-10 h-10 rounded-full grid place-items-center active:bg-white/10"><Icon name="chevL" size={22} /></button>
          <h2 className="font-display font-semibold text-[16px] truncate flex-1">{title}</h2>
          {top.k === 'material' && <button onClick={() => onOpenMaterial(top.id)} className="h-9 px-3 rounded-full bg-white/[.06] text-[12.5px] flex items-center gap-1.5"><Icon name="eye" size={15} />Как видят</button>}
        </div>
      )}
      <motion.div key={stack.length + top.k} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .18 }} className="flex-1 flex flex-col min-h-0">
        {top.k === 'home' && <Home nav={nav} fbUnread={fbUnread} />}
        {top.k === 'content' && <SectionsScreen nav={nav} parentId={null} />}
        {top.k === 'section' && <SectionsScreen key={top.id} nav={nav} parentId={top.id} />}
        {top.k === 'material' && <MaterialScreen key={top.id} nav={nav} id={top.id} />}
        {top.k === 'upload' && <UploadPage />}
        {top.k === 'users' && <UsersScreen nav={nav} />}
        {top.k === 'user' && <UserScreen key={top.id} id={top.id} />}
        {top.k === 'subs' && <SubmissionsScreen />}
        {top.k === 'comments' && <CommentsScreen nav={nav} />}
        {top.k === 'feedback' && <FeedbackPage onOpenMaterial={onOpenMaterial} onSeen={onFeedbackSeen} />}
        {top.k === 'courses' && <ConstructorPage editing={courseEditing} onEditingChange={setCourseEditing} fixedMode="course" />}
        {top.k === 'banners' && <BannersScreen />}
        {top.k === 'pinned' && <PinnedScreen />}
        {top.k === 'broadcast' && <BroadcastScreen />}
        {top.k === 'payments' && <PaymentsScreen />}
        {top.k === 'logs' && <LogsScreen />}
      </motion.div>
      <Toaster />
    </div>
  )
}

/* ───────────── Главная админки ───────────── */

function Home({ nav, fbUnread }: { nav: Nav; fbUnread: number }) {
  const [o, setO] = useState<Overview | null>(null)
  const [err, setErr] = useState('')
  const load = useCallback(() => adminApi.overview().then(setO).catch(e => setErr(errMsg(e))), [])
  useEffect(() => { load() }, [load])

  if (err) return <div className="p-6 text-center text-gray">{err === 'forbidden' ? 'Нет прав администратора' : err}</div>
  if (!o) return <Loader />
  const max = Math.max(1, ...o.signups.map(s => s.n))

  const tiles: { k: Screen['k']; icon: IconName; title: string; sub: string; badge?: number; tone: string }[] = [
    { k: 'content', icon: 'folder', title: 'Контент', sub: `${num(o.sections)} разд. · ${num(o.materials)} мат.`, tone: '#17E584' },
    { k: 'users', icon: 'users', title: 'Пользователи', sub: `${num(o.users)} · бан ${o.banned}`, tone: '#B9A8FF' },
    { k: 'subs', icon: 'checkCircle', title: 'Заявки', sub: o.pending_submissions ? 'ждут проверки' : 'новых нет', badge: o.pending_submissions, tone: '#17E584' },
    { k: 'comments', icon: 'flag', title: 'Комментарии', sub: o.reported_comments ? 'есть жалобы' : 'жалоб нет', badge: o.reported_comments, tone: '#FF8A8A' },
    { k: 'feedback', icon: 'chat', title: 'Обсуждения', sub: 'отзывы и оценки', badge: fbUnread, tone: '#B9A8FF' },
    { k: 'courses', icon: 'book', title: 'Курсы', sub: 'конструктор курсов', tone: '#F5C25A' },
    { k: 'broadcast', icon: 'send', title: 'Рассылка', sub: 'сообщение всем', tone: '#17E584' },
    { k: 'banners', icon: 'image', title: 'Баннеры', sub: 'на главной', tone: '#F5C25A' },
    { k: 'pinned', icon: 'pin', title: 'Закреп', sub: 'в чате бота', tone: '#B9A8FF' },
    { k: 'payments', icon: 'card', title: 'Оплаты', sub: `${num(o.rub_30d)} ₽ за 30 дн.`, tone: '#F5C25A' },
    { k: 'logs', icon: 'history', title: 'Журнал', sub: 'кто что менял', tone: '#A6B8AE' },
  ]

  return (
    <div className="px-4 pt-3 pb-navsafe">
      {/* сводка */}
      <div className="relative overflow-hidden rounded-[24px] p-5 border border-white/[.08]"
        style={{ background: 'radial-gradient(120% 90% at 100% 0%, rgba(118,87,255,.35), transparent 60%), radial-gradient(90% 80% at 0% 100%, rgba(23,229,132,.22), transparent 60%), #111C17' }}>
        <span className="absolute -right-8 -bottom-10 opacity-[.07] pointer-events-none"><BazaMark size={170} color="#fff" /></span>
        <div className="relative flex items-center justify-between">
          <span className="text-[13px] text-gray">Админка Базы</span>
          <button onClick={load} className="w-8 h-8 rounded-full bg-white/[.08] grid place-items-center" aria-label="Обновить"><Icon name="refresh" size={15} /></button>
        </div>
        <div className="relative mt-2 flex items-end gap-2">
          <b className="font-display font-semibold text-[34px] leading-none">{num(o.users)}</b>
          <span className="text-[13px] text-gray mb-1">пользователей</span>
        </div>
        <div className="relative grid grid-cols-3 gap-2 mt-4">
          {[['Premium', o.premium, '#F5C25A'], ['Сегодня', o.active_1d, '#17E584'], ['За 7 дн.', o.active_7d, '#B9A8FF']].map(([l, v, c]) => (
            <div key={l as string} className="rounded-[14px] bg-black/25 px-3 py-2.5">
              <b className="block font-display font-semibold text-[17px]" style={{ color: c as string }}>{num(v as number)}</b>
              <span className="text-[11.5px] text-gray">{l}</span>
            </div>
          ))}
        </div>
        {/* регистрации за 14 дней */}
        <div className="relative mt-4">
          <div className="flex justify-between text-[11.5px] text-gray mb-1.5"><span>Новые за 14 дней</span><span>+{o.new_1d} сегодня · +{o.new_7d} за неделю</span></div>
          <div className="flex items-end gap-[3px] h-12">
            {o.signups.map(s => (
              <div key={s.d} title={`${s.d}: ${s.n}`} className="flex-1 rounded-t-[4px]" style={{ height: `${Math.max(6, s.n / max * 100)}%`, background: 'linear-gradient(180deg,#17E584,rgba(23,229,132,.35))' }} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button className="btn-primary h-12" onClick={() => nav.push({ k: 'upload' })}><Icon name="plus" size={17} />Материал</button>
        <button className="btn-secondary h-12" onClick={() => nav.push({ k: 'users' })}><Icon name="search" size={17} />Найти юзера</button>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        {tiles.map(t => (
          <button key={t.k} onClick={() => nav.push({ k: t.k } as Screen)} className="card relative p-3.5 text-left active:scale-[.98] transition-transform">
            <span className="w-10 h-10 rounded-[12px] grid place-items-center mb-2.5" style={{ background: t.tone + '22', color: t.tone }}><Icon name={t.icon} size={20} accent="current" /></span>
            <b className="block text-[14.5px] font-semibold">{t.title}</b>
            <span className="block text-[12px] text-gray truncate">{t.sub}</span>
            {!!t.badge && <span className="absolute top-3 right-3 min-w-[22px] h-[22px] px-1.5 rounded-full bg-green text-ink text-[11.5px] font-bold grid place-items-center">{t.badge}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
