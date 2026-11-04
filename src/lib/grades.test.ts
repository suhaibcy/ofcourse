// Checks the grade math against answers worked out by hand.
// Run with: npm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  categoryPercent,
  classPercent,
  cumulativeGpa,
  gpa,
  letterFor,
  neededOnFinal,
  type GradeCategory,
  type GradeItem,
} from './grades.ts'

function item(earned: number, possible: number, whatIf = false): GradeItem {
  return { id: `${earned}/${possible}`, name: 'x', earned, possible, whatIf }
}

function category(weight: number, items: GradeItem[]): GradeCategory {
  return { id: String(weight), name: 'x', weight, items }
}

test('a category adds up points, not averages of percents', () => {
  // 18/20 and 40/50 = 58/70 = 82.857...%, not (90% + 80%) / 2 = 85%
  const percent = categoryPercent(category(100, [item(18, 20), item(40, 50)]))
  assert.ok(percent !== null && Math.abs(percent - 82.857) < 0.001)
})

test('a category with nothing graded has no percent', () => {
  assert.equal(categoryPercent(category(20, [])), null)
})

test('class grade weights each category', () => {
  // Homework 20% at 90, Exams 80% at 70: 0.2 * 90 + 0.8 * 70 = 74
  const categories = [category(20, [item(9, 10)]), category(80, [item(70, 100)])]
  assert.equal(classPercent(categories), 74)
})

test('ungraded categories are left out and the rest scaled up', () => {
  // Final (40%) has no score yet, so it's Homework 20% at 90 and Exams 40% at 75:
  // (20 * 90 + 40 * 75) / 60 = 80
  const categories = [category(20, [item(9, 10)]), category(40, [item(75, 100)]), category(40, [])]
  assert.equal(classPercent(categories), 80)
})

test('what-if scores only count when asked', () => {
  const categories = [category(50, [item(80, 100)]), category(50, [item(100, 100, true)])]
  assert.equal(classPercent(categories), 80)
  assert.equal(classPercent(categories, true), 90)
})

test('no scores at all means no grade', () => {
  assert.equal(classPercent([category(100, [])]), null)
})

test('letters use the cutoffs, inclusive', () => {
  assert.equal(letterFor(90), 'A')
  assert.equal(letterFor(89.99), 'B')
  assert.equal(letterFor(60), 'D')
  assert.equal(letterFor(59.9), 'F')
  assert.equal(letterFor(88, { A: 88, B: 78, C: 68, D: 58 }), 'A')
})

test('GPA is weighted by credit hours', () => {
  // A (4) in a 4-credit class, C (2) in a 3-credit class: (16 + 6) / 7 = 3.142857...
  const result = gpa([{ credits: 4, letter: 'A' }, { credits: 3, letter: 'C' }])
  assert.ok(result !== null && Math.abs(result - 22 / 7) < 1e-9)
  assert.equal(gpa([]), null)
})

test('overall GPA combines semesters by credits', () => {
  // 15 credits at 3.0 and 15 at 4.0 = 3.5
  assert.equal(cumulativeGpa([{ credits: 15, gpa: 3 }, { credits: 15, gpa: 4 }]), 3.5)
})

test('needed on the final', () => {
  // At 85 with a 30% final, a 90 needs (90 - 85 * 0.7) / 0.3 = 101.67 (out of reach)
  const needed = neededOnFinal(85, 30, 90)
  assert.ok(needed !== null && Math.abs(needed - 101.6667) < 0.001)
  // At 85, an 80 needs (80 - 59.5) / 0.3 = 68.33
  const easier = neededOnFinal(85, 30, 80)
  assert.ok(easier !== null && Math.abs(easier - 68.3333) < 0.001)
  assert.equal(neededOnFinal(85, 0, 90), null)
})
