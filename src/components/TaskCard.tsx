import Icon from './Icon'
import { useMemo, useState } from 'react'
import MarkdownLite from './MarkdownLite'

/** Практическое задание (media_type = 'task'), content — JSON:
 *  fill:   { kind, intro, text (с [blank]), blanks[], accept[][] }
 *  match:  { kind, intro, pairs[{term, definition}] }
 *  order:  { kind, intro, items[], correct[] (индексы items в правильном порядке) }
 *  reveal: { kind, intro, sub: 'short'|'code'|'hotspot'|'reveal', template?, answer, keys?[], answer_is_code? } */
export interface TaskData {
  kind: 'fill' | 'match' | 'order' | 'reveal'
  intro?: string
  text?: string
  blanks?: string[]
  accept?: string[][]
  pairs?: { term: string; definition: string }[]
  items?: string[]
  correct?: number[]
  sub?: string
  template?: string
  answer?: string
  answer_md?: string
  keys?: string[]
  answer_is_code?: boolean
}

export function parseTask(content?: string | null): TaskData | null {
  if (!content) return null
  try {
    const t = JSON.parse(content)
    if (t && ['fill', 'match', 'order', 'reveal'].includes(t.kind)) return t as TaskData
  } catch { /* не JSON */ }
  return null
}

const tg = (window as any).Telegram?.WebApp
const haptic = (ok: boolean) => { try { tg?.HapticFeedback?.notificationOccurred(ok ? 'success' : 'error') } catch { /* */ } }

// Сравнение ответа: регистр, «ё», кавычки, знаки в конце; слова совпадают по основе (падежи не мешают).
function norm(s: string) {
  return String(s).toLowerCase().replace(/ё/g, 'е').replace(/[«»“”"']/g, '').replace(/\s+/g, ' ').replace(/[.:;,!?]+$/, '').trim()
}
function stemEq(a: string, b: string) {
  a = norm(a); b = norm(b)
  if (a === b) return true
  if (!a || !b) return false
  const wa = a.split(' '), wb = b.split(' ')
  if (wa.length !== wb.length) return false
  return wa.every((x, i) => {
    const y = wb[i]
    if (x === y) return true
    const n = Math.max(4, Math.min(x.length, y.length) - 2)
    return x.length >= 4 && y.length >= 4 && x.slice(0, n) === y.slice(0, n)
  })
}

function shuffled<T>(a: T[], seed: number) {
  const r = a.map((v, i) => ({ v, k: Math.sin(seed * 9301 + i * 49297) }))
  return r.sort((x, y) => x.k - y.k).map(x => x.v)
}

const box = 'p-4 rounded-[18px] border'
const btn = 'h-11 px-5 rounded-[14px] text-[14px] font-semibold active:opacity-80'
const Intro = ({ t }: { t?: string }) => t
  ? <div className="text-[15px] leading-[1.7] text-fg/85 whitespace-pre-wrap break-words">{t}</div> : null

function Result({ ok, total, good }: { ok: boolean; total: number; good: number }) {
  return (
    <div className={`${box} ${ok ? 'border-green/35 bg-green/[.07]' : 'border-[#FF6B6B]/30 bg-[#FF6B6B]/[.07]'}`}>
      <div className={`flex items-center gap-2 text-[14px] font-semibold ${ok ? 'text-green' : 'text-[#FF9A9A]'}`}>
        <Icon name={ok ? 'checkCircle' : 'warnCircle'} size={18} accent="current" className="shrink-0" />
        {ok ? 'Всё верно' : `Верно ${good} из ${total}. Исправьте отмеченное и проверьте ещё раз.`}
      </div>
    </div>
  )
}

const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'

function Fill({ d, seed }: { d: TaskData; seed: number }) {
  // «[blank]» внутри кавычек «…» — кавычки убираем, пропуск и так выделен рамкой
  const parts = (d.text || '').replace(/«\s*\[blank\]\s*»/g, '[blank]').split('[blank]')
  const n = parts.length - 1
  const answers = d.blanks || []
  const bank = useMemo(() => shuffled(answers.map((a, i) => ({ a, i })), seed), [answers, seed])
  const [vals, setVals] = useState<string[]>(Array(n).fill(''))
  const [active, setActive] = useState(0)
  const [checked, setChecked] = useState<boolean[] | null>(null)
  const [shown, setShown] = useState(false)
  const okAt = (i: number, v: string) => [answers[i] ?? '', ...(d.accept?.[i] ?? [])].some(a => a && stemEq(v, a))
  const setAt = (i: number, v: string) => { const x = vals.slice(); x[i] = v; setVals(x); setChecked(null) }
  const usedCnt: Record<string, number> = {}
  vals.forEach(v => { const k = norm(v); if (k) usedCnt[k] = (usedCnt[k] || 0) + 1 })
  const seenCnt: Record<string, number> = {}
  const pick = (word: string) => {
    let i = vals[active] === '' ? active : vals.findIndex(v => v === '')
    if (i < 0) i = active
    setAt(i, word)
    const next = vals.findIndex((v, k) => k !== i && v === '')
    if (next >= 0) setActive(next)
  }
  const check = () => { const c = vals.map((v, i) => okAt(i, v)); setChecked(c); haptic(c.every(Boolean)) }
  return (
    <>
      <div className="text-[13px] text-gray">Нажмите на пропуск, затем выберите слово ниже — или впишите ответ сами.</div>
      <div className="card p-4 text-[15px] leading-[2.3] text-fg/85 break-words">
        {parts.map((p, i) => (
          <span key={i}>
            <span className="whitespace-pre-wrap">{p}</span>
            {i < n && (
              <span className="inline-flex flex-col align-middle mx-1">
                <span className="inline-flex items-center gap-1">
                  <span className="text-green text-[14px] font-bold">{CIRCLED[i] ?? `(${i + 1})`}</span>
                  <input value={shown ? (answers[i] ?? '') : vals[i]} readOnly={shown}
                    onFocus={() => setActive(i)}
                    onChange={e => setAt(i, e.target.value)}
                    placeholder="______"
                    className={`px-2.5 py-0.5 w-[11em] max-w-[70vw] rounded-[9px] bg-white/[.07] border-[1.5px] text-[14px] text-fg outline-none placeholder:text-gray2
                      ${checked ? (checked[i] ? 'border-green bg-green/[.08]' : 'border-[#FF6B6B] bg-[#FF6B6B]/[.08]')
                        : shown ? 'border-green/60' : active === i ? 'border-green/80' : 'border-white/15'}`} />
                </span>
                {checked && !checked[i] && !shown && (
                  <span className="text-[12px] leading-[1.4] text-green pl-5">Ответ: {answers[i]}</span>
                )}
              </span>
            )}
          </span>
        ))}
      </div>
      {!shown && bank.length > 0 && (
        <div>
          <div className="font-display font-semibold text-[13px] mb-2">Варианты</div>
          <div className="flex flex-wrap gap-2">
            {bank.map(({ a, i }) => {
              const k = norm(a)
              seenCnt[k] = (seenCnt[k] || 0) + 1
              const isUsed = seenCnt[k] <= (usedCnt[k] || 0)
              return (
                <button key={i} onClick={() => pick(a)} disabled={isUsed}
                  className={`h-9 px-3.5 rounded-[11px] text-[14px] transition-colors ${isUsed ? 'bg-white/[.03] text-gray2/60' : 'bg-s2 border border-white/[.08] text-fg active:bg-green/15'}`}>
                  {a}
                </button>
              )
            })}
            {vals.some(v => v) && (
              <button onClick={() => { setVals(Array(n).fill('')); setChecked(null); setActive(0) }}
                className="h-9 px-3 rounded-[11px] inline-flex items-center gap-1.5 text-[13px] text-gray active:opacity-70"><Icon name="undo" size={15} /> Очистить</button>
            )}
          </div>
        </div>
      )}
      {checked && !shown && <Result ok={checked.every(Boolean)} total={n} good={checked.filter(Boolean).length} />}
      <Buttons onCheck={shown ? undefined : check} shown={shown} onShow={() => setShown(!shown)} />
    </>
  )
}

function Match({ d, seed }: { d: TaskData; seed: number }) {
  const pairs = d.pairs || []
  const defs = useMemo(() => shuffled(pairs.map(p => p.definition), seed), [pairs, seed])
  const [sel, setSel] = useState<string[]>(Array(pairs.length).fill(''))
  const [checked, setChecked] = useState<boolean[] | null>(null)
  const [shown, setShown] = useState(false)
  const check = () => { const c = pairs.map((p, i) => sel[i] === p.definition); setChecked(c); haptic(c.every(Boolean)) }
  return (
    <>
      <div className="flex flex-col gap-2.5">
        {pairs.map((p, i) => {
          const val = shown ? p.definition : sel[i]
          const st = checked ? (checked[i] ? 'border-green/60 bg-green/[.06]' : 'border-[#FF6B6B]/50 bg-[#FF6B6B]/[.06]') : shown ? 'border-green/50' : 'border-white/[.07] bg-s1'
          return (
            <div key={i} className={`p-3.5 rounded-[16px] border ${st}`}>
              <div className="text-[14.5px] font-semibold text-fg mb-2.5 break-words">{i + 1}. {p.term}</div>
              <select value={val} disabled={shown}
                onChange={e => { const s = sel.slice(); s[i] = e.target.value; setSel(s); setChecked(null) }}
                className="w-full h-10 px-3 rounded-[11px] bg-s2 border border-white/[.10] text-[14px] text-fg outline-none focus:border-green/60">
                <option value="">Выберите определение</option>
                {defs.map((x, k) => <option key={k} value={x}>{x}</option>)}
              </select>
            </div>
          )
        })}
      </div>
      {checked && !shown && <Result ok={checked.every(Boolean)} total={pairs.length} good={checked.filter(Boolean).length} />}
      <Buttons onCheck={shown ? undefined : check} shown={shown} onShow={() => setShown(!shown)} />
    </>
  )
}

function Order({ d }: { d: TaskData }) {
  const items = d.items || []
  const [ord, setOrd] = useState<number[]>(() => items.map((_, i) => i))
  const [checked, setChecked] = useState<boolean[] | null>(null)
  const [shown, setShown] = useState(false)
  const right = d.correct || items.map((_, i) => i)
  const cur = shown ? right : ord
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= ord.length) return
    const o = ord.slice(); [o[i], o[j]] = [o[j], o[i]]; setOrd(o); setChecked(null)
  }
  const check = () => { const c = ord.map((x, i) => x === right[i]); setChecked(c); haptic(c.every(Boolean)) }
  return (
    <>
      <div className="flex flex-col gap-2">
        {cur.map((x, i) => (
          <div key={x} className={`flex items-center gap-3 py-2 pl-2.5 pr-1.5 rounded-[16px] border
            ${checked ? (checked[i] ? 'border-green/60 bg-green/[.06]' : 'border-[#FF6B6B]/50 bg-[#FF6B6B]/[.06]') : shown ? 'border-green/50' : 'border-white/[.07] bg-s1'}`}>
            <span className="shrink-0 w-7 h-7 rounded-[9px] grid place-items-center bg-white/[.07] text-[13px] font-bold text-fg tabular-nums">{i + 1}</span>
            <span className="flex-1 text-[14.5px] leading-[1.45] text-fg/90 break-words">{items[x]}</span>
            {!shown && (
              <span className="shrink-0 flex flex-col">
                <button onClick={() => move(i, -1)} aria-label="Выше" className="w-9 h-7 grid place-items-center text-gray active:text-green"><Icon name="chevD" size={16} className="rotate-180" /></button>
                <button onClick={() => move(i, 1)} aria-label="Ниже" className="w-9 h-7 grid place-items-center text-gray active:text-green"><Icon name="chevD" size={16} /></button>
              </span>
            )}
          </div>
        ))}
      </div>
      {checked && !shown && <Result ok={checked.every(Boolean)} total={items.length} good={checked.filter(Boolean).length} />}
      <Buttons onCheck={shown ? undefined : check} shown={shown} onShow={() => setShown(!shown)} />
    </>
  )
}

function Reveal({ d }: { d: TaskData }) {
  const [shown, setShown] = useState(false)
  const [mine, setMine] = useState('')
  return (
    <>
      {d.template && <pre className="p-3.5 rounded-[14px] bg-[#060B09] border border-white/[.07] text-[12.5px] leading-[1.6] text-fg/85 font-mono overflow-x-auto">{d.template}</pre>}
      {(d.sub === 'short' || d.sub === 'reveal' || d.sub === 'hotspot') && (
        <textarea value={mine} onChange={e => setMine(e.target.value)} rows={4}
          placeholder="Ваш ответ — для себя, никуда не отправляется"
          className="w-full p-3.5 rounded-[16px] bg-white/[.04] border border-white/[.08] text-[14.5px] text-fg outline-none placeholder:text-gray2 focus:border-green/60" />
      )}
      {shown && (
        <div className={`${box} border-green/30 bg-green/[.06]`}>
          <div className="font-display font-semibold text-[13.5px] text-green mb-2">
            {d.sub === 'short' ? 'Пример ответа' : 'Ответ'}
          </div>
          {d.answer_md
            ? <div className="-mx-4"><MarkdownLite content={d.answer_md} /></div>
            : d.answer_is_code
              ? <pre className="text-[12.5px] leading-[1.6] text-fg/85 font-mono overflow-x-auto">{d.answer}</pre>
              : <div className="text-[14.5px] leading-[1.65] text-fg/85 whitespace-pre-wrap break-words">{d.answer}</div>}
          {d.keys && d.keys.length > 0 && (
            <div className="mt-3">
              <div className="text-[13px] font-semibold text-fg mb-1.5">Что должно быть в ответе</div>
              {d.keys.map((k, i) => <div key={i} className="flex gap-2 text-[14px] text-fg/85"><Icon name="check" size={16} className="text-green shrink-0 mt-0.5" />{k}</div>)}
            </div>
          )}
        </div>
      )}
      <Buttons shown={shown} onShow={() => setShown(!shown)} />
    </>
  )
}

function Buttons({ onCheck, shown, onShow }: { onCheck?: () => void; shown: boolean; onShow: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {onCheck && <button onClick={onCheck} className={`${btn} bg-green text-ink`}>Проверить</button>}
      <button onClick={onShow} className={`${btn} bg-white/[.07] text-fg font-medium`}>
        {shown ? 'Скрыть ответ' : 'Показать ответ'}
      </button>
    </div>
  )
}

export default function TaskCard({ data, seed }: { data: TaskData; seed: number }) {
  return (
    <div className="mx-4 mb-5 flex flex-col gap-3">
      <Intro t={data.intro} />
      {data.kind === 'fill' && <Fill d={data} seed={seed} />}
      {data.kind === 'match' && <Match d={data} seed={seed} />}
      {data.kind === 'order' && <Order d={data} />}
      {data.kind === 'reveal' && <Reveal d={data} />}
    </div>
  )
}
