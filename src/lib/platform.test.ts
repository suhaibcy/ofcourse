// Run with: npm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sampleLibrary } from '../data/sampleLibrary.ts'
import type { Course } from './course.ts'
import { checkBlock, checkCourse } from './courseCheck.ts'
import { courseMastery, levelFor, pointsFor, rankFor, weakestConcepts } from './mastery.ts'
import { buildStudyPlan } from './studyPlan.ts'

test('every library course passes every check', () => {
  for (const course of sampleLibrary) assert.deepEqual(checkCourse(course), [], course.title)
  assert.ok(new Set(sampleLibrary.map((c) => c.subject)).size >= 4)
})

test('mastery levels follow first-try results', () => {
  assert.equal(levelFor(0, 0, 0), 'Not started')
  assert.equal(levelFor(2, 0, 0), 'Attempted')
  assert.equal(levelFor(2, 1, 0), 'Familiar')
  assert.equal(levelFor(1, 1, 0), 'Proficient')
  assert.equal(levelFor(2, 2, 0), 'Mastered')
  assert.equal(levelFor(2, 1, 1), 'Familiar', 'a fixed miss only counts for half')
})

const course: Course = { id: 'x', title: 'x', summary: '', origin: 'sample',
  concepts: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
  lessons: [{ id: 'l', title: 'L', intro: '', blocks: [
    { type: 'order', id: 'a1', conceptId: 'a', prompt: 'p', items: ['1', '2', '3'], explain: '' },
    { type: 'order', id: 'b1', conceptId: 'b', prompt: 'p', items: ['1', '2', '3'], explain: '' },
  ] }] }

test('course mastery counts Proficient and up, and weak topics come first', () => {
  const progress = { a1: { firstTry: true } }
  assert.equal(courseMastery(course, progress), 50)
  assert.deepEqual(weakestConcepts(course, progress), ['B', 'A'])
})

test('points add up and ranks unlock at their thresholds', () => {
  assert.equal(pointsFor({ c: { a: { firstTry: true }, b: { firstTry: false, fixed: true } } }), 18)
  assert.equal(rankFor(0).name, 'Hatchling')
  assert.equal(rankFor(0).toNext, 50)
  assert.equal(rankFor(150).name, 'Explorer')
  assert.equal(rankFor(9999).toNext, null)
})

test('a study plan ends the day before the exam with a review', () => {
  const plan = buildStudyPlan('2026-11-10', '2026-11-07', ['A', 'B'], 20)
  assert.deepEqual(plan.map((s) => s.date), ['2026-11-07', '2026-11-08', '2026-11-09'])
  assert.deepEqual(plan.map((s) => s.title), ['Study: A', 'Study: B', 'Review: take the course exam'])
})

test('a far-off exam gets the last 7 days, and a past exam gets no plan', () => {
  const far = buildStudyPlan('2026-12-20', '2026-11-04', ['A'], 20)
  assert.equal(far.length, 7)
  assert.equal(far[0].date, '2026-12-13')
  assert.deepEqual(buildStudyPlan('2026-11-04', '2026-11-04', ['A'], 20), [])
  assert.deepEqual(buildStudyPlan('2026-11-01', '2026-11-04', ['A'], 20), [])
})

test('code blocks need all their parts', () => {
  assert.ok(checkBlock({ type: 'code', id: 'c', conceptId: 'a', prompt: 'p', starter: '', solution: 's', expected: '1', explain: '' }).length > 0)
})
