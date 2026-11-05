import { useState } from 'react'
import type { SandboxBlock } from '../../lib/course'
import { CURVE_MATCH, curveGap } from '../../lib/formula'
import { Button } from '../Button'
import { CurveGraph } from '../CurveGraph'
import type { BlockProps } from './blockTypes'

// The live graph game: every slider move redraws the curve. Code decides when
// it matches the target, by comparing the two curves point by point.
export function Sandbox({ block, onFinish }: BlockProps<SandboxBlock>) {
  const start = Object.fromEntries(block.sliders.map((s) => [s.name, s.value]))
  const [values, setValues] = useState<Record<string, number>>(start)
  const [revealed, setRevealed] = useState(false)

  const matched = curveGap(block.formula, values, block.target, block.xRange, block.yRange) <= CURVE_MATCH
  const done = matched || revealed

  return (
    <div className="block">
      <p className="block__prompt">{block.prompt}</p>
      <CurveGraph formula={block.formula} values={values} target={block.target} xRange={block.xRange} yRange={block.yRange} matched={matched} />
      <div className="sliders">
        {block.sliders.map((slider) => (
          <label key={slider.name} className="slider">
            <span className="slider__label">{slider.label}<strong>{values[slider.name]}</strong></span>
            <input type="range" min={slider.min} max={slider.max} step={slider.step} value={values[slider.name]} disabled={done}
              onChange={(e) => setValues({ ...values, [slider.name]: Number(e.target.value) })} />
          </label>
        ))}
      </div>
      {done && <p className={matched && !revealed ? 'feedback feedback--right' : 'feedback'} role="status">{block.explain}</p>}
      {done
        ? <Button block onClick={() => onFinish(!revealed)}>Finish</Button>
        : <Button variant="ghost" small onClick={() => { setValues(block.target); setRevealed(true) }}>Show me</Button>}
    </div>
  )
}
