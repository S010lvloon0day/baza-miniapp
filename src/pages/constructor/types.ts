import type { CourseIconKey, CourseLevel, LessonType } from '../../api/courses'

/** id новых записей — строка `new_*`; бэкенд считает нечисловой id признаком вставки. */
export type DraftId = number | string

export interface DraftOption {
  id: DraftId
  text: string
  correct: boolean
}

export interface DraftQuestion {
  id: DraftId
  text: string
  multi: boolean
  options: DraftOption[]
}

export interface DraftLesson {
  kind: 'lesson'
  id: DraftId
  type: LessonType
  title: string
  content: string
  media_url: string
}

/** Шаг главы: теория или задача — порядок в массиве и есть порядок прохождения. */
export type DraftStep = DraftLesson | (DraftQuestion & { kind: 'question' })

export interface DraftChapter {
  id: DraftId
  title: string
  icon: CourseIconKey
  steps: DraftStep[]
  expanded: boolean
}

export interface DraftCourse {
  id: number | null
  section_id: number
  title: string
  description: string
  level: CourseLevel
  icon: CourseIconKey
  price: number
  is_active: number
  chapters: DraftChapter[]
  final_exam: DraftQuestion[]
}

let counter = 0
export function newId(prefix: string): string {
  counter += 1
  return `new_${prefix}_${counter}`
}

export function emptyOption(): DraftOption {
  return { id: newId('opt'), text: '', correct: false }
}

export function emptyQuestion(): DraftQuestion {
  return { id: newId('q'), text: '', multi: false, options: [emptyOption(), emptyOption()] }
}

export function emptyQuestionStep(): DraftStep {
  return { kind: 'question', ...emptyQuestion() }
}

export function emptyLesson(): DraftLesson {
  return { kind: 'lesson', id: newId('les'), type: 'text', title: '', content: '', media_url: '' }
}

export function emptyChapter(): DraftChapter {
  return { id: newId('ch'), title: '', icon: 'book', steps: [emptyLesson(), emptyQuestionStep()], expanded: true }
}

export function emptyCourse(sectionId: number): DraftCourse {
  return {
    id: null,
    section_id: sectionId,
    title: '',
    description: '',
    level: 'Новичок',
    icon: 'book',
    price: 0,
    is_active: 1,
    chapters: [emptyChapter()],
    final_exam: [emptyQuestion()],
  }
}
