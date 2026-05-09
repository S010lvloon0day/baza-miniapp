import { api } from '../api/client'

const KEY = 'bm'

export function getBookmarks(): number[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function saveBookmark(id: number) {
  const bm = getBookmarks()
  if (!bm.includes(id)) { bm.push(id); localStorage.setItem(KEY, JSON.stringify(bm)) }
}

export function removeBookmark(id: number) {
  const bm = getBookmarks().filter(x => x !== id)
  localStorage.setItem(KEY, JSON.stringify(bm))
}

export function isBookmarked(id: number): boolean {
  return getBookmarks().includes(id)
}

export async function syncBookmarks(): Promise<number[]> {
  try {
    const data = await api.favorites()
    localStorage.setItem(KEY, JSON.stringify(data.ids))
    return data.ids
  } catch {
    return getBookmarks()
  }
}

export async function saveBookmarkRemote(id: number) {
  saveBookmark(id)
  try { await api.addFavorite(id) } catch { removeBookmark(id) }
}

export async function removeBookmarkRemote(id: number) {
  removeBookmark(id)
  try { await api.removeFavorite(id) } catch { saveBookmark(id) }
}
