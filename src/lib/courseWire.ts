import type { Block, Lesson, TeachCard } from './course.ts'

// The AI's JSON format has to be fully spelled out, so it can't use open-ended
// maps like { a: 2, h: 1 }. It sends lists of { name, value } instead, and this
// turns them into the shapes the app uses. It also assigns ids in code, so ids
// are always unique no matter what the AI wrote.
export type NamedValue = { name: string; value: number }
export type WireBlock = Record<string, unknown> & { type: Block['type']; conceptId: string }
export type WireLesson = {
  title: string
  intro: string
  kind: 'learn' | 'quiz'
  source: { photo: number; quote: string }
  teach: TeachCard[]
  blocks: WireBlock[]
}
export type WireUnit = { lessons: WireLesson[] }
export type Outline = {
  title: string
  summary: string
  concepts: { id: string; name: string }[]
  units: { title: string; goal: string; conceptIds: string[] }[]
}

function toMap(list: unknown): Record<string, number> {
  return Object.fromEntries(((list ?? []) as NamedValue[]).map((item) => [item.name, item.value]))
}

// One unit's lessons, ready for the app. Unit numbers keep ids unique across the course.
export function fromWireUnit(wire: WireUnit, unitTitle: string, unitNumber: number): Lesson[] {
  return wire.lessons.map((lesson, l) => {
    const lessonId = `u${unitNumber}-l${l + 1}`
    return {
      id: lessonId,
      title: lesson.title,
      intro: lesson.intro,
      unit: unitTitle,
      kind: lesson.kind,
      source: lesson.source,
      teach: lesson.kind === 'quiz' ? [] : lesson.teach,
      blocks: lesson.blocks.map((block, b) => {
        const id = `${lessonId}-b${b + 1}`
        if (block.type === 'sandbox') return { ...block, id, target: toMap(block.target) } as Block
        if (block.type === 'calc') return { ...block, id, values: toMap(block.values) } as Block
        return { ...block, id } as Block
      }),
    }
  })
}

// Keep only the points whose quote really appears in what the student said. An
// AI can claim a point was covered, but it has to show the words.
export function provenCovered(transcript: string, covered: { point: number; quote: string }[], pointCount: number) {
  const simple = (text: string) => text.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
  const said = simple(transcript)
  return covered.filter((c) => Number.isInteger(c.point) && c.point >= 0 && c.point < pointCount
    && simple(c.quote).length > 0 && said.includes(simple(c.quote)))
}
