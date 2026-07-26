import { useEffect, useState } from 'react'
import { CenterLoader, CourseButton } from '../../components/course/ui'
import { coursesApi } from '../../api/courses'
import type { CourseChapter } from '../../api/courses'

interface Props {
  courseId: number
  chapterId: number
  onQuiz: () => void
}

function LessonMedia({ type, url }: { type: string; url: string }) {
  if (type !== 'video' && type !== 'image') return null

  const frame = {
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: 16,
    overflow: 'hidden' as const,
    marginBottom: 16,
    aspectRatio: type === 'video' ? '16/9' : '4/3',
    background: '#0D0D11',
  }

  if (!url) {
    return (
      <div className="flex items-center justify-center" style={frame}>
        <span className="font-mono" style={{ fontSize: 11, color: '#4a4a52' }}>
          {type === 'video' ? '// видео не добавлено' : '// изображение не добавлено'}
        </span>
      </div>
    )
  }

  return (
    <div style={frame}>
      {type === 'video' ? (
        <video src={url} controls playsInline style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }} />
      ) : (
        <img src={url} alt="" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
      )}
    </div>
  )
}

export default function LessonPage({ courseId, chapterId, onQuiz }: Props) {
  const [chapter, setChapter] = useState<CourseChapter | null>(null)
  const [loading, setLoading] = useState(true)
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    let alive = true
    coursesApi.detail(courseId)
      .then(d => {
        if (!alive) return
        setChapter(d.chapters.find(c => c.id === chapterId) ?? null)
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [courseId, chapterId])

  useEffect(() => {
    // Новый урок открывается сверху, а не с позиции прокрутки предыдущего
    document.querySelector('[data-lesson-scroll]')?.scrollTo({ top: 0 })
  }, [idx])

  if (loading) return <CenterLoader />
  if (!chapter) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 text-center" style={{ fontSize: 13, color: '#6a6a75' }}>
        Глава недоступна.
      </div>
    )
  }

  const lessons = chapter.lessons
  const lesson = lessons[idx]
  const isLast = idx >= lessons.length - 1

  if (!lesson) {
    return (
      <div className="flex-1 overflow-y-auto pb-navsafe px-4 pt-4">
        <div style={{ fontSize: 13, color: '#9a9aa2', lineHeight: 1.6, marginBottom: 20 }}>
          В этой главе пока нет уроков — можно сразу пройти тест.
        </div>
        <CourseButton onClick={onQuiz}>К тесту главы</CourseButton>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe px-4 pt-4" data-lesson-scroll>
      <div className="font-mono" style={{ fontSize: 10, color: '#5c8a6e', marginBottom: 8 }}>
        Урок {idx + 1} из {lessons.length}
      </div>
      <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 14 }}>{lesson.title}</div>

      <LessonMedia type={lesson.type} url={lesson.media_url} />

      <div style={{ fontSize: 13.5, color: '#c9c9ce', lineHeight: 1.7, marginBottom: 26, whiteSpace: 'pre-line' }}>
        {lesson.content}
      </div>

      <div className="flex" style={{ gap: 10 }}>
        {idx > 0 && (
          <CourseButton variant="ghost" onClick={() => setIdx(i => i - 1)} style={{ flex: 1, padding: 14 }}>
            Назад
          </CourseButton>
        )}
        <CourseButton
          onClick={() => (isLast ? onQuiz() : setIdx(i => i + 1))}
          style={{ flex: 2, padding: 14 }}
        >
          {isLast ? 'К тесту главы' : 'Далее'}
        </CourseButton>
      </div>
    </div>
  )
}
