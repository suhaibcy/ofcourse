import { curvePoints } from '../lib/formula'

const WIDTH = 320
const HEIGHT = 220

type CurveGraphProps = {
  formula: string
  values: Record<string, number>
  target?: Record<string, number> // draws a dashed curve to match
  xRange: [number, number]
  yRange: [number, number]
  matched?: boolean
}

// A live graph. Used for teaching (just explore) and for the sandbox game (match the curve).
export function CurveGraph({ formula, values, target, xRange, yRange, matched = false }: CurveGraphProps) {
  const [xMin, xMax] = xRange
  const [yMin, yMax] = yRange
  const toX = (x: number) => ((x - xMin) / (xMax - xMin)) * WIDTH
  const toY = (y: number) => HEIGHT - ((y - yMin) / (yMax - yMin)) * HEIGHT
  const clampY = (y: number) => Math.min(HEIGHT + 40, Math.max(-40, toY(y)))
  const path = (vals: Record<string, number>) =>
    curvePoints(formula, vals, xRange).map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.x).toFixed(1)} ${clampY(p.y).toFixed(1)}`).join(' ')

  return (
    <svg className={matched ? 'graph graph--matched' : 'graph'} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img"
      aria-label={matched ? 'Your curve matches the target' : 'A live graph of the curve'}>
      <line className="graph__axis" x1={0} x2={WIDTH} y1={toY(0)} y2={toY(0)} />
      <line className="graph__axis" x1={toX(0)} x2={toX(0)} y1={0} y2={HEIGHT} />
      {target && <path className="graph__target" d={path(target)} />}
      <path className="graph__mine" d={path(values)} />
    </svg>
  )
}
