import { useMemo, useState } from 'react'
import Icon from './Icon'

/** Материал-тест (media_type = 'quiz'): content — JSON
 *  { kind, scenario?, question, options[], correct, explanation?, hints?[] } */
export interface QuizData {
  kind?: string
  scenario?: string | null
  question: string
  options: string[]
  correct: number
  explanation?: string
  hints?: string[]
}

export function parseQuiz(content?: string | null): QuizData | null {
  if (!content) return null
  try {
    const q = JSON.parse(content)
    if (q && Array.isArray(q.options) && typeof q.correct === 'number') return q as QuizData
  } catch { /* не JSON — не тест */ }
  return null
}

const tg = (window as any).Telegram?.WebApp

export default function QuizCard({ data }: { data: QuizData }) {
  const [picked, setPicked] = useState<number | null>(null)
  const [showHint, setShowHint] = useState(false)
  const letters = useMemo(() => ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'], [])
  const answered = picked !== null
  const right = answered && picked === data.correct

  const choose = (i: number) => {
    if (answered) return
    setPicked(i)
    try { tg?.HapticFeedback?.notificationOccurred(i === data.correct ? 'success' : 'error') } catch { /* нет haptic */ }
  }

  return (
    <div className="mx-4 mb-5 flex flex-col gap-3">
      {data.scenario && (
        <div className="card p-4 text-[14.5px] leading-[1.65] text-fg/85 whitespace-pre-wrap break-words">
          <div className="font-display font-semibold text-[13px] text-violet mb-1.5">Ситуация</div>
          {data.scenario}
        </div>
      )}

      <div className="font-display font-semibold text-[16px] leading-[1.45] text-fg whitespace-pre-wrap break-words">
        {data.question}
      </div>

      <div className="flex flex-col gap-2">
        {data.options.map((o, i) => {
          const isRight = answered && i === data.correct
          const isWrong = answered && i === picked && i !== data.correct
          const cls = isRight
            ? 'border-green/60 bg-green/[.12] text-fg'
            : isWrong
              ? 'border-[#FF6B6B]/50 bg-[#FF6B6B]/[.10] text-fg'
              : answered
                ? 'border-white/[.05] bg-s1 text-gray2'
                : 'border-white/[.07] bg-s1 text-fg active:bg-s2'
          return (
            <button key={i} onClick={() => choose(i)} disabled={answered}
              className={`flex items-start gap-3 text-left px-3.5 py-3 rounded-[16px] border transition-colors ${cls}`}>
              <span className={`shrink-0 w-7 h-7 rounded-[9px] flex items-center justify-center text-[12px] font-bold
                ${isRight ? 'bg-green text-ink' : isWrong ? 'bg-[#FF6B6B] text-[#2A0606]' : 'bg-white/[.07] text-gray'}`}>
                {isRight ? <Icon name="check" size={15} strokeWidth={2.4} /> : isWrong ? <Icon name="close" size={14} strokeWidth={2.4} /> : letters[i]}
              </span>
              <span className="text-[14.5px] leading-[1.5] break-words pt-[3px]">{o}</span>
            </button>
          )
        })}
      </div>

      {!answered && data.hints && data.hints.length > 0 && (
        showHint
          ? <div className="card-violet p-3.5 text-[13.5px] leading-[1.6] text-fg/85 whitespace-pre-wrap flex gap-2.5"><Icon name="question" size={18} className="text-violet shrink-0" accent="#B9A8FF" /><span>{data.hints.join('\n')}</span></div>
          : <button onClick={() => setShowHint(true)} className="self-start inline-flex items-center gap-1.5 text-[13.5px] text-violet font-medium active:opacity-70"><Icon name="question" size={17} accent="#B9A8FF" /> Подсказка</button>
      )}

      {answered && (
        <div className={`p-4 rounded-[18px] border ${right ? 'border-green/35 bg-green/[.07]' : 'border-[#FF6B6B]/30 bg-[#FF6B6B]/[.07]'}`}>
          <div className={`flex items-center gap-2 font-display font-semibold text-[14px] mb-1.5 ${right ? 'text-green' : 'text-[#FF8A8A]'}`}>
            <Icon name={right ? 'checkCircle' : 'warnCircle'} size={18} accent="current" />
            {right ? 'Верно' : `Неверно. Правильный ответ: ${letters[data.correct]}`}
          </div>
          {data.explanation && (
            <div className="text-[14px] leading-[1.6] text-fg/80 whitespace-pre-wrap break-words">{data.explanation}</div>
          )}
          <button onClick={() => { setPicked(null); setShowHint(false) }}
            className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] text-fg font-medium active:opacity-70"><Icon name="undo" size={16} /> Пройти ещё раз</button>
        </div>
      )}
    </div>
  )
}
