import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { api } from '../api/client'
import type { CertInfo } from '../api/client'

const tg = (window as any).Telegram?.WebApp

/** Рисует «чёрный диплом» на canvas в высоком разрешении (для чёткого PNG). */
function drawCertificate(canvas: HTMLCanvasElement, info: CertInfo) {
  const W = 1400, H = 990
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Фон — глубокий чёрный с лёгким градиентом
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#0b0b0d')
  bg.addColorStop(0.5, '#111014')
  bg.addColorStop(1, '#09090b')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Виньетка
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.9)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)

  const gold = '#d4af37'
  const goldLight = '#f3e3a3'

  // Золотая рамка (двойная)
  ctx.strokeStyle = gold
  ctx.lineWidth = 4
  ctx.strokeRect(40, 40, W - 80, H - 80)
  ctx.strokeStyle = 'rgba(212,175,55,0.5)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(58, 58, W - 116, H - 116)

  // Угловые украшения
  const corner = (x: number, y: number, dx: number, dy: number) => {
    ctx.strokeStyle = goldLight
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x, y + dy * 46)
    ctx.lineTo(x, y)
    ctx.lineTo(x + dx * 46, y)
    ctx.stroke()
  }
  corner(72, 72, 1, 1)
  corner(W - 72, 72, -1, 1)
  corner(72, H - 72, 1, -1)
  corner(W - 72, H - 72, -1, -1)

  const cx = W / 2
  ctx.textAlign = 'center'

  // Мини-лого «БАЗА»
  ctx.fillStyle = gold
  ctx.font = '700 22px "Courier New", monospace'
  ctx.fillText('• БАЗА ЗНАНИЙ •', cx, 150)

  // Заголовок
  const titleGrad = ctx.createLinearGradient(cx - 300, 0, cx + 300, 0)
  titleGrad.addColorStop(0, gold)
  titleGrad.addColorStop(0.5, goldLight)
  titleGrad.addColorStop(1, gold)
  ctx.fillStyle = titleGrad
  ctx.font = '700 72px Georgia, "Times New Roman", serif'
  ctx.fillText('СЕРТИФИКАТ', cx, 258)

  ctx.fillStyle = 'rgba(243,227,163,0.85)'
  ctx.font = '400 24px Georgia, serif'
  ctx.fillText('о прохождении курса программирования', cx, 300)

  // Разделитель
  ctx.strokeStyle = 'rgba(212,175,55,0.6)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(cx - 140, 330); ctx.lineTo(cx + 140, 330); ctx.stroke()
  ctx.fillStyle = gold
  ctx.beginPath(); ctx.arc(cx, 330, 5, 0, Math.PI * 2); ctx.fill()

  // Подтверждаем
  ctx.fillStyle = 'rgba(230,230,235,0.8)'
  ctx.font = '400 26px Georgia, serif'
  ctx.fillText('Настоящим подтверждается, что пользователь', cx, 400)

  // Имя
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 56px Georgia, serif'
  const name = info.username.startsWith('@') ? info.username : '@' + info.username
  ctx.fillText(name, cx, 470)

  // Освоил
  ctx.fillStyle = 'rgba(230,230,235,0.8)'
  ctx.font = '400 26px Georgia, serif'
  ctx.fillText('успешно освоил(а) полный курс по направлению', cx, 528)

  // Язык
  ctx.fillStyle = goldLight
  ctx.font = '700 48px Georgia, serif'
  ctx.fillText(info.language, cx, 596)

  // Чипы модулей
  const chips = info.modules
  ctx.font = '600 20px Arial, sans-serif'
  const padX = 22, gap = 16, chipH = 44
  const widths = chips.map(c => ctx.measureText(c).width + padX * 2)
  const totalW = widths.reduce((a, b) => a + b, 0) + gap * (chips.length - 1)
  let x = cx - totalW / 2
  const chipY = 648
  chips.forEach((c, i) => {
    const w = widths[i]
    ctx.fillStyle = 'rgba(212,175,55,0.08)'
    ctx.strokeStyle = 'rgba(212,175,55,0.5)'
    ctx.lineWidth = 1.5
    const r = chipH / 2
    ctx.beginPath()
    ctx.moveTo(x + r, chipY)
    ctx.arcTo(x + w, chipY, x + w, chipY + chipH, r)
    ctx.arcTo(x + w, chipY + chipH, x, chipY + chipH, r)
    ctx.arcTo(x, chipY + chipH, x, chipY, r)
    ctx.arcTo(x, chipY, x + w, chipY, r)
    ctx.closePath()
    ctx.fill(); ctx.stroke()
    ctx.fillStyle = goldLight
    ctx.textBaseline = 'middle'
    ctx.fillText(c, x + w / 2, chipY + chipH / 2 + 1)
    ctx.textBaseline = 'alphabetic'
    x += w + gap
  })

  // Статистика
  ctx.fillStyle = 'rgba(200,200,210,0.7)'
  ctx.font = '400 20px Arial, sans-serif'
  ctx.fillText(`${info.lessons_total} уроков · ${info.tasks_total} практических задач`, cx, 742)

  // Печать (слева внизу)
  const sx = 310, sy = 838
  ctx.strokeStyle = gold
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(sx, sy, 58, 0, Math.PI * 2); ctx.stroke()
  ctx.strokeStyle = 'rgba(212,175,55,0.5)'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(sx, sy, 48, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = gold
  ctx.font = '700 34px Georgia, serif'
  ctx.textBaseline = 'middle'
  ctx.fillText('БЗ', sx, sy - 6)
  ctx.font = '600 11px Arial, sans-serif'
  ctx.fillText('ОФИЦИАЛЬНО', sx, sy + 24)
  ctx.textBaseline = 'alphabetic'

  // Дата и ID (справа внизу)
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(230,230,235,0.85)'
  ctx.font = '400 22px Georgia, serif'
  ctx.fillText('Дата выдачи: ' + info.date, W - 130, 828)
  ctx.strokeStyle = 'rgba(212,175,55,0.45)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(W - 360, 848); ctx.lineTo(W - 130, 848); ctx.stroke()
  ctx.fillStyle = 'rgba(180,180,190,0.6)'
  ctx.font = '400 16px "Courier New", monospace'
  ctx.fillText('ID: ' + info.cert_id, W - 130, 876)
  if (info.code) {
    ctx.fillStyle = 'rgba(212,175,55,0.7)'
    ctx.fillText('Код: ' + info.code, W - 130, 902)
  }
  // Центральная подпись о проверке подлинности
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(160,160,170,0.55)'
  ctx.font = '400 15px Arial, sans-serif'
  ctx.fillText('Подлинность проверяется в боте «База знаний» по ID и коду', cx, 940)
}

interface Props { parentId: number; language: string }

export default function Certificate({ parentId, language }: Props) {
  const [info, setInfo] = useState<CertInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [vr, setVr] = useState<import('../api/client').CertVerify | null>(null)
  const [vLoading, setVLoading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let alive = true
    api.certificate(parentId)
      .then(d => { if (alive) setInfo(d) })
      .catch(() => { if (alive) setInfo(null) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [parentId])

  useEffect(() => {
    if (open && info?.eligible && canvasRef.current) drawCertificate(canvasRef.current, info)
  }, [open, info])

  if (loading || !info) return null

  const pct = info.total > 0 ? Math.min(100, Math.round((info.done / info.total) * 100)) : 0

  // Не сдан — показываем прогресс к сертификату
  if (!info.eligible) {
    return (
      <div className="mx-4 mb-5 card-gold p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="gold-metal sheen w-10 h-10 rounded-[12px] grid place-items-center shrink-0">
            <Icon name="cert" size={19} accent="#3A2300" className="relative z-[1]" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[14.5px] font-semibold">Сертификат по «{language}»</div>
            <div className="text-[12.5px] leading-snug text-[#CDBB8E]">Пройдите все {info.total} уроков курса — и получите именной диплом.</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-[12px] mb-1.5 text-[#CDBB8E] tabular-nums">
          <span>Прогресс</span><span>{info.done} / {info.total}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden bg-white/[.08]">
          <div className="h-full rounded-full" style={{ width: pct + '%', background: 'linear-gradient(90deg,#C8861C,#FFE08A)' }} />
        </div>
      </div>
    )
  }

  const download = () => {
    const c = canvasRef.current
    if (!c) return
    try {
      const url = c.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `Sertifikat_${language}.png`
      document.body.appendChild(a); a.click(); a.remove()
    } catch { setMsg('Не удалось скачать. Попробуй «Получить в Telegram».') }
  }

  const sendToChat = async () => {
    const c = canvasRef.current
    if (!c) return
    setSending(true); setMsg(null)
    try {
      const data = c.toDataURL('image/png')
      const base64 = data.split(',')[1] || ''
      const r = await api.certificateSend(parentId, base64)
      if (r.ok) {
        setMsg('Сертификат отправлен вам в чат с ботом.')
        tg?.HapticFeedback?.notificationOccurred?.('success')
      } else {
        setMsg('Не удалось отправить: ' + (r.error || 'ошибка'))
      }
    } catch {
      setMsg('Ошибка отправки. Попробуй ещё раз.')
    } finally { setSending(false) }
  }

  const verifySelf = async () => {
    setVLoading(true); setVr(null)
    try {
      const r = await api.certificateVerify(info.cert_id)
      setVr(r)
    } catch {
      setVr({ valid: false, reason: 'error' })
    } finally { setVLoading(false) }
  }

  // Сдан — диплом доступен
  return (
    <div className="mx-4 mb-5 card-gold p-4">
      <div className="flex items-center gap-3">
        <span className="gold-metal sheen w-11 h-11 rounded-[13px] grid place-items-center shrink-0">
          <Icon name="trophy" size={21} accent="#3A2300" className="relative z-[1]" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-[14.5px] text-[#FFE7A8]">Курс пройден — диплом готов</div>
          <div className="text-[12.5px] leading-snug text-[#CDBB8E]">Все {info.total} уроков по «{language}» освоены. Заберите именной сертификат.</div>
        </div>
      </div>

      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-gold gold-metal sheen sheen-d1 mt-3.5 w-full !h-12 active:scale-[.99] transition-transform">
          <b className="!text-[14px]">Показать сертификат</b>
        </button>
      ) : (
        <div className="mt-3.5 flex flex-col gap-2.5">
          <div className="rounded-[14px] overflow-hidden border border-gold/30">
            <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
          <div className="flex gap-2">
            <button onClick={sendToChat} disabled={sending} className="btn-gold gold-metal flex-1 !h-11 !flex-row gap-1.5 disabled:opacity-50">
              <Icon name="send" size={15} accent="#3A2300" className="relative z-[1]" />
              <b className="!text-[13px]">{sending ? 'Отправляю…' : 'В Telegram'}</b>
            </button>
            <button onClick={download} className="btn-secondary flex-1">
              <Icon name="download" size={17} /> Скачать PNG
            </button>
          </div>
          {msg && <div className="text-[12.5px] leading-snug text-gold">{msg}</div>}
          <button onClick={verifySelf} disabled={vLoading} className="btn-secondary w-full disabled:opacity-50">
            <Icon name="seal" size={17} /> {vLoading ? 'Проверяю…' : 'Проверить подлинность'}
          </button>
          {vr && (
            vr.valid ? (
              <div className="rounded-[14px] p-3 text-[13px] leading-snug flex gap-2.5 bg-green/10 text-[#9FF0C6]">
                <Icon name="checkCircle" size={18} className="text-green shrink-0" accent="current" />
                <div>Сертификат подлинный. Владелец: <b className="text-fg">{vr.username}</b> · {vr.language} · {vr.date}. Код: {vr.code}.</div>
              </div>
            ) : (
              <div className="rounded-[14px] p-3 text-[13px] leading-snug flex gap-2.5 bg-[#FF6B6B]/10 text-[#FFB0B0]">
                <Icon name="warn" size={18} className="text-[#FF8A8A] shrink-0" accent="#FF8A8A" />
                <div>Не подтверждён ({vr.reason === 'not_found' ? 'нет в реестре — возможно, подделка' : vr.revoked ? 'отозван' : 'ошибка проверки'}).</div>
              </div>
            )
          )}
          <div className="text-[11px] text-center text-gray2 font-mono">ID: {info.cert_id}{info.code ? ' · код: ' + info.code : ''}</div>
        </div>
      )}
    </div>
  )
}
