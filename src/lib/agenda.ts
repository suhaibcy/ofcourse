// Builds the list of everything happening on one day, in time order:
// class meetings, things due, planned work, and the student's own tasks.
// Used by both the Planner (week) and the Calendar (month).

import type { Assignment } from '../data/sampleAssignments'
import type { Course } from '../data/sampleClasses'
import type { Task } from '../state/appDataContext'
import { clockOf, isSameDay, toDateKey } from './dates'

export type AgendaItem =
  | { type: 'class'; key: string; time: string; endTime: string; course: Course; place?: string }
  | { type: 'due'; key: string; time: string; assignment: Assignment; course?: Course }
  | { type: 'plan'; key: string; time?: string; assignment: Assignment; course?: Course }
  | { type: 'task'; key: string; time?: string; task: Task }

type Sources = {
  classes: Course[]
  assignments: Assignment[]
  plans: Record<string, string>
  tasks: Task[]
}

export function itemsForDay(day: Date, { classes, assignments, plans, tasks }: Sources): AgendaItem[] {
  const dayKey = toDateKey(day)
  const courseOf = (id: string) => classes.find((c) => c.id === id)
  const items: AgendaItem[] = []

  for (const course of classes) {
    course.meetings.forEach((meeting, index) => {
      if (meeting.days.includes(day.getDay())) {
        items.push({ type: 'class', key: `class-${course.id}-${index}`, time: meeting.start,
          endTime: meeting.end, course, place: meeting.place })
      }
    })
  }

  for (const assignment of assignments) {
    if (isSameDay(assignment.due, day)) {
      items.push({ type: 'due', key: `due-${assignment.id}`, time: clockOf(assignment.due),
        assignment, course: courseOf(assignment.courseId) })
    }
    if (plans[assignment.id] === dayKey) {
      items.push({ type: 'plan', key: `plan-${assignment.id}`, assignment, course: courseOf(assignment.courseId) })
    }
  }

  for (const task of tasks) {
    if (task.date === dayKey) items.push({ type: 'task', key: `task-${task.id}`, time: task.time, task })
  }

  // Timed items first, earliest to latest; untimed plans and tasks at the end.
  return items.sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time)
    if (a.time) return -1
    if (b.time) return 1
    return 0
  })
}
