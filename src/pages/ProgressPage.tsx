import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Section, ProgressData } from '../api/client'
import Icon from '../components/Icon'
import { iconNameFor } from '../components/CategoryIcon'
import SkeletonList from '../components/Skeleton'
import { EmptyState } from './RecentPage'

interface Props {
  onMaterial: (id: number, sectionId: number) => void
  onSection: (section: Section) => void
}

/** Библиотека → Прогресс: «продолжить» и пройденное по разделам. */
export default function ProgressPage({ onMaterial, onSection }: Props) {
  const [data, setData] = useState<ProgressData | null>(null)
  const [fail, setFail] = useState(false)
  useEffect(() => { api.myProgress().then(setData).catch(() => setFail(true)) }, [])

  if (fail) return <EmptyState icon="history" title="Не удалось загрузить" text="Проверьте интернет и откройте вкладку ещё раз." />
  if (!data) return <SkeletonList rows={5} />
  if (!data.continue && data.sections.length === 0) {
    return <EmptyState icon="history" title="Пока пусто" text="Откройте любой материал и отметьте его пройденным — прогресс появится здесь." />
  }
  return (
    <div className="flex-1 overflow-y-auto px-3.5 pb-navsafe flex flex-col gap-4">
      {data.continue && (
        <button onClick={() => onMaterial(data.continue!.id, data.continue!.section_id)}
          className="w-full text-left rounded-[18px] p-4 border border-green/25 active:opacity-90"
          style={{ background: 'linear-gradient(120deg,rgba(23,229,132,.16),rgba(23,229,132,.03))' }}>
          <span className="text-[12px] font-semibold text-green">Продолжить</span>
          <b className="block text-[15.5px] font-semibold leading-snug mt-1 line-clamp-2">{data.continue.title}</b>
          <small className="block text-[12.5px] text-gray mt-1 truncate">{data.continue.section_title}</small>
        </button>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-[16px] bg-s1 border border-white/[.07] p-3.5">
          <b className="block font-display text-[22px] tabular-nums">{data.done_total}</b>
          <small className="text-[12.5px] text-gray">пройдено материалов</small>
        </div>
        <div className="rounded-[16px] bg-s1 border border-white/[.07] p-3.5">
          <b className="block font-display text-[22px] tabular-nums">{data.opened_total}</b>
          <small className="text-[12.5px] text-gray">открыто всего</small>
        </div>
      </div>
      {data.sections.length > 0 && (
        <section>
          <h3 className="px-1 pb-2 text-[15px] font-bold">По разделам</h3>
          <div className="list-group">
            {data.sections.map(s => {
              const pct = s.total ? Math.min(100, Math.round(s.done / s.total * 100)) : 0
              return (
                <button key={s.section.id} onClick={() => onSection(s.section)}
                  className="w-full flex items-center gap-3 px-3.5 py-3 text-left active:bg-white/[.04] transition-colors">
                  <span className="w-[38px] h-[38px] rounded-[11px] bg-white/[.06] grid place-items-center shrink-0"><Icon name={iconNameFor(s.section.title)} size={18} /></span>
                  <span className="flex-1 min-w-0">
                    <b className="block text-[14.5px] font-medium truncate">{s.section.title}</b>
                    <span className="block h-1.5 rounded-full bg-white/[.08] mt-2 overflow-hidden"><i className="block h-full rounded-full bg-green" style={{ width: `${pct}%` }} /></span>
                  </span>
                  <small className="text-[12.5px] text-gray tabular-nums shrink-0">{s.done} из {s.total}</small>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
