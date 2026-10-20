# Resume — `המשך מהמקום שבו הפסקת`

A learner who leaves mid-component and is relaunched by the platform lands on the screen they stopped
at, with their answers, attempts and scores intact and repainted — **and nothing is re-reported to
the LRS.**

State document version **5** (`RESUME_STATE_VERSION`), **one document per component**, enabled via
`RESUME_ENABLED` in `unit-js/10-identity.js`. Upgraded 2026-10-20 from the v3 unit-wide document
(never shipped to a learner; discarded, no migration). Procedure:
`Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md` §8; reference
`methodica-science-body-matter-01` (verified live against Kata 2026-10-20).

Companions: [unit-js/README.md](../unit-js/README.md) · [REPORT-XAPI.md](REPORT-XAPI.md) ·
[ROUTING-AND-RETAKE.md](ROUTING-AND-RETAKE.md)

> ⚠️ **DEPLOY ALL SEVEN COMPONENT FOLDERS ATOMICALLY**, with one `?v=` token on every `unit-js/*.js`
> and `js/main.js` — a stale cached `40-resume.js` reading a newer document discards it, and a new
> `main.js` against a stale `40-resume.js` calls setters that do not exist.

---

## Scope: one document per {learner, component}

Kata addresses a State document by **`?registration` alone**, and a registration represents a
{user, component} pair: the platform launches every component on its own URL with its own
registration, and since 2026-10-20 no part navigates to another part or copies its query string
along (dev only — ROUTING-AND-RETAKE.md). So every part reads and writes **its own document**. A
document whose `component` names another part is discarded with `console.warn` — a registration
shared by two components is a platform fault, and a foreign payload is never applied.

The platform may clear a component's State on re-entry (a re-take). A missing document (404) is a
new attempt: `payload: null`, empty ledgers (the `completed` goes out again — intended), empty
`results` that beats the localStorage cache of the previous attempt.

`window.XAPI_UNIT_ID` (the bare unit slug) and `RESUME_STATE_ID = 'execution-state::<slug>'` key only
the library's localStorage fallback, used when there is no valid `?slxapi` — one slot per part there
too, so a `?dev=1` walk does not read part 01's document in part 02.

---

## The document

```js
{ v: 5,
  component: '<this part's slug>',          // checked on every read; a foreign one is discarded
  payload:   { currentScreen, …this part's payload },   // capturePartPayload(); null = nothing to restore
  done:      { '<slug>': true },             // the component 'completed' has been sent
  doneItems: { '<slug>#<itemSuffix>': true },// item 'completed' sent
  hints:     { '<itemSuffix>/<qKey>': true },// 'requested.1' sent (once per question per attempt)
  picks:     {},                             // one-off 'selected' (unused here)
  ui:        { character: 'orange' | 'turquoise' | null },
  results:   { 'volume-solid-01_moedAPassed': 'true' | 'false' } }   // RESULT_KEYS
```

A few KB against Kata's ~1 MB cap. `done`/`doneItems` are namespaced by slug because parts 06 and 07
each hold a single item `'01'`.

**The character** is chosen in part 01 (`setUnitCharacter`: the document **and** the per-unit
localStorage cache `methodica_science_volume_solid_01_selectedCharacter`) and reaches the later
parts — launched separately by Kata with empty documents — through that cache: `adoptUnitCharacter`
in the loader's Phase A reads this part's document, else the cache, copies it into the document
(persisted in Phase B) and **never deletes the cache**. Values outside `UNIT_CHARACTERS` are ignored.
A `?resetState` boot adopts nothing. Known cost: a learner who switches devices mid-unit sees the
default character in parts not yet opened on the new device.

**`results`** holds part 06's verdict (`setUnitResult`). Nothing reads it across parts — the platform
routes — but it is the part's own verdict and `?resetState` clears it.

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

- **answer committed** — `flushResumeSave()` at the tail of every function that closes a question:
  `scqCheck` (parts 01/02/03/05), `ddqCheck` (01/02), `peakCheck` (06/07; `peakContinue` before
  2026-10-14), plus `aqMeasure` and the measurement applet's completion. Synchronous, and placed
  **after all painting** — the capture reads live state, so a flush higher up saves a half-painted
  screen. All of them end in a single tail with no `return` between the commitment and the end, so no
  branch escapes it. (The advanced part's silent branch — then part 04, now 05 — used to be the one
  exception; it was removed on 2026-10-14, when s6–s8 gained their own feedback.)

  Debounced-on-navigation is not enough on its own: an answer given by a learner who then closes the
  tab rests entirely on the page-leave handlers, and Chrome may drop those. The rule is bounded to
  flags that **close a question or gate one** — `aqMeasure` is in because it unlocks s15's question.
  The purely revealing flags (`dispPlaced`, `floodPlaced`, `measPoured`, `measRevealed`) stay on the
  debounce on purpose: losing one costs a drag, not an answer, and a blocking write mid-animation is
  worse than the loss.
- **screen change** — debounced, at the end of `goTo()`; the choke point that bounds how much a learner
  can lose
- **character / verdict** — `setUnitCharacter` / `setUnitResult`, synchronous (queued in
  `_pendingProfile` / `_pendingResults` until the document has been read, drained in Phase B)
- **`completed` reported** — `markSent` persists synchronously, because several sites (parts 06/07's
  `peakFinish`) send without navigating afterwards, so nothing else would ever write it
- **page leave** — `beforeunload` **and** `pagehide` **and** a hidden `visibilitychange`. `beforeunload`
  alone is not enough: it never fires when a mobile tab is backgrounded and then killed, which is
  exactly how a learner leaves mid-lesson

---

## Restore

Two phases in `unit-js/50-loader.js`:

- **Phase A**, right after the library loads and before the metadata poll: `readUnitState()`,
  `adoptUnitCharacter()` (repaint screen 0 if the colour changed), and if there is no payload the
  boot cover drops at once. Reads only — `_resumeReady` stays off so no `goTo()` can arm a save that
  overwrites the payload before it is restored.
- **Phase B**, after the metadata settles and `changeConfig`, **before** the component
  `initialized`: `_resumeReady = true`, `drainPendingUnitState()`, then
  `applyExecutionState(payload, #screen=N override)`; then `dropBootCover()`.

`applyExecutionState(st, screenOverride)` in `unit-js/30-nav.js`:

```
_restoring = true
window.sendStatement720 = no-op          ← replayed answers must not re-report
  applyResumeVars(st)
  goTo(screenOverride ?? st.currentScreen) ← runs the screen's sNNEnter(), which RESETS what we just set
  applyResumeVars(st)                    ← so assign again
  applyResumeDom(st)                     ← before the painter locks the inputs
  restoreScreenUI(currentScreen)
  restoreEndedButton()                   ← D-8: a finished part's button stays disabled (the ledger decides)
restore sendStatement720; _restoring = false
xapiSeedAnsweredFromResume()             ← re-arm the library's xapiItemAnswered, or it drops every restored item's 'completed'
xapiCurrentItem = null                   ← latch only; the loader emits the item init after the component's
```

The two-pass shape is load-bearing. So is holding the stub **across** `goTo()`: that is what stops a
finale screen re-emitting the item and component `completed` on resume. `goTo()` performs the same
capture → reset → re-apply → repaint sequence (and `restoreEndedButton`) on **every** navigation.

**The boot cover.** `#boot-cover` (a sibling of `#app`, inline-styled white) hides screen 0 until
Phase B has painted; an inline script in the markup removes it after 800 ms regardless, or waits up
to 6 s while `window.__resumeInFlight` is set by `bootXAPI()`. `dropBootCover()` runs on every loader
exit path.

**Most screens restore themselves.** `imgqEnter`, `dispEnter`, `aqEnter`, `floodEnter`, `flipEnter`,
`guessEnter`, `measRender` and `scqEnter`'s `done` branch all rebuild from the restored variables.
`restoreScreenUI()` fills the genuine gaps: the s2 hint gate, the SCQ marks **and feedback**, the two
matching boards (01 s28, 02 s4), s23's confirm button, and the comic slider index.

### What a painter owes the learner

A painter mirrors the DOM writes of the live `*Check()` and **nothing else** — no state mutation, no
statements, no progress bookkeeping. All of that happened when the answer was first given; repeating
it reports a second answer.

**The feedback popup is one of those DOM writes.** Until 2026-08-26 it was excluded, on the reasoning
that reopening one is "new UI, not a restore". That was wrong in the way that matters: the popup
carries the *explanation*, and on the matching screens the only route back to the model answer. A
learner returning to an answered question got marks with no reason for them — and, if they had
toggled to their own placement before leaving, a board of red slots with the correct answer
unreachable. Both were reported from the field.

`goTo()` closing every popup before the swap is a clean slate, not a policy: it wipes first and
`restoreScreenUI()` repaints last. The popups carry no close control, so there is no "dismissed"
state to honour — they stand until the learner advances.

### `phase` — what the learner was last shown

`SCQ_REG[screen].phase` is `null | 'correct' | 'retry' | 'wrong2'`, mirroring the three branches of
`scqCheck` and the three keys of every `cfg.popups`. It is the single source for **both** halves of
the answered look: which options carry which mark, and which popup is open.

It exists because neither can be safely derived:

- **never from `attempts`.** `scqSelect` clears the marks and the popup on a re-pick but leaves
  `attempts` spent, so a painter keyed on the counter marked an option the learner never submitted.
  `phase` is cleared on that same re-pick, which is what makes the case impossible rather than fixed.
- **never from the marks on screen.** They are gone after a reload; that is the whole problem.

`s.correctResolved` was written by `scqFinish` and read nowhere. Removed in the same pass.

**`lastWrong` — the retry gate (2026-10-11).** Every two-attempt SCQ (parts 01/02/03/05, 17 screens) keeps
the option of its non-final wrong check. צדקתי? stays locked while that option is selected; re-picking
it is a no-op (marks and popup stay); `scqCheck` refuses it, so no attempt is spent and nothing is
sent. It travels in the state document; a document without it falls back to `sel` while `phase` is
`'retry'`, else null.

### The matching boards — both, and the arrival rule

A wrong matching answer holds two boards at once: the model answer and what the learner actually did.
`captureDdqState` carries **both**, because `learnerPlacement` is the only place the learner's answer
survives once the model board is revealed — the board on screen *looks* right and cannot be used to
tell them apart. (The sibling unit states this as its rule 4; see §9.)

`answerView` is deliberately **not** carried. Which board a learner *arrives* on is not learner state,
it is a didactic rule — a revisited wrong answer opens on the model answer — and `ddqRestoreUI()`
applies it on every arrival, setting `answerView` and deriving `cfg.placement` from it in the same
breath. Persisting it would restore a value that is immediately overwritten.

That single derivation point is also the fix for a divergence that used to feed the reload bug:
`ddqEnter` wrote `cfg.placement`, `applyResumeVars` then overwrote it with the captured board, and
nothing re-rendered — so memory held one board while the DOM showed another, and **memory is what
gets persisted**. The rule now lives in the painter alone, which runs last.

`ddqRestoreUI` also repaints an **unsubmitted** board. `ddqEnter`'s `!done` branch empties every item
back to the source bank and renders that, and the restore that follows puts the learner's drags back
into `cfg.placement` with nothing left to draw them: the board came back empty while the check button,
computed from placement, sat enabled over it.

### 02 s4's retry — between two attempts (2026-10-11)

02 s4 (01 s34 until 2026-10-14) takes two attempts (`maxAttempts: 2`, storyboard 66–70); 01 s28 keeps
one. A wrong first check
resolves nothing — `checked`/`done` stay false and the board stays live — so three fields travel with
the board: `attempts`, `phase` (`'retry'` while the retry popup is open, cleared by the first change,
as SCQ's re-pick clears it) and `lastWrong` (the judged board). `lastWrong` drives the per-slot
verdicts — a slot keeps its mark only while it still holds the item it was judged with — and the gate
that keeps בדיקה disabled until the board differs from it. `ddqRestoreUI` reopens the retry popup from
`phase` and re-derives the hint (hidden until the first wrong check, slide 68) through `ddqSyncHint`;
it sends nothing. A document written before these fields reads them as 0/null: an unsubmitted board
comes back as a fresh first attempt, a resolved one is unaffected — so no state-version bump.

---

## The ledgers

`done`, `doneItems`, `hints` — all through `sendStatementOnce(ledger, key, verb, …)`. Three orderings
are load-bearing:

1. **During a restore we neither send nor mark.** `applyExecutionState` stubs the sender, so a mark made
   there would permanently suppress a statement that never actually left. `xapiRequestedHint` latches
   its in-memory key only when the ledger reports SETTLED.
2. **Fail open.** The ledger is obeyed only when it positively says "already sent". If the document is
   unavailable we send anyway — every call site swallows exceptions, and a silent drop is far worse than
   a duplicate.
3. **Marks persist synchronously.**

**B-1.** The library drops an evaluated item's `completed` when that item has no `answered` in the
page load (no queue, no retry). `_xapiCloseItem` asks the library's own question first
(`_xapiLibWouldDrop`) and leaves the ledger untouched when the statement would be dropped, so the real
scored `completed` is not suppressed forever.

The old `doneQ` re-answer guard is gone: under platform routing nothing re-enters מועד א after its
`completed`, and `peakState` (restored by resume) locks a resolved סעיף.

---

## `?resetState`

The QA escape hatch. `initResumeResetHatch()` runs **first** in `90-boot.js`: it sets
`_resetRequested` (so `readUnitState` writes an empty document), clears the character cache,
`RESULT_KEYS` and the dev nav edges, and strips itself from the URL via `history.replaceState` —
otherwise every reload would reset again. Off-platform there is no `?registration`, so the fallback
keys every local run to one document per part; after one pass the ledger is full and no `completed`
is emitted again. **Start every local run with `?resetState`** (`index_dev.html`'s reset button does).

---

## Verified headlessly — `_test/verify-resume.js` and `_test/verify-report.js`

`verify-resume.js`: 530 assertions (2026-10-20) across parts 01, 02, 03, 05, 06 and 07 — the SCQ
screens, both matching boards, the retry on 02 s4, the peaks, five real reloads and the comic — in
jsdom, against the real `index.html` + `js/main.js` + `unit-js/*.js`, with the loader's two-phase
seam reproduced. `verify-report.js` adds the document shape (exact v5 field set, a foreign
`component` discarded with the warning, a v3 document discarded), the ledgers (one `completed` for
two finish clicks, the hint ledger), D-8 after a reload, and the character's four steps (adopted from
the cache, never deleted; `?resetState` adopts nothing; a foreign value rejected) — 1539 checks.
Two rules both are built around:

1. **Every assertion drives through `goTo()`** — or through a genuine reload, by copying the state
   document out of one window and seeding it into the next before its scripts run. The sibling's
   suite called its painters directly and therefore missed a production lock-up that lived in the
   *wiring* between `goTo` and the painter. A test that calls the painter tests the painter.
2. **Assert on outcomes, never on "it did not throw".** `restoreScreenUI` sits under three layers of
   `try/catch`; a swallowed throw is indistinguishable from a painter that ran and did nothing. The
   suite also fails on any `console.error` carrying the `[resume]` prefix.

Covered per question, for all 19 popup screens and both matching boards: correct, retry left
mid-attempt, wrong-final, the re-pick case, a pristine screen, the toggle in both directions, an
unsubmitted board, the peak lock, and four real reloads.

**Each assertion was verified in the negative** — every fix reverted in turn, and the suite confirmed
to fail (before the split, at 408 assertions; "part 01" then included today's part 02, and "part 02"
is today's part 03):

| reverted | assertions lost |
|---|---|
| SCQ popup restore (part 01) | 20 |
| painter keyed on `attempts` again | 12 |
| `learnerPlacement` dropped from the payload | 15 |
| unsubmitted-drag repaint removed | 2 |
| DDQ arrival rule removed | 4 |
| SCQ popup restore (part 02) | 20 |
| peak lock removed | 2 |
| commit-time flush removed | 5 |

⚠️ The arrival-rule revert initially passed, which exposed a **gap in the suite**, not a passing fix:
nothing left a matching board on the learner's own answer before navigating away. That case is now
covered, and the revert fails as it should. Two jsdom gaps are stubbed in the rig and are not defects
in the unit: `matchMedia` (part 01 reads it at top level, and unstubbed it silently kills every
declaration after it) and `HTMLMediaElement.load/play`.

## Verified in the browser (stub, 2026-10-20)

Every part walked on the dev server with `?xapiLib=../_test/xapi-720-k.js&registration=<fake>&resetState`:

| | |
|---|---|
| boot | v5 document keyed `execution-state::<slug>`, `XAPI_USING_G`, `DEV_NAV` false under a registration, cover dropped, component `initialized` once, no console error |
| part 01 full walk | character → document + cache; `selected learning-type`; item 02 wrong → hint ×2 (one `requested.1`) → right; s28 matching `S[.]T[,]…`; s29 dropdown; two clicks on שנמשיך? → **one** component `completed {success:true, 1}`, button disabled, URL unchanged |
| reload | lands on s29 with marks and popup, button still disabled (D-8), component `initialized` **before** the item's, nothing re-sent, `xapiItemAnswered` seeded for items 02/03/04 |
| part 06 fail path | item and component `completed {success:false, 0.5}`, `results.volume-solid-01_moedAPassed = "false"` in the document and the cache, button disabled, no navigation, back button hidden |
| parts 02, 03, 04, 05, 07 | every `response` equals the metadata string (07 s4 after the `<br>` fix), one `completed` per part, `__dupes()` empty |
| character across parts | chosen in 01, part 03 launched under another registration paints the turquoise sprite and copies it into its own document |
| `?dev=1` | `DEV_NAV` true, back button visible, `previousPartHref` carries the query |

**A defect found and fixed here (2026-08):** the resumed load used to emit the **item** `initialized`
before its component's. The item init lives in the loader, always after the component `initialized`.

---

## Verified live against Kata — 2026-10-20

See [LIVE-VERIFICATION-2026-10-20.md](LIVE-VERIFICATION-2026-10-20.md): all seven parts opened by
real launch links (one registration each), every statement 200 with `context.registration`, every
State `PUT` 204, the first read 404 → `absent`; part 01 relaunched onto its last answered screen
with nothing re-sent and the finish button disabled; part 02 reloaded mid-walk with answers,
progress and the library's answered map restored; the character chosen in 01 adopted by 02–07.
Not covered: a platform re-take (State cleared by Kata), Kata's routing on `completed`, two devices
on one registration (`If-Match`/ETag deliberately unused).

## The peak assessment locks what it has reported

Restoring `peakAnswers` used to re-mark the picked option without disabling the options, so a learner
returning to a completed sub-part could change their pick on screen while nothing was re-reported —
the display drifting away from the LRS record. Logged here as an observation until 2026-08-26, then
ruled a defect and fixed.

`peakCommitted` is the new flag, and it is deliberately **separate from `peakAnswers`**:
`peakAnswers[idx]` is written the moment an option is clicked, `peakCommitted[idx]` when
`peakContinue()` reports it. Locking on the former would lock the options the instant a learner
touched one. `peakEnter` disables the options of a committed sub-part; `peakSelect` refuses to move
one. The continue button stays live, so a returning learner can still walk forward, and the `doneQ`
ledger refuses the second graded send regardless.

Both flags ride in the payload, so the lock survives a reload.

**Since 2026-10-14** (per-סעיף feedback, two attempts) the lock is `peakState[idx].done`, set when
`peakCheck()` resolves a סעיף; `peakState` rides in the payload instead of the two flags, and a
document carrying `peakAnswers`/`peakCommitted` is mapped onto it in `applyResumeVars`.
