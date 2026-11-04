import { motion, useAnimate, useReducedMotion } from 'motion/react'
import { useEffect, useId } from 'react'

// Hoot, ofCourse's owl mascot, drawn as shapes (SVG) so he stays sharp at any
// size, can take a pose, and can move. Redrawn from the A1 image in
// design/mascot/owl-a1.webp, shading included: a warm gradient body, a soft
// shine, shaded cream face and belly, a high rounded beak, and a shadow
// underneath. Poses match the Claude Design canvas.
// Motion (bob, blink, wave) lives in onboarding.css and turns off with
// the phone's "reduce motion" setting.

export type HootPose = 'hello' | 'idle' | 'point' | 'celebrate' | 'think' | 'sleep' | 'oops' | 'look'

type Wing = { cx: number; cy: number; rx: number; ry: number; rot: number }

const rest = (side: 'left' | 'right'): Wing =>
  side === 'left' ? { cx: 26, cy: 140, rx: 13, ry: 32, rot: 14 } : { cx: 174, cy: 140, rx: 13, ry: 32, rot: -14 }

// [left wing, right wing] for each pose
const wings: Record<HootPose, [Wing, Wing]> = {
  hello: [rest('left'), { cx: 180, cy: 84, rx: 13, ry: 32, rot: 32 }],
  idle: [rest('left'), rest('right')],
  point: [rest('left'), { cx: 184, cy: 130, rx: 30, ry: 12, rot: -12 }],
  celebrate: [{ cx: 20, cy: 84, rx: 13, ry: 32, rot: -32 }, { cx: 180, cy: 84, rx: 13, ry: 32, rot: 32 }],
  think: [rest('left'), rest('right')],
  sleep: [rest('left'), rest('right')],
  oops: [{ cx: 34, cy: 142, rx: 13, ry: 32, rot: 30 }, { cx: 166, cy: 142, rx: 13, ry: 32, rot: -30 }],
  look: [rest('left'), rest('right')],
}

const labels: Record<HootPose, string> = {
  hello: 'Hoot the owl, waving',
  idle: 'Hoot the owl',
  point: 'Hoot the owl, pointing',
  celebrate: 'Hoot the owl, celebrating',
  think: 'Hoot the owl, thinking',
  sleep: 'Hoot the owl, asleep',
  oops: 'Hoot the owl, looking worried',
  look: 'Hoot the owl, looking down',
}

const EYE = '#4A3427'

// Apple-style spring for pose changes (animate skill: duration 0.5, bounce 0.2)
const POSE_SPRING = { type: 'spring', duration: 0.5, bounce: 0.2 } as const

// One-shot reactions. "key" changes each time, so the same reaction can replay
// (two wrong links in a row = two head shakes).
export type HootReaction = { name: 'hop' | 'shake' | 'nod'; key: number }

// With several keyframes, give one curve per step: a single curve would stretch
// across the whole timeline (slow start, rushed middle).
const EASE_OUT = [0.23, 1, 0.32, 1] as const
// Falling speeds up, like gravity (the --ease-in token in tokens.css). Only for
// Hoot's fall; UI never uses ease-in.
const EASE_FALL = [0.55, 0, 1, 0.45] as const
// Sine-shaped (easeInOutSine): back-and-forth motion flows through each turn
// instead of stalling at the ends like a strong ease-in-out does.
const EASE_SWING = [0.37, 0, 0.63, 1] as const

// The hop's beats: crouch, rise, fall, squash on landing, small stretch, rest.
// 0.62 s in all; his body and shadow share the same timing.
const HOP = {
  duration: 0.62,
  times: [0, 0.1, 0.26, 0.4, 0.5, 0.62].map((t) => t / 0.62),
  ease: [EASE_OUT, EASE_OUT, EASE_FALL, EASE_OUT, EASE_OUT],
}

// Every reaction uses the same transform "shape", and the groups below start
// with the resting one set. Without it, Motion read "no transform" as scale 0
// and grew Hoot from nothing for a split second.
const body = (y: number, rot = 0, sx = 1, sy = 1) => `translateY(${y}px) rotate(${rot}deg) scaleX(${sx}) scaleY(${sy})`
const face = (x: number, y: number) => `translate(${x}px, ${y}px)`

type HootProps = {
  pose?: HootPose
  size?: number // width in px; height follows
  animate?: boolean // bob and blink (and wave, when saying hello)
  decorative?: boolean // true when the text next to Hoot already says everything
  reaction?: HootReaction | null
}

export function Hoot({ pose = 'hello', size = 160, animate = false, decorative = false, reaction = null }: HootProps) {
  // Gradients need ids, and several Hoots can be on one page, so each gets its own.
  const id = useId().replace(/:/g, '')
  const [scope, animateParts] = useAnimate<SVGSVGElement>()
  const reduce = useReducedMotion()

  // Play a reaction when a new one arrives. "Reduce motion" on: Hoot holds still
  // (his pose change still shows what happened).
  useEffect(() => {
    if (!reaction || reduce) return
    if (reaction.name === 'hop') {
      // Link works: crouch, jump, land with a squash and a little rebound.
      // His shadow shrinks and fades while he's in the air.
      animateParts('.hoot__react', { transform: [body(0), body(0, 0, 1.06, 0.92), body(-18, 0, 0.96, 1.05),
        body(0, 0, 1.05, 0.94), body(0, 0, 0.99, 1.02), body(0)] }, HOP)
      animateParts('.hoot__shadow', { transform: ['scaleX(1)', 'scaleX(1.04)', 'scaleX(0.7)', 'scaleX(1.06)', 'scaleX(1)', 'scaleX(1)'],
        opacity: [1, 1, 0.5, 1, 1, 1] }, HOP)
    } else if (reaction.name === 'shake') {
      // Wrong link: the face swings left and right twice ("no"), the body
      // wobbles a little with it, and each swing is smaller than the last.
      // "null" = start from wherever he is, so a second shake doesn't jump.
      const opts = { duration: 0.32, ease: Array(5).fill(EASE_SWING) }
      animateParts('.hoot__face', { transform: [null, face(-6, 0), face(6, 0), face(-4, 0), face(3, 0), face(0, 0)] }, opts)
      animateParts('.hoot__react', { transform: [null, body(0, -3), body(0, 3), body(0, -2), body(0, 1), body(0)] }, opts)
    } else {
      // Picked a day: one quick nod, the face dips and the body follows a little.
      const opts = { duration: 0.25, ease: [EASE_SWING, EASE_SWING] }
      animateParts('.hoot__face', { transform: [null, face(0, 6), face(0, 0)] }, opts)
      animateParts('.hoot__react', { transform: [null, body(2), body(0)] }, opts)
    }
    // Only a new reaction (new key) should replay it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reaction?.key])

  const url = (name: string) => `url(#${id}-${name})`
  const [left, right] = wings[pose]
  const eyesOpen = pose !== 'celebrate' && pose !== 'sleep'
  // The eye-whites stay put; only the pupils move to show where Hoot looks:
  // toward what he points at, up while thinking, down at the box while looking.
  const dx = pose === 'point' ? 4 : pose === 'think' ? 3 : 0
  const dy = pose === 'think' ? -5 : pose === 'look' ? 5 : 0
  const eyeR = pose === 'oops' ? 10 : 13 // smaller pupils = wide-eyed worry
  const glintR = pose === 'oops' ? 3 : 4

  // Wings glide to each new pose (position, shape, and angle) instead of jumping.
  // Rotation spins around the wing's own center (transform-box: fill-box).
  const wing = (w: Wing) => (
    <motion.ellipse initial={false} animate={{ cx: w.cx, cy: w.cy, rx: w.rx, ry: w.ry, rotate: w.rot }}
      transition={POSE_SPRING} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} fill={url('wing')} />
  )

  return (
    <svg ref={scope} className={animate ? 'hoot hoot--alive' : 'hoot'} width={size} height={Math.round(size * 1.15)}
      viewBox="0 -10 200 230" role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : labels[pose]} aria-hidden={decorative || undefined}>
      <defs>
        <linearGradient id={`${id}-body`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#FDD27A" />
          <stop offset="0.55" stopColor="#F6B85C" />
          <stop offset="1" stopColor="#E9963E" />
        </linearGradient>
        <linearGradient id={`${id}-wing`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#F2AA4F" />
          <stop offset="1" stopColor="#DD8834" />
        </linearGradient>
        <radialGradient id={`${id}-cream`} cx="0.42" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#FFF6E6" />
          <stop offset="1" stopColor="#F6DFBC" />
        </radialGradient>
        <radialGradient id={`${id}-shine`} cx="0.32" cy="0.22" r="0.55">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-beak`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F7A64C" />
          <stop offset="1" stopColor="#DE7F2C" />
        </linearGradient>
      </defs>
      {/* Soft shadow on the ground (stays put while Hoot bobs; shrinks while he hops) */}
      <ellipse className="hoot__shadow" cx="100" cy="215" rx="52" ry="7" fill="var(--text-primary)" fillOpacity="0.08" />
      {/* Reactions move this group (from his feet); the CSS bob moves the one inside */}
      <g className="hoot__react" style={{ transform: body(0) }}>
        <g className="hoot__body">
          {pose === 'celebrate' && (
            <g>
              <rect x="20" y="0" width="10" height="10" rx="3" transform="rotate(20 25 5)" fill="var(--primary)" />
              <rect x="168" y="6" width="10" height="10" rx="3" transform="rotate(-25 173 11)" fill="var(--class-1)" />
              <circle cx="100" cy="-2" r="5" fill="var(--class-5)" />
              <rect x="150" y="-8" width="8" height="8" rx="2" fill="var(--class-2)" />
            </g>
          )}
          {pose === 'sleep' && (
            <g fill="var(--text-tertiary)" fontFamily="var(--font-sans)" fontWeight="600">
              <text x="160" y="30" fontSize="22">z</text>
              <text x="178" y="12" fontSize="16">z</text>
            </g>
          )}
          {pose === 'think' && (
            <g fill="var(--border)">
              <circle cx="168" cy="22" r="5" />
              <circle cx="182" cy="8" r="7" />
            </g>
          )}
          <ellipse cx="80" cy="208" rx="13" ry="6" fill="#E58A35" />
          <ellipse cx="120" cy="208" rx="13" ry="6" fill="#E58A35" />
          {wing(left)}
          <g className={pose === 'hello' ? 'hoot__wave' : undefined}>{wing(right)}</g>
          <ellipse cx="50" cy="46" rx="21" ry="29" transform="rotate(-32 50 46)" fill={url('body')} />
          <ellipse cx="150" cy="48" rx="20" ry="28" transform="rotate(32 150 48)" fill={url('body')} />
          <ellipse cx="100" cy="122" rx="80" ry="88" fill={url('body')} />
          <ellipse cx="100" cy="122" rx="80" ry="88" fill={url('shine')} />
          <ellipse cx="100" cy="180" rx="58" ry="40" fill={url('cream')} />
          {/* The face (eye discs, eyes, brows, beak) moves on its own for nods and shakes */}
          <g className="hoot__face" style={{ transform: face(0, 0) }}>
            <circle cx="69" cy="98" r="41" fill={url('cream')} />
            <circle cx="131" cy="98" r="41" fill={url('cream')} />
            {eyesOpen && (
              <g className="hoot__eyes">
                <circle cx="72" cy="102" r="18" fill="#FFFDF8" />
                <circle cx="128" cy="102" r="18" fill="#FFFDF8" />
                {/* Pupils (with their shine) glide inside the eye-whites; 200 ms, ease-out */}
                <motion.g initial={false} animate={{ transform: `translate(${dx}px, ${dy}px)` }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>
                  <motion.circle cx="72" cy="102" initial={false} animate={{ r: eyeR }} fill={EYE} />
                  <circle cx="76" cy="97" r={glintR} fill="#ffffff" />
                  <motion.circle cx="128" cy="102" initial={false} animate={{ r: eyeR }} fill={EYE} />
                  <circle cx="132" cy="97" r={glintR} fill="#ffffff" />
                </motion.g>
              </g>
            )}
            {pose === 'oops' && (
              <g stroke={EYE} strokeWidth="5" strokeLinecap="round">
                <path d="M56 79 L82 87" />
                <path d="M144 79 L118 87" />
              </g>
            )}
            {pose === 'celebrate' && (
              <g fill="none" stroke={EYE} strokeWidth="6" strokeLinecap="round">
                <path d="M58 106 Q72 92 86 106" />
                <path d="M114 106 Q128 92 142 106" />
              </g>
            )}
            {pose === 'sleep' && (
              <g fill="none" stroke={EYE} strokeWidth="6" strokeLinecap="round">
                <path d="M58 101 Q72 113 86 101" />
                <path d="M114 101 Q128 113 142 101" />
              </g>
            )}
            <path d="M92 101 Q100 95 108 101 Q105 113 100 119 Q95 113 92 101 Z" fill={url('beak')} />
          </g>
        </g>
      </g>
    </svg>
  )
}
