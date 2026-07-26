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
  <div key={`${n}-${body.slice(0, 12)}`} className="flex" style={{ gap: 10, marginBottom: 8 }}>
    <span
      className={ordered ? 'font-mono' : ''}
      style={{
        flex: 'none', minWidth: ordered ? 18 : 12, textAlign: ordered ? 'right' : 'center',
        color: '#4AE885', fontWeight: 700, fontSize: ordered ? 13 : 15, lineHeight: 1.7,
      }}
    >
      {ordered ? `${n}.` : '•'}
    </span>
    <span style={{ flex: 1, fontSize: 13.5, color: '#c9c9ce', lineHeight: 1.7 }}>{body}</span>
  </div>
)

export default function LessonContent({ text }: { text: string }) {
  const blocks = parse(text)
  return (
    <div style={{ marginBottom: 26 }}>
      {blocks.map((b, i) => {
        if (b.type === 'section') {
          return (
            <div
              key={i}
              className="uppercase"
              style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: '#4AE885', margin: '22px 0 12px' }}
            >
              {b.text}
            </div>
          )
        }
        if (b.type === 'subhead') {
          return (
            <div key={i} style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '18px 0 8px' }}>
              {b.text}
            </div>
          )
        }
        if (b.type === 'para') {
          return (
            <p key={i} style={{ fontSize: 13.5, color: '#c9c9ce', lineHeight: 1.75, margin: '0 0 14px' }}>
              {b.text}
            </p>
          )
        }
        if (b.type === 'code') {
          return (
            <pre
              key={i}
              className="font-mono"
              style={{
                margin: '0 0 14px', padding: '12px 14px',
                background: '#0D0D11', border: '1px solid rgba(74,232,133,.18)', borderRadius: 12,
                overflowX: 'auto', fontSize: 12, lineHeight: 1.6, color: '#8fe3ab',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}
            >
              <code>{b.lines.join('\n')}</code>
            </pre>
          )
        }
        const ordered = b.type === 'ordered'
        return (
          <div key={i} style={{ marginBottom: 14 }}>
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
