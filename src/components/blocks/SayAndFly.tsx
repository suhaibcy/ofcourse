import { useEffect, useRef, useState } from 'react'
import type { VoiceBlock } from '../../lib/course'
import { transcribeClip } from '../../lib/courseClient'
import { chime, openMic, speak, type Mic } from '../../lib/mic'
import { heardWord, HOOT_X, LoudnessMeter, ringHeight, startFlight, stepFlight, type Flight } from '../../lib/voiceGame'
import { recordingToWav } from '../../lib/wavEncode'
import { Button } from '../Button'
import { Hoot } from '../Hoot'
import { Icon } from '../Icon'
import type { BlockProps } from './blockTypes'

const MAX_WORD_MS = 4000
const TRIES_BEFORE_SKIP = 2

// Say each word (Muse Voice Transcribe listens), which unlocks Hoot Flight:
// your voice flies Hoot through letter rings to spell the last word.
export function SayAndFly({ block, onMiss, onFinish, aiOn }: BlockProps<VoiceBlock> & { aiOn: boolean }) {
  const [phase, setPhase] = useState<'say' | 'unlocked' | 'fly' | 'won'>('say')
  const [index, setIndex] = useState(0)
  const [state, setState] = useState<'ready' | 'listening' | 'checking' | 'right' | 'wrong' | 'practice'>('ready')
  const [heard, setHeard] = useState('')
  const [tries, setTries] = useState(0)
  const [missed, setMissed] = useState(false)
  const [activeSyllable, setActiveSyllable] = useState(-1)
  const [error, setError] = useState('')
  const stopRecording = useRef<(() => void) | null>(null)
  const timers = useRef<number[]>([])

  useEffect(() => () => {
    timers.current.forEach(clearTimeout)
    stopRecording.current?.()
  }, [])

  const item = block.words[index]
  const lastWord = block.words[block.words.length - 1].word

  // Say the word, lighting up each part in turn so the student sees how it breaks down.
  function soundOut() {
    speak(item.word)
    timers.current.forEach(clearTimeout)
    timers.current = item.syllables.map((_, i) => window.setTimeout(() => setActiveSyllable(i), i * 320))
    timers.current.push(window.setTimeout(() => setActiveSyllable(-1), item.syllables.length * 320 + 300))
  }

  async function listen() {
    setError('')
    let mic: Mic
    try {
      mic = await openMic()
    } catch {
      setError('Hoot needs the microphone for this one. You can say it to yourself and keep going.')
      setState('practice')
      return
    }
    setState('listening')
    const recording = mic.record(MAX_WORD_MS)
    stopRecording.current = recording.stop
    const clip = await recording.done
    stopRecording.current = null
    mic.close()
    if (!aiOn) {
      setState('practice')
      return
    }
    setState('checking')
    try {
      const transcript = await transcribeClip(await recordingToWav(clip))
      setHeard(transcript)
      if (heardWord(transcript, item.word)) {
        chime('right')
        setState('right')
      } else {
        chime('wrong')
        setMissed(true)
        setTries(tries + 1)
        onMiss()
        setState('wrong')
      }
    } catch {
      setError('Hoot could not listen just now. Say it to yourself and keep going.')
      setState('practice')
    }
  }

  function nextWord() {
    if (index === block.words.length - 1) {
      chime('win')
      setPhase('unlocked')
      return
    }
    setIndex(index + 1)
    setTries(0)
    setHeard('')
    setState('ready')
  }

  if (phase === 'unlocked') {
    return (
      <div className="block block--center">
        <Hoot pose="celebrate" size={108} animate decorative />
        <p className="block__prompt">You unlocked Hoot Flight!</p>
        <p className="muted">Your voice is his wings. Talk louder to fly up, go quiet to glide down. Fly through the rings to spell <strong>{lastWord}</strong>.</p>
        <Button block onClick={() => setPhase('fly')}>Take off</Button>
      </div>
    )
  }

  if (phase === 'fly') return <HootFlight word={lastWord} onWin={() => { chime('win'); setPhase('won') }} onSkip={() => onFinish(!missed)} />

  if (phase === 'won') {
    return (
      <div className="block block--center">
        <Hoot pose="celebrate" size={108} animate decorative />
        <p className="block__prompt">You spelled {lastWord.toUpperCase()} with your voice!</p>
        <Button block onClick={() => onFinish(!missed)}>Finish</Button>
      </div>
    )
  }

  return (
    <div className="block">
      <p className="block__prompt">{block.prompt}</p>
      <p className="sort-count">Word {index + 1} of {block.words.length}</p>
      <button type="button" className="say-card" onClick={soundOut} aria-label={`Hear ${item.word}`}>
        <span className="say-card__parts">
          {item.syllables.map((part, i) => (
            <span key={i} className={i === activeSyllable ? 'say-part say-part--on' : 'say-part'}>{part}</span>
          ))}
        </span>
        <span className="say-card__hear"><Icon name="ask" size={16} /> Tap to hear it</span>
      </button>

      {error && <p className="feedback" role="status">{error}</p>}
      {state === 'ready' && <Button block onClick={() => void listen()}><Icon name="mic" size={20} /> Say it</Button>}
      {state === 'listening' && (
        <>
          <p className="recording" role="status"><span className="recording__dot" aria-hidden="true" /> Hoot is listening...</p>
          <Button block variant="secondary" onClick={() => stopRecording.current?.()}>I said it</Button>
        </>
      )}
      {state === 'checking' && <p className="muted" role="status">Checking what Hoot heard...</p>}
      {state === 'right' && (
        <>
          <p className="feedback feedback--right" role="status">Hoot heard "{heard}". That's the word!</p>
          <Button block onClick={nextWord}>{index === block.words.length - 1 ? 'Unlock the game' : 'Next word'}</Button>
        </>
      )}
      {state === 'wrong' && (
        <>
          <p className="feedback feedback--wrong" role="status">Hoot heard "{heard || 'nothing'}". Tap the word to hear it, then try again.</p>
          <Button block onClick={() => void listen()}><Icon name="mic" size={20} /> Try again</Button>
          {tries >= TRIES_BEFORE_SKIP && <Button variant="ghost" small onClick={nextWord}>Keep going</Button>}
        </>
      )}
      {state === 'practice' && (
        <>
          <p className="feedback" role="status">Practice mode: Hoot isn't checking words right now.</p>
          <Button block onClick={nextWord}>{index === block.words.length - 1 ? 'Unlock the game' : 'I said it, next'}</Button>
        </>
      )}
    </div>
  )
}

// The game itself. Positions update every frame through refs, not React state,
// so it stays smooth on a phone. If there's no microphone, press and hold to fly.
function HootFlight({ word, onWin, onSkip }: { word: string; onWin: () => void; onSkip: () => void }) {
  const [collected, setCollected] = useState(0)
  const [starting, setStarting] = useState(true)
  const [noMic, setNoMic] = useState(false)
  const [message, setMessage] = useState('Say anything to take off!')
  const hootEl = useRef<HTMLDivElement>(null)
  const ringEl = useRef<HTMLDivElement>(null)
  const meterEl = useRef<HTMLSpanElement>(null)
  const holding = useRef(false)
  const onWinRef = useRef(onWin)

  useEffect(() => {
    let frame = 0
    let mic: Mic | null = null
    let closed = false
    const meter = new LoudnessMeter()

    async function begin() {
      try {
        mic = await openMic()
        if (closed) mic.close()
      } catch {
        setNoMic(true)
        setMessage('Press and hold to fly up. Let go to glide down.')
      }
      setStarting(false)
      let flight: Flight = startFlight(word, ringHeight)
      let last = performance.now()
      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000)
        last = now
        const loudness = mic ? meter.read(mic.rms()) : holding.current ? 0.8 : 0
        const before = flight.letterIndex
        flight = stepFlight(flight, loudness, dt, ringHeight)
        if (hootEl.current) hootEl.current.style.bottom = `${6 + flight.hootY * 78}%`
        if (meterEl.current) meterEl.current.style.transform = `scaleY(${loudness})`
        if (ringEl.current) {
          ringEl.current.style.left = `${flight.ringX * 100}%`
          ringEl.current.style.bottom = `${6 + flight.ringY * 78}%`
          ringEl.current.textContent = flight.word[flight.letterIndex] ?? ''
        }
        if (flight.letterIndex !== before) {
          setCollected(flight.letterIndex)
          setMessage('Got it!')
          chime('right')
        } else if (flight.flash === 'missed') {
          setMessage(`It'll come back around. Line up with ${flight.word[flight.letterIndex]}.`)
        }
        if (flight.done) {
          onWinRef.current()
          return
        }
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }
    void begin()
    return () => {
      closed = true
      cancelAnimationFrame(frame)
      mic?.close()
    }
  }, [word])

  const letters = word.toUpperCase().split('')
  return (
    <div className="block">
      <div className="spelled" aria-label={`Spelled so far: ${letters.slice(0, collected).join('')}`}>
        {letters.map((letter, i) => (
          <span key={i} className={i < collected ? 'spelled__letter spelled__letter--got' : 'spelled__letter'}>{letter}</span>
        ))}
      </div>
      <div className="sky" onPointerDown={() => { holding.current = true }} onPointerUp={() => { holding.current = false }}
        onPointerLeave={() => { holding.current = false }} onPointerCancel={() => { holding.current = false }}>
        <span className="sky__cloud sky__cloud--a" aria-hidden="true" />
        <span className="sky__cloud sky__cloud--b" aria-hidden="true" />
        <span className="sky__ground" aria-hidden="true" />
        {!noMic && <span className="sky__meter" aria-hidden="true"><span ref={meterEl} /></span>}
        <div ref={ringEl} className="sky__ring" aria-hidden="true" />
        <div ref={hootEl} className="sky__hoot" style={{ left: `${HOOT_X * 100}%` }}><Hoot pose="celebrate" size={64} decorative /></div>
      </div>
      <p className="muted flight-message" role="status">{starting ? 'Getting the microphone ready...' : message}</p>
      <Button variant="ghost" small onClick={onSkip}>Skip the game</Button>
    </div>
  )
}
