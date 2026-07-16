# Sending metadata to the Kata catalog

`send-metadata.ps1` pushes the `metadata/` folder (1 unit + 5 components + their
items) into the Katalog (Kata) catalog at `https://kata.cet.ac.il/api/v1`.
It **upserts**: for each entity it does a `GET` by uniqueKey, then `PATCH` if it
already exists or `POST` if it doesn't — so it's safe to run more than once.

See [KATA-API-DETAILED.md](../../KATA-API-DETAILED.md) for the full endpoint schemas.

## Requirements

- **PowerShell 7+** (`pwsh`). The script declares `#Requires -Version 7.0` and will
  not run on Windows PowerShell 5.1 (needed for correct array + UTF-8 JSON handling).
- **curl.exe** — bundled with Windows 10/11.

## One-time setup

1. Get an API key from the Kata UI → **מפתחות API** (`/api-credentials`).
2. Open `send-metadata.ps1` and replace the placeholder near the top:
   ```powershell
   $ApiKey = 'YOUR_API_KEY_HERE'   # <- paste your real key here
   ```
   The script refuses to run (outside `-DryRun`) while the placeholder is unchanged.

> ⚠️ **Do not commit the script with your real key in it.** `.gitignore` does not
> exclude `send-metadata.ps1`. Either add it to `.gitignore`, or keep the key out of
> the committed copy. The key is never written to the log.

## Usage

```powershell
# 1) Dry run — builds and prints every payload, no network, no key needed.
pwsh -File send-metadata.ps1 -DryRun

# 2) Live run — after pasting your key.
pwsh -File send-metadata.ps1

# Optional overrides:
pwsh -File send-metadata.ps1 -BaseUrl 'https://kata.cet.ac.il' -MetadataDir '.\metadata'
```

Progress prints to the console and to `send-metadata.log` (git-ignored). Each line is
`CREATED` / `UPDATED` / `FAILED` with the HTTP status; the run ends with a
`created / updated / failed` summary and a non-zero exit code if anything failed.

## What the script does to the metadata

The metadata schema doesn't match the API 1:1, so the script transforms it. All of
this is controlled from the **CONFIG** block at the top of the file.

| Metadata | Sent to API |
|---|---|
| `id` (full URL) | `uniqueKey` = last path segment (slug), e.g. `methodica-science-mass-measure-01-01` |
| unit `title` (string) | `title` object `{ "Hebrew": "…" }` (`$TitleLangKey`) |
| unit — (no manufacture) | `manufacture` = `'methodica'` (`$UnitManufacture`) |
| component — (missing) | `relativeDifficulty` = component `order`; `depthLevel` = `Core Curriculum Basic`; `cognitiveLevel` = `understanding` — see `$ComponentOverrides` to set real per-component values |
| component `manufacture` | dropped (owning group is derived from the API key) |
| item — (no order) | `order` = 1-based position in `subContent[]` |
| `questions[]` | passed through unchanged |

### Enum auto-mapping (documented in `$ComponentPurposeMap` / `$ContentTypeMap`)

| Field | Metadata value | Sent |
|---|---|---|
| `componentPurpose` | `assessment` (part 05) | `practice` (`isAssessment:true` already set) |
| `contentType` | `ClassroomTask` (part 03 item) | `Project or Inquiry Task` |
| `contentType` | `Assessment` (part 05 item) | `Practice` |

Any other value outside the API enums makes the script **stop with an error** rather
than send bad data — add it to the relevant map (or fix the metadata) and re-run.

## Assumptions to verify on the first live run

Two mappings are best-guesses and isolated to single config points, so a first-call
`422` is a one-line fix:

1. **`uniqueKey` = URL slug.** If the catalog wants the full URL or a different
   format, change `Get-Slug` / the uniqueKey logic. (`GET /api/v1/content/next-unique-key?entityType=…`
   shows the catalog's expected format.)
2. **Unit `title` is an object** `{ "Hebrew": "…" }`. If rejected, adjust the
   title builder in `New-UnitBody`.

## Verify the result

- `GET /api/v1/content-units/methodica-science-mass-measure-01` returns the unit with
  its components; spot-check `GET /api/v1/components/methodica-science-mass-measure-01-01`
  and one item.
- In the Kata UI: **יחידות תוכן** (`/author`).
- Re-run once — every entity should report `UPDATED` (not duplicated).
