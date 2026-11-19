import { useState, useEffect, useRef, useCallback } from 'react'
import Icon from '../components/Icon'
import { sklad } from '../api/sklad'
import type { SkladHit, SkladStatus, SkladCourse, SkladQueueItem } from '../api/sklad'
import Dropdown from '../components/Dropdown'

type Hit = SkladHit
type Sort = 'ready' | 'new' | 'old' | 'year' | 'az'
type Notice = { tone: 'ok' | 'warn' | 'info'; title: string; text: string } | null

/** «примерно к 14:30» / «в ближайшие минуты» / «завтра около 09:10» */
export function etaText(eta?: number): string {
  if (!eta) return 'в течение суток'
  const now = Date.now() / 1000, d = eta - now
  if (d < 40 * 60) return 'в ближайшие минуты'
  const t = new Date(eta * 1000), hm = t.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  if (d > 30 * 3600) return 'в течение суток'
  return t.getDate() === new Date().getDate() ? `примерно к ${hm}` : `завтра около ${hm}`
}
const people = (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'человек' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 'человека' : 'человек'}`

function HowItWorks({ st, open, onToggle }: { st: SkladStatus | null; open: boolean; onToggle: () => void }) {
  const nf = st?.new_free ?? 1, np = st?.new_prem ?? 5, cf = st?.cached_free ?? 5
  return (
    <div className="sk-help">
      <button onClick={onToggle} className="sk-help-h" aria-expanded={open}>
        <Icon name="question" size={16} accent="current" /><b>Как работает поиск курсов</b><span className={`sk-help-c ${open ? 'o' : ''}`}>⌄</span>
      </button>
      {open && (
        <div className="sk-help-b">
          <p><span className="sk-tag r">⚡ Мгновенно</span> — курс уже открыт у нас, ссылки появятся сразу. Бесплатно — {cf} таких в день, с Premium — без ограничений.</p>
          <p><span className="sk-tag n">Новый</span> — курс открывается впервые, на это уходит <b>1 токен</b>. Токенов {st?.tokens_total ?? 15} в сутки <i>на всех пользователей сразу</i>, поэтому новые курсы делятся честно: бесплатно — {nf} в день, с Premium — {np} и в первую очередь. Токен, потраченный однажды, открывает курс для всех навсегда.</p>
          <p><span className="sk-tag q">⏳ Очередь</span> — если свободных токенов сейчас нет, курс встаёт в очередь и откроется, как только токен освободится. Ссылки <b>придут в бота автоматически</b> — повторно нажимать ничего не нужно. Место и примерное время видно ниже, в «Ваша очередь». Передумали — уберите курс из очереди кнопкой ×, лимит вернётся.</p>
          <p><span className="sk-tag w">Тоже хочу</span> — если курс уже кто-то ждёт, нажмите на него: ссылки придут всем одновременно, а лимит новых курсов не тратится.</p>
          <ul>
            <li>Лимиты считаются за последние 24 часа, а не с полуночи.</li>
            <li>Тот же курс в течение суток открывается повторно бесплатно.</li>
            <li>Если автор не приложил ссылок — лимит возвращается.</li>
            <li>Токены освобождаются через 24 часа после траты. Ночью свободные токены тратятся на самые популярные курсы — утром они уже ⚡.</li>
            <li>Ссылки ведут на облака (Mail.ru, Яндекс, Google). Если файл удалён автором — выберите другую раздачу этого курса.</li>
            <li>Чтобы ссылки из очереди дошли, не блокируйте бота.</li>
          </ul>
        </div>
      )}
    </div>
  )
}
const yearOf = (t: string) => { const m = t.match(/(20\d\d)(?!.*20\d\d)/); return m ? Number(m[1]) : 0 }

export default function SkladPage({ onUpgrade }: { onUpgrade?: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Hit[]>([])
  const [more, setMore] = useState(false)
  const [sort, setSort] = useState<Sort>('ready')
  const [cat, setCat] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [status, setStatus] = useState<SkladStatus | null>(null)
  const [opening, setOpening] = useState<number | null>(null)
  const [detail, setDetail] = useState<SkladCourse | null>(null)
  const [notice, setNoticeRaw] = useState<Notice>(null)
  const setNotice = (n: Notice | '') => setNoticeRaw(n || null)
  const [help, setHelp] = useState(() => { try { return !localStorage.getItem('sk_help_seen') } catch { return true } })
  const toggleHelp = () => { setHelp(h => !h); try { localStorage.setItem('sk_help_seen', '1') } catch { /* */ } }
  const inputRef = useRef<HTMLInputElement>(null)
  const noteRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (notice) noteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [notice])
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
      setNotice(e.message === 'premium_required' ? '' : { tone: 'warn', title: 'Поиск не ответил', text: 'Источник курсов отвечает медленно или временно недоступен. Повторите через минуту.' })
    } finally { setLoading(false) }
  }, [])

  const onChange = (v: string) => {
    setQuery(v)
    if (v.trim().length >= 3 && help) { setHelp(false); try { localStorage.setItem('sk_help_seen', '1') } catch { /* */ } }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => doSearch(v), 800)
  }

  const open = async (h: SkladHit) => {
    setOpening(h.thread_id); setNotice('')
    try {
      const r = await sklad.course(h.thread_id)
      const prem = r.premium ?? status?.premium
      if (r.status === 'limit') {
        if (r.kind === 'cached') setNotice({ tone: 'warn', title: 'Готовые курсы на сегодня закончились', text: `Бесплатно — ${r.limit} готовых ⚡ курсов за 24 часа. Счётчик обновится через сутки после первого открытия. С Premium — без ограничений.` })
        else if (r.kind === 'join') setNotice({ tone: 'warn', title: 'Слишком много ожиданий', text: `Вы уже ждёте ${r.limit} курса из очереди. Когда они придут в бота, можно будет присоединиться к новым.` })
        else setNotice({ tone: 'warn', title: prem ? 'Новые курсы на сегодня открыты' : 'Новый курс на сегодня уже открыт', text: prem
          ? `Вы открыли ${r.limit} новых курсов за 24 часа. Готовые ⚡ курсы — без ограничений. Счётчик обновится через сутки после открытия, а не в полночь.`
          : `Бесплатно — ${r.limit} новый курс за 24 часа. Готовые ⚡ курсы можно брать дальше. С Premium — 5 новых в день и приоритет в очереди.` })
      } else if (r.status === 'queued') {
        const when = etaText(r.eta), pos = r.position ? `Место в очереди: ${r.position}. ` : ''
        if (r.already) setNotice({ tone: 'info', title: 'Курс уже в вашей очереди', text: `${pos}Ссылки придут в бота ${when}. Повторно нажимать не нужно.` })
        else if (r.joined) setNotice({ tone: 'ok', title: 'Вы присоединились к ожиданию', text: `Этот курс уже ждут — теперь ${people(r.wants || 2)}. Ссылки придут в бота всем одновременно, ${when}. Лимит новых курсов не потрачен.` })
        else if (r.reason === 'fair') setNotice({ tone: 'info', title: 'Курс поставлен в очередь', text: `Новые курсы сейчас открываются в первую очередь для Premium. ${pos}Ссылки придут в бота автоматически, ${when}.` })
        else setNotice({ tone: 'info', title: 'Курс поставлен в очередь', text: `Свободные токены сейчас закончились — это общий запас на всех. ${pos}Ссылки придут в бота автоматически, ${when}. Ничего повторять не нужно.` })
      } else if (r.status === 'nolinks') {
        setNotice({ tone: 'warn', title: 'В этом курсе нет ссылок', text: 'Автор не приложил к курсу ссылок на скачивание. Лимит не потрачен — выберите другую раздачу.' })
      } else {
        setDetail(r)
      }
      loadStatus()
    } catch (e: any) {
      setNotice({ tone: 'warn', title: 'Не удалось открыть курс', text: 'Источник курсов не ответил. Лимит не потрачен — попробуйте ещё раз через минуту.' })
    } finally { setOpening(null) }
  }

  const [removing, setRemoving] = useState<number | null>(null)
  const unqueue = async (q: SkladQueueItem) => {
    if (!window.confirm(`Убрать «${q.title || 'курс'}» из очереди?`)) return
    setRemoving(q.thread_id)
    try {
      const r = await sklad.unqueue(q.thread_id)
      setNotice({ tone: 'ok', title: 'Курс убран из очереди', text: r.refunded ? 'Лимит новых курсов возвращён — можно выбрать другой.' : 'Вы больше не ждёте этот курс.' })
      loadStatus()
    } catch { setNotice({ tone: 'warn', title: 'Не удалось убрать', text: 'Возможно, курс уже открылся — проверьте бота.' }); loadStatus() }
    finally { setRemoving(null) }
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
            {detail.instant ? '⚡ Курс был открыт заранее — лимит новых курсов не потрачен. ' : ''}Ссылка открывается в браузере. Если файлов несколько — качайте по очереди. Повторно открыть этот курс в течение суток можно бесплатно.
          </p>
        </div>
      </div>
    )
  }

  // категории — из найденного, с числом курсов в каждой
  const cats = [...new Set(results.map(h => h.label || '').filter(Boolean))]
    .map(c => ({ id: c, label: `${c} · ${results.filter(h => h.label === c).length}` }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'))
  const shown = results.filter(h => !cat || h.label === cat)
  const sorted = sort === 'ready' ? [...shown].sort((a, b) => Number(!!b.ready) - Number(!!a.ready) || Number(!!(b.wants)) - Number(!!(a.wants)))
    : sort === 'new' ? shown
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

        {status && (() => {
          const nl = status.new_limit ?? status.limit, nu = Math.min(nl, status.new_used ?? status.used_today), nleft = Math.max(0, nl - nu)
          const cl = status.cached_limit ?? 0, cu = status.cached_used ?? 0
          return (
            <div className="sk-quota2 anim-up">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <b className="block text-[14.5px] font-semibold">{nleft > 0 ? `Новых курсов: ${nleft} из ${nl}` : 'Новые курсы на сегодня открыты'}</b>
                  <small className="block text-[12.5px] text-gray mt-0.5">{status.premium ? 'Premium · приоритет в очереди' : 'Бесплатно · за последние 24 часа'}</small>
                </div>
                <div className="flex gap-1.5 shrink-0" aria-hidden="true">
                  {Array.from({ length: nl }).map((_, i) => (
                    <span key={i} className={`sk-q2 ${i < nleft ? (status.premium ? 'p' : 'a') : ''}`} style={{ animationDelay: `${0.2 + i * 0.12}s` }} />
                  ))}
                </div>
              </div>
              <div className="sk-q-row">
                <span>⚡ Готовые курсы</span>
                <b>{cl ? `${Math.max(0, cl - cu)} из ${cl}` : 'без ограничений'}</b>
              </div>
              <div className="sk-q-row"><span>Токены на всех</span>{status.forum_busy ? <b className="text-[#FFB25B]">закончились · новые через очередь</b> : <b>{status.tokens_left ?? '—'} из {status.tokens_total ?? 15}</b>}</div>
              {!status.premium && onUpgrade && (
                <button onClick={onUpgrade} className="btn-gold gold-metal sheen w-full mt-3">
                  <b>5 новых курсов в день и приоритет</b>
                  <small>Оформить Premium</small>
                </button>
              )}
            </div>
          )
        })()}

        <HowItWorks st={status} open={help} onToggle={toggleHelp} />

        {!!status?.queue?.length && (
          <div className="sk-queue anim-up">
            <b className="block text-[13.5px] font-semibold mb-1.5">Ваша очередь</b>
            {status.queue.map((q: SkladQueueItem) => (
              <div key={q.thread_id} className="sk-queue-i">
                <span className="sk-queue-n">{q.position}</span>
                <span className="flex-1 min-w-0">
                  <b className="block text-[13.5px] font-medium leading-snug truncate">{q.title || `Курс #${q.thread_id}`}</b>
                  <small className="block text-[12px] text-gray">{etaText(q.eta)}{q.wants > 1 ? ` · ждут ${people(q.wants)}` : ''}</small>
                </span>
                <button onClick={() => unqueue(q)} disabled={removing === q.thread_id} aria-label="Убрать из очереди" className="sk-queue-x">{removing === q.thread_id ? '…' : '×'}</button>
              </div>
            ))}
            <small className="block text-[11.5px] text-gray mt-1.5">Ссылки придут в бота автоматически, когда освободится токен. Premium — впереди очереди, дальше курсы, которые ждёт больше людей. × — убрать из очереди.</small>
          </div>
        )}

        {notice && (
          <div ref={noteRef} className={`sk-note ${notice.tone}`} role="status">
            <b>{notice.title}</b><span>{notice.text}</span>
            <button onClick={() => setNotice('')} aria-label="Закрыть" className="sk-note-x">×</button>
          </div>
        )}

        {loading && <div className="text-center text-gray text-[13px] py-6">Ищу…</div>}

        {!loading && searched && results.length === 0 && (
          <div className="text-center text-gray text-[13px] py-6">Ничего не нашлось. Измените запрос.</div>
        )}

        {!loading && searched && results.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-1">
            <span className="text-[13px] text-gray tabular-nums mr-1">Найдено: {shown.length}{shown.length !== results.length ? ` из ${results.length}` : ''}{more ? '+' : ''}</span>
            <Dropdown label="Порядок" value={sort} onChange={setSort} options={[
              { id: 'ready', label: 'Сначала ⚡ мгновенные' }, { id: 'new', label: 'Сначала новые' }, { id: 'old', label: 'Сначала старые' },
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
              <span className="shrink-0 flex flex-col items-end gap-1">
                {h.ready ? <span className="sk-tag r">⚡ Мгновенно</span>
                  : h.wants ? <span className="sk-tag w">Тоже хочу · {h.wants}</span>
                  : <span className="sk-tag n">Новый</span>}
                <span className="text-gray text-[12px]">{opening === h.thread_id ? 'открываю…' : ''}</span>
              </span>
            </button>
          ))}
        </div>

        {!searched && !loading && (
          <div className="text-center text-gray text-[13px] py-10 px-4">
            Введите название курса — найдём среди 100&nbsp;000+ и дадим ссылку на скачивание. Курсы с отметкой ⚡ открываются сразу.
          </div>
        )}
      </div>
    </div>
  )
}
