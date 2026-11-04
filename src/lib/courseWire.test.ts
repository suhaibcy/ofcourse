// Run with: npm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { SandboxBlock } from './course.ts'
import { fromWire, provenCovered } from './courseWire.ts'

test('named lists become maps and ids come from code, not the AI', () => {
  const course = fromWire({ title: 't', summary: 's', concepts: [{ id: 'c', name: 'C' }], lessons: [{
    title: 'L', intro: 'i', source: { photo: 0, quote: 'q' },
    blocks: [{ type: 'sandbox', conceptId: 'c', id: 'ai-picked', target: [{ name: 'a', value: 2 }] }],
  }] })
  const block = course.lessons[0].blocks[0] as SandboxBlock
  assert.equal(block.id, 'l1-b1')
  assert.deepEqual(block.target, { a: 2 })
  assert.equal(course.origin, 'generated')
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
