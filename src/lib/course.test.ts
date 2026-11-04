// Checks the course engine against cases worked out by hand.
// Run with: npm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sampleCourse } from '../data/sampleCourse.ts'
import type { Block, Course } from './course.ts'
import { blindQuestions, checkBlock, checkCourse, copiedBlocks, disagreements, isCopy, removeBlocks } from './courseCheck.ts'
import { CURVE_MATCH, curveGap, evaluate, isSafeFormula } from './formula.ts'
import { masteryByConcept, missedBlocks, recordResult } from './mastery.ts'

const spot: Block = { type: 'spot', id: 's1', conceptId: 'c', problem: 'Solve x + 2 = 5', lines: ['x + 2 = 5', 'x = 7', 'done'], wrongLine: 1, why: 'subtract' }
const course: Course = { id: 'x', title: 'x', summary: '', origin: 'sample', concepts: [{ id: 'c', name: 'C' }],
  lessons: [{ id: 'l', title: 'L', intro: '', blocks: [spot] }] }

test('the hand-written sample course passes every check', () => {
  assert.deepEqual(checkCourse(sampleCourse), [])
})

test('formulas can only use math and their own variables', () => {
  assert.equal(isSafeFormula('a*(x-h)^2+k', ['a', 'x', 'h', 'k']), true)
  assert.equal(isSafeFormula('import("fs")', []), false)
  assert.equal(isSafeFormula('constructor', []), false)
  assert.equal(isSafeFormula('secret + 1', ['x']), false)
})

test('formulas give the hand-worked answer, or null when there is none', () => {
  assert.equal(evaluate('b^2-4*a*c', { a: 1, b: -5, c: 6 }), 1)
  assert.equal(evaluate('1/x', { x: 0 }), null)
  assert.equal(evaluate('import("fs")', {}), null)
})

test('a curve matches its target and a different one does not', () => {
  const formula = 'a*x^2'
  assert.equal(curveGap(formula, { a: 2 }, { a: 2 }, [-2, 2], [0, 10]), 0)
  assert.ok(curveGap(formula, { a: 1 }, { a: 2 }, [-2, 2], [0, 10]) > CURVE_MATCH)
})

test('a multiple-choice step must have exactly one right answer', () => {
  const step = (correct: boolean[]): Block => ({ type: 'step', id: 'a', conceptId: 'c', problem: 'p',
    steps: [{ prompt: 'q', choices: correct.map((c) => ({ text: 't', correct: c, why: 'w' })) }] })
  assert.deepEqual(checkBlock(step([true, false])), [])
  assert.equal(checkBlock(step([true, true])).length, 1)
  assert.equal(checkBlock(step([false, false])).length, 1)
})

test('impossible blocks are caught', () => {
  assert.ok(checkBlock({ ...spot, wrongLine: 9 } as Block).length > 0)
  assert.ok(checkBlock({ type: 'calc', id: 'a', conceptId: 'c', prompt: 'p', formula: '1/n', values: { n: 0 }, tolerance: 0, explain: '' }).length > 0)
  assert.ok(checkBlock({ type: 'sandbox', id: 'a', conceptId: 'c', prompt: 'p', formula: 'a*x', xRange: [0, 1], yRange: [0, 1],
    sliders: [{ name: 'a', label: 'a', min: 0, max: 1, step: 0.1, value: 0 }], target: { a: 5 }, explain: '' }).length > 0)
})

test('voice words must match their syllables, and a catch game needs both kinds of item', () => {
  const voice = (word: string, syllables: string[]): Block => ({ type: 'voice', id: 'v', conceptId: 'c', prompt: 'p', words: [{ word, syllables }] })
  assert.deepEqual(checkBlock(voice('vertex', ['ver', 'tex'])), [])
  assert.ok(checkBlock(voice('vertex', ['ver', 'tax'])).length > 0)
  assert.ok(checkBlock(voice('two words', ['two', ' words'])).length > 0)
  const item = (good: boolean) => ({ text: 't', good, why: 'w' })
  assert.deepEqual(checkBlock({ type: 'catch', id: 'k', conceptId: 'c', prompt: 'p', items: [item(true), item(true), item(true), item(false), item(false)] }), [])
  assert.ok(checkBlock({ type: 'catch', id: 'k', conceptId: 'c', prompt: 'p', items: [item(true), item(true), item(true)] }).length > 0)
})

test('a copied homework problem is rejected, new numbers are not', () => {
  assert.equal(isCopy('Solve x^2 - 5x + 6 = 0', 'solve x^2 - 5x + 6 = 0.'), true)
  assert.equal(isCopy('Solve x^2 - 7x + 12 = 0', 'Solve x^2 - 5x + 6 = 0'), false)
  assert.deepEqual(copiedBlocks(course, ['Solve x + 2 = 5']), ['s1'])
})

test('the second solver sees no answers, and a disagreement flags the block', () => {
  assert.equal(JSON.stringify(blindQuestions(course)).includes('wrongLine'), false)
  assert.deepEqual(disagreements(course, [{ id: 's1', option: 1 }]), [])
  assert.deepEqual(disagreements(course, [{ id: 's1', option: 0 }]), ['s1'])
})

test('removing every block drops the empty lesson', () => {
  assert.equal(removeBlocks(course, ['s1']).lessons.length, 0)
})

test('only the first try counts toward mastery', () => {
  let progress = recordResult({}, 's1', false)
  progress = recordResult(progress, 's1', true)
  assert.equal(masteryByConcept(course, progress)[0].percent, 0)
  assert.equal(missedBlocks(course, progress).length, 1)
})
