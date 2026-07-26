import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gift, Trash } from '@phosphor-icons/react'
import { coursesApi, CourseApiError } from '../../api/courses'
import type { AdminMember } from '../../api/courses'

interface Props {
  open: boolean
  courseId: number | null
  courseTitle: string
  onClose: () => void
}

/** Человекочитаемое имя записи доступа: имя → @username → ID. */
function memberName(m: AdminMember): string {
  if (m.full_name && m.full_name.trim()) return m.full_name
  if (m.username) return '@' + m.username
  return String(m.user_id)
}

function errText(e: unknown): string {
  const code = e instanceof CourseApiError ? e.code : ''
  switch (code) {
    case 'empty_user':    return 'Введите Telegram ID или @username.'
    case 'user_not_found':return 'Пользователь не найден. Проверь @username или пришли числовой ID.'
    case 'not_found':     return 'Курс не найден.'
    case 'forbidden':     return 'Нет прав администратора.'
    default:              return 'Не удалось выполнить. Попробуй ещё раз.'
  }
}

export default function GrantSheet({ open, courseId, courseTitle, onClose }: Props) {
  const [input, setInput] = useState('')
  const [members, setMembers] = useState<AdminMember[]>([])
  const [loading, setLoading] = useState(true)
  const [granting, setGranting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const loadMembers = async (cid: number) => {
    setLoading(true)
    try {
      const r = await coursesApi.adminMembers(cid)
      setMembers(r.members)
    } catch {
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open || courseId == null) return
    setInput(''); setError(null); setNotice(null)
    loadMembers(courseId)
  }, [open, courseId])

  const grant = async () => {
    if (courseId == null) return
    const value = input.trim()
    if (!value) { setError('Введите Telegram ID или @username.'); return }
    setGranting(true); setError(null); setNotice(null)
    try {
      const res = await coursesApi.adminGrant(courseId, value)
      const who = res.member.username ? '@' + res.member.username : String(res.member.user_id)
      if (res.already) setNotice(`У ${who} уже был доступ.`)
      else if (!res.member.known) setNotice(`Доступ выдан по ID ${res.member.user_id}. Пользователь ещё не открывал бота — курс появится после входа.`)
      else setNotice(`Доступ выдан: ${who}.`)
      setInput('')
      await loadMembers(courseId)
    } catch (e) {
      setError(errText(e))
    } finally {
      setGranting(false)
    }
  }

  const revoke = async (userId: number) => {
    if (courseId == null) return
    setError(null); setNotice(null)
    try {
      await coursesApi.adminRevoke(courseId, userId)
      setMembers(prev => prev.filter(m => m.user_id !== userId))
    } catch (e) {
      setError(errText(e))
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 inset-x-0 z-50 bg-s1 rounded-t-2xl border-t border-bd2 pb-8"
            style={{ maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-bd2" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-3 pb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <Gift size={20} weight="fill" className="text-green" />
                <div className="min-w-0">
                  <div className="text-[15px] font-bold tracking-wide">Подарить курс</div>
                  <div className="text-[11px] text-gray truncate" style={{ maxWidth: 220 }}>{courseTitle}</div>
                </div>
              </div>
              <button onClick={onClose} className="text-gray2 p-1 active:opacity-60">
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Grant input */}
            <div className="px-4">
              <div className="flex" style={{ gap: 8 }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') grant() }}
                  placeholder="Telegram ID или @username"
                  autoComplete="off" autoCapitalize="off" spellCheck={false}
                  style={{
                    flex: 1, minWidth: 0, padding: '13px 14px', borderRadius: 12,
                    border: '1px solid rgba(255,255,255,.12)', background: '#101014',
                    color: '#fff', fontSize: 13.5, fontWeight: 600, outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={grant}
                  disabled={granting}
                  className="active:scale-[.99] flex items-center justify-center"
                  style={{
                    flex: 'none', padding: '0 18px', borderRadius: 12, border: 'none',
                    background: granting ? 'rgba(34,197,94,.4)' : 'linear-gradient(180deg,#4AE885,#22C55E)',
                    color: '#04120A', fontSize: 13, fontWeight: 800,
                    cursor: granting ? 'default' : 'pointer',
                  }}
                >
                  {granting ? '…' : 'Выдать'}
                </button>
              </div>

              {error && (
                <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: '#ff9a9a' }}>{error}</div>
              )}
              {notice && (
                <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: '#4AE885' }}>{notice}</div>
              )}
            </div>

            {/* Members list */}
            <div className="font-mono px-4" style={{ fontSize: 10.5, color: '#6a6a75', margin: '18px 0 10px' }}>
              // доступ есть у {members.length}
            </div>
            <div className="overflow-y-auto px-4" style={{ flex: 1 }}>
              {loading ? (
                <div className="text-gray" style={{ fontSize: 12, padding: '10px 2px' }}>Загрузка…</div>
              ) : members.length === 0 ? (
                <div className="text-gray" style={{ fontSize: 12, padding: '10px 2px' }}>Пока ни у кого нет доступа.</div>
              ) : (
                <div className="flex flex-col" style={{ gap: 8 }}>
                  {members.map(m => (
                    <div
                      key={m.user_id}
                      className="flex items-center"
                      style={{ gap: 10, padding: '11px 13px', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, background: '#101014' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="truncate" style={{ fontSize: 13, fontWeight: 700 }}>{memberName(m)}</div>
                        <div className="font-mono truncate" style={{ fontSize: 9.5, color: '#6a6a75', marginTop: 2 }}>
                          ID {m.user_id}
                          {m.username ? ` · @${m.username}` : ''}
                          {m.manual ? ' · выдан вручную' : ' · оплачен'}
                          {m.paid_at ? ` · ${m.paid_at.slice(0, 10)}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => revoke(m.user_id)}
                        aria-label="Отозвать доступ"
                        className="flex items-center justify-center"
                        style={{ flex: 'none', width: 32, height: 32, borderRadius: 9, border: 'none', background: 'rgba(255,103,103,.1)', color: '#ff8080', cursor: 'pointer' }}
                      >
                        <Trash size={15} weight="bold" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
