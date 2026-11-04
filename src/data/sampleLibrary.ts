import type { Course } from '../lib/course.ts'
import { sampleCourse } from './sampleCourse.ts'

// Hand-written starter courses, so there's something to explore in every subject.
// The app labels them as samples and never presents them as AI-generated.
const sampleHint = 'Hand-written sample.'

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
    { id: 'c1', title: 'Say it, then fly', intro: 'Two big science words, sounded out.', blocks: [
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
    { id: 'c2', title: 'What goes in, what comes out', intro: 'Follow the ingredients.', blocks: [
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
      { type: 'fill', id: 'c2-fill', conceptId: 'process', prompt: 'Drag the words into the sentence.', sentence: 'Plants use ___ to turn water and carbon dioxide into ___.', answers: ['sunlight', 'glucose'], extras: ['oxygen', 'soil'], explain: 'Sunlight provides the energy, and glucose is the food.' },
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
    { id: 'w1', title: 'Pick the right word', intro: 'Same sound, different job.', blocks: [
      { type: 'match', id: 'w1-match', conceptId: 'pairs', prompt: 'Drag each word onto its meaning.', pairs: [
        { term: 'their', meaning: 'Belonging to them' },
        { term: 'there', meaning: 'In that place' },
        { term: "they're", meaning: 'They are' },
      ] },
      { type: 'fill', id: 'w1-fill', conceptId: 'pairs', prompt: 'Drag the words into the sentence.', sentence: 'The rain will ___ our plans, but the ___ will be small.', answers: ['affect', 'effect'], extras: ['effort', 'afford'], explain: 'Affect is the action here, and effect is the result.' },
      { type: 'voice', id: 'w1-voice', conceptId: 'pairs', prompt: 'Two words that are tricky to spell. Say them to unlock the game.', words: [
        { word: 'necessary', syllables: ['nec', 'es', 'sar', 'y'] },
        { word: 'rhythm', syllables: ['rhy', 'thm'] },
      ] },
    ] },
    { id: 'w2', title: 'Fix the sentence', intro: 'Find what is breaking the sentence.', blocks: [
      { type: 'spot', id: 'w2-spot', conceptId: 'sentences', problem: 'Which sentence has a comma splice?', lines: [
        'I was tired, so I went to bed.',
        'I was tired, I went to bed.',
        'Because I was tired, I went to bed.',
      ], wrongLine: 1, why: 'Both sides are full sentences, and only a comma joins them. Adding "so" fixes it.' },
      { type: 'sort', id: 'w2-sort', conceptId: 'sentences', prompt: 'Is each one correct or a comma splice?', buckets: ['Correct', 'Comma splice'], items: [
        { text: 'It rained, and we stayed in.', bucket: 0, why: '"And" properly joins the two sentences.' },
        { text: 'It rained, we stayed in.', bucket: 1, why: 'Only a comma joins two full sentences.' },
        { text: 'It rained; we stayed in.', bucket: 0, why: 'A semicolon can join two full sentences.' },
      ] },
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
    { id: 'p1', title: 'Your first loop', intro: 'Change the code, press run, and see what happens.', blocks: [
      { type: 'code', id: 'p1-code', conceptId: 'loops', prompt: 'This loop stops too early. Fix it so it prints 1, 2, and 3.',
        starter: 'for (let i = 1; i < 3; i++) {\n  console.log(i)\n}',
        solution: 'for (let i = 1; i <= 3; i++) {\n  console.log(i)\n}',
        expected: '1\n2\n3', explain: 'i < 3 stops before 3. i <= 3 includes it. This is called an off-by-one error, and it happens to everyone.' },
      { type: 'fill', id: 'p1-fill', conceptId: 'loops', prompt: 'Drag the words to name the three parts of a for loop.', sentence: 'A for loop has a ___, a ___ to keep going, and a ___.', answers: ['start', 'condition', 'step'], extras: ['print'], explain: 'In for (let i = 1; i <= 3; i++), those are the three parts, in order.' },
    ] },
    { id: 'p2', title: 'Add it all up', intro: 'Loops are great at totals.', blocks: [
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
  ],
}

export const sampleLibrary: Course[] = [sampleCourse, science, writing, coding]
