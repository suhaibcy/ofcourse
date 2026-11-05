import type { Course } from '../lib/course.ts'
import { sampleCourse } from './sampleCourse.ts'
import { natureNurture } from './sampleNature.ts'

// Starter courses written in advance, so there's something to explore in every subject.
// The app labels them as samples and never says Hoot or Meta's models generated them.
const sampleHint = 'Sample course.'

const science: Course = {
  id: 'sample-cells',
  title: 'How plants make food',
  summary: `${sampleHint} Photosynthesis, one playful step at a time.`,
  origin: 'sample', subject: 'Science', level: 'Starting out',
  concepts: [
    { id: 'parts', name: 'Parts of a plant cell' },
    { id: 'process', name: 'What goes in and comes out' },
  ],
  kit: {
    summary: 'Plants use sunlight to turn water and carbon dioxide into glucose, a sugar they use for energy. Oxygen is released along the way.',
    keyIdeas: ['Photosynthesis happens in chloroplasts', 'Sunlight, water, and carbon dioxide go in', 'Glucose and oxygen come out'],
    terms: [
      { term: 'Chlorophyll', meaning: 'The green pigment that captures light' },
      { term: 'Glucose', meaning: 'The sugar a plant makes for energy' },
    ],
    dates: [],
  },
  lessons: [
    { id: 'c1', unit: 'Inside a leaf', title: 'The food factory', intro: 'Leaves are tiny factories powered by light.',
      teach: [
        { type: 'read', heading: 'Plants make their own food', body: 'You eat to get energy. Plants make their energy themselves, using light from the sun.\nThis process is called photosynthesis, and it mostly happens in leaves.' },
        { type: 'read', heading: 'Where it happens', body: 'Inside leaf cells are tiny parts called chloroplasts. They\'re full of chlorophyll, a green pigment that captures light.\nThat\'s why most leaves look green.' },
        { type: 'check', question: 'What does chlorophyll do?', choices: [
          { text: 'Captures light', correct: true, why: 'Right. It\'s the green pigment that absorbs light energy.' },
          { text: 'Stores water', correct: false, why: 'Chlorophyll works with light, not water storage.' },
        ] },
        { type: 'remember', points: ['Photosynthesis is how plants make food', 'It happens in chloroplasts', 'Chlorophyll captures the light'] },
      ],
      blocks: [
        { type: 'voice', id: 'c1-voice', conceptId: 'parts', prompt: 'Say each word out loud to unlock the game.', words: [
          { word: 'chlorophyll', syllables: ['chlo', 'ro', 'phyll'] },
          { word: 'glucose', syllables: ['glu', 'cose'] },
        ] },
        { type: 'flip', id: 'c1-flip', conceptId: 'parts', prompt: 'Flip two cards. Find each word and its meaning.', pairs: [
          { term: 'Chloroplast', meaning: 'Where photosynthesis happens' },
          { term: 'Chlorophyll', meaning: 'Green pigment that captures light' },
          { term: 'Stomata', meaning: 'Tiny pores that let gases in and out' },
        ] },
      ] },
    { id: 'c2', unit: 'Inside a leaf', title: 'What goes in, what comes out', intro: 'Follow the ingredients.',
      teach: [
        { type: 'compare', heading: 'A recipe for food', columns: ['Goes in', 'Comes out'], rows: [
          { label: 'Gas', left: 'Carbon dioxide', right: 'Oxygen' },
          { label: 'Other', left: 'Water', right: 'Glucose' },
          { label: 'Energy', left: 'Sunlight', right: 'Stored in glucose' },
        ] },
        { type: 'read', heading: 'Why you should care', body: 'The oxygen plants release is part of the air you breathe.\nAnd the glucose they make is the start of most food chains on Earth.' },
        { type: 'remember', points: ['Sunlight, water, and carbon dioxide go in', 'Glucose and oxygen come out'] },
      ],
      blocks: [
        { type: 'catch', id: 'c2-catch', conceptId: 'process', prompt: 'Catch what a plant takes in for photosynthesis. Dodge what it gives off.', items: [
          { text: 'Sunlight', good: true, why: 'Light provides the energy.' },
          { text: 'Water', good: true, why: 'Roots bring it up from the soil.' },
          { text: 'Carbon dioxide', good: true, why: 'It enters through the stomata.' },
          { text: 'Oxygen', good: false, why: 'Oxygen is given off.' },
          { text: 'Glucose', good: false, why: 'Glucose is what the plant makes.' },
        ] },
        { type: 'order', id: 'c2-order', conceptId: 'process', prompt: 'Build the bridge: put the steps in order.', items: [
          'Roots take in water',
          'Leaves take in carbon dioxide',
          'Chlorophyll captures sunlight',
          'The plant makes glucose',
          'Oxygen is released',
        ], explain: 'In real plants several of these happen at once, but this order shows how the ingredients become food.' },
      ] },
    { id: 'c3', unit: 'Inside a leaf', kind: 'quiz', title: 'Unit quiz', intro: 'Show what you learned.', blocks: [
      { type: 'fill', id: 'c3-fill', conceptId: 'process', prompt: 'Drag the words into the sentence.', sentence: 'Plants use ___ to turn water and carbon dioxide into ___.', answers: ['sunlight', 'glucose'], extras: ['oxygen', 'soil'], explain: 'Sunlight provides the energy, and glucose is the food.' },
      { type: 'sort', id: 'c3-sort', conceptId: 'process', prompt: 'Does it go in, or come out?', buckets: ['Goes in', 'Comes out'], items: [
        { text: 'Water', bucket: 0, why: 'Roots take it up from the soil.' },
        { text: 'Oxygen', bucket: 1, why: 'It\'s released into the air.' },
        { text: 'Carbon dioxide', bucket: 0, why: 'It enters through the stomata.' },
      ] },
      { type: 'match', id: 'c3-match', conceptId: 'parts', prompt: 'Drag each part onto its job.', pairs: [
        { term: 'Chloroplast', meaning: 'Where photosynthesis happens' },
        { term: 'Stomata', meaning: 'Let gases in and out' },
        { term: 'Roots', meaning: 'Bring up water' },
      ] },
    ] },
  ],
}

const writing: Course = {
  id: 'sample-words',
  title: 'Words people mix up',
  summary: `${sampleHint} Clear writing, one tricky word at a time.`,
  origin: 'sample', subject: 'Reading & writing', level: 'Some background',
  concepts: [
    { id: 'pairs', name: 'Commonly confused words' },
    { id: 'sentences', name: 'Joining sentences' },
  ],
  kit: {
    summary: 'A few pairs of words sound alike but do different jobs. Knowing the job of each word makes the choice easy.',
    keyIdeas: ['Affect is usually a verb, and effect is usually a noun', "They're means they are", 'A comma alone cannot join two full sentences'],
    terms: [{ term: 'Comma splice', meaning: 'Two full sentences joined by only a comma' }],
    dates: [],
  },
  lessons: [
    { id: 'w1', unit: 'Clear writing', title: 'Pick the right word', intro: 'Same sound, different job.',
      teach: [
        { type: 'read', heading: 'Ask what job the word does', body: 'Words like their, there, and they\'re sound the same, but each does a different job.\nInstead of memorizing spellings, ask what the word is doing in the sentence.' },
        { type: 'compare', heading: 'Affect or effect?', columns: ['Affect', 'Effect'], rows: [
          { label: 'Usually a', left: 'Verb (an action)', right: 'Noun (a thing)' },
          { label: 'Example', left: 'Rain can affect plans', right: 'The effect was small' },
        ] },
        { type: 'remember', points: ['Their means belonging to them', 'There means in that place', "They're means they are"] },
      ],
      blocks: [
        { type: 'match', id: 'w1-match', conceptId: 'pairs', prompt: 'Drag each word onto its meaning.', pairs: [
          { term: 'their', meaning: 'Belonging to them' },
          { term: 'there', meaning: 'In that place' },
          { term: "they're", meaning: 'They are' },
        ] },
        { type: 'voice', id: 'w1-voice', conceptId: 'pairs', prompt: 'Two words that are tricky to spell. Say them to unlock the game.', words: [
          { word: 'necessary', syllables: ['nec', 'es', 'sar', 'y'] },
          { word: 'rhythm', syllables: ['rhy', 'thm'] },
        ] },
      ] },
    { id: 'w2', unit: 'Clear writing', title: 'Fix the sentence', intro: 'One small comma can break a sentence.',
      teach: [
        { type: 'read', heading: 'What is a comma splice?', body: 'A comma splice is two full sentences joined by only a comma.\nA comma alone isn\'t strong enough. You need a joining word, a semicolon, or a period.' },
        { type: 'example', problem: 'Fix: It rained, we stayed in.', steps: [
          { step: 'Check each side', why: '"It rained" and "we stayed in" are both full sentences.' },
          { step: 'Add a joining word: It rained, so we stayed in.', why: 'A word like "so" or "and" properly connects them.' },
          { step: 'Or use a semicolon: It rained; we stayed in.', why: 'A semicolon can join two full sentences.' },
        ] },
        { type: 'remember', points: ['A comma can\'t join two full sentences alone', 'Add a joining word, or use a semicolon or period'] },
      ],
      blocks: [
        { type: 'sort', id: 'w2-sort', conceptId: 'sentences', prompt: 'Is each one correct or a comma splice?', buckets: ['Correct', 'Comma splice'], items: [
          { text: 'The bus was late, and I waited.', bucket: 0, why: '"And" properly joins the two sentences.' },
          { text: 'The bus was late, I waited.', bucket: 1, why: 'Only a comma joins two full sentences.' },
          { text: 'The bus was late; I waited.', bucket: 0, why: 'A semicolon can join two full sentences.' },
        ] },
      ] },
    { id: 'w3', unit: 'Clear writing', kind: 'quiz', title: 'Unit quiz', intro: 'Show what you learned.', blocks: [
      { type: 'fill', id: 'w3-fill', conceptId: 'pairs', prompt: 'Drag the words into the sentence.', sentence: 'The rain will ___ our plans, but the ___ will be small.', answers: ['affect', 'effect'], extras: ['effort', 'afford'], explain: 'Affect is the action here, and effect is the result.' },
      { type: 'spot', id: 'w3-spot', conceptId: 'sentences', problem: 'Which sentence has a comma splice?', lines: [
        'I was tired, so I went to bed.',
        'I was tired, I went to bed.',
        'Because I was tired, I went to bed.',
      ], wrongLine: 1, why: 'Both sides are full sentences, and only a comma joins them. Adding "so" fixes it.' },
    ] },
  ],
}

const coding: Course = {
  id: 'sample-code',
  title: 'Code your first loops',
  summary: `${sampleHint} Write and run real JavaScript right here.`,
  origin: 'sample', subject: 'Coding', level: 'Starting out',
  concepts: [
    { id: 'loops', name: 'Loops' },
    { id: 'totals', name: 'Adding things up' },
  ],
  kit: {
    summary: 'A loop repeats code for you. Most loops have a starting value, a condition to keep going, and a step.',
    keyIdeas: ['A for loop has a start, a condition, and a step', 'Use a variable outside the loop to keep a running total'],
    terms: [{ term: 'Loop', meaning: 'Code that repeats' }, { term: 'Variable', meaning: 'A named place to store a value' }],
    dates: [],
  },
  lessons: [
    { id: 'p1', unit: 'Loops', title: 'Your first loop', intro: 'Learn how a loop works, then fix one yourself.',
      teach: [
        { type: 'read', heading: 'Let the computer repeat itself', body: 'Printing 1, 2, and 3 takes three lines. Printing 1 to 1,000 would take 1,000 lines.\nA loop tells the computer to repeat something for you.' },
        { type: 'example', problem: 'for (let i = 1; i <= 3; i++) { console.log(i) }', steps: [
          { step: 'let i = 1 sets the start', why: 'i is a variable that counts, and it starts at 1.' },
          { step: 'i <= 3 is the condition', why: 'The loop keeps going while this is true.' },
          { step: 'i++ is the step', why: 'After each repeat, i goes up by 1.' },
          { step: 'It prints 1, then 2, then 3', why: 'When i reaches 4, the condition is false and the loop stops.' },
        ] },
        { type: 'check', question: 'What would i < 3 print instead?', choices: [
          { text: '1 and 2', correct: true, why: 'Right. When i is 3, i < 3 is false, so it stops before printing 3.' },
          { text: '1, 2, and 3', correct: false, why: 'Check what happens when i is 3: is 3 < 3 true?' },
        ] },
        { type: 'remember', points: ['A for loop has a start, a condition, and a step', 'The condition decides when it stops'] },
      ],
      blocks: [
        { type: 'code', id: 'p1-code', conceptId: 'loops', prompt: 'This loop stops too early. Fix it so it prints 1, 2, and 3.',
          starter: 'for (let i = 1; i < 3; i++) {\n  console.log(i)\n}',
          solution: 'for (let i = 1; i <= 3; i++) {\n  console.log(i)\n}',
          expected: '1\n2\n3', explain: 'i < 3 stops before 3. i <= 3 includes it. This is called an off-by-one error, and it happens to everyone.' },
      ] },
    { id: 'p2', unit: 'Loops', title: 'Add it all up', intro: 'Loops are great at totals.',
      teach: [
        { type: 'read', heading: 'Keep a running total', body: 'To add up a list, keep a variable outside the loop, and add to it each time around.\nIt\'s like counting money into a jar: the jar stays put while each coin goes in.' },
        { type: 'example', problem: 'Add up 2 and 3', steps: [
          { step: 'let total = 0', why: 'The jar starts empty.' },
          { step: 'total += 2 makes total 2', why: 'The first number goes in.' },
          { step: 'total += 3 makes total 5', why: 'The next number goes in.' },
          { step: 'console.log(total) prints 5', why: 'Print after the loop finishes, not during it.' },
        ] },
        { type: 'remember', points: ['Start the total outside the loop', 'Add inside the loop', 'Print after the loop'] },
      ],
      blocks: [
        { type: 'order', id: 'p2-order', conceptId: 'totals', prompt: 'Build the bridge: how do you add up a list?', items: [
          'Start a total at 0',
          'Go through each number in the list',
          'Add the number to the total',
          'Print the total when the loop ends',
        ], explain: 'Start outside the loop, add inside it, and print after it.' },
        { type: 'code', id: 'p2-code', conceptId: 'totals', prompt: 'Add up the list so this prints 10.',
          starter: 'const numbers = [1, 2, 3, 4]\nlet total = 0\nfor (const n of numbers) {\n  // add n to the total here\n}\nconsole.log(total)',
          solution: 'const numbers = [1, 2, 3, 4]\nlet total = 0\nfor (const n of numbers) {\n  total += n\n}\nconsole.log(total)',
          expected: '10', explain: 'total += n adds each number to the running total.' },
      ] },
    { id: 'p3', unit: 'Loops', kind: 'quiz', title: 'Unit quiz', intro: 'Show what you learned.', blocks: [
      { type: 'fill', id: 'p3-fill', conceptId: 'loops', prompt: 'Drag the words to name the three parts of a for loop.', sentence: 'A for loop has a ___, a ___ to keep going, and a ___.', answers: ['start', 'condition', 'step'], extras: ['print'], explain: 'In for (let i = 1; i <= 3; i++), those are the three parts, in order.' },
      { type: 'code', id: 'p3-code', conceptId: 'loops', prompt: 'Change this loop so it prints only 5, 10, and 15.',
        starter: 'for (let i = 5; i <= 15; i++) {\n  console.log(i)\n}',
        solution: 'for (let i = 5; i <= 15; i += 5) {\n  console.log(i)\n}',
        expected: '5\n10\n15', explain: 'i += 5 makes the step bigger, so the loop counts by fives.' },
    ] },
  ],
}

export const sampleLibrary: Course[] = [natureNurture, sampleCourse, science, writing, coding]
