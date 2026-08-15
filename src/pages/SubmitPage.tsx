import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash, CheckCircle, WarningCircle, PaperPlaneTilt, Gift } from '@phosphor-icons/react'
import { api } from '../api/client'
import type { Section } from '../api/client'
import { submitApi, uploadSubmitFile } from '../api/submit'
import type { SubmitStatus, SubmitFile } from '../api/submit'
import MediaTypeIcon from '../components/MediaTypeIcon'

const tg = (window as any).Telegram?.WebApp

const LABEL = 'text-[11px] font-bold tracking-[3px] uppercase text-green'
const FIELD =
  'w-full bg-bg/70 border border-white/[.10] rounded-xl px-3.5 py-3 text-[14px] text-white ' +
  'placeholder:text-gray2 outline-none focus:border-green/60 transition-colors'

let seq = 0
const uid = () => `f${++seq}`

interface Draft {
  uid: string
  name: string
  size: number
  kind: 'photo' | 'video' | 'document'
  status: 'uploading' | 'done' | 'error'
  progress: number
  error?: string
  file: File
  uploaded?: SubmitFile
}

const humanSize = (b: number) =>
  b < 1024 ? `${b} Б` : b < 1048576 ? `${Math.round(b / 1024)} КБ` : `${(b / 1048576).toFixed(1)} МБ`

/**
 * Заявка на публикацию материала — веб-версия формы, которая живёт в боте.
 *
 * Правила (подписка, три заявки в сутки, потолок файлов) проверяет сервер:
 * здесь они только показываются заранее, чтобы человек не заполнял форму
 * впустую и не узнавал об отказе на последнем шаге.
 */
export default function SubmitPage({ onDone }: { onDone?: () => void }) {
  const [status, setStatus] = useState<SubmitStatus | null>(null)
  const [roots, setRoots] = useState<Section[]>([])
  const [subs, setSubs] = useState<Section[]>([])
  const [rootId, setRootId] = useState<number | null>(null)
  const [subId, setSubId] = useState<number | null>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<Draft[]>([])

  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    submitApi.status().then(setStatus).catch(() => setStatus(null))
    api.sections().then(d => setRoots(d.sections)).catch(() => {})
  }, [])

  useEffect(() => {
    if (rootId === null) { setSubs([]); return }
    api.subsections(rootId).then(d => setSubs(d.sections)).catch(() => setSubs([]))
  }, [rootId])

  const sectionId = subId ?? rootId
  const uploading = files.some(f => f.status === 'uploading')
  const ready = files.filter(f => f.status === 'done')

  const patch = (id: string, upd: Partial<Draft>) =>
    setFiles(prev => prev.map(f => (f.uid === id ? { ...f, ...upd } : f)))

  async function send(id: string, file: File) {
    patch(id, { status: 'uploading', progress: 0, error: undefined })
    try {
      const res = await uploadSubmitFile(file, p => patch(id, { progress: p }))
      patch(id, { status: 'done', progress: 100, kind: res.kind, uploaded: res })
      tg?.HapticFeedback?.notificationOccurred?.('success')
    } catch (e: any) {
      patch(id, { status: 'error', error: String(e?.message || e) })
      tg?.HapticFeedback?.notificationOccurred?.('error')
    }
  }

  function addFiles(list: FileList | null) {
    if (!list?.length || !status) return
    const room = status.files_max - files.length
    const picked = Array.from(list).slice(0, Math.max(0, room))
    if (!picked.length) return

    const fresh: Draft[] = picked.map(f => ({
      uid: uid(),
      name: f.name, size: f.size,
      kind: f.type.startsWith('image/') ? 'photo' : f.type.startsWith('video/') ? 'video' : 'document',
      status: 'uploading', progress: 0, file: f,
    }))
    setFiles(prev => [...prev, ...fresh])
    ;(async () => { for (const f of fresh) await send(f.uid, f.file) })()
  }

  const canSend =
    !!sectionId && title.trim().length > 0 && !uploading && !sending &&
    (ready.length > 0 || content.trim().length > 0) && (status?.allowed ?? false)

  async function submit() {
    if (!canSend || !sectionId) return
    setSending(true); setError(null)
    try {
      await submitApi.create({
        section_id: sectionId,
        title: title.trim(),
        content: content.trim(),
        files: ready.map(f => f.uploaded!).filter(Boolean),
      })
      setSent(true)
      tg?.HapticFeedback?.notificationOccurred?.('success')
    } catch (e: any) {
      setError(String(e?.message || e))
      tg?.HapticFeedback?.notificationOccurred?.('error')
    } finally {
      setSending(false)
    }
  }

  // ─── Отправлено ───────────────────────────────────────────────────────────
  if (sent) {
    return (
      <div className="flex-1 overflow-y-auto px-4 pt-16 pb-navsafe flex flex-col items-center text-center">
        <motion.div initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: .25, ease: [0.16, 1, 0.3, 1] }}>
          <CheckCircle size={56} weight="fill" className="text-greenLight" />
        </motion.div>
        <div className="text-[22px] font-display font-extrabold uppercase tracking-[1px] mt-4">
          Отправлено
        </div>
        <p className="text-[14px] text-white/70 mt-2 max-w-[30ch] leading-relaxed">
          Материал ушёл на проверку. Как только его одобрят, он появится в базе,
          а вам придёт уведомление.
        </p>
        <div className="mt-5 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gold/40"
             style={{ background: 'rgba(255,188,46,.08)' }}>
          <Gift size={17} weight="fill" className="text-gold" />
          <span className="text-[13px] text-gold">За одобренный материал начислим Premium</span>
        </div>
        <button onClick={() => onDone?.()}
          className="mt-8 w-full h-12 rounded-xl bg-gradient-to-r from-green to-greenLight
                     text-bg text-[13px] font-bold tracking-[2px] uppercase active:opacity-80">
          Готово
        </button>
      </div>
    )
  }

  // ─── Форма ────────────────────────────────────────────────────────────────
  const blocked = status && !status.allowed

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      <div className="px-4 pt-4">
        <div className="text-[22px] font-display font-extrabold tracking-[1px] uppercase text-white">
          Предложить материал
        </div>
        <p className="text-[13px] text-gray mt-1.5 leading-relaxed">
          Поделитесь полезным — после проверки он попадёт в базу,
          а вам начислят Premium.
        </p>
      </div>

      {status && !blocked && (
        <div className="px-4 pt-3">
          <div className="text-[12px] text-gray2">
            Заявок сегодня: <span className="text-white/80">{status.used_today}</span> из {status.daily_limit}
          </div>
        </div>
      )}

      {blocked && (
        <div className="mx-4 mt-4 rounded-xl border border-gold/40 px-3.5 py-3 flex items-start gap-2.5"
             style={{ background: 'rgba(255,188,46,.08)' }}>
          <WarningCircle size={18} weight="fill" className="text-gold shrink-0 mt-px" />
          <div className="text-[13px] text-gold leading-relaxed">{status?.message}</div>
        </div>
      )}

      <fieldset disabled={!!blocked} className={blocked ? 'opacity-40 pointer-events-none' : ''}>
        <div className="px-4 pt-5">
          <div className={LABEL + ' pb-2'}>Раздел</div>
          <select value={rootId ?? ''} onChange={e => { setRootId(Number(e.target.value) || null); setSubId(null) }}
            className={FIELD}>
            <option value="">Выберите раздел</option>
            {roots.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.title}</option>)}
          </select>
        </div>

        {rootId !== null && subs.length > 0 && (
          <div className="px-4 pt-4">
            <div className={LABEL + ' pb-2'}>Подраздел</div>
            <select value={subId ?? ''} onChange={e => setSubId(Number(e.target.value) || null)}
              className={FIELD}>
              <option value="">Без подраздела — прямо в раздел</option>
              {subs.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.title}</option>)}
            </select>
          </div>
        )}

        <div className="px-4 pt-5">
          <div className={LABEL + ' pb-2 flex items-center justify-between'}>
            <span>Название</span>
            <span className="text-gray2 tracking-normal normal-case font-normal">
              {title.length}/{status?.title_max ?? 150}
            </span>
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)}
            maxLength={status?.title_max ?? 150}
            placeholder="О чём материал" className={FIELD} />
        </div>

        <div className="px-4 pt-5">
          <div className={LABEL + ' pb-2 flex items-center justify-between'}>
            <span>Описание</span>
            <span className="text-gray2 tracking-normal normal-case font-normal">
              {content.length}/{status?.content_max ?? 4000}
            </span>
          </div>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={5}
            maxLength={status?.content_max ?? 4000}
            placeholder="Текст материала или пояснение к файлам" className={FIELD + ' resize-y'} />
        </div>

        <div className="px-4 pt-6 flex items-center justify-between">
          <div className={LABEL}>Файлы · {files.length}</div>
          <div className="text-[11px] text-gray2">не больше {status?.files_max ?? 10}</div>
        </div>

        <div className="px-4 pt-2">
          <input ref={input} type="file" multiple hidden
            onChange={e => { addFiles(e.target.files); e.currentTarget.value = '' }} />
          <button onClick={() => input.current?.click()}
            disabled={files.length >= (status?.files_max ?? 10)}
            className="w-full h-11 border border-green flex items-center justify-center gap-1.5
                       text-green text-[12px] font-semibold tracking-[1.5px] uppercase rounded-xl
                       active:bg-[rgba(34,197,94,.10)] disabled:opacity-30">
            <Plus size={16} weight="bold" /> Добавить файлы
          </button>
        </div>

        <div className="px-4 pt-3 flex flex-col gap-2">
          {files.map(f => (
            <div key={f.uid} className="rounded-xl border border-white/[.08] bg-s2/40 overflow-hidden">
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <MediaTypeIcon type={f.kind} size={26} iconSize={13} radius={8} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-white/85 font-semibold truncate">{f.name}</div>
                  <div className="text-[10px] text-gray">
                    {f.status === 'error'
                      ? <span className="text-gold">{f.error}</span>
                      : f.status === 'done'
                        ? `${humanSize(f.size)} · загружен`
                        : `${humanSize(f.size)} · ${f.progress}%`}
                  </div>
                </div>
                {f.status === 'done' && <CheckCircle size={17} weight="fill" className="text-greenLight shrink-0" />}
                {f.status === 'error' && (
                  <button onClick={() => send(f.uid, f.file)}
                    className="text-[10px] text-gold border border-gold/50 rounded-md px-2 py-1 shrink-0">
                    ещё раз
                  </button>
                )}
                <button onClick={() => setFiles(p => p.filter(x => x.uid !== f.uid))}
                  className="text-gray2 p-1 shrink-0"><Trash size={15} weight="bold" /></button>
              </div>
              {f.status === 'uploading' && (
                <div className="h-0.5 bg-bd2">
                  <div className="h-full bg-green transition-all" style={{ width: `${f.progress}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mx-4 mt-4 rounded-xl border border-gold/40 px-3.5 py-3 text-[13px] text-gold"
              style={{ background: 'rgba(255,188,46,.08)' }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-4 pt-5">
          <button onClick={submit} disabled={!canSend}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-green to-greenLight
                       text-bg text-[13px] font-bold tracking-[2px] uppercase
                       flex items-center justify-center gap-2
                       disabled:opacity-30 active:opacity-80">
            <PaperPlaneTilt size={17} weight="fill" />
            {sending ? 'Отправляю…' : uploading ? 'Файлы грузятся…' : 'Отправить на проверку'}
          </button>
        </div>
      </fieldset>
    </div>
  )
}
