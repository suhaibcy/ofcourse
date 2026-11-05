// Run with: npm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sampleCourse } from '../data/sampleCourse.ts'
import type { Course, TeachCard } from './course.ts'
import { brokenTeachCards } from './courseCheck.ts'
import { routeFor } from './route.ts'
import { cardText, checkTutorReply, cleanTutorRequest, learnerSummary, lessonRequest, statesAnswer, wrongAnswerRequest, type TutorRequest } from './tutor.ts'

const wrong = cleanTutorRequest({ mode: 'wrong', question: 'Which way does it open?', selected: 'Down', correct: 'Opens upward', protect: true }) as TutorRequest
const good = { explanation: 'The sign of a matters.', misconception: 'You may have mixed up a and k.', hint: 'Try y = 2x^2.', suggestedNextStep: 'Pick again.', unsure: false }

test('a tutor request needs something to help with, in the mode it claims', () => {
  assert.equal(cleanTutorRequest({ mode: 'wrong', question: 'q' }), null)
  assert.equal(cleanTutorRequest({ mode: 'lesson' }), null)
  assert.equal(cleanTutorRequest({ mode: 'other', question: 'q', correct: 'c', selected: 's' }), null)
  assert.equal(cleanTutorRequest(null), null)
  assert.equal(cleanTutorRequest('nonsense'), null)
})

test('a tutor request is cut down to size, whatever the browser sends', () => {
  const request = cleanTutorRequest({ mode: 'lesson', card: 'x'.repeat(50_000), ask: 'y'.repeat(5000), course: 7 }) as TutorRequest
  assert.equal(request.card.length, 3000)
  assert.equal(request.ask.length, 300)
  assert.equal(request.course, '')
})

test('lesson mode carries no answers, even if the browser sends them', () => {
  const request = cleanTutorRequest({ mode: 'lesson', card: 'c', correct: 'secret', reference: 'secret' }) as TutorRequest
  assert.equal(request.correct, '')
  assert.equal(request.reference, '')
})

test('answer detection uses whole words', () => {
  assert.equal(statesAnswer('The answer is 49.', '49'), true)
  assert.equal(statesAnswer('Try 490 instead.', '49'), false)
  assert.equal(statesAnswer('It clearly opens upward here', 'Opens upward'), true)
  assert.equal(statesAnswer('Think about direction', 'Opens upward'), false)
  assert.equal(statesAnswer('x is 5 here', '5'), false, 'too short to tell from chance')
})

test('a good reply passes', () => {
  assert.deepEqual(checkTutorReply(good, wrong), [])
})

test('a reply that gives away a protected answer is rejected', () => {
  assert.equal(checkTutorReply({ ...good, hint: 'It opens upward.' }, wrong).length, 1)
  assert.deepEqual(checkTutorReply({ ...good, hint: 'It opens upward.' }, { ...wrong, protect: false }), [])
})

test('malformed, empty, oversized, and markup replies are rejected', () => {
  assert.ok(checkTutorReply(null, wrong).length > 0)
  assert.ok(checkTutorReply('text', wrong).length > 0)
  assert.ok(checkTutorReply({ ...good, explanation: ' ' }, wrong).length > 0)
  assert.ok(checkTutorReply({ ...good, hint: '' }, wrong).length > 0)
  assert.ok(checkTutorReply({ ...good, explanation: 'x'.repeat(901) }, wrong).length > 0)
  assert.ok(checkTutorReply({ ...good, explanation: 'See <script>alert(1)</script>' }, wrong).length > 0)
  assert.ok(checkTutorReply({ ...good, unsure: 'no' }, wrong).length > 0)
  assert.deepEqual(checkTutorReply({ ...good, explanation: 'If a < b and c > d, it holds.' }, wrong), [], 'math comparisons are fine')
})

test('the learner summary reports only recorded results', () => {
  const blocks = sampleCourse.lessons.flatMap((lesson) => lesson.blocks)
  assert.equal(learnerSummary(sampleCourse, {}), '')
  const summary = learnerSummary(sampleCourse, { [blocks[0].id]: { firstTry: false }, [blocks[1].id]: { firstTry: true } })
  assert.ok(summary.startsWith('Tried 2 activities in this course, 1 right on the first try.'))
  assert.ok(summary.includes('Missed and not yet fixed:'))
})

test('a quick check keeps its answer out of what the tutor sees', () => {
  const card: TeachCard = { type: 'check', question: 'Which?', choices: [{ text: 'A', correct: true, why: 'because of the secret reason' }, { text: 'B', correct: false, why: 'no' }] }
  const text = cardText(card)
  assert.ok(text.includes('A; B'))
  assert.equal(text.includes('secret'), false)
  assert.equal(text.toLowerCase().includes('correct'), false)
})

test('requests carry the course, lesson, and concept', () => {
  const lesson = sampleCourse.lessons[0]
  const block = lesson.blocks[0]
  const miss = { question: 'q', selected: 's', correct: 'c', feedback: 'f', protect: true }
  const request = wrongAnswerRequest(sampleCourse, lesson, block.conceptId, {}, miss)
  assert.equal(request.course, sampleCourse.title)
  assert.equal(request.lesson, lesson.title)
  assert.equal(request.concept, sampleCourse.concepts.find((c) => c.id === block.conceptId)?.name)
  assert.ok(cleanTutorRequest(request))
  assert.ok(cleanTutorRequest(lessonRequest(sampleCourse, lesson, lesson.teach![0], {}, 'why?')))
})

test('broken teaching cards are found, and the samples have none', () => {
  assert.deepEqual(brokenTeachCards(sampleCourse), [])
  const course: Course = { ...sampleCourse, lessons: [{ id: 'l', title: 'L', intro: '', blocks: [], teach: [
    { type: 'read', heading: 'Fine', body: 'Fine.' },
    { type: 'example', problem: 'p', steps: [{ step: 's', why: 'w' }] },
    { type: 'check', question: 'q', choices: [{ text: 'a', correct: false, why: 'w' }, { text: 'b', correct: false, why: 'w' }] },
  ] }] }
  assert.deepEqual(brokenTeachCards(course), [{ lesson: 'l', card: 1 }, { lesson: 'l', card: 2 }])
})

test('a new visitor lands on Learn, and only reaches the planner by asking', () => {
  assert.equal(routeFor('', false), 'learn')
  assert.equal(routeFor('#/learn', false), 'learn')
  assert.equal(routeFor('#/learn?note=abc', true), 'learn')
  assert.equal(routeFor('#/planner', false), 'planner')
  assert.equal(routeFor('', true), 'planner')
})
