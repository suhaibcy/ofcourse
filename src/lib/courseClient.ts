import type { Course } from './course'

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

export type BuildStage = 'reading' | 'designing' | 'checking'

// The fixed steps, run one at a time so the student can watch progress and no
// single server call runs too long.
export async function buildCourse(input: { photos: string[]; text: string; goal: string }, onStage: (stage: BuildStage) => void): Promise<Course> {
  onStage('reading')
  const { reading } = await post<{ reading: unknown }>('/api/course', { action: 'read', ...input })
  onStage('designing')
  const { course } = await post<{ course: Course }>('/api/course', { action: 'design', reading, goal: input.goal })
  onStage('checking')
  const checked = await post<{ course: Course }>('/api/course', { action: 'verify', course, reading })
  return checked.course
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
