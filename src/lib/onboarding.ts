// Logic for onboarding's "Plan your first 3" step. Screen-free on purpose,
// so it's easy to test (onboarding.test.ts) and to reuse in an App Store
// version later (decision #20).

import type { Assignment } from '../data/sampleAssignments.ts'
import { addDays, startOfDay } from './dates.ts'

// The soonest unfinished assignments that are still to come.
export function firstToPlan(
  assignments: Assignment[],
  isDone: (id: string) => boolean,
  now: Date,
  count = 3,
): Assignment[] {
  return assignments
    .filter((a) => a.due > now && !isDone(a.id))
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .slice(0, count)
}

// The days you could work on something: today up to the day it's due,
// at most `max` of them. Something due today (or late) only offers today.
export function dayChoices(due: Date, now: Date, max = 3): Date[] {
  const today = startOfDay(now)
  const dueDay = startOfDay(due)
  const days: Date[] = []
  for (let day = today; day <= dueDay && days.length < max; day = addDays(day, 1)) days.push(day)
  return days.length > 0 ? days : [today]
}
