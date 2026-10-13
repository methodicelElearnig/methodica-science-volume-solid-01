# Text fidelity: screen copy against the validated script

The rule the unit's copy follows, and every place it knowingly departs from the deck. Code comments
that say "§Agreed policy" or "§Deck defects" point here. Before this file existed (2026-10-11) they
pointed at a `QA/TEXT-FIDELITY.md` that was never committed to this repository.

**Source of truth:** `מדעים_יעד 8_מדידת נפח מוצק 13.7.26 מתוקן לאחר תיקוף.pptx` (the validated deck,
sha1 `963691dc…`). Slide numbers below are that deck's.

Companions: [METADATA-KNOWN-ISSUES.md](METADATA-KNOWN-ISSUES.md) · [ASSETS-TODO.md](ASSETS-TODO.md)

---

## Agreed policy

1. **Screen copy is the deck's copy**: question stems, options, hints, feedback titles and bodies,
   result cards and companion lines, word for word and with the deck's bold runs.
2. **An explicit QA decision wins** over both the deck and the 720 skill defaults. Each such decision is
   listed under *Approved departures* below.
3. **A shortened or reworded line with no QA decision behind it goes back to the deck.** Applied to the
   05 peak (`ccb7f17`), the 06 peak (`5d554b5`), the 01 s13–s16 hints (`4372202`), and in the
   2026-10-11 wording round to 01 s10/s13/s16/s18/s19, the 02 stems s1/s4/s6 and all six 02 hints.
4. **Typography is not wording.** These are normalised across the unit and are not departures:
   `ל-`, `כ-` and `ב-N` (the deck mixes `ל –`, `כ־`, `ב - 2`); a plain hyphen for the deck's
   non-breaking one (`אי‑אפשר`); `&nbsp;` between a number and its unit and against one-word last
   lines; a single sentence-final period; a space the deck lost between two words
   (`למים,הגוף`, `המשורהולכן` on slide 48); deck expressions wrapped in `.section-result-expr`,
   because digits and operators are bidi-neutral and get reordered inside an RTL paragraph.
5. **Hint heading.** Every hint card carries the heading `חישבו:` (the unit was built before the
   2026-10-05 template change). The deck's own bold heading, where a slide has one, is the first,
   bold line of the body (e.g. 01 s13 slide 53, 02 s1 slide 80).
6. **Hint availability** follows each hint slide's note:

   | When the hint is available | Screens |
   |---|---|
   | after the first wrong answer | 01 s13–s17, 02 s5–s6, 04 s1–s5 |
   | always | 01 s10, 01 s19, 02 s1–s4, 05, 06 |

7. **Catalog.** A stem whose wording changes is mirrored in `metadata/` (`questionText`) in the same
   commit. An option's text is what is reported (`xapiAnswerText` reads the DOM), so an option change
   always moves `answers` / `correctAnswers` with it.

## Deck defects

Errors in the deck, corrected on screen. Each is noted next to the copy in the code as well.

| Where | Deck | Screen | Why |
|---|---|---|---|
| wrong-final title, 01 s10/s13 (slides 23, 55), 02 s1 (82) | no "התשובה הנכונה מסומנת." | the line is shown | every sibling slide has it, and the unit marks the correct option on every wrong-final |
| wrong-final title, 01 s14 (60), 04 s3/s4 (128, 134) | "התשובה הנכונה **מוצגת**." | "…**מסומנת**." | same screen type as 65/75/118/123/139; the option is marked, not shown. 01 s17's board answer keeps "מוצגת" (`answerNote`), as on slide 70 |
| 01 s16 feedback and hint (73–75) | "נפח **הספינה**", "הכניס את **הספינה**" | "הקריסטל" | a ship left over from an earlier revision; the question is about crystals |
| 01 s18 second feedback line (44, 45) | ends with ".." | one period | |
| 02 s6 correct title (107) | placeholder "טקסט משוב" | "נכון מאוד!" | the deck's usual title |
| 04 result (144/145) | "כל **הגלות**" | "הגולות" | missing vav |
| 06 result (170) | "12,50 סמ"ק" | "1,250 סמ"ק" | transposition: the question and every other line use 1,250 |
| 06 result (171) | "א. ." | "א." | |
| 02 s1 option d (78) | "גליל עץ" | "קוביית עץ" | slides 79, 81 and 82 (the same question) and the photo on the screen all show a wooden cube; QA 2026-10-11 (N18). The catalog says "קוביית עץ" too |

## Approved departures

QA decisions that keep the screen different from the deck on purpose.

| Where | Deck | Screen | Decision |
|---|---|---|---|
| 04 s4 · option a (slide 130) | "ללחוץ עליה" | "ללחוץ עליו" | development decision documented in the catalog gap table (row 12), 2026-10-11 |
| 05/06 result cards | bolds only "א." / "ב." | all four markers bold | consistency within the card |
| 01 s17/s18 partly right board | "התשובה אינה נכונה." | "התשובה אינה נכונה במלואה." plus the answer toggle note | G7, 2026-10-10 |
| 01 s17 attempts | — | two attempts (slides 66–70); s18 keeps one | 2026-10-11 |
| retry gate, 17 two-attempt choice screens | silent | the option judged wrong cannot be submitted again | 2026-10-11 |
| 02 s3 stem (87) | "דחיקת מים" | "דחיקת **המים**" | QA comment on slide 90: "כדאי להיות עקביים" |
| 06 s3 hint (167) | "השיטות … **אותם** למדנו" | "**שאותן** למדנו" | grammatical correction kept, 2026-10-11 (F12) |
| 06 s3 stem | "כמות המים שנאספה בקערה – 1,250 מ"ל, שווה בדיוק לנפח הפסל"! | "כמות המים שנאספה **היא** 1,250 מ"ל — שווה בדיוק לנפח הפסל!" | wording fix by the developer, 2026-10-12 |
| 01 s17/s18 bank labels | none | "גופים למדידה:", "משימות המדידה:" | interface labels for the drag bank, kept, 2026-10-11 (F13) |
| 01 s18 feedback (44 / 45) | "כל כלי ושיטת מדידה **מתאימה**" (44, wrong) · "…**מתאימים**" (45, correct) | each popup in its own slide's words | 2026-10-11 (FB1): the two agreements stay as the deck has them; choosing one is a language call for QA, not a typo fix |
| 01 s13 wrong-final (55) | encouragement line in the mascot's bubble, with an "encourage" GIF | the line closes the wrong-final popup, no mascot | 2026-10-11 (FB2): the `encourage` pose was never produced (ASSETS-TODO.md); a substitute clip is not used. Moves to a bubble when the asset lands |
| 06 s3 stem (166) | "בקערה" | unchanged, "בקערה" | kept as the deck has it; the reviewer's request on slide 161 to name the collecting vessel the same way everywhere is open (D1) |

## Known deck inconsistencies left as they are

Not changed, recorded so nobody "fixes" them by accident.

- **01 s16, options c/d:** the screen writes "כן, בגלל…"; slide 71 has no comma. Reported text, so a
  change here moves the catalog too. Left as it is by QA decision, 2026-10-11 (N19).
- **01 s18 feedback agreement:** "מתאימים" (45) and "מתאימה" (44) stay as the deck has them; no
  unifying round is planned (N20, QA 2026-10-11).
