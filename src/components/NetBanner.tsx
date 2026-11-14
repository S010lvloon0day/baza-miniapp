import { useEffect, useState } from 'react'

/** Плашка «нет связи»: появляется, когда запросы к серверу не проходят, и сама исчезает, когда связь вернулась. */
export default function NetBanner() {
  const [down, setDown] = useState(false)
  useEffect(() => {
    let fails = 0
    const onFail = () => { if (++fails >= 2) setDown(true) }
    const onOk = () => { fails = 0; setDown(false) }
    window.addEventListener('api-fail', onFail)
    window.addEventListener('api-ok', onOk)
    return () => { window.removeEventListener('api-fail', onFail); window.removeEventListener('api-ok', onOk) }
  }, [])
  if (!down) return null
  return (
    <div className="fixed z-[80] left-3 right-3 mx-auto max-w-[520px] rounded-[16px] px-4 py-3 flex items-center gap-3 border border-white/[.1]"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 10px)', background: '#2A1416' }} role="alert">
      <span className="flex-1 text-[13.5px] leading-snug">Нет связи с сервером. Проверьте интернет.</span>
      <button onClick={() => window.location.reload()} className="shrink-0 h-8 px-3 rounded-full bg-white/10 text-[13px] font-semibold">Обновить</button>
    </div>
  )
}
