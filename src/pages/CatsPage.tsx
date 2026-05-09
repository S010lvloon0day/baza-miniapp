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
      <div className="px-4 pt-4 pb-2 text-[11px] font-semibold tracking-[2px] text-gray uppercase">
        {cats.length} категорий
      </div>
      <div className="grid grid-cols-4 gap-2 px-4 pb-4">
        {cats.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => onSection(s)}
            className={`premium-surface border rounded p-3 flex flex-col items-center gap-1.5 cursor-pointer active:bg-s2 ${s.locked ? 'border-[rgba(157,92,255,.3)]' : 'border-bd active:border-green'}`}
          >
            <div className={`w-10 h-10 rounded-full border flex items-center justify-center text-lg relative ${s.locked ? 'bg-[rgba(157,92,255,.08)] border-[rgba(157,92,255,.25)]' : 'bg-s2 border-bd2'}`}>
              {s.emoji || '📁'}
              {s.locked && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-violet rounded-full flex items-center justify-center">
                  <Lock size={8} weight="fill" className="text-white" />
                </div>
              )}
            </div>
            <span className={`text-[9px] font-semibold uppercase tracking-[0.5px] text-center leading-tight ${s.locked ? 'text-violet/70' : 'text-gray'}`}>
              {s.title}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
