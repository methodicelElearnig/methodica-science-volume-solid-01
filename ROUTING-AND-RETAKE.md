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
   ┌─────────────────── 01  פתיחה + הקנייה + תרגול סטנדרטי ───────────────────┐
   │  hook → acquisition (comic ⟋ experiments) → warm-ups → 5 practice Qs     │
   └───────────────────────────────┬──────────────────────────────────────────┘
                    practiceScore() │ ≥ 4 of 5  ────────────────┐
                                    │ < 4                        │
                                    ▼                            │
                    02  תרגול בסיסי (remediation, 6 Qs)          │
                                    │  always                    │
                                    ▼                            ▼
                    03  משימת כיתה  ◄──────────────────────────────┘
                                    │  "חזרתי"
                                    ▼
                    04  תרגול מתקדם (8 Qs, 2 scenarios, 1 combined result)
                                    │
                                    ▼
                    05  שאלת שיא — מועד א   (isAssessment, 4 sub-parts, ≥3 to pass)
                          ├─ pass ─→  END OF UNIT
                          └─ fail ─→  06  שאלת שיא — מועד ב  (final attempt)
                                            ├─ pass ─→ END OF UNIT
                                            └─ fail ─→ END OF UNIT
```

**Part 03 is reachable from both 01 and 02.** The `prev` back-edge resolves correctly regardless,
because whichever router navigated is the one that wrote the edge.

**Screen order is not flow order** anywhere in this unit. Part 01's practice runs 13, 14, 15, **17**, 16;
part 04's scenario screens 9/10 sit outside the numeric sequence. `advanceScreen()`/`goBack()` are the
authoritative graph — **no code may assume `currentScreen ± 1`.**

---

## Who owns the retake routing

**The content does.** `peakGoRetake()` in part 05 navigates to part 06, and part 05's metadata
`recommendedAfterFail` is deliberately left **empty**.

This was a decision, not an omission. The alternative — naming part 06 in `recommendedAfterFail` and
letting the platform route — carries a concrete risk: Kata's registration is stable per platform,
learner **and component**, so a platform-initiated deep launch of part 06 would arrive with a *different*
registration, addressing a *different* state document. The learner's progress would split in two, and
the ledger in the new document would be empty — so every `completed` they had already earned would be
reported a second time.

Keeping one path in means one registration and one document.

> **Do not declare both.** Populating `recommendedAfterFail` *and* keeping `peakGoRetake()` makes part 06
> reachable two ways, one of which brings a fresh registration. If the platform ever needs to own this,
> remove `peakGoRetake()` in the same change.

**To confirm with the platform partner:** does the platform ever deep-launch a non-first component, and
does it expect to route a failed מועד א itself?

Regardless of the answer, **part 06 must tolerate a cold start**: arriving with an empty document has to
be a legitimate fresh start, never a hop, and never an assumption that `done` is populated.
`readUnitState()` already behaves that way — it never returns `null` — but it is a first-class case, not
an edge case.

---

## The back edge into a failed assessment

Part 06 **does** offer `חזרה` back into part 05. `writeForwardState()` records
`prev['…-06'] = '…-05'` and part 06's `#back-to-prev-part` becomes visible.

That is a product decision, and it is the reason the **`doneQ` ledger** exists. A learner walking back
into מועד א can re-answer its sub-parts; without a guard, the LRS would receive a second full round of
graded answers for מועד א *after* מועד ב had already begun — corruption in the unit's only
`isAssessment: true` component. Two layers defend it; see RESUME.md.

If the product decision is ever reversed, the change is: stop writing the back-edge in `peakGoRetake()`
and remove `#back-to-prev-part` from part 06's markup. Leave `doneQ` in place regardless.

---

## The three attempt-ending sites

Exactly one unit `completed` must be reported across all of them. `done['unit']` — keyed `'unit'`, not
by slug, so parts 05 and 06 share it — is what guarantees that.

| where | component `completed` | unit `completed` |
|---|---|---|
| 05 s5 — passed מועד א | ✓ `success: true` | ✓ **the unit ends here** |
| 05 s6 — failed מועד א | ✓ `success: false` | ✗ the learner goes on to מועד ב |
| 06 s5 — passed מועד ב | ✓ `success: true` | ✓ terminal |
| 06 s6 — failed מועד ב | ✓ `success: false` | ✓ terminal — a learner who fails the final attempt has still finished the lomda |

Before this work, **the unit `completed` existed nowhere in the unit**, and part 05's failure path
reported nothing at all — a failed מועד א was indistinguishable from a learner who never started.

Both are sent from `peakFinish()`, called from `peakContinue()` only, **synchronously**, and never from
a screen-entry hook. See the standing rules in `unit-js/README.md`.

---

## Query-string propagation

`?slxapi` and `?registration` must survive every hop, or both the LRS configuration and the learner's
resume document are lost from that point on. Six sites:

| site | |
|---|---|
| root `index.html` | `window.location.replace('./…-01/' + window.location.search)` |
| `goToNextPart()` in 01, 02, 04 | `+ window.location.search` |
| `classTaskDone()` in 03 | `+ window.location.search` |
| `peakGoRetake()` in 05 | `+ window.location.search` |
| `goBackToPrevPart()` in `40-resume.js` | `+ window.location.search` |

---

## Score thresholds, in one place

| gate | where | effect |
|---|---|---|
| **4 of 5** | part 01 practice | ≥4 skips remediation → part 03; <4 → part 02. Also the component's reported `success` |
| *(none)* | parts 02, 04 | always advance. `success: true`, score carries performance |
| **3 of 4** | parts 05, 06 | pass/fail of the assessment, and of the unit |

Part 01's threshold is reported as `success` because it exists in the content and the metadata's
`recommendedAfterFail` backs it up. Parts 02 and 04 have no gate, so inventing one would have been a
pedagogical decision disguised as a reporting one — see REPORT-XAPI.md.
