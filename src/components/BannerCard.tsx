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
  const [loaded, setLoaded] = useState(false)

  return hasImage ? (
    <div
      onClick={() => openUrl(banner.link)}
      className={`relative overflow-hidden ${banner.link ? 'cursor-pointer active:opacity-80' : ''}`}
      style={{ minHeight: 140 }}
    >
      {/* Skeleton */}
      {!loaded && (
        <div className="absolute inset-0 bg-s2 animate-pulse" />
      )}

      {isAnimation ? (
        <video
          src={imageUrl}
          autoPlay loop muted playsInline
          onCanPlay={() => setLoaded(true)}
          className={`w-full object-cover max-h-[180px] transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : (
        <img
          src={imageUrl}
          alt={banner.title}
          draggable={false}
          onLoad={() => setLoaded(true)}
          className={`w-full object-cover max-h-[180px] transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}

      {(banner.title || banner.text) && (
        <div className="absolute inset-x-0 bottom-0"
          style={{ background: 'linear-gradient(to top, rgba(6,6,12,.95) 0%, transparent 100%)' }}>
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
              <div className="w-7 h-7 border border-white/20 flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,.1)' }}>
                <ArrowRight size={14} weight="bold" className="text-white" />
              </div>
            )}
          </div>
        </div>
      )}
      {!banner.title && !banner.text && banner.link && (
        <div className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center" style={{ background: 'rgba(6,6,12,.6)' }}>
          <ArrowRight size={14} weight="bold" className="text-white" />
        </div>
      )}
    </div>
  ) : (
    <div
      onClick={() => openUrl(banner.link)}
      className={`relative overflow-hidden ${banner.link ? 'cursor-pointer active:opacity-80' : ''}`}
    >
      <div className="absolute inset-0 bg-s1" />
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 90% 50%, rgba(255,255,255,.06) 0%, transparent 60%), radial-gradient(ellipse at 10% 80%, rgba(157,92,255,.12) 0%, transparent 50%)' }} />
      <div className="absolute inset-0"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)', backgroundSize: '20px 20px' }} />
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.2), transparent)' }} />
      <div className="relative z-10 flex items-center gap-3 px-4 py-3.5">
        {banner.emoji && (
          <div className="w-10 h-10 border border-white/10 flex items-center justify-center text-[20px] shrink-0" style={{ background: 'rgba(255,255,255,.05)' }}>
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
          <div className="w-7 h-7 border border-white/15 flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,.06)' }}>
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

  // Preload all banner images on mount
  useEffect(() => {
    banners.forEach((b, i) => {
      if (!b.file_id) return
      if (b.media_type === 'animation') return
      const img = new window.Image()
      img.src = `${API_BASE}/api/banner/image?index=${i}`
    })
  }, [banners])

  // Auto-advance
  useEffect(() => {
    if (banners.length <= 1) return
    const id = setTimeout(() => {
      setDir(1)
      setCurrent(i => (i + 1) % banners.length)
    }, 5000 + Math.random() * 1000)
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
      <div className="mx-4 mt-3">
        <BannerItem banner={banners[0]} index={0} />
      </div>
    )
  }

  return (
    <div className="mx-4 mt-3 select-none" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* mode="popLayout" — exiting element goes position:absolute, no layout collapse */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" custom={dir}>
          <motion.div
            key={current}
            custom={dir}
            initial={{ opacity: 0, x: dir * 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -36 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ width: '100%' }}
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
            className={`transition-all duration-300 ${
              i === current ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
