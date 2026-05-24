import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretLeft, CaretRight, ArrowSquareOut, DownloadSimple } from '@phosphor-icons/react'
import { api, API_BASE } from '../api/client'
import { PaperPlaneTilt, Star, Crown } from '@phosphor-icons/react'
import type { Material } from '../api/client'

const tg = (window as any).Telegram?.WebApp
const typeLabel = (t: string) => ({ photo: 'ФОТО', video: 'ВИДЕО', document: 'ДОКУМЕНТ', text: 'ТЕКСТ' }[t] ?? t.toUpperCase())

const URL_RE = /(https?:\/\/[^\s<>"]+)/g

function renderWithLinks(text: string) {
  const parts = text.split(URL_RE)
  return parts.map((part, i) => {
    if (URL_RE.test(part)) {
      URL_RE.lastIndex = 0
      return (
        <span
          key={i}
          className="text-green underline break-all cursor-pointer"
          onClick={e => {
            e.stopPropagation()
            if (tg?.openLink) tg.openLink(part)
            else window.open(part, '_blank')
          }}
        >
          {part}
        </span>
      )
    }
    URL_RE.lastIndex = 0
    return <span key={i}>{part}</span>
  })
}

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
  const [docPreview, setDocPreview] = useState<'loading' | 'text' | 'pdf' | 'error'>('loading')
  const [videoError, setVideoError] = useState(false)
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
    setDocPreview('loading')
    api.documentText(materialId)
      .then(data => {
        setDocText(data.text)
        setDocTruncated(data.truncated ?? false)
        setDocPreview('text')
      })
      .catch(err => {
        // 415 = unsupported type (PDF, binary) → try inline iframe
        const msg = String(err?.message || '')
        setDocPreview(msg.includes('415') ? 'pdf' : 'error')
      })
  }, [mat, materialId])

  const idx = sectionMats.indexOf(materialId)
  const prevId = idx > 0 ? sectionMats[idx - 1] : null
  const nextId = idx >= 0 && idx < sectionMats.length - 1 ? sectionMats[idx + 1] : null

  const navigate = (id: number) => onNavId?.(id)

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
      className={`w-full flex items-center justify-center gap-2 text-[12px] font-semibold tracking-[2px] uppercase rounded-sm active:opacity-70 disabled:opacity-50 ${
        prominent
          ? 'h-12 bg-gradient-to-r from-[#2D7BF0] to-[#54A0FF] text-white'
          : 'h-10 border border-bd2 text-gray'
      }`}
    >
      <PaperPlaneTilt size={prominent ? 18 : 16} />
      {sent ? 'Отправлено ✓' : sending ? 'Отправка...' : 'Получить в Telegram'}
    </button>
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-16">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex justify-center py-16">
              <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
            </motion.div>
          ) : mat?.premium_required ? (
            <motion.div key="lock" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mx-4 mt-4 rounded overflow-hidden border border-[rgba(157,92,255,.3)]">
              {/* Header strip */}
              <div className="bg-gradient-to-r from-[#7B3DFF] to-[#9D5CFF] px-5 py-4 flex items-center gap-3">
                <Crown size={24} weight="fill" className="text-white/90 shrink-0" />
                <div>
                  <div className="font-bold text-[14px] text-white tracking-wide">Premium-контент</div>
                  <div className="text-[11px] text-white/70">Доступно только по подписке</div>
                </div>
              </div>
              {/* Body */}
              <div className="bg-[rgba(157,92,255,.07)] px-5 py-5">
                <p className="text-[13px] text-white/70 leading-relaxed mb-4">
                  Этот материал входит в Premium-библиотеку. Оформите подписку, чтобы получить доступ ко всем закрытым материалам.
                </p>
                <div className="flex flex-col gap-2 mb-5">
                  {[
                    { label: 'Доступ ко всем Premium-материалам' },
                    { label: 'Оплата криптовалютой или звёздами Telegram' },
                    { label: 'Мгновенная активация после оплаты' },
                  ].map(b => (
                    <div key={b.label} className="flex items-center gap-2">
                      <Star size={12} weight="fill" className="text-violet shrink-0" />
                      <span className="text-[12px] text-white/60">{b.label}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={onUpgrade}
                  className="w-full py-3 bg-gradient-to-r from-[#7B3DFF] to-[#C7A6FF] text-white font-bold text-[12px] tracking-[2px] uppercase rounded-sm active:opacity-80">
                  Оформить подписку →
                </button>
              </div>
            </motion.div>
          ) : mat ? (
            <motion.div key={`mat-${materialId}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }} className="pb-2">

              {mat.section_title && (
                <div className="inline-flex mx-4 mt-3 mb-2 px-2.5 py-1 border border-green text-green text-[10px] font-bold tracking-[2px] uppercase rounded-sm">
                  {mat.section_title}
                </div>
              )}

              <h1 className="font-display text-[28px] tracking-[2px] uppercase leading-tight px-4 mb-2">
                {mat.title}
              </h1>

              <div className="flex items-center gap-2 px-4 pb-4 text-[12px] text-gray">
                <span className="text-green">⏱</span>
                <span>{typeLabel(mat.media_type)}</span>
              </div>

              {/* ── PHOTO ── */}
              {mat.media_type === 'photo' && furl && (
                <div className="mx-4 mb-4">
                  <img src={furl} alt={mat.title} loading="lazy"
                    className="w-full rounded border border-bd block"
                    onError={e => (e.currentTarget.style.display = 'none')} />
                </div>
              )}

              {/* ── VIDEO ── */}
              {mat.media_type === 'video' && furl && (
                <div className="mx-4 mb-4 flex flex-col gap-2">
                  {videoError ? (
                    <div className="border border-bd2 rounded bg-s2/70 flex flex-col items-center justify-center gap-3 px-5 py-6 text-center">
                      <div className="text-4xl">🎬</div>
                      <div className="text-[13px] text-white/70 leading-snug">
                        Файл слишком большой — открыть в мини-аппе невозможно
                      </div>
                      <TgButton prominent />
                    </div>
                  ) : (
                    <>
                      <video
                        src={furl}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full rounded border border-bd block bg-black"
                        onError={() => setVideoError(true)}
                      />
                      <TgButton />
                      <button onClick={openExternal}
                        className="w-full h-9 border border-bd2 flex items-center justify-center gap-2 text-gray text-[11px] tracking-[2px] uppercase rounded-sm active:opacity-70">
                        <ArrowSquareOut size={15} />
                        Открыть в браузере
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* ── DOCUMENT ── */}
              {mat.media_type === 'document' && furl && (
                <div className="mx-4 mb-4">
                  {/* Loading spinner */}
                  {docPreview === 'loading' && (
                    <div className="h-32 border border-bd2 rounded bg-s2/70 flex items-center justify-center mb-3">
                      <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
                    </div>
                  )}

                  {/* Plain-text / markdown / csv */}
                  {docPreview === 'text' && docText !== null && (
                    <div className="rounded border border-bd2 bg-bg/70 p-4 mb-3">
                      <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-[1.7] text-white/85">
                        {renderWithLinks(docText)}
                      </pre>
                      {docTruncated && (
                        <div className="mt-4 pt-4 border-t border-bd2 flex flex-col items-center gap-3">
                          <div className="text-[13px] text-white/70 text-center leading-snug">
                            Файл слишком большой — открыть в мини-аппе невозможно
                          </div>
                          <TgButton prominent />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fallback: PDF/binary or generic error */}
                  {(docPreview === 'pdf' || docPreview === 'error') && (
                    <div className="border border-bd2 rounded bg-s2/70 flex flex-col items-center justify-center gap-3 px-5 py-6 mb-3 text-center">
                      <div className="text-4xl">📄</div>
                      <div className="text-[13px] text-white/70 leading-snug">
                        Файл слишком большой — открыть в мини-аппе невозможно
                      </div>
                      <TgButton prominent />
                    </div>
                  )}

                  {/* Open / download + Telegram buttons */}
                  {docPreview !== 'loading' && (
                    <div className="flex flex-col gap-2">
                      <button onClick={openExternal}
                        className="w-full h-11 border border-green flex items-center justify-center gap-2 text-violet text-[12px] font-semibold tracking-[2px] uppercase rounded-sm active:bg-[rgba(157,92,255,.10)]">
                        <DownloadSimple size={18} />
                        Открыть / скачать
                      </button>
                      <TgButton />
                    </div>
                  )}
                </div>
              )}

              {/* No media attached — offer Telegram delivery */}
              {!furl && mat.can_send && mat.media_type !== 'text' && (
                <div className="mx-4 mb-4 flex flex-col gap-2">
                  <div className="p-3 border border-bd rounded text-[12px] text-gray2 text-center">
                    Файл хранится в Telegram — получите его прямо в чат с ботом
                  </div>
                  <TgButton prominent />
                </div>
              )}

              {/* Text content */}
              {mat.content && (
                <>
                  <div className="px-4 pb-2.5 text-[11px] font-bold tracking-[3px] uppercase text-green">
                    {mat.media_type === 'text' ? 'Содержание' : 'Описание'}
                  </div>
                  <div className="px-4 text-[14px] leading-[1.85] text-white/80 whitespace-pre-wrap break-words">
                    {renderWithLinks(mat.content)}
                  </div>
                </>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {sectionMats.length > 1 && (
        <div className="fixed bottom-0 left-0 right-0 h-14 bg-s1/95 backdrop-blur-md border-t border-bd/60 flex items-center justify-between px-4 z-50"
          style={{ boxShadow: '0 -8px 24px rgba(0,0,0,.4)' }}>
          <button disabled={!prevId} onClick={() => prevId && navigate(prevId)}
            className="w-11 h-11 bg-gradient-to-b from-s2 to-s1 border border-bd2 rounded-xl flex items-center justify-center text-white disabled:opacity-25 active:bg-bd2 transition-colors">
            <CaretLeft size={20} weight="bold" />
          </button>
          <span className="text-[13px] tracking-widest">
            <span className="font-semibold text-white">{idx >= 0 ? idx + 1 : '—'}</span>
            <span className="text-gray2"> / {sectionMats.length}</span>
          </span>
          <button disabled={!nextId} onClick={() => nextId && navigate(nextId)}
            className="w-11 h-11 bg-gradient-to-b from-s2 to-s1 border border-bd2 rounded-xl flex items-center justify-center text-white disabled:opacity-25 active:bg-bd2 transition-colors">
            <CaretRight size={20} weight="bold" />
          </button>
        </div>
      )}
    </div>
  )
}
