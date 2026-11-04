// Checks that only real Canvas calendar links get through.
// Run with: npm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkFeedLink } from './feedLink.ts'

test('accepts a Canvas calendar link, even with spaces around it', () => {
  const check = checkFeedLink('  https://canvas.example.edu/feeds/calendars/user_AbC123.ics ')
  assert.equal(check.ok, true)
})

test('rejects an empty box', () => {
  assert.equal(checkFeedLink('   ').ok, false)
})

test('rejects text that is not a link', () => {
  assert.equal(checkFeedLink('my canvas').ok, false)
})

test('rejects http (not secure)', () => {
  assert.equal(checkFeedLink('http://canvas.example.edu/feeds/calendars/user_AbC123.ics').ok, false)
})

test('rejects other Canvas pages, like the calendar page itself', () => {
  assert.equal(checkFeedLink('https://canvas.example.edu/calendar').ok, false)
})

test('rejects other websites', () => {
  assert.equal(checkFeedLink('https://example.com/something.ics').ok, false)
})
