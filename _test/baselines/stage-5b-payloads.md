# Stage 5b — per-part resume payloads, shipped dark

`RESUME_ENABLED` is still **false**; Stage 5c flips it. Statement output is unchanged from Stage 5a.

## What landed

| Where | What |
|---|---|
| `unit-js/30-nav.js` | the capture → `resetScreenState` → re-apply → repaint block inside `goTo()`, plus `applyExecutionState(st)` |
| all six `js/main.js` | `RESUME_PLAIN_VARS`, `capturePartPayload()`, `applyResumeVars(st)`, `applyResumeDom(st)`, `restoreScreenUI(n)` |
| parts 02–06 `index.html` | `#back-to-prev-part` in s0's `.nav-bar`, shipped `hidden` |
| five routers | `writeForwardState()` — 01→(03\|02), 02→03, 03→04, 04→05, 05→06 |

Part 01 has **no** back button, by design: it is the entry component every launch passes through.

## The design decision that shapes everything else

**Most of part 01 already restores itself.** `imgqEnter`, `dispEnter`, `aqEnter`, `floodEnter`,
`flipEnter`, `guessEnter`, `comicSliderEnter`, `measEnter`→`measRender`, `scqEnter`'s `done` branch and
`ddqEnter`+`ddqRender` all rebuild their screen from the variables the second assignment pass has just
restored. That is what makes 33 screens tractable: the payload's job is to carry those variables
faithfully, and `restoreScreenUI()` only fills the gaps where an `enter()` does not repaint everything.

Four gaps needed code, and nothing else:

| screen(s) | gap |
|---|---|
| s2 | `hookOpenInput()` derives the hint/continue gate from the textarea only on `input`; `applyResumeDom` puts the text back afterwards, so the gate must be re-derived |
| s10, 13, 14, 15, 16, 19 | `scqEnter`'s `done` branch disables options and relabels the button but never repaints the marks or a mid-attempt selection → new `scqRestoreUI()` |
| s22 | `measRender()` rebuilds everything from `measStep`/`measDone`/`measRevealed` **except** the confirm button, which it derives from `#meas-input`'s live value — restored after `measRender` already ran |
| comic sliders | `comicBuild()` seeds a FRESH record at `i:0` when `comicState[sid]` is absent (as after a reload), so the learner would land on panel 1 of a slider they had finished → re-call `comicSliderGo(sid, cs.i, {animate:false})` |

Everything absent from `restoreScreenUI` is absent **deliberately** — a redundant painter is dead code
that drifts out of step with the branch it duplicates.

## What is deliberately NOT captured

| excluded | why |
|---|---|
| `dispDnd`, `aqDnd`, `floodDnd`, `measDnd` | live pointer-drag controllers bound to DOM nodes that do not exist after a reload. Serialising one yields `{}`, and restoring it convinces the `enter()` that the applet is already wired when it is not |
| comic `built` | a restored `built:true` makes `comicBuild()` early-return against an empty track → a blank comic |
| comic `timer`, `token` | timer identity, not learner state |
| `SCQ_REG[*].cfg`, `DDQ_REG[*].cfg` (except `placement`) | functions and popup copy. `cfg.placement` IS captured — registration seeds it and dragging mutates it, so it is learner state that happens to live on the config object |
| `practiceProgress[*].screen`, `.number` | static table data. A stale document must not be able to override a later screen renumber |

## Verified

### The deep-clone requirement — the hazard I was most worried about

`practiceEnter()` mutates `practiceProgress` (`q.visited = true`, `q.state = 'current'`). If the
payload held a live reference, the snapshot `goTo()` takes **before** `resetScreenState()` would
already contain the mutation it exists to undo — a silent, total defeat of the mechanism in three of
six parts. Proven not to happen:

| object | test | result |
|---|---|---|
| `practiceProgress` | capture, then navigate so `practiceEnter` mutates the live object | payload unchanged ✓ |
| `SCQ_REG[*]` | capture, then set `sel = 'MUTATED'` | payload unchanged ✓ |
| `DDQ_REG[*].cfg.placement` | capture, then overwrite a slot | payload unchanged ✓ |
| `comicState[*].seen` (nested array) | capture, then write `seen[0] = 'MUTATED'` | payload unchanged ✓ |
| `peakAnswers` | capture, then add key `3` | payload unchanged ✓ |

### Round-trip on navigation (part 02)

Answer Q1 → navigate away → navigate back: `sel`, `done`, `attempts`, `practiceProgress` state, the
correct mark, the button label (`שנמשיך?`) and the disabled options all survive, and **exactly one**
`answered` statement exists (nothing re-reported).

### Simulated reload (part 02) — the real test

Built a mixed state (s1 solved-correct, s2 **mid-attempt**: one wrong, not done), captured the
payload, then wiped every trace — `XAPI_Q_RESULTS`, all of `SCQ_REG`, `practiceProgress`, and every
DOM class — and restored from the payload alone:

| after wipe | after restore |
|---|---|
| `s1.done: false`, `s2.attempts: 0`, 0 marks | `s1: {sel:'b', done:true}`, `s2: {sel:'a', attempts:1, done:false}` |
| | `qResults: {01/q1: true}`, practice `['correct','not-answered','not-answered']` |
| | s2's interim wrong mark repainted, check button enabled |

The mid-attempt branch is the one most likely to be got wrong, and it survives.

### The assessment guard, layer 1 (part 05)

Answered sub-parts 1–2, captured, wiped `peakAnswers` and every `.picked` class, restored: answers
back, `peakScore()` back to 2, s1's pick re-marked `b`, continue enabled — and **no answer
re-reported** by the restore itself (2 before, 2 after). That is what stops `peakContinue()` from
being reachable for a committed sub-part; `sendAnsweredOnce` is the structural backstop behind it.

### The comic slider (part 01) — the hardest gap

Tested on **s27, which has 7 panels** (an earlier attempt used s8, which has only one, so the index
could never move and the test proved nothing):

| | |
|---|---|
| live after paging | `i: 4`, 5 panels seen |
| wiped | `comicState.s27` deleted **and** the track emptied — a true reload |
| restored | track rebuilt with 7 panels, `i: 4`, `seenCount: 5` |
| **visible panel** | `translateX(400%)` — panel 5, not panel 1 |
| statements from the restore | **0** — no re-emitted `experienced` |

## Dark-ship acceptance

| | |
|---|---|
| `RESUME_ENABLED` | false |
| `_unitState` / `_resumeReady` / `_restoring` | `null` / false / false |
| part 06 full run statement sequence | **identical** to Stage 5a |
| `__dupes()` | empty |
| `#back-to-prev-part` | present in 02–06, `hidden`; absent from 01 |
| all five `checks.mjs` gates | green |
| console | clean |

## Notes for Stage 5c

1. **The back button uses the existing `.btn-back` style**, whose CSS comment says "Back never shows
   on S0" — because the *in-part* back never does. The cross-part one shows only there, so the two
   never collide. No new CSS was needed.
2. **`applyExecutionState` depends on `window.sendStatement720` being writable**, verified empirically
   in Stage 3. Re-check on every library bump: if it ever becomes `const`/`let`, the no-op swap fails
   silently and resume re-reports everything.
3. **`scqReset` still clears the attempt counter** on re-entry (the part 04 finding). With the
   capture/re-apply block now in `goTo()`, restored attempts survive navigation — so this is
   incidentally fixed for the resume path, but only once `RESUME_ENABLED` is true.
