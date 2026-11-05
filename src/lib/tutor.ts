import { allBlocks, type Course, type Lesson, type TeachCard } from './course.ts'
import { masteryByConcept, missedBlocks, type Progress } from './mastery.ts'
import { memoryNote, type LearningMemory } from './memory.ts'

// Hoot's tutor: what goes to the AI, and what's allowed back. No AI runs in this
// file and nothing here touches a screen, so all of it can be tested for free.

// What an activity reports about a wrong answer. Everything is optional for the
// caller, so activities that don't report details keep working as they did.
export type MissDetail = {
  question: string
  selected: string
  correct: string
  feedback: string // already on screen, so it's safe to show as the fallback
  reference?: string // for the AI only: may give the answer away
  protect: boolean // false when the learner can already work out the answer, like a 2-way choice after one miss
}

export type TutorRequest = {
  mode: 'wrong' | 'lesson'
  course: string
  level: string
  lesson: string
  concept: string
  summary: string
  source: string
  learner: string
  question: string
  correct: string
  selected: string
  feedback: string
  reference: string
  protect: boolean
  card: string
  ask: string
}

export type TutorReply = {
  explanation: string
  misconception: string
  hint: string
  suggestedNextStep: string
  unsure: boolean
}

// The server re-applies these, so a request can't grow past them whatever the browser sends.
const LIMITS = {
  course: 200, level: 40, lesson: 200, concept: 300, summary: 1500, source: 500, learner: 600,
  question: 1500, correct: 400, selected: 400, feedback: 800, reference: 1200, card: 3000, ask: 300,
} as const

const clip = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

// A safe copy of what the browser sent, or null if there's nothing to help with.
export function cleanTutorRequest(body: unknown): TutorRequest | null {
  const raw = (body ?? {}) as Record<string, unknown>
  const text = Object.fromEntries(Object.entries(LIMITS).map(([key, max]) => [key, clip(raw[key], max)])) as Record<keyof typeof LIMITS, string>
  if (raw.mode === 'wrong') {
    if (!text.question || !text.correct || !text.selected) return null
    return { ...text, mode: 'wrong', protect: raw.protect !== false, card: '', ask: '' }
  }
  if (raw.mode === 'lesson') {
    if (!text.card) return null
    return { ...text, mode: 'lesson', protect: false, question: '', correct: '', selected: '', feedback: '', reference: '' }
  }
  return null
}

const MAX_FIELD = 900
const MARKUP = /<\/?(script|style|iframe|img|div|span|p|a|b|i|br|ul|ol|li|h[1-6]|svg|html|body)\b[^>]*>/i

const plain = (text: string) => text.toLowerCase().replace(/[^a-z0-9.\- ]+/g, ' ').replace(/\s+/g, ' ').trim()

// Does this text state the answer? Whole words only, so "4" isn't found inside "40".
// Very short answers would match by chance: numbers need 2 characters, words 3.
export function statesAnswer(text: string, answer: string): boolean {
  const target = plain(answer)
  if (target.length < (/^-?[\d.]+$/.test(target) ? 2 : 3)) return false
  return ` ${plain(text).replace(/[.]+( |$)/g, ' ')} `.includes(` ${target} `)
}

// What's wrong with a reply (empty = fine to show). The AI proposes; this decides.
export function checkTutorReply(reply: unknown, request: TutorRequest): string[] {
  const r = reply as Partial<TutorReply> | null
  if (!r || typeof r !== 'object') return ['the reply is not an object']
  const problems: string[] = []
  const fields = ['explanation', 'misconception', 'hint', 'suggestedNextStep'] as const
  for (const field of fields) {
    const value = r[field]
    if (typeof value !== 'string') { problems.push(`${field} is missing`); continue }
    if (value.length > MAX_FIELD) problems.push(`${field} is too long`)
    if (MARKUP.test(value)) problems.push(`${field} contains markup; use plain text`)
    if (request.mode === 'wrong' && request.protect && statesAnswer(value, request.correct)) problems.push(`${field} states the answer; guide the learner to it without saying it`)
  }
  if (typeof r.explanation !== 'string' || !r.explanation.trim()) problems.push('explanation is empty')
  if (request.mode === 'wrong' && (typeof r.hint !== 'string' || !r.hint.trim())) problems.push('hint is empty')
  if (typeof r.unsure !== 'boolean') problems.push('unsure is missing')
  return problems
}

// A short, factual note on recorded results, with no guesses about the learner as a person.
export function learnerSummary(course: Course, progress: Progress, memory?: LearningMemory): string {
  const tried = allBlocks(course).filter((block) => progress[block.id] && !progress[block.id].unverified)
  const note = memory ? memoryNote(course, memory) : ''
  if (tried.length === 0) return note
  const right = tried.filter((block) => progress[block.id].firstTry).length
  const conceptName = (id: string) => course.concepts.find((c) => c.id === id)?.name ?? id
  const missed = [...new Set(missedBlocks(course, progress).map((block) => conceptName(block.conceptId)))]
  const solid = masteryByConcept(course, progress).filter((c) => c.level === 'Proficient' || c.level === 'Mastered').map((c) => c.name)
  return [
    `Tried ${tried.length} activities in this course, ${right} right on the first try.`,
    missed.length > 0 ? `Missed and not yet fixed: ${missed.join(', ')}.` : '',
    solid.length > 0 ? `Going well so far: ${solid.join(', ')}.` : '',
    note,
  ].filter(Boolean).join(' ')
}

// A teaching card as text for the tutor. A quick check's answer stays out, since the learner may not have answered it.
export function cardText(card: TeachCard): string {
  switch (card.type) {
    case 'read': return `${card.heading}\n${card.body}`
    case 'example': return `Worked example: ${card.problem}\n${card.steps.map((s) => `${s.step} (${s.why})`).join('\n')}`
    case 'explore': return `Interactive graph of ${card.formula}. ${card.prompt} ${card.notice}`
    case 'check': return `Quick check: ${card.question}\nChoices: ${card.choices.map((c) => c.text).join('; ')}`
    case 'compare': return `${card.heading}: ${card.columns[0]} and ${card.columns[1]}\n${card.rows.map((row) => `${row.label}: ${row.left} / ${row.right}`).join('\n')}`
    case 'remember': return `Takeaways: ${card.points.join('; ')}`
  }
}

function shared(course: Course, lesson: Lesson | undefined, conceptIds: string[], progress: Progress, memory?: LearningMemory) {
  const concept = course.concepts.filter((c) => conceptIds.includes(c.id)).map((c) => c.name).join(', ')
  return {
    course: course.title,
    level: course.level ?? '',
    lesson: lesson?.title ?? '',
    concept,
    summary: course.kit?.summary ?? course.summary,
    source: lesson?.source?.quote ?? '',
    learner: learnerSummary(course, progress, memory),
  }
}

export function wrongAnswerRequest(course: Course, lesson: Lesson | undefined, conceptId: string | undefined, progress: Progress, miss: MissDetail, memory?: LearningMemory): TutorRequest {
  const ids = conceptId ? [conceptId] : (lesson?.blocks ?? []).map((block) => block.conceptId)
  return {
    ...shared(course, lesson, ids, progress, memory),
    mode: 'wrong', question: miss.question, correct: miss.correct, selected: miss.selected,
    feedback: miss.feedback, reference: miss.reference ?? '', protect: miss.protect, card: '', ask: '',
  }
}

export function lessonRequest(course: Course, lesson: Lesson | undefined, card: TeachCard, progress: Progress, ask: string, memory?: LearningMemory): TutorRequest {
  return {
    ...shared(course, lesson, (lesson?.blocks ?? []).map((block) => block.conceptId), progress, memory),
    mode: 'lesson', question: '', correct: '', selected: '', feedback: '', reference: '', protect: false, card: cardText(card), ask,
  }
}
