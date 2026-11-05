// Meta's transcription API only takes WAV files, but phones record in other
// formats. This decodes the recording and rewrites it as mono, 16-bit, 24 kHz WAV.
const SAMPLE_RATE = 24000

export function encodeWav(samples: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i))
  }
  // The 44-byte header every WAV file starts with.
  text(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  text(8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // plain PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true) // bytes per second
  view.setUint16(32, 2, true) // bytes per sample
  view.setUint16(34, 16, true) // bits per sample
  text(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  samples.forEach((sample, i) => {
    const clamped = Math.max(-1, Math.min(1, sample))
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
  })
  return buffer
}

// Any audio the browser can play, as mono sound at the rate the API wants.
export async function decodeToMono(recording: Blob, maxSeconds = Infinity): Promise<Float32Array> {
  const context = new AudioContext()
  const decoded = await context.decodeAudioData(await recording.arrayBuffer())
  await context.close()
  if (decoded.duration > maxSeconds) throw new AudioTooLongError()
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * SAMPLE_RATE), SAMPLE_RATE)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start()
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0)
}

export class AudioTooLongError extends Error {}

export async function recordingToWav(recording: Blob): Promise<ArrayBuffer> {
  return encodeWav(await decodeToMono(recording))
}
