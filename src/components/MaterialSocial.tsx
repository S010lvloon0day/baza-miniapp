import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Heart, ChatCircle, Flag, Trash, PaperPlaneRight, SealCheck, ArrowBendDownRight } from './icons'
import { social, plural, timeAgo } from '../api/social'
import type { MaterialComment, SocialData } from '../api/social'

interface TgWebApp {
  HapticFeedback?: { impactOccurred: (s: 'light' | 'medium') => void }
  showConfirm?: (text: string, cb: (ok: boolean) => void) => void
}
const tg = (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp
const haptic = (kind: 'light' | 'medium' = 'light') => {
  try { tg?.HapticFeedback?.impactOccurred(kind) } catch { /* нет в браузере */ }
}
const confirmBox = (text: string): Promise<boolean> =>
  new Promise(resolve => {
    if (tg?.showConfirm) tg.showConfirm(text, (ok: boolean) => resolve(ok))
    else resolve(window.confirm(text))
  })

const MAX_LEN = 1000

/* ─── Звёзды ─────────────────────────────────────────────────────────────── */

function Stars({ value, size = 14, onPick, busy }: {
  value: number; size?: number; onPick?: (n: number) => void; busy?: boolean
}) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(n => {
        const filled = n <= Math.round(shown)
        const el = (
          <Star size={size} weight={filled ? 'fill' : 'regular'}
            className={filled ? 'text-[#FFC94D]' : 'text-white/25'} />
        )
        return onPick ? (
          <button key={n} type="button" disabled={busy} aria-label={`Оценка ${n}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onPick(n)}
            className="p-1 -m-0.5 active:scale-90 transition-transform disabled:opacity-60">
            {el}
          </button>
        ) : <span key={n}>{el}</span>
      })}
    </div>
  )
}

function RatingBadge({ rating, count }: { rating: number; count: number }) {
  if (!count) return null
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-white/80">
      <Star size={13} weight="fill" className="text-[#FFC94D]" />
      <b className="font-semibold">{rating.toFixed(1)}</b>
      <span className="text-gray">· {count} {plural(count, 'оценка', 'оценки', 'оценок')}</span>
    </span>
  )
}

/* ─── Поле ввода (новый комментарий и ответ) ───────────────────────────── */

export function Composer({ placeholder, sending, onSend, onCancel, autoFocus, compact }: {
  placeholder: string
  sending: boolean
  onSend: (text: string) => Promise<boolean>
  onCancel?: () => void
  autoFocus?: boolean
  compact?: boolean
}) {
  const [text, setText] = useState('')
  const send = async () => {
    const t = text.trim()
    if (!t || sending) return
    if (await onSend(t)) setText('')
  }
  return (
    <div className={`rounded-2xl border border-white/[.1] bg-[#0D0D11] focus-within:border-green/40 transition-colors ${compact ? '' : 'mb-4'}`}>
      <textarea
        value={text}
        autoFocus={autoFocus}
        onChange={e => setText(e.target.value.slice(0, MAX_LEN))}
        placeholder={placeholder}
        rows={2}
        className="w-full bg-transparent resize-none px-3.5 pt-3 pb-1 text-[13.5px] leading-[1.55] text-white placeholder:text-white/30 outline-none"
      />
      <div className="flex items-center justify-between gap-2 px-3.5 pb-2.5">
        <span className="text-[10.5px] text-gray">
          {text.length > MAX_LEN - 150 ? `${text.length}/${MAX_LEN}` : 'Без ссылок и контактов'}
        </span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button onClick={onCancel} className="h-8 px-3 rounded-lg text-[11.5px] text-gray active:text-white">
              Отмена
            </button>
          )}
          <button onClick={send} disabled={!text.trim() || sending}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-green text-black text-[11.5px] font-bold tracking-wide disabled:opacity-35 active:opacity-80">
            {sending ? '…' : <>Отправить <PaperPlaneRight size={13} weight="bold" /></>}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Один комментарий ───────────────────────────────────────────────────── */

function CommentItem({ c, canInteract, isAdmin, preview, reply, onReply, onChange, onRemoved, onToast }: {
  c: MaterialComment
  canInteract: boolean
  isAdmin: boolean
  preview?: boolean
  /** Это ответ внутри ветки — компактнее, без своей кнопки «Ответить». */
  reply?: boolean
  onReply?: () => void
  onChange: (c: MaterialComment) => void
  onRemoved: (id: number) => void
  onToast: (s: string) => void
}) {
  const [busy, setBusy] = useState(false)

  const like = async () => {
    if (!canInteract || busy) return
    haptic()
    setBusy(true)
    const r = await social.like(c.id)
    setBusy(false)
    if (r.ok) onChange({ ...c, liked: r.liked, likes: r.likes })
  }

  const report = async () => {
    if (!(await confirmBox('Пожаловаться на комментарий? Модератор проверит его.'))) return
    const r = await social.report(c.id)
    if (r.ok) {
      onToast(r.hidden ? 'Комментарий скрыт до проверки' : 'Спасибо, жалоба отправлена')
      if (r.hidden) onRemoved(c.id)
    } else onToast(r.message || 'Не удалось отправить жалобу')
  }

  const remove = async () => {
    if (!(await confirmBox('Удалить комментарий?'))) return
    const r = await social.remove(c.id)
    if (r.ok) onRemoved(c.id)
    else onToast(r.message || 'Не удалось удалить')
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
      className={reply
        ? `rounded-xl border px-3 py-2.5 ${c.team ? 'border-green/25 bg-[rgba(34,197,94,.05)]' : 'border-white/[.06] bg-[#0E0E12]'}`
        : 'rounded-2xl border border-white/[.07] bg-[#101014] px-3.5 py-3'}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ background: c.team ? 'rgba(34,197,94,.18)' : 'rgba(255,255,255,.07)', color: c.team ? '#4AE885' : '#c9c9d1' }}>
          {(c.author || '?').slice(0, 1).toUpperCase()}
        </div>
        <span className="text-[12.5px] font-semibold text-white/90 truncate">{c.author}</span>
        {c.team && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-green font-semibold tracking-wide">
            <SealCheck size={12} weight="fill" /> команда
          </span>
        )}
        <span className="ml-auto text-[10.5px] text-gray shrink-0">{timeAgo(c.created_at)}</span>
      </div>

      <div className="text-[13.5px] leading-[1.6] text-white/80 whitespace-pre-wrap break-words">{c.text}</div>

      {!preview && (
        <div className="flex items-center gap-4 mt-2 -mb-0.5">
          <button onClick={like} disabled={!canInteract || busy}
            className={`inline-flex items-center gap-1 text-[11.5px] active:scale-95 transition-transform ${c.liked ? 'text-[#FF5C7A]' : 'text-gray'}`}>
            <Heart size={14} weight={c.liked ? 'fill' : 'regular'} />
            {c.likes > 0 ? c.likes : 'Полезно'}
          </button>
          {onReply && canInteract && (
            <button onClick={onReply} className="inline-flex items-center gap-1 text-[11.5px] text-gray active:text-white">
              <ArrowBendDownRight size={14} /> Ответить
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            {canInteract && !c.mine && (
              <button onClick={report} aria-label="Пожаловаться" className="text-gray/70 active:text-white">
                <Flag size={14} />
              </button>
            )}
            {(c.mine || isAdmin) && (
              <button onClick={remove} aria-label="Удалить" className="text-gray/70 active:text-[#FF5C7A]">
                <Trash size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}

/* ─── Полный блок под открытым материалом ───────────────────────────────── */

export default function MaterialSocial({ materialId }: { materialId: number }) {
  const [data, setData] = useState<SocialData | null>(null)
  const [sort, setSort] = useState<'top' | 'new'>('top')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [rating, setRatingBusy] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const cur = useRef(materialId)

  const showToast = (s: string) => {
    setToast(s)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => {
    cur.current = materialId
    social.get(materialId, sort).then(r => {
      if (cur.current === materialId && r.ok) setData(r)
    })
  }, [materialId, sort])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  if (!data) return null

  const pick = async (n: number) => {
    if (!data.can_interact || rating) return
    haptic('medium')
    const next = n === data.my_rating ? 0 : n          // повторное нажатие снимает оценку
    setRatingBusy(true)
    const r = await social.rate(materialId, next)
    setRatingBusy(false)
    if (r.ok) {
      setData({ ...data, rating: r.rating, rating_count: r.rating_count, my_rating: r.my_rating })
      if (next) showToast('Спасибо за оценку!')
    } else showToast(r.message || 'Не удалось сохранить оценку')
  }

  /** Новый комментарий (parentId не задан) или ответ в ветке parentId. */
  const send = async (t: string, parentId?: number): Promise<boolean> => {
    setSending(true)
    const r = await social.comment(materialId, t, parentId)
    setSending(false)
    if (!r.ok) {
      showToast(r.message || 'Не удалось отправить')
      return false
    }
    haptic('medium')
    setData(d => {
      if (!d) return d
      if (!parentId) {
        return { ...d, comments_count: r.comments_count,
          comments: [{ ...r.comment, replies: [] }, ...d.comments.filter(c => c.id !== r.comment.id)] }
      }
      return { ...d, comments_count: r.comments_count,
        comments: d.comments.map(c => c.id === parentId
          ? { ...c, replies: [...(c.replies ?? []), r.comment] } : c) }
    })
    setReplyTo(null)
    showToast(r.cut ? 'Опубликовано. Ссылки и контакты скрыты' : parentId ? 'Ответ опубликован' : 'Комментарий опубликован')
    return true
  }

  const more = async () => {
    setLoadingMore(true)
    const r = await social.get(materialId, sort, data.comments.length)
    setLoadingMore(false)
    if (r.ok) setData(d => d && ({ ...d, has_more: r.has_more, comments: [...d.comments, ...r.comments] }))
  }

  const update = (c: MaterialComment) =>
    setData(d => d && ({ ...d, comments: d.comments.map(x => x.id === c.id
      ? { ...c, replies: x.replies }
      : { ...x, replies: x.replies?.map(y => (y.id === c.id ? c : y)) }) }))
  // Удалили корень — уходит вся ветка (ответы без него не показываются).
  const removed = (id: number) =>
    setData(d => {
      if (!d) return d
      const root = d.comments.find(x => x.id === id)
      const gone = root ? 1 + (root.replies?.length ?? 0) : 1
      return { ...d, comments_count: Math.max(0, d.comments_count - gone),
        comments: d.comments.filter(x => x.id !== id).map(x => ({ ...x, replies: x.replies?.filter(y => y.id !== id) })) }
    })

  return (
    <section className="mx-4 mt-6 mb-4">
      <div className="h-px mb-5" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)' }} />

      {/* Оценка */}
      <div className="rounded-2xl border border-white/[.08] px-4 py-3.5 mb-5"
        style={{ background: 'radial-gradient(120% 120% at 0% 0%, rgba(255,201,77,.07), transparent 60%), #0D0D11' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold tracking-[2.5px] uppercase text-white/50 mb-1">
              {data.my_rating ? 'Ваша оценка' : 'Оцените материал'}
            </div>
            {data.rating_count > 0
              ? <RatingBadge rating={data.rating} count={data.rating_count} />
              : <span className="text-[12px] text-gray">Будьте первым</span>}
          </div>
          {data.can_interact && <Stars value={data.my_rating} size={24} onPick={pick} busy={rating} />}
        </div>
      </div>

      {/* Заголовок комментариев */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-[2.5px] uppercase text-green">
          <ChatCircle size={14} weight="bold" />
          Обсуждение{data.comments_count > 0 && <span className="text-white/40">· {data.comments_count}</span>}
        </div>
        {data.comments_count > 1 && (
          <div className="flex rounded-lg border border-white/[.1] overflow-hidden text-[10.5px]">
            {(['top', 'new'] as const).map(s => (
              <button key={s} onClick={() => setSort(s)}
                className={`px-2.5 py-1 ${sort === s ? 'bg-white/[.09] text-white' : 'text-gray'}`}>
                {s === 'top' ? 'Лучшие' : 'Новые'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Поле ввода */}
      {data.can_interact && (
        <Composer placeholder="Вопрос, опыт или дополнение к материалу…" sending={sending && replyTo === null}
          onSend={t => send(t)} />
      )}

      {/* Список */}
      {data.comments.length === 0 ? (
        <div className="text-center text-[12.5px] text-gray py-5 border border-dashed border-white/[.08] rounded-2xl">
          Пока нет комментариев{data.can_interact ? ' — начните обсуждение' : ''}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <AnimatePresence initial={false}>
            {data.comments.map(c => (
              <div key={c.id} className="flex flex-col gap-2">
                <CommentItem c={c} canInteract={data.can_interact} isAdmin={data.is_admin}
                  onReply={() => setReplyTo(replyTo === c.id ? null : c.id)}
                  onChange={update} onRemoved={removed} onToast={showToast} />
                {((c.replies?.length ?? 0) > 0 || replyTo === c.id) && (
                  <div className="ml-4 pl-3 border-l border-white/[.08] flex flex-col gap-2">
                    {c.replies?.map(r => (
                      <CommentItem key={r.id} c={r} reply canInteract={data.can_interact} isAdmin={data.is_admin}
                        onChange={update} onRemoved={removed} onToast={showToast} />
                    ))}
                    {replyTo === c.id && (
                      <Composer compact autoFocus placeholder="Ваш ответ…"
                        sending={sending} onSend={t => send(t, c.id)} onCancel={() => setReplyTo(null)} />
                    )}
                  </div>
                )}
              </div>
            ))}
          </AnimatePresence>
          {data.has_more && (
            <button onClick={more} disabled={loadingMore}
              className="h-10 rounded-xl border border-white/[.1] text-[11.5px] tracking-[1.5px] uppercase text-gray active:border-green/40">
              {loadingMore ? 'Загрузка…' : 'Показать ещё'}
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className="fixed left-4 right-4 z-[60] mx-auto max-w-sm rounded-xl px-4 py-2.5 text-center text-[12.5px] text-white border border-white/10 bg-[#1a1a22]/95 backdrop-blur"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)', boxShadow: '0 8px 24px rgba(0,0,0,.45)' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

/* ─── Доказательство ценности на закрытом материале ─────────────────────── */

export function SocialProof({ materialId }: { materialId: number }) {
  const [data, setData] = useState<SocialData | null>(null)
  useEffect(() => {
    let alive = true
    social.get(materialId).then(r => { if (alive && r.ok) setData(r) })
    return () => { alive = false }
  }, [materialId])

  if (!data || (!data.rating_count && !data.comments_count)) return null
  return (
    <div className="mb-5 rounded-xl border border-white/[.08] bg-black/20 px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
        <RatingBadge rating={data.rating} count={data.rating_count} />
        {data.comments_count > 0 && (
          <span className="inline-flex items-center gap-1 text-[12px] text-gray">
            <ChatCircle size={13} /> {data.comments_count} {plural(data.comments_count, 'комментарий', 'комментария', 'комментариев')}
          </span>
        )}
      </div>
      {data.comments.length > 0 && (
        <div className="flex flex-col gap-2 mt-2.5">
          {data.comments.map(c => (
            <div key={c.id} className="text-[12px] leading-[1.5] text-white/65">
              <span className="text-white/85 font-semibold">{c.author}: </span>{c.text}
            </div>
          ))}
          <div className="text-[11px] text-violet/80 mt-0.5">Полное обсуждение — с Premium</div>
        </div>
      )}
    </div>
  )
}

/** Строка «★4.8 · 💬3» для карточек материалов в списке раздела. */
export function CardSocial({ rating, ratingCount, comments }: { rating?: number; ratingCount?: number; comments?: number }) {
  if (!ratingCount && !comments) return null
  return (
    <span className="inline-flex items-center gap-2 text-[10px]" style={{ color: '#8a8a93' }}>
      {!!ratingCount && (
        <span className="inline-flex items-center gap-0.5">
          <Star size={10} weight="fill" className="text-[#FFC94D]" />{(rating ?? 0).toFixed(1)}
        </span>
      )}
      {!!comments && (
        <span className="inline-flex items-center gap-0.5"><ChatCircle size={10} />{comments}</span>
      )}
    </span>
  )
}
