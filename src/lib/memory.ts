import { allBlocks, type Course } from './course.ts'
import { lessonFinished, masteryByConcept, missedBlocks, weakestConcepts, type Progress } from './mastery.ts'

// What Hoot remembers on this device: a short log of what actually happened.
// Everything shown or sent to the AI comes from these records, so nothing here
// guesses at what kind of learner someone is. No AI runs in this file.

export type Attempt = {
  courseId: string
  lessonId?: string
  blockId: string
  conceptId?: string
  at: number // when, in ms since 1970
  correct: boolean // right on the first try
  attempts: number // wrong tries plus the final one
  hintsUsed: number
  selected?: string // the first wrong answer
  label?: string // a short reminder of the question
  misconception?: string // only when the tutor suggested one and wasn't unsure
  unverified?: boolean // practice mode or self-check: nothing objective confirmed it
  ungraded?: boolean // a quick check in a lesson
  practice?: boolean // from a generated practice set
}

export type LearningMemory = { version: 1; attempts: Attempt[] }

export const EMPTY_MEMORY: LearningMemory = { version: 1, attempts: [] }
export const MAX_ATTEMPTS = 300
const MAX_TEXT = 120

// The current time, for logging events as they happen.
export const nowMs = () => Date.now()

const short = (text: string | undefined) => (text ? text.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT) : undefined)

// Saved data can be missing, old, or edited by hand. Anything unusable is dropped.
export function normalizeMemory(value: unknown): LearningMemory {
  const saved = value as Partial<LearningMemory> | null
  if (saved?.version !== 1 || !Array.isArray(saved.attempts)) return EMPTY_MEMORY
  const attempts = saved.attempts.filter((a) => typeof a?.courseId === 'string' && typeof a.blockId === 'string' && typeof a.at === 'number' && typeof a.correct === 'boolean')
  return { version: 1, attempts: attempts.slice(-MAX_ATTEMPTS) }
}

export function recordAttempt(memory: LearningMemory, attempt: Attempt): LearningMemory {
  const clean: Attempt = { ...attempt, selected: short(attempt.selected), label: short(attempt.label), misconception: attempt.misconception?.trim().slice(0, 240) || undefined }
  return { version: 1, attempts: [...memory.attempts, clean].slice(-MAX_ATTEMPTS) }
}

const forCourse = (memory: LearningMemory, courseId: string) => memory.attempts.filter((a) => a.courseId === courseId)

export type Noticed = {
  tried: number
  strong: string[]
  needsPractice: { id: string; name: string; level: string }[]
  recent: { key: string; concept: string; text: string }[]
}

// The "What Hoot has noticed" card, built only from mastery results and the log.
export function noticed(course: Course, progress: Progress, memory: LearningMemory): Noticed {
  const attempts = forCourse(memory, course.id)
  const concepts = masteryByConcept(course, progress)
  const stillMissed = new Set(missedBlocks(course, progress).map((block) => block.conceptId))
  const order = weakestConcepts(course, progress)
  const needsPractice = concepts
    .filter((c) => c.level !== 'Not started' && (stillMissed.has(c.id) || c.level === 'Attempted' || c.level === 'Familiar'))
    .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))
    .map((c) => ({ id: c.id, name: c.name, level: c.level }))
  const nameOf = (id?: string) => course.concepts.find((c) => c.id === id)?.name ?? ''
  const recent = attempts
    .filter((a) => !a.correct && !a.unverified && (a.misconception || a.selected))
    .slice(-3)
    .reverse()
    .map((a) => ({
      key: `${a.blockId}-${a.at}`,
      concept: nameOf(a.conceptId),
      text: a.misconception ?? `You chose "${a.selected}"${a.label ? ` on: ${a.label}` : ''}`,
    }))
  return {
    tried: allBlocks(course).filter((block) => progress[block.id]).length + attempts.filter((a) => a.practice).length,
    strong: concepts.filter((c) => (c.level === 'Proficient' || c.level === 'Mastered') && !stillMissed.has(c.id)).map((c) => c.name),
    needsPractice,
    recent,
  }
}

// For AI requests: only counts and answers that were actually recorded.
export function memoryNote(course: Course, memory: LearningMemory): string {
  const attempts = forCourse(memory, course.id)
  if (attempts.length === 0) return ''
  const hints = attempts.reduce((sum, a) => sum + (a.hintsUsed ?? 0), 0)
  const lastWrong = attempts.filter((a) => !a.correct && a.selected).slice(-2).map((a) => `chose "${a.selected}"${a.label ? ` on "${a.label}"` : ''}`)
  return [
    hints > 0 ? `Asked for help ${hints} ${hints === 1 ? 'time' : 'times'}.` : '',
    lastWrong.length > 0 ? `Recent wrong answers: ${lastWrong.join('; ')}.` : '',
  ].filter(Boolean).join(' ')
}

export type NextStep =
  | { kind: 'practice'; text: string; conceptId: string }
  | { kind: 'fix'; text: string }
  | { kind: 'review' | 'next'; text: string; lessonId: string }
  | { kind: 'exam' | 'revisit'; text: string }

// What to do next, from observed results only. Fixed rules, so it's predictable and testable.
export function recommendNext(course: Course, progress: Progress, aiOn: boolean): NextStep {
  const missed = missedBlocks(course, progress)
  const conceptOf = (id: string) => course.concepts.find((c) => c.id === id)?.name ?? 'this idea'
  if (missed.length > 0) {
    const counts = new Map<string, number>()
    for (const block of missed) counts.set(block.conceptId, (counts.get(block.conceptId) ?? 0) + 1)
    const [conceptId, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
    const name = conceptOf(conceptId)
    if (count >= 2) {
      const lesson = course.lessons.find((l) => (l.teach ?? []).length > 0 && l.blocks.some((b) => b.conceptId === conceptId))
      if (lesson) return { kind: 'review', lessonId: lesson.id, text: `You've missed ${count} on ${name}. Review "${lesson.title}" first.` }
    }
    return aiOn
      ? { kind: 'practice', conceptId, text: `Try another ${name} challenge.` }
      : { kind: 'fix', text: `Try the ${name} ${count === 1 ? 'question' : 'questions'} you missed again.` }
  }
  const next = course.lessons.find((lesson) => !lessonFinished(lesson, progress))
  if (next) return { kind: 'next', lessonId: next.id, text: `You're ready for the next topic: ${next.title}.` }
  const shaky = masteryByConcept(course, progress).find((c) => c.level === 'Attempted' || c.level === 'Familiar')
  if (shaky) return { kind: 'revisit', text: `Revisit ${shaky.name} tomorrow, so it has a chance to stick.` }
  return { kind: 'exam', text: 'You finished every lesson. Take the course exam to see what stuck.' }
}
