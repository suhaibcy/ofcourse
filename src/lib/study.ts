// Study-session suggestions: for an upcoming exam, suggest studying on each
// of the 3 days before it (skipping days that have already passed).

import { addDays, startOfDay } from './dates'

export const STUDY_DAYS_BEFORE = 3

export function suggestedStudyDays(examDue: Date, now: Date): Date[] {
  const today = startOfDay(now)
  const examDay = startOfDay(examDue)
  const days: Date[] = []
  for (let before = STUDY_DAYS_BEFORE; before >= 1; before--) {
    const day = addDays(examDay, -before)
    if (day >= today) days.push(day)
  }
  return days
}
