import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretLeft, CaretRight, ArrowSquareOut, DownloadSimple } from '@phosphor-icons/react'
import { api, API_BASE } from '../api/client'
import type { Material } from '../api/client'

const tg = (window as any).Telegram?.WebApp
const typeLabel = (t: string) => ({ photo: 'ФОТО', video: 'ВИДЕО', document: 'ДОКУМЕНТ', text: 'ТЕКСТ' }[t] ?? t.toUpperCase())

interface Props {
  materialId: number
  sectionId: number
  onNavId?: (id: number) => void
}

export default function MaterialPage({ materialId, sectionId, onNavId }: Props) {
  const [mat, setMat] = useState<Material | null>(null)
  const [docText, setDocText] = useState<string | null>(null)
  const [docPreview, setDocPreview] = useState<'loading' | 'text' | 'pdf' | 'error'>('loading')
  const [pdfFailed, setPdfFailed] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [sectionMats, setSectionMats] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const curId = useRef(materialId)

  useEffect(() => {
    if (sectionId) {
      api.materials(sectionId, 0).then(d => {
        setSectionMats(d.materials.map(m => m.id))
      }).catch(() => {})
    }
  }, [sectionId])

  useEffect(() => {
    curId.current = materialId
    setLoading(true)
    setMat(null)
    setDocText(null)
    setDocPreview('loading')
    setPdfFailed(false)
    setVideoError(false)

    api.material(materialId).then(d => {
      if (curId.current !== materialId) return
      setMat(d)
      // История записывается автоматически на сервере при GET /api/material/{id}
    }).catch(() => {}).finally(() => setLoading(false))
  }, [materialId])

  useEffect(() => {
    if (!mat || mat.media_type !== 'document' || !mat.file_url) return
    setDocPreview('loading')
    api.documentText(materialId)
      .then(data => {
        setDocText(data.text)
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
              className="mx-4 mt-4 p-6 premium-surface border border-[rgba(199,166,255,.25)] rounded text-center overflow-hidden">
              <div className="text-4xl mb-3">🔒</div>
              <div className="font-display text-[22px] tracking-[2px] mb-2">ДОСТУП ЗАКРЫТ</div>
              <p className="text-[12px] text-gray leading-relaxed mb-5">
                Этот материал доступен только Premium пользователям.
              </p>
              <button className="w-full py-3 bg-gradient-to-r from-[#7B3DFF] to-[#E7D4FF] text-bg font-bold text-[12px] tracking-[2px] uppercase rounded-sm">
                Получить Premium
              </button>
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
                <img src={furl} alt={mat.title} loading="lazy"
                  className="w-[calc(100%-32px)] mx-4 mb-4 rounded border border-bd block"
                  onError={e => (e.currentTarget.style.display = 'none')} />
              )}

              {/* ── VIDEO ── */}
              {mat.media_type === 'video' && furl && (
                <div className="mx-4 mb-4">
                  {!videoError ? (
                    <video
                      src={furl}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full rounded border border-bd block bg-black"
                      onError={() => setVideoError(true)}
                    />
                  ) : (
                    <div className="h-32 border border-bd2 rounded bg-s2/70 flex flex-col items-center justify-center gap-2 mb-3">
                      <div className="text-3xl">🎬</div>
                      <div className="text-[11px] text-gray tracking-[2px] uppercase">Видео недоступно в приложении</div>
                      <div className="text-[10px] text-gray2">Файл может быть слишком большим</div>
                    </div>
                  )}
                  <button onClick={openExternal}
                    className="mt-2 w-full h-10 border border-bd2 flex items-center justify-center gap-2 text-gray text-[11px] tracking-[2px] uppercase rounded-sm active:opacity-70">
                    <ArrowSquareOut size={16} />
                    Открыть в браузере
                  </button>
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
                    <div className="max-h-[65vh] overflow-y-auto rounded border border-bd2 bg-bg/70 p-4 mb-3">
                      <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-[1.7] text-white/85">
                        {docText}
                      </pre>
                    </div>
                  )}

                  {/* PDF / binary — inline iframe */}
                  {docPreview === 'pdf' && !pdfFailed && (
                    <iframe
                      src={furl}
                      title={mat.title}
                      className="w-full rounded border border-bd block mb-3"
                      style={{ height: '72vh' }}
                      onError={() => setPdfFailed(true)}
                    />
                  )}

                  {/* Fallback: iframe failed or generic error */}
                  {((docPreview === 'pdf' && pdfFailed) || docPreview === 'error') && (
                    <div className="h-32 border border-bd2 rounded bg-s2/70 flex flex-col items-center justify-center gap-2 mb-3">
                      <div className="text-4xl">📄</div>
                      <div className="text-[11px] text-gray tracking-[2px] uppercase">Предпросмотр недоступен</div>
                    </div>
                  )}

                  {/* Open / download button */}
                  {docPreview !== 'loading' && (
                    <button onClick={openExternal}
                      className="w-full h-12 border border-green flex items-center justify-center gap-2 text-violet text-[12px] font-semibold tracking-[2px] uppercase rounded-sm active:bg-[rgba(157,92,255,.10)]">
                      <DownloadSimple size={18} />
                      Открыть / скачать
                    </button>
                  )}
                </div>
              )}

              {/* No media attached */}
              {!furl && mat.can_send && mat.media_type !== 'text' && (
                <div className="mx-4 mb-4 p-4 border border-bd rounded text-[13px] leading-relaxed text-gray">
                  Файл не привязан к мини-приложению. Откройте материал в боте.
                </div>
              )}

              {/* Text content */}
              {mat.content && (
                <>
                  <div className="px-4 pb-2.5 text-[11px] font-bold tracking-[3px] uppercase text-green">
                    {mat.media_type === 'text' ? 'Содержание' : 'Описание'}
                  </div>
                  <div className="px-4 text-[14px] leading-[1.85] text-white/80 whitespace-pre-wrap break-words">
                    {mat.content}
                  </div>
                </>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {sectionMats.length > 1 && (
        <div className="fixed bottom-0 left-0 right-0 h-14 bg-s1 border-t border-bd flex items-center justify-between px-4 z-50">
          <button disabled={!prevId} onClick={() => prevId && navigate(prevId)}
            className="w-11 h-11 bg-s2 border border-bd2 rounded flex items-center justify-center text-white disabled:opacity-30 active:bg-bd2">
            <CaretLeft size={22} weight="bold" />
          </button>
          <span className="text-[13px] text-gray tracking-widest">
            {idx + 1} / {sectionMats.length}
          </span>
          <button disabled={!nextId} onClick={() => nextId && navigate(nextId)}
            className="w-11 h-11 bg-s2 border border-bd2 rounded flex items-center justify-center text-white disabled:opacity-30 active:bg-bd2">
            <CaretRight size={22} weight="bold" />
          </button>
        </div>
      )}
    </div>
  )
}
