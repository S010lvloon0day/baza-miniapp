import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, API_BASE } from '../api/client'
import Icon from '../components/Icon'
import PremiumBadge from '../components/PremiumBadge'
import type { Material } from '../api/client'
import MediaTypeIcon from '../components/MediaTypeIcon'
import CopyButton from '../components/CopyButton'
import AttachmentBlock from '../components/AttachmentBlock'
import { useResume, ResumeHint } from '../hooks/useResume'
import { renderWithLinks } from '../components/RichText'
import QuizCard, { parseQuiz } from '../components/QuizCard'
import TaskCard, { parseTask } from '../components/TaskCard'
import MarkdownLite from '../components/MarkdownLite'
import MaterialSocial, { SocialProof } from '../components/MaterialSocial'
import LevelMark from '../components/LevelMark'

// react-pdf/pdfjs-dist is a large dependency (~1MB) only needed by the small fraction of
// users who actually open a PDF document — lazy-load it so the main bundle (and every other
// page: Home, Categories, Profile, etc.) doesn't pay that cost on initial load.
const PdfViewer = lazy(() => import('../components/PdfViewer'))

const tg = (window as any).Telegram?.WebApp
const typeLabel = (t: string) => ({ photo: 'Фото', video: 'Видео', document: 'Документ', text: 'Текст', quiz: 'Тест', task: 'Задание', doc: 'Урок' }[t] ?? t)

interface Props {
  materialId: number
  sectionId: number
  botUsername?: string
  onUpgrade?: () => void
  onNavId?: (id: number) => void
}

export default function MaterialPage({ materialId, sectionId, botUsername, onUpgrade, onNavId }: Props) {
  const [mat, setMat] = useState<Material | null>(null)
  const [docText, setDocText] = useState<string | null>(null)
  const [docTruncated, setDocTruncated] = useState(false)
  const [docPreview, setDocPreview] = useState<'loading' | 'text' | 'pdf' | 'error' | 'download'>('loading')
  const [videoError, setVideoError] = useState(false)
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  const resume = useResume(videoEl, materialId, 0)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sectionMats, setSectionMats] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const curId = useRef(materialId)

  useEffect(() => {
    if (!sectionId) return
    api.materials(sectionId, 0).then(async d => {
      let allIds = d.materials.map(m => m.id)
      const totalPages = Math.ceil(d.total / 10)
      if (totalPages > 1) {
        const rest = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) => api.materials(sectionId, i + 1))
        )
        rest.forEach(pd => { allIds = [...allIds, ...pd.materials.map(m => m.id)] })
      }
      setSectionMats(allIds)
    }).catch(() => {})
  }, [sectionId])

  useEffect(() => {
    let alive = true
    curId.current = materialId
    setLoading(true)
    setMat(null)
    setDocText(null)
    setDocTruncated(false)
    setDocPreview('loading')
    setVideoError(false)
    setSending(false)
    setSent(false)

    api.material(materialId).then(d => {
      if (!alive || curId.current !== materialId) return
      setMat(d)
    }).catch(() => {}).finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [materialId])

  useEffect(() => {
    if (!mat || mat.media_type !== 'document' || !mat.file_url) return
    // Архивы и бинарники не превьюим — их только скачивают.
    const fname = String((mat.attachments && mat.attachments[0] && mat.attachments[0].name) || '').toLowerCase()
    const ext = fname.includes('.') ? fname.split('.').pop() || '' : ''
    const NO_PREVIEW = ['zip','rar','7z','tar','gz','tgz','bz2','xz','exe','apk','dmg','iso','msi','bin','deb','jar','apk']
    if (NO_PREVIEW.includes(ext)) { setDocPreview('download'); return }
    setDocPreview('loading')
    api.documentText(materialId)
      .then(data => {
        setDocText(data.text)
        setDocTruncated(data.truncated ?? false)
        setDocPreview('text')
      })
      .catch(err => {
        // 415 = не текст. Это PDF (превью через pdf.js) — иначе просто скачивание.
        const msg = String(err?.message || '')
        if (!msg.includes('415')) { setDocPreview('error'); return }
        setDocPreview(ext === 'pdf' || ext === '' ? 'pdf' : 'download')
      })
  }, [mat, materialId])

  const idx = sectionMats.indexOf(materialId)
  const prevId = idx > 0 ? sectionMats[idx - 1] : null
  const nextId = idx >= 0 && idx < sectionMats.length - 1 ? sectionMats[idx + 1] : null

  const navigate = (id: number) => onNavId?.(id)

  const [editingIdx, setEditingIdx] = useState(false)
  const [idxInput, setIdxInput] = useState('')
  const commitIdxJump = () => {
    const n = parseInt(idxInput, 10)
    if (Number.isFinite(n)) {
      const clamped = Math.min(Math.max(n, 1), sectionMats.length)
      const targetId = sectionMats[clamped - 1]
      if (targetId !== undefined && targetId !== materialId) navigate(targetId)
    }
    setEditingIdx(false)
  }

  // Материал с несколькими вложениями рендерится списком блоков. Материалы
  // с одним вложением идут прежним путём — их 2391 штука, трогать нечего.
  const atts = mat?.attachments ?? []
  const multi = atts.length > 1
  // В материале с несколькими вложениями фото показываем сразу под названием
  // как презентацию, а файлы (документы/видео/текст) — отдельным блоком ниже.
  const photoAtts = multi ? atts.filter(a => a.kind === 'photo') : []
  const fileAtts = multi ? atts.filter(a => a.kind !== 'photo') : []

  const initData = encodeURIComponent(tg?.initData || '')
  const furl = mat?.file_url ? `${API_BASE}${mat.file_url}?init_data=${initData}` : null

  const openExternal = () => {
    if (!furl) return
    if (tg?.openLink) tg.openLink(furl)
    else window.open(furl, '_blank')
  }

  const openInTelegram = async () => {
    if (sending || sent) return
    setSending(true)
    try {
      await api.sendFile(materialId)
      setSent(true)
      if (botUsername) {
        setTimeout(() => {
          if (tg?.openTelegramLink) tg.openTelegramLink(`https://t.me/${botUsername}`)
        }, 800)
      }
    } catch {
      setSending(false)
    }
  }

  const TgButton = ({ prominent = false }: { prominent?: boolean }) => (
    <button
      onClick={openInTelegram}
      disabled={sending}
      className={prominent ? 'btn-primary w-full' : 'btn-secondary w-full'}
    >
      <Icon name={sent ? 'check' : 'send'} size={prominent ? 18 : 17} accent="current" />
      {sent ? 'Отправлено в Telegram' : sending ? 'Отправка…' : 'Получить в Telegram'}
    </button>
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-navsafe">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex justify-center py-16">
              <div className="w-1.5 h-1.5 bg-green/70 rounded-full animate-pulse" />
            </motion.div>
          ) : mat?.premium_required ? (
            <motion.div key="lock" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="card-gold mx-4 mt-4 px-5 pt-7 pb-5 flex flex-col items-center text-center">
              <div className="gold-metal sheen w-16 h-16 rounded-[20px] grid place-items-center mb-4">
                <Icon name="crown" size={30} accent="#3A2300" className="relative z-[1] text-[#3A2300]" />
              </div>
              <PremiumBadge small className="mb-3" />
              <h2 className="font-display font-semibold text-[19px] leading-tight mb-2" style={{ textWrap: 'balance' } as React.CSSProperties}>
                Материал открыт по подписке
              </h2>
              <p className="text-[14px] text-gray leading-relaxed mb-5 max-w-[300px]">
                Оформите Premium, чтобы открыть этот и все остальные материалы базы.
              </p>
              <div className="w-full list-group text-left mb-4">
                {[
                  { i: 'library' as const, label: 'Все материалы и курсы базы' },
                  { i: 'stars' as const, label: 'Оплата картой, Stars или криптой' },
                  { i: 'check' as const, label: 'Доступ сразу после оплаты' },
                ].map(b => (
                  <div key={b.label} className="flex items-center gap-3 px-4 py-3">
                    <Icon name={b.i} size={18} className="text-gold" accent="#F5C25A" />
                    <span className="text-[14px] text-fg/90">{b.label}</span>
                  </div>
                ))}
              </div>
              <div className="w-full mb-4"><SocialProof key={materialId} materialId={materialId} /></div>
              <button onClick={onUpgrade} className="btn-gold gold-metal sheen w-full">
                <b>Открыть Premium</b>
                <small>Вся база по одной подписке</small>
              </button>
            </motion.div>
          ) : mat ? (
            <motion.div key={`mat-${materialId}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }} className="pb-2">

              <div className="px-4 pt-4 pb-4">
                <div className="flex items-center gap-2 mb-2.5 text-[13px] text-gray">
                  <MediaTypeIcon type={mat.is_archive ? 'document' : mat.media_type} size={26} radius={8} iconSize={15} tone="green" />
                  <span>{mat.is_archive ? 'Архив' : typeLabel(mat.media_type)}</span>
                  {mat.section_title && <><span className="w-1 h-1 rounded-full bg-gray2" /><span className="truncate">{mat.section_title}</span></>}
                </div>
                <h1 className="font-display font-semibold text-[22px] leading-[1.25]" style={{ textWrap: 'balance' } as React.CSSProperties}>
                  <LevelMark level={(mat as { title_level?: string }).title_level} size={14} />{mat.title}
                </h1>
              </div>

              {/* ── PHOTO ── */}
              {!multi && mat.media_type === 'photo' && furl && (
                <div className="mx-4 mb-4">
                  <img src={furl} alt={mat.title} loading="lazy"
                    className="w-full rounded-[18px] border border-white/[.07] block"
                    onError={e => (e.currentTarget.style.display = 'none')} />
                </div>
              )}

              {/* ── Фото-галерея (мульти-вложения) — сразу под названием, без скачивания ── */}
              {multi && photoAtts.length > 0 && (
                <div className="mx-4 mb-4 flex flex-col gap-3">
                  {photoAtts.map(a => {
                    const purl = a.url ? `${API_BASE}${a.url}?init_data=${initData}` : null
                    return purl ? (
                      <img key={a.id} src={purl} alt={mat.title} loading="lazy"
                        className="w-full rounded-[18px] border border-white/[.07] block"
                        onError={e => (e.currentTarget.style.display = 'none')} />
                    ) : null
                  })}
                </div>
              )}

              {/* ── VIDEO ── */}
              {!multi && mat.media_type === 'video' && furl && (
                <div className="mx-4 mb-4 flex flex-col gap-2">
                  {videoError ? (
                    <div className="card flex flex-col items-center justify-center gap-3 px-5 py-6 text-center">
                      <MediaTypeIcon type="video" size={56} iconSize={24} radius={16} />
                      <div className="text-[13px] text-gray leading-snug">
                        Не удалось загрузить — попробуйте открыть в Telegram
                      </div>
                      <TgButton prominent />
                    </div>
                  ) : (
                    <>
                      <video
                        ref={setVideoEl}
                        src={furl}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full rounded-[18px] border border-white/[.07] block bg-black"
                        onError={() => setVideoError(true)}
                      />
                      <ResumeHint resume={resume} />
                      <TgButton />
                      <button onClick={openExternal} className="w-full h-10 flex items-center justify-center gap-2 text-gray text-[13.5px] font-medium rounded-[14px] active:bg-white/5">
                        <Icon name="external" size={16} />
                        Открыть в браузере
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* ── DOCUMENT ── */}
              {!multi && mat.media_type === 'document' && furl && (
                <div className="mx-4 mb-4">
                  {/* Loading spinner */}
                  {docPreview === 'loading' && (
                    <div className="h-32 card flex items-center justify-center mb-3">
                      <div className="w-1.5 h-1.5 bg-green/70 rounded-full animate-pulse" />
                    </div>
                  )}

                  {/* Plain-text / markdown / csv */}
                  {docPreview === 'text' && docText !== null && (
                    <div className="card p-4 mb-3">
                      <div className="flex justify-end pb-3 mb-3 border-b border-white/[.07]">
                        <CopyButton text={docText} />
                      </div>
                      <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-[1.7] text-fg/85">
                        {renderWithLinks(docText)}
                      </pre>
                      {docTruncated && (
                        <div className="mt-4 pt-4 border-t border-white/[.07] flex flex-col items-center gap-3">
                          <div className="text-[13.5px] text-gray text-center leading-snug">
                            Файл слишком большой — открыть в мини-аппе невозможно
                          </div>
                          <TgButton prominent />
                        </div>
                      )}
                    </div>
                  )}

                  {/* PDF preview — rendered via pdf.js into our own canvas so it behaves
                      identically on iOS/Android/desktop, instead of each platform's inconsistent
                      native iframe PDF plugin (Android showed nothing at all; iOS showed only
                      page 1 with no way to scroll further). */}
                  {docPreview === 'pdf' && furl && (
                    <Suspense fallback={
                      <div className="mb-3 h-64 rounded-[18px] border border-white/[.07] flex items-center justify-center" style={{ background: '#fff' }}>
                        <div className="w-1.5 h-1.5 bg-green/70 rounded-full animate-pulse" />
                      </div>
                    }>
                      <PdfViewer file={furl} />
                    </Suspense>
                  )}

                  {/* Fallback: genuinely unreadable document */}
                  {docPreview === 'error' && (
                    <div className="card flex flex-col items-center justify-center gap-3 px-5 py-6 mb-3 text-center">
                      <MediaTypeIcon type="document" size={56} iconSize={24} radius={16} />
                      <div className="text-[13px] text-gray leading-snug">
                        Не удалось загрузить — попробуйте открыть в Telegram
                      </div>
                      <TgButton prominent />
                    </div>
                  )}

                  {/* Архив/бинарник — без превью, только скачивание */}
                  {docPreview === 'download' && (
                    <div className="card flex flex-col items-center justify-center gap-3 px-5 py-6 mb-3 text-center">
                      <MediaTypeIcon type="document" size={56} iconSize={24} radius={16} />
                      <div className="text-[14px] text-fg leading-snug font-medium">
                        {(mat.attachments && mat.attachments[0] && mat.attachments[0].name) || 'Архив'}
                      </div>
                      <div className="text-[12.5px] text-gray leading-snug">Архив — скачайте файл, чтобы открыть его на устройстве.</div>
                    </div>
                  )}

                  {/* Open / download + Telegram buttons */}
                  {docPreview !== 'loading' && (
                    <div className="flex flex-col gap-2">
                      <button onClick={openExternal} className="btn-primary w-full">
                        <Icon name="download" size={18} accent="current" />
                        {docPreview === 'download' ? 'Скачать' : 'Открыть / скачать'}
                      </button>
                      <TgButton />
                    </div>
                  )}
                </div>
              )}

              {/* No media attached — offer Telegram delivery */}
              {!multi && !furl && mat.can_send && mat.media_type !== 'text' && mat.media_type !== 'quiz' && mat.media_type !== 'task' && mat.media_type !== 'doc' && (
                <div className="mx-4 mb-4 flex flex-col gap-2">
                  <div className="card p-4 text-[13.5px] text-gray text-center leading-snug">
                    Файл хранится в Telegram — получите его прямо в чат с ботом
                  </div>
                  <TgButton prominent />
                </div>
              )}

              {/* Тест с вариантами ответа */}
              {mat.media_type === 'quiz' && (() => {
                const q = parseQuiz(mat.content)
                return q ? <QuizCard key={mat.id} data={q} /> : null
              })()}

              {/* Markdown-урок */}
              {mat.media_type === 'doc' && mat.content && (
                <div className="mb-4 -mx-0"><MarkdownLite content={mat.content} onAllSolved={() => { api.completeMaterial(materialId).catch(() => {}) }} /></div>
              )}

              {/* Практическое задание */}
              {mat.media_type === 'task' && (() => {
                const t = parseTask(mat.content)
                return t ? <TaskCard key={mat.id} data={t} seed={mat.id} /> : null
              })()}

              {/* Text content */}
              {mat.content && mat.media_type !== 'quiz' && mat.media_type !== 'task' && mat.media_type !== 'doc' && (
                <>
                  <div className="px-4 pb-2.5 flex items-center justify-between gap-3">
                    <h2 className="font-display font-semibold text-[15px]">
                      {mat.media_type === 'text' ? 'Содержание' : 'Описание'}
                    </h2>
                    <CopyButton text={mat.content} />
                  </div>
                  <div className="px-4 text-[15px] leading-[1.75] text-fg/85 whitespace-pre-wrap break-words">
                    {renderWithLinks(mat.content)}
                  </div>
                </>
              )}

              {/* Файлы для скачивания — отдельным блоком внизу (фото уже показаны сверху) */}
              {multi && fileAtts.length > 0 && (
                <>
                  <div className="px-4 pt-5 pb-2.5 flex items-baseline gap-2">
                    <h2 className="font-display font-semibold text-[15px]">Файлы</h2>
                    <span className="text-[13px] text-gray tabular-nums">{fileAtts.length}</span>
                  </div>
                  {fileAtts.map((a, i) => (
                    <AttachmentBlock
                      key={a.id}
                      materialId={materialId}
                      att={a}
                      index={i}
                      total={fileAtts.length}
                    />
                  ))}
                </>
              )}

              {/* Оценки и обсуждение */}
              <MaterialSocial key={materialId} materialId={materialId} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {sectionMats.length > 1 && (
        <div className="glass fixed z-50 flex items-center justify-between p-[5px] rounded-[30px]"
          style={{ left: 10, right: 10, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}>
          <button disabled={!prevId} onClick={() => prevId && navigate(prevId)} aria-label="Предыдущий материал"
            className="w-11 h-11 rounded-full flex items-center justify-center text-fg disabled:opacity-25 active:bg-white/10 transition-colors">
            <Icon name="chevL" size={22} />
          </button>
          {editingIdx ? (
            <span className="flex items-center gap-1.5">
              <input
                type="number" inputMode="numeric" min={1} max={sectionMats.length} autoFocus
                value={idxInput}
                onChange={e => setIdxInput(e.target.value)}
                onFocus={e => e.currentTarget.select()}
                onBlur={commitIdxJump}
                onKeyDown={e => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  if (e.key === 'Escape') setEditingIdx(false)
                }}
                className="w-12 h-8 bg-white/[.08] border border-green/50 rounded-[10px] text-[14px] text-fg text-center tabular-nums outline-none"
              />
              <span className="text-[14px] text-gray tabular-nums">из {sectionMats.length}</span>
            </span>
          ) : (
            <button
              onClick={() => { setIdxInput(String(idx >= 0 ? idx + 1 : 1)); setEditingIdx(true) }}
              className="h-9 px-4 rounded-full text-[14px] tabular-nums active:bg-white/10 transition-colors"
              aria-label="Перейти к номеру"
            >
              <span className="font-display font-semibold text-fg">{idx >= 0 ? idx + 1 : '—'}</span>
              <span className="text-gray"> из {sectionMats.length}</span>
            </button>
          )}
          <button disabled={!nextId} onClick={() => nextId && navigate(nextId)} aria-label="Следующий материал"
            className="w-11 h-11 rounded-full flex items-center justify-center text-ink disabled:opacity-25 bg-green active:scale-95 transition-transform">
            <Icon name="chevR" size={22} strokeWidth={2.2} />
          </button>
        </div>
      )}
    </div>
  )
}
