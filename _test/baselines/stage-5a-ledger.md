# Stage 5a — resume core + the ledgers, shipped dark

`unit-js/40-resume.js` (≈250 lines), wired between `30-nav.js` and `50-loader.js`.
`RESUME_ENABLED` stays **false**, so nothing changes for a learner yet.

## Two deliberate departures from the sibling unit

**Version 1, and no migration path.** The sibling ships v3 with a `migrateV2()` that wraps an older
document rather than discarding it — because discarding one would restart the learner at part 01 with
an empty ledger and re-report every `completed` they had earned. None of that applies here: this unit
has never shipped resume, so no document of any version exists in the field. Worse, that migration
would be **actively wrong** for this unit: it seeds the ledger from position in a linear part chain,
and this unit is not linear. Reaching part 06 does not imply part 05 was passed (it implies the
opposite), and reaching part 03 does not imply part 02 was visited, because part 01 branches straight
past it at 4/5. A document of an unknown version is discarded outright.

**A third ledger, `doneQ`** — required by the "allow back into 05" decision. Part 06 offers "חזרה"
into part 05, so a learner who failed מועד א can walk back into it from the retake. The `done` ledger
stops a second component `completed`, but `answered.last` is not ledgered anywhere in the sibling's
design — so the LRS would receive a **second full round of graded answers for מועד א after מועד ב had
begun**. That is data corruption in the one component with `isAssessment: true`.

Two redundant layers, by design:

1. part 05's payload restores `peakAnswers`, so its screens come back answered and locked and
   `peakContinue()` early-returns. A per-part correctness claim.
2. `sendAnsweredOnce()`, a structural backstop that does not depend on any part getting layer 1 right.

Used **only** by parts 05 and 06. Ordinary practice questions are deliberately unguarded —
re-answering those is legitimate learning behaviour the platform expects to see.

## Document shape

```js
{ v: 1,
  part:      '<slug the learner should land on>',
  parts:     { '<slug>': { currentScreen, …payload } },   // all six retained
  prev:      { '<slug>': '<slug entered FROM>' },          // incl. prev['…-06'] = '…-05'
  done:      { '<slug>': true, unit: true },
  doneItems: { '<slug>#<itemSuffix>': true },
  doneQ:     { '<slug>#<itemSuffix>/<qKey>': true }
}
```

`doneItems` and `doneQ` are namespaced by part slug, and here that is **not cosmetic**: parts 05 and
06 each hold a single item with suffix `'01'`, distinguished only by `XAPI_COMP_ID`. Without the slug
they would share one key and מועד ב's item `completed` would be silently suppressed. Verified:
`itemLedgerKey('01')` returns `methodica-science-volume-solid-01-06#01` in part 06.

The unit `completed` is keyed `'unit'`, not by slug, so parts 05 and 06 share it — exactly one unit
completion across the three attempt-ending paths.

## Every `completed` now goes through the ledger

| part | site | ledger key |
|---|---|---|
| 01 | `goToNextPart` | `done` / slug |
| 02 | `goToNextPart` | `done` / slug |
| 03 | `classTaskDone` | `done` / slug |
| 04 | `goToNextPart` | `done` / slug |
| 05 | `peakFinish` — component | `done` / slug |
| 05 | `peakFinish` — unit (pass only) | `done` / **`unit`** |
| 06 | `peakFinish` — component | `done` / slug |
| 06 | `peakFinish` — unit (both paths) | `done` / **`unit`** |
| 02/04/01 | item close via `xapiOnScreen` / `xapiFinishItems` | `doneItems` / `<slug>#<item>` |
| 05/06 | each graded answer | `doneQ` / `<slug>#<item>/<q>` |

## Verified: dark

| | |
|---|---|
| `RESUME_ENABLED` | false |
| `_unitState` | `null` — so `alreadySent` is false and `markSent` is a no-op |
| statement sequence in part 06 | **identical** to the Stage 4 verified output |
| `__dupes()` | empty |
| all five `checks.mjs` gates | green |
| console | clean |

## Verified: the ledger actually works

Exercised directly by giving it a live document (what Stage 5c will do):

| property | result |
|---|---|
| component `completed` sent once, repeat suppressed | ✓ |
| unit key `'unit'` independent of the component key | ✓ |
| item key namespaced `…-06#01` | ✓ sent once |
| **`doneQ` guard: graded answer sent once, repeat suppressed** | ✓ |
| during `_restoring`: **nothing sent AND nothing marked** | ✓ |
| with no document: **fails OPEN** — sends rather than drops | ✓ |

The last two are the ones that matter most and are easiest to get backwards. Marking during a restore
would permanently suppress a statement that never actually left. And a silent drop is far worse than a
duplicate, because every call site swallows exceptions — so an unavailable document must not be able
to lose a real `completed`.

## Verified: `?resetState`

It matters more here than in the sibling. After a failed מועד א the document names part 06, so every
subsequent launch — including every QA launch through the root `index.html` — hops straight to the
retake, forever. This is the only way out.

| | |
|---|---|
| ledger and payloads cleared | ✓ `done: []`, `parts: []` |
| clean document persisted | ✓ |
| **strips itself from the URL** | ✓ `?…&resetState&keep=1` → `?…&keep=1` |
| other params preserved | ✓ `xapiLib` and `keep=1` survive |

The self-strip is load-bearing: every cross-part navigation copies `window.location.search` verbatim,
so left in place it would re-fire on arrival in the next component and wipe the document on every hop
— resume would never work at all. With six parts that is five chances to get it wrong.

## Note for Stage 5c

The item `completed` statements visible in a pure-navigation sweep are an artefact of the local stub,
which does not emulate the library's `expectsAnswer` deferral. On the real platform an item
`completed` carrying `expectsAnswer` is **held until that item has produced an `answered`**, so
walking through screens without answering will not emit them. Do not read the stub's sweep as the
on-platform statement set.
