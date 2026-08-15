import { useEffect, useState, lazy, Suspense } from 'react'
import { DownloadSimple, PaperPlaneTilt } from '@phosphor-icons/react'
import { api, API_BASE } from '../api/client'
import type { Attachment } from '../api/client'
import MediaTypeIcon from './MediaTypeIcon'
import CopyButton from './CopyButton'
import { renderWithLinks } from './RichText'

const PdfViewer = lazy(() => import('./PdfViewer'))

const tg = (window as any).Telegram?.WebApp

const KIND_LABEL: Record<string, string> = {
  photo: 'ФОТО', video: 'ВИДЕО', document: 'ДОКУМЕНТ', text: 'ТЕКСТ',
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
          <div className="text-[11px] font-bold tracking-[3px] uppercase text-green">
            {total > 1 ? `Текст ${index + 1}/${total}` : 'Текст'}
          </div>
          <CopyButton text={att.text || ''} />
        </div>
        <div className="px-4 text-[14px] leading-[1.85] text-white/80 whitespace-pre-wrap break-words">
          {renderWithLinks(att.text || '')}
        </div>
      </div>
    )
  }

  // ─── Файловое вложение ────────────────────────────────────────────────────
  const label = att.name || KIND_LABEL[att.kind] || 'ФАЙЛ'

  return (
    <div className="mx-4 mb-4 rounded-2xl border border-white/[.08] bg-s2/40 overflow-hidden">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-white/[.06]">
        <MediaTypeIcon type={att.kind} size={26} iconSize={13} radius={8} />
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-white/85 font-semibold truncate">{label}</div>
          {att.caption && (
            <div className="text-[11px] text-gray truncate">{att.caption}</div>
          )}
        </div>
        <div className="text-[10px] font-mono text-gray2 shrink-0">{index + 1}/{total}</div>
      </div>

      <div className="p-3">
        {att.kind === 'photo' && url && (
          <img src={url} alt={label} className="w-full rounded-xl"
               onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
        )}

        {att.kind === 'video' && url && (
          videoError ? (
            <div className="py-4 text-center text-[13px] text-white/60">
              Видео не проигрывается здесь — получите его в Telegram
            </div>
          ) : (
            <video src={url} controls playsInline className="w-full rounded-xl"
                   onError={() => setVideoError(true)} />
          )
        )}

        {att.kind === 'document' && (
          <>
            {preview === 'loading' && (
              <div className="h-20 flex items-center justify-center">
                <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
              </div>
            )}
            {preview === 'text' && docText !== null && (
              <div className="rounded-xl border border-white/[.08] bg-bg/70 p-3">
                <div className="flex justify-end pb-2 mb-2 border-b border-white/[.06]">
                  <CopyButton text={docText} />
                </div>
                <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-[1.7] text-white/85">
                  {renderWithLinks(docText)}
                </pre>
                {docTruncated && (
                  <div className="mt-3 pt-3 border-t border-bd2 text-[12px] text-white/60 text-center">
                    Файл большой — показана только часть
                  </div>
                )}
              </div>
            )}
            {preview === 'pdf' && url && (
              <Suspense fallback={
                <div className="h-40 rounded-xl flex items-center justify-center" style={{ background: '#fff' }}>
                  <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
                </div>
              }>
                <PdfViewer file={url} />
              </Suspense>
            )}
            {preview === 'error' && (
              <div className="py-3 text-center text-[12px] text-white/55">
                Предпросмотр недоступен — скачайте файл
              </div>
            )}
          </>
        )}

        <div className="flex gap-2 mt-3">
          <button onClick={openExternal} disabled={!url}
            className="flex-1 h-10 border border-green flex items-center justify-center gap-1.5
                       text-green text-[11px] font-semibold tracking-[1.5px] uppercase rounded-xl
                       active:bg-[rgba(34,197,94,.10)] disabled:opacity-30">
            <DownloadSimple size={16} />
            Скачать
          </button>
          <button onClick={sendToTelegram} disabled={sending || sent}
            className="flex-1 h-10 border border-[rgba(255,255,255,.14)] bg-gradient-to-b from-white/[.06] to-white/[.02]
                       flex items-center justify-center gap-1.5 text-white/85 text-[11px] font-semibold
                       tracking-[1.5px] uppercase rounded-xl active:opacity-70 disabled:opacity-40">
            <PaperPlaneTilt size={16} />
            {sent ? 'Отправлено' : sending ? 'Отправка…' : 'В Telegram'}
          </button>
        </div>
      </div>
    </div>
  )
}
