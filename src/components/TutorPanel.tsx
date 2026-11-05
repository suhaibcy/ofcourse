import { useEffect, useRef, useState } from 'react'
import { askTutor } from '../lib/courseClient'
import { checkTutorReply, type TutorReply, type TutorRequest } from '../lib/tutor'
import { Button } from './Button'
import { Hoot } from './Hoot'

type TutorPanelProps = {
  build: (ask: string) => TutorRequest
  label: string
  fallback?: string // text already written for this question, shown if the AI can't answer
  allowQuestion?: boolean // lets the learner type what they want to know
  onAsk?: () => void
  onReply?: (reply: TutorReply) => void
  onPractice?: () => void // offers new questions on this concept
}

// Live help from Hoot, one question at a time. If the AI fails or its reply doesn't
// pass our checks, the learner sees the lesson's own explanation and carries on.
export function TutorPanel({ build, label, fallback, allowQuestion = false, onAsk, onReply, onPractice }: TutorPanelProps) {
  const [state, setState] = useState<'idle' | 'typing' | 'thinking' | 'done' | 'failed'>('idle')
  const [reply, setReply] = useState<TutorReply | null>(null)
  const [ask, setAsk] = useState('')
  const panel = useRef<HTMLElement>(null)

  // The answer can land below the fold, so bring it into view when it arrives.
  useEffect(() => {
    if (state === 'done' || state === 'failed') panel.current?.scrollIntoView({ block: 'nearest' })
  }, [state])

  async function request() {
    setState('thinking')
    onAsk?.()
    try {
      const outgoing = build(ask.trim())
      const answer = await askTutor(outgoing)
      if (checkTutorReply(answer, outgoing).length > 0) throw new Error('reply failed checks')
      setReply(answer)
      onReply?.(answer)
      setState('done')
    } catch {
      setState('failed')
    }
  }

  if (state === 'idle') {
    return (
      <div className="tutor tutor--offer">
        <Hoot pose="look" size={44} decorative />
        <Button small variant="secondary" onClick={() => (allowQuestion ? setState('typing') : void request())}>{label}</Button>
      </div>
    )
  }

  return (
    <section ref={panel} className="tutor" aria-live="polite" aria-label="Help from Hoot">
      <div className="tutor__head">
        <Hoot pose={state === 'thinking' ? 'think' : state === 'failed' ? 'oops' : 'point'} size={56} animate decorative />
        <strong>{state === 'thinking' ? 'Hoot is thinking...' : state === 'failed' ? "Hoot can't answer right now" : state === 'typing' ? 'What should Hoot explain?' : 'Here is what Hoot thinks'}</strong>
      </div>

      {state === 'typing' && (
        <>
          <textarea className="input learn-textarea" rows={2} maxLength={300} aria-label="Your question for Hoot" value={ask}
            placeholder="Leave this empty and Hoot will explain it another way" onChange={(e) => setAsk(e.target.value)} />
          <Button block onClick={() => void request()}>Ask Hoot</Button>
        </>
      )}

      {state === 'done' && reply && (
        <>
          {reply.misconception.trim() && <div className="tutor__part"><span className="tutor__label">What might have happened</span><p>{reply.misconception}</p></div>}
          <div className="tutor__part"><p>{reply.explanation}</p></div>
          {reply.hint.trim() && <div className="tutor__part tutor__part--hint"><span className="tutor__label">Try this</span><p>{reply.hint}</p></div>}
          {reply.suggestedNextStep.trim() && <div className="tutor__part"><span className="tutor__label">Next</span><p>{reply.suggestedNextStep}</p></div>}
          {reply.unsure && <p className="tutor__unsure">Hoot isn't certain about this one. Check it against your own materials.</p>}
          {onPractice && <Button block onClick={onPractice}>Practice this</Button>}
          <p className="tutor__credit">Live AI answer from Meta's Muse Spark. AI can make mistakes.</p>
        </>
      )}

      {state === 'failed' && (
        <>
          {fallback && <div className="tutor__part"><span className="tutor__label">From this lesson</span><p>{fallback}</p></div>}
          {onPractice && <Button block variant="secondary" onClick={onPractice}>Practice this</Button>}
          <Button small variant="ghost" onClick={() => void request()}>Try again</Button>
        </>
      )}
    </section>
  )
}
