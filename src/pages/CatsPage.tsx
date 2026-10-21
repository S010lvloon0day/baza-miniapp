import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { iconNameFor } from '../components/CategoryIcon'
import { coverClass } from '../components/sectionCover'
import { api } from '../api/client'
import type { Section } from '../api/client'

interface Props { onSection: (s: Section) => void; onGiveaway?: () => void }

const FEATURED_TITLE = 'Знания S010lvloon'

export default function CatsPage({ onSection, onGiveaway }: Props) {
  const [cats, setCats] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.sections()
      .then(d => setCats(d.sections.filter(s => !s.parent_id)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
    </div>
  )

  const featured = cats.find(s => s.title === FEATURED_TITLE)
  const rest = cats.filter(s => s.title !== FEATURED_TITLE)

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      <div className="px-3.5 pt-2 flex flex-col gap-2.5">
        <p className="px-1 text-[13.5px] text-gray">{cats.length} разделов. Выберите, с чего начать.</p>

        {featured && (
          <button onClick={() => onSection(featured)}
            className="w-full rounded-[20px] px-4 py-3.5 flex items-center gap-3 text-left border border-white/[.11] active:opacity-90"
            style={{ background: 'linear-gradient(120deg,rgba(245,194,90,.22),rgba(245,194,90,.04) 60%),#111C17' }}>
            <span className="gold-metal sheen sheen-d1 w-11 h-11 rounded-[14px] grid place-items-center shrink-0">
              <Icon name="mark" size={20} accent="#3A2300" className="relative z-[1]" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[12px] font-semibold text-gold">Авторское</span>
              <b className="block text-[15px] font-semibold truncate">{featured.title}</b>
              <small className="block text-[12.5px] text-gray truncate">Курсы, публикации, фишки</small>
            </span>
            <Icon name="chevR" size={16} className="text-gray2" />
          </button>
        )}

        {onGiveaway && (
          <button onClick={onGiveaway} className="card-violet w-full px-4 py-3.5 flex items-center gap-3 text-left active:opacity-90">
            <span className="tile-violet w-11 h-11 shrink-0"><Icon name="gift" size={20} accent="#fff" /></span>
            <span className="flex-1 min-w-0">
              <b className="block font-display font-semibold text-[14.5px] truncate">Секретный розыгрыш</b>
              <small className="block text-[12.5px] text-[#B9B0E6] truncate">Особое задание. Участвуйте и выигрывайте</small>
            </span>
            <Icon name="chevR" size={16} className="text-[#B9B0E6]" />
          </button>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          {rest.map((s, i) => (
            <button key={s.id} onClick={() => onSection(s)}
              className={`${coverClass(s)} anim-in relative h-[132px] rounded-[20px] p-3.5 flex flex-col justify-between text-left border border-white/[.07] overflow-hidden active:scale-[.98] transition-transform`}
              style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
              <Icon name={iconNameFor(s.title)} size={28} style={{ color: 'var(--cv)' }} accent="var(--cv)" />
              <span className="min-w-0">
                <b className="block text-[15px] font-semibold leading-tight line-clamp-2 break-words" style={{ hyphens: 'auto' }} lang="ru">{s.title}</b>
                {s.description && <small className="block text-[11.5px] opacity-75 mt-0.5 truncate">{s.description}</small>}
              </span>
              {s.locked && <span className="absolute top-3.5 right-3.5 opacity-80"><Icon name="lock" size={15} accent="var(--cv)" style={{ color: 'var(--cv)' }} /></span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
