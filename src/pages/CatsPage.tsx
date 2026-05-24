import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Lock } from '@phosphor-icons/react'
import { api } from '../api/client'
import type { Section } from '../api/client'

interface Props { onSection: (s: Section) => void }

export default function CatsPage({ onSection }: Props) {
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

  return (
    <div className="flex-1 overflow-y-auto pb-14">
      <div className="px-4 pt-4 pb-2 text-[11px] font-mono tracking-[1px] text-gray2">
        // {cats.length} разделов доступно
      </div>
      <div className="grid grid-cols-4 gap-2 px-4 pb-4">
        {cats.map((s, i) => (
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
