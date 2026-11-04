import { allBlocks, type Block, type Course } from './course.ts'

// What the student did on each block: did they get it on the first try?
export type Progress = Record<string, { firstTry: boolean }>

export function recordResult(progress: Progress, blockId: string, correct: boolean): Progress {
  if (progress[blockId]) return progress // only the first attempt counts toward mastery
  return { ...progress, [blockId]: { firstTry: correct } }
}

// Percent right on the first try for each concept. null = not tried yet.
export function masteryByConcept(course: Course, progress: Progress) {
  return course.concepts.map((concept) => {
    const tried = allBlocks(course).filter((b) => b.conceptId === concept.id && progress[b.id])
    const right = tried.filter((b) => progress[b.id].firstTry).length
    return { ...concept, percent: tried.length === 0 ? null : Math.round((right / tried.length) * 100) }
  })
}

// The blocks to practice again: anything missed on the first try.
export function missedBlocks(course: Course, progress: Progress): Block[] {
  return allBlocks(course).filter((block) => progress[block.id] && !progress[block.id].firstTry)
}

export function lessonDone(blocks: Block[], progress: Progress): boolean {
  return blocks.every((block) => progress[block.id])
}
