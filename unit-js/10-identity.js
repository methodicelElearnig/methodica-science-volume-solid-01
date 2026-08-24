'use strict';
/* ═══════════════════ xAPI (720) — identity ═══════════════════
   Shared by all SIX components of methodica-science-volume-solid-01. Loaded first; see
   unit-js/README.md for the load order and the hook contract.

   Canonical id prefix for this unit. Every id the lomda reports is built from it and must match
   metadata/*.json byte-for-byte — INCLUDING the trailing slashes this unit's metadata carries on
   unit, component and item ids (but not on question ids). */
var XAPI_ID_PREFIX = 'https://lomdot.education.gov.il/metodica/720active/science/volume-solid/01/';

/* ⚠️ The unit id is the BARE PREFIX, deliberately, and it is a known issue — not the shape the
   sibling unit methodica-math-scale-01 uses (`<prefix><unit-slug>/`).

   metadata/methodica-science-volume-solid-01_unit.json declares `id` as the bare prefix, and code
   must match the catalog byte-for-byte, so this follows the metadata rather than the convention.
   Kata derives a uniqueKey from the last path segment, which here resolves to the string "01" —
   collides with every other unit numbered 01, in every subject. Changing it means re-pushing
   metadata, which was consciously deferred. See METADATA-KNOWN-ISSUES.md.

   What this does NOT break: resume. Kata addresses a state document by ?registration alone, so
   XAPI_UNIT_ID is never sent to it; the id only keys the off-platform localStorage fallback, and
   that key is already unique because the prefix carries subject and topic. */
window.XAPI_UNIT_ID = XAPI_ID_PREFIX;   // resume State document key (localStorage fallback only)

/* Last path segment of a canonical id — the short slug the bug-report form records.

   The trailing-slash strip is load-bearing, and its absence was a live bug: this unit's metadata
   ids all END in '/', so the previous `String(u||'').split('/').pop()` returned the empty string
   for every one of them. Every problem report was posting "" as the unit, "" as the component and
   "-05" as the item id — unattributable. */
function shortId(u) { return String(u || '').replace(/\/+$/, '').split('/').pop(); }

/* Resume (KATA State API). True also switches the loader from xapi-720-i.js to xapi-720-j.js, which
   carries the State transport that -i lacks. See RESUME.md.

   ⚠️ DEPLOY ALL SIX COMPONENT FOLDERS ATOMICALLY when this changes, and on rollback too. A part left
   on the other setting writes a document its siblings discard, and the discard/rewrite cycle wipes
   the `done` ledger on every hop — which under a ledger means a duplicate 'completed' per cycle. */
var RESUME_ENABLED = true;
