// Turns a Canvas calendar feed (.ics text) into assignments the app can show.
// The feed is fetched by the dev server (vite.config.ts); this file only reads it.

import ICAL from 'ical.js'
import type { Assignment } from '../data/sampleAssignments.ts'

export type FeedClass = { id: string; code: string }

export type ParsedFeed = {
  assignments: Assignment[]
  classes: FeedClass[] // every class that appears in the feed, e.g. "LAS 110"
}

// A real feed always starts like this. Anything else (an error page, the
// app's own index.html) means there's no feed to read.
export function looksLikeFeed(text: string): boolean {
  return text.trimStart().startsWith('BEGIN:VCALENDAR')
}

// "CS 111" -> "cs111", the same ids the Classes tab uses.
export function classIdFor(code: string): string {
  return code.toLowerCase().replace(/\s+/g, '')
}

// Canvas puts the class code in brackets at the end: "Quiz 03 [CS 111]".
function splitTitle(summary: string): { title: string; code: string | null } {
  const match = summary.match(/^(.*?)\s*\[([^\]]+)\]\s*$/)
  return match ? { title: match[1], code: match[2] } : { title: summary, code: null }
}

// Canvas sometimes leaves web-page codes in titles: "Monopolist&#8217;s" means "Monopolist’s".
function decodeEntities(text: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
  return text.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] !== '#') return named[code.toLowerCase()] ?? match
    const isHex = code[1] === 'x' || code[1] === 'X'
    return String.fromCodePoint(parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10))
  })
}

function kindFor(title: string): Assignment['kind'] {
  // "Midterm Discussion Section Attendance Check-in" isn't an exam.
  const notATest = /attendance|check-in|participation/i.test(title)
  if (/\b(exam|midterm|final)\b/i.test(title) && !notATest) return 'exam'
  if (/\bquiz/i.test(title)) return 'quiz'
  return 'assignment'
}

export function parseFeed(icsText: string): ParsedFeed {
  const calendar = new ICAL.Component(ICAL.parse(icsText))
  const assignments: Assignment[] = []
  const codes = new Set<string>()

  for (const vevent of calendar.getAllSubcomponents('vevent')) {
    const event = new ICAL.Event(vevent)
    const { title, code } = splitTitle(decodeEntities(event.summary ?? ''))
    if (!code) continue
    codes.add(code)

    // Canvas sends two kinds of events. "event-assignment-…" is something due.
    // "event-calendar-event-…" is a class meeting the teacher added, which we
    // skip, except exams ("PSCH 100 Final Exam").
    const isAssignment = event.uid.startsWith('event-assignment-')
    if (!isAssignment && kindFor(title) !== 'exam') continue

    // Assignments due at 11:59 PM come as a date with no time ("all day").
    // Count those as due at 11:59 PM that day, the student's local time.
    const due = event.startDate.toJSDate()
    if (event.startDate.isDate) due.setHours(23, 59, 0, 0)

    assignments.push({ id: event.uid, courseId: classIdFor(code), title, due, kind: kindFor(title) })
  }

  assignments.sort((a, b) => a.due.getTime() - b.due.getTime())
  const classes = [...codes].sort().map((code) => ({ id: classIdFor(code), code }))
  return { assignments, classes }
}
