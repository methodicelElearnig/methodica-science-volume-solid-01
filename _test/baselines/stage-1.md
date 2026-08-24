# Stage 1 — `'use strict'` moved to line 1 in all six `js/main.js`

Date: 2026-08-10

## What changed

Nothing but the position of one directive per file. In all six parts `'use strict';` sat *after*
`var XAPI_ID_PREFIX = …` and `function shortId(…)`, which makes it an ordinary expression statement
rather than a directive prologue — so every part was running in **sloppy mode**.

| Part | directive was on line | now |
|---|---|---|
| 01 | 12 | 1 |
| 02 | 11 | 1 |
| 03 | 7 | 1 |
| 04 | 9 | 1 |
| 05 | 8 | 1 |
| 06 | 9 | 1 |

Done as its own commit because sloppy→strict can surface real breakage, and because it must land
before any resume code: `applyResumeVars` assigns through `eval(k + ' = st.vars[k];')`, and in
sloppy mode a name that is not actually in scope silently creates a **global** instead of throwing
into the swallowing `try/catch`. That turns "the learner's answers vanished" into "the learner's
answers came back subtly wrong", which is far harder to diagnose.

## Result: PASS — no strict-mode breakage

- `node --check` on all six: **syntax OK**. Strict mode makes several sloppy constructs *early*
  errors (duplicate parameter names, octal literals, `delete` of an unqualified name), so a clean
  parse under a line-1 directive rules those out statically.
- Sweep re-run on all six: **identical to `stage-0.json`** — same screen counts, same landings,
  same statements, same duplicates. Nothing regressed.
- Console: **no errors** on any part, including part 03.
- Interaction spot-check beyond the sweep (the sweep only drives `goTo`, not answer handlers):
  part 02 screen 1, select a wrong option → `scqCheck` → the interim `answered` fires correctly
  with `{success:false, score:{scaled:0}}` and `SCQ_REG.s1.attempts` increments to 1.

## Two defects captured live by that spot-check

The single statement it produced is a compact demonstration of defects 2 and 3:

```
answered
  q   = https://lomdot.education.gov.il/metodica/720active/science/volume-solid/01/
        methodica-science-volume-solid-01-02-01/q1
  par = null
  result = {"success":false,"score":{"scaled":0}}
```

1. **The question IRI is wrong (defect 2).** Metadata declares this question under
   `…/01/methodica-science-volume-solid-01-02/methodica-science-volume-solid-01-02-01/`, i.e. the
   item nests inside the component. The emitted id omits the component segment entirely. Every
   part builds ids this way, so no `answered` in the unit currently matches the catalog — which is
   consistent with the "שאלה לא נמצאה" the platform reported for the sibling unit.
2. **`context.contextActivities.parent` is absent (defect 3).** 720 v2.4 §2 makes it mandatory on
   every `answered`/`evaluated`.

Both are fixed in Stage 4 by routing every question through `xapiQ()`, which resolves the id from
`metadata/*.json` and returns `parentId` alongside it.
