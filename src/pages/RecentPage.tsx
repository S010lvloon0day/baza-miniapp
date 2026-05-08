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

  const clear = async () => {
    await api.clearHistory().catch(() => {})
    setItems([])
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
    </div>
  )

  if (!items.length) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray">
      <span className="text-4xl opacity-30">🕐</span>
      <span className="text-[12px] tracking-[2px] uppercase">Нет просмотренных материалов</span>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto pb-14">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-[11px] font-bold tracking-[2px] uppercase text-gray">{items.length} материалов</span>
        <button onClick={clear} className="text-[11px] text-gray2 tracking-wide uppercase active:opacity-60">Очистить</button>
      </div>
      <div className="mx-4 flex flex-col divide-y divide-bd">
        {items.map(m => (
          <div key={m.id} onClick={() => onMaterial(m.id, m.section_id)}
            className="flex items-center gap-2.5 py-3.5 cursor-pointer active:opacity-70">
            <div className="dot-glow" />
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-white line-clamp-2 mb-1">{m.title}</div>
              <div className="text-[11px] text-gray">{typeLabel(m.media_type)}</div>
            </div>
            <div className="w-12 h-12 bg-s2 rounded border border-bd2 flex items-center justify-center text-xl shrink-0">
              {typeIcon(m.media_type)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
