import { ArrowRight } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import type { Banner } from '../api/client'
import { API_BASE } from '../api/client'

const tg = (window as any).Telegram?.WebApp

interface Props {
  banner: Banner
}

export default function BannerCard({ banner }: Props) {
  const handleClick = () => {
    if (!banner.link) return
    if (tg?.openLink) {
      tg.openLink(banner.link)
    } else {
      window.open(banner.link, '_blank')
    }
  }

  const hasImage = !!banner.file_id
  const imageUrl = `${API_BASE}/api/banner/image`

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="mx-4 mt-3"
    >
      {hasImage ? (
        /* ── Баннер с фото ── */
        <div
          onClick={handleClick}
          className={`relative rounded overflow-hidden ${banner.link ? 'cursor-pointer active:opacity-80' : ''}`}
        >
          <img
            src={imageUrl}
            alt={banner.title}
            className="w-full object-cover max-h-[180px]"
            draggable={false}
          />
          {/* Overlay градиент снизу для текста */}
          {(banner.title || banner.text) && (
            <div className="absolute inset-x-0 bottom-0"
              style={{ background: 'linear-gradient(to top, rgba(8,7,13,.92) 0%, transparent 100%)' }}
            >
              <div className="flex items-end justify-between px-4 py-3 gap-2">
                <div className="flex-1 min-w-0">
                  {banner.title && (
                    <div className="text-[13px] font-bold text-white leading-snug">
                      {banner.emoji} {banner.title}
                    </div>
                  )}
                  {banner.text && (
                    <div className="text-[11px] text-gray leading-snug mt-0.5 line-clamp-1">
                      {banner.text}
                    </div>
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
          {/* Если нет текста — просто стрелка в углу */}
          {!banner.title && !banner.text && banner.link && (
            <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[rgba(8,7,13,.6)] flex items-center justify-center">
              <ArrowRight size={14} weight="bold" className="text-gold" />
            </div>
          )}
        </div>
      ) : (
        /* ── Текстовый баннер ── */
        <div
          onClick={handleClick}
          className={`relative rounded overflow-hidden ${banner.link ? 'cursor-pointer active:opacity-80' : ''}`}
        >
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
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

          <div className="relative z-10 flex items-center gap-3 px-4 py-3.5">
            {banner.emoji && (
              <div className="w-10 h-10 rounded-full bg-[rgba(243,199,122,.12)] border border-[rgba(243,199,122,.25)] flex items-center justify-center text-[20px] shrink-0">
                {banner.emoji}
              </div>
            )}
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
            {banner.link && (
              <div className="w-7 h-7 rounded-full bg-[rgba(243,199,122,.12)] border border-[rgba(243,199,122,.25)] flex items-center justify-center shrink-0">
                <ArrowRight size={14} weight="bold" className="text-gold" />
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
