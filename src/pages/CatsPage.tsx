import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Lock } from '@phosphor-icons/react'
import CategoryIcon from '../components/CategoryIcon'
import { api } from '../api/client'
import type { Section } from '../api/client'

interface Props { onSection: (s: Section) => void; onGiveaway?: () => void }

const FEATURED_TITLE = 'Знания S010lvloon'

export default function CatsPage({ onSection, onGiveaway }: Props) {
  const [cats, setCats] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.sections()
      .then(d => setCats(d.sections.filter(s => !s.parent_id)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
    </div>
  )

  const featured = cats.find(s => s.title === FEATURED_TITLE)
  const rest = cats.filter(s => s.title !== FEATURED_TITLE)

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      <div className="px-4 pt-4 pb-4 text-[11px] font-mono text-gray2">
        // {cats.length} разделов доступно
      </div>

      {/* Featured — авторский раздел S010lvloon */}
      {featured && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => onSection(featured)}
          className="relative mx-4 mb-3 flex items-center gap-3.5 cursor-pointer overflow-hidden rounded-2xl transition-transform duration-150 active:-translate-y-0.5"
          style={{
            padding: '16px 18px',
            border: '1px solid rgba(255,188,46,.4)',
            borderRadius: 16,
            background: 'linear-gradient(135deg,rgba(255,188,46,.13),rgba(20,15,4,.4) 60%)',
            boxShadow: '0 8px 24px rgba(255,140,0,.08)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,188,46,.7),transparent)' }} />
          <div
            className="shrink-0 flex items-center justify-center"
            style={{ width: 46, height: 46, borderRadius: 13, background: 'radial-gradient(circle,rgba(255,188,46,.35),rgba(255,188,46,.06) 68%,transparent)', boxShadow: '0 0 20px rgba(255,188,46,.4)', color: '#FFCB57' }}
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" style={{ filter: 'drop-shadow(0 0 5px rgba(255,188,46,.9))' }}>
              <path d="M12 2l2.6 6.6L21 9l-5 4.3L17.5 20 12 16.3 6.5 20 8 13.3 3 9l6.4-.4z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <span
              className="inline-block text-[8px] font-extrabold uppercase mb-1"
              style={{ letterSpacing: '1.5px', border: '1px solid #FFBC2E', color: '#FFCB57', borderRadius: 5, padding: '2px 7px' }}
            >
              ★ Автор
            </span>
            <div className="text-[14.5px] font-extrabold truncate">{featured.title}</div>
            <div className="text-[10.5px] font-mono mt-px truncate" style={{ color: 'rgba(255,188,46,.75)' }}>курс · публикации · фишки</div>
          </div>
          <span className="font-extrabold text-[18px] shrink-0" style={{ color: '#FFCB57' }}>›</span>
        </motion.div>
      )}

      {/* Secret giveaway card */}
      {onGiveaway && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onGiveaway}
          className="relative mx-4 mb-5 flex items-center gap-3.5 cursor-pointer overflow-hidden rounded-2xl transition-transform duration-150 active:-translate-y-0.5"
          style={{
            padding: '16px 18px',
            border: '1px solid rgba(157,92,255,.4)',
            borderRadius: 16,
            background: 'linear-gradient(135deg,rgba(157,92,255,.14),rgba(15,10,25,.4) 60%)',
            boxShadow: '0 8px 24px rgba(157,92,255,.1)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(157,92,255,.7),transparent)' }} />
          <div
            className="shrink-0 flex items-center justify-center"
            style={{ width: 46, height: 46, borderRadius: 13, background: 'radial-gradient(circle,rgba(157,92,255,.35),rgba(157,92,255,.06) 68%,transparent)', boxShadow: '0 0 20px rgba(157,92,255,.4)', color: '#D5B8FF' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 5px rgba(157,92,255,.9))' }}>
              <rect x="4" y="10" width="16" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14.5px] font-extrabold truncate">Секретный розыгрыш</div>
            <div className="text-[10.5px] font-mono mt-px truncate" style={{ color: 'rgba(199,166,255,.75)' }}>особое задание · участвуй и выиграй</div>
          </div>
          <span className="font-extrabold text-[18px] shrink-0" style={{ color: '#D5B8FF' }}>›</span>
        </motion.div>
      )}

      <div className="grid grid-cols-4 gap-2 px-4 pb-4">
        {rest.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => onSection(s)}
            className={`relative p-2.5 rounded-2xl flex flex-col items-center gap-1.5 cursor-pointer overflow-hidden transition-transform duration-150 active:-translate-y-0.5
              ${s.locked
                ? 'border border-[rgba(157,92,255,.2)] active:bg-[rgba(157,92,255,.07)]'
                : 'border border-white/[.09] active:border-green/50'}`}
            style={{ background: s.locked ? 'rgba(157,92,255,.04)' : 'radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,.05), transparent 60%), #101014' }}
          >
            <div className="absolute top-0 left-0 right-0 h-px" style={{
              background: s.locked
                ? 'linear-gradient(90deg, transparent, rgba(157,92,255,.4), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent)'
            }} />
            <span className="absolute top-1.5 left-1.5 font-mono text-[8px] text-gray2/60 leading-none tabular-nums">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className={`relative w-10 h-10 flex items-center justify-center ${s.locked ? 'opacity-50' : ''}`}>
              <CategoryIcon title={s.title} />
              {s.locked && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#9D5CFF] rounded-full flex items-center justify-center">
                  <Lock size={8} weight="fill" className="text-white" />
                </div>
              )}
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-[0.3px] text-center leading-tight w-full line-clamp-2
              ${s.locked ? 'text-violet/50' : 'text-[#d4d4d8]'}`}>
              {s.title}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
