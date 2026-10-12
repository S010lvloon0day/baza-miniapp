import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, ChatCircle, ArrowBendDownRight, Trash, ArrowCounterClockwise, BookOpen, Warning, CheckCircle } from '@phosphor-icons/react'
import { feedback, plural, social, timeAgo } from '../api/social'
import type { FeedComment, FeedCounts, FeedItem, FeedKind, FeedRating } from '../api/social'
import { Composer } from '../components/MaterialSocial'

interface TgWebApp { showConfirm?: (text: string, cb: (ok: boolean) => void) => void }
const tg = (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp
const confirmBox = (text: string): Promise<boolean> =>
  new Promise(resolve => {
    if (tg?.showConfirm) tg.showConfirm(text, (ok: boolean) => resolve(ok))
    else resolve(window.confirm(text))
  })

const FILTERS: { id: FeedKind; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'unanswered', label: 'Без ответа' },
  { id: 'comments', label: 'Комментарии' },
  { id: 'ratings', label: 'Оценки' },
  { id: 'hidden', label: 'Скрытые' },
]

function NewDot() {
  return <span className="shrink-0 w-[7px] h-[7px] rounded-full bg-green" style={{ boxShadow: '0 0 8px #4AE885' }} aria-label="новое" />
}

function MaterialLink({ item, onOpen }: { item: FeedItem; onOpen: (id: number) => void }) {
  return (
    <button onClick={() => onOpen(item.material_id)}
      className="flex items-center gap-1.5 min-w-0 text-left text-[11px] text-green/90 active:text-green">
      <BookOpen size={12} className="shrink-0" />
      <span className="truncate">{item.material_title}</span>
      {item.section_title && <span className="shrink-0 text-gray">· {item.section_title}</span>}
    </button>
  )
}

function RatingCard({ r, onOpen }: { r: FeedRating; onOpen: (id: number) => void }) {
  const low = r.rating <= 2
  return (
    <div className={`rounded-2xl border px-3.5 py-3 ${low ? 'border-[#FF8A5C]/30 bg-[rgba(255,138,92,.05)]' : 'border-white/[.07] bg-[#101014]'}`}>
      <div className="flex items-center gap-2 mb-1.5">
        {r.new && <NewDot />}
        <span className="inline-flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map(n => (
            <Star key={n} size={13} weight={n <= r.rating ? 'fill' : 'regular'}
              className={n <= r.rating ? (low ? 'text-[#FF8A5C]' : 'text-[#FFC94D]') : 'text-white/20'} />
          ))}
        </span>
        <span className="text-[12px] text-white/85 font-semibold truncate">{r.author}</span>
        <span className="ml-auto text-[10.5px] text-gray shrink-0">{timeAgo(r.at)}</span>
      </div>
      <MaterialLink item={r} onOpen={onOpen} />
    </div>
  )
}

function CommentCard({ c, onOpen, onChanged, onToast }: {
  c: FeedComment
  onOpen: (id: number) => void
  onChanged: (patch: Partial<FeedComment> | null) => void
  onToast: (s: string) => void
}) {
  const [replying, setReplying] = useState(false)
  const [sending, setSending] = useState(false)
  const rootId = c.parent_id ?? c.id

  const reply = async (text: string) => {
    setSending(true)
    const r = await social.comment(c.material_id, text, rootId)
    setSending(false)
    if (!r.ok) { onToast(r.message || 'Не удалось отправить'); return false }
    setReplying(false)
    onChanged({ answered: true, replies: c.replies + 1 })
    onToast('Ответ опубликован, автору пришло уведомление')
    return true
  }

  const remove = async () => {
    if (!(await confirmBox(c.parent_id ? 'Удалить ответ?' : 'Удалить комментарий вместе с ответами?'))) return
    const r = await social.remove(c.id)
    if (r.ok) { onChanged(null); onToast('Удалено') } else onToast(r.message || 'Не удалось удалить')
  }

  const restore = async () => {
    const r = await social.restore(c.id)
    if (r.ok) { onChanged({ hidden: false, reports: 0 }); onToast('Комментарий снова виден') }
    else onToast(r.message || 'Не удалось вернуть')
  }

  return (
    <div className={`rounded-2xl border px-3.5 py-3 ${c.hidden ? 'border-[#FF5C7A]/30 bg-[rgba(255,92,122,.05)]' : 'border-white/[.07] bg-[#101014]'}`}>
      <div className="flex items-center gap-2 mb-1.5">
        {c.new && <NewDot />}
        <span className="text-[12.5px] font-semibold text-white/90 truncate">{c.author}</span>
        {!c.parent_id && !c.hidden && (c.answered
          ? <span className="inline-flex items-center gap-0.5 text-[10px] text-green"><CheckCircle size={11} weight="fill" /> отвечено</span>
          : <span className="text-[10px] text-[#FFC94D]">без ответа</span>)}
        <span className="ml-auto text-[10.5px] text-gray shrink-0">{timeAgo(c.at)}</span>
      </div>

      {c.parent_id && c.parent_text && (
        <div className="flex gap-1.5 mb-1.5 text-[11.5px] text-white/45 leading-snug">
          <ArrowBendDownRight size={12} className="shrink-0 mt-0.5" />
          <span className="line-clamp-2">в ответ {c.parent_author}: «{c.parent_text}»</span>
        </div>
      )}

      <div className="text-[13.5px] leading-[1.6] text-white/85 whitespace-pre-wrap break-words mb-2">{c.text}</div>

      {c.hidden && (
        <div className="flex items-center gap-1.5 mb-2 text-[11px] text-[#FF8FA3]">
          <Warning size={13} weight="fill" /> Скрыт жалобами ({c.reports}) — пользователи его не видят
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mb-0.5">
        <MaterialLink item={c} onOpen={onOpen} />
        {c.replies > 0 && !c.parent_id && (
          <span className="shrink-0 inline-flex items-center gap-1 text-[10.5px] text-gray"><ChatCircle size={11} />{c.replies}</span>
        )}
      </div>

      <div className="flex items-center gap-4 mt-2.5 pt-2.5 border-t border-white/[.06]">
        {!c.hidden && (
          <button onClick={() => setReplying(v => !v)}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-green active:opacity-70">
            <ArrowBendDownRight size={14} /> Ответить
          </button>
        )}
        {c.hidden && (
          <button onClick={restore} className="inline-flex items-center gap-1 text-[12px] font-semibold text-green active:opacity-70">
            <ArrowCounterClockwise size={14} /> Вернуть
          </button>
        )}
        <button onClick={remove} className="ml-auto inline-flex items-center gap-1 text-[12px] text-gray active:text-[#FF5C7A]">
          <Trash size={14} /> Удалить
        </button>
      </div>

      {replying && (
        <div className="mt-2.5">
          <Composer compact autoFocus placeholder="Ваш ответ…" sending={sending}
            onSend={reply} onCancel={() => setReplying(false)} />
        </div>
      )}
    </div>
  )
}

export default function FeedbackPage({ onOpenMaterial, onSeen }: {
  onOpenMaterial: (id: number) => void
  /** Лента прочитана — обнулить бейдж на вкладке. */
  onSeen: () => void
}) {
  const [kind, setKind] = useState<FeedKind>('all')
  const [items, setItems] = useState<FeedItem[] | null>(null)
  const [counts, setCounts] = useState<FeedCounts | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const markedSeen = useRef(false)

  const showToast = (s: string) => {
    setToast(s)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }

  const load = useCallback((k: FeedKind) => {
    feedback.list(k).then(r => {
      if (!r.ok) { setError(true); return }
      setError(false)
      setItems(r.items)
      setHasMore(r.has_more)
      setCounts(r.counts)
      // Отмечаем прочитанным один раз, после первой загрузки: подсветка «новое»
      // на уже загруженных карточках остаётся до выхода с экрана.
      if (!markedSeen.current) {
        markedSeen.current = true
        feedback.seen().then(() => onSeen())
      }
    })
  }, [onSeen])

  useEffect(() => { load(kind) }, [kind, load])
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const more = async () => {
    if (!items) return
    setLoadingMore(true)
    const r = await feedback.list(kind, items.length)
    setLoadingMore(false)
    if (r.ok) { setItems([...items, ...r.items]); setHasMore(r.has_more) }
  }

  const patchComment = (id: number, patch: Partial<FeedComment> | null) =>
    setItems(list => list && (patch === null
      ? list.filter(i => !(i.type === 'comment' && i.id === id))
      : list.map(i => (i.type === 'comment' && i.id === id ? { ...i, ...patch } : i))
        // На вкладке «Без ответа» отвеченное уходит, на «Скрытые» — возвращённое.
        .filter(i => !(i.type === 'comment' && i.id === id && (
          (kind === 'unanswered' && i.answered) || (kind === 'hidden' && !i.hidden))))))

  const badge = (id: FeedKind) => {
    if (!counts) return 0
    if (id === 'unanswered') return counts.unanswered
    if (id === 'hidden') return counts.hidden
    return 0
  }

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      <div className="px-4 pt-3">
        {counts && (counts.comments > 0 || counts.ratings > 0) && (
          <div className="mb-3 rounded-xl border border-green/25 bg-[rgba(34,197,94,.06)] px-3.5 py-2.5 text-[12px] text-white/80">
            Новое с прошлого раза: <b className="text-green">{counts.comments}</b> {plural(counts.comments, 'комментарий', 'комментария', 'комментариев')} · <b className="text-green">{counts.ratings}</b> {plural(counts.ratings, 'оценка', 'оценки', 'оценок')}
          </div>
        )}
        <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map(f => {
            const n = badge(f.id)
            const on = kind === f.id
            return (
              <button key={f.id} onClick={() => { setItems(null); setKind(f.id) }}
                className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[12px] transition-colors
                  ${on ? 'border-green/50 bg-[rgba(34,197,94,.14)] text-green' : 'border-white/[.1] text-gray'}`}>
                {f.label}
                {n > 0 && (
                  <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center
                    ${f.id === 'hidden' ? 'bg-[#FF5C7A] text-white' : 'bg-[#FFC94D] text-black'}`}>{n}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {error ? (
        <div className="mx-4 mt-6 text-center text-[13px] text-gray">Не удалось загрузить — откройте экран заново.</div>
      ) : items === null ? (
        <div className="flex justify-center py-12"><div className="w-2 h-2 bg-green rounded-full animate-pulse" /></div>
      ) : items.length === 0 ? (
        <div className="mx-4 mt-4 text-center text-[13px] text-gray py-10 border border-dashed border-white/[.08] rounded-2xl">
          {kind === 'unanswered' ? 'Все вопросы отвечены 👌' : kind === 'hidden' ? 'Скрытых комментариев нет' : 'Пока пусто'}
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-2.5">
          <AnimatePresence initial={false}>
            {items.map(it => (
              <motion.div key={it.type === 'comment' ? `c${it.id}` : `r${it.material_id}-${it.user_id}`}
                layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
                {it.type === 'comment'
                  ? <CommentCard c={it} onOpen={onOpenMaterial} onToast={showToast}
                      onChanged={p => patchComment(it.id, p)} />
                  : <RatingCard r={it} onOpen={onOpenMaterial} />}
              </motion.div>
            ))}
          </AnimatePresence>
          {hasMore && (
            <button onClick={more} disabled={loadingMore}
              className="h-10 mb-2 rounded-xl border border-white/[.1] text-[11.5px] tracking-[1.5px] uppercase text-gray active:border-green/40">
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
    </div>
  )
}
