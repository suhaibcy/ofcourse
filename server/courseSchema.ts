// The exact JSON shapes Muse Spark must return. The API guarantees the shape;
// our own code in src/lib/courseCheck.ts then checks that the content makes sense.

const str = { type: 'string' }
const num = { type: 'number' }
const strict = (properties: Record<string, object>) => ({
  type: 'object', properties, required: Object.keys(properties), additionalProperties: false,
})
const list = (items: object) => ({ type: 'array', items })
const namedValues = list(strict({ name: str, value: num }))
const blockOf = (type: string, properties: Record<string, object>) =>
  strict({ type: { type: 'string', enum: [type] }, conceptId: str, ...properties })

const noteFields = {
  summary: str,
  keyIdeas: list(str),
  terms: list(strict({ term: str, meaning: str })),
}

export const notesSchema = strict(noteFields)

export const readingSchema = strict({
  topic: str,
  subject: { type: 'string', enum: ['Math', 'Science', 'Reading & writing', 'Coding', 'History & social studies', 'Languages', 'Other'] },
  kit: strict({ ...noteFields, dates: list(strict({ title: str, date: str, kind: str })) }),
  concepts: list(strict({ name: str, quote: str, photo: num })),
  originalProblems: list(str),
  isReadable: { type: 'boolean' },
})

const blocks = [
  blockOf('step', { problem: str, hint: str, steps: list(strict({
    prompt: str, choices: list(strict({ text: str, correct: { type: 'boolean' }, why: str })),
  })) }),
  blockOf('sandbox', { prompt: str, formula: str, xRange: list(num), yRange: list(num), sliders: list(strict({
    name: str, label: str, min: num, max: num, step: num, value: num,
  })), target: namedValues, explain: str }),
  blockOf('order', { prompt: str, items: list(str), explain: str }),
  blockOf('spot', { problem: str, lines: list(str), wrongLine: num, why: str }),
  blockOf('sort', { prompt: str, buckets: list(str), items: list(strict({ text: str, bucket: num, why: str })) }),
  blockOf('calc', { prompt: str, formula: str, values: namedValues, tolerance: num, explain: str }),
  blockOf('explain', { prompt: str, points: list(str) }),
  blockOf('voice', { prompt: str, words: list(strict({ word: str, syllables: list(str) })) }),
  blockOf('catch', { prompt: str, items: list(strict({ text: str, good: { type: 'boolean' }, why: str })) }),
  blockOf('match', { prompt: str, pairs: list(strict({ term: str, meaning: str })) }),
  blockOf('flip', { prompt: str, pairs: list(strict({ term: str, meaning: str })) }),
  blockOf('fill', { prompt: str, sentence: str, answers: list(str), extras: list(str), explain: str }),
  blockOf('code', { prompt: str, starter: str, solution: str, expected: str, explain: str }),
]

export const courseSchema = strict({
  title: str,
  summary: str,
  concepts: list(strict({ id: str, name: str })),
  lessons: list(strict({
    title: str,
    intro: str,
    source: strict({ photo: num, quote: str }),
    blocks: list({ anyOf: blocks }),
  })),
})

export const answersSchema = strict({
  answers: list(strict({ id: str, option: num })),
})

export const coveredSchema = strict({
  covered: list(strict({ point: num, quote: str })),
})
