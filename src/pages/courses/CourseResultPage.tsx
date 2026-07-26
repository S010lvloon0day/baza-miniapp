import { useState } from 'react'
import { CourseButton, StarRow } from '../../components/course/ui'
import { coursesApi } from '../../api/courses'

interface Props {
  courseId: number
  mode: 'chapter' | 'final'
  mistakes: number
  total: number
  onContinue: () => void
}

export default function CourseResultPage({ courseId, mode, mistakes, total, onContinue }: Props) {
  const isFinal = mode === 'final'
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const sendReview = async () => {
    if (!rating || busy) return
    setBusy(true)
    try {
      await coursesApi.submitReview(courseId, rating, text)
      setSent(true)
    } catch { /* отзыв не критичен — курс уже засчитан, можно повторить со страницы курса */ }
    finally { setBusy(false) }
  }

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe px-4">
      <div className="flex flex-col items-center text-center" style={{ padding: '30px 10px 0' }}>
        <div
          className="flex items-center justify-center"
          style={{
            width: 88, height: 88, borderRadius: '50%', marginBottom: 20,
            background: 'radial-gradient(circle,rgba(34,197,94,.35),transparent 68%)',
            boxShadow: '0 0 34px rgba(34,197,94,.4)',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4AE885" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l2.6 6.6L21 9l-5 4.3L17.5 20 12 16.3 6.5 20 8 13.3 3 9l6.4-.4z" />
          </svg>
        </div>

        <div
          className="uppercase"
          style={{ fontFamily: "'Anton', sans-serif", fontSize: 24, letterSpacing: '-.5px', marginBottom: 10 }}
        >
          {isFinal ? 'Курс завершён!' : 'Глава пройдена!'}
        </div>

        <div style={{ fontSize: 13, color: '#9a9aa2', lineHeight: 1.6, maxWidth: 260, marginBottom: 20 }}>
          {isFinal
            ? 'Поздравляем! Вы ответили правильно на все вопросы и завершили курс.'
            : 'Все ответы верны — переходите к следующей главе.'}
        </div>

        <div style={{ fontSize: 15, fontWeight: 800, color: '#4AE885', marginBottom: 26 }}>
          {mistakes === 0
            ? `${total} / ${total} без ошибок`
            : `${total} вопросов · ${mistakes} ${mistakes === 1 ? 'попытка исправлена' : 'попытки исправлены'}`}
        </div>

        {isFinal && (
          <div
            className="w-full text-left"
            style={{ border: '1px solid rgba(34,197,94,.25)', borderRadius: 16, background: '#101014', padding: 16, marginBottom: 20 }}
          >
            <div className="uppercase" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: '#7a7a83', marginBottom: 10 }}>
              {sent ? 'Спасибо за отзыв' : 'Оцените курс'}
            </div>

            {sent ? (
              <div className="flex items-center" style={{ gap: 8 }}>
                <StarRow value={rating} size={20} />
                <span style={{ fontSize: 12, color: '#8a8a93' }}>Отзыв опубликован</span>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 10 }}>
                  <StarRow value={rating} size={26} onChange={setRating} />
                </div>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Что понравилось, что можно улучшить"
                  rows={3}
                  maxLength={1000}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                    border: '1px solid rgba(255,255,255,.1)', borderRadius: 11,
                    background: '#0D0D11', color: '#fff', fontSize: 13, outline: 'none',
                    resize: 'vertical', fontFamily: 'inherit', marginBottom: 10,
                  }}
                />
                <CourseButton onClick={sendReview} disabled={!rating || busy} style={{ padding: 12, fontSize: 13 }}>
                  Отправить отзыв
                </CourseButton>
              </>
            )}
          </div>
        )}

        <CourseButton onClick={onContinue} style={{ maxWidth: 260 }}>
          {isFinal ? 'К курсу' : 'Продолжить'}
        </CourseButton>
      </div>
    </div>
  )
}
