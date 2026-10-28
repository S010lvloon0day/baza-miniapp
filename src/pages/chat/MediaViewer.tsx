// Просмотр фото и видео как в Telegram: листание влево/вправо, щипок и двойной тап — зум,
// смахивание вверх/вниз — закрыть, сохранить на устройство, удалить (своё/админ).
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Icon from '../../components/Icon'

export interface ViewItem { url: string; video: boolean; id?: number; mine?: boolean; name?: string; date?: string }

const tg = (window as any).Telegram?.WebApp

function save(it: ViewItem) {
  const ext = it.video ? 'mp4' : 'jpg'
  const fname = `baza_${it.id || Date.now()}.${ext}`
  try {
    if (tg?.downloadFile) { tg.downloadFile({ url: it.url, file_name: fname }); return }
  } catch { /* старый Telegram */ }
  const a = document.createElement('a'); a.href = it.url; a.download = fname; a.target = '_blank'; a.rel = 'noopener'
  document.body.appendChild(a); a.click(); a.remove()
}

export default function MediaViewer({ items, start, onClose, onDelete, canDelete }: {
  items: ViewItem[]; start: number; onClose: () => void
  onDelete?: (id: number) => void; canDelete?: (it: ViewItem) => boolean
}) {
  const [idx, setIdx] = useState(Math.max(0, Math.min(items.length - 1, start)))
  const [failed, setFailed] = useState<Record<number, boolean>>({})
  const cur = items[idx]
  const stage = useRef<HTMLDivElement>(null)
  const media = useRef<HTMLElement | null>(null)
  // трансформация текущего элемента
  const tf = useRef({ s: 1, x: 0, y: 0 })
  const g = useRef<{ mode: '' | 'pan' | 'swipeX' | 'swipeY' | 'pinch'; x0: number; y0: number; d0: number; s0: number; tx0: number; ty0: number; dx: number; dy: number; lastTap: number }>(
    { mode: '', x0: 0, y0: 0, d0: 0, s0: 1, tx0: 0, ty0: 0, dx: 0, dy: 0, lastTap: 0 })

  const apply = (anim = false) => {
    const el = media.current; if (!el) return
    el.style.transition = anim ? 'transform .22s ease' : 'none'
    el.style.transform = `translate(${tf.current.x}px, ${tf.current.y}px) scale(${tf.current.s})`
  }
  const reset = (anim = true) => { tf.current = { s: 1, x: 0, y: 0 }; apply(anim) }
  useEffect(() => { reset(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [idx])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIdx(i => Math.min(items.length - 1, i + 1))
      if (e.key === 'ArrowLeft') setIdx(i => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [items.length, onClose])

  const clampPan = () => {
    const el = media.current, st = stage.current; if (!el || !st) return
    const s = tf.current.s
    const mx = Math.max(0, (el.offsetWidth * s - st.clientWidth) / 2), my = Math.max(0, (el.offsetHeight * s - st.clientHeight) / 2)
    tf.current.x = Math.max(-mx, Math.min(mx, tf.current.x)); tf.current.y = Math.max(-my, Math.min(my, tf.current.y))
  }
  const dist = (t: React.TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)

  const onStart = (e: React.TouchEvent) => {
    const t = e.touches, G = g.current
    if (t.length === 2 && !cur.video) {
      Object.assign(G, { mode: 'pinch', d0: dist(t), s0: tf.current.s, tx0: tf.current.x, ty0: tf.current.y })
      return
    }
    Object.assign(G, { mode: '', x0: t[0].clientX, y0: t[0].clientY, tx0: tf.current.x, ty0: tf.current.y, dx: 0, dy: 0 })
  }
  const onMove = (e: React.TouchEvent) => {
    const t = e.touches, G = g.current
    if (G.mode === 'pinch' && t.length === 2) {
      tf.current.s = Math.max(1, Math.min(5, G.s0 * dist(t) / G.d0)); apply(); return
    }
    if (t.length !== 1) return
    const dx = t[0].clientX - G.x0, dy = t[0].clientY - G.y0
    G.dx = dx; G.dy = dy
    if (!G.mode) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      G.mode = tf.current.s > 1.02 ? 'pan' : (Math.abs(dx) > Math.abs(dy) ? 'swipeX' : 'swipeY')
    }
    if (G.mode === 'pan') { tf.current.x = G.tx0 + dx; tf.current.y = G.ty0 + dy; apply() }
    else if (G.mode === 'swipeX') {
      const edge = (idx === 0 && dx > 0) || (idx === items.length - 1 && dx < 0)
      tf.current.x = edge ? dx * 0.3 : dx; apply()
    } else if (G.mode === 'swipeY') {
      tf.current.y = dy; apply()
      if (stage.current) stage.current.style.background = `rgba(0,0,0,${Math.max(0.3, 0.96 - Math.abs(dy) / 450)})`
    }
  }
  const onEnd = (e: React.TouchEvent) => {
    const G = g.current
    if (G.mode === 'pinch') {
      if (e.touches.length === 0) { if (tf.current.s < 1.05) reset(); else { clampPan(); apply(true) } G.mode = '' }
      return
    }
    if (G.mode === 'pan') { clampPan(); apply(true) }
    else if (G.mode === 'swipeX') {
      if (G.dx < -70 && idx < items.length - 1) setIdx(idx + 1)
      else if (G.dx > 70 && idx > 0) setIdx(idx - 1)
      else reset()
    } else if (G.mode === 'swipeY') {
      if (Math.abs(G.dy) > 100) { onClose(); return }
      reset(); if (stage.current) stage.current.style.background = 'rgba(0,0,0,.96)'
    } else if (!cur.video) {
      // двойной тап — зум к точке / обратно
      const now = Date.now()
      if (now - G.lastTap < 280) {
        G.lastTap = 0
        if (tf.current.s > 1.02) reset()
        else {
          const st = stage.current!.getBoundingClientRect()
          const px = G.x0 - (st.left + st.width / 2), py = G.y0 - (st.top + st.height / 2)
          tf.current = { s: 2.5, x: -px * 1.5, y: -py * 1.5 }; clampPan(); apply(true)
        }
      } else G.lastTap = now
    }
    G.mode = ''
  }

  if (!cur) return null
  return (
    <motion.div ref={stage} className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden select-none"
      style={{ background: 'rgba(0,0,0,.96)', touchAction: 'none' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} onTouchCancel={onEnd}
      onClick={(e) => { if (e.target === stage.current) onClose() }}>
      {/* верхняя панель */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-3" style={{ paddingTop: 'calc(env(safe-area-inset-top,0px) + 10px)' }}
        onClick={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Закрыть" className="w-10 h-10 rounded-full flex items-center justify-center text-white glass"><Icon name="close" size={18} /></button>
        <div className="flex-1 min-w-0 text-white">
          {cur.name && <div className="text-[14px] font-semibold truncate">{cur.name}</div>}
          {items.length > 1 && <div className="text-[12px] text-white/60 tabular-nums">{idx + 1} из {items.length}</div>}
        </div>
        <button onClick={() => save(cur)} aria-label="Сохранить" className="w-10 h-10 rounded-full flex items-center justify-center text-white glass"><Icon name="download" size={18} accent="current" /></button>
        {cur.id != null && canDelete?.(cur) && onDelete && (
          <button onClick={() => { onDelete(cur.id!); onClose() }} aria-label="Удалить" className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ background: 'rgba(220,60,60,.9)' }}><Icon name="trash" size={17} /></button>
        )}
      </div>
      {failed[idx]
        ? <div className="text-[14px]" style={{ color: '#9a9aa2' }}>Уже просмотрено или недоступно</div>
        : cur.video
          ? <video key={cur.url} ref={el => { media.current = el }} src={cur.url} autoPlay controls playsInline className="max-w-full max-h-full"
              onError={() => setFailed(f => ({ ...f, [idx]: true }))} />
          : <img key={cur.url} ref={el => { media.current = el }} src={cur.url} alt="" draggable={false} className="max-w-full max-h-full object-contain will-change-transform"
              onError={() => setFailed(f => ({ ...f, [idx]: true }))} />}
      {/* стрелки для мыши */}
      {items.length > 1 && idx > 0 && (
        <button onClick={(e) => { e.stopPropagation(); setIdx(idx - 1) }} className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center text-white glass"><Icon name="chevL" size={18} /></button>
      )}
      {items.length > 1 && idx < items.length - 1 && (
        <button onClick={(e) => { e.stopPropagation(); setIdx(idx + 1) }} className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center text-white glass"><Icon name="chevR" size={18} /></button>
      )}
    </motion.div>
  )
}
