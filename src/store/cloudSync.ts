// Синхронизация мелких настроек между устройствами через Telegram CloudStorage.
// При запуске облако → устройство; дальше изменения с устройства уходят в облако.
const KEYS = ['mat_sort', 'search_history', 'lib_sub']
const tg = (window as any).Telegram?.WebApp

export function startCloudSync() {
  const cs = tg?.CloudStorage
  if (!cs || tg?.isVersionAtLeast?.('6.9') !== true) return
  const snap: Record<string, string> = {}
  const push = () => {
    for (const k of KEYS) {
      let v = ''
      try { v = localStorage.getItem(k) || '' } catch { /* */ }
      if (v !== (snap[k] ?? '') && v.length <= 4000) {
        snap[k] = v
        try { v ? cs.setItem(k, v) : cs.removeItem(k) } catch { /* */ }
      }
    }
  }
  try {
    cs.getItems(KEYS, (err: unknown, vals: Record<string, string>) => {
      if (!err && vals) {
        for (const k of KEYS) {
          const v = vals[k] || ''
          snap[k] = v
          try { if (v && localStorage.getItem(k) !== v) localStorage.setItem(k, v) } catch { /* */ }
        }
      }
      window.setInterval(push, 20000)
      document.addEventListener('visibilitychange', () => { if (document.hidden) push() })
    })
  } catch { /* */ }
}
