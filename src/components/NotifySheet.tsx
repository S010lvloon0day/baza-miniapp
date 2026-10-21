import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from './Icon'
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
            className="fixed bottom-0 inset-x-0 z-50 bg-s1 rounded-t-[26px] border-t border-white/[.08]"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/15" />
            </div>

            <div className="flex items-center justify-between px-5 pt-2 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-[34px] h-[34px] rounded-[11px] bg-green/15 text-green grid place-items-center"><Icon name="bell" size={18} /></span>
                <span className="font-display font-semibold text-[16px]">Уведомления</span>
              </div>
              <button onClick={onClose} aria-label="Закрыть" className="w-9 h-9 rounded-full bg-white/[.07] grid place-items-center text-gray active:bg-white/10">
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="mx-4 list-group">
              <div
                className="flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer active:bg-white/[.04]"
                onClick={loading || saving ? undefined : toggle}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-[38px] h-[38px] rounded-[11px] grid place-items-center shrink-0 ${enabled ? 'bg-green/15 text-green' : 'bg-white/[.06] text-gray'}`}>
                    <Icon name={enabled ? 'bellRing' : 'bellOff'} size={19} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[14.5px] font-medium">Новые материалы</div>
                    <div className="text-[12.5px] text-gray mt-0.5">{enabled ? 'Уведомления включены' : 'Уведомления выключены'}</div>
                  </div>
                </div>
                <div className={`relative w-[44px] h-[26px] rounded-full shrink-0 transition-colors duration-200 ${enabled ? 'bg-green' : 'bg-s3'} ${loading || saving ? 'opacity-50' : ''}`}>
                  <div className={`absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all duration-200 ${enabled ? 'left-[21px]' : 'left-[3px]'}`} />
                </div>
              </div>
            </div>

            <p className="px-5 pt-3 text-[13px] text-gray leading-relaxed">
              {enabled
                ? 'Бот напишет вам в Telegram, когда в базе появятся новые материалы.'
                : 'Включите, чтобы узнавать о новых материалах прямо в Telegram.'}
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
