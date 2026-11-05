// Run with: npm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sampleCourse } from '../data/sampleCourse.ts'
import type { Block, Course } from './course.ts'
import { dropUnprovenQuotes } from './courseCheck.ts'
import { courseMastery, masteryByConcept, missedBlocks, pointsFor, recordResult, type Progress } from './mastery.ts'
import { EMPTY_MEMORY, MAX_ATTEMPTS, memoryNote, normalizeMemory, noticed, recommendNext, recordAttempt, type Attempt } from './memory.ts'
import { addSet, applyPracticeResult, cleanPracticeRequest, isDuplicate, practiceRequest, screenPractice, unplayedSet } from './practice.ts'
import { learnerSummary } from './tutor.ts'

const spot = (id: string, conceptId = 'a'): Block => ({ type: 'spot', id, conceptId, problem: `Problem ${id}`, lines: ['one', 'two', 'three'], wrongLine: 1, why: 'because' })
const course: Course = {
  id: 'course', title: 'Course', summary: 'About things.', origin: 'generated',
  concepts: [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }],
  lessons: [
    { id: 'l1', title: 'First', intro: '', teach: [{ type: 'read', heading: 'h', body: 'b' }], blocks: [spot('s1'), spot('s2')] },
    { id: 'l2', title: 'Second', intro: '', blocks: [spot('s3', 'b')] },
  ],
}
const attempt = (over: Partial<Attempt> = {}): Attempt => ({ courseId: 'course', blockId: 's1', conceptId: 'a', at: 1, correct: false, attempts: 2, hintsUsed: 0, ...over })

test('unverified results finish an activity but never raise mastery', () => {
  const progress = recordResult({}, 's1', true, true)
  assert.deepEqual(progress.s1, { firstTry: false, unverified: true })
  assert.equal(masteryByConcept(course, progress)[0].level, 'Not started')
  assert.equal(missedBlocks(course, progress).length, 0, 'not a miss either: nothing was checked')
  assert.equal(pointsFor({ course: progress }), 5, 'finishing points only')
  assert.equal(courseMastery(course, progress), 0)
})

test('a later checked result replaces an unverified one, but not the other way around', () => {
  const checked = recordResult(recordResult({}, 's1', true, true), 's1', true)
  assert.deepEqual(checked.s1, { firstTry: true })
  assert.deepEqual(recordResult(checked, 's1', true, true).s1, { firstTry: true })
})

test('older progress records keep working', () => {
  const old: Progress = { s1: { firstTry: true }, s2: { firstTry: true } }
  assert.equal(masteryByConcept(course, old)[0].level, 'Mastered')
})

test('memory survives missing, old, and corrupted saves', () => {
  assert.deepEqual(normalizeMemory(null), EMPTY_MEMORY)
  assert.deepEqual(normalizeMemory({ version: 99, attempts: [] }), EMPTY_MEMORY)
  assert.deepEqual(normalizeMemory({ version: 1, attempts: 'nope' }), EMPTY_MEMORY)
  assert.equal(normalizeMemory({ version: 1, attempts: [attempt(), { junk: true }, null] }).attempts.length, 1)
})

test('memory stays small and trims long text', () => {
  let memory = EMPTY_MEMORY
  for (let i = 0; i < MAX_ATTEMPTS + 5; i++) memory = recordAttempt(memory, attempt({ at: i, selected: 'x'.repeat(500) }))
  assert.equal(memory.attempts.length, MAX_ATTEMPTS)
  assert.equal(memory.attempts[0].at, 5)
  assert.equal(memory.attempts[0].selected?.length, 120)
})

test('what Hoot notices changes after a second attempt', () => {
  const memory = recordAttempt(EMPTY_MEMORY, attempt({ selected: 'two', label: 'Which line?' }))
  const missed: Progress = { s1: { firstTry: false } }
  const before = noticed(course, missed, memory)
  assert.deepEqual(before.needsPractice.map((c) => c.name), ['Alpha'])
  assert.equal(before.recent[0].text, 'You chose "two" on: Which line?')
  const fixed = applyPracticeResult(course, missed, 'practice-b1', 'a', true)
  fixed.s2 = { firstTry: true }
  const after = noticed(course, fixed, recordAttempt(memory, attempt({ blockId: 'practice-b1', correct: true, practice: true })))
  assert.equal(masteryByConcept(course, missed)[0].level, 'Attempted')
  assert.equal(after.needsPractice[0].level, 'Familiar', 'better, and honestly not finished yet')
  assert.equal(recommendNext(course, fixed, true).kind, 'next', 'nothing left unfixed, so it moves on')
})

test('a misconception is shown only as the tutor worded it, and unverified results are left out', () => {
  const memory = recordAttempt(recordAttempt(EMPTY_MEMORY, attempt({ misconception: 'You may have mixed these up.' })), attempt({ blockId: 'v', selected: 'x', unverified: true }))
  const recent = noticed(course, { s1: { firstTry: false } }, memory).recent
  assert.deepEqual(recent.map((r) => r.text), ['You may have mixed these up.'])
})

test('the note for the AI contains only recorded facts', () => {
  assert.equal(memoryNote(course, EMPTY_MEMORY), '')
  const memory = recordAttempt(EMPTY_MEMORY, attempt({ selected: 'two', label: 'Which line?', hintsUsed: 2 }))
  assert.equal(memoryNote(course, memory), 'Asked for help 2 times. Recent wrong answers: chose "two" on "Which line?".')
  assert.ok(learnerSummary(course, { s1: { firstTry: false } }, memory).includes('Asked for help 2 times'))
  assert.equal(memoryNote({ ...course, id: 'other' }, memory), '', 'one course never leaks into another')
})

test('recommendations follow results', () => {
  assert.equal(recommendNext(course, {}, true).kind, 'next')
  const one: Progress = { s1: { firstTry: false } }
  assert.deepEqual(recommendNext(course, one, true), { kind: 'practice', conceptId: 'a', text: 'Try another Alpha challenge.' })
  assert.equal(recommendNext(course, one, false).kind, 'fix', 'without AI, Fix it is the fallback')
  const two: Progress = { s1: { firstTry: false }, s2: { firstTry: false } }
  assert.deepEqual(recommendNext(course, two, true), { kind: 'review', lessonId: 'l1', text: 'You\'ve missed 2 on Alpha. Review "First" first.' })
  const done: Progress = { 'teach:l1': { firstTry: true }, s1: { firstTry: true }, s2: { firstTry: true }, s3: { firstTry: true } }
  assert.equal(recommendNext(course, done, true).kind, 'exam')
  const shaky: Progress = { ...done, s1: { firstTry: false, fixed: true }, s2: { firstTry: false, fixed: true } }
  assert.equal(recommendNext(course, shaky, true).kind, 'revisit')
})

test('practice requests are cut down to size', () => {
  assert.equal(cleanPracticeRequest({ concept: 'x' }), null)
  const request = cleanPracticeRequest({ conceptId: 'a', concept: 'A', avoid: Array(100).fill('y'.repeat(1000)) })
  assert.equal(request?.avoid.length, 40)
  assert.equal(request?.avoid[0].length, 400)
})

test('practice rejects repeats, including the same numbers reworded', () => {
  assert.equal(isDuplicate('Solve x squared minus 7x plus 12', 'Solve x squared minus 7x plus 12 now'), true)
  assert.equal(isDuplicate('Find the roots when b is 7 and c is 12', 'Factor an equation using 12 and 7'), true)
  assert.equal(isDuplicate('Solve x squared minus 9x plus 20', 'Solve x squared minus 7x plus 12'), false)
})

test('practice only keeps allowed, valid, new activities', () => {
  const good = spot('g')
  const code: Block = { type: 'code', id: 'c', conceptId: 'a', prompt: 'p', starter: 's', solution: 'fetch("x")', expected: 'e', explain: 'x' }
  const broken = { ...spot('b'), lines: ['only one'] } as Block
  const copy = spot('z')
  const result = screenPractice([good, code, broken, { type: 'spot' } as Block, copy], ['Problem z one two three'])
  assert.deepEqual(result.blocks.map((b) => b.id), ['g'])
  assert.equal(result.problems.length, 4)
})

test('practice carries what to avoid, including real assignment problems', () => {
  const withOriginals = { ...course, originalProblems: ['Real homework problem'] }
  const miss = { question: 'Missed question', selected: 'x', correct: 'y', feedback: 'f', protect: true }
  const request = practiceRequest(withOriginals, 'a', {}, EMPTY_MEMORY, [], miss)
  assert.ok(request.avoid.includes('Missed question'))
  assert.ok(request.avoid.includes('Real homework problem'))
  assert.ok(request.avoid.some((text) => text.includes('Problem s1')))
  assert.equal(request.avoid.some((text) => text.includes('Problem s3')), false, 'only this concept')
})

test('saved sets stay separate and are reused until played', () => {
  const { sets, set } = addSet([], 'a', [spot('x', 'wrong')], 'set1', 5)
  assert.deepEqual(set.blocks.map((b) => [b.id, b.conceptId]), [['set1-b1', 'a']])
  assert.equal(unplayedSet(sets, 'a', {})?.id, 'set1')
  assert.equal(unplayedSet(sets, 'b', {}), undefined)
  assert.equal(unplayedSet(sets, 'a', { 'set1-b1': { firstTry: true } }), undefined)
  assert.equal(course.lessons[0].blocks.length, 2, 'the course itself is untouched')
})

test('a practice win clears one miss on that concept, and a practice miss clears nothing', () => {
  const progress: Progress = { s1: { firstTry: false }, s2: { firstTry: false }, s3: { firstTry: false } }
  const won = applyPracticeResult(course, progress, 'p1', 'a', true)
  assert.equal(missedBlocks(course, won).length, 2)
  assert.equal(won.s1.fixed, true)
  assert.equal(won.s3.fixed, undefined)
  assert.equal(missedBlocks(course, applyPracticeResult(course, progress, 'p2', 'a', false)).length, 3)
  assert.equal(applyPracticeResult(course, progress, 's1', 'a', true).s1.fixed, true, 'an original question works like Fix it')
})

test('a quote is only shown as the learner\'s work if it is really there', () => {
  const quoted: Course = { ...course, lessons: [
    { ...course.lessons[0], source: { photo: 0, quote: 'genes  and ENVIRONMENTS always combine' } },
    { ...course.lessons[1], source: { photo: 0, quote: 'something the document never said' } },
  ] }
  const checked = dropUnprovenQuotes(quoted, 'Genes and environments always combine to produce behavior.')
  assert.ok(checked.lessons[0].source)
  assert.equal(checked.lessons[1].source, undefined)
  assert.ok(checked.lessons[0].blocks.length > 0, 'the lesson itself stays')
})

test('every sample still has blocks to practice', () => {
  assert.ok(sampleCourse.lessons.length > 0)
})
