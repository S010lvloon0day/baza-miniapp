import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BookmarkSimple, CaretRight, Image, Video, File, Article, Lock, Sparkle } from '@phosphor-icons/react'
import { api } from '../api/client'
import type { Section, Material, Banner, TodaySection } from '../api/client'
import { isBookmarked, saveBookmark, removeBookmark } from '../store/bookmarks'
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
  const [todayCount, setTodayCount] = useState(0)
  const [todaySections, setTodaySections] = useState<TodaySection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [d, b, rd] = await Promise.all([
        api.sections().catch(() => ({ sections: [] as Section[] })),
        api.banner().catch(() => ({ banner: null })),
        api.recent().catch(() => ({ materials: [] as Material[], today_count: 0, today_sections: [] as TodaySection[] })),
      ])
      if (!alive) return
      setSections(d.sections.filter(s => !s.parent_id))
      setBanner(b.banner)
      setRecent((rd.materials ?? []).slice(0, 5))
      setTodayCount(rd.today_count ?? 0)
      setTodaySections(rd.today_sections ?? [])
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  const [bms, setBms] = useState<Set<number>>(new Set())
  const toggleBm = (id: number) => {
    if (isBookmarked(id)) { removeBookmark(id); setBms(p => { const n = new Set(p); n.delete(id); return n }) }
    else                  { saveBookmark(id);   setBms(p => new Set(p).add(id)) }
  }

  const TypeIcon = ({ t }: { t: string }) => {
    const props = { size: 22, weight: 'duotone' as const, className: 'text-green' }
    if (t === 'photo')    return <Image    {...props} />
    if (t === 'video')    return <Video    {...props} />
    if (t === 'text')     return <Article  {...props} />
    return <File {...props} />
  }
  const typeLabel = (t: string) => ({ photo:'ФОТО', video:'ВИДЕО', document:'ДОКУМЕНТ', text:'ТЕКСТ' }[t] ?? t.toUpperCase())

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
      {recent.length > 0 && (
        <section>
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-5 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold tracking-[2px] uppercase">Новое</span>
              {todayCount > 0 && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green/10 border border-green/25 rounded text-[10px] font-bold text-green tracking-wide">
                  <Sparkle size={10} weight="fill" />
                  +{todayCount} за сутки
                </span>
              )}
            </div>
            <button onClick={onTabCats} className="flex items-center gap-0.5 text-green text-[11px] tracking-wide">
              Смотреть все <CaretRight size={13} weight="bold" />
            </button>
          </div>

          {/* Сводка за сутки */}
          {todayCount > 0 && (
            <div className="mx-4 mb-3 p-3 bg-s2 border border-bd2 rounded">
              <div className="text-[11px] text-gray mb-2">
                Добавлено <span className="text-white font-bold">{todayCount}</span> {todayCount === 1 ? 'материал' : todayCount < 5 ? 'материала' : 'материалов'} в разделы:
              </div>
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

          {/* Materials list */}
          <div className="mx-4 rounded overflow-hidden flex flex-col gap-px bg-bd">
            {recent.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => onMaterial(m.id, m.section_id)}
                className="bg-s1 flex items-center gap-3 px-3.5 py-3 cursor-pointer active:bg-s2"
              >
                <div className="w-11 h-11 bg-s2 rounded flex items-center justify-center border border-bd2 shrink-0">
                  <TypeIcon t={m.media_type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-white leading-snug line-clamp-2 mb-1">
                    {m.locked && <Lock size={12} weight="fill" className="inline mr-1 text-gray" />}
                    {m.title}
                  </div>
                  <div className="text-[11px] text-gray">{typeLabel(m.media_type)}</div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); toggleBm(m.id) }}
                  className={`p-1 shrink-0 transition-colors ${(bms.has(m.id) || isBookmarked(m.id)) ? 'text-green' : 'text-gray2'}`}
                >
                  <BookmarkSimple size={19} weight={(bms.has(m.id) || isBookmarked(m.id)) ? 'fill' : 'regular'} />
                </button>
              </motion.div>
            ))}
          </div>
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
