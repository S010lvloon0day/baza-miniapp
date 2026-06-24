import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretRight, CaretDown, Crown } from '@phosphor-icons/react'
import { api } from '../api/client'
import type { Section, Material, Banner, TodaySection } from '../api/client'
import BannerCard from '../components/BannerCard'

interface Props {
  onSection: (s: Section) => void
  onMaterial: (id: number, sectionId: number) => void
  onTabCats: () => void
  onGiveaway: () => void
  showGiveaway: boolean
  botUsername?: string
}

export default function HomePage({ onSection, onMaterial, onTabCats, onGiveaway, showGiveaway, botUsername }: Props) {
  const [sections, setSections] = useState<Section[]>([])
  const [recent, setRecent] = useState<Material[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [todaySections, setTodaySections] = useState<TodaySection[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [newOpen, setNewOpen] = useState(true)
  const [newExpanded, setNewExpanded] = useState(false)
  const [giveawayWinner, setGiveawayWinner] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [d, b, rd, gw] = await Promise.all([
        api.sections().catch(() => ({ sections: [] as Section[] })),
        api.banner().catch(() => ({ banners: [] as Banner[] })),
        api.recent().catch(() => ({ materials: [] as Material[], today_count: 0, today_sections: [] as TodaySection[], total_count: 0 })),
        api.giveawayWinner().catch(() => ({ winner: null })),
      ])
      if (!alive) return
      setSections(d.sections.filter(s => !s.parent_id))
      setBanners(b.banners ?? [])
      setRecent((rd.materials ?? []).slice(0, 10))
      setTodaySections(rd.today_sections ?? [])
      setTotalCount(rd.total_count ?? 0)
      if (gw.winner) setGiveawayWinner(gw.winner.username)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])


  const openSection = (s: TodaySection) =>
    onSection({ id: s.id, title: s.title, emoji: s.emoji, parent_id: null, description: '', is_premium: 0 })

  const openSubmit = () => {
    if (!botUsername) return
    const url = `https://t.me/${botUsername}?start=submit`
    const tg = (window as any).Telegram?.WebApp
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(url)
      tg.close?.()           // сворачиваем мини-апп — юзер уходит в чат с ботом
    } else {
      window.open(url, '_blank')
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto pb-14">
      {/* Hero — terminal window */}
      <div className="mx-4 mt-3 overflow-hidden terminal-glow" style={{ background: '#04040C', border: '1px solid rgba(255,255,255,.09)' }}>
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ background: 'rgba(255,255,255,.04)', borderColor: 'rgba(255,255,255,.06)' }}>
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: '#FF5F57', boxShadow: '0 0 6px rgba(255,95,87,.7)' }} />
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: '#FEBC2E', boxShadow: '0 0 6px rgba(254,188,46,.7)' }} />
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: '#28C840', boxShadow: '0 0 6px rgba(40,200,64,.7)' }} />
          <span className="font-mono text-[10px] text-gray2 flex-1 text-center">knowledge_base.sh — bash — 80×24</span>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          {/* Prompt */}
          <div className="flex items-center gap-1 font-mono text-[11px] mb-2 flex-wrap">
            <span style={{ color: '#28C840' }}>root@s010</span>
            <span className="text-gray2">:</span>
            <span style={{ color: '#60A5FA' }}>~/knowledge</span>
            <span className="text-white/30 mx-0.5">$</span>
            <span className="text-white">./start --secure</span>
          </div>

          {/* Slogan */}
          <div className="font-display text-[19px] tracking-widest text-white leading-[1.2] mb-1">
            ЗНАНИЯ — СИЛА.
          </div>
          <div className="font-mono text-[10px] text-gray2 mb-3">S010lvloon mode</div>

          {/* Output */}
          <div className="space-y-1 font-mono text-[10px]">
            <div className="flex gap-2">
              <span style={{ color: '#60A5FA' }}>[INIT]</span>
              <span className="text-gray2">Подключение к базе знаний...</span>
            </div>
            <div className="flex gap-2">
              <span style={{ color: '#FBBF24' }}>[AUTH]</span>
              <span className="text-gray2">Авторизация пользователя</span>
            </div>
            <div className="flex gap-2">
              <span style={{ color: '#28C840' }}>[&nbsp;OK&nbsp;]</span>
              <span className="text-white/50">Система готова</span>
              <span className="blink text-white ml-0.5">█</span>
            </div>
          </div>
        </div>
      </div>

      {/* Предложить материал — компактная терминальная строка в стиле hero,
          открывает бота с готовым флоу подачи (выше баннера, без перегруза) */}
      {botUsername && (
        <div
          onClick={openSubmit}
          className="mx-4 mt-2.5 flex items-center gap-2 px-3.5 py-2.5 cursor-pointer font-mono text-[11px] active:opacity-70 transition-opacity"
          style={{ background: 'rgba(40,200,64,.04)', border: '1px dashed rgba(40,200,64,.4)' }}
        >
          <span className="shrink-0 font-bold" style={{ color: '#28C840' }}>+</span>
          <span className="shrink-0 text-white/85">./contribute</span>
          <span className="flex-1 truncate text-white/90">— предложить материал в базу</span>
          <span className="shrink-0 font-bold" style={{ color: 'rgba(40,200,64,.9)' }}>›</span>
        </div>
      )}

      {/* Banner carousel */}
      {banners.length > 0 && <BannerCard banners={banners} />}

      {/* Giveaway card — показывается только когда квест разрешён (включён / админ) */}
      {showGiveaway && (giveawayWinner ? (
        <div
          onClick={onGiveaway}
          className="relative mx-4 mt-3 cursor-pointer overflow-hidden active:opacity-75 transition-opacity"
          style={{ background: 'rgba(255,188,46,.04)', border: '1px solid rgba(255,188,46,.25)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,188,46,.6), transparent)' }} />
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="text-2xl shrink-0">🏆</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-white">Case002 — квест открыт</div>
              <div className="text-[10px] font-mono" style={{ color: 'rgba(255,188,46,.75)' }}>// приз выдан победителю @{giveawayWinner} · проходи квест</div>
            </div>
            <span className="font-bold text-[18px] shrink-0" style={{ color: 'rgba(255,188,46,.75)' }}>›</span>
          </div>
        </div>
      ) : (
        <div
          onClick={onGiveaway}
          className="relative mx-4 mt-3 cursor-pointer overflow-hidden active:opacity-75 transition-opacity"
          style={{ background: 'rgba(157,92,255,.06)', border: '1px solid rgba(157,92,255,.3)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(157,92,255,.7), transparent)' }} />
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="text-2xl shrink-0">🕵️</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-white">Case002</div>
              <div className="text-[10px] font-mono" style={{ color: 'rgba(199,166,255,.65)' }}>// расследование · 7 этапов · приз: [REDACTED]</div>
            </div>
            <span className="font-bold text-[18px] shrink-0" style={{ color: '#C7A6FF' }}>›</span>
          </div>
        </div>
      ))}

      {/* Recent */}
      {(totalCount > 0 || recent.length > 0) && (
        <section>
          <div
            className="flex items-center justify-between px-4 pt-5 pb-3 cursor-pointer select-none"
            onClick={() => setNewOpen(o => !o)}
          >
            <div className="flex items-center gap-1.5">
              <motion.span
                animate={{ rotate: newOpen ? 0 : -90 }}
                transition={{ duration: 0.2 }}
                className="text-gray"
              >
                <CaretDown size={13} weight="bold" />
              </motion.span>
              <span className="text-[11px] font-mono tracking-[1px] text-green/80">// НОВОЕ</span>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onTabCats() }}
              className="flex items-center gap-0.5 text-green text-[11px] tracking-wide"
            >
              Смотреть все <CaretRight size={13} weight="bold" />
            </button>
          </div>

          {/* Сводная карточка */}
          <AnimatePresence initial={false}>
          {newOpen && <motion.div
            key="new-card"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
          <div
            className="mx-4 mb-3 rounded border border-bd2 bg-s2 relative"
            style={{ maxHeight: newExpanded ? 'none' : 165, overflow: 'hidden' }}
          >
            {/* Общий счётчик + за сутки */}
            <div className="px-4 pt-4 pb-3 border-b border-bd flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold tracking-[2px] uppercase text-gray mb-1">
                  Всего материалов
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[28px] font-bold text-white leading-none">{totalCount}</span>
                </div>
              </div>
            </div>

            {/* Последние 10 материалов */}
            {recent.length > 0 && (
              <div className="border-b border-bd">
                <div className="px-4 pt-3 pb-1.5">
                  <div className="text-[10px] font-bold tracking-[2px] uppercase text-green">
                    Последние добавленные
                  </div>
                </div>
                {recent.map((m, i) => (
                  <div
                    key={m.id}
                    onClick={() => onMaterial(m.id, m.section_id)}
                    className={`px-4 py-2 flex items-center gap-2 cursor-pointer active:bg-s1 ${i < recent.length - 1 ? 'border-b border-bd/50' : ''}`}
                  >
                    <span className="text-base shrink-0">{m.section_emoji || '📁'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-gray2 leading-none mb-0.5 truncate">{m.section_title}</div>
                      <div className="text-[13px] font-medium text-white leading-snug truncate">{m.title}</div>
                    </div>
                    {m.locked && (
                      <Crown size={14} weight="fill" className="shrink-0 text-violet opacity-80" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Разделы за сутки */}
            {todaySections.length > 0 && (
              <div className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {todaySections.map(s => (
                    <button
                      key={s.id}
                      onClick={() => openSection(s)}
                      className="flex items-center gap-1 px-2 py-0.5 bg-s1 border border-bd2 rounded-full text-[11px] text-gray whitespace-nowrap active:border-green active:text-green transition-colors"
                    >
                      <span>{s.emoji}</span>
                      <span>{s.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Градиент-подсказка «раскрыть» */}
            {!newExpanded && (
              <div
                onClick={() => setNewExpanded(true)}
                className="absolute bottom-0 inset-x-0 h-10 flex items-end justify-center pb-1.5 cursor-pointer"
                style={{ background: 'linear-gradient(to top, #1B1728 30%, transparent)' }}
              >
                <CaretDown size={14} weight="bold" className="text-gray opacity-70" />
              </div>
            )}
          </div>
          </motion.div>}
          </AnimatePresence>
        </section>
      )}

      {/* Featured — авторский раздел S010lvloon */}
      {sections.find(s => s.title === 'Знания S010lvloon') && (() => {
        const featured = sections.find(s => s.title === 'Знания S010lvloon')!
        return (
          <div
            onClick={() => onSection(featured)}
            className="relative mx-4 mt-4 cursor-pointer overflow-hidden rounded-md active:opacity-80 transition-opacity"
            style={{
              background: 'linear-gradient(135deg, rgba(255,188,46,.12), rgba(255,140,0,.05))',
              border: '1px solid rgba(255,188,46,.45)',
              boxShadow: '0 0 22px rgba(255,188,46,.12)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,188,46,.8), transparent)' }} />
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'rgba(255,188,46,.14)', border: '1px solid rgba(255,188,46,.35)' }}>
                {featured.emoji || '🧠'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 mb-1 rounded-sm" style={{ background: 'rgba(255,188,46,.18)' }}>
                  <span className="text-[8px] font-bold tracking-[2px] uppercase" style={{ color: '#FFBC2E' }}>★ Автор</span>
                </div>
                <div className="text-[14px] font-bold text-white leading-tight truncate">{featured.title}</div>
                <div className="text-[10px] font-mono mt-0.5 truncate" style={{ color: 'rgba(255,188,46,.7)' }}>// курс · публикации · фишки</div>
              </div>
              <span className="font-bold text-[20px] shrink-0" style={{ color: '#FFBC2E' }}>›</span>
            </div>
          </div>
        )
      })()}

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between px-4 pt-5 pb-2.5">
          <span className="text-[11px] font-mono tracking-[1px] text-green/80">// КАТЕГОРИИ</span>
        </div>
        <div className="grid grid-cols-4 gap-2 px-4 pb-4">
          {sections.filter(s => s.title !== 'Знания S010lvloon').slice(0, 8).map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onSection(s)}
              className="relative border border-bd p-3 flex flex-col items-center gap-1.5 cursor-pointer overflow-hidden transition-colors active:border-white/40 active:bg-white/[.03]"
            style={{ background: 'rgba(255,255,255,.02)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.1), transparent)' }} />
              <span className="absolute top-1.5 left-1.5 font-mono text-[8px] text-gray2/60 leading-none tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="w-10 h-10 flex items-center justify-center text-xl">
                {s.emoji || '📁'}
              </div>
              <span className="text-[9px] font-mono uppercase tracking-[0.5px] text-gray text-center leading-tight w-full line-clamp-2">
                {s.title}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Ad contact */}
      <div className="px-4 pb-6 pt-1">
        <button
          onClick={() => {
            const tg = (window as any).Telegram?.WebApp
            if (tg?.openTelegramLink) tg.openTelegramLink('https://t.me/S010lvloon_bot')
            else window.open('https://t.me/S010lvloon_bot', '_blank')
          }}
          className="w-full flex items-center justify-center gap-2 h-10 rounded border border-bd2 bg-s1 active:border-green active:bg-s2 transition-colors"
        >
          <span className="text-[13px]">📣</span>
          <span className="text-[11px] font-semibold tracking-[1px] uppercase text-gray2">
            По вопросам рекламы
          </span>
          <span className="text-[11px] text-green font-bold">@S010lvloon_bot</span>
        </button>
      </div>
    </div>
  )
}
