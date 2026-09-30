import { useMemo, useState } from 'react'

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
        <div className="p-3.5 border border-white/[.08] rounded-2xl text-[13.5px] leading-[1.75] text-white/75 whitespace-pre-wrap break-words">
          <div className="text-[10px] font-bold tracking-[2.5px] uppercase text-green mb-1.5">Ситуация</div>
          {data.scenario}
        </div>
      )}

      <div className="text-[15px] leading-[1.6] font-semibold text-white whitespace-pre-wrap break-words">
        {data.question}
      </div>

      <div className="flex flex-col gap-2">
        {data.options.map((o, i) => {
          const isRight = answered && i === data.correct
          const isWrong = answered && i === picked && i !== data.correct
          const cls = isRight
            ? 'border-green bg-green/10 text-white'
            : isWrong
              ? 'border-red-500/70 bg-red-500/10 text-white'
              : answered
                ? 'border-white/[.06] text-white/45'
                : 'border-white/[.1] text-white/85 active:bg-white/[.05]'
          return (
            <button key={i} onClick={() => choose(i)} disabled={answered}
              className={`flex items-start gap-3 text-left p-3 rounded-xl border transition-colors ${cls}`}>
              <span className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-bold
                ${isRight ? 'border-green text-green' : isWrong ? 'border-red-400 text-red-400' : 'border-white/20 text-white/60'}`}>
                {isRight ? '✓' : isWrong ? '✕' : letters[i]}
              </span>
              <span className="text-[13.5px] leading-[1.55] break-words">{o}</span>
            </button>
          )
        })}
      </div>

      {!answered && data.hints && data.hints.length > 0 && (
        showHint
          ? <div className="p-3 rounded-xl border border-white/[.08] text-[12.5px] text-white/70 whitespace-pre-wrap">💡 {data.hints.join('\n💡 ')}</div>
          : <button onClick={() => setShowHint(true)} className="self-start text-[12px] text-green font-semibold active:opacity-70">💡 Подсказка</button>
      )}

      {answered && (
        <div className={`p-3.5 rounded-2xl border ${right ? 'border-green/50 bg-green/[.06]' : 'border-red-500/40 bg-red-500/[.06]'}`}>
          <div className={`text-[13px] font-bold mb-1 ${right ? 'text-green' : 'text-red-400'}`}>
            {right ? '✅ Верно!' : `❌ Неверно. Правильный ответ: ${letters[data.correct]}`}
          </div>
          {data.explanation && (
            <div className="text-[13px] leading-[1.7] text-white/75 whitespace-pre-wrap break-words">{data.explanation}</div>
          )}
          <button onClick={() => { setPicked(null); setShowHint(false) }}
            className="mt-2.5 text-[12px] text-green font-semibold active:opacity-70">↻ Пройти ещё раз</button>
        </div>
      )}
    </div>
  )
}
