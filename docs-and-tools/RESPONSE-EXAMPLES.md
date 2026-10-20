# `result.response` — what this unit sends, per question type

MOE (mail 19/10/2026, `Documentation/MOE/דיוק ביישום תקן XAPI.docx`) requires `response` to match
the metadata `answers` / `correctAnswers` strings in the xAPI interaction formats (ADL
`xAPI-Data.md` §4.1.6.1). Kata's `questionType` enum is the xAPI `interactionType` vocabulary and Kata
compares `response` to the metadata, so **the metadata text is the identifier**: never a DOM id,
never click order. Builders: `unit-js/20-xapi.js` (`xapiResponse` and the per-type functions).

Captured 2026-10-20 from the stub walk (`_test/xapi-720-k.js`, every part); the live Kata statements
are identical in shape (the library passes `result.response` through verbatim).

## choice — every SCQ, dropdown, image hotspot and peak סעיף

The option's visible text (`xapiAnswerText`, with tooltips/badges dropped and `<br>` read as a
space), resolved to the metadata string. Multi-select would be `A[,]B` in `answers` order.

```
01 item 02 q1   wrong first try   "100 סמ\"ק"        success false, scaled 0   (verb: answered)
01 item 02 q1   closing try       "1,000 סמ\"ק"      success true,  scaled 1   (verb: answered.last)
01 item 04 q1   dropdown          "עלו"
03 item 05 q1   hotspot (AREA aria-label)  "אזור העלייה — התוספת שמעל המפלס המקורי"
06 item 01 q2   peak              "כדי לוודא שהצורה של הפסל לא השתנתה. כדאי לדווח את הקריאה הראשונה = 60 סמ\"ק"
07 item 01 q4   peak, <br> inside the option  "בשיטת ההצפה נאספו בממוצע 1,250 מ\"ל מים, ונפח המים שנדחק שווה לנפח הגוף שהוכנס למים"
```

## matching — 01 s28 (item 03), 02 s4 (item 04)

`ddqPairs(cfg)` hands the layer `{source: item label, target: target label}` per placed item; the
layer emits one `S[.]T` per `answers.source`, in source order, `S[.]` for an unplaced source.

```
01 item 03 q1
"מה המסה של האבטיח?[.]מדידה במאזניים דיגיטליים[,]מהו הנפח של בובת הפלסטיק הגדולה?[.]שיטת ההצפה[,]מהו הנפח של הצדף הקטן?[.]שיטת דחיקת מים[,]מה אורך הצלע של הקובייה?[.]מדידה בסרגל[,]כמה מים יש בכוס?[.]מזיגה למשורה"

02 item 04 q1
"צדפה[.]שיטת דחיקת המים[,]גביע גדול[.]שיטת ההצפה[,]קוביית מתכת[.]מדידה הנדסית בעזרת סרגל"
```

The non-breaking spaces in 01 s28's pill labels (`מה המסה של האבטיח?`) are collapsed by the
lookup's normalisation; the emitted text is the metadata's.

## A full `answered.last` as the stub recorded it

```json
{ "verb": "answered.last", "objectType": "question",
  "opts": { "questionId": "https://lomdot.education.gov.il/metodica/720active/science/volume-solid/01/methodica-science-volume-solid-01-02/methodica-science-volume-solid-01-02-04/q1",
            "parentId":   "https://lomdot.education.gov.il/metodica/720active/science/volume-solid/01/methodica-science-volume-solid-01-02/methodica-science-volume-solid-01-02-04/" },
  "result": { "success": true, "score": { "scaled": 1 },
              "response": "צדפה[.]שיטת דחיקת המים[,]גביע גדול[.]שיטת ההצפה[,]קוביית מתכת[.]מדידה הנדסית בעזרת סרגל",
              "extensions": { "student_answer": ["צדפה → שיטת דחיקת המים | גביע גדול → שיטת ההצפה | קוביית מתכת → מדידה הנדסית בעזרת סרגל"] } } }
```

The library builds the statement from this: `object.id` = `questionId`,
`context.contextActivities.parent` = `[{id: parentId}]`, `context.registration` from the launch,
`result.response` verbatim. `extensions.student_answer` is the readable fallback for library letters
below `k`; `-k` ignores it when `response` is present.

## Not sent

- Part 04's class-task item is ungraded (`fill-in` with no answer UI): no `answered`, only item
  `initialized`/`completed` and the component `completed {success:true}`.
- The applets, guesses, open hook question and comic panels: no catalogue question, no statement.

## Checks

`_test/verify-report.js` H9/H10/H12/H13 round-trip every declared question through the real builders
(canonical order, `S[.]` for unplaced, no DOM-id syntax, warning on an unresolvable text);
`docs-and-tools/check-metadata.py` cross-checks the UI option texts against the metadata.
