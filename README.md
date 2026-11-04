# ofCourse Learn

**A study platform that turns your own coursework into games, notes, and a study plan.**

Built for the Meta Global AI Developer Hackathon (Indie Developer track, Build for Your World). ofCourse started as a phone-first planner for college students. This project adds Learn: subjects to explore, mastery levels, hands-on coding labs, and Hoot the owl, who uses Meta's models to read your notes, summarize them, adapt to your level, find your exam dates, and build lessons you do instead of lessons you watch.

**Who it's for:** the long-term goal is learners of every level. This version is for people 18 and older, as the Meta Model API terms (section 10.1) require.

**Inspired by** how free learning platforms like Khan Academy (subjects, mastery) and Kaggle (hands-on labs, progression) work. Not affiliated with either.

**Open it directly:** add `/#/learn` to the app's address.

## What was built during the hackathon

**Everything in [this comparison](https://github.com/suhaibcy/ofcourse/compare/hackathon-baseline...main) is new.** The `hackathon-baseline` tag marks the existing app before any hackathon work. Hoot's drawing, the design tokens, shared buttons, and the planner, calendar, notes, and grades screens already existed.

New during the hackathon:
- The course engine, checks, and mastery tracking (`src/lib/course*.ts`, `formula.ts`, `mastery.ts`)
- Thirteen interactive lesson types, including voice-controlled and arcade games, drag and drop, and a code lab (`src/components/blocks/`, `src/lib/voiceGame.ts`, `src/lib/mic.ts`, `src/lib/runCode.ts`)
- The Learn hub: subjects, pre-written sample courses, mastery levels, points and ranks, streaks, and the course challenge (`src/data/sampleLibrary.ts`)
- Study notes that save to the Notes tab, and study plans that save to the planner (`src/screens/CourseView.tsx`, `src/lib/studyPlan.ts`)
- The Courses screens (`src/screens/LearnScreen.tsx`, `CoursePlayer.tsx`, `src/styles/learn.css`)
- The Meta model pipeline (`server/`, `api/`)

## How it works

```
Photos or notes
   |
   v
1. READ      Muse Spark reads the coursework and quotes where each concept came from
   |
   v
2. DESIGN    Muse Spark fills in lesson blocks we built. It never writes app code.
   |
   v
3. CHECK     Plain code rejects broken blocks and any copy of the original problems
   |
   v
4. VERIFY    A separate Muse Spark call solves the step-through and spot-the-mistake
   |         questions without seeing the answers. If it disagrees with the answer
   |         key, that activity is removed.
   v
A course map you can play, with a Fix it round built from what you missed
```

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
- **The AI proposes, code decides.** Formulas run through an allowlist and a math library, so AI arithmetic never sets a Calculate answer and AI text never runs as code.
- **A claim needs evidence.** Explain it back only counts a point as covered if its quote really appears in your transcript.
- **It won't do your homework.** Lessons are designed around new practice problems, and code rejects any problem that closely matches the original coursework.
- **Privacy.** The server only holds photos and recordings for the request and doesn't save or log them. It uses Muse Spark's Standard mode, which Meta says isn't used to improve its products.
- **18 and older.** This follows the Meta Model API terms, section 10.1.

## Meta models used
- `muse-spark-1.3`: reading coursework, designing courses, independently solving questions, checking explanations
- `muse-voice-transcribe-1.0`: Say it and Fly, Explain it back

The volume control in Hoot Flight runs on the device, and that audio isn't uploaded. A spoken word counts when the transcript contains that exact word. The API has no per-sound scores, so the game shows what it heard rather than claiming a pronunciation score.

## Run it
```
npm install
cp .env.example .env
npm run dev
```
Then open `http://localhost:5173/#/learn`. With `AI_ENABLED=false` (the default), no AI calls are made and the pre-written sample courses still work. They're labeled as samples and weren't generated by the app or Meta's models. To build real courses, add `MODEL_API_KEY` and set `AI_ENABLED=true`.

**Tests:** `npm test`. The pipeline tests use a fake API, so they cost nothing.

## Stack
Vite, React, TypeScript, Motion, mathjs, and Vercel functions. Built with help from AI coding tools.

## License
Code is under the [MIT license](LICENSE). The ofCourse name and Hoot branding are not licensed as trademarks.

Built by Suhaib Chaudry.
