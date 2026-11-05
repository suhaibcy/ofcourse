// A short lecture recording becomes text the normal course steps can read. Audio is
// split into clips, because each transcription request has a size limit. It stays in
// memory only for this, and nothing here keeps it. The rules below are plain
// functions with no audio hardware, so they can be tested.

export const SAMPLE_RATE = 24000
export const MAX_LECTURE_SECONDS = 600 // 10 minutes. Decoding audio in a browser takes a lot of memory
export const MAX_CLIP_SECONDS = 55
const SEARCH_SECONDS = 3 // look this far back from the limit for a pause to cut at
const WINDOW_SECONDS = 0.05
const SILENCE = 0.003

function loudness(samples: Float32Array, from: number, to: number): number {
  let sum = 0
  for (let i = from; i < to; i++) sum += samples[i] * samples[i]
  return Math.sqrt(sum / Math.max(1, to - from))
}

// Where to end each clip, as sample positions. Each cut lands at the quietest moment
// near the limit, so a word is less likely to be split between two clips.
export function clipEnds(samples: Float32Array, rate = SAMPLE_RATE, maxSeconds = MAX_CLIP_SECONDS): number[] {
  const ends: number[] = []
  const max = Math.floor(maxSeconds * rate)
  const search = Math.floor(SEARCH_SECONDS * rate)
  const window = Math.floor(WINDOW_SECONDS * rate)
  let start = 0
  while (samples.length - start > max) {
    let best = start + max
    let quietest = Infinity
    for (let at = start + max - search; at + window <= start + max; at += window) {
      const level = loudness(samples, at, at + window)
      if (level < quietest) {
        quietest = level
        best = at + Math.floor(window / 2)
      }
    }
    ends.push(best)
    start = best
  }
  ends.push(samples.length)
  return ends
}

export function isSilent(samples: Float32Array): boolean {
  return loudness(samples, 0, samples.length) < SILENCE
}

// Clips in order, leaving out silence, so nobody pays to transcribe a quiet room.
export function splitIntoClips(samples: Float32Array, rate = SAMPLE_RATE, maxSeconds = MAX_CLIP_SECONDS): Float32Array[] {
  const clips: Float32Array[] = []
  let start = 0
  for (const end of clipEnds(samples, rate, maxSeconds)) {
    const clip = samples.subarray(start, end)
    if (!isSilent(clip)) clips.push(clip)
    start = end
  }
  return clips
}

export const TRANSCRIPT_HEADING = 'Lecture transcript (machine transcribed, so it may contain errors):'

// Transcription sometimes doubles a word ("like like food"), so a repeat is collapsed.
export const collapseRepeats = (text: string) => text.replace(/\b([a-z']+)(\s+\1\b)+/gi, '$1')

export const labelTranscript = (parts: string[]) => `${TRANSCRIPT_HEADING}\n${collapseRepeats(parts.map((part) => part.trim()).filter(Boolean).join(' '))}`

// Runs a few requests at once and keeps the results in order.
export async function inBatches<T, R>(items: T[], size: number, run: (item: T) => Promise<R>, onDone: (done: number) => void): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  let done = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await run(items[index])
      done += 1
      onDone(done)
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker))
  return results
}
