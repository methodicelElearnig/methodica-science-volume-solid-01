# `unit-js/` — the shared layer

One copy of every behaviour that is the same in all **seven** components of this unit (six until
the 2026-10-14 split, when standard practice left part 01 to become part 02). Each
`methodica-science-volume-solid-01-0N/js/main.js` keeps only that component's configuration and screen
logic, and fills in the hook contract below.

Companions: [../docs-and-tools/REPORT-XAPI.md](../docs-and-tools/REPORT-XAPI.md) · [../docs-and-tools/RESUME.md](../docs-and-tools/RESUME.md) ·
[../docs-and-tools/ROUTING-AND-RETAKE.md](../docs-and-tools/ROUTING-AND-RETAKE.md) · [../_test/README.md](../_test/README.md)

---

## Load order

Every part's `index.html` ends with exactly this:

```html
<script src="../unit-js/10-identity.js?v=20261020"></script>
<script src="../unit-js/15-ui.js?v=20261020"></script>
<script src="../unit-js/20-xapi.js?v=20261020"></script>
<script src="../unit-js/25-report.js?v=20261020"></script>
<script src="../unit-js/30-nav.js?v=20261020"></script>
<script src="../unit-js/40-resume.js?v=20261020"></script>
<script src="../unit-js/50-loader.js?v=20261020"></script>
<script src="../unit-js/60-devbridge.js?v=20261020"></script>
<script src="js/main.js?v=20261020"></script>       <!-- per-part: DEFINITIONS + CONFIG ONLY -->
<script src="../unit-js/90-boot.js?v=20261020"></script>   <!-- the ONLY side effects -->
```

**What the numeric prefixes mean.** There is no module system here — ten `<script>` tags execute in
document order, and without the prefix the only record of that order would be seven separate
`index.html` files. Counting by 5s and 10s leaves room to insert a file without renumbering.
**What they do not mean:** nothing reads them, and because every file except `90-boot.js` is
definition-only, the order among `10-`–`60-` is nearly arbitrary in practice. Only two positions carry
real weight — **`main.js` before `90-boot.js`**, and **`90-boot.js` last**.

> **`?v=` invariant.** All seven `index.html` reference the same shared URLs, so a given shared file's
> `?v=` **must be identical in all seven**. A mismatch means one part fetches a second copy under a
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
| `XAPI_END_BTN` | string — id of the part's finish button | `restoreEndedButton` (D-8) |
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
| `xapiPartResult()` | the component's `{success, score}` for its `completed` |
| `partFinish(btn)` | the last click: `xapiEndComponent(xapiPartResult(), btn)` — report, disable, STOP |
| `onXapiReady()` | *optional* — runs after the component `initialized`; loads the unit metadata for the bug-report form, sends nothing |
| `partBoot()` | *optional* — currently unused; see below |

---

## Three standing rules

Each exists because a real bug in this unit was caused by breaking it, and each failure was silent.

### 1. Nothing may report from `resetScreenState()`

`resetScreenState` runs on **every** navigation, every back-navigation and every resume replay. A
statement sent from there repeats.

The two peak parts (then 05 and 06, now 06 and 07) both did this: the terminal component `completed`
lived in `resetScreenState`, so merely navigating onto the score screen reported a finished assessment.
מועד א additionally hard-coded `success: true`, so a learner who answered nothing was reported as having
**passed**; מועד ב's send sat outside the `n === 5` test and fired on **both** end screens, producing two
contradictory `completed` statements from a single pass. Both now live in a `peakFinish()` called from
`peakNext()` after סעיף ד.

### 2. Every statement is synchronous, through the shared helpers

There is no deferred sender any more (`xapiSend` was deleted 2026-10-20). `xapiAnswered`,
`xapiRequestedHint`, `xapiEndComponent` and the direct `selected` all send synchronously, because a
deferred send outlives `applyExecutionState()`'s sender stub **and** the `_restoring` flag and would
be re-reported on every resume onto a finished screen. `completed` goes only through `partFinish`,
from the learner's last click, and nothing may follow it (no navigation outside `DEV_NAV`, no
`postMessage`, no close).

### 3. `capturePartPayload()` must deep-clone

`practiceEnter()` mutates `practiceProgress`. A payload holding a live reference would mutate with it,
so the snapshot `goTo()` takes *before* `resetScreenState()` would already contain the change it exists
to undo — a silent, total defeat of the mechanism in three of seven parts (02, 03, 05). The same applies to `SCQ_REG`,
`DDQ_REG.cfg.placement`, `comicState`, `flipState` and `peakState` (`peakAnswers` before 2026-10-14).

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

1. **`initResumeResetHatch()` first.** It strips `?resetState` from the URL and sets the reset flag,
   so it must run before anything reads the query or the state document.
2. **`scaleApp()`.** `appScale()` — which every popup drag divides by — parses `#app.style.transform`,
   which does not exist until `scaleApp` has written it.
3. **`initDevBridge()` then `syncDevBackButton()`** — the cross-part back button is hidden by attribute
   and inline display unless `DEV_NAV`.
4. **`initResumeLeaveHandlers()`**, then **`bootXAPI()` last.** The loader runs the two-phase restore
   (Phase A reads the document and adopts the character before the metadata poll; Phase B opens the
   writes, drains pending choices and restores, then sends the component `initialized`). There is no
   hop to another part.

No `DOMContentLoaded` wrapper is needed: `90-boot.js` sits immediately before `</body>`.

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
| `10-identity.js` | `XAPI_ID_PREFIX`, `window.XAPI_UNIT_ID` (bare slug), `shortId()`, `RESUME_ENABLED`, `DEV_NAV` |
| `15-ui.js` | `announce`, `scaleApp`, `appScale`, image zoom, `attachPopupDrag` |
| `20-xapi.js` | item scope and ids (`xapiOnScreen`, `xapiQ`, `xapiFinishItems`, `xapiAnswerText`), the `result.response` layer (`xapiResponse` + per-type builders), `xapiAnswered`, `xapiRequestedHint`, `xapiCompleteComponent` / `xapiEndComponent`, `restoreEndedButton`, `xapiSeedAnsweredFromResume`, `xapiWireVideos` |
| `25-report.js` | the whole "מצאתם בעיה?" layer + `initReportModal()` |
| `30-nav.js` | `currentScreen`, `goTo()`, `applyExecutionState(st, screenOverride)` |
| `40-resume.js` | the v5 per-component document, `readUnitState`/`captureUnitState`/`persistUnitState`, the `done`/`doneItems`/`hints` ledgers (`sendStatementOnce`), character + verdict setters/`adoptUnitCharacter`, `dropBootCover`, dev-only back edges, `initResumeResetHatch`, save/flush |
| `50-loader.js` | `bootXAPI()` — CDN loader (`-k`), `?xapiLib`, bounded metadata poll, two-phase restore, ID-mismatch check, `onXapiReady()` |
| `60-devbridge.js` | `initDevBridge()` — the `index_dev.html` postMessage bridge (**is** deployed here) |
| `90-boot.js` | the startup sequence — the only side effects |

## What this cost and bought

The six `main.js` (as the unit then stood) went from 3,419 lines to ~4,063 including the resume payloads; `unit-js/` is 1,234.
**The raw total went up**, and the honest reason is comment density: the extracted code was dense
one-liners, and these files document every superset choice and silent-failure trap at the point it
matters.

What it bought is that nine behaviours now have exactly one copy instead of three to six — the report
modal, the loader, `scaleApp`, identity, `goTo`/`currentScreen`, `xapiSend`, the dev bridge,
`attachPopupDrag`, and image zoom. Four defects were fixed or made visible in passing: `shortId`'s
trailing-slash bug, the `currentScreen`-before-guard ordering bug, part 03's (now 04, the class task) missing
`TOTAL_SCREENS`/`goTo`/`resetScreenState`, and silently-swallowed item statements (now a loud warning).
