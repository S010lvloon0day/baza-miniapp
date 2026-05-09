import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, BellSlash } from '@phosphor-icons/react'
import { api } from '../api/client'

interface Props {
  open: boolean
  onClose: () => void
}

export default function NotifySheet({ open, onClose }: Props) {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.notifyGet().then(r => {
      setEnabled(r.enabled)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [open])

  const toggle = async () => {
    const next = !enabled
    setEnabled(next)
    setSaving(true)
    try {
      await api.notifySet(next)
    } catch {
      setEnabled(!next)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 inset-x-0 z-50 bg-s1 rounded-t-2xl border-t border-bd2 pb-8"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-bd2" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-3 pb-5">
              <div className="flex items-center gap-2.5">
                <Bell size={20} weight="fill" className="text-green" />
                <span className="text-[15px] font-bold tracking-wide">Уведомления</span>
              </div>
              <button onClick={onClose} className="text-gray2 p-1 active:opacity-60">
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Toggle row */}
            <div className="mx-4 rounded-xl border border-bd2 bg-s2 overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-4 cursor-pointer active:bg-s1"
                onClick={loading || saving ? undefined : toggle}
              >
                <div className="flex items-center gap-3">
                  {enabled
                    ? <Bell size={20} weight="fill" className="text-green" />
                    : <BellSlash size={20} weight="fill" className="text-gray2" />
                  }
                  <div>
                    <div className="text-[13px] font-semibold text-white">Новые материалы</div>
                    <div className="text-[11px] text-gray mt-0.5">
                      {enabled ? 'Уведомления включены' : 'Уведомления выключены'}
                    </div>
                  </div>
                </div>

                {/* Toggle switch */}
                <div
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                    enabled ? 'bg-green' : 'bg-bd2'
                  } ${loading || saving ? 'opacity-50' : ''}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                    enabled ? 'left-7' : 'left-1'
                  }`} />
                </div>
              </div>
            </div>

            <p className="px-5 pt-3 text-[11px] text-gray leading-relaxed">
              {enabled
                ? 'Бот пришлёт сообщение когда администратор добавит новые материалы в базу знаний.'
                : 'Включите, чтобы получать уведомления о новых материалах прямо в Telegram.'
              }
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
