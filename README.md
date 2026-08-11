# methodica-science-volume-solid-01 — מדידת נפח מוצק

A 720-series Hebrew e-learning unit (לומדה) in six components, RTL, plain HTML/CSS/JS with no build
step. Reporting targets **720 technical guidelines v2.4** and the **KATA State API**.

```
index.html                    redirect to component 01, carrying ?slxapi + ?registration
methodica-…-01 … -06/         the six components: index.html + js/main.js + css/ + assets/
unit-js/                      the shared layer — one copy of everything common to all six
unit-css/  unit-assets/       shared styles and fonts
metadata/                     the catalog: 1 unit + 6 components + 23 items
_test/                        the local verification harness (not shipped)
```

## Documentation

| Read this | For |
|---|---|
| [unit-js/README.md](unit-js/README.md) | the shared layer, the hook contract, and **three standing rules** that must not be broken |
| [docs-and-tools/REPORT-XAPI.md](docs-and-tools/REPORT-XAPI.md) | every statement, where it fires, id shapes, denominators, `success` policy |
| [docs-and-tools/RESUME.md](docs-and-tools/RESUME.md) | the state document, the ledgers, restore, `?resetState`, and what is **not** yet verified |
| [docs-and-tools/ROUTING-AND-RETAKE.md](docs-and-tools/ROUTING-AND-RETAKE.md) | the flow graph, who owns the retake, the three attempt-ending sites |
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
?xapiLib=../_test/xapi-720-j.js
```

**Start every local run with `?resetState`** — off-platform there is no `?registration`, so one document
is shared by every local run and a full ledger makes it look as if reporting has stopped.

## Checks

```bash
node _test/checks.mjs
```

Five static gates: identifier collisions, `?v=` equality across the six `index.html`, `TOTAL_SCREENS`
vs markup, metadata id resolution, and `SCREEN_TO_SUBCONTENT` completeness. All five must stay green.

> **Deploy all six component folders atomically.** A part left on a different `RESUME_ENABLED` setting
> or state-document version writes a document its siblings discard, which wipes the `completed` ledger
> on every hop.

## Status

Reporting is v2.4-conformant and resume is enabled. **Nothing has been verified against a live Kata
launch** — no real `?slxapi`/`?registration`, and the State API has never been exercised over HTTP.
The open list is at the end of [docs-and-tools/RESUME.md](docs-and-tools/RESUME.md); reporting questions for the platform are at the
end of [docs-and-tools/REPORT-XAPI.md](docs-and-tools/REPORT-XAPI.md).

Content completeness is tracked separately and is **not** release-ready: see
[docs-and-tools/ASSETS-TODO.md](docs-and-tools/ASSETS-TODO.md). `CHARACTER_ASSETS` currently declares one pose while
`CHARACTER_SLOTS` names eleven.
