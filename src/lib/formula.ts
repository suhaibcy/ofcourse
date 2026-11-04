import { compile, type EvalFunction } from 'mathjs'

// Runs formulas the AI wrote. Only numbers, operators, the named variables, and
// this short list of math functions are allowed, so a formula can never call
// anything else. Like checking a Python string before passing it to eval().
const ALLOWED_NAMES = new Set(['sin', 'cos', 'tan', 'sqrt', 'log', 'log2', 'log10', 'exp', 'abs', 'pi', 'e'])
const SAFE_CHARACTERS = /^[0-9a-zA-Z_+\-*/^().,\s]+$/

export function isSafeFormula(formula: string, variables: string[]): boolean {
  if (!formula.trim() || formula.length > 200 || !SAFE_CHARACTERS.test(formula)) return false
  const names = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) ?? []
  return names.every((name) => ALLOWED_NAMES.has(name) || variables.includes(name))
}

const compiled = new Map<string, EvalFunction>()

// The formula's value, or null if it can't be worked out (bad formula, divide by zero).
export function evaluate(formula: string, values: Record<string, number>): number | null {
  if (!isSafeFormula(formula, Object.keys(values))) return null
  try {
    let fn = compiled.get(formula)
    if (!fn) {
      fn = compile(formula)
      compiled.set(formula, fn)
    }
    const result: unknown = fn.evaluate({ ...values })
    return typeof result === 'number' && Number.isFinite(result) ? result : null
  } catch {
    return null
  }
}

// Evenly spaced points along a curve, skipping any x where it has no value.
export function curvePoints(formula: string, values: Record<string, number>, [from, to]: [number, number], count = 80) {
  const points: { x: number; y: number }[] = []
  for (let i = 0; i <= count; i++) {
    const x = from + ((to - from) * i) / count
    const y = evaluate(formula, { ...values, x })
    if (y !== null) points.push({ x, y })
  }
  return points
}

// How close two curves are, as a share of the graph's height (0 = identical).
// Compared across the whole curve, so a different mix of slider values that
// draws the same line still counts.
export function curveGap(formula: string, values: Record<string, number>, target: Record<string, number>,
  xRange: [number, number], yRange: [number, number]): number {
  const mine = curvePoints(formula, values, xRange, 40)
  const goal = curvePoints(formula, target, xRange, 40)
  if (mine.length === 0 || mine.length !== goal.length) return Infinity
  const total = mine.reduce((sum, point, i) => sum + Math.abs(point.y - goal[i].y), 0)
  return total / mine.length / (yRange[1] - yRange[0])
}

export const CURVE_MATCH = 0.02 // within 2% of the graph's height counts as a match
