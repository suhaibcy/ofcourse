# ofCourse Learn

**Tell it what you want to learn, add your notes or documents, and get a full course that teaches you first, then lets you practice.**

Built for the Meta Global AI Developer Hackathon (Indie Developer track, Build for Your World). ofCourse started as a phone-first planner for college students. This project adds Learn: subjects to explore, mastery levels, hands-on coding labs, and Hoot the owl, who uses Meta's models to read your materials, plan units, teach lessons, summarize your notes, adapt to your level, find your exam dates, and build the practice and quizzes.

**Who it's for:** the long-term goal is learners of every level. This version is for people 18 and older, as the Meta Model API terms (section 10.1) require.

**Inspired by** how free learning platforms like Khan Academy (subjects, mastery) and Kaggle (hands-on labs, progression) work. Not affiliated with either.

**Try it:** run it locally (below) to build real courses. The [public site](https://suhaibcy.github.io/ofcourse/) has the hand-written sample courses with AI turned off, because a public AI route would let anyone spend the credits.

## After submission

The tag [`submitted`](https://github.com/suhaibcy/ofcourse/tree/submitted) marks the code as it stood when the project was submitted, and [this comparison](https://github.com/suhaibcy/ofcourse/compare/submitted...main) shows everything changed since: faster and more reliable course builds, Hoot's live tutor, device-local learning memory, adaptive practice, short lecture audio, a safer code sandbox, and the desktop layout.

## What was built during the hackathon

**Everything in [this comparison](https://github.com/suhaibcy/ofcourse/compare/hackathon-baseline...submitted) was built during the hackathon.** The `hackathon-baseline` tag marks the existing app before any hackathon work. Hoot's drawing, the design tokens, shared buttons, and the planner, calendar, notes, and grades screens already existed.

New during the hackathon:
- The course engine, checks, and mastery tracking (`src/lib/course*.ts`, `formula.ts`, `mastery.ts`)
- Thirteen interactive lesson types, including voice-controlled and arcade games, drag and drop, and a code lab (`src/components/blocks/`, `src/lib/voiceGame.ts`, `src/lib/mic.ts`, `src/lib/runCode.ts`)
- Teaching: units, explanations, worked examples, live graphs, comparisons, and quick checks that come before any practice (`src/components/TeachDeck.tsx`)
- The Learn hub: subjects, pre-written sample courses, mastery levels, points and ranks, streaks, unit quizzes, and the course exam (`src/data/sampleLibrary.ts`)
- PDF, photo, and text file uploads (`src/lib/pdfPages.ts`, `src/lib/shrinkImage.ts`)
- Study notes that save to the Notes tab, and study plans that save to the planner (`src/screens/CourseView.tsx`, `src/lib/studyPlan.ts`)
- The Courses screens (`src/screens/LearnScreen.tsx`, `CoursePlayer.tsx`, `src/styles/learn.css`)
- The Meta model pipeline (`server/`, `api/`)

Added after the `submitted` tag:
- Hoot's live tutor: "Hoot, why was that wrong?" and "Ask Hoot about this lesson" (`src/lib/tutor.ts`, `src/components/TutorPanel.tsx`)
- Learning memory and "What Hoot has noticed", stored on the device (`src/lib/memory.ts`, `src/components/HootNoticed.tsx`)
- Practice this: new checked activities on one concept, in the existing games (`src/lib/practice.ts`, `src/screens/PracticeRun.tsx`)
- Lecture audio of up to 10 minutes combined with notes (`src/lib/lecture.ts`)
- Reliability: retries, resumable builds, an error boundary, and clear handling of cut-off or refused replies (`server/meta.ts`, `src/lib/courseClient.ts`)

## How it works

```
What you want to learn, plus any PDFs, photos, notes, or a short lecture recording
   |
   v
1. READ      Muse Spark reads the materials, summarizes them, finds dates, quotes
   |         where each concept came from, and notes what a lecture's words stress
   v
2. PLAN      Muse Spark splits the course into units that build on each other
   |
   v
3. WRITE     Each unit is written separately: lessons that teach first, practice
   |         on what was taught, then a quiz. The AI fills in cards and activities
   |         we built. It never writes app code.
   v
4. CHECK     Plain code removes broken items and any copy of the original problems.
   |         A unit that stops making sense as lessons gets one rewrite
   v
5. VERIFY    A separate Muse Spark call solves step-through and spot-the-mistake
   |         questions without seeing the answers, and can say none of the choices
   |         fit. Another fact-checks the teaching and every activity. Anything that
   |         fails is removed. Code labs run their solution in a sandbox.
   v
A course: units, lessons, quizzes, an exam, notes, and a study plan
```

### While you learn
After a course is built, Muse Spark can still help, one question at a time:

```
You answer wrong > Hoot, why was that wrong? > a likely mix-up and a hint, not the answer
                 > Practice this > new activities on that concept, checked the same way
                 > back to the same question > the result updates What Hoot has noticed
```

The tutor gets only what it needs: the course, lesson, concept, question, your answer, and a short summary of your recorded results. Plain code rejects any reply that states the answer word for word, contains markup, or is malformed, and the lesson's own explanation is the fallback. Next-step recommendations come from fixed rules on your results, not from the AI.

### Measured on real runs
A 17-page PDF through the full pipeline at `muse-spark-1.3` Standard, in November 2026. Cost is our estimate from token counts and published rates.

| | Before tuning | Now |
|---|---|---|
| Full course from the PDF | 306 s, about $0.32 | 114 to 136 s, about $0.12 |
| Hoot explains a wrong answer | | about 13 to 17 s |
| Ask Hoot about a lesson | | about 6 to 7 s |
| Two new practice activities | | about 21 to 39 s |

Most of the speed came from setting a reasoning effort for each step (`low` for writing, `medium` for checking), not rewriting a whole unit over one broken activity, and running the two checkers side by side. Those checkers still found real problems in these runs, including an activity whose choices didn't fit its question, and removed them.

### The lesson types
| Type | What you do |
|---|---|
| Say it and Fly | Say hard words from your coursework out loud (Muse Voice Transcribe listens) to unlock Hoot Flight, where the volume of your voice flies Hoot through letter rings to spell the word |
| Catch it | Slide Hoot to catch the right answers and dodge the wrong ones |
| Build the bridge | Tap the steps of a process in order. Each right step lays a plank for Hoot to cross |
| Flip cards | A memory game that pairs each term with its meaning |
| Match up | Drag each term onto its meaning |
| Fill the blanks | Drag words into a sentence |
| Code lab | Edit and run real JavaScript until it prints the right output |
| Step-through | Solve a problem one decision at a time, with an explanation for each wrong turn |
| Sandbox | Move sliders until your live curve lands on the target |
| Spot the mistake | Tap the line where a worked solution goes wrong |
| Sort it | Tap each item into the right group |
| Calculate | Type a number; code runs the formula to get the answer |
| Explain it back | Say the idea out loud with Muse Voice Transcribe, then see which points you covered |

### Design choices
- **The AI proposes, code decides.** Formulas run through an allowlist and a math library, so AI arithmetic never sets a Calculate answer. Code labs run in a sandboxed iframe and Web Worker with no network access or access to the app's data. Practice sets never include code labs.
- **A claim needs evidence.** Explain it back only counts a point as covered if its quote really appears in your transcript. When the source is text, "From your work" quotes that can't be found in it are removed.
- **Mastery has to be earned.** Practice mode and self-checks finish an activity but don't raise mastery, because nothing confirmed them.
- **It won't do your homework.** Lessons are designed around new practice problems, and code rejects any problem that closely matches the original coursework.
- **Privacy.** The server only holds files and recordings for the request and doesn't save or log them. Learning memory stays in your browser. It uses Muse Spark's Standard mode, which Meta says isn't used to improve its products.
- **Recording permission.** Lecture audio needs you to confirm you have permission first. Stressed points come from the transcript's words, never tone of voice.
- **18 and older.** This follows the Meta Model API terms, section 10.1.

## Meta models used
- `muse-spark-1.3`: reading coursework, designing courses, independently solving questions, checking explanations
- `muse-voice-transcribe-1.0`: Say it and Fly, Explain it back, lecture audio

The volume control in Hoot Flight runs on the device, and that audio isn't uploaded. A spoken word counts when the transcript contains that exact word. The API has no per-sound scores, so the game shows what it heard rather than claiming a pronunciation score.

## Run it
```
npm install
cp .env.example .env
npm run dev
```
Then open `http://localhost:5173/`. With `AI_ENABLED=false` (the default), no AI calls are made and the pre-written sample courses still work. They're labeled as samples: they were written with an AI coding assistant, not generated by the app or Meta's models. The Nature-Nurture sample is based on "The Nature-Nurture Question" by Eric Turkheimer (Noba). To build real courses, add `MODEL_API_KEY` and set `AI_ENABLED=true`, then restart.

Courses and progress are saved in your browser, so they stay on that device and in that browser.

**Tests:** `npm test`. The pipeline tests use a fake API, so they cost nothing.

## Known limits
- Tested with real API calls, but not yet with real handwriting or a real human voice (voice runs used computer-generated speech). Voice checks whether the exact word was heard. They aren't pronunciation scores.
- The hosted functions in `api/` haven't been run on Vercel yet. Local `npm run dev` is the tested way to use AI.
- The public AI routes have no login, so don't deploy them with `AI_ENABLED=true` without adding an access gate.
- PDFs with a text layer are read in full, up to about 60,000 characters. Scanned PDFs use photos of the first 5 pages. Lecture audio is limited to 10 minutes.
- The tutor's answer check catches the answer stated word for word, not every paraphrase.
- Claims about learning results would need measuring, and none have been measured.

## Stack
Vite, React, TypeScript, Motion, mathjs, and Vercel functions. Built with help from AI coding tools.

## License
Code is under the [MIT license](LICENSE). The ofCourse name and Hoot branding are not licensed as trademarks.

Built by Suhaib Chaudry.
