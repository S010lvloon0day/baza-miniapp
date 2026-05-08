import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Image, Video, File, Article, Lock } from '@phosphor-icons/react'
import { api } from '../api/client'
import type { Section, Material } from '../api/client'

const ITEMS_PER_PAGE = 10

interface Props {
  section: Section
  onMaterial: (id: number, sectionId: number) => void
  onSubsection: (s: Section) => void
}

const typeLabel = (t: string) => ({ photo:'ФОТО', video:'ВИДЕО', document:'ДОКУМЕНТ', text:'ТЕКСТ' }[t] ?? t.toUpperCase())
const TypeIcon = ({ t }: { t: string }) => {
  const props = { size: 22, weight: 'duotone' as const, className: 'text-green' }
  if (t === 'photo')  return <Image   {...props} />
  if (t === 'video')  return <Video   {...props} />
  if (t === 'text')   return <Article {...props} />
  return <File {...props} />
}

export default function SectionPage({ section, onMaterial, onSubsection }: Props) {
  const [subs, setSubs] = useState<Section[]>([])
  const [mats, setMats] = useState<Material[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setPage(0); setLoading(true)
    Promise.all([
      api.subsections(section.id).catch(() => ({ sections: [] as Section[] })),
      api.materials(section.id, 0).catch(() => ({ materials: [] as Material[], total: 0 })),
    ]).then(([sd, md]) => {
      setSubs(sd.sections)
      setMats(md.materials)
      setTotal(md.total)
    }).finally(() => setLoading(false))
  }, [section.id])

  const loadPage = async (p: number) => {
    setLoading(true)
    const md = await api.materials(section.id, p).catch(() => ({ materials: [] as Material[], total: 0 }))
    setMats(md.materials); setPage(p); setLoading(false)
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE) || 1

  return (
    <div className="flex-1 overflow-y-auto pb-14">
      {/* Section header card */}
      <div className="mx-4 mt-3 mb-1 p-4 premium-surface border border-bd rounded flex gap-3.5 items-start">
        <div className="w-14 h-14 bg-[rgba(157,92,255,.10)] border border-[rgba(199,166,255,.25)] rounded flex items-center justify-center text-[26px] shrink-0">
          {section.emoji || '📁'}
        </div>
        <div>
          <div className="font-display text-[22px] tracking-[2px] uppercase leading-tight mb-1.5">
            {section.title}
          </div>
          {section.description && (
            <div className="text-[12px] text-gray leading-relaxed">{section.description}</div>
          )}
        </div>
      </div>

      {/* Subsections */}
      {subs.length > 0 && (
        <section>
          <div className="px-4 pt-4 pb-2 text-[11px] font-bold tracking-[2px] uppercase text-white">Подразделы</div>
          <div className="grid grid-cols-4 gap-2 px-4 pb-2">
            {subs.map(s => (
              <div key={s.id} onClick={() => onSubsection(s)}
                className="premium-surface border border-bd rounded p-3 flex flex-col items-center gap-1.5 cursor-pointer active:bg-s2 active:border-green">
                <div className="w-10 h-10 bg-s2 rounded-full border border-bd2 flex items-center justify-center text-lg">
                  {s.emoji || '📁'}
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-[.5px] text-gray text-center leading-tight">{s.title}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Materials */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
        </div>
      ) : mats.length > 0 ? (
        <section>
          <div className="flex items-center justify-between px-4 pt-4 pb-2.5">
            <span className="text-[11px] font-bold tracking-[2px] uppercase text-gray">{total} материалов</span>
          </div>
          <div className="mx-4 flex flex-col divide-y divide-bd">
            {mats.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onMaterial(m.id, section.id)}
                className="flex items-center gap-2.5 py-3.5 cursor-pointer active:bg-s2 -mx-4 px-4"
              >
                <div className="dot-glow ml-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-white leading-snug line-clamp-2 mb-1">
                    {m.locked && <Lock size={12} weight="fill" className="inline mr-1 text-gray" />}
                    {m.title}
                  </div>
                  <div className="text-[11px] text-gray flex items-center gap-1.5">
                    {typeLabel(m.media_type)}
                    {!!m.is_premium && <span className="text-green">· PREMIUM</span>}
                  </div>
                </div>
                <div className="w-14 h-14 bg-s2 rounded border border-bd2 flex items-center justify-center shrink-0">
                  <TypeIcon t={m.media_type} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <button disabled={page === 0} onClick={() => loadPage(page - 1)}
                className="w-9 h-9 bg-s1 border border-bd2 rounded text-white text-lg flex items-center justify-center disabled:opacity-30">‹</button>
              <span className="text-[13px] text-gray tracking-wider min-w-[48px] text-center">{page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => loadPage(page + 1)}
                className="w-9 h-9 bg-s1 border border-bd2 rounded text-white text-lg flex items-center justify-center disabled:opacity-30">›</button>
            </div>
          )}
        </section>
      ) : !subs.length && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray">
          <span className="text-4xl opacity-30">📂</span>
          <span className="text-[12px] tracking-[2px] uppercase">Раздел пуст</span>
        </div>
      )}
    </div>
  )
}
