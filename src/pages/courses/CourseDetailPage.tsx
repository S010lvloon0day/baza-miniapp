import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import CourseIcon, { CourseIconBadge } from '../../components/CourseIcon'
import { CenterLoader, CourseButton, ErrorNote, MonoLabel, ProgressBar, StarRow } from '../../components/course/ui'
import { coursesApi } from '../../api/courses'
import type { CourseDetail, CourseReview } from '../../api/courses'

const tg = (window as any).Telegram?.WebApp
const openPay = (url: string) => {
  if (url.includes('t.me') && tg?.openTelegramLink) tg.openTelegramLink(url)
  else if (tg?.openLink) tg.openLink(url)
  else window.open(url, '_blank')
}

interface Props {
  courseId: number
  onChapter: (chapterId: number) => void
  onExam: () => void
}

function Paywall({ course, onPurchased }: { course: CourseDetail; onPurchased: () => void }) {
  const [invoice, setInvoice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const buy = async () => {
    setBusy(true); setMsg(null)
    try {
      const r = await coursesApi.invoice(course.id)
      setInvoice(r.invoice_id)
      openPay(r.pay_url)
    } catch (e: any) {
      if (e?.code === 'already_owned') { onPurchased(); return }
      setMsg('Не удалось создать счёт. Попробуй позже.')
    } finally { setBusy(false) }
  }

  const check = async () => {
    if (!invoice) return
    setBusy(true); setMsg(null)
    try {
      const r = await coursesApi.confirm(invoice)
      if (r.ok) { onPurchased(); return }
      setMsg('Оплата ещё не поступила — подожди минуту и проверь снова.')
    } catch { setMsg('Ошибка проверки. Попробуй позже.') } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col items-center text-center" style={{ padding: '20px 4px 0' }}>
      <div
        className="flex items-center justify-center"
        style={{
          width: 88, height: 88, borderRadius: '50%', marginBottom: 20,
          background: 'radial-gradient(circle,rgba(34,197,94,.28),transparent 68%)',
          boxShadow: '0 0 34px rgba(34,197,94,.35)', color: '#4AE885',
        }}
      >
        <CourseIcon icon={course.icon} size={40} />
      </div>

      <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 8 }}>{course.title}</div>
      <div style={{ fontSize: 13, color: '#9a9aa2', lineHeight: 1.6, maxWidth: 280, marginBottom: 18 }}>
        {course.description}
      </div>

      <div
        className="w-full flex flex-col text-left"
        style={{ gap: 10, padding: 16, border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, background: '#101014', marginBottom: 18 }}
      >
        <div className="uppercase" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', color: '#7a7a83' }}>
          Что внутри
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)' }}>
          {course.chapters.length} глав · {course.chapters.reduce((s, c) => s + c.lessons_count, 0)} уроков
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)' }}>
          Тест после каждой главы и финальный экзамен
        </div>
        {course.reviews_count > 0 && (
          <div className="flex items-center" style={{ gap: 7 }}>
            <StarRow value={course.rating} size={13} />
            <span style={{ fontSize: 12, color: '#8a8a93' }}>
              {course.rating.toFixed(1)} · {course.reviews_count} отзывов
            </span>
          </div>
        )}
      </div>

      {msg && <ErrorNote>{msg}</ErrorNote>}

      {!invoice ? (
        <CourseButton onClick={buy} disabled={busy}>
          Купить за {course.price} USDT
        </CourseButton>
      ) : (
        <div className="w-full flex flex-col" style={{ gap: 9 }}>
          <CourseButton onClick={check} disabled={busy}>Проверить оплату</CourseButton>
          <CourseButton onClick={buy} variant="ghost" disabled={busy}>Открыть счёт снова</CourseButton>
        </div>
      )}
    </div>
  )
}

function ReviewsBlock({ courseId, examPassed }: { courseId: number; examPassed: boolean }) {
  const [reviews, setReviews] = useState<CourseReview[]>([])
  const [rating, setRating] = useState(0)
  const [count, setCount] = useState(0)
  const [myRating, setMyRating] = useState(0)
  const [myText, setMyText] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    coursesApi.reviews(courseId).then(d => {
      setReviews(d.reviews)
      setRating(d.rating)
      setCount(d.reviews_count)
      if (d.my_review) {
        setMyRating(d.my_review.rating)
        setMyText(d.my_review.text)
        setSaved(true)
      }
    }).catch(() => {})
  }, [courseId])

  useEffect(load, [load])

  const submit = async () => {
    if (!myRating) return
    setBusy(true)
    try {
      await coursesApi.submitReview(courseId, myRating, myText)
      setSaved(true)
      load()
    } catch { /* сеть — форма остаётся заполненной, можно повторить */ } finally { setBusy(false) }
  }

  return (
    <div style={{ marginTop: 26 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <span className="uppercase font-mono" style={{ fontSize: 11, letterSpacing: '1.5px', color: '#8a8a93' }}>
          // ОТЗЫВЫ
        </span>
        {count > 0 && (
          <span className="flex items-center" style={{ gap: 6 }}>
            <StarRow value={rating} size={13} />
            <span style={{ fontSize: 11, color: '#8a8a93' }}>{rating.toFixed(1)} · {count}</span>
          </span>
        )}
      </div>

      {examPassed && (
        <div style={{ border: '1px solid rgba(34,197,94,.25)', borderRadius: 16, background: '#101014', padding: 16, marginBottom: 14 }}>
          <div className="uppercase" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: '#7a7a83', marginBottom: 10 }}>
            {saved ? 'Ваш отзыв' : 'Оцените курс'}
          </div>
          <div style={{ marginBottom: 10 }}>
            <StarRow value={myRating} size={24} onChange={v => { setMyRating(v); setSaved(false) }} />
          </div>
          <textarea
            value={myText}
            onChange={e => { setMyText(e.target.value); setSaved(false) }}
            placeholder="Что понравилось, что можно улучшить"
            rows={3}
            maxLength={1000}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '10px 12px',
              border: '1px solid rgba(255,255,255,.1)', borderRadius: 11,
              background: '#0D0D11', color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical',
              fontFamily: 'inherit', marginBottom: 10,
            }}
          />
          <CourseButton onClick={submit} disabled={busy || !myRating || saved} style={{ padding: 12, fontSize: 13 }}>
            {saved ? 'Отзыв сохранён' : 'Отправить отзыв'}
          </CourseButton>
        </div>
      )}

      {reviews.length === 0 ? (
        <div style={{ fontSize: 12, color: '#6a6a75' }}>
          {examPassed ? 'Ваш отзыв будет первым.' : 'Отзывы появятся после того, как курс пройдут ученики.'}
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: 9 }}>
          {reviews.map((r, i) => (
            <div
              key={i}
              style={{
                border: `1px solid ${r.mine ? 'rgba(34,197,94,.3)' : 'rgba(255,255,255,.08)'}`,
                borderRadius: 14, background: '#101014', padding: '13px 15px',
              }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800 }}>
                  {r.author || 'Ученик'}{r.mine ? ' · вы' : ''}
                </span>
                <StarRow value={r.rating} size={12} />
              </div>
              {r.text && (
                <div style={{ fontSize: 12.5, color: '#9a9aa2', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
                  {r.text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CourseDetailPage({ courseId, onChapter, onExam }: Props) {
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    coursesApi.detail(courseId)
      .then(setCourse)
      .catch(() => setCourse(null))
      .finally(() => setLoading(false))
  }, [courseId])

  useEffect(load, [load])

  if (loading) return <CenterLoader />
  if (!course) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 text-center" style={{ fontSize: 13, color: '#6a6a75' }}>
        Курс недоступен.
      </div>
    )
  }

  if (course.locked) {
    return (
      <div className="flex-1 overflow-y-auto pb-navsafe px-4 pt-4">
        <Paywall course={course} onPurchased={load} />
      </div>
    )
  }

  const allDone = course.chapters.length > 0 && course.chapters.every(ch => ch.done)
  const examEnabled = allDone && !course.exam_passed && course.final_exam_count > 0
  const examLabel = course.exam_passed
    ? '✓ Финальный экзамен сдан'
    : course.final_exam_count === 0
      ? 'Финальный экзамен не добавлен'
      : allDone ? 'Пройти финальный экзамен' : 'Пройдите все главы для экзамена'

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe px-4 pt-4">
      <div
        style={{
          border: '1px solid rgba(34,197,94,.25)', borderRadius: 18,
          background: 'radial-gradient(120% 100% at 0% 0%, rgba(34,197,94,.1), transparent 60%), #0D0D11',
          padding: 18, marginBottom: 22,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>{course.title}</div>
        {course.description && (
          <div style={{ fontSize: 12, color: '#9a9aa2', lineHeight: 1.5, marginBottom: 12 }}>{course.description}</div>
        )}
        <ProgressBar percent={course.percent} />
        <div className="font-mono" style={{ fontSize: 10, color: '#6a6a75', marginTop: 6 }}>
          {course.percent}% пройдено
        </div>
      </div>

      <MonoLabel>// ГЛАВЫ КУРСА</MonoLabel>

      <div className="grid grid-cols-3" style={{ gap: 9, marginBottom: 20 }}>
        {course.chapters.map((ch, i) => {
          const state = ch.done ? 'done' : ch.locked ? 'locked' : 'active'
          return (
            <motion.div
              key={ch.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: ch.locked ? 0.55 : 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={ch.locked ? undefined : () => onChapter(ch.id)}
              className="relative flex flex-col items-center overflow-hidden"
              style={{
                gap: 9, padding: '16px 6px 13px',
                border: `1px solid ${ch.done ? 'rgba(34,197,94,.4)' : ch.locked ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.09)'}`,
                borderRadius: 16,
                background: 'radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,.05), transparent 60%), #101014',
                cursor: ch.locked ? 'default' : 'pointer',
              }}
            >
              <div className="absolute top-0 left-0 right-0" style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent)' }} />
              <span className="absolute font-mono" style={{ top: 7, left: 9, fontSize: 8, color: '#52525b' }}>
                {String(i + 1).padStart(2, '0')}
              </span>

              <CourseIconBadge icon={ch.icon} size={46} iconSize={18} state={state} />

              <span
                className="relative uppercase text-center"
                style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.3, letterSpacing: '.3px', color: '#d4d4d8' }}
              >
                {ch.title}
              </span>
              <span className="relative font-mono" style={{ fontSize: 8, color: '#5c8a6e' }}>
                {ch.done ? 'Пройдено' : ch.locked ? 'Заблокировано' : `${ch.lessons_count} ур.`}
              </span>
            </motion.div>
          )
        })}
      </div>

      <CourseButton
        onClick={examEnabled ? onExam : undefined}
        disabled={!examEnabled}
        style={course.exam_passed
          ? { background: 'rgba(34,197,94,.1)', color: '#4AE885', border: '1px solid rgba(34,197,94,.4)' }
          : undefined}
      >
        {examLabel}
      </CourseButton>

      <ReviewsBlock courseId={course.id} examPassed={course.exam_passed} />
    </div>
  )
}
