import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Material } from '../api/client'


const typeLabel = (t: string) => ({ photo: 'ФОТО', video: 'ВИДЕО', document: 'ДОКУМЕНТ', text: 'ТЕКСТ' }[t] ?? t.toUpperCase())
const typeIcon  = (t: string) => ({ photo: '🖼', video: '🎬', document: '📄', text: '📝' }[t] ?? '📄')

interface Props { onMaterial: (id: number, sectionId: number) => void }

export default function RecentPage({ onMaterial }: Props) {
  const [items, setItems] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.history()
      .then(d => setItems(d.materials))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
    </div>
  )

  if (!items.length) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8">
      <div className="font-mono text-[12px] text-center space-y-1">
        <div><span className="text-white/20">$</span><span className="text-gray2"> cat ~/.history</span></div>
        <div className="text-gray2">// no entries found</div>
      </div>
      <div className="text-[11px] text-gray text-center leading-relaxed max-w-[220px] mt-1">
        Здесь появятся материалы, которые ты открывал
      </div>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto pb-14">
      <div className="px-4 pt-3 pb-1">
        <span className="text-[11px] font-bold tracking-[2px] uppercase text-gray">{items.length} материалов</span>
      </div>
      <div className="mx-4 flex flex-col divide-y divide-bd">
        {items.map(m => (
          <div key={m.id} onClick={() => onMaterial(m.id, m.section_id)}
            className="flex items-center gap-3 py-3.5 cursor-pointer active:bg-s1 -mx-4 px-4 transition-colors">
            <div className="w-11 h-11 bg-gradient-to-br from-s2 to-bg rounded-xl border border-bd2 flex items-center justify-center text-xl shrink-0">
              {typeIcon(m.media_type)}
            </div>
            <div className="flex-1 min-w-0">
              {(m.section_title || m.section_emoji) && (
                <div className="text-[10px] text-gray2 leading-none mb-0.5 truncate">
                  {m.section_emoji} {m.section_title}
                </div>
              )}
              <div className="text-[13px] font-semibold text-white line-clamp-2 leading-snug">{m.title}</div>
              <div className="text-[10px] text-gray uppercase tracking-[1px] mt-0.5">{typeLabel(m.media_type)}</div>
            </div>
            <div className="dot-glow shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
