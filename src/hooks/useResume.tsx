import { useEffect, useState } from 'react'
import { api, watchSave } from '../api/client'

/** 75 → «1:15», 3725 → «1:02:05». */
export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export interface Resume {
  /** С какой секунды продолжили; null — смотрим с начала. */
  resumedAt: number | null
  restart: () => void
}

/**
 * «Продолжить с того места»: при открытии видео перематывает на сохранённую
 * позицию, пока смотрят — сохраняет её на сервер (раз в ~10 с, на паузе,
 * при закрытии). Позиция хранится на сервере, поэтому работает с любого
 * устройства, и из неё же строится блок «Продолжить просмотр» на главной.
 *
 * attachmentId = 0 — основное видео материала, иначе id вложения.
 */
export function useResume(el: HTMLVideoElement | null, materialId: number, attachmentId: number): Resume {
  const [resumedAt, setResumedAt] = useState<number | null>(null)

  useEffect(() => {
    if (!el) return
    let cancelled = false
    let saved = 0
    let fetched = false
    let applied = false
    let lastSent = -1

    const apply = () => {
      if (applied || !fetched) return
      const d = el.duration
      if (!d || !isFinite(d)) return
      applied = true
      // Почти досмотренное или едва начатое — начинаем с начала.
      if (saved > 10 && saved < d - 15) {
        el.currentTime = saved
        setResumedAt(saved)
      }
    }

    api.watchGet(materialId)
      .then(r => {
        if (cancelled) return
        saved = r.items?.[String(attachmentId)]?.position ?? 0
        fetched = true
        apply()
      })
      .catch(() => { fetched = true; apply() })

    const save = (force: boolean) => {
      const t = Math.floor(el.currentTime || 0)
      const d = isFinite(el.duration) ? Math.floor(el.duration) : 0
      // Пока сохранённую позицию не применили, не затираем её нулём.
      if (!applied) return
      if (!force && Math.abs(t - lastSent) < 10) return
      if (t === lastSent) return
      lastSent = t
      watchSave({ material_id: materialId, attachment_id: attachmentId, position: t, duration: d })
    }

    // Ссылка на поток живёт 2–3 ч. Если видео стояло на паузе дольше, следующий
    // запрос даст 403 и плеер упадёт с ошибкой. Тогда тихо перезапрашиваем ссылку
    // (src с новым параметром → /api/media выдаст свежий редирект) и продолжаем
    // с того же места. Не чаще 3 раз в минуту, чтобы не зациклиться.
    let recoverAt: number[] = []
    let pendingSeek: { t: number; play: boolean } | null = null
    const onError = () => {
      const now = Date.now()
      recoverAt = recoverAt.filter(x => now - x < 60000)
      if (recoverAt.length >= 3) return
      recoverAt.push(now)
      const src = el.currentSrc || el.src
      if (!src) return
      pendingSeek = { t: el.currentTime || 0, play: !el.paused || el.readyState < 3 }
      const u = new URL(src, window.location.href)
      u.searchParams.set('_r', String(now))
      el.src = u.toString()
      el.load()
    }
    const onMeta = () => {
      apply()
      if (pendingSeek) {
        const { t, play } = pendingSeek
        pendingSeek = null
        if (t > 0) el.currentTime = t
        if (play) el.play().catch(() => {})
      }
    }
    const onTime = () => save(false)
    const onPause = () => save(true)
    const onHide = () => save(true)

    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('error', onError)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onPause)
    window.addEventListener('pagehide', onHide)
    if (el.readyState >= 1) apply()

    return () => {
      cancelled = true
      save(true)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('error', onError)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onPause)
      window.removeEventListener('pagehide', onHide)
    }
  }, [el, materialId, attachmentId])

  return {
    resumedAt,
    restart: () => {
      if (!el) return
      el.currentTime = 0
      setResumedAt(null)
      el.play().catch(() => {})
    },
  }
}

export function ResumeHint({ resume }: { resume: Resume }) {
  if (resume.resumedAt == null) return null
  return (
    <div className="flex items-center justify-between text-[11px] text-gray px-1">
      <span>▶ Продолжаем с {fmtTime(resume.resumedAt)}</span>
      <button onClick={resume.restart} className="text-green font-semibold active:opacity-70">
        С начала
      </button>
    </div>
  )
}
