import type { Course } from '../lib/course.ts'

// A course written by hand, so the player works without the AI. The app labels
// it as a sample and never presents it as AI-generated.
export const sampleCourse: Course = {
  id: 'sample-quadratics',
  title: 'Parabolas',
  summary: 'A hand-written sample that shows what each lesson type feels like.',
  origin: 'sample',
  concepts: [
    { id: 'shape', name: 'How a, h, and k shape the curve' },
    { id: 'factor', name: 'Solving by factoring' },
    { id: 'discriminant', name: 'Counting solutions' },
  ],
  lessons: [
    {
      id: 'l1', title: 'Shape the curve',
      intro: 'In y = a(x - h)² + k, each letter does one job. Try them and see.',
      blocks: [
        { type: 'voice', id: 'l1-voice', conceptId: 'shape',
          prompt: 'Say each word out loud to unlock the game.',
          words: [
            { word: 'parabola', syllables: ['pa', 'ra', 'bo', 'la'] },
            { word: 'vertex', syllables: ['ver', 'tex'] },
          ] },
        { type: 'sandbox', id: 'l1-match', conceptId: 'shape',
          prompt: 'Move the sliders until your curve lands on the dashed one.',
          formula: 'a*(x-h)^2+k', xRange: [-6, 6], yRange: [-8, 8],
          sliders: [
            { name: 'a', label: 'a: width and direction', min: -3, max: 3, step: 0.5, value: 1 },
            { name: 'h', label: 'h: left and right', min: -4, max: 4, step: 1, value: 0 },
            { name: 'k', label: 'k: up and down', min: -6, max: 6, step: 1, value: 0 },
          ],
          target: { a: -0.5, h: 2, k: 4 },
          explain: 'A negative a flips the curve, h slides it right, and k lifts it. The vertex lands at (h, k).' },
        { type: 'catch', id: 'l1-catch', conceptId: 'shape',
          prompt: 'Catch the curves that open up. Dodge the ones that open down.',
          items: [
            { text: 'y = 2x² - 3', good: true, why: 'a is 2, which is positive.' },
            { text: 'y = 0.5(x + 1)²', good: true, why: 'a is 0.5. Small, but still positive.' },
            { text: 'y = x² + 4x', good: true, why: 'a is 1, which is positive.' },
            { text: 'y = -x² + 4x', good: false, why: 'a is -1, so it opens down.' },
            { text: 'y = 5 - 3x²', good: false, why: 'a is -3, even though it comes last.' },
          ] },
      ],
    },
    {
      id: 'l2', title: 'Solve by factoring',
      intro: 'Work through the logic one decision at a time.',
      blocks: [
        { type: 'step', id: 'l2-step', conceptId: 'factor',
          problem: 'Solve x² - 7x + 12 = 0',
          hint: 'Look for two numbers that multiply to 12 and add to -7.',
          steps: [
            { prompt: 'Which two numbers multiply to 12 and add to -7?', choices: [
              { text: '-3 and -4', correct: true, why: '(-3)(-4) = 12 and -3 + -4 = -7.' },
              { text: '3 and 4', correct: false, why: 'These multiply to 12, but they add to +7.' },
              { text: '-2 and -6', correct: false, why: 'These multiply to 12, but they add to -8.' },
            ] },
            { prompt: 'So how does it factor?', choices: [
              { text: '(x + 3)(x + 4) = 0', correct: false, why: 'Multiply it out: the middle term would be +7x.' },
              { text: '(x - 3)(x - 4) = 0', correct: true, why: 'Multiplying it out gives x² - 7x + 12.' },
            ] },
            { prompt: 'What are the solutions?', choices: [
              { text: 'x = -3 and x = -4', correct: false, why: 'Plug in -3: (-3 - 3) is -6, not 0.' },
              { text: 'x = 3 and x = 4', correct: true, why: 'Either factor can be zero: x - 3 = 0 or x - 4 = 0.' },
            ] },
          ] },
        { type: 'order', id: 'l2-order', conceptId: 'factor',
          prompt: 'Put the steps for solving by factoring in order.',
          items: [
            'Move everything to one side so it equals 0',
            'Factor the expression',
            'Set each factor equal to 0',
            'Solve each small equation',
            'Plug your answers back in to check',
          ],
          explain: 'Factoring only helps when one side is 0, because that is what lets you split it into two equations.' },
        { type: 'spot', id: 'l2-spot', conceptId: 'factor',
          problem: 'Someone solved x² + 2x = 8. Find the first mistake.',
          lines: ['x² + 2x = 8', 'x(x + 2) = 8', 'x = 8 or x + 2 = 8', 'x = 8 or x = 6'],
          wrongLine: 2,
          why: 'You can only split factors when the product is 0. Here it equals 8, so move the 8 over first.' },
      ],
    },
    {
      id: 'l3', title: 'Boss round: how many solutions?',
      intro: 'A mixed final challenge. The discriminant tells you before you solve anything.',
      blocks: [
        { type: 'calc', id: 'l3-calc', conceptId: 'discriminant',
          prompt: 'For 2x² + 3x - 5 = 0, work out b² - 4ac.',
          formula: 'b^2-4*a*c', values: { a: 2, b: 3, c: -5 }, tolerance: 0.01,
          explain: 'a is 2, b is 3, and c is -5, so 9 - 4(2)(-5) = 9 + 40.' },
        { type: 'sort', id: 'l3-sort', conceptId: 'discriminant',
          prompt: 'How many real solutions does each one have?',
          buckets: ['Two', 'One', 'None'],
          items: [
            { text: 'b² - 4ac = 49', bucket: 0, why: 'Positive: the curve crosses the x-axis twice.' },
            { text: 'b² - 4ac = 0', bucket: 1, why: 'Zero: the vertex just touches the x-axis.' },
            { text: 'b² - 4ac = -8', bucket: 2, why: 'Negative: the curve never reaches the x-axis.' },
          ] },
        { type: 'explain', id: 'l3-explain', conceptId: 'discriminant',
          prompt: 'In your own words, explain what the discriminant tells you and why.',
          points: [
            'It is the part under the square root in the quadratic formula',
            'Positive means two solutions, zero means one, negative means none',
            'It matches how many times the curve crosses the x-axis',
          ] },
      ],
    },
  ],
}
