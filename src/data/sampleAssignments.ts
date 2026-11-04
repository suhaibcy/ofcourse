// Made-up assignments for building the screens before the real Canvas feed
// is connected (build plan Step 5). Nothing here comes from a real account.
// Due dates are set relative to today, so the samples always look current.

import { addDays, startOfDay } from '../lib/dates.ts'

export type Assignment = {
  id: string // the feed's UID, e.g. "event-assignment-420587", so it stays the same every refresh
  courseId: string // matches a Course id
  title: string
  due: Date
  kind: 'assignment' | 'quiz' | 'exam'
}

// A date `days` from today at a given time, e.g. at(2, '09:00').
function at(days: number, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const date = addDays(startOfDay(new Date()), days)
  date.setHours(hours, minutes)
  return date
}

export const sampleAssignments: Assignment[] = [
  { id: 'math-hw7', courseId: 'math180', title: 'Homework 7', due: at(-1, '23:59'), kind: 'assignment' },
  { id: 'cs-lab5', courseId: 'cs111', title: 'Lab 5 quiz', due: at(0, '23:59'), kind: 'quiz' },
  { id: 'econ-ps4', courseId: 'econ120', title: 'Problem set 4', due: at(2, '09:00'), kind: 'assignment' },
  { id: 'psch-quiz6', courseId: 'psch100', title: 'Ch. 6 reading quiz', due: at(3, '15:30'), kind: 'quiz' },
  { id: 'psch-mid', courseId: 'psch100', title: 'Midterm exam', due: at(4, '10:00'), kind: 'exam' },
  { id: 'cs-proj2', courseId: 'cs111', title: 'Project 2', due: at(5, '23:59'), kind: 'assignment' },
  { id: 'math-hw8', courseId: 'math180', title: 'Homework 8', due: at(9, '23:59'), kind: 'assignment' },
  { id: 'econ-essay', courseId: 'econ120', title: 'Market structure essay', due: at(13, '23:59'), kind: 'assignment' },
]

// Sample assignments that start out checked off.
export const sampleDoneIds = ['cs-proj2']
