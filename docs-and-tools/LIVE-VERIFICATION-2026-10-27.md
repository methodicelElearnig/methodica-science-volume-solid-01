# Live verification — item split in part 01, 2026-10-27

Package `../../deployments/2026-10-27` (commit `ad9cbf9`). Why: `QA/2026-10-26` — the bot answered about
the learning path the learner had not chosen; the acquisition item 02 is now 02 choice / 03 comic /
04 experiments, warm-ups 05 / 06.

## CDN upload

All 9 files match the package by byte size (cache-busted requests); `metadata/…-01-01.json` and
`-01/js/main.js` are also byte-identical by content.

| File | Bytes |
|---|---|
| `metadata/methodica-science-volume-solid-01-01.json` | 12,762 |
| `methodica-science-volume-solid-01-01/index.html` | 137,446 |
| `methodica-science-volume-solid-01-01/js/main.js` | 172,560 |
| `methodica-science-volume-solid-01-02 … -07/index.html` | 33,759 · 37,381 · 8,111 · 35,680 · 22,826 · 20,509 |

## KATA send — component 01 only

`send-metadata.ps1 -MetadataDir <unit json + component 01 json>` (key from `KATA_API_KEY`).

    UPDATED unit, component 01, items 01–04 (HTTP 200)
    CREATED items 05, 06 (HTTP 201)
    Done. created=2 updated=6 failed=0

All seven components stay `published` (`-Status`).

## Read back

`retrieve-metadata.ps1`: `unit=1 components=7 items=25 warnings=0`.

- Component 01, `metadata/` vs `metadata-from/`, ignoring formatting, timestamps and the two fields KATA
  derives: component fields identical (`estimatedTimeInMinutes` 12), 6 items in both, every item identical.
- The unit and components 02–07 are **unchanged** compared with the snapshot taken before the send
  (`../../deployments/kata-snapshots/2026-10-27-before-split`), so the values edited in Kata
  (`estimatedTimeInMinutes` of 03 / 04 / 06 / 07, the unit's `manufacturer`) are kept.

## Not checked here

- The bot's answers on each path — the platform team checks that after our notice.
- A live xAPI run inside KATA — covered locally by `verify-report.js` and the browser walk of both paths.
