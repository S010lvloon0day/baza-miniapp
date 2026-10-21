import Icon from './Icon'
import { useEffect, useMemo, useRef, useState } from 'react'
import { API_BASE } from '../api/client'

/**
 * Интерактивная задача для ЛЮБОГО языка: редактор + запуск через Wandbox (wandbox.org).
 * Формат JSON внутри ```runtask:
 *   { "lang":"cpp", "starter":"...", "hint":"...", "stdin":"", "expected":"42" }
 * Проверка — сравнение вывода программы с expected (без хвостовых пробелов/строк).
 * Wandbox CORS: Access-Control-Allow-Origin: * — работает прямо из браузера.
 */


// язык курса -> компилятор Wandbox (+ человекочитаемая метка)
const COMPILER: Record<string, string> = {
  javascript: 'nodejs-20.17.0', typescript: 'typescript-5.6.2', python: 'cpython-head',
  java: 'openjdk-jdk-22+36', c: 'gcc-head-c', cpp: 'gcc-head', 'c++': 'gcc-head',
  csharp: 'mono-6.12.0.199', 'c#': 'mono-6.12.0.199', go: 'go-1.23.2', rust: 'rust-1.82.0',
  php: 'php-8.3.12', ruby: 'ruby-4.0.2', swift: 'swift', kotlin: 'kotlin', sql: 'sqlite-3.46.1',
  sqlite3: 'sqlite-3.46.1', bash: 'bash',
}
const LABEL: Record<string, string> = {
  javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python', java: 'Java',
  c: 'C', cpp: 'C++', 'c++': 'C++', csharp: 'C#', 'c#': 'C#', go: 'Go', rust: 'Rust',
  php: 'PHP', ruby: 'Ruby', swift: 'Swift', kotlin: 'Kotlin', sql: 'SQL', sqlite3: 'SQL', bash: 'Bash',
}

type Task = { lang?: string; compiler?: string; starter?: string; hint?: string; stdin?: string; expected?: string }

const norm = (s: string) => (s || '').replace(/\r/g, '').split('\n').map(l => l.replace(/[ \t]+$/,'')).join('\n').replace(/\n+$/,'').trim()

export default function RunTask({ content, onSolve }: { content: string; onSolve?: () => void }) {
  const task = useMemo<Task>(() => { try { return JSON.parse(content) } catch { return {} } }, [content])
  const lang = (task.lang || 'python').toLowerCase()
  const compiler = task.compiler || COMPILER[lang] || 'cpython-head'
  const [code, setCode] = useState(task.starter ?? '')
  const [out, setOut] = useState('')
  const [status, setStatus] = useState<'idle' | 'running' | 'ok' | 'fail'>('idle')
  const [showHint, setShowHint] = useState(false)
  const busy = status === 'running'
  useEffect(() => { if (status === 'ok') onSolve?.() }, [status])
  const taRef = useRef<HTMLTextAreaElement>(null)

  const exec = async (check: boolean) => {
    setStatus('running'); setOut('')
    try {
      const r = await fetch(API_BASE + '/api/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, compiler, stdin: task.stdin || '' }),
      })
      if (!r.ok) throw new Error('сервер запуска недоступен (' + r.status + ')')
      const j = await r.json()
      const prog = norm(j.program_output || '')
      const cerr = norm(j.compiler_error || '')
      const perr = norm(j.program_error || '')
      const okRun = String(j.status) === '0'
      if (!okRun && !prog) {
        setOut((cerr ? 'Ошибка компиляции:\n' + cerr : '') + (perr ? (cerr ? '\n\n' : '') + perr : '') || 'Ошибка выполнения')
        setStatus(check ? 'fail' : 'idle'); return
      }
      setOut(prog || (check ? '' : '(нет вывода)'))
      if (check) setStatus(prog === norm(task.expected ?? '') ? 'ok' : 'fail')
      else setStatus('idle')
    } catch (e: any) {
      setOut( (e?.message || e))
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
    <div className="my-4 rounded-[18px] border border-white/[.08] overflow-hidden bg-[#060B09]">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-white/[.07] bg-s1">
        <span className="w-7 h-7 rounded-[9px] bg-green/15 text-green grid place-items-center"><Icon name="code" size={15} /></span><span className="font-display font-semibold text-[13.5px] text-fg">Задача</span>
        <span className="text-[12px] text-gray2">{LABEL[lang] || lang} · решай прямо здесь</span>
      </div>
      <textarea
        ref={taRef}
        value={code}
        onChange={e => setCode(e.target.value)}
        onKeyDown={onKey}
        spellCheck={false}
        rows={Math.min(18, Math.max(5, code.split('\n').length + 1))}
        className="w-full resize-y bg-transparent px-3 py-2.5 text-[12.5px] leading-[1.65] text-fg/90 font-mono outline-none"
      />
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-t border-white/[.07] bg-s1/60">
        {task.expected !== undefined && (
          <button onClick={() => exec(true)} disabled={busy}
            className="h-9 px-3.5 rounded-[11px] bg-green text-ink text-[13px] font-semibold active:opacity-85 disabled:opacity-50">
            {busy ? 'Запуск…' : 'Проверить'}
          </button>
        )}
        <button onClick={() => exec(false)} disabled={busy}
          className="h-9 px-3.5 rounded-[11px] bg-white/[.08] text-fg text-[13px] font-medium active:bg-white/[.14] disabled:opacity-50">
          Запустить
        </button>
        <button onClick={() => { setCode(task.starter ?? ''); setOut(''); setStatus('idle') }} disabled={busy}
          className="h-9 px-3 rounded-[11px] text-gray text-[13px] active:bg-white/[.08] disabled:opacity-50">
          Сброс
        </button>
        {task.hint && (
          <button onClick={() => setShowHint(h => !h)}
            className="ml-auto h-9 px-3 rounded-[11px] text-violet text-[13px] font-medium active:bg-white/[.08]">
            {showHint ? 'Скрыть подсказку' : 'Подсказка'}
          </button>
        )}
      </div>
      {busy && <div className="px-3 pb-2 text-[12.5px] text-gray">Выполняю код на сервере…</div>}
      {showHint && task.hint && (
        <div className="mx-3 mb-2.5 p-3 rounded-[12px] bg-purple/[.10] border border-purple/25 text-[13px] text-fg/85 leading-[1.55] flex gap-2"><Icon name="question" size={16} className="text-violet shrink-0 mt-0.5" accent="#B9A8FF" /><span>{task.hint}</span></div>
      )}
      {status === 'ok' && (
        <div className="mx-3 mb-2.5 p-3 rounded-[12px] bg-green/[.10] border border-green/30 text-[13px] text-green font-semibold flex items-center gap-2"><Icon name="checkCircle" size={17} accent="current" />Верно — вывод совпал с ожидаемым!</div>
      )}
      {status === 'fail' && (
        <div className="mx-3 mb-2.5 p-3 rounded-[12px] bg-[#FF6B6B]/[.10] border border-[#FF6B6B]/30 text-[13px] text-[#FF9A9A] flex items-center gap-2"><Icon name="warnCircle" size={17} accent="current" />Пока не то. Сверь вывод с условием.</div>
      )}
      {out && (
        <pre className="mx-3 mb-3 p-3 rounded-[12px] bg-black/40 border border-white/[.06] overflow-x-auto text-[12px] leading-[1.6] text-fg/80 font-mono whitespace-pre-wrap">{out}</pre>
      )}
    </div>
  )
}
