# SCREENS.md — full screen inventory

Every screen (`data-screen`) across the unit's six components, with its type, the catalog
**item** it belongs to (metadata `subContent[]`), and — where relevant — which of that
item's questions (`q1`, `q2`, …) it presents.

**Sourcing:** the Item column is read from each component's own `SCREEN_TO_SUBCONTENT` map in
`js/main.js` (the authoritative screen → `[item, step]` table also used by `_test/checks.mjs`
and xAPI reporting), not guessed from layout. Item titles and question text come from
`metadata/methodica-science-volume-solid-01-0N.json`. Screen Type is read from each screen's
HTML header comment in `index.html` where one exists; screens without one have their type
inferred from markup and are marked "(inferred)". `—` means "not applicable" (no catalog
item, or no question on that screen).

Screen order below is ascending numeric `data-screen`, which is navigation order — this is
**not** always the same as each screen's physical position in `index.html` (branching
components interleave paths; see the per-component notes).

---

## Component 1 — פתיחה עד סוף + תרגול סטנדרטי א (order 1)
`methodica-science-volume-solid-01-01`

| Screen | Screen Type | Item | Item Title | Q# |
|---|---|---|---|---|
| s0 | TwoOptionSelection (companion picker) | — (companion picker) | — | — |
| s1 | hookOpenQuestion (intro) | 01 | הוק: רוני מוצאת תליון על החוף | — |
| s2 | hookOpenQuestion (free text + hint) | 01 | הוק: רוני מוצאת תליון על החוף | — |
| s3 | hookOpenQuestion (reveal) | 01 | הוק: רוני מוצאת תליון על החוף | — |
| s4 | SingleChoiceQuestionImage (mark-for-feedback) | 01 | הוק: רוני מוצאת תליון על החוף | — |
| s5 | Narrative (Archimedes story) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s6 | Narrative (Archimedes story) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s7 | TwoOptionSelection (learning-path choice) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s8 | Comic (composite frame) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s9 | Water-displacement applet | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s10 | Aquarium ruler applet + SingleChoiceQuestion | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | q1 |
| s11 | Flooding/overflow applet | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s12 | TransitionScreen (branch merge → practice) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s13 | SingleChoiceQuestion | 05 | סטנדרטי 1: נפח האבן במשורה | q1 |
| s14 | SingleChoiceQuestion (with image) | 06 | סטנדרטי 2: מפעל כדורי באולינג — שיטת ההצפה | q1 |
| s15 | ImageHotspotQuestion (SCQ variant) | 07 | סטנדרטי 3: יושרה מדעית — בחירת הטיעון המבוסס על ראיה | q1 |
| s16 | SingleChoiceQuestion (with image) | 09 | סטנדרטי 5: הסקת מסקנה על שיטת ההצפה — קריסטלים | q1 |
| s17 | DragAndDropQuestion (matching) | 08 | סטנדרטי 4: התאמת גופים לשיטות מדידה | q1 |
| s18 | DragAndDropQuestion (matching, 5-way) | 03 | חימום 1: התאמת משימת מדידה לכלי המתאים | q1 |
| s19 | SingleChoiceQuestion (dropdown fill-in) | 04 | חימום 2: עיקרון דחיקת המים | q1 |
| s20 | FlipCardsReveal (real-world uses) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s21 | Guess-question (no feedback) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s22 | Multi-step measurement applet | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s23 | Guess-question (inside comic) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s24 | Comic (composite frame) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s25 | Comic slider (5 panels) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s26 | Guess-question (no feedback) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s27 | Comic slider (7 panels) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s28 | Comic slider (3 panels) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s29 | Guess-question (experiments path) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s30 | Overflow-can intro (question) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s31 | Overflow-can reveal (how it works) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s32 | TransitionScreen (practice rules) | — (bridge screen, belongs to no catalog item) | — | — |

Notes:
- s5/s6 header comments have no `· Type ·` token; typed as "Narrative (Archimedes story)" by inference from the reused `.hook-content` structure and story text.
- s16's own comment header says "Standard practice Q4 (item 09)", but the flow is actually Q4 = s17/item 08 and Q5 = s16/item 09 — the Item/Q# columns above follow `SCREEN_TO_SUBCONTENT` and metadata order (which are consistent with each other), not the stale label text in that one comment.
- Item 02 ("הקנייה") spans 20 of the 33 screens across both the comic and experiments branches; s10 is confirmed by an explicit code comment as "the item's ONLY catalog question (q1)" — every other item-02 screen is pure content/navigation.
- Screen order here is navigation order, not file order: the comic branch (s23–s28) and the experiments branch (s9, s29, s21, s11, s20, s22, s30, s31) both sit between s8/s12 in flow even though s23–s28 appear earlier in the raw file than s9.

---

## Component 2 — תרגול בסיסי + סטנדרטי ב (order 2)
`methodica-science-volume-solid-01-02`

| Screen | Screen Type | Item | Item Title | Q# |
|---|---|---|---|---|
| s0 | TransitionScreen (remediation intro) | — (intro screen) | — | — |
| s1 | SingleChoiceQuestion (image, 4-option) | 01 | בסיסי 1: זיהוי גוף שאינו בעל צורה הנדסית | q1 |
| s2 | SingleChoiceQuestion (true/false, 2-option) | 02 | בסיסי 2: תום או שירלי — מה השיטה לגוף לא הנדסי | q1 |
| s3 | DropdownQuestion (single paragraph) | 03 | בסיסי 3: הכלי לשיטת דחיקת המים | q1 |
| s4 | SingleChoiceQuestion (text only, 4-option) | 04 | בסיסי 4: מדידת גליל מתכת בשיטת ההצפה | q1 |
| s5 | SingleChoiceQuestion (image hotspot, 3-option) | 05 | סטנדרטי ב 1: זיהוי אזור עליית המים במשורה | q1 |
| s6 | SingleChoiceQuestion (text only, 4-option) | 06 | סטנדרטי ב 2: מעצבת תכשיטים — נפח חרוז יחיד | q1 |
| s7 | TransitionScreen (mid-section, sb98) | — (bridge between Q4 and Q5) | — | — |

Notes:
- s1, s2, s4, s5, s6 have a header comment but no explicit `· Type ·` token; type inferred from the dominant `.scq-*` markup as SingleChoiceQuestion.
- s3's comment names the template explicitly ("DropdownQuestion — Single Paragraph variant"), used verbatim even though it reuses the SCQ answer-checking controller under the hood.
- Every item in this component has exactly one question (`q1` only) and `SCREEN_TO_SUBCONTENT` maps each item to a single step, so no question-to-screen judgment calls were needed.
- s7 sits between item 04 and item 05 in navigation order but is the last `<section>` in the raw file — table order here is navigation order per `data-screen`, not file position.

---

## Component 3 — משימת כיתה (order 3)
`methodica-science-volume-solid-01-03`

| Screen | Screen Type | Item | Item Title | Q# |
|---|---|---|---|---|
| s0 | Class task (offline notebook synthesis) | 01 | משימת כיתה: אימון מודל AI למדידת נפח | q1 |

Notes:
- This component is a single screen (`TOTAL_SCREENS = 1`); "Screen Type" is taken directly from its header comment ("Class task (offline notebook synthesis task)").
- `q1` is marked here because the screen's task list textually mirrors `questions[0].questionText`, and it is the only screen/item pair in the component — but it is **not programmatically graded**: `XAPI_EVAL_ITEMS = {}` and main.js documents that the answer is written on paper, so no `answered` xAPI statement is ever sent for it. Presented, not scored in-app.

---

## Component 4 — תרגול מתקדם (order 4)
`methodica-science-volume-solid-01-04`

| Screen | Screen Type | Item | Item Title | Q# |
|---|---|---|---|---|
| s0 | Transition/intro screen | — (intro) | — | — |
| s1 | SingleChoiceQuestion (inferred from `.scq-*`) | 01 | מתקדם 1: יעל וטבעת הכסף — טיעון מדעי לתקפות הניסוי | q1 |
| s2 | SingleChoiceQuestion (inferred from `.scq-*`) | 02 | מתקדם 2: מפעל אריזת עדשים — נפח מוצק גרגרי | q1 |
| s3 | SingleChoiceQuestion (inferred from `.scq-*`) | 03 | מתקדם 3: מהימנות מדידות — גוש הזהב של תומר | q1 |
| s4 | SingleChoiceQuestion (inferred from `.scq-*`) | 04 | מתקדם 4: הסליים של ליאן (2 סעיפים) | q1 |
| s5 | SingleChoiceQuestion (inferred from `.scq-*`) | 04 | מתקדם 4: הסליים של ליאן (2 סעיפים) | q2 |
| s6 | SingleChoiceQuestion, silent/no-feedback (inferred) | 05 | מתקדם 5: הגולות של גילי (3 סעיפים) | q1 |
| s7 | SingleChoiceQuestion, silent/no-feedback (inferred) | 05 | מתקדם 5: הגולות של גילי (3 סעיפים) | q2 |
| s8 | SingleChoiceQuestion, silent/no-feedback (inferred) | 05 | מתקדם 5: הגולות של גילי (3 סעיפים) | q3 |
| s9 | Scenario / narrative bridge screen | 04 | מתקדם 4: הסליים של ליאן (2 סעיפים) | — (narrative opening, no question) |
| s10 | Scenario / narrative bridge screen | 05 | מתקדם 5: הגולות של גילי (3 סעיפים) | — (narrative opening, no question) |
| s11 | Result / verdict screen (companion speech bubble) | 05 | מתקדם 5: הגולות של גילי (3 סעיפים) | — (reveals q1–q3 together, no new question) |

Notes:
- s1–s6 and s8 have no per-screen `S# — … · Type ·` header; Screen Type inferred from `.scq-*` markup.
- s7's own preceding comment reads "Q7 — numeric (ValueInputQuestion)", but the markup is `scq-opt` buttons like every other question here — classified as SingleChoiceQuestion (silent) per actual structure, not per that stale label.
- s6/s7/s8 are the three "silent" sub-questions (`SILENT_SCREENS = [6,7,8]`, no popup at answer time); their q1/q2/q3 mapping to item 05 was confirmed from the `qKey` arguments in `registerPractice(5/6/7, …)`.
- s9/s10 are scenario-only screens with no question of their own but are explicitly step 1 of items 04/05 in `SCREEN_TO_SUBCONTENT` (narrative openings) — Item filled in, Q# `—`.
- s11 is the combined result screen for item 05's three sub-questions; it reveals previously-recorded verdicts rather than presenting a new question.

---

## Component 5 — שאלת שיא (מועד א) (order 5)
`methodica-science-volume-solid-01-05`

| Screen | Screen Type | Item | Item Title | Q# |
|---|---|---|---|---|
| s0 | Peak intro | 01 | שאלת שיא: אבטיפוס משחק קופסה — פסלון פלסטיק (4 סעיפים) | — |
| s1 | SingleChoiceQuestion (peak sub-part, סעיף א) | 01 | שאלת שיא: אבטיפוס משחק קופסה — פסלון פלסטיק (4 סעיפים) | q1 |
| s2 | SingleChoiceQuestion (peak sub-part, סעיף ב) | 01 | שאלת שיא: אבטיפוס משחק קופסה — פסלון פלסטיק (4 סעיפים) | q2 |
| s3 | SingleChoiceQuestion (peak sub-part, סעיף ג, speaker options) | 01 | שאלת שיא: אבטיפוס משחק קופסה — פסלון פלסטיק (4 סעיפים) | q3 |
| s4 | SingleChoiceQuestion (peak sub-part, סעיף ד) | 01 | שאלת שיא: אבטיפוס משחק קופסה — פסלון פלסטיק (4 סעיפים) | q4 |
| s5 | Peak result — success | 01 | שאלת שיא: אבטיפוס משחק קופסה — פסלון פלסטיק (4 סעיפים) | — |
| s6 | Peak result — retry/failure | 01 | שאלת שיא: אבטיפוס משחק קופסה — פסלון פלסטיק (4 סעיפים) | — |

Notes:
- s1–s4 have no individual header comments, only a shared block note above s1; type inferred from `.peak-opt`/`peak-question` single-select markup.
- Question-to-screen mapping is unambiguous: `PEAK_CORRECT = {1:'b',2:'a',3:'a',4:'b'}` and `xapiQ(PEAK_ITEM,'q'+idx)` key directly off the screen's own step index, matching the metadata's q1–q4 order (סעיף א/ב/ג/ד) one-to-one.
- `SCREEN_TO_SUBCONTENT` keeps s0 and s5/s6 inside item 01 too (steps 0 and 5) — a code comment explains this is deliberate so the item opens on entry and only closes in `peakFinish()`. Neither s0 nor s5/s6 presents a scored question.

---

## Component 6 — שאלת שיא (מועד ב) (order 6)
`methodica-science-volume-solid-01-06`

| Screen | Screen Type | Item | Item Title | Q# |
|---|---|---|---|---|
| s0 | Peak intro | 01 | שאלת שיא: פסל ספינה טרופה לאקווריום (4 סעיפים) | — |
| s1 | SingleChoiceQuestion (peak sub-part, inferred) | 01 | שאלת שיא: פסל ספינה טרופה לאקווריום (4 סעיפים) | q1 |
| s2 | SingleChoiceQuestion (peak sub-part, inferred) | 01 | שאלת שיא: פסל ספינה טרופה לאקווריום (4 סעיפים) | q2 |
| s3 | SingleChoiceQuestion (peak sub-part, inferred) | 01 | שאלת שיא: פסל ספינה טרופה לאקווריום (4 סעיפים) | q3 |
| s4 | SingleChoiceQuestion (peak sub-part, inferred) | 01 | שאלת שיא: פסל ספינה טרופה לאקווריום (4 סעיפים) | q4 |
| s5 | Success end screen (terminal) | 01 | שאלת שיא: פסל ספינה טרופה לאקווריום (4 סעיפים) | — |
| s6 | Failure end screen (terminal) | 01 | שאלת שיא: פסל ספינה טרופה לאקווריום (4 סעיפים) | — |

Notes:
- Same structure as component 5 (its מועד ב twin), with a different cover story.
- s0 maps to item 01 step 0 (not null) for the same reason as component 5: the item stays open until `peakFinish()`.
- q1–q4 map 1:1 to s1–s4: `PEAK_CORRECT` / `xapiQ(PEAK_ITEM,'q'+idx)` key off step index, and each screen's option text matches its metadata question's answers exactly.
- Unlike component 5, there is **no retry path** back into the assessment from either end screen — s5/s6 are true terminal screens (this is the last attempt, מועד ב).

---

## Cross-component summary

| # | Component | Order | Screens | Catalog items | Notes |
|---|---|---|---|---|---|
| 1 | פתיחה עד סוף + תרגול סטנדרטי א | 1 | 33 (s0–s32) | 01, 02, 03, 04, 05, 06, 07, 08, 09 | Hook + branching acquisition (comic/experiments) + 5 standard practice Qs |
| 2 | תרגול בסיסי + סטנדרטי ב | 2 | 8 (s0–s7) | 01–06 | 4 basic + 2 standard-B practice Qs, one Q per item |
| 3 | משימת כיתה | 3 | 1 (s0) | 01 | Offline class task, presented not graded |
| 4 | תרגול מתקדם | 4 | 12 (s0–s11) | 01–05 | Items 04/05 are multi-part (2 and 3 sub-questions) |
| 5 | שאלת שיא (מועד א) | 5 | 7 (s0–s6) | 01 | Single 4-part peak-question item, retry path exists |
| 6 | שאלת שיא (מועד ב) | 6 | 7 (s0–s6) | 01 | Single 4-part peak-question item, no retry (final attempt) |
