# methodica-science-volume-solid-01 — מדידת נפח מוצק

A 720-series Hebrew e-learning unit (לומדה) in seven components, RTL, plain HTML/CSS/JS with no build
step. Reporting targets **720 technical guidelines v2.4** and the **KATA State API**.

Components (since 2026-10-14, per the updated script; until then standard practice was the end of
part 01 and the later parts were numbered one lower): **01** הוק והקניה · **02** תרגול סטנדרטי (the 4-of-5
gate) · **03** תרגול בסיסי + סטנדרטי ב · **04** משימת כיתה · **05** תרגול מתקדם · **06** שאלת שיא
(מועד א) · **07** שאלת שיא (מועד ב). Flow and gates: [ROUTING-AND-RETAKE.md](docs-and-tools/ROUTING-AND-RETAKE.md);
every screen: [SCREENS.md](SCREENS.md).

> **Slide numbers** in this repo (docs and code comments, `sbNN`) refer to the pre-split deck
> (13.7.26). The 7-component deck inserts a divider at slide 50 ("רכיב 2: תרגול סטנדרטי"), so from
> slide 50 on its numbers are one higher.

```
index.html                    redirect to component 01, carrying ?slxapi + ?registration
methodica-…-01 … -07/         the seven components: index.html + js/main.js + css/ + assets/
unit-js/                      the shared layer — one copy of everything common to all seven
unit-css/  unit-assets/       shared styles and fonts
metadata/                     the catalog: 1 unit + 7 components + 23 items
_test/                        the local verification harness (not shipped)
```

## Documentation

| Read this | For |
|---|---|
| [unit-js/README.md](unit-js/README.md) | the shared layer, the hook contract, and **three standing rules** that must not be broken |
| [docs-and-tools/REPORT-XAPI.md](docs-and-tools/REPORT-XAPI.md) | every statement, where it fires, id shapes, denominators, `success` policy |
| [docs-and-tools/RESUME.md](docs-and-tools/RESUME.md) | the state document, the ledgers, restore, `?resetState`, and what is **not** yet verified |
| [SCREENS.md](SCREENS.md) | every screen of every component: type, catalog item, question, storyboard slides |
| [docs-and-tools/ROUTING-AND-RETAKE.md](docs-and-tools/ROUTING-AND-RETAKE.md) | the flow graph, who owns the retake, the attempt-ending sites |
| [docs-and-tools/METADATA-KNOWN-ISSUES.md](docs-and-tools/METADATA-KNOWN-ISSUES.md) | the bare unit id and what else is open in `metadata/` |
| [_test/README.md](_test/README.md) | the harness, its console helpers, and the cache traps |
| [docs-and-tools/SEND-METADATA.md](docs-and-tools/SEND-METADATA.md) | pushing `metadata/` to the platform |

`_test/baselines/` holds the stage-by-stage working record of the reconstruction — what was found,
what was decided and why. The documents above are the current-state reference; the baselines are the
history behind it.

## Running it locally

```bash
python -m http.server 8744 --directory .
```

Then open `http://localhost:8744/methodica-science-volume-solid-01-01/`.

The real xAPI library loads off-platform too, but with no `?slxapi` it sets `XAPI_DISABLED` and every
statement is a silent no-op — while `window.METADATA` still loads for real, so ids and the bug-report
form work. To observe statements and exercise the State API, load the local stub:

```
?xapiLib=../_test/xapi-720-k.js
```

**Start every local run with `?resetState`** — off-platform there is no `?registration`, so the fallback
keys every local run of a part to one document and a full ledger makes it look as if reporting has
stopped. Add `&registration=<anything>` to simulate a Kata launch, or `&dev=1` (no registration) to open
the dev-only hops between parts.

## Checks

```bash
node _test/checks.mjs
```

Six static gates: identifier collisions, `?v=` equality across the seven `index.html`, `TOTAL_SCREENS`
vs markup, metadata id resolution, `SCREEN_TO_SUBCONTENT` completeness, and markup structure. All six
must stay green. `_test/verify-report.js` (reporting/resume layer, 1539 checks) and
`_test/verify-resume.js` (resume painters, 530 checks) run in jsdom — see `_test/README.md`.

> **Deploy all seven component folders atomically**, with one `?v=` token on every shared file and
> `js/main.js` — a part on a stale `40-resume.js` discards the v5 document.

## Status

Reporting and resume follow the MOE 2.7 / Kata model since 2026-10-20 (library `xapi-720-k.js`,
one State document per component, platform-owned routing, `result.response` = the metadata text;
see `docs-and-tools/REPORT-XAPI.md`, `RESUME.md`, `ROUTING-AND-RETAKE.md`). Verified with the local
stub, headlessly, and **live against production Kata on 2026-10-20**
(`docs-and-tools/LIVE-VERIFICATION-2026-10-20.md`); metadata is in the catalogue and the seven
components are published.
Open: part 06's `recommendedAfterFail` must name part 07 for Kata to route a failed מועד א to the
retake (`METADATA-KNOWN-ISSUES.md` §3).

Content completeness is tracked separately and is **not** release-ready: see
[docs-and-tools/ASSETS-TODO.md](docs-and-tools/ASSETS-TODO.md). `CHARACTER_ASSETS` currently declares one pose while
`CHARACTER_SLOTS` names eleven.
