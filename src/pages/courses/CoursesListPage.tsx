import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Icon from '../../components/Icon'
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
      <div className="flex-1 overflow-y-auto pb-navsafe px-4 pt-8 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-[18px] bg-white/[.06] grid place-items-center text-gray mb-4"><Icon name="book" size={26} /></div>
        <h2 className="font-display font-semibold text-[17px] mb-1.5">Курсов пока нет</h2>
        <p className="text-[14px] text-gray leading-relaxed max-w-[280px]">Здесь появятся курсы, собранные в конструкторе.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe px-4 pt-5">
      <div className="flex items-baseline justify-between mb-3.5 px-0.5">
        <h2 className="font-display font-semibold text-[18px]">Курсы</h2>
        <span className="text-[13px] text-gray tabular-nums">{courses.length} {courses.length === 1 ? 'курс' : courses.length < 5 ? 'курса' : 'курсов'}</span>
      </div>

      <div className="flex flex-col gap-3">
        {courses.map((c, i) => (
          <motion.button
            key={c.id}
            type="button"
            aria-label={c.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => onOpen(c.id)}
            className={`relative flex gap-3.5 overflow-hidden text-left px-4 py-4 rounded-[20px] active:scale-[.99] transition-transform ${c.locked && c.price > 0 ? 'card-gold' : 'card'}`}
          >
            <CourseIconBadge icon={c.icon} state={c.locked ? 'locked' : 'active'} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-white/[.07] text-[11.5px] font-medium text-gray">
                  {c.level}
                </span>
                {c.locked && c.price > 0 && (
                  <span className="inline-flex items-center h-6 px-2.5 rounded-full gold-metal text-[11.5px] font-semibold">
                    <span className="relative z-[1]">{c.price} USDT</span>
                  </span>
                )}
              </div>

              <div className="font-display font-semibold text-[15px] leading-snug mb-1.5 line-clamp-2">{c.title}</div>

              <div className="flex items-center gap-2 mb-2.5 text-[12.5px] text-gray">
                <span>{c.chapters_count} глав · {c.status_label}</span>
                {c.reviews_count > 0 && (
                  <span className="flex items-center gap-1">
                    <StarRow value={c.rating} size={12} />
                    <span className="tabular-nums">{c.rating.toFixed(1)}</span>
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
