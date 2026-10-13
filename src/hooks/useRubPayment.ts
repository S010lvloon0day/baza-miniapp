import { useEffect, useRef } from 'react'
import { api } from '../api/client'

/**
 * Ждём подтверждения рублёвой оплаты (SecretPay, СБП).
 * Сервер узнаёт об оплате из вебхука, а если он задержался — сам сверяет статус;
 * здесь мы только спрашиваем наш API: раз в 4 с (до 10 мин) и сразу при возврате в мини-апп.
 */
export function useRubPayment(txId: string | null, onDone: (status: 'paid' | 'failed') => void) {
  const cb = useRef(onDone)
  useEffect(() => { cb.current = onDone }, [onDone])

  useEffect(() => {
    if (!txId) return
    let stopped = false
    let attempts = 0
    const check = async () => {
      if (stopped) return
      try {
        const r = await api.rubStatus(txId)
        if (stopped) return
        if (r.status === 'paid' || r.status === 'failed' || r.status === 'cancelled') {
          stopped = true
          cb.current(r.status === 'paid' ? 'paid' : 'failed')
        }
      } catch { /* сеть — попробуем на следующем тике */ }
    }
    const id = window.setInterval(() => {
      if (++attempts > 150 || stopped) { window.clearInterval(id); return }
      check()
    }, 4000)
    const onFocus = () => { check() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      stopped = true
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [txId])
}

export const fmtRub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`
