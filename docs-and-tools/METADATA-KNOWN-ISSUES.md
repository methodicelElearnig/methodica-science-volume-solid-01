# Metadata — known issues

What is wrong in `metadata/*.json`, what it costs, and what was deliberately left alone. Nothing here
blocks reporting or resume; all of it is worth fixing before or alongside the next metadata push.

Companions: [REPORT-XAPI.md](REPORT-XAPI.md) · [SEND-METADATA.md](SEND-METADATA.md)

---

## 1. The unit `id` was the bare prefix — **closed 2026-10-20**

`metadata/methodica-science-volume-solid-01_unit.json` `id` and every component's `learningUnitId`
are now the bare slug `methodica-science-volume-solid-01` (2.7 metadata rewrite); `window.XAPI_UNIT_ID`
in `unit-js/10-identity.js` matches. Kata's `uniqueKey` is the slug, not `"01"`. The metadata had
not been pushed before the change, so no rename in the catalogue is needed.

---

## 2. `send-metadata.ps1` lacks two guards the sibling has — **open**

This repo's script is 340 lines; the sibling's is 551. Missing:

- **the `uniqueKey` degradation guard** that throws when an id's last segment degrades to something like
  `"01"` — the exact fault above, which the sibling added *after* hitting it;
- **`masteryLevel` forwarding.** None of the seven component files declares `masteryLevel` at all, and the
  sibling discovered it was being silently dropped on push.

Porting both is cheap and prevents a silent recurrence.

---

## 3. Part 06's `recommendedAfterFail` is empty — **open, now load-bearing**

`[]`, while the reference unit's 06 names its 07. Until 2026-10-20 the content routed a failed מועד א
to part 07 itself (`peakGoRetake`); the platform owns routing now and **has no route from a failed
מועד א to the retake** until the metadata names
`https://lomdot.education.gov.il/metodica/720active/science/volume-solid/01/methodica-science-volume-solid-01-07/`.
Metadata is the content owner's; flagged, not changed (decision 2026-10-20). Parts 06 and 07 both
carry `order: 6`, as in the reference.

The one non-empty `recommendedAfterFail` in the unit is part 03's, which names 02 — the same shape as
the reference unit's remediation component.

---

## 4. Deliberately NOT changed

| | why |
|---|---|
| **Trailing slashes** on unit, component and item ids | the convention this unit's metadata already carries; `xapiItemId()` emits them and `_xapiTrim()` normalises them away for matching. Consistency with the code is what matters, and it is already consistent |
| **Absolute `questionId` IRIs** (since the 2.7 rewrite) | `xapiQ()` returns them as-is; the bare `"qN"` form is still accepted |
| **Item/component id nesting** | already correct: `<prefix><comp>/` and `<comp><comp>-NN/`. It was the *code* that was wrong, building `<prefix><comp>-NN/` and matching nothing |

---

## 5. The applets have no catalog questions — **content decision pending**

Part 01's displacement, flooding and measurement applets, its two guess screens and the hook's
free-text screen are substantial interactions with **no metadata question**. Since 2026-10-20 they
are not reported at all (`interacted` is outside the 720 verb list). Making them measurable needs
item questions in the metadata — a content decision with a metadata push attached.

---

## 6. Part 05 item 01 q1 — `correctAnswers` names the wrong option — **open (audit E1, 2026-10-20)**

`metadata/methodica-science-volume-solid-01-05.json` lists `"יעל צודקת. הניסוי מודד רק מים…"` as the
correct answer; the screen (`main.js` `correctId: 'a'`, the item's own `informationToBot` "יעל טועה")
grades `"המים שעלו הם ראיה ישירה לכך שהטבעת תופסת מקום במרחב…"` as correct. The screen's options were
re-ordered to the deck and the metadata took the first option. Until the metadata is fixed, Kata's view
of 05/q1 inverts right and wrong. Also from the same audit (warnings W1/W2): the two matching questions
list `correctAnswers` in `answers.target` order while the response is emitted in `answers.source`
order — the reference unit keeps them in source order. Full report: [METADATA-AUDIT.md](METADATA-AUDIT.md).
Do not push the metadata to Kata before E1 is resolved.

---

## Verification available today

`node _test/checks.mjs` gate 4 runs the **real** `xapiItemId`/`xapiQ` from `unit-js/20-xapi.js` against
all eight metadata files (unit + seven components) and asserts every item id, question id and `parent` matches byte-for-byte:

```
4. metadata id resolution (real xapiItemId/xapiQ vs metadata/*.json)
  ok    23 items / 30 questions resolve byte-for-byte, parents correct
```

Gate 5 additionally asserts every screen in every part maps to a real metadata item, and reports any
metadata item that no screen maps to.
