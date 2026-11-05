import { allBlocks, type Block, type Course } from './course.ts'
import { blockText, checkBlock } from './courseCheck.ts'
import { missedBlocks, recordFix, recordResult, type Progress } from './mastery.ts'
import type { LearningMemory } from './memory.ts'
import { learnerSummary, type MissDetail } from './tutor.ts'

// Extra practice on one concept, using the existing activities. Sets are saved
// apart from the course, so the original lessons are never changed.

// No code labs (AI-written code stays out) and no voice activities (they need a
// microphone and can't be checked the same way).
export const PRACTICE_TYPES = ['step', 'order', 'spot', 'sort', 'calc', 'catch', 'match', 'flip', 'fill', 'sandbox'] as const

export type PracticeSet = { id: string; conceptId: string; createdAt: number; blocks: Block[] }
export type PracticeStore = Record<string, PracticeSet[]> // course id -> its sets

export type PracticeRequest = {
  course: string
  level: string
  conceptId: string
  concept: string
  summary: string
  source: string
  learner: string
  question: string
  selected: string
  avoid: string[]
}

const MAX_SETS_PER_COURSE = 20
const MAX_AVOID = 40
const clip = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

// A safe copy of what the browser sent, or null if no concept was named.
export function cleanPracticeRequest(body: unknown): PracticeRequest | null {
  const raw = (body ?? {}) as Record<string, unknown>
  const conceptId = clip(raw.conceptId, 100)
  const concept = clip(raw.concept, 300)
  if (!conceptId || !concept) return null
  return {
    course: clip(raw.course, 200), level: clip(raw.level, 40), conceptId, concept,
    summary: clip(raw.summary, 1500), source: clip(raw.source, 500), learner: clip(raw.learner, 600),
    question: clip(raw.question, 1500), selected: clip(raw.selected, 400),
    avoid: (Array.isArray(raw.avoid) ? raw.avoid : []).slice(0, MAX_AVOID).map((text) => clip(text, 400)).filter(Boolean),
  }
}

const numbersIn = (text: string) => new Set(text.match(/\d+(\.\d+)?/g) ?? [])
const tokensIn = (text: string) => new Set(text.toLowerCase().match(/[a-z]+|\d+(\.\d+)?/g) ?? [])

// A rewording with the same numbers is still the same problem, so that counts too.
export function isDuplicate(text: string, other: string): boolean {
  const a = tokensIn(text)
  const b = tokensIn(other)
  if (a.size === 0 || b.size === 0) return false
  if ([...a].filter((t) => b.has(t)).length / new Set([...a, ...b]).size >= 0.7) return true
  const numbersA = numbersIn(text)
  const numbersB = numbersIn(other)
  return numbersA.size >= 2 && numbersA.size === numbersB.size && [...numbersA].every((n) => numbersB.has(n))
}

// The blocks that may be shown, and why the others can't. Code decides, not the AI.
export function screenPractice(blocks: Block[], avoid: string[]): { blocks: Block[]; problems: string[] } {
  const kept: Block[] = []
  const problems: string[] = []
  for (const block of blocks) {
    if (!(PRACTICE_TYPES as readonly string[]).includes(block?.type)) { problems.push(`"${block?.type}" isn't allowed for practice`); continue }
    let broken: string[]
    try {
      broken = checkBlock(block)
    } catch {
      broken = ['it is missing required fields']
    }
    if (broken.length > 0) { problems.push(`${block.type}: ${broken.join(', ')}`); continue }
    const text = blockText(block)
    if ([...avoid, ...kept.map(blockText)].some((other) => isDuplicate(text, other))) { problems.push(`${block.type}: repeats an existing question; use a new one`); continue }
    kept.push(block)
  }
  return { blocks: kept, problems }
}

export function practiceRequest(course: Course, conceptId: string, progress: Progress, memory: LearningMemory, sets: PracticeSet[], miss?: MissDetail): PracticeRequest {
  const existing = [...allBlocks(course), ...sets.flatMap((set) => set.blocks)].filter((block) => block.conceptId === conceptId).map(blockText)
  return {
    course: course.title,
    level: course.level ?? '',
    conceptId,
    concept: course.concepts.find((c) => c.id === conceptId)?.name ?? conceptId,
    summary: course.kit?.summary ?? course.summary,
    source: course.lessons.find((l) => l.blocks.some((b) => b.conceptId === conceptId))?.source?.quote ?? '',
    learner: learnerSummary(course, progress, memory),
    question: miss?.question ?? '',
    selected: miss?.selected ?? '',
    avoid: [...(miss ? [miss.question] : []), ...(course.originalProblems ?? []), ...existing],
  }
}

export function addSet(sets: PracticeSet[], conceptId: string, blocks: Block[], id: string, now: number): { sets: PracticeSet[]; set: PracticeSet } {
  const set: PracticeSet = { id, conceptId, createdAt: now, blocks: blocks.map((block, i) => ({ ...block, id: `${id}-b${i + 1}`, conceptId })) }
  return { sets: [...sets, set].slice(-MAX_SETS_PER_COURSE), set }
}

// A saved set for this concept that hasn't been played, so it can be used without another AI call.
export function unplayedSet(sets: PracticeSet[], conceptId: string, progress: Progress): PracticeSet | undefined {
  return sets.find((set) => set.conceptId === conceptId && set.blocks.every((block) => !progress[block.id]))
}

// A new question right on the first try counts like a clean Fix it: it clears one
// miss on that concept. Replaying an original question works as Fix it always has.
export function applyPracticeResult(course: Course, progress: Progress, blockId: string, conceptId: string, firstTry: boolean): Progress {
  if (allBlocks(course).some((block) => block.id === blockId)) return recordFix(progress, blockId, firstTry)
  const next = recordResult(progress, blockId, firstTry)
  if (!firstTry) return next
  const target = missedBlocks(course, next).find((block) => block.conceptId === conceptId)
  return target ? recordFix(next, target.id, true) : next
}
