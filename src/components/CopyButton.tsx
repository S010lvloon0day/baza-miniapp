import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Warning } from '@phosphor-icons/react'

const tg = (window as any).Telegram?.WebApp

/**
 * Копирование в буфер с фолбэком.
 *
 * navigator.clipboard есть не везде: часть Android-сборок Telegram WebView его
 * не отдаёт вовсе, а часть возвращает промис, который молча отклоняется. Поэтому
 * при любой осечке уходим на execCommand — он работает в этих сборках.
 */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // штатный путь недоступен — ниже фолбэк
  }

  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    // readonly + contentEditable — единственная комбинация, при которой iOS даёт
    // выделить содержимое программно и не поднимает экранную клавиатуру.
    ta.contentEditable = 'true'
    Object.assign(ta.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '1px',
      height: '1px',
      padding: '0',
      border: 'none',
      outline: 'none',
      boxShadow: 'none',
      background: 'transparent',
      opacity: '0',
      fontSize: '16px', // меньше 16px — iOS зумит вьюпорт при фокусе
    })
    document.body.appendChild(ta)

    const range = document.createRange()
    range.selectNodeContents(ta)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    ta.setSelectionRange(0, text.length)

    const ok = document.execCommand('copy')
    sel?.removeAllRanges()
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

type State = 'idle' | 'done' | 'fail'

const FACE: Record<State, { label: string; color: string }> = {
  idle: { label: 'Копировать',  color: 'text-green/75' },
  done: { label: 'Скопировано', color: 'text-greenLight' },
  fail: { label: 'Не удалось',  color: 'text-gold' },
}

export default function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [state, setState] = useState<State>('idle')
  const timer = useRef<number | null>(null)

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  const onClick = async () => {
    const ok = await writeClipboard(text)
    setState(ok ? 'done' : 'fail')
    tg?.HapticFeedback?.notificationOccurred?.(ok ? 'success' : 'error')
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 2000)
  }

  const face = FACE[state]

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${face.label} текст`}
      // min-h-44 — размер цели для пальца по гайдлайнам. -my-2 съедает лишнюю
      // высоту в вёрстке, оставаясь достаточно малым, чтобы не перехватывать
      // нажатия у соседних элементов.
      className={`group flex items-center justify-center gap-1.5 shrink-0
                  min-h-[44px] -my-2 px-2 -mr-2 rounded-lg
                  transition-colors active:bg-[rgba(34,197,94,.10)] ${face.color} ${className}`}
    >
      <span className="relative w-[15px] h-[15px]">
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            key={state}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {state === 'done' ? <Check size={15} weight="bold" />
              : state === 'fail' ? <Warning size={15} weight="bold" />
              : <Copy size={15} weight="bold" />}
          </motion.span>
        </AnimatePresence>
      </span>

      <span className="relative">
        {/* Ширину держит самое длинное состояние — надпись не дёргает заголовок. */}
        <span aria-hidden className="invisible text-[11px] font-semibold tracking-[1.5px] uppercase">
          Скопировано
        </span>
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            key={state}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 flex items-center justify-start whitespace-nowrap
                       text-[11px] font-semibold tracking-[1.5px] uppercase"
          >
            {face.label}
          </motion.span>
        </AnimatePresence>
      </span>

      <span className="sr-only" role="status" aria-live="polite">
        {state === 'done' ? 'Текст скопирован в буфер обмена'
          : state === 'fail' ? 'Не удалось скопировать текст'
          : ''}
      </span>
    </button>
  )
}
