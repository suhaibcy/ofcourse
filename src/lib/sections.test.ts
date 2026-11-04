// Checks sectionFor against cases worked out by hand.
// Run with: npm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sectionFor } from './sections.ts'

// "Now" for every test: Wednesday, October 21, 2026 at 2:00 PM.
const now = new Date(2026, 9, 21, 14, 0) // months count from 0, so 9 = October

test('due earlier today, already passed: overdue', () => {
  assert.equal(sectionFor(new Date(2026, 9, 21, 9, 0), now), 'overdue')
})

test('due yesterday: overdue', () => {
  assert.equal(sectionFor(new Date(2026, 9, 20, 23, 59), now), 'overdue')
})

test('due tonight at 11:59 PM: today', () => {
  assert.equal(sectionFor(new Date(2026, 9, 21, 23, 59), now), 'today')
})

test('due in one minute: today', () => {
  assert.equal(sectionFor(new Date(2026, 9, 21, 14, 1), now), 'today')
})

test('due tomorrow: week', () => {
  assert.equal(sectionFor(new Date(2026, 9, 22, 9, 0), now), 'week')
})

test('due 6 days from now, late at night: week', () => {
  assert.equal(sectionFor(new Date(2026, 9, 27, 23, 59), now), 'week')
})

test('due exactly 7 days from today, just after midnight: later', () => {
  assert.equal(sectionFor(new Date(2026, 9, 28, 0, 1), now), 'later')
})

test('due next month: later', () => {
  assert.equal(sectionFor(new Date(2026, 10, 15, 12, 0), now), 'later')
})
