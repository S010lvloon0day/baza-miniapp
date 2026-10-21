import { useEffect, useState } from 'react'
import type { Material, Section } from '../api/client'
import type { CourseSummary } from '../api/courses'
import { api } from '../api/client'
import MediaTypeIcon from '../components/MediaTypeIcon'
import Icon from '../components/Icon'
import { iconNameFor } from '../components/CategoryIcon'
import { coverClass } from '../components/sectionCover'
import { EmptyState, typeLabel } from './RecentPage'

interface Props {
  onMaterial: (id: number, sectionId: number) => void
  onSection: (section: Section) => void
  onCourse: (courseId: number, title: string) => void
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="px-1 pb-2 text-[15px] font-bold">{title}</h3>
      <div className="list-group">{children}</div>
    </section>
  )
}

const rowCls = 'w-full flex items-center gap-3 px-3.5 py-[11px] text-left active:bg-white/[.04] transition-colors'

export default function FavsPage({ onMaterial, onSection, onCourse }: Props) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.favorites()
      .then(data => {
        setMaterials(data.materials ?? [])
        setSections(data.sections ?? [])
        setCourses(data.courses ?? [])
      })
      .catch(() => { setMaterials([]); setSections([]); setCourses([]) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
    </div>
  )

  const total = materials.length + sections.length + courses.length
  if (!total) return <EmptyState icon="bookmark" title="Пока ничего не сохранено" text="Нажмите закладку в заголовке материала, раздела или курса, и он появится здесь." />

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      <div className="px-3.5 pt-1 flex flex-col gap-5">
        <p className="px-1 -mb-2 text-[13px] text-gray tabular-nums">{total} сохранено</p>

        {sections.length > 0 && (
          <Group title={`Разделы · ${sections.length}`}>
            {sections.map(s => (
              <button key={`s${s.id}`} onClick={() => onSection(s)} className={rowCls}>
                <span className={`${coverClass(s)} w-[38px] h-[38px] rounded-[11px] grid place-items-center shrink-0`}>
                  <Icon name={iconNameFor(s.title)} size={18} style={{ color: 'var(--cv)' }} accent="var(--cv)" />
                </span>
                <span className="flex-1 min-w-0">
                  <b className="block text-[14.5px] font-medium truncate">{s.title}</b>
                  <small className="block text-[12.5px] text-gray">{s.section_type === 'courses' ? 'Курсы' : 'Раздел'}</small>
                </span>
                <Icon name="chevR" size={15} className="text-gray2" />
              </button>
            ))}
          </Group>
        )}

        {courses.length > 0 && (
          <Group title={`Курсы · ${courses.length}`}>
            {courses.map(c => (
              <button key={`c${c.id}`} onClick={() => onCourse(c.id, c.title)} className={rowCls}>
                <span className="tile-violet w-[38px] h-[38px] shrink-0"><Icon name="cert" size={18} accent="#fff" /></span>
                <span className="flex-1 min-w-0">
                  <b className="block text-[14.5px] font-medium truncate">{c.title}</b>
                  <small className="block text-[12.5px] text-gray truncate">Курс{c.level ? ` · ${c.level}` : ''}{c.percent ? ` · пройдено ${c.percent}%` : ''}</small>
                  {!!c.percent && (
                    <span className="block mt-1.5 h-1 rounded-full bg-white/[.08] overflow-hidden">
                      <span className="block h-full rounded-full" style={{ width: `${c.percent}%`, background: 'linear-gradient(90deg,#6E4CF5,#A58BFF)' }} />
                    </span>
                  )}
                </span>
                <Icon name="chevR" size={15} className="text-gray2" />
              </button>
            ))}
          </Group>
        )}

        {materials.length > 0 && (
          <Group title={`Материалы · ${materials.length}`}>
            {materials.map(m => (
              <button key={`m${m.id}`} onClick={() => onMaterial(m.id, m.section_id)} className={rowCls}>
                <MediaTypeIcon type={m.media_type} size={38} radius={11} iconSize={18} />
                <span className="flex-1 min-w-0">
                  <b className="block text-[14.5px] font-medium truncate">{m.title}</b>
                  <small className="block text-[12.5px] text-gray truncate">{[m.section_title, typeLabel(m.media_type, m.is_archive)].filter(Boolean).join(' · ')}</small>
                </span>
                <Icon name="chevR" size={15} className="text-gray2" />
              </button>
            ))}
          </Group>
        )}
      </div>
    </div>
  )
}
