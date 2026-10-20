# Retrieving metadata from the Kata catalog

`retrieve-metadata.ps1` is the opposite direction of [`send-metadata.ps1`](SEND-METADATA.md):
it reads a content unit out of the Katalog (Kata) catalog at `https://kata.cet.ac.il/api/v1`
and writes it back out as metadata files — same schema, same key order, same formatting
as the `metadata/` folder — into **`metadata-from/`**. It never writes to `metadata/`.

The script lives in `docs-and-tools/`; both `metadata/` and `metadata-from/` sit at the
repo root, so run it from there. ⚠️ `metadata-from/` is **not yet** in this repo's
`.gitignore` (see [SEND-METADATA.md → Before the first live run](SEND-METADATA.md#before-the-first-live-run));
add it before the first retrieve, or the snapshot shows up as untracked files.

Ported 2026-10-20 from `methodica-science-body-matter-01` (where it was verified live
against Kata the same day) and retargeted for this unit; **not yet run against Kata for
this unit**, because the unit has not been pushed.

The point is comparison. Diff the two folders to see exactly where the catalog and the
repo disagree:

```bash
git diff --no-index metadata metadata-from
```

## Requirements

- **PowerShell 7+** (`pwsh`). PowerShell 7.5+ additionally keeps `createdAt`/`updatedAt`
  exactly as KATA sent them; on 7.0–7.4 they are re-serialized to microsecond precision
  (`ConvertFrom-Json` converts ISO-8601 strings to `[datetime]` and there is no
  `-DateKind` to switch it off before 7.5). This machine runs 7.6.
- **curl.exe** — bundled with Windows 10/11.
- An API key, resolved in this order: the `-ApiKey` parameter, the `KATA_API_KEY`
  environment variable, or **`kata-api-key.txt`** at the repo root (one line, just the
  key — shared with `send-metadata.ps1`). See
  [SEND-METADATA.md → One-time setup](SEND-METADATA.md#one-time-setup). Never hard-code
  a key in the script; it is committed. The script **refuses to read the key file unless
  `git check-ignore` says it is ignored** — and in this repo it is not yet (see the
  SEND-METADATA.md section above).

## Usage

```powershell
# Unit key is taken from metadata/*_unit.json (methodica-science-volume-solid-01)
pwsh -File docs-and-tools/retrieve-metadata.ps1

# Also save the untouched API response under metadata-from/_raw/
pwsh -File docs-and-tools/retrieve-metadata.ps1 -KeepRaw

# Pre-release check: exit 1 on any divergence from metadata/
pwsh -File docs-and-tools/retrieve-metadata.ps1 -FailOnDrift

# Any other unit / server / destination
pwsh -File docs-and-tools/retrieve-metadata.ps1 -UnitKey some-other-unit -OutDir .\snapshot
```

Progress prints to the console and to `retrieve-metadata.log` at the repo root
(git-ignored by `*.log`). The run ends with a `unit=1 components=N items=M warnings=W`
summary.

`-UnitKey` is resolved in this order: the parameter → the `id` in `metadata/*_unit.json`
→ `GET /api/v1/content-units` when the account owns exactly one unit (otherwise it
stops and lists the available keys). For this unit the `_unit.json` id is already the
bare slug `methodica-science-volume-solid-01` (720 v2.7 §2.7), so `Get-Slug` returns it
unchanged.

## How it maps KATA back to the metadata format

A single `GET /api/v1/content-units/{unitKey}` returns the whole tree — unit,
`components[]`, each component's `subContent[]`, and each item's `questions[]` — so
there is one request per run regardless of size.

**Enum values are passed through untouched.** KATA stores the same kebab-case
vocabulary the metadata files use (`state-general`, `core-curriculum-basic`,
`project-or-inquiry-task`, `interactive-content`, …), so unlike the sender this script
has no enum-mapping tables. `send-metadata.ps1` uses the same kebab-case vocabulary in
its `$Valid*` lists; any Title-Case table you encounter in older notes is stale.

| Metadata | Rebuilt from KATA |
|---|---|
| `id` (full URL) | the entity's own `uniqueKey`, which **is** the id since the 2026-09-15 IRI migration — for components, items and the URL prefix alike. Falls back to component `hostedContentRef` minus `/index.html` for a pre-migration row (with a warning), then to `-IdBase` (`https://lomdot.education.gov.il/metodica/720active/science/volume-solid/01`, = `XAPI_ID_PREFIX` in `unit-js/10-identity.js`). ⚠️ `hostedContentRef` lives under `720/` (content) while ids live under `720active/` (identifiers); deriving one from the other is what once produced `id` DRIFT rows that were not drift. |
| unit `id` | the bare unit key (v2.7 §2.7 — not an IRI), exactly as `metadata/*_unit.json` stores it |
| unit `title` (string) | `title.he` (`$TitleLangKey`; the Kata UI reads only the ISO codes `he` / `ar`) |
| component `learningUnitId` | the bare unit key (KATA returns it that way too) |
| component `manufacture` | not emitted — v2.5 §2.6 moved the field to the unit as `manufacturer`; KATA returns the provider's display name (`מתודיקה`) there, not the supplier number `310` this unit's metadata carries, so a diff on that one key is **expected** |
| `recommendedAfterFail` | each key expanded back to `<prefix>/<key>/` (this unit: part 03 → part 02 only) |
| item `id` | the item's `uniqueKey` verbatim when it is already an absolute IRI (the case since 2026-09-15); otherwise the legacy `<component id>/<item uniqueKey>` |
| `questions[]` | verbatim, minus each question's `order` |

**Dropped**, because the metadata format has no place for them — use `-KeepRaw` if you
need them: unit `kind`, `providerName`, `providerLogoUrl`, `componentCount`, `createdAt`,
`updatedAt`; component `status`, `manufacturerGroupId`, `hostedContentRef`; item
`uniqueKey`, `hostedContentRef`, `order`; question `order`.

Component **`masteryLevel` is kept** (inserted after `relativeDifficulty`, where the
hand-authored files hold it), **null included**: all seven components of this unit
declare `"masteryLevel": null`, `send-metadata.ps1` pushes that null to clear the field,
and KATA returns null — so the key round-trips and the diff stays clean on it.

Component `createdAt`/`updatedAt` **are** kept — they are KATA's real timestamps, so
they always differ from the `2026-10-19T00:00:00.000Z` placeholders in `metadata/`.

## The catalogue audit (`-FailOnDrift`)

While the files are built, every component and item KATA returned is compared against
the authored `metadata/`: `uniqueKey` shape, that `hostedContentRef` names the same
entity as the metadata id, and **every `questions[]` entry** (`questionType`,
`questionText`, `answers`, `correctAnswers`, presence on both sides). Anything authored
that KATA never received is reported the other way round. Each divergence is a `WARN`;
`-FailOnDrift` turns any warning into exit 1.

Known blind spots, worth knowing before you trust an exit code of 0: the audit compares
`uniqueKey`, `hostedContentRef` and `questions[]`, and **nothing else**. `masteryLevel`,
`order`, `isRequired`, `depthLevel`, `cognitiveLevels`, titles, `contentType` and the
unit's `targetSectors` are emitted into `metadata-from/` but never compared — so a drift
in any of them shows up only in the text diff.

## Output formatting

Files are written **UTF-8 without BOM, CRLF, 2-space indent, trailing newline**, and the
formatter reproduces the hand-authored style of `metadata/` rather than using
`ConvertTo-Json` (which expands every array and would add whitespace noise to every
diff). The rule, all of it configurable in the CONFIG block:

- an empty array is `[]`; an empty object is `{}`
- an array of primitives goes on one line while its compact form is ≤ `$InlineArrayMaxChars`
  (96) — so `answers`, `correctAnswers`, `targetSectors`, `skills` and
  `recommendedAfterFail` get one element per line, and each element shows up as its own
  line in a diff
- arrays under `languages` / `source` / `target` (`$InlineArrayKeys`) are short tuples and
  get a larger budget, `$InlineTupleMaxChars` (62)
- a flat object of at most `$InlineObjectMaxProps` (3) primitive values goes on one line —
  that's how the `matching` questions' `correctAnswers` pairs are stored

**Fidelity.** ⚠️ The two array budgets (96 / 62) were fitted against a **different unit's**
metadata — they came in with this script and have **not** been re-measured against this
repo's 8 files, whose arrays are mostly one-element-per-line already. They are a
reasonable starting point, not a verified fit here. Before trusting a `metadata` vs
`metadata-from` diff to be noise-free, re-measure: parse each `metadata/*.json` and
re-emit it through this formatter, then compare byte for byte and adjust
`$InlineArrayMaxChars` / `$InlineTupleMaxChars` if the residuals are formatting rather
than content.

## First run against this unit

`methodica-science-volume-solid-01` has not been pushed to the catalog yet. After the first
live `send-metadata.ps1` run, retrieve once with `-FailOnDrift` and record here which
fields genuinely drift between the catalog and the repo, so later diffs can be read
quickly. Expected shape: `unit=1 components=7 items=23`.

Before that first push, make sure the `UI vs metadata` mismatch in
[METADATA-AUDIT.md](METADATA-AUDIT.md) (05/q1's correct answer) is resolved — a retrieve can only tell you that
KATA holds what `metadata/` says, not that `metadata/` says what the learner sees.
