# Live Kata verification — `methodica-science-volume-solid-01`, 2026-10-20

First live run of the unit against Kata (production catalogue + LRS + State API), per guide §12.
Everything below ran from the Claude desktop built-in browser against the real CDN, the real
`xapi-720-k.js` and the real Kata endpoints; nothing was stubbed.

## Preconditions

| step | result |
|---|---|
| Package `deployments/2026-10-20` (commit `f079b87`, 190 files, 91,181,666 bytes) uploaded to `https://lomdot.education.gov.il/metodica/720/science/volume-solid/01/` | **190/190 files verified by byte count** (size of every file fetched from the CDN = package size; 0 mismatches). The MOE CDN answers 200/0 bytes for a missing path, so size, not status, is the check. |
| Library on the CDN | `xapi-720-k.js`: 52,370 bytes, `stateReason720` ×2, `helpType` ×7, `__failWrites` ×0 — the real library, not the stub. |
| Metadata in Kata | created 2026-10-20 (`send-metadata-2026-10-20-create.log`: unit + 7 components + 23 items, 1 `recommendedAfterFail` link 03 → 02; all 201/200, 0 failed), read back with 0 warnings (`retrieve-metadata-2026-10-20-after-create.log`). |
| Components published | `POST /api/v1/component/publish?componentKey=…` for all seven → 200, each `published` (`publish-components-2026-10-20.log`). Part 01 read back: `hostedContentRef` = the CDN `index.html` above. |
| Launch links | `Tools/full-kata-link/New-KataLaunchLinks.ps1 -UnitKey methodica-science-volume-solid-01 -StudentId VADIM-VS01-TEST-1 -ResetState` → 7 links, one registration per component (pseudonymous learner). The CSV stayed in a scratch folder (it carries the reporting token). |

## How the walk was driven

Each part was opened by its launch link. After load an `XMLHttpRequest` hook recorded every
statement (verb, object, parent, category, extensions, result, HTTP status) and every State API
`PUT`. The boot-time statements (component `initialized`, and the item `initialized` where screen 0
already belongs to an item) fire before the hook and were read from the console
(`[XAPI initialized] report sent`). Answers were given through the pages' own functions
(`scqSelect`/`scqCheck`, `ddqRender`/`ddqCheck` with a placement model, `peakSelect`/`peakCheck`,
`aqMeasure`, `selectOption`, `selectPathOption`); the finish button's function was called twice.

Boot on every part: `XAPI_DISABLED === false`, `XAPI_USING_G === true`, `DEV_NAV === false`
(a registration is present), `METADATA.id === XAPI_COMP_ID` (no ID-mismatch error), the boot cover
gone, the first `loadState720` a **404 → `absent`** (the one console "Failed to load resource"
per fresh registration), no `console.error` of the unit's own.

## Results per part

Every statement below got **HTTP 200** and carried `context.registration` = the launch
registration; every State API `PUT` got **204**.

| part | walk | statements (after the boot `initialized`s) | finish |
|---|---|---|---|
| 01 | character turquoise; path experiments (`selected`, category `learning-type`, object = the component); s15 wrong → hint ×2 → right; s28 matching model board; s29 dropdown right; שנמשיך? ×2 | item 02 `initialized` (evaluation-item); `answered` 02/q1 ✗ `"100 סמ\"ק"`; `requested` 02/q1 with **`helpType: hint`** (one for two openings); `answered.last` ✓ `"1,000 סמ\"ק"`; item 02 `completed`; item 03 `initialized`; `answered.last` 03/q1 ✓ `"מה המסה של האבטיח?[.]מדידה במאזניים דיגיטליים[,]…"` (five pairs, source order); item 03 `completed`; item 04 `initialized`; `answered.last` 04/q1 ✓ `"עלו"`; item 04 `completed`; component `completed {success:true, scaled:1}` | one component `completed` for two clicks; button disabled; URL unchanged; State document ~1.2 KB |
| 01 relaunch | same link again | boot: component `initialized` then item 04 `initialized` — **nothing re-sent** | lands on s29 with the correct mark and the popup, button **disabled** (D-8); document v5 read 200 with `done`, 3 `doneItems`, 1 hint, `ui.character: turquoise`; `xapiItemAnswered` seeded for 3 items |
| 02 | s1 ✓; s2 ✗ → ✓; **reload**; s3 ✓; s4 matching ✓; s5 ✓; שנמשיך? ×2 | boot: Phase A adopted **turquoise** from part 01's cache and Phase B persisted it (first write 204); 001 ✓ `"23 סמ\"ק"`; 002 ✗ `"להעריך את נפח הכדור לפי העין"` → ✓; after the reload: 002 `completed`, 003 ✓, 004 ✓ `"צדפה[.]שיטת דחיקת המים[,]גביע גדול[.]שיטת ההצפה[,]קוביית מתכת[.]מדידה הנדסית בעזרת סרגל"`, 005 ✓; component `completed {success:true, scaled:1}` (5 of 5, the 4-of-5 gate) | **resume mid-walk:** the reload landed on s2 with its correct mark and popup, `practiceProgress` = correct,correct,…, `XAPI_Q_RESULTS` restored, library map seeded; one `completed`, button disabled, no navigation; the cross-part back button hidden by attribute and computed display |
| 03 | six right (s6: wrong → hint → right); שנמשיך? ×2 | 6 × item `initialized` (evaluation-item) / `answered` / `completed`; `requested` 05/q1 `helpType: hint`; the hotspot answer `"אזור העלייה — התוספת שמעל המפלס המקורי"` (from the AREA's `aria-label`); component `completed {success:true, scaled:1}` | one `completed`, button disabled |
| 04 (class task) | s0 → s1 → חזרתי ×2 | item 01 `initialized`; item 01 `completed` (no result — ungraded); component `completed {success:true}` (no score) | one `completed` for two clicks; button disabled; no navigation |
| 05 | eight סעיפים, s3 wrong twice; שנמשיך? ×2 | per item `initialized` / `answered(.last)` / `completed`; items 04 and 05 carry q1–q2 and q1–q3 against the same parent; 05-03 `completed {success:false, 0}` (`XAPI_ITEM_RESULT`); component `completed {success:true, scaled:0.875}` (7 of 8) | one `completed`, button disabled |
| 06 (מועד א, fail path) | q1 hint ×2, q1 ✗✗, q2 ✗✗, q3 ✗→✓, q4 ✗→✓; שנמשיך? ×2 | `requested` 01/q1 `helpType: hint` (once); 8 `answered`; item 01 `completed {success:false, scaled:0.5}`; component `completed {success:false, scaled:0.5}` | verdict `volume-solid-01_moedAPassed = "false"` in the document's `results` and the cache; button disabled; no navigation; back button hidden. The platform would route on `recommendedAfterFail` — **empty for 06 by the content owner's decision** (to be set directly in Kata) |
| 07 (מועד ב) | all four right; שנמשיך? ×2 | 4 `answered.last` ✓ (q4 `"בשיטת ההצפה נאספו בממוצע 1,250 מ\"ל מים, ונפח …"` — the `<br>`-wrapped option, now equal to the metadata); item 01 `completed {success:true, 1}`; component `completed {success:true, 1}` | one `completed`, button disabled |

Totals: 7 component `initialized`, 7 × item boot/entry `initialized`s as listed, 44 `answered`,
3 `requested`, 7 component `completed`, 24 item `completed`, 1 `selected`, 0 unit-level
statements — all accepted (200). ~80 State API writes, all 204; 2 relaunch reads, 200.

## What this confirms

- **Ids:** every `object.id` is the catalogue id (component / item / question IRIs under
  `720active/science/volume-solid/01/`); `context.contextActivities.parent` = the item on every
  `answered`; the `evaluation-item` category on the `initialized` of graded items.
- **`result.response` per the xAPI formats (MOE 19/10/2026):** choice = the metadata option text,
  matching = `S[.]T[,]S[.]T` in `answers.source` order — byte for byte the metadata strings.
  `requested` carries `helpType: hint`.
- **Scores:** `success`/`score.scaled` per question; item `completed` from the item's own answers or
  `XAPI_ITEM_RESULT`; component `completed` from the promised denominators (02: 5 of 5 → `success`
  on the 4-of-5 gate; 05: 7 of 8; 06: 2 of 4 → fail at 0.5; 07: 4 of 4).
- **One `completed` per object**, the finish button stays disabled, the part never navigates.
- **Resume:** the State API document (v5, one per registration) round-trips; a relaunch lands on
  the stopped-at screen painted, re-sends nothing but `initialized`, and keeps the finish button
  disabled; a reload mid-part restores answers, progress and the library's answered map.
- **Character across components:** chosen in part 01, adopted by parts 02–07 (each under its own
  registration) from the per-unit cache and written into each part's document.

## Not covered by this run

- A platform-initiated **re-take** (Kata clearing a component's State) — the launcher's
  `resetState` was used only to create fresh registrations.
- Kata **routing** on `completed` / `recommendedAfterFail` (the launch links were opened directly;
  no platform frame removed the component).
- Reading statements back from the LRS (the reporting token cannot; 403 in the reference unit).
- Two devices / two tabs on one registration.

## Known library behaviour, unchanged

`xapi-720-k.js` logs the whole `slxapi` envelope — including the Bearer token — to the console at
boot (`[XAPI Parameters] Ready`). Known upstream issue, library header; not a unit defect.
