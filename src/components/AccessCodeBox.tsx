import { useState } from 'react'
import { api } from '../api/client'

const fmtUntil = (u?: string | null) => !u ? 'навсегда' : 'до ' + new Date(u.replace(' ', 'T') + 'Z').toLocaleDateString('ru-RU')

/** «Есть код доступа?» — открывает выбранный раздел по коду (без Premium на остальную Базу). */
export default function AccessCodeBox({ onDone }: { onDone?: () => void }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const submit = async () => {
    if (!code.trim() || busy) return
    setBusy(true); setMsg(null)
    const r = await api.accessCode(code.trim()).catch(() => ({ error: 'net', message: 'Нет связи, попробуйте ещё раз.' } as any))
    setBusy(false)
    if (r.ok) {
      setMsg({ ok: true, text: `Готово! «${r.section_title}» открыт ${fmtUntil(r.until)}.` })
      setTimeout(() => onDone?.(), 900)
    } else setMsg({ ok: false, text: r.message || 'Не удалось активировать код.' })
  }
  if (!open) return (
    <button onClick={() => setOpen(true)} className="mx-3.5 mt-3 w-[calc(100%-28px)] card px-4 py-3.5 flex items-center gap-3 text-left active:opacity-90">
      <span className="text-[20px]" aria-hidden>🎟</span>
      <span className="flex-1 min-w-0">
        <b className="block text-[14.5px] font-semibold">Есть код доступа?</b>
        <small className="block text-[12.5px] text-gray">Введите код, чтобы открыть этот раздел</small>
      </span>
      <span className="text-gray text-[18px]" aria-hidden>›</span>
    </button>
  )
  return (
    <div className="mx-3.5 mt-3 card px-4 py-4">
      <b className="block text-[14.5px] font-semibold mb-2">🎟 Код доступа</b>
      <div className="flex gap-2">
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') submit() }}
          placeholder="XXXX-XXXX-XX" autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={16}
          className="flex-1 min-w-0 h-11 px-3.5 rounded-[12px] bg-black/30 border border-white/10 text-[15px] tracking-[.12em] font-mono outline-none focus:border-green/60" />
        <button onClick={submit} disabled={busy || !code.trim()}
          className="h-11 px-4 rounded-[12px] bg-green text-ink font-semibold text-[14.5px] disabled:opacity-50">{busy ? '…' : 'Открыть'}</button>
      </div>
      {msg && <p className={`mt-2 text-[13px] ${msg.ok ? 'text-green' : 'text-[#FF8A8A]'}`}>{msg.text}</p>}
    </div>
  )
}
