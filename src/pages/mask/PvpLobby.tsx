import { useEffect, useRef, useState } from 'react'
import { maskApi } from '../../api/mask'

const tg = (window as any).Telegram?.WebApp
const VIS_KEY = 'mg_pvp_visible'
const readVis = () => { try { return localStorage.getItem(VIS_KEY) === '1' } catch { return false } }

/** Бой с другом: ссылка-вызов, список тех, кто сейчас в игре, входящие вызовы. onFight(code) — открыть бой. */
export default function PvpLobby({ onClose, onFight }: { onClose: () => void; onFight: (code: string) => void }) {
  const [visible, setVisible] = useState(readVis)
  const [online, setOnline] = useState<{ id: number; name: string }[]>([])
  const [inbox, setInbox] = useState<{ code: string; name: string }[]>([])
  const [link, setLink] = useState<{ code: string; link: string } | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const visRef = useRef(visible); visRef.current = visible

  useEffect(() => {
    let alive = true
    const ping = () => maskApi.pvpPing(visRef.current).then(r => { if (alive) { setOnline(r.online); setInbox(r.inbox) } }).catch(e => { if (alive && e?.message === 'teaser') setNote('Бой с другом откроется вместе с игрой') })
    ping(); const t = window.setInterval(ping, 4000)
    return () => { alive = false; window.clearInterval(t) }
  }, [visible])

  const toggle = () => { const v = !visible; setVisible(v); try { localStorage.setItem(VIS_KEY, v ? '1' : '0') } catch { /* */ } }
  const create = async () => {
    setBusy(true); setNote('')
    try { setLink(await maskApi.pvpCreate()) } catch { setNote('Не удалось создать вызов') }
    setBusy(false)
  }
  const share = () => {
    if (!link?.link) return
    const u = 'https://t.me/share/url?url=' + encodeURIComponent(link.link) + '&text=' + encodeURIComponent('Вызываю тебя на бой в игре «Сними маску»!')
    try { tg?.openTelegramLink ? tg.openTelegramLink(u) : window.open(u, '_blank') } catch { window.open(u, '_blank') }
  }
  const challenge = async (id: number) => {
    setBusy(true); setNote('')
    try { const r = await maskApi.pvpCreate(id); onFight(r.code) }
    catch (e: any) { setNote(e?.message === 'offline' ? 'Игрок уже вышел' : 'Не удалось отправить вызов') }
    setBusy(false)
  }
  const decline = (code: string) => { maskApi.pvpDecline(code).catch(() => {}); setInbox(x => x.filter(i => i.code !== code)) }

  return (
    <div className="fixed inset-0 z-[900] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="card w-full max-w-[460px] rounded-b-none sm:rounded-b-[22px] p-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="font-display font-semibold text-[17px]">Бой с другом</div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/[.08] grid place-items-center" aria-label="Закрыть">✕</button>
        </div>
        <p className="text-[12.5px] text-gray mt-1">Онлайн-бой с другим игроком Базы знаний. Тренировка: на прохождение этапа и приз не влияет.</p>

        {inbox.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {inbox.map(i => (
              <div key={i.code} className="rounded-[14px] bg-gold/10 border border-gold/30 px-3 py-2.5 flex items-center gap-2">
                <span className="flex-1 min-w-0 text-[13.5px]"><b>{i.name}</b> вызывает тебя на бой</span>
                <button onClick={() => onFight(i.code)} className="btn-primary !w-auto px-3 h-9 rounded-[12px] text-[13px]">Принять</button>
                <button onClick={() => decline(i.code)} className="btn-secondary !w-auto px-3 h-9 rounded-[12px] text-[13px]">Нет</button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 rounded-[14px] bg-white/[.05] px-3.5 py-3">
          <div className="text-[14px] font-medium">Ссылка-вызов</div>
          <p className="text-[12px] text-gray mt-0.5">Отправь другу в Telegram — бой начнётся, когда он откроет ссылку.</p>
          {!link ? (
            <button onClick={create} disabled={busy} className="btn-primary w-full h-11 rounded-[14px] mt-2.5">Создать вызов</button>
          ) : (
            <div className="flex gap-2 mt-2.5">
              <button onClick={share} className="btn-primary flex-1 h-11 rounded-[14px]">Отправить другу</button>
              <button onClick={() => onFight(link.code)} className="btn-secondary flex-1 h-11 rounded-[14px]">Ждать на арене</button>
            </div>
          )}
        </div>

        <div className="mt-3 rounded-[14px] bg-white/[.05] px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[14px] font-medium">Сейчас в игре</div>
            <label className="flex items-center gap-2 text-[12.5px] text-gray cursor-pointer select-none">
              <input type="checkbox" checked={visible} onChange={toggle} className="accent-green w-4 h-4" />
              показывать меня
            </label>
          </div>
          {!visible && <p className="text-[12px] text-gray2 mt-1">Включи, чтобы тебя видели и могли вызвать. Видно только имя из Telegram.</p>}
          <div className="flex flex-col gap-1.5 mt-2">
            {online.length === 0 ? <div className="text-[12.5px] text-gray2 py-1">Пока никого — позови друга ссылкой.</div> : online.map(o => (
              <div key={o.id} className="flex items-center gap-2 rounded-[12px] bg-white/[.04] px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-green shrink-0" />
                <span className="flex-1 min-w-0 truncate text-[13.5px]">{o.name}</span>
                <button onClick={() => challenge(o.id)} disabled={busy} className="btn-primary !w-auto px-3 h-8 rounded-[10px] text-[12.5px]">Вызвать</button>
              </div>
            ))}
          </div>
        </div>
        {note && <div className="text-[12.5px] text-gold mt-2">{note}</div>}
      </div>
    </div>
  )
}
