import { addDays, fromDateKey, toDateKey } from './dates.ts'

// Plain code builds the schedule, so dates are always real and it can be tested.
// The AI's part is finding the exam date and the concepts in the coursework.
export type StudySession = { date: string; title: string; minutes: number }

export const MAX_STUDY_DAYS = 7

// One session a day leading up to the exam, weakest topics first. The last day is
// always a full review. No days left means an empty plan.
export function buildStudyPlan(examDate: string, today: string, topics: string[], minutes: number): StudySession[] {
  const exam = fromDateKey(examDate)
  const start = fromDateKey(today)
  const daysLeft = Math.round((exam.getTime() - start.getTime()) / 86_400_000)
  if (daysLeft < 1) return []
  const count = Math.min(daysLeft, MAX_STUDY_DAYS)
  const firstDay = addDays(exam, -count)
  return Array.from({ length: count }, (_, i) => {
    const date = toDateKey(addDays(firstDay, i))
    if (i === count - 1) return { date, title: 'Review: take the course challenge', minutes }
    const title = topics.length > 0 ? `Study: ${topics[i % topics.length]}` : 'Study session'
    return { date, title, minutes }
  })
}
