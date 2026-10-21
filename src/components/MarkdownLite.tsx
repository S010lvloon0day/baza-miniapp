import Icon from './Icon'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import CodeTask from './CodeTask'
import RunTask from './RunTask'
import MongoTask from './MongoTask'
import HackLab from './HackLab'

/** Лёгкий markdown для уроков: аккордеоны по ####, код с копированием, таблицы, списки, подсказки. */

type Block =
  | { t: 'code'; lang: string; text: string }
  | { t: 'svg'; text: string }
  | { t: 'pytask'; text: string }
  | { t: 'runtask'; text: string }
  | { t: 'mongotask'; text: string }
  | { t: 'hacklab'; text: string }
  | { t: 'table'; rows: string[][]; head: boolean }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] }
  | { t: 'quote'; text: string }
  | { t: 'h'; level: number; text: string }
  | { t: 'p'; text: string }

type Node = Block | { t: 'acc'; title: string; blocks: Block[] }

function lex(md: string): Block[] {
  // Эмодзи-маркеры в заголовках и пунктах заменяются фирменным оформлением (ромбы-маркеры уже есть).
  let inCode = false
  const lines = (md || '').replace(/\r/g, '').split('\n').map(l => {
    if (/^\s*```/.test(l)) { inCode = !inCode; return l }
    if (inCode) return l
    const m = l.match(/^(\s*(?:#{1,6}\s+|[-*•]\s+|\d+[.)]\s+|>\s*)?)(.*)$/)
    if (!m) return l
    const head = m[1], rest = m[2]
    const cleaned = rest.replace(/^(?:\p{Extended_Pictographic}|[\u{FE0F}\u{200D}\u{20E3}]|\s)+/u, '')
    return head + (head ? cleaned : (cleaned !== rest ? cleaned : rest))
  })
  const out: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const fence = line.match(/^```([a-zA-Z0-9_+-]*)\s*$/)
    if (fence) {
      const buf: string[] = []; i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++ }
      i++
      const _fc = buf.join('\n')
      if (fence[1] === 'svg') out.push({ t: 'svg', text: _fc })
      else if (fence[1] === 'pytask') out.push({ t: 'pytask', text: _fc })
      else if (fence[1] === 'runtask') out.push({ t: 'runtask', text: _fc })
      else if (fence[1] === 'mongotask') out.push({ t: 'mongotask', text: _fc })
      else if (fence[1] === 'hacklab') out.push({ t: 'hacklab', text: _fc })
      else out.push({ t: 'code', lang: fence[1] || '', text: _fc })
      continue
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const rows: string[][] = []; let head = false
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
        if (cells.every(c => /^:?-{2,}:?$/.test(c))) { head = rows.length === 1 }
        else rows.push(cells)
        i++
      }
      out.push({ t: 'table', rows, head })
      continue
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) { out.push({ t: 'h', level: h[1].length, text: h[2].trim() }); i++; continue }
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++ }
      out.push({ t: 'quote', text: buf.join('\n') })
      continue
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, '')); i++ }
      out.push({ t: 'ul', items })
      continue
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+[.)]\s+/, '')); i++ }
      out.push({ t: 'ol', items })
      continue
    }
    if (line.trim() === '') { i++; continue }
    const buf: string[] = []
    while (i < lines.length && lines[i].trim() !== '' && !/^(```|#{1,6}\s|\s*\||\s*>|\s*[-*]\s|\s*\d+[.)]\s)/.test(lines[i])) {
      buf.push(lines[i]); i++
    }
    out.push({ t: 'p', text: buf.join('\n') })
  }
  return out
}

// #### заголовки превращаем в аккордеоны (сворачиваемые блоки)
function group(blocks: Block[]): Node[] {
  const nodes: Node[] = []
  let i = 0
  while (i < blocks.length) {
    const b = blocks[i]
    if (b.t === 'h' && b.level >= 4) {
      const inner: Block[] = []; i++
      while (i < blocks.length && !(blocks[i].t === 'h' && (blocks[i] as any).level >= 4)) { inner.push(blocks[i]); i++ }
      nodes.push({ t: 'acc', title: b.text, blocks: inner })
    } else { nodes.push(b); i++ }
  }
  return nodes
}

function inline(s: string): ReactNode[] {
  const parts: ReactNode[] = []
  const re = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s)]+)/g
  let last = 0, m: RegExpExecArray | null, k = 0
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(s.slice(last, m.index))
    if (m[1]) parts.push(<code key={k++} className="px-1.5 py-0.5 rounded-md bg-white/[.08] text-[.86em] text-greenLight font-mono">{m[1]}</code>)
    else if (m[2]) parts.push(<b key={k++} className="text-fg font-semibold">{m[2]}</b>)
    else if (m[3]) parts.push(<a key={k++} href={m[4]} target="_blank" rel="noreferrer" className="text-green underline underline-offset-2 decoration-green/40 break-all">{m[3]}</a>)
    else if (m[5]) parts.push(<a key={k++} href={m[5]} target="_blank" rel="noreferrer" className="text-green underline underline-offset-2 decoration-green/40 break-all">{m[5]}</a>)
    last = re.lastIndex
  }
  if (last < s.length) parts.push(s.slice(last))
  return parts
}

function Code({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    try {
      navigator.clipboard?.writeText(text)
      setCopied(true); setTimeout(() => setCopied(false), 1200)
      try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('light') } catch { /* */ }
    } catch { /* */ }
  }
  return (
    <div className="my-3 rounded-[16px] bg-[#060B09] border border-white/[.07] overflow-hidden">
      <div className="flex items-center justify-between px-3.5 h-9 border-b border-white/[.06]">
        <span className="text-[12px] text-gray2">Код</span>
        <button onClick={copy} className={`inline-flex items-center gap-1.5 h-7 px-2.5 -mr-1.5 rounded-[9px] text-[12.5px] font-medium active:bg-white/[.08] ${copied ? 'text-green' : 'text-gray'}`}>
          <Icon name={copied ? 'check' : 'copy'} size={14} />{copied ? 'Скопировано' : 'Копировать'}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-[12.5px] leading-[1.65] text-fg/90 font-mono">{text}</pre>
    </div>
  )
}

function Blocks({ blocks, onSolve }: { blocks: Block[]; onSolve?: (tid: number) => void }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.t === 'code') return <Code key={i} text={b.text} />
        if (b.t === 'svg') return <div key={i} className="my-3 flex justify-center overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: b.text }} />
        if (b.t === 'pytask') return <CodeTask key={i} content={b.text} onSolve={() => onSolve?.((b as any).__tid)} />
        if (b.t === 'runtask') return <RunTask key={i} content={b.text} onSolve={() => onSolve?.((b as any).__tid)} />
        if (b.t === 'mongotask') return <MongoTask key={i} content={b.text} onSolve={() => onSolve?.((b as any).__tid)} />
        if (b.t === 'hacklab') return <HackLab key={i} content={b.text} onSolve={() => onSolve?.((b as any).__tid)} />
        if (b.t === 'h') return <h3 key={i} className="mt-4 mb-1.5 font-display font-semibold text-[16px] leading-snug text-fg">{inline(b.text)}</h3>
        if (b.t === 'p') return <p key={i} className="my-2 text-[15px] leading-[1.7] text-fg/85 whitespace-pre-wrap break-words">{inline(b.text)}</p>
        if (b.t === 'quote') return (
          <div key={i} className="my-3 py-3 px-3.5 rounded-[14px] border-l-[3px] border-purple bg-purple/[.10] text-[14.5px] leading-[1.65] text-fg/85 whitespace-pre-wrap break-words">{inline(b.text)}</div>
        )
        if (b.t === 'ul') return <ul key={i} className="my-1.5 pl-1 flex flex-col gap-1">{b.items.map((it, k) => <li key={k} className="flex gap-2.5 text-[15px] leading-[1.65] text-fg/85"><span className="shrink-0 mt-[9px] w-[6px] h-[6px] rotate-45 bg-green" /><span className="break-words">{inline(it)}</span></li>)}</ul>
        if (b.t === 'ol') return <ol key={i} className="my-1.5 pl-1 flex flex-col gap-1">{b.items.map((it, k) => <li key={k} className="flex gap-2.5 text-[15px] leading-[1.65] text-fg/85"><span className="text-green shrink-0 font-semibold tabular-nums">{k + 1}.</span><span className="break-words">{inline(it)}</span></li>)}</ol>
        if (b.t === 'table') return (
          <div key={i} className="my-3 overflow-x-auto rounded-[14px] border border-white/[.07]">
            <table className="w-full text-[13px] border-collapse">
              <tbody>
                {b.rows.map((r, ri) => (
                  <tr key={ri} className={ri === 0 && b.head ? 'bg-white/[.06]' : 'border-t border-white/[.07]'}>
                    {r.map((c, ci) => (ri === 0 && b.head)
                      ? <th key={ci} className="text-left px-3 py-2 font-semibold text-fg">{inline(c)}</th>
                      : <td key={ci} className="px-3 py-2 text-fg/80 align-top">{inline(c)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        return null
      })}
    </>
  )
}

function Accordion({ title, blocks, defOpen, onSolve }: { title: string; blocks: Block[]; defOpen: boolean; onSolve?: (tid: number) => void }) {
  const [open, setOpen] = useState(defOpen)
  return (
    <div className={`my-2.5 rounded-[18px] border overflow-hidden transition-colors ${open ? 'bg-s1 border-white/[.09]' : 'bg-s1/60 border-white/[.06]'}`}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left active:bg-white/[.04]">
        <span className="font-display font-semibold text-[14.5px] leading-snug text-fg break-words">{inline(title)}</span>
        <span className={`shrink-0 w-7 h-7 rounded-full grid place-items-center transition-transform ${open ? 'rotate-180 bg-green/15 text-green' : 'bg-white/[.06] text-gray'}`}><Icon name="chevD" size={16} /></span>
      </button>
      {open && <div className="px-4 pb-3.5 pt-1 border-t border-white/[.06]"><Blocks blocks={blocks} onSolve={onSolve} /></div>}
    </div>
  )
}

export default function MarkdownLite({ content, onAllSolved }: { content: string; onAllSolved?: () => void }) {
  const { nodes, taskCount } = useMemo(() => {
    const ns = group(lex(content))
    let t = 0
    const isTask = (b: Block) => b.t === 'pytask' || b.t === 'runtask' || b.t === 'mongotask' || b.t === 'hacklab'
    const visit = (bs: Block[]) => bs.forEach(b => { if (isTask(b)) (b as any).__tid = t++ })
    ns.forEach(n => n.t === 'acc' ? visit(n.blocks) : visit([n as Block]))
    return { nodes: ns, taskCount: t }
  }, [content])
  const firstAcc = nodes.findIndex(n => n.t === 'acc')
  const solvedRef = useRef<Set<number>>(new Set())
  const firedRef = useRef(false)
  useEffect(() => { solvedRef.current = new Set(); firedRef.current = false }, [content])
  const handleSolve = (tid: number) => {
    if (typeof tid !== 'number') return
    solvedRef.current.add(tid)
    if (!firedRef.current && taskCount > 0 && solvedRef.current.size >= taskCount) {
      firedRef.current = true
      onAllSolved?.()
    }
  }
  return (
    <div className="px-4">
      {nodes.map((n, i) => n.t === 'acc'
        ? <Accordion key={i} title={n.title} blocks={n.blocks} defOpen={i === firstAcc} onSolve={handleSolve} />
        : <Blocks key={i} blocks={[n]} onSolve={handleSolve} />)}
    </div>
  )
}
