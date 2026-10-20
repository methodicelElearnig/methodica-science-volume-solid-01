# Metadata audit — `metadata/*.json` vs the UI (xAPI readiness)

Audited 2026-10-20 against the seven parts' `index.html` + `js/main.js`, after the
metadata was rewritten to the MOE 2.7 schema (bare unit slug, `cognitiveLevels`,
`masteryLevel: null`, `targetSectors`, absolute question IRIs). The UI is the truth: Kata
compares `answered.result.response` to the metadata's `answers` / `correctAnswers` per the
xAPI interaction-type formats, so question types and answer strings must match what the
learner sees byte for byte.

The audit itself changed nothing; **one metadata change was then made on the content
owner's instruction** (E1 below, logged in §1a). Everything else is a finding.

Validator: `python -I -X utf8 docs-and-tools/check-metadata.py` (exit 0 when clean). It
re-reads the UI on every run, so re-run it after any change to a question screen or to
`metadata/`. Ported from `methodica-science-body-matter-01` and re-pointed at this unit's
shapes (see the docstring at the top of the script).

## Rules applied

| rule | what it says |
|---|---|
| R1 | the most specific Kata `questionType` wins (`fill-in, true-false, choice, numeric, sequencing, matching, performance, other`); MOE v2.7: `performance` only for 2+ typed inputs forming one answer in one sub-question |
| R2 | a one-word dropdown with a closed list (01 `s29`, 03 `s3`) is a single `choice`, not `matching`: `answers` = the `.dropdown-opt` texts in DOM order |
| R3 | drag-to-target matching (01 `s28`, 02 `s4` — `ddqRegister` / `registerPracticeDnD`, board rendered by `ddqRender()`): `source` = the `items[].label` in config order (= bank DOM order), `target` = the `targets[].label` in config order (= DOM order), pairs from `correctMap` |
| R4 | *(no drag-word-into-slot screens in this unit)* |
| R5 | `choice`: `answers` = visible option texts in DOM order, `<b>` stripped (`.scq-opt-text`; a hotspot `<button class="scq-opt hotspot-area">` with no text → its `aria-label`, 03 `s6`; an image hotspot whose ring and bubble share a `data-id` → the bubble text, 02 `s3`); `correctAnswers` from `correctId` / `PEAK_CORRECT` |
| R6 | ungraded interactions are not questions: 01 `s2` free text, 01 `s4` image multi-select hook, the guess screens 01 `s10`/`s12`/`s16`/`s19`, part 04's class task |
| R7 | hygiene: every string NFC, trimmed, single-spaced, no `[,]` `[.]` `[:]`; `correctAnswers ⊆ answers` byte for byte; sources / targets / answers unique; `questionId` = item id + `qKey` |
| R8 | census: registered graded questions == check buttons wired in `index.html` == questions declared in `metadata/` (expected 30), each on a screen whose `SCREEN_TO_SUBCONTENT` row names the same item |

**UI text** is what `unit-js/20-xapi.js` `xapiAnswerText()` reads: every `<br>` replaced by
a space (since 2026-10-20; plain `textContent` would glue `מים,<br />ונפח` into one word),
then `textContent` of the option, entities decoded, whitespace incl. U+00A0 collapsed to
one space, trimmed. At send time `_xapiPick()` normalises both
sides once more (NFC, `׳ ’ ʼ` → `'`) before looking the text up in the metadata, so a
difference that survives that normalisation makes the `response` fall back to the raw UI
text and **never match the catalogue**.

## 1. Findings (first run: 1 error, 2 warnings, 6 notes — now 0 errors, 0 warnings)

### 1a. Changes made

| when | file | item / field | before | after | why |
|---|---|---|---|---|---|
| 2026-10-20 | `metadata/methodica-science-volume-solid-01-05.json` | `05-01/q1` → `correctAnswers[0]` (line 42) | `"יעל צודקת. הניסוי מודד רק מים וכדי לקבל ראיה מדעית תקפה לנפח הטבעת חייבים להשתמש בנוסחה מתמטית ולא בניסוי אמפירי"` | `"המים שעלו הם ראיה ישירה לכך שהטבעת תופסת מקום במרחב, ולכן נפח המים שנדחקו מעלה שווה בדיוק לנפח הטבעת"` | E1 — the UI's `correctId: 'a'` is the "המים שעלו" option; the metadata had named the first option in DOM order. Requested by the content owner after the audit. One line changed, formatting (2-space indent, CRLF, UTF-8 without BOM) preserved; validator re-run → `0 error(s)`. |
| 2026-10-20 | `metadata/methodica-science-volume-solid-01-01.json` | `01-03/q1` → `correctAnswers` (lines 82–103, order only) | pairs listed cup, cube, melon, shell, doll (`answers.target` order) | melon, doll, shell, cube, cup (`answers.source` order) | W1 — `xapiMatchingResponse()` emits `S[.]T` pairs in `answers.source` order; whether Kata compares pairs as a set is unverified, so the metadata now follows the order the response layer was written against (the reference unit's convention). Same five pairs, no string changed, byte length unchanged. |
| 2026-10-20 | `metadata/methodica-science-volume-solid-01-02.json` | `02-04/q1` → `correctAnswers` (lines 116–129, order only) | cube, shell, goblet (`answers.target` order) | shell, goblet, cube (`answers.source` order) | W2 — same as W1. Validator re-run → `0 error(s), 0 warning(s)`. |

### ERROR — the strings differ (E1 fixed, see §1a)

| # | screen | metadata | UI | what differs |
|---|---|---|---|---|
| E1 | 05 `s1` (item `05-01` / `q1`) | [`methodica-science-volume-solid-01-05.json:41-43`](../metadata/methodica-science-volume-solid-01-05.json) `correctAnswers` = `"יעל צודקת. הניסוי מודד רק מים וכדי לקבל ראיה מדעית תקפה לנפח הטבעת חייבים להשתמש בנוסחה מתמטית ולא בניסוי אמפירי"` | [`methodica-science-volume-solid-01-05/js/main.js:377`](../methodica-science-volume-solid-01-05/js/main.js) `correctId: 'a'` → [`index.html:63`](../methodica-science-volume-solid-01-05/index.html) `"המים שעלו הם ראיה ישירה לכך שהטבעת תופסת מקום במרחב, ולכן נפח המים שנדחקו מעלה שווה בדיוק לנפח הטבעת"` | **the metadata names the wrong option as correct.** The screen's options were re-ordered to the deck (slide 114) with the comment "each data-id keeps its own text, so correctId stays 'a'"; the metadata took the *first* option (data-id `b`, "יעל צודקת…") instead. The item's own `informationToBot` (line 27) says "יעל טועה". The four `answers` strings and their DOM order are correct. |

E1 was a content error: a learner who answered correctly would have been recorded as wrong,
and vice versa, in the catalogue's view of 05/q1. **Fixed 2026-10-20** (§1a); the row above
is the first-run state.

**Resolved the same day, kept for the record:** 07 `s4` (item `07-01` / `q4`) wraps all
four options with a `<br />` that has no whitespace on either side
([`index.html:119-122`](../methodica-science-volume-solid-01-07/index.html): `סמ"ק</span>,<br />משום`,
`גוף<br />שמכניסים`, `מים,<br />ונפח`). Plain `textContent` has no character there, so the
first run of this validator reported the four `answers` and the `correctAnswers` of 07/q4
one space short of [`…-07.json:78-84`](../metadata/methodica-science-volume-solid-01-07.json).
The main session's response layer found the same thing on its first stub walk and
`xapiAnswerText()` now replaces every `<br>` with a space before reading; the validator
mirrors that rule and the strings are equal. The dependency is still noted (below) because
it is invisible in the HTML.

### WARN — same pairs, different order (W1, W2 fixed, see §1a)

| # | screen | metadata | UI | what differs |
|---|---|---|---|---|
| W1 | 01 `s28` (item `01-03` / `q1`, matching) | [`…-01.json:82-103`](../metadata/methodica-science-volume-solid-01-01.json) `correctAnswers` listed cup, cube, melon, shell, doll (= `targets` order) | [`…-01/js/main.js:2070-2083`](../methodica-science-volume-solid-01-01/js/main.js) `items` order melon, doll, shell, cube, cup; `correctMap` | the five pairs are identical as a set; the metadata lists them in `answers.target` order while `xapiMatchingResponse()` emits `S[.]T` pairs in `answers.source` order. Whether Kata's comparison is order-sensitive is **not verified**; the reference unit keeps `correctAnswers` in `answers.source` order, which is the safe choice. |
| W2 | 02 `s4` (item `02-04` / `q1`, matching) | [`…-02.json:116-129`](../metadata/methodica-science-volume-solid-01-02.json) cube, shell, goblet (= `targets` order) | [`…-02/js/main.js:931-937`](../methodica-science-volume-solid-01-02/js/main.js) `items` shell, goblet, cube | same as W1 |

### NOTE — informational, nothing to fix for matching to work

- 01 `s28` `items[].label` `'מה המסה של האבטיח?'` and `'כמה מים יש בכוס?'` (`main.js:2070`, `2074`)
  carry a non-breaking space that `xapiAnswerText()` collapses to a plain space; the metadata
  stores the plain-space form and the two resolve to each other. Not byte-identical in the
  source, identical after the runtime's own normalisation.
- 07 `s4`: the four `<br />` joins described above, one note per option (`c`, `b`, `a`,
  `d`) — equal to the metadata only because `xapiAnswerText()` turns `<br>` into a space.

### xAPI delimiters

**No metadata string contains `[,]`, `[.]` or `[:]`** — not in any `answers`,
`correctAnswers`, `source`/`target`, and not in any `questionText` (checked as a warning
since Kata does not compare it). R7 is otherwise clean: every string NFC, trimmed,
single-spaced, unique; every `correctAnswers` entry is in its `answers`; every
`questionId` equals its item id + `qN`; all 30 `questionType`s are `choice` (28) or
`matching` (2).

### Verified byte-identical (30 of 30 questions after §1a; 29 on the first run)

| screen(s) | what was compared |
|---|---|
| 01 `s15` | 4 `.scq-opt-text` (`100 סמ"ק` … `1,000 סמ"ק`); `correctId: 'd'` |
| 01 `s29` | 4 `.dropdown-opt` (`עלו`, `ירדו`, `נעלמו`, `התקררו`); `correctId: 'a'` |
| 01 `s28`, 02 `s4` | `items` / `targets` labels and `correctMap` — strings, pairs and (after §1a) pair order |
| 02 `s1`, `s2`, `s5` | 4 options each; `correctId` `'c'` / `'a'` / `'d'` |
| 02 `s3` | image hotspot: 4 `.hotspot-bubble` texts in DOM order (`d, b, c, a`), the text-less `.hotspot-area` rings sharing each `data-id` ignored; `correctId: 'd'` |
| 03 `s1`, `s2`, `s4`, `s7` | 2–4 options; `correctId` `'b'` / `'b'` / `'b'` / `'a'`; `<span class="nobr">` stripped |
| 03 `s3` | 4 `.dropdown-opt` (`סרגל`, `משורה`, `מאזניים`, `משקולת`); `correctId: 'b'` |
| 03 `s6` | 3 `.hotspot-area` `aria-label`s in DOM order (`c, b, a`); `correctId: 'b'` → `"אזור העלייה — התוספת שמעל המפלס המקורי"` |
| 05 `s1`–`s8` | 4 options each (`s1` DOM order `b, a, c, d`, `s7` `b, d, a, c`); `correctId` per `registerPractice` (`s1` after §1a) |
| 06 `s1`–`s4` | 4 `.peak-opt` each, `<b>שם:</b>` prefixes stripped to `שם: …`; `PEAK_CORRECT = {1:'b', 2:'a', 3:'a', 4:'b'}` |
| 07 `s1`–`s4` | 4 `.peak-opt` each (`s2` DOM order `b, c, d, a`, `s4` `c, b, a, d` with `<br />` → space); `PEAK_CORRECT = {1:'a', 2:'a', 3:'b', 4:'a'}` |

### Routing (not audited, read only)

- `03.recommendedAfterFail` → component 02 (full IRI): the only link in the unit; the dry
  run sends it as a second-pass PATCH.
- `06.recommendedAfterFail` is `[]` on purpose for now (the code routes 06 → 07 itself;
  see [ROUTING-AND-RETAKE.md](ROUTING-AND-RETAKE.md)); 01, 02, 04, 05, 07 empty.

## 2. Screen → item mapping (all 7 parts, every screen)

Built by the validator from each part's `var SCREEN_TO_SUBCONTENT = {…}` (item + page,
with the row's own comment as the label) and from the question registrations
(`scqRegister`, `registerPractice`, `ddqRegister`, `registerPracticeDnD`, `PEAK_CORRECT`).
`data-screen` is the 0-based index in `index.html`; in part 05 the index order is not the
flow order (0 → 1 → 2 → 3 → 10 → 4 → 5 → 9 → 6 → 7 → 8). `graded?` = a check button
(`scqCheck` / `ddqCheck` / `peakCheck`) is wired on the screen *and* a question is
registered for it.

| part | data-screen | screen id | item | page | qKey | questionType | graded? | check | screen |
|---|---|---|---|---|---|---|---|---|---|
| 01 | 0 | s0 | null | — | — | — | no | — | companion picker — decoration, not learning content |
| 01 | 1 | s1 | 01 | 1 | — | — | no | — | רוני מצאה אוצר? |
| 01 | 2 | s2 | 01 | 2 | — | — | no | — | open question (free text) |
| 01 | 3 | s3 | 01 | 3 | — | — | no | — | the pendant |
| 01 | 4 | s4 | 01 | 4 | — | — | no | — | למה חשוב למדוד נפח של חפץ מוצק? |
| 01 | 5 | s5 | 02 | 1 | — | — | no | — | Archimedes intro |
| 01 | 6 | s6 | 02 | 2 | — | — | no | — |  |
| 01 | 7 | s7 | 02 | 3 | — | — | no | — | איך נמדוד נפח של מוצק? — the playlist choice |
| 01 | 8 | s8 | 02 | 4 | — | — | no | — |  |
| 01 | 9 | s9 | 02 | 5 | — | — | no | — | the cube — moved before the guess-Q (QA 2026-10-08); pages follow flow order |
| 01 | 10 | s10 | 02 | 6 | — | — | no | — |  |
| 01 | 11 | s11 | 02 | 7 | — | — | no | — |  |
| 01 | 12 | s12 | 02 | 8 | — | — | no | — |  |
| 01 | 13 | s13 | 02 | 9 | — | — | no | — |  |
| 01 | 14 | s14 | 02 | 10 | — | — | no | — |  |
| 01 | 15 | s15 | 02 | 11 | q1 | choice | yes | scqCheck('s15') | aquarium ruler + the item's ONLY catalog question (q1) |
| 01 | 16 | s16 | 02 | 12 | — | — | no | — | guess (sb24) |
| 01 | 17 | s17 | 02 | 13 | — | — | no | — | displacement applet (sb25) |
| 01 | 18 | s18 | 02 | 14 | — | — | no | — | displacement result (sb26) — split out of the applet 2026-08-29 |
| 01 | 19 | s19 | 02 | 15 | — | — | no | — | guess |
| 01 | 20 | s20 | 02 | 16 | — | — | no | — | flooding applet (sb28) |
| 01 | 21 | s21 | 02 | 17 | — | — | no | — | flooding result (sb29) — split out of the applet |
| 01 | 22 | s22 | 02 | 18 | — | — | no | — | flip cards — real-world uses |
| 01 | 23 | s23 | 02 | 19 | — | — | no | — | measurement applet — steps 1-2 (sb33-35) |
| 01 | 24 | s24 | 02 | 20 | — | — | no | — | measurement applet — steps 3-4 (sb36-38) |
| 01 | 25 | s25 | 02 | 21 | — | — | no | — | overflow can — the question |
| 01 | 26 | s26 | 02 | 22 | — | — | no | — | overflow can — how it works |
| 01 | 27 | s27 | 02 | 23 | — | — | no | — | מה נשאר לנו בראש? — warm-up intro |
| 01 | 28 | s28 | 03 | 1 | q1 | matching | yes | ddqCheck('s28') | חימום 1 — matching (DnD) |
| 01 | 29 | s29 | 04 | 1 | q1 | choice | yes | scqCheck('s29') | חימום 2 — dropdown |
| 02 | 0 | s0 | null | — | — | — | no | — | אפשר להתחיל! — practice rules (sb50); belongs to no catalog item |
| 02 | 1 | s1 | 01 | 1 | q1 | choice | yes | scqCheck('s1') | סטנדרטי 1 |
| 02 | 2 | s2 | 02 | 1 | q1 | choice | yes | scqCheck('s2') | סטנדרטי 2 |
| 02 | 3 | s3 | 03 | 1 | q1 | choice | yes | scqCheck('s3') | סטנדרטי 3 |
| 02 | 4 | s4 | 04 | 1 | q1 | matching | yes | ddqCheck('s4') | סטנדרטי 4 — matching |
| 02 | 5 | s5 | 05 | 1 | q1 | choice | yes | scqCheck('s5') | סטנדרטי 5 |
| 03 | 0 | s0 | null | — | — | — | no | — | intro (sb77) |
| 03 | 1 | s1 | 01 | 1 | q1 | choice | yes | scqCheck('s1') | basic 1 — non-geometric body |
| 03 | 2 | s2 | 02 | 1 | q1 | choice | yes | scqCheck('s2') | basic 2 — who is right |
| 03 | 3 | s3 | 03 | 1 | q1 | choice | yes | scqCheck('s3') | basic 3 — which tool |
| 03 | 4 | s4 | 04 | 1 | q1 | choice | yes | scqCheck('s4') | basic 4 — flooding 760 |
| 03 | 5 | s5 | null | — | — | — | no | — | sb98 mid transition — sits between Q4 and Q5, belongs to no item |
| 03 | 6 | s6 | 05 | 1 | q1 | choice | yes | scqCheck('s6') | standard-ב 1 — rise area |
| 03 | 7 | s7 | 06 | 1 | q1 | choice | yes | scqCheck('s7') | standard-ב 2 — single bead |
| 04 | 0 | s0 | null | — | — | — | no | — | opener (TransitionScreen) |
| 04 | 1 | s1 | 01 | 1 | — | — | no | — | the class task itself (sb110) |
| 05 | 0 | s0 | null | — | — | — | no | — | intro |
| 05 | 1 | s1 | 01 | 1 | q1 | choice | yes | scqCheck('s1') | Q1 — the ring |
| 05 | 2 | s2 | 02 | 1 | q1 | choice | yes | scqCheck('s2') | Q2 — lentils |
| 05 | 3 | s3 | 03 | 1 | q1 | choice | yes | scqCheck('s3') | Q3 — reliability |
| 05 | 4 | s4 | 04 | 2 | q1 | choice | yes | scqCheck('s4') | Q4 = item 04 / q1 |
| 05 | 5 | s5 | 04 | 3 | q2 | choice | yes | scqCheck('s5') | Q5 = item 04 / q2 |
| 05 | 6 | s6 | 05 | 2 | q1 | choice | yes | scqCheck('s6') | Q6 = item 05 / q1 |
| 05 | 7 | s7 | 05 | 3 | q2 | choice | yes | scqCheck('s7') | Q7 = item 05 / q2 |
| 05 | 8 | s8 | 05 | 4 | q3 | choice | yes | scqCheck('s8') | Q8 = item 05 / q3 |
| 05 | 9 | s9 | 05 | 1 | — | — | no | — | sb140 Gili's marbles — narrative opening of item 05 |
| 05 | 10 | s10 | 04 | 1 | — | — | no | — | sb129 Liyan's slime — narrative opening of item 04 |
| 06 | 0 | s0 | 01 | 0 | — | — | no | — | intro |
| 06 | 1 | s1 | 01 | 1 | q1 | choice | yes | peakCheck(1) | sub-part 1 |
| 06 | 2 | s2 | 01 | 2 | q2 | choice | yes | peakCheck(2) | sub-part 2 |
| 06 | 3 | s3 | 01 | 3 | q3 | choice | yes | peakCheck(3) | sub-part 3 |
| 06 | 4 | s4 | 01 | 4 | q4 | choice | yes | peakCheck(4) | sub-part 4 |
| 06 | 5 | s5 | 01 | 0 | — | — | no | — | scenario |
| 07 | 0 | s0 | 01 | 0 | — | — | no | — | intro |
| 07 | 1 | s1 | 01 | 1 | q1 | choice | yes | peakCheck(1) | sub-part 1 |
| 07 | 2 | s2 | 01 | 2 | q2 | choice | yes | peakCheck(2) | sub-part 2 |
| 07 | 3 | s3 | 01 | 3 | q3 | choice | yes | peakCheck(3) | sub-part 3 |
| 07 | 4 | s4 | 01 | 4 | q4 | choice | yes | peakCheck(4) | sub-part 4 |
| 07 | 5 | s5 | 01 | 0 | — | — | no | — | scenario |

Part-level gates (not questions): 02 `s0` and 03 `s0` announce "4 of 5" to progress; 06
passes at 3 of 4 (`PEAK_PASS = 3`), 07 at 4 of 4 (`PEAK_PASS = 4`) and ends the unit.

## 3. Census (`check-metadata.py`, 2026-10-20)

```
CENSUS  graded screens (UI): 30   declared questions (metadata): 30   expected: 30
        part 01: 3 graded screens [s15:scqCheck('s15'), s28:ddqCheck('s28'), s29:scqCheck('s29')]  /  3 metadata questions
        part 02: 5 graded screens [s1:scqCheck('s1'), s2:scqCheck('s2'), s3:scqCheck('s3'), s4:ddqCheck('s4'), s5:scqCheck('s5')]  /  5 metadata questions
        part 03: 6 graded screens [s1:scqCheck('s1'), s2:scqCheck('s2'), s3:scqCheck('s3'), s4:scqCheck('s4'), s6:scqCheck('s6'), s7:scqCheck('s7')]  /  6 metadata questions
        part 04: 0 graded screens []  /  0 metadata questions
        part 05: 8 graded screens [s1:scqCheck('s1'), s2:scqCheck('s2'), s3:scqCheck('s3'), s4:scqCheck('s4'), s5:scqCheck('s5'), s6:scqCheck('s6'), s7:scqCheck('s7'), s8:scqCheck('s8')]  /  8 metadata questions
        part 06: 4 graded screens [s1:peakCheck(1), s2:peakCheck(2), s3:peakCheck(3), s4:peakCheck(4)]  /  4 metadata questions
        part 07: 4 graded screens [s1:peakCheck(1), s2:peakCheck(2), s3:peakCheck(3), s4:peakCheck(4)]  /  4 metadata questions

RESULT  0 error(s), 0 warning(s), 6 note(s)
```

(The first run, before §1a, ended `RESULT  1 error(s), 2 warning(s), 6 note(s)` and exit 1.)

What the script checks, beyond the census: R7 on every string; `questionId` == item id +
qKey; unit id = bare slug, component / item ids = `IRI_BASE` + nested slugs, `learningUnitId`
= the slug; `recommendedAfterFail` IRIs well-formed and pointing at existing files;
`cognitiveLevels` a non-empty list; `masteryLevel` present; `SCREEN_TO_SUBCONTENT` keys ==
`data-screen` indices; every check button has a registration on the same screen and vice
versa; each registration's `item` == the screen's `SCREEN_TO_SUBCONTENT` item; and the UI
cross-check above. The errors it found on its first run (E1, and the 07 `s4` `<br />` joins
before the runtime rule changed) are real differences, which is the negative test: a
validator that passed this metadata would be wrong.

## 4. Kata tooling (`send-metadata.ps1`, `retrieve-metadata.ps1`, their READMEs)

Copied from `methodica-science-body-matter-01/docs-and-tools/` (verified live against Kata
2026-10-20) and retargeted; **dry-run only** here, see
[SEND-METADATA.md](SEND-METADATA.md) for the result and the two repo-level blockers
(`.gitignore`).

| constant / text | value for this unit |
|---|---|
| `send-metadata.ps1` → `$ContentBaseUrl` | `https://lomdot.education.gov.il/metodica/720/science/volume-solid/01` — **assumed** by analogy (no DEPLOY.md in this repo); verify before a live run |
| `send-metadata.ps1` → unit `uniqueKey` guard | tightened to `^methodica-[a-z]+-[a-z-]+-\d\d$`; the bare-slug unit id of v2.7 passes through `Get-Slug` unchanged |
| `retrieve-metadata.ps1` → `$IdBase` | `https://lomdot.education.gov.il/metodica/720active/science/volume-solid/01` (= `XAPI_ID_PREFIX`) |
| both → `Resolve-ApiKey` | new `Assert-KeyFileIgnored`: refuses `kata-api-key.txt` unless `git check-ignore` says it is ignored |
| component / item count | 7 components, 23 items, 30 questions |
| cognitive levels | `applying-a-model-or-procedure` (01–04), `analyzing` (05–07); `$ValidCognitiveLevel` unchanged |
| `recommendedAfterFail` links | `03 → 02` only |
