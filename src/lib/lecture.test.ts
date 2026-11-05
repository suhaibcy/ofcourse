// Run with: npm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clipEnds, collapseRepeats, inBatches, isSilent, labelTranscript, splitIntoClips, TRANSCRIPT_HEADING } from './lecture.ts'

const RATE = 100 // a low rate keeps these arrays small
const loud = (seconds: number) => new Float32Array(seconds * RATE).fill(0.3)

test('short audio stays one clip', () => {
  assert.deepEqual(clipEnds(loud(30), RATE, 55), [30 * RATE])
})

test('no clip goes over the limit, and nothing is lost', () => {
  const ends = clipEnds(loud(200), RATE, 55)
  let start = 0
  for (const end of ends) {
    assert.ok(end - start <= 55 * RATE)
    start = end
  }
  assert.equal(start, 200 * RATE)
})

test('a cut lands in a pause when there is one near the limit', () => {
  const samples = loud(100)
  samples.fill(0, 53 * RATE, 54 * RATE) // a one-second pause just before the limit
  const first = clipEnds(samples, RATE, 55)[0]
  assert.ok(first >= 53 * RATE && first <= 54 * RATE, `cut at ${first / RATE}s`)
})

test('silence is skipped', () => {
  assert.equal(isSilent(new Float32Array(RATE)), true)
  assert.equal(isSilent(loud(1)), false)
  const samples = new Float32Array(120 * RATE)
  samples.fill(0.3, 0, 10 * RATE)
  assert.equal(splitIntoClips(samples, RATE, 55).length, 1)
})

test('a transcript is labeled as machine-made and joined in order', () => {
  assert.equal(labelTranscript([' First part. ', '', 'Second part.']), `${TRANSCRIPT_HEADING}\nFirst part. Second part.`)
})

test('doubled words from transcription are collapsed', () => {
  assert.equal(collapseRepeats('paired with like like food. The food food causes it'), 'paired with like food. The food causes it')
  assert.equal(collapseRepeats('food foods'), 'food foods')
})

test('batches finish in order, whatever order they end in', async () => {
  const seen: number[] = []
  const result = await inBatches([30, 10, 20], 2, async (ms) => {
    await new Promise((resolve) => setTimeout(resolve, ms))
    return ms * 2
  }, (done) => seen.push(done))
  assert.deepEqual(result, [60, 20, 40])
  assert.deepEqual(seen, [1, 2, 3])
})
