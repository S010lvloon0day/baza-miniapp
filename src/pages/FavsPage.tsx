import { useEffect, useState } from 'react'
import type { Material } from '../api/client'
import { api } from '../api/client'
import MediaTypeIcon from '../components/MediaTypeIcon'

interface Props { onMaterial: (id: number, sectionId: number) => void }

const typeLabel = (t: string) => ({ photo:'ФОТО', video:'ВИДЕО', document:'ДОКУМЕНТ', text:'ТЕКСТ' }[t] ?? t.toUpperCase())

export default function FavsPage({ onMaterial }: Props) {
  const [items, setItems] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.favorites()
      .then(data => setItems(data.materials))
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
        <div><span className="text-white/20">$</span><span className="text-gray2"> ls ~/favorites/</span></div>
        <div className="text-gray2">total 0</div>
        <div className="text-gray2">// directory is empty</div>
      </div>
      <div className="text-[11px] text-gray text-center leading-relaxed max-w-[220px] mt-1">
        Открой материал и нажми закладку в заголовке
      </div>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      <div className="px-4 pt-3 pb-3.5">
        <span className="text-[11px] font-bold tracking-[1.5px] uppercase text-gray">{items.length} сохранено</span>
      </div>
      <div className="mx-4 flex flex-col" style={{ gap: 10 }}>
        {items.map(m => (
          <div key={m.id} onClick={() => onMaterial(m.id, m.section_id)}
            className="flex items-center gap-3 cursor-pointer border border-white/[.08] active:border-green/40 transition-transform duration-150 active:translate-x-0.5"
            style={{ padding: 12, borderRadius: 14, background: '#101014' }}>
            <MediaTypeIcon type={m.media_type} />
            <div className="flex-1 min-w-0">
              {m.section_title && (
                <div className="text-[11px] truncate mb-0.5" style={{ color: '#8a8a93' }}>{m.section_title}</div>
              )}
              <div className="text-[14px] font-semibold truncate">{m.title}</div>
              <div className="text-[10px] mt-0.5" style={{ color: '#6a6a75', letterSpacing: '.5px' }}>{typeLabel(m.media_type)}</div>
            </div>
            <span className="shrink-0" style={{ width: 6, height: 6, borderRadius: '50%', background: '#4AE885', boxShadow: '0 0 6px #4AE885' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
