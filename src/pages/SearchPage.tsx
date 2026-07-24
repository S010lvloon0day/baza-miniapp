import { useState, useEffect, useRef, useCallback } from 'react'
import { X } from '@phosphor-icons/react'
import { api } from '../api/client'
import type { Material } from '../api/client'

interface Props {
  onMaterial: (id: number, sectionId: number) => void
}

const MEDIA_ICON: Record<string, string> = {
  photo: '🖼', video: '🎬', document: '📄', text: '📝',
}

const LS_KEY = 'search_history'
const MAX_HISTORY = 8

function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function saveHistory(items: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items))
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
      {/* Grep-style input */}
      <div className="px-4 py-3 border-b border-bd shrink-0">
        <div className="flex items-center bg-s1 border border-[rgba(34,197,94,.3)] px-3 h-10 font-mono text-[12px] gap-0">
          <span className="shrink-0 text-green">$&nbsp;</span>
          <span className="text-gray2 shrink-0">grep&nbsp;-ri&nbsp;&quot;</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="запрос"
            className="flex-1 bg-transparent text-white placeholder-gray2/40 outline-none min-w-0"
            style={{ fontFamily: 'inherit', fontSize: 'inherit' }}
          />
          <span className="text-gray2 shrink-0">&quot;&nbsp;./база/</span>
          {query && (
            <button onClick={() => setQuery('')} className="ml-2 text-gray2 shrink-0 active:opacity-60">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-16">

        {/* Recent searches */}
        {showHistory && (
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-[10px] font-mono tracking-[1.5px] text-gray2">// recent_queries</span>
              <button
                onClick={clearHistory}
                className="text-[10px] font-mono text-gray2/60 active:text-gray2 transition-opacity"
              >
                rm -rf ./
              </button>
            </div>
            {history.map(item => (
              <div key={item} className="flex items-center gap-2 px-4 py-2.5 active:bg-s1 group">
                <span className="text-greenLight font-mono text-[11px] shrink-0">▶</span>
                <button
                  className="flex-1 text-left font-mono text-[12px] text-white/70"
                  onClick={() => setQuery(item)}
                >
                  {item}
                </button>
                <button
                  onClick={() => removeFromHistory(item)}
                  className="text-gray2 p-1 active:opacity-60"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!showHistory && !loading && !searched && (
          <div className="flex flex-col items-start justify-center pt-10 px-4 gap-2 font-mono text-[11px]">
            <div className="text-gray2">$ grep: waiting for pattern...</div>
            <div className="text-gray2/50">// введите минимум 2 символа</div>
            <div className="text-gray2/50">// для поиска по базе знаний</div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-start pt-10 px-4 gap-1.5 font-mono text-[11px]">
            <div className="text-gray2">$ grep -ri &quot;{query.trim()}&quot; ./база/ <span className="blink">█</span></div>
            <div className="text-gray2/50">// searching...</div>
          </div>
        )}

        {/* No results */}
        {!loading && searched && results.length === 0 && (
          <div className="flex flex-col items-start pt-10 px-4 gap-1.5 font-mono text-[11px]">
            <div className="text-gray2">$ grep -ri &quot;{query.trim()}&quot; ./база/</div>
            <div className="text-white/30">// grep: no matches found</div>
            <div className="text-white/20">// pattern: &quot;{query.trim()}&quot;</div>
            <div className="text-white/20">// 0 results</div>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <>
            <div className="px-4 pt-3 pb-1 font-mono text-[10px] text-gray2">
              // {results.length} совпадений в ./база/
            </div>
            <div className="flex flex-col divide-y divide-bd">
              {results.map(m => (
                <button
                  key={m.id}
                  disabled={!!m.locked}
                  onClick={() => onMaterial(m.id, m.section_id)}
                  className="flex items-start gap-3 px-4 py-3.5 text-left active:bg-s1 disabled:opacity-60 transition-colors"
                >
                  <span className="text-[18px] shrink-0 mt-0.5">{MEDIA_ICON[m.media_type] ?? '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {m.locked && <span className="text-[10px] text-violet shrink-0">💎</span>}
                      <span className="text-[13px] font-semibold text-white leading-snug">{m.title}</span>
                    </div>
                    <div className="text-[11px] text-gray2 mt-0.5">
                      {m.section_emoji} {m.section_title}
                    </div>
                    {m.content && !m.locked && (
                      <div className="text-[11px] text-gray mt-1 line-clamp-2 leading-relaxed">{m.content}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
