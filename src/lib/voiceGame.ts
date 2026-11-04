// The rules of the voice games, with no screens or microphones, so they can be tested.

// Did the transcription contain this exact word? This can't grade every sound
// (the API gives no per-sound scores), so the game says what it heard instead
// of claiming a pronunciation score.
export function heardWord(transcript: string, word: string): boolean {
  const simple = (text: string) => text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  const target = simple(word).join(' ')
  return target.length > 0 && ` ${simple(transcript).join(' ')} `.includes(` ${target} `)
}

// Hoot Flight: fly through rings to spell a word. Louder = higher, quiet = lower.
export type Flight = {
  word: string
  letterIndex: number // the next letter to collect
  hootY: number // 0 = ground, 1 = top of the sky
  ringX: number // 1 = right edge, 0 = left edge
  ringY: number
  flash: 'none' | 'got' | 'missed'
  done: boolean
}

export const HOOT_X = 0.25 // where Hoot stays across the screen
export const RING_REACH = 0.17 // how close in height counts as flying through
const RING_SPEED = 0.42 // screen widths per second
const RING_START = 1.1

export function startFlight(word: string, nextY: () => number): Flight {
  return { word: word.toUpperCase(), letterIndex: 0, hootY: 0, ringX: RING_START, ringY: nextY(), flash: 'none', done: false }
}

// One tick of the game. `loudness` is 0 to 1; dt is seconds since the last tick.
export function stepFlight(state: Flight, loudness: number, dt: number, nextY: () => number): Flight {
  if (state.done) return state
  const target = Math.min(1, Math.max(0, loudness))
  const hootY = state.hootY + (target - state.hootY) * Math.min(1, dt * 6) // smooth, so a voice wobble doesn't jolt him
  const ringX = state.ringX - RING_SPEED * dt
  const passing = state.ringX > HOOT_X && ringX <= HOOT_X

  if (passing && Math.abs(hootY - state.ringY) <= RING_REACH) {
    const letterIndex = state.letterIndex + 1
    return { ...state, hootY, letterIndex, ringX: RING_START, ringY: nextY(), flash: 'got', done: letterIndex >= state.word.length }
  }
  if (ringX < -0.1) return { ...state, hootY, ringX: RING_START, ringY: nextY(), flash: 'missed' } // the same letter comes around again
  return { ...state, hootY, ringX, flash: 'none' }
}

// Ring heights a voice can reach comfortably: never right at the ground or the very top.
export function ringHeight(): number {
  return 0.25 + Math.random() * 0.55
}

// Turns raw microphone volume into 0 to 1, adjusting to the room and the speaker.
export class LoudnessMeter {
  private floor = 0.02
  private peak = 0.08

  read(rms: number): number {
    // The floor follows the room's noise. It never reaches 0, or it could never rise again.
    this.floor = Math.max(0.002, rms < this.floor ? rms : Math.min(rms, this.floor * 1.002))
    this.peak = Math.max(0.05, rms > this.peak ? rms : this.peak * 0.998)
    const span = this.peak - this.floor * 1.5
    return span <= 0 ? 0 : Math.min(1, Math.max(0, (rms - this.floor * 1.5) / span))
  }
}
