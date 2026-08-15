import { API_BASE } from './client'

const tg = (window as any).Telegram?.WebApp

export interface SubmitStatus {
  allowed: boolean
  reason?: string | null
  message?: string | null
  used_today: number
  daily_limit: number
  files_max: number
  title_max: number
  content_max: number
}

export interface SubmitFile {
  kind: 'photo' | 'video' | 'document'
  file_id: string
  channel_message_id: number
  name: string
  size: number
}

function headers(): Record<string, string> {
  return { 'X-Init-Data': tg?.initData || '' }
}

/** Отправка файла с прогрессом. fetch не сообщает прогресс отправки — только XHR. */
export function uploadSubmitFile(
  file: File,
  onProgress: (percent: number) => void,
): Promise<SubmitFile> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file, file.name)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/api/submit/upload`)
    for (const [k, v] of Object.entries(headers())) xhr.setRequestHeader(k, v)

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      let body: any = null
      try { body = JSON.parse(xhr.responseText) } catch { /* тело неJSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && body?.file_id) resolve(body as SubmitFile)
      else reject(new Error(body?.message || body?.error || `HTTP ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Сеть недоступна'))
    xhr.send(form)
  })
}

export const submitApi = {
  status: async (): Promise<SubmitStatus> => {
    const res = await fetch(`${API_BASE}/api/submit/status`, { headers: headers() })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  create: async (payload: {
    section_id: number
    title: string
    content: string
    files: SubmitFile[]
  }): Promise<{ ok: boolean; id: number }> => {
    const res = await fetch(`${API_BASE}/api/submit`, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`)
    return data
  },
}
