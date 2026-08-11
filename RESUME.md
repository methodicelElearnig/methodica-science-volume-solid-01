# Resume — `המשך מהמקום שבו הפסקת`

A learner who leaves mid-unit and relaunches through the platform lands on the screen of the component
they stopped at, with their answers, attempts and scores intact and repainted — **and nothing is
re-reported to the LRS.**

State document version **1**. Enabled via `RESUME_ENABLED` in `unit-js/10-identity.js`.

Companions: [unit-js/README.md](unit-js/README.md) · [REPORT-XAPI.md](REPORT-XAPI.md) ·
[ROUTING-AND-RETAKE.md](ROUTING-AND-RETAKE.md)

> ⚠️ **DEPLOY ALL SIX COMPONENT FOLDERS ATOMICALLY** whenever `RESUME_ENABLED` or the document version
> changes — on rollback too. A part left on the other setting writes a document its siblings discard,
> and the discard/rewrite cycle wipes the `done` ledger on every hop, which under a ledger means a
> duplicate `completed` per cycle.

---

## Scope: one document for the whole unit

Kata addresses a state document by **`?registration` alone**, and the launch registration rides through
every cross-part navigation on `window.location.search`. That is what lets six components share one
document. There is no `activityId`, no `stateId`, no `unitKey` parameter; `window.XAPI_UNIT_ID` only
keys the off-platform localStorage fallback.

Re-entry always arrives through the root `index.html` → part 01, which reads the document and **hops**
to the stopped-at component *before emitting any statement of its own*.

> **A documented risk.** This works because the platform launches component 01 once and the lomda
> navigates internally. Kata's registration is stable per platform, learner **and component** — so if
> the platform ever deep-launched part 03 or part 06 directly, that registration would address a
> different document and the learner's progress would split in two. Part 06 is the live concern, because
> `recommendedAfterFail` is the platform's own routing mechanism. See ROUTING-AND-RETAKE.md.

---

## The document

```js
{ v: 1,
  part:      '<slug the learner should land on>',
  parts:     { '<slug>': { currentScreen, …that part's payload } },   // all six retained
  prev:      { '<slug>': '<slug it was entered FROM>' },               // back-edges
  done:      { '<slug>': true, unit: true },                           // component/unit 'completed' sent
  doneItems: { '<slug>#<itemSuffix>': true },                          // item 'completed' sent
  doneQ:     { '<slug>#<itemSuffix>/<qKey>': true }                    // graded answer sent
}
```

~10–20 KB against Kata's ~1 MB cap.

**There is no migration path, deliberately.** This unit has never shipped resume, so no document of any
version exists in the field. The sibling's `migrateV2()` would also be *actively wrong* here: it seeds
the ledger from position in a **linear** part chain, and this unit is not linear — reaching part 06 does
not imply part 05 was passed (it implies the opposite), and reaching part 03 does not imply part 02 was
visited, because part 01 branches straight past it at 4/5. An unknown version is discarded outright.

**`doneItems` and `doneQ` are namespaced by part slug, and here that is not cosmetic.** Parts 05 and 06
each hold a single item with suffix `'01'`, distinguished only by `XAPI_COMP_ID`. Without the slug they
would share one key and מועד ב's item `completed` would be silently suppressed. Verified in a full
traversal: `doneItems` ends up holding **both** `…-05#01` and `…-06#01`.

The unit `completed` is keyed `'unit'`, not by slug, so parts 05 and 06 share it — exactly one unit
completion across the three attempt-ending paths.

---

## Transport

Three `window` functions in the CDN library:

| | |
|---|---|
| `saveState720(stateId, obj)` | synchronous; returns `true`/`false` |
| `loadState720(stateId)` | synchronous, returns the object or `null` |
| `saveState720Debounced(stateId, obj, ms)` | 800 ms coalescing, keyed per `stateId` |

When `XAPI_DISABLED` (no valid `?slxapi`), the library transparently falls back to localStorage — which
is what makes resume testable on a dev server.

### Write triggers

- **screen change** — debounced, at the end of `goTo()`; the choke point that bounds how much a learner
  can lose
- **cross-part jump** — `writeForwardState()` / `goBackToPrevPart()`, synchronous
- **`completed` reported** — `markSent` persists synchronously, because several sites (parts 05/06's
  `peakFinish`) send without navigating afterwards, so nothing else would ever write it
- **page leave** — `beforeunload` **and** `pagehide` **and** a hidden `visibilitychange`. `beforeunload`
  alone is not enough: it never fires when a mobile tab is backgrounded and then killed, which is
  exactly how a learner leaves mid-lesson

---

## Restore

`applyExecutionState(st)` in `unit-js/30-nav.js`, called by the loader:

```
_restoring = true
window.sendStatement720 = no-op          ← replayed answers must not re-report
  applyResumeVars(st)
  goTo(st.currentScreen)                 ← runs the screen's sNNEnter(), which RESETS what we just set
  applyResumeVars(st)                    ← so assign again
  applyResumeDom(st)                     ← before the painter locks the inputs
  restoreScreenUI(currentScreen)
restore sendStatement720; _restoring = false
xapiCurrentItem = null                   ← latch only; the loader emits the item init
```

The two-pass shape is load-bearing. So is holding the stub **across** `goTo()`: that is what stops a
finale screen re-emitting the item, component and unit `completed` on resume — the library's
one-per-page-load dedupe cannot help across a page load.

`goTo()` performs the same capture → reset → re-apply → repaint sequence on **every** navigation, which
is what keeps a revisited screen answered.

**Most screens restore themselves.** `imgqEnter`, `dispEnter`, `aqEnter`, `floodEnter`, `flipEnter`,
`guessEnter`, `measRender`, `ddqRender` and `scqEnter`'s `done` branch all rebuild from the restored
variables — that is what makes part 01's 33 screens tractable. `restoreScreenUI()` fills only four
genuine gaps: the s2 hint gate, the SCQ marks, s22's confirm button, and the comic slider index.

---

## The ledgers

Three orderings are load-bearing:

1. **During a restore we neither send nor mark.** `applyExecutionState` stubs the sender, so a mark made
   there would permanently suppress a statement that never actually left.
2. **Fail open.** The ledger is obeyed only when it positively says "already sent". If the document is
   unavailable we send anyway — every call site swallows exceptions, and a silent drop is far worse than
   a duplicate.
3. **Marks persist synchronously.**

### The `doneQ` guard

Part 06 offers `חזרה` back into part 05, so a learner who failed מועד א can walk back into it from the
retake. The `done` ledger stops a second component `completed`, but `answered.last` is not ledgered in
the sibling's design — so the LRS would receive a **second full round of graded answers for מועד א after
מועד ב had begun**. That is corruption in the unit's only `isAssessment: true` component.

Two deliberately redundant layers:

1. part 05's payload restores `peakAnswers`, so its screens come back answered and `peakContinue()`
   early-returns — a per-part correctness claim;
2. `sendAnsweredOnce()`, a structural backstop that does not depend on any part getting layer 1 right.

Used **only** by parts 05 and 06. Ordinary practice questions are unguarded: re-answering those is
legitimate learning behaviour the platform expects to see.

---

## `?resetState`

The QA escape hatch, and it matters more here than in the sibling: after a failed מועד א the document
names part 06, so **every** subsequent launch — including every QA launch through the root
`index.html` — hops straight to the retake, forever. This is the only way out.

It **strips itself from the URL** via `history.replaceState`. That is load-bearing: every cross-part
navigation copies `window.location.search` verbatim, so left in place it would re-fire on arrival in the
next component and wipe the document on every hop — resume would never work at all. With six parts,
that is five chances to get it wrong.

Off-platform there is no `?registration`, so the fallback keys every local run to one document; after
one pass the ledger is full and no `completed` is emitted again, which reads as a catastrophic
regression to whoever tests next. **Start every local run with `?resetState`.**

---

## Verified in the browser

| | |
|---|---|
| real reload resumes to the stopped-at screen | ✓ answers, `practiceProgress`, `practiceScore()` and the repainted marks all survive |
| resume onto a finished component | ✓ only `initialized`; **0** `completed`, **0** `answered` |
| resume onto part 06's terminal finale | ✓ same, with the score text intact |
| cross-part hop | ✓ launching part 01 with the document naming 05 redirects, preserves the query, and leaves **no statement behind** for the part passed through |
| retake back edge | ✓ `prev` recorded, `חזרה` visible, returns with all four answers and the score |
| **`doneQ` guard** | ✓ changing a pick in the completed מועד א and re-submitting emits **nothing** |
| full path fail→retake→back→forward→pass | ✓ exactly **one** unit `completed`; `__dupes()` empty |
| deep-clone of all five nested structures | ✓ mutating the live object after capture never leaks |
| statement order on a resumed load | ✓ component `initialized` before item — see below |

**A defect found and fixed here:** the resumed load used to emit the **item** `initialized` before its
component's — the child opening before the parent, and the reverse of a normal load. `applyExecutionState`
was ending with `xapiOnScreen()`. The item init now lives in the loader, always after the component
`initialized`, which also removed the `_resumed` flag. **The sibling unit has the same inverted order**;
worth reporting upstream.

---

## Still NOT verified — do not claim otherwise

Every result above used the local stub or the real library's **localStorage fallback**. A real Kata run
has never been exercised from this unit, or from the sibling.

1. `?slxapi` + `?registration` from a real launch: statements arriving 2xx with `context.registration`.
2. **The State API over HTTP** — `PUT`/`GET /api/v1/xapi/activities/state`. Never exercised.
3. That all six components genuinely share ONE document under a single launch registration.
4. Whether Kata validates a registration against the calling `componentKey`. If it does, parts 02–06
   presenting part 01's registration fail every state call.
5. Behaviour with `?registration` absent.
6. **Multi-tab / two devices.** Every save writes the whole document from a possibly-stale `_unitState`,
   so a stale write can resurrect an un-`done` entry or wipe another part's answers. `If-Match`/ETag is
   available in Kata and **deliberately unused** — adding optimistic concurrency plus a merge path on top
   of an unexercised transport would turn a convenience bug into a data-loss bug.
7. Visual confirmation of painted restored states beyond the assertions above.

## Observation, not a defect

Restoring `peakAnswers` re-marks the picked option but does **not** disable the options, so a learner
returning to a completed assessment can visually change a pick. Nothing is re-reported, so the LRS
record stands as sent — but the on-screen pick can end up differing from it. Locking them is a
content/UX decision, not a reporting one.
