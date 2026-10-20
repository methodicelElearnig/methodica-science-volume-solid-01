# Sending metadata to the Kata catalog

`send-metadata.ps1` pushes the `metadata/` folder (1 unit + 7 components + their 23
items, carrying 30 questions) into the Katalog (Kata) catalog at
`https://kata.cet.ac.il/api/v1`. It **upserts**: for each entity it does a `GET` by
uniqueKey, then `PATCH` if it already exists or `POST` if it doesn't — so it's safe to run
more than once.

Ported 2026-10-20 from `methodica-science-body-matter-01/docs-and-tools/send-metadata.ps1`
(the version that created that unit live the same day) and retargeted for this unit. It
replaces the 341-line script this repo carried until then, which lacked the uniqueKey
degradation guard, `masteryLevel` forwarding, the `-ApiKey` parameter, the IRI-keyed
routes and the v2.5/2.7 field shapes. **Status: dry-run only — this unit has not been
pushed.**

Companions: [`check-metadata.py`](METADATA-AUDIT.md) (run it first — on 2026-10-20 it found a
wrong correct answer on 05/q1, since fixed) · [`retrieve-metadata.ps1`](RETRIEVE-METADATA.md) (the other direction).

## Requirements

- **PowerShell 7+** (`pwsh`). The script declares `#Requires -Version 7.0` and will
  not run on Windows PowerShell 5.1 (needed for correct array + UTF-8 JSON handling).
- **curl.exe** — bundled with Windows 10/11.

## Before the first live run — two `.gitignore` lines

This repo's `.gitignore` still reflects the *old* script, which had the key pasted inside
it. It is the opposite of what the ported script needs:

| line in `.gitignore` today | what it does now | change |
|---|---|---|
| `docs-and-tools/send-metadata.ps1` | **hides the new, key-free script from git** — `git status` shows it as ignored (`!!`), so it cannot be committed | remove the line |
| *(no entry for `kata-api-key.txt`)* | the key file would be **staged** on the next `git add -A` | add `kata-api-key.txt` (anchored to the root, where the script reads it) |
| *(no entry for `metadata-from/`)* | the retrieve snapshot would show up as untracked | add `metadata-from/` |
| `*.log` | fine — both run logs are ignored | optionally add `!docs-and-tools/send-metadata-*.log` / `!docs-and-tools/retrieve-metadata-*.log` so archived run records can be committed, as the sibling unit does |

Until the second row is done, the scripts **refuse to read `kata-api-key.txt`**: both
`Resolve-ApiKey` functions call `git check-ignore` on the file and throw when the answer
is "not ignored". Pass `-ApiKey` or set `$env:KATA_API_KEY` to run without the file.

Also verify `$ContentBaseUrl` in the CONFIG block —
`https://lomdot.education.gov.il/metodica/720/science/volume-solid/01` is **assumed** by
analogy with the sibling units (identifiers under `720active/`, content under `720/`),
because this repo has no DEPLOY.md naming its hosting path. It becomes every component's
`hostedContentRef`, which is what Kata launches; a wrong value is a dead launch URL on all
seven components.

## One-time setup

Get an API key from the Kata UI → **מפתחות API** (`/api-credentials`), then make it
available in any **one** of these ways — the script checks them in this order:

1. `-ApiKey '<key>'` on the command line.
2. The `KATA_API_KEY` environment variable.
3. **`kata-api-key.txt`** at the repo root — one line, just the key. This is the usual
   choice once `.gitignore` excludes it (see above).

```powershell
# option 3, once, from the repo root — only after .gitignore lists kata-api-key.txt:
'<your-key>' | Set-Content kata-api-key.txt -NoNewline
```

Outside `-DryRun` the script refuses to run when no key is found. The key is never
written to the log, and both scripts share the same file.

> **Never hard-code a key in the scripts** — `send-metadata.ps1` and
> `retrieve-metadata.ps1` are meant to be committed. `kata-api-key.txt` is the only place
> a live key may sit on disk.

## Usage

```powershell
# Run from the repo root.

# 1) Dry run — builds and prints every payload, no network, no key needed.
pwsh -File docs-and-tools/send-metadata.ps1 -DryRun

# 2) Live run — after setting up the key (see above).
pwsh -File docs-and-tools/send-metadata.ps1

# Optional overrides:
pwsh -File docs-and-tools/send-metadata.ps1 -BaseUrl 'https://kata.cet.ac.il' -MetadataDir '.\metadata'
```

Progress prints to the console and to `send-metadata.log` at the repo root (git-ignored by
`*.log`). Each line is `CREATED` / `UPDATED` / `FAILED` / `LINKED` with the HTTP status;
the run ends with a `created / updated / failed` summary and a non-zero exit code if
anything failed.

Payloads printed by `-DryRun` go through `Write-Host`; on a console whose codepage is not
UTF-8 the Hebrew shows as `????`. That is the console, not the payload — live requests are
written to a temp file as UTF-8 without BOM. `[Console]::OutputEncoding =
[System.Text.UTF8Encoding]::new()` first if you want to read them.

## What the script does to the metadata

The metadata schema doesn't match the API 1:1, so the script transforms it. All of
this is controlled from the **CONFIG** block at the top of the file.

| Metadata | Sent to API |
|---|---|
| unit `id` (bare slug, v2.7 §2.7) | `uniqueKey` = `methodica-science-volume-solid-01` — guarded: the script throws if the key does not look like `methodica-<subject>-<topic>-NN` (the old `…/volume-solid/01/` id degraded to `"01"`) |
| component / item `id` (full IRI, trailing slash) | `uniqueKey` = the IRI verbatim; routes use the query form (`/api/v1/component?componentKey=…`) because a `/` cannot travel in a path segment |
| unit `title` (string) | `title` object `{ "he": "…" }` (`$TitleLangKey` — the Kata UI reads only `he` / `ar`) |
| unit `manufacturer` (`"310"`), `subTopic` | **not sent** — Kata derives the provider from the API key and rejects `subTopic` on a standard unit (422) |
| unit `targetSectors` / `targetAudience` | validated against the v2.5 vocabularies and forwarded (plural list / single value) |
| component `relativeDifficulty`, `depthLevel`, `cognitiveLevels` | read from the metadata (override > metadata > fallback), validated; `cognitiveLevels` is the plural list |
| component `masteryLevel` | forwarded **keyed on presence**: `null` in the metadata is sent as `null` and clears the field; an absent key leaves Kata alone. All seven components here declare `null`. |
| component — | `hostedContentRef` = `$ContentBaseUrl/<component-slug>/index.html` |
| component `recommendedAfterFail` | applied in a **second PATCH pass** after every component exists (forward references); full IRIs or bare slugs are both resolved |
| item — (no order) | `order` = 1-based position in `subContent[]` |
| item `questions[]` | passed through unchanged, keyed on presence (`[]` clears) |

### Enums are kebab-case — no translation needed

The metadata stores the **same kebab-case vocabulary the API uses**
(`core-curriculum-basic`, `project-or-inquiry-task`, `interactive-content`, `motivational`,
`applying-a-model-or-procedure`, `analyzing`, `state-general`, …). Values pass straight
through and are only *checked* against the `$Valid*` lists in CONFIG section (4); any value
outside them makes the script **stop with an error** naming the offender rather than send
bad data. `$ComponentPurposeMap` / `$ContentTypeMap` / `$CognitiveLevelMap` only rewrite
leftover pre-v2.3 spellings, which this metadata does not contain.

This unit uses `applying-a-model-or-procedure` (parts 01–04) and `analyzing` (parts
05–07); all 12 science codes are live in Kata (checked 2026-08-05 on the sibling unit).

## Dry run, 2026-10-20

`pwsh -File docs-and-tools/send-metadata.ps1 -DryRun` → exit 0, `created=31 updated=1 failed=0`:

| entity | count | detail |
|---|---|---|
| unit | 1 | `uniqueKey` = `methodica-science-volume-solid-01` (the slug, not `01`); `title.he`; `targetSectors` ×2; `targetAudience` `general` |
| components | 7 | IRI `uniqueKey`s; `masteryLevel: null` on all 7 (sent, to clear); `cognitiveLevels` lists; `hostedContentRef` under the assumed `$ContentBaseUrl` |
| items | 23 | 4 + 5 + 6 + 1 + 5 + 1 + 1; 30 `questionId`s across them |
| `recommendedAfterFail` | 1 | `03 → 02` |

No enum rejected, no uniqueKey degradation. The dry run does **not** validate the answer
strings against the UI — that is `check-metadata.py`, which on the same day reported 1
error (05/q1's correct answer) and 2 warnings (pair order on 01-03/q1 and 02-04/q1); all
three fixed the same day (METADATA-AUDIT.md §1a), the validator now ends
`0 error(s), 0 warning(s)`.

## Going the other way

[`retrieve-metadata.ps1`](RETRIEVE-METADATA.md) pulls a unit back out of the catalog
into `metadata-from/`, in this same file format, so you can diff the catalog against
the repo.

## Verify the result

- `GET /api/v1/content-units/methodica-science-volume-solid-01` returns the unit with
  its components; spot-check one component and one item through the query routes.
- In the Kata UI: **יחידות תוכן** (`/author`).
- Re-run once — every entity should report `UPDATED` (not duplicated).
- Then `retrieve-metadata.ps1 -FailOnDrift` and `git diff --no-index metadata metadata-from`.

## The log is overwritten on every run — archive one before you care about it

`send-metadata.log` at the repo root is rewritten by `Set-Content` at the top of **every** run,
**including `-DryRun`** (the write happens before the mode branch). It is also git-ignored by
`*.log`. So a single dry run silently destroys the record of whatever ran last.

Archive the run you care about before the next one:

```bash
cp send-metadata.log docs-and-tools/send-metadata-$(date +%Y-%m-%d)-<what-it-did>.log
```

(and add the `!docs-and-tools/send-metadata-*.log` exception to `.gitignore` if the archive
should be committed). The log carries **no per-line timestamps**, so the date belongs in
the filename.

Archived so far:

| file | what it records |
|---|---|
| _(none yet)_ | `methodica-science-volume-solid-01` has not been pushed to Kata. Archive the first live run here as `send-metadata-<date>-create.log`; expected shape: 1 unit, 7 components (01–07), 23 items, 1 `recommendedAfterFail` link (03 → 02). |

## Clearing a field: `null` and `[]` mean "remove it", absent means "leave it"

`masteryLevel` and an item's `questions` are keyed on **presence in the metadata**, not on
whether they hold anything:

| metadata                 | payload                  | effect on Kata              |
|--------------------------|--------------------------|-----------------------------|
| `"masteryLevel": "basic"`| `"masteryLevel": "basic"`| set to `basic`              |
| `"masteryLevel": null`   | `"masteryLevel": null`   | **cleared**                 |
| key absent               | key omitted              | left at whatever Kata holds |

The same three rows apply to an item's `questions`, with `[]` in place of `null`. It
matters for `questions` in particular because **there is no per-question delete endpoint**
— `ItemUpdate.questions` is the only way to remove a question from an item short of
deleting the whole item. An item you no longer want graded needs `"questions": []` written
into the metadata explicitly; removing the key does nothing. (Part 01's item 01 and part
04's item already carry `"questions": []`.)

## Trap: removing an item from a component makes every later item 409

`order` is computed from the item's **position in `subContent`**, not from its 2-digit
suffix. So deleting an item from a component's JSON shifts the order of every item after
it — and Kata rejects a PATCH that moves an item onto an `order` another item still holds:

```
(HTTP 409) {"code":"resource.conflict","detail":"item order/key already taken in component"}
```

The upsert is idempotent, so nothing is created or corrupted — the later items simply keep
their previous content and order. The fix is to DELETE the moved items from the catalogue
(`DELETE` on the item route → 204), then re-run the sender. Deleting a catalogue record is
not reversible through this tool, so confirm with the producer first.

Two related notes:

- **The failure log names the call actually made** (`PATCH` vs `POST`); older logs from
  the donor unit's earlier script could report a rejected PATCH as a failed POST.
- **`Test-Exists` treats any non-200 as "does not exist"** and falls through to a create.
  That is usually right, but it means a transient 429 or 5xx presents as a spurious create
  attempt.
