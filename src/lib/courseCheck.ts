import { allBlocks, type Block, type Course } from './course.ts'
import { curvePoints, evaluate, isSafeFormula } from './formula.ts'

// Plain-code checks on a course. The AI proposes; this code decides what's
// allowed to reach the student. No AI runs in this file.

// What's wrong with one block, as a list of problems (empty = fine).
export function checkBlock(block: Block): string[] {
  const problems: string[] = []
  switch (block.type) {
    case 'step':
      if (block.steps.length === 0) problems.push('no steps')
      block.steps.forEach((step, i) => {
        if (step.choices.length < 2) problems.push(`step ${i + 1} needs at least 2 choices`)
        if (step.choices.filter((c) => c.correct).length !== 1) problems.push(`step ${i + 1} needs exactly 1 correct choice`)
        if (step.choices.some((c) => !c.why.trim())) problems.push(`step ${i + 1} has a choice with no explanation`)
      })
      break
    case 'sandbox': {
      const names = block.sliders.map((s) => s.name)
      if (!isSafeFormula(block.formula, [...names, 'x'])) problems.push('unsafe formula')
      if (block.xRange[0] >= block.xRange[1] || block.yRange[0] >= block.yRange[1]) problems.push('bad graph range')
      if (block.sliders.length === 0) problems.push('no sliders')
      for (const s of block.sliders) {
        if (s.min >= s.max || s.step <= 0) problems.push(`bad slider ${s.name}`)
        const goal = block.target[s.name]
        if (goal === undefined || goal < s.min || goal > s.max) problems.push(`target for ${s.name} is out of reach`)
      }
      if (problems.length === 0 && curvePoints(block.formula, block.target, block.xRange, 40).length < 30) {
        problems.push('the target curve has too few points to draw')
      }
      break
    }
    case 'order':
      if (block.items.length < 3 || block.items.length > 7) problems.push('order needs 3 to 7 items')
      if (new Set(block.items).size !== block.items.length) problems.push('order has duplicate items')
      break
    case 'spot':
      if (block.lines.length < 3) problems.push('needs at least 3 lines')
      if (!Number.isInteger(block.wrongLine) || block.wrongLine < 0 || block.wrongLine >= block.lines.length) problems.push('wrong line is out of range')
      break
    case 'sort':
      if (block.buckets.length < 2 || block.buckets.length > 3) problems.push('sort needs 2 or 3 groups')
      if (block.items.length < 3) problems.push('sort needs at least 3 items')
      if (block.items.some((item) => !Number.isInteger(item.bucket) || item.bucket < 0 || item.bucket >= block.buckets.length)) problems.push('item in a group that does not exist')
      break
    case 'calc':
      if (evaluate(block.formula, block.values) === null) problems.push('formula has no answer')
      if (block.tolerance < 0) problems.push('negative tolerance')
      break
    case 'explain':
      if (block.points.length < 2) problems.push('needs at least 2 points')
      break
  }
  return problems
}

// Every problem in a course, labeled by block id.
export function checkCourse(course: Course): string[] {
  const concepts = new Set(course.concepts.map((c) => c.id))
  const problems: string[] = []
  if (course.lessons.length === 0) problems.push('course has no lessons')
  const seen = new Set<string>()
  for (const block of allBlocks(course)) {
    if (seen.has(block.id)) problems.push(`${block.id}: duplicate id`)
    seen.add(block.id)
    if (!concepts.has(block.conceptId)) problems.push(`${block.id}: unknown concept`)
    problems.push(...checkBlock(block).map((p) => `${block.id}: ${p}`))
  }
  return problems
}

function wordsAndNumbers(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z]+|\d+(\.\d+)?/g) ?? [])
}

function problemText(block: Block): string | null {
  if (block.type === 'step' || block.type === 'spot') return block.problem
  if (block.type === 'calc') return block.prompt
  return null
}

// ofCourse teaches the method and won't answer the real assignment. A generated
// problem that shares nearly all its words and numbers with an original is a copy.
export function isCopy(problem: string, original: string): boolean {
  const a = wordsAndNumbers(problem)
  const b = wordsAndNumbers(original)
  if (a.size === 0 || b.size === 0) return false
  const shared = [...a].filter((token) => b.has(token)).length
  return shared / new Set([...a, ...b]).size >= 0.8
}

export function copiedBlocks(course: Course, originals: string[]): string[] {
  return allBlocks(course)
    .filter((block) => {
      const text = problemText(block)
      return text !== null && originals.some((original) => isCopy(text, original))
    })
    .map((block) => block.id)
}

// The question with its answer removed, for a second AI call to solve on its own.
export type BlindQuestion = { id: string; question: string; options: string[] }

export function blindQuestions(course: Course): BlindQuestion[] {
  const questions: BlindQuestion[] = []
  for (const block of allBlocks(course)) {
    if (block.type === 'step') {
      block.steps.forEach((step, i) => questions.push({
        id: `${block.id}#${i}`, question: `${block.problem}\n${step.prompt}`, options: step.choices.map((c) => c.text),
      }))
    } else if (block.type === 'spot') {
      questions.push({ id: block.id, question: `${block.problem}\nWhich line has the first mistake?`, options: block.lines })
    }
  }
  return questions
}

// The option number the course says is right for a blind question.
function keyFor(course: Course, id: string): number | null {
  const [blockId, step] = id.split('#')
  const block = allBlocks(course).find((b) => b.id === blockId)
  if (block?.type === 'spot') return block.wrongLine
  if (block?.type === 'step') {
    const choices = block.steps[Number(step)]?.choices
    return choices ? choices.findIndex((c) => c.correct) : null
  }
  return null
}

// Blocks where the independent solver picked a different answer than the course.
export function disagreements(course: Course, answers: { id: string; option: number }[]): string[] {
  const blocks = answers.filter((a) => keyFor(course, a.id) !== a.option).map((a) => a.id.split('#')[0])
  return [...new Set(blocks)]
}

// The course without the given blocks, dropping any lesson left empty.
export function removeBlocks(course: Course, ids: string[]): Course {
  const lessons = course.lessons
    .map((lesson) => ({ ...lesson, blocks: lesson.blocks.filter((block) => !ids.includes(block.id)) }))
    .filter((lesson) => lesson.blocks.length > 0)
  return { ...course, lessons }
}
