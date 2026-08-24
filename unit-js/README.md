# `unit-js/` — the shared layer

One copy of every behaviour that is the same in all **six** components of this unit. Each
`methodica-science-volume-solid-01-0N/js/main.js` keeps only that component's configuration and screen
logic, and fills in the hook contract below.

Companions: [../docs-and-tools/REPORT-XAPI.md](../docs-and-tools/REPORT-XAPI.md) · [../docs-and-tools/RESUME.md](../docs-and-tools/RESUME.md) ·
[../docs-and-tools/ROUTING-AND-RETAKE.md](../docs-and-tools/ROUTING-AND-RETAKE.md) · [../_test/README.md](../_test/README.md)

---

## Load order

Every part's `index.html` ends with exactly this:

```html
<script src="../unit-js/10-identity.js?v=2"></script>
<script src="../unit-js/15-ui.js?v=1"></script>
<script src="../unit-js/20-xapi.js?v=3"></script>
<script src="../unit-js/25-report.js?v=1"></script>
<script src="../unit-js/30-nav.js?v=3"></script>
<script src="../unit-js/40-resume.js?v=1"></script>
<script src="../unit-js/50-loader.js?v=3"></script>
<script src="../unit-js/60-devbridge.js?v=1"></script>
<script src="js/main.js?v=N"></script>              <!-- per-part: DEFINITIONS + CONFIG ONLY -->
<script src="../unit-js/90-boot.js?v=1"></script>   <!-- the ONLY side effects -->
```

**What the numeric prefixes mean.** There is no module system here — ten `<script>` tags execute in
document order, and without the prefix the only record of that order would be six separate
`index.html` files. Counting by 5s and 10s leaves room to insert a file without renumbering.
**What they do not mean:** nothing reads them, and because every file except `90-boot.js` is
definition-only, the order among `10-`–`60-` is nearly arbitrary in practice. Only two positions carry
real weight — **`main.js` before `90-boot.js`**, and **`90-boot.js` last**.

> **`?v=` invariant.** All six `index.html` reference the same shared URLs, so a given shared file's
> `?v=` **must be identical in all six**. A mismatch means one part fetches a second copy under a
> different URL, and two parts can execute different versions of the same logic inside one learner
> session. `_test/checks.mjs` gate 2 enforces that they agree — it cannot know you changed the
> content, so **bumping is procedure**. See the cache-trap table in `../_test/README.md`.

---

## The hook contract

Every `main.js` must define these. The shared layer reads them **at call time**, never at load time,
which is why `main.js` may load after the shared files.

### Configuration

| Name | Kind | Read by |
|---|---|---|
| `TOTAL_SCREENS` | number | `goTo`, dev bridge, `25-report.js` |
| `SCREEN_TO_SUBCONTENT` | object, exactly `TOTAL_SCREENS` entries | `xapiOnScreen`, `submitReport` |
| `XAPI_COMP_SLUG`, `XAPI_COMP_ID` | string | `xapiItemId` |
| `XAPI_EVAL_ITEMS` | object | `xapiOnScreen`, `xapiFinishItems` |
| `XAPI_ITEM_RESULT` | object, *optional* | `xapiItemResult` |
| `XAPI_METADATA_FILE` | string | `bootXAPI` |
| `RESUME_PLAIN_VARS` | array (may be `[]`) | that part's own capture/apply |
| `RESUME_INPUT_IDS`, `RESUME_TEXT_IDS` | array, optional | that part's own `applyResumeDom` |

### Functions

| Name | Notes |
|---|---|
| `resetScreenState(n)` | dispatches to the screen's `sNNEnter()`. **May not report** — see below |
| `restoreScreenUI(n)` | repaints the answered look; must be exception-safe |
| `capturePartPayload()` | this part's payload, including `currentScreen`. **Must deep-clone** |
| `applyResumeVars(st)` | **the parameter must be named `st`** |
| `applyResumeDom(st)` | restores DOM-only answers |
| `onXapiReady()` | *optional* — runs after the component `initialized` |
| `partBoot()` | *optional* — currently unused; see below |

---

## Three standing rules

Each exists because a real bug in this unit was caused by breaking it, and each failure was silent.

### 1. Nothing may report from `resetScreenState()`

`resetScreenState` runs on **every** navigation, every back-navigation and every resume replay. A
statement sent from there repeats.

Parts 05 and 06 both did this: the terminal component `completed` lived in `resetScreenState`, so
merely navigating onto the score screen reported a finished assessment. Part 05 additionally hard-coded
`success: true`, so a learner who answered nothing was reported as having **passed**; part 06's send sat
outside the `n === 5` test and fired on **both** end screens, producing two contradictory `completed`
statements from a single pass. Both now live in a `peakFinish()` called from `peakContinue()`.

### 2. No statement may be emitted from a deferred callback

`xapiSend()` defers by one macrotask. That is fine for an ordinary answer, and **wrong for anything
that must be ordered or suppressed**:

- A deferred send outlives `applyExecutionState()`'s sender stub **and** the `_restoring` flag, so it
  escapes both of resume's guards.
- On the last sub-part of an assessment, `peakContinue()` and `peakFinish()` run in the same click, so
  a deferred answer arrives *after* the item, component and unit `completed`. Observed exactly that.

So: **`completed` is always synchronous**, and the assessment answers in parts 05/06 are too.

### 3. `capturePartPayload()` must deep-clone

`practiceEnter()` mutates `practiceProgress`. A payload holding a live reference would mutate with it,
so the snapshot `goTo()` takes *before* `resetScreenState()` would already contain the change it exists
to undo — a silent, total defeat of the mechanism in three of six parts. The same applies to `SCQ_REG`,
`DDQ_REG.cfg.placement`, `comicState`, `flipState` and `peakAnswers`.

**Never capture** the live DnD controllers (`dispDnd`, `aqDnd`, `floodDnd`, `measDnd`) or comic
`built`/`timer`/`token` — they are DOM and timer identity, not learner state, and a restored
`built: true` makes `comicBuild()` early-return against an empty track.

> ⚠️ **`applyResumeVars`'s parameter must stay named `st`.** It runs `eval(k + ' = st.vars[k];')`,
> which resolves `st` lexically. Renaming it fails **silently**: the assignment throws, the surrounding
> `try/catch` swallows it, and the learner's answers vanish with nothing in the console. Assignments are
> whitelisted against `RESUME_PLAIN_VARS` so a tampered document cannot assign an arbitrary name.

---

## Why boot order is explicit

`90-boot.js` is the only file here with top-level side effects:

1. **`scaleApp()` first.** Nothing else in boot reads the canvas transform, but `appScale()` — which
   every popup drag divides by — parses `#app.style.transform`, which does not exist until `scaleApp`
   has written it.
2. **`initDevBridge()` before `bootXAPI()`.** `bootXAPI()` may `window.location.replace()` to another
   component (the resume hop), and nothing after it runs.
3. **`bootXAPI()` last**, exactly as every `main.js` used to end.

No `DOMContentLoaded` wrapper is needed: `90-boot.js` sits immediately before `</body>`.

**There is no `partBoot()` in use.** The sibling unit routes per-component startup through that hook;
this unit does not need it, because every per-part side effect (the `scq`/`ddq`/practice registrations,
the keydown listeners, the dropdown-close delegation, part 03's first `resetScreenState`) still runs at
`main.js` top level — and `main.js` loads *before* `90-boot.js`. The ordering guarantee `partBoot`
exists to provide therefore already holds. The hook is still called if a component ever defines one.

---

## Adding to the shared layer

**No identifier may be declared at top level in both a shared file and a part file.** A `let`/`const`
collision is a loud `SyntaxError` that blanks the screen; a **`var`/`function` collision is a silent
last-wins overwrite** — and `main.js` loads *after* the shared files, so a leftover part-local copy
**wins** and the extraction looks successful while shipping the old code. `_test/checks.mjs` gate 1
checks this; hook names are the expected exceptions.

**When components disagree, take the superset and prove it inert.** Worked examples from this unit:
`goTo` gained part 01's popup-sweep and `video.pause()` (inert where there is no video) plus a
null-screen guard no part had; `backToReportForm` gained part 01's focus restore (the modal markup is
uniform, so it cannot throw); `submitReport` kept the `console.error` that only three parts had.

**`28-feedback-drag.js` is deliberately absent.** The sibling's version replaces `window.goTo` with a
wrapper, which is why its README warns it must be the last thing to touch `goTo`. This unit wraps
nothing and uses per-popup `attachPopupDrag` instead. Porting it would *introduce* an ordering hazard
into a codebase that does not have one.

---

## Files

| File | What it holds |
|---|---|
| `10-identity.js` | `XAPI_ID_PREFIX`, `window.XAPI_UNIT_ID`, `shortId()`, `RESUME_ENABLED` |
| `15-ui.js` | `announce`, `scaleApp`, `appScale`, image zoom, `attachPopupDrag` |
| `20-xapi.js` | item scope and question ids — `xapiOnScreen`, `xapiQ`, `xapiFinishItems`, `xapiAnswerText`, `xapiSend` |
| `25-report.js` | the whole "מצאתם בעיה?" layer + `initReportModal()` |
| `30-nav.js` | `currentScreen`, `goTo()`, `applyExecutionState()` |
| `40-resume.js` | the resume core, the three ledgers, cross-part back, save/flush |
| `50-loader.js` | `bootXAPI()` — CDN loader, `?xapiLib`, metadata settle, resume hop, `onXapiReady()` |
| `60-devbridge.js` | `initDevBridge()` — the `index_dev.html` postMessage bridge (**is** deployed here) |
| `90-boot.js` | the startup sequence — the only side effects |

## What this cost and bought

The six `main.js` went from 3,419 lines to ~4,063 including the resume payloads; `unit-js/` is 1,234.
**The raw total went up**, and the honest reason is comment density: the extracted code was dense
one-liners, and these files document every superset choice and silent-failure trap at the point it
matters.

What it bought is that nine behaviours now have exactly one copy instead of three to six — the report
modal, the loader, `scaleApp`, identity, `goTo`/`currentScreen`, `xapiSend`, the dev bridge,
`attachPopupDrag`, and image zoom. Four defects were fixed or made visible in passing: `shortId`'s
trailing-slash bug, the `currentScreen`-before-guard ordering bug, part 03's missing
`TOTAL_SCREENS`/`goTo`/`resetScreenState`, and silently-swallowed item statements (now a loud warning).
