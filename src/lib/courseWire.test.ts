// Run with: npm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { SandboxBlock } from './course.ts'
import { checkCourse, removeTeachCards } from './courseCheck.ts'
import { fromWireUnit, provenCovered } from './courseWire.ts'

const read = { type: 'read' as const, heading: 'h', body: 'b' }
const source = { photo: 0, quote: 'q' }

test('named lists become maps and ids come from code, not the AI', () => {
  const lessons = fromWireUnit({ lessons: [{
    title: 'L', intro: 'i', kind: 'learn', source, teach: [read],
    blocks: [{ type: 'sandbox', conceptId: 'c', id: 'ai-picked', target: [{ name: 'a', value: 2 }] }],
  }] }, 'Unit', 2)
  const block = lessons[0].blocks[0] as SandboxBlock
  assert.equal(block.id, 'u2-l1-b1')
  assert.deepEqual(block.target, { a: 2 })
  assert.equal(lessons[0].unit, 'Unit')
})

test('a quiz never carries teaching cards', () => {
  const [quiz] = fromWireUnit({ lessons: [{ title: 'Q', intro: '', kind: 'quiz', source, teach: [read], blocks: [] }] }, 'U', 1)
  assert.deepEqual(quiz.teach, [])
})

const order = { type: 'order' as const, id: 'b', conceptId: 'c', prompt: 'p', items: ['1', '2', '3'], explain: 'e' }
const base = { id: 'x', title: 't', summary: '', origin: 'generated' as const, concepts: [{ id: 'c', name: 'C' }] }

test('a lesson must teach before it practices, and a quiz must test', () => {
  assert.deepEqual(checkCourse({ ...base, lessons: [{ id: 'l', title: 'L', intro: '', teach: [read], blocks: [order] }] }), [])
  assert.ok(checkCourse({ ...base, lessons: [{ id: 'l', title: 'L', intro: '', teach: [], blocks: [order] }] })[0].includes('must teach'))
  assert.ok(checkCourse({ ...base, lessons: [{ id: 'l', title: 'L', intro: '', teach: [read], blocks: [] }] })[0].includes('needs practice'))
  assert.ok(checkCourse({ ...base, lessons: [{ id: 'q', title: 'Q', intro: '', kind: 'quiz', blocks: [order] }] })[0].includes('quiz'))
})

test('a teaching check needs exactly one right answer, and an explore needs a safe formula', () => {
  const check = { type: 'check' as const, question: 'q', choices: [{ text: 'a', correct: true, why: '' }, { text: 'b', correct: true, why: '' }] }
  assert.ok(checkCourse({ ...base, lessons: [{ id: 'l', title: 'L', intro: '', teach: [check], blocks: [order] }] }).length > 0)
  const explore = { type: 'explore' as const, prompt: 'p', formula: 'import("x")', xRange: [0, 1] as [number, number], yRange: [0, 1] as [number, number],
    sliders: [{ name: 'a', label: 'a', min: 0, max: 1, step: 0.1, value: 0 }], notice: 'n' }
  assert.ok(checkCourse({ ...base, lessons: [{ id: 'l', title: 'L', intro: '', teach: [explore], blocks: [order] }] }).length > 0)
})

test('flagged teaching cards are removed, and issues that point nowhere are ignored', () => {
  const course = { ...base, lessons: [{ id: 'l', title: 'L', intro: '', teach: [read, { ...read, heading: 'keep' }], blocks: [order] }] }
  const result = removeTeachCards(course, [{ lesson: 'l', card: 0 }, { lesson: 'l', card: 9 }, { lesson: 'nope', card: 0 }])
  assert.equal(result.removed, 1)
  assert.equal(result.course.lessons[0].teach?.[0].type === 'read' && result.course.lessons[0].teach[0].heading, 'keep')
})

test('a covered point only counts if the quote is really in the transcript', () => {
  const said = 'Well, positive means two solutions, I think.'
  const kept = provenCovered(said, [
    { point: 0, quote: 'positive means two solutions' },
    { point: 1, quote: 'it crosses the axis' },
    { point: 9, quote: 'positive' },
    { point: 2, quote: '' },
  ], 3)
  assert.deepEqual(kept.map((c) => c.point), [0])
})
