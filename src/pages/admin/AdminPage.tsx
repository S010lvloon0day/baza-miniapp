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
import { BannersScreen, PinnedScreen, BroadcastScreen, PaymentsScreen, LogsScreen, LimitsScreen, WeekScreen, ChatModScreen } from './MiscScreens'
import { Loader, Toaster, errMsg, num, ago } from './ui'

export type Screen =
  | { k: 'home' } | { k: 'content' } | { k: 'section'; id: number; title: string } | { k: 'material'; id: number }
  | { k: 'upload'; sectionId?: number } | { k: 'users' } | { k: 'user'; id: number } | { k: 'subs' } | { k: 'comments' } | { k: 'feedback' }
  | { k: 'courses' } | { k: 'banners' } | { k: 'pinned' } | { k: 'broadcast' } | { k: 'payments' } | { k: 'logs' } | { k: 'limits' } | { k: 'week' } | { k: 'chatmod' }

export interface Nav { push: (s: Screen) => void; back: () => void }

const TITLES: Partial<Record<Screen['k'], string>> = {
  content: 'Контент', material: 'Материал', upload: 'Новый материал', users: 'Пользователи', user: 'Пользователь',
  subs: 'Заявки', comments: 'Комментарии', feedback: 'Обсуждения', courses: 'Курсы', banners: 'Баннеры',
  pinned: 'Закреп в боте', limits: 'Лимиты чтения', week: 'Итоги недели', chatmod: 'Чат: жалобы и муты', broadcast: 'Рассылка', payments: 'Оплаты', logs: 'Журнал',
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
    push: s => setStack(st => [...st, s]),
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
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {top.k !== 'home' && (
        <div className="sticky top-0 z-30 bg-bg/85 backdrop-blur-xl border-b border-white/[.06]"><div className="max-w-[760px] mx-auto flex items-center gap-2 px-2 h-14">
          <button onClick={goBack} aria-label="Назад" className="w-10 h-10 rounded-full grid place-items-center active:bg-white/10"><Icon name="chevL" size={22} /></button>
          <h2 className="font-display font-semibold text-[16px] truncate flex-1">{title}</h2>
          {top.k === 'material' && <button onClick={() => onOpenMaterial(top.id)} className="h-9 px-3 rounded-full bg-white/[.06] text-[12.5px] flex items-center gap-1.5"><Icon name="eye" size={15} />Как видят</button>}
        </div></div>
      )}
      <motion.div key={stack.length + top.k} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .18 }} className="flex-1 min-h-0 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex flex-col min-h-full w-full max-w-[760px] mx-auto">
        {top.k === 'home' && <Home nav={nav} fbUnread={fbUnread} />}
        {top.k === 'content' && <SectionsScreen nav={nav} parentId={null} />}
        {top.k === 'section' && <SectionsScreen key={top.id} nav={nav} parentId={top.id} />}
        {top.k === 'material' && <MaterialScreen key={top.id} nav={nav} id={top.id} />}
        {top.k === 'upload' && <UploadPage initialSectionId={top.sectionId} />}
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
        {top.k === 'limits' && <LimitsScreen nav={nav} />}
        {top.k === 'week' && <WeekScreen nav={nav} />}
        {top.k === 'chatmod' && <ChatModScreen nav={nav} />}
        </div>
      </motion.div>
      <Toaster />
    </div>
  )
}

/* ───────────── Главная админки ───────────── */

const rub = (n: number) => num(Math.round(n)) + ' ₽'
const dayLabel = (d: string) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '')

function Home({ nav, fbUnread }: { nav: Nav; fbUnread: number }) {
  const [o, setO] = useState<Overview | null>(null)
  const [err, setErr] = useState('')
  const [sel, setSel] = useState<number | null>(null)
  const [spin, setSpin] = useState(false)
  const load = useCallback(() => { setSpin(true); return adminApi.overview().then(setO).catch(e => setErr(errMsg(e))).finally(() => setSpin(false)) }, [])
  useEffect(() => { load() }, [load])

  if (err) return <div className="p-6 text-center text-gray">{err === 'forbidden' ? 'Нет прав администратора' : err}</div>
  if (!o) return <Loader />
  const max = Math.max(1, ...o.signups.map(s => s.n))
  const pick = sel ?? o.signups.length - 1
  const go = (k: Screen['k']) => () => nav.push({ k } as Screen)
  const attention = [
    o.pending_submissions > 0 && { k: 'subs' as const, icon: 'checkCircle' as IconName, t: 'Заявки на проверку', n: o.pending_submissions },
    o.reported_comments > 0 && { k: 'comments' as const, icon: 'flag' as IconName, t: 'Жалобы на комментарии', n: o.reported_comments },
    fbUnread > 0 && { k: 'feedback' as const, icon: 'chat' as IconName, t: 'Новые отзывы и оценки', n: fbUnread },
  ].filter(Boolean) as { k: Screen['k']; icon: IconName; t: string; n: number }[]

  const Item = ({ k, icon, title, sub, tone, badge }: { k: Screen['k']; icon: IconName; title: string; sub: string; tone: string; badge?: number }) => (
    <button onClick={go(k)} className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-white/[.04]">
      <span className="w-9 h-9 rounded-[11px] grid place-items-center shrink-0" style={{ background: tone + '1F', color: tone }}><Icon name={icon} size={18} accent="current" /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14.5px] font-medium">{title}</span>
        <span className="block text-[12px] text-gray truncate">{sub}</span>
      </span>
      {!!badge && <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-green text-ink text-[11.5px] font-bold grid place-items-center">{badge}</span>}
      <Icon name="chevR" size={16} className="text-gray2 shrink-0" />
    </button>
  )
  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h3 className="text-[12.5px] font-semibold text-gray px-1 mb-2">{title}</h3>
      <div className="list-group">{children}</div>
    </section>
  )

  return (
    <div className="px-4 pt-3 pb-navsafe">
      {/* сводка */}
      <div className="relative overflow-hidden rounded-[24px] p-5 border border-white/[.08]"
        style={{ background: 'radial-gradient(120% 90% at 100% 0%, rgba(118,87,255,.32), transparent 60%), radial-gradient(90% 80% at 0% 100%, rgba(23,229,132,.18), transparent 60%), #111C17' }}>
        <span className="absolute -right-8 -bottom-10 opacity-[.06] pointer-events-none"><BazaMark size={190} color="#fff" /></span>
        <div className="relative flex items-center justify-between">
          <span className="flex items-center gap-2 text-[13px] text-gray"><span className="pulse-dot" />Админка Базы</span>
          <button onClick={load} className="w-8 h-8 rounded-full bg-white/[.08] grid place-items-center" aria-label="Обновить">
            <Icon name="refresh" size={15} className={spin ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="relative mt-2 flex items-end gap-2 flex-wrap">
          <b className="font-display font-semibold text-[34px] leading-none">{num(o.users)}</b>
          <span className="text-[13px] text-gray mb-1">пользователей</span>
          <span className="text-[12px] font-semibold text-green mb-1 ml-auto">+{o.new_7d} за неделю</span>
        </div>
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          {([['Premium', num(o.premium), '#F5C25A'], ['Активны сегодня', num(o.active_1d), '#17E584'], ['За 7 дней', num(o.active_7d), '#B9A8FF'], ['Выручка 30 дн.', rub(o.rub_30d), '#F5C25A']] as const).map(([l, v, c]) => (
            <div key={l} className="rounded-[14px] bg-black/25 px-3 py-2.5 min-w-0">
              <b className="block font-display font-semibold text-[17px] truncate" style={{ color: c }}>{v}</b>
              <span className="text-[11.5px] text-gray">{l}</span>
            </div>
          ))}
        </div>
        {/* регистрации за 14 дней */}
        <div className="relative mt-4">
          <div className="flex justify-between text-[11.5px] text-gray mb-2">
            <span>Новые пользователи</span>
            <span><b className="text-fg font-semibold">{o.signups[pick]?.n ?? 0}</b> · {pick === o.signups.length - 1 ? 'сегодня' : dayLabel(o.signups[pick].d)}</span>
          </div>
          <div className="flex items-end gap-[4px] h-14">
            {o.signups.map((s, i) => (
              <button key={s.d} onClick={() => setSel(i)} aria-label={`${s.d}: ${s.n}`} className="flex-1 h-full flex items-end">
                <span className="w-full rounded-t-[4px] transition-opacity" style={{ height: `${Math.max(6, s.n / max * 100)}%`, opacity: i === pick ? 1 : .45,
                  background: i === pick ? 'linear-gradient(180deg,#4BF5A8,#17E584)' : 'linear-gradient(180deg,#17E584,rgba(23,229,132,.4))' }} />
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10.5px] text-gray2 mt-1"><span>{dayLabel(o.signups[0].d)}</span><span>сегодня</span></div>
        </div>
      </div>

      {/* быстрые действия */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <button className="btn-primary h-11 px-2 gap-1.5" style={{ fontFamily: 'Onest, sans-serif', fontSize: 14, fontWeight: 700 }} onClick={go('upload')}><Icon name="plus" size={16} />Материал</button>
        <button className="btn-secondary h-11 text-[13.5px] px-2" onClick={go('broadcast')}><Icon name="send" size={16} />Рассылка</button>
        <button className="btn-secondary h-11 text-[13.5px] px-2" onClick={go('users')}><Icon name="search" size={16} />Юзер</button>
      </div>

      {/* требует внимания */}
      {attention.length > 0 ? (
        <div className="card mt-3 overflow-hidden" style={{ borderColor: 'rgba(23,229,132,.25)' }}>
          <div className="px-4 pt-3 text-[12.5px] font-semibold text-green">Требует внимания</div>
          {attention.map(a => (
            <button key={a.k} onClick={go(a.k)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left active:bg-white/[.04]">
              <Icon name={a.icon} size={18} className="text-green" accent="current" />
              <span className="flex-1 text-[14px]">{a.t}</span>
              <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-green text-ink text-[11.5px] font-bold grid place-items-center">{a.n}</span>
            </button>
          ))}
          <div className="h-1.5" />
        </div>
      ) : (
        <div className="flex items-center gap-2.5 mt-3 px-4 py-3 rounded-[16px] bg-s1 border border-white/[.06] text-[13px] text-gray">
          <Icon name="checkCircle" size={17} className="text-green" accent="current" />Новых заявок, жалоб и отзывов нет
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-4 mt-5 [&>*]:min-w-0">
        <Group title="Контент">
          <Item k="content" icon="folder" title="Разделы и материалы" sub={`${num(o.sections)} разделов · ${num(o.materials)} материалов`} tone="#17E584" />
          <Item k="courses" icon="book" title="Курсы" sub="конструктор курсов и доступ" tone="#F5C25A" />
          <Item k="subs" icon="checkCircle" title="Заявки от пользователей" sub={o.pending_submissions ? `ждут проверки: ${o.pending_submissions}` : 'новых нет'} tone="#17E584" badge={o.pending_submissions} />
        </Group>
        <Group title="Сообщество">
          <Item k="users" icon="users" title="Пользователи" sub={`${num(o.users)} · в бане ${o.banned}`} tone="#B9A8FF" />
          <Item k="comments" icon="flag" title="Комментарии" sub={o.reported_comments ? `жалоб: ${o.reported_comments}` : 'жалоб нет'} tone="#FF8A8A" badge={o.reported_comments} />
          <Item k="feedback" icon="chat" title="Обсуждения" sub="отзывы и оценки материалов" tone="#B9A8FF" badge={fbUnread} />
          <Item k="chatmod" icon="chat" title="Чат: жалобы и муты" sub="модерация, фильтр мата" tone="#FF8A8A" />
          <Item k="week" icon="trophy" title="Итоги недели" sub="призы 3/2/1 дня · проверка честности" tone="#F5C25A" />
          <Item k="limits" icon="clock" title="Лимиты чтения" sub="кто упёрся в лимит · сброс" tone="#F5C25A" />
        </Group>
        <Group title="Продвижение">
          <Item k="broadcast" icon="send" title="Рассылка" sub="сообщение всем или сегменту" tone="#17E584" />
          <Item k="banners" icon="image" title="Баннеры" sub="карточки на главной" tone="#F5C25A" />
          <Item k="pinned" icon="pin" title="Закреп в боте" sub="сообщение при /start" tone="#B9A8FF" />
        </Group>
        <Group title="Деньги и учёт">
          <Item k="payments" icon="card" title="Оплаты" sub={`${rub(o.rub_30d)} за 30 дней · ${o.rub_30d_count} оплат`} tone="#F5C25A" />
          <Item k="logs" icon="history" title="Журнал" sub="кто и что менял" tone="#A6B8AE" />
        </Group>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 [&>*]:min-w-0">
        <Revenue data={o.revenue} onOpen={go('payments')} />
        <section className="card p-4">
          <div className="flex items-center justify-between mb-2"><b className="text-[14px]">Популярное за неделю</b><span className="text-[11.5px] text-gray">открытий</span></div>
          {o.top_materials.length ? o.top_materials.map((m, i) => (
            <button key={m.id} onClick={() => nav.push({ k: 'material', id: m.id })} className="w-full flex items-center gap-3 py-2 text-left">
              <span className="w-5 text-[12px] font-bold tabular-nums" style={{ color: i === 0 ? '#F5C25A' : '#6E8478' }}>{i + 1}</span>
              <span className="flex-1 min-w-0 text-[13.5px] truncate">{m.title}</span>
              <span className="text-[12.5px] text-gray tabular-nums">{num(m.views)}</span>
            </button>
          )) : <p className="text-[13px] text-gray2">Пока нет данных</p>}
        </section>
        <section className="card p-4 sm:col-span-2">
          <div className="flex items-center justify-between mb-1"><b className="text-[14px]">Новые пользователи</b>
            <button onClick={go('users')} className="text-[12.5px] text-green">Все ›</button></div>
          {o.recent_users.map(u => (
            <button key={u.id} onClick={() => nav.push({ k: 'user', id: u.id })} className="w-full flex items-center gap-3 py-2 text-left">
              <span className="w-8 h-8 rounded-full grid place-items-center text-[12px] font-semibold shrink-0"
                style={{ background: u.premium ? 'linear-gradient(135deg,#F5C25A,#B8862B)' : '#20302A', color: u.premium ? '#2A1C00' : '#CFDAD4' }}>
                {(u.name || u.username || '?').trim().slice(0, 1).toUpperCase()}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13.5px] truncate">{u.name || u.username || u.id}</span>
                <span className="block text-[11.5px] text-gray truncate">{u.username ? '@' + u.username + ' · ' : ''}{ago(u.joined_at)}</span>
              </span>
              <Icon name="chevR" size={15} className="text-gray2" />
            </button>
          ))}
        </section>
      </div>
    </div>
  )
}

function Revenue({ data, onOpen }: { data: { d: string; sum: number }[]; onOpen: () => void }) {
  const total = data.reduce((a, x) => a + x.sum, 0)
  const max = Math.max(1, ...data.map(x => x.sum))
  const [sel, setSel] = useState<number | null>(null)
  const cur = sel !== null ? data[sel] : null
  return (
    <section className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[12px] text-gray">{cur ? dayLabel(cur.d) : 'Выручка за 30 дней'}</span>
          <b className="block font-display font-semibold text-[22px] text-gold mt-0.5">{rub(cur ? cur.sum : total)}</b>
        </div>
        <button onClick={onOpen} className="text-[12.5px] text-green">Оплаты ›</button>
      </div>
      <div className="flex items-end gap-[2px] h-16 mt-3" onMouseLeave={() => setSel(null)}>
        {data.map((x, i) => (
          <button key={x.d} onClick={() => setSel(sel === i ? null : i)} onMouseEnter={() => setSel(i)} className="flex-1 h-full flex items-end" aria-label={`${x.d}: ${x.sum}`}>
            <span className="w-full rounded-t-[3px]" style={{ height: x.sum ? `${Math.max(8, x.sum / max * 100)}%` : '3px',
              background: x.sum ? (sel === i ? '#FFE08A' : 'linear-gradient(180deg,#F5C25A,rgba(245,194,90,.35))') : 'rgba(255,255,255,.08)' }} />
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10.5px] text-gray2 mt-1"><span>{dayLabel(data[0].d)}</span><span>сегодня</span></div>
    </section>
  )
}
