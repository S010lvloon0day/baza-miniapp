import { Fragment } from 'react'

/**
 * Читабельный рендер текста урока из PDF.
 *
 * Исходник — плоский текст со списками («1. …», «• …»), подзаголовками
 * (строка заканчивается двоеточием) и абзацами. pdftotext переносит длинные
 * строки, поэтому строки-продолжения склеиваются обратно в один пункт.
 */

type Block =
  | { type: 'section'; text: string }
  | { type: 'subhead'; text: string }
  | { type: 'para'; text: string }
  | { type: 'ordered'; items: string[] }
  | { type: 'bullet'; items: string[] }
  | { type: 'code'; lines: string[] }

const ORDERED = /^\s*(\d+)[.)]\s+(.*)$/
const BULLET = /^\s*[•▪◦o·–-]\s+(.*)$/
const SUBHEAD = /:\s*$/

/** Команда/скрипт из практики — рендерим моноширинным блоком, а не абзацем. */
function isCode(line: string): boolean {
  const t = line.trim()
  if (!t) return false
  return (
    /^@echo\b/.test(t) ||
    /^SET\s+[A-Z]/.test(t) ||
    /^netsh\b/.test(t) ||
    /^(del|rmdir|taskkill|start|sudo|crontab|reg\s+add|chmod|chown|apt|dnf|pacman|cryptsetup|veracrypt|gpg|ssh|proxychains|macchanger|curl)\b/.test(t) ||
    /^(ACTION|KERNEL|SUBSYSTEM|ENV)==/.test(t) ||
    /^\$\w+\s*=/.test(t) ||
    /^#(Persistent|!\/)/.test(t) ||
    /^0\s+\*\s+\*\s+\*/.test(t) ||
    /\bwg-quick\b/.test(t) ||
    /\b(Get-Random|Start-Sleep|SetKeyDelay)\b/.test(t)
  )
}

function isSection(line: string): boolean {
  const t = line.trim()
  if (t.length < 4 || t.length > 90) return false
  const letters = [...t].filter(c => /[а-яёa-z]/i.test(c))
  const upper = letters.filter(c => c === c.toUpperCase())
  // Строка почти целиком в ВЕРХНЕМ регистре — это заголовок раздела внутри урока
  return letters.length > 3 && upper.length / letters.length > 0.7
}

function isSubhead(line: string): boolean {
  const t = line.trim()
  return SUBHEAD.test(t) && t.length <= 75 && !ORDERED.test(t) && !BULLET.test(t) && !t.slice(0, -1).includes(': ')
}

function parse(text: string): Block[] {
  const blocks: Block[] = []
  let cur: Block | null = null
  const flush = () => { if (cur) { blocks.push(cur); cur = null } }

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\s+$/, '')
    if (!line.trim()) { flush(); continue }

    const mo = line.match(ORDERED)
    const mb = line.match(BULLET)

    if (isCode(line)) {
      if (cur?.type !== 'code') { flush(); cur = { type: 'code', lines: [] } }
      cur.lines.push(line.trim())
    } else if (mo) {
      if (cur?.type !== 'ordered') { flush(); cur = { type: 'ordered', items: [] } }
      cur.items.push(mo[2].trim())
    } else if (mb) {
      if (cur?.type !== 'bullet') { flush(); cur = { type: 'bullet', items: [] } }
      cur.items.push(mb[1].trim())
    } else if (isSection(line)) {
      flush(); blocks.push({ type: 'section', text: line.trim() })
    } else if (isSubhead(line)) {
      flush(); blocks.push({ type: 'subhead', text: line.trim() })
    } else if (cur?.type === 'ordered' || cur?.type === 'bullet') {
      // Продолжение последнего пункта списка, перенесённое на новую строку
      cur.items[cur.items.length - 1] += ' ' + line.trim()
    } else if (cur?.type === 'code') {
      flush(); cur = { type: 'para', text: line.trim() }
    } else if (cur?.type === 'para') {
      cur.text += ' ' + line.trim()
    } else {
      flush(); cur = { type: 'para', text: line.trim() }
    }
  }
  flush()
  return blocks
}

const listItem = (n: string | number, body: string, ordered: boolean) => (
  <div key={`${n}-${body.slice(0, 12)}`} className="flex gap-2.5 mb-2">
    {ordered
      ? <span className="shrink-0 min-w-[18px] text-right text-green font-semibold text-[14px] leading-[1.65] tabular-nums">{n}.</span>
      : <span className="shrink-0 mt-[10px] w-[6px] h-[6px] rotate-45 bg-green" />}
    <span className="flex-1 text-[15px] text-fg/85 leading-[1.65]">{body}</span>
  </div>
)

export default function LessonContent({ text }: { text: string }) {
  const blocks = parse(text)
  return (
    <div className="mb-6">
      {blocks.map((b, i) => {
        if (b.type === 'section') {
          return <h2 key={i} className="font-display font-semibold text-[17px] leading-snug text-fg mt-6 mb-3">{b.text}</h2>
        }
        if (b.type === 'subhead') {
          return <h3 key={i} className="font-semibold text-[15.5px] text-fg mt-5 mb-2">{b.text}</h3>
        }
        if (b.type === 'para') {
          return <p key={i} className="text-[15px] text-fg/85 leading-[1.7] mb-3.5">{b.text}</p>
        }
        if (b.type === 'code') {
          return (
            <pre key={i} className="font-mono mb-3.5 px-3.5 py-3 rounded-[14px] bg-[#060B09] border border-white/[.07] overflow-x-auto text-[12.5px] leading-[1.6] text-fg/90 whitespace-pre-wrap break-words">
              <code>{b.lines.join('\n')}</code>
            </pre>
          )
        }
        const ordered = b.type === 'ordered'
        return (
          <div key={i} className="mb-3.5">
            {b.items.map((it, j) => (
              <Fragment key={j}>{listItem(ordered ? j + 1 : '•', it, ordered)}</Fragment>
            ))}
          </div>
        )
      })}
    </div>
  )
}

/** Метка шага по его названию: 1.1 · Практика → «Практика». */
export function stepKindLabel(title: string): string {
  if (/практика/i.test(title)) return 'Практика'
  if (/чек-?лист/i.test(title)) return 'Чек-лист'
  return 'Теория'
}
