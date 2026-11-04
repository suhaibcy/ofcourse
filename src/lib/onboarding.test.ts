// Checks onboarding's "Plan your first 3" logic.
// Run with: npm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Assignment } from '../data/sampleAssignments.ts'
import { dayChoices, firstToPlan } from './onboarding.ts'

// "Now" for every test: Wednesday, October 21, 2026 at 2:00 PM.
const now = new Date(2026, 9, 21, 14, 0)

const item = (id: string, due: Date): Assignment => ({ id, courseId: 'cs111', title: id, due, kind: 'assignment' })

test('picks the 3 soonest, skipping past and finished ones', () => {
  const list = [
    item('later', new Date(2026, 10, 1)),
    item('past', new Date(2026, 9, 20)),
    item('tomorrow', new Date(2026, 9, 22)),
    item('done', new Date(2026, 9, 22, 9)),
    item('friday', new Date(2026, 9, 23)),
    item('tonight', new Date(2026, 9, 21, 23, 59)),
  ]
  const picked = firstToPlan(list, (id) => id === 'done', now)
  assert.deepEqual(picked.map((a) => a.id), ['tonight', 'tomorrow', 'friday'])
})

test('fewer than 3 upcoming gives what there is', () => {
  assert.equal(firstToPlan([item('a', new Date(2026, 9, 25))], () => false, now).length, 1)
})

test('due Friday offers today, tomorrow, Friday', () => {
  const days = dayChoices(new Date(2026, 9, 23, 23, 59), now)
  assert.deepEqual(days.map((d) => d.getDate()), [21, 22, 23])
})

test('due next week still offers only 3 days, starting today', () => {
  const days = dayChoices(new Date(2026, 9, 30), now)
  assert.deepEqual(days.map((d) => d.getDate()), [21, 22, 23])
})

test('due tonight offers only today', () => {
  assert.deepEqual(dayChoices(new Date(2026, 9, 21, 23, 59), now).map((d) => d.getDate()), [21])
})

test('already late still offers today', () => {
  assert.deepEqual(dayChoices(new Date(2026, 9, 19), now).map((d) => d.getDate()), [21])
})
