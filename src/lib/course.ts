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

export type Block = StepBlock | SandboxBlock | OrderBlock | SpotBlock | SortBlock | CalcBlock | ExplainBlock

export type SourceRef = { photo: number; quote: string } // where in the coursework this came from

export type Lesson = {
  id: string
  title: string
  intro: string
  source?: SourceRef
  blocks: Block[]
}

export type Course = {
  id: string
  title: string
  summary: string
  origin: 'sample' | 'generated' // a sample was written by hand, not by the AI
  concepts: { id: string; name: string }[]
  lessons: Lesson[]
  checks?: { checkedQuestions: number; removedBlocks: number } // what the checker did
}

export function allBlocks(course: Course): Block[] {
  return course.lessons.flatMap((lesson) => lesson.blocks)
}
