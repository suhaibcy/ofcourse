// Grade math: a class's grade from weighted categories, its letter, the GPA,
// and "what do I need on the final?". Pure functions (no React, no storage),
// so they're easy to test: see grades.test.ts.

// One score, e.g. "Quiz 3: 9 out of 10".
export type GradeItem = {
  id: string
  name: string
  earned: number
  possible: number
  whatIf: boolean // a pretend score to see "what if I got this?"; not part of the real grade
}

// A slice of the grade from the syllabus, e.g. "Homework, 20%".
export type GradeCategory = {
  id: string
  name: string
  weight: number // percent of the class grade, 0-100
  items: GradeItem[]
}

// The lowest percent that still earns each letter. Below D is an F.
export type Cutoffs = { A: number; B: number; C: number; D: number }

export type ClassGrades = {
  credits: number // credit hours, used for GPA
  cutoffs: Cutoffs
  categories: GradeCategory[]
}

// A finished semester, typed in from the transcript.
export type PastSemester = {
  id: string
  name: string // "Fall 2026"
  credits: number
  gpa: number
}

export type Letter = 'A' | 'B' | 'C' | 'D' | 'F'

export const DEFAULT_CUTOFFS: Cutoffs = { A: 90, B: 80, C: 70, D: 60 }

const POINTS: Record<Letter, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 }

// The percent for one category: points earned / points possible, as 0-100.
// null if nothing in it is graded yet.
export function categoryPercent(category: GradeCategory, includeWhatIf = false): number | null {
  const counted = category.items.filter((item) => includeWhatIf || !item.whatIf)
  const possible = counted.reduce((sum, item) => sum + item.possible, 0)
  if (possible <= 0) return null
  const earned = counted.reduce((sum, item) => sum + item.earned, 0)
  return (earned / possible) * 100
}

// The class grade, 0-100. Categories with no scores yet are left out and the
// rest are scaled up to fill 100%, the way Canvas shows a "current" grade.
// Example: Homework 20% at 90 and Exams 80% at 70, nothing else graded:
// (20 * 90 + 80 * 70) / (20 + 80) = 74.
export function classPercent(categories: GradeCategory[], includeWhatIf = false): number | null {
  let weighted = 0
  let usedWeight = 0
  for (const category of categories) {
    const percent = categoryPercent(category, includeWhatIf)
    if (percent === null || category.weight <= 0) continue
    weighted += category.weight * percent
    usedWeight += category.weight
  }
  return usedWeight > 0 ? weighted / usedWeight : null
}

export function letterFor(percent: number, cutoffs: Cutoffs = DEFAULT_CUTOFFS): Letter {
  if (percent >= cutoffs.A) return 'A'
  if (percent >= cutoffs.B) return 'B'
  if (percent >= cutoffs.C) return 'C'
  if (percent >= cutoffs.D) return 'D'
  return 'F'
}

// 86.27 -> "86.3%"
export function formatPercent(percent: number): string {
  return `${percent.toFixed(1)}%`
}

export function gradePoints(letter: Letter): number {
  return POINTS[letter]
}

// GPA weighted by credit hours: a 4-credit A counts more than a 1-credit C.
// null when there are no credits to average.
export function gpa(classes: { credits: number; letter: Letter }[]): number | null {
  const credits = classes.reduce((sum, c) => sum + c.credits, 0)
  if (credits <= 0) return null
  const points = classes.reduce((sum, c) => sum + c.credits * gradePoints(c.letter), 0)
  return points / credits
}

// Overall GPA: past semesters plus this one's estimate, weighted by credits.
export function cumulativeGpa(semesters: { credits: number; gpa: number }[]): number | null {
  const credits = semesters.reduce((sum, s) => sum + s.credits, 0)
  if (credits <= 0) return null
  return semesters.reduce((sum, s) => sum + s.credits * s.gpa, 0) / credits
}

// The score needed on the final to end with `target`.
// If the final is worth w% and everything else averages `current`:
//   target = current * (1 - w) + needed * w
//   needed = (target - current * (1 - w)) / w
// Can come out over 100 (out of reach) or below 0 (already safe).
export function neededOnFinal(current: number, finalWeight: number, target: number): number | null {
  const w = finalWeight / 100
  if (w <= 0 || w > 1) return null
  return (target - current * (1 - w)) / w
}
