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

Screen order below is ascending numeric `data-screen`. **Components 01 and 02 were renumbered on
2026-10-14 so that screen number = `index.html` position = storyboard order** (the slide sections of
`יעד 8 - תסריט סופי`). The "Old id" column maps each screen back to its pre-renumbering id, for
reading older QA notes and baselines; `=` means unchanged. Components 04–06 still keep their own
numbering (see their notes).

---

## Component 1 — פתיחה עד סוף + תרגול סטנדרטי א (order 1)
`methodica-science-volume-solid-01-01`

| Screen | Old id | Script section | Slides | Screen Type | Item | Item Title | Q# |
|---|---|---|---|---|---|---|---|
| s0 | = | HOOK | 3 | TwoOptionSelection (companion picker) | — (companion picker) | — | — |
| s1 | = | HOOK | 4 | hookOpenQuestion (intro) | 01 | הוק: רוני מוצאת תליון על החוף | — |
| s2 | = | HOOK | 5 | hookOpenQuestion (free text + hint) | 01 | הוק: רוני מוצאת תליון על החוף | — |
| s3 | = | HOOK | 6 | hookOpenQuestion (reveal) | 01 | הוק: רוני מוצאת תליון על החוף | — |
| s4 | = | הקנייה | 7–8 | SingleChoiceQuestionImage (mark-for-feedback) | 01 | הוק: רוני מוצאת תליון על החוף | — |
| s5 | = | הקנייה | 9 | Narrative (Archimedes story) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s6 | = | הקנייה | 10 | Narrative (Archimedes story) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s7 | = | בחירה הקנייה | 11 | TwoOptionSelection (learning-path choice) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s8 | = | הקנייה - קומיקס | 12 | Comic (composite frame) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s9 | s24 | הקנייה - קומיקס | 14 | Comic (composite frame) — the cube | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s10 | s23 | הקנייה - קומיקס | 13 | Guess-question (inside comic) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s11 | s25 | הקנייה - קומיקס | 15 | Comic slider (5 panels) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s12 | s26 | הקנייה - קומיקס | 16 | Guess-question (no feedback) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s13 | s27 | הקנייה - קומיקס | 17 | Comic slider (7 panels) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s14 | s28 | הקנייה - קומיקס | 18 | Comic slider (3 panels) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s15 | s10 | הקניה ניסויים | 19–23 | Aquarium ruler applet + SingleChoiceQuestion | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | q1 |
| s16 | s29 | הקניה ניסויים | 24 | Guess-question (experiments path) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s17 | s9 | הקניה ניסויים | 25 | Water-displacement applet | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s18 | s35 | הקניה ניסויים | 26 | Displacement result | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s19 | s21 | הקניה ניסויים | 27 | Guess-question (no feedback) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s20 | s11 | הקניה ניסויים | 28 | Flooding/overflow applet | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s21 | s33 | הקניה ניסויים | 29 | Flooding result | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s22 | s20 | סיום הקניה (בשתי הדרכים) | 30–32 | FlipCardsReveal (real-world uses) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s23 | s22 | סיום הקניה (בשתי הדרכים) | 33–35 | Measurement applet — steps 1–2 | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s24 | s34 | סיום הקניה (בשתי הדרכים) | 36–38 | Measurement applet — steps 3–4 | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s25 | s30 | סיום הקניה (בשתי הדרכים) | 39 | Overflow-can intro (question) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s26 | s31 | סיום הקניה (בשתי הדרכים) | 40 | Overflow-can reveal (how it works) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s27 | s12 | שאלות חימום | 41 | TransitionScreen (warm-up intro) | 02 | הקנייה: שיטות מדידת נפח (פלייליסט: קומיקס / ניסויים) | — |
| s28 | s18 | שאלות חימום | 42–45 | DragAndDropQuestion (matching, 5-way) | 03 | חימום 1: התאמת משימת מדידה לכלי המתאים | q1 |
| s29 | s19 | שאלות חימום | 46–49 | SingleChoiceQuestion (dropdown fill-in) | 04 | חימום 2: עיקרון דחיקת המים | q1 |
| s30 | s32 | תרגול סטנדרטי 1 | 50 | TransitionScreen (practice rules) | — (bridge) | — | — |
| s31 | s13 | תרגול סטנדרטי 1 | 51–55 | SingleChoiceQuestion | 05 | סטנדרטי 1: נפח האבן במשורה | q1 |
| s32 | s14 | תרגול סטנדרטי 1 | 56–60 | SingleChoiceQuestion (with image) | 06 | סטנדרטי 2: מפעל כדורי באולינג — שיטת ההצפה | q1 |
| s33 | s15 | תרגול סטנדרטי 1 | 61–65 | ImageHotspotQuestion (SCQ variant) | 07 | סטנדרטי 3: יושרה מדעית — בחירת הטיעון המבוסס על ראיה | q1 |
| s34 | s17 | תרגול סטנדרטי 1 | 66–70 | DragAndDropQuestion (matching) | 08 | סטנדרטי 4: התאמת גופים לשיטות מדידה | q1 |
| s35 | s16 | תרגול סטנדרטי 1 | 71–75 | SingleChoiceQuestion (with image) | 09 | סטנדרטי 5: הסקת מסקנה על שיטת ההצפה — קריסטלים | q1 |

Notes:
- Flow: hook 0→4 · acquisition 5→7 · then **either** comic 8→14 **or** experiments 15→21 · both
  continue into the shared ending 22→26 (section "סיום הקניה (בשתי הדרכים)") · warm-ups 27→29 ·
  practice 30→35 → part 02 or 03. The fork is the only place where screen n+1 is not the next screen.
- Since 2026-10-14 the comic path also walks the shared ending (decision D3 option ב). Before, it
  jumped from the last comic screen straight to the warm-up intro and skipped slides 30–40.
- The path toggle on s22–s26 shows the learner's own path (`learningPath`); picking the other path
  starts that path from its first screen.
- One deliberate departure from the deck's slide order: the cube (s9, slide 14) comes before the
  guess-question (s10, slide 13) — QA 2026-10-08.
- Item page numbers (`SCREEN_TO_SUBCONTENT[n][1]`) are unchanged by the renumbering, so xAPI and bug
  reports identify the same content as before.
- Item 02 ("הקנייה") spans s5–s27; s15 is its only catalog question (q1). Every other item-02 screen
  is content/navigation.

---

## Component 2 — תרגול בסיסי + סטנדרטי ב (order 2)
`methodica-science-volume-solid-01-02`

| Screen | Old id | Script section | Slides | Screen Type | Item | Item Title | Q# |
|---|---|---|---|---|---|---|---|
| s0 | = | תרגול בסיסי | 77 | TransitionScreen (remediation intro) | — (intro) | — | — |
| s1 | = | תרגול בסיסי | 78–82 | SingleChoiceQuestion (image, 4-option) | 01 | בסיסי 1: זיהוי גוף שאינו בעל צורה הנדסית | q1 |
| s2 | = | תרגול בסיסי | 83–86 | SingleChoiceQuestion (true/false, 2-option) | 02 | בסיסי 2: תום או שירלי — מה השיטה לגוף לא הנדסי | q1 |
| s3 | = | תרגול בסיסי | 87–91 | DropdownQuestion (single paragraph) | 03 | בסיסי 3: הכלי לשיטת דחיקת המים | q1 |
| s4 | = | תרגול בסיסי | 92–97 | SingleChoiceQuestion (text only, 4-option) | 04 | בסיסי 4: מדידת גליל מתכת בשיטת ההצפה | q1 |
| s5 | s7 | תרגול סטנדרטי 2 | 98 | TransitionScreen (mid-section) | — (bridge) | — | — |
| s6 | s5 | תרגול סטנדרטי 2 | 99–103 | SingleChoiceQuestion (image hotspot, 3-option) | 05 | סטנדרטי ב 1: זיהוי אזור עליית המים במשורה | q1 |
| s7 | s6 | תרגול סטנדרטי 2 | 104–108 | SingleChoiceQuestion (text only, 4-option) | 06 | סטנדרטי ב 2: מעצבת תכשיטים — נפח חרוז יחיד | q1 |

Notes:
- Linear: 0 → 7. The mid-section transition (slide 98) is s5, between basic Q4 (s4) and standard-ב
  Q1 (s6); it used to be s7, the last `<section>` in the file.
- s3's comment names the template explicitly ("DropdownQuestion — Single Paragraph variant"), even
  though it reuses the SCQ answer-checking controller under the hood.
- Every item in this component has exactly one question (`q1` only).

---

## Component 3 — משימת כיתה (order 3)
`methodica-science-volume-solid-01-03`

| Screen | Screen Type | Item | Item Title | Q# |
|---|---|---|---|---|
| s0 | TransitionScreen (class-task opener) | — (intro screen) | — | — |
| s1 | Class task (offline notebook synthesis) | 01 | משימת כיתה: אימון מודל AI למדידת נפח | q1 |

Notes:
- `TOTAL_SCREENS = 2`. s0 is the standard "משימת כיתה" opener (added 2026-10-12, modelled on yaad4-science-mass-weight-01 part 04 screen 29); it carries the cross-part "חזרה". s1's type is taken from its header comment ("Class task (offline notebook synthesis task)").
- `q1` is marked on s1 because the screen's task list textually mirrors `questions[0].questionText`, and it is the only screen/item pair in the component — but it is **not programmatically graded**: `XAPI_EVAL_ITEMS = {}` and main.js documents that the answer is written on paper, so no `answered` xAPI statement is ever sent for it. Presented, not scored in-app.

---

## Component 4 — תרגול מתקדם (order 4)
`methodica-science-volume-solid-01-04`

| Screen | Screen Type | Item | Item Title | Q# |
|---|---|---|---|---|
| s0 | Transition/intro screen | — (intro) | — | — |
| s1 | SingleChoiceQuestion (inferred from `.scq-*`) | 01 | מתקדם 1: יעל וטבעת הכסף — טיעון מדעי לתקפות הניסוי | q1 |
| s2 | SingleChoiceQuestion (inferred from `.scq-*`) | 02 | מתקדם 2: מפעל אריזת עדשים — נפח מוצק גרגרי | q1 |
| s3 | SingleChoiceQuestion (inferred from `.scq-*`) | 03 | מתקדם 3: מהימנות מדידות — גוש הזהב של תומר | q1 |
| s11 | Scenario / narrative bridge screen (sb129) — flows between s3 and s4 | 04 | מתקדם 4: הסליים של ליאן (2 סעיפים) | — (narrative opening, no question) |
| s4 | SingleChoiceQuestion (inferred from `.scq-*`) — סעיף א (sb130) | 04 | מתקדם 4: הסליים של ליאן (2 סעיפים) | q1 |
| s5 | SingleChoiceQuestion (inferred from `.scq-*`) | 04 | מתקדם 4: הסליים של ליאן (2 סעיפים) | q2 |
| s6 | SingleChoiceQuestion (inferred), per-סעיף feedback, no hint | 05 | מתקדם 5: הגולות של גילי (3 סעיפים) | q1 |
| s7 | SingleChoiceQuestion (inferred), per-סעיף feedback, no hint | 05 | מתקדם 5: הגולות של גילי (3 סעיפים) | q2 |
| s8 | SingleChoiceQuestion (inferred), per-סעיף feedback, no hint | 05 | מתקדם 5: הגולות של גילי (3 סעיפים) | q3 |
| s9 | Scenario / narrative bridge screen | 05 | מתקדם 5: הגולות של גילי (3 סעיפים) | — (narrative opening, no question) |

Notes:
- s1–s6 and s8 have no per-screen `S# — … · Type ·` header; Screen Type inferred from `.scq-*` markup.
- s7's own preceding comment reads "Q7 — numeric (ValueInputQuestion)", but the markup is `scq-opt` buttons like every other question here — classified as SingleChoiceQuestion (silent) per actual structure, not per that stale label.
- s6/s7/s8 are item 05's three סעיפים; since 2026-10-14 each gives its own feedback popup (2 attempts, no hint) instead of a combined result screen. Their q1/q2/q3 mapping to item 05 was confirmed from the `qKey` arguments in `registerPractice(5/6/7, …)`.
- s9 is a scenario-only screen with no question of its own but is explicitly step 1 of item 05 in `SCREEN_TO_SUBCONTENT` (narrative opening) — Item filled in, Q# `—`.
- The slime scenario (sb129) was briefly merged onto s4 and split back out on 2026-10-12 as its own screen, s11 (next free id; flow order lives in `SCENARIOS`). Like s9, it is page 1 of its item in `SCREEN_TO_SUBCONTENT`.
- s10 (the combined result screen for item 05) was removed 2026-10-14; its id is not reused.

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

Notes:
- s1–s4 have no individual header comments, only a shared block note above s1; type inferred from `.peak-opt`/`peak-question` single-select markup.
- Question-to-screen mapping is unambiguous: `PEAK_CORRECT = {1:'b',2:'a',3:'a',4:'b'}` and `xapiQ(PEAK_ITEM,'q'+idx)` key directly off the screen's own step index, matching the metadata's q1–q4 order (סעיף א/ב/ג/ד) one-to-one.
- `SCREEN_TO_SUBCONTENT` keeps s0, the scenario s7 and the ending s8 inside item 01 too — a code comment explains this is deliberate so the item opens on entry and only closes in `peakFinish()`.
- Since 2026-10-14 each סעיף gives its own feedback popup (2 attempts, hint until resolved). The combined answer screens s5/s6 were removed; after סעיף ד a pass (≥3/4) goes to s8, a fail straight to part 06. Ids 5/6 are not reused.

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

Notes:
- Same structure as component 5 (its מועד ב twin), with a different cover story.
- s0 maps to item 01 step 0 (not null) for the same reason as component 5: the item stays open until `peakFinish()`.
- q1–q4 map 1:1 to s1–s4: `PEAK_CORRECT` / `xapiQ(PEAK_ITEM,'q'+idx)` key off step index, and each screen's option text matches its metadata question's answers exactly.
- Since 2026-10-14 each סעיף gives its own feedback popup (2 attempts); s5/s6 were removed. After סעיף ד a pass (4/4) goes to s8, otherwise to s9 — both terminal (this is the last attempt, מועד ב). The s1 companion line ("תדעו אם צדקתם רק בסוף") was removed with it.

---

## Cross-component summary

| # | Component | Order | Screens | Catalog items | Notes |
|---|---|---|---|---|---|
| 1 | פתיחה עד סוף + תרגול סטנדרטי א | 1 | 33 (s0–s32) | 01, 02, 03, 04, 05, 06, 07, 08, 09 | Hook + branching acquisition (comic/experiments) + 5 standard practice Qs |
| 2 | תרגול בסיסי + סטנדרטי ב | 2 | 8 (s0–s7) | 01–06 | 4 basic + 2 standard-B practice Qs, one Q per item |
| 3 | משימת כיתה | 3 | 1 (s0) | 01 | Offline class task, presented not graded |
| 4 | תרגול מתקדם | 4 | 11 (s0–s9, s11) | 01–05 | Items 04/05 are multi-part (2 and 3 sub-questions) |
| 5 | שאלת שיא (מועד א) | 5 | 7 (s0–s4, s7, s8) | 01 | Single 4-part peak-question item, feedback per סעיף, fail → part 06 |
| 6 | שאלת שיא (מועד ב) | 6 | 8 (s0–s4, s7–s9) | 01 | Single 4-part peak-question item, feedback per סעיף, no retry (final attempt) |
