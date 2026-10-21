import { useState } from 'react'
import type { Section } from '../api/client'
import Icon from '../components/Icon'
import type { IconName } from '../components/Icon'
import FavsPage from './FavsPage'
import RecentPage from './RecentPage'

interface Props {
  bmTick: number
  onMaterial: (id: number, sectionId: number) => void
  onSection: (section: Section) => void
  onCourse: (courseId: number, title: string) => void
}

type Sub = 'favs' | 'recent'

export default function LibraryPage({ bmTick, onMaterial, onSection, onCourse }: Props) {
  const [sub, setSub] = useState<Sub>(() => { try { return (localStorage.getItem('lib_sub') as Sub) || 'favs' } catch { return 'favs' } })
  const pick = (s: Sub) => { setSub(s); try { localStorage.setItem('lib_sub', s) } catch { /* no-op */ } }

  const Seg = ({ id, label, icon }: { id: Sub; label: string; icon: IconName }) => {
    const on = sub === id
    return (
      <button onClick={() => pick(id)} aria-pressed={on}
        className={`flex-1 h-9 flex items-center justify-center gap-1.5 rounded-[10px] text-[13.5px] font-medium transition-colors ${on ? 'bg-white/10 text-fg' : 'text-gray active:bg-white/5'}`}>
        <Icon name={icon} size={16} accent={on ? 'brand' : 'current'} />
        {label}
      </button>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-3.5 pt-1 pb-2 shrink-0">
        <div className="flex gap-1 p-1 rounded-[14px] bg-s1 border border-white/[.07]">
          <Seg id="favs" label="Избранное" icon="bookmark" />
          <Seg id="recent" label="История" icon="history" />
        </div>
      </div>
      {sub === 'favs'
        ? <FavsPage key={bmTick} onMaterial={onMaterial} onSection={onSection} onCourse={onCourse} />
        : <RecentPage onMaterial={onMaterial} />}
    </div>
  )
}
