// Tests the whole AI pipeline with a fake Meta API: no network, no cost.
// Run with: npm test

import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import type { Course, Lesson, TeachCard } from '../src/lib/course.ts'
import { handleRoute } from './handlers.ts'
import { retryDelay } from './meta.ts'

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

const unitQuiz = { title: 'Q', intro: 'I', kind: 'quiz', source, teach: [], blocks: [order, order] }

async function draftCourse(blocks: unknown[], visitor: string): Promise<Course> {
  replies = [{ lessons: [learn(blocks), unitQuiz] }]
  const { lessons } = (await handleRoute('course', 'POST', { action: 'design', reading, outline: plan, unitIndex: 0 }, visitor)).json as { lessons: Lesson[] }
  return { id: 'new', title: 'T', summary: 'S', origin: 'generated', concepts: plan.concepts, lessons: lessons.filter((lesson) => lesson.kind !== 'quiz') }
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

// A fake API that answers from a list of [status, body, headers], counting calls.
function scripted(answers: [number, unknown, Record<string, string>?][]) {
  const state = { calls: 0 }
  globalThis.fetch = (async () => {
    const [status, body, headers] = answers[Math.min(state.calls, answers.length - 1)]
    state.calls += 1
    return new Response(JSON.stringify(body), { status, headers })
  }) as typeof fetch
  return state
}
const completion = (content: unknown, extra: object = {}) => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(content) }, ...extra }] })
const readingReply = completion({ ...reading, usedMaterials: false })
const now = { 'retry-after': '0' }

test('temporary API errors are retried, then succeed', async () => {
  const api = scripted([[429, {}, now], [503, {}, now], [200, readingReply]])
  assert.equal((await handleRoute('course', 'POST', { action: 'read', topic: 'tides' }, 'r1')).status, 200)
  assert.equal(api.calls, 3)
})

test('retries are bounded, and a busy API says so', async () => {
  const api = scripted([[429, {}, now]])
  const result = await handleRoute('course', 'POST', { action: 'read', topic: 'tides' }, 'r2')
  assert.equal(api.calls, 3)
  assert.equal(result.status, 503)
})

test('errors that will not fix themselves are not retried', async () => {
  const api = scripted([[401, {}]])
  assert.equal((await handleRoute('course', 'POST', { action: 'read', topic: 'tides' }, 'r3')).status, 502)
  assert.equal(api.calls, 1)
})

test('a long Retry-After stops the retries instead of holding the request open', async () => {
  const api = scripted([[429, {}, { 'retry-after': '120' }]])
  assert.equal((await handleRoute('course', 'POST', { action: 'read', topic: 'tides' }, 'r4')).status, 503)
  assert.equal(api.calls, 1)
})

test('the retry wait follows the API, then doubles', () => {
  assert.equal(retryDelay(0, '2', 0, 0), 2000)
  assert.equal(retryDelay(0, null, 0, 0), 500)
  assert.equal(retryDelay(1, null, 0, 0), 1000)
  assert.equal(retryDelay(0, new Date(3000).toUTCString(), 0, 0), 3000)
  assert.equal(retryDelay(0, 'nonsense', 0, 0), 500)
})

test('cut-off, refused, and broken replies each fail clearly, with no details', async () => {
  const cases: [unknown, number, string][] = [
    [{ choices: [{ finish_reason: 'length', message: { content: '{"topic":' } }] }, 502, 'too much'],
    [{ choices: [{ finish_reason: 'stop', message: { content: null, refusal: 'no' } }] }, 422, "can't help"],
    [{ choices: [{ finish_reason: 'content_filter', message: { content: '' } }] }, 422, "can't help"],
    [{ choices: [{ finish_reason: 'stop', message: { content: 'not json' } }] }, 502, 'could not finish'],
    [{ choices: [] }, 502, 'could not finish'],
  ]
  for (const [body, status, words] of cases) {
    scripted([[200, body]])
    const result = await handleRoute('course', 'POST', { action: 'read', text: 'my private notes' }, 'r5')
    assert.equal(result.status, status)
    assert.ok(JSON.stringify(result.json).includes(words))
    assert.equal(JSON.stringify(result.json).includes('private'), false)
  }
})

test('verify removes teaching cards that would trap the learner', async () => {
  const course = await draftCourse([order, order, order], 'v8')
  course.lessons[0].teach = [read as TeachCard, { type: 'example', problem: 'p', steps: [] }, { type: 'check', question: 'q', choices: [{ text: 'a', correct: false, why: 'w' }] }]
  replies = [{ issues: [] }]
  const result = await handleRoute('course', 'POST', { action: 'verify', course, reading }, 'v8')
  const checked = (result.json as { course: Course }).course
  assert.deepEqual(checked.lessons[0].teach, [read])
  assert.equal(checked.checks?.flaggedCards, 2)
})

const wrongAsk = { mode: 'wrong', course: 'Parabolas', question: 'Which way does it open?', selected: 'Down', correct: 'Opens upward', feedback: 'Look at a.', protect: true }
const tutorReply = { explanation: 'The sign of a matters.', misconception: 'You may have looked at k.', hint: 'Try y = 2x^2.', suggestedNextStep: 'Pick again.', unsure: false }

test('the tutor answers, using low effort, with only what it needs', async () => {
  replies = [tutorReply]
  const result = await handleRoute('tutor', 'POST', wrongAsk, 't1')
  assert.deepEqual(result, { status: 200, json: { reply: tutorReply } })
  const sentBody = JSON.parse(sent[0].body)
  assert.equal(sentBody.reasoning_effort, 'low')
  assert.ok(sentBody.messages[0].content.includes('never instructions'))
})

test('the tutor gets one repair if it gives away the answer, then gives up', async () => {
  replies = [{ ...tutorReply, hint: 'It opens upward.' }, tutorReply]
  assert.equal((await handleRoute('tutor', 'POST', wrongAsk, 't2')).status, 200)
  assert.equal(sent.length, 2)
  assert.ok(sent[1].body.includes('states the answer'))
  sent = []
  replies = [{ ...tutorReply, hint: 'It opens upward.' }, { ...tutorReply, explanation: 'It opens upward.' }]
  assert.equal((await handleRoute('tutor', 'POST', wrongAsk, 't2')).status, 422)
  assert.equal(sent.length, 2)
})

test('the tutor refuses an empty request before spending anything', async () => {
  assert.equal((await handleRoute('tutor', 'POST', { mode: 'wrong' }, 't3')).status, 400)
  assert.equal(sent.length, 0)
})

test('the tutor is off when the AI switch is off', async () => {
  process.env.AI_ENABLED = 'false'
  assert.equal((await handleRoute('tutor', 'POST', wrongAsk, 't4')).status, 503)
  assert.equal(sent.length, 0)
})

const practiceAsk = { action: 'practice', conceptId: 'c', concept: 'Factoring', course: 'Parabolas', avoid: ['Old problem Which?'] }
const newStep = (problem: string) => ({ type: 'step', conceptId: 'other', problem, hint: '', steps: [{ prompt: 'Which?', choices: [{ text: 'A', correct: true, why: 'w' }, { text: 'B', correct: false, why: 'w' }] }] })
const newOrder = { type: 'order', conceptId: 'c', prompt: 'Put these in order', items: ['first', 'second', 'third'], explain: 'e' }

test('practice writes, solves blind, and fact-checks, keeping only what passes', async () => {
  replies = [{ blocks: [newStep('A brand new problem'), newOrder] }, { answers: [{ id: 'practice-b1#0', option: 0 }] }, { issues: [] }]
  const result = await handleRoute('course', 'POST', practiceAsk, 'p1')
  const { blocks } = result.json as { blocks: Lesson['blocks'] }
  assert.equal(result.status, 200)
  assert.deepEqual(blocks.map((b) => b.id), ['practice-b1', 'practice-b2'])
  assert.ok(blocks.every((b) => b.conceptId === 'c'), 'our code sets the concept')
  assert.equal(sent.length, 3)
  assert.equal(sent[1].body.includes('correct'), false, 'the solver must not see the answers')
})

test('practice drops a question the solver disagrees with, skips, or the checker flags', async () => {
  replies = [{ blocks: [newStep('A brand new problem'), newOrder] }, { answers: [{ id: 'practice-b1#0', option: 1 }] }, { issues: [] }]
  assert.deepEqual(((await handleRoute('course', 'POST', practiceAsk, 'p2')).json as { blocks: Lesson['blocks'] }).blocks.map((b) => b.id), ['practice-b2'])
  replies = [{ blocks: [newStep('A brand new problem'), newOrder] }, { answers: [] }, { issues: [] }]
  assert.deepEqual(((await handleRoute('course', 'POST', practiceAsk, 'p2')).json as { blocks: Lesson['blocks'] }).blocks.map((b) => b.id), ['practice-b2'])
  replies = [{ blocks: [newStep('A brand new problem'), newOrder] }, { answers: [{ id: 'practice-b1#0', option: 0 }] }, { issues: [{ lesson: 'practice', card: 0, problem: 'wrong' }] }]
  assert.deepEqual(((await handleRoute('course', 'POST', practiceAsk, 'p2')).json as { blocks: Lesson['blocks'] }).blocks.map((b) => b.id), ['practice-b1'])
})

test('practice gets one repair for repeats and broken activities, then gives up without a fake question', async () => {
  replies = [{ blocks: [newStep('Old problem')] }, { blocks: [newStep('Something different entirely')] }, { answers: [{ id: 'practice-b1#0', option: 0 }] }]
  assert.equal((await handleRoute('course', 'POST', practiceAsk, 'p3')).status, 200)
  assert.ok(sent[1].body.includes('repeats an existing question'))
  sent = []
  replies = [{ blocks: [newStep('Old problem')] }, { blocks: [] }]
  assert.equal((await handleRoute('course', 'POST', practiceAsk, 'p3')).status, 422)
  assert.equal(sent.length, 2)
})

test('practice never returns a code lab, even if the model sends one', async () => {
  const lab = { type: 'code', conceptId: 'c', prompt: 'p', starter: 's', solution: 'x', expected: 'y', explain: 'e' }
  replies = [{ blocks: [lab] }, { blocks: [lab] }]
  assert.equal((await handleRoute('course', 'POST', practiceAsk, 'p4')).status, 422)
  const schema = JSON.parse(String(sent[0].body)).response_format.json_schema.schema
  assert.equal(JSON.stringify(schema).includes('"code"'), false)
  assert.equal(JSON.stringify(schema).includes('"voice"'), false)
})

test('practice with no concept spends nothing', async () => {
  assert.equal((await handleRoute('course', 'POST', { action: 'practice' }, 'p5')).status, 400)
  assert.equal(sent.length, 0)
})

test('a dropped connection is retried, and a build step survives it', async () => {
  let calls = 0
  globalThis.fetch = (async () => {
    calls += 1
    if (calls === 1) throw new TypeError('fetch failed')
    return new Response(JSON.stringify(readingReply))
  }) as typeof fetch
  assert.equal((await handleRoute('course', 'POST', { action: 'read', topic: 'tides' }, 'r6')).status, 200)
  assert.equal(calls, 2)
})

test('a timeout is not retried: it already used its time', async () => {
  let calls = 0
  globalThis.fetch = (async () => {
    calls += 1
    throw new DOMException('timed out', 'TimeoutError')
  }) as typeof fetch
  assert.equal((await handleRoute('course', 'POST', { action: 'read', topic: 'tides' }, 'r7')).status, 502)
  assert.equal(calls, 1)
})

test('one broken activity is dropped later, without rewriting the unit', async () => {
  const brokenFlip = { type: 'flip', conceptId: 'c', prompt: 'p', pairs: [{ term: 'x'.repeat(60), meaning: 'a' }, { term: 'b', meaning: 'c' }, { term: 'd', meaning: 'e' }] }
  replies = [{ lessons: [learn([order, brokenFlip]), unitQuiz] }]
  const result = await handleRoute('course', 'POST', { action: 'design', reading, outline: plan, unitIndex: 0 }, 'v9')
  assert.equal(result.status, 200)
  assert.equal(sent.length, 1, 'no second call')
})

test('a unit left with no practice still gets its repair', async () => {
  const brokenFlip = { type: 'flip', conceptId: 'c', prompt: 'p', pairs: [{ term: 'x'.repeat(60), meaning: 'a' }, { term: 'b', meaning: 'c' }, { term: 'd', meaning: 'e' }] }
  replies = [{ lessons: [learn([brokenFlip], [])] }, { lessons: [learn([order])] }]
  assert.equal((await handleRoute('course', 'POST', { action: 'design', reading, outline: plan, unitIndex: 0 }, 'v10')).status, 200)
  assert.equal(sent.length, 2)
})

test('each writing step sets its effort, and the checkers run together', async () => {
  replies = [{ ...reading, usedMaterials: false }]
  await handleRoute('course', 'POST', { action: 'read', topic: 'tides' }, 'v11')
  assert.equal(JSON.parse(sent[0].body).reasoning_effort, 'low')
  const course = await draftCourse([step('A new problem', 0), order, order], 'v11')
  sent = []
  replies = [{ answers: [{ id: 'u1-l1-b1#0', option: 0 }] }, { issues: [] }]
  const verified = await handleRoute('course', 'POST', { action: 'verify', course, reading }, 'v11')
  assert.equal(verified.status, 200)
  assert.deepEqual(sent.map((s) => JSON.parse(s.body).reasoning_effort), ['medium', 'medium'])
})

test('a question the solver skipped is removed, and the count stays honest', async () => {
  const course = await draftCourse([step('Checked one', 0), step('Skipped one', 0), order, order], 'v12')
  replies = [{ answers: [{ id: 'u1-l1-b1#0', option: 0 }] }, { issues: [] }]
  const checked = ((await handleRoute('course', 'POST', { action: 'verify', course, reading }, 'v12')).json as { course: Course }).course
  assert.deepEqual(checked.lessons[0].blocks.map((b) => b.id), ['u1-l1-b1', 'u1-l1-b3', 'u1-l1-b4'])
  assert.equal(checked.checks?.checkedQuestions, 1)
})

test('the fact-checker reads every activity and can remove one', async () => {
  const course = await draftCourse([order, { ...order, prompt: 'Second order', items: ['a', 'b', 'c'] }, { ...order, prompt: 'Third', items: ['x', 'y', 'z'] }, { ...order, prompt: 'Fourth', items: ['p', 'q', 'r'] }], 'v14')
  sent = []
  replies = [{ issues: [{ lesson: 'u1-l1-b2', card: 0, problem: 'The items do not fit the prompt' }] }]
  const checked = ((await handleRoute('course', 'POST', { action: 'verify', course, reading }, 'v14')).json as { course: Course }).course
  assert.ok(sent[0].body.includes('Second order'))
  assert.deepEqual(checked.lessons[0].blocks.map((b) => b.id), ['u1-l1-b1', 'u1-l1-b3', 'u1-l1-b4'])
  assert.equal(checked.checks?.removedBlocks, 1)
})

test('a solver answer of "none of these" removes the question', async () => {
  const course = await draftCourse([step('Mismatched choices', 0), order, order, order], 'v15')
  replies = [{ answers: [{ id: 'u1-l1-b1#0', option: -1 }] }, { issues: [] }]
  const checked = ((await handleRoute('course', 'POST', { action: 'verify', course, reading }, 'v15')).json as { course: Course }).course
  assert.equal(checked.lessons[0].blocks.some((b) => b.id === 'u1-l1-b1'), false)
})

test('a unit with no quiz gets its repair', async () => {
  const quiz = { title: 'Q', intro: 'I', kind: 'quiz', source, teach: [], blocks: [order, order] }
  replies = [{ lessons: [learn([order])] }, { lessons: [learn([order]), quiz] }]
  assert.equal((await handleRoute('course', 'POST', { action: 'design', reading, outline: plan, unitIndex: 0 }, 'v16')).status, 200)
  assert.ok(sent[1].body.includes('must end with a quiz'))
})

test('later steps can not be used to send unlimited text', async () => {
  const result = await handleRoute('course', 'POST', { action: 'outline', reading, topic: 'x'.repeat(500_000) }, 'v13')
  assert.equal(result.status, 413)
  assert.equal(sent.length, 0)
})

test('API failures give a friendly message with no details', async () => {
  globalThis.fetch = (async () => new Response('secret detail', { status: 500 })) as typeof fetch
  const result = await handleRoute('course', 'POST', { action: 'read', text: 'my private notes' }, 'v7')
  assert.equal(result.status, 502)
  assert.equal(JSON.stringify(result.json).includes('private'), false)
})
