import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BookmarkSimple, CaretRight, Image, Video, File, Article, Lock } from '@phosphor-icons/react'
import { api } from '../api/client'
import type { Section, Material } from '../api/client'
import { isBookmarked, saveBookmark, removeBookmark } from '../store/bookmarks'

interface Props {
  onSection: (s: Section) => void
  onMaterial: (id: number, sectionId: number) => void
  onTabCats: () => void
}

export default function HomePage({ onSection, onMaterial, onTabCats }: Props) {
  const [sections, setSections] = useState<Section[]>([])
  const [recent, setRecent] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const d = await api.sections().catch(() => ({ sections: [] as Section[] }))
      if (!alive) return
      const roots = d.sections.filter(s => !s.parent_id)
      setSections(roots)
      if (roots.length) {
        const md = await api.materials(roots[0].id, 0).catch(() => ({ materials: [] as Material[], total: 0 }))
        if (alive) setRecent(md.materials.slice(0, 3))
      }
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

      {/* Recent */}
      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between px-4 pt-5 pb-2.5">
            <span className="text-[12px] font-bold tracking-[2px] uppercase">Новое</span>
            <button onClick={onTabCats} className="flex items-center gap-0.5 text-green text-[11px] tracking-wide">
              Смотреть все <CaretRight size={13} weight="bold" />
            </button>
          </div>
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
