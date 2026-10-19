import { useMemo, useRef, useState } from 'react'
import { Query, Aggregator } from 'mingo'

/**
 * Интерактивная задача по MongoDB: редактор запроса + выполнение прямо в браузере
 * через mingo (реализация языка запросов MongoDB на JS). Формат JSON внутри ```mongotask:
 *   { "collection":"users", "data":[...], "op":"find"|"aggregate",
 *     "projection":{...}|null, "sort":{...}|null, "limit":N|null,
 *     "starter":"{ }", "hint":"...", "expected":[...] }
 * Для find редактируется фильтр; projection/sort/limit фиксированы автором.
 * Для aggregate редактируется конвейер [ ... ]. Проверка — сравнение результата с expected.
 */

type MTask = {
  collection?: string
  data?: any[]
  op?: 'find' | 'aggregate'
  projection?: Record<string, number> | null
  sort?: Record<string, number> | null
  limit?: number | null
  starter?: string
  hint?: string
  expected?: any
}

// Стабильная сериализация: сортируем ключи рекурсивно — чтобы порядок ключей не влиял на сравнение.
function stable(v: any): any {
  if (Array.isArray(v)) return v.map(stable)
  if (v && typeof v === 'object') {
    const o: Record<string, any> = {}
    for (const k of Object.keys(v).sort()) o[k] = stable(v[k])
    return o
  }
  return v
}
const canon = (v: any) => JSON.stringify(stable(v))

export default function MongoTask({ content }: { content: string }) {
  const task = useMemo<MTask>(() => { try { return JSON.parse(content) } catch { return {} } }, [content])
  const op = task.op || 'find'
  const data = task.data || []
  const coll = task.collection || 'items'
  const [code, setCode] = useState(task.starter ?? '')
  const [out, setOut] = useState('')
  const [status, setStatus] = useState<'idle' | 'ok' | 'fail'>('idle')
  const [showHint, setShowHint] = useState(false)
  const [showData, setShowData] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const runQuery = (): any[] => {
    const answer = JSON.parse(code)
    if (op === 'aggregate') {
      if (!Array.isArray(answer)) throw new Error('Конвейер агрегации должен быть массивом [ ... ]')
      return new Aggregator(answer).run(data) as any[]
    }
    let cur = new Query(answer).find(data, task.projection || undefined)
    if (task.sort) cur = cur.sort(task.sort)
    if (task.limit) cur = cur.limit(task.limit)
    return cur.all()
  }

  const exec = (check: boolean) => {
    try {
      const result = runQuery()
      setOut(JSON.stringify(result, null, 2))
      if (check) setStatus(canon(result) === canon(task.expected) ? 'ok' : 'fail')
      else setStatus('idle')
    } catch (e: any) {
      const msg = String(e?.message || e)
      setOut('⚠ ' + (msg.includes('JSON') ? 'Неверный JSON в запросе. Проверь скобки и кавычки.' : msg))
      if (check) setStatus('fail'); else setStatus('idle')
    }
  }

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = taRef.current; if (!ta) return
      const s = ta.selectionStart, en = ta.selectionEnd
      const v = code.slice(0, s) + '  ' + code.slice(en)
      setCode(v)
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2 })
    }
  }

  const callSig = op === 'aggregate'
    ? `db.${coll}.aggregate( ... )`
    : `db.${coll}.find( ФИЛЬТР${task.projection ? ', проекция' : ''} )${task.sort ? '.sort(...)' : ''}${task.limit ? '.limit(' + task.limit + ')' : ''}`

  return (
    <div className="my-3 rounded-2xl border border-green/25 overflow-hidden" style={{ background: '#0d0f13' }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[.08]">
        <span className="text-[12px] font-bold text-green">🍃 Задача MongoDB</span>
        <span className="text-[11px] text-white/40">{op === 'aggregate' ? 'агрегация' : 'выборка'} · решай прямо здесь</span>
      </div>

      <div className="px-3 pt-2">
        <button onClick={() => setShowData(s => !s)}
          className="text-[11.5px] text-white/55 active:text-white/80">
          {showData ? '▾ Коллекция ' : '▸ Коллекция '}<span className="font-mono text-green/80">{coll}</span> ({data.length} док.)
        </button>
        {showData && (
          <pre className="mt-1.5 p-2.5 rounded-lg bg-black/40 border border-white/[.08] overflow-x-auto text-[11.5px] leading-[1.5] text-white/70 font-mono">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>

      <div className="px-3 pt-2 text-[11.5px] text-white/50 font-mono">{callSig}</div>

      <textarea
        ref={taRef}
        value={code}
        onChange={e => setCode(e.target.value)}
        onKeyDown={onKey}
        spellCheck={false}
        rows={Math.min(16, Math.max(3, code.split('\n').length + 1))}
        className="w-full resize-y bg-transparent px-3 py-2.5 text-[12.5px] leading-[1.6] text-white/90 font-mono outline-none"
      />
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-white/[.08]">
        {task.expected !== undefined && (
          <button onClick={() => exec(true)}
            className="px-3 py-1.5 rounded-lg bg-green text-black text-[12.5px] font-bold active:opacity-80">
            Проверить
          </button>
        )}
        <button onClick={() => exec(false)}
          className="px-3 py-1.5 rounded-lg bg-white/[.08] text-white text-[12.5px] font-semibold active:bg-white/[.16]">
          Выполнить
        </button>
        <button onClick={() => { setCode(task.starter ?? ''); setOut(''); setStatus('idle') }}
          className="px-3 py-1.5 rounded-lg bg-white/[.06] text-white/70 text-[12.5px] active:bg-white/[.14]">
          Сброс
        </button>
        {task.hint && (
          <button onClick={() => setShowHint(h => !h)}
            className="ml-auto px-3 py-1.5 rounded-lg bg-white/[.06] text-white/70 text-[12.5px] active:bg-white/[.14]">
            {showHint ? 'Скрыть подсказку' : 'Подсказка'}
          </button>
        )}
      </div>
      {showHint && task.hint && (
        <div className="mx-3 mb-2 p-2.5 rounded-lg bg-white/[.05] text-[12.5px] text-white/75 leading-[1.6]">💡 {task.hint}</div>
      )}
      {status === 'ok' && (
        <div className="mx-3 mb-2 p-2.5 rounded-lg bg-green/15 border border-green/30 text-[12.5px] text-green font-semibold">✅ Верно — результат совпал с ожидаемым!</div>
      )}
      {status === 'fail' && (
        <div className="mx-3 mb-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-[12.5px] text-red-300">❌ Пока не то. Сверь результат с условием.</div>
      )}
      {out && (
        <pre className="mx-3 mb-3 p-2.5 rounded-lg bg-black/40 border border-white/[.08] overflow-x-auto text-[12px] leading-[1.6] text-white/80 font-mono whitespace-pre-wrap">{out}</pre>
      )}
    </div>
  )
}
