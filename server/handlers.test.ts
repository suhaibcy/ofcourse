// Tests the whole AI pipeline with a fake Meta API: no network, no cost.
// Run with: npm test

import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import type { Course } from '../src/lib/course.ts'
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
const wireCourse = (blocks: unknown[]) => ({ title: 'T', summary: 'S', concepts: [{ id: 'c', name: 'C' }],
  lessons: [{ title: 'L', intro: 'I', source: { photo: 0, quote: 'q' }, blocks }] })
const reading = { topic: 't', summary: 's', concepts: [{ name: 'C', quote: 'q', photo: 0 }], originalProblems: ['Solve x + 2 = 5'], isReadable: true }

test('nothing reaches the API when the AI switch is off', async () => {
  process.env.AI_ENABLED = 'false'
  const result = await handleRoute('course', 'POST', { action: 'read', text: 'notes' }, 'v0')
  assert.equal(result.status, 503)
  assert.equal(sent.length, 0)
  assert.deepEqual((await handleRoute('status', 'GET', {}, 'v0')).json, { ai: false })
})

test('reading rejects bad photos before spending anything', async () => {
  const result = await handleRoute('course', 'POST', { action: 'read', photos: ['data:text/html;base64,AAAA'] }, 'v1')
  assert.equal(result.status, 400)
  assert.equal(sent.length, 0)
})

test('an unreadable page gets a friendly message', async () => {
  replies = [{ ...reading, isReadable: false, concepts: [] }]
  const result = await handleRoute('course', 'POST', { action: 'read', text: 'blurry' }, 'v2')
  assert.equal(result.status, 422)
})

test('a course that fails the checks gets one repair attempt with the reasons', async () => {
  replies = [wireCourse([step('New one', 0), { ...order, items: ['1'] }]), wireCourse([step('New one', 0), order])]
  const result = await handleRoute('course', 'POST', { action: 'design', reading }, 'v3')
  assert.equal(result.status, 200)
  assert.equal(sent.length, 2)
  assert.ok(sent[1].body.includes('order needs 3 to 7 items'))
})

test('verify removes copied homework and answers the second solver disputes', async () => {
  const design = wireCourse([step('Solve x + 2 = 5', 0), step('Good new problem', 0), step('Wrong answer key', 0), step('Another good one', 0), order])
  replies = [design]
  const { course } = (await handleRoute('course', 'POST', { action: 'design', reading }, 'v4')).json as { course: Course }
  // The copied block is gone before the solver runs, so it answers 3 questions. It disagrees on one.
  replies = [{ answers: [{ id: 'l1-b2#0', option: 0 }, { id: 'l1-b3#0', option: 1 }, { id: 'l1-b4#0', option: 0 }] }]
  const result = await handleRoute('course', 'POST', { action: 'verify', course, reading }, 'v4')
  const checked = (result.json as { course: Course }).course
  assert.equal(result.status, 200)
  assert.deepEqual(checked.lessons[0].blocks.map((b) => b.id), ['l1-b2', 'l1-b4', 'l1-b5'])
  assert.deepEqual(checked.checks, { checkedQuestions: 3, removedBlocks: 2 })
  assert.equal(sent[1].body.includes('correct'), false, 'the solver must not see the answers')
})

test('a course with too little left is refused, not shown', async () => {
  replies = [wireCourse([step('Only one', 0), step('And two', 0)])]
  const { course } = (await handleRoute('course', 'POST', { action: 'design', reading }, 'v5')).json as { course: Course }
  replies = [{ answers: [{ id: 'l1-b1#0', option: 1 }, { id: 'l1-b2#0', option: 0 }] }]
  assert.equal((await handleRoute('course', 'POST', { action: 'verify', course, reading }, 'v5')).status, 422)
})

test('explain it back keeps only quotes the student really said', async () => {
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
