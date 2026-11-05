// Tests the whole AI pipeline with a fake Meta API: no network, no cost.
// Run with: npm test

import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import type { Course, Lesson } from '../src/lib/course.ts'
import { handleRoute } from './handlers.ts'

const realFetch = globalThis.fetch
let replies: unknown[] = []
let sent: { url: string; body: string }[] = []

beforeEach(() => {
  process.env.AI_ENABLED = 'true'
  process.env.MODEL_API_KEY = 'test-key'
  sent = []
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    sent.push({ url: String(url), body: typeof init.body === 'string' ? init.body : '' })
    const reply = replies.shift()
    if (String(url).includes('/asr/')) return new Response(JSON.stringify(reply))
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(reply) } }] }))
  }) as typeof fetch
})

afterEach(() => {
  globalThis.fetch = realFetch
  process.env.AI_ENABLED = 'false'
})

const step = (problem: string, correctIndex: number) => ({
  type: 'step', conceptId: 'c', problem, hint: '', steps: [{ prompt: 'Which?', choices: [
    { text: 'A', correct: correctIndex === 0, why: 'w' }, { text: 'B', correct: correctIndex === 1, why: 'w' },
  ] }],
})
const order = { type: 'order', conceptId: 'c', prompt: 'p', items: ['1', '2', '3'], explain: 'e' }
const read = { type: 'read', heading: 'Why', body: 'Because.' }
const source = { photo: 0, quote: 'q' }
const learn = (blocks: unknown[], teach: unknown[] = [read]) => ({ title: 'L', intro: 'I', kind: 'learn', source, teach, blocks })
const reading = { topic: 't', usedMaterials: true, concepts: [{ name: 'C', quote: 'q', photo: 0 }], originalProblems: ['Solve x + 2 = 5'], isReadable: true }
const plan = { title: 'T', summary: 'S', concepts: [{ id: 'c', name: 'C' }], units: [{ title: 'Unit A', goal: 'g', conceptIds: ['c'] }] }

async function draftCourse(blocks: unknown[], visitor: string): Promise<Course> {
  replies = [{ lessons: [learn(blocks)] }]
  const { lessons } = (await handleRoute('course', 'POST', { action: 'design', reading, outline: plan, unitIndex: 0 }, visitor)).json as { lessons: Lesson[] }
  return { id: 'new', title: 'T', summary: 'S', origin: 'generated', concepts: plan.concepts, lessons }
}

test('nothing reaches the API when the AI switch is off', async () => {
  process.env.AI_ENABLED = 'false'
  const result = await handleRoute('course', 'POST', { action: 'read', text: 'notes' }, 'v0')
  assert.equal(result.status, 503)
  assert.equal(sent.length, 0)
  assert.deepEqual((await handleRoute('status', 'GET', {}, 'v0')).json, { ai: false })
})

test('reading rejects bad pages, and an empty request, before spending anything', async () => {
  assert.equal((await handleRoute('course', 'POST', { action: 'read', photos: ['data:text/html;base64,AAAA'] }, 'v1')).status, 400)
  assert.equal((await handleRoute('course', 'POST', { action: 'read', topic: '  ' }, 'v1')).status, 400)
  assert.equal(sent.length, 0)
})

test('a topic alone is enough to start a course', async () => {
  replies = [{ ...reading, usedMaterials: false }]
  const result = await handleRoute('course', 'POST', { action: 'read', topic: 'How tides work' }, 'v1b')
  assert.equal(result.status, 200)
  assert.ok(sent[0].body.includes('How tides work'))
})

test('unreadable materials get a friendly message', async () => {
  replies = [{ ...reading, isReadable: false, concepts: [] }]
  assert.equal((await handleRoute('course', 'POST', { action: 'read', text: 'blurry' }, 'v2')).status, 422)
})

test('the outline step asks for units, and an empty plan is refused', async () => {
  replies = [plan]
  assert.deepEqual((await handleRoute('course', 'POST', { action: 'outline', reading, topic: 'x' }, 'v2b')).json, { outline: plan })
  replies = [{ ...plan, units: [] }]
  assert.equal((await handleRoute('course', 'POST', { action: 'outline', reading, topic: 'x' }, 'v2b')).status, 422)
})

test('a lesson with no teaching gets one repair attempt, with the reason', async () => {
  replies = [{ lessons: [learn([order], [])] }, { lessons: [learn([order])] }]
  const result = await handleRoute('course', 'POST', { action: 'design', reading, outline: plan, unitIndex: 0 }, 'v3')
  assert.equal(result.status, 200)
  assert.equal(sent.length, 2)
  assert.ok(sent[1].body.includes('must teach before it practices'))
  assert.equal((result.json as { lessons: Lesson[] }).lessons[0].unit, 'Unit A')
})

test('verify removes copied homework, disputed answers, and flagged teaching', async () => {
  const course = await draftCourse([step('Solve x + 2 = 5', 0), step('Good new problem', 0), step('Wrong answer key', 0), step('Another good one', 0), order], 'v4')
  // The copied block is gone before the solver runs, so it answers 3 questions and disagrees on one.
  replies = [
    { answers: [{ id: 'u1-l1-b2#0', option: 0 }, { id: 'u1-l1-b3#0', option: 1 }, { id: 'u1-l1-b4#0', option: 0 }] },
    { issues: [{ lesson: 'u1-l1', card: 0, problem: 'A wrong fact' }] },
  ]
  sent = []
  const result = await handleRoute('course', 'POST', { action: 'verify', course, reading }, 'v4')
  const checked = (result.json as { course: Course }).course
  assert.equal(result.status, 200)
  assert.deepEqual(checked.lessons[0].blocks.map((b) => b.id), ['u1-l1-b2', 'u1-l1-b4', 'u1-l1-b5'])
  assert.deepEqual(checked.lessons[0].teach, [])
  assert.deepEqual(checked.checks, { checkedQuestions: 3, removedBlocks: 2, flaggedCards: 1 })
  assert.equal(sent[0].body.includes('correct'), false, 'the solver must not see the answers')
})

test('a filler lesson with no activities is dropped', async () => {
  const course = await draftCourse([order, order, order], 'v4b')
  course.lessons.push({ id: 'u1-l2', title: 'x', intro: 'placeholder', teach: [{ type: 'read', heading: 'x', body: 'x' }], blocks: [] })
  replies = [{ issues: [] }]
  const result = await handleRoute('course', 'POST', { action: 'verify', course, reading }, 'v4b')
  assert.deepEqual((result.json as { course: Course }).course.lessons.map((l) => l.id), ['u1-l1'])
})

test('a course with too little left is refused, not shown', async () => {
  const course = await draftCourse([step('Only one', 0), step('And two', 0)], 'v5')
  replies = [{ answers: [{ id: 'u1-l1-b1#0', option: 1 }, { id: 'u1-l1-b2#0', option: 0 }] }, { issues: [] }]
  assert.equal((await handleRoute('course', 'POST', { action: 'verify', course, reading }, 'v5')).status, 422)
})

test('explain it back keeps only quotes the learner really said', async () => {
  replies = [{ transcript: 'Positive means two solutions.' }, { covered: [{ point: 0, quote: 'positive means two solutions' }, { point: 1, quote: 'never said this' }] }]
  const result = await handleRoute('explain', 'POST', { audio: 'AAAA', prompt: 'p', points: ['a', 'b'] }, 'v6')
  assert.deepEqual((result.json as { covered: unknown[] }).covered, [{ point: 0, quote: 'positive means two solutions' }])
})

test('API failures give a friendly message with no details', async () => {
  globalThis.fetch = (async () => new Response('secret detail', { status: 500 })) as typeof fetch
  const result = await handleRoute('course', 'POST', { action: 'read', text: 'my private notes' }, 'v7')
  assert.equal(result.status, 502)
  assert.equal(JSON.stringify(result.json).includes('private'), false)
})
