// Run with: npm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { currentCount, playedToday, starsFor } from './streak.ts'

test('a streak grows on consecutive days, including across a month', () => {
  let streak = playedToday({ count: 0, lastDay: null }, '2026-10-31')
  assert.equal(streak.count, 1)
  streak = playedToday(streak, '2026-10-31')
  assert.equal(streak.count, 1)
  streak = playedToday(streak, '2026-11-01')
  assert.equal(streak.count, 2)
})

test('a missed day restarts the streak', () => {
  const streak = { count: 5, lastDay: '2026-11-01' }
  assert.equal(currentCount(streak, '2026-11-02'), 5)
  assert.equal(currentCount(streak, '2026-11-03'), 0)
  assert.equal(playedToday(streak, '2026-11-04').count, 1)
})

test('stars reflect first-try results', () => {
  assert.equal(starsFor(3, 3), 3)
  assert.equal(starsFor(2, 3), 2)
  assert.equal(starsFor(1, 3), 1)
  assert.equal(starsFor(0, 0), 1)
})
