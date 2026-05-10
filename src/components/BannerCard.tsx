import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Banner } from '../api/client'
import { API_BASE } from '../api/client'

const tg = (window as any).Telegram?.WebApp

function openUrl(url: string) {
  if (!url) return
  if (tg?.openLink) tg.openLink(url)
  else window.open(url, '_blank')
}

function BannerItem({ banner, index }: { banner: Banner; index: number }) {
  const hasImage = !!banner.file_id
  const isAnimation = banner.media_type === 'animation'
  const imageUrl = `${API_BASE}/api/banner/image?index=${index}`

  return hasImage ? (
    <div
      onClick={() => openUrl(banner.link)}
      className={`relative rounded overflow-hidden ${banner.link ? 'cursor-pointer active:opacity-80' : ''}`}
    >
      {isAnimation ? (
        <video src={imageUrl} autoPlay loop muted playsInline className="w-full object-cover max-h-[180px]" />
      ) : (
        <img src={imageUrl} alt={banner.title} className="w-full object-cover max-h-[180px]" draggable={false} />
      )}
      {(banner.title || banner.text) && (
        <div className="absolute inset-x-0 bottom-0"
          style={{ background: 'linear-gradient(to top, rgba(8,7,13,.92) 0%, transparent 100%)' }}>
          <div className="flex items-end justify-between px-4 py-3 gap-2">
            <div className="flex-1 min-w-0">
              {banner.title && (
                <div className="text-[13px] font-bold text-white leading-snug">
                  {banner.emoji} {banner.title}
                </div>
              )}
              {banner.text && (
                <div className="text-[11px] text-gray leading-snug mt-0.5 line-clamp-1">{banner.text}</div>
              )}
            </div>
            {banner.link && (
              <div className="w-7 h-7 rounded-full bg-[rgba(243,199,122,.2)] border border-[rgba(243,199,122,.4)] flex items-center justify-center shrink-0">
                <ArrowRight size={14} weight="bold" className="text-gold" />
              </div>
            )}
          </div>
        </div>
      )}
      {!banner.title && !banner.text && banner.link && (
        <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[rgba(8,7,13,.6)] flex items-center justify-center">
          <ArrowRight size={14} weight="bold" className="text-gold" />
        </div>
      )}
    </div>
  ) : (
    <div
      onClick={() => openUrl(banner.link)}
      className={`relative rounded overflow-hidden ${banner.link ? 'cursor-pointer active:opacity-80' : ''}`}
    >
      <div className="absolute inset-0 bg-s1" />
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 90% 50%, rgba(243,199,122,.22) 0%, transparent 60%), radial-gradient(ellipse at 10% 80%, rgba(157,92,255,.15) 0%, transparent 50%)' }} />
      <div className="absolute inset-0"
        style={{ backgroundImage: 'linear-gradient(rgba(243,199,122,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(243,199,122,.05) 1px,transparent 1px)', backgroundSize: '20px 20px' }} />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      <div className="relative z-10 flex items-center gap-3 px-4 py-3.5">
        {banner.emoji && (
          <div className="w-10 h-10 rounded-full bg-[rgba(243,199,122,.12)] border border-[rgba(243,199,122,.25)] flex items-center justify-center text-[20px] shrink-0">
            {banner.emoji}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-white leading-snug">{banner.title}</div>
          {banner.text && (
            <div className="text-[11px] text-gray leading-snug mt-0.5 line-clamp-2">{banner.text}</div>
          )}
        </div>
        {banner.link && (
          <div className="w-7 h-7 rounded-full bg-[rgba(243,199,122,.12)] border border-[rgba(243,199,122,.25)] flex items-center justify-center shrink-0">
            <ArrowRight size={14} weight="bold" className="text-gold" />
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  banners: Banner[]
}

export default function BannerCard({ banners }: Props) {
  const [current, setCurrent] = useState(0)
  const [dir, setDir] = useState(1)
  const touchX = useRef(0)
  const touchT = useRef(0)

  // Auto-advance with randomized 3-4s interval; resets whenever current changes
  useEffect(() => {
    if (banners.length <= 1) return
    const delay = 3000 + Math.random() * 1000
    const id = setTimeout(() => {
      setDir(1)
      setCurrent(i => (i + 1) % banners.length)
    }, delay)
    return () => clearTimeout(id)
  }, [current, banners.length])

  const goTo = (idx: number, direction: number) => {
    setDir(direction)
    setCurrent(idx)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX
    touchT.current = Date.now()
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchX.current
    const dt = Date.now() - touchT.current
    if (Math.abs(dx) > 40 && dt < 500) {
      const d = dx < 0 ? 1 : -1
      goTo((current + d + banners.length) % banners.length, d)
    }
  }

  if (!banners.length) return null

  if (banners.length === 1) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="mx-4 mt-3"
      >
        <BannerItem banner={banners[0]} index={0} />
      </motion.div>
    )
  }

  return (
    <div className="mx-4 mt-3 select-none" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="relative overflow-hidden rounded">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={current}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
          >
            <BannerItem banner={banners[current]} index={current} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-2">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i, i > current ? 1 : -1)}
            className={`rounded-full transition-all duration-300 ${
              i === current ? 'w-4 h-1.5 bg-green' : 'w-1.5 h-1.5 bg-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
