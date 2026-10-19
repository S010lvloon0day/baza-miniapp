import { useMemo, useRef, useState } from 'react'

/**
 * Интерактивная задача для ЛЮБОГО языка: редактор + запуск через Piston (emkc.org).
 * Формат JSON внутри ```runtask:
 *   { "lang":"javascript", "ver":"18.15.0", "starter":"...", "hint":"...",
 *     "stdin":"", "expected":"42", "fname":"main.js" }
 * Проверка — сравнение вывода программы с expected (без хвостовых пробелов/строк).
 */

const PISTON = 'https://emkc.org/api/v2/piston/execute'

const DEFAULT_FNAME: Record<string, string> = {
  javascript: 'main.js', typescript: 'main.ts', python: 'main.py', java: 'Main.java',
  c: 'main.c', 'c++': 'main.cpp', cpp: 'main.cpp', csharp: 'main.cs', 'c#': 'main.cs',
  go: 'main.go', rust: 'main.rs', php: 'main.php', ruby: 'main.rb',
  kotlin: 'Main.kt', swift: 'main.swift', sqlite3: 'main.sql', bash: 'main.sh',
}
const LABEL: Record<string, string> = {
  javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python', java: 'Java',
  c: 'C', 'c++': 'C++', cpp: 'C++', csharp: 'C#', 'c#': 'C#', go: 'Go', rust: 'Rust',
  php: 'PHP', ruby: 'Ruby', kotlin: 'Kotlin', swift: 'Swift', sqlite3: 'SQL', bash: 'Bash',
}

type Task = { lang?: string; ver?: string; starter?: string; hint?: string; stdin?: string; expected?: string; fname?: string }

const norm = (s: string) => (s || '').replace(/\r/g, '').replace(/[ \t]+$/gm, '').replace(/\n+$/,'').trim()

export default function RunTask({ content }: { content: string }) {
  const task = useMemo<Task>(() => { try { return JSON.parse(content) } catch { return {} } }, [content])
  const lang = (task.lang || 'python').toLowerCase()
  const [code, setCode] = useState(task.starter ?? '')
  const [out, setOut] = useState('')
  const [status, setStatus] = useState<'idle' | 'running' | 'ok' | 'fail'>('idle')
  const [showHint, setShowHint] = useState(false)
  const busy = status === 'running'
  const taRef = useRef<HTMLTextAreaElement>(null)

  const exec = async (check: boolean) => {
    setStatus('running'); setOut('')
    const fname = task.fname || DEFAULT_FNAME[lang] || 'main.txt'
    try {
      const r = await fetch(PISTON, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang, version: task.ver || '*', files: [{ name: fname, content: code }], stdin: task.stdin || '' }),
      })
      if (!r.ok) throw new Error('сервер запуска недоступен (' + r.status + ')')
      const j = await r.json()
      const comp = j.compile && (j.compile.code !== 0) ? j.compile : null
      const run = j.run || {}
      if (comp) {
        setOut('Ошибка компиляции:\n' + norm(comp.stderr || comp.output || ''))
        setStatus(check ? 'fail' : 'idle'); return
      }
      const stdout = norm(run.stdout || '')
      const stderr = norm(run.stderr || '')
      if (stderr && (run.code !== 0 || !stdout)) {
        setOut((stdout ? stdout + '\n\n' : '') + stderr)
        setStatus(check ? 'fail' : 'idle'); return
      }
      setOut(stdout || (check ? '' : '(нет вывода)'))
      if (check) {
        const want = norm(task.expected ?? '')
        setStatus(stdout === want ? 'ok' : 'fail')
      } else {
        setStatus('idle')
      }
    } catch (e: any) {
      setOut('⚠ ' + (e?.message || e))
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
        <span className="text-[11px] text-white/40">{LABEL[lang] || lang} · решай прямо здесь</span>
      </div>
      <textarea
        ref={taRef}
        value={code}
        onChange={e => setCode(e.target.value)}
        onKeyDown={onKey}
        spellCheck={false}
        rows={Math.min(18, Math.max(5, code.split('\n').length + 1))}
        className="w-full resize-y bg-transparent px-3 py-2.5 text-[12.5px] leading-[1.6] text-white/90 font-mono outline-none"
      />
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-white/[.08]">
        {task.expected !== undefined && (
          <button onClick={() => exec(true)} disabled={busy}
            className="px-3 py-1.5 rounded-lg bg-green text-black text-[12.5px] font-bold active:opacity-80 disabled:opacity-50">
            {busy ? 'Запуск…' : 'Проверить'}
          </button>
        )}
        <button onClick={() => exec(false)} disabled={busy}
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
      {busy && <div className="px-3 pb-2 text-[11.5px] text-white/50">Выполняю код на сервере…</div>}
      {showHint && task.hint && (
        <div className="mx-3 mb-2 p-2.5 rounded-lg bg-white/[.05] text-[12.5px] text-white/75 leading-[1.6]">💡 {task.hint}</div>
      )}
      {status === 'ok' && (
        <div className="mx-3 mb-2 p-2.5 rounded-lg bg-green/15 border border-green/30 text-[12.5px] text-green font-semibold">✅ Верно — вывод совпал с ожидаемым!</div>
      )}
      {status === 'fail' && (
        <div className="mx-3 mb-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-[12.5px] text-red-300">❌ Пока не то. Сверь вывод с условием.</div>
      )}
      {out && (
        <pre className="mx-3 mb-3 p-2.5 rounded-lg bg-black/40 border border-white/[.08] overflow-x-auto text-[12px] leading-[1.6] text-white/80 font-mono whitespace-pre-wrap">{out}</pre>
      )}
    </div>
  )
}
