import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import CourseIcon from '../../components/CourseIcon'
import Icon from '../../components/Icon'
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
    if (status === 'paid') { setMsg('Оплата получена, открываю курс…'); setTimeout(onPurchased, 1200) }
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
        if (status === 'paid') { setMsg('Оплата получена, открываю курс…'); setTimeout(onPurchased, 1500) }
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
    <div className="flex flex-col items-center text-center pt-4">
      <div className="card-gold w-full max-w-[520px] px-5 pt-7 pb-5 flex flex-col items-center mb-4">
        <div className="gold-metal sheen w-[76px] h-[76px] rounded-[24px] grid place-items-center mb-4 text-[#3A2300]">
          <span className="relative z-[1]"><CourseIcon icon={course.icon} size={36} /></span>
        </div>
        <span className="text-[12.5px] font-semibold text-gold mb-1.5">Авторский курс</span>
        <h1 className="font-display font-semibold text-[20px] leading-tight mb-2" style={{ textWrap: 'balance' } as React.CSSProperties}>{course.title}</h1>
        {course.description && (
          <p className="text-[14px] text-gray leading-relaxed max-w-[340px]">{course.description}</p>
        )}
      </div>

      <div className="list-group w-full max-w-[520px] text-left mb-4">
        <div className="flex items-center gap-3 px-4 py-3">
          <Icon name="sections" size={18} className="text-gray shrink-0" />
          <span className="text-[14px] text-fg/90">{course.chapters.filter(c => !c.is_exam).length} глав · {course.steps_count} шагов</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <Icon name="test" size={18} className="text-gray shrink-0" />
          <span className="text-[14px] text-fg/90">Теория и задачи, в конце финальный экзамен</span>
        </div>
        {course.reviews_count > 0 && (
          <div className="flex items-center gap-3 px-4 py-3">
            <StarRow value={course.rating} size={15} />
            <span className="text-[13.5px] text-gray tabular-nums">{course.rating.toFixed(1)} · {course.reviews_count} отзывов</span>
          </div>
        )}
      </div>

      {msg && <div className="w-full max-w-[520px]"><ErrorNote>{msg}</ErrorNote></div>}

      <div className="w-full max-w-[520px]">
        {!invoice ? (
          (() => {
            const methods = [
              course.rub ? { key: 'rub', label: 'СБП', sub: 'банковским приложением', icon: 'card' as const, amount: fmtRub(course.rub), onClick: buyRub } : null,
              course.stars ? { key: 'stars', label: 'Telegram Stars', sub: 'оплата в Telegram', icon: 'stars' as const, amount: `${course.stars} Stars`, onClick: buyStars } : null,
              { key: 'crypto', label: 'Криптовалюта', sub: 'USDT через CryptoBot', icon: 'coin' as const, amount: `${course.price} USDT`, onClick: buy },
            ].filter(Boolean) as { key: string; label: string; sub: string; icon: 'card' | 'stars' | 'coin'; amount: string; onClick: () => void }[]
            const primary = course.rub ? fmtRub(course.rub) : `${course.price} USDT`
            return (
              <div className="flex flex-col">
                <button disabled={busy} onClick={() => setPayOpen(o => !o)} aria-expanded={payOpen}
                  className="btn-gold gold-metal sheen w-full disabled:opacity-60">
                  <b>{busy ? 'Открываю оплату…' : `Купить курс · ${primary}`}</b>
                  <small className="inline-flex items-center gap-1">Выбрать способ оплаты <Icon name="chevD" size={12} className={`transition-transform ${payOpen ? 'rotate-180' : ''}`} /></small>
                </button>
                <AnimatePresence initial={false}>
                  {payOpen && !busy && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }} className="overflow-hidden">
                      <div className="list-group mt-2.5">
                        {methods.map(m => (
                          <button key={m.key} onClick={() => { setPayOpen(false); m.onClick() }}
                            className="w-full flex items-center gap-3 text-left px-4 py-3 active:bg-white/[.04]">
                            <span className={`w-9 h-9 rounded-[11px] grid place-items-center shrink-0 ${m.key === 'stars' ? 'bg-gold/15 text-gold' : 'bg-white/[.06] text-fg'}`}>
                              <Icon name={m.icon} size={18} accent="current" />
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-[14.5px] font-medium text-fg">{m.label}</span>
                              <span className="block text-[12.5px] text-gray">{m.sub}</span>
                            </span>
                            <span className="text-[14px] font-semibold text-fg tabular-nums">{m.amount}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="mt-3 text-[12.5px] text-gray2 leading-snug">Разовая покупка: курс остаётся у вас навсегда. Подписка Premium этот курс не открывает.</div>
              </div>
            )
          })()
        ) : (
          <div className="flex flex-col gap-2.5">
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
    <div className="mt-7">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <h2 className="font-display font-semibold text-[16px]">Отзывы</h2>
        {count > 0 && (
          <span className="flex items-center gap-1.5">
            <StarRow value={rating} size={14} />
            <span className="text-[13px] text-gray tabular-nums">{rating.toFixed(1)} · {count}</span>
          </span>
        )}
      </div>

      {canReview && (
        <div className="card-gold p-4 mb-3.5">
          <div className="font-display font-semibold text-[14px] mb-2.5">{saved ? 'Ваш отзыв' : 'Оцените курс'}</div>
          <div className="mb-3">
            <StarRow value={myRating} size={28} onChange={v => { setMyRating(v); setSaved(false) }} />
          </div>
          <textarea
            value={myText}
            onChange={e => { setMyText(e.target.value); setSaved(false) }}
            placeholder="Что понравилось, что можно улучшить"
            rows={3}
            maxLength={1000}
            className="w-full px-3.5 py-3 mb-3 rounded-[14px] bg-black/25 border border-white/[.08] text-fg text-[14.5px] outline-none resize-y placeholder:text-gray2 focus:border-gold/50"
          />
          <CourseButton onClick={submit} disabled={busy || !myRating || saved}>
            {saved ? 'Отзыв сохранён' : 'Отправить отзыв'}
          </CourseButton>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="text-[13.5px] text-gray px-0.5">
          {canReview ? 'Ваш отзыв будет первым.' : 'Отзывы появятся после того, как курс пройдут ученики.'}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {reviews.map((r, i) => (
            <div key={i} className={`rounded-[18px] bg-s1 px-4 py-3.5 border ${r.mine ? 'border-green/30' : 'border-white/[.07]'}`}>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="text-[14px] font-semibold truncate">
                  {r.author || 'Ученик'}{r.mine ? <span className="text-gray font-normal"> · вы</span> : ''}
                </span>
                <StarRow value={r.rating} size={13} />
              </div>
              {r.text && (
                <div className="text-[14px] text-fg/80 leading-[1.55] whitespace-pre-line">{r.text}</div>
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
      <div className="flex-1 flex items-center justify-center px-6 text-center text-[14px] text-gray">
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
          <div className="card-hero p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-white/[.09] text-[11.5px] font-medium text-fg/85">{course.level}</span>
              {course.reviews_count > 0 && (
                <span className="flex items-center gap-1">
                  <StarRow value={course.rating} size={13} />
                  <span className="text-[12.5px] text-gray tabular-nums">{course.rating.toFixed(1)}</span>
                </span>
              )}
            </div>

            <h1 className="font-display font-semibold text-[21px] leading-tight mb-2" style={{ textWrap: 'balance' } as React.CSSProperties}>{course.title}</h1>
            {course.description && (
              <p className="text-[14px] text-gray leading-relaxed mb-4">{course.description}</p>
            )}

            <div className="flex items-center justify-between text-[13px] mb-2">
              <span className="text-fg/85">Решено {course.steps_solved} из {course.steps_count} шагов</span>
              <span className="font-display font-semibold text-green tabular-nums">{course.percent}%</span>
            </div>
            <ProgressBar percent={course.percent} />

            <div className="mt-4">
              <CourseButton onClick={onStart}>
                <Icon name="play" size={15} accent="current" />
                {course.completed ? 'Повторить курс' : started ? 'Продолжить обучение' : 'Начать обучение'}
              </CourseButton>
            </div>
          </div>

          {!isWide && (
            <>
              <MonoLabel>Программа курса</MonoLabel>
              <Syllabus chapters={course.chapters} onSelect={onStart} expandAll={false} />
            </>
          )}

          <ReviewsBlock courseId={course.id} canReviewHint={course.completed} />
        </div>

        {isWide && (
          <div>
            <MonoLabel>Программа курса</MonoLabel>
            <Syllabus chapters={course.chapters} onSelect={onStart} expandAll />
          </div>
        )}
      </div>
    </div>
  )
}
