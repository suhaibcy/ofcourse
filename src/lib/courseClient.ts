import { allBlocks, type Course, type Lesson, type Level, type StudyKit } from './course'
import { removeBlocks } from './courseCheck'
import type { Outline } from './courseWire'
import { runCode } from './runCode'

// The app's side of the AI steps. The API key stays on the server; these
// functions only ask our own server to do the work.

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'Hoot could not finish that. Please try again.')
  return data as T
}

export async function aiAvailable(): Promise<boolean> {
  try {
    const response = await fetch('/api/status')
    return response.ok && ((await response.json()) as { ai: boolean }).ai === true
  } catch {
    return false
  }
}

export type BuildProgress = { stage: 'reading' | 'planning' | 'writing' | 'checking'; detail?: string }

// Actually run each coding activity's solution. If it doesn't print what the
// lesson promises, that activity never reaches the student.
async function checkCodeBlocks(course: Course): Promise<Course> {
  const broken: string[] = []
  for (const block of allBlocks(course)) {
    if (block.type !== 'code') continue
    const result = await runCode(block.solution)
    if (result.error || result.output.trim() !== block.expected.trim()) broken.push(block.id)
  }
  if (broken.length === 0) return course
  const checks = course.checks ?? { checkedQuestions: 0, removedBlocks: 0 }
  return { ...removeBlocks(course, broken), checks: { ...checks, removedBlocks: checks.removedBlocks + broken.length } }
}

type Reading = { subject: string; kit: StudyKit; usedMaterials: boolean }

// The fixed steps, run one at a time so the student can watch progress. Each unit
// is its own request, written side by side, so a long course doesn't hit a time limit.
export async function buildCourse(input: { topic: string; photos: string[]; text: string; level: Level }, onProgress: (progress: BuildProgress) => void): Promise<Course> {
  onProgress({ stage: 'reading' })
  const { reading } = await post<{ reading: Reading }>('/api/course', { action: 'read', ...input })
  onProgress({ stage: 'planning' })
  const { outline } = await post<{ outline: Outline }>('/api/course', { action: 'outline', reading, topic: input.topic, level: input.level })

  let written = 0
  const total = outline.units.length
  onProgress({ stage: 'writing', detail: `0 of ${total} units` })
  const units = await Promise.all(outline.units.map(async (_, unitIndex) => {
    const { lessons } = await post<{ lessons: Lesson[] }>('/api/course', { action: 'design', reading, outline, unitIndex, topic: input.topic, level: input.level })
    written += 1
    onProgress({ stage: 'writing', detail: `${written} of ${total} units` })
    return lessons
  }))

  onProgress({ stage: 'checking' })
  const draft: Course = { id: 'new', title: outline.title, summary: outline.summary, origin: 'generated', concepts: outline.concepts, lessons: units.flat() }
  const checked = await post<{ course: Course }>('/api/course', { action: 'verify', course: draft, reading })
  const final = await checkCodeBlocks(checked.course)
  return { ...final, subject: reading.subject, kit: reading.kit, basedOn: reading.usedMaterials ? 'materials' : 'general' }
}

export async function rewriteNotes(kit: StudyKit, level: Level): Promise<StudyKit> {
  const { notes } = await post<{ notes: Pick<StudyKit, 'summary' | 'keyIdeas' | 'terms'> }>('/api/course', { action: 'rewrite', kit, level })
  return { ...kit, ...notes }
}

export type ExplainResult = { transcript: string; covered: { point: number; quote: string }[] }

function toBase64(wav: ArrayBuffer): string {
  let binary = ''
  new Uint8Array(wav).forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

export function checkExplanation(wav: ArrayBuffer, prompt: string, points: string[]): Promise<ExplainResult> {
  return post<ExplainResult>('/api/explain', { audio: toBase64(wav), prompt, points })
}

export async function transcribeClip(wav: ArrayBuffer): Promise<string> {
  const { transcript } = await post<{ transcript: string }>('/api/say', { audio: toBase64(wav) })
  return transcript
}
