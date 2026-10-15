# SCREENS.md — full screen inventory

Every screen (`data-screen`) across the unit's seven components, with its type, the catalog
**item** it belongs to (metadata `subContent[]`), and — where relevant — which of that
item's questions (`q1`, `q2`, …) it presents.

**Seven components since 2026-10-14** (per the updated script). Until then the unit had six: standard
practice was the tail of component 01 (s30–s35) and the later components were numbered one lower.
Standard practice is now component 02 (s0–s5, items `-02-01`…`-02-05`), and the old components 02–06
are 03–07 — folders, metadata files and item ids all moved up by one (`01-02-0x` → `01-03-0x`, …,
`01-06-01` → `01-07-01`); screen ids inside them did not change with the split. (The same day's
removal of the combined result screens did compact a few ids in components 05–07 — see their notes.)

**Sourcing:** the Item column is read from each component's own `SCREEN_TO_SUBCONTENT` map in
`js/main.js` (the authoritative screen → `[item, step]` table also used by `_test/checks.mjs`
and xAPI reporting), not guessed from layout. Item titles and question text come from
`metadata/methodica-science-volume-solid-01-0N.json`. Screen Type is read from each screen's
HTML header comment in `index.html` where one exists; screens without one have their type
inferred from markup and are marked "(inferred)". `—` means "not applicable" (no catalog
item, or no question on that screen).

**Slide numbers** are those of the pre-split deck (13.7.26). The 7-component deck inserts a divider at
slide 50 ("רכיב 2: תרגול סטנדרטי"), so from slide 50 on its numbers are one higher.

Screen order below is ascending numeric `data-screen`, except in components 05–07, whose scenario
screens carry out-of-order ids and are listed where the learner meets them. **Components 01, 02 and
03 are numbered so that screen number = `index.html` position = storyboard order** (the slide sections of
`יעד 8 - תסריט סופי`; 01 and the then-02 were renumbered on 2026-10-14). The "Old id" column maps each
screen back to its earlier id, for reading older QA notes and baselines; `=` means unchanged.
Components 05–07 keep their own numbering (see their notes).

---

## Component 1 — הוק והקניה (order 1)
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

Notes:
- Flow: hook 0→4 · acquisition 5→7 · then **either** comic 8→14 **or** experiments 15→21 · both
  continue into the shared ending 22→26 (section "סיום הקניה (בשתי הדרכים)") · warm-ups 27→29 →
  component 02, always. The fork is the only place where screen n+1 is not the next screen.
- No pass/fail gate since 2026-10-14: the component reports `completed` with `success: true` and
  `score` = correct / 3 (item 02's q1 and the two warm-ups); its `recommendedAfterFail` is `[]`.
- Until 2026-10-14 this component also held the standard practice (s30 rules, s31–s35 questions,
  items 05–09) and its 4-of-5 gate; those screens are now component 02.
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
- s28's drag bank borrows the shell photo as `s28-task-shell.png`, a copy of component 02's
  `s4-shell.png`.

---

## Component 2 — תרגול סטנדרטי (order 2)
`methodica-science-volume-solid-01-02`

| Screen | Old id | Script section | Slides | Screen Type | Item | Item Title | Q# |
|---|---|---|---|---|---|---|---|
| s0 | 01 s30 (earlier 01 s32) | תרגול סטנדרטי 1 | 50 | TransitionScreen (practice rules) | — (bridge) | — | — |
| s1 | 01 s31 (earlier 01 s13) | תרגול סטנדרטי 1 | 51–55 | SingleChoiceQuestion | 01 | סטנדרטי 1: נפח האבן במשורה | q1 |
| s2 | 01 s32 (earlier 01 s14) | תרגול סטנדרטי 1 | 56–60 | SingleChoiceQuestion (with image) | 02 | סטנדרטי 2: מפעל כדורי באולינג — שיטת ההצפה | q1 |
| s3 | 01 s33 (earlier 01 s15) | תרגול סטנדרטי 1 | 61–65 | ImageHotspotQuestion (SCQ variant) | 03 | סטנדרטי 3: יושרה מדעית — בחירת הטיעון המבוסס על ראיה | q1 |
| s4 | 01 s34 (earlier 01 s17) | תרגול סטנדרטי 1 | 66–70 | DragAndDropQuestion (matching, 2 attempts) | 04 | סטנדרטי 4: התאמת גופים לשיטות מדידה | q1 |
| s5 | 01 s35 (earlier 01 s16) | תרגול סטנדרטי 1 | 71–75 | SingleChoiceQuestion (with image) | 05 | סטנדרטי 5: הסקת מסקנה על שיטת ההצפה — קריסטלים | q1 |

Notes:
- New component, split out of component 01 on 2026-10-14. Linear: s0 → s5. Its items were
  `01-01-05`…`01-01-09`; they are now `01-02-01`…`01-02-05` (suffixes `'01'`…`'05'` in code).
- s0 carries the cross-part "חזרה" (`#back-to-prev-part`) back into component 01.
- **The 4-of-5 gate lives here:** ≥4 correct → component 04 (class task), otherwise → component 03
  (basic practice). The component reports `success` = passed and `score` = correct / 5;
  `recommendedAfterFail` names component 03.
- s4 takes two attempts (storyboard 66–70); 01 s28's board keeps one.
- The photos moved with the screens and were renamed to the new ids: `s2-bowling-ball.jpg`,
  `s3-four-kids.jpg`, `s4-{metal-cube,shell,trophy}.png`, `s5-crystals.jpg` (were 01's `s32-`/`s33-`/
  `s34-`/`s35-` files). s0's companion is `character-*-headband.mp4`.
- Every item in this component has exactly one question (`q1` only).

---

## Component 3 — תרגול בסיסי + סטנדרטי ב (order 3)
`methodica-science-volume-solid-01-03` (component 02 until 2026-10-14)

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
- Reached from component 02 when the learner scores below 4 of 5. Linear: 0 → 7, then always on to
  component 04 (`success: true`, score / 6). Items are `01-03-01`…`01-03-06` (were `01-02-0x`).
- s0 carries the cross-part "חזרה" back into component 02.
- The mid-section transition (slide 98) is s5, between basic Q4 (s4) and standard-ב Q1 (s6); it used
  to be s7, the last `<section>` in the file.
- s3's comment names the template explicitly ("DropdownQuestion — Single Paragraph variant"), even
  though it reuses the SCQ answer-checking controller under the hood.
- Every item in this component has exactly one question (`q1` only).

---

## Component 4 — משימת כיתה (order 4)
`methodica-science-volume-solid-01-04` (component 03 until 2026-10-14)

| Screen | Screen Type | Item | Item Title | Q# |
|---|---|---|---|---|
| s0 | TransitionScreen (class-task opener) | — (intro screen) | — | — |
| s1 | Class task (offline notebook synthesis) | 01 | משימת כיתה: אימון מודל AI למדידת נפח | q1 |

Notes:
- Reachable from **both** component 02 (≥4 of 5) and component 03 (after remediation). Item is
  `01-04-01` (was `01-03-01`).
- `TOTAL_SCREENS = 2`. s0 is the standard "משימת כיתה" opener (added 2026-10-12, modelled on yaad4-science-mass-weight-01 part 04 screen 29); it carries the cross-part "חזרה", which returns to whichever component the learner came from. s1's type is taken from its header comment ("Class task (offline notebook synthesis task)").
- `q1` is marked on s1 because the screen's task list textually mirrors `questions[0].questionText`, and it is the only screen/item pair in the component — but it is **not programmatically graded**: `XAPI_EVAL_ITEMS = {}` and main.js documents that the answer is written on paper, so no `answered` xAPI statement is ever sent for it. Presented, not scored in-app.

---

## Component 5 — תרגול מתקדם (order 5)
`methodica-science-volume-solid-01-05` (component 04 until 2026-10-14)

| Screen | Screen Type | Item | Item Title | Q# |
|---|---|---|---|---|
| s0 | Transition/intro screen | — (intro) | — | — |
| s1 | SingleChoiceQuestion (inferred from `.scq-*`) | 01 | מתקדם 1: יעל וטבעת הכסף — טיעון מדעי לתקפות הניסוי | q1 |
| s2 | SingleChoiceQuestion (inferred from `.scq-*`) | 02 | מתקדם 2: מפעל אריזת עדשים — נפח מוצק גרגרי | q1 |
| s3 | SingleChoiceQuestion (inferred from `.scq-*`) | 03 | מתקדם 3: מהימנות מדידות — גוש הזהב של תומר | q1 |
| s10 | Scenario / narrative bridge screen (sb129, Liyan's slime) — flows between s3 and s4 | 04 | מתקדם 4: הסליים של ליאן (2 סעיפים) | — (narrative opening, no question) |
| s4 | SingleChoiceQuestion (inferred from `.scq-*`) — סעיף א (sb130) | 04 | מתקדם 4: הסליים של ליאן (2 סעיפים) | q1 |
| s5 | SingleChoiceQuestion (inferred from `.scq-*`) | 04 | מתקדם 4: הסליים של ליאן (2 סעיפים) | q2 |
| s9 | Scenario / narrative bridge screen (sb140, Gili's marbles) — flows between s5 and s6 | 05 | מתקדם 5: הגולות של גילי (3 סעיפים) | — (narrative opening, no question) |
| s6 | SingleChoiceQuestion (inferred), per-סעיף feedback, no hint | 05 | מתקדם 5: הגולות של גילי (3 סעיפים) | q1 |
| s7 | SingleChoiceQuestion (inferred), per-סעיף feedback, no hint | 05 | מתקדם 5: הגולות של גילי (3 סעיפים) | q2 |
| s8 | SingleChoiceQuestion (inferred), per-סעיף feedback, no hint | 05 | מתקדם 5: הגולות של גילי (3 סעיפים) | q3 |

Notes:
- Rows are in flow (and `index.html`) order; the two scenario screens carry out-of-order ids, and
  the reading order lives in the `SCENARIOS` table in main.js. Always continues to component 06
  (`success: true`, score / 8). Items are `01-05-01`…`01-05-05` (were `01-04-0x`).
- s1–s6 and s8 have no per-screen `S# — … · Type ·` header; Screen Type inferred from `.scq-*` markup.
- s7's own preceding comment reads "Q7 — numeric (ValueInputQuestion)", but the markup is `scq-opt` buttons like every other question here — classified as SingleChoiceQuestion (silent) per actual structure, not per that stale label.
- s6/s7/s8 are item 05's three סעיפים; since 2026-10-14 each gives its own feedback popup (2 attempts, no hint) instead of a combined result screen. Their q1/q2/q3 mapping to item 05 was confirmed from the `qKey` arguments in `registerPractice(5/6/7, …)`.
- s9 and s10 are scenario-only screens with no question of their own, but each is explicitly step 1 of its item in `SCREEN_TO_SUBCONTENT` (narrative opening) — Item filled in, Q# `—`.
- The slime scenario (sb129) was briefly merged onto s4 and split back out on 2026-10-12 as its own screen, then s11 (next free id). On 2026-10-14 the combined result screen for item 05 (old s10) was removed and the slime scenario moved from s11 into the freed id s10, so the ids are contiguous again (`_test/checks.mjs` gate 3).

---

## Component 6 — שאלת שיא (מועד א) (order 6)
`methodica-science-volume-solid-01-06` (component 05 until 2026-10-14)

| Screen | Screen Type | Item | Item Title | Q# |
|---|---|---|---|---|
| s0 | Peak intro | 01 | שאלת שיא: אבטיפוס משחק קופסה — פסלון פלסטיק (4 סעיפים) | — |
| s5 | Scenario (storyboard slide 148) — read between s0 and s1 | 01 | שאלת שיא: אבטיפוס משחק קופסה — פסלון פלסטיק (4 סעיפים) | — |
| s1 | SingleChoiceQuestion (peak sub-part, סעיף א) | 01 | שאלת שיא: אבטיפוס משחק קופסה — פסלון פלסטיק (4 סעיפים) | q1 |
| s2 | SingleChoiceQuestion (peak sub-part, סעיף ב) | 01 | שאלת שיא: אבטיפוס משחק קופסה — פסלון פלסטיק (4 סעיפים) | q2 |
| s3 | SingleChoiceQuestion (peak sub-part, סעיף ג, speaker options) | 01 | שאלת שיא: אבטיפוס משחק קופסה — פסלון פלסטיק (4 סעיפים) | q3 |
| s4 | SingleChoiceQuestion (peak sub-part, סעיף ד) | 01 | שאלת שיא: אבטיפוס משחק קופסה — פסלון פלסטיק (4 סעיפים) | q4 |

Notes:
- **2026-10-15: the end screens were removed** (06 s6; 07 s6 and s7 — the confetti `success` sprite). The unit now ends directly from סעיף ד's שנמשיך?; `unitFinish()` signals the host.
- `isAssessment: true`. Item is `01-06-01` (was `01-05-01`).
- s1–s4 have no individual header comments, only a shared block note above s1; type inferred from `.peak-opt`/`peak-question` single-select markup.
- Question-to-screen mapping is unambiguous: `PEAK_CORRECT = {1:'b',2:'a',3:'a',4:'b'}` and `xapiQ(PEAK_ITEM,'q'+idx)` key directly off the screen's own step index, matching the metadata's q1–q4 order (סעיף א/ב/ג/ד) one-to-one.
- `SCREEN_TO_SUBCONTENT` keeps s0 and the scenario s5 inside item 01 too — a code comment explains this is deliberate so the item opens on entry and only closes in `peakFinish()`.
- Since 2026-10-14 each סעיף gives its own feedback popup (2 attempts, hint until resolved). The combined answer screens (old s5/s6) were removed and the scenario and ending moved down from s7/s8 into s5/s6. After סעיף ד a pass (≥3/4) ends the unit; a fail goes straight to component 07 (מועד ב), whose metadata `recommendedAfterFail` stays empty — the content owns that route (`peakGoRetake()`).

---

## Component 7 — שאלת שיא (מועד ב) (order 7)
`methodica-science-volume-solid-01-07` (component 06 until 2026-10-14)

| Screen | Screen Type | Item | Item Title | Q# |
|---|---|---|---|---|
| s0 | Peak intro (מועד ב) | 01 | שאלת שיא: פסל ספינה טרופה לאקווריום (4 סעיפים) | — |
| s5 | Scenario (storyboard slide 161) — read between s0 and s1 | 01 | שאלת שיא: פסל ספינה טרופה לאקווריום (4 סעיפים) | — |
| s1 | SingleChoiceQuestion (peak sub-part, inferred) | 01 | שאלת שיא: פסל ספינה טרופה לאקווריום (4 סעיפים) | q1 |
| s2 | SingleChoiceQuestion (peak sub-part, inferred) | 01 | שאלת שיא: פסל ספינה טרופה לאקווריום (4 סעיפים) | q2 |
| s3 | SingleChoiceQuestion (peak sub-part, inferred) | 01 | שאלת שיא: פסל ספינה טרופה לאקווריום (4 סעיפים) | q3 |
| s4 | SingleChoiceQuestion (peak sub-part, inferred) | 01 | שאלת שיא: פסל ספינה טרופה לאקווריום (4 סעיפים) | q4 |

Notes:
- **2026-10-15: the end screens were removed** (06 s6; 07 s6 and s7 — the confetti `success` sprite). The unit now ends directly from סעיף ד's שנמשיך?; `unitFinish()` signals the host.
- Same structure as component 6 (its מועד ב twin), with a different cover story. Reached only by
  failing מועד א; s0 offers "חזרה" back into component 06. Item is `01-07-01` (was `01-06-01`).
- s0 maps to item 01 step 0 (not null) for the same reason as component 6: the item stays open until `peakFinish()`.
- q1–q4 map 1:1 to s1–s4: `PEAK_CORRECT` / `xapiQ(PEAK_ITEM,'q'+idx)` key off step index, and each screen's option text matches its metadata question's answers exactly.
- Since 2026-10-14 each סעיף gives its own feedback popup (2 attempts); the combined answer screens (old s5/s6) were removed and the scenario and endings moved down from s7/s8/s9 into s5/s6/s7. After סעיף ד the unit ends on either outcome (this is the last attempt, מועד ב), and both report the unit `completed`. The s1 companion line ("תדעו אם צדקתם רק בסוף") was removed with it.

---

## Cross-component summary

| # | Component | Order | Screens | Catalog items | Notes |
|---|---|---|---|---|---|
| 1 | הוק והקניה | 1 | 30 (s0–s29) | 01, 02, 03, 04 | Hook + branching acquisition (comic/experiments) + 2 warm-ups; no gate, always → 2 |
| 2 | תרגול סטנדרטי | 2 | 6 (s0–s5) | 01–05 | Rules + 5 standard practice Qs; 4-of-5 gate → 4, else → 3 |
| 3 | תרגול בסיסי + סטנדרטי ב | 3 | 8 (s0–s7) | 01–06 | 4 basic + 2 standard-B practice Qs, one Q per item; always → 4 |
| 4 | משימת כיתה | 4 | 2 (s0–s1) | 01 | Offline class task, presented not graded; reached from 2 or 3 |
| 5 | תרגול מתקדם | 5 | 11 (s0–s10) | 01–05 | Items 04/05 are multi-part (2 and 3 sub-questions), each with a scenario screen |
| 6 | שאלת שיא (מועד א) | 6 | 6 (s0–s5) | 01 | Single 4-part peak-question item, feedback per סעיף, pass ends the unit, fail → 7 |
| 7 | שאלת שיא (מועד ב) | 7 | 6 (s0–s5) | 01 | Single 4-part peak-question item, feedback per סעיף, no retry (final attempt) |
