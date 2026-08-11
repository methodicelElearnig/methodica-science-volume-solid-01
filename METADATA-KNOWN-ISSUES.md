# Metadata — known issues

What is wrong in `metadata/*.json`, what it costs, and what was deliberately left alone. Nothing here
blocks reporting or resume; all of it is worth fixing before or alongside the next metadata push.

Companions: [REPORT-XAPI.md](REPORT-XAPI.md) · [SEND-METADATA.md](SEND-METADATA.md)

---

## 1. The unit `id` is the bare prefix — **open, accepted for now**

```json
// metadata/methodica-science-volume-solid-01_unit.json
"id": "https://lomdot.education.gov.il/metodica/720active/science/volume-solid/01/"
```

The sibling unit uses `<prefix><unit-slug>/`, i.e. `…/01/methodica-math-scale-01/`. This unit stops at
the bare folder.

**Why it matters.** Kata derives a `uniqueKey` from the **last path segment** of an id. Here that
resolves to the string `"01"`, which collides with every other unit numbered 01 in every subject.

**What actually breaks:**

| | |
|---|---|
| **Catalog** | `uniqueKey` is `"01"` — not unique across the platform |
| **Unit-scope `object.id`** | unit `initialized`/`completed` target `…/volume-solid/01/`. v2.4 §3 asks for ids that unmistakably identify the organisation; `01` as the terminal segment is close to the `question_1` anti-pattern it names |
| **Bug reports** | `shortId(meta.learningUnitId)` writes `"01"` into the Google-Form unit column, so rows are hard to attribute |

**What does NOT break: resume.** Kata addresses a state document by `?registration` alone, so
`XAPI_UNIT_ID` is never sent to it. It only keys the off-platform localStorage fallback, and that key is
already unique because the prefix carries subject and topic. The warning in the sibling's docs is a
*catalog and reporting* warning, not a state one — worth saying out loud so nobody blocks resume on it.

**The fix, when it happens:** change `id` in `_unit.json` and `learningUnitId` in all six component
files to `<prefix>methodica-science-volume-solid-01/`, and update `window.XAPI_UNIT_ID` in
`unit-js/10-identity.js` to match.

**The cost depends on whether the metadata has been pushed.** Evidence in this repo says it has not —
there is no `kata-api-key.txt`, no `send-metadata.log`, no `metadata-from/`, and no
`retrieve-metadata.ps1`. **Confirm with a dry run before assuming.** If it *has* been pushed, changing
the id changes the `uniqueKey`, so the upsert **creates a second unit** rather than renaming one: the
stale `01` unit then needs a manual delete, and any statements already carrying
`object.id = …/01/` are orphaned from the new unit. Do not attempt a rename through the script.

---

## 2. `send-metadata.ps1` lacks two guards the sibling has — **open**

This repo's script is 340 lines; the sibling's is 551. Missing:

- **the `uniqueKey` degradation guard** that throws when an id's last segment degrades to something like
  `"01"` — the exact fault above, which the sibling added *after* hitting it;
- **`masteryLevel` forwarding.** None of the six component files declares `masteryLevel` at all, and the
  sibling discovered it was being silently dropped on push.

Porting both is cheap and prevents a silent recurrence.

---

## 3. Part 05's `recommendedAfterFail` is empty — **deliberate, documented**

`[]`, while the code routes 05 → 06 itself via `peakGoRetake()`. This is a decision, not an omission:
declaring both would make part 06 reachable two ways, one of which brings a fresh Kata registration and
therefore a different state document. Full reasoning in
[ROUTING-AND-RETAKE.md](ROUTING-AND-RETAKE.md).

---

## 4. Deliberately NOT changed

| | why |
|---|---|
| **Trailing slashes** on unit, component and item ids | the convention this unit's metadata already carries; `xapiItemId()` emits them and `_xapiTrim()` normalises them away for matching. Consistency with the code is what matters, and it is already consistent |
| **Bare `questionId` values** (`"q1"`) | `xapiQ()` resolves them to full IRIs at runtime, so the *emitted* `object.id` satisfies v2.4 §5 with **no metadata change**. Making the catalog's `questionId` a URL too is optional polish, not worth a push on its own |
| **Item/component id nesting** | already correct: `<prefix><comp>/` and `<comp><comp>-NN/`. It was the *code* that was wrong, building `<prefix><comp>-NN/` and matching nothing |

---

## 5. The applets have no catalog questions — **content decision pending**

Part 01's displacement, flooding and measurement applets, its two guess screens and the hook's
free-text screen are substantial interactions with **no metadata question**, so they can only be
reported as `interacted`. Item 02 (`הקנייה`) spans ~19 screens and holds exactly one question, on s10.

If any of these should be *measurable*, they need item questions in the metadata — which is a content
decision with a metadata push attached. Until then, reporting them as `answered` would be
non-conformant: v2.4 makes `parent` mandatory on `answered` and there is no item question to parent to.

---

## Verification available today

`node _test/checks.mjs` gate 4 runs the **real** `xapiItemId`/`xapiQ` from `unit-js/20-xapi.js` against
all seven metadata files and asserts every item id, question id and `parent` matches byte-for-byte:

```
4. metadata id resolution (real xapiItemId/xapiQ vs metadata/*.json)
  ok    23 items / 31 questions resolve byte-for-byte, parents correct
```

Gate 5 additionally asserts every screen in every part maps to a real metadata item, and reports any
metadata item that no screen maps to.
