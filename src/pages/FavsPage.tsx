import { useEffect, useState } from 'react'
import type { Material, Section } from '../api/client'
import type { CourseSummary } from '../api/courses'
import { api } from '../api/client'
import MediaTypeIcon from '../components/MediaTypeIcon'

interface Props {
  onMaterial: (id: number, sectionId: number) => void
  onSection: (section: Section) => void
  onCourse: (courseId: number, title: string) => void
}

const typeLabel = (t: string) => ({ photo:'ФОТО', video:'ВИДЕО', document:'ДОКУМЕНТ', text:'ТЕКСТ' }[t] ?? t.toUpperCase())

function GroupTitle({ text }: { text: string }) {
  return (
    <div className="px-4 pt-4 pb-2">
      <span className="text-[11px] font-bold tracking-[1.5px] uppercase text-gray">{text}</span>
    </div>
  )
}

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

  if (!total) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8">
      <div className="font-mono text-[12px] text-center space-y-1">
        <div><span className="text-white/20">$</span><span className="text-gray2"> ls ~/favorites/</span></div>
        <div className="text-gray2">total 0</div>
        <div className="text-gray2">directory is empty</div>
      </div>
      <div className="text-[11px] text-gray text-center leading-relaxed max-w-[240px] mt-1">
        Нажми закладку в заголовке материала, раздела или курса — он появится здесь
      </div>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      <div className="px-4 pt-3 pb-1">
        <span className="text-[11px] font-bold tracking-[1.5px] uppercase text-gray">{total} сохранено</span>
      </div>

      {sections.length > 0 && (
        <>
          <GroupTitle text={`Разделы · ${sections.length}`} />
          <div className="mx-4 flex flex-col" style={{ gap: 10 }}>
            {sections.map(s => (
              <div key={`s${s.id}`} onClick={() => onSection(s)}
                className="flex items-center gap-3 cursor-pointer border border-white/[.08] active:border-green/40 transition-transform duration-150 active:translate-x-0.5"
                style={{ padding: 12, borderRadius: 14, background: '#101014' }}>
                <span className="shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center text-[18px]"
                  style={{ background: 'linear-gradient(155deg,#16211a,#0d0f0e)', border: '1px solid rgba(34,197,94,.3)' }}>
                  {s.emoji || '📂'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold truncate">{s.title}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: '#6a6a75', letterSpacing: '.5px' }}>
                    {s.section_type === 'courses' ? 'КУРСЫ' : 'РАЗДЕЛ'}
                  </div>
                </div>
                <span className="shrink-0" style={{ width: 6, height: 6, borderRadius: '50%', background: '#4AE885', boxShadow: '0 0 6px #4AE885' }} />
              </div>
            ))}
          </div>
        </>
      )}

      {courses.length > 0 && (
        <>
          <GroupTitle text={`Курсы · ${courses.length}`} />
          <div className="mx-4 flex flex-col" style={{ gap: 10 }}>
            {courses.map(c => (
              <div key={`c${c.id}`} onClick={() => onCourse(c.id, c.title)}
                className="flex items-center gap-3 cursor-pointer border border-white/[.08] active:border-violet/40 transition-transform duration-150 active:translate-x-0.5"
                style={{ padding: 12, borderRadius: 14, background: '#101014' }}>
                <span className="shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center text-[16px]"
                  style={{ background: 'linear-gradient(155deg,#1b1630,#0d0d12)', border: '1px solid rgba(199,166,255,.3)' }}>
                  🎓
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold truncate">{c.title}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: '#6a6a75', letterSpacing: '.5px' }}>
                    КУРС{c.level ? ` · ${c.level.toUpperCase()}` : ''}{c.percent ? ` · ${c.percent}%` : ''}
                  </div>
                </div>
                <span className="shrink-0" style={{ width: 6, height: 6, borderRadius: '50%', background: '#C7A6FF', boxShadow: '0 0 6px #C7A6FF' }} />
              </div>
            ))}
          </div>
        </>
      )}

      {materials.length > 0 && (
        <>
          <GroupTitle text={`Материалы · ${materials.length}`} />
          <div className="mx-4 flex flex-col" style={{ gap: 10 }}>
            {materials.map(m => (
              <div key={`m${m.id}`} onClick={() => onMaterial(m.id, m.section_id)}
                className="flex items-center gap-3 cursor-pointer border border-white/[.08] active:border-green/40 transition-transform duration-150 active:translate-x-0.5"
                style={{ padding: 12, borderRadius: 14, background: '#101014' }}>
                <MediaTypeIcon type={m.media_type} />
                <div className="flex-1 min-w-0">
                  {m.section_title && (
                    <div className="text-[11px] truncate mb-0.5" style={{ color: '#8a8a93' }}>{m.section_title}</div>
                  )}
                  <div className="text-[14px] font-semibold truncate">{m.title}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: '#6a6a75', letterSpacing: '.5px' }}>{m.is_archive ? 'АРХИВ' : typeLabel(m.media_type)}</div>
                </div>
                <span className="shrink-0" style={{ width: 6, height: 6, borderRadius: '50%', background: '#4AE885', boxShadow: '0 0 6px #4AE885' }} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
