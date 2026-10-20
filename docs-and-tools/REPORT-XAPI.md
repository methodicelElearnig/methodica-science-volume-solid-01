# xAPI (720) reporting in this unit

What this unit reports, where each statement fires, and why. Conformance target: **MOE technical
guidelines v2.7 (15/09/2026)**, `דוגמאות XAPI.pdf`, the MOE mail of 19/10/2026 on `result.response`,
and Kata's platform model (`Documentation/KATA/KATA-API.md`). Procedure followed:
`Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md`; reference implementation
`methodica-science-body-matter-01` (verified live against Kata on 2026-10-20).

Upgraded from the v2.4 / `xapi-720-j.js` model on 2026-10-20. The old model (content-side routing, a
unit-wide State document, unit-level statements, `interacted`/`experienced`) is gone; this document
describes only what ships.

Companions: [unit-js/README.md](../unit-js/README.md) · [RESUME.md](RESUME.md) ·
[ROUTING-AND-RETAKE.md](ROUTING-AND-RETAKE.md) · [RESPONSE-EXAMPLES.md](RESPONSE-EXAMPLES.md) ·
[METADATA-KNOWN-ISSUES.md](METADATA-KNOWN-ISSUES.md)

---

## Library

`xapi-720-k.js`, loaded from `https://lomdot.education.gov.il/metodica/720active/common/`.
`unit-js/50-loader.js` picks it because `RESUME_ENABLED` is true; with resume off it would load `-i`.
`-k` is `-j` plus the mandatory `helpType: "hint"` context extension on `requested` (v2.7 p.24,
MOE request of 2026-09-15); every live 720 unit loads `-k`.

**`LIB720` and the `XAPI_USING_G` regex change in the same edit.** The regex lists the letters that
support item-level statements; a letter missing from it silences `xapiOnScreen()` and the video
reporting with no error.

On every library bump, re-check that **`sendStatement720` is a top-level `function` declaration**.
`applyExecutionState()` suppresses replayed statements by swapping `window.sendStatement720` for a
no-op; if it ever becomes `const`/`let` that swap fails silently and resume re-reports everything.
Also re-check that `xapiItemAnswered` is reachable on `window` — `xapiSeedAnsweredFromResume()`
re-arms it after a restore, or the library drops every restored item's `completed`.

---

## Launch and identity

Everything comes from the launch URL: `?slxapi=<JSON {actor, auth, endpoint}>` and
`?registration=<uuid>`. Kata launches **each component on its own URL** with its own registration
(`POST /api/v1/launcher/context` takes one `componentId`). Without a valid `slxapi` the library sets
`XAPI_DISABLED` and every send is a silent no-op; the State layer falls back to `localStorage`.

Ids must match `metadata/*.json` **byte-for-byte**:

| level | shape | trailing slash |
|---|---|---|
| unit | `methodica-science-volume-solid-01` — a bare slug (v2.5 §2.7; `window.XAPI_UNIT_ID`) | — |
| component | `<prefix><comp-slug>/` (`XAPI_COMP_ID`) | yes |
| item | `<prefix><comp-slug>/<comp-slug>-NN/` (`xapiItemId`) | yes |
| question | `<item>qN` — the metadata stores the absolute IRI since 2.7 | no |

`xapiQ(itemSuffix, qKey)` resolves question and parent ids from `window.METADATA` at **send time**
(the library fetches the metadata asynchronously while the registrations run during parse).
`50-loader.js` compares `XAPI_COMP_ID` with `METADATA.id` on every load and logs an ID MISMATCH error.
`_test/checks.mjs` gate 4 runs the real `xapiItemId`/`xapiQ` against every metadata file.

**No unit-level statement.** v2.5/v2.7 define `initialized`/`completed` at item and component level
only; the platform derives the unit outcome itself. `XAPI_UNIT_ID` keys only the localStorage
fallback and the bug-report form.

---

## What is reported, and where it fires

| Statement | Fires |
|---|---|
| `initialized` (component) | `50-loader.js`, once per page load — deliberately **not** deduped |
| `initialized` (item) | `xapiOnScreen()` from `goTo()`, when the learner crosses into a different item; `isEvaluationItem` category on graded items |
| `completed` (item) | `_xapiCloseItem()` when the item is left or the component ends, through the `doneItems` ledger. **B-1:** an evaluated item with no `answered` in this page load is not closed (the library would drop it) |
| `answered` / `answered.last` | `xapiAnswered()` on each check. Two-attempt questions send a wrong first try as `answered` and the closing try as `.last`; only `.last` enters the library's component denominator |
| `requested.1` | `xapiRequestedHint()` on hint **open**, once per question per attempt (`hints` ledger); the library adds `helpType: "hint"` |
| `completed` (component) | `partFinish()` → `xapiEndComponent()` on the **last click** of the part, through the `done` ledger; then the button is disabled and nothing else happens |
| `selected` | exactly one site — part 01's learning-path choice, category `learning-type` |
| `played` / `paused` | `xapiWireVideos()`, only `<video data-xapi-report="NN">` (part 01's `#s1-video`, item 01); object = the item |

Removed on 2026-10-20: the unit-scope `initialized` (parts 01/02/03) and `completed` (06/07), the
nine `interacted` and one `experienced` sites of part 01 (outside the 720 verb list), the
`720:unit-finished` postMessage. The learner's companion choice, the applets, the guesses, the open
hook question and the comic panels are not reported.

**`initialized` is never guarded** (v2.7 requires it on every re-entry). `completed` is deduped by
the ledgers across page loads and by the library within one.

**Item scope is driven from `goTo()`.** Paging inside one item emits nothing; the item closes when the
learner enters a screen belonging to a *different* item, so `SCREEN_TO_SUBCONTENT` must cover
**every** screen (gate 5).

---

## The finish button — report and stop

Kata removes the component from the screen when `completed` arrives (v2.7 p.23) and decides what
comes next from the catalogue (`recommendedAfterFail`, `isRequired`, `order`). So `completed` is the
learner's **last click** in the component — after every feedback — and the part then does nothing:
no navigation, no `window.close`, no `postMessage`, no alert (rule of 2026-10-14). The button is
disabled, and `restoreEndedButton()` keeps it disabled after a reload (D-8).

| part | `XAPI_END_BTN` | `xapiPartResult()` |
|---|---|---|
| 01 | `s29-scq-check` (warm-up 2's שנמשיך?) | `{success: true, score: {scaled: correct / 3}}` |
| 02 | `s5-scq-check` | `{success: practiceScore() >= 4, score: {scaled: /5}}` — the unit's real gate |
| 03 | `s7-scq-check` | `{success: true, scaled: /6}` |
| 04 | `s1-continue` (חזרתי) | `{success: true}` — no score, an off-computer task |
| 05 | `s8-scq-check` | `{success: true, scaled: /8}` |
| 06 | `s4-continue` | `{success: peakScore() >= 3, scaled: /4}`, on both outcomes; also `setUnitResult('volume-solid-01_moedAPassed')` |
| 07 | `s4-continue` | `{success: peakScore() >= 4, scaled: /4}`, on both outcomes |

**Report `completed` on failure paths too.** A component the learner did not clear must still be
reported, or the attempt goes unrecorded; routing a failing learner is the platform's job.

The hop to the next part exists only under `DEV_NAV` (`?dev=1` and **no** `?registration`) for the
`index_dev.html` walkthrough — see ROUTING-AND-RETAKE.md.

---

## Result shapes

`answered` carries `success`, `score.scaled` (1 or 0) and `response`.

**`response` is the metadata text, byte for byte** (MOE, 19/10/2026): the response layer in
`unit-js/20-xapi.js` resolves what the UI hands it (an option's visible text, a matching board's
item/target labels) to the metadata `answers` entry and emits the xAPI interaction format:

| `questionType` | format | this unit |
|---|---|---|
| `choice` | `A` or `A[,]B`, in `answers` order | every SCQ, dropdown, hotspot, peak סעיף |
| `matching` | `S[.]T[,]S[.]T`, one pair per `answers.source`, in source order; `S[.]` if unplaced | 01 s28, 02 s4 |
| `performance` / `fill-in` / `numeric` / `true-false` / `sequencing` / `other` | per `xapiResponse()` | none today |

An unresolvable UI text is sent normalised and `console.warn`ed (`not in metadata`); the harnesses
turn that into a failure. `xapiAnswerText()` drops tooltips/badges/buttons and treats `<br>` as a
space (07 s4). See RESPONSE-EXAMPLES.md for real statements.

**Always supply an explicit `result` on `completed`.** The library's aggregate is an all-correct
AND. `XAPI_ITEM_RESULT` supplies an item's result where it spans several questions (05 items 04/05,
06/07's single item).

### Denominators — what the learner was promised

| component | denominator | why |
|---|---|---|
| 01 | 3 | item 02's q1 and the two warm-ups (no gate) |
| 02 | **5** | five questions, five dots, `4 מתוך 5` on screen |
| 03 | 6 | six exercises |
| 04 | *no score* | an off-computer inquiry task with no answer UI |
| 05 | 8 | eight סעיפים |
| 06 / 07 | 4 | four סעיפים |

### `success` — reported only where a gate exists

Part 02 reports the real threshold (`>= 4`); parts 01, 03 and 05 have no gate, so completing them
*is* the success condition and `score.scaled` carries the performance; 06/07 report their assessment
rule on both paths.

---

## `selected` has a closed dictionary

v2.7 p.24: `learning-type`, `practice-decision`, `is-understood`, `is-repeat`, `external-learning`.
The one site that qualifies is part 01 s7's comic-vs-experiments choice (`learning-type`). The
companion picker and the s4 image reveal are not preferences and are no longer reported at all.

---

## Regression gate

With no `?slxapi`, the library sets `XAPI_DISABLED` and every send is a silent no-op; the State
layer uses `localStorage`. `_test/verify-report.js` 4a loads every part with no library at all and
asserts nothing throws and nothing is sent.

## Verification

- `node _test/checks.mjs` — six static gates.
- `NODE_PATH=%LOCALAPPDATA%\lomda-jsdom\node_modules node _test/verify-report.js` — identity,
  wiring, routing, response layer H1–H13, shared-layer invariants, jsdom runtime (statement flow,
  D-8, document shape, character). 1539 checks on 2026-10-20.
- Browser walk of all seven parts with the stub (`?xapiLib=../_test/xapi-720-k.js&registration=X&resetState`),
  2026-10-20: every `response` equals the metadata string, one `completed` per two finish clicks,
  no navigation, `requested` once per question, `__dupes()` empty.
- Live Kata run 2026-10-20 — `LIVE-VERIFICATION-2026-10-20.md`: all seven parts, every statement
  200, every State write 204, resume and character adoption confirmed against production.

## Open items

1. **Part 06's `recommendedAfterFail` is empty** — Kata has no route from a failed מועד א to the
   retake until the metadata names part 07 (the reference unit's 06 does). Metadata is the content
   owner's; flagged, not changed.
2. **An item `initialized` after that item's `completed`** on back-navigation is unavoidable given
   the spec's asymmetry (repeat `initialized` required, repeat `completed` forbidden).
3. **`scqReset` clears the attempt counter** on re-entry; a learner who leaves mid-attempt and
   returns can produce two interim `answered` and never a `.last`. Pre-existing; the resume repaint
   fixes it for the resume path.
4. **Should the applets be catalogue items?** They are not reported at all today. Making them
   measurable needs item questions in the metadata.
