import { useEffect, useRef, useState } from 'react'
import { checkExplanation, type ExplainResult } from '../../lib/courseClient'
import type { ExplainBlock } from '../../lib/course'
import { recordingToWav } from '../../lib/wavEncode'
import { Button } from '../Button'
import { Icon } from '../Icon'
import type { BlockProps } from './blockTypes'

const MAX_SECONDS = 60

// Say it out loud, then see which points you covered. If the AI isn't available,
// the student checks themselves against the list instead, and the screen says so.
export function ExplainBack({ block, onFinish, aiOn }: BlockProps<ExplainBlock> & { aiOn: boolean }) {
  const [state, setState] = useState<'ready' | 'recording' | 'checking' | 'done' | 'self'>(aiOn ? 'ready' : 'self')
  const [seconds, setSeconds] = useState(0)
  const [result, setResult] = useState<ExplainResult | null>(null)
  const [selfChecked, setSelfChecked] = useState<number[]>([])
  const [error, setError] = useState('')
  const recorder = useRef<MediaRecorder | null>(null)

  useEffect(() => {
    if (state !== 'recording') return
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [state])

  useEffect(() => {
    if (seconds >= MAX_SECONDS) recorder.current?.stop()
  }, [seconds])

  // Let go of the microphone if the student leaves mid-recording.
  useEffect(() => () => {
    if (recorder.current?.state === 'recording') recorder.current.stop()
  }, [])

  async function start() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        setState('checking')
        try {
          const wav = await recordingToWav(new Blob(chunks, { type: mediaRecorder.mimeType }))
          setResult(await checkExplanation(wav, block.prompt, block.points))
          setState('done')
        } catch {
          setError('Hoot could not check that recording. You can check yourself instead.')
          setState('self')
        }
      }
      recorder.current = mediaRecorder
      mediaRecorder.start()
      setSeconds(0)
      setState('recording')
    } catch {
      setError('The microphone is off, so check yourself against the list instead.')
      setState('self')
    }
  }

  return (
    <div className="block">
      <p className="block__prompt">{block.prompt}</p>
      {error && <p className="feedback feedback--wrong" role="status">{error}</p>}

      {state === 'ready' && <Button block onClick={start}><Icon name="mic" size={20} /> Start talking</Button>}
      {state === 'recording' && (
        <>
          <p className="recording" role="status"><span className="recording__dot" aria-hidden="true" /> Listening... {seconds}s of {MAX_SECONDS}s</p>
          <Button block onClick={() => recorder.current?.stop()}>I'm done</Button>
        </>
      )}
      {state === 'checking' && <p className="muted" role="status">Hoot is listening back...</p>}

      {state === 'done' && result && (
        <>
          <p className="transcript">"{result.transcript}"</p>
          <ul className="point-list">
            {block.points.map((point, i) => {
              const hit = result.covered.find((c) => c.point === i)
              return (
                <li key={i} className={hit ? 'point point--hit' : 'point'}>
                  <strong>{hit ? 'Covered' : 'Missing'}:</strong> {point}
                  {hit && <span className="point__quote"> You said: "{hit.quote}"</span>}
                </li>
              )
            })}
          </ul>
          <Button block onClick={() => onFinish(result.covered.length === block.points.length)}>Finish</Button>
        </>
      )}

      {state === 'self' && (
        <>
          <p className="muted">Say your answer out loud, then tick each point you covered.</p>
          <ul className="point-list">
            {block.points.map((point, i) => (
              <li key={i}>
                <label className="point point--check">
                  <input type="checkbox" checked={selfChecked.includes(i)}
                    onChange={(e) => setSelfChecked(e.target.checked ? [...selfChecked, i] : selfChecked.filter((n) => n !== i))} />
                  <span>{point}</span>
                </label>
              </li>
            ))}
          </ul>
          <Button block onClick={() => onFinish(selfChecked.length === block.points.length)}>Finish</Button>
        </>
      )}
    </div>
  )
}
