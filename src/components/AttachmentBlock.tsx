import { useEffect, useState, lazy, Suspense } from 'react'
import { DownloadSimple, PaperPlaneTilt } from './icons'
import { api, API_BASE } from '../api/client'
import type { Attachment } from '../api/client'
import MediaTypeIcon from './MediaTypeIcon'
import CopyButton from './CopyButton'
import { renderWithLinks } from './RichText'
import { useResume, ResumeHint } from '../hooks/useResume'

const PdfViewer = lazy(() => import('./PdfViewer'))

const tg = (window as any).Telegram?.WebApp

const KIND_LABEL: Record<string, string> = {
  photo: 'Фото', video: 'Видео', document: 'Документ', text: 'Текст',
}

/**
 * Одно вложение материала со СВОИМ состоянием.
 *
 * Состояние держится здесь, а не на странице, намеренно: у материала может быть
 * несколько документов или видео, а одна общая машина состояний на страницу
 * заставила бы их драться за один и тот же docPreview/videoError.
 */
export default function AttachmentBlock({
  materialId, att, index, total,
}: { materialId: number; att: Attachment; index: number; total: number }) {
  const [docText, setDocText] = useState<string | null>(null)
  const [docTruncated, setDocTruncated] = useState(false)
  const [preview, setPreview] = useState<'idle' | 'loading' | 'text' | 'pdf' | 'error'>('idle')
  const [videoError, setVideoError] = useState(false)
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  const resume = useResume(videoEl, materialId, att.id)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const initData = encodeURIComponent(tg?.initData || '')
  const url = att.url ? `${API_BASE}${att.url}?init_data=${initData}` : null

  useEffect(() => {
    if (att.kind !== 'document' || !att.url) return
    setPreview('loading')
    api.attachmentText(materialId, att.id)
      .then(d => { setDocText(d.text); setDocTruncated(d.truncated ?? false); setPreview('text') })
      .catch(err => {
        // 415 — сервер не смог достать текст: значит это PDF или бинарник.
        setPreview(String(err?.message || '').includes('415') ? 'pdf' : 'error')
      })
  }, [materialId, att.id, att.kind, att.url])

  const openExternal = () => {
    if (!url) return
    if (tg?.openLink) tg.openLink(url)
    else window.open(url, '_blank')
  }

  const sendToTelegram = async () => {
    if (sending || sent) return
    setSending(true)
    try {
      await api.sendAttachment(materialId, att.id)
      setSent(true)
    } catch {
      setSending(false)
    }
  }

  // ─── Текстовый блок ───────────────────────────────────────────────────────
  if (att.kind === 'text') {
    return (
      <div className="mb-4">
        <div className="px-4 pb-2.5 flex items-center justify-between gap-3">
          <h3 className="font-display font-semibold text-[14px]">
            {total > 1 ? <>Текст <span className="text-gray font-sans font-normal tabular-nums">{index + 1} из {total}</span></> : 'Текст'}
          </h3>
          <CopyButton text={att.text || ''} />
        </div>
        <div className="px-4 text-[15px] leading-[1.75] text-fg/85 whitespace-pre-wrap break-words">
          {renderWithLinks(att.text || '')}
        </div>
      </div>
    )
  }

  // ─── Файловое вложение ────────────────────────────────────────────────────
  const label = att.name || KIND_LABEL[att.kind] || 'Файл'

  return (
    <div className="card mx-4 mb-4 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[.07]">
        <MediaTypeIcon type={att.kind} size={34} iconSize={17} radius={10} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] text-fg font-medium truncate">{label}</div>
          {att.caption && (
            <div className="text-[12.5px] text-gray truncate">{att.caption}</div>
          )}
        </div>
        <div className="text-[12.5px] text-gray2 shrink-0 tabular-nums">{index + 1} из {total}</div>
      </div>

      <div className="p-3">
        {att.kind === 'photo' && url && (
          <img src={url} alt={label} className="w-full rounded-[14px]"
               onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
        )}

        {att.kind === 'video' && url && (
          videoError ? (
            <div className="py-4 text-center text-[13.5px] text-gray">
              Видео не проигрывается здесь — получите его в Telegram
            </div>
          ) : (
            <>
              <video ref={setVideoEl} src={url} controls playsInline className="w-full rounded-[14px]"
                     onError={() => setVideoError(true)} />
              <div className="pt-1.5"><ResumeHint resume={resume} /></div>
            </>
          )
        )}

        {att.kind === 'document' && (
          <>
            {preview === 'loading' && (
              <div className="h-20 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-green/70 rounded-full animate-pulse" />
              </div>
            )}
            {preview === 'text' && docText !== null && (
              <div className="rounded-[14px] border border-white/[.07] bg-black/25 p-3">
                <div className="flex justify-end pb-2 mb-2 border-b border-white/[.07]">
                  <CopyButton text={docText} />
                </div>
                <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-[1.7] text-fg/85">
                  {renderWithLinks(docText)}
                </pre>
                {docTruncated && (
                  <div className="mt-3 pt-3 border-t border-white/[.07] text-[12.5px] text-gray text-center">
                    Файл большой — показана только часть
                  </div>
                )}
              </div>
            )}
            {preview === 'pdf' && url && (
              <Suspense fallback={
                <div className="h-40 rounded-[14px] flex items-center justify-center bg-white">
                  <div className="w-1.5 h-1.5 bg-green/70 rounded-full animate-pulse" />
                </div>
              }>
                <PdfViewer file={url} />
              </Suspense>
            )}
            {preview === 'error' && (
              <div className="py-3 text-center text-[13px] text-gray">
                Предпросмотр недоступен — скачайте файл
              </div>
            )}
          </>
        )}

        <div className="flex gap-2 mt-3">
          <button onClick={openExternal} disabled={!url}
            className="btn-primary flex-1 !h-11 !text-[13px] disabled:opacity-30">
            <DownloadSimple size={17} weight="fill" />
            Скачать
          </button>
          <button onClick={sendToTelegram} disabled={sending || sent}
            className="btn-secondary flex-1 text-[13.5px] disabled:opacity-40">
            <PaperPlaneTilt size={16} weight="fill" />
            {sent ? 'Отправлено' : sending ? 'Отправка…' : 'В Telegram'}
          </button>
        </div>
      </div>
    </div>
  )
}
