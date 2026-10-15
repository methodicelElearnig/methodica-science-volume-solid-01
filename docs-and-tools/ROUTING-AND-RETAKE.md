# Routing, the retake, and who owns each decision

The one document the sibling unit cannot supply, because its flow is linear and this one's is not.
Read this before changing any navigation or any `completed`.

Companions: [REPORT-XAPI.md](REPORT-XAPI.md) · [RESUME.md](RESUME.md)

---

## The unit's flow graph

```
                    root index.html  (carries ?slxapi + ?registration)
                            │
                            ▼
   ┌─────────────────── 01  הוק והקניה ───────────────────────────────────────┐
   │  hook → acquisition (comic ⟋ experiments → shared ending) → warm-ups      │
   └───────────────────────────────┬──────────────────────────────────────────┘
                                    │  always (no gate)
                                    ▼
   ┌─────────────────── 02  תרגול סטנדרטי (5 Qs) ─────────────────────────────┐
   └───────────────────────────────┬──────────────────────────────────────────┘
                    practiceScore() │ ≥ 4 of 5  ────────────────┐
                                    │ < 4                        │
                                    ▼                            │
                    03  תרגול בסיסי (remediation, 6 Qs)          │
                                    │  always                    │
                                    ▼                            ▼
                    04  משימת כיתה  ◄──────────────────────────────┘
                                    │  "חזרתי"
                                    ▼
                    05  תרגול מתקדם (8 Qs, 2 scenarios)
                                    │
                                    ▼
                    06  שאלת שיא — מועד א   (isAssessment, 4 sub-parts, ≥3 to pass)
                          ├─ pass ─→  END OF UNIT
                          └─ fail ─→  07  שאלת שיא — מועד ב  (final attempt, 4/4 to pass)
                                            ├─ pass ─→ END OF UNIT
                                            └─ fail ─→ END OF UNIT
```

**Part 04 is reachable from both 02 and 03.** The `prev` back-edge resolves correctly regardless,
because whichever router navigated is the one that wrote the edge.

**The 7-component split (2026-10-14).** Until 2026-10-14 the unit had six components: standard
practice was the tail of part 01 (s30–s35, holding the 4-of-5 gate) and the later parts were numbered
one lower (remediation 02, class task 03, advanced 04, peaks 05/06). Standard practice is now its own
part 02 (s0–s5), part 01 always continues to it, and every later part moved up by one.

**Parts 01, 02 and 03 are numbered in storyboard order** (renumbered 2026-10-14; old ids in SCREENS.md).
Part 01 is linear except at the fork: comic 8→14 or experiments 15→21, both continuing into the
shared ending 22→26 ("סיום הקניה (בשתי הדרכים)"), then warm-ups 27→29 → part 02. Part 02 is linear,
practice rules s0 then questions s1→s5. In part 05 the scenario screens (s10, s9) still sit out of
numeric order, and in parts 06/07 the scenario s5 is read between the intro s0 and סעיף א s1.
`advanceScreen()`/`goBack()` remain the authoritative graph — **no code may assume `currentScreen ± 1`.**

---

## Who owns the retake routing

**The content does.** `peakGoRetake()` in part 06 navigates to part 07, and part 06's metadata
`recommendedAfterFail` is deliberately left **empty**.

This was a decision, not an omission. The alternative — naming part 07 in `recommendedAfterFail` and
letting the platform route — carries a concrete risk: Kata's registration is stable per platform,
learner **and component**, so a platform-initiated deep launch of part 07 would arrive with a *different*
registration, addressing a *different* state document. The learner's progress would split in two, and
the ledger in the new document would be empty — so every `completed` they had already earned would be
reported a second time.

Keeping one path in means one registration and one document.

> **Do not declare both.** Populating `recommendedAfterFail` *and* keeping `peakGoRetake()` makes part 07
> reachable two ways, one of which brings a fresh registration. If the platform ever needs to own this,
> remove `peakGoRetake()` in the same change.

**To confirm with the platform partner:** does the platform ever deep-launch a non-first component, and
does it expect to route a failed מועד א itself?

Regardless of the answer, **part 07 must tolerate a cold start**: arriving with an empty document has to
be a legitimate fresh start, never a hop, and never an assumption that `done` is populated.
`readUnitState()` already behaves that way — it never returns `null` — but it is a first-class case, not
an edge case.

---

## The back edge into a failed assessment

Part 07 **does** offer `חזרה` back into part 06. `writeForwardState()` records
`prev['…-07'] = '…-06'` and part 07's `#back-to-prev-part` becomes visible.

That is a product decision, and it is the reason the **`doneQ` ledger** exists. A learner walking back
into מועד א can re-answer its sub-parts; without a guard, the LRS would receive a second full round of
graded answers for מועד א *after* מועד ב had already begun — corruption in the unit's only
`isAssessment: true` component. Two layers defend it; see RESUME.md.

If the product decision is ever reversed, the change is: stop writing the back-edge in `peakGoRetake()`
and remove `#back-to-prev-part` from part 07's markup. Leave `doneQ` in place regardless.

---

## The attempt-ending sites

Since 2026-10-15 there are **no end screens**: the unit ends on סעיף ד's שנמשיך? (`peakNext()` →
`peakFinish()` → `unitFinish()`, which posts `720:unit-finished` to a framing host). Exactly one unit
`completed` must be reported across all of them. `done['unit']` — keyed `'unit'`, not
by slug, so parts 06 and 07 share it — is what guarantees that.

| where | component `completed` | unit `completed` |
|---|---|---|
| 06 s4 — passed מועד א | ✓ `success: true` | ✓ **the unit ends here** |
| 06 — failed מועד א (no end screen; straight to part 07) | ✓ `success: false` | ✗ the learner goes on to מועד ב |
| 07 s4 — passed מועד ב | ✓ `success: true` | ✓ terminal |
| 07 s4 — failed מועד ב | ✓ `success: false` | ✓ terminal — a learner who fails the final attempt has still finished the lomda |

Before this work, **the unit `completed` existed nowhere in the unit**, and the failure path of
מועד א (then part 05, now 06) reported nothing at all — a failed מועד א was indistinguishable from a learner who never started.

Both are sent from `peakFinish()`, called from `peakNext()` (after סעיף ד) only, **synchronously**, and never from
a screen-entry hook. See the standing rules in `unit-js/README.md`.

---

## Query-string propagation

`?slxapi` and `?registration` must survive every hop, or both the LRS configuration and the learner's
resume document are lost from that point on. Every site:

| site | |
|---|---|
| root `index.html` | `window.location.replace('./…-01/' + window.location.search)` |
| `goToNextPart()` in 01, 02, 03, 05 | `+ window.location.search` |
| `classTaskDone()` in 04 | `+ window.location.search` |
| `peakGoRetake()` in 06 | `+ window.location.search` |
| `goBackToPrevPart()` in `40-resume.js` | `+ window.location.search` |
| resume hop in `50-loader.js` | `+ window.location.search` |

---

## Score thresholds, in one place

| gate | where | effect |
|---|---|---|
| *(none)* | part 01 | always advances to part 02. `success: true`, score = correct / 3 (item 02's q1 + the 2 warm-ups) |
| **4 of 5** | part 02 standard practice | ≥4 skips remediation → part 04; <4 → part 03. Also the component's reported `success` |
| *(none)* | parts 03, 05 | always advance. `success: true`, score carries performance |
| **3 of 4** | part 06 (מועד א) | pass/fail of the assessment, and of the unit |
| **4 of 4** | part 07 (מועד ב) | pass/fail of the final attempt; the unit ends either way |

Part 02's threshold is reported as `success` because it exists in the content and the metadata's
`recommendedAfterFail` (= part 03) backs it up. Parts 01, 03 and 05 have no gate, so inventing one
would have been a pedagogical decision disguised as a reporting one — see REPORT-XAPI.md.
