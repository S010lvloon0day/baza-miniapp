import { useState, useEffect, useRef, useCallback } from 'react'
import Icon from '../components/Icon'
import { sklad } from '../api/sklad'
import type { SkladHit, SkladStatus, SkladCourse } from '../api/sklad'

export default function SkladPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SkladHit[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [status, setStatus] = useState<SkladStatus | null>(null)
  const [opening, setOpening] = useState<number | null>(null)
  const [detail, setDetail] = useState<SkladCourse | null>(null)
  const [notice, setNotice] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadStatus = useCallback(() => {
    sklad.status().then(setStatus).catch(() => {})
  }, [])

  useEffect(() => { inputRef.current?.focus(); loadStatus() }, [loadStatus])

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

  const open = async (h: SkladHit) => {
    setOpening(h.thread_id); setNotice('')
    try {
      const r = await sklad.course(h.thread_id)
      if (r.status === 'limit') {
        setNotice(`📅 Лимит: ${r.limit ?? 3} курса в сутки. Возвращайтесь завтра.`)
      } else if (r.status === 'nolinks') {
        setNotice('В этом курсе не нашлось прямых ссылок. Попробуйте другой.')
      } else {
        setDetail(r)
      }
      loadStatus()
    } catch (e: any) {
      setNotice('Не удалось открыть курс: ' + (e.message || 'ошибка'))
    } finally { setOpening(null) }
  }

  // Экран «нужен Premium»
  if (status && !status.premium) {
    return (
      <div className="flex-1 grid place-items-center px-6 text-center">
        <div>
          <div className="text-[40px] mb-2">🔒</div>
          <h2 className="text-[17px] font-bold mb-1">Поиск курсов — только Premium</h2>
          <p className="text-[13.5px] text-gray">
            Оформите подписку, чтобы искать и скачивать любой из 100&nbsp;000+ курсов.
          </p>
        </div>
      </div>
    )
  }

  // Экран курса: описание + ссылки
  if (detail) {
    return (
      <div className="flex-1 overflow-y-auto pb-navsafe">
        <div className="px-3.5 pt-2 flex flex-col gap-3">
          <button onClick={() => setDetail(null)}
            className="self-start text-[13.5px] text-green active:opacity-70">← Назад к поиску</button>

          <div className="card-hero px-[18px] py-4">
            {detail.label && <small className="block text-[12px] text-green mb-0.5">{detail.label}</small>}
            <h1 className="font-display font-semibold text-[18px] leading-snug mb-2">{detail.title}</h1>
            {detail.description && (
              <p className="text-[13.5px] text-gray whitespace-pre-line leading-relaxed">
                {detail.description}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {(detail.links || []).map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-[14px]">
                <Icon name="download" size={16} accent="#03200F" />
                Скачать · {l.label}
              </a>
            ))}
          </div>

          <p className="text-[11.5px] text-gray px-1 pt-1">
            Ссылка открывается в браузере. Если файлов несколько — качайте по очереди.
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
            Сегодня доступно: {left} из {status.limit} курсов в сутки.
          </div>
        )}

        {notice && <div className="text-[13px] text-green px-1">{notice}</div>}

        {loading && <div className="text-center text-gray text-[13px] py-6">Ищу…</div>}

        {!loading && searched && results.length === 0 && (
          <div className="text-center text-gray text-[13px] py-6">Ничего не нашлось. Измените запрос.</div>
        )}

        <div className="flex flex-col gap-2">
          {results.map(h => (
            <button key={h.thread_id} onClick={() => open(h)} disabled={opening === h.thread_id}
              className="card-hero px-3.5 py-3 flex items-center gap-3 text-left active:opacity-80 disabled:opacity-50">
              <span className="flex-1 min-w-0">
                {h.label && <small className="block text-[11.5px] text-green truncate">{h.label}</small>}
                <b className="block text-[14px] font-medium leading-snug">{h.title}</b>
              </span>
              <span className="text-gray text-[13px] shrink-0">{opening === h.thread_id ? '…' : '→'}</span>
            </button>
          ))}
        </div>

        {!searched && !loading && (
          <div className="text-center text-gray text-[13px] py-10 px-4">
            Введите название курса — найдём среди 100&nbsp;000+ и дадим ссылку на скачивание.
          </div>
        )}
      </div>
    </div>
  )
}
