// Checks the feed reader against a small made-up feed shaped like Canvas's
// (same quirks: repeated VALUE=DATE, folded lines, class meetings mixed in).
// Run with: npm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { classIdFor, looksLikeFeed, parseFeed } from './feed.ts'

const feed = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:icalendar-ruby',
  'BEGIN:VEVENT',
  'UID:event-assignment-1',
  'DTSTART;VALUE=DATE;VALUE=DATE:20261021',
  'SUMMARY:Quiz 03 [CS 111]',
  'URL;VALUE=URI:https://canvas.example.edu/calendar?include_contexts=course_1',
  ' &month=10&year=2026#assignment_1',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:event-assignment-2',
  'DTSTART:20261020T201500Z',
  'DTEND:20261020T201500Z',
  'SUMMARY:poll question 10/20 [ECON 120]',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:event-calendar-event-3',
  'DTSTART:20261022T160000Z',
  'DTEND:20261022T171500Z',
  'SUMMARY:PSCH 100 Thursday Lecture [PSCH 100]',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:event-calendar-event-4',
  'DTSTART:20261210T160000Z',
  'DTEND:20261210T180000Z',
  'SUMMARY:PSCH 100 Final Exam (Optional) [PSCH 100]',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

test('recognizes a feed, and rejects a web page', () => {
  assert.equal(looksLikeFeed(feed), true)
  assert.equal(looksLikeFeed('<!doctype html><html>'), false)
})

test('class ids match the Classes tab', () => {
  assert.equal(classIdFor('CS 111'), 'cs111')
  assert.equal(classIdFor('LAS 110'), 'las110')
})

test('keeps assignments and exams, skips class meetings', () => {
  const { assignments } = parseFeed(feed)
  assert.deepEqual(
    assignments.map((a) => a.id),
    ['event-assignment-2', 'event-assignment-1', 'event-calendar-event-4'], // sorted by due date
  )
})

test('splits the title and class code, and guesses the kind', () => {
  const quiz = parseFeed(feed).assignments.find((a) => a.id === 'event-assignment-1')
  assert.equal(quiz?.title, 'Quiz 03')
  assert.equal(quiz?.courseId, 'cs111')
  assert.equal(quiz?.kind, 'quiz')
  const exam = parseFeed(feed).assignments.find((a) => a.id === 'event-calendar-event-4')
  assert.equal(exam?.kind, 'exam')
})

test('web-page codes in titles become real characters', () => {
  const withCode = feed.replace('Quiz 03 [CS 111]', 'The Monopolist&#8217;s Profit &amp; Loss [CS 111]')
  const fixed = parseFeed(withCode).assignments.find((a) => a.id === 'event-assignment-1')
  assert.equal(fixed?.title, 'The Monopolist’s Profit & Loss')
})

test('an attendance check-in mentioning "midterm" is not an exam', () => {
  const checkIn = feed.replace('Quiz 03 [CS 111]', 'Midterm Discussion Section Attendance Check-in [CS 111]')
  const item = parseFeed(checkIn).assignments.find((a) => a.id === 'event-assignment-1')
  assert.equal(item?.kind, 'assignment')
})

test('a date with no time is due at 11:59 PM local time', () => {
  const quiz = parseFeed(feed).assignments.find((a) => a.id === 'event-assignment-1')
  assert.deepEqual(quiz?.due, new Date(2026, 9, 21, 23, 59))
})

test('a time in UTC keeps its exact moment', () => {
  const poll = parseFeed(feed).assignments.find((a) => a.id === 'event-assignment-2')
  assert.equal(poll?.due.toISOString(), '2026-10-20T20:15:00.000Z')
})

test('lists every class in the feed, including ones with only meetings', () => {
  assert.deepEqual(
    parseFeed(feed).classes.map((c) => c.code),
    ['CS 111', 'ECON 120', 'PSCH 100'],
  )
})
