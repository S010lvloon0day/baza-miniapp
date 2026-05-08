import { X, ArrowRight } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import type { Banner } from '../api/client'

const tg = (window as any).Telegram?.WebApp

interface Props {
  banner: Banner
}

const STORAGE_KEY = 'dismissed_banner'

export default function BannerCard({ banner }: Props) {
  const dismissedKey = `${banner.title}::${banner.text}`
  const [visible, setVisible] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== dismissedKey
  )

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    localStorage.setItem(STORAGE_KEY, dismissedKey)
    setVisible(false)
  }

  const handleClick = () => {
    if (!banner.link) return
    if (tg?.openLink) {
      tg.openLink(banner.link)
    } else {
      window.open(banner.link, '_blank')
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.25 }}
          className="mx-4 mt-3"
        >
          <div
            onClick={handleClick}
            className={`relative rounded overflow-hidden ${banner.link ? 'cursor-pointer active:opacity-80' : ''}`}
          >
            {/* Background */}
            <div className="absolute inset-0 bg-s1" />
            <div className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse at 90% 50%, rgba(243,199,122,.22) 0%, transparent 60%), radial-gradient(ellipse at 10% 80%, rgba(157,92,255,.15) 0%, transparent 50%)',
              }}
            />
            <div className="absolute inset-0"
              style={{
                backgroundImage: 'linear-gradient(rgba(243,199,122,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(243,199,122,.05) 1px,transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
            {/* Bottom accent line */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

            {/* Content */}
            <div className="relative z-10 flex items-center gap-3 px-4 py-3.5">
              {/* Emoji */}
              {banner.emoji && (
                <div className="w-10 h-10 rounded-full bg-[rgba(243,199,122,.12)] border border-[rgba(243,199,122,.25)] flex items-center justify-center text-[20px] shrink-0">
                  {banner.emoji}
                </div>
              )}

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-white leading-snug">
                  {banner.title}
                </div>
                {banner.text && (
                  <div className="text-[11px] text-gray leading-snug mt-0.5 line-clamp-2">
                    {banner.text}
                  </div>
                )}
              </div>

              {/* Arrow or dismiss */}
              <div className="flex items-center gap-1 shrink-0">
                {banner.link && (
                  <div className="w-7 h-7 rounded-full bg-[rgba(243,199,122,.12)] border border-[rgba(243,199,122,.25)] flex items-center justify-center">
                    <ArrowRight size={14} weight="bold" className="text-gold" />
                  </div>
                )}
                <button
                  onClick={dismiss}
                  className="w-7 h-7 flex items-center justify-center text-gray2 hover:text-gray active:text-white transition-colors"
                >
                  <X size={14} weight="bold" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
