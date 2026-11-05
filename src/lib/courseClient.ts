import { allBlocks, type Block, type Course, type Lesson, type Level, type StudyKit } from './course'
import { dropUnprovenQuotes, removeBlocks } from './courseCheck'
import type { Outline } from './courseWire'
import { screenPractice, type PracticeRequest } from './practice'
import { inBatches, labelTranscript, MAX_LECTURE_SECONDS, splitIntoClips } from './lecture'
import { runCode } from './runCode'
import { decodeToMono, encodeWav } from './wavEncode'
import type { TutorReply, TutorRequest } from './tutor'

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

export type BuildInput = { topic: string; photos: string[]; text: string; level: Level }

// Finished steps of a build, saved as they complete. A failure or a refresh costs
// only the step in progress. Photos aren't kept: once read, they aren't needed.
export type BuildDraft = {
  topic: string
  level: Level
  sourceText: string // for checking quotes, empty when photos were used
  reading?: Reading
  outline?: Outline
  units: (Lesson[] | null)[]
}

export const startDraft = (input: BuildInput): BuildDraft => ({
  topic: input.topic, level: input.level, sourceText: input.photos.length === 0 ? input.text : '', units: [],
})

// One more try for a step that failed. The server has already retried temporary API errors.
async function twice<T>(step: () => Promise<T>): Promise<T> {
  try {
    return await step()
  } catch {
    return await step()
  }
}

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

export type Reading = { subject: string; kit: StudyKit; usedMaterials: boolean; originalProblems?: string[] }

// The fixed steps, run one at a time so the student can watch progress. Each unit
// is its own request, written side by side, so a long course doesn't hit a time limit.
// Steps already in the draft are skipped, so trying again picks up where it stopped.
export async function buildCourse(input: BuildInput, start: BuildDraft, saveDraft: (draft: BuildDraft) => void, onProgress: (progress: BuildProgress) => void): Promise<Course> {
  let progress = start
  const save = (change: Partial<BuildDraft>) => {
    progress = { ...progress, ...change }
    saveDraft(progress)
  }
  saveDraft(progress)

  onProgress({ stage: 'reading' })
  const reading = progress.reading ?? (await twice(() => post<{ reading: Reading }>('/api/course', { action: 'read', ...input }))).reading
  save({ reading })
  onProgress({ stage: 'planning' })
  const outline = progress.outline ?? (await twice(() => post<{ outline: Outline }>('/api/course', { action: 'outline', reading, topic: progress.topic, level: progress.level }))).outline
  save({ outline })

  const total = outline.units.length
  const countDone = () => progress.units.filter(Boolean).length
  onProgress({ stage: 'writing', detail: `${countDone()} of ${total} units` })
  await Promise.all(outline.units.map(async (_, unitIndex) => {
    if (progress.units[unitIndex]) return
    const { lessons } = await twice(() => post<{ lessons: Lesson[] }>('/api/course', { action: 'design', reading, outline, unitIndex, topic: progress.topic, level: progress.level }))
    const units = [...progress.units]
    units[unitIndex] = lessons
    save({ units })
    onProgress({ stage: 'writing', detail: `${countDone()} of ${total} units` })
  }))

  onProgress({ stage: 'checking' })
  const draft: Course = { id: 'new', title: outline.title, summary: outline.summary, origin: 'generated', concepts: outline.concepts, lessons: progress.units.flatMap((unit) => unit ?? []) }
  const checked = await twice(() => post<{ course: Course }>('/api/course', { action: 'verify', course: draft, reading }))
  const final = await checkCodeBlocks(checked.course)
  const proven = progress.sourceText ? dropUnprovenQuotes(final, progress.sourceText) : final
  return { ...proven, subject: reading.subject, kit: reading.kit, basedOn: reading.usedMaterials ? 'materials' : 'general', originalProblems: reading.originalProblems ?? [] }
}

export async function rewriteNotes(kit: StudyKit, level: Level): Promise<StudyKit> {
  const { notes } = await post<{ notes: Pick<StudyKit, 'summary' | 'keyIdeas' | 'terms'> }>('/api/course', { action: 'rewrite', kit, level })
  return { ...kit, ...notes }
}

export async function askTutor(request: TutorRequest): Promise<TutorReply> {
  const { reply } = await post<{ reply: TutorReply }>('/api/tutor', request)
  return reply
}

// New activities for one concept. The server already checked them; the browser checks
// again before anything is saved, so a bad reply can't reach the player.
export async function generatePractice(request: PracticeRequest): Promise<Block[]> {
  const { blocks } = await post<{ blocks: Block[] }>('/api/course', { action: 'practice', ...request })
  const screened = screenPractice(blocks ?? [], request.avoid).blocks
  if (screened.length === 0) throw new Error('No usable practice came back.')
  return screened
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

// A short recording becomes labeled text, clip by clip, through the same transcription
// route the voice games use. The audio is only held in memory for this.
export async function transcribeLecture(file: Blob, onProgress: (done: number, total: number) => void): Promise<string> {
  const clips = splitIntoClips(await decodeToMono(file, MAX_LECTURE_SECONDS))
  onProgress(0, clips.length)
  const parts = await inBatches(clips, 3, (clip) => transcribeClip(encodeWav(clip)), (done) => onProgress(done, clips.length))
  if (!parts.some((part) => part.trim())) throw new Error('No words found.')
  return labelTranscript(parts)
}

export async function transcribeClip(wav: ArrayBuffer): Promise<string> {
  const { transcript } = await post<{ transcript: string }>('/api/say', { audio: toBase64(wav) })
  return transcript
}
