# Stage 5c — resume enabled and verified

`RESUME_ENABLED = true` in `unit-js/10-identity.js`. The loader now requests **`xapi-720-j.js`** and
the State API transport is live.

> ⚠️ **DEPLOY ALL SIX COMPONENT FOLDERS ATOMICALLY**, on rollback too. A part left on the other
> setting writes a document its siblings discard, and the discard/rewrite cycle wipes the `done`
> ledger on every hop — which under a ledger means a duplicate `completed` per cycle.

## Confirmed with the real CDN library

| | |
|---|---|
| library requested | `…/common/xapi-720-j.js` ✓ |
| `saveState720` / `loadState720` / `saveState720Debounced` | all present ✓ |
| `_resumeReady` | true |
| document created | `{v: 1, part, parts, prev, done, doneItems, doneQ}` |
| `?resetState` | strips itself — `?resetState&c1=1` → `?c1=1` ✓ |

Off-platform the library sets `XAPI_DISABLED`, so statements no-op while **state still works** via its
localStorage fallback. That is what made a genuine end-to-end resume testable on a dev server.

## The headline feature works

Answered practice Q1 in part 01, moved to s14, then performed a **real browser reload**:

| | |
|---|---|
| resumed to screen | **14** — where the learner left off |
| s13's answer | `{sel: 'c', done: true}` restored |
| `practiceProgress[0].state` | `correct` |
| `XAPI_Q_RESULTS` | `{05/q1: true}` |
| `practiceScore()` | 1 — so part 01's routing branch survives a reload |
| s13 on navigating back | correct mark repainted, button reads `שנמשיך?` |

## A real defect found and fixed: statement ORDER on a resumed load

The resumed load emitted `initialized question` (the item) **before** `initialized onlinelesson` (the
component) — the child opening before its parent, and the reverse of what a normal load does. Cause:
`applyExecutionState()` ended by calling `xapiOnScreen()`, which runs before the loader sends the
component `initialized`.

Fixed by moving the item init out of `applyExecutionState` — it now only clears the item latch its
stubbed `goTo()` set — and having `50-loader.js` always call `xapiOnScreen()` after the component
`initialized`. That also deleted the `_resumed` flag: with no ordering difference between a resumed and
a fresh load, there is nothing left to branch on.

The sibling unit has the same inverted order; worth reporting upstream.

Verified after the fix: `initialized onlinelesson` → `initialized question`, matching a normal load.

## The four guarantees, each verified in the browser

### 1. Resuming onto a finished component re-reports nothing

Failed מועד א (1/4) → component `completed` sent, ledger populated → reloaded onto the finale:

```
statements this load:  initialized onlinelesson
                       initialized question
completed re-reported: 0
answered re-reported:  0
```

`initialized` **does** fire, which is what v2.4 §1 requires on re-entry. Only `completed` is guarded.

Repeated on part 06's **terminal** finale after the unit was fully completed, with the statement log
cleared first so the boundary was unambiguous: again only the two `initialized`, with the score screen
still reading `ענית נכון על 3 מתוך 4 סעיפים.`

### 2. The cross-part hop

With the document naming part 05, launching **part 01** redirected to part 05, landed on screen 6,
preserved the whole query string, and **left no statement behind for part 01** — the component it
merely passed through.

### 3. The retake back edge

`peakGoRetake()` recorded `prev['…-06'] = '…-05'`; part 06's `#back-to-prev-part` became visible with
its `חזרה` label; clicking it returned to part 05 with all four answers and the 1/4 score restored.

### 4. The `doneQ` guard — the reason it exists

Back inside the failed מועד א, I **changed a pick and re-submitted it**:

```
statements emitted:      (none)
graded answer re-emitted: 0
```

Without this ledger the LRS would have received a second graded answer for מועד א after מועד ב had
already begun — corruption in the unit's only `isAssessment` component.

## Exactly one unit completion across the whole assessment path

Full path exercised: **fail מועד א → retake → back-navigate into 05 → forward again → pass מועד ב**.

```
done:       [ …-05, …-06, unit ]
doneItems:  [ …-05#01, …-06#01 ]      ← namespacing works: both items are '01'
doneQ:      8 keys                    ← 4 per component
unit 'completed' count: 1
__dupes():  []
```

`doneItems` holding both `…-05#01` and `…-06#01` is the concrete proof that slug-namespacing was
necessary — without it מועד ב's item completion would have been suppressed by מועד א's.

Console clean throughout. All five `checks.mjs` gates green.

## Observation, not a defect — layer 1 does not lock the options

Restoring `peakAnswers` re-marks the picked option but does **not** disable the options, so a learner
returning to a completed assessment can visually change a pick. Nothing is re-reported (`doneQ` refuses
it, and the component's `completed` is already ledgered), so the LRS record stands as originally sent —
but the on-screen pick can end up differing from what was reported.

Left as-is: locking them is a content/UX decision, not a reporting one, and the reporting is already
safe. Worth raising with the content owner.

## Still NOT verified — must not be claimed as done

Everything above ran against the local stub or the real library in `XAPI_DISABLED` mode. **A real Kata
run has never been exercised from this unit, or from the sibling.** Specifically untested:

1. `?slxapi` + `?registration` from a real launch: statements arriving 2xx with `context.registration`.
2. **The State API over HTTP** — `PUT`/`GET /api/v1/xapi/activities/state`. Every resume result above
   used the localStorage fallback, not Kata.
3. That all six components share ONE document under a single launch registration.
4. Whether Kata validates a registration against the calling `componentKey`. If it does, parts 02–06
   presenting part 01's registration fail every state call.
5. Whether an item `initialized` *after* that item's `completed` — unavoidable given v2.4's asymmetry
   plus back-navigation — is acceptable to the platform.
6. Behaviour with `?registration` absent.
7. Multi-tab / two devices. `If-Match`/ETag is available in Kata and deliberately unused.
