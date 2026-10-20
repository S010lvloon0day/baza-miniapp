import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import lottie from 'lottie-web'
import { inflate as pakoInflate } from 'pako'
import { Crown, CaretDown } from '@phosphor-icons/react'
import { api } from '../api/client'
import MediaTypeIcon from '../components/MediaTypeIcon'
import type { Section, Material, Banner, ContinueItem } from '../api/client'
import { fmtTime } from '../hooks/useResume'
import BannerCard from '../components/BannerCard'
import CategoryIcon from '../components/CategoryIcon'
import BazaMark from '../components/BazaMark'

interface Props {
  onSection: (s: Section) => void
  onMaterial: (id: number, sectionId: number) => void
  onTabCats: () => void
  onSubmit?: () => void
  onCompete?: () => void
  onChat?: () => void
}

/** Кастом-эмодзи в превью чата (анимация/видео/картинка). */
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
  const st = { display: 'inline-block', width: 15, height: 15, verticalAlign: '-0.2em', objectFit: 'contain' as const }
  if (k === 'a') return <span ref={ref} style={st} />
  if (k === 'v') return <video src={url} autoPlay loop muted playsInline style={st} />
  return <img src={url} alt="" style={st} />
}

function renderHero(text: string) {
  const re = /\{e:([avi]):([A-Za-z0-9_#-]+)\}/g
  const out: any[] = []; let last = 0, m: RegExpExecArray | null, key = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<span key={key++}>{text.slice(last, m.index)}</span>)
    if (m[2].indexOf('#') >= 0) out.push(<span key={key++}>🙂</span>)
    else out.push(<HeroEmoji key={key++} k={m[1]} fid={m[2]} />)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(<span key={key++}>{text.slice(last)}</span>)
  return out
}

/** Живой мини-чат прямо в геро-окне: последние сообщения + онлайн, тикает каждые ~3.5с. */
function HeroChat({ onOpen }: { onOpen?: () => void }) {
  const [state, setState] = useState<{ online: number; msgs: { id: number; name: string; text: string }[] }>({ online: 0, msgs: [] })
  useEffect(() => {
    let alive = true
    const load = () => api.chat().then(r => {
      if (!alive) return
      const msgs = r.messages.filter(m => !m.deleted).slice(-4)
        .map(m => ({ id: m.id, name: m.name, text: m.text || (m.has_media ? '📎 вложение' : '') }))
      setState({ online: r.online, msgs })
    }).catch(() => {})
    load()
    const t = window.setInterval(load, 3500)
    return () => { alive = false; window.clearInterval(t) }
  }, [])
  return (
    <div className="relative mb-1">
      <div className="rounded-2xl px-3.5 py-3 mb-3" style={{ background: 'rgba(0,0,0,.4)', border: '1px solid rgba(74,232,133,.28)' }}>
        <div className="flex items-center gap-1.5 mb-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green" />
          </span>
          <span className="text-[10.5px] font-bold uppercase tracking-[1px] text-green">Чат базы · live · онлайн {state.online}</span>
        </div>
        {state.msgs.length === 0 ? (
          <div className="text-[12.5px] text-[#9a9aa2] py-1">Пока тихо — будь первым, поздоровайся 👋</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {state.msgs.map(m => (
              <div key={m.id} className="text-[12.5px] leading-snug truncate">
                <span className="font-bold text-green">{m.name}:</span>{' '}
                <span className="text-[#d4d4d8]">{renderHero(m.text)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <button onClick={onOpen}
        className="relative w-full overflow-hidden flex items-center justify-center gap-2 py-3 rounded-[14px] text-white text-[13.5px] font-extrabold transition active:scale-[.985]"
        style={{ background: 'linear-gradient(135deg,#17a34a 0%,#0f8a3e 48%,#0a6a2f 100%)', border: '1px solid rgba(120,255,170,.3)', boxShadow: '0 10px 24px rgba(8,100,44,.45), inset 0 1px 0 rgba(255,255,255,.16)' }}>
        <span className="pointer-events-none absolute inset-0 opacity-70" style={{ background: 'radial-gradient(140px 50px at 22% -30%, rgba(255,255,255,.3), transparent 70%)' }} />
        <span className="relative z-10 flex items-center gap-2">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          Открыть чат
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </button>
    </div>
  )
}

function CompeteCard({ onOpen }: { onOpen?: () => void }) {
  const [c, setC] = useState<import('../api/client').Compete | null>(null)
  useEffect(() => { api.compete().then(setC).catch(() => {}) }, [])
  if (!c) return null
  const topName = c.board_week[0]?.name || c.board_all[0]?.name
  return (
    <div
      onClick={onOpen}
      className="relative mb-5 cursor-pointer overflow-hidden rounded-[18px] px-4 py-3.5 transition-transform duration-150 active:-translate-y-0.5"
      style={{ border: '1px solid rgba(74,232,133,.4)', background: 'radial-gradient(120% 120% at 0% 0%, rgba(34,197,94,.16), transparent 60%), #0D0D11', boxShadow: '0 0 22px rgba(34,197,94,.1)' }}
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0 text-[26px]">{c.rank.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-extrabold text-white">Рейтинг базы</span>
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-green">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green" />
              </span>
              сегодня учатся {c.today_active}
            </span>
          </div>
          <div className="text-[11.5px] text-[#9a9aa2] truncate mt-0.5">
            Ты {c.pos_all ? `${c.pos_all}-й` : 'ещё не в топе'} · {c.xp} XP{topName ? ` · лидер: ${topName}` : ''}
          </div>
        </div>
        <span className="font-extrabold text-[18px] shrink-0 text-green">›</span>
      </div>
    </div>
  )
}

export default function HomePage({ onSection, onMaterial, onTabCats, onCompete, onChat }: Props) {
  const [sections, setSections] = useState<Section[]>([])
  const [recent, setRecent] = useState<Material[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [newOpen, setNewOpen] = useState(true)
  const [cont, setCont] = useState<ContinueItem[]>([])

  useEffect(() => {
    api.watchContinue().then(d => setCont(d.items ?? [])).catch(() => {})
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
      setTotalCount(rd.total_count ?? 0)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  // Раньше кнопка выкидывала человека в чат с ботом. Теперь форма открывается
  // прямо здесь — уходить из приложения, чтобы что-то предложить, незачем.

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
    </div>
  )

  const featured = sections.find(s => s.title === 'Знания S010lvloon')

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      <div className="px-4 pt-3">

        {/* Hero */}
        <div
          className="relative overflow-hidden rounded-[22px] px-5 pt-6 pb-6 mb-5"
          style={{ border: '1px solid rgba(255,255,255,.08)', background: 'radial-gradient(120% 100% at 100% 0%, rgba(34,197,94,.14), transparent 55%), #0D0D11' }}
        >
          {/* Decorative orbit rings + particles */}
          <svg width="260" height="260" viewBox="0 0 260 260" fill="none" className="absolute pointer-events-none" style={{ right: -70, top: -60, opacity: .5 }}>
            <circle cx="130" cy="130" r="90" stroke="#22C55E" strokeOpacity=".18" strokeWidth="1" />
            <circle cx="130" cy="130" r="115" stroke="#22C55E" strokeOpacity=".1" strokeWidth="1" />
            <circle cx="215" cy="60" r="3" fill="#4AE885" fillOpacity=".6" />
            <circle cx="240" cy="130" r="2" fill="#4AE885" fillOpacity=".5" />
            <circle cx="190" cy="20" r="2" fill="#4AE885" fillOpacity=".5" />
          </svg>
          {/* Diamond watermark */}
          <div className="absolute pointer-events-none" style={{ right: 6, top: 26, opacity: .06 }}>
            <BazaMark size={150} color="#fff" />
          </div>
          {/* Animated light streak */}
          <svg width="140" height="220" viewBox="0 0 140 220" fill="none" className="absolute pointer-events-none" style={{ right: 14, top: -10 }}>
            <path d="M110 0 C90 60 130 110 100 220" stroke="#4AE885" strokeWidth="2" strokeLinecap="round" opacity=".3" />
            <path
              d="M110 0 C90 60 130 110 100 220"
              stroke="#9FFFC2" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="40 260"
              style={{ filter: 'drop-shadow(0 0 6px rgba(74,232,133,.85))', animation: 'bazaLinePulse 2.6s linear infinite' }}
            />
          </svg>
          <div className="baza-grain" />

          <div className="relative uppercase mb-2.5" style={{ fontFamily: "'Anton', sans-serif", fontSize: 35, lineHeight: 1.12, letterSpacing: '-1.6px' }}>
            <span
              className="relative inline-block"
              style={{ color: '#fff', WebkitTextStroke: '1.9px #fff', textShadow: '1px 2px 0 rgba(0,0,0,.55), -1px 0 0 rgba(0,0,0,.15), 0 -1px 0 rgba(255,255,255,.5)' }}
            >
              Все материалы
            </span>
            <br />
            <span
              className="relative inline-block baza-flicker"
              style={{ color: '#3EEB73', WebkitTextStroke: '1.9px #3EEB73', textShadow: '0 0 1px #7dffab, 0 0 3px rgba(62,235,115,.4), 0 0 5px rgba(62,235,115,.25)' }}
            >
              в одном месте
            </span>
          </div>
          <div className="relative text-[13px] text-[#9a9aa2] leading-relaxed mb-4 max-w-[270px]">
            Гайды, инструменты, разборы — и живой чат базы прямо здесь.
          </div>

          <HeroChat onOpen={onChat} />
        </div>

        {/* Рейтинг базы — соревнование и «ты не один» */}
        <CompeteCard onOpen={onCompete} />

        {/* Banner slot */}
        {banners.length > 0 && (
          <div className="rounded-[18px] overflow-hidden mb-5" style={{ border: '1px solid rgba(255,255,255,.08)' }}>
            <BannerCard banners={banners} />
          </div>
        )}

        {/* Featured — авторский раздел S010lvloon: выше «Последних добавленных» */}
        {featured && (
            <div
              onClick={() => onSection(featured)}
              className="relative mb-5 cursor-pointer overflow-hidden rounded-md active:opacity-80 transition-opacity"
              style={{
                background: 'linear-gradient(135deg, rgba(255,188,46,.12), rgba(255,140,0,.05))',
                border: '1px solid rgba(255,188,46,.45)',
                boxShadow: '0 0 22px rgba(255,188,46,.12)',
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,188,46,.8), transparent)' }} />
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,188,46,.14)', border: '1px solid rgba(255,188,46,.35)', color: '#FFCB57' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ filter: 'drop-shadow(0 0 5px rgba(255,188,46,.9))' }}>
                    <path d="M12 2l2.6 6.6L21 9l-5 4.3L17.5 20 12 16.3 6.5 20 8 13.3 3 9l6.4-.4z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 mb-1 rounded-sm" style={{ background: 'rgba(255,188,46,.18)' }}>
                    <span className="text-[8px] font-bold tracking-[2px] uppercase" style={{ color: '#FFBC2E' }}>★ Автор</span>
                  </div>
                  <div className="text-[14px] font-bold text-white leading-tight truncate">{featured.title}</div>
                  <div className="text-[10px] font-mono mt-0.5 truncate" style={{ color: 'rgba(255,188,46,.7)' }}>курс · публикации · фишки</div>
                </div>
                <span className="font-bold text-[20px] shrink-0" style={{ color: '#FFBC2E' }}>›</span>
              </div>
            </div>
        )}

        {/* Продолжить просмотр */}
        {cont.length > 0 && (
          <>
            <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#9a9aa2] font-mono mb-3">
              Продолжить просмотр
            </div>
            <div className="rounded-2xl mb-7 overflow-hidden" style={{ border: '1px solid rgba(255,255,255,.08)', background: '#101014' }}>
              {cont.map(c => (
                <div
                  key={c.id}
                  onClick={() => onMaterial(c.id, c.section_id)}
                  className="flex items-center gap-3 px-[18px] py-3 cursor-pointer transition-colors duration-150 active:bg-white/[.04]"
                >
                  <MediaTypeIcon type="video" size={36} radius={10} iconSize={16} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-[#8a8a93] mb-0.5 truncate">{c.section_title}</div>
                    <div className="text-[14px] font-semibold truncate">{c.title}</div>
                    {c.duration > 0 && (
                      <div className="mt-1.5 h-[3px] rounded-full bg-white/[.08] overflow-hidden">
                        <div className="h-full bg-green" style={{ width: `${Math.min(100, (c.position / c.duration) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-[#8a8a93] font-mono shrink-0">{fmtTime(c.position)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Новое — collapsible */}
        <div onClick={() => setNewOpen(o => !o)} className="flex items-center justify-between mb-3 cursor-pointer">
          <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-[1.5px] uppercase text-[#9a9aa2] font-mono">
            <motion.span animate={{ rotate: newOpen ? 0 : -90 }} transition={{ duration: 0.2 }} className="flex">
              <CaretDown size={12} weight="bold" />
            </motion.span>
            Новое
          </span>
          <button onClick={e => { e.stopPropagation(); onTabCats() }} className="text-white text-[12px] font-bold active:opacity-70 transition-opacity">
            Смотреть все ›
          </button>
        </div>

        {newOpen && (
          <div className="rounded-2xl mb-7 overflow-hidden" style={{ border: '1px solid rgba(255,255,255,.08)', background: '#101014' }}>
            <div className="px-[18px] py-4" style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
              <div className="text-[10px] font-bold tracking-[1.2px] uppercase mb-1.5" style={{ color: '#7a7a83' }}>Всего материалов</div>
              <div className="text-[32px] font-extrabold text-white">{totalCount}</div>
            </div>
            {recent.length > 0 && (
              <>
                <div className="px-[18px] pt-3.5 pb-1.5 text-[10px] font-bold tracking-[1.2px] uppercase" style={{ color: '#7a7a83' }}>Последние добавленные</div>
                <div className="flex flex-col">
                  {recent.map(m => (
                    <div
                      key={m.id}
                      onClick={() => onMaterial(m.id, m.section_id)}
                      className="flex items-center gap-3 px-[18px] py-3 cursor-pointer transition-colors duration-150 active:bg-white/[.04]"
                    >
                      <MediaTypeIcon type={m.media_type} size={36} radius={10} iconSize={16} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-[#8a8a93] mb-0.5 truncate">{m.section_title}</div>
                        <div className="text-[14px] font-semibold truncate">{m.title}</div>
                      </div>
                      {m.locked && <Crown size={14} weight="fill" className="shrink-0 text-violet opacity-80" />}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Categories */}
        <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#9a9aa2] mb-3.5">Разделы</div>
        <div className="grid grid-cols-4 gap-2 pb-4">
          {sections.filter(s => s.title !== 'Знания S010lvloon').slice(0, 8).map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onSection(s)}
              className="relative rounded-2xl p-3 flex flex-col items-center gap-1.5 cursor-pointer overflow-hidden transition-transform duration-150 active:-translate-y-0.5 active:border-green/50"
              style={{ border: '1px solid rgba(255,255,255,.09)', background: 'radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,.05), transparent 60%), #101014' }}
            >
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.14), transparent)' }} />
              <span className="absolute top-1.5 left-1.5 font-mono text-[8px] text-gray2/60 leading-none tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="w-10 h-10 flex items-center justify-center">
                <CategoryIcon title={s.title} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-[0.3px] text-[#d4d4d8] text-center leading-tight w-full line-clamp-2">
                {s.title}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Ad contact */}
        <div
          onClick={() => {
            const tg = (window as any).Telegram?.WebApp
            if (tg?.openTelegramLink) tg.openTelegramLink('https://t.me/S010lvloon_bot')
            else window.open('https://t.me/S010lvloon_bot', '_blank')
          }}
          className="relative mb-6 flex items-center gap-3.5 cursor-pointer overflow-hidden rounded-2xl transition-transform duration-150 active:-translate-y-0.5"
          style={{
            padding: '14px 16px',
            border: '1px solid rgba(255,188,46,.4)',
            background: 'linear-gradient(135deg,rgba(255,188,46,.1),rgba(20,15,4,.4) 60%)',
            boxShadow: '0 8px 20px rgba(255,140,0,.08)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,188,46,.6),transparent)' }} />
          <div
            className="shrink-0 flex items-center justify-center"
            style={{ width: 40, height: 40, borderRadius: 12, background: 'radial-gradient(circle,rgba(255,188,46,.32),rgba(255,188,46,.06) 68%,transparent)', boxShadow: '0 0 16px rgba(255,188,46,.35)', color: '#FFCB57' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11v2a2 2 0 0 0 2 2h2l4 4V5L7 9H5a2 2 0 0 0-2 2z" />
              <path d="M16 8a4 4 0 0 1 0 8" />
              <path d="M18.5 5.5a8 8 0 0 1 0 13" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: '#FFCB57' }}>По вопросам рекламы</div>
            <div className="text-[13px] font-semibold text-white mt-0.5">@S010lvloon_bot</div>
          </div>
          <span className="font-extrabold text-[18px] shrink-0" style={{ color: '#FFCB57' }}>›</span>
        </div>
      </div>
    </div>
  )
}
