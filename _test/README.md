# `_test/` — the local verification harness

**Not shipped.** Nothing in the deployed lomda references this directory. It exists so the
reporting and resume layers can be exercised on a dev server, where there is no LRS.

| File | What it is |
|---|---|
| `xapi-720-j.js` | stand-in for the CDN library — statements, State API, console helpers, the sweep oracle |
| `checks.mjs` | three static gates: identifier collisions, `?v=` equality, `TOTAL_SCREENS` vs markup |
| `baselines/` | sweep output captured at each stage; the acceptance gate for the extraction |
| `REPORTING-ADDING.superseded.md` | archived — it documents `mass-measure`, not this unit. See its banner |

## `xapi-720-j.js`

A stand-in for the CDN library. Loaded only via the query parameter:

```
http://localhost:8744/methodica-science-volume-solid-01-01/?xapiLib=../_test/xapi-720-j.js
```

`unit-js/50-loader.js` honours `?xapiLib` **on localhost only**, and only for a same-origin
relative path.

> ⚠️ **After editing this stub, add a cache buster** or the browser serves the old copy and your
> change appears not to work: `?xapiLib=../_test/xapi-720-j.js%3Fv%3D2` (the `?v=` URL-encoded). The
> loader's same-origin check permits it and the `XAPI_USING_G` filename match still holds.

It loads the component and unit metadata **for real**, because `window.METADATA` is what `xapiQ()`
resolves question ids from and what the bug-report form takes its unit/component/item ids from. It
also reproduces one quirk of the real library on purpose: `window.METADATA` is briefly a *promise*
before the resolved object replaces it, which is what keeps `50-loader.js`'s `settleMetadata()`
exercised locally.

### Two modes, not interchangeable

| Mode | How | `XAPI_USING_G` | What it is for |
|---|---|---|---|
| **A** | no `?xapiLib`; inject the stub after load (see below) | `false` | comparing against `baselines/stage-0.json` — the item layer stays dark, as it was pre-reconstruction |
| **B** | `?xapiLib=…` | **`true`** | the full pipeline: real metadata, item-level statements live |

Mode B turns the item layer on because the stub's filename ends in `xapi-720-j.js`, which the
`XAPI_USING_G` regex matches. **Do not compare mode B output to the Stage 0 baseline.**

Off-platform with no `?xapiLib`, the loader deliberately loads **no** library at all and logs why.
That is not laziness: `xapi-720-f.js` has no `XAPI_DISABLED` path, so without a valid `?slxapi` it
retries every statement against a placeholder endpoint. From Stage 3 (`-i`/`-j`) that hazard is gone
and the restriction can be relaxed.

> ⚠️ **The filename must keep the `xapi-720-j.js` ending.** `50-loader.js` derives
> `window.XAPI_USING_G` from a regex on the library URL (`/xapi-720-[ghij]\.js/`). Rename the file
> and item-level `initialized`/`completed` and the video `played`/`paused` all go silent — with no
> error, because `xapiOnScreen()` and `xapiWireVideos()` early-return on that flag.

State and the statement log live in `sessionStorage`, so both survive the cross-part navigations
this harness exists to exercise. `saveState720Debounced` really does defer by 800 ms, so the
stale-timer race that the cross-part handoff guards against is reproducible here.

### Console helpers

| Call | What it gives you |
|---|---|
| `__stmts()` | every statement sent this session, across parts |
| `__state()` | the current resume document |
| `__reset()` | clear state + log + the forced-failure flag |
| `__failWrites(true)` | make `saveState720` return `false`, to test the write-failure branches |
| `__dupes()` | duplicate `completed` **and** `answered.last` — empty is the pass condition |
| `__screenIds()` | every `data-screen` value present in this part's markup |
| `__sweep()` | drive `goTo()` over all of them and return a normalised, diffable log |

`__dupes()` deliberately ignores `initialized`: 720 v2.4 §1 **requires** it again on every
re-entry, so a repeat there is conformance, not a defect. It *does* cover `answered.last`, which
the reference's version did not — part 06's back edge into a failed מועד א makes a re-sent graded
answer a live hazard in this unit. See `ROUTING-AND-RETAKE.md`.

## The sweep oracle

`__sweep()` walks every `data-screen` value **present in the markup**, not `0..TOTAL_SCREENS-1`.
That distinction matters here: screen ids are neither DOM order nor flow order (part 01's practice
questions run 13, 14, 15, **17**, 16; part 04's scenario screens s9/s10 sit outside the numeric
flow), so a positional loop would both miss screens and visit ones that do not exist.

`__sweep()` is **async and must stay async.** Parts 05 and 06 send through `xapiSend()`, which is
`setTimeout(…, 0)` — a synchronous read of the log returns *before* those macrotasks run and reports
zero statements for exactly the screens most likely to over-report. That is how the part-05 defect
was nearly missed. It is the same deferral that defeats the resume stub (risk R1 in `RESUME.md`).

Its output is the **acceptance gate for the shared-layer extraction**: a pure move must leave
`visited` and `statements` unchanged. Baselines live in `_test/baselines/`.

It needs a browser (it drives `goTo()` against a live DOM), so there is no node runner. With the
dev server up, load a part and run:

```js
(async () => {
  const src = await (await fetch('/_test/xapi-720-j.js')).text();
  (new Function(src))();
  return await window.__sweep();
})()
```

Until Stage 2 lands `?xapiLib`, inject the stub this way — **after** load. Before then a hard
`localhost` guard in each `main.js` returns before the library ever loads, so
`window.sendStatement720` is undefined and every `xapiSend()` is swallowed by its own `try/catch`.
Injecting post-load gives the handlers a sender. From Stage 2 on, prefer `?xapiLib`.

`__sweep()` calls `__reset()` first, so boot-time statements are excluded by design and only what
`goTo()` emits is measured — which is precisely the invariant a pure move must preserve.

## The static gates

```bash
node _test/checks.mjs
```

Three checks, all of which exist because the failure they catch is silent:

1. **Identifier collisions** between `unit-js/*.js` and each part's `js/main.js`. A `let`/`const`
   collision is a loud `SyntaxError`, but a **`var`/`function` collision is a silent last-wins
   overwrite** — and `main.js` loads *after* the shared files, so a leftover part-local copy wins
   and the extraction looks successful while shipping the old code. Hook names are the expected
   exceptions.
2. **`?v=` equality** across all six `index.html` for every shared URL. All six reference the same
   files, so a mismatch means one part fetches a second copy under a different URL and two parts
   can execute different versions of the same logic inside one learner session.
3. **`TOTAL_SCREENS` vs the markup** — the constant and the `.screen` count must agree, or `goTo()`
   rejects screens that exist while the dev bridge offers screens that do not.

4. **Metadata id resolution** — runs the *real* `xapiItemId`/`xapiQ` out of `unit-js/20-xapi.js`
   against every `metadata/*.json`, asserting that each item id, question id and `parent` matches
   byte-for-byte. A second copy of the id logic here would be free to drift from the one that ships,
   which is the whole class of bug the check exists to catch.

> ⚠️ Every check here derives the part list from the filesystem, never a hard-coded array. The
> equivalents in `methodica-math-scale-01` iterate `['01'…'05']`; copying one of those verbatim
> would **silently skip part 06** — the retake, and the least-exercised component in the unit.

## What no check can catch: the cache

Three times during the reconstruction a change appeared not to work because the browser was serving a
stale file. None of it is detectable statically — the old bytes exist only in the browser — so it is
procedure:

| After editing | Bump |
|---|---|
| a part's `js/main.js` | that part's `js/main.js?v=` |
| a shared `unit-js/*.js` | that file's `?v=` in **all six** `index.html` (gate 2 enforces they agree, not that you bumped) |
| `_test/xapi-720-j.js` | the `?v=` inside the `?xapiLib` value |

The failure mode is the nastiest one in this codebase: `main.js` loads *after* the shared layer, so a
cached `main.js` still carrying a part-local copy of an extracted function **wins**, and the
extraction looks successful while shipping the old code.

## `verify-resume.js` — the resume painters

Loads each part's real `index.html`, `js/main.js` and `unit-js/*.js` in jsdom, answers every question,
walks away and back through `goTo()`, and asserts that the answered look — marks, feedback popup and
the matching screens' answer toggle — comes back. Four of the assertions are genuine reloads: the
state document is copied out of one window and seeded into the next before its scripts run.

**jsdom is not in the repo and must not be installed into it** — the project lives in a synced
OneDrive folder and jsdom's `node_modules` is ~26MB of pointless sync traffic. Install it somewhere
outside and point `NODE_PATH` at it:

```bash
mkdir -p /c/lomda-test && cd /c/lomda-test && npm install jsdom
```

```bash
NODE_PATH=/c/lomda-test/node_modules node _test/verify-resume.js
```

Exit code 0 and `all resume checks passed`, or a list of failures with the observed value.

Two rules to keep if you extend it, both paid for in the sibling unit: every assertion goes through
`goTo()` rather than calling a painter directly, and every assertion checks an outcome rather than the
absence of a throw. See `docs-and-tools/RESUME.md` §Verified headlessly.
