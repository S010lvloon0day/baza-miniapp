// «Медиа» темы как в Telegram: фото, видео, файлы, ссылки, голосовые.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../../api/client'
import type { ChatMsg } from '../../api/client'
import Icon from '../../components/Icon'
import { firstUrl, openUrl } from './rich'
import type { ViewItem } from './MediaViewer'

const TABS = [['photo', 'Фото'], ['video', 'Видео'], ['file', 'Файлы'], ['link', 'Ссылки'], ['voice', 'Голосовые']] as const
type Kind = typeof TABS[number][0]

export function downloadFile(m: ChatMsg) {
  const tg = (window as any).Telegram?.WebApp
  const url = api.chatMediaUrl(m.id)
  try { if (tg?.downloadFile) { tg.downloadFile({ url, file_name: m.fname || 'file' }); return } } catch { /* */ }
  const a = document.createElement('a'); a.href = url; a.download = m.fname || 'file'; a.target = '_blank'; a.rel = 'noopener'
  document.body.appendChild(a); a.click(); a.remove()
}

const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) } catch { return '' } }

export default function MediaGallery({ title, onClose, onView, onJump }: {
  title: string; onClose: () => void
  onView: (items: ViewItem[], start: number) => void; onJump: (id: number) => void
}) {
  const [kind, setKind] = useState<Kind>('photo')
  const [items, setItems] = useState<ChatMsg[]>([])
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(true)
  useEffect(() => {
    let on = true; setLoading(true); setItems([]); setMore(true)
    api.chatMediaList(kind).then(r => { if (on) { setItems(r.items || []); setMore((r.items || []).length >= 60) } }).catch(() => {}).finally(() => on && setLoading(false))
    return () => { on = false }
  }, [kind])
  const loadMore = () => {
    if (loading || !more || !items.length) return
    setLoading(true)
    api.chatMediaList(kind, items[items.length - 1].id).then(r => { setItems(a => [...a, ...(r.items || [])]); setMore((r.items || []).length >= 60) }).catch(() => {}).finally(() => setLoading(false))
  }
  const viewItems = (): ViewItem[] => items.map(m => ({ url: api.chatMediaUrl(m.id), video: m.type !== 'photo', id: m.id, mine: m.mine, name: m.name }))
  return (
    <motion.div className="fixed inset-0 z-[75] flex flex-col bg-bg" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.22 }}>
      <div className="flex items-center gap-2 px-3 pb-2" style={{ paddingTop: 'calc(env(safe-area-inset-top,0px) + 10px)' }}>
        <button onClick={onClose} aria-label="Назад" className="w-10 h-10 rounded-full grid place-items-center text-fg active:bg-white/10"><Icon name="back" size={20} /></button>
        <div className="font-display font-semibold text-[16px] truncate">Медиа · {title}</div>
      </div>
      <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto no-scrollbar">
        {TABS.map(([k, l]) => <button key={k} onClick={() => setKind(k)} className={`chip ${kind === k ? 'on' : ''} shrink-0`}>{l}</button>)}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-6" onScroll={(e) => { const el = e.currentTarget; if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) loadMore() }}>
        {!loading && !items.length && <div className="py-16 text-center text-[14px] text-gray">Здесь пока пусто</div>}
        {(kind === 'photo' || kind === 'video') ? (
          <div className="grid grid-cols-3 gap-[2px]">
            {items.map((m, i) => (
              <button key={m.id} onClick={() => onView(viewItems(), i)} className="relative aspect-square bg-white/[.04] overflow-hidden">
                {m.type === 'photo'
                  ? <img src={api.chatMediaUrl(m.id)} alt="" loading="lazy" className="w-full h-full object-cover" />
                  : <video src={api.chatMediaUrl(m.id) + '#t=0.1'} preload="metadata" muted playsInline className={`w-full h-full object-cover ${m.type === 'round' ? 'rounded-full scale-90' : ''}`} />}
                {m.type !== 'photo' && <span className="absolute bottom-1 left-1 px-1.5 rounded-full text-[10.5px] text-white tabular-nums" style={{ background: 'rgba(0,0,0,.55)' }}>
                  {m.dur ? `${Math.floor(m.dur / 60)}:${String(Math.floor(m.dur % 60)).padStart(2, '0')}` : 'GIF'}</span>}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col px-3">
            {items.map(m => {
              const url = kind === 'link' ? firstUrl(m.text) : ''
              return (
                <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-white/[.05]">
                  <button onClick={() => kind === 'file' ? downloadFile(m) : kind === 'link' ? (url && openUrl(url)) : onJump(m.id)}
                    className="w-11 h-11 rounded-[12px] grid place-items-center shrink-0" style={{ background: kind === 'link' ? 'rgba(127,211,255,.12)' : 'rgba(23,229,132,.12)', color: kind === 'link' ? '#7FD3FF' : '#17E584' }}>
                    <Icon name={kind === 'file' ? 'doc' : kind === 'link' ? 'link' : 'mic'} size={20} accent="current" />
                  </button>
                  <button onClick={() => onJump(m.id)} className="flex-1 min-w-0 text-left">
                    <div className="text-[14px] text-fg truncate">{kind === 'file' ? (m.fname || 'Файл') : kind === 'link' ? url.replace(/^https?:\/\//, '') : `Голосовое · ${Math.round(m.dur)} с`}</div>
                    <div className="text-[12px] text-gray truncate">{m.name} · {fmtDate(m.created_at)}{kind === 'link' && m.text !== url ? ` · ${m.text.replace(url, '').trim().slice(0, 60)}` : ''}</div>
                  </button>
                </div>
              )
            })}
          </div>
        )}
        {loading && <div className="py-6 text-center text-[13px] text-gray">Загрузка…</div>}
      </div>
    </motion.div>
  )
}
