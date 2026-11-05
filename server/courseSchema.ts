// The exact JSON shapes Muse Spark must return. The API guarantees the shape;
// our own code in src/lib/courseCheck.ts then checks that the content makes sense.

const str = { type: 'string' }
const num = { type: 'number' }
const bool = { type: 'boolean' }
const strict = (properties: Record<string, object>) => ({
  type: 'object', properties, required: Object.keys(properties), additionalProperties: false,
})
const list = (items: object) => ({ type: 'array', items })
const namedValues = list(strict({ name: str, value: num }))
const typed = (type: string, properties: Record<string, object>) => strict({ type: { type: 'string', enum: [type] }, ...properties })
const blockOf = (type: string, properties: Record<string, object>) => typed(type, { conceptId: str, ...properties })
const sliders = list(strict({ name: str, label: str, min: num, max: num, step: num, value: num }))
const choices = list(strict({ text: str, correct: bool, why: str }))

const noteFields = {
  summary: str,
  keyIdeas: list(str),
  terms: list(strict({ term: str, meaning: str })),
}

export const notesSchema = strict(noteFields)

export const readingSchema = strict({
  topic: str,
  subject: { type: 'string', enum: ['Math', 'Science', 'Reading & writing', 'Coding', 'History & social studies', 'Economics & business', 'Languages', 'Other'] },
  usedMaterials: bool,
  kit: strict({ ...noteFields, emphasized: list(str), dates: list(strict({ title: str, date: str, kind: str })) }),
  concepts: list(strict({ name: str, quote: str, photo: num })),
  originalProblems: list(str),
  isReadable: bool,
})

export const outlineSchema = strict({
  title: str,
  summary: str,
  concepts: list(strict({ id: str, name: str })),
  units: list(strict({ title: str, goal: str, conceptIds: list(str) })),
})

const teachCards = [
  typed('read', { heading: str, body: str }),
  typed('example', { problem: str, steps: list(strict({ step: str, why: str })) }),
  typed('explore', { prompt: str, formula: str, xRange: list(num), yRange: list(num), sliders, notice: str }),
  typed('check', { question: str, choices }),
  typed('compare', { heading: str, columns: list(str), rows: list(strict({ label: str, left: str, right: str })) }),
  typed('remember', { points: list(str) }),
]

const blocks = [
  blockOf('step', { problem: str, hint: str, steps: list(strict({ prompt: str, choices })) }),
  blockOf('sandbox', { prompt: str, formula: str, xRange: list(num), yRange: list(num), sliders, target: namedValues, explain: str }),
  blockOf('order', { prompt: str, items: list(str), explain: str }),
  blockOf('spot', { problem: str, lines: list(str), wrongLine: num, why: str }),
  blockOf('sort', { prompt: str, buckets: list(str), items: list(strict({ text: str, bucket: num, why: str })) }),
  blockOf('calc', { prompt: str, formula: str, values: namedValues, tolerance: num, explain: str }),
  blockOf('explain', { prompt: str, points: list(str) }),
  blockOf('voice', { prompt: str, words: list(strict({ word: str, syllables: list(str) })) }),
  blockOf('catch', { prompt: str, items: list(strict({ text: str, good: bool, why: str })) }),
  blockOf('match', { prompt: str, pairs: list(strict({ term: str, meaning: str })) }),
  blockOf('flip', { prompt: str, pairs: list(strict({ term: str, meaning: str })) }),
  blockOf('fill', { prompt: str, sentence: str, answers: list(str), extras: list(str), explain: str }),
  blockOf('code', { prompt: str, starter: str, solution: str, expected: str, explain: str }),
]

export const unitSchema = strict({
  lessons: list(strict({
    title: str,
    intro: str,
    kind: { type: 'string', enum: ['learn', 'quiz'] },
    source: strict({ photo: num, quote: str }),
    teach: list({ anyOf: teachCards }),
    blocks: list({ anyOf: blocks }),
  })),
})

// Practice uses the same block shapes, minus code labs and voice activities.
const practiceTypes = new Set(['step', 'order', 'spot', 'sort', 'calc', 'catch', 'match', 'flip', 'fill', 'sandbox'])
export const practiceSchema = strict({
  blocks: list({ anyOf: blocks.filter((block) => practiceTypes.has((block.properties as { type: { enum: string[] } }).type.enum[0])) }),
})

export const answersSchema = strict({
  answers: list(strict({ id: str, option: num })),
})

export const reviewSchema = strict({
  issues: list(strict({ lesson: str, card: num, problem: str })),
})

export const tutorSchema = strict({
  explanation: str,
  misconception: str,
  hint: str,
  suggestedNextStep: str,
  unsure: bool,
})

export const coveredSchema = strict({
  covered: list(strict({ point: num, quote: str })),
})
