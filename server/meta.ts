// The only file that talks to Meta's API. The key lives on the server and is
// never sent to the browser. Nothing here runs unless AI_ENABLED is "true",
// so the app can be built, tested, and shown without spending anything.

const BASE = 'https://api.meta.ai/v1'
const TIMEOUT_MS = 120_000

export function aiEnabled(): boolean {
  return process.env.AI_ENABLED === 'true' && Boolean(process.env.MODEL_API_KEY)
}

function headers(): Record<string, string> {
  return { Authorization: `Bearer ${process.env.MODEL_API_KEY}` }
}

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

// Ask Muse Spark a question and get JSON back in exactly the shape of `schema`.
export async function askJson<T>(system: string, content: ContentPart[], name: string, schema: object): Promise<T> {
  const response = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'muse-spark-1.3',
      messages: [{ role: 'system', content: system }, { role: 'user', content }],
      response_format: { type: 'json_schema', json_schema: { name, schema } },
    }),
  })
  if (!response.ok) throw new Error(`Model API error ${response.status}`) // no request content in the message
  const data = await response.json() as { choices: { message: { content: string } }[] }
  return JSON.parse(data.choices[0].message.content) as T
}

// Turn a WAV recording into text with Muse Voice Transcribe.
export async function transcribe(wav: Buffer, keywords: string[]): Promise<string> {
  const form = new FormData()
  form.append('request', new Blob([JSON.stringify({
    mode: 'PUSH_TO_TALK', model: 'muse-voice-transcribe-1.0', audioEncoding: 'WAV', keywords,
  })], { type: 'application/json' }))
  form.append('audio', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), 'recording.wav')
  const response = await fetch(`${BASE}/asr/transcribe`, { method: 'POST', headers: headers(), body: form, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok) throw new Error(`Transcription error ${response.status}`)
  const data = await response.json() as { transcript?: string }
  if (typeof data.transcript !== 'string') throw new Error('Transcription response had no text')
  return data.transcript
}
