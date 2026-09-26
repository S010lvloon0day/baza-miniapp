import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, TextT, Trash, CheckCircle, WarningCircle, ArrowUp, ArrowDown, MagnifyingGlass,
  SortAscending,
} from '@phosphor-icons/react'
import MediaTypeIcon from '../../components/MediaTypeIcon'
import { uploadApi, uploadFile } from '../../api/upload'
import type { AdminSection, DraftAttachment } from '../../api/upload'

const tg = (window as any).Telegram?.WebApp

const LABEL = 'text-[11px] font-bold tracking-[3px] uppercase text-green'
const FIELD =
  'w-full bg-bg/70 border border-white/[.10] rounded-xl px-3.5 py-3 text-[14px] text-white ' +
  'placeholder:text-gray2 outline-none focus:border-green/60 transition-colors'

let uidSeq = 0
const nextUid = () => `a${++uidSeq}`

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

// Номер урока в начале названия: «1.Intro», «01 - Intro», «Урок 3. …».
const NUM_RE = /^\s*(?:урок|лекция|часть|глава|модуль|lesson|lecture|part|chapter|module|#|№)?\s*(\d{1,4})(?!\d)/i

function leadingNumber(s: string): number | null {
  const m = NUM_RE.exec(s || '')
  return m ? parseInt(m[1], 10) : null
}

/** Имя файла без расширения — готовое название материала. */
function fileStem(name: string): string {
  return name.replace(/\.[^.]{1,5}$/, '').replace(/_/g, ' ').trim()
}

/**
 * Стабильная сортировка по номеру в названии. Проводник и Telegram отдают файлы
 * в порядке выбора, а не по урокам — отсюда «12.Strategies» между 4 и 5.
 */
function sortByNumber<T extends DraftAttachment>(list: T[]): T[] {
  const label = (i: DraftAttachment) => (i.kind === 'text' ? '' : i.title || i.name)
  return list
    .map((it, idx) => ({ it, idx, n: leadingNumber(label(it)) }))
    .sort((a, b) =>
      (a.n === null ? 1 : 0) - (b.n === null ? 1 : 0) || (a.n ?? 0) - (b.n ?? 0) || a.idx - b.idx)
    .map(x => x.it)
}

/**
 * Загрузка материала из мини-аппа — второй путь в дополнение к боту.
 *
 * Файлы уходят на сервер сразу при выборе, по одному, с прогрессом: на мобильном
 * интернете отправка видео без индикатора неотличима от зависшего приложения.
 * Материал собирается отдельной кнопкой, когда всё долетело.
 */
export default function UploadPage() {
  const [sections, setSections] = useState<AdminSection[]>([])
  // Раздел и подраздел выбираются РАЗДЕЛЬНО. Один список с путями «Раздел ›
  // Подраздел» обрезается на узком экране, и легко промахнуться уровнем.
  const [rootId, setRootId] = useState<number | null>(null)
  const [subId, setSubId] = useState<number | null>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPremium, setIsPremium] = useState(false)
  // Режим курса: каждый файл становится отдельным материалом, по номерам.
  const [perFile, setPerFile] = useState(false)
  const [batchInfo, setBatchInfo] = useState<string | null>(null)
  const [items, setItems] = useState<DraftAttachment[]>([])

  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    uploadApi.sections()
      .then(setSections)
      .catch(() => setResult({ ok: false, text: 'Не удалось загрузить список разделов' }))
  }, [])

  const roots = useMemo(() => sections.filter(s => !s.parent_id), [sections])
  const subs = useMemo(
    () => (rootId ? sections.filter(s => s.parent_id === rootId) : []),
    [sections, rootId],
  )
  // Публикуем в подраздел, если он выбран, иначе в сам раздел.
  const sectionId = subId ?? rootId

  const uploading = items.some(i => i.kind !== 'text' && i.status === 'uploading')
  const hasErrors = items.some(i => i.kind !== 'text' && i.status === 'error')
  const readyFiles = items.filter(i => i.kind !== 'text' && i.status === 'done').length

  const chooseRoot = (id: number) => {
    setRootId(id)
    setSubId(null)   // подраздел прежнего раздела здесь не при чём
  }

  const patch = (uid: string, upd: Partial<DraftAttachment>) =>
    setItems(prev => prev.map(i => (i.uid === uid ? ({ ...i, ...upd } as DraftAttachment) : i)))

  async function startUpload(uid: string, file: File) {
    patch(uid, { status: 'uploading', progress: 0 })
    try {
      const res = await uploadFile(file, p => patch(uid, { progress: p }))
      patch(uid, {
        status: 'done', progress: 100, kind: res.kind,
        file_id: res.file_id, channel_message_id: res.channel_message_id,
      })
      tg?.HapticFeedback?.notificationOccurred?.('success')
    } catch (e: any) {
      patch(uid, { status: 'error', error: String(e?.message || e) })
      tg?.HapticFeedback?.notificationOccurred?.('error')
    }
  }

  function addFiles(list: FileList | null) {
    if (!list?.length) return
    let fresh: DraftAttachment[] = Array.from(list).map(f => ({
      uid: nextUid(),
      kind: f.type.startsWith('image/') ? 'photo' : f.type.startsWith('video/') ? 'video' : 'document',
      name: f.name, size: f.size, caption: '', title: fileStem(f.name),
      status: 'pending', progress: 0, file: f,
    }))
    // Выбор в проводнике не гарантирует порядок — ставим по номеру в имени,
    // и грузим тоже по порядку.
    fresh = sortByNumber(fresh)
    setItems(prev => (perFile ? sortByNumber([...prev, ...fresh]) : [...prev, ...fresh]))
    // По одному: параллельная отправка нескольких видео забивает канал и
    // прогресс становится невозможно читать.
    ;(async () => {
      for (const it of fresh) {
        if (it.kind !== 'text' && it.file) await startUpload(it.uid, it.file)
      }
    })()
  }

  const addText = () =>
    setItems(prev => [...prev, { uid: nextUid(), kind: 'text', text: '' }])

  const remove = (uid: string) => setItems(prev => prev.filter(i => i.uid !== uid))

  const sortNow = () => setItems(prev => sortByNumber(prev))

  const move = (uid: string, dir: -1 | 1) =>
    setItems(prev => {
      const i = prev.findIndex(x => x.uid === uid)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const copy = [...prev]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    })

  const canSave = perFile
    ? !!sectionId && !uploading && !saving && readyFiles > 0
    : !!sectionId && title.trim().length > 0 && !uploading && !saving &&
      (readyFiles > 0 || content.trim().length > 0 ||
       items.some(i => i.kind === 'text' && i.text.trim()))

  // Режим курса: каждый загруженный файл — свой материал, в порядке списка.
  async function saveBatch() {
    if (!sectionId) return
    const queue = items.filter(i => i.kind !== 'text' && i.status === 'done')
    setSaving(true)
    setResult(null)
    let made = 0
    try {
      for (const it of queue) {
        if (it.kind === 'text') continue
        setBatchInfo(`Создаю ${made + 1} из ${queue.length}…`)
        await uploadApi.createMaterial({
          section_id: sectionId,
          title: ((it.title || '').trim() || fileStem(it.name)).slice(0, 200),
          content: '',
          is_premium: isPremium,
          attachments: [{ kind: it.kind, file_id: it.file_id,
            channel_message_id: it.channel_message_id, name: it.name, caption: null }],
        })
        made++
        // Созданное сразу убираем — повтор после ошибки не задвоит материалы.
        setItems(prev => prev.filter(x => x.uid !== it.uid))
      }
      setResult({ ok: true, text: `Создано материалов: ${made}` })
      tg?.HapticFeedback?.notificationOccurred?.('success')
    } catch (e: any) {
      setResult({ ok: false, text:
        `Создано ${made} из ${queue.length}. Ошибка: ${String(e?.message || e)}. ` +
        'Оставшиеся файлы в списке — нажмите «Создать» ещё раз.' })
      tg?.HapticFeedback?.notificationOccurred?.('error')
    } finally {
      setSaving(false)
      setBatchInfo(null)
    }
  }

  async function save() {
    if (!canSave || !sectionId) return
    if (perFile) return saveBatch()
    setSaving(true)
    setResult(null)
    try {
      const attachments = items
        .filter(i => i.kind === 'text' ? i.text.trim() : i.status === 'done')
        .map(i => i.kind === 'text'
          ? { kind: 'text', text: i.text }
          : { kind: i.kind, file_id: i.file_id, channel_message_id: i.channel_message_id,
              name: i.name, caption: i.caption || null })

      const res = await uploadApi.createMaterial({
        section_id: sectionId, title: title.trim(), content: content.trim(),
        is_premium: isPremium, attachments,
      })
      setResult({ ok: true, text: `Материал создан · вложений: ${res.attachments}` })
      tg?.HapticFeedback?.notificationOccurred?.('success')
      setTitle(''); setContent(''); setItems([]); setIsPremium(false)
    } catch (e: any) {
      setResult({ ok: false, text: String(e?.message || e) })
      tg?.HapticFeedback?.notificationOccurred?.('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto pb-28">
      <div className="px-4 pt-4 pb-2">
        <div className="text-[22px] font-display font-extrabold tracking-[1px] uppercase text-white">
          Загрузка материала
        </div>
        <div className="text-[12px] text-gray mt-1">
          Файлы уходят в хранилище сразу. Материал создаётся кнопкой внизу.
        </div>
      </div>

      {/* ── Раздел и подраздел — раздельно ── */}
      <div className="px-4 pt-4">
        <div className={LABEL + ' pb-2'}>Раздел</div>
        <SectionSelect
          items={roots}
          value={rootId}
          placeholder="Выберите раздел"
          onPick={chooseRoot}
        />
      </div>

      {rootId !== null && subs.length > 0 && (
        <div className="px-4 pt-5">
          <div className={LABEL + ' pb-2'}>Подраздел</div>
          <SectionSelect
            items={subs}
            value={subId}
            placeholder="Без подраздела — прямо в раздел"
            clearable
            onPick={setSubId}
            onClear={() => setSubId(null)}
          />
        </div>
      )}

      {/* ── Режим ── */}
      <div className="px-4 pt-5">
        <div className={LABEL + ' pb-2'}>Режим</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: false, t: 'Один материал', d: 'все файлы внутри одного' },
            { v: true, t: 'Каждый файл отдельно', d: 'курс: уроки по номерам' },
          ].map(o => (
            <button key={String(o.v)}
              onClick={() => {
                setPerFile(o.v)
                if (o.v) setItems(prev => sortByNumber(prev.filter(i => i.kind !== 'text')))
              }}
              className={`rounded-xl border px-3 py-2.5 text-left transition-colors
                          ${perFile === o.v ? 'border-green bg-[rgba(34,197,94,.08)]' : 'border-white/[.10]'}`}>
              <div className={`text-[13px] font-semibold ${perFile === o.v ? 'text-green' : 'text-white/85'}`}>
                {o.t}
              </div>
              <div className="text-[10px] text-gray mt-0.5">{o.d}</div>
            </button>
          ))}
        </div>
        {perFile && (
          <div className="text-[11px] text-gray mt-2">
            Название каждого материала берётся из имени файла — его можно поправить.
            Файлы с номерами (1., 2., …) встают по порядку сами.
          </div>
        )}
      </div>

      {!perFile && (<>
      {/* ── Заголовок и описание ── */}
      <div className="px-4 pt-5">
        <div className={LABEL + ' pb-2'}>Название</div>
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
          placeholder="Название материала" className={FIELD} />
      </div>

      <div className="px-4 pt-5">
        <div className={LABEL + ' pb-2'}>Описание</div>
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={4}
          placeholder="Необязательно" className={FIELD + ' resize-y'} />
      </div>
      </>)}

      <div className="px-4 pt-5">
        <button onClick={() => setIsPremium(p => !p)}
          className="w-full flex items-center justify-between rounded-xl border border-white/[.10] px-3.5 py-3">
          <span className="text-[14px] text-white/85">Только для Premium</span>
          <span className={`w-11 h-6 rounded-full relative transition-colors
                            ${isPremium ? 'bg-green' : 'bg-bd2'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all
                              ${isPremium ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
        </button>
      </div>

      {/* ── Вложения ── */}
      <div className="px-4 pt-6 flex items-center justify-between">
        <div className={LABEL}>Вложения · {items.length}</div>
        <div className="flex items-center gap-3">
          {readyFiles > 0 && (
            <div className="text-[11px] text-gray">в хранилище: {readyFiles}</div>
          )}
          {items.filter(i => i.kind !== 'text').length > 1 && (
            <button onClick={sortNow}
              className="flex items-center gap-1 text-[11px] text-green font-semibold active:opacity-70">
              <SortAscending size={14} weight="bold" /> По номеру
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-2 flex gap-2">
        <input ref={fileInput} type="file" multiple hidden
          onChange={e => { addFiles(e.target.files); e.currentTarget.value = '' }} />
        <button onClick={() => fileInput.current?.click()}
          className="flex-1 h-11 border border-green flex items-center justify-center gap-1.5
                     text-green text-[12px] font-semibold tracking-[1.5px] uppercase rounded-xl
                     active:bg-[rgba(34,197,94,.10)]">
          <Plus size={16} weight="bold" /> Файлы
        </button>
        {!perFile && <button onClick={addText}
          className="flex-1 h-11 border border-[rgba(255,255,255,.14)] bg-gradient-to-b from-white/[.06] to-white/[.02]
                     flex items-center justify-center gap-1.5 text-white/85 text-[12px] font-semibold
                     tracking-[1.5px] uppercase rounded-xl active:opacity-70">
          <TextT size={16} weight="bold" /> Текст
        </button>}
      </div>

      <div className="px-4 pt-3 flex flex-col gap-2">
        {items.map((it, idx) => (
          <div key={it.uid} className="rounded-xl border border-white/[.08] bg-s2/40 overflow-hidden">
            <div className="flex items-center gap-2.5 px-3 py-2.5">
              {it.kind === 'text'
                ? <TextT size={22} className="text-green shrink-0" />
                : <MediaTypeIcon type={it.kind} size={26} iconSize={13} radius={8} />}

              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-white/85 font-semibold truncate">
                  {it.kind === 'text' ? `Текстовый блок ${idx + 1}` : it.name}
                </div>
                <div className="text-[10px] text-gray">
                  {it.kind === 'text'
                    ? `${it.text.length} символов`
                    : it.status === 'error'
                      ? <span className="text-gold">{it.error}</span>
                      : it.status === 'done'
                        ? `${humanSize(it.size)} · в хранилище`
                        : it.status === 'uploading'
                          ? `${humanSize(it.size)} · ${it.progress}%`
                          : humanSize(it.size)}
                </div>
              </div>

              {it.kind !== 'text' && it.status === 'done' && (
                <CheckCircle size={18} weight="fill" className="text-greenLight shrink-0" />
              )}
              {it.kind !== 'text' && it.status === 'error' && (
                <WarningCircle size={18} weight="fill" className="text-gold shrink-0" />
              )}

              <button onClick={() => move(it.uid, -1)} disabled={idx === 0}
                className="text-gray2 disabled:opacity-25 p-1"><ArrowUp size={14} weight="bold" /></button>
              <button onClick={() => move(it.uid, 1)} disabled={idx === items.length - 1}
                className="text-gray2 disabled:opacity-25 p-1"><ArrowDown size={14} weight="bold" /></button>
              <button onClick={() => remove(it.uid)} className="text-gray2 p-1">
                <Trash size={15} weight="bold" />
              </button>
            </div>

            {it.kind !== 'text' && it.status === 'uploading' && (
              <div className="h-0.5 bg-bd2">
                <div className="h-full bg-green transition-all" style={{ width: `${it.progress}%` }} />
              </div>
            )}

            {it.kind === 'text' ? (
              <div className="px-3 pb-3">
                <textarea value={it.text} rows={3} placeholder="Текст блока"
                  onChange={e => patch(it.uid, { text: e.target.value })}
                  className={FIELD + ' text-[13px] resize-y'} />
              </div>
            ) : perFile ? (
              <div className="px-3 pb-3">
                <input value={it.title ?? ''} placeholder="Название материала"
                  onChange={e => patch(it.uid, { title: e.target.value })}
                  className={FIELD + ' text-[13px] py-2'} />
              </div>
            ) : it.status === 'done' && (
              <div className="px-3 pb-3">
                <input value={it.caption} placeholder="Подпись к файлу (необязательно)"
                  onChange={e => patch(it.uid, { caption: e.target.value })}
                  className={FIELD + ' text-[13px] py-2'} />
              </div>
            )}

            {it.kind !== 'text' && it.status === 'error' && it.file && (
              <div className="px-3 pb-3">
                <button onClick={() => startUpload(it.uid, it.file!)}
                  className="w-full h-9 border border-gold text-gold text-[11px] font-semibold
                             tracking-[1.5px] uppercase rounded-lg active:opacity-70">
                  Повторить
                </button>
              </div>
            )}
          </div>
        ))}

        {!items.length && (
          <div className="py-6 text-center text-[13px] text-gray2">
            Пока пусто. Добавьте файлы или текстовые блоки —<br />они попадут в один материал.
          </div>
        )}
      </div>

      {/* ── Результат ── */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`mx-4 mt-4 rounded-xl border px-3.5 py-3 text-[13px]
                        ${result.ok ? 'border-green/40 text-greenLight' : 'border-gold/40 text-gold'}`}>
            {result.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Создать ── */}
      <div className="px-4 pt-5">
        <button onClick={save} disabled={!canSave}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-green to-greenLight
                     text-bg text-[13px] font-bold tracking-[2px] uppercase
                     disabled:opacity-30 active:opacity-80">
          {saving ? (batchInfo || 'Создаю…')
            : uploading ? 'Файлы ещё грузятся…'
            : perFile ? `Создать материалы (${readyFiles})` : 'Создать материал'}
        </button>
        {hasErrors && (
          <div className="text-[11px] text-gold text-center pt-2">
            Часть файлов не загрузилась — они не попадут в материал.
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Выпадающий выбор одного уровня иерархии. Поиск включается, когда вариантов
 * много: разделов под две сотни, листать их бессмысленно.
 */
function SectionSelect({
  items, value, placeholder, onPick, clearable, onClear,
}: {
  items: AdminSection[]
  value: number | null
  placeholder: string
  onPick: (id: number) => void
  clearable?: boolean
  onClear?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const chosen = items.find(i => i.id === value) || null
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? items.filter(i => i.title.toLowerCase().includes(needle)) : items
  }, [items, q])

  return (
    <>
      <button onClick={() => setOpen(o => !o)}
        className={FIELD + ' text-left flex items-center justify-between gap-2'}>
        <span className={chosen ? 'text-white truncate' : 'text-gray2 truncate'}>
          {chosen ? `${chosen.emoji} ${chosen.title}` : placeholder}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {chosen && clearable && (
            <span role="button" onClick={e => { e.stopPropagation(); onClear?.() }}
                  className="text-gray2 text-[16px] leading-none px-1">×</span>
          )}
          <span className="text-gray2">{open ? '▲' : '▼'}</span>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
            className="overflow-hidden">
            <div className="mt-2 rounded-xl border border-white/[.10] bg-s2/60">
              {items.length > 8 && (
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[.06]">
                  <MagnifyingGlass size={14} className="text-gray2 shrink-0" />
                  <input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск"
                    className="w-full bg-transparent text-[13px] text-white placeholder:text-gray2 outline-none" />
                </div>
              )}
              <div className="max-h-64 overflow-y-auto">
                {shown.map(i => (
                  <button key={i.id}
                    onClick={() => { onPick(i.id); setOpen(false); setQ('') }}
                    className={`w-full text-left px-3 py-2.5 text-[13px] border-b border-white/[.04]
                                flex items-center justify-between gap-2 active:bg-bd2
                                ${i.id === value ? 'text-green' : 'text-white/85'}`}>
                    <span className="truncate">{i.emoji} {i.title}</span>
                    {i.children > 0 && (
                      <span className="text-[10px] text-gray2 shrink-0">{i.children} подр.</span>
                    )}
                  </button>
                ))}
                {!shown.length && (
                  <div className="px-3 py-4 text-[13px] text-gray2 text-center">Ничего не найдено</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
