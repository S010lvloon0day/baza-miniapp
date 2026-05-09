import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Image, Video, File, Article, Star, Lock, Check } from '@phosphor-icons/react'
import { api } from '../api/client'
import type { Section, Material } from '../api/client'

interface MaterialsResponse {
  materials: Material[]
  total: number
  total_with_premium?: number
}

const ITEMS_PER_PAGE = 10

interface Props {
  section: Section
  onMaterial: (id: number, sectionId: number) => void
  onSubsection: (s: Section) => void
  onUpgrade: () => void
}

const typeLabel = (t: string) => ({ photo:'ФОТО', video:'ВИДЕО', document:'ДОКУМЕНТ', text:'ТЕКСТ' }[t] ?? t.toUpperCase())
const TypeIcon = ({ t }: { t: string }) => {
  const props = { size: 22, weight: 'duotone' as const, className: 'text-green' }
  if (t === 'photo')  return <Image   {...props} />
  if (t === 'video')  return <Video   {...props} />
  if (t === 'text')   return <Article {...props} />
  return <File {...props} />
}

const BENEFITS = [
  'Полный доступ ко всем закрытым курсам',
  'Новые материалы раньше всех остальных',
  'Без ограничений — навсегда',
]

function PremiumUpsell({ section, onUpgrade }: { section: Section; onUpgrade: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto pb-14">
      <div className="flex flex-col items-center px-5 py-10 text-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 bg-[rgba(157,92,255,.10)] border border-[rgba(199,166,255,.25)] rounded-2xl flex items-center justify-center text-5xl">
            {section.emoji || '📁'}
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-violet rounded-full flex items-center justify-center shadow-lg">
            <Lock size={16} weight="fill" className="text-white" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="font-display text-[18px] tracking-[2px] uppercase leading-snug text-white max-w-[260px]">
            {section.title}
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(157,92,255,.15)] border border-[rgba(157,92,255,.3)]">
            <Star size={11} weight="fill" className="text-violet" />
            <span className="text-[10px] font-bold tracking-[1.5px] text-violet uppercase">Premium раздел</span>
          </div>
        </div>

        {section.description && (
          <div className="text-[13px] text-gray leading-relaxed max-w-[280px]">
            {section.description}
          </div>
        )}

        <div className="w-full premium-surface border border-bd rounded-xl p-4 flex flex-col gap-3 text-left">
          <div className="text-[11px] font-bold tracking-[2px] uppercase text-gray mb-1">Что даёт Premium</div>
          {BENEFITS.map(b => (
            <div key={b} className="flex items-center gap-3">
              <div className="w-5 h-5 bg-[rgba(157,92,255,.2)] rounded-full flex items-center justify-center shrink-0">
                <Check size={11} weight="bold" className="text-violet" />
              </div>
              <span className="text-[13px] text-white/80">{b}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onUpgrade}
          className="w-full py-4 bg-violet rounded-xl font-bold text-[15px] text-white tracking-wide active:opacity-80 transition-opacity"
        >
          💎 Получить Premium доступ
        </button>
      </div>
    </div>
  )
}

export default function SectionPage({ section, onMaterial, onSubsection, onUpgrade }: Props) {
  const [subs, setSubs] = useState<Section[]>([])
  const [mats, setMats] = useState<Material[]>([])
  const [total, setTotal] = useState(0)
  const [totalWithPremium, setTotalWithPremium] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  // Все хуки — до любого conditional return
  useEffect(() => {
    if (section.locked) { setLoading(false); return }
    setPage(0); setLoading(true)
    Promise.all([
      api.subsections(section.id).catch(() => ({ sections: [] as Section[] })),
      api.materials(section.id, 0).catch((): MaterialsResponse => ({ materials: [], total: 0, total_with_premium: 0 })),
    ]).then(([sd, md]) => {
      setSubs(sd.sections)
      setMats(md.materials)
      setTotal(md.total)
      setTotalWithPremium((md as MaterialsResponse).total_with_premium ?? md.total)
    }).finally(() => setLoading(false))
  }, [section.id])

  const loadPage = async (p: number) => {
    setLoading(true)
    const md: MaterialsResponse = await api.materials(section.id, p).catch((): MaterialsResponse => ({ materials: [], total: 0, total_with_premium: 0 }))
    setMats(md.materials); setPage(p); setLoading(false)
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE) || 1

  // Показываем upsell если раздел locked ИЛИ все материалы premium (пусто для не-премиум)
  const showUpsell = section.locked || (!loading && total === 0 && totalWithPremium > 0 && subs.length === 0)
  if (showUpsell) return <PremiumUpsell section={section} onUpgrade={onUpgrade} />

  return (
    <div className="flex-1 overflow-y-auto pb-14">
      {/* Section header */}
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
                className={`premium-surface border rounded p-3 flex flex-col items-center gap-1.5 cursor-pointer active:bg-s2 ${s.locked ? 'border-[rgba(157,92,255,.3)]' : 'border-bd active:border-green'}`}>
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center text-lg relative ${s.locked ? 'bg-[rgba(157,92,255,.08)] border-[rgba(157,92,255,.25)]' : 'bg-s2 border-bd2'}`}>
                  {s.emoji || '📁'}
                  {s.locked && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-violet rounded-full flex items-center justify-center">
                      <Lock size={8} weight="fill" className="text-white" />
                    </div>
                  )}
                </div>
                <span className={`text-[9px] font-semibold uppercase tracking-[.5px] text-center leading-tight ${s.locked ? 'text-violet/70' : 'text-gray'}`}>{s.title}</span>
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
                className={`flex items-center gap-2.5 py-3.5 cursor-pointer -mx-4 px-4 ${m.locked ? 'active:bg-[rgba(157,92,255,.06)]' : 'active:bg-s2'}`}
              >
                {m.locked ? (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-white/50 leading-snug line-clamp-2 mb-1.5">{m.title}</div>
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[rgba(157,92,255,.15)] border border-[rgba(157,92,255,.3)]">
                        <Star size={10} weight="fill" className="text-violet" />
                        <span className="text-[10px] font-bold tracking-[1.5px] text-violet uppercase">Только Premium</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded border border-[rgba(157,92,255,.2)] bg-[rgba(157,92,255,.06)] flex items-center justify-center shrink-0 opacity-40">
                      <TypeIcon t={m.media_type} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="dot-glow ml-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-white leading-snug line-clamp-2 mb-1">{m.title}</div>
                      <div className="text-[11px] text-gray">{typeLabel(m.media_type)}</div>
                    </div>
                    <div className="w-14 h-14 bg-s2 rounded border border-bd2 flex items-center justify-center shrink-0">
                      <TypeIcon t={m.media_type} />
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>

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
