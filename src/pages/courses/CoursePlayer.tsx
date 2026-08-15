import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import StepBar from '../../components/course/StepBar'
import Syllabus from '../../components/course/Syllabus'
import LessonContent, { stepKindLabel } from '../../components/course/LessonContent'
import { CenterLoader, CourseButton, ErrorNote, ProgressBar } from '../../components/course/ui'
import { useIsWide } from '../../hooks/useMediaQuery'
import { coursesApi } from '../../api/courses'
import type { CourseDetail, CourseLesson, CourseStep, QuestionStep } from '../../api/courses'

interface Props {
  courseId: number
  onExit: () => void
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
          {type === 'video' ? 'видео не добавлено' : 'изображение не добавлено'}
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

interface TaskProps {
  courseId: number
  step: QuestionStep
  onResult: (correct: boolean, percent: number, completed: boolean) => void
}

/**
 * Задача в стиле Stepik: ответ отправляется на сервер, неверный результат
 * показывается и позволяет решить снова — но никуда не запирает.
 */
function TaskStep({ courseId, step, onResult }: TaskProps) {
  const [selected, setSelected] = useState<number[]>([])
  const [verdict, setVerdict] = useState<'correct' | 'wrong' | null>(null)
  const [correctIds, setCorrectIds] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSelected([])
    setVerdict(null)
    setCorrectIds([])
    setError(null)
  }, [step.id])

  const toggle = (optionId: number) => {
    if (verdict) return
    setSelected(prev =>
      step.multi
        ? prev.includes(optionId) ? prev.filter(x => x !== optionId) : [...prev, optionId]
        : [optionId],
    )
  }

  const submit = async () => {
    if (!selected.length || busy) return
    setBusy(true)
    setError(null)
    try {
      const r = await coursesApi.submitStep(courseId, step.id, selected)
      setCorrectIds(r.correct_option_ids)
      setVerdict(r.correct ? 'correct' : 'wrong')
      onResult(r.correct, r.percent, r.completed)
    } catch {
      setError('Не удалось отправить ответ. Проверь соединение.')
    } finally { setBusy(false) }
  }

  const retry = () => {
    setVerdict(null)
    setCorrectIds([])
    setSelected([])
  }

  return (
    <>
      <div className="font-mono" style={{ fontSize: 10, color: '#5c8a6e', marginBottom: 8 }}>
        Задача{step.multi ? ' · несколько ответов' : ''}
        {step.attempts > 0 && ` · попыток: ${step.attempts}`}
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.4, marginBottom: 18 }}>{step.text}</div>

      <div className="flex flex-col" style={{ gap: 9, marginBottom: 20 }}>
        {step.options.map(o => {
          const isSelected = selected.includes(o.id)
          const isCorrectOpt = verdict === 'correct' && correctIds.includes(o.id)
          const isWrongPick = verdict === 'wrong' && isSelected

          let borderColor = 'rgba(255,255,255,.1)'
          let bg = '#101014'
          let textColor = '#e4e4e8'
          let markBg = 'transparent'
          let markBorder = 'rgba(255,255,255,.25)'

          if (!verdict && isSelected) {
            borderColor = 'rgba(34,197,94,.5)'; bg = 'rgba(34,197,94,.08)'
            markBg = '#4AE885'; markBorder = '#4AE885'
          } else if (isCorrectOpt) {
            borderColor = 'rgba(34,197,94,.5)'; bg = 'rgba(34,197,94,.1)'
            markBg = '#4AE885'; markBorder = '#4AE885'; textColor = '#4AE885'
          } else if (isWrongPick) {
            borderColor = 'rgba(255,103,103,.5)'; bg = 'rgba(255,103,103,.08)'
            markBg = '#ff6767'; markBorder = '#ff6767'; textColor = '#ff9a9a'
          }

          return (
            <button
              key={o.id}
              type="button"
              role={step.multi ? 'checkbox' : 'radio'}
              aria-checked={isSelected}
              disabled={!!verdict}
              onClick={() => toggle(o.id)}
              className="flex items-center text-left w-full"
              style={{
                gap: 12, padding: '13px 14px',
                border: `1px solid ${borderColor}`, borderRadius: 13, background: bg,
                cursor: verdict ? 'default' : 'pointer',
                transition: 'border-color .15s ease, background .15s ease',
              }}
            >
              <span
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 20, height: 20,
                  borderRadius: step.multi ? 6 : '50%',
                  border: `1.5px solid ${markBorder}`, background: markBg,
                }}
              >
                {(isSelected || isCorrectOpt) && verdict !== 'wrong' && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0A0A0D" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {isWrongPick && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </span>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: textColor }}>{o.text}</span>
            </button>
          )
        })}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {verdict && (
        <div
          style={{
            padding: '13px 14px', borderRadius: 13, marginBottom: 14,
            border: `1px solid ${verdict === 'correct' ? 'rgba(34,197,94,.4)' : 'rgba(255,103,103,.4)'}`,
            background: verdict === 'correct' ? 'rgba(34,197,94,.1)' : 'rgba(255,103,103,.1)',
            color: verdict === 'correct' ? '#4AE885' : '#ff9a9a',
            fontSize: 13, fontWeight: 700,
          }}
        >
          {verdict === 'correct'
            ? '✓ Верно!'
            : '✕ Неверно. Можно решить снова или вернуться к задаче позже.'}
        </div>
      )}

      {!verdict ? (
        <CourseButton onClick={submit} disabled={!selected.length || busy}>
          {busy ? 'Отправляем…' : 'Отправить'}
        </CourseButton>
      ) : verdict === 'wrong' ? (
        <CourseButton onClick={retry}>Решить снова</CourseButton>
      ) : null}
    </>
  )
}

export default function CoursePlayer({ courseId, onExit }: Props) {
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [chapterIdx, setChapterIdx] = useState(0)
  const [stepIdx, setStepIdx] = useState(0)
  const [justCompleted, setJustCompleted] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const isWide = useIsWide()
  const scrollRef = useRef<HTMLDivElement>(null)
  const viewedRef = useRef<Set<number>>(new Set())
  // Текст урока грузится по требованию: весь курс может весить сотни килобайт
  const [lessonCache, setLessonCache] = useState<Record<number, CourseLesson>>({})
  const [lessonLoading, setLessonLoading] = useState(false)

  useEffect(() => {
    let alive = true
    coursesApi.detail(courseId)
      .then(d => {
        if (!alive) return
        setCourse(d)
        // Продолжаем с первого нерешённого шага, как «Продолжить обучение»
        const ci = d.chapters.findIndex(ch => ch.solved_count < ch.steps_count)
        if (ci >= 0) {
          const si = d.chapters[ci].steps.findIndex(s => !s.solved)
          setChapterIdx(ci)
          setStepIdx(si >= 0 ? si : 0)
        }
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [courseId])

  const chapters = course?.chapters ?? []
  const chapter = chapters[chapterIdx]
  const step: CourseStep | undefined = chapter?.steps[stepIdx]

  const flatIndex = useMemo(() => {
    let n = 0
    for (let i = 0; i < chapterIdx; i++) n += chapters[i]?.steps.length ?? 0
    return n + stepIdx
  }, [chapters, chapterIdx, stepIdx])

  /** Локально отмечает шаг решённым, чтобы полоса и проценты не ждали перезагрузки. */
  const markSolved = useCallback((kind: string, id: number, solved: boolean, percent: number) => {
    setCourse(prev => {
      if (!prev) return prev
      let deltaSolved = 0
      const next = {
        ...prev,
        chapters: prev.chapters.map(ch => ({
          ...ch,
          steps: ch.steps.map(s => {
            if (s.kind !== kind || s.id !== id) return s
            if (solved && !s.solved) deltaSolved = 1
            return { ...s, solved: s.solved || solved, attempts: s.attempts + 1 }
          }),
        })),
      }
      next.chapters = next.chapters.map(ch => ({
        ...ch,
        solved_count: ch.steps.filter(s => s.solved).length,
      }))
      next.percent = percent
      next.steps_solved = prev.steps_solved + deltaSolved
      return next
    })
  }, [])

  // Текст открытого шага догружаем один раз и держим в кэше
  useEffect(() => {
    if (!step || step.kind !== 'lesson' || lessonCache[step.id]) return
    let alive = true
    setLessonLoading(true)
    coursesApi.lessonContent(courseId, step.id)
      .then(l => { if (alive) setLessonCache(c => ({ ...c, [l.id]: l })) })
      .catch(() => {})
      .finally(() => { if (alive) setLessonLoading(false) })
    return () => { alive = false }
  }, [step, courseId, lessonCache])

  // Теория засчитывается по факту открытия — один раз за сессию на шаг
  useEffect(() => {
    if (!course || !step || step.kind !== 'lesson' || step.solved) return
    if (viewedRef.current.has(step.id)) return
    viewedRef.current.add(step.id)
    coursesApi.viewLesson(courseId, step.id)
      .then(r => markSolved('lesson', step.id, true, r.percent))
      .catch(() => {})
  }, [course, step, courseId, markSolved])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
    setNavOpen(false)
  }, [chapterIdx, stepIdx])

  const goTo = (ci: number, si: number) => {
    setChapterIdx(ci)
    setStepIdx(si)
    setJustCompleted(false)
  }

  const goNext = () => {
    if (!chapter) return
    if (stepIdx < chapter.steps.length - 1) return goTo(chapterIdx, stepIdx + 1)
    if (chapterIdx < chapters.length - 1) return goTo(chapterIdx + 1, 0)
  }

  const goPrev = () => {
    if (stepIdx > 0) return goTo(chapterIdx, stepIdx - 1)
    if (chapterIdx > 0) {
      const prev = chapters[chapterIdx - 1]
      return goTo(chapterIdx - 1, Math.max(0, prev.steps.length - 1))
    }
  }

  if (loading) return <CenterLoader />
  if (!course || !chapter || !step) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 text-center" style={{ fontSize: 13, color: '#6a6a75' }}>
        В курсе пока нет шагов.
      </div>
    )
  }

  const isLastStep = chapterIdx === chapters.length - 1 && stepIdx === chapter.steps.length - 1
  const totalSteps = chapters.reduce((s, c) => s + c.steps.length, 0)

  const content = (
    <div ref={scrollRef} className="flex-1 overflow-y-auto pb-navsafe px-4 pt-4">
      <div className="flex items-center justify-between" style={{ marginBottom: 10, gap: 10 }}>
        <span className="font-mono truncate" style={{ fontSize: 10.5, color: '#8a8a93' }}>
          {chapter.is_exam ? '' : `Глава ${chapterIdx + 1} · `}{chapter.title}
        </span>
        <span className="font-mono shrink-0" style={{ fontSize: 10, color: '#6a6a75' }}>
          {flatIndex + 1} / {totalSteps}
        </span>
      </div>

      <StepBar steps={chapter.steps} activeIdx={stepIdx} onSelect={si => goTo(chapterIdx, si)} />

      {step.kind === 'lesson' ? (
        <>
          <div className="font-mono" style={{ fontSize: 10, color: '#5c8a6e', marginBottom: 8 }}>
            {stepKindLabel(step.title)}
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.35, marginBottom: 16 }}>{step.title}</div>
          {lessonCache[step.id] ? (
            <>
              <LessonMedia type={step.type} url={lessonCache[step.id].media_url} />
              <LessonContent text={lessonCache[step.id].content} />
            </>
          ) : (
            <div className="font-mono" style={{ fontSize: 11, color: '#4a4a52', marginBottom: 26 }}>
              {lessonLoading ? 'загружаем…' : 'текст недоступен'}
            </div>
          )}
        </>
      ) : (
        <TaskStep
          courseId={courseId}
          step={step}
          onResult={(correct, percent, completed) => {
            markSolved('question', step.id, correct, percent)
            if (completed) setJustCompleted(true)
          }}
        />
      )}

      {justCompleted && (
        <div
          className="text-center"
          style={{
            marginTop: 18, padding: '18px 16px', borderRadius: 16,
            border: '1px solid rgba(34,197,94,.4)', background: 'rgba(34,197,94,.08)',
          }}
        >
          <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 20, textTransform: 'uppercase', marginBottom: 6 }}>
            Курс пройден!
          </div>
          <div style={{ fontSize: 12.5, color: '#9a9aa2', lineHeight: 1.5, marginBottom: 12 }}>
            Все задачи решены. Оставьте отзыв — он появится на странице курса.
          </div>
          <CourseButton onClick={onExit} style={{ padding: 12, fontSize: 13 }}>
            Оставить отзыв
          </CourseButton>
        </div>
      )}

      <div className="flex" style={{ gap: 10, marginTop: 22 }}>
        {(stepIdx > 0 || chapterIdx > 0) && (
          <CourseButton variant="ghost" onClick={goPrev} style={{ flex: 1, padding: 14 }}>Назад</CourseButton>
        )}
        {!isLastStep ? (
          <CourseButton onClick={goNext} style={{ flex: 2, padding: 14 }}>Далее</CourseButton>
        ) : (
          <CourseButton variant="ghost" onClick={onExit} style={{ flex: 2, padding: 14 }}>К странице курса</CourseButton>
        )}
      </div>
    </div>
  )

  if (isWide) {
    // ПК: курс раскрывается на всю ширину — оглавление слева, шаг справа
    return (
      <div className="flex-1 flex overflow-hidden">
        <aside
          className="overflow-y-auto shrink-0"
          style={{ width: 320, borderRight: '1px solid rgba(255,255,255,.08)', padding: '16px 14px 90px' }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>{course.title}</div>
          <div className="font-mono" style={{ fontSize: 10, color: '#6a6a75', marginBottom: 8 }}>
            {course.percent}% · {course.steps_solved} / {course.steps_count} шагов
          </div>
          <div style={{ marginBottom: 16 }}><ProgressBar percent={course.percent} /></div>
          <Syllabus chapters={chapters} activeChapter={chapterIdx} activeStep={stepIdx} onSelect={goTo} expandAll />
        </aside>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="w-full mx-auto flex flex-col overflow-hidden" style={{ maxWidth: 760, flex: 1 }}>
            {content}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 pt-3" style={{ paddingBottom: 4 }}>
        <button
          type="button"
          onClick={() => setNavOpen(v => !v)}
          className="w-full flex items-center"
          style={{
            gap: 9, padding: '9px 12px', borderRadius: 12,
            border: '1px solid rgba(255,255,255,.1)', background: '#101014', cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a8a93" strokeWidth={2.2} strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="14" y2="17" />
          </svg>
          <span className="flex-1 text-left truncate" style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
            {course.title}
          </span>
          <span className="font-mono" style={{ fontSize: 10, color: '#4AE885' }}>{course.percent}%</span>
        </button>
      </div>

      {navOpen ? (
        <div className="flex-1 overflow-y-auto pb-navsafe px-4 pt-3">
          <Syllabus chapters={chapters} activeChapter={chapterIdx} activeStep={stepIdx} onSelect={goTo} />
        </div>
      ) : content}
    </div>
  )
}
