import { useEffect, useState } from 'react'
import SkeletonList from '../components/Skeleton'
import Icon from '../components/Icon'
import FeaturedCard from '../components/FeaturedCard'
import { iconNameFor } from '../components/CategoryIcon'
import SectionArt, { assignArts, artStyle } from '../components/SectionArt'
import { api } from '../api/client'
import type { Section } from '../api/client'

interface Props { onSection: (s: Section) => void; onGiveaway?: () => void }

const FEATURED_TITLE = 'Знания S010lvloon'
const MK_TITLE = 'Знания Маркаряна'

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
    <SkeletonList />
  )

  const featured = cats.find(s => s.title === FEATURED_TITLE)
  const mk = cats.find(s => s.title === MK_TITLE)
  const rest = cats.filter(s => s.title !== FEATURED_TITLE && s.title !== MK_TITLE)

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      <div className="px-3.5 pt-2 flex flex-col gap-2.5">
        <p className="px-1 text-[13.5px] text-gray">{cats.length} разделов. Выберите, с чего начать.</p>

        {featured && (
          <FeaturedCard title={featured.title} onClick={() => onSection(featured)} />
        )}
        {mk && (
          <FeaturedCard title={mk.title} variant="mk" onClick={() => onSection(mk)} />
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
          {(() => { const arts = assignArts(cats); return rest.map((s, i) => { const ai = arts.get(s.id) ?? i; return (
            <button key={s.id} onClick={() => onSection(s)}
              className="tile-v3 anim-up relative h-[140px] rounded-[22px] p-3.5 flex flex-col justify-between text-left overflow-hidden active:scale-[.97] transition-transform"
              style={{ ...artStyle(ai), animationDelay: `${Math.min(i, 10) * 45}ms` }}>
              <SectionArt index={ai} className="sa sa-bgart" />
              <i className="tile-fade" />
              <Icon name={iconNameFor(s.title)} size={26} style={{ color: 'var(--cv)' }} accent="var(--cv)" />
              <span className="min-w-0">
                <b className="block text-[15px] font-semibold leading-tight line-clamp-2 break-words" style={{ hyphens: 'auto' }} lang="ru">{s.title}</b>
                {s.description && <small className="block text-[11.5px] opacity-75 mt-0.5 truncate">{s.description}</small>}
              </span>
              {s.locked && <span className="absolute top-3.5 right-3.5 opacity-90"><Icon name="lock" size={15} accent="var(--cv)" style={{ color: 'var(--cv)' }} /></span>}
            </button>
          ) }) })()}
        </div>
      </div>
    </div>
  )
}
