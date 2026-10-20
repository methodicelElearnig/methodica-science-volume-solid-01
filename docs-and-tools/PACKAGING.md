# Packaging a deployment

Until 2026-10-20 every package of this unit was cut by hand against a denylist written in prose
inside each pack's `DEPLOY.md`. Since then three scripts in `docs-and-tools/` (ported from
`methodica-science-body-matter-01`, guide §11) define what ships in exactly one place.

| file | role |
|---|---|
| `package-allowlist.ps1` | **the only definition** of what goes into a package. Not run on its own — the other two dot-source it |
| `build-package.ps1` | cuts a package into a dated folder under `../../deployments/`, then verifies what it wrote |
| `verify-package.ps1` | answers one question: is the package on disk **exactly** this tree |

`build-package.ps1` and `verify-package.ps1` are byte-identical to the reference unit's. Only the
allowlist differs, and only where this unit's shape forces it (see its `.NOTES`): components keep
`css/style.css` and `js/main.js` in subfolders, there are no `<iframe>` sub-apps, and `translation/`
(the he→ar export) and `SCREENS.md` never ship.

## Run

```powershell
pwsh -File docs-and-tools/build-package.ps1 -DryRun   # what would ship, writing nothing
pwsh -File docs-and-tools/build-package.ps1           # cut ../../deployments/<today>
pwsh -File docs-and-tools/verify-package.ps1          # check the newest package
```

`build-package.ps1` **refuses** a dirty working tree (`-AllowDirty` overrides) and a non-empty
target (`-Force` overrides and keeps the hand-written `DEPLOY.md`). `deployments/` sits **outside**
the repo, so an overwrite cannot be recovered. The folder convention is "refresh today's newest
folder in place; a new lettered folder only on explicit request" (`DEPLOY.md` of every pack).

## Why an allowlist and not a denylist

`docs-and-tools/kata-api-key.txt` (when present) is a **live** key on disk. Under a denylist one
missing entry publishes it. Under the allowlist a new file at the root simply matches no rule.

## The four checks of verify-package

| check | what it asks |
|---|---|
| FORWARD | every file in the package exists in the tree with identical content (MD5) |
| REVERSE | every file the allowlist ships **is in** the package — the check a plain diff misses: a file added to the tree after the cut looks fine and arrives as a 404 |
| HYGIENE | no key, `*.ps1`, `*.log`, `index_dev.html`, `README.md`, `SCREENS.md`, `*.xlf`/`*.xlsx` or `_`-prefixed path inside the package |
| COMMIT | the commit `DEPLOY.md` declares vs HEAD — only if a **shipped** file changed, so a commit touching only `_test/` or `docs-and-tools/` does not mark the package stale |

## Running the harnesses against a package

Both harnesses take a base path as their first argument (the stub is loaded from `_test/` of the
repo, which a correct package does not contain):

```bash
NODE_PATH="$LOCALAPPDATA/lomda-jsdom/node_modules" node _test/verify-report.js ../../deployments/<date>
```

⚠️ That is a cross-check, not the gate. The gate is `verify-package.ps1`.

## Upload

The package is uploaded to `https://lomdot.education.gov.il/metodica/720/science/volume-solid/01/`
by the CDN owner; the repo does not hold those credentials. After an upload, verify every file by
**byte count** (the MOE CDN answers `200` with 0 bytes for a missing path) and check the library
the loader names is the real one:

```bash
curl -s https://lomdot.education.gov.il/metodica/720active/common/xapi-720-k.js | grep -c stateReason720   # >0
```

Only then can the live Kata run (`LIVE-VERIFICATION-<date>.md`) be made: the launch links
(`Tools/full-kata-link/New-KataLaunchLinks.ps1 -UnitKey methodica-science-volume-solid-01 -ResetState`)
open the CDN copy, not the repo.
