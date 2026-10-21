import { useState, useEffect, useRef, useCallback } from 'react'
import Icon from '../components/Icon'
import MediaTypeIcon from '../components/MediaTypeIcon'
import PremiumBadge from '../components/PremiumBadge'
import { api } from '../api/client'
import type { Material } from '../api/client'
import LevelMark from '../components/LevelMark'

interface Props {
  onMaterial: (id: number, sectionId: number) => void
}

const LS_KEY = 'search_history'
const MAX_HISTORY = 8

function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function saveHistory(items: string[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(items)) } catch { /* no-op */ }
}

export default function SearchPage({ onMaterial }: Props) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<Material[]>([])
  const [loading, setLoading]   = useState(false)
  const [searched, setSearched] = useState(false)
  const [history, setHistory]   = useState<string[]>(loadHistory)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const addToHistory = useCallback((q: string) => {
    setHistory(prev => {
      const next = [q, ...prev.filter(s => s !== q)].slice(0, MAX_HISTORY)
      saveHistory(next)
      return next
    })
  }, [])

  const removeFromHistory = useCallback((q: string) => {
    setHistory(prev => {
      const next = prev.filter(s => s !== q)
      saveHistory(next)
      return next
    })
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    saveHistory([])
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearched(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await api.search(q)
        setResults(data.materials)
        setSearched(true)
        if (data.materials.length > 0) addToHistory(q)
      } catch {
        setResults([])
        setSearched(true)
      } finally {
        setLoading(false)
      }
    }, 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, addToHistory])

  const showHistory = query.trim().length < 2 && history.length > 0

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-3.5 pt-1 pb-3 shrink-0">
        <label className="flex items-center gap-2.5 h-[46px] rounded-full px-4 bg-s1 border border-white/[.08] focus-within:border-green/50 transition-colors">
          <Icon name="search" size={19} className="text-gray shrink-0" />
          <input
            ref={inputRef}
            id="search-q"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск по базе"
            enterKeyHint="search"
            className="flex-1 min-w-0 bg-transparent text-[15px] text-fg placeholder:text-gray2 outline-none focus-visible:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Очистить" className="w-7 h-7 -mr-1.5 rounded-full bg-white/10 grid place-items-center text-gray shrink-0 active:bg-white/15">
              <Icon name="close" size={13} />
            </button>
          )}
        </label>
      </div>

      <div className="flex-1 overflow-y-auto pb-navsafe px-3.5">

        {showHistory && (
          <section>
            <div className="flex items-baseline justify-between px-1 pb-2">
              <h3 className="text-[15px] font-bold">Недавние запросы</h3>
              <button onClick={clearHistory} className="text-[13px] text-green active:opacity-70">Очистить</button>
            </div>
            <div className="list-group">
              {history.map(item => (
                <div key={item} className="flex items-center gap-3 pl-3.5 pr-2 py-1 active:bg-white/[.04]">
                  <Icon name="history" size={17} className="text-gray2 shrink-0" />
                  <button className="flex-1 text-left py-2 text-[14.5px] truncate" onClick={() => setQuery(item)}>{item}</button>
                  <button onClick={() => removeFromHistory(item)} aria-label="Убрать" className="w-8 h-8 rounded-full grid place-items-center text-gray2 active:bg-white/10">
                    <Icon name="close" size={13} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {!showHistory && !loading && !searched && (
          <div className="flex flex-col items-center text-center gap-3 pt-16 px-6">
            <span className="w-14 h-14 rounded-[18px] bg-s1 border border-white/[.07] grid place-items-center text-[#CFDAD4]"><Icon name="search" size={26} /></span>
            <div className="font-display font-semibold text-[15px]">Что ищем?</div>
            <div className="text-[13.5px] text-gray leading-relaxed max-w-[260px]">Введите хотя бы 2 символа: название урока, инструмента или темы.</div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center pt-14"><span className="typing-dots text-green"><i /><i /><i /></span></div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="flex flex-col items-center text-center gap-2 pt-16 px-6">
            <div className="font-display font-semibold text-[15px]">Ничего не нашли</div>
            <div className="text-[13.5px] text-gray leading-relaxed max-w-[260px]">По запросу «{query.trim()}» совпадений нет. Попробуйте другое слово.</div>
          </div>
        )}

        {!loading && results.length > 0 && (
          <section>
            <p className="px-1 pb-2 text-[13px] text-gray tabular-nums">Найдено: {results.length}</p>
            <div className="list-group">
              {results.map(m => (
                <button
                  key={m.id}
                  disabled={!!m.locked}
                  onClick={() => onMaterial(m.id, m.section_id)}
                  className="w-full flex items-start gap-3 px-3.5 py-3 text-left active:bg-white/[.04] disabled:opacity-70 transition-colors"
                >
                  <MediaTypeIcon type={m.media_type} size={38} radius={11} iconSize={18} />
                  <span className="flex-1 min-w-0">
                    <b className="block text-[14.5px] font-medium leading-snug"><LevelMark level={(m as { title_level?: string }).title_level} />{m.title}</b>
                    <span className="flex items-center gap-2 mt-1">
                      {m.locked && <PremiumBadge small />}
                      <small className="text-[12.5px] text-gray truncate">{m.section_title}</small>
                    </span>
                    {m.content && !m.locked && (
                      <small className="block text-[12.5px] text-gray2 mt-1 line-clamp-2 leading-relaxed">{m.content}</small>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
