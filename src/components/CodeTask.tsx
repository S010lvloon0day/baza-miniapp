import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Интерактивная задача: редактор кода + запуск Python прямо в браузере (Pyodide).
 * Формат контента (JSON внутри ```pytask):
 *   { "starter": "...", "tests": "assert f(2)==4", "hint": "..." }
 * tests — необязательны (если нет, доступен только «Запустить»).
 */

const PYODIDE_VER = '0.26.4'
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VER}/full/`

function loadPy(): Promise<any> {
  const w = window as any
  if (w.__pyPromise) return w.__pyPromise
  w.__pyPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = PYODIDE_BASE + 'pyodide.js'
    s.onload = async () => {
      try { resolve(await w.loadPyodide({ indexURL: PYODIDE_BASE })) }
      catch (e) { reject(e) }
    }
    s.onerror = () => reject(new Error('Не удалось загрузить Python'))
    document.head.appendChild(s)
  })
  return w.__pyPromise
}

type Task = { starter?: string; tests?: string; hint?: string }

export default function CodeTask({ content, onSolve }: { content: string; onSolve?: () => void }) {
  const task = useMemo<Task>(() => { try { return JSON.parse(content) } catch { return {} } }, [content])
  const [code, setCode] = useState(task.starter ?? '')
  const [out, setOut] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'running' | 'ok' | 'fail'>('idle')
  const [showHint, setShowHint] = useState(false)
  const busy = status === 'loading' || status === 'running'
  useEffect(() => { if (status === 'ok') onSolve?.() }, [status])
  const taRef = useRef<HTMLTextAreaElement>(null)

  const run = async (check: boolean) => {
    setStatus('loading'); setOut('')
    let py: any
    try { py = await loadPy() } catch (e: any) { setStatus('fail'); setOut('⚠ ' + (e?.message || e)); return }
    setStatus('running')
    let buf = ''
    const sink = { batched: (s: string) => { buf += s } }
    try { py.setStdout(sink); py.setStderr(sink) } catch { /* старые версии */ }
    try {
      await py.runPythonAsync(code)
      if (check && task.tests) {
        await py.runPythonAsync(task.tests)
      }
      setOut(buf.trim() || (check ? '' : '(нет вывода)'))
      setStatus(check && task.tests ? 'ok' : 'idle')
    } catch (e: any) {
      const msg = String(e?.message || e)
      // Берём последнюю содержательную строку трейсбека
      const lines = msg.split('\n').filter(Boolean)
      const tail = lines.slice(-3).join('\n')
      setOut((buf ? buf.trim() + '\n\n' : '') + tail)
      setStatus(check ? 'fail' : 'idle')
    }
  }

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = taRef.current; if (!ta) return
      const s = ta.selectionStart, en = ta.selectionEnd
      const v = code.slice(0, s) + '    ' + code.slice(en)
      setCode(v)
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 4 })
    }
  }

  return (
    <div className="my-3 rounded-2xl border border-green/25 overflow-hidden" style={{ background: '#0d0f13' }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[.08]">
        <span className="text-[12px] font-bold text-green">⌨ Задача</span>
        <span className="text-[11px] text-white/40">решай прямо здесь</span>
      </div>
      <textarea
        ref={taRef}
        value={code}
        onChange={e => setCode(e.target.value)}
        onKeyDown={onKey}
        spellCheck={false}
        rows={Math.min(16, Math.max(5, code.split('\n').length + 1))}
        className="w-full resize-y bg-transparent px-3 py-2.5 text-[12.5px] leading-[1.6] text-white/90 font-mono outline-none"
      />
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-white/[.08]">
        {task.tests && (
          <button onClick={() => run(true)} disabled={busy}
            className="px-3 py-1.5 rounded-lg bg-green text-black text-[12.5px] font-bold active:opacity-80 disabled:opacity-50">
            {busy ? 'Запуск…' : 'Проверить'}
          </button>
        )}
        <button onClick={() => run(false)} disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-white/[.08] text-white text-[12.5px] font-semibold active:bg-white/[.16] disabled:opacity-50">
          Запустить
        </button>
        <button onClick={() => { setCode(task.starter ?? ''); setOut(''); setStatus('idle') }} disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-white/[.06] text-white/70 text-[12.5px] active:bg-white/[.14] disabled:opacity-50">
          Сброс
        </button>
        {task.hint && (
          <button onClick={() => setShowHint(h => !h)}
            className="ml-auto px-3 py-1.5 rounded-lg bg-white/[.06] text-white/70 text-[12.5px] active:bg-white/[.14]">
            {showHint ? 'Скрыть подсказку' : 'Подсказка'}
          </button>
        )}
      </div>
      {status === 'loading' && <div className="px-3 pb-2 text-[11.5px] text-white/50">Загружаю Python (первый раз — несколько секунд)…</div>}
      {showHint && task.hint && (
        <div className="mx-3 mb-2 p-2.5 rounded-lg bg-white/[.05] text-[12.5px] text-white/75 leading-[1.6]">💡 {task.hint}</div>
      )}
      {status === 'ok' && (
        <div className="mx-3 mb-2 p-2.5 rounded-lg bg-green/15 border border-green/30 text-[12.5px] text-green font-semibold">✅ Все тесты пройдены — отлично!</div>
      )}
      {status === 'fail' && (
        <div className="mx-3 mb-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-[12.5px] text-red-300">❌ Не проходит. Проверь логику.</div>
      )}
      {out && (
        <pre className="mx-3 mb-3 p-2.5 rounded-lg bg-black/40 border border-white/[.08] overflow-x-auto text-[12px] leading-[1.6] text-white/80 font-mono whitespace-pre-wrap">{out}</pre>
      )}
    </div>
  )
}
