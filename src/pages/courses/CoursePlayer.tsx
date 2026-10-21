import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../components/Icon'
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
    background: '#0B1410',
  }

  if (!url) {
    return (
      <div className="flex items-center justify-center" style={frame}>
        <span className="text-[13px] text-gray2">
          {type === 'video' ? 'Видео не добавлено' : 'Изображение не добавлено'}
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
      <div className="flex items-center gap-2 mb-2 text-[12.5px] text-gray">
        <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-purple/15 text-violet font-medium"><Icon name="test" size={13} accent="current" />Задача</span>
        {step.multi && <span>несколько ответов</span>}
        {step.attempts > 0 && <span className="tabular-nums">попыток: {step.attempts}</span>}
      </div>
      <div className="font-display font-semibold text-[17px] leading-[1.4] mb-4">{step.text}</div>

      <div className="flex flex-col gap-2 mb-5">
        {step.options.map(o => {
          const isSelected = selected.includes(o.id)
          const isCorrectOpt = verdict === 'correct' && correctIds.includes(o.id)
          const isWrongPick = verdict === 'wrong' && isSelected

          let borderColor = 'rgba(255,255,255,.07)'
          let bg = '#111C17'
          let textColor = '#F2F4F3'
          let markBg = 'rgba(255,255,255,.06)'
          let markBorder = 'rgba(255,255,255,.18)'

          if (!verdict && isSelected) {
            borderColor = 'rgba(23,229,132,.55)'; bg = 'rgba(23,229,132,.10)'
            markBg = '#17E584'; markBorder = '#17E584'
          } else if (isCorrectOpt) {
            borderColor = 'rgba(23,229,132,.55)'; bg = 'rgba(23,229,132,.12)'
            markBg = '#17E584'; markBorder = '#17E584'; textColor = '#4BF5A8'
          } else if (isWrongPick) {
            borderColor = 'rgba(255,107,107,.5)'; bg = 'rgba(255,107,107,.10)'
            markBg = '#FF6B6B'; markBorder = '#FF6B6B'; textColor = '#FF9A9A'
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
                border: `1px solid ${borderColor}`, borderRadius: 16, background: bg,
                cursor: verdict ? 'default' : 'pointer',
                transition: 'border-color .15s ease, background .15s ease',
              }}
            >
              <span
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 22, height: 22,
                  borderRadius: step.multi ? 7 : '50%',
                  border: `1.5px solid ${markBorder}`, background: markBg,
                }}
              >
                {(isSelected || isCorrectOpt) && verdict !== 'wrong' && (
                  <Icon name="check" size={14} strokeWidth={2.6} className="text-ink" />
                )}
                {isWrongPick && (
                  <Icon name="close" size={12} strokeWidth={2.6} className="text-[#2A0606]" />
                )}
              </span>
              <span style={{ flex: 1, color: textColor }} className="text-[14.5px] leading-[1.45]">{o.text}</span>
            </button>
          )
        })}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {verdict && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-[16px] mb-3.5 text-[14px] font-semibold border ${verdict === 'correct' ? 'border-green/35 bg-green/[.10] text-green' : 'border-[#FF6B6B]/35 bg-[#FF6B6B]/[.10] text-[#FF9A9A]'}`}>
          <Icon name={verdict === 'correct' ? 'checkCircle' : 'warnCircle'} size={18} accent="current" className="shrink-0" />
          {verdict === 'correct'
            ? 'Верно'
            : 'Неверно. Можно решить снова или вернуться к задаче позже.'}
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
      <div className="flex-1 flex items-center justify-center px-6 text-center text-[14px] text-gray">
        В курсе пока нет шагов.
      </div>
    )
  }

  const isLastStep = chapterIdx === chapters.length - 1 && stepIdx === chapter.steps.length - 1
  const totalSteps = chapters.reduce((s, c) => s + c.steps.length, 0)

  const content = (
    <div ref={scrollRef} className="flex-1 overflow-y-auto pb-navsafe px-4 pt-4">
      <div className="flex items-center justify-between gap-2.5 mb-3">
        <span className="truncate text-[13px] text-gray">
          {chapter.is_exam ? '' : `Глава ${chapterIdx + 1} · `}{chapter.title}
        </span>
        <span className="shrink-0 text-[12.5px] text-gray2 tabular-nums">
          {flatIndex + 1} из {totalSteps}
        </span>
      </div>

      <StepBar steps={chapter.steps} activeIdx={stepIdx} onSelect={si => goTo(chapterIdx, si)} />

      {step.kind === 'lesson' ? (
        <>
          <span className="inline-flex items-center gap-1.5 h-6 px-2.5 mb-2.5 rounded-full bg-green/15 text-green text-[12.5px] font-medium">
            <Icon name="lesson" size={13} accent="current" />{stepKindLabel(step.title)}
          </span>
          <h1 className="font-display font-semibold text-[20px] leading-[1.3] mb-4" style={{ textWrap: 'balance' } as React.CSSProperties}>{step.title}</h1>
          {lessonCache[step.id] ? (
            <>
              <LessonMedia type={step.type} url={lessonCache[step.id].media_url} />
              <LessonContent text={lessonCache[step.id].content} />
            </>
          ) : (
            <div className="text-[14px] text-gray2 mb-6">
              {lessonLoading ? 'Загружаем…' : 'Текст недоступен'}
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
        <div className="card-gold mt-5 px-5 pt-6 pb-5 text-center flex flex-col items-center">
          <div className="gold-metal sheen w-14 h-14 rounded-[18px] grid place-items-center mb-3 text-[#3A2300]">
            <span className="relative z-[1]"><Icon name="trophy" size={26} accent="#3A2300" /></span>
          </div>
          <div className="font-display font-semibold text-[19px] mb-1.5">Курс пройден</div>
          <div className="text-[14px] text-gray leading-relaxed mb-4 max-w-[300px]">
            Все задачи решены. Оставьте отзыв, он появится на странице курса.
          </div>
          <CourseButton onClick={onExit}>Оставить отзыв</CourseButton>
        </div>
      )}

      <div className="flex gap-2.5 mt-6">
        {(stepIdx > 0 || chapterIdx > 0) && (
          <CourseButton variant="ghost" onClick={goPrev} style={{ flex: 1 }}><Icon name="chevL" size={18} />Назад</CourseButton>
        )}
        {!isLastStep ? (
          <CourseButton onClick={goNext} style={{ flex: 2 }}>Далее<Icon name="chevR" size={18} strokeWidth={2.2} /></CourseButton>
        ) : (
          <CourseButton variant="ghost" onClick={onExit} style={{ flex: 2 }}>К странице курса</CourseButton>
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
          style={{ width: 320, borderRight: '1px solid rgba(255,255,255,.07)', padding: '16px 14px 90px' }}
        >
          <div className="font-display font-semibold text-[15px] mb-1.5">{course.title}</div>
          <div className="text-[12.5px] text-gray mb-2 tabular-nums">
            {course.percent}% · {course.steps_solved} из {course.steps_count} шагов
          </div>
          <div className="mb-4"><ProgressBar percent={course.percent} /></div>
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
      <div className="px-4 pt-3 pb-1">
        <button
          type="button"
          onClick={() => setNavOpen(v => !v)}
          className="w-full flex items-center gap-2.5 h-11 px-3.5 rounded-[14px] bg-s1 border border-white/[.07] active:bg-s2"
        >
          <Icon name={navOpen ? 'close' : 'sections'} size={17} className="text-gray" />
          <span className="flex-1 text-left truncate text-[14px] font-medium text-fg">
            {navOpen ? 'Закрыть программу' : course.title}
          </span>
          <span className="text-[12.5px] font-semibold text-green tabular-nums">{course.percent}%</span>
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
