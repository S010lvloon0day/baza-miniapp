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
}

export default function HomePage({ onSection, onMaterial, onTabCats }: Props) {
  const [sections, setSections] = useState<Section[]>([])
  const [recent, setRecent] = useState<Material[]>([])
  const [banner, setBanner] = useState<Banner | null>(null)
  const [todaySections, setTodaySections] = useState<TodaySection[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [newOpen, setNewOpen] = useState(true)
  const [newExpanded, setNewExpanded] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [d, b, rd] = await Promise.all([
        api.sections().catch(() => ({ sections: [] as Section[] })),
        api.banner().catch(() => ({ banner: null })),
        api.recent().catch(() => ({ materials: [] as Material[], today_count: 0, today_sections: [] as TodaySection[], total_count: 0 })),
      ])
      if (!alive) return
      setSections(d.sections.filter(s => !s.parent_id))
      setBanner(b.banner)
      setRecent((rd.materials ?? []).slice(0, 10))
      setTodaySections(rd.today_sections ?? [])
      setTotalCount(rd.total_count ?? 0)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])


  const openSection = (s: TodaySection) =>
    onSection({ id: s.id, title: s.title, emoji: s.emoji, parent_id: null, description: '', is_premium: 0 })

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto pb-14">
      {/* Hero */}
      <div className="mx-4 mt-3 rounded bg-s1 overflow-hidden relative min-h-[130px] flex items-end">
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 78% 42%, rgba(157,92,255,.28) 0%, transparent 58%), linear-gradient(135deg, rgba(243,199,122,.10), transparent 42%)' }} />
        <div className="absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(rgba(199,166,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(199,166,255,.06) 1px,transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
        <div className="relative z-10 p-5">
          <div className="text-[10px] font-bold tracking-[2px] text-gold uppercase mb-1.5">Premium база знаний</div>
          <div className="font-display text-[22px] tracking-widest text-white leading-tight">
            ЗАЩИЩАЙ ЗНАНИЯ.<br />ЗАЩИЩАЙ СИСТЕМЫ.
          </div>
        </div>
      </div>

      {/* Banner */}
      {banner && <BannerCard banner={banner} />}

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
              <span className="text-[12px] font-bold tracking-[2px] uppercase">Новое</span>
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

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between px-4 pt-5 pb-2.5">
          <span className="text-[12px] font-bold tracking-[2px] uppercase">Категории</span>
        </div>
        <div className="grid grid-cols-4 gap-2 px-4 pb-4">
          {sections.slice(0, 8).map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onSection(s)}
              className="premium-surface border border-bd rounded p-3 flex flex-col items-center gap-1.5 cursor-pointer active:bg-s2 active:border-green"
            >
              <div className="w-10 h-10 bg-s2 rounded-full border border-bd2 flex items-center justify-center text-lg">
                {s.emoji || '📁'}
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-gray text-center leading-tight">
                {s.title}
              </span>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}
