import { useEffect, useState, useRef } from 'react'
import lottie from 'lottie-web'
import { inflate as pakoInflate } from 'pako'
import { api } from '../api/client'
import MediaTypeIcon from '../components/MediaTypeIcon'
import type { Section, Material, Banner, ContinueItem, Compete } from '../api/client'
import BannerCard from '../components/BannerCard'
import Icon from '../components/Icon'
import PremiumBadge from '../components/PremiumBadge'
import { iconNameFor } from '../components/CategoryIcon'
import { coverClass } from '../components/sectionCover'
import LevelMark from '../components/LevelMark'

interface Props {
  onSection: (s: Section) => void
  onMaterial: (id: number, sectionId: number) => void
  onTabCats: () => void
  onSubmit?: () => void
  onCompete?: () => void
  onChat?: () => void
}

const FEATURED_TITLE = 'Знания S010lvloon'

/* ── Пользовательский контент: кастом-эмодзи в сообщениях чата ── */
function HeroEmoji({ k, fid }: { k: string; fid: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const url = api.chatStickerUrl(fid, k === 'v' ? 'video' : k === 'a' ? 'animated' : 'image')
  useEffect(() => {
    if (k !== 'a' || !ref.current) return
    let anim: ReturnType<typeof lottie.loadAnimation> | null = null, cancelled = false
    fetch(url).then(r => r.arrayBuffer()).then(buf => {
      if (cancelled || !ref.current) return
      try { const b = new Uint8Array(buf); const raw = (b[0] === 0x1f && b[1] === 0x8b) ? pakoInflate(b) : b; const data = JSON.parse(new TextDecoder().decode(raw)); anim = lottie.loadAnimation({ container: ref.current, renderer: 'svg', loop: true, autoplay: true, animationData: data }) } catch { /* */ }
    }).catch(() => {})
    return () => { cancelled = true; try { anim?.destroy() } catch { /* */ } }
  }, [url, k])
  const st = { display: 'inline-block', width: 16, height: 16, verticalAlign: '-0.2em', objectFit: 'contain' as const }
  if (k === 'a') return <span ref={ref} style={st} />
  if (k === 'v') return <video src={url} autoPlay loop muted playsInline style={st} />
  return <img src={url} alt="" style={st} />
}

function renderRich(text: string) {
  const re = /\{e:([avi]):([A-Za-z0-9_#-]+)\}/g
  const out: React.ReactNode[] = []; let last = 0, m: RegExpExecArray | null, key = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<span key={key++}>{text.slice(last, m.index)}</span>)
    if (m[2].indexOf('#') >= 0) out.push(<span key={key++}>🙂</span>)
    else out.push(<HeroEmoji key={key++} k={m[1]} fid={m[2]} />)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(<span key={key++}>{text.slice(last)}</span>)
  return out
}

/* ── Аватары с инициалами: стабильная приглушённая палитра ── */
const AV = [
  ['#1F4A3A', '#9FF0C6', '#7EE0AE'], ['#2A2170', '#CFC4FF', '#AE9BFF'], ['#5A4630', '#F0D29A', '#F5C25A'],
  ['#123F52', '#9BE3FF', '#7FD3F5'], ['#4A1F2E', '#FFB3C7', '#FF9DB7'], ['#3B3F12', '#E4EE9A', '#D5E27A'],
]
const avIdx = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % AV.length }
const initials = (n: string) => {
  const p = n.replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '•'
  if (p.length > 1) return (p[0][0] + p[1][0]).toUpperCase()
  const w = n.trim()
  return (/[_\-.0-9]/.test(w) ? w.replace(/[^\p{L}]/gu, '').slice(0, 2) || w[0] : w[0]).toUpperCase()
}

function Avatar({ name, size = 28, src }: { name: string; size?: number; src?: string }) {
  const [bad, setBad] = useState(!src)
  const c = AV[avIdx(name)]
  return (
    <div className="rounded-full shrink-0 grid place-items-center overflow-hidden font-bold"
      style={{ width: size, height: size, background: c[0], color: c[1], fontSize: Math.round(size * 0.38) }}>
      {bad ? initials(name) : <img src={src} alt="" className="w-full h-full object-cover" onError={() => setBad(true)} />}
    </div>
  )
}

/* ── Время до конца недели (вс 23:59:59 МСК) ── */
function weekLeft() {
  const MSK = 3 * 3600_000
  const now = Date.now()
  const m = new Date(now + MSK)
  const dow = m.getUTCDay() // 0 = вс
  const daysToSun = (7 - dow) % 7
  const end = Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate() + daysToSun, 23, 59, 59) - MSK
  const left = Math.max(0, end - now)
  return { d: Math.floor(left / 86400_000), h: Math.floor(left / 3600_000) % 24, min: Math.floor(left / 60_000) % 60 }
}

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер'
}

/* ── Заголовок секции ── */
function Head({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-baseline justify-between px-1 mb-2.5">
      <h2 className="text-[17px] font-bold">{title}</h2>
      {action && <button onClick={onAction} className="text-[13.5px] font-medium text-green active:opacity-70">{action}</button>}
    </div>
  )
}

/* ── Живой чат ── */
type LiveMsg = { id: number; name: string; text: string; uid: number }
function LiveChat({ onOpen }: { onOpen?: () => void }) {
  const [msgs, setMsgs] = useState<LiveMsg[]>([])
  const [online, setOnline] = useState(0)
  const [typing, setTyping] = useState<string[]>([])
  const seen = useRef<Set<number>>(new Set())
  const first = useRef(true)
  useEffect(() => {
    let alive = true
    const load = () => api.chat().then(r => {
      if (!alive) return
      const list = r.messages.filter(m => !m.deleted && (m.text || m.has_media)).slice(-3)
        .map(m => ({ id: m.id, name: m.name, uid: m.user_id, text: m.text || (m.type === 'voice' ? 'Голосовое сообщение' : m.type === 'sticker' ? 'Стикер' : m.type === 'gif' ? 'GIF' : 'Фото') }))
      setMsgs(list); setOnline(r.online); setTyping(r.typing ?? [])
    }).catch(() => {})
    load()
    const t = window.setInterval(() => { if (!document.hidden) load() }, 3500)
    return () => { alive = false; window.clearInterval(t) }
  }, [])
  useEffect(() => {
    const t = window.setTimeout(() => { msgs.forEach(m => seen.current.add(m.id)); first.current = false }, 500)
    return () => window.clearTimeout(t)
  }, [msgs])

  return (
    <div className="card-violet px-3.5 pt-3.5 pb-3 cursor-pointer" onClick={onOpen}>
      <div className="flex items-center gap-2.5 mb-3">
        <span className="tile-violet w-[34px] h-[34px] shrink-0"><Icon name="chat" size={17} accent="#fff" /></span>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-[15px] leading-tight">Чат базы</div>
          <div className="flex items-center gap-1.5 mt-1 text-[12.5px] text-[#B9B0E6] tabular-nums">
            <span className="pulse-dot" />{online} в сети
          </div>
        </div>
        <div className="flex">
          {Array.from(new Set(msgs.map(m => m.name))).slice(0, 3).map((n, i) => (
            <div key={n} style={{ marginLeft: i ? -7 : 0 }} className="rounded-full border-2 border-[#15123A]"><Avatar name={n} size={24} /></div>
          ))}
        </div>
      </div>

      <div className="flex flex-col justify-end gap-1.5 min-h-[120px]">
        {msgs.length === 0 ? (
          <div className="text-[13.5px] text-[#B9B0E6] py-6 text-center">Здесь пока тихо. Напишите первым.</div>
        ) : msgs.map(m => {
          const c = AV[avIdx(m.name)]
          return (
            <div key={m.id} className={`flex items-end gap-2 ${seen.current.has(m.id) || first.current ? '' : 'anim-in'}`}>
              <Avatar name={m.name} size={26} src={api.chatAvatarUrl(m.uid)} />
              <div className="max-w-[85%] min-w-0 rounded-[14px] rounded-bl-[5px] bg-white/[.07] px-2.5 py-1.5 text-[13.5px] leading-snug">
                <div className="text-[12px] font-semibold mb-px truncate" style={{ color: c[2] }}>{m.name}</div>
                <div className="break-words line-clamp-2">{renderRich(m.text)}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="h-4 mt-2 mb-2.5 px-0.5 flex items-center gap-1.5 text-[12px] text-[#B9B0E6]">
        {typing.length > 0 && <><span className="typing-dots"><i /><i /><i /></span>{typing[0]}{typing.length > 1 ? ` и ещё ${typing.length - 1}` : ''} печатает</>}
      </div>

      <div className="flex items-center justify-between h-[42px] rounded-full pl-3.5 pr-1 bg-white/[.07] border border-white/10 text-[14px] text-[#A99CD9]">
        <span>Написать в чат…</span>
        <span className="w-[34px] h-[34px] rounded-full bg-purple grid place-items-center text-white">
          <Icon name="send" size={16} accent="#fff" style={{ transform: 'translate(-1px,1px)' }} />
        </span>
      </div>
    </div>
  )
}

/* ── Рейтинг недели ── */
const RING: Record<number, string> = {
  1: 'conic-gradient(from 200deg,#FFF0BE,#F5C25A,#C8912B,#FFE08A,#FFF0BE)',
  2: 'conic-gradient(from 200deg,#F4F7FD,#AEB9CF,#7C88A3,#DDE4F2,#F4F7FD)',
  3: 'conic-gradient(from 200deg,#FFD2A8,#D88B4E,#9A5424,#F0B07A,#FFD2A8)',
}
const MEDAL: Record<number, [string, string]> = {
  1: ['linear-gradient(135deg,#FFDF80,#F2B43A 55%,#D9911A)', '#2B1A02'],
  2: ['linear-gradient(180deg,#E3E9F5,#9AA6BF)', '#141A28'],
  3: ['linear-gradient(180deg,#EDB07D,#A8622E)', '#2A1404'],
}

function Seg({ v, u }: { v: number; u: string }) {
  return (
    <span className="flex items-baseline gap-px h-5 px-[5px] rounded-md bg-gold/[.12]" style={{ boxShadow: 'inset 0 1px 0 rgba(255,236,170,.12)' }}>
      <b className="font-display font-semibold text-[11.5px] leading-5 tabular-nums bg-clip-text text-transparent"
        style={{ backgroundImage: 'linear-gradient(180deg,#FFF1C2,#F5C25A)' }}>{v}</b>
      <i className="not-italic text-[9.5px] font-medium text-[#C9B27A]">{u}</i>
    </span>
  )
}

function WeekRating({ c, onOpen, onPlay }: { c: Compete; onOpen?: () => void; onPlay: () => void }) {
  const [left, setLeft] = useState(weekLeft)
  useEffect(() => { const t = window.setInterval(() => setLeft(weekLeft()), 30_000); return () => window.clearInterval(t) }, [])
  const top = c.board_week.slice(0, 3)
  const order = [top[1], top[0], top[2]].filter(Boolean)
  const pos = c.pos_week
  const ahead = pos && pos > 1 ? c.board_week.find(r => r.rank === pos - 1) : undefined
  const gap = ahead ? Math.max(1, ahead.xp - c.week_xp + 1) : 0
  const pct = ahead && ahead.xp > 0 ? Math.min(100, Math.round((c.week_xp / ahead.xp) * 100)) : pos === 1 ? 100 : 0

  return (
    <div className="card-gold px-3.5 pt-4 pb-3.5">
      <button onClick={onOpen} className="w-full flex items-center gap-2.5 text-left">
        <span className="gold-metal sheen sheen-d2 w-[34px] h-[34px] rounded-[11px] grid place-items-center shrink-0">
          <Icon name="crown" size={17} accent="#3A2300" className="relative z-[1]" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-[15px] leading-tight whitespace-nowrap">Рейтинг недели</div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[12px] text-[#CDBB8E]">до финиша</span>
            <span className="flex items-center gap-0.5" aria-label={`До конца недели ${left.d} д ${left.h} ч ${left.min} мин`}>
              <Seg v={left.d} u="д" /><span className="font-display text-[10px] text-gold/50">:</span>
              <Seg v={left.h} u="ч" /><span className="font-display text-[10px] text-gold/50">:</span>
              <Seg v={left.min} u="м" />
            </span>
          </div>
        </div>
        <Icon name="chevR" size={16} className="text-gray2" />
      </button>

      {order.length > 0 ? (
        <div className="grid grid-cols-[1fr_1.15fr_1fr] items-end mt-4 mb-1">
          {[top[1], top[0], top[2]].map((r, i) => r ? (
            <div key={r.rank} className="flex flex-col items-center text-center gap-[3px] min-w-0">
              {r.rank === 1 && <Icon name="crown" size={20} className="text-gold mb-0.5" accent="#F5C25A" />}
              <div className="relative rounded-full p-[3px]" style={{ background: RING[r.rank] }}>
                <div className="rounded-full border-2 border-[#14120A]"><Avatar name={r.name} size={r.rank === 1 ? 60 : 48} /></div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 min-w-[22px] h-[22px] rounded-full grid place-items-center text-[11.5px] font-bold border-2 border-[#14120A]"
                  style={{ background: MEDAL[r.rank][0], color: MEDAL[r.rank][1] }}>{r.rank}</span>
              </div>
              <b className={`mt-1.5 font-semibold truncate max-w-full px-1 ${r.rank === 1 ? 'text-[14.5px]' : 'text-[13px]'} ${r.is_me ? 'text-green' : ''}`}>{r.is_me ? 'Вы' : r.name}</b>
              <small className={`text-[12px] tabular-nums ${r.rank === 1 ? 'text-gold font-semibold' : 'text-gray'}`}>{r.xp.toLocaleString('ru-RU')} XP</small>
              {!!c.week?.prizes?.[r.rank - 1] && <span className="mt-0.5 h-[20px] px-2 rounded-full grid place-items-center text-[10.5px] font-semibold text-gold bg-gold/[.12]">+{c.week.prizes[r.rank - 1]} дн. Premium</span>}
            </div>
          ) : <div key={`e${i}`} />)}
        </div>
      ) : (
        <div className="text-[13px] text-gray text-center py-5">Неделя только началась. Первый урок — и вы в таблице.</div>
      )}

      <div className="relative mt-3.5 rounded-2xl px-3 py-2.5 border border-[rgba(160,135,255,.45)]"
        style={{ background: 'radial-gradient(120% 140% at 0% 0%,rgba(108,76,255,.28),transparent 70%),rgba(255,255,255,.03)' }}>
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full grid place-items-center font-display font-semibold text-[12.5px] bg-purple/20 text-violet tabular-nums shrink-0">{pos ?? '—'}</span>
          <div className="flex-1 min-w-0">
            <b className="text-[14px] font-semibold tabular-nums">Вы · {c.week_xp.toLocaleString('ru-RU')} XP</b>
            <div className="mt-[7px] h-[6px] rounded-full bg-white/[.08] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#6E4CF5,#A58BFF)' }} />
            </div>
          </div>
          <div className="text-right leading-tight shrink-0">
            {ahead ? (<><b className="text-gold text-[14px] tabular-nums">{gap} XP</b><br /><small className="text-[11.5px] text-gray">до {ahead.rank}-го</small></>)
              : pos === 1 ? <small className="text-[12px] text-gold font-semibold">Вы лидер</small>
              : <small className="text-[11.5px] text-gray">вне таблицы</small>}
          </div>
        </div>
      </div>

      <button onClick={onPlay} className="btn-primary w-full mt-2.5 !h-[50px] !justify-start !gap-2.5 pl-2 pr-2">
        <span className="w-[34px] h-[34px] rounded-[11px] bg-[#063A20] grid place-items-center text-[#3CF29E] shrink-0" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,.12)' }}>
          <Icon name="play" size={12} accent="#3CF29E" />
        </span>
        <span className="flex-1 text-left text-[14px]">Пройти урок</span>
        <span className="gold-metal rounded-[10px] h-[30px] px-2.5 grid place-items-center font-display font-semibold text-[12px] text-[#3A2300]" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6),inset 0 -1px 0 rgba(90,50,0,.45)' }}>
          +{gap > 0 && gap <= 200 ? gap : 20} XP
        </span>
      </button>
    </div>
  )
}

export default function HomePage({ onSection, onMaterial, onTabCats, onCompete, onChat }: Props) {
  const [sections, setSections] = useState<Section[]>([])
  const [recent, setRecent] = useState<Material[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [todayCount, setTodayCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [cont, setCont] = useState<ContinueItem[]>([])
  const [name, setName] = useState('')
  const [premium, setPremium] = useState(false)
  const [compete, setCompete] = useState<Compete | null>(null)

  useEffect(() => {
    api.watchContinue().then(d => setCont(d.items ?? [])).catch(() => {})
    api.profile().then(p => { setName((p.name || '').split(' ')[0]); setPremium(!!p.is_premium) }).catch(() => {})
    api.compete().then(setCompete).catch(() => {})
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [d, b, rd] = await Promise.all([
        api.sections().catch(() => ({ sections: [] as Section[] })),
        api.banner().catch(() => ({ banners: [] as Banner[] })),
        api.recent().catch(() => ({ materials: [] as Material[], today_count: 0, today_sections: [], total_count: 0 })),
      ])
      if (!alive) return
      setSections(d.sections.filter(s => !s.parent_id))
      setBanners(b.banners ?? [])
      setRecent((rd.materials ?? []).slice(0, 4))
      setTodayCount(rd.today_count ?? 0)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
    </div>
  )

  const featured = sections.find(s => s.title === FEATURED_TITLE)
  const shelf = sections.filter(s => s !== featured)
  const c0 = cont[0]
  const minute = c0 ? Math.floor(c0.position / 60) : 0
  const playNext = () => { if (c0) onMaterial(c0.id, c0.section_id); else onTabCats() }

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      <div className="px-3.5 pt-1 flex flex-col gap-3">

        {/* Приветствие + продолжить */}
        <div className="card-hero px-[18px] pt-[18px] pb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13.5px] text-gray truncate">{greeting()}{name ? `, ${name}` : ''}</div>
            {premium && <PremiumBadge />}
          </div>
          <h1 className="font-display font-semibold text-[21px] leading-[1.22] mt-1 mb-3.5" style={{ textWrap: 'balance' } as React.CSSProperties}>
            {c0 ? (minute >= 1 ? `Вы на ${minute}-й минуте урока. Продолжим?` : 'Продолжим с того же места?') : 'Чему научимся сегодня?'}
          </h1>
          {c0 ? (
            <button onClick={() => onMaterial(c0.id, c0.section_id)}
              className="w-full flex items-center gap-3 rounded-2xl p-2.5 bg-black/30 border border-white/[.07] text-left active:bg-black/40 transition-colors">
              <span className="w-[58px] h-[58px] rounded-xl grid place-items-center shrink-0" style={{ background: 'linear-gradient(135deg,#0E7A4C,#0A3322)' }}>
                <span className="w-7 h-7 rounded-full bg-green grid place-items-center text-ink"><Icon name="play" size={12} accent="#03200F" /></span>
              </span>
              <span className="flex-1 min-w-0">
                <small className="block text-[12px] text-gray truncate">{c0.section_title}</small>
                <b className="block text-[14px] font-semibold leading-tight truncate">{c0.title}</b>
                {c0.duration > 0 && (
                  <span className="block mt-[7px] h-1 rounded-full bg-white/[.08] overflow-hidden">
                    <span className="block h-full bg-green rounded-full" style={{ width: `${Math.min(100, (c0.position / c0.duration) * 100)}%` }} />
                  </span>
                )}
              </span>
            </button>
          ) : (
            <button onClick={onTabCats} className="btn-primary w-full">Выбрать раздел</button>
          )}
        </div>

        {/* Живой чат */}
        <LiveChat onOpen={onChat} />

        {/* Рейтинг недели */}
        {compete && <WeekRating c={compete} onOpen={onCompete} onPlay={playNext} />}

        {banners.length > 0 && (
          <div className="mt-1"><BannerCard banners={banners} /></div>
        )}

        {/* Разделы — полка обложек */}
        <section className="mt-4">
          <Head title="Разделы" action={`Все ${sections.length}`} onAction={onTabCats} />
          <div className="-mx-3.5 px-3.5 flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {shelf.map(s => (
              <button key={s.id} onClick={() => onSection(s)}
                className={`${coverClass(s)} relative shrink-0 w-[128px] h-[156px] rounded-[20px] p-3 flex flex-col justify-between text-left border border-white/[.07] active:scale-[.98] transition-transform overflow-hidden`}>
                <Icon name={iconNameFor(s.title)} size={30} style={{ color: 'var(--cv)' }} accent="var(--cv)" />
                <span className="min-w-0">
                  <b lang="ru" className="block text-[14.5px] font-semibold leading-tight line-clamp-2 break-words" style={{ hyphens: 'auto' }}>{s.title}</b>
                  {s.description && <small className="block text-[11.5px] opacity-75 mt-0.5 truncate">{s.description}</small>}
                </span>
                {s.locked && <span className="absolute top-3 right-3 opacity-80"><Icon name="lock" size={15} accent="var(--cv)" style={{ color: 'var(--cv)' }} /></span>}
              </button>
            ))}
          </div>
        </section>

        {/* Авторское */}
        {featured && (
          <button onClick={() => onSection(featured)}
            className="w-full rounded-[20px] px-4 py-3.5 flex items-center gap-3 text-left border border-white/[.11] active:opacity-90"
            style={{ background: 'linear-gradient(120deg,rgba(245,194,90,.22),rgba(245,194,90,.04) 60%),#111C17' }}>
            <span className="gold-metal sheen sheen-d1 w-11 h-11 rounded-[14px] grid place-items-center shrink-0">
              <Icon name="mark" size={20} accent="#3A2300" className="relative z-[1]" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[12px] font-semibold text-gold">Авторское</span>
              <b className="block text-[15px] font-semibold truncate">{featured.title}</b>
              <small className="block text-[12.5px] text-gray truncate">Курсы, публикации, фишки</small>
            </span>
            <Icon name="chevR" size={16} className="text-gray2" />
          </button>
        )}

        {/* Новое */}
        {recent.length > 0 && (
          <section className="mt-4">
            <Head title={todayCount > 0 ? 'Новое сегодня' : 'Новое'} action={todayCount > 0 ? `+${todayCount}` : undefined} />
            <div className="list-group">
              {recent.map(m => (
                <button key={m.id} onClick={() => onMaterial(m.id, m.section_id)}
                  className="w-full flex items-center gap-3 px-3.5 py-[11px] text-left active:bg-white/[.04] transition-colors">
                  <MediaTypeIcon type={m.media_type} size={38} radius={11} iconSize={18} />
                  <span className="flex-1 min-w-0">
                    <b className="block text-[14.5px] font-medium truncate"><LevelMark level={(m as { title_level?: string }).title_level} />{m.title}</b>
                    <small className="block text-[12.5px] text-gray truncate">{m.section_title}</small>
                  </span>
                  {m.locked && <PremiumBadge small />}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Реклама — тихая строка */}
        <button
          onClick={() => {
            const tg = (window as any).Telegram?.WebApp
            if (tg?.openTelegramLink) tg.openTelegramLink('https://t.me/S010lvloon_bot')
            else window.open('https://t.me/S010lvloon_bot', '_blank')
          }}
          className="self-start px-1 mt-3 text-[13px] text-gray2 active:text-gray"
        >
          Реклама в базе · <span className="text-gray">@S010lvloon_bot</span>
        </button>
      </div>
    </div>
  )
}
