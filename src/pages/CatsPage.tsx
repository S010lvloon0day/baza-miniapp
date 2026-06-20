import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Lock } from '@phosphor-icons/react'
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
    <div className="flex-1 overflow-y-auto pb-14">
      <div className="px-4 pt-4 pb-2 text-[11px] font-mono tracking-[1px] text-gray2">
        // {cats.length} разделов доступно
      </div>

      {/* Featured — авторский раздел S010lvloon */}
      {featured && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => onSection(featured)}
          className="relative mx-4 mb-3 cursor-pointer overflow-hidden rounded-md active:opacity-80 transition-opacity"
          style={{
            background: 'linear-gradient(135deg, rgba(255,188,46,.12), rgba(255,140,0,.05))',
            border: '1px solid rgba(255,188,46,.45)',
            boxShadow: '0 0 22px rgba(255,188,46,.12)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,188,46,.8), transparent)' }} />
          <div className="flex items-center gap-3 px-4 py-4">
            <div
              className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: 'rgba(255,188,46,.14)', border: '1px solid rgba(255,188,46,.35)' }}
            >
              {featured.emoji || '🧠'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 mb-1 rounded-sm" style={{ background: 'rgba(255,188,46,.18)' }}>
                <span className="text-[8px] font-bold tracking-[2px] uppercase" style={{ color: '#FFBC2E' }}>★ Автор</span>
              </div>
              <div className="text-[14px] font-bold text-white leading-tight truncate">{featured.title}</div>
              <div className="text-[10px] font-mono mt-0.5 truncate" style={{ color: 'rgba(255,188,46,.7)' }}>// курс · публикации · фишки</div>
            </div>
            <span className="font-bold text-[20px] shrink-0" style={{ color: '#FFBC2E' }}>›</span>
          </div>
        </motion.div>
      )}

      {/* Secret giveaway card */}
      {onGiveaway && (
        <div
          onClick={onGiveaway}
          className="relative mx-4 mb-3 cursor-pointer overflow-hidden active:opacity-75 transition-opacity"
          style={{ background: 'rgba(157,92,255,.06)', border: '1px solid rgba(157,92,255,.3)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(157,92,255,.6), transparent)' }} />
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="text-2xl shrink-0">🔐</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-white">Секретный розыгрыш</div>
              <div className="text-[10px] font-mono" style={{ color: 'rgba(199,166,255,.6)' }}>// особое задание · участвуй и выиграй</div>
            </div>
            <span className="font-bold text-[18px] shrink-0" style={{ color: '#C7A6FF' }}>›</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 px-4 pb-4">
        {rest.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => onSection(s)}
            className={`relative p-2.5 flex flex-col items-center gap-1.5 cursor-pointer overflow-hidden transition-colors
              ${s.locked
                ? 'border border-[rgba(157,92,255,.2)] active:bg-[rgba(157,92,255,.07)]'
                : 'border border-bd active:border-white/30 active:bg-white/[.03]'}`}
            style={{ background: s.locked ? 'rgba(157,92,255,.04)' : 'rgba(255,255,255,.02)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-px" style={{
              background: s.locked
                ? 'linear-gradient(90deg, transparent, rgba(157,92,255,.4), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent)'
            }} />
            <span className="absolute top-1.5 left-1.5 font-mono text-[8px] text-gray2/60 leading-none tabular-nums">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="relative w-10 h-10 flex items-center justify-center text-xl">
              <span className={s.locked ? 'opacity-50' : ''}>{s.emoji || '📁'}</span>
              {s.locked && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#9D5CFF] rounded-full flex items-center justify-center">
                  <Lock size={8} weight="fill" className="text-white" />
                </div>
              )}
            </div>
            <span className={`text-[9px] font-mono uppercase tracking-[0.5px] text-center leading-tight w-full line-clamp-2
              ${s.locked ? 'text-violet/50' : 'text-gray'}`}>
              {s.title}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
