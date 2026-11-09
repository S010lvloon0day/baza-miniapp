import { useState, useEffect, useRef, useCallback } from 'react'
import Icon from '../components/Icon'
import { sklad } from '../api/sklad'
import type { SkladHit, SkladStatus } from '../api/sklad'

export default function SkladPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SkladHit[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [status, setStatus] = useState<SkladStatus | null>(null)
  const [ordering, setOrdering] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadStatus = useCallback(() => {
    sklad.status().then(setStatus).catch(() => {})
  }, [])

  useEffect(() => { inputRef.current?.focus(); loadStatus() }, [loadStatus])

  // Пока есть активный заказ — опрашиваем позицию в очереди
  useEffect(() => {
    if (!status?.active) return
    const t = setInterval(loadStatus, 8000)
    return () => clearInterval(t)
  }, [status?.active, loadStatus])

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 3) { setResults([]); setSearched(false); return }
    setLoading(true); setNotice('')
    try {
      const r = await sklad.search(q.trim())
      setResults(r.results); setSearched(true)
    } catch (e: any) {
      setNotice(e.message === 'premium_required' ? '' : 'Ошибка поиска, попробуйте ещё раз.')
    } finally { setLoading(false) }
  }, [])

  const onChange = (v: string) => {
    setQuery(v)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => doSearch(v), 500)
  }

  const order = async (h: SkladHit) => {
    setOrdering(h.thread_id); setNotice('')
    try {
      const r = await sklad.download(h.thread_id)
      if (r.status === 'limit')
        setNotice('📅 Лимит: 1 курс в сутки. Возвращайтесь завтра.')
      else if (r.status === 'active')
        setNotice(`⏳ У вас уже есть заказ в очереди (позиция ${r.position}). Дождитесь его.`)
      else if (r.position === 0)
        setNotice(`🚀 Качаю «${r.title}» — курс придёт в чат с ботом.`)
      else
        setNotice(`✅ Заказ принят. Вы в очереди, перед вами: ${r.position}. Курс придёт в Telegram.`)
      loadStatus()
    } catch (e: any) {
      setNotice('Не удалось оформить заказ: ' + (e.message || 'ошибка'))
    } finally { setOrdering(null) }
  }

  if (status && !status.premium) {
    return (
      <div className="flex-1 grid place-items-center px-6 text-center">
        <div>
          <div className="text-[40px] mb-2">🔒</div>
          <h2 className="text-[17px] font-bold mb-1">Поиск курсов — только Premium</h2>
          <p className="text-[13.5px] text-gray">
            Оформите подписку, чтобы искать и скачивать любой из 100&nbsp;000+ курсов прямо в Telegram.
          </p>
        </div>
      </div>
    )
  }

  const left = status ? Math.max(0, status.limit - status.used_today) : null

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      <div className="px-3.5 pt-2 flex flex-col gap-3">

        <div className="flex items-center gap-2 card-hero px-3.5 py-2.5">
          <Icon name="search" size={18} accent="#8a8f98" />
          <input
            ref={inputRef} value={query} onChange={e => onChange(e.target.value)}
            placeholder="Название курса, автор или школа…"
            className="flex-1 bg-transparent outline-none text-[15px]"
          />
        </div>

        {status && (
          <div className="text-[12.5px] text-gray px-1">
            {status.active
              ? (status.active.status === 'processing'
                  ? `⏳ «${status.active.title}» качается — скоро придёт в чат с ботом.`
                  : `⏳ «${status.active.title}» в очереди, позиция ${status.active.position}.`)
              : `Сегодня доступно: ${left} из ${status.limit} курсов в сутки.`}
          </div>
        )}

        {notice && <div className="text-[13px] text-green px-1">{notice}</div>}

        {loading && <div className="text-center text-gray text-[13px] py-6">Ищу…</div>}

        {!loading && searched && results.length === 0 && (
          <div className="text-center text-gray text-[13px] py-6">Ничего не нашлось. Измените запрос.</div>
        )}

        <div className="flex flex-col gap-2">
          {results.map(h => (
            <div key={h.thread_id} className="card-hero px-3.5 py-3 flex items-center gap-3">
              <span className="flex-1 min-w-0">
                {h.label && <small className="block text-[11.5px] text-green truncate">{h.label}</small>}
                <b className="block text-[14px] font-medium leading-snug">{h.title}</b>
              </span>
              <button
                onClick={() => order(h)}
                disabled={ordering === h.thread_id || !!status?.active}
                className="btn-primary shrink-0 px-3.5 py-2 text-[13px] disabled:opacity-50"
              >
                {ordering === h.thread_id ? '…' : 'Скачать'}
              </button>
            </div>
          ))}
        </div>

        {!searched && !loading && (
          <div className="text-center text-gray text-[13px] py-10 px-4">
            Введите название курса — найдём среди 100&nbsp;000+ и пришлём файлом в Telegram.
          </div>
        )}
      </div>
    </div>
  )
}
