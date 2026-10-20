# Routing, the retake, and who owns each decision

**The platform owns routing (since 2026-10-20 in this unit; family-wide since 2026-09-16).** Kata
launches each component on its own URL with its own `?registration`, reads our component `completed`
and decides what comes next from the catalogue — `recommendedAfterFail`, `isRequired`, `order`. A
part reports and stops. Read this before changing any navigation or any `completed`.

Companions: [REPORT-XAPI.md](REPORT-XAPI.md) · [RESUME.md](RESUME.md)

---

## The unit's flow graph (what the catalogue has to express)

```
   01  הוק והקניה ──always──▶ 02  תרגול סטנדרטי (5 Qs, gate 4 of 5)
                                   ├─ ≥4 ──────────────────────────▶ 04  משימת כיתה ─▶ 05  תרגול מתקדם ─▶ 06  מועד א (≥3 of 4)
                                   └─ <4 ─▶ 03  תרגול בסיסי ─────▶                                        ├─ pass ─▶ end
                                                                                                           └─ fail ─▶ 07  מועד ב (4 of 4) ─▶ end
```

| catalogue field | state (metadata/, 2026-10-20) | effect |
|---|---|---|
| 02 → 03 on fail | 03 `isRequired: false`, `recommendedAfterFail` names 02 | remediation only for a learner who failed the gate |
| 05 | `isRequired: false` | — |
| 06 → 07 on fail | **06 `recommendedAfterFail: []`** | ⚠️ no route to the retake yet; the reference unit's 06 names its 07. Metadata is the content owner's — flagged in REPORT-XAPI.md and METADATA-KNOWN-ISSUES.md |
| 06, 07 | both `order: 6`, `isAssessment: true` | — |

Inside a part the flow is still the content's: part 01 forks at s7 (comic 8→14 or experiments
15→21) into the shared ending 22→26 and the warm-ups 27→29; part 05's scenario screens (s10, s9)
and parts 06/07's scenario s5 sit out of numeric order. `advanceScreen()`/`goBack()` remain the
authoritative graph — **no code may assume `currentScreen ± 1`.**

---

## Why the content must not route

Kata's registration is per {learner, component} and so is the State document. The old model
appended `window.location.search` to every hop, so a learner walking the unit from part 01 reported
every part under part 01's registration and saved every part's resume slot into part 01's document.
Under platform launch, parts 02–07 arrive with their own registration; an internal hop would carry
the previous component's. That was the live reporting defect behind the change, not only an
ownership question.

What was removed: the loader's hop to the saved part, the forward routers' `location.href`, the
`prev` back-edges and `syncBackButton`, `peakGoRetake`, `unitFinish` and the `720:unit-finished`
postMessage, the root `index.html` is repo-only (never deployed).

---

## The attempt-ending sites

Each part's last click calls `partFinish(btn)` → `xapiEndComponent(result, btn)`: closes the open
item, reports the component `completed` through the `done` ledger, disables the button. Nothing
follows. Outside Kata (QA on the CDN, a local run) nothing removes the component; the disabled button
is the only sign the click was recorded.

| part | last click | reports | then |
|---|---|---|---|
| 01 | s29 שנמשיך? (`goToNextPart`) | component `completed` | stop |
| 02 | s5 שנמשיך? | `completed`, `success` = the 4-of-5 gate | stop — Kata routes to 03 or 04 |
| 03 | s7 שנמשיך? | `completed` | stop |
| 04 | s1 חזרתי (`classTaskDone`) | `completed {success:true}` | stop |
| 05 | s8 שנמשיך? | `completed` | stop |
| 06 | s4 שנמשיך? (`peakNext(4)`) | verdict → `setUnitResult`, `completed` on **both** outcomes | stop — Kata routes a fail via `recommendedAfterFail` |
| 07 | s4 שנמשיך? | `completed` on both outcomes | stop — the final attempt |

Both peaks report through `partFinish` from `peakNext()` only, synchronously, never from a
screen-entry hook. There is **no unit `completed`**: the platform derives the unit outcome.

---

## Dev navigation (`DEV_NAV`)

`index_dev.html` loads each part with `?dev=1`. `DEV_NAV` (`unit-js/10-identity.js`) is true only when
`?dev=1` is present **and** there is no `?registration` — every Kata launch carries one, so a launch
URL with `&dev=1` appended still behaves as production. Under `DEV_NAV` only:

- the former routers hop to the next part after `partFinish` (`writeForwardState(dest)` records the
  back edge in `sessionStorage`, then `location.href`), 02 by the gate, 06 only on a fail;
- the first screen's `#back-to-prev-part` is shown (hidden by attribute **and** inline display
  otherwise, `syncDevBackButton` in `90-boot.js`) and `goBackToPreviousPart(fallbackSlug)` resolves
  the edge (`NAV_EDGE_KEY`) or the fallback; without the flag the function returns.
- `?resetState` is appended by the dev wrapper's reset button and strips itself from the URL.

The `completed` is never gated on the flag.

---

## Re-take

The platform may clear a component's State on re-entry. The part reads a 404 → an empty v5 document:
`payload: null` (nothing to restore), empty ledgers (`completed` goes out again — intended), empty
`results` that beats the localStorage mirror of the previous attempt. No code path depends on the
document being populated; a cold start is a first-class case.

---

## Score thresholds, in one place

| gate | where | reported as |
|---|---|---|
| *(none)* | 01 | `success: true`, score = correct / 3 |
| **4 of 5** | 02 | `success: practiceScore() >= 4`, score / 5 — the platform routes on it |
| *(none)* | 03, 05 | `success: true`, score carries performance |
| **3 of 4** | 06 מועד א | `success` on both paths; verdict in the document under `results` |
| **4 of 4** | 07 מועד ב | `success` on both paths; the unit ends either way |
