# Stage 3 — library bump `xapi-720-f.js` → `xapi-720-i.js`

Date: 2026-08-10. `-f` is **deprecated**; `-i` is the production build (720 guidelines v2.4) and `-j`
is `-i` plus the State API transport that only resume uses.

## Integrity of the deployed copies

Fetched from `https://lomdot.education.gov.il/metodica/720active/common/` and compared to the local
masters in `2026/720-common-lib/`:

| File | Deployed | Local master | |
|---|---|---|---|
| `xapi-720-i.js` | `1390b7335361…` | `1390b7335361…` | **identical** |
| `xapi-720-j.js` | `e9e154ddad44…` | `e9e154ddad44…` | **identical** |
| `xapi-720-f.js` | 15,263 bytes | *absent* | deployed copy is the only source |

So the library this unit is moving **to** is exactly what has been reviewed locally. `-f` has no local
master, which is itself a reason to leave it behind.

## The blocking question: does `-i` change the shape of any id?

**No.** This was the gate, because `-f` is a fork of `-e` whose entire purpose was to let absolute-URL
ids through verbatim; if `-i` had reached v2.4 by a different route it could have reintroduced
prefixing, and every id in this unit would have changed.

The `baseId` expression is character-for-character the same, and `-i` says so in its own comment:

```js
// -f  (line 296)
var baseId = isAbsoluteId(idSeg) ? idSeg : (window.location.origin + unitPath + (idSeg || ''));

// -i  (line 431-432)  — "-f behavior preserved: absolute-URL idSeg used verbatim; else origin + path + id."
var baseId = isAbsoluteId(idSeg) ? idSeg : (window.location.origin + unitPath + (idSeg || ''));
```

And the question-id branch is likewise identical:

```js
// both: an absolute questionId is the full question IRI; a short one keeps base + "/questions/" + id
objectId = isAbsoluteId(qid) ? qid : (baseId + "/questions/" + qid);
```

`isAbsoluteId` is the same function (`/^https?:\/\//`) in both. This unit passes absolute IRIs
everywhere, so the verbatim branch is the live one before and after. **No id changes shape.**

`sendStatement720` is a top-level `function` declaration in **both** (`-f:240`, `-i:377`). That matters
for Stage 5: `applyExecutionState()` suppresses replayed statements by swapping
`window.sendStatement720` for a no-op, which only works because the declaration creates a writable
window property. Re-check this on every future library bump — if it ever becomes `const`/`let`, the
swap fails silently and resume re-reports everything.

The `.last` / `.1` suffix convention (`'answered.last'`, `'requested.1'`) is honoured in both: each
splits `sttmRowType` on `.` to recover the base verb.

## What DOES change

| # | Change | Effect on this unit |
|---|---|---|
| 1 | **`XAPI_DISABLED`** — new. With no valid `?slxapi`, reporting is disabled and every send is a silent no-op, instead of `-f`'s fall back to a placeholder LRS with retries. | Removes the reason the six localhost guards existed. See below. |
| 2 | **`context.registration`** — new. The launch `?registration` is attached to every statement. | Required by Kata, which ties tracking and state to it. Pure gain. |
| 3 | **`sttmContext.objectId`** — new. Lets the caller target an ITEM object id. | This is what makes item-level `initialized`/`completed` possible at all; `-f` ignored it. `XAPI_USING_G` turns true and the item layer wakes up. |
| 4 | **`contextActivities.parent`** on `answered`/`evaluated` — new, and **mandatory** per v2.4 §2. `-i` `console.warn`s when the caller omits `parentId`. | ⚠️ Until Stage 4 wires `xapiQ()`, every `answered` in the unit will log that warning. **Expected and wanted** — it is the loud signal that the parent is still missing. |
| 5 | **Verb IRIs via `VERB_IRIS`.** `-f` built every verb as `http://adlnet.gov/expapi/verbs/<verb>`. `-i` maps `selected` → `w3id.org/xapi/adb`, `requested` → `w3id.org/xapi/acrossx`, and adds `played`/`paused` → `w3id.org/xapi/video`. | The verb IRI for `selected` and `requested` **changes**. This is the spec change, not a regression — the new values are the ones in "דוגמאות XAPI". |
| 6 | **`requested` now targets the QUESTION object.** `-i` adds `requested` to the branch that uses `questionId`; in `-f` only `answered`/`selected` did, so a hint reported the component id. | Every `requested.1` hint statement's `object.id` moves from the component to the question. Intended per v2.4; flagged to the platform as item C5. |
| 7 | **`object.definition` dropped** — `-i` emits the spec-minimal `{ id }`; `-f` added `name`/`description`/`type`. | Statements get smaller. Documented default pending platform confirmation (C2). |
| 8 | **`urn:720` extensions dropped** from `answered` in favour of `response` + `success` + `score.scaled`. | This unit never sent them. No effect. |
| 9 | **`completed` deduped per object id** for one page load (`xapiCompletedObjects`), and an item-level `completed` carrying `expectsAnswer` is deferred until that item has produced an `answered`. | Partly covers part 06's double `completed` — but only within a single page load, which is why the Stage 5a ledger is still needed for reloads and back-navigation. |
| 10 | **`X-Experience-API-Version: 1.0.3`** set on every request (the ADL wrapper defaulted to 1.0.1). | Conformance fix, no code impact. |

## Consequence: the localhost restriction can now be relaxed

`unit-js/50-loader.js` deliberately loaded **no** library off-platform unless `?xapiLib` named one,
because `-f` had no `XAPI_DISABLED` path and would storm retries against a placeholder endpoint.
Change #1 removes that hazard: `-i` and `-j` disable themselves when `?slxapi` is absent.

So the loader now always loads the real library, and the gain is concrete — a local run gets real
`window.METADATA`, which means `xapiQ()` resolves and the bug-report form posts real ids **without**
`?xapiLib` and without hand-stubbing. `?xapiLib` remains, for the statement log and the State API stub.

If the CDN is unreachable (offline), `loadScript`'s `onerror` still calls back and the subsequent
`getXAPIParameters` reference fails into the surrounding `try`, logging `[xAPI] load` once. Degraded
but visible, and the lomda itself is unaffected.

## Expected sweep delta

Not a pure move — this is the stage where the item layer switches on. Against
`baselines/stage-0.json`, expect:

- `XAPI_USING_G` becomes **true**
- one `[xAPI] item layer inactive: XAPI_COMP_ID / XAPI_COMP_SLUG not declared…` warning per part,
  until Stage 4 authors the seams (parts 01/02/04 have `SCREEN_TO_SUBCONTENT`, but no component id yet)
- no new statements yet, for that same reason
- off-platform, `XAPI_DISABLED` is true, so every send is a no-op regardless

Anything else is a defect.

---

## Result: PASS

`unit-js/50-loader.js` now requests `xapi-720-i.js` (and `-j` once `RESUME_ENABLED`). Verified in all
six components against the real CDN:

| Check | Result |
|---|---|
| library loaded | `…/common/xapi-720-i.js` ✓ |
| `XAPI_USING_G` | **true** — item layer awake |
| `XAPI_DISABLED` (no `?slxapi`) | **true** — the protection that permitted relaxing the localhost guard |
| statements actually sent off-platform | **none** — confirmed via `performance.getEntriesByType('resource')`: answering a question issues no `/statements` request |
| `X-Experience-API-Version` | `1.0.3` ✓ |
| `window.METADATA` resolved | ✓ all six (6 items in part 02, etc.) |
| `window.UNIT_METADATA` | ✓ |
| sweeps vs `stage-0.json` | **identical** in all six — same statements, same landings, no new item statements (seams pending) |
| console errors | none |

**`sendStatement720` is a writable window property — verified empirically**, not just by reading the
declaration: reassigning it and restoring it succeeds. That is the precondition for
`applyExecutionState()`'s no-op swap in Stage 5, and it is the check to repeat on every future bump.

### The promise race, confirmed in the wild

The library's own console output shows exactly the hazard `settleMetadata()` was written for:

```
[XAPI Parameters] Not found in URL, xAPI reporting disabled.
[window.METADATA] {[[PromiseState]]: pending, [[PromiseResult]]: undefined}   ← the promise
[Metadata] Loaded successfully: {id: …-01-02/, title: תרגול בסיסי + סטנדרטי ב, …}   ← resolved after
```

`jsXAPI_MetadataReady` is set by the *disabled* branch before `loadMetadata` resolves, so without
`settleMetadata()` anything reading `.subContent` at that moment gets `undefined`. Now handled.

### What the relaxation bought, concretely

With no `?xapiLib` and nothing hand-stubbed, a local run now produces a working bug report:

| field | value |
|---|---|
| unit | `01` *(the bare-unit-id known issue)* |
| component | `methodica-science-volume-solid-01-02` |
| item | `methodica-science-volume-solid-01-02-02` |
| page | `1` |

and `xapiQ('04','q1')` resolves to
`…/methodica-science-volume-solid-01-02/methodica-science-volume-solid-01-02-04/q1` with a `parentId`
that matches `metadata.subContent[].id`. None of that was observable on a dev server before.

### The expected warning is present, in all six

```
[xAPI] item layer inactive: XAPI_COMP_ID / XAPI_COMP_SLUG not declared in this component.
       Item-level initialized/completed will not be sent. (Authored in Stage 4.)
```

This is the whole point of Stage 4: the item layer is now awake and waiting for per-part ids.

### Note for whoever runs the sweep next

Part 01's sweep now takes long enough to exceed a 30-second tool timeout — 33 screens, each with a
macrotask tick, a `video.pause()`, and screen 1 re-triggering `video.play()`, on top of the real CDN
script loads. It **completes** (it ends on `s32`); if the call times out, read `__stmts()` and
`__dupes()` afterwards rather than re-running it.
