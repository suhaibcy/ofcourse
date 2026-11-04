// Run with: npm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { heardWord, HOOT_X, LoudnessMeter, startFlight, stepFlight } from './voiceGame.ts'

test('a word only counts if that exact word was heard', () => {
  assert.equal(heardWord('Parabola.', 'parabola'), true)
  assert.equal(heardWord('um, I think parabola!', 'Parabola'), true)
  assert.equal(heardWord('para bola', 'parabola'), false)
  assert.equal(heardWord('cat', 'catalog'), false)
  assert.equal(heardWord('', 'cat'), false)
})

test('louder flies higher, and silence brings Hoot down', () => {
  let flight = startFlight('hi', () => 0.5)
  for (let i = 0; i < 30; i++) flight = stepFlight(flight, 1, 0.016, () => 0.5)
  const high = flight.hootY
  assert.ok(high > 0.8)
  for (let i = 0; i < 30; i++) flight = stepFlight(flight, 0, 0.016, () => 0.5)
  assert.ok(flight.hootY < high / 2)
})

function flyUntilRingPasses(flight: ReturnType<typeof startFlight>, loudness: number) {
  const letter = flight.letterIndex
  let next = flight
  let seen = false
  for (let i = 0; i < 400 && !seen; i++) {
    next = stepFlight(next, loudness, 0.016, () => 0.5)
    seen = next.flash !== 'none' || next.letterIndex !== letter
  }
  return next
}

test('flying through the ring collects the letter, in order, until the word is spelled', () => {
  let flight = startFlight('hi', () => 0.5)
  flight = flyUntilRingPasses(flight, 0.5)
  assert.equal(flight.letterIndex, 1)
  assert.equal(flight.done, false)
  flight = flyUntilRingPasses(flight, 0.5)
  assert.equal(flight.done, true)
})

test('missing a ring brings the same letter back, with no penalty', () => {
  const flight = flyUntilRingPasses(startFlight('hi', () => 0.9), 0)
  assert.equal(flight.flash, 'missed')
  assert.equal(flight.letterIndex, 0)
  assert.ok(flight.ringX > HOOT_X)
})

test('the meter ignores room noise and reaches full volume for a voice', () => {
  const meter = new LoudnessMeter()
  for (let i = 0; i < 50; i++) meter.read(0.01)
  assert.equal(meter.read(0.01), 0)
  assert.ok(meter.read(0.2) > 0.9)
})

test('the meter recovers after total silence', () => {
  const meter = new LoudnessMeter()
  for (let i = 0; i < 50; i++) meter.read(0)
  for (let i = 0; i < 2000; i++) meter.read(0.01) // the room gets noisier
  assert.ok(meter.read(0.01) < 0.2)
})
