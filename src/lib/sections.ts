// Which part of the Today screen an assignment belongs in.
// Tested in sections.test.ts. Run with: npm test

import { addDays, isSameDay, startOfDay } from './dates.ts'

export type Section = 'overdue' | 'today' | 'week' | 'later'

// The rules, checked in order (the first one that matches wins):
// 1. 'overdue': the due time has already passed.
// 2. 'today':   still to come, and due on the same calendar day as now.
// 3. 'week':    due before midnight at the start of the day 7 days from today.
// 4. 'later':   everything else.
export function sectionFor(due: Date, now: Date): Section {
  if (due < now) return 'overdue'
  if (isSameDay(due, now)) return 'today'
  const weekEnd = addDays(startOfDay(now), 7)
  if (due < weekEnd) return 'week'
  return 'later'
}
