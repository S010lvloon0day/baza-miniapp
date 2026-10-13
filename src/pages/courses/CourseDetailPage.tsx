import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import CourseIcon from '../../components/CourseIcon'
import Syllabus from '../../components/course/Syllabus'
import { CenterLoader, CourseButton, ErrorNote, MonoLabel, ProgressBar, StarRow } from '../../components/course/ui'
import { useIsWide } from '../../hooks/useMediaQuery'
import { coursesApi } from '../../api/courses'
import type { CourseDetail, CourseReview } from '../../api/courses'
import { useRubPayment, fmtRub } from '../../hooks/useRubPayment'

const tg = (window as any).Telegram?.WebApp
const openPay = (url: string) => {
  if (url.includes('t.me') && tg?.openTelegramLink) tg.openTelegramLink(url)
  else if (tg?.openLink) tg.openLink(url)
  else window.open(url, '_blank')
}

interface Props {
  courseId: number
  onStart: () => void
}

function Paywall({ course, onPurchased }: { course: CourseDetail; onPurchased: () => void }) {
  const [invoice, setInvoice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [rubTx, setRubTx] = useState<string | null>(null)
  const [payOpen, setPayOpen] = useState(false)

  const buyRub = async () => {
    setBusy(true); setMsg(null)
    try {
      const r = await coursesApi.rubInvoice(course.id)
      setRubTx(r.transaction_id)
      openPay(r.payment_url)
      setMsg('Оплатите через приложение банка (СБП) — курс откроется сам.')
    } catch (e: any) {
      if (e?.code === 'already_owned') { onPurchased(); return }
      setMsg('Не удалось создать платёж. Попробуй позже.')
    } finally { setBusy(false) }
  }

  useRubPayment(rubTx, status => {
    setRubTx(null)
    if (status === 'paid') { setMsg('✅ Оплата получена, открываю курс…'); setTimeout(onPurchased, 1200) }
    else setMsg('Оплата не прошла или отменена. Можно попробовать ещё раз.')
  })

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

  const buyStars = async () => {
    setBusy(true); setMsg(null)
    try {
      const r = await coursesApi.starsInvoice(course.id)
      const done = (status: string) => {
        if (status === 'paid') { setMsg('✅ Оплата получена, открываю курс…'); setTimeout(onPurchased, 1500) }
        else if (status === 'failed') setMsg('Оплата не прошла. Попробуй ещё раз.')
      }
      if (tg?.openInvoice) tg.openInvoice(r.link, done)
      else window.open(r.link, '_blank')
    } catch (e: any) {
      if (e?.code === 'already_owned') { onPurchased(); return }
      setMsg('Не удалось создать счёт Stars. Попробуй позже.')
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
      <div style={{ fontSize: 13, color: '#9a9aa2', lineHeight: 1.6, maxWidth: 320, marginBottom: 18 }}>
        {course.description}
      </div>

      <div
        className="w-full flex flex-col text-left"
        style={{ gap: 10, padding: 16, border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, background: '#101014', marginBottom: 18, maxWidth: 520 }}
      >
        <div className="uppercase" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', color: '#7a7a83' }}>
          Что внутри
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)' }}>
          {course.chapters.filter(c => !c.is_exam).length} глав · {course.steps_count} шагов
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)' }}>
          Теория и задачи вперемешку, в конце — финальный экзамен
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

      <div className="w-full" style={{ maxWidth: 520 }}>
        {!invoice ? (
          (() => {
            const methods = [
              course.rub ? { key: 'rub', label: 'СБП · банковским приложением', amount: fmtRub(course.rub), color: '#4AE885', onClick: buyRub } : null,
              { key: 'crypto', label: 'Криптовалюта', amount: `${course.price} USDT`, color: '#ffffff', onClick: buy },
              course.stars ? { key: 'stars', label: 'Telegram Stars', amount: `${course.stars}⭐`, color: '#E8B84A', onClick: buyStars } : null,
            ].filter(Boolean) as { key: string; label: string; amount: string; color: string; onClick: () => void }[]
            const primary = course.rub ? fmtRub(course.rub) : `${course.price} USDT`
            return (
              <div className="flex flex-col">
                <button
                  disabled={busy}
                  onClick={() => setPayOpen(o => !o)}
                  aria-expanded={payOpen}
                  className="w-full rounded-xl text-[14px] font-extrabold text-black disabled:opacity-50 transition-transform duration-150 active:-translate-y-0.5 flex items-center justify-center gap-2"
                  style={{ padding: 14, background: 'linear-gradient(180deg,#4AE885,#22C55E)', boxShadow: '0 6px 20px rgba(34,197,94,.3)' }}
                >
                  {busy ? 'Открываю…' : <>Купить · {primary}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}
                      strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: payOpen ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}>
                      <path d="M6 9l6 6 6-6" />
                    </svg></>}
                </button>
                <AnimatePresence initial={false}>
                  {payOpen && !busy && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }} className="overflow-hidden">
                      <div className="flex flex-col gap-1.5 mt-2">
                        {methods.map(m => (
                          <button key={m.key} onClick={() => { setPayOpen(false); m.onClick() }}
                            className="w-full flex items-center gap-3 rounded-xl text-left active:-translate-y-0.5 transition-transform duration-150"
                            style={{ padding: '12px 14px', border: '1px solid rgba(255,255,255,.1)', background: '#101014' }}>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color, boxShadow: `0 0 8px ${m.color}` }} />
                            <span className="flex-1 text-[13.5px] font-semibold text-white">{m.label}</span>
                            <span className="text-[13.5px] font-bold" style={{ color: m.color === '#ffffff' ? '#e4e4e8' : m.color }}>{m.amount}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="mt-2" style={{ fontSize: 11, color: '#6a6a75' }}>Разовая покупка, курс остаётся у вас навсегда. Premium-подписка этот курс не открывает.</div>
              </div>
            )
          })()
        ) : (
          <div className="flex flex-col" style={{ gap: 9 }}>
            <CourseButton onClick={check} disabled={busy}>Проверить оплату</CourseButton>
            <CourseButton onClick={buy} variant="ghost" disabled={busy}>Открыть счёт снова</CourseButton>
          </div>
        )}
      </div>
    </div>
  )
}

function ReviewsBlock({ courseId, canReviewHint }: { courseId: number; canReviewHint: boolean }) {
  const [reviews, setReviews] = useState<CourseReview[]>([])
  const [rating, setRating] = useState(0)
  const [count, setCount] = useState(0)
  const [canReview, setCanReview] = useState(canReviewHint)
  const [myRating, setMyRating] = useState(0)
  const [myText, setMyText] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    coursesApi.reviews(courseId).then(d => {
      setReviews(d.reviews)
      setRating(d.rating)
      setCount(d.reviews_count)
      setCanReview(d.can_review)
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
          ОТЗЫВЫ
        </span>
        {count > 0 && (
          <span className="flex items-center" style={{ gap: 6 }}>
            <StarRow value={rating} size={13} />
            <span style={{ fontSize: 11, color: '#8a8a93' }}>{rating.toFixed(1)} · {count}</span>
          </span>
        )}
      </div>

      {canReview && (
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
          {canReview ? 'Ваш отзыв будет первым.' : 'Отзывы появятся после того, как курс пройдут ученики.'}
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

export default function CourseDetailPage({ courseId, onStart }: Props) {
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const isWide = useIsWide()

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

  const started = course.steps_solved > 0

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe px-4 pt-4">
      <div
        className="mx-auto w-full"
        style={isWide ? { maxWidth: 900, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' } : undefined}
      >
        <div>
          <div
            style={{
              border: '1px solid rgba(34,197,94,.25)', borderRadius: 18,
              background: 'radial-gradient(120% 100% at 0% 0%, rgba(34,197,94,.1), transparent 60%), #0D0D11',
              padding: 18, marginBottom: 18,
            }}
          >
            <div className="flex items-center" style={{ gap: 8, marginBottom: 8 }}>
              <span
                className="uppercase"
                style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.5px', color: '#8a8a93', background: 'rgba(255,255,255,.06)', borderRadius: 6, padding: '2px 8px' }}
              >
                {course.level}
              </span>
              {course.reviews_count > 0 && (
                <span className="flex items-center" style={{ gap: 5 }}>
                  <StarRow value={course.rating} size={11} />
                  <span style={{ fontSize: 10.5, color: '#8a8a93' }}>{course.rating.toFixed(1)}</span>
                </span>
              )}
            </div>

            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{course.title}</div>
            {course.description && (
              <div style={{ fontSize: 12.5, color: '#9a9aa2', lineHeight: 1.55, marginBottom: 14 }}>{course.description}</div>
            )}

            <ProgressBar percent={course.percent} />
            <div className="font-mono" style={{ fontSize: 10, color: '#6a6a75', margin: '6px 0 14px' }}>
              {course.percent}% · решено {course.steps_solved} из {course.steps_count} шагов
            </div>

            <CourseButton onClick={onStart}>
              {course.completed ? 'Повторить курс' : started ? 'Продолжить обучение' : 'Начать обучение'}
            </CourseButton>
          </div>

          {!isWide && (
            <>
              <MonoLabel>ПРОГРАММА КУРСА</MonoLabel>
              <Syllabus chapters={course.chapters} onSelect={onStart} expandAll={false} />
            </>
          )}

          <ReviewsBlock courseId={course.id} canReviewHint={course.completed} />
        </div>

        {isWide && (
          <div>
            <MonoLabel>ПРОГРАММА КУРСА</MonoLabel>
            <Syllabus chapters={course.chapters} onSelect={onStart} expandAll />
          </div>
        )}
      </div>
    </div>
  )
}
