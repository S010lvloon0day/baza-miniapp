const KEY = 'rv'
const MAX = 30

export interface RecentItem {
  id: number
  title: string
  media_type: string
  section_id: number
  viewed_at: number
}

export function getRecentlyViewed(): RecentItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function addRecentlyViewed(m: { id: number; title: string; media_type: string; section_id: number }) {
  const list = getRecentlyViewed().filter(x => x.id !== m.id)
  list.unshift({ ...m, viewed_at: Date.now() })
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
}

export function clearRecentlyViewed() {
  localStorage.removeItem(KEY)
}
