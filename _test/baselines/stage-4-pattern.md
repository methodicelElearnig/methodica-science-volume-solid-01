# Stage 4 — the per-part pattern, established on component 02

Part 02 first because it is the simplest complete case: 8 screens, 6 single-question items, one SCQ
template, one exit route. Everything below is the template for the other five.

## The five edits, in order

### 1. Per-part id seams (new)

```js
var XAPI_COMP_SLUG = 'methodica-science-volume-solid-01-02';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';   // trailing slash: matches metadata
var XAPI_EVAL_ITEMS = { '01':1, '02':1, '03':1, '04':1, '05':1, '06':1 };
```

Without the first two, `xapiItemId()` throws a `ReferenceError` **into the try/catch that protects the
learner**, and the whole item layer goes silent with no error. `_xapiSeamsReady()` now warns once per
load instead — but only the seams actually fix it.

### 2. `SCREEN_TO_SUBCONTENT` — every screen, 2-digit suffixes

Was `{1:['01',1] … 6:['06',1]}` — screens **0 and 7 were missing**, so a problem report filed from the
intro or the sb98 mid-transition went out with an empty item. Now all 8, with `null` where a screen
genuinely belongs to no catalog item. Guarded by `checks.mjs` gate 5.

### 3. Question ids resolved at SEND time, not registration time

This is the load-bearing design decision. `registerPractice()` runs while the page is still parsing;
`xapiQ()` reads `window.METADATA`, which the library fetches **asynchronously**. So the config carries
only the item suffix, and the IRI is resolved inside the send:

```js
// config
registerPractice(0, { correctId: 'b', item: '01', popups: {…} });

// scqCheck
const q = xapiQ(cfg.item, cfg.qKey || 'q1');
xapiSend(verb, 'question',
  { response: xapiAnswerText(document.querySelector('#'+screen+' .scq-opt[data-id="'+s.sel+'"]')),
    success: !!correct, score: { scaled: correct ? 1 : 0 } },
  { questionId: q.questionId, parentId: q.parentId });
```

That one call fixes three defects at once: the **wrong IRI** (the old literal omitted the component
segment), the **missing `parent`** (v2.4 §2, mandatory), and the **missing `response`**.

### 4. Score recorded outside the send

```js
if (correct || s.attempts >= cfg.maxAttempts) {
  XAPI_Q_RESULTS[cfg.item + '/' + (cfg.qKey || 'q1')] = !!correct;
}
```

Outside, because `xapiSend` swallows exceptions and the component score must not depend on whether
reporting succeeded. Only on the **closing** attempt, so first-wrong-then-right counts as correct.

### 5. Component `completed` with an explicit result

```js
try { xapiFinishItems(); } catch (e) {}        // close the open item FIRST, so ordering is sane
sendStatement720('completed', 'onlinelesson', { success: true, score: { scaled: practiceScore()/6 } });
```

Synchronous, not `xapiSend` — we navigate immediately afterwards and a deferred send would be lost on
unload. (It is also the rule from risk R1: never defer a `completed`.)

## Verified end to end

A full run — Q1, Q2 correct; **Q3 wrong twice**; Q4–Q6 correct — then `goToNextPart()`:

| Assertion | Result |
|---|---|
| item `initialized` on entering each item, with `isEvaluationItem` | ✓ |
| item `completed` when leaving for a different item | ✓ 6 total |
| interim `answered` on the first wrong attempt | ✓ `{response:"לבנה", success:false, scaled:0}` |
| `answered.last` on the closing attempt | ✓ 6 total |
| **every `answered` carries `parent`** | ✓ |
| **every `answered` carries `response`** | ✓ (visible option text) |
| question IRI nested correctly | ✓ `…-02/methodica-science-volume-solid-01-02-01/q1` |
| `XAPI_Q_RESULTS` | ✓ `{01:true, 02:true, 03:false, 04:true, 05:true, 06:true}` |
| component `completed` | ✓ **exactly one**, `{success:true, score:{scaled:0.8333}}` = 5/6 |
| statement ordering | ✓ `answered.last` → item `completed` → component `completed` → next part's `initialized` |
| duplicates (`__dupes()`) | ✓ none |
| `requested.1` on hint open | ✓ targets the question, no `parent` (v2.4 mandates it for answered only) |
| hint after answering | ✓ refused, no statement |
| console errors | none |

Item `completed` carries `result: null` on purpose: part 02's items hold one question each, so the
library's own all-correct AND is exactly right. Only a component whose items span several questions
needs `XAPI_ITEM_RESULT` — part 04 will.

## ⚠️ One judgement call needing content-owner confirmation

**Part 02 reports `success: true` unconditionally.** It is remediation: there is no pass threshold
anywhere in its code and it always proceeds to Part 03 whatever the learner scores. v2.4 leaves
`success` to "the content provider's own definition", so with no gate to clear, completing the
component *is* the success condition and `score.scaled` carries the performance (5/6 = 0.83 above).

The alternative is to invent a threshold — part 01 uses 4/5 = 80% — and report `success:false` below
it. I did not, because inventing a pedagogical gate is not a refactoring decision. **It is one line to
change** if the content owner wants one. Logged in the open-items list.

---

# Parts 03, 05, 06 — done

## Part 03 — the trivial case, with one non-obvious call

One screen, one item, one "חזרתי" button. `contentType` is `Task Inquiry or Project` and the markup
contains **no answer UI at all** — the work happens away from the computer.

- component `completed` = `{ success: true }`, **no score**. There is no numerator and no denominator
  to report, and a fabricated one would be worse than none. v2.4 asks for a score where the component
  contains `answered` interactions; this one has none.
- **`XAPI_EVAL_ITEMS = {}` — deliberately empty.** The metadata declares a `q1` on item 01, but it is
  answered on paper. Marking the item as an evaluation item would set `expectsAnswer` on its
  `completed`, which the library then **defers until an `answered` arrives for that item** — and none
  ever would, so the item `completed` would never be sent at all.

## Parts 05, 06 — the assessments, and three bugs found by running them

Both: 4 sub-parts = `q1`–`q4` of ONE item, single attempt, no per-part feedback, ≥3 of 4 to pass.

### Fixed as planned

| | |
|---|---|
| **R1** | the terminal `completed` moved out of `resetScreenState()` into a synchronous `peakFinish()`, called from `peakContinue()` only |
| part 05 hard-coded `success:true` | now `success: passed` |
| part 06 sent on **both** end screens | one send, on the branch that happened |
| part 05's failure path was silent | now reports its component `completed` — a failed מועד א was previously indistinguishable from a learner who never started |
| the unit `completed` existed nowhere in the unit | part 05 sends it **only on pass**; part 06 sends it on **both** paths (מועד ב is terminal — a learner who fails the final attempt has still finished the lomda) |
| `response` was the raw `'a'`/`'b'` data-id | now the option's visible text. Decisive evidence: the metadata's `answers` for these questions are the **full option strings**, so an id matched nothing |
| `success`/`score` were absent from `answered.last` | both present |
| `XAPI_ITEM_RESULT` | the ≥3/4 rule, because the library's aggregate is an all-correct AND — verified: at 3/4 the item reports `ok=true`, which the AND would have called `false` |

**R1 verified gone:** sweeping all 7 screens of part 06 now emits one item `initialized` and **no**
component `completed`. It previously emitted two contradictory ones (`success:true` and
`success:false`) from a single pass.

### Three bugs I introduced and then caught — all in statement ORDER

None of these would have been visible from reading the code.

1. **A deferred answer overtaken by a synchronous completion.** `peakContinue` sent the answer with
   `xapiSend` (deferred one macrotask) and then called `peakFinish` (synchronous, per R1). On the last
   sub-part both happen in the same click, so the log came out as
   `q1, q2, q3, item completed, component completed, unit completed, q4` — **q4's answer arrived after
   the assessment was closed.** Fixed by sending the peak answers synchronously; four sends in an
   assessment do not need deferring. (Part 02 is unaffected: its `onContinue` fires on a *later*
   click, so the macrotask has long flushed.)
2. **The item closed when the learner walked back to the intro.** Screen 0 was mapped to `null`, and
   `goBack()` allows 2 → 1 → 0, so returning to the intro after answering q1 emitted a **premature
   item `completed` with a partial score**. Worse, once the Stage 5a ledger lands that would mark the
   item done and *suppress the real one*. Fixed by mapping the intro to `['01', 0]` — page 0 of the
   item — so the item opens on entry and closes only in `peakFinish()`, by any route.
3. **A spurious item `initialized` after the item's own `completed`.** `peakFinish` ran before the
   navigation; `xapiFinishItems()` clears the current-item latch, and the score screen belongs to the
   same item, so the following `goTo()` re-opened it. Fixed by navigating **first**, then reporting —
   safe because `peakFinish` catches everything internally and cannot throw.

### Verified sequences

Part 06, 3 of 4 → **pass** (terminal, so the unit closes):

```
answered.last  06-01/q1  scaled=1 ok=true
answered.last  06-01/q2  scaled=1 ok=true
answered.last  06-01/q3  scaled=1 ok=true
answered.last  06-01/q4  scaled=0 ok=false
completed      06-01/    scaled=0.75 ok=true      ← XAPI_ITEM_RESULT: 3/4 passes
completed      component scaled=0.75 ok=true
completed      unit      scaled=0.75 ok=true
```

Part 05, 1 of 4 → **fail** (the learner goes on to מועד ב, so the unit stays open):

```
answered.last  05-01/q1  scaled=1 ok=true
answered.last  05-01/q2..q4  scaled=0 ok=false
completed      05-01/    scaled=0.25 ok=false
completed      component scaled=0.25 ok=false
                                                  ← no unit completed. Part 06 owns it.
```

`__dupes()` empty in both; every `answered` carries `parent` and `response`.

### Note for Stage 5a

Parts 05 and 06 both use item suffix `'01'`, distinguished only by `XAPI_COMP_ID`. The resume ledger
**must** namespace `doneItems` by part slug (`'<slug>#01'`), or מועד א and מועד ב cancel each other
out. Flagged in both files at the `PEAK_ITEM` declaration.

---

# Part 04 — done

Eight questions across five items, two of which span several questions, plus two scenario screens and
a combined result screen. The flow order is **not** screen order:
`0 → 1 → 2 → 3 → 9 → 4 → 5 → 10 → 6 → 7 → 8 → 11`.

### The mapping insight

The two scenario screens set up a question without asking one, so each belongs **inside** the item it
introduces — screen 9 is page 1 of item 04, screen 10 page 1 of item 05. That single choice is what
makes the item lifecycle come out right by itself:

| the learner reaches | and the item layer | because |
|---|---|---|
| screen 9 (Liyan's slime) | closes item 03, opens **04** | first screen of item 04 |
| screens 4, 5 (q1, q2) | emits nothing | same item |
| screen 10 (Gili's marbles) | closes **04**, opens **05** | and by now both of 04's questions are answered |
| screens 6, 7, 8 (silent q1–q3) | emits nothing | same item |
| screen 11 (combined verdict) | emits nothing | still item 05 |
| `goToNextPart()` | closes **05** | `xapiFinishItems()` |

The legacy `SCREEN_TO_SUB` it replaces was string-valued (no page), under a name nothing shared
reads, and covered only screens 1–8 — so a report filed from the intro, either scenario screen, or
the result screen carried an **empty item**.

### `XAPI_ITEM_RESULT` for the multi-question items

Items 04 (2 questions) and 05 (3 questions) supply their own result; items 01–03 hold one question
each, where the library's all-correct AND is already right, so they are deliberately absent.

Item 05's all-or-nothing `success` mirrors what the learner is actually shown — `SECTION_RESULT` has
exactly two states, `צדקת בכל הסעיפים` and `התשובה אינה נכונה במלואה`.

**Verified:** item 04 with q1 right and q2 wrong closes at `{success:false, score:{scaled:0.5}}`;
item 05 at 2 of 3 closes at `0.667`; the component then reports `{success:true, scaled:…/8}`. Nothing
fires on entering the result screen. `__dupes()` empty.

### ⚠️ Pre-existing finding, NOT changed: `scqReset` clears the attempt counter

Navigating away from a half-answered question and back runs `scqEnter` → `scqReset`, which sets
`attempts = 0`. Observed consequence: two interim `answered` statements for the same question and
**never an `answered.last`**, so that question is never closed in the record and never reaches
`XAPI_Q_RESULTS` — it silently counts as wrong in the item and component scores.

The normal path is fine (verified: two attempts without leaving the screen give interim →
`answered.last` → `XAPI_Q_RESULTS` written). This only bites a learner who leaves mid-question via
the progress dots or the back button.

Left alone deliberately: giving a returning learner a fresh attempt is defensible pedagogy, and
changing it is a content decision, not a reporting one. Two notes for later:

- **Stage 5b fixes it incidentally.** The capture → re-apply → repaint block in the shared `goTo()`
  exists precisely to undo what `resetScreenState` wipes, so restored `attempts` will survive
  navigation once resume lands.
- If the content owner would rather the attempt count persist without resume, that is a one-line
  change in `scqEnter`.

---

# Part 01 — done. Stage 4 complete.

33 screens, 9 items, 8 graded questions, a branching playlist, and every off-spec statement in the
unit. The map went from **4 entries with 3-digit suffixes that match nothing** to all 33.

### Item boundaries come from the metadata titles

The titles describe the pedagogy, and that resolved every ambiguity:

| item | type | title | screens |
|---|---|---|---|
| 01 | Motivational | `הוק: רוני מוצאת תליון על החוף` | 1–4 |
| 02 | Instruction | `הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים)` | 5–7, both branches, 12 |
| 03 / 04 | Practice | `חימום 1` / `חימום 2` | 18 / 19 |
| 05–09 | Practice | `סטנדרטי 1`–`5` | 13, 14, 15, 17, 16 |

**Item 02 spans ~19 screens on purpose** — its title names the playlist, so both the comic branch and
the experiments branch belong to it, which is also why it holds exactly one catalog question (q1, on
s10). It opens when the learner leaves the hook and closes when they leave the merge screen for
warm-up 1. Screens 0 (companion picker) and 32 (practice rules) map to `null`: neither is a catalog
item.

Page numbers follow flow order — not screen order, not DOM order — and are unique within an item, so
a bug report identifies the screen even where two branches cover the same item.

**Verified:** walking 0→7 emits `initialized 01-01/` → `completed 01-01/` → `initialized 01-02/ [eval]`
and nothing else. Item 01 correctly carries no `[eval]` marker; item 02 does.

### Off-spec statements, resolved

The unit's remaining conformance problems were all in this part.

**`selected` — v2.4 §4 defines a CLOSED dictionary** (`learning-type`, `practice-decision`,
`is-understood`, `is-repeat`, `external-learning`). Three sites claimed to be `selected`; exactly one
qualifies:

| site | was | now | why |
|---|---|---|---|
| s7 learning-path choice | `selected` / `learningType` | `selected` / **`learning-type`** | genuinely a learning-format preference. The camelCase form was not a dictionary value |
| s0 companion picker | `selected` / `learningType` | `interacted` / `companion-choice` | picking a mascot is not a learning type. REPORT-XAPI.md: an avatar picker is decoration. Reporting it as a `learning-type` selection would be false |
| s4 image reveal | `selected` / `why-measure-volume` | `interacted` / same category | not in the dictionary; the learner is revealing a reason, not stating a preference |

**`answered` on non-catalog interactions.** Five sites sent `answered.last` for things that are not
catalog questions — the hook's free-text screen and the displacement, flooding, guess and measurement
applets. v2.4 reserves `answered` for a question the component measures and makes
`contextActivities.parent` mandatory on every one; item 02 has exactly one question (q1, on s10), so
there was no item question to parent to and the statements were unmatchable as well as
non-conformant. All five are now `interacted`, keeping the analytics value honestly. (s10's aquarium
ruler already sent `interacted`.)

**Deleted:** the stray `completed` on the last comic screen — an item-level completion with no
`objectId`, so it targeted the *component* id and collided with the component's own `completed`. Now
that the comic screens are mapped, `xapiOnScreen` closes item 02 correctly.

**Kept, and flagged:** `experienced` per comic panel. Not in the 720 verb list, but the library falls
back to `http://adlnet.gov/expapi/verbs/experienced`, a real ADL verb, so the statement is valid — and
per-panel progress has analytics value the item pair cannot express. Same for `interacted`. Both are
off-spec-but-valid and belong on the platform question list, not in a unilateral deletion.

### Part 01 is the one component that reports a real `success` threshold

```js
const passed = practiceScore() >= 4;
sendStatement720('completed', 'onlinelesson', { success: passed, score: { scaled: practiceScore() / 5 } });
```

Different from parts 02 and 04 deliberately. They have **no gate** — they always advance, so
completing them is the success condition. Part 01 **has** one: ≥4/5 routes past remediation, and the
metadata's `recommendedAfterFail` names Part 02. So the gate is reported because it exists, not
invented.

**Denominator 5, not 8.** Eight questions are graded in code (item 02's check, two warm-ups, five
practice), but what the learner is promised is `4 מתוך 5` and five progress dots. Reporting 8 would
make the score mean something they were never shown.

**Verified:** 4 of 5 correct → `{success:true, score:{scaled:0.8}}` → routed to Part 03. Every
`answered` carries `parent` and `response`. `__dupes()` empty. Console clean.

---

# Stage 4 status: COMPLETE — all five gates green

```
1. identifier collisions       ok  (6/6 clean)
2. ?v= equality                ok  (9 shared URLs x 6 parts)
3. TOTAL_SCREENS vs markup     ok  (6/6)
4. metadata id resolution      ok  (23 items / 31 questions byte-for-byte, parents correct)
5. SCREEN_TO_SUBCONTENT        ok  (68/68 screens mapped across 6 parts)
```

## Open items for the content owner / platform

Not defects — decisions I deliberately did not make alone.

1. **`success:true` unconditionally in parts 02 and 04.** Confirmed by the user. One line each if a
   threshold is ever wanted.
2. **`experienced` and `interacted` are off-spec verbs**, though they resolve to real ADL IRIs. Nine
   sites. The platform should confirm they are acceptable, or say what to use instead.
3. **Should the applets be catalog items?** The displacement, flooding and measurement applets are
   substantial graded-feeling interactions with no metadata question, so they can only be reported as
   `interacted`. If they should be measurable, they need item questions in the metadata.
4. **`scqReset` clears the attempt counter on re-entry** (part 04 note above), so a learner who
   leaves a question mid-attempt and returns produces two interim `answered` and never an
   `answered.last`. Pre-existing; Stage 5b's repaint fixes it incidentally.
5. **The unit-scope `initialized` fires from parts 01 and 02**, preserved from the original. Whether
   exactly one component should open the unit is a platform-semantics question — the sibling unit left
   the same question open.
6. **The bare unit id** (`…/01/`) — logged separately; Kata's `uniqueKey` resolves to `"01"`.
