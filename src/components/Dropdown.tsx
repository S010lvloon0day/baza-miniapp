import { useState } from 'react'
import Icon from './Icon'

/** Компактное выпадающее меню: «Подпись: значение ▾». */
export default function Dropdown<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 h-8 pl-3 pr-2.5 rounded-full bg-white/[.06] border border-white/[.08] text-[13px] max-w-[230px]">
        <span className="text-gray shrink-0">{label}:</span>
        <b className="font-semibold truncate">{options.find(o => o.id === value)?.label}</b>
        <svg width="12" height="12" viewBox="0 0 12 12" className={`text-gray shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 left-0 top-[38px] min-w-[200px] max-w-[280px] max-h-[320px] overflow-y-auto rounded-[16px] bg-s1 border border-white/[.1] shadow-xl shadow-black/40 py-1.5">
            {options.map(o => (
              <button key={o.id || '_'} onClick={() => { setOpen(false); if (o.id !== value) onChange(o.id) }}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-[14px] text-left active:bg-white/[.06]">
                <span className={`truncate ${value === o.id ? 'text-green font-semibold' : ''}`}>{o.label}</span>
                {value === o.id && <Icon name="check" size={16} className="text-green shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
