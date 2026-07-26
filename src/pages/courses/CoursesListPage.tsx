import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CourseIconBadge } from '../../components/CourseIcon'
import { CenterLoader, ErrorNote, ProgressBar, StarRow } from '../../components/course/ui'
import { coursesApi } from '../../api/courses'
import type { CourseSummary } from '../../api/courses'

interface Props {
  sectionId: number
  onOpen: (courseId: number) => void
}

export default function CoursesListPage({ sectionId, onOpen }: Props) {
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    coursesApi.list(sectionId)
      .then(d => { if (alive) { setCourses(d.courses); setFailed(false) } })
      // Сбой сети не должен выглядеть как «курсов нет» — это разные вещи
      .catch(() => { if (alive) setFailed(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [sectionId])

  if (loading) return <CenterLoader />

  if (failed) {
    return (
      <div className="flex-1 overflow-y-auto pb-navsafe px-4 pt-4">
        <ErrorNote>Не удалось загрузить курсы. Проверь соединение и открой раздел снова.</ErrorNote>
      </div>
    )
  }

  if (!courses.length) {
    return (
      <div className="flex-1 overflow-y-auto pb-navsafe px-4 pt-4">
        <div className="font-mono" style={{ fontSize: 11, color: '#8a8a93', marginBottom: 14 }}>
          // курсов пока нет
        </div>
        <div style={{ fontSize: 13, color: '#6a6a75', lineHeight: 1.6 }}>
          Здесь появятся курсы, собранные в конструкторе.
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe px-4 pt-4">
      <div className="font-mono" style={{ fontSize: 11, color: '#8a8a93', marginBottom: 14 }}>
        // {courses.length} {courses.length === 1 ? 'курс' : 'курсов'} доступно
      </div>

      <div className="flex flex-col" style={{ gap: 12 }}>
        {courses.map((c, i) => (
          <motion.button
            key={c.id}
            type="button"
            aria-label={c.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => onOpen(c.id)}
            className="relative flex overflow-hidden text-left cursor-pointer transition-transform duration-150 active:-translate-y-0.5"
            style={{
              gap: 14,
              padding: '16px 18px',
              border: '1px solid rgba(255,255,255,.09)',
              borderRadius: 18,
              background: 'radial-gradient(120% 100% at 0% 0%, rgba(255,255,255,.05), transparent 60%), #101014',
            }}
          >
            <CourseIconBadge icon={c.icon} state={c.locked ? 'locked' : 'active'} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center" style={{ gap: 6, marginBottom: 7 }}>
                <span
                  className="inline-block uppercase"
                  style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.5px', color: '#8a8a93', background: 'rgba(255,255,255,.06)', borderRadius: 6, padding: '2px 8px' }}
                >
                  {c.level}
                </span>
                {c.locked && c.price > 0 && (
                  <span
                    className="inline-block"
                    style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.5px', color: '#FFCB57', border: '1px solid rgba(255,188,46,.4)', borderRadius: 6, padding: '2px 8px' }}
                  >
                    {c.price} USDT
                  </span>
                )}
              </div>

              <div className="truncate" style={{ fontSize: 15, fontWeight: 800, marginBottom: 5 }}>{c.title}</div>

              <div className="flex items-center" style={{ gap: 8, marginBottom: 9 }}>
                <span style={{ fontSize: 10.5, color: '#6a6a75' }}>
                  {c.chapters_count} глав · {c.status_label}
                </span>
                {c.reviews_count > 0 && (
                  <span className="flex items-center" style={{ gap: 4 }}>
                    <StarRow value={c.rating} size={10} />
                    <span style={{ fontSize: 10, color: '#8a8a93' }}>{c.rating.toFixed(1)}</span>
                  </span>
                )}
              </div>

              <ProgressBar percent={c.percent} />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
