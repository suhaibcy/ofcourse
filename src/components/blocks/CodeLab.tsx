import { useState } from 'react'
import type { CodeBlock } from '../../lib/course'
import { chime } from '../../lib/mic'
import { runCode, type RunResult } from '../../lib/runCode'
import { Button } from '../Button'
import type { BlockProps } from './blockTypes'

// A small hands-on lab: edit real code, run it, and see what it prints.
export function CodeLab({ block, onMiss, onFinish }: BlockProps<CodeBlock>) {
  const [code, setCode] = useState(block.starter)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const [solved, setSolved] = useState(false)
  const [runs, setRuns] = useState(0)
  const [missed, setMissed] = useState(false)

  async function run() {
    setRunning(true)
    const ran = await runCode(code)
    setRunning(false)
    setResult(ran)
    setRuns(runs + 1)
    if (!ran.error && ran.output.trim() === block.expected.trim()) {
      setSolved(true)
      chime('win')
    } else {
      setMissed(true)
      chime('wrong')
      onMiss()
    }
  }

  return (
    <div className="block">
      <p className="block__prompt">{block.prompt}</p>
      <textarea className="code-editor" aria-label="Code editor" rows={Math.max(5, code.split('\n').length + 1)} value={code} readOnly={solved}
        spellCheck={false} autoCapitalize="off" autoCorrect="off" onChange={(e) => setCode(e.target.value)} />
      <div className="code-goal"><span>Should print</span><pre>{block.expected}</pre></div>
      {result && (
        <div className={result.error ? 'code-goal code-goal--error' : solved ? 'code-goal code-goal--right' : 'code-goal code-goal--wrong'} role="status">
          <span>{result.error ? 'Error' : 'Your code printed'}</span>
          <pre>{result.error ?? (result.output || '(nothing)')}</pre>
        </div>
      )}
      {solved && <p className="feedback feedback--right" role="status">{block.explain}</p>}
      {solved
        ? <Button block onClick={() => onFinish(!missed)}>Finish</Button>
        : <Button block disabled={running} onClick={() => void run()}>{running ? 'Running...' : 'Run my code'}</Button>}
      {runs >= 2 && !solved && <Button variant="ghost" small onClick={() => setCode(block.solution)}>Show a working version</Button>}
    </div>
  )
}
