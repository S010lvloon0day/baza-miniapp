import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { api } from '../api/client'
import type { MaterialProgress, ProgressQuestion } from '../api/client'

const tg = (window as any).Telegram?.WebApp
const haptic = (t: 'success' | 'error') => { try { tg?.HapticFeedback?.notificationOccurred(t) } catch { /* */ } }
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, '0')}`

/**
 * Плашка зачёта в конце материала. Материал засчитывается не при открытии, а когда
 * выполнены условия: время чтения + верный ответ (урок), просмотр до конца (видео),
 * решение (тест/задачи). Всё перепроверяет сервер.
 */
export default function CompletionBar({ materialId, progress }: { materialId: number; progress: MaterialProgress }) {
  const kind = progress.kind
  const [done, setDone] = useState(progress.done)
  const [xp, setXp] = useState<number | null>(null)
  const [left, setLeft] = useState(Math.max(0, (progress.seconds ?? 0) - (progress.elapsed ?? 0)))
  const [reached, setReached] = useState(false)
  const [q, setQ] = useState<ProgressQuestion | null | undefined>(progress.question)
  const [pick, setPick] = useState<number | null>(null)
  const [wrong, setWrong] = useState(false)
  const [cool, setCool] = useState(progress.retry_in ?? 0)
  const [watched, setWatched] = useState(progress.video?.watched ?? 0)
  const [solved, setSolved] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // таймеры
  useEffect(() => {
    if (done) return
    const id = setInterval(() => { setLeft(v => Math.max(0, v - 1)); setCool(v => Math.max(0, v - 1)) }, 1000)
    return () => clearInterval(id)
  }, [done])

  // дочитал до конца — плашка показалась на экране
  useEffect(() => {
    const el = ref.current
    if (!el || reached) return
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) setReached(true) }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [reached])

  const submit = useCallback(async (answer?: number) => {
    if (busy || done) return
    setBusy(true); setMsg('')
    try {
      const r = await api.completeMaterial(materialId, answer !== undefined ? { answer } : {})
      if (r.done) { setDone(true); setXp(r.xp ?? null); haptic('success'); return }
      if (r.error === 'wrong') { setWrong(true); setPick(null); setQ(r.question); setCool(r.retry_in ?? 30); haptic('error'); return }
      if (r.error === 'cooldown') { setCool(r.retry_in ?? 30); return }
      if (r.error === 'too_early') { setLeft(r.wait ?? 10); if (r.message) setMsg(r.message); return }
      if (r.error === 'need_answer' && r.question) { setQ(r.question); return }
      if (r.error === 'video') { setMsg(r.message || 'Досмотрите видео до конца'); return }
    } catch { setMsg('Нет связи, попробуйте ещё раз') } finally { setBusy(false) }
  }, [busy, done, materialId])

  // задачи/тест решены
  useEffect(() => {
    const on = () => setSolved(true)
    window.addEventListener('baza:solved', on)
    return () => window.removeEventListener('baza:solved', on)
  }, [])
  // прогресс видео
  useEffect(() => {
    const on = (e: Event) => setWatched(w => Math.max(w, (e as CustomEvent).detail?.ratio ?? 0))
    window.addEventListener('baza:video', on)
    return () => window.removeEventListener('baza:video', on)
  }, [])

  // автоматический зачёт, когда условия выполнены и вопроса нет
  useEffect(() => {
    if (done || busy) return
    if ((kind === 'tasks' || kind === 'quiz' || kind === 'task') && solved && left === 0) submit()
    else if (kind === 'video' && watched >= 0.95 && left === 0) { const id = setTimeout(() => submit(), 1500); return () => clearTimeout(id) }
    else if (kind === 'glance' && left === 0) submit()
    else if (kind === 'lesson' && !q && left === 0 && reached) submit()
  }, [kind, solved, watched, left, reached, q, done, busy, submit])

  if (!progress.active) return null

  if (done) {
    return (
      <div ref={ref} className="mx-4 mb-4 flex items-center gap-3 px-4 py-3 rounded-[18px] border border-green/25 bg-green/[.07]">
        <span className="w-9 h-9 rounded-full bg-green text-ink grid place-items-center"><Icon name="check" size={18} strokeWidth={2.4} /></span>
        <span className="flex-1">
          <b className="block text-[14.5px] font-semibold">Материал пройден</b>
          {xp !== null && <span className="text-[12.5px] text-gray">{xp > 0 ? `+${xp} XP в рейтинг` : 'Лимит XP на сегодня исчерпан — прогресс засчитан'}</span>}
        </span>
      </div>
    )
  }

  const total = Math.max(1, kind === 'video' ? 1 : (progress.seconds ?? 1))
  const timePct = kind === 'video' ? watched : 1 - left / total
  const title =
    kind === 'video' ? 'Досмотрите видео до конца' :
    kind === 'lesson' ? (left > 0 ? 'Прочитайте урок' : !reached ? 'Долистайте до конца' : q ? 'Проверочный вопрос' : 'Засчитываем…') :
    kind === 'glance' ? 'Засчитается через пару секунд' :
    'Решите задание, чтобы засчитать'

  return (
    <div ref={ref} className="mx-4 mb-4 rounded-[20px] border border-white/[.08] bg-s1 overflow-hidden">
      <div className="px-4 pt-3.5 pb-3 flex items-center gap-3">
        <span className="relative w-10 h-10 shrink-0">
          <svg viewBox="0 0 40 40" className="w-10 h-10 -rotate-90">
            <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="3.5" />
            <circle cx="20" cy="20" r="17" fill="none" stroke="#17E584" strokeWidth="3.5" strokeLinecap="round"
              strokeDasharray={`${Math.min(1, Math.max(0, timePct)) * 106.8} 106.8`} style={{ transition: 'stroke-dasharray .9s linear' }} />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-green"><Icon name={kind === 'video' ? 'play' : kind === 'lesson' ? 'book' : 'task'} size={16} /></span>
        </span>
        <span className="flex-1 min-w-0">
          <b className="block text-[14.5px] font-semibold">{title}</b>
          <span className="block text-[12.5px] text-gray">
            {kind === 'video' ? `Просмотрено ${Math.round(watched * 100)}%${left > 0 && watched >= .95 ? ` · ещё ${mmss(left)}` : ''}` :
             left > 0 ? `Зачёт откроется через ${mmss(left)}` :
             kind === 'lesson' && q ? 'Ответьте верно, чтобы засчитать урок' :
             (kind === 'tasks' || kind === 'quiz' || kind === 'task') && !solved ? 'Засчитается сразу после верного решения' : ''}
            {progress.xp ? ` · +${progress.xp} XP` : ''}
          </span>
        </span>
      </div>

      {kind === 'lesson' && q && left === 0 && reached && (
        <div className="px-4 pb-4 border-t border-white/[.06] pt-3.5">
          <p className="text-[14.5px] font-medium leading-snug whitespace-pre-line mb-3">{q.text}</p>
          <div className="flex flex-col gap-2">
            {q.options.map((o, i) => (
              <button key={i} disabled={cool > 0} onClick={() => { setPick(i); setWrong(false) }}
                className={`text-left px-3.5 py-3 rounded-[14px] border text-[14px] leading-snug transition-colors disabled:opacity-50
                  ${pick === i ? 'border-green bg-green/[.09]' : 'border-white/[.08] bg-white/[.03] active:bg-white/[.06]'}`}>
                {o}
              </button>
            ))}
          </div>
          {wrong && <p className="text-[13px] text-[#FF8A8A] mt-3">Неверно. Перечитайте урок — вопрос сменился.{cool > 0 ? ` Ответить можно через ${cool} с.` : ''}</p>}
          <button className="btn-primary w-full mt-3" disabled={pick === null || cool > 0 || busy} onClick={() => pick !== null && submit(pick)}>
            {cool > 0 ? `Подождите ${cool} с` : busy ? 'Проверяем…' : 'Ответить'}
          </button>
        </div>
      )}
      {msg && <p className="px-4 pb-3 text-[12.5px] text-gold">{msg}</p>}
    </div>
  )
}
