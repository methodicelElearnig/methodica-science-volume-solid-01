# Stage 2 — shared-layer extraction, file by file

Each row lands only when the sweep still matches `stage-0.json`, `_test/checks.mjs` shows no new
failure, and the console is clean in all six parts.

| # | File | Status | What moved | Verified by |
|---|---|---|---|---|
| 1 | `10-identity.js` | ✅ | `XAPI_ID_PREFIX`, `window.XAPI_UNIT_ID`, `shortId()`, `RESUME_ENABLED` | shortId returns real slugs; sweeps unchanged |
| 2 | `15-ui.js` | ✅ | `announce()` (new, inert), `scaleApp()`, `appScale()`, image zoom, `attachPopupDrag()` | zoom open/Escape/clear; drag tracks pointer 1:1 at scale 1 **and** 0.5; sweeps unchanged |
| 3 | `20-xapi.js` | ✅ | `xapiItemId`, `xapiQ`, `xapiAnswerText`, `XAPI_Q_RESULTS`, `xapiOnScreen`, `xapiFinishItems`, `xapiWireVideos`, `xapiSend` | landed dark (`xapiOnScreen` no-op); **23 items / 31 questions resolve byte-for-byte** — now gate 4 in `checks.mjs` |
| 4 | `25-report.js` | ✅ | `REPORT_FORM_ACTION`, the 7 modal functions, `_reportItemInfo`, `initReportModal` | full modal flow in part 01 + payload compared per-part against pre-extraction for all four map mechanisms; **all gates green for the first time** |
| 5 | `30-nav.js` | ✅ | `currentScreen`, `goTo()` | all six sweeps unchanged; guard/popup-sweep/video-pause/one-active/advance-back all verified; part 03 gains `goTo` |
| 6 | `50-loader.js` | ✅ | `bootXAPI()` — CDN loader, `?xapiLib`, metadata poll + settle, Stage 5 resume seam, `onXapiReady()` | six sweeps match baseline with `XAPI_USING_G=false`; via `?xapiLib` the whole pipeline runs locally for the first time |
| 7 | `60-devbridge.js` | ✅ | `initDevBridge()` | driven through `index_dev.html` in parts 02 and 03: `jumpTo`, `nav(+1)`, out-of-range refusal |
| 8 | `90-boot.js` | ✅ | the startup sequence — the only side effects | all six boot correctly; zoom/report/resize/dev-bridge all live via boot; six sweeps match baseline |

**Stage 2 complete.** `checks.mjs` green, console clean in all six, every sweep identical to
`stage-0.json`.

## What it cost and bought

| | lines |
|---|---|
| per-part `main.js`, before | 3,419 |
| per-part `main.js`, after | 2,873 (−546) |
| shared `unit-js/` | +882 |
| **total** | **3,419 → 3,755 (+336)** |

**The raw total went up**, and it is worth being straight about why rather than quoting a
duplication figure: the extracted code was mostly dense one-liners, and the shared files carry
substantial comments — every non-obvious decision, superset choice and silent-failure trap is written
down at the point it matters. Counting only executable lines: 2,209 per-part + **422 shared**.

What was actually bought is that nine behaviours now have exactly one copy:

| Behaviour | Copies before |
|---|---|
| report modal (7 functions + wiring) | 6 |
| `initXAPI` loader | 6 |
| `scaleApp` | 6 |
| `XAPI_ID_PREFIX` + `shortId` | 6 |
| `goTo` + `currentScreen` | 5 |
| `xapiSend` | 5 |
| dev bridge | 5 |
| `attachPopupDrag` | 3 |
| image zoom | 1 (part 01 only, now available to all) |

Plus four defects fixed or made visible in passing: `shortId`'s trailing-slash bug (defect 9), the
`currentScreen`-before-guard ordering bug, part 03's missing `TOTAL_SCREENS`/`goTo`/`resetScreenState`,
and the silently-swallowed item statements now behind a loud warning.

## Final load order

Identical in all six `index.html`:

```html
<script src="../unit-js/10-identity.js?v=1"></script>
<script src="../unit-js/15-ui.js?v=1"></script>
<script src="../unit-js/20-xapi.js?v=2"></script>
<script src="../unit-js/25-report.js?v=1"></script>
<script src="../unit-js/30-nav.js?v=1"></script>
<script src="../unit-js/50-loader.js?v=1"></script>
<script src="../unit-js/60-devbridge.js?v=1"></script>
<script src="js/main.js?v=N"></script>          <!-- per-part: DEFINITIONS + CONFIG -->
<script src="../unit-js/90-boot.js?v=1"></script>   <!-- the ONLY side effects -->
```

Only two positions carry real weight: `main.js` before `90-boot.js`, and `90-boot.js` last.

## Standing procedure per file

1. Survey all six copies and **diff them before merging** — take the superset and prove the
   difference inert (the rule the sibling unit's README arrived at after finding four generations
   of the same code).
2. Create `unit-js/NN-*.js` (definition-only).
3. Add the `<script>` tag to all six `index.html`, **before** `js/main.js`, with an identical `?v=`.
4. Delete the now-shared declarations from all six `main.js`.
5. **Bump `js/main.js?v=` in all six.** See the cache trap below.
6. `node --check` on the new file and all six `main.js`; `node _test/checks.mjs`; re-sweep all six;
   read the console.

## The cache trap (cost me a false "it works")

After extracting `10-identity.js` the shared file loaded correctly and `shortId` *still* returned
the old empty string. Cause: the browser served a **cached `js/main.js?v=5`**, which still contained
the part-local `function shortId` — and because `main.js` loads *after* the shared layer, the stale
copy won. Exactly the silent last-wins collision the collision scan exists to catch, arriving
through the cache rather than through the source.

**So: every step that edits `main.js` must bump its `?v=`.** A static check cannot catch this (the
old file is gone from disk; only the browser still has it), so it is procedure, not automation.
Per-part `?v=` values need not match each other — only the *shared* URLs carry the equality
invariant, because only they are fetched by six documents.

## Findings from the reconciliation so far

**No real drift in the UI layer.** Both blocks with multiple copies turned out to be textually
different and behaviourally identical:

- `scaleApp` — six copies; part 01 named its intermediates, the others inlined them. Same program.
- `attachPopupDrag` — three copies; the sole difference was `const r = …; const sc = …` versus
  `const r = …, sc = …`. Same program.

This unit has apparently been re-copied rather than independently edited, which is a much better
starting point than the sibling unit had.

**Deliberate scope calls, recorded so they are not mistaken for oversights:**

- **`announce()` is new and inert.** The shared `goTo()` announces the landing screen's heading,
  which is how the sibling unit does it, but this unit has no announcer region — its only
  `aria-live` attributes are on SCQ feedback popups, which announce a *result*, not a navigation.
  `announce()` early-returns unless `#sr-announcer` exists, so behaviour is unchanged in all six
  and adding the region later is a one-line opt-in. **Adding it is not part of this
  reconstruction** — it changes what a screen-reader user hears on every navigation and belongs in
  an accessibility pass with its own review.
- **`28-feedback-drag.js` is deliberately NOT ported.** The sibling unit's version replaces
  `window.goTo` with a wrapper, which is why its README warns it must be the last thing to touch
  `goTo`. This unit wraps nothing, and per-popup `attachPopupDrag` keeps it that way. Porting it
  would *introduce* an ordering hazard into a codebase that does not have one.
- **Side effects stay in `main.js` until `90-boot.js` lands.** `15-ui.js` is definition-only, so
  each part keeps its own `window.addEventListener('resize', scaleApp); scaleApp();` and part 01
  keeps its delegated zoom click listener. They are removed in step 8, when there is somewhere for
  them to go. This is what keeps every intermediate state runnable.
- `initImgZoom()` exists but is **called from nowhere yet** — deliberately, so it cannot
  double-register alongside part 01's own listener before step 8.

## New findings from `20-xapi.js`

**The id fix is proven before a single call site is rewired.** Gate 4 in `_test/checks.mjs` runs the
real `xapiItemId`/`xapiQ` out of `unit-js/20-xapi.js` — not a reimplementation, which would be free
to drift from the code that ships — against all seven metadata files:

```
4. metadata id resolution (real xapiItemId/xapiQ vs metadata/*.json)
  ok    23 items / 31 questions resolve byte-for-byte, parents correct
```

That covers every component, including the multi-question items (part 04's `-04` has q1–q2 and `-05`
has q1–q3; parts 05 and 06 each have q1–q4). For comparison, the id the pre-extraction code emitted
matches **no** metadata entry at all:

| | id |
|---|---|
| old, emitted | `…/01/methodica-science-volume-solid-01-02-01/q1` |
| metadata, required | `…/01/methodica-science-volume-solid-01-02/methodica-science-volume-solid-01-02-01/q1` |

So Stage 4's job is now purely to route the existing call sites through `xapiQ()`; the resolver
itself is verified.

**⚠️ NEW DEFECT — `answered` is missing `result.response` almost everywhere.** Not in the original
plan, found while deciding what `xapiAnswerText` had to handle. The unit splits cleanly in two, and
neither half is v2.4-conformant:

| Sites | Sends | Missing |
|---|---|---|
| every SCQ + the DDQ — part 01 s10/13/14/15/16/19, **all** of part 02, **all** of part 04 | `{success, score}` | **`response`** |
| applets, guess, peak — part 01 s2/s9/s11/s21/s22/s29, parts 05/06 | `{response}` | **`success`, `score`** |

720 v2.4 §2 requires `response` **and** `success` **and** `score` on `answered`. That is why
`xapiAnswerText()` is load-bearing rather than inherited decoration: it is where the SCQ/DDQ response
text has to come from. Added to Stage 4.

## New findings from `25-report.js`

This is where the real drift was. My first variant count said "5 variants of `submitReport`, 4 of
`openReportModal`" — **that was my own measurement error**: a regex of `^function X\(.*?^\}` runs past
the end of a one-liner function into the next multi-line one. With brace counting the true picture is:

| Function | Variants | Split |
|---|---|---|
| `forceCloseReportModal` | 1 | identical in all six |
| `openReportModal`, `tryCloseReportModal`, `showReportThanks`, `resetReportForm` | 2 | part 01 (`var`, explicit null checks) vs the rest (`const`, `?.`) — **behaviourally identical** |
| `backToReportForm` | 2 | **real difference** — see below |
| `submitReport` | 5 | **real difference** — see below |

**Two genuine differences, both resolved by taking the superset:**

1. **`backToReportForm` — part 01 alone re-focused `#report-type`** after returning from the confirm
   dialog. Kept: it is the a11y-correct behaviour, and the modal markup is uniform across the unit
   (verified: all six have `report-error`, `report-type`, `flag-btn`, `report-char-count`), so it
   cannot throw anywhere. Parts 02–06 gain the focus restore.
2. **`submitReport`'s fetch failure — parts 01/02/03 logged it, 04/05/06 swallowed it.** Kept the log.
   A silently-dropped problem report is indistinguishable from one nobody filed; the only effect on
   04/05/06 is a console message half the unit already emitted.

**The interface split — four mechanisms for one question.** "Which catalog item is the learner
looking at" was expressed four different ways:

| Part | Mechanism | Page reported |
|---|---|---|
| 01 | `SCREEN_TO_SUBCONTENT[n] → [suffix, page]`, **3-digit `'001'`**, only 4 of 33 screens mapped | `map[1]` |
| 02 | `SCREEN_TO_SUBCONTENT[n] → [suffix, page]`, 2-digit — the shape to standardise on | `map[1]` |
| 04 | `SCREEN_TO_SUB[n] → 'suffix'` — **string**, different variable name | `currentScreen` |
| 03 / 05 / 06 | no map at all, item hardcoded `-01` | `'1'` / `currentScreen` |

`_reportItemInfo()` reproduces all four **exactly**, and is marked transitional: Stage 4 authors a
real `SCREEN_TO_SUBCONTENT` for all six in the `[suffix, page]` shape — which `xapiOnScreen()` needs
anyway — after which the `SCREEN_TO_SUB` and no-map branches are dead code to delete. Preserving the
current behaviour verbatim is what makes the payload comparison a meaningful test: any change is a
bug, not an intended normalisation.

**The gate caught a real deviation.** Part 03 reported `page = '1'` before extraction and `'0'`
after, because `_reportItemInfo` derives "single-screen component ⇒ page 1" from
`TOTAL_SCREENS === 1` and **part 03 never declared `TOTAL_SCREENS`**. Fixed by adding
`const TOTAL_SCREENS = 1` to part 03 — which the shared `goTo()` requires regardless, and which was
the one gate failure outstanding since Stage 0. `page` is back to `'1'`, and **`checks.mjs` is fully
green for the first time.**

**Verified payloads** (with `window.METADATA` stubbed from the real JSON and `fetch` intercepted):

| Part | unit | component | item | page |
|---|---|---|---|---|
| 01 s1 | `01` | `…-01-01` | `…-01-01-001` ← stale 3-digit, preserved | `1` |
| 04 s4 / s5 | `01` | `…-01-04` | `…-01-04-04` (both) | `4` / `5` |
| 04 s9 / s11 | `01` | `…-01-04` | **`""` — unmapped** | `9` / `11` |
| 05 s0/s2/s5 | `01` | `…-01-05` | `…-01-05-01` | `0` / `2` / `5` |
| 03 | `01` | `…-01-03` | `…-01-03-01` | `1` |

Two Stage 4 items fall out of that table: part 01's item suffix must become `-01` (2-digit, and all
33 screens mapped), and **part 04's screens 9/10/11 report an empty item** — a report filed from a
scenario or result screen currently loses its item entirely.

Flow verified end-to-end in part 01: opens on flag click · empty submit blocked with nothing sent ·
char counter · Escape with content asks for confirmation instead of discarding · back restores the
form *and* the focus · submit posts exactly one payload · thank-you shown · reset re-shows the fields
and clears the text for a second report.

## New findings from `30-nav.js`

The riskiest file so far and, in the end, the cleanest: all five `goTo()` implementations were the
same program, with part 01 alone also pausing `<video>`. Taken as the superset (inert in the five
parts with no video element). Part 03 had **no `goTo` at all** — it is a single screen that never
navigates — so it gains one, which is the single intended deviation from the Stage 0 baseline.

**A latent bug fixed on the way through.** Every part assigned `currentScreen = n` *before* looking
up the destination element:

```js
currentScreen = n;
const next = document.getElementById('s' + n);
if (next) next.classList.add('active');      // ← if absent: currentScreen moved, nothing active
```

A `goTo()` to a screen inside `TOTAL_SCREENS` but missing from the markup therefore left
`currentScreen` pointing at a screen that was not `.active`. Harmless while nothing read it —
**but resume writes `currentScreen` into the state document**, so the next launch would try to
restore onto a screen with no markup. Now the element is resolved first and the function returns
before committing. Verified by temporarily renaming `#s15`: `currentScreen` and `.active` both stay
put, and navigation resumes working the moment the markup is back.

Also switched `querySelector('.screen.active')` to `querySelectorAll(...)` so a double-active state
cannot survive a navigation.

**Part 03 needed a `resetScreenState`.** It called `renderCompanion(0)` at top level instead, and the
shared `goTo()` calls `resetScreenState(n)` unconditionally. Added as a one-liner delegating to
`renderCompanion(n)`, and the top-level call now goes through it — behaviour-identical, contract
satisfied.

**Two a11y calls, handled differently on purpose.** The reference's `goTo()` does
`next.focus()` and `announce(heading)`. `announce()` is included and is inert (no `#sr-announcer`
region in this unit). `focus()` is **omitted**: this unit's screens carry no `tabindex`, which makes
`focus()` on a `<section>` a guaranteed no-op — it belongs with the tabindex, in an accessibility
pass, not as dead code here.

**The Stage 5b seam is marked, not half-built.** The capture → `resetScreenState` → re-apply →
repaint sequence is documented in place but deliberately absent, because `resetScreenState()` is an
*initialiser*: without the surrounding snapshot/restore it is exactly the pre-existing behaviour, and
adding the block now would half-implement resume.

**Verified in the browser:** all six sweeps unchanged · out-of-range and negative `goTo` rejected ·
popups swept on navigation · exactly one `.active` · video paused on leaving s1 ·
`advanceScreen`/`goBack` route correctly through the shared `goTo` (part 01: 12 → 18 → 12) · part 04's
out-of-flow scenario screens 9/10/11 all reachable · part 02 answer-then-return keeps the answered
look with **no extra statements** · part 03 companion still rendered.

## New findings from `50-loader.js`

**The localhost guard was NOT simply removed — it became opt-in.** The plan said to delete the
`if (localhost) return;` that all six parts carried. Reading why it was there first changed the
decision: `xapi-720-f.js` has **no `XAPI_DISABLED` path**. With no valid `?slxapi` it falls back to a
placeholder endpoint and retries every statement against it — the request storm the original comment
describes. Deleting the guard while still requesting `-f` would have reintroduced exactly that.

So off-platform the loader now loads **nothing unless `?xapiLib` explicitly names a library**. Same
protection, but a developer can opt in. From Stage 3 (`-i`/`-j`) the hazard is gone — those builds set
`XAPI_DISABLED` and every send becomes a silent no-op — at which point the restriction can be relaxed
so a local run exercises the real library. Noted in the file.

**`window.METADATA` can be a PROMISE when the metadata poll releases.** In the library,
`loadMetadata()` is `async` and `window.METADATA` is assigned twice: the caller stores the *promise*,
and the function itself later overwrites it with the resolved object and sets
`jsXAPI_MetadataReady`. Normally the flag is set by that second assignment, so the promise is never
observable. **But when `?slxapi` is absent, `getXAPIParameters` sets the flag early** (so the poll
cannot hang) — before `loadMetadata` has run. On that path the poll releases against a promise, and
anything reading `.subContent` sees `undefined`: `xapiQ()` falls back and warns, and the bug-report
form posts empty ids. Added `settleMetadata()`, which awaits a thenable with a 3 s bound. This is
precisely the local/param-free case `?xapiLib` exists to make testable.

**⚠️ A silent-failure mode found by running it, and now made loud.** With the stub loaded,
`XAPI_USING_G` became true and the item layer went live — and emitted **nothing**, with no error.
Cause: `xapiOnScreen` → `xapiItemId()` reads `XAPI_COMP_ID`/`XAPI_COMP_SLUG` as bare globals, those
are Stage 4 seams that do not exist yet, so every call threw a `ReferenceError` **into the very
`try/catch` that exists to keep reporting faults away from the learner**. The statement simply
vanished. That is the hazard `20-xapi.js`'s own header warns about — and `XAPI_COMP_ID` was not among
the guarded reads. Added `_xapiSeamsReady()`, which warns once per page load:

```
[xAPI] item layer inactive: XAPI_COMP_ID / XAPI_COMP_SLUG not declared in this component.
       Item-level initialized/completed will not be sent. (Authored in Stage 4.)
```

Worth keeping in mind for Stage 4: if a component's seams are ever mistyped, this warning is the only
thing standing between that and a component that silently reports no items at all.

**The stub now loads metadata for real.** It used to only flip `jsXAPI_MetadataReady`, which left
`xapiQ()` and the report form's id fields untestable off-platform — the exact gap `?xapiLib` exists to
close. It now fetches the component and unit metadata, and deliberately reproduces the real library's
double-assignment quirk so that `settleMetadata()` stays exercised locally.

**The unit-scope `initialized` split is preserved, not "fixed."** Parts 01 and 02 reported
`initialized` with `{scope:'unit'}` after loading the unit metadata; parts 03–06 loaded the metadata
and reported nothing. Both behaviours now live in a per-part `onXapiReady()`. Whether the unit should
be opened by exactly one component — 01 is the entry every launch passes through — is a
reporting-semantics question for Stage 4, not a refactoring one.

**Two verification modes now exist, and they are not interchangeable:**

| Mode | How | `XAPI_USING_G` | Use |
|---|---|---|---|
| A | no `?xapiLib`, inject the stub after load | `false` | the Stage 2 acceptance gate — comparable to `stage-0.json` |
| B | `?xapiLib=../_test/xapi-720-j.js` | **`true`** | full pipeline: real metadata, item layer live — a preview of Stage 3 |

Mode B turns the item layer on because the stub's filename ends in `xapi-720-j.js`, which the
`XAPI_USING_G` regex matches. Do not compare mode B output to the Stage 0 baseline.

With the seams faked by hand in mode B, item statements come out correctly nested — a working preview
of Stages 3–4:

```
[stub] completed   question obj=…/methodica-science-volume-solid-01-02/methodica-science-volume-solid-01-02-02/
[stub] initialized question obj=…/methodica-science-volume-solid-01-02/methodica-science-volume-solid-01-02-03/
```

And in mode B the bug-report form posts real ids with **no manual stubbing at all** — component
`methodica-science-volume-solid-01-02`, item `…-02-03`, page 1.

**The cache trap bit twice more, in two new ways.** Both cost a confusing "the code didn't change"
result:

1. **Editing a shared `unit-js/` file requires bumping its `?v=` in all six `index.html`.** I edited
   `20-xapi.js` and the browser kept serving `?v=1`, so `_xapiSeamsWarned` was undefined and the new
   warning appeared to not work. `checks.mjs` gate 2 enforces that the six agree — it cannot know the
   *content* changed. Procedure, not automation.
2. **The `?xapiLib` stub needs its own cache buster.** `?xapiLib=../_test/xapi-720-j.js` served a
   stale copy after I edited it. Pass
   `?xapiLib=../_test/xapi-720-j.js%3Fv%3D2` (URL-encoded `?v=`) — the loader's same-origin regex
   permits it and the `XAPI_USING_G` match still holds.

## New findings from `60-devbridge.js` and `90-boot.js`

All five dev-bridge copies were byte-identical; **part 03 had none** and gains one — it has an
`index_dev.html` whose jump bar simply did nothing before. Verified through the real wrapper in parts
02 and 03: `jumpTo(3)` lands on s3, `nav(+1)` advances, and an out-of-range jump is refused. That last
one also proves `DEV_READY` arrived, since the wrapper's `total` starts at 1 and would have refused
`3` otherwise.

**Worth stating rather than discovering: the dev bridge IS deployed here.** The sibling unit describes
it as "not deployed", but in this unit it lives in the same `main.js` the platform serves, so the
`DEV_GOTO` listener is always active and `DEV_READY` is posted to the parent whenever the page is
framed — which includes the real platform. Both are benign (the listener only reaches `goTo`, which
rejects anything out of range or without markup; the message carries only a screen count and nothing
about the learner) and both are preserved exactly. Documented in the file so the next reader does not
have to work it out.

**`90-boot.js` needed no `partBoot()` hook**, unlike the sibling unit. Every per-part side effect —
the `scqRegister`/`registerPractice`/`ddqRegister` config, the keydown listeners, the dropdown-close
delegation, part 03's first `resetScreenState(0)` — still runs at `main.js` top level, and `main.js`
loads *before* `90-boot.js`. So the ordering guarantee `partBoot` exists to provide (a component's
wiring in place before a resume can replay onto it) already holds. The hook is still *called* if a
component ever defines one, so adding it later needs no change here.

Five side-effect kinds moved into boot: the `resize` registration and first `scaleApp()`, part 01's
image-zoom click delegation (now `initImgZoom()`), `initReportModal()`, `initDevBridge()`, and
`bootXAPI()`. A slot for `initResumeLeaveHandlers()` is in place for Stage 5a, guarded by `typeof`.

## Non-issues checked and dismissed

- A sweep once reported `transform: scale(0)`. Cause: the browser pane's viewport was 0×0 mid-resize,
  so `Math.min(0/1280, 0/710)` is 0. Re-running `scaleApp()` at real dimensions gives `scale(1)`.
  A harness artifact, and the behaviour is identical to the pre-extraction code.
