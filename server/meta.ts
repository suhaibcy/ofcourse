// The only file that talks to Meta's API. The key lives on the server and is
// never sent to the browser. Nothing here runs unless AI_ENABLED is "true",
// so the app can be built, tested, and shown without spending anything.

const BASE = 'https://api.meta.ai/v1'
const TIMEOUT_MS = 120_000
const MAX_ATTEMPTS = 3 // the first try plus two retries
const BACKOFF_MS = 500
const MAX_WAIT_MS = 10_000 // if the API asks us to wait longer than this, stop instead of holding the request open
const RETRYABLE = new Set([429, 500, 502, 503, 504])

export function aiEnabled(): boolean {
  return process.env.AI_ENABLED === 'true' && Boolean(process.env.MODEL_API_KEY)
}

function headers(): Record<string, string> {
  return { Authorization: `Bearer ${process.env.MODEL_API_KEY}` }
}

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

// Why a reply couldn't be used. None of these messages contain request content.
export type ReplyProblem = 'truncated' | 'refused' | 'invalid'
export class ModelReplyError extends Error {
  readonly problem: ReplyProblem
  constructor(problem: ReplyProblem) {
    super(`Model reply was ${problem}`)
    this.problem = problem
  }
}

// The API still said no after our retries.
export class ModelApiError extends Error {
  readonly status: number
  constructor(status: number) {
    super(`Model API error ${status}`)
    this.status = status
  }
}

// How long to wait before the next try, or null to stop trying. The API's own
// Retry-After (seconds or a date) wins over our doubling delay.
export function retryDelay(attempt: number, retryAfter: string | null, now = Date.now(), random = Math.random()): number | null {
  if (retryAfter) {
    const seconds = Number(retryAfter)
    const wait = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - now
    if (Number.isFinite(wait)) return wait > MAX_WAIT_MS ? null : Math.max(0, wait)
  }
  return BACKOFF_MS * 2 ** attempt + random * BACKOFF_MS // the random part stops many requests retrying in step
}

// A request that tries again on temporary failures. A timeout isn't retried: it
// already took the whole time limit, and someone is waiting on the answer.
async function send(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    let response: Response
    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
    } catch (error) {
      // A dropped connection is worth retrying. A timeout has already used up its time.
      if (!(error instanceof TypeError) || attempt === MAX_ATTEMPTS - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt, null) ?? BACKOFF_MS))
      continue
    }
    if (response.ok) return response
    if (!RETRYABLE.has(response.status) || attempt === MAX_ATTEMPTS - 1) throw new ModelApiError(response.status)
    const wait = retryDelay(attempt, response.headers.get('retry-after'))
    if (wait === null) throw new ModelApiError(response.status)
    await new Promise((resolve) => setTimeout(resolve, wait))
  }
}

type Completion = { choices?: { finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }[] }

// Pull the JSON out of a reply, saying exactly what's wrong if we can't.
export function readReply<T>(data: Completion): T {
  const choice = data.choices?.[0]
  if (choice?.message?.refusal || choice?.finish_reason === 'content_filter') throw new ModelReplyError('refused')
  if (choice?.finish_reason === 'length') throw new ModelReplyError('truncated')
  const content = choice?.message?.content
  if (typeof content !== 'string') throw new ModelReplyError('invalid')
  try {
    return JSON.parse(content) as T
  } catch {
    throw new ModelReplyError('invalid')
  }
}

export type AskOptions = { effort?: 'minimal' | 'low' | 'medium' | 'high'; timeoutMs?: number }

// Ask Muse Spark a question and get JSON back in exactly the shape of `schema`.
export async function askJson<T>(system: string, content: ContentPart[], name: string, schema: object, options: AskOptions = {}): Promise<T> {
  const response = await send(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'muse-spark-1.3',
      messages: [{ role: 'system', content: system }, { role: 'user', content }],
      response_format: { type: 'json_schema', json_schema: { name, schema } },
      ...(options.effort ? { reasoning_effort: options.effort } : {}),
    }),
  }, options.timeoutMs ?? TIMEOUT_MS)
  let data: Completion
  try {
    data = await response.json() as Completion
  } catch {
    throw new ModelReplyError('invalid')
  }
  return readReply<T>(data)
}

// Turn a WAV recording into text with Muse Voice Transcribe.
export async function transcribe(wav: Buffer, keywords: string[]): Promise<string> {
  const form = new FormData()
  form.append('request', new Blob([JSON.stringify({
    mode: 'PUSH_TO_TALK', model: 'muse-voice-transcribe-1.0', audioEncoding: 'WAV', keywords,
  })], { type: 'application/json' }))
  form.append('audio', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), 'recording.wav')
  const response = await send(`${BASE}/asr/transcribe`, { method: 'POST', headers: headers(), body: form }, TIMEOUT_MS)
  const data = await response.json() as { transcript?: string }
  if (typeof data.transcript !== 'string') throw new Error('Transcription response had no text')
  return data.transcript
}
