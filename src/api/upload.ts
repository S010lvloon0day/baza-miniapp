import { API_BASE } from './client'

const tg = (window as any).Telegram?.WebApp

export interface UploadedFile {
  kind: 'photo' | 'video' | 'document'
  file_id: string
  channel_message_id: number
  name: string
  size: number
}

export interface AdminSection {
  id: number
  title: string
  emoji: string
  /** Полный путь вида «📁 Раздел › 📂 Подраздел» — чтобы не путать одноимённые. */
  path: string
}

/** Черновик вложения в редакторе: файл либо текстовый блок. */
export type DraftAttachment =
  | { uid: string; kind: 'text'; text: string }
  | {
      uid: string
      kind: 'photo' | 'video' | 'document'
      name: string
      size: number
      caption: string
      status: 'pending' | 'uploading' | 'done' | 'error'
      progress: number
      error?: string
      file?: File
      file_id?: string
      channel_message_id?: number
    }

function headers(): Record<string, string> {
  return { 'X-Init-Data': tg?.initData || '' }
}

/**
 * Отправка файла на сервер с прогрессом.
 *
 * Здесь XMLHttpRequest, а не fetch, намеренно: fetch не сообщает прогресс
 * ОТПРАВКИ, а на мобильном интернете загрузка видео без индикатора выглядит
 * как зависшее приложение.
 */
export function uploadFile(
  file: File,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file, file.name)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/api/admin/upload`)
    for (const [k, v] of Object.entries(headers())) xhr.setRequestHeader(k, v)

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      let body: any = null
      try { body = JSON.parse(xhr.responseText) } catch { /* тело неJSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && body?.file_id) {
        resolve(body as UploadedFile)
      } else {
        reject(new Error(body?.message || body?.error || `HTTP ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new Error('Сеть недоступна'))
    xhr.onabort = () => reject(new Error('Отменено'))
    signal?.addEventListener('abort', () => xhr.abort())
    xhr.send(form)
  })
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`)
  return data as T
}

export const uploadApi = {
  sections: async (): Promise<AdminSection[]> => {
    const res = await fetch(`${API_BASE}/api/admin/all_sections`, { headers: headers() })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data.sections as AdminSection[]
  },
  createMaterial: (payload: {
    section_id: number
    title: string
    content: string
    is_premium: boolean
    attachments: Array<Record<string, unknown>>
  }) => post<{ ok: boolean; id: number; attachments: number; failed: string[] }>(
    '/api/admin/materials', payload),
}
