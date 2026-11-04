// The microphone, for both recording a word and reading volume during a game.
// Sound stays on the device unless a recording is sent to be transcribed.
export type Mic = {
  rms: () => number // current volume
  record: (maxMs: number) => { done: Promise<Blob>; stop: () => void }
  close: () => void
}

export async function openMic(): Promise<Mic> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } })
  const context = new AudioContext()
  await context.resume() // phones start audio paused until a tap
  const analyser = context.createAnalyser()
  analyser.fftSize = 1024
  context.createMediaStreamSource(stream).connect(analyser)
  const samples = new Float32Array(analyser.fftSize)

  return {
    rms() {
      analyser.getFloatTimeDomainData(samples)
      return Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / samples.length)
    },
    record(maxMs) {
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => chunks.push(e.data)
      const done = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType }))
      })
      recorder.start()
      const timer = setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, maxMs)
      return { done, stop: () => { clearTimeout(timer); if (recorder.state === 'recording') recorder.stop() } }
    },
    close() {
      stream.getTracks().forEach((track) => track.stop())
      void context.close()
    },
  }
}

// Read a word aloud slowly with the phone's built-in voice.
export function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.75
  window.speechSynthesis.speak(utterance)
}

// Small game sounds, made in code so there are no audio files to license.
export function chime(kind: 'right' | 'wrong' | 'win') {
  try {
    const context = new AudioContext()
    const notes = kind === 'win' ? [523, 659, 784, 1047] : kind === 'right' ? [659, 880] : [220]
    notes.forEach((frequency, i) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const start = context.currentTime + i * 0.09
      oscillator.type = kind === 'wrong' ? 'triangle' : 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.24)
    })
    setTimeout(() => void context.close(), 800)
  } catch {
    // No sound available: the game still works.
  }
}
