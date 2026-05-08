import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
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
            className="premium-surface border border-bd rounded p-3 flex flex-col items-center gap-1.5 cursor-pointer active:bg-s2 active:border-green"
          >
            <div className="w-10 h-10 bg-s2 rounded-full border border-bd2 flex items-center justify-center text-lg">
              {s.emoji || '📁'}
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-gray text-center leading-tight">
              {s.title}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
