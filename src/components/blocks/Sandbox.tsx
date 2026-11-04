import { useState } from 'react'
import type { SandboxBlock } from '../../lib/course'
import { CURVE_MATCH, curveGap, curvePoints } from '../../lib/formula'
import { Button } from '../Button'
import type { BlockProps } from './blockTypes'

const WIDTH = 320
const HEIGHT = 220

// The live graph game: every slider move redraws the curve. Code decides when
// it matches the target, by comparing the two curves point by point.
export function Sandbox({ block, onFinish }: BlockProps<SandboxBlock>) {
  const start = Object.fromEntries(block.sliders.map((s) => [s.name, s.value]))
  const [values, setValues] = useState<Record<string, number>>(start)
  const [revealed, setRevealed] = useState(false)

  const [xMin, xMax] = block.xRange
  const [yMin, yMax] = block.yRange
  const toX = (x: number) => ((x - xMin) / (xMax - xMin)) * WIDTH
  const toY = (y: number) => HEIGHT - ((y - yMin) / (yMax - yMin)) * HEIGHT
  const clampY = (y: number) => Math.min(HEIGHT + 40, Math.max(-40, toY(y)))
  const path = (vals: Record<string, number>) =>
    curvePoints(block.formula, vals, block.xRange).map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.x).toFixed(1)} ${clampY(p.y).toFixed(1)}`).join(' ')

  const matched = curveGap(block.formula, values, block.target, block.xRange, block.yRange) <= CURVE_MATCH
  const done = matched || revealed

  return (
    <div className="block">
      <p className="block__prompt">{block.prompt}</p>
      <svg className={matched ? 'graph graph--matched' : 'graph'} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img"
        aria-label={matched ? 'Your curve matches the target' : 'Your curve and the dashed target curve'}>
        <line className="graph__axis" x1={0} x2={WIDTH} y1={toY(0)} y2={toY(0)} />
        <line className="graph__axis" x1={toX(0)} x2={toX(0)} y1={0} y2={HEIGHT} />
        <path className="graph__target" d={path(block.target)} />
        <path className="graph__mine" d={path(values)} />
      </svg>
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
