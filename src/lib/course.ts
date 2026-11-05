// The shape of an interactive course. The AI fills in these blocks; it never
// writes app code, so every course runs on components we built and tested.

export type Choice = { text: string; correct: boolean; why: string }

// Solve a problem one decision at a time.
export type StepBlock = {
  type: 'step'; id: string; conceptId: string
  problem: string
  hint?: string
  steps: { prompt: string; choices: Choice[] }[]
}

// Move sliders until the live curve matches the dashed target.
export type SandboxBlock = {
  type: 'sandbox'; id: string; conceptId: string
  prompt: string
  formula: string // in terms of x and the slider names, e.g. "a*(x-h)^2+k"
  xRange: [number, number]
  yRange: [number, number]
  sliders: { name: string; label: string; min: number; max: number; step: number; value: number }[]
  target: Record<string, number> // the slider values that win
  explain: string
}

// Drag the steps into the right order. `items` is stored in the correct order.
export type OrderBlock = {
  type: 'order'; id: string; conceptId: string
  prompt: string
  items: string[]
  explain: string
}

// Tap the line that has the mistake.
export type SpotBlock = {
  type: 'spot'; id: string; conceptId: string
  problem: string
  lines: string[]
  wrongLine: number
  why: string
}

// Tap each item into the right group.
export type SortBlock = {
  type: 'sort'; id: string; conceptId: string
  prompt: string
  buckets: string[]
  items: { text: string; bucket: number; why: string }[]
}

// Type a number. Code works out the answer from the formula, not the AI.
export type CalcBlock = {
  type: 'calc'; id: string; conceptId: string
  prompt: string
  formula: string
  values: Record<string, number>
  tolerance: number
  explain: string
}

// Say the idea out loud, then see which points you covered.
export type ExplainBlock = {
  type: 'explain'; id: string; conceptId: string
  prompt: string
  points: string[]
}

// Say each word out loud, which unlocks Hoot Flight: your voice flies him through
// letter rings to spell the last word.
export type VoiceBlock = {
  type: 'voice'; id: string; conceptId: string
  prompt: string
  words: { word: string; syllables: string[] }[]
}

// Slide Hoot to catch the right answers and dodge the wrong ones.
export type CatchBlock = {
  type: 'catch'; id: string; conceptId: string
  prompt: string
  items: { text: string; good: boolean; why: string }[]
}

// Drag each term onto its meaning.
export type MatchBlock = {
  type: 'match'; id: string; conceptId: string
  prompt: string
  pairs: { term: string; meaning: string }[]
}

// A memory game with term and meaning cards.
export type FlipBlock = {
  type: 'flip'; id: string; conceptId: string
  prompt: string
  pairs: { term: string; meaning: string }[]
}

// Drag words into a sentence. Each ___ is a blank, filled by `answers` in order.
export type FillBlock = {
  type: 'fill'; id: string; conceptId: string
  prompt: string
  sentence: string
  answers: string[]
  extras: string[] // wrong words mixed in
  explain: string
}

// Write and run real JavaScript in the browser until it prints the right output.
export type CodeBlock = {
  type: 'code'; id: string; conceptId: string
  prompt: string
  starter: string
  solution: string
  expected: string // exactly what the finished code should print
  explain: string
}

export type Block = StepBlock | SandboxBlock | OrderBlock | SpotBlock | SortBlock | CalcBlock | ExplainBlock | VoiceBlock | CatchBlock | MatchBlock | FlipBlock | FillBlock | CodeBlock

export const LEVELS = ['Starting out', 'Some background', 'Advanced'] as const
export type Level = (typeof LEVELS)[number]

// The notes and dates that come with a course.
export type StudyKit = {
  summary: string
  keyIdeas: string[]
  terms: { term: string; meaning: string }[]
  emphasized?: string[] // what a lecture's words stress: exam mentions, repetition. Never tone of voice
  dates: { title: string; date: string; kind: string }[] // date is a day key, or "" if none was written down
}

export type SourceRef = { photo: number; quote: string } // where in the coursework this came from

// The teaching part of a lesson, shown before any activity. Nothing here is graded.
export type TeachCard =
  | { type: 'read'; heading: string; body: string }
  | { type: 'example'; problem: string; steps: { step: string; why: string }[] } // a worked example, revealed a step at a time
  | { type: 'explore'; prompt: string; formula: string; xRange: [number, number]; yRange: [number, number]
      sliders: SandboxBlock['sliders']; notice: string } // play with a live graph
  | { type: 'check'; question: string; choices: Choice[] } // a quick check on what was just taught
  | { type: 'compare'; heading: string; columns: [string, string]; rows: { label: string; left: string; right: string }[] }
  | { type: 'remember'; points: string[] }

export type Lesson = {
  id: string
  title: string
  intro: string
  unit?: string // the unit it belongs to
  kind?: 'learn' | 'quiz' // learn teaches then practices; quiz only tests
  source?: SourceRef
  teach?: TeachCard[]
  blocks: Block[]
}

export type Course = {
  id: string
  title: string
  summary: string
  origin: 'sample' | 'generated' // a sample was written in advance, not generated by the app
  subject?: string
  level?: Level
  kit?: StudyKit
  concepts: { id: string; name: string }[]
  lessons: Lesson[]
  basedOn?: 'materials' | 'general' // built from the learner's own work, or the model's general knowledge
  checks?: { checkedQuestions: number; removedBlocks: number; flaggedCards?: number } // what the checker did
  originalProblems?: string[] // the learner's real assignment questions, so new practice never answers them
}

export function allBlocks(course: Course): Block[] {
  return course.lessons.flatMap((lesson) => lesson.blocks)
}
