import { useEffect, useState } from 'react'
import { CenterLoader, CourseButton, ErrorNote, ProgressBar } from '../../components/course/ui'
import { coursesApi } from '../../api/courses'
import type { QuizQuestion } from '../../api/courses'

interface Props {
  courseId: number
  /** null — финальный экзамен */
  chapterId: number | null
  onDone: (mistakes: number, total: number) => void
}

export default function QuizPage({ courseId, chapterId, onDone }: Props) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState<number[]>([])
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [correctIds, setCorrectIds] = useState<number[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number[]>>({})
  const [busy, setBusy] = useState(false)

  const isFinal = chapterId === null

  useEffect(() => {
    let alive = true
    coursesApi.quiz(courseId, chapterId)
      .then(d => { if (alive) setQuestions(d.questions) })
      .catch(() => { if (alive) setError('Не удалось загрузить тест.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [courseId, chapterId])

  if (loading) return <CenterLoader />

  if (error || !questions.length) {
    return (
      <div className="flex-1 overflow-y-auto pb-navsafe px-4 pt-4">
        <ErrorNote>{error ?? 'В этом тесте пока нет вопросов.'}</ErrorNote>
        {!error && <CourseButton onClick={() => onDone(0, 0)}>Продолжить</CourseButton>}
      </div>
    )
  }

  const question = questions[qIdx]

  const toggle = (optionId: number) => {
    if (checked) return
    setSelected(prev =>
      question.multi
        ? prev.includes(optionId) ? prev.filter(x => x !== optionId) : [...prev, optionId]
        : [optionId],
    )
  }

  const check = async () => {
    if (!selected.length || busy) return
    setBusy(true)
    try {
      const r = await coursesApi.checkAnswer(courseId, question.id, selected)
      setCorrectIds(r.correct_option_ids)
      setCorrect(r.correct)
      setChecked(true)
      if (r.correct) setAnswers(a => ({ ...a, [question.id]: selected }))
      else setMistakes(m => m + 1)
    } catch {
      setError('Не удалось проверить ответ. Проверь соединение.')
    } finally { setBusy(false) }
  }

  const retry = () => {
    setChecked(false)
    setCorrect(false)
    setCorrectIds([])
    setSelected([])
  }

  const advance = async () => {
    if (busy) return
    if (qIdx < questions.length - 1) {
      setQIdx(i => i + 1)
      retry()
      return
    }
    setBusy(true)
    try {
      const finalAnswers = { ...answers, [question.id]: selected }
      if (isFinal) await coursesApi.completeExam(courseId, finalAnswers, mistakes)
      else await coursesApi.completeChapter(courseId, chapterId!, finalAnswers, mistakes)
      onDone(mistakes, questions.length)
    } catch {
      setError('Не удалось сохранить результат. Попробуй ещё раз.')
    } finally { setBusy(false) }
  }

  const progress = Math.round(((qIdx + (checked && correct ? 1 : 0)) / questions.length) * 100)

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe px-4 pt-4">
      <div style={{ marginBottom: 18 }}>
        <ProgressBar percent={progress} height={5} />
      </div>

      <div className="font-mono" style={{ fontSize: 10, color: '#5c8a6e', marginBottom: 8 }}>
        Вопрос {qIdx + 1} из {questions.length}{question.multi ? ' · неск. ответов' : ''}
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.4, marginBottom: 18 }}>{question.text}</div>

      <div className="flex flex-col" style={{ gap: 9, marginBottom: 20 }}>
        {question.options.map(o => {
          const isSelected = selected.includes(o.id)
          const isCorrectOpt = checked && correctIds.includes(o.id)
          const isWrongPick = checked && isSelected && !correctIds.includes(o.id)

          let borderColor = 'rgba(255,255,255,.1)'
          let bg = '#101014'
          let textColor = '#e4e4e8'
          let markBg = 'transparent'
          let markBorder = 'rgba(255,255,255,.25)'

          if (!checked && isSelected) {
            borderColor = 'rgba(34,197,94,.5)'; bg = 'rgba(34,197,94,.08)'
            markBg = '#4AE885'; markBorder = '#4AE885'
          } else if (isCorrectOpt) {
            borderColor = 'rgba(34,197,94,.5)'; bg = 'rgba(34,197,94,.1)'
            markBg = '#4AE885'; markBorder = '#4AE885'; textColor = '#4AE885'
          } else if (isWrongPick) {
            borderColor = 'rgba(255,103,103,.5)'; bg = 'rgba(255,103,103,.08)'
            markBg = '#ff6767'; markBorder = '#ff6767'; textColor = '#ff9a9a'
          }

          const showCheck = (!checked && isSelected) || isCorrectOpt
          const showX = isWrongPick

          return (
            <div
              key={o.id}
              onClick={() => toggle(o.id)}
              className="flex items-center"
              style={{
                gap: 12, padding: '13px 14px',
                border: `1px solid ${borderColor}`, borderRadius: 13, background: bg,
                cursor: checked ? 'default' : 'pointer',
                transition: 'border-color .15s ease, background .15s ease',
              }}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 20, height: 20,
                  borderRadius: question.multi ? 6 : '50%',
                  border: `1.5px solid ${markBorder}`, background: markBg,
                }}
              >
                {showCheck && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0A0A0D" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {showX && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </div>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: textColor }}>{o.text}</span>
            </div>
          )
        })}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {checked && (
        <div
          style={{
            padding: '13px 14px', borderRadius: 13, marginBottom: 14,
            border: `1px solid ${correct ? 'rgba(34,197,94,.4)' : 'rgba(255,103,103,.4)'}`,
            background: correct ? 'rgba(34,197,94,.1)' : 'rgba(255,103,103,.1)',
            color: correct ? '#4AE885' : '#ff9a9a',
            fontSize: 13, fontWeight: 700,
          }}
        >
          {correct ? '✓ Верно!' : '✕ Неверно. Выберите правильный ответ, чтобы двигаться дальше.'}
        </div>
      )}

      {!checked ? (
        <CourseButton onClick={check} disabled={!selected.length || busy}>Проверить ответ</CourseButton>
      ) : (
        <CourseButton onClick={correct ? advance : retry} disabled={busy}>
          {correct
            ? (qIdx < questions.length - 1 ? 'Следующий вопрос' : 'Завершить')
            : 'Попробовать снова'}
        </CourseButton>
      )}
    </div>
  )
}
