# `_test/` — the local verification harness

**Not shipped.** Nothing in the deployed lomda references this directory. It exists so the
reporting and resume layers can be exercised on a dev server, where there is no LRS.

| File | What it is |
|---|---|
| `xapi-720-k.js` | stand-in for the CDN library — statements, State API, console helpers, the sweep oracle |
| `checks.mjs` | six static gates: identifier collisions, `?v=` equality, `TOTAL_SCREENS` vs markup, metadata id resolution, `SCREEN_TO_SUBCONTENT` coverage, markup structure — over all seven parts |
| `verify-report.js` | headless (jsdom) + static check of the reporting/resume layer: identity, wiring, routing/devnav, response layer H1–H13, shared-layer invariants, statement flow, document shape, character — see below |
| `verify-resume.js` | headless (jsdom) check of the resume painters — see below |
| `viewer.html` | local QA viewer: jump to any screen of any of the seven components. Not shipped |
| `baselines/` | sweep output captured at each stage; the acceptance gate for the extraction |
| `REPORTING-ADDING.superseded.md` | archived — it documents `mass-measure`, not this unit. See its banner |

## `xapi-720-k.js`

A stand-in for the CDN library. Loaded only via the query parameter:

```
http://localhost:8744/methodica-science-volume-solid-01-01/?xapiLib=../_test/xapi-720-k.js
```

`unit-js/50-loader.js` honours `?xapiLib` **on localhost only**, and only for a same-origin
relative path.

> ⚠️ **After editing this stub, add a cache buster** or the browser serves the old copy and your
> change appears not to work: `?xapiLib=../_test/xapi-720-k.js%3Fv%3D2` (the `?v=` URL-encoded). The
> loader's same-origin check permits it and the `XAPI_USING_G` filename match still holds.

It loads the component and unit metadata **for real**, because `window.METADATA` is what `xapiQ()`
resolves question ids from and what the bug-report form takes its unit/component/item ids from. It
also reproduces one quirk of the real library on purpose: `window.METADATA` is briefly a *promise*
before the resolved object replaces it, which is what keeps `50-loader.js`'s `settleMetadata()`
exercised locally.

### Mode B is the mode

`?xapiLib=…` turns the item layer on because the stub's filename ends in `xapi-720-k.js`, which the
`XAPI_USING_G` regex matches. Add `&registration=<anything>` to simulate a Kata launch (`DEV_NAV`
off, one State document per registration in `sessionStorage`) and `&resetState` to start clean;
`&dev=1` without a registration opens the dev hops and the cross-part back button.

> ⚠️ **The filename must keep the `xapi-720-k.js` ending.** `50-loader.js` derives
> `window.XAPI_USING_G` from a regex on the library URL (`/xapi-720-[ghijk]\.js/`). Rename the file
> and item-level `initialized`/`completed` and the video `played`/`paused` all go silent — with no
> error, because `xapiOnScreen()` and `xapiWireVideos()` early-return on that flag.

State (one document per part, keyed by the state id) and the statement log live in `sessionStorage`,
so both survive reloads and the dev-only cross-part hops. `saveState720Debounced` really does defer by 800 ms, so the
stale-timer race that the cross-part handoff guards against is reproducible here.

### Console helpers

| Call | What it gives you |
|---|---|
| `__stmts()` | every statement sent this session, across parts |
| `__state()` / `__setState(doc)` | this part's resume document / seed one |
| `__reset()` | clear every part's document, the log, the forced-failure flag, the character cache and the verdict mirror |
| `__lastState()` | the `-k` diagnostics of the last State call: `{op, status, ok, reason}` |
| `__failWrites(true \| 413 \| 401 \| 0)` | make `saveState720` fail, with a specific status to reach each `reason` branch |
| `__dupes()` | duplicate `completed` per object — empty is the pass condition |
| `__screenIds()` | every `data-screen` value present in this part's markup |
| `__sweep()` | drive `goTo()` over all of them and return a normalised, diffable log |

`__dupes()` deliberately ignores `initialized`: the spec **requires** it again on every re-entry, so a
repeat there is conformance, not a defect.

## The sweep oracle

`__sweep()` walks every `data-screen` value **present in the markup**, not `0..TOTAL_SCREENS-1`.
That distinction matters here: screen ids are neither DOM order nor flow order (part 05's scenario screens s10/s9 sit outside the numeric flow, and parts 06/07 read
their scenario s5 between s0 and s1; before the 2026-10-14 renumbering part 01's practice questions
ran 13, 14, 15, **17**, 16), so a positional loop would both miss screens and visit ones that do not exist.

Its output is the **acceptance gate for the shared-layer extraction**: a pure move must leave
`visited` and `statements` unchanged. Baselines live in `_test/baselines/`.

It needs a browser (it drives `goTo()` against a live DOM), so there is no node runner. With the
dev server up, load a part and run:

```js
(async () => {
  const src = await (await fetch('/_test/xapi-720-k.js')).text();
  (new Function(src))();
  return await window.__sweep();
})()
```

`__sweep()` calls `__reset()` first, so boot-time statements are excluded by design and only what
`goTo()` emits is measured — which is precisely the invariant a pure move must preserve.

## The static gates

```bash
node _test/checks.mjs
```

Six checks, all of which exist because the failure they catch is silent:

1. **Identifier collisions** between `unit-js/*.js` and each part's `js/main.js`. A `let`/`const`
   collision is a loud `SyntaxError`, but a **`var`/`function` collision is a silent last-wins
   overwrite** — and `main.js` loads *after* the shared files, so a leftover part-local copy wins
   and the extraction looks successful while shipping the old code. Hook names are the expected
   exceptions.
2. **`?v=` equality** across all seven `index.html` for every shared URL. All seven reference the same
   files, so a mismatch means one part fetches a second copy under a different URL and two parts
   can execute different versions of the same logic inside one learner session.
3. **`TOTAL_SCREENS` vs the markup** — the constant and the `.screen` count must agree, or `goTo()`
   rejects screens that exist while the dev bridge offers screens that do not.

4. **Metadata id resolution** — runs the *real* `xapiItemId`/`xapiQ` out of `unit-js/20-xapi.js`
   against every `metadata/*.json`, asserting that each item id, question id and `parent` matches
   byte-for-byte. A second copy of the id logic here would be free to drift from the one that ships,
   which is the whole class of bug the check exists to catch.
5. **`SCREEN_TO_SUBCONTENT` completeness** — every screen `0..TOTAL_SCREENS-1` mapped, every item
   suffix present in that part's metadata. An unmapped screen reports no item, silently.
6. **Markup structure** — unique ids and balanced `<div>` nesting, file-wide and per screen.

> ⚠️ Every check here derives the part list from the filesystem, never a hard-coded array. The
> equivalents in `methodica-math-scale-01` iterate `['01'…'05']`; copying one of those verbatim
> would **silently skip parts 06 and 07** — both peak attempts, including the retake (07), the
> least-exercised component in the unit.

## What no check can catch: the cache

Three times during the reconstruction a change appeared not to work because the browser was serving a
stale file. None of it is detectable statically — the old bytes exist only in the browser — so it is
procedure:

| After editing | Bump |
|---|---|
| a part's `js/main.js` | that part's `js/main.js?v=` |
| a shared `unit-js/*.js` | that file's `?v=` in **all seven** `index.html` (gate 2 enforces they agree, not that you bumped) |
| `_test/xapi-720-k.js` | the `?v=` inside the `?xapiLib` value |

The failure mode is the nastiest one in this codebase: `main.js` loads *after* the shared layer, so a
cached `main.js` still carrying a part-local copy of an extracted function **wins**, and the
extraction looks successful while shipping the old code.

## `verify-report.js` and `verify-resume.js`

Both load each part's real `index.html`, `js/main.js` and `unit-js/*.js` in jsdom (the CDN never loads;
`verify-resume.js` injects the stub first and reproduces the loader's two-phase resume seam).

- `verify-report.js` (from `methodica-science-body-matter-01`, adapted to this unit's generic
  controllers): catalogue identity and the 2.7 metadata shapes, per-part wiring (script order, one
  `?v=` per file, boot cover, `XAPI_END_BTN`, `SCREEN_TO_SUBCONTENT` ↔ DOM ↔ catalogue,
  `XAPI_EVAL_ITEMS`), routing/devnav (every hop under `DEV_NAV`, no `postMessage`/close, no
  unit-scope statement), the response layer H1–H13 (census from the registrations, spec shapes,
  canonical strings round-tripped from the catalogue), shared-layer invariants, and the runtime group
  (regression gate without a library, statement flow with an inline recorder, B-1, one component
  `completed` for two clicks, no navigation, D-8, document shape/isolation, hints ledger, resume
  round trip, painter sweeps, the character's four steps). **1539 checks, 2026-10-20.**
- `verify-resume.js`: the painters — every SCQ screen of 01/02/03/05, both matching boards, the retry
  on 02 s4, the peaks, five real reloads and the comic. **530 checks.** Every assertion drives through
  `goTo()` or a genuine reload and checks an outcome, never "it did not throw"; any `[resume]`
  `console.error` fails the suite.

**jsdom is not in the repo and must not be installed into it** (OneDrive). It lives outside:

```bash
mkdir -p "$LOCALAPPDATA/lomda-jsdom" && cd "$LOCALAPPDATA/lomda-jsdom" && npm install jsdom@24
```

```bash
NODE_PATH="$LOCALAPPDATA/lomda-jsdom/node_modules" node _test/verify-report.js
```

```bash
NODE_PATH="$LOCALAPPDATA/lomda-jsdom/node_modules" node _test/verify-resume.js
```

(The `/tmp/lomda-test` install mentioned by older docs is incomplete — `xhr-sync-worker.js` is
missing — and jsdom fails to load from it.) Without jsdom, `verify-report.js` still runs its static
groups and reports the runtime group as skipped.
