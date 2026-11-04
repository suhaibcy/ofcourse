import { createContext, useContext } from 'react'
import type { Assignment } from '../data/sampleAssignments'
import type { Course } from '../data/sampleClasses'
import type { ClassGrades, PastSemester } from '../lib/grades'
import type { ConnectResult } from './useCanvasFeed'

// The student's own to-dos that Canvas doesn't know about. A study session
// is a task linked to an exam (it has an assignmentId).
export type Task = {
  id: string
  title: string
  date: string // day key, e.g. "2026-10-13"
  time?: string // optional "14:00"
  done: boolean
  assignmentId?: string // set for study sessions: the exam it's for
}

// A note is a list of lines, like iOS Notes. The first line is the title.
export type NoteLine = {
  id: string
  text: string
  checklist: boolean // shows a checkbox in front of the line
  checked: boolean
}

export type Note = {
  id: string
  folder: string // "general" or a Course id
  lines: NoteLine[]
  updatedAt: number
}

export type AppData = {
  name: string
  setName: (name: string) => void
  classes: Course[]
  setClasses: (classes: Course[]) => void
  courseById: (id: string) => Course | undefined
  assignments: Assignment[]
  feedLive: boolean // true when the assignments come from the real Canvas feed, false for samples
  feedUpdatedAt: number | null // when the feed was last downloaded (ms since 1970)
  feedRefreshing: boolean
  refreshFeed: () => Promise<void>
  connectFeed: (link: string) => Promise<ConnectResult> // onboarding: try a pasted feed link
  onboarded: boolean
  finishOnboarding: () => void
  isDone: (assignmentId: string) => boolean
  setDone: (assignmentId: string, done: boolean) => void
  plans: Record<string, string> // assignment id -> day key it's planned for
  planAssignment: (assignmentId: string, dateKey: string | null) => void
  tasks: Task[]
  addTask: (task: Omit<Task, 'id' | 'done'>) => void
  setTaskDone: (taskId: string, done: boolean) => void
  moveTask: (taskId: string, dateKey: string) => void
  deleteTask: (taskId: string) => void
  skippedExams: string[] // exams whose study-session suggestion was dismissed
  skipExam: (assignmentId: string) => void
  notes: Note[]
  saveNote: (note: Note) => void
  deleteNote: (noteId: string) => void
  grades: Record<string, ClassGrades> // class id -> its categories and scores
  gradesFor: (courseId: string) => ClassGrades // a class with nothing set up gets an empty one
  saveClassGrades: (courseId: string, grades: ClassGrades) => void
  pastSemesters: PastSemester[]
  setPastSemesters: (semesters: PastSemester[]) => void
  resetAll: () => void
}

export const AppDataContext = createContext<AppData | null>(null)

// Any screen calls useAppData() to read or change the shared data.
export function useAppData(): AppData {
  const data = useContext(AppDataContext)
  if (!data) throw new Error('useAppData must be used inside AppDataProvider')
  return data
}
