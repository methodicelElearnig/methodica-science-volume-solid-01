# xAPI (720) reporting in this unit

What this unit reports, where each statement fires, and why. Conformance target: **720 technical
guidelines v2.4 (26/07/2026)** plus `דוגמאות XAPI.pdf`.

> ⚠️ The copy of the guidelines in this repo's `Docs/` is **v2.2** — two revisions stale, and it
> predates both of v2.4's breaking changes. Build against the v2.4 PDF in
> `…/methodica-math-scale-01/docs/`, not against `Docs/`.

Companions: [unit-js/README.md](unit-js/README.md) · [RESUME.md](RESUME.md) ·
[ROUTING-AND-RETAKE.md](ROUTING-AND-RETAKE.md) · [METADATA-KNOWN-ISSUES.md](METADATA-KNOWN-ISSUES.md)

---

## Library

`xapi-720-j.js`, loaded from `https://lomdot.education.gov.il/metodica/720active/common/`.
`unit-js/50-loader.js` picks it because `RESUME_ENABLED` is true; with resume off it would load `-i`.

**`xapi-720-f.js` is deprecated and must not be reinstated.** It predates v2.4 entirely: no
`contextActivities.parent`, no item-level `objectId`, no `XAPI_DISABLED`, no `context.registration`, and
pre-spec adlnet verb IRIs for `selected`/`requested`. It also has no master in `720-common-lib/` — only
a deployed copy. The full `-f`→`-i` comparison, including the proof that **no id changes shape**, is in
`_test/baselines/stage-3-library-diff.md`.

On every library bump, re-check that **`sendStatement720` is a top-level `function` declaration**.
`applyExecutionState()` suppresses replayed statements by swapping `window.sendStatement720` for a
no-op; if it ever becomes `const`/`let` that swap fails silently and resume re-reports everything.

---

## Ids

Everything is a full IRI under the unit prefix, and must match `metadata/*.json` **byte-for-byte**,
including the trailing slashes this unit's metadata carries on unit, component and item ids.

| level | shape | trailing slash |
|---|---|---|
| unit | `<prefix>` — **see METADATA-KNOWN-ISSUES.md** | yes |
| component | `<prefix><comp-slug>/` | yes |
| item | `<prefix><comp-slug>/<comp-slug>-NN/` | yes |
| question | `<item>qN` | no |

**Items nest inside the component.** The pre-reconstruction code built `<prefix><comp-slug>-NN/qN`,
omitting the component segment, so **no `answered` in the unit matched the catalog** — consistent with
the "שאלה לא נמצאה" the platform reported for the sibling unit.

Ids are never hand-assembled now. `xapiQ(itemSuffix, qKey)` resolves them from `window.METADATA` and
returns `{questionId, parentId}` in one lookup, so the catalog is the single source of truth and
re-syncing metadata can change the prefix without touching code. `_test/checks.mjs` gate 4 runs the
**real** `xapiItemId`/`xapiQ` against all seven metadata files: **23 items / 31 questions, zero
mismatches**.

> **Resolve at SEND time, not at registration time.** `xapiQ()` reads `window.METADATA`, which the
> library fetches asynchronously, while `registerPractice()` runs during parse. So configs carry only
> `item` (and `qKey` where an item has several questions), and the IRI is built inside the send.

---

## What is reported, and where it fires

| Statement | Fires |
|---|---|
| `initialized` (component) | `50-loader.js`, once per page load — deliberately **not** deduped |
| `initialized` (unit, `scope:'unit'`) | `onXapiReady()` in parts 01 and 02 — see open items |
| `initialized` / `completed` (item) | `xapiOnScreen()`, when the learner crosses into a different item |
| `answered` / `answered.last` | each check/submit. Only `.last` feeds the component score |
| `requested.1` | on hint **open** only |
| `completed` (component) | the routing function that leaves the component, via the ledger |
| `completed` (unit) | part 05 on pass; part 06 on **both** paths |
| `selected` | exactly one site — the part 01 learning-path choice |
| `played` / `paused` | `xapiWireVideos()`, part 01's `<video>` |
| `interacted` | applets, guesses, the hook's free text, the companion picker |
| `experienced` | each comic panel |

**`initialized` is never guarded.** v2.4 §1 requires it again on every re-entry — the inverse of v2.3,
changed by the deletion of a single word (`אין` → `יש`). Only `completed` is deduped.

**Item scope is driven from `goTo()`.** Paging inside one item emits nothing; the item closes when the
learner enters a screen belonging to a *different* item. That is why `SCREEN_TO_SUBCONTENT` must cover
**every** screen — an unmapped screen reports no item, in the statements and in the bug report alike.
Gate 5 enforces `TOTAL_SCREENS` entries per part: **68/68 screens mapped**.

---

## Result shapes

v2.4 requires `response` **and** `success` **and** `score.scaled` on `answered`. Before this work the
unit split cleanly in two and neither half conformed: every SCQ and the DDQ sent `{success, score}`
with no `response`, while the applets and peak answers sent `{response}` with no `success`/`score`.

`response` is the option's **visible text**, from `xapiAnswerText()`. Decisive evidence: the metadata's
`answers` arrays hold the full option strings, so the raw `'a'`/`'b'` data-id the peak components used
to send matched nothing.

**Always supply an explicit `result` on `completed`.** The library's own aggregate is an all-correct
AND, which reports `success: false` for any partial pass. `XAPI_ITEM_RESULT` supplies an item's result
where it spans several questions (part 04's items 04/05, parts 05/06's single item); items holding one
question omit it, because the AND is already right.

### Denominators — what the learner was promised

| component | denominator | why |
|---|---|---|
| 01 | **5** | eight questions are graded in code, but the learner is shown five progress dots and told `4 מתוך 5` |
| 02 | 6 | six exercises, six dots |
| 03 | *no score* | an off-computer inquiry task with no answer UI at all |
| 04 | 8 | eight dots, which here also matches the metadata count |
| 05 / 06 | 4 | four sub-parts |

### `success` — reported only where a gate exists

- **Part 01** reports the real threshold: `practiceScore() >= 4`. That gate exists in the content and
  the metadata's `recommendedAfterFail` names Part 02, so it is reported, not invented.
- **Parts 02 and 04** report `success: true` unconditionally. They have **no** pass threshold anywhere
  and always advance, so with no gate to clear, completing the component *is* the success condition and
  `score.scaled` carries the performance. Confirmed with the content owner.
- **Parts 05 and 06** report the ≥3/4 assessment rule, on both pass and fail paths.

**Report `completed` on failure paths too.** A component the learner does not clear must still be
reported, or the whole attempt goes unrecorded — the platform cannot distinguish it from a learner who
never started. Part 05's failure path used to send nothing at all.

---

## `selected` has a closed dictionary

v2.4 §4 lists exactly five categories: `learning-type`, `practice-decision`, `is-understood`,
`is-repeat`, `external-learning`. Three sites in part 01 claimed to be `selected`; one qualifies.

| site | now | why |
|---|---|---|
| s7 learning-path choice | `selected` / **`learning-type`** | a genuine learning-format preference. The old camelCase `learningType` was not a dictionary value |
| s0 companion picker | `interacted` / `companion-choice` | picking a mascot is not a learning type; an avatar picker is decoration, and reporting it as a preference would be false |
| s4 image reveal | `interacted` | not in the dictionary — the learner reveals a reason, not a preference |

Similarly, five sites sent `answered` for things that are **not catalog questions** (the hook's free
text and four applets). Since v2.4 makes `parent` mandatory on `answered` and there is no item question
to parent to, those statements were unmatchable as well as non-conformant. All are now `interacted`.

---

## Query-string propagation

`?slxapi` and `?registration` enter through the root `index.html` and **every** cross-part jump must
append `window.location.search`. Miss one and both the LRS configuration and the learner's resume
document are lost from that point on. Six sites: the root redirect, the four forward routers,
`peakGoRetake()`, and `goBackToPrevPart()`.

## Regression gate

With no `?slxapi`, the library sets `XAPI_DISABLED` and every send becomes a silent no-op. Verified: a
local answer issues no `/statements` request at all. That is also what allows the loader to load the
real library off-platform, which gives a dev server real `window.METADATA` — so `xapiQ()` resolves and
the bug-report form posts real ids without any stubbing.

---

## Open items — for the platform or the content owner

1. **`experienced` and `interacted` are off-spec verbs** (nine sites). Both resolve to real ADL IRIs, so
   the statements are valid, but neither is in the 720 verb list. Confirm they are acceptable, or say
   what to use instead.
2. **Should the applets be catalog items?** The displacement, flooding and measurement applets are
   substantial interactions with no metadata question, so they can only be `interacted`. Making them
   measurable needs item questions in the metadata — and a metadata push.
3. **The unit-scope `initialized` fires from parts 01 and 02**, preserved from the original code.
   Whether exactly one component should open the unit is a platform-semantics question; the sibling unit
   left the same one open.
4. **An item `initialized` after that item's `completed`** is unavoidable given v2.4's deliberate
   asymmetry (repeat `initialized` required, repeat `completed` forbidden) plus back-navigation. Raised
   by the sibling unit and never answered.
5. **`scqReset` clears the attempt counter** on re-entry, so a learner who leaves a question mid-attempt
   and returns produces two interim `answered` and never an `answered.last` — that question is then
   never closed in the record. Pre-existing; the resume repaint fixes it for the resume path.
6. **The bare unit id** — see [METADATA-KNOWN-ISSUES.md](METADATA-KNOWN-ISSUES.md).
7. **Nothing has been verified against a live Kata launch.** See RESUME.md's open list.
