# Live verification — `selected` / learning-type on the part-01 choice, 2026-11-02

Package `../../deployments/2026-11-02` (commit `43ff99f`). Why: step 7 of the `selected` / learning-type
plan — this unit sent `selected` on every card click, with objectType `question` and `comic` /
`experiments` as `response`; it now reports the confirmed choice and the path toggle, once per path, with
the chosen path item's `mediaFormat` (guide `Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md`
§6.3a).

## CDN upload

All 9 files are **byte-identical** to the package (cache-busted downloads compared with `cmp`):

| File | Bytes |
|---|---|
| `unit-js/20-xapi.js` | 30,258 |
| `-01/js/main.js` | 173,052 |
| `-01/index.html` | 137,446 |
| `-02/index.html` | 33,759 |
| `-03/index.html` | 37,381 |
| `-04/index.html` | 8,111 |
| `-05/index.html` | 35,680 |
| `-06/index.html` | 22,826 |
| `-07/index.html` | 20,509 |

The live metadata `metadata/methodica-science-volume-solid-01-01.json` (12,762 bytes) is unchanged and
identical to the package: 03 `text`, 04 `interactive-content` — the values the statement's `response`
copies.

## Live part 01 (CDN page, `sendStatement720` captured in the page — nothing sent to Kata)

`https://lomdot.education.gov.il/metodica/720/science/volume-solid/01/methodica-science-volume-solid-01-01/index.html`

- Loads `../unit-js/20-xapi.js?v=20261102` and `js/main.js?v=20261102`; `XAPI_LEARNING_PATHS` = `comic` →
  03 `text`, `experiments` → 04 `interactive-content`.
- s7: two card clicks → **no** `selected` (before: one per click).
- בחרתי on experiments → s15 and **one** statement: verb `selected`, objectType `onlinelesson` (the
  library uses the component id), `{ category: 'learning-type' }`, `result.response` =
  **`interactive-content`**.
- Back to s7, בחרתי again → nothing (picks ledger).
- Comic toggle → s8 and **one** `selected`, `response` = **`text`**.
- Experiments toggle → s15 and nothing (already reported).
- Item statements unchanged: 02 on s7, 04 on the experiments, 03 on the comic.

## Not checked here

- The statement as stored in Kata — a platform launch (`?slxapi=`) is needed; the platform team checks it
  after our notice (`Documentation/MOE/NOTE-TO-PLATFORM-selected-learning-type-2026-11-02.md`).
- How the platform / bot reads `response` = `mediaFormat` (agreed deviation from v2.7's `contentType`).
