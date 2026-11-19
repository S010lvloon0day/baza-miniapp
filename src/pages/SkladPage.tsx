import { useState, useEffect, useRef, useCallback } from 'react'
import Icon from '../components/Icon'
import { sklad } from '../api/sklad'
import type { SkladHit, SkladStatus, SkladCourse } from '../api/sklad'
import Dropdown from '../components/Dropdown'

type Hit = SkladHit & { where?: 'title' | 'text' }
type Sort = 'new' | 'old' | 'year' | 'az'
const yearOf = (t: string) => { const m = t.match(/(20\d\d)(?!.*20\d\d)/); return m ? Number(m[1]) : 0 }

export default function SkladPage({ onUpgrade }: { onUpgrade?: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Hit[]>([])
  const [more, setMore] = useState(false)
  const [sort, setSort] = useState<Sort>('new')
  const [cat, setCat] = useState('')
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
      setResults(r.results); setMore(!!r.more); setCat(''); setSearched(true)
    } catch (e: any) {
      setNotice(e.message === 'premium_required' ? '' : 'Ошибка поиска, попробуйте ещё раз.')
    } finally { setLoading(false) }
  }, [])

  const onChange = (v: string) => {
    setQuery(v)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => doSearch(v), 800)
  }

  const open = async (h: SkladHit) => {
    setOpening(h.thread_id); setNotice('')
    try {
      const r = await sklad.course(h.thread_id)
      if (r.status === 'limit') {
        setNotice(status?.premium ? 'Все 5 курсов на сегодня уже открыты. Новые будут доступны завтра.' : 'Бесплатный курс на сегодня уже открыт. С Premium — 5 курсов в сутки.')
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
                <Icon name="download" size={16} accent="#FFFFFF" />
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
  // категории — из найденного, с числом курсов в каждой
  const cats = [...new Set(results.map(h => h.label || '').filter(Boolean))]
    .map(c => ({ id: c, label: `${c} · ${results.filter(h => h.label === c).length}` }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'))
  const shown = results.filter(h => !cat || h.label === cat)
  const sorted = sort === 'new' ? shown
    : sort === 'old' ? [...shown].reverse()
    : sort === 'year' ? [...shown].sort((a, b) => yearOf(b.title) - yearOf(a.title))
    : [...shown].sort((a, b) => a.title.localeCompare(b.title, 'ru'))

  return (
    <div className="flex-1 overflow-y-auto pb-navsafe">
      <div className="px-3.5 pt-2 flex flex-col gap-3">

        <div className="sbar !cursor-text">
          <Icon name="search" size={18} accent="#8a8f98" />
          <input
            ref={inputRef} value={query} onChange={e => onChange(e.target.value)}
            placeholder="Название курса, автор или школа…"
            className="flex-1 bg-transparent outline-none text-[15px]"
          />
        </div>

        {status && (
          <div className="sk-quota2 anim-up">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <b className="block text-[14.5px] font-semibold">
                  {(left ?? 0) > 0 ? `Сегодня доступно: ${left} из ${status.limit}` : 'Лимит на сегодня исчерпан'}
                </b>
                <small className="block text-[12.5px] text-gray mt-0.5">
                  {status.premium ? 'Premium · 5 курсов в сутки' : 'Бесплатно · 1 курс в сутки'}
                </small>
              </div>
              <div className="flex gap-1.5 shrink-0" aria-hidden="true">
                {Array.from({ length: status.limit }).map((_, i) => (
                  <span key={i} className={`sk-q2 ${i < (left ?? 0) ? (status.premium ? 'p' : 'a') : ''}`} style={{ animationDelay: `${0.2 + i * 0.12}s` }} />
                ))}
              </div>
            </div>
            {!status.premium && onUpgrade && (
              <button onClick={onUpgrade} className="btn-gold gold-metal sheen w-full mt-3">
                <b>5 курсов в день с Premium</b>
                <small>Оформить подписку</small>
              </button>
            )}
          </div>
        )}

        {notice && <div className="text-[13px] text-green px-1">{notice}</div>}

        {loading && <div className="text-center text-gray text-[13px] py-6">Ищу…</div>}

        {!loading && searched && results.length === 0 && (
          <div className="text-center text-gray text-[13px] py-6">Ничего не нашлось. Измените запрос.</div>
        )}

        {!loading && searched && results.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-1">
            <span className="text-[13px] text-gray tabular-nums mr-1">Найдено: {shown.length}{shown.length !== results.length ? ` из ${results.length}` : ''}{more ? '+' : ''}</span>
            <Dropdown label="Порядок" value={sort} onChange={setSort} options={[
              { id: 'new', label: 'Сначала новые' }, { id: 'old', label: 'Сначала старые' },
              { id: 'year', label: 'По году курса' }, { id: 'az', label: 'По названию' }]} />
            {cats.length > 1 && <Dropdown label="Раздел" value={cat} onChange={setCat} options={[{ id: '', label: 'Все' }, ...cats]} />}
          </div>
        )}
        {!loading && more && (
          <div className="text-[12.5px] text-gray px-1">Показаны первые результаты. Уточните запрос, чтобы увидеть остальное.</div>
        )}

        <div className="flex flex-col gap-2">
          {sorted.map(h => (
            <button key={h.thread_id} onClick={() => open(h)} disabled={opening === h.thread_id}
              className="card-hero px-3.5 py-3 flex items-center gap-3 text-left active:opacity-80 disabled:opacity-50">
              <span className="flex-1 min-w-0">
                {(h.label || h.where === 'text') && <small className="block text-[11.5px] text-green truncate">{h.label}{h.where === 'text' ? `${h.label ? ' · ' : ''}упоминается в описании` : ''}</small>}
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
