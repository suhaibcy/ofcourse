import { allBlocks, type Block, type Course, type Lesson } from './course.ts'

// What the student did on each block: did they get it on the first try?
// `fixed` means they missed it, then got it right in Fix it.
export type Progress = Record<string, { firstTry: boolean; fixed?: boolean }>

export function recordResult(progress: Progress, blockId: string, correct: boolean): Progress {
  if (progress[blockId]) return progress // only the first attempt counts toward mastery
  return { ...progress, [blockId]: { firstTry: correct } }
}

// A clean retry in Fix it clears the block from the list and earns partial credit.
export function recordFix(progress: Progress, blockId: string, correct: boolean): Progress {
  if (!correct || !progress[blockId]) return progress
  return { ...progress, [blockId]: { ...progress[blockId], fixed: true } }
}

export const MASTERY_LEVELS = ['Not started', 'Attempted', 'Familiar', 'Proficient', 'Mastered'] as const
export type MasteryLevel = (typeof MASTERY_LEVELS)[number]

// A level from results: a fixed miss counts for half. Mastered takes at least two activities.
export function levelFor(tried: number, rightFirstTry: number, fixed: number): MasteryLevel {
  if (tried === 0) return 'Not started'
  const score = (rightFirstTry + fixed * 0.5) / tried
  if (score === 1 && tried >= 2) return 'Mastered'
  if (score >= 0.8) return 'Proficient'
  if (score >= 0.5) return 'Familiar'
  return 'Attempted'
}

// For each concept: percent right on the first try (null = not tried) and its level.
export function masteryByConcept(course: Course, progress: Progress) {
  return course.concepts.map((concept) => {
    const tried = allBlocks(course).filter((b) => b.conceptId === concept.id && progress[b.id])
    const right = tried.filter((b) => progress[b.id].firstTry).length
    const fixed = tried.filter((b) => progress[b.id].fixed).length
    return {
      ...concept,
      percent: tried.length === 0 ? null : Math.round((right / tried.length) * 100),
      level: levelFor(tried.length, right, fixed),
    }
  })
}

// The share of a course's concepts at Proficient or Mastered, as a percent.
export function courseMastery(course: Course, progress: Progress): number {
  const concepts = masteryByConcept(course, progress)
  if (concepts.length === 0) return 0
  const solid = concepts.filter((c) => c.level === 'Proficient' || c.level === 'Mastered').length
  return Math.round((solid / concepts.length) * 100)
}

// Concepts to study first: weakest level first, in course order within a level.
export function weakestConcepts(course: Course, progress: Progress): string[] {
  return masteryByConcept(course, progress)
    .map((concept, index) => ({ name: concept.name, rank: MASTERY_LEVELS.indexOf(concept.level), index }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((concept) => concept.name)
}

// The blocks to practice again: anything missed on the first try.
export function missedBlocks(course: Course, progress: Progress): Block[] {
  return allBlocks(course).filter((block) => progress[block.id] && !progress[block.id].firstTry && !progress[block.id].fixed)
}

// A lesson is finished when its teaching was read and every activity was tried.
export const teachKey = (lessonId: string) => `teach:${lessonId}`

export function lessonFinished(lesson: Lesson, progress: Progress): boolean {
  const taught = (lesson.teach ?? []).length === 0 || Boolean(progress[teachKey(lesson.id)])
  return taught && lessonDone(lesson.blocks, progress)
}

export function lessonDone(blocks: Block[], progress: Progress): boolean {
  return blocks.every((block) => progress[block.id])
}

// Owl points: 10 for a first-try win, 5 for finishing, 3 more for fixing a miss.
export function pointsFor(allProgress: Record<string, Progress>): number {
  return Object.values(allProgress).flatMap((progress) => Object.values(progress))
    .reduce((sum, result) => sum + (result.firstTry ? 10 : 5) + (result.fixed ? 3 : 0), 0)
}

const RANKS = [
  { name: 'Hatchling', from: 0 },
  { name: 'Fledgling', from: 50 },
  { name: 'Explorer', from: 150 },
  { name: 'Scholar', from: 300 },
  { name: 'Wise Owl', from: 600 },
]

// The current rank, and how many points until the next one (null at the top).
export function rankFor(points: number) {
  const index = RANKS.findLastIndex((rank) => points >= rank.from)
  const next = RANKS[index + 1]
  return { name: RANKS[index].name, toNext: next ? next.from - points : null, nextName: next?.name ?? null }
}
