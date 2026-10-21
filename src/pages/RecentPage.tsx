import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Material } from '../api/client'
import MediaTypeIcon from '../components/MediaTypeIcon'
import Icon from '../components/Icon'

export const typeLabel = (t: string, archive?: boolean) => archive ? 'Архив' : ({ photo: 'Фото', video: 'Видео', document: 'Файл', text: 'Урок', doc: 'Урок', quiz: 'Тест', task: 'Задание' }[t] ?? 'Материал')

export function EmptyState({ icon, title, text }: { icon: 'history' | 'bookmark' | 'search'; title: string; text: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 px-10 pb-24 text-center">
      <span className="w-14 h-14 rounded-[18px] bg-s1 border border-white/[.07] grid place-items-center text-[#CFDAD4]"><Icon name={icon} size={26} /></span>
      <div className="font-display font-semibold text-[15px]">{title}</div>
      <div className="text-[13.5px] text-gray leading-relaxed max-w-[260px]">{text}</div>
    </div>
  )
}

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

  if (!items.length) return <EmptyState icon="history" title="История пуста" text="Здесь появятся материалы, которые вы открывали." />

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      <div className="px-3.5">
        <p className="px-1 pt-1 pb-2.5 text-[13px] text-gray tabular-nums">{items.length} материалов</p>
        <div className="list-group">
          {items.map(m => (
            <button key={m.id} onClick={() => onMaterial(m.id, m.section_id)}
              className="w-full flex items-center gap-3 px-3.5 py-[11px] text-left active:bg-white/[.04] transition-colors">
              <MediaTypeIcon type={m.media_type} size={38} radius={11} iconSize={18} />
              <span className="flex-1 min-w-0">
                <b className="block text-[14.5px] font-medium truncate">{m.title}</b>
                <small className="block text-[12.5px] text-gray truncate">{[m.section_title, typeLabel(m.media_type, m.is_archive)].filter(Boolean).join(' · ')}</small>
              </span>
              <Icon name="chevR" size={15} className="text-gray2" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
