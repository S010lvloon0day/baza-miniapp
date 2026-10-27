import { useEffect, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from '../../components/Icon'

import type { IconName } from '../../components/Icon'

export const fmtDate = (s?: string | null) => {
  if (!s) return '—'
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z')
  if (isNaN(+d)) return s
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' +
    d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}
export const fmtDay = (s?: string | null) => {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(+d) ? s : d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
}
export const num = (n: number) => n.toLocaleString('ru-RU')

/** Простой «тост» для результатов действий. */
let pushToast: ((t: string, err?: boolean) => void) | null = null
export const toast = (t: string, err = false) => pushToast?.(t, err)
export function Toaster() {
  const [t, setT] = useState<{ text: string; err: boolean; k: number } | null>(null)
  useEffect(() => {
    pushToast = (text, err) => setT({ text, err: !!err, k: Date.now() })
    return () => { pushToast = null }
  }, [])
  useEffect(() => { if (t) { const id = setTimeout(() => setT(null), 2600); return () => clearTimeout(id) } }, [t])
  return (
    <AnimatePresence>
      {t && (
        <motion.div key={t.k} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
          className="glass fixed z-[80] left-4 right-4 mx-auto max-w-[560px] px-4 py-3 rounded-2xl flex items-center gap-2.5 text-[14px]"
          style={{ bottom: 'calc(env(safe-area-inset-bottom,0px) + 96px)' }}>
          <Icon name={t.err ? 'warnCircle' : 'checkCircle'} size={18} className={t.err ? 'text-[#FF6B6B]' : 'text-green'} />
          <span className="flex-1">{t.text}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Ошибка') || 'Ошибка'

export function Loader() {
  return <div className="flex justify-center py-12"><span className="w-7 h-7 rounded-full border-2 border-white/10 border-t-green animate-spin" /></div>
}
export function Empty({ icon = 'box', text }: { icon?: IconName; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-gray text-[14px]">
      <span className="w-14 h-14 rounded-2xl bg-s2 grid place-items-center"><Icon name={icon} size={26} accent="brand" /></span>
      {text}
    </div>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 mt-5 mb-2">
      <h3 className="text-[13px] font-semibold text-gray">{children}</h3>
      {right}
    </div>
  )
}

export function Row({ icon, title, sub, right, onClick, tone = 'green', danger }: {
  icon?: IconName; title: ReactNode; sub?: ReactNode; right?: ReactNode; onClick?: () => void
  tone?: 'green' | 'violet' | 'gold' | 'gray'; danger?: boolean
}) {
  const bg = { green: 'rgba(23,229,132,.12)', violet: 'rgba(118,87,255,.18)', gold: 'rgba(245,194,90,.16)', gray: 'rgba(255,255,255,.06)' }[tone]
  const fg = { green: '#17E584', violet: '#B9A8FF', gold: '#F5C25A', gray: '#A6B8AE' }[tone]
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${onClick ? 'active:bg-white/[.04]' : ''}`}>
      {icon && <span className="w-9 h-9 rounded-[11px] grid place-items-center shrink-0" style={{ background: bg, color: danger ? '#FF6B6B' : fg }}>
        <Icon name={icon} size={18} accent="current" />
      </span>}
      <span className="flex-1 min-w-0">
        <span className={`block text-[14.5px] font-medium truncate ${danger ? 'text-[#FF6B6B]' : ''}`}>{title}</span>
        {sub && <span className="block text-[12px] text-gray truncate mt-0.5">{sub}</span>}
      </span>
      {right}
      {onClick && !right && <Icon name="chevR" size={16} className="text-gray2 shrink-0" />}
    </Tag>
  )
}

export function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'gold' | 'red' | 'violet' | 'gray' }) {
  const s = {
    green: ['rgba(23,229,132,.14)', '#17E584'], gold: ['rgba(245,194,90,.16)', '#F5C25A'],
    red: ['rgba(255,107,107,.14)', '#FF8080'], violet: ['rgba(118,87,255,.2)', '#B9A8FF'], gray: ['rgba(255,255,255,.07)', '#A6B8AE'],
  }[tone]
  return <span className="inline-flex items-center h-[22px] px-2 rounded-full text-[11.5px] font-semibold shrink-0" style={{ background: s[0], color: s[1] }}>{children}</span>
}

export function Field({ label, value, onChange, placeholder, multiline, type = 'text', rows = 4 }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; type?: string; rows?: number
}) {
  const cls = 'w-full bg-s2 border border-white/[.08] rounded-[14px] px-3.5 py-3 text-[15px] text-fg placeholder:text-gray2 outline-none focus:border-white/20'
  return (
    <label className="block mb-3">
      {label && <span className="block text-[12.5px] text-gray mb-1.5 px-1">{label}</span>}
      {multiline
        ? <textarea className={cls + ' resize-y'} rows={rows} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
        : <input className={cls} type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />}
    </label>
  )
}

export function Toggle({ label, sub, value, onChange, tone = 'green' }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; tone?: 'green' | 'gold' }) {
  const on = tone === 'gold' ? '#F5C25A' : '#17E584'
  return (
    <button type="button" onClick={() => onChange(!value)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
      <span className="flex-1 min-w-0">
        <span className="block text-[14.5px] font-medium">{label}</span>
        {sub && <span className="block text-[12px] text-gray mt-0.5">{sub}</span>}
      </span>
      <span className="w-[46px] h-[28px] rounded-full p-[3px] transition-colors shrink-0" style={{ background: value ? on : 'rgba(255,255,255,.12)' }}>
        <span className="block w-[22px] h-[22px] rounded-full bg-white transition-transform" style={{ transform: value ? 'translateX(18px)' : 'none' }} />
      </span>
    </button>
  )
}

export function Segmented<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: [T, string, number?][] }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
      {items.map(([id, label, count]) => (
        <button key={id} onClick={() => onChange(id)} className={`chip ${value === id ? 'on' : ''}`}>
          {label}{count ? <span className={`ml-0.5 text-[11px] font-bold ${value === id ? 'text-bg/60' : 'text-green'}`}>{count}</span> : null}
        </button>
      ))}
    </div>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[70] bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="fixed z-[71] left-0 right-0 bottom-0 mx-auto w-full max-w-[600px] max-h-[88vh] overflow-y-auto rounded-t-[26px] bg-s1 border-t border-white/[.08] px-4 pt-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 20px)' }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 320 }}>
            <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-3" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-[17px]">{title}</h3>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/[.06] grid place-items-center"><Icon name="close" size={18} /></button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/** Подтверждение опасного действия. */
export function useConfirm() {
  const [st, setSt] = useState<{ text: string; ok: string; resolve: (v: boolean) => void } | null>(null)
  const ask = (text: string, ok = 'Удалить') => new Promise<boolean>(resolve => setSt({ text, ok, resolve }))
  const close = (v: boolean) => { st?.resolve(v); setSt(null) }
  const node = (
    <Sheet open={!!st} onClose={() => close(false)} title="Подтвердите">
      <p className="text-[15px] text-fg/90 mb-5 leading-relaxed">{st?.text}</p>
      <div className="flex gap-2">
        <button className="btn-secondary flex-1" onClick={() => close(false)}>Отмена</button>
        <button className="flex-1 h-11 rounded-[14px] font-semibold text-white" style={{ background: '#E5484D' }} onClick={() => close(true)}>{st?.ok}</button>
      </div>
    </Sheet>
  )
  return { ask, node }
}

export function IconBtn({ name, onClick, label, disabled }: { name: IconName; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button aria-label={label} disabled={disabled} onClick={e => { e.stopPropagation(); onClick() }}
      className="w-8 h-8 rounded-full grid place-items-center bg-white/[.05] text-fg/80 disabled:opacity-25 active:scale-90 transition-transform shrink-0">
      <Icon name={name} size={15} />
    </button>
  )
}
