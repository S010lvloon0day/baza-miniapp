import { emptyOption } from './types'
import type { DraftQuestion } from './types'

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  padding: '9px 10px',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: 9,
  background: '#101014',
  color: '#fff',
  fontSize: 12.5,
  outline: 'none',
  fontFamily: 'inherit',
}

function XButton({ onClick, size = 13 }: { onClick: () => void; size?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Удалить"
      style={{ flex: 'none', border: 'none', background: 'transparent', color: '#6a6a75', cursor: 'pointer', padding: 2, lineHeight: 0 }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  )
}

interface Props {
  question: DraftQuestion
  onChange: (q: DraftQuestion) => void
  onRemove: () => void
}

export default function QuestionEditor({ question, onChange, onRemove }: Props) {
  const patch = (fields: Partial<DraftQuestion>) => onChange({ ...question, ...fields })

  const patchOption = (optionId: DraftQuestion['options'][number]['id'], fields: Partial<DraftQuestion['options'][number]>) =>
    patch({ options: question.options.map(o => (o.id === optionId ? { ...o, ...fields } : o)) })

  const toggleCorrect = (optionId: DraftQuestion['options'][number]['id']) => {
    const target = question.options.find(o => o.id === optionId)
    if (!target) return
    // Одиночный вопрос: правильный ответ ровно один, отметка переезжает
    patch({
      options: question.options.map(o =>
        question.multi
          ? o.id === optionId ? { ...o, correct: !o.correct } : o
          : { ...o, correct: o.id === optionId ? !target.correct : false },
      ),
    })
  }

  return (
    <div style={{ border: '1px solid rgba(255,255,255,.07)', borderRadius: 11, padding: 10, background: '#0D0D11' }}>
      <div className="flex" style={{ gap: 6, marginBottom: 7 }}>
        <input
          value={question.text}
          onChange={e => patch({ text: e.target.value })}
          placeholder="Текст вопроса"
          style={{ ...inputStyle, flex: 1, minWidth: 0 }}
        />
        <XButton onClick={onRemove} />
      </div>

      <label className="flex items-center" style={{ gap: 6, fontSize: 10.5, color: '#8a8a93', marginBottom: 8, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={question.multi}
          onChange={e => {
            const multi = e.target.checked
            // При переходе в одиночный режим оставляем только первый верный вариант
            if (!multi) {
              let seen = false
              patch({
                multi,
                options: question.options.map(o => {
                  if (o.correct && !seen) { seen = true; return o }
                  return { ...o, correct: false }
                }),
              })
            } else {
              patch({ multi })
            }
          }}
        />
        Несколько правильных ответов
      </label>

      <div className="flex flex-col" style={{ gap: 6, marginBottom: 6 }}>
        {question.options.map(option => (
          <div key={String(option.id)} className="flex items-center" style={{ gap: 7 }}>
            <button
              type="button"
              onClick={() => toggleCorrect(option.id)}
              aria-label="Отметить как правильный"
              className="flex items-center justify-center"
              style={{
                flex: 'none', width: 20, height: 20, borderRadius: 6,
                border: `1.5px solid ${option.correct ? '#4AE885' : 'rgba(255,255,255,.25)'}`,
                background: option.correct ? '#4AE885' : 'transparent',
                cursor: 'pointer',
              }}
            >
              {option.correct && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0A0A0D" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
            <input
              value={option.text}
              onChange={e => patchOption(option.id, { text: e.target.value })}
              placeholder="Вариант ответа"
              style={{ ...inputStyle, flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 8, fontSize: 12 }}
            />
            <XButton size={12} onClick={() => patch({ options: question.options.filter(o => o.id !== option.id) })} />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => patch({ options: [...question.options, emptyOption()] })}
        style={{ border: 'none', background: 'transparent', color: '#4AE885', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', padding: '2px 0' }}
      >
        + вариант ответа
      </button>
    </div>
  )
}

export { inputStyle, XButton }
