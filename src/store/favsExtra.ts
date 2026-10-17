import { api } from '../api/client'
import { coursesApi } from '../api/courses'

/** Избранное для целых разделов и курсов (в отличие от bookmarks.ts — там материалы).
 *  Кэш в localStorage для мгновенного отклика, правда — на сервере. */

export const SEC_KEY = 'fav_sec'
export const CRS_KEY = 'fav_crs'

function read(key: string): number[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function write(key: string, v: number[]) {
  localStorage.setItem(key, JSON.stringify(v))
}
function addLocal(key: string, id: number) {
  const a = read(key)
  if (!a.includes(id)) { a.push(id); write(key, a) }
}
function removeLocal(key: string, id: number) {
  write(key, read(key).filter(x => x !== id))
}

export function isSectionFav(id: number): boolean { return read(SEC_KEY).includes(id) }
export function isCourseFav(id: number): boolean { return read(CRS_KEY).includes(id) }

/** Обновить кэш id из ответа /api/favorites. */
export function cacheFavIds(sectionIds: number[], courseIds: number[]) {
  write(SEC_KEY, sectionIds)
  write(CRS_KEY, courseIds)
}

/** Переключить избранное раздела. Возвращает новое состояние (true — в избранном). */
export async function toggleSectionFav(id: number): Promise<boolean> {
  const was = isSectionFav(id)
  if (was) {
    removeLocal(SEC_KEY, id)
    try { await api.removeSectionFavorite(id) } catch { addLocal(SEC_KEY, id) }
  } else {
    addLocal(SEC_KEY, id)
    try { await api.addSectionFavorite(id) } catch { removeLocal(SEC_KEY, id) }
  }
  return !was
}

/** Переключить избранное курса. Возвращает новое состояние (true — в избранном). */
export async function toggleCourseFav(id: number): Promise<boolean> {
  const was = isCourseFav(id)
  if (was) {
    removeLocal(CRS_KEY, id)
    try { await coursesApi.removeFavorite(id) } catch { addLocal(CRS_KEY, id) }
  } else {
    addLocal(CRS_KEY, id)
    try { await coursesApi.addFavorite(id) } catch { removeLocal(CRS_KEY, id) }
  }
  return !was
}
