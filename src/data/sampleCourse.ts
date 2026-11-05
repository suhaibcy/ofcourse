import type { Course } from '../lib/course.ts'

// A full course written in advance, so the player works without Meta's models. The
// app labels it as a sample and never says Hoot or Meta's models generated it.
const FIRST_UNIT = 'What a parabola looks like'
const SECOND_UNIT = 'Solving quadratics'

export const sampleCourse: Course = {
  id: 'sample-quadratics',
  title: 'Parabolas',
  summary: 'Sample course. Learn how these curves work, then practice with games.',
  origin: 'sample',
  subject: 'Math',
  level: 'Some background',
  kit: {
    summary: 'A parabola is the curve made by a quadratic equation. In y = a(x - h)² + k, the vertex is at (h, k), and the sign of a tells you whether it opens up or down.',
    keyIdeas: [
      'Positive a opens up, and negative a opens down',
      'Factoring only works once one side equals 0',
      'The discriminant, b² - 4ac, counts the real solutions',
    ],
    terms: [
      { term: 'Vertex', meaning: 'The turning point of the curve' },
      { term: 'Root', meaning: 'Where the curve crosses the x-axis' },
      { term: 'Discriminant', meaning: 'b² - 4ac, the part under the square root' },
    ],
    dates: [],
  },
  concepts: [
    { id: 'shape', name: 'How a, h, and k shape the curve' },
    { id: 'factor', name: 'Solving by factoring' },
    { id: 'discriminant', name: 'Counting solutions' },
  ],
  lessons: [
    {
      id: 'l1', unit: FIRST_UNIT, title: 'Meet the parabola',
      intro: 'A curve you see more often than you think.',
      teach: [
        { type: 'read', heading: 'A curve you already know',
          body: 'Toss a ball to a friend. Its path rises, slows, and falls in a smooth arc.\nThat shape is close to a parabola. It\'s the curve you get from any equation where the highest power of x is 2.' },
        { type: 'read', heading: 'One equation, three jobs',
          body: 'A handy way to write it is y = a(x - h)² + k.\nEach letter has one job: a sets the width and direction, h slides the curve left and right, and k slides it up and down.' },
        { type: 'explore', prompt: 'Move each slider and watch what it does to the curve.',
          formula: 'a*(x-h)^2+k', xRange: [-6, 6], yRange: [-8, 8],
          sliders: [
            { name: 'a', label: 'a: width and direction', min: -3, max: 3, step: 0.5, value: 1 },
            { name: 'h', label: 'h: left and right', min: -4, max: 4, step: 1, value: 0 },
            { name: 'k', label: 'k: up and down', min: -6, max: 6, step: 1, value: 0 },
          ],
          notice: 'Try a negative a: the curve flips. A bigger a makes it narrower. The turning point always sits at (h, k).' },
        { type: 'check', question: 'What does making a negative do?', choices: [
          { text: 'Flips the curve to open downward', correct: true, why: 'Right. The sign of a sets the direction.' },
          { text: 'Slides the curve left', correct: false, why: 'Sliding left and right is h\'s job.' },
          { text: 'Moves the curve down', correct: false, why: 'Moving up and down is k\'s job.' },
        ] },
        { type: 'remember', points: ['a sets the width and direction', 'h slides it left and right', 'k slides it up and down'] },
      ],
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
      ],
    },
    {
      id: 'lw', unit: FIRST_UNIT, title: 'Read the equation',
      intro: 'Learn to see the curve just by looking at the equation.',
      teach: [
        { type: 'read', heading: 'The vertex is hiding in plain sight',
          body: 'The vertex is the curve\'s turning point. In y = a(x - h)² + k, it sits at (h, k).\nWatch the sign: x - 3 means h is 3, and x + 3 means h is -3, because x + 3 is the same as x - (-3).' },
        { type: 'example', problem: 'Describe y = 2(x - 3)² + 1',
          steps: [
            { step: 'a is 2, so it opens up and is narrow', why: 'a is positive and bigger than 1.' },
            { step: 'h is 3', why: 'The equation says x - 3, so h is 3.' },
            { step: 'k is 1', why: 'It\'s the number added at the end.' },
            { step: 'The vertex is at (3, 1)', why: 'The vertex is always (h, k).' },
          ] },
        { type: 'compare', heading: 'Positive a or negative a?', columns: ['Positive a', 'Negative a'], rows: [
          { label: 'Opens', left: 'Up', right: 'Down' },
          { label: 'Vertex is the', left: 'Lowest point', right: 'Highest point' },
        ] },
        { type: 'remember', points: ['The vertex is at (h, k)', 'The sign inside the parentheses flips: x + 3 means h is -3'] },
      ],
      blocks: [
        { type: 'catch', id: 'lw-catch', conceptId: 'shape',
          prompt: 'Catch the curves that open up. Dodge the ones that open down.',
          items: [
            { text: 'y = 2x² - 3', good: true, why: 'a is 2, which is positive.' },
            { text: 'y = 0.5(x + 1)²', good: true, why: 'a is 0.5. Small, but still positive.' },
            { text: 'y = x² + 4x', good: true, why: 'a is 1, which is positive.' },
            { text: 'y = -x² + 4x', good: false, why: 'a is -1, so it opens down.' },
            { text: 'y = 5 - 3x²', good: false, why: 'a is -3, even though it comes last.' },
          ] },
        { type: 'flip', id: 'lw-flip', conceptId: 'shape',
          prompt: 'Flip two cards. Find each word and its meaning.',
          pairs: [
            { term: 'Vertex', meaning: 'The turning point' },
            { term: 'Root', meaning: 'Where it crosses the x-axis' },
            { term: 'Axis of symmetry', meaning: 'The line that splits it evenly' },
            { term: 'Negative a', meaning: 'It opens downward' },
          ] },
      ],
    },
    {
      id: 'q1', unit: FIRST_UNIT, kind: 'quiz', title: 'Unit 1 quiz',
      intro: 'Show what you learned in this unit.',
      blocks: [
        { type: 'match', id: 'q1-match', conceptId: 'shape',
          prompt: 'Drag each equation onto its vertex.',
          pairs: [
            { term: 'y = (x - 2)² + 5', meaning: 'Vertex at (2, 5)' },
            { term: 'y = (x + 2)² + 5', meaning: 'Vertex at (-2, 5)' },
            { term: 'y = (x - 2)² - 5', meaning: 'Vertex at (2, -5)' },
          ] },
        { type: 'sort', id: 'q1-sort', conceptId: 'shape',
          prompt: 'Is the vertex the highest or the lowest point?',
          buckets: ['Lowest point', 'Highest point'],
          items: [
            { text: 'y = 3(x - 1)²', bucket: 0, why: 'a is positive, so it opens up.' },
            { text: 'y = -(x + 4)² + 2', bucket: 1, why: 'a is -1, so it opens down.' },
            { text: 'y = -0.5x² + 7', bucket: 1, why: 'a is -0.5, so it opens down.' },
          ] },
        { type: 'fill', id: 'q1-fill', conceptId: 'shape',
          prompt: 'Drag the words into the sentence.',
          sentence: 'The ___ is the curve\'s turning point, and a positive a makes it open ___.',
          answers: ['vertex', 'upward'], extras: ['root', 'downward'],
          explain: 'The vertex is where the curve turns, and positive a means it opens upward.' },
      ],
    },
    {
      id: 'l2', unit: SECOND_UNIT, title: 'Solve by factoring',
      intro: 'One simple fact about zero does all the work.',
      teach: [
        { type: 'read', heading: 'The power of zero',
          body: 'If two numbers multiply to 0, at least one of them has to be 0.\nThat\'s the whole trick. If you can rewrite an equation as (something)(something) = 0, you can split it into two easy equations.' },
        { type: 'example', problem: 'Solve x² - 5x + 6 = 0',
          steps: [
            { step: 'Find two numbers that multiply to 6 and add to -5', why: 'They are -2 and -3.' },
            { step: 'Factor: (x - 2)(x - 3) = 0', why: 'Multiplying it out gives back the original.' },
            { step: 'Split it: x - 2 = 0 or x - 3 = 0', why: 'One factor has to be 0.' },
            { step: 'So x = 2 or x = 3', why: 'Plug each one in to check: both give 0.' },
          ] },
        { type: 'check', question: 'Why must one side equal 0 before you split the factors?', choices: [
          { text: 'Only a product of 0 forces one factor to be 0', correct: true, why: 'Right. If the product were 8, neither factor would have to be anything in particular.' },
          { text: 'It makes the numbers smaller', correct: false, why: 'The size of the numbers isn\'t the reason. Think about what multiplying to 0 tells you.' },
        ] },
        { type: 'remember', points: ['Get one side to equal 0 first', 'Factor, then set each factor to 0', 'Check your answers by plugging them in'] },
      ],
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
          prompt: 'Build the bridge: put the steps for solving by factoring in order.',
          items: [
            'Move everything to one side so it equals 0',
            'Factor the expression',
            'Set each factor equal to 0',
            'Solve each small equation',
            'Plug your answers back in to check',
          ],
          explain: 'Factoring only helps when one side is 0, because that is what lets you split it into two equations.' },
      ],
    },
    {
      id: 'l3', unit: SECOND_UNIT, title: 'How many solutions?',
      intro: 'Know the answer count before you solve anything.',
      teach: [
        { type: 'read', heading: 'Solutions are where the curve crosses',
          body: 'The solutions of ax² + bx + c = 0 are the spots where the curve crosses the x-axis.\nA curve can cross twice, touch once, or miss completely. So there are two, one, or no real solutions.' },
        { type: 'explore', prompt: 'Slide c and watch the curve y = x² + c cross the x-axis, touch it, and then miss it.',
          formula: 'x^2+c', xRange: [-5, 5], yRange: [-6, 8],
          sliders: [{ name: 'c', label: 'c: up and down', min: -5, max: 5, step: 1, value: -4 }],
          notice: 'Below 0 it crosses twice. At exactly 0 it touches once. Above 0 it misses completely.' },
        { type: 'compare', heading: 'The discriminant tells you: b² - 4ac', columns: ['b² - 4ac is', 'Real solutions'], rows: [
          { label: 'Curve crosses twice', left: 'Positive', right: 'Two' },
          { label: 'Curve touches once', left: 'Zero', right: 'One' },
          { label: 'Curve misses', left: 'Negative', right: 'None' },
        ] },
        { type: 'example', problem: 'How many solutions does x² + 2x + 5 = 0 have?',
          steps: [
            { step: 'a is 1, b is 2, and c is 5', why: 'Read them off the equation.' },
            { step: 'b² - 4ac = 4 - 20 = -16', why: '2² is 4, and 4(1)(5) is 20.' },
            { step: 'No real solutions', why: 'The discriminant is negative, so the curve misses the x-axis.' },
          ] },
        { type: 'remember', points: ['Positive means two solutions', 'Zero means one solution', 'Negative means no real solutions'] },
      ],
      blocks: [
        { type: 'calc', id: 'l3-calc', conceptId: 'discriminant',
          prompt: 'For 2x² + 3x - 5 = 0, work out b² - 4ac.',
          formula: 'b^2-4*a*c', values: { a: 2, b: 3, c: -5 }, tolerance: 0.01,
          explain: 'a is 2, b is 3, and c is -5, so 9 - 4(2)(-5) = 9 + 40.' },
        { type: 'explain', id: 'l3-explain', conceptId: 'discriminant',
          prompt: 'In your own words, explain what the discriminant tells you and why.',
          points: [
            'It is the part under the square root in the quadratic formula',
            'Positive means two solutions, zero means one, negative means none',
            'It matches how many times the curve crosses the x-axis',
          ] },
      ],
    },
    {
      id: 'q2', unit: SECOND_UNIT, kind: 'quiz', title: 'Unit 2 quiz',
      intro: 'Put factoring and the discriminant together.',
      blocks: [
        { type: 'spot', id: 'q2-spot', conceptId: 'factor',
          problem: 'Someone solved x² + 2x = 8. Find the first mistake.',
          lines: ['x² + 2x = 8', 'x(x + 2) = 8', 'x = 8 or x + 2 = 8', 'x = 8 or x = 6'],
          wrongLine: 2,
          why: 'You can only split factors when the product is 0. Here it equals 8, so move the 8 over first.' },
        { type: 'sort', id: 'q2-sort', conceptId: 'discriminant',
          prompt: 'How many real solutions does each one have?',
          buckets: ['Two', 'One', 'None'],
          items: [
            { text: 'b² - 4ac = 49', bucket: 0, why: 'Positive: the curve crosses the x-axis twice.' },
            { text: 'b² - 4ac = 0', bucket: 1, why: 'Zero: the vertex just touches the x-axis.' },
            { text: 'b² - 4ac = -8', bucket: 2, why: 'Negative: the curve never reaches the x-axis.' },
          ] },
        { type: 'calc', id: 'q2-calc', conceptId: 'discriminant',
          prompt: 'For x² - 4x + 4 = 0, work out b² - 4ac.',
          formula: 'b^2-4*a*c', values: { a: 1, b: -4, c: 4 }, tolerance: 0.01,
          explain: '(-4)² is 16, and 4(1)(4) is 16, so the discriminant is 0. That means one solution.' },
      ],
    },
  ],
}
