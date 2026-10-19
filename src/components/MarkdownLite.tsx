import { useMemo, useState, type ReactNode } from 'react'

/** Лёгкий markdown для уроков: аккордеоны по ####, код с копированием, таблицы, списки, подсказки. */

type Block =
  | { t: 'code'; lang: string; text: string }
  | { t: 'svg'; text: string }
  | { t: 'table'; rows: string[][]; head: boolean }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] }
  | { t: 'quote'; text: string }
  | { t: 'h'; level: number; text: string }
  | { t: 'p'; text: string }

type Node = Block | { t: 'acc'; title: string; blocks: Block[] }

function lex(md: string): Block[] {
  const lines = (md || '').replace(/\r/g, '').split('\n')
  const out: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const fence = line.match(/^```([a-zA-Z0-9_+-]*)\s*$/)
    if (fence) {
      const buf: string[] = []; i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++ }
      i++
      out.push(fence[1] === 'svg' ? { t: 'svg', text: buf.join('\n') } : { t: 'code', lang: fence[1] || '', text: buf.join('\n') })
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
    if (m[1]) parts.push(<code key={k++} className="px-1 py-0.5 rounded bg-white/10 text-[.88em] text-green font-mono">{m[1]}</code>)
    else if (m[2]) parts.push(<b key={k++} className="text-white">{m[2]}</b>)
    else if (m[3]) parts.push(<a key={k++} href={m[4]} target="_blank" rel="noreferrer" className="text-green underline break-all">{m[3]}</a>)
    else if (m[5]) parts.push(<a key={k++} href={m[5]} target="_blank" rel="noreferrer" className="text-green underline break-all">{m[5]}</a>)
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
    <div className="relative my-2.5 group">
      <button onClick={copy}
        className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-white/10 text-[11px] text-white/70 active:bg-green/20">
        {copied ? '✓ скопировано' : 'копировать'}
      </button>
      <pre className="p-3 pr-24 rounded-xl bg-[#0d0f13] border border-white/[.08] overflow-x-auto text-[12.5px] leading-[1.6] text-white/90 font-mono">{text}</pre>
    </div>
  )
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.t === 'code') return <Code key={i} text={b.text} />
        if (b.t === 'svg') return <div key={i} className="my-3 flex justify-center overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: b.text }} />
        if (b.t === 'h') return <div key={i} className="mt-3 mb-1 text-[15px] font-bold text-white">{inline(b.text)}</div>
        if (b.t === 'p') return <p key={i} className="my-1.5 text-[14px] leading-[1.8] text-white/80 whitespace-pre-wrap break-words">{inline(b.text)}</p>
        if (b.t === 'quote') return (
          <div key={i} className="my-2 p-3 rounded-xl border-l-2 border-green bg-green/[.06] text-[13.5px] leading-[1.7] text-white/80 whitespace-pre-wrap break-words">{inline(b.text)}</div>
        )
        if (b.t === 'ul') return <ul key={i} className="my-1.5 pl-1 flex flex-col gap-1">{b.items.map((it, k) => <li key={k} className="flex gap-2 text-[14px] leading-[1.7] text-white/80"><span className="text-green shrink-0">•</span><span className="break-words">{inline(it)}</span></li>)}</ul>
        if (b.t === 'ol') return <ol key={i} className="my-1.5 pl-1 flex flex-col gap-1">{b.items.map((it, k) => <li key={k} className="flex gap-2 text-[14px] leading-[1.7] text-white/80"><span className="text-green shrink-0 font-semibold">{k + 1}.</span><span className="break-words">{inline(it)}</span></li>)}</ol>
        if (b.t === 'table') return (
          <div key={i} className="my-2.5 overflow-x-auto rounded-xl border border-white/[.08]">
            <table className="w-full text-[13px] border-collapse">
              <tbody>
                {b.rows.map((r, ri) => (
                  <tr key={ri} className={ri === 0 && b.head ? 'bg-white/[.06]' : 'border-t border-white/[.06]'}>
                    {r.map((c, ci) => (ri === 0 && b.head)
                      ? <th key={ci} className="text-left p-2 font-semibold text-white">{inline(c)}</th>
                      : <td key={ci} className="p-2 text-white/80 align-top">{inline(c)}</td>)}
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

function Accordion({ title, blocks, defOpen }: { title: string; blocks: Block[]; defOpen: boolean }) {
  const [open, setOpen] = useState(defOpen)
  return (
    <div className="my-2 rounded-xl border border-white/[.1] overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left active:bg-white/[.04]">
        <span className="text-[14px] font-semibold text-white break-words">{inline(title)}</span>
        <span className={`shrink-0 text-green transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && <div className="px-3.5 pb-3 pt-0 border-t border-white/[.06]"><Blocks blocks={blocks} /></div>}
    </div>
  )
}

export default function MarkdownLite({ content }: { content: string }) {
  const nodes = useMemo(() => group(lex(content)), [content])
  const firstAcc = nodes.findIndex(n => n.t === 'acc')
  return (
    <div className="px-4">
      {nodes.map((n, i) => n.t === 'acc'
        ? <Accordion key={i} title={n.title} blocks={n.blocks} defOpen={i === firstAcc} />
        : <Blocks key={i} blocks={[n]} />)}
    </div>
  )
}
