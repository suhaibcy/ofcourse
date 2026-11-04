import type { Block, Course, Lesson } from './course.ts'

// The AI's JSON format has to be fully spelled out, so it can't use open-ended
// maps like { a: 2, h: 1 }. It sends lists of { name, value } instead, and this
// turns them into the shapes the app uses. It also assigns ids in code, so ids
// are always unique no matter what the AI wrote.
export type NamedValue = { name: string; value: number }
export type WireBlock = Record<string, unknown> & { type: Block['type']; conceptId: string }
export type WireCourse = {
  title: string
  summary: string
  concepts: { id: string; name: string }[]
  lessons: { title: string; intro: string; source: { photo: number; quote: string }; blocks: WireBlock[] }[]
}

function toMap(list: unknown): Record<string, number> {
  return Object.fromEntries(((list ?? []) as NamedValue[]).map((item) => [item.name, item.value]))
}

export function fromWire(wire: WireCourse): Course {
  const lessons: Lesson[] = wire.lessons.map((lesson, l) => ({
    id: `l${l + 1}`,
    title: lesson.title,
    intro: lesson.intro,
    source: lesson.source,
    blocks: lesson.blocks.map((block, b) => {
      const id = `l${l + 1}-b${b + 1}`
      if (block.type === 'sandbox') return { ...block, id, target: toMap(block.target) } as Block
      if (block.type === 'calc') return { ...block, id, values: toMap(block.values) } as Block
      return { ...block, id } as Block
    }),
  }))
  return { id: 'new', title: wire.title, summary: wire.summary, origin: 'generated', concepts: wire.concepts, lessons }
}

// Keep only the points whose quote really appears in what the student said. An
// AI can claim a point was covered, but it has to show the words.
export function provenCovered(transcript: string, covered: { point: number; quote: string }[], pointCount: number) {
  const simple = (text: string) => text.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
  const said = simple(transcript)
  return covered.filter((c) => Number.isInteger(c.point) && c.point >= 0 && c.point < pointCount
    && simple(c.quote).length > 0 && said.includes(simple(c.quote)))
}
