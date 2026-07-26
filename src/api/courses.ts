import { API_BASE } from './client'

const tg = (window as any).Telegram?.WebApp

const headers = (): HeadersInit => ({
  'X-Init-Data': tg?.initData || '',
  'Content-Type': 'application/json',
})

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(API_BASE + path, {
    method,
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let code = `HTTP ${res.status}`
    try {
      const data = await res.json()
      if (data?.error) code = data.error
    } catch { /* тело не JSON — оставляем код статуса */ }
    throw new CourseApiError(code, res.status)
  }
  return res.json()
}

export class CourseApiError extends Error {
  code: string
  status: number

  constructor(code: string, status: number) {
    super(code)
    this.name = 'CourseApiError'
    this.code = code
    this.status = status
  }
}

export type CourseIconKey = 'book' | 'search' | 'shield' | 'mask' | 'unlock' | 'users'
export type LessonType = 'text' | 'video' | 'image'
export type CourseLevel = 'Новичок' | 'Средний' | 'Продвинутый'

export const COURSE_LEVELS: CourseLevel[] = ['Новичок', 'Средний', 'Продвинутый']
export const COURSE_ICONS: CourseIconKey[] = ['book', 'search', 'shield', 'mask', 'unlock', 'users']

export interface CourseSummary {
  id: number
  section_id: number
  title: string
  description: string
  level: CourseLevel
  icon: CourseIconKey
  price: number
  is_active: number
  position: number
  chapters_count: number
  steps_count: number
  steps_solved: number
  percent: number
  status_label: string
  owned: boolean
  locked: boolean
  rating: number
  reviews_count: number
}

export interface CourseReview {
  rating: number
  text: string
  author: string
  created_at: string
  mine: boolean
}

export interface ReviewsResponse {
  reviews: CourseReview[]
  rating: number
  reviews_count: number
  can_review: boolean
  my_review: { rating: number; text: string; author: string; created_at: string } | null
}

export interface CourseLesson {
  id: number
  type: LessonType
  title: string
  content: string
  media_url: string
}

/** В оглавлении курса текст урока не передаётся — его отдаёт lessonContent(). */
export interface LessonStep {
  kind: 'lesson'
  id: number
  type: LessonType
  title: string
  has_media?: boolean
  solved: boolean
  attempts: number
}

export interface QuestionStep {
  kind: 'question'
  id: number
  text: string
  multi: boolean
  options: QuizOption[]
  solved: boolean
  attempts: number
}

export type CourseStep = LessonStep | QuestionStep

export interface CourseChapter {
  id: number
  title: string
  icon: CourseIconKey
  is_exam: boolean
  steps_count: number
  solved_count: number
  steps: CourseStep[]
}

export interface CourseDetail {
  id: number
  section_id: number
  title: string
  description: string
  level: CourseLevel
  icon: CourseIconKey
  price: number
  owned: boolean
  locked: boolean
  percent: number
  completed: boolean
  steps_count: number
  steps_solved: number
  rating: number
  reviews_count: number
  chapters: CourseChapter[]
}

export interface QuizOption {
  id: number
  text: string
}

export interface QuizQuestion {
  id: number
  text: string
  multi: boolean
  options: QuizOption[]
}

export interface CourseStats {
  started: number
  finished: number
  enrolled: number
}

export interface AdminCourseSummary extends Omit<CourseSummary, 'percent' | 'status_label' | 'owned' | 'locked'> {
  stats: CourseStats
}

export interface AdminOption {
  id: number
  text: string
  correct: boolean
}

export interface AdminQuestion {
  id: number
  text: string
  multi: boolean
  options: AdminOption[]
}

export type AdminStep =
  | ({ kind: 'lesson' } & CourseLesson)
  | ({ kind: 'question' } & AdminQuestion)

export interface AdminChapter {
  id: number
  title: string
  icon: CourseIconKey
  steps: AdminStep[]
}

export interface AdminCourse {
  id: number
  section_id: number
  title: string
  description: string
  level: CourseLevel
  icon: CourseIconKey
  price: number
  is_active: number
  position: number
  chapters: AdminChapter[]
  final_exam: AdminQuestion[]
}

export interface AdminSection {
  id: number
  title: string
  emoji: string
  parent_title: string | null
}

export const coursesApi = {
  list: (sectionId?: number) =>
    request<{ courses: CourseSummary[] }>(
      'GET',
      sectionId === undefined ? '/api/courses' : `/api/courses?section_id=${sectionId}`,
    ),

  detail: (courseId: number) => request<CourseDetail>('GET', `/api/courses/${courseId}`),

  submitStep: (courseId: number, questionId: number, optionIds: number[]) =>
    request<{ correct: boolean; correct_option_ids: number[]; percent: number; completed: boolean }>(
      'POST',
      `/api/courses/${courseId}/steps/${questionId}/submit`,
      { option_ids: optionIds },
    ),

  lessonContent: (courseId: number, lessonId: number) =>
    request<CourseLesson & { kind: 'lesson' }>('GET', `/api/courses/${courseId}/lessons/${lessonId}`),

  viewLesson: (courseId: number, lessonId: number) =>
    request<{ ok: boolean; percent: number }>(
      'POST',
      `/api/courses/${courseId}/lessons/${lessonId}/view`,
    ),

  invoice: (courseId: number) =>
    request<{ pay_url: string; invoice_id: string; course_id: number; price: number }>(
      'POST',
      `/api/courses/${courseId}/invoice`,
    ),

  confirm: (invoiceId: string) =>
    request<{ ok?: boolean; status?: string; course_id?: number }>(
      'POST',
      '/api/courses/confirm',
      { invoice_id: invoiceId },
    ),

  reviews: (courseId: number) => request<ReviewsResponse>('GET', `/api/courses/${courseId}/reviews`),

  submitReview: (courseId: number, rating: number, text: string) =>
    request<{ ok: boolean; rating: number; reviews: number }>(
      'POST',
      `/api/courses/${courseId}/reviews`,
      { rating, text },
    ),

  deleteReview: (courseId: number) =>
    request<{ ok: boolean }>('DELETE', `/api/courses/${courseId}/reviews`),

  adminList: () => request<{ courses: AdminCourseSummary[] }>('GET', '/api/admin/courses'),
  adminGet: (courseId: number) => request<AdminCourse>('GET', `/api/admin/courses/${courseId}`),
  adminSave: (payload: unknown) =>
    request<{ ok: boolean; course: AdminCourse }>('POST', '/api/admin/courses', payload),
  adminDelete: (courseId: number) =>
    request<{ ok: boolean }>('DELETE', `/api/admin/courses/${courseId}`),
  adminSections: () => request<{ sections: AdminSection[] }>('GET', '/api/admin/sections'),
}
