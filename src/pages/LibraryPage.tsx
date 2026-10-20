import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Section } from '../api/client'
import FavsPage from './FavsPage'
import RecentPage from './RecentPage'

interface Props {
  bmTick: number
  onMaterial: (id: number, sectionId: number) => void
  onSection: (section: Section) => void
  onCourse: (courseId: number, title: string) => void
}

type Sub = 'favs' | 'recent'

const IcBookmark = (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M6.5 3.5A1.5 1.5 0 0 1 8 2h8a1.5 1.5 0 0 1 1.5 1.5v17.1a.75.75 0 0 1-1.18.62L12 17.4l-4.32 3.82a.75.75 0 0 1-1.18-.62V3.5z" />
  </svg>
)
const IcClock = (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="9.2" />
    <path d="M12 7.5v5l3.5 2" />
  </svg>
)

export default function LibraryPage({ bmTick, onMaterial, onSection, onCourse }: Props) {
  const [sub, setSub] = useState<Sub>(() => (localStorage.getItem('lib_sub') as Sub) || 'favs')
  const pick = (s: Sub) => { setSub(s); try { localStorage.setItem('lib_sub', s) } catch { /* no-op */ } }

  const Seg = ({ id, label, icon }: { id: Sub; label: string; icon: ReactNode }) => {
    const on = sub === id
    return (
      <button
        onClick={() => pick(id)}
        className="flex-1 flex items-center justify-center gap-1.5 rounded-[12px] transition-colors duration-150 active:opacity-80"
        style={{
          padding: '9px 2px',
          background: on ? 'linear-gradient(180deg,rgba(34,197,94,.22),rgba(34,197,94,.08))' : 'transparent',
          border: on ? '1px solid rgba(74,232,133,.55)' : '1px solid rgba(255,255,255,.07)',
          boxShadow: on ? '0 0 12px rgba(34,197,94,.25)' : 'none',
          color: on ? '#4AE885' : '#8a8a93',
        }}
      >
        {icon}
        <span className="text-[12.5px] font-bold tracking-[.2px]">{label}</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex gap-2 px-4 pt-3 pb-1 shrink-0">
        <Seg id="favs" label="Избранное" icon={IcBookmark} />
        <Seg id="recent" label="История" icon={IcClock} />
      </div>
      {sub === 'favs'
        ? <FavsPage key={bmTick} onMaterial={onMaterial} onSection={onSection} onCourse={onCourse} />
        : <RecentPage onMaterial={onMaterial} />}
    </div>
  )
}
